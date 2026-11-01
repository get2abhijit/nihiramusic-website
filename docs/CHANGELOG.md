# Changelog

## M6a revision (2026-11-01, owner feedback)
- Menu: Home · Playback (Originals, Films, Title tracks) · Music (Hindi, Marathi, Devotional, Ghazals, Unplugged, Poetic Treasures) · Performances · Events · News · Recognition. Events and Performances are separate pages again; addresses unchanged (Music = covers/, Performances = concerts/, Recognition = awards/). Page titles and meta updated.
- Tabs: link tabs (`href`) to other pages (Originals on Playback, Poetic Treasures on Music); empty tabs without a playlist are hidden (Jingles).
- Content: Devotional playlist; Tuch Shwas Moraya under Devotional; LLPIN ACL-3315 in the imprint; Filmfare trophy photo (`assets/img/uploads/filmfare-marathi-2026-trophy.jpg`) on the Recognition page.
- Changed: data/site.json, covers.json, playback.json, concerts.json, awards.json, legal.json, images.json; assets/js/works.js, home.js; assets/css/style.css; covers/, awards/, concerts/ index.html; tools/validate_data.py, build_seo.py; .pages.yml; README; ROADMAP; CHANGELOG.

## M6a (2026-11-01): Legal update, Playback, Covers tabs, Filmfare award (roadmap deviation)
- Legal: `data/legal.json` rewritten for Nihiramusic Entertainment LLP (imprint § 5 DDG / § 18 (2) MStV, privacy policy matching the real site, Terms of Use); old texts in `docs/legal/legal-texts-until-2026-11-01.json`; review `docs/legal/LEGAL-REVIEW-2026-11.md`; page titles/descriptions of privacy-policy/ and terms-and-conditions/; footer labels; © name.
- New page `playback/` (Films / Title tracks / Jingles) + `data/playback.json`; Covers in tabs (Hindi / Marathi / Devotional / Ghazals / Unplugged) with `section` instead of `category`.
- `assets/js/works.js`: tabs with own addresses (#id), YouTube playlists per page/tab merged automatically (dedupe, `hideVideoIds`, `excludeTitlePattern`), own entries can take their video from the playlist by title, featured cards without video, film/language/award badge.
- Menu with sub-menus (`children` in site.json; dropdown on desktop, list on phones): Playback, Covers, Live (Events + Concerts). `notfound.js` forwards sub-menu pages.
- Awards: text, photos, extra links, featured card, ceremony date (`assets/js/awards.js`); Home shows the compact version.
- Content: Filmfare Awards Marathi 2026 (Best Playback Singer (Female), Chal Re Mana Jaau) in Awards, News, Playback; Ishq Manayein Kya? duet with Shaan (Originals + News); two requested originals; Originals playlist; three new covers; title tracks moved from Covers to Playback.
- Tools: `validate_data.py` (playback.json, sections, nav children, new award fields, original title optional with videoId), `build_seo.py` (Playback page in sitemap/noscript), `sync_youtube.py` (keeps playlist videos that drop out of the 15-item feed), `.pages.yml` (Playback form, Covers tabs, Originals playlist fields, award photos/links/text), README.

## M5 (2026-10-31): Domain cutover
- DNS moved by the owner to BigRock (apex → GitHub, www → get2abhijit.github.io, e-mail records unchanged); verified against current GitHub docs and the old zone.
- New: `CNAME` (nihiramusic.in; ignored by GitHub for Actions deployments, kept as record), `.github/workflows/localize-images.yml` ("Localize images", run by hand), `assets/js/notfound.js` (404 forwards wrong-case/.html and listed old addresses), `data/redirects.json` (old-address list, empty), `docs/M5-DOMAIN-CUTOVER.md` (parity table, checklist, rollback), `docs/domain/` (DNS state, Hostinger zone backup, reminders.ics).
- Changed: `.github/workflows/pages.yml` (publishes only website files; also runs after "Localize images"), `tools/build_seo.py` (forwarding pages from redirects.json), `tools/validate_data.py` (checks redirects.json), `assets/js/main.js` (loads notfound.js on the 404 page), `README.md` (Domain and accounts, M5 update steps, 2b via Actions), `docs/ROADMAP.md`, `docs/CHANGELOG.md`.
- Line endings normalised to LF in 6 files that had CRLF in the local copy (no content change).
- siteUrl, canonical, Open Graph, sitemap and feed already pointed at https://nihiramusic.in/ since M1 (unchanged).

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
