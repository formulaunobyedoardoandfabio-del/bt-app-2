// Temi delle feste (31/10, Edoardo; design in docs/design/temi-feste.html, prove in test/unit/holidays.test.js).
// Ogni festa cambia i pezzi F1 che l'app ha già (colore dei tasti, caricamento, suoni) e porta una sorpresa.
// Date di Roma: Halloween 30 ott – 1 nov, Natale 1 – 26 dic, Befana 5 – 6 gen; Monza dal giovedì al lunedì del GP
// d'Italia (dal calendario); 1/11 sera: Black Friday dal venerdì dopo il quarto giovedì di novembre al lunedì dopo.
// L'admin comanda da Firebase, shared/bt-holidays: { force: id | null, off: [id] }.
// sale: sconto del Premium in quella festa (percentuale). Vale davvero solo se c'è anche nel negozio: nell'app l'offerta
// di Google Play con lo stesso nome (blackfriday, natale, befana, monza), sul sito il coupon di Stripe STRIPE_COUPON_<NOME>.
(function (root) {
  const HOLIDAYS = {
    halloween: { name: "Halloween", title: "La notte del Ghost Lap", color: "#FF7A1A", from: [10, 30], to: [11, 1],
      sounds: { drs: "howl" } },
    blackfriday: { name: "Black Friday", title: "Black Friday ai box", color: "#E7B34C", blackFriday: true,
      sounds: { tick: "gun" }, sale: 50 },
    natale: { name: "Natale", title: "Parco chiuso di Natale", color: "#D7263D", from: [12, 1], to: [12, 26],
      sounds: { tick: "bell" }, sale: 30 },
    befana: { name: "Befana", title: "La Befana spazza la pista", color: "#F2A541", from: [1, 5], to: [1, 6],
      sounds: { drs: "swoosh" }, sale: 20 },
    monza: { name: "Monza", title: "Tempio della velocità", color: "#CE2B37", circuit: "it-1922",
      sounds: { drs: "rev" }, sale: 25 },
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
  // Black Friday: il venerdì dopo il quarto giovedì di novembre, fino al lunedì dopo (Cyber Monday).
  function blackFriday(now) {
    const [y, m, d] = romeParts(now);
    if (m !== 11 && m !== 12) return false;
    const first = new Date(Date.UTC(y, 10, 1)).getUTCDay();           // 0 = domenica
    const thu4 = 1 + ((4 - first + 7) % 7) + 21, fri = thu4 + 1;       // giorno di novembre
    const v = m === 11 ? d : 30 + d;                                   // dicembre dopo il 30 novembre
    return v >= fri && v <= fri + 3;
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
      return h.circuit ? raceWeekend(races, h.circuit, now) : h.blackFriday ? blackFriday(now) : inRange(m, d, h.from, h.to);
    });
    return hit || null;
  }
  // Sconto del Premium adesso: { id, name, pct } o null.
  const saleOf = id => (id && HOLIDAYS[id] && HOLIDAYS[id].sale ? { id, name: HOLIDAYS[id].name, pct: HOLIDAYS[id].sale } : null);
  const api = { HOLIDAYS, IDS, activeHoliday, cleanConfig, romeDay, romeParts, blackFriday, saleOf };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.BtHolidays = api;
})(typeof window !== "undefined" ? window : this);
