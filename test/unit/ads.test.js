// Prove della pubblicità (src/services/ads.js) con un plugin AdMob finto che registra le chiamate.
// Uso: node test/unit/ads.test.js [filtro]
const assert = require('assert');
const { ADMOB_TEST, AD_GAP, adUnits, createAds } = require('../../src/services/ads');

let pass = 0, fail = 0;
const tests = [];
const t = (name, fn) => tests.push([name, fn]);
const wait = ms => new Promise(r => setTimeout(r, ms));

// Plugin finto: registra le chiamate; emit(evento, dati) chiama gli ascoltatori. opts: consenso, video, errori.
function fakeAdMob({ consent = { status: 'NOT_REQUIRED', isConsentFormAvailable: false, canRequestAds: true, privacyOptionsRequirementStatus: 'NOT_REQUIRED' }, video = 'reward', bannerHeight = 50, failInit = false } = {}) {
  const calls = [], listeners = {};
  const A = {
    calls,
    emit(ev, data) { (listeners[ev] || []).slice().forEach(f => f(data)); },
    async initialize(o) { calls.push(['initialize', o]); if (failInit) throw new Error('rete'); },
    async requestConsentInfo() { calls.push(['requestConsentInfo']); return consent; },
    async showConsentForm() { calls.push(['showConsentForm']); return { ...consent, status: 'OBTAINED', canRequestAds: true }; },
    async showPrivacyOptionsForm() { calls.push(['showPrivacyOptionsForm']); },
    async addListener(ev, f) { (listeners[ev] = listeners[ev] || []).push(f); return { remove: () => { listeners[ev] = listeners[ev].filter(x => x !== f); } }; },
    async showBanner(o) { calls.push(['showBanner', o]); setTimeout(() => A.emit('bannerAdSizeChanged', { width: 360, height: bannerHeight }), 5); },
    async removeBanner() { calls.push(['removeBanner']); },
    async prepareRewardVideoAd(o) { calls.push(['prepareRewardVideoAd', o]); if (video === 'none') throw new Error('nessun annuncio'); },
    showRewardVideoAd() {
      calls.push(['showRewardVideoAd']);
      if (video === 'reward') { setTimeout(() => A.emit('onRewardedVideoAdReward', { type: 'coin', amount: 1 }), 5); setTimeout(() => A.emit('onRewardedVideoAdDismissed'), 10); return new Promise(r => setTimeout(() => r({ type: 'coin', amount: 1 }), 6)); }
      if (video === 'closed') { setTimeout(() => A.emit('onRewardedVideoAdDismissed'), 5); return new Promise(() => {}); }
      return Promise.reject(new Error('non mostrato'));
    },
    listenerCount: ev => (listeners[ev] || []).length,
  };
  return A;
}
const make = (A, o = {}) => createAds({ plugin: () => A, native: () => true, test: () => false, ...o });

t('valori di oggi: AD_GAP 10, unità vere e unità demo di Google con BT_ADMOB_TEST', () => {
  assert.strictEqual(AD_GAP, 10);
  assert.strictEqual(ADMOB_TEST, false);
  assert.deepStrictEqual(adUnits(false), { banner: 'ca-app-pub-5787516371588469/2997561321', adaptive: 'ca-app-pub-5787516371588469/3821223256', reward: 'ca-app-pub-5787516371588469/6784763097' });
  assert.deepStrictEqual(adUnits(true), { banner: 'ca-app-pub-3940256099942544/6300978111', adaptive: 'ca-app-pub-3940256099942544/9214589741', reward: 'ca-app-pub-3940256099942544/5224354917' });
});

t('initAds: una volta sola; con il consenso UE richiesto mostra il messaggio di Google', async () => {
  const A = fakeAdMob({ consent: { status: 'REQUIRED', isConsentFormAvailable: true, canRequestAds: false, privacyOptionsRequirementStatus: 'REQUIRED' } });
  const ads = make(A);
  assert.strictEqual(await ads.initAds(), true);
  assert.strictEqual(await ads.initAds(), true);
  assert.deepStrictEqual(A.calls.map(c => c[0]), ['initialize', 'requestConsentInfo', 'showConsentForm']);
  assert.deepStrictEqual(A.calls[0][1], { requestTrackingAuthorization: true });
  assert.strictEqual(ads.privacyOptionsRequired(), true);
  await ads.openPrivacyOptions();
  assert.ok(A.calls.some(c => c[0] === 'showPrivacyOptionsForm'));
});

