// Effetti grafici del 15/11 (Edoardo), rifatti a mano senza librerie, solo transform/opacity/canvas:
// - LiveOrb: sfera con due occhi a capsula che seguono il dito e sbattono le palpebre (come "Live Orb", variante Auto
//   bianca; "red" per il pallino rosso). Giro guidato e tre tocchi sulla stessa scheda.
// - TypeText: testo che si scrive da solo con il cursore (terminale a blocco di codice). Il testo intero resta nella
//   pagina (la parte non ancora scritta è trasparente): niente salti e lettori di schermo contenti.
// - ChangelogCard: scheda compatta del registro delle novità, con i bordi che sfumano quando si scorre.
// - VanishCanvas: la password si sbriciola in particelle quando si preme Accedi (come "Devouring details sign in").
// Con "Rimuovi animazioni" (prefers-reduced-motion): niente palpebre, niente scrittura, niente particelle.
import React, { useEffect, useRef, useState } from "react";

const reduced = () => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// variant "auto": bianca su sfondo scuro (on="dark"), nera su sfondo chiaro (on="light"); "red": il pallino rosso.
export function LiveOrb({ size = 120, variant = "auto", on = "dark", interactive = true, blink = true, label = "Pallino B&T", style, ...rest }) {
  const ref = useRef(null), eyes = useRef(null);
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    if (!interactive) return undefined;
    let raf = 0, px = 0, py = 0;
    const apply = () => {
      raf = 0;
      const el = ref.current, ey = eyes.current;
      if (!el || !ey) return;
      const r = el.getBoundingClientRect(), dx = px - (r.left + r.width / 2), dy = py - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1, m = Math.min(1, d / (size * 2)) * size * 0.14;
      ey.style.transform = `translate(${((dx / d) * m).toFixed(1)}px, ${((dy / d) * m).toFixed(1)}px)`;
    };
    const move = e => { px = e.clientX; py = e.clientY; if (!raf) raf = requestAnimationFrame(apply); };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", move, { passive: true });
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerdown", move); cancelAnimationFrame(raf); };
  }, [interactive, size]);
  useEffect(() => {
    if (!blink || reduced()) return undefined;
    let t1 = 0, t2 = 0;
    const loop = () => { t1 = setTimeout(() => { setClosed(true); t2 = setTimeout(() => { setClosed(false); loop(); }, 130); }, 2400 + Math.random() * 2600); };
    loop();
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [blink]);
  const red = variant === "red", black = !red && on === "light";
  const bg = red ? "radial-gradient(circle at 34% 28%, #FF8A80 0%, #F2261B 36%, #C00700 72%, #7A0400 100%)"
    : black ? "radial-gradient(circle at 34% 28%, #5A5A63 0%, #2A2A30 38%, #121216 74%, #050506 100%)"
    : "radial-gradient(circle at 34% 28%, #FFFFFF 0%, #F4F4F6 42%, #D9D9DF 78%, #B4B4BE 100%)";
  const ew = Math.max(3, size * 0.085), eh = size * 0.25;
  return (
    <div ref={ref} data-live-orb={variant} role="img" aria-label={label} {...rest}
      style={{ width: size, height: size, borderRadius: "50%", background: bg, position: "relative", flexShrink: 0, boxShadow: red ? `0 ${size * 0.06}px ${size * 0.28}px rgba(225,6,0,.45)` : black ? `0 ${size * 0.05}px ${size * 0.2}px rgba(0,0,0,.28)` : `0 ${size * 0.06}px ${size * 0.28}px rgba(255,255,255,.16)`, ...style }}>
      <div ref={eyes} data-orb-eyes="" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: size * 0.13, transition: reduced() ? "none" : "transform 160ms ease-out" }}>
        {[0, 1].map(k => <span key={k} style={{ width: ew, height: eh, borderRadius: ew, background: red || black ? "#FFFFFF" : "#0B0B0D", transform: `scaleY(${closed ? 0.12 : 1})`, transition: "transform 110ms ease-in-out" }} />)}
      </div>
    </div>
  );
}

export function TypeText({ text, cps = 70, cursorColor = "currentColor", onDone }) {
  const [n, setN] = useState(() => (reduced() ? text.length : 0));
  useEffect(() => {
    if (n >= text.length) { if (onDone) onDone(); return undefined; }
    const id = setTimeout(() => setN(v => Math.min(text.length, v + Math.max(1, Math.round(cps / 30)))), 1000 / 30);
    return () => clearTimeout(id);
  }, [n, text]);
  const done = n >= text.length;
  return (
    <>
      {text.slice(0, n)}
      {!done && <span aria-hidden="true" data-type-cursor="" style={{ display: "inline-block", width: "0.55em", height: "1.05em", verticalAlign: "text-bottom", background: cursorColor, opacity: .85 }} />}
      <span style={{ color: "transparent" }}>{text.slice(n)}</span>
    </>
  );
}

