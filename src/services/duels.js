// Sfide 1 contro 1 (1/11, Edoardo: "fai tutto il resto"): un tifoso sfida un amico della sua lega al Pit Stop Challenge
// col suo miglior tempo; l'amico ha un solo tentativo per batterlo. Tutto in fanta/pitswipe-sfide (elenco con arrayUnion):
// { t: "c", id, from, fromName, to, toName, game: "pit", time, at } sfida; { t: "r", id, aid, time, at } risposta.
// Una sfida senza risposta scade dopo 7 giorni.
const FB = require("./firebase");
const COL = "fanta", DOC = "pitswipe-sfide", DAY = 86400000;
const isNum = v => typeof v === "number" && isFinite(v) && v > 0;

// Le sfide di un tifoso: da giocare (todo), in attesa dell'altro (waiting), finite (won / lost / tie). Le più nuove prima.
function duelState(arr, me, now = Date.now()) {
  const list = Array.isArray(arr) ? arr.filter(x => x && typeof x === "object") : [];
  const replies = {};
  list.filter(x => x.t === "r" && x.id && x.aid && isNum(x.time)).forEach(r => { if (!replies[r.id]) replies[r.id] = r; });   // conta il primo tentativo
  return list.filter(c => c.t === "c" && c.id && isNum(c.time) && (c.from === me || c.to === me) && c.from !== c.to)
    .map(c => {
      const r = replies[c.id] && replies[c.id].aid === c.to ? replies[c.id] : null;
      const mine = c.from === me;
      let status;
      if (!r) status = now - (c.at || 0) > 7 * DAY ? "expired" : mine ? "waiting" : "todo";
      else if (r.time === c.time) status = "tie";
      else status = (r.time < c.time) === !mine ? "won" : "lost";
      return { id: c.id, mine, other: mine ? c.toName : c.fromName, otherAid: mine ? c.to : c.from, myTime: mine ? c.time : (r ? r.time : null), theirTime: mine ? (r ? r.time : null) : c.time, status, at: c.at || 0 };
    })
    .filter(d => d.status !== "expired")
    .sort((a, b) => b.at - a.at);
}

function createDuels({ dbGet = FB.dbGet, docAppend = FB.docAppend, now = () => Date.now(), rand = Math.random } = {}) {
  async function load() { const d = await dbGet(COL, DOC); return d && Array.isArray(d.__arr) ? d.__arr : []; }
  async function challenge({ from, fromName, to, toName, time }) {
    if (!from || !to || from === to || !isNum(time)) throw new Error("sfida non valida");
    const item = { t: "c", id: "s" + now().toString(36) + Math.floor(rand() * 1e4).toString(36), from, fromName: String(fromName || "Tifoso").slice(0, 30), to, toName: String(toName || "Tifoso").slice(0, 30), game: "pit", time: Math.round(time * 1000) / 1000, at: now() };
    await docAppend(COL, DOC, item);
    return item;
  }
  async function reply({ id, aid, time }) {
    if (!id || !aid || !isNum(time)) throw new Error("risposta non valida");
    const item = { t: "r", id, aid, time: Math.round(time * 1000) / 1000, at: now() };
    await docAppend(COL, DOC, item);
    return item;
  }
  return { load, challenge, reply };
}

module.exports = { createDuels, duelState };
