// Prove dei punti FantaF1 veri (31/10; src/logic/fanta-season.js): risultati di Jolpica (gara, qualifiche, Sprint) →
// sessioni per le regole di sempre (BtLogic.sessionPoints); punti di una squadra in una stagione dalla sua storia
// (la squadra che c'era quando il weekend si è bloccato), coi cambi oltre i gratis che tolgono punti.
// Uso: node test/unit/fanta-season.test.js [filtro]
const assert = require('assert');
const path = require('path');
const FS = require(path.join(__dirname, '..', '..', 'src', 'logic', 'fanta-season.js'));
const BtLogic = require(path.join(__dirname, '..', '..', 'src', 'logic', 'bt-logic.js'));

const drv = (given, family) => ({ givenName: given, familyName: family });
const res = (pos, grid, d, extra = {}) => ({ position: String(pos), positionText: extra.text || String(pos), grid: String(grid), status: extra.status || 'Finished', Driver: d, ...(extra.fl ? { FastestLap: { rank: '1' } } : {}) });
const page = (key, races, total) => ({ MRData: { total: String(total), limit: '100', offset: '0', RaceTable: { season: '2026', Races: races.map(r => ({ season: '2026', ...r })) } } });
const LEC = drv('Charles', 'Leclerc'), HAM = drv('Lewis', 'Hamilton'), ANT = drv('Andrea Kimi', 'Antonelli'), RUS = drv('George', 'Russell'), NOR = drv('Lando', 'Norris');
const RACE1 = { round: '1', Results: [res(1, 3, LEC, { fl: true }), res(2, 1, ANT), res(3, 2, RUS), { ...res(4, 5, HAM, { text: 'R', status: 'Retired' }) }, res(5, 4, NOR)] };
const QUALI1 = { round: '1', QualifyingResults: [{ position: '1', Driver: ANT, Q1: '1:30', Q2: '1:29', Q3: '1:28' }, { position: '2', Driver: RUS, Q1: '1:30', Q2: '1:29', Q3: '1:28.5' }, { position: '3', Driver: LEC, Q1: '1:31', Q2: '1:30', Q3: '1:29' }, { position: '11', Driver: HAM, Q1: '1:31', Q2: '1:31' }, { position: '16', Driver: NOR, Q1: '1:32' }] };

