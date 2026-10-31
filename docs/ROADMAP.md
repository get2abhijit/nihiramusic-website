# Roadmap: nihiramusic.in

## Status

| Milestone | Status | Date |
|---|---|---|
| M1 Research + complete working site | Done | 2026-10-29 |
| M2 Refresh, localise images, polish | Done | 2026-10-30 |
| M3 SEO, structured data, feeds, performance | Done | 2026-10-30 |
| M4 Editing without touching JSON (validation, Pages CMS) | Done | 2026-10-30 |
| M5 Domain cutover (CNAME, DNS) | Done (DNS by owner; site side, docs, checklist by M5) | 2026-10-31 |
| M6 Ongoing improvements (backlog) | **Next**: owner picks items | |

Current milestone: M5 finished; post-cutover checklist in `docs/M5-DOMAIN-CUTOVER.md` (section 3) is with the owner.

## Domain and accounts
| What | Where | Status / dates |
|---|---|---|
| Domain nihiramusic.in | BigRock (registrar) | **Expires 2027-02-28, NOT yet renewed.** Reminders: `docs/domain/reminders.ics` (2027-01-28, 2027-02-14). |
| DNS | BigRock, nameservers dns1–dns4.bigrock.in since 2026-10-31 (before: ns1/ns2.dns-parking.com = Hostinger, old zone untouched = rollback path) | Apex 4 × A to GitHub, www CNAME get2abhijit.github.io, no AAAA. Details: `docs/domain/dns-state-2026-10-31.md` |
| E-mail | BigRock / MailHostBox, 2 mailboxes | MX/SPF/DKIM/DMARC unchanged by the move. Hardening = M6 candidate. |
| Website | GitHub repo get2abhijit/nihiramusic-website (branch master), GitHub Pages via Actions, custom domain nihiramusic.in (apex), domain verified in the GitHub account | HTTPS enforcement pending (NotServedByPagesError on 2026-10-31) |
| Old site | Hostinger website builder | Prepaid until **2028-09-27**, auto-renew off (nothing to cancel, never click Renew). Images must be local before then (Actions → Localize images). Reminder 2028-08-27. |
| Search Console | `google-site-verification` TXT exists in the BigRock zone (not in the old Hostinger zone) | Owner to find the existing property, submit sitemap. |

Roadmap deviation (M3): owner asked for a linked Google/Outlook calendar. Done in M3 (`tools/sync_calendar.py`,
Calendar sync workflow, subscribable `events/calendar.ics`). M4 must add `data/events-calendar.json` to the
validator (auto-generated file: validate shape only) and keep it out of the Pages CMS forms.

## Owner confirmations
- M2: Clef Music Awards 2023, both wins (Best Artist Hindustani Classical, Album of the Year). State award: Maharashtra State, 2022, nomination for "Whats Up Lagna". Legal entity NihiraMusic Entertainment LLP; legal person Nihira Deshpande; screen name Nihira Joshi. Site title "The Sound of (Nihira)Music".
- M4: Home bio "Based primarily in India" (was "Based in Germany"); Nirmohiya award = 18th Independent Music Awards (The IMAs), verified: Best Adult Contemporary Song nominee (nominees 2020-04-09, winners announced 2020-04-28); Na Chedo Hamein released 2018-06-03; Poetic Treasures = YouTube playlist "Poetic Thursdays" (PLQ_rmkCpHU8o418EPqbPcQE5V5WsH8Mjj); linked calendar works.
- M3: London show 2023-04-22 at The Bhavan confirmed. Nirmohiya award wording "Independent Music Awards, USA". Rule 34 concert venue: Rule34, Goregaon, Mumbai. Structured data names: site "The Sound of (Nihira)Music", artist "Nihira Joshi" (alternateName "Nihira Joshi-Deshpande").

