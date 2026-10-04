// B&T Insights: le analisi della diretta per le grafiche in stile TV (disegnate da noi, con i nostri calcoli).
// Funzioni pure: ricevono lo stato della diretta, i giri e la telemetria (dal simulatore; nell'app vera da OpenF1)
// e restituiscono i numeri da mostrare. Le provano i test in Node (rtest/insights.test.js).
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.BtInsights = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const r1 = v => Math.round(v * 10) / 10, r3 = v => Math.round(v * 1000) / 1000;

  // Giri "buoni" per il passo: niente primo giro, niente giri con la sosta ai box o dietro la safety car.
  function cleanLaps(laps) {
    const ok = (laps || []).filter(l => l.lapNo > 1 && l.time > 0);
    if (!ok.length) return [];
    const ts = ok.map(l => l.time).sort((a, b) => a - b), med = ts[Math.floor(ts.length / 2)];
    return ok.filter(l => l.time <= med * 1.04 && (!l.flag || l.flag === "green"));
  }
  function avgLast(laps, n) {
    const c = cleanLaps(laps).slice(-n);
    return c.length ? { avg: c.reduce((a, l) => a + l.time, 0) / c.length, n: c.length } : null;
  }
  const who = c => ({ id: c.id, code: c.code, color: c.color, pos: c.pos });

  /* ── CHI RAGGIUNGE CHI: "ti raggiunge in X giri" ───────────────────────── */
  // Coppia i-1 (davanti) e i (dietro): distacco, differenza di passo negli ultimi 3 giri e giri per arrivare a 1 secondo.
  function pairForecast({ st, lapsOf }, i, within = 1) {
    const a = st.cars[i - 1], b = st.cars[i];
    if (!a || !b || a.dnf || b.dnf || a.pit || b.pit || b.lapsDown > 0 || b.interval == null) return null;
    const pa = avgLast(lapsOf(a.id), 3), pb = avgLast(lapsOf(b.id), 3);
    if (!pa || !pb || pa.n < 2 || pb.n < 2) return null;
    const diff = pa.avg - pb.avg, gap = b.interval;           // diff > 0: chi è dietro gira più forte
    const laps = diff > 0 ? Math.max(1, Math.ceil((gap - within) / diff)) : null;
    return { ahead: who(a), behind: who(b), gap, diff, laps, atLap: laps != null ? st.lap + laps : null, paceAhead: pa.avg, paceBehind: pb.avg };
  }
  // La coppia che si avvicina prima (entro maxLaps giri e prima della fine della gara).
  function catchForecast(ctx, { within = 1, maxLaps = 30 } = {}) {
    let best = null;
    for (let i = 1; i < ctx.st.cars.length; i++) {
      const f = pairForecast(ctx, i, within);
      if (!f || !(f.diff > 0) || !(f.gap > within) || f.laps > maxLaps || f.atLap > ctx.st.totalLaps) continue;
      if (!best || f.laps < best.laps || (f.laps === best.laps && f.gap < best.gap)) best = f;
    }
    return best;
  }

  /* ── RITMO GARA ─────────────────────────────────────────────────────────── */
  // Media degli ultimi n giri buoni dei primi `top` in gara, dal più veloce, con il distacco al giro dal migliore.
  function racePace({ st, lapsOf, n = 5, top = 5 }) {
    const rows = [];
    for (const c of st.cars) {
      if (rows.length >= top) break;
      if (c.dnf) continue;
      const a = avgLast(lapsOf(c.id), n);
      if (a && a.n >= Math.min(n, 3)) rows.push({ ...who(c), avg: a.avg, laps: a.n });
    }
    rows.sort((x, y) => x.avg - y.avg);
    return rows.map(r => ({ ...r, avg: r3(r.avg), delta: r3(r.avg - rows[0].avg) }));
  }

  /* ── STRATEGIE AI BOX ───────────────────────────────────────────────────── */
  // Modello semplice delle gomme (secondi rispetto alla media nuova): passo, calo al giro e "scalino" oltre la durata.
  const COMPOUND = { S: { off: -0.55, deg: 0.085, life: 18 }, M: { off: 0, deg: 0.055, life: 27 }, H: { off: 0.35, deg: 0.038, life: 36 } };
  const CUM = {};
  Object.entries(COMPOUND).forEach(([k, c]) => { const a = [0]; for (let age = 0; age < 200; age++) a.push(a[age] + c.off + c.deg * age + (age > c.life ? 0.35 * (age - c.life) : 0)); CUM[k] = a; });
  const stint = (cmp, age0, laps) => laps <= 0 ? 0 : CUM[cmp][Math.min(199, age0 + laps)] - CUM[cmp][Math.min(199, age0)];
  // Finestra dei box: i giri intorno al migliore in cui si perde al massimo `tol` secondi.
  function windowAround(byLap, bestLap, tol) {
    const bestT = byLap[bestLap]; let a = bestLap, b = bestLap;
    while (byLap[a - 1] != null && byLap[a - 1] <= bestT + tol) a--;
    while (byLap[b + 1] != null && byLap[b + 1] <= bestT + tol) b++;
    return [a, b];
  }
  // car: { tyre, tyreAge, stops }; lap: giro in corso; le soste sono a fine giro (pits = giri in cui si entra ai box).
  function strategies({ car, lap, totalLaps, pitLoss = 22, tol = 1.5 }) {
    const cur = COMPOUND[car.tyre] ? car.tyre : "M", age = car.tyreAge || 0, keys = Object.keys(COMPOUND);
    const options = [];
    // 1 sosta: box al giro p, poi un'altra mescola fino alla fine.
    const one = {}; let b1 = null;
    for (let p = lap + 1; p <= totalLaps - 1; p++) for (const x of keys) {
      if (x === cur) continue;
      const t = stint(cur, age, p - lap) + pitLoss + stint(x, 0, totalLaps - p);
      if (one[p] == null || t < one[p]) one[p] = t;
      if (!b1 || t < b1.t) b1 = { t, p, x };
    }
    if (b1) options.push({ stops: 1, pits: [b1.p], window: windowAround(one, b1.p, tol), compounds: [cur, b1.x], total: b1.t });
    // 2 soste: box ai giri p1 e p2 (stint di almeno 4 giri), almeno due mescole diverse.
    const two = {}; let b2 = null;
    for (let p1 = lap + 1; p1 <= totalLaps - 5; p1++) for (let p2 = p1 + 4; p2 <= totalLaps - 1; p2++) for (const x1 of keys) for (const x2 of keys) {
      if (x1 === cur && x2 === cur) continue;
      const t = stint(cur, age, p1 - lap) + pitLoss + stint(x1, 0, p2 - p1) + pitLoss + stint(x2, 0, totalLaps - p2);
      if (two[p1] == null || t < two[p1]) two[p1] = t;
      if (!b2 || t < b2.t) b2 = { t, p1, p2, x1, x2 };
    }
    if (b2) options.push({ stops: 2, pits: [b2.p1, b2.p2], window: windowAround(two, b2.p1, tol), compounds: [cur, b2.x1, b2.x2], total: b2.t });
    // Senza soste, solo se ci si è già fermati e le gomme arrivano alla fine.
    if (car.stops > 0 && age + (totalLaps - lap) <= COMPOUND[cur].life + 3) options.unshift({ stops: 0, pits: [], window: null, compounds: [cur], total: stint(cur, age, totalLaps - lap) });
    const best = Math.min(...options.map(o => o.total));
    let marked = false;
    options.forEach(o => { o.delta = r1(o.total - best); o.best = !marked && o.total === best; if (o.best) marked = true; });
    return { car: who(car), options };
  }

  /* ── FRENATA A CONFRONTO ──────────────────────────────────────────────── */
  // Zone di frenata di un giro di telemetria: velocità prima di frenare, alla fine della frenata, spazio di frenata
  // e decelerazione massima (in g) tra due punti vicini, come la "max g-force" delle grafiche TV.
  function brakeZones(tel) {
    const zones = [], n = tel.dist.length, ms = v => v / 3.6;
    for (let s = 1; s < n; s++) {
      if (!(tel.brake[s] && !tel.brake[s - 1])) continue;
      let k = s; while (k < n - 1 && tel.brake[k]) k++;          // primo punto senza freno
      let lo = k; for (let j = s; j <= Math.min(n - 1, k + 1); j++) if (tel.speed[j] < tel.speed[lo]) lo = j;
      const vt = tel.speed[s - 1], vl = tel.speed[lo], d = Math.max(1, tel.dist[k] - tel.dist[s - 1]);
      let g = 0;
      for (let j = s - 1; j < k; j++) { const dd = tel.dist[j + 1] - tel.dist[j]; if (dd > 0) g = Math.max(g, (ms(tel.speed[j]) ** 2 - ms(tel.speed[j + 1]) ** 2) / (2 * dd) / 9.81); }
      if (vl - vt <= -25) zones.push({ start: tel.dist[s - 1], top: vt, low: vl, drop: vl - vt, brakeM: Math.round(d), g: r1(g) });   // curve vere
      s = k;
    }
    return zones;
  }
  // Due piloti (ids) sull'ultimo giro: la curva con la frenata più forte e i numeri di entrambi.
  function braking({ st, telemetry, ids }) {
    const tel = ids.map(id => { const c = st.cars.find(x => x.id === id); return c && c.last ? telemetry(id, c.last.lapNo) : null; });
    if (!tel[0] || !tel[1]) return null;
    const za = brakeZones(tel[0]), zb = brakeZones(tel[1]);
    if (!za.length || !zb.length) return null;
    // La frenata più forte: il calo di velocità più grande, tra le frenate "secche" (non due curve di fila).
    const secche = za.map((z, i) => [z, i]).filter(([z]) => z.brakeM <= 160);
    let k = (secche.length ? secche : za.map((z, i) => [z, i])).reduce((m, x) => x[0].drop < m[0].drop ? x : m)[1];
    const near = zb.reduce((m, z) => Math.abs(z.start - za[k].start) < Math.abs(m.start - za[k].start) ? z : m, zb[0]);
    const pack = (t, z) => ({ id: t.id, code: t.code, lapNo: t.lapNo, top: z.top, low: z.low, drop: z.drop, brakeM: z.brakeM, g: z.g });
    return { turn: k + 1, a: pack(tel[0], za[k]), b: pack(tel[1], near) };
  }

  /* ── PAGELLA MONOPOSTO ───────────────────────────────────────────────────── */
  // Curve lente, medie o veloci: posizione tra tutti, voto su 10 e tempo perso al giro in quel tipo di curva.
  const hash = s => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return ((x >>> 0) % 10000) / 10000; };
  const SHARE = { lente: 0.3, medie: 0.35, veloci: 0.35 };
  function carScores({ st, lapsOf, kind = "medie", seed = 1, teamOf = {} }) {
    const K = SHARE[kind] ? kind : "medie";
    const rows = st.cars.map(c => {
      const a = avgLast(lapsOf(c.id), 5), base = a ? a.avg : c.best ? c.best.time : 999;
      return { ...who(c), v: base + (hash(seed + ":" + c.id + ":" + K) - 0.5) * 0.7 };
    }).sort((a, b) => a.v - b.v);
    const v0 = rows[0].v;
    const all = rows.map((r, i) => ({ id: r.id, code: r.code, color: r.color, pos: r.pos, rank: i + 1, score: r1(clamp(9.9 - (r.v - v0) * 2.2, 5, 10)), lost: r3((r.v - v0) * SHARE[K]) }));
    for (let i = 1; i < all.length; i++) all[i].score = Math.min(all[i].score, all[i - 1].score);
    // I due compagni di squadra del primo in gara (come nella grafica TV); se manca il compagno, i primi due.
    const lead = st.cars[0], mate = lead && st.cars.find(c => c.id !== lead.id && teamOf[c.id] && teamOf[c.id] === teamOf[lead.id]);
    const pair = lead && mate ? [lead.id, mate.id].map(id => all.find(x => x.id === id)) : all.slice(0, 2);
    return { kind: K, all, pair };
  }

  return { cleanLaps, avgLast, pairForecast, catchForecast, racePace, strategies, brakeZones, braking, carScores, COMPOUND };
});
