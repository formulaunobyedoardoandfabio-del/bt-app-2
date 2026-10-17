// Tappa 3, Task 7 (G11): swipe sulle notizie dell'elenco. A destra si salva (la pistola pneumatica che avvita il dado),
// a sinistra si nasconde (il fumo del bloccaggio); le nascoste stanno nei dati dell'account e si rimettono dal fondo
// dell'elenco ("Notizie nascoste: N · Mostra").
// Uso: node test/build-test.js && node test/e2e/run56-swipe.js [filtro]
const { open, w, text, tapText, login, assert, run } = require('./helpers');

const art = (id, date) => ({ id, title: 'Notizia ' + id, summary: 'Riassunto ' + id, category: 'GARA', author: 'Team B&T', image: '', published: true, date, content: 'Testo ' + id });
const NEWS = { 'shared/bt-news': { __arr: [art('uno', '2026-10-07T11:00:00'), art('due', '2026-10-06T11:00:00'), art('tre', '2026-10-05T11:00:00'), art('quattro', '2026-10-04T11:00:00')] } };
// Trascina il dito (il mouse) sulla riga della notizia: dx pixel in ms millisecondi.
async function swipe(p, id, dx, ms = 240, dy = 0) {
  const box = await p.evaluate(k => { const e = document.querySelector(`[data-news-item="${k}"]`); e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, id);
  await w(p, 150);
  await p.mouse.move(box.x, box.y); await p.mouse.down();
  const steps = 8;
  for (let i = 1; i <= steps; i++) { await p.mouse.move(box.x + dx * i / steps, box.y + dy * i / steps); await p.waitForTimeout(ms / steps); }
  await p.mouse.up();
}
const fxOf = (p, id) => p.evaluate(k => { const e = document.querySelector(`[data-news-row="${k}"]`); const f = e && e.querySelector('[data-swipe-fx]'); return f ? f.getAttribute('data-swipe-fx') : null; }, id);
const listed = p => p.evaluate(() => [...document.querySelectorAll('[data-news-item]')].map(e => e.getAttribute('data-news-item')).join(','));

run({
  async 'swipe a destra: notizia salvata con la pistola che avvita il dado (data-swipe-fx="gun")'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: NEWS } }); await login(p);
    await swipe(p, 'due', 40, 500);   // corto e lento: niente
    await w(p, 200);
    const short = { fx: await fxOf(p, 'due'), view: await p.evaluate(() => !!document.querySelector('[data-news-item]')) };
    await swipe(p, 'due', 200);
    await w(p, 120);
    const fx = await fxOf(p, 'due');
    await w(p, 1500);
    const saved = await p.evaluate(() => { const b = [...document.querySelectorAll('button[aria-label]')].find(x => /Notizia due$/.test(x.getAttribute('aria-label'))); return b ? b.getAttribute('aria-label') : null; });
    const user = await p.evaluate(() => window.firebase.__fake.doc('users/a@b.it'));
    const still = await listed(p), page = await text(p);
    await ctx.close();
    assert(!short.fx && short.view, 'uno swipe corto e lento non deve fare niente: ' + JSON.stringify(short));
    assert(fx === 'gun', 'manca la pistola pneumatica: ' + fx);
    assert(saved && /^Togli dai preferiti/.test(saved), 'la notizia non risulta salvata: ' + saved);
    assert(user && user.app2 && Array.isArray(user.app2.saved) && user.app2.saved.includes('due'), 'nell\'account: ' + JSON.stringify(user && user.app2));
    assert(still.split(',').includes('due') && !/Testo due/.test(page), 'lo swipe ha aperto la notizia o l\'ha tolta: ' + still);
    assert(!errs.length, errs.join(' | '));
  },

  async 'swipe a sinistra: notizia nascosta col fumo (data-swipe-fx="smoke"), "Notizie nascoste: 1 · Mostra" la rimette'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: NEWS } }); await login(p);
    const before = await listed(p);
    await swipe(p, 'tre', -200);
    await w(p, 120);
    const fx = await fxOf(p, 'tre');
    await w(p, 1200);
    const after = await listed(p), t = await text(p);
    await tapText(p, 'Mostra'); await w(p, 400);
    const back = await listed(p), t2 = await text(p);
    await ctx.close();
    assert(fx === 'smoke', 'manca il fumo del bloccaggio: ' + fx);
    assert(!after.split(',').includes('tre') && before.split(',').includes('tre'), 'la notizia non è nascosta: ' + after);
    assert(/Notizie nascoste: 1 · Mostra/.test(t), 'manca "Notizie nascoste: 1 · Mostra"');
    assert(back === before && !/Notizie nascoste/.test(t2), 'Mostra non la rimette: ' + back);
    assert(!errs.length, errs.join(' | '));
  },

  async "nascoste salvate nell'account"(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: NEWS } }); await login(p);
    await swipe(p, 'quattro', -220);
    await w(p, 1800);   // i dati dell'account si salvano dopo 800 ms
    const user = await p.evaluate(() => window.firebase.__fake.doc('users/a@b.it'));
    await p.reload(); await w(p, 600);
    await p.waitForFunction(() => !document.querySelector('[data-splash]'), null, { timeout: 8000 }).catch(() => {});
    await w(p, 800);
    const after = await listed(p), t = await text(p);
    await ctx.close();
    assert(user && user.app2 && JSON.stringify(user.app2.hidden) === JSON.stringify(['quattro']), 'users/a@b.it.app2.hidden: ' + JSON.stringify(user && user.app2 && user.app2.hidden));
    assert(!after.split(',').includes('quattro') && /Notizie nascoste: 1 · Mostra/.test(t), 'dopo il riavvio la notizia è tornata: ' + after);
    assert(!errs.length, errs.join(' | '));
  },
});
