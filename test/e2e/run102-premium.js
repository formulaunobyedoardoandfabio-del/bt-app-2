// 8/11 (Edoardo: "metti queste nuove grafiche funzionanti", design "B&T Premium, nuovo design 2"): il Premium è una
// pagina a schermo intero con le sue schermate (src/premium/Premium.jsx). La prova dura 14 giorni e finisce da sola
// (scelta di Edoardo: niente carta, niente addebiti); le schermate della carta del design sono tolte (nell'APK paga
// Google Play con la sua finestra). Uso: node test/build-test.js && node test/e2e/run102-premium.js [filtro]
const { open, w, tapSel, text, login, assert, run } = require('./helpers');

// Telefono finto (APK): Google Play (con numero d'ordine vero), notifiche, file e condivisione; tutto registrato.
const PHONE = ({ orderId = 'GPA.3312-4455-6677-88990' } = {}) => `(() => {
  window.__buys = []; window.__notifs = []; window.__perm = []; window.__files = []; window.__shares = [];
  window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'android', Plugins: {
    App: { addListener: () => Promise.resolve({ remove() {} }), exitApp: () => Promise.resolve(), minimizeApp: () => Promise.resolve() },
    SystemBars: { hide: () => Promise.resolve() },
    NativePurchases: {
      isBillingSupported: () => Promise.resolve({ isBillingSupported: true }),
      getProducts: o => Promise.resolve({ products: o.productType === 'subs'
        ? [{ identifier: 'premium_stagione', planIdentifier: 'stagione', offerId: null, offerToken: 'tok-base', priceString: '5,99 €' }]
        : [{ identifier: 'caffe', priceString: '1,99 €' }] }),
      purchaseProduct: o => { window.__buys.push(o); return Promise.resolve({ transactionId: 'GPA.1', orderId: ${JSON.stringify(orderId)}, purchaseToken: 'ptok', productIdentifier: o.productIdentifier, purchaseState: 'PURCHASED' }); },
      getPurchases: () => Promise.resolve({ purchases: [] }),
      manageSubscriptions: () => Promise.resolve(),
    },
    LocalNotifications: {
      checkPermissions: () => Promise.resolve({ display: window.__perm.length ? 'granted' : 'prompt' }),
      requestPermissions: () => { window.__perm.push('ask'); return Promise.resolve({ display: 'granted' }); },
      cancel: () => Promise.resolve(),
      schedule: o => { window.__notifs.push(...o.notifications.map(n => ({ id: n.id, at: +n.schedule.at, title: n.title }))); return Promise.resolve(); },
    },
    Filesystem: { writeFile: o => { window.__files.push({ path: o.path, dir: o.directory, head: String(o.data).slice(0, 8) }); return Promise.resolve({ uri: 'file:///cache/' + o.path }); } },
    Share: { share: o => { window.__shares.push(o); return Promise.resolve(); } },
  } };
})();`;
const TRIAL_USED = { 'users/a@b.it': { name: 'Tester', email: 'a@b.it', about: { birth: null, follow: 2, fan: 'vivo' }, app2: { premium: { sub: false, trial: { start: 1, end: 2 } } } } };
const screen = p => p.evaluate(() => { const e = document.querySelector('[data-premium-sheet]'); return e ? e.getAttribute('data-premium-screen') : null; });
const sheetText = p => p.evaluate(() => { const e = document.querySelector('[data-premium-sheet]'); return e ? e.innerText : ''; });
const doc = (p, k) => p.evaluate(k => window.firebase.__fake.doc(k), k);
const DAY = 86400000;

