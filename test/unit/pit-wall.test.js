// Prove del "Muretto dei tifosi" (src/logic/pit-wall.js): Box o fuori sotto Safety Car e giochi della bandiera rossa,
// risolti con i dati veri di OpenF1 (pit, stints, laps, race_control). Uso: node test/unit/pit-wall.test.js
const assert = require('assert');
const W = require('../../src/logic/pit-wall');
const BAKU = require('../fixtures/openf1-baku-race.json');
const BR = require('../fixtures/openf1-interlagos-q1-redflag.json');
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('PASS  ' + name); } catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); } };
const near = (a, b, d = 2) => Math.abs(a - b) <= d;

t('finestre: le due Safety Car vere di Baku, finite col TRACK CLEAR (come la bandiera nell\'app)', () => {
  const w = W.createPitWall(BAKU).windows;
  assert.strictEqual(w.length, 2, JSON.stringify(w));
  assert.ok(w.every(x => x.kind === 'sc'), JSON.stringify(w));
  assert.ok(near(w[0].a, 3485) && near(w[0].b, 4274), JSON.stringify(w[0]));
  assert.ok(near(w[1].a, 4360) && near(w[1].b, 4733), JSON.stringify(w[1]));
});

t('Box o fuori: i primi 8 quando entra la Safety Car, con gomma ed età, e chi ha già fermato', () => {
  const P = W.createPitWall(BAKU), win = P.windows[0];
  assert.strictEqual(P.at(3500), win, 'a 3500 s la Safety Car è in pista');
  assert.strictEqual(P.at(3400), null);
  const b = P.boxBoard(win, 3600);
  assert.strictEqual(b.rows.length, 8);
  assert.deepStrictEqual(b.rows.map(r => r.pos), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.ok(b.rows.every(r => r.code && /^[A-Z]{3}$/.test(r.code) && r.compound && r.age >= 0), JSON.stringify(b.rows[0]));
  assert.strictEqual(b.lap, 31);
  // ai box fra 3485 e 3600: 10, 12, 1, 43, 87, 31, 41, 5, 11, 55
  assert.deepStrictEqual(b.gifted.map(g => g.number).sort((x, y) => x - y), [1, 5, 10, 11, 12, 31, 41, 43, 55, 87]);
  assert.ok(b.gifted.every(g => g.compound), 'gomma nuova di chi ha fermato');
  const r1 = b.rows.find(r => r.number === 1);
  if (r1) assert.ok(r1.pitted, 'il n. 1 ha già fermato a 3526 s');
});

t('Box o fuori: risultato solo a Safety Car finita; box = ha fermato sotto Safety Car', () => {
  const P = W.createPitWall(BAKU), win = P.windows[0];
  const top = P.boxBoard(win, 3490).rows;
  const picks = {}; top.forEach(r => { picks[r.number] = 'box'; });
  assert.strictEqual(P.boxResult(win, picks, 4000), null, 'Safety Car ancora in pista');
  const res = P.boxResult(win, picks, 4400);
  assert.ok(res, 'a 4400 s la Safety Car è rientrata');
  assert.strictEqual(res.total, 8);
  const pittedSet = new Set(BAKU.pit.filter(p => { const s = (Date.parse(p.date) - Date.parse(BAKU.session.date_start)) / 1000; return s >= 3485 && s <= 4294; }).map(p => p.driver_number));
  res.rows.forEach(r => assert.strictEqual(r.team, pittedSet.has(r.number) ? 'box' : 'out', `squadra di ${r.code}`));
  assert.strictEqual(res.right, res.rows.filter(r => r.team === 'box').length);
  const none = P.boxResult(win, {}, 4400);
  assert.strictEqual(none.total, 0, 'senza scelte non c\'è nulla da contare');
});

t('bandiera rossa vera (Interlagos Q1): finestra aperta, da quando è ferma, Rivedi 60 s prima', () => {
  const P = W.createPitWall(BR);
  const red = P.windows.find(x => x.kind === 'red');
  assert.ok(red && near(red.a, 143) && red.b == null, JSON.stringify(P.windows));
  assert.strictEqual(P.at(400), red, 'il TRACK CLEAR non toglie la rossa');
  const rb = P.redBoard(red, 400);
  assert.ok(near(rb.since, 257), 'ferma da ' + rb.since);
  assert.ok(near(rb.replayFrom, 83), 'Rivedi da ' + rb.replayFrom);
  assert.strictEqual(rb.what, null, 'la direzione gara non ha scritto il motivo');
  assert.strictEqual(P.redResult(red, { mins: 20 }, 400), null, 'rossa non finita: niente risultato');
});

// Sessione finta per la fine della rossa e la gomma della ripartenza.
const T0 = Date.parse('2026-11-08T14:00:00Z');
const iso = s => new Date(T0 + s * 1000).toISOString();
const fake = () => ({
  session: { session_type: 'Race', session_name: 'Race', date_start: iso(0) },
  drivers: [{ driver_number: 16, name_acronym: 'LEC', team_colour: 'ED1131' }, { driver_number: 4, name_acronym: 'NOR', team_colour: 'FF8000' }],
  laps: [16, 4].flatMap(d => [1, 2, 3, 4].map(n => ({ driver_number: d, lap_number: n, date_start: iso(n < 4 ? 60 + (n - 1) * 90 : 2400), lap_duration: 90 }))),
  stints: [{ driver_number: 16, stint_number: 1, lap_start: 1, lap_end: 3, compound: 'SOFT', tyre_age_at_start: 0 }, { driver_number: 16, stint_number: 2, lap_start: 4, lap_end: null, compound: 'MEDIUM', tyre_age_at_start: 0 }],
  pit: [], position: [{ driver_number: 16, date: iso(30), position: 1 }, { driver_number: 4, date: iso(30), position: 2 }],
  race_control: [
    { date: iso(250), category: 'Flag', flag: 'DOUBLE YELLOW', scope: 'Sector', sector: 7, message: 'DOUBLE YELLOW IN TRACK SECTOR 7' },
    { date: iso(258), category: 'Other', message: 'INCIDENT INVOLVING CARS 4 (NOR) AND 16 (LEC) NOTED - CAUSING A COLLISION' },
    { date: iso(270), category: 'Flag', flag: 'RED', scope: 'Track', message: 'RED FLAG' },
    { date: iso(2300), category: 'SessionStatus', message: 'SESSION RESUMED' },
  ],
});

t('rossa finita: quanto è durata, differenza dalla tua stima, gomma della ripartenza dai dati', () => {
  const P = W.createPitWall(fake());
  const red = P.windows.find(x => x.kind === 'red');
  assert.ok(red && near(red.a, 270) && near(red.b, 2300), JSON.stringify(P.windows));
  const rb = P.redBoard(red, 600);
  assert.ok(/Incidente/.test(rb.what) && /NOR/.test(rb.what) && /LEC/.test(rb.what), 'cosa è successo: ' + rb.what);
  const r = P.redResult(red, { mins: 30, tyre: 'MEDIUM', driver: 16 }, 2500);
  assert.strictEqual(r.mins, 34, 'durata in minuti: ' + r.mins);
  assert.strictEqual(r.diff, 4);
  assert.strictEqual(r.tyre.actual, 'MEDIUM');
  assert.strictEqual(r.tyre.ok, true);
  const early = P.redResult(red, { mins: 30, tyre: 'SOFT', driver: 16 }, 2320);
  assert.strictEqual(early.tyre.actual, null, 'prima che riparta il giro la gomma non si sa ancora');
  assert.strictEqual(early.tyre.ok, null);
});

t('dati rotti o vuoti: nessun errore, nessuna finestra', () => {
  assert.deepStrictEqual(W.createPitWall(null).windows, []);
  assert.deepStrictEqual(W.createPitWall({ race_control: 'x' }).windows, []);
});

console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
