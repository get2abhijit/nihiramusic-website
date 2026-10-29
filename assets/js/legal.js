// Imprint / privacy policy and terms, rendered verbatim from data/legal.json.
import { loadJSON, h, md } from './core.js';

export default async function ({ app, page }) {
  const data = await loadJSON('legal');
  const doc = page === 'terms' ? data.terms : data.privacy;
  if (!doc) throw new Error('data/legal.json is missing the "privacy" or "terms" section.');
  const body = h('div', { class: 'prose legal' });
  for (const b of doc.blocks || []) {
    const lang = b.lang ? { lang: b.lang } : {};
    if (b.type === 'h2' || b.type === 'h3') body.append(h(b.type, { ...lang, id: b.id || null }, md(b.text).textContent));
    else if (b.type === 'ul') body.append(h('ul', lang, (b.items || []).map((i) => h('li', {}, md(i).firstChild?.childNodes ? [...md(i).firstChild.childNodes] : i))));
    else { const p = h('div', lang); p.append(md(b.text)); body.append(...p.childNodes); if (b.lang) body.lastChild?.setAttribute?.('lang', b.lang); }
  }
  app.append(h('header', { class: 'page-head wrap' }, h('h1', { text: doc.title })), h('div', { class: 'wrap section section--tight' }, body));
}
