// 7/11 (Edoardo, design "Accesso e Registrazione" e "Icone F1 in orbita" di Claude Design):
// - WelcomeFlow: sei schede di benvenuto (barre come le storie, Salta e Avanti, swipe a destra e a sinistra) e
//   l'Entrata ("Il paddock è aperto": entra come ospite, crea il tuo account, ho già un account);
// - GuestTour: il giro guidato in 5 passi sopra l'app vera, per chi entra come ospite dall'Entrata;
// - OrbitLoader: le icone F1 in orbita, il caricamento quando la rete è lenta; SlowSwap lo mette al posto del
//   caricamento normale solo dopo un po'.
// I disegni delle schede sono in ./disegni.jsx (generato da tools/disegni2jsx.py). Animazioni solo transform e opacity,
// ferme con "Rimuovi animazioni" (Benvenuto.css). I dati nelle schede sono di esempio e lo dicono.
import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import "./disegni.css";
import "./Benvenuto.css";
import { SLIDE_TEXT as DESIGN_TEXT, SLIDE_ART, DoorArt, OrbitArt } from "./disegni";

// 7/11 sera: in Home non c'è più il filtro a gomma (Edoardo l'ha tolto): la prima scheda non lo promette più.
const SLIDE_TEXT = DESIGN_TEXT.map((s, i) => (i === 0 ? { ...s, text: "Cerca, salva con uno swipe e leggi senza rumore." } : s));

export const WT = { bg: "#0B0B0C", ink: "#F4F4F5", muted: "#A1A1AA", line: "#2A2A2E", card: "#151517", edge: "#232327", out: "#3A3A40", red: "#FF1801", font: "'Manrope', 'Work Sans', system-ui, sans-serif" };
export const ENTRY_KEY = "bt-entry";        // "door": schede già viste; "form": su questo telefono si è già entrati con un account
export const TOUR_KEY = "bt-guest-tour";    // giro guidato dell'ospite già fatto
const LAST = SLIDE_ART.length;              // 6: l'Entrata
const ART_W = 342;

// Il disegno largo 342 si rimpicciolisce sui telefoni stretti (mai più grande).
function FitArt({ h, children }) {
  const ref = useRef(null);
  const [k, setK] = useState(1);
  useLayoutEffect(() => {
    const m = () => { const el = ref.current; if (el) setK(Math.min(1, (el.clientWidth || ART_W) / ART_W)); };
    m();
    window.addEventListener("resize", m);
    return () => window.removeEventListener("resize", m);
  }, []);
  return (
    <div ref={ref} style={{ position: "relative", flex: "0 1 auto", minHeight: 0, height: h * k, overflow: "hidden" }}>
      <div style={{ width: ART_W, transform: k < 1 ? `scale(${k})` : undefined, transformOrigin: "top left" }}>{children}</div>
      <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 40, background: `linear-gradient(to bottom, rgba(11,11,12,0), ${WT.bg})`, pointerEvents: "none" }} />
    </div>
  );
}

const bigBtn = { display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: 56, boxSizing: "border-box", borderRadius: 16, fontFamily: WT.font, fontSize: 17, fontWeight: 800, cursor: "pointer" };
export const btnWhite = { ...bigBtn, border: "none", background: WT.ink, color: WT.bg };
export const btnOutline = { ...bigBtn, border: `1px solid ${WT.out}`, background: "transparent", color: WT.ink };

