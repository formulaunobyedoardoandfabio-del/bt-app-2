// Richieste di Edoardo del 24/10 sera: il Premium resta dopo aver chiuso e riaperto l'app (prova e abbonamento di
// prova), la prova finisce da sola alla fine del GP; icone nuove nel Garage, anche per i giochi "In arrivo";
// classifiche e meteo in tempo reale da fonti gratuite; pubblicità AdMob solo nell'APK.
// Uso: node test/build-test.js && node test/e2e/run70-sistemazioni.js [filtro]
const { open, w, text, norm, has, inner, tapSel, tapText, goTab, login, assert, run } = require('./helpers');
const Meteo = require('../../src/services/meteo');

const chip = p => p.evaluate(() => { const e = document.querySelector('[data-premium-chip]'); return e ? e.getAttribute('data-premium-chip') + ':' + e.innerText.replace(/\s+/g, ' ').trim() : null; });
const json = (status, body) => r => r.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
// OpenF1 gratis durante una sessione (risposta vera del 24/10): bloccato fino alla fine.
const OF1_LOCKED = { 'https://api.openf1.org/**': json(401, { detail: 'Live F1 session in progress. Global API access (including past sessions) is restricted to authenticated users until the session ends.' }) };
const US_FP3 = '2026-10-24T18:00:00Z';   // sabato del GP degli Stati Uniti, durante le FP3
const raceHead = p => p.evaluate(() => document.querySelector('.scrollcol') ? document.querySelector('.scrollcol').innerText.slice(0, 300).replace(/\s+/g, ' ') : '');
// Jolpica finto con le classifiche vere dopo il GP di Singapore (round 17) e dopo la gara prima (round 16).
const JOLPICA_FX = {
  '/2026/driverstandings.json': require('../fixtures/jolpica-piloti.json'),
  '/2026/constructorstandings.json': require('../fixtures/jolpica-costruttori.json'),
  '/2026/16/driverstandings.json': require('../fixtures/jolpica-piloti-prima.json'),
  '/2026/16/constructorstandings.json': require('../fixtures/jolpica-costruttori-prima.json'),
};
const jolpica = (hits = []) => ({ 'https://api.jolpi.ca/**': r => {
  const path = new URL(r.request().url()).pathname.replace('/ergast/f1', '');
  hits.push(path);
  return JOLPICA_FX[path] ? json(200, JOLPICA_FX[path])(r) : json(404, {})(r);
} });
// La funzione meteo su Vercel finta: risponde con la previsione vera di MET Norway per il COTA (24/10, sabato sera).
const METEO_FX = { circuitId: 'us-2012', source: 'MET Norway', ...Meteo.shapeForecast(require('../fixtures/met-cota.json')) };
// Telefono finto (APK): Capacitor con App, SystemBars e il plugin AdMob che registra le chiamate in window.__ads; il banner
// "caricato" manda la sua altezza (61). test: window.BT_ADMOB_TEST come lo scrive scripts/prepare_android.py.
const capAds = ({ test = true, consent = 'NOT_REQUIRED' } = {}) => `(() => {
  const L = {}, emit = (ev, d) => (L[ev] || []).forEach(f => f(d));
  window.__ads = [];
  const rec = (name, ret) => o => { window.__ads.push(name + (o ? ':' + JSON.stringify(o) : '')); return Promise.resolve(ret); };
  const info = ${JSON.stringify(consent)} === 'REQUIRED'
    ? { status: 'REQUIRED', isConsentFormAvailable: true, canRequestAds: false, privacyOptionsRequirementStatus: 'REQUIRED' }
    : { status: 'NOT_REQUIRED', isConsentFormAvailable: false, canRequestAds: true, privacyOptionsRequirementStatus: 'NOT_REQUIRED' };
  window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'android', Plugins: {
    App: { addListener: () => Promise.resolve({ remove() {} }), exitApp: () => Promise.resolve(), minimizeApp: () => Promise.resolve() },
    SystemBars: { hide: () => Promise.resolve() },
    AdMob: {
      initialize: rec('initialize'), requestConsentInfo: rec('requestConsentInfo', info),
      showConsentForm: rec('showConsentForm', { ...info, status: 'OBTAINED', canRequestAds: true }), showPrivacyOptionsForm: rec('showPrivacyOptionsForm'),
      showBanner: o => { window.__ads.push('showBanner:' + JSON.stringify(o)); setTimeout(() => emit('bannerAdSizeChanged', { width: 390, height: 61 }), 60); return Promise.resolve(); },
      removeBanner: () => { window.__ads.push('removeBanner'); setTimeout(() => emit('bannerAdSizeChanged', { width: 0, height: 0 }), 10); return Promise.resolve(); },
      prepareInterstitial: rec('prepareInterstitial', { adUnitId: 'x' }), showInterstitial: rec('showInterstitial'),
      addListener: (ev, cb) => { (L[ev] = L[ev] || []).push(cb); return Promise.resolve({ remove() {} }); },
    } } };
  if (${test}) window.BT_ADMOB_TEST = true;
})();`;
const ads = p => p.evaluate(() => (window.__ads || []).slice());
const banners = list => list.filter(c => /^(showBanner|removeBanner)/.test(c)).map(c => c.startsWith('showBanner:') ? 'show:' + JSON.parse(c.slice(11)).adId.split('/').pop() : 'remove');
const adSpace = p => p.evaluate(() => { const e = document.querySelector('[data-ad-space]'); return e ? Math.round(e.getBoundingClientRect().height) : 0; });
// Sito finto con i dati F1 veri generati da tools/make_live_data.py (public/data/f1: Ghost Lap di Austin e Singapore).
const F1DIR = require('path').join(__dirname, '../../public/data/f1');
const f1data = (hits = []) => ({ 'https://bt-app-2.vercel.app/data/f1/**': r => {
  const name = new URL(r.request().url()).pathname.split('/').pop(), f = require('path').join(F1DIR, name);
  hits.push(name);
  return require('fs').existsSync(f) ? r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: require('fs').readFileSync(f, 'utf8') }) : r.fulfill({ status: 404, body: '' });
} });
const meteoTab = async p => { await goTab(p, 'RACE'); await w(p, 600); await tapSel(p, '[data-race-tab="meteo"]'); await w(p, 900); };
const mondiale = async p => { await goTab(p, 'RACE'); await w(p, 600); await tapSel(p, '[data-race-tab="mondiale"]').catch(() => {}); await w(p, 500); return norm(await text(p)); };
// Chiude e riapre l'app: stessa memoria del telefono (il Firebase finto è nel localStorage), pagina nuova.
async function reopen(p) {
  await p.reload(); await w(p, 400);
  await p.waitForFunction(() => !document.querySelector('[data-splash]'), null, { timeout: 8000 }).catch(() => {});
  await w(p, 1500);
}

