// 8/11 (Edoardo: "nella classifica crea un tasto calcolatrice che calcoli il campionato e tutto quello che si vuole
// con punti ecc, solo se il campionato non è finito"). Pagina aperta dal Mondiale: punti ancora in palio, chi può
// ancora vincere (piloti e costruttori), e uno scenario fra due piloti scegliendo l'arrivo in ogni GP e Sprint rimasti.
// Conti in src/logic/champ-calc.js, sui punti veri della classifica e sulle gare rimaste del calendario.
import React, { useState } from "react";
import { contenders, maxLeft, scenario, ptsOf, SPRINT, titleWatch } from "../logic/champ-calc";
import "./Calcolatrice.css";

const K = { bg: "#000000", card: "#18181C", line: "rgba(255,255,255,.08)", text: "#F4F2EF", muted: "#9C9CA1", dim: "#86858C", green: "#3ED66B", gold: "#E7B34C", head: "'Titillium Web', sans-serif", body: "'Work Sans', sans-serif" };
const lastName = n => String(n || "").split(" ").slice(-1)[0];
const pl = n => (Math.abs(n) === 1 ? "punto" : "punti");
// colore della squadra mescolato al fondo della carta (opaco: niente color-mix, che i telefoni vecchi non hanno)
const tint = (hex, f = .16, bg = [24, 24, 28]) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ""));
  if (!m) return "#18181C";
  const c = [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16));
  return "#" + c.map((v, i) => Math.round(bg[i] + (v - bg[i]) * f).toString(16).padStart(2, "0")).join("");
};

