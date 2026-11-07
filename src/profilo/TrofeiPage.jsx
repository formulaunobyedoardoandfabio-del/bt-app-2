// 7/11 sera (Edoardo: "dal design del Profilo metti solo la pagina dei trofei, che si apre solo toccando il bottone dei
// propri trofei"): pagina "I miei trofei" dal design "BT Profilo nuovo design" → "3 Trofei" (Manrope, fondo nero).
// In alto la medaglia con quanti trofei e quanto manca alla prossima; interruttore Vinti / Da vincere; piastrelle a
// due colonne. Tra i vinti, in fondo e larga, quella da vincere più vicina (con la barra). Solo dati veri: i trofei
// dell'account (data in cui si sono vinti) e i progressi contati dall'app; i segreti restano segreti finché non si
// vincono.
import React, { useState } from "react";
import "./TrofeiPage.css";

export const TP = {
  bg: "#000000", ink: "#F4F4F5", muted: "#A1A1AA", card: "#111113", line: "#1E1E22", lineOn: "#2A2A2E", segOn: "#26262B",
  disc: "#1C1C1F", font: "'Manrope', system-ui, sans-serif",
};
export const MEDAL_TP = { bronzo: { name: "Bronzo", art: "il bronzo", c: "#CD8D52" }, argento: { name: "Argento", art: "l'argento", c: "#C0C0C8" }, oro: { name: "Oro", art: "l'oro", c: "#EDC55C" } };
const medalAt = n => (n >= 10 ? "oro" : n >= 5 ? "argento" : n >= 1 ? "bronzo" : null);

