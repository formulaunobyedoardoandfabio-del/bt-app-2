// Test della 2.0: ricerca articoli e articoli salvati tra i preferiti.
// Uso: bash rtest/build.sh && node rtest/run10.js [filtro]
const { chromium } = require('/opt/node-tools/node_modules/playwright');
// Le notizie, le previsioni, i video e il calendario d'esempio della 2.0 ora stanno su Firebase (Task 6): il Firebase
// finto parte con quei documenti, così le prove li ritrovano.
const SEED_20 = require('../fixtures/seed-2.0.json');
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const HADJAR = 'Hadjar, dalla Racing Bulls alla Red Bull';
const FERRARI = 'Ferrari: Leclerc e Hamilton, la coppia del Cavallino';

async function open(b) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await ctx.addInitScript(seed => { window.__btSeed = seed; }, SEED_20);
  await ctx.addInitScript(() => { window.open = () => null; });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/' + (process.env.PAGE || 'test.html')); await p.waitForTimeout(400);
  return { ctx, p, errs };
}
const w = (p, ms = 300) => p.waitForTimeout(ms);
const text = p => p.evaluate(() => document.body.innerText);
async function tapText(p, txt, { exact = false, timeout = 4000 } = {}) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const ok = await p.evaluate(({ txt, exact }) => { const n = s => s.replace(/\s+/g, ' ').trim(); const el = [...document.querySelectorAll('button')].find(b => exact ? n(b.textContent) === txt : n(b.textContent).includes(txt)); if (!el) return false; el.click(); return true; }, { txt, exact });
    if (ok) return; await w(p, 150);
  }
  throw new Error(`bottone non trovato: "${txt}"`);
}
async function tapSel(p, sel, timeout = 4000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; e.click(); return true; }, sel)) return; await w(p, 150); }
  throw new Error(`elemento non trovato: ${sel}`);
}
async function login(p) {
  await p.fill('#authEmail', 'a@b.it'); await p.fill('#authPw', 'x');
  await p.evaluate(() => { const bs = [...document.querySelectorAll('button')].filter(b => b.textContent.replace(/\s+/g, ' ').trim() === 'ACCEDI'); bs[bs.length - 1].click(); });
  await w(p, 2500); await tapText(p, 'ACCETTO', { timeout: 1500 }).catch(() => {}); await w(p, 400);
}
// Titoli degli articoli mostrati nell'elenco della Home (card delle news).
const shownTitles = p => p.evaluate(() => [...document.querySelectorAll('h3')].map(h => h.textContent.trim()));
const search = async (p, q) => { await p.fill('#newsSearch', q); await w(p, 300); };
const saveBtn = t => `[aria-label="Salva tra i preferiti: ${t}"]`;
const assert = (c, m) => { if (!c) throw new Error(m); };

