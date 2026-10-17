// Filtri delle notizie della Home (Tappa 3, G09-G10; prove in test/unit/newsfilter.test.js).
// - Le gomme: Soft rossa = ultim'ora (notizie delle ultime 24 ore), Medium gialla = generali (tutte tranne
//   approfondimenti e meteo), Hard bianca = approfondimenti (categoria ANALISI), Intermedia verde = meteo (METEO).
// - La corsia dei box (Pit Lane): Tutte, Scuderie, Piloti, Tecnica (categorie SCUDERIE, PILOTI, TECNICA).
// Gomma e corsia si combinano; l'ordine delle notizie resta quello di prima.
const { parseDate } = require("../services/compat");

const DAY_MS = 24 * 3600000, SKEW_MS = 5 * 60000;   // ultime 24 ore (5 minuti di tolleranza per l'orologio)
const TYRES = [
  { id: "soft", name: "Soft", label: "Ultim'ora", color: "#FF1801" },
  { id: "medium", name: "Medium", label: "Generali", color: "#F2C230" },
  { id: "hard", name: "Hard", label: "Approfondimenti", color: "#F4F2EF" },
  { id: "inter", name: "Intermedia", label: "Meteo", color: "#3ED66B" },
];
const LANES = [
  { id: "all", label: "Tutte", cat: null },
  { id: "teams", label: "Scuderie", cat: "SCUDERIE" },
  { id: "drivers", label: "Piloti", cat: "PILOTI" },
  { id: "tech", label: "Tecnica", cat: "TECNICA" },
];
const catOf = a => String((a && a.cat) || "").trim().toUpperCase();
const TYRE_TEST = {
  soft: (a, now) => { const t = parseDate(a && a.date); return !isNaN(t) && now - t <= DAY_MS && now - t >= -SKEW_MS; },
  medium: a => !["ANALISI", "METEO"].includes(catOf(a)),
  hard: a => catOf(a) === "ANALISI",
  inter: a => catOf(a) === "METEO",
};

// tyre: "soft" | "medium" | "hard" | "inter" | null; lane: "all" | "teams" | "drivers" | "tech".
function filterNews(articles, { tyre = null, lane = "all", now = Date.now() } = {}) {
  const list = Array.isArray(articles) ? articles : [];
  const byTyre = TYRE_TEST[tyre], laneCat = (LANES.find(l => l.id === lane) || LANES[0]).cat;
  return list.filter(a => (!byTyre || byTyre(a, now)) && (!laneCat || catOf(a) === laneCat));
}

module.exports = { filterNews, TYRES, LANES };
