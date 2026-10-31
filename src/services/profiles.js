// Profilo pubblico dei tifosi (31/10 sera, prove in test/unit/profiles.test.js).
// Prima tifo, casco e trofei viaggiavano solo coi messaggi della chat: chi non aveva ancora scritto con l'app nuova
// aveva il profilo vuoto ("si vedono dal suo prossimo messaggio"). Ora ognuno salva il proprio profilo quando entra
// nell'app in fanta/profilo-<aid> (fanta/* è già leggibile e scrivibile da chi ha l'accesso: docs/firestore.rules
// non cambia) e il profilo veloce della chat lo legge. Dentro: nome, scelte (p: t, d, f, h, w come nei messaggi),
// medaglia, ora. Niente email: l'aid è un'impronta dell'email, non l'email.
const FB = require("./firebase");
const C = require("./compat");

const REFRESH_MS = 24 * 3600 * 1000;   // anche senza cambi, una volta al giorno (l'ora dice che il profilo è vivo)
const CACHE_MS = 5 * 60 * 1000;
const aidOk = a => typeof a === "string" && /^u[0-9a-f]{16}$/.test(a);
const docId = aid => "profilo-" + aid;

function createProfiles({ dbGet = FB.dbGet, dbSet = FB.dbSet, store = null, now = () => Date.now() } = {}) {
  const cache = {};
  const keyOf = aid => "bt-pubprof-" + aid;

  async function publish(me) {
    const aid = me && me.aid, name = String((me && me.name) || "").trim().slice(0, 40);
    if (!aidOk(aid) || !name) return false;
    const p = C.profOf(me.p), medal = C.medalOk(me.medal);
    const j = JSON.stringify([name, p, medal]), t = now();
    const sent = store ? store.get(keyOf(aid)) : null;
    if (sent && sent.j === j && t - (sent.t || 0) < REFRESH_MS) return false;
    try { await dbSet("fanta", docId(aid), { name, aid, p: p || null, medal: medal || null, t, gone: false }); }
    catch (e) { return false; }
    if (store) store.set(keyOf(aid), { j, t });
    delete cache[aid];
    return true;
  }

  async function load(aid) {
    if (!aidOk(aid)) return null;
    const c = cache[aid];
    if (c && now() - c.at < CACHE_MS) return c.v;
    let d = null;
    try { d = await dbGet("fanta", docId(aid)); } catch (e) { return null; }
    const v = d && !d.gone && d.name ? { name: String(d.name).slice(0, 40), p: C.profOf(d.p), medal: C.medalOk(d.medal), t: Number(d.t) || 0 } : null;
    cache[aid] = { v, at: now() };
    return v;
  }

  // Eliminando l'account il profilo pubblico si svuota (resta solo "gone").
  async function cleanupFor(user) {
    const email = String((user && user.email) || "").toLowerCase();
    if (!email) return;
    const aid = (user && user.aid) || C.authorId(email);
    await dbSet("fanta", docId(aid), { gone: true, name: "", p: null, medal: null }).catch(() => {});
    delete cache[aid];
  }

  return { publish, load, cleanupFor };
}

module.exports = { createProfiles };
