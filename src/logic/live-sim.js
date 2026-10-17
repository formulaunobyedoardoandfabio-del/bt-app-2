// Simulatore della diretta B&T: prove libere, qualifiche e gara con dati finti ma realistici.
// Le forme dei dati ricalcano quelle di OpenF1 (posizioni in pista, giri, settori, minisettori,
// direzione gara, meteo, telemetria): nell'app vera si sostituiscono con i dati reali senza toccare le schermate.
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.LiveSim = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  // Numeri casuali ripetibili (stesso seme → stessa sessione), utili per i test e per la demo.
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmtLap = t => {
    if (t == null || !isFinite(t)) return "–";
    const m = Math.floor(t / 60), s = t - m * 60;
    return (m ? m + ":" + (s < 10 ? "0" : "") : "") + s.toFixed(3);
  };
  const fmtClock = sec => { sec = Math.max(0, Math.ceil(sec)); const m = Math.floor(sec / 60), s = sec % 60; return m + ":" + (s < 10 ? "0" : "") + s; };

  /* ── TRACCIATO ──────────────────────────────────────────────────────── */
  const N = 800;                 // punti del tracciato ricampionato
  const MINIS = 24, PER_SECTOR = 8;
  const A_LAT = 44, V_MAX = 93, A_BRK = 42;
  // Giro di riferimento in gara (secondi), per tarare le velocità del tracciato su tempi realistici.
  const REF_LAP = {
    "au-1953": 80.5, "cn-2004": 96.0, "jp-1962": 93.5, "us-2022": 90.5, "ca-1978": 74.5, "mc-1929": 74.5, "es-1991": 77.5, "at-1969": 67.5,
    "gb-1948": 89.5, "be-1925": 106.0, "hu-1986": 80.5, "nl-1948": 73.0, "it-1922": 82.0, "es-2026": 90.0, "az-2016": 105.0, "my-1999": 97.0, "sg-2008": 94.5,
    "us-2012": 98.0, "mx-1962": 80.5, "br-1940": 73.0, "us-2023": 96.0, "qa-2004": 84.5, "ae-2009": 87.5,
  };
  const accel = v => Math.max(2.8, 14 - 0.12 * v);   // accelerazione (m/s²) che cala con la velocità

  // circuit = { name, len (metri), pts: "x,y x,y ..." nel riquadro 1600×900 }
  function buildTrack(circuit) {
    const raw = circuit.pts.trim().split(/\s+/).map(p => p.split(",").map(Number));
    const segs = []; let L = 0;
    for (let i = 0; i < raw.length; i++) {
      const a = raw[i], b = raw[(i + 1) % raw.length], d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      segs.push({ a, b, d, s0: L }); L += d;
    }
    const pts = []; let k = 0;
    for (let i = 0; i < N; i++) {
      const target = L * i / N;
      while (k < segs.length - 1 && segs[k].s0 + segs[k].d < target) k++;
      const sg = segs[k], f = sg.d ? (target - sg.s0) / sg.d : 0;
      pts.push([sg.a[0] + (sg.b[0] - sg.a[0]) * f, sg.a[1] + (sg.b[1] - sg.a[1]) * f]);
    }
    const lenM = circuit.len, mPerUnit = lenM / L, ds = lenM / N;
    // Curvatura (1/raggio, in metri) su tre punti distanti, poi lisciata.
    const K = 2, kap = new Array(N);
    for (let i = 0; i < N; i++) {
      const p0 = pts[(i - K + N) % N], p1 = pts[i], p2 = pts[(i + K) % N];
      const a = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) * mPerUnit, b = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) * mPerUnit;
      const c = Math.hypot(p2[0] - p0[0], p2[1] - p0[1]) * mPerUnit;
      const cross = Math.abs((p1[0] - p0[0]) * (p2[1] - p0[1]) - (p1[1] - p0[1]) * (p2[0] - p0[0])) * mPerUnit * mPerUnit;
      kap[i] = a * b * c > 0 ? 2 * cross / (a * b * c) : 0;
    }
    const W = 3, ks = kap.map((_, i) => { let s = 0; for (let j = -W; j <= W; j++) s += kap[(i + j + N) % N]; return s / (2 * W + 1); });
    // Velocità massima in ogni punto: limite in curva, poi accelerazione in uscita e frenata in ingresso.
    const lim = ks.map(kk => Math.min(V_MAX, Math.sqrt(A_LAT / Math.max(kk, 1e-6))));
    const v = lim.slice();
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < N; i++) { const j = (i + 1) % N; v[j] = Math.min(v[j], Math.sqrt(v[i] * v[i] + 2 * accel(v[i]) * ds)); }
      for (let i = N - 1; i >= 0; i--) { const j = (i + 1) % N; v[i] = Math.min(v[i], Math.sqrt(v[j] * v[j] + 2 * A_BRK * ds)); }
    }
    let lapTime = 0;
    for (let i = 0; i < N; i++) lapTime += ds / ((v[i] + v[(i + 1) % N]) / 2);
    // Taratura: stesse proporzioni tra curve e rettilinei, ma tempo sul giro realistico per quel circuito.
    const ref = REF_LAP[circuit.id];
    if (ref) { const k = lapTime / ref; for (let i = 0; i < N; i++) v[i] *= k; lapTime = ref; }
    const speedAt = s => { const x = ((s % lenM) + lenM) % lenM / ds, i = Math.floor(x) % N, f = x - Math.floor(x); return v[i] * (1 - f) + v[(i + 1) % N] * f; };
    const pointAt = s => { const x = ((s % lenM) + lenM) % lenM / ds, i = Math.floor(x) % N, f = x - Math.floor(x), a = pts[i], b = pts[(i + 1) % N]; return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; };
    // Percorso SVG del tracciato e dei tre settori (confini stimati, come su F1Dash).
    const toD = (from, to) => { let d = ""; for (let i = from; i <= to; i++) { const p = pts[i % N]; d += (i === from ? "M" : "L") + p[0].toFixed(1) + "," + p[1].toFixed(1); } return d; };
    return {
      name: circuit.name, lenM, n: N, ds, pts, speed: v, lapTime, speedAt, pointAt,
      d: toD(0, N) + "Z", sectorD: [toD(0, Math.round(N / 3)), toD(Math.round(N / 3), Math.round(2 * N / 3)), toD(Math.round(2 * N / 3), N)],
    };
  }

  /* ── SESSIONE ───────────────────────────────────────────────────────── */
  const STATUS_BG = { yellow: "yellow", sc: "yellow", vsc: "yellow", red: "red" };
  // Segmenti delle qualifiche: [nome, durata, eliminati]. Nei weekend Sprint c'è anche la Qualifica Sprint (SQ1-SQ3).
  const QUALI_SEGS = { QUALI: [["Q1", 18 * 60, 6], ["Q2", 15 * 60, 6], ["Q3", 12 * 60, 0]], SQ: [["SQ1", 12 * 60, 6], ["SQ2", 10 * 60, 6], ["SQ3", 8 * 60, 0]] };
  const BREAK = 90;

  function createSession({ track, drivers, type = "RACE", seed = 1, script = true, laps, startClock = 15 * 3600 }) {
    const R = rng(seed);
    const RT = rng(seed * 7 + 99);   // gomme e soste (serie a parte, così il resto della gara non cambia)
    // Durata delle gomme in giri (demo): morbide 16-21, medie 24-30, dure 32-40. Poi si va ai box.
    const TYRE_LIFE = { S: [16, 21], M: [24, 30], H: [32, 40] };
    // In gara le gomme contano anche sul passo: morbide più veloci ma calano prima, dure più lente ma costanti
    // (secondi al giro rispetto alle medie nuove, poi calo per ogni giro fatto). Gli stessi numeri delle strategie B&T Insights.
    const TYRE_PACE = { S: [-0.55, 0.085], M: [0, 0.055], H: [0.35, 0.038] };
    const tyreFactor = c => { if (!isRace) return 1; const [off, deg] = TYRE_PACE[c.tyre] || TYRE_PACE.M; return 1 + (off + deg * c.tyreAge) / track.lapTime; };
    const lifeOf = ty => { const [a, b] = TYRE_LIFE[ty] || TYRE_LIFE.M; return a + Math.floor(RT() * (b - a + 1)); };
    const L = track.lenM, miniLen = L / MINIS;
    const isRace = type === "RACE" || type === "SPRINT", isQuali = type === "QUALI" || type === "SQ";
    const QUALI = QUALI_SEGS[type] || QUALI_SEGS.QUALI;
    const raceWord = type === "SPRINT" ? "SPRINT" : "GARA";
    const totalLaps = isRace ? (laps || Math.ceil((type === "SPRINT" ? 100000 : 305000) / L)) : 0;   // Sprint: circa 100 km
    let t = 0, flag = "green", flagSector = null, finished = false, flagSince = 0;
    let segIdx = 0, clock = isQuali ? QUALI[0][1] : isRace ? 0 : 60 * 60, waiting = 0, segEnded = false;
    const messages = [];
    const bestMini = new Array(MINIS).fill(Infinity), bestSector = [Infinity, Infinity, Infinity];
    let bestLap = null;
    const firstCross = [];           // per ogni linea di cronometraggio: quando è passato il primo
    const timers = [];               // azioni del copione da eseguire dopo un certo tempo

    const cars = drivers.map((d, i) => {
      const c = {
        id: d.id, code: d.code, number: d.number, color: d.color, grid: i,
        pace: 1 + i * 0.0012 + (R() - 0.5) * 0.002,           // > 1 = più lento
        total: isRace ? -18 - i * 8 : -(R() * L * 0.9),        // in gara: griglia dietro la linea
        v: 0, nextB: 1, miniStart: 0, lapStart: 0,
        curMini: new Array(MINIS).fill(null), curStatus: new Array(MINIS).fill("none"), curSector: [null, null, null],
        bestMini: new Array(MINIS).fill(Infinity), bestSector: [Infinity, Infinity, Infinity],
        last: null, best: null, laps: [], cross: [], lapNoise: 1, lapKind: "push",
        garage: !isRace, garageUntil: isRace ? 0 : R() * (isQuali ? 150 : 240), out: false, outIn: null, stopAt: null, finished: false, dnf: null,
        tyre: ["M", "M", "H", "S"][Math.floor(R() * 4)], tyreAge: 0, stops: 0, pitHold: 0,
      };
      c.tyreLife = lifeOf(c.tyre);
      if (!isRace) c.nextB = Math.floor(c.total / miniLen) + 1;
      return c;
    });

    const say = (text, cat = "Other", extra = {}) => {
      const clockSec = startClock + t;
      const hh = Math.floor(clockSec / 3600) % 24, mm = Math.floor(clockSec / 60) % 60, ss = Math.floor(clockSec) % 60;
      messages.push({ t, time: [hh, mm, ss].map(x => String(x).padStart(2, "0")).join(":"), lap: currentLap(), cat, text, ...extra });
    };
    const carLabel = c => `AUTO ${c.number} (${c.code})`;
    // Un pilota a caso tra quelle posizioni (solo tra chi è ancora in gara).
    const pick = (fromPos, toPos) => { const all = order(), r = all.filter(c => !c.dnf), o = r.length ? r : all; return o[Math.min(o.length - 1, fromPos + Math.floor(R() * (toPos - fromPos)))]; };

    // In gara i ritirati vanno in fondo (prima chi ha fatto più strada), come nei tempi ufficiali.
    function order() {
      if (isRace) return cars.slice().sort((a, b) => (a.dnf ? 1 : 0) - (b.dnf ? 1 : 0) || b.total - a.total);
      const rank = c => c.out ? (c.outIn === QUALI[1][0] ? 1 : 2) : 0;
      return cars.slice().sort((a, b) => rank(a) - rank(b) || ((a.best ? a.best.time : 1e9) - (b.best ? b.best.time : 1e9)) || a.grid - b.grid);
    }
    const running = () => { const r = cars.filter(c => !c.dnf); return r.length ? r : cars; };
    const leader = () => running().reduce((m, c) => c.total > m.total ? c : m, running()[0]);
    function currentLap() {
      if (!isRace) return null;
      return clamp(Math.floor(Math.max(0, leader().total) / L) + 1, 1, totalLaps);
    }

    // Ritiro in gara, con la causa: incidente (errore del pilota), motore, incendio, penalità (bandiera nera) o altro.
    // La macchina si ferma, sparisce dalla mappa e va in fondo alla classifica; la direzione gara lo annuncia.
    const DNF_CAUSES = ["incidente", "motore", "incendio", "penalita", "altro"];
    let dnfSeq = 0;
    function retire(id, cause) {
      if (!isRace) return false;
      const c = cars.find(x => x.id === id);
      if (!c || c.dnf || c.finished) return false;
      const k = DNF_CAUSES.includes(cause) ? cause : "altro";
      const lap = clamp(Math.floor(Math.max(0, c.total) / L) + 1, 1, totalLaps);
      const turn = 1 + ((c.number * 7 + lap * 3) % 15);
      c.dnf = { cause: k, lap, t, seq: ++dnfSeq };
      c.v = 0; c.pitHold = 0; c.stopAt = null;
      say({
        incidente: `INCIDENTE: ${carLabel(c)} FINISCE CONTRO LE BARRIERE IN CURVA ${turn}, RITIRATO`,
        motore: `${carLabel(c)} SI FERMA IN PISTA: PROBLEMA AL MOTORE, RITIRATO`,
        incendio: `INCENDIO SULLA ${carLabel(c)}: IL PILOTA È SCESO ED È IN SALVO, RITIRATO`,
        penalita: `BANDIERA NERA PER ${carLabel(c)}: SQUALIFICA PER TROPPE PENALITÀ, RITIRATO`,
        altro: `${carLabel(c)} RITIRATO`,
      }[k], "Other", { dnf: c.id, cause: k });
      return true;
    }
    // Nel copione: il pilota indicato, oppure (se non c'è o è già fuori) uno a caso in quelle posizioni.
    function retireScripted(code, cause, from, to) {
      const c = cars.find(x => x.code === code && !x.dnf && !x.finished) || pick(from, to);
      if (c && !c.dnf) retire(c.id, cause);
    }

    function setFlag(kind, sector) {
      const prev = flag;
      if (kind === prev && (kind !== "yellow" || sector === flagSector)) return;
      flag = kind; flagSector = kind === "yellow" ? (sector || 2) : null; flagSince = t;
      if (kind === "yellow") say(`BANDIERA GIALLA NEL SETTORE ${flagSector}`, "Flag", { flag: "YELLOW", sector: flagSector });
      else if (kind === "vsc") say("VIRTUAL SAFETY CAR IN VIGORE", "SafetyCar", { flag: "VSC" });
      else if (kind === "sc") { say("SAFETY CAR IN PISTA", "SafetyCar", { flag: "SC" }); if (isRace) say("OVERTAKE MODE DISABILITATO", "Overtake"); }
      else if (kind === "red") {
        say(isRace ? `BANDIERA ROSSA: ${raceWord} SOSPESA` : "BANDIERA ROSSA: SESSIONE SOSPESA", "Flag", { flag: "RED" });
        // Tutti ai box: rallentano e si fermano in fila prima della linea.
        order().forEach((c, i) => { c.stopAt = (Math.floor(c.total / L) + 1) * L - 30 - i * 12; if (c.stopAt < c.total) c.stopAt += L; });
      } else if (kind === "green") {
        if (prev === "yellow") say(`PISTA LIBERA NEL SETTORE ${flagSector || 2}`, "Flag", { flag: "CLEAR" });
        else if (prev === "vsc") say("VIRTUAL SAFETY CAR IN CHIUSURA", "SafetyCar", { flag: "VSC ENDING" });
        else if (prev === "sc") say("SAFETY CAR RIENTRA: PISTA LIBERA", "SafetyCar", { flag: "SC ENDING" });
        else if (prev === "red") say(isRace ? "RIPARTENZA: SEMAFORO VERDE" : "SESSIONE RIPRESA: SEMAFORO VERDE", "Flag", { flag: "GREEN" });
        cars.forEach(c => { c.stopAt = null; });
        flagSector = null;
      }
    }

    // Copione della gara demo: un evento di ogni tipo nei primi giri, poi messaggi sparsi.
    const events = !script ? [] : isRace ? [
      [1.02, () => say(`SEMAFORO VERDE: VIA ALLA ${raceWord}`, "Flag", { flag: "GREEN" })],
      [1.9, () => say("OVERTAKE MODE ABILITATO", "Overtake")],
      [2.45, () => { const c = pick(8, 15); say(`LIMITI DELLA PISTA: ${carLabel(c)}, TEMPO ${fmtLap(c.last ? c.last.time : track.lapTime)} CANCELLATO, CURVA 7 GIRO ${currentLap() - 1}`, "Other"); }],
      [3.3, () => {
        setFlag("yellow", 2);
        const a = cars.find(c => c.code === "LEC") || pick(3, 8), b = cars.find(c => c.code === "HAM") || pick(4, 9);
        say(`INCIDENTE: ${carLabel(a)} E ${carLabel(b)} IN CURVA 10, SARÀ INVESTIGATO DOPO LA GARA`, "Other");
      }],
      [3.62, () => setFlag("green")],
      // Ritiri della gara demo, uno per ogni causa: motore (poi VSC), incidente (poi SC), incendio, troppe penalità.
      [4.12, () => retireScripted("BOT", "motore", 14, 21)],
      [4.2, () => setFlag("vsc")],
      [4.62, () => setFlag("green")],
      [5.3, () => { const c = cars.find(x => x.code === "SAI") || pick(6, 12); say(`PENALITÀ DI 5 SECONDI PER ${carLabel(c)}: HA CAUSATO UNA COLLISIONE`, "Other"); }],
      [6.12, () => retireScripted("STR", "incidente", 12, 20)],
      [6.2, () => setFlag("sc")],
      [7.05, () => say("SAFETY CAR RIENTRA IN QUESTO GIRO", "SafetyCar")],
      [7.9, () => setFlag("green")],
      [8.15, () => say("OVERTAKE MODE ABILITATO", "Overtake")],
      [8.4, () => { setFlag("red"); timers.push([t + 50, () => say(`LA ${raceWord} RIPRENDERÀ TRA POCHI MINUTI`, "Other")], [t + 90, () => setFlag("green")]); }],
      [10.4, () => { retireScripted("COL", "incendio", 10, 18); setFlag("yellow", 3); }],
      [10.75, () => setFlag("green")],
      [11.5, () => { const c = cars.find(x => x.code === "LAW" && !x.dnf) || pick(8, 16); c.penaltyFor = true; say(`PENALITÀ DI 5 SECONDI PER ${carLabel(c)}: LIMITI DELLA PISTA SUPERATI TROPPE VOLTE`, "Other"); }],
      [12.6, () => { const c = cars.find(x => x.penaltyFor && !x.dnf) || pick(8, 16); c.penaltyFor = true; say(`PENALITÀ DI 10 SECONDI PER ${carLabel(c)}: HA CAUSATO UNA COLLISIONE (SECONDA PENALITÀ)`, "Other"); }],
      [13.6, () => { const c = cars.find(x => x.penaltyFor && !x.dnf); if (c) retire(c.id, "penalita"); else retireScripted("LAW", "penalita", 8, 16); }],
    ] : [];
    let evIdx = 0, nextRandom = isRace ? 11 : 1e9;

    function randomMessage() {
      const r = R();
      if (r < 0.3) { const c = pick(5, 18); say(`LIMITI DELLA PISTA: ${carLabel(c)}, TEMPO ${fmtLap(c.last ? c.last.time : track.lapTime)} CANCELLATO, CURVA ${3 + Math.floor(R() * 15)}`); }
      else if (r < 0.5) { const a = pick(3, 12), b = pick(4, 14); if (a !== b) say(`INCIDENTE TRA ${carLabel(a)} E ${carLabel(b)} IN CURVA ${1 + Math.floor(R() * 18)} ANNOTATO, IN FASE DI INVESTIGAZIONE`); }
      else if (r < 0.65) { const c = pick(2, 14); say(`INVESTIGAZIONE SU ${carLabel(c)}: NESSUNA ULTERIORE AZIONE`); }
      else if (r < 0.8) { const c = pick(6, 20); say(`PENALITÀ DI 10 SECONDI PER ${carLabel(c)}: INGRESSO IN PIT LANE NON CONSENTITO`); }
      else { const o = order().filter(x => !x.dnf); const c = o[Math.max(0, o.length - 1 - Math.floor(R() * 4))]; say(`BANDIERA BLU PER ${carLabel(c)}`, "Flag", { flag: "BLUE" }); }
    }

    function runKindFactor(c) {
      if (isRace) return 1;
      return c.lapKind === "push" ? 1 : c.lapKind === "out" ? 1.3 : 1.22;
    }

    function stepCar(c, dt, ahead) {
      if (c.garage || c.dnf) { c.v = 0; return; }
      if (c.pitHold > 0) { c.pitHold -= dt; c.v = 0; return; }   // sosta ai box (sulla linea, dove c'è la corsia box)
      const s = ((c.total % L) + L) % L;
      let f = 1;
      if (flag === "yellow" && Math.floor(s / (L / 3)) + 1 === flagSector) f = 0.9;
      if (flag === "vsc") f = 0.7;
      if (flag === "sc") f = ahead ? 0.98 : 0.6;
      if (flag === "red") f = 0.6;
      if (c.finished) f = 0.55;
      let target = track.speedAt(s) * f / (c.pace * c.lapNoise * runKindFactor(c) * tyreFactor(c));
      // Safety car: nessun sorpasso e si resta a 25 m dalla macchina davanti.
      if (flag === "sc" && ahead) {
        const gapM = ahead.total - c.total;       // si avvicina fino a circa 30 m e poi segue la macchina davanti
        if (gapM < 70) target = Math.min(target, ahead.v * (gapM > 35 ? 1.08 : gapM < 26 ? 0.9 : 1));
      }
      if (c.stopAt != null) {
        const left = c.stopAt - c.total;
        if (left <= 0.5) { c.v = 0; c.total = Math.max(c.total, Math.min(c.total, c.stopAt)); return; }
        target = Math.min(target, Math.sqrt(2 * 8 * left));
      }
      c.v = target > c.v ? Math.min(target, c.v + accel(c.v) * dt) : Math.max(target, c.v - A_BRK * dt);
      const prev = c.total;
      c.total += c.v * dt;
      if (flag === "sc" && ahead && c.total > ahead.total - 25) c.total = Math.max(prev, ahead.total - 25);
      if (c.stopAt != null && c.total > c.stopAt) c.total = c.stopAt;
      // Linee di cronometraggio (una ogni minisettore) superate in questo passo.
      while (c.total >= c.nextB * miniLen) {
        const bd = c.nextB * miniLen, frac = c.total > prev ? (bd - prev) / (c.total - prev) : 1;
        crossLine(c, c.nextB, t - dt + dt * clamp(frac, 0, 1));
        c.nextB++;
      }
    }

    function status(time, best, bestAll, slow) {
      if (slow) return "yellow";
      if (time < bestAll) return "purple";
      if (time < best) return "green";
      return "yellow";
    }

    function crossLine(c, k, when) {
      if (firstCross[k] == null) firstCross[k] = when;
      c.cross[k] = when;
      if (c.finished) return;
      const m = (k - 1) % MINIS;
      const slow = flag !== "green" || c.lapKind !== "push";
      const tm = when - c.miniStart;
      c.miniStart = when;
      c.curMini[m] = tm;
      const st = status(tm, c.bestMini[m], bestMini[m], flag !== "green");
      c.curStatus[m] = st;
      if (!slow || flag === "green") { if (tm < c.bestMini[m]) c.bestMini[m] = tm; if (tm < bestMini[m]) bestMini[m] = tm; }
      if ((m + 1) % PER_SECTOR === 0) {
        const si = (m + 1) / PER_SECTOR - 1;
        const ts = c.curMini.slice(si * PER_SECTOR, (si + 1) * PER_SECTOR).reduce((a, b) => a + (b || 0), 0);
        const sst = status(ts, c.bestSector[si], bestSector[si], flag !== "green");
        c.curSector[si] = { t: ts, st: sst };
        if (flag === "green") { if (ts < c.bestSector[si]) c.bestSector[si] = ts; if (ts < bestSector[si]) bestSector[si] = ts; }
      }
      if (m === MINIS - 1) finishLap(c, when, Math.floor((k - 1) / MINIS) + 1);
    }

    function finishLap(c, when, lapNo) {
      const time = when - c.lapStart;
      c.lapStart = when;
      const sectors = c.curSector.map(s => s || { t: 0, st: "none" });
      const fix = time - sectors.reduce((a, s) => a + s.t, 0);
      if (sectors[2]) sectors[2] = { ...sectors[2], t: sectors[2].t + fix };      // arrotondamenti
      let st = "none";
      if (flag === "green" && !(bestLap && time >= bestLap.time) && lapNo > 1) st = "purple";
      else if (c.best && time < c.best.time) st = "green";
      // tyre/age: gomme del giro e quanti giri avevano già (per il degrado e il rilevatore di bluff); pitIn: rientra ai box.
      const rec = { lapNo, time, sectors, minis: c.curStatus.slice(), st, factor: time / track.lapTime, kind: c.lapKind, flag, tyre: c.tyre, age: c.tyreAge, pitIn: false };
      c.laps.push(rec);
      c.last = rec;
      if (lapNo > 1 || !isRace) {
        if (!c.best || time < c.best.time) c.best = { lapNo, time };
        if (flag === "green" && (!bestLap || time < bestLap.time)) bestLap = { id: c.id, code: c.code, time, lapNo };
      }
      c.curMini.fill(null); c.curStatus.fill("none"); c.curSector = [null, null, null];
      c.lapNoise = 1 + (R() - 0.5) * 0.006;
      c.tyreAge++;
      // Gomme finite: sosta ai box (tempo perso, gomme nuove di un'altra mescola). Mai negli ultimi giri né con la rossa.
      if (isRace && !finished && !c.finished && c.tyreAge >= c.tyreLife && lapNo < totalLaps - 2 && flag !== "red") {
        c.pitHold = 21 + RT() * 3; c.stops++; rec.pitIn = true;
        const next = { S: ["M", "H"], M: ["H", "S"], H: ["M", "M"] }[c.tyre][Math.floor(RT() * 2)];
        c.tyre = next; c.tyreAge = 0; c.tyreLife = lifeOf(next);
      }
      if (!isRace) c.lapKind = c.lapKind === "push" ? "cool" : "push";
      if (isRace && finished && !c.finished) c.finished = true;
      if (isRace && !finished && lapNo >= totalLaps) { finished = true; c.finished = true; say("BANDIERA A SCACCHI", "Flag", { flag: "CHEQUERED" }); }
      if (!isRace && segEnded && !c.garage) { c.garage = true; c.v = 0; }
    }

    function stepSession(dt) {
      t += dt;
      while (timers.length && timers[0][0] <= t) timers.shift()[1]();
      if (isRace && evIdx < events.length) {
        const prog = leader().total / L + 1;
        while (evIdx < events.length && prog >= events[evIdx][0]) events[evIdx++][1]();
        if (script && prog >= nextRandom && flag === "green") { randomMessage(); nextRandom = prog + 1.2 + R() * 1.5; }
      }
      if (!isRace) {
        if (waiting > 0) { waiting -= dt; if (waiting <= 0) startSegment(); return; }
        cars.forEach(c => { if (c.garage && !c.out && !segEnded && t >= c.garageUntil) { c.garage = false; c.lapKind = "out"; c.lapStart = t; c.miniStart = t; } });
        if (clock > 0) { clock -= dt; if (clock <= 0) { clock = 0; segEnded = true; say("BANDIERA A SCACCHI", "Flag", { flag: "CHEQUERED" }); } }
        if (segEnded && (cars.every(c => c.garage || c.out) || t - flagSince > 400)) endSegment();
      }
      const o = order();
      let prevRun = null;   // la macchina davanti che è in pista (chi è ai box non fa da tappo)
      o.forEach(c => { const pitting = c.pitHold > 0; stepCar(c, dt, isRace ? prevRun : null); if (!pitting) prevRun = c; });
    }

    function startSegment() {
      segEnded = false; clock = QUALI[segIdx][1];
      cars.forEach(c => { if (!c.out) { c.garage = true; c.garageUntil = t + R() * 120; c.best = null; c.bestMini.fill(Infinity); c.bestSector = [Infinity, Infinity, Infinity]; } });
      bestMini.fill(Infinity); bestSector.fill(Infinity); bestLap = null;
      say(`${QUALI[segIdx][0]}: SEMAFORO VERDE`, "Flag", { flag: "GREEN" });
    }
    function endSegment() {
      flagSince = t;
      if (isQuali && segIdx < QUALI.length - 1) {
        const cut = QUALI[segIdx][2], seg = QUALI[segIdx][0];
        const running = order().filter(c => !c.out);
        running.slice(running.length - cut).forEach(c => { c.out = true; c.outIn = seg; c.garage = true; });
        segIdx++; waiting = BREAK; segEnded = false; clock = QUALI[segIdx][1];
      } else { finished = true; segEnded = false; }
      cars.forEach(c => { c.garage = true; c.v = 0; });
    }

    // Distacco dal primo e dalla macchina davanti, dai tempi alle linee di cronometraggio.
    function gaps(o) {
      const lead = o[0], vRef = L / track.lapTime;
      return o.map((c, i) => {
        if (!isRace) return { gap: c.best && o[0].best ? c.best.time - o[0].best.time : null, interval: null, lapsDown: 0 };
        if (c.dnf) return { gap: null, interval: null, lapsDown: 0 };
        const lapsDown = Math.floor((lead.total - c.total) / L);
        const k = c.nextB - 1;
        const g = k >= 1 && c.cross[k] != null && firstCross[k] != null ? c.cross[k] - firstCross[k] : Math.max(0, (lead.total - c.total) / vRef);
        const a = o[i - 1];
        const iv = !a ? 0 : k >= 1 && c.cross[k] != null && a.cross[k] != null ? c.cross[k] - a.cross[k] : Math.max(0, (a.total - c.total) / vRef);
        return { gap: i === 0 ? 0 : Math.max(g, 0), interval: Math.max(iv, 0), lapsDown };
      });
    }

    const api = {
      type, totalLaps,
      advance(sec) {
        let left = sec;
        while (left > 1e-9) { const dt = Math.min(0.25, left); stepSession(dt); left -= dt; }
      },
      setFlag,
      retire,
      // Novità per gli avvisi dell'app, senza calcolare tutta la classifica: giro più veloce e ritiri (in ordine).
      feed() {
        return {
          bestLap: bestLap ? { ...bestLap } : null,
          dnfs: cars.filter(c => c.dnf).sort((a, b) => a.dnf.seq - b.dnf.seq).map(c => ({ id: c.id, code: c.code, cause: c.dnf.cause, lap: c.dnf.lap, t: c.dnf.t })),
        };
      },
      jumpToLastLap() {
        if (!isRace) { clock = Math.min(clock, 60); return; }
        const o = order(), lead = o[0], delta = (totalLaps - 1) * L + 5 - lead.total;
        if (delta <= 0) return;
        cars.forEach(c => { c.total += delta; c.nextB = Math.floor(c.total / miniLen) + 1; c.miniStart = t; c.lapStart = t; c.curMini.fill(null); c.curStatus.fill("none"); c.curSector = [null, null, null]; });
        evIdx = events.length;
        say("ULTIMO GIRO", "Other");
      },
      state() {
        const o = order(), g = gaps(o), lap = currentLap();
        let bg = STATUS_BG[flag] || "green";
        if (bg === "green" && isRace && (lap === 1 || lap === totalLaps || finished)) bg = "chequered";
        if (bg === "green" && !isRace && (segEnded || finished)) bg = "chequered";
        return {
          type, t, flag, flagSector, bg, finished, lap, totalLaps,
          segment: isQuali ? QUALI[Math.min(segIdx, QUALI.length - 1)][0] : null, clock: isRace ? null : clock, waiting: waiting > 0,
          clockText: isRace ? null : fmtClock(clock),
          bestLap, messages: messages.slice(),
          cars: o.map((c, i) => {
            const s = ((c.total % L) + L) % L, p = track.pointAt(s);
            return {
              id: c.id, code: c.code, number: c.number, color: c.color, pos: i + 1, grid: c.grid + 1, x: p[0], y: p[1], speed: c.v, dist: c.total,
              gap: g[i].gap, interval: g[i].interval, lapsDown: g[i].lapsDown, lap: isRace ? Math.max(1, Math.floor(Math.max(0, c.total) / L) + 1) : c.laps.length + 1,
              last: c.last, best: c.best, sectors: c.curSector.slice(), minis: c.curStatus.slice(),
              pit: !c.dnf && (c.garage || (c.stopAt != null && c.v < 1) || c.pitHold > 0), out: c.out, outIn: c.outIn, tyre: c.tyre, tyreAge: c.tyreAge, finished: c.finished,
              tyreLife: c.tyreLife, wear: Math.round(clamp(c.tyreAge / c.tyreLife, 0, 1) * 100), stops: c.stops,
              dnf: c.dnf ? { cause: c.dnf.cause, lap: c.dnf.lap } : null,
            };
          }),
        };
      },
      // Telemetria di un giro (come car_data di OpenF1): velocità, acceleratore, freno, marcia, giri motore.
      telemetry(id, lapNo) {
        const c = cars.find(x => x.id === id); if (!c) return null;
        const rec = c.laps.find(l => l.lapNo === lapNo); if (!rec) return null;
        const r = rng(seed * 131 + c.number * 17 + lapNo), n = 400, step = track.n / n, scale = track.lapTime / rec.time;
        const out = { id, code: c.code, lapNo, time: rec.time, sectors: rec.sectors, dist: [], speed: [], throttle: [], brake: [], gear: [], rpm: [], sectorDist: [L / 3, 2 * L / 3] };
        const GEARS = [0, 95, 130, 165, 200, 235, 268, 300];
        for (let i = 0; i < n; i++) {
          const idx = Math.floor(i * step), v = track.speed[idx] * scale, vn = track.speed[(idx + Math.round(step)) % track.n] * scale;
          const kmh = clamp(v * 3.6 + (r() - 0.5) * 2, 55, 350);
          const dv = (vn - v) / (track.ds * step);                 // variazione di velocità per metro
          const braking = dv * v < -7, accelerating = dv > 0.002 || v > V_MAX * scale * 0.97;
          const gear = clamp(GEARS.filter(x => kmh >= x).length, 1, 8);
          const lo = GEARS[gear - 1], hi = GEARS[gear] || 345;
          out.dist.push(Math.round(i * step * track.ds));
          out.speed.push(Math.round(kmh));
          out.throttle.push(braking ? 0 : accelerating ? 100 : Math.round(clamp(35 + 60 * v / V_MAX + (r() - 0.5) * 10, 20, 95)));
          out.brake.push(braking ? 1 : 0);
          out.gear.push(gear);
          out.rpm.push(Math.round(clamp(10200 + 1700 * (kmh - lo) / Math.max(20, hi - lo) + (r() - 0.5) * 120, 9000, 12100)));
        }
        return out;
      },
      laps(id) { const c = cars.find(x => x.id === id); return c ? c.laps.slice() : []; },
      // Telemetria di adesso (per il Second Screen): velocità, marcia, gas, freno e giri motore nel punto in cui è la macchina.
      liveTelemetry(id) {
        const c = cars.find(x => x.id === id); if (!c) return null;
        const s = ((c.total % L) + L) % L, kmh = c.v * 3.6;
        const now = track.speedAt(s), ahead = track.speedAt((s + 45) % L);
        const moving = c.v > 1;
        const braking = moving && ahead < c.v * 0.94 && flag !== "red";
        const full = moving && !braking && (c.v < now * 0.985 || now >= V_MAX * 0.97);
        const GEARS = [0, 95, 130, 165, 200, 235, 268, 300];
        const gear = moving ? clamp(GEARS.filter(x => kmh >= x).length, 1, 8) : 1;
        const lo = GEARS[gear - 1], hi = GEARS[gear] || 345;
        return {
          id, code: c.code, speed: Math.round(kmh), gear, brake: braking ? 1 : 0,
          throttle: !moving ? 0 : braking ? 0 : full ? 100 : Math.round(clamp(35 + 60 * c.v / V_MAX, 20, 95)),
          rpm: moving ? Math.round(clamp(10200 + 1700 * (kmh - lo) / Math.max(20, hi - lo), 9000, 12100)) : 4000,
          tyre: c.tyre, tyreAge: c.tyreAge, pit: c.garage || c.pitHold > 0,
        };
      },
    };
    if (script && isRace) say("GIRO DI FORMAZIONE", "Other");
    if (!isRace) say(isQuali ? `${QUALI[0][0]}: SEMAFORO VERDE` : "SEMAFORO VERDE: PIT LANE APERTA", "Flag", { flag: "GREEN" });
    return api;
  }

  /* ── METEO ──────────────────────────────────────────────────────────── */
  // Clima medio del weekend: aria °C, umidità %, probabilità di pioggia %, vento km/h.
  const CLIMATE = {
    "au-1953": [21, 60, 25, 14], "cn-2004": [18, 70, 35, 12], "jp-1962": [17, 68, 40, 10], "us-2022": [29, 70, 30, 14], "ca-1978": [21, 62, 35, 12],
    "mc-1929": [23, 64, 15, 9], "es-1991": [25, 58, 12, 12], "at-1969": [22, 60, 40, 9], "gb-1948": [21, 65, 38, 16], "be-1925": [19, 72, 50, 12],
    "hu-1986": [29, 50, 18, 8], "nl-1948": [20, 72, 35, 20], "it-1922": [27, 55, 18, 7], "es-2026": [28, 40, 8, 10], "az-2016": [23, 62, 10, 22],
    "my-1999": [31, 76, 50, 9],   // Sepang: caldo umido e temporali nel pomeriggio
    "sg-2008": [30, 78, 35, 8], "us-2012": [27, 60, 18, 14], "mx-1962": [21, 55, 30, 9], "br-1940": [23, 72, 50, 12], "us-2023": [13, 30, 4, 11],
    "qa-2004": [27, 55, 3, 16], "ae-2009": [27, 55, 2, 12],
  };
  // Orari locali: i GP serali hanno sessioni di sera.
  const SCHEDULE = {
    default: { FP1: "13:30", FP2: "17:00", FP3: "12:30", SQ: "17:30", SPRINT: "12:00", QUALI: "16:00", RACE: "15:00" },
    "sg-2008": { FP1: "16:30", FP2: "21:00", FP3: "17:30", SQ: "20:30", SPRINT: "17:00", QUALI: "21:00", RACE: "20:00" },
    "us-2023": { FP1: "18:30", FP2: "22:00", FP3: "18:30", QUALI: "22:00", RACE: "22:00" },
    "qa-2004": { FP1: "16:30", FP2: "20:00", FP3: "17:30", QUALI: "21:00", RACE: "19:00" },
    "ae-2009": { FP1: "13:30", FP2: "17:00", FP3: "14:30", QUALI: "18:00", RACE: "17:00" },
    "az-2016": { FP1: "12:30", FP2: "16:00", FP3: "12:30", QUALI: "16:00", RACE: "15:00" },
    "my-1999": { FP1: "12:30", FP2: "16:00", FP3: "12:30", QUALI: "16:00", RACE: "15:00" },
  };
  const SESSION_LABEL = { FP1: "Prove libere 1", FP2: "Prove libere 2", FP3: "Prove libere 3", SQ: "Qualifiche Sprint", SPRINT: "Sprint", QUALI: "Qualifiche", RACE: "Gara" };
  const DAY_OFFSET = { FP1: -2, FP2: -2, FP3: -1, SQ: -2, SPRINT: -1, QUALI: -1, RACE: 0 };
  const WEEKEND_KEYS = { classic: ["FP1", "FP2", "FP3", "QUALI", "RACE"], sprint: ["FP1", "SQ", "SPRINT", "QUALI", "RACE"] };
  function localParts(utc, tz) {
    const parts = new Intl.DateTimeFormat("it-IT", { timeZone: tz, weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(utc));
    const get = k => (parts.find(p => p.type === k) || {}).value || "";
    return { time: get("hour") + ":" + get("minute"), day: `${get("weekday")} ${get("day")} ${get("month")}` };
  }
  const DIRS = ["nord", "nord-est", "est", "sud-est", "sud", "sud-ovest", "ovest", "nord-ovest"];
  const DAYS = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];
  const MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

  // Meteo del weekend: previsione per ogni sessione e, a parte, l'esito "reale" (pioggia sì o no) che si scopre a fine sessione.
  // sessions: orari ufficiali [{ key, utc }] con il fuso del circuito (tz); senza, orari indicativi e formato "classic" o "sprint".
  function weather({ circuitId, raceDate, seed = 1, t = 0, sessions, tz, format = "classic", liveKey }) {
    const r = rng(seed * 977 + (circuitId || "").length * 31);
    const [air0, hum0, rain0, wind0] = CLIMATE[circuitId] || [24, 60, 20, 10];
    const sch = { ...SCHEDULE.default, ...(SCHEDULE[circuitId] || {}) };
    const windDeg = Math.floor(r() * 8) * 45;
    const base = raceDate ? new Date(raceDate + "T12:00:00") : null;
    const keys = sessions && sessions.length ? sessions.map(x => x.key) : WEEKEND_KEYS[format] || WEEKEND_KEYS.classic;
    const list = keys.map((key, idx) => {
      const off = sessions && sessions[idx] && sessions[idx].utc && tz ? localParts(sessions[idx].utc, tz) : null;
      const time = off ? off.time : sch[key] || "15:00";
      const hour = parseInt(time, 10), evening = hour >= 18;
      const air = Math.round(air0 + (r() - 0.5) * 4 - (evening ? 2 : 0));
      const trackT = Math.round(air + (evening ? 4 + r() * 3 : 9 + r() * 7));
      const hum = Math.round(clamp(hum0 + (r() - 0.5) * 12 + (evening ? 6 : 0), 20, 95));
      const rainPct = Math.round(clamp(rain0 + (r() - 0.5) * 30, 0, 95));
      const wind = Math.round(clamp(wind0 + (r() - 0.5) * 8, 2, 40));
      const dir = DIRS[Math.floor(((windDeg + (r() - 0.5) * 60) % 360 + 360) % 360 / 45) % 8];
      const sky = rainPct < 12 ? (evening ? "cielo sereno" : "sole e cielo sereno") : rainPct < 30 ? "poco nuvoloso" : rainPct < 50 ? "nuvolosità variabile, non si escludono piovaschi" : rainPct < 70 ? "possibili rovesci" : "pioggia probabile";
      // Icona del cielo, coerente col testo (di sera la luna al posto del sole).
      const icon = rainPct < 12 ? (evening ? "moon" : "sun") : rainPct < 30 ? (evening ? "cloud-moon" : "cloud-sun") : rainPct < 50 ? "cloud" : "rain";
      let day = off ? off.day : "";
      if (!off && base) { const d = new Date(base.getTime() + (DAY_OFFSET[key] || 0) * 86400000); day = `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; }
      const text = `${day ? day[0].toUpperCase() + day.slice(1) + ", " : ""}ore ${time} (ora locale): ${sky}. ${air} °C nell'aria e ${trackT} °C in pista, umidità ${hum}%, vento ${wind} km/h da ${dir}. Probabilità di pioggia: ${rainPct}%.`;
      // Esito reale della sessione (serie casuale a parte, così la previsione non cambia): piove con la probabilità prevista.
      const ro = rng(seed * 131 + (circuitId || "").length * 17 + idx * 7919 + key.length * 31);
      ro(); const outcome = ro() < rainPct / 100 ? "rain" : "dry";
      return { key, label: SESSION_LABEL[key] || key, day, time, utc: sessions && sessions[idx] ? sessions[idx].utc : null, air, track: trackT, humidity: hum, rainPct, wind, windDir: dir, sky, icon, text, outcome };
    });
    // Condizioni "adesso", con una lenta variazione durante la sessione.
    const drift = Math.sin(t / 600) * 0.8;
    const current = {
      air: Math.round((air0 + drift) * 10) / 10, track: Math.round((air0 + 10 + drift * 2) * 10) / 10, humidity: Math.round(hum0 + drift * 3),
      wind: Math.round((wind0 + drift) * 10) / 10, windDir: windDeg, rain: rain0 > 45 && Math.sin(t / 900) > 0.6, pressure: 1011,
    };
    // Durante una sessione, "adesso" segue l'esito di quella sessione.
    const liveS = liveKey ? list.find(x => x.key === liveKey) : null;
    if (liveS) current.rain = liveS.outcome === "rain";
    return { current, sessions: list };
  }

  // Celle di pioggia per il radar (coordinate 0..1 sulla mappa) che si spostano col vento.
  function radarCells({ seed = 1, rainChance = 30, windDeg = 90 }) {
    const r = rng(seed * 7919 + 3), n = Math.round(3 + rainChance / 8);
    const rad = (windDeg + 180) * Math.PI / 180;
    return Array.from({ length: n }, () => ({ x: r() * 1.6 - 0.3, y: r() * 1.2 - 0.1, r: 0.05 + r() * 0.16, i: 0.25 + r() * 0.75, vx: Math.sin(rad) * (0.004 + r() * 0.004), vy: -Math.cos(rad) * (0.004 + r() * 0.004) }));
  }

  return { buildTrack, createSession, weather, radarCells, fmtLap, fmtClock, MINIS, PER_SECTOR, SESSION_LABEL, WEEKEND_KEYS };
});
