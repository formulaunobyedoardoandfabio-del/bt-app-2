// Scritta in alto a sinistra (16/11, Edoardo: RollingText al posto di "SECTOR 4", src/logic/header-words.js):
// all'apertura sceglie la parola dal momento (gara, qualifica, notte, giorno normale); toccandola ne esce una a caso
// tra quelle motivazionali, mai la stessa di prima.
// Uso: node test/unit/header-words.test.js
const assert = require('assert');
const W = require('../../src/logic/header-words');
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('PASS  ' + name); } catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); } };
const at = s => Date.parse(s);
const TZ = 'Europe/Rome';
// Las Vegas (orari veri della gara: sabato sera in Nevada, domenica mattina a Roma) e una gara senza orari (solo la data).
const RACES = [{ round: 21, circuitId: 'us-2023', date: '2026-11-21' }, { round: 22, circuitId: 'qa-2004', date: '2026-11-29' }, { round: 8, circuitId: 'at-1969', date: '2026-06-28' }];
const INFO = {
  'us-2023': { weekend: [{ key: 'QUALI', utc: '2026-11-21T04:00Z' }, { key: 'RACE', utc: '2026-11-22T04:00Z' }] },
  'qa-2004': { weekend: [{ key: 'SPRINT', utc: '2026-11-28T14:00Z' }, { key: 'QUALI', utc: '2026-11-28T18:00Z' }, { key: 'RACE', utc: '2026-11-29T16:00Z' }] },
};
const mood = (iso, extra = {}) => W.moodOf({ now: at(iso), races: RACES, info: INFO, tz: TZ, ...extra });

t('le liste sono quelle date da Edoardo', () => {
  assert.deepStrictEqual(W.WORDS.race, ['RACE DAY', 'BOX NOW!', 'RED LIGHT']);
  assert.deepStrictEqual(W.WORDS.quali, ['FULL GAS', 'POLE POS', 'TIME ATT']);
  assert.deepStrictEqual(W.WORDS.normal, ['DEEP TECH', 'ANALYZE', 'COLD LAP']);
  assert.deepStrictEqual(W.WORDS.night, ['NIGHT SHI', 'ROUGH MAP']);
  assert.deepStrictEqual(W.TAP, ['LEVEL UP', 'GO HARD!', 'NO LIMIT', 'BREAK IT', 'OVERRIDE', 'EXECUTE!', 'ROOT ACC', 'SYS_RDY', 'FULL GAS', 'FAST LAP', 'PUSH NOW']);
});
t('giorno di gara: il giorno della gara con l\'ora di chi usa l\'app (Las Vegas: domenica a Roma)', () => {
  assert.strictEqual(mood('2026-11-22T10:00:00Z'), 'race', 'domenica 22 a Roma');
  assert.strictEqual(mood('2026-11-21T20:00:00Z'), 'quali', 'sabato 21 a Roma: qualifica (le 5 di mattina)');
  assert.strictEqual(mood('2026-11-29T09:00:00Z'), 'race', 'Qatar, domenica');
  assert.strictEqual(mood('2026-11-28T09:00:00Z'), 'quali', 'Qatar, sabato con la Sprint e la qualifica');
});
t('gara senza orari: il giorno della data è gara, quello prima qualifica', () => {
  assert.strictEqual(mood('2026-06-28T10:00:00Z'), 'race');
  assert.strictEqual(mood('2026-06-27T10:00:00Z'), 'quali');
  assert.strictEqual(mood('2026-06-26T10:00:00Z'), 'normal', 'venerdì delle libere: giorno normale');
});
t('notte: da mezzanotte alle 5 (ora di chi usa l\'app), ma nei giorni di gara e qualifica vince il weekend', () => {
  assert.strictEqual(mood('2026-11-17T23:30:00Z'), 'night', '00:30 a Roma');
  assert.strictEqual(mood('2026-11-18T03:59:00Z'), 'night', '04:59 a Roma');
  assert.strictEqual(mood('2026-11-18T04:00:00Z'), 'normal', 'le 5 a Roma');
  assert.strictEqual(mood('2026-11-17T22:30:00Z'), 'normal', '23:30 a Roma');
  assert.strictEqual(mood('2026-11-22T00:30:00Z'), 'race', 'notte della gara di Las Vegas');
});
t('domenica senza GP e sabato senza GP: giorno normale', () => {
  assert.strictEqual(mood('2026-11-15T12:00:00Z'), 'normal', 'domenica 15 novembre, nessuna gara');
  assert.strictEqual(mood('2026-11-14T12:00:00Z'), 'normal');
});
t('dati mancanti o rotti: giorno normale, niente errori', () => {
  assert.strictEqual(W.moodOf({ now: at('2026-11-17T12:00:00Z'), tz: TZ }), 'normal');
  assert.strictEqual(W.moodOf({ now: at('2026-11-17T12:00:00Z'), races: [null, {}, { date: 'x' }], info: { a: { weekend: 'no' } }, tz: TZ }), 'normal');
  assert.strictEqual(W.moodOf({ now: NaN, races: RACES, info: INFO, tz: TZ }), 'normal');
});
t('contextWord: una parola della lista del momento, scelta da rand (0 ≤ rand < 1)', () => {
  const base = { races: RACES, info: INFO, tz: TZ };
  assert.strictEqual(W.contextWord({ ...base, now: at('2026-11-22T10:00:00Z'), rand: 0 }), 'RACE DAY');
  assert.strictEqual(W.contextWord({ ...base, now: at('2026-11-22T10:00:00Z'), rand: 0.5 }), 'BOX NOW!');
  assert.strictEqual(W.contextWord({ ...base, now: at('2026-11-22T10:00:00Z'), rand: 0.999 }), 'RED LIGHT');
  assert.strictEqual(W.contextWord({ ...base, now: at('2026-11-17T23:30:00Z'), rand: 0.9 }), 'ROUGH MAP');
  assert.strictEqual(W.contextWord({ ...base, now: at('2026-11-17T12:00:00Z'), rand: 0.4 }), 'ANALYZE');
  for (const r of [-1, 1, 7, NaN, undefined]) assert.ok(W.WORDS.normal.includes(W.contextWord({ ...base, now: at('2026-11-17T12:00:00Z'), rand: r })), 'rand fuori scala: ' + r);
});
t('tapWord: una delle motivazionali, mai quella che c\'è già', () => {
  for (let i = 0; i < 50; i++) { const r = i / 50; const w = W.tapWord('LEVEL UP', r); assert.ok(W.TAP.includes(w)); assert.notStrictEqual(w, 'LEVEL UP'); }
  assert.strictEqual(W.tapWord('RACE DAY', 0), 'LEVEL UP', 'dalla parola del momento si può avere la prima');
  const seen = new Set(); for (let i = 0; i < 200; i++) seen.add(W.tapWord('X', i / 200));
  assert.strictEqual(seen.size, W.TAP.length, 'tutte possibili');
  assert.ok(W.TAP.includes(W.tapWord(undefined, NaN)));
});
t('tutte le parole stanno in 9 caratteri (la larghezza della scritta non cambia)', () => {
  const all = [...W.WORDS.race, ...W.WORDS.quali, ...W.WORDS.normal, ...W.WORDS.night, ...W.TAP];
  for (const w of all) assert.ok(w.length <= 9 && w === w.trim(), w);
  assert.deepStrictEqual(W.allWords(), [...new Set(all)]);
});

console.log(`\n${pass} passate, ${fail} fallite`);
process.exit(fail ? 1 : 0);
