// Quadrante dei box in DIRETTA (21/11, Edoardo: "falli anche e soprattutto per la live gara"). Dati di OpenF1 della
// gara in corso: distacchi dal primo nel tempo (intervals), pit con la durata in corsia (il tempo del pit è l'uscita),
// stato della diretta (st: auto con metri, distacco, giri di ritardo, box). Tempo perso: misurato sui pit di questa
// gara come nel Replay; prima dei pit, quello della pista nei replay 2026, altrimenti la mediana 2026 (stima).
// Uso: node test/unit/pit-dial-live.test.js
const assert = require('assert');
const PD = require('../../src/logic/pit-dial');
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('PASS  ' + name); } catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); } };
const near = (a, b, tol, m) => assert.ok(a != null && Math.abs(a - b) <= tol, `${m}: ${a} invece di ${b} (±${tol})`);

const T0 = Date.parse('2026-11-22T12:00:00Z');
const iso = s => new Date(T0 + s * 1000).toISOString();
const tOf = d => (Date.parse(d) - T0) / 1000;
// 4 piloti, distacco dal primo ogni 4 s: 1 → 0, 2 → 2 s, 3 → 8 s, 4 → 18 s; il 4 si ferma: corsia da 228 a 250
// (uscita a 250, 22 s) e perde 10 s tra 228 e 250.
const gap4 = s => (s <= 228 ? 18 : s >= 250 ? 28 : 18 + (10 * (s - 228)) / 22);
const intervals = [];
for (let s = 0; s <= 400; s += 4) {
  intervals.push({ driver_number: 1, date: iso(s), gap_to_leader: null, interval: null });
  intervals.push({ driver_number: 2, date: iso(s), gap_to_leader: 2, interval: 2 });
  intervals.push({ driver_number: 3, date: iso(s), gap_to_leader: 8, interval: 6 });
  intervals.push({ driver_number: 4, date: iso(s), gap_to_leader: Math.round(gap4(s) * 1000) / 1000, interval: null });
  intervals.push({ driver_number: 5, date: iso(s), gap_to_leader: '+1 LAP', interval: null });
}
const raw = { intervals, pit: [{ driver_number: 4, date: iso(250), lap_number: 11, lane_duration: 22 }] };
const green = () => 'green';

t('liveLosses: tempo perso al pit misurato sui distacchi della diretta, solo quando il pilota è già fuori da 15 s', () => {
  const l = PD.liveLosses(raw, { tOf, flagAt: green, now: 300 });
  assert.strictEqual(l.length, 1); assert.strictEqual(l[0].num, 4); assert.strictEqual(l[0].flag, 'green');
  near(l[0].loss, 10, 0.6, 'persi');
  assert.strictEqual(PD.liveLosses(raw, { tOf, flagAt: green, now: 255 })[0].loss, null, '5 s dopo l\'uscita: non ancora');
});
t('liveModel: prima i pit di questa gara, poi la pista nei replay 2026, poi la mediana 2026 (stima)', () => {
  const m = PD.liveModel(raw, { tOf, flagAt: green, now: 300, circuitId: 'br-1940' });
  near(m.green, 10, 0.6, 'dalla gara'); assert.strictEqual(m.source, 'race'); assert.strictEqual(m.nGreen, 1);
  near(m.sc, m.green * PD.SC_FACTOR, 0.15, 'SC');
  const tr = PD.liveModel({ intervals, pit: [] }, { tOf, flagAt: green, now: 300, circuitId: 'br-1940' });
  assert.strictEqual(tr.source, 'track'); assert.strictEqual(tr.green, PD.PIT_LOSS_2026.tracks['br-1940']);
  const se = PD.liveModel({ intervals, pit: [] }, { tOf, flagAt: green, now: 300, circuitId: 'us-1990-nuova' });
  assert.strictEqual(se.source, 'season'); assert.strictEqual(se.green, PD.PIT_LOSS_2026.season);
});

const car = (code, pos, gap, dist, extra = {}) => ({ code, color: '#fff', pos, gap, dist, lapsDown: 0, pit: false, dnf: false, last: { time: 20 }, ...extra });
const st = { flag: 'green', lap: 6, totalLaps: 30, cars: [
  car('AAA', 1, 0, 5000), car('BBB', 2, 2, 4900), car('CCC', 3, 8, 4600), car('DDD', 4, 18, 4100),
  car('EEE', 5, null, 3950, { lapsDown: 1 }), car('FFF', 6, null, 2000, { dnf: true }),
] };
t('liveDial: angoli dai metri del giro, distacchi dal pilota scelto, rientro tra chi è a pieni giri', () => {
  const d = PD.liveDial(st, { sel: 'BBB', model: { green: 5, sc: 3, vsc: 4 }, L: 1000 });
  assert.strictEqual(d.cars.length, 5, 'i ritirati non ci sono');
  near(d.cars.find(c => c.code === 'AAA').angle, 0, 0.5, 'A sul traguardo');
  near(d.cars.find(c => c.code === 'BBB').angle, 324, 0.5, 'B a 0,9 del giro');
  near(d.cars.find(c => c.code === 'AAA').rel, -2, 0.01, 'A 2 s davanti a B');
  assert.strictEqual(d.cars.find(c => c.code === 'EEE').down, 1);
  assert.strictEqual(d.T, 20); assert.strictEqual(d.lap, 6); assert.strictEqual(d.total, 30);
  assert.strictEqual(d.rejoin.nowKey, 'green');
  assert.strictEqual(d.rejoin.now.pos, 2); assert.strictEqual(d.rejoin.now.ahead.code, 'AAA'); assert.strictEqual(d.rejoin.now.behind.code, 'CCC');
  near(d.rejoin.now.angle, 234, 1, 'ombra 5 s dietro');
  const long = PD.liveDial(st, { sel: 'BBB', model: { green: 30, sc: 3, vsc: 4 }, L: 1000 });
  assert.strictEqual(long.rejoin.now.pos, 4, 'dietro D ma davanti al doppiato');
});
t('liveDial: senza pilota scelto niente arco; con la Safety Car la stima principale è quella con la SC', () => {
  assert.strictEqual(PD.liveDial(st, { model: { green: 5, sc: 3, vsc: 4 }, L: 1000 }).rejoin, null);
  const sc = PD.liveDial({ ...st, flag: 'sc' }, { sel: 'BBB', model: { green: 5, sc: 3, vsc: 4 }, L: 1000 });
  assert.strictEqual(sc.rejoin.nowKey, 'sc'); assert.strictEqual(sc.rejoin.now.loss, 3);
  assert.strictEqual(PD.liveDial(null, { L: 1000 }), null);
});

console.log(`\n${pass} passate, ${fail} fallite`);
process.exit(fail ? 1 : 0);
