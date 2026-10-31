// 31/10 sera (Edoardo): uscendo da una pagina con una lista lunga e rientrando si riparte dal punto dove si era.
// Uso: node test/build-test.js && node test/e2e/run77-scroll.js [filtro]
const { open, w, tapSel, login, assert, run } = require('./helpers');

const art = i => ({ id: 'n' + i, title: 'Notizia numero ' + i, summary: 'Riassunto ' + i, category: 'NEWS', author: 'Team B&T', image: '', published: true, date: `2026-10-${String(28 - i).padStart(2, '0')}T10:00:00Z`, content: 'Testo ' + i });
const NEWS = { 'shared/bt-news': { __arr: Array.from({ length: 14 }, (_, i) => art(i + 1)) } };
// Lo scroll della pagina visibile (la colonna che scorre nella scheda attiva o nella pagina aperta).
const scroller = p => p.evaluate(() => {
  const page = document.querySelector('[data-tab-page]:not([data-tab-leave])') || document.querySelector('[data-tab-swipe]');
  const el = page && page.querySelector('.scrollcol');
  return el ? Math.round(el.scrollTop) : null;
});
const scrollTo = (p, y) => p.evaluate(y => {
  const page = document.querySelector('[data-tab-page]:not([data-tab-leave])') || document.querySelector('[data-tab-swipe]');
  const el = page.querySelector('.scrollcol'); el.scrollTop = y; el.dispatchEvent(new Event('scroll'));
}, y);

run({
  async 'Home: giù nella lista, apro una notizia, torno: stesso punto'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: NEWS } }); await login(p); await w(p, 600);
    await scrollTo(p, 900); await w(p, 300);
    const before = await scroller(p);
    await p.evaluate(() => { const e = [...document.querySelectorAll('[data-news-item]')].find(x => x.getBoundingClientRect().top > 120); e.click(); });
    await w(p, 700);
    await tapSel(p, '[aria-label="Indietro"]'); await w(p, 900);
    const after = await scroller(p);
    await ctx.close();
    assert(before > 600, 'la pagina doveva scorrere: ' + before);
    assert(Math.abs(after - before) <= 4, `tornando dalla notizia: era a ${before}, ora a ${after}`);
    assert(!errs.length, errs.join(' | '));
  },
  async 'cambio scheda e torno: la Home è dove l\'avevo lasciata; il Garage parte dall\'alto'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: NEWS } }); await login(p); await w(p, 600);
    await scrollTo(p, 700); await w(p, 300);
    const before = await scroller(p);
    await tapSel(p, '[data-nav-tab="garage"]'); await w(p, 900);
    const garage = await scroller(p);
    await tapSel(p, '[data-nav-tab="home"]'); await w(p, 900);
    const after = await scroller(p);
    await ctx.close();
    assert(garage === 0, 'il Garage (mai aperto) parte dall\'alto: ' + garage);
    assert(Math.abs(after - before) <= 4, `tornando alla Home: era a ${before}, ora a ${after}`);
    assert(!errs.length, errs.join(' | '));
  },
  async 'Garage: giù, apro un gioco, torno indietro: la lista dei giochi è dove l\'avevo lasciata'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await w(p, 400);
    await tapSel(p, '[data-nav-tab="garage"]'); await w(p, 800);
    await scrollTo(p, 500); await w(p, 300);
    const before = await scroller(p);
    await p.evaluate(() => { const e = [...document.querySelectorAll('[data-game]')].find(x => x.getBoundingClientRect().top > 120); e.click(); });
    await w(p, 700);
    const inGame = await scroller(p);
    await tapSel(p, '[aria-label="Indietro"]'); await w(p, 900);
    const after = await scroller(p);
    await ctx.close();
    assert(before > 300, 'il Garage doveva scorrere: ' + before);
    assert(inGame === 0, 'il gioco si apre dall\'alto: ' + inGame);
    assert(Math.abs(after - before) <= 4, `tornando dal gioco: era a ${before}, ora a ${after}`);
    assert(!errs.length, errs.join(' | '));
  },
});
