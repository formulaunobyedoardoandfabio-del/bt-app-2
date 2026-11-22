// 21/11 (Edoardo: "collega un PC e il telefono grazie a un QR code per fare la stessa cosa del second screen, ma ancora
// più grande", grafica sua "B&T: Collega PC"): il PC apre bt-app-2.vercel.app/?schermo (o /schermo) e mostra un QR e
// 6 cifre; il telefono (Profilo → Collega PC) legge il QR col lettore di Google o scrive le cifre sul tastierino;
// il PC diventa il Second Screen a tutta finestra con la disposizione del telefono, il telefono fa da telecomando
// (pilota in primo piano, riquadri) e "Scollega il PC" lo rimanda al QR. Funzione Pro. Collegamento in pair/<codice>
// (src/logic/pair.js, test/unit/pair.test.js); QR senza librerie (src/logic/qr.js, test/unit/qr.test.js).
// Le due pagine stanno nello stesso browser, quindi vedono lo stesso Firebase finto.
// Uso: node test/build-test.js && node test/e2e/run134-schermo-pc.js [filtro]
const path = require('path');
const { open, w, tapSel, tapText, login, assert, run, PAGE } = require('./helpers');
const PairLogic = require('../../src/logic/pair');
const QR = require('../../src/logic/qr');

const SHOTS = path.join(__dirname, '..', 'logs', 'run134');
const openPc = async ctx => {
  const pc = await ctx.newPage();
  const errs = [];
  pc.on('pageerror', e => errs.push(e.message));
  await pc.setViewportSize({ width: 1280, height: 800 });
  await pc.goto(PAGE + '?schermo', { waitUntil: 'load' });
  await pc.waitForSelector('[data-pc-wait]', { timeout: 8000 }).catch(() => {});
  return { pc, pcErrs: errs };
};
const pcLook = pc => pc.evaluate(() => {
  const qr = document.querySelector('[data-pc-qr] path');
  return {
    wait: !!document.querySelector('[data-pc-wait]'),
    code: (document.querySelector('[data-pc-code]') || { getAttribute: () => null }).getAttribute('data-pc-code'),
    shown: ((document.querySelector('[data-pc-code]') || {}).textContent || '').trim(),
    qr: qr ? qr.getAttribute('d') : null,
    ss: !!document.querySelector('[data-pc-dash]'),
    zoom: Number((document.querySelector('[data-pc-zoom]') || { getAttribute: () => 0 }).getAttribute('data-pc-zoom')),
    // larghezza vera della griglia dei pannelli sullo schermo (con lo zoom) e se la pagina scorre di lato
    fill: (() => { const s = document.querySelector('[data-pc-panel]'); if (!s) return null; const g = s.parentElement.getBoundingClientRect(); return [Math.round(g.left), Math.round(g.right)]; })(),
    head: ((document.querySelector('[data-pc-head]') || {}).innerText || '').replace(/\s+/g, ' '),
    slots: [...document.querySelectorAll('[data-pc-panel]')].map(e => e.getAttribute('data-pc-panel')),
    empty: !!document.querySelector('[data-pc-empty]'),
    // ogni scheda riempie il suo posto nella griglia (niente schede strette in un posto largo)
    narrow: [...document.querySelectorAll('[data-pc-panel]')].filter(e => e.firstElementChild && e.firstElementChild.getBoundingClientRect().width < e.getBoundingClientRect().width - 2).map(e => e.getAttribute('data-pc-panel')),
    chevrons: [...document.querySelectorAll('[data-pc-dash] [data-ss-widget] > div:first-child > span[aria-hidden="true"]')].filter(e => getComputedStyle(e).display !== 'none').length,
    pro: !!document.querySelector('[data-pc-pro]'),
    text: document.body.innerText.replace(/\s+/g, ' '),
    wide: document.documentElement.scrollWidth,
  };
});
const sheet = p => p.evaluate(() => {
  const s = document.querySelector('[data-pc-sheet]');
  return s ? { view: s.getAttribute('data-pc-sheet'), text: s.innerText.replace(/\s+/g, ' '), digits: [...s.querySelectorAll('[data-pc-digit]')].map(e => e.textContent.trim()).join('') } : null;
});
const openSheet = async p => { await tapSel(p, '[aria-label="Profilo"]'); await w(p, 500); await tapText(p, 'Collega PC'); await w(p, 500); };
const typeDigits = async (p, code) => { for (const ch of code) { await tapSel(p, `[data-pc-key="${ch}"]`); await w(p, 80); } };
const until = async (fn, ms = 9000) => { const t0 = Date.now(); for (;;) { const v = await fn(); if (v || Date.now() - t0 > ms) return v; await new Promise(r => setTimeout(r, 300)); } };

