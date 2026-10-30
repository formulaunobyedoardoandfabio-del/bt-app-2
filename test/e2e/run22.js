// Test della 2.0 (versione 24): Tracciati. Bottone del circuito più invitante, Guida 2D interattiva con dati veri
// (curve cliccabili, staccata, rischio di bloccaggio, momento storico), Circuit Spec Clash, Ghost Lap anche di Sepang.
// Uso: bash rtest/build.sh && node rtest/run22.js [filtro]      (PAGE=real.html per React vero)
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
const assert = (c, m) => { if (!c) throw new Error(m); };
async function premiumTrial(p) {
  await tapSel(p, '[aria-label="Profilo"]'); await w(p); await tapText(p, 'Passa a Premium'); await w(p, 300);
  await tapText(p, 'PROVA GRATIS'); await w(p, 1500); await tapText(p, 'INIZIA'); await w(p, 300);
  await tapSel(p, '[aria-label="Indietro"]'); await w(p, 300);
}
const openTool = async (p, id) => { await goTab(p, 'GARAGE'); await tapSel(p, `[data-game="${id}"]`); await w(p, 400); };
const tests = {
  async 'circuito: al posto di "Mostra di più" un grande invito a scoprire la pista'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await goTab(p, 'RACE');
    const r = await p.evaluate(() => { const e = document.querySelector('[data-circuit-cta]'); if (!e) return null; const q = e.getBoundingClientRect(); return { t: e.innerText.replace(/\s+/g, ' '), w: q.width, h: q.height }; });
    await tapSel(p, '[data-circuit-cta]'); await w(p, 400);
    const page = await has(p, '[data-circuit-page]'); await ctx.close();
    assert(r && /ESPLORA/i.test(r.t) && /Guida 2D/i.test(r.t) && r.w >= 300 && r.h >= 56, 'invito: ' + JSON.stringify(r));
    assert(page, 'non si apre la pagina del circuito');
    assert(!errs.length, errs.join(' | '));
  },
  async 'guida 2D: curve cliccabili con marcia, velocità, staccata, rischio di bloccaggio e momento storico (Monza)'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await openTool(p, 'guide');
    await p.selectOption('#guideCircuit', 'it-1922'); await w(p, 300);
    const n = await count(p, '[data-guide] [data-guide-corner]');
    await tapSel(p, '[data-guide-corner="1"]'); await w(p, 300);
    const t = await inner(p, '[data-guide-card]'); await ctx.close();
    assert(n === 11, 'curve di Monza: ' + n);
    for (const s of ['Variante del Rettifilo', 'Marcia media', "Velocità d'ingresso", 'Punto di staccata', 'Rischio di bloccaggio', 'Momento storico B&T', 'Hamilton']) assert(t && t.includes(s), 'manca "' + s + '": ' + (t && t.slice(0, 220)));
    assert(/\d{3} km\/h/.test(t) && /ALTO/.test(t), 'numeri della curva 1: ' + t.slice(0, 220));
    assert(!errs.length, errs.join(' | '));
  },
  async 'guida 2D: anche nella pagina del circuito; a Sepang le curve sono ricavate dalle frenate'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await goTab(p, 'RACE'); await tapSel(p, '[data-circuit-cta]'); await w(p, 500);
    const t = await inner(p, '[data-circuit-page] [data-guide]'), n = await count(p, '[data-circuit-page] [data-guide-corner]');
    await tapSel(p, '[data-circuit-page] [data-guide-corner="1"]'); await w(p, 300);
    const card = await inner(p, '[data-guide-card]'); await ctx.close();
    assert(t && /ricavate dalle frenate/i.test(t) && n >= 6, `guida di Sepang: ${n} curve`);
    assert(card && /FRENATA 1/i.test(card) && /km\/h/.test(card), 'scheda della frenata 1: ' + card);
    assert(!errs.length, errs.join(' | '));
  },
  async 'circuit spec clash: Monza contro Monaco (Safety Car, sorpassi, frenata Brembo, gas a tavoletta, carico)'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await openTool(p, 'clash');
    await p.selectOption('#clashA', 'it-1922'); await p.selectOption('#clashB', 'mc-1929'); await w(p, 300);
    const rows = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-clash-row]')].map(e => [e.getAttribute('data-clash-row'), [e.getAttribute('data-a'), e.getAttribute('data-b')]])));
    const t = await inner(p, '[data-clash]'); await ctx.close();
    for (const k of ['sc', 'overtakes', 'brembo', 'full', 'downforce']) assert(rows[k], 'manca la riga ' + k + ': ' + JSON.stringify(rows));
    assert(rows.full[0] === '77' && rows.full[1] === '36', 'gas a tavoletta: ' + rows.full);
    assert(rows.sc[0] === '50', 'Safety Car a Monza: ' + rows.sc);
    assert(/Formula1\.com/.test(t) && /Brembo/.test(t), 'mancano le fonti');
    assert(!errs.length, errs.join(' | '));
  },
  // 18/10 (Edoardo): il Ghost Lap si vede solo dopo le qualifiche di quel GP: per vedere Sepang l'orologio va dopo il
  // 3/10 (prima, il 30/9, ci sono le qualifiche di Baku).
  async 'ghost lap: di serie le qualifiche più recenti (oggi a Sepang), e si passa a Baku'(b) {
    const { ctx, p, errs } = await open(b, { now: '2026-10-05T11:48:00Z' }); await login(p); await goTab(p, 'RACE');
    const card = await inner(p, '[data-ghost-open]');
    await tapSel(p, '[data-ghost-open]'); await w(p, 500);
    const t1 = await inner(p, '[data-ghost]');
    await tapSel(p, '[data-ghost-session="baku2026q"]'); await w(p, 400); const t2 = await inner(p, '[data-ghost]');
    await tapSel(p, '[data-ghost-session="sepang2026q"]'); await w(p, 300); await tapSel(p, '[data-ghost-corner="1"]'); await w(p, 300);
    const duel = await inner(p, '[data-ghost-duel]'); await ctx.close();
    assert(card && /SEPANG/i.test(card), 'riquadro: ' + card);
    assert(/1:35\.130/.test(t1) && /1:35\.428/.test(t1), 'Sepang: ' + t1.slice(0, 200));
    assert(/1:42\.526/.test(t2), 'Baku: ' + t2.slice(0, 200));
    assert(duel && /FRENATA 1/.test(duel), 'curva ricavata a Sepang: ' + duel);
    assert(!errs.length, errs.join(' | '));
  },
  async 'garage: gruppo Tracciati con la Guida 2D e il Circuit Spec Clash'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await goTab(p, 'GARAGE');
    const t = norm(await text(p)), games = await attrs(p, '[data-game]', 'data-game'); await ctx.close();
    assert(/TRACCIATI/.test(t) && games.includes('guide') && games.includes('clash'), 'garage: ' + games.join(','));
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
