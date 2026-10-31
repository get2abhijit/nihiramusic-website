#!/usr/bin/env python3
"""Regenerates everything search engines and feed readers see, from data/*.json.

Writes:
  sitemap.xml            all pages, with last-changed dates taken from the data
  robots.txt             allows everything, points to the sitemap
  news/feed.xml          RSS feed of data/news.json
  events/calendar.ics    subscribable calendar of all events (events.json + events-calendar.json)
  */index.html, 404.html head tags: canonical, og:url, og:image, twitter:image, RSS link,
                         module preloads, hero preload, JSON-LD structured data
  index.html             static <noscript> list of latest news, upcoming events and videos

Only the parts between <!-- generated:… --> markers (and the four URL tags above) are touched.
Files are only rewritten when their content changes. Python standard library only.
    python3 tools/build_seo.py           (run from anywhere)
    python3 tools/build_seo.py --check   (exit 1 if something would change; nothing is written)
"""
import html
import json
import re
import sys
from datetime import date, datetime, timedelta, timezone
from email.utils import format_datetime
from pathlib import Path

try:
    from zoneinfo import ZoneInfo
except ImportError:  # Python < 3.9
    ZoneInfo = None

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
CHECK = "--check" in sys.argv
changed_files = []

# Page id (body data-page) -> folder, JS module, data file that dates the page.
PAGES = {
    "home": ("", "home.js", None),
    "originals": ("original-compositions/", "works.js", "originals"),
    "covers": ("covers/", "works.js", "covers"),
    "concerts": ("concerts/", "concerts.js", "concerts"),
    "poems": ("poetic-treasures/", "poems.js", "poems"),
    "news": ("news/", "news.js", "news"),
    "events": ("events/", "events.js", "events"),
    "awards": ("awards/", "awards.js", "awards"),
    "privacy": ("privacy-policy/", "legal.js", None),
    "terms": ("terms-and-conditions/", "legal.js", None),
}


# ---------- helpers ----------
def load(name, default=None):
    p = DATA / f"{name}.json"
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return default
    except json.JSONDecodeError as exc:
        sys.exit(f"data/{name}.json is not valid JSON (line {exc.lineno}): {exc.msg}. Fix it first (jsonlint.com).")


def items(d):
    return [i for i in (d or {}).get("items", []) if isinstance(i, dict)]


def write(path, text):
    old = path.read_bytes().decode("utf-8") if path.exists() else None  # bytes: keep \r\n in .ics intact
    if old == text:
        return
    changed_files.append(path.relative_to(ROOT).as_posix())
    if not CHECK:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(text.encode("utf-8"))


def is_iso(s):
    return isinstance(s, str) and re.fullmatch(r"\d{4}-\d{2}-\d{2}", s) is not None


def absolute(url, base):
    """Site-relative path -> absolute URL on the final domain. External URLs pass through."""
    if not url:
        return ""
    if re.match(r"^https?://", url):
        return url
    return base + url.lstrip("./").lstrip("/")


def esc(s):
    return html.escape(str(s or ""), quote=True)


def item_date(i):
    if is_iso(i.get("date")):
        return i["date"]
    if i.get("year"):
        return f"{int(i['year']):04d}-01-01"
    return ""


def newest(lst):
    return sorted(lst, key=item_date, reverse=True)


def ld_script(obj):
    s = json.dumps(obj, ensure_ascii=False, indent=1)
    return '<script type="application/ld+json">\n' + s.replace("</", "<\\/") + "\n</script>"


def clean(d):
    """Drop empty values so the JSON-LD stays tidy."""
    if isinstance(d, dict):
        return {k: clean(v) for k, v in d.items() if v not in (None, "", [], {})}
    if isinstance(d, list):
        return [clean(v) for v in d if v not in (None, "", [], {})]
    return d


def iso_datetime(d, t, tz):
    """'2025-03-09', '19:30', 'Asia/Kolkata' -> '2025-03-09T19:30:00+05:30' (date only when no time)."""
    if not t:
        return d
    if tz and ZoneInfo:
        try:
            dt = datetime.fromisoformat(f"{d}T{t}").replace(tzinfo=ZoneInfo(tz))
            return dt.isoformat()
        except Exception:
            pass
    return f"{d}T{t}:00"


def event_end(e):
    if e.get("startTime") and not e.get("endTime"):
        dt = datetime.fromisoformat(f"{e['date']}T{e['startTime']}") + timedelta(hours=2)
        return dt.date().isoformat(), dt.strftime("%H:%M")
    return e.get("endDate") or e["date"], e.get("endTime")


