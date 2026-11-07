// 8/11: B&T Trophies nell'app. A sessione finita, in RACE, la scheda col trofeo della gara; toccandola la pagina coi
// trofei (calcolati sui dati veri di OpenF1: qui la gara vera di Baku 2026), il dettaglio di ognuno con "Come si
// vince", e "Rivedi sulla mappa" che fa ripartire la sessione rivista da quel momento.
// Uso: node test/build-test.js && node test/e2e/run95-trophies.js [filtro]
const { open, w, norm, inner, tapSel, goTab, login, assert, run } = require('./helpers');
const FX = require('../fixtures/openf1-baku-race.json');
const G = require('../../src/logic/gp-trophies');

const CORS = { 'Access-Control-Allow-Origin': '*' };
const BAKU_LIVE = { 'shared/bt-races': { __arr: [{ id: 'r15', name: "GP dell'Azerbaigian", circuit: 'Baku City Circuit', country: 'Azerbaigian', round: 15, date: '2026-09-26T15:00:00', status: 'LIVE', totalLaps: 51, circuitId: 'az-2016' }] } };
const routes = { 'https://api.openf1.org/v1/**': async r => {
  const u = new URL(r.request().url()), path = u.pathname.replace(/^\/v1\//, '');
  const json = (status, body) => r.fulfill({ status, contentType: 'application/json', headers: CORS, body: JSON.stringify(body) });
  if (path === 'sessions') return json(200, [FX.session]);
  const list = FX[path];
  return Array.isArray(list) && list.length ? json(200, list) : json(404, { detail: 'No results found.' });
} };
const waitFinished = p => p.waitForFunction(() => window.__btLive && window.__btLive.state().finished, null, { timeout: 15000 }).then(() => true, () => false);

run({
  async 'sessione finita: scheda B&T TROPHIES, pagina coi trofei, dettaglio e Rivedi sulla mappa'(b) {
    const expect = G.computeGpTrophies(FX, { type: 'RACE' });
    const { ctx, p, errs } = await open(b, { seed: { addDocs: BAKU_LIVE, pro: true }, routes }); await login(p);
    await goTab(p, 'RACE');
    const ok = await waitFinished(p); await w(p, 600);
    const card = norm(await inner(p, '[data-tr-card]'));
    await tapSel(p, '[data-tr-card]'); await w(p, 500);
    const screen = await p.evaluate(() => { const e = document.querySelector('[data-tr-screen]'); return e && { head: (e.querySelector('[data-tr-headline]') || {}).getAttribute ? e.querySelector('[data-tr-headline]').getAttribute('data-tr-headline') : null, items: [...e.querySelectorAll('[data-tr-item]')].map(x => x.getAttribute('data-tr-item')), text: e.innerText.replace(/\s+/g, ' ') }; });
    await p.screenshot({ path: '/tmp/bt/run95-trophies.png' });
    await tapSel(p, '[data-tr-item="missile"]'); await w(p, 400);
    const detail = await p.evaluate(() => { const e = document.querySelector('[data-tr-detail]'); return e && { id: e.getAttribute('data-tr-detail'), rule: (e.querySelector('[data-tr-rule]') || {}).innerText, tiles: e.querySelectorAll('[data-tr-tile]').length }; });
    await p.screenshot({ path: '/tmp/bt/run95-detail.png' });
    await tapSel(p, '[data-tr-replay="missile"]'); await w(p, 700);
    const after = await p.evaluate(() => ({ page: !!document.querySelector('[data-tr-screen], [data-tr-detail]'), st: window.__btLive.state() }));
    await ctx.close();
    const ms = expect.all.find(x => x.id === 'missile');
    assert(ok, 'la sessione di prova deve finire');
    assert(/B&T TROPHIES/.test(card) && card.includes(expect.headline.name), 'scheda: ' + card);
    assert(screen && screen.head === expect.headline.id && screen.items.join() === expect.list.map(x => x.id).join(), 'pagina: ' + JSON.stringify(screen && { h: screen.head, i: screen.items }));
    assert(/GP dell'Azerbaigian · Gara finita/.test(screen.text) && /Gli altri trofei/.test(screen.text), 'testi: ' + screen.text.slice(0, 200));
    assert(detail && detail.id === 'missile' && /speed trap/.test(detail.rule) && detail.tiles === 2, 'dettaglio: ' + JSON.stringify(detail));
    assert(!after.page && !after.st.finished && Math.abs(after.st.t - ms.t) < 120, 'Rivedi sulla mappa: ' + JSON.stringify({ page: after.page, t: after.st.t, want: ms.t, fin: after.st.finished }));
    assert(!errs.length, errs.join(' | '));
  },
});
