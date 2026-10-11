// Account della nuova app con Firebase Authentication (email e password): le password le custodisce Firebase, non
// più users/<email>.pw in chiaro come nell'app di oggi (B7 di docs/riferimenti/confronto-app-oggi-2.0.md).
// - Il profilo resta in users/<email>, nel formato di oggi, più "Su di te" (about) e i dati della 2.0 (app2).
// - Gli account di oggi passano da soli ad Authentication al primo accesso con la loro password, che poi si cancella.
// - Admin = esiste il documento admins/<email> (lo crea Edoardo dalla console di Firebase).
// - Gli errori hanno un code; i testi da mostrare sono in MESSAGES (quelli dell'app di oggi dove c'erano).
const FB = require("./firebase");
const C = require("./compat");

const MESSAGES = {
  empty: "Compila tutti i campi",
  "empty-email": "Inserisci la tua email",
  "invalid-email": "Email non valida",
  "wrong-password": "Password errata",
  "not-found": "Account non trovato",
  exists: "Email già registrata",
  weak: "La password deve avere almeno 6 caratteri",
  "weak-old": "La tua password è troppo corta per il nuovo accesso: tocca \"Password dimenticata?\" per sceglierne una nuova.",
  mismatch: "Le password non coincidono",
  offline: "Errore di connessione, riprova tra poco",
  "too-many": "Troppi tentativi: aspetta qualche minuto e riprova.",
  "need-password": "Per eliminare l'account scrivi la tua password.",
  "delete-failed": "Eliminazione non riuscita, controlla la connessione e riprova.",
  "reset-sent": "Ti abbiamo mandato un'email per scegliere una nuova password. Controlla anche lo spam.",
  "not-enabled": "L'accesso con email e password non è ancora attivo su Firebase (Authentication → Metodo di accesso).",
  "need-age": "Conferma di avere almeno 14 anni.",
  "too-young": "Per iscriverti a Sector 4 devi avere almeno 14 anni.",
  "not-loaded": "Il tuo profilo non è ancora arrivato: controlla la connessione e riprova tra poco.",
  disabled: "Questo account è stato disattivato. Per saperne di più scrivi a bt.formula1@gmail.com.",
};
// Età minima per iscriversi, come dice la privacy policy (in Italia 14 anni per i servizi online, D.Lgs. 101/2018).
const MIN_AGE = 14;
// Con "Errore di connessione" si scrive anche il codice vero (raw), quando c'è: sul telefono di Edoardo l'accesso lo
// diceva sempre con la rete che funzionava (11/10), e senza il codice non si capisce cosa risponde Firebase.
const messageOf = e => {
  const m = MESSAGES[(e && e.code) || ""] || MESSAGES.offline;
  return m === MESSAGES.offline && e && e.raw ? `${m} (${String(e.raw).slice(0, 90)})` : m;
};

const mkErr = (code, raw) => Object.assign(new Error(MESSAGES[code] || code), raw ? { code, raw: String(raw) } : { code });
const normEmail = e => String(e || "").trim().toLowerCase();
const NET = ["auth/network-request-failed", "unavailable", "deadline-exceeded", "offline", "timeout", "auth/internal-error"];
const BAD_LOGIN = ["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found", "auth/invalid-login-credentials"];
// Errore di Authentication → code dell'app (quelli non previsti contano come problemi di rete: si può riprovare).
function authErr(e) {
  const c = (e && e.code) || "";
  if (c === "auth/invalid-email") return mkErr("invalid-email");
  if (c === "auth/missing-password") return mkErr("empty");
  if (c === "auth/too-many-requests") return mkErr("too-many");
  if (c === "auth/user-disabled") return mkErr("disabled");
  if (c === "auth/email-already-in-use") return mkErr("exists");
  if (c === "auth/weak-password") return mkErr("weak");
  if (["auth/operation-not-allowed", "auth/configuration-not-found", "auth/admin-restricted-operation"].includes(c)) return mkErr("not-enabled");
  if (BAD_LOGIN.includes(c)) return mkErr("wrong-password");
  return mkErr("offline", c || (e && e.message) || "");
}
const randomPw = () => {
  const a = new Uint8Array(18);
  const cr = (typeof window !== "undefined" && window.crypto) || (typeof globalThis !== "undefined" && globalThis.crypto);
  if (cr && cr.getRandomValues) cr.getRandomValues(a); else for (let i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 256);
  return "Bt" + Array.from(a, b => b.toString(16).padStart(2, "0")).join("");
};
const cleanAbout = a => {
  const x = a && typeof a === "object" ? a : {};
  const birth = Number(x.birth), follow = Number(x.follow);
  return { birth: x.birth == null || x.birth === "" || isNaN(birth) ? null : birth, follow: x.follow == null || isNaN(follow) ? null : follow, fan: x.fan ? String(x.fan) : null };
};