export function WelcomeFlow({ logo, startAt = 0, onSeen, onGuest, onRegister, onLogin, useBack, onStep }) {
  const [step, setStep] = useState(Math.max(0, Math.min(LAST, startAt)));
  const [dir, setDir] = useState(1);
  const go = n => { const t = Math.max(0, Math.min(LAST, n)); if (t === step) return; setDir(t > step ? 1 : -1); setStep(t); if (onStep) onStep(t); };
  useEffect(() => { if (step === LAST && onSeen) onSeen(); }, [step === LAST]);
  // Indietro del telefono: scheda prima (dall'Entrata aperta da sola non c'è niente prima).
  if (useBack) useBack(step > 0 && !(startAt >= LAST && step === LAST), () => go(step - 1));
  const down = useRef(null);
  const onDown = e => { down.current = { x: e.clientX, y: e.clientY }; };
  const onUp = e => {
    const d = down.current; down.current = null;
    if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    if (dx < 0 && step < LAST) go(step + 1);
    else if (dx > 0 && step > 0 && !(startAt >= LAST)) go(step - 1);
  };
  const door = step === LAST;
  const txt = door ? { title: "Il paddock è aperto", text: "Guarda l'app com'è, senza account. Ti iscrivi quando vuoi." } : SLIDE_TEXT[step];
  const Art = door ? null : SLIDE_ART[step];
  return (
    <div className="wt-root" data-welcome={door ? "door" : "slide"} data-welcome-step={step}
      onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={() => { down.current = null; }}
      style={{ height: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", overflow: "hidden", background: WT.bg, color: WT.ink, fontFamily: WT.font, padding: "14px 24px 24px", touchAction: "pan-y" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, height: 44, flexShrink: 0 }}>
        <div role="img" aria-label={`Passo ${step + 1} di ${LAST + 1}`} style={{ flex: 1, display: "flex", gap: 6 }}>
          {Array.from({ length: LAST + 1 }, (_, i) => <div key={i} data-welcome-bar={i <= step ? "on" : "off"} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= step ? WT.ink : WT.line, transition: "background-color .2s ease" }} />)}
        </div>
        {!door && <button type="button" data-welcome-skip="" onClick={() => go(LAST)} style={{ display: "flex", alignItems: "center", minHeight: 44, padding: "0 4px", border: "none", background: "none", fontFamily: WT.font, fontSize: 15, fontWeight: 700, color: WT.muted, cursor: "pointer" }}>Salta</button>}
      </div>
      <div key={step} className={dir > 0 ? "wt-in" : "wt-in wt-back"} style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <FitArt h={door ? 320 : 420}>{door ? <DoorArt logo={logo} /> : <Art />}</FitArt>
        <h1 style={{ margin: "20px 0 0", fontSize: 32, lineHeight: 1.1, fontWeight: 800, letterSpacing: -0.5, color: WT.ink, overflowWrap: "break-word", flexShrink: 0 }}>{txt.title}</h1>
        <p style={{ margin: "10px 0 0", fontSize: 16, lineHeight: "24px", fontWeight: 500, color: WT.muted, flexShrink: 0 }}>{txt.text}</p>
      </div>
      {door ? (
        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12, flexShrink: 0 }}>
          <button type="button" className="wt-btn" data-door-guest="" onClick={onGuest} style={btnWhite}>Entra come ospite</button>
          <button type="button" className="wt-btn" data-door-register="" onClick={onRegister} style={btnOutline}>Crea il tuo account</button>
          <button type="button" data-door-login="" onClick={onLogin} style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 44, border: "none", background: "none", fontFamily: WT.font, fontSize: 15, fontWeight: 700, color: WT.muted, cursor: "pointer" }}>Ho già un account</button>
        </div>
      ) : (
        <button type="button" className="wt-btn" data-welcome-next="" onClick={() => go(step + 1)} style={{ ...btnWhite, marginTop: 20, flexShrink: 0 }}>Avanti</button>
      )}
    </div>
  );
}

// Il giro guidato: i riquadri si accendono sulle parti vere dell'app (si misurano), il cartello si sposta sopra o sotto.
const TOUR = [
  { sel: "[data-home]", inset: 8, maxH: 380, r: 22, title: "Qui trovi le notizie", text: "Scorri, cerca e salva quelle che ti interessano." },
  { sel: '[data-nav-tab="race"]', pad: 4, r: 18, title: "La gara in diretta", text: "Tempi, gomme, pit stop e Team Radio, con la chat dei tifosi mentre si corre." },
  { sel: '[data-nav-tab="fanta"]', pad: 4, r: 18, title: "Il tuo FantaF1", text: "Scegli i piloti entro il budget e sfida gli amici in classifica." },
  { sel: '[data-nav-tab="garage"]', pad: 4, r: 18, title: "Il Garage", text: "Giochi e strumenti da box, per sfidarti anche tra una gara e l'altra." },
  { sel: '[aria-label="Profilo"]', pad: 6, r: 999, title: "Crea il tuo account", text: "Salvi squadra, chat e casco, e ritrovi tutto su ogni telefono." },
];
export const TOUR_STEPS = TOUR.length;

