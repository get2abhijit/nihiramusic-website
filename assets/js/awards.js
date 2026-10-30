// Awards grouped by year.
import { loadJSON, h, link, pageHead, emptyState, url, img } from './core.js';

const STATUS = { won: 'Won', winner: 'Won', nominated: 'Nominated', nominee: 'Nominated', finalist: 'Finalist' };
export const statusLabel = (s) => STATUS[String(s || '').toLowerCase()] || s || '';

export function awardItem(a, { headingLevel = 3 } = {}) {
  const st = statusLabel(a.status);
  return h('li', { class: 'award', id: a.id || null },
    h('p', { class: `badge badge--${st.toLowerCase()}`, text: st }),
    h(`h${headingLevel}`, { class: 'award__name' }, a.award || ''),
    a.category ? h('p', { class: 'award__cat', text: a.category }) : null,
    a.work ? h('p', { class: 'award__work' }, 'For ', h('cite', { text: a.work })) : null,
    a.organisation ? h('p', { class: 'award__org', text: a.organisation }) : null,
    a.image ? img(a.image, { alt: a.imageAlt || '', cls: 'award__img', sizes: '10rem' }) : null,
    a.link ? h('p', {}, link(a.link, 'Source')) : null);
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
    h('ul', { class: 'awards' }, groups.get(y).map((a) => awardItem(a)))))));
}
