// Prove del Firebase finto usato da tutte le prove (test/fake/fake-firebase.js).
// Uso: node test/unit/fake-firebase.test.js
const assert = require('assert');
const { setupWindow } = require('./node-window');

let pass = 0, fail = 0;
const tests = [];
const t = (name, fn) => tests.push([name, fn]);

t('il Firebase finto salva e rilegge un documento (merge)', async () => {
  const { firebase } = setupWindow();
  firebase.initializeApp({ projectId: 'prova' });
  const db = firebase.firestore();
  await db.collection('shared').doc('bt-x').set({ a: 1, b: { c: 2 } });
  await db.collection('shared').doc('bt-x').set({ b: { d: 3 } }, { merge: true });
  const snap = await db.collection('shared').doc('bt-x').get();
  assert.strictEqual(snap.exists, true);
  assert.deepStrictEqual(snap.data(), { a: 1, b: { c: 2, d: 3 } });
  const none = await db.collection('shared').doc('manca').get();
  assert.strictEqual(none.exists, false);
});

t('accesso con la password sbagliata: auth/invalid-credential', async () => {
  const { firebase } = setupWindow();
  const auth = firebase.auth();
  await assert.rejects(auth.signInWithEmailAndPassword('a@b.it', 'sbagliata'), e => e.code === 'auth/invalid-credential');
  await assert.rejects(auth.signInWithEmailAndPassword('nessuno@b.it', 'x'), e => e.code === 'auth/invalid-credential');
  const r = await auth.signInWithEmailAndPassword('a@b.it', 'x');
  assert.strictEqual(r.user.email, 'a@b.it');
});

t('account nuovo con password di 3 caratteri: auth/weak-password', async () => {
  const { firebase } = setupWindow();
  const auth = firebase.auth();
  await assert.rejects(auth.createUserWithEmailAndPassword('n@b.it', '123'), e => e.code === 'auth/weak-password');
  await assert.rejects(auth.createUserWithEmailAndPassword('a@b.it', 'abcdef'), e => e.code === 'auth/email-already-in-use');
  const r = await auth.createUserWithEmailAndPassword('n@b.it', 'abcdef');
  assert.strictEqual(r.user.email, 'n@b.it');
  assert.strictEqual(auth.currentUser.email, 'n@b.it');
});

(async () => {
  for (const [name, fn] of tests) {
    try { await fn(); pass++; console.log('PASS  ' + name); }
    catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); }
  }
  console.log(`\n${pass} passati, ${fail} falliti`);
  process.exit(fail ? 1 : 0);
})();
