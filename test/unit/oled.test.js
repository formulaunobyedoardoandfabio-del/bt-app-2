// Protezione OLED della modalità TV (8/11): spostamento di pochi pixel ogni minuto, schermo che si abbassa se non lo
// tocchi, risveglio quando cambia la bandiera. Uso: node test/unit/oled.test.js
const assert = require('assert');
const O = require('../../src/logic/oled');
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('PASS  ' + name); } catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); } };

t('spostamento: cambia ogni minuto, mai più di 3 pixel, torna al punto di partenza dopo un giro completo', () => {
  const a = O.pixelShift(0), b = O.pixelShift(59e3), c = O.pixelShift(60e3);
  assert.deepStrictEqual(a, b, 'dentro lo stesso minuto resta fermo');
  assert.notDeepStrictEqual(a, c, 'al minuto dopo si sposta');
  for (let m = 0; m < 40; m++) { const s = O.pixelShift(m * 60e3); assert.ok(Math.abs(s.x) <= 3 && Math.abs(s.y) <= 3, JSON.stringify(s)); }
  assert.deepStrictEqual(O.pixelShift(O.PATH.length * 60e3), a);
  const seen = new Set(O.PATH.map(p => p.join(',')));
  assert.ok(seen.size === O.PATH.length && seen.size >= 8, 'punti tutti diversi');
});

t('schermo che si abbassa: normale per 5 minuti, poi più scuro, poi ancora (mai nero del tutto)', () => {
  assert.strictEqual(O.dimFor(4 * 60e3), 0);
  assert.strictEqual(O.dimFor(5 * 60e3), 0.3);
  assert.strictEqual(O.dimFor(16 * 60e3), 0.5);
  assert.strictEqual(O.dimFor(-1), 0);
  assert.ok(O.dimFor(10 * 3600e3) < 1);
});

t('risveglio: cambio di bandiera importante (gialla, SC, VSC, rossa, verde dopo una di queste)', () => {
  assert.strictEqual(O.wakes('green', 'sc'), true);
  assert.strictEqual(O.wakes('sc', 'green'), true);
  assert.strictEqual(O.wakes('green', 'red'), true);
  assert.strictEqual(O.wakes('green', 'green'), false);
  assert.strictEqual(O.wakes(null, 'green'), false);
  assert.strictEqual(O.wakes('yellow', 'yellow'), false);
});

console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