run({
  async 'Premium: la prova gratuita resta dopo aver chiuso e riaperto l\'app'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await tapSel(p, '[data-premium-chip="off"]'); await w(p, 400);
    await tapText(p, 'PROVA GRATIS'); await w(p, 1500);
    await tapText(p, 'INIZIA'); await w(p, 1500);   // i dati dell'account si salvano 800 ms dopo l'ultima modifica
    const before = await chip(p);
    await reopen(p);
    const after = await chip(p);
    await ctx.close();
    assert(/^on:PROVA/.test(before || ''), 'la prova non si attiva: ' + before);
    assert(/^on:PROVA/.test(after || ''), 'riaprendo l\'app il Premium non c\'è più: ' + after);
    assert(!errs.length, errs.join(' | '));
  },

  // 1/11: l'abbonamento è vero: nell'APK con Google Play (finto, l'acquisto resta sul "telefono"), non più quello di prova.
  async 'Premium: l\'abbonamento di Google Play resta dopo aver chiuso e riaperto l\'app'(b) {
    const PLAY = `(() => {
      const owned = () => localStorage.getItem('fake-play-owned') === '1';
      window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'android', Plugins: {
        App: { addListener: () => Promise.resolve({ remove() {} }), exitApp: () => Promise.resolve(), minimizeApp: () => Promise.resolve() },
        SystemBars: { hide: () => Promise.resolve() },
        NativePurchases: {
          isBillingSupported: () => Promise.resolve({ isBillingSupported: true }),
          getProducts: o => Promise.resolve({ products: o.productType === 'subs' ? [{ identifier: 'premium_stagione', planIdentifier: 'stagione', offerToken: 't', priceString: '6,00 €' }] : [] }),
          purchaseProduct: o => { localStorage.setItem('fake-play-owned', '1'); return Promise.resolve({ purchaseToken: 'p', productIdentifier: o.productIdentifier, purchaseState: 'PURCHASED' }); },
          getPurchases: () => Promise.resolve({ purchases: owned() ? [{ productIdentifier: 'premium_stagione', purchaseState: 'PURCHASED' }] : [] }),
        } } };
    })();`;
    const { ctx, p, errs } = await open(b, { init: PLAY }); await login(p);
    await tapSel(p, '[data-premium-chip="off"]'); await w(p, 400);
    await tapText(p, 'Oppure abbonati subito'); await w(p, 1600);
    await tapText(p, 'INIZIA'); await w(p, 1500);
    const before = await chip(p);
    await reopen(p);
    const after = await chip(p);
    await ctx.close();
    assert(before === 'on:PREMIUM', 'l\'abbonamento non si attiva: ' + before);
    assert(after === 'on:PREMIUM', 'riaprendo l\'app l\'abbonamento non c\'è più: ' + after);
    assert(!errs.length, errs.join(' | '));
  },

  async 'Premium: la prova finisce da sola dopo il GP e non si può rifare'(b) {
    const { ctx, p, errs } = await open(b); await login(p);   // 7/10: la prova vale fino alla fine del GP di Singapore (11/10)
    await tapSel(p, '[data-premium-chip="off"]'); await w(p, 400);
    await tapText(p, 'PROVA GRATIS'); await w(p, 1500);
    await tapText(p, 'INIZIA'); await w(p, 1500);
    await ctx.addInitScript(() => { window.__btNow = Date.parse('2026-10-14T10:00:00Z'); });   // tre giorni dopo il GP
    await reopen(p);
    const after = await chip(p);
    await tapSel(p, '[data-premium-chip="off"]').catch(() => {}); await w(p, 400);
    const sheet = await text(p);
    await ctx.close();
    assert(after === 'off:Premium', 'dopo il GP la prova è ancora attiva: ' + after);
    assert(!/PROVA GRATIS PER UN GP/.test(sheet) && /ABBONATI/.test(sheet), 'la prova si può rifare: ' + sheet.slice(0, 300));
    assert(!errs.length, errs.join(' | '));
  },

  async 'Premium: uscendo dall\'account si toglie, rientrando torna'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await tapSel(p, '[data-premium-chip="off"]'); await w(p, 400);
    await tapText(p, 'PROVA GRATIS'); await w(p, 1500);
    await tapText(p, 'INIZIA'); await w(p, 1500);
    await tapSel(p, '[aria-label="Profilo"]'); await w(p, 400);
    await tapText(p, 'Esci', { exact: true }); await w(p, 1200);
    const out = await chip(p);
    await login(p); await w(p, 1500);
    const back = await chip(p);
    await ctx.close();
    assert(out === null || /^off/.test(out), 'fuori dall\'account il Premium resta: ' + out);
    assert(/^on:PROVA/.test(back || ''), 'rientrando il Premium non torna: ' + back);
    assert(!errs.length, errs.join(' | '));
  },

  // ── Diretta e dati: la gara del weekend è LIVE da sola, con gli orari ufficiali (senza l'admin) ──
  async 'diretta: nel weekend degli Stati Uniti la gara è IN DIRETTA da sola e dice che la sessione è in corso'(b) {
    const { ctx, p, errs } = await open(b, { now: US_FP3, routes: OF1_LOCKED }); await login(p);
    await goTab(p, 'RACE'); await w(p, 1500);
    const head = await raceHead(p), locked = await has(p, '[data-of1-locked]');
    await ctx.close();
    assert(/IN DIRETTA/.test(head) && /GP degli Stati Uniti/.test(head), 'la gara non è in diretta: ' + head);
    assert(locked, 'durante la sessione manca il riquadro SESSIONE IN CORSO');
    assert(!errs.length, errs.join(' | '));
  },
  async 'diretta: con l\'app aperta prima delle FP1 la diretta parte da sola'(b) {
    const { ctx, p, errs } = await open(b, { now: '2026-10-23T16:50:00Z', routes: OF1_LOCKED }); await login(p);
    await goTab(p, 'RACE'); await w(p, 800);
    const before = await raceHead(p);
    await p.evaluate(() => { window.__btNow = Date.parse('2026-10-23T17:05:00Z'); });   // 25 minuti prima delle FP1
    await p.waitForFunction(() => /IN DIRETTA/.test(document.body.innerText), null, { timeout: 30000 }).catch(() => {});
    const after = await raceHead(p);
    await ctx.close();
    assert(/PROSSIMA GARA/.test(before) && /GP degli Stati Uniti/.test(before), 'prima delle FP1: ' + before);
    assert(/IN DIRETTA/.test(after), 'alle 17:05 la gara non è ancora in diretta: ' + after);
    assert(!errs.length, errs.join(' | '));
  },
  async 'diretta: "IN PISTA" in alto solo mentre una sessione è in corso (qualifiche sì, sabato mattina no)'(b) {
    const onTrack = async now => {
      const { ctx, p, errs } = await open(b, { now, routes: OF1_LOCKED }); await login(p); await w(p, 600);
      const v = await has(p, '[data-on-track]');
      await ctx.close();
      assert(!errs.length, errs.join(' | '));
      return v;
    };
    const quali = await onTrack('2026-10-24T21:30:00Z'), morning = await onTrack('2026-10-24T12:00:00Z');
    assert(quali, 'durante le qualifiche manca "IN PISTA"');
    assert(!morning, 'sabato mattina (nessuna sessione) c\'è "IN PISTA"');
  },
  async 'diretta: gli stati vecchi salvati non contano (Malesia e Singapore "IN ARRIVO" dopo la gara)'(b) {
    const old = { 'shared/bt-races': { __arr: [
      { id: 'r16', name: 'GP del Bahrain in Malesia', circuit: 'Sepang International Circuit', country: 'Malesia', round: 16, date: '2026-10-04T09:00:00', status: 'IN ARRIVO', circuitId: 'my-1999' },
      { id: 'r17', name: 'GP di Singapore', circuit: 'Marina Bay', country: 'Singapore', round: 17, date: '2026-10-11T14:00:00', status: 'IN ARRIVO', circuitId: 'sg-2008' },
    ] } };
    const { ctx, p, errs } = await open(b, { now: '2026-10-22T10:00:00Z', seed: { addDocs: old } }); await login(p);
    await goTab(p, 'RACE'); await w(p, 800);
    const head = await raceHead(p);
    await ctx.close();
    assert(/PROSSIMA GARA/.test(head) && /GP degli Stati Uniti/.test(head), 'la prossima gara non è quella degli Stati Uniti: ' + head);
    assert(!errs.length, errs.join(' | '));
  },

  // ── Classifiche del mondiale in automatico (Jolpica F1, gratis) ──
  async 'classifiche: il Mondiale mostra quelle vere di Jolpica dopo l\'ultima gara, con la fonte'(b) {
    const hits = [];
    const { ctx, p, errs } = await open(b, { now: '2026-10-22T10:00:00Z', routes: jolpica(hits) }); await login(p);
    const t = await mondiale(p);
    const podium = norm(await p.evaluate(() => (document.querySelector('[data-champ-podium]') || {}).innerText || ''));
    await ctx.close();
    assert(/GP di Singapore \(round 17\)/.test(t) && /Jolpica/.test(t), 'manca la nota con la fonte: ' + t.slice(-400));
    assert(/Antonelli/.test(podium) && /340 pt/.test(podium), 'il podio non è quello vero: ' + podium);
    assert(hits.length >= 2 && hits.length <= 4, 'richieste a Jolpica: ' + hits.join(', '));
    assert(!errs.length, errs.join(' | '));
  },
  async 'classifiche: senza Jolpica restano quelle dell\'admin'(b) {
    const { ctx, p, errs } = await open(b, { now: '2026-10-22T10:00:00Z' }); await login(p);
    const t = await mondiale(p);
    await ctx.close();
    assert(!/Jolpica/.test(t), 'senza Jolpica non deve citarlo: ' + t.slice(-300));
    assert(/pt/.test(t), 'manca la classifica dell\'admin');
    assert(!errs.length, errs.join(' | '));
  },

  // ── Dati F1 che si aggiornano da soli (25/10): Ghost Lap delle ultime qualifiche e dati del weekend ──
  async 'dati F1: dopo le qualifiche di Austin il Ghost Lap è di Austin (Race e Garage), senza nuovo APK'(b) {
    const hits = [];
    const { ctx, p, errs } = await open(b, { now: '2026-10-25T08:00:00Z', routes: { ...OF1_LOCKED, ...f1data(hits) } }); await login(p); await w(p, 1200);
    await goTab(p, 'RACE'); await w(p, 600);
    const race = norm(await p.evaluate(() => (document.querySelector('[data-ghost-open]') || {}).innerText || ''));
    await goTab(p, 'GARAGE'); await w(p, 500);
    const garage = norm(await p.evaluate(() => (document.querySelector('[data-game="ghost"]') || {}).innerText || ''));
    await tapSel(p, '[data-game="ghost"]'); await w(p, 700);
    const lap = norm(await text(p));
    await ctx.close();
    assert(/QUALIFICHE DI AUSTIN/.test(race), 'Race: ' + race);
    assert(/qualifiche di Austin/.test(garage), 'Garage: ' + garage);
    assert(/Antonelli|ANT/.test(lap) && /Leclerc|LEC/.test(lap), 'Ghost Lap: ' + lap.slice(0, 300));
    assert(hits.includes('index.json') && hits.includes('ghost-us-2012.json'), 'richieste: ' + hits.join(', '));
    assert(!errs.length, errs.join(' | '));
  },
  async 'dati F1: senza il sito restano i dati dentro l\'APK (Ghost Lap di Sepang)'(b) {
    const { ctx, p, errs } = await open(b, { now: '2026-10-25T08:00:00Z', routes: OF1_LOCKED }); await login(p); await w(p, 800);
    await goTab(p, 'GARAGE'); await w(p, 500);
    const garage = norm(await p.evaluate(() => (document.querySelector('[data-game="ghost"]') || {}).innerText || ''));
    await ctx.close();
    assert(/qualifiche di Sepang/.test(garage), 'Garage: ' + garage);
    assert(!errs.length, errs.join(' | '));
  },

  // ── Icone nuove del Garage (disegno "Icone del Garage" del 24/10), anche per i giochi in arrivo ──
  async 'garage: icone nuove per tutti i giochi, quelle in arrivo grigie con l\'orologio'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await goTab(p, 'GARAGE'); await w(p, 500);
    const r = await p.evaluate(() => {
      const icon = el => el.querySelector('[data-garage-icon]');
      const games = [...document.querySelectorAll('[data-game]')].map(g => ({ id: g.getAttribute('data-game'), icon: icon(g) && icon(g).getAttribute('data-garage-icon'), shapes: icon(g) ? icon(g).querySelectorAll('svg *').length : 0 }));
      const soon = [...document.querySelectorAll('[data-soon]')].map(g => ({ id: g.getAttribute('data-soon'), icon: icon(g) && icon(g).getAttribute('data-garage-icon'), clock: !!g.querySelector('[data-soon-clock]'),
        colors: icon(g) && icon(g).querySelector('svg') ? [...icon(g).querySelector('svg').querySelectorAll('[stroke], [fill]')].flatMap(e => [e.getAttribute('stroke'), e.getAttribute('fill')]).filter(c => c && c !== 'none') : [] }));
      return { games, soon };
    });
    await ctx.close();
    assert(r.games.length === 11 && r.games.every(g => g.icon === g.id && g.shapes >= 2), 'giochi: ' + JSON.stringify(r.games));
    assert(r.soon.length === 11 && r.soon.some(g => g.id === 'telecronaca') && r.soon.every(g => g.icon === g.id && g.clock), 'in arrivo (1/11: + telecronaca AI): ' + JSON.stringify(r.soon.map(g => [g.id, g.icon, g.clock])));
    const grey = /^#(8E8D94|BDBCC2|2A2A30|0C0C0F|6E6D74)$/i;
    assert(r.soon.every(g => g.colors.length && g.colors.every(c => grey.test(c))), 'le icone in arrivo devono essere grigie: ' + JSON.stringify(r.soon.map(g => g.colors.filter(c => !grey.test(c)))));
    assert(!errs.length, errs.join(' | '));
  },

  // ── Pubblicità AdMob nell'APK (annunci di prova di Google nell'APK di prova e nel test chiuso) ──
  async 'pubblicità: nell\'APK il banner di prova in Home, in fondo, con la barra delle schede sopra'(b) {
    const { ctx, p, errs } = await open(b, { capacitor: capAds() }); await login(p); await w(p, 900);
    const list = await ads(p), space = await adSpace(p);
    const nav = await p.evaluate(() => { const s = document.querySelector('[data-ad-space]'), n = s && s.previousElementSibling; return n ? Math.round(s.getBoundingClientRect().top - n.getBoundingClientRect().bottom) : null; });
    await ctx.close();
    const show = list.find(c => c.startsWith('showBanner:'));
    assert(list.indexOf('initialize:{"initializeForTesting":true}') >= 0 && list.findIndex(c => c.startsWith('requestConsentInfo')) < list.indexOf(show), 'prima il consenso: ' + list.join(' '));
    assert(show && /"adId":"ca-app-pub-3940256099942544\/9214589741"/.test(show) && /"position":"BOTTOM_CENTER"/.test(show) && /"isTesting":true/.test(show), 'banner: ' + show);
    assert(space === 71, 'spazio per il banner (61 + 10 di distacco): ' + space);
    assert(nav === 0, 'la barra delle schede deve stare subito sopra lo spazio del banner: ' + nav);
    assert(!errs.length, errs.join(' | '));
  },
  async 'pubblicità: annunci veri solo senza BT_ADMOB_TEST; Home e Race con il loro banner, Garage e Fanta senza'(b) {
    const { ctx, p, errs } = await open(b, { capacitor: capAds({ test: false }) }); await login(p); await w(p, 900);
    await goTab(p, 'RACE'); await w(p, 600);
    await goTab(p, 'GARAGE'); await w(p, 600);
    const garage = await adSpace(p);
    await goTab(p, 'FANTA'); await w(p, 600);
    await goTab(p, 'HOME'); await w(p, 600);
    const list = await ads(p);
    await ctx.close();
    assert(banners(list).join(' ') === 'show:2997561321 remove show:3821223256 remove show:2997561321', 'banner: ' + banners(list).join(' '));
    assert(list.some(c => c === 'initialize:{"initializeForTesting":false}'), list.join(' '));
    assert(garage === 0, 'nel Garage niente spazio per il banner: ' + garage);
    assert(!errs.length, errs.join(' | '));
  },
  async 'pubblicità: con una finestra aperta il banner si toglie (non copre i tasti) e torna alla chiusura'(b) {
    const { ctx, p, errs } = await open(b, { capacitor: capAds() }); await login(p); await w(p, 900);
    await tapSel(p, '[data-premium-chip="off"]'); await w(p, 600);
    const during = banners(await ads(p)), space = await adSpace(p);
    await p.keyboard.press('Escape').catch(() => {});
    await tapSel(p, '[aria-label="Chiudi"]').catch(() => {}); await w(p, 800);
    const after = banners(await ads(p));
    await ctx.close();
    assert(during.join(' ') === 'show:9214589741 remove', 'con il Premium aperto: ' + during.join(' '));
    assert(space === 0, 'spazio del banner con la finestra aperta: ' + space);
    assert(after.join(' ') === 'show:9214589741 remove show:9214589741', 'chiusa la finestra: ' + after.join(' '));
    assert(!errs.length, errs.join(' | '));
  },
  async 'pubblicità: con il Premium niente pubblicità'(b) {
    const { ctx, p, errs } = await open(b, { capacitor: capAds() }); await login(p); await w(p, 900);
    await tapSel(p, '[data-premium-chip="off"]'); await w(p, 400);
    await tapText(p, 'PROVA GRATIS'); await w(p, 1500);
    await tapText(p, 'INIZIA'); await w(p, 1200);
    await goTab(p, 'RACE'); await w(p, 600);
    const list = banners(await ads(p)), space = await adSpace(p);
    await ctx.close();
    assert(list[list.length - 1] === 'remove' && list.filter(x => x.startsWith('show')).length === 1, 'con il Premium: ' + list.join(' '));
    assert(space === 0, 'spazio del banner con il Premium: ' + space);
    assert(!errs.length, errs.join(' | '));
  },
  async 'pubblicità: consenso UE richiesto, prima il messaggio di Google; nel Profilo "Preferenze privacy annunci"'(b) {
    const { ctx, p, errs } = await open(b, { capacitor: capAds({ consent: 'REQUIRED' }) }); await login(p); await w(p, 900);
    await tapSel(p, '[aria-label="Profilo"]'); await w(p, 500);
    await tapText(p, 'Preferenze privacy annunci'); await w(p, 500);
    const list = await ads(p);
    await ctx.close();
    const names = list.map(c => c.split(':')[0]);
    assert(names.indexOf('showConsentForm') >= 0 && names.indexOf('showConsentForm') < names.indexOf('showBanner'), 'ordine: ' + names.join(' '));
    assert(names.includes('showPrivacyOptionsForm'), 'dal Profilo non si aprono le scelte: ' + names.join(' '));
    assert(!errs.length, errs.join(' | '));
  },
  async 'pubblicità: un interstitial tornando alle notizie dopo 3 lette, mai nel primo minuto'(b) {
    const { ctx, p, errs } = await open(b, { capacitor: capAds() }); await login(p); await w(p, 900);
    const read = async () => { await tapSel(p, '[data-featured]'); await w(p, 500); await tapSel(p, '[aria-label="Indietro"]'); await w(p, 500); };
    await read(); await read(); await read();
    const early = (await ads(p)).filter(c => /Interstitial/.test(c)).length;
    await p.evaluate(() => { window.__btNow += 2 * 60000; });   // due minuti dopo
    await read();
    const list = await ads(p);
    await ctx.close();
    assert(early === 0, 'interstitial nel primo minuto: ' + early);
    const prep = list.find(c => c.startsWith('prepareInterstitial:'));
    assert(prep && /3940256099942544\/1033173712/.test(prep) && list.includes('showInterstitial'), 'interstitial: ' + list.filter(c => /Interstitial/.test(c)).join(' '));
    assert(!errs.length, errs.join(' | '));
  },
  async 'pubblicità: nel sito niente annunci, niente spazio vuoto e niente riquadro finto "Spazio pubblicitario"'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await w(p, 600);
    const space = await adSpace(p), has1 = await p.evaluate(() => !!window.__ads), t = await text(p);
    await ctx.close();
    assert(space === 0 && !has1, 'nel sito: ' + space);
    assert(!/Spazio pubblicitario/.test(t), 'c\'è ancora il riquadro finto della pubblicità');
    assert(!errs.length, errs.join(' | '));
  },

  // ── Previsioni meteo vere del weekend (MET Norway, tramite la funzione su Vercel) ──
  async 'meteo: nel weekend le previsioni vere delle sessioni che mancano, con la fonte MET Norway'(b) {
    const hits = [];
    const routes = { ...OF1_LOCKED, 'https://bt-app-2.vercel.app/api/meteo**': r => { hits.push(r.request().url()); return json(200, METEO_FX)(r); } };
    const { ctx, p, errs } = await open(b, { now: '2026-10-24T21:30:00Z', routes }); await login(p);
    await meteoTab(p);
    const box = norm(await inner(p, '[data-wx-forecast]'));
    const rows = await p.evaluate(() => [...document.querySelectorAll('[data-wx-fc]')].map(e => e.getAttribute('data-wx-fc')));
    await ctx.close();
    assert(hits.length === 1 && /c=us-2012/.test(hits[0]), 'richieste: ' + hits.join(', '));
    assert(rows.join(',') === 'QUALI,RACE', 'sessioni con la previsione: ' + rows.join(','));
    assert(/MET Norway/.test(box) && /\d°/.test(box), 'riquadro: ' + box);
    assert(!errs.length, errs.join(' | '));
  },
  async 'meteo: senza previsioni il riquadro non c\'è (niente numeri inventati)'(b) {
    const { ctx, p, errs } = await open(b, { now: '2026-10-24T21:30:00Z', routes: OF1_LOCKED }); await login(p);
    await meteoTab(p);
    const shown = await has(p, '[data-wx-forecast]');
    await ctx.close();
    assert(!shown, 'senza previsioni il riquadro deve sparire');
    assert(!errs.length, errs.join(' | '));
  },
});
