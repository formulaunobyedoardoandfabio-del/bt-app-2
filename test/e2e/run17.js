// Test della 2.0 (versione 19): previsioni a risposta chiusa (piloti, scuderie, tastierino numerico), Second Screen
// con 4 piloti per ogni scelta, settori e minisettori, telemetria del giro, grafiche alte ½, 1 o 2 posti e schede,
// ritiri con l'immagine della causa, notifica del giro più veloce sopra a tutto, grafiche B&T Insights,
// Home con la notizia più recente in grande e foto non ritagliate.
// Uso: bash rtest/build.sh && node rtest/run17.js [filtro]      (PAGE=real.html per React vero)
const { chromium } = require('/opt/node-tools/node_modules/playwright');
// Le notizie, le previsioni, i video e il calendario d'esempio della 2.0 ora stanno su Firebase (Task 6): il Firebase
// finto parte con quei documenti, così le prove li ritrovano.
const SEED_20 = require('../fixtures/seed-2.0.json');
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const NOW = '2026-09-30T11:48:00Z';

async function open(b, { now = NOW, width = 390, height = 844 } = {}) {
  const ctx = await b.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true });
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
  await tapSel(p, '[aria-label="Profilo"]'); await w(p); await tapText(p, 'Pannello Admin'); await w(p);
  const keypad = await p.evaluate(() => [...document.querySelectorAll('button')].some(b => b.textContent.trim() === '8'));
  if (keypad) { for (const d of '080824') { await tapText(p, d, { exact: true }); await w(p, 60); } await w(p, 900); }
  if (tab) { await tapText(p, tab, { exact: true }); await w(p, 300); }
}
const backHome = async p => { await tapSel(p, '[aria-label="Indietro"]'); await w(p); await tapSel(p, '[aria-label="Indietro"]'); await w(p); };
async function startLive(p, session, then = 'RACE') { await openAdmin(p, 'GARA LIVE'); await tapText(p, 'AVVIA ' + session, { exact: true }); await w(p, 300); await backHome(p); if (then) await goTab(p, then); }
const advance = (p, sec) => p.evaluate(s => window.__btLive.advance(s), sec);
const simState = p => p.evaluate(() => window.__btLive.state());
const assert = (c, m) => { if (!c) throw new Error(m); };
async function premiumTrial(p) {
  await tapSel(p, '[aria-label="Profilo"]'); await w(p); await tapText(p, 'Passa a Premium'); await w(p, 300);
  await tapText(p, 'PROVA GRATIS'); await w(p, 1500); await tapText(p, 'INIZIA'); await w(p, 300);
  await tapSel(p, '[aria-label="Indietro"]'); await w(p, 300);
}
async function openSS(p) { await tapText(p, 'Modalità Second Screen'); await w(p, 600); }
const colOf = (p, col) => attrs(p, `[data-ss-col="${col}"] [data-ss-slot]`, 'data-ss-slot');
const hOf = (p, id) => p.evaluate(id => { const e = document.querySelector(`[data-ss-slot="${id}"]`); return e ? e.offsetHeight : null; }, id);   // altezza in px
// Sceglie i piloti in un elenco del Second Screen: toglie quelli scelti, poi tocca quelli voluti (nell'ordine).
async function choose(p, picker, ids) {
  for (const id of await attrs(p, `[data-ss-picker="${picker}"] [data-pick-driver][aria-pressed="true"]`, 'data-pick-driver')) { await tapSel(p, `[data-ss-picker="${picker}"] [data-pick-driver="${id}"]`); await w(p, 60); }
  for (const id of ids) { await tapSel(p, `[data-ss-picker="${picker}"] [data-pick-driver="${id}"]`); await w(p, 60); }
}
// Ritiro dal pannello admin: pilota e causa.
async function retireFromAdmin(p, id, cause) {
  await p.selectOption('#dnfDriver', id); await w(p, 80);
  await tapSel(p, `[data-dnf-cause="${cause}"]`); await w(p, 80);
  await tapText(p, 'RITIRA', { exact: true }); await w(p, 250);
}
// L'avviso è davvero sopra a tutto: nel suo centro, il primo elemento toccabile è l'avviso stesso.
const noticeOnTop = (p, kind) => p.evaluate(kind => {
  const n = document.querySelector(`[data-live-notice="${kind}"]`); if (!n) return { found: false };
  const r = n.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  const top = document.elementFromPoint(x, y);
  return { found: true, top: !!(top && top.closest('[data-live-notice]')), text: n.innerText.replace(/\s+/g, ' ').trim(), y: r.top, h: r.height, vh: innerHeight };
}, kind);

