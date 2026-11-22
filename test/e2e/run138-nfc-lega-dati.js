// 22/11 sera (Edoardo: "quando poi scrivevo aggiungi la lega, in realtà ne aggiungeva una nuova ... adesso il mio account
// è stato rimosso completamente dalla lega, quella generale"): entrando in una lega con l'NFC le altre leghe dell'account
// (la lega B&T di tutti) devono restare, nel documento della lega devono restare nome, proprietario e gli altri membri.
// Uso: node test/build-test.js && node test/e2e/run138-nfc-lega-dati.js [filtro]
const { open, w, tapSel, tapText, goTab, login, assert, run } = require('./helpers');
const { authorId } = require('../../src/services/compat');
const Invite = require('../../src/logic/invite');

const ME = authorId('a@b.it'), EDO = authorId('edo@b.it');
const BT = 'BT-M7AS';
const PHONE = () => {
  const ls = {};
  window.__nfc = { shared: [], reads: 0 };
  const BtNfc = {
    status: async () => ({ supported: true, enabled: true, hce: true }),
    share: async ({ url }) => { window.__nfc.shared.push(url); return { ok: true }; },
    stopShare: async () => ({}),
    startRead: async () => { window.__nfc.reads++; if (window.__nfcNext) setTimeout(() => (ls.nfcUrl || []).forEach(f => f({ url: window.__nfcNext })), 500); return {}; },
    stopRead: async () => ({}),
    takePending: async () => ({ url: window.__nfcPending || null }),
    addListener: async (ev, f) => { (ls[ev] = ls[ev] || []).push(f); return { remove: () => {} }; },
  };
  window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'android', Plugins: { BtNfc } };
};
const mem = (name, team) => ({ name, team, log: [], bonus: 0 });
const SEED = {
  ['fanta/lega-' + BT]: { name: 'Lega B&T', owner: EDO, created: 1, members: { [EDO]: mem('Edoardo', 'Scuderia Edo'), [ME]: mem('Tester', 'Scuderia B&T'), u9: mem('Giulia', 'Rossa') } },
  'fanta/lega-BT-EDO1': { name: 'Amici di Edo', owner: EDO, created: 2, members: { [EDO]: mem('Edoardo', 'Scuderia Edo') } },
  'users/a@b.it': { name: 'Tester', nick: 'Tester', email: 'a@b.it', about: { birth: null, follow: 2, fan: 'vivo' }, app2: { leagues: [BT], autoLeagues: [BT] } },
};
const LINK = Invite.link({ code: 'BT-EDO1', name: 'Amici di Edo', from: 'Edoardo' });
const until = async (fn, ms = 9000) => { const t0 = Date.now(); for (;;) { const v = await fn(); if (v || Date.now() - t0 > ms) return v; await new Promise(r => setTimeout(r, 250)); } };
const state = p => p.evaluate(() => {
  const f = window.firebase.__fake, l = f.doc('fanta/lega-BT-EDO1'), bt = f.doc('fanta/lega-BT-M7AS'), u = f.doc('users/a@b.it');
  const live = d => (d ? Object.keys(d.members || {}).filter(k => !d.members[k].gone) : []);
  return { edo: l && { name: l.name, owner: l.owner, members: live(l) }, bt: bt && { name: bt.name, members: live(bt) }, mine: u && u.app2 ? u.app2.leagues : null };
});
const check = (s, tag) => {
  assert(s.edo && s.edo.name === 'Amici di Edo' && s.edo.owner === authorId('edo@b.it'), tag + ': la lega di Edoardo resta sua e col suo nome: ' + JSON.stringify(s.edo));
  assert(s.edo.members.length === 2 && s.edo.members.includes(authorId('edo@b.it')) && s.edo.members.includes(ME), tag + ': Edoardo e il nuovo: ' + JSON.stringify(s.edo));
  assert(s.bt && s.bt.members.length === 3 && s.bt.members.includes(authorId('edo@b.it')), tag + ': la lega B&T non perde nessuno: ' + JSON.stringify(s.bt));
  assert(Array.isArray(s.mine) && s.mine.includes(BT) && s.mine.includes('BT-EDO1'), tag + ': nell\'account tutte e due le leghe: ' + JSON.stringify(s.mine));
};

