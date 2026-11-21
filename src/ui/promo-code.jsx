// 21/11 (Edoardo, primo video "Digit Spin"): 6 caselle; ogni cifra scritta arriva girando come un rullo di slot
// machine; col codice giusto tutte le cifre girano un'altra volta, una dopo l'altra, e le caselle diventano verdi.
// Tempi "Smooth" del secondo allegato: stagger 65 ms, ogni cifra 260 ms ease-out; la scheda entra a molla (ω0 16,
// ζ 0.62). Solo transform/opacity; con "Rimuovi animazioni" le cifre compaiono ferme.
import React, { useState } from "react";

export const PROMO_STAGGER_MS = 65, PROMO_SPIN_MS = 260;
const SPRING_W = 16, SPRING_Z = 0.62, SPRING_MS = 600;
// Molla smorzata (ω0, ζ) in 21 fotogrammi: spostamento x(t) = 1 - e^(-ζω0 t) (cos ωd t + ζω0/ωd sin ωd t).
function springKeyframes() {
  const a = SPRING_Z * SPRING_W, wd = SPRING_W * Math.sqrt(1 - SPRING_Z * SPRING_Z);
  let out = "";
  for (let i = 0; i <= 20; i++) {
    const t = (i / 20) * (SPRING_MS / 1000);
    const x = i === 20 ? 1 : 1 - Math.exp(-a * t) * (Math.cos(wd * t) + (a / wd) * Math.sin(wd * t));
    out += `${i * 5}%{transform:translateY(${((1 - x) * 28).toFixed(2)}px) scale(${(0.94 + 0.06 * x).toFixed(4)});opacity:${Math.min(1, x * 2.5).toFixed(3)}}`;
  }
  return `@keyframes pcSpring{${out}}`;
}
export const PROMO_CSS = springKeyframes()
  + "@keyframes pcReel{from{transform:translateY(0)}to{transform:translateY(-75%)}}"
  + "@keyframes pcShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(3px)}}"
  + `.pc-card{animation:pcSpring ${SPRING_MS}ms linear both}`
  + `.pc-reel{display:flex;flex-direction:column;animation:pcReel ${PROMO_SPIN_MS}ms cubic-bezier(.2,.8,.2,1) both}`
  + ".pc-reel>span{display:flex;align-items:center;justify-content:center;height:var(--pc-h)}"
  + ".pc-shake{animation:pcShake 320ms ease-out}"
  + "@media (prefers-reduced-motion: reduce){.pc-card,.pc-shake{animation:none}.pc-reel{animation:none;transform:translateY(-75%)}}";

// Le tre cifre che passano prima di quella vera (sempre le stesse per casella e cifra: niente sfarfallio).
const pass = (d, i, run) => [0, 1, 2].map(k => String((Number(d) + 3 + k * 3 + i + run * 7) % 10));

// value: le cifre scritte (stringa). status: "idle" | "checking" | "ok" | "err". run: cresce a ogni verifica (rifà i giri).
export function PromoCodeInput({ value = "", onChange, status = "idle", run = 0, accent = "#7C5CFF", ok = "#2BD9A0", bad = "#FF5A5F", text = "#fff", border = "rgba(255,255,255,.14)", font = "inherit", disabled = false }) {
  const [focus, setFocus] = useState(false);
  const digits = String(value).split("");
  const H = 52;
  const okBg = "rgba(43,217,160,.12)";
  return (
    <div style={{ position: "relative" }} data-promo-code="" data-promo-status={status}>
      <div key={status === "err" ? "err" + run : "row"} className={status === "err" ? "pc-shake" : undefined} style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        {Array.from({ length: 6 }, (_, i) => {
          const d = digits[i];
          const active = focus && !disabled && status !== "ok" && i === Math.min(digits.length, 5);
          const col = status === "ok" ? ok : status === "err" ? bad : active ? accent : border;
          const again = status === "ok";
          return (
            <div key={i} data-promo-box={i} data-promo-digit={d || ""} style={{ flex: "1 1 0", minWidth: 0, maxWidth: 48, height: H, borderRadius: 12, border: `2px solid ${col}`, background: again ? okBg : "rgba(255,255,255,.04)", overflow: "hidden", "--pc-h": H - 4 + "px" }}>
              {d != null && (
                <span className="pc-reel" key={again ? `ok${run}` : `d${d}`} data-promo-reel="" style={{ animationDelay: again ? i * PROMO_STAGGER_MS + "ms" : "0ms", fontFamily: font, fontWeight: 800, fontSize: 24, color: again ? ok : text }}>
                  {[...pass(d, i, again ? run + 1 : 0), d].map((x, k) => <span key={k} aria-hidden={k < 3 ? "true" : undefined}>{x}</span>)}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <input data-promo-input="" value={value} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={6} aria-label="Codice promo di 6 cifre" disabled={disabled}
        onChange={e => onChange && onChange(e.target.value.replace(/\D/g, "").slice(0, 6))} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, fontSize: 16, caretColor: "transparent", border: 0, padding: 0 }} />
    </div>
  );
}
