// Strumenti del weekend nel Garage (funzioni pure, testate in rtest/weekend.test.js sui dati veri 2026):
// degrado gomme per stint, strategie e punti del Tire Strategy Predictor, compagni a confronto (indice Over-Driving),
// scanner dell'assetto dalle prove libere e rilevatore di bluff (radio contro tempi).
// Formato dei dati di gara (real-weekend.js): per pilota t = tempi in millesimi giro per giro (0 = senza tempo),
// f = bandiere/box del giro (1 rientro, 2 uscita, 4 Safety Car, 8 VSC, 16 gialla, 32 rossa, 64 tempo cancellato),
// st = stint [mescola, primo giro, ultimo giro, gomme nuove 1/0, giri delle gomme al primo giro].
(function (root) {
  const FUEL = 0.03;                 // s al giro guadagnati perché la benzina cala (stima B&T)
  const BAD = 1 | 2 | 4 | 8 | 16 | 32 | 64;
  const COMP_NAME = { S: "Morbide", M: "Medie", H: "Dure", I: "Intermedie", W: "Da bagnato" };
  const median = a => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
  const r3 = v => Math.round(v * 1000) / 1000;
  // Retta robusta (Theil-Sen): pendenza = mediana delle pendenze tra tutte le coppie di giri, così un giro storto
  // (traffico, un errore) non la sposta. tc = a + b * age.
  function fit(P) {
    const sl = [];
    for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) if (P[j].age !== P[i].age) sl.push((P[j].tc - P[i].tc) / (P[j].age - P[i].age));
    const b = sl.length ? median(sl) : 0;
    return { a: median(P.map(p => p.tc - b * p.age)), b, n: P.length };
  }

  // ── Degrado gomme ───────────────────────────────────────────────────
  // Giri buoni di uno stint: senza i primi 3 giri della gara (partenza, gomme e freni ancora da scaldare), i giri di
  // rientro e uscita dai box, Safety Car, VSC, bandiere gialle o rosse, tempi cancellati e giri lentissimi (oltre il 4%
  // della mediana: traffico, errori). Non contano neanche i primi giri dello stint più lenti di oltre WARMUP secondi
  // della mediana dei 3 giri dopo: gomme ancora da scaldare o pista che si asciuga dopo la pioggia (Sepang 2026).
  const WARMUP = 1.0;
  // first: primo giro che conta (4 in gara; 1 nelle prove libere, dove contano solo i giri di uscita dai box).
  function stintPoints(D, si, raceLaps, first = 4) {
    const [c, from, to, , life0] = D.st[si], P = [];
    for (let lap = Math.max(from, first); lap <= to; lap++) {
      if (raceLaps && lap >= raceLaps) continue;                   // l'ultimo giro: spesso si alza il piede
      const ms = D.t[lap - 1], f = D.f[lap - 1] || 0;
      if (!ms || (f & BAD)) continue;
      const t = ms / 1000, age = (life0 || 1) + (lap - from);
      P.push({ lap, age, t, tc: t + FUEL * (lap - 1) });
    }
    const m = median(P.map(p => p.tc));
    let Q = P.filter(p => p.tc <= m * 1.04);
    while (Q.length >= 4 && Q[0].tc - median(Q.slice(1, 4).map(p => p.tc)) > WARMUP) Q = Q.slice(1);
    return { c, from, to, pts: Q };
  }
  // Giri buoni di tutti i piloti di una gara (giro → tempo corretto), per confrontare un pilota col gruppo.
  const GOOD = new WeakMap();
  function goodLaps(R) {
    if (GOOD.has(R)) return GOOD.get(R);
    const out = {};
    Object.entries(R.drivers).forEach(([code, D]) => { const m = {}; D.st.forEach((s, si) => stintPoints(D, si, R.laps).pts.forEach(p => { m[p.lap] = p.tc; })); out[code] = m; });
    GOOD.set(R, out); return out;
  }
  // Di quanto è cambiato il passo del gruppo tra i giri L0 (prima) e L1 (dopo): mediana degli altri piloti.
  function fieldShift(R, code, L1, L0) {
    const G = goodLaps(R), sh = [];
    Object.entries(G).forEach(([k, m]) => {
      if (k === code) return;
      const a = L1.map(l => m[l]).filter(v => v != null), b = L0.map(l => m[l]).filter(v => v != null);
      if (a.length >= 2 && b.length >= 3) sh.push(mean(a) - median(b));
    });
    return sh.length >= 3 ? median(sh) : 0;
  }
  // Degrado (s al giro, corretto per il carburante) e crollo: per almeno 3 giri di fila, fino alla fine dello stint,
  // ogni giro è più lento di oltre 0,4 s sia della retta dei giri prima sia della mediana dei 5 giri prima, e in media
  // di oltre 0,7 s → "crollo rilevato" (gomme che perdono di colpo: troppo calde o finite). Con la gara intera (R) il
  // calo deve essere di almeno mezzo secondo più di quello del gruppo negli stessi giri: se rallentano tutti (pioggia,
  // bandiere, risparmio di energia) non è la gomma. Degrado negativo = il passo migliora (benzina che cala, pista più
  // gommata). raceLaps: giri della gara (l'ultimo non conta).
  function degradation(D, si, raceLaps, R, code, first = 4) {
    const { c, from, to, pts } = stintPoints(D, si, raceLaps, first), n = pts.length;
    const out = { si, c, from, to, n: to - from + 1, used: n, slope: null, base: null, pts, cliff: null };
    if (n < 5) return out;
    let F = fit(pts), cliff = null;
    for (let k = Math.max(6, Math.ceil(n * 0.5)); k <= n - 3 && !cliff; k++) {
      const g = fit(pts.slice(0, k)), ref = median(pts.slice(Math.max(0, k - 5), k).map(p => p.tc));
      const res = pts.slice(k).map(p => p.tc - (g.a + g.b * p.age)), jump = pts.slice(k).map(p => p.tc - ref);
      if (!(res.every(r => r > 0.4) && jump.every(r => r > 0.4) && mean(res) > 0.7)) continue;
      // Negli ultimi 6 giri della gara si rallenta per tanti motivi (doppiaggi, risparmio, gestione): lì niente crollo.
      if (raceLaps && si === D.st.length - 1 && pts[k].lap > raceLaps - 6) continue;
      const field = R ? fieldShift(R, code, pts.slice(k).map(p => p.lap), pts.slice(Math.max(0, k - 5), k).map(p => p.lap)) : 0;
      if (mean(jump) - field > 0.5) { cliff = { lap: pts[k].lap, age: pts[k].age, loss: r3(mean(res)), field: r3(field) }; F = g; }
    }
    out.slope = r3(F.b); out.base = F.a; out.cliff = cliff;
    out.pts = pts.map(p => ({ ...p, fit: F.a + F.b * p.age }));
    return out;
  }
  // Tutti gli stint di una gara (almeno 5 giri buoni), dal degrado più basso; si può scegliere la mescola.
  function raceDeg(R, { compound } = {}) {
    const list = [];
    Object.entries(R.drivers).forEach(([code, D]) => D.st.forEach((s, si) => {
      if (compound && s[0] !== compound) return;
      // Nelle prove libere i giri dei piloti non sono negli stessi momenti: niente confronto col gruppo.
      const d = R.practice ? degradation(D, si, null, null, code, 1) : degradation(D, si, R.laps, R, code); if (d.slope == null) return;
      list.push({ code, team: D.team, ...d });
    }));
    return list.sort((a, b) => a.slope - b.slope);
  }

  // Una sessione di prove libere (public/data/f1/weekend.json: per pilota t, c mescola giro per giro, life, s numero
  // dello stint, f) come una gara per il degrado: gli stint dal numero di stint, mescola e giri delle gomme del primo giro.
  function practiceRace(P) {
    if (!P || typeof P !== "object") return null;
    const drivers = {};
    Object.entries(P).forEach(([code, e]) => {
      if (!e || !Array.isArray(e.t)) return;
      const st = [];
      for (let i = 0; i < e.t.length; i++) {
        const s0 = (e.s || [])[i], life = (e.life || [])[i] || 1;
        if (i === 0 || s0 !== (e.s || [])[i - 1]) st.push([(e.c || "")[i] || "?", i + 1, i + 1, life <= 1 ? 1 : 0, life]);
        else st[st.length - 1][2] = i + 1;
      }
      drivers[code] = { team: e.team || null, t: e.t, f: e.f || [], st };
    });
    return { circuitId: null, laps: null, drivers, practice: true };
  }

  // ── Strategia ───────────────────────────────────────────────────────
  const strategy = D => D.st.map(([c, from, to]) => ({ c, from, to }));
  const DRY = ["S", "M", "H"];
  // Previsione: [{ c: "M", to: 20 }, { c: "H", to: 56 }] (to = ultimo giro dello stint; l'ultimo è il traguardo).
  function validatePred(pred, laps) {
    const w = [];
    if (pred.length < 2) w.push("Serve almeno una sosta: in gara con l'asciutto si usano almeno due mescole.");
    else if (new Set(pred.map(s => s.c).filter(c => DRY.includes(c))).size < 2) w.push("Con l'asciutto il regolamento chiede almeno due mescole diverse.");
    let prev = 0; pred.forEach((s, i) => { if (s.to - prev < 3) w.push(`Lo stint ${i + 1} dura meno di 3 giri.`); prev = s.to; });
    if (pred.length && pred[pred.length - 1].to !== laps) w.push("L'ultimo stint deve arrivare alla bandiera a scacchi.");
    return { ok: !w.length, warnings: w };
  }
  // Punti contro la strategia vera: +10 stesse soste del vincitore, +4 per ogni stint con la sua mescola,
  // per ogni sosta +6 se entro 2 giri dalla sua (+3 entro 5), +5 se le mescole sono uguali a quelle di un pilota sul podio.
  function strategyPoints(pred, R) {
    const byPos = p => Object.entries(R.drivers).find(([, D]) => D.pos === p);
    const [wc, WD] = byPos(1) || []; if (!WD) return null;
    const win = strategy(WD), parts = { stops: 0, compounds: 0, laps: 0, podium: 0 };
    if (pred.length === win.length) parts.stops = 10;
    for (let i = 0; i < Math.min(pred.length, win.length); i++) if (pred[i].c === win[i].c) parts.compounds += 4;
    for (let i = 0; i < Math.min(pred.length, win.length) - 1; i++) { const d = Math.abs(pred[i].to - win[i].to); parts.laps += d <= 2 ? 6 : d <= 5 ? 3 : 0; }
    const seq = s => s.map(x => x.c).join("");
    const pod = [1, 2, 3].map(byPos).filter(Boolean);
    if (pod.some(([, D]) => seq(strategy(D)) === seq(pred))) parts.podium = 5;
    return { total: parts.stops + parts.compounds + parts.laps + parts.podium, parts, winner: wc, podium: pod.map(([c]) => c) };
  }
  // Strategie scelte dalla community (demo): sempre uguali per la stessa gara, in percentuale (somma 100).
  function communityPicks(seed, laps) {
    let s = seed * 9301 + 49297; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const a = Math.round(laps * 0.42), b = Math.round(laps * 0.3), c2 = Math.round(laps * 0.66);
    const opts = [
      { key: "MH", label: "1 sosta · Medie → Dure", stints: [{ c: "M", to: a }, { c: "H", to: laps }] },
      { key: "HM", label: "1 sosta · Dure → Medie", stints: [{ c: "H", to: Math.round(laps * 0.58) }, { c: "M", to: laps }] },
      { key: "SH", label: "1 sosta · Morbide → Dure", stints: [{ c: "S", to: b }, { c: "H", to: laps }] },
      { key: "MHM", label: "2 soste · Medie → Dure → Medie", stints: [{ c: "M", to: b }, { c: "H", to: c2 }, { c: "M", to: laps }] },
      { key: "SMS", label: "2 soste · Morbide → Medie → Morbide", stints: [{ c: "S", to: Math.round(laps * 0.25) }, { c: "M", to: Math.round(laps * 0.7) }, { c: "S", to: laps }] },
    ];
    const w = opts.map((o, i) => (i === 0 ? 3.2 : i === 1 ? 1.8 : 1) * (0.6 + rnd()));
    const tot = w.reduce((x, y) => x + y, 0), pct = w.map(x => Math.floor(x / tot * 100));
    let left = 100 - pct.reduce((x, y) => x + y, 0); for (let i = 0; left > 0; i = (i + 1) % pct.length, left--) pct[i]++;
    return opts.map((o, i) => ({ ...o, pct: pct[i] })).sort((x, y) => y.pct - x.pct);
  }

  // ── Compagni a confronto ────────────────────────────────────────────
  // Qualifica: l'ultima fase (Q3, Q2 o Q1) in cui hanno fatto un tempo tutti e due. pct = tempo del compagno / tempo
  // del pilota × 100: sopra 100 il pilota è stato più veloce ("estrae il 100,4% dal telaio").
  function qualiDuel(A, B) {
    for (let i = 2; i >= 0; i--) if (A.q[i] && B.q[i]) return { seg: "Q" + (i + 1), a: A.q[i], b: B.q[i], pct: B.q[i] / A.q[i] * 100 };
    return null;
  }
  // Passo gara: mediana dei giri buoni (corretti per il carburante), almeno 8.
  function racePace(D, raceLaps) {
    const T = [];
    D.st.forEach((s, si) => stintPoints(D, si, raceLaps).pts.forEach(p => T.push(p.tc)));
    return T.length >= 8 ? median(T) : null;
  }
  function teammates(W, team) {
    const count = {};
    W.quali.forEach(q => Object.entries(q.drivers).forEach(([c, d]) => { if (d.team === team) count[c] = (count[c] || 0) + 1; }));
    const pair = Object.keys(count).sort((a, b) => count[b] - count[a]).slice(0, 2);
    const [A, B] = pair, events = [], h2h = { quali: [0, 0], race: [0, 0], finish: [0, 0] }, pcts = { [A]: [], [B]: [] };
    W.quali.forEach(q => {
      const r = W.races.find(x => x.round === q.round), e = { circuitId: q.circuitId, round: q.round, quali: null, race: null };
      const QA = q.drivers[A], QB = q.drivers[B];
      if (QA && QB && QA.team === team && QB.team === team) {
        const d = qualiDuel(QA, QB);
        if (d) { e.quali = d; h2h.quali[d.a < d.b ? 0 : 1]++; pcts[A].push(d.pct); pcts[B].push(d.a / d.b * 100); }
      }
      if (r && r.drivers[A] && r.drivers[B]) {
        const pa = racePace(r.drivers[A], r.laps), pb = racePace(r.drivers[B], r.laps), PA = r.drivers[A].pos, PB = r.drivers[B].pos;
        e.race = { a: pa, b: pb, posA: PA, posB: PB, pct: pa && pb ? pb / pa * 100 : null };
        if (pa && pb) h2h.race[pa < pb ? 0 : 1]++;
        if (PA && PB) h2h.finish[PA < PB ? 0 : 1]++;
      }
      events.push(e);
    });
    // Indice Over-Driving: mediana delle qualifiche (un giro storto o un guasto non lo rovinano come la media).
    const index = { [A]: median(pcts[A]), [B]: median(pcts[B]) };
    return { team, pair, events, h2h, index };
  }

  // ── Scanner dell'assetto (prove libere) ─────────────────────────────
  // Programmi di lavoro: "quali" = stint corto con un giro al massimo (entro l'1,5% del migliore), "long" = almeno 5 giri
  // costanti tra il 102% e il 110% del migliore (simulazione di gara). E = pilota in una sessione (real-weekend.js).
  function runs(E) {
    const best = E.best ? E.best.ms : Math.min(...E.t.filter(Boolean)), out = [];
    const ids = [...new Set(E.s)];
    ids.forEach(sid => {
      const idx = E.s.map((s, i) => s === sid ? i : -1).filter(i => i >= 0);
      const ok = idx.filter(i => E.t[i] && !(E.f[i] & (1 | 2 | 32 | 64)));
      if (!ok.length) return;
      const c = E.c[idx[0]], push = ok.filter(i => E.t[i] <= best * 1.015);
      const med = median(ok.map(i => E.t[i]));
      const lr = ok.filter(i => E.t[i] >= best * 1.02 && E.t[i] <= best * 1.10 && Math.abs(E.t[i] - med) <= med * 0.03);
      if (lr.length >= 5) out.push({ kind: "long", c, laps: lr.length, avg: Math.round(mean(lr.map(i => E.t[i]))), best: Math.min(...lr.map(i => E.t[i])), from: idx[0] + 1, to: idx[idx.length - 1] + 1 });
      else if (push.length) out.push({ kind: "quali", c, laps: push.length, avg: null, best: Math.min(...push.map(i => E.t[i])), from: idx[0] + 1, to: idx[idx.length - 1] + 1 });
    });
    return out;
  }
  // Profilo delle scuderie: velocità di punta e velocità minime in curva (media dei due piloti, dal loro giro più
  // veloce), confrontate con la mediana del gruppo. Etichette: "scarico" (ala piccola: veloce in rettilineo, lento in
  // curva), "carico" (il contrario), "efficiente" (veloce dappertutto), "difficolta" (lento dappertutto), "medio".
  function profile(S) {
    const by = {};
    Object.entries(S).forEach(([code, E]) => { if (!E.team || !E.best || !E.best.vmax) return; (by[E.team] = by[E.team] || []).push([code, E]); });
    const teams = Object.entries(by).map(([team, L]) => {
      const corner = E => mean([E.best.medium, E.best.fast].filter(v => v != null)) ?? E.best.slow;
      const long = L.flatMap(([code, E]) => runs(E).filter(r => r.kind === "long").map(r => ({ code, ...r }))).sort((a, b) => b.laps - a.laps || a.avg - b.avg)[0] || null;
      return { team, drivers: L.map(([c]) => c), top: mean(L.map(([, E]) => E.best.vmax)), corner: mean(L.map(([, E]) => corner(E))),
        slow: mean(L.map(([, E]) => E.best.slow).filter(v => v != null)), full: mean(L.map(([, E]) => E.best.full).filter(v => v != null)),
        best: Math.min(...L.map(([, E]) => E.best.ms)), bestBy: L.slice().sort((a, b) => a[1].best.ms - b[1].best.ms)[0][0], long };
    });
    const mTop = median(teams.map(t => t.top)), mCor = median(teams.map(t => t.corner));
    teams.forEach(t => {
      t.dTop = Math.round((t.top - mTop) * 10) / 10; t.dCorner = Math.round((t.corner - mCor) * 10) / 10;
      t.label = t.dTop >= 3 && t.dCorner <= -1.5 ? "scarico" : t.dTop <= -3 && t.dCorner >= 1.5 ? "carico" : t.dTop >= 1 && t.dCorner >= 1 ? "efficiente" : t.dTop <= -1 && t.dCorner <= -1 ? "difficolta" : "medio";
    });
    return { teams: teams.sort((a, b) => a.best - b.best), mTop, mCorner: mCor };
  }

  // ── Rilevatore di bluff ─────────────────────────────────────────────
  // L = giri del pilota [{ lap, t (s), pit (rientra ai box in quel giro), slow (SC/VSC/gialla) }], claim = giro della radio.
  // Si confrontano i 3 giri dopo la radio con i 3 prima. Vero se rientra ai box entro 3 giri o se perde più di mezzo
  // secondo al giro; bluff se va come prima (meno di 0,25 s); altrimenti "da capire". others = giri degli altri piloti:
  // se ci sono, conta quanto perde il pilota in più del gruppo (benzina, pista e bandiere valgono per tutti).
  function windowDelta(L, claim) {
    const ok = x => x.t && !x.slow;
    const pit = L.find(x => x.pit && x.lap >= claim && x.lap <= claim + 3);
    const before = L.filter(x => x.lap < claim && x.lap >= claim - 3 && ok(x) && !x.pit).map(x => x.t);
    const after = L.filter(x => x.lap > claim && x.lap <= claim + 3 && ok(x) && !x.pit && !(pit && x.lap >= pit.lap)).map(x => x.t);
    const b = mean(before), a = mean(after);
    return { pit, b, a, delta: a != null && b != null && before.length >= 2 && after.length >= 2 ? r3(a - b) : null };
  }
  function bluffVerdict(L, claim, others = []) {
    const own = windowDelta(L, claim), base = { before: own.b, after: own.a, delta: own.delta };
    if (own.pit) return { kind: "vero", pitLap: own.pit.lap, ...base, rel: null, ref: null };
    const refs = others.map(o => windowDelta(o, claim)).filter(x => !x.pit && x.delta != null).map(x => x.delta);
    const ref = refs.length >= 3 ? r3(median(refs)) : null;
    if (own.delta == null) return { kind: "dubbio", pitLap: null, ...base, rel: null, ref };
    const rel = r3(own.delta - (ref || 0));
    return { kind: rel > 0.5 ? "vero" : rel < 0.25 ? "bluff" : "dubbio", pitLap: null, ...base, rel, ref };
  }
  // Giri di un pilota per il rilevatore (dal formato dei dati di gara).
  const lapsOf = (R, code) => { const D = R.drivers[code]; return D ? D.t.map((ms, i) => ({ lap: i + 1, t: ms / 1000, pit: !!(D.f[i] & 1), slow: !!(D.f[i] & (2 | 4 | 8 | 16 | 32)) })) : []; };
  // Radio simulate per la demo (nell'anteprima non ci sono le radio vere scritte): 2 giri prima di una sosta su due
  // "le gomme sono finite"; per un pilota su tre la stessa frase a metà del primo stint, quando le gomme vanno ancora bene.
  // truth serve solo ai test (dice come è stata scritta la radio): l'app mostra il giudizio del rilevatore.
  const RADIO_TYRES = ["Le gomme sono finite!", "Non ho più grip al posteriore.", "Le anteriori stanno morendo.", "Così non arrivo alla fine dello stint."];
  function demoClaims(R) {
    const out = [];
    Object.entries(R.drivers).forEach(([code, D], ci) => {
      D.f.forEach((x, i) => { const lap = i - 1; if ((x & 1) && (ci + i) % 2 === 0 && lap >= 5 && !(D.f[lap - 1] & 1)) out.push({ code, lap, text: RADIO_TYRES[(ci + i) % RADIO_TYRES.length], truth: "vero" }); });
      if (ci % 3 === 1 && D.st.length) {
        const [, from, to] = D.st[0], lap = Math.round(from + (to - from) * 0.45);
        if (lap >= 6 && lap <= to - 5) out.push({ code, lap, text: RADIO_TYRES[ci % RADIO_TYRES.length], truth: "bluff" });
      }
    });
    return out.sort((a, b) => a.lap - b.lap || a.code.localeCompare(b.code));
  }
  // Dal simulatore della diretta al formato dei dati veri: giri, bandiere, box e stint (gomme e giri delle gomme).
  function fromSim({ totalLaps, cars }) {
    const FLAG = { sc: 4, vsc: 8, yellow: 16, red: 32 }, drivers = {};
    cars.forEach(c => {
      const L = c.laps.slice().sort((a, b) => a.lapNo - b.lapNo), t = [], f = [], st = [];
      L.forEach((r, i) => {
        t.push(Math.round(r.time * 1000));
        f.push((FLAG[r.flag] || 0) | (r.pitIn ? 1 : 0) | (i > 0 && L[i - 1].pitIn ? 2 : 0));
        if (i === 0 || L[i - 1].pitIn) st.push([r.tyre || "?", r.lapNo, r.lapNo, 1, (r.age || 0) + 1]); else st[st.length - 1][2] = r.lapNo;
      });
      drivers[c.code] = { team: c.team, pos: c.pos, n: L.length, t, f, st };
    });
    return { laps: totalLaps, drivers };
  }

  const api = { FUEL, COMP_NAME, median, degradation, raceDeg, practiceRace, strategy, validatePred, strategyPoints, communityPicks, qualiDuel, racePace, teammates, runs, profile, bluffVerdict, lapsOf, demoClaims, fromSim };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.BtWeekendLogic = api;
})(typeof window !== "undefined" ? window : globalThis);
