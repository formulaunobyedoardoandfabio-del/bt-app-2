// Prove della calcolatrice del Mondiale (src/logic/champ-calc.js). Uso: node test/unit/champ-calc.test.js
const assert = require('assert');
const K = require('../../src/logic/champ-calc');
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('PASS  ' + name); } catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); } };
const EV = [{ id: 'r21:s', sprint: true }, { id: 'r21', sprint: false }, { id: 'r22', sprint: false }];

t('punti del regolamento: GP e Sprint, fuori dai punti 0', () => {
  assert.deepStrictEqual([1, 2, 3, 10, 11, null].map(p => K.ptsOf(p)), [25, 18, 15, 1, 0, 0]);
  assert.deepStrictEqual([1, 8, 9].map(p => K.ptsOf(p, true)), [8, 1, 0]);
});

t('punti in palio: pilota 25 a GP e 8 a Sprint; squadra 43 e 15', () => {
  assert.strictEqual(K.maxLeft(EV), 58);
  assert.strictEqual(K.maxLeft(EV, 'costruttori'), 101);
});

t('chi può ancora vincere: fuori chi non arriva al primo nemmeno vincendo tutto', () => {
  const c = K.contenders([{ id: 'b', points: 300 }, { id: 'a', points: 340 }, { id: 'c', points: 282 }, { id: 'd', points: 281 }], EV);
  assert.deepStrictEqual(c.map(r => [r.id, r.gap, r.alive]), [['a', 0, true], ['b', 40, true], ['c', 58, true], ['d', 59, false]]);
  assert.strictEqual(c[1].best, 358);
});

t('scenario fra due: totali, e deciso quando il vantaggio supera i punti delle gare non scelte', () => {
  const a = { points: 340 }, b = { points: 300 };
  const s1 = K.scenario({ a, b, events: EV, picks: { 'r21:s': { a: 1, b: 2 } } });
  assert.deepStrictEqual([s1.pa, s1.pb, s1.openLeft, s1.decided], [348, 307, 50, null]);
  const s2 = K.scenario({ a, b, events: EV, picks: { 'r21:s': { a: 1, b: 2 }, r21: { a: 1, b: null } } });
  assert.deepStrictEqual([s2.pa, s2.pb, s2.openLeft, s2.decided], [373, 307, 25, 'a']);
});

t('scenario: se scegli solo un pilota, i punti dell\'altro in quella gara restano aperti (senza il posto già preso)', () => {
  const a = { points: 330 }, b = { points: 300 };
  const s = K.scenario({ a, b, events: EV, picks: { r21: { a: 1 } } });
  // b può ancora fare 8 nella Sprint, 18 nel GP r21 (il 1° è di a) e 25 nel GP r22: 51; a è avanti di 55.
  assert.deepStrictEqual([s.pa, s.pb, s.openB, s.openLeft, s.decided], [355, 300, 51, 51, 'a']);
  const s2 = K.scenario({ a, b, events: EV, picks: { r21: { a: 3 } } });
  // a 3° nel GP: b può ancora vincerlo (25), quindi 58 aperti e a avanti di 45: non deciso.
  assert.deepStrictEqual([s2.pa, s2.openB, s2.decided], [345, 58, null]);
});

t('scenario costruttori: le posizioni delle due auto', () => {
  const s = K.scenario({ a: { points: 500 }, b: { points: 480 }, events: [{ id: 'r22', sprint: false }], picks: { r22: { a: [1, 5], b: [2, 3] } }, kind: 'costruttori' });
  assert.deepStrictEqual([s.pa, s.pb, s.decided], [535, 513, 'a']);
});

t('gare rimaste dal calendario: niente gare finite, la Sprint prima del GP', () => {
  const now = Date.parse('2026-11-08T10:00:00Z');
  const races = [
    { id: 'r20', name: 'Brasile', date: '2026-11-08T17:00:00Z', status: 'IN ARRIVO' },
    { id: 'r19', name: 'Messico', date: '2026-11-01T20:00:00Z', status: 'CONCLUSA' },
    { id: 'r21', name: 'Las Vegas', date: '2026-11-21T04:00:00Z', status: 'IN ARRIVO' },
  ];
  const ev = K.eventsLeft(races, now, { isSprint: r => r.id === 'r20' });
  assert.deepStrictEqual(ev.map(e => e.id), ['r20:s', 'r20', 'r21']);
});

console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
