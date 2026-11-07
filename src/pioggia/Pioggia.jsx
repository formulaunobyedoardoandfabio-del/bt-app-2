// 7/11 sera (Edoardo: "se piove al circuito gocce come il Liquid Glass, al massimo 15, piccole; partono da zero
// appena apri l'app, nascono in un punto a caso e dopo pochi secondi scivolano giù veloci").
// Ogni goccia è una lente: backdrop-filter con un filtro SVG (feDisplacementMap con una mappa radiale fatta una volta
// sola col canvas) piega quello che c'è sotto, più forte vicino al bordo, come il vetro liquido; sopra un riflesso
// bianco e un'ombra. Dove il telefono non sa fare il filtro resta un vetro sfocato. Solo transform e opacity;
// con "Rimuovi animazioni" niente gocce. Le regole (quante, dove, quanto) sono in src/logic/rain.js.
import React, { useEffect, useRef, useState, useMemo } from "react";
import "./Pioggia.css";
import { SIZES, makeDrop, nextDelay } from "../logic/rain";

let mapUrl = null;
// Mappa di spostamento (rosso = x, verde = y, 128 = fermo): dentro il cerchio la luce viene presa più verso il centro,
// poco al centro e tanto al bordo (la lente ingrandisce e piega i bordi).
function lensMap() {
  if (mapUrl) return mapUrl;
  try {
    const N = 64, c = document.createElement("canvas");
    c.width = c.height = N;
    const g = c.getContext("2d"), img = g.createImageData(N, N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const nx = ((x + 0.5) / N) * 2 - 1, ny = ((y + 0.5) / N) * 2 - 1, d = Math.hypot(nx, ny);
      const k = d >= 1 ? 0 : 0.18 + 0.82 * Math.pow(d, 2.4);
      const i = (y * N + x) * 4;
      img.data[i] = Math.round(128 - 127 * nx * k);
      img.data[i + 1] = Math.round(128 - 127 * ny * k);
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    mapUrl = c.toDataURL("image/png");
  } catch (e) { mapUrl = ""; }
  return mapUrl;
}

const reduced = () => { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };

function LensFilters() {
  const href = useMemo(lensMap, []);
  if (!href) return null;
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <defs>
        {SIZES.map(s => {
          const h = Math.round(s * 1.12);
          return (
            <filter key={s} id={`bt-lens-${s}`} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
              <feImage href={href} x="0" y="0" width={s} height={h} preserveAspectRatio="none" result="map" />
              <feDisplacementMap in="SourceGraphic" in2="map" scale={Math.round(s * 1.5)} xChannelSelector="R" yChannelSelector="G" />
            </filter>
          );
        })}
      </defs>
    </svg>
  );
}

export function RainGlass({ on }) {
  const [drops, setDrops] = useState([]);
  const box = useRef(null);
  useEffect(() => {
    if (!on || reduced()) { setDrops([]); return undefined; }
    let alive = true, n = 0;
    const timers = [];
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    const spawn = () => {
      if (!alive) return;
      const el = box.current;
      if (el && el.clientWidth) {
        const w = el.clientWidth, h = el.clientHeight;
        setDrops(ds => { const d = makeDrop(ds, { w, h, id: ++n }); return d ? [...ds, d] : ds; });
      }
      later(spawn, nextDelay());
    };
    later(spawn, nextDelay());   // si parte da zero: la prima dopo un attimo
    return () => { alive = false; timers.forEach(clearTimeout); setDrops([]); };
  }, [on]);
  const gone = id => setDrops(ds => ds.filter(d => d.id !== id));
  return (
    <div ref={box} className="rain-root" data-rain={on ? "on" : "off"} data-rain-count={drops.length} aria-hidden="true">
      {on && <LensFilters />}
      {drops.map(d => (
        <span key={d.id} data-rain-drop={d.id} className={`rain-drop rain-${d.size}`}
          onAnimationEnd={e => { if (e.animationName === "rain-fall") gone(d.id); }}
          style={{ left: d.x - d.size / 2, top: d.y - d.size * 0.56, width: d.size, height: Math.round(d.size * 1.12), "--fall": d.fall + "px", "--hold": d.hold + "ms", "--dur": d.dur + "ms" }} />
      ))}
    </div>
  );
}