## Open items after M5 (owner)
- **Renew nihiramusic.in** before 2027-02-28 (not yet confirmed).
- Enforce HTTPS once GitHub's DNS check passes (expected from 2026-11-02; fix steps in `docs/M5-DOMAIN-CUTOVER.md`).
- Run **Actions → Localize images** (hero, About, Concerts banner, logo/share image still on assets.zyrosite.com).
- Search Console: find the existing property, verify, submit `sitemap.xml`.
- Check Wayback Machine (`web.archive.org/web/*/nihiramusic.in/*`) for old addresses not in the parity table; add any to `data/redirects.json`. Not verifiable from the M5 tools.
- Live checks still open from M3/M4: 404 page on the live domain, Lighthouse, screen reader, schema validator, first Pages CMS commit diff.

## Open content gaps
- **Rule 34 concert date**: not found on the web. Owner says it is in the YouTube video descriptions; add `"date"` in concerts.json. From M3 the YouTube sync also stores each video's upload date in `youtube-latest.json` → `dates` as a hint.
- **Poetic Treasures**: playlist "Poetic Thursdays" (12 videos) linked; only one video ID (eT8txGBAZ9I, "पण" by Milind Joshi) was readable here, the rest appear after the YouTube sync. Optional: own titles/notes per video.
- **Video titles** (optional): 6 covers and 5 London videos show their YouTube titles (e.g. "Tumhe Ho Na Ho", "Tujvin Sakhya Re", "Bhaya Ithale sampat nahi"); add own `title`s only where wanted.
- **Harrow Arts "A tribute to the Mangeshkar sisters"**: date still to be confirmed by owner; not listed.
- **Nirmohiya / Na Chedo Hamein**: artist.link uses other YouTube videos (rofugU8NIEg, hZ080Z1WN2Y) than the old site; old site's kept.
- **Trishna Bandhan Ki**: links added from song.link (YouTube, Deezer, smart link); song.link lists no Spotify link.
- Not readable automatically: Instagram, Facebook, X, YouTube pages (fine inside GitHub Actions).
- Unverified, not added: Apple Music lists "Mazi Tuzi Kavita" under Nihira Joshi-Deshpande.
- Added in M4 as news (assumed yes; owner left the question blank): Planet Bollywood interviews "Jag Jaage" (2024-04-01) and "Aaye Abhi Toh" (2024-09-13). Remove in News if not wanted.

