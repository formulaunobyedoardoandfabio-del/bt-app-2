// Test della 2.0: foto dei piloti scontornate (foto tonda sul volto + foto intera) e caschi nella scheda pilota.
// Uso: bash rtest/build.sh && node rtest/run12.js [filtro]
const { chromium } = require('/opt/node-tools/node_modules/playwright');
// Le notizie, le previsioni, i video e il calendario d'esempio della 2.0 ora stanno su Firebase (Task 6): il Firebase
// finto parte con quei documenti, così le prove li ritrovano.
const SEED_20 = require('../fixtures/seed-2.0.json');
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

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
const goRace = async p => { await tapText(p, 'RACE', { exact: true }); await w(p, 400); };
const openDriver = async (p, short) => { await tapText(p, short); await w(p, 400); };
const img = (p, alt) => p.evaluate(a => { const i = [...document.querySelectorAll('img')].find(x => x.alt === a); return i ? { src: i.getAttribute('src').slice(0, 30), ok: i.complete && i.naturalWidth > 0 } : null; }, alt);
const assert = (c, m) => { if (!c) throw new Error(m); };

const tests = {
  async 'SKIP foto tolte (Task 14): foto: in classifica i piloti (dal 4° in giù) hanno il casco come foto piccola'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await goRace(p);
    const r = await p.evaluate(() => {
      const spans = [...document.querySelectorAll('span[aria-hidden="true"] > span')];
      const withPhoto = spans.filter(s => /data:image\/webp/.test(s.style.backgroundImage));
      return { tot: withPhoto.length, casco: withPhoto.filter(s => s.getAttribute('data-img') === 'casco').length };
    });
    await ctx.close();
    assert(r.tot >= 19, 'foto tonde con immagine: ' + r.tot + ' su 19 (dal 4° in giù; i primi 3 sono sul podio)');
    assert(r.casco === r.tot, 'le foto piccole non sono i caschi (' + r.casco + '/' + r.tot + ')');
    assert(!errs.length, 'errori JS: ' + errs.join(' | '));
  },
  async 'SKIP foto tolte (Task 14): scheda pilota: foto intera, casco e fonte della foto del casco'(b) {
    const { ctx, p } = await open(b); await login(p); await goRace(p);
    await openDriver(p, 'A. Albon');
    const full = await img(p, 'Alexander Albon'); const hel = await img(p, 'Casco di Alexander Albon');
    const t = await text(p); await ctx.close();
    assert(full && full.src.startsWith('data:image/webp') && full.ok, 'manca la foto intera di Albon');
    assert(hel && hel.src.startsWith('data:image/webp') && hel.ok, 'manca il casco di Albon');
    assert(/IL CASCO/.test(t), 'manca la sezione del casco');
    assert(/Foto: carmodel\.com/.test(t), 'manca la fonte della foto del casco (carmodel.com)');
  },
  async 'SKIP foto tolte (Task 14): scheda pilota: "Immagine indicativa" dove serve, nessuna nota dove non serve'(b) {
    const { ctx, p } = await open(b); await login(p); await goRace(p);
    await openDriver(p, 'G. Russell'); const t1 = await text(p);
    await tapSel(p, '[aria-label="Chiudi"]'); await w(p);
    await openDriver(p, 'M. Verstappen'); const t2 = await text(p); await ctx.close();
    assert(/Immagine indicativa/.test(t1), 'per Russell manca "Immagine indicativa"');
    assert(/IL CASCO/.test(t2) && !/Immagine indicativa/.test(t2) && !/Foto: /.test(t2), 'per Verstappen compaiono note che non servono');
  },
  async 'SKIP foto tolte (Task 14): Lawson: ora ha foto tonda, foto intera e casco'(b) {
    const { ctx, p } = await open(b); await login(p); await goRace(p);
    await openDriver(p, 'L. Lawson');
    const full = await img(p, 'Liam Lawson'); const hel = await img(p, 'Casco di Liam Lawson'); await ctx.close();
    assert(full && full.ok, 'manca la foto di Lawson');
    assert(hel && hel.ok, 'manca il casco di Lawson');
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
    catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + String(e.message).split('\n')[0].slice(0, 250)); }
  }
  await b.close(); console.log(`\n${pass} passati, ${fail} falliti${skip ? `, ${skip} saltati` : ''}`); process.exit(fail ? 1 : 0);
})();
