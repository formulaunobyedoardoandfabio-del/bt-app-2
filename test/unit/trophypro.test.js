// Prove delle funzioni Pro sbloccate coi trofei (src/logic/trophypro.js). Uso: node test/unit/trophypro.test.js
const assert = require('assert');
const T = require('../../src/logic/trophypro');

let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('PASS  ' + name); } catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); } };
const names = { pitcrew: 'Pit crew', griglia: 'Griglia completa', radio: 'Radio aperta', oracolo: 'Oracolo', pitperfetto: 'Pit stop perfetto' };

t('senza trofei niente; servono il numero E il trofeo del tema', () => {
  assert.deepStrictEqual(T.proUnlocked([]), []);
  assert.deepStrictEqual(T.proUnlocked(['casco', 'radio', 'archivio']), [], '3 trofei senza "Pit crew" non sbloccano i tempi sul giro');
  assert.deepStrictEqual(T.proUnlocked(['casco', 'pitcrew', 'archivio']), ['laps']);
});

t('a scalini: 5 con "Griglia completa" anche le gomme, 8 con "Radio aperta" anche la radio', () => {
  const five = ['pitcrew', 'griglia', 'casco', 'archivio', 'paddock'];
  assert.deepStrictEqual(T.proUnlocked(five), ['laps', 'gomme']);
  assert.deepStrictEqual(T.proUnlocked([...five, 'radio', 'indovino', 'mercato']), ['laps', 'gomme', 'radio']);
});

t('il Second Screen chiede 14 trofei con "Pit stop perfetto"', () => {
  const ids = ['pitcrew', 'griglia', 'radio', 'oracolo', 'pitperfetto', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  assert.ok(!T.proUnlocked(ids).includes('ss'), '13 trofei bastano');
  assert.ok(T.proUnlocked([...ids, 'i']).includes('ss'));
});

t('frase del lucchetto: cosa manca, col nome del trofeo; niente frase se è già sbloccata', () => {
  assert.strictEqual(T.proHint('gomme', ['casco'], id => names[id]), 'Oppure sbloccala per sempre coi trofei: 5 trofei, tra cui «Griglia completa». Ti mancano ancora 4 trofei e il trofeo «Griglia completa».');
  assert.strictEqual(T.proHint('laps', ['casco', 'archivio', 'paddock'], id => names[id]), 'Oppure sbloccala per sempre coi trofei: 3 trofei, tra cui «Pit crew». Ti mancano il trofeo «Pit crew».');
  assert.strictEqual(T.proHint('laps', ['casco', 'pitcrew', 'paddock']), null);
});

console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
