// Prove della pubblicità AdMob (src/services/ads.js) con un plugin @capacitor-community/admob finto che registra le
// chiamate: consenso UE prima di tutto, banner uno alla volta, interstitial con il limite, annunci di prova.
// Uso: node test/unit/ads.test.js [filtro]
const assert = require('assert');
const { createAds, UNITS, TEST_UNITS } = require('../../src/services/ads');

// Plugin finto. consent: risposta di requestConsentInfo; failInit: initialize rifiuta; noFill: niente interstitial.
function fakeAdMob({ consent = { status: 'NOT_REQUIRED', isConsentFormAvailable: false, canRequestAds: true, privacyOptionsRequirementStatus: 'NOT_REQUIRED' }, afterForm = null, failInit = false, noFill = false } = {}) {
  const calls = [], listeners = {};
  const rec = (name, ret) => (opts) => { calls.push(opts === undefined ? name : name + ':' + JSON.stringify(opts)); return typeof ret === 'function' ? ret(opts) : Promise.resolve(ret); };
  const p = {
    initialize: rec('initialize', () => (failInit ? Promise.reject(new Error('rete')) : Promise.resolve())),
    requestConsentInfo: rec('requestConsentInfo', consent),
    showConsentForm: rec('showConsentForm', afterForm || { ...consent, status: 'OBTAINED', canRequestAds: true }),
    showPrivacyOptionsForm: rec('showPrivacyOptionsForm'),
    showBanner: rec('showBanner'),
    removeBanner: rec('removeBanner'),
    prepareInterstitial: rec('prepareInterstitial', () => (noFill ? Promise.reject(new Error('No fill')) : Promise.resolve({ adUnitId: 'x' }))),
    showInterstitial: rec('showInterstitial'),
    addListener: (ev, cb) => { calls.push('listen:' + ev); (listeners[ev] = listeners[ev] || []).push(cb); return Promise.resolve({ remove: () => { listeners[ev] = (listeners[ev] || []).filter(f => f !== cb); } }); },
  };
  p.calls = calls;
  p.emit = (ev, data) => (listeners[ev] || []).forEach(f => f(data));
  p.names = () => calls.map(c => c.split(':')[0]);
  return p;
}
const tick = () => new Promise(r => setTimeout(r, 5));
const settle = async () => { for (let i = 0; i < 8; i++) await tick(); };

let pass = 0, fail = 0;
const tests = [];
const t = (name, fn) => tests.push([name, fn]);

t('pubblicità: prima il consenso (UE), poi il banner; con il modulo di Google se serve', async () => {
  const p = fakeAdMob({ consent: { status: 'REQUIRED', isConsentFormAvailable: true, canRequestAds: false, privacyOptionsRequirementStatus: 'REQUIRED' } });
  const A = createAds({ plugin: () => p, test: true });
  A.setBanner('home'); await settle();
  assert.deepStrictEqual(p.names().filter(n => n !== 'listen'), ['initialize', 'requestConsentInfo', 'showConsentForm', 'showBanner']);
  assert.strictEqual(A.privacyRequired(), true);
  await A.openPrivacy();
  assert.ok(p.names().includes('showPrivacyOptionsForm'));
});

t('pubblicità: senza consenso a chiedere annunci, nessun banner; senza plugin (sito) niente di niente', async () => {
  const p = fakeAdMob({ consent: { status: 'REQUIRED', isConsentFormAvailable: true, canRequestAds: false }, afterForm: { status: 'REQUIRED', canRequestAds: false } });
  const A = createAds({ plugin: () => p, test: true });
  A.setBanner('home'); await settle();
  assert.ok(!p.names().includes('showBanner'), p.calls.join(' '));
  const web = createAds({ plugin: () => null });
  web.setBanner('home'); web.articleOpened(); web.articleClosed(); await settle();
  assert.strictEqual(await web.ready(), false);
});

