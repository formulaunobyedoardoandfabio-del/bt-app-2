// Giro guidato e Enzo (15/11, Edoardo): il pallino che mostra l'app muovendosi davvero tra le schede.
// - useSpot: trova il pezzo da mostrare (il primo selettore che c'è), lo porta sullo schermo e lo segue.
// - AppGuide: giro guidato a tappe in tutta l'app. Ogni tappa apre la sua scheda (onGo), evidenzia il pezzo, il testo
//   si scrive mentre lo leggi e il pallino (bianco sul fondo scuro) vola vicino al pezzo e lo guarda. Le tappe con un
//   pezzo che non c'è (es. ospite) si saltano da sole; finché il pezzo non è trovato il riquadro del testo non si vede.
// - EnzoChat: Enzo, l'assistente svogliato (copione in src/logic/enzo.js): mentre risponde l'app va nella scheda giusta
//   e il pezzo si illumina.
// - DuoGuide: le novità raccontate da Dot ed Enzo insieme (bottone Novità in Home).
// Solo transform/opacity; con "Rimuovi animazioni" niente voli e niente scrittura.
import React, { useEffect, useRef, useState } from "react";
import { LiveOrb, TypeText } from "./effetti";
import Enzo from "../logic/enzo";

const reduced = () => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const FONT = "'Manrope', 'Work Sans', system-ui, sans-serif";
// 15/11: il pallino che galleggia mentre esplori (su e giù piano; fermo con "Rimuovi animazioni")
const BOB_CSS = "@keyframes btDotBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}.bt-dot-bob{animation:btDotBob 2.6s ease-in-out infinite}@media (prefers-reduced-motion: reduce){.bt-dot-bob{animation:none}}";

export function useSpot(sel, key, block = "center") {
  const [st, setSt] = useState({ rect: null, missing: false });
  useEffect(() => {
    setSt({ rect: null, missing: false });
    if (!sel) return undefined;
    const list = Array.isArray(sel) ? sel : [sel];
    let el = null, tries = 0, alive = true, tm = 0;
    const measure = () => { if (!alive || !el) return; const r = el.getBoundingClientRect(); setSt(s => (s.rect && Math.abs(s.rect.top - r.top) < 1 && Math.abs(s.rect.left - r.left) < 1 && Math.abs(s.rect.width - r.width) < 1 ? s : { rect: { left: r.left, top: r.top, width: r.width, height: r.height }, missing: false })); };
    const find = () => {
      if (!alive) return;
      // il primo pezzo che c'è e si vede (non nascosto: larghezza > 0)
      el = list.map(q => document.querySelector(q)).find(e => e && e.getBoundingClientRect().width > 0) || null;
      if (el) {
        const old = el.style.scrollMarginTop;
        el.style.scrollMarginTop = block === "start" ? "96px" : old;   // sotto la barra in alto
        try { el.scrollIntoView({ block, behavior: reduced() ? "auto" : "smooth" }); } catch (e) { /* vecchi browser */ }
        el.style.scrollMarginTop = old;
        measure(); tm = setInterval(measure, 250); return;
      }
      if (++tries > 14) { setSt({ rect: null, missing: true }); return; }
      tm = setTimeout(find, 150);
    };
    tm = setTimeout(find, 120);
    window.addEventListener("resize", measure);
    return () => { alive = false; clearTimeout(tm); clearInterval(tm); window.removeEventListener("resize", measure); };
  }, [key]);
  return st;
}

const vw = () => (typeof window !== "undefined" ? window.innerWidth : 390);
const vh = () => (typeof window !== "undefined" ? window.innerHeight : 800);

