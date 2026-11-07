// Prove del Premium coi trofei (src/logic/trophypro.js). Uso: node test/unit/trophypro.test.js
// 8/11: la regola è cambiata (Edoardo): non più funzioni Pro a scalini, ma il Premium a chi vince tutti i trofei.
const assert = require('assert');
const T = require('../../src/logic/trophypro');

let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('PASS  ' + name); } catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); } };
const defs = ['casco', 'griglia', 'radio', 'boxbox', 'opinionista'].map(id => ({ id }));
const won = ids => Object.fromEntries(ids.map(id => [id, 1]));

t('Premium solo con tutti i trofei', () => {
  assert.strictEqual(T.allDone({}, defs), false);
  assert.strictEqual(T.allDone(won(['casco', 'griglia', 'radio', 'boxbox']), defs), false);
  assert.strictEqual(T.allDone(won(['casco', 'griglia', 'radio', 'boxbox', 'opinionista']), defs), true);
});

t('Pit Swipe spento: i suoi trofei non servono', () => {
  const skip = T.PIT_SWIPE_TROPHIES;
  assert.deepStrictEqual(skip, ['boxbox', 'opinionista']);
  assert.strictEqual(T.allDone(won(['casco', 'griglia', 'radio']), defs, { skip }), true);
  assert.deepStrictEqual(T.trophyGoal(defs, { skip }), ['casco', 'griglia', 'radio']);
});

t('senza trofei attivi niente Premium regalato', () => {
  assert.strictEqual(T.allDone({ x: 1 }, []), false);
});

t('frase del lucchetto: quanti ne mancano; niente frase se ci sei', () => {
  assert.strictEqual(T.premiumHint(won(['casco']), defs, { skip: T.PIT_SWIPE_TROPHIES }), 'Oppure vinci tutti i 3 trofei: il Premium è tuo, gratis. Ne hai 1.');
  assert.strictEqual(T.premiumHint(won(['casco', 'griglia', 'radio']), defs, { skip: T.PIT_SWIPE_TROPHIES }), null);
});

console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
