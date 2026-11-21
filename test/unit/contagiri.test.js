// Contagiri (21/11, dal widget circolare del video di Edoardo; piano claude/multiviewer-in-sector4.md): velocità al
// centro, arco della velocità 0-360 km/h su 270°, acceleratore a sinistra, freno a destra (acceso o spento: nei dati
// è 0/1), marcia. Niente giri motore né DRS (il dato non c'è). Sotto i 140 px solo velocità e marcia.
// Uso: node test/unit/contagiri.test.js
const assert = require('assert');
const K = require('../../src/logic/contagiri');
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('PASS  ' + name); } catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); } };

t('reading: arrotonda, limita le frazioni, freno acceso da metà in su, marcia intera', () => {
  const r = K.reading({ v: 306.4, thr: 50, brk: 0, g: 7.6 });
  assert.strictEqual(r.v, 306); assert.strictEqual(r.gear, 8);
  assert.ok(Math.abs(r.speed - 306.4 / 360) < 1e-9); assert.strictEqual(r.throttle, 0.5); assert.strictEqual(r.brake, false);
  assert.strictEqual(K.reading({ v: 400, thr: 140, brk: 1, g: 2 }).speed, 1);
  assert.strictEqual(K.reading({ v: 400, thr: 140, brk: 1, g: 2 }).throttle, 1);
  assert.strictEqual(K.reading({ v: 80, thr: -5, brk: 0.6, g: 2 }).brake, true);
  assert.strictEqual(K.reading({ v: 80, thr: -5, brk: 0.6, g: 2 }).throttle, 0);
  assert.strictEqual(K.reading({ v: 80, thr: 0, brk: 0, g: 0 }).gear, null, 'folle o dato mancante: niente marcia');
  assert.strictEqual(K.reading({ v: null, thr: 0, brk: 0, g: 3 }), null, 'senza velocità niente contagiri');
});
t('angoli: 0 km/h a -135°, 180 in alto, 360 a +135°; cifre ogni 60', () => {
  assert.strictEqual(K.speedAngle(0), -135); assert.strictEqual(K.speedAngle(180), 0); assert.strictEqual(K.speedAngle(360), 135);
  assert.deepStrictEqual(K.TICKS, [0, 60, 120, 180, 240, 300, 360]);
});
t('arc: tracciato SVG in senso orario da a0 ad a1 (gradi dall\'alto)', () => {
  assert.strictEqual(K.arc(60, 60, 50, 0, 90), 'M60.0 10.0 A50 50 0 0 1 110.0 60.0');
  assert.ok(/ 0 1 1 /.test(K.arc(60, 60, 50, -135, 135)), 'più di mezzo giro: arco grande');
  assert.strictEqual(K.arc(60, 60, 50, 30, 30), '', 'arco nullo: niente');
});
t('archi dei pedali: acceleratore a sinistra che sale dal basso, freno a destra pieno o vuoto', () => {
  const g = K.pedals(K.reading({ v: 200, thr: 100, brk: 0, g: 6 }));
  assert.deepStrictEqual([g.thr[0], g.thr[1]], [210, 330]); assert.strictEqual(g.brk, null);
  const h = K.pedals(K.reading({ v: 90, thr: 25, brk: 1, g: 2 }));
  assert.deepStrictEqual([h.thr[0], h.thr[1]], [210, 240]); assert.deepStrictEqual(h.brk, [30, 150]);
  assert.strictEqual(K.pedals(K.reading({ v: 90, thr: 0, brk: 1, g: 2 })).thr, null);
});
t('compatto sotto i 140 px', () => {
  assert.strictEqual(K.COMPACT_PX, 140);
  assert.strictEqual(K.compact(139), true); assert.strictEqual(K.compact(140), false);
});

console.log(`\n${pass} passate, ${fail} fallite`);
process.exit(fail ? 1 : 0);
