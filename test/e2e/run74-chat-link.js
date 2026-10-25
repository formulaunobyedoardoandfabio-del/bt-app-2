// 25/10: link dell'app in chat. Scrivendo @ (o col tasto del link) si apre l'elenco: notizie, gare, curve del Ghost
// Lap, team radio, piloti, scuderie, il proprio profilo, la squadra FantaF1, i traguardi del Garage, le domande del
// Fanta. In chat il link è una miniatura che si capisce da sola; toccandola si apre la pagina dell'app (Indietro torna
// in chat) o la scheda coi dettagli. "Invia in chat" su notizia, gara e curva del Ghost Lap.
// Uso: node test/build-test.js && node test/e2e/run74-chat-link.js [filtro]
const path = require('path');
const { open, w, tapText, tapSel, login, assert, run } = require('./helpers');
const { authorId } = require('../../src/services/compat');
const REAL = require(path.join(__dirname, '..', '..', 'src', 'data', 'real-data.js'));

const doc = (p, x) => p.evaluate(k => window.firebase.__fake.doc(k), x);
const T0 = Date.parse('2026-10-07T09:00:00Z');
const NEWS = { 'shared/bt-news': { __arr: [{ id: 'n1', title: 'Pole per Antonelli ad Austin', summary: 'Giro perfetto nel Q3', category: 'NEWS', content: 'Il testo della notizia di prova.', date: '2026-10-06T10:00:00Z', image: '' }] } };
const G = REAL.baku2026q, CODES = Object.keys(G.laps), CORNER = G.corners[2].n;
const ROOM = { 'shared/bt-chat-generale': { __arr: [
  { id: 'mf', user: 'Marco', aid: authorId('marco@b.it'), txt: 'La mia squadra', t: T0, k: { t: 'fanta', ti: 'La squadra di Marco', su: '2 piloti e 1 scuderie', ln: ['Charles Leclerc', 'Lewis Hamilton', 'Ferrari'] } },
  { id: 'mg', user: 'Marco', aid: authorId('marco@b.it'), txt: 'Guardate qui', t: T0 + 1000, k: { t: 'ghost', ti: `Baku · curva ${CORNER}`, s: 'baku2026q', a: CODES[1], b: CODES[0], n: CORNER } },
] } };
async function openRoom(p) { await tapSel(p, '[data-nav-tab="race"]'); await w(p, 400); await tapSel(p, '[data-race-chat]'); await w(p, 500); await tapText(p, 'Chat Generale'); await w(p, 600); }
const INPUT = 'input[placeholder="Scrivi un messaggio…"]';
const has = (p, s) => p.evaluate(x => !!document.querySelector(x), s);

