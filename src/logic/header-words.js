// Scritta in alto a sinistra (16/11, Edoardo: "usa questo codice per la parola sector 4 e fai che cambia"; prove in
// test/unit/header-words.test.js). Dal 21/11 di serie c'è SECTOR 4 e le parole escono solo toccandola (vedi tapWord).
// Le parole del momento dipendono dall'ora di chi usa l'app:
// giorno della gara, giorno della qualifica (gli orari veri da circuit-info.json; senza orari il giorno della data
// e quello prima), notte da mezzanotte alle 5, altrimenti giorno normale. Il weekend vince sulla notte.
// Toccandola ne esce una a caso tra le motivazionali, mai quella che c'è già. Tutte al massimo 9 caratteri.
(function (root) {
  const WORDS = {
    race: ["RACE DAY", "BOX NOW!", "RED LIGHT"],
    quali: ["FULL GAS", "POLE POS", "TIME ATT"],
    normal: ["DEEP TECH", "ANALYZE", "COLD LAP"],
    night: ["NIGHT SHI", "ROUGH MAP"],
  };
  // Mindset, terminale, accelerazione (nell'ordine dato da Edoardo).
  const TAP = ["LEVEL UP", "GO HARD!", "NO LIMIT", "BREAK IT", "OVERRIDE", "EXECUTE!", "ROOT ACC", "SYS_RDY", "FULL GAS", "FAST LAP", "PUSH NOW"];
  const NIGHT_FROM = 0, NIGHT_TO = 5;   // ore: dalle 00:00 alle 04:59

  // Giorno (AAAA-MM-GG) e ora di un istante nel fuso tz (senza tz: quello del telefono). null se l'istante non è valido.
  function dayParts(ms, tz) {
    if (!Number.isFinite(ms)) return null;
    try {
      const o = { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" };
      if (tz) o.timeZone = tz;
      const p = {};
      for (const x of new Intl.DateTimeFormat("en-CA", o).formatToParts(new Date(ms))) p[x.type] = x.value;
      return { day: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) % 24 };
    } catch (e) { return null; }
  }
  const ISO_DAY = /^\d{4}-\d{2}-\d{2}/;
  const dayBefore = d => { const t = Date.parse(d + "T12:00:00Z") - 864e5; return new Date(t).toISOString().slice(0, 10); };
  // Giorni (nel fuso tz) di qualifica e gara di una gara del calendario.
  function weekendDays(race, info, tz) {
    if (!race || typeof race !== "object") return null;
    const wk = info && race.circuitId && info[race.circuitId] && Array.isArray(info[race.circuitId].weekend) ? info[race.circuitId].weekend : null;
    const at = key => { const s = wk && wk.find(x => x && x.key === key); const p = s ? dayParts(Date.parse(s.utc), tz) : null; return p ? p.day : null; };
    let raceDay = at("RACE"), qualiDay = at("QUALI");
    const d = typeof race.date === "string" && ISO_DAY.test(race.date) ? race.date.slice(0, 10) : null;
    if (!raceDay && d) raceDay = d;
    if (!qualiDay && raceDay && !wk) qualiDay = dayBefore(raceDay);
    return raceDay ? { raceDay, qualiDay } : null;
  }
  // "race" | "quali" | "night" | "normal"
  function moodOf({ now = Date.now(), races = [], info = {}, tz } = {}) {
    const p = dayParts(now, tz);
    if (!p) return "normal";
    let quali = false;
    for (const r of Array.isArray(races) ? races : []) {
      const w = weekendDays(r, info, tz);
      if (!w) continue;
      if (w.raceDay === p.day) return "race";
      if (w.qualiDay === p.day) quali = true;
    }
    if (quali) return "quali";
    return p.hour >= NIGHT_FROM && p.hour < NIGHT_TO ? "night" : "normal";
  }
  const cleanRand = r => (Number.isFinite(r) && r >= 0 && r < 1 ? r : 0);
  const pickFrom = (list, rand) => list[Math.min(list.length - 1, Math.floor(cleanRand(rand) * list.length))];
  const contextWord = ({ rand, ...rest } = {}) => pickFrom(WORDS[moodOf(rest)] || WORDS.normal, rand);
  // 21/11 (Edoardo: "le scritte devono comparire solo quando si clicca su Sector 4, e dopo poco tornare a Sector 4"):
  // di serie HOME; il tocco ne fa uscire una a caso tra quelle del momento (ctx: now, races, info, tz) e le
  // motivazionali, mai quella che c'è già; dopo SHOW_MS l'app torna a HOME.
  const HOME = "SECTOR 4", SHOW_MS = 3000;
  const tapWord = (current, rand, ctx = {}) => pickFrom([...new Set([...(WORDS[moodOf(ctx)] || WORDS.normal), ...TAP])].filter(w => w !== current && w !== HOME), rand);
  const allWords = () => [...new Set([HOME, ...WORDS.race, ...WORDS.quali, ...WORDS.normal, ...WORDS.night, ...TAP])];

  const api = { WORDS, TAP, HOME, SHOW_MS, moodOf, contextWord, tapWord, allWords };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.BtHeaderWords = api;
})(typeof window !== "undefined" ? window : this);
