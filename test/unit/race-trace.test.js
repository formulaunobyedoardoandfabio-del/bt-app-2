// Race Trace (21/11, piano claude/multiviewer-in-sector4.md): dal file del replay, il distacco dal primo a ogni
// passaggio sul traguardo, una linea per pilota, fino all'istante del replay; i giri del pit segnati. Gara finta coi
// conti fatti a mano. Uso: node test/unit/race-trace.test.js
const assert = require('assert');
const TR = require('../../src/logic/track-replay');
const RT = require('../../src/logic/race-trace');
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('PASS  ' + name); } catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); } };
const near = (a, b, tol, m) => assert.ok(a != null && Math.abs(a - b) <= tol, `${m}: ${a} invece di ${b} (±${tol})`);

const L = 1000, SECS = 640;
const run = (speed, opts = {}) => {
  const p = []; let s = -(opts.behind || 0);
  for (let k = 0; k < SECS; k++) {
    let v = speed;
    if (opts.slow && k >= opts.slow[0] && k < opts.slow[0] + opts.slow[1]) v = opts.slow[2];
    if (opts.stopAt && k >= opts.stopAt) v = 0;
    p.push(k === 0 ? s : v); s += v;
  }
  return p;
};
const rep = TR.decode({
  v: 1, L, laps: 30, start: 0, line: [[0, 0], [250, 0], [250, 250], [0, 250]],
  drivers: [
    { n: 1, code: 'AAA', name: 'A', team: 'T1', color: '#f00', p: run(50) },
    { n: 2, code: 'BBB', name: 'B', team: 'T2', color: '#0f0', p: run(50, { behind: 100 }) },
    { n: 3, code: 'CCC', name: 'C', team: 'T3', color: '#00f', p: run(50, { behind: 400, stopAt: 200 }), status: 'Retired' },
    { n: 4, code: 'DDD', name: 'D', team: 'T4', color: '#ff0', p: run(50, { behind: 900, slow: [230, 20, 25] }) },
  ],
  pits: [[250, 4, 11, 22.0]], status: [],
});

t('trace: distacco dal primo a ogni giro, fino all\'istante del replay', () => {
  const r = RT.trace(rep, 300);
  assert.strictEqual(r.K, 15, 'A ha finito 15 giri a t=300');
  const by = c => r.lines.find(l => l.code === c);
  assert.ok(by('AAA').pts.every(([, g]) => g === 0), 'il primo sta a 0');
  assert.strictEqual(by('AAA').pts.length, 15);
  assert.ok(by('BBB').pts.every(([, g]) => Math.abs(g - 2) < 0.05), 'B sempre a 2 s');
  const d = by('DDD').pts;
  near(d.find(([k]) => k === 10)[1], 18, 0.05, 'D prima del pit');
  near(d.find(([k]) => k === 13)[1], 28, 0.05, 'D dopo il pit');
  assert.strictEqual(d[d.length - 1][0], 13, 'D a t=300 ha finito 13 giri');
  assert.deepStrictEqual(by('DDD').pits, [11]);
});
t('trace: chi si ferma per sempre ha la linea fino all\'ultimo giro finito', () => {
  const c = RT.trace(rep, 600).lines.find(l => l.code === 'CCC');
  assert.strictEqual(c.pts[c.pts.length - 1][0], 9, 'C si ferma a 9600 m: ultimo giro finito il 9');
  near(c.pts[0][1], 8, 0.05, 'C a 8 s');
});
t('trace: prima del primo giro niente punti; max per la scala', () => {
  assert.strictEqual(RT.trace(rep, 10).K, 0);
  assert.ok(RT.trace(rep, 10).lines.every(l => !l.pts.length));
  near(RT.trace(rep, 300).max, 28, 0.05, 'il distacco più grande');
});

console.log(`\n${pass} passate, ${fail} fallite`);
process.exit(fail ? 1 : 0);
