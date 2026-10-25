// Trofei (Tappa 3, G31; prove in test/unit/trophies.test.js). Si vincono con quello che si fa davvero nell'app, letto
// dai dati che l'app ha già: nessun numero inventato. Il trofeo vinto si salva nell'account (trophies: { id: data in
// ms }); la medaglia (bronzo da 1 trofeo, argento da 5, oro da 10) va accanto al nome nei messaggi della chat.
// goal: dove si conta, quanto serve (la bacheca mostra "3 di 5"); secret: si vede come "Trofeo segreto" finché non
// lo si trova. 25/10: nome, testo, obiettivo e "spento" si cambiano da Firebase (shared/bt-trophies, trophyDefs);
// Pit crew in 2,30 secondi o meno (prima sotto i 2,5).
const TROPHIES = [
  { id: "superlicenza", name: "Superlicenza", how: "Completa \"Su di te\" nel Profilo" },
  { id: "casco", name: "Il mio casco", how: "Cambia i colori del tuo casco nel Profilo" },
  { id: "griglia", name: "Griglia completa", how: "Fai la tua squadra del FantaF1: 5 piloti e 2 scuderie" },
  { id: "indovino", name: "Indovino", how: "Indovina 1 previsione del weekend", goal: 1 },
  { id: "oracolo", name: "Oracolo", how: "Indovina 5 previsioni del weekend", goal: 5 },
  { id: "radar", name: "Uomo radar", how: "Indovina 1 pronostico meteo", goal: 1 },
  { id: "sondaggista", name: "Sondaggista", how: "Indovina 1 sondaggio", goal: 1 },
  { id: "pitcrew", name: "Pit crew", how: "Pit Stop Challenge in 2,30 secondi o meno", goal: 2.3 },
  { id: "pitperfetto", name: "Pit stop perfetto", how: "Pit Stop Challenge in 2,00 secondi o meno", goal: 2.0 },
  { id: "mercato", name: "Mercato piloti", how: "Fai 1 previsione della Silly Season" },
  { id: "pagellone", name: "Pagellone", how: "Dai la pagella ai piloti dopo una gara" },
  { id: "paddock", name: "Voce del paddock", how: "Vota il pilota del giorno" },
  { id: "archivio", name: "Archivio", how: "Salva 5 notizie", goal: 5 },
  { id: "radio", name: "Radio aperta", how: "Scrivi il tuo primo messaggio in chat" },
  { id: "sgasata", name: "Sgasata", how: "Tre tocchi veloci sul logo B&T", secret: true },
];
const SECRET_NAME = "Trofeo segreto", SECRET_HOW = "Si trova da qualche parte nell'app";

const isObj = v => !!v && typeof v === "object" && !Array.isArray(v);
const num = v => (typeof v === "number" && isFinite(v) ? v : 0);
const filled = v => v !== null && v !== undefined && v !== "";
const someEntry = (m, test) => isObj(m) && Object.values(m).some(test);

// ── Trofei da Firebase (25/10) ─────────────────────────────────────────
// shared/bt-trophies = { <id>: { name, how, goal, attivo } }: quello che c'è e vale sostituisce il valore di serie;
// attivo: false toglie il trofeo (non si vede e non si vince), true lo rimette. Gli obiettivi: i conteggi interi da 1 a 100, i tempi del Pit
// Stop Challenge da 1 a 5 secondi (2 decimali). Gli id sono quelli del codice: come si controlla ogni trofeo resta qui.
const PIT_IDS = ["pitcrew", "pitperfetto"];
const goalOk = (id, g) => (PIT_IDS.includes(id) ? g >= 1 && g <= 5 : Number.isInteger(g) && g >= 1 && g <= 100);
const textOk = (v, max) => typeof v === "string" && v.trim().length > 0 && v.trim().length <= max;
function cleanTrophyConfig(v) {
  const out = {};
  if (!isObj(v)) return out;
  TROPHIES.forEach(t => {
    const c = v[t.id];
    if (!isObj(c)) return;
    const o = {};
    if (textOk(c.name, 40)) o.name = c.name.trim();
    if (textOk(c.how, 140)) o.how = c.how.trim();
    if (t.goal != null && typeof c.goal === "number" && isFinite(c.goal) && goalOk(t.id, c.goal)) o.goal = Math.round(c.goal * 100) / 100;
    if (c.attivo === false || c.off === true) o.off = true;   // dentro l'app: off (si pulisce anche due volte)
    out[t.id] = o;
  });
  return out;
}
// I trofei di questa app: quelli di serie con le modifiche di Firebase, senza quelli spenti.
function trophyDefs(cfg) {
  const c = cleanTrophyConfig(cfg);
  return TROPHIES.filter(t => !(c[t.id] && c[t.id].off)).map(t => ({ ...t, ...(c[t.id] || {}) }));
}
// Il documento da scrivere su Firebase quando non c'è: tutti i trofei con i valori di serie, pronti da cambiare.
function trophyConfigDefaults() {
  return Object.fromEntries(TROPHIES.map(t => [t.id, { name: t.name, how: t.how, ...(t.goal != null ? { goal: t.goal } : {}), attivo: true }]));
}

