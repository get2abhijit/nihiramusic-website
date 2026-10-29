// Poetic Treasures: Nihira's own poetry and recitations, with Devanagari support.
import { loadJSON, h, link, pageHead, emptyState, newestFirst, fmtDate, videoFacade } from './core.js';

export default async function ({ app }) {
  const data = await loadJSON('poems');
  app.append(pageHead(data.pageTitle, data.intro, data.subtitle));
  const wrap = h('div', { class: 'wrap section section--tight poems' });
  app.append(wrap);
  const items = newestFirst(Array.isArray(data.items) ? data.items : [], { pinFeatured: false });
  if (!items.length) {
    wrap.append(emptyState(data.emptyText || 'Coming soon.',
      data.youtubeUrl ? link(data.youtubeUrl, 'Visit the YouTube channel', { class: 'btn' }) : null));
    return;
  }
  for (const p of items) {
    const lang = p.lang || 'en';
    wrap.append(h('article', { class: 'poem', id: p.id || null, lang },
      h('h2', { class: 'poem__title', text: p.title || '' }),
      (p.author || p.date) ? h('p', { class: 'poem__meta', lang: 'en' },
        p.author || '', p.author && p.date ? ', ' : '', p.date ? h('time', { datetime: p.date }, fmtDate(p.date)) : '') : null,
      p.videoId ? h('div', { class: 'poem__video' }, videoFacade(p.videoId, `Recitation: ${p.title || ''}`)) : null,
      p.text ? h('div', { class: 'poem__text' }, String(p.text).split(/\n{2,}/).map((st) => h('p', { text: st }))) : null));
  }
}
