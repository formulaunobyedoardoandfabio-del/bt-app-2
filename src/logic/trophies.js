// Trofei (Tappa 3, G31; prove in test/unit/trophies.test.js). Si vincono con quello che si fa davvero nell'app, letto
// dai dati che l'app ha già: nessun numero inventato. Il trofeo vinto si salva nell'account (trophies: { id: data in
// ms }); la medaglia (bronzo da 1 trofeo, argento da 5, oro da 10) va accanto al nome nei messaggi della chat.
// goal: dove si conta, quanto serve (la bacheca mostra "3 di 5"); secret: si vede come "Trofeo segreto" finché non
// lo si trova.
const TROPHIES = [
  { id: "superlicenza", name: "Superlicenza", how: "Completa \"Su di te\" nel Profilo" },
  { id: "casco", name: "Il mio casco", how: "Cambia i colori del tuo casco nel Profilo" },
  { id: "griglia", name: "Griglia completa", how: "Fai la tua squadra del FantaF1: 5 piloti e 2 scuderie" },
  { id: "indovino", name: "Indovino", how: "Indovina 1 previsione del weekend", goal: 1 },
  { id: "oracolo", name: "Oracolo", how: "Indovina 5 previsioni del weekend", goal: 5 },
  { id: "radar", name: "Uomo radar", how: "Indovina 1 pronostico meteo", goal: 1 },
  { id: "sondaggista", name: "Sondaggista", how: "Indovina 1 sondaggio", goal: 1 },
  { id: "pitcrew", name: "Pit crew", how: "Pit Stop Challenge sotto 2,5 secondi", goal: 2.5 },
  { id: "pitperfetto", name: "Pit stop perfetto", how: "Pit Stop Challenge sotto 2,0 secondi", goal: 2.0 },
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

// input = { about, helmet, squad, saved, pitBest, sillyPreds, ratings, dotd, correctPreds, correctWx, correctPolls,
// events: { chat, egg } } → { [id]: { done, value?, goal? } }. squad: la squadra fatta da chi usa l'app (null se è
// ancora quella di partenza); pitBest in secondi.
function trophyProgress(input) {
  const x = isObj(input) ? input : {};
  const about = isObj(x.about) ? x.about : null;
  const squad = isObj(x.squad) ? x.squad : null;
  const ev = isObj(x.events) ? x.events : {};
  const pit = typeof x.pitBest === "number" && isFinite(x.pitBest) && x.pitBest > 0 ? x.pitBest : null;
  const count = (value, goal) => ({ done: value >= goal, value, goal });
  const pitUnder = goal => ({ done: pit != null && pit < goal, value: pit, goal });
  const fullList = (l, n) => Array.isArray(l) && l.length === n && l.every(filled);
  return {
    superlicenza: { done: !!about && filled(about.birth) && filled(about.fan) && (filled(about.years) || filled(about.follow)) },
    casco: { done: isObj(x.helmet) },
    griglia: { done: !!squad && fullList(squad.drivers, 5) && fullList(squad.teams, 2) },
    indovino: count(num(x.correctPreds), 1),
    oracolo: count(num(x.correctPreds), 5),
    radar: count(num(x.correctWx), 1),
    sondaggista: count(num(x.correctPolls), 1),
    pitcrew: pitUnder(2.5),
    pitperfetto: pitUnder(2.0),
    mercato: { done: someEntry(x.sillyPreds, isObj) },
    pagellone: { done: someEntry(x.ratings, r => isObj(r) && Object.values(r).some(isObj)) },
    paddock: { done: someEntry(x.dotd, v => isObj(v) && filled(v.driver)) },
    archivio: count(Array.isArray(x.saved) ? x.saved.length : 0, 5),
    radio: { done: !!ev.chat },
    sgasata: { done: !!ev.egg },
  };
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

module.exports = { TROPHIES, SECRET_NAME, SECRET_HOW, MEDALS, trophyProgress, medalOf, cleanTrophies };