// where: dove si trova l'app (vista e scheda). Tocchi il pezzo acceso → resta solo il pallino che galleggia e guarda
// i tuoi tocchi; quando torni dove eri (esci dalla scheda che hai aperto) torna il riquadro del testo.
export function AppGuide({ steps, onGo, onDone, onRegister = null, useBack = null, where = "" }) {
  const [explore, setExplore] = useState(null);   // { where0, left }
  const [i, setI] = useState(0);
  const step = steps[i] || {};
  const last = i >= steps.length - 1;
  const next = () => (last ? onDone() : setI(v => v + 1));
  if (useBack) useBack(true, onDone);
  useEffect(() => { if (onGo) onGo(step); }, [i]);
  const { rect, missing } = useSpot(explore ? null : step.sel, explore ? -1 - i : i);
  useEffect(() => { if (missing && step.sel && !explore) next(); }, [missing]);
  useEffect(() => {
    if (!explore) return;
    if (where !== explore.where0 && !explore.left) setExplore({ ...explore, left: true });
    else if (explore.left && where === explore.where0) setExplore(null);
  }, [where]);
  const pad = step.pad == null ? 8 : step.pad;
  const box = rect ? { x: rect.left - pad, y: rect.top - pad, w: rect.width + pad * 2, h: rect.height + pad * 2 } : null;
  const low = box ? box.y + box.h / 2 > vh() * 0.5 : false;
  const orbAt = box ? { x: Math.max(8, Math.min(vw() - 52, box.x + box.w - 26)), y: box.y > 70 ? box.y - 52 : Math.min(vh() - 52, box.y + box.h + 8) } : { x: vw() / 2 - 22, y: vh() * 0.22 };
  const look = box ? { x: box.x + box.w / 2, y: box.y + box.h / 2 } : null;
  const fly = reduced() ? "none" : "transform 420ms cubic-bezier(.2,.8,.2,1)";
  const holeRef = useRef(null);
  holeRef.current = !explore && box ? { box, where } : null;
  useEffect(() => {
    const h = e => { const c = holeRef.current; if (!c) return; const b = c.box; if (e.clientX >= b.x && e.clientX <= b.x + b.w && e.clientY >= b.y && e.clientY <= b.y + b.h) setExplore({ where0: c.where, left: false }); };
    document.addEventListener("pointerdown", h, true);
    return () => document.removeEventListener("pointerdown", h, true);
  }, []);
  if (explore) return (
    <div data-app-guide="" data-tour-exploring="" style={{ position: "fixed", right: 14, bottom: 96, zIndex: 95, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <style>{BOB_CSS}</style>
      <div className="bt-dot-bob" data-tour-float=""><LiveOrb size={46} label="Pallino guida: ti guarda mentre esplori" /></div>
      <button type="button" data-tour-resume="" onClick={() => setExplore(null)} style={{ minHeight: 36, padding: "0 10px", borderRadius: 18, background: "#F4F4F5", border: "none", fontFamily: FONT, fontWeight: 700, fontSize: 12, color: "#0B0B0C", boxShadow: "0 6px 18px rgba(0,0,0,.4)" }}>Torna al giro</button>
    </div>
  );
  // fuori dal pezzo acceso i tocchi si fermano (4 bordi trasparenti); dentro passano all'app e si esplora
  const W = vw(), H = vh();
  const blockers = box ? [[0, 0, W, Math.max(0, box.y)], [0, box.y + box.h, W, Math.max(0, H - box.y - box.h)], [0, box.y, Math.max(0, box.x), box.h], [box.x + box.w, box.y, Math.max(0, W - box.x - box.w), box.h]] : [[0, 0, W, H]];
  return (
    <div data-app-guide="" data-guest-tour={i + 1} style={{ position: "fixed", inset: 0, zIndex: 95, pointerEvents: "none" }}>
      {blockers.map((b, k) => <div key={k} aria-hidden="true" style={{ position: "absolute", left: b[0], top: b[1], width: b[2], height: b[3], pointerEvents: "auto" }} />)}
      {box ? <div data-tour-spot="on" aria-hidden="true" style={{ position: "absolute", left: 0, top: 0, width: box.w, height: box.h, transform: `translate(${box.x}px, ${box.y}px)`, borderRadius: step.r || 16, boxShadow: "0 0 0 3000px rgba(0,0,0,.74)", outline: "2px solid rgba(255,255,255,.9)", transition: fly }} />
        : <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.74)" }} />}
      <div data-tour-orb-wrap="" style={{ position: "absolute", left: 0, top: 0, transform: `translate(${orbAt.x}px, ${orbAt.y}px)`, transition: fly, pointerEvents: "none" }}>
        <LiveOrb size={44} data-tour-orb="" lookAt={look} interactive={!look} label="Pallino guida" />
      </div>
      {(rect || !step.sel) && <div role="dialog" aria-label="Giro guidato" style={{ position: "absolute", pointerEvents: "auto", left: 16, right: 16, ...(low ? { top: 24 } : { bottom: 24 }), boxSizing: "border-box", padding: 18, borderRadius: 22, background: "#F4F4F5", color: "#0B0B0C", fontFamily: FONT, boxShadow: "0 14px 40px rgba(0,0,0,.45)" }}>
        <div data-tour-count="" style={{ fontSize: 12.5, fontWeight: 700, color: "#52525B" }}>{i + 1} di {steps.length}{step.area ? " · " + step.area : ""}</div>
        <div style={{ marginTop: 4, fontSize: 20, lineHeight: "24px", fontWeight: 800 }}>{step.title}</div>
        <div data-tour-text="" style={{ marginTop: 6, minHeight: 44, fontSize: 14.5, lineHeight: "21px", fontWeight: 500, color: "#3F3F46" }}><TypeText key={i} text={step.text || ""} cps={45} cursorColor="#0B0B0C" /></div>
        <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <button type="button" onClick={onDone} style={{ minHeight: 44, padding: "0 10px", background: "none", border: "none", fontFamily: FONT, fontWeight: 700, fontSize: 14, color: "#52525B" }}>Salta</button>
          <span style={{ flex: 1 }} />
          {i > 0 && <button type="button" data-tour-prev="" onClick={() => setI(v => Math.max(0, v - 1))} style={{ minHeight: 44, padding: "0 14px", borderRadius: 12, background: "transparent", border: "1px solid #D4D4D8", fontFamily: FONT, fontWeight: 700, fontSize: 14, color: "#0B0B0C" }}>Indietro</button>}
          {last && onRegister ? <>
            <button type="button" data-tour-done="" onClick={onDone} style={{ minHeight: 44, padding: "0 12px", borderRadius: 12, background: "transparent", border: "1px solid #D4D4D8", fontFamily: FONT, fontWeight: 700, fontSize: 13.5, color: "#0B0B0C" }}>Continua a guardare</button>
            <button type="button" data-tour-register="" onClick={onRegister} style={{ minHeight: 44, padding: "0 16px", borderRadius: 12, background: "#0B0B0C", border: "none", fontFamily: FONT, fontWeight: 800, fontSize: 14, color: "#fff" }}>Registrati</button>
          </> : <button type="button" data-tour-next="" data-tour-done={last ? "" : undefined} onClick={next} style={{ minHeight: 44, padding: "0 18px", borderRadius: 12, background: "#0B0B0C", border: "none", fontFamily: FONT, fontWeight: 800, fontSize: 14, color: "#fff" }}>{last ? "Fine" : "Avanti"}</button>}
        </div>
      </div>}
    </div>
  );
}

// 15/11 (Edoardo): bottone Novità in Home. Dot (il pallino bianco del giro guidato) ed Enzo (rosso) raccontano insieme
// le novità, come un mini giro guidato a parte, con qualche battuta e qualche litigata tra loro. Ogni battuta può aprire
// una scheda (onGo, come il giro guidato) e illuminare un pezzo: chi parla è più grande e guarda il pezzo, l'altro
// guarda chi parla. steps: [{ who: "dot" | "enzo", text, tab | view, sel, r }]. Un pezzo che non c'è: si parla lo stesso.
export function DuoGuide({ steps, onGo, onDone, useBack = null, accent = "#E10600" }) {
  const [i, setI] = useState(0);
  const step = steps[i] || {};
  const last = i >= steps.length - 1;
  const next = () => (last ? onDone() : setI(v => v + 1));
  if (useBack) useBack(true, onDone);
  useEffect(() => { if (onGo) onGo(step); }, [i]);
  // stesso pezzo della battuta prima: non si cerca di nuovo (niente lampo)
  const spotKey = (step.view || step.tab || "") + "|" + [].concat(step.sel || []).join(",");
  const { rect, missing } = useSpot(step.sel || null, spotKey);
  const pad = 8;
  const box = rect ? { x: rect.left - pad, y: rect.top - pad, w: rect.width + pad * 2, h: rect.height + pad * 2 } : null;
  const low = box ? box.y + box.h / 2 > vh() * 0.5 : false;
  const dotRef = useRef(null), enzoRef = useRef(null);
  const [eyes, setEyes] = useState({ dot: null, enzo: null });
  useEffect(() => {
    const c = el => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
    const tm = setTimeout(() => setEyes({ dot: c(dotRef.current), enzo: c(enzoRef.current) }), 80);
    return () => clearTimeout(tm);
  }, [i, low, !!box]);
  const dot = step.who !== "enzo";
  const target = box ? { x: box.x + box.w / 2, y: box.y + box.h / 2 } : null;
  const lookDot = dot ? target || eyes.enzo : eyes.enzo;
  const lookEnzo = dot ? eyes.dot : target || eyes.dot;
  const ready = !step.sel || !!rect || missing;   // il testo parte quando il pezzo è sullo schermo
  const fly = reduced() ? "none" : "transform 420ms cubic-bezier(.2,.8,.2,1)";
  const grow = reduced() ? "none" : "transform 260ms ease-out, opacity 260ms ease-out";
  const who = (on, ref, attr, orb) => (
    <div ref={ref} {...{ [attr]: "" }} data-speaking={on ? "" : undefined} style={{ flexShrink: 0, transformOrigin: "50% 100%", transform: on ? "scale(1)" : "scale(.78)", opacity: on ? 1 : 0.6, transition: grow }}>
      <div className="bt-dot-bob" style={attr === "data-duo-enzo" ? { animationDelay: "-1.3s" } : null}>{orb}</div>
    </div>
  );
  return (
    <div data-duo-guide="" data-duo-step={i + 1} style={{ position: "fixed", inset: 0, zIndex: 95 }}>
      <style>{BOB_CSS}</style>
      {box ? <div data-duo-spot="" aria-hidden="true" style={{ position: "absolute", left: 0, top: 0, width: box.w, height: box.h, transform: `translate(${box.x}px, ${box.y}px)`, borderRadius: step.r || 16, boxShadow: "0 0 0 3000px rgba(0,0,0,.74)", outline: `2px solid ${dot ? "rgba(255,255,255,.9)" : accent}`, transition: fly, pointerEvents: "none" }} />
        : <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.74)" }} />}
      <div role="dialog" aria-label="Novità con Dot ed Enzo" style={{ position: "absolute", left: 12, right: 12, ...(low ? { top: 16 } : { bottom: 16 }), boxSizing: "border-box", padding: "10px 12px 12px", borderRadius: 22, background: "#0F0F12", border: "1px solid #2A2A30", boxShadow: "0 18px 44px rgba(0,0,0,.6)", fontFamily: FONT }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <span data-duo-count="" style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: "#8E8E96" }}>{i + 1} di {steps.length} · Novità</span>
          <button type="button" data-duo-skip="" onClick={onDone} style={{ minHeight: 44, padding: "0 6px", background: "none", border: "none", fontFamily: FONT, fontWeight: 700, fontSize: 14, color: "#8E8E96" }}>Salta</button>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginTop: 2 }}>
          {who(dot, dotRef, "data-duo-dot", <LiveOrb size={46} label="Dot" lookAt={lookDot} interactive={false} />)}
          <div data-duo-text="" data-duo-who={dot ? "dot" : "enzo"} aria-live="polite" style={{ flex: 1, minWidth: 0, minHeight: 92, boxSizing: "border-box", padding: "9px 12px 10px", borderRadius: dot ? "16px 16px 16px 4px" : "16px 16px 4px 16px", background: dot ? "#F4F4F5" : "#1B1B20", border: dot ? "1px solid #F4F4F5" : `1px solid ${accent}77`, color: dot ? "#0B0B0C" : "#fff", fontSize: 14.5, lineHeight: "21px", fontWeight: 500 }}>
            <div style={{ fontSize: 11.5, fontWeight: 800, color: dot ? "#52525B" : accent, marginBottom: 2 }}>{dot ? "Dot" : "Enzo"}</div>
            {ready && <TypeText key={i} text={step.text || ""} cps={45} cursorColor={dot ? "#0B0B0C" : accent} />}
          </div>
          {who(!dot, enzoRef, "data-duo-enzo", <LiveOrb size={46} variant="red" label="Enzo" lookAt={lookEnzo} interactive={false} />)}
        </div>
        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ flex: 1 }} />
          {i > 0 && <button type="button" data-duo-prev="" onClick={() => setI(v => Math.max(0, v - 1))} style={{ minHeight: 44, padding: "0 14px", borderRadius: 12, background: "transparent", border: "1px solid #3A3A42", fontFamily: FONT, fontWeight: 700, fontSize: 14, color: "#fff" }}>Indietro</button>}
          <button type="button" data-duo-next="" data-duo-done={last ? "" : undefined} onClick={next} style={{ minHeight: 44, padding: "0 18px", borderRadius: 12, background: dot ? "#F4F4F5" : accent, border: "none", fontFamily: FONT, fontWeight: 800, fontSize: 14, color: dot ? "#0B0B0C" : "#fff" }}>{last ? "Fine" : "Avanti"}</button>
        </div>
      </div>
    </div>
  );
}

