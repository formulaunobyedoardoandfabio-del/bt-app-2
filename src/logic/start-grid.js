// Griglia di partenza dopo la qualifica (8/11, Edoardo: "dopo la qualifica mostra la griglia di partenza come durante
// una rossa, poi anche le posizioni aggiornate alle penalità"). Solo dati veri:
// - quali: le auto della qualifica finita ({ number, code, color, pos }), dal replay di OpenF1;
// - official: la griglia ufficiale di OpenF1 (starting_grid: driver_number, position), che arriva quando la FIA la
//   pubblica; prima non c'è e si mostra l'ordine della qualifica senza spostare nessuno;
// - rc: i messaggi della direzione gara: se dicono una penalità in griglia (posti, partenza in fondo o dalla pit
//   lane) il pilota ha l'etichetta, ma la posizione cambia solo con la griglia ufficiale.
const isNum = v => typeof v === "number" && Number.isFinite(v);

function penaltyTags(rc) {
  const out = new Map();
  (Array.isArray(rc) ? rc : []).forEach(m => {
    const msg = String((m && m.message) || "").toUpperCase();
    const car = /CAR (\d+)/.exec(msg);
    if (!car) return;
    const n = Number(car[1]);
    const places = /(\d+)[- ]PLACE GRID PENALTY/.exec(msg);
    if (places) out.set(n, `${places[1]} posti di penalità`);
    else if (/BACK OF THE GRID/.test(msg)) out.set(n, "parte in fondo");
    else if (/PIT ?LANE/.test(msg) && /START/.test(msg)) out.set(n, "parte dalla pit lane");
  });
  return out;
}

function buildStartGrid({ quali = [], official = [], rc = [] } = {}) {
  const Q = (Array.isArray(quali) ? quali : []).filter(c => c && isNum(c.number) && isNum(c.pos) && c.pos > 0).sort((a, b) => a.pos - b.pos);
  const O = new Map((Array.isArray(official) ? official : []).filter(r => r && isNum(r.driver_number) && isNum(r.position) && r.position > 0).map(r => [r.driver_number, r.position]));
  const tags = penaltyTags(rc);
  const hasOfficial = O.size > 0 && Q.some(c => O.has(c.number));
  const rows = Q.map(c => {
    const grid = hasOfficial && O.has(c.number) ? O.get(c.number) : null;
    return { number: c.number, code: c.code, color: c.color, id: c.id, quali: c.pos, grid, delta: grid == null ? null : c.pos - grid, tag: tags.get(c.number) || null };
  });
  if (hasOfficial) rows.sort((a, b) => (a.grid == null ? 99 : a.grid) - (b.grid == null ? 99 : b.grid) || a.quali - b.quali);
  return { official: hasOfficial, changed: hasOfficial && rows.some(r => r.delta !== 0), rows };
}

module.exports = { buildStartGrid, penaltyTags };
