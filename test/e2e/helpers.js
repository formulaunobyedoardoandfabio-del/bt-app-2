// Aiuti per le prove nel browser della nuova app (Playwright + Chromium già installato).
// Ogni prova apre test.html (costruita da test/build-test.js) in un contesto nuovo: localStorage vuoto,
// quindi il Firebase finto riparte dai dati di partenza (o da opts.seed).
const path = require('path');
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const EXE = require('fs').existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined;
const PAGE = 'file://' + path.join(__dirname, process.env.PAGE || 'test.html');
// Ora fissa (mercoledì prima del GP di Singapore): così chiusure e orari non dipendono dal giorno delle prove.
const NOW = '2026-10-07T10:00:00Z';

// page: un'altra pagina di test/e2e (video/index.html ha i video dello splash, test.html no e usa lo splash fisso).
// acceptTerms: Termini già accettati su questo telefono. Il Firebase finto lo fa da sé (tranne con freshInstall); senza
// il finto (?nofake) lo fa questa opzione, così le prove non toccano i tasti sotto il foglio dei Termini.
// reducedMotion: 'reduce' = il telefono con "Rimuovi animazioni" acceso (prefers-reduced-motion).
// welcome: il telefono non ha mai visto le schede di benvenuto (7/11); di serie sì, e chi non è entrato vede Accedi.
async function open(b, { now = NOW, width = 390, height = 844, seed, query = '', routes = {}, capacitor, waitSplash = true, waitUntil = 'load', page, acceptTerms = /(^|[?&])nofake\b/.test(query), reducedMotion, init, welcome = false } = {}) {
  const ctx = await b.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true, ...(reducedMotion ? { reducedMotion } : {}) });
  // 14/11: nel browser delle prove (pagine file://) ricaricando la pagina il localStorage a volte torna VUOTO, senza
  // che l'app cancelli niente (visto con run53: dopo il ricarico 0 chiavi, "bt-opens" di nuovo a 1). Era la causa delle
  // prove "ballerine" dopo un ricarico: sessione persa → schermata di accesso (run33, revisione-b), video rivisti (run53).
  // Rimedio: p.reload() mette da parte il localStorage in window.name (resta nella stessa scheda) e, se la pagina nuova
  // lo trova vuoto, questo script lo rimette prima che parta l'app. Se il browser non l'ha perso non fa niente.
  await ctx.addInitScript(() => {
    try {
      if (String(window.name || '').startsWith('BTKEEP:')) {
        const kept = JSON.parse(window.name.slice(7));
        window.name = '';
        if (!localStorage.length) Object.keys(kept).forEach(k => localStorage.setItem(k, kept[k]));
      }
    } catch (e) {}
  });
  if (init) await ctx.addInitScript(init);   // script da far girare prima dell'app (per esempio: il telefono ha già visto i video)
  await ctx.addInitScript(({ now, seed }) => {
    window.__btNow = Date.parse(now);
    window.__opened = [];
    window.open = url => { window.__opened.push(String(url)); return null; };
    if (seed) window.__btSeed = seed;
  }, { now, seed });
  if (acceptTerms) await ctx.addInitScript(() => { try { if (!localStorage.getItem('bt_bt-terms-accepted')) localStorage.setItem('bt_bt-terms-accepted', JSON.stringify({ ts: 1 })); } catch (e) {} });
  if (!welcome) await ctx.addInitScript(() => { try { if (!localStorage.getItem('bt_bt-entry')) localStorage.setItem('bt_bt-entry', JSON.stringify('form')); } catch (e) {} });
  if (capacitor) await ctx.addInitScript(capacitor);   // funzione che crea window.Capacitor con plugin finti
  // OpenF1 di serie non risponde (come senza rete): le prove che lo usano mettono le loro risposte in routes, che
  // vengono prima perché registrate dopo.
  await ctx.route('https://api.openf1.org/**', r => r.abort());
  // Lo stesso per Wikimedia Commons (foto di piloti, monoposto e loghi, G30): di serie le iniziali e le sagome.
  await ctx.route('https://commons.wikimedia.org/**', r => r.abort());
  await ctx.route('https://upload.wikimedia.org/**', r => r.abort());
  // Lo stesso per le classifiche di Jolpica e le previsioni meteo (24/10): di serie quelle dell'admin e niente previsioni.
  await ctx.route('https://api.jolpi.ca/**', r => r.abort());
  await ctx.route('https://bt-app-2.vercel.app/**', r => r.abort());
  for (const [glob, handler] of Object.entries(routes)) await ctx.route(glob, handler);
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  // 14/11: vedi sopra (localStorage perso al ricarico): prima di ricaricare lo si mette da parte in window.name.
  const reload0 = p.reload.bind(p);
  p.reload = async (...args) => {
    await p.evaluate(() => {
      try { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } window.name = 'BTKEEP:' + JSON.stringify(o); } catch (e) {}
    }).catch(() => {});
    return reload0(...args);
  };
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
      // 8/11: le schede della barra in basso si chiamano "Home", "Garage"... (design "4 Lega"): le prove che scrivono
      // 'HOME' trovano la scheda lo stesso.
      const el = [...document.querySelectorAll(sel)].find(b => (exact ? n(b.textContent) === txt || (b.hasAttribute('data-nav-tab') && n(b.textContent).toUpperCase() === txt) : n(b.textContent).includes(txt)));
      if (!el) { const g = document.querySelector('[data-settings-group][aria-expanded="false"]'); if (g) g.click(); return false; }   // 8/11: impostazioni in "Personalizza l'app"
      el.click(); return true;
    }, { txt, exact, sel });
    if (ok) return;
    await w(p, 150);
  }
  throw new Error(`bottone non trovato: "${txt}"`);
}
async function tapSel(p, sel, timeout = 4000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await p.evaluate(s => { const e = document.querySelector(s); if (!e) { const g = document.querySelector('[data-settings-group][aria-expanded="false"]'); if (g) g.click(); return false; } e.click(); return true; }, sel)) return;
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
// 31/10: a@b.it non è admin di serie (gli admin hanno Premium e tutti i trofei): lo diventa qui (l'app lo rilegge
// aprendo il Profilo).
// 14/11: il pannello si apre dal terminale del box (codice scritto e Invio); il codice si legge dall'app, non si ripete qui.
const ADMIN_CODE_APP = (require('fs').readFileSync(require('path').join(__dirname, '../../src/App.jsx'), 'utf8').match(/const ADMIN_CODE = "([0-9]+)"/) || [])[1];
// 14/11: scrive il codice admin dove c'è da scriverlo: nel terminale del box (oggi) o, se ci fosse, nel tastierino di prima.
async function enterAdminCode(p) {
  if (await p.$('[data-hack-input]')) {
    await p.fill('[data-hack-input]', ADMIN_CODE_APP);
    await p.press('[data-hack-input]', 'Enter');
    await p.waitForFunction(() => !document.querySelector('[data-hack-term]'), null, { timeout: 6000 }).catch(() => {});
    await w(p, 300);
    return;
  }
  const keypad = await p.evaluate(() => [...document.querySelectorAll('button')].some(b => b.textContent.trim() === '8'));
  if (keypad) { for (const d of ADMIN_CODE_APP) { await tapText(p, d, { exact: true }); await w(p, 60); } await w(p, 900); }
}
async function openAdmin(p, tab) {
  await p.evaluate(() => { if (!window.firebase.__fake.doc('admins/a@b.it')) window.firebase.__fake.setDoc('admins/a@b.it', { ruolo: 'admin' }); });
  await tapSel(p, '[aria-label="Profilo"]'); await w(p);
  await tapSel(p, '[data-hack-open]'); await w(p);   // 14/11: l'unico ingresso è il bottone ADMIN (terminale)
  await enterAdminCode(p);
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

module.exports = { EXE, PAGE, NOW, open, w, text, norm, inner, inners, count, has, tapText, tapSel, goTab, login, openAdmin, enterAdminCode, assert, run };
