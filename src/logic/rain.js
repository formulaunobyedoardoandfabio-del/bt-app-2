// Gocce di pioggia sullo schermo (7/11 sera, Edoardo: "se piove al circuito al massimo 15 gocce, partono da zero, in
// un punto a caso, raramente una vicino all'altra; dopo pochi secondi scivolano giù abbastanza veloci").
// Qui le regole (senza schermo): dove nasce una goccia, quanto è grande, quanto resta ferma e quanto ci mette a scivolare.
const MAX_DROPS = 15;
const SIZES = [10, 13, 16, 19];        // px di larghezza (piccole); l'altezza è un po' di più
const MIN_GAP = 64;                    // px: di solito le gocce stanno almeno così lontane...
const CLOSE_CHANCE = 0.08;             // ...ma ogni tanto (8%) una nasce vicina a un'altra
const FALL_PX_S = 1100;                // velocità della scivolata (px al secondo)

// Un punto a caso nello schermo (con 14 px di bordo) lontano dalle altre gocce, salvo il caso raro "vicina".
function pickSpot(drops, { w, h, rnd = Math.random, edge = 14 } = {}) {
  const any = () => ({ x: edge + rnd() * Math.max(1, w - 2 * edge), y: edge + rnd() * Math.max(1, h * 0.82 - edge) });
  const close = drops.length > 0 && rnd() < CLOSE_CHANCE;
  if (close) {
    const o = drops[Math.floor(rnd() * drops.length)];
    const a = rnd() * Math.PI * 2, r = 18 + rnd() * 18;
    return { x: Math.min(w - edge, Math.max(edge, o.x + Math.cos(a) * r)), y: Math.min(h - edge, Math.max(edge, o.y + Math.sin(a) * r)), close: true };
  }
  let best = null, bestD = -1;
  for (let i = 0; i < 24; i++) {
    const p = any();
    const d = drops.reduce((m, o) => Math.min(m, Math.hypot(o.x - p.x, o.y - p.y)), Infinity);
    if (d >= MIN_GAP) return { ...p, close: false };
    if (d > bestD) { best = p; bestD = d; }
  }
  return { ...best, close: false };
}

// Una goccia nuova: dimensione, tempo fermo (ms) e scivolata fino a sotto lo schermo.
function makeDrop(drops, { w, h, rnd = Math.random, id } = {}) {
  if (drops.length >= MAX_DROPS) return null;
  const p = pickSpot(drops, { w, h, rnd });
  const size = SIZES[Math.floor(rnd() * SIZES.length)];
  const hold = Math.round(1800 + rnd() * 4200);
  const fall = Math.round(h - p.y + size * 2 + 24);
  const dur = Math.round(Math.min(1100, Math.max(380, (fall / FALL_PX_S) * 1000)));
  return { id, x: Math.round(p.x), y: Math.round(p.y), size, hold, fall, dur };
}

// Ogni quanto ne nasce una (ms): dalla prima, che arriva dopo un attimo, poi a caso.
const nextDelay = (rnd = Math.random) => Math.round(450 + rnd() * 1150);

// 8/11 (Edoardo): gocce solo con una qualifica o una gara in corso (anche Sprint e qualifica Sprint); mai nelle prove
// libere né fra una sessione e l'altra. Minuti dall'inizio in cui la sessione conta come "in corso" (largo per le rosse).
const RAIN_SESSIONS = { QUALI: 90, SQ: 75, SPRINT: 90, RACE: 180 };
const isRainSession = key => Object.prototype.hasOwnProperty.call(RAIN_SESSIONS, String(key || "").toUpperCase());
function rainSessionNow(weekend, now) {
  if (!Array.isArray(weekend) || !Number.isFinite(now)) return null;
  const s = weekend.find(x => x && isRainSession(x.key) && Number.isFinite(Date.parse(x.utc)) && now >= Date.parse(x.utc) && now <= Date.parse(x.utc) + RAIN_SESSIONS[String(x.key).toUpperCase()] * 60000);
  return s ? String(s.key).toUpperCase() : null;
}

module.exports = { MAX_DROPS, SIZES, MIN_GAP, CLOSE_CHANCE, pickSpot, makeDrop, nextDelay, RAIN_SESSIONS, isRainSession, rainSessionNow };
