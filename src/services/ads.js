// Pubblicità AdMob nell'APK (24/10), con il plugin @capacitor-community/admob (nel sito non c'è niente).
// - Consenso UE prima di tutto: prima di chiedere annunci si chiede a Google se serve il consenso (UE, Regno Unito,
//   Svizzera) e, se serve, si mostra il suo messaggio (quello creato su AdMob > Privacy e messaggi). Nel Profilo si
//   possono cambiare le scelte quando Google lo chiede (privacyRequired).
// - Banner adattivo in fondo allo schermo, sopra la barra di sistema (il plugin lo sposta da solo su Android 15+):
//   l'app alza la barra delle schede della sua altezza vera più un distacco, così non si toccano per sbaglio. Uno alla
//   volta: cambiando pagina il vecchio si toglie prima del nuovo.
// - Interstitial "tra le notizie": tornando alla lista dopo almeno 3 notizie lette, al massimo uno ogni 4 minuti e mai
//   nel primo minuto dall'apertura (AdMob vuole gli interstitial nelle pause naturali, non all'avvio).
// - 29/10: con premio: guardata la pubblicità fino in fondo, il Pro si sblocca finché l'app non si chiude o lo schermo si
//   spegne (lo decide l'App). Se un'unità non ha annunci si prova la successiva. Interstitial "in fondo alla classifica":
//   arrivati in fondo si carica, la volta dopo si mostra, con gli stessi limiti di tempo di quello tra le notizie.
// - test = annunci di prova di Google (scritta "Test Ad"). Dal 1/11 (Edoardo: "rendi vere le pubblicità") solo per gli
//   admin: chi tocca i propri annunci veri mette a rischio l'account AdMob.
const TEST = "ca-app-pub-3940256099942544/";   // unità di prova pubbliche di Google
const UNITS = {
  banner: {
    home: "ca-app-pub-5787516371588469/2997561321",   // "Banner nelle News"
    race: "ca-app-pub-5787516371588469/3821223256",   // "Pubblicità Banner"
  },
  interstitial: {
    news: "ca-app-pub-5787516371588469/9706030785",        // "Pubblicità tra le News"
    standings: "ca-app-pub-5787516371588469/2087570220",   // "Pubblicità in fondo alla classifica"
  },
  // "Premium (Con premio)" x3, poi "Pubblicità (Con premio)": in quest'ordine, se una non ha annunci si prova la dopo.
  rewarded: ["ca-app-pub-5787516371588469/5624901693", "ca-app-pub-5787516371588469/6784763097", "ca-app-pub-5787516371588469/9675827346", "ca-app-pub-5787516371588469/6456990840"],
};
const TEST_UNITS = { banner: TEST + "9214589741", interstitial: TEST + "1033173712", rewarded: TEST + "5224354917" };   // banner adattivo, interstitial, con premio
const INTERSTITIAL_AFTER = 3, INTERSTITIAL_GAP_MS = 4 * 60000, QUIET_START_MS = 60000;
const OP_TIMEOUT_MS = 10000;

const withTimeout = (p, ms) => Promise.race([Promise.resolve(p), new Promise((_, rej) => setTimeout(() => rej(new Error("AdMob: tempo scaduto")), ms))]);

