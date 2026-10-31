#!/usr/bin/env python3
"""Check every file in data/ before it goes live. Python standard library only.

    python3 tools/validate_data.py              # check all files in data/
    python3 tools/validate_data.py data/news.json data/events.json   # only these

Runs automatically on GitHub ("Check content" workflow) after every change, and "Deploy site" refuses to
publish while a file has an error, so a typo never breaks the live site (it keeps the last good version).

ERRORS (the check fails, the site is not updated):
  invalid JSON, a required field missing, a date not written as YYYY-MM-DD, an id used twice in one file,
  a malformed web address, a YouTube code that is not 11 characters, a local image that does not exist,
  an unknown status value.
WARNINGS (shown, but the site still updates):
  unknown field names (often a typo; the website ignores them), a field written twice in one entry,
  a missing "source", more than one featured release, and similar.

Messages name the file, the entry (number, title and id) and say how to fix it.
"""
import calendar
import difflib
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

ID_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
DATE_RE = re.compile(r"^(\d{4})-(\d{2})-(\d{2})$")
TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
VIDEO_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")
PLAYLIST_RE = re.compile(r"^(PL|UU|OL|FL|RD)[A-Za-z0-9_-]{10,}$")
COLOR_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$")
URL_RE = re.compile(r"^https?://[^\s/$.?#][^\s]*$", re.I)
TZ_RE = re.compile(r"^(UTC|[A-Z][A-Za-z_]+(/[A-Za-z0-9_+\-]+){1,2})$")

# ---------------------------------------------------------------- field types
# Each field spec is (type, required). Types: str, text, id, date, time, year, int, bool, url, urlish, email,
# image, video, playlist, tz, color, path, ("enum", [...]), ("list", item_spec_or_type), ("obj", fields)


def F(t, req=False):
    return (t, req)


SOURCE = F("source")          # URL or short note ("calendar", "owner", ...)
NOTE_FIELDS = {"_note", "_todo", "_source", "_sources", "_review", "_notes"}

NEWS = {
    "id": F("id", True), "date": F("date", True), "title": F("str", True), "summary": F("text", True),
    "body": F("text"), "image": F("image"), "imageAlt": F("str"), "link": F("url"), "linkLabel": F("str"),
    "source": SOURCE,
}
EVENT = {
    "id": F("id", True), "title": F("str", True), "date": F("date", True), "endDate": F("date"),
    "startTime": F("time"), "endTime": F("time"), "timezone": F("tz"), "venue": F("str"), "address": F("str"),
    "city": F("str"), "country": F("str"),
    "status": F(("enum", ["scheduled", "cancelled", "sold-out"])), "ticketUrl": F("url"),
    "description": F("text"), "image": F("image"), "imageAlt": F("str"), "source": SOURCE,
}
AWARD = {
    "id": F("id", True), "year": F("year"), "award": F("str", True), "category": F("str"), "work": F("str"),
    "status": F(("enum", ["Won", "Nominated", "Finalist"]), True), "organisation": F("str"), "link": F("url"),
    "image": F("image"), "imageAlt": F("str"), "highlight": F("bool"), "source": SOURCE,
}
COVER = {
    "id": F("id", True), "title": F("str"), "category": F("str"), "year": F("year"), "date": F("date"),
    "videoId": F("video", True), "originalArtist": F("str"), "description": F("text"), "credits": F("str"),
    "spotifyUrl": F("url"), "listenUrl": F("url"), "image": F("image"), "imageAlt": F("str"),
    "featured": F("bool"), "source": SOURCE,
}
TRACK = {
    "title": F("str", True), "videoId": F("video"), "spotifyUrl": F("url"), "soundcloudUrl": F("url"),
    "deezerUrl": F("url"), "listenUrl": F("url"),
}
ORIGINAL = {
    "id": F("id", True), "title": F("str", True), "type": F(("enum", ["Single", "EP", "Album"])),
    "year": F("year"), "date": F("date"), "videoId": F("video"), "image": F("image"), "imageAlt": F("str"),
    "credits": F("str"), "description": F("text"), "listenUrl": F("url"), "spotifyUrl": F("url"),
    "soundcloudUrl": F("url"), "deezerUrl": F("url"), "featured": F("bool"),
    "tracks": F(("list", ("obj", TRACK))), "source": SOURCE,
}
CONCERT_VIDEO = {"videoId": F("video", True), "title": F("str")}
PHOTO = {"src": F("image", True), "alt": F("str")}
CONCERT = {
    "id": F("id", True), "title": F("str", True), "subtitle": F("str"), "date": F("date"), "year": F("year"),
    "venue": F("str"), "city": F("str"), "country": F("str"), "description": F("text"), "image": F("image"),
    "imageAlt": F("str"), "photos": F(("list", ("obj", PHOTO))), "playlistUrl": F("url"),
    "videos": F(("list", ("obj", CONCERT_VIDEO))), "source": SOURCE,
}
POEM = {
    "id": F("id", True), "title": F("str", True), "lang": F(("enum", ["mr", "hi", "en"])), "author": F("str"),
    "date": F("date"), "text": F("text"), "videoId": F("video"), "description": F("text"), "source": SOURCE,
}

