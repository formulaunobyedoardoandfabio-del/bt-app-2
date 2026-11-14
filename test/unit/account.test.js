// Prove degli account con Firebase Authentication (src/services/account.js), col Firebase finto.
// Uso: node test/unit/account.test.js [filtro]
const assert = require('assert');
const { setupWindow } = require('./node-window');
const F = require('../../src/services/firebase');
const { createAccount, MESSAGES, messageOf, pwStrength } = require('../../src/services/account');

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
  await assert.rejects(A.login('nessuno@b.it', 'abcdef12'), e => e.code === 'not-found');
  await assert.rejects(A.login('a@b.it', 'sbagliata'), e => e.code === 'wrong-password');   // già in Authentication
  await assert.rejects(A.login('', 'x'), e => e.code === 'empty');
  await assert.rejects(A.login('edo@', 'x'), e => e.code === 'invalid-email');
  assert.strictEqual(MESSAGES['wrong-password'], 'Password errata');
  assert.strictEqual(MESSAGES['not-found'], 'Account non trovato');
});

t('7/11 data di nascita intera: età esatta, anno ricavato dalla data, data non valida scartata', async () => {
  const c = ctx();
  const A = make();
  const y = new Date().getFullYear(), mm = String(new Date().getMonth() + 1).padStart(2, '0');
  // 14 anni compiuti per anno ma non ancora per giorno: troppo giovane (prima bastava l'anno)
  const later = new Date(Date.UTC(y - 14, new Date().getMonth(), new Date().getDate() + 1)).toISOString().slice(0, 10);
  await assert.rejects(A.register({ name: 'Fabio', email: 'f@b.it', pw: 'abcdef12', pw2: 'abcdef12', about: { birth: y - 14, birthDate: later }, adult: true }), e => e.code === 'too-young');
  await A.register({ name: 'Fabio', email: 'f@b.it', pw: 'abcdef12', pw2: 'abcdef12', about: { birth: 1990, birthDate: '2001-' + mm + '-01', follow: 1, fan: 'vivo' }, adult: true });
  const doc = c.fs('users/f@b.it');
  assert.strictEqual(doc.about.birthDate, '2001-' + mm + '-01');
  assert.strictEqual(doc.about.birth, 2001, 'l\'anno viene dalla data');
  await A.updateAbout({ birth: 2001, follow: 1, fan: 'vivo', birthDate: '2001-02-30' });
  assert.strictEqual(c.fs('users/f@b.it').about.birthDate, null, 'il 30 febbraio non esiste');
});

// 8/11: niente casella "Ho almeno 14 anni": senza data di nascita (e senza adult, come le app vecchie) non si crea.
t('iscrizione: senza data di nascita o con meno di 14 anni non si crea l\'account', async () => {
  const c = ctx();
  const A = make();
  await assert.rejects(A.register({ name: 'Fabio', email: 'f@b.it', pw: 'abcdef12', pw2: 'abcdef12', about: {} }), e => e.code === 'need-birth');
  await assert.rejects(A.register({ name: 'Fabio', email: 'f@b.it', pw: 'abcdef12', pw2: 'abcdef12', about: { birth: 2015 }, adult: true }), e => e.code === 'too-young');
  assert.strictEqual(c.fs('users/f@b.it'), undefined, 'account creato lo stesso');
  assert.ok(!c.auth().users['f@b.it'], 'account Authentication creato lo stesso');
  assert.strictEqual(MESSAGES['need-birth'], 'Scrivi la tua data di nascita: serve per controllare che tu abbia almeno 14 anni.');
  assert.strictEqual(MESSAGES['too-young'], 'Per iscriverti a Sector 4 devi avere almeno 14 anni.');
  const u = await A.register({ name: 'Fabio', email: 'f@b.it', pw: 'abcdef12', pw2: 'abcdef12', about: { birth: 2012 }, adult: true });   // 14 anni nel 2026
  assert.strictEqual(u.email, 'f@b.it');
});

