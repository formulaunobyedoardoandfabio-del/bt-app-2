// Pagamenti dell'app (1/11, src/services/billing.js): Google Play nell'APK (plugin @capgo/native-purchases finto), Stripe
// sul sito (la nostra funzione su Vercel finta). Uso: node test/unit/billing.test.js [filtro]
const assert = require('assert');
const { createBilling, PRODUCTS, BUY_MSG } = require('../../src/services/billing');

// Google Play finto. buy: 'ok' | 'cancel' | 'pending' | 'error'; owned: abbonamenti attivi sul telefono.
function fakePlay({ supported = true, buy = 'ok', owned = [], noProducts = false } = {}) {
  const calls = [];
  const P = {
    isBillingSupported: async () => { calls.push(['isBillingSupported']); return { isBillingSupported: supported }; },
    getProducts: async o => {
      calls.push(['getProducts', o]);
      if (noProducts) return { products: [] };
      return o.productType === 'subs'
        ? { products: [{ identifier: 'premium_stagione', planIdentifier: 'stagione', offerId: 'prova', offerToken: 'tok-offerta', priceString: '6,00 €' }, { identifier: 'premium_stagione', planIdentifier: 'stagione', offerId: null, offerToken: 'tok-base', priceString: '6,00 €' }] }
        : { products: [{ identifier: 'caffe', priceString: '2,00 €' }] };
    },
    purchaseProduct: async o => {
      calls.push(['purchaseProduct', o]);
      if (buy === 'cancel') throw Object.assign(new Error('User cancelled the purchase'), { code: 'USER_CANCELED' });
      if (buy === 'error') throw new Error('Billing service unavailable');
      return { transactionId: 'GPA.1', orderId: 'GPA.1', purchaseToken: 'ptok-1', productIdentifier: o.productIdentifier, purchaseState: buy === 'pending' ? 'PENDING' : 'PURCHASED' };
    },
    getPurchases: async o => { calls.push(['getPurchases', o]); return { purchases: owned }; },
    manageSubscriptions: async () => { calls.push(['manageSubscriptions']); },
  };
  P.calls = calls;
  return P;
}
const fakeApi = (reply = { ok: true, url: 'https://checkout.stripe.com/c/pay/cs_1' }, status = 200) => {
  const calls = [];
  const fetchImpl = async (url, opt) => { calls.push({ url, body: JSON.parse(opt.body) }); if (reply === 'offline') throw new Error('rete'); return { ok: status === 200, status, json: async () => reply }; };
  return { calls, fetchImpl };
};

let pass = 0, fail = 0;
const tests = [];
const t = (name, fn) => tests.push([name, fn]);

t('APK: Premium con Google Play, piano base "stagione" (non l\'offerta), token dell\'account mai l\'email', async () => {
  const P = fakePlay(), api = fakeApi();
  const B = createBilling({ plugin: () => P, native: () => true, fetchImpl: api.fetchImpl });
  assert.strictEqual(B.where(), 'play');
  const r = await B.buy('premium', { email: 'a@b.it', token: 'aid-123' });
  assert.deepStrictEqual(r, { ok: true, via: 'play', token: 'ptok-1', orderId: 'GPA.1' });
  const buy = P.calls.find(c => c[0] === 'purchaseProduct')[1];
  assert.deepStrictEqual(buy, { productIdentifier: 'premium_stagione', productType: 'subs', planIdentifier: 'stagione', offerToken: 'tok-base', appAccountToken: 'aid-123' });
  assert.strictEqual(api.calls.length, 0, 'nell\'APK mai Stripe');
});

t('APK: caffè con Google Play, da consumare (si può offrire di nuovo)', async () => {
  const P = fakePlay();
  const B = createBilling({ plugin: () => P, native: () => true });
  const r = await B.buy('coffee', {});
  assert.strictEqual(r.ok, true);
  assert.deepStrictEqual(P.calls.find(c => c[0] === 'purchaseProduct')[1], { productIdentifier: 'caffe', productType: 'inapp', isConsumable: true });
});

t('APK: annullato, in attesa, prodotto non creato, telefono senza Google Play', async () => {
  assert.strictEqual((await createBilling({ plugin: () => fakePlay({ buy: 'cancel' }) }).buy('premium')).reason, 'cancelled');
  assert.strictEqual((await createBilling({ plugin: () => fakePlay({ buy: 'pending' }) }).buy('premium')).reason, 'pending');
  assert.strictEqual((await createBilling({ plugin: () => fakePlay({ noProducts: true }) }).buy('premium')).reason, 'product');
  assert.strictEqual((await createBilling({ plugin: () => fakePlay({ supported: false }) }).buy('coffee')).reason, 'unsupported');
  assert.strictEqual((await createBilling({ plugin: () => fakePlay({ buy: 'error' }) }).buy('coffee')).reason, 'product');
  const api = fakeApi();
  const noPlugin = createBilling({ plugin: () => null, native: () => true, fetchImpl: api.fetchImpl });
  assert.strictEqual(noPlugin.where(), null);
  assert.strictEqual((await noPlugin.buy('premium', { email: 'a@b.it' })).reason, 'unsupported');
  assert.strictEqual(api.calls.length, 0, 'APK senza plugin: mai Stripe');
  for (const k of ['cancelled', 'pending', 'unsupported', 'product', 'config', 'offline', 'email', 'failed']) assert.ok(BUY_MSG[k], 'manca il messaggio ' + k);
});

