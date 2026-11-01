// Dati veri di Formula 1 da OpenF1 (api.openf1.org/v1), gratis per le sessioni finite: durante una sessione l'accesso
// gratuito è bloccato (errore con locked: true, come nell'app di oggi) e i dati arrivano a fine sessione.
// - createOpenF1(): richieste nei limiti del piano gratuito (3 al secondo, 30 al minuto); con "troppe richieste" (429)
//   aspetta 20 s e riprova una volta, poi { code: "busy" }. "No results found." vuol dire elenco vuoto.
// - buildReplay(): la sessione finita rivista come la diretta del simulatore (src/logic/live-sim.js), con la stessa
//   interfaccia: le schermate della diretta la usano senza sapere da dove vengono i dati (source: "openf1").
//   Classifica dalle posizioni, distacchi da intervals, giri e settori colorati, gomme dagli stint, box da pit,
//   bandiere e messaggi da race_control, meteo, team radio e telemetria del giro (car_data, solo quando serve).
// - lastRaceFromResult(): l'ultima gara (podio e classifica) da session_result, nella forma di LAST_RACE_INIT.
// I dati di prova sono la gara vera di Baku 2026 (test/fixtures, da tools/make_openf1_fixture.py).
const LiveSim = require("../logic/live-sim");

const OF1_BASE = "https://api.openf1.org/v1";
const LIMIT_SEC = 3, LIMIT_MIN = 30;   // piano gratuito di OpenF1
const RETRY_429_MS = 20000;
const PER = LiveSim.PER_SECTOR;        // caselle dei minisettori per settore, come nel simulatore

const arr = v => (Array.isArray(v) ? v : []);
const msOf = iso => { const v = iso ? Date.parse(iso) : NaN; return isFinite(v) ? v : null; };
const isNum = v => typeof v === "number" && isFinite(v);
const r3 = v => Math.round(v * 1000) / 1000;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// Ultimo elemento di un elenco ordinato con chiave <= x (indice, oppure -1).
function lastAtOrBefore(list, x, key = e => e.t) {
  let lo = 0, hi = list.length - 1, ans = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (key(list[m]) <= x) { ans = m; lo = m + 1; } else hi = m - 1; }
  return ans;
}
const median = a => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

function failure(code, message, extra = {}) {
  const e = new Error(message || code);
  e.code = code; e.locked = false;
  return Object.assign(e, extra);
}

// ── Richieste ───────────────────────────────────────────────────────────
// liveBase (31/10): la nostra funzione su Vercel (api/live.js) che, con l'abbonamento di OpenF1, dà i dati anche durante
// la sessione: get(path, query, { live: true }) passa da lì ("…/api/live?p=laps&session_key=…").
function createOpenF1({ fetchImpl, now = Date.now, sleep = ms => new Promise(r => setTimeout(r, ms)), base = OF1_BASE, liveBase = null } = {}) {
  const doFetch = fetchImpl || ((...a) => fetch(...a));
  const sent = [];                    // quando sono partite le ultime richieste (ms)
  let queue = Promise.resolve();
  // Aspetta il proprio turno: mai più di 3 richieste in un secondo né 30 in un minuto, anche se chieste tutte insieme.
  async function slot() {
    for (;;) {
      const n = now();
      while (sent.length && n - sent[0] >= 60000) sent.shift();
      const lastSec = sent.filter(x => n - x < 1000);
      let wait = 0;
      if (lastSec.length >= LIMIT_SEC) wait = lastSec[lastSec.length - LIMIT_SEC] + 1000 - n;
      if (sent.length >= LIMIT_MIN) wait = Math.max(wait, sent[sent.length - LIMIT_MIN] + 60000 - n);
      if (wait <= 0) { sent.push(n); return; }
      await sleep(wait);
    }
  }
  const acquire = () => { const p = queue.then(slot); queue = p.catch(() => {}); return p; };
  async function request(url) {
    await acquire();
    let r;
    try { r = await doFetch(url); } catch (e) { throw failure("network", "Impossibile raggiungere OpenF1"); }
    let body = null;
    try { body = await r.json(); } catch (e) { body = null; }
    return { r, body };
  }
  async function get(path, query = "", { live = false } = {}) {
    const q = typeof query === "string" ? query : Object.entries(query).map(([k, v]) => k + "=" + encodeURIComponent(v)).join("&");
    const url = live && liveBase ? `${liveBase}?p=${path}${q ? "&" + q : ""}` : `${base}/${path}${q ? "?" + q : ""}`;
    let { r, body } = await request(url);
    if (r.status === 429) {
      await sleep(RETRY_429_MS);
      ({ r, body } = await request(url));
      if (r.status === 429) throw failure("busy", "OpenF1 ha ricevuto troppe richieste");
    }
    const detail = body && !Array.isArray(body) && body.detail ? String(body.detail) : "";
    if (/no results found/i.test(detail)) return [];
    if (!r.ok || detail) {
      const locked = /live f1 session in progress|authenticated/i.test(detail) || r.status === 401 || r.status === 403;
      throw failure(locked ? "locked" : "failed", detail || "HTTP " + r.status, { locked, status: r.status });
    }
    return Array.isArray(body) ? body : [];
  }
  const keyQ = sessionKey => "session_key=" + encodeURIComponent(sessionKey);
  async function latestSession({ live = false } = {}) { return (await get("sessions", "session_key=latest", { live }))[0] || null; }
  // Sessioni del weekend (31/10 sera: per rivedere anche PL1, PL2, qualifiche…), dalla prima; con before solo quelle già
  // cominciate a quell'ora. Una richiesta.
  async function weekendSessions(meetingKey, { before = null, live = false } = {}) {
    if (meetingKey == null || meetingKey === "") return [];
    const list = await get("sessions", "meeting_key=" + encodeURIComponent(meetingKey), { live });
    const at = x => Date.parse(x && x.date_start);
    return list.filter(x => isFinite(at(x)) && (before == null || at(x) <= before)).sort((a, b) => at(a) - at(b));
  }
  // Tutto quello che serve per rivedere una sessione: al massimo 11 richieste (intervals solo in gara e Sprint).
  // Senza sessione, piloti, giri o posizioni non c'è niente da vedere (l'errore passa); il resto può mancare.
  async function loadSession(sessionKey, { live = false } = {}) {
    const q = keyQ(sessionKey), o = { live };
    const [session] = await get("sessions", q, o);
    if (!session) return null;
    const race = isRaceType(sessionType(session));
    const must = p => get(p, q, o);
    const opt = p => get(p, q, o).catch(e => { if (e.locked) throw e; return []; });
    const [drivers, laps, stints, pit, position, intervals, race_control, team_radio, weather, session_result] = await Promise.all([
      must("drivers"), must("laps"), opt("stints"), opt("pit"), must("position"), race ? opt("intervals") : Promise.resolve([]),
      opt("race_control"), opt("team_radio"), opt("weather"), opt("session_result"),
    ]);
    return { session, drivers, laps, stints, pit, position, intervals, race_control, team_radio, weather, session_result };
  }
  const weatherOf = sessionKey => get("weather", keyQ(sessionKey));
  // Telemetria di un pezzo di sessione (date ISO in UTC, senza fuso: come negli esempi di OpenF1).
  // 1/11 sera: durante la diretta (live) passa dalla nostra funzione di Vercel: l'API gratuita in gara è bloccata e la
  // telemetria "ci metteva un po' e poi diceva che non può" (Edoardo).
  const carData = (sessionKey, driverNumber, fromIso, toIso, { live = false } = {}) =>
    get("car_data", `${keyQ(sessionKey)}&driver_number=${encodeURIComponent(driverNumber)}&date>=${fromIso}&date<=${toIso}`, { live });
  return { get, latestSession, weekendSessions, loadSession, weatherOf, carData };
}

