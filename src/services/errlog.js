// 15/11 (Edoardo, codice 06 del terminale): gli ultimi errori del telefono, da leggere a schermo senza collegarlo al
// PC: errori della console, eccezioni non prese, richieste di rete fallite (niente risposta o errore del server) e
// salvataggi su Firebase non riusciti. In memoria e sul telefono (localStorage, gli ultimi 40); solo il messaggio
// d'errore, niente altro. Lo stesso errore ripetuto di seguito si conta (n) invece di riempire la lista.
const KEY = "bt-errlog", MAX = 40;

function createErrLog({ storage = null, now = () => Date.now(), max = MAX } = {}) {
  let list = [];
  try { const v = storage && JSON.parse(storage.getItem(KEY) || "[]"); if (Array.isArray(v)) list = v.slice(-max); } catch (e) { list = []; }
  const save = () => { try { if (storage) storage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* telefono pieno: resta in memoria */ } };
  const text = x => {
    if (x == null) return "";
    if (typeof x === "string") return x;
    if (x instanceof Error || (x && typeof x.message === "string")) return (x.code ? x.code + ": " : "") + (x.message || String(x));
    try { return JSON.stringify(x); } catch (e) { return String(x); }
  };
  function add(kind, ...parts) {
    const msg = parts.map(text).join(" ").replace(/\s+/g, " ").trim().slice(0, 300);
    if (!msg) return;
    const last = list[list.length - 1];
    if (last && last.kind === kind && last.msg === msg) { last.n = (last.n || 1) + 1; last.at = now(); }
    else list.push({ kind, msg, at: now(), n: 1 });
    if (list.length > max) list = list.slice(-max);
    save();
  }
  return { add, list: () => list.map(x => ({ ...x })), clear: () => { list = []; save(); } };
}

// Aggancia console.error, gli errori non presi e fetch della finestra (una volta sola). La console continua a scrivere
// come prima; fetch risponde come prima (si segna solo niente risposta o errore del server, non i 404 normali).
function install(w, log) {
  if (!w || w.__btErrLog) return;
  w.__btErrLog = true;
  const c = w.console;
  if (c && typeof c.error === "function") {
    const orig = c.error.bind(c);
    c.error = (...a) => { try { log.add("console", ...a); } catch (e) { /* mai bloccare la console */ } orig(...a); };
  }
  if (w.addEventListener) {
    w.addEventListener("error", e => log.add("errore", e && (e.error || e.message)));
    w.addEventListener("unhandledrejection", e => log.add("promessa", e && e.reason));
  }
  if (typeof w.fetch === "function") {
    const f = w.fetch.bind(w);
    const where = a => String((a && a.url) || a || "").replace(/[?#].*$/, "").slice(0, 120);
    w.fetch = (...a) => f(...a).then(r => { if (r && r.status >= 500) log.add("rete", r.status, where(a[0])); return r; }, e => { log.add("rete", where(a[0]), e); throw e; });
  }
}

module.exports = { createErrLog, install, KEY };
