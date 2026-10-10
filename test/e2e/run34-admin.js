// Task 10: Pannello Admin vero. ChatGPT col backend di oggi, foto delle notizie salvate su Firebase (fsimg:),
// gara LIVE senza simulatore, prova diretta DEMO solo sul telefono dell'admin (D23), Instagram coi link veri (D06).
// Il backend è intercettato da Playwright (routes['**/api/generateArticle']).
// Uso: node test/build-test.js && node test/e2e/run34-admin.js [filtro]
const zlib = require('zlib');
const { open, w, text, norm, inner, count, has, tapText, tapSel, goTab, login, openAdmin, assert, run } = require('./helpers');

const FIX = __dirname + '/fixtures/';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const GEN = 'Leclerc firma la pole sotto le luci di Marina Bay.\n\nUn giro perfetto, il primo della stagione.';
const TINY_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const doc = (p, path) => p.evaluate(x => window.firebase.__fake.doc(x), path);
const allDocs = p => p.evaluate(() => JSON.stringify(window.firebase.__fake.docs()));
const imgDocs = p => p.evaluate(() => Object.entries(window.firebase.__fake.docs()).filter(([k]) => /^shared\/img-/.test(k)).map(([k, v]) => ({ k, len: String(v.data || '').length, jpeg: /^data:image\/jpeg;base64,/.test(v.data || '') })));
const value = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); return e ? e.value : null; }, sel);
const toast = p => p.evaluate(() => { const t = document.querySelector('.toast'); return t ? t.innerText : ''; });
const alerts = p => p.evaluate(() => [...document.querySelectorAll('[role="alert"]')].map(e => e.innerText).join(' | '));
const opened = p => p.evaluate(() => window.__opened.slice());
const reloadApp = async p => { await p.reload(); await w(p, 600); await p.waitForFunction(() => !document.querySelector('[data-splash]'), null, { timeout: 8000 }).catch(() => {}); await w(p, 900); };
const backHome = async p => { await tapSel(p, '[aria-label="Indietro"]'); await w(p); await tapSel(p, '[aria-label="Indietro"]'); await w(p); };
const loaded = (p, sel, timeout = 8000) => p.waitForFunction(s => { const i = document.querySelector(s); return !!(i && i.complete && i.naturalWidth > 0); }, sel, { timeout });
// Il cestino chiede conferma: primo tocco "Elimina?", secondo tocco elimina.
const trash = async (p, title) => { await tapSel(p, `[aria-label="Elimina ${title}"]`); await w(p, 200); await tapSel(p, `[aria-label="Elimina ${title}"]`); await w(p, 900); };
const advance = (p, sec) => p.evaluate(s => window.__btLive.advance(s), sec);
async function startDemo(p, session) { await openAdmin(p, 'GARA LIVE'); await tapText(p, 'AVVIA ' + session, { exact: true }); await w(p, 300); await backHome(p); }
async function stopDemo(p) { await openAdmin(p, 'GARA LIVE'); await tapText(p, 'TERMINA DIRETTA', { exact: true }); await w(p, 300); await backHome(p); }
const podium = (p, root) => p.evaluate(root => {
  const r = document.querySelector(root); if (!r) return null;
  return [...r.querySelectorAll('[data-podium-place]')].map(e => ({ place: +e.getAttribute('data-podium-place'), who: (e.innerText.match(/[A-Z]\. \S+/) || [''])[0] }));
}, root);

// PNG di rumore (non si comprime): w×h×3 byte, cioè 10 MB con 2000×1700.
const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = buf => { let c = -1; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function pngChunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function noisePng(width, height) {
  const row = width * 3 + 1, raw = Buffer.alloc(row * height);
  let s = 12345;
  for (let i = 0; i < raw.length; i++) { s = (Math.imul(s, 1103515245) + 12345) >>> 0; raw[i] = s >>> 24; }
  for (let y = 0; y < height; y++) raw[y * row] = 0;   // filtro "nessuno" per ogni riga
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), pngChunk('IHDR', ihdr), pngChunk('IDAT', zlib.deflateSync(raw, { level: 0 })), pngChunk('IEND', Buffer.alloc(0))]);
}

// Backend finto di ChatGPT: registra le chiamate POST e risponde con reply(route).
function chatgptRoute(reply) {
  const calls = [];
  const handler = async r => {
    if (r.request().method() === 'OPTIONS') { await r.fulfill({ status: 204, headers: CORS, body: '' }); return; }
    calls.push({ method: r.request().method(), body: r.request().postData() });
    await reply(r, calls.length);
  };
  return { calls, routes: { '**/api/generateArticle': handler } };
}

