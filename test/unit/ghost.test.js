// Test del Ghost Lap (confronto di due giri veri): gira in Node.  Uso: node test/unit/ghost.test.js [filtro]
const assert = require('assert');
const path = require('path');
const G = require(path.join(__dirname, '..', '..', 'src', 'logic', 'bt-ghost.js'));
const REAL = require(path.join(__dirname, '..', '..', 'src', 'data', 'real-data.js'));

// Giro sintetico di 1000 m ogni 10 m: rettilineo a 300 km/h, frenata da `brakeAt`, minimo `vMin` a 720 m,
// gas al 100% da `fullAt`. Il tempo si ricava integrando la velocità.
function lap({ brakeAt, vMin, fullAt }) {
  const d = [], v = [], thr = [], brk = [], t = [], x = [], y = [], g = [];
  for (let s = 0; s <= 1000; s += 10) {
    let sp = 300;
    if (s >= brakeAt && s <= 720) sp = 300 - (300 - vMin) * (s - brakeAt) / (720 - brakeAt);
    if (s > 720) sp = Math.min(300, vMin + (s - 720) * 0.9);
    d.push(s); v.push(Math.round(sp)); brk.push(s >= brakeAt && s < 700 ? 1 : 0);
    thr.push(s < brakeAt ? 100 : s >= fullAt ? 100 : s > 720 ? 60 : 0); g.push(sp > 250 ? 8 : 4);
    x.push(s * 10); y.push(0);
  }
  for (let i = 0; i < d.length; i++) t.push(i === 0 ? 0 : t[i - 1] + (d[i] - d[i - 1]) / (((v[i] + v[i - 1]) / 2) / 3.6));
  return { d, v, thr, brk, t, x, y, g, time: t[t.length - 1] };
}
const A = lap({ brakeAt: 600, vMin: 100, fullAt: 760 });
const B = lap({ brakeAt: 620, vMin: 80, fullAt: 790 });   // frena dopo ma passa molto più piano ed esce tardi

