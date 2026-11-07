// 7/11 sera (Edoardo: "aggiungi questa pagina per il Fanta, solo se si tocca per vedere la classifica completa"):
// classifica completa di una lega, dal design "BT FantaF1 nuovo design" → "4 Lega" (Manrope, fondo nero, grigi
// zinco). In alto nome della lega e quante squadre; interruttore Questo GP / Stagione; podio 2-1-3 coi gradini che
// salgono; poi gli altri, con la freccia di quanto si è mossi e le zone Q1/Q2 con la barretta colorata a sinistra.
// Solo punti veri: Stagione = punti di tutti i GP + bonus (FantaL.standings), Questo GP = punti dell'ultimo GP con i
// risultati (gp; null se per quella squadra non ha contato, e allora "–"). La freccia confronta la posizione in
// stagione prima e dopo l'ultimo GP (punti meno gp contro punti).
import React, { useState } from "react";
import "./ClassificaLega.css";

export const LT = {
  bg: "#000000", ink: "#F4F4F5", muted: "#A1A1AA", seg: "#111113", segLine: "#1E1E22", segOn: "#26262B",
  disc: "#1C1C1F", line: "#2A2A2E", up: "#34D399", down: "#FF6B5E", q2: "#FACC15", q1: "#FF1801",
  font: "'Manrope', system-ui, sans-serif",
};
const STEP = { 1: 92, 2: 62, 3: 46 };       // altezza dei gradini
const DELAY = { 1: 0, 2: 150, 3: 300 };     // salgono uno dopo l'altro (ms)

// Sigle di due lettere diverse per tutti: prima le prime due lettere (o le iniziali di nome e cognome); se la sigla
// c'è già, la prima lettera con la prima consonante dopo (Marco MA, Matteo MT), poi con una lettera qualsiasi.
export function initialsFor(names) {
  const used = new Set(), out = [];
  names.forEach(n => {
    const w = String(n || "").trim().split(/\s+/).filter(Boolean);
    const s = (w.join("") || "?").toUpperCase();
    const tries = [w.length > 1 ? (w[0][0] + w[1][0]).toUpperCase() : s.slice(0, 2)];
    const cons = [...s.slice(1)].find(ch => /[B-DF-HJ-NP-TV-Z]/.test(ch) && s[0] + ch !== tries[0]);
    if (cons) tries.push(s[0] + cons);
    [...s.slice(1)].forEach(ch => tries.push(s[0] + ch));
    const pick = tries.find(t => t.length === 2 && !used.has(t)) || tries[0];
    used.add(pick); out.push(pick);
  });
  return out;
}

// Posizione in stagione prima dell'ultimo GP (punti meno gp) contro quella di adesso: >0 salito, <0 sceso.
export function moves(rows) {
  const by = (list, f) => [...list].sort((a, b) => f(b) - f(a) || String(a.name).localeCompare(String(b.name))).map(r => r.aid);
  const now = by(rows, r => r.pts), before = by(rows, r => r.pts - (r.gp || 0));
  const any = rows.some(r => r.gp != null);
  return Object.fromEntries(rows.map(r => [r.aid, any ? before.indexOf(r.aid) - now.indexOf(r.aid) : 0]));
}

// Righe in ordine per la vista scelta: { ...riga, value, pos } (pos null = in questo GP non ha contato).
export function rankRows(rows, view) {
  if (view !== "gp") return rows.map((r, i) => ({ ...r, value: r.pts, pos: i + 1 }));
  const yes = rows.filter(r => r.gp != null).sort((a, b) => b.gp - a.gp || String(a.name).localeCompare(String(b.name)));
  const no = rows.filter(r => r.gp == null);
  return [...yes.map((r, i) => ({ ...r, value: r.gp, pos: i + 1 })), ...no.map(r => ({ ...r, value: null, pos: null }))];
}

const num = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

function Disc({ tag, size }) {
  return (
    <span aria-hidden="true" style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: "none", width: size, height: size, borderRadius: "50%", boxSizing: "border-box",
      background: LT.disc, border: `1px solid ${LT.line}`, fontSize: size >= 40 ? 14 : 10, fontWeight: 800, color: LT.ink }}>{tag}</span>
  );
}

