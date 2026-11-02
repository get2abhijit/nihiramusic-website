// Press kit: bios (copy button), recognition (from awards.json), photos (download), booking contact.
import { loadJSON, h, md, link, pageHead, icon, img, url, fmtDate } from './core.js';
import { statusLabel } from './awards.js';

const optional = (name) => loadJSON(name).catch(() => null);

function copyButton(getText, label) {
  const status = h('span', { class: 'visually-hidden', role: 'status' });
  const b = h('button', { type: 'button', class: 'listen-btn' }, icon('copy'), h('span', { text: 'Copy text' }));
  b.setAttribute('aria-label', `Copy ${label} to the clipboard`);
  b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(getText()); status.textContent = 'Copied.'; b.lastChild.textContent = 'Copied'; }
    catch { status.textContent = 'Copying is not possible here. Select the text and copy it by hand.'; }
    setTimeout(() => { b.lastChild.textContent = 'Copy text'; }, 2500);
  });
  return h('span', { class: 'pk__copy' }, b, status);
}

function bioParagraphs(bio, home) {
  const about = (home && home.about && Array.isArray(home.about.paragraphs)) ? home.about.paragraphs : [];
  if (bio.text) return String(bio.text).split(/\n{2,}/);
  if (bio.fromAbout === 'first') return about.slice(0, 1);
  if (bio.fromAbout === 'all') return about;
  return [];
}

function bios(data, home) {
  const list = (Array.isArray(data.bios) ? data.bios : []).map((b) => [b, bioParagraphs(b, home)]).filter(([, p]) => p.length);
  if (!list.length) return null;
  return h('section', { class: 'pk__section', 'aria-labelledby': 'pk-bio' },
    h('h2', { id: 'pk-bio', text: 'Biography' }),
    list.map(([b, paras]) => h('article', { class: 'pk__bio' },
      h('div', { class: 'pk__bio-head' }, h('h3', { text: b.label || 'Bio' }), copyButton(() => paras.join('\n\n'), b.label || 'bio')),
      h('div', { class: 'prose' }, paras.map((p) => h('p', { text: p }))))));
}

function facts(data) {
  const list = (Array.isArray(data.facts) ? data.facts : []).filter((f) => f && f.label && f.value);
  if (!list.length) return null;
  return h('section', { class: 'pk__section', 'aria-labelledby': 'pk-facts' },
    h('h2', { id: 'pk-facts', text: data.factsHeading || 'At a glance' }),
    h('dl', { class: 'pk__facts' }, list.map((f) => [h('dt', { text: f.label }), h('dd', { text: f.value })])));
}

function highlights(data, awards) {
  const items = ((awards && awards.items) || []).filter((a) => a.highlight && a.pressKit !== false);
  if (!items.length) return null;
  const rank = (a) => (statusLabel(a.status) === 'Won' ? 0 : 1);
  items.sort((a, b) => rank(a) - rank(b) || String(b.year || 0).localeCompare(String(a.year || 0)));
  return h('section', { class: 'pk__section', 'aria-labelledby': 'pk-awards' },
    h('h2', { id: 'pk-awards', text: data.highlightsHeading || 'Recognition' }),
    h('ul', { class: 'pk__awards', role: 'list' }, items.map((a) => h('li', {},
      h('span', { class: `badge badge--${statusLabel(a.status).toLowerCase()}`, text: statusLabel(a.status) }),
      h('span', { class: 'pk__award-text' },
        h('strong', { text: a.award }), a.category ? `, ${a.category}` : '',
        a.work ? [' for ', h('cite', { text: a.work })] : '', a.year ? ` (${a.year})` : '',
        ' ', link(`awards/#${a.id}`, 'Details', { class: 'pk__more' }))))));
}

function photos(data) {
  const list = (Array.isArray(data.photos) ? data.photos : []).filter((p) => p && p.src && p.approved === true);
  const files = (Array.isArray(data.downloads) ? data.downloads : []).filter((d) => d && d.path);
  if (!list.length && !files.length) return null;
  return h('section', { class: 'pk__section', 'aria-labelledby': 'pk-photos' },
    h('h2', { id: 'pk-photos', text: data.photosHeading || 'Photos' }),
    data.photosNote ? h('p', { class: 'muted pk__note', text: data.photosNote }) : null,
    list.length ? h('ul', { class: 'pk__photos', role: 'list' }, list.map((p) => h('li', {},
      h('figure', {}, img(p.src, { alt: p.alt || '', sizes: '(min-width: 48rem) 20rem, 90vw' }),
        h('figcaption', {}, h('span', { class: 'pk__label', text: p.label || '' }),
          p.credit ? h('span', { class: 'pk__credit', text: `Photo: ${p.credit}` }) : null,
          h('a', { class: 'linkish', href: url(p.src), download: '' }, icon('link'), `Download${p.label ? ` ${p.label}` : ''}`)))))) : null,
    files.length ? h('ul', { class: 'pk__files', role: 'list' }, files.map((d) => h('li', {},
      link(d.path, [icon('link'), h('span', { text: d.label || d.path })], { class: 'btn btn--small btn--ghost' }),
      d.note ? h('span', { class: 'muted', text: ` ${d.note}` }) : null))) : null);
}

function booking(data, site) {
  const b = data.booking || {};
  const email = b.email || site.email;
  if (!email && !(data.links || []).length) return null;
  const extra = (Array.isArray(data.links) ? data.links : []).filter((l) => l && l.url);
  return h('section', { class: 'pk__section pk__contact', 'aria-labelledby': 'pk-contact' },
    h('h2', { id: 'pk-contact', text: b.heading || 'Contact' }),
    b.text ? h('div', { class: 'prose' }, md(b.text)) : null,
    h('p', { class: 'pk__buttons' },
      email ? h('a', { class: 'btn', href: `mailto:${email}?subject=${encodeURIComponent('Booking / press enquiry')}` }, icon('link'), h('span', { text: `Write to ${email}` })) : null,
      extra.map((l) => link(l.url, l.label, { class: 'btn btn--ghost' }))));
}

export default async function ({ app, site }) {
  const [data, home, awards] = await Promise.all([loadJSON('presskit'), optional('home'), optional('awards')]);
  app.append(pageHead(data.pageTitle || 'Press kit', data.intro));
  const wrap = h('div', { class: 'wrap section section--tight pk' });
  app.append(wrap);
  const parts = [bios(data, home), facts(data), highlights(data, awards), photos(data), booking(data, site)].filter(Boolean);
  if (!parts.length) { wrap.append(h('div', { class: 'empty' }, h('p', { text: 'The press kit is being prepared.' }))); return; }
  wrap.append(...parts);
}
