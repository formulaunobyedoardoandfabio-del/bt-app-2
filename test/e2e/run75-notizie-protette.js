// 30/10 (Edoardo): nelle notizie niente screenshot, registrazioni né "Cerchia e cerca" (FLAG_SECURE col plugin nativo
// SecureScreen, aggiunto da scripts/prepare_android.py): si accende aprendo una notizia e si spegne uscendo.
// Uso: node test/build-test.js && node test/e2e/run75-notizie-protette.js [filtro]
const { open, w, tapText, tapSel, login, assert, run } = require('./helpers');

const NEWS = { 'shared/bt-news': { __arr: [{ id: 'n1', title: 'Pole per Antonelli ad Austin', summary: 'Giro perfetto nel Q3', category: 'NEWS', content: 'Il testo della notizia di prova.', date: '2026-10-06T10:00:00Z', image: '' }] } };
// Telefono finto (APK) col plugin SecureScreen che registra le chiamate.
const PHONE = () => {
  window.__secure = [];
  window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'android', Plugins: {
    App: { addListener: () => Promise.resolve({ remove() {} }), exitApp: () => Promise.resolve(), minimizeApp: () => Promise.resolve() },
    SystemBars: { hide: () => Promise.resolve() },
    SecureScreen: { set: o => { window.__secure.push(!!(o && o.on)); return Promise.resolve(); } },
  } };
};
const last = p => p.evaluate(() => { const l = window.__secure || []; return l.length ? l[l.length - 1] : null; });

run({
  async 'notizia aperta: schermo protetto; uscendo, di nuovo libero'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: NEWS }, init: PHONE });
    await login(p); await w(p, 400);
    const home = await last(p);
    await tapText(p, 'Pole per Antonelli ad Austin'); await w(p, 500);
    const article = await last(p);
    await tapSel(p, '[aria-label="Indietro"]'); await w(p, 500);
    const back = await last(p);
    await ctx.close();
    assert(home !== true, 'in Home lo schermo non deve essere protetto: ' + home);
    assert(article === true, 'aprendo la notizia lo schermo deve essere protetto: ' + article);
    assert(back === false, 'uscendo dalla notizia la protezione deve spegnersi: ' + back);
    assert(!errs.length, errs.join(' | '));
  },
});
