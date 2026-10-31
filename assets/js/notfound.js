// 404 page: forwards old or mistyped addresses to the right page.
// Matches menu and footer pages from data/site.json (any upper/lower case, with or without .html)
// and every "from" address in data/redirects.json. Unknown addresses keep the friendly 404 text.
import { loadJSON } from './core.js';

const key = (p) => String(p || '').toLowerCase().trim()
  .replace(/[?#].*$/, '').replace(/^\/+|\/+$/g, '').replace(/(\/index)?\.(html?|php)$/, '');

export default async function notFound({ site }) {
  const base = new URL(document.baseURI);
  let rest = location.pathname;
  try { rest = decodeURIComponent(rest); } catch (e) { /* keep as is */ }
  if (rest.startsWith(base.pathname)) rest = rest.slice(base.pathname.length);
  const wanted = key(rest);
  if (!wanted) return;

  const targets = new Map();
  for (const n of [...(site.nav || []), ...(site.footerLinks || [])]) {
    if (n && n.path) targets.set(key(n.path), n.path);
  }
  const redirects = await loadJSON('redirects').catch(() => null);
  for (const r of (redirects && redirects.items) || []) {
    if (r && r.from) targets.set(key(r.from), r.to || '');
  }
  if (!targets.has(wanted)) return;

  const to = targets.get(wanted);
  const dest = /^https?:\/\//.test(to) ? to : new URL(to.replace(/^\.?\/+/, ''), base).href;
  const here = location.href.split('#')[0].replace(/\/$/, '');
  if (dest.replace(/\/$/, '') !== here) location.replace(dest + location.hash);
}