def all_events():
    manual = [e for e in items(load("events", {})) if is_iso(e.get("date")) and e.get("title")]
    synced = [e for e in items(load("events-calendar", {})) if is_iso(e.get("date")) and e.get("title")]
    keys = {(e["date"], e["title"].strip().lower()) for e in manual}
    ids = {e.get("id") for e in manual}
    merged = manual + [e for e in synced if e.get("id") not in ids and (e["date"], e["title"].strip().lower()) not in keys]
    return sorted(merged, key=lambda e: (e["date"], e.get("startTime") or ""))


# ---------- structured data ----------
def artist_ref(site, base):
    return {"@type": "MusicGroup", "@id": base + "#artist", "name": site.get("artistName") or site.get("siteName")}


def ld_home(site, base, home, awards):
    socials = [s["url"] for s in site.get("social", []) if s.get("url")]
    about = (home.get("about") or {})
    hero = (home.get("hero") or {})
    won = [a for a in items(awards) if str(a.get("status", "")).lower() == "won"]
    award_text = [", ".join(filter(None, [a.get("award"), a.get("category")])) + (f" ({a['work']})" if a.get("work") else "") for a in won]
    person = {
        "@type": "Person", "@id": base + "#person",
        "name": site.get("artistName"), "alternateName": site.get("artistAlternateName"),
        "url": base, "image": absolute(about.get("image") or hero.get("image"), base),
        "sameAs": socials, "award": award_text,
    }
    group = {
        "@type": "MusicGroup", "@id": base + "#artist",
        "name": site.get("artistName"), "alternateName": site.get("artistAlternateName"),
        "url": base, "logo": absolute(site.get("logo"), base), "image": absolute(hero.get("image"), base),
        "description": (about.get("paragraphs") or [""])[0],
        "email": site.get("email"), "sameAs": socials, "member": {"@id": base + "#person"},
        "award": award_text,
    }
    website = {
        "@type": "WebSite", "@id": base + "#website", "url": base,
        "name": site.get("siteName"), "alternateName": site.get("shortName"),
        "inLanguage": "en", "publisher": {"@id": base + "#artist"}, "about": {"@id": base + "#artist"},
    }
    return {"@context": "https://schema.org", "@graph": [clean(website), clean(group), clean(person)]}


def ld_originals(site, base, originals):
    page = base + PAGES["originals"][0]
    graph = []
    for o in newest(items(originals)):
        links = [o.get(k) for k in ("listenUrl", "spotifyUrl", "soundcloudUrl", "deezerUrl")]
        if o.get("videoId"):
            links.append(f"https://www.youtube.com/watch?v={o['videoId']}")
        common = {
            "@id": f"{page}#{o.get('id')}", "name": o.get("title"), "url": f"{page}#{o.get('id')}",
            "byArtist": artist_ref(site, base), "datePublished": item_date(o) if is_iso(o.get("date")) else (str(o["year"]) if o.get("year") else None),
            "image": absolute(o.get("image"), base), "description": o.get("credits"), "sameAs": [l for l in links if l],
        }
        tracks = [t for t in o.get("tracks", []) if isinstance(t, dict) and t.get("title")]
        if tracks:
            rec = {"@type": "MusicAlbum", **common, "numTracks": len(tracks),
                   "albumReleaseType": "https://schema.org/EPRelease" if str(o.get("type", "")).upper() == "EP" else None,
                   "track": [{"@type": "MusicRecording", "position": n, "name": t["title"], "byArtist": artist_ref(site, base),
                              "url": t.get("listenUrl"),
                              "sameAs": [u for u in [t.get("spotifyUrl"), t.get("soundcloudUrl"), t.get("deezerUrl"),
                                                     f"https://www.youtube.com/watch?v={t['videoId']}" if t.get("videoId") else None] if u]}
                             for n, t in enumerate(tracks, 1)]}
        else:
            rec = {"@type": "MusicRecording", **common}
        graph.append(clean(rec))
    return {"@context": "https://schema.org", "@graph": graph} if graph else None


