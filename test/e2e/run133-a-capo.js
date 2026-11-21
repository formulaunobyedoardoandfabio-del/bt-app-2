// 21/11 (Edoardo: "cercare un po' in tutta l'app dove ci sono cambi di riga a capo a caso che rendono tutto brutto"):
// a 360 e 390 px, nelle schermate principali, nessun testo corto su 2 righe, nessuna parola sola sull'ultima riga e
// nessuna parola spezzata (misura in test/e2e/wrap-lib.js; elenco completo anche a 320 px con node tools/wrap-scan.js).
// A 320 px qualche etichetta di 2-3 parole può andare su 2 righe, bilanciate.
// Uso: node test/build-test.js && node test/e2e/run133-a-capo.js
const { open, w, tapSel, tapText, goTab, login, assert, run } = require('./helpers');
const { scan } = require('./wrap-lib');

async function back(p) {
  for (let i = 0; i < 4; i++) {
    const had = await p.evaluate(() => { const b = document.querySelector('[aria-label="Indietro"], [aria-label="Chiudi"]'); if (b) b.click(); return !!b; });
    if (!had) return;
    await w(p, 350);
  }
}
async function tour(b, width) {
  const { ctx, p, errs } = await open(b, { seed: { pro: true }, width, height: 800 });
  await login(p); await w(p, 900);
  const bad = [];
  const at = async (screen, act) => { await act(); await w(p, 700); bad.push(...await scan(p, screen, width)); };
  await at('Home', () => goTab(p, 'Home'));
  await at('Fanta', () => goTab(p, 'Fanta'));
  await at('Race', () => goTab(p, 'Race'));
  for (const rt of await p.evaluate(() => [...document.querySelectorAll('[data-race-tab]')].map(e => e.getAttribute('data-race-tab')))) await at('Race/' + rt, () => tapSel(p, `[data-race-tab="${rt}"]`));
  await at('Profilo', () => tapSel(p, '[aria-label="Profilo"]'));
  await at('Profilo/Personalizza', () => tapText(p, "Personalizza l'app", { exact: true }));
  await at('Profilo/Trofei', () => tapSel(p, '[data-trophies-open]'));
  await back(p);
  await at('Notifiche', async () => { await goTab(p, 'Home'); await tapSel(p, '[aria-label="Notifiche"]'); });
  await back(p);
  await at('Circuito', async () => { await goTab(p, 'Race'); await w(p, 400); await tapSel(p, '[data-circuit-cta]'); });
  await back(p);
  await at('Premium', async () => { await goTab(p, 'Home'); await tapSel(p, '[data-premium-chip]'); });
  await ctx.close();
  return { bad, errs };
}

run({
  async 'a 360 px niente a-capo brutti'(b) {
    const { bad, errs } = await tour(b, 360);
    assert(!bad.length, bad.map(x => `${x.kind} ${x.screen}: "${x.text}"`).join(' | '));
    assert(!errs.length, errs.join(' | '));
  },
  async 'a 390 px niente a-capo brutti'(b) {
    const { bad, errs } = await tour(b, 390);
    assert(!bad.length, bad.map(x => `${x.kind} ${x.screen}: "${x.text}"`).join(' | '));
    assert(!errs.length, errs.join(' | '));
  },
});
