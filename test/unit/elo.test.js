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

// ── 14/11 (Edoardo: "crea nuovo modo di calcolare Elo"): ELO B&T, un'unica classifica per tutta la lega B&T ──
// Punteggio del GP = 85% posizione tra chi ha giocato + 15% quanto sei vicino al migliore; atteso contro la media
// degli ELO degli altri; K 48 nei primi 3 GP, 32 fino al 10°, poi 20 (16 da 1700 in su).
t('ELO B&T: primo GP in due, stessi ELO: chi vince +24, chi perde -24 (K 48 × ½)', () => {
  const r = E.btElo([P('a', 80), P('b', 40)]);
  assert.strictEqual(r.ratings.a.rating, 1224);
  assert.strictEqual(r.ratings.b.rating, 1176);
  assert.strictEqual(r.ratings.a.last, 24);
  assert.deepStrictEqual(r.rounds, [1]);
});

t('ELO B&T: conta di quanto si vince, non solo la posizione (il 15% sul migliore)', () => {
  const close = E.btElo([P('a', 100), P('b', 99), P('c', 10)]).ratings.b.rating;
  const far = E.btElo([P('a', 100), P('b', 20), P('c', 10)]).ratings.b.rating;
  assert.ok(close > far, 'secondo a un punto dal primo vale più del secondo staccato: ' + close + ' vs ' + far);
  assert.strictEqual(far, 1200 + Math.round(48 * (0.85 * 0.5 + 0.15 * (10 / 90) - 0.5)));
});

t('ELO B&T: in un campo grande l\'ultimo perde più del penultimo, il primo guadagna più del secondo', () => {
  const ps = [P('a', 90), P('b', 80), P('c', 70), P('d', 60), P('e', 50)];
  const r = E.btElo(ps).ratings, v = ['a', 'b', 'c', 'd', 'e'].map(k => r[k].rating);
  for (let i = 1; i < v.length; i++) assert.ok(v[i - 1] > v[i], 'ordine rispettato: ' + v.join(', '));
  assert.strictEqual(r.c.rating, 1200 + Math.round(48 * (0.85 * 0.5 + 0.15 * 0.5 - 0.5)));
});

t('ELO B&T: battere un campo più forte vale di più (atteso contro la media degli altri)', () => {
  // GP 1: x e y battono w e salgono (w scende); GP 2 senza w: z, nuovo a 1200, vince contro x e y.
  const strong = E.btElo([P('x', 90, 10), P('y', 80, 10), P('w', 10, null), P('z', null, 50)]).ratings.z.last;
  const plain = E.btElo([P('x', 10, 10), P('y', 10, 10), P('w', 10, null), P('z', null, 50)]).ratings.z.last;
  assert.ok(strong > plain, 'vincere contro chi è salito vale di più: ' + strong + ' vs ' + plain);
});

t('ELO B&T: K 48 nei primi 3 GP, 32 fino al 10°, poi 20; 16 da 1700 in su', () => {
  assert.deepStrictEqual([0, 2, 3, 9, 10, 40].map(g => E.btK(g, 1300)), [48, 48, 32, 32, 20, 20]);
  assert.strictEqual(E.btK(20, 1700), 16);
  assert.strictEqual(E.btK(1, 1800), 48, 'nei primi GP conta solo il numero di GP');
});

t('ELO B&T: stesso risultato in qualunque ordine arrivino i giocatori; chi salta un GP resta fermo', () => {
  const a = E.btElo([P('a', 60, 30), P('b', 40, null), P('c', 50, 70)]);
  const b = E.btElo([P('c', 50, 70), P('a', 60, 30), P('b', 40, null)]);
  assert.deepStrictEqual(a.ratings, b.ratings);
  assert.strictEqual(a.ratings.b.games, 1);
  assert.strictEqual(a.ratings.b.history.length, 1);
  assert.deepStrictEqual(a.rounds, [1, 2]);
});

t('ELO B&T: tutti a pari punti = nessuno si muove; da soli non si gioca; dati sporchi ignorati', () => {
  const r = E.btElo([P('a', 40), P('b', 40), P('c', 40)]);
  assert.deepStrictEqual(['a', 'b', 'c'].map(k => r.ratings[k].rating), [1200, 1200, 1200]);
  assert.deepStrictEqual(E.btElo([P('a', 50)]).rounds, []);
  const d = E.btElo([null, { id: 'a', rounds: [{ round: 1, pts: NaN }, null] }, P('b', 10)]);
  assert.deepStrictEqual(d.rounds, []);
  assert.strictEqual(d.ratings.a.rating, 1200);
});

console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
