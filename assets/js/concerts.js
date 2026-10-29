// Concerts: past shows with videos.
import { loadJSON, h, md, link, pageHead, emptyState, newestFirst, fmtDate, yearOf, videoFacade, url } from './core.js';

export default async function ({ app }) {
  const data = await loadJSON('concerts');
  if (data.bannerImage) {
    app.append(h('figure', { class: 'banner' }, h('img', { src: url(data.bannerImage), alt: data.bannerImageAlt || '', decoding: 'async', fetchpriority: 'high' })));
  }
  app.append(pageHead(data.pageTitle, data.intro));
  const items = newestFirst(Array.isArray(data.items) ? data.items : [], { pinFeatured: false });
  const wrap = h('div', { class: 'wrap section section--tight concerts' });
  app.append(wrap);
  if (!items.length) { wrap.append(emptyState(data.emptyText || 'Coming soon.')); return; }

  for (const c of items) {
    const when = c.date ? fmtDate(c.date) : yearOf(c);
    const where = [c.venue, c.city, c.country].filter(Boolean).join(', ');
    const videos = (c.videos || []).filter((v) => v && v.videoId);
    wrap.append(h('section', { class: 'concert', id: c.id || null, 'aria-labelledby': c.id ? `${c.id}-title` : null },
      h('header', { class: 'concert__head' },
        h('h2', { class: 'concert__title', id: c.id ? `${c.id}-title` : null, text: c.title }),
        c.subtitle ? h('p', { class: 'concert__sub', text: c.subtitle }) : null,
        (when || where) ? h('p', { class: 'concert__meta' },
          when ? h('span', {}, c.date ? h('time', { datetime: c.date }, when) : when) : null,
          when && where ? h('span', { 'aria-hidden': 'true', class: 'sep', text: ' / ' }) : null,
          where ? h('span', { text: where }) : null) : null,
        c.description ? h('div', { class: 'prose' }, md(c.description)) : null,
        c.playlistUrl ? h('p', {}, link(c.playlistUrl, 'Watch the full playlist on YouTube', { class: 'pill' })) : null),
      c.image ? h('img', { class: 'concert__img', src: url(c.image), alt: c.imageAlt || '', loading: 'lazy' }) : null,
      Array.isArray(c.photos) && c.photos.length ? h('ul', { class: 'photos' }, c.photos.map((p) =>
        h('li', {}, h('img', { src: url(p.src || p), alt: p.alt || '', loading: 'lazy', decoding: 'async' })))) : null,
      videos.length ? h('ul', { class: 'videos' }, videos.map((v, i) => {
        const title = v.title || v.youtubeTitle || `${c.title}, video ${i + 1}`;
        return h('li', { class: 'video' }, videoFacade(v.videoId, title, { thumbnail: v.thumbnail }),
          h('p', { class: 'video__title', text: title }));
      })) : null));
  }
}
