// Test della 2.0 (versione 21): pagelle della community dopo ogni gara (e Sprint): si votano i piloti da 1 a 10 su
// 5 parametri e per ogni pilota c'è un radar con la media dei voti della community B&T.
// Uso: bash rtest/build.sh && node rtest/run19.js [filtro]      (PAGE=real.html per React vero)
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
async function finishRace(p) { await openAdmin(p, 'GARA LIVE'); await tapText(p, 'ULTIMO GIRO', { exact: true }); await w(p, 300); await backHome(p); await goTab(p, 'RACE'); for (let i = 0; i < 40 && !(await has(p, '[data-finish-podium]')); i++) { await advance(p, 20); await w(p, 120); } }
const paramVal = (p, k) => p.evaluate(k => { const e = document.querySelector(`[data-ratings] [data-rating-param="${k}"]`); return e ? +e.getAttribute('data-value') : null; }, k);
const LABELS = ['Pace gara', 'Aggressività', 'Gestione gomme', 'Fortuna', 'Strategia del team'];

const tests = {
  async 'pagelle: a fine gara si votano i piloti su 5 parametri e il radar mostra la media della community'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await startLive(p, 'GARA'); await advance(p, 300);
    const during = await has(p, '[data-ratings]');
    await finishRace(p);
    const card = await p.evaluate(() => { const c = document.querySelector('[data-ratings]'); if (!c) return null; const chips = [...c.querySelectorAll('[data-rating-driver]')];
      return { text: c.innerText.replace(/\s+/g, ' '), chips: chips.length, first: chips[0] && chips[0].getAttribute('aria-pressed') + ' ' + chips[0].innerText.replace(/\s+/g, ' '), axes: c.querySelectorAll('[data-radar] [data-radar-axis]').length, poly: !!c.querySelector('[data-radar] [data-radar-community]'), mine: !!c.querySelector('[data-radar] [data-radar-mine]') }; });
    const votes = () => p.evaluate(() => { const e = document.querySelector('[data-ratings] [data-rating-votes]'); return e ? +e.getAttribute('data-rating-votes') : null; });
    const v0 = await votes(), luck0 = await paramVal(p, 'fortuna');
    await tapSel(p, '[data-ratings] [data-rate-open]'); await w(p, 250);
    const off = () => p.evaluate(() => { const e = document.querySelector('[data-ratings] [data-rate-send]'); return e ? e.disabled : null; });
    const d0 = await off();
    for (const k of ['pace', 'aggr', 'gomme', 'strategia']) { await tapSel(p, `[data-ratings] [data-rate-param="${k}"] [data-rate-value="9"]`); await w(p, 60); }
    const d4 = await off();
    await tapSel(p, '[data-ratings] [data-rate-param="fortuna"] [data-rate-value="1"]'); await w(p, 60);
    await tapSel(p, '[data-ratings] [data-rate-send]'); await w(p, 300);
    const after = await p.evaluate(() => { const c = document.querySelector('[data-ratings]'); return { mine: !!c.querySelector('[data-radar] [data-radar-mine]'), again: !!c.querySelector('[data-rate-open]'), text: c.innerText.replace(/\s+/g, ' ') }; });
    const v1 = await votes(), luck1 = await paramVal(p, 'fortuna');
    await ctx.close();
    assert(!during, 'le pagelle si aprono già durante la gara');
    assert(card && card.chips === 22 && card.axes === 5 && card.poly && !card.mine, 'pagelle: ' + JSON.stringify(card && { ...card, text: undefined }));
    assert(/^true .*P1\b/.test(card.first), 'di serie non si vede il vincitore: ' + card.first);
    for (const l of LABELS) assert(card.text.includes(l), 'manca il parametro ' + l);
    assert(d0 === true && d4 === true, `si invia il voto senza tutti e 5 i parametri: ${d0} ${d4}`);
    assert(v1 === v0 + 1 && after.mine && !after.again, `dopo il voto: voti ${v0} → ${v1}, ${JSON.stringify({ ...after, text: undefined })}`);
    assert(luck1 <= luck0, `fortuna: ${luck0} → ${luck1}`);
    assert(/il tuo voto/i.test(after.text) && /media della community/i.test(after.text), 'manca la legenda del radar');
    assert(!errs.length, errs.join(' | '));
  },
  async 'pagelle: anche per l\'ultima gara (Baku), con un radar per ogni pilota'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await goTab(p, 'RACE');
    await tapSel(p, '[data-race-tab="classifica"]'); await w(p, 300);   // 18/10: l'ultima gara ha la sua scheda
    const t = await inner(p, '[data-ratings]');
    const pick = async id => { await tapSel(p, `[data-ratings] [data-rating-driver="${id}"]`); await w(p, 200); return { sel: await p.evaluate(() => { const e = document.querySelector('[data-ratings] [data-rating-driver][aria-pressed="true"]'); return e && e.getAttribute('data-rating-driver'); }), name: await inner(p, '[data-ratings] [data-radar-name]'), luck: await paramVal(p, 'fortuna') }; };
    const rus = await pick('russell'), nor = await pick('norris');
    await ctx.close();
    assert(t && /Azerbaigian/.test(t), 'pagelle dell\'ultima gara: ' + (t && t.slice(0, 120)));
    assert(rus.sel === 'russell' && /RUSSELL/i.test(rus.name || '') && nor.sel === 'norris' && /NORRIS/i.test(nor.name || ''), JSON.stringify([rus, nor]));
    assert(nor.luck < rus.luck, `Norris (ritirato) più fortunato di Russell: ${nor.luck} contro ${rus.luck}`);
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
