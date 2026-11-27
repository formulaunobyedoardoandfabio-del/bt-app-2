// Feedback come nell'app di oggi (bt-app-flutter/src/App.jsx, FeedbackModal e deleteUserFeedback; A10 di
// docs/riferimenti/confronto-app-oggi-2.0.md): un documento per feedback, shared/bt-feedback-<id> =
// {id, stars, category, msg, user, date, appVersion}, con user = email dell'account oppure "anonimo".
// Nessuna lettura nell'app: i feedback si leggono dalla console di Firebase. Chi elimina l'account cancella i suoi.
const FB = require("./firebase");
const C = require("./compat");

const APP_VERSION = "2.0.0";
const PREFIX = "bt-feedback-";
const FEEDBACK_CATS = [
  { id: "generale", label: "💬 Generale" },
  { id: "bug", label: "🐛 Bug" },
  { id: "live", label: "📡 Dati live" },
  { id: "design", label: "🎨 Design" },
  { id: "idea", label: "💡 Idea" },
];
const FEEDBACK_MSG = {
  offline: "Feedback non inviato: controlla la connessione e riprova.",
};
const mkErr = code => Object.assign(new Error(FEEDBACK_MSG[code] || code), { code });

function createFeedback({ ss = FB.ss, dbQuery = FB.dbQuery, dbDelete = FB.dbDelete, now = () => Date.now() } = {}) {
  // Stelle obbligatorie (come oggi il tasto INVIA resta spento senza stelle); senza rete rifiuta con "offline".
  async function send({ stars, category = "generale", msg = "", email = "" } = {}) {
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) throw mkErr("stars");
    const fb = {
      id: C.uid(),
      stars,
      category: FEEDBACK_CATS.some(c => c.id === category) ? category : "generale",
      msg: String(msg || "").trim(),
      user: email || "anonimo",
      date: new Date(now()).toISOString(),
      appVersion: APP_VERSION,
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
  return { send, cleanupFor };
}

module.exports = { APP_VERSION, FEEDBACK_CATS, FEEDBACK_MSG, createFeedback };