REDIRECT = {"from": F("str", True), "to": F("path"), "source": SOURCE}

PAGE_TOP = {"pageTitle": F("str"), "intro": F("text"), "emptyText": F("str"), "subtitle": F("str")}

# file name -> (label for one entry, item fields, extra top-level fields)
LIST_FILES = {
    "news.json": ("news item", NEWS, {"pageSize": F("int")}),
    "events.json": ("event", EVENT, {}),
    "awards.json": ("award", AWARD, {}),
    "covers.json": ("cover", COVER, {}),
    "originals.json": ("release", ORIGINAL, {}),
    "concerts.json": ("concert", CONCERT, {"bannerImage": F("image"), "bannerImageAlt": F("str")}),
    "poems.json": ("poem", POEM, {"introSource": F("source"), "youtubeUrl": F("url"), "source": SOURCE,
                                  "playlistId": F("playlist"), "playlistTitle": F("str"),
                                  "playlistSource": F("source")}),
    "redirects.json": ("old address", REDIRECT, {}),
}
GENERATED = {"youtube-latest.json", "events-calendar.json", "images.json"}

SITE = {
    "siteName": F("str", True), "siteNameSource": F("source"), "shortName": F("str"), "artistName": F("str", True),
    "artistAlternateName": F("str"), "siteUrl": F("url", True), "email": F("email"), "copyrightName": F("str"),
    "listenUrl": F("url"), "listenLabel": F("str"), "subscribeUrl": F("url"), "subscribeLabel": F("str"),
    "youtubeChannelId": F("str"), "logo": F("image"), "ogImage": F("image"), "ogImageAlt": F("str"),
    "nav": F(("list", ("obj", {"id": F("id", True), "label": F("str", True), "path": F("path")})), True),
    "footerLinks": F(("list", ("obj", {"label": F("str", True), "path": F("path", True)}))),
    "social": F(("list", ("obj", {"name": F("str", True), "url": F("url", True),
                                  "icon": F(("enum", ["youtube", "instagram", "facebook", "x", "spotify",
                                                      "soundcloud", "link"]), True)}))),
    "source": SOURCE,
    "theme": F(("obj", {"accent": F("color"), "accentDark": F("color")})),
    "calendar": F(("obj", {"icsUrl": F("url"), "publicUrl": F("url"), "showSubscribe": F("bool")})),
}
SECTION = ("obj", {"show": F("bool"), "heading": F("str"), "count": F("int")})
HOME = {
    "hero": F(("obj", {"headline": F("str", True), "tagline": F("str"), "taglineSource": F("source"),
                       "image": F("image"), "imageAlt": F("str"), "source": SOURCE}), True),
    "about": F(("obj", {"heading": F("str"), "paragraphs": F(("list", "text")), "image": F("image"),
                        "imageAlt": F("str"), "source": SOURCE})),
    "sections": F(("obj", {k: F(SECTION) for k in ("releases", "videos", "awards", "news", "events")})),
    "contact": F(("obj", {"heading": F("str"), "text": F("text"), "email": F("email"), "instagram": F("url"),
                          "source": SOURCE})),
}
LEGAL_BLOCK = {"type": F(("enum", ["h2", "h3", "p", "ul"]), True), "id": F("str"), "text": F("text"), "items": F(("list", "text")),
               "lang": F("str")}
