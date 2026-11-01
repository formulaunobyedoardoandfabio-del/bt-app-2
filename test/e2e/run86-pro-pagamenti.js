// 1/11 (Edoardo): "rendi vere le pubblicità e rendi dual screen con ad reward allo stesso modo telemetria e tempi dei giri
// dei piloti, anche radio e gomme; inoltre metti anche per le notizie premium; connetti Stripe per il premium e per Buy me
// a coffee". Poi: un video sblocca tutte le funzioni Pro (non le notizie: una per video); nell'app Google Play, sul sito
// Stripe.
// Uso: node test/build-test.js && node test/e2e/run86-pro-pagamenti.js [filtro]
const { open, w, text, tapText, tapSel, goTab, login, openAdmin, assert, run } = require('./helpers');

// Telefono finto (APK): AdMob con gli annunci con premio (reward: 'ok', 'skip', 'nofill') e Google Play (NativePurchases)
// con l'abbonamento attivo o no (owned) e gli acquisti registrati in window.__buys.
const PHONE = ({ reward = 'ok', owned = false } = {}) => `(() => {
  const L = {}, emit = (ev, d) => (L[ev] || []).forEach(f => f(d));
  window.__ads = []; window.__buys = [];
  const rec = (name, ret) => o => { window.__ads.push(name + (o ? ':' + JSON.stringify(o) : '')); return Promise.resolve(ret); };
  const info = { status: 'NOT_REQUIRED', isConsentFormAvailable: false, canRequestAds: true, privacyOptionsRequirementStatus: 'NOT_REQUIRED' };
  const R = ${JSON.stringify(reward)};
  window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'android', Plugins: {
    App: { addListener: () => Promise.resolve({ remove() {} }), exitApp: () => Promise.resolve(), minimizeApp: () => Promise.resolve() },
    SystemBars: { hide: () => Promise.resolve() },
    AdMob: {
      initialize: rec('initialize'), requestConsentInfo: rec('requestConsentInfo', info), showConsentForm: rec('showConsentForm', info),
      showPrivacyOptionsForm: rec('showPrivacyOptionsForm'), showBanner: rec('showBanner'), removeBanner: rec('removeBanner'),
      prepareInterstitial: rec('prepareInterstitial', { adUnitId: 'x' }), showInterstitial: rec('showInterstitial'),
      prepareRewardVideoAd: o => { window.__ads.push('prepareRewardVideoAd:' + JSON.stringify(o)); return R === 'nofill' ? Promise.reject(new Error('No fill')) : Promise.resolve({ adUnitId: 'x' }); },
      showRewardVideoAd: () => {
        window.__ads.push('showRewardVideoAd');
        setTimeout(() => { if (R === 'ok') emit('onRewardedVideoAdReward', { type: 'pro', amount: 1 }); emit('onRewardedVideoAdDismissed'); }, 120);
        return Promise.resolve(R === 'ok' ? { type: 'pro', amount: 1 } : {});
      },
      addListener: (ev, cb) => { (L[ev] = L[ev] || []).push(cb); return Promise.resolve({ remove() {} }); },
    },
    NativePurchases: {
      isBillingSupported: () => Promise.resolve({ isBillingSupported: true }),
      getProducts: o => Promise.resolve({ products: o.productType === 'subs'
        ? [{ identifier: 'premium_stagione', planIdentifier: 'stagione', offerId: null, offerToken: 'tok-base', priceString: '5,99 €' }]
        : [{ identifier: 'caffe', priceString: '1,99 €' }] }),
      purchaseProduct: o => { window.__buys.push(o); return Promise.resolve({ transactionId: 'GPA.1', purchaseToken: 'ptok', productIdentifier: o.productIdentifier, purchaseState: 'PURCHASED' }); },
      getPurchases: () => Promise.resolve({ purchases: ${owned ? "[{ productIdentifier: 'premium_stagione', purchaseState: 'PURCHASED' }]" : '[]'} }),
      manageSubscriptions: () => Promise.resolve(),
    } } };
})();`;
const NEWS = { 'shared/bt-news': { __arr: [
  { id: 'esclusiva', title: 'Il retroscena del rinnovo di Leclerc', summary: 'Solo per i Premium', category: 'ESCLUSIVA', premium: true, content: 'Il testo esclusivo della notizia.', date: '2026-10-06T10:00:00Z', image: '' },
] } };
const TRIAL_USED = { 'users/a@b.it': { name: 'Tester', email: 'a@b.it', about: { birth: null, follow: 2, fan: 'vivo' }, app2: { premium: { sub: false, trial: { start: 1, end: 2 } } } } };
const ss = p => p.evaluate(() => ({ open: !!document.querySelector('[data-ss]'), gate: (document.querySelector('[data-pro-gate]') || { getAttribute: () => null }).getAttribute('data-pro-gate'), video: !!document.querySelector('[data-pro-ad]') }));
const openSS = async p => { await goTab(p, 'RACE'); await w(p, 400); await tapText(p, 'Modalità Second Screen'); await w(p, 600); };
const doc = (p, k) => p.evaluate(k => window.firebase.__fake.doc(k), k);

