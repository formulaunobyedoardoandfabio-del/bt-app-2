// Archivio storico dei GP (14/11): le gare degli anni passati, da FastF1 (tools/fastf1_archivio.py → workflow
// archivio-f1.yml → public/data/archivio sul sito). index.json dice gli anni che ci sono; <anno>.json le gare, nello
// stesso formato di public/data/f1/weekend.json (src/logic/replay.js le fa riguardare). Ogni anno si scarica una volta
// per apertura dell'app (con l'impronta nell'indirizzo: un file rifatto non resta nella cache del telefono).
// Senza rete o con un file rotto: null, e la volta dopo si riprova. Prove: test/unit/archive.test.js.
const BASE = "https://bt-app-2.vercel.app/data/archivio/";

const okRace = r => r && Number.isFinite(r.round) && r.drivers && typeof r.drivers === "object";
const validSeason = j => !!(j && Number.isFinite(j.year) && Array.isArray(j.races) && j.races.every(okRace));
const validIndex = j => !!(j && Array.isArray(j.years) && j.years.every(y => y && Number.isFinite(y.year)));

function createArchive({ fetch: f = (...a) => fetch(...a), base = BASE } = {}) {
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
  return { index, season };
}

module.exports = { createArchive, validSeason, validIndex, BASE };
