// 8/11 (Edoardo: "metti queste nuove grafiche funzionanti", design "B&T Premium, nuovo design 2"). Tutto il Premium in
// una pagina a schermo intero con le sue schermate: Premium, Gratis o Premium, Sblocca senza pagare, Prova attiva,
// Sei già Premium, Conferma, Attivazione, Premium attivo, Ricevuta. Scelte di Edoardo: la prova dura 14 giorni e finisce
// da sola (nessun addebito, la gestisce l'app). Tolte di proposito le schermate della carta (6b, 6c): nell'APK paga
// Google Play con la sua finestra (Google vieta di chiedere la carta nell'app), sul sito Stripe.
// Solo dati veri: prezzi di Google Play (o quelli di serie), trofei, giorni della prova, gare che restano, numero
// d'ordine. L'unica grafica d'esempio (telemetria in cima) lo dice. Animazioni solo transform e opacity.
import React, { useEffect, useRef, useState } from "react";
import "./Premium.css";
import RP from "./receipt-pdf";

const P = { bg: "#000000", card: "#111113", line: "#1E1E22", line2: "#2A2A2E", text: "#F4F4F5", muted: "#A1A1AA", gold: "#FACC15", green: "#34D399", red: "#FF1801", track: "#26262B", font: "'Manrope', system-ui, sans-serif" };
const TRIAL_DAYS = 14;
const DAY = 86400000;
const MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const dayIt = ms => { const d = new Date(ms); return Number.isFinite(d.getTime()) ? `${d.getDate()} ${MONTHS[d.getMonth()]}` : ""; };

