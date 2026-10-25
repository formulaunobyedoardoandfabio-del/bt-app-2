// Prove dei gesti (Tappa 3, G11 e G29; src/logic/gesture.js): uno swipe conta solo se è quasi orizzontale
// (|dy| < |dx| × 0,58) e lungo più di un quarto della larghezza, oppure veloce (più di 0,6 px/ms). Gira in Node.
// Uso: node test/unit/gesture.test.js [filtro]
const assert = require('assert');
const path = require('path');
const { classifySwipe, SWIPE, dragFollow, dragProgress, leaveTo } = require(path.join(__dirname, '..', '..', 'src', 'logic', 'gesture.js'));

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
  // 25/10: durante lo swipe la pagina segue il dito (al 60%, fino al 60% della pagina); senza scheda accanto fa
  // l'elastico (15% del dito, al massimo 8% della pagina).
  'la pagina segue il dito'() {
    assert.strictEqual(dragFollow(-100, W, true), -60, '60% del dito');
    assert.strictEqual(dragFollow(-1000, W, true), -240, 'al massimo il 60% della pagina');
    assert.strictEqual(dragFollow(100, W, false), 15, 'senza scheda accanto: elastico');
    assert.strictEqual(dragFollow(1000, W, false), 32, 'elastico al massimo 8%');
    assert.strictEqual(dragFollow(NaN, W, true), 0);
    assert.strictEqual(dragFollow(-100, 0, true), -60, 'senza larghezza: telefono da 390 px');
  },
  'quanto manca allo swipe: da 0 a 1'() {
    assert.strictEqual(dragProgress(0, W), 0);
    assert.strictEqual(dragProgress(-50, W), 0.5, 'metà del quarto di pagina');
    assert.strictEqual(dragProgress(300, W), 1, 'oltre il quarto: 1');
    assert.strictEqual(dragProgress(NaN, W), 0);
  },
  // Le due schede scorrono insieme come un nastro (la nuova attaccata alla vecchia): la vecchia esce tutta dallo schermo,
  // da qualunque punto la lasci il dito.
  'la scheda vecchia esce tutta dallo schermo'() {
    assert.strictEqual(leaveTo(0, 'left', W), -400, 'dal tocco');
    assert.strictEqual(leaveTo(-200, 'left', W), -400, 'dal dito');
    assert.strictEqual(leaveTo(0, 'right', W), 400);
    assert.strictEqual(leaveTo(150, 'right', W), 400);
    assert.strictEqual(leaveTo(0, 'left', 0), -390, 'senza larghezza: telefono da 390 px');
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
