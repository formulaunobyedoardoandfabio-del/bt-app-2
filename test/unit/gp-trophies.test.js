// Prove dei B&T Trophies del GP (src/logic/gp-trophies.js): premi calcolati sui dati veri di OpenF1 della sessione.
// Uso: node test/unit/gp-trophies.test.js
const assert = require('assert');
const G = require('../../src/logic/gp-trophies');
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('PASS  ' + name); } catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); } };

// Sessione finta: partenza alle 14:00:00, giro 1 alle 14:01:00, giri da 90 s.
const T0 = Date.parse('2026-11-08T14:00:00Z');
const iso = s => new Date(T0 + s * 1000).toISOString();
const LAP = n => 60 + (n - 1) * 90;   // secondi dalla partenza dell'inizio del giro n
const DRV = {
  1: ['VER', 'Max', 'Verstappen', 'Red Bull Racing', '3671C6'], 4: ['NOR', 'Lando', 'Norris', 'McLaren', 'FF8000'],
  16: ['LEC', 'Charles', 'Leclerc', 'Ferrari', 'ED1131'], 44: ['HAM', 'Lewis', 'Hamilton', 'Ferrari', 'ED1131'], 14: ['ALO', 'Fernando', 'Alonso', 'Aston Martin', '229971'],
};
const drivers = nums => nums.map(n => ({ driver_number: n, name_acronym: DRV[n][0], first_name: DRV[n][1], last_name: DRV[n][2], full_name: `${DRV[n][1]} ${DRV[n][2].toUpperCase()}`, team_name: DRV[n][3], team_colour: DRV[n][4] }));
const laps = (nums, n = 20, dur = () => 90) => nums.flatMap(d => Array.from({ length: n }, (_, i) => ({ driver_number: d, lap_number: i + 1, date_start: iso(LAP(i + 1)), lap_duration: dur(d, i + 1), is_pit_out_lap: false, st_speed: 300 + d, segments_sector_1: [], segments_sector_2: [], segments_sector_3: [] })));
const pos = (d, s, p) => ({ driver_number: d, date: iso(s), position: p });
// distacco dalla macchina davanti ogni 4 s fra due istanti
const ivs = (d, from, to, interval, gap = 5) => { const out = []; for (let s = from; s < to; s += 4) out.push({ driver_number: d, date: iso(s), interval, gap_to_leader: gap }); return out; };
const base = (nums, extra = {}) => ({ session: { session_type: 'Race', session_name: 'Race', date_start: iso(0) }, drivers: drivers(nums), laps: laps(nums), stints: [], pit: [], position: [], intervals: [], race_control: [], weather: [], session_result: [], ...extra });

t('Maestro della difesa: chi ha tenuto dietro l\'altro a meno di 0,5 s senza perdere la posizione (Safety Car esclusa)', () => {
  const raw = base([16, 1, 4], {
    position: [pos(16, 30, 1), pos(1, 30, 2), pos(4, 30, 3)],
    intervals: [...ivs(4, LAP(3), LAP(13), 0.3), ...ivs(1, LAP(2), LAP(20), 2.5)],
    race_control: [{ date: iso(LAP(5)), category: 'SafetyCar', message: 'SAFETY CAR DEPLOYED' }, { date: iso(LAP(7)), category: 'Flag', flag: 'GREEN', message: 'TRACK CLEAR' }],
  });
  const r = G.computeGpTrophies(raw, { type: 'RACE' });
  const m = [r.headline, ...r.list].find(x => x && x.id === 'difesa');
  assert.ok(m, 'manca il Maestro della difesa');
  assert.strictEqual(m.num, 1);
  assert.strictEqual(m.who, 'Max Verstappen');
  assert.strictEqual(m.rival, 'NOR');
  assert.strictEqual(m.value, 8, 'giri sotto 0,5 s (10 meno i 2 di Safety Car): ' + m.value);
  assert.ok(/Norris/.test(m.text) && /8 giri/.test(m.text) && /0,5 s/.test(m.text), m.text);
  assert.strictEqual(r.headline.id, 'difesa', 'il Maestro è il trofeo della gara');
  assert.ok(m.chart && m.chart.bars.length >= 10 && m.chart.bars.some(b => b.on), 'barre del distacco');
  assert.ok(Math.abs(m.t - LAP(3)) < 5, 'Rivedi parte quando comincia la difesa: ' + m.t);
});

t('Maestro della difesa: se alla fine viene passato quella difesa non conta', () => {
  const raw = base([16, 1, 4], {
    position: [pos(16, 30, 1), pos(1, 30, 2), pos(4, 30, 3), pos(4, LAP(9) + 2, 2), pos(1, LAP(9) + 2, 3)],
    intervals: [...ivs(4, LAP(3), LAP(9), 0.3)],
  });
  const r = G.computeGpTrophies(raw, { type: 'RACE' });
  assert.ok(![r.headline, ...r.list].some(x => x && x.id === 'difesa' && x.num === 1), JSON.stringify(r.list.map(x => x.id + ':' + x.num)));
});

