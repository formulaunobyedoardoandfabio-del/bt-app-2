// Funzioni dei pagamenti su Vercel (1/11): api/stripe-checkout.js, api/stripe-webhook.js e api/_lib/pay.js, con Stripe,
// Google e Firestore finti (nessuna rete, nessuna chiave vera).
// Uso: node test/unit/payments-api.test.js [filtro]
const assert = require('assert');
const crypto = require('crypto');
const { createCheckout } = require('../../api/stripe-checkout');
const { createWebhook } = require('../../api/stripe-webhook');
const { form, stripeSigOk, createGoogle } = require('../../api/_lib/pay');

const fakeRes = () => { const r = { statusCode: 0, headers: {}, body: '' }; r.setHeader = (k, v) => { r.headers[k.toLowerCase()] = v; }; r.end = s => { r.body = s || ''; r.done = true; }; r.json = () => JSON.parse(r.body || '{}'); return r; };
const SECRET = 'whsec_prova';
const NOW = Date.parse('2026-11-01T12:00:00Z');
const sign = (payload, t = Math.floor(NOW / 1000), secret = SECRET) => `t=${t},v1=${crypto.createHmac('sha256', secret).update(t + '.' + payload, 'utf8').digest('hex')}`;
// Account di servizio finto con una chiave RSA vera (generata qui), così la firma del pass di Google si può controllare.
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const SA = JSON.stringify({ client_email: 'pagamenti@bt-app-50703.iam.gserviceaccount.com', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }), project_id: 'bt-app-50703' });

function fakeGoogle({ missing = [] } = {}) {
  const calls = [];
  const fetchImpl = async (url, opt = {}) => {
    calls.push({ url, method: opt.method, body: opt.body, auth: opt.headers && opt.headers.Authorization });
    if (url === 'https://oauth2.googleapis.com/token') {
      const jwt = new URLSearchParams(opt.body).get('assertion').split('.');
      const ok = crypto.createVerify('RSA-SHA256').update(jwt[0] + '.' + jwt[1]).verify(publicKey, Buffer.from(jwt[2].replace(/-/g, '+').replace(/_/g, '/'), 'base64'));
      return { ok, status: ok ? 200 : 401, json: async () => (ok ? { access_token: 'tok-google', expires_in: 3600 } : {}) };
    }
    if (url.startsWith('https://firestore.googleapis.com/')) {
      const who = decodeURIComponent(url.split('/documents/users/')[1].split('?')[0]);
      const gone = missing.includes(who);
      return { ok: !gone, status: gone ? 404 : 200, json: async () => ({}) };
    }
    return { ok: false, status: 500, json: async () => ({}) };
  };
  return { calls, fetchImpl };
}

let pass = 0, fail = 0;
const tests = [];
const t = (name, fn) => tests.push([name, fn]);

t('form: parametri annidati come li vuole Stripe', () => {
  assert.strictEqual(form({ mode: 'payment', line_items: [{ price: 'price_1', quantity: 1 }], metadata: { email: 'a@b.it' }, nulla: null }),
    'mode=payment&line_items%5B0%5D%5Bprice%5D=price_1&line_items%5B0%5D%5Bquantity%5D=1&metadata%5Bemail%5D=a%40b.it');
});

t('firma di Stripe: giusta passa; sbagliata, vecchia o senza segreto no', () => {
  const body = '{"id":"evt_1"}', nowS = Math.floor(NOW / 1000);
  assert.strictEqual(stripeSigOk(body, sign(body), SECRET, nowS), true);
  assert.strictEqual(stripeSigOk(body + ' ', sign(body), SECRET, nowS), false, 'corpo cambiato');
  assert.strictEqual(stripeSigOk(body, sign(body, nowS, 'altro'), SECRET, nowS), false, 'segreto diverso');
  assert.strictEqual(stripeSigOk(body, sign(body, nowS - 600), SECRET, nowS), false, 'avviso di 10 minuti fa');
  assert.strictEqual(stripeSigOk(body, null, SECRET, nowS), false);
  assert.strictEqual(stripeSigOk(body, sign(body), '', nowS), false);
});

