// Firebase finto per le prove: la parte dell'API compat 10 (Firestore + Authentication) usata dai servizi dell'app.
// Si carica prima dell'app: i servizi trovano window.firebase e non scaricano niente da gstatic.
// Salva nel localStorage (chiavi bt-fake-fs e bt-fake-auth), quindi i dati restano ricaricando la pagina.
// Dati di partenza: window.__btSeed = { docs, users, freshInstall, requireRecentLogin } (vedi seedDefaults).
// Comandi per le prove: firebase.__fake.offline = true (niente rete), .failWrites = true (scritture rifiutate).
(function (root) {
  if (root.location && /(^|[?&])nofake(&|$)/.test((root.location.search || '').slice(1))) return;

  const FS_KEY = 'bt-fake-fs', AUTH_KEY = 'bt-fake-auth';
  const ls = () => root.localStorage;
  const load = k => { try { return JSON.parse(ls().getItem(k)); } catch (e) { return null; } };
  const save = (k, v) => ls().setItem(k, JSON.stringify(v));
  const clone = v => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
  const normEmail = e => String(e || '').trim().toLowerCase();
  const err = (code, message) => Object.assign(new Error(message || code), { code });
  const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  function seedDefaults() {
    return {
      docs: {
        'users/a@b.it': { name: 'Tester', nick: 'Tester', email: 'a@b.it', about: { birth: null, follow: 2, fan: 'vivo' } },
        'admins/a@b.it': { ruolo: 'admin' },
      },
      users: { 'a@b.it': { pw: 'x', uid: 'uid-a' } },
    };
  }
  // Prima apertura (localStorage vuoto): dati di partenza. Ricaricando la pagina restano quelli salvati.
  (function seed() {
    if (load(FS_KEY) && load(AUTH_KEY)) return;
    const s = root.__btSeed || {}, d = seedDefaults();
    save(FS_KEY, clone(s.docs || d.docs));
    save(AUTH_KEY, { users: clone(s.users || d.users), current: null, resetSent: [], requireRecentLogin: !!s.requireRecentLogin, recent: false });
    if (!s.freshInstall) ls().setItem('bt_bt-terms-accepted', JSON.stringify({ ts: 1 }));
  })();

  const fake = { offline: false, failWrites: false };
  const net = () => { if (fake.offline) throw err('unavailable', 'Failed to get document because the client is offline.'); };
  const netAuth = () => { if (fake.offline) throw err('auth/network-request-failed'); };
  const canWrite = () => { net(); if (fake.failWrites) throw err('unavailable', 'scrittura rifiutata (prova)'); };

  // ── FieldValue.arrayUnion ─────────────────────────────────────────────
  const UNION = '__fakeArrayUnion__';
  const FieldValue = { arrayUnion: (...items) => ({ [UNION]: clone(items) }) };
  // Applica i FieldValue dentro data rispetto al documento attuale (solo arrayUnion, come serve all'app).
  function applyFieldValues(data, cur) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return data;
    const out = {};
    for (const [k, v] of Object.entries(data)) {
      if (v && typeof v === 'object' && UNION in v) {
        const base = Array.isArray(cur && cur[k]) ? clone(cur[k]) : [];
        v[UNION].forEach(it => { if (!base.some(x => sameJson(x, it))) base.push(it); });
        out[k] = base;
      } else if (v && typeof v === 'object' && !Array.isArray(v)) out[k] = applyFieldValues(v, cur && cur[k]);
      else out[k] = v;
    }
    return out;
  }
  // merge: true fonde le mappe chiave per chiave e sostituisce gli array per intero (come Firestore).
  function mergeDeep(cur, val) {
    if (!cur || typeof cur !== 'object' || Array.isArray(cur)) return val;
    const out = clone(cur);
    for (const [k, v] of Object.entries(val)) {
      out[k] = v && typeof v === 'object' && !Array.isArray(v) && cur[k] && typeof cur[k] === 'object' && !Array.isArray(cur[k]) ? mergeDeep(cur[k], v) : v;
    }
    return out;
  }
  const dropUndefined = v => clone(v);   // Firestore compat rifiuta undefined: qui lo togliamo come fa JSON

  // ── Firestore ─────────────────────────────────────────────────────────
  const allDocs = () => load(FS_KEY) || {};
  function snap(path, data) {
    return { id: path.split('/').pop(), exists: data !== undefined, data: () => clone(data), ref: docRef(path) };
  }
  function docRef(path) {
    return {
      id: path.split('/').pop(), path,
      async get() { net(); return snap(path, allDocs()[path]); },
      async set(data, opts) {
        canWrite();
        const all = allDocs(), cur = all[path], val = applyFieldValues(dropUndefined(data), cur);
        all[path] = opts && opts.merge && cur !== undefined ? mergeDeep(cur, val) : val;
        save(FS_KEY, all);
      },
      async update(data) {
        canWrite();
        const all = allDocs();
        if (all[path] === undefined) throw err('not-found', 'No document to update: ' + path);
        all[path] = mergeDeep(all[path], applyFieldValues(dropUndefined(data), all[path]));
        save(FS_KEY, all);
      },
      async delete() { canWrite(); const all = allDocs(); delete all[path]; save(FS_KEY, all); },
    };
  }
  function query(col, conds, lim) {
    return {
      where: (f, op, v) => query(col, [...conds, [f, op, v]], lim),
      limit: n => query(col, conds, n),
      async get() {
        net();
        let rows = Object.entries(allDocs()).filter(([p]) => p.startsWith(col + '/') && p.split('/').length === 2);
        rows = rows.filter(([, d]) => conds.every(([f, op, v]) => {
          if (op !== '==') throw err('unimplemented', 'operatore non supportato dal Firebase finto: ' + op);
          return d && d[f] === v;
        }));
        if (lim) rows = rows.slice(0, lim);
        const docs = rows.map(([p, d]) => snap(p, d));
        return { empty: !docs.length, size: docs.length, docs, forEach: fn => docs.forEach(fn) };
      },
    };
  }
  const collection = c => Object.assign(query(c, [], 0), { doc: id => docRef(c + '/' + id) });
  const db = {
    collection,
    doc: p => docRef(p),
    async runTransaction(fn) {
      net();
      const writes = [];
      const tx = {
        get: ref => ref.get(),
        set: (ref, data, opts) => { writes.push(() => ref.set(data, opts)); return tx; },
        update: (ref, data) => { writes.push(() => ref.update(data)); return tx; },
        delete: ref => { writes.push(() => ref.delete()); return tx; },
      };
      const res = await fn(tx);
      for (const w of writes) await w();
      return res;
    },
  };

  // ── Authentication ────────────────────────────────────────────────────
  const authState = () => load(AUTH_KEY);
  const saveAuth = s => save(AUTH_KEY, s);
  const listeners = [];
  const notify = () => { const u = auth.currentUser; listeners.forEach(cb => { try { cb(u); } catch (e) {} }); };
  function userObj(email) {
    const s = authState(), u = s.users[email];
    if (!u) return null;
    return {
      email, uid: u.uid,
      async delete() {
        netAuth();
        const st = authState();
        if (st.requireRecentLogin && !st.recent) throw err('auth/requires-recent-login');
        delete st.users[email];
        if (st.current === email) st.current = null;
        st.recent = false;
        saveAuth(st); notify();
      },
      async reauthenticateWithCredential(cred) {
        netAuth();
        const st = authState();
        if (!cred || normEmail(cred.email) !== email || !st.users[email] || st.users[email].pw !== cred.password) throw err('auth/invalid-credential');
        st.recent = true; saveAuth(st);
        return { user: userObj(email) };
      },
    };
  }
  const auth = {
    get currentUser() { const s = authState(); return s && s.current ? userObj(s.current) : null; },
    onAuthStateChanged(cb) {
      listeners.push(cb);
      setTimeout(() => { try { cb(auth.currentUser); } catch (e) {} }, 0);
      return () => { const i = listeners.indexOf(cb); if (i >= 0) listeners.splice(i, 1); };
    },
    async signInWithEmailAndPassword(email, pw) {
      netAuth();
      const e = normEmail(email), s = authState(), u = s.users[e];
      if (!u || u.pw !== pw) throw err('auth/invalid-credential');
      s.current = e; s.recent = true; saveAuth(s); notify();
      return { user: userObj(e) };
    },
    async createUserWithEmailAndPassword(email, pw) {
      netAuth();
      const e = normEmail(email), s = authState();
      if (s.users[e]) throw err('auth/email-already-in-use');
      if (!pw || String(pw).length < 6) throw err('auth/weak-password');
      s.users[e] = { pw: String(pw), uid: 'uid-' + Math.random().toString(36).slice(2, 10) };
      s.current = e; s.recent = true; saveAuth(s); notify();
      return { user: userObj(e) };
    },
    async sendPasswordResetEmail(email) {   // come Firebase con la protezione delle email: nessun errore se l'account non c'è
      netAuth();
      const s = authState(), e = normEmail(email);
      if (s.users[e]) { s.resetSent.push(e); saveAuth(s); }
    },
    async signOut() { const s = authState(); s.current = null; s.recent = false; saveAuth(s); notify(); },
  };

  // ── window.firebase ───────────────────────────────────────────────────
  const firebase = {
    apps: [],
    initializeApp(cfg) { const app = { name: '[DEFAULT]', options: cfg || {} }; if (!firebase.apps.length) firebase.apps.push(app); return firebase.apps[0]; },
    firestore: Object.assign(() => db, { FieldValue }),
    auth: Object.assign(() => auth, { EmailAuthProvider: { credential: (email, password) => ({ email, password }) } }),
    __fake: Object.assign(fake, {
      docs: () => allDocs(),
      doc: p => clone(allDocs()[p]),
      authState: () => authState(),
      setDoc: (p, v) => { const all = allDocs(); all[p] = clone(v); save(FS_KEY, all); },
    }),
  };
  root.firebase = firebase;
  if (typeof module === 'object' && module.exports) module.exports = firebase;
})(typeof window !== 'undefined' ? window : globalThis);
