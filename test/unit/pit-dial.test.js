// Quadrante dei box (21/11, dal "Circle of Doom" di MultiViewer; piano claude/multiviewer-in-sector4.md): dal file del
// replay, il distacco di ogni auto in secondi, dove sta sul giro (in tempo, non in metri), quanto si perde ai box
// (misurato sui pit veri della gara) e dove rientra chi si ferma adesso. Qui una gara finta coi conti fatti a mano.
// Uso: node test/unit/pit-dial.test.js
const assert = require('assert');
const TR = require('../../src/logic/track-replay');
const PD = require('../../src/logic/pit-dial');
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('PASS  ' + name); } catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); } };
const near = (a, b, tol, m) => assert.ok(a != null && Math.abs(a - b) <= tol, `${m}: ${a} invece di ${b} (±${tol})`);

// Pista di 1000 m (un quadrato), 30 giri, partenza a t=0. Velocità in m/s, secondo per secondo.
const L = 1000, SECS = 640;
const line = [[0, 0], [250, 0], [250, 250], [0, 250]];
const run = (speed, opts = {}) => {
  const p = []; let s = -(opts.behind || 0);
  for (let k = 0; k < SECS; k++) {
    let v = speed;
    if (opts.slow && k >= opts.slow[0] && k < opts.slow[0] + opts.slow[1]) v = opts.slow[2];
    p.push(k === 0 ? s : v); s += v;
  }
  return p;
};
// A in testa a 50 m/s (giro 20 s); B 100 m dietro (2 s); C 400 m dietro (8 s); D 50 m/s che fa un pit al giro 11:
// per 20 s va a 25 m/s, cioè perde 10 s.
const file = {
  v: 1, L, laps: 30, start: 0, line,
  drivers: [
    { n: 1, code: 'AAA', name: 'A', team: 'T1', color: '#f00', p: run(50) },
    { n: 2, code: 'BBB', name: 'B', team: 'T2', color: '#0f0', p: run(50, { behind: 100 }) },
    { n: 3, code: 'CCC', name: 'C', team: 'T3', color: '#00f', p: run(50, { behind: 400 }) },
    { n: 4, code: 'DDD', name: 'D', team: 'T4', color: '#ff0', p: run(50, { behind: 900, slow: [230, 20, 25] }) },
  ],
  // Nei file veri il tempo del pit (date di OpenF1) è l'USCITA dalla corsia: sui 417 pit del 2026 la macchina è più
  // lenta ~12 s prima di quel tempo e a quel tempo ha già passato il traguardo. Qui: corsia da 228 a 250, rallenta
  // da 10550 m a 11100 m, giro 11 (entrata) e 12 (uscita).
  pits: [[250, 4, 11, 22.0]],
  status: [],
};
const rep = TR.decode(file);

