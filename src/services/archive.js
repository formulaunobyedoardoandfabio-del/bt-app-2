// Archivio storico dei GP (14/11): le gare degli anni passati, da FastF1 (tools/fastf1_archivio.py → workflow
// archivio-f1.yml → public/data/archivio sul sito). index.json dice gli anni che ci sono; <anno>.json le gare, nello
// stesso formato di public/data/f1/weekend.json (src/logic/replay.js le fa riguardare). Ogni anno si scarica una volta
// per apertura dell'app (con l'impronta nell'indirizzo: un file rifatto non resta nella cache del telefono).
// Senza rete o con un file rotto: null, e la volta dopo si riprova. Prove: test/unit/archive.test.js.
const BASE = "https://bt-app-2.vercel.app/data/archivio/";
// 15/11: replay sulla mappa delle gare finite (tools/openf1_replay.py → public/data/replay, src/logic/track-replay.js).
const REPLAY_BASE = "https://bt-app-2.vercel.app/data/replay/";

const okRace = r => r && Number.isFinite(r.round) && r.drivers && typeof r.drivers === "object";
const validSeason = j => !!(j && Number.isFinite(j.year) && Array.isArray(j.races) && j.races.every(okRace));
const validIndex = j => !!(j && Array.isArray(j.years) && j.years.every(y => y && Number.isFinite(y.year)));
const validReplay = j => !!(j && j.v === 1 && Array.isArray(j.line) && j.line.length >= 3 && Array.isArray(j.drivers) && j.drivers.length && j.drivers.every(d => d && Array.isArray(d.p)));
// Il replay di una gara dalla data (YYYY-MM-DD), con un giorno di tolleranza per i fusi orari.
function findReplay(list, date) {
  const d = Date.parse(String(date || "").slice(0, 10) + "T12:00:00Z");
  if (!Array.isArray(list) || !Number.isFinite(d)) return null;
  return list.find(r => r && Math.abs(Date.parse(r.date + "T12:00:00Z") - d) <= 86400000) || null;
}

function createArchive({ fetch: f = (...a) => fetch(...a), base = BASE, replayBase = REPLAY_BASE } = {}) {
  let idx = null, idxP = null;
  const seasons = new Map();
  const getJSON = url => Promise.resolve().then(() => f(url)).then(r => (r && r.ok ? r.json() : null)).catch(() => null);
  const index = () => {
    if (idx) return Promise.resolve(idx);
    if (!idxP) idxP = getJSON(base + "index.json").then(j => {
      idxP = null;
      if (!validIndex(j)) return null;
      idx = j.years.slice().sort((a, b) => b.year - a.year);
      return idx;
    });
    return idxP;
  };
  const season = year => {
    if (seasons.has(year)) return seasons.get(year);
    const p = index().then(list => {
      const h = list && (list.find(y => y.year === year) || {}).h;
      return getJSON(base + year + ".json" + (h ? "?h=" + encodeURIComponent(h) : ""));
    }).then(j => (validSeason(j) ? j : null));
    seasons.set(year, p);
    p.then(v => { if (!v) seasons.delete(year); });   // non arrivata: si riprova la volta dopo
    return p;
  };
  let rList = null, rListP = null;
  const reps = new Map();
  const replays = () => {
    if (rList) return Promise.resolve(rList);
    if (!rListP) rListP = getJSON(replayBase + "index.json").then(j => {
      rListP = null;
      if (!j || !Array.isArray(j.races)) return null;
      rList = j.races.filter(r => r && Number.isFinite(r.key) && r.date);
      return rList;
    });
    return rListP;
  };
  const replay = key => {
    if (reps.has(key)) return reps.get(key);
    const p = replays().then(list => {
      const h = list && (list.find(r => r.key === key) || {}).h;
      return getJSON(replayBase + key + ".json" + (h ? "?h=" + encodeURIComponent(h) : ""));
    }).then(j => (validReplay(j) ? j : null));
    reps.set(key, p);
    p.then(v => { if (!v) reps.delete(key); });
    return p;
  };
  return { index, season, replays, replay };
}

module.exports = { createArchive, validSeason, validIndex, validReplay, findReplay, BASE, REPLAY_BASE };
