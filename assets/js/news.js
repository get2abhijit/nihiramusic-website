// News: newest first, "Load more" after pageSize items, shareable #anchors.
import { loadJSON, h, md, link, pageHead, emptyState, fmtDate, url, img } from './core.js';

export function newsSorted(data) {
  return (Array.isArray(data.items) ? data.items : []).filter((n) => n && n.title)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

function article(n) {
  const share = h('button', { type: 'button', class: 'linkish share' }, 'Copy link');
  share.addEventListener('click', async () => {
    const href = `${location.href.split('#')[0]}#${n.id}`;
    try { await navigator.clipboard.writeText(href); share.textContent = 'Link copied'; }
    catch { history.replaceState(null, '', `#${n.id}`); share.textContent = 'Link is in the address bar'; }
    setTimeout(() => { share.textContent = 'Copy link'; }, 2500);
  });
  return h('article', { class: 'news-item', id: n.id || null, tabindex: '-1' },
    n.date ? h('p', { class: 'news-item__date' }, h('time', { datetime: n.date }, fmtDate(n.date))) : null,
    h('div', { class: 'news-item__body' },
      h('h2', { class: 'news-item__title' }, n.id ? h('a', { href: `#${n.id}` }, n.title) : n.title),
      n.image ? img(n.image, { alt: n.imageAlt || '', cls: 'news-item__img', sizes: '(min-width: 48rem) 60vw, 100vw' }) : null,
      n.summary ? h('p', { class: 'news-item__summary', text: n.summary }) : null,
      n.body ? h('div', { class: 'prose' }, md(n.body)) : null,
      h('p', { class: 'news-item__actions' },
        n.link ? link(n.link, n.linkLabel || 'Read more') : null, n.id ? share : null)));
}

export default async function ({ app }) {
  const data = await loadJSON('news');
  app.append(pageHead(data.pageTitle, data.intro));
  const wrap = h('div', { class: 'wrap section section--tight' });
  app.append(wrap);
  const items = newsSorted(data);
  if (!items.length) { wrap.append(emptyState(data.emptyText || 'News will be posted here soon.')); return; }
  const size = Number(data.pageSize) > 0 ? Number(data.pageSize) : 10;
  const target = decodeURIComponent(location.hash.slice(1));
  let shown = Math.max(size, items.findIndex((n) => n.id === target) + 1);
  const list = h('div', { class: 'news' });
  const more = h('button', { type: 'button', class: 'btn btn--ghost' }, 'Load more news');
  function draw(focusFrom) {
    list.replaceChildren(...items.slice(0, shown).map(article));
    more.hidden = shown >= items.length;
    if (focusFrom != null) list.children[focusFrom]?.focus();
  }
  more.addEventListener('click', () => { const from = shown; shown += size; draw(from); });
  wrap.append(list, h('p', { class: 'load-more' }, more));
  draw();
  if (target) document.getElementById(target)?.scrollIntoView();
}
