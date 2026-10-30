// Home: hero, about, releases, videos, recognition, news, events, contact.
import { loadJSON, h, link, url, fmtDate, newestFirst, socialList, img } from './core.js';
import { videoCard } from './concerts.js';
import { workCard } from './works.js';
import { awardItem } from './awards.js';
import { newsSorted } from './news.js';
import { upcomingEvents, eventCard } from './events.js';

const safe = async (name) => { try { return await loadJSON(name); } catch (e) { console.warn(e); return null; } };

function sectionHead(title, moreHref, moreLabel) {
  return h('div', { class: 'section-head' }, h('h2', { text: title }),
    moreHref ? h('a', { class: 'section-head__more', href: url(moreHref) }, moreLabel) : null);
}

export default async function ({ app, site }) {
  const home = await loadJSON('home');
  const [originals, yt, awards, news, events] = await Promise.all(
    ['originals', 'youtube-latest', 'awards', 'news', 'events'].map(safe));
  const S = home.sections || {};
  const on = (k) => S[k] && S[k].show !== false;
  const n = (k, d) => Number(S[k] && S[k].count) || d;

  // Hero
  const hero = home.hero || {};
  app.append(h('section', { class: 'hero', 'aria-labelledby': 'hero-title' },
    hero.image ? img(hero.image, { alt: hero.imageAlt || '', cls: 'hero__img', priority: true }) : null,
    h('div', { class: 'hero__strings', 'aria-hidden': 'true' }, [0, 1, 2, 3].map((i) => h('span', { style: `--i:${i}` }))),
    h('div', { class: 'hero__inner wrap' },
      h('p', { class: 'hero__name', text: site.artistName || site.siteName }),
      h('h1', { class: 'hero__title', id: 'hero-title', text: hero.headline || site.siteName }),
      hero.tagline ? h('p', { class: 'hero__tagline', text: hero.tagline }) : null,
      h('p', { class: 'hero__cta' },
        site.listenUrl ? link(site.listenUrl, site.listenLabel || 'Listen now', { class: 'btn' }) : null,
        site.subscribeUrl ? link(site.subscribeUrl, site.subscribeLabel || 'Subscribe on YouTube', { class: 'btn btn--ghost' }) : null))));

  // About
  const about = home.about || {};
  if (about.paragraphs && about.paragraphs.length) {
    app.append(h('section', { class: 'section about', 'aria-labelledby': 'about-title' },
      h('div', { class: 'wrap about__grid' },
        about.image ? h('figure', { class: 'about__fig' }, img(about.image, { alt: about.imageAlt || '', sizes: '(min-width: 56rem) 40vw, 100vw' })) : null,
        h('div', { class: 'about__text' },
          h('h2', { id: 'about-title', text: about.heading || 'About' }),
          h('div', { class: 'prose' }, about.paragraphs.map((p, i) => h('p', { class: i === 0 ? 'lede' : null, text: p })))))));
  }

  // Latest releases
  const rel = originals && Array.isArray(originals.items) ? newestFirst(originals.items).slice(0, n('releases', 3)) : [];
  if (on('releases') && rel.length) {
    app.append(h('section', { class: 'section section--alt', 'aria-label': S.releases.heading },
      h('div', { class: 'wrap' }, sectionHead(S.releases.heading, 'original-compositions/', 'All originals'),
        h('div', { class: 'works works--three' }, rel.map((r) => workCard({ ...r, featured: false }, { compact: true }))))));
  }

  // Latest videos (filled daily by the GitHub Action)
  const vids = yt && Array.isArray(yt.videos) ? [...yt.videos].sort((a, b) => (b.published || '').localeCompare(a.published || '')).slice(0, n('videos', 6)) : [];
  if (on('videos') && vids.length) {
    const inner = h('div', { class: 'wrap' }, sectionHead(S.videos.heading, null));
    {
      inner.append(h('ul', { class: 'videos' }, vids.map((v) =>
        videoCard(v.videoId, v.title || 'Video', { thumbnail: v.localThumbnail, date: (v.published || '').slice(0, 10) }))));
    }
    inner.append(h('p', { class: 'section-foot' },
      link(site.social?.find((s) => s.icon === 'youtube')?.url || site.subscribeUrl, 'More videos on YouTube', { class: 'pill' })));
    app.append(h('section', { class: 'section', 'aria-label': S.videos.heading }, inner));
  }

  // Recognition
  const aw = awards && Array.isArray(awards.items) ? awards.items.filter((a) => a.highlight)
    .sort((a, b) => String(b.year || 0).localeCompare(String(a.year || 0))).slice(0, n('awards', 3)) : [];
  if (on('awards') && aw.length) {
    app.append(h('section', { class: 'section section--ink', 'aria-label': S.awards.heading },
      h('div', { class: 'wrap' }, sectionHead(S.awards.heading, 'awards/', 'All awards'),
        h('ul', { class: 'awards awards--row' }, aw.map((a) => {
          const li = awardItem(a);
          if (a.year) li.prepend(h('p', { class: 'award__year', text: a.year }));
          return li;
        })))));
  }

  // News
  const nw = news ? newsSorted(news).slice(0, n('news', 3)) : [];
  if (on('news') && nw.length) {
    app.append(h('section', { class: 'section', 'aria-label': S.news.heading },
      h('div', { class: 'wrap' }, sectionHead(S.news.heading, 'news/', 'All news'),
        h('ul', { class: 'news-teasers' }, nw.map((x) => h('li', {},
          x.date ? h('p', { class: 'news-item__date' }, h('time', { datetime: x.date }, fmtDate(x.date))) : null,
          h('h3', {}, h('a', { href: url(`news/#${x.id}`) }, x.title)),
          x.summary ? h('p', { text: x.summary }) : null))))));
  }

  // Upcoming events (hidden when there are none)
  const ev = events ? upcomingEvents(events).slice(0, n('events', 3)) : [];
  if (on('events') && ev.length) {
    app.append(h('section', { class: 'section section--alt', 'aria-label': S.events.heading },
      h('div', { class: 'wrap' }, sectionHead(S.events.heading, 'events/', 'Full calendar'),
        h('div', { class: 'events' }, ev.map((e) => eventCard(e, { site }))))));
  }

  // Contact + socials
  const c = home.contact || {};
  app.append(h('section', { class: 'section contact', 'aria-labelledby': 'contact-title' },
    h('div', { class: 'wrap contact__inner' },
      h('h2', { id: 'contact-title', text: c.heading || 'Contact' }),
      c.text ? h('p', { class: 'contact__text', text: c.text }) : null,
      h('p', { class: 'hero__cta' },
        c.email ? h('a', { class: 'btn', href: `mailto:${c.email}` }, `Email ${c.email}`) : null,
        c.instagram ? link(c.instagram, 'Message on Instagram', { class: 'btn btn--ghost' }) : null),
      socialList(site, 'social social--large'))));
}
