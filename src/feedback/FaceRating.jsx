// 8/11 (Edoardo: "nella sezione feedback quella animazione della faccina, non le stelline semplici"): voto da 1 a 5 con
// una faccia grande che cambia espressione (da arrabbiata a felicissima) e cinque faccine per scegliere. Le cinque
// facce sono disegnate già pronte e si scambiano con dissolvenza e un rimbalzo; gli occhi sbattono ogni tanto; senza
// voto la faccia grigia guarda a destra e a sinistra. Solo transform e opacity; con "Rimuovi animazioni" tutto fermo.
// Il voto resta un numero da 1 a 5 (campo "stars" del feedback, come prima).
import React from "react";
import "./FaceRating.css";

export const FACES = [
  { n: 1, label: "Molto male", color: "#E5484D", mouth: "M21 46 Q32 35 43 46", brows: "M17 19.5 L27 23 M47 19.5 L37 23" },
  { n: 2, label: "Migliorabile", color: "#F2994A", mouth: "M22 45 Q32 39.5 42 45" },
  { n: 3, label: "Nella media", color: "#E7B34C", mouth: "M22 42.5 L42 42.5" },
  { n: 4, label: "Bene", color: "#7BC86C", mouth: "M21 39.5 Q32 48.5 43 39.5" },
  { n: 5, label: "Ottimo", color: "#30A46C", mouth: "M19 37.5 Q32 55 45 37.5 Z", open: true, happy: true },
];
const IDLE = { n: 0, label: "", color: "#3A3A42", mouth: "M24 43 L40 43" };
const INK = "#15120A";

function Face({ f, size, idle = false }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" style={{ display: "block" }}>
      <circle cx="32" cy="32" r="29" fill={f.color} />
      <circle cx="32" cy="32" r="29" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="1.2" />
      {f.brows && <path d={f.brows} stroke={INK} strokeWidth="2.8" strokeLinecap="round" fill="none" />}
      {f.happy ? (
        <g stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none"><path d="M19.5 28.5 Q24 22.5 28.5 28.5" /><path d="M35.5 28.5 Q40 22.5 44.5 28.5" /></g>
      ) : (
        <g className={idle ? "ff-look" : "ff-blink"}><circle cx="24" cy="27.5" r="3.7" fill={INK} /><circle cx="40" cy="27.5" r="3.7" fill={INK} /></g>
      )}
      <path d={f.mouth} stroke={INK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill={f.open ? INK : "none"} />
      {f.open && <path d="M25 44.5 Q32 49.5 39 44.5" stroke="none" fill="#E5484D" opacity=".85" />}
    </svg>
  );
}

// value: 0 (nessun voto) o 1-5; onChange(n).
export default function FaceRating({ value = 0, onChange, size = 104 }) {
  const cur = FACES.find(f => f.n === value) || null;
  return (
    <div data-face-rating={value} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ position: "relative", width: size, height: size }}>
        {[IDLE, ...FACES].map(f => {
          const on = (cur ? cur.n : 0) === f.n;
          return (
            <div key={f.n} className="ff-layer" data-face-big={on ? f.n : undefined} style={{ position: "absolute", inset: 0, opacity: on ? 1 : 0, transform: on ? "scale(1)" : "scale(.82)" }}>
              <div key={on ? "on" : "off"} className={on && f.n ? "ff-pop" : undefined}><Face f={f} size={size} idle={!f.n} /></div>
            </div>
          );
        })}
      </div>
      <div role="radiogroup" aria-label="Voto da 1 a 5" style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 14 }}>
        {FACES.map(f => {
          const on = value === f.n;
          return (
            <button key={f.n} type="button" className="press ff-pick" role="radio" aria-checked={on} data-feedback-star={f.n} data-feedback-face={f.n}
              aria-label={`${f.n} su 5: ${f.label}`} onClick={() => onChange && onChange(f.n)}
              style={{ width: 48, height: 48, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", padding: 0,
                opacity: value && !on ? 0.45 : 1, transform: on ? "scale(1.16)" : "scale(1)" }}>
              <span style={{ display: "block", borderRadius: "50%", boxShadow: on ? `0 0 0 2.5px ${f.color}` : "none", padding: on ? 2 : 0 }}><Face f={f} size={36} /></span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