function createAccount({
  getAuth = FB.getAuth, dbGet = FB.dbGet, dbSet = FB.dbSet, dbDelete = FB.dbDelete, local = FB.local, cleanups = [],
  credential = (email, pw) => window.firebase.auth.EmailAuthProvider.credential(email, pw),
  storage = () => (typeof window !== "undefined" ? window.localStorage : null),
} = {}) {
  let current = null, admin = false, started = null, busy = 0;   // busy: accesso, uscita… in corso (li gestiscono loro)
  let adminKnown = false, retrying = null;   // admins/<email> letto davvero; rilettura del profilo in corso
  const listeners = [];
  // Le operazioni sull'account cambiano anche lo stato di Authentication: mentre lavorano, l'ascolto di start() le lascia fare.
  const op = fn => async (...args) => { busy++; try { return await fn(...args); } finally { busy--; } };
  const notify = () => listeners.forEach(cb => { try { cb(current); } catch (e) {} });
  const needAuth = async () => { const a = await getAuth(); if (!a) throw mkErr("offline", "firebase-non-caricato"); return a; };
  // Lettura di users/<email> prima dell'accesso: le regole di Firebase la permettono solo agli account di oggi non
  // ancora passati (quelli con pw) o se il documento non c'è; permission-denied = l'account c'è ed è già passato.
  async function peekUser(email) {
    try { return { doc: await dbGet("users", email) }; }
    catch (e) { if (e && e.code === "permission-denied") return { doc: null, protectedDoc: true }; throw mkErr("offline", "firestore/" + ((e && e.code) || "errore")); }
  }

  async function readAdmin(email) {
    try { admin = !!(await dbGet("admins", email)); adminKnown = true; } catch (e) { admin = false; adminKnown = false; }
  }
  // Dopo l'accesso: profilo (users/<email>) e admin (admins/<email>). Se il profilo manca se ne crea uno minimo.
  // Senza rete (l'account c'è, il profilo no) current ha loaded: false e nessun nome: mai la parte dell'email prima
  // della @, che finirebbe nei messaggi della chat (revisione della Fase B, C1). retry() lo rilegge.
  async function loadProfile(email, uid) {
    let doc;
    try { doc = await dbGet("users", email); } catch (e) { doc = undefined; }
    const aid = C.authorId(email);
    if (doc === undefined) {
      admin = false; adminKnown = false;
      current = { name: "", nick: "", email, about: cleanAbout(null), app2: {}, isPremium: false, aid, uid: uid || null, loaded: false };
      notify();
      return current;
    }
    if (doc === null) {
      const nm = "Tifoso " + aid.slice(1, 5).toUpperCase();
      doc = { name: nm, nick: nm, email, isPremium: false, premium: false, plan: "free", notif: { news: true, live: true, fanta: true }, ts: Date.now(), uid: uid || null, about: cleanAbout(null), app2: {} };
      dbSet("users", email, doc).catch(() => {});
    } else if (doc.pw != null) {
      dbSet("users", email, { migrated: Date.now() }, { remove: ["pw"] }).catch(() => {});   // passaggio rimasto a metà
    }
    await readAdmin(email);
    current = { ...C.profileFromStore(doc), email, aid, uid: uid || doc.uid || null, loaded: true };
    notify();
    return current;
  }
  // Rilegge quello che non si era potuto leggere (profilo o admin), per esempio quando torna la rete.
  function retry() {
    if (!current || busy) return Promise.resolve(current);
    if (current.loaded && adminKnown) return Promise.resolve(current);
    if (!retrying) {
      const u = current;
      retrying = (async () => {
        if (!u.loaded) return loadProfile(u.email, u.uid);
        const before = admin;
        await readAdmin(u.email);
        if (current === u && admin !== before) { current = { ...u }; notify(); }
        return current;
      })().finally(() => { retrying = null; });
    }
    return retrying;
  }

  async function login(email, pw) {
    const em = normEmail(email);
    if (!em || !pw) throw mkErr("empty");
    const auth = await needAuth();
    let res;
    try { res = await auth.signInWithEmailAndPassword(em, pw); }
    catch (e) {
      const err = authErr(e);
      if (err.code !== "wrong-password") throw err;
      // Non c'è in Authentication (o password sbagliata): forse è un account di oggi da far passare.
      const { doc, protectedDoc } = await peekUser(em);
      if (protectedDoc || (doc && doc.pw == null)) throw mkErr("wrong-password");   // già passato
      if (!doc) throw mkErr("not-found");
      if (doc.pw !== pw) throw mkErr("wrong-password");
      try { res = await auth.createUserWithEmailAndPassword(em, pw); }
      catch (e2) {
        const err2 = authErr(e2);
        if (err2.code === "exists") throw mkErr("wrong-password");
        if (err2.code === "weak") throw mkErr("weak-old");
        throw err2;
      }
      const uid = res && res.user ? res.user.uid : null;
      try { await dbSet("users", em, { uid, migrated: Date.now() }, { remove: ["pw"] }); } catch (e3) { /* si riprova al prossimo accesso (loadProfile) */ }
    }
    return loadProfile(em, res && res.user ? res.user.uid : null);
  }

  async function register({ name, email, pw, pw2, about, adult } = {}) {
    const nm = String(name || "").trim(), em = normEmail(email);
    if (!nm || !em || !pw || !pw2) throw mkErr("empty");
    if (pw !== pw2) throw mkErr("mismatch");
    if (String(pw).length < 6) throw mkErr("weak");
    // Età: con l'anno di nascita si controlla quello (anno per anno); in ogni caso serve "Ho almeno 14 anni".
    const birth = about && Number(about.birth);
    if (birth && new Date().getFullYear() - birth < MIN_AGE) throw mkErr("too-young");
    if (adult !== true) throw mkErr("need-age");
    const auth = await needAuth();
    const { doc, protectedDoc } = await peekUser(em);
    if (doc || protectedDoc) throw mkErr("exists");
    let res;
    try { res = await auth.createUserWithEmailAndPassword(em, pw); } catch (e) { throw authErr(e); }
    const uid = res && res.user ? res.user.uid : null;
    const profile = { name: nm, nick: nm, email: em, isPremium: false, premium: false, plan: "free", notif: { news: true, live: true, fanta: true }, ts: Date.now(), uid, about: cleanAbout(about), app2: {} };
    try { await dbSet("users", em, profile); }
    catch (e) {
      // Senza profilo l'account non serve: si toglie, così si può riprovare con la stessa email.
      try { if (auth.currentUser) await auth.currentUser.delete(); } catch (e2) {}
      throw mkErr("offline");
    }
    return loadProfile(em, uid);
  }

  async function resetPassword(email) {
    const em = normEmail(email);
    if (!em) throw mkErr("empty-email");
    const auth = await needAuth();
    const { doc } = await peekUser(em);
    if (doc && doc.pw != null) {
      // Account di oggi non ancora passato: si crea l'account Authentication con una password a caso, si esce subito
      // e l'email di Firebase fa scegliere quella nuova.
      try {
        const res = await auth.createUserWithEmailAndPassword(em, randomPw());
        await dbSet("users", em, { uid: res && res.user ? res.user.uid : null, migrated: Date.now() }, { remove: ["pw"] });
      } catch (e) { if (!e || e.code !== "auth/email-already-in-use") { try { await auth.signOut(); } catch (e2) {} throw authErr(e); } }
      try { await auth.signOut(); } catch (e) {}
    }
    try { await auth.sendPasswordResetEmail(em); } catch (e) { throw authErr(e); }
  }

  async function logout() {
    const auth = await getAuth();
    if (auth) { try { await auth.signOut(); } catch (e) {} }
    current = null; admin = false; adminKnown = false;
    notify();
  }

  // Eliminazione (richiesta da Google Play): prima la password (così Firebase non la chiede a metà), poi le pulizie dei
  // Task 8 e 9, resets/<email>, users/<email>, l'account Authentication e i dati del telefono. Se un passo fallisce
  // prima del profilo, il profilo resta.
  async function deleteAccount(pw) {
    const u = current;
    if (!u) throw mkErr("not-found");
    if (!pw) throw mkErr("need-password");
    const auth = await needAuth();
    const fbUser = auth.currentUser;
    if (!fbUser) throw mkErr("offline");
    try { await fbUser.reauthenticateWithCredential(credential(u.email, pw)); } catch (e) { throw authErr(e); }
    try {
      let timer;
      await Promise.race([
        (async () => { for (const c of cleanups) await c(u); await dbDelete("resets", u.email); await dbDelete("users", u.email); })(),
        new Promise((_, rej) => { timer = setTimeout(() => rej(mkErr("timeout")), 20000); }),
      ]).finally(() => clearTimeout(timer));
    } catch (e) { throw mkErr("delete-failed"); }
    try { await fbUser.delete(); } catch (e) { throw mkErr("delete-failed"); }
    local.del("bt-blocked");
    const ls = storage();
    if (ls) {
      const keys = [];
      for (let i = 0; i < ls.length; i++) { const k = ls.key(i); if (k && k.startsWith("bt_bt-chat-seen-")) keys.push(k); }
      keys.forEach(k => { try { ls.removeItem(k); } catch (e) {} });
    }
    current = null; admin = false; adminKnown = false;
    notify();
  }

  // All'avvio: la sessione salvata da Authentication. Si risolve al primo avviso di onAuthStateChanged (prima di quello
  // currentUser è null anche se c'è una sessione); senza Authentication (niente rete) subito, senza account.
  function start() {
    if (started) return started;
    started = (async () => {
      const auth = await getAuth();
      if (!auth) { current = null; notify(); return null; }
      await new Promise(res => {
        let first = true;
        auth.onAuthStateChanged(async fbUser => {
          if (busy && !first) return;
          const email = fbUser && fbUser.email ? normEmail(fbUser.email) : null;
          if (email && (!current || current.email !== email)) await loadProfile(email, fbUser.uid);
          else if (!email && current) { current = null; admin = false; adminKnown = false; notify(); }
          else if (first && !email) notify();
          if (first) { first = false; res(); }
        });
      });
      return current;
    })();
    return started;
  }

  // Con il profilo non ancora letto (loaded: false) nome e "Su di te" non si cambiano: si scriverebbe sopra quelli veri.
  async function updateName(name) {
    const nm = String(name || "").trim();
    if (current && current.loaded === false) throw mkErr("not-loaded");
    if (!current || !nm) throw mkErr("empty");
    await dbSet("users", current.email, { name: nm, nick: nm });
    current = { ...current, name: nm, nick: nm };
    notify();
  }
  async function updateAbout(about) {
    if (!current) throw mkErr("not-found");
    if (current.loaded === false) throw mkErr("not-loaded");
    const a = cleanAbout(about);
    if (a.birth && new Date().getFullYear() - a.birth < MIN_AGE) throw mkErr("too-young");   // come all'iscrizione
    await dbSet("users", current.email, { about: a });
    current = { ...current, about: a };
    notify();
  }

  return {
    login: op(login), register: op(register), resetPassword: op(resetPassword), logout: op(logout), deleteAccount: op(deleteAccount),
    start, retry, updateName, updateAbout,
    current: () => current,
    isAdmin: () => !!current && admin,
    onChange(cb) { listeners.push(cb); return () => { const i = listeners.indexOf(cb); if (i >= 0) listeners.splice(i, 1); }; },
  };
}

module.exports = { MIN_AGE, MESSAGES, messageOf, normEmail, createAccount };
