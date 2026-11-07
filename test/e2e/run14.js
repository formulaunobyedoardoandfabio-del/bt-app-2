// Test della 2.0 (versione 16): pagina del circuito e hashtag dei circuiti, meteo a caselle col pronostico pioggia,
// punti bonus FantaF1, squadra e lega modificabili fuori da qualifiche e gara, sondaggi nelle notizie,
// telemetria e tempi sul giro, Second Screen in orizzontale, prova Premium di 2 settimane, download senza filigrana.
// Uso: bash rtest/build.sh && node rtest/run14.js [filtro]      (PAGE=real.html per React vero)
const { chromium } = require('/opt/node-tools/node_modules/playwright');
// Le notizie, le previsioni, i video e il calendario d'esempio della 2.0 ora stanno su Firebase (Task 6): il Firebase
// finto parte con quei documenti, così le prove li ritrovano.
const SEED_20 = require('../fixtures/seed-2.0.json');
const { leagueSeed } = require('../fake/leagues');   // 31/10: leghe FantaF1 vere
const EXE = require('fs').existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined;

// Ora fissa (mercoledì prima del GP della Malesia, nessuna sessione in corso): così le chiusure del meteo e del
// FantaF1 non dipendono dal giorno in cui si lanciano le prove.
const NOW = '2026-09-30T11:48:00Z';
async function open(b, { width = 390, height = 844, now = NOW, seed = null } = {}) {
  const ctx = await b.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true });
  await ctx.addInitScript(() => { try { if (!localStorage.getItem('bt_bt-entry')) localStorage.setItem('bt_bt-entry', JSON.stringify('form')); } catch (e) {} });   // 7/11: benvenuto già visto (come helpers.js)
  await ctx.route('https://api.jolpi.ca/**', r => r.abort());               // 24/10: classifiche di Jolpica e previsioni
  await ctx.route('https://bt-app-2.vercel.app/**', r => r.abort());   // meteo di serie non rispondono (come helpers.js)
  await ctx.addInitScript(seed => { window.__btSeed = seed; }, seed ? { ...SEED_20, ...(seed.pro ? { pro: true } : {}), addDocs: { ...(SEED_20.addDocs || {}), ...(seed.addDocs || {}) } } : SEED_20);   // 1/11: pro = tester Premium
  await ctx.addInitScript(now => { window.open = () => null; window.__btNow = Date.parse(now); }, now);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/' + (process.env.PAGE || 'test.html')); await p.waitForTimeout(400);
  return { ctx, p, errs };
}
const w = (p, ms = 300) => p.waitForTimeout(ms);
const text = p => p.evaluate(() => document.body.innerText);
const norm = s => s.replace(/\s+/g, ' ').trim();
async function tapText(p, txt, { exact = false, timeout = 4000, sel = 'button' } = {}) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const ok = await p.evaluate(({ txt, exact, sel }) => { const n = s => s.replace(/\s+/g, ' ').trim(); const el = [...document.querySelectorAll(sel)].find(b => exact ? n(b.textContent) === txt : n(b.textContent).includes(txt)); if (!el) return false; el.click(); return true; }, { txt, exact, sel });
    if (ok) return; await w(p, 150);
  }
  throw new Error(`bottone non trovato: "${txt}"`);
}
async function tapSel(p, sel, timeout = 4000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; e.click(); return true; }, sel)) return; await w(p, 150); }
  throw new Error(`elemento non trovato: ${sel}`);
}
const has = (p, sel) => p.evaluate(s => !!document.querySelector(s), sel);
async function login(p) {
  await p.fill('#authEmail', 'a@b.it'); await p.fill('#authPw', 'x');
  await p.evaluate(() => { const bs = [...document.querySelectorAll('button')].filter(b => b.textContent.replace(/\s+/g, ' ').trim() === 'ACCEDI'); bs[bs.length - 1].click(); });
  await w(p, 2500); await p.waitForFunction(() => !document.querySelector('[data-splash]'), null, { timeout: 8000 }).catch(() => {}); await w(p, 400);   // Task 9: si aspetta la fine dello splash (i Termini li ha già accettati il Firebase finto)
}
const goTab = async (p, t) => { await tapText(p, t, { exact: true }); await w(p, 400); };
const goRace = p => goTab(p, 'RACE');
async function openAdmin(p, tab) {
  // 31/10: a@b.it non è admin di serie (gli admin hanno Premium e tutti i trofei): lo diventa qui (l'app lo rilegge aprendo il Profilo).
  await p.evaluate(() => { if (!window.firebase.__fake.doc('admins/a@b.it')) window.firebase.__fake.setDoc('admins/a@b.it', { ruolo: 'admin' }); });
  await tapSel(p, '[aria-label="Profilo"]'); await w(p); await tapText(p, 'Pannello Admin'); await w(p);
  const keypad = await p.evaluate(() => [...document.querySelectorAll('button')].some(b => b.textContent.trim() === '8'));
  if (keypad) { for (const d of '080824') { await tapText(p, d, { exact: true }); await w(p, 60); } await w(p, 900); }
  if (tab) { await tapText(p, tab, { exact: true }); await w(p, 300); }
}
const backHome = async p => { await tapSel(p, '[aria-label="Indietro"]'); await w(p); await tapSel(p, '[aria-label="Indietro"]'); await w(p); };
async function startLive(p, session = 'GARA') { await openAdmin(p, 'GARA LIVE'); await tapText(p, 'AVVIA ' + session, { exact: true }); await w(p, 300); await backHome(p); await goRace(p); }
async function stopLive(p) { await openAdmin(p, 'GARA LIVE'); await tapText(p, 'TERMINA DIRETTA', { exact: true }); await w(p, 300); await backHome(p); }
const advance = (p, sec) => p.evaluate(s => window.__btLive.advance(s), sec);
const search = async (p, q) => { await p.fill('#newsSearch', q); await w(p, 400); };
// Dalla versione 17 la prossima gara è il GP del Bahrain in Malesia: la scheda di Singapore si apre dalla ricerca.
async function openSingapore(p) { await search(p, 'marina bay'); await tapText(p, 'Marina Bay Street Circuit'); await w(p, 500); }
// Nel pannello della diretta sceglie la gara (per i weekend Sprint: GP di Singapore).
async function pickLiveRace(p, name) { await p.selectOption('select[aria-label="Gara della diretta"]', { label: name }); await w(p, 300); }
const assert = (c, m) => { if (!c) throw new Error(m); };
// Attiva la prova gratuita Premium (serve per il Second Screen) e torna alla Home.
async function premiumTrial(p) {
  await tapSel(p, '[aria-label="Profilo"]'); await w(p); await tapText(p, 'Passa a Premium'); await w(p, 300);
  await tapText(p, 'PROVA GRATIS'); await w(p, 1500); await tapText(p, 'INIZIA'); await w(p, 300);
  await tapSel(p, '[aria-label="Indietro"]'); await w(p, 300);
}
// Second Screen: rotazione, misure (senza rotazione), grafiche e mappa.
const stageInfo = p => p.evaluate(() => {
  const s = document.querySelector('[data-ss-stage]'); if (!s) return null;
  const tr = getComputedStyle(s).transform, m = /matrix\(([^)]+)\)/.exec(tr), v = m ? m[1].split(',').map(Number) : [1, 0];
  return { transform: tr, a: v[0], b: v[1], w: s.offsetWidth, h: s.offsetHeight, widgets: s.querySelectorAll('[data-ss-widget]').length, map: !!s.querySelector('[data-live-map]') };
});
const slots = p => p.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-ss-slot]')].map(e => { const w = e.querySelector('[data-ss-widget]'); return [e.getAttribute('data-ss-slot'), w ? w.getAttribute('data-ss-widget') : null]; })));

