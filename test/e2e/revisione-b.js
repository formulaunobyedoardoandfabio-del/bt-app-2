// Correzioni della revisione della Fase B (Task 4-10, 21, 22): ogni prova riproduce un problema trovato dal revisore.
// Uso: node test/build-test.js && node test/e2e/revisione-b.js [filtro]
const { open, w, text, norm, inner, has, tapText, tapSel, goTab, login, openAdmin, assert, run } = require('./helpers');

const doc = (p, path) => p.evaluate(x => window.firebase.__fake.doc(x), path);
const setDoc = (p, path, v) => p.evaluate(([x, v]) => window.firebase.__fake.setDoc(x, v), [path, v]);
const toast = p => p.evaluate(() => { const t = document.querySelector('.toast'); return t ? t.innerText : ''; });
const value = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); return e ? e.value : null; }, sel);
const backHome = async p => { await tapSel(p, '[aria-label="Indietro"]'); await w(p); await tapSel(p, '[aria-label="Indietro"]'); await w(p); };
const trash = async (p, label) => { await tapSel(p, `[aria-label="${label}"]`); await w(p, 200); await tapSel(p, `[aria-label="${label}"]`); await w(p, 900); };
const CHANGED = /dati sono stati cambiati/;

// Riapre l'app (la sessione resta) con le letture di alcuni documenti che falliscono finché window.__flaky è vero:
// rete che va e viene all'avvio, col profilo che arriva e questi documenti no (come nella prova del revisore).
async function reopenFlaky(ctx, p, flaky) {
  await ctx.addInitScript(list => {
    window.__flaky = true;
    let fb;
    Object.defineProperty(window, 'firebase', { configurable: true, get: () => fb, set: v => {
      fb = v; if (!v || !v.firestore) return;
      const orig = v.firestore, db = orig();
      const wrapDoc = (ref, path) => Object.assign(Object.create(ref), { path: ref.path, id: ref.id, get: () => (window.__flaky && list.includes(path) ? Promise.reject(Object.assign(new Error('rete'), { code: 'unavailable' })) : ref.get()) });
      const wrapCol = (col, c) => Object.assign(Object.create(col), { doc: id => wrapDoc(col.doc(id), c + '/' + id) });
      const wdb = Object.assign(Object.create(db), { collection: c => wrapCol(db.collection(c), c) });
      v.firestore = Object.assign(() => wdb, orig);
    } });
  }, flaky);
  await p.reload();
  await p.waitForFunction(() => !document.querySelector('[data-splash]'), null, { timeout: 30000 }).catch(() => {});
  await p.waitForSelector('[aria-label="Profilo"]', { timeout: 12000 }).catch(() => {});   // 8/11: l'app riaperta può metterci di più
  await w(p, 900);
}

// Riapre l'app (la sessione resta) con Firestore irraggiungibile dal primo istante: SDK nella memoria del telefono,
// letture che falliscono, scritture in sospeso. back() fa tornare la rete con l'evento "online" del telefono.
async function reopenOffline(ctx, p, mode = 'offline') {
  await ctx.addInitScript(m => {
    let fb;
    Object.defineProperty(window, 'firebase', { configurable: true, get: () => fb, set: v => { fb = v; if (v && v.__fake) v.__fake[m] = true; } });
  }, mode);
  await p.reload();
  await p.waitForFunction(() => !document.querySelector('[data-splash]'), null, { timeout: 30000 }).catch(() => {});
  await p.waitForSelector('[aria-label="Profilo"]', { timeout: 12000 }).catch(() => {});   // 8/11: l'app riaperta può metterci di più
  await w(p, 700);
}
const back = async p => { await p.evaluate(() => { window.firebase.__fake.offline = false; window.firebase.__fake.holdReads = false; window.dispatchEvent(new Event('online')); }); await w(p, 1500); };
const WELCOME = "Vi presentiamo l'app B&T!!";
async function openGenerale(p) { await goTab(p, 'RACE'); await tapSel(p, '[data-race-chat]'); await w(p, 400); await tapText(p, 'Chat Generale'); await w(p, 600); }
async function say(p, msg) { await p.fill('input[placeholder="Scrivi un messaggio…"]', msg); await w(p, 100); await tapSel(p, '[aria-label="Invia"]'); await w(p, 1200); }

