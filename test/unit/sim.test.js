// Test del simulatore della diretta (prove, qualifiche, gara) — gira in Node, senza browser.
// Uso: node test/unit/sim.test.js [filtro]
const assert = require('assert');
const path = require('path');
const LiveSim = require(path.join(__dirname, '..', '..', 'src', 'logic', 'live-sim.js'));
const CIRCUITS = require(path.join(__dirname, '..', '..', 'src', 'data', 'circuits.json'));
const CODES = ['NOR', 'VER', 'ANT', 'HAD', 'LEC', 'PIA', 'RUS', 'HAM', 'SAI', 'ALB', 'ALO', 'GAS', 'LAW', 'BEA', 'HUL', 'BOR', 'OCO', 'LIN', 'COL', 'STR', 'BOT', 'PER'];
const DRIVERS = CODES.map((code, i) => ({ id: code.toLowerCase(), code, number: i + 1, color: '#ff0000' }));
const track = () => LiveSim.buildTrack(CIRCUITS['sg-2008']);
const race = (o = {}) => LiveSim.createSession({ track: track(), drivers: DRIVERS, type: 'RACE', seed: 7, script: false, ...o });
const run = (s, seconds, step = 0.5) => { for (let t = 0; t < seconds; t += step) s.advance(step); return s.state(); };

