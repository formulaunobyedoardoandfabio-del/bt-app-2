// Pubblicità AdMob nell'APK (24/10), con il plugin @capacitor-community/admob (nel sito non c'è niente).
// - Consenso UE prima di tutto: prima di chiedere annunci si chiede a Google se serve il consenso (UE, Regno Unito,
//   Svizzera) e, se serve, si mostra il suo messaggio (quello creato su AdMob > Privacy e messaggi). Nel Profilo si
//   possono cambiare le scelte quando Google lo chiede (privacyRequired).
// - Banner adattivo in fondo allo schermo, sopra la barra di sistema (il plugin lo sposta da solo su Android 15+):
//   l'app alza la barra delle schede della sua altezza vera più un distacco, così non si toccano per sbaglio. Uno alla
//   volta: cambiando pagina il vecchio si toglie prima del nuovo.
// - Interstitial "tra le notizie": tornando alla lista dopo almeno 3 notizie lette, al massimo uno ogni 4 minuti e mai
//   nel primo minuto dall'apertura (AdMob vuole gli interstitial nelle pause naturali, non all'avvio).
// - test = annunci di prova di Google (scritta "Test Ad"): nell'APK di prova e nel test chiuso del Play Store, dove gli
//   amici che toccano gli annunci veri metterebbero a rischio l'account AdMob.
const TEST = "ca-app-pub-3940256099942544/";   // unità di prova pubbliche di Google
const UNITS = {
  banner: {
    home: "ca-app-pub-5787516371588469/2997561321",   // "Banner nelle News"
    race: "ca-app-pub-5787516371588469/3821223256",   // "Pubblicità Banner"
  },
  interstitial: { news: "ca-app-pub-5787516371588469/9706030785" },   // "Pubblicità tra le News"
};
const TEST_UNITS = { banner: TEST + "9214589741", interstitial: TEST + "1033173712" };   // banner adattivo, interstitial
const INTERSTITIAL_AFTER = 3, INTERSTITIAL_GAP_MS = 4 * 60000, QUIET_START_MS = 60000;
const OP_TIMEOUT_MS = 10000;

const withTimeout = (p, ms) => Promise.race([Promise.resolve(p), new Promise((_, rej) => setTimeout(() => rej(new Error("AdMob: tempo scaduto")), ms))]);

function createAds({ plugin = () => null, test = false, now = () => Date.now(), onBanner = () => {} } = {}) {
  const startedAt = now();
  let readyP = null, privacy = false;
  function ready() {
    if (readyP) return readyP;
    const p = (async () => {
      const A = plugin();
      if (!A) return false;
      try {
        await withTimeout(A.initialize({ initializeForTesting: !!test }), OP_TIMEOUT_MS);
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
    await withTimeout(A.showBanner({ adId: test ? TEST_UNITS.banner : UNITS.banner[slot], adSize: "ADAPTIVE_BANNER", position: "BOTTOM_CENTER", margin: 0, isTesting: !!test }), OP_TIMEOUT_MS)
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
    if (!A || loaded || loading || sinceLast < INTERSTITIAL_AFTER || !timeOk()) return;
    loading = true;
    ready().then(ok => (ok ? withTimeout(A.prepareInterstitial({ adId: test ? TEST_UNITS.interstitial : UNITS.interstitial.news, isTesting: !!test }), 30000).then(() => { loaded = true; }) : null))
      .catch(() => {})   // Google senza annunci da mostrare: si riprova più avanti
      .then(() => { loading = false; });
  }
  function articleClosed() {
    const A = plugin();
    if (!A || !loaded || sinceLast < INTERSTITIAL_AFTER || !timeOk()) return;
    loaded = false; sinceLast = 0; lastShown = now();
    Promise.resolve(A.showInterstitial()).catch(() => {});
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

  return { ready, setBanner, articleOpened, articleClosed, privacyRequired, openPrivacy };
}

module.exports = { createAds, UNITS, TEST_UNITS, INTERSTITIAL_AFTER, INTERSTITIAL_GAP_MS, QUIET_START_MS };
