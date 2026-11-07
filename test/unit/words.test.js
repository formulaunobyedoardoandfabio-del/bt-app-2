// Prove delle anteprime con i tre puntini (src/logic/words.js). Uso: node test/unit/words.test.js
const assert = require('assert');
const { cutWords, fixCut } = require('../../src/logic/words');
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('PASS  ' + name); } catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); } };

t('testo corto: resta com\'è', () => {
  assert.strictEqual(cutWords('Leclerc in pole', 140), 'Leclerc in pole');
  assert.strictEqual(cutWords('  Leclerc   in pole ', 140), 'Leclerc in pole');
});
t('il taglio cade alla fine di una parola: i puntini dopo quella parola', () => {
  assert.strictEqual(cutWords('Leclerc in pole a Interlagos', 15), 'Leclerc in pole…');
});
t('il taglio cadrebbe a metà parola: i puntini dopo la parola prima', () => {
  assert.strictEqual(cutWords('Leclerc in pole a Interlagos', 20), 'Leclerc in pole a…');
  assert.strictEqual(cutWords('Leclerc in pole a Interlagos', 12), 'Leclerc in…');
});
t('niente virgole o trattini prima dei puntini', () => {
  assert.strictEqual(cutWords('Pole di Leclerc, poi Norris e Piastri', 17), 'Pole di Leclerc…');
});
t('una parola sola più lunga del massimo: si taglia lì', () => {
  assert.strictEqual(cutWords('Supercalifragilistichespiralidoso', 10), 'Supercalif…');
});
t('riassunti vecchi tagliati a 140 a metà parola: via l\'ultima parola, poi i puntini', () => {
  const s = 'a'.repeat(120) + ' bandiera rossaaaaaaaa';   // 142 caratteri: tagliato a 140 resta "rossaaaaaa"
  assert.strictEqual(fixCut(s.slice(0, 140), 140), 'a'.repeat(120) + ' bandiera…');
  assert.strictEqual(fixCut('Frase finita.', 140), 'Frase finita.');
  assert.strictEqual(fixCut('Corta', 140), 'Corta');
});
console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
