// 8/11 (Edoardo): finita la qualifica, in RACE la griglia di partenza vista dall'alto come nella bandiera rossa;
// prima l'ordine della qualifica, poi (quando OpenF1 ha starting_grid) la griglia ufficiale con le penalità e ▲▼.
// Qualifica vera di Interlagos 2026 (Q1 con la rossa, test/fixtures/openf1-interlagos-q1-redflag.json).
// Uso: node test/build-test.js && node test/e2e/run96-griglia-qualifica.js [filtro]
const { open, w, tapSel, goTab, login, assert, run } = require('./helpers');
const FX = require('../fixtures/openf1-interlagos-q1-redflag.json');

const QNOW = '2026-11-07T20:30:00Z';   // dopo la qualifica di Interlagos
const CORS = { 'Access-Control-Allow-Origin': '*' };
const BR_LIVE = { 'shared/bt-races': { __arr: [{ id: 'r20', name: 'GP del Brasile', circuit: 'Interlagos', country: 'Brasile', round: 20, date: '2026-11-08T17:00:00', status: 'LIVE', totalLaps: 71, circuitId: 'br-1940' }] } };
// grid: righe di starting_grid da dare (null = non ancora pubblicata)
const routes = grid => ({ 'https://api.openf1.org/v1/**': async r => {
  const u = new URL(r.request().url()), path = u.pathname.replace(/^\/v1\//, '');
  const json = (status, body) => r.fulfill({ status, contentType: 'application/json', headers: CORS, body: JSON.stringify(body) });
  if (path === 'sessions') return json(200, [FX.session]);
  if (path === 'starting_grid') return grid ? json(200, grid) : json(404, { detail: 'No results found.' });
  const list = FX[path];
  return Array.isArray(list) && list.length ? json(200, list) : json(404, { detail: 'No results found.' });
} });
const waitFinished = p => p.waitForFunction(() => window.__btLive && window.__btLive.state().finished, null, { timeout: 15000 }).then(() => true, () => false);
const read = p => p.evaluate(() => {
  const e = document.querySelector('[data-start-grid]'); if (!e) return null;
  return { kind: e.getAttribute('data-start-grid'), note: e.querySelector('[data-start-note]').innerText, slots: [...e.querySelectorAll('[data-start-slot]')].map(s => [s.getAttribute('data-start-slot'), +s.getAttribute('data-start-pos'), s.getAttribute('data-start-delta')]) };
});
const order = p => p.evaluate(() => window.__btLive.state().cars.filter(c => !c.dnf && c.pos > 0).sort((a, b) => a.pos - b.pos).map(c => ({ code: c.code, number: c.number, pos: c.pos })));

run({
  async 'senza griglia ufficiale: l\'ordine della qualifica e la nota che la griglia con le penalità arriva dopo'(b) {
    const { ctx, p, errs } = await open(b, { now: QNOW, seed: { addDocs: BR_LIVE, pro: true }, routes: routes(null) }); await login(p);
    await goTab(p, 'RACE');
    const ok = await waitFinished(p); await w(p, 800);
    const g = await read(p), q = await order(p);
    await p.screenshot({ path: '/tmp/bt/run96-qualifica.png' });
    await ctx.close();
    assert(ok, 'la qualifica di prova deve finire');
    assert(g && g.kind === 'qualifica' && /arriva quando la pubblica la FIA/.test(g.note), 'griglia: ' + JSON.stringify(g && { k: g.kind, n: g.note }));
    assert(JSON.stringify(g.slots.map(s => [s[0], s[1]])) === JSON.stringify(q.map(c => [c.code, c.pos])), 'ordine della qualifica: ' + JSON.stringify(g.slots.slice(0, 4)));
    assert(!errs.length, errs.join(' | '));
  },

  async 'con starting_grid: griglia ufficiale con ▲▼ per le penalità; si torna all\'ordine della qualifica'(b) {
    // griglia ufficiale: il primo della qualifica parte 3° (penalità), gli altri salgono
    const pre = await (async () => { const { ctx, p } = await open(b, { now: QNOW, seed: { addDocs: BR_LIVE, pro: true }, routes: routes(null) }); await login(p); await goTab(p, 'RACE'); await waitFinished(p); const q = await order(p); await ctx.close(); return q; })();
    const off = pre.map(c => ({ driver_number: c.number, position: c.pos === 1 ? 3 : c.pos <= 3 ? c.pos - 1 : c.pos }));
    const { ctx, p, errs } = await open(b, { now: QNOW, seed: { addDocs: BR_LIVE, pro: true }, routes: routes(off) }); await login(p);
    await goTab(p, 'RACE');
    await waitFinished(p); await w(p, 1200);
    const g = await read(p);
    await p.screenshot({ path: '/tmp/bt/run96-ufficiale.png' });
    await tapSel(p, '[data-start-view="quali"]'); await w(p, 300);
    const back = await read(p);
    await ctx.close();
    const first = pre[0].code;
    assert(g && g.kind === 'ufficiale' && /penalità/.test(g.note), 'griglia ufficiale: ' + JSON.stringify(g && { k: g.kind, n: g.note }));
    assert(g.slots[2][0] === first && g.slots[2][1] === 3 && g.slots[2][2] === '-2', 'il primo della qualifica parte 3° (▼ 2): ' + JSON.stringify(g.slots.slice(0, 3)));
    assert(g.slots[0][0] === pre[1].code && g.slots[0][2] === '1', 'il secondo sale in pole (▲ 1): ' + JSON.stringify(g.slots[0]));
    assert(back.slots[0][0] === first && back.slots[0][1] === 1, 'ordine della qualifica: ' + JSON.stringify(back.slots[0]));
    assert(!errs.length, errs.join(' | '));
  },
});
