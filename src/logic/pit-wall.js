// Muretto dei tifosi (8/11, design "B&T Trophies e pause di gara" approvato da Edoardo): giochi durante le pause.
// - Safety Car / Virtual Safety Car: "Box o fuori?" per i primi 8; a pausa finita si vede chi aveva ragione
//   (box = la squadra l'ha fermato sotto la neutralizzazione, dai pit veri di OpenF1).
// - Bandiera rossa: cosa è successo (messaggi della direzione gara), "Quanto dura la rossa?", gomma della ripartenza
//   (dagli stint veri al primo giro dopo la ripresa).
// Le finestre seguono le stesse regole della bandiera nell'app (src/services/openf1.js): SC e VSC finiscono col verde,
// col TRACK CLEAR o con la fine della VSC; la rossa finisce col verde, la bandiera a scacchi o la ripresa.
// Tempi in secondi dall'inizio della sessione (come la diretta dell'app). Solo dati veri; dati rotti = niente gioco.
const arr = v => (Array.isArray(v) ? v : []);
const isNum = v => typeof v === "number" && Number.isFinite(v);
const msOf = iso => { const v = Date.parse(iso); return Number.isFinite(v) ? v : null; };
const GRACE = 20;   // s dopo la fine della Safety Car: una sosta in quel momento conta ancora come "sotto Safety Car"

