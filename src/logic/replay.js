// "Riguarda la gara" (14/11, Edoardo: "rendi possibile riguardare la gara dalla sezione race se l'utente vuole").
// Dalla gara vera le posizioni giro per giro. Formato della gara (public/data/f1/weekend.json per il 2026,
// public/data/archivio/<anno>.json da FastF1 per gli anni prima, tools/fastf1_archivio.py):
//   { laps, drivers: { <sigla>: { team, pos, n, t: [ms per giro], p?: [posizione a fine giro], f?: [segni del giro] } } }
// - ordine di ogni giro: le posizioni di FastF1 (p) se ci sono per tutti, se no il tempo totale; un tempo che manca
//   vale come il giro tipico (mediana) del pilota;
// - chi non ha finito il giro: prima i doppiati classificati, poi i ritirati (out), per giri fatti;
// - all'ultimo giro l'ordine è quello ufficiale (pos), penalità comprese.
// Prove: test/unit/replay.test.js.

const okNum = v => typeof v === "number" && isFinite(v);

function prep(race) {
  const ds = race && race.drivers && typeof race.drivers === "object" ? race.drivers : null;
  if (!ds) return null;
  const list = Object.keys(ds).map(code => ({ code, d: ds[code] })).filter(x => x.d && Array.isArray(x.d.t) && x.d.t.length);
  if (!list.length) return null;
  list.forEach(x => {
    const good = x.d.t.filter(v => okNum(v) && v > 0).sort((a, b) => a - b);
    const med = good.length ? good[Math.floor(good.length / 2)] : 0;
    const n = okNum(x.d.n) ? Math.min(x.d.n, x.d.t.length) : x.d.t.length;
    let sum = 0;
    x.cum = x.d.t.slice(0, n).map(v => (sum += okNum(v) && v > 0 ? v : med));
    x.n = n;
    x.pos = okNum(x.d.pos) ? x.d.pos : null;
    x.team = x.d.team || null;
  });
  const laps = okNum(race.laps) && race.laps > 0 ? race.laps : Math.max(...list.map(x => x.n));
  return { list, laps };
}

function frames(race) {
  const P = prep(race);
  if (!P) return [];
  const { list, laps } = P;
  const out = [];
  for (let lap = 1; lap <= laps; lap++) {
    const run = list.filter(x => x.n >= lap);
    const withP = run.every(x => Array.isArray(x.d.p) && okNum(x.d.p[lap - 1]));
    run.sort(withP ? (a, b) => a.d.p[lap - 1] - b.d.p[lap - 1] : (a, b) => a.cum[lap - 1] - b.cum[lap - 1]);
    const rest = list.filter(x => x.n < lap).sort((a, b) => (b.pos != null) - (a.pos != null) || b.n - a.n || (a.cum[a.n - 1] || 0) - (b.cum[b.n - 1] || 0));
    let all = [...run, ...rest];
    if (lap === laps && list.some(x => x.pos != null)) {
      all = [...list.filter(x => x.pos != null).sort((a, b) => a.pos - b.pos), ...list.filter(x => x.pos == null).sort((a, b) => b.n - a.n)];
    }
    const lead = run.length ? run[0].cum[lap - 1] : null;
    out.push({
      lap,
      rows: all.map((x, i) => {
        const done = x.n >= lap;
        return { code: x.code, team: x.team, pos: i + 1, gap: done && lead != null ? x.cum[lap - 1] - lead : null, out: !done && x.pos == null, down: !done && x.pos != null ? lap - x.n : 0 };
      }),
    });
  }
  return out;
}

// Bandiera del giro dai segni f (tools/make_live_data.py: 4 Safety Car, 8 Virtual Safety Car, 32 rossa).
function flagAt(race, lap) {
  const ds = race && race.drivers ? Object.values(race.drivers) : [];
  const fs = ds.map(d => (d && Array.isArray(d.f) ? d.f[lap - 1] : undefined)).filter(okNum);
  if (!fs.length) return null;
  if (fs.some(v => v & 32)) return "red";
  if (fs.filter(v => v & 4).length * 2 >= fs.length) return "sc";
  if (fs.filter(v => v & 8).length * 2 >= fs.length) return "vsc";
  return null;
}

function podium(race) {
  const ds = race && race.drivers && typeof race.drivers === "object" ? race.drivers : {};
  return Object.keys(ds).filter(k => ds[k] && okNum(ds[k].pos)).sort((a, b) => ds[a].pos - ds[b].pos).slice(0, 3);
}

module.exports = { frames, flagAt, podium };
