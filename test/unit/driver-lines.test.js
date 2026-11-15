// 15/11: frasi dei piloti per la scelta nel Fanta stile chess.com (src/data/driver-lines.js, testo di Edoardo)
// Uso: node test/unit/driver-lines.test.js
const assert = require('assert');
const { DRIVER_LINES, driverLine } = require('../../src/data/driver-lines');
const { DRIVER_DATA } = require('../../src/data/f1-2026');
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('PASS ', name); } catch (e) { fail++; console.log('FAIL ', name, '\n      →', e.message); } };

t('ogni pilota della griglia ha le sue due frasi, e niente frasi di piloti che non ci sono', () => {
  const ids = DRIVER_DATA.map(d => d[0]);
  assert.strictEqual(ids.length, 22);
  ids.forEach(id => assert.ok(DRIVER_LINES[id] && DRIVER_LINES[id].length === 2, 'manca ' + id));
  assert.deepStrictEqual(Object.keys(DRIVER_LINES).sort(), ids.slice().sort());
});

t('frasi pulite: niente rimandi [1] del testo copiato, niente "—", niente spazi in più', () => {
  Object.entries(DRIVER_LINES).forEach(([id, l]) => l.forEach(s => {
    assert.ok(s.length > 30, id + ': troppo corta');
    assert.ok(!/\[\d/.test(s) && !s.includes('—') && s === s.trim() && !/\s{2}/.test(s), id + ': ' + s);
  }));
});

t('driverLine: a giro, e null per chi non ha frasi', () => {
  assert.strictEqual(driverLine('norris', 0), DRIVER_LINES.norris[0]);
  assert.strictEqual(driverLine('norris', 1), DRIVER_LINES.norris[1]);
  assert.strictEqual(driverLine('norris', 2), DRIVER_LINES.norris[0]);
  assert.strictEqual(driverLine('nessuno', 0), null);
});

console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