// ── Sessione rivista ────────────────────────────────────────────────────
const TYPE_BY_NAME = { "practice 1": "FP1", "practice 2": "FP2", "practice 3": "FP3", "sprint qualifying": "SQ", "sprint shootout": "SQ",
  sprint: "SPRINT", qualifying: "QUALI", race: "RACE" };
function sessionType(s) {
  const n = String((s && s.session_name) || "").trim().toLowerCase();
  if (TYPE_BY_NAME[n]) return TYPE_BY_NAME[n];
  const ty = String((s && s.session_type) || "").trim().toLowerCase();
  return ty === "race" ? "RACE" : ty === "qualifying" ? "QUALI" : "FP1";
}
const isRaceType = type => type === "RACE" || type === "SPRINT";
// Quale sessione rivedere: quella scelta, se è ancora tra le sessioni del weekend; se no l'ultima.
function replayTarget({ latest, list, pick }) {
  const hit = pick != null && Array.isArray(list) ? list.find(x => x && x.session_key === pick) : null;
  return hit || latest;
}
// Sigla corta della sessione, per i tasti della scelta.
const SHORT = { FP1: "PL1", FP2: "PL2", FP3: "PL3", SQ: "Q SPRINT", SPRINT: "SPRINT", QUALI: "QUALIFICHE", RACE: "GARA" };
const sessionShort = s => SHORT[sessionType(s)];
const LIVE_AHEAD_S = 90;   // 1/11 notte: in diretta il tempo scorre fino a 90 s oltre gli ultimi dati arrivati
const COMPOUND = { SOFT: "S", MEDIUM: "M", HARD: "H", INTERMEDIATE: "I", WET: "W" };
const SEGMENT = { 2051: "purple", 2049: "green", 2048: "yellow", 2064: "pit" };
const STATUS_BG = { yellow: "yellow", sc: "yellow", vsc: "yellow", red: "red" };
const FLAG_RANK = { green: 0, yellow: 1, vsc: 2, sc: 3, red: 4 };
// Fuso del circuito ("04:00:00", "-05:00:00") in secondi: i messaggi della direzione gara hanno l'ora del posto.
function offsetSec(g) {
  const m = /^(-)?(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(String(g || "").trim());
  if (!m) return 0;
  const s = +m[2] * 3600 + +m[3] * 60 + +(m[4] || 0);
  return m[1] ? -s : s;
}
const clockOf = (epochMs, off) => { const d = new Date(epochMs + off * 1000); return [d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()].map(x => String(x).padStart(2, "0")).join(":"); };
// Distacco di OpenF1: secondi, oppure "+1 LAP" / "+2 LAPS" (doppiati).
function parseGap(v) {
  if (isNum(v)) return { v, down: 0 };
  const s = v == null ? "" : String(v);
  const lap = /(\d+)\s*LAP/i.exec(s);
  if (lap) return { v: null, down: +lap[1] };
  const f = parseFloat(s.replace("+", ""));
  return isFinite(f) ? { v: f, down: 0 } : { v: null, down: 0 };
}
// Minisettori di un settore (lunghezza variabile in OpenF1) ricampionati a PER caselle.
function resample(seg) {
  const a = arr(seg);
  if (!a.length) return new Array(PER).fill("none");
  return Array.from({ length: PER }, (_, i) => SEGMENT[a[Math.min(a.length - 1, Math.floor(i * a.length / PER))]] || "none");
}

function buildReplay(raw = {}, track = null, { drivers = [], of1 = null, live = false, laps = null } = {}) {
  raw = raw || {};
  const session = raw.session || {};
  const type = sessionType(session);
  const isRace = isRaceType(type);
  const sessionKey = session.session_key != null ? session.session_key : null;
  const lapsIn = arr(raw.laps);
  const firstLapMs = lapsIn.map(l => msOf(l.date_start)).filter(v => v != null).sort((a, b) => a - b)[0];
  const startMs = msOf(session.date_start) != null ? msOf(session.date_start) : firstLapMs != null ? firstLapMs : 0;
  const endMs = msOf(session.date_end);
  const tOf = iso => { const v = msOf(iso); return v == null ? null : (v - startMs) / 1000; };
  const off = offsetSec(session.gmt_offset);
  const L = track && track.lenM ? track.lenM : 5000;
  const pointAt = s => (track && track.pointAt ? track.pointAt(s) : [0, 0]);
  const refLap = track && track.lapTime ? track.lapTime : null;

  // Piloti: sigla di OpenF1 = sigla dell'app (driverCode); gli sconosciuti con la sigla in minuscolo e il colore della scuderia.
  const known = new Map(arr(drivers).map(d => [d.code, d]));
  const info = new Map();
  const addDriver = (num, d = {}) => {
    if (info.has(num)) return info.get(num);
    const code = d.name_acronym || "#" + num, k = known.get(code);
    const x = { id: k ? k.id : String(d.name_acronym || num).toLowerCase(), code, number: num, color: k ? k.color : d.team_colour ? "#" + String(d.team_colour).replace(/^#/, "") : "#8A8A93" };
    info.set(num, x);
    return x;
  };
  arr(raw.drivers).forEach(d => { if (d && d.driver_number != null) addDriver(d.driver_number, d); });
  const group = (list, keyOf) => { const m = new Map(); list.forEach(x => { const k = keyOf(x); if (k == null) return; if (!m.has(k)) m.set(k, []); m.get(k).push(x); }); return m; };

  // Quanti minisettori ha ogni settore su questa pista (per dire in quale settore è una bandiera gialla).
  const mode = list => { const c = new Map(); list.forEach(v => c.set(v, (c.get(v) || 0) + 1)); let best = null, n = 0; c.forEach((k, v) => { if (k > n) { n = k; best = v; } }); return best; };
  const miniN = [1, 2, 3].map(k => mode(lapsIn.map(l => arr(l["segments_sector_" + k]).length).filter(v => v > 0)) || PER);
  const bigSector = mini => (mini <= miniN[0] ? 1 : mini <= miniN[0] + miniN[1] ? 2 : 3);

  // Direzione gara: messaggi in ordine e bandiere nel tempo.
  const rc = arr(raw.race_control).map(m => ({ m, t: tOf(m.date) })).filter(x => x.t != null).sort((a, b) => a.t - b.t);
  const flagTL = [];
  {
    let sc = false, vsc = false, red = false;
    const yel = new Map();
    rc.forEach(({ m, t }) => {
      const msg = String(m.message || "").toUpperCase(), f = String(m.flag || "").toUpperCase(), scope = String(m.scope || "").toUpperCase();
      if (/VIRTUAL SAFETY CAR DEPLOYED/.test(msg)) { vsc = true; sc = false; }
      else if (/VIRTUAL SAFETY CAR ENDING/.test(msg)) vsc = false;
      else if (/SAFETY CAR DEPLOYED/.test(msg)) { sc = true; vsc = false; }
      if (f === "RED") red = true;
      if (f === "GREEN" || f === "CHEQUERED") { red = false; sc = false; vsc = false; }
      if (f === "CLEAR" && scope !== "SECTOR") { red = false; sc = false; vsc = false; yel.clear(); }
      if ((f === "YELLOW" || f === "DOUBLE YELLOW") && scope === "SECTOR" && m.sector != null) { yel.delete(m.sector); yel.set(m.sector, bigSector(m.sector)); }
      if (f === "CLEAR" && scope === "SECTOR" && m.sector != null) yel.delete(m.sector);
      const flag = red ? "red" : sc ? "sc" : vsc ? "vsc" : yel.size ? "yellow" : "green";
      flagTL.push({ t, flag, flagSector: flag === "yellow" ? [...yel.values()][yel.size - 1] : null });
    });
  }
  const flagAt = x => { const i = lastAtOrBefore(flagTL, x); return i < 0 ? { flag: "green", flagSector: null } : flagTL[i]; };
  const worstFlag = (a, b) => {
    let w = flagAt(a).flag;
    for (let i = lastAtOrBefore(flagTL, a) + 1; i < flagTL.length && flagTL[i].t <= b; i++) if (FLAG_RANK[flagTL[i].flag] > FLAG_RANK[w]) w = flagTL[i].flag;
    return w;
  };
  const chequers = rc.filter(({ m }) => String(m.flag || "").toUpperCase() === "CHEQUERED").map(x => x.t);
  const chequeredT = chequers.length ? (isRace ? chequers[0] : chequers[chequers.length - 1]) : null;

  // Soste, stint, posizioni, distacchi e risultato di ogni pilota.
  const pitBy = group(arr(raw.pit).map(p => ({ num: p.driver_number, t: tOf(p.date), lap: p.lap_number, dur: isNum(p.lane_duration) ? p.lane_duration : isNum(p.pit_duration) ? p.pit_duration : 0 })).filter(p => p.t != null), p => p.num);
  pitBy.forEach(list => list.sort((a, b) => a.t - b.t));
  const stintBy = group(arr(raw.stints), s => s.driver_number);
  const posBy = group(arr(raw.position).map(p => ({ num: p.driver_number, t: tOf(p.date), position: p.position })).filter(p => p.t != null && isNum(p.position)), p => p.num);
  posBy.forEach(list => list.sort((a, b) => a.t - b.t));
  const ivBy = group(arr(raw.intervals).map(p => ({ num: p.driver_number, t: tOf(p.date), gap: parseGap(p.gap_to_leader), iv: parseGap(p.interval) })).filter(p => p.t != null), p => p.num);
  ivBy.forEach(list => list.sort((a, b) => a.t - b.t));
  const resultBy = new Map(arr(raw.session_result).filter(r => r && r.driver_number != null).map(r => [r.driver_number, r]));
  // Prove o qualifiche con la classifica ma ancora senza giri (OpenF1 li aggiunge qualche ora dopo, 31/10): posizione e
  // miglior giro dalla classifica (duration: il miglior giro; in qualifica uno per Q1/Q2/Q3, vale il più veloce).
  const fromResult = !isRace && !lapsIn.length && resultBy.size > 0;
  const resultBest = num => {
    const r = fromResult ? resultBy.get(num) : null;
    if (!r) return null;
    const t = (Array.isArray(r.duration) ? r.duration : [r.duration]).filter(isNum).sort((a, b) => a - b)[0];
    return t == null ? null : { lapNo: isNum(r.number_of_laps) ? r.number_of_laps : null, time: t };
  };
  const resultPos = num => { const r = fromResult ? resultBy.get(num) : null; return r && isNum(r.position) ? r.position : null; };
  arr(raw.position).forEach(p => p && p.driver_number != null && addDriver(p.driver_number));

  // Giri: inizio e fine nel tempo della sessione, poi i giri nella forma del simulatore.
  const lapsBy = group(lapsIn.filter(l => l && l.lap_number != null), l => l.driver_number);
  const metaBy = new Map(), recsBy = new Map();
  lapsBy.forEach((list, num) => {
    addDriver(num);
    const byNo = new Map();
    list.forEach(l => { const old = byNo.get(l.lap_number); if (!old || (!isNum(old.lap_duration) && isNum(l.lap_duration))) byNo.set(l.lap_number, l); });
    const ls = [...byNo.values()].sort((a, b) => a.lap_number - b.lap_number);
    const durs = ls.map(l => l.lap_duration).filter(v => isNum(v) && v > 0);
    const typical = median(durs) || refLap || 100;
    const M = ls.map(l => ({ lapNo: l.lap_number, start: tOf(l.date_start), dur: isNum(l.lap_duration) && l.lap_duration > 0 ? l.lap_duration : null,
      s: [1, 2, 3].map(k => (isNum(l["duration_sector_" + k]) ? l["duration_sector_" + k] : null)), seg: [1, 2, 3].map(k => l["segments_sector_" + k]), out: !!l.is_pit_out_lap }));
    M.forEach((g, i) => {
      if (g.start != null) return;
      const prev = M[i - 1], next = M[i + 1];
      if (prev && prev.start != null) g.start = prev.start + (prev.dur || typical);
      else if (next && next.start != null) g.start = next.start - (g.dur || typical);
    });
    const ok = M.filter(g => g.start != null);
    ok.forEach((g, i) => { const next = ok[i + 1]; g.end = g.dur != null ? g.start + g.dur : null; g.done = g.end != null ? g.end : next ? next.start : null; });
    ok.typical = typical;
    metaBy.set(num, ok);
    const pits = new Set((pitBy.get(num) || []).map(p => p.lap));
    const stints = (stintBy.get(num) || []).slice().sort((a, b) => (a.lap_start || 0) - (b.lap_start || 0));
    recsBy.set(num, ok.map(g => {
      const st = stints.find(s => (s.lap_start || 1) <= g.lapNo && (s.lap_end == null || g.lapNo <= s.lap_end));
      return {
        lapNo: g.lapNo, time: g.dur, sectors: g.s.map(v => ({ t: v, st: "none" })), minis: [].concat(...g.seg.map(resample)), st: "none",
        factor: g.dur != null && refLap ? g.dur / refLap : null, kind: g.out ? "out" : "push",
        flag: worstFlag(g.start, g.done != null ? g.done : g.start + typical),
        tyre: st ? COMPOUND[String(st.compound || "").toUpperCase()] || null : null,
        age: st ? (st.tyre_age_at_start || 0) + (g.lapNo - (st.lap_start || 1)) : null, pitIn: pits.has(g.lapNo),
      };
    }));
  });
  // Giri e settori viola o verdi come sono stati fatti: nell'ordine in cui sono finiti.
  {
    const all = [];
    metaBy.forEach((M, num) => M.forEach((g, i) => { if (g.done != null) all.push({ num, i, done: g.done }); }));
    all.sort((a, b) => a.done - b.done);
    let bestAll = Infinity;
    const bestSec = [Infinity, Infinity, Infinity], pb = new Map(), pbSec = new Map();
    all.forEach(({ num, i }) => {
      const g = metaBy.get(num)[i], rec = recsBy.get(num)[i], green = rec.flag === "green";
      if (!pbSec.has(num)) pbSec.set(num, [Infinity, Infinity, Infinity]);
      const own = pbSec.get(num);
      g.s.forEach((ts, k) => {
        if (ts == null) return;
        rec.sectors[k].st = !green ? "yellow" : ts < bestSec[k] ? "purple" : ts < own[k] ? "green" : "yellow";
        if (green) { own[k] = Math.min(own[k], ts); bestSec[k] = Math.min(bestSec[k], ts); }
      });
      if (g.dur == null) return;
      const counts = !isRace || g.lapNo > 1, mine = pb.has(num) ? pb.get(num) : Infinity;
      if (green && counts && g.dur < bestAll) rec.st = "purple";
      else if (g.dur < mine) rec.st = "green";
      if (counts) { pb.set(num, Math.min(mine, g.dur)); if (green) bestAll = Math.min(bestAll, g.dur); }
    });
  }

  // Ritiri (da session_result): il pilota esce dopo il suo ultimo giro.
  const dnfOf = new Map();
  resultBy.forEach((r, num) => {
    if (!(r.dnf || r.dns)) return;
    const M = metaBy.get(num) || [], last = M[M.length - 1];
    const t = last ? (last.end != null ? last.end : last.start + (M.typical || 100)) : 0;
    dnfOf.set(num, { t, lap: last ? last.lapNo : 0, cause: "altro" });
  });
  // 1/11 sera (Edoardo: "nella classifica della gara metti i DNF che si vedano"): in diretta session_result di solito
  // non ha ancora i ritiri. Un'auto che non chiude il giro iniziato da più di 3 giri tipici, mentre le altre ne chiudono,
  // si è fermata: ritirata in quel giro. Non vale ai box (pit in quel giro) né con la bandiera rossa.
  if (isRace) {
    let seen = 0;
    metaBy.forEach(M => M.forEach(m => { const v = m.end != null ? m.end : m.start; if (v > seen) seen = v; }));
    metaBy.forEach((M, num) => {
      if (dnfOf.has(num) || !M.length) return;
      const last = M[M.length - 1], typ = M.typical || 100;
      if (last.end != null || last.start + 3 * typ > seen) return;
      if ((pitBy.get(num) || []).some(p => p.lap === last.lapNo)) return;
      if (flagAt(seen).flag === "red" || flagAt(last.start + typ).flag === "red") return;
      dnfOf.set(num, { t: last.start + typ, lap: last.lapNo, cause: "altro", live: true });
    });
  }
  const winnerRes = arr(raw.session_result).find(r => r && r.position === 1);
  let maxLap = 0;
  metaBy.forEach(M => M.forEach(g => { maxLap = Math.max(maxLap, g.lapNo); }));
  // 1/11 notte (Edoardo: "in Messico sono 71 non 50"): in diretta i giri previsti del circuito (laps), non quelli fatti.
  const totalLaps = isRace ? (winnerRes && isNum(winnerRes.number_of_laps) && winnerRes.number_of_laps > 0 ? winnerRes.number_of_laps : Math.max(maxLap, isNum(laps) && laps > 0 ? laps : 0)) : 0;
  let lastEnd = null;
  metaBy.forEach(M => M.forEach(g => { const e = g.done != null ? g.done : g.start; if (lastEnd == null || e > lastEnd) lastEnd = e; }));
  const lastMsg = rc.length ? rc[rc.length - 1].t : null;
  const duration = Math.max(0, lastEnd != null ? Math.max(lastEnd, lastMsg != null ? Math.min(lastMsg, lastEnd + 45 * 60) : lastEnd)
    : lastMsg != null ? lastMsg : endMs != null ? (endMs - startMs) / 1000 : 0);
  const nums = [...info.keys()].filter(n => (metaBy.get(n) || []).length || (posBy.get(n) || []).length);

  let x = duration;   // la sessione rivista parte dalla fine
  const done = (num, at) => { const M = metaBy.get(num) || []; let k = 0; while (k < M.length && M[k].done != null && M[k].done <= at) k++; return k; };
  const startedN = (num, at) => { const M = metaBy.get(num) || []; let k = 0; while (k < M.length && M[k].start <= at) k++; return k; };
  function bestLapAt(at) {
    let b = null;
    metaBy.forEach((M, num) => M.forEach(g => {
      if (g.dur == null || g.done == null || g.done > at || (isRace && g.lapNo <= 1)) return;
      if (!b || g.dur < b.time || (g.dur === b.time && g.done < b.done)) b = { num, time: g.dur, lapNo: g.lapNo, done: g.done };
    }));
    if (!b) return null;
    const d = info.get(b.num);
    return { id: d.id, code: d.code, time: b.time, lapNo: b.lapNo };
  }
  const raceFinished = at => (chequeredT != null ? at >= chequeredT : !isRace && duration > 0 && at >= duration);

  function carAt(num, at) {
    const d = info.get(num), M = metaBy.get(num) || [], R = recsBy.get(num) || [];
    const nDone = done(num, at), nStarted = startedN(num, at);
    const cur = nStarted ? M[nStarted - 1] : null, curRec = nStarted ? R[nStarted - 1] : null;
    const inLap = !!cur && (cur.done != null ? at < cur.done : true);
    const D = dnfOf.get(num), dnf = D && at >= D.t ? { cause: D.cause, lap: D.lap } : null;
    const pits = pitBy.get(num) || [];
    const inPit = pits.some(p => p.t <= at && at < p.t + p.dur);
    const typical = M.typical || refLap || 100;
    const frac = inLap ? clamp((at - cur.start) / (cur.dur || typical), 0, 0.9999) : 0;
    // 1/11 notte (Edoardo: "i punti dei piloti non si vedono"): in diretta OpenF1 scrive il giro solo quando è chiuso,
    // quindi dopo l'ultimo giro chiuso ogni auto finiva sulla linea del traguardo, tutte una sopra l'altra. Ora si stima
    // il giro in corso dalla fine dell'ultimo (giro tipico), finché non arriva quello vero; mai ai box, ritirata o a
    // gara finita.
    const lastG = !inLap && nDone ? M[nDone - 1] : null, lastEnd = lastG ? (lastG.done != null ? lastG.done : lastG.start + (lastG.dur || typical)) : null;
    const ghost = isRace && lastEnd != null && !dnf && !inPit && at >= lastEnd && at - lastEnd < 2 * typical && !raceFinished(at);
    const gfrac = ghost ? clamp((at - lastEnd) / typical, 0, 0.98) : 0;
    let best = null;
    for (let i = 0; i < nDone; i++) { const r = R[i]; if (r.time != null && (!isRace || r.lapNo > 1) && (!best || r.time < best.time)) best = { lapNo: r.lapNo, time: r.time }; }
    if (!best) best = resultBest(num);
    const sectors = [null, null, null], minis = new Array(3 * PER).fill("none");
    if (inLap && curRec) {
      let acc = cur.start;
      for (let k = 0; k < 3; k++) {
        const st = cur.s[k] != null ? cur.s[k] : (cur.dur || typical) / 3;
        for (let i = 0; i < PER; i++) if (at >= acc + st * (i + 1) / PER) minis[k * PER + i] = curRec.minis[k * PER + i];
        acc += st;
        if (at >= acc && cur.s[k] != null) sectors[k] = curRec.sectors[k];
      }
    }
    const res = resultBy.get(num);
    const finished = isRace && !dnf && raceFinished(at) && (res && isNum(res.number_of_laps) && !res.dnf
      ? nDone >= res.number_of_laps && res.number_of_laps > 0
      : M.slice(0, nDone).some(g => g.done >= chequeredT - 1));
    const tyreRec = R[Math.max(0, nStarted - 1)] || null;
    const P = posBy.get(num) || [];
    const pi = lastAtOrBefore(P, at);
    const IV = ivBy.get(num) || [], ii = lastAtOrBefore(IV, at);
    const garage = !isRace && !inLap;
    return {
      id: d.id, code: d.code, number: d.number, color: d.color, pos: 0, grid: P.length ? P[0].position : null, x: 0, y: 0,
      speed: inLap && !inPit && !dnf ? L / (cur.dur || typical) : ghost ? L / typical : 0, dist: dnf ? nDone * L : inLap ? (nStarted - 1 + frac) * L : ghost ? (nDone + gfrac) * L : nDone * L,
      gap: null, interval: null, lapsDown: 0, lap: isRace ? Math.max(1, nStarted) : nDone + 1,
      last: nDone ? R[nDone - 1] : null, best, sectors, minis,
      pit: !dnf && (inPit || garage), out: false, outIn: null, tyre: tyreRec ? tyreRec.tyre : null,
      tyreAge: tyreRec && tyreRec.age != null ? tyreRec.age + (inLap || !nDone ? 0 : 1) : null, finished,   // fuori dal giro: compreso l'ultimo fatto
      tyreLife: null, wear: null, stops: pits.filter(p => p.t <= at).length, dnf,
      _pos: fromResult ? resultPos(num) : pi >= 0 ? P[pi].position : null, _first: P.length ? P[0].position : null, _iv: ii >= 0 ? IV[ii] : null,
      _s: inLap && !inPit && !dnf ? frac * L : ghost ? gfrac * L : 0, _pre: isRace && nStarted === 0, _done: nDone, _dnfT: D ? D.t : 0,
    };
  }

  function state() {
    const at = x;
    const cars = nums.map(n => carAt(n, at));
    const rank = c => (c._pos != null ? c._pos : 1000 + (c._first != null ? c._first : 999));
    cars.sort((a, b) => (a.dnf ? 1 : 0) - (b.dnf ? 1 : 0) || (a.dnf && b.dnf ? b._done - a._done || b._dnfT - a._dnfT : rank(a) - rank(b)) || a.number - b.number);
    const leaderBest = cars[0] && cars[0].best ? cars[0].best.time : null;
    cars.forEach((c, i) => {
      c.pos = i + 1;
      if (isRace) {
        if (!c.dnf && c._iv) { c.gap = i === 0 ? 0 : c._iv.gap.v; c.interval = i === 0 ? 0 : c._iv.iv.v; c.lapsDown = c._iv.gap.down; }
      } else { c.gap = c.best && leaderBest != null ? r3(c.best.time - leaderBest) : null; }
      // prima del via le macchine sono in griglia, dietro la linea, nell'ordine di partenza
      const p = pointAt(c._pre ? -(18 + i * 8) : c._s);
      c.x = p[0]; c.y = p[1];
      delete c._pos; delete c._first; delete c._iv; delete c._s; delete c._pre; delete c._done; delete c._dnfT;
    });
    const fl = flagAt(at), finished = raceFinished(at);
    const lead = cars.find(c => !c.dnf);
    const lap = isRace ? Math.max(1, Math.min(totalLaps || 1, lead ? lead.lap : 1)) : null;
    let bg = STATUS_BG[fl.flag] || "green";
    if (bg === "green" && isRace && (lap === 1 || lap === totalLaps || finished)) bg = "chequered";
    if (bg === "green" && !isRace && finished) bg = "chequered";
    const clock = !isRace && endMs != null ? Math.max(0, (endMs - startMs) / 1000 - at) : null;
    const upto = lastAtOrBefore(rc, at);
    return {
      type, t: at, flag: fl.flag, flagSector: fl.flagSector, bg, finished, lap, totalLaps,
      segment: null, clock, waiting: false, clockText: clock != null ? LiveSim.fmtClock(clock) : null,
      bestLap: bestLapAt(at),
      messages: rc.slice(0, upto + 1).map(({ m, t }) => ({ t, time: clockOf(startMs + t * 1000, off), lap: m.lap_number != null ? m.lap_number : null,
        cat: m.category || "Other", text: m.message || "", flag: m.flag || null, sector: m.sector != null ? m.sector : null })),
      cars,
    };
  }

  // Telemetria di un giro da car_data: chiesta a OpenF1 solo quando serve, poi resta in memoria.
  const telCache = new Map();
  const isoAt = sec => new Date(startMs + sec * 1000).toISOString().replace("Z", "");
  async function telemetryAsync(id, lapNo) {
    const key = id + ":" + lapNo;
    if (telCache.has(key)) return telCache.get(key);
    const num = [...info.keys()].find(n => info.get(n).id === id);
    const M = num != null ? metaBy.get(num) || [] : [];
    const g = M.find(m => m.lapNo === lapNo), rec = g ? recsBy.get(num)[M.indexOf(g)] : null;
    if (!g || g.end == null || !of1 || !of1.carData) return null;
    let data;
    try { data = await of1.carData(sessionKey, num, isoAt(g.start), isoAt(g.end), { live }); } catch (e) { return null; }
    const S = arr(data).map(c => ({ t: tOf(c.date), c })).filter(s => s.t != null).sort((a, b) => a.t - b.t);
    if (S.length < 2) return null;
    const out = { id, code: info.get(num).code, lapNo, time: g.dur, sectors: rec.sectors, dist: [], speed: [], throttle: [], brake: [], gear: [], rpm: [], sectorDist: [] };
    let dist = 0;
    S.forEach((s, i) => {
      if (i > 0) dist += ((S[i - 1].c.speed || 0) + (s.c.speed || 0)) / 2 / 3.6 * (s.t - S[i - 1].t);
      out.dist.push(Math.round(dist));
      out.speed.push(s.c.speed || 0);
      out.throttle.push(clamp(s.c.throttle || 0, 0, 100));
      out.brake.push((s.c.brake || 0) >= 50 ? 1 : 0);
      out.gear.push(s.c.n_gear || 0);
      out.rpm.push(s.c.rpm || 0);
    });
    // Fine di S1 e S2 sulla distanza del giro (alla data in cui sono finiti).
    const distAt = sec => { const i = lastAtOrBefore(S, sec); if (i < 0) return 0; if (i >= S.length - 1) return out.dist[S.length - 1]; const f = (sec - S[i].t) / (S[i + 1].t - S[i].t || 1); return Math.round(out.dist[i] + (out.dist[i + 1] - out.dist[i]) * f); };
    out.sectorDist = g.s[0] != null && g.s[1] != null ? [distAt(g.start + g.s[0]), distAt(g.start + g.s[0] + g.s[1])] : [L / 3, 2 * L / 3];
    telCache.set(key, out);
    return out;
  }

  const radioList = arr(raw.team_radio).map(r => ({ r, t: tOf(r.date) })).filter(x => x.t != null && x.r.recording_url).sort((a, b) => a.t - b.t)
    .map(({ r, t }) => { const d = addDriver(r.driver_number); return { id: d.id, code: d.code, date: r.date, lap: startedN(r.driver_number, t) || null, url: r.recording_url, t }; });
  const wx = arr(raw.weather).map(w => ({ w, t: tOf(w.date) })).filter(x => x.t != null).sort((a, b) => a.t - b.t);

  return {
    source: "openf1", type, totalLaps, duration, sessionKey,
    get t() { return x; },
    advance(sec) { x = clamp(x + (isNum(sec) ? sec : 0), 0, duration + (live ? LIVE_AHEAD_S : 0)); },
    jumpTo(v) { x = clamp(isNum(v) ? v : 0, 0, duration + (live ? LIVE_AHEAD_S : 0)); },
    // All'inizio dell'ultimo giro del vincitore (in prove e qualifiche: all'ultimo minuto).
    jumpToLastLap() {
      if (isRace && totalLaps) {
        const win = winnerRes ? winnerRes.driver_number : null;
        const lastStart = Math.max(...[...metaBy.entries()].filter(([n]) => win == null || n === win)
          .map(([, M]) => { const g = M.find(m => m.lapNo === totalLaps); return g ? g.start : -Infinity; }));
        if (isFinite(lastStart)) { x = clamp(lastStart + 0.5, 0, duration); return; }
      }
      x = clamp(duration - 60, 0, duration);
    },
    state,
    // 1/11 notte (Edoardo: "pit stop fatti per pilota, toccando quali gomme ha cambiato"): gli stint veri di OpenF1 fino
    // al giro di adesso: [{ c: mescola, from, to, age }] (to = null se è lo stint in corso).
    stints(id) {
      const num = [...info.keys()].find(n => info.get(n).id === id);
      if (num == null) return [];
      const now = done(num, x) + 1;
      return (stintBy.get(num) || []).slice().sort((a, b) => (a.lap_start || 0) - (b.lap_start || 0))
        .filter(st => (st.lap_start || 1) <= now)
        .map(st => ({ c: COMPOUND[String(st.compound || "").toUpperCase()] || null, from: st.lap_start || 1, to: st.lap_end && st.lap_end < now ? st.lap_end : null, age: isNum(st.tyre_age_at_start) ? st.tyre_age_at_start : null }));
    },
    laps(id) {
      const num = [...info.keys()].find(n => info.get(n).id === id);
      return num == null ? [] : (recsBy.get(num) || []).slice(0, done(num, x));
    },
    feed() {
      return {
        bestLap: bestLapAt(x),
        dnfs: [...dnfOf.entries()].filter(([, D]) => x >= D.t).sort((a, b) => a[1].t - b[1].t)
          .map(([num, D]) => ({ id: info.get(num).id, code: info.get(num).code, cause: D.cause, lap: D.lap, t: D.t })),
      };
    },
    telemetry(id, lapNo) { return telCache.get(id + ":" + lapNo) || null; },
    telemetryAsync,
    liveTelemetry() { return null; },
    radios() { return radioList.map(r => ({ ...r })); },
    weather() {
      const i = lastAtOrBefore(wx, x);
      if (i < 0) return null;
      const w = wx[i].w;
      return { air: w.air_temperature, track: w.track_temperature, humidity: w.humidity, wind: isNum(w.wind_speed) ? Math.round(w.wind_speed * 3.6) : null,
        windDir: w.wind_direction, rain: !!w.rainfall };
    },
    rained() { return wx.some(({ w }) => !!w.rainfall); },
    setFlag() { return false; },
    retire() { return false; },
  };
}

// ── Ultima gara ─────────────────────────────────────────────────────────
// Tempo totale della gara: 5882.143 → "1:38:02.143".
function fmtRaceTime(sec) {
  const tot = Math.round(sec * 1000), h = Math.floor(tot / 3600000), m = Math.floor(tot / 60000) % 60, s = (tot % 60000) / 1000;
  return `${h}:${String(m).padStart(2, "0")}:${s.toFixed(3).padStart(6, "0")}`;
}
const lapsWord = n => `+${n} ${n === 1 ? "giro" : "giri"}`;
function lastRaceFromResult(raw = {}, races = [], { drivers = [] } = {}) {
  raw = raw || {};
  const res = arr(raw.session_result).filter(r => r && r.driver_number != null);
  const s = raw.session || {};
  if (!res.length || sessionType(s) !== "RACE") return null;
  const known = new Map(arr(drivers).map(d => [d.code, d]));
  const acr = new Map(arr(raw.drivers).map(d => [d.driver_number, d.name_acronym]));
  const idOf = num => { const a = acr.get(num), k = a ? known.get(a) : null; return k ? k.id : a ? String(a).toLowerCase() : String(num); };
  // La gara del calendario: lo stesso giorno, con l'ora del circuito (le gare di sera finiscono il giorno dopo in UTC).
  const start = msOf(s.date_start), off = offsetSec(s.gmt_offset);
  const day = start != null ? new Date(start + off * 1000).toISOString().slice(0, 10) : null;
  const dayMs = v => Date.parse(v + "T00:00:00Z");
  const race = day ? arr(races).find(r => r.date === day) || arr(races).filter(r => r.date && Math.abs(dayMs(r.date) - dayMs(day)) <= 86400000)[0] || null : null;
  let fastest = null, best = Infinity;
  arr(raw.laps).forEach(l => { if (isNum(l.lap_duration) && l.lap_duration > 0 && l.lap_number > 1 && l.lap_duration < best) { best = l.lap_duration; fastest = l.driver_number; } });
  const winner = res.find(r => r.position === 1);
  const winLaps = winner && isNum(winner.number_of_laps) ? winner.number_of_laps : null;
  const classified = res.filter(r => isNum(r.position)).sort((a, b) => a.position - b.position);
  const others = res.filter(r => !isNum(r.position)).sort((a, b) => (b.number_of_laps || 0) - (a.number_of_laps || 0));
  const timeOf = r => {
    if (r.position === 1) return isNum(r.duration) ? fmtRaceTime(r.duration) : `${r.number_of_laps || winLaps || 0} giri`;
    const g = parseGap(r.gap_to_leader);
    if (g.down) return lapsWord(g.down);
    if (g.v != null) return "+" + g.v.toFixed(3) + "s";
    const down = winLaps != null && isNum(r.number_of_laps) ? winLaps - r.number_of_laps : 0;
    return down > 0 ? lapsWord(down) : "–";
  };
  const rows = [...classified, ...others].map(r => {
    const id = idOf(r.driver_number), pos = isNum(r.position) ? r.position : null;
    if (r.dsq) return { id, time: "Squalificato", pos: null, dnf: "penalita", why: null };
    if (r.dns) return { id, time: "Non partito", pos: null, dnf: "altro", why: null };
    if (r.dnf) return { id, time: "Ritirato", pos, dnf: "altro", why: null };
    return { id, time: timeOf(r), pos, dnf: null, why: null };
  });
  return { raceId: race ? race.id : null, name: race ? race.name : ("GP " + (s.location || s.country_name || "")).trim(), type: "RACE", real: true, src: "openf1",
    fastest: fastest != null ? idOf(fastest) : null, rows };
}

module.exports = { OF1_BASE, createOpenF1, sessionType, sessionShort, replayTarget, buildReplay, lastRaceFromResult, fmtRaceTime };
