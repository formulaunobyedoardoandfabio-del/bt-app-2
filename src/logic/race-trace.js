// Race Trace (21/11, piano nel documento claude/multiviewer-in-sector4.md): dal file del replay
// (src/logic/track-replay.js) il distacco dal primo a ogni passaggio sul traguardo, una linea per pilota, fino
// all'istante del replay; i giri del pit (giro d'entrata dal file) per segnarli sulla linea.
// Prove: test/unit/race-trace.test.js.

const TR = require("./track-replay");

// Tabella completa una volta per gara: quando ogni pilota passa da ogni traguardo (null se non ci arriva).
function table(rep) {
  if (rep._rt) return rep._rt;
  const L = rep.L, N = Math.max(1, rep.laps || rep.N || 1);
  const at = rep.drivers.map((d, i) => { const row = []; for (let k = 1; k <= N; k++) row.push(TR.tAt(rep, i, k * L)); return row; });
  const lead = [];
  for (let k = 0; k < N; k++) { let m = null; at.forEach(row => { if (row[k] != null && (m == null || row[k] < m)) m = row[k]; }); lead.push(m); }
  rep._rt = { N, at, lead };
  return rep._rt;
}

function trace(rep, t) {
  const { N, at, lead } = table(rep);
  let K = 0;
  for (let k = 0; k < N; k++) if (lead[k] != null && lead[k] <= t) K = k + 1;
  let max = 0;
  const lines = rep.drivers.map((d, i) => {
    const pts = [];
    for (let k = 0; k < K; k++) {
      const x = at[i][k];
      if (x == null || x > t || lead[k] == null) continue;
      const g = Math.round((x - lead[k]) * 1000) / 1000;
      pts.push([k + 1, g]);
      if (g > max) max = g;
    }
    const pits = (rep.pits || []).filter(p => p[1] === d.n).map(p => p[2]);
    return { i, code: d.code, color: d.color, team: d.team, pts, pits };
  });
  return { K, N, lines, max };
}

module.exports = { trace };