const tests = {
  // ── Circuiti ──────────────────────────────────────────────────────────
  async 'prossima gara: sfondo con il disegno del circuito e invito "Esplora il circuito"'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await goRace(p);
    const art = await p.evaluate(() => { const s = document.querySelector('[data-race-art]'); return s ? s.querySelectorAll('path').length : 0; });
    const t = await text(p); await ctx.close();
    assert(art >= 1, 'manca il disegno del circuito come sfondo della prossima gara');
    assert(/GP del Bahrain in Malesia/.test(t) && /ESPLORA IL CIRCUITO/.test(t), 'manca "Esplora il circuito" nella prossima gara');
    assert(!errs.length, 'errori JS: ' + errs.join(' | '));
  },
  async 'scheda circuito: i numeri come nell\'app F1 (Singapore)'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await openSingapore(p);
    const t = norm(await text(p)); const map = await p.evaluate(() => { const s = document.querySelector('[data-circuit-map]'); return s ? s.querySelectorAll('path').length : 0; });
    await ctx.close();
    for (const s of ['Marina Bay', 'Lunghezza del circuito', '4,927 km', 'Primo Gran Premio', '2008', 'Numero di giri', '62', 'Record sul giro', '1:33.808', 'Lewis Hamilton (2025)', 'Distanza di gara', '305,337 km', 'Curve', '19'])
      assert(t.includes(s), 'nella scheda manca: ' + s);
    assert(map >= 3, 'la mappa del circuito non ha i 3 settori');
    assert(/#MarinaBay/.test(t), 'manca l\'hashtag del circuito');
    assert(!errs.length, 'errori JS: ' + errs.join(' | '));
  },
  async 'scheda circuito: domande e risposte si aprono toccandole'(b) {
    const { ctx, p } = await open(b); await login(p); await openSingapore(p);
    const before = await text(p);
    await tapText(p, 'Com\'è il circuito?'); await w(p, 300);
    const after = await text(p); await ctx.close();
    for (const q of ['Quando è stato costruito?', 'Com\'è il circuito?', 'Perché andarci?', 'Dove guardare la gara?']) assert(before.includes(q), 'manca la domanda: ' + q);
    assert(!/Sheares/.test(before) && /Sheares/.test(after), 'la risposta non si apre toccando la domanda');
  },
  async 'scheda circuito: programma del weekend Sprint con ora locale e ora italiana'(b) {
    const { ctx, p } = await open(b); await login(p); await openSingapore(p);
    const t = norm(await text(p)); await ctx.close();
    assert(/PROGRAMMA DEL WEEKEND/i.test(t), 'manca il programma del weekend');
    for (const s of ['Prove libere 1', 'Qualifiche Sprint', 'Sprint', 'Qualifiche', 'Gara', '16:30', '10:30', '20:00', '14:00']) assert(t.includes(s), 'nel programma manca: ' + s);
  },
  async 'scheda circuito: articoli correlati con lo stesso hashtag'(b) {
    const { ctx, p } = await open(b); await login(p); await openSingapore(p);
    const t = await text(p); await ctx.close();
    assert(/ARTICOLI CORRELATI/i.test(t) && /Weekend di gara: il programma completo B&T/.test(t), 'mancano gli articoli con #MarinaBay');
  },
  async 'hashtag circuiti: cercando "monza" nella Home si trovano il circuito e gli articoli'(b) {
    const { ctx, p } = await open(b); await login(p);
    await search(p, 'monza'); const t = await text(p);
    await tapText(p, 'Autodromo Nazionale Monza'); await w(p, 400);
    const t2 = norm(await text(p)); await ctx.close();
    assert(/Monza, il giro più veloce di sempre/.test(t), 'la ricerca non trova l\'articolo con #Monza');
    assert(t2.includes('1:20.901') && t2.includes('Lando Norris (2025)'), 'dal risultato della ricerca non si apre la scheda di Monza');
  },
  async 'hashtag circuiti: dal pannello admin si aggiunge #MarinaBay e la notizia si trova con "#marinabay"'(b) {
    const { ctx, p } = await open(b); await login(p); await openAdmin(p, 'NEWS');
    await p.fill('#adTitle', 'Notte di Singapore: le chiavi del weekend');
    await tapText(p, '#MarinaBay'); await w(p, 150);
    await tapText(p, 'PUBBLICA', { exact: true }); await w(p, 600);
    await search(p, '#marinabay'); const t = await text(p); await ctx.close();
    assert(/Notte di Singapore: le chiavi del weekend/.test(t), 'la notizia con #MarinaBay non si trova cercando l\'hashtag');
  },
  // ── Meteo ─────────────────────────────────────────────────────────────
  async 'meteo: previsioni del weekend come fila grigia di 5 caselle (a Singapore anche la Sprint)'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await goRace(p);
    await tapText(p, 'Meteo', { exact: true }); await w(p, 600);
    const boxes = await p.evaluate(() => [...document.querySelectorAll('[data-weather-box]')].map(e => e.getAttribute('data-weather-box')));
    const t = await text(p);
    await openAdmin(p, 'GARA LIVE'); await pickLiveRace(p, 'GP di Singapore'); await tapText(p, 'AVVIA PROVE LIBERE 1', { exact: true }); await w(p, 300); await backHome(p); await goRace(p);
    await tapText(p, 'Meteo', { exact: true }); await w(p, 500);
    const sg = await p.evaluate(() => [...document.querySelectorAll('[data-weather-box]')].map(e => e.getAttribute('data-weather-box')));
    await ctx.close();
    assert(JSON.stringify(boxes) === JSON.stringify(['FP1', 'FP2', 'FP3', 'QUALI', 'RACE']), 'caselle del meteo (Malesia): ' + boxes);
    assert(JSON.stringify(sg) === JSON.stringify(['FP1', 'SQ', 'SPRINT', 'QUALI', 'RACE']), 'caselle del meteo (Singapore, Sprint): ' + sg);
    assert(!/Probabilità di pioggia/.test(t), 'ci sono ancora le previsioni scritte (simulate)');
    // Task 17 (D10): niente radar simulato; senza sessione la frase del meteo vero a fine sessione.
    assert(!/radar/i.test(t) && /Il meteo della sessione arriva con i dati veri a fine sessione\./.test(t), 'c\'è ancora il radar o manca il meteo vero');
    assert(!errs.length, 'errori JS: ' + errs.join(' | '));
  },
  // Task 17 (D08): la descrizione della sessione dice giorno e ora, senza la previsione simulata.
  async 'meteo: toccando una casella si apre la sessione col tasto "Indovina il meteo"'(b) {
    const { ctx, p } = await open(b); await login(p); await goRace(p);
    await tapText(p, 'Meteo', { exact: true }); await w(p, 500);
    await tapSel(p, '[data-weather-box="FP3"]'); await w(p, 300);
    const t1 = norm(await text(p));
    await tapText(p, 'Indovina il meteo'); await w(p, 200);
    await tapText(p, 'Pioggia', { exact: true }); await w(p, 300);
    const t2 = norm(await text(p)); await ctx.close();
    assert(/Prove libere 3/.test(t1) && /12:30/.test(t1) && !/Probabilità di pioggia/.test(t1), 'la sessione delle FP3 non si apre (o c\'è ancora la previsione simulata)');
    assert(/Il tuo pronostico: Pioggia/.test(t2) && /\+2 punti/.test(t2), 'il pronostico non viene registrato');
  },
  // Task 10 (D23): la prova DEMO non dà l'esito del meteo né i +2 punti (arriveranno coi dati veri a fine sessione).
  async 'meteo: il pronostico si chiude quando parte la sessione; la prova DEMO non dà l\'esito né i +2 punti (D23)'(b) {
    const { ctx, p } = await open(b); await login(p);
    const outcome = await p.evaluate(() => { const A = window.__req('./App'); return A.weekendWeather(A.RACES_INIT[15]).sessions.find(s => s.key === 'FP1').outcome; });
    await goTab(p, 'FANTA'); const pts0 = await p.evaluate(() => parseInt(document.querySelector('[data-fanta-total]').textContent, 10));
    await goRace(p); await tapText(p, 'Meteo', { exact: true }); await w(p, 400);
    await tapSel(p, '[data-weather-box="FP1"]'); await w(p, 200); await tapText(p, 'Indovina il meteo'); await w(p, 150);
    await tapText(p, outcome === 'rain' ? 'Pioggia' : 'Asciutto', { exact: true }); await w(p, 200);
    await startLive(p, 'PROVE LIBERE 1'); await advance(p, 120);
    await tapText(p, 'Meteo', { exact: true }); await w(p, 300); await tapSel(p, '[data-weather-box="FP1"]'); await w(p, 200);
    const during = norm(await text(p)); const canGuess = await p.evaluate(() => [...document.querySelectorAll('button')].some(b => /Indovina il meteo|Cambia/.test(b.textContent)));
    await stopLive(p); await goRace(p); await tapText(p, 'Meteo', { exact: true }); await w(p, 300); await tapSel(p, '[data-weather-box="FP1"]'); await w(p, 200);
    const after = norm(await text(p));
    await goTab(p, 'FANTA'); const pts1 = await p.evaluate(() => parseInt(document.querySelector('[data-fanta-total]').textContent, 10));
    const fanta = norm(await text(p)); await ctx.close();
    assert(/Pronostico chiuso/.test(during) && !canGuess, 'durante la sessione il pronostico si può ancora cambiare');
    assert(!/Hai indovinato/.test(after) && /Il tuo pronostico/.test(after), 'la prova DEMO non deve dare l\'esito del meteo: ' + after.slice(0, 200));
    assert(pts1 === pts0, `la prova DEMO non deve dare punti FantaF1 (${pts0} → ${pts1})`);
    assert(!/Meteo Prove libere 1/.test(fanta), 'nel FantaF1 compare un bonus del meteo dalla prova DEMO');
  },
  async 'diretta: nel weekend Sprint si avviano anche Qualifiche Sprint e Sprint (21 giri)'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await openAdmin(p, 'GARA LIVE');
    await pickLiveRace(p, 'GP di Singapore');
    const t = norm(await text(p));
    await tapText(p, 'AVVIA SPRINT', { exact: true }); await w(p, 300); await backHome(p); await goRace(p);
    const t2 = norm(await text(p)); await ctx.close();
    assert(/AVVIA QUALIFICHE SPRINT/.test(t) && /AVVIA SPRINT/.test(t) && !/AVVIA PROVE LIBERE 2/.test(t), 'i tasti della diretta non seguono il weekend Sprint');
    assert(/IN DIRETTA · SPRINT/.test(t2) && /GIRO 1\/21/.test(t2), 'la Sprint non parte: ' + t2.slice(0, 160));
    assert(!errs.length, 'errori JS: ' + errs.join(' | '));
  },
  // ── Telemetria e tempi sul giro ───────────────────────────────────────
  async 'telemetria: toccando un settore si apre la telemetria di tutto il giro'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await startLive(p, 'GARA'); await advance(p, 260); await w(p, 400);
    await tapSel(p, '[data-timing-row] [data-sector-btn="2"]'); await w(p, 500);
    const t = norm(await text(p));
    const whole = await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Giro intero'); return b ? b.getAttribute('aria-pressed') : null; });
    await ctx.close();
    assert(/TELEMETRIA · \w{3} · GIRO \d+/.test(t), 'toccando il settore non si apre la telemetria');
    assert(!/TELEMETRIA · \w{3} · GIRO \d+ · SETTORE/.test(t) && whole === 'true', 'toccando il settore si apre solo il settore, non tutto il giro');
    assert(!errs.length, 'errori JS: ' + errs.join(' | '));
  },
  async 'tempi sul giro: toccando il tempo del pilota si vedono tutti i suoi giri'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await startLive(p, 'GARA'); await advance(p, 420); await w(p, 400);
    const code = await p.evaluate(() => document.querySelector('[data-timing-row] [aria-label^="Tempi sul giro di"]').getAttribute('aria-label').slice(-3));
    await tapSel(p, '[data-timing-row] [aria-label^="Tempi sul giro di"]'); await w(p, 500);
    const r = await p.evaluate(() => ({ rows: [...document.querySelectorAll('[data-lap-list] [data-lap-row]')].map(e => e.getAttribute('data-lap-row')), txt: document.querySelector('[data-lap-list]') ? document.querySelector('[data-lap-list]').innerText : '' }));
    await ctx.close();
    assert(r.rows.length >= 3, 'nell\'elenco ci sono pochi giri: ' + r.rows.length);
    assert(new RegExp('TEMPI SUL GIRO · ' + code).test(r.txt), 'manca il titolo con il pilota');
    assert((r.txt.match(/\d:\d\d\.\d{3}/g) || []).length >= r.rows.length, 'mancano i tempi dei giri');
    assert(/MIGLIOR GIRO/.test(r.txt), 'il miglior giro non è evidenziato');
    assert(!errs.length, 'errori JS: ' + errs.join(' | '));
  },
  async 'tempi sul giro: toccando un giro si apre la sua telemetria'(b) {
    const { ctx, p } = await open(b); await login(p); await startLive(p, 'GARA'); await advance(p, 420); await w(p, 400);
    await tapSel(p, '[data-timing-row] [aria-label^="Tempi sul giro di"]'); await w(p, 400);
    await tapSel(p, '[data-lap-list] [data-lap-row="2"]'); await w(p, 500);
    const t = norm(await text(p)); await ctx.close();
    assert(/TELEMETRIA · \w{3} · GIRO 2\b/.test(t), 'toccando il giro 2 non si apre la sua telemetria');
  },
  // ── FantaF1: squadra e lega modificabili fuori da qualifiche e gara ───
  async 'fanta: la squadra si cambia scegliendo il pilota (anche durante le prove libere)'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await startLive(p, 'PROVE LIBERE 1');
    await goTab(p, 'FANTA'); await tapSel(p, '[aria-label="Cambia Lewis Hamilton"]'); await w(p, 300);
    const t = await text(p);
    await tapSel(p, '[data-pick="leclerc"]'); await w(p, 300);
    const cards = await p.evaluate(() => [...document.querySelectorAll('[data-fanta-card]')].map(e => e.getAttribute('data-fanta-card')));
    await ctx.close();
    assert(/SCEGLI IL PILOTA/.test(t), 'toccando il pilota non si apre la scelta');
    assert(cards[0] === 'leclerc', 'il pilota scelto non entra in squadra: ' + cards);
    assert(!errs.length, 'errori JS: ' + errs.join(' | '));
  },
  // Task 10 (D23): la squadra si blocca con l'ora vera delle qualifiche (la prova DEMO non la blocca più).
  async 'fanta: durante le qualifiche (ora vera) la squadra è bloccata'(b) {
    const { ctx, p } = await open(b, { now: '2026-10-03T08:05:00Z' }); await login(p);
    await goTab(p, 'FANTA'); const t = norm(await text(p));
    await tapSel(p, '[aria-label="Cambia Lewis Hamilton"]').catch(() => {}); await w(p, 300);
    const picker = /SCEGLI IL PILOTA/.test(await text(p));
    await ctx.close();
    assert(/Squadra bloccata/.test(t) && /si riapre a fine gara/i.test(t), 'non dice che la squadra è bloccata');
    assert(!picker, 'durante le qualifiche la squadra si può ancora cambiare');
  },
  // 31/10: leghe vere. Chi l'ha creata la rinomina; tutti invitano col codice.
  async 'fanta: la mia lega si rinomina e si invita col codice'(b) {
    const { ctx, p } = await open(b, { seed: { addDocs: leagueSeed({ members: [{ name: 'Marco' }] }) } }); await login(p); await goTab(p, 'FANTA'); await w(p, 600);
    const card0 = await p.evaluate(() => { const e = document.querySelector('[data-league-card]'); return e ? e.innerText.replace(/\s+/g, ' ') : ''; });
    await tapText(p, 'Rinomina', { exact: true }); await w(p, 200);
    await p.fill('#leagueDraft', 'Amici del Box'); await tapText(p, 'Salva nome', { exact: true }); await w(p, 600);
    const doc = await p.evaluate(() => window.firebase.__fake.doc('fanta/lega-BT-TEST'));
    await tapText(p, 'Invita amici', { exact: true }); await w(p, 400);
    const t = norm(await text(p)), table = await p.evaluate(() => document.querySelector('[data-league-table]').innerText); await ctx.close();
    assert(/Creata da te/.test(card0) && /2 partecipanti/.test(card0) && /codice BT-TEST/.test(card0), 'lega: ' + card0);
    assert(/Amici del Box/.test(t) && doc && doc.name === 'Amici del Box', 'il nome della lega non cambia: ' + JSON.stringify(doc && doc.name));
    assert(/Marco/.test(table) && /Tester/.test(table), 'classifica della lega: ' + table);
    assert(/BT-TEST/.test(t), "l'invito deve dare il codice della lega");
  },
  async 'fanta: si entra in una lega col codice (non si rinomina); se ne crea una nuova (Premium)'(b) {
    const seed = leagueSeed({ code: 'BT-UFF1', name: 'Lega Ufficio', owner: 'u0', members: [{ name: 'A. Ferri' }], meIn: false, myCodes: [] });
    const { ctx, p } = await open(b, { seed: { addDocs: seed } }); await login(p); await goTab(p, 'FANTA'); await w(p, 500);
    await tapSel(p, '[data-league-join]'); await w(p, 200);
    await p.fill('#leagueDraft', 'bt-uff1'); await tapText(p, 'Entra', { exact: true }); await w(p, 800);
    const card = await p.evaluate(() => { const e = document.querySelector('[data-league-card]'); return e ? e.innerText.replace(/\s+/g, ' ') : ''; });
    const doc = await p.evaluate(() => window.firebase.__fake.doc('fanta/lega-BT-UFF1'));
    await tapSel(p, '[aria-label="Profilo"]'); await w(p); await tapText(p, 'Passa a Premium'); await w(p, 300); await tapText(p, 'PROVA GRATIS'); await w(p, 1600);
    await tapText(p, 'INIZIA'); await w(p, 300); await tapSel(p, '[aria-label="Indietro"]').catch(() => {}); await w(p, 200);
    await goTab(p, 'FANTA'); await tapText(p, '+ Nuova lega'); await w(p, 300);
    await p.fill('#leagueDraft', 'Pit Stop Club'); await tapText(p, 'Crea lega', { exact: true }); await w(p, 800);
    const t = norm(await text(p));
    await ctx.close();
    assert(/Lega Ufficio/.test(card) && /Sei un membro/.test(card) && !/Rinomina/.test(card), 'entrato nella lega di un altro: ' + card);
    assert(doc && Object.values(doc.members).some(m => m.name === 'Tester'), 'nel documento della lega manca il nuovo membro');
    assert(/Pit Stop Club/.test(t) && /Creata da te/.test(t) && /Rinomina/.test(t), 'la nuova lega non viene creata come mia');
  },
  async 'fanta: i punti bonus salgono anche nella classifica della lega'(b) {
    const { ctx, p } = await open(b, { seed: { addDocs: leagueSeed({ members: [{ name: 'Marco', bonus: 4 }] }) } }); await login(p); await w(p, 400);
    await goTab(p, 'FANTA'); const me0 = await p.evaluate(() => document.querySelector('[data-league-me]').getAttribute('data-league-me'));
    // Task 10 (D23): il bonus viene da un sondaggio con la risposta esatta segnata dall'admin (la prova DEMO non dà più
    // l'esito del meteo).
    await goTab(p, 'HOME'); await tapText(p, 'Singapore: chi vince la Sprint?'); await w(p, 400);
    await tapSel(p, '[data-poll-option="norris"]'); await w(p, 300);
    await tapSel(p, '[aria-label="Indietro"]'); await w(p, 300);
    await openAdmin(p, 'SONDAGGI'); await tapSel(p, '[data-poll-admin="art-12"] [data-answer="norris"]'); await w(p, 300);
    await backHome(p);
    await goTab(p, 'FANTA'); const me1 = await p.evaluate(() => document.querySelector('[data-league-me]').getAttribute('data-league-me'));
    await ctx.close();
    assert(Number(me1) === Number(me0) + 2, `in classifica lega i punti non salgono di 2 (${me0} → ${me1})`);
  },
  // ── Sondaggi ──────────────────────────────────────────────────────────
  async 'sondaggi: nelle notizie si vota e si vede quanto vale (+2 punti)'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await tapText(p, 'Singapore: chi vince la Sprint?'); await w(p, 500);
    const t0 = norm(await text(p));
    await tapSel(p, '[data-poll-option="norris"]'); await w(p, 300);
    const t1 = norm(await text(p)); const pct = await p.evaluate(() => [...document.querySelectorAll('[data-poll-option]')].map(e => e.innerText.match(/\d+%/) ? 1 : 0).reduce((a, b) => a + b, 0));
    await ctx.close();
    assert(/Chi vince la Sprint di Singapore\?/.test(t0) && /\+2 punti/.test(t0), 'nella notizia manca il sondaggio con i punti');
    assert(/Il tuo voto/.test(t1) && pct === 4, 'dopo il voto non si vedono le percentuali');
    assert(!errs.length, 'errori JS: ' + errs.join(' | '));
  },
  async 'sondaggi: dal pannello admin si aggiunge un sondaggio a una notizia'(b) {
    const { ctx, p } = await open(b); await login(p); await openAdmin(p, 'NEWS');
    await p.fill('#adTitle', 'Chi fa la pole a Singapore?');
    await tapText(p, 'Aggiungi un sondaggio'); await w(p, 200);
    await p.fill('#adPollQ', 'Chi fa la pole?'); await p.fill('#adPollO1', 'Leclerc'); await p.fill('#adPollO2', 'Norris');
    await tapText(p, 'PUBBLICA', { exact: true }); await w(p, 600);
    await tapText(p, 'Chi fa la pole a Singapore?'); await w(p, 500);
    const t = norm(await text(p)); const n = await p.evaluate(() => document.querySelectorAll('[data-poll-option]').length); await ctx.close();
    assert(/Chi fa la pole\?/.test(t) && n === 2 && /Leclerc/.test(t) && /Norris/.test(t), 'il sondaggio creato dall\'admin non compare nella notizia');
  },
  async 'sondaggi: l\'admin segna la risposta giusta e chi ha indovinato prende +2 punti'(b) {
    const { ctx, p } = await open(b); await login(p);
    await tapText(p, 'Singapore: chi vince la Sprint?'); await w(p, 400);
    await tapSel(p, '[data-poll-option="norris"]'); await w(p, 300);
    await tapSel(p, '[aria-label="Indietro"]'); await w(p, 300);
    await goTab(p, 'FANTA'); const pts0 = await p.evaluate(() => parseInt(document.querySelector('[data-fanta-total]').textContent, 10));
    await openAdmin(p, 'SONDAGGI');
    await tapSel(p, '[data-poll-admin="art-12"] [data-answer="norris"]'); await w(p, 300);
    await backHome(p); await goTab(p, 'FANTA');
    const pts1 = await p.evaluate(() => parseInt(document.querySelector('[data-fanta-total]').textContent, 10)); const fanta = norm(await text(p));
    await goTab(p, 'HOME'); await tapText(p, 'Singapore: chi vince la Sprint?'); await w(p, 400);
    const art = norm(await text(p)); await ctx.close();
    assert(pts1 === pts0 + 2, `i punti non salgono di 2 (${pts0} → ${pts1})`);
    assert(/Sondaggio/.test(fanta), 'nel FantaF1 non si vede il bonus del sondaggio');
    assert(/Hai indovinato/.test(art) && /RISPOSTA ESATTA/.test(art), 'nella notizia non si vede la risposta esatta');   // l'etichetta della notizia, non l'avviso dell'admin (dura 2,2 s)
  },
  async 'sondaggi: anche il sondaggio della Home vale +2 punti se esatto'(b) {
    const { ctx, p } = await open(b); await login(p);
    await tapSel(p, '[aria-label="Profilo"]'); await w(p); await tapText(p, 'Passa a Premium'); await w(p, 300); await tapText(p, 'PROVA GRATIS'); await w(p, 1500);
    await tapText(p, 'INIZIA'); await w(p, 300); await tapSel(p, '[aria-label="Indietro"]'); await w(p, 300);
    await tapSel(p, '[data-poll="home"] [data-poll-option="verstappen"]'); await w(p, 300);
    await openAdmin(p, 'SONDAGGI'); await tapSel(p, '[data-poll-admin="home"] [data-answer="verstappen"]'); await w(p, 300);
    await backHome(p); await goTab(p, 'FANTA'); const fanta = norm(await text(p)); await ctx.close();
    assert(/Sondaggio · Chi vince il prossimo GP\?/.test(fanta) && /\+2/.test(fanta), 'il sondaggio della Home non dà i punti');
  },
  // ── Second Screen ─────────────────────────────────────────────────────
  async 'second screen: si apre a tutto schermo girato di 90°, con mappa grande e 4 grafiche'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await premiumTrial(p); await startLive(p, 'GARA'); await advance(p, 200);
    await tapText(p, 'Modalità Second Screen'); await w(p, 600);
    const r = await stageInfo(p); await ctx.close();
    assert(r, 'il Second Screen non si apre');
    assert(Math.abs(r.b - 1) < 0.01 && Math.abs(r.a) < 0.01, 'con il telefono in verticale lo schermo non è girato di 90°: ' + r.transform);
    assert(r.w > r.h && r.w >= 800, `non è in orizzontale: ${r.w}×${r.h}`);
    assert(r.widgets === 4 && r.map, `mappa ${r.map}, grafiche ${r.widgets}`);
    assert(!errs.length, 'errori JS: ' + errs.join(' | '));
  },
  async 'second screen: con il telefono già in orizzontale non viene girato'(b) {
    const { ctx, p } = await open(b, { width: 844, height: 390 }); await login(p); await premiumTrial(p); await startLive(p, 'GARA');
    await tapText(p, 'Modalità Second Screen'); await w(p, 600);
    const r = await stageInfo(p); await ctx.close();
    assert(r && r.transform === 'none' && r.w >= 800, 'in orizzontale lo schermo viene girato lo stesso: ' + (r && r.transform));
  },
  async 'second screen: si scelgono le grafiche tra le 9, nello spazio di 4 posti'(b) {
    const { ctx, p } = await open(b); await login(p); await premiumTrial(p); await startLive(p, 'GARA');
    await tapText(p, 'Modalità Second Screen'); await w(p, 500); await tapSel(p, '[aria-label="Modifica grafiche"]'); await w(p, 300);
    const chips = await p.evaluate(() => [...document.querySelectorAll('[data-ss-chip]')].map(e => e.textContent.trim()));
    const count = () => p.evaluate(() => document.querySelectorAll('[data-ss-widget]').length);
    const n4 = await count();
    await tapSel(p, '[data-ss-chip="radio"]'); await w(p, 200);
    const t1 = norm(await text(p)); const n5 = await count();
    await tapSel(p, '[data-ss-chip="gomme"]'); await w(p, 200); await tapSel(p, '[data-ss-chip="radio"]'); await w(p, 200);
    const ws = await p.evaluate(() => [...document.querySelectorAll('[data-ss-widget]')].map(e => e.getAttribute('data-ss-widget')));
    await ctx.close();
    for (const l of ['Classifica', 'Settori e minisettori', 'Telemetria pilota', 'Usura gomme', 'Meteo', 'Radio', 'Direzione gara', 'Pilota e scuderia del giorno', 'B&T Insights']) assert(chips.some(c => c.includes(l)), 'manca la grafica: ' + l);
    assert(n4 === 4 && n5 === 4 && /massimo 4/i.test(t1), `grafiche: ${n4} poi ${n5}; avviso: ${/massimo 4/i.test(t1)}`);
    assert(ws.length === 4 && ws.includes('radio') && !ws.includes('gomme'), 'scelta delle grafiche sbagliata: ' + ws);
  },
  async 'second screen: le grafiche si spostano: una sull\'altra si scambiano, oppure in un posto libero'(b) {
    const { ctx, p } = await open(b); await login(p); await premiumTrial(p); await startLive(p, 'GARA');
    await tapText(p, 'Modalità Second Screen'); await w(p, 500); await tapSel(p, '[aria-label="Modifica grafiche"]'); await w(p, 300);
    const col = side => p.evaluate(side => [...document.querySelectorAll(`[data-ss-col="${side}"] [data-ss-slot]`)].map(e => e.getAttribute('data-ss-slot')), side);
    const L0 = await col('left'), R0 = await col('right');
    await tapSel(p, `[data-ss-slot="${L0[0]}"]`); await w(p, 150); await tapSel(p, `[data-ss-slot="${R0[1]}"]`); await w(p, 250);
    const L1 = await col('left'), R1 = await col('right');
    await tapSel(p, '[data-ss-chip="gomme"]'); await w(p, 200);   // libera mezzo spazio a sinistra
    await tapSel(p, `[data-ss-slot="${R1[0]}"]`); await w(p, 150); await tapSel(p, '[data-ss-free="left"]'); await w(p, 250);
    const L2 = await col('left'), R2 = await col('right'); await ctx.close();
    assert(L1[0] === R0[1] && R1[1] === L0[0], `scambio non riuscito: ${L0}|${R0} → ${L1}|${R1}`);
    assert(L2.includes(R1[0]) && !R2.includes(R1[0]), `spostamento nel posto libero non riuscito: ${L1}|${R1} → ${L2}|${R2}`);
  },
  async 'second screen: la telemetria pilota si aggiorna in diretta e si cambia pilota'(b) {
    const { ctx, p } = await open(b); await login(p); await premiumTrial(p); await startLive(p, 'GARA'); await advance(p, 150);
    await tapText(p, 'Modalità Second Screen'); await w(p, 500);
    const a = await p.evaluate(() => { const e = document.querySelector('[data-ss-widget="telemetria"]'); return e ? e.innerText.replace(/\s+/g, ' ') : ''; });
    await tapSel(p, '[aria-label="Pilota successivo"]'); await w(p, 200); await advance(p, 3); await w(p, 300);
    const b2 = await p.evaluate(() => { const e = document.querySelector('[data-ss-widget="telemetria"]'); return e ? e.innerText.replace(/\s+/g, ' ') : ''; });
    await ctx.close();
    const code = s => (s.match(/\b[A-Z]{3}\b/) || [])[0];
    assert(/\d+ km\/h/.test(a) && /Marcia/i.test(a) && /Gas/i.test(a) && /Freno/i.test(a), 'nella telemetria mancano velocità, marcia, gas o freno: ' + a);
    assert(code(a) && code(b2) && code(a) !== code(b2), `il pilota non cambia (${code(a)} → ${code(b2)})`);
  },
  // 18/10 (Edoardo): il Second Screen non è più Premium: si apre per tutti.
  // 1/11 (Edoardo): il Second Screen è una funzione Pro (Premium o un video nell'APK); prima (29/10) era gratis.
  async 'second screen: funzione Pro (senza Premium chiede Premium); col Premium senza diretta mostra la prossima gara'(b) {
    const free = await open(b); await login(free.p); await goRace(free.p);
    await tapText(free.p, 'Modalità Second Screen'); await w(free.p, 500);
    const gate = await free.p.evaluate(() => ({ gate: document.querySelector('[data-pro-gate]') && document.querySelector('[data-pro-gate]').getAttribute('data-pro-gate'), ss: !!document.querySelector('[data-ss]'), video: !!document.querySelector('[data-pro-ad]') }));
    await free.ctx.close();
    const { ctx, p } = await open(b, { seed: { pro: true } }); await login(p); await goRace(p);
    await tapText(p, 'Modalità Second Screen'); await w(p, 500);
    const r = await stageInfo(p); const t2 = norm(await text(p)); await ctx.close();
    assert(gate.gate === 'ss' && !gate.ss, 'senza Premium il Second Screen deve chiedere Premium: ' + JSON.stringify(gate));
    assert(!gate.video, 'sul sito non ci sono video con premio');
    assert(r && r.map && /Nessuna sessione in corso/.test(t2), 'senza diretta non si vede la mappa della prossima gara: ' + JSON.stringify(r) + ' ' + t2.slice(0, 400));
  },
  // ── Premium: prova gratuita di 2 settimane ────────────────────────────
  // 18/10 (Edoardo): la prova gratuita dura un GP (fino alla fine del prossimo GP), non più 2 settimane.
  async 'premium: prova gratuita per un GP, poi si vedono i giorni rimasti'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await tapSel(p, '[aria-label="Profilo"]'); await w(p); await tapText(p, 'Passa a Premium'); await w(p, 300);
    const t0 = norm(await text(p));
    await tapText(p, 'PROVA GRATIS'); await w(p, 1600);
    const t1 = norm(await text(p));
    await tapText(p, 'INIZIA'); await w(p, 300);
    const prof = norm(await text(p));
    await tapSel(p, '[aria-label="Indietro"]'); await w(p, 300);
    const chip = await p.evaluate(() => { const e = document.querySelector('[data-premium-chip]'); return e ? e.innerText.replace(/\s+/g, ' ') : ''; });
    await ctx.close();
    assert(/PROVA GRATIS PER UN GP/.test(t0) && /poi/i.test(t0), 'nel Premium manca la prova gratuita per un GP');
    assert(/Prova gratuita attiva/.test(t1) && /prossimo GP/.test(t1), 'dopo la prova non dice che è attiva per il prossimo GP');
    assert(/Prova gratuita/.test(prof) && /\d+ giorni rimasti/.test(prof), 'nel profilo non si vedono i giorni rimasti');
    assert(/PROVA/.test(chip) && /\d/.test(chip), 'in alto non si vede la prova con i giorni: ' + chip);
    assert(!errs.length, 'errori JS: ' + errs.join(' | '));
  },
  async 'premium: la prova gratuita si usa una volta sola'(b) {
    const { ctx, p } = await open(b); await login(p);
    const t = await p.evaluate(() => { const A = window.__req('./App'); return typeof A.premiumOffer === 'function' ? A.premiumOffer({ trialUsed: true, isPremium: false }) : null; });
    const t2 = await p.evaluate(() => { const A = window.__req('./App'); return typeof A.premiumOffer === 'function' ? A.premiumOffer({ trialUsed: false, isPremium: false }) : null; });
    await ctx.close();
    assert(t === 'subscribe' && t2 === 'trial', 'dopo averla usata la prova gratuita viene offerta di nuovo: ' + t + ' / ' + t2);
  },
};

(async () => {
  const filter = process.argv[2] ? new RegExp(process.argv[2], 'i') : null;
  const b = await chromium.launch({ executablePath: EXE });
  let pass = 0, fail = 0;
  for (const [name, fn] of Object.entries(tests)) {
    if (filter && !filter.test(name)) continue;
    try { await fn(b); pass++; console.log('PASS  ' + name); }
    catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + String(e.message).split('\n')[0].slice(0, 250)); }
  }
  await b.close(); console.log(`\n${pass} passati, ${fail} falliti`); process.exit(fail ? 1 : 0);
})();
