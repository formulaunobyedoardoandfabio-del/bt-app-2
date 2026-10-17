// Prove della zona eliminazione delle leghe del FantaF1 (Tappa 3, G22; src/logic/qzones.js): nelle proporzioni delle
// qualifiche 2026 (22 vetture: 6 fuori in Q1, 6 fuori in Q2), con N squadre le ultime round(N × 6 / 22) righe sono la
// "Zona Q1", le round(N × 6 / 22) prima la "Zona Q2"; con meno di 10 squadre niente zone. Gira in Node.
// Uso: node test/unit/qzones.test.js [filtro]
const assert = require('assert');
const path = require('path');
const { qZones, zoneOf } = require(path.join(__dirname, '..', '..', 'src', 'logic', 'qzones.js'));

const tests = {
  'qZones(22) = 6 e 6, qZones(10) = 3 e 3, qZones(9) = 0'() {
    assert.deepStrictEqual(qZones(22), { q1: 6, q2: 6 });
    assert.deepStrictEqual(qZones(10), { q1: 3, q2: 3 });   // 10 × 6 / 22 = 2,7 → 3
    assert.deepStrictEqual(qZones(9), { q1: 0, q2: 0 });
    assert.deepStrictEqual(qZones(12), { q1: 3, q2: 3 });   // 3,27 → 3
    assert.deepStrictEqual(qZones(15), { q1: 4, q2: 4 });   // 4,09 → 4
    assert.deepStrictEqual(qZones(0), { q1: 0, q2: 0 });
    assert.deepStrictEqual(qZones(-3), { q1: 0, q2: 0 });
    assert.deepStrictEqual(qZones(NaN), { q1: 0, q2: 0 });
  },
  'zoneOf: la zona di ogni posizione (1 = primo)'() {
    // 12 squadre: 1-6 Q3, 7-9 Zona Q2, 10-12 Zona Q1.
    assert.deepStrictEqual([1, 6, 7, 9, 10, 12].map(p => zoneOf(p, 12)), ['q3', 'q3', 'q2', 'q2', 'q1', 'q1']);
    assert.deepStrictEqual([1, 5, 9].map(p => zoneOf(p, 9)), ['q3', 'q3', 'q3']);   // meno di 10: niente zone
  },
};

let pass = 0, fail = 0;
const filter = process.argv[2] ? new RegExp(process.argv[2], 'i') : null;
for (const [name, fn] of Object.entries(tests)) {
  if (filter && !filter.test(name)) continue;
  try { fn(); pass++; console.log('PASS  ' + name); }
  catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + String(e.message).split('\n')[0].slice(0, 300)); }
}
console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