const tests = {
  async 'ricerca: trova per titolo e nasconde il resto'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await search(p, 'leclerc');
    const t = await shownTitles(p); await ctx.close();
    assert(t.includes(FERRARI), 'non trova l\'articolo Ferrari: ' + JSON.stringify(t));
    assert(!t.includes(HADJAR), 'mostra anche articoli che non c\'entrano');
    assert(!errs.length, 'errori JS: ' + errs.join(' | '));
  },
  async 'ricerca: trova anche per pilota negli hashtag e ignora gli accenti'(b) {
    const { ctx, p } = await open(b); await login(p);
    await search(p, 'VERSTAPPEN');
    const t = await shownTitles(p);
    await search(p, 'velocita');
    const t2 = await shownTitles(p); await ctx.close();
    assert(t.includes(HADJAR), 'con "VERSTAPPEN" non trova l\'articolo su Hadjar (pilota negli hashtag): ' + JSON.stringify(t));
    assert(t2.includes(FERRARI), 'con "velocita" (senza accento) non trova "velocità" nel testo: ' + JSON.stringify(t2));
  },
  async 'ricerca: nessun risultato → messaggio chiaro, e svuotando torna tutto'(b) {
    const { ctx, p } = await open(b); await login(p);
    const all = (await shownTitles(p)).length;
    await search(p, 'zzzqqq');
    const t = await text(p);
    await search(p, '');
    const again = (await shownTitles(p)).length; await ctx.close();
    assert(/Nessun articolo trovato/.test(t), 'manca il messaggio "Nessun articolo trovato"');
    assert(again === all, `svuotando la ricerca non tornano tutti gli articoli (${again} invece di ${all})`);
  },
  async 'preferiti: salvo un articolo, il filtro Salvati mostra solo quello'(b) {
    const { ctx, p } = await open(b); await login(p);
    await tapSel(p, saveBtn(HADJAR)); await w(p);
    const t = await text(p);
    await tapText(p, 'Salvati'); await w(p);
    const titles = await shownTitles(p); await ctx.close();
    assert(/Salvato tra i preferiti/.test(t), 'manca la conferma di salvataggio');
    assert(titles.includes(HADJAR) && !titles.includes(FERRARI), 'il filtro Salvati non funziona: ' + JSON.stringify(titles));
  },
  async 'preferiti: dall\'articolo si salva e si toglie'(b) {
    const { ctx, p } = await open(b); await login(p);
    await p.evaluate(t => [...document.querySelectorAll('h3')].find(h => h.textContent.trim() === t).closest('button').click(), FERRARI); await w(p, 400);
    await tapSel(p, '[aria-label="Salva tra i preferiti"]'); await w(p);
    const on = await p.evaluate(() => !!document.querySelector('[aria-label="Togli dai preferiti"]'));
    await tapSel(p, '[aria-label="Indietro"]'); await w(p);
    await tapText(p, 'Salvati'); await w(p);
    const titles = await shownTitles(p); await ctx.close();
    assert(on, 'nell\'articolo il segnalibro non cambia stato');
    assert(titles.includes(FERRARI), 'l\'articolo salvato dalla sua pagina non compare tra i Salvati');
  },
  async 'preferiti: nel profilo "Articoli salvati" porta alla lista'(b) {
    const { ctx, p } = await open(b); await login(p);
    await tapSel(p, saveBtn(HADJAR)); await w(p);
    await tapSel(p, '[aria-label="Profilo"]'); await w(p);
    const prof = await text(p);
    await tapText(p, 'Articoli salvati'); await w(p);
    const titles = await shownTitles(p); await ctx.close();
    assert(/Articoli salvati/.test(prof) && /1 articolo/.test(prof), 'nel profilo manca "Articoli salvati · 1 articolo"');
    assert(titles.includes(HADJAR) && !titles.includes(FERRARI), 'dal profilo non si apre la lista dei salvati: ' + JSON.stringify(titles));
  },
  async 'preferiti: da ospite serve un account'(b) {
    const { ctx, p } = await open(b);
    await tapText(p, 'ENTRA SENZA ACCOUNT'); await w(p, 400); await tapText(p, 'ACCETTO'); await w(p, 300);
    await tapSel(p, saveBtn(HADJAR)); await w(p, 400);
    const t = await text(p); await ctx.close();
    assert(/serve un account/i.test(t) && /preferiti/i.test(t), 'da ospite non chiede di accedere');
  },
  async 'preferiti: eliminando l\'account si svuotano'(b) {
    const { ctx, p } = await open(b); await login(p);
    await tapSel(p, saveBtn(HADJAR)); await w(p);
    await tapSel(p, '[aria-label="Profilo"]'); await w(p);
    await tapText(p, 'Elimina account'); await w(p); await tapText(p, 'ELIMINA DEFINITIVAMENTE'); await w(p, 600);
    await login(p);
    await tapText(p, 'Salvati'); await w(p);
    const t = await text(p); await ctx.close();
    assert(/Non hai ancora salvato articoli/.test(t), 'dopo l\'eliminazione dell\'account restano articoli salvati');
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