function Trend({ d }) {
  const up = d > 0, down = d < 0, c = up ? LT.up : down ? LT.down : LT.muted;
  return (
    <span data-lt-move={up ? "up" : down ? "down" : "same"} aria-label={up ? `Salito di ${d}` : down ? `Sceso di ${-d}` : "Stessa posizione"}
      style={{ display: "flex", alignItems: "center", gap: 2, width: 50, flex: "none", fontSize: 12, fontWeight: 800, color: c }}>
      <span className={up ? "lt-up" : down ? "lt-down" : ""} style={{ display: "flex" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block", flex: "none" }} fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d={up ? "M12 5l0 14 M18 11l-6 -6l-6 6" : down ? "M12 5l0 14 M18 13l-6 6l-6 -6" : "M5 12l14 0"} />
        </svg>
      </span>
    </span>
  );
}

function PodiumCol({ r, place, tag }) {
  const first = place === 1;
  return (
    <div data-lt-podium={place} style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end" }}>
      <Disc tag={tag} size={40} />
      <div style={{ marginTop: 6, maxWidth: "100%", fontSize: 13, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.me ? `${r.name} (tu)` : r.name}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: LT.muted, fontVariantNumeric: "tabular-nums" }}>{num(r.value)} pt</div>
      <div className="lt-step" style={{ marginTop: 8, width: "100%", height: STEP[place], boxSizing: "border-box", borderRadius: "12px 12px 0 0", background: first ? LT.disc : LT.seg,
        border: `1px solid ${LT.line}`, borderBottom: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, color: first ? LT.ink : LT.muted, animationDelay: DELAY[place] + "ms" }}>{place}</div>
    </div>
  );
}

export default function ClassificaLega({ name, rows = [], gpName = "", onBack, zoneOf = null }) {
  // Come nel design si parte da "Questo GP", se c'è un GP che ha contato; se no dalla stagione.
  const [view, setView] = useState(() => (rows.some(r => r.gp != null) ? "gp" : "season"));
  const tags = Object.fromEntries(initialsFor(rows.map(r => r.name)).map((t, i) => [rows[i].aid, t]));
  const mv = moves(rows);
  const list = rankRows(rows, view);
  const top = list.filter(r => r.pos != null).slice(0, 3), rest = list.filter(r => !(r.pos != null && r.pos <= 3));
  const order = [top[1], top[0], top[2]].map((r, i) => r && { r, place: [2, 1, 3][i] }).filter(Boolean);
  const n = rows.length;
  const zone = r => (zoneOf && r.pos != null ? zoneOf(r.pos, n) : null);
  const tab = (id, label, aria) => (
    <button key={id} type="button" className="lt-seg-btn" data-lt-view={id} aria-pressed={view === id} aria-label={aria || label} onClick={() => setView(id)}
      style={{ flex: "1 1 0", border: 0, background: "transparent", borderRadius: 10, position: "relative", zIndex: 1, fontFamily: LT.font, fontSize: 14, fontWeight: view === id ? 800 : 700, color: view === id ? LT.ink : LT.muted }}>{label}</button>
  );
  return (
    <div data-league-full="" style={{ height: "100%", display: "flex", flexDirection: "column", background: LT.bg, color: LT.ink, fontFamily: LT.font }}>
      <div className="scrollcol" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "8px 20px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 2, minHeight: 44, margin: "0 0 0 -12px" }}>
          <button type="button" className="lt-back" aria-label="Indietro" onClick={onBack}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: "none", width: 44, height: 44, background: "transparent", border: 0, color: LT.ink }}>
            <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6l6 6" /></svg>
          </button>
          <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
            <h1 style={{ margin: 0, minWidth: 0, overflowWrap: "break-word", fontSize: 24, lineHeight: "32px", fontWeight: 800, letterSpacing: -0.4 }}>{name}</h1>
            <span data-lt-count="" style={{ flex: "none", fontSize: 12, fontWeight: 700, color: LT.muted }}>{n} {n === 1 ? "squadra" : "squadre"}</span>
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <div role="group" aria-label="Quali punti" style={{ display: "flex", height: 44, padding: 4, boxSizing: "border-box", borderRadius: 14, background: LT.seg, border: `1px solid ${LT.segLine}`, position: "relative" }}>
            <span aria-hidden="true" className="lt-seg-pill" style={{ position: "absolute", top: 4, left: 4, width: "calc(50% - 4px)", height: 34, borderRadius: 10, background: LT.segOn, transform: view === "season" ? "translateX(100%)" : "none" }} />
            {tab("gp", "Questo GP", gpName ? `Questo GP: ${gpName}` : "Questo GP")}
            {tab("season", "Stagione")}
          </div>
        </div>
        {order.length > 0 ? (
          <div key={view} data-lt-podium-row="" style={{ display: "flex", alignItems: "flex-end", gap: 8, marginTop: 14, minHeight: 198 }}>
            {order.map(({ r, place }) => <PodiumCol key={r.aid} r={r} place={place} tag={tags[r.aid]} />)}
          </div>
        ) : (
          <p data-lt-empty="" style={{ margin: "18px 2px 14px", fontSize: 13, fontWeight: 600, lineHeight: 1.5, color: LT.muted }}>Nessun GP con i risultati per questa lega: i punti arrivano dopo qualifiche e gara, con la squadra che ognuno aveva al via.</p>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
          {rest.map((r, i) => {
            const z = zone(r), prev = i > 0 ? zone(rest[i - 1]) : null;
            const zc = z === "q1" ? LT.q1 : z === "q2" ? LT.q2 : null;
            return (
              <React.Fragment key={r.aid}>
                {zc && z !== prev && (
                  <div data-lt-zone={z} style={{ display: "flex", alignItems: "center", gap: 8, height: 20, fontSize: 11, fontWeight: 800, letterSpacing: 1, color: zc }}>
                    {z === "q1" ? "ZONA Q1" : "ZONA Q2"}<span aria-hidden="true" style={{ flex: 1, height: 1, background: zc, opacity: .4 }} />
                  </div>
                )}
                <div data-lt-row={r.aid} data-lt-pos={r.pos == null ? "" : r.pos} style={{ display: "flex", alignItems: "center", gap: 10, height: 40, boxSizing: "border-box", borderRadius: 12, overflow: "hidden",
                  background: r.me ? LT.disc : LT.seg, border: `1px solid ${r.me ? LT.ink : LT.segLine}` }}>
                  <span aria-hidden="true" style={{ width: 4, alignSelf: "stretch", flex: "none", background: zc || "transparent" }} />
                  <span style={{ width: 22, flex: "none", fontSize: 14, fontWeight: 800, textAlign: "center", fontVariantNumeric: "tabular-nums", color: r.pos == null ? LT.muted : LT.ink }}>{r.pos == null ? "–" : r.pos}</span>
                  <Disc tag={tags[r.aid]} size={26} />
                  <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.me ? `${r.name} (tu)` : r.name}</span>
                  <Trend d={mv[r.aid] || 0} />
                  <span style={{ width: 40, flex: "none", marginRight: 12, textAlign: "right", fontSize: 14, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: r.value == null ? LT.muted : LT.ink }}>{r.value == null ? "–" : num(r.value)}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