const tests = {
  // ── Previsioni a risposta chiusa ──────────────────────────────────────
  async 'previsioni: le domande sui piloti si rispondono scegliendo tra tutti i 22 piloti, senza testo libero'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await goTab(p, 'FANTA');
    const inputs = await count(p, '[data-prediction] input, [data-prediction] textarea');
    await tapSel(p, '[data-prediction="p3"] [data-pred-open]'); await w(p, 300);
    const opts = await attrs(p, '[data-pred-picker="p3"] [data-pick-option]', 'data-pick-option');
    await tapSel(p, '[data-pred-picker="p3"] [data-pick-option="hadjar"]'); await w(p, 300);
    const still = await has(p, '[data-pred-picker="p3"]');
    const card = await inner(p, '[data-prediction="p3"]');
    await tapSel(p, '[data-prediction="p1"] [data-pred-open]'); await w(p, 300);
    const pole = await count(p, '[data-pred-picker="p1"] [data-pick-option]');
    await ctx.close();
    assert(inputs === 0, `nelle previsioni ci sono ancora ${inputs} campi di testo`);
    assert(opts.length === 22 && opts.includes('hadjar') && opts.includes('lindblad'), 'piloti tra cui scegliere: ' + opts.length);
    assert(!still, 'dopo la scelta l\'elenco resta aperto');
    assert(/Isack Hadjar/.test(card) && /PILOTA/.test(card), 'la scelta non si vede nella domanda: ' + card);
    assert(pole === 22, 'anche la pole si sceglie tra tutti i piloti: ' + pole);
    assert(!errs.length, errs.join(' | '));
  },
  async 'previsioni: la domanda sulle scuderie fa scegliere tra tutte le 11 scuderie'(b) {
    const { ctx, p } = await open(b); await login(p); await goTab(p, 'FANTA');
    await tapSel(p, '[data-prediction="p4"] [data-pred-open]'); await w(p, 300);
    const opts = await attrs(p, '[data-pred-picker="p4"] [data-pick-option]', 'data-pick-option');
    await tapSel(p, '[data-pred-picker="p4"] [data-pick-option="ferrari"]'); await w(p, 300);
    const card = await inner(p, '[data-prediction="p4"]'); await ctx.close();
    assert(opts.length === 11 && opts.includes('cadillac') && opts.includes('audi'), 'scuderie tra cui scegliere: ' + opts.join(','));
    assert(/Ferrari/.test(card) && /SCUDERIA/.test(card), 'la scuderia scelta non si vede: ' + card);
  },
  async 'previsioni: i numeri si scrivono solo col tastierino numerico'(b) {
    const { ctx, p } = await open(b); await login(p); await goTab(p, 'FANTA');
    const closed = await has(p, '[data-numpad]');
    await tapSel(p, '[data-prediction="p2"] [data-pred-open]'); await w(p, 250);
    const keys = await attrs(p, '[data-numpad] [data-numpad-key]', 'data-numpad-key');
    const inputs = await count(p, '[data-numpad] input');
    for (const k of ['1', '2', 'del', '3']) { await tapSel(p, `[data-numpad] [data-numpad-key="${k}"]`); await w(p, 60); }
    const shown = await inner(p, '[data-numpad-display]');
    for (const k of ['4', '5', '6']) { await tapSel(p, `[data-numpad] [data-numpad-key="${k}"]`); await w(p, 60); }
    const max = await inner(p, '[data-numpad-display]');
    for (let i = 0; i < 2; i++) { await tapSel(p, '[data-numpad] [data-numpad-key="del"]'); await w(p, 60); }
    await tapSel(p, '[data-numpad] [data-numpad-ok]'); await w(p, 300);
    const card = await inner(p, '[data-prediction="p2"]'); const open2 = await has(p, '[data-numpad]'); await ctx.close();
    assert(!closed, 'il tastierino è aperto prima di toccare la domanda');
    assert(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].every(k => keys.includes(k)) && keys.includes('del') && keys.length === 11, 'tasti del tastierino: ' + keys.join(','));
    assert(inputs === 0, 'nel tastierino c\'è un campo di testo');
    assert(shown === '13', 'dopo 1, 2, cancella, 3 il numero è: ' + shown);
    assert(max === '134', 'il numero deve avere al massimo 3 cifre: ' + max);
    assert(!open2 && /La tua risposta: 1\b/.test(card) && /NUMERO/.test(card), 'risposta col tastierino: ' + card);
  },
  async 'previsioni: l\'admin segna le risposte scegliendo pilota e scuderia e col tastierino; arrivano i punti'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await goTab(p, 'FANTA');
    const pickPred = async (id, opt) => { await tapSel(p, `[data-prediction="${id}"] [data-pred-open]`); await w(p, 250); await tapSel(p, `[data-pred-picker="${id}"] [data-pick-option="${opt}"]`); await w(p, 250); };
    await pickPred('p1', 'antonelli'); await pickPred('p3', 'hadjar'); await pickPred('p4', 'mclaren');
    await tapSel(p, '[data-prediction="p2"] [data-pred-open]'); await w(p, 200); await tapSel(p, '[data-numpad] [data-numpad-key="2"]'); await tapSel(p, '[data-numpad] [data-numpad-ok]'); await w(p, 300);
    await openAdmin(p, 'PREVISIONI');
    const adminInputs = await count(p, '[data-pred-admin] input');
    const pickAdmin = async (id, opt) => { await tapSel(p, `[data-pred-admin="${id}"] [data-pred-open]`); await w(p, 250); await tapSel(p, `[data-pred-picker="admin-${id}"] [data-pick-option="${opt}"]`); await w(p, 250); };
    await pickAdmin('p1', 'antonelli'); await pickAdmin('p3', 'hadjar'); await pickAdmin('p4', 'ferrari');
    await tapSel(p, '[data-pred-admin="p2"] [data-pred-open]'); await w(p, 200);
    await tapSel(p, '[data-numpad] [data-numpad-key="2"]'); await tapText(p, 'SEGNA', { exact: true, sel: '[data-numpad] button' }); await w(p, 300);
    await backHome(p); await goTab(p, 'FANTA');
    const r = {}; for (const id of ['p1', 'p2', 'p3', 'p4']) r[id] = await inner(p, `[data-prediction="${id}"]`);
    const bonus = await inner(p, '[data-bonus-total]'); await ctx.close();
    assert(adminInputs === 0, 'nel pannello admin le risposte si scrivono ancora a mano: ' + adminInputs);
    for (const id of ['p1', 'p2', 'p3']) assert(/Giusto! \+1 punto/.test(r[id]), `${id}: ` + r[id]);
    assert(/la risposta esatta è Ferrari/.test(r.p4), 'p4: ' + r.p4);
    assert(bonus === '+3', 'bonus: ' + bonus);
    assert(!errs.length, errs.join(' | '));
  },
  async 'admin: le nuove previsioni sono a risposta chiusa (Sondaggio, Pilota, Scuderia, Numero, Storia)'(b) {
    const { ctx, p } = await open(b); await login(p); await openAdmin(p, 'PREVISIONI');
    const kinds = await p.evaluate(() => [...document.querySelectorAll('[data-pred-kind]')].map(e => e.textContent.replace(/\s+/g, ' ').trim()));
    await tapSel(p, '[data-pred-kind="driver"]'); await w(p, 150);
    await p.fill('#predText', 'Chi vincerà la gara di Sepang?'); await w(p, 100);
    await tapText(p, 'AGGIUNGI PREVISIONE', { exact: true }); await w(p, 300);
    await backHome(p); await goTab(p, 'FANTA');
    const id = await p.evaluate(() => { const c = [...document.querySelectorAll('[data-prediction]')].find(e => /Chi vincerà la gara di Sepang/.test(e.innerText)); return c ? c.getAttribute('data-prediction') : null; });
    let n = 0; if (id) { await tapSel(p, `[data-prediction="${id}"] [data-pred-open]`); await w(p, 250); n = await count(p, `[data-pred-picker="${id}"] [data-pick-option]`); }
    await ctx.close();
    assert(JSON.stringify(kinds) === JSON.stringify(['Sondaggio', 'Pilota', 'Scuderia', 'Numero', 'Storia']), 'tipi di previsione: ' + kinds.join(', '));
    assert(id, 'la nuova previsione non compare nel FantaF1');
    assert(n === 22, 'la nuova domanda sui piloti non fa scegliere tra i 22 piloti: ' + n);
  },
  // ── Second Screen ─────────────────────────────────────────────────────
  async 'second screen: in alto a destra di serie settori e minisettori di 4 piloti'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await premiumTrial(p); await startLive(p, 'GARA'); await advance(p, 200);
    await openSS(p);
    const right = await colOf(p, 'right'), left = await colOf(p, 'left');
    const rows = await p.evaluate(() => [...document.querySelectorAll('[data-ss-widget="settori"] [data-ss-sector-row]')].map(r => ({ id: r.getAttribute('data-ss-sector-row'), minis: r.querySelectorAll('[data-mini]').length, secs: r.querySelectorAll('[data-ss-sector]').length })));
    const st = await simState(p); await ctx.close();
    assert(right[0] === 'settori', 'in alto a destra c\'è: ' + right.join(','));
    assert(left.length + right.length === 4, 'di serie le grafiche sono 4: ' + [...left, ...right].join(','));
    assert(rows.length === 4, 'piloti nei settori: ' + rows.length);
    assert(rows.every(r => r.minis === 24 && r.secs === 3), 'settori e minisettori: ' + JSON.stringify(rows));
    assert(rows.map(r => r.id).join() === st.cars.slice(0, 4).map(c => c.id).join(), 'di serie i settori sono dei primi 4');
    assert(!errs.length, errs.join(' | '));
  },
  async 'second screen: settori e gomme per al massimo 4 piloti scelti, telemetria del pilota scelto'(b) {
    const { ctx, p } = await open(b); await login(p); await premiumTrial(p); await startLive(p, 'GARA'); await advance(p, 200);
    await openSS(p);
    const tyres0 = await count(p, '[data-ss-tyre-row]');
    await tapSel(p, '[aria-label="Scegli i piloti dei settori"]'); await w(p, 300);
    const all = await attrs(p, '[data-ss-picker="settori"] [data-pick-driver]', 'data-pick-driver');
    const want = all.slice(-5); await choose(p, 'settori', want);
    const t1 = norm(await text(p));
    await tapText(p, 'Fatto', { exact: true, sel: '[data-ss-picker="settori"] button' }); await w(p, 300);
    const sec = await attrs(p, '[data-ss-sector-row]', 'data-ss-sector-row');
    await tapSel(p, '[aria-label="Scegli i piloti delle gomme"]'); await w(p, 300);
    const tw = all.slice(0, 6).reverse(); await choose(p, 'gomme', tw);
    const t2 = norm(await text(p));
    await tapText(p, 'Fatto', { exact: true, sel: '[data-ss-picker="gomme"] button' }); await w(p, 300);
    const tyres = await attrs(p, '[data-ss-tyre-row]', 'data-ss-tyre-row');
    await tapSel(p, '[aria-label="Scegli il pilota della telemetria"]'); await w(p, 300);
    await tapSel(p, `[data-ss-picker="telemetria"] [data-pick-driver="${all[7]}"]`); await w(p, 300);
    const tel = await p.evaluate(() => document.querySelector('[data-ss-widget="telemetria"]').getAttribute('data-ss-tel-driver'));
    await ctx.close();
    assert(tyres0 === 4, 'di serie le gomme sono dei primi 4: ' + tyres0);
    assert(all.length === 22, 'piloti nella scelta: ' + all.length);
    assert(/massimo 4/i.test(t1) && /massimo 4/i.test(t2), 'non avvisa che si scelgono al massimo 4 piloti');
    assert(sec.length === 4 && sec.every(id => want.slice(0, 4).includes(id)), `settori di ${sec.join(',')} invece di ${want.slice(0, 4).join(',')}`);
    assert(tyres.length === 4 && tyres.every(id => tw.slice(0, 4).includes(id)), `gomme di ${tyres.join(',')} invece di ${tw.slice(0, 4).join(',')}`);
    assert(tel === all[7], `telemetria di ${tel} invece di ${all[7]}`);
  },
  async 'second screen: la telemetria è il grafico del giro, come toccando un settore nella pagina Race'(b) {
    const { ctx, p } = await open(b); await login(p); await premiumTrial(p); await startLive(p, 'GARA'); await advance(p, 260);
    await openSS(p);
    const r = await p.evaluate(() => {
      const wd = document.querySelector('[data-ss-widget="telemetria"]'); if (!wd) return null;
      const svg = wd.querySelector('svg[data-tel-chart="speed"]'), paths = svg ? [...svg.querySelectorAll('path')].map(x => (x.getAttribute('d') || '').length) : [];
      return { svg: !!svg, paths, text: wd.innerText.replace(/\s+/g, ' ') };
    });
    await ctx.close();
    assert(r && r.svg, 'nella telemetria del Second Screen manca il grafico della velocità');
    assert(r.paths.some(n => n > 200), 'il grafico è vuoto: ' + r.paths.join(','));
    assert(/giro \d+/i.test(r.text) && /km\/h/.test(r.text), 'mancano giro e velocità: ' + r.text);
  },
  async 'second screen: le grafiche si fanno alte mezzo posto, un posto, uno e mezzo o due posti'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await premiumTrial(p); await startLive(p, 'GARA');
    await openSS(p); await tapSel(p, '[aria-label="Modifica grafiche"]'); await w(p, 300);
    const range = await p.evaluate(() => { const g = document.querySelector('[data-ss-grip="settori"]'); return g ? [g.getAttribute('aria-valuemin'), g.getAttribute('aria-valuemax')].join('-') : null; });
    const one = await hOf(p, 'telemetria');
    const key = async (id, k, n = 1) => { await p.focus(`[data-ss-grip="${id}"]`); for (let i = 0; i < n; i++) await p.keyboard.press(k); await w(p, 200); };
    await key('settori', 'ArrowUp');
    const half = await hOf(p, 'settori');
    await tapSel(p, '[data-ss-chip="meteo"]'); await w(p, 200);
    const right = await colOf(p, 'right');
    await key('classifica', 'ArrowDown', 2);
    const capped = await p.evaluate(() => ['classifica', 'gomme'].map(id => document.querySelector(`[data-ss-slot="${id}"]`).getAttribute('data-ss-h')).join());
    const hint = norm(await text(p));
    await tapSel(p, '[data-ss-chip="gomme"]'); await w(p, 200);
    await key('classifica', 'ArrowDown');
    const two = await hOf(p, 'classifica'); const left = await colOf(p, 'left');
    await ctx.close();
    assert(range === '1-4', 'altezze possibili (mezzi posti): ' + range);
    assert(Math.abs(half / one - 0.5) < 0.12, `mezzo posto: ${half} px contro ${one} px di un posto`);
    assert(right.includes('meteo'), 'nel mezzo posto libero non entra la nuova grafica: ' + right.join(','));
    assert(capped === '3,1' && /da sola/i.test(hint), 'con un\'altra grafica nella colonna: ' + capped);
    assert(left.length === 1 && Math.abs(two / one - 2) < 0.2, `due posti: ${two} px contro ${one} px (colonna: ${left.join(',')})`);
    assert(!errs.length, errs.join(' | '));
  },
  async 'second screen: toccando una grafica si apre la sua scheda in orizzontale, Indietro torna alla diretta'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await premiumTrial(p); await startLive(p, 'GARA'); await advance(p, 200);
    await openSS(p);
    await tapSel(p, '[data-ss-widget="classifica"]'); await w(p, 300);
    const sheet = await p.evaluate(() => {
      const s = document.querySelector('[data-ss-stage] [data-ss-sheet]'); if (!s) return null;
      const st = document.querySelector('[data-ss-stage]'), m = /matrix\(([^)]+)\)/.exec(getComputedStyle(st).transform);
      return { id: s.getAttribute('data-ss-sheet'), w: s.offsetWidth, h: s.offsetHeight, rows: s.querySelectorAll('[data-ss-sheet-row]').length, turned: m ? Math.abs(+m[1].split(',')[1] - 1) < 0.01 : false };
    });
    await tapSel(p, '[data-ss-sheet] [aria-label="Indietro"]'); await w(p, 300);
    const back = { sheet: await has(p, '[data-ss-sheet]'), ss: await has(p, '[data-ss]'), widgets: await count(p, '[data-ss-widget]') };
    await tapSel(p, '[data-ss-widget="telemetria"]'); await w(p, 300);
    const charts = await attrs(p, '[data-ss-sheet="telemetria"] svg[data-tel-chart]', 'data-tel-chart');
    const choices = await attrs(p, '[data-ss-sheet="telemetria"] [data-pick-driver]', 'data-pick-driver');
    await tapSel(p, `[data-ss-sheet="telemetria"] [data-pick-driver="${choices[5]}"]`); await w(p, 300);
    const telId = await p.evaluate(() => document.querySelector('[data-ss-sheet="telemetria"]').getAttribute('data-ss-tel-driver'));
    await tapSel(p, '[data-ss-sheet] [aria-label="Indietro"]'); await w(p, 300);
    await tapSel(p, '[aria-label="Scegli i piloti dei settori"]'); await w(p, 300);
    const viaChoose = { sheet: await has(p, '[data-ss-sheet]'), picker: await has(p, '[data-ss-picker="settori"]') };
    await tapText(p, 'Fatto', { exact: true, sel: '[data-ss-picker="settori"] button' }); await w(p, 200);
    await tapSel(p, '[aria-label="Modifica grafiche"]'); await w(p, 200);
    await tapSel(p, '[data-ss-widget="gomme"]'); await w(p, 300);
    const inEdit = await has(p, '[data-ss-sheet]');
    await ctx.close();
    assert(sheet && sheet.id === 'classifica', 'toccando la classifica non si apre la sua scheda');
    assert(sheet.w > sheet.h && sheet.turned, `la scheda non è in orizzontale: ${sheet.w}×${sheet.h}, girata ${sheet.turned}`);
    assert(sheet.rows === 22, 'nella scheda della classifica ci sono ' + sheet.rows + ' piloti');
    assert(!back.sheet && back.ss && back.widgets === 4, 'Indietro non torna al Second Screen: ' + JSON.stringify(back));
    assert(['speed', 'throttle', 'brake', 'gear'].every(c => charts.includes(c)), 'grafici nella scheda della telemetria: ' + charts.join(','));
    assert(choices.length === 22 && telId === choices[5], `nella scheda si sceglie il pilota: ${choices.length} piloti, scelto ${telId}`);
    assert(!viaChoose.sheet && viaChoose.picker, 'il tasto Scegli apre la scheda invece dell\'elenco');
    assert(!inEdit, 'in modalità Modifica toccando una grafica si apre la scheda');
    assert(!errs.length, errs.join(' | '));
  },
  // ── Ritiri ─────────────────────────────────────────────────────────────
  async 'ritiri: nei tempi il pilota ritirato ha l\'immagine della sua causa (generica se non si sa)'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await startLive(p, 'GARA', null); await w(p, 200);
    const plan = [['bottas', 'motore'], ['stroll', 'incidente'], ['colapinto', 'incendio'], ['lawson', 'penalita'], ['gasly', 'altro']];
    await openAdmin(p, 'GARA LIVE');
    for (const [id, c] of plan) await retireFromAdmin(p, id, c);
    await backHome(p); await goTab(p, 'RACE'); await advance(p, 30); await w(p, 300);
    const rows = await p.evaluate(() => [...document.querySelectorAll('[data-timing-row][data-dnf]')].map(r => ({ id: r.getAttribute('data-timing-id'), dnf: r.getAttribute('data-dnf'), art: (r.querySelector('[data-dnf-art]') || { getAttribute: () => null }).getAttribute('data-dnf-art'), text: r.innerText.replace(/\s+/g, ' '), pos: +r.getAttribute('data-timing-pos') })));
    await tapText(p, 'Direzione gara', { exact: true }); await w(p, 300);
    const rc = norm(await text(p)); await ctx.close();
    assert(rows.length === 5, 'righe dei ritirati: ' + rows.length);
    for (const [id, c] of plan) {
      const r = rows.find(x => x.id === id);
      assert(r && r.dnf === c && r.art === c, `${id}: immagine ${r && r.art} invece di ${c}`);
      assert(/RITIRATO/.test(r.text), `${id}: manca "RITIRATO": ` + r.text);
    }
    assert(rows.every(r => r.pos >= 18), 'i ritirati non sono in fondo: ' + rows.map(r => r.pos).join(','));
    assert(/PROBLEMA AL MOTORE/.test(rc) && /INCENDIO|FUOCO/.test(rc) && /PENALITÀ/.test(rc), 'nella direzione gara mancano i ritiri');
    assert(!errs.length, errs.join(' | '));
  },
  async 'ritiri: quando un pilota si ritira arriva l\'avviso con l\'immagine, anche nel Second Screen'(b) {
    const { ctx, p } = await open(b); await login(p); await premiumTrial(p); await startLive(p, 'GARA'); await w(p, 200);
    await p.evaluate(() => window.__btLive.retire('ocon', 'incendio')); await w(p, 700);
    const n1 = await noticeOnTop(p, 'dnf'); const art1 = await attrs(p, '[data-live-notice="dnf"] [data-dnf-art]', 'data-dnf-art');
    await tapSel(p, '[aria-label="Chiudi avviso"]'); await w(p, 200);
    await openSS(p);
    await p.evaluate(() => window.__btLive.retire('bearman', 'motore')); await w(p, 700);
    const inStage = await attrs(p, '[data-ss-stage] [data-live-notice="dnf"] [data-dnf-art]', 'data-dnf-art');
    await ctx.close();
    assert(n1.found && n1.top, 'l\'avviso del ritiro manca o è coperto: ' + JSON.stringify(n1));
    assert(/OCON|OCO/.test(n1.text) && /RITIRATO/i.test(n1.text), 'testo dell\'avviso: ' + n1.text);
    assert(art1.includes('incendio'), 'immagine dell\'avviso: ' + art1.join(','));
    assert(inStage.includes('motore'), 'nel Second Screen l\'avviso non è nello schermo girato: ' + inStage.join(','));
  },
  async 'ritiri: nell\'ultima gara i ritirati hanno l\'immagine del ritiro'(b) {
    const { ctx, p } = await open(b); await login(p); await goTab(p, 'RACE');
    await tapSel(p, '[data-race-tab="classifica"]').catch(() => {}); await w(p, 300); const arts = await attrs(p, '[data-last-race="real"] [data-result-pos="RIT"] [data-dnf-art]', 'data-dnf-art');
    const rit = await count(p, '[data-last-race="real"] [data-result-pos="RIT"]'); await ctx.close();
    assert(rit > 0 && arts.length === rit, `ritirati ${rit}, immagini ${arts.length}`);
    assert(arts.every(a => ['incidente', 'motore', 'incendio', 'penalita', 'altro'].includes(a)), 'immagini: ' + arts.join(','));
  },
  // ── Giro più veloce ────────────────────────────────────────────────────
  async 'giro più veloce: arriva come notifica sopra a tutto, con pilota e tempo, anche fuori dalla pagina Race'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await startLive(p, 'GARA', 'HOME');
    await advance(p, 200); await w(p, 700);
    const n = await noticeOnTop(p, 'fastest');
    const who = await p.evaluate(() => { const e = document.querySelector('[data-live-notice="fastest"]'); return e ? { id: e.getAttribute('data-notice-driver'), lap: +e.getAttribute('data-notice-lap'), bg: getComputedStyle(e).backgroundImage + ' ' + getComputedStyle(e).backgroundColor } : null; });
    const lap = who ? await p.evaluate(({ id, lap }) => { const l = window.__btLive.lap(id, lap), c = window.__btLive.state().cars.find(x => x.id === id); return l && c ? { time: window.__req('./logic/live-sim').fmtLap(l.time), code: c.code } : null; }, who) : null;
    await tapSel(p, '[aria-label="Chiudi avviso"]'); await w(p, 300);
    const closed = !(await has(p, '[data-live-notice="fastest"]'));
    // Nella pagina Race, con i tempi sul giro aperti sopra: anche l'avviso del ritiro passa sopra a tutto.
    await goTab(p, 'RACE'); await tapSel(p, '[aria-label^="Tempi sul giro di"]'); await w(p, 300);
    const listOpen = await has(p, '[data-lap-list]');
    await p.evaluate(() => window.__btLive.retire('perez', 'motore')); await w(p, 600);
    const n2 = await noticeOnTop(p, 'dnf');
    await ctx.close();
    assert(n.found && n.top, 'fuori dalla pagina Race la notifica del giro più veloce manca o è coperta: ' + JSON.stringify(n));
    assert(lap && /GIRO PIÙ VELOCE/.test(n.text) && n.text.includes(lap.time) && n.text.includes(lap.code) && n.text.includes('GIRO ' + who.lap), `testo: ${n.text} (atteso ${lap && lap.code} ${lap && lap.time})`);
    assert(n.y < n.vh * 0.25, 'la notifica non è in alto come quelle delle app');
    assert(/rgb\(1[0-9]{2}, [0-9]{1,2}, (1[5-9][0-9]|2[0-9]{2})\)/.test(who.bg), 'la notifica non è viola come la grafica F1: ' + who.bg);
    assert(closed, 'la notifica non si chiude toccando la X');
    assert(listOpen && n2.found && n2.top, 'con i tempi sul giro aperti l\'avviso non sta sopra: ' + JSON.stringify(n2));
    assert(!errs.length, errs.join(' | '));
  },
  async 'giro più veloce: nel Second Screen la notifica è dentro lo schermo girato'(b) {
    const { ctx, p } = await open(b); await login(p); await premiumTrial(p); await startLive(p, 'GARA');
    await openSS(p); await advance(p, 200); await w(p, 700);
    const r = await p.evaluate(() => { const n = document.querySelector('[data-ss-stage] [data-live-notice="fastest"]'); return n ? n.innerText.replace(/\s+/g, ' ') : null; });
    const outside = await p.evaluate(() => [...document.querySelectorAll('[data-live-notice="fastest"]')].filter(n => !n.closest('[data-ss-stage]')).length);
    await ctx.close();
    assert(r && /GIRO PIÙ VELOCE/.test(r), 'nel Second Screen manca la notifica del giro più veloce');
    assert(outside === 0, 'la notifica compare anche fuori dallo schermo girato');
  },
  // ── B&T Insights ──────────────────────────────────────────────────────
  async 'insights: nella pagina Race 5 tipi di grafiche B&T Insights (sorpasso in X giri, strategie, passo, frenata, vettura)'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await startLive(p, 'GARA'); await advance(p, 1500); await w(p, 300);
    const tabs = await attrs(p, '[data-insights] [data-insight-tab]', 'data-insight-tab');
    const out = {};
    for (const t of tabs) { await tapSel(p, `[data-insights] [data-insight-tab="${t}"]`); await w(p, 200); out[t] = await inner(p, `[data-insights] [data-insight="${t}"]`); }
    const all = Object.values(out).join(' ');
    await ctx.close();
    assert(JSON.stringify(tabs) === JSON.stringify(['sorpasso', 'strategia', 'passo', 'frenata', 'vettura']), 'tipi: ' + tabs.join(','));
    assert(/CHI RAGGIUNGE CHI/.test(out.sorpasso) && /IN \d+ GIR[OI]\b/.test(out.sorpasso) && /\d\.\d{3}/.test(out.sorpasso), 'sorpasso: ' + out.sorpasso);
    assert(/STRATEGIE AI BOX/.test(out.strategia) && /1 SOSTA/.test(out.strategia) && /2 SOSTE/.test(out.strategia) && /GIRI? \d+/.test(out.strategia), 'strategie: ' + out.strategia);
    assert(/RITMO GARA/.test(out.passo) && (out.passo.match(/\d:\d{2}\.\d{3}/g) || []).length >= 3, 'passo gara: ' + out.passo);
    assert(/FRENATA A CONFRONTO/.test(out.frenata) && /CURVA \d+/.test(out.frenata) && /\d+ ?M\b/.test(out.frenata) && /KM\/H/.test(out.frenata) && /\d\.\d ?G\b/.test(out.frenata), 'frenata: ' + out.frenata);
    assert(/PAGELLA MONOPOSTO/.test(out.vettura) && /CURVE (LENTE|MEDIE|VELOCI)/.test(out.vettura) && /\/ ?10/.test(out.vettura), 'vettura: ' + out.vettura);
    assert(/B&T INSIGHTS/.test(all) && !/aws|F1 Insights/i.test(all), 'marchio delle grafiche: ' + all.slice(0, 200));
    assert(!errs.length, errs.join(' | '));
  },
  async 'insights: nel Second Screen come grafica da scegliere e come banner sulla mappa'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await premiumTrial(p); await startLive(p, 'GARA'); await advance(p, 400);
    await openSS(p); await tapSel(p, '[aria-label="Modifica grafiche"]'); await w(p, 200);
    const chips = await attrs(p, '[data-ss-chip]', 'data-ss-chip');
    await tapSel(p, '[aria-label="Modifica grafiche"]'); await w(p, 200);
    let pop = null;
    for (let i = 0; i < 60 && !pop; i++) { await advance(p, 15); await w(p, 120); pop = await inner(p, '[data-ss-map] [data-insight-popup]'); }
    await ctx.close();
    assert(chips.includes('insights') && chips.includes('settori') && chips.length === 10, 'grafiche del Second Screen: ' + chips.join(','));
    assert(pop && /B&T INSIGHTS/.test(pop), 'sulla mappa non arriva il banner B&T Insights');
    assert(!errs.length, errs.join(' | '));
  },
  // ── Home ───────────────────────────────────────────────────────────────
  async 'home: la notizia in grande è sempre la più recente, poi le altre dalla più nuova'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    const f0 = await p.evaluate(() => { const e = document.querySelector('[data-featured]'); return e ? e.getAttribute('data-featured') : null; });
    const ages = (await attrs(p, '[data-news-item]', 'data-age')).map(Number);
    await openAdmin(p, 'NEWS');
    await p.fill('#adTitle', 'Ultim\'ora: la notizia più nuova'); await w(p, 100);
    await tapText(p, 'PUBBLICA', { exact: true }); await w(p, 600);
    const f1 = await inner(p, '[data-featured]');
    const firstList = await p.evaluate(() => { const e = document.querySelector('[data-news-item]'); return e ? e.getAttribute('data-news-item') : null; });
    await ctx.close();
    assert(f0 === '1', 'all\'inizio in grande c\'è la notizia ' + f0 + ' invece della più recente');
    assert(ages.length > 5 && ages.every((a, i) => i === 0 || a >= ages[i - 1]), 'le notizie non sono dalla più nuova: ' + ages.join(','));
    assert(f1 && /la notizia più nuova/.test(f1), 'dopo la pubblicazione in grande c\'è: ' + f1);
    assert(firstList === '1', 'la notizia che era in grande non è la prima dell\'elenco: ' + firstList);
    assert(!errs.length, errs.join(' | '));
  },
  async 'home: le foto caricate non vengono ritagliate (in grande, in elenco e nell\'articolo)'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await openAdmin(p, 'NEWS');
    const publish = async (title, file) => {
      await p.fill('#adTitle', title); await p.setInputFiles('#adImg', __dirname + '/fixtures/' + file); await w(p, 900);
      await tapText(p, 'PUBBLICA', { exact: true }); await w(p, 600);
    };
    const shape = sel => p.evaluate(sel => {
      const e = document.querySelector(sel); if (!e) return null;
      const img = e.tagName === 'IMG' ? e : e.querySelector('img'); if (!img) return { img: false };
      const cs = getComputedStyle(img), boxR = img.clientWidth / img.clientHeight, natR = img.naturalWidth / img.naturalHeight;
      return { img: true, fit: cs.objectFit, boxR, natR, ok: cs.objectFit === 'contain' || Math.abs(boxR / natR - 1) < 0.03 };
    }, sel);
    await publish('Foto larga', 'panorama.png');
    const big = await shape('[data-featured] [data-news-img]');
    await openAdmin(p, 'NEWS'); await publish('Foto alta', 'verticale.png');
    const bigTall = await shape('[data-featured] [data-news-img]');
    const thumb = await p.evaluate(() => { const e = [...document.querySelectorAll('[data-news-item]')].find(x => /Foto larga/.test(x.innerText)); return e ? e.getAttribute('data-news-item') : null; });
    const th = thumb ? await shape(`[data-news-item="${thumb}"] [data-news-img]`) : null;
    await tapText(p, 'Foto larga'); await w(p, 500);
    const art = await shape('[data-article-img]');
    await ctx.close();
    for (const [n, r] of [['in grande (larga)', big], ['in grande (alta)', bigTall], ['in elenco', th], ['nell\'articolo', art]]) {
      assert(r && r.img, `${n}: la foto non c'è`);
      assert(r.fit !== 'cover' && r.ok, `${n}: la foto è ritagliata (${r.fit}, riquadro ${r.boxR.toFixed(2)} contro foto ${r.natR.toFixed(2)})`);
    }
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
