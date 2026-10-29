// Prove della chat vera e della moderazione (src/services/chat.js), col Firebase finto.
// Uso: node test/unit/chat.test.js [filtro]
const assert = require('assert');
const { setupWindow } = require('./node-window');
const F = require('../../src/services/firebase');
const C = require('../../src/services/compat');
const { createChat, CHAT_MSG } = require('../../src/services/chat');

let pass = 0, fail = 0;
const tests = [];
const t = (name, fn) => tests.push([name, fn]);
const NOW = Date.parse('2026-10-07T10:00:00Z');
const ME = { name: 'Tester', aid: C.authorId('a@b.it') };
const OTHER = { name: 'Marco', aid: C.authorId('marco@b.it') };
function ctx(docs = {}) {
  const { firebase } = setupWindow({ seed: { addDocs: docs } });
  let clock = NOW;
  const chat = createChat({ ...F, now: () => clock });
  return { firebase, fake: firebase.__fake, fs: p => firebase.__fake.doc(p), chat, tick: ms => { clock += ms; } };
}

t('invio: formato {id,user,aid,txt,t} in bt-chat-generale', async () => {
  const c = ctx();
  const m = await c.chat.send('generale', '  Ciao a tutti  ', ME);
  const arr = c.fs('shared/bt-chat-generale').__arr;
  assert.strictEqual(arr.length, 1);
  assert.deepStrictEqual(Object.keys(arr[0]).sort(), ['aid', 'id', 't', 'txt', 'user']);
  assert.strictEqual(arr[0].txt, 'Ciao a tutti');
  assert.strictEqual(arr[0].user, 'Tester');
  assert.strictEqual(arr[0].aid, ME.aid);
  assert.strictEqual(arr[0].t, NOW);
  assert.strictEqual(m.mine, true);
  const room = await c.chat.loadRoom('generale', ME);
  assert.deepStrictEqual(room.map(x => [x.text, x.mine]), [['Ciao a tutti', true]]);
  await c.chat.send('live', 'Che sorpasso!', ME);
  assert.strictEqual(c.fs('shared/bt-chat-live-gara').__arr[0].txt, 'Che sorpasso!');
  await assert.rejects(c.chat.send('generale', '   ', ME), e => e.code === 'empty');
});

t('utente sospeso (con il suo aid): send rifiuta con banned', async () => {
  const c = ctx({ 'shared/bt-chat-banned': { __arr: [{ aid: ME.aid, name: 'Tester', t: 1 }] } });
  await assert.rejects(c.chat.send('generale', 'ciao', ME), e => e.code === 'banned');
  assert.strictEqual(c.fs('shared/bt-chat-generale'), undefined);
  assert.ok(/sospeso per violazione delle regole/.test(CHAT_MSG.banned));
  await c.chat.send('generale', 'ciao', OTHER);   // gli altri scrivono
  c.fake.offline = true;
  const p = c.chat.send('generale', 'senza rete', OTHER);
  await assert.rejects(p, e => e.code === 'offline');
  c.fake.offline = false;
  assert.strictEqual(CHAT_MSG.offline, 'Messaggio non inviato: controlla la connessione e riprova.');
});

