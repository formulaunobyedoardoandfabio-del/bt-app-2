// 8/11 (Edoardo: "modalità TV in dual screen con anti-burn-in OLED"; poi alle 11:36: "intendevo solo che non si spegne
// lo schermo mai, non che modifichi qualcosa"): col Second Screen aperto lo schermo resta acceso (plugin KeepAwake finto),
// nessun pannello nuovo né tasto TV; contro il burn-in tutto si sposta di 1-3 pixel al minuto (conti in
// test/unit/oled.test.js). Uso: node test/build-test.js && node test/e2e/run101-tv.js [filtro]
const { open, w, tapSel, tapText, goTab, login, assert, run } = require('./helpers');
const FX = require('../fixtures/openf1-baku-race.json');

const CORS = { 'Access-Control-Allow-Origin': '*' };
const routes = { 'https://api.openf1.org/v1/**': async r => {
  const u = new URL(r.request().url()), path = u.pathname.replace(/^\/v1\//, '');
  const json = (status, body) => r.fulfill({ status, contentType: 'application/json', headers: CORS, body: JSON.stringify(body) });
  if (path === 'sessions') return json(200, [FX.session]);
  const list = FX[path];
  return Array.isArray(list) && list.length ? json(200, list) : json(404, { detail: 'No results found.' });
} };
const BAKU_LIVE = { 'shared/bt-races': { __arr: [{ id: 'r15', name: "GP dell'Azerbaigian", circuit: 'Baku City Circuit', country: 'Azerbaigian', round: 15, date: '2026-09-26T15:00:00', status: 'LIVE', totalLaps: 51, circuitId: 'az-2016' }] } };
// Solo il plugin KeepAwake (finto): segna le chiamate.
const capKeep = () => { window.__keep = []; window.Capacitor = { isNativePlatform: () => false, getPlatform: () => 'web', Plugins: { KeepAwake: { keepAwake: () => { window.__keep.push('on'); return Promise.resolve(); }, allowSleep: () => { window.__keep.push('off'); return Promise.resolve(); } } } }; };
const ss = p => p.evaluate(() => { const e = document.querySelector('[data-ss]'); const st = document.querySelector('[data-ss-stage]'); return { open: !!e, tvBtn: !!document.querySelector('[data-ss-tv-open]'), tvView: !!document.querySelector('[data-ss-tv]'), shift: st ? st.getAttribute('data-ss-shift') : null, map: !!document.querySelector('[data-ss-map]'), keep: window.__keep.slice() }; });

run({
  // 15/11 (Edoardo: "ci siamo dimenticati la funzione TV: mantieni schermo attivo"): interruttore nel Profilo; lo
  // schermo resta acceso finché l'app è aperta, anche chiudendo il Second Screen; si spegne solo togliendo la modalità.
  async 'modalità TV dal Profilo: schermo sempre acceso, anche dopo aver chiuso il Second Screen'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: BAKU_LIVE, pro: true }, routes, init: capKeep }); await login(p);
    const toProfile = async () => { await tapSel(p, '[aria-label="Profilo"]'); await w(p, 500); await tapSel(p, '[data-settings-group][aria-expanded="false"]').catch(() => {}); await w(p, 200); };
    await toProfile();
    const sw = '[role="switch"][aria-label="Modalità TV: schermo sempre acceso"]';
    await p.$eval(sw, e => e.scrollIntoView({ block: 'center' }));
    await tapSel(p, sw); await w(p, 400);
    const on = await p.evaluate(s => ({ keep: window.__keep.slice(), checked: document.querySelector(s).getAttribute('aria-checked') }), sw);
    await tapSel(p, '[aria-label="Indietro"]'); await w(p, 400);
    await goTab(p, 'RACE');
    await p.waitForFunction(() => window.__btLive && window.__btLive.state().cars.length > 0, null, { timeout: 15000 }).catch(() => {});
    await tapText(p, 'Modalità Second Screen'); await w(p, 700);
    await tapSel(p, '[aria-label="Chiudi Second Screen"]'); await w(p, 500);
    const afterSs = await p.evaluate(() => window.__keep.slice());
    await toProfile();
    await p.$eval(sw, e => e.scrollIntoView({ block: 'center' }));
    await tapSel(p, sw); await w(p, 400);
    const off = await p.evaluate(() => window.__keep.slice());
    const saved = await p.evaluate(() => { const k = Object.keys(localStorage).find(x => /bt-tv$/.test(x)); return k ? k + '=' + localStorage.getItem(k) : null; });
    await ctx.close();
    assert(on.checked === 'true' && on.keep.join() === 'on', 'acceso dal Profilo: lo schermo resta acceso: ' + JSON.stringify(on));
    assert(afterSs.join() === 'on', 'chiudere il Second Screen non lo spegne: ' + JSON.stringify(afterSs));
    assert(off.join() === 'on,off', 'togliendo la modalità TV lo schermo può spegnersi: ' + JSON.stringify(off));
    assert(/false/.test(saved || ''), 'la scelta resta sul telefono: ' + saved);
    assert(!errs.length, errs.join(' | '));
  },

  async 'Second Screen: lo schermo resta acceso finché è aperto, niente di diverso sullo schermo (solo 1-3 px contro il burn-in)'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: BAKU_LIVE, pro: true }, routes, init: capKeep }); await login(p);
    await goTab(p, 'RACE');
    await p.waitForFunction(() => window.__btLive && window.__btLive.state().cars.length > 0, null, { timeout: 15000 }).catch(() => {});
    await p.evaluate(() => window.__btLive.jumpTo(2950)); await w(p, 400);
    await tapText(p, 'Modalità Second Screen'); await w(p, 700);
    const a = await ss(p);
    await p.screenshot({ path: '/tmp/bt/run101-ss-acceso.png' });
    await tapSel(p, '[aria-label="Chiudi Second Screen"]'); await w(p, 500);
    const c = await ss(p);
    await ctx.close();
    assert(a.open && a.map, 'Second Screen aperto come sempre: ' + JSON.stringify(a));
    assert(!a.tvBtn && !a.tvView, 'niente tasto TV né pannelli nuovi');
    assert(a.keep.includes('on'), 'schermo tenuto acceso: ' + JSON.stringify(a.keep));
    assert(/^-?\d,-?\d$/.test(a.shift || ''), 'protezione OLED (spostamento di pochi pixel): ' + a.shift);
    assert(!c.open && c.keep.includes('off'), 'chiuso il Second Screen lo schermo può spegnersi: ' + JSON.stringify(c));
    assert(!errs.length, errs.join(' | '));
  },
});
