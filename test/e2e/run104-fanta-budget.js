// 13/11 (bug dei tester: "nel Fanta dopo un certo punto non si riesce più a scegliere la scuderia, es. Mercedes"):
// squadra fatta al listino (107,6 su 108,1) con la Mercedes e i suoi due piloti; dopo un GP andato bene i loro prezzi
// salgono da soli (+0,3 +0,3 +0,6). Prima il budget diventava negativo e, tolta la Mercedes, non si poteva più
// rimettere ("Budget insufficiente"). Ora conta quanto hai pagato: il budget resta 0,5 e la Mercedes si rimette.
// I conti sono in test/unit/fanta-budget.test.js. Uso: node test/build-test.js && node test/e2e/run104-fanta-budget.js
const { open, w, tapSel, goTab, login, assert, run } = require('./helpers');

const NOW = '2026-11-17T10:00:00Z';
const CORS = { 'Access-Control-Allow-Origin': '*' };
const drv = (g, f) => ({ givenName: g, familyName: f });
const RES = [
  { position: '1', positionText: '1', grid: '2', Driver: drv('Andrea Kimi', 'Antonelli'), FastestLap: { rank: '2' } },
  { position: '2', positionText: '2', grid: '1', Driver: drv('George', 'Russell'), FastestLap: { rank: '1' } },
  { position: '3', positionText: '3', grid: '3', Driver: drv('Charles', 'Leclerc') },
  { position: '4', positionText: '4', grid: '5', Driver: drv('Lando', 'Norris') },
  { position: '5', positionText: 'R', grid: '4', Driver: drv('Lewis', 'Hamilton') },
];
const QUALI = [
  { position: '1', Driver: drv('George', 'Russell'), Q3: '1:10.1' },
  { position: '2', Driver: drv('Andrea Kimi', 'Antonelli'), Q3: '1:10.2' },
  { position: '3', Driver: drv('Charles', 'Leclerc'), Q3: '1:10.3' },
];
const page = (field, rows) => ({ MRData: { total: rows ? '1' : '0', RaceTable: { season: '2026', Races: rows ? [{ season: '2026', round: '20', [field]: rows }] : [] } } });
const jolpica = { 'https://api.jolpi.ca/**': r => {
  const u = r.request().url();
  const json = body => r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(body) });
  if (/\/2026\/results\.json/.test(u)) return json(page('Results', RES));
  if (/\/2026\/qualifying\.json/.test(u)) return json(page('QualifyingResults', QUALI));
  if (/\/2026\/sprint\.json/.test(u)) return json(page('SprintResults', null));
  return r.abort();
} };
const SQ = { drivers: ['russell', 'antonelli', 'stroll', 'perez', 'bottas'], teams: ['mercedes', 'audi'] };
const USER = { name: 'Tester', email: 'a@b.it', about: { birth: null, follow: 2, fan: 'vivo' }, app2: { squad: { name: 'Squadra del Tester', ...SQ, boost: 'russell' }, squadBase: SQ } };

run({
  async 'prezzi saliti dopo il GP: il budget non va sotto zero e la Mercedes tolta si può rimettere'(b) {
    const { ctx, p, errs } = await open(b, { now: NOW, seed: { addDocs: { 'users/a@b.it': USER } }, routes: jolpica }); await login(p); await w(p, 1500);
    await goTab(p, 'FANTA'); await w(p, 1200);
    const before = await p.evaluate(() => ({ left: document.querySelector('[data-budget-left]').textContent, card: (document.querySelector('[data-fanta-card="mercedes"]') || { innerText: '' }).innerText.replace(/\s+/g, ' ') }));
    await tapSel(p, '[aria-label^="Togli Mercedes"]'); await w(p, 400);
    const freed = await p.evaluate(() => document.querySelector('[data-budget-left]').textContent);
    await tapSel(p, '[data-fanta-add="teams:0"]'); await w(p, 500);
    const pick = await p.evaluate(() => { const e = document.querySelector('[data-pick="mercedes"]'); return e ? { off: e.disabled, text: e.innerText.replace(/\s+/g, ' ') } : null; });
    await tapSel(p, '[data-pick="mercedes"]'); await w(p, 500);
    const after = await p.evaluate(() => ({ left: document.querySelector('[data-budget-left]').textContent, has: !!document.querySelector('[data-fanta-card="mercedes"]') }));
    await w(p, 1200);
    const saved = await p.evaluate(() => { const d = window.firebase.__fake.doc('users/a@b.it'); return d && d.app2 && d.app2.squad ? { paid: d.app2.squad.paid, gain: d.app2.squad.gain } : null; });
    await ctx.close();
    assert(/34[.,]4/.test(before.card), 'la Mercedes è salita dopo il GP (33,8 → 34,4): ' + before.card + ' | budget ' + before.left);
    assert(/0[.,]5/.test(before.left) && !/-|−/.test(before.left), 'budget a prezzo pagato (0,5), non negativo: ' + before.left);
    assert(/34[.,]9/.test(freed), 'venduta al prezzo di oggi (34,4): liberi 34,9: ' + freed);
    assert(pick && pick.off === false && !/Budget insufficiente/.test(pick.text), 'la Mercedes si può rimettere: ' + JSON.stringify(pick));
    assert(after.has && /0[.,]5/.test(after.left), 'rimessa, budget come prima: ' + JSON.stringify(after));
    assert(saved && saved.paid && saved.paid.teams.mercedes === 34.4 && saved.gain === 0.6, 'prezzo pagato e guadagno salvati nell\'account: ' + JSON.stringify(saved));
    assert(!errs.length, errs.join(' | '));
  },
});
