// 7/11 sera (Edoardo: "aggiungi questa pagina per il Fanta, solo se si tocca per vedere la classifica completa"):
// classifica completa di una lega, dal design "Amici del paddock" (Manrope, fondo nero, grigi zinco). In alto nome
// della lega e quante squadre; interruttore Questo GP / Stagione; podio 2-1-3 coi gradini; poi tutti gli altri.
// Solo punti veri: Stagione = punti di tutti i GP + bonus (FantaL.standings), Questo GP = punti dell'ultimo GP con i
// risultati (gp; null se per quella squadra non ha contato, e allora "–"). Il file del design arrivato era tagliato
// dopo l'inizio del podio: lista e gradini 1 e 3 seguono lo stesso stile.
import React, { useState } from "react";
import "./ClassificaLega.css";

export const LT = {
  bg: "#000000", ink: "#F4F4F5", muted: "#A1A1AA", seg: "#111113", segLine: "#1E1E22", segOn: "#26262B",
  disc: "#1C1C1F", line: "#2A2A2E", gold: "#E7B34C", silver: "#A1A1AA", bronze: "#C8875A",
  font: "'Manrope', system-ui, sans-serif",
};
const MEDAL = [LT.gold, LT.silver, LT.bronze];
const STEP = [92, 62, 44];   // altezza dei gradini: 1°, 2°, 3°

export const initialsOf = name => {
  const w = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!w.length) return "?";
  return (w.length > 1 ? w[0][0] + w[1][0] : w[0].slice(0, 2)).toUpperCase();
};
const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " pt";

// Righe in ordine per la vista scelta: { ...riga, value, pos } (pos null = in questo GP non ha contato).
export function rankRows(rows, view) {
  if (view !== "gp") return rows.map((r, i) => ({ ...r, value: r.pts, pos: i + 1 }));
  const yes = rows.filter(r => r.gp != null).sort((a, b) => b.gp - a.gp || String(a.name).localeCompare(String(b.name)));
  const no = rows.filter(r => r.gp == null);
  return [...yes.map((r, i) => ({ ...r, value: r.gp, pos: i + 1 })), ...no.map(r => ({ ...r, value: null, pos: null }))];
}

function Disc({ name, size = 40, me, accent }) {
  return (
    <span aria-hidden="true" style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box",
      background: LT.disc, border: `1px solid ${me ? accent : LT.line}`, fontWeight: 800, fontSize: Math.round(size * 0.35), color: LT.ink }}>{initialsOf(name)}</span>
  );
}

