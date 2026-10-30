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
          when && where ? ', ' : null,
          where ? h('span', { text: where }) : null) : null,
        c.playlistUrl ? h('p', { class: 'concert__actions' }, link(c.playlistUrl, 'Full playlist on YouTube', { class: 'pill' })) : null),
      c.description ? h('div', { class: 'prose', style: 'margin-bottom:1.75rem' }, md(c.description)) : null,
      c.image ? img(c.image, { alt: c.imageAlt || '', cls: 'concert__img' }) : null,
      Array.isArray(c.photos) && c.photos.length ? h('ul', { class: 'photos' }, c.photos.map((p) =>
        h('li', {}, img(p.src || p, { alt: p.alt || '', sizes: '(min-width: 40rem) 25vw, 50vw' })))) : null,
      videos.length ? h('ul', { class: 'videos' }, videos.map((v, i) =>
        videoCard(v.videoId, v.title || v.youtubeTitle || ytTitle(v.videoId) || `${c.title}, video ${i + 1}`, { thumbnail: v.thumbnail }))) : null));
  }
}
