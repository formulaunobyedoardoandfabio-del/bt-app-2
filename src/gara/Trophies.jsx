// 8/11 (Edoardo: "aggiungi un bottone o trova un modo per mettere i B&T Trophies nell'app"): dal design approvato
// "B&T Trophies e pause di gara" (schermate Trophies del GP e Trofeo). In RACE, a sessione finita, una scheda col
// trofeo della gara e il bottone per vederli tutti; la pagina coi trofei; il dettaglio di ognuno con i numeri, il
// grafico e "Come si vince". Tutto dai dati veri (src/logic/gp-trophies.js): qui solo il disegno.
// Firma del design: i trofei sono medaglioni a forma di fianco di gomma, col colore della mescola per famiglia
// (soft attacco, medium ritmo, hard difesa e resistenza, intermedia squadra, wet pioggia, grigio i premi ironici).
import React, { useState } from "react";
import "./Trophies.css";

export const TT = {
  bg: "#000000", card: "#18181C", line: "rgba(255,255,255,.08)", text: "#F4F2EF", soft: "#C9C8CC", muted: "#9C9CA1", dim: "#86858C",
  gold: "#E7B34C", head: "'Titillium Web', sans-serif", body: "'Work Sans', sans-serif",
};
export const FAMILY = {
  soft: { c: "#FF1801", tint: "rgba(255,24,1,.08)", edge: "rgba(255,24,1,.3)", label: "mescola soft" },
  medium: { c: "#F2C230", tint: "rgba(242,194,48,.08)", edge: "rgba(242,194,48,.3)", label: "mescola media" },
  hard: { c: "#F4F2EF", tint: "rgba(244,242,239,.06)", edge: "rgba(244,242,239,.24)", label: "mescola dura" },
  inter: { c: "#3ED66B", tint: "rgba(62,214,107,.08)", edge: "rgba(62,214,107,.3)", label: "gomma intermedia" },
  wet: { c: "#4C8DFF", tint: "rgba(76,141,255,.08)", edge: "rgba(76,141,255,.28)", label: "gomma da bagnato" },
  irony: { c: "#9C9CA1", tint: "rgba(156,156,161,.07)", edge: "rgba(156,156,161,.26)", label: "premio ironico", dash: "3 2" },
};
const TYRE_C = { SOFT: "#FF1801", MEDIUM: "#F2C230", HARD: "#F4F2EF", INTERMEDIATE: "#3ED66B", WET: "#4C8DFF" };
// Disegni dentro il medaglione (24×24).
const ICON = {
  shield: "M12 3l7.5 3.2v5.4c0 4.9-3.2 8.8-7.5 10.7-4.3-1.9-7.5-5.8-7.5-10.7v-5.4z M8.6 12.4l2.4 2.4 4.4-4.6",
  drop: "M12 3c3.5 4.6 6 8 6 11a6 6 0 0 1-12 0c0-3 2.5-6.4 6-11z",
  rise: "M4 18l5-6 4 3 7-9 M15 6h5v5",
  lights: "M4 9a2 2 0 1 0 4 0a2 2 0 1 0-4 0M10 9a2 2 0 1 0 4 0a2 2 0 1 0-4 0M16 9a2 2 0 1 0 4 0a2 2 0 1 0-4 0M5 16h14",
  bolt: "M13 3v7h6l-8 11v-7h-6l8-11",
  target: "M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0 M12 12m-5 0a5 5 0 1 0 10 0a5 5 0 1 0-10 0 M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0",
  metro: "M9 3h6l3 18H6zM12 17l4-9",
  tyre: "M12 12m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0 M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0",
  wrench: "M14.5 4.5a4 4 0 0 0-5 5L4 15l3 3 5.5-5.5a4 4 0 0 0 5-5L15 10l-2-.5-.5-2z",
  speed: "M4 17a8 8 0 1 1 16 0M12 17l4-5",
  grid: "M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h6v6h-6z",
  stopwatch: "M12 13m-7 0a7 7 0 1 0 14 0a7 7 0 1 0-14 0 M12 10v3l2 2 M10 3h4 M12 3v3",
  kerb: "M3 18l4-12h4L7 18zM11 18l4-12h4l-4 12z",
  alone: "M12 8m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M6 20v-1a6 6 0 0 1 12 0v1",
};