// test: true/false oppure una funzione (1/11: annunci di prova per gli admin, che si sa chi sono solo dopo l'accesso).
function createAds({ plugin = () => null, test = false, now = () => Date.now(), onBanner = () => {} } = {}) {
  const isTest = () => { try { return typeof test === "function" ? !!test() : !!test; } catch (e) { return true; } };
  const startedAt = now();
  let readyP = null, privacy = false;
  function ready() {
    if (readyP) return readyP;
    const p = (async () => {
      const A = plugin();
      if (!A) return false;
      try {
        await withTimeout(A.initialize({ initializeForTesting: isTest() }), OP_TIMEOUT_MS);
        let info = await withTimeout(A.requestConsentInfo(), OP_TIMEOUT_MS);
        if (info && info.isConsentFormAvailable && info.status === "REQUIRED") info = await A.showConsentForm();
        privacy = !!info && info.privacyOptionsRequirementStatus === "REQUIRED";
        if (!sizeHooked) {
          sizeHooked = true;
          Promise.resolve(A.addListener("bannerAdSizeChanged", s => { if (shown) onBanner(Math.max(0, Math.round((s && s.height) || 0))); })).catch(() => { sizeHooked = false; });
        }
        return !!info && info.canRequestAds !== false;
      } catch (e) {
        readyP = null;   // senza rete o Google che non risponde: si riprova la volta dopo
        return false;
      }
    })();
    readyP = p;
    return p;
  }
  let sizeHooked = false;

  // ── Banner: si vuole "want", si vede "shown"; le operazioni vanno in fila ──
  let want = null, shown = null, ops = Promise.resolve();
  const step = async () => {
    const A = plugin();
    if (!A || want === shown) return;
    if (shown) {
      shown = null;
      onBanner(0);
      await withTimeout(A.removeBanner(), OP_TIMEOUT_MS).catch(() => {});
    }
    const slot = want;
    if (!slot || !(await ready()) || want !== slot) return;
    await withTimeout(A.showBanner({ adId: isTest() ? TEST_UNITS.banner : UNITS.banner[slot], adSize: "ADAPTIVE_BANNER", position: "BOTTOM_CENTER", margin: 0, isTesting: isTest() }), OP_TIMEOUT_MS)
      .then(() => { shown = slot; }, () => {});
  };
  const setBanner = slot => {
    want = slot && UNITS.banner[slot] ? slot : null;
    ops = ops.then(step, step);
    return ops;
  };

  // ── Interstitial tra le notizie ──
  let sinceLast = 0, lastShown = -Infinity, loaded = false, loading = false;
  const timeOk = () => now() - startedAt >= QUIET_START_MS && now() - lastShown >= INTERSTITIAL_GAP_MS;
  function articleOpened() {
    sinceLast++;
    const A = plugin();
    if (!A || loaded || loading || sLoaded || sinceLast < INTERSTITIAL_AFTER || !timeOk()) return;
    loading = true;
    ready().then(ok => (ok ? withTimeout(A.prepareInterstitial({ adId: isTest() ? TEST_UNITS.interstitial : UNITS.interstitial.news, isTesting: isTest() }), 30000).then(() => { loaded = true; }) : null))
      .catch(() => {})   // Google senza annunci da mostrare: si riprova più avanti
      .then(() => { loading = false; });
  }
  function articleClosed() {
    const A = plugin();
    if (!A || !loaded || sinceLast < INTERSTITIAL_AFTER || !timeOk()) return;
    loaded = false; sinceLast = 0; lastShown = now();
    Promise.resolve(A.showInterstitial()).catch(() => {});
  }

  // ── Interstitial in fondo alla classifica (29/10) ──
  let sLoaded = false, sLoading = false;
  function standingsEnd() {
    const A = plugin();
    if (!A) return;
    if (sLoaded) {
      if (!timeOk()) return;
      sLoaded = false; lastShown = now();
      Promise.resolve(A.showInterstitial()).catch(() => {});
      return;
    }
    if (sLoading || loaded || now() - startedAt < QUIET_START_MS) return;
    sLoading = true;
    ready().then(ok => (ok ? withTimeout(A.prepareInterstitial({ adId: isTest() ? TEST_UNITS.interstitial : UNITS.interstitial.standings, isTesting: isTest() }), 30000).then(() => { sLoaded = true; }) : null))
      .catch(() => {}).then(() => { sLoading = false; });
  }

  // ── Con premio (29/10): "ok" guardato fino in fondo, "skipped" chiuso prima, "unavailable" niente annunci ──
  const canReward = () => !!plugin();
  let rewarding = null;
  function showRewarded() {
    if (rewarding) return rewarding;
    rewarding = (async () => {
      const A = plugin();
      if (!A || !(await ready())) return "unavailable";
      let loadedUnit = null;
      for (const adId of isTest() ? [TEST_UNITS.rewarded] : UNITS.rewarded) {
        try { await withTimeout(A.prepareRewardVideoAd({ adId, isTesting: isTest() }), 30000); loadedUnit = adId; break; } catch (e) {}
      }
      if (!loadedUnit) return "unavailable";
      let earned = false, closed;
      const gone = new Promise(r => { closed = r; });
      const subs = [A.addListener("onRewardedVideoAdReward", () => { earned = true; }), A.addListener("onRewardedVideoAdDismissed", () => closed()), A.addListener("onRewardedVideoAdFailedToShow", () => closed())];
      try {
        const item = await A.showRewardVideoAd();
        if (item && (item.amount != null || item.type)) earned = true;
        await Promise.race([gone, new Promise(r => setTimeout(r, 1500))]);
      } catch (e) {}
      subs.forEach(h => Promise.resolve(h).then(x => x && x.remove && x.remove()).catch(() => {}));
      return earned ? "ok" : "skipped";
    })().finally(() => { rewarding = null; });
    return rewarding;
  }

  // ── Scelte sulla privacy degli annunci (dal Profilo) ──
  const privacyRequired = () => privacy;
  async function openPrivacy() {
    const A = plugin();
    if (!A || !(await ready())) return false;
    await A.showPrivacyOptionsForm();
    readyP = null;   // le scelte possono essere cambiate: alla prossima richiesta si richiede il consenso
    return true;
  }

  return { ready, setBanner, articleOpened, articleClosed, standingsEnd, canReward, showRewarded, privacyRequired, openPrivacy };
}

module.exports = { createAds, UNITS, TEST_UNITS, INTERSTITIAL_AFTER, INTERSTITIAL_GAP_MS, QUIET_START_MS };
