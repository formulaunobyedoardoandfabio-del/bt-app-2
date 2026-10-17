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
  async "la gomma scelta ruota e lascia l'impronta (data-tyre-on), un altro tocco la toglie"(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: NEWS } }); await login(p);
    const all = await shown(p);
    const before = await tyre(p, 'hard');
    await tapSel(p, '[data-tyre="hard"]'); await w(p, 400);
    const on = await tyre(p, 'hard'), hard = await shown(p);
    await tapSel(p, '[data-tyre="soft"]'); await w(p, 400);
    const soft = await shown(p), hardAfter = await tyre(p, 'hard');
    await tapSel(p, '[data-tyre="medium"]'); await w(p, 300); const medium = await shown(p);
    await tapSel(p, '[data-tyre="inter"]'); await w(p, 300); const inter = await shown(p);
    await tapSel(p, '[data-tyre="inter"]'); await w(p, 300);
    const off = await tyre(p, 'inter'), back = await shown(p);
    await ctx.close();
    assert(all === 'analisi,gara,meteo,piloti,scuderie,tecnica', 'notizie all\'inizio: ' + all);
    assert(before && before.on !== '1' && !before.print && /Hard/.test(before.label) && /approfondimenti/i.test(before.label), 'gomma Hard prima: ' + JSON.stringify(before));
    assert(on && on.on === '1' && on.print && on.spin, 'gomma Hard scelta: ' + JSON.stringify(on));
    assert(hard === 'analisi', 'Hard (approfondimenti): ' + hard);
    assert(soft === 'gara,meteo,tecnica' && hardAfter.on !== '1', 'Soft (ultime 24 ore) al posto della Hard: ' + soft);
    assert(medium === 'gara,piloti,scuderie,tecnica', 'Medium (generali): ' + medium);
    assert(inter === 'meteo', 'Intermedia (meteo): ' + inter);
    assert(off && off.on !== '1' && back === all, 'toccata di nuovo la gomma non si toglie: ' + JSON.stringify(off) + ' ' + back);
    assert(!errs.length, errs.join(' | '));
  },

  async 'Pit Lane: la monoposto scivola sulla voce, il suono della cambiata'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: NEWS } }); await login(p);
    await spyFx(p);
    const car0 = await p.evaluate(() => { const c = document.querySelector('[data-lane-car]'); return c ? { at: c.getAttribute('data-lane-car'), tf: c.style.transform } : null; });
    await tapSel(p, '[data-lane="drivers"]'); await w(p, 500);
    const car1 = await p.evaluate(() => { const c = document.querySelector('[data-lane-car]'); return c ? { at: c.getAttribute('data-lane-car'), tf: c.style.transform } : null; });
    const drivers = await shown(p), played = await p.evaluate(() => window.__played);
    await tapSel(p, '[data-tyre="soft"]'); await w(p, 300);
    const both = await shown(p);
    await tapSel(p, '[data-lane="tech"]'); await w(p, 300);
    const techSoft = await shown(p);
    await tapSel(p, '[data-lane="all"]'); await w(p, 300);
    const allSoft = await shown(p);
    const pressed = await p.evaluate(() => [...document.querySelectorAll('[data-lane]')].map(e => e.getAttribute('data-lane') + ':' + e.getAttribute('aria-pressed')).join(' '));
    await ctx.close();
    assert(car0 && car0.at === 'all', 'monoposto all\'inizio: ' + JSON.stringify(car0));
    assert(car1 && car1.at === 'drivers' && car1.tf !== car0.tf, 'la monoposto non si sposta su Piloti: ' + JSON.stringify(car1));
    assert(drivers === 'piloti', 'Piloti: ' + drivers);
    assert(played.includes('shift'), 'niente suono della cambiata: ' + JSON.stringify(played));
    assert(both === '', 'Piloti con la Soft (nessuna notizia di piloti nelle ultime 24 ore): ' + both);
    assert(techSoft === 'tecnica', 'Tecnica con la Soft: ' + techSoft);
    assert(allSoft === 'gara,meteo,tecnica', 'Tutte con la Soft: ' + allSoft);
    assert(pressed === 'all:true teams:false drivers:false tech:false', 'voci della corsia: ' + pressed);
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
