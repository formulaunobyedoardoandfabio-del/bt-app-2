// Feedback come nell'app di oggi (bt-app-flutter/src/App.jsx, FeedbackModal e deleteUserFeedback; A10 di
// docs/riferimenti/confronto-app-oggi-2.0.md): un documento per feedback, shared/bt-feedback-<id> =
// {id, stars, category, msg, user, date, appVersion}, con user = email dell'account oppure "anonimo".
// Chi elimina l'account cancella i suoi.
// 16/11 (Edoardo: schede dei feedback "con dati e cose vere" nella scheda Feedback): chi vuole spunta "Si può mostrare"
// (public: true, name = nickname, mai l'email). listPublic legge solo quelli; l'admin può nasconderne uno (hidden: true,
// il feedback resta).
const FB = require("./firebase");
const C = require("./compat");

const APP_VERSION = "2.0.0";
const PREFIX = "bt-feedback-";
// Tappa 3 (G05): nomi senza emoji.
const FEEDBACK_CATS = [
  { id: "generale", label: "Generale" },
  { id: "bug", label: "Bug" },
  { id: "live", label: "Dati live" },
  { id: "design", label: "Design" },
  { id: "idea", label: "Idea" },
];
const FEEDBACK_MSG = {
  offline: "Feedback non inviato: controlla la connessione e riprova.",
};
const mkErr = code => Object.assign(new Error(FEEDBACK_MSG[code] || code), { code });

const NAME_MAX = 24, SHOW_MAX = 18, MSG_MIN = 8;
function createFeedback({ ss = FB.ss, sg = FB.sg, dbQuery = FB.dbQuery, dbDelete = FB.dbDelete, now = () => Date.now() } = {}) {
  // Stelle obbligatorie (come oggi il tasto INVIA resta spento senza stelle); senza rete rifiuta con "offline".
  async function send({ stars, category = "generale", msg = "", email = "", share = false, name = "" } = {}) {
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) throw mkErr("stars");
    const fb = {
      id: C.uid(),
      stars,
      category: FEEDBACK_CATS.some(c => c.id === category) ? category : "generale",
      msg: String(msg || "").trim(),
      user: email || "anonimo",
      date: new Date(now()).toISOString(),
      appVersion: APP_VERSION,
      ...(share ? { public: true, name: String(name || "").trim().slice(0, NAME_MAX) || "Tifoso anonimo" } : {}),
    };
    try { await ss(PREFIX + fb.id, fb, true); }
    catch (e) { throw mkErr("offline"); }
    return fb;
  }
  // Eliminazione dell'account: i documenti shared con user == email e il nome che comincia per bt-feedback-.
  async function cleanupFor(u) {
    if (!u || !u.email) return;
    const docs = await dbQuery("shared", "user", u.email);
    await Promise.all(docs.filter(d => String(d.id).startsWith(PREFIX)).map(d => dbDelete("shared", d.id)));
  }
  // I feedback da mostrare: col permesso, testo vero, non nascosti, stelle 1-5; i più nuovi prima. Niente email.
  async function listPublic() {
    const docs = await dbQuery("shared", "public", true, 80);
    return docs.filter(d => String(d.id).startsWith(PREFIX)).map(d => d.data || {})
      .filter(f => f.public === true && !f.hidden && String(f.msg || "").trim().length >= MSG_MIN && Number.isInteger(f.stars) && f.stars >= 1 && f.stars <= 5)
      .sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, SHOW_MAX)
      .map(f => ({ id: String(f.id), stars: f.stars, category: f.category || "generale", msg: String(f.msg).trim(), name: String(f.name || "Tifoso anonimo").slice(0, NAME_MAX), date: f.date || "" }));
  }
  // Admin: toglie un feedback dalle schede (resta su Firebase, solo non si mostra più).
  async function hide(id) {
    const cur = await sg(PREFIX + id, true);
    if (!cur) return;
    await ss(PREFIX + id, { ...cur, hidden: true }, true);
  }
  return { send, cleanupFor, listPublic, hide };
}

module.exports = { APP_VERSION, FEEDBACK_CATS, FEEDBACK_MSG, createFeedback };
