// Avviso di metà gara (8/11, Edoardo: "notifiche di aggiornamento a metà dei giri della gara se l'utente non ha visto la
// partenza"). Uso: node test/unit/halfway.test.js
const assert = require('assert');
const H = require('../../src/logic/halfway');
const R = require('../../src/services/reminders');
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('PASS  ' + name); } catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); } };

t('partenza vista: gara in diretta, app aperta nei primi 15 minuti dal via', () => {
  assert.strictEqual(H.sawStart({ type: 'RACE', ongoing: true, t: 120 }), true);
  assert.strictEqual(H.sawStart({ type: 'RACE', ongoing: true, t: -200 }), true, 'giro di formazione');
  assert.strictEqual(H.sawStart({ type: 'RACE', ongoing: true, t: 1500 }), false, 'aperta dopo 25 minuti');
  assert.strictEqual(H.sawStart({ type: 'RACE', ongoing: false, t: 120 }), false, 'sessione rivista: non conta');
  assert.strictEqual(H.sawStart({ type: 'QUALI', ongoing: true, t: 120 }), false, 'solo la gara');
});

t('metà gara: dal giro di metà fino a due giri dopo, poi non più', () => {
  assert.strictEqual(H.halfLap(57), 29);
  assert.strictEqual(H.halfwayDue({ totalLaps: 57, lap: 28 }), false);
  assert.strictEqual(H.halfwayDue({ totalLaps: 57, lap: 29 }), true);
  assert.strictEqual(H.halfwayDue({ totalLaps: 57, lap: 31 }), true);
  assert.strictEqual(H.halfwayDue({ totalLaps: 57, lap: 32 }), false, 'arrivato tardi: niente avviso di metà gara');
  assert.strictEqual(H.halfwayDue({ totalLaps: 0, lap: 10 }), false);
});

t('riassunto: i primi tre coi distacchi veri, senza ritirati', () => {
  const cars = [
    { id: 'russell', code: 'RUS', pos: 2, gap: 2.345, dnf: null },
    { id: 'antonelli', code: 'ANT', pos: 1, gap: 0, dnf: null },
    { id: 'hamilton', code: 'HAM', pos: 3, gap: null, dnf: { lap: 10 } },
    { id: 'leclerc', code: 'LEC', pos: 4, gap: 5.1, dnf: null },
    { id: 'norris', code: 'NOR', pos: 5, gap: 9, lapsDown: 1, dnf: null },
  ];
  const top = H.topThree(cars);
  assert.deepStrictEqual(top.map(x => x.code), ['ANT', 'RUS', 'LEC']);
  assert.deepStrictEqual(top.map(x => x.gap), [null, '+2,3 s', '+5,1 s']);
  assert.strictEqual(H.summaryText(top), 'ANT davanti a RUS (+2,3 s) e LEC (+5,1 s)');
});

const RACE = { id: 'r21', name: 'GP di Las Vegas' };
const SES = [{ key: 'QUALI', utc: '2026-11-21T04:00Z' }, { key: 'RACE', utc: '2026-11-22T13:00Z' }];
const NOW = Date.parse('2026-11-20T10:00:00Z');
t('promemoria: avviso di metà gara 50 minuti dopo il via (se non hai visto la partenza)', () => {
  const list = R.plan({ now: NOW, race: RACE, sessions: SES, prefs: {}, decks: 0 });
  const half = list.find(x => x.id === R.ID.half);
  assert.ok(half, JSON.stringify(list.map(x => x.id)));
  assert.strictEqual(half.at, Date.parse('2026-11-22T13:50:00Z'));
  assert.ok(/Metà gara/.test(half.title) && /GP di Las Vegas/.test(half.title), half.title);
  assert.ok(!list.some(x => x.id === R.ID.deck), 'senza giri di Pit Swipe niente promemoria del giro');
  const seen = R.plan({ now: NOW, race: RACE, sessions: SES, prefs: {}, decks: 0, startSeen: true });
  assert.ok(!seen.some(x => x.id === R.ID.half), 'partenza vista: niente avviso');
  const off = R.plan({ now: NOW, race: RACE, sessions: SES, prefs: { halfway: false }, decks: 0 });
  assert.ok(!off.some(x => x.id === R.ID.half), 'spento dal Profilo');
  const night = R.plan({ now: NOW, race: RACE, sessions: [{ key: 'RACE', utc: '2026-11-22T04:00Z' }], prefs: {}, decks: 0 });
  assert.ok(!night.some(x => x.id === R.ID.half), 'di notte (Las Vegas alle 5 di Roma) niente');
});

t('promemoria vecchi: con giri di Pit Swipe il giro del giorno resta', () => {
  const list = R.plan({ now: NOW, race: RACE, sessions: SES, prefs: {}, decks: 3 });
  assert.ok(list.some(x => x.id === R.ID.deck));
});

console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