t('APK: abbonamento attivo sul telefono (all\'apertura), prezzi veri di Google Play, disdetta', async () => {
  const on = fakePlay({ owned: [{ productIdentifier: 'premium_stagione', purchaseState: 'PURCHASED' }] });
  assert.strictEqual(await createBilling({ plugin: () => on }).playActive(), true);
  assert.strictEqual(await createBilling({ plugin: () => fakePlay({ owned: [{ productIdentifier: 'premium_stagione', purchaseState: 'PENDING' }] }) }).playActive(), false);
  assert.strictEqual(await createBilling({ plugin: () => fakePlay() }).playActive(), false);
  assert.strictEqual(await createBilling({ plugin: () => null }).playActive(), null, 'sul sito non si sa');
  assert.deepStrictEqual(await createBilling({ plugin: () => on }).prices(), { premium: '6,00 €', coffee: '2,00 €' });
  assert.strictEqual(await createBilling({ plugin: () => on }).manage(), true);
  assert.ok(on.calls.some(c => c[0] === 'manageSubscriptions'));
});

t('sito: Stripe con la nostra funzione, poi la pagina di pagamento; errori spiegati', async () => {
  const api = fakeApi(), opened = [];
  const B = createBilling({ plugin: () => null, native: () => false, fetchImpl: api.fetchImpl, go: u => opened.push(u) });
  assert.strictEqual(B.where(), 'stripe');
  assert.deepStrictEqual(await B.buy('premium', { email: 'a@b.it', token: 'x' }), { ok: true, via: 'stripe', redirect: true });
  assert.deepStrictEqual(api.calls[0], { url: 'https://bt-app-2.vercel.app/api/stripe-checkout', body: { kind: 'premium', email: 'a@b.it' } });
  assert.deepStrictEqual(opened, ['https://checkout.stripe.com/c/pay/cs_1']);
  const cfg = createBilling({ fetchImpl: fakeApi({ ok: false, reason: 'config' }, 503).fetchImpl, go: u => opened.push(u) });
  assert.strictEqual((await cfg.buy('coffee')).reason, 'config');
  const off = createBilling({ fetchImpl: fakeApi('offline').fetchImpl, go: u => opened.push(u) });
  assert.strictEqual((await off.buy('coffee')).reason, 'offline');
  assert.strictEqual(opened.length, 1);
  assert.strictEqual(PRODUCTS.premium.id, 'premium_stagione');
});

t('sconto della festa: offerta di Google Play con lo stesso nome (prezzo e acquisto), senza offerta il prezzo pieno', async () => {
  const P = fakePlay();
  const getP = P.getProducts;
  P.getProducts = async o => { const r = await getP(o); if (o.productType === 'subs') r.products.push({ identifier: 'premium_stagione', planIdentifier: 'stagione', offerId: 'blackfriday', offerToken: 'tok-bf', priceString: '3,00 €' }); return r; };
  const B = createBilling({ plugin: () => P });
  assert.deepStrictEqual((await B.prices('blackfriday')).sale, { id: 'blackfriday', price: '3,00 €' });
  assert.strictEqual((await B.prices('natale')).sale, undefined, 'senza offerta di Natale niente sconto');
  await B.buy('premium', { sale: 'blackfriday' });
  assert.strictEqual(P.calls.filter(c => c[0] === 'purchaseProduct').pop()[1].offerToken, 'tok-bf');
  const api = fakeApi();
  await createBilling({ fetchImpl: api.fetchImpl, go: () => {} }).buy('premium', { email: 'a@b.it', sale: 'natale' });
  assert.strictEqual(api.calls[0].body.sale, 'natale', 'sul sito lo sconto va alla funzione di Stripe');
});

(async () => {
  const filter = process.argv[2] ? new RegExp(process.argv[2], 'i') : null;
  for (const [name, fn] of tests) {
    if (filter && !filter.test(name)) continue;
    try { await fn(); pass++; console.log('PASS  ' + name); }
    catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + String(e.message).split('\n')[0].slice(0, 300)); }
  }
  console.log(`\n${pass} passati, ${fail} falliti`);
  process.exit(fail ? 1 : 0);
})();
