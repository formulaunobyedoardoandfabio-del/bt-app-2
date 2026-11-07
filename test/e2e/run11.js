// Test della 2.0: condividere gli articoli e scaricarli come immagine (dalla versione 16 senza filigrana, col logo B&T e il nostro Instagram).
// Uso: bash rtest/build.sh && node rtest/run11.js [filtro]
const { chromium } = require('/opt/node-tools/node_modules/playwright');
// Le notizie, le previsioni, i video e il calendario d'esempio della 2.0 ora stanno su Firebase (Task 6): il Firebase
// finto parte con quei documenti, così le prove li ritrovano.
const SEED_20 = require('../fixtures/seed-2.0.json');
const EXE = require('fs').existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined;
const HADJAR = 'Hadjar, dalla Racing Bulls alla Red Bull';
const PREMIUM = 'Dentro il muretto box: come si vive una gara';
const SITE = 'https://formulaunobyedoardoandfabio-del.github.io/bt-app-flutter';

// opts: downloads (finta funzione "scarica" di Claude), decline (il visitatore rifiuta),
// share (il telefono ha la condivisione di sistema), clipboard: 'fail' (la copia non riesce).
async function open(b, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await ctx.addInitScript(() => { try { if (!localStorage.getItem('bt_bt-entry')) localStorage.setItem('bt_bt-entry', JSON.stringify('form')); } catch (e) {} });   // 7/11: benvenuto già visto (come helpers.js)
  await ctx.route('https://api.jolpi.ca/**', r => r.abort());               // 24/10: classifiche di Jolpica e previsioni
  await ctx.route('https://bt-app-2.vercel.app/**', r => r.abort());   // meteo di serie non rispondono (come helpers.js)
  await ctx.addInitScript(() => { window.__btNow = window.__btNow || Date.parse('2026-10-07T10:00:00Z'); });   // ora fissa (come helpers.js)
  await ctx.addInitScript(seed => { window.__btSeed = seed; }, SEED_20);
  await ctx.addInitScript(o => {
    window.__opened = []; window.open = u => { window.__opened.push(String(u)); return null; };
    // Registra ogni testo scritto sulle immagini generate (per controllare filigrana e contenuto).
    window.__texts = [];
    const ft = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (t, ...r) { window.__texts.push(String(t)); return ft.call(this, t, ...r); };
    window.__copied = [];
    if (o.clipboard === 'fail') {
      Object.defineProperty(Navigator.prototype, 'clipboard', { configurable: true, get() { return { writeText: async () => { throw new DOMException('negato', 'NotAllowedError'); } }; } });
      document.execCommand = () => false;
    } else {
      Object.defineProperty(Navigator.prototype, 'clipboard', { configurable: true, get() { return { writeText: async t => { window.__copied.push(String(t)); } }; } });
    }
    window.__shared = [];
    if (o.share) { Navigator.prototype.share = async function (d) { window.__shared.push(d); }; Navigator.prototype.canShare = () => true; }
    else { delete Navigator.prototype.share; delete Navigator.prototype.canShare; }
    // Download "classico" del browser: registra i link di download invece di scaricare davvero.
    window.__anchors = [];
    const ac = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () { if (this.download) { window.__anchors.push({ download: this.download, href: this.href }); return; } return ac.call(this); };
    window.__saved = [];
    if (o.downloads) {
      const dl = Object.freeze({ save: async ({ filename, data }) => { window.__saved.push({ filename, data }); if (o.decline) throw { code: 'declined', message: 'rifiutato' }; return { status: 'saved' }; } });
      window.claude = { use: async name => name === 'downloads' ? dl : null };
    }
  }, opts);
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
  await w(p, 2500); await p.waitForFunction(() => !document.querySelector('[data-splash]'), null, { timeout: 8000 }).catch(() => {}); await w(p, 400);   // Task 9: si aspetta la fine dello splash (i Termini li ha già accettati il Firebase finto)
}
const openArticle = async (p, t) => { await p.evaluate(t => [...document.querySelectorAll('h3')].find(h => h.textContent.trim() === t).closest('button').click(), t); await w(p, 400); };
const openShare = async p => { await tapSel(p, '[aria-label="Condividi articolo"]'); await w(p, 300); };
const waitPreview = p => p.waitForFunction(() => { const i = document.querySelector('img[alt^="Anteprima"]'); return !!(i && i.complete && i.naturalWidth > 0); }, null, { timeout: 8000 });
const drawn = p => p.evaluate(() => window.__texts.slice());
const assert = (c, m) => { if (!c) throw new Error(m); };