function prep(raw) {
  const session = raw && raw.session && typeof raw.session === "object" ? raw.session : {};
  const lapsAll = arr(raw && raw.laps).filter(l => l && isNum(l.driver_number) && isNum(l.lap_number));
  const firstLap = lapsAll.map(l => msOf(l.date_start)).filter(isNum).sort((a, b) => a - b)[0];
  const startMs = msOf(session.date_start) != null ? msOf(session.date_start) : firstLap != null ? firstLap : null;
  if (startMs == null) return null;
  const tOf = iso => { const v = msOf(iso); return v == null ? null : (v - startMs) / 1000; };
  const DRV = new Map();
  arr(raw.drivers).forEach(d => { if (d && isNum(d.driver_number)) DRV.set(d.driver_number, { code: d.name_acronym || String(d.driver_number), color: d.team_colour ? "#" + String(d.team_colour).replace(/^#/, "") : null }); });
  const info = n => DRV.get(n) || { code: String(n), color: null };
  const lapsBy = new Map();
  lapsAll.forEach(l => { const s = tOf(l.date_start); if (s == null) return; if (!lapsBy.has(l.driver_number)) lapsBy.set(l.driver_number, []); lapsBy.get(l.driver_number).push({ n: l.lap_number, s }); });
  lapsBy.forEach(L => L.sort((a, b) => a.n - b.n));
  const lapAt = (d, s) => { let n = null; for (const g of lapsBy.get(d) || []) { if (g.s <= s) n = g.n; else break; } return n; };
  const firstLapFrom = (d, s) => { const g = (lapsBy.get(d) || []).find(x => x.s >= s); return g ? g.n : null; };
  const stintsBy = new Map();
  arr(raw.stints).forEach(x => { if (!x || !isNum(x.driver_number) || !isNum(x.lap_start)) return; if (!stintsBy.has(x.driver_number)) stintsBy.set(x.driver_number, []); stintsBy.get(x.driver_number).push(x); });
  stintsBy.forEach(L => L.sort((a, b) => a.lap_start - b.lap_start));
  const stintAt = (d, lap) => { if (!isNum(lap)) return null; let best = null; for (const x of stintsBy.get(d) || []) if (x.lap_start <= lap) best = x; return best; };
  const stintAfterPit = (d, pitLap) => (stintsBy.get(d) || []).find(x => isNum(pitLap) && x.lap_start > pitLap) || null;
  const pits = arr(raw.pit).filter(p => p && isNum(p.driver_number)).map(p => ({ d: p.driver_number, s: tOf(p.date), lap: isNum(p.lap_number) ? p.lap_number : null })).filter(p => p.s != null).sort((a, b) => a.s - b.s);
  const posBy = new Map();
  arr(raw.position).forEach(p => { if (!p || !isNum(p.driver_number) || !isNum(p.position)) return; const s = tOf(p.date); if (s == null) return; if (!posBy.has(p.driver_number)) posBy.set(p.driver_number, []); posBy.get(p.driver_number).push({ s, p: p.position }); });
  posBy.forEach(L => L.sort((a, b) => a.s - b.s));
  const posAt = (d, s) => { let v = null; for (const x of posBy.get(d) || []) { if (x.s <= s) v = x.p; else break; } return v; };
  const rc = arr(raw.race_control).filter(m => m && tOf(m.date) != null).map(m => ({ ...m, s: tOf(m.date), msg: String(m.message || "").toUpperCase(), f: String(m.flag || "").toUpperCase(), cat: String(m.category || "").toUpperCase(), scope: String(m.scope || "").toUpperCase() })).sort((a, b) => a.s - b.s);
  return { info, lapsBy, lapAt, firstLapFrom, stintAt, stintAfterPit, pits, posBy, posAt, rc };
}

// Finestre di neutralizzazione: tratti continui con la stessa bandiera (sc, vsc, red), b = null se ancora aperta.
function windowsOf(rc) {
  const out = [];
  let sc = false, vsc = false, red = false, cur = null;
  const flagNow = () => (red ? "red" : sc ? "sc" : vsc ? "vsc" : null);
  rc.forEach(m => {
    if (/VIRTUAL SAFETY CAR DEPLOYED/.test(m.msg)) { vsc = true; sc = false; }
    else if (/VIRTUAL SAFETY CAR ENDING/.test(m.msg)) vsc = false;
    else if (/SAFETY CAR DEPLOYED/.test(m.msg)) { sc = true; vsc = false; }
    if (m.f === "RED" || (m.cat === "SESSIONSTATUS" && /SESSION (ABORTED|SUSPENDED)/.test(m.msg))) red = true;
    if (m.f === "GREEN" || m.f === "CHEQUERED" || (m.cat === "SESSIONSTATUS" && /SESSION (RESUMED|STARTED)/.test(m.msg))) { red = false; sc = false; vsc = false; }
    if (m.f === "CLEAR" && m.scope !== "SECTOR") { sc = false; vsc = false; }
    const k = flagNow();
    if (cur && cur.kind !== k) { cur.b = m.s; out.push(cur); cur = null; }
    if (k && !cur) cur = { kind: k, a: m.s, b: null };
  });
  if (cur) out.push(cur);
  return out;
}

// "Cosa è successo" dai messaggi della direzione gara poco prima della rossa (in italiano quando il testo è noto).
function whatHappened(rc, a) {
  const near = rc.filter(m => m.s >= a - 180 && m.s <= a + 30);
  const pick = [...near].reverse().find(m => /INCIDENT|STOPPED|CRASH|BARRIER|DEBRIS|RECOVERY|MEDICAL|FIRE|WEATHER|RAIN|STRANDED|SPUN/.test(m.msg))
    || [...near].reverse().find(m => /DOUBLE YELLOW IN TRACK SECTOR/.test(m.msg));
  if (!pick) return null;
  const raw = String(pick.message || "").trim();
  let x;
  if ((x = /INCIDENT INVOLVING CARS? (.+?) (NOTED|UNDER INVESTIGATION|REVIEWED)/.exec(pick.msg))) return "Incidente fra " + x[1].replace(/ AND /g, " e ").replace(/, /g, ", ");
  if ((x = /DOUBLE YELLOW IN TRACK SECTOR (\d+)/.exec(pick.msg))) return "Doppia bandiera gialla nel settore " + x[1];
  if ((x = /CAR (\d+) \(([A-Z]{3})\).*STOPPED/.exec(pick.msg))) return `Macchina ferma: ${x[2]} (n. ${x[1]})`;
  return "Direzione gara: " + raw;
}

function createPitWall(raw) {
  const P = raw && typeof raw === "object" ? (() => { try { return prep(raw); } catch (e) { return null; } })() : null;
  const windows = P ? windowsOf(P.rc) : [];
  const empty = { windows, at: () => null, lastEnded: () => null, boxBoard: () => null, boxResult: () => null, redBoard: () => null, redResult: () => null };
  if (!P) return empty;
  const at = t => { let w = null; windows.forEach(x => { if (x.a <= t && (x.b == null || t < x.b)) w = x; }); return w; };
  const lastEnded = (t, kinds = ["sc", "vsc", "red"]) => { let w = null; windows.forEach(x => { if (kinds.includes(x.kind) && x.b != null && x.b <= t) w = x; }); return w; };
  const pitIn = (w, until) => P.pits.filter(p => p.s >= w.a && p.s <= until);

  function boxBoard(w, t) {
    if (!w) return null;
    const drivers = [...P.posBy.keys()].map(d => ({ d, pos: P.posAt(d, w.a) })).filter(x => isNum(x.pos)).sort((x, y) => x.pos - y.pos).slice(0, 8);
    const until = Math.min(t, w.b == null ? t : w.b + GRACE);
    const pitted = pitIn(w, until);
    const did = new Set(pitted.map(p => p.d));
    const rows = drivers.map(({ d, pos }) => {
      const lap = P.lapAt(d, w.a), st = P.stintAt(d, lap);
      return { number: d, code: P.info(d).code, color: P.info(d).color, pos, compound: st ? String(st.compound || "").toUpperCase() || null : null, age: st && isNum(lap) ? (isNum(st.tyre_age_at_start) ? st.tyre_age_at_start : 0) + (lap - st.lap_start) : null, pitted: did.has(d) };
    });
    const seen = new Set();
    const gifted = pitted.filter(p => (seen.has(p.d) ? false : (seen.add(p.d), true))).map(p => { const st = P.stintAfterPit(p.d, p.lap); return { number: p.d, code: P.info(p.d).code, compound: st ? String(st.compound || "").toUpperCase() || null : null }; });
    const laps = drivers.map(x => P.lapAt(x.d, w.a)).filter(isNum);
    return { lap: laps.length ? Math.max(...laps) : null, rows, gifted };
  }

  function boxResult(w, picks, t) {
    if (!w || w.b == null || t < w.b + GRACE) return null;
    const did = new Set(pitIn(w, w.b + GRACE).map(p => p.d));
    const rows = (boxBoard(w, w.b + GRACE) || { rows: [] }).rows.filter(r => picks && (picks[r.number] === "box" || picks[r.number] === "out"))
      .map(r => { const team = did.has(r.number) ? "box" : "out", you = picks[r.number]; return { number: r.number, code: r.code, you, team, good: you === team }; });
    return { rows, right: rows.filter(r => r.good).length, total: rows.length };
  }

  function redBoard(w, t) {
    if (!w) return null;
    return { since: Math.max(0, t - w.a), what: whatHappened(P.rc, w.a), replayFrom: Math.max(0, w.a - 60) };
  }

  function redResult(w, guess, t) {
    if (!w || w.b == null || t < w.b) return null;
    const mins = Math.round((w.b - w.a) / 60);
    const g = guess || {};
    const d = isNum(g.driver) ? g.driver : null;
    const lap = d != null ? P.firstLapFrom(d, w.b - 1) : null;
    const st = d != null && lap != null && P.lapsBy.get(d).find(x => x.n === lap).s <= t ? P.stintAt(d, lap) : null;
    const actual = st ? String(st.compound || "").toUpperCase() || null : null;
    return { mins, guess: isNum(g.mins) ? g.mins : null, diff: isNum(g.mins) ? Math.abs(mins - g.mins) : null, tyre: { number: d, code: d != null ? P.info(d).code : null, guess: g.tyre || null, actual, ok: actual && g.tyre ? actual === g.tyre : null } };
  }

  return { windows, at, lastEnded, boxBoard, boxResult, redBoard, redResult };
}

module.exports = { createPitWall, GRACE };
