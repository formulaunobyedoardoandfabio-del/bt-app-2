// Test della 2.0 (versione 22): niente più schede Instagram e Chat (Instagram è un grande bottone in Home e nel
// Profilo); al posto della Chat c'è GARAGE con i Giochi: Pit Stop Challenge e Silly Season Predictor.
// Uso: bash rtest/build.sh && node rtest/run20.js [filtro]      (PAGE=real.html per React vero)
const { chromium } = require('/opt/node-tools/node_modules/playwright');
// Le notizie, le previsioni, i video e il calendario d'esempio della 2.0 ora stanno su Firebase (Task 6): il Firebase
// finto parte con quei documenti, così le prove li ritrovano.
const SEED_20 = require('../fixtures/seed-2.0.json');
const EXE = require('fs').existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined;
const NOW = '2026-09-30T11:48:00Z';

async function open(b, { now = NOW, width = 390, height = 844 } = {}) {
  const ctx = await b.newContext({ viewport: { width, height }, hasTouch: true });
  await ctx.addInitScript(() => { try { if (!localStorage.getItem('bt_bt-entry')) localStorage.setItem('bt_bt-entry', JSON.stringify('form')); } catch (e) {} });   // 7/11: benvenuto già visto (come helpers.js)
  await ctx.route('https://api.jolpi.ca/**', r => r.abort());               // 24/10: classifiche di Jolpica e previsioni
  await ctx.route('https://bt-app-2.vercel.app/**', r => r.abort());   // meteo di serie non rispondono (come helpers.js)
  await ctx.addInitScript(seed => { window.__btSeed = seed; }, SEED_20);
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
const count = (p, sel) => p.evaluate(s => document.querySelectorAll(s).length, sel);
const inner = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); return e ? e.innerText.replace(/\s+/g, ' ').trim() : null; }, sel);
const attrs = (p, sel, a) => p.evaluate(([s, a]) => [...document.querySelectorAll(s)].map(e => e.getAttribute(a)), [sel, a]);
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
const advance = (p, sec) => p.evaluate(s => window.__btLive.advance(s), sec);
const assert = (c, m) => { if (!c) throw new Error(m); };
async function premiumTrial(p) {
  await tapSel(p, '[aria-label="Profilo"]'); await w(p); await tapText(p, 'Passa a Premium'); await w(p, 300);
  await tapSel(p, '[data-premium-cta]'); await w(p, 300); await tapSel(p, '[data-confirm-cta]'); await w(p, 1800); await tapSel(p, '[data-premium-close]'); await w(p, 300);   // 8/11: nuovo design del Premium
  await tapSel(p, '[aria-label="Indietro"]'); await w(p, 300);
}
async function openSS(p) { await tapText(p, 'Modalità Second Screen'); await w(p, 600); }
const openGame = async (p, id) => { await goTab(p, 'GARAGE'); await tapSel(p, `[data-game="${id}"]`); await w(p, 300); };
const phase = p => p.evaluate(() => { const e = document.querySelector('[data-pit-phase]'); return e && e.getAttribute('data-pit-phase'); });
async function waitGo(p) { for (let i = 0; i < 40 && (await phase(p)) !== 'go'; i++) await w(p, 100); }
async function pitRound(p) { for (let k = 0; k < 4; k++) for (const wh of ['fl', 'fr', 'rl', 'rr']) { await tapSel(p, `[data-pit-wheel="${wh}"]`); await w(p, 120); } await w(p, 300); }