t('Il Mastino: più tempo a meno di 1 s da chi sta davanti; niente nel giro 1', () => {
  const raw = base([16, 1, 4], {
    position: [pos(16, 30, 1), pos(1, 30, 2), pos(4, 30, 3)],
    intervals: [...ivs(4, LAP(1), LAP(2), 0.2), ...ivs(4, LAP(4), LAP(10), 0.8), ...ivs(1, LAP(4), LAP(7), 0.7)],
  });
  const m = G.computeGpTrophies(raw, { type: 'RACE' }).all.find(x => x.id === 'mastino');
  assert.ok(m && m.num === 4 && m.value === 6 && m.rival === 'VER', JSON.stringify(m && { n: m.num, v: m.value, r: m.rival }));
});

t('Re del bagnato: posizioni guadagnate mentre piove, anche fuori dal podio', () => {
  const rain = []; for (let s = 0; s < LAP(20); s += 60) rain.push({ date: iso(s), rainfall: s >= LAP(5) && s < LAP(13) ? 1 : 0 });
  const raw = base([16, 1, 4, 44], {
    position: [pos(16, 30, 1), pos(1, 30, 2), pos(4, 30, 3), pos(44, 30, 4), pos(44, LAP(7), 3), pos(4, LAP(7), 4), pos(44, LAP(10), 2), pos(1, LAP(10), 3)],
    weather: rain,
    stints: [{ driver_number: 44, stint_number: 2, compound: 'INTERMEDIATE', lap_start: 5, lap_end: 14 }],
    session_result: [{ driver_number: 16, position: 1 }, { driver_number: 44, position: 4 }, { driver_number: 1, position: 2 }, { driver_number: 4, position: 3 }],
  });
  const w = G.computeGpTrophies(raw, { type: 'RACE' }).all.find(x => x.id === 'bagnato');
  assert.ok(w && w.num === 44 && w.value === 2, JSON.stringify(w && { n: w.num, v: w.value }));
  assert.ok(/\+2 posizioni/.test(w.stat), w.stat);
  assert.strictEqual(w.tiles[1].big, '8', 'giri con la pioggia: ' + JSON.stringify(w.tiles));
  assert.strictEqual(w.tiles[2].tyre, 'INTERMEDIATE');
  assert.ok(/4°/.test(w.note), 'arrivato 4°, fuori dal podio: ' + w.note);
  assert.ok(w.chart && w.chart.kind === 'pos' && w.chart.band && w.chart.band[0] === 5, JSON.stringify(w.chart && w.chart.band));
});

t('senza pioggia e senza gomme da bagnato niente Re del bagnato', () => {
  const raw = base([16, 1], { position: [pos(16, 30, 1), pos(1, 30, 2), pos(1, LAP(6), 1), pos(16, LAP(6), 2)] });
  assert.ok(!G.computeGpTrophies(raw, { type: 'RACE' }).all.some(x => x.id === 'bagnato'));
});

t('Partenza razzo e La Fenice: dalla griglia (prima del via) al primo giro e all\'arrivo', () => {
  const raw = base([16, 1, 4, 44], {
    position: [pos(16, 20, 1), pos(4, 20, 2), pos(44, 20, 3), pos(1, 20, 4), pos(1, LAP(2) - 5, 2), pos(4, LAP(2) - 5, 3), pos(44, LAP(2) - 5, 4)],
    session_result: [{ driver_number: 1, position: 1 }, { driver_number: 16, position: 2 }, { driver_number: 4, position: 3 }, { driver_number: 44, position: 4 }],
  });
  const all = G.computeGpTrophies(raw, { type: 'RACE' }).all;
  const p = all.find(x => x.id === 'partenza'), f = all.find(x => x.id === 'fenice');
  assert.ok(p && p.num === 1 && p.value === 2 && /da 4° a 2°/.test(p.stat), JSON.stringify(p && p.stat));
  assert.ok(f && f.num === 1 && f.value === 3 && /da 4° a 1°/.test(f.stat), JSON.stringify(f && f.stat));
});

t('senza posizioni prima del via niente Partenza razzo né Fenice (non si inventa la griglia)', () => {
  const raw = base([16, 1], { position: [pos(16, LAP(2), 1), pos(1, LAP(2), 2)], session_result: [{ driver_number: 1, position: 1 }, { driver_number: 16, position: 2 }] });
  const ids = G.computeGpTrophies(raw, { type: 'RACE' }).all.map(x => x.id);
  assert.ok(!ids.includes('partenza') && !ids.includes('fenice'), ids.join());
});

