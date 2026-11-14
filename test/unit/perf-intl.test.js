// 14/11 (ottimizzazione): il giorno di Roma si chiede a ogni disegno della pagina (feste, Pit Swipe). Creare ogni
// volta un Intl.DateTimeFormat è la parte lenta (sul telefono decimi di millisecondo l'uno): se ne crea uno e si riusa.
// Uso: node test/unit/perf-intl.test.js
const assert = require('assert');
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('PASS  ' + name); } catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); } };

// Conta quanti Intl.DateTimeFormat si creano mentre gira fn.
const Real = Intl.DateTimeFormat;
function counting(fn) {
  let made = 0;
  function Counted(...a) { made++; return new Real(...a); }
  Counted.prototype = Real.prototype; Counted.supportedLocalesOf = Real.supportedLocalesOf;
  Intl.DateTimeFormat = Counted;
  try { fn(); } finally { Intl.DateTimeFormat = Real; }
  return made;
}
const NOW = Date.parse('2026-11-17T10:00:00Z');

t('feste: cento richieste del giorno di Roma creano al massimo un formattatore', () => {
  const H = require('../../src/logic/holidays');
  const first = H.romeDay(NOW);
  const made = counting(() => { for (let i = 0; i < 100; i++) H.romeDay(NOW + i * 60000); });
  assert.strictEqual(first, '2026-11-17');
  assert.ok(made <= 1, 'formattatori creati: ' + made);
  assert.strictEqual(H.romeDay(Date.parse('2026-03-29T00:30:00Z')), '2026-03-29', 'il risultato resta giusto (cambio dell\'ora)');
  assert.strictEqual(H.romeDay(Date.parse('2026-12-31T23:30:00Z')), '2027-01-01', 'mezzanotte di Roma, non di Londra');
});

t('Pit Swipe: cento richieste del giorno di Roma creano al massimo un formattatore', () => {
  const P = require('../../src/logic/pitswipe');
  const first = P.romeDay(NOW);
  const made = counting(() => { for (let i = 0; i < 100; i++) P.romeDay(NOW + i * 60000); });
  assert.strictEqual(first, '2026-11-17');
  assert.ok(made <= 1, 'formattatori creati: ' + made);
  assert.strictEqual(P.romeDay(Date.parse('2026-12-31T23:30:00Z')), '2027-01-01');
});

console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
