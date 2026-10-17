// Gesti dello schermo (Tappa 3; prove in test/unit/gesture.test.js). Uno swipe conta solo se è quasi orizzontale
// (|dy| < |dx| × 0,58, cioè meno di 30° circa) e lungo più di un quarto della larghezza, oppure veloce (più di 0,6 px al
// millisecondo, ma almeno 30 px: un tocco che trema non è uno swipe). Lo usano le notizie (G11) e le schede (G29).
const SWIPE = { ratio: 0.58, share: 0.25, speed: 0.6, minFast: 30 };

// dx, dy: spostamento del dito in px; dt: durata in ms; width: larghezza della pagina. → "left" | "right" | null.
function classifySwipe({ dx, dy, dt, width } = {}) {
  const ax = Math.abs(dx), ay = Math.abs(dy);
  if (!isFinite(ax) || !isFinite(ay) || ax === 0) return null;
  if (ay >= ax * SWIPE.ratio) return null;
  const long = width > 0 && ax > width * SWIPE.share;
  const fast = dt > 0 && ax >= SWIPE.minFast && ax / dt > SWIPE.speed;
  if (!long && !fast) return null;
  return dx > 0 ? "right" : "left";
}

module.exports = { classifySwipe, SWIPE };