t('Pittore di cordoli: chi ha più tempi cancellati per i limiti della pista (almeno 2)', () => {
  const del = (d, c, s) => ({ date: iso(s), category: 'Other', driver_number: d, message: `CAR ${d} (${c}) TIME 1:31.204 DELETED - TRACK LIMITS AT TURN 4 LAP 7 14:10:00` });
  const raw = base([16, 14], { race_control: [del(14, 'ALO', 600), del(14, 'ALO', 800), { date: iso(900), category: 'Other', driver_number: 14, message: 'CAR 14 (ALO) LAP DELETED - TRACK LIMITS AT TURN 1 LAP 9 14:15:00' }, del(16, 'LEC', 700)] });
  const k = G.computeGpTrophies(raw, { type: 'RACE' }).all.find(x => x.id === 'cordoli');
  assert.ok(k && k.num === 14 && k.value === 3 && k.family === 'irony' && /3 tempi cancellati/.test(k.stat), JSON.stringify(k && k.stat));
});

t('Pit crew d\'oro è della squadra e usa solo il tempo da fermo', () => {
  const raw = base([16, 1, 4], { pit: [{ driver_number: 4, lap_number: 10, date: iso(LAP(10)), stop_duration: 2.1, pit_duration: 22 }, { driver_number: 1, lap_number: 11, date: iso(LAP(11)), stop_duration: 2.6 }, { driver_number: 16, lap_number: 9, date: iso(LAP(9)), stop_duration: null, pit_duration: 19 }] });
  const c = G.computeGpTrophies(raw, { type: 'RACE' }).all.find(x => x.id === 'pitcrew');
  assert.ok(c && c.who === 'McLaren' && /2,1 s da fermo/.test(c.stat), JSON.stringify(c && [c.who, c.stat]));
});

t('gara vera di Baku: i trofei che i dati permettono, ognuno con chi, numero, regola e un momento della gara', () => {
  const raw = require('../fixtures/openf1-baku-race.json');
  const r = G.computeGpTrophies(raw, { type: 'RACE' });
  const ids = r.all.map(x => x.id);
  ['missile', 'minisettori', 'metronomo', 'eterna', 'ripartenza'].forEach(id => assert.ok(ids.includes(id), 'manca ' + id + ' in ' + ids.join()));
  assert.ok(!ids.includes('pitcrew'), 'a Baku non ci sono i tempi da fermo: niente Pit crew d\'oro');
  assert.ok(!ids.includes('partenza') && !ids.includes('bagnato'), 'niente griglia e niente pioggia nella prova di Baku: ' + ids.join());
  assert.ok(r.headline && r.list.length === r.all.length - 1 && !r.list.includes(r.headline));
  r.all.forEach(x => {
    assert.ok(x.who && x.stat && x.rule && x.name, 'campi: ' + JSON.stringify(x).slice(0, 200));
    assert.ok(Number.isFinite(x.t) && x.t >= 0 && x.t < 3 * 3600, x.id + ' t=' + x.t);
    assert.ok(!/\d\.\d/.test(x.stat), 'virgola italiana nei numeri: ' + x.stat);
  });
  const ms = r.all.find(x => x.id === 'missile');
  const top = Math.max(...raw.laps.map(l => l.st_speed || 0));
  assert.ok(ms.value === top && new RegExp(top + ' km/h').test(ms.stat), ms.stat);
});

t('qualifica: Giro della vita (distacco più grande sul compagno) e niente trofei da gara', () => {
  const raw = base([16, 44, 1, 4], { session: { session_type: 'Qualifying', session_name: 'Qualifying', date_start: iso(0) } });
  raw.laps = laps([16, 44, 1, 4], 3, (d, n) => ({ 16: 80.1, 44: 80.9, 1: 80.3, 4: 80.4 })[d] + (n === 3 ? 0 : 2));
  const r = G.computeGpTrophies(raw, { type: 'QUALI' });
  const g = r.all.find(x => x.id === 'giro');
  assert.ok(g && g.num === 16 && /0,800 s/.test(g.stat) && /Hamilton/.test(g.text), JSON.stringify(g && [g.num, g.stat, g.text]));
  assert.ok(!r.all.some(x => ['difesa', 'mastino', 'partenza', 'fenice', 'ripartenza', 'eterna'].includes(x.id)), r.all.map(x => x.id).join());
});

t('dati vuoti o rotti: nessun trofeo e nessun errore', () => {
  [null, {}, { session: {}, laps: 'x' }, base([16])].forEach(raw => {
    const r = G.computeGpTrophies(raw, { type: 'RACE' });
    assert.ok(Array.isArray(r.all) && Array.isArray(r.list));
  });
});

console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