def ld_events(site, base, events):
    page = base + PAGES["events"][0]
    fallback_img = absolute(site.get("ogImage"), base)
    graph = []
    for e in events:
        status = str(e.get("status", "")).lower()
        end_d, end_t = event_end(e)
        offers = None
        if e.get("ticketUrl"):
            offers = {"@type": "Offer", "url": e["ticketUrl"],
                      "availability": "https://schema.org/SoldOut" if status in ("sold-out", "soldout") else "https://schema.org/InStock"}
        graph.append(clean({
            "@type": "MusicEvent", "@id": f"{page}#{e.get('id')}", "name": e["title"], "url": f"{page}#{e.get('id')}",
            "startDate": iso_datetime(e["date"], e.get("startTime"), e.get("timezone")),
            "endDate": iso_datetime(end_d, end_t, e.get("timezone")) if (e.get("endDate") or e.get("startTime")) else None,
            "eventStatus": "https://schema.org/EventCancelled" if status in ("cancelled", "canceled") else "https://schema.org/EventScheduled",
            "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
            "location": {"@type": "Place", "name": e.get("venue") or e.get("city"),
                         "address": {"@type": "PostalAddress", "streetAddress": e.get("address"),
                                     "addressLocality": e.get("city"), "addressCountry": e.get("country")}},
            "image": absolute(e.get("image"), base) or fallback_img,
            "description": e.get("description"), "performer": artist_ref(site, base), "offers": offers,
        }))
    return {"@context": "https://schema.org", "@graph": graph} if graph else None


# ---------- feeds and files ----------
def rfc822(d):
    return format_datetime(datetime.fromisoformat(d + "T12:00:00").replace(tzinfo=timezone.utc))


def build_feed(site, base, news):
    lst = [n for n in newest(items(news)) if is_iso(n.get("date")) and n.get("title")][:20]
    page = base + "news/"
    title = f"News | {site.get('siteName', '')}"
    out = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">', "<channel>",
           f"<title>{esc(title)}</title>", f"<link>{esc(page)}</link>",
           f'<atom:link href="{esc(page)}feed.xml" rel="self" type="application/rss+xml"/>',
           f"<description>{esc('News from ' + (site.get('artistName') or ''))}</description>",
           "<language>en</language>"]
    if lst:
        out.append(f"<lastBuildDate>{rfc822(lst[0]['date'])}</lastBuildDate>")
    for n in lst:
        desc = n.get("summary", "")
        if n.get("link"):
            desc += f' <a href="{esc(n["link"])}">{esc(n.get("linkLabel") or "Read more")}</a>'
        out += ["<item>", f"<title>{esc(n['title'])}</title>", f"<link>{esc(page)}#{esc(n.get('id'))}</link>",
                f'<guid isPermaLink="false">{esc(n.get("id") or n["date"] + n["title"])}</guid>',
                f"<pubDate>{rfc822(n['date'])}</pubDate>", f"<description>{esc(desc)}</description>", "</item>"]
    out += ["</channel>", "</rss>", ""]
    return "\n".join(out)


def build_sitemap(base, lastmods):
    out = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for page_id, (folder, _, _) in PAGES.items():
        out.append("  <url>")
        out.append(f"    <loc>{esc(base + folder)}</loc>")
        if lastmods.get(page_id):
            out.append(f"    <lastmod>{lastmods[page_id]}</lastmod>")
        out.append("  </url>")
    out += ["</urlset>", ""]
    return "\n".join(out)


def ics_escape(s):
    return str(s or "").replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\r", "").replace("\n", "\\n")


def ics_fold(line):
    b = line.encode("utf-8")
    if len(b) <= 75:
        return line
    parts, cur = [], ""
    for ch in line:
        if len((cur + ch).encode("utf-8")) > (75 if not parts else 74):
            parts.append(cur)
            cur = ""
        cur += ch
    parts.append(cur)
    return "\r\n ".join(parts)


def ics_time(d, t, tz):
    """UTC timestamp when the time zone is known (works in every calendar app), floating local time otherwise."""
    if tz and ZoneInfo:
        try:
            dt = datetime.fromisoformat(f"{d}T{t}").replace(tzinfo=ZoneInfo(tz)).astimezone(timezone.utc)
            return ":" + dt.strftime("%Y%m%dT%H%M%SZ")
        except Exception:
            pass
    return ":" + d.replace("-", "") + "T" + t.replace(":", "") + "00"


