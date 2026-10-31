# nihiramusic.in: website guide

This is the website "The Sound of (Nihira)Music" for Nihira Joshi. It is a plain static site: no build step, no database.
**All text, songs, events, news and awards live in the `data/` folder.** You never need to touch the code to update content.

## Editor's guide (one page)

There are two ways to change the website. Both save a new version on GitHub; the site updates by itself
1–3 minutes later. Every change is checked automatically first (see "If something goes wrong").

### A. With forms: Pages CMS (recommended)

**Set up once (5 minutes):**
1. Go to https://app.pagescms.org and **Sign in with GitHub**.
2. When asked, **install the Pages CMS GitHub App** and give it access to the repository `nihiramusic-website` only.
3. Open the repository (branch `master`). The left menu shows: News, Events, Awards, Originals, Covers,
   Concerts, Poetic Treasures, Home page text.
4. Optional: to let someone without a GitHub account edit, invite them by e-mail (Pages CMS → Collaborators).

**Everyday use:**
- Open a section, e.g. **Events**. Entries are folded; click one to open it, or **Add an entry** at the end of the
  list. Order does not matter: the website sorts by date.
- Fill in the fields. Each field has a short explanation underneath. Things to know:
  - **ID**: a unique short name with lowercase letters and dashes, e.g. `stuttgart-concert-2026`. Don't change it later.
  - **Dates** come from the date picker. **Times** are typed like `19:30`. Pick the venue's **time zone**.
  - **YouTube video code**: only the 11 characters after `v=` in the link, not the whole link.
  - **Images**: click the image field and **upload** a photo (JPG/WebP, about 1600 px wide, under 500 KB).
    It is stored in `assets/img/uploads/`. Always fill in the description below it.
  - **Source**: the web address where the information is published. It is never shown; it keeps the site trustworthy.
  - **Private note / Open question**: for yourself; never shown.
- Click **Save**. Pages CMS saves the whole file as one change.
- Upcoming shows go under **Events**; videos of past shows under **Concerts**.
- Videos of the **Poetic Thursdays** playlist appear on Poetic Treasures by themselves. Add an entry only to give a
  video a better title or a note. Poem **text** only for Nihira's own poems, never other poets' poems or song lyrics.

**Not in Pages CMS on purpose:** menu and site settings (`data/site.json`), legal texts (`data/legal.json`, change
only after legal advice), and everything written automatically (`data/youtube-latest.json`,
`data/events-calendar.json`, `data/images.json`, `sitemap.xml`, `robots.txt`, `news/feed.xml`,
`events/calendar.ics`, the generated blocks in the `index.html` files). Concerts in the linked Google calendar
appear on the Events page automatically and are not listed in the Events form.

**First time only, please check:** after your first save, open the repository on github.com → **Commits** → the
newest commit "Update data/... (via Pages CMS)". It should show only the lines you changed (formatting changes
of the file are fine). If private notes or sources disappeared, tell the developer.

### B. Directly on github.com (for everything else)

Open the repository → `data/` → the file → **pencil icon** → change → **Commit changes**. Rules are in section 3
below; copy-paste templates in section 4. Each file starts with a `"_help"` note explaining its fields.

### If something goes wrong

- After each save, GitHub runs **Check content**. A green ✓ in **Actions** means all is well.
- A red ✗ means a mistake was found. **The live website is not changed** (it keeps its last good version) until
  it is fixed. Click the red run → **Check content** / **Deploy site** → read the message. It names the file, the
  entry and what to do, for example:
  `data/events.json: event #3 "Live in Stuttgart" (id: stuttgart-concert-2026): 'date' is "05.12.2026". Write dates as YYYY-MM-DD … "2026-12-05".`
- Fix it (in Pages CMS or with the pencil on GitHub) and save again. The site then updates by itself.
- Yellow "warnings" (e.g. an unknown field name, a missing source) don't stop the site; look at them when you can.
- Undo a change: github.com → **Commits** → open the commit → **⋯ → Revert** (or ask the developer).
- Check on your own computer: `python3 tools/validate_data.py`.

## 1. Look at the site on your own computer