// Utente normale (non admin) e calendario con il GP di Singapore LIVE, come lo salva il menu dello stato.
const USERS = { 'a@b.it': { pw: 'x', uid: 'uid-a' }, 'u@b.it': { pw: 'y', uid: 'uid-u' } };
const USER_DOC = { 'users/u@b.it': { name: 'Utente', nick: 'Utente', email: 'u@b.it', about: { birth: null, follow: null, fan: null } } };
const SG_LIVE = { 'shared/bt-races': { __arr: [{ id: 'r17', name: 'GP di Singapore', circuit: 'Marina Bay', country: 'Singapore', round: 17, date: '2026-10-11T14:00:00', status: 'LIVE', totalLaps: 62, circuitId: 'sg-2008' }] } };
// Due notizie con la stessa foto salvata dall'app di oggi (shared/img-foto1).
const news = (id, title, date) => ({ id, title, summary: 'Riassunto', category: 'NEWS', author: 'Team B&T', image: 'fsimg:foto1', content: 'Testo.', published: true, date });
const TWO_NEWS = {
  'shared/bt-news': { __arr: [news('n1', 'Prima con la foto', '2026-10-06T10:00:00Z'), news('n2', 'Seconda con la stessa foto', '2026-10-05T10:00:00Z')] },
  'shared/img-foto1': { data: TINY_PNG, ts: 1 },
};
const IG = { 'shared/bt-ig-config': { handle: 'bt_formula1', followers: 1200, posts: 10, videos: [
  { id: 'v1', title: 'Sorpasso a Monza', thumbnail: '', views: '10', likes: '2', url: 'https://www.instagram.com/reel/ABC123/' },
  { id: 'v2', title: 'Senza link', thumbnail: '', views: '', likes: '', url: '' },
] } };

