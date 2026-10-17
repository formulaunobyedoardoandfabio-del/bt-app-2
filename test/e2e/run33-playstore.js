// Task 9: termini al primo avvio, feedback, splash, bordi del telefono, tasto indietro di Android e barra di stato
// nascosta (richieste di Edoardo dopo la prima prova sul telefono).
// Uso: node test/build-test.js && node test/e2e/run33-playstore.js [filtro]
const { open, w, text, tapText, tapSel, goTab, login, assert, run } = require('./helpers');

const FRESH = { freshInstall: true };
const terms = p => p.evaluate(() => { const e = document.querySelector('[data-terms]'); return e ? e.innerText : ''; });
const termsBtn = p => p.evaluate(() => { const b = document.querySelector('[data-terms-accept]'); return b ? { text: b.innerText.trim(), disabled: b.disabled } : null; });
const scrollTerms = p => p.evaluate(() => { const e = document.querySelector('[data-terms-body]'); e.scrollTop = e.scrollHeight; e.dispatchEvent(new Event('scroll')); });
const docs = p => p.evaluate(() => window.firebase.__fake.docs());
// Capacitor finto: App (tasto indietro, uscita) e SystemBars (barre del telefono), che registrano le chiamate.
const capacitor = () => {
  const listeners = {};
  window.__cap = [];
  window.Capacitor = {
    isNativePlatform: () => true, getPlatform: () => 'android',
    Plugins: {
      App: {
        addListener: (ev, cb) => { (listeners[ev] = listeners[ev] || []).push(cb); window.__cap.push('listen:' + ev); return Promise.resolve({ remove: () => {} }); },
        exitApp: () => { window.__cap.push('exitApp'); return Promise.resolve(); },
        minimizeApp: () => { window.__cap.push('minimizeApp'); return Promise.resolve(); },
      },
      SystemBars: { hide: o => { window.__cap.push('hide:' + (o && o.bar)); return Promise.resolve(); } },
    },
  };
  window.__back = () => { (listeners.backButton || []).forEach(cb => cb({ canGoBack: false })); };
  window.__resume = () => { (listeners.appStateChange || []).forEach(cb => cb({ isActive: true })); };
  window.__pause = () => { (listeners.appStateChange || []).forEach(cb => cb({ isActive: false })); };
};
const back = async p => { await p.evaluate(() => window.__back()); await w(p, 400); };
// Il feedback si apre dal tasto "Invia feedback" del Profilo (niente pulsante fluttuante).
const openFeedback = async p => { await tapSel(p, '[aria-label="Profilo"]'); await w(p, 400); await tapText(p, 'Invia feedback'); await w(p, 300); };
const reloadApp = async p => { await p.reload(); await w(p, 600); await p.waitForFunction(() => !document.querySelector('[data-splash]'), null, { timeout: 8000 }).catch(() => {}); await w(p, 700); };
const cap = p => p.evaluate(() => window.__cap.slice());