const tests = {
  'gara: ogni macchina ha la posizione di partenza (per le posizioni guadagnate del FantaF1)'() {
    const st = run(race(), 30);
    assert.deepStrictEqual(st.cars.map(c => c.grid).sort((a, b) => a - b), DRIVERS.map((_, i) => i + 1));
    assert.strictEqual(st.cars.find(c => c.id === 'nor').grid, 1);
  },
  'tracciato: punti ricampionati e lunghezza reale in metri'() {
    const t = track();
    assert.ok(t.n >= 600, 'pochi punti: ' + t.n);
    assert.strictEqual(t.lenM, 4928);
    const a = t.pointAt(0), b = t.pointAt(t.lenM);
    assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) < 1, 'il giro non si chiude');
  },
  'tracciato: velocità realistiche e giro tra 1:28 e 1:40 a Singapore'() {
    const t = track();
    const kmh = t.speed.map(v => v * 3.6);
    assert.ok(Math.min(...kmh) < 110, 'curve troppo veloci: ' + Math.min(...kmh));
    assert.ok(Math.max(...kmh) > 280, 'rettilinei troppo lenti: ' + Math.max(...kmh));
    assert.ok(t.lapTime > 88 && t.lapTime < 100, 'giro irrealistico: ' + t.lapTime);
    const monza = LiveSim.buildTrack(CIRCUITS['it-1922']), monaco = LiveSim.buildTrack(CIRCUITS['mc-1929']);
    assert.ok(monza.lapTime < 88 && monza.lapTime > 74, 'Monza: ' + monza.lapTime);
    assert.ok(monaco.lapTime < 82 && monaco.lapTime > 66, 'Monaco: ' + monaco.lapTime);
  },
  'gara: dopo 4 minuti classifica ordinata, distacchi crescenti, tempi e settori'() {
    const st = run(race(), 240);
    assert.strictEqual(st.cars.length, 22);
    assert.ok(st.lap >= 3, 'giro attuale: ' + st.lap);
    st.cars.forEach((c, i) => assert.strictEqual(c.pos, i + 1));
    for (let i = 1; i < st.cars.length; i++) assert.ok(st.cars[i].gap >= st.cars[i - 1].gap - 1e-6, 'distacchi non crescenti');
    const c = st.cars[3];
    assert.ok(c.last && c.last.time > 80 && c.last.time < 130, 'ultimo giro mancante o strano: ' + (c.last && c.last.time));
    const sum = c.last.sectors.reduce((a, s) => a + s.t, 0);
    assert.ok(Math.abs(sum - c.last.time) < 0.05, 'i settori non sommano al giro');
    assert.strictEqual(c.minis.length, 24);
    assert.ok(c.minis.every(m => ['purple', 'green', 'yellow', 'none', 'pit'].includes(m)));
    assert.ok(st.cars.some(x => x.minis.includes('purple')), 'nessun minisettore viola');
  },
  'gara: il primo giro e l\'ultimo hanno lo sfondo a scacchi'() {
    const s = race();
    assert.strictEqual(s.state().bg, 'chequered');
    const mid = run(s, 150);
    assert.strictEqual(mid.bg, 'green');
    s.jumpToLastLap(); s.advance(0.5);
    const st = s.state();
    assert.strictEqual(st.lap, st.totalLaps);
    assert.strictEqual(st.bg, 'chequered');
  },
  'bandiere: gialla, VSC e SC fanno lo sfondo giallo, la rossa rosso'() {
    const s = race(); run(s, 120);
    s.setFlag('yellow', 2); assert.strictEqual(s.state().bg, 'yellow'); assert.strictEqual(s.state().flagSector, 2);
    s.setFlag('vsc'); assert.strictEqual(s.state().bg, 'yellow');
    s.setFlag('sc'); assert.strictEqual(s.state().bg, 'yellow');
    s.setFlag('red'); assert.strictEqual(s.state().bg, 'red');
    s.setFlag('green'); assert.strictEqual(s.state().bg, 'green');
    assert.ok(s.state().messages.some(m => /BANDIERA ROSSA/.test(m.text)), 'manca il messaggio della bandiera rossa');
  },
  'safety car: le macchine rallentano e si compattano; bandiera rossa: si fermano ai box'() {
    const s = race(); run(s, 400);
    const green = s.state(), spread0 = green.cars[0].dist - green.cars[21].dist;
    const vGreen = green.cars.reduce((a, c) => a + c.speed, 0) / 22;
    s.setFlag('sc'); const st = run(s, 150);
    const spread = st.cars[0].dist - st.cars[21].dist, vSc = st.cars.reduce((a, c) => a + c.speed, 0) / 22;
    assert.ok(vSc < vGreen * 0.8, `con la SC non rallentano (${vGreen.toFixed(0)} → ${vSc.toFixed(0)} m/s)`);
    assert.ok(spread < 25 * 21 + 150 && spread < spread0, `con la SC il gruppo non si compatta (${spread0.toFixed(0)} m → ${spread.toFixed(0)} m)`);
    assert.ok(st.cars.every((c, i) => i === 0 || c.interval < 2.5), 'con la SC restano buchi tra le macchine');
    s.setFlag('red'); const r = run(s, 180);
    assert.ok(r.cars.every(c => c.speed < 1), 'con la bandiera rossa qualcuno si muove ancora');
    s.setFlag('green'); const g = run(s, 10);
    assert.ok(g.cars.some(c => c.speed > 5), 'dopo la ripartenza nessuno si muove');
  },
  'direzione gara: messaggi di limiti della pista, investigazioni, penalità, incidenti, VSC, SC'() {
    const s = race({ script: true });
    const seen = new Set();
    for (let i = 0; i < 2200; i++) { s.advance(0.5); const st = s.state(); seen.add(st.bg); if (st.lap > 9) break; }
    const txt = s.state().messages.map(m => m.text).join(' | ');
    for (const w of ['LIMITI DELLA PISTA', 'INVESTIGA', 'PENALITÀ', 'INCIDENTE', 'VIRTUAL SAFETY CAR', 'SAFETY CAR', 'BANDIERA GIALLA', 'BANDIERA ROSSA'])
      assert.ok(txt.includes(w), 'manca il messaggio: ' + w);
    assert.ok(seen.has('yellow') && seen.has('red'), 'lo sfondo non è mai diventato giallo e rosso: ' + [...seen]);
  },
  'qualifiche: Q1 con cronometro, ordine per miglior giro, 6 eliminati dopo la Q1'() {
    const s = LiveSim.createSession({ track: track(), drivers: DRIVERS, type: 'QUALI', seed: 3, script: false });
    const st0 = s.state();
    assert.strictEqual(st0.segment, 'Q1'); assert.ok(st0.clock > 17 * 60, 'cronometro Q1: ' + st0.clock);
    const st = run(s, 18 * 60 + 200, 1);
    assert.ok(['Q2', 'Q3'].includes(st.segment), 'dopo la Q1 non si passa alla Q2: ' + st.segment);
    assert.strictEqual(st.cars.filter(c => c.out).length, 6);
    assert.ok(st.cars.slice(-6).every(c => c.out), 'gli eliminati non sono in fondo');
    const q = st.cars.filter(c => !c.out && c.best);
    for (let i = 1; i < q.length; i++) assert.ok(q[i].best.time >= q[i - 1].best.time, 'ordine per miglior giro sbagliato');
  },
  'prove libere: cronometro di 60 minuti e classifica per miglior giro'() {
    const s = LiveSim.createSession({ track: track(), drivers: DRIVERS, type: 'FP2', seed: 5, script: false });
    assert.ok(s.state().clock > 59 * 60);
    const st = run(s, 400, 1);
    const withTime = st.cars.filter(c => c.best);
    assert.ok(withTime.length > 15, 'pochi tempi: ' + withTime.length);
  },
  'telemetria: velocità, acceleratore, freno, marcia e giri motore di un giro vero'() {
    const s = race(); run(s, 240);
    const c = s.state().cars[0];
    const tel = s.telemetry(c.id, c.last.lapNo);
    assert.ok(tel && tel.speed.length > 200, 'telemetria vuota');
    for (const k of ['dist', 'speed', 'throttle', 'brake', 'gear', 'rpm']) assert.strictEqual(tel[k].length, tel.speed.length, k);
    assert.ok(Math.max(...tel.speed) > 280 && Math.min(...tel.speed) < 120, 'velocità strane');
    assert.ok(tel.brake.some(b => b === 1) && tel.throttle.some(t => t >= 99), 'freno o acceleratore mai usati');
    assert.ok(tel.gear.every(g => g >= 1 && g <= 8), 'marce fuori scala');
    assert.strictEqual(tel.sectorDist.length, 2);
    assert.ok(Math.abs(tel.time - c.last.time) < 0.01, 'la telemetria non è di quel giro');
  },
  'meteo: condizioni attuali e previsioni scritte per FP1, FP2, FP3, qualifiche e gara'() {
    const w = LiveSim.weather({ circuitId: 'sg-2008', raceDate: '2026-10-11', seed: 1 });
    for (const k of ['air', 'track', 'humidity', 'wind', 'windDir', 'rain']) assert.ok(k in w.current, k);
    assert.deepStrictEqual(w.sessions.map(x => x.key), ['FP1', 'FP2', 'FP3', 'QUALI', 'RACE']);
    w.sessions.forEach(x => assert.ok(x.text.length > 40 && /°C/.test(x.text) && /pioggia/i.test(x.text), 'previsione troppo vaga: ' + x.text));
  },
  'meteo: ogni previsione ha un\'icona coerente con il cielo, e di sera la luna al posto del sole'() {
    const seen = new Set();
    for (const id of Object.keys(CIRCUITS)) for (let seed = 1; seed <= 6; seed++) {
      LiveSim.weather({ circuitId: id, raceDate: '2026-06-01', seed }).sessions.forEach(x => {
        const evening = parseInt(x.time, 10) >= 18;
        const want = x.rainPct < 12 ? (evening ? 'moon' : 'sun') : x.rainPct < 30 ? (evening ? 'cloud-moon' : 'cloud-sun') : x.rainPct < 50 ? 'cloud' : 'rain';
        assert.strictEqual(x.icon, want, `${id} ${x.key} (${x.time}, pioggia ${x.rainPct}%): icona ${x.icon}, attesa ${want}`);
        seen.add(x.icon);
      });
    }
    for (const k of ['sun', 'moon', 'cloud-sun', 'cloud', 'rain']) assert.ok(seen.has(k), 'icona mai usata: ' + k);
  },
  'qualifiche sprint: SQ1, SQ2 e SQ3 da 12, 10 e 8 minuti, 6 eliminati dopo SQ1'() {
    const s = LiveSim.createSession({ track: track(), drivers: DRIVERS, type: 'SQ', seed: 3, script: false });
    const st0 = s.state();
    assert.strictEqual(st0.segment, 'SQ1'); assert.ok(st0.clock > 11 * 60 && st0.clock <= 12 * 60, 'cronometro SQ1: ' + st0.clock);
    const st = run(s, 12 * 60 + 100, 1);
    assert.strictEqual(st.segment, 'SQ2'); assert.ok(st.clock <= 10 * 60, 'cronometro SQ2: ' + st.clock);
    assert.strictEqual(st.cars.filter(c => c.out).length, 6);
    assert.ok(st.cars.filter(c => c.out).every(c => c.outIn === 'SQ1'), 'eliminati non segnati in SQ1');
  },
  'sprint: gara di circa 100 km (21 giri a Singapore) con tempi e settori'() {
    const s = LiveSim.createSession({ track: track(), drivers: DRIVERS, type: 'SPRINT', seed: 4, script: false });
    assert.strictEqual(s.totalLaps, 21);
    const st = run(s, 240);
    assert.strictEqual(st.totalLaps, 21); assert.ok(st.lap >= 2, 'la sprint non avanza');
    assert.ok(st.cars[3].last && st.cars[3].last.sectors.length === 3, 'mancano tempi e settori nella sprint');
    s.jumpToLastLap(); s.advance(0.5); assert.strictEqual(s.state().lap, 21);
  },
  'meteo: sessioni del weekend dagli orari ufficiali (UTC + fuso), con ora e giorno locali'() {
    const sessions = [{ key: 'FP1', utc: '2026-10-09T08:30Z' }, { key: 'SQ', utc: '2026-10-09T12:30Z' }, { key: 'SPRINT', utc: '2026-10-10T09:00Z' }, { key: 'QUALI', utc: '2026-10-10T13:00Z' }, { key: 'RACE', utc: '2026-10-11T12:00Z' }];
    const w = LiveSim.weather({ circuitId: 'sg-2008', raceDate: '2026-10-11', seed: 16, sessions, tz: 'Asia/Singapore' });
    assert.deepStrictEqual(w.sessions.map(x => x.key), ['FP1', 'SQ', 'SPRINT', 'QUALI', 'RACE']);
    assert.deepStrictEqual(w.sessions.map(x => x.time), ['16:30', '20:30', '17:00', '21:00', '20:00']);
    assert.ok(/ven/i.test(w.sessions[0].day) && /9 ott/.test(w.sessions[0].day), 'giorno FP1: ' + w.sessions[0].day);
    assert.strictEqual(w.sessions[1].label, 'Qualifiche Sprint'); assert.strictEqual(w.sessions[2].label, 'Sprint');
    assert.ok(w.sessions[4].icon === 'moon' || w.sessions[4].icon === 'cloud-moon' || w.sessions[4].icon === 'cloud' || w.sessions[4].icon === 'rain', 'gara di sera con icona da giorno: ' + w.sessions[4].icon);
    const noSched = LiveSim.weather({ circuitId: 'sg-2008', raceDate: '2026-10-11', seed: 16, format: 'sprint' });
    assert.deepStrictEqual(noSched.sessions.map(x => x.key), ['FP1', 'SQ', 'SPRINT', 'QUALI', 'RACE'], 'senza orari ufficiali il weekend Sprint non ha le sue sessioni');
  },
  'meteo: ogni sessione ha l\'esito reale (pioggia sì o no), sempre uguale e coerente con la probabilità'() {
    const a = LiveSim.weather({ circuitId: 'sg-2008', raceDate: '2026-10-11', seed: 16 }), b = LiveSim.weather({ circuitId: 'sg-2008', raceDate: '2026-10-11', seed: 16 });
    assert.ok(a.sessions.every(x => x.outcome === 'rain' || x.outcome === 'dry'), 'esito mancante');
    assert.deepStrictEqual(a.sessions.map(x => x.outcome), b.sessions.map(x => x.outcome), 'l\'esito cambia a ogni chiamata');
    let rainyHigh = 0, rainyLow = 0, nHigh = 0, nLow = 0;
    for (const id of Object.keys(CIRCUITS)) for (let seed = 1; seed <= 12; seed++) LiveSim.weather({ circuitId: id, raceDate: '2026-06-01', seed }).sessions.forEach(x => {
      if (x.rainPct >= 60) { nHigh++; if (x.outcome === 'rain') rainyHigh++; }
      if (x.rainPct <= 10) { nLow++; if (x.outcome === 'rain') rainyLow++; }
    });
    assert.ok(nLow > 20 && rainyLow / nLow < 0.15, `con poca probabilità piove troppo spesso (${rainyLow}/${nLow})`);
    assert.ok(nHigh === 0 || rainyHigh / nHigh > 0.45, `con tanta probabilità non piove quasi mai (${rainyHigh}/${nHigh})`);
    const wet = a.sessions.find(x => x.outcome === 'rain'), dry = a.sessions.find(x => x.outcome === 'dry');
    if (wet) assert.strictEqual(LiveSim.weather({ circuitId: 'sg-2008', raceDate: '2026-10-11', seed: 16, liveKey: wet.key, t: 600 }).current.rain, true, 'durante una sessione con pioggia non piove');
    if (dry) assert.strictEqual(LiveSim.weather({ circuitId: 'sg-2008', raceDate: '2026-10-11', seed: 16, liveKey: dry.key, t: 600 }).current.rain, false, 'durante una sessione asciutta piove');
  },
  'telemetria in diretta: velocità, marcia, gas, freno e giri motore di adesso'() {
    const s = race(); run(s, 200);
    const c = s.state().cars[2];
    const lt = s.liveTelemetry(c.id);
    assert.ok(lt, 'telemetria in diretta mancante');
    assert.strictEqual(lt.code, c.code);
    assert.ok(Math.abs(lt.speed - c.speed * 3.6) < 1.5, `velocità diversa da quella della macchina (${lt.speed} vs ${(c.speed * 3.6).toFixed(0)})`);
    assert.ok(lt.gear >= 1 && lt.gear <= 8 && lt.throttle >= 0 && lt.throttle <= 100 && (lt.brake === 0 || lt.brake === 1) && lt.rpm >= 4000 && lt.rpm <= 12500, 'valori fuori scala: ' + JSON.stringify(lt));
    const seen = { brake: 0, full: 0 };
    for (let i = 0; i < 400; i++) { s.advance(0.25); const x = s.liveTelemetry(c.id); if (x.brake) seen.brake++; if (x.throttle >= 99) seen.full++; }
    assert.ok(seen.brake > 5 && seen.full > 20, 'in un giro non frena o non va mai a tavoletta: ' + JSON.stringify(seen));
  },
  'gomme: in gara si va ai box quando sono consumate, poi gomme nuove (usura in %)'() {
    const s = race(); let pitted = 0;
    const before = s.state().cars.map(c => c.tyre);
    for (let i = 0; i < 26 * 100 * 4; i++) { s.advance(0.25); if (i % 40 === 0) { const st = s.state(); pitted = Math.max(pitted, st.cars.filter(c => c.stops > 0).length); if (st.lap >= 26) break; } }
    const st = s.state();
    assert.ok(st.cars.every(c => typeof c.wear === 'number' && c.wear >= 0 && c.wear <= 100), 'usura mancante o fuori scala');
    assert.ok(pitted >= 5, 'dopo 26 giri quasi nessuno si è fermato ai box: ' + pitted);
    const stopped = st.cars.filter(c => c.stops > 0);
    assert.ok(stopped.every(c => c.tyreAge < 26), 'chi si è fermato non ha gomme nuove');
    assert.ok(stopped.some((c, i) => c.tyre !== before[DRIVERS.findIndex(d => d.id === c.id)]), 'dopo la sosta la mescola non cambia mai');
  },
  'stesso seme, stessa gara'() {
    const a = run(race(), 100), b = run(race(), 100);
    assert.deepStrictEqual(a.cars.map(c => c.id + c.gap.toFixed(3)), b.cars.map(c => c.id + c.gap.toFixed(3)));
  },
  'ritiri: chi si ritira si ferma, va in fondo con la causa e il giro, e non finisce la gara'() {
    const s = race(); run(s, 200);
    const lapAt = s.state().cars.find(c => c.id === 'nor').lap;
    assert.strictEqual(s.retire('nor', 'motore'), true);
    assert.strictEqual(s.retire('nor', 'incendio'), false, 'si ritira due volte');
    s.retire('ver', 'boh');   // causa sconosciuta: generica
    const st = run(s, 30), n = st.cars.find(c => c.id === 'nor'), v = st.cars.find(c => c.id === 'ver');
    assert.deepStrictEqual([n.dnf && n.dnf.cause, n.dnf && n.dnf.lap], ['motore', lapAt]);
    assert.strictEqual(v.dnf.cause, 'altro');
    assert.deepStrictEqual(st.cars.slice(-2).map(c => c.id).sort(), ['nor', 'ver'], 'i ritirati non sono in fondo');
    assert.ok(st.cars.slice(0, -2).every(c => !c.dnf), 'ritirati in mezzo alla classifica');
    const d0 = n.dist; const st2 = run(s, 30);
    assert.strictEqual(st2.cars.find(c => c.id === 'nor').dist, d0, 'la macchina ritirata si muove ancora');
    assert.ok(!st2.cars.find(c => c.id === 'nor').pit, 'il ritirato risulta ai box');
    assert.ok(st2.messages.some(m => /RITIRATO/.test(m.text) && /NOR/.test(m.text) && /MOTORE/.test(m.text)), 'manca il messaggio del ritiro');
    assert.deepStrictEqual(s.feed().dnfs.map(x => x.id), ['nor', 'ver']);
    s.jumpToLastLap(); const fin = run(s, 200);
    assert.ok(fin.finished, 'la gara non finisce');
    assert.ok(!fin.cars.find(c => c.id === 'nor').finished && fin.cars.find(c => c.id === 'nor').dnf, 'il ritirato ha finito la gara');
    assert.ok(fin.cars[0].finished && !fin.cars[0].dnf, 'il vincitore è un ritirato');
  },
  'ritiri: nella gara demo ci sono ritiri per motore, incidente, incendio e troppe penalità'() {
    const s = race({ script: true }); let st;
    for (let i = 0; i < 40 * 100 * 4; i++) { s.advance(0.25); if (i % 80 === 0) { st = s.state(); if (st.lap >= 16) break; } }
    st = s.state();
    const causes = st.cars.filter(c => c.dnf).map(c => c.dnf.cause).sort();
    assert.deepStrictEqual(causes, ['incendio', 'incidente', 'motore', 'penalita']);
    assert.ok(st.messages.some(m => /SQUALIFICA|BANDIERA NERA/.test(m.text)), 'manca la squalifica per troppe penalità');
  },
  'giro più veloce: feed() dice chi ha il giro più veloce senza calcolare tutta la classifica'() {
    const s = race(); assert.strictEqual(s.feed().bestLap, null);
    run(s, 260);
    const f = s.feed(), st = s.state();
    assert.ok(f.bestLap && f.bestLap.lapNo >= 2, 'giro più veloce mancante: ' + JSON.stringify(f.bestLap));
    assert.deepStrictEqual(f.bestLap, st.bestLap);
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
