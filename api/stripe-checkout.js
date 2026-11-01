// Funzione su Vercel (1/11): apre la pagina di pagamento di Stripe per il sito (mai per l'APK: lì Google Play).
// POST /api/stripe-checkout  { kind: "premium" | "coffee", email }  →  { ok, url } (o { ok: false, reason })
// - premium: abbonamento con il prezzo STRIPE_PRICE_PREMIUM (a stagione); l'email serve per trovare l'account.
// - coffee: pagamento singolo con il prezzo STRIPE_PRICE_COFFEE ("Offrici un caffè"); l'email è facoltativa.
// Si torna sempre al sito (SITE_URL o https://bt-app-2.vercel.app): mai a indirizzi mandati da fuori.
const { SITE, EMAIL, send, jsonBody, form } = require("./_lib/pay");

function createCheckout({ fetchImpl = (...a) => fetch(...a), env = process.env } = {}) {
  return async function handler(req, res) {
    const site = String(env.SITE_URL || SITE).replace(/\/+$/, "");
    res.setHeader("Access-Control-Allow-Origin", site);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Cache-Control", "no-store");
    if (req.method === "OPTIONS") { res.statusCode = 204; return res.end(); }
    if (req.method !== "POST") return send(res, 405, { ok: false, reason: "method" });
    const b = await jsonBody(req);
    const kind = b.kind === "premium" || b.kind === "coffee" ? b.kind : null;
    if (!kind) return send(res, 400, { ok: false, reason: "kind" });
    const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
    const okEmail = EMAIL.test(email);
    if (kind === "premium" && !okEmail) return send(res, 400, { ok: false, reason: "email" });
    const key = env.STRIPE_SECRET_KEY, price = kind === "premium" ? env.STRIPE_PRICE_PREMIUM : env.STRIPE_PRICE_COFFEE;
    if (!key || !price) return send(res, 503, { ok: false, reason: "config" });
    const params = {
      mode: kind === "premium" ? "subscription" : "payment",
      line_items: [{ price, quantity: 1 }],
      success_url: site + "/?pagamento=ok&cosa=" + kind,
      cancel_url: site + "/?pagamento=annullato",
      locale: "it",
      ...(okEmail ? { customer_email: email, client_reference_id: email } : {}),
      metadata: { kind, ...(okEmail ? { email } : {}) },
      ...(kind === "premium" ? { subscription_data: { metadata: { email } } } : { submit_type: "donate" }),
    };
    let r, j = null;
    try {
      r = await fetchImpl("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { Authorization: "Bearer " + key, "Content-Type": "application/x-www-form-urlencoded" }, body: form(params) });
      try { j = await r.json(); } catch (e) { j = null; }
    } catch (e) { return send(res, 502, { ok: false, reason: "stripe" }); }
    if (!r.ok || !j || typeof j.url !== "string") return send(res, 502, { ok: false, reason: "stripe" });
    return send(res, 200, { ok: true, url: j.url });
  };
}

module.exports = createCheckout();
module.exports.createCheckout = createCheckout;
