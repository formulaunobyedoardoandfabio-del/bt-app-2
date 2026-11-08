// 8/11: Muretto dei tifosi nella pagina Race (design "B&T Trophies e pause di gara": SafetyCar, Rossa, Esito).
// Box o fuori sotto Safety Car, giochi della bandiera rossa, e com'è andata a pausa finita. Conti e dati veri in
// src/logic/pit-wall.js; qui solo l'aspetto. Risposta al tocco solo con transform, ferma con "Rimuovi animazioni".
import React from "react";
import { TT } from "./Trophies";
import "./PitWall.css";

const TYRES = [["SOFT", "Soft", "#FF1801"], ["MEDIUM", "Media", "#F2C230"], ["HARD", "Dura", "#F4F2EF"], ["INTERMEDIATE", "Inter", "#3ED66B"], ["WET", "Wet", "#4C8DFF"]];
const TYRE = Object.fromEntries(TYRES.map(([k, l, c]) => [k, { label: l, color: c }]));
const tyreWord = k => (TYRE[k] ? TYRE[k].label.toLowerCase() : "");
const GOOD = "#3ED66B", BAD = "#FF6B5E", RED = "#FF1801";
const card = { background: TT.card, border: `1px solid ${TT.line}`, borderRadius: 18 };
const h = (size, extra) => ({ margin: 0, fontFamily: TT.head, fontWeight: 900, fontStyle: "italic", fontSize: size, lineHeight: 1.05, ...extra });
const pick = (on) => ({ height: 34, minWidth: 52, padding: "0 9px", borderRadius: 9, fontFamily: TT.head, fontWeight: 700, fontSize: 12, letterSpacing: .4, border: on ? `1px solid ${RED}` : "1px solid rgba(255,255,255,.16)", background: on ? RED : "transparent", color: on ? "#FFFFFF" : TT.soft });
const mmss = s => { const v = Math.max(0, Math.floor(s)); return Math.floor(v / 60) + ":" + String(v % 60).padStart(2, "0"); };

