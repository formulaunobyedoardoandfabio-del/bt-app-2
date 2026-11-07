// Stile Duolingo (1/11, Edoardo): livello del tifoso nel Profilo, primi passi per chi è nuovo, "Bentornato" dopo 7
// giorni, promemoria programmati sul telefono (plugin finto), sfide 1 contro 1 al Pit Stop con gli amici della lega.
// Uso: node test/build-test.js && node test/e2e/run85-duolingo.js [filtro]
const { open: open0, w, norm, inner, has, tapText, tapSel, goTab, login, assert, run } = require('./helpers');
// 7/11: Pit Swipe è spento di serie e si accende dall'admin (shared/bt-flags): queste prove lo accendono.
const open = (b, o = {}) => open0(b, { ...o, seed: { ...(o.seed || {}), addDocs: { 'shared/bt-flags': { pitSwipe: true }, ...((o.seed || {}).addDocs || {}) } } });
const { authorId } = require('../../src/services/compat');

const ME = authorId('a@b.it');
const art = (id, date) => ({ id, title: 'Notizia ' + id, summary: 'Riassunto ' + id, category: 'GARA', author: 'Team B&T', image: '', published: true, date, content: 'Testo ' + id });
const NEWS = { 'shared/bt-news': { __arr: ['n1', 'n2', 'n3', 'n4', 'n5', 'n6'].map((id, i) => art(id, `2026-10-0${7 - i}T09:00:00Z`)) } };
const user = (app2 = {}) => ({ 'users/a@b.it': { name: 'Tester', email: 'a@b.it', about: { birth: 1999, follow: 2, fan: 'vivo', years: 5 }, app2 } });
const doc = (p, path) => p.evaluate(x => window.firebase.__fake.doc(x), path);
const toast = p => p.evaluate(() => { const t = document.querySelector('.toast'); return t ? t.innerText : ''; });
async function playDeck(p) { await tapSel(p, '[data-pitswipe-card]'); await w(p, 500); for (let i = 0; i < 12; i++) { if (!(await has(p, '[data-ps-card]'))) break; await tapSel(p, '[data-ps-act="box"]'); await w(p, 420); } }
const NOTIF = () => {
  window.__notif = [];
  window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'android', Plugins: { LocalNotifications: {
    checkPermissions: async () => ({ display: localStorage.getItem('perm') || 'prompt' }),
    requestPermissions: async () => { window.__notif.push(['ask']); localStorage.setItem('perm', 'granted'); return { display: 'granted' }; },
    cancel: async x => { window.__notif.push(['cancel', x.notifications.length]); },
    schedule: async x => { window.__notif.push(['schedule', x.notifications.map(n => n.title)]); },
  } } };
};

