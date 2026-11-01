// Funzione su Vercel (1/11): gli avvisi di Stripe (webhook) dopo un pagamento sul sito.
// Indirizzo da mettere in Stripe → Sviluppatori → Webhook: https://bt-app-2.vercel.app/api/stripe-webhook, con gli
// eventi checkout.session.completed, customer.subscription.updated, customer.subscription.deleted. Il segreto di
// firma va in STRIPE_WEBHOOK_SECRET; l'account di servizio di Firebase in FIREBASE_SERVICE_ACCOUNT.
// Scrive SOLO questi campi di users/<email>: isPremium, plan, premiumSource ("stripe"), premiumUntil, stripeSubscriptionId,
// stripeCustomerId (account.js li lascia stare: li cambia solo il server). Il caffè non scrive niente.
const { send, rawBody, stripeSigOk, createGoogle } = require("./_lib/pay");

const ON = ["active", "trialing", "past_due"];   // past_due: Stripe sta ancora riprovando la carta
const em = s => (typeof s === "string" ? s.trim().toLowerCase() : "");
const periodEnd = o => { const t = o.current_period_end || (o.items && o.items.data && o.items.data[0] && o.items.data[0].current_period_end); return t ? t * 1000 : null; };

function createWebhook({ fetchImpl = (...a) => fetch(...a), env = process.env, now = () => Date.now(), google = null } = {}) {
  const G = google || createGoogle({ fetchImpl, env, now });
  return async function handler(req, res) {
    if (req.method !== "POST") return send(res, 405, { ok: false, reason: "method" });
    if (!env.STRIPE_WEBHOOK_SECRET) return send(res, 503, { ok: false, reason: "config" });
    const payload = await rawBody(req);
    const sig = req.headers && (req.headers["stripe-signature"] || req.headers["Stripe-Signature"]);
    if (!stripeSigOk(payload, sig, env.STRIPE_WEBHOOK_SECRET, Math.floor(now() / 1000))) return send(res, 400, { ok: false, reason: "signature" });
    let ev = null;
    try { ev = JSON.parse(payload); } catch (e) { return send(res, 400, { ok: false, reason: "json" }); }
    const o = (ev && ev.data && ev.data.object) || {};
    let email = "", fields = null;
    if (ev.type === "checkout.session.completed" && o.mode === "subscription") {
      email = em((o.metadata || {}).email) || em(o.client_reference_id) || em((o.customer_details || {}).email);
      fields = { isPremium: true, plan: "stagione", premiumSource: "stripe", stripeSubscriptionId: o.subscription || null, stripeCustomerId: o.customer || null };
    } else if (ev.type === "customer.subscription.updated" || ev.type === "customer.subscription.deleted") {
      email = em((o.metadata || {}).email);
      const on = ev.type === "customer.subscription.updated" && ON.includes(o.status);
      fields = { isPremium: on, plan: "stagione", premiumSource: "stripe", stripeSubscriptionId: o.id || null, premiumUntil: periodEnd(o) };
    }
    if (!fields || !email) return send(res, 200, { ok: true, ignored: true });   // caffè e altri eventi: niente da scrivere
    try {
      const r = await G.patchUser(email, fields);
      if (!r.ok && r.reason !== "no-user") return send(res, 500, { ok: false, reason: "firestore" });   // Stripe riprova da sé
      return send(res, 200, { ok: true, user: r.ok ? "updated" : "missing" });
    } catch (e) {
      return send(res, e && e.code === "config" ? 503 : 500, { ok: false, reason: (e && e.code) || "error" });
    }
  };
}

module.exports = createWebhook();
module.exports.createWebhook = createWebhook;
module.exports.config = { api: { bodyParser: false } };   // la firma va controllata sul corpo così com'è