t('pubblicità: banner adattivo in fondo, con le unità di prova di Google nell\'APK di prova e quelle vere nel Play Store', async () => {
  const p = fakeAdMob();
  createAds({ plugin: () => p, test: true }).setBanner('home'); await settle();
  const opt = JSON.parse(p.calls.find(c => c.startsWith('showBanner:')).slice('showBanner:'.length));
  assert.deepStrictEqual(opt, { adId: TEST_UNITS.banner, adSize: 'ADAPTIVE_BANNER', position: 'BOTTOM_CENTER', margin: 0, isTesting: true });
  assert.ok(p.calls.includes('initialize:{"initializeForTesting":true}'), p.calls.join(' '));
  const q = fakeAdMob();
  createAds({ plugin: () => q, test: false }).setBanner('race'); await settle();
  const real = JSON.parse(q.calls.find(c => c.startsWith('showBanner:')).slice('showBanner:'.length));
  assert.strictEqual(real.adId, UNITS.banner.race);
  assert.strictEqual(real.isTesting, false);
  assert.strictEqual(UNITS.banner.home, 'ca-app-pub-5787516371588469/2997561321');
  assert.strictEqual(UNITS.banner.race, 'ca-app-pub-5787516371588469/3821223256');
  assert.strictEqual(UNITS.interstitial.news, 'ca-app-pub-5787516371588469/9706030785');
});

t('pubblicità: cambiando pagina si toglie il vecchio banner prima del nuovo; stessa pagina niente doppioni', async () => {
  const p = fakeAdMob(), heights = [];
  const A = createAds({ plugin: () => p, test: true, onBanner: h => heights.push(h) });
  A.setBanner('home'); A.setBanner('home'); await settle();
  p.emit('bannerAdSizeChanged', { width: 390, height: 61.4 });
  A.setBanner('race'); await settle();
  A.setBanner(null); await settle();
  A.setBanner(null); await settle();
  assert.deepStrictEqual(p.names().filter(n => /Banner$/.test(n)), ['showBanner', 'removeBanner', 'showBanner', 'removeBanner']);
  assert.deepStrictEqual(heights.slice(0, 2), [61, 0]);   // altezza vera del banner; 0 quando si toglie
  assert.strictEqual(heights[heights.length - 1], 0);
});

t('pubblicità: l\'interstitial tra le notizie ogni 3 lette, al massimo ogni 4 minuti, mai nel primo minuto', async () => {
  let now = 0;
  const p = fakeAdMob();
  const A = createAds({ plugin: () => p, test: true, now: () => now });
  await A.ready();
  const read = async () => { A.articleOpened(); await settle(); A.articleClosed(); await settle(); };
  now = 30000; await read(); await read(); await read();           // nel primo minuto: niente
  assert.ok(!p.names().includes('showInterstitial'), p.calls.join(' '));
  now = 70000; await read(); await read(); await read();           // la terza dopo il primo minuto
  assert.strictEqual(p.names().filter(n => n === 'showInterstitial').length, 1);
  assert.ok(p.calls.some(c => c.startsWith('prepareInterstitial:') && c.includes(TEST_UNITS.interstitial)));
  now = 120000; await read(); await read(); await read();          // meno di 4 minuti dopo: niente
  assert.strictEqual(p.names().filter(n => n === 'showInterstitial').length, 1);
  now = 70000 + 4 * 60000 + 1000; await read(); await read(); await read();
  assert.strictEqual(p.names().filter(n => n === 'showInterstitial').length, 2);
  // Google senza annunci da mostrare: nessun errore, si riprova più avanti
  const q = fakeAdMob({ noFill: true });
  let n2 = 0;
  const B = createAds({ plugin: () => q, test: true, now: () => n2 });
  await B.ready();
  n2 = 400000;
  for (let i = 0; i < 4; i++) { B.articleOpened(); await settle(); B.articleClosed(); await settle(); }
  assert.ok(q.names().includes('prepareInterstitial') && !q.names().includes('showInterstitial'), q.calls.join(' '));
});

t('pubblicità: se l\'avvio di AdMob fallisce (senza rete) si riprova alla volta dopo', async () => {
  const p = fakeAdMob({ failInit: true });
  const A = createAds({ plugin: () => p, test: true });
  assert.strictEqual(await A.ready(), false);
  assert.strictEqual(await A.ready(), false);
  assert.strictEqual(p.names().filter(n => n === 'initialize').length, 2);
});

(async () => {
  const filter = process.argv[2] ? new RegExp(process.argv[2], 'i') : null;
  for (const [name, fn] of tests) {
    if (filter && !filter.test(name)) continue;
    try { await fn(); pass++; console.log('PASS  ' + name); }
    catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); }
  }
  console.log(`\n${pass} passati, ${fail} falliti`);
  process.exit(fail ? 1 : 0);
})();
