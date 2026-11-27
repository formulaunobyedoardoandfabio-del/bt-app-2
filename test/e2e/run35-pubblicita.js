// Task 11: pubblicità (banner AdMob in Home e RACE, video a premio per l'anteprima del FantaF1), Premium gratis per tutti
// e FantaF1 che apre a fine stagione, come nell'app di oggi. AdMob è un plugin finto che registra le chiamate.
// Uso: node test/build-test.js && node test/e2e/run35-pubblicita.js [filtro]
const { open, w, text, norm, has, tapText, tapSel, login, openAdmin, assert, run } = require('./helpers');

// Plugin AdMob finto (come @capacitor-community/admob 8): window.__admob.calls e .banner (il banner sullo schermo);
// window.__admobVideo = "none" fa fallire il video a premio.
function fakeAdMob() {
  const listeners = {};
  const emit = (ev, d) => (listeners[ev] || []).slice().forEach(f => f(d));
  const rec = window.__admob = { calls: [], banner: null, emit };
  const A = {
    initialize: async o => { rec.calls.push(['initialize', o]); },
    requestConsentInfo: async () => { rec.calls.push(['requestConsentInfo']); return { status: 'NOT_REQUIRED', isConsentFormAvailable: false, canRequestAds: true, privacyOptionsRequirementStatus: 'REQUIRED' }; },
    showConsentForm: async () => ({ canRequestAds: true }),
    showPrivacyOptionsForm: async () => { rec.calls.push(['showPrivacyOptionsForm']); },
    addListener: async (ev, f) => { (listeners[ev] = listeners[ev] || []).push(f); return { remove: () => { listeners[ev] = (listeners[ev] || []).filter(x => x !== f); } }; },
    showBanner: async o => { rec.calls.push(['showBanner', o]); rec.banner = o; setTimeout(() => emit('bannerAdSizeChanged', { width: 390, height: 50 }), 30); },
    removeBanner: async () => { rec.calls.push(['removeBanner']); rec.banner = null; },
    prepareRewardVideoAd: async o => { rec.calls.push(['prepareRewardVideoAd', o]); if (window.__admobVideo === 'none') throw new Error('nessun annuncio'); },
    showRewardVideoAd: () => { rec.calls.push(['showRewardVideoAd']); setTimeout(() => emit('onRewardedVideoAdReward', { type: 'premio', amount: 1 }), 40); return new Promise(r => setTimeout(() => r({}), 50)); },
  };
  window.Capacitor = { isNativePlatform: () => true, Plugins: { AdMob: A } };
}
const banner = p => p.evaluate(() => (window.__admob && window.__admob.banner) || null);
const calls = (p, name) => p.evaluate(n => window.__admob.calls.filter(c => c[0] === n).map(c => c[1] || null), name);
const backHome = async p => { await tapSel(p, '[aria-label="Indietro"]'); await w(p); await tapSel(p, '[aria-label="Indietro"]'); await w(p); };
const tab = async (p, t) => { await tapText(p, t, { exact: true }); await w(p, 700); };
const BANNER_ID = 'ca-app-pub-5787516371588469/2997561321', ADAPTIVE_ID = 'ca-app-pub-5787516371588469/3821223256', REWARD_ID = 'ca-app-pub-5787516371588469/6784763097';

