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

// Pagina che segue il dito (schede della barra in basso, 25/10). Senza larghezza vale quella di un telefono (390 px).
const DRAG = { follow: 0.6, max: 0.6, edge: 0.15, edgeMax: 0.08 };
const widthOf = w => (w > 0 ? w : 390);
const r1 = v => Math.round(v * 10) / 10 || 0;   // decimi di px, mai -0
const clamp = (v, m) => Math.max(-m, Math.min(m, v));
// dx: spostamento del dito; canGo: c'è una scheda da quella parte. → px di cui si sposta la pagina.
function dragFollow(dx, width, canGo) {
  if (!isFinite(dx)) return 0;
  const W = widthOf(width);
  return r1(canGo ? clamp(dx * DRAG.follow, W * DRAG.max) : clamp(dx * DRAG.edge, W * DRAG.edgeMax));
}
// Da 0 (fermo) a 1 (lungo abbastanza per cambiare scheda: un quarto della pagina, come classifySwipe).
function dragProgress(dx, width) {
  if (!isFinite(dx)) return 0;
  return Math.min(1, Math.abs(dx) / (widthOf(width) * SWIPE.share));
}
// Dove finisce la scheda che esce (px): tutta fuori dallo schermo, da qualunque punto (from) la lasci il dito. Le due
// schede scorrono insieme come un nastro: niente buchi neri e niente pagine una sopra l'altra.
function leaveTo(from, dir, width) {
  return r1(dir === "right" ? widthOf(width) : -widthOf(width));
}

module.exports = { classifySwipe, SWIPE, DRAG, dragFollow, dragProgress, leaveTo };
