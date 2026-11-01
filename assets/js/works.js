// Originals, Playback and Covers: aligned cards, section tabs, year filter, click-to-play.
// Entries come from data/<page>.json "items" and, automatically, from the YouTube playlists named by
// "playlistId" (for the whole page or per section). The daily YouTube sync copies those playlists into
// data/youtube-latest.json, so new videos appear here without editing anything.
import { loadJSON, h, md, link, url, pageHead, emptyState, yearOf, videoFacade, ytWatch, img, ytTitle, icon } from './core.js';

const DATA_FILE = { originals: 'originals', covers: 'covers', playback: 'playback' };
const playlistUrl = (id) => `https://www.youtube.com/playlist?list=${encodeURIComponent(id)}`;

/** Lower-case, no accents, no punctuation: for matching "Chal Re Mana Jaau" against a YouTube title. */
const norm = (s) => String(s || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/** "Song | Nihira Joshi | Composer" -> "Song" (only for videos added automatically from a playlist). */
function cleanTitle(t) {
  const first = String(t || '').split(/\s*(?:\|\||\||｜)\s*/).find((p) => p.trim());
  return first && first.trim().length > 2 ? first.trim() : String(t || '').trim();
}

function displayTitle(item) {
  const t = item.title || ytTitle(item.videoId);
  if (t) return t;
  let c = String(item.category || 'Video').replace(/^more\s+/i, '').replace(/s$/i, '');
  if (!/cover|video/i.test(c)) c += ' cover';
  return c.charAt(0).toUpperCase() + c.slice(1).toLowerCase();
}

/** Descriptions often use one line break per paragraph; give each line its own paragraph unless it is a list. */
const paras = (t) => (/^\s*[-*] /m.test(t) ? t : String(t).replace(/\n+/g, '\n\n'));

/** Streaming links as rounded buttons with icons. "Listen now" (all services) is the filled main button. */
const SERVICES = [
  ['listenUrl', 'Listen now', 'listen'],
  ['spotifyUrl', 'Spotify', 'spotify'],
  ['videoId', 'YouTube', 'youtube'],
  ['soundcloudUrl', 'SoundCloud', 'soundcloud'],
  ['deezerUrl', 'Deezer', 'deezer'],
];
const hrefOf = (item, key) => (key === 'videoId' ? ytWatch(item.videoId) : item[key]);

function links(item) {
  const out = SERVICES.filter(([k]) => item[k]).map(([k, label, ic]) =>
    link(hrefOf(item, k), [icon(ic), h('span', { text: label })], { class: `listen-btn${k === 'listenUrl' ? ' listen-btn--main' : ''}` }));
  return out.length ? h('p', { class: 'work__links' }, out) : null;
}

/** Album tracks: each service as a small round icon button with a full text label for screen readers. */
function tracksList(item) {
  if (!Array.isArray(item.tracks) || !item.tracks.length) return null;
  return h('div', { class: 'tracks' }, h('h4', { class: 'tracks__title', text: 'Tracks' }),
    h('ol', { class: 'tracks__list', role: 'list' }, item.tracks.map((t) => {
      const btns = SERVICES.filter(([k]) => t[k]).map(([k, label, ic]) => {
        const name = k === 'listenUrl' ? 'all streaming services' : label;
        return link(hrefOf(t, k), icon(ic), { class: 'track-btn', title: `${t.title}: ${name}`, 'aria-label': `${t.title} on ${name} (opens in a new tab)` });
      });
      return h('li', {}, h('span', { class: 'tracks__name', text: t.title }),
        btns.length ? h('span', { class: 'tracks__links' }, btns) : null);
    })));
}

/** Small award ribbon on a card ("Filmfare Awards Marathi 2026: Best Playback Singer (Female)"). */
function awardBadge(item) {
  if (!item.award) return null;
  const inner = [h('span', { class: 'work__award-mark', 'aria-hidden': 'true', text: '✦' }), h('span', { text: item.award })];
  return h('p', { class: 'work__award' }, item.awardId
    ? h('a', { href: url(`awards/#${encodeURIComponent(item.awardId)}`) }, inner) : inner);
}

export function workCard(item, { compact = false } = {}) {
  const title = displayTitle(item);
  const featured = item.featured && !compact;
  const media = item.videoId
    ? videoFacade(item.videoId, item.fullTitle || title, { thumbnail: item.thumbnail })
    : item.image ? img(item.image, { alt: item.imageAlt || '', cls: 'work__img', sizes: '(min-width: 62rem) 33vw, 100vw' })
      : h('div', { class: 'work__placeholder', 'aria-hidden': 'true' }, icon('listen'));
  const meta = [item.type, item.language, yearOf(item), item.category && !item.type ? item.category : null].filter(Boolean).join(', ');
  const head = h('div', { class: 'work__head' },
    h('h3', { class: 'work__title', text: title }),
    item.film ? h('p', { class: 'work__film' }, 'From the film ', h('cite', { text: item.film })) : null,
    meta ? h('p', { class: 'work__meta', text: meta }) : null,
    item.originalArtist ? h('p', { class: 'work__credits', text: `Originally by ${item.originalArtist}` }) : null,
    item.credits ? h('p', { class: 'work__credits', text: item.credits }) : null,
    awardBadge(item));
  const foot = h('div', { class: 'work__foot' },
    !compact && item.description ? h('div', { class: 'work__desc prose' }, md(paras(item.description))) : null,
    links(item));

  if (featured) {
    return h('article', { class: 'work work--featured', id: item.id || null },
      h('div', { class: 'work__aside' }, h('div', { class: 'work__media' }, media), tracksList(item)),
      h('div', { class: 'work__text' }, head, foot));
  }
  return h('article', { class: 'work', id: item.id || null },
    h('div', { class: 'work__media' }, media), head, foot);
}

/* ---------- Data: own entries + playlists ---------- */
function regexFrom(src) {
  if (!src) return null;
  try { return new RegExp(src, 'i'); } catch { console.warn(`Ignoring invalid excludeTitlePattern: ${src}`); return null; }
}

/** Which section an entry belongs to: its "section" id, else the old "category" text, else ''. */
function sectionOf(item, sections) {
  if (item.section && sections.some((s) => s.id === item.section)) return item.section;
  const c = norm(item.category);
  if (c) {
    const hit = sections.find((s) => s.id && (c.includes(norm(s.label)) || c.includes(norm(s.id))));
    if (hit) return hit.id;
  }
  return '';
}

const sortKey = (i) => i.date || (i.year ? `${i.year}-00-00` : '') || i._sortDate || '';
function newestFirst(list) {
  return list.map((x, i) => [x, i]).sort((a, b) => {
    if (!!b[0].featured !== !!a[0].featured) return b[0].featured ? 1 : -1;
    return sortKey(b[0]).localeCompare(sortKey(a[0])) || a[1] - b[1];
  }).map((x) => x[0]);
}

/**
 * Builds [{ id, label, intro, playlistId, emptyText, items }] for the page.
 * Pages without "sections" get one unnamed section (Originals).
 */
export function collect(data, yt) {
  const playlists = (yt && yt.playlists) || {};
  const dates = (yt && yt.dates) || {};
  const defs = Array.isArray(data.sections) && data.sections.length
    ? data.sections.filter((s) => s && s.id && !s.href).map((s) => ({ ...s }))
    : [{ id: '', label: '', playlistId: data.playlistId }];

  const own = (Array.isArray(data.items) ? data.items : []).filter((i) => i && typeof i === 'object' && !i.hidden)
    .map((i) => ({ ...i, _sortDate: i.videoId ? dates[i.videoId] : '' }));
  const hide = new Set([...(data.hideVideoIds || []), ...defs.flatMap((s) => s.hideVideoIds || [])]);
  const exclude = regexFrom(data.excludeTitlePattern);
  const seen = new Set();
  own.forEach((i) => { if (i.videoId) seen.add(i.videoId); (i.tracks || []).forEach((t) => t && t.videoId && seen.add(t.videoId)); });

  const sections = defs.map((s) => ({ ...s, items: [] }));
  const bySection = new Map(sections.map((s) => [s.id, s]));
  let other = null;
  for (const item of own) {
    const sid = defs.length === 1 && !defs[0].id ? '' : sectionOf(item, defs);
    let target = bySection.get(sid);
    if (!target) {
      if (!other) other = { id: 'more', label: data.otherLabel || 'More', items: [] };
      target = other;
    }
    target.items.push(item);
  }
  if (other) sections.push(other);

  for (const s of sections) {
    const list = (playlists[s.playlistId] || []).filter((v) => v && v.videoId && !hide.has(v.videoId)
      && !seen.has(v.videoId) && !(exclude && exclude.test(v.title || '')));
    // Own entries without a video take the matching playlist video ("matchTitle" or the title).
    for (const item of s.items) {
      if (item.videoId) continue;
      const keys = [].concat(item.matchTitle || item.title || []).map(norm).filter(Boolean);
      const i = list.findIndex((v) => keys.some((k) => norm(v.title).includes(k)));
      if (i < 0) continue;
      const [v] = list.splice(i, 1);
      Object.assign(item, { videoId: v.videoId, thumbnail: v.localThumbnail, _sortDate: v.published });
    }
    for (const v of list) {
      if (seen.has(v.videoId)) continue;
      seen.add(v.videoId);
      s.items.push({ id: `video-${v.videoId}`.toLowerCase(), title: cleanTitle(v.title), fullTitle: v.title,
        videoId: v.videoId, thumbnail: v.localThumbnail, _sortDate: v.published || dates[v.videoId] || '', _auto: true });
    }
    s.items = newestFirst(s.items);
  }
  return sections;
}

/* ---------- Page ---------- */
export default async function ({ app, page }) {
  const data = await loadJSON(DATA_FILE[page] || 'originals');
  const yt = await loadJSON('youtube-latest').catch(() => ({}));
  app.append(pageHead(data.pageTitle, data.intro));
  const section = h('section', { class: 'wrap section section--tight', 'aria-label': data.pageTitle });
  app.append(section);

  const sections = collect(data, yt);
  // Tabs: sections with videos or a playlist (empty ones without a playlist stay hidden, e.g. Jingles),
  // plus link tabs ("href") that open another page (Originals, Poetic Treasures).
  const named = sections.filter((s) => s.id && (s.items.length || s.playlistId));
  const linkTabs = (Array.isArray(data.sections) ? data.sections : []).filter((s) => s && s.href && s.label);
  const total = sections.reduce((n, s) => n + s.items.length, 0);
  if (!total && named.length < 2) {
    const pid = sections[0] && sections[0].playlistId;
    section.append(emptyState(data.emptyText || 'Coming soon.', pid ? link(playlistUrl(pid), 'Watch on YouTube', { class: 'btn' }) : null));
    return;
  }

  const state = { view: 'all', year: 'all' };
  const status = h('p', { class: 'visually-hidden', role: 'status' });
  const body = h('div', { class: 'works-body' });

  // Section tabs (links, so every section has its own address: covers/#hindi).
  let tabs = null;
  if (named.length + linkTabs.length > 1) {
    const tab = (id, label, count) => h('a', { href: id ? `#${id}` : '#all', class: 'subnav__link', 'data-view': id || 'all' },
      h('span', { text: label }), count != null ? h('span', { class: 'subnav__count', 'aria-label': `(${count})`, text: count }) : null);
    tabs = h('nav', { class: 'subnav', 'aria-label': `${data.pageTitle}: sections` },
      h('ul', { class: 'subnav__list', role: 'list' },
        h('li', {}, tab('', data.allLabel || 'All', total)),
        (data.sections || []).filter((d) => d && (d.href ? d.label : named.some((s) => s.id === d.id))).map((d) => {
          if (d.href) return h('li', {}, h('a', { href: url(d.href), class: 'subnav__link subnav__link--page' }, h('span', { text: d.label }), h('span', { class: 'subnav__arrow', 'aria-hidden': 'true', text: '→' })));
          const sec = named.find((s) => s.id === d.id);
          return h('li', {}, tab(sec.id, sec.label || sec.id, sec.items.length));
        }),
        named.filter((s) => !(data.sections || []).some((d) => d && d.id === s.id)).map((s) => h('li', {}, tab(s.id, s.label || s.id, s.items.length)))));
  }

  const yearSel = h('select', { id: 'year-filter' });
  const yearBox = h('div', { class: 'year-filter' }, h('label', { for: 'year-filter', text: 'Year' }), yearSel);
  yearSel.addEventListener('change', () => { state.year = yearSel.value; draw(); });

  function fillYears(items) {
    const years = [...new Set(items.map(yearOf).filter(Boolean))].sort().reverse();
    const undated = items.some((i) => !yearOf(i));
    if (!years.includes(state.year) && !(state.year === 'undated' && undated)) state.year = 'all';
    yearSel.replaceChildren(h('option', { value: 'all', text: 'All years' }),
      years.map((y) => h('option', { value: y, text: y })),
      undated && years.length ? h('option', { value: 'undated', text: 'Year not listed' }) : null);
    yearSel.value = state.year;
    yearBox.hidden = !(years.length > 1 || (years.length && undated));
  }
  const byYear = (i) => state.year === 'all' || (state.year === 'undated' ? !yearOf(i) : yearOf(i) === state.year);

  function sectionBlock(s, single) {
    const shown = s.items.filter(byYear);
    const headId = `h-${s.id || 'list'}`;
    const head = s.id ? h('div', { class: 'section-head works-section__head' },
      h('h2', { id: headId, tabindex: '-1', text: s.label || s.id }),
      s.playlistId ? link(playlistUrl(s.playlistId), 'Playlist on YouTube', { class: 'pill' }) : null) : null;
    const grid = h('div', { class: 'works' }, shown.map((i) => workCard(i)));
    if (!shown.length) grid.append(emptyState(s.items.length ? 'Nothing matches this filter.' : (s.emptyText || 'Coming soon.')));
    return { el: h('section', { class: 'works-section', id: s.id || null, 'aria-labelledby': s.id ? headId : null },
      head, s.intro && single ? h('div', { class: 'works-section__intro prose' }, md(s.intro)) : null, grid), count: shown.length };
  }

  function draw({ focus = false } = {}) {
    const view = named.find((s) => s.id === state.view) ? state.view : 'all';
    const visible = view === 'all' ? sections.filter((s) => s.items.length) : named.filter((s) => s.id === view);
    fillYears(visible.flatMap((s) => s.items));
    let n = 0;
    body.replaceChildren(...visible.map((s) => { const b = sectionBlock(s, view !== 'all' || visible.length === 1); n += b.count; return b.el; }));
    if (!visible.length) body.append(emptyState(data.emptyText || 'Coming soon.'));
    tabs?.querySelectorAll('a[data-view]').forEach((a) => {
      if (a.dataset.view === view) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
    status.textContent = `${n} ${n === 1 ? 'video' : 'videos'} shown`;
    if (focus) {
      const target = view === 'all' ? tabs : body.querySelector('h2');
      target?.focus?.({ preventScroll: true });
      (tabs || body).scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
  }

  const fromHash = () => decodeURIComponent(location.hash.slice(1)) || 'all';
  state.view = fromHash();
  if (tabs) tabs.setAttribute('tabindex', '-1');
  window.addEventListener('hashchange', () => {
    const v = fromHash();
    if (v !== 'all' && !named.some((s) => s.id === v)) return; // an anchor to a single card, not a section
    state.view = v; draw({ focus: true });
  });

  const filters = h('div', { class: 'filters' }, tabs, yearBox);
  section.append(filters, status, body);
  // A link to one card (originals/#trishna): open the section that contains it.
  const card = state.view !== 'all' && !named.some((s) => s.id === state.view)
    ? sections.find((s) => s.items.some((i) => i.id === state.view)) : null;
  if (card) state.view = card.id || 'all';
  draw();
  if (card) document.getElementById(fromHash())?.scrollIntoView();
}
