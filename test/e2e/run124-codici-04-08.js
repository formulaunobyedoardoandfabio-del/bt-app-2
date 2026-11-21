// 15/11 (Edoardo): codici del terminale 04 pubblicazione rapida, 05 reset forzato, 06 errori dell'app, 07 prova
// notifiche, 08 interruttore d'emergenza (numerazione scelta da lui: due 06 nella lista). 04, 06 e 08 solo admin.
// Logica: test/unit/secret-codes.test.js, test/unit/errlog.test.js. Uso: node test/e2e/run124-codici-04-08.js [filtro]
const { open, w, tapSel, login, assert, run } = require('./helpers');

const term = async (p, admin) => {
  if (admin) await p.evaluate(() => window.firebase.__fake.setDoc('admins/a@b.it', { ruolo: 'admin' }));
  await tapSel(p, '[aria-label="Profilo"]'); await w(p, 600);
  await tapSel(p, '[data-hack-open]'); await w(p, 1800);
};
const type = async (p, code, wait = 700) => { await p.fill('[data-hack-input]', code); await p.press('[data-hack-input]', 'Enter'); await w(p, wait); };
const said = p => p.evaluate(() => (document.querySelector('[data-hack-term]') || {}).innerText || '');

run({
  // 21/11 (Edoardo: "se viene sbloccata è solo momentanea su quel telefono"): spegnendo con 08 su Firebase restava
  // maintenance: true (si scrive con merge e la chiave mancava). Ora si spegne per tutti, anche dopo il riavvio.
  async 'admin: 08 con la manutenzione accesa la spegne su Firebase, e un altro telefono vede l\'app aperta'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: { 'shared/bt-flags': { pitSwipe: false, hiddenQs: [], maintenance: true } } } });
    await login(p); await w(p, 600);
    await term(p, true);
    await type(p, '08', 1200);
    const t8 = await said(p);
    const flags = await p.evaluate(() => window.firebase.__fake.doc('shared/bt-flags'));
    await ctx.close();
    assert(/MANUTENZIONE SPENTA/.test(t8), '08 con la manutenzione accesa la spegne: ' + t8.slice(-200));
    assert(flags && flags.maintenance === false, 'su Firebase deve restare spenta: ' + JSON.stringify(flags));
    // Un altro telefono (utente normale) che legge quel documento: app aperta.
    const o = await open(b, { seed: { addDocs: { 'shared/bt-flags': flags } } });
    await login(o.p); await w(o.p, 800);
    const closed = await o.p.evaluate(() => !!document.querySelector('[data-maintenance]'));
    await o.ctx.close();
    assert(!closed, 'l\'altro telefono vede ancora la manutenzione: ' + JSON.stringify(flags));
    assert(!errs.length && !o.errs.length, errs.concat(o.errs).join(' | '));
  },

  async 'utente normale: 04, 06 e 08 sono riservati all\'admin; 07 manda la notifica di prova'(b) {
    const { ctx, p } = await open(b);
    await login(p); await w(p, 600);
    await term(p, false);
    for (const c of ['04', '06', '08']) await type(p, c);
    const t = await said(p);
    await type(p, '07', 4200);
    const toast = await p.evaluate(() => document.body.innerText);
    await ctx.close();
    assert((t.match(/CODICE RISERVATO ALL'ADMIN/g) || []).length === 3, 'tre volte "riservato": ' + t.slice(-300));
    assert(/Prova notifica B&T/.test(toast), 'la notifica di prova arriva (qui come avviso nell\'app): ' + toast.slice(0, 200));
  },

  async 'admin: 06 mostra gli errori del telefono, 08 accende la manutenzione per tutti, 04 apre il modulo delle notizie'(b) {
    const { ctx, p } = await open(b);
    await login(p); await w(p, 600);
    await p.evaluate(() => console.error('errore di prova del 15/11'));
    await term(p, true);
    await type(p, '06');
    const errs = await said(p);
    await type(p, '08', 1200);
    const t8 = await said(p);
    const flags = await p.evaluate(() => window.firebase.__fake.doc('shared/bt-flags'));
    const adminSees = await p.evaluate(() => !!document.querySelector('[data-maintenance]'));
    const adminBar = await p.evaluate(() => (document.querySelector('[data-maintenance-bar]') || {}).textContent || '');   // 16/11
    await type(p, '04', 1500);
    const form = await p.evaluate(() => !!document.querySelector('#adImg'));
    await ctx.close();
    assert(/CONSOLE: errore di prova del 15\/11/.test(errs), '06: c\'è l\'errore della console: ' + errs.slice(-300));
    assert(/MANUTENZIONE ACCESA/.test(t8) && flags && flags.maintenance === true, '08: manutenzione accesa su Firebase: ' + JSON.stringify(flags));
    assert(!adminSees, 'l\'admin non vede la schermata di manutenzione');
    assert(/Scrivi 08 nel terminale/.test(adminBar), '16/11: ma vede la striscia che la manutenzione è accesa: ' + adminBar);
    assert(form, '04: si apre il modulo per pubblicare (Pannello, NEWS)');
  },

  async 'manutenzione accesa: chi non è admin vede solo la schermata di manutenzione'(b) {
    const { ctx, p } = await open(b, { seed: { addDocs: { 'shared/bt-flags': { pitSwipe: false, maintenance: true } } } });
    await login(p); await w(p, 1200);
    const r = await p.evaluate(() => ({ m: !!document.querySelector('[data-maintenance]'), text: (document.querySelector('[data-maintenance]') || {}).innerText || '' }));
    await ctx.close();
    assert(r.m && /MANUTENZIONE/.test(r.text) && /Accedi \(solo admin\)/.test(r.text), 'schermata di manutenzione: ' + JSON.stringify(r));
  },

  async '05: svuota la copia sul telefono e ricarica l\'app da Firebase'(b) {
    const { ctx, p } = await open(b);
    await login(p); await w(p, 600);
    await term(p, false);
    const before = await p.evaluate(() => { window.__primaDelReset = 1; return Object.keys(localStorage).filter(k => /bt-sc[:-]/.test(k)).length; });
    await type(p, '05', 2500);
    const after = await p.evaluate(() => ({ mark: window.__primaDelReset === 1 }));
    await ctx.close();
    assert(before > 0, 'prima c\'era la copia dei dati sul telefono: ' + before);
    assert(!after.mark, 'l\'app si è ricaricata: ' + JSON.stringify(after));
  },
});
