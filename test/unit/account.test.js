// Prove degli account con Firebase Authentication (src/services/account.js), col Firebase finto.
// Uso: node test/unit/account.test.js [filtro]
const assert = require('assert');
const { setupWindow } = require('./node-window');
const F = require('../../src/services/firebase');
const { createAccount, MESSAGES } = require('../../src/services/account');

let pass = 0, fail = 0;
const tests = [];
const t = (name, fn) => tests.push([name, fn]);
// Firebase finto pulito; ctx.fs(path) legge un documento, ctx.auth() lo stato di Authentication.
function ctx({ docs = {}, users, requireRecentLogin } = {}) {
  const { firebase } = setupWindow({ seed: { addDocs: docs, ...(users ? { users } : {}), requireRecentLogin } });
  return { firebase, fake: firebase.__fake, fs: p => firebase.__fake.doc(p), auth: () => firebase.__fake.authState() };
}
const make = (o = {}) => createAccount({ ...F, ...o });

t('account di oggi: entra con la sua password e passa ad Authentication senza pw', async () => {
  const c = ctx({ docs: { 'users/v@b.it': { email: 'v@b.it', name: 'Edo', pw: 'segreta', isPremium: false } } });
  const A = make();
  const u = await A.login(' V@b.it ', 'segreta');   // spazi e maiuscole come li scrive il telefono
  assert.strictEqual(u.email, 'v@b.it');
  assert.strictEqual(u.name, 'Edo');
  assert.ok(c.auth().users['v@b.it'], 'manca l\'account in Authentication');
  assert.strictEqual(c.fs('users/v@b.it').pw, undefined, 'la password in chiaro è ancora salvata');
  assert.ok(c.fs('users/v@b.it').migrated);
  assert.strictEqual(c.fs('users/v@b.it').uid, c.auth().users['v@b.it'].uid);
  assert.strictEqual(A.current().email, 'v@b.it');
  // la volta dopo entra direttamente con Authentication
  await A.logout();
  assert.strictEqual(A.current(), null);
  await A.login('v@b.it', 'segreta');
  assert.strictEqual(A.current().name, 'Edo');
});

t('password sbagliata: wrong-password e nessun passaggio; email sconosciuta: not-found', async () => {
  const c = ctx({ docs: { 'users/v@b.it': { email: 'v@b.it', name: 'Edo', pw: 'segreta' } } });
  const A = make();
  await assert.rejects(A.login('v@b.it', 'no'), e => e.code === 'wrong-password');
  assert.strictEqual(c.auth().users['v@b.it'], undefined);
  assert.strictEqual(c.fs('users/v@b.it').pw, 'segreta');
  await assert.rejects(A.login('nessuno@b.it', 'abcdef'), e => e.code === 'not-found');
  await assert.rejects(A.login('a@b.it', 'sbagliata'), e => e.code === 'wrong-password');   // già in Authentication
  await assert.rejects(A.login('', 'x'), e => e.code === 'empty');
  await assert.rejects(A.login('edo@', 'x'), e => e.code === 'invalid-email');
  assert.strictEqual(MESSAGES['wrong-password'], 'Password errata');
  assert.strictEqual(MESSAGES['not-found'], 'Account non trovato');
});

t('registrazione: About you salvato, niente pw, almeno 6 caratteri', async () => {
  const c = ctx();
  const A = make();
  await assert.rejects(A.register({ name: 'F', email: 'f@b.it', pw: '123', pw2: '123', about: {} }), e => e.code === 'weak');
  await assert.rejects(A.register({ name: 'F', email: 'f@b.it', pw: 'abcdef', pw2: 'abcdeg', about: {} }), e => e.code === 'mismatch');
  await assert.rejects(A.register({ name: '', email: 'f@b.it', pw: 'abcdef', pw2: 'abcdef', about: {} }), e => e.code === 'empty');
  await assert.rejects(A.register({ name: 'Doppio', email: 'a@b.it', pw: 'abcdef', pw2: 'abcdef', about: {} }), e => e.code === 'exists');
  const u = await A.register({ name: 'Fabio', email: 'F@b.it ', pw: 'abcdef', pw2: 'abcdef', about: { birth: 2001, follow: 3, fan: 'vivo' } });
  const doc = c.fs('users/f@b.it');
  assert.deepStrictEqual(doc.about, { birth: 2001, follow: 3, fan: 'vivo' });
  assert.strictEqual(doc.pw, undefined);
  for (const [k, v] of Object.entries({ name: 'Fabio', nick: 'Fabio', email: 'f@b.it', isPremium: false, premium: false, plan: 'free' })) assert.strictEqual(doc[k], v, k);
  assert.deepStrictEqual(doc.notif, { news: true, live: true, fanta: true });
  assert.deepStrictEqual(doc.app2, {});
  assert.ok(doc.ts && doc.uid);
  assert.strictEqual(u.name, 'Fabio');
  assert.strictEqual(A.current().email, 'f@b.it');
  assert.strictEqual(MESSAGES.weak, 'La password deve avere almeno 6 caratteri');
  assert.strictEqual(MESSAGES.exists, 'Email già registrata');
  assert.strictEqual(MESSAGES.mismatch, 'Le password non coincidono');
});

