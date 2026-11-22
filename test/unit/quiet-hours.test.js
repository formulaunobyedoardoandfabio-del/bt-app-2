// Ore di silenzio modificabili (22/11, Edoardo: "fai che l'orario di silenzio si possa modificare cliccandoci sopra"):
// prefs.quiet = { from, to } in minuti del giorno, ora di Roma; senza quiet restano le 22-8 di sempre.
// Uso: node test/unit/quiet-hours.test.js
const assert = require('assert');
const R = require('../../src/services/reminders');
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('PASS  ' + name); } catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); } };

// Domenica 8/11/2026 alle 10 di Roma; gara alle 14 di Roma (13 UTC): promemoria alle 13 di Roma.
const NOW = Date.parse('2026-11-07T21:00:00Z');   // sabato 22 di Roma
const SESS = [{ key: 'RACE', utc: '2026-11-08T13:00:00Z' }, { key: 'QUALI', utc: '2026-11-07T22:30:00Z' }];
const ids = l => l.map(x => x.id);

t('senza quiet: le 22-8 di sempre (qualifiche alle 23:30, promemoria alle 22:30 di Roma: niente)', () => {
  const l = R.plan({ now: NOW, sessions: SESS, prefs: {}, decks: 0, startSeen: true });
  assert.ok(!l.some(x => x.title.startsWith('Qualifiche')), JSON.stringify(l.map(x => x.title)));
  assert.ok(l.some(x => x.title.startsWith('Gara')), 'la gara alle 13 di Roma resta');
});

t('quiet 23:00-07:00: il promemoria delle 22:30 di Roma parte', () => {
  const l = R.plan({ now: NOW - 3600000, sessions: SESS, prefs: { quiet: { from: 23 * 60, to: 7 * 60 } }, decks: 0, startSeen: true });
  assert.ok(l.some(x => x.title.startsWith('Qualifiche')), JSON.stringify(l.map(x => x.title)));
});

t('quiet di giorno 12:00-15:00 (senza mezzanotte): la gara delle 13 di Roma tace', () => {
  const l = R.plan({ now: NOW, sessions: SESS, prefs: { quiet: { from: 12 * 60, to: 15 * 60 } }, decks: 0, startSeen: true });
  assert.ok(!l.some(x => x.title.startsWith('Gara')), JSON.stringify(l.map(x => x.title)));
});

t('quiet con inizio uguale alla fine: nessun silenzio; valori fuori misura: le 22-8', () => {
  assert.strictEqual(R.quietOf({ from: 600, to: 600 }), null);
  assert.deepStrictEqual(R.quietOf({ from: -5, to: 'x' }), { from: 22 * 60, to: 8 * 60 });
  assert.deepStrictEqual(R.quietOf(undefined), { from: 22 * 60, to: 8 * 60 });
  assert.deepStrictEqual(R.quietOf({ from: 1425, to: 15 }), { from: 1425, to: 15 });
  const l = R.plan({ now: NOW - 3600000, sessions: SESS, prefs: { quiet: { from: 600, to: 600 } }, decks: 0, startSeen: true });
  assert.ok(l.some(x => x.title.startsWith('Qualifiche')), ids(l).join());
});

console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
