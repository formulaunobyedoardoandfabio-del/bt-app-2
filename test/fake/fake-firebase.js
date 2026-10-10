// Firebase finto per le prove: la parte dell'API compat 10 (Firestore + Authentication) usata dai servizi dell'app.
// Si carica prima dell'app: i servizi trovano window.firebase e non scaricano niente da gstatic.
// Salva nel localStorage (chiavi bt-fake-fs e bt-fake-auth), quindi i dati restano ricaricando la pagina.
// Dati di partenza: window.__btSeed = { docs, addDocs, users, freshInstall, requireRecentLogin } (vedi seedDefaults):
// docs sostituisce i documenti di serie, addDocs si aggiunge a quelli (l'account di prova a@b.it resta).
// Comandi per le prove: firebase.__fake.offline = true (niente rete: le letture falliscono, le scritture restano in
// sospeso finché la rete torna, come in Firestore), .failWrites = true (scritture rifiutate dalle regole: permission-denied).
(function (root) {
  if (root.location && /(^|[?&])nofake(&|$)/.test((root.location.search || '').slice(1))) return;

  const FS_KEY = 'bt-fake-fs', AUTH_KEY = 'bt-fake-auth';
  const ls = () => root.localStorage;
  const load = k => { try { return JSON.parse(ls().getItem(k)); } catch (e) { return null; } };
  const save = (k, v) => ls().setItem(k, JSON.stringify(v));
  const clone = v => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
  const normEmail = e => String(e || '').toLowerCase();   // le email non distinguono maiuscole e minuscole
  const validEmail = e => typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
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
    const st = load(AUTH_KEY);
    if (load(FS_KEY) && st) { if (st.recent) { st.recent = false; save(AUTH_KEY, st); } return; }
    const s = root.__btSeed || {}, d = seedDefaults();
    save(FS_KEY, clone({ ...(s.docs || d.docs), ...(s.addDocs || {}) }));   // addDocs: in più dei documenti di serie
    save(AUTH_KEY, { users: clone(s.users || d.users), current: null, resetSent: [], requireRecentLogin: !!s.requireRecentLogin, recent: false });
    if (!s.freshInstall) ls().setItem('bt_bt-terms-accepted', JSON.stringify({ ts: 1 }));
  })();

  let offline = false;
  const waiters = [];
  const fake = { failWrites: false };
  Object.defineProperty(fake, 'offline', {
    enumerable: true,
    get: () => offline,
    set: v => { offline = !!v; if (!offline) waiters.splice(0).forEach(r => r()); },
  });
  const whenOnline = () => (offline ? new Promise(r => waiters.push(r)) : Promise.resolve());
  const net = () => { if (offline) throw err('unavailable', 'Failed to get document because the client is offline.'); };
  const netAuth = () => { if (offline) throw err('auth/network-request-failed'); };
  // Come Firestore: senza rete la scrittura aspetta la rete; le regole la rifiutano con permission-denied.
  async function canWrite() { await whenOnline(); if (fake.failWrites) throw err('permission-denied', 'Missing or insufficient permissions. (prova)'); }

  // ── FieldValue.arrayUnion e FieldValue.delete ──────────────────────────
  const UNION = '__fakeArrayUnion__', DELETE = '__fakeDelete__';
  const FieldValue = { arrayUnion: (...items) => ({ [UNION]: clone(items) }), delete: () => ({ [DELETE]: true }) };
  const isDel = v => !!v && typeof v === 'object' && v[DELETE] === true;
  const hasDel = v => isDel(v) || (!!v && typeof v === 'object' && !Array.isArray(v) && Object.values(v).some(hasDel));
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
  // merge: true fonde le mappe chiave per chiave e sostituisce gli array per intero; una mappa vuota sostituisce
  // quella che c'era (come Firestore, che la mette nella maschera dei campi).
  const isMap = v => v && typeof v === 'object' && !Array.isArray(v);
  function mergeDeep(cur, val) {
    if (!isMap(cur)) return dropDeletes(val);
    const out = clone(cur);
    for (const [k, v] of Object.entries(val)) {
      if (isDel(v)) { delete out[k]; continue; }    // FieldValue.delete(): il campo sparisce
      out[k] = isMap(v) && Object.keys(v).length && isMap(cur[k]) ? mergeDeep(cur[k], v) : dropDeletes(v);
    }
    return out;
  }
  function dropDeletes(v) {
    if (!isMap(v)) return v;
    const out = {};
    for (const [k, x] of Object.entries(v)) if (!isDel(x)) out[k] = dropDeletes(x);
    return out;
  }
  // Firestore rifiuta undefined, gli array dentro gli array e i documenti oltre 1 MiB (invalid-argument).
  function validate(data, where = 'dato') {
    const walk = (v, inArray) => {
      if (v === undefined) throw err('invalid-argument', `Unsupported field value: undefined (${where})`);
      if (Array.isArray(v)) { if (inArray) throw err('invalid-argument', `Nested arrays are not supported (${where})`); v.forEach(x => walk(x, true)); return; }
      if (v && typeof v === 'object') {
        if (UNION in v) { v[UNION].forEach(x => walk(x, true)); return; }
        if (isDel(v)) return;
        Object.values(v).forEach(x => walk(x, false));
      }
    };
    walk(data, false);
    if (new TextEncoder().encode(JSON.stringify(data)).length > 1048576) throw err('invalid-argument', `Document exceeds maximum size (${where})`);
    return clone(data);
  }
  // Le scritture lavorano su una copia di tutti i documenti (all): una transazione la salva una volta sola alla fine.
  function applySet(all, path, data, opts) {
    // Come Firestore: FieldValue.delete() solo con set({...}, {merge: true}) o con update.
    if (!(opts && opts.merge) && hasDel(data)) throw err('invalid-argument', 'FieldValue.delete() cannot be used with set() unless you pass {merge:true} (' + path + ')');
    const cur = all[path], val = validate(data, path);
    all[path] = opts && opts.merge && cur !== undefined ? mergeDeep(cur, applyFieldValues(val, cur)) : applyFieldValues(val, {});
  }
  function applyUpdate(all, path, data) {
    if (all[path] === undefined) throw err('not-found', 'No document to update: ' + path);
    const val = validate(data, path), doc = clone(all[path]);
    for (const [key, v] of Object.entries(val)) {     // "a.b" è un percorso; senza punto si sostituisce il campo intero
      const parts = key.split('.');
      let node = doc;
      for (const p of parts.slice(0, -1)) { if (!isMap(node[p])) node[p] = {}; node = node[p]; }
      const last = parts[parts.length - 1];
      if (isDel(v)) { delete node[last]; continue; }
      node[last] = applyFieldValues({ x: v }, { x: node[last] }).x;
    }
    all[path] = doc;
  }

  // ── Firestore ─────────────────────────────────────────────────────────
  const allDocs = () => load(FS_KEY) || {};
  function snap(path, data) {
    return { id: path.split('/').pop(), exists: data !== undefined, data: () => clone(data), ref: docRef(path) };
  }
  function docRef(path) {
    return {
      id: path.split('/').pop(), path,
      async get() { net(); return snap(path, allDocs()[path]); },
      async set(data, opts) { const all0 = allDocs(); applySet(all0, path, data, opts); await canWrite(); const all = allDocs(); applySet(all, path, data, opts); save(FS_KEY, all); },
      async update(data) { validate(data, path); await canWrite(); const all = allDocs(); applyUpdate(all, path, data); save(FS_KEY, all); },
      async delete() { await canWrite(); const all = allDocs(); delete all[path]; save(FS_KEY, all); },
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
    async runTransaction(fn) {      // tutto o niente: le scritture si applicano a una copia e si salvano alla fine
      net();
      const writes = [];
      const tx = {
        get: ref => ref.get(),
        set: (ref, data, opts) => { writes.push(all => applySet(all, ref.path, data, opts)); return tx; },
        update: (ref, data) => { writes.push(all => applyUpdate(all, ref.path, data)); return tx; },
        delete: ref => { writes.push(all => { delete all[ref.path]; }); return tx; },
      };
      const res = await fn(tx);
      const all = allDocs();
      writes.forEach(w => w(all));
      if (fake.failWrites) throw err('permission-denied', 'Missing or insufficient permissions. (prova)');
      save(FS_KEY, all);
      return res;
    },
  };

  // ── Authentication ────────────────────────────────────────────────────
  const authState = () => load(AUTH_KEY);
  const saveAuth = s => save(AUTH_KEY, s);
  const listeners = [];
  // Come Firebase: dopo aver ricaricato la pagina currentUser è null finché la sessione salvata non è stata letta,
  // cioè fino al primo avviso di onAuthStateChanged (o a un accesso).
  let ready = false;
  const notify = () => { ready = true; const u = auth.currentUser; listeners.forEach(cb => { try { cb(u); } catch (e) {} }); };
  function checkCredentials(email, pw) {
    if (!validEmail(email)) throw err('auth/invalid-email');
    if (pw === undefined || pw === null || pw === '') throw err('auth/missing-password');
  }
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
    get currentUser() { if (!ready) return null; const s = authState(); return s && s.current ? userObj(s.current) : null; },
    onAuthStateChanged(cb) {
      listeners.push(cb);
      setTimeout(() => { ready = true; try { cb(auth.currentUser); } catch (e) {} }, 0);
      return () => { const i = listeners.indexOf(cb); if (i >= 0) listeners.splice(i, 1); };
    },
    async signInWithEmailAndPassword(email, pw) {
      checkCredentials(email, pw);
      netAuth();
      const e = normEmail(email), s = authState(), u = s.users[e];
      if (!u || u.pw !== pw) throw err('auth/invalid-credential');
      s.current = e; s.recent = true; saveAuth(s); notify();
      return { user: userObj(e) };
    },
    async createUserWithEmailAndPassword(email, pw) {
      checkCredentials(email, pw);
      netAuth();
      const e = normEmail(email), s = authState();
      if (s.users[e]) throw err('auth/email-already-in-use');
      if (!pw || String(pw).length < 6) throw err('auth/weak-password');
      s.users[e] = { pw: String(pw), uid: 'uid-' + Math.random().toString(36).slice(2, 10) };
      s.current = e; s.recent = true; saveAuth(s); notify();
      return { user: userObj(e) };
    },
    async sendPasswordResetEmail(email) {   // come Firebase con la protezione delle email: nessun errore se l'account non c'è
      if (!email) throw err('auth/missing-email');
      if (!validEmail(email)) throw err('auth/invalid-email');
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