t('checkout: Premium con email apre un abbonamento di Stripe e torna al sito', async () => {
  const calls = [];
  const fetchImpl = async (url, opt) => { calls.push({ url, opt }); return { ok: true, status: 200, json: async () => ({ url: 'https://checkout.stripe.com/c/pay/cs_test_1' }) }; };
  const h = createCheckout({ fetchImpl, env: { STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_PRICE_PREMIUM: 'price_premium', STRIPE_PRICE_COFFEE: 'price_caffe' } });
  const res = fakeRes();
  await h({ method: 'POST', body: { kind: 'premium', email: ' Edo@Esempio.it ' } }, res);
  assert.strictEqual(res.statusCode, 200);
  assert.deepStrictEqual(res.json(), { ok: true, url: 'https://checkout.stripe.com/c/pay/cs_test_1' });
  const q = new URLSearchParams(calls[0].opt.body);
  assert.strictEqual(calls[0].url, 'https://api.stripe.com/v1/checkout/sessions');
  assert.strictEqual(calls[0].opt.headers.Authorization, 'Bearer sk_test_x');
  assert.strictEqual(q.get('mode'), 'subscription');
  assert.strictEqual(q.get('line_items[0][price]'), 'price_premium');
  assert.strictEqual(q.get('customer_email'), 'edo@esempio.it');
  assert.strictEqual(q.get('subscription_data[metadata][email]'), 'edo@esempio.it');
  assert.strictEqual(q.get('success_url'), 'https://bt-app-2.vercel.app/?pagamento=ok&cosa=premium');
  assert.strictEqual(res.headers['access-control-allow-origin'], 'https://bt-app-2.vercel.app');
});

t('checkout: caffè anche senza email (offerta), Premium senza email no, chiavi mancanti = config', async () => {
  const calls = [];
  const fetchImpl = async (url, opt) => { calls.push(opt.body); return { ok: true, status: 200, json: async () => ({ url: 'https://checkout.stripe.com/c/pay/cs_2' }) }; };
  const env = { STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_PRICE_PREMIUM: 'price_premium', STRIPE_PRICE_COFFEE: 'price_caffe' };
  const h = createCheckout({ fetchImpl, env });
  let res = fakeRes(); await h({ method: 'POST', body: { kind: 'coffee' } }, res);
  const q = new URLSearchParams(calls[0]);
  assert.ok(res.statusCode === 200 && q.get('mode') === 'payment' && q.get('submit_type') === 'donate' && q.get('line_items[0][price]') === 'price_caffe' && !q.get('customer_email'));
  res = fakeRes(); await h({ method: 'POST', body: { kind: 'premium', email: 'non-una-mail' } }, res);
  assert.strictEqual(res.statusCode, 400); assert.strictEqual(res.json().reason, 'email');
  res = fakeRes(); await h({ method: 'POST', body: { kind: 'altro' } }, res);
  assert.strictEqual(res.json().reason, 'kind');
  res = fakeRes(); await createCheckout({ fetchImpl, env: {} })({ method: 'POST', body: { kind: 'coffee' } }, res);
  assert.strictEqual(res.statusCode, 503); assert.strictEqual(res.json().reason, 'config');
  res = fakeRes(); await h({ method: 'GET' }, res);
  assert.strictEqual(res.statusCode, 405);
  assert.strictEqual(calls.length, 1, 'Stripe chiamato solo per la richiesta giusta');
});

t('webhook: abbonamento pagato → Premium nell\'account (solo i campi del server, solo se l\'account c\'è)', async () => {
  const g = fakeGoogle();
  const h = createWebhook({ fetchImpl: g.fetchImpl, env: { STRIPE_WEBHOOK_SECRET: SECRET, FIREBASE_SERVICE_ACCOUNT: SA }, now: () => NOW });
  const body = JSON.stringify({ type: 'checkout.session.completed', data: { object: { mode: 'subscription', subscription: 'sub_1', customer: 'cus_1', metadata: { email: 'Edo@Esempio.it' } } } }, null, 2);
  const res = fakeRes();
  await h({ method: 'POST', headers: { 'stripe-signature': sign(body) }, rawBody: body }, res);
  assert.strictEqual(res.statusCode, 200, res.body);
  const fs = g.calls.find(c => c.url.startsWith('https://firestore'));
  assert.ok(fs && fs.method === 'PATCH' && fs.auth === 'Bearer tok-google');
  assert.ok(fs.url.includes('/projects/bt-app-50703/databases/(default)/documents/users/edo%40esempio.it?'), fs.url);
  assert.ok(fs.url.includes('currentDocument.exists=true'), 'mai account nuovi');
  const mask = new URL(fs.url).searchParams.getAll('updateMask.fieldPaths').sort();
  assert.deepStrictEqual(mask, ['isPremium', 'plan', 'premiumSource', 'stripeCustomerId', 'stripeSubscriptionId']);
  const f = JSON.parse(fs.body).fields;
  assert.deepStrictEqual(f.isPremium, { booleanValue: true });
  assert.deepStrictEqual(f.premiumSource, { stringValue: 'stripe' });
});

