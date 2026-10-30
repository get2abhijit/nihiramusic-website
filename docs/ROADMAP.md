# Roadmap: nihiramusic.in

## Status

| Milestone | Status | Date |
|---|---|---|
| M1 Research + complete working site | Done | 2026-10-29 |
| M2 Refresh, localise images, polish | Done | 2026-10-30 |
| M3 SEO, structured data, feeds, performance | **Next** | |
| M4 Editing without touching JSON (validation, Pages CMS) | Planned | |
| M5 Domain cutover (CNAME, DNS) | Planned | |
| M6 Ongoing improvements (backlog) | Planned | |

## Owner confirmations (M2)
- Clef Music Awards 2023: both wins (Best Artist Hindustani Classical, Album of the Year).
- State award: Maharashtra State, 2022, nomination for "Whats Up Lagna".
- Legal entity NihiraMusic Entertainment LLP; legal person Nihira Deshpande; screen name Nihira Joshi.
- Title change requested: now "The Sound of (Nihira)Music" (from artist.link/nihira).

## Open content gaps
- **Poetic Treasures**: still only headings on the old page; poems.json empty (empty state shown).
- **Video titles**: 6 covers (GGOWse2CYOI, L2wyFD153B0, 3Yd4ipT-VBs, aR5HjBafe1U, TsWZZBjAEnc, 4dCfQbMUeGM), 5 London videos and Zc9Lqpgp4HU. The daily sync now shows YouTube titles automatically; add proper `title`s where wanted.
- **Na Chedo Hamein**: release year unknown.
- **Trishna Bandhan Ki**: no YouTube/Spotify link found.
- **Rule 34**: date, venue, city unpublished.
- **Nirmohiya/Na Chedo Hamein**: artist.link uses different YouTube videos (rofugU8NIEg, hZ080Z1WN2Y) than the old site; old site's kept.
- Not readable automatically: Instagram, Facebook, X, YouTube RSS (fine inside GitHub Actions).
- Unverified, not added: Apple Music lists "Mazi Tuzi Kavita" under Nihira Joshi-Deshpande.

## Assumptions to confirm
1. London event 2023-04-22 at The Bhavan (year inferred from "Sat, 22 April").
2. Nirmohiya award wording: site shows "Independent Music Awards" (USA); old site says "American Independent Award".
3. Harrow Arts Centre "A tribute to the Mangeshkar sisters" (Krybaby): no date published; not listed.
4. Contact email contact@nihiramusic.in (privacy text also mentions nihiramusic@gmail.com).
5. Accent colour still chosen by hand (logo image could not be read in the build sandbox); override via site.json `theme`.

## Legal points flagged (text unchanged, verbatim)
- Imprint cites § 5 TMG (now § 5 DDG) and § 10 Abs. 3 MDStV (now § 18 Abs. 2 MStV); Mumbai address while bio says Germany-based.
- Privacy policy names "Nihira Joshi-Deshpande" as owner; confirmed entity is NihiraMusic Entertainment LLP. Mentions newsletter, forms, payments, cookies that don't exist; doesn't mention GitHub Pages hosting or click-to-load YouTube.
- Terms: template wording ("Do not continue to use Nihira Joshi-Deshpande"), comments and cookies sections.
- Recommendation: legal review before M5.

## Known issues / technical notes
- Pages now deploys via **GitHub Actions** (Settings → Pages → Source: GitHub Actions). The "Deploy site" workflow runs after each YouTube sync, which fixes the M1 question whether bot commits republish the site.
- `tools/localize_assets.py` must be run once locally **before cancelling Hostinger**. Until then photos load from zyrosite.com/mzstatic.com.
- After localisation, og:image points to `https://nihiramusic.in/assets/img/...`, which only resolves after the M5 domain cutover. Share previews from the github.io test address will show no image until then.
- 404.html sets its base path dynamically; verify on the live test site (open `<site>/does-not-exist/`).
- Cards use CSS subgrid (all current browsers); older browsers get a simpler stacked card.
- Old URLs had no trailing slash; parity check in M5.

## Source URLs
- https://nihiramusic.in/ (+ /original-compositions, /concerts, /covers, /poetic-treasures, /privacy-policy, /terms-and-conditions)
- https://www.youtube.com/@Nihiramusic (channel ID UC46dtN9KIZspJ8__89BeSXw)
- https://www.instagram.com/nihiramusic/, https://www.facebook.com/singernihirajoshi/, https://x.com/get2nihira
- https://open.spotify.com/artist/4cSJs8KQW0qPqIEOyXsWix
- https://artist.link/nihira, https://album.link/trishna, https://song.link/tumi_original, https://song.link/tootechhaate, https://song.link/ishqmanayeinkya, https://song.link/imkswing, https://song.link/nirmohiya, https://song.link/nachedohamein
- https://bhavan.net/bhavan50landing, https://www.lokmattimes.com/business/sonu-nigam-wins-three-awards-for-hanuman-chalisa-song-at-the-clef-music-awards-2023, https://www.musicunplugged.in/news/trade_news_info/2580/0, https://rollingstoneindia.com/?p=117777
- Added in M2: https://livdemy.com/nihirajoshi, https://planetbollywood.com/wp/?p=25695, https://planetbollywood.com/wp/?p=26330, https://planetbollywood.com/wp/?p=23840, https://musicunplugged.in/news/trade_news_info/2705/380, https://asianlite.com/2021/lite-blogs/nihira-composes-fuses-hindi-lyrics-with-authentic-cuban-music, https://milliblog.com/?p=17714, https://www.deezer.com/en/album/373627127, https://harrowarts.com/whats-on/event/nihira-joshi-1

## M6 backlog candidates
Press-kit / booking page, photo gallery, multilingual switch (EN/MR/HI), newsletter via external service, privacy-friendly analytics (only if asked), accessibility round 2, performance round 2.