const STAR = "M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z";
const Svg = ({ d, size = 24, stroke = "currentColor", sw = 2, fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block", flex: "none" }} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
const Check = ({ color = P.green, size = 18 }) => <Svg d="M5 12l5 5l10 -10" size={size} stroke={color} sw={2.6} />;
const Chip = ({ children, color = P.muted, solid = false, ...rest }) => (
  <span {...rest} style={{ display: "inline-flex", alignItems: "center", height: 22, padding: "0 10px", borderRadius: 11, border: `1px solid ${color}`, background: solid ? color : "transparent", fontSize: 11, fontWeight: 800, letterSpacing: .4, color: solid ? "#000" : color, whiteSpace: "nowrap" }}>{children}</span>
);
const StarBall = ({ size = 92, ring = false, spin = false }) => (
  <div style={{ position: "relative", width: size + 40, height: size + 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
    {(ring || spin) && <svg width={size + 40} height={size + 40} viewBox="0 0 132 132" aria-hidden="true" style={{ position: "absolute", inset: 0 }}><circle cx="66" cy="66" r="62" fill="none" stroke={P.track} strokeWidth="1" /></svg>}
    {spin && <svg className="pm-spin" width={size + 40} height={size + 40} viewBox="0 0 132 132" aria-hidden="true" style={{ position: "absolute", inset: 0 }}><circle cx="66" cy="66" r="62" fill="none" stroke={P.gold} strokeWidth="4" strokeLinecap="round" pathLength="1" strokeDasharray="0.28 0.72" /></svg>}
    <span className="pm-glow" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: size, height: size, borderRadius: "50%", background: P.gold }}><Svg d={STAR} size={size / 2} stroke="#000" sw={2.4} /></span>
  </div>
);
function Head({ title, onClose, onBack }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, height: 44, flexShrink: 0 }}>
      {onBack ? (
        <button type="button" className="pm-btn" aria-label="Indietro" onClick={onBack} style={{ width: 44, height: 44, marginLeft: -10, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", color: P.text, padding: 0 }}><Svg d="M15 5l-7 7l7 7" /></button>
      ) : onClose ? (
        <button type="button" className="pm-btn" aria-label="Chiudi" data-premium-close="" onClick={onClose} style={{ width: 44, height: 44, marginLeft: -10, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", color: P.text, padding: 0 }}><Svg d="M18 6l-12 12 M6 6l12 12" /></button>
      ) : <span style={{ width: 34 }} />}
      <span style={{ fontSize: 17, fontWeight: 800 }}>{title}</span>
    </div>
  );
}
const Primary = ({ children, onClick, disabled, ...rest }) => (
  <button type="button" className="pm-btn pm-primary" disabled={disabled} onClick={onClick} {...rest} style={{ position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", height: 54, borderRadius: 16, background: P.text, border: `1px solid ${P.text}`, color: "#000", fontFamily: P.font, fontSize: 17, fontWeight: 800 }}>
    {children}<span aria-hidden="true" className="pm-sheen" />
  </button>
);
const Secondary = ({ children, onClick, ...rest }) => (
  <button type="button" className="pm-btn" onClick={onClick} {...rest} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", height: 54, borderRadius: 16, background: "transparent", border: `1px solid ${P.line2}`, color: P.text, fontFamily: P.font, fontSize: 17, fontWeight: 800 }}>{children}</button>
);
const Card = ({ children, style, ...rest }) => <div {...rest} style={{ boxSizing: "border-box", borderRadius: 18, background: P.card, border: `1px solid ${P.line}`, ...style }}>{children}</div>;
const Muted = ({ children, style }) => <div style={{ fontSize: 12, fontWeight: 600, color: P.muted, lineHeight: "17px", ...style }}>{children}</div>;
const UNLOCKED = ["Nessuna pubblicità", "Second Screen e telemetria", "Tempi sul giro, radio e gomme", "Notizie Premium e Highlights"];
const ListCheck = ({ items }) => (
  <Card style={{ padding: "0 14px" }}>
    {items.map((x, i) => <div key={x} style={{ display: "flex", alignItems: "center", gap: 12, height: 45, borderTop: i ? `1px solid ${P.line}` : "none", fontSize: 15, fontWeight: 700 }}><Check />{x}</div>)}
  </Card>
);
function NextRace({ race, onGo, sub }) {
  if (!race) return null;
  return (
    <button type="button" className="pm-btn" data-premium-next={race.id || ""} onClick={onGo} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "12px 14px", borderRadius: 18, background: P.card, border: `1px solid ${P.line}`, color: P.text, textAlign: "left", fontFamily: P.font }}>
      <span style={{ width: 40, height: 40, borderRadius: 12, background: "#1A1A1E", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Svg d="M5 21V4M5 4h11l-2 4l2 4H5" size={20} /></span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 15, fontWeight: 800 }}>Prossima gara: {race.name}</span>
        <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: P.muted }}>{sub}</span>
      </span>
      <Svg d="M9 5l7 7l-7 7" size={16} stroke={P.muted} />
    </button>
  );
}

// ── Schermata 1: Premium ─────────────────────────────────────────────
function TelemetryExample() {
  const path = "M6 96 C30 96 38 30 62 26 C86 22 92 78 112 80 C132 82 138 20 168 18 C198 16 206 70 232 74 C256 78 262 40 290 36 C310 34 318 52 338 50";
  return (
    <div style={{ marginTop: 14, padding: 14, borderRadius: 20, backgroundColor: P.card, backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.035) 0 2px, transparent 2px 7px)", border: `1px solid ${P.line2}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: P.muted }}>TELEMETRIA · GIRO 23</span>
        <Chip>ESEMPIO</Chip>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 14, marginTop: 6 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <div style={{ height: 44, overflow: "hidden" }}>
            <div className="pm-reel">{["128", "214", "287", "312"].map(n => <div key={n} style={{ height: 44, lineHeight: "44px", fontSize: 38, fontWeight: 800, letterSpacing: -1, fontVariantNumeric: "tabular-nums" }}>{n}</div>)}</div>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: P.muted }}>km/h</span>
        </div>
        <div style={{ flex: 1 }} />
        {[["GAS", P.green, "0s"], ["FRENO", P.red, "-1.5s"]].map(([l, c, d]) => (
          <div key={l} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <div style={{ width: 10, height: 34, borderRadius: 3, background: P.track, display: "flex", alignItems: "flex-end" }}><div className="pm-gas" style={{ width: 10, height: 34, borderRadius: 3, background: c, animationDelay: d }} /></div>
            <span style={{ fontSize: 10, fontWeight: 700, color: P.muted }}>{l}</span>
          </div>
        ))}
      </div>
      <div style={{ position: "relative", marginTop: 8, height: 110 }}>
        <svg width="100%" height="110" viewBox="0 0 344 110" preserveAspectRatio="none" role="img" aria-label="Traccia della velocità lungo il giro (esempio)" style={{ position: "absolute", inset: 0 }}>
          <path d="M0 36 H344 M0 72 H344" stroke={P.track} strokeWidth="1" />
          <path className="pm-trace" d={path} fill="none" stroke={P.red} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" pathLength="1" strokeDasharray="1 1" />
        </svg>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: P.muted }}><span>Via</span><span>Curva 4</span><span>Rettilineo</span></div>
    </div>
  );
}
function Perks() {
  const tile = (title, sub, art) => (
    <div key={title} style={{ boxSizing: "border-box", padding: 12, borderRadius: 18, background: P.card, border: `1px solid ${P.line}`, minHeight: 148, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>{art}</div>
      <div><div style={{ fontSize: 15, fontWeight: 800 }}>{title}</div><div style={{ fontSize: 12, fontWeight: 600, color: P.muted, lineHeight: "16px" }}>{sub}</div></div>
    </div>
  );
  return (
    <div data-premium-perks="" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 8, marginTop: 8 }}>
      {tile("Gomme", "Vedi chi sta per fermarsi", (
        <svg width="60" height="60" viewBox="0 0 40 40" aria-hidden="true">
          <circle cx="20" cy="20" r="15" fill="none" stroke={P.track} strokeWidth="4.5" />
          <circle cx="20" cy="20" r="15" fill="none" stroke={P.green} strokeWidth="4.5" strokeLinecap="round" pathLength="1" strokeDasharray="0.92 1" transform="rotate(-90 20 20)" />
          <circle cx="20" cy="20" r="9.5" fill="#0B0B0C" stroke={P.gold} strokeWidth="2" />
          <text x="20" y="24" textAnchor="middle" fontSize="11" fontWeight="800" fontFamily="Manrope, system-ui, sans-serif" fill={P.text}>M</text>
        </svg>
      ))}
      {tile("Team radio", "Ascolta i box in diretta", <div style={{ display: "flex", alignItems: "center", gap: 3, height: 56 }}>{Array.from({ length: 11 }, (_, i) => <span key={i} className="pm-wave" style={{ display: "block", width: 4, height: 56, borderRadius: 2, background: P.gold, animationDelay: `-${(i * 0.09).toFixed(2)}s` }} />)}</div>)}
      {tile("Second Screen", "Le tue grafiche, a tuo modo", <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, width: 92 }}>{[0, 1, 2, 3].map(i => <span key={i} className="pm-tile" style={{ display: "block", height: 26, borderRadius: 6, background: "#3A3A40", border: "1px solid #5A5A62", animationDelay: `-${i}s` }} />)}</div>)}
      {tile("Zero pubblicità", "Via banner e annunci", <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: "50%", background: P.green }}><Check color="#000" size={24} /></span>)}
    </div>
  );
}
function Plans({ plan, setPlan, prices }) {
  const month = plan === "month" && !!prices.month;
  return (
    <div role="radiogroup" aria-label="Piano" style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
      <button type="button" className={"pm-btn" + (!month ? " pm-glow2" : "")} role="radio" aria-checked={!month} data-plan="annual" data-season-plan="" onClick={() => setPlan && setPlan("annual")} style={{ position: "relative", padding: 16, borderRadius: 20, background: P.card, border: `2px solid ${!month ? P.gold : P.line}`, color: P.text, textAlign: "left", fontFamily: P.font }}>
        <span style={{ position: "absolute", top: -11, right: 16, display: "flex", alignItems: "center", height: 22, padding: "0 10px", borderRadius: 11, background: P.gold, color: "#000", fontSize: 11, fontWeight: 800 }}>Consigliato</span>
        <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: 18, fontWeight: 800 }}>Stagione</span>
          <span style={{ fontSize: 26, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{prices.season} <span style={{ fontSize: 13, fontWeight: 700, color: P.muted }}>all'anno</span></span>
        </span>
        {prices.ratio != null && <span style={{ display: "block", marginTop: 10, height: 8, borderRadius: 4, background: P.track, overflow: "hidden" }}><span className="pm-bar" style={{ display: "block", width: `${Math.round(prices.ratio * 100)}%`, height: 8, background: P.green, borderRadius: 4 }} /></span>}
        <span style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: P.muted }}>{prices.perMonth ? `Solo ${prices.perMonth} al mese` : ""}</span>
          {prices.saving ? <span data-saving={`RISPARMI ${prices.saving}%`} style={{ fontSize: 13, fontWeight: 800, color: P.green }}>Risparmi il {prices.saving}%</span> : null}
        </span>
      </button>
      {prices.month && (
        <button type="button" className="pm-btn" role="radio" aria-checked={month} data-plan="month" onClick={() => setPlan && setPlan("month")} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderRadius: 18, background: P.card, border: `${month ? 2 : 1}px solid ${month ? P.gold : P.line}`, color: P.text, fontFamily: P.font }}>
          <span style={{ fontSize: 17, fontWeight: 800 }}>Mensile</span>
          <span style={{ fontSize: 17, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{prices.month} <span style={{ fontSize: 13, fontWeight: 700, color: P.muted }}>al mese</span></span>
        </button>
      )}
    </div>
  );
}

