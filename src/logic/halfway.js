// Avviso di metà gara (8/11, Edoardo: "notifiche di aggiornamento a metà dei giri della gara se l'utente non ha visto la
// partenza"). Partenza vista = app aperta sulla gara in diretta nei primi 15 minuti dal via (da 5 minuti prima, giro di
// formazione). Metà gara = giro del leader da metà (arrotondato in su) a due giri dopo: se si apre più tardi non si
// avvisa. Il riassunto usa i distacchi veri della diretta (OpenF1).
const isNum = v => typeof v === "number" && Number.isFinite(v);

const sawStart = ({ type, ongoing, t } = {}) => type === "RACE" && !!ongoing && isNum(t) && t >= -300 && t <= 900;
const halfLap = total => (isNum(total) && total > 1 ? Math.ceil(total / 2) : null);
function halfwayDue({ totalLaps, lap } = {}) {
  const h = halfLap(totalLaps);
  return h != null && isNum(lap) && lap >= h && lap <= h + 2;
}
const fmtGap = g => (isNum(g) && g > 0 ? "+" + g.toFixed(1).replace(".", ",") + " s" : null);
function topThree(cars) {
  return (Array.isArray(cars) ? cars : []).filter(c => c && !c.dnf && isNum(c.pos) && c.pos > 0).sort((a, b) => a.pos - b.pos).slice(0, 3)
    .map(c => ({ id: c.id, code: c.code, pos: c.pos, gap: c.pos === 1 ? null : c.lapsDown ? `+${c.lapsDown} ${c.lapsDown === 1 ? "giro" : "giri"}` : fmtGap(c.gap) }));
}
function summaryText(top) {
  if (!Array.isArray(top) || !top.length) return "";
  const [a, ...rest] = top;
  const part = c => c.code + (c.gap ? ` (${c.gap})` : "");
  if (!rest.length) return `${a.code} in testa`;
  return `${a.code} davanti a ${rest.map(part).join(" e ")}`;
}

// Testo della notifica vera di metà gara (8/11): giro, nome del GP se c'è, primi tre coi distacchi.
function halfwayNotice({ raceName = "", lap, total, top } = {}) {
  const txt = summaryText(top);
  if (!txt) return null;
  return { title: `Metà gara · Giro ${lap}/${total}`, body: (raceName ? raceName + ": " : "") + txt };
}

module.exports = { sawStart, halfLap, halfwayDue, topThree, summaryText, halfwayNotice };