LEGAL_PAGE = ("obj", {"title": F("str", True), "blocks": F(("list", ("obj", LEGAL_BLOCK)), True), "source": SOURCE,
                      "lang": F("str")})
LEGAL = {"privacy": F(LEGAL_PAGE, True), "terms": F(LEGAL_PAGE, True)}

YT_VIDEO = {"videoId": F("video", True), "title": F("str"), "published": F("date"), "thumbnail": F("url"),
            "localThumbnail": F("image")}


# ---------------------------------------------------------------- reporting
class Report:
    def __init__(self):
        self.errors, self.warnings = [], []

    def add(self, level, file, where, msg, line=None):
        (self.errors if level == "error" else self.warnings).append((file, where, msg, line))


def json_line(raw, needle):
    """Line number of the first occurrence of needle in the raw file (for GitHub annotations)."""
    if not needle:
        return None
    i = raw.find(needle)
    return raw.count("\n", 0, i) + 1 if i >= 0 else None


def describe(label, index, item):
    title = ""
    if isinstance(item, dict):
        title = item.get("title") or item.get("award") or item.get("name") or item.get("label") or ""
    bits = [f"{label} #{index + 1}"]
    if title:
        bits.append(f'"{str(title)[:60]}"')
    if isinstance(item, dict) and item.get("id"):
        bits.append(f"(id: {item['id']})")
    return " ".join(bits)


# ---------------------------------------------------------------- value checks
def is_empty(v):
    return v is None or v == "" or v == [] or v == {}


def date_problem(v):
    if not isinstance(v, str):
        return f"must be text in quotes like \"2026-12-05\", not {json.dumps(v)}"
    m = DATE_RE.match(v)
    if not m:
        hint = ""
        m2 = re.match(r"^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$", v.strip())
        if m2:
            hint = f' For example "{m2.group(3)}-{int(m2.group(2)):02d}-{int(m2.group(1)):02d}".'
        return f'is "{v}". Write dates as YYYY-MM-DD (year-month-day).{hint}'
    y, mo, d = map(int, m.groups())
    if not (1 <= mo <= 12) or not (1 <= d <= calendar.monthrange(y, mo)[1]) or not (1900 <= y <= 2100):
        return f'is "{v}", which is not a real date.'
    return None


