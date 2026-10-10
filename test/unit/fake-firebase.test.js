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

// ── Come Firestore compat 10 (dalla revisione della Fase A) ───────────────
const wait = ms => new Promise(r => setTimeout(r, ms));

t('update: sostituisce i campi di primo livello e segue i percorsi col punto', async () => {
  const { firebase } = setupWindow();
  const ref = firebase.firestore().collection('users').doc('u@b.it');
  await ref.set({ about: { fan: 'vivo', birth: 2001 }, app2: { saved: [1], votes: { a: 'x' } } });
  await ref.update({ about: { fan: 'vroom' } });
  assert.deepStrictEqual((await ref.get()).data().about, { fan: 'vroom' });
  await ref.update({ 'app2.saved': [2] });
  const d = (await ref.get()).data();
  assert.deepStrictEqual(d.app2, { saved: [2], votes: { a: 'x' } });
  assert.strictEqual(d['app2.saved'], undefined);
});

t('set con merge: una mappa vuota sostituisce quella che c\'era', async () => {
  const { firebase } = setupWindow();
  const ref = firebase.firestore().collection('users').doc('u@b.it');
  await ref.set({ app2: { votes: { a: 1 }, saved: [1] } });
  await ref.set({ app2: { votes: {} } }, { merge: true });
  assert.deepStrictEqual((await ref.get()).data().app2, { votes: {}, saved: [1] });
});

t('valori che Firestore rifiuta: undefined, array dentro array, documento oltre 1 MiB', async () => {
  const { firebase } = setupWindow();
  const ref = firebase.firestore().collection('shared').doc('bt-x');
  await assert.rejects(ref.set({ a: undefined }), e => e.code === 'invalid-argument');
  await assert.rejects(ref.set({ options: [['hamilton', 'L. Hamilton']] }), e => e.code === 'invalid-argument');
  await assert.rejects(ref.set({ big: 'x'.repeat(1048577) }), e => e.code === 'invalid-argument');
  await assert.rejects(ref.update({ a: undefined }), e => e.code === 'invalid-argument');
  await ref.set({ options: [{ id: 'hamilton', label: 'L. Hamilton' }] });   // array di mappe: va bene
  assert.strictEqual((await ref.get()).exists, true);
});

t('set senza merge con arrayUnion: parte da un documento vuoto', async () => {
  const { firebase } = setupWindow();
  const ref = firebase.firestore().collection('shared').doc('bt-l');
  await ref.set({ __arr: ['a'] });
  await ref.set({ __arr: firebase.firestore.FieldValue.arrayUnion('b') });
  assert.deepStrictEqual((await ref.get()).data(), { __arr: ['b'] });
});

t('transazione: se un passo fallisce non si scrive niente', async () => {
  const { firebase } = setupWindow();
  const db = firebase.firestore(), a = db.collection('shared').doc('bt-a'), missing = db.collection('shared').doc('bt-manca');
  await assert.rejects(db.runTransaction(async tx => { tx.set(a, { v: 1 }); tx.update(missing, { v: 2 }); }), e => e.code === 'not-found');
  assert.strictEqual((await a.get()).exists, false);
});

t('senza rete una scrittura resta in sospeso e parte quando la rete torna (come Firestore)', async () => {
  const { firebase } = setupWindow();
  const ref = firebase.firestore().collection('shared').doc('bt-x');
  firebase.__fake.offline = true;
  let done = false;
  const p = ref.set({ v: 1 }).then(() => { done = true; });
  await wait(80);
  assert.strictEqual(done, false, 'la scrittura senza rete non deve né riuscire né fallire subito');
  await assert.rejects(ref.get(), e => e.code === 'unavailable');   // le letture invece falliscono
  firebase.__fake.offline = false;
  await p;
  assert.deepStrictEqual((await ref.get()).data(), { v: 1 });
});

t('scritture rifiutate (regole): permission-denied', async () => {
  const { firebase } = setupWindow();
  firebase.__fake.failWrites = true;
  await assert.rejects(firebase.firestore().collection('shared').doc('bt-x').set({ v: 1 }), e => e.code === 'permission-denied');
});

t('ricaricando la pagina currentUser è null finché arriva il primo onAuthStateChanged', async () => {
  const first = setupWindow();
  await first.firebase.auth().signInWithEmailAndPassword('a@b.it', 'x');
  const { firebase } = setupWindow({ storage: first.localStorage });   // stessa memoria: la pagina ricaricata
  const auth = firebase.auth();
  assert.strictEqual(auth.currentUser, null);
  const u = await new Promise(res => auth.onAuthStateChanged(res));
  assert.strictEqual(u && u.email, 'a@b.it');
  assert.strictEqual(auth.currentUser.email, 'a@b.it');
});

t('ricaricando la pagina per eliminare l\'account serve di nuovo la password', async () => {
  const first = setupWindow({ seed: { requireRecentLogin: true } });
  await first.firebase.auth().signInWithEmailAndPassword('a@b.it', 'x');
  const { firebase } = setupWindow({ storage: first.localStorage });
  const auth = firebase.auth();
  const u = await new Promise(res => auth.onAuthStateChanged(res));
  await assert.rejects(u.delete(), e => e.code === 'auth/requires-recent-login');
});

t('email non valida e password mancante: auth/invalid-email e auth/missing-password', async () => {
  const { firebase } = setupWindow();
  const auth = firebase.auth();
  await assert.rejects(auth.signInWithEmailAndPassword('edo@', 'x'), e => e.code === 'auth/invalid-email');
  await assert.rejects(auth.signInWithEmailAndPassword(' a@b.it', 'x'), e => e.code === 'auth/invalid-email');
  await assert.rejects(auth.signInWithEmailAndPassword('a@b.it', ''), e => e.code === 'auth/missing-password');
  await assert.rejects(auth.createUserWithEmailAndPassword('nuovo@', 'abcdef'), e => e.code === 'auth/invalid-email');
  await assert.rejects(auth.createUserWithEmailAndPassword('nuovo@b.it', ''), e => e.code === 'auth/missing-password');
  await assert.rejects(auth.sendPasswordResetEmail('edo@'), e => e.code === 'auth/invalid-email');
  const r = await auth.signInWithEmailAndPassword('A@B.it', 'x');   // le email non distinguono maiuscole e minuscole
  assert.strictEqual(r.user.email, 'a@b.it');
});

(async () => {
  const filter = process.argv[2] ? new RegExp(process.argv[2], 'i') : null;   // node … <filtro sul nome>
  for (const [name, fn] of tests) {
    if (filter && !filter.test(name)) continue;
    try { await fn(); pass++; console.log('PASS  ' + name); }
    catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); }
  }
  console.log(`\n${pass} passati, ${fail} falliti`);
  process.exit(fail ? 1 : 0);
})();