t('initAds senza rete: false e si riprova alla volta dopo; senza plugin (browser) false', async () => {
  const A = fakeAdMob({ failInit: true });
  const ads = make(A);
  assert.strictEqual(await ads.initAds(), false);
  assert.strictEqual(await ads.initAds(), false);
  assert.strictEqual(A.calls.filter(c => c[0] === 'initialize').length, 2);
  assert.strictEqual(await createAds({ plugin: () => null, native: () => false }).initAds(), false);
});

t('banner: Home col BANNER, RACE con ADAPTIVE_BANNER in fondo; l\'altezza vera arriva con onBannerHeight; hideBanner lo toglie', async () => {
  const A = fakeAdMob({ bannerHeight: 56 });
  const ads = make(A);
  const hs = [];
  const off = ads.onBannerHeight(h => hs.push(h));
  await ads.showBanner('home'); await wait(20);
  assert.deepStrictEqual(A.calls.find(c => c[0] === 'showBanner')[1], { adId: 'ca-app-pub-5787516371588469/2997561321', adSize: 'BANNER', position: 'BOTTOM_CENTER', margin: 0, isTesting: false });
  assert.deepStrictEqual(hs, [56]);
  await ads.showBanner('home'); await wait(20);   // già lì: niente di nuovo
  assert.strictEqual(A.calls.filter(c => c[0] === 'showBanner').length, 1);
  await ads.showBanner('race'); await wait(20);
  const shows = A.calls.filter(c => c[0] === 'showBanner');
  assert.strictEqual(shows.length, 2);
  assert.deepStrictEqual([shows[1][1].adId, shows[1][1].adSize], ['ca-app-pub-5787516371588469/3821223256', 'ADAPTIVE_BANNER']);
  await ads.hideBanner(); await wait(20);
  assert.strictEqual(A.calls.filter(c => c[0] === 'removeBanner').length, 2);   // tra home e race, e alla fine
  assert.strictEqual(hs[hs.length - 1], 0);
  assert.strictEqual(A.listenerCount('bannerAdSizeChanged'), 0, 'ascoltatori rimasti');
  off();
});

t('banner chiesto e subito tolto (cambio pagina veloce): alla fine non resta nessun banner', async () => {
  const A = fakeAdMob();
  const ads = make(A);
  ads.showBanner('home'); ads.hideBanner(); ads.showBanner('race'); await ads.hideBanner(); await wait(20);
  const shown = A.calls.filter(c => c[0] === 'showBanner').length, removed = A.calls.filter(c => c[0] === 'removeBanner').length;
  assert.ok(shown === removed, `banner mostrati ${shown}, tolti ${removed}`);
});

t('nessun banner senza il plugin (browser) né con BT_ADMOB_TEST spento… e con BT_ADMOB_TEST le unità demo', async () => {
  const ads = createAds({ plugin: () => null, native: () => false });
  await ads.showBanner('home');   // nessun errore
  const A = fakeAdMob();
  const demo = make(A, { test: () => true });
  await demo.showBanner('home'); await wait(10);
  assert.deepStrictEqual([A.calls.find(c => c[0] === 'showBanner')[1].adId, A.calls.find(c => c[0] === 'showBanner')[1].isTesting], ['ca-app-pub-3940256099942544/6300978111', true]);
});

t('video a premio: "done" col premio, "closed" se chiuso prima, "none" senza video o senza plugin', async () => {
  assert.strictEqual(await make(fakeAdMob({ video: 'reward' })).showRewarded('fanta'), 'done');
  assert.strictEqual(await make(fakeAdMob({ video: 'closed' })).showRewarded('fanta'), 'closed');
  assert.strictEqual(await make(fakeAdMob({ video: 'none' })).showRewarded('fanta'), 'none');
  assert.strictEqual(await createAds({ plugin: () => null, native: () => false }).showRewarded('fanta'), 'none');
  const A = fakeAdMob({ video: 'reward' });
  await make(A).showRewarded('fanta');
  assert.deepStrictEqual(A.calls.find(c => c[0] === 'prepareRewardVideoAd')[1], { adId: 'ca-app-pub-5787516371588469/6784763097', isTesting: false });
  assert.strictEqual(A.listenerCount('onRewardedVideoAdReward') + A.listenerCount('onRewardedVideoAdDismissed'), 0, 'ascoltatori rimasti');
});

(async () => {
  const filter = process.argv[2] ? new RegExp(process.argv[2], 'i') : null;
  for (const [name, fn] of tests) {
    if (filter && !filter.test(name)) continue;
    try { await fn(); pass++; console.log('PASS  ' + name); }
    catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + String(e && e.message).split('\n')[0]); }
  }
  console.log(`\n${pass} passati, ${fail} falliti`);
  process.exit(fail ? 1 : 0);
})();