def check_value(rep, file, where, key, spec, v, raw):
    """Check one value against its type. Returns nothing; adds errors/warnings."""
    t = spec
    line = json_line(raw, f'"{key}"')

    def err(msg):
        rep.add("error", file, where, f"'{key}' {msg}", line)

    def warn(msg):
        rep.add("warning", file, where, f"'{key}' {msg}", line)

    if isinstance(t, tuple) and t[0] == "enum":
        if v not in t[1]:
            close = difflib.get_close_matches(str(v), t[1], n=1)
            err(f'is "{v}". Allowed: {", ".join(t[1])}.' + (f' Did you mean "{close[0]}"?' if close else ""))
        return
    if isinstance(t, tuple) and t[0] == "list":
        if not isinstance(v, list):
            err("must be a list in square brackets [ ... ].")
            return
        for i, x in enumerate(v):
            sub = t[1]
            if isinstance(sub, tuple) and sub[0] == "obj":
                check_object(rep, file, f"{where}, {key} #{i + 1}", sub[1], x, raw)
            else:
                check_value(rep, file, f"{where}, {key} #{i + 1}", key, sub, x, raw)
        return
    if isinstance(t, tuple) and t[0] == "obj":
        check_object(rep, file, f"{where} → {key}", t[1], v, raw)
        return

    if t in ("str", "text", "source"):
        if not isinstance(v, str):
            err(f"must be text in double quotes, not {json.dumps(v, ensure_ascii=False)[:40]}.")
        elif t == "str" and "\n" in v:
            warn("contains a line break; it will be shown on one line.")
        return
    if t == "id":
        if not isinstance(v, str) or not ID_RE.match(v):
            suggestion = re.sub(r"[^a-z0-9]+", "-", str(v).lower()).strip("-")
            err(f'is "{v}". Use only lowercase letters, digits and single dashes, e.g. "{suggestion or "my-entry"}".')
        return
    if t == "date":
        p = date_problem(v)
        if p:
            err(p)
        return
    if t == "time":
        if not isinstance(v, str) or not TIME_RE.match(v):
            err(f'is "{v}". Write times as HH:MM in 24-hour format, e.g. "19:30".')
        return
    if t == "year":
        if isinstance(v, bool) or not isinstance(v, int):
            if isinstance(v, str) and v.isdigit():
                err(f'is "{v}" in quotes. Write the year as a plain number without quotes: {v}')
            else:
                err(f"must be a year as a plain number, e.g. 2026 (got {json.dumps(v)}).")
        elif not 1950 <= v <= 2100:
            err(f"is {v}, which does not look like a year.")
        return
    if t == "int":
        if isinstance(v, bool) or not isinstance(v, int):
            err(f"must be a whole number without quotes (got {json.dumps(v)}).")
        return
    if t == "bool":
        if not isinstance(v, bool):
            err(f"must be true or false without quotes (got {json.dumps(v)}).")
        return
    if t == "url":
        if not isinstance(v, str) or not URL_RE.match(v.strip()):
            err(f'is "{v}". Web addresses must start with https:// and contain no spaces.')
        elif v != v.strip():
            err("has a space at the start or end.")
        elif v.lower().startswith("http://"):
            warn(f'uses http:// ("{v}"); use https:// if the site supports it.')
        return
    if t == "email":
        if not isinstance(v, str) or not EMAIL_RE.match(v):
            err(f'is "{v}", which is not an e-mail address.')
        return
    if t == "color":
        if not isinstance(v, str) or not COLOR_RE.match(v):
            err(f'is "{v}". Write colours as #RRGGBB, e.g. "#9C1C3F".')
        return
    if t == "tz":
        if not isinstance(v, str) or not TZ_RE.match(v):
            err(f'is "{v}". Use a time-zone name such as "Europe/Berlin", "Europe/London" or "Asia/Kolkata".')
        return
    if t == "path":
        if not isinstance(v, str) or v.startswith(("/", "http:", "https:")) or " " in v:
            err(f'is "{v}". Menu paths are relative: "" for Home, otherwise a folder name ending in /, e.g. "news/".')
        elif v and not v.endswith("/"):
            warn(f'is "{v}"; folder paths should end with /, e.g. "{v}/".')
        return
    if t == "video":
        if not isinstance(v, str) or not VIDEO_RE.match(v):
            m = re.search(r"(?:v=|youtu\.be/|/embed/|/shorts/|/live/)([A-Za-z0-9_-]{11})", str(v))
            hint = f' Use only the 11-character code: "{m.group(1)}".' if m else \
                ' It is the 11-character code after "v=" in a YouTube link, e.g. "dQw4w9WgXcQ".'
            err(f'is "{v}".' + hint)
        return
    if t == "playlist":
        if not isinstance(v, str) or not PLAYLIST_RE.match(v):
            m = re.search(r"list=([A-Za-z0-9_-]+)", str(v))
            hint = f' Use only the code after "list=": "{m.group(1)}".' if m else \
                ' It is the code after "list=" in a YouTube playlist link (starts with PL).'
            err(f'is "{v}".' + hint)
        return
    if t == "image":
        if not isinstance(v, str):
            err("must be text: a web address (https://...) or a file path like \"assets/img/photo.jpg\".")
        elif re.match(r"^https?://", v, re.I):
            if " " in v:
                err("contains spaces.")
        else:
            local = v.split("?")[0].lstrip("./").lstrip("/")
            if not (ROOT / local).is_file():
                err(f'points to "{v}", but that file does not exist in the repository. Upload it to assets/img/ '
                    'first (or use the image picker in Pages CMS), and check upper/lower case in the name.')
        return
    raise ValueError(f"unknown type {t}")