run({
  async '@ apre l\'elenco: un pilota va in chat con la miniatura; toccandola si apre la scheda del pilota'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await openRoom(p);
    await p.type(INPUT, '@'); await w(p, 400);
    const picker = await has(p, '[data-link-picker]'), draft = await p.inputValue(INPUT);
    await tapSel(p, '[data-link-cat="driver"]'); await w(p, 200);
    const first = await p.evaluate(() => { const e = document.querySelector('[data-link-picker] [data-chat-link="driver"]'); return e && e.getAttribute('aria-label'); });
    await tapSel(p, '[data-link-picker] [data-chat-link="driver"]'); await w(p, 300);
    const attach = await has(p, '[data-chat-attach="driver"]');
    await tapSel(p, '[aria-label="Invia"]'); await w(p, 800);
    const msg = (await doc(p, 'shared/bt-chat-generale')).__arr[0];
    await tapSel(p, '[data-chat-msg] [data-chat-link="driver"]'); await w(p, 500);
    const modal = await p.evaluate(() => { const e = document.querySelector('[data-driver-modal]'); return e && e.getAttribute('data-driver-modal'); });
    await ctx.close();
    assert(picker && draft === '', 'scrivendo @ deve aprirsi l\'elenco (e la @ non resta nel testo): ' + JSON.stringify({ picker, draft }));
    assert(first && /^PILOTA: /.test(first) && attach, 'pilota scelto: ' + JSON.stringify({ first, attach }));
    assert(msg && msg.k && msg.k.t === 'driver' && msg.txt === msg.k.ti && msg.k.id, 'messaggio salvato: ' + JSON.stringify(msg));
    assert(modal === msg.k.id, 'toccando la miniatura si deve aprire la scheda del pilota: ' + modal);
    assert(!errs.length, errs.join(' | '));
  },

  async 'Invia in chat dalla notizia: scelgo la stanza, il link è allegato; toccandolo si apre la notizia e Indietro torna in chat'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: NEWS } }); await login(p);
    await tapText(p, 'Pole per Antonelli ad Austin'); await w(p, 500);
    await tapSel(p, '[aria-label="Condividi articolo"]'); await w(p, 500);
    await tapSel(p, '[data-share-chat="news"]'); await w(p, 300);
    await tapSel(p, '[data-room="generale"]'); await w(p, 700);
    const attach = await has(p, '[data-chat-attach="news"]');
    await p.fill(INPUT, 'Che giro!'); await tapSel(p, '[aria-label="Invia"]'); await w(p, 800);
    const msg = (await doc(p, 'shared/bt-chat-generale')).__arr[0];
    const bubble = await p.evaluate(() => { const e = document.querySelector('[data-chat-msg] [data-chat-bubble]'); return e && e.innerText.replace(/\s+/g, ' '); });
    await tapSel(p, '[data-chat-msg] [data-chat-link="news"]'); await w(p, 600);
    const article = await p.evaluate(() => document.body.innerText.includes('Il testo della notizia di prova.'));
    await tapSel(p, '[aria-label="Indietro"]'); await w(p, 500);
    const back = await has(p, INPUT);
    await ctx.close();
    assert(attach, 'scelta la stanza il link della notizia deve essere già allegato');
    assert(msg && msg.txt === 'Che giro!' && msg.k && msg.k.t === 'news' && msg.k.id === 'n1' && msg.k.ti === 'Pole per Antonelli ad Austin', 'messaggio salvato: ' + JSON.stringify(msg));
    assert(/NOTIZIA/.test(bubble) && /Pole per Antonelli ad Austin/.test(bubble) && /Che giro!/.test(bubble), 'miniatura e commento: ' + bubble);
    assert(article, 'toccando la miniatura si deve aprire la notizia');
    assert(back, 'da una notizia aperta dalla chat, Indietro deve tornare in chat');
    assert(!errs.length, errs.join(' | '));
  },

  async 'miniature degli altri: la squadra FantaF1 apre la scheda; la curva apre il Ghost Lap su quella curva'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: ROOM } }); await login(p); await openRoom(p);
    const card = await p.evaluate(() => { const e = document.querySelector('[data-chat-msg="mf"] [data-chat-link="fanta"]'); return e && e.innerText.replace(/\s+/g, ' '); });
    await tapSel(p, '[data-chat-msg="mf"] [data-chat-link="fanta"]'); await w(p, 400);
    const sheet = await p.evaluate(() => { const e = document.querySelector('[data-chat-link-sheet="fanta"]'); return e && [...e.querySelectorAll('[data-link-line]')].map(x => x.innerText); });
    await p.evaluate(() => document.querySelector('[data-chat-link-sheet]').click()); await w(p, 300);
    await tapSel(p, '[data-chat-msg="mg"] [data-chat-link="ghost"]'); await w(p, 900);
    const ghost = await p.evaluate(([n, a]) => ({ page: !!document.querySelector('[data-ghost]'), corner: (document.querySelector(`[data-ghost-corner="${n}"]`) || {}).ariaPressed || null, a: (document.querySelector(`[data-ghost-a="${a}"]`) || {}).ariaPressed || null, duel: !!document.querySelector('[data-ghost-duel]') }), [CORNER, CODES[1]]);
    await tapSel(p, '[aria-label="Indietro"]'); await w(p, 500);
    const back = await has(p, INPUT);
    await ctx.close();
    assert(card && /SQUADRA FANTAF1/.test(card) && /La squadra di Marco/.test(card), 'miniatura della squadra: ' + card);
    assert(JSON.stringify(sheet) === JSON.stringify(['Charles Leclerc', 'Lewis Hamilton', 'Ferrari']), 'scheda della squadra: ' + JSON.stringify(sheet));
    assert(ghost.page && ghost.corner === 'true' && ghost.a === 'true' && ghost.duel, 'Ghost Lap sulla curva del link: ' + JSON.stringify(ghost));
    assert(back, 'dal Ghost Lap aperto dalla chat, Indietro deve tornare in chat');
    assert(!errs.length, errs.join(' | '));
  },
});