// Box o fuori: i primi 8 quando è entrata la Safety Car. Chi ha già fermato non si sceglie più.
export function BoxOrOut({ board, kind = "sc", picks = {}, done = false, onPick, onDone }) {
  if (!board || !board.rows.length) return null;
  const n = board.rows.filter(r => picks[r.number]).length, free = board.rows.filter(r => !r.pitted).length;
  return (
    <section data-boxout={done ? "fatto" : "aperto"} aria-labelledby="pw-boxout" style={{ ...card, margin: "0 16px 12px", padding: "14px 12px 12px" }}>
      <div style={{ padding: "0 4px" }}>
        <h2 id="pw-boxout" style={h(22)}>Box o fuori?</h2>
        <p style={{ margin: "6px 0 0", fontSize: 12.5, lineHeight: 1.45, color: TT.muted }}>Sotto {kind === "vsc" ? "Virtual Safety Car" : "Safety Car"} la sosta costa meno. Tu cosa faresti? Quando rientra vedi chi aveva ragione.</p>
      </div>
      <div style={{ marginTop: 10 }}>
        {board.rows.map(r => (
          <div key={r.number} data-boxout-row={r.code} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 4px", borderTop: "1px solid rgba(255,255,255,.06)" }}>
            <span style={{ width: 20, fontFamily: TT.head, fontWeight: 700, fontSize: 13, color: TT.muted, fontVariantNumeric: "tabular-nums" }}>{r.pos}</span>
            <span aria-hidden="true" style={{ width: 3, height: 18, borderRadius: 2, background: r.color || TT.muted }} />
            <span style={{ width: 40, fontFamily: TT.head, fontWeight: 900, fontSize: 14 }}>{r.code}</span>
            <span style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: TT.muted, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", overflow: "hidden" }}>
              {r.compound && TYRE[r.compound] && <span aria-hidden="true" style={{ width: 13, height: 13, flexShrink: 0, borderRadius: "50%", border: `2.5px solid ${TYRE[r.compound].color}`, boxSizing: "border-box" }} />}
              {r.compound ? `${tyreWord(r.compound)}${r.age != null ? ` · ${r.age} ${r.age === 1 ? "giro" : "giri"}` : ""}` : ""}
            </span>
            {r.pitted ? <span data-boxout-pitted="" style={{ padding: "6px 10px", borderRadius: 9, fontSize: 11.5, fontWeight: 600, color: GOOD, background: "rgba(62,214,107,.1)", border: "1px solid rgba(62,214,107,.35)" }}>Ha fermato</span>
              : (
                <span role="group" aria-label={`Box o fuori per ${r.code}`} style={{ display: "flex", gap: 4 }}>
                  <button type="button" className="pw-btn" disabled={done} aria-pressed={picks[r.number] === "box"} onClick={() => onPick && onPick(r.number, picks[r.number] === "box" ? null : "box")} style={pick(picks[r.number] === "box")}>BOX</button>
                  <button type="button" className="pw-btn" disabled={done} aria-pressed={picks[r.number] === "out"} onClick={() => onPick && onPick(r.number, picks[r.number] === "out" ? null : "out")} style={pick(picks[r.number] === "out")}>FUORI</button>
                </span>
              )}
          </div>
        ))}
      </div>
      {board.gifted.length > 0 && (
        <div data-boxout-gifted={board.gifted.length} style={{ margin: "10px 4px 0", paddingTop: 10, borderTop: `1px solid ${TT.line}` }}>
          <div style={{ fontFamily: TT.head, fontWeight: 700, fontSize: 14 }}>Pit stop regalato</div>
          <div style={{ margin: "2px 0 8px", fontSize: 11.5, color: TT.muted }}>Hanno già fermato sotto {kind === "vsc" ? "Virtual Safety Car" : "Safety Car"}, perdendo meno tempo.</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {board.gifted.map(g => <span key={g.number} style={{ padding: "5px 10px", borderRadius: 999, background: "rgba(62,214,107,.12)", border: "1px solid rgba(62,214,107,.4)", fontSize: 12, fontWeight: 600 }}>{g.code}{g.compound ? ` · gomma ${tyreWord(g.compound)}` : ""}</span>)}
          </div>
        </div>
      )}
      {free > 0 && (
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12, padding: "0 4px" }}>
          <span data-boxout-count={n} style={{ flex: 1, fontSize: 12.5, color: TT.muted, fontVariantNumeric: "tabular-nums" }}>{done ? `Scelte salvate: ${n}. Il risultato arriva quando rientra.` : `${n} di ${free} scelte`}</span>
          {!done && <button type="button" className="pw-btn" data-boxout-done="" disabled={!n} onClick={onDone} style={{ height: 44, padding: "0 22px", borderRadius: 12, border: "none", background: RED, color: "#FFFFFF", fontFamily: TT.head, fontWeight: 700, fontSize: 14 }}>Fatto</button>}
        </div>
      )}
    </section>
  );
}

