// Prezzi FantaF1 automatici (8/11, Edoardo: "rendi automatico tutto"). Si parte dal listino vero (quello dell'admin o
// quello di F1 Fantasy dopo il round 15, src/data/f1-2026.js) e dopo ogni GP coi risultati (Jolpica) i prezzi cambiano
// coi punti FantaF1 di quel weekend (BtLogic.sessionPoints, le regole del gioco): il primo quarto +0,3 milioni, il
// secondo +0,1, il terzo -0,1, l'ultimo -0,3 (scuderie ±0,6 e ±0,2), mai sotto 3,0. "change" = ultima variazione,
// "pts" = punti della stagione + quelli dei GP contati qui. asOf = ultimo round già nei prezzi.
const BtLogic = require("./bt-logic");
const isObj = v => !!v && typeof v === "object" && !Array.isArray(v);
const r1 = v => Math.round(v * 10) / 10;
const FLOOR = 3;

function roundPoints(round, teamOf) {
  const drivers = {}, teams = {};
  [["QUALI", round.quali], ["SPRINT", round.sprint], ["RACE", round.race]].forEach(([type, s]) => {
    if (!s || !Array.isArray(s.order)) return;
    const sp = BtLogic.sessionPoints({ type, order: s.order, fastest: s.fastest || null }, teamOf);
    Object.entries(sp.drivers).forEach(([id, e]) => { drivers[id] = (drivers[id] || 0) + e.pts; });
    Object.entries(sp.teams).forEach(([id, e]) => { teams[id] = (teams[id] || 0) + e.pts; });
  });
  return { drivers, teams };
}

// Variazioni per quarti della classifica del weekend (a pari punti decide l'ordine del listino: chi costa meno sale).
function steps(list, pts, big, small) {
  const ids = Object.keys(list).filter(id => pts[id] != null).sort((a, b) => pts[b] - pts[a] || list[a].price - list[b].price);
  const n = ids.length, out = {};
  ids.forEach((id, i) => { const q = Math.floor((i * 4) / n); out[id] = [big, small, -small, -big][q]; });
  return out;
}

function autoPrices(base, rounds, { asOf = 15, teamOf = {} } = {}) {
  const clone = o => Object.fromEntries(Object.entries(isObj(o) ? o : {}).map(([k, v]) => [k, { ...v }]));
  const s = { drivers: clone(base && base.drivers), teams: clone(base && base.teams), asOf };
  (Array.isArray(rounds) ? rounds : []).filter(r => isObj(r) && Number(r.round) > asOf && r.race && Array.isArray(r.race.order) && r.race.order.length)
    .sort((a, b) => a.round - b.round).forEach(r => {
      const p = roundPoints(r, teamOf);
      [["drivers", 0.3, 0.1], ["teams", 0.6, 0.2]].forEach(([kind, big, small]) => {
        const ch = steps(s[kind], p[kind], big, small);
        Object.entries(ch).forEach(([id, c]) => {
          const e = s[kind][id];
          e.price = Math.max(FLOOR, r1(Number(e.price) + c));
          e.change = c;
          e.pts = (Number(e.pts) || 0) + p[kind][id];
        });
      });
      s.asOf = r.round;
    });
  return s;
}

module.exports = { autoPrices, roundPoints, FLOOR };
