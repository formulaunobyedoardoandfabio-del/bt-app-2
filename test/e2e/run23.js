// Test della 2.0 (versione 24): nel Garage gli strumenti del weekend di gara, con i dati veri 2026.
// Scanner dell'assetto (prove libere), Tire Strategy Predictor, Degrado gomme, Compagni a confronto, Rilevatore di bluff.
// Uso: bash rtest/build.sh && node rtest/run23.js [filtro]      (PAGE=real.html per React vero)
const { chromium } = require('/opt/node-tools/node_modules/playwright');
// Le notizie, le previsioni, i video e il calendario d'esempio della 2.0 ora stanno su Firebase (Task 6): il Firebase
// finto parte con quei documenti, così le prove li ritrovano.
const SEED_20 = require('../fixtures/seed-2.0.json');
const EXE = require('fs').existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined;
const NOW = '2026-09-30T11:48:00Z';

async function open(b, { now = NOW, width = 390, height = 844 } = {}) {
  const ctx = await b.newContext({ viewport: { width, height }, hasTouch: true });
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
const inners = (p, sel) => p.evaluate(s => [...document.querySelectorAll(s)].map(e => e.innerText.replace(/\s+/g, ' ').trim()), sel);
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
async function startLive(p, session) { await openAdmin(p, 'GARA LIVE'); await tapText(p, 'AVVIA ' + session, { exact: true }); await w(p, 300); await backHome(p); }
const advance = (p, sec) => p.evaluate(s => window.__btLive.advance(s), sec);
const assert = (c, m) => { if (!c) throw new Error(m); };
const openTool = async (p, id) => { await goTab(p, 'GARAGE'); await tapSel(p, `[data-game="${id}"]`); await w(p, 500); };
const tests = {
  async 'garage: gruppo Weekend di gara con i cinque strumenti'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await goTab(p, 'GARAGE');
    const t = norm(await text(p)), games = await attrs(p, '[data-game]', 'data-game'); await ctx.close();
    assert(/WEEKEND DI GARA/.test(t), 'manca il gruppo');
    for (const g of ['setup', 'strategy', 'deg', 'mates', 'bluff']) assert(games.includes(g), 'manca ' + g + ': ' + games.join(','));
    assert(!errs.length, errs.join(' | '));
  },
  async 'scanner dell\'assetto: prove libere vere di Sepang, velocità di punta contro curva e scheda della scuderia'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await openTool(p, 'setup');
    const on = await attrs(p, '[data-setup-weekend][aria-pressed="true"]', 'data-setup-weekend'), ses = await attrs(p, '[data-setup-session][aria-pressed="true"]', 'data-setup-session');
    const dots = await count(p, '[data-setup-dot]');
    await tapSel(p, '[data-setup-session="FP2"]'); await w(p, 300); await tapSel(p, '[data-setup-dot="redbull"]'); await w(p, 300);
    const rb = await inner(p, '[data-setup-team]');
    await tapSel(p, '[data-setup-dot="ferrari"]'); await w(p, 300); const fe = await inner(p, '[data-setup-team]');
    const longs = await count(p, '[data-setup-long]');
    await tapSel(p, '[data-setup-weekend="az-2016"]'); await w(p, 300); const dots2 = await count(p, '[data-setup-dot]'), t2 = await inner(p, '[data-setup]');
    await ctx.close();
    assert(on[0] === 'my-1999' && ses[0] === 'FP3', `di serie: ${on} ${ses}`);
    assert(dots === 11 && dots2 === 11, `scuderie nel grafico: ${dots} / ${dots2}`);
    for (const s of ['Red Bull', 'Verstappen', '1:37.785', 'Simulazione di qualifica', 'Long run', '13 giri', 'Medie', 'km/h']) assert(rb && rb.includes(s), 'Red Bull, manca "' + s + '": ' + (rb || '').slice(0, 300));
    assert(fe && /Ferrari/.test(fe) && /PIÙ CARICO/.test(fe), 'Ferrari in FP2: ' + (fe || '').slice(0, 200));
    assert(longs >= 8, 'classifica delle long run: ' + longs);
    assert(/Baku/.test(t2), 'weekend di Baku');
    assert(!errs.length, errs.join(' | '));
  },
  async 'strategy predictor: si disegna la strategia della prossima gara e si chiude 15 minuti prima del via'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await openTool(p, 'strategy');
    const head = await inner(p, '[data-strat]');
    const n0 = await count(p, '[data-strat-stint]');
    await tapSel(p, '[data-strat-add]'); await w(p, 200); const n1 = await count(p, '[data-strat-stint]');
    const c0 = await attrs(p, '[data-strat-stint="2"]', 'data-compound');
    await tapSel(p, '[data-strat-stint="2"]'); await w(p, 200); const c1 = await attrs(p, '[data-strat-stint="2"]', 'data-compound');
    const lap0 = await attrs(p, '[data-strat-pit="0"]', 'data-lap'); await tapSel(p, '[data-strat-plus="0"]'); await w(p, 200); const lap1 = await attrs(p, '[data-strat-pit="0"]', 'data-lap');
    await tapSel(p, '[data-strat-publish]'); await w(p, 300);
    const saved = await inner(p, '[data-strat-saved]'), comm = await inners(p, '[data-strat-community] [data-pct]');
    await ctx.close();
    assert(/GP del Bahrain in Malesia/.test(head) && /si chiude/i.test(head) && /08:45/.test(head), 'prossima gara e chiusura: ' + head.slice(0, 260));
    assert(n0 === 2 && n1 === 3, `stint: ${n0} → ${n1}`);
    assert(c0[0] && c1[0] && c0[0] !== c1[0], `mescola cambiata col tocco: ${c0} → ${c1}`);
    assert(+lap1[0] === +lap0[0] + 1, `sosta spostata di un giro: ${lap0} → ${lap1}`);
    assert(saved && /2 soste/.test(saved), 'strategia pubblicata: ' + saved);
    assert(comm.length >= 4 && comm.reduce((a, x) => a + parseInt(x, 10), 0) === 100, 'percentuali della community: ' + comm);
    assert(!errs.length, errs.join(' | '));
  },
  async 'strategy predictor: a gara iniziata è chiusa'(b) {
    const { ctx, p, errs } = await open(b, { now: '2026-10-04T07:30:00Z' }); await login(p); await openTool(p, 'strategy');
    const t = await inner(p, '[data-strat]'), pub = await has(p, '[data-strat-publish]'); await ctx.close();
    assert(/chiusa/i.test(t) && !pub, 'previsione ancora aperta: ' + t.slice(0, 200));
    assert(!errs.length, errs.join(' | '));
  },
  async 'strategy predictor: allenamento su una gara vera (Baku) con i punti contro il vincitore'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await openTool(p, 'strategy');
    await tapSel(p, '[data-strat-tab="past"]'); await w(p, 300);
    await p.selectOption('#stratRace', 'az-2016'); await w(p, 300);
    await tapSel(p, '[data-strat-reveal]'); await w(p, 400);
    const r = await inner(p, '[data-strat-result]'), rows = await count(p, '[data-strat-real]'); await ctx.close();
    for (const s of ['Russell', 'Soste', 'Mescole', 'Pit stop', 'Podio', 'punti']) assert(r && r.includes(s), 'manca "' + s + '": ' + (r || '').slice(0, 300));
    assert(rows >= 10, 'strategie vere: ' + rows);
    assert(!errs.length, errs.join(' | '));
  },
  async 'degrado gomme: gare vere, "Pilota (Mescola · N giri): degrado di +0,08 s al giro" e crollo'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await openTool(p, 'deg');
    const race = await p.evaluate(() => document.querySelector('#degRace').value), rows = await inners(p, '[data-deg-row]');
    // L'ultima gara vera nei dati (round più alto): dal 4/10/2026 è Sepang (my-1999).
    const last = await p.evaluate(() => window.__req('./data/real-weekend').races.slice().sort((a, b) => b.round - a.round)[0].circuitId);
    await p.selectOption('#degRace', 'es-2026'); await w(p, 300);
    const cliff = await inners(p, '[data-deg-row][data-cliff="1"]');
    await tapSel(p, '[data-deg-row]'); await w(p, 300); const pts = await count(p, '[data-deg-chart] circle');
    await ctx.close();
    assert(race === last && last === 'my-1999', 'di serie l\'ultima gara (' + last + '): ' + race);
    assert(rows.length >= 20 && rows.every(r => /\((Medie|Morbide|Dure|Intermedie|Da bagnato|Sconosciute) · \d+ giri\): (degrado di \+\d,\d{2} s al giro|nessun degrado)/.test(r)), 'righe: ' + rows.slice(0, 3).join(' / '));
    assert(cliff.length >= 3 && cliff.every(r => /Crollo rilevato al giro \d+/.test(r)), 'crolli a Madrid: ' + cliff.slice(0, 2).join(' / '));
    assert(pts >= 5, 'grafico dello stint: ' + pts);
    assert(!errs.length, errs.join(' | '));
  },
  async 'degrado gomme: anche nella prova DEMO (simulata) durante la gara'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await startLive(p, 'GARA'); await advance(p, 1800);
    await openTool(p, 'deg'); await tapSel(p, '[data-deg-src="live"]'); await w(p, 300);
    const t = await inner(p, '[data-deg]'), rows = await count(p, '[data-deg-row]'); await ctx.close();
    assert(/Prova DEMO \(simulata\)/.test(t) && rows >= 5, `prova DEMO: ${rows} righe: ` + t.slice(0, 200));
    assert(!errs.length, errs.join(' | '));
  },
  async 'compagni a confronto: Ferrari, indice Over-Driving e testa a testa (qualifiche e gare vere 2026)'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await openTool(p, 'mates');
    await tapSel(p, '[data-mate-team="ferrari"]'); await w(p, 300);
    const h = await inner(p, '[data-mate-headline]'), h2h = await inner(p, '[data-mate-h2h]'), ev = await count(p, '[data-mate-event]');
    await tapSel(p, '[data-mate-team="redbull"]'); await w(p, 300); const rb = await inner(p, '[data-mate-headline]');
    await ctx.close();
    assert(h && /estrae il 100,\d{2}% dal telaio/.test(h) && /(Hamilton|Leclerc)/.test(h), 'indice: ' + h);
    for (const s of ['Qualifiche', 'Passo gara', 'Al traguardo']) assert(h2h && h2h.includes(s), 'testa a testa, manca ' + s + ': ' + h2h);
    assert(ev >= 15, 'eventi: ' + ev);
    assert(rb && /Verstappen estrae il 100,\d{2}%/.test(rb), 'Red Bull: ' + rb);
    assert(!errs.length, errs.join(' | '));
  },
  // Task 18: le radio simulate restano solo nella prova DEMO dell'admin (D24); senza diretta c'è solo la spiegazione
  // (le radio vere di OpenF1 segnate dall'admin: run41-bluff).
  async 'rilevatore di bluff: radio simulate solo nella prova DEMO dell\'admin, contro i tempi, con il verdetto'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await openTool(p, 'bluff');
    const t0 = await inner(p, '[data-bluff]'), n0 = await count(p, '[data-bluff-item]');
    await tapSel(p, '[aria-label="Indietro"]'); await w(p);
    await startLive(p, 'GARA');
    for (let i = 0; i < 16 && !(await p.evaluate(() => window.__btLive && window.__btLive.state().finished)); i++) await advance(p, 500);
    const fin = await p.evaluate(() => { const s = window.__btLive.state(); return { lap: s.lap, totalLaps: s.totalLaps, finished: s.finished }; });
    await openTool(p, 'bluff');
    const t = await inner(p, '[data-bluff]'), items = await inners(p, '[data-bluff-item]'); await ctx.close();
    assert(/Durante la gara l'admin segna le radio in cui un pilota parla di gomme/.test(t0) && n0 === 0 && !/simulat/i.test(t0), 'senza diretta: ' + t0.slice(0, 300));
    assert(fin.finished || fin.lap >= fin.totalLaps, 'la gara DEMO non arriva in fondo: ' + JSON.stringify(fin));
    assert(/DEMO/.test(t) && /simulat/i.test(t), 'deve dire che le radio sono simulate (prova DEMO): ' + t.slice(0, 300));
    assert(items.length >= 10, 'radio analizzate: ' + items.length);
    assert(items.some(x => /BLUFF PROBABILE/.test(x)) && items.some(x => /RADIO VERA/.test(x)), 'verdetti: ' + items.slice(0, 3).join(' / '));
    assert(items.every(x => /Giro \d+/.test(x) && /radio simulata/.test(x)), 'giro della radio: ' + items.slice(0, 2).join(' / '));
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
