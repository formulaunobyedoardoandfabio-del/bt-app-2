// Servizio Firebase della nuova app: Firestore e Authentication con l'SDK "compat" 10.12.0, come l'app di oggi
// (bt-app-flutter/src/App.jsx, righe 148-455), con queste differenze (B1, B7 di docs/riferimenti/confronto-app-oggi-2.0.md):
// - se window.firebase c'è già (per esempio il Firebase finto delle prove) si usa quello e non si scarica niente;
// - senza Firebase le letture condivise (sg) danno null e tutte le scritture rifiutano con {code: "offline"}:
//   niente più account, notizie o messaggi salvati solo sul telefono;
// - gli errori di scrittura arrivano a chi chiama (ss non li inghiotte più) e una scrittura che non risponde in
//   20 secondi rifiuta con {code: "timeout"};
// - getAuth carica anche firebase-auth-compat.js.
// I documenti restano nel formato di oggi: un array diventa {__arr: [...]}, set con {merge: true}, giro JSON in ss.
const FIREBASE_CONFIG = {
  // Copiata da Edoardo dalla console di Firebase l'11/10: quella dell'app di oggi aveva 38 caratteri (Authentication
  // la rifiutava con "auth/api-key-not-valid"; Firestore non la controlla e per questo l'app di oggi funziona).
  apiKey: "AIzaSyBwZFyFM5fBCZCJfPblxb88suIqhSgqvN4",
  authDomain: "bt-app-50703.firebaseapp.com",
  projectId: "bt-app-50703",
  storageBucket: "bt-app-50703.firebasestorage.app",
  messagingSenderId: "296289249228",
  appId: "1:296289249228:web:7235199f3d0c85c1ba9f69",
  measurementId: "G-31NCNKY75E",
};
const SDK = "https://www.gstatic.com/firebasejs/10.12.0/";
const WRITE_TIMEOUT = 20000;

const W = () => (typeof window !== "undefined" ? window : globalThis);
const mkErr = (code, message) => Object.assign(new Error(message || code), { code });
const clone = v => JSON.parse(JSON.stringify(v));
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
function withTimeout(p, ms, code = "timeout") {
  let timer;
  return Promise.race([p, new Promise((_, rej) => { timer = setTimeout(() => rej(mkErr(code)), ms); })]).finally(() => clearTimeout(timer));
}

// ── Rete ─────────────────────────────────────────────────────────────
let online = true;
const NET_CODES = ["unavailable", "auth/network-request-failed", "deadline-exceeded", "offline", "timeout"];
function track(p) {
  return p.then(v => { online = true; return v; }, e => { if (e && NET_CODES.includes(e.code)) online = false; throw e; });
}
const isOnline = () => online;

// Script dell'SDK da gstatic. Revisione della Fase B (I2 e minore 3): chi chiede lo stesso script mentre arriva aspetta
// la stessa richiesta (all'avvio lo chiedono in tanti insieme); se non arriva entro SCRIPT_TIMEOUT (rete bloccata,
// Wi-Fi con la pagina di accesso) rifiuta "offline", così l'accesso dice "Errore di connessione" invece di restare fermo.
const SCRIPT_TIMEOUT = 15000;
const scriptLoads = new Map();   // indirizzo → promessa del caricamento in corso
function loadScript(src, timeoutMs = SCRIPT_TIMEOUT) {
  const doc = W().document;
  if (!doc || !doc.createElement) return Promise.reject(mkErr("offline", "niente document: script non caricabile"));
  const old = doc.querySelector(`script[src="${src}"]`);
  if (old && old.dataset.ok === "1") return Promise.resolve();
  if (scriptLoads.has(src)) return scriptLoads.get(src);
  const p = new Promise((res, rej) => {
    if (old) old.remove();                       // un tentativo andato male: si riprova da capo
    const s = doc.createElement("script");
    let timer = null;
    const done = ok => {
      clearTimeout(timer); s.onload = s.onerror = null; scriptLoads.delete(src);
      if (ok) { s.dataset.ok = "1"; res(); } else { s.remove(); rej(mkErr("offline", "script non caricato: " + src)); }
    };
    s.onload = () => done(true);
    s.onerror = () => done(false);
    timer = setTimeout(() => done(false), timeoutMs);
    s.src = src;
    doc.head.appendChild(s);
  });
  scriptLoads.set(src, p);
  return p;
}