const tests = {
  'interpolazione: valore di un canale a una distanza qualsiasi'() {
    assert.strictEqual(G.at(A, 'v', 0), 300);
    assert(Math.abs(G.at(A, 't', 5) - (G.at(A, 't', 0) + G.at(A, 't', 10)) / 2) < 1e-9);
    assert.strictEqual(G.at(A, 'v', 5000), A.v[A.v.length - 1], 'oltre la fine non resta l\'ultimo valore');
  },
  'distacco metro per metro: B perde dove frena più tardi e va più piano in curva'() {
    const dt = G.delta(A, B, 50);
    assert.strictEqual(dt[0].d, 0); assert.strictEqual(dt[0].dt, 0);
    assert(dt[dt.length - 1].dt > 0, 'B dovrebbe essere più lento alla fine: ' + dt[dt.length - 1].dt);
  },
  'curva: chi frena più tardi, velocità alla frenata e minima, chi torna prima al 100% di gas'() {
    const r = G.cornerDuel(A, B, { n: 1, d: 720 });
    assert.strictEqual(r.brake.later, 'B'); assert.strictEqual(Math.round(r.brake.diff), 20);
    assert.strictEqual(r.brake.a, 600); assert.strictEqual(r.brake.b, 620);
    assert.strictEqual(r.vBrake.a, 300);
    assert.strictEqual(r.vMin.a, 100); assert.strictEqual(r.vMin.b, 80); assert.strictEqual(r.vMin.faster, 'A');
    assert.strictEqual(r.full.first, 'A'); assert.strictEqual(r.full.a, 760); assert.strictEqual(r.full.b, 790);
    assert(r.gained.who === 'A' && r.gained.s > 0, 'tempo guadagnato in curva: ' + JSON.stringify(r.gained));
  },
  'curva in pieno: nessuna frenata'() {
    const flat = { d: [0, 500, 1000], v: [300, 300, 300], thr: [100, 100, 100], brk: [0, 0, 0], t: [0, 6, 12], x: [0, 1, 2], y: [0, 0, 0], g: [8, 8, 8] };
    const r = G.cornerDuel(flat, flat, { n: 5, d: 500 });
    assert.strictEqual(r.brake.a, null); assert.strictEqual(r.brake.later, null);
  },
  'posizione nel tempo: per il replay 2D le due vetture si muovono con il loro tempo vero'() {
    const p = G.posAtTime(A, A.time / 2);
    assert(p.x > 0 && p.x < 10000 && p.y === 0, JSON.stringify(p));
    assert.deepStrictEqual(G.posAtTime(A, -1), { x: A.x[0], y: A.y[0], v: A.v[0], d: 0 });
  },
  'dati veri di Baku: 8 giri, pole di Russell 1:42.526, 20 curve, analisi della curva 1'() {
    const q = REAL.baku2026q;
    assert.deepStrictEqual(Object.keys(q.laps), ['RUS', 'LEC', 'PIA', 'HAD', 'NOR', 'VER', 'HAM', 'GAS']);
    assert.strictEqual(q.laps.RUS.time, 102.526); assert.strictEqual(q.corners.length, 20);
    for (const l of Object.values(q.laps)) assert(l.d.length > 700 && l.d.every((x, i) => i === 0 || x >= l.d[i - 1]), 'distanze non in ordine');
    const r = G.cornerDuel(q.laps.RUS, q.laps.LEC, q.corners[0]);
    assert(r.brake.a > 0 && r.brake.b > 0 && r.vMin.a > 50 && r.vMin.b > 50, JSON.stringify(r));
    const end = G.delta(q.laps.RUS, q.laps.LEC, 10).pop();
    assert(Math.abs(end.dt - (103.363 - 102.526)) < 0.005, 'distacco finale: ' + end.dt);
  },
  'dati veri di Sepang (qualifiche di oggi): 8 giri, pole di Verstappen 1:35.130, curve ricavate dalle frenate'() {
    const q = REAL.sepang2026q;
    assert.strictEqual(Object.keys(q.laps)[0], 'VER'); assert.strictEqual(q.laps.VER.time, 95.13); assert.strictEqual(Object.keys(q.laps).length, 8);
    assert(q.cornersDetected && q.corners.length >= 6 && q.corners.every(c => c.detected), 'curve: ' + q.corners.length);
  },
  'guida 2D: per ogni pista del calendario curve e numeri veri (Monza curva 1, Monaco tornante, Sepang e Madrid rilevate)'() {
    const G2 = REAL.guide;
    assert.strictEqual(Object.keys(G2).length, 23);
    const m1 = G2['it-1922'].corners.find(c => c.n === 1);
    assert(m1.vEntry > 300 && m1.vMin < 130 && m1.brake > 50 && m1.risk === 'alto' && /Rettifilo/.test(m1.name), 'Monza T1: ' + JSON.stringify(m1));
    assert(Math.min(...G2['mc-1929'].corners.map(c => c.vMin)) < 70, 'Monaco: manca il tornante lento');
    assert(G2['my-1999'].detected && G2['es-2026'].detected && !G2['it-1922'].detected);
    assert(G2['sg-2008'].year === 2025 && G2['it-1922'].year === 2026);
    for (const g of Object.values(G2)) assert(g.outline.length > 100 && g.corners.length > 0 && g.lap.fullPct > 20 && g.lap.fullPct < 90, 'pista senza dati validi');
  },
  'spec clash e momenti storici: valori delle ricerche con la fonte'() {
    assert.strictEqual(REAL.specs['it-1922'].safety_car.pct, 50); assert(/formula1\.com/.test(REAL.specs['it-1922'].safety_car.url));
    assert(REAL.specs['mc-1929'].brembo.index >= 1);
    const mo = REAL.history['it-1922']; assert(mo.length && mo.every(m => m.text_it && m.url && m.turn), 'momenti di Monza');
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
