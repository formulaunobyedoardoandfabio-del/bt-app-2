// 7/11 (Edoardo: "metti il primo file HTML al posto di signup e login, il secondo per la schermata di caricamento
// se internet è molto lento"): design "Accesso e Registrazione" e "Icone F1 in orbita" (src/benvenuto/).
// Schede di benvenuto (6 + l'Entrata), giro guidato dell'ospite, accesso col nuovo stile, orbita quando la rete è lenta.
// Uso: node test/build-test.js && node test/e2e/run89-accesso.js [filtro]
const { open, w, text, norm, inner, count, has, tapText, tapSel, goTab, login, assert, run } = require('./helpers');

const entry = p => p.evaluate(() => JSON.parse(localStorage.getItem('bt_bt-entry') || 'null'));
const step = p => p.evaluate(() => { const e = document.querySelector('[data-welcome]'); return e ? { kind: e.getAttribute('data-welcome'), n: +e.getAttribute('data-welcome-step') } : null; });
const BAKU_LIVE = { 'shared/bt-races': { __arr: [{ id: 'r15', name: "GP dell'Azerbaigian", circuit: 'Baku City Circuit', country: 'Azerbaigian', round: 15, date: '2026-09-26T15:00:00', status: 'LIVE', totalLaps: 51, circuitId: 'az-2016' }] } };

