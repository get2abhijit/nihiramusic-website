#!/usr/bin/env python3
"""Daily YouTube sync, run by .github/workflows/youtube-sync.yml (and on demand).

1. Reads the channel RSS feed and writes the latest uploads to data/youtube-latest.json (Home "Latest videos").
2. Collects the YouTube title of every videoId used in data/*.json into youtube-latest.json "titles".
   Pages show it wherever you left a title empty. Your own data files are never changed.
3. Collects the upload date of every videoId used in data/*.json into youtube-latest.json "dates"
   (a hint for filling in concert dates; never shown as the concert date).
4. Downloads each needed thumbnail once to assets/img/yt/<videoId>.jpg, so visitors' browsers
   never contact YouTube before they press play.
Files are only rewritten when something changed. Python standard library only.
    python3 tools/sync_youtube.py
(--fill-titles is accepted for compatibility; titles are always collected now.)
"""
import json
import re
import sys
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from localize_assets import fetch, load_json, save_json, load_manifest, youtube_thumb, MANIFEST  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
OUT = DATA / "youtube-latest.json"
NS = {"a": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015",
      "media": "http://search.yahoo.com/mrss/"}
HELP = ("Written automatically by .github/workflows/youtube-sync.yml (tools/sync_youtube.py). Do not edit by hand; "
        "changes are overwritten. videos = latest uploads (Home). titles = YouTube titles for every videoId used "
        "in data/*.json, shown wherever you left a title empty. dates = upload date of those videos (a hint for "
        "filling in concert dates; the concert itself may have been earlier).")


def parse_feed(xml_bytes, limit=15):
    root = ET.fromstring(xml_bytes)
    videos = []
    for e in root.findall("a:entry", NS)[:limit]:
        vid = e.findtext("yt:videoId", default="", namespaces=NS)
        if not vid:
            continue
        thumb = e.find("media:group/media:thumbnail", NS)
        videos.append({
            "videoId": vid,
            "title": (e.findtext("a:title", default="", namespaces=NS) or "").strip(),
            "published": (e.findtext("a:published", default="", namespaces=NS) or "")[:10],
            "thumbnail": thumb.get("url") if thumb is not None else f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg",
        })
    return videos


def used_video_ids():
    ids = set()

    def walk(o):
        if isinstance(o, dict):
            if isinstance(o.get("videoId"), str) and o["videoId"]:
                ids.add(o["videoId"])
            for k, v in o.items():
                if not k.startswith("_"):
                    walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)
    for p in DATA.glob("*.json"):
        if p.name not in ("youtube-latest.json", "images.json"):
            walk(load_json(p, {}))
    return ids


def oembed_title(video_id):
    u = "https://www.youtube.com/oembed?format=json&url=" + urllib.parse.quote(
        f"https://www.youtube.com/watch?v={video_id}", safe="")
    try:
        return json.loads(fetch(u, timeout=20)[0]).get("title", "").strip()
    except Exception as exc:  # private/removed video, network error
        print(f"  could not read title for {video_id}: {exc}")
        return ""


def upload_date(video_id):
    """Best effort: read the upload date from the public watch page. Returns 'YYYY-MM-DD' or ''."""
    req = urllib.request.Request(f"https://www.youtube.com/watch?v={video_id}",
                                 headers={"User-Agent": "Mozilla/5.0 (nihiramusic-sync)", "Accept-Language": "en"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            page = r.read(2_000_000).decode("utf-8", errors="replace")
    except Exception as exc:
        print(f"  could not read upload date for {video_id}: {exc}")
        return ""
    m = re.search(r'"(?:uploadDate|publishDate)":"(\d{4}-\d{2}-\d{2})', page) or \
        re.search(r'itemprop="(?:uploadDate|datePublished)" content="(\d{4}-\d{2}-\d{2})', page)
    return m.group(1) if m else ""


def main():
    site = load_json(DATA / "site.json", {}) or {}
    cid = (site.get("youtubeChannelId") or "").strip()
    old = load_json(OUT, {}) or {}
    out = {"_help": HELP, "channelId": cid, "updated": old.get("updated", ""),
           "videos": old.get("videos", []), "titles": dict(old.get("titles", {})), "dates": dict(old.get("dates", {}))}
    manifest = load_manifest()
    before_manifest = json.dumps(manifest, sort_keys=True)

    if cid:
        try:
            videos = parse_feed(fetch(f"https://www.youtube.com/feeds/videos.xml?channel_id={cid}")[0])
            if videos:
                out["videos"] = videos
            else:
                print("Feed returned no videos; keeping the previous list.")
        except Exception as exc:
            print(f"Could not read the channel feed: {exc}")
    else:
        print("site.json has no youtubeChannelId; skipping latest videos.")

    for v in out["videos"]:
        out["titles"].setdefault(v["videoId"], v.get("title", ""))
    for vid in sorted(used_video_ids()):
        if not out["titles"].get(vid):
            t = oembed_title(vid)
            if t:
                out["titles"][vid] = t
                print(f"  title {vid} -> {t}")

    for v in out["videos"]:
        if v.get("published"):
            out["dates"].setdefault(v["videoId"], v["published"])
    for vid in sorted(used_video_ids()):
        if not out["dates"].get(vid):
            d = upload_date(vid)
            if d:
                out["dates"][vid] = d
                print(f"  date {vid} -> {d}")

    for vid in sorted(set(used_video_ids()) | {v["videoId"] for v in out["videos"]}):
        youtube_thumb(vid, manifest)
    for v in out["videos"]:
        p = f"assets/img/yt/{v['videoId']}.jpg"
        if (ROOT / p).exists():
            v["localThumbnail"] = p

    out["titles"] = dict(sorted((k, v) for k, v in out["titles"].items() if v))
    out["dates"] = dict(sorted((k, v) for k, v in out["dates"].items() if v))
    comparable = lambda d: json.dumps({k: d.get(k) for k in ("channelId", "videos", "titles", "dates")}, sort_keys=True)
    if comparable(out) != comparable(old):
        out["updated"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        save_json(OUT, out)
        print(f"Updated {OUT.relative_to(ROOT)}: {len(out['videos'])} latest videos, {len(out['titles'])} titles.")
    else:
        print("No new videos or titles.")
    if json.dumps(manifest, sort_keys=True) != before_manifest:
        save_json(MANIFEST, manifest)
        print("Updated data/images.json (new thumbnails).")


if __name__ == "__main__":
    main()
