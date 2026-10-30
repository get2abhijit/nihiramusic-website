# Roadmap: nihiramusic.in

## Status

| Milestone | Status | Date |
|---|---|---|
| M1 Research + complete working site | Done | 2026-10-29 |
| M2 Refresh, localise images, polish | Done | 2026-10-30 |
| M3 SEO, structured data, feeds, performance | Done | 2026-10-30 |
| M4 Editing without touching JSON (validation, Pages CMS) | **Next** | |
| M5 Domain cutover (CNAME, DNS) | Planned | |
| M6 Ongoing improvements (backlog) | Planned | |

Roadmap deviation (M3): owner asked for a linked Google/Outlook calendar. Done in M3 (`tools/sync_calendar.py`,
Calendar sync workflow, subscribable `events/calendar.ics`). M4 must add `data/events-calendar.json` to the
validator (auto-generated file: validate shape only) and keep it out of the Pages CMS forms.

## Owner confirmations
- M2: Clef Music Awards 2023, both wins (Best Artist Hindustani Classical, Album of the Year). State award: Maharashtra State, 2022, nomination for "Whats Up Lagna". Legal entity NihiraMusic Entertainment LLP; legal person Nihira Deshpande; screen name Nihira Joshi. Site title "The Sound of (Nihira)Music".
- M3: London show 2023-04-22 at The Bhavan confirmed. Nirmohiya award wording "Independent Music Awards, USA". Rule 34 concert venue: Rule34, Goregaon, Mumbai. Structured data names: site "The Sound of (Nihira)Music", artist "Nihira Joshi" (alternateName "Nihira Joshi-Deshpande").

