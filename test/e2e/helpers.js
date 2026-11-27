// Aiuti per le prove nel browser della nuova app (Playwright + Chromium già installato).
// Ogni prova apre test.html (costruita da test/build-test.js) in un contesto nuovo: localStorage vuoto,
// quindi il Firebase finto riparte dai dati di partenza (o da opts.seed).
const path = require('path');
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PAGE = 'file://' + path.join(__dirname, process.env.PAGE || 'test.html');
// Ora fissa (mercoledì prima del GP di Singapore): così chiusure e orari non dipendono dal giorno delle prove.
const NOW = '2026-10-07T10:00:00Z';

// page: un'altra pagina di test/e2e (video/index.html ha i video dello splash, test.html no e usa lo splash fisso).
// acceptTerms: Termini già accettati su questo telefono. Il Firebase finto lo fa da sé (tranne con freshInstall); senza
// il finto (?nofake) lo fa questa opzione, così le prove non toccano i tasti sotto il foglio dei Termini.
async function open(b, { now = NOW, width = 390, height = 844, seed, query = '', routes = {}, capacitor, waitSplash = true, waitUntil = 'load', page, acceptTerms = /(^|[?&])nofake\b/.test(query) } = {}) {
  const ctx = await b.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true });
  await ctx.addInitScript(({ now, seed }) => {
    window.__btNow = Date.parse(now);
    window.__opened = [];
    window.open = url => { window.__opened.push(String(url)); return null; };
    if (seed) window.__btSeed = seed;
  }, { now, seed });
  if (acceptTerms) await ctx.addInitScript(() => { try { if (!localStorage.getItem('bt_bt-terms-accepted')) localStorage.setItem('bt_bt-terms-accepted', JSON.stringify({ ts: 1 })); } catch (e) {} });
  if (capacitor) await ctx.addInitScript(capacitor);   // funzione che crea window.Capacitor con plugin finti
  for (const [glob, handler] of Object.entries(routes)) await ctx.route(glob, handler);
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto((page ? 'file://' + path.join(__dirname, page) : PAGE) + query, { waitUntil });   // 'domcontentloaded' quando uno script (Firebase) non arriva mai
  await p.waitForTimeout(400);
  if (waitSplash) await p.waitForFunction(() => !document.querySelector('[data-splash]'), null, { timeout: 8000 }).catch(() => {});
  return { ctx, p, errs };
}

const w = (p, ms = 300) => p.waitForTimeout(ms);
const text = p => p.evaluate(() => document.body.innerText);
const norm = s => String(s).replace(/\s+/g, ' ').trim();
const inner = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); return e ? e.innerText : ''; }, sel);
const inners = (p, sel) => p.evaluate(s => [...document.querySelectorAll(s)].map(e => e.innerText), sel);
const count = (p, sel) => p.evaluate(s => document.querySelectorAll(s).length, sel);
const has = (p, sel) => p.evaluate(s => !!document.querySelector(s), sel);

async function tapText(p, txt, { exact = false, timeout = 4000, sel = 'button' } = {}) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const ok = await p.evaluate(({ txt, exact, sel }) => {
      const n = s => s.replace(/\s+/g, ' ').trim();
      const el = [...document.querySelectorAll(sel)].find(b => (exact ? n(b.textContent) === txt : n(b.textContent).includes(txt)));
      if (!el) return false; el.click(); return true;
    }, { txt, exact, sel });
    if (ok) return;
    await w(p, 150);
  }
  throw new Error(`bottone non trovato: "${txt}"`);
}
async function tapSel(p, sel, timeout = 4000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; e.click(); return true; }, sel)) return;
    await w(p, 150);
  }
  throw new Error(`elemento non trovato: ${sel}`);
}
const goTab = async (p, t) => { await tapText(p, t, { exact: true }); await w(p, 400); };

async function login(p, { email = 'a@b.it', pw = 'x' } = {}) {
  await p.fill('#authEmail', email);
  await p.fill('#authPw', pw);
  await p.evaluate(() => { const bs = [...document.querySelectorAll('button')].filter(b => b.textContent.replace(/\s+/g, ' ').trim() === 'ACCEDI'); bs[bs.length - 1].click(); });
  await w(p, 1500);
}
async function openAdmin(p, tab) {
  await tapSel(p, '[aria-label="Profilo"]'); await w(p);
  await tapText(p, 'Pannello Admin'); await w(p);
  const keypad = await p.evaluate(() => [...document.querySelectorAll('button')].some(b => b.textContent.trim() === '8'));
  if (keypad) { for (const d of '080824') { await tapText(p, d, { exact: true }); await w(p, 60); } await w(p, 900); }
  if (tab) { await tapText(p, tab, { exact: true }); await w(p, 300); }
}

const assert = (c, m) => { if (!c) throw new Error(m); };

// Esegue un oggetto { 'nome della prova': async browser => {...} }; argv[2] filtra per nome.
// Le prove con il nome che comincia con "SKIP" si saltano (il motivo è nel nome).
async function run(tests) {
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
}

module.exports = { EXE, PAGE, NOW, open, w, text, norm, inner, inners, count, has, tapText, tapSel, goTab, login, openAdmin, assert, run };
