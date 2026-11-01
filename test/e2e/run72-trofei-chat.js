// 25/10: trofei da Firebase e chat più ricca.
// - Trofei: Pit crew in 2,35 secondi o meno; nome, testo, obiettivo e "spento" da shared/bt-trophies; l'app di un admin
//   crea il documento coi valori di serie se manca; il pilota del giorno votato nella prova DEMO vale per il trofeo.
// - Chat: toccando il nome si vede il profilo veloce (tifo, casco, trofei, Segnala); reazioni con le emoji come su
//   WhatsApp (una per persona, si cambia o si toglie).
// Uso: node test/build-test.js && node test/e2e/run72-trofei-chat.js [filtro]
const { open, w, tapText, tapSel, goTab, login, openAdmin, assert, run } = require('./helpers');
const { authorId } = require('../../src/services/compat');
const Trophies = require('../../src/logic/trophies');

const USER = app2 => ({ 'users/a@b.it': { name: 'Tester', nick: 'Tester', email: 'a@b.it', about: { birth: 1999, follow: 2, fan: 'vivo', years: 5 }, app2 } });
const doc = (p, path) => p.evaluate(x => window.firebase.__fake.doc(x), path);
const openProfile = async p => { await tapSel(p, '[aria-label="Profilo"]'); await w(p, 600); };
const row = (p, id) => p.evaluate(x => { const e = document.querySelector(`[data-trophy="${x}"]`); return e ? { won: e.getAttribute('data-won'), text: e.innerText.replace(/\s+/g, ' ') } : null; }, id);
const caseHead = p => p.evaluate(() => { const e = document.querySelector('[data-trophies]'); return e ? e.innerText.replace(/\s+/g, ' ') : ''; });
const openTrophies = async p => { await tapSel(p, '[data-trophies] button'); await w(p, 300); };

// Chat
const T0 = Date.parse('2026-10-07T09:00:00Z');
const MARCO = { aid: authorId('marco@b.it'), name: 'Marco' }, ME = authorId('a@b.it');
const MARCO_P = { t: 'ferrari', d: 'leclerc', f: 'vivo', h: { base: '#E8002D', c1: '#FFFFFF', c2: '#111111', pattern: 'flames', visor: 'smoke', finish: 'gloss' }, w: ['pitcrew', 'sgasata'] };
const ROOM = { 'shared/bt-chat-generale': { __arr: [
  { id: 'mm1', user: 'Marco', aid: MARCO.aid, txt: 'Forza Ferrari', t: T0, p: MARCO_P },
  { id: 'gg1', user: 'Giulia', aid: authorId('giulia@b.it'), txt: 'Ciao da Giulia', t: T0 + 1000 },
  { id: 'mm2', user: 'Marco', aid: MARCO.aid, txt: 'Domenica si vince', t: T0 + 2000 },
  { id: 'rg1', user: 'Giulia', aid: authorId('giulia@b.it'), re: 'mm1', e: '👍', t: T0 + 3000 },
] } };
const toast = p => p.evaluate(() => { const t = document.querySelector('.toast'); return t ? t.innerText : ''; });
async function openRoom(p) { await goTab(p, 'RACE'); await tapSel(p, '[data-race-chat]'); await w(p, 500); await tapText(p, 'Chat Generale'); await w(p, 600); }
async function say(p, msg) { await p.fill('input[placeholder="Scrivi un messaggio…"]', msg); await w(p, 100); await tapSel(p, '[aria-label="Invia"]'); await w(p, 700); }
const sheet = p => p.evaluate(() => {
  const e = document.querySelector('[data-chat-profile]');
  if (!e) return null;
  const h = e.querySelector('[data-helmet]'), none = !!e.querySelector('[data-helmet-placeholder]');
  return { text: e.innerText.replace(/\s+/g, ' '), helmet: h && !none ? h.getAttribute('data-pattern') : null, none, trophies: [...e.querySelectorAll('[data-chat-profile-trophy]')].map(x => x.getAttribute('data-chat-profile-trophy')) };
});
const pill = (p, id) => p.evaluate(x => { const e = document.querySelector(`[data-reactions="${x}"]`); return e ? { label: e.getAttribute('aria-label'), text: e.innerText } : null; }, id);
const myReactions = (p, id) => p.evaluate(([x, me]) => ((window.firebase.__fake.doc('shared/bt-chat-generale') || { __arr: [] }).__arr).filter(m => m.re === x && m.aid === me).map(m => m.e), [id, ME]);
// Dito tenuto fermo sul messaggio per 700 ms (come sul telefono).
async function hold(p, cdp, sel) {
  const r = await p.evaluate(s => { const e = document.querySelector(s); e.scrollIntoView({ block: 'center' }); const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }, sel);
  await w(p, 200);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x, y: r.y }] });
  await w(p, 700);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await w(p, 400);
}
const menuState = p => p.evaluate(() => {
  const btns = [...document.querySelectorAll('button')].map(b => b.textContent.trim());
  return { bar: !!document.querySelector('[data-react-bar]'), report: btns.includes('Segnala messaggio'), block: btns.some(t => t.startsWith('Blocca ')) };
});

