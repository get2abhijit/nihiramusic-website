#!/usr/bin/env python3
"""Copies events from a public Google or Outlook calendar into data/events-calendar.json.

Run by .github/workflows/calendar-sync.yml every 6 hours (and on demand). The Events page and Home show
these events together with the ones typed into data/events.json (events.json wins if both list the same
show: same id, or same date and title).

Where the calendar address comes from (first one found):
  1. the repository secret CALENDAR_ICS_URL  (recommended: the address stays private)
  2. "calendar": {"icsUrl": "…"} in data/site.json
No address -> nothing happens.

Rules: events marked private/confidential are skipped. Recurring events (RRULE) appear once, on their
first date. Text in the location field becomes the venue. A link in the event's URL field becomes the
ticket button. A cancelled event shows as "Cancelled". Events that ended more than 3 years ago are dropped.
Python standard library only.
    CALENDAR_ICS_URL="https://…/basic.ics" python3 tools/sync_calendar.py
"""
import hashlib
import json
import os
import re
import sys
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

try:
    from zoneinfo import ZoneInfo
except ImportError:
    ZoneInfo = None

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
OUT = DATA / "events-calendar.json"
HELP = ("Written automatically by .github/workflows/calendar-sync.yml (tools/sync_calendar.py) from the linked "
        "Google/Outlook calendar. Do not edit by hand: change the event in the calendar instead, or add it to "
        "events.json (events.json wins when both list the same show). Same fields as events.json.")
# Outlook writes Windows zone names; map the common ones to IANA names.
WINDOWS_TZ = {
    "W. Europe Standard Time": "Europe/Berlin", "Central Europe Standard Time": "Europe/Budapest",
    "Romance Standard Time": "Europe/Paris", "GMT Standard Time": "Europe/London",
    "India Standard Time": "Asia/Kolkata", "UTC": "UTC", "Eastern Standard Time": "America/New_York",
    "Pacific Standard Time": "America/Los_Angeles", "Arabian Standard Time": "Asia/Dubai",
    "Singapore Standard Time": "Asia/Singapore", "AUS Eastern Standard Time": "Australia/Sydney",
}


def fetch(url):
    url = re.sub(r"^webcal://", "https://", url.strip())
    req = urllib.request.Request(url, headers={"User-Agent": "nihiramusic-calendar-sync/1.0"})
    with urllib.request.urlopen(req, timeout=40) as r:
        return r.read().decode("utf-8", errors="replace")


def unfold(text):
    return re.sub(r"\r?\n[ \t]", "", text).replace("\r\n", "\n").split("\n")


def unescape(v):
    return re.sub(r"\\([\\;,nN])", lambda m: "\n" if m.group(1) in "nN" else m.group(1), v)


def parse(text):
    """-> (calendar time zone, list of events as {prop: (params, value)})."""
    cal_tz, events, cur, depth = None, [], None, 0
    for line in unfold(text):
        if not line:
            continue
        if line.startswith("BEGIN:VEVENT"):
            cur = {}
            continue
        if line.startswith("END:VEVENT"):
            if cur is not None:
                events.append(cur)
            cur = None
            continue
        if line.startswith("BEGIN:VALARM"):
            depth += 1
        if line.startswith("END:VALARM"):
            depth -= 1
            continue
        m = re.match(r"^([A-Za-z0-9-]+)((?:;[^:]*)?):(.*)$", line)
        if not m:
            continue
        name, params, value = m.group(1).upper(), m.group(2), m.group(3)
        if cur is None:
            if name == "X-WR-TIMEZONE":
                cal_tz = value.strip()
            continue
        if depth:
            continue
        p = dict(re.findall(r";([A-Za-z-]+)=(\"[^\"]*\"|[^;]*)", params))
        cur.setdefault(name, (dict((k.upper(), v.strip('"')) for k, v in p.items()), value))
    return cal_tz, events


def zone(name):
    name = WINDOWS_TZ.get(name, name)
    if not name or not ZoneInfo:
        return None, None
    try:
        return name, ZoneInfo(name)
    except Exception:
        return None, None