const tests = {
  async 'menu: niente più Instagram e Chat, al loro posto GARAGE'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    const labels = await p.evaluate(() => [...document.querySelectorAll('[data-nav-tab]')].map(e => e.getAttribute('data-nav-tab')));
    const t = await text(p); await ctx.close();
    assert(JSON.stringify(labels) === JSON.stringify(['home', 'garage', 'fanta', 'race']), 'schede in basso: ' + labels.join(','));
    assert(!errs.length, errs.join(' | '));
  },
  // 1/11: in Home niente bottone di Instagram, che resta nel Profilo. 7/11: Pit Swipe è spento di serie (si accende
  // dall'admin, prove in run88-nascita.js), quindi in Home non c'è.
  async 'instagram: grande bottone nel Profilo (in Home niente Pit Swipe di serie), apre la pagina Instagram'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    const home = await has(p, '[data-ig-big]'), ps = await has(p, '[data-pitswipe-card]');
    await tapSel(p, '[aria-label="Profilo"]'); await w(p, 300);
    const prof = await has(p, '[data-ig-big]');
    await tapSel(p, '[data-ig-big]'); await w(p, 300);
    const ig = await inner(p, '[data-ig-screen]');
    await tapSel(p, '[data-ig-screen] [aria-label="Indietro"]'); await w(p, 300);
    const back = await has(p, '[data-ig-big]');
    await ctx.close();
    assert(!home && !ps && prof, `bottone Instagram: home ${home}, Pit Swipe ${ps}, profilo ${prof}`);
    assert(ig && /@bt_formula1/.test(ig) && /SEGUI SU INSTAGRAM/i.test(ig), 'pagina Instagram: ' + (ig && ig.slice(0, 120)));
    assert(back, 'Indietro non torna all\'app');
    assert(!errs.length, errs.join(' | '));
  },
  async 'garage: sezione Giochi con Pit Stop Challenge e Silly Season Predictor'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await goTab(p, 'GARAGE');
    const t = norm(await text(p)), games = await attrs(p, '[data-game]', 'data-game'); await ctx.close();
    assert(/GIOCHI/.test(t) && JSON.stringify(games.slice(0, 3)) === JSON.stringify(['pitstop', 'silly', 'aero']) && games.includes('ghost'), 'giochi: ' + games.join(','));
    assert(/Pit Stop Challenge/i.test(t) && /Silly Season/i.test(t), 'mancano i nomi dei giochi');
    assert(!errs.length, errs.join(' | '));
  },
  async 'pit stop: semaforo, 4 tocchi per ruota in ordine, tempo finale e miglior tempo'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await openGame(p, 'pitstop');
    const before = await phase(p);
    await tapSel(p, '[data-pit-start]'); await w(p, 100);
    const lights = await phase(p);
    await waitGo(p);
    await tapSel(p, '[data-pit-wheel="fl"]'); await w(p, 150);
    const step1 = await p.evaluate(() => document.querySelector('[data-pit-wheel="fl"]').getAttribute('data-step'));
    for (let k = 0; k < 3; k++) { await tapSel(p, '[data-pit-wheel="fl"]'); await w(p, 150); }
    for (let k = 0; k < 4; k++) for (const wh of ['fr', 'rl', 'rr']) { await tapSel(p, `[data-pit-wheel="${wh}"]`); await w(p, 120); }
    await w(p, 300);
    const done = await phase(p), time = await p.evaluate(() => { const e = document.querySelector('[data-pit-time]'); return e ? +e.getAttribute('data-pit-time') : null; });
    const t = norm(await text(p)), best = await p.evaluate(() => { const e = document.querySelector('[data-pit-best]'); return e ? +e.getAttribute('data-pit-best') : null; });
    await ctx.close();
    assert(before === 'ready' && lights === 'lights', `fasi: ${before} → ${lights}`);
    assert(step1 === '1', 'dopo il primo tocco la ruota non è svitata: ' + step1);
    assert(done === 'done' && time > 1 && time < 9, `fine: ${done}, tempo ${time}`);
    assert(/secondi/i.test(t) && /2,0/.test(t), 'manca il tempo o l\'obiettivo dei 2,0 secondi');
    assert(best === time, `miglior tempo ${best} invece di ${time}`);
    assert(!errs.length, errs.join(' | '));
  },
  async 'pit stop: toccare durante il semaforo è una partenza anticipata (+0,5 s)'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await openGame(p, 'pitstop');
    await tapSel(p, '[data-pit-start]'); await w(p, 100); await tapSel(p, '[data-pit-wheel="rr"]'); await w(p, 100);
    await waitGo(p); await pitRound(p);
    const t = norm(await text(p)); await ctx.close();
    assert(/partenza anticipata/i.test(t) && /\+0,5/.test(t), 'manca la penalità per la partenza anticipata');
    assert(!errs.length, errs.join(' | '));
  },
  async 'silly season: scadenza del contratto per ogni sedile, previsione su chi guida nel 2027 e rinnovo'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await openGame(p, 'silly');
    const seats = await attrs(p, '[data-seat]', 'data-seat'), openSeats = await attrs(p, '[data-seat][data-seat-open="true"]', 'data-seat');
    const nor = await inner(p, '[data-seat="norris"]'), rus = await inner(p, '[data-seat="russell"]');
    await tapSel(p, '[data-seat="russell"] [data-silly-open]'); await w(p, 250);
    const off0 = await p.evaluate(() => document.querySelector('[data-silly-publish]').disabled);
    await tapSel(p, '[data-silly-form] [data-silly-pick="antonelli"]'); await w(p, 80);
    await tapSel(p, '[data-silly-form] [data-silly-renew="cambia"]'); await w(p, 80);
    await tapSel(p, '[data-silly-publish]'); await w(p, 300);
    const after = await inner(p, '[data-seat="russell"]'), again = await has(p, '[data-seat="russell"] [data-silly-open]');
    await ctx.close();
    assert(seats.length === 22, 'sedili: ' + seats.length);
    assert(JSON.stringify(openSeats.sort()) === JSON.stringify(['antonelli', 'bearman', 'lawson', 'lindblad', 'ocon', 'russell']), 'sedili aperti: ' + openSeats.join(','));
    assert(/2030/.test(nor) && /ufficiale/i.test(nor), 'Norris: ' + nor);
    assert(/non ancora ufficiale/i.test(rus), 'Russell: ' + rus);
    assert(off0 === true, 'si pubblica senza aver scelto');
    assert(/la tua previsione/i.test(after) && /Antonelli/i.test(after) && /cambia/i.test(after) && !again, 'dopo la previsione: ' + after);
    assert(!errs.length, errs.join(' | '));
  },
  async 'silly season: il comunicato ufficiale dal Pannello Admin dà i punti in classifica'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await openGame(p, 'silly');
    await tapSel(p, '[data-seat="russell"] [data-silly-open]'); await w(p, 250);
    await tapSel(p, '[data-silly-form] [data-silly-pick="russell"]'); await tapSel(p, '[data-silly-form] [data-silly-renew="rinnova"]'); await w(p, 80);
    await tapSel(p, '[data-silly-publish]'); await w(p, 300);
    await openAdmin(p, 'MERCATO');
    await p.selectOption('#sillySeat', 'russell'); await p.selectOption('#sillyDriver', 'russell'); await p.fill('#sillyDate', '2026-12-01'); await w(p, 150);
    await tapText(p, 'REGISTRA IL COMUNICATO'); await w(p, 300);
    await backHome(p); await openGame(p, 'silly');
    const seat = await inner(p, '[data-seat="russell"]');
    await tapSel(p, '[data-silly-tab="classifica"]'); await w(p, 250);
    const me = await p.evaluate(() => { const e = document.querySelector('[data-silly-row][data-me="true"]'); return e ? { pts: +e.getAttribute('data-points'), text: e.innerText } : null; });
    await ctx.close();
    assert(/ufficiale/i.test(seat) && /\+35/.test(seat), 'sedile dopo il comunicato: ' + seat);
    assert(me && me.pts === 35, 'i miei punti in classifica: ' + JSON.stringify(me));
    assert(!errs.length, errs.join(' | '));
  },
  async 'drag vs downforce: due slider, barre di velocità e avviso se c\'è troppo carico a Monza'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await openGame(p, 'aero');
    await p.selectOption('#aeroCircuit', 'it-1922'); await w(p, 200);
    const setR = (sel, v) => p.evaluate(([sel, v]) => { const e = document.querySelector(sel); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(e, String(v)); e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }, [sel, v]);
    const bars = () => p.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-aero-bar]')].map(e => [e.getAttribute('data-aero-bar'), +e.getAttribute('data-value')])));
    await setR('#aeroWing', 1); await w(p, 250); const low = await bars(), t1 = norm(await text(p));
    await setR('#aeroWing', 10); await w(p, 250); const high = await bars(), t2 = norm(await text(p));
    await ctx.close();
    assert(low.top > high.top && low.corner < high.corner, 'barre: ' + JSON.stringify([low, high]));
    assert(!/Perdita stimata/.test(t1) && /Perdita stimata di \d+ km\/h sul rettilineo principale!/.test(t2), 'avviso del troppo carico: ' + t2.slice(0, 200));
    assert(/Ala posteriore/i.test(t2) && /Altezza da terra/i.test(t2), 'mancano i nomi dei due slider');
    assert(!errs.length, errs.join(' | '));
  },
  async 'race: schede nell\'ordine Tempi, Radio, Meteo, Gomme, Direzione gara, Mondiale'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await startLive(p, 'GARA');
    const tabs = await p.evaluate(() => [...document.querySelectorAll('[data-race-tab]')].map(e => e.textContent.trim()));
    await ctx.close();
    assert(JSON.stringify(tabs) === JSON.stringify(['Tempi', 'Radio', 'Meteo', 'Gomme', 'Direzione gara', 'Mondiale']), 'schede: ' + tabs.join(', '));
    assert(!errs.length, errs.join(' | '));
  },
  async 'chat: si apre dalla pagina RACE; Indietro torna alla gara'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await goTab(p, 'RACE');
    await tapSel(p, '[data-race-chat]'); await w(p, 300);
    const list = await inner(p, '[data-chats-screen]');
    await tapText(p, 'Chat Generale'); await w(p, 400);
    const thread = norm(await text(p));
    await tapSel(p, '[aria-label="Indietro"]'); await w(p, 300);
    const back = await has(p, '[data-race-chat]'); await ctx.close();
    assert(list && /Chat Generale/.test(list), 'elenco chat: ' + list);
    assert(/Ragazzi pronti per il weekend/.test(thread), 'la chat non si apre');
    assert(back, 'Indietro non torna alla pagina RACE');
    assert(!errs.length, errs.join(' | '));
  },
  async 'second screen: grafica Chat dei tifosi con gli ultimi messaggi; dalla scheda si scrive'(b) {
    const { ctx, p, errs } = await open(b, { width: 844, height: 390 }); await login(p); await premiumTrial(p); await startLive(p, 'GARA');
    await openSS(p);
    await tapSel(p, '[aria-label="Modifica grafiche"]'); await w(p, 200);
    await tapSel(p, '[data-ss-chip="telemetria"]'); await w(p, 200); await tapSel(p, '[data-ss-chip="chat"]'); await w(p, 200);
    await tapSel(p, '[aria-label="Modifica grafiche"]'); await w(p, 300);
    const n = await count(p, '[data-ss-widget="chat"] [data-ss-chat-msg]');
    await tapSel(p, '[data-ss-widget="chat"]'); await w(p, 300);
    await p.fill('#ssChatInput', 'Forza ragazzi, che gara!'); await tapSel(p, '[data-ss-chat-send]'); await w(p, 300);
    const sheet = await inner(p, '[data-ss-sheet="chat"]');
    await tapSel(p, '[data-ss-sheet] [aria-label="Indietro"]'); await w(p, 300);
    const widget = await inner(p, '[data-ss-widget="chat"]'); await ctx.close();
    assert(n >= 2, 'messaggi nella grafica: ' + n);
    assert(sheet && /Forza ragazzi, che gara!/.test(sheet), 'il messaggio scritto non compare nella scheda');
    assert(widget && /Forza ragazzi, che gara!/.test(widget), 'il messaggio non compare nella grafica');
    assert(!errs.length, errs.join(' | '));
  },
  async 'notizia: toccando la foto a schermo intero si apre grande e si ingrandisce'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await openAdmin(p, 'NEWS'); await p.fill('#adTitle', 'Foto da ingrandire'); await p.setInputFiles('#adImg', __dirname + '/fixtures/panorama.png'); await w(p, 900);
    await tapText(p, 'PUBBLICA', { exact: true }); await w(p, 600);
    await tapSel(p, '[data-featured]'); await w(p, 400);
    await tapSel(p, 'img[data-article-img]'); await w(p, 300);
    const zoom = () => p.evaluate(() => { const e = document.querySelector('[data-image-viewer] [data-zoom]'); return e ? +e.getAttribute('data-zoom') : null; });
    const z0 = await zoom();
    await tapSel(p, '[data-image-viewer] [aria-label="Ingrandisci"]'); await w(p, 200); const z1 = await zoom();
    await p.dblclick('[data-image-viewer] [data-zoom]'); await w(p, 250); const z2 = await zoom();
    await p.dblclick('[data-image-viewer] [data-zoom]'); await w(p, 250); const z3 = await zoom();
    await tapSel(p, '[data-image-viewer] [aria-label="Chiudi foto"]'); await w(p, 250);
    const gone = !(await has(p, '[data-image-viewer]')), still = await has(p, 'img[data-article-img]'); await ctx.close();
    assert(z0 === 1 && z1 > 1, `ingrandisci: ${z0} → ${z1}`);
    assert(z2 === 1 && z3 > 1, `doppio tocco: ${z2}, ${z3}`);
    assert(gone && still, 'la foto grande non si chiude o si chiude anche la notizia');
    assert(!errs.length, errs.join(' | '));
  },
  async 'admin: archivio Video HIGHLIGHTS esclusivi (aggiungi, modifica, elimina) e si vede in Home'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await premiumTrial(p);
    await openAdmin(p, 'VIDEO');
    await p.fill('#hlTitle', 'Sepang: il nostro pit stop'); await p.fill('#hlDur', '2:30'); await p.fill('#hlLink', 'https://www.instagram.com/bt_formula1/'); await w(p, 100);
    await tapText(p, 'AGGIUNGI VIDEO'); await w(p, 300);
    await tapSel(p, '[data-hl-edit="h1"]'); await w(p, 200);
    const loaded = await p.evaluate(() => document.querySelector('#hlTitle').value);
    await p.fill('#hlTitle', 'Baku: il nostro commento (nuovo)'); await w(p, 100); await tapText(p, 'SALVA MODIFICHE'); await w(p, 300);
    await tapSel(p, '[data-hl-delete="h2"]'); await w(p, 300);
    await backHome(p); await goTab(p, 'HOME');
    const titles = await p.evaluate(() => [...document.querySelectorAll('[data-highlights] [data-highlight]')].map(e => e.innerText.replace(/\s+/g, ' ')));
    await ctx.close();
    assert(/Baku/.test(loaded), 'Modifica non carica il video: ' + loaded);
    assert(titles.length === 3, 'video in Home: ' + titles.length + ' ' + titles.join(' | '));
    assert(titles.some(t => /Sepang: il nostro pit stop/.test(t) && /2:30/.test(t)) && titles.some(t => /commento \(nuovo\)/.test(t)) && !titles.some(t => /Reazioni live/.test(t)), 'archivio: ' + titles.join(' | '));
    assert(!errs.length, errs.join(' | '));
  },
};

(async () => {
  const filter = process.argv[2] ? new RegExp(process.argv[2], 'i') : null;
  const b = await chromium.launch({ executablePath: EXE });
  let pass = 0, fail = 0;
  for (const [name, fn] of Object.entries(tests)) {
    if (filter && !filter.test(name)) continue;
    try { await fn(b); pass++; console.log('PASS  ' + name); }
    catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + String(e.message).split('\n')[0].slice(0, 400)); }
  }
  await b.close();
  console.log(`\n${pass} passati, ${fail} falliti`);
  process.exit(fail ? 1 : 0);
})();