const PILOTI = [
  { id: 'p1', name: 'Andrea Kimi Antonelli', team: 'MERCEDES', position: 1, points: 333 },
  { id: 'p2', name: 'George Russell', team: 'MERCEDES', position: 2, points: 300 },
];
const REAL = {
  'shared/bt-piloti': { __arr: PILOTI },
  'shared/bt-costruttori': { __arr: [{ id: 'c1', name: 'Mercedes', position: 1, points: 633 }] },
  'shared/bt-ig-config': { handle: 'bt_formula1', followers: 1500, posts: 12, videos: [
    { id: 'v1', title: 'Video vero 1', thumbnail: '', views: '10', likes: '2', url: 'https://www.instagram.com/reel/AAA/' },
    { id: 'v2', title: 'Video vero 2', thumbnail: '', views: '20', likes: '3', url: 'https://www.instagram.com/reel/BBB/' },
  ] },
};
const FLAKY = ['shared/bt-piloti', 'shared/bt-costruttori', 'shared/bt-standings-note', 'shared/bt-ig-config'];
const oggi = (id, title, date) => ({ id, title, summary: '', category: 'NEWS', author: 'Team B&T', image: '', content: 'Testo.', published: true, date });

run({
  // ── C2: le schede con la bozza non scrivono i valori di serie sopra quelli veri ──────────
  async 'C2: classifiche non lette all\'avvio: SALVA non scrive quelle di serie, la scheda si rifà su quelle vere'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: REAL } }); await login(p);
    await reopenFlaky(ctx, p, FLAKY);
    await openAdmin(p, 'CLASSIFICHE');
    await p.evaluate(() => { window.__flaky = false; });   // la rete torna
    await tapText(p, 'SALVA', { exact: true }); await w(p, 800);
    const t1 = await toast(p), after1 = await doc(p, 'shared/bt-piloti');
    const shown = await value(p, '[aria-label="Punti Andrea Kimi Antonelli"]');
    await p.fill('[aria-label="Punti Andrea Kimi Antonelli"]', '340');
    await tapText(p, 'SALVA', { exact: true }); await w(p, 900);
    const t2 = await toast(p), after2 = await doc(p, 'shared/bt-piloti'); await ctx.close();
    assert(CHANGED.test(t1), 'primo SALVA: ' + t1);
    assert(JSON.stringify(after1.__arr) === JSON.stringify(PILOTI), 'le classifiche vere sono state sovrascritte: ' + JSON.stringify(after1.__arr.slice(0, 2)));
    assert(shown === '333', 'la scheda non mostra i punti veri: ' + shown);
    assert(/Classifiche salvate/.test(t2), 'secondo SALVA: ' + t2);
    assert(after2.__arr.length === 2 && after2.__arr[0].id === 'p1' && after2.__arr[0].points === 340, 'salvataggio sui dati veri: ' + JSON.stringify(after2.__arr));
    assert(!errs.length, errs.join(' | '));
  },
  async 'C2: Instagram non letto all\'avvio: SALVA TUTTO non cancella i video veri'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: REAL } }); await login(p);
    await reopenFlaky(ctx, p, FLAKY);
    await openAdmin(p, 'INSTAGRAM');
    await p.evaluate(() => { window.__flaky = false; });
    await tapText(p, 'SALVA TUTTO', { exact: true }); await w(p, 800);
    const t1 = await toast(p), ig1 = await doc(p, 'shared/bt-ig-config');
    const titles = await p.evaluate(() => [...document.querySelectorAll('input[aria-label^="Titolo video"]')].map(e => e.value));
    await tapText(p, 'SALVA TUTTO', { exact: true }); await w(p, 900);
    const t2 = await toast(p), ig2 = await doc(p, 'shared/bt-ig-config'); await ctx.close();
    assert(CHANGED.test(t1), 'primo SALVA TUTTO: ' + t1);
    assert(ig1.videos.length === 2 && ig1.followers === 1500, 'Instagram vero sovrascritto: ' + JSON.stringify(ig1));
    assert(JSON.stringify(titles) === JSON.stringify(['Video vero 1', 'Video vero 2']), 'la scheda non mostra i video veri: ' + titles);
    assert(/Instagram aggiornato/.test(t2) && ig2.videos.length === 2 && ig2.followers === 1500, 'secondo SALVA TUTTO: ' + t2 + ' ' + JSON.stringify(ig2));
    assert(!errs.length, errs.join(' | '));
  },
  // ── C1: profilo non letto all'avvio (senza rete) ─────────────────────────────────────
  async 'C1: avvio senza rete: nessun nome dall\'email né chat a suo nome; tornata la rete profilo vero, Pannello Admin e chat'(b) {
    const { ctx, p, errs } = await open(b, { seed: { admin: true } }); await login(p);
    await reopenOffline(ctx, p);
    await p.waitForSelector('[aria-label=\"Profilo\"]', { timeout: 15000 }).catch(() => {});   // 8/11: avvio più lento
    await tapSel(p, '[aria-label="Profilo"]'); await w(p, 500);
    const prof1 = norm(await text(p)), waiting = await has(p, '[data-profile-name="waiting"]');
    await tapSel(p, '[aria-label="Indietro"]'); await w(p, 300);
    await openGenerale(p); await say(p, 'prima della rete');
    const t1 = await toast(p);
    await back(p);
    await say(p, 'dopo la rete');
    const room = ((await doc(p, 'shared/bt-chat-generale')) || { __arr: [] }).__arr;
    await tapSel(p, '[aria-label="Indietro"]').catch(() => {}); await w(p, 300);
    await tapSel(p, '[aria-label="Profilo"]'); await w(p, 600);
    const prof2 = norm(await text(p)); await ctx.close();
    assert(waiting && /Profilo in caricamento/.test(prof1) && !/Completa il tuo profilo/.test(prof1), 'profilo senza rete: ' + prof1.slice(0, 200));
    assert(!/Pannello Admin/.test(prof1), 'senza sapere se è admin il Pannello non si mostra');
    assert(/profilo non è ancora arrivato/.test(t1), 'chat senza profilo: ' + t1);
    assert(!room.some(m => m.txt === 'prima della rete'), 'il messaggio senza profilo è partito: ' + JSON.stringify(room));
    const msgs = room.filter(m => m.pe !== 1);   // 29/10: nella stanza c'è anche la voce del profilo
    assert(msgs.length === 1 && msgs[0].user === 'Tester' && msgs[0].txt === 'dopo la rete', 'messaggio dopo la rete: ' + JSON.stringify(room));
    assert(/Tester/.test(prof2) && /Pannello Admin/.test(prof2) && !/Profilo in caricamento/.test(prof2), 'profilo dopo la rete: ' + prof2.slice(0, 200));
    assert(!errs.length, errs.join(' | '));
  },
  // ── I1: dati personali non ancora letti ──────────────────────────────────────────────
  async 'I1: avvio senza rete: salvare un articolo non dice "Salvato" (si perderebbe); tornata la rete si salva davvero'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await reopenOffline(ctx, p);
    await tapSel(p, `[aria-label="Salva tra i preferiti: ${WELCOME}"]`); await w(p, 300);
    const t1 = await toast(p), still = await has(p, `[aria-label="Salva tra i preferiti: ${WELCOME}"]`);
    await back(p);
    await tapSel(p, `[aria-label="Salva tra i preferiti: ${WELCOME}"]`); await w(p, 1800);
    const t2 = await toast(p), user = await doc(p, 'users/a@b.it'); await ctx.close();
    assert(/I tuoi dati non sono ancora arrivati/.test(t1) && !/Salvato tra i preferiti/.test(t1), 'senza rete: ' + t1);
    assert(still, 'senza rete l\'articolo risulta salvato');
    assert(/Salvato tra i preferiti/.test(t2), 'dopo la rete: ' + t2);
    assert(user && user.app2 && Array.isArray(user.app2.saved) && user.app2.saved.includes('n1'), 'users/a@b.it.app2: ' + JSON.stringify(user && user.app2));
    assert(!errs.length, errs.join(' | '));
  },
  // ── I3: ospite e sessione salvata che arriva tardi ───────────────────────────────────
  async 'I3: entrato come ospite, poi arriva la sessione salvata: diventa il suo account (Esci, chat col nome)'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await ctx.addInitScript(() => {
      let fb;
      Object.defineProperty(window, 'firebase', { configurable: true, get: () => fb, set: v => { fb = v; if (v && v.__fake) v.__fake.holdReads = true; } });
    });
    await p.reload();
    await p.waitForFunction(() => !document.querySelector('[data-splash]') && /ENTRA COME OSPITE/.test(document.body.innerText), null, { timeout: 30000 });
    await tapText(p, 'ENTRA COME OSPITE'); await w(p, 500);
    await p.evaluate(() => { window.firebase.__fake.holdReads = false; }); await w(p, 2000);   // la sessione arriva
    await tapSel(p, '[aria-label="Profilo"]'); await w(p, 400);
    const prof = norm(await text(p));
    await tapSel(p, '[aria-label="Indietro"]').catch(() => {}); await w(p, 300);
    await openGenerale(p); await say(p, 'ciao');
    const room = ((await doc(p, 'shared/bt-chat-generale')) || { __arr: [] }).__arr; await ctx.close();
    assert(!/Stai navigando come ospite/.test(prof) && /Esci/.test(prof) && /Tester/.test(prof), 'profilo: ' + prof.slice(0, 200));
    const msgs = room.filter(m => m.pe !== 1);   // 29/10: nella stanza c'è anche la voce del profilo
    assert(msgs.length === 1 && msgs[0].user === 'Tester', 'chat: ' + JSON.stringify(room));
    assert(!errs.length, errs.join(' | '));
  },
  // ── I2: rete bloccata (gli script di Firebase non arrivano mai) ──────────────────────
  async 'I2: gli script di Firebase non arrivano: ACCEDI dice "Errore di connessione" invece di restare grigio'(b) {
    const { ctx, p, errs } = await open(b, { query: '?nofake', waitSplash: false, waitUntil: 'domcontentloaded', routes: { 'https://www.gstatic.com/**': () => {} } });
    await p.waitForFunction(() => !document.querySelector('[data-splash]') && !!document.querySelector('#authEmail'), null, { timeout: 25000 });
    await p.fill('#authEmail', 'a@b.it'); await p.fill('#authPw', 'abcdef12');
    await p.evaluate(() => { const bs = [...document.querySelectorAll('button')].filter(b => b.textContent.trim() === 'ACCEDI'); bs[bs.length - 1].click(); });
    const ok = await p.waitForFunction(() => /Errore di connessione, riprova tra poco/.test(document.body.innerText), null, { timeout: 40000 }).then(() => true, () => false);
    const scripts = await p.evaluate(() => document.querySelectorAll('script[src*="gstatic"]').length); await ctx.close();
    assert(ok, 'dopo 40 secondi ancora nessun messaggio');
    assert(scripts <= 3, 'script di Firebase in attesa: ' + scripts + ' (uno per file al massimo)');
    assert(!errs.length, errs.join(' | '));
  },
  // ── I5: sospensione di un messaggio vecchio senza l'ID dell'autore ───────────────────
  async 'I5: SOSPENDI su un messaggio vecchio senza aid: lo dice all\'admin (messaggio intero sullo schermo) e non finge'(b) {
    const old = { 'shared/bt-chat-generale': { __arr: [{ id: 'm-old', user: 'Marco', txt: 'messaggio di una volta', t: Date.parse('2026-09-01T10:00:00Z') }] } };
    const { ctx, p, errs } = await open(b, { width: 360, seed: { addDocs: old } }); await login(p);
    await openAdmin(p, 'CHAT'); await w(p, 1200);
    await p.evaluate(() => { const card = [...document.querySelectorAll('div')].reverse().find(d => /messaggio di una volta/.test(d.innerText) && [...d.querySelectorAll('button')].some(x => x.textContent.trim() === 'SOSPENDI')); [...card.querySelectorAll('button')].find(x => x.textContent.trim() === 'SOSPENDI').click(); });
    await w(p, 700);
    const t = await toast(p), box = await p.evaluate(() => { const r = document.querySelector('.toast').getBoundingClientRect(); return { left: r.left, right: r.right, vw: window.innerWidth }; });
    const banned = await doc(p, 'shared/bt-chat-banned'), screen = norm(await text(p)); await ctx.close();
    assert(/Non riesco a identificare con certezza/.test(t), 'avviso: ' + t);
    assert(banned === undefined || banned === null || !(banned.__arr || []).length, 'sospensione scritta: ' + JSON.stringify(banned));
    assert(!/Marco non può più scrivere/.test(screen), 'dice che Marco è sospeso');
    assert(box.left >= 0 && box.right <= box.vw, 'l\'avviso esce dallo schermo: ' + JSON.stringify(box));
    assert(!errs.length, errs.join(' | '));
  },
  // ── Minori ────────────────────────────────────────────────────────────────────────────
  async 'minore 7: dopo un\'uscita forzata e l\'accesso di un altro account il Pannello Admin non resta aperto'(b) {
    const users = { 'a@b.it': { pw: 'x', uid: 'uid-a' }, 'u@b.it': { pw: 'y', uid: 'uid-u' } };
    const { ctx, p, errs } = await open(b, { seed: { users, addDocs: { 'users/u@b.it': { name: 'Utente', nick: 'Utente', email: 'u@b.it', about: { birth: null, follow: null, fan: null } } } } }); await login(p);
    await openAdmin(p, 'NEWS');
    await p.evaluate(() => window.firebase.auth().signOut()); await w(p, 800);   // sessione chiusa da Firebase
    await login(p, { email: 'u@b.it', pw: 'y' }); await w(p, 500);
    const t = norm(await text(p)); await ctx.close();
    assert(!/PANNELLO ADMIN/.test(t) && !/NUOVO ARTICOLO/.test(t), 'il Pannello Admin è rimasto aperto per un altro account: ' + t.slice(0, 160));
    assert(!errs.length, errs.join(' | '));
  },
  async 'minore 10: rete lentissima all\'avvio: finito lo splash coi contenuti di serie c\'è la riga "Sei offline"; poi sparisce'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await reopenOffline(ctx, p, 'holdReads');                 // dopo 15 secondi lo splash se ne va: si entra da ospite
    await p.waitForFunction(() => /ENTRA COME OSPITE/.test(document.body.innerText), null, { timeout: 20000 });
    await tapText(p, 'ENTRA COME OSPITE'); await w(p, 500);
    const t1 = norm(await text(p));
    await back(p); await w(p, 800);
    const t2 = norm(await text(p)); await ctx.close();
    assert(/Sei offline: alcuni contenuti potrebbero non essere aggiornati\./.test(t1), 'manca la riga "Sei offline" con le letture ancora in corso');
    assert(!/Sei offline/.test(t2), 'arrivati i dati la riga resta');
    assert(!errs.length, errs.join(' | '));
  },
  async 'minori 5 e 11: in "Su di te" niente anni sotto i 14; i Termini (§8) dicono anche "Su di te" e feedback'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await tapSel(p, '[aria-label="Profilo"]'); await w(p, 400);
    await tapText(p, 'Profilo pubblico').catch(() => {}); await w(p, 400);   // 8/11: Su di te sta in Profilo pubblico
    await tapSel(p, '[aria-label="Modifica Su di te"]'); await w(p, 300);   // Tappa 3 (G17): l'anno è un manettino
    const years = await p.evaluate(() => { const k = document.querySelector('#aboutBirth'); return k ? [+k.getAttribute('aria-valuemax')] : []; });
    await tapText(p, 'Annulla', { exact: true }).catch(() => {}); await w(p, 200);
    await tapSel(p, '[aria-label="Indietro"]'); await w(p, 400);   // 8/11: da Profilo pubblico si torna al Profilo
    await tapText(p, 'Termini e Condizioni'); await w(p, 500);
    const terms = norm(await text(p)); await ctx.close();
    const max = new Date(Date.parse('2026-10-07T10:00:00Z')).getFullYear() - 14;
    assert(years.length && Math.max(...years) === max, 'anni di nascita: il più recente è ' + Math.max(...years) + ', deve essere ' + max);
    assert(/Su di te/.test(terms) && /feedback/i.test(terms), 'nei Termini (§8) mancano "Su di te" o i feedback');
    assert(!errs.length, errs.join(' | '));
  },
  // ── I4: le modifiche fatte intanto dall'app di oggi (o da un altro admin) restano ────────
  async 'I4: una notizia scritta intanto con l\'app di oggi resta quando l\'admin pubblica o elimina'(b) {
    const start = { 'shared/bt-news': { __arr: [oggi('n1', 'Prima notizia', '2026-10-05T10:00:00')] } };
    const { ctx, p, errs } = await open(b, { seed: { addDocs: start } }); await login(p);
    await setDoc(p, 'shared/bt-news', { __arr: [oggi('o1', 'Scritta con l\'app di oggi', '2026-10-06T10:00:00'), oggi('n1', 'Prima notizia', '2026-10-05T10:00:00')] });
    await openAdmin(p, 'NEWS');
    await p.fill('#adTitle', 'Nuova dal Pannello'); await tapText(p, 'PUBBLICA', { exact: true }); await w(p, 900);
    const ids1 = (await doc(p, 'shared/bt-news')).__arr.map(n => n.title);
    const home = norm(await text(p));
    await setDoc(p, 'shared/bt-news', { __arr: [oggi('o2', 'Un\'altra dall\'app di oggi', '2026-10-07T09:00:00'), ...(await doc(p, 'shared/bt-news')).__arr] });
    await openAdmin(p, 'NEWS');
    await trash(p, 'Elimina Prima notizia');
    const ids2 = (await doc(p, 'shared/bt-news')).__arr.map(n => n.title); await ctx.close();
    assert(ids1.includes('Nuova dal Pannello') && ids1.includes('Scritta con l\'app di oggi') && ids1.includes('Prima notizia'), 'dopo PUBBLICA: ' + JSON.stringify(ids1));
    assert(/Scritta con l'app di oggi/.test(home), 'in Home manca la notizia dell\'app di oggi');
    assert(JSON.stringify(ids2.slice().sort()) === JSON.stringify(['Nuova dal Pannello', 'Scritta con l\'app di oggi', 'Un\'altra dall\'app di oggi'].sort()), 'dopo Elimina: ' + JSON.stringify(ids2));
    assert(!errs.length, errs.join(' | '));
  },
  async 'I4: cambiare lo stato di una gara non toglie la gara aggiunta intanto dall\'app di oggi'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    const extra = { id: 'x1', name: 'GP di Prova', circuit: 'Pista di Prova', country: 'Narnia', round: 30, date: '2026-12-20T15:00:00', status: 'IN ARRIVO', totalLaps: 50 };   // nessun circuito del 2026: resta fuori calendario
    await setDoc(p, 'shared/bt-races', { __arr: [extra] });
    await openAdmin(p, 'GARA LIVE');
    await p.selectOption('select[aria-label="Stato GP di Singapore"]', 'LIVE'); await w(p, 900);
    const races = (await doc(p, 'shared/bt-races')).__arr; await ctx.close();
    assert(races.some(r => r.name === 'GP di Prova'), 'la gara dell\'app di oggi è sparita: ' + races.map(r => r.name).join(', '));
    assert(races.find(r => r.circuitId === 'sg-2008').status === 'LIVE', 'Singapore non è LIVE');
    assert(!errs.length, errs.join(' | '));
  },
});
