// Prove delle classifiche del mondiale da Jolpica F1 (src/services/jolpica.js), con le risposte vere del 24/10
// (dopo il GP di Singapore, round 17) salvate in test/fixtures/jolpica-*.json.
// Uso: node test/unit/jolpica.test.js [filtro]
const assert = require('assert');
const J = require('../../src/services/jolpica');
const FX = {
  '/2026/driverstandings.json': require('../fixtures/jolpica-piloti.json'),
  '/2026/constructorstandings.json': require('../fixtures/jolpica-costruttori.json'),
  '/2026/16/driverstandings.json': require('../fixtures/jolpica-piloti-prima.json'),
  '/2026/16/constructorstandings.json': require('../fixtures/jolpica-costruttori-prima.json'),
};
const NOW = Date.parse('2026-10-24T18:00:00Z');

// Jolpica finto: risponde con le fixture, conta le richieste; fail = percorsi che non rispondono.
function fakeFetch({ fail = [], status = 200 } = {}) {
  const calls = [];
  const f = async (url, opts) => {
    calls.push(url);
    const p = url.replace('https://api.jolpi.ca/ergast/f1', '');
    if (fail.some(x => p.includes(x))) throw new TypeError('Failed to fetch');
    if (!FX[p]) return { ok: false, status: 404, json: async () => ({}) };
    return { ok: status === 200, status, json: async () => JSON.parse(JSON.stringify(FX[p])) };
  };
  f.calls = calls;
  return f;
}
const memStore = () => { const m = new Map(); return { get: k => (m.has(k) ? JSON.parse(m.get(k)) : null), set: (k, v) => m.set(k, JSON.stringify(v)), m }; };

let pass = 0, fail = 0;
const tests = [];
const t = (name, fn) => tests.push([name, fn]);

t('classifiche Jolpica: piloti e scuderie con gli id dell\'app, punti e posizioni veri', async () => {
  const f = fakeFetch();
  const st = await J.createJolpica({ fetch: f, now: () => NOW }).standings();
  assert.strictEqual(st.round, 17);
  assert.strictEqual(st.source, 'jolpica');
  assert.deepStrictEqual(st.drivers.slice(0, 3).map(r => [r.id, r.position, r.points]), [['antonelli', 1, 340], ['russell', 2, 238], ['hamilton', 3, 229]]);
  assert.strictEqual(st.drivers.length, 23);
  assert.deepStrictEqual(st.teams.slice(0, 2).map(r => [r.id, r.position, r.points]), [['mercedes', 1, 578], ['ferrari', 2, 444]]);
  assert.strictEqual(st.teams.find(r => r.id === 'racingbulls').points, 100);   // "RB F1 Team"
  assert.strictEqual(st.teams.length, 11);
  // Tsunoda non è tra i 22 titolari: ospite, come nelle classifiche dell'admin
  const yuki = st.drivers.find(r => r.position === 20);
  assert.strictEqual(yuki.id, 'x-tsunoda');
  assert.strictEqual(st.guests['x-tsunoda'].teamId, 'racingbulls');
  assert.ok(/GP di Singapore \(round 17\)/.test(st.note) && /Jolpica/.test(st.note), st.note);
  assert.ok(st.drivers.every(r => r.oldId === undefined), 'gli id dei documenti di oggi non servono');
});

t('classifiche Jolpica: le frecce su e giù dalla classifica dopo la gara prima (round 16)', async () => {
  const st = await J.createJolpica({ fetch: fakeFetch(), now: () => NOW }).standings();
  const prev16 = FX['/2026/16/driverstandings.json'].MRData.StandingsTable.StandingsLists[0].DriverStandings;
  const hamPrev = Number(prev16.find(x => x.Driver.familyName === 'Hamilton').position);
  assert.strictEqual(st.drivers.find(r => r.id === 'hamilton').prev, hamPrev);
  assert.ok(st.drivers.every(r => Number.isInteger(r.prev) && r.prev > 0), 'manca la posizione di prima');
  assert.ok(st.teams.every(r => Number.isInteger(r.prev) && r.prev > 0));
});

