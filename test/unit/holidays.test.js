// Temi delle feste (31/10, src/logic/holidays.js): quale festa è attiva, con le date di Roma, il weekend di Monza dal
// calendario e i comandi dell'admin da Firebase (shared/bt-holidays: force, off).
// Uso: node test/unit/holidays.test.js
const assert = require('assert');
const H = require('../../src/logic/holidays');
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('PASS  ' + name); } catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); } };
const at = s => Date.parse(s);
const RACES = [{ id: 'r16', circuitId: 'it-1922', date: '2026-09-06T13:00:00' }, { id: 'r20', circuitId: 'mx-1962', date: '2026-11-01' }];

t('date: Halloween 30 ott – 1 nov, Natale 1 – 26 dic, Befana 5 – 6 gen (ora di Roma)', () => {
  assert.strictEqual(H.activeHoliday({ now: at('2026-10-29T22:59:00Z') }), null);
  assert.strictEqual(H.activeHoliday({ now: at('2026-10-29T23:01:00Z') }), 'halloween', 'mezzanotte del 30 a Roma');
  assert.strictEqual(H.activeHoliday({ now: at('2026-10-31T18:00:00Z') }), 'halloween');
  assert.strictEqual(H.activeHoliday({ now: at('2026-11-01T22:00:00Z') }), 'halloween', 'il 1 novembre fino a mezzanotte di Roma');
  assert.strictEqual(H.activeHoliday({ now: at('2026-11-01T23:30:00Z') }), null);
  assert.strictEqual(H.activeHoliday({ now: at('2026-12-01T10:00:00Z') }), 'natale');
  assert.strictEqual(H.activeHoliday({ now: at('2026-12-26T20:00:00Z') }), 'natale');
  assert.strictEqual(H.activeHoliday({ now: at('2026-12-27T10:00:00Z') }), null);
  assert.strictEqual(H.activeHoliday({ now: at('2027-01-05T10:00:00Z') }), 'befana');
  assert.strictEqual(H.activeHoliday({ now: at('2027-01-07T10:00:00Z') }), null);
});
t('Monza: dal giovedì al lunedì del GP d\'Italia (dal calendario), prima delle date fisse', () => {
  assert.strictEqual(H.activeHoliday({ now: at('2026-09-03T08:00:00Z'), races: RACES }), 'monza', 'giovedì');
  assert.strictEqual(H.activeHoliday({ now: at('2026-09-07T20:00:00Z'), races: RACES }), 'monza', 'lunedì');
  assert.strictEqual(H.activeHoliday({ now: at('2026-09-09T08:00:00Z'), races: RACES }), null);
  assert.strictEqual(H.activeHoliday({ now: at('2026-09-05T08:00:00Z') }), null, 'senza calendario niente Monza');
});
t('admin: force accende un tema sempre, off spegne quelli indicati; config strana ignorata', () => {
  assert.strictEqual(H.activeHoliday({ now: at('2026-07-01T10:00:00Z'), config: { force: 'natale' } }), 'natale');
  assert.strictEqual(H.activeHoliday({ now: at('2026-10-31T10:00:00Z'), config: { off: ['halloween'] } }), null);
  assert.strictEqual(H.activeHoliday({ now: at('2026-10-31T10:00:00Z'), config: { force: 'pasqua', off: 'x' } }), 'halloween');
  assert.deepStrictEqual(H.cleanConfig({ force: 'monza', off: ['natale', 'boh', 3] }), { force: 'monza', off: ['natale'] });
  assert.deepStrictEqual(H.cleanConfig(null), { force: null, off: [] });
});
t('ogni tema ha nome, colore e suoni', () => {
  for (const id of ['halloween', 'natale', 'befana', 'monza']) {
    const h = H.HOLIDAYS[id];
    assert.ok(h && h.name && /^#[0-9A-F]{6}$/i.test(h.color), id);
    assert.ok(h.sounds && typeof h.sounds === 'object', id + ' suoni');
  }
});
// 1/11 sera (Edoardo: "aggiungi sconti del Black Friday, Befana, Monza, Natale con le loro cose personalizzate").
t('Black Friday: dal venerdì dopo il quarto giovedì di novembre al lunedì; sconti di Black Friday, Natale, Befana e Monza', () => {
  assert.strictEqual(H.activeHoliday({ now: at('2026-11-26T12:00:00Z') }), null, 'il giovedì prima no');
  assert.strictEqual(H.activeHoliday({ now: at('2026-11-27T09:00:00Z') }), 'blackfriday');
  assert.strictEqual(H.activeHoliday({ now: at('2026-11-30T20:00:00Z') }), 'blackfriday', 'Cyber Monday');
  assert.strictEqual(H.activeHoliday({ now: at('2026-12-01T10:00:00Z') }), 'natale');
  assert.strictEqual(H.activeHoliday({ now: at('2027-11-26T10:00:00Z') }), 'blackfriday', '2027: 26 novembre');
  assert.deepStrictEqual(H.saleOf('blackfriday'), { id: 'blackfriday', name: 'Black Friday', pct: 50 });
  for (const id of ['natale', 'befana', 'monza']) assert.ok(H.saleOf(id) && H.saleOf(id).pct > 0, id);
  assert.strictEqual(H.saleOf('halloween'), null);
  assert.strictEqual(H.saleOf(null), null);
});
t('giorno di Roma per le sorprese (una al giorno): chiave AAAA-MM-GG', () => {
  assert.strictEqual(H.romeDay(at('2026-10-31T23:30:00Z')), '2026-11-01');
  assert.strictEqual(H.romeDay(at('2026-12-07T10:00:00Z')), '2026-12-07');
});

console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
