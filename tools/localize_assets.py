#!/usr/bin/env python3
"""Copy every external image used by the site into assets/img/ and point the data at the copies.

Run it ONCE on your own computer (it needs internet), from the site folder:
    python3 tools/localize_assets.py            # download + rewrite
    python3 tools/localize_assets.py --dry-run  # only show what would happen
Then commit the changed files (data/, assets/img/, the index.html files).

What it does
1. Finds image URLs in data/*.json (fields such as image, logo, ogImage, bannerImage, src, thumbnail).
2. Downloads each one to assets/img/ (Hostinger "zyrosite" photos also in smaller widths for fast phones).
3. Downloads a YouTube thumbnail for every videoId to assets/img/yt/<videoId>.jpg,
   so no image is loaded from YouTube before a visitor presses play.
4. Rewrites the JSON to the local paths and records width, height and smaller versions in data/images.json.
5. Points og:image / twitter:image in the HTML pages at the local logo (absolute URL from siteUrl).
Images that fail to download keep their old URL and are listed at the end. Running it again is safe.

IMPORTANT: run this BEFORE the Hostinger plan ends; the zyrosite.com images disappear with it.
Python standard library only.
"""
import hashlib
import json
import re
import struct
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
IMG = ROOT / "assets" / "img"
MANIFEST = DATA / "images.json"
IMAGE_KEYS = {"image", "logo", "ogImage", "bannerImage", "src", "thumbnail", "localThumbnail", "cover", "photo"}
IMAGE_EXT = re.compile(r"\.(jpe?g|png|webp|gif|avif|svg)(\?|$)", re.I)
IMAGE_HOSTS = ("zyrosite.com", "mzstatic.com", "ytimg.com", "odesli-public-read")
TYPES = {"image/jpeg": ".jpg", "image/jpg": ".jpg", "image/png": ".png", "image/webp": ".webp",
         "image/gif": ".gif", "image/avif": ".avif", "image/svg+xml": ".svg"}
HEADERS = {"User-Agent": "Mozilla/5.0 (nihiramusic localize_assets)",
           "Accept": "image/webp,image/jpeg;q=0.9,image/png;q=0.8,*/*;q=0.5"}
MANIFEST_HELP = ("Written by tools/localize_assets.py (and the YouTube sync for video thumbnails). Width, height and "
                 "smaller versions (srcset) of local images, so pages load fast without layout jumps. "
                 "Do not edit by hand; run the script again after adding images.")


# ---------- small helpers (also used by sync_youtube.py) ----------
def fetch(url, timeout=40):
    """Return (bytes, content-type) for a URL."""
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read(), (r.headers.get("Content-Type") or "").split(";")[0].strip().lower()