// 15/11: la barra in basso si stacca e diventa Enzo (e al congedo torna barra). Solo transform/opacity: la barra è fatta di
// due tappi tondi e un pezzo in mezzo; i tappi vanno al centro e il pezzo si stringe → resta un cerchio, che diventa
// rosso e vola al posto di Enzo (e al contrario quando se ne va).
function BarMorph({ from, to, size, barColor, accent, back = false, onDone }) {
  const [go, setGo] = useState(back);
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setGo(!back)));
    const tm = setTimeout(onDone, reduced() ? 0 : 560);
    return () => { cancelAnimationFrame(id); clearTimeout(tm); };
  }, []);
  const h = from.height, w = from.width, cx = from.left + w / 2, cy = from.top + h / 2;
  const s = size / h, tx = to.x + size / 2 - cx, ty = to.y + size / 2 - cy;
  const ease = reduced() ? "none" : "transform 520ms cubic-bezier(.6,0,.2,1), opacity 520ms ease";
  const piece = { position: "absolute", top: -h / 2, height: h, background: barColor, transition: ease };
  return (
    <div data-enzo-morph={back ? "back" : "in"} aria-hidden="true" style={{ position: "fixed", left: cx, top: cy, width: 0, height: 0, zIndex: 97, pointerEvents: "none", transform: go ? `translate(${tx}px, ${ty}px) scale(${s})` : "none", transition: ease }}>
      <div style={{ ...piece, left: -w / 2, width: h, borderRadius: "50%", transform: go ? `translateX(${w / 2 - h / 2}px)` : "none" }} />
      <div style={{ ...piece, left: -w / 2 + h / 2, width: Math.max(0, w - h), transformOrigin: "center", transform: go ? "scaleX(0)" : "none" }} />
      <div style={{ ...piece, left: w / 2 - h, width: h, borderRadius: "50%", transform: go ? `translateX(${-(w / 2 - h / 2)}px)` : "none" }} />
      <div style={{ ...piece, left: -h / 2, width: h, borderRadius: "50%", background: accent, opacity: go ? 1 : 0 }} />
    </div>
  );
}

