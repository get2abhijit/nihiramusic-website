// Entry point for every page: draws header/footer from data/site.json, then the page module.
import { loadJSON, renderLayout, showError } from './core.js';

const PAGES = {
  home: './home.js', originals: './works.js', covers: './works.js', concerts: './concerts.js',
  poems: './poems.js', news: './news.js', events: './events.js', awards: './awards.js',
  privacy: './legal.js', terms: './legal.js',
};

const page = document.body.dataset.page;
const app = document.getElementById('app');

(async () => {
  let site;
  try { site = await loadJSON('site'); } catch (e) { if (app) showError(app, e); return; }
  renderLayout(site, page);
  const mod = PAGES[page];
  if (!mod || !app) return;
  try {
    const m = await import(mod);
    await m.default({ app, site, page });
  } catch (e) {
    showError(app, e);
  } finally {
    app.removeAttribute('aria-busy');
  }
})();
