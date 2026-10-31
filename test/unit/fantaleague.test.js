// Prove delle leghe FantaF1 vere (31/10; src/services/fantaleague.js): risultati di Jolpica a pagine e in cache, leghe
// su Firebase (fanta/lega-<CODICE>), storia della squadra scritta nel proprio membro, classifica coi punti veri.
// Uso: node test/unit/fantaleague.test.js [filtro]
const assert = require('assert');
const { setupWindow } = require('./node-window');
const F = require('../../src/services/firebase');
const { createFantaLeague } = require('../../src/services/fantaleague');

const NOW = Date.parse('2026-10-31T10:00:00Z');
const drv = (g, f) => ({ givenName: g, familyName: f });
const R = (pos, grid, d) => ({ position: String(pos), positionText: String(pos), grid: String(grid), status: 'Finished', Driver: d });
const PAGES = {
  results: [{ round: '1', Results: [R(1, 1, drv('Charles', 'Leclerc')), R(2, 2, drv('Lewis', 'Hamilton'))] }],
  qualifying: [], sprint: [],
};
function fakeFetch(fail = false) {
  const calls = [];
  const f = async url => {
    calls.push(url.replace('https://api.jolpi.ca/ergast/f1', ''));
    if (fail) throw new Error('rete');
    const kind = /2026\/(\w+)\.json/.exec(url)[1];
    return { ok: true, json: async () => ({ MRData: { total: String(PAGES[kind].length ? 2 : 0), RaceTable: { Races: PAGES[kind] } } }) };
  };
  f.calls = calls;
  return f;
}
const mem = () => { const m = new Map(); return { get: k => (m.has(k) ? JSON.parse(m.get(k)) : null), set: (k, v) => m.set(k, JSON.stringify(v)) }; };
const ME = { aid: 'ume', name: 'Tester', team: 'Scuderia Prova' }, MARCO = { aid: 'umarco', name: 'Marco', team: 'Box Boys' };
const SQ = { t: 10, d: ['leclerc', 'hamilton', 'antonelli', 'russell', 'norris'], c: ['ferrari', 'mercedes'], b: 'leclerc' };

const tests = [];
const t = (name, fn) => tests.push([name, fn]);

t('risultati: pagine di Jolpica, poi dalla cache per 3 ore; senza rete gli ultimi letti', async () => {
  const f = fakeFetch(), store = mem();
  const L = createFantaLeague({ fetch: f, now: () => NOW, store });
  const r = await L.results();
  assert.deepStrictEqual(r.map(x => x.round), [1]);
  assert.ok(f.calls.includes('/2026/results.json?limit=100&offset=0'), f.calls.join(' '));
  const n = f.calls.length;
  await L.results();
  assert.strictEqual(f.calls.length, n, 'dalla cache');
  const later = createFantaLeague({ fetch: fakeFetch(true), now: () => NOW + 4 * 3600000, store });
  assert.deepStrictEqual((await later.results()).map(x => x.round), [1], 'senza rete: gli ultimi letti');
});

t('lega: creata, un amico entra col codice, la storia della squadra va nel proprio membro, classifica coi punti veri', async () => {
  const { firebase } = setupWindow({});
  const L = createFantaLeague({ fetch: fakeFetch(), now: () => NOW, store: mem(), dbGet: F.dbGet, dbSet: F.dbSet, rand: () => 0.1 });
  const lg = await L.createLeague('  Amici del Bar ', ME, [SQ]);
  assert.ok(/^BT-[A-Z0-9]{4}$/.test(lg.code), lg.code);
  assert.strictEqual(lg.name, 'Amici del Bar');
  assert.strictEqual(lg.owner, 'ume');
  await assert.rejects(L.joinLeague('BT-ZZZZ', MARCO, []), e => e.code === 'not-found');
  const j = await L.joinLeague(lg.code.toLowerCase(), MARCO, []);
  assert.deepStrictEqual(j.members.map(m => m.name).sort(), ['Marco', 'Tester']);
  await L.pushLog([lg.code], { ...MARCO, team: 'Box Boys 2' }, [{ ...SQ, t: 20, b: 'hamilton' }]);
  const doc = firebase.__fake.doc('fanta/lega-' + lg.code);
  assert.strictEqual(doc.members.umarco.team, 'Box Boys 2');
  assert.strictEqual(doc.members.ume.log.length, 1, 'il membro degli altri non si tocca');
  const st = L.standings(await L.loadLeague(lg.code), await L.results(), () => 100);
  assert.deepStrictEqual(st.map(m => m.name), ['Tester', 'Marco']);   // il 2X su Leclerc (1°) vale più del 2X su Hamilton (2°)
  assert.ok(st[0].pts > st[1].pts && st[1].pts > 0, JSON.stringify(st.map(m => m.pts)));
  // Eliminazione dell'account: nelle sue leghe resta solo "uscito", senza nome né storia.
  firebase.__fake.setDoc('users/marco@b.it', { name: 'Marco', app2: { leagues: [lg.code] } });
  await L.cleanupFor({ email: 'marco@b.it', aid: 'umarco' });
  assert.deepStrictEqual(firebase.__fake.doc('fanta/lega-' + lg.code).members.umarco, { name: '', team: '', color: doc.members.umarco.color, log: [], bonus: 0, gone: true });
  await L.leaveLeague(lg.code, 'umarco');
  assert.deepStrictEqual((await L.loadLeague(lg.code)).members.map(m => m.name), ['Tester']);
});

(async () => {
  let pass = 0, fail = 0;
  const filter = process.argv[2] ? new RegExp(process.argv[2], 'i') : null;
  for (const [name, fn] of tests) {
    if (filter && !filter.test(name)) continue;
    try { await fn(); pass++; console.log('PASS  ' + name); }
    catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + String(e.message).split('\n')[0].slice(0, 300)); }
  }
  console.log(`\n${pass} passati, ${fail} falliti`);
  process.exit(fail ? 1 : 0);
})();