run({
  async 'termini al primo avvio, prima dell\'accesso; ACCETTO solo dopo aver scorso fino in fondo'(b) {
    const { ctx, p, errs } = await open(b, { seed: FRESH });
    const t = await terms(p), login0 = await p.evaluate(() => !!document.querySelector('#authEmail'));
    const b0 = await termsBtn(p);
    await tapSel(p, '[data-terms-accept]'); await w(p, 300);
    const still = await terms(p);
    await scrollTerms(p); await w(p, 300);
    const b1 = await termsBtn(p);
    await tapSel(p, '[data-terms-accept]'); await w(p, 400);
    const after = await terms(p), saved = await p.evaluate(() => localStorage.getItem('bt_bt-terms-accepted')); await ctx.close();
    assert(/TERMINI E CONDIZIONI/i.test(t) && /Accettazione dei Termini/.test(t), 'al primo avvio i termini non ci sono');
    assert(login0, 'sotto i termini deve esserci la schermata di accesso (i termini vengono prima)');
    assert(b0 && /Scorri per continuare/.test(b0.text) && b0.disabled, 'prima di scorrere il tasto deve essere spento: ' + JSON.stringify(b0));
    assert(still, 'i termini si sono chiusi senza averli letti');
    assert(b1 && b1.text === '✓ ACCETTO I TERMINI E CONDIZIONI' && !b1.disabled, 'in fondo il tasto deve accettare: ' + JSON.stringify(b1));
    assert(!after, 'dopo ACCETTO i termini sono ancora aperti');
    assert(saved && JSON.parse(saved).ts > 0, 'accettazione non salvata sul telefono: ' + saved);
    assert(!errs.length, errs.join(' | '));
  },

  async 'termini accettati: dopo aver ricaricato non ricompaiono'(b) {
    const { ctx, p, errs } = await open(b, { seed: FRESH });
    await scrollTerms(p); await w(p, 200); await tapSel(p, '[data-terms-accept]'); await w(p, 300);
    await p.reload(); await w(p, 600);
    await p.waitForFunction(() => !document.querySelector('[data-splash]'), null, { timeout: 8000 }).catch(() => {});
    const t = await terms(p);
    await login(p);
    await tapSel(p, '[aria-label="Profilo"]'); await w(p, 400);
    await tapText(p, 'Termini e Condizioni'); await w(p, 300);
    const review = await termsBtn(p); await ctx.close();
    assert(!t, 'i termini ricompaiono dopo averli accettati');
    assert(review && review.text === 'CHIUDI' && !review.disabled, 'dal profilo i termini si rileggono con CHIUDI: ' + JSON.stringify(review));
    assert(!errs.length, errs.join(' | '));
  },

  async 'termini su uno schermo altissimo: se il testo non scorre, ACCETTO è subito acceso'(b) {
    const { ctx, p, errs } = await open(b, { seed: FRESH, height: 4200 });
    const fits = await p.evaluate(() => { const e = document.querySelector('[data-terms-body]'); return e.scrollHeight <= e.clientHeight + 20; });
    const btn = await termsBtn(p); await ctx.close();
    assert(fits, 'il testo dei termini scorre anche su uno schermo alto 4200 px: la prova non serve');
    assert(btn && btn.text === '✓ ACCETTO I TERMINI E CONDIZIONI' && !btn.disabled, 'senza niente da scorrere il tasto resta spento: ' + JSON.stringify(btn));
    assert(!errs.length, errs.join(' | '));
  },

  async 'Firebase che non risponde: dopo 15 secondi lo splash se ne va e si può entrare'(b) {
    const { ctx, p, errs } = await open(b, { query: '?nofake', waitSplash: false, waitUntil: 'domcontentloaded', routes: { 'https://www.gstatic.com/**': () => {} } });   // gli script di Firebase non arrivano mai
    await p.waitForFunction(() => !document.querySelector('[data-splash]') && !!document.querySelector('#authEmail'), null, { timeout: 20000 }).catch(() => {});
    const st = await p.evaluate(() => ({ splash: !!document.querySelector('[data-splash]'), login: !!document.querySelector('#authEmail'), wait: !!document.querySelector('[data-auth-wait]') })); await ctx.close();
    assert(!st.splash && st.login && !st.wait, 'con Firebase che non risponde l\'app resta ferma su "Caricamento…": ' + JSON.stringify(st));
    assert(!errs.length, errs.join(' | '));
  },

  async 'il nome dell\'app è Sector 4: Termini, accesso e dicitura non ufficiale nel Profilo'(b) {
    const { ctx, p, errs } = await open(b, { seed: FRESH });
    const t = await terms(p);
    await scrollTerms(p); await w(p, 200); await tapSel(p, '[data-terms-accept]'); await w(p, 300);
    const loginText = await text(p);
    await login(p);
    await tapSel(p, '[aria-label="Profilo"]'); await w(p, 400);
    const prof = await text(p); await ctx.close();
    assert(/Utilizzando l'app Sector 4/.test(t) && /Sector 4 non garantisce/.test(t) && /per usare Sector 4/.test(t), 'Termini senza il nome Sector 4');
    assert(!/B&T App/.test(t + loginText + prof), 'c\'è ancora il nome vecchio "B&T App"');
    assert(/Bentornato su Sector 4/.test(loginText), 'accesso senza il nome Sector 4');
    assert(/Sector 4 è un'app non ufficiale/.test(prof), 'dicitura non ufficiale senza il nome Sector 4');
    assert(!errs.length, errs.join(' | '));
  },

  async '§5 dei termini con la dicitura sui marchi F1'(b) {
    const { ctx, p, errs } = await open(b, { seed: FRESH });
    const t = await terms(p); await ctx.close();
    const s5 = t.slice(t.indexOf('5. Contenuti e Proprietà Intellettuale'), t.indexOf('6. Condotta degli Utenti'));
    assert(/Sector 4 è un'app non ufficiale e non è associata in alcun modo alle società di Formula 1/.test(s5), '§5 senza la dicitura non ufficiale: ' + s5.slice(0, 300));
    assert(/marchi di Formula One Licensing B\.V\./.test(s5), '§5 senza i marchi di Formula One Licensing');
    assert(/Sector 4 non è associata nemmeno alla FIA, alle scuderie o ai piloti/.test(s5), '§5 senza FIA, scuderie e piloti');
    assert(!errs.length, errs.join(' | '));
  },

  async '§4 dei termini: il Premium non è ancora disponibile (pagamenti spenti come oggi)'(b) {
    const { ctx, p, errs } = await open(b, { seed: FRESH });
    const t = await terms(p); await ctx.close();
    const s4 = t.slice(t.indexOf('4. Abbonamento Premium'), t.indexOf('5. Contenuti e Proprietà Intellettuale'));
    assert(/L'abbonamento Premium non è ancora disponibile\. Quando verrà attivato, prezzi, rinnovo e modalità di disdetta saranno indicati in questa sezione e nella schermata di acquisto\./.test(s4), '§4: ' + s4);
    assert(!/2,99/.test(s4), '§4 con i prezzi di un abbonamento che non c\'è');
    assert(!errs.length, errs.join(' | '));
  },

  async 'feedback dal Profilo: 4 stelle e testo salvati in bt-feedback-<id> con l\'email'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await openFeedback(p);
    await tapSel(p, '[data-feedback-star="4"]'); await w(p, 100);
    await tapSel(p, '[data-feedback-cat="bug"]'); await w(p, 100);
    await p.fill('[data-feedback-msg]', 'La classifica si vede bene');
    await tapText(p, 'INVIA FEEDBACK'); await w(p, 600);
    const t = await text(p), all = await docs(p); await ctx.close();
    const fb = Object.entries(all).filter(([k]) => /^shared\/bt-feedback-/.test(k));
    assert(fb.length === 1, 'documenti di feedback: ' + fb.length);
    const [path, d] = fb[0];
    assert(path === 'shared/bt-feedback-' + d.id, 'nome del documento: ' + path);
    assert(d.stars === 4 && d.category === 'bug' && d.msg === 'La classifica si vede bene' && d.user === 'a@b.it' && d.appVersion === '2.0.0' && !isNaN(Date.parse(d.date)), 'feedback: ' + JSON.stringify(d));
    assert(/Grazie per il feedback!/.test(t), 'manca il grazie');
    assert(!errs.length, errs.join(' | '));
  },

  async 'niente pulsante fluttuante del feedback: in Home, nel Garage e nella notizia non c\'è'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    const fab = () => p.evaluate(() => !!document.querySelector('[aria-label="Invia feedback"]'));
    const home = await fab();
    await goTab(p, 'GARAGE'); const garage = await fab();
    await goTab(p, 'HOME'); await tapSel(p, '[data-featured]'); await w(p, 400); const article = await fab(); await ctx.close();
    assert(!home && !garage && !article, `pulsante del feedback: Home ${home}, Garage ${garage}, notizia ${article}`);
    assert(!errs.length, errs.join(' | '));
  },

  async 'dopo 5 accessi la campanella chiede un feedback: toccando la notifica si apre il modulo, inviato sparisce'(b) {
    const { ctx, p, errs } = await open(b); await login(p);   // 1° accesso
    for (let i = 2; i <= 4; i++) await reloadApp(p);           // 2°, 3° e 4°
    const dot4 = await p.evaluate(() => !!document.querySelector('[data-unread-dot]'));
    await tapSel(p, '[aria-label="Notifiche"]'); await w(p, 300);
    const ask4 = await p.evaluate(() => !!document.querySelector('[data-notif-action="feedback"]'));
    await reloadApp(p);                                        // 5° accesso
    const dot5 = await p.evaluate(() => !!document.querySelector('[data-unread-dot]'));
    await tapSel(p, '[aria-label="Notifiche"]'); await w(p, 300);
    const item = await p.evaluate(() => { const e = document.querySelector('[data-notif-action="feedback"]'); return e ? e.innerText : null; });
    await tapSel(p, '[data-notif-action="feedback"]'); await w(p, 300);
    const modal = await p.evaluate(() => !!document.querySelector('[data-feedback]'));
    await tapSel(p, '[data-feedback-star="5"]'); await tapText(p, 'INVIA FEEDBACK'); await w(p, 2600);
    const gone = await p.evaluate(() => !document.querySelector('[data-notif-action="feedback"]'));
    await reloadApp(p);                                        // 6° accesso: non torna
    await tapSel(p, '[aria-label="Notifiche"]'); await w(p, 300);
    const again = await p.evaluate(() => !!document.querySelector('[data-notif-action="feedback"]')); await ctx.close();
    assert(!dot4 && !ask4, 'prima del 5° accesso la richiesta di feedback non deve esserci');
    assert(dot5, 'al 5° accesso la campanella deve avere il pallino');
    assert(item && /Dicci cosa ne pensi/.test(item), 'manca la notifica che chiede il feedback: ' + item);
    assert(modal, 'toccando la notifica non si apre il modulo del feedback');
    assert(gone && !again, 'inviato il feedback la notifica deve sparire e non tornare');
    assert(!errs.length, errs.join(' | '));
  },

  async 'tornare nell\'app dopo almeno 30 minuti conta come un accesso, dopo pochi minuti no'(b) {
    const { ctx, p, errs } = await open(b, { capacitor });
    const visits = () => p.evaluate(() => { const v = JSON.parse(localStorage.getItem('bt_bt-opens') || 'null'); return v ? v.n : 0; });
    const v1 = await visits();
    await p.evaluate(() => window.__pause()); await w(p, 100);
    await p.evaluate(() => window.__resume()); await w(p, 150);
    const v2 = await visits();
    await p.evaluate(() => window.__pause()); await w(p, 100);
    await p.evaluate(() => { const v = JSON.parse(localStorage.getItem('bt_bt-opens')); v.away -= 31 * 60 * 1000; localStorage.setItem('bt_bt-opens', JSON.stringify(v)); });
    await p.evaluate(() => window.__resume()); await w(p, 150);
    const v3 = await visits(); await ctx.close();
    assert(v1 === 1 && v2 === 1 && v3 === 2, `accessi: all'apertura ${v1}, dopo una pausa breve ${v2}, dopo 31 minuti ${v3}`);
    assert(!errs.length, errs.join(' | '));
  },

  async 'eliminazione account: spariscono anche i feedback'(b) {
    const { ctx, p, errs } = await open(b);
    await tapText(p, 'REGISTRATI', { exact: true }); await w(p, 300);
    await p.fill('#regName', 'Fabio'); await p.fill('#authEmail', 'fabio@b.it'); await p.fill('#authPw', 'abcdef'); await p.fill('#regPw2', 'abcdef');
    await tapSel(p, '[data-fan-option="vivo"]'); await p.check('#regAdult'); await tapText(p, 'CREA ACCOUNT', { exact: true }); await w(p, 1500);
    await openFeedback(p);
    await tapSel(p, '[data-feedback-star="5"]'); await tapText(p, 'INVIA FEEDBACK'); await w(p, 2500);
    const before = Object.values(await docs(p)).filter(d => d && d.user === 'fabio@b.it' && d.stars).length;
    await tapText(p, 'Elimina account'); await w(p, 300);
    const warn = await text(p);
    await p.fill('#delPw', 'abcdef'); await tapText(p, 'ELIMINA DEFINITIVAMENTE'); await w(p, 1500);
    const after = Object.keys(await docs(p)).filter(k => /^shared\/bt-feedback-/.test(k)); await ctx.close();
    assert(/le segnalazioni e i feedback che hai inviato/.test(warn), 'la conferma non dice che si cancellano anche i feedback');
    assert(before === 1, 'feedback non salvato prima dell\'eliminazione');
    assert(after.length === 0, 'feedback rimasti: ' + after.join(', '));
    assert(!errs.length, errs.join(' | '));
  },

  // Tappa 3 (G06): senza i video lo splash fisso di prima diventa il Pit Exit Launch (i LED del volante, poi l'app).
  async 'splash senza i video (file mancanti): Pit Exit Launch e sotto l\'app che si carica'(b) {
    const { ctx, p, errs } = await open(b, { waitSplash: false });   // test.html non ha accanto i video
    const s = await p.evaluate(() => { const e = document.querySelector('[data-splash]'); return e ? { leds: e.querySelectorAll('[data-pit-led]').length, phase: e.dataset.splashPhase } : null; });
    const underneath = await p.evaluate(() => !!document.querySelector('#authEmail'));
    await p.waitForFunction(() => !document.querySelector('[data-splash]'), null, { timeout: 8000 }).catch(() => {});
    const gone = await p.evaluate(() => !document.querySelector('[data-splash]')); await ctx.close();
    assert(s && s.phase === 'pitexit' && s.leds === 15, 'senza i video manca il Pit Exit Launch: ' + JSON.stringify(s));
    assert(underneath, 'sotto lo splash l\'app deve caricarsi');
    assert(gone, 'lo splash non se ne va');
    assert(!errs.length, errs.join(' | '));
  },

  async 'splash con i video: apertura intera, poi il finale con le lettere che si aprono sull\'app vera già usabile'(b) {
    const t0 = Date.now();
    const { ctx, p, errs } = await open(b, { page: 'video/index.html', waitSplash: false });
    const phase = () => p.evaluate(() => { const e = document.querySelector('[data-splash]'); return e ? e.dataset.splashPhase : 'gone'; });
    const first = await phase();
    await p.waitForFunction(() => { const e = document.querySelector('[data-splash]'); return !e || e.dataset.splashPhase === 'outro'; }, null, { timeout: 14000 });
    const tOutro = Date.now() - t0, atOutro = await phase();
    await p.waitForFunction(() => { const e = document.querySelector('[data-splash]'); return !e || e.dataset.splashRevealed === '1'; }, null, { timeout: 6000 });
    const during = await p.evaluate(() => {
      const e = document.querySelector('[data-splash]');
      const el = document.elementFromPoint(innerWidth / 2, innerHeight * 0.55);
      return { pe: e ? getComputedStyle(e).pointerEvents : 'gone', hitsApp: !!el && !el.closest('[data-splash]') };
    });
    await p.waitForFunction(() => !document.querySelector('[data-splash]'), null, { timeout: 6000 });
    const login = await p.evaluate(() => !!document.querySelector('#authEmail')); await ctx.close();
    assert(first === 'intro', 'all\'apertura deve partire il primo video: ' + first);
    assert(atOutro === 'outro' && tOutro >= 6500, `il video finale deve partire dopo tutto il primo (7 s): ${atOutro} a ${tOutro} ms`);
    assert(during.pe === 'none' && during.hitsApp, 'quando le lettere si aprono l\'app sotto deve già ricevere i tocchi: ' + JSON.stringify(during));
    assert(login, 'finito lo splash non si vede l\'app');
    assert(!errs.length, errs.join(' | '));
  },

  // 11/10: sul telefono di Edoardo per 7 secondi si vedeva il tasto play grigio di Android, poi il finale. Il video
  // finale, fermo in attesa, stava sopra l'apertura e la copriva (qui si vedeva il suo primo fotogramma, il logo BT).
  // Ora si vede solo il video che sta andando, e i video fermi hanno il nero al posto del tasto play.
  async 'splash: durante l\'apertura si vede l\'apertura (non il finale fermo sopra) e il nero al posto del tasto play'(b) {
    const { ctx, p, errs } = await open(b, { page: 'video/index.html', waitSplash: false });
    const look = () => p.evaluate(() => [...document.querySelectorAll('[data-splash] video')].map(v => ({
      src: (v.currentSrc || v.getAttribute('src') || '').split('/').pop(), t: v.currentTime, paused: v.paused,
      op: getComputedStyle(v).opacity, poster: v.getAttribute('poster') || '' })));
    await p.waitForFunction(() => { const v = document.querySelector('[data-splash] video'); return v && v.currentTime > 1; }, null, { timeout: 6000 }).catch(() => {});
    const intro = await look();
    await p.waitForFunction(() => { const e = document.querySelector('[data-splash]'); return !e || e.dataset.splashPhase === 'outro'; }, null, { timeout: 14000 }).catch(() => {});
    await p.waitForFunction(() => { const v = document.querySelectorAll('[data-splash] video')[2]; return !v || v.currentTime > 0.3; }, null, { timeout: 4000 }).catch(() => {});
    const outro = await look();
    await ctx.close();
    const ops = a => a.map(v => v.src + ':' + v.op).join(' ');
    assert(intro.length === 3 && intro[0].src === 'intro.webm' && !intro[0].paused && intro[0].t > 1, 'apertura che va: ' + JSON.stringify(intro));
    assert(intro[0].op === '1' && intro[1].op === '0' && intro[2].op === '0', 'durante l\'apertura si deve vedere solo l\'apertura: ' + ops(intro));
    assert(outro.length === 3 && outro[2].op === '1' && outro[0].op === '0' && outro[1].op === '0', 'durante il finale si vede solo il finale: ' + ops(outro));
    assert(intro.every(v => /^data:image\//.test(v.poster)), 'immagine di partenza nera: ' + JSON.stringify(intro.map(v => v.poster.slice(0, 30))));
    assert(!errs.length, errs.join(' | '));
  },

  async 'caricamento lento: il secondo video si ripete finché i dati non arrivano, poi parte il finale'(b) {
    const { ctx, p, errs } = await open(b, { page: 'video/index.html', waitSplash: false, seed: { holdReads: true } });   // Firebase lentissimo
    const info = () => p.evaluate(() => { const e = document.querySelector('[data-splash]'); return e ? { phase: e.dataset.splashPhase, loops: Number(e.dataset.splashLoops || 0) } : null; });
    await p.waitForFunction(() => { const e = document.querySelector('[data-splash]'); return e && Number(e.dataset.splashLoops || 0) >= 2; }, null, { timeout: 16000 }).catch(() => {});
    const looping = await info();
    await p.evaluate(() => { window.firebase.__fake.holdReads = false; });   // i dati arrivano
    await p.waitForFunction(() => { const e = document.querySelector('[data-splash]'); return !e || e.dataset.splashPhase === 'outro'; }, null, { timeout: 4000 }).catch(() => {});
    const after = await info();
    await p.waitForFunction(() => !document.querySelector('[data-splash]'), null, { timeout: 6000 }).catch(() => {});
    const gone = await p.evaluate(() => !document.querySelector('[data-splash]')); await ctx.close();
    assert(looping && looping.phase === 'loop' && looping.loops >= 2, 'senza dati il secondo video deve ripetersi: ' + JSON.stringify(looping));
    assert(after && after.phase === 'outro', 'arrivati i dati deve partire subito il finale: ' + JSON.stringify(after));
    assert(gone, 'lo splash non se ne va');
    assert(!errs.length, errs.join(' | '));
  },

  // 11/10: sul telefono di Edoardo (largo circa 540 px) la chat e le altre pagine avevano due bande nere ai lati:
  // la colonna dell'app era larga al massimo 430 px. Ora riempie lo schermo del telefono; solo sul computer (sito)
  // resta una colonna al centro.
  async 'telefono largo 540 px: l\'app occupa tutto lo schermo, senza bande nere ai lati; sul computer una colonna'(b) {
    const a = await open(b, { width: 540, height: 1170 }); await login(a.p);
    await tapText(a.p, 'Chat dei tifosi').catch(() => {}); await w(a.p, 400);
    const phone = await a.p.evaluate(() => { const r = document.querySelector('#phone-shell').getBoundingClientRect(); return { left: r.left, width: r.width, vw: innerWidth }; });
    await a.ctx.close();
    const c = await open(b, { width: 1280, height: 900 });
    const desk = await c.p.evaluate(() => { const r = document.querySelector('#phone-shell').getBoundingClientRect(); return { left: r.left, width: r.width, vw: innerWidth }; });
    await c.ctx.close();
    assert(phone.left === 0 && phone.width === phone.vw, 'sul telefono largo l\'app non riempie lo schermo: ' + JSON.stringify(phone));
    assert(desk.width <= 600 && Math.abs(desk.left * 2 + desk.width - desk.vw) < 2, 'sul computer deve restare una colonna al centro: ' + JSON.stringify(desk));
    assert(!a.errs.length && !c.errs.length, [...a.errs, ...c.errs].join(' | '));
  },

  async 'bordi del telefono: barra in alto, schede in basso e pagine interne lasciano lo spazio delle barre del telefono'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    // Capacitor 8 (SystemBars) mette l'altezza vera delle barre del telefono in --safe-area-inset-*.
    await p.evaluate(() => { document.documentElement.style.setProperty('--safe-area-inset-top', '30px'); document.documentElement.style.setProperty('--safe-area-inset-bottom', '24px'); });
    await w(p, 150);
    const edges = () => p.evaluate(() => {
      const r = s => { const e = document.querySelector(s); return e ? e.getBoundingClientRect() : null; };
      const head = r('[aria-label="Profilo"]'), nav = r('[data-nav-tab="home"]'), back = r('[aria-label="Indietro"]');
      return { h: innerHeight, headTop: head && head.top, navBottom: nav && nav.bottom, backTop: back && back.top };
    });
    const home = await edges();
    await tapSel(p, '[aria-label="Profilo"]'); await w(p, 300);
    const prof = await edges(); await ctx.close();
    assert(home.headTop >= 30 + 10, 'la barra in alto finisce sotto la barra di stato: ' + JSON.stringify(home));
    assert(home.navBottom <= home.h - 24, 'le schede in basso finiscono sotto la barra di navigazione: ' + JSON.stringify(home));
    assert(prof.backTop >= 30 + 10, 'nel profilo la freccia finisce sotto la barra di stato: ' + JSON.stringify(prof));
    assert(!errs.length, errs.join(' | '));
  },

  async 'tasto indietro di Android: dalla notizia torna alla Home, da RACE e dal profilo alla Home, dalla Home esce'(b) {
    const { ctx, p, errs } = await open(b, { capacitor }); await login(p);
    await tapSel(p, '[data-featured]'); await w(p, 400);
    const article = await text(p);
    await back(p);
    const home = await text(p);
    await goTab(p, 'RACE'); await back(p);
    const fromRace = await p.evaluate(() => !!document.querySelector('[data-featured]'));
    await tapSel(p, '[aria-label="Profilo"]'); await w(p, 300);
    await back(p);
    const fromProfile = await p.evaluate(() => !!document.querySelector('[data-featured]'));
    const calls0 = await cap(p);
    await back(p);
    const calls = await cap(p); await ctx.close();
    assert(/ARTICOLO/.test(article), 'la notizia non si è aperta');
    assert(!/ARTICOLO/.test(home) && /Vi presentiamo l'app B&T!!/.test(home), 'dalla notizia il tasto indietro non torna alla Home');
    assert(fromRace, 'da RACE il tasto indietro non torna alla Home');
    assert(fromProfile, 'dal profilo il tasto indietro non torna alle schede');
    assert(calls0.includes('listen:backButton') && !calls0.some(c => /exitApp|minimizeApp/.test(c)), 'chiamate prima della Home: ' + calls0.join(', '));
    assert(calls.includes('minimizeApp'), 'dalla Home il tasto indietro deve mettere l\'app in secondo piano: ' + calls.join(', '));
    assert(!errs.length, errs.join(' | '));
  },

  async 'tasto indietro: sui Termini esce, da REGISTRATI torna ad ACCEDI, chiude il feedback e lo strumento del Garage'(b) {
    const { ctx, p, errs } = await open(b, { seed: FRESH, capacitor });
    await back(p);
    const onTerms = await cap(p), termsStill = !!(await terms(p));
    await scrollTerms(p); await w(p, 200); await tapSel(p, '[data-terms-accept]'); await w(p, 300);
    await tapText(p, 'REGISTRATI', { exact: true }); await w(p, 300);
    const reg = await p.evaluate(() => !!document.querySelector('#regName'));
    await back(p);
    const reg2 = await p.evaluate(() => !!document.querySelector('#regName')), loginText = await text(p);
    await login(p);
    await openFeedback(p);
    const fb = await p.evaluate(() => !!document.querySelector('[data-feedback]'));
    await back(p);
    const fb2 = await p.evaluate(() => !!document.querySelector('[data-feedback]')), inProfile = await p.evaluate(() => /PROFILO/.test(document.body.innerText));
    await back(p);   // dal Profilo alle schede
    await goTab(p, 'GARAGE'); await tapSel(p, '[data-game="pitstop"]'); await w(p, 300);
    const game = await text(p);
    await back(p);
    const garage = await p.evaluate(() => !!document.querySelector('[data-game="pitstop"]'));
    await back(p);
    const home = await p.evaluate(() => !!document.querySelector('[data-featured]'));
    const calls = await cap(p); await ctx.close();
    assert(onTerms.includes('minimizeApp') && termsStill, 'sui Termini del primo avvio il tasto indietro deve uscire e lasciarli aperti: ' + onTerms.join(', '));
    assert(reg && !reg2 && /Bentornato su Sector 4/.test(loginText), 'da REGISTRATI il tasto indietro non torna ad ACCEDI');
    assert(fb && !fb2 && inProfile, 'il tasto indietro deve chiudere il feedback e lasciare il Profilo aperto');
    assert(/PIT STOP CHALLENGE/.test(game) && garage, 'dallo strumento il tasto indietro non torna al Garage');
    assert(home && calls.filter(c => c === 'minimizeApp').length === 1, 'dal Garage il tasto indietro non torna alla Home: ' + calls.join(', '));
    assert(!errs.length, errs.join(' | '));
  },

  async 'barra di stato del telefono nascosta all\'avvio e quando si torna nell\'app'(b) {
    const { ctx, p, errs } = await open(b, { capacitor });
    const first = await cap(p);
    await p.evaluate(() => { window.__cap.length = 0; window.__resume(); }); await w(p, 200);
    const resumed = await cap(p); await ctx.close();
    assert(first.includes('hide:StatusBar'), 'barra di stato non nascosta all\'avvio: ' + first.join(', '));
    assert(resumed.includes('hide:StatusBar'), 'tornando nell\'app la barra di stato ricompare: ' + resumed.join(', '));
    assert(!errs.length, errs.join(' | '));
  },
});
