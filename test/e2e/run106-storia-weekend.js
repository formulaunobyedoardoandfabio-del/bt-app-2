// 13/11 (Edoardo): "nel Fanta le domande sulla storia abbiano una animazione fighissima se giusta o sbagliata e cambino
// in base al weekend di gara in automatico, ma nella sezione admin si possono aggiungere o togliere"; e (8/11) "l'admin
// vede ancora le previsioni che aveva messo dei vecchi GP". Le domande si fanno dai dati veri del circuito
// (src/logic/history-quiz.js, provato in test/unit/history-quiz.test.js).
// Uso: node test/build-test.js && node test/e2e/run106-storia-weekend.js [filtro]
const { open, w, tapSel, tapText, goTab, login, openAdmin, assert, run } = require('./helpers');
const H = require('../../src/logic/history-quiz');
const INFO = require('../../src/data/circuit-info.json');
const F1 = require('../../src/data/f1-2026');

const NOW = '2026-11-17T10:00:00Z';   // settimana di Las Vegas (r21), dopo il Brasile (r20)
const LV = F1.RACES.find(r => r.id === 'r21');
const QS = H.questionsFor(LV, INFO, { season: 2026 });
const wrongOf = q => q.options.find(o => o[0] !== q.answer)[0];
const cards = p => p.evaluate(() => [...document.querySelectorAll('[data-prediction]')].map(e => e.getAttribute('data-prediction')));
const state = (p, id) => p.evaluate(id => {
  const e = document.querySelector(`[data-prediction="${id}"]`);
  return e && { burst: e.getAttribute('data-quiz-burst'), text: e.innerText, right: [...e.querySelectorAll('[data-pred-right]')].map(x => x.getAttribute('data-option')), bits: e.querySelectorAll('.quiz-bit').length, leds: e.querySelectorAll('.quiz-led').length };
}, id);
const tapOpt = async (p, qid, opt) => { const sel = `[data-prediction="${qid}"] [data-option="${opt}"]`; await p.$eval(sel, e => e.scrollIntoView({ block: 'center' })); await tapSel(p, sel); };
const OLD = { 'shared/bt-predictions': { __arr: [
  { id: 'p-old', kind: 'driver', q: 'Chi vince in Brasile?', cat: 'Gara', about: 'RACE', raceId: 'r20', answer: null },
  { id: 'p-new', kind: 'driver', q: 'Chi vince a Las Vegas?', cat: 'Gara', raceId: 'r21', answer: null },   // senza "about": la scheda non deve rompersi
  { id: 'h-mia', kind: 'history', q: 'Chi vinse il primo GP della storia?', cat: 'Storia', options: [{ id: 'farina', label: 'Farina' }, { id: 'fangio', label: 'Fangio' }], answer: 'farina', note: 'Silverstone, 1950.' },
] } };

