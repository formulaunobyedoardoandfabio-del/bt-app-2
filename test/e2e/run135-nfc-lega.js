// 22/11 (Edoardo: "aggiungi la possibilità di fare sto collegamento anche tramite NFC, lo stesso per far unire le persone
// alla propria lega", grafiche N1-N6 di "B&T: Collega PC"; "non c'è sull'apk la possibilità di scannerizzare con qr
// scanner dentro l'app ... chiedi consenso alla fotocamera"). L'invito in lega è un link (src/logic/invite.js): chi
// invita lo mostra come QR, lo condivide o lo presta all'NFC (plugin BtNfc dell'APK, qui finto); chi entra avvicina il
// telefono, inquadra il QR con la fotocamera dentro l'app (BarcodeScanner finto, col consenso) o apre il link sul sito.
// Uso: node test/build-test.js && node test/e2e/run135-nfc-lega.js [filtro]
const path = require('path');
const fs = require('fs');
const { open, w, tapSel, tapText, goTab, login, assert, run } = require('./helpers');
const { leagueSeed, ME } = require('../fake/leagues');
const Invite = require('../../src/logic/invite');
const QR = require('../../src/logic/qr');

const SHOTS = path.join(__dirname, '..', 'logs', 'run135');
fs.mkdirSync(SHOTS, { recursive: true });

// Telefono Android finto: NFC (BtNfc) e fotocamera (BarcodeScanner) con quello che le prove mettono in window.
const PHONE = () => {
  const ls = {}, cl = {};
  const on = (box, ev, f) => { (box[ev] = box[ev] || []).push(f); return { remove: () => { box[ev] = (box[ev] || []).filter(x => x !== f); } }; };
  window.__nfc = { shared: [], stops: 0, reads: 0, readStops: 0 };
  const BtNfc = {
    status: async () => (window.__nfcStatus || { supported: true, enabled: true, hce: true }),
    share: async ({ url }) => { window.__nfc.shared.push(url); return { ok: true }; },
    stopShare: async () => { window.__nfc.stops++; return {}; },
    startRead: async () => {
      window.__nfc.reads++;
      if (window.__nfcNext) setTimeout(() => (ls.nfcUrl || []).forEach(f => f({ url: window.__nfcNext })), 500);
      return {};
    },
    stopRead: async () => { window.__nfc.readStops++; return {}; },
    takePending: async () => ({ url: window.__nfcPending || null }),
    addListener: async (ev, f) => on(ls, ev, f),
  };
  const BarcodeScanner = {
    checkPermissions: async () => ({ camera: window.__camState || 'prompt' }),
    requestPermissions: async () => { window.__camAsked = (window.__camAsked || 0) + 1; window.__camState = window.__camReq || 'granted'; return { camera: window.__camState }; },
    startScan: async () => {
      window.__camOn = true;
      if (window.__camText) setTimeout(() => (cl.barcodesScanned || []).forEach(f => f({ barcodes: [{ rawValue: window.__camText }] })), 600);
      return {};
    },
    stopScan: async () => { window.__camOn = false; return {}; },
    openSettings: async () => { window.__camSettings = (window.__camSettings || 0) + 1; return {}; },
    isTorchAvailable: async () => ({ available: true }),
    toggleTorch: async () => ({}),
    addListener: async (ev, f) => on(cl, ev, f),
  };
  window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'android', Plugins: { BtNfc, BarcodeScanner } };
};

const UFF = { code: 'BT-UFF1', name: 'Lega Ufficio', owner: 'u0', members: [{ name: 'A. Ferri' }], meIn: false, myCodes: [] };
const UFF_LINK = Invite.link({ code: 'BT-UFF1', name: 'Lega Ufficio', from: 'A. Ferri' });
const sheet = p => p.evaluate(() => {
  const s = document.querySelector('[data-nfc-sheet]');
  return s ? { view: s.getAttribute('data-nfc-sheet'), text: s.innerText.replace(/\s+/g, ' ') } : null;
});
const until = async (fn, ms = 9000) => { const t0 = Date.now(); for (;;) { const v = await fn(); if (v || Date.now() - t0 > ms) return v; await new Promise(r => setTimeout(r, 250)); } };
const sheetIs = (p, view, re) => until(async () => { const s = await sheet(p); return s && s.view === view && (!re || re.test(s.text)) ? s : null; });
// 22/11 sera (Edoardo: togliere "NFC: avvicina e fai" dal Profilo): la lettura si apre da FANTA > Entra con un codice.
const openRead = async p => { await goTab(p, 'FANTA'); await w(p, 500); await tapText(p, 'Entra con un codice', { exact: true }); await w(p, 300); await tapText(p, 'Avvicina i telefoni (NFC)'); await w(p, 500); };
const members = (p, code) => p.evaluate(c => { const d = window.firebase.__fake.doc('fanta/lega-' + c); return d ? Object.keys(d.members || {}).filter(k => !d.members[k].gone) : []; }, code);

