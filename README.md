# nihiramusic.in: website guide

This is the website of Nihira Joshi-Deshpande. It is a plain static site: no build step, no database.
**All text, songs, events, news and awards live in the `data/` folder.** You never need to touch the code to update content.

## 1. Look at the site on your own computer

1. Install Python 3 (Mac/Linux usually have it; on Windows get it from python.org).
2. Open a terminal in this folder (the one containing `index.html`) and run:
   ```
   python3 -m http.server
   ```
3. Open http://localhost:8000 in your browser. Press `Ctrl+C` in the terminal to stop.

Opening `index.html` by double-clicking does **not** work (browsers block loading the data files that way).

## 2. Put the site online with GitHub Pages (one-time)

1. Create a free account at github.com and click **New repository**. Name it e.g. `nihiramusic`, set it to **Public**, and create it.
2. Click **uploading an existing file**, drag in **everything inside** this folder (including the hidden `.github` folder and `.nojekyll`), and click **Commit changes**.
   - Tip: hidden folders are easy to miss when dragging. If `.github` is missing afterwards, use GitHub Desktop (desktop.github.com) instead.
3. Go to **Settings → Pages**. Under *Build and deployment* choose **Deploy from a branch**, branch **main**, folder **/ (root)**, then **Save**.
4. Go to **Settings → Actions → General → Workflow permissions**, choose **Read and write permissions**, and **Save**.
5. After 1–2 minutes the site is live at `https://<your-username>.github.io/<repository-name>/`.
6. Go to **Actions → YouTube sync → Run workflow** once. This fills "Latest videos" on the home page and adds missing video titles. After that it runs by itself every day.

Do **not** add a `CNAME` file yet; switching the real domain is Milestone 5.

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

### Check before saving

Copy the whole file into https://jsonlint.com and click **Validate JSON**. If it says "Valid JSON", you're safe.
If the site shows *"This part of the page could not be loaded"*, the message names the file with the typo.

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

**Poem** (`data/poems.json`). Only Nihira's own poems or recitations; never song lyrics.
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

- `.github/workflows/youtube-sync.yml` runs daily: it updates `data/youtube-latest.json` (home page "Latest videos") and, where a video has no title, adds the YouTube title as `youtubeTitle`. Your own `title` fields are never changed. It only saves when something changed.

## 6. Privacy notes

- No cookies, no analytics, no forms.
- YouTube videos only load after a visitor clicks play, from `youtube-nocookie.com`. Video thumbnails load from YouTube's image server (no cookies) until images are copied locally in Milestone 2.
- Fonts currently load from Google Fonts. Self-hosting them (recommended in Germany) is planned for Milestone 2.

More background and open questions: `docs/ROADMAP.md`.
