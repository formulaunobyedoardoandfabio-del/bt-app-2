// 14/11 (Edoardo: "ottimizzazione dell'app e velocità di caricamento").
// (1) Da fermi l'app non deve far lavorare il telefono: il riflesso dei tasti grandi (.cta-shine) animava "left", che fa
//     rifare l'impaginazione a ogni fotogramma (misurato: circa 34 impaginazioni al secondo su Home, Fanta e Race anche
//     col tasto fuori schermo). Regola del progetto: animazioni solo con transform e opacity.
// (2) Avvio: dal secondo avvio l'app si apre coi contenuti dell'ultima volta (copia sul telefono) senza aspettare
//     Firebase; quando Firebase risponde li aggiorna. Il servizio è provato in test/unit/appdata.test.js.
// Uso: node test/build-test.js && node test/e2e/run107-fluidita.js [filtro]
const { open, w, login, goTab, tapSel, tapText, assert, run } = require('./helpers');

const NOW = '2026-11-17T10:00:00Z';
// Animazioni che stanno girando: nome e proprietà animate (senza offset, easing, composite).
const running = p => p.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').map(a => {
  const e = a.effect, tm = e && e.getComputedTiming ? e.getComputedTiming() : {};
  const props = e && e.getKeyframes ? [...new Set(e.getKeyframes().flatMap(k => Object.keys(k)))].filter(k => !['offset', 'easing', 'composite', 'computedOffset'].includes(k)) : [];
  return { name: a.animationName || a.transitionProperty || '?', props, endless: tm.iterations === Infinity };
}));
const OK = new Set(['transform', 'opacity', 'offsetDistance']);   // offsetDistance: il puntino sul tracciato (non impagina)
const bad = list => list.filter(a => a.endless && a.props.some(x => !OK.has(x))).map(a => a.name + ' [' + a.props.join(',') + ']');
const NEWS = { 'shared/bt-news': { __arr: [{ id: 'n-cache', title: 'Notizia messa da parte sul telefono', cat: 'F1', text: 'Testo.', date: '2026-11-16', src: 'B&T' }] } };