run({
  async 'FANTA: le tre domande di storia del weekend ci sono da sole e parlano del circuito della prossima gara'(b) {
    const { ctx, p, errs } = await open(b, { now: NOW }); await login(p); await w(p, 1200);
    await goTab(p, 'FANTA'); await w(p, 800);
    const ids = await cards(p);
    const txt = await p.evaluate(() => [...document.querySelectorAll('[data-prediction^="auto:r21:h-"]')].map(e => e.innerText).join(' || '));
    await ctx.close();
    assert(QS.length === 3, 'tre domande per Las Vegas: ' + QS.length);
    assert(QS.every(q => ids.includes(q.id)), 'le domande del weekend: ' + JSON.stringify(ids));
    assert(!ids.some(x => /^auto:r20:h-/.test(x)), 'niente domande del GP già corso: ' + JSON.stringify(ids));
    assert(QS.every(q => txt.includes(q.q)), 'testi: ' + txt.slice(0, 400));
    assert(!errs.length, errs.join(' | '));
  },

  async 'risposta giusta: animazione (luci verdi, coriandoli, +1), poi resta "Giusto" e si salva'(b) {
    const { ctx, p, errs } = await open(b, { now: NOW }); await login(p); await w(p, 1200);
    await goTab(p, 'FANTA'); await w(p, 800);
    const q = QS[0];
    await tapOpt(p, q.id, q.answer); await w(p, 250);
    const during = await state(p, q.id);
    await p.screenshot({ path: '/tmp/bt/run106-giusto.png' });
    await w(p, 2600);
    const after = await state(p, q.id);
    const saved = await p.evaluate(() => ((window.firebase.__fake.doc('users/a@b.it') || {}).app2 || {}).predAnswers || null);
    await ctx.close();
    assert(during && during.burst === 'right', 'animazione del giusto partita: ' + JSON.stringify(during));
    assert(during.bits >= 8 && during.leds === 5, 'coriandoli e cinque luci: ' + JSON.stringify(during));
    assert(/Giusto/.test(during.text) && during.text.includes(q.note), 'esito e curiosità: ' + during.text);
    assert(after && after.burst == null && after.bits === 0, 'finita l\'animazione non resta niente in mezzo: ' + JSON.stringify(after));
    assert(/Giusto/.test(after.text), 'resta scritto Giusto');
    assert(saved && saved[q.id] === q.answer, 'risposta salvata: ' + JSON.stringify(saved));
    assert(!errs.length, errs.join(' | '));
  },

  async 'risposta sbagliata: animazione (luci rosse, scossa), si vede quella giusta e non si può cambiare'(b) {
    const { ctx, p, errs } = await open(b, { now: NOW }); await login(p); await w(p, 1200);
    await goTab(p, 'FANTA'); await w(p, 800);
    const q = QS[1], bad = wrongOf(q);
    await tapOpt(p, q.id, bad); await w(p, 250);
    const during = await state(p, q.id);
    await p.screenshot({ path: '/tmp/bt/run106-sbagliato.png' });
    await w(p, 2600);
    await tapOpt(p, q.id, q.answer).catch(() => {}); await w(p, 400);
    const after = await state(p, q.id);
    const saved = await p.evaluate(() => ((window.firebase.__fake.doc('users/a@b.it') || {}).app2 || {}).predAnswers || null);
    await ctx.close();
    assert(during && during.burst === 'wrong', 'animazione dello sbagliato partita: ' + JSON.stringify(during));
    assert(during.leds === 5 && during.bits === 0, 'cinque luci rosse, niente coriandoli: ' + JSON.stringify(during));
    assert(during.right.length === 1 && during.right[0] === q.answer, 'si vede la risposta giusta: ' + JSON.stringify(during.right));
    assert(/Non era giusta/.test(during.text), 'esito: ' + during.text);
    assert(after.burst == null && saved && saved[q.id] === bad, 'la risposta data resta quella: ' + JSON.stringify(saved));
    assert(!errs.length, errs.join(' | '));
  },

  async 'admin: toglie una domanda automatica (sparisce dal Fanta per tutti) e la rimette'(b) {
    const { ctx, p, errs } = await open(b, { now: NOW, seed: { admin: true } }); await login(p); await w(p, 1500);
    await openAdmin(p, 'PREVISIONI'); await w(p, 400);
    const q = QS[0];
    const listed = await p.evaluate(() => [...document.querySelectorAll('[data-hist-auto]')].map(e => e.getAttribute('data-hist-auto')));
    await p.$eval(`[data-hist-auto="${q.id}"] button`, e => e.scrollIntoView({ block: 'center' }));
    await tapSel(p, `[data-hist-auto="${q.id}"] button`); await w(p, 900);
    const flags = await p.evaluate(() => window.firebase.__fake.doc('shared/bt-flags'));
    const label = await p.$eval(`[data-hist-auto="${q.id}"] button`, e => e.textContent.trim());
    await p.reload(); await w(p, 2500);
    await goTab(p, 'FANTA'); await w(p, 900);
    const ids = await cards(p);
    await ctx.close();
    assert(QS.every(x => listed.includes(x.id)), 'l\'admin vede le tre domande automatiche: ' + JSON.stringify(listed));
    assert(flags && Array.isArray(flags.hiddenQs) && flags.hiddenQs.includes(q.id), 'salvata per tutti: ' + JSON.stringify(flags));
    assert(/RIMETTI/i.test(label), 'il tasto diventa Rimetti: ' + label);
    assert(!ids.includes(q.id) && ids.includes(QS[1].id), 'nel Fanta quella non c\'è più, le altre sì: ' + JSON.stringify(ids));
    assert(!errs.length, errs.join(' | '));
  },

  async 'admin: le previsioni dei GP già corsi non stanno più in lista; le domande di storia scritte a mano si possono togliere'(b) {
    const { ctx, p, errs } = await open(b, { now: NOW, seed: { admin: true, addDocs: OLD } }); await login(p); await w(p, 1500);
    await openAdmin(p, 'PREVISIONI'); await w(p, 400);
    const before = await p.evaluate(() => ({ open: [...document.querySelectorAll('[data-pred-admin]')].map(e => e.getAttribute('data-pred-admin')), old: (document.querySelector('[data-pred-admin-old]') || {}).innerText || '', own: [...document.querySelectorAll('[data-hist-own]')].map(e => e.getAttribute('data-hist-own')) }));
    await p.$eval('[data-hist-own="h-mia"] button', e => e.scrollIntoView({ block: 'center' }));
    await tapSel(p, '[data-hist-own="h-mia"] button'); await w(p, 900);
    const stored = await p.evaluate(() => (window.firebase.__fake.doc('shared/bt-predictions') || {}).__arr || []);
    await p.reload(); await w(p, 2500);
    await goTab(p, 'FANTA'); await w(p, 900);
    const ids = await cards(p);
    await ctx.close();
    assert(before.open.includes('p-new') && !before.open.includes('p-old'), 'in lista solo il GP che deve ancora venire: ' + JSON.stringify(before.open));
    assert(/1/.test(before.old) && /conclus/i.test(before.old), 'una riga dice quante sono dei GP conclusi: ' + before.old);
    assert(before.own.includes('h-mia'), 'la domanda scritta a mano è in lista: ' + JSON.stringify(before.own));
    const mine = stored.find(x => x.id === 'h-mia');
    assert(mine && mine.off === true, 'tolta ma non cancellata (chi aveva risposto tiene il punto): ' + JSON.stringify(mine));
    assert(stored.some(x => x.id === 'p-old'), 'le vecchie previsioni restano salvate (punti): ' + stored.map(x => x.id).join(','));
    assert(!ids.includes('h-mia'), 'nel Fanta non c\'è più: ' + JSON.stringify(ids));
    assert(!errs.length, errs.join(' | '));
  },
});
