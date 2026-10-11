// Pubblicità con AdMob (@capacitor-community/admob 8), come l'app di oggi (bt-app-flutter/src/App.jsx: unità alle righe
// 39-79, video a premio 583-655, consenso e banner 1252-1318):
// - initAds: una volta per apertura e prima di ogni annuncio, il consenso UE col messaggio certificato di Google
//   (quello creato su AdMob → Privacy e messaggi); senza rete si riprova alla volta dopo;
// - banner in fondo allo schermo, disegnato da Android sopra l'app: showBanner("home"|"race") e hideBanner() in fila,
//   uno dopo l'altro (cambiando pagina il vecchio va tolto prima che parta il nuovo); l'altezza vera la dà AdMob
//   (onBannerHeight), e l'app alza di tanto la barra in basso;
// - video a premio: showRewarded(funzione) → "done" (premio guadagnato), "closed" (chiuso prima della fine) oppure
//   "none" (nessun video: come oggi l'app sblocca lo stesso, senza mai mostrare una pubblicità finta);
// - preferenze privacy degli annunci, da poter cambiare dove Google lo chiede (UE, Regno Unito, Svizzera).
// Senza il plugin (browser, prove) il banner non c'è e il video dà "none". Nell'APK di prova Codemagic accende
// BT_ADMOB_TEST (scripts/prepare_android.py): unità demo di Google, con la scritta "Test Ad".
const W = () => (typeof window !== "undefined" ? window : globalThis);
const ADMOB_TEST = W().BT_ADMOB_TEST === true;
const AD_GAP = 10;   // spazio vuoto tra la barra in basso e il banner: AdMob sconsiglia banner a contatto coi pulsanti
const ADMOB_DEMO = "ca-app-pub-3940256099942544/";   // unità demo pubbliche di Google
const adUnits = test => (test
  ? { banner: ADMOB_DEMO + "6300978111", adaptive: ADMOB_DEMO + "9214589741", reward: ADMOB_DEMO + "5224354917" }
  : { banner: "ca-app-pub-5787516371588469/2997561321", adaptive: "ca-app-pub-5787516371588469/3821223256", reward: "ca-app-pub-5787516371588469/6784763097" });
const OP_MAX_MS = 10000;   // un'operazione sul banner che non risponde non blocca le successive

function createAds({
  plugin = () => { try { return (W().Capacitor && W().Capacitor.Plugins && W().Capacitor.Plugins.AdMob) || null; } catch (e) { return null; } },
  native = () => { try { return !!(W().Capacitor && W().Capacitor.isNativePlatform && W().Capacitor.isNativePlatform()); } catch (e) { return false; } },
  test = () => W().BT_ADMOB_TEST === true,
} = {}) {
  let ready = null, privacyRequired = false;
  function initAds() {
    if (ready) return ready;
    const p = (async () => {
      const A = plugin();
      if (!A || !native()) return false;
      try {
        await A.initialize({ requestTrackingAuthorization: true });
        let info = await A.requestConsentInfo();
        if (info && info.isConsentFormAvailable && info.status === "REQUIRED") info = await A.showConsentForm();
        privacyRequired = !!info && info.privacyOptionsRequirementStatus === "REQUIRED";
        return !!info && info.canRequestAds !== false;
      } catch (e) {
        ready = null;   // rete assente o errore di Google: niente annunci, si riprova la volta dopo
        return false;
      }
    })();
    ready = p;
    return p;
  }
  const privacyOptionsRequired = () => privacyRequired;
  async function openPrivacyOptions() {
    const A = plugin();
    if (!A) return false;
    await initAds();
    await A.showPrivacyOptionsForm();
    ready = null;   // le scelte possono essere cambiate: il consenso si rilegge al prossimo annuncio
    return true;
  }

  // ── Banner ────────────────────────────────────────────────────────────
  const subs = new Set();
  let height = 0, wanted = null, shown = null, handles = [];
  const setHeight = h => { if (h === height) return; height = h; subs.forEach(f => { try { f(h); } catch (e) {} }); };
  const onBannerHeight = cb => { subs.add(cb); return () => subs.delete(cb); };
  let ops = Promise.resolve();
  const op = fn => (ops = ops.then(() => Promise.race([Promise.resolve().then(fn), new Promise(r => setTimeout(r, OP_MAX_MS))])).catch(() => {}));
  const dropHandles = () => handles.splice(0).forEach(h => { try { h.remove(); } catch (e) {} });
  async function removeShown(A) {
    dropHandles(); setHeight(0);
    if (shown) { shown = null; await A.removeBanner(); }
  }
  function showBanner(where) {
    wanted = where;
    return op(async () => {
      const A = plugin();
      if (wanted !== where || !A || !native() || shown === where) return;
      if (!(await initAds()) || wanted !== where) return;
      await removeShown(A);
      const h = await A.addListener("bannerAdSizeChanged", s => { if (shown === where) setHeight(Math.max(0, Math.round((s && s.height) || 0))); });
      handles.push(h);
      shown = where;
      const u = adUnits(test());
      await A.showBanner({ adId: where === "race" ? u.adaptive : u.banner, adSize: where === "race" ? "ADAPTIVE_BANNER" : "BANNER", position: "BOTTOM_CENTER", margin: 0, isTesting: test() });
    });
  }
  function hideBanner() {
    wanted = null;
    return op(async () => {
      const A = plugin();
      if (wanted || !A) return;
      await removeShown(A);
    });
  }

  // ── Video a premio ───────────────────────────────────────────────────
  async function showRewarded() {
    const A = plugin();
    if (!A || !native() || !(await initAds())) return "none";
    return new Promise(res => {
      const hs = [];
      let rewarded = false, decided = false;
      const finish = r => { if (decided) return; decided = true; hs.splice(0).forEach(h => { try { h.remove(); } catch (e) {} }); res(r); };
      const reward = () => { rewarded = true; finish("done"); };
      (async () => {
        try {
          hs.push(await A.addListener("onRewardedVideoAdReward", reward));
          // Alcuni annunci danno il premio un attimo dopo la chiusura: si aspetta un po' prima di dire "interrotto".
          hs.push(await A.addListener("onRewardedVideoAdDismissed", () => setTimeout(() => finish(rewarded ? "done" : "closed"), 700)));
          hs.push(await A.addListener("onRewardedVideoAdFailedToShow", () => finish("none")));
          hs.push(await A.addListener("onRewardedVideoAdFailedToLoad", () => finish("none")));
          await A.prepareRewardVideoAd({ adId: adUnits(test()).reward, isTesting: test() });
          if (decided) return;
          A.showRewardVideoAd().then(reward, () => finish("none"));   // la promessa si risolve col premio guadagnato
        } catch (e) { finish("none"); }
      })();
    });
  }

  return { initAds, privacyOptionsRequired, openPrivacyOptions, showBanner, hideBanner, onBannerHeight, bannerHeight: () => height, showRewarded };
}

module.exports = { ADMOB_TEST, AD_GAP, adUnits, createAds, ...createAds() };