run({
  async 'Premium: pagina a schermo intero, cosa sblocchi, piani coi prezzi veri, Confronta e Sblocca senza pagare, niente carta'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await w(p, 400);
    await tapSel(p, '[data-premium-chip="off"]'); await w(p, 500);
    const home = await p.evaluate(() => {
      const sh = document.querySelector('[data-premium-sheet]'), r = sh.getBoundingClientRect();
      return { screen: sh.getAttribute('data-premium-screen'), full: r.top <= 1 && r.height >= window.innerHeight - 1, bg: getComputedStyle(sh).backgroundColor,
        title: sh.querySelector('[data-premium-title]').textContent, perks: sh.querySelectorAll('[data-premium-perks] > *').length,
        plans: [...sh.querySelectorAll('[data-plan]')].map(e => e.getAttribute('data-plan') + ':' + e.getAttribute('aria-checked')),
        saving: (sh.querySelector('[data-saving]') || {}).textContent || null, cta: sh.querySelector('[data-premium-cta]').textContent,
        after: (sh.querySelector('[data-after-trial]') || {}).textContent || '', inputs: sh.querySelectorAll('input').length, wide: document.documentElement.scrollWidth > window.innerWidth };
    });
    await p.screenshot({ path: '/tmp/bt/premium-1-home.png', fullPage: false });
    await tapSel(p, '[data-premium-compare]'); await w(p, 400);
    const cmp = { screen: await screen(p), rows: await p.evaluate(() => document.querySelectorAll('[data-premium-table] > div').length), text: await sheetText(p) };
    await p.screenshot({ path: '/tmp/bt/premium-2-confronta.png' });
    await tapSel(p, '[aria-label="Indietro"]'); await w(p, 300);
    const back = await screen(p);
    await tapSel(p, '[data-premium-free]'); await w(p, 400);
    const free = { screen: await screen(p), text: await sheetText(p), missing: await p.evaluate(() => document.querySelectorAll('[data-trophy-missing]').length) };
    await p.screenshot({ path: '/tmp/bt/premium-3-gratis.png' });
    await tapSel(p, '[aria-label="Indietro"]'); await w(p, 300);
    await tapSel(p, '[data-premium-close]'); await w(p, 400);
    const closed = await screen(p);
    await ctx.close();
    assert(home.screen === 'home' && home.full && home.bg === 'rgb(0, 0, 0)', 'pagina nera a schermo intero: ' + JSON.stringify(home));
    assert(/ingegnere di pista/.test(home.title), 'titolo del design: ' + home.title);
    assert(home.perks === 4, 'quattro cose che sblocchi: ' + home.perks);
    assert(home.plans.join(',') === 'annual:true,month:false', 'Stagione scelta, Mensile accanto: ' + home.plans);
    assert(/Risparmi il \d+%/.test(home.saving || ''), 'risparmio vero: ' + home.saving);
    assert(home.cta === 'Prova 2 settimane gratis', 'tasto della prova: ' + home.cta);
    assert(/finisce da sola dopo 14 giorni/.test(home.after) && /nessun addebito/.test(home.after), 'la prova finisce da sola: ' + home.after);
    assert(home.inputs === 0, 'nessun campo per la carta');
    assert(!home.wide, 'niente scorrimento in orizzontale');
    assert(cmp.screen === 'compare' && cmp.rows === 5 && /Pubblicità/.test(cmp.text) && /Video esclusivi B&T/.test(cmp.text), 'Gratis o Premium: ' + JSON.stringify(cmp).slice(0, 300));
    assert(back === 'home', 'Indietro torna al Premium: ' + back);
    assert(free.screen === 'free' && /COI TROFEI, PER SEMPRE/.test(free.text) && /Hai \d+ trofe[oi]/.test(free.text) && /\d+ su \d+/.test(free.text), 'Sblocca senza pagare: ' + free.text.slice(0, 300));
    assert(free.missing > 0, 'i trofei che mancano');
    assert(closed === null, 'X chiude la pagina');
    assert(!errs.length, errs.join(' | '));
  },

  async 'Prova gratuita: Conferma onesta (0 €, finisce da sola), 14 giorni salvati nell\'account, avviso 2 giorni prima, poi la schermata della prova'(b) {
    const { ctx, p, errs } = await open(b, { init: PHONE() }); await login(p); await w(p, 800);
    await tapSel(p, '[data-premium-chip="off"]'); await w(p, 500);
    await tapSel(p, '[data-premium-cta]'); await w(p, 400);
    const conf = { screen: await screen(p), text: await sheetText(p), total: await p.evaluate(() => document.querySelector('[data-premium-total]').textContent) };
    await p.screenshot({ path: '/tmp/bt/premium-6-conferma-prova.png' });
    await tapSel(p, '[data-confirm-cta]'); await w(p, 150);
    const paying = await screen(p);
    await w(p, 1800);
    const done = { screen: await screen(p), text: await sheetText(p) };
    await p.screenshot({ path: '/tmp/bt/premium-8-attivo-prova.png' });
    const user = await doc(p, 'users/a@b.it');
    const notifs = await p.evaluate(() => ({ list: window.__notifs.slice(), perm: window.__perm.slice() }));
    await tapSel(p, '[data-premium-close]'); await w(p, 400);
    await tapSel(p, '[data-premium-chip]'); await w(p, 500);
    const again = { screen: await screen(p), text: await sheetText(p), left: await p.evaluate(() => (document.querySelector('[data-trial-left]') || { getAttribute: () => null }).getAttribute('data-trial-left')) };
    await p.screenshot({ path: '/tmp/bt/premium-4-prova-attiva.png' });
    await ctx.close();
    assert(conf.screen === 'confirm', 'Conferma: ' + conf.screen);
    assert(/GIORNO 14/.test(conf.text) && /La prova finisce da sola/.test(conf.text) && /Nessuna carta e nessun addebito/.test(conf.text), 'Conferma onesta: ' + conf.text.slice(0, 400));
    assert(!/inizia l'abbonamento/i.test(conf.text), 'nessun abbonamento che parte da solo');
    assert(conf.total === '0,00 €', 'totale oggi: ' + conf.total);
    assert(paying === 'paying', 'schermata Attivazione: ' + paying);
    assert(done.screen === 'active' && /Benvenuto/.test(done.text) && /PROVA ATTIVA/.test(done.text) && /FINO AL 21 OTTOBRE/.test(done.text), 'Premium attivo: ' + done.text.slice(0, 300));
    const tr = user && user.app2 && user.app2.premium && user.app2.premium.trial;
    assert(tr && tr.end - tr.start === 14 * DAY, 'prova di 14 giorni nell\'account: ' + JSON.stringify(tr));
    const warn = notifs.list.find(n => n.id === 130);
    assert(notifs.perm.length === 1, 'permesso delle notifiche chiesto adesso, perché serve: ' + JSON.stringify(notifs.perm));
    assert(warn && warn.at === Date.parse('2026-10-19T16:00:00Z') && /2 giorni/.test(warn.title), 'avviso 2 giorni prima alle 18: ' + JSON.stringify(notifs.list));
    assert(again.screen === 'trial' && again.left === '14' && /Giorno 1 di 14/.test(again.text), 'schermata della prova: ' + JSON.stringify(again).slice(0, 300));
    assert(!errs.length, errs.join(' | '));
  },

  // 8/11 (Edoardo: "il codice a barre serve come prova vera e univoca; se ci sono problemi manda una mail col PDF allegato")
  async 'APK: abbonamento con Google Play dalla Conferma, ricevuta col codice a barre del numero d\'ordine vero, PDF da salvare e da mandarci'(b) {
    const { ctx, p, errs } = await open(b, { init: PHONE(), seed: { addDocs: TRIAL_USED } }); await login(p); await w(p, 900);
    await tapSel(p, '[data-premium-chip="off"]'); await w(p, 500);
    const cta = await p.evaluate(() => document.querySelector('[data-premium-cta]').textContent);
    await tapSel(p, '[data-premium-cta]'); await w(p, 400);
    const conf = await sheetText(p);
    await tapSel(p, '[data-confirm-cta]'); await w(p, 2000);
    const done = { screen: await screen(p), text: await sheetText(p) };
    const buys = await p.evaluate(() => window.__buys.slice());
    await tapSel(p, '[data-premium-receipt-open]'); await w(p, 1600);
    const rec = { screen: await screen(p), order: await p.evaluate(() => (document.querySelector('[data-receipt-field="N. ordine"]') || {}).textContent || ''), text: await sheetText(p),
      code: await p.evaluate(() => { const e = document.querySelector('[data-receipt-barcode]'); return e ? { id: e.getAttribute('data-receipt-barcode'), bars: e.querySelectorAll('rect').length } : null; }) };
    await p.screenshot({ path: '/tmp/bt/premium-9-ricevuta.png' });
    await tapSel(p, '[data-receipt-pdf]'); await w(p, 400);
    await tapSel(p, '[data-receipt-help]'); await w(p, 400);
    const out = await p.evaluate(() => ({ files: window.__files.slice(), shares: window.__shares.slice() }));
    const user = await doc(p, 'users/a@b.it');
    await ctx.close();
    assert(cta === "Abbonati · 5,99 € all'anno", 'prova già usata: si abbona, col prezzo di Google Play: ' + cta);
    assert(/Paghi con Google Play/.test(conf) && /5,99 €/.test(conf) && !/GIORNO 14/.test(conf), 'Conferma dell\'abbonamento: ' + conf.slice(0, 300));
    assert(buys.length === 1 && buys[0].productIdentifier === 'premium_stagione', 'acquisto: ' + JSON.stringify(buys));
    assert(done.screen === 'active' && /STAGIONE/.test(done.text), 'Premium attivo: ' + done.text.slice(0, 200));
    assert(rec.screen === 'receipt' && rec.order === 'GPA.3312-4455-6677-88990' && /Non è un documento fiscale/.test(rec.text), 'ricevuta: ' + JSON.stringify(rec).slice(0, 300));
    const pr = user && user.app2 && user.app2.premium;
    assert(pr && pr.sub && pr.plan === 'season' && pr.receipt && pr.receipt.orderId === 'GPA.3312-4455-6677-88990' && pr.receipt.price === '5,99 €', 'ricevuta nell\'account: ' + JSON.stringify(pr));
    assert(rec.code && rec.code.id === 'GPA.3312-4455-6677-88990' && rec.code.bars > 50, 'codice a barre del numero d\'ordine (Code 128; lettura vera: tools/scan-receipt.py): ' + JSON.stringify(rec.code));
    assert(out.files.length === 2 && out.files.every(f => f.head === 'JVBERi0x' && f.dir === 'CACHE'), 'PDF scritto (base64 di %PDF-1): ' + JSON.stringify(out.files));
    assert(out.shares.length === 2 && out.shares.every(s => /BT-Premium-ricevuta-.*\.pdf$/.test(s.url)), 'Condividi col PDF: ' + JSON.stringify(out.shares));
    const help = out.shares[1];
    assert(/bt\.formula1@gmail\.com/.test(help.dialogTitle) && /Per: bt\.formula1@gmail\.com/.test(help.text) && /N\. ordine Google Play: GPA\.3312-4455-6677-88990/.test(help.text) && /Account: a@b\.it/.test(help.text), 'mail per i problemi col PDF allegato: ' + JSON.stringify(help));
    assert(!errs.length, errs.join(' | '));
  },
});
