// Shared helpers. No content lives here: everything comes from /data/*.json.

export const ROOT = document.body.dataset.root || './';

/** Turn a site-relative path ("covers/") into a working relative URL. External URLs pass through. */
export function url(path = '') {
  if (/^(https?:|mailto:|tel:|#|data:)/i.test(path)) return path;
  return ROOT + String(path).replace(/^\/+/, '');
}

const cache = new Map();
/** Load data/<name>.json once. Throws an Error that names the file. */
export function loadJSON(name) {
  if (!cache.has(name)) {
    cache.set(name, fetch(url(`data/${name}.json`), { cache: 'no-cache' }).then(async (r) => {
      if (!r.ok) throw new Error(`data/${name}.json could not be loaded (HTTP ${r.status}).`);
      try { return await r.json(); } catch {
        throw new Error(`data/${name}.json contains a typo (invalid JSON). Paste it into jsonlint.com to find the line.`);
      }
    }));
  }
  return cache.get(name);
}

/* ---------- Shared state filled by main.js (both optional) ---------- */
const state = { images: {}, ytTitles: {} };
/** data/images.json (written by tools/localize_assets.py): width, height, srcset of local images. */
export function setImageManifest(m) { state.images = (m && m.images) || {}; }
/** Titles collected by the YouTube sync, used when a title is left empty in the data files. */
export function setVideoTitles(t) { state.ytTitles = t || {}; }
export const ytTitle = (id) => (id && state.ytTitles[id]) || '';

/** <img> with width/height/srcset from the manifest when the image is local. */
export function img(src, { alt = '', cls, sizes = '100vw', loading = 'lazy', priority = false, style } = {}) {
  const key = String(src || '').replace(/^\.?\//, '');
  const meta = state.images[key];
  const props = { src: url(src), alt, class: cls, decoding: 'async', style };
  if (priority) props.fetchpriority = 'high'; else props.loading = loading;
  if (meta) {
    if (meta.width && meta.height) { props.width = meta.width; props.height = meta.height; }
    if (Array.isArray(meta.srcset) && meta.srcset.length > 1) {
      props.srcset = meta.srcset.map((v) => `${url(v.src)} ${v.width}w`).join(', ');
      props.sizes = sizes;
    }
  }
  if (!/^https?:/i.test(src)) return h('img', props);
  return h('img', { ...props, referrerpolicy: 'no-referrer' });
}

/** Tiny DOM builder: h('a', {href, class, text}, child, child…). Text is never parsed as HTML. */
export function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false || kid === '') continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

/** Only allow safe link targets. */
export function safeHref(href) {
  const s = String(href || '').trim();
  if (/^(https?:|mailto:|tel:|#)/i.test(s)) return s;
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return '#';
  return url(s);
}

export function link(href, label, props = {}) {
  const target = safeHref(href);
  const external = /^https?:/i.test(target);
  return h('a', { href: target, ...(external ? { target: '_blank', rel: 'noopener' } : {}), ...props },
    label, external ? h('span', { class: 'visually-hidden', text: ' (opens in a new tab)' }) : null);
}

/* ---------- Dates ---------- */
export function parseDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}
export function fmtDate(s, opts = { day: 'numeric', month: 'long', year: 'numeric' }) {
  const d = parseDate(s);
  return d ? d.toLocaleDateString('en-GB', opts) : '';
}
export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export const yearOf = (i) => String(i.year || (i.date || '').slice(0, 4) || '');
const sortKey = (i) => i.date || (i.year ? `${i.year}-00-00` : '');
/** Newest first; undated items keep their file order at the end. featured=true items first. */
export function newestFirst(list, { pinFeatured = true } = {}) {
  return list.map((x, i) => [x, i]).sort((a, b) => {
    if (pinFeatured && !!b[0].featured !== !!a[0].featured) return b[0].featured ? 1 : -1;
    return sortKey(b[0]).localeCompare(sortKey(a[0])) || a[1] - b[1];
  }).map((x) => x[0]);
}

/* ---------- Text ---------- */
function inline(text) {
  const frag = document.createDocumentFragment();
  const re = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0; let m;
  while ((m = re.exec(text))) {
    frag.append(linkify(text.slice(last, m.index)));
    if (m[1]) frag.append(link(m[2], m[1]));
    else if (m[3]) frag.append(h('strong', {}, m[3]));
    else frag.append(h('em', {}, m[4]));
    last = re.lastIndex;
  }
  frag.append(linkify(text.slice(last)));
  return frag;
}

/** Make plain URLs and e-mail addresses clickable without changing the text. */
export function linkify(text) {
  const frag = document.createDocumentFragment();
  const re = /(https?:\/\/[^\s<]+[^\s<.,;:!?)"”])|([\w.+-]+@[\w-]+\.[\w.-]*\w)/g;
  let last = 0; let m;
  while ((m = re.exec(text))) {
    frag.append(text.slice(last, m.index));
    frag.append(m[1] ? link(m[1], m[1]) : h('a', { href: `mailto:${m[2]}` }, m[2]));
    last = re.lastIndex;
  }
  frag.append(text.slice(last));
  return frag;
}

/** Minimal Markdown: paragraphs, single line breaks, '- ' lists, ## headings, **bold**, *italic*, [links](url). */
export function md(src, { headingLevel = 3 } = {}) {
  const frag = document.createDocumentFragment();
  for (const block of String(src || '').replace(/\r/g, '').split(/\n{2,}/)) {
    const lines = block.split('\n').filter((l) => l.trim() !== '');
    if (!lines.length) continue;
    if (lines.every((l) => /^\s*[-*] /.test(l))) {
      frag.append(h('ul', {}, lines.map((l) => h('li', {}, inline(l.replace(/^\s*[-*] /, ''))))));
    } else if (/^#{1,4} /.test(lines[0]) && lines.length === 1) {
      frag.append(h(`h${headingLevel}`, {}, inline(lines[0].replace(/^#+ /, ''))));
    } else {
      const p = h('p');
      lines.forEach((l, i) => { if (i) p.append(h('br')); p.append(inline(l)); });
      frag.append(p);
    }
  }
  return frag;
}

/* ---------- UI pieces ---------- */
export const ICONS = {
  youtube: '<rect x="2.5" y="5" width="19" height="14" rx="4"/><path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor" stroke="none"/>',
  instagram: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none"/>',
  facebook: '<path d="M14.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.5V4.4a20 20 0 0 0-2.3-.1c-2.3 0-3.8 1.4-3.8 3.9v2.3H9v3h2.5V21"/>',
  x: '<path d="M4 4l16 16M20 4L4 20"/>',
  spotify: '<circle cx="12" cy="12" r="9.5"/><path d="M7.2 9.4c3.3-1 7-.7 9.8.9M7.8 12.4c2.7-.8 5.6-.5 7.9.8M8.4 15.2c2.1-.6 4.2-.4 6 .6"/>',
  soundcloud: '<path d="M8 17h10.5a3.2 3.2 0 0 0 .4-6.4A5 5 0 0 0 9.4 8.4M8 10v7M5.5 12v5M3 13.5V17"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  listen: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3.5" y="14" width="4" height="6" rx="1.5"/><rect x="16.5" y="14" width="4" height="6" rx="1.5"/>',
  deezer: '<path d="M4.5 19v-3M9 19v-6.5M13.5 19v-9.5M18 19v-13" stroke-width="2.4"/>',
  rss: '<path d="M5 5a14 14 0 0 1 14 14M5 11a8 8 0 0 1 8 8"/><circle cx="6" cy="18" r="1.4" fill="currentColor" stroke="none"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
};
export function icon(name, label) {
  const span = h('span', { class: 'icon', ...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': 'true' }) });
  span.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" focusable="false">${ICONS[name] || ICONS.link}</svg>`;
  return span;
}

export function socialList(site, cls = 'social') {
  return h('ul', { class: cls }, (site.social || []).filter((s) => s.url).map((s) =>
    h('li', {}, h('a', { href: safeHref(s.url), target: '_blank', rel: 'noopener me', title: s.name },
      icon(s.icon, `${s.name} (opens in a new tab)`)))));
}

export function pageHead(title, intro, sub) {
  return h('div', { class: 'page-head-band' }, h('header', { class: 'page-head wrap' },
    h('h1', { text: title }),
    sub ? h('p', { class: 'page-head__sub', text: sub }) : null,
    intro ? h('div', { class: 'page-head__intro' }, md(intro)) : null));
}

export function emptyState(text, action) {
  return h('div', { class: 'empty' }, h('p', { text }), action || null);
}

export function showError(container, err) {
  console.error(err);
  container.append(h('div', { class: 'notice', role: 'alert' },
    h('p', { class: 'notice__title', text: 'This part of the page could not be loaded.' }),
    h('p', { text: 'Please refresh the page. If it keeps happening, let the site owner know.' }),
    h('p', { class: 'notice__detail', text: `Details for the site editor: ${err && err.message ? err.message : err}` })));
}

/** YouTube click-to-play facade: nothing from YouTube loads until the visitor clicks. */
export function videoFacade(videoId, title, { thumbnail } = {}) {
  const wrap = h('div', { class: 'yt' });
  const local = `assets/img/yt/${videoId}.jpg`;
  const thumb = thumbnail || (state.images[local] ? local : `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`);
  const pic = img(thumb, { sizes: '(min-width: 62rem) 33vw, (min-width: 40rem) 50vw, 100vw' });
  if (!pic.hasAttribute('width')) { pic.setAttribute('width', '480'); pic.setAttribute('height', '360'); }
  const btn = h('button', { type: 'button', class: 'yt__btn', 'aria-label': `Play video: ${title}` },
    pic,
    h('span', { class: 'yt__play' }, icon('play')));
  btn.addEventListener('click', () => {
    const frame = h('iframe', {
      src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0`,
      title, allow: 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share',
      allowfullscreen: true, referrerpolicy: 'strict-origin-when-cross-origin',
    });
    wrap.replaceChildren(frame);
    frame.focus();
  });
  wrap.append(btn);
  return wrap;
}
export const ytWatch = (id) => `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;

/* ---------- Layout: header, nav, footer ---------- */
/** "The Sound of (Nihira)Music": text in brackets gets the accent colour. */
export function brandName(name) {
  const frag = document.createDocumentFragment();
  String(name || '').split(/(\([^)]*\))/).forEach((part) => {
    if (!part) return;
    frag.append(/^\(.*\)$/.test(part) ? h('span', { class: 'brand__accent' }, part) : part);
  });
  return frag;
}

function applyTheme(theme) {
  const ok = (c) => /^#[0-9a-f]{6}$/i.test(String(c || '').trim());
  if (!theme) return;
  if (ok(theme.accent)) document.documentElement.style.setProperty('--theme-accent', theme.accent.trim());
  if (ok(theme.accentDark)) document.documentElement.style.setProperty('--theme-accent-dark', theme.accentDark.trim());
}

export function renderLayout(site, pageId) {
  applyTheme(site.theme);
  const header = document.getElementById('site-header');
  const footer = document.getElementById('site-footer');
  if (header) {
    const panelId = 'site-nav-panel';
    const mobile = window.matchMedia('(max-width: 62rem)');
    const toggle = h('button', { type: 'button', class: 'nav-toggle', 'aria-expanded': 'false', 'aria-controls': panelId },
      h('span', { class: 'nav-toggle__bars', 'aria-hidden': 'true' }), h('span', { class: 'nav-toggle__label', text: 'Menu' }));
    const list = h('ul', { class: 'nav__list' }, (site.nav || []).map((item) =>
      h('li', {}, h('a', { href: url(item.path), ...(item.id === pageId ? { 'aria-current': 'page' } : {}) }, item.label))));
    const panel = h('div', { id: panelId, class: 'nav__panel' }, list, socialList(site, 'social nav__social'));
    const outside = () => [document.getElementById('main'), document.getElementById('site-footer'), header.querySelector('.brand')];
    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.querySelector('.nav-toggle__label').textContent = open ? 'Close' : 'Menu';
      header.classList.toggle('is-open', open);
      document.body.classList.toggle('nav-open', open);
      outside().forEach((el) => { if (el) el.inert = open; });
      if (open) list.querySelector('a')?.focus();
    };
    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    panel.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', (e) => {
      if (!header.classList.contains('is-open')) return;
      if (e.key === 'Escape') { setOpen(false); toggle.focus(); return; }
      if (e.key === 'Tab') { // keep focus inside the open menu
        const f = [toggle, ...panel.querySelectorAll('a')];
        const i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    });
    mobile.addEventListener?.('change', () => { if (!mobile.matches && header.classList.contains('is-open')) setOpen(false); });
    header.replaceChildren(h('div', { class: 'site-header__inner wrap' },
      h('a', { class: 'brand', href: url('') }, brandName(site.siteName)),
      h('nav', { class: 'nav', 'aria-label': 'Main' }, toggle, panel)));
  }
  if (footer) {
    const year = new Date().getFullYear();
    footer.replaceChildren(h('div', { class: 'site-footer__inner wrap' },
      h('div', { class: 'site-footer__brand' },
        h('p', { class: 'site-footer__name' }, brandName(site.siteName)),
        site.artistName ? h('p', { class: 'muted', text: site.artistName }) : null,
        site.email ? h('p', {}, h('a', { href: `mailto:${site.email}` }, site.email)) : null),
      h('div', { class: 'site-footer__follow' },
        socialList(site),
        site.subscribeUrl ? h('a', { class: 'btn btn--small', href: site.subscribeUrl, target: '_blank', rel: 'noopener' },
          icon('youtube'), site.subscribeLabel || 'Subscribe on YouTube') : null),
      h('div', { class: 'site-footer__legal' },
        h('p', {}, `© ${year} ${site.copyrightName || site.siteName}`),
        h('ul', { class: 'site-footer__links' }, (site.footerLinks || []).map((l) =>
          h('li', {}, h('a', { href: url(l.path) }, l.label)))))));
  }
}