def check_object(rep, file, where, fields, obj, raw, *, allow_unknown=False):
    if not isinstance(obj, dict):
        rep.add("error", file, where, "must be an entry in curly braces { ... }.")
        return
    for key, (t, req) in fields.items():
        if key not in obj or is_empty(obj[key]):
            if req:
                if key in obj:
                    rep.add("error", file, where, f"'{key}' is empty but required.", json_line(raw, f'"{key}"'))
                else:
                    rep.add("error", file, where, f"'{key}' is missing (required).")
            continue
        check_value(rep, file, where, key, t, obj[key], raw)
    if allow_unknown:
        return
    for key in obj:
        if key in fields or key.startswith("_"):
            continue
        close = difflib.get_close_matches(key, list(fields), n=1, cutoff=0.75)
        hint = f' Did you mean "{close[0]}"?' if close else " The website ignores it."
        rep.add("warning", file, where, f"unknown field '{key}'.{hint}", json_line(raw, f'"{key}"'))


# ---------------------------------------------------------------- JSON loading
def explain_json_error(exc, raw):
    line_text = raw.splitlines()[exc.lineno - 1] if 0 < exc.lineno <= len(raw.splitlines()) else ""
    prev = raw[:exc.pos].rstrip()
    msg = exc.msg
    if any(q in line_text for q in "“”„‘’") or any(q in raw[max(0, exc.pos - 3):exc.pos + 3] for q in "“”"):
        why = "Curly quotes “ ” were used. JSON needs straight double quotes \" \"."
    elif re.search(r",\s*,$", prev):
        why = "Two commas in a row. Remove one."
    elif msg.startswith("Expecting property name") and prev.endswith(","):
        why = "There is a comma after the last field of an entry. Remove the comma before the closing }."
    elif msg.startswith("Expecting value") and prev.endswith(","):
        why = "There is a comma after the last entry of a list. Remove the comma before the closing ]."
    elif msg.startswith("Expecting ',' delimiter"):
        why = "A comma is missing between two fields or two entries (look at the end of the line above)."
    elif msg.startswith("Expecting ':' delimiter"):
        why = "A colon is missing after a field name, like \"title\": \"...\"."
    elif msg.startswith("Invalid control character"):
        why = "A line break was typed inside a text. Write \\n instead of pressing Enter inside quotes."
    elif msg.startswith("Unterminated string"):
        why = "A text is missing its closing double quote."
    elif msg.startswith("Expecting property name"):
        why = "Field names need double quotes, like \"title\"."
    elif msg.startswith("Extra data"):
        why = "There is extra text after the final closing }. Often a } too many."
    else:
        why = msg
    return f"is not valid JSON (line {exc.lineno}, column {exc.colno}): {why}" + \
        (f"\n      Line {exc.lineno}: {line_text.strip()[:100]}" if line_text.strip() else "")


