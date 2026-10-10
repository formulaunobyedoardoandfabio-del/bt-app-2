// Test della 2.0 (versione 23): Ghost Lap con dati veri (qualifiche del GP dell'Azerbaigian 2026, TracingInsights):
// due giri sovrapposti, distacco, analisi curva per curva e replay 2D della curva.
// Uso: bash rtest/build.sh && node rtest/run21.js [filtro]      (PAGE=real.html per React vero)
const { chromium } = require('/opt/node-tools/node_modules/playwright');
// Le notizie, le previsioni, i video e il calendario d'esempio della 2.0 ora stanno su Firebase (Task 6): il Firebase
// finto parte con quei documenti, così le prove li ritrovano.
const SEED_20 = require('../fixtures/seed-2.0.json');
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const NOW = '2026-09-30T11:48:00Z';

async function open(b, { now = NOW, width = 390, height = 844 } = {}) {
  const ctx = await b.newContext({ viewport: { width, height }, hasTouch: true });
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
// Dalla versione 24 di serie si apre la qualifica più recente (Sepang): questi test usano Baku.
async function openGhost(p) { await goTab(p, 'RACE'); await tapSel(p, '[data-ghost-open]'); await w(p, 500); await tapSel(p, '[data-ghost-session="baku2026q"]'); await w(p, 400); }
const tests = {
  async 'ghost lap: dati veri delle qualifiche di Baku, di serie Russell contro Leclerc, con la fonte'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await openGhost(p);
    const t = await inner(p, '[data-ghost]'), lines = await count(p, '[data-ghost-chart="speed"] polyline'); await ctx.close();
    assert(t && /1:42\.526/.test(t) && /1:43\.363/.test(t) && /\+0,837/.test(t), 'tempi: ' + (t && t.slice(0, 200)));
    assert(lines === 2, 'linee nel grafico della velocità: ' + lines);
    assert(/TracingInsights/.test(t) && /Azerbaigian/.test(t), 'manca la fonte dei dati');
    assert(!errs.length, errs.join(' | '));
  },
  async 'ghost lap: si scelgono i piloti; scorrendo col dito si leggono velocità e distacco in quel punto'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await openGhost(p);
    await tapSel(p, '[data-ghost-b="VER"]'); await w(p, 300);
    const t = await inner(p, '[data-ghost]');
    const box = await p.evaluate(() => { const r = document.querySelector('[data-ghost-chart="speed"]').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
    await p.mouse.move(box.x + box.w * 0.3, box.y + box.h / 2); await p.mouse.move(box.x + box.w * 0.55, box.y + box.h / 2); await w(p, 250);
    const ro = await inner(p, '[data-ghost-readout]'); await ctx.close();
    assert(/1:43\.706/.test(t), 'non si vede il giro di Verstappen');
    const m = /(\d[\d.]*) m/.exec(ro || ''), d = m ? +m[1].replace('.', '') : null;
    assert(ro && /km\/h/.test(ro) && d > 2500 && d < 3900, 'lettura nel punto toccato: ' + ro);
    assert(!errs.length, errs.join(' | '));
  },
  async 'ghost lap: curva per curva chi frena più tardi, velocità minima, gas al 100% e tempo guadagnato'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await openGhost(p);
    await tapSel(p, '[data-ghost-corner="1"]'); await w(p, 300);
    const t = await inner(p, '[data-ghost-duel]'); await ctx.close();
    for (const s of ['Punto di frenata', 'Velocità minima', 'Gas al 100%', 'CURVA 1']) assert(t && t.includes(s), 'manca "' + s + '": ' + (t && t.slice(0, 160)));
    assert(/FRENA \d+(,\d)? m DOPO|STESSO PUNTO DI FRENATA/.test(t), 'manca chi frena più tardi: ' + t);
    assert(/GUADAGNA \d,\d{3} s/.test(t), 'manca il tempo guadagnato: ' + t);
    assert(!errs.length, errs.join(' | '));
  },
  async 'ghost lap: replay 2D della curva con le due vetture e il fermo immagine'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await openGhost(p);
    await tapSel(p, '[data-ghost-corner="1"]'); await w(p, 200); await tapSel(p, '[data-ghost-replay]'); await w(p, 400);
    const cars = await count(p, '[data-ghost-stage] [data-ghost-car]');
    await tapSel(p, '[data-ghost-freeze="frenata"]'); await w(p, 300); const c1 = await inner(p, '[data-ghost-caption]');
    await tapSel(p, '[data-ghost-freeze="uscita"]'); await w(p, 300); const c2 = await inner(p, '[data-ghost-caption]');
    await ctx.close();
    assert(cars === 2, 'vetture nel replay: ' + cars);
    assert(c1 && /FRENA|FRENATA/.test(c1), 'fermo immagine sulla frenata: ' + c1);
    assert(c2 && /100% DI GAS/.test(c2), 'fermo immagine sull\'uscita: ' + c2);
    assert(!errs.length, errs.join(' | '));
  },
  async 'garage: Ghost Lap anche tra le analisi con dati veri'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await goTab(p, 'GARAGE');
    await tapSel(p, '[data-game="ghost"]'); await w(p, 400);
    const ok = await has(p, '[data-ghost]'); await ctx.close();
    assert(ok, 'dal Garage non si apre il Ghost Lap');
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
