// Entry point for every page: draws header/footer from data/site.json, then the page module.
import { loadJSON, renderLayout, showError, setImageManifest, setVideoTitles } from './core.js';

const PAGES = {
  home: './home.js', originals: './works.js', covers: './works.js', concerts: './concerts.js',
  poems: './poems.js', news: './news.js', events: './events.js', awards: './awards.js',
  privacy: './legal.js', terms: './legal.js', notfound: './notfound.js',
};

const page = document.body.dataset.page;
const app = document.getElementById('app');
const optional = (name) => loadJSON(name).catch((e) => { console.warn(e); return null; });

(async () => {
  let site;
  const extras = Promise.all([optional('images'), optional('youtube-latest')]);
  try { site = await loadJSON('site'); } catch (e) { if (app) showError(app, e); return; }
  renderLayout(site, page);
  const [images, yt] = await extras;
  setImageManifest(images);
  setVideoTitles(yt && yt.titles);
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
