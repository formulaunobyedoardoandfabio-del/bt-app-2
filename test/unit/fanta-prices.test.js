// Prezzi FantaF1 automatici (8/11, Edoardo: "rendi automatico tutto"): dopo ogni GP i prezzi salgono o scendono in base
// ai punti FantaF1 veri di quel weekend (regole di BtLogic.sessionPoints sui risultati di Jolpica).
// Uso: node test/unit/fanta-prices.test.js
const assert = require('assert');
const P = require('../../src/logic/fanta-prices');
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('PASS  ' + name); } catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); } };

const TEAM_OF = { a: 'T1', b: 'T1', c: 'T2', d: 'T2', e: 'T3', f: 'T3', g: 'T4', h: 'T4' };
const base = {
  drivers: Object.fromEntries('abcdefgh'.split('').map((id, i) => [id, { price: 10 + i, change: null, pts: 100 - i }])),
  teams: { T1: { price: 20, change: null, pts: 300 }, T2: { price: 18, change: null, pts: 250 }, T3: { price: 15, change: null, pts: 200 }, T4: { price: 3.1, change: null, pts: 10 } },
};
const order = ids => ids.map((id, i) => ({ id, pos: i + 1, grid: i + 1, dnf: false }));
const R16 = { round: 16, quali: { order: order('abcdefgh'.split('')).map(x => ({ id: x.id, pos: x.pos, out: null })) }, race: { order: order('abcdefgh'.split('')), fastest: 'a' }, sprint: null };

t('dopo un GP: i primi un quarto +0,3, poi +0,1, -0,1, gli ultimi -0,3; variazione e punti aggiornati', () => {
  const s = P.autoPrices(base, [R16], { asOf: 15, teamOf: TEAM_OF });
  assert.strictEqual(s.asOf, 16);
  assert.deepStrictEqual('abcdefgh'.split('').map(id => s.drivers[id].change), [0.3, 0.3, 0.1, 0.1, -0.1, -0.1, -0.3, -0.3]);
  assert.strictEqual(s.drivers.a.price, 10.3);
  assert.strictEqual(s.drivers.h.price, 16.7);
  assert.ok(s.drivers.a.pts > 100, 'i punti del GP si aggiungono: ' + s.drivers.a.pts);
});

t('scuderie: ±0,6 e ±0,2; prezzo mai sotto 3,0', () => {
  const s = P.autoPrices(base, [R16], { asOf: 15, teamOf: TEAM_OF });
  assert.deepStrictEqual(['T1', 'T2', 'T3', 'T4'].map(id => s.teams[id].change), [0.6, 0.2, -0.2, -0.6]);
  assert.strictEqual(s.teams.T4.price, 3, 'mai sotto 3,0');
});

t('round già contati (fino ad asOf) o senza gara non cambiano niente; più GP si sommano', () => {
  const same = P.autoPrices(base, [{ ...R16, round: 15 }], { asOf: 15, teamOf: TEAM_OF });
  assert.strictEqual(same.drivers.a.price, 10);
  assert.strictEqual(same.asOf, 15);
  const noRace = P.autoPrices(base, [{ ...R16, race: null }], { asOf: 15, teamOf: TEAM_OF });
  assert.strictEqual(noRace.drivers.a.price, 10, 'solo qualifica: si aspetta la gara');
  const two = P.autoPrices(base, [R16, { ...R16, round: 17 }], { asOf: 15, teamOf: TEAM_OF });
  assert.strictEqual(two.drivers.a.price, 10.6);
  assert.strictEqual(two.asOf, 17);
});

t('pilota senza prezzo nel listino: ignorato; dati rotti: listino com\'era', () => {
  const s = P.autoPrices(base, [{ ...R16, race: { order: [...order('abcdefgh'.split('')), { id: 'ospite', pos: 9, grid: 9, dnf: false }], fastest: null } }], { asOf: 15, teamOf: TEAM_OF });
  assert.strictEqual(s.drivers.ospite, undefined);
  assert.deepStrictEqual(P.autoPrices(base, null, { asOf: 15, teamOf: TEAM_OF }).drivers, base.drivers);
});

console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