// input = { about, helmet, squad, saved, pitBest, sillyPreds, ratings, dotd, correctPreds, correctWx, correctPolls,
// events: { chat, egg } } → { [id]: { done, value?, goal? } }, solo per i trofei di defs (di serie: tutti). squad: la
// squadra fatta da chi usa l'app (null se è ancora quella di partenza); pitBest in secondi.
function trophyProgress(input, defs = TROPHIES) {
  const x = isObj(input) ? input : {};
  const about = isObj(x.about) ? x.about : null;
  const squad = isObj(x.squad) ? x.squad : null;
  const ev = isObj(x.events) ? x.events : {};
  const pit = typeof x.pitBest === "number" && isFinite(x.pitBest) && x.pitBest > 0 ? x.pitBest : null;
  const goals = Object.fromEntries((Array.isArray(defs) ? defs : TROPHIES).map(t => [t.id, t.goal]));
  const count = (value, goal) => ({ done: value >= goal, value, goal });
  const pitWithin = goal => ({ done: pit != null && pit <= goal + 1e-9, value: pit, goal });   // "in 2,30 secondi o meno"
  const fullList = (l, n) => Array.isArray(l) && l.length === n && l.every(filled);
  const all = {
    superlicenza: () => ({ done: !!about && filled(about.birth) && filled(about.fan) && (filled(about.years) || filled(about.follow)) }),
    casco: () => ({ done: isObj(x.helmet) }),
    griglia: () => ({ done: !!squad && fullList(squad.drivers, 5) && fullList(squad.teams, 2) }),
    indovino: g => count(num(x.correctPreds), g),
    oracolo: g => count(num(x.correctPreds), g),
    radar: g => count(num(x.correctWx), g),
    sondaggista: g => count(num(x.correctPolls), g),
    pitcrew: g => pitWithin(g),
    pitperfetto: g => pitWithin(g),
    mercato: () => ({ done: someEntry(x.sillyPreds, isObj) }),
    pagellone: () => ({ done: someEntry(x.ratings, r => isObj(r) && Object.values(r).some(isObj)) }),
    paddock: () => ({ done: someEntry(x.dotd, v => isObj(v) && filled(v.driver)) }),
    archivio: g => count(Array.isArray(x.saved) ? x.saved.length : 0, g),
    radio: () => ({ done: !!ev.chat }),
    sgasata: () => ({ done: !!ev.egg }),
  };
  const out = {};
  Object.keys(goals).forEach(id => { if (all[id]) out[id] = all[id](goals[id]); });
  return out;
}

// Medaglia per il numero di trofei vinti: null, "bronzo" (da 1), "argento" (da 5), "oro" (da 10).
function medalOf(count) {
  const n = num(count);
  return n >= 10 ? "oro" : n >= 5 ? "argento" : n >= 1 ? "bronzo" : null;
}
const MEDALS = ["bronzo", "argento", "oro"];

// Trofei vinti salvati nell'account: solo id conosciuti con una data valida.
function cleanTrophies(v) {
  const out = {};
  if (isObj(v)) TROPHIES.forEach(t => { const at = v[t.id]; if (typeof at === "number" && isFinite(at) && at > 0) out[t.id] = at; });
  return out;
}

module.exports = { TROPHIES, SECRET_NAME, SECRET_HOW, MEDALS, trophyProgress, medalOf, cleanTrophies, trophyDefs, trophyConfigDefaults, cleanTrophyConfig };