run({
  async 'banner: in Home e in RACE senza sessione; non in Chat, Fanta, Profilo e notizia'(b) {
    const { ctx, p, errs } = await open(b, { capacitor: fakeAdMob }); await login(p); await w(p, 800);
    const home = await banner(p), homeSlot = await has(p, '[data-ad-slot="home"]');
    await tab(p, 'RACE'); const race = await banner(p), raceSlot = await has(p, '[data-ad-slot="race"]');
    await tapSel(p, '[data-race-chat]'); await w(p, 700); const chat = await banner(p);
    await tapSel(p, '[aria-label="Indietro"]'); await w(p, 400);
    await tab(p, 'FANTA'); const fanta = await banner(p);
    await tab(p, 'HOME'); await tapSel(p, '[data-featured]'); await w(p, 700); const article = await banner(p);
    await tapSel(p, '[aria-label="Indietro"]'); await w(p, 400);
    await tapSel(p, '[aria-label="Profilo"]'); await w(p, 700); const prof = await banner(p);
    await openAdmin(p, 'GARA LIVE'); await w(p, 400); const admin = await banner(p);
    await tapText(p, 'AVVIA GARA', { exact: true }); await w(p, 300); await backHome(p); await tab(p, 'RACE');
    const session = await banner(p), sessionSlot = await has(p, '[data-ad-slot]'); await ctx.close();
    assert(home && home.adId === BANNER_ID && home.adSize === 'BANNER' && home.position === 'BOTTOM_CENTER' && homeSlot, 'Home: ' + JSON.stringify(home));
    assert(race && race.adId === ADAPTIVE_ID && race.adSize === 'ADAPTIVE_BANNER' && raceSlot, 'RACE: ' + JSON.stringify(race));
    for (const [where, v] of [['chat', chat], ['Fanta', fanta], ['notizia', article], ['Profilo', prof], ['Admin', admin], ['sessione in corso', session]]) assert(v === null, `banner in ${where}: ` + JSON.stringify(v));
    assert(!sessionSlot, 'durante la sessione c\'è ancora il posto del banner');
    assert(!errs.length, errs.join(' | '));
  },
  async 'barra in basso sopra il banner: si alza di altezza del banner + 10'(b) {
    const { ctx, p, errs } = await open(b, { capacitor: fakeAdMob }); await login(p); await w(p, 900);
    const gap = () => p.evaluate(() => { const nav = document.querySelector('[data-nav-tab]').parentElement.getBoundingClientRect(); return Math.round(window.innerHeight - nav.bottom); });
    const withBanner = await gap();
    await tapSel(p, '[aria-label="Profilo"]'); await w(p, 700);
    await tapSel(p, '[aria-label="Indietro"]'); await tab(p, 'FANTA');
    const without = await gap(); await ctx.close();
    assert(withBanner === 60, 'con il banner (alto 50) la barra deve stare 60 px sopra il fondo: ' + withBanner);
    assert(without === 0, 'senza banner la barra torna in fondo: ' + without);
    assert(!errs.length, errs.join(' | '));
  },
  async 'FantaF1: APRE A FINE STAGIONE, anteprima dopo il video'(b) {
    const { ctx, p, errs } = await open(b, { capacitor: fakeAdMob }); await login(p); await w(p, 500);
    await tab(p, 'FANTA');
    const t0 = norm(await text(p)), team0 = await has(p, '[data-fanta-total]');
    await tapText(p, 'GUARDA E SBLOCCA ANTEPRIMA'); await w(p, 1200);
    const team1 = await has(p, '[data-fanta-total]'), reward = await calls(p, 'prepareRewardVideoAd');
    await tab(p, 'HOME'); await tab(p, 'FANTA');
    const team2 = await has(p, '[data-fanta-total]'); await ctx.close();
    assert(/FANTA F1 — APRE A FINE STAGIONE/.test(t0) && /GUARDA E SBLOCCA ANTEPRIMA/.test(t0) && !team0, 'Fanta chiuso: ' + t0.slice(0, 200));
    assert(reward.length === 1 && reward[0].adId === REWARD_ID, 'video a premio: ' + JSON.stringify(reward));
    assert(team1 && team2, 'dopo il video l\'anteprima del FantaF1 non si apre (o non resta aperta)');
    assert(!errs.length, errs.join(' | '));
  },
  async 'FantaF1: senza video l\'anteprima si apre lo stesso con l\'avviso'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await w(p, 500);   // nel browser non c'è AdMob
    await tab(p, 'FANTA');
    await tapText(p, 'GUARDA E SBLOCCA ANTEPRIMA'); await w(p, 700);
    const t = norm(await text(p));
    await tapText(p, 'CONTINUA', { exact: true }); await w(p, 500);
    const team = await has(p, '[data-fanta-total]'); await ctx.close();
    assert(/NESSUN VIDEO DISPONIBILE/.test(t) && /te lo sblocchiamo lo stesso/.test(t), 'avviso senza video: ' + t.slice(0, 240));
    assert(team, 'senza video l\'anteprima non si apre');
    assert(!errs.length, errs.join(' | '));
  },
  async 'Premium: gratis per tutti, PREMIUM IN ARRIVO, nessuna prova gratuita'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await w(p, 500);
    const home = norm(await text(p));
    await tapSel(p, '[aria-label="Profilo"]'); await w(p, 500);
    const prof = norm(await text(p));
    await tapText(p, 'SCOPRI IL PREMIUM'); await w(p, 500);
    const sheet = norm(await text(p));
    const disabled = await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /PREMIUM IN ARRIVO/.test(x.textContent)); return b ? b.disabled : null; });
    await tapSel(p, '[aria-label="Chiudi"]'); await w(p, 300);
    await tapSel(p, '[aria-label="Indietro"]'); await w(p, 300);
    await tab(p, 'RACE'); await tapText(p, 'Modalità Second Screen'); await w(p, 600);
    const ss = await has(p, '[data-second-screen]'), premiumAsked = /PREMIUM IN ARRIVO/.test(await text(p)); await ctx.close();
    assert(/PREMIUM GRATIS PER TUTTI/.test(prof), 'Profilo: ' + prof.slice(0, 300));
    assert(/gratis per tutti/i.test(sheet) && disabled === true, 'Premium: ' + sheet.slice(0, 300));
    assert(!/PROVA GRATIS|PROVA ·|ABBONATI|Anteprima demo/.test(home + prof + sheet), 'c\'è ancora la prova gratuita o un acquisto finto');
    assert(/Senza pubblicità/.test(sheet) && !/Team radio audio live|Leghe private illimitate|Distintivo Premium in chat|Accesso anticipato/.test(sheet), 'funzioni Premium non vere nell\'elenco: ' + sheet.slice(0, 400));
    assert(!/Spazio pubblicitario|RIMUOVI/.test(home), 'c\'è ancora lo spazio pubblicitario finto (ADV)');
    assert(ss && !premiumAsked, 'il Second Screen (gratis per tutti) chiede ancora il Premium');
    assert(!errs.length, errs.join(' | '));
  },
  async 'Premium pagato (users.isPremium): niente pubblicità e FantaF1 aperto'(b) {
    const users = { 'users/a@b.it': { name: 'Tester', nick: 'Tester', email: 'a@b.it', isPremium: true, about: { birth: null, follow: 2, fan: 'vivo' } } };
    const { ctx, p, errs } = await open(b, { capacitor: fakeAdMob, seed: { addDocs: users } }); await login(p); await w(p, 900);
    const home = await banner(p), shows = await calls(p, 'showBanner');
    await tab(p, 'FANTA'); const team = await has(p, '[data-fanta-total]'); await ctx.close();
    assert(home === null && shows.length === 0, 'con il Premium pagato c\'è il banner: ' + JSON.stringify(shows));
    assert(team, 'con il Premium pagato il FantaF1 deve essere aperto');
    assert(!errs.length, errs.join(' | '));
  },
  async 'banner in pausa con Premium, feedback e video a premio; Preferenze privacy annunci nel Profilo'(b) {
    const { ctx, p, errs } = await open(b, { capacitor: fakeAdMob }); await login(p); await w(p, 900);
    const b0 = await banner(p);
    await tapSel(p, '[data-header-premium]'); await w(p, 400); const bPrem = await banner(p);
    await tapSel(p, '[aria-label="Chiudi"]'); await w(p, 500); const b1 = await banner(p);
    await tapSel(p, '[aria-label="Profilo"]'); await w(p, 500);
    const prof = norm(await text(p));
    await tapText(p, 'Preferenze privacy annunci'); await w(p, 400);
    const privacy = await calls(p, 'showPrivacyOptionsForm'); await ctx.close();
    assert(b0 && !bPrem && b1, `banner: Home ${!!b0}, con il Premium aperto ${!!bPrem}, dopo ${!!b1}`);
    assert(/Preferenze privacy annunci/.test(prof) && privacy.length === 1, 'preferenze privacy degli annunci: ' + privacy.length);
    assert(!errs.length, errs.join(' | '));
  },
  async 'annunci di prova con BT_ADMOB_TEST: unità demo di Google'(b) {
    const cap = () => { window.BT_ADMOB_TEST = true; };
    const { ctx, p, errs } = await open(b, { capacitor: new Function('(' + cap.toString() + ')(); (' + fakeAdMob.toString() + ')();') }); await login(p); await w(p, 900);
    const home = await banner(p); await ctx.close();
    assert(home && home.adId === 'ca-app-pub-3940256099942544/6300978111' && home.isTesting === true, 'banner di prova: ' + JSON.stringify(home));
    assert(!errs.length, errs.join(' | '));
  },
});
