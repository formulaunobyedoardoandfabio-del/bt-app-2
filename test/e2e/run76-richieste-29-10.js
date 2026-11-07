// 29/10 (Edoardo): swipe sulla barra in basso per cambiare pagina, password visibile col casco (stile F1), Pro
// sbloccato con una pubblicità finché non si chiude l'app o si spegne lo schermo, profilo che parte entrando in chat,
// suoni e vibrazioni F1 (semaforo, via, pistola delle gomme, DRS, bandiera a scacchi).
// Uso: node test/build-test.js && node test/e2e/run76-richieste-29-10.js [filtro]
const { open, w, text, tapText, tapSel, login, assert, run } = require('./helpers');
const { authorId } = require('../../src/services/compat');

const tabNow = p => p.evaluate(() => { const e = document.querySelector('[data-nav-tab][aria-current="page"]'); return e ? e.getAttribute('data-nav-tab') : null; });
// Trascina il dito (il mouse) sulla barra in basso: dx pixel in ms millisecondi.
async function swipeBar(p, dx, ms = 220) {
  const r = await p.evaluate(() => { const e = document.querySelector('[data-nav-swipe]').getBoundingClientRect(); return { x: e.left + e.width / 2, y: e.top + e.height / 2 }; });
  const x0 = r.x - dx / 2;
  await p.mouse.move(x0, r.y); await p.mouse.down();
  for (let i = 1; i <= 8; i++) { await p.mouse.move(x0 + dx * i / 8, r.y); await p.waitForTimeout(ms / 8); }
  await p.mouse.up();
  await w(p, 700);
}
// Vibrazioni del browser registrate (navigator.vibrate): ogni schema F1 ha la sua forma (src/services/fx.js, BUZZ).
const { BUZZ } = require('../../src/services/fx');
const FX_SPY = () => { window.__vib = []; navigator.vibrate = x => { window.__vib.push(JSON.stringify(x)); return true; }; };
const vibs = p => p.evaluate(() => (window.__vib || []).slice());
const has = (list, k) => list.includes(JSON.stringify(BUZZ[k]));
const openGame = async (p, id) => { await tapSel(p, '[data-nav-tab="garage"]'); await w(p, 500); await tapSel(p, `[data-game="${id}"]`); await w(p, 300); };
const phase = p => p.evaluate(() => { const e = document.querySelector('[data-pit-phase]'); return e && e.getAttribute('data-pit-phase'); });

// Telefono finto (APK) con AdMob e gli annunci con premio. reward: 'ok' (guardata fino in fondo) o 'skip' (chiusa prima).
const PHONE = (reward) => `(() => {
  const L = {}, emit = (ev, d) => (L[ev] || []).forEach(f => f(d));
  window.__ads = [];
  const rec = (name, ret) => o => { window.__ads.push(name + (o ? ':' + JSON.stringify(o) : '')); return Promise.resolve(ret); };
  const info = { status: 'NOT_REQUIRED', isConsentFormAvailable: false, canRequestAds: true, privacyOptionsRequirementStatus: 'NOT_REQUIRED' };
  window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'android', Plugins: {
    App: { addListener: () => Promise.resolve({ remove() {} }), exitApp: () => Promise.resolve(), minimizeApp: () => Promise.resolve() },
    SystemBars: { hide: () => Promise.resolve() },
    AdMob: {
      initialize: rec('initialize'), requestConsentInfo: rec('requestConsentInfo', info), showConsentForm: rec('showConsentForm', info),
      showPrivacyOptionsForm: rec('showPrivacyOptionsForm'), showBanner: rec('showBanner'), removeBanner: rec('removeBanner'),
      prepareInterstitial: rec('prepareInterstitial', { adUnitId: 'x' }), showInterstitial: rec('showInterstitial'),
      prepareRewardVideoAd: rec('prepareRewardVideoAd', { adUnitId: 'x' }),
      showRewardVideoAd: () => {
        window.__ads.push('showRewardVideoAd');
        setTimeout(() => { if (${JSON.stringify(reward)} === 'ok') emit('onRewardedVideoAdReward', { type: 'pro', amount: 1 }); emit('onRewardedVideoAdDismissed'); }, 120);
        return Promise.resolve(${JSON.stringify(reward)} === 'ok' ? { type: 'pro', amount: 1 } : {});
      },
      addListener: (ev, cb) => { (L[ev] = L[ev] || []).push(cb); return Promise.resolve({ remove() {} }); },
    } } };
  window.BT_ADMOB_TEST = true;
})();`;
const chip = p => p.evaluate(() => { const e = document.querySelector('[data-premium-chip]'); return e ? e.getAttribute('data-premium-chip') : null; });
async function watchAd(p) { await tapSel(p, '[data-premium-chip]'); await w(p, 500); await tapSel(p, '[data-ad-pro] button'); await w(p, 2200); }
// Lo schermo si spegne (o l'app va in secondo piano): document.hidden diventa vero.
const screenOff = p => p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });

