// Prove del servizio Firebase della nuova app (src/services/firebase.js), col Firebase finto in window.firebase.
// Uso: node test/unit/firebase.test.js
const assert = require('assert');
const { setupWindow } = require('./node-window');

const F = require('../../src/services/firebase');
let pass = 0, fail = 0;
const tests = [];
const t = (name, fn) => tests.push([name, fn]);

t('array salvati come {__arr} e riletti uguali', async () => {
  const { firebase } = setupWindow();
  await F.ss('bt-x', [1, 2]);
  assert.deepStrictEqual(await F.sg('bt-x'), [1, 2]);
  assert.deepStrictEqual(firebase.__fake.doc('shared/bt-x'), { __arr: [1, 2] });
  await F.ss('bt-o', { a: 1, b: undefined, c: NaN });   // come oggi: undefined sparisce, NaN diventa null
  assert.deepStrictEqual(firebase.__fake.doc('shared/bt-o'), { a: 1, c: null });
  assert.strictEqual(await F.sg('bt-manca'), null);
  assert.strictEqual(F.isOnline(), true);
});

t('sharedAppend e sharedRemoveWhere senza riscrivere gli altri elementi', async () => {
  const { firebase } = setupWindow();
  await F.sharedAppend('bt-l', { id: 1 });
  await F.sharedAppend('bt-l', { id: 2 });
  await F.sharedAppend('bt-l', { id: 3 });
  await F.sharedRemoveWhere('bt-l', x => x.id === 1);
  assert.deepStrictEqual(await F.sg('bt-l'), [{ id: 2 }, { id: 3 }]);
  await F.sharedRemoveWhere('bt-nessuno', () => true);   // documento che non c'è: niente errori
  firebase.__fake.failWrites = true;
  await assert.rejects(F.sharedAppend('bt-l', { id: 4 }));   // a differenza di oggi l'errore arriva a chi chiama
  await assert.rejects(F.ss('bt-l', []));
});

t('senza Firebase: letture null, scritture rifiutate con offline, isOnline falso', async () => {
  const { window } = setupWindow();
  delete window.firebase;            // e in Node non c'è document: lo script di gstatic non si può caricare
  assert.strictEqual(await F.sg('bt-news'), null);
  await assert.rejects(F.ss('bt-news', []), e => e.code === 'offline');
  await assert.rejects(F.sharedAppend('bt-chat-generale', { id: 'm' }), e => e.code === 'offline');
  await assert.rejects(F.dbGet('users', 'a@b.it'), e => e.code === 'offline');
  assert.strictEqual(await F.getDb(), null);
  assert.strictEqual(await F.getAuth(), null);
  assert.strictEqual(F.isOnline(), false);
  setupWindow();                     // torna Firebase: si riprova e si torna online
  assert.ok(await F.getDb());
  assert.strictEqual(F.isOnline(), true);
});

t('sgStrict: null se il documento manca, errore se non c\'è rete (sg invece dà null in tutti e due i casi)', async () => {
  const { firebase } = setupWindow();
  await F.ss('bt-x', [1]);
  assert.deepStrictEqual(await F.sgStrict('bt-x'), [1]);
  assert.strictEqual(await F.sgStrict('bt-manca'), null);
  firebase.__fake.offline = true;
  await assert.rejects(F.sgStrict('bt-x'), e => e.code === 'unavailable');
  assert.strictEqual(await F.sg('bt-x'), null);
  assert.strictEqual(F.isOnline(), false);
  firebase.__fake.offline = false;
  const { window } = setupWindow();
  delete window.firebase;
  await assert.rejects(F.sgStrict('bt-x'), e => e.code === 'offline');
});

t('dati solo del telefono con prefisso bt_', async () => {
  const { localStorage } = setupWindow();
  F.local.set('bt-blocked', [{ aid: 'u1', name: 'Marco' }]);
  assert.strictEqual(localStorage.getItem('bt_bt-blocked'), JSON.stringify([{ aid: 'u1', name: 'Marco' }]));
  assert.deepStrictEqual(F.local.get('bt-blocked'), [{ aid: 'u1', name: 'Marco' }]);
  await F.ss('bt-seen', { t: 5 }, false);
  assert.deepStrictEqual(await F.sg('bt-seen', false), { t: 5 });
  F.local.del('bt-blocked');
  assert.strictEqual(F.local.get('bt-blocked'), null);
});

(async () => {
  for (const [name, fn] of tests) {
    try { await fn(); pass++; console.log('PASS  ' + name); }
    catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); }
  }
  console.log(`\n${pass} passati, ${fail} falliti`);
  process.exit(fail ? 1 : 0);
})();
