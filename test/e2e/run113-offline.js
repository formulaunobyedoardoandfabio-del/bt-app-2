// 14/11 (Edoardo: "metti se non c'è connessione la funzione offline dove mostra tutto quello che può fare offline l'app
// e basta ma se l'utente vuole può sempre riprovare a riconnettersi"). Senza rete l'app mostra solo quello che funziona
// così (notizie scaricate, salvati, classifica dell'ultima copia, giochi del Garage senza rete) e il bottone
// "Riprova a collegarti". Torna la rete: si torna all'app di sempre.
// Uso: node test/build-test.js && node test/e2e/run113-offline.js
const { open, w, tapSel, tapText, login, assert, run } = require('./helpers');

const news = (n) => ({ id: 'n' + n, title: 'Notizia scaricata numero ' + n, summary: 'Riassunto ' + n, category: 'NEWS', author: 'Team B&T', image: '', content: 'Testo senza rete ' + n + '.', published: true, date: `2026-11-0${n}T10:00:00Z` });
const NEWS = { 'shared/bt-news': { __arr: [news(1), news(2), news(3)] } };
const USER = app2 => ({ 'users/a@b.it': { name: 'Tester', nick: 'Tester', email: 'a@b.it', about: { birth: null, follow: 2, fan: 'vivo' }, app2 } });
const SEED = { addDocs: { ...NEWS, ...USER({ saved: ['n2'] }) } };
const goOffline = async (ctx, p) => { await p.evaluate(() => { window.firebase.__fake.offline = true; }); await ctx.setOffline(true); await w(p, 700); };
const goOnline = async (ctx, p) => { await p.evaluate(() => { window.firebase.__fake.offline = false; }); await ctx.setOffline(false); await w(p, 1500); };
const state = p => p.evaluate(() => ({
  mode: !!document.querySelector('[data-offline-mode]'),
  nav: !!document.querySelector('[data-bottom-nav]'),
  text: document.body.innerText,
  retry: !!document.querySelector('[data-offline-retry]'),
  close: !!document.querySelector('[data-offline-close]'),
}));

run({
  async 'senza rete: si vede solo quello che va senza rete, con "Riprova a collegarti"'(b) {
    const { ctx, p, errs } = await open(b, { seed: SEED });
    await login(p); await w(p, 1200);
    const before = await state(p);
    await goOffline(ctx, p);
    const s = await state(p);
    await tapText(p, 'Notizia scaricata numero 3'); await w(p, 700);
    const art = await p.evaluate(() => document.body.innerText);
    await tapSel(p, '[aria-label="Indietro"]'); await w(p, 600);
    const back = await state(p);
    await tapSel(p, '[data-offline-game="pitstop"]'); await w(p, 600);
    const pit = await p.evaluate(() => !!document.querySelector('[data-pit-start]'));
    await ctx.close();
    assert(!before.mode && before.nav, 'con la rete l\'app è quella di sempre');
    assert(s.mode && !s.nav, 'senza rete: la schermata offline al posto delle schede (niente barra in basso)');
    assert(s.retry && /Riprova a collegarti/.test(s.text), 'c\'è "Riprova a collegarti"');
    assert(!s.close, 'senza rete non si chiude: solo quello che va offline');
    assert(/Notizia scaricata numero 1/.test(s.text) && /Notizia scaricata numero 3/.test(s.text), 'le notizie scaricate ci sono');
    assert(/SALVATI/.test(s.text) && /Notizia scaricata numero 2/.test(s.text), 'i salvati ci sono');
    assert(/Pit Stop Challenge/.test(s.text) && /Guida 2D dei tracciati/.test(s.text), 'i giochi che vanno senza rete');
    assert(/Testo senza rete 3\./.test(art), 'la notizia scaricata si legge senza rete');
    assert(back.mode, 'tornando indietro dalla notizia si torna alla schermata offline');
    assert(pit, 'il Pit Stop si gioca senza rete');
    assert(!errs.length, errs.join(' | '));
  },

  async 'riprova: ancora niente rete lo dice; torna la rete e si torna all\'app'(b) {
    const { ctx, p, errs } = await open(b, { seed: SEED });
    await login(p); await w(p, 1200);
    await goOffline(ctx, p);
    await tapSel(p, '[data-offline-retry]'); await w(p, 1500);
    const still = await state(p);
    await goOnline(ctx, p);
    await tapSel(p, '[data-offline-retry]').catch(() => {}); await w(p, 1200);
    const back = await state(p);
    await ctx.close();
    assert(still.mode && /Ancora niente rete/.test(still.text), 'riprovando senza rete: "Ancora niente rete": ' + still.text.slice(0, 200));
    assert(!back.mode && back.nav, 'tornata la rete: l\'app di sempre, con la barra in basso');
    assert(!errs.length, errs.join(' | '));
  },

  async 'rete che non risponde: la riga "Sei offline" apre la schermata offline, che si può chiudere'(b) {
    const { ctx, p, errs } = await open(b, { seed: { ...SEED, holdReads: true } });
    await tapText(p, 'ENTRA COME OSPITE'); await w(p, 1500);
    await p.waitForSelector('[data-offline-open]', { timeout: 15000 }).catch(() => {});
    const line = await p.evaluate(() => !!document.querySelector('[data-offline-open]'));
    await tapSel(p, '[data-offline-open]'); await w(p, 600);
    const s = await state(p);
    await tapSel(p, '[data-offline-close]'); await w(p, 500);
    const after = await state(p);
    await ctx.close();
    assert(line, 'nella riga "Sei offline" c\'è il bottone per vedere cosa si può fare');
    assert(s.mode && s.retry && s.close, 'schermata offline aperta a mano, con Riprova e Chiudi: ' + JSON.stringify({ mode: s.mode, retry: s.retry, close: s.close }));
    assert(!after.mode && after.nav, 'chiusa: si torna all\'app');
    assert(!errs.length, errs.join(' | '));
  },
});