const tests = {
  async 'condividi: dall\'articolo si apre il foglio con anteprima e app'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await openArticle(p, HADJAR); await openShare(p);
    const t = await text(p);
    await waitPreview(p);
    const width = await p.evaluate(() => document.querySelector('img[alt^="Anteprima"]').naturalWidth); await ctx.close();
    for (const s of ['CONDIVIDI ARTICOLO', 'WhatsApp', 'Telegram', 'Facebook', 'Copia link', 'SCARICA IMMAGINE']) assert(t.includes(s), `nel foglio manca "${s}"`);
    assert(width === 1080, 'l\'anteprima non è l\'immagine da 1080 px: ' + width);
    assert(!errs.length, 'errori JS: ' + errs.join(' | '));
  },
  async 'condividi: WhatsApp, Telegram, X e Facebook ricevono titolo e link'(b) {
    const { ctx, p } = await open(b); await login(p);
    await openArticle(p, HADJAR); await openShare(p);
    // Dentro Claude window.open non funziona per tutti: i bottoni sono link veri che si aprono in una nuova scheda.
    const links = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('a')].map(a => [a.textContent.replace(/\s+/g, ' ').trim(), { href: a.href, target: a.target, rel: a.rel }])));
    await ctx.close();
    const got = {};
    for (const app of ['WhatsApp', 'Telegram', 'X', 'Facebook']) {
      assert(links[app], `manca il link "${app}"`);
      assert(links[app].target === '_blank' && /noopener/.test(links[app].rel), `il link "${app}" non si apre in una nuova scheda sicura`);
      got[app] = links[app].href;
    }
    const wa = decodeURIComponent(got.WhatsApp.replace(/^https:\/\/wa\.me\/\?text=/, ''));
    assert(/^https:\/\/wa\.me\/\?text=/.test(got.WhatsApp), 'WhatsApp non apre wa.me: ' + got.WhatsApp);
    assert(wa.includes(HADJAR) && wa.includes(SITE) && wa.includes('@bt_formula1'), 'il messaggio WhatsApp non ha titolo, link e Instagram: ' + wa);
    assert(got.Telegram.startsWith('https://t.me/share/url?url=' + encodeURIComponent(SITE)) && decodeURIComponent(got.Telegram).includes(HADJAR), 'Telegram sbagliato: ' + got.Telegram);
    assert(got.X.startsWith('https://x.com/intent/tweet?text=') && decodeURIComponent(got.X).includes(HADJAR) && decodeURIComponent(got.X).includes(SITE), 'X sbagliato: ' + got.X);
    assert(got.Facebook.startsWith('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(SITE)), 'Facebook sbagliato: ' + got.Facebook);
  },
  async 'condividi: Copia link copia titolo, link e Instagram e lo conferma'(b) {
    const { ctx, p } = await open(b); await login(p);
    await openArticle(p, HADJAR); await openShare(p);
    await tapText(p, 'Copia link'); await w(p, 300);
    const copied = await p.evaluate(() => window.__copied.slice()); const t = await text(p); await ctx.close();
    assert(copied.length === 1 && copied[0].includes(HADJAR) && copied[0].includes(SITE) && copied[0].includes('@bt_formula1'), 'testo copiato sbagliato: ' + JSON.stringify(copied));
    assert(/Link copiato/.test(t), 'manca la conferma "Link copiato"');
  },
  async 'condividi: se la copia non riesce, il testo si può copiare a mano'(b) {
    const { ctx, p, errs } = await open(b, { clipboard: 'fail' }); await login(p);
    await openArticle(p, HADJAR); await openShare(p);
    await tapText(p, 'Copia link'); await w(p, 300);
    const box = await p.evaluate(() => { const t = document.querySelector('textarea[aria-label="Testo da copiare"]'); return t ? t.value : null; });
    const t = await text(p); await ctx.close();
    assert(box && box.includes(SITE) && box.includes(HADJAR), 'nessun riquadro col testo da copiare a mano');
    assert(/Tieni premuto/.test(t), 'manca la spiegazione per copiare a mano');
    assert(!errs.length, 'errori JS: ' + errs.join(' | '));
  },
  async 'condividi: "Altre app" usa la condivisione del telefono, solo se c\'è'(b) {
    const a = await open(b, { share: true }); await login(a.p);
    await openArticle(a.p, HADJAR); await openShare(a.p);
    await tapText(a.p, 'Altre app'); await w(a.p, 300);
    const shared = await a.p.evaluate(() => window.__shared.map(d => ({ title: d.title, text: d.text, url: d.url }))); await a.ctx.close();
    const c = await open(b); await login(c.p);
    await openArticle(c.p, HADJAR); await openShare(c.p);
    const t = await text(c.p); await c.ctx.close();
    assert(shared.length === 1 && shared[0].title === HADJAR && shared[0].url.startsWith(SITE) && /Verstappen/.test(shared[0].text), 'condivisione del telefono sbagliata: ' + JSON.stringify(shared));
    assert(!/Altre app/.test(t), '"Altre app" compare anche dove il telefono non può condividere');
  },
  async 'scarica: salva un PNG 1080 px senza filigrana, col logo B&T e @instagram in fondo'(b) {
    const { ctx, p, errs } = await open(b, { downloads: true }); await login(p);
    await openArticle(p, HADJAR); await openShare(p); await waitPreview(p);
    await tapText(p, 'SCARICA IMMAGINE');
    await p.waitForFunction(() => window.__saved.length > 0, null, { timeout: 8000 });
    const f = await p.evaluate(async () => { const s = window.__saved[0]; const bm = await createImageBitmap(s.data); return { name: s.filename, blob: s.data instanceof Blob, type: s.data.type, size: s.data.size, w: bm.width, h: bm.height }; });
    await w(p, 300);
    const t = await text(p); const texts = await drawn(p); await ctx.close();
    assert(f.name === 'bt-app-hadjar-dalla-racing-bulls-alla-red-bull.png', 'nome file sbagliato: ' + f.name);
    assert(f.blob && f.type === 'image/png' && f.size > 20000, 'non è un PNG vero: ' + JSON.stringify(f));
    assert(f.w === 1080 && f.h > 1350, 'dimensioni sbagliate: ' + f.w + '×' + f.h);
    const marks = texts.filter(x => x === 'B&T · @bt_formula1').length;
    assert(marks === 0, 'sull\'immagine c\'è ancora la filigrana "B&T · @bt_formula1" (' + marks + ' volte)');
    assert(texts.includes('Letto su Sector 4') && texts.includes('Seguici su Instagram @bt_formula1'), 'in fondo all\'immagine mancano il nome dell\'app e il nostro Instagram');   // Task 21: l'app si chiama Sector 4
    const all = texts.join(' ');
    assert(all.includes('Vicecampione') && all.includes('Hadjar'), 'nell\'immagine manca il testo dell\'articolo');
    assert(/Immagine scaricata/.test(t), 'manca la conferma "Immagine scaricata"');
    assert(!errs.length, 'errori JS: ' + errs.join(' | '));
  },
  async 'scarica: se rifiuti il salvataggio non succede niente di male'(b) {
    const { ctx, p, errs } = await open(b, { downloads: true, decline: true }); await login(p);
    await openArticle(p, HADJAR); await openShare(p); await waitPreview(p);
    await tapText(p, 'SCARICA IMMAGINE');
    await p.waitForFunction(() => window.__saved.length > 0, null, { timeout: 8000 }); await w(p, 300);
    const t = await text(p); await ctx.close();
    assert(/Download annullato/.test(t), 'manca il messaggio "Download annullato"');
    assert(/SCARICA IMMAGINE/.test(t), 'il foglio si chiude anche se il download è stato rifiutato');
    assert(!errs.length, 'errori JS: ' + errs.join(' | '));
  },
  async 'scarica: fuori da Claude usa il download del browser'(b) {
    const { ctx, p } = await open(b); await login(p);
    await openArticle(p, HADJAR); await openShare(p); await waitPreview(p);
    await tapText(p, 'SCARICA IMMAGINE'); await w(p, 600);
    const a = await p.evaluate(() => window.__anchors.slice()); const t = await text(p); await ctx.close();
    assert(a.length === 1 && /\.png$/.test(a[0].download) && a[0].href.startsWith('blob:'), 'download del browser non avviato: ' + JSON.stringify(a));
    assert(/Immagine scaricata/.test(t), 'manca la conferma');
  },
  async 'scarica: articolo Premium bloccato → nell\'immagine niente testo riservato'(b) {
    const { ctx, p } = await open(b); await login(p);
    await openArticle(p, PREMIUM); await openShare(p); await waitPreview(p);
    const all = (await drawn(p)).join(' '); await ctx.close();
    assert(all.includes('Dentro il muretto'), 'nell\'immagine manca il titolo');
    assert(!all.includes('nevralgico') && !all.includes('raccontiamo'), 'l\'immagine contiene il testo riservato agli abbonati');
    assert(/riservato agli abbonati/.test(all), 'l\'immagine non spiega che l\'articolo è Premium');
  },
  async 'condividi: anche da ospite, dal fondo dell\'articolo'(b) {
    const { ctx, p } = await open(b);
    await tapText(p, 'ENTRA COME OSPITE'); await w(p, 700);   // Task 9: i Termini sono già accettati (primo avvio)
    await openArticle(p, HADJAR);
    await tapText(p, 'CONDIVIDI', { exact: true }); await w(p, 400);
    const t = await text(p); await ctx.close();
    assert(/CONDIVIDI ARTICOLO/.test(t) && /Copia link/.test(t), 'dal fondo dell\'articolo non si apre il foglio Condividi');
    assert(!/serve un account/i.test(t), 'da ospite chiede di accedere per condividere');
  },
  async 'scarica: dentro una cornice senza la funzione "scarica" il bottone non compare'(b) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.addInitScript(() => { try { if (!localStorage.getItem('bt_bt-entry')) localStorage.setItem('bt_bt-entry', JSON.stringify('form')); } catch (e) {} });   // 7/11: benvenuto già visto (come helpers.js)
    await ctx.addInitScript(seed => { window.__btSeed = seed; }, SEED_20);
    await ctx.addInitScript(() => { delete Navigator.prototype.share; });
    const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.goto('file://' + __dirname + '/frame.html'); await pg.waitForTimeout(800);
    const f = pg.frames().find(x => /test\.html$/.test(x.url()));
    await login(f); await openArticle(f, HADJAR); await openShare(f); await waitPreview(f);
    const t = await text(f); await ctx.close();
    assert(/CONDIVIDI ARTICOLO/.test(t) && /Copia link/.test(t), 'dentro la cornice il foglio Condividi non si apre');
    assert(!/SCARICA IMMAGINE/.test(t), 'dentro la cornice, senza la funzione scarica, compare comunque il bottone');
    assert(!errs.length, 'errori JS: ' + errs.join(' | '));
  },
  async 'immagine: usa il nome Instagram scelto dall\'admin'(b) {
    const { ctx, p } = await open(b); await login(p);
    await p.evaluate(() => { if (!window.firebase.__fake.doc('admins/a@b.it')) window.firebase.__fake.setDoc('admins/a@b.it', { ruolo: 'admin' }); }); await tapSel(p, '[aria-label="Profilo"]'); await w(p); await tapText(p, 'Pannello Admin'); await w(p);
    for (const d of '080824') { await tapText(p, d, { exact: true }); await w(p, 60); }
    await w(p, 900); await tapText(p, 'INSTAGRAM', { exact: true }); await w(p, 300);
    await p.fill('#igHandle', 'bt_prova'); await w(p, 150); await tapText(p, 'SALVA TUTTO'); await w(p, 300);
    await tapSel(p, '[aria-label="Indietro"]'); await w(p); await tapSel(p, '[aria-label="Indietro"]'); await w(p);
    await openArticle(p, HADJAR); await openShare(p); await waitPreview(p);
    await tapText(p, 'Copia link'); await w(p, 300);
    const texts = await drawn(p); const copied = await p.evaluate(() => window.__copied.slice()); await ctx.close();
    assert(texts.includes('Seguici su Instagram @bt_prova') && !texts.includes('B&T · @bt_prova'), 'l\'immagine non usa il nome Instagram aggiornato (o ha ancora la filigrana)');
    assert(copied[0] && copied[0].includes('@bt_prova'), 'il testo condiviso non usa il nome Instagram aggiornato');
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