run({
  // ── ChatGPT ──────────────────────────────────────────────────────────
  async 'ChatGPT: il testo generato entra nel contenuto'(b) {
    const be = chatgptRoute(r => r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({ content: GEN }) }));
    const { ctx, p, errs } = await open(b, { routes: be.routes }); await login(p); await openAdmin(p, 'NEWS');
    await tapSel(p, '[data-chatgpt]'); await w(p, 400);
    const noTitle = await alerts(p), callsNoTitle = be.calls.length;
    await p.fill('#adTitle', 'Leclerc in pole a Singapore'); await p.fill('#adSub', 'Giro perfetto sotto le luci');
    await tapSel(p, '[data-chatgpt]');
    await p.waitForFunction(() => document.querySelector('#adText').value.length > 0, null, { timeout: 6000 }).catch(() => {});
    const body = await value(p, '#adText'), after = await alerts(p); await ctx.close();
    assert(/Scrivi prima un titolo/.test(noTitle) && callsNoTitle === 0, 'senza titolo: ' + noTitle + ' (chiamate ' + callsNoTitle + ')');
    assert(be.calls.length === 1 && be.calls[0].method === 'POST', 'chiamate al backend: ' + JSON.stringify(be.calls));
    const sent = JSON.parse(be.calls[0].body);
    assert(sent.title === 'Leclerc in pole a Singapore' && sent.summary === 'Giro perfetto sotto le luci' && sent.category === 'NEWS', 'dati mandati a ChatGPT: ' + be.calls[0].body);
    assert(body === GEN, 'contenuto: ' + JSON.stringify(body));
    assert(!/Scrivi prima un titolo|ChatGPT non ha risposto/.test(after), 'resta un messaggio di errore: ' + after);
    assert(!errs.length, errs.join(' | '));
  },
  async 'ChatGPT che non risponde: "ChatGPT non ha risposto, riprova"'(b) {
    const be = chatgptRoute((r, n) => (n === 1 ? r.fulfill({ status: 502, contentType: 'application/json', headers: CORS, body: JSON.stringify({ error: 'ChatGPT non ha risposto correttamente' }) }) : r.abort('failed')));
    const { ctx, p, errs } = await open(b, { routes: be.routes }); await login(p); await openAdmin(p, 'NEWS');
    await p.fill('#adTitle', 'Titolo qualsiasi'); await p.fill('#adText', 'Il mio testo');
    await tapSel(p, '[data-chatgpt]'); await w(p, 1200);
    const a1 = await alerts(p), body1 = await value(p, '#adText');
    await tapSel(p, '[data-chatgpt]'); await w(p, 1200);
    const a2 = await alerts(p), btn = await inner(p, '[data-chatgpt]'); await ctx.close();
    assert(/ChatGPT non ha risposto, riprova/.test(a1), 'errore del server: ' + a1);
    assert(/ChatGPT non ha risposto, riprova/.test(a2), 'rete assente: ' + a2);
    assert(body1 === 'Il mio testo', 'il contenuto scritto a mano non deve sparire: ' + body1);
    assert(be.calls.length === 2 && /ChatGPT/.test(btn), 'il tasto non torna usabile: ' + btn);
    assert(!errs.length, errs.join(' | '));
  },
  // ── Foto delle notizie ───────────────────────────────────────────────
  async 'foto della notizia salvata come fsimg: e visibile dopo aver ricaricato'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await openAdmin(p, 'NEWS');
    await p.fill('#adTitle', 'Foto su Firebase'); await p.setInputFiles('#adImg', FIX + 'panorama.png');
    await loaded(p, 'img[alt="Anteprima immagine"]').catch(() => {});
    const preview = await has(p, 'img[alt="Anteprima immagine"]');
    await tapText(p, 'PUBBLICA', { exact: true }); await w(p, 800);
    const n = ((await doc(p, 'shared/bt-news')) || { __arr: [] }).__arr.find(x => x.title === 'Foto su Firebase');
    const img = n && /^fsimg:/.test(n.image) ? await doc(p, 'shared/img-' + n.image.slice(6)) : null;
    await reloadApp(p);
    await loaded(p, '[data-featured] img[data-news-img]').catch(() => {});
    const shot = sel => p.evaluate(s => { const i = document.querySelector(s); return i ? { src: String(i.getAttribute('src')).slice(0, 24), w: i.naturalWidth } : null; }, sel);
    const home = await shot('[data-featured] img[data-news-img]');
    await tapSel(p, '[data-featured]'); await loaded(p, 'img[data-article-img]').catch(() => {});
    const art = await shot('img[data-article-img]'); await ctx.close();
    assert(preview, 'nel modulo manca l\'anteprima della foto');
    assert(n && /^fsimg:[a-z0-9]+$/.test(n.image), 'in bt-news la foto deve essere "fsimg:<id>": ' + (n && String(n.image).slice(0, 40)));
    assert(img && /^data:image\/jpeg;base64,/.test(img.data) && img.data.length <= 600000 && typeof img.ts === 'number', 'documento shared/img-<id>: ' + JSON.stringify(img).slice(0, 80));
    assert(home && /^data:image\/jpeg/.test(home.src) && home.w > 0, 'in Home la foto non si vede: ' + JSON.stringify(home));
    assert(art && /^data:image\/jpeg/.test(art.src) && art.w > 0, 'nella notizia la foto non si vede: ' + JSON.stringify(art));
    assert(!errs.length, errs.join(' | '));
  },
  async 'foto di 10 MB compressa sotto 600000 caratteri; file di testo: "Formato non supportato"'(b) {
    const big = noisePng(2000, 1700);
    assert(big.length >= 10 * 1000 * 1000, 'la foto di prova non arriva a 10 MB: ' + big.length);
    const { ctx, p, errs } = await open(b); await login(p); await openAdmin(p, 'NEWS');
    await p.setInputFiles('#adImg', { name: 'foto-grande.png', mimeType: 'image/png', buffer: big });
    await loaded(p, 'img[alt="Anteprima immagine"]', 30000).catch(() => {});
    const imgs = await imgDocs(p), err1 = await alerts(p);
    await p.setInputFiles('#adImg', { name: 'appunti.txt', mimeType: 'text/plain', buffer: Buffer.from('non è una foto') }); await w(p, 800);
    const err2 = await alerts(p), still = await has(p, 'img[alt="Anteprima immagine"]'), imgs2 = await imgDocs(p); await ctx.close();
    assert(imgs.length === 1 && imgs[0].jpeg && imgs[0].len > 1000 && imgs[0].len <= 600000, 'foto grande: ' + JSON.stringify(imgs) + ' ' + err1);
    assert(/Formato non supportato: scegli una foto JPG o PNG\./.test(err2), 'file di testo: ' + err2);
    assert(still && imgs2.length === 1, 'il file sbagliato non deve togliere la foto né salvare altro: ' + JSON.stringify(imgs2));
    assert(!errs.length, errs.join(' | '));
  },
  async 'eliminando una notizia si cancella anche la sua foto, se nessun\'altra la usa'(b) {
    const { ctx, p, errs } = await open(b, { seed: { users: USERS, addDocs: TWO_NEWS } }); await login(p);
    await loaded(p, '[data-featured] img[data-news-img]').catch(() => {});
    const home = await p.evaluate(() => { const i = document.querySelector('[data-featured] img[data-news-img]'); return i ? String(i.getAttribute('src')).slice(0, 22) : null; });
    await openAdmin(p, 'NEWS');
    await trash(p, 'Prima con la foto');
    const after1 = await doc(p, 'shared/img-foto1');
    await trash(p, 'Seconda con la stessa foto');
    const after2 = await doc(p, 'shared/img-foto1'), left = ((await doc(p, 'shared/bt-news')) || { __arr: [] }).__arr.length; await ctx.close();
    assert(home === 'data:image/png;base64,', 'la foto fsimg: salvata dall\'app di oggi non si vede in Home: ' + home);
    assert(after1 && after1.data === TINY_PNG, 'la foto è sparita anche se la usa ancora l\'altra notizia');
    assert(after2 === undefined || after2 === null, 'eliminata l\'ultima notizia che la usava, la foto deve sparire');
    assert(left === 0, 'notizie rimaste: ' + left);
    assert(!errs.length, errs.join(' | '));
  },
  // ── Gara LIVE e prova DEMO ───────────────────────────────────────────
  async 'gara messa LIVE: per gli utenti nessuna diretta simulata'(b) {
    const { ctx, p, errs } = await open(b, { seed: { users: USERS, addDocs: { ...USER_DOC, ...SG_LIVE } } }); await login(p, { email: 'u@b.it', pw: 'y' });
    await goTab(p, 'RACE'); await w(p, 600);
    const t = norm(await text(p));
    const map = await has(p, '[data-live-card-map]'), demo = await has(p, '[data-demo]'), sim = await p.evaluate(() => !!window.__btLive); await ctx.close();
    assert(/IN DIRETTA/.test(t) && /GP di Singapore/.test(t), 'la gara LIVE non si vede come "In diretta": ' + t.slice(0, 200));
    assert(!map && !sim, 'per gli utenti è partita una diretta simulata');
    assert(!demo && !/\bDEMO\b/.test(t) && !/dati demo/.test(t), 'per gli utenti compare la scritta DEMO');
    assert(!errs.length, errs.join(' | '));
  },
  async 'prova diretta: solo sul telefono dell\'admin, con la scritta DEMO; l\'ultima gara resta quella vera'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await w(p, 1000);
    await goTab(p, 'FANTA'); const total0 = await inner(p, '[data-fanta-total]');
    await goTab(p, 'RACE'); const last0 = await podium(p, '[data-last-race="real"]');
    const docs0 = await allDocs(p);
    await openAdmin(p, 'GARA LIVE'); const card = norm(await text(p)); await backHome(p);
    await startDemo(p, 'QUALIFICHE'); await goTab(p, 'FANTA');
    const lockQ = await p.evaluate(() => { const e = document.querySelector('[data-team-lock]'); return e ? e.getAttribute('data-team-lock') : null; });
    await startDemo(p, 'GARA'); await goTab(p, 'RACE');
    const badge = await inner(p, '[data-demo]');
    await openAdmin(p, 'GARA LIVE'); await tapText(p, 'ULTIMO GIRO', { exact: true }); await w(p, 300); await backHome(p); await goTab(p, 'RACE');
    for (let i = 0; i < 40 && !(await has(p, '[data-finish-podium]')); i++) { await advance(p, 20); await w(p, 120); }
    const finished = await has(p, '[data-finish-podium]');
    await stopDemo(p); await goTab(p, 'RACE');
    const last1 = await podium(p, '[data-last-race="real"]'), demoLast = await has(p, '[data-last-race="demo"]');
    await goTab(p, 'FANTA'); const total1 = await inner(p, '[data-fanta-total]'), rows = await count(p, '[data-weekend-row]');
    const docs1 = await allDocs(p); await ctx.close();
    assert(/PROVA DIRETTA \(DEMO\)/.test(card) && /solo tu/.test(card), 'nel Pannello Admin manca il riquadro "PROVA DIRETTA (DEMO)": ' + card.slice(0, 200));
    assert(badge === 'DEMO', 'nella pagina Race manca la scritta DEMO: ' + badge);
    assert(finished, 'la prova della gara non arriva alla bandiera a scacchi');
    assert(lockQ === 'open', 'la prova delle qualifiche non deve bloccare la squadra FantaF1: ' + lockQ);
    assert(last0 && last1 && JSON.stringify(last1) === JSON.stringify(last0) && !demoLast, 'l\'ultima gara è cambiata: ' + JSON.stringify(last0) + ' → ' + JSON.stringify(last1));
    assert(total1 === total0 && rows === 0, `la prova ha dato punti FantaF1: ${total0} → ${total1}, righe del weekend ${rows}`);
    assert(docs1 === docs0, 'la prova ha scritto su Firebase (lo vedrebbero gli altri)');
    assert(!errs.length, errs.join(' | '));
  },
  // ── Instagram ────────────────────────────────────────────────────────
  async 'Instagram: SEGUI apre il profilo, il video apre il suo link'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: IG } }); await login(p);
    await tapSel(p, '[data-ig-big]'); await w(p, 500);
    await tapText(p, 'SEGUI SU INSTAGRAM'); await w(p, 300);
    const t1 = await toast(p);
    await tapSel(p, '[data-ig-video="v1"]'); await w(p, 300);
    await tapSel(p, '[data-ig-video="v2"]'); await w(p, 300);
    const t2 = await toast(p), urls = await opened(p); await ctx.close();
    assert(JSON.stringify(urls) === JSON.stringify(['https://www.instagram.com/bt_formula1/', 'https://www.instagram.com/reel/ABC123/', 'https://www.instagram.com/bt_formula1/']), 'link aperti: ' + JSON.stringify(urls));
    assert(!/demo/i.test(t1 + t2), 'compare ancora un avviso "(demo)": ' + t1 + ' ' + t2);
    assert(!errs.length, errs.join(' | '));
  },
  async 'Instagram dall\'Admin: link del video e copertina salvata come fsimg:'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await openAdmin(p, 'INSTAGRAM');
    await tapText(p, 'Aggiungi video'); await w(p, 300);
    await p.fill('[aria-label="Titolo video 1"]', 'Il nostro reel'); await p.fill('[aria-label="Link video 1"]', 'ftp://sbagliato');
    await tapText(p, 'SALVA TUTTO', { exact: true }); await w(p, 300);
    const t1 = await toast(p), d1 = await doc(p, 'shared/bt-ig-config');
    await p.fill('[aria-label="Link video 1"]', 'https://www.instagram.com/reel/XYZ/');
    await p.setInputFiles('input[type=file][aria-label="Carica copertina"]', FIX + 'verticale.png');
    await loaded(p, 'img[alt="Copertina video 1"]').catch(() => {});
    await tapText(p, 'SALVA TUTTO', { exact: true }); await w(p, 800);
    const d2 = await doc(p, 'shared/bt-ig-config');
    await backHome(p); await tapSel(p, '[data-ig-big]'); await w(p, 400);
    const vid = d2 && d2.videos && d2.videos[0];
    await p.waitForFunction(id => { const e = document.querySelector(`[data-ig-video="${id}"] [data-ig-thumb]`); return !!(e && /data:image\/jpeg/.test(getComputedStyle(e).backgroundImage)); }, vid ? vid.id : '', { timeout: 6000 }).catch(() => {});
    const bg = vid ? await p.evaluate(id => { const e = document.querySelector(`[data-ig-video="${id}"] [data-ig-thumb]`); return e ? getComputedStyle(e).backgroundImage.slice(0, 30) : null; }, vid.id) : null;
    await ctx.close();
    assert(/Il link del video 1 deve iniziare con https:\/\//.test(t1) && !(d1 && d1.videos && d1.videos.length), 'link sbagliato: ' + t1 + ' ' + JSON.stringify(d1));
    assert(vid && vid.title === 'Il nostro reel' && vid.url === 'https://www.instagram.com/reel/XYZ/', 'video salvato: ' + JSON.stringify(vid));
    assert(vid && /^fsimg:[a-z0-9]+$/.test(vid.thumbnail), 'copertina: ' + (vid && String(vid.thumbnail).slice(0, 40)));
    assert(bg && /data:image\/jpeg/.test(bg), 'nella pagina Instagram la copertina non si vede: ' + bg);
    assert(!errs.length, errs.join(' | '));
  },
});