// ── Firebase ─────────────────────────────────────────────────────────
let fb = null, db = null, auth = null;
async function firebaseApp(extra) {
  const w = W();
  if (!w.firebase) {
    await loadScript(SDK + "firebase-app-compat.js");
    await Promise.all(["firebase-firestore-compat.js", ...(extra ? [extra] : [])].map(f => loadScript(SDK + f)));
  } else if (extra && !w.firebase.auth) {
    await loadScript(SDK + extra);
  }
  if (!w.firebase) throw mkErr("offline", "Firebase non caricato");
  if (!w.firebase.apps.length) w.firebase.initializeApp(FIREBASE_CONFIG);
  if (fb !== w.firebase) { fb = w.firebase; db = null; auth = null; }   // un altro Firebase (le prove lo cambiano)
  return fb;
}
async function getDb() {
  try {
    const f = await firebaseApp();
    if (!db) db = f.firestore();
    online = true;
    return db;
  } catch (e) { online = false; return null; }
}
async function getAuth() {
  try {
    const f = await firebaseApp("firebase-auth-compat.js");
    if (!auth) auth = f.auth();
    online = true;
    return auth;
  } catch (e) { online = false; return null; }
}
async function needDb() {
  const d = await getDb();
  if (!d) throw mkErr("offline", "Firebase non raggiungibile");
  return d;
}

