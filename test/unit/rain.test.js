// Prove delle gocce di pioggia (src/logic/rain.js). Uso: node test/unit/rain.test.js
const assert = require('assert');
const R = require('../../src/logic/rain');
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('PASS  ' + name); } catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); } };
// numeri a caso ripetibili
const seeded = s => () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };

t('al massimo 15 gocce: la sedicesima non nasce', () => {
  const rnd = seeded(7), ds = [];
  for (let i = 0; i < 30; i++) { const d = R.makeDrop(ds, { w: 390, h: 844, rnd, id: i }); if (d) ds.push(d); }
  assert.strictEqual(ds.length, R.MAX_DROPS);
  assert.strictEqual(R.makeDrop(ds, { w: 390, h: 844, rnd, id: 99 }), null);
});
t('dentro lo schermo, piccole, ferme qualche secondo e poi giù veloci fino a sotto lo schermo', () => {
  const rnd = seeded(3), ds = [];
  for (let i = 0; i < 15; i++) ds.push(R.makeDrop(ds, { w: 390, h: 844, rnd, id: i }));
  for (const d of ds) {
    assert.ok(d.x >= 14 && d.x <= 376 && d.y >= 14 && d.y <= 844 - 14, 'fuori schermo: ' + JSON.stringify(d));
    assert.ok(R.SIZES.includes(d.size) && d.size <= 19, 'grandezza: ' + d.size);
    assert.ok(d.hold >= 1800 && d.hold <= 6000, 'ferma: ' + d.hold);
    assert.ok(d.y + d.fall > 844, 'non arriva sotto lo schermo: ' + JSON.stringify(d));
    assert.ok(d.dur >= 380 && d.dur <= 1100, 'scivolata: ' + d.dur);
  }
});
t('di solito lontane tra loro, raramente vicine (circa l\'8%)', () => {
  const rnd = seeded(11);
  let close = 0, n = 0;
  for (let k = 0; k < 200; k++) {
    const ds = [];
    for (let i = 0; i < 8; i++) { const p = R.pickSpot(ds, { w: 390, h: 844, rnd }); if (ds.length) { n++; if (p.close) close++; else assert.ok(ds.every(o => Math.hypot(o.x - p.x, o.y - p.y) >= R.MIN_GAP), 'troppo vicina senza essere il caso raro'); } ds.push(p); }
  }
  const share = close / n;
  assert.ok(share > 0.03 && share < 0.15, 'vicine: ' + share.toFixed(3));
});
t('la prima goccia non è mai "vicina" (non c\'è niente accanto)', () => {
  const rnd = seeded(5);
  for (let i = 0; i < 50; i++) assert.strictEqual(R.pickSpot([], { w: 390, h: 844, rnd }).close, false);
});
// 8/11 (Edoardo): "le gocce solo se c'è la qualifica o il GP in corso, se no non si devono vedere".
const WK = [{ key: 'FP1', utc: '2026-11-20T00:30Z' }, { key: 'FP2', utc: '2026-11-20T04:00Z' }, { key: 'FP3', utc: '2026-11-21T00:30Z' }, { key: 'QUALI', utc: '2026-11-21T04:00Z' }, { key: 'RACE', utc: '2026-11-22T04:00Z' }];
const at = s => Date.parse(s);
t('gocce: solo durante qualifica o gara (non nelle prove libere, non fra una sessione e l\'altra)', () => {
  assert.strictEqual(R.rainSessionNow(WK, at('2026-11-20T01:00Z')), null, 'FP1');
  assert.strictEqual(R.rainSessionNow(WK, at('2026-11-21T03:50Z')), null, 'prima della qualifica');
  assert.strictEqual(R.rainSessionNow(WK, at('2026-11-21T04:30Z')), 'QUALI');
  assert.strictEqual(R.rainSessionNow(WK, at('2026-11-21T06:00Z')), null, 'qualifica finita');
  assert.strictEqual(R.rainSessionNow(WK, at('2026-11-22T06:30Z')), 'RACE', 'gara lunga (anche con rossa)');
  assert.strictEqual(R.rainSessionNow(WK, at('2026-11-22T07:30Z')), null, 'dopo la gara');
});
t('gocce: Sprint e qualifica Sprint contano come gara e qualifica; dati rotti = niente gocce', () => {
  const SP = [{ key: 'SQ', utc: '2026-11-20T08:30Z' }, { key: 'SPRINT', utc: '2026-11-21T04:00Z' }];
  assert.strictEqual(R.rainSessionNow(SP, at('2026-11-20T09:00Z')), 'SQ');
  assert.strictEqual(R.rainSessionNow(SP, at('2026-11-21T04:40Z')), 'SPRINT');
  assert.strictEqual(R.rainSessionNow(null, Date.now()), null);
  assert.strictEqual(R.rainSessionNow([{ key: 'RACE', utc: 'boh' }], Date.now()), null);
  assert.strictEqual(R.isRainSession('RACE') && R.isRainSession('QUALI') && R.isRainSession('SQ') && R.isRainSession('SPRINT'), true);
  assert.strictEqual(R.isRainSession('FP2'), false);
});
console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