export function TrophyMedal({ item, size = 42, label }) {
  const F = FAMILY[item.family] || FAMILY.hard;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : "true"} style={{ flexShrink: 0 }}>
      <circle cx="24" cy="24" r="23" fill="#0E0E11" />
      <circle cx="24" cy="24" r="22.4" fill="none" stroke="#3A3A42" strokeWidth="1.2" strokeDasharray="1.3 1.9" />
      <circle cx="24" cy="24" r="19" fill="none" stroke={F.c} strokeWidth="2.6" strokeDasharray={F.dash || "none"} />
      <circle cx="24" cy="24" r="15.6" fill="#141418" />
      <g transform="translate(14 14) scale(.84)"><path d={ICON[item.icon] || ICON.stopwatch} fill="none" stroke={F.c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></g>
    </svg>
  );
}

const Who = ({ item, size = 15 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
    <span aria-hidden="true" style={{ width: 4, height: 18, borderRadius: 2, background: item.color || TT.muted, flexShrink: 0 }} />
    <span style={{ fontFamily: TT.body, fontSize: size, fontWeight: 600, color: TT.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.who}</span>
  </div>
);

function Bars({ chart }) {
  const bars = chart.bars || [];
  return (
    <div>
      <div role="img" aria-label={`Distacco giro per giro dal giro ${chart.from} al ${chart.to}: barre chiare sotto 0,5 secondi`} style={{ height: 34, display: "flex", alignItems: "flex-end", gap: 3 }}>
        {bars.map(b => <span key={b.lap} data-tr-bar={b.on ? "on" : "off"} style={{ flex: 1, borderRadius: 2, height: b.g == null ? 4 : Math.round(8 + (2.4 - Math.min(2.4, b.g)) * 11), background: b.on ? TT.text : "#3A3A42" }} />)}
      </div>
      <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", fontFamily: TT.body, fontSize: 10.5, color: TT.dim, fontVariantNumeric: "tabular-nums" }}>
        <span>Giro {chart.from}</span><span style={{ color: TT.text, fontWeight: 600 }}>{chart.label}</span><span>Giro {chart.to}</span>
      </div>
    </div>
  );
}

function PosChart({ chart, color, family }) {
  const F = FAMILY[family] || FAMILY.wet;
  const laps = chart.laps || [], pos = chart.pos || [];
  if (laps.length < 2) return null;
  const a = laps[0], b = laps[laps.length - 1], maxP = Math.max(4, ...pos) + 1;
  const X = l => 28 + (l - a) * (302 / Math.max(1, b - a)), Y = p => 10 + (p - 1) * (124 / (maxP - 1));
  const line = laps.map((l, i) => (i ? "L" : "M") + X(l).toFixed(1) + " " + Y(pos[i]).toFixed(1)).join(" ");
  const marks = [1, Math.round(maxP / 3), Math.round((2 * maxP) / 3), maxP - 1].filter((v, i, s) => v >= 1 && s.indexOf(v) === i);
  const bx = Math.max(28, X(Math.max(a, chart.band[0]))), bw = Math.max(4, X(Math.min(b, chart.band[1])) - bx);
  return (
    <svg width="100%" viewBox="0 0 334 156" role="img" aria-label={`Posizione giro per giro dal giro ${a} al ${b}, ${chart.label} dal giro ${chart.band[0]} al ${chart.band[1]}`} style={{ display: "block" }}>
      <rect x={bx} y="6" width={bw} height="128" rx="4" fill={F.tint.replace(/[\d.]+\)$/, ".18)")} />
      {marks.map(p => (
        <g key={p}>
          <line x1="28" x2="330" y1={Y(p)} y2={Y(p)} stroke="rgba(255,255,255,.07)" strokeWidth="1" />
          <text x="0" y={Y(p) + 3.5} fill={TT.dim} fontSize="10" fontFamily="Work Sans, sans-serif">{p}°</text>
        </g>
      ))}
      <path d={line} fill="none" stroke={TT.text} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={X(b)} cy={Y(pos[pos.length - 1])} r="4" fill={color || TT.text} stroke="#000" strokeWidth="2" />
      <text x="28" y="152" fill={TT.dim} fontSize="10" fontFamily="Work Sans, sans-serif">Giro {a}</text>
      <text x="330" y="152" fill={TT.dim} fontSize="10" fontFamily="Work Sans, sans-serif" textAnchor="end">Giro {b}</text>
    </svg>
  );
}

function Actions({ item, onReplay, onShare, accent }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: onShare ? "minmax(0, 1fr) minmax(0, 1fr)" : "minmax(0, 1fr)", gap: 10 }}>
      {onReplay && <button type="button" className="tr-btn" data-tr-replay={item.id} onClick={() => onReplay(item)} style={{ height: 46, borderRadius: 12, border: "1px solid rgba(255,255,255,.18)", background: "transparent", color: TT.text, fontFamily: TT.head, fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={TT.text} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12a8 8 0 1 0 3-6.2" /><path d="M4 4v5h5" /></svg>
        Rivedi sulla mappa
      </button>}
      {onShare && <button type="button" className="tr-btn" data-tr-share={item.id} onClick={() => onShare(item)} style={{ height: 46, borderRadius: 12, border: 0, background: accent, color: "#FFFFFF", fontFamily: TT.head, fontWeight: 700, fontSize: 14 }}>Manda in chat</button>}
    </div>
  );
}