// Revisione della Fase B (I5): un messaggio vecchio senza aid non dice chi l'ha scritto (il nome lo può avere chiunque).
// Come l'app di oggi quando non riesce a ricavare l'aid: non si sospende e lo si dice all'admin.
t('sospendere l\'autore di un messaggio vecchio senza aid: rifiuta "no-aid" e non scrive niente', async () => {
  const c = ctx();
  await assert.rejects(c.chat.suspend({ aid: '', name: 'Marco' }), e => e.code === 'no-aid');
  assert.strictEqual(c.fs('shared/bt-chat-banned'), undefined);
  const e = await c.chat.suspend({ aid: OTHER.aid, name: OTHER.name });   // con l'aid sì
  assert.strictEqual(e.aid, OTHER.aid);
  await assert.rejects(c.chat.send('generale', 'ciao', OTHER), x => x.code === 'banned');
});
t('messaggio rimandato dopo un invio andato male (ma arrivato lo stesso): uno solo nella stanza', async () => {
  const c = ctx();
  const F = require('../../src/services/firebase');
  let calls = 0;
  const chat = createChat({ ...F, now: () => NOW, sharedAppend: async (k, item) => { calls++; await F.sharedAppend(k, item); if (calls === 1) throw Object.assign(new Error('timeout'), { code: 'timeout' }); } });
  await assert.rejects(chat.send('generale', 'Forza!', ME), e => e.code === 'offline');
  await chat.send('generale', 'Forza!', ME);
  assert.strictEqual(c.fs('shared/bt-chat-generale').__arr.length, 1, JSON.stringify(c.fs('shared/bt-chat-generale')));
  await chat.send('generale', 'Forza!', ME);   // riscritto dopo un invio riuscito: è un messaggio nuovo
  assert.strictEqual(c.fs('shared/bt-chat-generale').__arr.length, 2);
});
t('segnalazione una sola volta per messaggio e utente', async () => {
  const c = ctx();
  await c.chat.send('fanta', 'messaggio brutto', OTHER);
  const [msg] = await c.chat.loadRoom('fanta', ME);
  await c.chat.report('fanta', msg, ME);
  await c.chat.report('fanta', msg, ME);
  const reps = c.fs('shared/bt-chat-reports').__arr;
  assert.strictEqual(reps.length, 1);
  assert.strictEqual(reps[0].room, 'fantaf1');   // chiave di oggi della stanza
  assert.strictEqual(reps[0].author, 'Marco');
  assert.strictEqual(reps[0].aid, OTHER.aid);
  assert.strictEqual(reps[0].byAid, ME.aid);
  const list = await c.chat.loadReports();
  assert.strictEqual(list[0].chatId, 'fanta');
  // moderazione: elimina il messaggio (e le sue segnalazioni), sospendi, riattiva, ignora
  await c.chat.deleteMessage('fanta', msg.id);
  assert.deepStrictEqual(c.fs('shared/bt-chat-fantaf1-talk').__arr, []);
  assert.deepStrictEqual(c.fs('shared/bt-chat-reports').__arr, []);
  const entry = await c.chat.suspend({ aid: OTHER.aid, name: 'Marco' });
  await c.chat.suspend({ aid: OTHER.aid, name: 'Marco' });
  assert.deepStrictEqual(c.fs('shared/bt-chat-banned').__arr, [{ aid: OTHER.aid, name: 'Marco', t: NOW }]);
  await assert.rejects(c.chat.send('generale', 'ci riprovo', OTHER), e => e.code === 'banned');
  await c.chat.unsuspend(entry);
  assert.deepStrictEqual(c.fs('shared/bt-chat-banned').__arr, []);
  await c.chat.send('generale', 'eccomi', OTHER);
});

t('blocchi solo sul telefono: i messaggi di quell\'utente non si vedono più', async () => {
  const c = ctx({ 'shared/bt-chat-generale': { __arr: [{ id: 'm1', user: 'Giulia R.', txt: 'vecchio senza aid', t: 1 }, { id: 'm2', user: 'Marco', aid: OTHER.aid, txt: 'ciao', t: 2 }, { id: 'm3', user: 'Marco', aid: 'u_altro', txt: 'omonimo', t: 3 }] } });
  let room = await c.chat.loadRoom('generale', ME);
  c.chat.block(room[1]);
  c.chat.block(room[0]);
  room = await c.chat.loadRoom('generale', ME);
  assert.deepStrictEqual(room.map(m => m.id), ['m3'], 'resta solo l\'omonimo con un altro aid');
  assert.deepStrictEqual(F.local.get('bt-blocked'), [{ aid: OTHER.aid, name: 'Marco' }, { aid: '', name: 'Giulia R.' }]);
  c.chat.unblock({ aid: OTHER.aid, name: 'Marco' });
  assert.deepStrictEqual(c.chat.blocked(), [{ aid: '', name: 'Giulia R.' }]);
});

t('non letti: i messaggi degli altri dopo l\'ultimo visto (bt-chat-seen-<chiave di oggi>)', async () => {
  const c = ctx();
  await c.chat.send('generale', 'uno', OTHER);
  let room = await c.chat.loadRoom('generale', ME);
  assert.strictEqual(c.chat.unread('generale', room), 1);
  c.chat.markSeen('generale', room);
  assert.strictEqual(F.local.get('bt-chat-seen-generale'), NOW);
  c.tick(60000);
  await c.chat.send('generale', 'mio', ME);
  c.tick(60000);
  await c.chat.send('generale', 'due', OTHER);
  room = await c.chat.loadRoom('generale', ME);
  assert.strictEqual(c.chat.unread('generale', room), 1, 'il mio messaggio non conta');
  F.local.set('bt-chat-seen-fantaf1', 1);   // formato vecchio: numero di messaggi letti
  await c.chat.send('fanta', 'a', OTHER); await c.chat.send('fanta', 'b', OTHER);
  assert.strictEqual(c.chat.unread('fanta', await c.chat.loadRoom('fanta', ME)), 1);
});

