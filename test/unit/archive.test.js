// Prove del servizio dell'archivio storico (src/services/archive.js): legge dal sito public/data/archivio
// (index.json e <anno>.json, fatti da tools/fastf1_archivio.py con FastF1). Uso: node test/unit/archive.test.js
const assert = require('assert');
const { createArchive, validSeason } = require('../../src/services/archive');

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

(async () => {
  for (const [name, fn] of tests) {
    try { await fn(); pass++; console.log('PASS  ' + name); } catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); }
  }
  console.log(`\n${pass} passati, ${fail} falliti`);
  process.exit(fail ? 1 : 0);
})();
