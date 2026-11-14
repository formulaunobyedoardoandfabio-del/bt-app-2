// Prove di "Riguarda la gara" (src/logic/replay.js): posizioni giro per giro dalle gare vere
// (public/data/f1/weekend.json per il 2026, public/data/archivio/<anno>.json da FastF1 per gli anni prima).
// Uso: node test/unit/replay.test.js
const assert = require('assert');
const R = require('../../src/logic/replay');

let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('PASS  ' + name); } catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); } };
const order = f => f.rows.map(r => r.code).join(',');

// Tre piloti, 3 giri: B passa A al giro 2 (A lento), C dietro.
const RACE = { laps: 3, drivers: {
  AAA: { team: 'ferrari', pos: 2, n: 3, t: [90000, 95000, 90000] },
  BBB: { team: 'mclaren', pos: 1, n: 3, t: [91000, 90000, 90000] },
  CCC: { team: 'haas', pos: 3, n: 3, t: [93000, 93000, 93000] },
} };

t('una fotografia per giro, in ordine di tempo totale, col distacco dal primo', () => {
  const f = R.frames(RACE);
  assert.strictEqual(f.length, 3);
  assert.strictEqual(order(f[0]), 'AAA,BBB,CCC');
  assert.strictEqual(order(f[1]), 'BBB,AAA,CCC', 'sorpasso al giro 2');
  assert.deepStrictEqual(f[1].rows.map(r => r.gap), [0, 4000, 5000]);
  assert.deepStrictEqual(f[1].rows.map(r => r.pos), [1, 2, 3]);
  assert.strictEqual(f[1].lap, 2);
});

t('chi si ritira finisce in fondo (out), ordinato per giri fatti', () => {
  const race = { laps: 3, drivers: { ...RACE.drivers, DDD: { team: 'audi', pos: null, n: 1, t: [89000] }, EEE: { team: 'alpine', pos: null, n: 2, t: [92000, 92000] } } };
  const f = R.frames(race);
  assert.strictEqual(order(f[0]), 'DDD,AAA,BBB,EEE,CCC', 'al giro 1 D è davanti a tutti');
  assert.strictEqual(order(f[2]), 'BBB,AAA,CCC,EEE,DDD');
  assert.deepStrictEqual(f[2].rows.filter(r => r.out).map(r => r.code), ['EEE', 'DDD']);
  assert.strictEqual(f[2].rows.find(r => r.code === 'EEE').gap, null, 'chi è fuori non ha distacco');
});

t('con le posizioni di FastF1 (p) si usano quelle, anche se i tempi direbbero altro', () => {
  const race = { laps: 2, drivers: {
    AAA: { pos: 1, n: 2, t: [90000, 90000], p: [2, 1] },
    BBB: { pos: 2, n: 2, t: [80000, 99000], p: [1, 2] },
  } };
  const f = R.frames(race);
  assert.strictEqual(order(f[0]), 'BBB,AAA');
  assert.strictEqual(order(f[1]), 'AAA,BBB');
});

t('all\'ultimo giro l\'ordine è quello ufficiale (penalità comprese)', () => {
  const race = { laps: 2, drivers: {
    AAA: { pos: 2, n: 2, t: [90000, 90000] },   // primo sul traguardo ma penalizzato
    BBB: { pos: 1, n: 2, t: [90500, 90000] },
  } };
  const f = R.frames(race);
  assert.strictEqual(order(f[1]), 'BBB,AAA');
});

t('un tempo che manca (0) vale come il giro tipico del pilota: la gara continua', () => {
  const race = { laps: 3, drivers: {
    AAA: { pos: 1, n: 3, t: [90000, 0, 90000] },
    BBB: { pos: 2, n: 3, t: [91000, 91000, 91000] },
  } };
  const f = R.frames(race);
  assert.strictEqual(order(f[2]), 'AAA,BBB');
  assert.strictEqual(f[2].rows[1].gap, 3000);
});

t('bandiere del giro: rossa, Safety Car, Virtual Safety Car (dai segni f dei giri)', () => {
  const race = { laps: 4, drivers: {
    AAA: { pos: 1, n: 4, t: [1, 1, 1, 1], f: [0, 4, 8, 32] },
    BBB: { pos: 2, n: 4, t: [2, 2, 2, 2], f: [0, 4, 8, 0] },
  } };
  assert.deepStrictEqual([1, 2, 3, 4].map(l => R.flagAt(race, l)), [null, 'sc', 'vsc', 'red']);
});

t('podio e dati sbagliati: niente errori', () => {
  assert.deepStrictEqual(R.podium(RACE), ['BBB', 'AAA', 'CCC']);
  assert.deepStrictEqual(R.frames(null), []);
  assert.deepStrictEqual(R.frames({ laps: 3, drivers: {} }), []);
  assert.deepStrictEqual(R.frames({ drivers: { AAA: { n: 2, t: 'x' } } }), []);
  assert.deepStrictEqual(R.podium({}), []);
});

console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