// Bandiera rossa: cosa è successo + Rivedi, quanto dura, gomma della ripartenza, stanza della chat.
export function RedPlay({ info, driverCode, guess = {}, locked = false, onGuess, onReplay, onPlay, onChat, lastMsg }) {
  if (!info) return null;
  const mins = guess.mins || 25;
  const set = patch => onGuess && onGuess({ ...guess, mins, ...patch });
  const clamp = v => Math.max(5, Math.min(90, v));
  return (
    <div data-red-play={locked ? "fatto" : "aperto"} style={{ margin: "0 16px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
      <section aria-label="Cosa è successo" style={{ ...card, padding: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
          <h2 style={h(19)}>Cosa è successo</h2>
          <span data-red-since="" style={{ fontFamily: TT.head, fontWeight: 700, fontSize: 13, color: TT.muted, fontVariantNumeric: "tabular-nums" }}>ferma da {mmss(info.since)}</span>
        </div>
        <p data-red-what="" style={{ margin: "4px 0 10px", fontSize: 12, color: TT.muted }}>{info.what || "La direzione gara non ha ancora scritto il motivo."}</p>
        {onReplay && (
          <button type="button" className="pw-btn" data-red-replay="" onClick={() => onReplay(info.replayFrom)} style={{ height: 40, padding: "0 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,.18)", background: "transparent", color: TT.text, fontFamily: TT.head, fontWeight: 700, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1.5v11l9.5-5.5z" fill={TT.text} /></svg>Rivedi gli ultimi 60 s
          </button>
        )}
      </section>
      <section aria-labelledby="pw-quanto" style={{ ...card, padding: "12px 14px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
          <h2 id="pw-quanto" style={h(19)}>Quanto dura la rossa?</h2>
          <span style={{ fontSize: 11, color: TT.muted }}>da quando è ferma</span>
        </div>
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 12 }}>
          <button type="button" className="pw-btn" aria-label="Un minuto in meno" disabled={locked} onClick={() => set({ mins: clamp(mins - 1) })} style={{ width: 44, height: 44, borderRadius: "50%", border: "1px solid rgba(255,255,255,.18)", background: "transparent", color: TT.text, fontSize: 22, lineHeight: 1, padding: 0 }}>−</button>
          <div style={{ flex: 1, textAlign: "center" }}>
            <span data-red-mins={mins} style={{ fontFamily: TT.head, fontWeight: 900, fontSize: 40, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{mins}</span>
            <span style={{ fontFamily: TT.head, fontWeight: 700, fontSize: 15, color: TT.muted }}> min</span>
          </div>
          <button type="button" className="pw-btn" aria-label="Un minuto in più" disabled={locked} onClick={() => set({ mins: clamp(mins + 1) })} style={{ width: 44, height: 44, borderRadius: "50%", border: "1px solid rgba(255,255,255,.18)", background: "transparent", color: TT.text, fontSize: 22, lineHeight: 1, padding: 0 }}>+</button>
        </div>
        <input type="range" className="pw-range" aria-label="Minuti di sosta" min="5" max="90" value={mins} disabled={locked} onChange={e => set({ mins: clamp(Number(e.target.value) || 25) })} style={{ width: "100%", margin: "8px 0 2px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: TT.dim }}><span>5 min</span><span>90 min</span></div>
      </section>
      {driverCode && (
        <section aria-labelledby="pw-gomme" style={{ ...card, padding: "12px 14px" }}>
          <h2 id="pw-gomme" style={h(19)}>Con che gomma riparte {driverCode}?</h2>
          <p style={{ margin: "3px 0 10px", fontSize: 11.5, color: TT.muted }}>Durante la rossa le squadre possono cambiarle. Lo dicono i dati alla ripartenza.</p>
          <div role="group" aria-label="Gomma della ripartenza" style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 6 }}>
            {TYRES.map(([k, l, c]) => (
              <button key={k} type="button" className="pw-btn" data-red-tyre={k} disabled={locked} aria-pressed={guess.tyre === k} onClick={() => set({ tyre: k })} style={{ height: 62, borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, fontFamily: TT.body, color: TT.text, padding: 0, border: guess.tyre === k ? `2px solid ${RED}` : "1px solid rgba(255,255,255,.14)", background: guess.tyre === k ? "rgba(255,24,1,.12)" : "transparent" }}>
                <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: "50%", border: `4px solid ${c}`, boxSizing: "border-box" }} />
                <span style={{ fontSize: 11, fontWeight: 600 }}>{l}</span>
              </button>
            ))}
          </div>
        </section>
      )}
      {onChat && (
        <button type="button" className="pw-btn" data-red-chat="" onClick={onChat} style={{ ...card, borderRadius: 16, padding: "11px 14px", display: "flex", alignItems: "center", gap: 12, color: TT.text, textAlign: "left" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={TT.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z" /></svg>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontFamily: TT.head, fontWeight: 700, fontSize: 14 }}>Parlane in chat</span>
            {lastMsg && <span style={{ display: "block", fontSize: 11.5, color: TT.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Direzione gara: {lastMsg}</span>}
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TT.muted} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
        </button>
      )}
      {locked ? <div data-red-locked="" style={{ textAlign: "center", fontSize: 12.5, color: TT.muted }}>Giocata: {mins} min{guess.tyre ? ` · ${TYRE[guess.tyre].label}` : ""}. Il risultato arriva alla ripartenza.</div>
        : <button type="button" className="pw-btn" data-red-go="" onClick={onPlay} style={{ height: 48, borderRadius: 12, border: "none", background: RED, color: "#FFFFFF", fontFamily: TT.head, fontWeight: 700, fontSize: 15 }}>Gioca: {mins} min{guess.tyre && TYRE[guess.tyre] ? ` · ${TYRE[guess.tyre].label}` : ""}</button>}
    </div>
  );
}

const Ring = ({ right, total }) => {
  const c = 2 * Math.PI * 19, f = total ? right / total : 0;
  return (
    <svg width="92" height="92" viewBox="0 0 48 48" role="img" aria-label={`${right} scelte giuste su ${total}`} style={{ flexShrink: 0 }}>
      <circle cx="24" cy="24" r="19" fill="none" stroke="#2A2A30" strokeWidth="5" />
      <circle cx="24" cy="24" r="19" fill="none" stroke={RED} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(c * f).toFixed(1)} ${c.toFixed(1)}`} transform="rotate(-90 24 24)" />
      <text x="24" y="27" textAnchor="middle" fill={TT.text} fontFamily="Titillium Web, sans-serif" fontWeight="900" fontSize="12">{right}/{total}</text>
    </svg>
  );
};

const headOf = (box, red) => box && box.total ? `${box.right} ${box.right === 1 ? "scelta giusta" : "scelte giuste"} su ${box.total}` : red && red.diff != null ? (red.diff === 0 ? "Durata indovinata al minuto" : `Sbagliato di ${red.diff} min`) : "Com'è andata";

// Carta nella pagina Race a pausa finita: tocca per vedere com'è andata.
export function PitWallCard({ label, box, red, onOpen }) {
  if (!(box && box.total) && !red) return null;
  return (
    <button type="button" className="pw-btn" data-pitwall-card="" onClick={onOpen} style={{ ...card, margin: "0 16px 12px", width: "calc(100% - 32px)", padding: 12, display: "flex", alignItems: "center", gap: 12, color: TT.text, textAlign: "left" }}>
      {box && box.total ? <Ring right={box.right} total={box.total} /> : null}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: TT.muted }}>Muretto dei tifosi · {label}</span>
        <span style={{ display: "block", marginTop: 3, ...h(20) }}>{headOf(box, red)}</span>
        <span style={{ display: "block", marginTop: 4, fontSize: 12, color: TT.muted }}>Tocca per vedere com'è andata</span>
      </span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TT.muted} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
    </button>
  );
}

// Pagina "com'è andata": le tue scelte contro quelle delle squadre, durata della rossa, gomma della ripartenza.
export default function PitWallResult({ label, box, red, onBack, onShare }) {
  const ok = "M5 12.5l4.5 4.5L19 7.5", no = "M6 6l12 12M18 6L6 18";
  const word = v => (v === "box" ? "Box" : "Fuori");
  return (
    <div data-pitwall-page="" className="scrollcol" style={{ height: "100%", overflowY: "auto", background: TT.bg, color: TT.text, fontFamily: TT.body, padding: "4px 16px 24px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ height: 56, flexShrink: 0, display: "flex", alignItems: "center", gap: 12 }}>
        <button type="button" className="pw-btn" aria-label="Indietro" onClick={onBack} style={{ width: 40, height: 40, borderRadius: "50%", background: TT.card, border: `1px solid ${TT.line}`, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={TT.text} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <h1 style={{ margin: 0, flex: 1, fontFamily: TT.head, fontWeight: 700, fontSize: 15 }}>Muretto dei tifosi</h1>
      </div>
      <section style={{ ...card, borderRadius: 20, padding: 16, display: "flex", gap: 16, alignItems: "center" }}>
        {box && box.total ? <Ring right={box.right} total={box.total} /> : null}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: TT.muted }}>{label}</div>
          <div data-pitwall-head="" style={{ marginTop: 4, ...h(22) }}>{headOf(box, red)}</div>
        </div>
      </section>
      {box && box.total > 0 && (
        <section aria-label="Le tue scelte" style={{ ...card, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "50px minmax(0, 1fr) minmax(0, 1fr) 88px", gap: 6, padding: "10px 14px 6px", fontSize: 10.5, fontWeight: 700, color: TT.dim }}>
            <span>Pilota</span><span>Tu</span><span>Squadra</span><span style={{ textAlign: "right" }}>Esito</span>
          </div>
          {box.rows.map(r => (
            <div key={r.number} data-pitwall-row={r.code} data-good={r.good ? "1" : "0"} style={{ display: "grid", gridTemplateColumns: "50px minmax(0, 1fr) minmax(0, 1fr) 88px", gap: 6, alignItems: "center", padding: "8px 14px", borderTop: "1px solid rgba(255,255,255,.06)" }}>
              <span style={{ fontFamily: TT.head, fontWeight: 900, fontSize: 14 }}>{r.code}</span>
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>{word(r.you)}</span>
              <span style={{ fontSize: 12.5, color: TT.soft }}>{word(r.team)}</span>
              <span style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 5, fontSize: 12, fontWeight: 600, color: r.good ? GOOD : BAD }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={r.good ? GOOD : BAD} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={r.good ? ok : no} /></svg>{r.good ? "giusto" : "sbagliato"}
              </span>
            </div>
          ))}
        </section>
      )}
      {red && (
        <section style={{ display: "grid", gridTemplateColumns: red.tyre && red.tyre.guess ? "repeat(2, minmax(0, 1fr))" : "minmax(0, 1fr)", gap: 10 }}>
          <div data-pitwall-red-mins={red.mins} style={{ ...card, borderRadius: 16, padding: 12 }}>
            <div style={{ fontSize: 11, color: TT.muted }}>Quanto è durata la rossa</div>
            <div style={{ marginTop: 4, fontFamily: TT.head, fontWeight: 900, fontSize: 22, fontVariantNumeric: "tabular-nums" }}>{red.mins} min</div>
            {red.guess != null && <div style={{ fontSize: 11.5, color: TT.soft }}>tu {red.guess} · {red.diff === 0 ? "preciso" : `${red.diff} di differenza`}</div>}
          </div>
          {red.tyre && red.tyre.guess && (
            <div data-pitwall-red-tyre={red.tyre.actual || "attesa"} style={{ ...card, borderRadius: 16, padding: 12 }}>
              <div style={{ fontSize: 11, color: TT.muted }}>Gomma di {red.tyre.code}</div>
              {red.tyre.actual && TYRE[red.tyre.actual] ? (
                <>
                  <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 7 }}>
                    <span aria-hidden="true" style={{ width: 18, height: 18, borderRadius: "50%", border: `4px solid ${TYRE[red.tyre.actual].color}`, boxSizing: "border-box" }} />
                    <span style={{ fontFamily: TT.head, fontWeight: 900, fontSize: 22 }}>{TYRE[red.tyre.actual].label}</span>
                  </div>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: red.tyre.ok ? GOOD : BAD }}>{red.tyre.ok ? "indovinata" : `tu ${TYRE[red.tyre.guess] ? TYRE[red.tyre.guess].label : ""}`}</div>
                </>
              ) : <div style={{ marginTop: 6, fontSize: 12, color: TT.muted }}>Si vede al primo giro dopo la ripartenza.</div>}
            </div>
          )}
        </section>
      )}
      {onShare && <button type="button" className="pw-btn" data-pitwall-share="" onClick={onShare} style={{ marginTop: "auto", height: 48, flexShrink: 0, borderRadius: 12, border: "none", background: RED, color: "#FFFFFF", fontFamily: TT.head, fontWeight: 700, fontSize: 15 }}>Manda il risultato in chat</button>}
    </div>
  );
}
