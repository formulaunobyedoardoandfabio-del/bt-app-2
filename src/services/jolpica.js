// Classifiche del mondiale da Jolpica F1 (api.jolpi.ca, l'erede di Ergast): gratis, senza chiave, aggiornate poche ore
// dopo ogni gara. Il telefono le legge da solo (CORS aperto) al massimo ogni 30 minuti; quelle dopo la gara prima (per le
// frecce su e giù) non cambiano più e restano salvate. Senza rete restano le ultime lette; senza niente, null e l'app
// mostra quelle dell'admin (shared/bt-piloti, bt-costruttori).
// Condizioni d'uso: servizio gratuito pensato per uso non commerciale. Prima dell'uscita pubblica con la pubblicità va
// chiesto il permesso a Jolpica (admin@jolpi.ca); intanto in src/App.jsx JOLPICA_ON = false torna a quelle dell'admin.
const C = require("./compat");
const F1 = require("../data/f1-2026");

const BASE = "https://api.jolpi.ca/ergast/f1";
const FRESH_MS = 30 * 60000;
const MIN_DRIVERS = 10, MIN_TEAMS = 5;

const listOf = json => {
  const l = json && json.MRData && json.MRData.StandingsTable && json.MRData.StandingsTable.StandingsLists;
  return Array.isArray(l) && l[0] && typeof l[0] === "object" ? l[0] : null;
};

// Dal formato di Jolpica a quello dei documenti di oggi (shared/bt-piloti e bt-costruttori): così riconoscimento di piloti
// e scuderie e ospiti (chi non è tra i 22 titolari) restano quelli di sempre (compat.standingsFromStore).
function toStore(driversJson, teamsJson) {
  const dl = listOf(driversJson), tl = listOf(teamsJson);
  if (!dl || !tl || !Array.isArray(dl.DriverStandings) || !Array.isArray(tl.ConstructorStandings)) return null;
  const round = Number(dl.round);
  if (!Number.isInteger(round) || round < 1 || Number(tl.round) !== round) return null;
  const piloti = dl.DriverStandings.map(x => {
    const d = (x && x.Driver) || {}, cs = x && Array.isArray(x.Constructors) ? x.Constructors : [];
    return { name: [d.givenName, d.familyName].filter(Boolean).join(" "), team: cs.length ? String(cs[cs.length - 1].name || "") : "", position: Number(x && x.position), points: Number(x && x.points) };
  });
  const costruttori = tl.ConstructorStandings.map(x => ({ name: String(((x && x.Constructor) || {}).name || ""), position: Number(x && x.position), points: Number(x && x.points) }));
  return { season: Number(dl.season), round, piloti, costruttori };
}

// Classifiche per l'app ({ drivers, teams, guests, note, round, source }), con prev = posizione dopo la gara prima.
function standingsOf(cur, prev) {
  if (!cur) return null;
  const st = C.standingsFromStore({ piloti: cur.piloti, costruttori: cur.costruttori });
  const okRow = r => Number.isInteger(r.position) && r.position > 0 && isFinite(r.points);
  if (st.drivers.length < MIN_DRIVERS || st.teams.length < MIN_TEAMS || !st.drivers.every(okRow) || !st.teams.every(okRow)) return null;
  const before = prev ? C.standingsFromStore({ piloti: prev.piloti, costruttori: prev.costruttori }) : null;
  const row = (list, r) => {
    const out = { id: r.id, position: r.position, points: r.points };
    const p = before && list.find(x => x.id === r.id);
    if (p && Number.isInteger(p.position) && p.position > 0) out.prev = p.position;
    return out;
  };
  const race = F1.RACES.find(r => Number(r.round) === cur.round);
  return {
    drivers: st.drivers.map(r => row(before ? before.drivers : [], r)),
    teams: st.teams.map(r => row(before ? before.teams : [], r)),
    guests: st.guests,
    round: cur.round,
    source: "jolpica",
    note: `Aggiornata dopo il ${race ? race.name : "GP"} (round ${cur.round}) · dati Jolpica F1`,
  };
}

// Quali mostrare: quelle di Jolpica, se non sono di una gara prima di quelle dell'admin (il round è nella nota dell'admin,
// "Aggiornata dopo il GP di Singapore (round 17)"; senza round valgono quelle di Jolpica).
const adminRound = st => { const m = /round\s*(\d+)/i.exec((st && st.note) || ""); return m ? Number(m[1]) : 0; };
const pick = (admin, live) => (live && live.round >= adminRound(admin) ? live : admin);

function createJolpica({ fetch: f = (...a) => fetch(...a), now = () => Date.now(), store = null, season = 2026 } = {}) {
  const KEY = "jolpica-standings-" + season;
  const get = async path => {
    const r = await f(BASE + path, { headers: { Accept: "application/json" } });
    if (!r || !r.ok) throw new Error("Jolpica: HTTP " + (r ? r.status : "?"));
    return r.json();
  };
  const both = round => Promise.all([get(`/${season}/${round ? round + "/" : ""}driverstandings.json`), get(`/${season}/${round ? round + "/" : ""}constructorstandings.json`)]).then(([d, t]) => toStore(d, t));
  async function load() {
    const saved = store ? store.get(KEY) : null;
    const savedOk = saved && saved.cur && Number.isInteger(saved.cur.round);
    if (savedOk && now() - saved.at >= 0 && now() - saved.at < FRESH_MS) return standingsOf(saved.cur, saved.prev);
    let cur;
    try {
      cur = await both(null);
      if (!cur || cur.season !== season) throw new Error("Jolpica: risposta non valida");
    } catch (e) {
      if (savedOk) return standingsOf(saved.cur, saved.prev);   // senza rete: le ultime lette
      throw e;
    }
    let prev = savedOk && saved.prev && saved.prev.round === cur.round - 1 ? saved.prev : null;
    if (!prev && cur.round > 1) prev = await both(cur.round - 1).catch(() => null);
    const out = standingsOf(cur, prev);
    if (!out) throw new Error("Jolpica: classifiche incomplete");
    if (store) store.set(KEY, { at: now(), cur, prev });
    return out;
  }
  let inflight = null;
  const standings = () => (inflight = inflight || load().finally(() => { inflight = null; }));
  return { standings };
}

module.exports = { createJolpica, toStore, standingsOf, pick, adminRound, BASE };
