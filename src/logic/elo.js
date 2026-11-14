// ELO del FantaF1 (7/11, Edoardo: "metti nel Fanta un punteggio come su scacchi ELO, inventa anche come calcolarlo").
// Come negli scacchi, ma ogni GP è un torneo all'italiana tra chi è nelle tue leghe:
// - tutti partono da START (1200);
// - dopo ogni GP il punteggio FantaF1 di ognuno si confronta con quello di ogni altro che ha giocato quel GP:
//   vittoria 1, pari ½, sconfitta 0;
// - atteso contro un avversario = 1 / (1 + 10^((ELO avversario − ELO tuo) / 400)): battere chi è più forte vale di più;
// - variazione del GP = K × Σ(risultato − atteso) / (giocatori − 1), cioè la media dei confronti (in una lega grande
//   un GP non pesa più che in una piccola); K = 40 nei primi 3 GP (si trova in fretta il proprio livello), poi 24,
//   16 da 1600 in su (in cima ci si muove piano);
// - le variazioni del GP si applicano tutte insieme, con gli ELO di prima del GP;
// - contano solo i punti dei GP veri (gara, qualifiche, Sprint, penalità dei cambi); i bonus dei pronostici no.
// Prove: test/unit/elo.test.js.
const START = 1200;
const TIERS = [
  { min: 1600, name: "Leggenda" },
  { min: 1450, name: "Campione" },
  { min: 1300, name: "Prima guida" },
  { min: 1150, name: "Pilota titolare" },
  { min: -Infinity, name: "Esordiente" },
];
const kOf = (games, rating) => (games < 3 ? 40 : rating >= 1600 ? 16 : 24);
const expected = (ra, rb) => 1 / (1 + Math.pow(10, (rb - ra) / 400));
const tierOf = rating => TIERS.find(t => rating >= t.min).name;

// players: [{ id, rounds: [{ round, pts }] }] → { ratings: { <id>: { rating, games, last, history: [{ round, rating }] } }, rounds: [...] }
// rating arrotondato all'intero; last = variazione dell'ultimo GP giocato; history = ELO dopo ogni GP giocato.
function fantaElo(players) {
  const st = new Map();
  (players || []).forEach(p => { if (p && p.id != null && !st.has(p.id)) st.set(p.id, { r: START, g: 0, last: 0, hist: [], by: new Map((p.rounds || []).filter(x => x && isFinite(x.round) && isFinite(x.pts)).map(x => [x.round, x.pts])) }); });
  const rounds = [...new Set([...st.values()].flatMap(s => [...s.by.keys()]))].sort((a, b) => a - b);
  const played = [];
  rounds.forEach(round => {
    const P = [...st.entries()].filter(([, s]) => s.by.has(round));
    if (P.length < 2) return;
    played.push(round);
    const deltas = P.map(([, a]) => {
      let sum = 0;
      P.forEach(([, b]) => {
        if (a === b) return;
        const pa = a.by.get(round), pb = b.by.get(round);
        sum += (pa > pb ? 1 : pa === pb ? 0.5 : 0) - expected(a.r, b.r);
      });
      return kOf(a.g, a.r) * sum / (P.length - 1);
    });
    P.forEach(([, s], i) => { s.r += deltas[i]; s.g += 1; s.last = deltas[i]; s.hist.push({ round, rating: Math.round(s.r) }); });
  });
  const ratings = {};
  st.forEach((s, id) => { ratings[id] = { rating: Math.round(s.r), games: s.g, last: Math.round(s.last), history: s.hist, tier: tierOf(Math.round(s.r)) }; });
  return { ratings, rounds: played };
}

// ── ELO B&T (14/11, Edoardo: "crea nuovo modo di calcolare Elo") ──────────────────────────────────────────────
// Il primo ELO dipendeva da chi era nelle TUE leghe: la stessa persona aveva ELO diversi su telefoni diversi. Ora tutti
// sono nella lega B&T e c'è un'unica classifica, uguale per tutti:
// - tutti partono da START (1200); contano i GP giocati da almeno due persone, coi punti FantaF1 veri del GP;
// - punteggio del GP S = 85% posizione tra chi ha giocato (battuti + ½ pareggi, diviso gli altri) + 15% quanto sei
//   vicino al migliore ((tuoi punti − minimo) / (massimo − minimo); tutti pari = ½);
// - atteso E = 1 / (1 + 10^((media ELO degli altri − tuo ELO) / 400)): contro un campo forte serve meno per salire;
// - variazione = K × (S − E); K = 48 nei primi 3 GP, 32 fino al 10°, poi 20, e 16 da 1700 in su;
// - le variazioni del GP si applicano tutte insieme, con gli ELO di prima del GP.
const btK = (games, rating) => (games < 3 ? 48 : games < 10 ? 32 : rating >= 1700 ? 16 : 20);
function btElo(players) {
  const st = new Map();
  (players || []).forEach(p => {
    if (!p || p.id == null || st.has(p.id)) return;
    const by = new Map((p.rounds || []).filter(x => x && isFinite(x.round) && isFinite(x.pts)).map(x => [x.round, x.pts]));
    st.set(p.id, { r: START, g: 0, last: 0, hist: [], by });
  });
  const ids = [...st.keys()].sort((a, b) => String(a).localeCompare(String(b)));   // stesso risultato in qualunque ordine
  const rounds = [...new Set([...st.values()].flatMap(s => [...s.by.keys()]))].sort((a, b) => a - b);
  const played = [];
  rounds.forEach(round => {
    const P = ids.map(id => st.get(id)).filter(s => s.by.has(round));
    const n = P.length;
    if (n < 2) return;
    played.push(round);
    const pts = P.map(s => s.by.get(round)), lo = Math.min(...pts), hi = Math.max(...pts);
    const sumR = P.reduce((t, s) => t + s.r, 0);
    const deltas = P.map((s, i) => {
      let beat = 0;
      pts.forEach((q, j) => { if (j !== i) beat += pts[i] > q ? 1 : pts[i] === q ? 0.5 : 0; });
      const place = beat / (n - 1), close = hi > lo ? (pts[i] - lo) / (hi - lo) : 0.5;
      const S = 0.85 * place + 0.15 * close;
      const others = (sumR - s.r) / (n - 1), E = expected(s.r, others);
      return btK(s.g, s.r) * (S - E);
    });
    P.forEach((s, i) => { s.r += deltas[i]; s.g += 1; s.last = deltas[i]; s.hist.push({ round, rating: Math.round(s.r) }); });
  });
  const ratings = {};
  ids.forEach(id => { const s = st.get(id), rating = Math.round(s.r); ratings[id] = { rating, games: s.g, last: Math.round(s.last), history: s.hist, tier: tierOf(rating) }; });
  return { ratings, rounds: played };
}

module.exports = { START, TIERS, kOf, expected, tierOf, fantaElo, btK, btElo };
