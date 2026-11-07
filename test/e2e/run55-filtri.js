// Tappa 3, Task 6 (G09-G10): filtri delle notizie a forma di gomma (Soft ultim'ora, Medium generali, Hard
// approfondimenti, Intermedia meteo) e selettore "Pit Lane" (Tutte, Scuderie, Piloti, Tecnica) con la monoposto che
// scivola sulla voce scelta. Nel Pannello Admin le categorie nuove METEO e TECNICA.
// Uso: node test/build-test.js && node test/e2e/run55-filtri.js [filtro]
const { open, w, tapText, tapSel, login, openAdmin, assert, run } = require('./helpers');

// Notizie vere salvate su Firebase (formato di oggi); l'ora delle prove è il 7/10 alle 12:00 in Italia.
const art = (id, category, date) => ({ id, title: 'Notizia ' + id, summary: 'Riassunto ' + id, category, author: 'Team B&T', image: '', published: true, date, content: 'Testo ' + id });
const NEWS = { 'shared/bt-news': { __arr: [
  art('analisi', 'ANALISI', '2026-10-01T10:00:00'), art('meteo', 'METEO', '2026-10-07T09:30:00'), art('piloti', 'PILOTI', '2026-10-02T10:00:00'),
  art('scuderie', 'SCUDERIE', '2026-10-03T10:00:00'), art('tecnica', 'TECNICA', '2026-10-06T13:00:00'), art('gara', 'GARA', '2026-10-07T11:59:00'),
] } };
const shown = p => p.evaluate(() => [...document.querySelectorAll('[data-featured], [data-news-item]')].map(e => e.getAttribute('data-featured') || e.getAttribute('data-news-item')).sort().join(','));
const tyre = (p, id) => p.evaluate(k => { const e = document.querySelector(`[data-tyre="${k}"]`); return e ? { on: e.getAttribute('data-tyre-on'), print: !!e.querySelector('[data-tyre-print]'), spin: !!e.querySelector('.tyre-spin'), label: e.getAttribute('aria-label') } : null; }, id);
// I suoni che l'app chiede (fx di src/services/fx.js, window.__btFx).
const spyFx = p => p.evaluate(() => { const fx = window.__btFx; window.__played = []; const play = fx.play; fx.play = n => { window.__played.push(n); return play(n); }; });

run({
  // 7/11 sera (Edoardo: "togli dalla home la sezione pitline e le ruote"): le gomme e la Pit Lane non ci sono più in
  // Home; le regole dei filtri restano (filterNews, prove in test/unit) e di serie non filtrano niente.
  async "Home senza le gomme: si vedono tutte le notizie e nessun filtro a gomma"(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: NEWS } }); await login(p);
    const all = await shown(p), tyres = await p.evaluate(() => document.querySelectorAll('[data-tyres], [data-tyre]').length);
    await ctx.close();
    assert(all === 'analisi,gara,meteo,piloti,scuderie,tecnica', 'notizie in Home: ' + all);
    assert(tyres === 0, 'in Home ci sono ancora le gomme: ' + tyres);
    assert(!errs.length, errs.join(' | '));
  },

  async 'Home senza la Pit Lane: niente monoposto né voci della corsia'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: NEWS } }); await login(p);
    const lane = await p.evaluate(() => document.querySelectorAll('[data-pit-lane], [data-lane], [data-lane-car]').length), all = await shown(p);
    await ctx.close();
    assert(lane === 0, 'in Home c\'è ancora la Pit Lane: ' + lane);
    assert(all === 'analisi,gara,meteo,piloti,scuderie,tecnica', 'notizie in Home: ' + all);
    assert(!errs.length, errs.join(' | '));
  },

  async 'Pannello Admin: categorie METEO e TECNICA'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await openAdmin(p);   // il Pannello si apre sulla scheda NEWS
    const cats = await p.evaluate(() => [...document.querySelectorAll('button')].map(e => e.textContent.trim()).filter(t => /^[A-Z]+$/.test(t)));
    await ctx.close();
    assert(cats.includes('METEO') && cats.includes('TECNICA'), 'categorie nel Pannello: ' + cats.join(', '));
    assert(!errs.length, errs.join(' | '));
  },
});
