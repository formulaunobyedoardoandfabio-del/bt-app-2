// 31/10 (Edoardo): temi delle feste (src/logic/holidays.js, design in docs/design/temi-feste.html): colori, segno sul
// bottone B&T, caricamento a tema, interruttore nel Profilo, comando dell'admin (shared/bt-holidays, scheda TEMI).
// Uso: node test/build-test.js && node test/e2e/run79-feste.js [filtro]
const { open, w, text, tapText, tapSel, login, openAdmin, assert, run } = require('./helpers');

const mark = p => p.evaluate(() => { const e = document.querySelector('[data-holiday-mark]'); return e ? e.getAttribute('data-holiday-mark') : null; });
const logoBg = p => p.evaluate(() => getComputedStyle(document.querySelector('[data-logo]')).backgroundColor);
const doc = (p, k) => p.evaluate(x => window.firebase.__fake.doc(x), k);

run({
  async 'Halloween (31 ottobre): caricamento con le zucche, zucca sul bottone B&T, tasti arancio'(b) {
    // Avvio dopo il primo (niente video): il caricamento; la prova guarda lo splash senza aspettare che sparisca.
    const { ctx, p, errs } = await open(b, { now: '2026-10-31T18:00:00Z', waitSplash: false, init: () => localStorage.setItem('bt_bt-intro-seen', 'true') });
    const loader = await p.waitForSelector('[data-holiday-loader="halloween"]', { timeout: 4000 }).then(() => true, () => false);
    await p.waitForFunction(() => !document.querySelector('[data-splash]'), null, { timeout: 8000 }).catch(() => {});
    await login(p); await w(p, 600);
    const m = await mark(p), bg = await logoBg(p);
    await ctx.close();
    assert(loader, 'manca il caricamento con le zucche');
    assert(m === 'halloween', 'segno sul bottone B&T: ' + m);
    assert(/rgb\(2[0-5]\d, 1[0-4]\d, \d{1,2}\)/.test(bg), 'il bottone B&T deve essere arancio: ' + bg);
    assert(!errs.length, errs.join(' | '));
  },
  async 'Natale e Befana nelle loro date; in un giorno qualunque nessun tema'(b) {
    const out = {};
    for (const [k, now] of [['natale', '2026-12-10T10:00:00Z'], ['befana', '2027-01-06T10:00:00Z'], ['niente', '2026-11-15T10:00:00Z']]) {
      const { ctx, p, errs } = await open(b, { now }); await login(p); await w(p, 500);
      out[k] = await mark(p);
      if (errs.length) out[k + 'Err'] = errs.join(' | ');
      await ctx.close();
    }
    assert(out.natale === 'natale' && out.befana === 'befana' && out.niente === null, JSON.stringify(out));
  },
  async 'Profilo: "Temi delle feste" si spegne e resta spento (anche nell\'account)'(b) {
    const { ctx, p, errs } = await open(b, { now: '2026-10-31T18:00:00Z' }); await login(p); await w(p, 500);
    await tapSel(p, '[aria-label="Profilo"]'); await w(p, 400);
    await tapSel(p, '[role="switch"][aria-label="Temi delle feste"]'); await w(p, 1500);
    await tapSel(p, '[aria-label="Indietro"]'); await w(p, 400);
    const m = await mark(p), user = await doc(p, 'users/a@b.it');
    await ctx.close();
    assert(m === null, 'spento: niente zucca sul bottone: ' + m);
    assert(user && user.app2 && user.app2.holidays === false, 'nell\'account: ' + JSON.stringify(user && user.app2 && user.app2.holidays));
    assert(!errs.length, errs.join(' | '));
  },
  async 'admin: scheda TEMI, Monza "Sempre" in un giorno qualunque e Halloween "Spento"'(b) {
    const { ctx, p, errs } = await open(b, { now: '2026-10-31T18:00:00Z' }); await login(p); await w(p, 500);
    await openAdmin(p, 'TEMI'); await w(p, 300);
    await tapSel(p, '[data-admin-holiday="halloween"] [data-hol-mode="off"]'); await w(p, 600);
    const cfg1 = await doc(p, 'shared/bt-holidays');
    await tapSel(p, '[data-admin-holiday="monza"] [data-hol-mode="force"]'); await w(p, 600);
    const cfg2 = await doc(p, 'shared/bt-holidays');
    await tapSel(p, '[aria-label="Indietro"]'); await w(p, 300); await tapSel(p, '[aria-label="Indietro"]'); await w(p, 400);
    const m = await mark(p);
    await ctx.close();
    assert(cfg1 && cfg1.off && cfg1.off.includes('halloween'), 'Halloween spento in Firebase: ' + JSON.stringify(cfg1));
    assert(cfg2 && cfg2.force === 'monza', 'Monza sempre in Firebase: ' + JSON.stringify(cfg2));
    assert(m === 'monza', 'col comando dell\'admin c\'è il tricolore: ' + m);
    assert(!errs.length, errs.join(' | '));
  },
  async 'Halloween: una zucca ogni due schede (3 al giorno): dolcetto = casco Zucca, scherzetto = bandiera gialla, trofeo'(b) {
    const { ctx, p, errs } = await open(b, { now: '2026-10-31T18:00:00Z' }); await login(p); await w(p, 600);
    const tabs = ['garage', 'fanta', 'race', 'home', 'garage', 'fanta'];
    const seen = [];
    let trick = false, wore = false, notice = '';
    for (const t of tabs) {
      await tapSel(p, `[data-nav-tab="${t}"]`); await w(p, 600);
      const has = await p.evaluate(() => !!document.querySelector('[data-pumpkin]'));
      seen.push(t + ':' + (has ? 'zucca' : '-'));
      if (!has) continue;
      await tapSel(p, '[data-pumpkin]'); await w(p, 400);
      if (!wore) { await tapSel(p, '[data-pumpkin-treat]'); await w(p, 300); await tapSel(p, '[data-pumpkin-wear]'); await w(p, 1200); wore = true; }
      else { await tapSel(p, '[data-pumpkin-trick]'); await w(p, 300); trick = trick || await p.evaluate(() => !!document.querySelector('[data-trick]')); await w(p, 2300); }
      notice = notice || await p.evaluate(() => document.body.innerText.includes('Cacciatore di zucche') ? 'si' : '');
    }
    const user = await doc(p, 'users/a@b.it'), more = await p.evaluate(() => !!document.querySelector('[data-pumpkin]'));
    await ctx.close();
    assert(seen.filter(x => x.endsWith('zucca')).length === 3, 'tre zucche, una ogni due schede: ' + seen.join(' '));
    assert(!more, 'dopo 3 zucche, basta per oggi');
    assert(user && user.app2 && user.app2.helmet && user.app2.helmet.base === '#FF7A1A' && user.app2.helmet.pattern === 'flames', 'casco Zucca nell\'account: ' + JSON.stringify(user && user.app2 && user.app2.helmet));
    assert(trick, 'lo scherzetto mostra la finta bandiera gialla');
    assert(user.app2.trophies && user.app2.trophies.zucche, 'trofeo "Cacciatore di zucche": ' + JSON.stringify(user.app2.trophies));
    assert(notice === 'si', 'avviso del trofeo');
    assert(!errs.length, errs.join(' | '));
  },
  async 'fuori da Halloween nessuna zucca'(b) {
    const { ctx, p, errs } = await open(b, { now: '2026-11-15T10:00:00Z' }); await login(p); await w(p, 500);
    let any = false;
    for (const t of ['garage', 'fanta', 'race', 'home']) { await tapSel(p, `[data-nav-tab="${t}"]`); await w(p, 400); any = any || await p.evaluate(() => !!document.querySelector('[data-pumpkin]')); }
    await ctx.close();
    assert(!any, 'zucca fuori stagione');
    assert(!errs.length, errs.join(' | '));
  },
});