export function GuestTour({ onDone, onRegister, useBack }) {
  const [i, setI] = useState(0);
  const [boxes, setBoxes] = useState([]);
  const [size, setSize] = useState({ w: 390, h: 760 });
  const [tipH, setTipH] = useState(190);
  const rootRef = useRef(null), tipRef = useRef(null);
  if (useBack) useBack(true, onDone);
  useLayoutEffect(() => {
    const m = () => {
      const root = rootRef.current;
      if (!root) return;
      const o = root.getBoundingClientRect();
      setSize({ w: o.width, h: o.height });
      setBoxes(TOUR.map(s => {
        const el = document.querySelector(s.sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return null;
        if (s.inset != null) return { left: r.left - o.left + s.inset, top: r.top - o.top + s.inset, width: r.width - 2 * s.inset, height: Math.min(r.height - 2 * s.inset, s.maxH || 9999) };
        return { left: r.left - o.left - s.pad, top: r.top - o.top - s.pad, width: r.width + 2 * s.pad, height: r.height + 2 * s.pad };
      }));
    };
    m();
    const t = setTimeout(m, 350);
    window.addEventListener("resize", m);
    return () => { clearTimeout(t); window.removeEventListener("resize", m); };
  }, []);
  useLayoutEffect(() => { if (tipRef.current) setTipH(tipRef.current.offsetHeight || 190); }, [i]);
  const st = TOUR[i], box = boxes[i];
  let y = (size.h - tipH) / 2;
  if (box) y = box.top + box.height / 2 < size.h / 2 ? box.top + box.height + 14 : box.top - tipH - 14;
  y = Math.max(12, Math.min(size.h - tipH - 12, y));
  const last = i === TOUR.length - 1;
  return (
    <div ref={rootRef} className="wt-root" data-guest-tour={i + 1} style={{ position: "absolute", inset: 0, zIndex: 900, fontFamily: WT.font }}>
      {!box && <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.74)" }} />}
      {TOUR.map((s, k) => boxes[k] && (
        <div key={k} aria-hidden="true" data-tour-spot={k === i ? "on" : undefined} style={{ position: "absolute", left: boxes[k].left, top: boxes[k].top, width: boxes[k].width, height: boxes[k].height, borderRadius: s.r, boxShadow: "0 0 0 2000px rgba(0,0,0,.74)", opacity: k === i ? 1 : 0, transition: "opacity 240ms ease-out", pointerEvents: "none" }} />
      ))}
      <div ref={tipRef} role="dialog" aria-label="Giro guidato" style={{ position: "absolute", left: 24, right: 24, top: 0, boxSizing: "border-box", padding: 20, borderRadius: 22, background: WT.ink, color: WT.bg, transform: `translateY(${Math.round(y)}px)`, transition: "transform 260ms ease-out" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#52525B" }}>{i + 1} di {TOUR.length}</div>
        <div style={{ marginTop: 6, fontSize: 22, lineHeight: "26px", fontWeight: 800, letterSpacing: -0.3 }}>{st.title}</div>
        <div style={{ marginTop: 6, fontSize: 15, lineHeight: "22px", fontWeight: 500, color: "#3F3F46" }}>{st.text}</div>
        {!last ? (
          <div style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button type="button" data-tour-skip="" onClick={onDone} style={{ display: "flex", alignItems: "center", minHeight: 44, padding: 0, border: "none", background: "none", fontFamily: WT.font, fontSize: 15, fontWeight: 700, color: "#52525B", cursor: "pointer" }}>Salta</button>
            <button type="button" className="wt-btn" data-tour-next="" onClick={() => setI(i + 1)} style={{ height: 48, padding: "0 28px", border: 0, borderRadius: 14, background: WT.bg, color: WT.ink, fontFamily: WT.font, fontSize: 16, fontWeight: 800, cursor: "pointer" }}>Avanti</button>
          </div>
        ) : (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 4 }}>
            <button type="button" className="wt-btn" data-tour-register="" onClick={onRegister} style={{ height: 48, border: 0, borderRadius: 14, background: WT.bg, color: WT.ink, fontFamily: WT.font, fontSize: 16, fontWeight: 800, cursor: "pointer" }}>Crea il tuo account</button>
            <button type="button" data-tour-done="" onClick={onDone} style={{ height: 44, border: 0, background: "transparent", color: "#52525B", fontFamily: WT.font, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Continua a guardare</button>
          </div>
        )}
      </div>
    </div>
  );
}

// Le icone F1 in orbita (casco, monoposto, volante, gomme) attorno al cerchio con l'arco rosso.
export function OrbitLoader({ text, scale = 1, style }) {
  return (
    <div data-orbit-loader="" role={text ? "status" : undefined} aria-hidden={text ? undefined : "true"} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, fontFamily: WT.font, color: WT.ink, ...style }}>
      <div style={{ position: "relative", width: ART_W * scale, height: 300 * scale, overflow: "hidden" }}>
        <div className="wto-root" style={{ width: ART_W, height: 300, transform: scale !== 1 ? `scale(${scale})` : undefined, transformOrigin: "top left" }}><OrbitArt /></div>
      </div>
      {text && <p style={{ margin: 0, maxWidth: 300, fontSize: 14, lineHeight: "20px", fontWeight: 600, color: WT.muted, textAlign: "center" }}>{text}</p>}
    </div>
  );
}

// Prima il caricamento normale (fast); se dopo `after` ms è ancora lì, la rete è lenta: l'orbita (slow).
export function SlowSwap({ after = 2500, fast, slow }) {
  const [late, setLate] = useState(false);
  useEffect(() => { const t = setTimeout(() => setLate(true), after); return () => clearTimeout(t); }, []);
  return late ? slow : fast;
}