run({
  async 'barra in basso: swipe a sinistra va alla pagina dopo, a destra a quella prima; il tocco resta'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await w(p, 300);
    const t0 = await tabNow(p);
    await swipeBar(p, -220);
    const t1 = await tabNow(p);
    await swipeBar(p, 220);
    const t2 = await tabNow(p);
    await swipeBar(p, 30, 500);   // corto e lento: niente
    const t3 = await tabNow(p);
    await tapSel(p, '[data-nav-tab="fanta"]'); await w(p, 500);
    const t4 = await tabNow(p);
    await ctx.close();
    assert(t0 === 'home', 'si parte dalla Home: ' + t0);
    assert(t1 === 'garage', 'swipe a sinistra sulla barra: doveva andare al Garage, invece ' + t1);
    assert(t2 === 'home', 'swipe a destra sulla barra: doveva tornare alla Home, invece ' + t2);
    assert(t3 === 'home', 'uno swipe corto e lento non deve cambiare pagina: ' + t3);
    assert(t4 === 'fanta', 'il tocco su FANTA deve ancora funzionare: ' + t4);
    assert(!errs.length, errs.join(' | '));
  },

  async 'password: il casco mostra e nasconde la password (cifre dorate quando si vede)'(b) {
    const { ctx, p, errs } = await open(b); await w(p, 600);
    await p.fill('#authPw', 'Pista2026');
    const before = await p.evaluate(() => document.querySelector('#authPw').type);
    await tapSel(p, '[data-pw-eye]'); await w(p, 250);
    const shown = await p.evaluate(() => ({ type: document.querySelector('#authPw').type, eye: document.querySelector('[data-pw-eye]').getAttribute('data-pw-eye'), val: document.querySelector('#authPw').value }));
    await tapSel(p, '[data-pw-eye]'); await w(p, 250);
    const after = await p.evaluate(() => document.querySelector('#authPw').type);
    await ctx.close();
    assert(before === 'password', 'all\'inizio la password è nascosta: ' + before);
    assert(shown.type === 'text' && shown.eye === 'open' && shown.val === 'Pista2026', 'toccando il casco si vede: ' + JSON.stringify(shown));
    assert(after === 'password', 'toccando di nuovo si nasconde: ' + after);
    assert(!errs.length, errs.join(' | '));
  },

  async 'Pro con una pubblicità guardata fino in fondo; spegnendo lo schermo torna normale'(b) {
    const { ctx, p, errs } = await open(b, { init: PHONE('ok') }); await login(p); await w(p, 600);
    const off = await chip(p);
    await watchAd(p);
    const on = await chip(p), page = await text(p), calls = await p.evaluate(() => window.__ads.slice());
    await w(p, 2700);   // finito l'annuncio, l'app torna in primo piano: poi uno spegnimento dello schermo conta
    await screenOff(p); await w(p, 400);
    const later = await chip(p);
    await ctx.close();
    assert(off === 'off', 'prima della pubblicità niente Pro: ' + off);
    assert(calls.some(c => c.startsWith('prepareRewardVideoAd')) && calls.includes('showRewardVideoAd'), 'annuncio con premio non mostrato: ' + calls.join(','));
    assert(on === 'on', 'dopo la pubblicità il Pro deve essere attivo: ' + on);
    assert(/Funzioni Pro sbloccate finché non chiudi l'app/.test(page), 'manca l\'avviso del Pro sbloccato');   // 1/11: nuovo testo
    assert(later === 'off', 'spegnendo lo schermo il Pro gratis finisce: ' + later);
    assert(!errs.length, errs.join(' | '));
  },

  async 'Pro con una pubblicità chiusa prima della fine: niente Pro e l\'avviso lo spiega'(b) {
    const { ctx, p, errs } = await open(b, { init: PHONE('skip') }); await login(p); await w(p, 600);
    await watchAd(p);
    const on = await chip(p), page = await text(p);
    await ctx.close();
    assert(on === 'off', 'senza premio niente Pro: ' + on);
    assert(/Guarda il video fino in fondo/.test(page), 'manca l\'avviso: guarda fino in fondo');   // 1/11: nuovo testo
    assert(!errs.length, errs.join(' | '));
  },

  async 'chat: entrando nella stanza parte il mio profilo (una voce sola, anche rientrando)'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    const enter = async () => { await tapSel(p, '[data-nav-tab="race"]'); await w(p, 400); await tapSel(p, '[data-race-chat]'); await w(p, 500); await tapText(p, 'Chat Generale'); await w(p, 900); };
    await enter();
    await tapSel(p, '[aria-label="Indietro"]'); await w(p, 400);
    await enter();
    const room = await p.evaluate(() => window.firebase.__fake.doc('shared/bt-chat-generale'));
    await ctx.close();
    const list = (room && (room.__arr || room.items || room.list)) || (Array.isArray(room) ? room : []);
    const mine = list.filter(x => x && x.pe === 1 && x.aid === authorId('a@b.it'));
    assert(mine.length === 1, 'nella stanza deve esserci una sola voce del mio profilo: ' + JSON.stringify(list).slice(0, 300));
    assert(mine[0].p && typeof mine[0].p === 'object', 'la voce porta il profilo: ' + JSON.stringify(mine[0]));
    assert(!errs.length, errs.join(' | '));
  },

  async 'vibrazioni F1: DRS con lo swipe; semaforo, via, pistola e bandiera a scacchi nel Pit Stop'(b) {
    const { ctx, p, errs } = await open(b, { init: FX_SPY }); await login(p); await w(p, 300);
    await swipeBar(p, -220);
    const swipe = await vibs(p);
    await openGame(p, 'pitstop');
    await tapSel(p, '[data-pit-start]');
    for (let i = 0; i < 40 && (await phase(p)) !== 'go'; i++) await w(p, 100);
    const start = await vibs(p);
    for (let k = 0; k < 4; k++) for (const wh of ['fl', 'fr', 'rl', 'rr']) { await tapSel(p, `[data-pit-wheel="${wh}"]`); await w(p, 120); }
    await w(p, 500);
    const end = await vibs(p), done = await phase(p);
    await ctx.close();
    assert(has(swipe, 'drs'), 'lo swipe deve vibrare come il DRS: ' + swipe.join(' '));
    assert(start.filter(x => x === JSON.stringify(BUZZ.lights)).length === 3, 'tre luci del semaforo, tre colpi: ' + start.join(' '));
    assert(has(start, 'go'), 'luci spente: manca il via: ' + start.join(' '));
    assert(end.filter(x => x === JSON.stringify(BUZZ.gun)).length === 8, 'la pistola svita e avvita 4 ruote (8 volte): ' + end.join(' '));
    assert(done === 'done' && has(end, 'flag'), 'a fine pit stop la bandiera a scacchi: ' + done + ' ' + end.slice(-3).join(' '));
    assert(!errs.length, errs.join(' | '));
  },

  // 31/10 sera (Edoardo, screenshot): il profilo di FT22 mostrava solo "si vedono dal suo prossimo messaggio".
  async 'profilo pubblico: entrando nell\'app si salva il mio; in chat si vede quello di chi non ha mai mandato il profilo'(b) {
    const FT = authorId('ft22@b.it');
    const seed = {
      'shared/bt-chat-generale': { __arr: [{ id: 'f1', user: 'FT22', aid: FT, txt: 'ehh Kimi sicuro', t: Date.parse('2026-10-25T20:10:00Z') }] },
      ['fanta/profilo-' + FT]: { name: 'FT22', aid: FT, p: { t: 'mercedes', d: 'antonelli', h: { base: '#00D2BE', c1: '#FFFFFF', c2: '#111111', pattern: 'stripes', visor: 'smoke', finish: 'gloss' }, w: ['pitcrew'] }, medal: 'bronzo', t: Date.parse('2026-10-30T10:00:00Z') },
    };
    const { ctx, p, errs } = await open(b, { seed: { addDocs: seed } }); await login(p); await w(p, 1500);
    const mine = await p.evaluate(k => window.firebase.__fake.doc(k), 'fanta/profilo-' + authorId('a@b.it'));
    await tapSel(p, '[data-nav-tab="race"]'); await w(p, 400); await tapSel(p, '[data-race-chat]'); await w(p, 500); await tapText(p, 'Chat Generale'); await w(p, 800);
    await tapText(p, 'FT22'); await w(p, 900);
    const sheet = await p.evaluate(() => { const e = document.querySelector('[data-chat-profile]'); return e ? { text: e.innerText.replace(/\s+/g, ' '), team: (e.querySelector('[data-chat-profile-team]') || {}).getAttribute ? e.querySelector('[data-chat-profile-team]').getAttribute('data-chat-profile-team') : null, empty: !!e.querySelector('[data-chat-profile-empty]'), trophy: !!e.querySelector('[data-chat-profile-trophy="pitcrew"]'), stats: !!e.querySelector('[data-chat-profile-stats]') } : null; });
    await ctx.close();
    assert(mine && mine.name && mine.aid === authorId('a@b.it') && !('email' in mine), 'il mio profilo pubblico non è stato salvato (o porta l\'email): ' + JSON.stringify(mine));
    assert(sheet, 'il profilo veloce non si apre');
    assert(sheet.team === 'mercedes' && sheet.trophy && !sheet.empty, 'deve vedersi il profilo pubblico di FT22: ' + JSON.stringify(sheet));
    assert(sheet.stats && /MESSAGGI QUI 1/.test(sheet.text) && /25\/10\/2026/.test(sheet.text), 'mancano i numeri della stanza: ' + sheet.text);
    assert(!/prossimo messaggio/.test(sheet.text), 'c\'è ancora la scritta vecchia: ' + sheet.text);
    assert(!errs.length, errs.join(' | '));
  },

  // 31/10 sera (Edoardo: "non ci sono i dati che si aggiornano in Ghost Lap e Tire degradation"): nel weekend in corso
  // il Degrado gomme parte dalle prove libere scaricate (qui i file veri di public/data/f1: le sessioni del Messico che ci sono).
  async 'degrado gomme nel weekend del Messico: prove libere scaricate, l\'ultima di serie, long run veri'(b) {
    const F1DIR = require('path').join(__dirname, '../../public/data/f1');
    const routes = { 'https://bt-app-2.vercel.app/data/f1/**': r => {
      const f = require('path').join(F1DIR, new URL(r.request().url()).pathname.split('/').pop());
      return require('fs').existsSync(f) ? r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: require('fs').readFileSync(f, 'utf8') }) : r.fulfill({ status: 404, body: '' });
    } };
    // 7/11: il file si aggiorna da solo a ogni weekend: la prova usa l'ultimo weekend con le prove libere e la sua data.
    const WK = { 'mx-1962': ['2026-10-31T10:00:00Z', /Messico/], 'br-1940': ['2026-11-07T10:00:00Z', /San Paolo|Brasile|Interlagos/] };
    const lastFp = Object.keys(require(require('path').join(F1DIR, 'weekend.json')).practice).filter(k => WK[k]).sort((a, b) => WK[b][0].localeCompare(WK[a][0]))[0];
    const { ctx, p, errs } = await open(b, { now: WK[lastFp][0], routes }); await login(p); await w(p, 1500);
    await tapSel(p, '[data-nav-tab="garage"]'); await w(p, 500); await tapSel(p, '[data-game="deg"]'); await w(p, 600);
    const st = await p.evaluate(() => ({
      src: (document.querySelector('[data-deg-src][aria-pressed="true"]') || {}).getAttribute ? document.querySelector('[data-deg-src][aria-pressed="true"]').getAttribute('data-deg-src') : null,
      fps: [...document.querySelectorAll('[data-deg-fp]')].map(e => e.getAttribute('data-deg-fp') + (e.getAttribute('aria-pressed') === 'true' ? '*' : '')),
      rows: document.querySelectorAll('[data-deg-row]').length,
      text: document.querySelector('[data-deg]').innerText.replace(/\s+/g, ' ').slice(0, 300),
    }));
    await ctx.close();
    assert(st.src === 'practice', 'di serie le prove libere del weekend in corso: ' + JSON.stringify(st));
    const fpsMx = Object.keys(require(require('path').join(F1DIR, 'weekend.json')).practice[lastFp]);   // le attese dai file (cambiano a ogni sessione)
    assert(st.fps.join(',') === fpsMx.map((k, i) => k + (i === fpsMx.length - 1 ? '*' : '')).join(','), 'sessioni ' + fpsMx.join(', ') + ', l\'ultima scelta: ' + st.fps.join(','));
    assert(st.rows >= 5, 'long run: ' + st.rows);
    assert(WK[lastFp][1].test(st.text), 'manca il nome del GP: ' + st.text);
    assert(!errs.length, errs.join(' | '));
  },
});
