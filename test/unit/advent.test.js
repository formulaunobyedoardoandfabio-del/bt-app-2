// Griglia dell'Avvento (31/10, src/logic/advent.js): 24 caselle, una al giorno di dicembre (ora di Roma), con fatti
// veri della stagione presi dai dati dell'app (gare e qualifiche di real-weekend.js). Niente numeri inventati.
// Uso: node test/unit/advent.test.js
const assert = require('assert');
const A = require('../../src/logic/advent');
const W = require('../../src/data/real-weekend.js');
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('PASS  ' + name); } catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); } };
const at = s => Date.parse(s);
const facts = A.adventFacts({ races: W.races, quali: W.quali, nameOf: c => 'Pilota ' + c, gpOf: cid => 'GP ' + cid });

t('24 fatti, tutti testo vero dai dati (vincitore e pole per GP, poi i record della stagione)', () => {
  assert.strictEqual(facts.length, 24);
  assert.ok(facts.every(f => typeof f === 'string' && f.length > 10), 'fatti vuoti');
  const r1 = W.races.slice().sort((a, b) => a.round - b.round)[0];
  const win = Object.entries(r1.drivers).find(([, d]) => d.pos === 1)[0];
  assert.ok(facts[0].includes('GP ' + r1.circuitId) && facts[0].includes('Pilota ' + win), 'casella 1: ' + facts[0]);
  assert.ok(facts.some(f => /vittorie/.test(f)), 'manca il record di vittorie');
  assert.strictEqual(new Set(facts).size, 24, 'fatti ripetuti');
});
t('si aprono solo le caselle fino a oggi, a dicembre (giorno di Roma)', () => {
  assert.strictEqual(A.openableUpTo(at('2026-11-30T10:00:00Z')), 0);
  assert.strictEqual(A.openableUpTo(at('2026-12-01T00:30:00Z')), 1);
  assert.strictEqual(A.openableUpTo(at('2026-12-07T10:00:00Z')), 7);
  assert.strictEqual(A.openableUpTo(at('2026-12-26T10:00:00Z')), 24);
  assert.strictEqual(A.openableUpTo(at('2027-01-03T10:00:00Z')), 0);
});
t('tutte aperte: 24 caselle diverse dell\'anno; il pacco dal 25 dicembre', () => {
  assert.strictEqual(A.allOpen(Array.from({ length: 24 }, (_, i) => i + 1)), true);
  assert.strictEqual(A.allOpen([1, 2, 3, 3]), false);
  assert.strictEqual(A.giftReady(at('2026-12-24T22:00:00Z')), false);
  assert.strictEqual(A.giftReady(at('2026-12-24T23:30:00Z')), true, 'mezzanotte del 25 a Roma');
});

console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