const Header = ({ title, onBack }) => (
  <div style={{ height: 56, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
    <button type="button" className="tr-btn" aria-label="Indietro" onClick={onBack} style={{ width: 40, height: 40, borderRadius: "50%", background: TT.card, border: `1px solid ${TT.line}`, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={TT.text} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
    </button>
    <span style={{ flex: 1, minWidth: 0, fontFamily: TT.head, fontWeight: 700, fontSize: 15, color: TT.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
  </div>
);

// Scheda in RACE a sessione finita: il trofeo della gara e il bottone per vederli tutti.
// 8/11 (Edoardo: "metti la possibilità di togliere i B&T Trophies"): X in alto a destra (onHide); si riaccendono da
// Profilo → Personalizza l'app.
export function TrophiesCard({ data, onOpen, onHide = null }) {
  const h = data && data.headline;
  if (!h) return null;
  return (
    <div data-tr-wrap="" style={{ position: "relative", margin: "0 16px 14px" }}>
      <button type="button" className="tr-btn tr-card" data-tr-card="" onClick={onOpen}
        style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", margin: 0, padding: onHide ? "12px 44px 12px 12px" : 12, boxSizing: "border-box", borderRadius: 18, background: TT.card, border: `1px solid ${TT.line}`, textAlign: "left" }}>
        <TrophyMedal item={h} size={56} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontFamily: TT.body, fontWeight: 700, fontSize: 10.5, letterSpacing: 1, color: TT.gold }}>B&amp;T TROPHIES</span>
          <span style={{ display: "block", marginTop: 2, fontFamily: TT.head, fontWeight: 900, fontStyle: "italic", fontSize: 17, lineHeight: 1.1, color: TT.text }}>{h.name}</span>
          <span style={{ display: "block", marginTop: 2, fontFamily: TT.body, fontSize: 12, color: TT.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.who} · {h.stat}</span>
        </span>
        <span style={{ flexShrink: 0, fontFamily: TT.head, fontWeight: 700, fontSize: 12.5, color: TT.text }}>{data.all.length > 1 ? `Tutti i ${data.all.length}` : "Apri"}</span>
      </button>
      {onHide && (
        <button type="button" className="tr-btn" data-tr-hide="" aria-label="Nascondi i B&T Trophies" onClick={onHide}
          style={{ position: "absolute", top: 0, right: 0, width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={TT.muted} strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      )}
    </div>
  );
}

function Detail({ item, gpName, onBack, onReplay, onShare, accent }) {
  const F = FAMILY[item.family] || FAMILY.hard;
  return (
    <div data-tr-detail={item.id} className="scrollcol" style={{ height: "100%", overflowY: "auto", background: TT.bg, color: TT.text, fontFamily: TT.body, padding: "4px 16px 18px", boxSizing: "border-box" }}>
      <Header title={`B&T Trophies${gpName ? " · " + gpName : ""}`} onBack={onBack} />
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 6 }}>
        <TrophyMedal item={item} size={104} label={`Medaglione ${item.name}, ${F.label}`} />
        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: 0, fontFamily: TT.head, fontWeight: 900, fontStyle: "italic", fontSize: 28, lineHeight: 1.02, overflowWrap: "break-word" }}>{item.name}</h1>
          <div style={{ marginTop: 10 }}><Who item={item} /></div>
          {item.note && <div style={{ marginTop: 4, fontSize: 12.5, color: TT.muted }}>{item.note}</div>}
        </div>
      </div>
      <p style={{ margin: "14px 0 0", fontSize: 13.5, lineHeight: 1.5, color: TT.soft }}>{item.text}</p>
      {item.tiles && item.tiles.length > 0 && (
        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: `repeat(${item.tiles.length}, minmax(0, 1fr))`, gap: 8 }}>
          {item.tiles.map((t, i) => (
            <div key={i} data-tr-tile="" style={{ background: TT.card, border: `1px solid ${TT.line}`, borderRadius: 14, padding: "10px 12px", minWidth: 0 }}>
              {t.tyre ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6, height: 24 }}>
                  <span aria-hidden="true" style={{ width: 18, height: 18, borderRadius: "50%", border: `3px solid ${TYRE_C[t.tyre] || TT.muted}`, boxSizing: "border-box", flexShrink: 0 }} />
                  <span style={{ fontFamily: TT.head, fontWeight: 700, fontSize: 14 }}>{t.big}</span>
                </div>
              ) : <div style={{ fontFamily: TT.head, fontWeight: 900, fontSize: 24, lineHeight: 1, fontVariantNumeric: "tabular-nums", overflowWrap: "break-word" }}>{t.big}</div>}
              <div style={{ marginTop: 4, fontSize: 11, color: TT.muted }}>{t.small}</div>
            </div>
          ))}
        </div>
      )}
      {item.chart && item.chart.kind === "pos" && (
        <section aria-label="Posizione giro per giro" style={{ marginTop: 14, background: TT.card, border: `1px solid ${TT.line}`, borderRadius: 18, padding: "14px 12px 10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "0 4px 8px" }}>
            <h2 style={{ margin: 0, fontFamily: TT.head, fontWeight: 700, fontSize: 14 }}>Posizione giro per giro</h2>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: TT.muted }}><span aria-hidden="true" style={{ width: 12, height: 10, borderRadius: 2, background: F.edge }} />{item.chart.label}</span>
          </div>
          <PosChart chart={item.chart} color={item.color} family={item.family} />
        </section>
      )}
      {item.chart && item.chart.kind === "bars" && <div style={{ marginTop: 14, background: TT.card, border: `1px solid ${TT.line}`, borderRadius: 18, padding: 14 }}><Bars chart={item.chart} /></div>}
      <div data-tr-rule="" style={{ marginTop: 14, background: F.tint, border: `1px solid ${F.edge}`, borderRadius: 14, padding: "12px 14px" }}>
        <div style={{ fontFamily: TT.head, fontWeight: 700, fontSize: 13.5 }}>Come si vince</div>
        <p style={{ margin: "4px 0 0", fontSize: 12.5, lineHeight: 1.5, color: TT.soft }}>{item.rule}</p>
      </div>
      <div style={{ marginTop: 16 }}><Actions item={item} onReplay={onReplay} onShare={onShare} accent={accent} /></div>
    </div>
  );
}

