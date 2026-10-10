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

// Revisione della Fase B (I2 e minore 3): una pagina finta con <head>, dove gli script non arrivano finché la prova
// non chiama onload o onerror.
function fakeDocument(window) {
  const head = { kids: [], appendChild(s) { this.kids.push(s); } };
  window.document = {
    head,
    createElement: () => { const s = { dataset: {}, remove() { const i = head.kids.indexOf(s); if (i >= 0) head.kids.splice(i, 1); } }; return s; },
    querySelector: sel => head.kids.find(s => sel === `script[src="${s.src}"]`) || null,
  };
  return head;
}
t('script di Firebase che non arriva mai (rete bloccata): dopo il tempo massimo rifiuta "offline" e lo toglie', async () => {
  const { window } = setupWindow();
  const head = fakeDocument(window);
  const t0 = Date.now();
  await assert.rejects(F.loadScript('https://x.test/a.js', 60), e => e.code === 'offline');
  assert.ok(Date.now() - t0 < 1500, 'ha aspettato troppo');
  assert.strictEqual(head.kids.length, 0, 'lo script in attesa è rimasto nella pagina');
  delete window.document;
});
t('lo stesso script chiesto più volte insieme: una sola richiesta, e chi chiede dopo il caricamento non riscarica', async () => {
  const { window } = setupWindow();
  const head = fakeDocument(window);
  const p1 = F.loadScript('https://x.test/b.js', 5000), p2 = F.loadScript('https://x.test/b.js', 5000);
  assert.strictEqual(head.kids.length, 1, 'script nella pagina: ' + head.kids.length);
  head.kids[0].onload();
  await Promise.all([p1, p2]);
  await F.loadScript('https://x.test/b.js', 5000);
  assert.strictEqual(head.kids.length, 1);
  assert.strictEqual(head.kids[0].dataset.ok, '1');
  delete window.document;
});
t('script che fallisce: rifiuta "offline" e al tentativo dopo si riprova da capo', async () => {
  const { window } = setupWindow();
  const head = fakeDocument(window);
  const p1 = F.loadScript('https://x.test/c.js', 5000);
  head.kids[0].onerror();
  await assert.rejects(p1, e => e.code === 'offline');
  assert.strictEqual(head.kids.length, 0);
  const p2 = F.loadScript('https://x.test/c.js', 5000);
  assert.strictEqual(head.kids.length, 1);
  head.kids[0].onload();
  await p2;
  delete window.document;
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

t('dbSet con remove: toglie i campi nella stessa scrittura (la vecchia password in chiaro)', async () => {
  const { firebase } = setupWindow();
  firebase.__fake.setDoc('users/v@b.it', { name: 'V', pw: 'vecchia' });
  await F.dbSet('users', 'v@b.it', { uid: 'u1' }, { remove: ['pw'] });
  assert.deepStrictEqual(firebase.__fake.doc('users/v@b.it'), { name: 'V', uid: 'u1' });
});

t('dbQuery: {id, data} con il nome vero del documento, anche se nei dati c\'è un campo id', async () => {
  const { firebase } = setupWindow();
  firebase.__fake.setDoc('shared/bt-feedback-k1', { id: 'k1', user: 'v@b.it', stars: 4 });
  firebase.__fake.setDoc('shared/bt-feedback-k2', { id: 'k2', user: 'altro@b.it', stars: 2 });
  assert.deepStrictEqual(await F.dbQuery('shared', 'user', 'v@b.it'), [{ id: 'bt-feedback-k1', data: { id: 'k1', user: 'v@b.it', stars: 4 } }]);
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
