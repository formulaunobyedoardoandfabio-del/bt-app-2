// Punti FantaF1 veri (31/10; prove in test/unit/fanta-season.test.js). I risultati veri arrivano da Jolpica (gare,
// qualifiche e Sprint della stagione); i punti si calcolano con le regole di sempre (BtLogic.sessionPoints e
// squadScore) per la squadra che c'era quando il weekend si è bloccato (storia della squadra: { t, d, c, b, n }), coi
// cambi oltre i gratis che tolgono punti (BtLogic.transfers e nextFree). Niente numeri inventati: i weekend senza
// squadra completa o senza risultati non contano.
const BtLogic = require("./bt-logic");
const F1 = require("../data/f1-2026");
const { driverIdOf } = require("../services/compat");

const TEAM_OF = Object.fromEntries(F1.DRIVER_DATA.map(d => [d[0], d[3]]));
const isObj = v => !!v && typeof v === "object" && !Array.isArray(v);
const idOk = v => (typeof v === "string" && /^[a-z0-9-]{1,30}$/.test(v) ? v : "");
const racesOf = pages => (Array.isArray(pages) ? pages : []).flatMap(p => {
  const l = p && p.MRData && p.MRData.RaceTable && p.MRData.RaceTable.Races;
  return Array.isArray(l) ? l.filter(isObj) : [];
});
const nameOf = d => (isObj(d) ? [d.givenName, d.familyName].filter(Boolean).join(" ") : "");
const int = v => { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : null; };

// Una sessione di gara (o Sprint) di Jolpica → { order: [{ id, pos, grid, dnf }], fastest }.
function raceSession(rows) {
  const order = [];
  let fastest = null;
  rows.forEach(x => {
    const id = driverIdOf(nameOf(x.Driver));
    if (!id) return;   // pilota ospite: non può essere in una squadra
    const dnf = !/^\d+$/.test(String(x.positionText == null ? x.position : x.positionText));
    order.push({ id, pos: int(x.position), grid: int(x.grid), dnf });
    if (x.FastestLap && String(x.FastestLap.rank) === "1") fastest = id;
  });
  order.sort((a, b) => (a.pos || 99) - (b.pos || 99));
  return order.length ? { order, fastest } : null;
}
function qualiSession(rows) {
  const order = [];
  rows.forEach(x => {
    const id = driverIdOf(nameOf(x.Driver));
    if (!id) return;
    order.push({ id, pos: int(x.position), out: x.Q3 ? null : x.Q2 ? "Q2" : "Q1" });
  });
  order.sort((a, b) => (a.pos || 99) - (b.pos || 99));
  return order.length ? { order } : null;
}

// { results, qualifying, sprint }: pagine di Jolpica → [{ round, race, quali, sprint }] in ordine di round.
function roundsFromJolpica({ results = [], qualifying = [], sprint = [] } = {}) {
  const by = new Map();
  const collect = (pages, key, field) => racesOf(pages).forEach(r => {
    const round = int(r.round);
    if (!round || !Array.isArray(r[field])) return;
    const e = by.get(round) || { round, rows: { race: [], quali: [], sprint: [] } };
    e.rows[key].push(...r[field].filter(isObj));
    by.set(round, e);
  });
  collect(results, "race", "Results");
  collect(qualifying, "quali", "QualifyingResults");
  collect(sprint, "sprint", "SprintResults");
  return [...by.values()].sort((a, b) => a.round - b.round).map(e => ({
    round: e.round,
    race: e.rows.race.length ? raceSession(e.rows.race) : null,
    quali: e.rows.quali.length ? qualiSession(e.rows.quali) : null,
    sprint: e.rows.sprint.length ? raceSession(e.rows.sprint) : null,
  }));
}

// Voce della storia della squadra (si aggiunge a ogni cambio, nell'account e nelle leghe).
function logEntry(squad, t) {
  const s = isObj(squad) ? squad : {};
  const d = (Array.isArray(s.drivers) ? s.drivers : []).slice(0, 5).map(idOk);
  while (d.length < 5) d.push("");
  const c = (Array.isArray(s.teams) ? s.teams : []).slice(0, 2).map(idOk);
  while (c.length < 2) c.push("");
  const out = { t, d, c, b: idOk(s.boost) || null };
  const n = typeof s.name === "string" ? s.name.trim().slice(0, 40) : "";
  if (n) out.n = n;
  return out;
}
const sameSquad = (a, b) => !!a && !!b && JSON.stringify([a.d, a.c, a.b]) === JSON.stringify([b.d, b.c, b.b]);
const cleanLog = log => (Array.isArray(log) ? log : []).filter(e => isObj(e) && typeof e.t === "number" && Array.isArray(e.d) && Array.isArray(e.c)).sort((a, b) => a.t - b.t);

// La squadra (nel formato di BtLogic) che c'era all'ora `at`: l'ultima voce non dopo `at`.
function squadAt(log, at) {
  let e = null;
  cleanLog(log).forEach(x => { if (x.t <= at) e = x; });
  return e ? { drivers: e.d.slice(), teams: e.c.slice(), boost: e.b || null, name: e.n || "" } : null;
}
const complete = sq => !!sq && sq.drivers.length === 5 && sq.drivers.every(Boolean) && sq.teams.length === 2 && sq.teams.every(Boolean);

// Punti della stagione: lockOf(round) = ora di blocco di quel weekend (ms) o null se non si sa.
function seasonPoints({ log, rounds, lockOf, teamOf = TEAM_OF }) {
  let prev = null, free = BtLogic.RULES.freeTransfers, total = 0;
  const out = [];
  (rounds || []).forEach(r => {
    const at = lockOf(r.round);
    if (at == null || !isFinite(at)) return;
    const sq = squadAt(log, at);
    if (!complete(sq)) return;
    const lines = [];
    let pts = 0;
    [["QUALI", r.quali], ["SPRINT", r.sprint], ["RACE", r.race]].forEach(([type, s]) => {
      if (!s) return;
      const sc = BtLogic.squadScore(sq, BtLogic.sessionPoints({ type, order: s.order, fastest: s.fastest || null }, teamOf));
      pts += sc.total; lines.push({ type, pts: sc.total });
    });
    if (!lines.length) return;
    const tr = BtLogic.transfers(prev, sq, free);
    if (tr.penalty) { pts -= tr.penalty; lines.push({ type: "PEN", pts: -tr.penalty }); }
    free = tr.unlimited ? BtLogic.RULES.freeTransfers : BtLogic.nextFree(free, tr.used);
    prev = sq; total += pts;
    out.push({ round: r.round, pts, lines });
  });
  return { total, rounds: out };
}

module.exports = { TEAM_OF, roundsFromJolpica, logEntry, sameSquad, cleanLog, squadAt, seasonPoints };
