// Voti di Pit Swipe (1/11): opinioni (k "t", v 1 d'accordo / -1 no) e "giro veloce" delle notizie (k "f", v 1), tutti in
// fanta/pitswipe-voti come elenco (__arr, arrayUnion: due voti insieme non si perdono). Si conta l'ultimo voto di ogni
// account (src/logic/pitswipe.js, tallyVotes). fanta/* è già scrivibile da chi ha l'accesso (docs/firestore.rules).
const FB = require("./firebase");
const COL = "fanta", DOC = "pitswipe-voti";

function createSwipeVotes({ dbGet = FB.dbGet, docAppend = FB.docAppend, now = () => Date.now() } = {}) {
  async function load() {
    const d = await dbGet(COL, DOC);
    return d && Array.isArray(d.__arr) ? d.__arr : [];
  }
  async function vote({ k, id, aid, v }) {
    if ((k !== "t" && k !== "f") || id == null || id === "" || !aid || (v !== 1 && v !== -1)) throw new Error("voto non valido");
    const item = { k, id: String(id).slice(0, 80), aid: String(aid).slice(0, 40), v, at: now() };
    await docAppend(COL, DOC, item);
    return item;
  }
  return { load, vote };
}

module.exports = { createSwipeVotes };