t('registrazione: About you salvato, niente pw, password robusta (8 caratteri, lettere e numeri)', async () => {
  const c = ctx();
  const A = make();
  await assert.rejects(A.register({ name: 'F', email: 'f@b.it', pw: '123', pw2: '123', about: {} }), e => e.code === 'weak');
  await assert.rejects(A.register({ name: 'F', email: 'f@b.it', pw: 'abcdef12', pw2: 'abcdeg12', about: {} }), e => e.code === 'mismatch');
  await assert.rejects(A.register({ name: '', email: 'f@b.it', pw: 'abcdef12', pw2: 'abcdef12', about: {}, adult: true }), e => e.code === 'empty');
  await assert.rejects(A.register({ name: 'Doppio', email: 'a@b.it', pw: 'abcdef12', pw2: 'abcdef12', about: {}, adult: true }), e => e.code === 'exists');
  const u = await A.register({ name: 'Fabio', email: 'F@b.it ', pw: 'abcdef12', pw2: 'abcdef12', about: { birth: 2001, follow: 3, fan: 'vivo' }, adult: true });
  const doc = c.fs('users/f@b.it');
  assert.deepStrictEqual(doc.about, { birth: 2001, follow: 3, fan: 'vivo' });
  assert.strictEqual(doc.pw, undefined);
  for (const [k, v] of Object.entries({ name: 'Fabio', email: 'f@b.it' })) assert.strictEqual(doc[k], v, k);
  // 31/10: un campo per cosa: niente nick (= name), isPremium/premium/plan (il Premium sta in app2.premium), notif.
  for (const k of ['nick', 'isPremium', 'premium', 'plan', 'notif']) assert.strictEqual(doc[k], undefined, k);
  assert.deepStrictEqual(doc.app2, {});
  assert.ok(doc.ts && doc.uid);
  assert.strictEqual(u.name, 'Fabio');
  assert.strictEqual(A.current().email, 'f@b.it');
  // 18/10: password robusta per gli account nuovi: almeno 8 caratteri, con lettere e numeri.
  assert.strictEqual(MESSAGES.weak, 'La password deve avere almeno 8 caratteri, con lettere e numeri');
  for (const pw of ['abcdefgh', '12345678', 'abc1234']) await assert.rejects(A.register({ name: 'F', email: 'w@b.it', pw, pw2: pw, about: {}, adult: true }), e => e.code === 'weak', pw);
  assert.deepStrictEqual(['', 'abc', 'abcdefgh', 'abcdef12', 'Abcdef12!x'].map(pwStrength), [0, 1, 1, 2, 3]);
  assert.strictEqual(MESSAGES.exists, 'Email già registrata');
  assert.strictEqual(MESSAGES.mismatch, 'Le password non coincidono');
});

// 31/10: entrando, un profilo coi campi doppi dell'app di prima si sistema: resta un campo per cosa. Un Premium dato a
// mano (isPremium: true) passa in app2.premium.sub; nick diverso dal nome non si perde (diventa il nome se manca).
t('profilo coi campi doppi: entrando restano name, email, app2 (Premium in app2.premium); il Premium a mano resta', async () => {
  const legacy = { email: 'p@b.it', name: 'Paolo', nick: 'Paolo', isPremium: true, premium: true, plan: 'premium', notif: { news: true, live: true, fanta: true }, about: { birth: 1999, follow: 2, fan: 'vivo' }, app2: { favTeam: 'ferrari', premium: { sub: false, trial: null } } };
  const c = ctx({ docs: { 'users/p@b.it': legacy }, users: { 'p@b.it': { pw: 'abcdef12', uid: 'uid-p' } } });
  const A = make();
  const u = await A.login('p@b.it', 'abcdef12');
  await new Promise(r => setTimeout(r, 30));
  const doc = c.fs('users/p@b.it');
  for (const k of ['nick', 'isPremium', 'premium', 'plan', 'notif']) assert.strictEqual(doc[k], undefined, 'campo doppio rimasto: ' + k);
  assert.strictEqual(doc.name, 'Paolo');
  assert.strictEqual(doc.app2.favTeam, 'ferrari', 'i dati dell\'app restano');
  assert.strictEqual(doc.app2.premium.sub, true, 'il Premium dato a mano passa in app2.premium');
  assert.strictEqual(u.isPremium, true);
  assert.strictEqual(A.current().nick, 'Paolo');
  // Un profilo già pulito non si riscrive
  const c2 = ctx({ docs: { 'users/q@b.it': { email: 'q@b.it', name: 'Qui', about: {}, app2: {} } }, users: { 'q@b.it': { pw: 'abcdef12', uid: 'uid-q' } } });
  let writes = 0;
  const B = make({ dbSet: (...a) => { writes++; return F.dbSet(...a); } });
  await B.login('q@b.it', 'abcdef12');
  await new Promise(r => setTimeout(r, 30));
  assert.strictEqual(writes, 0, 'profilo già pulito riscritto');
  assert.strictEqual(B.current().isPremium, false);
  void c2;
  // Abbonamento Stripe dell'app di prima: isPremium e plan restano (li gestisce il suo server), il resto si sistema.
  const c3 = ctx({ docs: { 'users/s@b.it': { email: 's@b.it', name: 'Sara', nick: 'Sara', isPremium: true, plan: 'annual', stripeSubscriptionId: 'sub_1', app2: {} } }, users: { 's@b.it': { pw: 'abcdef12', uid: 'uid-s' } } });
  await make().login('s@b.it', 'abcdef12');
  await new Promise(r => setTimeout(r, 30));
  const d3 = c3.fs('users/s@b.it');
  assert.strictEqual(d3.isPremium, true); assert.strictEqual(d3.plan, 'annual'); assert.strictEqual(d3.nick, undefined);
  assert.ok(!(d3.app2.premium && d3.app2.premium.sub), 'con Stripe il Premium non si copia in app2');
});