t('registrazione con un account di oggi non ancora passato: Email già registrata', async () => {
  ctx({ docs: { 'users/v@b.it': { email: 'v@b.it', name: 'Edo', pw: 'segreta' } } });
  await assert.rejects(make().register({ name: 'Altro', email: 'v@b.it', pw: 'abcdef', pw2: 'abcdef', about: {} }), e => e.code === 'exists');
});

t('offline: errore offline e nessun account creato', async () => {
  const c = ctx();
  const A = make();
  c.fake.offline = true;
  await assert.rejects(A.register({ name: 'X', email: 'x@y.it', pw: 'abcdef', pw2: 'abcdef', about: {} }), e => e.code === 'offline');
  await assert.rejects(A.login('a@b.it', 'x'), e => e.code === 'offline');
  c.fake.offline = false;
  assert.strictEqual(c.fs('users/x@y.it'), undefined);
  assert.strictEqual(c.auth().users['x@y.it'], undefined);
  assert.strictEqual(MESSAGES.offline, 'Errore di connessione, riprova tra poco');
});

t('password dimenticata di un account non ancora passato: account Authentication creato ed email mandata', async () => {
  const c = ctx({ docs: { 'users/v@b.it': { email: 'v@b.it', name: 'V', pw: 'vecchia' } } });
  const A = make();
  await A.resetPassword('v@b.it');
  assert.ok(c.auth().users['v@b.it']);
  assert.deepStrictEqual(c.auth().resetSent, ['v@b.it']);
  assert.strictEqual(c.auth().current, null, 'dopo la creazione si deve uscire');
  assert.strictEqual(c.fs('users/v@b.it').pw, undefined);
  await A.resetPassword('a@b.it');   // già passato: solo l'email
  assert.deepStrictEqual(c.auth().resetSent, ['v@b.it', 'a@b.it']);
  await assert.rejects(A.resetPassword(''), e => e.code === 'empty-email');
  assert.ok(/Ti abbiamo mandato un'email per scegliere una nuova password/.test(MESSAGES['reset-sent']));
});

t('eliminazione: se una pulizia fallisce il profilo resta', async () => {
  const c = ctx();
  const ok = make();
  await ok.register({ name: 'Fabio', email: 'f@b.it', pw: 'abcdef', pw2: 'abcdef', about: {} });
  const B = make({ cleanups: [async () => { throw new Error('rete'); }] });
  await B.login('f@b.it', 'abcdef');
  await assert.rejects(B.deleteAccount('abcdef'), e => e.code === 'delete-failed');
  assert.ok(c.fs('users/f@b.it'));
  assert.ok(c.auth().users['f@b.it']);
  assert.strictEqual(MESSAGES['delete-failed'], 'Eliminazione non riuscita, controlla la connessione e riprova.');
});

t('eliminazione: password chiesta prima di cancellare; poi via profilo, resets, Authentication e dati del telefono', async () => {
  const c = ctx({ requireRecentLogin: true });
  const seen = [];
  const A = make({ cleanups: [async u => { seen.push(u.email); }] });
  await A.register({ name: 'Fabio', email: 'f@b.it', pw: 'abcdef', pw2: 'abcdef', about: {} });
  c.fake.setDoc('resets/f@b.it', { code: '123456', exp: 1 });
  F.local.set('bt-blocked', [{ aid: 'u1', name: 'Marco' }]);
  F.local.set('bt-chat-seen-bt-chat-generale', 5);
  await assert.rejects(A.deleteAccount(''), e => e.code === 'need-password');
  await assert.rejects(A.deleteAccount('sbagliata'), e => e.code === 'wrong-password');
  assert.ok(c.fs('users/f@b.it'), 'con la password sbagliata non si cancella niente');
  await A.deleteAccount('abcdef');
  assert.deepStrictEqual(seen, ['f@b.it']);
  assert.strictEqual(c.fs('users/f@b.it'), undefined);
  assert.strictEqual(c.fs('resets/f@b.it'), undefined);
  assert.strictEqual(c.auth().users['f@b.it'], undefined);
  assert.strictEqual(F.local.get('bt-blocked'), null);
  assert.strictEqual(F.local.get('bt-chat-seen-bt-chat-generale'), null);
  assert.strictEqual(A.current(), null);
  await assert.rejects(A.login('f@b.it', 'abcdef'), e => e.code === 'not-found');
});

t('accesso con email e password non acceso nella console di Firebase: lo dice (non "errore di connessione")', async () => {
  ctx();
  const off = Object.assign(new Error('off'), { code: 'auth/operation-not-allowed' });
  const A = make({ getAuth: async () => ({ signInWithEmailAndPassword: async () => { throw off; }, createUserWithEmailAndPassword: async () => { throw off; } }) });
  await assert.rejects(A.login('a@b.it', 'x'), e => e.code === 'not-enabled');
  await assert.rejects(A.register({ name: 'F', email: 'f@b.it', pw: 'abcdef', pw2: 'abcdef', about: {} }), e => e.code === 'not-enabled');
  assert.ok(/non è ancora attivo/.test(MESSAGES['not-enabled']));
});

t('isAdmin solo con il documento admins/<email>', async () => {
  ctx();
  const A = make();
  await A.register({ name: 'Fabio', email: 'f@b.it', pw: 'abcdef', pw2: 'abcdef', about: {} });
  assert.strictEqual(A.isAdmin(), false);
  await A.logout();
  await A.login('a@b.it', 'x');
  assert.strictEqual(A.isAdmin(), true);
});

t('sessione: ricaricando la pagina l\'account torna da Authentication (dopo il primo onAuthStateChanged)', async () => {
  const first = setupWindow();
  await make().login('a@b.it', 'x');
  setupWindow({ storage: first.localStorage });   // stessa memoria del telefono: l'app riaperta
  const A = make();
  const seen = [];
  A.onChange(u => seen.push(u && u.email));
  await A.start();
  assert.strictEqual(A.current().email, 'a@b.it');
  assert.strictEqual(A.current().name, 'Tester');
  assert.deepStrictEqual(seen, ['a@b.it']);
  assert.strictEqual(A.isAdmin(), true);
});

t('profilo: nome e "Su di te" si modificano; account vecchio senza "Su di te" ha about vuoto', async () => {
  const c = ctx({ docs: { 'users/v@b.it': { email: 'v@b.it', name: 'Edo', pw: 'segreta' } } });
  const A = make();
  const u = await A.login('v@b.it', 'segreta');
  assert.deepStrictEqual(u.about, { birth: null, follow: null, fan: null });
  await A.updateName('  Edoardo ');
  await A.updateAbout({ birth: 1999, follow: 4, fan: 'vroom' });
  const doc = c.fs('users/v@b.it');
  assert.strictEqual(doc.name, 'Edoardo');
  assert.strictEqual(doc.nick, 'Edoardo');
  assert.deepStrictEqual(doc.about, { birth: 1999, follow: 4, fan: 'vroom' });
  assert.strictEqual(A.current().name, 'Edoardo');
  assert.deepStrictEqual(A.current().about, { birth: 1999, follow: 4, fan: 'vroom' });
  assert.ok(/^u[0-9a-f]{16}$/.test(A.current().aid));
});

(async () => {
  const filter = process.argv[2] ? new RegExp(process.argv[2], 'i') : null;
  for (const [name, fn] of tests) {
    if (filter && !filter.test(name)) continue;
    try { await fn(); pass++; console.log('PASS  ' + name); }
    catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); }
  }
  console.log(`\n${pass} passati, ${fail} falliti`);
  process.exit(fail ? 1 : 0);
})();
