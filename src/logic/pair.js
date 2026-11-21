// Collegamento PC ↔ telefono (21/11, piano nel documento claude/f1tv-e-schermo-pc.md). Il PC apre il sito con
// ?schermo (o /schermo) e mostra un QR e 6 cifre; il telefono con l'account scrive il documento pair/<cifre>
// (Firestore) e il PC, che lo legge ogni 2-3 secondi, diventa il Second Screen grande coi riquadri del telefono.
// Solo calcoli: codice, testo del QR, lettura del codice, documento, stato. Prove: test/unit/pair.test.js.

const SITE = "https://bt-app-2.vercel.app";
const CODE_RE = /^[1-9]\d{5}$/;
const CODE_MS = 2 * 60 * 1000;        // il codice sul PC cambia ogni 2 minuti finché nessuno lo usa
const LINK_MS = 12 * 3600 * 1000;     // un collegamento vale 12 ore (una giornata di gara), poi si rifà

const newCode = rand => String(100000 + Math.min(899999, Math.floor(rand() * 900000)));
const qrText = code => `${SITE}/?collega=${code}`;

// Il codice da quello che legge il QR (il nostro link) o da quello che si scrive (6 cifre, anche con spazi).
function parseCode(text) {
  const s = String(text == null ? "" : text).trim();
  if (/^https?:\/\//i.test(s)) {
    try {
      const u = new URL(s);
      if (u.origin !== SITE) return null;
      const c = u.searchParams.get("collega");
      return c && CODE_RE.test(c) ? c : null;
    } catch (e) { return null; }
  }
  const d = s.replace(/\s+/g, "");
  return CODE_RE.test(d) ? d : null;
}

// Dal link della pagina: PC (?schermo o /schermo) o telefono arrivato dal QR (?collega=<cifre>).
function pageMode(loc) {
  const search = (loc && loc.search) || "", path = (loc && loc.pathname) || "/";
  const q = new URLSearchParams(search);
  const pc = q.has("schermo") || /^\/schermo\/?$/.test(path);
  const c = q.get("collega");
  return { pc, link: !pc && c && CODE_RE.test(c) ? c : null };
}

const isObj = v => !!v && typeof v === "object" && !Array.isArray(v);
const plain = v => (isObj(v) ? JSON.parse(JSON.stringify(v)) : null);

// Documento che scrive il telefono: chi è (uid dell'account), se ha il Pro, riquadri del Second Screen.
function claim({ owner, pro, name, layout, prefs, now }) {
  if (typeof owner !== "string" || !owner) throw new Error("serve un account");
  return {
    owner, pro: pro === true, name: typeof name === "string" ? name.slice(0, 30) : "",
    layout: plain(layout), prefs: plain(prefs), at: now, exp: now + LINK_MS, v: 1,
  };
}

// Stato visto dal PC: vale solo un documento scritto dopo che il codice è comparso e non scaduto. Gli orologi del PC e
// del telefono possono essere diversi di minuti, quindi niente confronti tra i due: old è l'"at" del documento che
// c'era già quando il codice è comparso sul PC (null se non c'era), e vale solo un documento con un "at" diverso.
const hasOwner = doc => isObj(doc) && typeof doc.owner === "string" && !!doc.owner;
function status(doc, { old, now }) {
  if (!hasOwner(doc) || (old != null && doc.at === old)) return "attesa";
  return doc.exp > now ? "collegato" : "scaduto";
}

const codeStale = (since, now) => now - since >= CODE_MS;

// Il PC risponde ogni ~10 secondi scrivendo pc = { seen: l'"at" del collegamento che vede, n: battito che cresce, ua:
// il browser }. Il telefono lo dà per collegato se seen è il suo collegamento; per "connessione stabile" guarda col suo
// orologio da quanto n non cambia (ACK_MS).
const ACK_MS = 30 * 1000;
const acked = (doc, claimAt) => hasOwner(doc) && isObj(doc.pc) && doc.pc.seen === claimAt && claimAt != null;
function ackOf(doc, ua) {
  if (!hasOwner(doc)) return null;
  const prev = isObj(doc.pc) && doc.pc.seen === doc.at ? Number(doc.pc.n) || 0 : 0;
  return { seen: doc.at, n: prev + 1, ua: String(ua || "Browser").slice(0, 20) };
}

// "Chrome", "Edge", "Firefox", "Safari" o "Browser": per la scheda "PC collegato" del telefono.
function browserName(ua) {
  const s = String(ua || "");
  if (/Edg\//.test(s)) return "Edge";
  if (/OPR\//.test(s)) return "Opera";
  if (/Firefox\//.test(s)) return "Firefox";
  if (/Chrome\//.test(s)) return "Chrome";
  if (/Safari\//.test(s)) return "Safari";
  return "Browser";
}

// Disposizione dei riquadri letta dal documento (la scrive il telefono, ma il PC non si fida): due colonne di
// riquadri noti, ognuno una volta sola, alti da 1 a 4 mezzi posti, al massimo 4 mezzi posti per colonna.
function cleanLayout(layout, ids, init, units = 4) {
  if (!isObj(layout) || !Array.isArray(layout.left) || !Array.isArray(layout.right)) return init;
  const seen = new Set(), out = {};
  for (const side of ["left", "right"]) {
    let room = units;
    out[side] = [];
    for (const w of layout[side]) {
      if (!isObj(w) || !ids.includes(w.id) || seen.has(w.id) || room < 1) continue;
      const h = Math.max(1, Math.min(units, Math.floor(Number(w.h)) || 1, room));
      seen.add(w.id); out[side].push({ id: w.id, h }); room -= h;
    }
  }
  return out;
}

// Pannelli dello schermo grande (grafica "B&T: Second Screen PC"): li sceglie e li mette in ordine il telefono (campo
// panels del documento). Di serie i 10 della grafica; settori, insights e voto si possono aggiungere.
const PANELS = ["mappa", "classifica", "quadrante", "telemetria", "meteo", "radio", "gomme", "chat", "trophies", "direzione", "settori", "insights", "voto"];
const PANELS_INIT = PANELS.slice(0, 10);
function cleanPanels(list) {
  if (!Array.isArray(list)) return PANELS_INIT.slice();
  const out = [];
  for (const id of list) if (PANELS.includes(id) && !out.includes(id)) out.push(id);
  return out;
}
const togglePanel = (list, id) => (!PANELS.includes(id) ? list : list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
function movePanel(list, id, dir) {
  const i = list.indexOf(id), j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return list;
  const out = list.slice();
  out[i] = list[j]; out[j] = id;
  return out;
}

module.exports = { PANELS, PANELS_INIT, cleanPanels, togglePanel, movePanel, SITE, CODE_RE, CODE_MS, LINK_MS, ACK_MS, newCode, qrText, parseCode, pageMode, claim, status, codeStale, acked, ackOf, browserName, cleanLayout };
