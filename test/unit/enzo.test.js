// Prove di Enzo, l'assistente svogliato (src/logic/enzo.js, copione di Edoardo del 15/11). Uso: node test/unit/enzo.test.js
const assert = require('assert');
const E = require('../../src/logic/enzo');
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('PASS  ' + name); } catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); } };

t('saluto: senza gara oggi l\'opzione C, con la gara A o B', () => {
  assert.ok(/Oggi non si corre/.test(E.greeting({ raceToday: false })));
  assert.ok(/un altro utente/.test(E.greeting({ raceToday: true, rand: () => 0.1 })));
  assert.ok(/modalità risparmio energetico/.test(E.greeting({ raceToday: true, rand: () => 0.9 })));
});

t('funzioni: telemetria, Fanta, News, Community (con la scheda da mostrare)', () => {
  const r = s => E.reply(s);
  assert.strictEqual(r('Live Telemetry').intent, 'telemetry');
  assert.strictEqual(r('dove vedo i tempi in diretta?').intent, 'telemetry');
  assert.strictEqual(r('Fanta F1').intent, 'fanta');
  assert.strictEqual(r('come creo una lega').intent, 'fanta');
  assert.strictEqual(r('News').intent, 'news');
  assert.strictEqual(r('ultime notizie dal paddock').intent, 'news');
  assert.strictEqual(r('Community').intent, 'community');
  assert.strictEqual(r('chat dei tifosi B&T Motorsport').intent, 'community');
  assert.ok(/arriverai ultimo/.test(r('fanta').text));
  assert.ok(E.DEMO.fanta && E.DEMO.telemetry && E.DEMO.news && E.DEMO.community);
});

t('fuori tema, bug, chi insiste o scrive troppo, saluti', () => {
  assert.strictEqual(E.reply('che tempo fa a Roma domani').intent, 'off');
  assert.ok(/Per tutto il resto c'è Google/.test(E.reply('ricetta della carbonara').text));
  assert.strictEqual(E.reply('l\'app non carica niente').intent, 'bug');
  assert.strictEqual(E.reply('ricetta della carbonara', { streak: 2 }).intent, 'long', 'al terzo fuori tema di fila');
  assert.strictEqual(E.reply('a'.repeat(200)).intent, 'long');
  assert.ok(/Mamma mia quanto scrivi/.test(E.reply('x'.repeat(200)).text));
  assert.strictEqual(E.reply('grazie ciao').intent, 'bye');
  assert.ok(E.CLOSING.includes(E.reply('ok grazie').text));
  assert.strictEqual(E.reply('   '), null);
});

t('chiusura: una delle tre frasi', () => {
  assert.strictEqual(E.closing(() => 0), E.CLOSING[0]);
  assert.strictEqual(E.closing(() => 0.99), E.CLOSING[2]);
});

console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