def load(path, rep, rel):
    raw = path.read_text(encoding="utf-8-sig")
    dupes = []

    def hook(pairs):
        seen = {}
        for k, v in pairs:
            if k in seen:
                dupes.append(k)
            seen[k] = v
        return seen
    try:
        data = json.loads(raw, object_pairs_hook=hook)
    except json.JSONDecodeError as exc:
        rep.add("error", rel, "", explain_json_error(exc, raw), exc.lineno)
        return None, raw
    for k in sorted(set(dupes)):
        rep.add("warning", rel, "", f"the field '{k}' is written twice inside one entry; only the last one counts.",
                json_line(raw, f'"{k}"'))
    return data, raw


# ---------------------------------------------------------------- per-file checks
def check_list_file(rep, rel, name, data, raw, generated=False):
    label, fields, extra = LIST_FILES.get(name) or ("event", EVENT, {})
    if not isinstance(data, dict):
        rep.add("error", rel, "", "must start with { and contain an \"items\": [ ... ] list.")
        return []
    if "_help" not in data and not generated:
        rep.add("warning", rel, "", "the \"_help\" note at the top is missing (it explains the fields to editors).")
    if not isinstance(data.get("items"), list):
        rep.add("error", rel, "", "needs a list called \"items\": [ ... ] (it may be empty: \"items\": []).")
        return []
    top = {**PAGE_TOP, **extra, "items": F("skip")}
    for key, (t, _) in top.items():
        if t != "skip" and key in data and not is_empty(data[key]):
            check_value(rep, rel, "top of the file", key, t, data[key], raw)
    if not generated:
        for key in data:
            if key not in top and not key.startswith("_"):
                rep.add("warning", rel, "top of the file", f"unknown field '{key}'. The website ignores it.",
                        json_line(raw, f'"{key}"'))
    ids = {}
    for i, item in enumerate(data["items"]):
        where = describe(label, i, item)
        check_object(rep, rel, where, fields, item, raw, allow_unknown=generated)
        if not isinstance(item, dict):
            continue
        iid = item.get("id")
        if isinstance(iid, str) and iid:
            if iid in ids:
                rep.add("error", rel, where, f"the id \"{iid}\" is already used by {name.split('.')[0]} entry "
                        f"#{ids[iid] + 1}. Every id must be unique; add a year or a word, e.g. \"{iid}-2\".",
                        json_line(raw, f'"id": "{iid}"'))
            else:
                ids[iid] = i
        if not generated and is_empty(item.get("source")):
            rep.add("warning", rel, where, "'source' is empty. Note where the information comes from (a web address).")
        # event-specific cross checks
        if fields is EVENT:
            if item.get("endDate") and item.get("date") and str(item["endDate"]) < str(item["date"]):
                rep.add("error", rel, where, f"'endDate' ({item['endDate']}) is before 'date' ({item['date']}).")
            if item.get("endTime") and not item.get("startTime"):
                rep.add("warning", rel, where, "'endTime' is set but 'startTime' is empty.")
            if (item.get("startTime") or item.get("endTime")) and not item.get("timezone") and not generated:
                rep.add("warning", rel, where, "times are set but 'timezone' is empty; calendars may show the wrong "
                        "hour. Add e.g. \"Europe/Berlin\" or \"Asia/Kolkata\".")
            if (item.get("startTime") and item.get("endTime") and not item.get("endDate")
                    and item["endTime"] <= item["startTime"]):
                rep.add("warning", rel, where, "'endTime' is not after 'startTime'. If the show ends after "
                        "midnight, also set 'endDate'.")
        if fields is POEM and not item.get("videoId") and not item.get("text"):
            rep.add("warning", rel, where, "has neither 'text' nor 'videoId'; nothing will be shown except the title.")
        if fields is ORIGINAL:
            for j, tr in enumerate(item.get("tracks") or []):
                if isinstance(tr, dict):
                    for key in tr:
                        if key not in TRACK and not key.startswith("_"):
                            rep.add("warning", rel, f"{where}, track #{j + 1}", f"unknown field '{key}'.")
    if fields is ORIGINAL:
        feat = [it.get("title", "?") for it in data["items"] if isinstance(it, dict) and it.get("featured") is True]
        if len(feat) > 1:
            rep.add("warning", rel, "", f"{len(feat)} releases have \"featured\": true ({', '.join(feat)}). "
                    "Only the first is shown large; usually keep one.")
    return list(ids)


