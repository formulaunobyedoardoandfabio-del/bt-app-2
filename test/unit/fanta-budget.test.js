// Budget del FantaF1 come in F1 Fantasy (13/11, bug dei tester: "dopo un certo punto non si riesce più a scegliere la
// scuderia, es. Mercedes o Ferrari"). Causa: il budget era fisso (108,1) e si contava il prezzo di OGGI di chi hai in
// squadra; coi prezzi automatici chi va forte sale a ogni GP, quindi una squadra buona finiva "fuori budget" e tolta una
// scuderia non si poteva più rimettere nemmeno la stessa. Ora conta quanto hai PAGATO: se chi hai sale, il guadagno è
// tuo (vendi al prezzo di oggi). Uso: node test/unit/fanta-budget.test.js
const assert = require('assert');
const L = require('../../src/logic/bt-logic');
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('PASS  ' + name); } catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); } };

const mk = (d, tm) => ({ drivers: Object.fromEntries(Object.entries(d).map(([k, p]) => [k, { price: p, pts: 10 }])), teams: Object.fromEntries(Object.entries(tm).map(([k, p]) => [k, { price: p, pts: 10 }])) });
// Listino di quando la squadra è stata fatta, e prezzi di oggi (chi va forte è salito).
const LIST = mk({ a: 28, b: 27, c: 10, d: 5, e: 3, f: 3 }, { merc: 30, ferr: 27, haas: 5 });
const NOW = mk({ a: 30, b: 29, c: 10, d: 5, e: 3, f: 3 }, { merc: 36, ferr: 31, haas: 5 });
const SQUAD = { name: 'x', drivers: ['a', 'b', 'c', 'd', 'e'], teams: ['merc', 'haas'], boost: 'a' };   // 108 al listino, 118 oggi
const B = 108.1;

t('bank: soldi liberi = budget − quanto hai pagato (non il prezzo di oggi)', () => {
  assert.strictEqual(L.bank(SQUAD, NOW, B, LIST), 0.1);
  assert.strictEqual(L.squadValue(SQUAD, NOW), 118, 'il valore di oggi resta quello vero');
});

t('il bug: tolta la Mercedes (salita a 36) si può rimettere, e si può passare alla Ferrari', () => {
  const out = L.place(SQUAD, NOW, 'teams', 0, null, LIST);
  assert.strictEqual(out.teams[0], null);
  assert.strictEqual(L.bank(out, NOW, B, LIST), 36.1, 'venduta al prezzo di oggi: il guadagno di 6 resta');
  assert.strictEqual(L.canAfford(out, NOW, B, 'teams', 0, 'merc', LIST), true);
  assert.strictEqual(L.canAfford(SQUAD, NOW, B, 'teams', 0, 'ferr', LIST), true, 'cambio diretto Mercedes → Ferrari');
  const back = L.place(out, NOW, 'teams', 0, 'merc', LIST);
  assert.strictEqual(L.bank(back, NOW, B, LIST), 0.1, 'ricomprata al prezzo di oggi: come prima');
  assert.strictEqual(back.paid.teams.merc, 36);
});

t('niente soldi dal nulla: chi non ha guadagni non può sforare', () => {
  const cheap = { name: 'x', drivers: ['c', 'd', 'e', 'f', null], teams: ['haas', null], boost: 'c' };   // pagati 26
  assert.strictEqual(L.bank(cheap, NOW, B, LIST), 82.1);
  assert.strictEqual(L.canAfford(cheap, NOW, B, 'drivers', 4, 'a', LIST), true);
  const withA = L.place(cheap, NOW, 'drivers', 4, 'a', LIST);
  assert.strictEqual(L.bank(withA, NOW, B, LIST), 52.1);
  assert.strictEqual(L.canAfford(withA, NOW, B, 'teams', 1, 'merc', LIST), true);
  const full = L.place(withA, NOW, 'teams', 1, 'merc', LIST);
  assert.strictEqual(L.bank(full, NOW, B, LIST), 16.1);
  assert.strictEqual(L.canAfford(full, NOW, B, 'drivers', 0, 'b', LIST), false, 'c (10) → b (29): servono 19, ce ne sono 16,1 + 10 di c... no: 26,1 < 29');
});

t('chi è sceso si vende al prezzo di oggi (la perdita resta)', () => {
  const down = mk({ a: 20, b: 27, c: 10, d: 5, e: 3, f: 3 }, { merc: 30, ferr: 27, haas: 5 });
  const out = L.place(SQUAD, down, 'drivers', 0, null, LIST);
  assert.strictEqual(L.bank(out, down, B, LIST), 20.1);
  assert.strictEqual(out.gain, -8);
});

t('withPaid: segna quanto è stato pagato (dal listino) una volta sola; squadra vuota o già segnata resta la stessa', () => {
  const w = L.withPaid(SQUAD, LIST);
  assert.deepStrictEqual(w.paid, { drivers: { a: 28, b: 27, c: 10, d: 5, e: 3 }, teams: { merc: 30, haas: 5 } });
  assert.strictEqual(L.withPaid(w, NOW), w, 'già segnata: non cambia');
  const empty = { name: 'x', drivers: [null, null, null, null, null], teams: [null, null], boost: null };
  assert.strictEqual(L.withPaid(empty, LIST), empty);
  assert.strictEqual(L.bank(w, NOW, B, NOW), 0.1, 'segnata: il listino che cambia non la sposta più');
});

t('autoFill e svuota usano gli stessi conti', () => {
  const some = { name: 'x', drivers: ['a', null, null, null, null], teams: [null, null], boost: 'a' };
  const out = L.autoFill(some, NOW, B, LIST);
  assert.ok(out.drivers.every(Boolean) && out.teams.every(Boolean), 'squadra completa');
  assert.ok(L.bank(out, NOW, B, LIST) >= 0, 'dentro il budget: ' + L.bank(out, NOW, B, LIST));
  assert.ok(out.paid && Object.keys(out.paid.drivers).length === 5, 'prezzi pagati segnati');
  const none = L.clearSquad(SQUAD, NOW, LIST);
  assert.ok(none.drivers.every(x => !x) && none.teams.every(x => !x));
  assert.strictEqual(L.bank(none, NOW, B, LIST), 118.1, 'venduto tutto al prezzo di oggi: 108,1 + 10 di guadagni');
});

console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
