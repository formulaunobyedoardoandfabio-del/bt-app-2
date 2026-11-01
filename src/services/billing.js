// Pagamenti veri (1/11, Edoardo: "connetti Stripe per il premium e per Buy me a coffee"; poi "nell'app con Google Play").
// - Nell'APK solo Google Play: Google vieta altri pagamenti, e anche i link o le schede del browser che portano a un
//   pagamento esterno, nelle app del Play Store. Plugin @capgo/native-purchases (Google Play Billing).
//   Premium = abbonamento "premium_stagione" con il piano base "stagione"; caffè = prodotto "caffe" da consumare (si
//   può offrire più volte). Edoardo li crea nella Play Console con questi nomi (vedi HANDOFF.md).
// - Sul sito Stripe: la nostra funzione su Vercel (api/stripe-checkout.js) apre la pagina di pagamento di Stripe; al
//   ritorno Stripe avvisa api/stripe-webhook.js, che scrive il Premium nell'account (users/<email>: isPremium).
// - Nell'APK il Premium di Google Play vale finché il telefono lo vede attivo (playActive all'apertura); l'app lo salva
//   anche nell'account (app2.premium, src "play") così vale pure sul sito.
// Nessuna funzione lancia errori: rispondono { ok: false, reason } (cancelled, pending, unsupported, product, config,
// offline, failed).
const PRODUCTS = {
  premium: { id: "premium_stagione", plan: "stagione", type: "subs" },
  coffee: { id: "caffe", type: "inapp" },
};
const API = "https://bt-app-2.vercel.app/api/";
const PURCHASED = ["PURCHASED", "1", 1];

// plugin: () => NativePurchases (o null); native: () => true nell'APK (lì mai Stripe, anche senza plugin);
// go: url => apre la pagina di Stripe (sul sito: la stessa scheda).
function createBilling({ plugin = () => null, native = () => false, fetchImpl = (...a) => fetch(...a), api = API, go = url => { window.location.assign(url); } } = {}) {
  const P = () => { try { return plugin() || null; } catch (e) { return null; } };
  const isNative = () => { try { return !!native(); } catch (e) { return false; } };
  const where = () => (P() ? "play" : isNative() ? null : "stripe");
  async function supported() {
    const A = P();
    if (!A) return false;
    try { const r = await A.isBillingSupported(); return !!(r && r.isBillingSupported); } catch (e) { return false; }
  }
  async function products(kind) {
    const k = PRODUCTS[kind], A = P();
    if (!k || !A) return [];
    try { const r = await A.getProducts({ productIdentifiers: [k.id], productType: k.type }); return (r && Array.isArray(r.products)) ? r.products : []; } catch (e) { return []; }
  }
  // Il piano base dell'abbonamento (senza offerte), altrimenti il primo con quel piano.
  const basePlan = list => list.find(x => x.planIdentifier === PRODUCTS.premium.plan && !x.offerId) || list.find(x => x.planIdentifier === PRODUCTS.premium.plan) || list[0] || null;
  // 1/11 sera: offerta della festa (Black Friday, Natale, Befana, Monza) creata nella Play Console con lo stesso nome.
  const saleOffer = (list, sale) => (sale ? list.find(x => x.planIdentifier === PRODUCTS.premium.plan && x.offerId === sale) || null : null);
  // Prezzi veri di Google Play (con la valuta del telefono); sul sito {}.
  async function prices(sale = null) {
    const out = {};
    const list = await products("premium"), pr = basePlan(list), so = saleOffer(list, sale), co = (await products("coffee"))[0];
    if (pr && pr.priceString) out.premium = pr.priceString;
    if (so && so.priceString) out.sale = { id: sale, price: so.priceString };
    if (co && co.priceString) out.coffee = co.priceString;
    return out;
  }
  // who: { email, token } (token: identificativo dell'account non leggibile, per Google; mai l'email in chiaro).
  async function buy(kind, who = {}) {
    const k = PRODUCTS[kind];
    if (!k) return { ok: false, reason: "kind" };
    const A = P();
    if (A) {
      if (!(await supported())) return { ok: false, reason: "unsupported" };
      let extra = { isConsumable: true };
      if (kind === "premium") {
        const list = await products("premium"), p = saleOffer(list, who.sale) || basePlan(list);
        if (!p) return { ok: false, reason: "product" };
        extra = { planIdentifier: k.plan, ...(p.offerToken ? { offerToken: p.offerToken } : {}) };
      }
      try {
        const tx = await A.purchaseProduct({ productIdentifier: k.id, productType: k.type, ...extra, ...(who.token ? { appAccountToken: String(who.token).slice(0, 64) } : {}) });
        const st = tx && tx.purchaseState;
        if (st === "PENDING" || st === "2" || st === 2) return { ok: false, reason: "pending" };
        if (!tx || !(tx.purchaseToken || tx.transactionId)) return { ok: false, reason: "failed" };
        return { ok: true, via: "play", token: tx.purchaseToken || null, orderId: tx.orderId || null };
      } catch (e) {
        const m = String((e && (e.code || e.message)) || "");
        return { ok: false, reason: /cancel/i.test(m) ? "cancelled" : /not.?found|unavailable|item/i.test(m) ? "product" : "failed" };
      }
    }
    if (isNative()) return { ok: false, reason: "unsupported" };   // APK senza Google Play: mai Stripe nell'app
    try {
      const r = await fetchImpl(api + "stripe-checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, email: who.email || null, ...(who.sale ? { sale: who.sale } : {}) }) });
      let j = null;
      try { j = await r.json(); } catch (e) { j = null; }
      if (!r.ok || !j || !j.url) return { ok: false, reason: (j && j.reason) || "failed" };
      go(j.url);
      return { ok: true, via: "stripe", redirect: true };
    } catch (e) { return { ok: false, reason: "offline" }; }
  }
  // Abbonamento di Google Play attivo su questo telefono: true, false, o null se non si sa (sito, errore).
  async function playActive() {
    const A = P();
    if (!A) return null;
    try {
      const r = await A.getPurchases({ productType: PRODUCTS.premium.type });
      const list = (r && Array.isArray(r.purchases)) ? r.purchases : [];
      return list.some(t => t && t.productIdentifier === PRODUCTS.premium.id && PURCHASED.includes(t.purchaseState));
    } catch (e) { return null; }
  }
  // Disdetta: la pagina degli abbonamenti di Google Play.
  async function manage() {
    const A = P();
    if (!A) return false;
    try { await A.manageSubscriptions(); return true; } catch (e) { return false; }
  }
  return { where, supported, prices, buy, playActive, manage };
}

// Messaggi per chi paga (in italiano, senza dettagli tecnici).
const BUY_MSG = {
  cancelled: "Pagamento annullato",
  pending: "Pagamento in attesa: il Premium si attiva quando Google Play lo conferma",
  unsupported: "Su questo telefono i pagamenti di Google Play non sono disponibili",
  product: "Acquisto non ancora disponibile: riprova più avanti",
  config: "Pagamenti non ancora attivi: riprova più avanti",
  offline: "Nessuna connessione: riprova",
  email: "Per il Premium serve un account con l'email",
  failed: "Pagamento non riuscito: riprova",
};

module.exports = { createBilling, PRODUCTS, BUY_MSG };