def build_ics(site, base, events):
    host = re.sub(r"^https?://", "", base).strip("/").split("/")[0] or "nihiramusic"
    L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//nihiramusic//events feed//EN", "CALSCALE:GREGORIAN",
         "METHOD:PUBLISH", f"X-WR-CALNAME:{ics_escape(site.get('artistName', '') + ' events')}",
         "REFRESH-INTERVAL;VALUE=DURATION:PT12H", "X-PUBLISHED-TTL:PT12H"]
    for e in events:
        L += ["BEGIN:VEVENT", f"UID:{e.get('id') or e['date']}@{host}",
              f"DTSTAMP:{e['date'].replace('-', '')}T000000Z"]
        if e.get("startTime"):
            end_d, end_t = event_end(e)
            L.append("DTSTART" + ics_time(e["date"], e["startTime"], e.get("timezone")))
            L.append("DTEND" + ics_time(end_d, end_t, e.get("timezone")))
        else:
            last = date.fromisoformat(e.get("endDate") or e["date"]) + timedelta(days=1)
            L += [f"DTSTART;VALUE=DATE:{e['date'].replace('-', '')}", f"DTEND;VALUE=DATE:{last.strftime('%Y%m%d')}"]
        L.append(f"SUMMARY:{ics_escape(e['title'])}")
        loc = ", ".join(filter(None, [e.get("venue"), e.get("address"), e.get("city"), e.get("country")]))
        if loc:
            L.append(f"LOCATION:{ics_escape(loc)}")
        if e.get("description"):
            L.append(f"DESCRIPTION:{ics_escape(e['description'])}")
        L.append(f"URL:{e.get('ticketUrl') or base + 'events/#' + str(e.get('id', ''))}")
        if str(e.get("status", "")).lower() in ("cancelled", "canceled"):
            L.append("STATUS:CANCELLED")
        L.append("END:VEVENT")
    L.append("END:VCALENDAR")
    return "\r\n".join(ics_fold(x) for x in L) + "\r\n"


# ---------- HTML ----------
def replace_block(text, name, content, indent=""):
    start, end = f"<!-- generated:{name} -->", f"<!-- /generated:{name} -->"
    block = f"{start}\n{content}\n{indent}{end}" if content else f"{start}\n{indent}{end}"
    pat = re.compile(re.escape(start) + r".*?" + re.escape(end), re.S)
    if pat.search(text):
        return pat.sub(lambda _: block, text)
    return None


def set_meta(text, pattern, value):
    return re.sub(pattern, lambda m: m.group(1) + esc(value) + m.group(2), text)


def noscript_home(site, news, events, yt, today):
    parts = ['<div class="wrap section noscript-home">',
             f"<p>This website works best with JavaScript. Here is a short overview. Contact: "
             f'<a href="mailto:{esc(site.get("email"))}">{esc(site.get("email"))}</a></p>']
    nw = [n for n in newest(items(news)) if is_iso(n.get("date"))][:3]
    if nw:
        parts.append("<h2>Latest news</h2><ul>")
        parts += [f'<li><a href="news/#{esc(n.get("id"))}">{esc(n["title"])}</a> ({esc(n["date"])})</li>' for n in nw]
        parts.append("</ul>")
    up = [e for e in events if (e.get("endDate") or e["date"]) >= today][:3]
    if up:
        parts.append("<h2>Upcoming events</h2><ul>")
        parts += [f'<li><a href="events/#{esc(e.get("id"))}">{esc(e["title"])}</a>, {esc(e["date"])}'
                  f'{", " + esc(e["city"]) if e.get("city") else ""}</li>' for e in up]
        parts.append("</ul>")
    vids = sorted((yt or {}).get("videos", []), key=lambda v: v.get("published", ""), reverse=True)[:6]
    if vids:
        parts.append("<h2>Latest videos</h2><ul>")
        parts += [f'<li><a href="https://www.youtube.com/watch?v={esc(v["videoId"])}">{esc(v.get("title") or "Video")}</a></li>'
                  for v in vids if v.get("videoId")]
        parts.append("</ul>")
    parts.append('<p><a href="original-compositions/">Original compositions</a> | <a href="covers/">Covers</a> | '
                 '<a href="concerts/">Concerts</a> | <a href="awards/">Awards</a> | '
                 f'<a href="{esc(site.get("listenUrl") or "https://artist.link/nihira")}">Listen on all streaming services</a></p></div>')
    return "\n".join(parts)


def head_block(page_id, root, base, site, ld, hero_img):
    lines = [f'<link rel="alternate" type="application/rss+xml" title="{esc("News | " + site.get("siteName", ""))}" href="{root}news/feed.xml">',
             f'<link rel="modulepreload" href="{root}assets/js/core.js">']
    if page_id in PAGES:
        lines.append(f'<link rel="modulepreload" href="{root}assets/js/{PAGES[page_id][1]}">')
    if page_id == "poems":  # Poetic Treasures reuses the video cards of works.js
        lines.append(f'<link rel="modulepreload" href="{root}assets/js/works.js">')
    if hero_img:
        # Same srcset/sizes as the hero <img> (core.js img()), so the browser fetches the image only once.
        meta = ((load("images", {}) or {}).get("images") or {}).get(hero_img.lstrip("./"), {})
        srcset = ", ".join(f'{root}{v["src"]} {v["width"]}w' for v in meta.get("srcset", []) if v.get("src") and v.get("width"))
        extra = f' imagesrcset="{esc(srcset)}" imagesizes="100vw"' if len(meta.get("srcset", [])) > 1 else ""
        href = hero_img if hero_img.startswith("http") else root + hero_img.lstrip("./").lstrip("/")
        lines.append(f'<link rel="preload" as="image" href="{esc(href)}"{extra} fetchpriority="high">')
    if ld:
        lines.append(ld_script(ld))
    return "\n".join(lines)


