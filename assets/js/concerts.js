// Concerts: past shows with videos.
import { loadJSON, h, md, link, pageHead, emptyState, newestFirst, fmtDate, yearOf, videoFacade, img, ytTitle } from './core.js';

export function videoCard(videoId, title, { thumbnail, date } = {}) {
  return h('li', { class: 'video' }, videoFacade(videoId, title, { thumbnail }),
    h('div', { class: 'video__text' },
      h('p', { class: 'video__title', text: title }),
      date ? h('p', { class: 'video__date' }, h('time', { datetime: date }, fmtDate(date))) : null));
}

export default async function ({ app }) {
  const data = await loadJSON('concerts');
  if (data.bannerImage) {
    app.append(h('figure', { class: 'banner' }, img(data.bannerImage, { alt: data.bannerImageAlt || '', priority: true })));
  }
  app.append(pageHead(data.pageTitle, data.intro));
  const items = newestFirst(Array.isArray(data.items) ? data.items : [], { pinFeatured: false });
  const wrap = h('div', { class: 'wrap section section--tight concerts' });
  app.append(wrap);
  if (!items.length) { wrap.append(emptyState(data.emptyText || 'Coming soon.')); return; }

  // Filters: show, year and city (a filter with fewer than two choices is not shown).
  const yearsOf = (c) => yearOf(c);
  const state = { show: 'all', year: 'all', city: 'all' };
  const status = h('p', { class: 'visually-hidden', role: 'status' });
  const filters = h('div', { class: 'filters concerts__filters' });
  const reset = h('button', { type: 'button', class: 'pill', hidden: true, text: 'Show everything' });
  const field = (key, label, options) => {
    const sel = h('select', { id: `concert-filter-${key}` },
      h('option', { value: 'all', text: options.all }), options.list.map(([v, t]) => h('option', { value: v, text: t })));
    sel.addEventListener('change', () => { state[key] = sel.value; draw(); });
    const box = h('div', { class: 'year-filter' }, h('label', { for: sel.id, text: label }), sel);
    box.hidden = options.list.length < 2;
    return { box, sel };
  };
  const years = [...new Set(items.map(yearsOf).filter(Boolean))].sort().reverse();
  const cities = [...new Set(items.map((c) => c.city).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const fShow = field('show', 'Show', { all: 'All shows', list: items.filter((c) => c.id).map((c) => [c.id, c.title]) });
  const fYear = field('year', 'Year', { all: 'All years',
    list: [...years.map((y) => [y, y]), ...(years.length && items.some((c) => !yearsOf(c)) ? [['undated', 'Year not listed']] : [])] });
  const fCity = field('city', 'City', { all: 'All cities', list: cities.map((c) => [c, c]) });
  filters.append(h('div', { class: 'concerts__selects' }, fShow.box, fYear.box, fCity.box), reset);
  reset.addEventListener('click', () => {
    Object.assign(state, { show: 'all', year: 'all', city: 'all' });
    [fShow, fYear, fCity].forEach((f) => { f.sel.value = 'all'; });
    draw();
  });
  const body = h('div', { class: 'concerts__list' });
  const empty = emptyState('No performance matches these filters.');
  empty.hidden = true;
  wrap.append(filters, status, body, empty);

  const blocks = items.map((c) => {
    const when = c.date ? fmtDate(c.date) : yearOf(c);
    const where = [c.venue, c.city, c.country].filter(Boolean).join(', ');
    const videos = (c.videos || []).filter((v) => v && v.videoId);
    const el = h('section', { class: 'concert', id: c.id || null, 'aria-labelledby': c.id ? `${c.id}-title` : null },
      h('header', { class: 'concert__head' },
        h('h2', { class: 'concert__title', id: c.id ? `${c.id}-title` : null, text: c.title }),
        c.subtitle ? h('p', { class: 'concert__sub', text: c.subtitle }) : null,
        (when || where) ? h('p', { class: 'concert__meta' },
          when ? h('span', {}, c.date ? h('time', { datetime: c.date }, when) : when) : null,
          when && where ? ', ' : null,
          where ? h('span', { text: where }) : null) : null,
        c.playlistUrl ? h('p', { class: 'concert__actions' }, link(c.playlistUrl, 'Full playlist on YouTube', { class: 'pill' })) : null),
      c.description ? h('div', { class: 'prose', style: 'margin-bottom:1.75rem' }, md(c.description)) : null,
      c.image ? img(c.image, { alt: c.imageAlt || '', cls: 'concert__img' }) : null,
      Array.isArray(c.photos) && c.photos.length ? h('ul', { class: 'photos' }, c.photos.map((p) =>
        h('li', {}, img(p.src || p, { alt: p.alt || '', sizes: '(min-width: 40rem) 25vw, 50vw' })))) : null,
      videos.length ? h('ul', { class: 'videos' }, videos.map((v, i) =>
        videoCard(v.videoId, v.title || v.youtubeTitle || ytTitle(v.videoId) || `${c.title}, video ${i + 1}`, { thumbnail: v.thumbnail }))) : null);
    return { c, el };
  });
  body.append(...blocks.map((b) => b.el));

  function draw() {
    let shown = 0;
    for (const { c, el } of blocks) {
      const y = yearsOf(c);
      const ok = (state.show === 'all' || c.id === state.show)
        && (state.year === 'all' || (state.year === 'undated' ? !y : y === state.year))
        && (state.city === 'all' || c.city === state.city);
      el.hidden = !ok;
      if (ok) shown += 1;
    }
    empty.hidden = shown > 0;
    reset.hidden = state.show === 'all' && state.year === 'all' && state.city === 'all';
    status.textContent = `${shown} ${shown === 1 ? 'performance' : 'performances'} shown`;
  }
  // A link to one show (concerts/#jjws) still opens it: it only scrolls, nothing is filtered away.
  draw();
  if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
}
