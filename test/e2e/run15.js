// Test della 2.0 (versione 17): GP del Bahrain in Malesia, nuovi limiti dei pronostici meteo, podi (mondiale,
// ultima gara, fine gara, migliori del Fanta), squadra FantaF1 come F1 Fantasy (piloti + scuderie, budget, 2X,
// cambi, chiusura alle qualifiche, punti dalla diretta), previsioni avanzate, regole e pannello admin.
// Uso: bash rtest/build.sh && node rtest/run15.js [filtro]      (PAGE=real.html per React vero)
const { chromium } = require('/opt/node-tools/node_modules/playwright');
// Le notizie, le previsioni, i video e il calendario d'esempio della 2.0 ora stanno su Firebase (Task 6): il Firebase
// finto parte con quei documenti, così le prove li ritrovano.
const SEED_20 = require('../fixtures/seed-2.0.json');
const { leagueSeed } = require('../fake/leagues');   // 31/10: leghe FantaF1 vere
const EXE = require('fs').existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined;
const NOW = '2026-09-30T11:48:00Z';   // mercoledì prima del GP: la squadra chiude tra 2 giorni, 20 ore e 12 minuti

async function open(b, { now = NOW, seed = null } = {}) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await ctx.addInitScript(() => { try { if (!localStorage.getItem('bt_bt-entry')) localStorage.setItem('bt_bt-entry', JSON.stringify('form')); } catch (e) {} });   // 7/11: benvenuto già visto (come helpers.js)
  await ctx.route('https://api.jolpi.ca/**', r => r.abort());               // 24/10: classifiche di Jolpica e previsioni
  await ctx.route('https://bt-app-2.vercel.app/**', r => r.abort());   // meteo di serie non rispondono (come helpers.js)
  await ctx.addInitScript(seed => { window.__btSeed = seed; }, seed ? { ...SEED_20, addDocs: { ...(SEED_20.addDocs || {}), ...(seed.addDocs || {}) } } : SEED_20);
  await ctx.addInitScript(now => { window.open = () => null; window.__btNow = Date.parse(now); }, now);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/' + (process.env.PAGE || 'test.html')); await p.waitForTimeout(400);
  return { ctx, p, errs };
}
const w = (p, ms = 300) => p.waitForTimeout(ms);
const text = p => p.evaluate(() => document.body.innerText);
async function tapText(p, txt, { exact = false, timeout = 4000, sel = 'button' } = {}) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const ok = await p.evaluate(({ txt, exact, sel }) => { const n = s => s.replace(/\s+/g, ' ').trim(); const el = [...document.querySelectorAll(sel)].find(b => exact ? (n(b.textContent) === txt || (b.hasAttribute('data-nav-tab') && n(b.textContent).toUpperCase() === txt)) : n(b.textContent).includes(txt)); if (!el) return false; el.click(); return true; }, { txt, exact, sel });
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
const attr = (p, sel, a) => p.evaluate(([s, a]) => { const e = document.querySelector(s); return e ? e.getAttribute(a) : null; }, [sel, a]);
const inner = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); return e ? e.innerText.replace(/\s+/g, ' ').trim() : null; }, sel);
async function login(p) {
  await p.fill('#authEmail', 'a@b.it'); await p.fill('#authPw', 'x');
  await p.evaluate(() => { const bs = [...document.querySelectorAll('button')].filter(b => b.textContent.replace(/\s+/g, ' ').trim() === 'ACCEDI'); bs[bs.length - 1].click(); });
  await w(p, 2500); await p.waitForFunction(() => !document.querySelector('[data-splash]'), null, { timeout: 8000 }).catch(() => {}); await w(p, 400);   // Task 9: si aspetta la fine dello splash (i Termini li ha già accettati il Firebase finto)
}
const goTab = async (p, t) => { await tapText(p, t, { exact: true }); await w(p, 400); };
async function openAdmin(p, tab) {
  // 31/10: a@b.it non è admin di serie (gli admin hanno Premium e tutti i trofei): lo diventa qui (l'app lo rilegge aprendo il Profilo).
  await p.evaluate(() => { if (!window.firebase.__fake.doc('admins/a@b.it')) window.firebase.__fake.setDoc('admins/a@b.it', { ruolo: 'admin' }); });
  await tapSel(p, '[aria-label="Profilo"]'); await w(p); await tapText(p, 'Pannello Admin'); await w(p);
  const keypad = await p.evaluate(() => [...document.querySelectorAll('button')].some(b => b.textContent.trim() === '8'));
  if (keypad) { for (const d of '080824') { await tapText(p, d, { exact: true }); await w(p, 60); } await w(p, 900); }
  if (tab) { await tapText(p, tab, { exact: true }); await w(p, 300); }
}
const backHome = async p => { await tapSel(p, '[aria-label="Indietro"]'); await w(p); await tapSel(p, '[aria-label="Indietro"]'); await w(p); };
async function startLive(p, session, then = 'RACE') { await openAdmin(p, 'GARA LIVE'); await tapText(p, 'AVVIA ' + session, { exact: true }); await w(p, 300); await backHome(p); if (then) await goTab(p, then); }
async function stopLive(p) { await openAdmin(p, 'GARA LIVE'); await tapText(p, 'TERMINA DIRETTA', { exact: true }); await w(p, 300); await backHome(p); }
const advance = (p, sec) => p.evaluate(s => window.__btLive.advance(s), sec);
const assert = (c, m) => { if (!c) throw new Error(m); };
const weatherBox = async (p, key) => { await tapSel(p, `[data-weather-box="${key}"]`); await w(p, 250); };
const podium = (p, root) => p.evaluate(root => {
  const r = document.querySelector(root); if (!r) return null;
  return [...r.querySelectorAll('[data-podium-place]')].map(e => ({ place: +e.getAttribute('data-podium-place'), text: e.innerText.replace(/\s+/g, ' ').trim(), who: (e.innerText.match(/[A-Z]\. \S+/) || [''])[0], h: e.querySelector('[data-podium-step]').offsetHeight, photo: (e.querySelector('[data-podium-photo]') || {}).getAttribute ? e.querySelector('[data-podium-photo]').getAttribute('data-podium-photo') : null }));
}, root);