// Pagina coi trofei della sessione.
export default function TrophiesScreen({ data, gpName = "", sessionLabel = "Gara finita", onBack, onReplay = null, onShare = null, accent = "#FF1801" }) {
  const [open, setOpen] = useState(null);
  const h = data && data.headline;
  const item = open && data ? data.all.find(x => x.id === open) : null;
  if (item) return <Detail item={item} gpName={gpName} onBack={() => setOpen(null)} onReplay={onReplay} onShare={onShare} accent={accent} />;
  return (
    <div data-tr-screen="" className="scrollcol" style={{ height: "100%", overflowY: "auto", background: TT.bg, color: TT.text, fontFamily: TT.body, padding: "4px 16px 18px", boxSizing: "border-box" }}>
      <Header title="" onBack={onBack} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: TT.muted }}>
        <span aria-hidden="true" style={{ width: 14, height: 10, borderRadius: 2, background: "repeating-conic-gradient(#F4F2EF 0 25%, #000 0 50%) 0 0 / 5px 5px" }} />
        {[gpName, sessionLabel].filter(Boolean).join(" · ")}
      </div>
      <h1 style={{ margin: "6px 0 0", fontFamily: TT.head, fontWeight: 900, fontStyle: "italic", fontSize: 30, lineHeight: 1, letterSpacing: .2 }}>B&amp;T Trophies</h1>
      <p style={{ margin: "6px 0 0", fontSize: 13, lineHeight: 1.45, color: TT.muted }}>I premi della sessione, calcolati sui dati veri.</p>
      {!h && <p data-tr-empty="" style={{ marginTop: 16, fontSize: 13, color: TT.muted }}>Per questa sessione i dati non bastano per assegnare i trofei.</p>}
      {h && (
        <section aria-label="Trofeo della sessione" data-tr-headline={h.id} style={{ marginTop: 14, background: TT.card, border: `1px solid ${TT.line}`, borderRadius: 20, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <button type="button" className="tr-btn" onClick={() => setOpen(h.id)} style={{ display: "flex", gap: 14, alignItems: "center", background: "transparent", border: 0, padding: 0, textAlign: "left", color: TT.text }}>
            <TrophyMedal item={h} size={88} label={`Medaglione ${h.name}, ${(FAMILY[h.family] || FAMILY.hard).label}`} />
            <span style={{ minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 10.5, fontWeight: 700, letterSpacing: 1, color: TT.gold }}>TROFEO DELLA {sessionLabel === "Qualifica finita" ? "QUALIFICA" : "GARA"}</span>
              <span style={{ display: "block", margin: "4px 0 0", fontFamily: TT.head, fontWeight: 900, fontStyle: "italic", fontSize: 23, lineHeight: 1.05, overflowWrap: "break-word" }}>{h.name}</span>
              <span style={{ display: "block", marginTop: 8 }}><Who item={h} /></span>
            </span>
          </button>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: TT.soft }}>{h.text}</p>
          {h.chart && h.chart.kind === "bars" && <Bars chart={h.chart} />}
          <Actions item={h} onReplay={onReplay} onShare={onShare} accent={accent} />
        </section>
      )}
      {data && data.list.length > 0 && (
        <>
          <h3 style={{ margin: "16px 0 10px", fontFamily: TT.head, fontWeight: 900, fontStyle: "italic", fontSize: 17 }}>Gli altri trofei</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
            {data.list.map(t => (
              <button key={t.id} type="button" className="tr-btn" data-tr-item={t.id} onClick={() => setOpen(t.id)}
                style={{ color: TT.text, background: TT.card, border: `1px solid ${TT.line}`, borderRadius: 16, padding: 10, display: "flex", gap: 10, alignItems: "center", minHeight: 64, boxSizing: "border-box", textAlign: "left", minWidth: 0 }}>
                <TrophyMedal item={t} size={42} />
                <span style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                  <span style={{ fontFamily: TT.head, fontWeight: 700, fontSize: 13.5, lineHeight: 1.15 }}>{t.name}</span>
                  <span style={{ fontSize: 11.5, color: TT.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.who}</span>
                  <span style={{ fontSize: 11, color: TT.dim, lineHeight: 1.3 }}>{t.stat}</span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