// Disegni delle piastrelle (linee, 24×24): uno per trofeo; quelli segreti non ancora vinti col lucchetto.
const G = {
  idcard: "M3 7a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v10a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3z M7 10a2 2 0 1 0 4 0a2 2 0 1 0 -4 0 M15 8l2 0 M15 12l2 0 M7 16l10 0",
  star: "M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z",
  flag: "M5 5a5 5 0 0 1 7 0a5 5 0 0 0 7 0v9a5 5 0 0 1 -7 0a5 5 0 0 0 -7 0v-9z M5 21v-7",
  target: "M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0 M12 12m-5 0a5 5 0 1 0 10 0a5 5 0 1 0 -10 0 M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0",
  check: "M5 12l5 5l10 -10",
  trophy: "M8 21l8 0 M12 17l0 4 M7 4l10 0 M17 4v8a5 5 0 0 1 -10 0v-8 M3 9a2 2 0 1 0 4 0a2 2 0 1 0 -4 0 M17 9a2 2 0 1 0 4 0a2 2 0 1 0 -4 0",
  clock: "M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0 M12 7v5l3 3",
  cloud: "M7 18a4.6 4.4 0 0 1 0 -9a5 4.5 0 0 1 11 2h1a3.5 3.5 0 0 1 0 7h-12",
  bars: "M5 20v-6 M12 20v-15 M19 20v-10",
  watch: "M12 13m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0 M12 10v3l2 2 M10 3h4 M12 3v3",
  list: "M9 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2h-2 M9 3h6v4h-6z M9 12h6 M9 16h6",
  mic: "M9 5a3 3 0 0 1 6 0v5a3 3 0 0 1 -6 0z M5 10a7 7 0 0 0 14 0 M8 21l8 0 M12 17l0 4",
  bookmark: "M18 7v14l-6 -4l-6 4v-14a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4z",
  chat: "M8 9h8 M8 13h6 M18 4a3 3 0 0 1 3 3v8a3 3 0 0 1 -3 3h-5l-5 3v-3h-2a3 3 0 0 1 -3 -3v-8a3 3 0 0 1 3 -3h12z",
  box: "M12 3l8 4.5v9l-8 4.5l-8 -4.5v-9z M12 12l8 -4.5 M12 12v9 M12 12l-8 -4.5",
  heart: "M19.5 12.57l-7.5 7.43l-7.5 -7.43a5 5 0 1 1 7.5 -6.57a5 5 0 1 1 7.5 6.58",
  bolt: "M13 3v7h6l-8 11v-7h-6l8 -11",
  flame: "M12 10.941c2.333 -3.308 .167 -7.823 -1 -8.941c0 3.395 -2.235 5.299 -3.667 6.706c-1.43 1.408 -2.333 3.621 -2.333 5.588c0 3.704 3.134 6.706 7 6.706s7 -3.002 7 -6.706c0 -1.712 -1.232 -4.403 -2.333 -5.588c-2.084 3.353 -3.257 3.353 -4.667 2.235",
  gift: "M3 9a1 1 0 0 1 1 -1h16a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1z M12 8l0 13 M19 12v7a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-7 M7.5 8a2.5 2.5 0 0 1 0 -5a4.8 8 0 0 1 4.5 5a4.8 8 0 0 1 4.5 -5a2.5 2.5 0 0 1 0 5",
  pin: "M9 11a3 3 0 1 0 6 0a3 3 0 0 0 -6 0 M17.657 16.657l-4.243 4.243a2 2 0 0 1 -2.827 0l-4.244 -4.243a8 8 0 1 1 11.314 0z",
  wrench: "M7 10h3v-3l-3.5 -3.5a6 6 0 0 1 8 8l6 6a2 2 0 0 1 -3 3l-6 -6a6 6 0 0 1 -8 -8l3.5 3.5",
  pumpkin: "M12 6c-5 0 -8 3 -8 7s3 7 8 7s8 -3 8 -7s-3 -7 -8 -7z M12 6v-3 M9 7c-1.5 2 -1.5 9 0 12 M15 7c1.5 2 1.5 9 0 12",
  lock: "M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2z M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0 M8 11v-4a4 4 0 1 1 8 0v4",
};
const GLYPH_OF = {
  superlicenza: "idcard", casco: "star", griglia: "flag", indovino: "target", oracolo: "clock", radar: "cloud", sondaggista: "bars",
  pitcrew: "watch", pitperfetto: "check", mercato: "trophy", pagellone: "list", paddock: "mic", archivio: "bookmark", radio: "chat",
  sgasata: "flame", zucche: "pumpkin", avvento: "gift", calza: "gift", monza: "pin", boxbox: "box", opinionista: "heart",
  giroperfetto: "bolt", ingegnere: "wrench",
};
function Glyph({ name, won }) {
  return (
    <span aria-hidden="true" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, flex: "none", borderRadius: 12, background: won ? TP.ink : TP.disc }}>
      <svg width="22" height="22" viewBox="0 0 24 24" style={{ display: "block", flex: "none" }} fill="none" stroke={won ? "#000" : TP.muted} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d={G[name] || G.trophy} /></svg>
    </span>
  );
}
function Bar({ ratio, grow = false }) {
  return (
    <div style={{ marginTop: 8, height: 6, borderRadius: 3, background: TP.segOn, overflow: "hidden" }}>
      <div className={grow ? "tp-bar" : ""} style={{ width: `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%`, height: 6, borderRadius: 3, background: TP.ink }} />
    </div>
  );
}