t('lapTime: il tempo di un giro dai metri percorsi', () => {
  near(PD.lapTime(rep, 0, 3), 20, 0.01, 'giro 3 di A');
  near(PD.lapTime(rep, 3, 11) + PD.lapTime(rep, 3, 12), 50, 0.5, 'giro del pit e quello dopo di D (40 + 10 persi)');
  assert.strictEqual(PD.lapTime(rep, 0, 99), null, 'giro che non c\'è');
});
t('refLap: il giro di riferimento è quello del primo; a metà pista metà del tempo', () => {
  const ref = PD.refLap(rep, 300);
  near(ref.T, 20, 0.05, 'tempo del giro');
  near(PD.frac(ref, 500), 0.5, 0.01, 'metà pista');
  near(PD.frac(ref, 250), 0.25, 0.01, 'un quarto');
});
t('predict: dove rientra chi si ferma, chi ha davanti e dietro, aria libera', () => {
  const st = TR.stateAt(rep, 100);
  const b = st.rows.find(r => r.code === 'BBB');
  const short = PD.predict(st, b.i, 5);
  assert.strictEqual(short.pos, 2);
  assert.strictEqual(short.ahead.code, 'AAA'); assert.strictEqual(short.behind.code, 'CCC');
  near(short.gapAhead, 7, 0.2, 'davanti'); near(short.gapBehind, 1, 0.2, 'dietro');
  assert.strictEqual(short.free, true, 'A a 7 s: aria libera');
  // B con 10 s persi: 12 s dal primo, dietro C (8 s) e davanti a D (18 s): 3°.
  const long = PD.predict(st, b.i, 10);
  assert.strictEqual(long.pos, 3);
  assert.strictEqual(long.ahead.code, 'CCC'); assert.strictEqual(long.behind.code, 'DDD');
  near(long.gapAhead, 4, 0.2, 'davanti'); near(long.gapBehind, 6, 0.2, 'dietro');
});
t('pitLosses: il tempo perso ai box misurato sul pit vero', () => {
  const l = PD.pitLosses(rep);
  assert.strictEqual(l.length, 1);
  assert.strictEqual(l[0].code, 'DDD'); assert.strictEqual(l[0].flag, 'green');
  near(l[0].loss, 10, 0.6, 'persi');
});
t('lossModel: mediana dei pit veri; senza pit con la Safety Car una frazione scritta come stima', () => {
  const m = PD.lossModel(rep);
  near(m.green, 10, 0.6, 'normale');
  near(m.sc, 10 * PD.SC_FACTOR, 0.6, 'Safety Car'); near(m.vsc, 10 * PD.VSC_FACTOR, 0.6, 'VSC');
  assert.strictEqual(m.nGreen, 1); assert.strictEqual(m.scMeasured, false);
  const none = PD.lossModel(TR.decode({ ...file, pits: [] }));
  assert.strictEqual(none.green, null, 'senza pit niente stima');
});
t('dial: angoli sul giro, distacchi dal pilota scelto, arco del rientro', () => {
  const d = PD.dial(rep, 100, { sel: 1, model: { green: 5, sc: 3, vsc: 4 } });
  const a = d.cars.find(c => c.code === 'AAA'), b = d.cars.find(c => c.code === 'BBB');
  near(d.T, 20, 0.05, 'giro');
  near(a.angle, 0, 0.5, 'A sul traguardo a t=100 (5 giri esatti)');
  near(b.angle, 324, 0.5, 'B 100 m prima del traguardo: 0,9 del giro');
  near(a.rel, -2, 0.2, 'A 2 s davanti a B'); near(b.rel, 0, 0.01, 'B è il riferimento');
  assert.strictEqual(d.sel.code, 'BBB');
  assert.strictEqual(d.rejoin.green.pos, 2);
  near(d.rejoin.green.angle, 234, 1, 'rientro 5 s dietro: 324 - 90');
  assert.ok(d.rejoin.sc.angle > d.rejoin.green.angle, 'con la Safety Car rientra più avanti');
});
t('dial: la stima principale segue la bandiera (SC in pista → tempo perso con la SC; rossa → niente)', () => {
  const model = { green: 5, sc: 3, vsc: 4 };
  const g = PD.dial(rep, 100, { sel: 1, model });
  assert.strictEqual(g.rejoin.nowKey, 'green'); assert.strictEqual(g.rejoin.altKey, 'sc');
  assert.strictEqual(g.rejoin.now.loss, 5); assert.strictEqual(g.rejoin.alt.loss, 3);
  const sc = PD.dial(TR.decode({ ...file, status: [[90, 'sc']] }), 100, { sel: 1, model });
  assert.strictEqual(sc.rejoin.nowKey, 'sc'); assert.strictEqual(sc.rejoin.altKey, 'green');
  assert.strictEqual(sc.rejoin.now.loss, 3); assert.strictEqual(sc.rejoin.alt.loss, 5);
  const vsc = PD.dial(TR.decode({ ...file, status: [[90, 'vsc']] }), 100, { sel: 1, model });
  assert.strictEqual(vsc.rejoin.now.loss, 4);
  const red = PD.dial(TR.decode({ ...file, status: [[90, 'red']] }), 100, { sel: 1, model });
  assert.strictEqual(red.rejoin.now, null, 'con la rossa le gomme si cambiano in corsia: niente stima');
  assert.strictEqual(red.rejoin.red, true);
});
t('dial senza pilota scelto: distacchi dal primo, niente arco', () => {
  const d = PD.dial(rep, 100, { model: { green: 5, sc: 3, vsc: 4 } });
  assert.strictEqual(d.sel, null); assert.strictEqual(d.rejoin, null);
  near(d.cars.find(c => c.code === 'CCC').rel, 8, 0.2, 'C a 8 s dal primo');
  assert.strictEqual(d.lap, 6); assert.strictEqual(d.total, 30);
});
t('backtest: sulla gara finta la stima indovina il rientro vero', () => {
  const r = PD.backtest(rep, { lead: 10, model: { green: 10, sc: 5, vsc: 6.5 } });
  assert.strictEqual(r.n, 1);
  assert.strictEqual(r.exact, 1);
  assert.strictEqual(r.rows[0].pred, 4); assert.strictEqual(r.rows[0].real, 4);
});
t('backtest senza modello: il tempo perso viene dagli ALTRI pit (qui non ce ne sono, quindi niente stima)', () => {
  assert.strictEqual(PD.backtest(rep, { lead: 10 }).n, 0);
});
t('backtest: i pit di massa (più di metà del gruppo entra insieme, come a Monza 2026 giro 3) si contano a parte', () => {
  const all = TR.decode({ ...file, pits: [[250, 1, 12, 22], [250, 2, 12, 22], [252, 3, 12, 22], [250, 4, 11, 22]] });
  const r = PD.backtest(all, { lead: 10, model: { green: 10, sc: 5, vsc: 6.5 } });
  assert.strictEqual(r.n, 0, 'nessun pit normale');
  assert.strictEqual(r.nMass, 4);
  assert.ok(r.rows.every(x => x.mass));
  assert.ok(r.rows.every(x => x.crowd === 3), 'per ognuno gli altri 3 erano ai box nello stesso momento');
  assert.strictEqual(PD.backtest(rep, { lead: 10, model: { green: 10, sc: 5, vsc: 6.5 } }).rows[0].crowd, 0);
});
t('flagAt: la bandiera del momento', () => {
  const r2 = TR.decode({ ...file, status: [[100, 'sc'], [200, 'green']] });
  assert.deepStrictEqual([50, 150, 250].map(x => PD.flagAt(r2, x)), ['green', 'sc', 'green']);
});

console.log(`\n${pass} passate, ${fail} fallite`);
process.exit(fail ? 1 : 0);