run({
  async 'Pit crew: 2,35 secondi bastano (prima serviva meno di 2,5)'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: USER({ pitBest: 2.35 }) } });
    await login(p); await w(p, 800);
    await openProfile(p); await openTrophies(p);
    const r = await row(p, 'pitcrew');
    await ctx.close();
    assert(r && r.won === '1', 'con 2,35 s il Pit crew non arriva: ' + JSON.stringify(r));
    assert(!errs.length, errs.join(' | '));
  },

  async 'Pit crew: 2,40 secondi non bastano più'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: USER({ pitBest: 2.4 }) } });
    await login(p); await w(p, 800);
    await openProfile(p); await openTrophies(p);
    const r = await row(p, 'pitcrew');
    await ctx.close();
    assert(r && r.won === '0' && /2,35/.test(r.text), 'con 2,40 s il Pit crew non deve arrivare: ' + JSON.stringify(r));
    assert(!errs.length, errs.join(' | '));
  },

  // Prima il voto della prova DEMO non contava e il trofeo non arrivava mai a chi provava l'app con la DEMO.
  // 31/10: la DEMO c'e' solo per l'admin, che ha gia' tutti i trofei: il voto si da', resta sul telefono, il trofeo c'e'.
  async 'pilota del giorno votato nella prova DEMO: si vota, resta sul telefono, "Voce del paddock" c\'e\''(b) {
    const { ctx, p, errs } = await open(b); await login(p); await w(p, 600);
    const back2 = async () => { await tapSel(p, '[aria-label="Indietro"]'); await w(p); await tapSel(p, '[aria-label="Indietro"]'); await w(p); };
    await openAdmin(p, 'GARA LIVE'); await tapText(p, 'AVVIA GARA', { exact: true }); await w(p, 300); await back2();
    await openAdmin(p, 'GARA LIVE'); await tapText(p, 'ULTIMO GIRO', { exact: true }); await w(p, 300); await back2();
    await goTab(p, 'RACE'); await w(p, 300);
    await tapSel(p, '[data-dotd] [data-vote-kind="driver"] [data-vote-open]'); await w(p, 300);
    const opt = await p.evaluate(() => { const e = document.querySelector('[data-vote-option]'); return e && e.getAttribute('data-vote-option'); });
    await tapSel(p, `[data-vote-option="${opt}"]`); await w(p, 700);
    const voted = await p.evaluate(() => { const e = document.querySelector('[data-dotd] [data-vote-kind="driver"]'); return e ? e.innerText.replace(/\s+/g, ' ') : ''; });
    const u = await doc(p, 'users/a@b.it'), dotd = u && u.app2 && u.app2.dotd;
    await goTab(p, 'HOME'); await openProfile(p); await openTrophies(p);
    const r = await row(p, 'paddock');
    await ctx.close();
    assert(opt, 'non si riesce a votare il pilota del giorno nella prova DEMO');
    assert(/Hai votato/.test(voted), 'dopo il voto nella DEMO non si vede "Hai votato": ' + voted);
    assert(!dotd || !Object.keys(dotd).length, 'il voto della DEMO non deve finire su Firebase: ' + JSON.stringify(dotd));
    assert(r && r.won === '1', '"Voce del paddock" per l\'admin: ' + JSON.stringify(r));
    assert(!errs.length, errs.join(' | '));
  },

  async 'trofei da Firebase: nome e obiettivo cambiati, un trofeo spento'(b) {
    const seed = { addDocs: { ...USER({ pitBest: 2.2 }), 'shared/bt-trophies': { pitcrew: { name: 'Pit crew pro', how: 'Pit Stop Challenge in 2,10 secondi', goal: 2.1 }, sgasata: { attivo: false } } } };
    const { ctx, p, errs } = await open(b, { seed });
    await login(p); await w(p, 800);
    await openProfile(p);
    const head = await caseHead(p);
    await openTrophies(p);
    const r = await row(p, 'pitcrew'), egg = await row(p, 'sgasata');
    const fs = await doc(p, 'shared/bt-trophies');
    await ctx.close();
    assert(new RegExp('di ' + (Trophies.TROPHIES.length - 1) + ' trofei').test(head), 'con un trofeo spento la bacheca deve contarne uno in meno: ' + head);
    assert(r && r.won === '0' && /Pit crew pro/.test(r.text) && /2,10 secondi/.test(r.text), 'Pit crew da Firebase: ' + JSON.stringify(r));
    assert(!egg, 'il trofeo spento si vede ancora: ' + JSON.stringify(egg));
    assert(fs && fs.pitcrew.goal === 2.1 && !fs.casco, 'l\'app non deve riscrivere il documento dei trofei: ' + JSON.stringify(fs));
    assert(!errs.length, errs.join(' | '));
  },

  async 'admin: shared/bt-trophies si crea coi valori di serie se manca'(b) {
    const { ctx, p, errs } = await open(b, { seed: { admin: true } });
    await login(p); await w(p, 1200);
    const fs = await doc(p, 'shared/bt-trophies');
    await ctx.close();
    assert(fs && Object.keys(fs).length === Trophies.TROPHIES.length, 'documento dei trofei: ' + JSON.stringify(fs));
    assert(fs.pitcrew.goal === 2.35 && fs.pitcrew.attivo === true && Object.values(fs).every(t => t.attivo === true) && /2,35/.test(fs.pitcrew.how), 'Pit crew nel documento: ' + JSON.stringify(fs.pitcrew));
    assert(!errs.length, errs.join(' | '));
  },

  // ── Chat ──────────────────────────────────────────────────────────────
  async 'chat: toccando il nome si vede il profilo veloce (tifo, casco, trofei) e si può segnalare'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: ROOM } });
    await login(p); await openRoom(p);
    await tapSel(p, '[data-chat-author="mm2"]'); await w(p, 400);   // il messaggio senza profilo: vale il più recente che ce l'ha
    const s = await sheet(p);
    await tapSel(p, '[data-chat-profile-report]'); await w(p, 700);
    const msg = await toast(p), gone = await p.evaluate(() => !document.querySelector('[data-chat-profile]'));
    await tapSel(p, '[data-chat-author="gg1"]'); await w(p, 400);
    const g = await sheet(p);
    const reps = await doc(p, 'shared/bt-chat-reports');
    await ctx.close();
    assert(s, 'toccando il nome non si apre il profilo');
    assert(/Tifa Ferrari/.test(s.text) && /Pilota del cuore: Charles Leclerc/.test(s.text) && /Vivo e respiro F1!/.test(s.text), 'tifo nel profilo: ' + s.text);
    assert(s.helmet === 'flames', 'casco nel profilo: ' + s.helmet);
    assert(new RegExp('2 di ' + Trophies.TROPHIES.length).test(s.text) && s.trophies.includes('pitcrew') && /Pit crew/.test(s.text), 'trofei nel profilo: ' + s.text);
    assert(/Trofeo segreto/.test(s.text) && !/Sgasata/.test(s.text), 'il trofeo segreto di un altro non deve dire il suo nome: ' + s.text);
    assert(/Segnalazione inviata/.test(msg) && gone, 'Segnala dal profilo: ' + msg);
    assert(reps && reps.__arr.length === 1 && reps.__arr[0].msgId === 'mm2' && reps.__arr[0].aid === MARCO.aid, 'segnalazione salvata: ' + JSON.stringify(reps));
    // 31/10 sera: niente più "si vedono dal suo prossimo messaggio": scheda completa coi numeri della stanza.
    assert(g && /non ha ancora condiviso casco e trofei/.test(g.text) && /MESSAGGI QUI 1/.test(g.text) && !g.helmet && g.none && !/Tifa/.test(g.text), 'profilo di chi non l\'ha ancora mandato: ' + JSON.stringify(g));
    assert(!errs.length, errs.join(' | '));
  },

  async 'chat: reazioni come su WhatsApp (si mette, si cambia, si toglie; una per persona)'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: ROOM } });
    await login(p); await openRoom(p);
    const before = await pill(p, 'mm1');
    await tapSel(p, '[aria-label="Opzioni messaggio di Marco"]'); await w(p, 300);
    const bar = await p.evaluate(() => [...document.querySelectorAll('[data-react-bar] [data-react]')].map(e => e.getAttribute('data-react')).join(''));
    await tapSel(p, '[data-react="❤️"]'); await w(p, 800);
    const put = await pill(p, 'mm1'), mine1 = await myReactions(p, 'mm1');
    await tapSel(p, '[data-reactions="mm1"]'); await w(p, 300);                      // toccando le reazioni si riapre la barra
    const pressed = await p.evaluate(() => { const e = document.querySelector('[data-react="❤️"]'); return e && e.getAttribute('aria-pressed'); });
    await tapSel(p, '[data-react="😂"]'); await w(p, 800);
    const mine2 = await myReactions(p, 'mm1'), changed = await pill(p, 'mm1');
    await tapSel(p, '[data-reactions="mm1"]'); await w(p, 300);
    await tapSel(p, '[data-react="😂"]'); await w(p, 800);                           // la stessa: si toglie
    const mine3 = await myReactions(p, 'mm1'), after = await pill(p, 'mm1');
    await p.reload(); await w(p, 1000); await openRoom(p);
    const reloaded = await pill(p, 'mm1');
    await ctx.close();
    assert(before && before.label === 'Reazioni: Mi piace 1', 'reazione di Giulia: ' + JSON.stringify(before));
    assert(bar === '👍❤️😂😮😢🙏', 'barra delle reazioni: ' + bar);
    assert(put && /Mi piace 1/.test(put.label) && /Cuore 1/.test(put.label) && put.text.includes('2'), 'dopo il cuore: ' + JSON.stringify(put));
    assert(mine1.length === 1 && mine1[0] === '❤️', 'cuore salvato: ' + JSON.stringify(mine1));
    assert(pressed === 'true', 'il cuore messo non risulta scelto nella barra');
    assert(mine2.length === 1 && mine2[0] === '😂' && /Risata 1/.test(changed.label) && !/Cuore/.test(changed.label), 'reazione cambiata: ' + JSON.stringify({ mine2, changed }));
    assert(mine3.length === 0 && after && after.label === 'Reazioni: Mi piace 1', 'reazione tolta: ' + JSON.stringify({ mine3, after }));
    assert(reloaded && reloaded.label === 'Reazioni: Mi piace 1', 'dopo aver ricaricato: ' + JSON.stringify(reloaded));
    assert(!errs.length, errs.join(' | '));
  },

  async 'chat: tenendo premuto un messaggio col dito si apre la barra delle reazioni (anche sui miei)'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: ROOM } });
    await login(p); await openRoom(p);
    const cdp = await ctx.newCDPSession(p);
    await hold(p, cdp, '[data-chat-bubble="mm1"]');
    const other = await menuState(p);
    await tapText(p, 'Annulla', { exact: true }); await w(p, 300);
    await say(p, 'Il mio messaggio');
    const myId = await p.evaluate(() => { const l = [...document.querySelectorAll('[data-chat-msg]')]; return l[l.length - 1].getAttribute('data-chat-msg'); });
    await hold(p, cdp, `[data-chat-bubble="${myId}"]`);
    const mine = await menuState(p);
    await tapSel(p, '[data-react="👍"]'); await w(p, 800);
    const myPill = await pill(p, myId);
    await ctx.close();
    assert(other.bar && other.report, 'tenendo premuto un messaggio di un altro: ' + JSON.stringify(other));
    assert(!myId.startsWith('invio-'), 'il mio messaggio non è stato salvato: ' + myId);
    assert(mine.bar && !mine.report && !mine.block, 'tenendo premuto un mio messaggio: ' + JSON.stringify(mine));
    assert(myPill && myPill.label === 'Reazioni: Mi piace 1', 'reazione al mio messaggio: ' + JSON.stringify(myPill));
    assert(!errs.length, errs.join(' | '));
  },

  async 'chat: il mio messaggio porta tifo, casco e trofei, solo quando cambiano'(b) {
    const app2 = { favTeam: 'ferrari', favDriver: 'leclerc', helmet: { base: null, c1: '#FFFFFF', c2: '#111111', pattern: 'stars', number: 16, visor: 'smoke', finish: 'gloss' }, trophies: { radio: T0, pitcrew: T0 } };
    const { ctx, p, errs } = await open(b, { seed: { addDocs: USER(app2) } });
    await login(p); await w(p, 900); await openRoom(p);
    await say(p, 'Primo'); await say(p, 'Secondo');
    const room = (await doc(p, 'shared/bt-chat-generale')).__arr;
    await ctx.close();
    // 29/10: entrando nella stanza il profilo ci va come voce a parte (pe); i messaggi non lo ripetono.
    const pe = room.find(x => x.pe === 1), [m1, m2] = room.filter(x => x.pe !== 1), P = { p: pe ? pe.p : m1 && m1.p };
    assert(m1 && P.p && P.p.t === 'ferrari' && P.p.d === 'leclerc' && P.p.f === 'vivo', 'tifo nel messaggio: ' + JSON.stringify(room));
    assert(P.p.h && P.p.h.pattern === 'stars' && P.p.h.number === 16 && /^#[0-9A-F]{6}$/i.test(P.p.h.base), 'casco nel messaggio (col colore dei tasti): ' + JSON.stringify(P.p.h));
    assert(Array.isArray(P.p.w) && P.p.w.includes('radio') && P.p.w.includes('pitcrew'), 'trofei nel messaggio: ' + JSON.stringify(P.p.w));
    assert(m2 && m2.txt === 'Secondo' && !m2.p, 'il profilo uguale non deve ripartire a ogni messaggio: ' + JSON.stringify(m2));
    assert(!errs.length, errs.join(' | '));
  },
});