def check_site(rep, rel, data, raw):
    check_object(rep, rel, "site settings", SITE, data, raw)
    if isinstance(data, dict):
        su = data.get("siteUrl")
        if isinstance(su, str) and su and not su.endswith("/"):
            rep.add("error", rel, "site settings", f"'siteUrl' is \"{su}\"; it must end with / (\"{su}/\").")
        nav_ids = [n.get("id") for n in data.get("nav") or [] if isinstance(n, dict)]
        for d in {x for x in nav_ids if x and nav_ids.count(x) > 1}:
            rep.add("error", rel, "nav", f"the menu id \"{d}\" is used twice.")


def check_youtube_latest(rep, rel, data, raw):
    if not isinstance(data, dict):
        rep.add("error", rel, "", "must be an object { ... }.")
        return
    check_object(rep, rel, "YouTube sync data", {
        "channelId": F("str"), "updated": F("str"), "videos": F(("list", ("obj", YT_VIDEO)), True),
    }, data, raw, allow_unknown=True)
    for key, kind in (("titles", "str"), ("dates", "date")):
        m = data.get(key, {})
        if not isinstance(m, dict):
            rep.add("error", rel, "YouTube sync data", f"'{key}' must be an object {{ \"videoId\": ... }}.")
            continue
        for vid, val in m.items():
            if not VIDEO_RE.match(vid):
                rep.add("error", rel, f"{key}", f"\"{vid}\" is not a YouTube video code.")
            if kind == "date" and date_problem(val):
                rep.add("error", rel, f"{key} → {vid}", date_problem(val))
            if kind == "str" and not isinstance(val, str):
                rep.add("error", rel, f"{key} → {vid}", "must be text.")
    pls = data.get("playlists", {})
    if not isinstance(pls, dict):
        rep.add("error", rel, "YouTube sync data", "'playlists' must be an object.")
    else:
        for pid, lst in pls.items():
            if not isinstance(lst, list):
                rep.add("error", rel, f"playlists → {pid}", "must be a list.")
                continue
            for i, v in enumerate(lst):
                check_object(rep, rel, f"playlists → {pid}, video #{i + 1}", YT_VIDEO, v, raw, allow_unknown=True)


def check_images_manifest(rep, rel, data, raw):
    if not isinstance(data, dict) or not isinstance(data.get("images"), dict):
        rep.add("error", rel, "", "must contain \"images\": { ... } (written by tools/localize_assets.py).")
        return
    for path, meta in data["images"].items():
        where = f'image "{path}"'
        if not isinstance(meta, dict):
            rep.add("error", rel, where, "must be { \"width\": ..., \"height\": ... }.")
            continue
        for k in ("width", "height"):
            if not isinstance(meta.get(k), int):
                rep.add("error", rel, where, f"'{k}' must be a whole number.")
        if not (ROOT / path).is_file():
            rep.add("warning", rel, where, "is listed but the file is missing (run tools/localize_assets.py again).")
        for s in meta.get("srcset") or []:
            if isinstance(s, dict) and s.get("src") and not (ROOT / s["src"]).is_file():
                rep.add("warning", rel, where, f"smaller version \"{s['src']}\" is missing.")


