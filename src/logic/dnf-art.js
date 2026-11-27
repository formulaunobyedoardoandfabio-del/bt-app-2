// Immagini dei ritiri (DNF), disegnate da noi come pittogrammi: la F1 vista di fronte più un dettaglio per la causa.
// incidente (errore del pilota, contro le barriere), motore (fumo), incendio (fiamme e pilota che scappa),
// penalita (commissario con le penalità), altro (il pilota scende dalla macchina: causa non chiara).
// Ogni forma è [tag, attributi, figli]; i colori sono nomi ("ink", "cut", "smoke", "fire", "flame", "red")
// che l'app trasforma nei colori del tema. Lo stesso disegno serve all'app e all'anteprima (rtest/dnfsheet.js).
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.BtDnfArt = api;   // nome diverso dal componente DnfArt dell'app
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  const W = 240, H = 150;
  const cut = (sw = 3) => ({ stroke: "cut", "stroke-width": sw, "stroke-linejoin": "round" });
  const mirror = (shape) => ["g", { transform: "scale(-1,1)" }, [shape]];

  // La macchina vista di fronte: origine al centro, a terra (y = 0); larga circa 210, alta 120.
  function car() {
    const tyreRear = ["rect", { x: -86, y: -98, width: 34, height: 58, rx: 7, fill: "ink", ...cut() }];
    const tyreFront = ["rect", { x: -104, y: -66, width: 42, height: 66, rx: 9, fill: "ink", ...cut() }];
    const endRear = ["rect", { x: -64, y: -120, width: 8, height: 36, rx: 2, fill: "ink", ...cut(2.5) }];
    const endFront = ["rect", { x: -101, y: -30, width: 9, height: 26, rx: 2, fill: "ink", ...cut(2.5) }];
    const arms = ["path", { d: "M-24,-46 L-80,-50 M-24,-26 L-80,-22", fill: "none", stroke: "ink", "stroke-width": 4, "stroke-linecap": "round" }];
    const inlet = ["rect", { x: -60, y: -60, width: 24, height: 10, rx: 3, fill: "cut" }];
    const mirrorArm = ["path", { d: "M-44,-70 L-40,-64", stroke: "ink", "stroke-width": 3, "stroke-linecap": "round" }];
    const mirrorBox = ["rect", { x: -54, y: -78, width: 18, height: 8, rx: 3, fill: "ink", ...cut(2) }];
    return [
      // ala posteriore (la più lontana) e gomme posteriori
      endRear, mirror(endRear),
      ["rect", { x: -58, y: -114, width: 116, height: 12, rx: 2, fill: "ink", ...cut(2.5) }],
      ["rect", { x: -58, y: -100, width: 116, height: 6, rx: 2, fill: "ink", ...cut(2) }],
      tyreRear, mirror(tyreRear),
      // presa d'aria sopra il pilota
      ["path", { d: "M-17,-60 L-12,-94 Q0,-107 12,-94 L17,-60 Z", fill: "ink", ...cut() }],
      ["ellipse", { cx: 0, cy: -87, rx: 7, ry: 6, fill: "cut" }],
      // pance laterali con le prese d'aria
      ["path", { d: "M-72,-42 Q-72,-68 -46,-70 L46,-70 Q72,-68 72,-42 L72,-30 L-72,-30 Z", fill: "ink", ...cut() }],
      inlet, mirror(inlet),
      mirrorArm, mirror(mirrorArm), mirrorBox, mirror(mirrorBox),
      // casco nell'abitacolo, halo davanti
      ["circle", { cx: 0, cy: -66, r: 12, fill: "ink", ...cut(2.5) }],
      ["rect", { x: -10, y: -71, width: 20, height: 6, rx: 3, fill: "cut" }],
      ["path", { d: "M-31,-58 Q-29,-88 0,-90 Q29,-88 31,-58", fill: "none", stroke: "cut", "stroke-width": 11, "stroke-linecap": "round" }],
      ["path", { d: "M-31,-58 Q-29,-88 0,-90 Q29,-88 31,-58", fill: "none", stroke: "ink", "stroke-width": 6, "stroke-linecap": "round" }],
      ["path", { d: "M0,-89 L0,-62", stroke: "cut", "stroke-width": 9, "stroke-linecap": "round" }],
      ["path", { d: "M0,-89 L0,-62", stroke: "ink", "stroke-width": 5, "stroke-linecap": "round" }],
      // sospensioni, gomme anteriori, muso e ala anteriore
      arms, mirror(arms),
      tyreFront, mirror(tyreFront),
      ["path", { d: "M-14,-42 L14,-42 L9,-12 L-9,-12 Z", fill: "ink", ...cut() }],
      ["path", { d: "M-96,-17 L96,-17 L90,-6 L-90,-6 Z", fill: "ink", ...cut(2.5) }],
      endFront, mirror(endFront),
    ];
  }
  const carAt = (x, y, s = 1, rot = 0) => ["g", { transform: `translate(${x},${y}) rotate(${rot}) scale(${s})` }, car()];

  // Omino (pilota o commissario) fatto di tratti tondi, come nei pittogrammi.
  const limb = (d, w = 8) => ["path", { d, fill: "none", stroke: "ink", "stroke-width": w, "stroke-linecap": "round", "stroke-linejoin": "round" }];
  const limbCut = (d, w = 8) => ["path", { d, fill: "none", stroke: "cut", "stroke-width": w + 4, "stroke-linecap": "round", "stroke-linejoin": "round" }];

  const ART = {
    // Fumo dal motore: grande nuvola grigia che esce da dietro.
    motore: () => [
      ["g", {}, [[160, 40, 25], [190, 30, 20], [134, 30, 19], [212, 52, 16], [178, 62, 17], [150, 64, 13], [112, 50, 13]].map(([cx, cy, r]) => ["circle", { cx, cy, r, fill: "smoke", ...cut(3) }])],
      carAt(104, 146, 0.84),
      ["path", { d: "M204,18 q6,-6 12,0 M222,34 q5,-5 10,0", fill: "none", stroke: "smoke", "stroke-width": 3, "stroke-linecap": "round" }],
    ],
    // Incendio: fiamme dalla presa d'aria e il pilota che si allontana di corsa.
    incendio: () => [
      carAt(92, 146, 0.8),
      ["path", { d: "M92,70 C70,56 76,30 90,12 C92,30 104,30 100,8 C122,28 124,52 108,70 Z", fill: "fire", ...cut(3) }],
      ["path", { d: "M94,66 C84,56 88,42 94,32 C96,44 104,44 102,32 C112,44 112,58 104,66 Z", fill: "flame" }],
      ["path", { d: "M62,72 C52,62 56,48 64,38 C66,50 72,50 72,40 C80,52 78,64 72,72 Z", fill: "fire", ...cut(2.5) }],
      ["path", { d: "M124,72 C118,62 122,50 128,42 C130,52 134,52 136,44 C142,56 138,66 132,72 Z", fill: "fire", ...cut(2.5) }],
      ["g", { transform: "translate(198,0)" }, [
        limbCut("M-4,70 L-12,98"), limbCut("M-12,98 L0,114 L10,128 M-12,98 L-24,114 L-34,118"), limbCut("M-6,76 L8,86 M-6,78 L-20,70"),
        limb("M-4,70 L-12,98", 12), limb("M-12,98 L0,114 L10,128 M-12,98 L-24,114 L-34,118", 8), limb("M-6,76 L8,86 M-6,78 L-20,70", 7),
        ["circle", { cx: 0, cy: 58, r: 10, fill: "ink", ...cut(3) }],
        ["rect", { x: -3, y: 54, width: 12, height: 5, rx: 2.5, fill: "cut" }],
        ["path", { d: "M-44,64 h14 M-48,82 h16 M-44,100 h12", stroke: "ink", "stroke-width": 3, "stroke-linecap": "round", opacity: 0.55 }],
      ]],
    ],
    // Incidente per errore del pilota: la macchina girata contro le barriere di gomme, pezzi che volano.
    incidente: () => {
      // barriera di gomme: pile di anelli, a destra
      const rings = [];
      [[200, 60], [224, 60], [200, 86], [224, 86], [200, 112], [224, 112]].forEach(([cx, cy]) => {
        rings.push(["circle", { cx, cy, r: 13, fill: "ink", ...cut(3) }], ["circle", { cx, cy, r: 5, fill: "cut" }]);
      });
      return [
        ["g", {}, rings],
        ["path", { d: "M188,138 h48", stroke: "ink", "stroke-width": 3, "stroke-linecap": "round", opacity: 0.5 }],
        // segni delle gomme sull'asfalto, poi la macchina girata che finisce contro le gomme
        ["path", { d: "M8,142 Q40,134 70,138 M14,132 Q44,124 74,128", fill: "none", stroke: "ink", "stroke-width": 3, "stroke-linecap": "round", opacity: 0.35 }],
        carAt(104, 138, 0.74, -15),
        // urto: stella rossa tra il muso e le gomme
        ["path", { d: "M178,74 l6,-14 l3,12 l12,-8 l-5,13 l14,1 l-12,7 l10,9 l-14,-2 l-1,13 l-7,-11 l-8,9 l1,-13 l-12,-4 l12,-5 z", fill: "red", ...cut(2.5) }],
        // pezzi che volano: ala e schegge
        ["rect", { x: 140, y: 16, width: 28, height: 7, rx: 2, fill: "ink", transform: "rotate(24 154 19)", ...cut(2) }],
        ["path", { d: "M124,34 l9,-5 l3,8 z M172,28 l7,2 l-3,7 z M112,18 l6,1 l-1,6 z", fill: "ink" }],
      ];
    },
    // Troppe penalità: il commissario col foglio delle penalità e la squalifica.
    penalita: () => [
      carAt(92, 146, 0.8),
      ["g", { transform: "translate(200,0)" }, [
        ["path", { d: "M-14,66 L14,66 L10,106 L-10,106 Z", fill: "ink", ...cut(3) }],
        ["rect", { x: -9, y: 104, width: 8, height: 32, rx: 3, fill: "ink", ...cut(2.5) }],
        ["rect", { x: 1, y: 104, width: 8, height: 32, rx: 3, fill: "ink", ...cut(2.5) }],
        ["circle", { cx: 0, cy: 54, r: 10, fill: "ink", ...cut(3) }],
        ["path", { d: "M-6,64 L0,76 L6,64", fill: "none", stroke: "cut", "stroke-width": 2.5 }],
        ["rect", { x: -30, y: 74, width: 22, height: 28, rx: 2, fill: "ink", ...cut(3) }],
        ["path", { d: "M-26,82 h14 M-26,88 h14 M-26,94 h9", stroke: "cut", "stroke-width": 2.2, "stroke-linecap": "round" }],
        limbCut("M12,70 L20,88 L10,96", 6), limb("M12,70 L20,88 L10,96", 6),
      ]],
      ["g", {}, [["+5s", 150, 22, "ink"], ["+10s", 184, 22, "ink"], ["DQ", 218, 22, "red"]].map(([t, x, y, c]) => ["g", {}, [
        ["rect", { x: x - 16, y: y - 10, width: 32, height: 20, rx: 5, fill: c }],
        ["text", { x, y: y + 5, "text-anchor": "middle", "font-size": 13, "font-weight": 800, "font-family": "'Titillium Web', sans-serif", fill: "cut" }, t],
      ]])],
    ],
    // Causa non chiara: il pilota in piedi nell'abitacolo che scende dalla macchina.
    altro: () => {
      const body = car().filter(s => !(s[0] === "circle" && s[1].cy === -66) && !(s[0] === "rect" && s[1].y === -71) && !(s[0] === "ellipse") && !(s[0] === "path" && /^M-17,-60/.test(s[1].d || "")));
      const halo = body.filter(s => s[0] === "path" && /^M-31,-58|^M0,-89/.test(s[1].d || ""));
      const rest = body.filter(s => !halo.includes(s));
      return [
        ["g", { transform: "translate(120,146) scale(0.86)" }, [
          ...rest.slice(0, 6),
          // il pilota: busto sopra l'abitacolo, braccia sulle pance, casco in alto
          limbCut("M-8,-70 L-10,-118 M8,-70 L10,-118", 12), limb("M-8,-70 L-10,-118 M8,-70 L10,-118", 12),
          ["path", { d: "M-20,-120 Q0,-132 20,-120 L16,-78 L-16,-78 Z", fill: "ink", ...cut(3) }],
          limbCut("M-18,-114 L-40,-96 L-50,-74 M18,-114 L40,-96 L50,-74", 7), limb("M-18,-114 L-40,-96 L-50,-74 M18,-114 L40,-96 L50,-74", 7),
          ["circle", { cx: 0, cy: -138, r: 13, fill: "ink", ...cut(3) }],
          ["rect", { x: -11, y: -143, width: 22, height: 6, rx: 3, fill: "cut" }],
          ...rest.slice(6), ...halo,
        ]],
        ["path", { d: "M178,40 q8,-10 16,0 M184,24 v-8", fill: "none", stroke: "ink", "stroke-width": 3, "stroke-linecap": "round", opacity: 0 }],
      ];
    },
  };
  const CAUSES = ["incidente", "motore", "incendio", "penalita", "altro"];
  const LABEL = { incidente: "Incidente", motore: "Problema al motore", incendio: "Incendio", penalita: "Troppe penalità", altro: "Ritirato" };
  const shapes = cause => (ART[cause] || ART.altro)();

  // Per l'anteprima fuori dall'app: il disegno come testo SVG.
  function toSvg(cause, colors, size = 240) {
    const col = v => (colors && colors[v]) || v;
    const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const node = ([tag, attrs, kids]) => {
      const a = Object.entries(attrs || {}).map(([k, v]) => `${k}="${esc(["fill", "stroke"].includes(k) ? col(v) : v)}"`).join(" ");
      const inner = typeof kids === "string" ? esc(kids) : (kids || []).map(node).join("");
      return `<${tag} ${a}>${inner}</${tag}>`;
    };
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${size}" height="${Math.round(size * H / W)}">${shapes(cause).map(node).join("")}</svg>`;
  }
  return { W, H, CAUSES, LABEL, shapes, toSvg };
});
