// Griglia dell'Avvento (31/10; tema di Natale, src/logic/holidays.js; prove in test/unit/advent.test.js).
// 24 caselle come la griglia di partenza, una al giorno di dicembre (giorno di Roma). Dentro, fatti veri della stagione
// presi dai dati dell'app (real-weekend.js: gare e qualifiche): vincitore e pole di ogni GP, poi i record della stagione.
(function (root) {
  const H = typeof require === "function" ? require("./holidays") : root.BtHolidays;
  const N = 24;
  const winnerOf = R => { const e = Object.entries((R && R.drivers) || {}).find(([, d]) => d && d.pos === 1); return e ? e[0] : null; };
  const podiumOf = R => Object.entries((R && R.drivers) || {}).filter(([, d]) => d && d.pos >= 1 && d.pos <= 3).map(([c]) => c);
  // Pole: miglior tempo di Q3; se nessuno ha Q3, il miglior tempo delle qualifiche.
  function poleOf(Q) {
    const list = Object.entries((Q && Q.drivers) || {}).map(([c, d]) => ({ c, q: (d && d.q) || [] }));
    const best = k => list.filter(x => x.q[k] > 0).sort((a, b) => a.q[k] - b.q[k])[0];
    const b3 = best(2);
    if (b3) return b3.c;
    const all = list.map(x => ({ c: x.c, t: Math.min(...x.q.filter(v => v > 0)) })).filter(x => isFinite(x.t)).sort((a, b) => a.t - b.t)[0];
    return all ? all.c : null;
  }
  const top = m => Object.entries(m).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  // races, quali: come in real-weekend.js; nameOf(sigla) → nome del pilota; gpOf(circuitId) → nome del GP.
  function adventFacts({ races = [], quali = [], nameOf = c => c, gpOf = c => c } = {}) {
    const R = races.slice().sort((a, b) => a.round - b.round);
    const out = [], wins = {}, poles = {}, pods = {};
    R.forEach(r => {
      const w = winnerOf(r), q = quali.find(x => x.round === r.round), p = poleOf(q);
      if (w) wins[w] = (wins[w] || 0) + 1;
      if (p) poles[p] = (poles[p] || 0) + 1;
      podiumOf(r).forEach(c => { pods[c] = (pods[c] || 0) + 1; });
      if (w && out.length < N - 6) out.push(`${gpOf(r.circuitId)} (round ${r.round}): vince ${nameOf(w)}${p ? `, pole di ${nameOf(p)}` : ""}.`);
    });
    const tw = top(wins), tp = top(poles), td = top(pods);
    const extra = [
      tw && `Il re delle vittorie nel 2026: ${nameOf(tw[0])}, con ${tw[1]} vittorie nei GP che abbiamo nei dati.`,
      tp && `Il più veloce il sabato: ${nameOf(tp[0])}, con ${tp[1]} pole position.`,
      td && `Sempre sul podio: ${nameOf(td[0])}, salito sul podio ${td[1]} volte.`,
      `Vincitori diversi nel 2026: ${Object.keys(wins).length} piloti hanno vinto almeno un GP.`,
      `GP corsi nei dati della stagione: ${R.length}.`,
      `${R.length ? `Pole trasformate in vittoria: ${R.filter(r => { const q = quali.find(x => x.round === r.round); return q && poleOf(q) === winnerOf(r); }).length} volte su ${R.length}.` : ""}`,
    ].filter(Boolean);
    extra.forEach(f => { if (out.length < N) out.push(f); });
    let k = 1;
    while (out.length < N) out.push(`Casella ${out.length + 1}: grazie di aver seguito la stagione con B&T (${k++}).`);
    return out.slice(0, N);
  }
  // Ultima casella che si può aprire oggi (0 = nessuna): il giorno di dicembre, al massimo 24.
  function openableUpTo(now) { const [, m, d] = H.romeParts(now); return m === 12 ? Math.min(N, d) : 0; }
  const allOpen = opened => Array.isArray(opened) && new Set(opened.filter(n => Number.isInteger(n) && n >= 1 && n <= N)).size === N;
  // Il pacco sotto l'albero: dal 25 dicembre (giorno di Roma).
  function giftReady(now) { const [, m, d] = H.romeParts(now); return m === 12 && d >= 25; }
  const api = { N, adventFacts, openableUpTo, allOpen, giftReady, poleOf, winnerOf };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.BtAdvent = api;
})(typeof window !== "undefined" ? window : this);
