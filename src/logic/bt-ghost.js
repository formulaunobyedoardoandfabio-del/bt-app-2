// Ghost Lap: confronto di due giri veri (velocità, gas, freno, marcia e posizione lungo la distanza del giro).
// Funzioni pure: le usa l'app (grafici, analisi curva per curva, replay 2D) e le provano i test in Node
// (rtest/ghost.test.js). Un giro è { d: [m], t: [s], v: [km/h], thr: [%], brk: [0/1], g: [marcia], x: [], y: [] }.
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.BtGhost = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  // Ultimo indice con arr[i] <= x (arr in ordine crescente).
  function idx(arr, x) {
    let lo = 0, hi = arr.length - 1;
    if (x <= arr[0]) return 0;
    if (x >= arr[hi]) return hi;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (arr[m] <= x) lo = m; else hi = m; }
    return lo;
  }
  // Valore di un canale alla distanza d (o al tempo, con by = "t"): interpolazione lineare, ai bordi il primo/ultimo valore.
  function at(lap, key, x, by = "d") {
    const X = lap[by], Y = lap[key], n = X.length;
    if (x <= X[0]) return Y[0];
    if (x >= X[n - 1]) return Y[n - 1];
    const i = idx(X, x), x0 = X[i], x1 = X[i + 1];
    return x1 === x0 ? Y[i] : Y[i] + (Y[i + 1] - Y[i]) * (x - x0) / (x1 - x0);
  }
  const end = L => L.d[L.d.length - 1];
  // Distacco metro per metro: dt > 0 vuol dire che B è dietro ad A in quel punto.
  function delta(A, B, step = 10) {
    const out = [], last = Math.min(end(A), end(B));
    for (let d = 0; d < last; d += step) out.push({ d, dt: Math.round((at(B, "t", d) - at(A, "t", d)) * 1000) / 1000 });
    out.push({ d: last, dt: Math.round((at(B, "t", last) - at(A, "t", last)) * 1000) / 1000 });
    return out;
  }
  // Punto di frenata: dove inizia la frenata che è in corso tra from e to (null se la curva si fa in pieno).
  function brakePoint(L, from, to) {
    for (let i = 0; i < L.d.length; i++) {
      if (L.d[i] < from || L.d[i] > to || !L.brk[i]) continue;
      let j = i; while (j > 0 && L.brk[j - 1]) j--;
      return L.d[j];
    }
    return null;
  }
  const who = (a, b, bigger) => a == null || b == null ? null : a === b ? "pari" : (a > b) === bigger ? "A" : "B";
  // Curva per curva (corner.d = distanza della curva dal via, dai dati del circuito): chi frena più tardi, velocità
  // alla frenata, velocità minima a centro curva, chi torna prima al 100% di gas e chi guadagna tempo nella curva.
  function cornerDuel(A, B, corner) {
    const c = corner.d, bA = brakePoint(A, c - 450, c + 40), bB = brakePoint(B, c - 450, c + 40);
    const minIn = L => { let v = Infinity, d = c; for (let i = 0; i < L.d.length; i++) if (L.d[i] >= c - 150 && L.d[i] <= c + 150 && L.v[i] < v) { v = L.v[i]; d = L.d[i]; } return v === Infinity ? { v: Math.round(at(L, "v", c)), d: c } : { v, d }; };
    const mA = minIn(A), mB = minIn(B);
    const fullAfter = (L, d0) => { for (let i = 0; i < L.d.length; i++) if (L.d[i] >= d0 && L.d[i] <= c + 600 && L.thr[i] >= 99) return L.d[i]; return null; };
    const fA = fullAfter(A, mA.d), fB = fullAfter(B, mB.d);
    const dIn = (bA != null && bB != null ? Math.min(bA, bB) : c - 200) - 30;
    const dOut = Math.max(fA != null ? fA : c + 150, fB != null ? fB : c + 150) + 30;
    const g = (at(B, "t", dOut) - at(A, "t", dOut)) - (at(B, "t", dIn) - at(A, "t", dIn));   // > 0: A guadagna
    return {
      n: corner.n, d: c, window: [dIn, dOut],
      brake: { a: bA, b: bB, later: who(bA, bB, true), diff: bA != null && bB != null ? Math.abs(bA - bB) : null },
      vBrake: { a: bA != null ? Math.round(at(A, "v", bA)) : null, b: bB != null ? Math.round(at(B, "v", bB)) : null },
      vMin: { a: mA.v, b: mB.v, da: mA.d, db: mB.d, faster: who(mA.v, mB.v, true) },
      full: { a: fA, b: fB, first: who(fA, fB, false) },
      gained: { who: Math.abs(g) < 0.0005 ? "pari" : g > 0 ? "A" : "B", s: Math.round(Math.abs(g) * 1000) / 1000 },
    };
  }
  // Posizione al tempo t del giro (per il replay 2D: ogni vettura si muove con il suo tempo vero).
  const posAtTime = (L, t) => ({ x: at(L, "x", t, "t"), y: at(L, "y", t, "t"), v: at(L, "v", t, "t"), d: at(L, "d", t, "t") });
  return { at, delta, brakePoint, cornerDuel, posAtTime, end };
});
