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
// Tappa 3 (G05): nomi senza emoji. 22/11 (grafica "B&T: Schermata Feedback"): Idea, Problema, Complimento, Altro;
// quelle di prima restano per leggere i feedback vecchi (old: true, non si scelgono più). stars: servono le faccine.
const FEEDBACK_CATS = [
  { id: "idea", label: "Idea" },
  { id: "problema", label: "Problema" },
  { id: "complimento", label: "Complimento", stars: true },
  { id: "altro", label: "Altro" },
  { id: "generale", label: "Generale", old: true, stars: true },
  { id: "bug", label: "Bug", old: true, stars: true },
  { id: "live", label: "Dati live", old: true, stars: true },
  { id: "design", label: "Design", old: true, stars: true },
];
// Dove è successo un problema (Problema).
const FEEDBACK_WHERE = [
  { id: "live", label: "Gara live" }, { id: "fanta", label: "FantaF1" }, { id: "chat", label: "Chat" },
  { id: "garage", label: "Garage" }, { id: "profilo", label: "Profilo" }, { id: "altro", label: "Altro" },
];
const FEEDBACK_STATUS = { ricevuto: "Ricevuto", lavoro: "In lavorazione", letto: "Letto" };
const SHOT_MAX = 350000;   // screenshot già rimpicciolito dall'app (JPEG), dentro il documento
const FEEDBACK_MSG = {
  offline: "Feedback non inviato: controlla la connessione e riprova.",
  msg: "Scrivi due righe: ci servono per capire.",
};
const mkErr = code => Object.assign(new Error(FEEDBACK_MSG[code] || code), { code });

const NAME_MAX = 24, SHOW_MAX = 18, MSG_MIN = 8;
function createFeedback({ ss = FB.ss, sg = FB.sg, dbQuery = FB.dbQuery, dbDelete = FB.dbDelete, now = () => Date.now() } = {}) {
  // Stelle obbligatorie (come oggi il tasto INVIA resta spento senza stelle); senza rete rifiuta con "offline".
  async function send({ stars, category = "generale", msg = "", email = "", share = false, name = "", where = null, device = null, shot = null } = {}) {
    const cat = FEEDBACK_CATS.find(c => c.id === category) || FEEDBACK_CATS.find(c => c.id === "generale");
    const text = String(msg || "").trim().slice(0, 500);
    const hasStars = Number.isInteger(stars) && stars >= 1 && stars <= 5;
    if (cat.stars && !hasStars) throw mkErr("stars");
    if (!cat.stars && text.length < 3) throw mkErr("msg");
    const dev = device && typeof device === "object" ? { app: String(device.app || APP_VERSION).slice(0, 12), ua: String(device.ua || "").slice(0, 160), platform: String(device.platform || "").slice(0, 20) } : null;
    const fb = {
      id: C.uid(),
      ...(hasStars ? { stars } : {}),
      category: cat.id,
      msg: text,
      ...(cat.id === "problema" && FEEDBACK_WHERE.some(w => w.id === where) ? { where } : {}),
      ...(dev ? { device: dev } : {}),
      ...(typeof shot === "string" && /^data:image\/(jpeg|png|webp);base64,/.test(shot) && shot.length <= SHOT_MAX ? { shot } : {}),
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
  // 22/11: "Le tue segnalazioni": con l'account per email; senza, gli id mandati da questo telefono (solo anonimi).
  async function listMine({ email = "", ids = [] } = {}) {
    let docs = [];
    if (email) docs = (await dbQuery("shared", "user", email)).filter(d => String(d.id).startsWith(PREFIX)).map(d => d.data || {});
    else docs = (await Promise.all((ids || []).slice(0, 40).map(id => sg(PREFIX + id, true).catch(() => null)))).filter(f => f && f.user === "anonimo");
    return docs.filter(f => f && f.id && f.date)
      .sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 40)
      .map(f => ({ id: String(f.id), category: f.category || "generale", msg: String(f.msg || ""), date: f.date, where: f.where || null, status: FEEDBACK_STATUS[f.status] ? f.status : "ricevuto" }));
  }
  return { send, cleanupFor, listPublic, hide, listMine };
}

module.exports = { APP_VERSION, FEEDBACK_CATS, FEEDBACK_WHERE, FEEDBACK_STATUS, FEEDBACK_MSG, createFeedback };