// ── Dati solo del telefono (come oggi: prefisso "bt_", JSON) ─────────
const local = {
  get(k) { try { const v = W().localStorage.getItem("bt_" + k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
  set(k, v) { try { W().localStorage.setItem("bt_" + k, JSON.stringify(v)); } catch (e) {} },
  // 14/11: come set ma scrive il testo già pronto e dice se è riuscita (spazio del telefono finito → false).
  putRaw(k, text) { try { W().localStorage.setItem("bt_" + k, text); return true; } catch (e) { return false; } },
  getRaw(k) { try { return W().localStorage.getItem("bt_" + k); } catch (e) { return null; } },
  del(k) { try { W().localStorage.removeItem("bt_" + k); } catch (e) {} },
};

// ── Documenti condivisi: shared/<chiave> ─────────────────────────────
const listOf = v => (Array.isArray(v) ? v : (v && Array.isArray(v.__arr) ? v.__arr : []));
async function ss(k, v, shared = true) {
  if (!shared) { local.set(k, v); return; }
  const d = await needDb();
  const payload = Array.isArray(v) ? { __arr: v } : v;
  await track(withTimeout(d.collection("shared").doc(k).set(clone(payload), { merge: true }), WRITE_TIMEOUT));
}
// Come sg, ma senza rete (o senza Firebase) lancia l'errore: così chi legge distingue "il documento non c'è" (null)
// da "non si è potuto leggere".
async function sgStrict(k) {
  const d = await needDb();
  const snap = await track(d.collection("shared").doc(k).get());
  if (!snap.exists) return null;
  const data = snap.data();
  return data && data.__arr !== undefined ? data.__arr : data;
}
async function sg(k, shared = true) {
  if (!shared) return local.get(k);
  try { return await sgStrict(k); } catch (e) { return null; }
}
async function sd(k, shared = false) {
  if (!shared) { local.del(k); return; }
  const d = await needDb();
  await track(withTimeout(d.collection("shared").doc(k).delete(), WRITE_TIMEOUT));
}
// Aggiunge un elemento senza riscrivere la lista (atomico, come oggi).
async function sharedAppend(k, item) {
  const d = await needDb();
  const FieldValue = W().firebase.firestore.FieldValue;
  await track(withTimeout(d.collection("shared").doc(k).set({ __arr: FieldValue.arrayUnion(clone(item)) }, { merge: true }), WRITE_TIMEOUT));
}
// Come sharedAppend, per un documento di un'altra raccolta (1/11: voti di Pit Swipe in fanta/pitswipe-voti).
async function docAppend(col, id, item) {
  const d = await needDb();
  const FieldValue = W().firebase.firestore.FieldValue;
  await track(withTimeout(d.collection(col).doc(id).set({ __arr: FieldValue.arrayUnion(clone(item)) }, { merge: true }), WRITE_TIMEOUT));
}
// Toglie dalla lista gli elementi per cui drop(x) è vero (transazione, come oggi).
async function sharedRemoveWhere(k, drop) {
  const d = await needDb();
  const ref = d.collection("shared").doc(k);
  await track(withTimeout(d.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    const arr = listOf(snap.data()), next = arr.filter(x => !drop(x));
    if (next.length !== arr.length) tx.set(ref, { __arr: next }, { merge: true });
  }), WRITE_TIMEOUT));
}

// ── Altre raccolte: users/<email>, admins/<email>, resets/<email> ────
// Senza Firebase anche la lettura rifiuta con "offline": così un accesso senza rete non diventa "Account non trovato".
async function dbGet(col, id) {
  const d = await needDb();
  const snap = await track(d.collection(col).doc(id).get());
  return snap.exists ? snap.data() : null;
}
// remove: campi da togliere dal documento nella stessa scrittura (FieldValue.delete), per esempio la vecchia pw.
// fields (14/11): percorsi ("app2.squad") da scrivere ognuno INTERO, lasciando com'è il resto del documento. Con merge
// semplice Firestore fonde le mappe in profondità e una chiave tolta (un pilota venduto) non sparisce mai.
async function dbSet(col, id, data, { remove = [], fields = null } = {}) {
  const d = await needDb();
  const payload = clone(data);
  if (remove.length) { const FieldValue = W().firebase.firestore.FieldValue; remove.forEach(f => { payload[f] = FieldValue.delete(); }); }
  const opts = Array.isArray(fields) && fields.length ? { mergeFields: fields.concat(remove) } : { merge: true };
  await track(withTimeout(d.collection(col).doc(id).set(payload, opts), WRITE_TIMEOUT));
}
async function dbDelete(col, id) {
  const d = await needDb();
  await track(withTimeout(d.collection(col).doc(id).delete(), WRITE_TIMEOUT));
}
// Documenti di una raccolta con field == value: [{id: nome del documento, data}] (serve a cancellare i feedback di un
// account). I dati stanno a parte: anche un feedback ha un campo id, che non è il nome del documento.
async function dbQuery(col, field, value, limit) {
  const d = await needDb();
  let q = d.collection(col).where(field, "==", value);
  if (limit) q = q.limit(limit);
  const snap = await track(q.get());
  return snap.docs.map(x => ({ id: x.id, data: x.data() }));
}

// ── Foto (notizie, copertine, piloti): una per documento shared/img-<id> {data, ts} ──
// Niente Firebase Storage: il bucket funziona solo col piano Blaze, che chiede la carta di credito.
const IMG_REF = "fsimg:";
const IMG_MAX_CHARS = 600000;     // foto compressa (base64): ben sotto il limite di 1 MB per documento
const imgCache = new Map();       // riferimento → promessa del data URL
// 14/11: le foto si tengono anche sul telefono (IndexedDB): dalla seconda apertura dell'app non si riscaricano.
const { createImgStore, imgLevel, shrinkSize, IMG_LEVELS } = require("./imgstore");
let phoneImgs = null;
const imgStore = () => (phoneImgs = phoneImgs || createImgStore({ backend: () => { const w = W(); return w && w.indexedDB ? require("./imgstore").idbBackend(w.indexedDB) : null; } }));
function readAsDataURL(file) {
  return new Promise((res, rej) => { const r = new (W().FileReader)(); r.onload = () => res(r.result); r.onerror = () => rej(mkErr("lettura")); r.readAsDataURL(file); });
}
function decodeImage(src) {
  return new Promise((res, rej) => { const i = new (W().Image)(); i.onload = () => res(i); i.onerror = () => rej(mkErr("formato")); i.src = src; });
}
// Ridimensiona (al massimo 1080×1350) e comprime in JPEG finché la foto non sta sotto IMG_MAX_CHARS.
async function compressImage(file) {
  if (file && file.type && !/^image\//.test(file.type)) throw mkErr("formato");
  const img = await decodeImage(await readAsDataURL(file));
  const w0 = img.naturalWidth, h0 = img.naturalHeight;
  if (!w0 || !h0) throw mkErr("formato");
  const fit = Math.min(1, 1080 / w0, 1350 / h0);
  const c = W().document.createElement("canvas"), g = c.getContext("2d");
  for (const [k, q] of [[1, 0.8], [1, 0.68], [0.8, 0.62], [0.64, 0.58], [0.5, 0.52], [0.36, 0.5]]) {
    c.width = Math.max(1, Math.round(w0 * fit * k)); c.height = Math.max(1, Math.round(h0 * fit * k));
    g.fillStyle = "#000"; g.fillRect(0, 0, c.width, c.height);   // PNG trasparenti: sfondo nero come l'app
    g.drawImage(img, 0, 0, c.width, c.height);
    const out = c.toDataURL("image/jpeg", q);
    if (out.length <= IMG_MAX_CHARS) return out;
  }
  throw mkErr("troppo-grande");
}
// 15/11: copia leggera di una foto (livello "s" o "m", src/services/imgstore.js); se è già piccola, la stessa foto.
async function shrinkData(data, level) {
  const img = await decodeImage(data);
  const z = shrinkSize(img.naturalWidth, img.naturalHeight, level);
  if (!z) return data;
  const c = W().document.createElement("canvas"), g = c.getContext("2d");
  c.width = z.w; c.height = z.h;
  g.fillStyle = "#000"; g.fillRect(0, 0, c.width, c.height);
  g.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", IMG_LEVELS[level].q);
}
async function uploadImage(file) {
  const data = await compressImage(file);
  const d = await needDb();
  const id = newId();
  await track(withTimeout(d.collection("shared").doc("img-" + id).set({ data, ts: Date.now() }), WRITE_TIMEOUT));
  const ref = IMG_REF + id;
  imgCache.set(ref, Promise.resolve(data));
  imgStore().put(ref, data);
  // 15/11: anche le copie leggere (shared/img-<id>-s e -m), così liste e miniature scaricano pochi KB.
  // Se non riescono non importa: il telefono le fa da solo dalla foto intera.
  await Promise.all(Object.keys(IMG_LEVELS).map(async lv => {
    try {
      const t = await shrinkData(data, lv);
      imgCache.set(ref + "-" + lv, Promise.resolve(t));
      imgStore().put(ref + "-" + lv, t);
      await track(withTimeout(d.collection("shared").doc("img-" + id + "-" + lv).set({ data: t, ts: Date.now() }), WRITE_TIMEOUT));
    } catch (e) { /* niente copia leggera: va bene lo stesso */ }
  }));
  return ref;
}
// 15/11: w = larghezza sullo schermo (px CSS). Piccola: la copia leggera ("s" o "m") e non la foto intera. Ordine:
// telefono (IndexedDB), memoria, la copia dell'admin su Firestore (shared/img-<id>-<livello>); per le foto di prima
// la si fa qui dalla foto intera, una volta, e resta sul telefono.
function loadImage(ref, w) {
  if (!ref || !String(ref).startsWith(IMG_REF)) return Promise.resolve(ref || "");
  const lv = imgLevel(w);
  if (lv) return loadSmall(ref, lv);
  return loadFull(ref);
}
function loadSmall(ref, lv) {
  const key = ref + "-" + lv;
  if (!imgCache.has(key)) {
    const id = ref.slice(IMG_REF.length);
    const fromFull = () => loadFull(ref).then(full => (full ? shrinkData(full, lv).catch(() => full) : ""));
    const p = imgStore().get(key).then(hit => {
      if (hit) return hit;
      if (imgCache.has(ref)) return fromFull();   // la foto intera è già qui: niente da scaricare
      return sg("img-" + id + "-" + lv).then(d => (d && d.data) || fromFull(), fromFull);
    }).then(u => { if (u && u !== "") imgStore().put(key, u); return u || ""; });
    imgCache.set(key, p);
    p.then(u => { if (!u) imgCache.delete(key); }, () => imgCache.delete(key));
  }
  return imgCache.get(key);
}
function loadFull(ref) {
  if (!imgCache.has(ref)) {
    // prima il telefono, poi Firestore (e quella scaricata si mette da parte sul telefono)
    const p = imgStore().get(ref).then(hit => hit || sg("img-" + ref.slice(IMG_REF.length)).then(d => {
      const u = (d && d.data) || "";
      if (u) imgStore().put(ref, u);
      return u;
    }));
    imgCache.set(ref, p);
    p.then(u => { if (!u) imgCache.delete(ref); });   // non trovata o senza rete: si riprova la volta dopo
  }
  return imgCache.get(ref);
}
async function dropImage(ref) {
  if (!ref || !String(ref).startsWith(IMG_REF)) return;
  const id = ref.slice(IMG_REF.length);
  imgCache.delete(ref);
  imgStore().drop(ref);
  for (const lv of Object.keys(IMG_LEVELS)) { imgCache.delete(ref + "-" + lv); imgStore().drop(ref + "-" + lv); sd("img-" + id + "-" + lv, true).catch(() => {}); }   // 15/11: anche le copie leggere
  await sd("img-" + id, true);
}

module.exports = {
  FIREBASE_CONFIG, getDb, getAuth, isOnline, loadScript,
  ss, sg, sgStrict, sd, dbGet, dbSet, dbDelete, dbQuery, sharedAppend, docAppend, sharedRemoveWhere, listOf, local,
  IMG_REF, IMG_MAX_CHARS, compressImage, uploadImage, loadImage, dropImage,
};