t('webhook: disdetta → Premium tolto; firma sbagliata → 400 e niente scritto; caffè → niente scritto', async () => {
  const g = fakeGoogle();
  const h = createWebhook({ fetchImpl: g.fetchImpl, env: { STRIPE_WEBHOOK_SECRET: SECRET, FIREBASE_SERVICE_ACCOUNT: SA }, now: () => NOW });
  const del = JSON.stringify({ type: 'customer.subscription.deleted', data: { object: { id: 'sub_1', status: 'canceled', metadata: { email: 'edo@esempio.it' }, items: { data: [{ current_period_end: 1790000000 }] } } } });
  let res = fakeRes(); await h({ method: 'POST', headers: { 'stripe-signature': sign(del) }, rawBody: del }, res);
  const f = JSON.parse(g.calls.find(c => c.url.startsWith('https://firestore')).body).fields;
  assert.deepStrictEqual(f.isPremium, { booleanValue: false });
  assert.deepStrictEqual(f.premiumUntil, { integerValue: '1790000000000' });
  const n = g.calls.length;
  res = fakeRes(); await h({ method: 'POST', headers: { 'stripe-signature': sign(del, undefined, 'falso') }, rawBody: del }, res);
  assert.strictEqual(res.statusCode, 400); assert.strictEqual(g.calls.length, n);
  const coffee = JSON.stringify({ type: 'checkout.session.completed', data: { object: { mode: 'payment', metadata: { kind: 'coffee' } } } });
  res = fakeRes(); await h({ method: 'POST', headers: { 'stripe-signature': sign(coffee) }, rawBody: coffee }, res);
  assert.strictEqual(res.statusCode, 200); assert.strictEqual(res.json().ignored, true); assert.strictEqual(g.calls.length, n);
});

t('webhook: account che non c\'è → 200 (Stripe non riprova); senza chiavi → 503', async () => {
  const g = fakeGoogle({ missing: ['nessuno@esempio.it'] });
  const h = createWebhook({ fetchImpl: g.fetchImpl, env: { STRIPE_WEBHOOK_SECRET: SECRET, FIREBASE_SERVICE_ACCOUNT: SA }, now: () => NOW });
  const body = JSON.stringify({ type: 'customer.subscription.updated', data: { object: { id: 'sub_9', status: 'active', metadata: { email: 'nessuno@esempio.it' } } } });
  let res = fakeRes(); await h({ method: 'POST', headers: { 'stripe-signature': sign(body) }, rawBody: body }, res);
  assert.strictEqual(res.statusCode, 200); assert.strictEqual(res.json().user, 'missing');
  res = fakeRes(); await createWebhook({ fetchImpl: g.fetchImpl, env: {}, now: () => NOW })({ method: 'POST', headers: {}, rawBody: body }, res);
  assert.strictEqual(res.statusCode, 503);
  res = fakeRes(); await createWebhook({ fetchImpl: g.fetchImpl, env: { STRIPE_WEBHOOK_SECRET: SECRET }, now: () => NOW })({ method: 'POST', headers: { 'stripe-signature': sign(body) }, rawBody: body }, res);
  assert.strictEqual(res.statusCode, 503, 'senza account di servizio');
});

t('Google: il pass si chiede una volta sola e vale un\'ora', async () => {
  const g = fakeGoogle();
  let now = NOW;
  const G = createGoogle({ fetchImpl: g.fetchImpl, env: { FIREBASE_SERVICE_ACCOUNT: SA }, now: () => now });
  await G.patchUser('a@b.it', { isPremium: true });
  await G.patchUser('a@b.it', { isPremium: false });
  assert.strictEqual(g.calls.filter(c => c.url.includes('oauth2')).length, 1);
  now += 3600e3;
  await G.patchUser('a@b.it', { isPremium: true });
  assert.strictEqual(g.calls.filter(c => c.url.includes('oauth2')).length, 2);
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
