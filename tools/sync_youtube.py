#!/usr/bin/env python3
"""Fetch the YouTube channel RSS feed and write data/youtube-latest.json.

Run by .github/workflows/youtube-sync.yml every day (and on demand).
Python standard library only. Usage:
    python3 tools/sync_youtube.py                # update latest videos
    python3 tools/sync_youtube.py --fill-titles  # also fill missing video titles
The file is only rewritten when the list of videos actually changed.

--fill-titles: for entries in originals/covers/concerts that have a videoId but an
empty "title", look up the YouTube title (oEmbed, no API key) and store it in
"youtubeTitle". Hand-written "title" fields are never touched.
"""
import json
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
OUT = DATA / "youtube-latest.json"
NS = {"a": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015",
      "media": "http://search.yahoo.com/mrss/"}
UA = {"User-Agent": "Mozilla/5.0 (nihiramusic site sync)"}
HELP = ("Written automatically every day by .github/workflows/youtube-sync.yml "
        "(tools/sync_youtube.py). Do not edit by hand; changes are overwritten.")


def get(url, timeout=30):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def channel_id():
    site = json.loads((DATA / "site.json").read_text(encoding="utf-8"))
    cid = site.get("youtubeChannelId", "").strip()
    if not cid:
        sys.exit("site.json has no youtubeChannelId")
    return cid


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


def load(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def save(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def sync_latest():
    cid = channel_id()
    feed = f"https://www.youtube.com/feeds/videos.xml?channel_id={cid}"
    videos = parse_feed(get(feed))
    if not videos:
        print("Feed returned no videos; leaving the file unchanged.")
        return False
    old = load(OUT)
    if old.get("videos") == videos and old.get("channelId") == cid:
        print("No new videos.")
        return False
    save(OUT, {"_help": HELP, "channelId": cid,
               "updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "videos": videos})
    print(f"Wrote {len(videos)} videos to {OUT.relative_to(ROOT)}")
    return True


def oembed_title(video_id):
    u = "https://www.youtube.com/oembed?format=json&url=" + urllib.parse.quote(
        f"https://www.youtube.com/watch?v={video_id}", safe="")
    try:
        return json.loads(get(u, timeout=20)).get("title", "").strip()
    except Exception as exc:  # private/removed video, network error
        print(f"  could not read title for {video_id}: {exc}")
        return ""


def fill_titles():
    changed_any = False
    for name in ("originals", "covers", "concerts"):
        path = DATA / f"{name}.json"
        data = load(path)
        if not data:
            continue
        targets = []
        for item in data.get("items", []):
            targets.append(item)
            targets.extend(v for v in item.get("videos", []) if isinstance(v, dict))
        changed = False
        for t in targets:
            vid = t.get("videoId")
            if vid and not t.get("title") and not t.get("youtubeTitle"):
                title = oembed_title(vid)
                if title:
                    t["youtubeTitle"] = title
                    changed = True
                    print(f"  {name}: {vid} -> {title}")
        if changed:
            save(path, data)
            changed_any = True
    return changed_any


if __name__ == "__main__":
    try:
        sync_latest()
    except Exception as exc:
        print(f"Could not update latest videos: {exc}")
    if "--fill-titles" in sys.argv:
        fill_titles()
