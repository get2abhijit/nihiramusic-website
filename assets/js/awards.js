// Awards grouped by year. An award can carry a short text, photos and extra links ("featured" = shown large).
import { loadJSON, h, md, link, pageHead, emptyState, fmtDate, img } from './core.js';

const STATUS = { won: 'Won', winner: 'Won', nominated: 'Nominated', nominee: 'Nominated', finalist: 'Finalist' };
export const statusLabel = (s) => STATUS[String(s || '').toLowerCase()] || s || '';

/** Photos of an award: [{src, alt}] or plain image paths. */
function gallery(a) {
  const list = (Array.isArray(a.images) ? a.images : []).map((p) => (typeof p === 'string' ? { src: p } : p)).filter((p) => p && p.src);
  if (!list.length) return null;
  return h('ul', { class: 'award__gallery', role: 'list' }, list.map((p) =>
    h('li', {}, img(p.src, { alt: p.alt || '', sizes: '(min-width: 56rem) 22rem, 90vw' }))));
}

export function awardItem(a, { headingLevel = 3, full = true } = {}) {
  const st = statusLabel(a.status);
  const more = (Array.isArray(a.links) ? a.links : []).filter((l) => l && l.url);
  const featured = full && a.featured;
  return h('li', { class: `award${featured ? ' award--featured' : ''}`, id: a.id || null },
    h('p', { class: `badge badge--${st.toLowerCase()}`, text: st }),
    h(`h${headingLevel}`, { class: 'award__name' }, a.award || ''),
    a.category ? h('p', { class: 'award__cat', text: a.category }) : null,
    a.work ? h('p', { class: 'award__work' }, 'For ', h('cite', { text: a.work })) : null,
    a.organisation ? h('p', { class: 'award__org', text: a.organisation }) : null,
    full && a.date ? h('p', { class: 'award__date' }, h('time', { datetime: a.date }, fmtDate(a.date))) : null,
    full && a.description ? h('div', { class: 'award__desc prose' }, md(String(a.description).replace(/\n+/g, '\n\n'))) : null,
    full ? gallery(a) : null,
    !full || a.images?.length ? null : (a.image ? img(a.image, { alt: a.imageAlt || '', cls: 'award__img', sizes: '10rem' }) : null),
    (a.link || (full && more.length)) ? h('p', { class: 'award__links' },
      a.link ? link(a.link, 'Source', { class: full && more.length ? 'pill' : null }) : null,
      full ? more.map((l) => link(l.url, l.label || 'More', { class: 'pill' })) : null) : null);
}

export default async function ({ app }) {
  const data = await loadJSON('awards');
  app.append(pageHead(data.pageTitle, data.intro));
  const wrap = h('div', { class: 'wrap section section--tight' });
  app.append(wrap);
  const items = Array.isArray(data.items) ? data.items : [];
  if (!items.length) { wrap.append(emptyState(data.emptyText || 'Coming soon.')); return; }
  const groups = new Map();
  for (const a of items) {
    const y = a.year ? String(a.year) : '';
    if (!groups.has(y)) groups.set(y, []);
    groups.get(y).push(a);
  }
  const keys = [...groups.keys()].sort((a, b) => (b || '0').localeCompare(a || '0'));
  wrap.append(h('div', { class: 'timeline' }, keys.map((y) => h('section', { class: 'timeline__year', 'aria-labelledby': `y-${y || 'tbc'}` },
    h('h2', { class: 'timeline__label', id: `y-${y || 'tbc'}`, text: y || 'Year to be confirmed' }),
    h('ul', { class: 'awards' }, groups.get(y).sort((a, b) => !!b.featured - !!a.featured).map((a) => awardItem(a)))))));
  const target = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (target) target.scrollIntoView();
}