export function ChangelogCard({ releases = [], title = "Novità", fontHead = "inherit", fontBody = "inherit", colors = {} }) {
  const box = useRef(null);
  const [fade, setFade] = useState([0, 40]);
  const c = { card: "#141418", border: "rgba(255,255,255,.1)", text: "#F2F2F4", muted: "#8E8E96", accent: "#E10600", ...colors };
  const measure = () => {
    const el = box.current;
    if (!el) return;
    const top = Math.min(40, el.scrollTop), bottom = Math.min(40, el.scrollHeight - el.clientHeight - el.scrollTop);
    setFade(f => (f[0] === top && f[1] === bottom ? f : [top, bottom]));
  };
  useEffect(measure, [releases.length]);
  const mask = `linear-gradient(to bottom, transparent 0, #000 ${fade[0]}px, #000 calc(100% - ${Math.max(0, fade[1])}px), transparent 100%)`;
  return (
    <section data-changelog="" aria-label={title} style={{ borderRadius: 16, background: c.card, border: `1px solid ${c.border}`, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: `1px solid ${c.border}` }}>
        <h3 style={{ margin: 0, fontFamily: fontHead, fontWeight: 800, fontSize: 14, color: c.text }}>{title}</h3>
        <span style={{ fontFamily: fontBody, fontSize: 12, color: c.muted }}>{releases.length} aggiornamenti</span>
      </div>
      <div ref={box} data-changelog-list="" onScroll={measure} style={{ height: 256, overflowY: "auto", overscrollBehavior: "contain", WebkitMaskImage: mask, maskImage: mask, scrollbarWidth: "none" }}>
        <ul style={{ listStyle: "none", margin: 0, padding: 8, display: "flex", flexDirection: "column" }}>
          {releases.map((r, i) => (
            <li key={i} data-changelog-item="" style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 34, padding: "4px 8px", borderRadius: 8 }}>
              <span style={{ width: 40, flexShrink: 0, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 11.5, color: c.muted }}>{r.date}</span>
              <span style={{ flex: 1, minWidth: 0, fontFamily: fontBody, fontSize: 13, color: c.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.title}</span>
              {r.tag && <span style={{ padding: "0 7px", borderRadius: 999, background: c.accent, fontFamily: fontBody, fontWeight: 700, fontSize: 9.5, lineHeight: "16px", color: "#fff" }}>{r.tag}</span>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// Disegna il testo del campo su un canvas sopra il campo e lo sbriciola da destra a sinistra in circa 0,8 s.
export function VanishCanvas({ input, text, onDone }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current, el = input && input.current;
    if (!cv || !el || !text || reduced()) { if (onDone) onDone(); return undefined; }
    const host = cv.parentElement.getBoundingClientRect(), ir = el.getBoundingClientRect(), cs = getComputedStyle(el);
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = Math.ceil(host.width), H = Math.ceil(host.height);
    cv.width = W * dpr; cv.height = H * dpr;
    const g = cv.getContext("2d");
    if (!g) { if (onDone) onDone(); return undefined; }
    g.scale(dpr, dpr);
    const x0 = ir.left - host.left + (parseFloat(cs.paddingLeft) || 0), y0 = ir.top - host.top + ir.height / 2;
    g.font = cs.font; g.fillStyle = cs.color; g.textBaseline = "middle";
    g.fillText(text, x0, y0);
    const img = g.getImageData(0, 0, W * dpr, H * dpr).data, parts = [];
    for (let y = 0; y < H * dpr; y += 2) for (let x = 0; x < W * dpr; x += 2) {
      const k = (y * W * dpr + x) * 4;
      if (img[k + 3] > 120) parts.push({ x: x / dpr, y: y / dpr, a: 1, vx: 0.6 + Math.random() * 2.2, vy: (Math.random() - 0.5) * 1.6, r: 0.6 + Math.random() * 0.9, c: `rgba(${img[k]},${img[k + 1]},${img[k + 2]},` });
    }
    const right = parts.reduce((m, p) => Math.max(m, p.x), x0), span = Math.max(1, right - x0);
    let raf = 0, t0 = 0;
    const step = now => {
      if (!t0) t0 = now;
      const f = (now - t0) / 800, edge = right - f * span * 1.15;
      g.clearRect(0, 0, W, H);
      let alive = 0;
      parts.forEach(p => {
        if (p.x > edge) { p.x += p.vx; p.y += p.vy; p.a -= 0.035; }
        if (p.a > 0) { alive++; g.fillStyle = p.c + p.a.toFixed(2) + ")"; g.fillRect(p.x, p.y, p.r * 2, p.r * 2); }
      });
      if (alive && now - t0 < 1400) raf = requestAnimationFrame(step); else if (onDone) onDone();
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} data-pw-vanish="" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />;
}
