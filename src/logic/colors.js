// Colori dell'app (Tappa 3, G01-G02; prove in test/unit/colors.test.js). Dal colore scelto da chi usa l'app si ricavano
// due toni: quello dei tasti (scurito quanto basta perché il testo bianco sopra abbia contrasto almeno 3:1) e quello di
// testi, bordi e linee sullo sfondo nero (schiarito quanto basta per un contrasto almeno 4,5:1). Il contrasto è quello
// del WCAG 2: (L1 + 0,05) / (L2 + 0,05) con la luminanza relativa dei due colori.
(function (root) {
  const LED_RED = "#FF1801";   // rosso LED: il colore dei tasti di serie (G01)
  // I 12 colori pronti (G02): i colori delle scuderie e qualcuno in più.
  const PALETTE = [
    { name: "Rosso LED", color: LED_RED },
    { name: "Rosso corsa", color: "#E8002D" },
    { name: "Papaya", color: "#FF8000" },
    { name: "Giallo", color: "#FFD100" },
    { name: "Turchese", color: "#27F4D2" },
    { name: "Verde inglese", color: "#229971" },
    { name: "Blu", color: "#3671C6" },
    { name: "Azzurro", color: "#6692FF" },
    { name: "Rosa", color: "#FF87BC" },
    { name: "Bordeaux", color: "#A3162E" },
    { name: "Argento", color: "#C0C4C8" },
    { name: "Viola", color: "#A142F4" },
  ];
  const WHITE = [255, 255, 255], BLACK = [0, 0, 0];

  // "#abc" o "#aabbcc" (maiuscole o minuscole) → "#AABBCC"; qualsiasi altra cosa → null.
  function normHex(hex) {
    if (typeof hex !== "string") return null;
    const s = hex.trim();
    if (/^#[0-9a-f]{3}$/i.test(s)) return ("#" + s.slice(1).split("").map(c => c + c).join("")).toUpperCase();
    return /^#[0-9a-f]{6}$/i.test(s) ? s.toUpperCase() : null;
  }
  const rgbOf = hex => { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const hexOf = rgb => "#" + rgb.map(v => v.toString(16).padStart(2, "0")).join("").toUpperCase();
  const lin = v => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const luminance = hex => { const [r, g, b] = rgbOf(normHex(hex) || "#000000"); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };

  function contrast(a, b) {
    const la = luminance(a), lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }
  // Il colore mescolato verso target (nero o bianco) quanto basta perché ok(colore) sia vero: il primo, in 100 passi.
  function toward(hex, target, ok) {
    const from = rgbOf(hex);
    for (let i = 0; i <= 100; i++) {
      const h = hexOf(from.map((c, k) => Math.round(c + (target[k] - c) * i / 100)));
      if (ok(h)) return h;
    }
    return hexOf(target);
  }
  function accentTones(hex, bg = "#000000") {
    const base = normHex(hex) || LED_RED, back = normHex(bg) || "#000000";
    return {
      accent: toward(base, BLACK, h => contrast(h, "#FFFFFF") >= 3),
      ink: toward(base, WHITE, h => contrast(h, back) >= 4.5),
      on: "#FFFFFF",
    };
  }
  function rgba(hex, a) {
    const [r, g, b] = rgbOf(normHex(hex) || LED_RED);
    return `rgba(${r},${g},${b},${a})`;
  }
  // Lo stesso colore più scuro (f = 1 uguale, 0 nero): per le sfumature e le parti in ombra dei disegni.
  const shade = (hex, f) => hexOf(rgbOf(normHex(hex) || LED_RED).map(c => Math.round(c * Math.max(0, Math.min(1, f)))));

  const api = { LED_RED, PALETTE, normHex, contrast, accentTones, rgba, shade };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.BtColors = api;
})(typeof window !== "undefined" ? window : globalThis);