def check_redirects(rep, rel, data, raw):
    """Extra rules for data/redirects.json: usable, unique old addresses that are not real pages."""
    seen = {}
    for i, item in enumerate(data.get("items") or []):
        if not isinstance(item, dict) or not isinstance(item.get("from"), str):
            continue
        where = f"old address #{i + 1} (\"{item['from']}\")"
        frm = item["from"].strip().split("#")[0].split("?")[0].strip("/")
        line = json_line(raw, f'"{item["from"]}"')
        if re.match(r"^https?://", frm, re.I):
            rep.add("error", rel, where, "\"from\" must be the address WITHOUT the domain, e.g. \"home\" "
                    "for https://nihiramusic.in/home.", line)
            continue
        if not frm or ".." in frm or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._~/-]*", frm):
            rep.add("error", rel, where, "\"from\" may only contain letters, digits and - _ . ~ /", line)
            continue
        if frm.split("/")[0] in {"assets", "data", "tools", "docs"}:
            rep.add("error", rel, where, f"\"{frm}\" points into a website folder; choose the old page address.", line)
        if (ROOT / frm / "index.html").exists() and "generated:redirect-stub" not in \
                (ROOT / frm / "index.html").read_text(encoding="utf-8", errors="ignore"):
            rep.add("warning", rel, where, f"\"{frm}\" is a real page of this site; this entry is ignored.", line)
        low = frm.lower()
        if low in seen:
            rep.add("error", rel, where, f"the same old address is already listed as entry #{seen[low] + 1}.", line)
        seen.setdefault(low, i)


def check_file(path, rep):
    rel = path.relative_to(ROOT).as_posix()
    name = path.name
    data, raw = load(path, rep, rel)
    if data is None:
        return
    if name in LIST_FILES:
        check_list_file(rep, rel, name, data, raw)
        if name == "redirects.json":
            check_redirects(rep, rel, data, raw)
    elif name == "events-calendar.json":
        check_list_file(rep, rel, name, data, raw, generated=True)
    elif name == "site.json":
        check_site(rep, rel, data, raw)
    elif name == "home.json":
        check_object(rep, rel, "home page", HOME, data, raw)
    elif name == "legal.json":
        check_object(rep, rel, "legal pages", LEGAL, data, raw)
    elif name == "youtube-latest.json":
        check_youtube_latest(rep, rel, data, raw)
    elif name == "images.json":
        check_images_manifest(rep, rel, data, raw)
    else:
        rep.add("warning", rel, "", "is not used by the website (only valid JSON was checked).")


# ---------------------------------------------------------------- output
def main(argv):
    files = [Path(a).resolve() for a in argv if a.endswith(".json")] or sorted(DATA.glob("*.json"))
    rep = Report()
    for f in files:
        if not f.is_file():
            rep.add("error", str(f), "", "file not found.")
            continue
        check_file(f, rep)

    gha = os.environ.get("GITHUB_ACTIONS") == "true"
    lines = []
    for level, items in (("ERROR", rep.errors), ("Warning", rep.warnings)):
        for file, where, msg, line in items:
            text = f"{file}: {where + ': ' if where else ''}{msg}"
            print(f"{'✗' if level == 'ERROR' else '!'} {level}  {text}")
            lines.append(f"- **{level}** `{file}`{' – ' + where if where else ''}: {msg}")
            if gha:
                kind = "error" if level == "ERROR" else "warning"
                loc = f"file={file}" + (f",line={line}" if line else "")
                clean = msg.replace("\n", " ").replace("%", "%25")
                print(f"::{kind} {loc},title={file}::{(where + ': ') if where else ''}{clean}")
    n = len(files)
    if rep.errors:
        summary = (f"✗ {len(rep.errors)} error(s) in the content files. The live website was NOT changed. "
                   "Fix the lines above (open the file on GitHub, click the pencil, correct it, commit).")
    else:
        summary = f"✓ All {n} content files are fine." + (f" {len(rep.warnings)} warning(s) to look at."
                                                       if rep.warnings else "")
    print(summary)
    step_summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if step_summary:
        with open(step_summary, "a", encoding="utf-8") as fh:
            fh.write("## Content check\n\n" + summary + "\n\n" + "\n".join(lines) + "\n")
    return 1 if rep.errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