run({
  async 'da fermi nessuna animazione senza fine muove l\'impaginazione (Home, Fanta, Race)'(b) {
    const { ctx, p, errs } = await open(b, { now: NOW }); await login(p); await w(p, 2000);
    const home = await running(p);
    await goTab(p, 'FANTA'); await w(p, 2000); const fanta = await running(p);
    await goTab(p, 'RACE'); await w(p, 2000); const race = await running(p);
    await ctx.close();
    assert(home.some(a => a.name === 'ctashine'), 'il riflesso dei tasti c\'è ancora (la prova guarda davvero qualcosa): ' + JSON.stringify(home));
    assert(!bad(home).length, 'Home: ' + bad(home).join('; '));
    assert(!bad(fanta).length, 'Fanta: ' + bad(fanta).join('; '));
    assert(!bad(race).length, 'Race: ' + bad(race).join('; '));
    assert(!errs.length, errs.join(' | '));
  },

  async 'secondo avvio con Firebase che non risponde: l\'app si apre lo stesso coi contenuti dell\'ultima volta'(b) {
    // holdReads: Firebase non risponde finché la prova non lo sblocca. Primo avvio: si sblocca, i contenuti arrivano
    // (e si mettono da parte). Secondo avvio: resta bloccato → prima lo splash restava fino a 15 secondi.
    const { ctx, p, errs } = await open(b, { now: NOW, waitSplash: false, seed: { holdReads: true, addDocs: NEWS } });
    await p.evaluate(() => { window.firebase.__fake.holdReads = false; });
    await p.waitForFunction(() => !document.querySelector('[data-splash]'), null, { timeout: 8000 });
    await w(p, 800);
    const kept = await p.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('bt_bt-sc:')).length);
    await p.reload();
    const t0 = Date.now();
    const gone = await p.waitForFunction(() => !document.querySelector('[data-splash]'), null, { timeout: 5000 }).then(() => true, () => false);
    const ms = Date.now() - t0;
    const held = await p.evaluate(() => window.firebase.__fake.holdReads);
    const offlineRow = await p.evaluate(() => /Sei offline/i.test(document.body.innerText));
    await p.evaluate(() => { try { window.localStorage.setItem('bt_bt-entry', JSON.stringify('form')); } catch (e) {} });
    // da ospite si guarda la Home: la notizia è quella messa da parte
    const guest = await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /ospite/i.test(x.textContent)); if (b) b.click(); return !!b; });
    await w(p, 900);
    const body = await p.evaluate(() => document.body.innerText);
    await ctx.close();
    assert(kept >= 10, 'i contenuti letti sono stati messi da parte sul telefono: ' + kept);
    assert(held === true, 'al secondo avvio Firebase è davvero bloccato');
    assert(gone && ms < 3500, 'lo splash se ne va senza aspettare Firebase: ' + gone + ' in ' + ms + ' ms');
    assert(!offlineRow, 'niente riga "Sei offline" mentre Firebase sta ancora rispondendo');
    assert(guest, 'tasto per entrare come ospite trovato');
    assert(/Notizia messa da parte sul telefono/.test(body), 'in Home c\'è la notizia dell\'ultima volta: ' + body.slice(0, 300).replace(/\n/g, ' / '));
    assert(!errs.length, errs.join(' | '));
  },

  async 'utente entrato, secondo avvio con Firebase che non risponde: si apre la Home col profilo dell\'ultima volta; poi arrivano i dati'(b) {
    const { ctx, p, errs } = await open(b, { now: NOW, waitSplash: false, seed: { holdReads: true, addDocs: NEWS } });
    await p.evaluate(() => { window.firebase.__fake.holdReads = false; });
    await p.waitForFunction(() => !document.querySelector('[data-splash]'), null, { timeout: 8000 });
    await login(p); await w(p, 1500);
    await p.reload();                                            // Firebase di nuovo bloccato (holdReads)
    const t0 = Date.now();
    const gone = await p.waitForFunction(() => !document.querySelector('[data-splash]'), null, { timeout: 5000 }).then(() => true, () => false);
    const ms = Date.now() - t0;
    await w(p, 400);
    const early = await p.evaluate(() => ({ held: window.firebase.__fake.holdReads, text: document.body.innerText, tabs: !document.querySelector('input[type="password"]') && /ULTIME NEWS/.test(document.body.innerText), reads: window.firebase.__fake.reads.filter(x => x === 'users/a@b.it').length }));
    await p.evaluate(() => { window.firebase.__fake.holdReads = false; });   // Firebase risponde
    await w(p, 1500);
    await goTab(p, 'FANTA'); await w(p, 800);
    const late = await p.evaluate(() => ({ text: document.body.innerText, reads: window.firebase.__fake.reads.filter(x => x === 'users/a@b.it').length }));
    await ctx.close();
    assert(early.held === true, 'Firebase è bloccato al secondo avvio');
    assert(gone && ms < 3500, 'lo splash se ne va senza aspettare il profilo: ' + gone + ' in ' + ms + ' ms');
    assert(early.tabs, 'si vede l\'app (non la schermata di accesso): ' + early.text.slice(0, 200).replace(/\n/g, ' / '));
    assert(/Notizia messa da parte sul telefono/.test(early.text), 'con i contenuti dell\'ultima volta');
    assert(!/Sei offline/i.test(early.text), 'niente riga "Sei offline"');
    assert(/Squadra del Tester/i.test(late.text), 'sbloccato Firebase arrivano i dati personali (la squadra)');
    assert(late.reads === 1, 'il profilo si legge una volta sola (dati personali compresi): ' + late.reads);
    assert(!errs.length, errs.join(' | '));
  },

  async 'chat: stanza ferma → si rilegge sempre meno spesso; arriva un messaggio → si vede e si torna ogni 4 secondi'(b) {
    const GEN = { 'shared/bt-chat-generale': { __arr: [{ id: 'n1', user: 'Fabio', aid: 'afabio', txt: 'ciao', t: Date.now() - 60000 }] } };
    const { ctx, p, errs } = await open(b, { now: NOW, seed: { addDocs: GEN } }); await login(p); await w(p, 800);
    await goTab(p, 'RACE');
    await tapSel(p, '[data-race-chat]'); await w(p, 300);
    await tapText(p, 'Chat Generale'); await w(p, 300);
    // letture della Generale con l'ora: si registra ogni get
    await p.evaluate(() => {
      const f = window.firebase.__fake; f.times = [];
      const push = f.reads.push.bind(f.reads);
      f.reads.push = x => { if (x === 'shared/bt-chat-generale') f.times.push(Date.now()); return push(x); };
    });
    await w(p, 32000);
    const quiet = await p.evaluate(() => window.firebase.__fake.times.slice());
    // un altro tifoso scrive
    await p.evaluate(() => {
      const f = window.firebase.__fake, d = f.doc('shared/bt-chat-generale');
      f.setDoc('shared/bt-chat-generale', { __arr: [...d.__arr, { id: 'n2', user: 'Edo', aid: 'aedo', txt: 'semaforo verde', t: Date.now() }] });
      f.times = []; f.wrote = Date.now();
    });
    await p.waitForFunction(() => /semaforo verde/.test(document.body.innerText), null, { timeout: 17000 });
    const shownAfter = await p.evaluate(() => Date.now() - window.firebase.__fake.wrote);
    await w(p, 4600);
    const after = await p.evaluate(() => window.firebase.__fake.times.slice());
    await ctx.close();
    const gaps = quiet.slice(1).map((t, i) => t - quiet[i]);
    assert(quiet.length >= 3 && quiet.length <= 5, 'in 32 secondi senza novità 3-5 letture (prima 8): ' + quiet.length + ' ' + JSON.stringify(gaps));
    assert(gaps.every((g, i) => i === 0 || g >= gaps[i - 1] - 400), 'il giro si allunga: ' + JSON.stringify(gaps));
    assert(Math.max(...gaps) <= 15800, 'mai più di 15 secondi: ' + JSON.stringify(gaps));
    assert(shownAfter <= 16500, 'il messaggio nuovo si vede entro 15 secondi: ' + shownAfter);
    assert(after.length >= 2, 'dopo il messaggio nuovo si torna ogni 4 secondi: ' + after.length);
    assert(!errs.length, errs.join(' | '));
  },
});
