// Tappa 3, Task 9 (G14): nella Home, tirando giù dall'inizio della pagina compare un contagiri che sale verso il
// fuorigiri; al rilascio sopra la soglia la cambiata (suono e vibrazione) e le notizie si rileggono da Firebase.
// Uso: node test/build-test.js && node test/e2e/run58-aggiorna.js [filtro]
const { open, w, login, assert, run } = require('./helpers');

const art = (id, title, date) => ({ id, title, summary: 'Riassunto ' + id, category: 'GARA', author: 'Team B&T', image: '', published: true, date, content: 'Testo ' + id });
const NEWS = { 'shared/bt-news': { __arr: [art('uno', 'Notizia uno', '2026-10-07T11:00:00'), art('due', 'Notizia due', '2026-10-06T11:00:00')] } };
const FRESH = { __arr: [art('nuova', 'Notizia appena pubblicata', '2026-10-07T11:55:00'), ...NEWS['shared/bt-news'].__arr] };
const spyFx = p => p.evaluate(() => { const fx = window.__btFx; window.__played = []; const play = fx.play; fx.play = n => { window.__played.push(n); return play(n); }; });
const rev = p => p.evaluate(() => { const e = document.querySelector('[data-rev]'); return e ? Number(e.getAttribute('data-rev')) : null; });
// Il dito (il mouse) tira giù la Home dall'alto: dy pixel, poi (se release) lascia.
async function pull(p, dy, { release = true, samples = null } = {}) {
  const start = await p.evaluate(() => { const s = document.querySelector('[data-home]'); s.scrollTop = 0; const r = s.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + 40 }; });
  await p.mouse.move(start.x, start.y); await p.mouse.down();
  const steps = 10;
  for (let i = 1; i <= steps; i++) {
    await p.mouse.move(start.x, start.y + dy * i / steps); await p.waitForTimeout(40);
    if (samples) samples.push(await rev(p));
  }
  if (release) await p.mouse.up();
}
const titles = p => p.evaluate(() => [...document.querySelectorAll('[data-home] h3')].map(h => h.textContent.trim()));

run({
  async 'tirando giù il contagiri sale (data-rev da 0 a 1)'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: NEWS } }); await login(p);
    const before = await rev(p);
    const samples = [];
    await pull(p, 260, { release: false, samples });
    const gauge = await p.evaluate(() => { const e = document.querySelector('[data-rev]'); return e ? { text: e.innerText, visible: e.getBoundingClientRect().height > 20 } : null; });
    await p.mouse.up(); await w(p, 300);
    await ctx.close();
    const seen = samples.filter(v => v != null);
    assert(before === null || before === 0, 'prima di tirare il contagiri è già su: ' + before);
    assert(seen.length >= 8, 'il contagiri non compare tirando giù: ' + JSON.stringify(samples));
    assert(seen.every((v, i) => i === 0 || v >= seen[i - 1]), 'il contagiri non sale: ' + JSON.stringify(seen));
    assert(seen[0] < 0.5 && seen[seen.length - 1] === 1, 'da 0 a 1: ' + JSON.stringify(seen));
    assert(gauge && gauge.visible && /Rilascia per aggiornare/.test(gauge.text), 'al fuorigiri: ' + JSON.stringify(gauge));
    assert(!errs.length, errs.join(' | '));
  },

  async 'rilascio oltre la soglia: cambiata e notizie rilette da Firebase'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: NEWS } }); await login(p);
    await spyFx(p);
    const before = await titles(p);
    await p.evaluate(v => window.firebase.__fake.setDoc('shared/bt-news', v), FRESH);   // intanto l'admin pubblica
    await pull(p, 260); await w(p, 1500);
    const after = await titles(p), played = await p.evaluate(() => window.__played.slice());
    const gone = await rev(p);
    await ctx.close();
    assert(!before.includes('Notizia appena pubblicata'), 'la notizia nuova c\'è già prima: ' + before.join(' | '));
    assert(after.includes('Notizia appena pubblicata'), 'tirando giù le notizie non si rileggono: ' + after.join(' | '));
    assert(played.includes('shift'), 'niente cambiata: ' + JSON.stringify(played));
    assert(gone === null || gone === 0, 'il contagiri resta giù: ' + gone);
    assert(!errs.length, errs.join(' | '));
  },

  async 'rilascio sotto la soglia: niente'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: NEWS } }); await login(p);
    await spyFx(p);
    await p.evaluate(v => window.firebase.__fake.setDoc('shared/bt-news', v), FRESH);
    const samples = [];
    await pull(p, 60, { samples }); await w(p, 1200);
    const after = await titles(p), played = await p.evaluate(() => window.__played.slice());
    await ctx.close();
    const seen = samples.filter(v => v != null);
    assert(seen.length && Math.max(...seen) < 1 && Math.max(...seen) > 0, 'tirando poco il contagiri: ' + JSON.stringify(samples));
    assert(!after.includes('Notizia appena pubblicata'), 'sotto la soglia le notizie si rileggono lo stesso');
    assert(!played.includes('shift'), 'sotto la soglia c\'è la cambiata: ' + JSON.stringify(played));
    assert(!errs.length, errs.join(' | '));
  },
});