## Open content gaps
- **Rule 34 concert date**: not found on the web. Owner says it is in the YouTube video descriptions; add `"date"` in concerts.json. From M3 the YouTube sync also stores each video's upload date in `youtube-latest.json` → `dates` as a hint.
- **Poetic Treasures**: old page has only headings; poems.json empty (empty state shown).
- **Video titles**: 6 covers (GGOWse2CYOI, L2wyFD153B0, 3Yd4ipT-VBs, aR5HjBafe1U, TsWZZBjAEnc, 4dCfQbMUeGM), 5 London videos, Zc9Lqpgp4HU. YouTube titles are shown automatically; add own `title`s where wanted.
- **Na Chedo Hamein**: release year still unknown (web search found no date).
- **Harrow Arts "A tribute to the Mangeshkar sisters"**: date still to be confirmed by owner; not listed.
- **Bio vs. 2025 interview**: the Home bio (verbatim from the old site) says "Based in Germany"; Planet Bollywood (2025-07-18) quotes Nihira saying she is back in India. Bio also says "American Independent Award Nomination" while the Awards page now says "Independent Music Awards, USA". Text unchanged; owner to decide.
- **Nirmohiya / Na Chedo Hamein**: artist.link uses other YouTube videos (rofugU8NIEg, hZ080Z1WN2Y) than the old site; old site's kept.
- **Trishna Bandhan Ki**: links added from song.link (YouTube, Deezer, smart link); song.link lists no Spotify link.
- Not readable automatically: Instagram, Facebook, X, YouTube pages (fine inside GitHub Actions).
- Unverified, not added: Apple Music lists "Mazi Tuzi Kavita" under Nihira Joshi-Deshpande.
- Found in M3, not added (owner may want them): Planet Bollywood interviews about "Aaye Abhi Toh" (https://planetbollywood.com/wp/?p=26667) and "Jag Jaage" (https://planetbollywood.com/wp/?p=25194).

## Assumptions
1. Contact email contact@nihiramusic.in (privacy text also mentions nihiramusic@gmail.com).
2. Accent colour chosen by hand (logo not machine-readable here); override via site.json `theme`.
3. NMACC show (2025-03-09): end time 21:00 derived from the listed 1 h 30 min; venue name "The Cube, Nita Mukesh Ambani Cultural Centre" inferred from nmacc.com.
4. Structured data uses MusicGroup (the artist, for Google's music features) with a Person as member; only *won* awards go into `award`.

## Legal points flagged (text unchanged, verbatim)
- Imprint cites § 5 TMG (now § 5 DDG) and § 10 Abs. 3 MDStV (now § 18 Abs. 2 MStV); Mumbai address while bio says Germany-based.
- Privacy policy names "Nihira Joshi-Deshpande" as owner; confirmed entity is NihiraMusic Entertainment LLP. Mentions newsletter, forms, payments, cookies that don't exist; doesn't mention GitHub Pages hosting, click-to-load YouTube, or the calendar subscribe links.
- Terms: template wording ("Do not continue to use Nihira Joshi-Deshpande"), comments and cookies sections.
- Recommendation: legal review before M5.

## Known issues / technical notes
- **Workflow chain (M3)**: Deploy site runs on push, after "YouTube sync" and after "Calendar sync", and regenerates SEO files before uploading. "SEO files" commits the same output to the repo (its commit does not trigger a deploy, by GitHub design; not needed). All writing workflows share the concurrency group `repo-writes` and `git pull --rebase` before pushing. To verify on the live site: Actions tab shows green runs for all four after a data edit.
- **404 on the github.io subpath**: 404.html sets `<base>` dynamically for `*.github.io/<repo>/`. Still to verify live: open `<site>/does-not-exist/` and check that styles, menu and links work.
- Canonical links, sitemap, feed and og:image use `siteUrl` = https://nihiramusic.in/ even on the github.io test site (intended: the test site is not indexed as a duplicate). Share previews from github.io show the old site's image until localisation + M5.
- After `localize_assets.py`, og:image becomes `https://nihiramusic.in/assets/img/...` (build_seo.py makes relative `ogImage` paths absolute; sitemap/feed use the same siteUrl). It resolves only after the M5 cutover.
- robots.txt only takes effect at a domain root (after M5); on github.io it is ignored.
- Calendar sync: recurring events (RRULE) appear once (first date); Outlook Windows time-zone names mapped for common zones only.
- Calendar feed `events/calendar.ics` uses UTC times (works in every calendar app); Google refreshes subscribed feeds only every few hours.
- Cards use CSS subgrid (all current browsers); older browsers get a simpler stacked card.
- Old URLs had no trailing slash; parity check in M5.

## Manual checks for the owner (M3)
- Lighthouse (Chrome DevTools → Lighthouse, mobile) on Home, Originals, Events: aim for 90+ in Performance, Accessibility, SEO.
- Screen reader pass (VoiceOver on iPhone/Mac or NVDA on Windows): menu, video play buttons, track buttons on Trishna, events calendar grid.
- https://validator.schema.org with the page source of Home, Originals, Events.
- Subscribe to the events feed once from a phone.

## Source URLs
- https://nihiramusic.in/ (+ /original-compositions, /concerts, /covers, /poetic-treasures, /privacy-policy, /terms-and-conditions)
- https://www.youtube.com/@Nihiramusic (channel ID UC46dtN9KIZspJ8__89BeSXw)
- https://www.instagram.com/nihiramusic/, https://www.facebook.com/singernihirajoshi/, https://x.com/get2nihira
- https://open.spotify.com/artist/4cSJs8KQW0qPqIEOyXsWix
- https://artist.link/nihira, https://album.link/trishna, https://song.link/tumi_original, https://song.link/tootechhaate, https://song.link/ishqmanayeinkya, https://song.link/imkswing, https://song.link/nirmohiya, https://song.link/nachedohamein, https://song.link/trishnabandhanki
- https://bhavan.net/bhavan50landing, https://www.lokmattimes.com/business/sonu-nigam-wins-three-awards-for-hanuman-chalisa-song-at-the-clef-music-awards-2023, https://www.musicunplugged.in/news/trade_news_info/2580/0, https://rollingstoneindia.com/?p=117777
- https://livdemy.com/nihirajoshi, https://planetbollywood.com/wp/?p=25695, https://planetbollywood.com/wp/?p=26330, https://planetbollywood.com/wp/?p=23840, https://musicunplugged.in/news/trade_news_info/2705/380, https://asianlite.com/2021/lite-blogs/nihira-composes-fuses-hindi-lyrics-with-authentic-cuban-music, https://milliblog.com/?p=17714, https://www.deezer.com/en/album/373627127, https://harrowarts.com/whats-on/event/nihira-joshi-1
- Added in M3: https://nmacc.com/performing-arts/songversations-with-nihira-joshi-deshpande, https://planetbollywood.com/wp/?p=29584

## M6 backlog candidates
Press-kit / booking page, photo gallery, multilingual switch (EN/MR/HI), newsletter via external service, privacy-friendly analytics (only if asked), accessibility round 2, performance round 2.
