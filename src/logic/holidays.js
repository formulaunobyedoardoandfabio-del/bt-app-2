// Temi delle feste (31/10, Edoardo; design in docs/design/temi-feste.html, prove in test/unit/holidays.test.js).
// Ogni festa cambia i pezzi F1 che l'app ha già (colore dei tasti, caricamento, suoni) e porta una sorpresa.
// Date di Roma: Halloween 30 ott – 1 nov, Natale 1 – 26 dic, Befana 5 – 6 gen; Monza dal giovedì al lunedì del GP
// d'Italia (dal calendario). L'admin comanda da Firebase, shared/bt-holidays: { force: id | null, off: [id] }.
(function (root) {
  const HOLIDAYS = {
    halloween: { name: "Halloween", title: "La notte del Ghost Lap", color: "#FF7A1A", from: [10, 30], to: [11, 1],
      sounds: { drs: "howl" } },
    natale: { name: "Natale", title: "Parco chiuso di Natale", color: "#D7263D", from: [12, 1], to: [12, 26],
      sounds: { tick: "bell" } },
    befana: { name: "Befana", title: "La Befana spazza la pista", color: "#F2A541", from: [1, 5], to: [1, 6],
      sounds: { drs: "swoosh" } },
    monza: { name: "Monza", title: "Tempio della velocità", color: "#CE2B37", circuit: "it-1922",
      sounds: { drs: "rev" } },
  };
  const IDS = Object.keys(HOLIDAYS);
  // Data di Roma: [anno, mese, giorno].
  function romeParts(now) {
    const f = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" });
    const [y, m, d] = f.format(new Date(now)).split("-").map(Number);
    return [y, m, d];
  }
  const romeDay = now => { const [y, m, d] = romeParts(now); return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`; };
  const inRange = (m, d, from, to) => { const v = m * 100 + d; return v >= from[0] * 100 + from[1] && v <= to[0] * 100 + to[1]; };
  // Weekend del GP: dal giovedì (3 giorni prima della domenica) al lunedì, in giorni di Roma.
  function raceWeekend(races, circuit, now) {
    const r = (races || []).find(x => x && x.circuitId === circuit);
    if (!r || !r.date) return false;
    const day = Date.parse(String(r.date).slice(0, 10) + "T12:00:00Z"), today = Date.parse(romeDay(now) + "T12:00:00Z");
    const diff = Math.round((today - day) / 86400000);
    return diff >= -3 && diff <= 1;
  }
  function cleanConfig(c) {
    const o = c && typeof c === "object" ? c : {};
    return { force: IDS.includes(o.force) ? o.force : null, off: Array.isArray(o.off) ? o.off.filter(x => IDS.includes(x)) : [] };
  }
  // Festa attiva adesso (o null). config: shared/bt-holidays.
  function activeHoliday({ now = Date.now(), races = [], config = null } = {}) {
    const cfg = cleanConfig(config);
    if (cfg.force) return cfg.force;
    const [, m, d] = romeParts(now);
    const hit = IDS.find(id => {
      if (cfg.off.includes(id)) return false;
      const h = HOLIDAYS[id];
      return h.circuit ? raceWeekend(races, h.circuit, now) : inRange(m, d, h.from, h.to);
    });
    return hit || null;
  }
  const api = { HOLIDAYS, IDS, activeHoliday, cleanConfig, romeDay, romeParts };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.BtHolidays = api;
})(typeof window !== "undefined" ? window : this);
