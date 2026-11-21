// 21/11 (Edoardo: "la funzione dell'orologio di gara, il cerchio coi puntini, falla anche e soprattutto per la live
// gara; nel Replay consenti anche di mettere la funzione come prima"): nella scheda della gara in diretta l'interruttore
// Mappa | Box mostra il Quadrante dei box coi dati della diretta (src/logic/pit-dial.js liveDial / liveModel); solo in
// gara e sprint. Gara vera di Baku 2026 in forma OpenF1 (test/fixtures/openf1-baku-race.json): i distacchi della
// fixture sono a campione (uno ogni ~2 minuti), troppo radi per misurare i pit, quindi qui il tempo perso è la mediana
// 2026 scritta come stima; la misura sui pit della gara è provata in test/unit/pit-dial-live.test.js.
// Uso: node test/build-test.js && node test/e2e/run131-quadrante-diretta.js
const { open, w, tapSel, goTab, login, assert, run } = require('./helpers');
const FX = require('../fixtures/openf1-baku-race.json');
const PD = require('../../src/logic/pit-dial');

const CORS = { 'Access-Control-Allow-Origin': '*' };
const BAKU_LIVE = { 'shared/bt-races': { __arr: [{ id: 'r15', name: "GP dell'Azerbaigian", circuit: 'Baku City Circuit', country: 'Azerbaigian', round: 15, date: '2026-09-26T15:00:00', status: 'LIVE', totalLaps: 51, circuitId: 'az-2016' }] } };
const T0 = Date.parse(FX.session.date_start);
const lapStart = (num, lap) => (Date.parse(FX.laps.find(l => l.driver_number === num && l.lap_number === lap).date_start) - T0) / 1000;
const routes = { 'https://api.openf1.org/v1/**': async r => {
  const u = new URL(r.request().url()), path = u.pathname.replace(/^\/v1\//, '');
  const json = (status, body) => r.fulfill({ status, contentType: 'application/json', headers: CORS, body: JSON.stringify(body) });
  if (path === 'sessions') return json(200, [FX.session]);
  const list = FX[path];
  return Array.isArray(list) && list.length ? json(200, list) : json(404, { detail: 'No results found.' });
} };
const waitLive = p => p.waitForFunction(() => window.__btLive && window.__btLive.state().cars.length > 0, null, { timeout: 15000 }).then(() => true, () => false);
const look = p => p.evaluate(() => ({
  dial: !!document.querySelector('[data-live-dial] [data-dial]'),
  map: !!document.querySelector('[data-live-card-map]'),
  cars: document.querySelectorAll('[data-live-dial] [data-dial-car]').length,
  picks: [...document.querySelectorAll('[data-dial-pick]')].map(e => e.getBoundingClientRect().height),
  info: ((document.querySelector('[data-live-dial] [data-dial-info]') || {}).innerText || '').replace(/\s+/g, ' '),
  loss: (document.querySelector('[data-dial-loss]') || { getAttribute: () => '' }).getAttribute('data-dial-loss'),
  pos: ((document.querySelector('[data-live-dial] [data-dial-pos]') || {}).textContent || '').trim(),
  ghost: !!document.querySelector('[data-live-dial] [data-dial-ghost="now"]'),
  view: !!document.querySelector('[data-live-view="box"]'),
  wide: document.documentElement.scrollWidth,
}));

run({
  async 'gara in diretta: Mappa | Box, quadrante coi dati della diretta, rientro come il calcolo, poi di nuovo la mappa'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: BAKU_LIVE, pro: true }, routes }); await login(p);
    await goTab(p, 'RACE');
    const ok = await waitLive(p); await w(p, 400);
    const at = lapStart(63, 30);
    await p.evaluate(t => window.__btLive.jumpTo(t), at); await w(p, 600);
    const m0 = await look(p);
    await tapSel(p, '[data-live-view="box"]'); await w(p, 500);
    const a = await look(p);
    await tapSel(p, '[data-dial-pick="VER"]'); await w(p, 500);
    const s = await look(p);
    const st = await p.evaluate(() => window.__btLive.state());
    await tapSel(p, '[data-live-view="map"]'); await w(p, 400);
    const back = await look(p);
    await tapSel(p, '[data-live-view="box"]'); await w(p, 300);
    await p.evaluate(() => window.__btLive.jumpTo(1e9)); await w(p, 700);
    const end = await look(p);
    await ctx.close();

    const model = PD.liveModel(FX, { tOf: d => (Date.parse(d) - T0) / 1000, now: st.t, circuitId: 'az-2016' });
    const want = PD.liveDial(st, { sel: 'VER', model, L: 1 });
    assert(ok, 'la sessione rivista non è partita');
    assert(m0.map && !m0.dial && m0.view, 'si apre sulla mappa, con l\'interruttore');
    assert(a.dial && a.cars === st.cars.filter(c => !c.dnf).length, 'quadrante con le auto in gara: ' + a.cars);
    assert(a.loss === 'season' && /si perdono 22,7 s \(stima: mediana delle gare 2026\)/.test(a.info), 'tempo perso: la mediana 2026 come stima: ' + a.info);
    assert(want && want.rejoin && want.rejoin.now && s.pos === 'P' + want.rejoin.now.pos, 'rientro di VER come il calcolo: ' + s.pos + ' invece di P' + (want && want.rejoin && want.rejoin.now && want.rejoin.now.pos));
    assert(s.ghost, 'ombra del rientro');
    assert(s.picks.length >= 20 && s.picks.every(h => h >= 44), 'sigle da toccare comode: ' + s.picks.slice(0, 3));
    assert(back.map && !back.dial, 'Mappa: torna il tracciato di prima');
    assert(/Gara finita/.test(end.info), 'a fine gara il cerchio lo dice: ' + end.info);
    assert(a.wide <= 390 && s.wide <= 390, 'niente scorrimento di lato: ' + s.wide);
    assert(!errs.length, errs.join(' | '));
  },
});
