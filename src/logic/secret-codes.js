// Codici del terminale del Box (14/11, Edoardo): il bottone ADMIN lo vedono tutti; il codice admin apre il pannello
// solo a un account admin (Firestore, admins/<email>), altri codici sbloccano cose diverse su questo telefono.
// Sicurezza: il codice admin non sta qui (lo passa l'app) e su un account non admin risponde come un codice sbagliato,
// così il terminale non dice mai che era giusto. Dopo 5 codici sbagliati di fila il terminale si chiude per 30 secondi.
// Il pannello admin resta protetto da Firestore: anche indovinando il codice, senza admins/<email> non si apre.

const norm = s => String(s == null ? "" : s).toUpperCase().replace(/[^A-Z0-9]/g, "");

// Sblocchi: cose vere dell'app. on/off = cosa scrive il terminale quando si accende o si spegne.
const UNLOCKS = [
  { id: "pitswipe", code: "PITWALL", title: "Pit Swipe", on: "Pit Swipe acceso su questo telefono: le notizie come carte da scorrere, in Home.", off: "Pit Swipe spento su questo telefono." },
  { id: "telemetry", code: "TELEMETRIA", title: "Telemetria", on: "Telemetria del telefono in fondo al terminale.", off: "Telemetria nascosta." },
  { id: "retro", code: "1950", title: "Modalità 1950", on: "Modalità 1950: l'app in bianco e nero, come il primo Mondiale.", off: "Modalità 1950 spenta: tornano i colori." },
];
// 14/11 (Edoardo): azioni (non si accendono e non si contano): 01 video di presentazione, 02 giro guidato dell'app.
const ACTIONS = [
  { id: "video", code: "01", title: "Video di presentazione", say: "riproduzione: il video di presentazione dell'app" },
  { id: "tour", code: "02", title: "Giro guidato", say: "avvio del giro guidato dell'app..." },
  // 15/11: gara di prova (DEMO) già al 5° giro, a velocità 30x
  { id: "demo", code: "03", title: "Gara demo dal 5° giro", say: "avvio della gara di prova: dal 5° giro, velocità 30x" },
];
const BY_CODE = new Map(UNLOCKS.map(u => [u.code, u]));
const ACTION_BY_CODE = new Map(ACTIONS.map(a => [a.code, a]));
const IDS = new Set(UNLOCKS.map(u => u.id));

// 15/11 (Edoardo): codici aggiunti dall'admin nel Pannello (shared/bt-terminal-codes). Fanno scrivere un messaggio nel
// terminale e al massimo una delle azioni di sopra (video, giro guidato, gara demo): non sbloccano niente, tanto meno
// cose a pagamento. I codici di serie e il codice admin vincono sempre (e il codice admin non si scopre da qui).
const CUSTOM_ACTIONS = ["", "video", "tour", "demo"];
const CUSTOM_MAX = 30, CODE_MAX = 16, TITLE_MAX = 40, SAY_MAX = 200;
const isBuiltin = (c, adminCode) => BY_CODE.has(c) || ACTION_BY_CODE.has(c) || (!!adminCode && c === norm(adminCode));
function cleanCustom(list) {
  const out = [], seen = new Set();
  (Array.isArray(list) ? list : []).forEach(x => {
    if (!x || typeof x !== "object" || out.length >= CUSTOM_MAX) return;
    const code = norm(x.code).slice(0, CODE_MAX);
    const title = typeof x.title === "string" ? x.title.trim().slice(0, TITLE_MAX) : "";
    const say = typeof x.say === "string" ? x.say.trim().slice(0, SAY_MAX) : "";
    if (code.length < 2 || !title || isBuiltin(code) || seen.has(code)) return;
    seen.add(code);
    out.push({ code, title, say, action: CUSTOM_ACTIONS.includes(x.action) ? x.action : "", at: Number(x.at) || 0 });
  });
  return out;
}
// Perché un codice nuovo non va: "corto" | "serie" (di serie o admin, senza dire quale) | "doppio" | null (va bene).
function takenWhy(input, { adminCode, custom = [] } = {}) {
  const c = norm(input).slice(0, CODE_MAX);
  if (c.length < 2) return "corto";
  if (isBuiltin(c, adminCode)) return "serie";
  return cleanCustom(custom).some(x => x.code === c) ? "doppio" : null;
}

const MAX_FAILS = 5, LOCK_MS = 30000;
const freshGuard = () => ({ fails: 0, until: 0 });
const cleanGuard = g => (g && Number.isInteger(g.fails) && g.fails >= 0 && Number.isFinite(g.until) ? { fails: g.fails, until: g.until } : freshGuard());
const lockedFor = (guard, now) => Math.max(0, cleanGuard(guard).until - now);
// Dopo un tentativo: giusto → da capo; sbagliato → un errore in più, al quinto si chiude per 30 secondi.
function afterTry(guard, ok, now) {
  const g = cleanGuard(guard);
  if (ok) return freshGuard();
  const fails = (g.until && g.until <= now ? 0 : g.fails) + 1;
  return fails >= MAX_FAILS ? { fails, until: now + LOCK_MS } : { fails, until: 0 };
}

// Che cosa fa un codice: admin | action (id) | unlock (id) | custom (codice dell'admin) | denied | locked (ms) | empty.
function check(input, { adminCode, isAdmin = false, guard = null, now = Date.now(), custom = [] } = {}) {
  const c = norm(input);
  if (!c) return { kind: "empty" };
  const ms = lockedFor(guard, now);
  if (ms > 0) return { kind: "locked", ms };
  if (adminCode && c === norm(adminCode)) return isAdmin ? { kind: "admin" } : { kind: "denied" };
  const act = ACTION_BY_CODE.get(c);
  if (act) return { kind: "action", id: act.id };
  const u = BY_CODE.get(c);
  if (u) return { kind: "unlock", id: u.id };
  const cu = cleanCustom(custom).find(x => x.code === c);
  return cu ? { kind: "custom", code: cu.code, title: cu.title, say: cu.say, action: cu.action } : { kind: "denied" };
}

const clean = list => (Array.isArray(list) ? [...new Set(list.filter(x => IDS.has(x)))] : []);
const toggle = (list, id) => { const l = clean(list); return l.includes(id) ? l.filter(x => x !== id) : [...l, id]; };
const unlockOf = id => UNLOCKS.find(u => u.id === id) || null;
const actionOf = id => ACTIONS.find(a => a.id === id) || null;

module.exports = { UNLOCKS, ACTIONS, actionOf, CUSTOM_ACTIONS, CUSTOM_MAX, cleanCustom, takenWhy, MAX_FAILS, LOCK_MS, norm, check, freshGuard, cleanGuard, lockedFor, afterTry, clean, toggle, unlockOf };