def image_size(b):
    """Width and height of JPEG, PNG, GIF or WebP bytes; (None, None) if unknown."""
    try:
        if b[:8] == b"\x89PNG\r\n\x1a\n":
            return struct.unpack(">II", b[16:24])
        if b[:6] in (b"GIF87a", b"GIF89a"):
            return struct.unpack("<HH", b[6:10])
        if b[:4] == b"RIFF" and b[8:12] == b"WEBP":
            kind = b[12:16]
            if kind == b"VP8X":
                return 1 + int.from_bytes(b[24:27], "little"), 1 + int.from_bytes(b[27:30], "little")
            if kind == b"VP8 ":
                w, hh = struct.unpack("<HH", b[26:30])
                return w & 0x3FFF, hh & 0x3FFF
            if kind == b"VP8L":
                bits = int.from_bytes(b[21:25], "little")
                return (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1
        if b[:2] == b"\xff\xd8":
            i = 2
            while i < len(b) - 9:
                if b[i] != 0xFF:
                    i += 1
                    continue
                marker = b[i + 1]
                if marker in (0xD8, 0x01) or 0xD0 <= marker <= 0xD7:
                    i += 2
                    continue
                seg = struct.unpack(">H", b[i + 2:i + 4])[0]
                if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
                    hh, w = struct.unpack(">HH", b[i + 5:i + 9])
                    return w, hh
                i += 2 + seg
    except Exception:
        pass
    return None, None


def load_json(path, default=None):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def save_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def load_manifest():
    m = load_json(MANIFEST, {}) or {}
    return {"_help": MANIFEST_HELP, "images": m.get("images", {})}


def rel(p):
    return p.relative_to(ROOT).as_posix()


def youtube_thumb(video_id, manifest, dry=False):
    """Download assets/img/yt/<id>.jpg once and register it. Returns the local path or None."""
    target = IMG / "yt" / f"{video_id}.jpg"
    key = rel(target)
    if target.exists():
        if key not in manifest["images"]:
            w, hh = image_size(target.read_bytes())
            manifest["images"][key] = {"width": w, "height": hh}
        return key
    if dry:
        print(f"  would download YouTube thumbnail {video_id}")
        return key
    url = f"https://i.ytimg.com/vi/{urllib.parse.quote(video_id)}/hqdefault.jpg"
    try:
        body, _ = fetch(url)
    except Exception as exc:
        print(f"  ! thumbnail {video_id}: {exc}")
        return None
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(body)
    w, hh = image_size(body)
    manifest["images"][key] = {"width": w, "height": hh, "original": url}
    return key


# ---------- finding images ----------
def is_image_url(key, value):
    if not isinstance(value, str) or not value.lower().startswith(("http://", "https://")):
        return False
    if key in IMAGE_KEYS:
        return True
    return bool(IMAGE_EXT.search(value)) and any(h in value for h in IMAGE_HOSTS)


def walk(obj, found, video_ids):
    """Collect (container, key) pairs holding image URLs, and all videoIds."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k.startswith("_"):
                continue
            if k == "videoId" and isinstance(v, str) and v:
                video_ids.add(v)
            elif is_image_url(k, v):
                found.append((obj, k))
            else:
                walk(v, found, video_ids)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            if isinstance(v, str) and is_image_url("src", v):
                found.append((obj, i))
            else:
                walk(v, found, video_ids)


# ---------- naming and sizes ----------
def slug(url):
    path = urllib.parse.urlparse(url).path
    parts = [p for p in path.split("/") if p]
    stem = parts[-1] if parts else "image"
    if re.fullmatch(r"\d+x\d+\w*\.\w+", stem) and len(parts) > 1:  # Apple: .../<id>.jpg/512x512bb.jpg
        stem = parts[-2]
    stem = re.sub(r"\.[a-z0-9]+$", "", stem, flags=re.I)
    stem = re.sub(r"[^a-z0-9]+", "-", stem.lower()).strip("-")[:50] or "image"
    return f"{stem}-{hashlib.sha1(url.encode()).hexdigest()[:6]}"  # short hash keeps names unique


def variants(url):
    """[(width or None, url)] smallest first. Zyrosite (Cloudflare) URLs can be resized by changing w=."""
    m = re.match(r"(https://assets\.zyrosite\.com/cdn-cgi/image/)([^/]+)(/.+)$", url)
    if not m:
        return [(None, url)]
    opts = dict(o.split("=", 1) for o in m.group(2).split(",") if "=" in o)
    try:
        w = int(opts.get("w", 0))
    except ValueError:
        return [(None, url)]
    if not w:
        return [(None, url)]
    widths = [x for x in (480, 960, 1440) if x < w * 0.85] + [w]
    out = []
    for x in widths:
        o = dict(opts)
        o["w"] = str(x)
        if "h" in o:
            o["h"] = str(round(int(opts["h"]) * x / w))
        out.append((x, m.group(1) + ",".join(f"{k}={v}" for k, v in o.items()) + m.group(3)))
    return out


def localize(url, manifest, cache, dry=False):
    """Download one image (+ smaller widths). Returns the local path of the largest file, or None."""
    if url in cache:
        return cache[url]
    name = slug(url)
    if "ytimg.com/vi/" in url:  # YouTube thumbnail written in the data by hand
        vid = url.split("/vi/")[1].split("/")[0]
        cache[url] = youtube_thumb(vid, manifest, dry)
        return cache[url]
    if dry:
        print(f"  would download {url}")
        cache[url] = None
        return None
    files = []
    for width, vurl in variants(url):
        try:
            body, ctype = fetch(vurl)
        except Exception as exc:
            print(f"  ! {vurl}: {exc}")
            continue
        ext = TYPES.get(ctype) or (IMAGE_EXT.search(vurl).group(0).split("?")[0].lower() if IMAGE_EXT.search(vurl) else ".jpg")
        if ext == ".jpeg":
            ext = ".jpg"
        w, hh = image_size(body)
        target = IMG / f"{name}-{width or w or 'x'}{ext}"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(body)
        files.append({"src": rel(target), "width": w, "height": hh, "bytes": len(body)})
    if not files:
        cache[url] = None
        return None
    files.sort(key=lambda f: f["width"] or 0)
    main = files[-1]
    entry = {"width": main["width"], "height": main["height"], "original": url}
    if len(files) > 1 and all(f["width"] for f in files):
        entry["srcset"] = [{"src": f["src"], "width": f["width"]} for f in files]
    manifest["images"][main["src"]] = entry
    print(f"  {url[:70]}… -> {main['src']} ({main['width']}x{main['height']}, {len(files)} size(s))")
    cache[url] = main["src"]
    return main["src"]


def update_html(mapping, site_url):
    """Point og:image / twitter:image at the local copy (absolute URL, as share previews need)."""
    changed = 0
    base = (site_url or "").rstrip("/") + "/"
    for page in [ROOT / "index.html", ROOT / "404.html", *ROOT.glob("*/index.html")]:
        if not page.exists():
            continue
        s = page.read_text(encoding="utf-8")
        new = s
        for old, local in mapping.items():
            if local:
                new = new.replace(f'content="{old}"', f'content="{base}{local}"')
        if new != s:
            page.write_text(new, encoding="utf-8")
            changed += 1
    return changed


def main():
    dry = "--dry-run" in sys.argv
    manifest = load_manifest()
    cache, failures, video_ids = {}, [], set()
    rewritten = []
    for path in sorted(DATA.glob("*.json")):
        if path.name == "images.json":
            continue
        data = load_json(path)
        if data is None:
            print(f"! {path.name} is not valid JSON; skipped. Fix it first (jsonlint.com).")
            continue
        found = []
        walk(data, found, video_ids)
        changed = False
        for container, key in found:
            old = container[key]
            if path.name == "youtube-latest.json":
                continue  # the sync handles these thumbnails
            local = localize(old, manifest, cache, dry)
            if local and not dry:
                container[key] = local
                changed = True
            elif not local and not dry:
                failures.append(f"{path.name}: {old}")
        if changed:
            save_json(path, data)
            rewritten.append(path.name)
    yt = load_json(DATA / "youtube-latest.json", {}) or {}
    for v in yt.get("videos", []):
        if v.get("videoId"):
            video_ids.add(v["videoId"])
    print(f"YouTube thumbnails for {len(video_ids)} videos…")
    for vid in sorted(video_ids):
        if not youtube_thumb(vid, manifest, dry) and not dry:
            failures.append(f"YouTube thumbnail {vid}")
    if not dry:
        if yt.get("videos"):
            for v in yt["videos"]:
                p = f"assets/img/yt/{v.get('videoId')}.jpg"
                if (ROOT / p).exists():
                    v["localThumbnail"] = p
            save_json(DATA / "youtube-latest.json", yt)
        save_json(MANIFEST, manifest)
        site = load_json(DATA / "site.json", {}) or {}
        html = update_html(cache, site.get("siteUrl"))
    total = sum((ROOT / k).stat().st_size for k in manifest["images"] if (ROOT / k).exists())
    print("\nSummary")
    print(f"  images in manifest: {len(manifest['images'])}  total size: {total / 1024 / 1024:.1f} MB")
    if not dry:
        print(f"  JSON files rewritten: {', '.join(rewritten) or 'none'}")
        print(f"  HTML pages with updated share image: {html}")
    if failures:
        print("  NOT downloaded (old URL kept, run again later):")
        for f in failures:
            print("   -", f)
    print("\nRecommended sizes for new photos you add yourself:")
    print("  hero/banner: 1920 px wide, JPEG or WebP, under 400 KB")
    print("  about/portrait and cover art: 1200 px on the long side, under 250 KB")
    print("  news/event images: 1200 x 675 px (16:9), under 200 KB")
    print("  share image (ogImage): 1200 x 630 px")
    print("Put them in assets/img/ and write the path, e.g. \"image\": \"assets/img/my-photo.jpg\", then run this script again.")


if __name__ == "__main__":
    main()