const tests = {
  // ── Calendario e circuito ─────────────────────────────────────────────
  async 'calendario: il round 16 è il GP del Bahrain in Malesia, a Sepang, con la scheda del circuito'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await goTab(p, 'RACE');
    const t = await text(p);
    assert(/GP del Bahrain in Malesia/.test(t) && /ROUND 16\/23/.test(t), 'la prossima gara non è il GP del Bahrain in Malesia (round 16 di 23)');
    await tapSel(p, '[data-circuit-cta]'); await w(p, 500);
    const c = await text(p); await ctx.close();
    for (const s of ['Sepang International Circuit', '5,543 km', '1999', '56', '1:34.080', 'Sebastian Vettel (2017)', '#Sepang']) assert(c.includes(s), 'nella scheda del circuito manca: ' + s);
    assert(!errs.length, errs.join(' | '));
  },
  // ── Meteo ─────────────────────────────────────────────────────────────
  async 'meteo: il pronostico della gara si cambia fino alla fine delle FP3'(b) {
    const { ctx, p } = await open(b); await login(p); await goTab(p, 'RACE'); await tapText(p, 'Meteo', { exact: true }); await w(p, 400);
    await weatherBox(p, 'RACE');
    const t = await text(p);
    assert(/fino alla fine delle FP3 \(sab 3 ott, 07:30, ora italiana\)/.test(t), 'manca la scadenza della gara (fine FP3): ' + t.slice(t.indexOf('Gara'), t.indexOf('Gara') + 400));
    await tapText(p, 'Indovina il meteo'); await w(p, 150); await tapText(p, 'Pioggia', { exact: true }); await w(p, 300);
    const t2 = await text(p);
    await weatherBox(p, 'FP2'); const fp2 = await text(p);
    await weatherBox(p, 'FP1'); const fp1 = await text(p); await ctx.close();
    assert(/Il tuo pronostico: Pioggia/.test(t2) && /Cambia/.test(t2), 'il pronostico non si salva o non si può cambiare');
    assert(/fino alla fine delle FP1/.test(fp2), 'le FP2 devono chiudersi a fine FP1');
    assert(/fino all'inizio delle FP1/.test(fp1), 'le FP1 devono chiudersi al loro inizio');
  },
  // Task 10 (D23): la prova DEMO mette in pausa i pronostici solo mentre gira; finita, non chiude quelli dopo.
  async 'meteo: durante una sessione i pronostici sono in pausa, dopo si riaprono; la prova DEMO non chiude quelli dopo (D23)'(b) {
    const { ctx, p } = await open(b); await login(p);
    await startLive(p, 'PROVE LIBERE 2'); await tapText(p, 'Meteo', { exact: true }); await w(p, 400);
    await weatherBox(p, 'RACE');
    const during = await text(p);
    const btnDuring = await p.evaluate(() => [...document.querySelectorAll('button')].some(b => /Indovina il meteo/.test(b.textContent)));
    await stopLive(p); await goTab(p, 'RACE'); await tapText(p, 'Meteo', { exact: true }); await w(p, 400);
    await weatherBox(p, 'RACE');
    const after = await p.evaluate(() => [...document.querySelectorAll('button')].some(b => /Indovina il meteo/.test(b.textContent)));
    await weatherBox(p, 'QUALI'); const quali = await text(p);
    const qualiOpen = await p.evaluate(() => [...document.querySelectorAll('button')].some(b => /Indovina il meteo/.test(b.textContent))); await ctx.close();
    assert(/In pausa: prove libere 2 in corso/.test(during), 'durante le FP2 il pronostico non è in pausa');
    assert(!btnDuring, 'durante la sessione si può ancora pronosticare');
    assert(after, 'finita la sessione il pronostico della gara non si riapre');
    assert(qualiOpen && !/Pronostico chiuso/.test(quali), 'la prova DEMO delle FP2 non deve chiudere il pronostico delle qualifiche');
  },
  // ── Podi ──────────────────────────────────────────────────────────────
  async 'mondiale: podio col 1° al centro più alto, il 2° a sinistra e il 3° a destra più basso (piloti e costruttori)'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await goTab(p, 'RACE'); await tapText(p, 'Mondiale', { exact: true }); await w(p, 400);
    const pd = await podium(p, '[data-champ-podium="piloti"]');
    await tapText(p, 'Costruttori', { exact: true }); await w(p, 300);
    const pt = await podium(p, '[data-champ-podium="costruttori"]'); await ctx.close();
    assert(pd && pd.map(x => x.place).join() === '2,1,3', 'ordine del podio piloti: ' + JSON.stringify(pd));
    assert(pd[1].h > pd[0].h && pd[0].h > pd[2].h, 'altezze dei gradini: ' + pd.map(x => x.h));
    assert(/K\. Antonelli/.test(pd[1].text) && /302 pt/.test(pd[1].text) && /G\. Russell/.test(pd[0].text) && /L\. Hamilton/.test(pd[2].text), 'piloti sul podio: ' + JSON.stringify(pd));
    assert(pt && /Mercedes/.test(pt[1].text) && /Ferrari/.test(pt[0].text) && /McLaren/.test(pt[2].text), 'podio costruttori: ' + JSON.stringify(pt));
    assert(!errs.length, errs.join(' | '));
  },
  async 'mondiale: classifiche vere dopo Baku (round 15), anche con Tsunoda'(b) {
    const { ctx, p } = await open(b); await login(p); await goTab(p, 'RACE'); await tapText(p, 'Mondiale', { exact: true }); await w(p, 400);
    const t = await text(p); await ctx.close();
    assert(/Aggiornata dopo il GP dell'Azerbaigian \(round 15\)/.test(t), 'manca la nota della classifica');
    assert(/Yuki Tsunoda/.test(t), 'manca Tsunoda (1 punto)');
    assert(/G\. Russell\s*236 pt/.test(t), 'punti di Russell (2° sul podio) sbagliati');
    assert(/Lando Norris\s*McLaren\s*186/.test(t.replace(/pt/g, '')), 'punti di Norris (4°, primo della lista) sbagliati');
  },
  async 'ultima gara: podio con Russell, Verstappen e Hadjar (Baku) e sotto la classifica dal 4°'(b) {
    const { ctx, p } = await open(b); await login(p); await goTab(p, 'RACE');
    await tapSel(p, '[data-race-tab="classifica"]').catch(() => {}); await w(p, 300); const pd = await podium(p, '[data-last-race="real"]');
    const rows = await p.evaluate(() => document.querySelectorAll('[data-result-row]').length);
    const t = await text(p); await ctx.close();
    assert(pd && pd.map(x => x.who).join() === 'M. Verstappen,G. Russell,I. Hadjar', 'podio ultima gara: ' + JSON.stringify(pd));
    assert(rows === 19, 'righe della classifica (dal 4° in giù): ' + rows);
    assert(/GP dell'Azerbaigian/.test(t) && /\+14\.136s/.test(t) && /RIT/.test(t), 'classifica di Baku incompleta');
  },
  async 'mondiale: durante la diretta il podio della classifica non c\'è'(b) {
    const { ctx, p } = await open(b); await login(p); await startLive(p, 'GARA');
    await tapText(p, 'Mondiale', { exact: true }); await w(p, 400);
    const pod = await has(p, '[data-champ-podium]'); await ctx.close();
    assert(!pod, 'il podio del mondiale compare anche con la gara in corso');
  },
  // Task 10 (D23): la prova DEMO non cambia l'ultima gara: finita la prova resta quella vera (Baku).
  async 'fine gara (prova DEMO): podio coi primi tre; finita la prova l\'ultima gara resta quella vera'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await startLive(p, 'GARA');
    await openAdmin(p, 'GARA LIVE'); await tapText(p, 'ULTIMO GIRO', { exact: true }); await w(p, 300); await backHome(p); await goTab(p, 'RACE');
    for (let i = 0; i < 40 && !(await has(p, '[data-finish-podium]')); i++) { await advance(p, 20); await w(p, 120); }
    const pd = await podium(p, '[data-finish-podium]');
    const top = await p.evaluate(() => [...document.querySelectorAll('[aria-label^="Tempi sul giro di"]')].slice(0, 3).map(e => e.getAttribute('aria-label')));
    await stopLive(p); await goTab(p, 'RACE');
    await tapSel(p, '[data-race-tab="classifica"]').catch(() => {}); await w(p, 300); const last = await podium(p, '[data-last-race="real"]'), demoLast = await has(p, '[data-last-race="demo"]'); await ctx.close();
    assert(pd, 'a fine gara non compare il podio');
    assert(pd.map(x => x.place).join() === '2,1,3' && pd.every(x => x.who), 'podio di fine gara: ' + JSON.stringify(pd));
    assert(last && last.map(x => x.who).join() === 'M. Verstappen,G. Russell,I. Hadjar' && !demoLast, 'finita la prova DEMO l\'ultima gara deve restare Baku: ' + JSON.stringify(last));
    assert(!errs.length, errs.join(' | '));
  },
  // ── FantaF1 ───────────────────────────────────────────────────────────
  async 'fanta: squadra come F1 Fantasy (5 piloti, 2 scuderie, prezzi, 2X, cambi, budget e chiusura)'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await goTab(p, 'FANTA');
    const cards = await p.evaluate(() => [...document.querySelectorAll('[data-fanta-card]')].map(e => e.getAttribute('data-fanta-card')));
    const t = await text(p);
    const boost = await attr(p, '[data-fanta-card="russell"] [data-boost]', 'data-boost');
    const cd = await attr(p, '[data-countdown]', 'aria-label'); await ctx.close();
    assert(cards.join() === 'hamilton,russell,hulkenberg,perez,antonelli,audi,haas', 'carte della squadra: ' + cards);
    assert(/\$24\.6M/.test(t) && /▼\$0\.3M/.test(t) && /\$28\.1M/.test(t) && /▲\$0\.3M/.test(t) && /\$3M/.test(t), 'prezzi o variazioni mancanti');
    assert(boost === 'on', 'Russell dovrebbe avere il 2X');
    assert(/3 di 3/.test(t), 'mancano i cambi gratis 3 di 3');
    assert(/Budget: \$0\.1M/.test(t), 'budget rimasto sbagliato');
    assert(cd === 'Mancano 2 giorni, 20 ore e 12 minuti', 'conto alla rovescia: ' + cd);
    assert(/Si blocca all'inizio delle qualifiche \(sab 3 ott, 10:00, ora italiana\)/.test(t), 'manca quando si blocca la squadra');
    assert(!errs.length, errs.join(' | '));
  },
  async 'fanta: il budget impedisce di comprare chi costa troppo'(b) {
    const { ctx, p } = await open(b); await login(p); await goTab(p, 'FANTA');
    await tapSel(p, '[aria-label="Togli Nico Hülkenberg"]'); await w(p, 300);
    const left = await inner(p, '[data-budget-left]');
    await tapSel(p, '[data-fanta-add="drivers:2"]'); await w(p, 400);
    const st = await p.evaluate(() => Object.fromEntries(['verstappen', 'bearman', 'hulkenberg', 'perez', 'stroll'].map(id => { const b = document.querySelector(`[data-pick="${id}"]`); return [id, b ? !b.disabled : null]; })));
    await tapSel(p, '[data-pick="stroll"]'); await w(p, 300);
    const cards = await p.evaluate(() => [...document.querySelectorAll('[data-fanta-card]')].map(e => e.getAttribute('data-fanta-card')));
    await ctx.close();
    assert(left === '$5.5M', 'budget dopo aver tolto Hülkenberg: ' + left);
    assert(st.verstappen === false && st.bearman === false, 'si può comprare chi costa più del budget: ' + JSON.stringify(st));
    assert(st.hulkenberg === true && st.stroll === true, 'non si può comprare chi entra nel budget: ' + JSON.stringify(st));
    assert(st.perez === false, 'si può prendere due volte lo stesso pilota');
    assert(cards[2] === 'stroll', 'Stroll non è entrato nel posto libero: ' + cards);
  },
  async 'fanta: ogni cambio usa un cambio gratis, oltre i 3 costa 10 punti, e il 2X si sposta'(b) {
    const { ctx, p } = await open(b); await login(p); await goTab(p, 'FANTA');
    const swap = async (from, add, to) => { await tapSel(p, `[aria-label="Cambia ${from}"]`); await w(p, 300); await tapSel(p, `[data-pick="${to}"]`); await w(p, 300); };
    await swap('Sergio Pérez', null, 'stroll');
    const t1 = await inner(p, '[data-transfers]');
    await swap('Nico Hülkenberg', null, 'bottas');
    await swap('Lance Stroll', null, 'perez');   // Pérez torna: non conta
    const t2 = await inner(p, '[data-transfers]');
    await swap('Audi', null, 'cadillac'); await swap('Haas', null, 'astonmartin');
    await swap('Sergio Pérez', null, 'stroll');   // quarto cambio: uno in più dei gratis
    const t3 = await text(p);
    await tapSel(p, '[aria-label="Metti il 2X su Lewis Hamilton"]'); await w(p, 300);
    const bo = await p.evaluate(() => ({ ham: document.querySelector('[data-fanta-card="hamilton"] [data-boost]').getAttribute('data-boost'), rus: document.querySelector('[data-fanta-card="russell"] [data-boost]').getAttribute('data-boost') }));
    await ctx.close();
    assert(t1 === '2 di 3', 'dopo un cambio: ' + t1);
    assert(t2 === '2 di 3', 'rimettere Pérez non deve contare: ' + t2);
    assert(/1 cambio in più dei gratis: −10 punti a fine weekend/.test(t3), 'manca la penalità del quarto cambio');
    assert(bo.ham === 'on' && bo.rus === 'off', '2X non spostato: ' + JSON.stringify(bo));
  },
  async 'fanta: Reset svuota la squadra e Riempi la completa nel budget'(b) {
    const { ctx, p } = await open(b); await login(p); await goTab(p, 'FANTA');
    await tapText(p, 'Reset', { exact: true }); await w(p, 300);
    const empty = await p.evaluate(() => document.querySelectorAll('[data-fanta-add]').length);
    const t = await text(p);
    await tapText(p, 'Riempi'); await w(p, 400);
    const cards = await p.evaluate(() => document.querySelectorAll('[data-fanta-card]').length);
    const left = await inner(p, '[data-budget-left]');
    const boost = await p.evaluate(() => document.querySelectorAll('[data-boost="on"]').length); await ctx.close();
    assert(empty === 7, 'posti vuoti dopo Reset: ' + empty);
    assert(/Aggiungi pilota/.test(t) && /Aggiungi scuderia/.test(t) && /Budget: \$108\.1M/.test(t), 'stato vuoto sbagliato');
    assert(cards === 7, 'Riempi non completa la squadra: ' + cards);
    assert(parseFloat(left.replace(/[$M]/g, '')) >= 0, 'Riempi sfora il budget: ' + left);
    assert(boost === 1, 'dopo Riempi manca il 2X');
  },
  async 'fanta: all\'inizio delle qualifiche (ora vera) la squadra si blocca'(b) {
    const { ctx, p } = await open(b, { now: '2026-10-03T08:05:00Z' }); await login(p); await goTab(p, 'FANTA');
    const lock = await attr(p, '[data-team-lock]', 'data-team-lock');
    await tapSel(p, '[aria-label="Cambia Lewis Hamilton"]').catch(() => {}); await w(p, 300);
    const picker = await has(p, '[data-pick]');
    const x = await has(p, '[aria-label="Togli Lewis Hamilton"]'); await ctx.close();
    assert(lock === 'locked', 'la squadra non è bloccata durante le qualifiche');
    assert(!picker && !x, 'da bloccata la squadra si può ancora cambiare');
  },
  // Task 10 (D23): la prova DEMO gira su una copia dello stato: non blocca la squadra e non dà punti del weekend.
  async 'fanta: la prova DEMO di qualifiche e gara non blocca la squadra e non dà punti (D23)'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    const total0 = await (async () => { await goTab(p, 'FANTA'); return parseInt(await inner(p, '[data-fanta-total]'), 10); })();
    await startLive(p, 'QUALIFICHE', 'FANTA');
    const l1 = await attr(p, '[data-team-lock]', 'data-team-lock');
    await goTab(p, 'RACE');
    for (let i = 0; i < 60 && !(await p.evaluate(() => window.__btLive && /BANDIERA A SCACCHI/.test(document.body.innerText) && /Q3/.test(document.body.innerText))); i++) { await advance(p, 120); await w(p, 60); }
    for (let i = 0; i < 20; i++) { await advance(p, 200); await w(p, 60); }
    await stopLive(p); await goTab(p, 'FANTA');
    const l2 = await attr(p, '[data-team-lock]', 'data-team-lock');
    const qRow = await has(p, '[data-weekend-row="QUALI"]');
    await startLive(p, 'GARA', null);
    await openAdmin(p, 'GARA LIVE'); await tapText(p, 'ULTIMO GIRO', { exact: true }); await w(p, 300); await backHome(p); await goTab(p, 'RACE');
    for (let i = 0; i < 40 && !(await has(p, '[data-finish-podium]')); i++) { await advance(p, 20); await w(p, 120); }
    await stopLive(p); await goTab(p, 'FANTA');
    const l3 = await attr(p, '[data-team-lock]', 'data-team-lock');
    const rRow = await has(p, '[data-weekend-row="RACE"]');
    const total1 = parseInt(await inner(p, '[data-fanta-total]'), 10);
    await ctx.close();
    assert(l1 === 'open', 'la prova DEMO delle qualifiche non deve bloccare la squadra: ' + l1);
    assert(l2 === 'open', 'finita la prova delle qualifiche la squadra deve restare aperta: ' + l2);
    assert(!qRow && !rRow, 'la prova DEMO non deve dare punti di qualifiche o gara');
    assert(l3 === 'open', 'finita la prova della gara la squadra deve essere aperta: ' + l3);
    assert(total1 === total0, `la prova DEMO ha cambiato il totale: ${total0} → ${total1}`);
    assert(!errs.length, errs.join(' | '));
  },
  // 31/10: podio dai membri veri delle mie leghe (punti dei GP veri + bonus dei pronostici).
  async 'fanta: podio dei migliori di tutte le leghe'(b) {
    const seed = leagueSeed({ members: [{ name: 'Bianchi', bonus: 30 }, { name: 'Greco', bonus: 20 }, { name: 'Conti', bonus: 10 }] });
    const { ctx, p } = await open(b, { seed: { addDocs: seed } }); await login(p); await goTab(p, 'FANTA'); await w(p, 600);
    const pd = await podium(p, '[data-fanta-podium]'); await ctx.close();
    assert(pd && pd.map(x => x.place).join() === '2,1,3', 'ordine: ' + JSON.stringify(pd));
    assert(/Bianchi/.test(pd[1].text) && /30 pt/.test(pd[1].text), '1°: ' + pd[1].text);
    assert(/Greco/.test(pd[0].text) && /Conti/.test(pd[2].text), 'podio: ' + JSON.stringify(pd));
  },
  async 'fanta: regole e punti come F1 Fantasy più i bonus B&T'(b) {
    const { ctx, p } = await open(b); await login(p); await goTab(p, 'FANTA');
    await tapText(p, 'Regole e punti'); await w(p, 300);
    const t = await inner(p, '[data-fanta-rules]'); await ctx.close();
    for (const s of ['5 piloti e 2 scuderie', '100 milioni', '2X', 'Qualifiche Sprint', 'costa 10 punti', '10, 9, 8, 7, 6, 5, 4, 3, 2, 1', '25, 18, 15, 12, 10, 8, 6, 4, 2, 1', 'entrambi in Q3 +10', 'Meteo indovinato', 'Previsione avanzata giusta: +1'])
      assert(t && t.includes(s), 'nelle regole manca: ' + s);
  },
  // ── Previsioni avanzate ───────────────────────────────────────────────
  async 'previsioni: domanda di storia, +1 punto se giusta e un solo tentativo'(b) {
    const { ctx, p } = await open(b); await login(p); await goTab(p, 'FANTA');
    const b0 = await inner(p, '[data-bonus-total]');
    await tapSel(p, '[data-prediction="h1"] [data-option="verstappen"]'); await w(p, 300);
    await tapSel(p, '[data-prediction="h2"] [data-option="alonso"]'); await w(p, 300);
    const h1 = await inner(p, '[data-prediction="h1"]'), h2 = await inner(p, '[data-prediction="h2"]');
    const off = await p.evaluate(() => document.querySelector('[data-prediction="h2"] [data-option="vettel"]').disabled);
    const b1 = await inner(p, '[data-bonus-total]'); await ctx.close();
    assert(/Giusto! \+1 punto/.test(h1), 'risposta giusta non premiata: ' + h1);
    assert(/la risposta esatta è S\. Vettel/.test(h2), 'manca la risposta esatta: ' + h2);
    assert(off, 'dopo la risposta si può riprovare');
    assert(b0 === '+0' && b1 === '+1', `bonus ${b0} → ${b1}`);
  },
  async 'previsioni: pilota scelto dall\'elenco e numero col tastierino, l\'admin segna le risposte e arrivano i punti'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await goTab(p, 'FANTA');
    await tapSel(p, '[data-prediction="p1"] [data-pred-open]'); await w(p, 250);
    await tapSel(p, '[data-pred-picker="p1"] [data-pick-option="antonelli"]'); await w(p, 300);
    await tapSel(p, '[data-prediction="p2"] [data-pred-open]'); await w(p, 200);
    await tapSel(p, '[data-numpad] [data-numpad-key="1"]'); await tapSel(p, '[data-numpad] [data-numpad-ok]'); await w(p, 300);
    await openAdmin(p, 'PREVISIONI');
    await tapSel(p, '[data-pred-admin="p1"] [data-pred-open]'); await w(p, 250);
    await tapSel(p, '[data-pred-picker="admin-p1"] [data-pick-option="antonelli"]'); await w(p, 300);
    await tapSel(p, '[data-pred-admin="p2"] [data-pred-open]'); await w(p, 200);
    await tapSel(p, '[data-numpad] [data-numpad-key="1"]'); await tapText(p, 'SEGNA', { exact: true, sel: '[data-numpad] button' }); await w(p, 300);
    await backHome(p); await goTab(p, 'FANTA');
    const p1 = await inner(p, '[data-prediction="p1"]'), p2 = await inner(p, '[data-prediction="p2"]'), bonus = await inner(p, '[data-bonus-total]');
    await ctx.close();
    assert(/Giusto! \+1 punto/.test(p1), 'pilota: ' + p1);
    assert(/Giusto! \+1 punto/.test(p2), 'numero: ' + p2);
    assert(bonus === '+2', 'bonus: ' + bonus);
    assert(!errs.length, errs.join(' | '));
  },
  async 'previsioni: le domande sul weekend si chiudono all\'inizio della loro sessione'(b) {
    const { ctx, p } = await open(b); await login(p); await startLive(p, 'QUALIFICHE', 'FANTA');
    const p1 = await inner(p, '[data-prediction="p1"]');
    const off = await p.evaluate(() => document.querySelector('[data-prediction="p1"] [data-pred-open]').disabled);
    const p2open = await p.evaluate(() => !document.querySelector('[data-prediction="p2"] [data-pred-open]').disabled);
    await ctx.close();
    assert(/Chiusa/.test(p1) && off, 'la pole si pronostica anche a qualifiche iniziate');
    assert(p2open, 'le domande sulla gara devono restare aperte durante le qualifiche');
  },
  async 'admin: prezzi F1 Fantasy di piloti e scuderie si aggiornano'(b) {
    const { ctx, p } = await open(b); await login(p); await openAdmin(p, 'FANTA F1');
    await p.fill('[aria-label="Prezzo Lewis Hamilton"]', '25.5'); await w(p, 100);
    await tapText(p, 'SCUDERIE', { exact: true }); await w(p, 200);
    await p.fill('[aria-label="Prezzo Audi"]', '9.8'); await w(p, 100);
    await tapText(p, 'SALVA', { exact: true }); await w(p, 300);
    await backHome(p); await goTab(p, 'FANTA');
    const ham = await inner(p, '[data-fanta-card="hamilton"]'), audi = await inner(p, '[data-fanta-card="audi"]'); await ctx.close();
    assert(/\$25\.5M/.test(ham), 'prezzo di Hamilton: ' + ham);
    assert(/\$9\.8M/.test(audi), 'prezzo di Audi: ' + audi);
  },
};

(async () => {
  const filter = process.argv[2] ? new RegExp(process.argv[2], 'i') : null;
  const b = await chromium.launch({ executablePath: EXE });
  let pass = 0, fail = 0, skip = 0;
  for (const [name, fn] of Object.entries(tests)) {
    if (filter && !filter.test(name)) continue;
    if (/^SKIP\b/.test(name)) { skip++; console.log(name); continue; }
    try { await fn(b); pass++; console.log('PASS  ' + name); }
    catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + String(e.message).split('\n')[0].slice(0, 400)); }
  }
  await b.close();
  console.log(`\n${pass} passati, ${fail} falliti${skip ? `, ${skip} saltati` : ''}`);
  process.exit(fail ? 1 : 0);
})();
