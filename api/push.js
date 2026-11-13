// Funzione su Vercel (13/11, Edoardo: "le notifiche che scrivo nell'app non appaiono nella schermata di blocco").
// Le notifiche dell'admin stavano solo su Firebase (campanella dentro l'app): a un telefono con l'app chiusa non arrivava
// niente. Questa funzione le manda davvero, col servizio di Google (Firebase Cloud Messaging), a tutti i telefoni
// iscritti al tema "novita" (src/services/push.js).
// Sicurezza: non si fida di chi la chiama e non accetta testi. Legge shared/bt-notifs, che su Firebase può scrivere solo
// l'admin (docs/firestore.rules), e manda solo le notifiche degli ultimi 15 minuti, una volta sola: prima di mandare
// "prenota" pushlog/<id> (si crea solo se non c'è). Chiunque la chiami, al massimo fa partire ciò che l'admin ha scritto.
// Segreto: FIREBASE_SERVICE_ACCOUNT nelle variabili di Vercel (lo stesso dei pagamenti), mai nell'app né su GitHub.
const { send, createGoogle } = require("./_lib/pay");

const TOPIC = "novita";
const WINDOW_MS = 15 * 60000, MAX = 3;

// Le notifiche da mandare: scritte negli ultimi 15 minuti, le più vecchie prima, al massimo 3 per chiamata.
function fresh(list, now) {
  return (Array.isArray(list) ? list : [])
    .filter(n => n && typeof n === "object" && n.id != null && (n.title || n.text))
    .map(n => ({ n, at: Date.parse(n.date) }))
    .filter(x => Number.isFinite(x.at) && x.at <= now + 120000 && now - x.at <= WINDOW_MS)
    .sort((a, b) => a.at - b.at)
    .slice(-MAX)
    .map(x => x.n);
}
const clip = (s, n) => String(s || "").slice(0, n);
function message(n) {
  return { message: {
    topic: TOPIC,
    notification: { title: clip(n.title, 120), body: clip(n.text || n.body, 500) },
    android: { priority: "HIGH", notification: { channel_id: "bt-novita", icon: "ic_stat_bt", color: "#FF1801" } },
    data: { kind: "admin", id: String(n.id) },
  } };
}
const docId = id => String(id).replace(/[^0-9A-Za-z_-]/g, "_").slice(0, 100) || "x";

function createPush({ fetchImpl = (...a) => fetch(...a), env = process.env, now = () => Date.now(), google = null } = {}) {
  return async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") { res.statusCode = 204; return res.end(); }
    if (req.method !== "POST") return send(res, 405, { ok: false, reason: "method" });
    if (!env.FIREBASE_SERVICE_ACCOUNT) return send(res, 503, { ok: false, reason: "config" });
    const G = google || createGoogle({ fetchImpl, env, now });
    try {
      const todo = fresh(await G.getShared("bt-notifs"), now());
      let sent = 0, skipped = 0;
      for (const n of todo) {
        const id = docId(n.id);
        if (!(await G.claim(id, { at: now(), title: clip(n.title, 120) }))) { skipped++; continue; }
        const r = await G.fcm(message(n));
        if (!r.ok) { await G.release(id).catch(() => {}); return send(res, 502, { ok: false, reason: "fcm", status: r.status }); }
        sent++;
      }
      return send(res, 200, { ok: true, sent, skipped });
    } catch (e) {
      return send(res, e && e.code === "config" ? 503 : 502, { ok: false, reason: (e && e.code) || "failed" });
    }
  };
}

module.exports = createPush();
Object.assign(module.exports, { createPush, fresh, message, TOPIC });
