// Task 8: chat vera e moderazione come nell'app di oggi (stanze su Firebase, segnalazioni, sospensioni, blocchi,
// non letti, eliminazione dei messaggi con l'account).
// Uso: node test/build-test.js && node test/e2e/run32-chat.js [filtro]
const { open, w, text, tapText, tapSel, goTab, login, openAdmin, assert, run } = require('./helpers');
const { authorId } = require('../../src/services/compat');

const doc = (p, path) => p.evaluate(x => window.firebase.__fake.doc(x), path);
const toast = p => p.evaluate(() => { const t = document.querySelector('.toast'); return t ? t.innerText : ''; });
async function openChats(p) { await goTab(p, 'RACE'); await tapSel(p, '[data-race-chat]'); await w(p, 500); }
async function openRoom(p, name = 'Chat Generale') { await openChats(p); await tapText(p, name); await w(p, 600); }
async function say(p, msg) { await p.fill('input[placeholder="Scrivi un messaggio…"]', msg); await w(p, 100); await tapSel(p, '[aria-label="Invia"]'); await w(p, 600); }
const T0 = Date.parse('2026-10-07T09:00:00Z');
const MARCO = { aid: authorId('marco@b.it'), name: 'Marco' };
const ROOM = { 'shared/bt-chat-generale': { __arr: [
  { id: 'mm1', user: 'Marco', aid: MARCO.aid, txt: 'Messaggio da segnalare', t: T0 },
  { id: 'gg1', user: 'Giulia', aid: authorId('giulia@b.it'), txt: 'Ciao da Giulia', t: T0 + 1000 },
] } };