1. Install Python 3 (Mac/Linux usually have it; on Windows get it from python.org).
2. Open a terminal in this folder (the one containing `index.html`) and run:
   ```
   python3 -m http.server
   ```
3. Open http://localhost:8000 in your browser. Press `Ctrl+C` in the terminal to stop.

Opening `index.html` by double-clicking does **not** work (browsers block loading the data files that way).

## 2. Put the site online with GitHub Pages

**First time:**
1. Create a free account at github.com and click **New repository**. Name it e.g. `nihiramusic-website`, set it to **Public**, and create it.
2. Click **uploading an existing file**, drag in **everything inside** this folder (including the hidden `.github` folder), and click **Commit changes**.
   - Hidden folders are easy to miss when dragging. If `.github` is missing afterwards, use GitHub Desktop (desktop.github.com).
3. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
4. **Settings → Actions → General → Workflow permissions → Read and write permissions → Save.**
5. **Actions → Deploy site → Run workflow.** After 1–2 minutes the site is live at `https://<your-username>.github.io/<repository-name>/`.
6. **Actions → YouTube sync → Run workflow** once. It fills "Latest videos", collects missing video titles, reads the Poetic Treasures playlist and copies thumbnails. Afterwards it runs every day, and the site republishes itself after each run.

**Updating from Milestone 3 (site already online):**
1. Upload all files of the new ZIP over the old ones, including the hidden `.pages.yml` file and `.github/workflows/`
   (one new file: `validate-data.yml`), and the new folder `assets/img/uploads/`.
2. **Then run Actions → YouTube sync and Actions → Calendar sync once.** The ZIP contains snapshots of the
   automatically written files (`data/youtube-latest.json`, `data/images.json`, `data/events-calendar.json`);
   uploading it can replace newer versions, and the two syncs bring them up to date again.
   (This is why "Latest videos" was empty after the Milestone 3 upload.)
