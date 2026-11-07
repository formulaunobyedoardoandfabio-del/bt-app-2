// B&T Trophies del GP (7/11, Edoardo: "crea idee B&T Trophies tipo re del bagnato anche se non a podio, maestro della
// difesa..." e poi "aggiungilo nell'app"). Premi calcolati SOLO sui dati veri della sessione già scaricati da OpenF1
// (laps, stints, pit, position, intervals, race_control, weather, session_result): se un dato manca il trofeo non
// c'è (niente griglia inventata, niente tempi da fermo stimati). Regole in claude/b-t-trophies-e-pause.md.
// I tempi t sono secondi dalla partenza della sessione (session.date_start), come nel replay (sim.jumpTo).
// Numeri scritti all'italiana (virgola). CommonJS come il resto di src/logic.

const arr = v => (Array.isArray(v) ? v : []);
const isNum = v => typeof v === "number" && Number.isFinite(v);
const msOf = iso => { const v = Date.parse(iso); return Number.isFinite(v) ? v : null; };
const it = (n, d = 1) => n.toFixed(d).replace(".", ",");
const median = xs => { const s = xs.filter(isNum).sort((a, b) => a - b); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const ord = p => p + "°";
const lastLe = (list, s) => { let lo = 0, hi = list.length - 1, ans = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (list[m].s <= s) { ans = m; lo = m + 1; } else hi = m - 1; } return ans; };
const titleCase = w => (w ? w.charAt(0) + w.slice(1).toLowerCase() : "");

const RACE_TYPES = ["RACE", "SPRINT"], QUALI_TYPES = ["QUALI", "SQ"];
const TYRE_IT = { SOFT: "soft", MEDIUM: "media", HARD: "dura", INTERMEDIATE: "intermedia", WET: "da bagnato" };
const TYRE_SHORT = { SOFT: "Soft", MEDIUM: "Media", HARD: "Dura", INTERMEDIATE: "Inter", WET: "Wet" };

const DEFS = {
  difesa: { name: "Maestro della difesa", family: "hard", icon: "shield", rule: "Più tempo con un'auto dietro a meno di 0,5 s senza perdere la posizione. Non contano il primo giro, la Safety Car, la Virtual Safety Car e la bandiera rossa." },
  bagnato: { name: "Re del bagnato", family: "wet", icon: "drop", rule: "Più posizioni guadagnate nei giri in cui piove o con gomme intermedie e da bagnato. Conta quello che fai in quei giri, non l'arrivo." },
  fenice: { name: "La Fenice", family: "soft", icon: "rise", rule: "La rimonta più grande dalla griglia di partenza all'arrivo." },
  partenza: { name: "Partenza razzo", family: "soft", icon: "lights", rule: "Più posizioni guadagnate al primo giro, dalla griglia alla fine del giro 1." },
  ripartenza: { name: "Ripartenza fulminea", family: "soft", icon: "bolt", rule: "Più posizioni guadagnate nei 2 giri dopo una Safety Car o una bandiera rossa." },
  mastino: { name: "Il Mastino", family: "soft", icon: "target", rule: "Più tempo a meno di 1 s da chi sta davanti. Non contano il primo giro e i momenti di Safety Car o bandiera rossa." },
  metronomo: { name: "Metronomo", family: "medium", icon: "metro", rule: "I giri più costanti: conta lo scarto medio dei giri puliti (niente primo giro, giri del box, Safety Car o bandiera rossa)." },
  eterna: { name: "Gomma eterna", family: "hard", icon: "tyre", rule: "Lo stint più lungo con la stessa gomma." },
  pitcrew: { name: "Pit crew d'oro", family: "inter", icon: "wrench", rule: "La sosta più breve da fermo, da quando la macchina si ferma a quando riparte. Il trofeo va alla squadra." },
  missile: { name: "Missile", family: "soft", icon: "speed", rule: "La velocità più alta allo speed trap in tutta la sessione." },
  minisettori: { name: "Re dei minisettori", family: "medium", icon: "grid", rule: "Più minisettori viola, cioè più veloci di tutti in quel momento della sessione." },
  giro: { name: "Giro della vita", family: "medium", icon: "stopwatch", rule: "Il distacco più grande sul compagno di squadra, giro migliore contro giro migliore." },
  cordoli: { name: "Pittore di cordoli", family: "irony", icon: "kerb", rule: "Premio ironico: il maggior numero di tempi cancellati per i limiti della pista (almeno 2)." },
  eremita: { name: "L'Eremita", family: "irony", icon: "alone", rule: "Premio ironico: più tempo senza nessuno entro 2 s, né davanti né dietro (non conta chi è primo)." },
};
const ORDER = {
  race: ["difesa", "bagnato", "fenice", "partenza", "ripartenza", "mastino", "metronomo", "eterna", "pitcrew", "missile", "minisettori", "cordoli", "eremita"],
  quali: ["giro", "missile", "minisettori", "cordoli"],
  other: ["missile", "minisettori", "cordoli"],
};