t('migrateLegacy: bt-chat copiato solo se la Generale non esiste', async () => {
  const old = { __arr: [{ id: 'o1', user: 'Edo', txt: 'chat vecchia', t: 1 }] };
  let c = ctx({ 'shared/bt-chat': old });
  await c.chat.migrateLegacy();
  assert.deepStrictEqual(c.fs('shared/bt-chat-generale'), old);
  c = ctx({ 'shared/bt-chat': old, 'shared/bt-chat-generale': { __arr: [{ id: 'n1', user: 'Fabio', txt: 'nuova', t: 2 }] } });
  await c.chat.migrateLegacy();
  assert.strictEqual(c.fs('shared/bt-chat-generale').__arr[0].id, 'n1');
});

t('cleanupFor: via i suoi messaggi (con aid o, senza aid, con lo stesso nome) e le segnalazioni', async () => {
  const c = ctx({
    'shared/bt-chat-generale': { __arr: [{ id: 'g1', user: 'Tester', txt: 'vecchio mio', t: 1 }, { id: 'g2', user: 'Marco', aid: OTHER.aid, txt: 'di Marco', t: 2 }] },
    'shared/bt-chat': { __arr: [{ id: 'o1', user: 'Tester', txt: 'chat vecchia', t: 1 }] },
  });
  await c.chat.send('paddock', 'mio con aid', ME);
  await c.chat.send('radio', 'di Marco', OTHER);
  const [mine] = await c.chat.loadRoom('paddock', OTHER);
  const [his] = await c.chat.loadRoom('radio', ME);
  await c.chat.report('paddock', mine, OTHER);   // segnalazione su un mio messaggio
  await c.chat.report('radio', his, ME);         // segnalazione fatta da me
  c.fake.setDoc('shared/bt-chat-banned', { __arr: [{ aid: ME.aid, name: 'Tester', t: 1 }] });
  await c.chat.cleanupFor({ name: 'Tester', aid: ME.aid, email: 'a@b.it' });
  assert.deepStrictEqual(c.fs('shared/bt-chat-generale').__arr.map(m => m.id), ['g2']);
  assert.deepStrictEqual(c.fs('shared/bt-chat').__arr, []);
  assert.deepStrictEqual(c.fs('shared/bt-chat-paddocktalk').__arr, []);
  assert.strictEqual(c.fs('shared/bt-chat-boxradio').__arr.length, 1);
  assert.deepStrictEqual(c.fs('shared/bt-chat-reports').__arr, []);
  assert.strictEqual(c.fs('shared/bt-chat-banned').__arr.length, 1, 'le sospensioni le cambia solo l\'admin');
});

// ── 25/10: reazioni e profilo veloce ────────────────────────────────────
t('reazioni: una per persona; si cambia e si toglie; nella stanza come voci re', async () => {
  const c = ctx();
  const his = await c.chat.send('generale', 'Che sorpasso!', OTHER);
  await c.chat.react('generale', his.id, '👍', ME);
  let room = await c.chat.loadRoom('generale', ME);
  assert.deepStrictEqual(room.map(m => m.id), [his.id], 'la reazione non è un messaggio');
  assert.deepStrictEqual([room[0].myReaction, room[0].reactions], ['👍', [{ e: '👍', n: 1, mine: true }]]);
  c.tick(1000);
  await c.chat.react('generale', his.id, '❤️', ME);
  await c.chat.react('generale', his.id, '❤️', OTHER);
  const arr = c.fs('shared/bt-chat-generale').__arr;
  assert.strictEqual(arr.filter(x => x.re === his.id && x.aid === ME.aid).length, 1, 'una sola reazione mia');
  room = await c.chat.loadRoom('generale', ME);
  assert.deepStrictEqual(room[0].reactions, [{ e: '❤️', n: 2, mine: true }]);
  await c.chat.react('generale', his.id, null, ME);
  room = await c.chat.loadRoom('generale', ME);
  assert.deepStrictEqual([room[0].myReaction, room[0].reactions], [null, [{ e: '❤️', n: 1, mine: false }]]);
  await assert.rejects(c.chat.react('generale', his.id, '💩', ME), e => e.code === 'reaction');
});

