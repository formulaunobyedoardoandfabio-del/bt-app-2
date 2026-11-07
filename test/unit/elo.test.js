// Prove dell'ELO del FantaF1 (src/logic/elo.js). Uso: node test/unit/elo.test.js
const assert = require('assert');
const E = require('../../src/logic/elo');

let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('PASS  ' + name); } catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); } };
const P = (id, ...pts) => ({ id, rounds: pts.map((p, i) => (p == null ? null : { round: i + 1, pts: p })).filter(Boolean) });

t('tutti partono da 1200; da soli non si gioca (serve almeno un avversario nel GP)', () => {
  const r = E.fantaElo([P('a', 50, 60)]);
  assert.deepStrictEqual(r.rounds, []);
  assert.strictEqual(r.ratings.a.rating, 1200);
  assert.strictEqual(r.ratings.a.games, 0);
});

t('chi vince guadagna quanto perde l\'altro (stessi ELO e stesso K): 40 × ½ = 20', () => {
  const r = E.fantaElo([P('a', 80), P('b', 40)]);
  assert.strictEqual(r.ratings.a.rating, 1220);
  assert.strictEqual(r.ratings.b.rating, 1180);
  assert.strictEqual(r.ratings.a.last, 20);
  assert.strictEqual(r.ratings.b.last, -20);
});

t('pari con lo stesso ELO: nessuno si muove', () => {
  const r = E.fantaElo([P('a', 50), P('b', 50)]);
  assert.strictEqual(r.ratings.a.rating, 1200);
  assert.strictEqual(r.ratings.b.rating, 1200);
});

t('sorpresa: battere chi è più forte vale più che battere chi è più debole', () => {
  // dopo 3 GP "a" è davanti; nel 4° GP "c" (ultimo) batte "a"
  const r = E.fantaElo([P('a', 90, 90, 90, 10), P('b', 50, 50, 50, 50), P('c', 10, 10, 10, 95)]);
  const h = r.ratings.c.history;
  // con K = 24 battere tutti con lo stesso ELO varrebbe 24 × ½ = 12: battere chi è davanti vale di più
  assert.ok(h[3].rating - h[2].rating > 12, 'la rimonta di "c" vale poco: ' + JSON.stringify(h));
  assert.ok(r.ratings.a.last < -12, '"a" battuto da tutti perde poco: ' + r.ratings.a.last);
});

t('K: 40 nei primi 3 GP, poi 24, 16 da 1600 in su', () => {
  assert.strictEqual(E.kOf(0, 1200), 40);
  assert.strictEqual(E.kOf(2, 1500), 40);
  assert.strictEqual(E.kOf(3, 1599), 24);
  assert.strictEqual(E.kOf(10, 1600), 16);
});

t('chi salta un GP resta com\'è in quel GP; la lega grande non pesa più di quella piccola', () => {
  const r = E.fantaElo([P('a', 70, null, 70), P('b', 30, 40, 30), P('c', null, 80, null)]);
  assert.strictEqual(r.ratings.a.games, 2);
  assert.strictEqual(r.ratings.c.games, 1);
  const big = E.fantaElo([P('a', 100), P('b', 10), P('c', 10), P('d', 10), P('e', 10)]);
  assert.strictEqual(big.ratings.a.rating, 1220, 'vincere contro 4 nella prima gara vale come contro 1: ' + big.ratings.a.rating);
});

t('fasce: Esordiente, Pilota titolare, Prima guida, Campione, Leggenda', () => {
  assert.deepStrictEqual([1100, 1150, 1300, 1450, 1600, 1800].map(E.tierOf), ['Esordiente', 'Pilota titolare', 'Prima guida', 'Campione', 'Leggenda', 'Leggenda']);
  assert.strictEqual(E.fantaElo([P('a', 80), P('b', 40)]).ratings.a.tier, 'Pilota titolare');
});

console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
