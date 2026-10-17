// Prove dei gesti (Tappa 3, G11 e G29; src/logic/gesture.js): uno swipe conta solo se è quasi orizzontale
// (|dy| < |dx| × 0,58) e lungo più di un quarto della larghezza, oppure veloce (più di 0,6 px/ms). Gira in Node.
// Uso: node test/unit/gesture.test.js [filtro]
const assert = require('assert');
const path = require('path');
const { classifySwipe, SWIPE } = require(path.join(__dirname, '..', '..', 'src', 'logic', 'gesture.js'));

const W = 400;   // larghezza della pagina: un quarto = 100 px
const c = (dx, dy, dt) => classifySwipe({ dx, dy, dt, width: W });

const tests = {
  'swipe corto o diagonale: null'() {
    assert.strictEqual(c(60, 0, 400), null, 'corto e lento');
    assert.strictEqual(c(99, 10, 400), null, 'appena sotto un quarto, lento');
    assert.strictEqual(c(160, 120, 300), null, 'diagonale (più in giù che di lato)');
    assert.strictEqual(c(150, 90, 300), null, 'diagonale oltre 0,58');
    assert.strictEqual(c(0, 200, 200), null, 'verticale');
    assert.strictEqual(c(0, 0, 0), null, 'tocco fermo');
    assert.strictEqual(c(12, 0, 5), null, 'un tocco che si muove di poco, anche se veloce');
  },
  'lungo: oltre un quarto della larghezza'() {
    assert.strictEqual(c(101, 20, 900), 'right');
    assert.strictEqual(c(-140, -30, 700), 'left');
    assert.strictEqual(c(150, 86, 500), 'right', 'quasi orizzontale: 86 < 150 × 0,58');
  },
  'veloce: anche se corto'() {
    assert.strictEqual(c(60, 5, 60), 'right', '1 px/ms');
    assert.strictEqual(c(-45, 10, 50), 'left', '0,9 px/ms');
    assert.strictEqual(c(60, 5, 120), null, '0,5 px/ms: lento');
    assert.strictEqual(c(40, 30, 20), null, 'veloce ma diagonale');
  },
  'valori strani: null'() {
    assert.strictEqual(classifySwipe({}), null);
    assert.strictEqual(classifySwipe({ dx: 200, dy: 0, dt: 100, width: 0 }), 'right', 'senza larghezza conta la velocità');
    assert.strictEqual(classifySwipe({ dx: NaN, dy: 0, dt: 10, width: W }), null);
    assert.strictEqual(SWIPE.ratio, 0.58); assert.strictEqual(SWIPE.share, 0.25); assert.strictEqual(SWIPE.speed, 0.6);
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
