// Test delle grafiche B&T Insights (sorpasso in X giri, strategie, passo gara, frenata, prestazioni vettura) — in Node.
// Le analisi usano i dati della diretta (qui il simulatore); nell'app vera useranno gli stessi dati da OpenF1.
// Uso: node test/unit/insights.test.js [filtro]
const assert = require('assert');
const path = require('path');
const LiveSim = require(path.join(__dirname, '..', '..', 'src', 'logic', 'live-sim.js'));
const I = require(path.join(__dirname, '..', '..', 'src', 'logic', 'bt-insights.js'));
const CIRCUITS = require(path.join(__dirname, '..', '..', 'src', 'data', 'circuits.json'));
const CODES = ['NOR', 'VER', 'ANT', 'HAD', 'LEC', 'PIA', 'RUS', 'HAM', 'SAI', 'ALB', 'ALO', 'GAS', 'LAW', 'BEA', 'HUL', 'BOR', 'OCO', 'LIN', 'COL', 'STR', 'BOT', 'PER'];
const DRIVERS = CODES.map((code, i) => ({ id: code.toLowerCase(), code, number: i + 1, color: '#ff0000' }));
const TEAM_OF = Object.fromEntries(CODES.map((c, i) => [c.toLowerCase(), 't' + Math.floor(i / 2)]));
const track = LiveSim.buildTrack(CIRCUITS['my-1999']);
const race = (sec, o = {}) => { const s = LiveSim.createSession({ track, drivers: DRIVERS, type: 'RACE', seed: 11, script: false, ...o }); for (let t = 0; t < sec; t += 0.5) s.advance(0.5); return s; };
const ctx = s => ({ st: s.state(), lapsOf: id => s.laps(id), telemetry: (id, n) => s.telemetry(id, n), lenM: track.lenM, lapTime: track.lapTime, teamOf: TEAM_OF, seed: 5 });