run({
  async 'APK senza Premium: il Second Screen chiede un video; guardato fino in fondo si apre e le funzioni Pro restano sbloccate'(b) {
    const { ctx, p, errs } = await open(b, { init: PHONE({ reward: 'ok' }) }); await login(p); await w(p, 600);
    await openSS(p);
    const before = await ss(p), sheet = await text(p);
    await tapSel(p, '[data-pro-ad]'); await w(p, 1000);   // l'avviso resta 2,2 s
    const after = await ss(p), page = await text(p), ads = await p.evaluate(() => window.__ads.slice());
    await ctx.close();
    assert(before.gate === 'ss' && before.video && !before.open, 'prima del video: ' + JSON.stringify(before));
    assert(/Second Screen, telemetria, tempi sul giro, radio e gomme/.test(sheet), 'il foglio dice cosa sblocca il video');
    assert(ads.some(a => a.startsWith('prepareRewardVideoAd:') && a.includes('ca-app-pub-5787516371588469/') && a.includes('"isTesting":false')), 'annuncio vero (non di prova): ' + ads.filter(a => a.startsWith('prepare')).join(' '));
    assert(after.open && !after.gate, 'dopo il video il Second Screen si apre: ' + JSON.stringify(after));
    assert(/Funzioni Pro sbloccate finché non chiudi l'app/.test(page), 'manca l\'avviso');
    assert(!errs.length, errs.join(' | '));
  },

  async 'APK senza annunci da Google (AdMob non ancora approvato): sbloccato lo stesso'(b) {
    const { ctx, p, errs } = await open(b, { init: PHONE({ reward: 'nofill' }) }); await login(p); await w(p, 600);
    await openSS(p);
    await tapSel(p, '[data-pro-ad]'); await w(p, 1000);   // l'avviso resta 2,2 s
    const after = await ss(p), page = await text(p);
    await ctx.close();
    assert(after.open, 'senza annunci il Second Screen si apre lo stesso: ' + JSON.stringify(after));
    assert(/Nessuna pubblicità disponibile ora: funzioni Pro sbloccate lo stesso/.test(page), 'manca l\'avviso');
    assert(!errs.length, errs.join(' | '));
  },

  async 'APK: video chiuso prima della fine → resta bloccato; sul sito niente video, solo Premium'(b) {
    const apk = await open(b, { init: PHONE({ reward: 'skip' }) }); await login(apk.p); await w(apk.p, 600);
    await openSS(apk.p);
    await tapSel(apk.p, '[data-pro-ad]'); await w(apk.p, 1000);
    const after = await ss(apk.p), page = await text(apk.p);
    await apk.ctx.close();
    const web = await open(b); await login(web.p);
    await openSS(web.p);
    const site = await ss(web.p);
    await tapSel(web.p, '[data-pro-premium]'); await w(web.p, 500);
    const prem = await text(web.p);
    await web.ctx.close();
    assert(!after.open && after.gate === 'ss', 'senza premio resta bloccato: ' + JSON.stringify(after));
    assert(/Guarda il video fino in fondo/.test(page), 'manca l\'avviso');
    assert(site.gate === 'ss' && !site.video, 'sul sito: ' + JSON.stringify(site));
    assert(/B&T PREMIUM/.test(prem), '"Passa a Premium" apre il Premium');
    assert(!web.errs.length && !apk.errs.length, web.errs.concat(apk.errs).join(' | '));
  },

  async 'notizia Premium: un video la sblocca e resta sbloccata; il video del Pro non sblocca le notizie'(b) {
    const { ctx, p, errs } = await open(b, { init: PHONE({ reward: 'ok' }), seed: { addDocs: NEWS } }); await login(p); await w(p, 600);
    await openSS(p); await tapSel(p, '[data-pro-ad]'); await w(p, 2400);   // Pro col video
    await tapSel(p, '[aria-label="Chiudi Second Screen"]').catch(() => {}); await w(p, 400);
    await goTab(p, 'HOME'); await w(p, 400);
    await tapText(p, 'Il retroscena del rinnovo di Leclerc'); await w(p, 600);
    const locked = await p.evaluate(() => ({ ad: !!document.querySelector('[data-article-ad]'), body: document.body.innerText.includes('Il testo esclusivo della notizia.') }));
    await tapSel(p, '[data-article-ad]'); await w(p, 2400);
    const open1 = await p.evaluate(() => document.body.innerText.includes('Il testo esclusivo della notizia.'));
    const stored = await p.evaluate(() => localStorage.getItem('bt_bt-ad-news'));
    await p.reload(); await w(p, 400);
    await p.waitForFunction(() => !document.querySelector('[data-splash]'), null, { timeout: 8000 }).catch(() => {}); await w(p, 1200);
    await tapText(p, 'Il retroscena del rinnovo di Leclerc'); await w(p, 600);
    const open2 = await p.evaluate(() => document.body.innerText.includes('Il testo esclusivo della notizia.'));
    await ctx.close();
    assert(locked.ad && !locked.body, 'col solo Pro la notizia Premium resta chiusa, col tasto del video: ' + JSON.stringify(locked));
    assert(open1, 'dopo il video la notizia si legge');
    assert(/esclusiva/.test(stored || ''), 'sbloccata sul telefono: ' + stored);
    assert(open2, 'riaprendo l\'app resta sbloccata');
    assert(!errs.length, errs.join(' | '));
  },

  async 'admin: "Solo Premium" per qualsiasi notizia'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await openAdmin(p, 'NEWS');
    await p.fill('#adTitle', 'Notizia per i Premium');
    await tapSel(p, '[data-news-premium] [role="switch"]'); await w(p, 200);
    await tapText(p, 'PUBBLICA', { exact: true }); await w(p, 900);
    const list = await doc(p, 'shared/bt-news');
    await ctx.close();
    const a = ((list && list.__arr) || []).find(x => x.title === 'Notizia per i Premium');
    assert(a && a.premium === true, 'la notizia non è Premium: ' + JSON.stringify(a));
    assert(!errs.length, errs.join(' | '));
  },

  // 1/11 sera (Edoardo: "io non voglio un account commerciale in ogni caso"): pagamenti spenti. Prima qui si provavano
  // l'abbonamento e il caffè con Google Play e il caffè con Stripe sul sito (il codice resta in src/services/billing.js,
  // provato da test/unit/billing.test.js).
  async 'pagamenti spenti, APK: niente "Abbonati" né prezzi, Google Play mai chiamato; il caffè è "in arrivo"'(b) {
    const { ctx, p, errs } = await open(b, { init: PHONE(), seed: { addDocs: TRIAL_USED } }); await login(p); await w(p, 800);
    await tapSel(p, '[data-premium-chip="off"]'); await w(p, 500);
    const sheet = await text(p);
    await tapSel(p, '[aria-label="Chiudi"]').catch(() => {}); await w(p, 300);
    await tapSel(p, '[aria-label="Profilo"]'); await w(p, 500);
    const prof = await text(p);
    await tapText(p, 'Offrici un caffè').catch(() => {}); await w(p, 600);
    const buys = await p.evaluate(() => window.__buys.slice());
    await ctx.close();
    assert(!/ABBONATI/.test(sheet) && !/abbonati subito/i.test(sheet) && !/6 €|5,99/.test(sheet), 'nel foglio Premium niente acquisti: ' + sheet.slice(0, 400));
    assert(/Gli abbonamenti per ora non ci sono/.test(sheet) && /GUARDA UN VIDEO/.test(sheet), 'il foglio dice che c\'è il video: ' + sheet.slice(0, 400));
    assert(/Offrici un caffè/.test(prof) && /IN ARRIVO/.test(prof), 'caffè "in arrivo" nel Profilo');
    assert(buys.length === 0, 'Google Play chiamato: ' + JSON.stringify(buys));
    assert(!errs.length, errs.join(' | '));
  },

  async 'pagamenti spenti, sito: nessuna chiamata a Stripe; il ritorno da Stripe (se mai si riaccende) dice grazie'(b) {
    const asked = [];
    const web = await open(b, { routes: {
      'https://bt-app-2.vercel.app/api/stripe-checkout': r => { asked.push(1); return r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"url":"https://checkout.stripe.com/x"}' }); },
    } });
    await login(web.p);
    await tapSel(web.p, '[aria-label="Profilo"]'); await w(web.p, 500);
    await tapText(web.p, 'Offrici un caffè').catch(() => {}); await w(web.p, 900);
    const url = web.p.url();
    await web.ctx.close();
    const back = await open(b, { query: '?pagamento=ok&cosa=coffee' }); await login(back.p); await w(back.p, 300);
    const msg = await text(back.p);
    await back.ctx.close();
    assert(asked.length === 0 && !url.includes('stripe'), 'Stripe chiamato col sito spento: ' + asked.length + ' ' + url);
    assert(/Grazie per il caffè/.test(msg), 'tornando da Stripe: ' + msg.slice(0, 200));
    assert(!web.errs.length && !back.errs.length, web.errs.concat(back.errs).join(' | '));
  },
});
