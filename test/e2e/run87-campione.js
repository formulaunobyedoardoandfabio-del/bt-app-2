// 2/11 (Edoardo: "metti nel codice le cose del campione del mondo"): versione ridotta. Con un vantaggio più grande dei
// punti ancora in palio compare una volta la schermata del campione; nel Mondiale la riga ha "CAMPIONE".
// Uso: node test/build-test.js && node test/e2e/run87-campione.js
const { open, w, tapSel, login, goTab, assert, run } = require('./helpers');
const PILOTI = (lead) => ({ 'shared/bt-piloti': { __arr: [
  { name: 'Andrea Kimi Antonelli', team: 'Mercedes', position: 1, points: 300 + lead },
  { name: 'George Russell', team: 'Mercedes', position: 2, points: 300 },
  { name: 'Lando Norris', team: 'McLaren', position: 3, points: 250 },
] } });

// 8/11 (Edoardo): la schermata del campione compare solo aprendo il profilo del campione (non da sola all'avvio).
const openChampProfile = async p => {
  await goTab(p, 'RACE'); await w(p, 400);
  await tapSel(p, '[data-race-tab="mondiale"]').catch(() => {}); await w(p, 500);
  await tapSel(p, '[data-champ-podium] [data-podium-place="1"] button'); await w(p, 700);
};
run({
  async 'campione deciso: schermata solo aprendo il suo profilo e una volta sola, poi "CAMPIONE" nel Mondiale; non deciso: niente'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: PILOTI(400) } }); await login(p); await w(p, 1200);
    const atStart = await p.evaluate(() => !!document.querySelector('[data-champ]'));
    await openChampProfile(p);
    const shown = await p.evaluate(() => { const e = document.querySelector('[data-champ]'); return e ? e.getAttribute('data-champ') + '|' + e.innerText.replace(/\s+/g, ' ') : null; });
    await tapSel(p, '[data-champ-close]').catch(() => {}); await w(p, 300);
    await p.reload(); await w(p, 400);
    await p.waitForFunction(() => !document.querySelector('[data-splash]'), null, { timeout: 8000 }).catch(() => {}); await w(p, 1200);
    await openChampProfile(p);
    const again = await p.evaluate(() => !!document.querySelector('[data-champ]'));
    await p.keyboard.press('Escape').catch(() => {});
    const tag = await p.evaluate(() => !!document.querySelector('[data-champ-tag]'));
    await ctx.close();
    assert(!atStart, 'all\'avvio la schermata del campione non deve comparire da sola');
    const no = await open(b, { seed: { addDocs: PILOTI(10) } }); await login(no.p); await w(no.p, 1200);
    const none = await no.p.evaluate(() => !!document.querySelector('[data-champ]'));
    await no.ctx.close();
    assert(shown && shown.startsWith('antonelli|') && /CAMPIONE DEL MONDO/.test(shown) && /ANTONELLI/.test(shown), 'schermata del campione: ' + shown);
    assert(!again, 'la schermata compare una volta sola');
    assert(tag, 'nel Mondiale manca "CAMPIONE"');
    assert(!none, 'con 10 punti di vantaggio e tanti GP rimasti non è campione');
    assert(!errs.length && !no.errs.length, errs.concat(no.errs).join(' | '));
  },
});