const tests = {
  'Jolpica → round con gara, qualifiche e Sprint (piloti riconosciuti, ritiri, giro veloce, fuori in Q1/Q2)'() {
    const rounds = FS.roundsFromJolpica({ results: [page('Results', [RACE1], 5)], qualifying: [page('QualifyingResults', [QUALI1], 5)], sprint: [] });
    assert.strictEqual(rounds.length, 1);
    const r = rounds[0];
    assert.strictEqual(r.round, 1);
    assert.deepStrictEqual(r.race.order.map(x => [x.id, x.pos, x.grid, x.dnf]), [['leclerc', 1, 3, false], ['antonelli', 2, 1, false], ['russell', 3, 2, false], ['hamilton', 4, 5, true], ['norris', 5, 4, false]]);
    assert.strictEqual(r.race.fastest, 'leclerc');
    assert.deepStrictEqual(r.quali.order.map(x => [x.id, x.pos, x.out]), [['antonelli', 1, null], ['russell', 2, null], ['leclerc', 3, null], ['hamilton', 11, 'Q2'], ['norris', 16, 'Q1']]);
    assert.strictEqual(r.sprint, null);
  },

  'pagine diverse della stessa gara si uniscono'() {
    const a = { round: '2', Results: [res(1, 1, LEC)] }, b = { round: '2', Results: [res(2, 2, HAM)] };
    const rounds = FS.roundsFromJolpica({ results: [page('Results', [a], 2), page('Results', [b], 2)] });
    assert.deepStrictEqual(rounds[0].race.order.map(x => x.id), ['leclerc', 'hamilton']);
  },

  'storia della squadra: vale quella che c\'era al blocco del weekend'() {
    const log = [{ t: 100, d: ['a'], c: [], b: 'a' }, { t: 200, d: ['b'], c: [], b: 'b' }, { t: 300, d: ['c'], c: [], b: 'c' }];
    assert.strictEqual(FS.squadAt(log, 50), null);
    assert.deepStrictEqual(FS.squadAt(log, 250).drivers, ['b']);
    assert.deepStrictEqual(FS.squadAt(log, 300).drivers, ['c']);
  },

  'punti della stagione: regole di sempre, 2X, cambi oltre i gratis tolgono punti'() {
    const rounds = FS.roundsFromJolpica({ results: [page('Results', [RACE1, { ...RACE1, round: '2' }], 10)], qualifying: [page('QualifyingResults', [QUALI1, { ...QUALI1, round: '2' }], 10)] });
    const sq1 = { t: 10, d: ['leclerc', 'antonelli', 'russell', 'hamilton', 'norris'], c: ['ferrari', 'mercedes'], b: 'leclerc' };
    const sq2 = { t: 150, d: ['verstappen', 'hadjar', 'gasly', 'albon', 'norris'], c: ['redbull', 'mercedes'], b: 'norris' };   // 5 cambi: 2 gratis
    const lockOf = round => (round === 1 ? 100 : 200);
    const s = FS.seasonPoints({ log: [sq1, sq2], rounds, lockOf });
    // Atteso col calcolo di sempre (BtLogic), squadra 1 al round 1.
    const sq = FS.squadAt([sq1], 100), teamOf = FS.TEAM_OF;
    const expect1 = ['quali', 'race'].reduce((a, k) => a + BtLogic.squadScore(sq, BtLogic.sessionPoints({ type: k === 'quali' ? 'QUALI' : 'RACE', order: rounds[0][k].order, fastest: rounds[0][k].fastest }, teamOf)).total, 0);
    assert.strictEqual(s.rounds[0].pts, expect1);
    assert.ok(s.rounds[0].lines.some(l => l.type === 'RACE') && s.rounds[0].lines.some(l => l.type === 'QUALI'));
    const pen = s.rounds[1].lines.find(l => l.type === 'PEN');
    assert.ok(pen && pen.pts === -(5 - 2) * BtLogic.RULES.transferCost, JSON.stringify(s.rounds[1].lines));
    assert.strictEqual(s.total, s.rounds[0].pts + s.rounds[1].pts);
  },

  'senza squadra completa al blocco o senza ora di blocco: il round non conta'() {
    const rounds = FS.roundsFromJolpica({ results: [page('Results', [RACE1], 5)] });
    assert.strictEqual(FS.seasonPoints({ log: [{ t: 10, d: ['leclerc', '', '', '', ''], c: ['', ''], b: null }], rounds, lockOf: () => 100 }).total, 0);
    assert.strictEqual(FS.seasonPoints({ log: [{ t: 10, d: ['leclerc', 'antonelli', 'russell', 'hamilton', 'norris'], c: ['ferrari', 'mercedes'], b: null }], rounds, lockOf: () => null }).rounds.length, 0);
  },

  'voce della storia: solo id validi, al massimo 5 piloti e 2 scuderie'() {
    assert.deepStrictEqual(FS.logEntry({ drivers: ['leclerc', 'x y', null, 'hamilton', 'a', 'b'], teams: ['ferrari', 'mercedes', 'mclaren'], boost: 'leclerc', name: ' La mia squadra ' }, 5), { t: 5, d: ['leclerc', '', '', 'hamilton', 'a'], c: ['ferrari', 'mercedes'], b: 'leclerc', n: 'La mia squadra' });
    assert.strictEqual(FS.sameSquad(FS.logEntry({ drivers: ['a'], teams: [], boost: 'a' }, 1), FS.logEntry({ drivers: ['a'], teams: [], boost: 'a' }, 9)), true);
  },
};

(async () => {
  let pass = 0, fail = 0;
  const filter = process.argv[2] ? new RegExp(process.argv[2], 'i') : null;
  for (const [name, fn] of Object.entries(tests)) {
    if (filter && !filter.test(name)) continue;
    try { await fn(); pass++; console.log('PASS  ' + name); }
    catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + String(e.message).split('\n')[0].slice(0, 300)); }
  }
  console.log(`\n${pass} passati, ${fail} falliti`);
  process.exit(fail ? 1 : 0);
})();
