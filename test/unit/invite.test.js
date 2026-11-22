// 22/11 (Edoardo: "lo stesso per far unire le persone alla propria lega", grafiche N4-N6 di "B&T: Collega PC"):
// l'invito a una lega FantaF1 è un link del sito con ?lega=<codice> (più nome della lega e di chi invita, solo da
// mostrare). Lo portano il QR, la condivisione e l'NFC (un telefono fa da "adesivo" col link). src/logic/invite.js
// Uso: node test/unit/invite.test.js
const assert = require('assert');
const I = require('../../src/logic/invite');

let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('PASS ', name); } catch (e) { fail++; console.log('FAIL ', name, '\n     ', e.message); } };

t('link della lega: codice, nome e chi invita (accorciati), sul sito', () => {
  assert.strictEqual(I.link({ code: 'BT-7K2Q' }), 'https://bt-app-2.vercel.app/?lega=BT-7K2Q');
  const l = I.link({ code: 'BT-7K2Q', name: 'La mia lega', from: 'Edoardo' });
  assert.strictEqual(l, 'https://bt-app-2.vercel.app/?lega=BT-7K2Q&n=La+mia+lega&da=Edoardo');
  assert.ok(I.link({ code: 'BT-7K2Q', name: 'x'.repeat(80) }).length < 120, 'nome accorciato');
  assert.throws(() => I.link({ code: 'boh' }));
});

t('lettura: link del sito, codice scritto a mano; niente link di altri siti o codici sbagliati', () => {
  assert.deepStrictEqual(I.parse('https://bt-app-2.vercel.app/?lega=BT-7K2Q&n=La+mia+lega&da=Edoardo'), { code: 'BT-7K2Q', name: 'La mia lega', from: 'Edoardo' });
  assert.deepStrictEqual(I.parse(I.link({ code: 'BT-AB12', name: 'Amici & GP', from: 'Fabio' })), { code: 'BT-AB12', name: 'Amici & GP', from: 'Fabio' });
  assert.deepStrictEqual(I.parse('  bt-7k2q '), { code: 'BT-7K2Q', name: '', from: '' });
  assert.strictEqual(I.parse('https://example.com/?lega=BT-7K2Q'), null);
  assert.strictEqual(I.parse('https://bt-app-2.vercel.app/?collega=123456'), null);
  assert.strictEqual(I.parse('https://bt-app-2.vercel.app/?lega=XX-1'), null);
  assert.strictEqual(I.parse(''), null);
  assert.strictEqual(I.parse(null), null);
});

t('pagina aperta da un invito (?lega= nel sito)', () => {
  assert.deepStrictEqual(I.fromPage({ search: '?lega=BT-7K2Q&da=Edo' }), { code: 'BT-7K2Q', name: '', from: 'Edo' });
  assert.strictEqual(I.fromPage({ search: '?schermo' }), null);
  assert.strictEqual(I.fromPage(null), null);
});

console.log(`\n${pass} passate, ${fail} fallite`);
if (fail) process.exit(1);