t('reazioni: chi è sospeso non reagisce; quelle di un bloccato non si contano; tolto il messaggio vanno via', async () => {
  const c = ctx({ 'shared/bt-chat-banned': { __arr: [{ aid: OTHER.aid, name: 'Marco', t: 1 }] } });
  const mine = await c.chat.send('generale', 'ciao', ME);
  await assert.rejects(c.chat.react('generale', mine.id, '👍', OTHER), e => e.code === 'banned');
  c.fake.setDoc('shared/bt-chat-banned', { __arr: [] });
  await c.chat.react('generale', mine.id, '😂', OTHER);
  assert.strictEqual((await c.chat.loadRoom('generale', ME))[0].reactions[0].n, 1);
  c.chat.block({ aid: OTHER.aid, from: 'Marco' });
  assert.deepStrictEqual((await c.chat.loadRoom('generale', ME))[0].reactions, [], 'reazione di un bloccato');
  await c.chat.deleteMessage('generale', mine.id);
  assert.deepStrictEqual(c.fs('shared/bt-chat-generale').__arr, [], 'messaggio e reazioni tolti');
});

t('profilo veloce: viaggia col messaggio solo quando cambia (o dopo una settimana)', async () => {
  const c = ctx();
  const P = { t: 'ferrari', d: 'leclerc', f: 'vivo', w: ['casco'] };
  await c.chat.send('generale', 'uno', { ...ME, p: P });
  c.tick(1000); await c.chat.send('generale', 'due', { ...ME, p: { ...P } });
  c.tick(1000); await c.chat.send('generale', 'tre', { ...ME, p: { ...P, w: ['casco', 'pitcrew'] } });
  c.tick(1000); await c.chat.send('live', 'altra stanza', { ...ME, p: { ...P, w: ['casco', 'pitcrew'] } });
  c.tick(8 * 86400000); await c.chat.send('generale', 'dopo una settimana', { ...ME, p: { ...P, w: ['casco', 'pitcrew'] } });
  const arr = c.fs('shared/bt-chat-generale').__arr;
  assert.deepStrictEqual(arr.map(m => !!m.p), [true, false, true, true]);
  assert.ok(c.fs('shared/bt-chat-live-gara').__arr[0].p, 'in un\'altra stanza il profilo va col primo messaggio');
  const room = await c.chat.loadRoom('generale', OTHER);
  assert.deepStrictEqual(room.map(m => m.prof && m.prof.w.length), [2, 2, 2, 2]);   // 29/10: ogni messaggio ha l'ultimo profilo dell'autore
});

t('link in chat: si manda anche senza testo (al posto del testo il titolo, per l\'app di oggi)', async () => {
  const c = ctx();
  await c.chat.send('generale', '', ME, { t: 'driver', id: 'leclerc', ti: 'Charles Leclerc', su: 'Ferrari' });
  await c.chat.send('generale', 'Che giro!', ME, { t: 'ghost', ti: 'Baku · curva 4', s: 'baku2026q', a: 'LEC', b: 'VER', n: 4 });
  const arr = c.fs('shared/bt-chat-generale').__arr;
  assert.deepStrictEqual(arr.map(m => [m.txt, m.k && m.k.t]), [['Charles Leclerc', 'driver'], ['Che giro!', 'ghost']]);
  const room = await c.chat.loadRoom('generale', ME);
  assert.strictEqual(room[1].link.n, 4);
  await assert.rejects(c.chat.send('generale', '', ME, { t: 'nope', ti: 'x' }), e => e.code === 'empty');
});

t('profilo nella stanza: si manda entrando, una volta sola finché non cambia (e la vecchia voce va via)', async () => {
  const c = ctx();
  const me = { ...ME, p: { t: 'ferrari' } };
  assert.strictEqual(await c.chat.announce('generale', me), true);
  assert.strictEqual(await c.chat.announce('generale', me), false);
  await c.chat.announce('generale', { ...ME, p: { t: 'mclaren' } });
  const arr = c.fs('shared/bt-chat-generale').__arr;
  assert.deepStrictEqual(arr.map(x => [x.pe, x.p && x.p.t, x.aid]), [[1, 'mclaren', ME.aid]]);
  assert.strictEqual((await c.chat.loadRoom('generale', ME)).length, 0);
  // Il messaggio dopo non porta di nuovo lo stesso profilo.
  await c.chat.send('generale', 'ciao', { ...ME, p: { t: 'mclaren' } });
  assert.strictEqual(c.fs('shared/bt-chat-generale').__arr[1].p, undefined);
});

(async () => {
  const filter = process.argv[2] ? new RegExp(process.argv[2], 'i') : null;
  for (const [name, fn] of tests) {
    if (filter && !filter.test(name)) continue;
    try { await fn(); pass++; console.log('PASS  ' + name); }
    catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); }
  }
  console.log(`\n${pass} passati, ${fail} falliti`);
  process.exit(fail ? 1 : 0);
})();
