# Changelog

## M4 (2026-10-30): Editing without touching JSON
- New `tools/validate_data.py` + workflow "Check content": checks all data files (JSON syntax with plain-English hints, required fields, YYYY-MM-DD dates, HH:MM times, unique ids, URLs, YouTube codes, local images exist, allowed status values; generated files by shape). "Deploy site" runs it first and never publishes broken data.
- New `.pages.yml` (Pages CMS): forms for News, Events, Awards, Originals (with tracks), Covers, Concerts, Poetic Treasures, Home text; uploads to `assets/img/uploads/`; generated, settings and legal files excluded.
- YouTube sync reads playlists named by `playlistId` (Poetic Treasures). Poetic Treasures shows recitation cards + "Full series on YouTube".
- Content: bio "Based primarily in India" and verified IMA wording; award renamed to 18th Independent Music Awards (The IMAs), Best Adult Contemporary Song; Na Chedo Hamein 2018-06-03; news Jag Jaage and Aaye Abhi Toh; Poetic Thursdays playlist.
- Restored `data/youtube-latest.json` and `data/images.json` (emptied by the M3 upload). README: Editor's guide.

## M3 (2026-10-30): SEO, structured data, feeds, performance
- New `tools/build_seo.py`: sitemap.xml, robots.txt, news/feed.xml (RSS), events/calendar.ics, JSON-LD (MusicGroup + Person + WebSite on Home, MusicEvent on Events, MusicRecording/MusicAlbum on Originals), canonical/og:url/og:image from site.json, static no-JavaScript overview on Home, module + hero-image preloads.
- New workflows: "SEO files" (on data change + daily) and "Calendar sync" (Google/Outlook .ics, every 6 h). "Deploy site" regenerates SEO files before publishing and also runs after "Calendar sync". YouTube sync also stores upload dates.
- Originals: streaming links are now rounded buttons with service icons; album tracks get round icon buttons.
- Events: Google/Outlook calendar entries merged in; "Never miss a concert" subscribe box. News: RSS link.
- Accessibility: buttons and form fields get borders with 3:1 contrast; numbered track list keeps list semantics.
- Content: Trishna Bandhan Ki links; Rule34 venue; London date confirmed; Nirmohiya award wording; past NMACC show (2025-03-09); news item on "Chal Re Mana Jaau" (2025-07-18).

## M2 (2026-10-30): Refresh, localise images, polish
- Title "The Sound of (Nihira)Music" (Nihira's own artist.link title); name "Nihira Joshi"; © NihiraMusic Entertainment LLP.
- Content: confirmed awards (Clef Album of the Year, Maharashtra State Award 2022), release years for six releases, Trishna date/track order/Samarpan Ki video, two cover titles, four news items.
- Design: page heads with soft washes and line motifs per page; aligned video cards; Trishna two-column layout; full-screen accessible mobile menu; hero entrance; About photo frame.
- Fonts self-hosted (assets/fonts), Google Fonts removed.
- Images: tools/localize_assets.py, data/images.json (width/height/srcset), local YouTube thumbnails.
- Automation: YouTube titles go to youtube-latest.json (your files stay untouched); new "Deploy site" workflow.

## M1 (2026-10-29): Research + complete working site
