// Richieste di Edoardo del 24/10 sera: il Premium resta dopo aver chiuso e riaperto l'app (prova e abbonamento di
// prova), la prova finisce da sola alla fine del GP; icone nuove nel Garage, anche per i giochi "In arrivo";
// classifiche e meteo in tempo reale da fonti gratuite; pubblicità AdMob solo nell'APK.
// Uso: node test/build-test.js && node test/e2e/run70-sistemazioni.js [filtro]
const { open, w, text, tapSel, tapText, goTab, login, assert, run } = require('./helpers');

const chip = p => p.evaluate(() => { const e = document.querySelector('[data-premium-chip]'); return e ? e.getAttribute('data-premium-chip') + ':' + e.innerText.replace(/\s+/g, ' ').trim() : null; });
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

  async 'Premium: l\'abbonamento di prova resta dopo aver chiuso e riaperto l\'app'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
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
});