## Assumptions
0. M4: Pages CMS saves with `settings.content.merge: true`; private fields (_note, _todo, _sources, _source) are declared in the forms (some hidden) so they survive a save. Owner to verify with the first CMS commit diff.
1. Contact email contact@nihiramusic.in (privacy text also mentions nihiramusic@gmail.com).
2. Accent colour chosen by hand (logo not machine-readable here); override via site.json `theme`.
3. NMACC show (2025-03-09): end time 21:00 derived from the listed 1 h 30 min; venue name "The Cube, Nita Mukesh Ambani Cultural Centre" inferred from nmacc.com.
4. Structured data uses MusicGroup (the artist, for Google's music features) with a Person as member; only *won* awards go into `award`.

## Legal points flagged (text unchanged, verbatim)
- Imprint cites § 5 TMG (now § 5 DDG) and § 10 Abs. 3 MDStV (now § 18 Abs. 2 MStV); Mumbai address while bio says Germany-based.
- Privacy policy names "Nihira Joshi-Deshpande" as owner; confirmed entity is NihiraMusic Entertainment LLP. Mentions newsletter, forms, payments, cookies that don't exist; doesn't mention GitHub Pages hosting, click-to-load YouTube, or the calendar subscribe links.
- Terms: template wording ("Do not continue to use Nihira Joshi-Deshpande"), comments and cookies sections.
- Recommendation: legal review (still open after M5). The texts name `https://www.nihiramusic.in`; that address forwards to `https://nihiramusic.in/`, so the text stays correct as is.

## Known issues / technical notes
- **ZIP uploads overwrite synced files (found in M4)**: the M3 upload replaced `data/youtube-latest.json` and `data/images.json` with empty versions (Home "Latest videos" empty). M4 ships the last synced versions (commit e539e95). After every ZIP upload run YouTube sync + Calendar sync once (README).
- **Content check (M4)**: "Check content" runs on every push touching data/ or assets/img/; "Deploy site" runs the same check first and does not publish on errors. Warnings never block.
- **Pages CMS (M4)**: media go to `assets/img/uploads/` (written into JSON as `assets/img/uploads/...`; a leading `/` would also work). Images uploaded via the CMS have no width/height entry in images.json (fine; run localize_assets.py to add them). The CMS rewrites a whole JSON file on save (formatting may change).
- **Workflow chain (M3)**: Deploy site runs on push, after "YouTube sync" and after "Calendar sync", and regenerates SEO files before uploading. "SEO files" commits the same output to the repo (its commit does not trigger a deploy, by GitHub design; not needed). All writing workflows share the concurrency group `repo-writes` and `git pull --rebase` before pushing. To verify on the live site: Actions tab shows green runs for all four after a data edit.
- **404 on the github.io subpath**: 404.html sets `<base>` dynamically for `*.github.io/<repo>/`. Still to verify live: open `<site>/does-not-exist/` and check that styles, menu and links work.
- Canonical links, sitemap, feed and og:image use `siteUrl` = https://nihiramusic.in/ even on the github.io test site (intended: the test site is not indexed as a duplicate). Share previews from github.io show the old site's image until localisation + M5.
- After `localize_assets.py`, og:image becomes `https://nihiramusic.in/assets/img/...` (build_seo.py makes relative `ogImage` paths absolute; sitemap/feed use the same siteUrl). It resolves only after the M5 cutover.
- robots.txt only takes effect at a domain root (after M5); on github.io it is ignored.
- Calendar sync: recurring events (RRULE) appear once (first date); Outlook Windows time-zone names mapped for common zones only.
- Calendar feed `events/calendar.ics` uses UTC times (works in every calendar app); Google refreshes subscribed feeds only every few hours.
- Cards use CSS subgrid (all current browsers); older browsers get a simpler stacked card.
- Old URLs had no trailing slash; GitHub Pages forwards `/covers` → `/covers/` (parity table in `docs/M5-DOMAIN-CUTOVER.md`). The 404 page forwards wrong-case and `.html` addresses and every entry of `data/redirects.json` (M5); build_seo.py also writes a forwarding page per entry.
- M5: CNAME file added (`nihiramusic.in`). Per current GitHub docs it is ignored for Actions deployments; the domain lives in Settings → Pages.
- M5: Deploy publishes only website files (`_site` without docs/, tools/, README.md, .pages.yml).
- M5: with a custom domain set, the github.io address forwards to nihiramusic.in (no separate test site any more). For a test copy, use a second repository or a local `python3 -m http.server`.
- M5: "slow loading" reported: no HTTPS yet (no HTTP/2), hero image from zyrosite at 1920 px, DNS caches; see `docs/M5-DOMAIN-CUTOVER.md` section 4.

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
- Added in M5: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site, https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https, https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/troubleshooting-custom-domains-and-github-pages, https://en.wikipedia.org/wiki/Nihira_Joshi (links www.nihiramusic.in)
- Added in M4: https://youtube.com/playlist?list=PLQ_rmkCpHU8o418EPqbPcQE5V5WsH8Mjj, https://www.youtube.com/watch?v=eT8txGBAZ9I, https://dailyrindblog.com/?p=60520, https://planetbollywood.com/wp/?p=26667, https://planetbollywood.com/wp/?p=25194, https://pagescms.org/docs/configuration/

## M6 backlog candidates
Proposed first (owner picks): 1. performance round 2 (after HTTPS + local images: measure, then trim requests, fonts, hero), 2. press-kit / booking page, 3. e-mail hardening (SPF/DKIM/DMARC tightening, possible move to another mail provider; deferred from M5 by owner).
Others: photo gallery, multilingual switch (EN/MR/HI), newsletter via external service, privacy-friendly analytics (only if asked), accessibility round 2, legal text update (with legal review).