run({
  async 'Invita amici apre "Invita in lega": lega vera, telefono NFC col link, QR uguale al link'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: leagueSeed({ members: [{ name: 'Marco' }] }) }, capacitor: PHONE });
    await login(p); await goTab(p, 'FANTA'); await w(p, 600);
    await tapText(p, 'Invita amici', { exact: true });
    const s = await sheetIs(p, 'invita', /Amici del Bar/);
    await w(p, 400);
    const want = Invite.link({ code: 'BT-TEST', name: 'Amici del Bar', from: 'Tester' });
    const shared = await p.evaluate(() => window.__nfc.shared.slice());
    await p.screenshot({ path: path.join(SHOTS, 'invita-nfc-390.png') });
    await tapSel(p, '[data-nfc-showqr]'); await w(p, 300);
    const qr = await p.evaluate(() => { const e = document.querySelector('[data-nfc-qr] path'); return e ? e.getAttribute('d') : null; });
    await p.screenshot({ path: path.join(SHOTS, 'invita-qr-390.png') });
    await tapSel(p, '[data-nfc-sheet] [aria-label="Chiudi"]'); await w(p, 400);
    const after = await p.evaluate(() => ({ stops: window.__nfc.stops, open: !!document.querySelector('[data-nfc-sheet]') }));
    await ctx.close();
    assert(s && /BT-TEST/.test(s.text) && /2 tifosi/.test(s.text), 'scheda della lega: ' + JSON.stringify(s));
    assert(shared.length >= 1 && shared[shared.length - 1] === want, 'NFC col link ' + want + ': ' + JSON.stringify(shared));
    assert(qr === QR.svgPath(QR.encode(want)).d, 'il QR porta il link dell\'invito');
    assert(!after.open && after.stops >= 1, 'chiudendo il telefono smette di fare da NFC: ' + JSON.stringify(after));
    assert(!errs.length, errs.join(' | '));
  },

  async 'Entra col tocco: legge il telefono di chi invita, poi si entra nella lega'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: leagueSeed(UFF) }, capacitor: PHONE });
    await login(p); await w(p, 600);
    await p.evaluate(u => { window.__nfcNext = u; }, UFF_LINK);
    await tapSel(p, '[aria-label="Profilo"]'); await w(p, 500);
    const row = await p.evaluate(() => /NFC: avvicina e fai/.test(document.body.innerText));
    await tapSel(p, '[aria-label="Indietro"]'); await w(p, 400);
    await openRead(p);
    const reading = await p.evaluate(() => !!document.querySelector('[data-nfc-reading]'));
    await p.screenshot({ path: path.join(SHOTS, 'leggi-390.png') });
    const inv = await sheetIs(p, 'invito', /Entra nella lega/);
    await p.screenshot({ path: path.join(SHOTS, 'invito-390.png') });
    await tapSel(p, '[data-nfc-join]');
    const inside = await sheetIs(p, 'dentro', /2 tifosi/);
    await p.screenshot({ path: path.join(SHOTS, 'dentro-390.png') });
    const ms = await members(p, 'BT-UFF1');
    const stops = await p.evaluate(() => window.__nfc.readStops);
    await tapSel(p, '[data-nfc-fanta]'); await w(p, 600);
    const fanta = await p.evaluate(() => ({ open: !!document.querySelector('[data-nfc-sheet]'), card: !!document.querySelector('[data-league-card="BT-UFF1"]') }));
    await ctx.close();
    assert(!row, 'nel Profilo non c\'è più "NFC: avvicina e fai"');
    assert(reading, 'lettura NFC accesa');
    assert(inv && /INVITO DA A\. FERRI/.test(inv.text) && /Lega Ufficio/.test(inv.text) && /1 tifoso/.test(inv.text), 'invito: ' + JSON.stringify(inv));
    assert(inside && /Sei nella lega/.test(inside.text), 'dentro: ' + JSON.stringify(inside));
    assert(ms.includes(ME), 'iscritto nella lega: ' + ms);
    assert(stops >= 1, 'lettura NFC spenta uscendo');
    assert(!fanta.open && fanta.card, 'classifica della lega nel FANTA: ' + JSON.stringify(fanta));
    assert(!errs.length, errs.join(' | '));
  },

  async 'invito aperto dal link sul sito senza account: dopo l\'accesso si riapre da solo'(b) {
    const q = '?' + UFF_LINK.split('?')[1];
    const { ctx, p, errs } = await open(b, { seed: { addDocs: leagueSeed(UFF) }, query: q });
    await w(p, 400);
    const kept = await p.evaluate(() => JSON.parse(localStorage.getItem('bt_bt-inv') || 'null'));
    await login(p);
    const inv = await sheetIs(p, 'invito', /Entra nella lega/);
    const where = await p.evaluate(() => window.location.search);
    await tapSel(p, '[data-nfc-later]'); await w(p, 400);
    const left = await p.evaluate(() => ({ open: !!document.querySelector('[data-nfc-sheet]'), kept: localStorage.getItem('bt_bt-inv') }));
    const ms = await members(p, 'BT-UFF1');
    await ctx.close();
    assert(kept && kept.code === 'BT-UFF1' && kept.from === 'A. Ferri', 'invito tenuto per dopo l\'accesso: ' + JSON.stringify(kept));
    assert(inv && /INVITO DA A\. FERRI/.test(inv.text) && /Lega Ufficio/.test(inv.text), 'invito: ' + JSON.stringify(inv));
    assert(where === '', 'il link si toglie dalla barra: ' + where);
    assert(!left.open && !left.kept, '"Non ora" chiude e dimentica l\'invito: ' + JSON.stringify(left));
    assert(!ms.includes(ME), 'senza "Entra" non si entra');
    assert(!errs.length, errs.join(' | '));
  },

  async 'QR dell\'invito con la fotocamera dentro l\'app: chiede il consenso, poi apre l\'invito'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: leagueSeed(UFF) }, capacitor: PHONE });
    await login(p); await goTab(p, 'FANTA'); await w(p, 600);
    await p.evaluate(u => { window.__camText = u; }, UFF_LINK);
    await tapText(p, 'Entra con un codice', { exact: true }); await w(p, 300);
    await tapText(p, 'Inquadra il QR', { exact: true });
    const ask = await until(() => p.evaluate(() => (document.querySelector('[data-cam-step]') || {}).getAttribute && document.querySelector('[data-cam-step]').getAttribute('data-cam-step') === 'consenso'));
    await p.screenshot({ path: path.join(SHOTS, 'cam-consenso-390.png') });
    const before = await p.evaluate(() => window.__camAsked || 0);
    await tapSel(p, '[data-cam-allow]');
    const inv = await sheetIs(p, 'invito', /Entra nella lega/);
    const cam = await p.evaluate(() => ({ asked: window.__camAsked, on: window.__camOn, cls: document.documentElement.classList.contains('bt-cam') }));
    await ctx.close();
    assert(ask && before === 0, 'prima il consenso, senza chiederlo ad Android in automatico');
    assert(inv && /Lega Ufficio/.test(inv.text), 'invito dal QR: ' + JSON.stringify(inv));
    assert(cam.asked === 1 && cam.on === false && !cam.cls, 'consenso chiesto una volta, fotocamera spenta dopo: ' + JSON.stringify(cam));
    assert(!errs.length, errs.join(' | '));
  },

  async 'fotocamera negata: lo spiega e porta alle impostazioni'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: leagueSeed(UFF) }, capacitor: PHONE });
    await login(p); await w(p, 600);
    await p.evaluate(() => { window.__camReq = 'denied'; });
    await openRead(p);
    await tapSel(p, '[data-nfc-go="scan"]'); await w(p, 400);
    await tapSel(p, '[data-cam-allow]');
    const no = await until(() => p.evaluate(() => { const e = document.querySelector('[data-cam-step="negato"]'); return e ? e.innerText.replace(/\s+/g, ' ') : null; }));
    await p.screenshot({ path: path.join(SHOTS, 'cam-negato-390.png') });
    await tapSel(p, '[data-cam-settings]'); await w(p, 300);
    const set = await p.evaluate(() => window.__camSettings || 0);
    await ctx.close();
    assert(no, 'schermata "negato"');
    assert(set === 1, 'apre le impostazioni dell\'app: ' + set);
    assert(!errs.length, errs.join(' | '));
  },

  async 'telefono senza NFC o con l\'NFC spento: lo dice e lascia QR e link'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: leagueSeed({ members: [{ name: 'Marco' }] }) }, capacitor: PHONE });
    await login(p); await w(p, 600);
    await p.evaluate(() => { window.__nfcStatus = { supported: false, enabled: false, hce: false }; });
    await openRead(p); await w(p, 300);
    const hub = await sheet(p);
    const leggi = await p.evaluate(() => ({ reading: !!document.querySelector('[data-nfc-reading]'), reads: window.__nfc.reads, qr: !!document.querySelector('[data-nfc-go="scan"]') }));
    await tapSel(p, '[data-nfc-sheet] [aria-label="Chiudi"]'); await w(p, 300);
    await p.evaluate(() => { window.__nfcStatus = { supported: true, enabled: false, hce: true }; });
    await tapText(p, 'Invita amici', { exact: true });
    const inv = await sheetIs(p, 'invita', /Amici del Bar/);
    await w(p, 300);
    const shared = await p.evaluate(() => window.__nfc.shared.length);
    await ctx.close();
    assert(hub && /non ha l'NFC/.test(hub.text), 'avviso senza NFC: ' + JSON.stringify(hub));
    assert(!leggi.reading && leggi.reads === 0 && leggi.qr, 'niente lettura, resta il QR: ' + JSON.stringify(leggi));
    assert(inv && /NFC è spento/.test(inv.text) && /Condividi il link/.test(inv.text) && /Mostra il QR/.test(inv.text), 'invita con NFC spento: ' + JSON.stringify(inv));
    assert(shared === 0, 'con l\'NFC spento il telefono non fa da NFC');
    assert(!errs.length, errs.join(' | '));
  },

  async 'Android apre l\'app toccando il telefono dell\'amico (link in attesa): l\'invito dopo l\'accesso'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: leagueSeed(UFF) }, capacitor: PHONE, init: `window.__nfcPending = ${JSON.stringify(UFF_LINK)};` });
    await login(p);
    const inv = await sheetIs(p, 'invito', /Entra nella lega/);
    await tapSel(p, '[data-nfc-join]');
    const inside = await sheetIs(p, 'dentro', /Sei nella lega/);
    const ms = await members(p, 'BT-UFF1');
    await ctx.close();
    assert(inv && /Lega Ufficio/.test(inv.text), 'invito: ' + JSON.stringify(inv));
    assert(inside && ms.includes(ME), 'dentro la lega: ' + ms);
    assert(!errs.length, errs.join(' | '));
  },

  async 'sul sito (senza app) niente NFC nel Profilo, ma "Invita amici" dà QR e link'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: leagueSeed({ members: [{ name: 'Marco' }] }) } });
    await login(p); await tapSel(p, '[aria-label="Profilo"]'); await w(p, 500);
    const row = await p.evaluate(() => /NFC: avvicina e fai/.test(document.body.innerText));
    await tapSel(p, '[aria-label="Indietro"]'); await w(p, 400);
    await goTab(p, 'FANTA'); await w(p, 500);
    await tapText(p, 'Invita amici', { exact: true });
    const inv = await sheetIs(p, 'invita', /Amici del Bar/);
    await tapSel(p, '[data-nfc-share]'); await w(p, 600);
    const t = await p.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
    await ctx.close();
    assert(!row, 'niente riga NFC sul sito');
    assert(inv && /Condividi il link/.test(inv.text), 'invita sul sito: ' + JSON.stringify(inv));
    assert(/Link copiato|Codice della lega: BT-TEST/.test(t), 'condividi: link copiato o codice');
    assert(!errs.length, errs.join(' | '));
  },
});