// ── La pagina ────────────────────────────────────────────────────────
export default function PremiumFlow(props) {
  const { isPaid = false, source = null, trial = null, trialUsed = false, prices, plan = "annual", setPlan, payVia = "play", sale = null,
    onTrial, onSubscribe, onAdPro = null, adBusy = false, adPro = false, trophyHave = 0, trophyNeed = 0, trophyMissing = [], nextRace = null, racesLeft = null,
    trophyCount = 0, receipt = null, memberPlan = null, onSavePdf, onHelp = null, supportEmail = null, onManage = null, onCoffee = null, coffeePrice = null, onGoRace, onClose, now = Date.now() } = props;
  const trialOn = !!trial && now < trial.end && source === "trial";
  const first = isPaid ? (trialOn ? "trial" : "member") : "home";
  const [screen, setScreen] = useState(first);
  const [path, setPath] = useState(trialUsed ? "buy" : "trial");   // cosa conferma la schermata Conferma
  const [phase, setPhase] = useState(0);
  const [err, setErr] = useState(null);
  const [stack, setStack] = useState([]);
  const scroller = useRef(null);
  const go = s => { setStack(st => [...st, screen]); setScreen(s); setErr(null); };
  const back = () => setStack(st => { const n = st.slice(); const prev = n.pop(); setScreen(prev || first); return n; });
  useEffect(() => { if (scroller.current) scroller.current.scrollTop = 0; }, [screen]);
  const cta = () => { setPath(trialUsed ? "buy" : "trial"); go("confirm"); };
  const ctaLabel = trialUsed ? `Abbonati · ${plan === "month" && prices.month ? prices.month + " al mese" : prices.season + " all'anno"}` : `Prova ${TRIAL_DAYS === 14 ? "2 settimane" : TRIAL_DAYS + " giorni"} gratis`;
  const run = () => {
    setScreen("paying"); setPhase(0); setErr(null);
    const job = path === "trial" ? onTrial() : onSubscribe();
    Promise.resolve(job).then(r => {
      if (r && r.ok && r.via === "stripe") return;   // sul sito si va alla pagina di Stripe
      if (!r || !r.ok) { setScreen("confirm"); setErr(r && r.message ? r.message : "Non si è attivato: riprova."); return; }
      setPhase(1); setTimeout(() => setPhase(2), 350); setTimeout(() => { setPhase(3); setStack([]); setScreen("active"); }, 800);
    }, () => { setScreen("confirm"); setErr("Non si è attivato: riprova."); });
  };
  const wrap = (children, { pad = "52px 20px 20px", attr = {} } = {}) => (
    <div ref={scroller} className="pm-root scrollcol" data-premium-sheet="" data-premium-screen={screen} {...attr} style={{ position: "absolute", inset: 0, zIndex: 520, overflowY: "auto", background: P.bg, color: P.text, fontFamily: P.font }}>
      <div key={screen} className="pm-in" style={{ minHeight: "100%", boxSizing: "border-box", padding: pad, display: "flex", flexDirection: "column" }}>{children}</div>
    </div>
  );

  if (screen === "home") return wrap(<>
    <Head onClose={onClose} />
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
      <span aria-hidden="true" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: "50%", background: P.gold }}><Svg d={STAR} size={14} stroke="#000" sw={2.4} /></span>
      <Chip color={P.gold}>B&amp;T PREMIUM</Chip>
    </div>
    <h1 data-premium-title="" style={{ margin: "10px 0 0", fontSize: 34, lineHeight: "38px", fontWeight: 800, letterSpacing: -0.8 }}>Vedi la gara come un <span style={{ color: P.gold }}>ingegnere di pista</span></h1>
    <div style={{ marginTop: 8, fontSize: 14, fontWeight: 600, color: P.muted, lineHeight: "20px" }}>Telemetria, gomme, radio e Second Screen in diretta. Senza pubblicità.</div>
    <TelemetryExample />
    <div style={{ marginTop: 16, fontSize: 12, fontWeight: 800, letterSpacing: .4, color: P.muted }}>COSA SBLOCCHI</div>
    <Perks />
    {sale && <div data-sale={sale.id} style={{ marginTop: 16, padding: "10px 14px", borderRadius: 14, border: `1px solid ${sale.color || P.gold}`, textAlign: "center" }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: sale.color || P.gold }}>Sconto {sale.name} −{sale.pct}%</div>
      <Muted style={{ color: P.text }}>La prima stagione a {sale.price}</Muted>
    </div>}
    <Plans plan={plan} setPlan={setPlan} prices={prices} />
    <div style={{ marginTop: 14 }}><Primary data-premium-cta="" onClick={cta}>{ctaLabel}</Primary></div>
    {!trialUsed && <button type="button" className="pm-btn" data-premium-buy="" onClick={() => { setPath("buy"); go("confirm"); }} style={{ marginTop: 6, background: "none", border: "none", color: P.text, fontFamily: P.font, fontSize: 14, fontWeight: 800, padding: "10px 0", minHeight: 44 }}>Oppure abbonati subito</button>}
    <Muted style={{ textAlign: "center", marginTop: 8 }}><span data-after-trial="">{trialUsed ? "Si rinnova da solo finché non disdici. Disdici quando vuoi da Google Play → Abbonamenti." : `La prova finisce da sola dopo ${TRIAL_DAYS} giorni: nessun addebito. Poi scegli tu se abbonarti.`}</span></Muted>
    <button type="button" className="pm-btn" data-premium-free="" onClick={() => go("free")} style={{ marginTop: 14, background: "none", border: "none", color: P.text, fontFamily: P.font, fontSize: 14, fontWeight: 800, padding: "12px 0" }}>Preferisci non pagare? Sblocca con un video o coi trofei</button>
    <button type="button" className="pm-btn" data-premium-compare="" onClick={() => go("compare")} style={{ background: "none", border: "none", color: P.muted, fontFamily: P.font, fontSize: 13, fontWeight: 700, padding: "6px 0 10px" }}>Confronta Gratis e Premium</button>
    <Muted style={{ fontSize: 10.5, lineHeight: "15px", textAlign: "center", marginBottom: 8 }}>Stagione: si rinnova a ogni stagione, ogni volta 1 € in meno (fino a 1 €). Mensile: ogni mese. Si disdice quando vuoi da Google Play → Abbonamenti.</Muted>
  </>);

  if (screen === "compare") {
    const rows = [["Pubblicità", "Banner e annunci", "Nessuna"], ["Funzioni Pro", "Con un video, finché chiudi l'app", "Sempre"], ["Notizie Premium", "Un video per notizia", "Tutte"], ["Video esclusivi B&T", "No", "Sì"]];
    return wrap(<>
      <Head title="Gratis o Premium" onBack={back} />
      <Card data-premium-table="" style={{ marginTop: 10, borderRadius: 20, padding: "6px 14px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.05fr 1fr 1fr", gap: 8, padding: "10px 0", fontSize: 12, fontWeight: 800 }}>
          <span /><span style={{ color: P.muted }}>Gratis</span><span style={{ display: "flex", alignItems: "center", gap: 5, color: P.gold }}><Svg d={STAR} size={14} stroke={P.gold} />Premium</span>
        </div>
        {rows.map(([a, b, c]) => (
          <div key={a} style={{ display: "grid", gridTemplateColumns: "1.05fr 1fr 1fr", gap: 8, padding: "14px 0", borderTop: `1px solid ${P.line}`, alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 800 }}>{a}</span><span style={{ fontSize: 13, fontWeight: 600, color: P.muted }}>{b}</span><span style={{ fontSize: 14, fontWeight: 800 }}>{c}</span>
          </div>
        ))}
      </Card>
      <Muted style={{ marginTop: 12 }}>Le funzioni Pro sono Second Screen, telemetria, tempi sul giro, radio e gomme della diretta.</Muted>
      <div style={{ marginTop: "auto", paddingTop: 20 }}>{!isPaid && <Primary data-premium-cta="" onClick={cta}>{ctaLabel}</Primary>}</div>
    </>);
  }

  if (screen === "free") {
    const pct = trophyNeed ? Math.min(1, trophyHave / trophyNeed) : 0;
    return wrap(<>
      <Head title="Sblocca senza pagare" onBack={back} />
      <button type="button" className="pm-btn" data-ad-pro="" disabled={!onAdPro || adBusy || adPro} onClick={onAdPro || undefined} style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 14, padding: 16, borderRadius: 20, background: P.card, border: `1px solid ${P.line2}`, color: P.text, textAlign: "left", fontFamily: P.font }}>
        <span style={{ width: 44, height: 44, borderRadius: "50%", background: P.text, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{adBusy ? <span className="pm-spin" style={{ width: 18, height: 18, borderRadius: "50%", border: "2.5px solid #000", borderTopColor: "transparent" }} /> : <Svg d="M8 5v14l11-7z" size={20} stroke="#000" fill="#000" />}</span>
        <span>
          <span style={{ display: "block", fontSize: 16, fontWeight: 800 }}>{adPro ? "Funzioni Pro sbloccate" : "Guarda un video"}</span>
          <span style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: P.muted }}>{adPro ? "Valgono finché non chiudi l'app" : onAdPro ? "Sblocca tutte le funzioni Pro finché non chiudi l'app" : "Video non disponibile adesso"}</span>
        </span>
      </button>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, fontSize: 12, fontWeight: 800, letterSpacing: .4, color: P.muted }}><span>COI TROFEI, PER SEMPRE</span><span data-trophy-have={trophyHave}>Hai {trophyHave} {trophyHave === 1 ? "trofeo" : "trofei"}</span></div>
      <Card style={{ marginTop: 8, padding: "14px 14px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 800 }}>Premium gratis</span>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: pct >= 1 ? P.green : P.muted }}>{pct >= 1 ? "Sbloccato" : `${trophyHave} su ${trophyNeed}`}</span>
        </div>
        <Muted style={{ marginTop: 2 }}>Vinci tutti i {trophyNeed} trofei: il Premium è tuo, come quello pagato, finché li hai.</Muted>
        <div style={{ marginTop: 10, height: 6, borderRadius: 3, background: P.track, overflow: "hidden" }}><div className="pm-bar" style={{ width: `${Math.round(pct * 100)}%`, height: 6, background: P.text, borderRadius: 3 }} /></div>
      </Card>
      {trophyMissing.length > 0 && (
        <Card style={{ marginTop: 8, padding: "4px 14px" }}>
          {trophyMissing.slice(0, 6).map((t, i) => (
            <div key={t.id} data-trophy-missing={t.id} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 40, borderTop: i ? `1px solid ${P.line}` : "none", fontSize: 14, fontWeight: 700 }}>
              <Svg d="M7 11V8a5 5 0 0 1 10 0v3M5 11h14v9H5z" size={16} stroke={P.muted} /><span style={{ minWidth: 0 }}>{t.name}</span>
            </div>
          ))}
          {trophyMissing.length > 6 && <Muted style={{ padding: "8px 0" }}>e altri {trophyMissing.length - 6}</Muted>}
        </Card>
      )}
    </>);
  }

  if (screen === "trial") {
    const total = TRIAL_DAYS * DAY, left = Math.max(0, trial.end - now), dLeft = Math.ceil(left / DAY), day = Math.min(TRIAL_DAYS, Math.max(1, TRIAL_DAYS - dLeft + 1));
    const frac = Math.max(0, Math.min(1, left / total)), C = 2 * Math.PI * 52;
    return wrap(<>
      <Head title="Il tuo Premium" onClose={onClose} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 8 }}>
        <div style={{ position: "relative", width: 120, height: 120 }}>
          <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" fill="none" stroke={P.track} strokeWidth="8" /><circle cx="60" cy="60" r="52" fill="none" stroke={P.gold} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(C * frac).toFixed(1)} ${C.toFixed(1)}`} transform="rotate(-90 60 60)" /></svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}><span data-trial-left={dLeft} style={{ fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{dLeft}</span><span style={{ fontSize: 12, fontWeight: 600, color: P.muted }}>{dLeft === 1 ? "giorno" : "giorni"}</span></div>
        </div>
        <div style={{ marginTop: 14, fontSize: 22, fontWeight: 800 }}>Prova gratuita attiva</div>
        <Muted>Giorno {day} di {TRIAL_DAYS} · finisce il {dayIt(trial.end)}</Muted>
      </div>
      <Card style={{ marginTop: 18, padding: "12px 14px" }}>
        <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>Cosa hai già sbloccato</div>
        {["Nessuna pubblicità", "Funzioni Pro sempre accese", "Notizie Premium e video esclusivi"].map(x => <div key={x} style={{ display: "flex", alignItems: "center", gap: 10, height: 28, fontSize: 14, fontWeight: 600 }}><Check />{x}</div>)}
      </Card>
      <Card style={{ marginTop: 10, padding: "12px 14px" }}>
        <div style={{ fontSize: 14, fontWeight: 800 }}>Vuoi restare Premium?</div>
        <Muted>Stagione {prices.season} all'anno{prices.month ? `, oppure Mensile ${prices.month} al mese` : ""}. Se non scegli, la prova finisce da sola.</Muted>
      </Card>
      <div style={{ marginTop: "auto", paddingTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
        <Primary data-premium-cta="" onClick={() => { setPlan && setPlan("annual"); setPath("buy"); go("confirm"); }}>Scegli Stagione</Primary>
        <Secondary onClick={() => go("compare")}>Confronta Gratis e Premium</Secondary>
      </div>
    </>);
  }

  if (screen === "member") {
    const label = { play: memberPlan === "month" ? "MENSILE" : "STAGIONE", stripe: "ABBONAMENTO", trophies: "COI TROFEI", admin: "ADMIN", trial: "PROVA" }[source] || "PREMIUM";
    return wrap(<>
      <Head title="Il tuo Premium" onClose={onClose} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <StarBall size={72} ring />
        <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -.5 }}>Sei Premium</div>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}><Chip color={P.gold} data-premium-source={source || ""}>{label}</Chip></div>
      </div>
      <div style={{ marginTop: 18, fontSize: 12, fontWeight: 800, letterSpacing: .4, color: P.muted }}>IL TUO PREMIUM IN NUMERI</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 8 }}>
        {[[trophyCount, "trofei vinti"], ["5 su 5", "funzioni Pro accese"], [racesLeft == null ? "–" : racesLeft, racesLeft === 1 ? "gara rimasta" : "gare rimaste"]].map(([n, l]) => (
          <div key={l} data-premium-stat="" style={{ padding: 12, borderRadius: 16, backgroundColor: P.card, backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0 2px, transparent 2px 7px)", border: `1px solid ${P.line}` }}>
            <div style={{ fontSize: 24, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{n}</div><div style={{ fontSize: 12, fontWeight: 600, color: P.muted }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10 }}><NextRace race={nextRace} onGo={onGoRace} sub="Second Screen e telemetria pronti per le prove libere" /></div>
      <div style={{ marginTop: 16, fontSize: 12, fontWeight: 800, letterSpacing: .4, color: P.muted }}>HAI TUTTO SBLOCCATO</div>
      <div style={{ marginTop: 6 }}><ListCheck items={UNLOCKED} /></div>
      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        {receipt && receipt.orderId && <Secondary data-premium-receipt-open="" onClick={() => go("receipt")}>Vedi la ricevuta</Secondary>}
        {onManage && source === "play" && <Secondary data-premium-manage="" onClick={onManage}>Gestisci abbonamento</Secondary>}
      </div>
      {onCoffee && <button type="button" className="pm-btn" data-premium-coffee="" onClick={onCoffee} style={{ margin: "14px auto 6px", display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", color: P.text, fontFamily: P.font, fontSize: 14, fontWeight: 800 }}><Svg d="M4 8h12v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z M16 10h2a2 2 0 0 1 0 4h-2 M8 3v2 M12 3v2" size={20} />Offrici un caffè{coffeePrice ? ` · ${coffeePrice}` : ""}</button>}
    </>);
  }

  if (screen === "confirm") {
    const trialPath = path === "trial", month = plan === "month" && !!prices.month, price = month ? prices.month : prices.season;
    const step = (dot, k, t, v, last) => (
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 14 }}><span style={{ width: 12, height: 12, borderRadius: "50%", background: dot, marginTop: 4 }} />{!last && <span style={{ flex: 1, width: 2, background: P.line2, margin: "4px 0" }} />}</div>
        <div style={{ flex: 1, paddingBottom: last ? 0 : 14 }}><div style={{ fontSize: 11, fontWeight: 800, letterSpacing: .4, color: P.muted }}>{k}</div><div style={{ fontSize: 15, fontWeight: 700 }}>{t}</div></div>
        <div style={{ fontSize: 17, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{v}</div>
      </div>
    );
    return wrap(<>
      <Head title="Conferma" onBack={back} />
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
        <span style={{ width: 52, height: 52, borderRadius: "50%", background: P.gold, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Svg d={STAR} size={26} stroke="#000" sw={2.4} /></span>
        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 11, fontWeight: 800, color: P.gold }}>B&amp;T PREMIUM</div><div style={{ fontSize: 22, fontWeight: 800 }}>{trialPath ? "Prova gratuita" : month ? "Mensile" : "Stagione"}</div></div>
        {trialPath && <Chip color={P.gold}>{TRIAL_DAYS} GIORNI GRATIS</Chip>}
      </div>
      {!trialPath && prices.month && (
        <div role="radiogroup" aria-label="Piano" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginTop: 16, padding: 4, borderRadius: 16, background: P.card, border: `1px solid ${P.line}` }}>
          {[["annual", `Stagione · ${prices.season}/anno`], ["month", `Mensile · ${prices.month}`]].map(([id, l]) => {
            const on = id === "month" ? month : !month;
            return <button key={id} type="button" className="pm-btn" role="radio" aria-checked={on} data-confirm-plan={id} onClick={() => setPlan && setPlan(id)} style={{ height: 44, borderRadius: 12, border: "none", background: on ? P.text : "transparent", color: on ? "#000" : P.muted, fontFamily: P.font, fontSize: 13.5, fontWeight: 800 }}>{l}</button>;
          })}
        </div>
      )}
      <Card style={{ marginTop: 14, padding: 16 }}>
        {trialPath ? (<>
          {step(P.green, "OGGI", "Premium si attiva subito", "0 €")}
          {step(P.gold, "GIORNO 12", "Ti avvisiamo che sta finendo", "Avviso")}
          {step(P.text, "GIORNO 14", "La prova finisce da sola", "0 €", true)}
        </>) : (<>
          {step(P.green, "OGGI", "Premium si attiva subito", price)}
          {step(P.gold, month ? "OGNI MESE" : "OGNI STAGIONE", "Si rinnova da solo", price)}
          {step(P.text, "QUANDO VUOI", "Disdici da Google Play", "", true)}
        </>)}
      </Card>
      {trialPath ? (
        <Card style={{ marginTop: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, background: "rgba(52,211,153,.08)", borderColor: "rgba(52,211,153,.35)" }}><Check /><span style={{ fontSize: 13.5, fontWeight: 700 }}>Nessuna carta e nessun addebito. Dopo, se vuoi, scegli Stagione {prices.season}{prices.month ? ` o Mensile ${prices.month}` : ""}.</span></Card>
      ) : (<>
        {!month && prices.saving ? <Card style={{ marginTop: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, background: "rgba(52,211,153,.08)", borderColor: "rgba(52,211,153,.35)" }}><Check /><span style={{ fontSize: 13.5, fontWeight: 700 }}>Con Stagione risparmi il {prices.saving}% rispetto al mensile</span></Card> : null}
        <Card style={{ marginTop: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 40, height: 40, borderRadius: 12, background: "#1A1A1E", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Svg d="M7 11V8a5 5 0 0 1 10 0v3M5 11h14v9H5z" size={18} /></span>
          <span><span style={{ display: "block", fontSize: 15, fontWeight: 800 }}>{payVia === "stripe" ? "Paghi con Stripe" : "Paghi con Google Play"}</span><span style={{ display: "block", fontSize: 12, fontWeight: 600, color: P.muted }}>{payVia === "stripe" ? "Pagina di pagamento sicura di Stripe" : "Col metodo di pagamento del tuo account Google"}</span></span>
        </Card>
      </>)}
      {err && <div role="alert" data-premium-error="" style={{ marginTop: 10, fontSize: 13, fontWeight: 700, color: "#FF6B5E" }}>{err}</div>}
      <div style={{ marginTop: "auto", paddingTop: 20 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}><span style={{ fontSize: 14, fontWeight: 600, color: P.muted }}>Totale oggi</span><span data-premium-total="" style={{ fontSize: 30, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{trialPath ? "0,00 €" : price}</span></div>
        <Primary data-confirm-cta="" onClick={run}>{trialPath ? "Inizia la prova gratis" : payVia === "stripe" ? "Vai al pagamento" : "Abbonati con Google Play"}</Primary>
        <Muted style={{ textAlign: "center", marginTop: 8 }}>{trialPath ? "Nessun abbonamento parte da solo." : "Disdici quando vuoi da Google Play → Abbonamenti."}</Muted>
      </div>
    </>);
  }

  if (screen === "paying") {
    const trialPath = path === "trial";
    const steps = trialPath ? ["Attivazione della prova", "Salvataggio nel tuo account", "Premium pronto"] : [payVia === "stripe" ? "Apertura di Stripe" : "Pagamento con Google Play", "Conferma del pagamento", "Attivazione Premium"];
    return wrap(<>
      <Head />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginTop: 30 }}>
        <StarBall size={92} spin />
        <div role="status" style={{ marginTop: 22, fontSize: 26, lineHeight: "32px", fontWeight: 800, letterSpacing: -.5 }}>Stiamo attivando<br />il tuo Premium</div>
        <Muted style={{ marginTop: 8 }}>Ci vuole un attimo. Non chiudere l'app.</Muted>
      </div>
      <Card style={{ marginTop: 28, padding: "0 14px" }}>
        {steps.map((s, i) => (
          <div key={s} data-pay-step={i < phase ? "fatto" : i === phase ? "in corso" : "dopo"} style={{ display: "flex", alignItems: "center", gap: 12, height: 48, borderTop: i ? `1px solid ${P.line}` : "none" }}>
            <span style={{ width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
              {i < phase ? <Check /> : i === phase ? <svg className="pm-spin" width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><circle cx="11" cy="11" r="9" fill="none" stroke={P.gold} strokeWidth="2.5" strokeLinecap="round" pathLength="1" strokeDasharray="0.3 0.7" /></svg> : <span style={{ width: 8, height: 8, borderRadius: "50%", background: P.line2 }} />}
            </span>
            <span style={{ fontSize: 15, fontWeight: 700, color: i <= phase ? P.text : P.muted }}>{s}</span>
          </div>
        ))}
      </Card>
      <div style={{ marginTop: 14, height: 4, borderRadius: 2, background: P.track, overflow: "hidden" }}><div className="pm-prog" style={{ height: 4, background: P.gold, transform: `scaleX(${(phase + 1) / 4})` }} /></div>
      <Muted style={{ marginTop: "auto", marginBottom: 14, textAlign: "center", fontSize: 11 }}>{trialPath ? "Nessun pagamento: la prova è gratis" : payVia === "stripe" ? "Pagamento gestito da Stripe" : "Pagamento gestito da Google Play"}</Muted>
    </>);
  }

  if (screen === "active") {
    const isTrial = path === "trial";
    const end = isTrial ? (trial && trial.end) || now + TRIAL_DAYS * DAY : null;
    return wrap(<>
      <Head onClose={onClose} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <div className="pm-pop"><StarBall size={92} /></div>
        <div data-premium-welcome="" style={{ fontSize: 34, lineHeight: "38px", fontWeight: 800, letterSpacing: -.8 }}>Benvenuto<br />in Premium</div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {isTrial ? <><Chip color={P.green}>PROVA ATTIVA</Chip><Chip>FINO AL {dayIt(end).toUpperCase()}</Chip></> : <Chip color={P.gold}>{plan === "month" ? "MENSILE" : "STAGIONE"}</Chip>}
        </div>
      </div>
      <div style={{ marginTop: 18 }}><ListCheck items={UNLOCKED} /></div>
      <div style={{ marginTop: 10 }}><NextRace race={nextRace} onGo={onGoRace} sub="Second Screen attivo dalle prove libere" /></div>
      <div style={{ marginTop: "auto", paddingTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
        <Primary data-premium-go="" onClick={onGoRace}>Vai alla gara</Primary>
        {!isTrial && receipt && receipt.orderId && <Secondary data-premium-receipt-open="" onClick={() => go("receipt")}>Vedi la ricevuta</Secondary>}
        <Muted style={{ textAlign: "center" }}>{isTrial ? "Ti avvisiamo 2 giorni prima che la prova finisca." : "Disdici quando vuoi da Google Play → Abbonamenti."}</Muted>
      </div>
    </>);
  }

  if (screen === "receipt" && receipt) {
    // Codice a barre vero (Code 128) del numero d'ordine di Google Play: lo stesso del PDF. 10 moduli bianchi per lato.
    const mods = RP.code128(receipt.orderId), Q = 10;
    return wrap(<>
      <div style={{ display: "flex", alignItems: "center", height: 44 }}><span style={{ fontSize: 17, fontWeight: 800 }}>Ricevuta</span></div>
      <div style={{ position: "relative", marginTop: 8 }}>
        <div aria-hidden="true" style={{ height: 18, borderRadius: 9, background: "#1A1A1E", border: `1px solid ${P.line2}`, position: "relative", zIndex: 2 }}><span style={{ position: "absolute", right: 12, top: 6, width: 6, height: 6, borderRadius: "50%", background: P.green }} /></div>
        <div style={{ overflow: "hidden", margin: "-9px 20px 0" }}>
          <div className="pm-paper" data-receipt="" style={{ background: "#F4F4F0", color: "#1A1A1A", padding: "22px 18px 18px", fontFamily: P.font }}>
            <div style={{ textAlign: "center", fontSize: 11, fontWeight: 800, letterSpacing: 2, color: "#55555A" }}>CONFERMA D'ORDINE</div>
            <div style={{ borderTop: "1.5px dashed #BDBDB8", margin: "10px 0" }} />
            {[["B&T Premium " + (receipt.plan === "month" ? "Mensile" : "Stagione"), "1 ×"], ["Totale", receipt.price || ""]].map(([a, b], i) => <div key={a} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: i ? 800 : 600, padding: "3px 0" }}><span>{a}</span><span>{b}</span></div>)}
            <div style={{ borderTop: "1.5px dashed #BDBDB8", margin: "10px 0" }} />
            {[["Pagamento", "Google Play"], ["Data", RP.dayIt(receipt.at)], ["N. ordine", receipt.orderId]].map(([a, b]) => <div key={a} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12.5, fontWeight: 600, padding: "3px 0" }}><span>{a}</span><span data-receipt-field={a} style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b}</span></div>)}
            {mods && <svg data-receipt-barcode={receipt.orderId} width="calc(100% + 36px)" height="56" viewBox={`0 0 ${mods.length + 2 * Q} 56`} preserveAspectRatio="none" shapeRendering="crispEdges" role="img" aria-label={`Codice a barre del numero d'ordine ${receipt.orderId}`} style={{ display: "block", margin: "12px -18px 0", background: "#FFFFFF" }}>
              {RP.bars(mods).map(([st, n]) => <rect key={st} x={st + Q} y="0" width={n} height="56" fill="#000000" />)}
            </svg>}
            <div style={{ textAlign: "center", fontSize: 11, fontWeight: 800, letterSpacing: 2, marginTop: 6 }}>{receipt.orderId}</div>
            <div style={{ textAlign: "center", fontSize: 10.5, fontWeight: 600, color: "#55555A", marginTop: 10, lineHeight: "15px" }}>Non è un documento fiscale.<br />La ricevuta ufficiale arriva da Google Play.</div>
          </div>
        </div>
      </div>
      <div style={{ marginTop: "auto", paddingTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
        <Primary data-receipt-pdf="" onClick={() => onSavePdf && onSavePdf(receipt)}><Svg d="M12 4v11 M7 10l5 5l5-5 M5 20h14" size={20} stroke="#000" />Scarica PDF</Primary>
        <Secondary onClick={back}>Continua</Secondary>
        {onHelp && <button type="button" className="pm-btn" data-receipt-help="" onClick={() => onHelp(receipt)} style={{ background: "none", border: "none", color: P.muted, fontFamily: P.font, fontSize: 13, fontWeight: 700, padding: "10px 0", minHeight: 44 }}>Problemi col Premium? Mandaci la ricevuta{supportEmail ? ` a ${supportEmail}` : ""}</button>}
      </div>
    </>);
  }
  return wrap(<><Head onClose={onClose} /></>);
}
