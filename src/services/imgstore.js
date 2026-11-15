// Foto delle notizie sul telefono (14/11, Edoardo: "rendi più veloce il caricamento delle foto delle news").
// Ogni foto caricata dall'admin è un documento di Firestore (shared/img-<id>, fino a 600 KB) e prima stava solo in
// memoria: a ogni apertura dell'app si riscaricavano tutte (lente, e ognuna è una lettura di Firestore). Una foto non
// cambia mai (ogni caricamento ha un id nuovo), quindi si tiene sul telefono in IndexedDB e dalla seconda volta si apre
// subito. Al massimo `max` foto: quando sono troppe esce quella vista meno di recente. Se IndexedDB non c'è o si rompe,
// non succede niente (si scarica come prima).

// 15/11 (Edoardo: "le immagini a seconda della dimensione che devono ricoprire scaricate in qualità inferiore o
// normale"): ogni foto ha due copie leggere, "s" (lato lungo 400 px: miniature delle liste, Salvati, chat) e "m"
// (800 px: l'ultima notizia in grande); la foto intera (fino a 1080x1350) solo dentro la notizia aperta.
// imgLevel: larghezza sullo schermo in px CSS → copia ("s" | "m"), null = foto intera.
const IMG_LEVELS = { s: { px: 400, q: 0.6 }, m: { px: 800, q: 0.68 } };
const imgLevel = w => (!(w > 0) ? null : w <= 200 ? "s" : w <= 440 ? "m" : null);
// Misure della copia leggera (lato lungo = px del livello); null se la foto è già abbastanza piccola.
function shrinkSize(w0, h0, level) {
  const L = IMG_LEVELS[level];
  if (!L || !(w0 > 0) || !(h0 > 0)) return null;
  const k = L.px / Math.max(w0, h0);
  return k >= 1 ? null : { w: Math.max(1, Math.round(w0 * k)), h: Math.max(1, Math.round(h0 * k)) };
}

const isRef = k => typeof k === "string" && /^fsimg:[A-Za-z0-9_-]{1,60}$/.test(k);
const isData = v => typeof v === "string" && /^data:image\/[a-z+.-]+;base64,/.test(v);

// Negozio di prova (e per i telefoni senza IndexedDB nelle prove): una mappa.
function memoryBackend() {
  const m = new Map();
  return {
    get: k => Promise.resolve(m.has(k) ? m.get(k) : undefined),
    set: (k, v) => { m.set(k, v); return Promise.resolve(); },
    del: k => { m.delete(k); return Promise.resolve(); },
    keys: () => Promise.resolve([...m.keys()]),
    all: () => Promise.resolve([...m.entries()]),
  };
}

// IndexedDB del telefono: database "bt-img", tabella "foto", valori { data, at }.
function idbBackend(indexedDB) {
  if (!indexedDB) return null;
  let dbP = null;
  const db = () => (dbP = dbP || new Promise((res, rej) => {
    const r = indexedDB.open("bt-img", 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains("foto")) r.result.createObjectStore("foto"); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => { dbP = null; rej(r.error || new Error("idb")); };
  }));
  const run = (mode, fn) => db().then(d => new Promise((res, rej) => {
    const tx = d.transaction("foto", mode), st = tx.objectStore("foto");
    const req = fn(st);
    tx.oncomplete = () => res(req ? req.result : undefined);
    tx.onerror = tx.onabort = () => rej(tx.error || new Error("idb"));
  }));
  return {
    get: k => run("readonly", st => st.get(k)),
    set: (k, v) => run("readwrite", st => st.put(v, k)),
    del: k => run("readwrite", st => st.delete(k)),
    keys: () => run("readonly", st => st.getAllKeys()),
    all: () => db().then(d => new Promise((res, rej) => {
      const out = [], tx = d.transaction("foto", "readonly"), cur = tx.objectStore("foto").openCursor();
      cur.onsuccess = () => { const c = cur.result; if (c) { out.push([c.key, c.value]); c.continue(); } };
      tx.oncomplete = () => res(out);
      tx.onerror = () => rej(tx.error || new Error("idb"));
    })),
  };
}

function createImgStore({ backend = () => idbBackend(typeof window !== "undefined" ? window.indexedDB : null), now = () => Date.now(), max = 200 } = {}) {   // 15/11: 200 (ci sono anche le copie leggere)
  let b;
  const B = () => { if (b === undefined) { try { b = backend() || null; } catch (e) { b = null; } } return b; };
  // Ogni chiamata al negozio è protetta: se manca o lancia un errore, vale come "niente".
  const quiet = fn => { try { return Promise.resolve(fn()).catch(() => undefined); } catch (e) { return Promise.resolve(undefined); } };
  async function get(key) {
    const s = B();
    if (!s || !isRef(key)) return null;
    const v = await quiet(() => s.get(key));
    if (!v || !isData(v.data)) return null;
    quiet(() => s.set(key, { data: v.data, at: now() }));   // vista adesso: resta tra le più recenti
    return v.data;
  }
  async function put(key, data) {
    const s = B();
    if (!s || !isRef(key) || !isData(data)) return;
    await quiet(() => s.set(key, { data, at: now() }));
    const all = await quiet(() => s.all());
    if (!Array.isArray(all) || all.length <= max) return;
    const old = all.sort((x, y) => ((x[1] && x[1].at) || 0) - ((y[1] && y[1].at) || 0)).slice(0, all.length - max);
    for (const [k] of old) await quiet(() => s.del(k));
  }
  async function drop(key) {
    const s = B();
    if (s && isRef(key)) await quiet(() => s.del(key));
  }
  return { get, put, drop };
}

module.exports = { createImgStore, memoryBackend, idbBackend, IMG_LEVELS, imgLevel, shrinkSize };