const tests = {
  'sorpasso: la coppia in cui chi è dietro è più veloce, con distacco, differenza al giro e giri per arrivare a 1 secondo'() {
    const s = race(900), c = ctx(s), f = I.catchForecast(c);
    assert.ok(f, 'nessuna previsione dopo 9 giri');
    const ia = c.st.cars.findIndex(x => x.id === f.ahead.id), ib = c.st.cars.findIndex(x => x.id === f.behind.id);
    assert.strictEqual(ib, ia + 1, 'le due macchine non sono una dietro l\'altra');
    assert.ok(f.diff > 0, 'chi è dietro non è più veloce: ' + f.diff);
    assert.ok(f.gap > 1, 'distacco già sotto il secondo: ' + f.gap);
    assert.strictEqual(f.laps, Math.max(1, Math.ceil((f.gap - 1) / f.diff)));
    assert.ok(Number.isInteger(f.laps) && f.laps >= 1 && f.laps <= 30, 'giri: ' + f.laps);
    assert.strictEqual(f.atLap, c.st.lap + f.laps);
    // Nessuna coppia arriva prima di quella scelta.
    for (let i = 1; i < c.st.cars.length; i++) {
      const o = I.pairForecast(c, i); if (o && o.diff > 0 && o.gap > 1) assert.ok(o.laps >= f.laps, 'c\'era una coppia che arriva prima');
    }
  },
  'sorpasso: senza giri completati non c\'è previsione'() {
    assert.strictEqual(I.catchForecast(ctx(race(20))), null);
  },
  'passo gara: media degli ultimi 5 giri buoni (senza box e giro 1), dal più veloce, con distacco al giro'() {
    const s = race(1100), c = ctx(s), p = I.racePace({ ...c, top: 5 });
    assert.strictEqual(p.length, 5);
    for (let i = 1; i < p.length; i++) assert.ok(p[i].avg >= p[i - 1].avg, 'non in ordine');
    assert.strictEqual(p[0].delta, 0);
    const first = c.st.cars[0], laps = s.laps(first.id).filter(l => l.lapNo > 1).slice(-5);
    const mine = p.find(x => x.id === first.id);
    if (mine) assert.ok(Math.abs(mine.avg - laps.reduce((a, l) => a + l.time, 0) / laps.length) < 0.6, 'media del primo sbagliata');
    assert.ok(p.every(x => x.avg > 80 && x.avg < 130 && x.laps === 5), 'medie strane: ' + p.map(x => x.avg).join(','));
  },
  'strategie: 1 sosta e 2 soste con giri dei box, mescole e differenza di tempo; la migliore è consigliata'() {
    const s = race(600), c = ctx(s), car = c.st.cars[0];
    const r = I.strategies({ car, lap: c.st.lap, totalLaps: c.st.totalLaps, lapTime: c.lapTime });
    const one = r.options.find(o => o.stops === 1), two = r.options.find(o => o.stops === 2);
    assert.ok(one && two, 'mancano le strategie a 1 o 2 soste');
    assert.ok(r.options.filter(o => o.best).length === 1 && r.options.find(o => o.best).delta === 0, 'una sola consigliata, con +0');
    for (const o of [one, two]) {
      assert.strictEqual(o.pits.length, o.stops);
      assert.ok(o.pits.every((x, i) => x > c.st.lap && x < c.st.totalLaps && (i === 0 || x > o.pits[i - 1])), 'giri dei box: ' + o.pits);
      assert.strictEqual(o.compounds.length, o.stops + 1);
      assert.strictEqual(o.compounds[0], car.tyre, 'la prima mescola è quella montata adesso');
      assert.ok(new Set(o.compounds).size >= 2, 'servono almeno due mescole diverse');
      assert.ok(o.window[0] <= o.pits[0] && o.pits[0] <= o.window[1], 'finestra dei box: ' + o.window + ' / ' + o.pits);
      assert.ok(o.delta >= 0 && o.delta < 120, 'differenza: ' + o.delta);
    }
  },
  'frenata: curva con la frenata più forte, spazio di frenata, velocità massima, calo di velocità e g, per due piloti'() {
    const s = race(600), c = ctx(s), b = I.braking({ ...c, ids: [c.st.cars[0].id, c.st.cars[1].id] });
    assert.ok(b && Number.isInteger(b.turn) && b.turn >= 1, 'curva: ' + (b && b.turn));
    for (const x of [b.a, b.b]) {
      assert.ok(x.top > 250 && x.top < 350, 'velocità massima: ' + x.top);
      assert.ok(x.drop < -100, 'calo di velocità: ' + x.drop);
      assert.ok(x.brakeM > 30 && x.brakeM < 250, 'spazio di frenata: ' + x.brakeM);
      assert.ok(x.g > 2.5 && x.g < 6.5, 'g in frenata: ' + x.g);
    }
  },
  'prestazioni vettura: curve lente, medie e veloci, posizione tra tutti, voto su 10 e tempo perso, per i compagni di squadra'() {
    const s = race(600), c = ctx(s);
    for (const kind of ['lente', 'medie', 'veloci']) {
      const r = I.carScores({ ...c, kind });
      assert.strictEqual(r.all.length, 22);
      assert.deepStrictEqual(r.all.map(x => x.rank), Array.from({ length: 22 }, (_, i) => i + 1));
      assert.ok(r.all.every((x, i) => x.score <= 10 && x.score >= 5 && (i === 0 || x.score <= r.all[i - 1].score)), 'voti: ' + r.all.map(x => x.score));
      assert.ok(r.all[0].lost === 0 && r.all.every((x, i) => i === 0 || x.lost >= r.all[i - 1].lost), 'tempo perso');
      assert.strictEqual(r.pair.length, 2);
      assert.strictEqual(TEAM_OF[r.pair[0].id], TEAM_OF[r.pair[1].id], 'i due non sono compagni di squadra');
    }
    const lente = I.carScores({ ...c, kind: 'lente' }).all.map(x => x.id).join(), veloci = I.carScores({ ...c, kind: 'veloci' }).all.map(x => x.id).join();
    assert.notStrictEqual(lente, veloci, 'la classifica è uguale per tutti i tipi di curva');
  },
};

const filter = process.argv[2] ? new RegExp(process.argv[2], 'i') : null;
let pass = 0, fail = 0;
for (const [name, fn] of Object.entries(tests)) {
  if (filter && !filter.test(name)) continue;
  try { fn(); pass++; console.log('PASS  ' + name); }
  catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + String(e.message).split('\n')[0].slice(0, 300)); }
}
console.log(`\n${pass} passati, ${fail} falliti`); process.exit(fail ? 1 : 0);
