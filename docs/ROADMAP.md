# Roadmap: nihiramusic.in

## Status

| Milestone | Status | Date |
|---|---|---|
| M1 Research + complete working site | Done | 2026-10-29 |
| M2 Refresh, localise images, polish | **Next** | |
| M3 SEO, structured data, feeds, performance | Planned | |
| M4 Editing without touching JSON (validation, Pages CMS) | Planned | |
| M5 Domain cutover (CNAME, DNS) | Planned | |
| M6 Ongoing improvements (backlog) | Planned | |

## Open content gaps (from M1 Content Gap Report)

- **Poetic Treasures**: the old page shows only headings; no poems/recitation videos found. `poems.json` is empty (page shows an empty state).
- **Cover titles missing** for 8 videos (nuRMhdy0hV0, GGOWse2CYOI, lYYRVCE-k9Y, L2wyFD153B0, 3Yd4ipT-VBs, aR5HjBafe1U, TsWZZBjAEnc, 4dCfQbMUeGM). The daily sync fills `youtubeTitle`; replace with proper `title` where wanted.
- **Concert videos**: titles unknown for Zc9Lqpgp4HU and all 5 "Live In London - 2023" videos; Rule 34 date/venue/city not published.
- **Release years** unknown for all singles (Tumi, Toote Chhaate, Ishq Manayein Kya?, Swing version, Nirmohiya, Na Chedo Hamein). Trishna = 2022 (press).
- **Trishna**: links for "Trishna Bandhan Ki" and "Trishna Samarpan Ki" missing.
- **Nirmohiya / Na Chedo Hamein**: artist.link uses different YouTube videos (rofugU8NIEg, hZ080Z1WN2Y) from the old site (ZC90JEMIvpw, Z49Tmzx5pzQ). Old site's IDs kept.
- **Not retrievable automatically**: Instagram, Facebook, X, YouTube RSS (robots-blocked for the research tool). Spotify gave only profile metadata.
- **Image**: accent colour chosen by hand (logo/hero could not be loaded in the build sandbox).

## Assumptions to confirm

1. **State Award** for "Whats Up Lagna": year, category and organisation unverified (likely Maharashtra State Film Awards; film 2018). Shown under "Year to be confirmed".
2. **Clef Music Awards 2023 "Album of the Year"** for Trishna: in a run-on paragraph of the press release; not highlighted on Home until confirmed.
3. **Nirmohiya** award: the old site says "American Independent Award"; sources say Independent Music Awards (USA), Adult Contemporary Song, 2020. Site lists it as the latter; the About text keeps the old wording verbatim.
4. **London event 2023-04-22** at The Bhavan: year inferred from "Sat, 22 April". Possibly the same show as "Live In London - 2023".
5. Contact email used: **contact@nihiramusic.in** (imprint). Privacy text also mentions nihiramusic@gmail.com.
6. Cover "Dil-e-Nadaan" (from artist.link, not on old Covers page) placed under "More covers".

## Legal points flagged (not changed; text kept verbatim)

- Imprint cites § 5 TMG (now § 5 DDG) and § 10 Abs. 3 MDStV (obsolete; now § 18 Abs. 2 MStV).
- Imprint address in Mumbai while bio says Germany-based; name "Nihira Deshpande" vs "Nihira Joshi-Deshpande".
- Privacy policy describes newsletter, forms, registration, payments, cookies: none exist on the new site. It does not mention GitHub Pages hosting, YouTube embeds or Google Fonts.
- Terms name "NihiraMusic Entertainment LLP"; mention comments and cookies that don't exist.
- Recommendation: have the imprint and privacy policy reviewed before the domain cutover (M5).

## Known issues / technical notes

- **Google Fonts** load from Google servers (GDPR concern in Germany). M2: self-host the fonts in `assets/fonts/`.
- **YouTube thumbnails** load from i.ytimg.com (no cookies) until M2 localisation; YouTube itself only after a click.
- **Canonical URLs** already point to `https://nihiramusic.in/<page>/` (siteUrl). On the GitHub Pages test address this is intended.
- Commits made by the YouTube sync Action should trigger a Pages rebuild; if the live site doesn't update, re-run Pages deploy or switch Pages to "GitHub Actions" source (M2 check).
- `404.html` sets its base path dynamically so it works at any depth on `*.github.io/<repo>/` and on the custom domain. Verify on the live test site.
- External images still hosted on Hostinger (assets.zyrosite.com) and Apple (mzstatic.com). Run `tools/localize_assets.py` (M2) **before** cancelling Hostinger.
- Old URLs had no trailing slash (`/covers`); new pages live at `/covers/`. GitHub Pages redirects automatically. Parity check is in M5.

## Source URLs

- https://nihiramusic.in/ (+ /original-compositions, /concerts, /covers, /poetic-treasures, /privacy-policy, /terms-and-conditions)
- https://www.youtube.com/@Nihiramusic (channel ID UC46dtN9KIZspJ8__89BeSXw, verified)
- https://www.instagram.com/nihiramusic/ (blocked)
- https://www.facebook.com/singernihirajoshi/ (blocked)
- https://x.com/get2nihira (blocked)
- https://open.spotify.com/artist/4cSJs8KQW0qPqIEOyXsWix
- https://artist.link/nihira
- https://album.link/trishna, https://song.link/tumi_original, https://song.link/tootechhaate, https://song.link/ishqmanayeinkya, https://song.link/imkswing, https://song.link/nirmohiya, https://song.link/nachedohamein
- https://www.lokmattimes.com/business/sonu-nigam-wins-three-awards-for-hanuman-chalisa-song-at-the-clef-music-awards-2023 (Clef 2023)
- https://bhavan.net/bhavan50landing (IMA 2020 nomination, London event)
- https://www.musicunplugged.in/news/trade_news_info/2580/0 (Trishna EP, Dec 2022)
- https://rollingstoneindia.com/?p=117777 (Trishna feature)

## M6 backlog candidates

Press-kit / booking page, photo gallery, multilingual switch (EN/MR/HI), newsletter via external service, privacy-friendly analytics (only if asked), accessibility round 2, performance round 2.
