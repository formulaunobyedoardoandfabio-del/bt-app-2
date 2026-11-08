// 8/11 (design "B&T Trophies e pause di gara" approvato da Edoardo): Muretto dei tifosi in RACE.
// Safety Car vera di Baku 2026: "Box o fuori?" per i primi 8, chi ha già fermato, e a Safety Car finita la scheda
// "com'è andata" con le scelte contro le soste vere. Rossa vera di Interlagos (Q1): cosa è successo, quanto dura,
// gomma della ripartenza, "Rivedi gli ultimi 60 s".
// Uso: node test/build-test.js && node test/e2e/run98-muretto.js [filtro]
const { open, w, tapSel, goTab, login, assert, run } = require('./helpers');
const BAKU = require('../fixtures/openf1-baku-race.json');
const BR = require('../fixtures/openf1-interlagos-q1-redflag.json');
const W = require('../../src/logic/pit-wall');

const CORS = { 'Access-Control-Allow-Origin': '*' };
const routesOf = FX => ({ 'https://api.openf1.org/v1/**': async r => {
  const u = new URL(r.request().url()), path = u.pathname.replace(/^\/v1\//, '');
  const json = (status, body) => r.fulfill({ status, contentType: 'application/json', headers: CORS, body: JSON.stringify(body) });
  if (path === 'sessions') return json(200, [FX.session]);
  const list = FX[path];
  return Array.isArray(list) && list.length ? json(200, list) : json(404, { detail: 'No results found.' });
} });
const BAKU_LIVE = { 'shared/bt-races': { __arr: [{ id: 'r15', name: "GP dell'Azerbaigian", circuit: 'Baku City Circuit', country: 'Azerbaigian', round: 15, date: '2026-09-26T15:00:00', status: 'LIVE', totalLaps: 51, circuitId: 'az-2016' }] } };
const BR_LIVE = { 'shared/bt-races': { __arr: [{ id: 'r20', name: 'GP del Brasile', circuit: 'Interlagos', country: 'Brasile', round: 20, date: '2026-11-08T17:00:00', status: 'LIVE', totalLaps: 71, circuitId: 'br-1940' }] } };
const waitLoaded = p => p.waitForFunction(() => window.__btLive && window.__btLive.state().finished, null, { timeout: 15000 }).then(() => true, () => false);
const jump = (p, t) => p.evaluate(x => window.__btLive.jumpTo(x), t);

run({
  async 'Safety Car di Baku: Box o fuori, Fatto, e a Safety Car finita com\'è andata con le soste vere'(b) {
    const P = W.createPitWall(BAKU), win = P.windows[0];
    const { ctx, p, errs } = await open(b, { seed: { addDocs: BAKU_LIVE, pro: true }, routes: routesOf(BAKU) }); await login(p);
    await goTab(p, 'RACE');
    const ok = await waitLoaded(p);
    await jump(p, 3550); await w(p, 600);
    const s1 = await p.evaluate(() => { const e = document.querySelector('[data-boxout]'); return e && { state: e.getAttribute('data-boxout'), rows: [...e.querySelectorAll('[data-boxout-row]')].map(r => ({ code: r.getAttribute('data-boxout-row'), pitted: !!r.querySelector('[data-boxout-pitted]') })), gifted: e.querySelector('[data-boxout-gifted]') ? +e.querySelector('[data-boxout-gifted]').getAttribute('data-boxout-gifted') : 0, banner: (document.querySelector('[data-flag-banner]') || {}).getAttribute ? document.querySelector('[data-flag-banner]').getAttribute('data-flag-banner') : null }; });
    const expect = P.boxBoard(win, 3550);
    assert(ok, 'la gara di prova deve caricarsi');
    assert(s1 && s1.state === 'aperto', 'Box o fuori deve esserci sotto Safety Car: ' + JSON.stringify(s1));
    assert(JSON.stringify(s1.rows.map(r => r.code)) === JSON.stringify(expect.rows.map(r => r.code)), 'i primi 8: ' + JSON.stringify(s1.rows));
    assert(JSON.stringify(s1.rows.map(r => r.pitted)) === JSON.stringify(expect.rows.map(r => r.pitted)), 'chi ha già fermato: ' + JSON.stringify(s1.rows));
    assert(s1.gifted === expect.gifted.length && s1.gifted > 0, 'pit stop regalati: ' + s1.gifted);
    // scelte: BOX al primo libero, FUORI al secondo libero
    const free = s1.rows.filter(r => !r.pitted).map(r => r.code);
    assert(free.length >= 2, 'servono almeno due piloti da scegliere: ' + free);
    await tapSel(p, `[data-boxout-row="${free[0]}"] button:nth-of-type(1)`); await w(p, 150);
    await tapSel(p, `[data-boxout-row="${free[1]}"] button:nth-of-type(2)`); await w(p, 150);
    await (await p.$('[data-boxout]')).screenshot({ path: '/tmp/bt/run98-boxout.png' });
    await tapSel(p, '[data-boxout-done]'); await w(p, 300);
    const s2 = await p.evaluate(() => ({ state: document.querySelector('[data-boxout]').getAttribute('data-boxout'), stored: JSON.parse(localStorage.getItem('bt-pitwall') || 'null') }));
    assert(s2.state === 'fatto', 'dopo Fatto le scelte sono salvate: ' + s2.state);
    // a Safety Car finita
    await jump(p, win.b + 60); await w(p, 600);
    const card = await p.evaluate(() => { const e = document.querySelector('[data-pitwall-card]'); return e && e.innerText; });
    assert(card && /Safety Car del giro/.test(card) && /su 2/.test(card), 'scheda com\'è andata: ' + card);
    await tapSel(p, '[data-pitwall-card]'); await w(p, 400);
    const page = await p.evaluate(() => { const e = document.querySelector('[data-pitwall-page]'); return e && { head: e.querySelector('[data-pitwall-head]').innerText, rows: [...e.querySelectorAll('[data-pitwall-row]')].map(r => [r.getAttribute('data-pitwall-row'), r.getAttribute('data-good')]) }; });
    await p.screenshot({ path: '/tmp/bt/run98-esito.png' });
    const codeNum = Object.fromEntries(expect.rows.map(r => [r.code, r.number]));
    const res = P.boxResult(win, { [codeNum[free[0]]]: 'box', [codeNum[free[1]]]: 'out' }, win.b + 60);
    assert(page && JSON.stringify(page.rows) === JSON.stringify(res.rows.map(r => [r.code, r.good ? '1' : '0'])), 'esito: ' + JSON.stringify(page) + ' atteso ' + JSON.stringify(res.rows));
    assert(page.head.startsWith(`${res.right} `), 'titolo: ' + page.head);
    await tapSel(p, '[data-pitwall-page] button[aria-label="Indietro"]'); await w(p, 300);
    const back = await p.evaluate(() => !document.querySelector('[data-pitwall-page]') && !!document.querySelector('[data-pitwall-card]'));
    await ctx.close();
    assert(back, 'Indietro torna alla pagina Race');
    assert(!errs.length, errs.join(' | '));
  },

  async 'rossa di Interlagos: cosa è successo, quanto dura, gomma, Gioca e Rivedi gli ultimi 60 s'(b) {
    const { ctx, p, errs } = await open(b, { now: '2026-11-07T20:30:00Z', seed: { addDocs: BR_LIVE, pro: true }, routes: routesOf(BR) }); await login(p);
    await goTab(p, 'RACE');
    const ok = await waitLoaded(p);
    await jump(p, 400); await w(p, 600);
    const r1 = await p.evaluate(() => { const e = document.querySelector('[data-red-play]'); return e && { state: e.getAttribute('data-red-play'), what: e.querySelector('[data-red-what]').innerText, since: e.querySelector('[data-red-since]').innerText, mins: +e.querySelector('[data-red-mins]').getAttribute('data-red-mins'), tyre: !!e.querySelector('[data-red-tyre]') }; });
    assert(ok, 'la qualifica di prova deve caricarsi');
    assert(r1 && r1.state === 'aperto', 'giochi della rossa: ' + JSON.stringify(r1));
    assert(/non ha ancora scritto il motivo/.test(r1.what), 'cosa è successo: ' + r1.what);
    assert(/ferma da 4:17/.test(r1.since), 'da quando è ferma: ' + r1.since);
    assert(r1.mins === 25 && r1.tyre, 'stima di serie e gomme: ' + JSON.stringify(r1));
    await tapSel(p, '[data-red-play] button[aria-label="Un minuto in più"]'); await w(p, 120);
    await tapSel(p, '[data-red-play] button[aria-label="Un minuto in più"]'); await w(p, 120);
    await tapSel(p, '[data-red-tyre="INTERMEDIATE"]'); await w(p, 150);
    const go = await p.evaluate(() => document.querySelector('[data-red-go]').innerText);
    assert(/27 min/.test(go) && /Inter/.test(go), 'tasto Gioca: ' + go);
    await (await p.$('[data-red-play]')).screenshot({ path: '/tmp/bt/run98-rossa.png' });
    await tapSel(p, '[data-red-go]'); await w(p, 300);
    const r2 = await p.evaluate(() => ({ state: document.querySelector('[data-red-play]').getAttribute('data-red-play'), locked: (document.querySelector('[data-red-locked]') || {}).innerText }));
    assert(r2.state === 'fatto' && /27 min/.test(r2.locked), 'giocata salvata: ' + JSON.stringify(r2));
    await tapSel(p, '[data-red-replay]'); await w(p, 500);
    const t = await p.evaluate(() => window.__btLive.state().t);
    await ctx.close();
    assert(t >= 80 && t < 100, 'Rivedi riparte 60 s prima della rossa: ' + t);
    assert(!errs.length, errs.join(' | '));
  },
});