t('classifiche Jolpica: si chiede al massimo ogni 30 minuti; la gara prima resta salvata', async () => {
  const store = memStore();
  let now = NOW;
  const f = fakeFetch();
  const J1 = J.createJolpica({ fetch: f, now: () => now, store });
  await J1.standings();
  assert.strictEqual(f.calls.length, 4);
  now += 10 * 60000;
  await J1.standings();
  assert.strictEqual(f.calls.length, 4, 'dopo 10 minuti non si richiede');
  now += 25 * 60000;
  const again = await J1.standings();
  assert.strictEqual(f.calls.length, 6, 'dopo 35 minuti si richiedono solo le classifiche di adesso');
  assert.strictEqual(again.drivers[0].prev, 1);
  // Un'altra apertura dell'app (stessa memoria del telefono): niente richieste per 30 minuti
  const f2 = fakeFetch();
  await J.createJolpica({ fetch: f2, now: () => now + 60000, store }).standings();
  assert.strictEqual(f2.calls.length, 0);
});

t('classifiche Jolpica: senza rete null (o le ultime salvate); risposte strane: null', async () => {
  assert.strictEqual(await J.createJolpica({ fetch: fakeFetch({ fail: ['standings'] }), now: () => NOW }).standings().catch(() => null), null);
  assert.strictEqual(await J.createJolpica({ fetch: fakeFetch({ status: 503 }), now: () => NOW }).standings().catch(() => null), null);
  const store = memStore();
  await J.createJolpica({ fetch: fakeFetch(), now: () => NOW, store }).standings();
  const offline = await J.createJolpica({ fetch: fakeFetch({ fail: ['standings'] }), now: () => NOW + 5 * 3600000, store }).standings();
  assert.strictEqual(offline.round, 17, 'senza rete restano le ultime lette');
  // Risposta senza classifiche o con poche righe: non si usa
  const empty = { MRData: { StandingsTable: { StandingsLists: [] } } };
  const odd = async url => ({ ok: true, status: 200, json: async () => empty });
  assert.strictEqual(await J.createJolpica({ fetch: odd, now: () => NOW }).standings().catch(() => null), null);
  assert.strictEqual(J.toStore(empty, empty), null);
  const few = JSON.parse(JSON.stringify(FX['/2026/driverstandings.json']));
  few.MRData.StandingsTable.StandingsLists[0].DriverStandings.length = 4;
  assert.strictEqual(J.standingsOf(J.toStore(few, FX['/2026/constructorstandings.json'])), null);
});

t('classifiche: si mostrano quelle di Jolpica se non sono più vecchie di quelle dell\'admin', async () => {
  const live = await J.createJolpica({ fetch: fakeFetch(), now: () => NOW }).standings();
  const admin = r => ({ note: `Aggiornata dopo il GP (round ${r})`, drivers: [{ id: 'russell', position: 1, points: 999 }], teams: [], guests: {} });
  assert.strictEqual(J.pick(admin(16), live), live);
  assert.strictEqual(J.pick(admin(17), live), live);
  assert.strictEqual(J.pick(admin(18), live).drivers[0].id, 'russell');   // l'admin è già alla gara dopo
  assert.strictEqual(J.pick({ ...admin(16), note: 'Classifica di prova' }, live), live);   // nota senza round
  assert.strictEqual(J.pick(admin(16), null).drivers[0].id, 'russell');
});

(async () => {
  const filter = process.argv[2] ? new RegExp(process.argv[2], 'i') : null;
  for (const [name, fn] of tests) {
    if (filter && !filter.test(name)) continue;
    try { await fn(); pass++; console.log('PASS  ' + name); }
    catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); }
  }
  console.log(`\n${pass} passati, ${fail} falliti`);
  process.exit(fail ? 1 : 0);
})();