def main():
    site = load("site", {}) or {}
    base = (site.get("siteUrl") or "").strip()
    if not re.match(r"^https?://", base):
        sys.exit('data/site.json needs "siteUrl", e.g. "https://nihiramusic.in/".')
    base = base.rstrip("/") + "/"
    news, home, awards, originals = load("news", {}), load("home", {}), load("awards", {}), load("originals", {})
    yt = load("youtube-latest", {})
    events = all_events()
    today = date.today().isoformat()

    # Last-changed dates come from the content itself, so the sitemap only changes when content does.
    lastmods = {}
    for pid, (_, _, data_name) in PAGES.items():
        if data_name == "events":
            ds = [e["date"] for e in events if e["date"] <= today]
        elif data_name:
            ds = [item_date(i) for i in items(load(data_name, {})) if is_iso(i.get("date"))]
        else:
            ds = []
        if ds:
            lastmods[pid] = max(ds)
    home_dates = [lastmods.get(k) for k in ("news", "originals", "events")] + [(yt or {}).get("updated", "")[:10]]
    home_dates = [d for d in home_dates if is_iso(d)]
    if home_dates:
        lastmods["home"] = max(home_dates)

    write(ROOT / "sitemap.xml", build_sitemap(base, lastmods))
    write(ROOT / "robots.txt", f"User-agent: *\nAllow: /\n\nSitemap: {base}sitemap.xml\n")
    write(ROOT / "news" / "feed.xml", build_feed(site, base, news))
    write(ROOT / "events" / "calendar.ics", build_ics(site, base, events))

    og_image = absolute(site.get("ogImage") or site.get("logo"), base)
    hero = (home or {}).get("hero", {}).get("image")
    pages = [(ROOT / "index.html", "./")] + [(p, "../") for p in sorted(ROOT.glob("*/index.html"))] + [(ROOT / "404.html", "")]
    for path, root in pages:
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8")
        m = re.search(r'<body[^>]*data-page="([^"]+)"', text)
        page_id = m.group(1) if m else ""
        folder = PAGES.get(page_id, (None,))[0]
        new = text
        if folder is not None:
            url = base + folder
            new = set_meta(new, r'(<link rel="canonical" href=")[^"]*(")', url)
            new = set_meta(new, r'(<meta property="og:url" content=")[^"]*(")', url)
        if og_image:
            new = set_meta(new, r'(<meta property="og:image" content=")[^"]*(")', og_image)
            new = set_meta(new, r'(<meta name="twitter:image" content=")[^"]*(")', og_image)
        ld = None
        if page_id == "home":
            ld = ld_home(site, base, home or {}, awards)
        elif page_id == "originals":
            ld = ld_originals(site, base, originals)
        elif page_id == "events":
            ld = ld_events(site, base, events)
        block = head_block(page_id, root, base, site, ld, hero if page_id == "home" else None)
        if path.name == "404.html":
            block = block.split("\n")[0]  # only the feed link; 404 uses a dynamic <base>
        out = replace_block(new, "head", block)
        if out is None:  # first run: insert the markers before </head>
            out = new.replace("</head>", f"<!-- generated:head -->\n{block}\n<!-- /generated:head -->\n</head>", 1)
        new = out
        if page_id == "home":
            ns = replace_block(new, "noscript", noscript_home(site, news, events, yt, today))
            if ns is None:
                ns = re.sub(r"<noscript>.*?</noscript>",
                            lambda _: "<noscript>\n<!-- generated:noscript -->\n" + noscript_home(site, news, events, yt, today)
                            + "\n<!-- /generated:noscript -->\n</noscript>", new, count=1, flags=re.S)
            new = ns
        write(path, new)

    if changed_files:
        print(("Would change" if CHECK else "Updated") + ":\n  " + "\n  ".join(changed_files))
        if CHECK:
            sys.exit(1)
    else:
        print("SEO files are up to date.")


if __name__ == "__main__":
    main()