run({
  async 'PC in attesa: QR vero del codice (come python qrcode), 6 cifre, tre passi; niente "esempio"'(b) {
    const { ctx, p, errs } = await open(b, { seed: { pro: true } });
    const { pc, pcErrs } = await openPc(ctx);
    await w(pc, 500);
    const a = await pcLook(pc);
    require('fs').mkdirSync(SHOTS, { recursive: true });
    await pc.screenshot({ path: path.join(SHOTS, 'pc-attesa-1280.png') });
    await ctx.close();
    assert(a.wait, 'il PC mostra la schermata di attesa');
    assert(PairLogic.CODE_RE.test(a.code || ''), 'codice di 6 cifre: ' + a.code);
    assert(a.shown.replace(/\s/g, '') === a.code, 'cifre a schermo (a gruppi di 3): ' + a.shown);
    assert(a.qr === QR.svgPath(QR.encode(PairLogic.qrText(a.code))).d, 'il QR porta ' + PairLogic.qrText(a.code));
    assert(/IN ATTESA DEL TELEFONO/.test(a.text) && /Profilo → Collega PC/.test(a.text) && /oppure scrivi le 6 cifre/.test(a.text), 'passi: ' + a.text.slice(0, 300));
    assert(/scade tra 2:00/.test(a.text), 'conto alla rovescia vero: ' + a.text.slice(0, 400));
    assert(!/esempio/i.test(a.text), 'niente scritte "esempio": ' + a.text);
    assert(a.wide <= 1280, 'niente scorrimento orizzontale: ' + a.wide);
    assert(!errs.length && !pcErrs.length, errs.concat(pcErrs).join(' | '));
  },

  async 'telefono Pro scrive le 6 cifre: il PC mostra i pannelli, il telefono sceglie quali e in che ordine, Scollega torna al QR'(b) {
    const { ctx, p, errs } = await open(b, { seed: { pro: true } }); await login(p); await w(p, 600);
    const { pc, pcErrs } = await openPc(ctx);
    const code = (await pcLook(pc)).code;
    await openSheet(p);
    const intro = await sheet(p);
    await p.screenshot({ path: path.join(SHOTS, 'tel-collega-390.png') });
    await tapSel(p, '[data-pc-go="code"]'); await w(p, 400);
    await typeDigits(p, code.slice(0, 3));
    const three = await sheet(p);
    await p.screenshot({ path: path.join(SHOTS, 'tel-codice-390.png') });
    await typeDigits(p, code.slice(3));
    await pc.bringToFront();   // il PC deve leggere il codice: Chrome rallenta i timer delle schede dietro
    const remote = await until(async () => { const s = await sheet(p); return s && s.view === 'remote' && /PC collegato/.test(s.text) ? s : null; }, 16000);
    await p.screenshot({ path: path.join(SHOTS, 'tel-telecomando-390.png') });
    if (!remote) {
      const reads = pg => pg.evaluate(c => window.firebase.__fake.reads.filter(r => r === 'pair/' + c).length, code);
      const why = { telReads: await reads(p), pcReads: await reads(pc), pcHidden: await pc.evaluate(() => document.visibilityState), pcNow: (await pcLook(pc)).code, code, doc: await p.evaluate(c => window.firebase.__fake.doc('pair/' + c), code), pcErrs, errs };
      await ctx.close();
      throw new Error('il telefono non diventa il telecomando: ' + JSON.stringify(why).slice(0, 1400));
    }
    const linked = await until(async () => { const l = await pcLook(pc); return l.ss ? l : null; });
    await pc.screenshot({ path: path.join(SHOTS, 'pc-pannelli-1280.png') });
    const doc = await p.evaluate(c => window.firebase.__fake.doc('pair/' + c), code);
    // telecomando (Edoardo: "decidere dal Cell cosa mettere sul PC"): spegne Meteo, accende Settori, porta Radio in cima
    await tapSel(p, '[data-pc-tile="meteo"]'); await w(p, 250);
    await tapSel(p, '[data-pc-tile="settori"]'); await w(p, 250);
    for (let i = 0; i < 4; i++) { await tapSel(p, '[data-pc-move="radio:su"]'); await w(p, 150); }
    const upFirst = await p.evaluate(() => document.querySelector('[data-pc-move="radio:su"]').disabled);
    const want = 'radio,mappa,classifica,quadrante,telemetria,gomme,chat,trophies,direzione,settori';
    const mirrored = await until(async () => { const l = await pcLook(pc); return l.slots.join() === want ? l : null; });
    await pc.screenshot({ path: path.join(SHOTS, 'pc-pannelli-scelti-1280.png') });
    // tutti spenti: il PC lo dice
    for (const id of want.split(',')) { await tapSel(p, `[data-pc-tile="${id}"]`); await w(p, 60); }
    const none = await until(async () => { const l = await pcLook(pc); return l.empty ? l : null; });
    const kept = await p.evaluate(() => JSON.parse(localStorage.getItem('bt_bt-pc-panels') || 'null'));
    await tapSel(p, '[data-pc-unlink]'); await w(p, 600);
    const after = await sheet(p);
    const back = await until(async () => { const l = await pcLook(pc); return l.wait && l.code && l.code !== code ? l : null; });
    const gone = await p.evaluate(c => window.firebase.__fake.doc('pair/' + c), code);
    await ctx.close();
    assert(intro && intro.view === 'intro' && /FUNZIONE PRO/.test(intro.text) && /Scansiona il QR|Scrivi il codice/.test(intro.text), 'prima schermata: ' + JSON.stringify(intro));
    assert(three && three.view === 'code' && three.digits === code.slice(0, 3), 'cifre scritte: ' + JSON.stringify(three));
    assert(remote, 'il telefono diventa il telecomando col PC collegato');
    assert(linked && /Telefono collegato/.test(linked.head) && /Sector 4/.test(linked.head), 'PC: Second Screen con la testata: ' + JSON.stringify(linked && linked.head));
    assert(linked && linked.slots.join() === PairLogic.PANELS_INIT.join(), 'PC coi 10 pannelli della grafica: ' + (linked && linked.slots));
    assert(linked && linked.zoom > 1.3 && linked.fill && linked.fill[0] <= 24 && linked.fill[1] >= 1256 && linked.wide <= 1280, 'pannelli ingranditi a tutta larghezza: ' + JSON.stringify(linked && [linked.zoom, linked.fill, linked.wide]));
    assert(doc && doc.owner === 'uid-a' && doc.pro === true && doc.pc && doc.pc.seen === doc.at && doc.pc.n >= 1 && doc.panels.join() === PairLogic.PANELS_INIT.join(), 'pair/<codice>: ' + JSON.stringify(doc));
    assert(linked && !linked.narrow.length && !linked.chevrons, 'schede piene e senza freccette: ' + JSON.stringify(linked && [linked.narrow, linked.chevrons]));
    assert(upFirst, 'Radio in cima: la freccia su è spenta');
    assert(mirrored, 'pannelli e ordine scelti dal telefono si vedono sul PC');
    assert(none, 'senza pannelli il PC dice di sceglierli dal telefono');
    assert(Array.isArray(kept) && kept.length === 0, 'la scelta resta sul telefono: ' + JSON.stringify(kept));
    assert(after === null || after.view === 'intro', 'scollegato: ' + JSON.stringify(after));
    assert(back, 'il PC torna al QR con un codice nuovo');
    assert(gone === null || gone === undefined, 'il collegamento è cancellato: ' + JSON.stringify(gone));
    assert(!errs.length && !pcErrs.length, errs.concat(pcErrs).join(' | '));
  },

  // 21/11 (Edoardo: "entrambe le funzionalità: Cell che controlla lo schermo PC ma anche che si possano usare entrambi"):
  // anche dal PC si sceglie cosa c'è (tasto Modifica) e si ingrandisce un pannello; le scelte del PC arrivano al telefono.
  async 'si usano insieme: dal PC Modifica toglie e sposta pannelli e il telefono lo vede; clic su un pannello lo ingrandisce'(b) {
    const { ctx, p, errs } = await open(b, { seed: { pro: true } }); await login(p); await w(p, 600);
    const { pc, pcErrs } = await openPc(ctx);
    const code = (await pcLook(pc)).code;
    await openSheet(p);
    await tapSel(p, '[data-pc-go="code"]'); await w(p, 300);
    await typeDigits(p, code);
    await pc.bringToFront();   // il PC deve leggere il codice: Chrome rallenta i timer delle schede dietro
    const remote = await until(async () => { const s = await sheet(p); return s && s.view === 'remote' ? s : null; }, 16000);
    const dash = await until(async () => (await pcLook(pc)).ss);
    if (!dash) {
      const reads = pg => pg.evaluate(c => window.firebase.__fake.reads.filter(r => r === 'pair/' + c).length, code);
      const why = { remote: !!remote, telReads: await reads(p), pcReads: await reads(pc), pcVis: await pc.evaluate(() => document.visibilityState), telVis: await p.evaluate(() => document.visibilityState), tel: await sheet(p), pcNow: (await pcLook(pc)).code, code };
      await ctx.close();
      throw new Error('il PC non mostra i pannelli: ' + JSON.stringify(why).slice(0, 700));
    }
    // ingrandisci la classifica e richiudi
    await pc.click('[data-pc-panel="classifica"] [data-pc-open]', { timeout: 5000 }); await w(pc, 400);
    const big = await pc.evaluate(() => { const e = document.querySelector('[data-pc-big]'); const card = e && e.querySelector('[data-ss-widget]'); return e ? { id: e.getAttribute('data-pc-big'), w: card ? Math.round(card.getBoundingClientRect().width) : 0, rows: e.querySelectorAll('[data-ss-body] > div > div').length } : null; });
    await pc.screenshot({ path: path.join(SHOTS, 'pc-pannello-grande-1280.png') });
    await pc.click('[data-pc-big-close]'); await w(pc, 300);
    const closed = await pc.evaluate(() => !document.querySelector('[data-pc-big]'));
    // Modifica dal PC: spegne Meteo e porta Radio al primo posto
    await pc.click('[data-pc-edit]'); await w(pc, 300);
    await pc.click('[data-pc-chip="meteo"]'); await w(pc, 200);
    for (let i = 0; i < 4; i++) { await pc.click('[data-pc-panel="radio"] [data-pc-shift="prima"]', { timeout: 5000 }); await w(pc, 120); }
    const topOff = await pc.evaluate(() => document.querySelector('[data-pc-panel="radio"] [data-pc-shift="prima"]').disabled);
    const pcNow = (await pcLook(pc)).slots;
    await pc.screenshot({ path: path.join(SHOTS, 'pc-modifica-1280.png') });
    const want = 'radio,mappa,classifica,quadrante,telemetria,gomme,chat,trophies,direzione';
    await p.bringToFront();   // ora è il telefono che deve leggere le scelte del PC
    const phone = await until(async () => { const s = await p.evaluate(() => [...document.querySelectorAll('[data-pc-row]')].filter(r => r.querySelector('[role="switch"][aria-checked="true"]')).map(r => r.getAttribute('data-pc-row')).join()); return s === want ? s : null; }, 14000);
    const kept = await p.evaluate(() => JSON.parse(localStorage.getItem('bt_bt-pc-panels') || 'null'));
    const stable = (await pcLook(pc)).slots.join();
    // 22/11 (Edoardo: "il pc non resta collegato se viene chiusa"): riaprendo la pagina del PC si ricollega da solo
    await pc.reload({ waitUntil: 'load' });
    const again = await until(async () => { const l = await pcLook(pc); return l.ss ? l : null; }, 12000);
    await ctx.close();
    assert(again && again.slots.join() === want, 'il PC riaperto torna collegato con gli stessi pannelli: ' + JSON.stringify(again && again.slots));
    assert(remote, 'collegati');
    assert(big && big.id === 'classifica' && big.w > 900 && big.rows > 12, 'pannello grande: ' + JSON.stringify(big));
    assert(closed, 'si richiude');
    assert(pcNow.join() === want && topOff, 'il PC cambia subito (e Radio, primo, non va più su): ' + pcNow);
    assert(phone === want, 'le scelte del PC arrivano al telefono: ' + phone);
    assert(Array.isArray(kept) && kept.join() === want, 'e restano sul telefono: ' + JSON.stringify(kept));
    assert(stable === want, 'il PC non torna indietro: ' + stable);
    assert(!errs.length && !pcErrs.length, errs.concat(pcErrs).join(' | '));
  },

  async 'QR letto col lettore di Google (plugin): collega senza scrivere'(b) {
    const SCAN = () => { window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'android', Plugins: { BarcodeScanner: {
      isGoogleBarcodeScannerModuleAvailable: async () => ({ available: true }),
      scan: async () => { window.__scanned = (window.__scanned || 0) + 1; return { barcodes: [{ rawValue: window.__pcQr || '' }] }; },
    } } }; };
    const { ctx, p, errs } = await open(b, { seed: { pro: true }, capacitor: SCAN }); await login(p); await w(p, 600);
    const { pc } = await openPc(ctx);
    const code = (await pcLook(pc)).code;
    await p.evaluate(t => { window.__pcQr = t; }, PairLogic.qrText(code));
    await openSheet(p);
    await tapSel(p, '[data-pc-go="scan"]');
    await pc.bringToFront();   // il PC deve leggere il codice: Chrome rallenta i timer delle schede dietro
    const remote = await until(async () => { const s = await sheet(p); return s && s.view === 'remote' ? s : null; });
    const linked = await until(async () => (await pcLook(pc)).ss);
    const scanned = await p.evaluate(() => window.__scanned || 0);
    await ctx.close();
    assert(scanned === 1, 'lettore aperto una volta: ' + scanned);
    assert(remote && linked, 'collegati col QR');
    assert(!errs.length, errs.join(' | '));
  },

  async 'QR di un altro sito: non collega e lo dice'(b) {
    const SCAN = () => { window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'android', Plugins: { BarcodeScanner: { scan: async () => ({ barcodes: [{ rawValue: 'https://example.com/?collega=123456' }] }) } } }; };
    const { ctx, p, errs } = await open(b, { seed: { pro: true }, capacitor: SCAN }); await login(p); await w(p, 600);
    await openSheet(p);
    await tapSel(p, '[data-pc-go="scan"]'); await w(p, 800);
    const s = await sheet(p);
    const pairs = await p.evaluate(() => Object.keys(window.firebase.__fake.docs()).filter(k => k.startsWith('pair/')));
    await ctx.close();
    assert(s && s.view === 'scan' && /non è di Sector 4/.test(s.text), 'avviso: ' + JSON.stringify(s));
    assert(!pairs.length, 'nessun collegamento scritto: ' + pairs);
    assert(!errs.length, errs.join(' | '));
  },

  async 'codice che nessun PC mostra: dopo l\'attesa "Codice scaduto" con Scrivi il codice'(b) {
    const { ctx, p, errs } = await open(b, { seed: { pro: true } }); await login(p); await w(p, 600);
    await openSheet(p);
    await tapSel(p, '[data-pc-go="code"]'); await w(p, 300);
    await typeDigits(p, '482719');
    const s = await until(async () => { const x = await sheet(p); return x && x.view === 'expired' ? x : null; }, 20000);
    await p.screenshot({ path: path.join(SHOTS, 'tel-scaduto-390.png') });
    await ctx.close();
    assert(s && /Codice scaduto/.test(s.text) && /Scrivi il codice/.test(s.text), 'schermata: ' + JSON.stringify(s));
    assert(!errs.length, errs.join(' | '));
  },

  async 'senza Pro: Collega PC mostra la funzione ma per collegare chiede il Pro'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await w(p, 600);
    await openSheet(p);
    const intro = await sheet(p);
    await tapSel(p, '[data-pc-go="code"]'); await w(p, 500);
    const gate = await p.evaluate(() => (document.querySelector('[data-pro-gate]') || { getAttribute: () => null }).getAttribute('data-pro-gate'));
    const s = await sheet(p);
    await ctx.close();
    assert(intro && intro.view === 'intro', 'si vede la presentazione: ' + JSON.stringify(intro));
    assert(gate === 'ss', 'chiede il Pro del Second Screen: ' + gate);
    assert(!s || s.view === 'intro', 'non va al tastierino: ' + JSON.stringify(s));
    assert(!errs.length, errs.join(' | '));
  },
});
