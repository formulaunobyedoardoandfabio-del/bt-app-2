// 31/10 pomeriggio (Edoardo): gli admin hanno Premium e tutti i trofei gratis; nel Fanta i piloti si vedono nelle
// loro caselle (la figura del pilota) e i nuovi utenti partono senza squadra (prima era già fatta).
// Uso: node test/build-test.js && node test/e2e/run78-admin-fanta.js [filtro]
const { open, w, tapSel, goTab, login, assert, run } = require('./helpers');

const chip = p => p.evaluate(() => { const e = document.querySelector('[data-premium-chip]'); return e ? e.getAttribute('data-premium-chip') : null; });
const user = p => p.evaluate(() => window.firebase.__fake.doc('users/a@b.it'));
const OLD = { name: 'Scuderia B&T', drivers: ['hamilton', 'russell', 'hulkenberg', 'perez', 'antonelli'], teams: ['audi', 'haas'], boost: 'russell' };

run({
  async 'admin: Premium attivo e tutti i trofei vinti, senza pagare'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await w(p, 1800);
    const c = await chip(p), u = await user(p);
    await ctx.close();
    const tr = (u && u.app2 && u.app2.trophies) || {};
    assert(c === 'on', 'l\'admin deve avere il Premium: ' + c);
    assert(Object.keys(tr).length >= 15, 'l\'admin deve avere tutti i trofei nell\'account: ' + Object.keys(tr).length);
    assert(!(u.app2.premium && u.app2.premium.sub), 'nessun abbonamento finto scritto nell\'account');
    assert(!errs.length, errs.join(' | '));
  },
  async 'utente normale: niente Premium e niente trofei regalati'(b) {
    const { ctx, p, errs } = await open(b, { seed: { noAdmin: true } }); await login(p); await w(p, 1800);
    const c = await chip(p), u = await user(p);
    await ctx.close();
    const tr = (u && u.app2 && u.app2.trophies) || {};
    assert(c === 'off', 'un utente normale non ha il Premium: ' + c);
    assert(Object.keys(tr).length < 5, 'niente trofei regalati: ' + Object.keys(tr).join(','));
    assert(!errs.length, errs.join(' | '));
  },
  async 'nuovo utente: squadra vuota da comporre (5 piloti e 2 scuderie), nessun cambio contato'(b) {
    const { ctx, p, errs } = await open(b, { seed: { noAdmin: true } }); await login(p);
    await goTab(p, 'FANTA'); await w(p, 900);
    const adds = await p.evaluate(() => [...document.querySelectorAll('[data-fanta-add]')].map(e => e.getAttribute('data-fanta-add')));
    const cards = await p.evaluate(() => document.querySelectorAll('[data-fanta-card]').length);
    const page = await p.evaluate(() => document.body.innerText);
    await ctx.close();
    assert(cards === 0, 'nessuna carta già scelta: ' + cards);
    assert(adds.filter(x => x.startsWith('drivers:')).length === 5 && adds.filter(x => x.startsWith('teams:')).length === 2, 'caselle da riempire: ' + adds.join(','));
    assert(!/cambi[oi]? in più dei gratis/.test(page), 'la prima squadra non deve contare come cambi');
    assert(!errs.length, errs.join(' | '));
  },
  async 'chi aveva ancora la vecchia squadra già fatta la ritrova vuota; una squadra scelta resta, con le figure dei piloti'(b) {
    const old = { 'users/a@b.it': { name: 'Mario', app2: { squad: OLD, squadBase: { drivers: OLD.drivers, teams: OLD.teams } } } };
    const r1 = await (async () => {
      const { ctx, p, errs } = await open(b, { seed: { addDocs: old, noAdmin: true } }); await login(p);
      await goTab(p, 'FANTA'); await w(p, 1500);
      const cards = await p.evaluate(() => document.querySelectorAll('[data-fanta-card]').length), u = await user(p);
      await ctx.close();
      return { cards, squad: u && u.app2 && u.app2.squad, errs };
    })();
    const mine = { name: 'Box Boys', drivers: ['leclerc', 'norris', 'albon', 'gasly', 'ocon'], teams: ['ferrari', 'williams'], boost: 'leclerc' };
    const { ctx, p, errs } = await open(b, { seed: { addDocs: { 'users/a@b.it': { name: 'Mario', app2: { squad: mine } } }, noAdmin: true } }); await login(p);
    await goTab(p, 'FANTA'); await w(p, 1200);
    const faces = await p.evaluate(() => [...document.querySelectorAll('[data-fanta-card] [data-card-photo="disegno"] svg[data-face]')].map(s => s.getAttribute('data-face')));
    await ctx.close();
    assert(r1.cards === 0, 'la vecchia squadra già fatta deve sparire: ' + r1.cards);
    assert(r1.squad && r1.squad.drivers.every(x => !x), 'nell\'account la squadra è vuota: ' + JSON.stringify(r1.squad));
    assert(faces.sort().join(',') === 'albon,gasly,leclerc,norris,ocon', 'figure dei piloti nelle carte: ' + faces.join(','));
    assert(!r1.errs.length && !errs.length, [...r1.errs, ...errs].join(' | '));
  },
});