function computeGpTrophies(raw, opts = {}) {
  const empty = { type: opts.type || null, headline: null, list: [], all: [] };
  if (!raw || typeof raw !== "object") return empty;
  try { return compute(raw, opts); } catch (e) { return empty; }
}

function compute(raw, opts) {
  const session = raw.session && typeof raw.session === "object" ? raw.session : {};
  const lapsAll = arr(raw.laps).filter(l => l && isNum(l.driver_number) && isNum(l.lap_number));
  const firstLapMs = lapsAll.map(l => msOf(l.date_start)).filter(isNum).sort((a, b) => a - b)[0];
  const startMs = msOf(session.date_start) != null ? msOf(session.date_start) : firstLapMs != null ? firstLapMs : null;
  if (startMs == null) return { type: opts.type || null, headline: null, list: [], all: [] };
  const tOf = iso => { const v = msOf(iso); return v == null ? null : (v - startMs) / 1000; };
  const type = String(opts.type || "").toUpperCase() || (/qualif/i.test(session.session_name || "") ? "QUALI" : /race|sprint/i.test(session.session_type || "") ? "RACE" : "");
  const kind = RACE_TYPES.includes(type) ? "race" : QUALI_TYPES.includes(type) ? "quali" : "other";

  // Piloti: nome per esteso ("Charles Leclerc"), sigla, squadra, colore.
  const DRV = new Map();
  arr(raw.drivers).forEach(d => {
    if (!d || !isNum(d.driver_number)) return;
    const parts = String(d.full_name || "").trim().split(/\s+/).filter(Boolean);
    const first = d.first_name || parts.slice(0, -1).join(" ");
    const last = d.last_name || (parts.length ? parts[parts.length - 1] : "");
    const lastNice = last === last.toUpperCase() ? last.split(/([\s-])/).map(titleCase).join("") : last;
    DRV.set(d.driver_number, { code: d.name_acronym || lastNice.slice(0, 3).toUpperCase(), who: [first, lastNice].filter(Boolean).join(" ") || d.name_acronym || String(d.driver_number), last: lastNice || d.name_acronym || String(d.driver_number), team: d.team_name || "", color: d.team_colour ? "#" + String(d.team_colour).replace(/^#/, "") : null });
  });
  const info = n => DRV.get(n) || { code: String(n), who: "Pilota " + n, last: "n. " + n, team: "", color: null };

  // Giri per pilota, inizio di ogni giro (t), giro tipico.
  const lapsBy = new Map();
  lapsAll.forEach(l => { const s = tOf(l.date_start); if (s == null) return; if (!lapsBy.has(l.driver_number)) lapsBy.set(l.driver_number, []); lapsBy.get(l.driver_number).push({ ...l, s }); });
  lapsBy.forEach(L => L.sort((a, b) => a.lap_number - b.lap_number));
  const typLap = median(lapsAll.map(l => (isNum(l.lap_duration) && l.lap_duration > 20 ? l.lap_duration : null))) || 90;
  const lapStart = (d, n) => { const L = lapsBy.get(d) || []; const g = L.find(x => x.lap_number === n); return g ? g.s : null; };
  const raceStart = (() => { const xs = lapsAll.filter(l => l.lap_number === 1).map(l => tOf(l.date_start)).filter(isNum); return xs.length ? Math.min(...xs) : 0; })();
  const lap1End = d => { const s2 = lapStart(d, 2); return s2 != null ? s2 : raceStart + typLap; };
  const lapAt = (d, s) => { const L = lapsBy.get(d) || []; let n = null; for (const g of L) { if (g.s <= s) n = g.lap_number; else break; } return n; };
  const anyLapAt = s => { let best = null; lapsBy.forEach((L, d) => { const n = lapAt(d, s); if (n != null && (best == null || n > best)) best = n; }); return best; };
  const maxLap = Math.max(0, ...lapsAll.map(l => l.lap_number));
  const endS = Math.max(0, ...lapsAll.map(l => tOf(l.date_start) + (isNum(l.lap_duration) ? l.lap_duration : 0)).filter(isNum));

  // Posizioni nel tempo.
  const posBy = new Map();
  arr(raw.position).forEach(p => { if (!p || !isNum(p.driver_number) || !isNum(p.position)) return; const s = tOf(p.date); if (s == null) return; if (!posBy.has(p.driver_number)) posBy.set(p.driver_number, []); posBy.get(p.driver_number).push({ s, p: p.position }); });
  posBy.forEach(L => L.sort((a, b) => a.s - b.s));
  const posAt = (d, s) => { const L = posBy.get(d); if (!L) return null; const i = lastLe(L, s); return i < 0 ? null : L[i].p; };
  const whoAt = (p, s) => { for (const [d] of posBy) if (posAt(d, s) === p) return d; return null; };

  // Momenti neutralizzati: Safety Car, Virtual Safety Car, bandiera rossa (fino alla verde / TRACK CLEAR / ripresa).
  const rc = arr(raw.race_control).filter(m => m && tOf(m.date) != null).map(m => ({ ...m, s: tOf(m.date), msg: String(m.message || "").toUpperCase(), cat: String(m.category || "").toUpperCase(), flag: String(m.flag || "").toUpperCase() })).sort((a, b) => a.s - b.s);
  const windows = [];
  let open = null;
  rc.forEach(m => {
    const red = m.flag === "RED" || (m.cat === "SESSIONSTATUS" && /SESSION (ABORTED|SUSPENDED)/.test(m.msg));
    const sc = m.cat === "SAFETYCAR" && /DEPLOYED/.test(m.msg);
    const end = m.flag === "GREEN" || /TRACK CLEAR/.test(m.msg) || /SESSION (RESUMED|STARTED)/.test(m.msg);
    if ((red || sc) && !open) open = { a: m.s, kind: red ? "red" : /VIRTUAL/.test(m.msg) ? "vsc" : "sc" };
    else if ((red || sc) && open && red) open.kind = "red";
    else if (end && open) { windows.push({ ...open, b: m.s }); open = null; }
  });
  if (open) windows.push({ ...open, b: Math.min(open.a + 4 * typLap, Math.max(endS, open.a + 60)) });
  const neutral = s => windows.some(w => s >= w.a && s < w.b);

  // Distacchi (solo numeri veri: "+1 LAP" non conta).
  const ivBy = new Map();
  arr(raw.intervals).forEach(v => { if (!v || !isNum(v.driver_number)) return; const s = tOf(v.date); if (s == null) return; if (!ivBy.has(v.driver_number)) ivBy.set(v.driver_number, []); ivBy.get(v.driver_number).push({ s, iv: isNum(v.interval) ? v.interval : null }); });
  ivBy.forEach(L => L.sort((a, b) => a.s - b.s));
  const ivAt = (d, s) => { const L = ivBy.get(d); if (!L) return null; const i = lastLe(L, s); return i < 0 ? null : L[i].iv; };

  const out = {};
  const mk = (id, o) => { out[id] = { id, ...DEFS[id], ...o }; };
  const forDriver = (n, extra) => { const I = info(n); return { num: n, code: I.code, who: I.who, team: I.team, color: I.color, ...extra }; };

  if (kind === "race") {
    // ---- Maestro della difesa, Il Mastino, L'Eremita: un giro sui distacchi di ogni pilota ----
    const defense = new Map();   // difensore → { time, by: Map(attaccante → { time, streaks: [{a, b, time}] }) }
    const close1s = new Map();   // attaccante → { time, by: Map(davanti → time) }
    const alone = new Map();     // pilota → { time, best: {a, b} }
    ivBy.forEach((L, B) => {
      const spacing = median(L.slice(1).map((x, i) => x.s - L[i].s)) || 4;
      const CAP = Math.min(typLap, Math.max(10, 1.5 * spacing));
      let cur = null, aloneRun = null;
      const closeStreak = s => {
        if (!cur) return;
        const chk = s + Math.min(30, CAP), pA = posAt(cur.A, chk), pB = posAt(B, chk);
        const passed = pA != null && pB != null && pB < pA;
        if (!passed && cur.time > 0) {
          if (!defense.has(cur.A)) defense.set(cur.A, { time: 0, by: new Map() });
          const D = defense.get(cur.A); D.time += cur.time;
          if (!D.by.has(B)) D.by.set(B, { time: 0, streaks: [] });
          const R = D.by.get(B); R.time += cur.time; R.streaks.push({ a: cur.a, b: s, time: cur.time });
        }
        cur = null;
      };
      L.forEach((x, i) => {
        const next = L[i + 1], dt = Math.min(next ? next.s - x.s : spacing, CAP);
        const ok = x.iv != null && x.iv > 0 && x.s >= lap1End(B) && !neutral(x.s);
        const pB = ok ? posAt(B, x.s) : null, A = pB != null && pB > 1 ? whoAt(pB - 1, x.s) : null;
        // difesa: B dietro ad A a meno di 0,5 s
        if (ok && A != null && x.iv < 0.5) {
          if (cur && cur.A !== A) closeStreak(x.s);
          if (!cur) cur = { A, a: x.s, time: 0 };
          cur.time += dt;
        } else closeStreak(x.s);
        // mastino: B a meno di 1 s da chi sta davanti
        if (ok && A != null && x.iv < 1) {
          if (!close1s.has(B)) close1s.set(B, { time: 0, by: new Map() });
          const M = close1s.get(B); M.time += dt; M.by.set(A, (M.by.get(A) || 0) + dt);
        }
        // eremita: nessuno entro 2 s davanti (e non primo) né dietro
        const behind = pB != null ? whoAt(pB + 1, x.s) : null;
        const ivBehind = behind != null ? ivAt(behind, x.s) : null;
        const lonely = ok && pB != null && pB > 1 && x.iv > 2 && (behind == null || (ivBehind != null && ivBehind > 2));
        if (lonely) {
          if (!alone.has(B)) alone.set(B, { time: 0, best: null });
          const E = alone.get(B); E.time += dt;
          if (!aloneRun) aloneRun = { a: x.s, b: x.s };
          aloneRun.b = x.s + dt;
          if (!E.best || aloneRun.b - aloneRun.a > E.best.b - E.best.a) E.best = { ...aloneRun };
        } else aloneRun = null;
      });
      const last = L[L.length - 1];
      if (last) closeStreak(last.s + Math.min(spacing, CAP));
    });
    const lapsOf = sec => Math.round(sec / typLap);
    const bestDef = [...defense.entries()].sort((a, b) => b[1].time - a[1].time)[0];
    if (bestDef && lapsOf(bestDef[1].time) >= 2) {
      const [A, D] = bestDef;
      const [rival, R] = [...D.by.entries()].sort((a, b) => b[1].time - a[1].time)[0];
      // "Rivedi" parte da quando è cominciata la difesa sul rivale principale; le barre vanno dalla prima all'ultima.
      const main = { a: Math.min(...R.streaks.map(x => x.a)), b: Math.max(...R.streaks.map(x => x.b)) };
      const n = lapsOf(D.time), I = info(rival);
      const l0 = lapAt(rival, main.a) || 1, l1 = lapAt(rival, main.b) || l0;
      const from = Math.max(2, l0 - 4), to = Math.min(maxLap || l1 + 4, Math.max(l1 + 4, from + 11));
      const bars = [];
      for (let L = from; L <= to && bars.length < 24; L++) {
        const a = lapStart(rival, L), b = lapStart(rival, L + 1) != null ? lapStart(rival, L + 1) : a != null ? a + typLap : null;
        const xs = a == null ? [] : (ivBy.get(rival) || []).filter(x => x.s >= a && x.s < b && x.iv != null).map(x => x.iv);
        const g = xs.length ? Math.min(...xs) : null;
        bars.push({ lap: L, g, on: g != null && g < 0.5 && R.streaks.some(st => a < st.b && b > st.a) });
      }
      mk("difesa", forDriver(A, {
        value: n, rival: I.code, rivalWho: I.who,
        stat: `${I.code} dietro per ${n} giri`,
        text: `Ha tenuto ${I.last} dietro per ${n} giri con meno di 0,5 s di distacco, senza perdere la posizione.`,
        tiles: [{ big: String(n), small: "giri sotto attacco" }, { big: I.code, small: "chi attaccava" }, { big: String(D.by.size), small: D.by.size === 1 ? "pilota tenuto dietro" : "piloti tenuti dietro" }],
        chart: { kind: "bars", bars, from, to, label: "sotto 0,5 s" }, t: main.a,
      }));
    }
    const bestDog = [...close1s.entries()].sort((a, b) => b[1].time - a[1].time)[0];
    if (bestDog && lapsOf(bestDog[1].time) >= 2) {
      const [B, M] = bestDog, [ahead] = [...M.by.entries()].sort((a, b) => b[1] - a[1])[0], n = lapsOf(M.time), I = info(ahead);
      const first = (ivBy.get(B) || []).find(x => x.iv != null && x.iv < 1 && x.s >= lap1End(B) && !neutral(x.s));
      mk("mastino", forDriver(B, { value: n, rival: I.code, stat: `${n} giri a meno di 1 s`, text: `È rimasto per ${n} giri a meno di 1 s da chi gli stava davanti, soprattutto ${I.last}.`, tiles: [{ big: String(n), small: "giri a meno di 1 s" }, { big: I.code, small: "chi aveva davanti" }], t: first ? first.s : raceStart }));
    }
    const bestAlone = [...alone.entries()].sort((a, b) => b[1].time - a[1].time)[0];
    if (bestAlone && lapsOf(bestAlone[1].time) >= 5) {
      const [d, E] = bestAlone, n = lapsOf(E.time);
      mk("eremita", forDriver(d, { value: n, stat: `${n} giri da solo`, text: `Per ${n} giri non ha avuto nessuno entro 2 s, né davanti né dietro.`, tiles: [{ big: String(n), small: "giri senza nessuno entro 2 s" }], t: E.best ? E.best.a : raceStart }));
    }

    // ---- Re del bagnato: pioggia vera (weather.rainfall) o gomme intermedie/da bagnato ----
    const W = arr(raw.weather).filter(w => w && tOf(w.date) != null).map(w => ({ s: tOf(w.date), r: isNum(w.rainfall) && w.rainfall > 0 })).sort((a, b) => a.s - b.s);
    const rainW = [];
    W.forEach((w, i) => { if (w.r && (!i || !W[i - 1].r)) rainW.push({ a: w.s, b: null }); if (!w.r && rainW.length && rainW[rainW.length - 1].b == null) rainW[rainW.length - 1].b = w.s; });
    if (rainW.length && rainW[rainW.length - 1].b == null) rainW[rainW.length - 1].b = Math.max(endS, rainW[rainW.length - 1].a + typLap);
    const wetStints = arr(raw.stints).filter(s => s && isNum(s.driver_number) && /INTERMEDIATE|WET/.test(String(s.compound || "").toUpperCase()));
    const gains = new Map();
    const finalPos = new Map(arr(raw.session_result).filter(r => r && isNum(r.driver_number) && isNum(r.position)).map(r => [r.driver_number, r]));
    let span = null;
    if (rainW.length) {
      posBy.forEach((L, d) => { let g = 0; rainW.forEach(w => { const p0 = posAt(d, w.a), p1 = posAt(d, w.b - 0.001); if (p0 != null && p1 != null) g += p0 - p1; }); gains.set(d, g); });
      span = { a: rainW[0].a, b: rainW[rainW.length - 1].b, laps: Math.round(rainW.reduce((s, w) => s + (w.b - w.a), 0) / typLap) };
    } else if (wetStints.length) {
      wetStints.forEach(st => { const a = lapStart(st.driver_number, st.lap_start), b = lapStart(st.driver_number, (st.lap_end || st.lap_start) + 1) || (a != null ? a + typLap * ((st.lap_end || st.lap_start) - st.lap_start + 1) : null); if (a == null || b == null) return; const p0 = posAt(st.driver_number, a), p1 = posAt(st.driver_number, b - 0.001); if (p0 != null && p1 != null) gains.set(st.driver_number, (gains.get(st.driver_number) || 0) + p0 - p1); if (!span || a < span.a) span = { a, b: Math.max(b, span ? span.b : b), laps: 0 }; });
      if (span) span.laps = Math.round((span.b - span.a) / typLap);
    }
    const bestWet = [...gains.entries()].sort((a, b) => b[1] - a[1] || ((finalPos.get(a[0]) || {}).position || 99) - ((finalPos.get(b[0]) || {}).position || 99))[0];
    if (bestWet && bestWet[1] >= 1 && span) {
      const [d, g] = bestWet;
      const used = arr(raw.stints).filter(s => s && s.driver_number === d && isNum(s.lap_start)).find(s => { const a = lapStart(d, s.lap_start), b = lapStart(d, (s.lap_end || s.lap_start) + 1); return a != null && a < span.b && (b == null || b > span.a); });
      const comp = used ? String(used.compound || "").toUpperCase() : null;
      const fp = finalPos.get(d), fin = fp && isNum(fp.position) && !fp.dnf && !fp.dsq ? fp.position : null;
      const band = [lapAt(d, span.a) || anyLapAt(span.a) || 1, lapAt(d, span.b - 1) || anyLapAt(span.b - 1) || maxLap];
      const from = Math.max(1, band[0] - 8), to = Math.min(maxLap || band[1] + 8, band[1] + 8);
      const lapsN = [], posN = [];
      for (let L = from; L <= to; L++) { const s = lapStart(d, L + 1) != null ? lapStart(d, L + 1) - 0.001 : (lapStart(d, L) != null ? lapStart(d, L) + typLap : null); const p = s != null ? posAt(d, s) : null; if (p != null) { lapsN.push(L); posN.push(p); } }
      mk("bagnato", forDriver(d, {
        value: g, stat: `+${g} ${g === 1 ? "posizione" : "posizioni"} sotto la pioggia`,
        text: `Ha guadagnato ${g} ${g === 1 ? "posizione" : "posizioni"} ${rainW.length ? "mentre pioveva" : "con le gomme da bagnato"}.`,
        note: fin == null ? "" : fin > 3 ? `Arrivato ${ord(fin)}: fuori dal podio, il trofeo vale lo stesso` : `Arrivato ${ord(fin)}`,
        tiles: [{ big: "+" + g, small: rainW.length ? "posizioni sotto la pioggia" : "posizioni con le gomme da bagnato" }, { big: String(span.laps), small: rainW.length ? "giri con la pioggia" : "giri con le gomme da bagnato" }, comp ? { tyre: comp, big: TYRE_SHORT[comp] || comp, small: "gomma usata" } : { big: "–", small: "gomma usata" }],
        chart: { kind: "pos", laps: lapsN, pos: posN, band, label: rainW.length ? "pioggia" : "gomme da bagnato" }, t: span.a,
      }));
    }

    // ---- Partenza razzo e La Fenice: solo se ci sono le posizioni di prima del via (la griglia vera) ----
    const grid = new Map();
    posBy.forEach((L, d) => { const g = L.filter(x => x.s <= raceStart + 1); if (g.length) grid.set(d, g[g.length - 1].p); });
    if (grid.size >= 2) {
      const lap1 = [...grid.entries()].map(([d, g]) => { const p = posAt(d, lap1End(d) + 2); return p == null ? null : [d, g, p, g - p]; }).filter(Boolean).sort((a, b) => b[3] - a[3] || a[2] - b[2])[0];
      if (lap1 && lap1[3] >= 2) mk("partenza", forDriver(lap1[0], { value: lap1[3], stat: `da ${ord(lap1[1])} a ${ord(lap1[2])} al primo giro`, text: `Al via era ${ord(lap1[1])}, alla fine del primo giro ${ord(lap1[2])}: ${lap1[3]} posizioni in un giro.`, tiles: [{ big: "+" + lap1[3], small: "posizioni al primo giro" }, { big: ord(lap1[1]), small: "in griglia" }, { big: ord(lap1[2]), small: "dopo il giro 1" }], t: Math.max(0, raceStart - 5) }));
      const fen = [...grid.entries()].map(([d, g]) => { const r = finalPos.get(d); return r && isNum(r.position) && !r.dnf && !r.dsq ? [d, g, r.position, g - r.position] : null; }).filter(Boolean).sort((a, b) => b[3] - a[3] || a[2] - b[2])[0];
      if (fen && fen[3] >= 3) mk("fenice", forDriver(fen[0], { value: fen[3], stat: `da ${ord(fen[1])} a ${ord(fen[2])}`, text: `Partito ${ord(fen[1])}, arrivato ${ord(fen[2])}: la rimonta più grande della gara.`, tiles: [{ big: "+" + fen[3], small: "posizioni recuperate" }, { big: ord(fen[1]), small: "in griglia" }, { big: ord(fen[2]), small: "all'arrivo" }], t: Math.max(0, raceStart - 5) }));
    }

    // ---- Ripartenza fulminea: posizioni nei 2 giri dopo la fine di Safety Car o bandiera rossa ----
    let bestRe = null;
    windows.filter(w => w.kind !== "vsc").forEach(w => {
      posBy.forEach((L, d) => {
        const p0 = posAt(d, w.b - 0.001), p1 = posAt(d, w.b + 2 * typLap);
        if (p0 == null || p1 == null) return;
        const g = p0 - p1;
        if (!bestRe || g > bestRe.g || (g === bestRe.g && p1 < bestRe.p1)) bestRe = { d, g, p0, p1, w };
      });
    });
    if (bestRe && bestRe.g >= 1) {
      const lap = lapAt(bestRe.d, bestRe.w.b) || anyLapAt(bestRe.w.b);
      const after = bestRe.w.kind === "red" ? "bandiera rossa" : "Safety Car";
      mk("ripartenza", forDriver(bestRe.d, { value: bestRe.g, stat: `+${bestRe.g} ${bestRe.g === 1 ? "posizione" : "posizioni"} alla ripartenza`, text: `Dopo la ${after}${lap ? ` del giro ${lap}` : ""} è passato da ${ord(bestRe.p0)} a ${ord(bestRe.p1)} in 2 giri.`, tiles: [{ big: "+" + bestRe.g, small: "posizioni in 2 giri" }, { big: ord(bestRe.p0), small: "alla ripartenza" }, { big: ord(bestRe.p1), small: "2 giri dopo" }], t: Math.max(0, bestRe.w.b - 30) }));
    }

    // ---- Metronomo: scarto medio dei giri puliti ----
    const pitLaps = new Set(arr(raw.pit).filter(p => p && isNum(p.driver_number) && isNum(p.lap_number)).map(p => p.driver_number + ":" + p.lap_number));
    let bestMet = null;
    lapsBy.forEach((L, d) => {
      const ok = L.filter(g => g.lap_number >= 2 && isNum(g.lap_duration) && g.lap_duration > 20 && !g.is_pit_out_lap && !pitLaps.has(d + ":" + g.lap_number) && !neutral(g.s) && !neutral(g.s + g.lap_duration - 0.001));
      const med = median(ok.map(g => g.lap_duration));
      const clean = ok.filter(g => g.lap_duration <= med * 1.07);
      if (clean.length < 10) return;
      const mean = clean.reduce((s, g) => s + g.lap_duration, 0) / clean.length;
      const sd = Math.sqrt(clean.reduce((s, g) => s + (g.lap_duration - mean) ** 2, 0) / clean.length);
      if (!bestMet || sd < bestMet.sd || (sd === bestMet.sd && clean.length > bestMet.n)) bestMet = { d, sd, n: clean.length, t: clean[0].s };
    });
    if (bestMet) mk("metronomo", forDriver(bestMet.d, { value: Math.round(bestMet.sd * 1000) / 1000, stat: `scarto medio ${it(bestMet.sd, 2)} s su ${bestMet.n} giri`, text: `Su ${bestMet.n} giri puliti i suoi tempi si sono scostati in media di appena ${it(bestMet.sd, 2)} s.`, tiles: [{ big: it(bestMet.sd, 2) + " s", small: "scarto medio" }, { big: String(bestMet.n), small: "giri puliti" }], t: bestMet.t }));

    // ---- Gomma eterna: stint più lungo ----
    const st = arr(raw.stints).filter(s => s && isNum(s.driver_number) && isNum(s.lap_start) && isNum(s.lap_end) && s.lap_end >= s.lap_start).map(s => ({ ...s, n: s.lap_end - s.lap_start + 1 })).sort((a, b) => b.n - a.n)[0];
    if (st && st.n >= 10) {
      const comp = String(st.compound || "").toUpperCase();
      mk("eterna", forDriver(st.driver_number, { value: st.n, tyre: comp, stat: `${st.n} giri con la ${TYRE_IT[comp] || "stessa gomma"}`, text: `Ha fatto ${st.n} giri di fila con la gomma ${TYRE_IT[comp] || comp.toLowerCase()}, dal giro ${st.lap_start} al ${st.lap_end}.`, tiles: [{ big: String(st.n), small: "giri con la stessa gomma" }, { tyre: comp, big: TYRE_SHORT[comp] || comp, small: "mescola" }], t: lapStart(st.driver_number, st.lap_start) != null ? lapStart(st.driver_number, st.lap_start) : raceStart }));
    }

    // ---- Pit crew d'oro: tempo da fermo vero (stop_duration), della squadra ----
    const pc = arr(raw.pit).filter(p => p && isNum(p.driver_number) && isNum(p.stop_duration) && p.stop_duration > 0.8).sort((a, b) => a.stop_duration - b.stop_duration)[0];
    if (pc) { const I = info(pc.driver_number); mk("pitcrew", { num: pc.driver_number, code: I.code, who: I.team || I.who, team: I.team, color: I.color, value: pc.stop_duration, stat: `${it(pc.stop_duration, 1)} s da fermo`, text: `La sosta di ${I.last} al giro ${pc.lap_number}: ${it(pc.stop_duration, 1)} s da fermo, la più veloce della gara.`, tiles: [{ big: it(pc.stop_duration, 1) + " s", small: "da fermo" }, { big: I.code, small: "pilota" }], t: tOf(pc.date) != null ? Math.max(0, tOf(pc.date) - 10) : raceStart }); }
  }

  // ---- Giro della vita (qualifica): distacco più grande sul compagno di squadra ----
  if (kind === "quali") {
    const best = new Map();
    lapsAll.forEach(l => { if (isNum(l.lap_duration) && l.lap_duration > 20 && (!best.has(l.driver_number) || l.lap_duration < best.get(l.driver_number).lap_duration)) best.set(l.driver_number, l); });
    const teams = new Map();
    best.forEach((l, d) => { const tm = info(d).team; if (!tm) return; if (!teams.has(tm)) teams.set(tm, []); teams.get(tm).push(l); });
    let top = null;
    teams.forEach(ls => { if (ls.length < 2) return; ls.sort((a, b) => a.lap_duration - b.lap_duration); const gap = ls[1].lap_duration - ls[0].lap_duration; if (!top || gap > top.gap) top = { gap, fast: ls[0], slow: ls[1] }; });
    if (top && top.gap > 0.05) {
      const mate = info(top.slow.driver_number);
      mk("giro", forDriver(top.fast.driver_number, { value: Math.round(top.gap * 1000) / 1000, stat: `${it(top.gap, 3)} s sul compagno`, text: `Il suo giro migliore è stato più veloce di ${it(top.gap, 3)} s di quello di ${mate.who}, il compagno di squadra.`, tiles: [{ big: it(top.gap, 3) + " s", small: "sul compagno" }, { big: mate.code, small: "compagno" }], t: Math.max(0, (tOf(top.fast.date_start) || 0) - 5) }));
    }
  }

  // ---- Per ogni sessione: Missile, Re dei minisettori, Pittore di cordoli ----
  const fast = lapsAll.filter(l => isNum(l.st_speed) && l.st_speed > 0).sort((a, b) => b.st_speed - a.st_speed)[0];
  if (fast) mk("missile", forDriver(fast.driver_number, { value: fast.st_speed, stat: `${fast.st_speed} km/h allo speed trap`, text: `Il più veloce allo speed trap: ${fast.st_speed} km/h al giro ${fast.lap_number}.`, tiles: [{ big: String(fast.st_speed), small: "km/h allo speed trap" }, { big: String(fast.lap_number), small: "giro" }], t: Math.max(0, (tOf(fast.date_start) || 0)) }));
  const purple = new Map(), purpleLap = new Map();
  lapsAll.forEach(l => { const n = ["segments_sector_1", "segments_sector_2", "segments_sector_3"].reduce((s, k) => s + arr(l[k]).filter(x => x === 2051).length, 0); if (!n) return; purple.set(l.driver_number, (purple.get(l.driver_number) || 0) + n); const b = purpleLap.get(l.driver_number); if (!b || n > b.n) purpleLap.set(l.driver_number, { n, l }); });
  const pTop = [...purple.entries()].sort((a, b) => b[1] - a[1])[0];
  if (pTop) { const bl = purpleLap.get(pTop[0]).l; mk("minisettori", forDriver(pTop[0], { value: pTop[1], stat: `${pTop[1]} minisettori viola`, text: `${pTop[1]} volte è stato il più veloce di tutti in un minisettore.`, tiles: [{ big: String(pTop[1]), small: "minisettori viola" }, { big: String(bl.lap_number), small: "il giro con più viola" }], t: Math.max(0, tOf(bl.date_start) || 0) })); }
  const del = new Map(), delFirst = new Map();
  rc.filter(m => /DELETED/.test(m.msg) && /TRACK LIMITS/.test(m.msg)).forEach(m => { const d = isNum(m.driver_number) ? m.driver_number : (m.msg.match(/CAR (\d+)/) ? Number(m.msg.match(/CAR (\d+)/)[1]) : null); if (d == null) return; del.set(d, (del.get(d) || 0) + 1); if (!delFirst.has(d)) delFirst.set(d, m.s); });
  const kTop = [...del.entries()].sort((a, b) => b[1] - a[1])[0];
  if (kTop && kTop[1] >= 2) mk("cordoli", forDriver(kTop[0], { value: kTop[1], stat: `${kTop[1]} tempi cancellati`, text: `${kTop[1]} tempi cancellati per i limiti della pista: i cordoli li conosce tutti.`, tiles: [{ big: String(kTop[1]), small: "tempi cancellati" }], t: Math.max(0, delFirst.get(kTop[0]) - 20) }));

  const all = ORDER[kind].filter(id => out[id]).map(id => out[id]);
  const headline = all[0] || null;
  return { type: type || null, headline, list: all.slice(1), all };
}

module.exports = { computeGpTrophies, DEFS, TYRE_SHORT };