function PodiumCol({ r, place, accent }) {
  const c = MEDAL[place - 1];
  return (
    <div data-lt-podium={place} style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end" }}>
      <Disc name={r.name} me={r.me} accent={accent} />
      <div style={{ marginTop: 6, maxWidth: "100%", fontWeight: 800, fontSize: 13, color: LT.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.me ? "Tu" : r.name}</div>
      <div style={{ fontWeight: 700, fontSize: 12, color: LT.muted }}>{fmt(r.value)}</div>
      <div style={{ marginTop: 8, width: "100%", height: STEP[place - 1], boxSizing: "border-box", borderRadius: "12px 12px 0 0", background: LT.seg, border: `1px solid ${LT.line}`, borderTop: `2px solid ${c}`,
        display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 28, color: c }}>{place}</div>
    </div>
  );
}

export default function ClassificaLega({ name, rows = [], gpName = "", onBack, accent = "#FF1801", zoneOf = null, zones = {} }) {
  // Come nel design si parte da "Questo GP", se c'è un GP che ha contato; se no dalla stagione.
  const [view, setView] = useState(() => (rows.some(r => r.gp != null) ? "gp" : "season"));
  const list = rankRows(rows, view);
  const counted = list.filter(r => r.pos != null);
  const top = counted.slice(0, 3), rest = list.filter(r => !(r.pos != null && r.pos <= 3));
  const order = [top[1], top[0], top[2]].map((r, i) => r && { r, place: [2, 1, 3][i] }).filter(Boolean);
  const n = rows.length;
  const tab = (id, label) => (
    <button key={id} type="button" className="lt-seg-btn" data-lt-view={id} aria-pressed={view === id} onClick={() => setView(id)}
      style={{ flex: "1 1 0", height: 34, border: 0, background: "transparent", borderRadius: 10, position: "relative", zIndex: 1, fontFamily: LT.font, fontSize: 14, fontWeight: view === id ? 800 : 700, color: view === id ? LT.ink : LT.muted }}>{label}</button>
  );
  const note = view === "gp"
    ? (gpName ? (/^GP\b/.test(gpName) ? `Punti del ${gpName}` : `Punti: ${gpName}`) : "Punti dell'ultimo GP con i risultati")
    : "Punti di tutti i GP e bonus dei pronostici";
  return (
    <div data-league-full="" style={{ height: "100%", display: "flex", flexDirection: "column", background: LT.bg, color: LT.ink, fontFamily: LT.font }}>
      <div className="scrollcol" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "8px 20px 28px" }}>
        <button type="button" className="press lt-back" aria-label="Indietro" onClick={onBack}
          style={{ width: 36, height: 36, borderRadius: 12, background: LT.seg, border: `1px solid ${LT.segLine}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={LT.ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <h1 style={{ margin: 0, minWidth: 0, overflowWrap: "break-word", fontSize: 24, fontWeight: 800, letterSpacing: -0.4, lineHeight: 1.2, color: LT.ink }}>{name}</h1>
          <span data-lt-count="" style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, color: LT.muted }}>{n} {n === 1 ? "squadra" : "squadre"}</span>
        </div>
        <div role="group" aria-label="Quali punti" style={{ marginTop: 10, height: 44, boxSizing: "border-box", padding: 4, borderRadius: 14, background: LT.seg, border: `1px solid ${LT.segLine}`, display: "flex", position: "relative" }}>
          <span aria-hidden="true" className="lt-seg-pill" style={{ position: "absolute", top: 4, left: 4, width: "calc(50% - 4px)", height: 34, borderRadius: 10, background: LT.segOn, transform: view === "season" ? "translateX(100%)" : "none" }} />
          {tab("gp", "Questo GP")}
          {tab("season", "Stagione")}
        </div>
        <p data-lt-note="" style={{ margin: "10px 2px 0", fontSize: 12, fontWeight: 600, color: LT.muted }}>{note}</p>
        {order.length > 0 ? (
          <div data-lt-podium-row="" style={{ marginTop: 14, display: "flex", gap: 8, alignItems: "flex-end" }}>
            {order.map(({ r, place }) => <PodiumCol key={r.aid} r={r} place={place} accent={accent} />)}
          </div>
        ) : (
          <p data-lt-empty="" style={{ margin: "18px 2px 0", fontSize: 13, lineHeight: 1.5, color: LT.muted }}>Nessun GP con i risultati per questa lega: i punti arrivano dopo qualifiche e gara, con la squadra che ognuno aveva al via.</p>
        )}
        <div style={{ marginTop: order.length ? 14 : 10 }}>
          {rest.map((r, i) => {
            const z = view === "season" && zoneOf ? zoneOf(r.pos, n) : null, Z = z && zones[z];
            const prev = i > 0 ? rest[i - 1] : null, first = Z && (!prev || zoneOf(prev.pos, n) !== z);
            return (
              <React.Fragment key={r.aid}>
                {first && <div data-lt-zone={z} style={{ margin: "10px 4px 6px", fontWeight: 800, fontSize: 10.5, letterSpacing: 1, color: Z.ink }}>{Z.label}</div>}
                <div data-lt-row={r.aid} data-lt-pos={r.pos == null ? "" : r.pos} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", marginBottom: 8, borderRadius: 14,
                  background: Z ? Z.bg : LT.seg, border: `1px solid ${r.me ? accent : Z ? Z.line : LT.segLine}` }}>
                  <span style={{ width: 22, flexShrink: 0, textAlign: "center", fontWeight: 800, fontSize: 14, color: Z ? Z.ink : LT.muted }}>{r.pos == null ? "–" : r.pos}</span>
                  <Disc name={r.name} size={32} me={r.me} accent={accent} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ minWidth: 0, fontWeight: 700, fontSize: 14, color: LT.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</span>
                      {r.me && <span style={{ flexShrink: 0, padding: "1px 6px", borderRadius: 5, background: accent, fontWeight: 800, fontSize: 9.5, color: "#fff" }}>TU</span>}
                    </span>
                    <span style={{ display: "block", fontSize: 11, fontWeight: 600, color: LT.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.team || "Squadra senza nome"}</span>
                  </span>
                  <span style={{ flexShrink: 0, fontWeight: 800, fontSize: 14, color: r.value == null ? LT.muted : LT.ink }}>{r.value == null ? "–" : fmt(r.value)}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
