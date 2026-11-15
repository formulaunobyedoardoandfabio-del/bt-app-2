// Prove del servizio dell'archivio storico (src/services/archive.js): legge dal sito public/data/archivio
// (index.json e <anno>.json, fatti da tools/fastf1_archivio.py con FastF1). Uso: node test/unit/archive.test.js
const assert = require('assert');
const { createArchive, validSeason, findReplay } = require('../../src/services/archive');

let pass = 0, fail = 0;
const tests = [];
const t = (name, fn) => tests.push([name, fn]);
const RACE = { round: 1, name: "GP d'Australia", place: 'Melbourne', date: '2025-03-16', circuitId: 'au-1953', laps: 2, drivers: { NOR: { team: 'mclaren', pos: 1, n: 2, t: [90000, 90000] } } };
const INDEX = { source: 'FastF1', years: [{ year: 2024, races: 24, h: 'aaa' }, { year: 2025, races: 24, h: 'bbb' }] };
const SEASON = { year: 2025, source: 'FastF1', races: [RACE] };
function fakeFetch(files) {
  const calls = [];
  const f = url => { calls.push(url); const k = Object.keys(files).find(x => url.includes(x)); if (!k) return Promise.resolve({ ok: false, status: 404, json: () => Promise.reject(new Error('404')) }); return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(files[k]) }); };
  f.calls = calls;
  return f;
}

t('anni dall\'indice, dal più recente; ogni anno si scarica una volta sola', async () => {
  const f = fakeFetch({ 'index.json': INDEX, '2025.json': SEASON });
  const A = createArchive({ fetch: f, base: 'https://x/archivio/' });
  const idx = await A.index();
  assert.deepStrictEqual(idx.map(y => y.year), [2025, 2024]);
  const s1 = await A.season(2025), s2 = await A.season(2025);
  assert.strictEqual(s1.races[0].name, "GP d'Australia");
  assert.strictEqual(s1, s2);
  assert.strictEqual(f.calls.filter(u => u.includes('2025.json')).length, 1);
  assert.ok(f.calls.find(u => u.includes('2025.json')).includes('h=bbb'), 'con l\'impronta: il file nuovo non resta in cache');
});

t('senza rete o file rotto: null, e la volta dopo si riprova', async () => {
  let fails = true;
  const f = url => (fails ? Promise.reject(new Error('rete')) : fakeFetch({ 'index.json': INDEX })(url));
  const A = createArchive({ fetch: f, base: 'https://x/' });
  assert.strictEqual(await A.index(), null);
  fails = false;
  assert.strictEqual((await A.index()).length, 2);
  const B = createArchive({ fetch: fakeFetch({ 'index.json': { years: 'no' }, '2025.json': { year: 2025, races: [{ round: 1 }] } }), base: 'https://x/' });
  assert.strictEqual(await B.index(), null);
  assert.strictEqual(await B.season(2025), null);
});

t('validSeason: solo stagioni con gare fatte bene', async () => {
  assert.ok(validSeason(SEASON));
  assert.ok(!validSeason(null));
  assert.ok(!validSeason({ year: 2025, races: [{ round: 1, drivers: null }] }));
  assert.ok(!validSeason({ year: 'x', races: [] }));
});

// 15/11: replay sulla mappa (public/data/replay, tools/openf1_replay.py)
const RINDEX = { source: 'OpenF1', races: [{ key: 11412, year: 2026, date: '2026-11-08', name: 'GP di San Paolo', h: 'r1' }, { key: 9999, year: 2025, date: '2025-03-16', name: "GP d'Australia", h: 'r2' }] };
const RFILE = { v: 1, key: 11412, L: 4230, line: [[0, 0], [1, 0], [1, 1]], drivers: [{ code: 'NOR', p: [0, 1] }] };

t('replay: elenco dal sito, file con l\'impronta, una volta sola', async () => {
  const f = fakeFetch({ 'replay/index.json': RINDEX, 'replay/11412.json': RFILE });
  const A = createArchive({ fetch: f, base: 'https://x/archivio/', replayBase: 'https://x/replay/' });
  const list = await A.replays();
  assert.strictEqual(list.length, 2);
  const r1 = await A.replay(11412), r2 = await A.replay(11412);
  assert.strictEqual(r1.key, 11412);
  assert.strictEqual(r1, r2);
  assert.strictEqual(f.calls.filter(u => u.includes('11412.json')).length, 1);
  assert.ok(f.calls.find(u => u.includes('11412.json')).includes('h=r1'));
  const B = createArchive({ fetch: fakeFetch({ 'replay/index.json': RINDEX, 'replay/11412.json': { v: 1, line: [] } }), replayBase: 'https://x/replay/' });
  assert.strictEqual(await B.replay(11412), null, 'file rotto: null');
});

t('replay: la gara si trova dalla data (un giorno di tolleranza per i fusi)', async () => {
  assert.strictEqual(findReplay(RINDEX.races, '2026-11-08').key, 11412);
  assert.strictEqual(findReplay(RINDEX.races, '2026-11-09').key, 11412);
  assert.strictEqual(findReplay(RINDEX.races, '2026-11-11'), null);
  assert.strictEqual(findReplay(null, '2026-11-08'), null);
  assert.strictEqual(findReplay(RINDEX.races, ''), null);
});

(async () => {
  for (const [name, fn] of tests) {
    try { await fn(); pass++; console.log('PASS  ' + name); } catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); }
  }
  console.log(`\n${pass} passati, ${fail} falliti`);
  process.exit(fail ? 1 : 0);
})();