const CHIPS = [["Live Telemetry", "Live Telemetry"], ["Fanta F1", "Fanta F1"], ["News", "News"], ["Community", "Community"]];
export function EnzoChat({ raceToday = false, offline = false, onDemo, onClose, accent = "#E10600", fromRect = null, barColor = "#1B1B20" }) {
  const [phase, setPhase] = useState(fromRect && !reduced() ? "in" : "on");   // in → on → out
  const [msgs, setMsgs] = useState([]), [input, setInput] = useState(""), [spot, setSpot] = useState(null), [leaving, setLeaving] = useState(false);
  const streak = useRef(0), id = useRef(0), list = useRef(null);
  const say = (who, text) => setMsgs(m => [...m, { who, text, id: ++id.current }]);
  useEffect(() => { say("enzo", Enzo.greeting({ raceToday })); if (offline) say("enzo", Enzo.BUG); }, []);
  useEffect(() => { const el = list.current; if (el) el.scrollTop = el.scrollHeight; });
  const bye = () => (fromRect && !reduced() ? setPhase("out") : onClose());
  const leave = text => { if (leaving) return; setLeaving(true); setSpot(null); const t = text || Enzo.closing(); say("enzo", t); setTimeout(bye, reduced() ? 0 : Math.min(6500, 1500 + t.length * 22)); };   // tempo per leggere
  const send = raw => {
    const r = Enzo.reply(raw, { streak: streak.current });
    if (!r || leaving) return;
    say("me", raw.trim()); setInput("");
    streak.current = r.intent === "off" || r.intent === "long" ? streak.current + 1 : 0;
    if (r.intent === "bye") { leave(r.text); return; }
    setTimeout(() => say("enzo", r.text), 250);
    if (r.demo && onDemo) { setSpot(null); onDemo(r.demo); setTimeout(() => setSpot({ sel: r.demo.sel, k: id.current + 1 }), 450); }
  };
  const { rect } = useSpot(spot && spot.sel, spot ? spot.k : 0, "start");
  const lastEnzo = [...msgs].reverse().find(m => m.who === "enzo");
  // il pezzo da mostrare sta in basso (sotto il foglio): il foglio di Enzo va in alto
  const top = !!rect && rect.top + rect.height > vh() * 0.52;
  const BALL = 58, ballAt = { x: 14, y: top ? 64 : vh() - BALL - 26 };
  if (phase === "in") return <BarMorph from={fromRect} to={ballAt} size={BALL} barColor={barColor} accent={accent} onDone={() => setPhase("on")} />;
  if (phase === "out") return <BarMorph back from={fromRect} to={ballAt} size={BALL} barColor={barColor} accent={accent} onDone={onClose} />;
  return (
    <>
      {rect && <div data-enzo-spot="" aria-hidden="true" style={{ position: "fixed", left: 0, top: 0, zIndex: 94, width: rect.width + 12, height: rect.height + 12, transform: `translate(${rect.left - 6}px, ${rect.top - 6}px)`, borderRadius: 14, border: `3px solid ${accent}`, boxShadow: `0 0 0 6px ${accent}40, 0 0 30px ${accent}80`, pointerEvents: "none", transition: reduced() ? "none" : "transform 300ms ease-out" }} />}
      <style>{BOB_CSS}</style>
      <div data-enzo-ball="" className="bt-dot-bob" style={{ position: "fixed", left: ballAt.x, top: ballAt.y, zIndex: 97 }}>
        <LiveOrb size={BALL} variant="red" label="Enzo" lookAt={rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : null} />
      </div>
      <section data-enzo="" data-red-orb="" data-enzo-dock={top ? "top" : "bottom"} role="dialog" aria-label="Enzo, l'assistente di Sector 4" style={{ position: "fixed", left: ballAt.x + BALL + 10, right: 12, ...(top ? { top: ballAt.y } : { bottom: vh() - ballAt.y - BALL }), zIndex: 96, maxHeight: "48vh", display: "flex", flexDirection: "column", background: "#0F0F12", border: `1px solid ${accent}55`, borderRadius: top ? "6px 20px 20px 20px" : "20px 20px 20px 6px", boxShadow: "0 18px 40px rgba(0,0,0,.55)", fontFamily: FONT }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 8px 6px 14px" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: "#fff" }}>Enzo</div>
            <div style={{ fontSize: 11.5, color: "#8E8E96" }}>assistente di Sector 4, di malavoglia</div>
          </div>
          <button type="button" data-enzo-close="" aria-label="Chiudi Enzo" onClick={() => leave()} style={{ width: 44, height: 44, borderRadius: 12, background: "#1B1B20", border: "1px solid #2A2A30", color: "#fff", fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
        <div ref={list} data-enzo-list="" aria-live="polite" style={{ flex: 1, minHeight: 90, overflowY: "auto", padding: "4px 12px 8px", display: "flex", flexDirection: "column", gap: 8 }}>
          {msgs.map(m => (
            <div key={m.id} data-enzo-msg={m.who} style={{ alignSelf: m.who === "me" ? "flex-end" : "flex-start", maxWidth: "86%", padding: "9px 12px", borderRadius: m.who === "me" ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: m.who === "me" ? accent : "#1B1B20", color: "#fff", fontSize: 14, lineHeight: "20px" }}>
              {m.who === "enzo" && lastEnzo && m.id === lastEnzo.id ? <TypeText key={m.id} text={m.text} cps={50} cursorColor={accent} /> : m.text}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "0 16px 8px", scrollbarWidth: "none" }}>
          {CHIPS.map(([label, q]) => <button key={label} type="button" data-enzo-chip={label} disabled={leaving} onClick={() => send(q)} style={{ flexShrink: 0, minHeight: 36, padding: "0 12px", borderRadius: 18, background: "#1B1B20", border: "1px solid #2A2A30", color: "#fff", fontFamily: FONT, fontWeight: 700, fontSize: 12.5 }}>{label}</button>)}
        </div>
        <form onSubmit={e => { e.preventDefault(); send(input); }} style={{ display: "flex", gap: 8, padding: "0 12px 14px 16px" }}>
          <input data-enzo-input="" value={input} onChange={e => setInput(e.target.value)} disabled={leaving} placeholder="Chiedi a Enzo (se proprio devi)" aria-label="Scrivi a Enzo" style={{ flex: 1, minWidth: 0, minHeight: 44, padding: "0 14px", borderRadius: 12, background: "#16161A", border: "1px solid #2A2A30", color: "#fff", fontFamily: FONT, fontSize: 14, outline: "none" }} />
          <button type="submit" data-enzo-send="" disabled={leaving || !input.trim()} style={{ minHeight: 44, padding: "0 16px", borderRadius: 12, background: accent, border: "none", color: "#fff", fontFamily: FONT, fontWeight: 800, fontSize: 14, opacity: input.trim() ? 1 : 0.5 }}>Invia</button>
        </form>
      </section>
    </>
  );
}
