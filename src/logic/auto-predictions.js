// Previsioni automatiche (8/11, Edoardo: "rendi automatico tutto"). Per la gara del weekend l'app fa da sola le domande
// di sempre e le corregge coi risultati veri della stagione (Jolpica, gli stessi del FantaF1: src/logic/fanta-season.js
// → [{ round, race: { order, fastest }, quali: { order }, sprint }]). Le domande dell'admin restano e si aggiungono.
// Niente risposte inventate: se un risultato non c'è ancora, la domanda resta senza risposta.
const isObj = v => !!v && typeof v === "object" && !Array.isArray(v);
const PREFIX = "auto:";
const isAuto = id => typeof id === "string" && id.startsWith(PREFIX);
const roundOf = r => (r && Number.isInteger(Number(r.round)) && Number(r.round) > 0 ? Number(r.round) : r && /^r(\d+)$/.test(r.id || "") ? Number(r.id.slice(1)) : null);

// Domande del weekend di una gara (id fissi: le risposte di ognuno restano legate).
function questionsFor(race, { sprint = false } = {}) {
  if (!isObj(race) || !race.id) return [];
  const n = race.name || "GP";
  const round = roundOf(race);
  const q = (key, kind, about, text, cat) => ({ id: `${PREFIX}${race.id}:${key}`, kind, cat, about, raceId: race.id, round, q: text, answer: null, auto: true });
  return [
    q("pole", "driver", "QUALI", `Chi fa la pole al ${n}?`, "Pilota"),
    ...(sprint ? [q("sprint", "driver", "SPRINT", `Chi vince la Sprint del ${n}?`, "Pilota")] : []),
    q("win", "driver", "RACE", `Chi vince il ${n}?`, "Pilota"),
    q("team", "team", "RACE", `Quale scuderia vince il ${n}?`, "Scuderia"),
    q("fast", "driver", "RACE", `Chi fa il giro più veloce al ${n}?`, "Pilota"),
    q("dnf", "number", "RACE", `Quanti piloti non arrivano al traguardo al ${n}?`, "Numero"),
  ];
}

const firstOf = s => (s && Array.isArray(s.order) ? (s.order.find(x => x && x.pos === 1) || null) : null);

// Risposta di una domanda dai risultati del suo round (null se manca).
function answerOf(key, round, teamOf) {
  if (!isObj(round)) return null;
  if (key === "pole") { const p = firstOf(round.quali); return p ? p.id : null; }
  if (key === "sprint") { const p = firstOf(round.sprint); return p ? p.id : null; }
  const race = round.race;
  if (!race || !Array.isArray(race.order) || !race.order.length) return null;
  if (key === "win") { const p = firstOf(race); return p ? p.id : null; }
  if (key === "team") { const p = firstOf(race); return p && teamOf ? teamOf(p.id) || null : null; }
  if (key === "fast") return race.fastest || null;
  if (key === "dnf") return race.order.filter(x => x && x.dnf).length;
  return null;
}

function withAnswers(questions, rounds, { teamOf = null } = {}) {
  const byRound = new Map((Array.isArray(rounds) ? rounds : []).filter(isObj).map(r => [r.round, r]));
  return (Array.isArray(questions) ? questions : []).map(q => {
    if (!q || !isAuto(q.id)) return q;
    const [, raceId, key] = q.id.split(":");
    const round = byRound.get(q.round != null ? q.round : roundOf({ id: raceId }));
    const a = answerOf(key, round, teamOf);
    return a == null ? q : { ...q, answer: a };
  });
}

// Gare per cui fare le domande: quella del weekend e quelle a cui ho già risposto (i punti restano).
function racesToAsk(races, { current = null, answered = {} } = {}) {
  const ids = new Set(Object.keys(isObj(answered) ? answered : {}).filter(isAuto).map(k => k.split(":")[1]));
  if (current && current.id) ids.add(current.id);
  return (Array.isArray(races) ? races : []).filter(r => r && ids.has(r.id));
}

module.exports = { PREFIX, isAuto, roundOf, questionsFor, withAnswers, racesToAsk, answerOf };