run({
  async 'il messaggio resta dopo aver ricaricato'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await openRoom(p); await say(p, 'Ciao dalla prova');
    const stored = await doc(p, 'shared/bt-chat-generale');
    await p.reload(); await w(p, 1000);
    await openRoom(p);
    const t = await text(p); await ctx.close();
    const m = stored && stored.__arr && stored.__arr[0];
    assert(m && m.txt === 'Ciao dalla prova' && m.user === 'Tester' && m.aid === authorId('a@b.it') && typeof m.t === 'number', 'messaggio salvato: ' + JSON.stringify(m));
    assert(/Ciao dalla prova/.test(t), 'dopo aver ricaricato il messaggio non c\'è più');
    assert(!/Ragazzi pronti per il weekend/.test(t), 'ci sono ancora i messaggi d\'esempio della 2.0');
    assert(!errs.length, errs.join(' | '));
  },

  async 'blocco: i messaggi di quell\'utente spariscono anche dopo aver ricaricato'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: ROOM } }); await login(p);
    await openRoom(p);
    await tapSel(p, '[aria-label="Opzioni messaggio di Marco"]'); await w(p, 300);
    await tapText(p, 'Blocca Marco'); await w(p, 400);
    const t1 = await text(p);
    await p.reload(); await w(p, 1000);
    await openRoom(p);
    const t2 = await text(p);
    await tapSel(p, '[aria-label="Indietro"]').catch(() => {}); await w(p, 300);
    await tapSel(p, '[aria-label="Profilo"]').catch(async () => { await goTab(p, 'HOME'); await tapSel(p, '[aria-label="Profilo"]'); }); await w(p, 400);
    const prof = await text(p); await ctx.close();
    assert(!/Messaggio da segnalare/.test(t1) && /Ciao da Giulia/.test(t1), 'dopo il blocco: ' + t1.slice(0, 300));
    assert(!/Messaggio da segnalare/.test(t2) && /Ciao da Giulia/.test(t2), 'dopo aver ricaricato il messaggio bloccato è tornato');
    assert(/UTENTI BLOCCATI/.test(prof) && /Marco/.test(prof), 'nel profilo manca l\'utente bloccato');
    assert(!errs.length, errs.join(' | '));
  },

  async 'segnalazione: arriva nel Pannello Admin con stanza e autore; SOSPENDI impedisce di scrivere'(b) {
    const seed = {
      addDocs: { ...ROOM, 'users/marco@b.it': { name: 'Marco', nick: 'Marco', email: 'marco@b.it', about: { birth: null, follow: 1, fan: 'vivo' } } },
      users: { 'a@b.it': { pw: 'x', uid: 'uid-a' }, 'marco@b.it': { pw: 'abcdef', uid: 'uid-m' } },
    };
    const { ctx, p, errs } = await open(b, { seed }); await login(p);
    await openRoom(p);
    await tapSel(p, '[aria-label="Opzioni messaggio di Marco"]'); await w(p, 300);
    await tapText(p, 'Segnala'); await w(p, 600);
    const msg = await toast(p);
    await tapSel(p, '[aria-label="Indietro"]').catch(() => {}); await w(p, 300);
    await goTab(p, 'HOME').catch(() => {});
    await openAdmin(p, 'CHAT'); await w(p, 800);
    const admin = await text(p);
    await tapText(p, 'SOSPENDI Marco'); await w(p, 600);
    const banned = await doc(p, 'shared/bt-chat-banned');
    await tapSel(p, '[aria-label="Indietro"]').catch(() => {}); await w(p, 300);
    await tapText(p, 'Esci', { exact: true }); await w(p, 500);
    await login(p, { email: 'marco@b.it', pw: 'abcdef' });
    await openRoom(p); await say(p, 'Provo a scrivere');
    const blockedMsg = await toast(p);
    const room = await doc(p, 'shared/bt-chat-generale'); await ctx.close();
    assert(/Segnalazione inviata/.test(msg), 'avviso della segnalazione: ' + msg);
    assert(/SEGNALAZIONI \(1\)/.test(admin) && /Chat Generale · scritto da Marco/.test(admin) && /Messaggio da segnalare/.test(admin), 'nel Pannello Admin: ' + admin.slice(0, 400));
    assert(banned && banned.__arr.length === 1 && banned.__arr[0].aid === MARCO.aid && banned.__arr[0].name === 'Marco', 'bt-chat-banned: ' + JSON.stringify(banned));
    assert(/Non puoi più scrivere in chat: il tuo account è stato sospeso/.test(blockedMsg), 'l\'utente sospeso scrive ancora: ' + blockedMsg);
    assert(!room.__arr.some(m => m.txt === 'Provo a scrivere'), 'il messaggio dell\'utente sospeso è stato salvato');
    assert(!errs.length, errs.join(' | '));
  },

  async 'non letti: il numero vero dopo un messaggio nuovo'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: ROOM } }); await login(p);
    await openChats(p);
    const first = await p.evaluate(() => [...document.querySelectorAll('[data-chat-unread]')].map(e => e.getAttribute('data-chat-unread') + ':' + e.innerText));
    await tapText(p, 'Chat Generale'); await w(p, 600);
    await tapSel(p, '[aria-label="Indietro"]'); await w(p, 400);
    await p.evaluate(t => { const d = window.firebase.__fake.doc('shared/bt-chat-generale'); d.__arr.push({ id: 'nuovo', user: 'Giulia', aid: 'u_giulia', txt: 'Messaggio nuovo', t }); window.firebase.__fake.setDoc('shared/bt-chat-generale', d); }, Date.parse('2026-10-07T09:59:00Z'));
    await tapSel(p, '[aria-label="Indietro"]').catch(() => {}); await w(p, 300);
    await openChats(p); await w(p, 400);
    const after = await p.evaluate(() => [...document.querySelectorAll('[data-chat-unread]')].map(e => e.getAttribute('data-chat-unread') + ':' + e.innerText));
    await ctx.close();
    assert(first.join() === 'generale:2', 'non letti all\'inizio (2 messaggi della Generale): ' + JSON.stringify(first));
    assert(after.join() === 'generale:1', 'non letti dopo un messaggio nuovo: ' + JSON.stringify(after));
    assert(!errs.length, errs.join(' | '));
  },

  async 'stanza vuota: "Nessun messaggio: scrivi tu il primo!"'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await openRoom(p, 'Paddock Talk');
    const t = await text(p); await ctx.close();
    assert(/Nessun messaggio: scrivi tu il primo!/.test(t), 'stanza vuota senza il messaggio');
    assert(!errs.length, errs.join(' | '));
  },

  async 'Live Gara con una gara LIVE: la fascia "LIVE: <gara>"'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await openAdmin(p, 'GARA LIVE');
    await p.selectOption('select[aria-label="Stato GP di Singapore"]', 'LIVE'); await w(p, 600);
    await tapSel(p, '[aria-label="Indietro"]').catch(() => {}); await w(p, 300);
    await tapSel(p, '[aria-label="Indietro"]').catch(() => {}); await w(p, 300);
    await openRoom(p, 'Live Gara');
    const t = await text(p); await ctx.close();
    assert(/LIVE: GP di Singapore/.test(t), 'nella stanza Live Gara manca la fascia della gara in diretta');
    assert(!errs.length, errs.join(' | '));
  },

  async 'senza rete: "Messaggio non inviato" e il testo torna nel campo'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await openRoom(p);
    await p.evaluate(() => { window.firebase.__fake.failWrites = true; });
    await say(p, 'Non parte');
    const msg = await toast(p);
    const draft = await p.evaluate(() => document.querySelector('input[placeholder="Scrivi un messaggio…"]').value);
    const t = await text(p); await ctx.close();
    assert(msg === 'Messaggio non inviato: controlla la connessione e riprova.', 'avviso: ' + msg);
    assert(draft === 'Non parte', 'il testo non è tornato nel campo: "' + draft + '"');
    assert(!/Non parte/.test(t), 'il messaggio non inviato è rimasto in chat');
    assert(!errs.length, errs.join(' | '));
  },

  async 'eliminazione account: spariscono anche i suoi messaggi'(b) {
    const { ctx, p, errs } = await open(b);
    await tapText(p, 'REGISTRATI', { exact: true }); await w(p, 300);
    await p.fill('#regName', 'Fabio'); await p.fill('#authEmail', 'fabio@b.it'); await p.fill('#authPw', 'abcdef'); await p.fill('#regPw2', 'abcdef');
    await tapSel(p, '[data-fan-option="vivo"]'); await tapText(p, 'CREA ACCOUNT', { exact: true }); await w(p, 1500);
    await openRoom(p); await say(p, 'Messaggio di Fabio');
    await tapSel(p, '[aria-label="Indietro"]').catch(() => {}); await w(p, 300);
    await goTab(p, 'HOME').catch(() => {});
    await tapSel(p, '[aria-label="Profilo"]'); await w(p, 400);
    await tapText(p, 'Elimina account'); await w(p, 300);
    await p.fill('#delPw', 'abcdef'); await tapText(p, 'ELIMINA DEFINITIVAMENTE'); await w(p, 1500);
    const room = await doc(p, 'shared/bt-chat-generale'); await ctx.close();
    assert(room && !room.__arr.some(m => m.txt === 'Messaggio di Fabio'), 'il messaggio dell\'account eliminato è ancora in chat');
    assert(!errs.length, errs.join(' | '));
  },
});