def when(prop, cal_tz):
    """-> (date 'YYYY-MM-DD', time 'HH:MM' or None, IANA zone or None)."""
    params, v = prop
    v = v.strip()
    if params.get("VALUE") == "DATE" or re.fullmatch(r"\d{8}", v):
        return f"{v[:4]}-{v[4:6]}-{v[6:8]}", None, None
    m = re.fullmatch(r"(\d{8})T(\d{2})(\d{2})(\d{2})(Z?)", v)
    if not m:
        return None, None, None
    dt = datetime.strptime(m.group(1) + m.group(2) + m.group(3), "%Y%m%d%H%M")
    if m.group(5):  # UTC -> the calendar's own time zone, so visitors see local venue time
        name, tz = zone(cal_tz or "UTC")
        if tz:
            dt = dt.replace(tzinfo=timezone.utc).astimezone(tz)
            return dt.strftime("%Y-%m-%d"), dt.strftime("%H:%M"), name
        return dt.strftime("%Y-%m-%d"), dt.strftime("%H:%M"), "UTC"
    name, _ = zone(params.get("TZID") or cal_tz)
    return dt.strftime("%Y-%m-%d"), dt.strftime("%H:%M"), name


def convert(ev, cal_tz):
    get = lambda k: unescape(ev[k][1]).strip() if k in ev else ""
    if get("CLASS").upper() in ("PRIVATE", "CONFIDENTIAL") or "DTSTART" not in ev:
        return None
    d, t, tz = when(ev["DTSTART"], cal_tz)
    if not d or not get("SUMMARY"):
        return None
    out = {"id": "cal-" + hashlib.sha1(get("UID").encode() or (d + get("SUMMARY")).encode()).hexdigest()[:10],
           "title": get("SUMMARY"), "date": d}
    if "DTEND" in ev:
        ed, et, _ = when(ev["DTEND"], cal_tz)
        if ed and t is None:  # all-day: DTEND is the day after
            last = (date.fromisoformat(ed) - timedelta(days=1)).isoformat()
            if last > d:
                out["endDate"] = last
        elif ed and et:
            if ed != d:
                out["endDate"] = ed
            out["endTime"] = et
    if t:
        out["startTime"] = t
        if tz:
            out["timezone"] = tz
        out = {k: out[k] for k in ("id", "title", "date", "endDate", "startTime", "endTime", "timezone") if k in out}
    if get("LOCATION"):
        out["venue"] = get("LOCATION").replace("\n", ", ")
    out["status"] = "cancelled" if get("STATUS").upper() == "CANCELLED" else "scheduled"
    if re.match(r"^https?://", get("URL")):
        out["ticketUrl"] = get("URL")
    if get("DESCRIPTION"):
        desc = re.sub(r"<br\s*/?>", "\n", get("DESCRIPTION"), flags=re.I)
        out["description"] = re.sub(r"<[^>]+>", "", desc).strip()  # Google/Outlook may send HTML
    out["source"] = "calendar"
    return out


def main():
    site = json.loads((DATA / "site.json").read_text(encoding="utf-8"))
    url = os.environ.get("CALENDAR_ICS_URL", "").strip() or ((site.get("calendar") or {}).get("icsUrl") or "").strip()
    if not url:
        print("No calendar linked (secret CALENDAR_ICS_URL or site.json calendar.icsUrl). Nothing to do.")
        return
    try:
        cal_tz, raw = parse(fetch(url))
    except Exception as exc:
        sys.exit(f"Could not read the calendar ({exc}). Check that it is shared publicly and the .ics address is right.")
    cutoff = (date.today() - timedelta(days=3 * 365)).isoformat()
    events = [e for e in (convert(r, cal_tz) for r in raw) if e and (e.get("endDate") or e["date"]) >= cutoff]
    events.sort(key=lambda e: (e["date"], e.get("startTime", "")))
    out = {"_help": HELP, "items": events}
    text = json.dumps(out, ensure_ascii=False, indent=2) + "\n"
    if OUT.exists() and OUT.read_text(encoding="utf-8") == text:
        print(f"No calendar changes ({len(events)} events).")
        return
    OUT.write_text(text, encoding="utf-8")
    print(f"Updated {OUT.relative_to(ROOT)}: {len(events)} events.")


if __name__ == "__main__":
    main()