run({
  // 8/11 (Edoardo): il livello del tifoso non è più nel mio Profilo; va nel profilo pubblico e lo vedono gli altri in chat.
  async 'livello del tifoso: non nel mio Profilo, nel profilo pubblico per gli altri (nome e punti)'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: { ...NEWS, ...user({ favDriver: 'leclerc', swipe: { tot: { decks: 12, box: 30, votes: 10, tfOk: 5 } } }) } } }); await login(p); await w(p, 800);
    await tapSel(p, '[aria-label="Profilo"]'); await w(p, 600);
    const mine = await p.evaluate(() => !!document.querySelector('[data-fan-level]'));
    const pub = await p.evaluate(() => { const k = Object.keys(localStorage).find(x => x.startsWith('bt_bt-pubprof-')); try { return k ? JSON.parse(JSON.parse(localStorage.getItem(k)).j) : null; } catch (e) { return null; } });
    await ctx.close();
    assert(!mine, 'nel mio Profilo c\'è ancora il livello del tifoso');
    assert(pub && /Pilota titolare|Rookie|Caposquadra/.test(pub[3] || '') && pub[4] > 0, 'nel profilo pubblico manca il livello: ' + JSON.stringify(pub));
    assert(!errs.length, errs.join(' | '));
  },

  async 'primi passi: per chi è nuovo 3 passi (pilota, squadra, primo giro); il giro fatto si spunta; si nasconde'(b) {
    const { ctx, p, errs } = await open(b, { seed: { plainTester: true, addDocs: NEWS } }); await login(p); await w(p, 800);
    const box0 = norm(await inner(p, '[data-onboard]'));
    await playDeck(p);
    await tapSel(p, '[aria-label="Indietro"]'); await w(p, 500);
    const giro = await p.evaluate(() => { const e = document.querySelector('[data-onboard-step="giro"]'); return e && e.getAttribute('data-done'); });
    await tapSel(p, '[data-onboard-hide]'); await w(p, 300);
    const gone = !(await has(p, '[data-onboard]'));
    await ctx.close();
    assert(/Primi passi/.test(box0) && /pilota del cuore/i.test(box0) && /squadra/i.test(box0) && /primo giro/i.test(box0), 'primi passi: ' + box0);
    assert(giro === '1', 'primo giro spuntato: ' + giro);
    assert(gone, 'si nasconde');
    assert(!errs.length, errs.join(' | '));
  },

  async 'Bentornato: dopo 9 giorni via, le novità e il giro di oggi; il giorno dopo niente'(b) {
    const init = () => localStorage.setItem('bt_bt-last-seen', String(Date.parse('2026-09-28T10:00:00Z')));
    const { ctx, p, errs } = await open(b, { init, seed: { addDocs: { ...NEWS, ...user({ favDriver: 'leclerc' }) } } }); await login(p); await w(p, 1200);
    const sheet = norm(await inner(p, '[data-welcome-back]'));
    await tapText(p, 'Fai il giro di oggi'); await w(p, 500);
    const ps = await has(p, '[data-pitswipe]');
    const last = await p.evaluate(() => localStorage.getItem('bt_bt-last-seen'));
    await ctx.close();
    assert(/Bentornato/.test(sheet) && /9 giorni/.test(sheet) && /6 notizie nuove/.test(sheet), 'bentornato: ' + sheet);
    assert(ps, 'il tasto apre Pit Swipe');
    assert(Number(last) > Date.parse('2026-10-06T00:00:00Z'), 'ultima visita aggiornata: ' + last);
    const again = await open(b, { init: () => localStorage.setItem('bt_bt-last-seen', String(Date.parse('2026-10-06T10:00:00Z'))), seed: { addDocs: { ...NEWS, ...user({ favDriver: 'leclerc' }) } } });
    await login(again.p); await w(again.p, 1200);
    const none = !(await has(again.p, '[data-welcome-back]'));
    await again.ctx.close();
    assert(none, 'via da un giorno: niente Bentornato');
    assert(!errs.length, errs.join(' | '));
  },

  async 'promemoria: dopo il primo giro si chiede il permesso e si programmano; spenti dal Profilo si cancellano'(b) {
    const { ctx, p, errs } = await open(b, { capacitor: NOTIF, seed: { addDocs: { ...NEWS, ...user({ favDriver: 'leclerc' }) } } }); await login(p); await w(p, 800);
    const before = await p.evaluate(() => window.__notif.slice());
    await playDeck(p); await w(p, 600);
    const after = await p.evaluate(() => window.__notif.slice());
    await tapSel(p, '[aria-label="Indietro"]'); await w(p, 300);
    await tapSel(p, '[aria-label="Profilo"]'); await w(p, 500);
    await tapSel(p, '[role="switch"][aria-label="Promemoria sul telefono"]'); await w(p, 600);
    const off = await p.evaluate(() => window.__notif.slice(-2));
    await ctx.close();
    assert(!before.some(x => x[0] === 'ask'), 'niente richiesta di permesso all\'avvio: ' + JSON.stringify(before));
    assert(after.some(x => x[0] === 'ask') && after.some(x => x[0] === 'schedule' && x[1].includes('Il giro di oggi è pronto')), 'dopo il primo giro: ' + JSON.stringify(after));
    assert(off[off.length - 1][0] === 'cancel', 'spenti: l\'ultima cosa è cancellare: ' + JSON.stringify(off));
    assert(!errs.length, errs.join(' | '));
  },

  async 'sfida 1 contro 1: Marco ti sfida al Pit Stop, rispondi con un tentativo; il risultato in Home'(b) {
    const sfide = { 'fanta/pitswipe-sfide': { __arr: [{ t: 'c', id: 's1', from: 'marco', fromName: 'Marco', to: ME, toName: 'Tester', game: 'pit', time: 9.99, at: Date.parse('2026-10-06T10:00:00Z') }] } };
    const { ctx, p, errs } = await open(b, { seed: { addDocs: { ...NEWS, ...user({ favDriver: 'leclerc' }), ...sfide } } }); await login(p); await w(p, 800);
    const card = norm(await inner(p, '[data-duel="s1"]'));
    await tapSel(p, '[data-duel="s1"] [data-duel-play]'); await w(p, 600);
    const phase0 = await p.evaluate(() => { const e = document.querySelector('[data-pit-phase]'); return e && e.getAttribute('data-pit-phase'); });
    await tapSel(p, '[data-pit-start]');
    await p.waitForFunction(() => { const e = document.querySelector('[data-pit-phase]'); return e && e.getAttribute('data-pit-phase') === 'go'; }, null, { timeout: 6000 });
    for (let k = 0; k < 4; k++) for (const wh of ['fl', 'fr', 'rl', 'rr']) { await tapSel(p, `[data-pit-wheel="${wh}"]`); await w(p, 60); }
    await w(p, 900);
    const arr = (await doc(p, 'fanta/pitswipe-sfide')).__arr;
    await goTab(p, 'HOME'); await w(p, 400);
    const done = norm(await inner(p, '[data-duel="s1"]'));
    await ctx.close();
    assert(/Marco ti sfida al Pit Stop/.test(card) && /9,99/.test(card), 'sfida in Home: ' + card);
    assert(phase0, 'si apre il Pit Stop');
    const r = arr.find(x => x.t === 'r' && x.id === 's1');
    assert(r && r.aid === ME && r.time > 0, 'risposta salvata: ' + JSON.stringify(arr));
    assert(/Hai vinto/.test(done), 'risultato: ' + done);
    assert(!errs.length, errs.join(' | '));
  },

  async 'stessa strategia a fine giro e sfida mandata all\'amico della lega'(b) {
    const MARCO = 'marco1';
    const votes = ['a', 'b', 'c'].flatMap(id => [{ k: 't', id, aid: ME, v: 1, at: 1 }, { k: 't', id, aid: MARCO, v: 1, at: 1 }]);
    const docs = { ...NEWS, ...user({ favDriver: 'leclerc', leagues: ['BT-ABCD'], pitBest: 2.4 }), 'fanta/pitswipe-voti': { __arr: votes },
      'fanta/lega-BT-ABCD': { name: 'Box Boys', owner: ME, created: 1, members: { [ME]: { name: 'Tester', team: 'Io' }, [MARCO]: { name: 'Marco', team: 'Pit Wall' } } } };
    const { ctx, p, errs } = await open(b, { seed: { addDocs: docs } }); await login(p); await w(p, 1200);
    await playDeck(p); await w(p, 400);
    const box = norm(await inner(p, '[data-ps-strategy]'));
    await tapSel(p, '[data-ps-strategy] [data-duel-send]'); await w(p, 700);
    const arr = ((await doc(p, 'fanta/pitswipe-sfide')) || {}).__arr || [];
    const t = await toast(p);
    await ctx.close();
    assert(/Stessa strategia/.test(box) && /Marco/.test(box) && /3 opinioni su 3/.test(box), 'stessa strategia: ' + box);
    assert(arr.length === 1 && arr[0].from === ME && arr[0].to === MARCO && arr[0].time === 2.4, 'sfida mandata: ' + JSON.stringify(arr));
    assert(/Sfida mandata a Marco/.test(t), 'avviso: ' + t);
    assert(!errs.length, errs.join(' | '));
  },
});