// 8/11 (Edoardo): in cima, colorato e animato, cosa serve a chi è in testa per vincere il Mondiale matematicamente:
// quando può chiuderlo e, rivale per rivale, i punti di vantaggio e gli arrivi minimi (conti in titleWatch).
function TitleBanner({ watch, kind, accent }) {
  if (!watch) return null;
  const team = kind === "costruttori";
  const L = watch.leader, Ln = team ? L.name : lastName(L.name), Lc = L.color || accent;
  const where = e => (e.sprint ? `nella Sprint del ${e.name}` : `al ${e.name}`);
  const within = e => (e.sprint ? `entro la Sprint del ${e.name}` : `entro il ${e.name}`);
  const words = watch.decided ? [Ln, "è", "campione", "del", "mondo"]
    : [Ln, "può", "vincere", "il", "Mondiale", ...(watch.atIndex === 0 ? ["già"] : ["al", "più", "presto"]), ...where(watch.at).split(" ")];
  let i = 0;
  const line = r => {
    const Rn = team ? r.name : lastName(r.name), w = watch.atIndex === 0 ? "" : " " + within(watch.at);
    if (r.need > 0) return `${Ln} deve fare almeno ${r.need} ${pl(r.need)} più di ${Rn}${w}.`;
    if (r.need === 0) return `${Rn} non deve recuperargli nemmeno un punto${w}.`;
    return `${Rn} non deve recuperargli più di ${-r.need} ${pl(r.need)}${w}.`;
  };
  const chips = r => {
    const Rn = lastName(r.name), out = [];
    if (r.ifWin === "any") out.push(`${Ln} 1°: ${Rn} qualunque arrivo`); else if (r.ifWin === "out") out.push(`${Ln} 1°: ${Rn} fuori dai punti`); else if (r.ifWin) out.push(`${Ln} 1°: ${Rn} ${r.ifWin}° o peggio`);
    if (r.ifRivalWins === "any") out.push(`${Rn} 1°: ${Ln} qualunque arrivo`); else if (r.ifRivalWins) out.push(`${Rn} 1°: ${Ln} almeno ${r.ifRivalWins}°`); else if (r.ifWin !== null || r.leaderMin !== null) out.push(`${Rn} 1°: non basta`);
    if (r.leaderMin === "out") out.push(`${Rn} fuori dai punti: a ${Ln} basta anche zero`); else if (r.leaderMin) out.push(`${Rn} fuori dai punti: ${Ln} almeno ${r.leaderMin}°`);
    return out;
  };
  return (
    <section data-calc-title={watch.decided ? "deciso" : String(watch.atIndex)} aria-live="polite" className="calc-title" style={{ "--calc-c": Lc, "--calc-a": accent, "--calc-tint": tint(Lc), marginTop: 12, borderRadius: 20, padding: "16px 14px 14px" }}>
      <span className="calc-title-sheen" aria-hidden="true" />
      <div style={{ position: "relative", fontSize: 11, fontWeight: 700, color: Lc, letterSpacing: .3 }}>{watch.decided ? "Mondiale deciso" : "Per vincere il Mondiale"}</div>
      <h2 style={{ position: "relative", margin: "4px 0 0", fontFamily: K.head, fontWeight: 900, fontStyle: "italic", fontSize: 24, lineHeight: 1.08, overflowWrap: "break-word" }}>
        {words.map((w, k) => <span key={k} className="calc-word" style={{ "--d": `${(i++) * 55}ms`, color: k === 0 ? Lc : K.text, display: "inline-block", marginRight: ".26em" }}>{w}</span>)}
      </h2>
      {watch.decided && <p style={{ position: "relative", margin: "6px 0 0", fontSize: 12.5, color: K.muted }}>Nessuno può più raggiungerlo, anche vincendo tutte le gare che restano.</p>}
      {!watch.decided && (
        <div style={{ position: "relative", marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
          {watch.rivals.map((r, k) => (
            <div key={r.id} data-calc-need={r.id} data-need={r.need} className="calc-rise" style={{ "--d": `${words.length * 55 + 120 + k * 120}ms`, paddingTop: k ? 10 : 0, borderTop: k ? `1px solid ${K.line}` : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span aria-hidden="true" style={{ width: 4, height: 18, borderRadius: 2, background: r.color || K.muted, flexShrink: 0 }} />
                <span style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.35 }}>{line(r)}</span>
              </div>
              {chips(r).length > 0 && (
                <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {chips(r).map(c => <span key={c} data-calc-chip="" style={{ padding: "4px 9px", borderRadius: 999, fontSize: 11.5, fontWeight: 600, color: K.text, background: "rgba(255,255,255,.06)", border: `1px solid ${K.line}` }}>{c}</span>)}
                </div>
              )}
            </div>
          ))}
          <p style={{ margin: 0, fontSize: 11, color: K.dim }}>{watch.rivals.length > 1 ? "Devono succedere tutte insieme. " : ""}A pari punti contano le vittorie: qui chiediamo sempre un punto in più.</p>
        </div>
      )}
    </section>
  );
}
const nice = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

function Seg({ value, onChange, items, accent }) {
  return (
    <div role="group" aria-label="Classifica" style={{ display: "inline-flex", padding: 3, borderRadius: 999, background: "rgba(255,255,255,.05)", border: `1px solid ${K.line}` }}>
      {items.map(([id, l]) => (
        <button key={id} type="button" className="calc-btn" data-calc-kind={id} aria-pressed={value === id} onClick={() => onChange(id)}
          style={{ padding: "7px 16px", borderRadius: 999, border: value === id ? `1px solid ${accent}` : "1px solid transparent", background: value === id ? "rgba(255,255,255,.08)" : "transparent", fontFamily: K.body, fontWeight: 700, fontSize: 12, color: value === id ? K.text : K.muted }}>{l}</button>
      ))}
    </div>
  );
}

const PosSelect = ({ value, onChange, sprint, label, taken }) => (
  <select aria-label={label} className="calc-select" value={value === undefined ? "" : value === null ? "0" : String(value)} onChange={e => onChange(e.target.value === "" ? undefined : e.target.value === "0" ? null : Number(e.target.value))}
    style={{ width: "100%", minWidth: 0, height: 36, borderRadius: 10, padding: "0 8px", background: "#101013", border: `1px solid ${K.line}`, color: K.text, fontFamily: K.body, fontSize: 13 }}>
    <option value="">–</option>
    {Array.from({ length: sprint ? SPRINT.length : 10 }, (_, i) => <option key={i + 1} value={i + 1} disabled={taken === i + 1}>{i + 1}° (+{ptsOf(i + 1, sprint)})</option>)}
    <option value="0">Fuori (0)</option>
  </select>
);

export default function Calcolatrice({ drivers = [], teams = [], events = [], onBack, accent = "#FF1801", startKind = "piloti" }) {
  const [kind, setKind] = useState(startKind);
  const rows = kind === "costruttori" ? teams : drivers;
  const list = contenders(rows, events, kind);
  const alive = list.filter(r => r.alive);
  const shown = [...alive, ...list.filter(r => !r.alive).slice(0, 3)];
  const left = maxLeft(events, kind);
  const nGp = events.filter(e => !e.sprint).length, nSp = events.filter(e => e.sprint).length;
  // scenario fra due piloti
  const dl = contenders(drivers, events, "piloti");
  const [aId, setA] = useState(dl[0] ? dl[0].id : null);
  const [bId, setB] = useState(dl[1] ? dl[1].id : null);
  const [picks, setPicks] = useState({});
  const A = dl.find(r => r.id === aId) || dl[0], B = dl.find(r => r.id === bId) || dl[1];
  const sc = A && B && A.id !== B.id ? scenario({ a: A, b: B, events, picks }) : null;
  const others = sc ? dl.filter(r => r.id !== A.id && r.id !== B.id && r.alive) : [];
  const setPick = (ev, who, v) => setPicks(p => { const cur = { ...(p[ev] || {}) }; if (v === undefined) delete cur[who]; else cur[who] = v; const n = { ...p, [ev]: cur }; if (!Object.keys(cur).length) delete n[ev]; return n; });
  const sel = (val, set, label, exclude) => (
    <select aria-label={label} className="calc-select" value={val || ""} onChange={e => { set(e.target.value); setPicks({}); }}
      style={{ flex: 1, minWidth: 0, height: 40, borderRadius: 10, padding: "0 8px", background: "#101013", border: `1px solid ${K.line}`, color: K.text, fontFamily: K.head, fontWeight: 700, fontSize: 14 }}>
      {dl.filter(r => r.id !== exclude).map(r => <option key={r.id} value={r.id}>{lastName(r.name)} ({r.points})</option>)}
    </select>
  );
  return (
    <div data-calc="" className="scrollcol" style={{ height: "100%", overflowY: "auto", background: K.bg, color: K.text, fontFamily: K.body, padding: "4px 16px 24px", boxSizing: "border-box" }}>
      <div style={{ height: 56, display: "flex", alignItems: "center", gap: 12 }}>
        <button type="button" className="calc-btn" aria-label="Indietro" onClick={onBack} style={{ width: 40, height: 40, borderRadius: "50%", background: K.card, border: `1px solid ${K.line}`, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={K.text} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <h1 style={{ margin: 0, fontFamily: K.head, fontWeight: 900, fontStyle: "italic", fontSize: 22 }}>Calcolatrice del Mondiale</h1>
      </div>
      <Seg value={kind} onChange={setKind} accent={accent} items={[["piloti", "Piloti"], ["costruttori", "Costruttori"]]} />
      <TitleBanner key={kind} watch={titleWatch(rows, events, kind)} kind={kind} accent={accent} />
      <section data-calc-left={left} style={{ marginTop: 12, background: K.card, border: `1px solid ${K.line}`, borderRadius: 18, padding: 14 }}>
        <div style={{ fontSize: 12, color: K.muted }}>Restano {nGp} {nGp === 1 ? "GP" : "GP"}{nSp ? ` e ${nSp} Sprint` : ""}</div>
        <div style={{ marginTop: 4, fontFamily: K.head, fontWeight: 900, fontSize: 30, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{nice(left)} <span style={{ fontSize: 15, color: K.muted, fontWeight: 700 }}>punti in palio {kind === "costruttori" ? "per squadra" : "per pilota"}</span></div>
        <div style={{ marginTop: 6, fontSize: 11.5, color: K.dim }}>{kind === "costruttori" ? "Una squadra fa al massimo 43 punti a GP (1° e 2°) e 15 a Sprint." : "Un pilota fa al massimo 25 punti a GP e 8 a Sprint."}</div>
      </section>
      <h2 style={{ margin: "18px 0 8px", fontFamily: K.head, fontWeight: 900, fontStyle: "italic", fontSize: 17 }}>Chi può ancora vincere</h2>
      <div style={{ background: K.card, border: `1px solid ${K.line}`, borderRadius: 18, overflow: "hidden" }}>
        {shown.map((r, i) => (
          <div key={r.id} data-calc-row={r.id} data-calc-alive={r.alive ? "1" : "0"} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderTop: i ? `1px solid ${K.line}` : "none" }}>
            <span aria-hidden="true" style={{ width: 4, height: 22, borderRadius: 2, background: r.color || K.muted, flexShrink: 0 }} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontFamily: K.head, fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
              <span style={{ display: "block", fontSize: 11, color: K.dim, fontVariantNumeric: "tabular-nums" }}>{r.gap ? `−${r.gap} dal primo · ` : "in testa · "}al massimo {nice(r.best)}</span>
            </span>
            <span style={{ fontFamily: K.head, fontWeight: 900, fontSize: 16, fontVariantNumeric: "tabular-nums" }}>{nice(r.points)}</span>
            <span style={{ flexShrink: 0, padding: "3px 8px", borderRadius: 999, fontSize: 10.5, fontWeight: 700, color: r.alive ? K.green : K.muted, background: r.alive ? "rgba(62,214,107,.1)" : "rgba(255,255,255,.05)", border: `1px solid ${r.alive ? "rgba(62,214,107,.4)" : K.line}` }}>{r.alive ? "In corsa" : "Fuori"}</span>
          </div>
        ))}
      </div>
      <p style={{ margin: "6px 2px 0", fontSize: 11, color: K.dim }}>A pari punti vince chi ha più vittorie (poi più secondi posti).</p>
      {dl.length >= 2 && (
        <>
          <h2 style={{ margin: "18px 0 4px", fontFamily: K.head, fontWeight: 900, fontStyle: "italic", fontSize: 17 }}>Prova uno scenario</h2>
          <p style={{ margin: "0 0 8px", fontSize: 12, color: K.muted }}>Scegli due piloti e dove arrivano nelle gare che restano. Le gare lasciate su "–" restano aperte.</p>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {sel(A && A.id, setA, "Primo pilota", B && B.id)}
            <span style={{ fontFamily: K.head, fontWeight: 900, color: K.muted }}>vs</span>
            {sel(B && B.id, setB, "Secondo pilota", A && A.id)}
          </div>
          {sc && (
            <section data-calc-result={sc.decided || "aperto"} aria-live="polite" style={{ position: "sticky", top: 0, zIndex: 2, marginTop: 10, background: "#101013", border: `1px solid ${sc.decided ? accent : K.line}`, borderRadius: 18, padding: 14, boxShadow: "0 10px 24px rgba(0,0,0,.5)" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, fontVariantNumeric: "tabular-nums" }}>
                <span style={{ minWidth: 0, fontFamily: K.head, fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lastName(A.name)}</span>
                <span data-calc-score="" style={{ flexShrink: 0, fontFamily: K.head, fontWeight: 900, fontSize: 24 }}>{sc.pa} – {sc.pb}</span>
                <span style={{ minWidth: 0, fontFamily: K.head, fontWeight: 700, fontSize: 13, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lastName(B.name)}</span>
              </div>
              <div data-calc-verdict="" style={{ marginTop: 6, fontSize: 12.5, color: sc.decided ? K.text : K.muted }}>
                {sc.decided
                  ? `${(sc.decided === "a" ? A : B).name} resta davanti a ${(sc.decided === "a" ? B : A).name} in ogni caso${others.length ? `; per il titolo restano in corsa anche ${others.map(o => o.name).join(", ")}` : ": campione del mondo"}.`
                  : sc.lead === 0 ? `Pari: tutti e due possono ancora fare ${sc.openLeft} punti nelle gare lasciate su "–".`
                  : `${(sc.lead > 0 ? A : B).name} avanti di ${Math.abs(sc.lead)}; ${(sc.lead > 0 ? B : A).name} può recuperare ancora al massimo ${sc.openLeft} punti.`}
              </div>
            </section>
          )}
          <div style={{ marginTop: 10, background: K.card, border: `1px solid ${K.line}`, borderRadius: 18, overflow: "hidden" }}>
            {events.map((e, i) => (
              <div key={e.id} data-calc-event={e.id} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1fr)", gap: 8, alignItems: "center", padding: "8px 12px", borderTop: i ? `1px solid ${K.line}` : "none" }}>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontFamily: K.head, fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.name}</span>
                  <span style={{ fontSize: 10.5, color: e.sprint ? K.gold : K.dim, fontWeight: 700 }}>{e.sprint ? "SPRINT" : "GARA"}</span>
                </span>
                <PosSelect sprint={e.sprint} value={(picks[e.id] || {}).a} taken={(picks[e.id] || {}).b} onChange={v => setPick(e.id, "a", v)} label={`${A ? A.name : "Primo pilota"}: ${e.sprint ? "Sprint" : "gara"} ${e.name}`} />
                <PosSelect sprint={e.sprint} value={(picks[e.id] || {}).b} taken={(picks[e.id] || {}).a} onChange={v => setPick(e.id, "b", v)} label={`${B ? B.name : "Secondo pilota"}: ${e.sprint ? "Sprint" : "gara"} ${e.name}`} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
