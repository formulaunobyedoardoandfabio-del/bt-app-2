// Prove del replay sulla mappa (src/logic/track-replay.js): file di tools/openf1_replay.py → posizioni, ordine,
// distacchi, gomme, box e bandiere a ogni istante. Uso: node test/unit/track-replay.test.js
const assert = require('assert');
const T = require('../../src/logic/track-replay');

let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('PASS  ' + name); } catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); } };
const deltas = v => v.map((x, i) => (i ? x - v[i - 1] : x));
// Pista quadrata di 400 m, 2 giri. Dal secondo -2 (start) al secondo 20 (dur): A 50 m/s, B 50 m/s ma 2 s dietro, C 20 m/s (finisce con un giro in meno).
const secs = []; for (let s = -2; s <= 20; s++) secs.push(s);
const run = (v, delay) => secs.map(s => Math.max(-10, Math.min(800, Math.round(v * (s - delay)))));
const FILE = {
  v: 1, key: 1, start: -2, dur: 20, laps: 2, L: 400,
  line: [[0, 0], [100, 0], [100, 100], [0, 100]],
  drivers: [
    { n: 1, code: 'AAA', color: '#ff0000', pos: 1, status: '', laps: 2, stints: [[1, 1, 'S'], [2, null, 'M']], p: deltas(run(50, 0)) },
    { n: 2, code: 'BBB', color: '#00ff00', pos: 2, status: '', laps: 2, stints: [[1, 2, 'H']], p: deltas(run(50, 2)) },
    { n: 3, code: 'CCC', color: '#0000ff', pos: 3, status: '', laps: 1, stints: [[1, 2, 'M']], p: deltas(run(20, 0)) },
  ],
  pits: [[5, 1, 1, 22.4]],
  status: [[3, 'sc'], [9, 'green'], [12, 'red']],
};
const rep = T.decode(FILE);

t('decode: progresso a ogni secondo e a metà secondo', () => {
  assert.strictEqual(rep.L, 400);
  assert.strictEqual(T.progAt(rep, 0, 4), 200);
  assert.strictEqual(T.progAt(rep, 0, 4.5), 225, 'tra un secondo e l\'altro si interpola');
  assert.strictEqual(T.progAt(rep, 0, -5), T.progAt(rep, 0, -2), 'prima dell\'inizio resta fermo');
});

t('punto sulla mappa lungo la linea del tracciato', () => {
  assert.deepStrictEqual(T.pointAt(rep, 50), [50, 0]);
  assert.deepStrictEqual(T.pointAt(rep, 150), [100, 50]);
  assert.deepStrictEqual(T.pointAt(rep, 450), [50, 0], 'oltre un giro si ricomincia');
  assert.deepStrictEqual(T.pointAt(rep, -50), [0, 50], 'in griglia: prima del traguardo');
});

t('ordine, giro, distacco dal primo e da chi sta davanti', () => {
  const s = T.stateAt(rep, 6);
  assert.deepStrictEqual(s.rows.map(r => r.code), ['AAA', 'BBB', 'CCC']);
  assert.strictEqual(s.lap, 1);
  assert.strictEqual(s.rows[1].gap, 2);
  assert.strictEqual(s.rows[1].int, 2);
  assert.strictEqual(s.rows[0].gap, 0);
  assert.strictEqual(T.stateAt(rep, 10).lap, 2);
});

// 21/11: il tempo del pit nei file (date di OpenF1) è l'USCITA dalla corsia (sui 417 pit veri del 2026 la macchina è
// più lenta ~12 s prima di quel tempo): BOX si vede nei secondi di corsia PRIMA del tempo, non dopo (prima era dopo).
t('gomme del giro, box nella corsia (prima del tempo del pit, che è l\'uscita), bandiera del momento', () => {
  assert.strictEqual(T.stateAt(rep, 4).rows.find(r => r.code === 'AAA').tyre, 'S');
  assert.strictEqual(T.stateAt(rep, 10).rows.find(r => r.code === 'AAA').tyre, 'M');
  assert.ok(T.stateAt(rep, 4).rows.find(r => r.code === 'AAA').box, 'in corsia box prima dell\'uscita');
  assert.ok(T.stateAt(rep, 5).rows.find(r => r.code === 'AAA').box, 'al tempo dell\'uscita');
  assert.ok(!T.stateAt(rep, 6).rows.find(r => r.code === 'AAA').box, 'già fuori dopo l\'uscita');
  assert.ok(!T.stateAt(rep, 4).rows.find(r => r.code === 'BBB').box, 'chi non si ferma no');
  assert.deepStrictEqual([2, 4, 10, 15].map(x => T.stateAt(rep, x).flag), ['green', 'sc', 'green', 'red']);
});

t('arrivo: doppiato con un giro in meno, fine gara nell\'ordine ufficiale', () => {
  const s = T.stateAt(rep, 17);              // A ha finito (800 m), B quasi, C a metà del secondo giro
  assert.ok(s.done, 'il primo ha preso la bandiera a scacchi');
  assert.strictEqual(s.rows[2].code, 'CCC');
  assert.strictEqual(s.rows[2].down, 1, 'C doppiato');
  assert.deepStrictEqual(T.stateAt(rep, 20).rows.map(r => r.code), ['AAA', 'BBB', 'CCC']);
});

t('chi non parte o si ritira va in fondo; prima del via niente distacchi', () => {
  // D non parte: fermo in corsia box poco dopo il traguardo (progresso 5 m), stato DNS
  const f = { ...FILE, drivers: [...FILE.drivers, { n: 4, code: 'DDD', color: '#fff', pos: null, status: 'DNS', laps: 0, stints: [], p: deltas(secs.map(() => 5)) }] };
  const r = T.decode(f);
  const s0 = T.stateAt(r, 0);
  assert.strictEqual(s0.rows[s0.rows.length - 1].code, 'DDD', 'chi non parte in fondo: ' + s0.rows.map(x => x.code));
  assert.ok(s0.rows[s0.rows.length - 1].out);
  assert.ok(s0.rows.every(x => x.gap === null || x.gap === 0), 'in griglia niente distacchi: ' + s0.rows.map(x => x.gap));
});

t('file sbagliati: null, niente errori', () => {
  assert.strictEqual(T.decode(null), null);
  assert.strictEqual(T.decode({ v: 1, line: [], drivers: [] }), null);
  assert.strictEqual(T.decode({ v: 1, line: [[0, 0], [1, 0], [1, 1]], L: 3, drivers: [{ code: 'X', p: 'no' }] }), null);
});

console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
