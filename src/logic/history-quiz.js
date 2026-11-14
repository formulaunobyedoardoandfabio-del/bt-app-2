// Domande di storia del weekend (13/11, Edoardo: "cambino da sole in base al weekend di gara; l'admin le può
// aggiungere o togliere"). Si fanno dai dati veri del circuito (src/data/circuit-info.json: primo GP, anno di nascita,
// record sul giro in gara, curve, giri). Solo dati veri: se un dato manca, quella domanda non c'è; le risposte sbagliate
// sono anni vicini o altri primatisti veri, mai nomi inventati. Tre per weekend, una per gruppo, a rotazione col round.
// Gli id cominciano con "auto:<gara>:h-": come le previsioni automatiche restano legati alla gara (i punti non si perdono).
const PREFIX = "auto:";
const isObj = v => !!v && typeof v === "object" && !Array.isArray(v);
const isHistoryAuto = id => typeof id === "string" && /^auto:[^:]+:h-/.test(id);
const roundOf = r => (Number.isInteger(Number(r.round)) && Number(r.round) > 0 ? Number(r.round) : /^r(\d+)$/.test(r.id || "") ? Number(r.id.slice(1)) : 0);

// Caso sempre uguale per la stessa chiave: la domanda (e l'ordine delle risposte) è la stessa per tutti e a ogni apertura.
function seedOf(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function shuffle(list, rnd) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const slug = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Tre numeri sbagliati vicini a quello giusto, dentro [min, max] e diversi da quelli da evitare.
const YEAR_OFFS = [-12, -9, -7, -5, -4, -3, -2, 2, 3, 4, 5, 7, 9];
function near(value, offs, rnd, { min = -Infinity, max = Infinity, avoid = [] } = {}) {
  const out = [];
  for (const o of shuffle(offs, rnd)) {
    const v = value + o;
    if (v < min || v > max || avoid.includes(v) || out.includes(v)) continue;
    out.push(v);
    if (out.length === 3) break;
  }
  return out.length === 3 ? out : null;
}

// Tutte le domande che si possono fare su una gara, divise per gruppo (una sola per gruppo va nel weekend).
function grouped(race, info, { season = new Date().getFullYear() } = {}) {
  if (!isObj(race) || !race.id || !isObj(info)) return [];
  const i = info[race.circuitId];
  if (!isObj(i)) return [];
  const name = race.circuit || race.name || "Questo circuito";
  const make = (key, text, answer, wrong, note, extra) => {
    const rnd = rng(seedOf(race.id + ":" + key + ":o"));
    const options = shuffle([answer, ...wrong], rnd).map(o => (Array.isArray(o) ? o : [String(o), String(o)]));
    return { id: `${PREFIX}${race.id}:h-${key}`, kind: "history", cat: "Storia", raceId: race.id, auto: true, q: text, answer: Array.isArray(answer) ? answer[0] : String(answer), options, note, ...extra };
  };
  const rndOf = key => rng(seedOf(race.id + ":" + key));
  const first = Number.isInteger(i.firstGP) ? i.firstGP : null, built = Number.isInteger(i.built) ? i.built : null;
  const years = [], record = [], track = [];

  // Gruppo "anni": primo GP di Formula 1 qui, oppure anno di nascita del circuito (se non è lo stesso anno).
  if (first != null && first < season) {
    const wrong = near(first, YEAR_OFFS, rndOf("first"), { min: 1950, max: season - 1, avoid: built != null ? [built] : [] });
    if (wrong) years.push(make("first", `${name}: in che anno ci ha corso per la prima volta la Formula 1?`, first, wrong, `La Formula 1 ha corso qui per la prima volta nel ${first}.`));
  }
  if (built != null && first != null && Math.abs(built - first) >= 2 && built < season) {
    const wrong = near(built, YEAR_OFFS, rndOf("built"), { min: 1900, max: season - 1, avoid: [first] });
    if (wrong) years.push(make("built", `${name}: in che anno è nato il circuito?`, built, wrong, `Il circuito è nato nel ${built}.`));
  }

  // Gruppo "record": chi ha il record sul giro in gara, oppure di che anno è.
  const lr = isObj(i.lapRecord) ? i.lapRecord : null;
  if (lr && typeof lr.driver === "string" && lr.driver.trim()) {
    const line = `Record sul giro in gara: ${lr.time}, ${lr.driver}, ${lr.year}.`;
    const others = [...new Set(Object.values(info).map(x => (isObj(x) && isObj(x.lapRecord) ? x.lapRecord.driver : null)).filter(d => typeof d === "string" && d.trim() && d !== lr.driver))].sort();
    if (others.length >= 3 && lr.time) {
      const wrong = shuffle(others, rndOf("rec")).slice(0, 3).map(d => [slug(d), d]);
      record.push(make("rec", `${name}: chi ha il record sul giro in gara?`, [slug(lr.driver), lr.driver], wrong, line));
    }
    if (Number.isInteger(lr.year) && first != null && lr.time) {
      const wrong = near(lr.year, YEAR_OFFS, rndOf("recyear"), { min: first, max: Math.max(lr.year, season - 1) });
      if (wrong) record.push(make("recyear", `${name}: di che anno è il record sul giro in gara?`, lr.year, wrong, line));
    }
  }

  // Gruppo "pista": quante curve, oppure quanti giri dura il Gran Premio.
  if (Number.isInteger(i.corners) && i.corners > 6) {
    const wrong = near(i.corners, [-5, -4, -3, -2, 2, 3, 4, 5], rndOf("corners"), { min: 5 });
    if (wrong) track.push(make("corners", `${name}: quante curve ha il circuito?`, i.corners, wrong, `Le curve sono ${i.corners}.`, { badge: "CIRCUITO" }));
  }
  if (Number.isInteger(i.laps) && i.laps > 20) {
    const wrong = near(i.laps, [-9, -6, -4, -3, 3, 4, 6, 9], rndOf("laps"), { min: 20 });
    const km = typeof i.distanceKm === "number" ? `, ${String(i.distanceKm).replace(".", ",")} km` : "";
    if (wrong) track.push(make("laps", `${name}: quanti giri dura il Gran Premio?`, i.laps, wrong, `Il Gran Premio dura ${i.laps} giri${km}.`, { badge: "CIRCUITO" }));
  }
  return [years, record, track];
}

const pool = (race, info, opts) => grouped(race, info, opts).flat();

// Le domande del weekend: una per gruppo (al massimo tre), quale lo decide il round, così cambiano da una gara all'altra.
function questionsFor(race, info, opts) {
  const groups = grouped(race, info, opts);
  if (!groups.length) return [];
  const round = roundOf(race);
  return groups.map((g, gi) => (g.length ? g[(round + gi) % g.length] : null)).filter(Boolean);
}

// Senza quelle che l'admin ha tolto (hidden: lista di id).
const visible = (questions, hidden) => {
  const off = new Set(Array.isArray(hidden) ? hidden : []);
  return (Array.isArray(questions) ? questions : []).filter(q => q && !off.has(q.id));
};

module.exports = { PREFIX, isHistoryAuto, pool, questionsFor, visible };
