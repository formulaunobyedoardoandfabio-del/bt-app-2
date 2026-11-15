// Replay sulla mappa delle gare finite (15/11, Edoardo: come il sito di imcarto, nel bottone "Riguarda la gara").
// Il file di tools/openf1_replay.py dà per ogni pilota i metri percorsi lungo la pista a ogni secondo (differenze dal
// secondo prima). Qui: somme, posizione sulla linea del tracciato, e a ogni istante ordine, giro, distacco dal primo e
// da chi sta davanti, doppiati, gomma del giro, box, bandiera; a fine gara l'ordine ufficiale. Chi non parte o si
// ritira va in fondo; prima del via (in griglia) niente distacchi.
// Prove: test/unit/track-replay.test.js.

const isArr = Array.isArray;

function decode(f) {
  if (!f || !isArr(f.line) || f.line.length < 3 || !isArr(f.drivers) || !f.drivers.length || !(f.L > 0)) return null;
  if (!f.drivers.every(d => d && isArr(d.p) && d.p.length)) return null;
  const line = f.line.map(p => [+p[0], +p[1]]);
  const cum = [0];
  for (let i = 1; i < line.length; i++) cum.push(cum[i - 1] + Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]));
  const Lline = cum[cum.length - 1] + Math.hypot(line[0][0] - line[line.length - 1][0], line[0][1] - line[line.length - 1][1]);
  const start = Number.isFinite(f.start) ? f.start : 0;
  const drivers = f.drivers.map(d => {
    const prog = new Int32Array(d.p.length), mono = new Int32Array(d.p.length);
    let s = 0, m = -Infinity, last = 0;
    d.p.forEach((x, k) => { s += x | 0; prog[k] = s; m = Math.max(m, s); mono[k] = m; if (k && Math.abs(x) > 1) last = k; });
    return { ...d, prog, mono, lastMove: start + last };
  });
  const rep = { ...f, line, cum, Lline, start, drivers, N: f.laps || 0, xs: line.map(p => p[0]), ys: line.map(p => p[1]) };
  // arrivo: quando il primo completa N giri; ognuno finisce al primo passaggio sul traguardo dopo di allora
  const full = rep.N * rep.L;
  let tf = null;
  drivers.forEach((d, i) => { const x = rep.N ? tAt(rep, i, full) : null; if (x != null && (tf == null || x < tf)) tf = x; });
  rep.tf = tf;
  drivers.forEach((d, i) => {
    if (tf == null) { d.cap = Infinity; d.fin = null; return; }
    const p = progAt(rep, i, tf);
    d.cap = p >= full - 0.5 ? full : (Math.floor(p / rep.L) + 1) * rep.L;
    d.fin = tAt(rep, i, d.cap);
  });
  const fins = drivers.map(d => d.fin).filter(x => x != null);
  rep.tend = Math.min(start + drivers[0].prog.length - 1, fins.length ? Math.max(...fins) : Infinity);
  return rep;
}

function progAt(rep, i, t) {
  const pr = rep.drivers[i].prog, k = Math.max(0, Math.min(pr.length - 1, t - rep.start));
  const a = Math.floor(k), b = Math.min(pr.length - 1, a + 1);
  return pr[a] + (pr[b] - pr[a]) * (k - a);
}

// Primo istante in cui il pilota i è arrivato al progresso p (null se non ci è mai arrivato).
function tAt(rep, i, p) {
  const m = rep.drivers[i].mono;
  if (!m.length || m[m.length - 1] < p) return null;
  if (m[0] >= p) return rep.start;
  let lo = 0, hi = m.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (m[mid] >= p) hi = mid; else lo = mid; }
  const f = m[hi] > m[lo] ? (p - m[lo]) / (m[hi] - m[lo]) : 1;
  return rep.start + lo + f;
}

function pointAt(rep, s) {
  const L = rep.Lline, d = (((s * L) / rep.L) % L + L) % L, c = rep.cum, n = rep.line.length;
  let lo = 0, hi = n - 1;
  if (d >= c[n - 1]) lo = n - 1;
  else { while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (c[mid] <= d) lo = mid; else hi = mid; } }
  const a = rep.line[lo], b = rep.line[(lo + 1) % n], seg = (lo + 1 < n ? c[lo + 1] : L) - c[lo];
  const u = seg > 0 ? (d - c[lo]) / seg : 0;
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
}

const r1 = x => Math.round(x * 10) / 10;

function stateAt(rep, t) {
  const L = rep.L, N = rep.N, done = rep.tf != null && t >= rep.tf;
  let rows = rep.drivers.map((d, i) => {
    let p = progAt(rep, i, t);
    if (done) p = Math.min(p, d.cap);
    const lap = Math.max(1, Math.min(N || Infinity, Math.floor(Math.max(0, p) / L) + 1));
    const st = (d.stints || []).find(s => s[0] <= lap && (s[1] == null || lap <= s[1]));
    const pit = (rep.pits || []).find(x => x[1] === d.n && x[0] <= t && t < x[0] + Math.max(20, x[3] || 0));
    return { i, n: d.n, code: d.code, name: d.name, team: d.team, color: d.color, p, lap, tyre: st ? st[2] : "", box: !!pit, out: !!d.status && t >= d.lastMove, fin: done && d.fin != null && t >= d.fin };
  });
  rows.sort((a, b) => (a.out - b.out) || b.p - a.p || (a.fin && b.fin ? rep.drivers[a.i].fin - rep.drivers[b.i].fin : 0) || String(a.code).localeCompare(String(b.code)));
  if (t >= rep.tend && rep.drivers.some(d => d.pos != null)) {
    const pos = r => rep.drivers[r.i].pos;
    rows = [...rows.filter(r => pos(r) != null).sort((a, b) => pos(a) - pos(b)), ...rows.filter(r => pos(r) == null)];
  }
  const lead = rows[0];
  rows.forEach((r, k) => {
    const tl = tAt(rep, lead.i, r.p), ta = k ? tAt(rep, rows[k - 1].i, r.p) : null;
    const capLaps = done && Number.isFinite(rep.drivers[r.i].cap) ? rep.drivers[r.i].cap / L : null;
    r.pos = k + 1;
    r.down = !k ? 0 : capLaps != null && capLaps < N ? N - capLaps : Math.max(0, Math.floor((lead.p - r.p) / L));
    r.gap = !k ? 0 : t < 1 || tl == null ? null : r1(Math.max(0, (r.fin ? rep.drivers[r.i].fin : t) - tl));
    r.int = !k ? 0 : t < 1 || ta == null ? null : r1(Math.max(0, (r.fin ? rep.drivers[r.i].fin : t) - ta));
  });
  const flagRow = (rep.status || []).filter(s => s[0] <= t).pop();
  return { t, lap: Math.max(1, Math.min(N || Infinity, Math.floor(Math.max(0, lead.p) / L) + 1)), flag: flagRow ? flagRow[1] : "green", done, rows };
}

module.exports = { decode, progAt, tAt, pointAt, stateAt };