run({
  async 'primo avvio: sei schede con le barre, Avanti fino all\'Entrata, che resta ricordata'(b) {
    const { ctx, p, errs } = await open(b, { welcome: true });
    const s0 = await step(p), bars0 = await count(p, '[data-welcome-bar="on"]'), all = await count(p, '[data-welcome-bar]');
    const t0 = await text(p);
    const titles = [];
    for (let i = 0; i < 6; i++) { titles.push(norm(await inner(p, '[data-welcome] h1'))); await tapSel(p, '[data-welcome-next]'); await w(p, 350); }
    const s1 = await step(p), t1 = await text(p), e1 = await entry(p), barsDoor = await count(p, '[data-welcome-bar="on"]');
    const login0 = await has(p, '#authEmail');
    await ctx.close();
    assert(s0 && s0.kind === 'slide' && s0.n === 0 && bars0 === 1 && all === 7, 'prima scheda e 7 barre: ' + JSON.stringify({ s0, bars0, all }));
    assert(/Salta/.test(t0) && !login0, 'sulla prima scheda c\'è Salta e non c\'è ancora l\'accesso');
    assert(titles.join('|') === 'Le notizie che contano, subito|La gara, secondo per secondo|Costruisci la tua squadra|Parlane con chi tifa come te|La telemetria, giro per giro|Tutto sullo stesso schermo', 'titoli delle schede: ' + titles.join('|'));
    assert(s1 && s1.kind === 'door' && barsDoor === 7, 'dopo la sesta scheda l\'Entrata con tutte le barre: ' + JSON.stringify({ s1, barsDoor }));
    assert(/Il paddock è aperto/.test(t1) && /Entra come ospite/.test(t1) && /Crea il tuo account/.test(t1) && /Ho già un account/.test(t1) && !/Salta/.test(t1), 'testi dell\'Entrata: ' + t1.slice(0, 200));
    assert(e1 === 'door', 'l\'Entrata vista non si ricorda: ' + e1);
    assert(!errs.length, errs.join(' | '));
  },

  async 'Salta porta all\'Entrata; lo swipe a sinistra va avanti e a destra torna indietro'(b) {
    const { ctx, p, errs } = await open(b, { welcome: true });
    const swipe = async dx => { const box = await p.evaluate(() => { const r = document.querySelector('[data-welcome]').getBoundingClientRect(); return { x: r.width / 2, y: r.height / 2 }; }); await p.mouse.move(box.x, box.y); await p.mouse.down(); await p.mouse.move(box.x + dx, box.y + 4, { steps: 6 }); await p.mouse.up(); await w(p, 350); };
    await swipe(-140); const a = await step(p);
    await swipe(-140); const b2 = await step(p);
    await swipe(140); const c = await step(p);
    await tapSel(p, '[data-welcome-skip]'); await w(p, 350); const d = await step(p);
    await ctx.close();
    assert(a.n === 1 && b2.n === 2 && c.n === 1, 'swipe tra le schede: ' + JSON.stringify([a, b2, c]));
    assert(d.kind === 'door', 'Salta non porta all\'Entrata: ' + JSON.stringify(d));
    assert(!errs.length, errs.join(' | '));
  },

  async 'riaperta l\'app dopo le schede: subito l\'Entrata, poi Crea il tuo account e Ho già un account'(b) {
    const { ctx, p, errs } = await open(b, { welcome: true, init: () => { try { localStorage.setItem('bt_bt-entry', JSON.stringify('door')); } catch (e) {} } });
    const s0 = await step(p);
    await tapSel(p, '[data-door-register]'); await w(p, 400);
    const reg = await p.evaluate(() => { const e = document.querySelector('[data-login]'); return e ? e.getAttribute('data-login') : null; });
    const regText = await text(p);
    await tapSel(p, '[data-login-door]'); await w(p, 400);
    const back = await step(p);
    await tapSel(p, '[data-door-login]'); await w(p, 400);
    const lg = await p.evaluate(() => { const e = document.querySelector('[data-login]'); return e ? e.getAttribute('data-login') : null; });
    const font = await p.evaluate(() => getComputedStyle(document.querySelector('[data-login] h1')).fontFamily);
    await login(p); await w(p, 600);
    const inApp = await has(p, '[aria-label="Profilo"]'), e1 = await entry(p);
    await ctx.close();
    assert(s0 && s0.kind === 'door', 'con le schede già viste si parte dall\'Entrata: ' + JSON.stringify(s0));
    assert(reg === 'register' && /Crea il tuo account/.test(regText) && /Data di nascita/.test(regText), 'Crea il tuo account apre la registrazione: ' + reg);
    assert(back && back.kind === 'door', 'la freccia indietro non torna all\'Entrata: ' + JSON.stringify(back));
    assert(lg === 'login' && /Manrope/.test(font), 'Ho già un account apre ACCEDI col carattere del design: ' + lg + ' ' + font);
    assert(inApp && e1 === 'form', 'dopo l\'accesso si entra e il telefono ricorda l\'accesso: ' + inApp + ' ' + e1);
    assert(!errs.length, errs.join(' | '));
  },

  async 'ospite dall\'Entrata: giro guidato in 5 passi sulle parti vere dell\'app, una volta sola'(b) {
    const { ctx, p, errs } = await open(b, { welcome: true, init: () => { try { localStorage.setItem('bt_bt-entry', JSON.stringify('door')); } catch (e) {} } });
    await tapSel(p, '[data-door-guest]'); await w(p, 700);
    const seen = [];
    for (let i = 0; i < 5; i++) {
      seen.push(await p.evaluate(() => { const t = document.querySelector('[data-guest-tour]'); const s = document.querySelector('[data-tour-spot="on"]'); return t ? { n: +t.getAttribute('data-guest-tour'), title: t.querySelector('[role="dialog"]').innerText.split('\n')[1], spot: !!s } : null; }));
      if (i < 4) { await tapSel(p, '[data-tour-next]'); await w(p, 350); }
    }
    const lastText = await inner(p, '[data-guest-tour]');
    await tapSel(p, '[data-tour-done]'); await w(p, 400);
    const gone = !(await has(p, '[data-guest-tour]')), saved = await p.evaluate(() => !!localStorage.getItem('bt_bt-guest-tour'));
    const home = await has(p, '[data-home]');
    await ctx.close();
    assert(seen.every((s, i) => s && s.n === i + 1 && s.spot), 'passi del giro con il riquadro acceso: ' + JSON.stringify(seen));
    assert(seen.map(s => s.title).join('|') === 'Qui trovi le notizie|La gara in diretta|Il tuo FantaF1|Il Garage|Crea il tuo account', 'titoli del giro: ' + seen.map(s => s && s.title).join('|'));
    assert(/5 di 5/.test(lastText) && /Continua a guardare/.test(lastText), 'ultimo passo: ' + lastText);
    assert(gone && saved && home, 'Continua a guardare chiude il giro e lo ricorda: ' + JSON.stringify({ gone, saved, home }));
    assert(!errs.length, errs.join(' | '));
  },

  async 'giro guidato: Crea il tuo account apre la registrazione; ENTRA COME OSPITE da Accedi non fa il giro'(b) {
    const { ctx, p, errs } = await open(b, { welcome: true, init: () => { try { localStorage.setItem('bt_bt-entry', JSON.stringify('door')); } catch (e) {} } });
    await tapSel(p, '[data-door-guest]'); await w(p, 600);
    for (let i = 0; i < 4; i++) { await tapSel(p, '[data-tour-next]'); await w(p, 250); }
    await tapSel(p, '[data-tour-register]'); await w(p, 500);
    const mode = await p.evaluate(() => { const e = document.querySelector('[data-login]'); return e ? e.getAttribute('data-login') : null; });
    await ctx.close();
    const two = await open(b);
    await tapText(two.p, 'ENTRA COME OSPITE'); await w(two.p, 700);
    const tour2 = await has(two.p, '[data-guest-tour]'), home2 = await has(two.p, '[data-home]');
    await two.ctx.close();
    assert(mode === 'register', 'dal giro si apre REGISTRATI: ' + mode);
    assert(!tour2 && home2, 'da Accedi l\'ospite entra senza giro: ' + JSON.stringify({ tour2, home2 }));
    assert(!errs.length && !two.errs.length, errs.concat(two.errs).join(' | '));
  },

  async 'rete lenta all\'avvio: prima i LED, dopo 2,5 secondi le icone F1 in orbita'(b) {
    const { ctx, p, errs } = await open(b, { query: '?nofake', waitSplash: false, waitUntil: 'domcontentloaded', routes: { 'https://www.gstatic.com/**': () => {} } });
    await w(p, 1200);
    const early = await has(p, '[data-orbit-loader]');
    await w(p, 2400);
    const late = await p.evaluate(() => { const e = document.querySelector('[data-orbit-loader]'); return e ? e.innerText : null; });
    await ctx.close();
    assert(!early, 'l\'orbita compare subito: deve aspettare che la rete sia lenta');
    assert(late && /Casco|Monoposto|Volante|Gomme/.test(late) && /rete è lenta/.test(late), 'dopo 2,5 secondi niente orbita: ' + late);
    assert(!errs.length, errs.join(' | '));
  },

  async 'dati della gara che non arrivano: dopo 2,5 secondi l\'orbita nella scheda della sessione'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: BAKU_LIVE }, routes: { 'https://api.openf1.org/**': () => {} } }); await login(p);
    await goTab(p, 'RACE'); await w(p, 600);
    const first = await p.evaluate(() => { const e = document.querySelector('[data-of1-status="loading"]'); return e ? { skel: !!e.querySelector('[data-skeleton]'), orbit: !!e.querySelector('[data-orbit-loader]') } : null; });
    await w(p, 2600);
    const later = await p.evaluate(() => { const e = document.querySelector('[data-of1-status="loading"]'); return e ? { skel: !!e.querySelector('[data-skeleton]'), orbit: !!e.querySelector('[data-orbit-loader]'), text: e.innerText } : null; });
    await ctx.close();
    assert(first && first.skel && !first.orbit, 'all\'inizio il caricamento normale: ' + JSON.stringify(first));
    assert(later && later.orbit && !later.skel && /dati della gara/.test(later.text), 'con la rete lenta l\'orbita: ' + JSON.stringify(later));
    assert(!errs.length, errs.join(' | '));
  },

  async 'Rimuovi animazioni: schede e orbita ferme'(b) {
    const { ctx, p, errs } = await open(b, { welcome: true, reducedMotion: 'reduce' });
    const anims = await p.evaluate(() => [...document.querySelectorAll('[data-welcome] *')].filter(e => getComputedStyle(e).animationName !== 'none').length);
    await ctx.close();
    assert(anims === 0, 'con "Rimuovi animazioni" si muovono ancora ' + anims + ' elementi');
    assert(!errs.length, errs.join(' | '));
  },
});
