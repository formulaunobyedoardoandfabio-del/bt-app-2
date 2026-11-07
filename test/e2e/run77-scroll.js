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
  // 7/11: il Garage è a piastrelle da trascinare in tutte le direzioni: torna dove l'avevo lasciato, in giù e di lato.
  async 'Garage: trascino giù e di lato, apro un gioco, torno indietro: le piastrelle sono dove le avevo lasciate'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await w(p, 400);
    await tapSel(p, '[data-nav-tab="garage"]'); await w(p, 800);
    const pos = () => p.evaluate(() => { const el = document.querySelector('[data-garage-canvas]'); return el ? { x: Math.round(el.scrollLeft), y: Math.round(el.scrollTop), maxX: el.scrollWidth - el.clientWidth, maxY: el.scrollHeight - el.clientHeight } : null; });
    await p.evaluate(() => { const el = document.querySelector('[data-garage-canvas]'); el.scrollLeft = 9999; el.scrollTop = 9999; el.dispatchEvent(new Event('scroll')); }); await w(p, 300);
    const before = await pos();
    await p.evaluate(() => { const box = document.querySelector('[data-garage-canvas]').getBoundingClientRect(); const e = [...document.querySelectorAll('[data-game]')].find(x => { const r = x.getBoundingClientRect(); return r.top > box.top && r.left > box.left && r.right < box.right && r.bottom < box.bottom; }); e.click(); });
    await w(p, 700);
    const inGame = await scroller(p);
    await tapSel(p, '[aria-label="Indietro"]'); await w(p, 900);
    const after = await pos();
    await ctx.close();
    assert(before && before.x > 60 && before.y > 40 && before.x === before.maxX && before.y === before.maxY, 'il Garage doveva scorrere in giù e di lato: ' + JSON.stringify(before));
    assert(inGame === 0, 'il gioco si apre dall\'alto: ' + inGame);
    assert(after && Math.abs(after.x - before.x) <= 4 && Math.abs(after.y - before.y) <= 4, `tornando dal gioco: era a ${JSON.stringify(before)}, ora a ${JSON.stringify(after)}`);
    assert(!errs.length, errs.join(' | '));
  },
});
