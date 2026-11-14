// 13/11 (tester: "accesso lento, a un certo punto si blocca"): dopo Authentication l'app leggeva tre volte di fila
// (profilo, admin, poi di nuovo il profilo per i dati personali) e a ogni accesso rileggeva tutta la chat Generale.
// Ora: profilo e admin insieme, i dati personali dal profilo già letto, la Generale controllata una volta per telefono,
// la chat non si rilegge con l'app non in vista. I servizi sono provati in test/unit/account.test.js e chat.test.js.
// Uso: node test/build-test.js && node test/e2e/run105-accesso-svelto.js
const { open, w, tapSel, tapText, login, goTab, assert, run } = require('./helpers');

const GEN = { 'shared/bt-chat-generale': { __arr: [{ id: 'n1', user: 'Fabio', aid: 'afabio', txt: 'ciao', t: Date.now() - 60000 }] } };
const reads = p => p.evaluate(() => window.firebase.__fake.reads.slice());
const clear = p => p.evaluate(() => { window.firebase.__fake.reads.length = 0; });
const count = (list, path) => list.filter(x => x === path).length;

run({
  async 'accesso: users/<email> si legge una volta sola e i dati personali ci sono (squadra del Fanta)'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: GEN } });
    await w(p, 600); await clear(p);
    await login(p); await w(p, 1500);
    const r = await reads(p);
    await goTab(p, 'FANTA'); await w(p, 700);
    const body = await p.evaluate(() => document.body.innerText);
    await ctx.close();
    assert(count(r, 'users/a@b.it') === 1, 'profilo letto una volta (prima due): ' + r.filter(x => /^(users|admins)\//.test(x)).join(', '));
    assert(count(r, 'admins/a@b.it') === 1, 'admin letto una volta: ' + r.filter(x => /^(users|admins)\//.test(x)).join(', '));
    assert(/Squadra del Tester/i.test(body), 'i dati personali sono arrivati: la squadra salvata si vede');
    assert(!errs.length, errs.join(' | '));
  },

  async 'accesso: la chat Generale si controlla una volta per telefono, non a ogni accesso'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: GEN } });
    await w(p, 600); await clear(p);
    await login(p);
    // il controllo parte con l'accesso: si aspetta che il telefono se lo sia segnato (al massimo 8 secondi)
    await p.waitForFunction(() => window.localStorage.getItem('bt_bt-chat-migrated') === 'true', null, { timeout: 8000 }).catch(() => {});
    const flag = await p.evaluate(() => window.localStorage.getItem('bt_bt-chat-migrated'));
    const first = count(await reads(p), 'shared/bt-chat-generale');
    await p.reload(); await w(p, 3500);   // app riaperta con la sessione salvata: le letture ripartono da zero
    const again = count(await reads(p), 'shared/bt-chat-generale');
    await ctx.close();
    assert(first === 1, 'primo accesso: si guarda se la Generale c\'è (' + first + ')');
    assert(flag === 'true', 'il telefono se lo ricorda: ' + flag);
    assert(again === 0, 'riaprendo l\'app con la sessione salvata non si rilegge: ' + again);
    assert(!errs.length, errs.join(' | '));
  },

  async 'chat aperta: con l\'app non in vista non si rilegge; tornando in vista si rilegge subito'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: GEN } });
    await login(p); await w(p, 800);
    await goTab(p, 'RACE');
    await tapSel(p, '[data-race-chat]'); await w(p, 300);
    await tapText(p, 'Chat Generale'); await w(p, 600);
    await clear(p); await w(p, 9000);
    const seen = count(await reads(p), 'shared/bt-chat-generale');
    await p.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await w(p, 300); await clear(p); await w(p, 9000);
    const hidden = count(await reads(p), 'shared/bt-chat-generale');
    await p.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await w(p, 800);
    const back = count(await reads(p), 'shared/bt-chat-generale');
    await ctx.close();
    assert(seen >= 1, 'in vista si rilegge (14/11: stanza ferma → giro che si allunga, prova in run107): ' + seen);
    assert(hidden === 0, 'non in vista non si rilegge: ' + hidden);
    assert(back >= 1, 'tornando in vista si rilegge subito: ' + back);
    assert(!errs.length, errs.join(' | '));
  },
});
