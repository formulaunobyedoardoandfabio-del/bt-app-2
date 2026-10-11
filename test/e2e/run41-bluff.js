// Task 18: rilevatore di bluff con le radio vere di OpenF1. L'admin segna nel Pannello (GARA LIVE) le radio in cui un
// pilota parla di gomme (shared/bt-bluff-<sessione>); nel Garage si vedono con l'audio, il testo e il verdetto.
// La demo con le radio simulate resta solo nella prova DEMO dell'admin (D24, prova in run23).
// Uso: node test/build-test.js && node test/e2e/run41-bluff.js [filtro]
const { open, w, text, norm, inner, inners, count, has, tapText, tapSel, goTab, login, openAdmin, assert, run } = require('./helpers');
const FX = require('../fixtures/openf1-baku-race.json');

const CORS = { 'Access-Control-Allow-Origin': '*' };
const BAKU_LIVE = { 'shared/bt-races': { __arr: [{ id: 'r15', name: "GP dell'Azerbaigian", circuit: 'Baku City Circuit', country: 'Azerbaigian', round: 15, date: '2026-09-26T15:00:00', status: 'LIVE', totalLaps: 51, circuitId: 'az-2016' }] } };
const BLUFF_DOC = 'shared/bt-bluff-' + FX.session.session_key;
const EXPLAIN = "Durante la gara l'admin segna le radio in cui un pilota parla di gomme: qui vedrai se era vero o un bluff.";
// OpenF1 finto con la gara vera di Baku 2026 (test/fixtures).
const routesFor = (session = FX.session) => ({ 'https://api.openf1.org/v1/**': async r => {
  const u = new URL(r.request().url()), path = u.pathname.replace(/^\/v1\//, ''), q = decodeURIComponent(u.search.slice(1));
  const json = (st, b) => r.fulfill({ status: st, contentType: 'application/json', headers: CORS, body: JSON.stringify(b) });
  if (path === 'sessions') return /session_name=Race/.test(q) && !/session_key/.test(q) ? json(404, { detail: 'No results found.' }) : json(200, [session]);
  const l = FX[path];
  return Array.isArray(l) && l.length ? json(200, l) : json(404, { detail: 'No results found.' });
} });
const routes = routesFor();
const waitReplay = p => p.waitForFunction(() => window.__btLive && window.__btLive.state().cars.length > 0, null, { timeout: 15000 }).then(() => true, () => false);
const back2 = async p => { await tapSel(p, '[aria-label="Indietro"]'); await w(p); await tapSel(p, '[aria-label="Indietro"]'); await w(p); };
const openBluff = async p => { await goTab(p, 'GARAGE'); await tapSel(p, '[data-game="bluff"]'); await w(p, 600); };

run({
  async 'admin segna una radio di Russell: nel Garage compare con audio e verdetto'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: BAKU_LIVE }, routes }); await login(p);
    await goTab(p, 'RACE'); const ok = await waitReplay(p);
    await openAdmin(p, 'GARA LIVE');
    const radios = await p.evaluate(() => [...document.querySelectorAll('[data-bluff-radio]')].map(e => ({ code: e.getAttribute('data-bluff-radio'), t: e.innerText.replace(/\s+/g, ' '), audio: !!e.querySelector('audio[controls]') })));
    await p.fill('[data-bluff-radio="RUS"] input', 'Le gomme sono finite!');
    await tapSel(p, '[data-bluff-radio="RUS"] [data-bluff-tag]'); await w(p, 800);
    const doc = await p.evaluate(k => window.firebase.__fake.doc(k), BLUFF_DOC);
    const tagged = norm(await inner(p, '[data-bluff-radio="RUS"]'));
    await back2(p); await openBluff(p);
    const tool = norm(await inner(p, '[data-bluff]'));
    const items = await p.evaluate(() => [...document.querySelectorAll('[data-bluff-item]')].map(e => ({ kind: e.getAttribute('data-bluff-item'), t: e.innerText.replace(/\s+/g, ' '), src: (e.querySelector('audio[controls]') || {}).src || null })));
    await ctx.close();
    assert(ok, 'la sessione di OpenF1 non arriva');
    assert(radios.length === 3 && radios.every(r => r.audio) && /Russell/.test(radios[0].t) && /Giro 20/.test(radios[0].t), 'radio della sessione nel Pannello: ' + JSON.stringify(radios));
    const arr = doc && (doc.__arr || doc);
    assert(Array.isArray(arr) && arr.length === 1 && arr[0].code === 'RUS' && arr[0].lap === 20 && arr[0].text === 'Le gomme sono finite!' && arr[0].by === 'Tester' && arr[0].date === FX.team_radio[0].date, 'radio segnata su Firebase: ' + JSON.stringify(doc));
    assert(/Le gomme sono finite!/.test(tagged) && /Togli/.test(tagged), 'radio segnata nel Pannello: ' + tagged);
    assert(items.length === 1, 'radio nel rilevatore: ' + JSON.stringify(items));
    const it = items[0];
    assert(['bluff', 'vero', 'dubbio'].includes(it.kind) && /BLUFF PROBABILE|RADIO VERA|DA CAPIRE/.test(it.t), 'verdetto: ' + it.t);
    assert(/Russell/.test(it.t) && /Giro 20/.test(it.t) && /Le gomme sono finite!/.test(it.t) && /(Nei 3 giri dopo|Troppi giri lenti|rientrato ai box)/.test(it.t), 'radio, testo e spiegazione: ' + it.t);
    assert(it.src === FX.team_radio[0].recording_url, 'audio della radio: ' + it.src);
    assert(!/simulat/i.test(tool), 'il rilevatore dice ancora "simulate": ' + tool.slice(0, 300));
    assert(!errs.length, errs.join(' | '));
  },
  async 'senza radio segnate: la spiegazione, nessuna radio inventata'(b) {
    const a = await open(b, { seed: { addDocs: BAKU_LIVE }, routes }); await login(a.p);
    await goTab(a.p, 'RACE'); await waitReplay(a.p); await openBluff(a.p);
    const t1 = norm(await inner(a.p, '[data-bluff]')), n1 = await count(a.p, '[data-bluff-item]'); await a.ctx.close();
    const c = await open(b); await login(c.p); await openBluff(c.p);
    const t2 = norm(await inner(c.p, '[data-bluff]')), n2 = await count(c.p, '[data-bluff-item]'); await c.ctx.close();
    assert(t1.includes(EXPLAIN) && n1 === 0 && !/simulat/i.test(t1), 'gara LIVE senza radio segnate: ' + t1.slice(0, 300));
    assert(t2.includes(EXPLAIN) && n2 === 0 && !/simulat/i.test(t2), 'senza gara LIVE: ' + t2.slice(0, 300));
    assert(!a.errs.length && !c.errs.length, [...a.errs, ...c.errs].join(' | '));
  },
  async 'la stessa radio segnata due volte conta una volta; "Togli" la toglie dal rilevatore'(b) {
    const d = FX.team_radio[0].date;
    const twice = [{ code: 'RUS', date: d, lap: 20, text: 'Gomme finite', by: 'A' }, { code: 'RUS', date: d, lap: 20, text: 'Non ho grip', by: 'B' }];
    const { ctx, p, errs } = await open(b, { seed: { addDocs: { ...BAKU_LIVE, [BLUFF_DOC]: { __arr: twice } } }, routes }); await login(p);
    await goTab(p, 'RACE'); const ok = await waitReplay(p);
    await openBluff(p); const n1 = await count(p, '[data-bluff-item]');
    await tapSel(p, '[aria-label="Indietro"]'); await w(p);
    await openAdmin(p, 'GARA LIVE');
    const tagged = norm(await inner(p, '[data-bluff-radio="RUS"]'));
    await tapSel(p, '[data-bluff-radio="RUS"] [data-bluff-untag]'); await w(p, 800);
    const doc = await p.evaluate(k => window.firebase.__fake.doc(k), BLUFF_DOC);
    const again = await has(p, '[data-bluff-radio="RUS"] [data-bluff-tag]');
    await back2(p); await openBluff(p);
    const t2 = norm(await inner(p, '[data-bluff]')), n2 = await count(p, '[data-bluff-item]');
    await ctx.close();
    assert(ok, 'la sessione di OpenF1 non arriva');
    assert(n1 === 1, 'radio segnata due volte: ' + n1 + ' voci');
    assert(/Gomme finite/.test(tagged) && /Togli/.test(tagged), 'radio segnata nel Pannello: ' + tagged);
    const arr = doc && (doc.__arr || doc);
    assert(Array.isArray(arr) && arr.length === 0, 'dopo "Togli" su Firebase: ' + JSON.stringify(doc));
    assert(again, 'dopo "Togli" si può segnare di nuovo');
    assert(n2 === 0 && t2.includes(EXPLAIN), 'rilevatore dopo "Togli": ' + t2.slice(0, 300));
    assert(!errs.length, errs.join(' | '));
  },
  async 'in qualifica il Pannello non fa segnare radio'(b) {
    const quali = { ...FX.session, session_name: 'Qualifying', session_type: 'Qualifying' };
    const { ctx, p, errs } = await open(b, { seed: { addDocs: BAKU_LIVE }, routes: routesFor(quali) }); await login(p);
    await goTab(p, 'RACE'); const ok = await waitReplay(p);
    await openAdmin(p, 'GARA LIVE');
    const card = norm(await inner(p, '[data-admin-bluff]')), n = await count(p, '[data-bluff-radio]');
    await ctx.close();
    assert(ok, 'la sessione di OpenF1 non arriva');
    assert(n === 0 && /guarda la gara e la sprint/.test(card), 'qualifica nel Pannello: ' + card);
    assert(!errs.length, errs.join(' | '));
  },
  async 'senza la sessione vera il Pannello dice quando arrivano le radio'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await openAdmin(p, 'GARA LIVE');
    const card = norm(await inner(p, '[data-admin-bluff]')), n = await count(p, '[data-bluff-radio]');
    await ctx.close();
    assert(n === 0 && /arrivano con la sessione vera della gara LIVE/.test(card), 'Pannello senza sessione: ' + card);
    assert(!errs.length, errs.join(' | '));
  },
});