run({
  async 'Entra col tocco (lettura nell\'app): resta nella lega B&T e entra in quella di Edoardo'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: SEED }, capacitor: PHONE });
    await login(p); await w(p, 1500);
    await p.evaluate(u => { window.__nfcNext = u; }, LINK);
    await tapSel(p, '[aria-label="Profilo"]'); await w(p, 500); await tapText(p, 'NFC: avvicina e fai'); await w(p, 500);
    await tapSel(p, '[data-nfc-go="leggi"]');
    await until(() => p.evaluate(() => /Entra nella lega/.test((document.querySelector('[data-nfc-sheet="invito"]') || {}).innerText || '')));
    await tapSel(p, '[data-nfc-join]'); await w(p, 2500);
    const s = await state(p);
    await tapSel(p, '[data-nfc-fanta]'); await w(p, 800);
    const chips = await p.evaluate(() => [...document.querySelectorAll('[data-league]')].map(e => e.getAttribute('data-league')));
    const card = await p.evaluate(() => { const e = document.querySelector('[data-league-card]'); return e && e.getAttribute('data-league-card'); });
    await ctx.close();
    check(s, 'lettura nell\'app');
    assert(chips.length === 2 && chips.includes(BT) && chips.includes('BT-EDO1'), 'nel FANTA le due leghe: ' + JSON.stringify(chips));
    // 22/11 sera (Edoardo: "devi uscire e rientrare dall'app per far vedere che sei entrato"): si apre la lega appena entrata
    assert(card === 'BT-EDO1', '"Vai alla classifica" apre la lega in cui si è appena entrati, non la prima: ' + card);
    assert(!errs.length, errs.join(' | '));
  },

  async 'Entra col codice mentre le leghe si stanno ancora leggendo: la lega nuova non sparisce (niente uscire e rientrare)'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: SEED }, capacitor: PHONE });
    await login(p); await w(p, 1200);
    await p.evaluate(() => { window.firebase.__fake.slowOnce = { 'fanta/lega-BT-M7AS': 3000 }; });
    await goTab(p, 'FANTA'); await w(p, 300);   // entrando nel FANTA le leghe si rileggono (risposta lenta)
    await tapText(p, 'Entra con un codice', { exact: true }); await w(p, 200);
    await p.fill('#leagueDraft', 'BT-EDO1');
    await tapText(p, 'Entra', { exact: true }); await w(p, 4500);   // la risposta lenta arriva dopo l'ingresso
    const r = await p.evaluate(() => ({ chips: [...document.querySelectorAll('[data-league]')].map(e => e.getAttribute('data-league')), card: (document.querySelector('[data-league-card]') || { getAttribute: () => null }).getAttribute('data-league-card') }));
    const s = await state(p);
    await ctx.close();
    check(s, 'codice');
    assert(r.chips.includes('BT-EDO1') && r.chips.includes(BT) && r.card === 'BT-EDO1', 'la lega nuova resta sullo schermo: ' + JSON.stringify(r));
    assert(!errs.length, errs.join(' | '));
  },

  async 'App aperta da Android col link (telefono avvicinato con l\'app chiusa): Entra subito, le leghe restano'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: SEED }, capacitor: PHONE, init: `window.__nfcPending = ${JSON.stringify(LINK)};` });
    await login(p);
    // si tocca Entra appena compare, anche se i dati dell'account stanno ancora arrivando
    await until(() => p.evaluate(() => { const b = document.querySelector('[data-nfc-sheet="invito"] [data-nfc-join]'); if (b && /Entra nella lega/.test(b.textContent)) { b.click(); return true; } return false; }), 6000);
    await w(p, 3000);
    const s = await state(p);
    await ctx.close();
    check(s, 'app aperta dal link');
    assert(!errs.length, errs.join(' | '));
  },
});