3. Set up Pages CMS (Editor's guide, A).

**Updating from Milestone 2 (site already online):**
1. Upload all files of the new ZIP over the old ones (including `.github/workflows/`, which has two new files).
2. Run **Actions → Deploy site**, then **Actions → SEO files** once. Nothing else changes in the settings.
3. Optional: link a Google or Outlook calendar (section 5b).

**Updating from Milestone 1 (site already online):**
1. Upload all files of the new ZIP over the old ones (same steps as above; GitHub replaces changed files).
2. Change **Settings → Pages → Source** from "Deploy from a branch" to **GitHub Actions**.
3. Run **Actions → Deploy site**, then **Actions → YouTube sync**.

Do **not** add a `CNAME` file yet; switching the real domain is Milestone 5.

## 2b. Copy the images off Hostinger (once, before the Hostinger plan ends)

The photos still live on the old Hostinger site. Copy them into this website:
1. On your computer, open a terminal in this folder (it needs internet) and run:
   ```
   python3 tools/localize_assets.py --dry-run   # shows what it will do
   python3 tools/localize_assets.py             # downloads and rewrites
   ```
2. It saves the images in `assets/img/` (photos also in smaller sizes for phones), changes the paths in `data/`,
   writes sizes to `data/images.json` and points the share image of every page at the local copy.
3. Check the site locally (section 1), then upload the changed files: `assets/img/`, `data/`, and all `index.html` files.
It prints a list of anything it could not download; just run it again later. Running it twice is safe.

## 3. Updating content

Open the repository on github.com, click into `data/`, click a file, then the **pencil icon** (Edit). Make the change and click **Commit changes**. The site updates within a minute or two.

Rules that keep things working:

- Every file starts with a `"_help"` note explaining its fields. Read it first.
- Dates are always `YYYY-MM-DD`, e.g. `"2026-12-05"`.
- Text goes in "straight double quotes". Between two entries there is a **comma**; after the **last** entry there is **no** comma.
- Order doesn't matter: newest-first sorting is automatic. Add new entries anywhere in the list.
- `id` must be unique, lowercase, with dashes: `"diwali-concert-2026"`.
- Leave a field out if you don't know it. Never guess facts.
- Fields starting with `_` (like `_todo`) are private notes and never shown.
- Upcoming events automatically move to "Past events" the day after they happen.
- Leave `title` empty (`""`) for a YouTube video and the site shows its YouTube title (collected daily).
- Website name, accent colour: `data/site.json` → `siteName` (text in brackets is shown in the accent colour) and `theme.accent` / `theme.accentDark` (e.g. `"#9C1C3F"`; keep it dark enough for white button text).

### Check before saving

You don't have to: every change is checked automatically and a broken file is never published (see
"If something goes wrong" in the Editor's guide). To check while editing on GitHub, copy the file into
https://jsonlint.com, or run `python3 tools/validate_data.py` on your computer.

## 4. Copy-paste templates

Paste inside the `"items": [ ... ]` list of the matching file. Remember the comma between entries.

**News** (`data/news.json`)
```json
{
  "id": "new-single-announcement",
  "date": "2026-11-15",
  "title": "New single out now",
  "summary": "One or two sentences shown in the list and on the home page.",
  "body": "Optional longer text.\n\nA blank line starts a new paragraph. **Bold** and [links](https://example.com) work.",
  "image": "",
  "link": "https://song.link/...",
  "linkLabel": "Listen now",
  "source": "where this information came from"
}
```

**Event** (`data/events.json`)
```json
{
  "id": "stuttgart-concert-2026",
  "title": "Live in Stuttgart",
  "date": "2026-12-05",
  "startTime": "19:00",
  "endTime": "21:30",
  "timezone": "Europe/Berlin",
  "venue": "Venue name",
  "city": "Stuttgart",
  "country": "Germany",
  "status": "scheduled",
  "ticketUrl": "https://...",
  "description": "Short description.",
  "source": "where this information came from"
}
```
`status` can be `scheduled`, `cancelled` or `sold-out`.

**Award** (`data/awards.json`)
```json
{
  "id": "award-name-2026",
  "year": 2026,
  "award": "Name of the award",
  "category": "Category",
  "work": "Song or album",
  "status": "Won",
  "organisation": "Who gives the award",
  "link": "https://proof-or-article",
  "highlight": true,
  "source": "https://proof-or-article"
}
```
`status`: `Won`, `Nominated` or `Finalist`. `highlight: true` shows it on the home page.

**Cover** (`data/covers.json`)
```json
{
  "id": "song-name-cover",
  "title": "Song name",
  "category": "Hindi Covers",
  "year": 2026,
  "videoId": "abcDEF12345",
  "originalArtist": "Original singer",
  "source": "https://www.youtube.com/watch?v=abcDEF12345"
}
```
The `videoId` is the part after `v=` in a YouTube link (or after `youtu.be/`).

**Original** (`data/originals.json`)
```json
{
  "id": "song-name",
  "title": "Song name",
  "type": "Single",
  "year": 2026,
  "date": "2026-11-15",
  "videoId": "abcDEF12345",
  "credits": "feat. Artist name",
  "description": "Optional text about the song.",
  "listenUrl": "https://song.link/...",
  "spotifyUrl": "https://open.spotify.com/track/...",
  "featured": false,
  "source": "where this information came from"
}
```
Set `"featured": true` on one release to pin it to the top.

**Poem** (`data/poems.json`). Only Nihira's own poems as `text`; for other poets' poems add only the recitation `videoId`. Never song lyrics.
```json
{
  "id": "poem-name",
  "title": "कवितेचे नाव",
  "lang": "mr",
  "author": "Nihira Joshi-Deshpande",
  "date": "2026-11-15",
  "text": "First line\nSecond line\n\nNew stanza",
  "videoId": "",
  "source": "where it was published"
}
```
`lang`: `mr` Marathi, `hi` Hindi, `en` English. `\n` = new line, `\n\n` = new stanza.

**Menu item** (`data/site.json`, inside `"nav"`): `{ "id": "press", "label": "Press", "path": "press/" }`

## 5. What runs automatically

- **Check content** (`.github/workflows/validate-data.yml`, after every change in `data/` or `assets/img/`): checks
  all data files (`tools/validate_data.py`). "Deploy site" runs the same check first and refuses to publish broken data.

- **YouTube sync** (`.github/workflows/youtube-sync.yml`, daily): updates `data/youtube-latest.json` (Home "Latest videos" and video titles) and copies thumbnails to `assets/img/yt/`. It never changes your other data files and only saves when something changed.
- **Deploy site** (`.github/workflows/pages.yml`): publishes the site after every change and after each YouTube sync. If the site doesn't update, open **Actions** and look for a red ✗; **Run workflow** on "Deploy site" retries.

- **SEO files** (`.github/workflows/seo-build.yml`, after each data change and daily): rewrites `sitemap.xml`, `robots.txt`, the news RSS feed `news/feed.xml`, the subscribable calendar `events/calendar.ics`, the structured data (JSON-LD) in the page heads and the short no-JavaScript overview on Home. Script: `tools/build_seo.py`. Never edit those files by hand; change `data/` instead. "Deploy site" runs the same script before publishing, so the live site is right even if this workflow has not finished.
- **Calendar sync** (`.github/workflows/calendar-sync.yml`, every 6 hours): copies events from a linked Google/Outlook calendar into `data/events-calendar.json`. Does nothing until you link one (section 5b).

Everything also works by hand: `python3 tools/build_seo.py` (add `--check` to only see what would change).

## 5b. Link a Google or Outlook calendar (optional)

Then concerts you put in that calendar appear on the website by themselves (Events page and Home), at most 6 hours later. You can still type events into `data/events.json`; if both list the same show (same date and title), `events.json` wins.

1. Use a **separate calendar just for public concerts** (everything in it becomes public).
2. Get its **public iCal address** (ends in `.ics`):
   - **Google Calendar** (web): Settings → *Settings for my calendars* → choose the calendar → *Access permissions for events* → tick **Make available to public** → scroll to *Integrate calendar* → copy **Public address in iCal format**.
   - **Outlook.com / Microsoft 365** (web): Settings → Calendar → *Shared calendars* → *Publish a calendar* → choose the calendar, *Can view all details* → **Publish** → copy the **ICS** link.
   (Menu names change from time to time; search the help for "public iCal address" or "publish calendar" if they differ.)
3. On github.com: **Settings → Secrets and variables → Actions → New repository secret**. Name: `CALENDAR_ICS_URL`, value: the address. (A secret keeps the address out of the public files. Putting it in `data/site.json` → `calendar.icsUrl` also works.)
4. **Actions → Calendar sync → Run workflow.** After it and "Deploy site" finish, the events are online.

How calendar entries are read: the event title becomes the title, *Location* becomes the venue, the description is shown as text, a link in the event's URL field becomes the **Tickets** button, a cancelled event shows "Cancelled". Private events are skipped. A repeating event shows only its first date.
Optional, in `data/site.json` → `calendar`: `publicUrl` (link "Open the calendar" on the Events page), `showSubscribe: false` hides the subscribe box.

**Visitors can subscribe too:** the Events page has "Never miss a concert" buttons (Apple/Outlook, Google Calendar, copy address). They subscribe to `events/calendar.ics`, which contains every event on the website and refreshes in their calendar app automatically (Google refreshes it only every few hours).

## 5c. Search engines and sharing

- Page titles and descriptions are in each page's `index.html` (`<title>` and `<meta name="description">`). The rest is automatic from `data/site.json`: `siteUrl` (canonical links, sitemap, feed), `ogImage` (share picture, 1200 × 630 px), `artistName` / `artistAlternateName` (structured data for Google).
- Check the structured data: https://search.google.com/test/rich-results (enter a page address once the site runs on nihiramusic.in) or https://validator.schema.org (paste the page's source).
- RSS feed for news readers: `news/feed.xml` (linked on the News page).
- The sitemap is submitted to Google Search Console after the domain move (Milestone 5).

## 6. Privacy notes

- No cookies, no analytics, no forms.
- Fonts are stored in `assets/fonts/` (no request to Google).
- The calendar buttons contact Google/Apple/Microsoft only when a visitor clicks them.
- YouTube videos only load after a visitor clicks play, from `youtube-nocookie.com`. Thumbnails come from `assets/img/yt/` once the sync or `localize_assets.py` has copied them; until then from YouTube's image server (no cookies).

More background and open questions: `docs/ROADMAP.md`. Changes per milestone: `docs/CHANGELOG.md`.
