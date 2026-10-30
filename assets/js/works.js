// Originals and Covers: aligned cards, filters, click-to-play.
import { loadJSON, h, md, link, pageHead, emptyState, newestFirst, yearOf, videoFacade, ytWatch, img, ytTitle } from './core.js';

function displayTitle(item) {
  const t = item.title || item.youtubeTitle || ytTitle(item.videoId);
  if (t) return t;
  let c = String(item.category || 'Video').replace(/^more\s+/i, '').replace(/s$/i, '');
  if (!/cover|video/i.test(c)) c += ' cover';
  return c.charAt(0).toUpperCase() + c.slice(1).toLowerCase();
}

/** Descriptions often use one line break per paragraph; give each line its own paragraph unless it is a list. */
const paras = (t) => (/^\s*[-*] /m.test(t) ? t : String(t).replace(/\n+/g, '\n\n'));

function links(item) {
  const out = [];
  if (item.listenUrl) out.push(link(item.listenUrl, 'Listen now', { class: 'pill pill--accent' }));
  if (item.spotifyUrl) out.push(link(item.spotifyUrl, 'Spotify', { class: 'pill' }));
  if (item.videoId) out.push(link(ytWatch(item.videoId), 'YouTube', { class: 'pill' }));
  if (item.soundcloudUrl) out.push(link(item.soundcloudUrl, 'SoundCloud', { class: 'pill' }));
  if (item.deezerUrl) out.push(link(item.deezerUrl, 'Deezer', { class: 'pill' }));
  return out.length ? h('p', { class: 'work__links' }, out) : null;
}

function tracksList(item) {
  if (!Array.isArray(item.tracks) || !item.tracks.length) return null;
  return h('div', { class: 'tracks' }, h('h4', { class: 'tracks__title', text: 'Tracks' }),
    h('ol', { class: 'tracks__list' }, item.tracks.map((t) => h('li', {},
      h('span', { class: 'tracks__name', text: t.title }),
      t.listenUrl ? link(t.listenUrl, 'Listen', { class: 'tracks__link' }) : null,
      t.videoId ? link(ytWatch(t.videoId), 'YouTube', { class: 'tracks__link' }) : null,
      t.spotifyUrl ? link(t.spotifyUrl, 'Spotify', { class: 'tracks__link' }) : null))));
}

export function workCard(item, { compact = false } = {}) {
  const title = displayTitle(item);
  const featured = item.featured && !compact;
  const media = item.videoId
    ? videoFacade(item.videoId, title, { thumbnail: item.thumbnail })
    : item.image ? img(item.image, { alt: item.imageAlt || '', cls: 'work__img', sizes: '(min-width: 62rem) 33vw, 100vw' }) : null;
  const meta = [item.type, yearOf(item), item.category && !item.type ? item.category : null].filter(Boolean).join(', ');
  const head = h('div', { class: 'work__head' },
    h('h3', { class: 'work__title', text: title }),
    meta ? h('p', { class: 'work__meta', text: meta }) : null,
    item.originalArtist ? h('p', { class: 'work__credits', text: `Originally by ${item.originalArtist}` }) : null,
    item.credits ? h('p', { class: 'work__credits', text: item.credits }) : null);
  const foot = h('div', { class: 'work__foot' },
    !compact && item.description ? h('div', { class: 'work__desc prose' }, md(paras(item.description))) : null,
    links(item));

  if (featured) {
    return h('article', { class: 'work work--featured', id: item.id || null },
      h('div', { class: 'work__aside' }, media ? h('div', { class: 'work__media' }, media) : null, tracksList(item)),
      h('div', { class: 'work__text' }, head, foot));
  }
  return h('article', { class: 'work', id: item.id || null },
    h('div', { class: 'work__media' }, media), head, foot);
}

export default async function ({ app, page }) {
  const data = await loadJSON(page === 'covers' ? 'covers' : 'originals');
  app.append(pageHead(data.pageTitle, data.intro));
  const items = newestFirst(Array.isArray(data.items) ? data.items : []);
  const section = h('section', { class: 'wrap section section--tight', 'aria-label': data.pageTitle });
  app.append(section);
  if (!items.length) { section.append(emptyState(data.emptyText || 'Coming soon.')); return; }

  const state = { cat: 'all', year: 'all' };
  const cats = [...new Set(items.map((i) => i.category).filter(Boolean))];
  const years = [...new Set(items.map(yearOf).filter(Boolean))].sort().reverse();
  const hasUndated = items.some((i) => !yearOf(i));
  const grid = h('div', { class: 'works' });
  const status = h('p', { class: 'visually-hidden', role: 'status' });

  function draw() {
    const shown = items.filter((i) => (state.cat === 'all' || i.category === state.cat)
      && (state.year === 'all' || (state.year === 'undated' ? !yearOf(i) : yearOf(i) === state.year)));
    grid.replaceChildren(...shown.map((i) => workCard(i)));
    if (!shown.length) grid.append(emptyState('Nothing matches this filter.'));
    status.textContent = `${shown.length} ${shown.length === 1 ? 'item' : 'items'} shown`;
  }

  const filters = h('div', { class: 'filters' });
  if (cats.length > 1) {
    const btns = ['all', ...cats].map((c) => h('button', { type: 'button', class: 'chip', 'aria-pressed': String(c === 'all'), text: c === 'all' ? 'All' : c }));
    btns.forEach((b, i) => b.addEventListener('click', () => {
      state.cat = i === 0 ? 'all' : cats[i - 1];
      btns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      draw();
    }));
    filters.append(h('div', { class: 'chips', role: 'group', 'aria-label': 'Filter by category' }, btns));
  }
  if (years.length > 1 || (years.length && hasUndated)) {
    const sel = h('select', { id: 'year-filter' },
      h('option', { value: 'all', text: 'All years' }),
      years.map((y) => h('option', { value: y, text: y })),
      hasUndated ? h('option', { value: 'undated', text: 'Year not listed' }) : null);
    sel.addEventListener('change', () => { state.year = sel.value; draw(); });
    filters.append(h('div', { class: 'year-filter' }, h('label', { for: 'year-filter', text: 'Year' }), sel));
  }
  if (filters.childNodes.length) section.append(filters);
  section.append(status, grid);
  draw();
}