export default function TrofeiPage({ items = [], onBack, now = Date.now() }) {
  const [view, setView] = useState("won");
  const won = items.filter(t => t.won).sort((a, b) => (b.at || 0) - (a.at || 0));
  const todo = items.filter(t => !t.won);
  const next = todo.filter(t => t.ratio != null && t.ratio > 0 && t.ratio < 1).sort((a, b) => b.ratio - a.ratio)[0] || null;
  const n = won.length, medal = medalAt(n), M = medal && MEDAL_TP[medal];
  const nextAt = n < 1 ? 1 : n < 5 ? 5 : n < 10 ? 10 : null, nextM = nextAt && MEDAL_TP[medalAt(nextAt)];
  const miss = nextAt ? nextAt - n : 0;
  const year = new Date(now).getFullYear();
  const day = ms => new Date(ms).toLocaleDateString("it-IT", new Date(ms).getFullYear() === year ? { day: "numeric", month: "long" } : { day: "numeric", month: "long", year: "numeric" });
  const tile = (t, opts = {}) => (
    <div key={t.id} data-trophy={t.id} data-won={t.won ? "1" : "0"} data-tp-next={opts.wide ? "" : undefined}
      style={{ boxSizing: "border-box", padding: 14, minHeight: 112, borderRadius: 18, background: TP.card, border: `1px solid ${t.won ? TP.lineOn : TP.line}`, minWidth: 0, gridColumn: opts.wide ? "span 2" : undefined }}>
      <Glyph name={t.hidden ? "lock" : GLYPH_OF[t.id]} won={t.won} />
      <div style={{ marginTop: 10, fontSize: 15, fontWeight: 800, overflowWrap: "break-word" }}>{t.name}</div>
      <div style={{ marginTop: 2, fontSize: 12, fontWeight: 600, color: TP.muted, lineHeight: 1.35 }}>{t.won ? day(t.at) : t.how}</div>
      {!t.won && t.extra && <div style={{ marginTop: 4, fontSize: 12, fontWeight: 800, color: TP.ink, fontVariantNumeric: "tabular-nums" }}>{t.extra}</div>}
      {!t.won && t.ratio != null && <Bar ratio={t.ratio} />}
    </div>
  );
  const tab = (id, label) => (
    <button key={id} type="button" className="tp-seg-btn" data-tp-view={id} aria-pressed={view === id} onClick={() => setView(id)}
      style={{ flex: "1 1 0", border: 0, background: "transparent", borderRadius: 10, position: "relative", zIndex: 1, fontFamily: TP.font, fontSize: 14, fontWeight: view === id ? 800 : 700, color: view === id ? TP.ink : TP.muted }}>{label}</button>
  );
  return (
    <div data-trophy-page="" style={{ height: "100%", display: "flex", flexDirection: "column", background: TP.bg, color: TP.ink, fontFamily: TP.font }}>
      <div className="scrollcol" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "8px 20px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 2, height: 44, margin: "0 -8px" }}>
          <button type="button" className="tp-back" aria-label="Indietro" onClick={onBack}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, flex: "none", background: "transparent", border: 0, color: TP.ink }}>
            <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6l6 6" /></svg>
          </button>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: -0.3 }}>I miei trofei</h1>
        </div>
        <div data-tp-medal={medal || ""} style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 4, boxSizing: "border-box", padding: 14, borderRadius: 18, background: TP.card, border: `1px solid ${TP.line}` }}>
          <span aria-hidden="true" style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: "none", width: 52, height: 52, borderRadius: "50%", background: M ? M.c : TP.segOn }}>
            <svg width="31" height="31" viewBox="0 0 24 24" style={{ display: "block", flex: "none" }} fill="none" stroke={M ? "#000" : TP.muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d={G.star} /></svg>
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: TP.muted }}>{M ? "Medaglia" : "Nessuna medaglia per ora"}</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{M ? `${M.name}, ` : ""}{n} {n === 1 ? "trofeo" : "trofei"}</div>
            <Bar ratio={nextAt ? n / nextAt : 1} grow />
            <div style={{ marginTop: 4, fontSize: 12, fontWeight: 600, color: TP.muted }}>{nextAt ? `${miss === 1 ? "Ne manca 1" : `Ne mancano ${miss}`} per ${nextM.art}` : "Hai la medaglia più alta"}</div>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <div role="group" aria-label="Quali trofei" style={{ display: "flex", height: 44, padding: 4, boxSizing: "border-box", borderRadius: 14, background: TP.card, border: `1px solid ${TP.line}`, position: "relative" }}>
            <span aria-hidden="true" className="tp-seg-pill" style={{ position: "absolute", top: 4, left: 4, width: "calc(50% - 4px)", height: 34, borderRadius: 10, background: TP.segOn, transform: view === "todo" ? "translateX(100%)" : "none" }} />
            {tab("won", `Vinti ${won.length}`)}
            {tab("todo", `Da vincere ${todo.length}`)}
          </div>
        </div>
        <div data-tp-grid={view} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 8, marginTop: 12 }}>
          {view === "won" && won.map(t => tile(t))}
          {view === "won" && next && tile(next, { wide: true })}
          {view === "won" && !won.length && !next && <p data-tp-empty="" style={{ gridColumn: "span 2", margin: "6px 2px", fontSize: 13, fontWeight: 600, lineHeight: 1.5, color: TP.muted }}>Ancora nessun trofeo: in Da vincere trovi come si vincono.</p>}
          {view === "todo" && todo.map(t => tile(t))}
          {view === "todo" && !todo.length && <p data-tp-empty="" style={{ gridColumn: "span 2", margin: "6px 2px", fontSize: 13, fontWeight: 600, lineHeight: 1.5, color: TP.muted }}>Li hai vinti tutti.</p>}
        </div>
      </div>
    </div>
  );
}