// 18/10 (Edoardo): creando l'account "Errore di connessione, riprova tra poco" senza codice: era il salvataggio del
// profilo (users/<email>) dopo Authentication. Ora si riprova una volta e, se non va, il messaggio dice il codice vero.
t('registrazione: profilo che non si salva al primo colpo, si riprova; se non va il codice vero nel messaggio', async () => {
  const c = ctx();
  let fails = 1;
  const flaky = async (...a) => { if (fails > 0) { fails--; throw Object.assign(new Error('no'), { code: 'unavailable' }); } return F.dbSet(...a); };
  const u = await make({ dbSet: flaky }).register({ name: 'Gino', email: 'g@b.it', pw: 'abcdef12', pw2: 'abcdef12', about: { birth: 2000, follow: 2, fan: 'vivo' }, adult: true });
  assert.strictEqual(u.name, 'Gino');
  assert.strictEqual(c.fs('users/g@b.it').name, 'Gino');
  const deny = async () => { throw Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' }); };
  let err = null;
  try { await make({ dbSet: deny }).register({ name: 'Ugo', email: 'u@b.it', pw: 'abcdef12', pw2: 'abcdef12', about: {}, adult: true }); } catch (e) { err = e; }
  assert.ok(err && err.code === 'offline', 'errore: ' + (err && err.code));
  assert.ok(/permission-denied/.test(messageOf(err)), 'il messaggio deve dire il codice vero: ' + messageOf(err));
  assert.strictEqual(c.auth().users['u@b.it'], undefined, 'senza profilo l\'account Authentication si toglie');
});

t('registrazione con un account di oggi non ancora passato: Email già registrata', async () => {
  ctx({ docs: { 'users/v@b.it': { email: 'v@b.it', name: 'Edo', pw: 'segreta' } } });
  await assert.rejects(make().register({ name: 'Altro', email: 'v@b.it', pw: 'abcdef12', pw2: 'abcdef12', about: {}, adult: true }), e => e.code === 'exists');
});

t('offline: errore offline e nessun account creato', async () => {
  const c = ctx();
  const A = make();
  c.fake.offline = true;
  await assert.rejects(A.register({ name: 'X', email: 'x@y.it', pw: 'abcdef12', pw2: 'abcdef12', about: {}, adult: true }), e => e.code === 'offline');
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
  await ok.register({ name: 'Fabio', email: 'f@b.it', pw: 'abcdef12', pw2: 'abcdef12', about: {}, adult: true });
  const B = make({ cleanups: [async () => { throw new Error('rete'); }] });
  await B.login('f@b.it', 'abcdef12');
  await assert.rejects(B.deleteAccount('abcdef12'), e => e.code === 'delete-failed');
  assert.ok(c.fs('users/f@b.it'));
  assert.ok(c.auth().users['f@b.it']);
  assert.strictEqual(MESSAGES['delete-failed'], 'Eliminazione non riuscita, controlla la connessione e riprova.');
});

t('eliminazione: password chiesta prima di cancellare; poi via profilo, resets, Authentication e dati del telefono', async () => {
  const c = ctx({ requireRecentLogin: true });
  const seen = [];
  const A = make({ cleanups: [async u => { seen.push(u.email); }] });
  await A.register({ name: 'Fabio', email: 'f@b.it', pw: 'abcdef12', pw2: 'abcdef12', about: {}, adult: true });
  c.fake.setDoc('resets/f@b.it', { code: '123456', exp: 1 });
  F.local.set('bt-blocked', [{ aid: 'u1', name: 'Marco' }]);
  F.local.set('bt-chat-seen-bt-chat-generale', 5);
  await assert.rejects(A.deleteAccount(''), e => e.code === 'need-password');
  await assert.rejects(A.deleteAccount('sbagliata'), e => e.code === 'wrong-password');
  assert.ok(c.fs('users/f@b.it'), 'con la password sbagliata non si cancella niente');
  await A.deleteAccount('abcdef12');
  assert.deepStrictEqual(seen, ['f@b.it']);
  assert.strictEqual(c.fs('users/f@b.it'), undefined);
  assert.strictEqual(c.fs('resets/f@b.it'), undefined);
  assert.strictEqual(c.auth().users['f@b.it'], undefined);
  assert.strictEqual(F.local.get('bt-blocked'), null);
  assert.strictEqual(F.local.get('bt-chat-seen-bt-chat-generale'), null);
  assert.strictEqual(A.current(), null);
  await assert.rejects(A.login('f@b.it', 'abcdef12'), e => e.code === 'not-found');
});

t('accesso con email e password non acceso nella console di Firebase: lo dice (non "errore di connessione")', async () => {
  ctx();
  const off = Object.assign(new Error('off'), { code: 'auth/operation-not-allowed' });
  const A = make({ getAuth: async () => ({ signInWithEmailAndPassword: async () => { throw off; }, createUserWithEmailAndPassword: async () => { throw off; } }) });
  await assert.rejects(A.login('a@b.it', 'x'), e => e.code === 'not-enabled');
  await assert.rejects(A.register({ name: 'F', email: 'f@b.it', pw: 'abcdef12', pw2: 'abcdef12', about: {}, adult: true }), e => e.code === 'not-enabled');
  assert.ok(/non è ancora attivo/.test(MESSAGES['not-enabled']));
});

t('isAdmin solo con il documento admins/<email>', async () => {
  ctx();
  const A = make();
  await A.register({ name: 'Fabio', email: 'f@b.it', pw: 'abcdef12', pw2: 'abcdef12', about: {}, adult: true });
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
  // 14/11: start() risponde subito col profilo dell'ultima volta; quello vero (e admin) arriva appena Firestore risponde.
  await A.retry();
  assert.strictEqual(A.current().loaded, true);
  assert.deepStrictEqual(seen, ['a@b.it', 'a@b.it']);
  assert.strictEqual(A.isAdmin(), true);
});

// Revisione della Fase B (C1): sessione salvata, SDK nella memoria del telefono ma Firestore irraggiungibile.
async function offlineStart({ forget = false } = {}) {
  const first = setupWindow();
  await make().login('a@b.it', 'x');
  if (forget) first.localStorage.removeItem('bt_bt-last-profile');   // telefono senza il profilo messo da parte
  const again = setupWindow({ storage: first.localStorage });   // l'app riaperta senza rete
  again.firebase.__fake.offline = true;
  const A = make();
  await A.start();
  return { A, fake: again.firebase.__fake };
}
t('sessione senza rete e senza profilo sul telefono: nessun nome (mai preso dall\'email)', async () => {
  const { A } = await offlineStart({ forget: true });
  assert.strictEqual(A.current().loaded, false);
  assert.strictEqual(A.current().name, '', 'il nome non deve venire dall\'email: ' + A.current().name);
});
t('sessione senza rete: profilo "non letto", nessun nome preso dall\'email; retry lo legge quando torna la rete', async () => {
  const { A, fake } = await offlineStart();
  const u = A.current();
  assert.strictEqual(u.email, 'a@b.it');
  assert.strictEqual(u.loaded, false);
  // 14/11: il nome è quello dell'ultima volta visto su questo telefono (profilo messo da parte), mai preso dall'email.
  assert.strictEqual(u.name, 'Tester', 'il nome dell\'ultima volta: ' + u.name);
  assert.ok(/^u[0-9a-f]{16}$/.test(u.aid));
  assert.strictEqual(A.isAdmin(), false);
  await A.retry();                       // ancora senza rete: resta non letto
  assert.strictEqual(A.current().loaded, false);
  fake.offline = false;
  const seen = [];
  A.onChange(x => seen.push(x && x.name));
  await A.retry();
  assert.strictEqual(A.current().loaded, true);
  assert.strictEqual(A.current().name, 'Tester');
  assert.strictEqual(A.isAdmin(), true);
  assert.deepStrictEqual(seen, ['Tester']);
  await A.retry();                       // già letto: non fa niente
  assert.deepStrictEqual(seen, ['Tester']);
});
// 18/10 (Edoardo): "se non c'è connessione per molto mi disconnette". L'app riaperta senza rete non riesce a scaricare
// l'SDK di Firebase: prima si vedeva l'accesso; ora si resta dentro con l'account usato l'ultima volta e, tornata la
// rete, si legge la sessione vera.
t('avvio senza rete e senza SDK: si resta dentro con l\'ultimo account; tornata la rete la sessione vera', async () => {
  const first = setupWindow();
  await make().login('a@b.it', 'x');
  setupWindow({ storage: first.localStorage });   // l'app riaperta senza rete: l'SDK non arriva
  let sdk = false;
  const A = make({ getAuth: async () => (sdk ? F.getAuth() : null) });
  await A.start();
  const u = A.current();
  assert.ok(u && u.email === 'a@b.it' && u.loaded === false && u.name === '', 'account ricordato: ' + JSON.stringify(u));
  await A.retry();                       // ancora senza rete
  assert.strictEqual(A.current().loaded, false);
  sdk = true;
  await A.retry();
  assert.strictEqual(A.current().loaded, true);
  assert.strictEqual(A.current().name, 'Tester');
});
t('avvio senza rete e senza SDK: dopo "Esci" (anche senza rete) nessun account ricordato', async () => {
  const first = setupWindow();
  const A0 = make();
  await A0.login('a@b.it', 'x');
  await A0.logout();
  setupWindow({ storage: first.localStorage });
  assert.strictEqual(await make({ getAuth: async () => null }).start(), null, 'dopo Esci non si entra da soli');
  // Esci senza rete: alla prossima apertura con la rete la sessione salvata di Firebase si chiude.
  const w2 = setupWindow();
  await make().login('a@b.it', 'x');
  setupWindow({ storage: w2.localStorage });
  let sdk = false;
  const B = make({ getAuth: async () => (sdk ? F.getAuth() : null) });
  await B.start();
  await B.logout();
  assert.strictEqual(B.current(), null);
  sdk = true;
  setupWindow({ storage: w2.localStorage });
  assert.strictEqual(await make().start(), null, 'uscito senza rete: con la rete non si rientra da soli');
});
t('profilo non letto: nome e "Su di te" non si possono cambiare (non si sovrascrivono quelli veri)', async () => {
  const { A, fake } = await offlineStart();
  await assert.rejects(A.updateAbout({ birth: 2000, follow: 1, fan: 'x' }), e => e.code === 'not-loaded' && e.message === MESSAGES['not-loaded']);
  await assert.rejects(A.updateName('Nuovo'), e => e.code === 'not-loaded');
  fake.offline = false;
  assert.deepStrictEqual(fake.doc('users/a@b.it').about, { birth: null, follow: 2, fan: 'vivo' });
  assert.strictEqual(fake.doc('users/a@b.it').name, 'Tester');
});
t('profilo che manca: nome "Tifoso XXXX", mai la parte dell\'email prima della @', async () => {
  const c = ctx({ users: { 'a@b.it': { pw: 'x', uid: 'uid-a' }, 'zeta.rossi@b.it': { pw: 'zzzzzz', uid: 'uid-z' } } });
  const u = await make().login('zeta.rossi@b.it', 'zzzzzz');
  assert.ok(/^Tifoso [0-9A-F]{4}$/.test(u.name), 'nome: ' + u.name);
  assert.strictEqual(u.loaded, true);
  assert.strictEqual(c.fs('users/zeta.rossi@b.it').name, u.name);
  assert.ok(!/zeta/i.test(JSON.stringify(c.fs('users/zeta.rossi@b.it')).replace(/"email":"[^"]*"/, '')), 'parte dell\'email nel profilo');
});
t('profilo letto ma admins/<email> no: il Pannello Admin arriva al retry', async () => {
  ctx();
  let failAdmin = true;
  const A = make({ dbGet: (col, id) => (col === 'admins' && failAdmin ? Promise.reject(Object.assign(new Error('rete'), { code: 'unavailable' })) : F.dbGet(col, id)) });
  await A.login('a@b.it', 'x');
  assert.strictEqual(A.current().name, 'Tester');
  assert.strictEqual(A.isAdmin(), false);
  failAdmin = false;
  await A.retry();
  assert.strictEqual(A.isAdmin(), true);
});

t('"Su di te" dopo l\'iscrizione: un anno di nascita sotto i 14 anni si rifiuta (minore 5 della revisione)', async () => {
  const c = ctx();
  const A = make();
  await A.login('a@b.it', 'x');
  await assert.rejects(A.updateAbout({ birth: new Date().getFullYear() - 10, follow: 1, fan: 'vivo' }), e => e.code === 'too-young');
  assert.deepStrictEqual(c.fs('users/a@b.it').about, { birth: null, follow: 2, fan: 'vivo' });
});
// 11/10: sul telefono di Edoardo l'accesso diceva sempre "Errore di connessione" con la rete che funzionava. Gli errori
// che non conosciamo diventano "offline": ora il messaggio dice anche il codice vero, per capire cosa succede.
t('errore di Authentication che non conosciamo: "Errore di connessione" con il codice vero', async () => {
  ctx();
  const fail = code => make({ getAuth: async () => ({ signInWithEmailAndPassword: () => Promise.reject(Object.assign(new Error('x'), { code })) }) });
  let e1, e2;
  try { await fail('auth/requests-from-referer-https://localhost-are-blocked.').login('v@b.it', 'x'); } catch (e) { e1 = e; }
  try { await fail('auth/internal-error').login('v@b.it', 'x'); } catch (e) { e2 = e; }
  assert.strictEqual(e1 && e1.code, 'offline');
  assert.strictEqual(messageOf(e1), 'Errore di connessione, riprova tra poco (auth/requests-from-referer-https://localhost-are-blocked.)');
  assert.strictEqual(messageOf(e2), 'Errore di connessione, riprova tra poco (auth/internal-error)');
  assert.strictEqual(messageOf({ code: 'offline' }), 'Errore di connessione, riprova tra poco');   // senza codice come prima
});

t('account disattivato su Firebase: lo dice (non "Errore di connessione")', async () => {
  ctx();
  const A = make({ getAuth: async () => ({ signInWithEmailAndPassword: () => Promise.reject(Object.assign(new Error('x'), { code: 'auth/user-disabled' })) }) });
  await assert.rejects(A.login('a@b.it', 'x'), e => e.code === 'disabled' && e.message === MESSAGES.disabled);
  assert.ok(/disattivato/.test(MESSAGES.disabled));
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
  assert.strictEqual(doc.nick, undefined);   // 31/10: niente nick doppio, basta name
  assert.deepStrictEqual(doc.about, { birth: 1999, follow: 4, fan: 'vroom' });
  assert.strictEqual(A.current().name, 'Edoardo');
  assert.deepStrictEqual(A.current().about, { birth: 1999, follow: 4, fan: 'vroom' });
  assert.ok(/^u[0-9a-f]{16}$/.test(A.current().aid));
});
// Tappa 3 (G16): gli anni da tifoso esatti (years) si salvano accanto alla fascia di oggi (follow, che l'app di oggi legge).
t('"Su di te": gli anni da tifoso esatti (years) restano accanto alla fascia di oggi', async () => {
  const c = ctx({ docs: { 'users/v@b.it': { email: 'v@b.it', name: 'Edo', pw: 'segreta' } } });
  const A = make();
  await A.login('v@b.it', 'segreta');
  await A.updateAbout({ birth: 2001, follow: 3, fan: 'vivo', years: 8 });
  assert.deepStrictEqual(c.fs('users/v@b.it').about, { birth: 2001, follow: 3, fan: 'vivo', years: 8 });
  await A.updateAbout({ birth: 2001, follow: 4, fan: 'vivo', years: '250' });
  assert.strictEqual(c.fs('users/v@b.it').about.years, 99, 'più di 99 anni non vale');
  await A.updateAbout({ birth: 2001, follow: 1, fan: 'vivo', years: 'tanti' });
  assert.deepStrictEqual(c.fs('users/v@b.it').about, { birth: 2001, follow: 1, fan: 'vivo', years: null }, 'senza un numero years è null (con merge non resta quello di prima)');
  await A.updateAbout({ birth: 2001, follow: 2, fan: 'vivo' });
  assert.deepStrictEqual(A.current().about, { birth: 2001, follow: 2, fan: 'vivo' }, 'chi non manda years (l\'app di oggi) non lo tocca');
});

// 13/11 (tester: "accesso lento, si blocca"): dopo Authentication c'erano tre letture una dopo l'altra (profilo, admin,
// poi di nuovo il profilo per i dati personali). Ora profilo e admin partono insieme e il profilo si legge una volta.
// spy: dbGet finto che segna le letture e risponde solo quando lo dice la prova (release).
function spyGet() {
  const calls = [], waiting = [];
  const dbGet = (col, id) => new Promise((res, rej) => { calls.push(col + '/' + id); waiting.push(() => F.dbGet(col, id).then(res, rej)); });
  return { calls, dbGet, release: () => { waiting.splice(0).forEach(go => go()); } };
}
const tick = () => new Promise(r => setTimeout(r, 0));

t('13/11 accesso svelto: profilo e admin si leggono insieme (non uno dopo l\'altro)', async () => {
  ctx({ docs: { 'users/q@b.it': { email: 'q@b.it', name: 'Qui', about: {}, app2: { saved: ['n1'] } }, 'admins/q@b.it': { on: true } }, users: { 'q@b.it': { pw: 'abcdef12', uid: 'uid-q' } } });
  const spy = spyGet();
  const A = make({ dbGet: spy.dbGet });
  const done = A.login('q@b.it', 'abcdef12');
  for (let i = 0; i < 20 && spy.calls.length < 2; i++) await tick();
  assert.deepStrictEqual(spy.calls.slice().sort(), ['admins/q@b.it', 'users/q@b.it'], 'le due letture partono prima che una risponda');
  spy.release();
  const u = await done;
  assert.strictEqual(u.name, 'Qui');
  assert.strictEqual(A.isAdmin(), true);
  assert.deepStrictEqual(u.app2, { saved: ['n1'] }, 'i dati personali arrivano già col profilo');
  assert.strictEqual(spy.calls.length, 2, 'due letture in tutto');
});

t('13/11 iscrizione svelta: il profilo appena scritto non si rilegge', async () => {
  const c = ctx();
  const calls = [];
  const A = make({ dbGet: (col, id) => { calls.push(col + '/' + id); return F.dbGet(col, id); } });
  const u = await A.register({ name: 'Fabio', email: 'f@b.it', pw: 'abcdef12', pw2: 'abcdef12', about: { birth: 1990, birthDate: '1990-05-01', follow: 1, fan: 'vivo' } });
  assert.strictEqual(u.name, 'Fabio');
  assert.strictEqual(u.loaded, true);
  assert.strictEqual(c.fs('users/f@b.it').name, 'Fabio');
  assert.deepStrictEqual(u.about.birthDate, '1990-05-01');
  assert.strictEqual(calls.filter(x => x === 'users/f@b.it').length, 1, 'users/<email> letto una volta sola (per vedere se c\'era già): ' + calls.join(', '));
  assert.strictEqual(calls.filter(x => x === 'admins/f@b.it').length, 1);
});

t('13/11 accesso svelto: senza rete sul profilo resta loaded false e non admin, anche se admins risponde', async () => {
  ctx({ docs: { 'users/q@b.it': { email: 'q@b.it', name: 'Qui', about: {}, app2: {} }, 'admins/q@b.it': { on: true } }, users: { 'q@b.it': { pw: 'abcdef12', uid: 'uid-q' } } });
  const A = make({ dbGet: (col, id) => (col === 'users' ? Promise.reject(Object.assign(new Error('unavailable'), { code: 'unavailable' })) : F.dbGet(col, id)) });
  const u = await A.login('q@b.it', 'abcdef12');
  assert.strictEqual(u.loaded, false);
  assert.strictEqual(u.name, '');
  assert.strictEqual(A.isAdmin(), false);
});

// 14/11 (avvio lento): a ogni avvio, con la sessione salvata, l'app aspettava il profilo da Firestore prima di togliere
// lo splash. Ora il profilo dell'ultima volta resta sul telefono (nome, "su di te", Premium di una volta; mai i dati
// personali): start() risponde subito con quello (loaded: false, quick: true) e il profilo vero arriva appena Firestore
// risponde. Senza profilo sul telefono (o di un altro account) si aspetta come prima.
const QDOCS = { 'users/q@b.it': { email: 'q@b.it', name: 'Qui', about: { fan: 'vivo' }, app2: { saved: ['n1'] } }, 'admins/q@b.it': { on: true } };
const QUSERS = { 'q@b.it': { pw: 'abcdef12', uid: 'uid-q' } };
async function loggedOnce() { ctx({ docs: QDOCS, users: QUSERS }); await make().login('q@b.it', 'abcdef12'); }

t('14/11 avvio svelto: sessione salvata e profilo dell\'ultima volta → start() risponde senza aspettare Firestore, poi arriva quello vero', async () => {
  await loggedOnce();
  const spy = spyGet(), seen = [];
  const A = make({ dbGet: spy.dbGet });
  A.onChange(u => seen.push(u ? [u.name, u.loaded] : null));
  const u = await A.start();                                   // Firestore non ha ancora risposto (spy trattiene le letture)
  assert.strictEqual(u.email, 'q@b.it');
  assert.strictEqual(u.name, 'Qui', 'il nome dell\'ultima volta');
  assert.strictEqual(u.loaded, false, 'profilo non ancora confermato: nome e "su di te" non si cambiano');
  assert.strictEqual(u.quick, true);
  assert.deepStrictEqual(u.app2, {}, 'i dati personali non stanno nella copia');
  assert.strictEqual(A.isAdmin(), false, 'admin solo quando Firestore lo dice');
  spy.release();
  for (let i = 0; i < 30 && !(A.current() && A.current().loaded); i++) await tick();
  assert.strictEqual(A.current().loaded, true);
  assert.deepStrictEqual(A.current().app2, { saved: ['n1'] });
  assert.strictEqual(A.isAdmin(), true);
  assert.deepStrictEqual(seen, [['Qui', false], ['Qui', true]], 'due avvisi: subito, poi col profilo vero');
  assert.strictEqual(spy.calls.filter(x => x === 'users/q@b.it').length, 1, 'profilo letto una volta: ' + spy.calls.join(', '));
});

t('14/11 avvio svelto: retry() mentre il profilo sta arrivando non fa una seconda lettura', async () => {
  await loggedOnce();
  const spy = spyGet();
  const A = make({ dbGet: spy.dbGet });
  await A.start();
  const again = A.retry();
  spy.release();
  await again;
  assert.strictEqual(A.current().loaded, true);
  assert.strictEqual(spy.calls.filter(x => x === 'users/q@b.it').length, 1, spy.calls.join(', '));
});

t('14/11 avvio svelto: senza profilo sul telefono (o di un altro account) si aspetta Firestore come prima', async () => {
  await loggedOnce();
  window.localStorage.removeItem('bt_bt-last-profile');
  let spy = spyGet(), A = make({ dbGet: spy.dbGet }), done = false;
  let st = A.start().then(u => { done = true; return u; });
  for (let i = 0; i < 10; i++) await tick();
  assert.strictEqual(done, false, 'niente copia: start() aspetta');
  spy.release();
  assert.strictEqual((await st).loaded, true);
  // copia di un altro account
  window.localStorage.setItem('bt_bt-last-profile', JSON.stringify({ email: 'altro@b.it', name: 'Altro', about: {}, isPremium: true }));
  spy = spyGet(); A = make({ dbGet: spy.dbGet }); done = false;
  st = A.start().then(u => { done = true; return u; });
  for (let i = 0; i < 10; i++) await tick();
  assert.strictEqual(done, false, 'la copia è di un altro: non si usa');
  spy.release();
  assert.strictEqual((await st).name, 'Qui');
});

t('14/11 avvio svelto: Esci dimentica il profilo sul telefono', async () => {
  await loggedOnce();
  assert.ok(JSON.parse(window.localStorage.getItem('bt_bt-last-profile')).name === 'Qui');
  const A = make(); await A.start(); await A.logout();
  assert.strictEqual(window.localStorage.getItem('bt_bt-last-profile'), null);
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
