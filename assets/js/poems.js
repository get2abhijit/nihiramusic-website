// Poetic Treasures: Nihira's own poetry and her recitations, with Devanagari support.
// Recitations come from data/poems.json "items" and, automatically, from the YouTube playlist named by
// "playlistId" (copied daily into data/youtube-latest.json by the YouTube sync).
import { loadJSON, h, link, pageHead, emptyState, newestFirst, fmtDate, videoFacade, ytTitle } from './core.js';
import { workCard } from './works.js';

const playlistUrl = (id) => `https://www.youtube.com/playlist?list=${encodeURIComponent(id)}`;

/** A poem with its text (only Nihira's own poems carry text). */
function poemArticle(p) {
  const lang = p.lang || 'en';
  return h('article', { class: 'poem', id: p.id || null, lang },
    h('h2', { class: 'poem__title', text: p.title || '' }),
    (p.author || p.date) ? h('p', { class: 'poem__meta', lang: 'en' },
      p.author || '', p.author && p.date ? ', ' : '', p.date ? h('time', { datetime: p.date }, fmtDate(p.date)) : '') : null,
    p.videoId ? h('div', { class: 'poem__video' }, videoFacade(p.videoId, `Recitation: ${p.title || ''}`)) : null,
    p.text ? h('div', { class: 'poem__text' }, String(p.text).split(/\n{2,}/).map((st) => h('p', { text: st }))) : null);
}

/** A recitation video as a card (same look as Originals/Covers). */
function recitationCard(r) {
  const card = workCard({
    id: r.id, title: r.title || ytTitle(r.videoId) || 'Recitation', videoId: r.videoId, date: r.date,
    credits: r.author ? `Poem by ${r.author}` : '', description: r.description, thumbnail: r.thumbnail,
  });
  const t = card.querySelector('.work__title');
  if (t && r.lang) t.setAttribute('lang', r.lang);
  return card;
}

export default async function ({ app }) {
  const data = await loadJSON('poems');
  const yt = await loadJSON('youtube-latest').catch(() => ({}));
  app.append(pageHead(data.pageTitle, data.intro, data.subtitle));
  const wrap = h('div', { class: 'wrap section section--tight poems' });
  app.append(wrap);

  const own = Array.isArray(data.items) ? data.items.filter((p) => p && p.title) : [];
  const poems = newestFirst(own.filter((p) => p.text), { pinFeatured: false });
  const recitations = own.filter((p) => !p.text && p.videoId);
  const known = new Set(own.map((p) => p.videoId).filter(Boolean));
  const fromPlaylist = ((yt.playlists || {})[data.playlistId] || [])
    .filter((v) => v && v.videoId && !known.has(v.videoId))
    .map((v) => ({ id: `video-${v.videoId}`.toLowerCase(), videoId: v.videoId, title: v.title, date: v.published,
      thumbnail: v.localThumbnail }));
  const videos = newestFirst([...recitations, ...fromPlaylist], { pinFeatured: false });

  if (!poems.length && !videos.length) {
    wrap.append(emptyState(data.emptyText || 'Coming soon.',
      data.playlistId ? link(playlistUrl(data.playlistId), 'Watch the series on YouTube', { class: 'btn' })
        : data.youtubeUrl ? link(data.youtubeUrl, 'Visit the YouTube channel', { class: 'btn' }) : null));
    return;
  }

  if (videos.length) {
    const heading = data.playlistTitle || 'Recitations';
    wrap.append(h('section', { class: 'recitations', 'aria-labelledby': 'recitations-title' },
      h('div', { class: 'section-head' },
        h('h2', { id: 'recitations-title', text: heading }),
        data.playlistId ? link(playlistUrl(data.playlistId), 'Full series on YouTube', { class: 'pill' }) : null),
      h('div', { class: 'works' }, videos.map(recitationCard))));
  }
  if (poems.length) {
    wrap.append(h('section', { class: 'poems__texts', 'aria-label': 'Poems' }, poems.map(poemArticle)));
  }
}
