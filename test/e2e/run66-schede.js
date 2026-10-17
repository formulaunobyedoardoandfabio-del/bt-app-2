// Tappa 3, Task 17 (G29): nelle quattro schede della barra in basso uno swipe orizzontale in qualsiasi punto della pagina
// porta alla scheda accanto (dito verso sinistra: la scheda a destra), con la pagina che scivola, il tic e la
// vibrazione. Non parte dagli elementi con gesti propri (notizie con lo swipe, righe che scorrono di lato, cursori,
// manettini, campi di testo) né quando lo swipe è più in verticale che di lato; nelle pagine aperte sopra le schede
// (articolo, chat, Pannello Admin…) non c'è.
// Uso: node test/build-test.js && node test/e2e/run66-schede.js [filtro]
const { open, w, tapSel, goTab, login, assert, run } = require('./helpers');

const art = (id, date) => ({ id, title: 'Notizia ' + id, summary: 'Riassunto ' + id, category: 'GARA', author: 'Team B&T', image: '', published: true, date, content: 'Testo ' + id });
const NEWS = { 'shared/bt-news': { __arr: [art('uno', '2026-10-07T11:00:00'), art('due', '2026-10-06T11:00:00'), art('tre', '2026-10-05T11:00:00'), art('quattro', '2026-10-04T11:00:00')] } };
const activeTab = p => p.evaluate(() => { const b = document.querySelector('[data-nav-tab][aria-current="page"]'); return b ? b.getAttribute('data-nav-tab') : null; });
// Un punto della pagina senza gesti propri (niente notizie con lo swipe, righe che scorrono, cursori…).
const freeSpot = p => p.evaluate(() => {
  const root = document.querySelector('[data-tab-swipe]'); if (!root) return null;
  const r = root.getBoundingClientRect();
  const own = e => { for (; e && e !== root; e = e.parentElement) { if (e.hasAttribute('data-swipe-own') || /INPUT|TEXTAREA|SELECT/.test(e.tagName)) return true; const role = e.getAttribute('role'); if (role === 'slider' || role === 'spinbutton') return true; const cs = getComputedStyle(e); if ((cs.overflowX === 'auto' || cs.overflowX === 'scroll') && e.scrollWidth > e.clientWidth + 1) return true; } return false; };
  for (let y = r.top + 40; y < r.bottom - 20; y += 20) { const e = document.elementFromPoint(r.left + r.width / 2, y); if (e && root.contains(e) && !own(e)) return { x: r.left + r.width * .75, y }; }
  return null;
});
// Il dito (il mouse) resta dentro lo schermo (390 px): verso destra si parte più a sinistra.
async function drag(p, from, dx, dy = 0, ms = 240) {
  const x0 = dx > 0 ? Math.min(from.x, 380 - dx) : Math.max(from.x, 10 - dx);
  await p.mouse.move(x0, from.y); await p.mouse.down();
  const steps = 8;
  for (let i = 1; i <= steps; i++) { await p.mouse.move(x0 + dx * i / steps, from.y + dy * i / steps); await p.waitForTimeout(ms / steps); }
  await p.mouse.up(); await w(p, 350);
}
const centerOf = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width * .7, y: r.top + r.height / 2 }; }, sel);
const spyFx = p => p.evaluate(() => { const fx = window.__btFx; window.__played = []; const play = fx.play; fx.play = n => { window.__played.push(n); return play(n); }; });

run({
  async 'da HOME swipe a sinistra: GARAGE; poi a destra: HOME'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await spyFx(p);
    const t0 = await activeTab(p);
    await drag(p, await freeSpot(p), -220);
    const t1 = await activeTab(p);
    const slide = await p.evaluate(() => { const e = document.querySelector('[data-tab-enter]'); return e ? e.getAttribute('data-tab-enter') : null; });
    await w(p, 400);
    await drag(p, await freeSpot(p), 220);
    const t2 = await activeTab(p);
    const played = await p.evaluate(() => window.__played.slice());
    await ctx.close();
    assert(t0 === 'home' && t1 === 'garage', 'da HOME a sinistra: ' + JSON.stringify([t0, t1]));
    assert(slide === 'left', 'la pagina non scivola: ' + slide);
    assert(t2 === 'home', 'da GARAGE a destra: ' + t2);
    assert(played.filter(x => x === 'tick').length >= 2, 'manca il tic: ' + JSON.stringify(played));
    assert(!errs.length, errs.join(' | '));
  },

  // Sul telefono il gesto arriva come eventi touch (CDP Input.dispatchTouchEvent, come un dito vero).
  async 'col dito (eventi touch): da HOME swipe a sinistra porta a GARAGE'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    const at = await freeSpot(p);
    const cdp = await ctx.newCDPSession(p);
    const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
    await touch('touchStart', at.x, at.y);
    for (let i = 1; i <= 8; i++) { await touch('touchMove', at.x - 26 * i, at.y + i); await w(p, 25); }
    await touch('touchEnd', at.x - 208, at.y + 8); await w(p, 400);
    const t = await activeTab(p);
    await ctx.close();
    assert(t === 'garage', 'col dito da HOME a sinistra: ' + t);
    assert(!errs.length, errs.join(' | '));
  },

  async 'da RACE a sinistra: resta RACE'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await goTab(p, 'RACE');
    await drag(p, await freeSpot(p), -220);
    const t = await activeTab(p);
    await drag(p, await freeSpot(p), 220);
    const back = await activeTab(p);
    await ctx.close();
    assert(t === 'race', 'da RACE a sinistra la scheda cambia: ' + t);
    assert(back === 'fanta', 'da RACE a destra si va a FANTA: ' + back);
    assert(!errs.length, errs.join(' | '));
  },

  async 'swipe su una notizia: salva o nasconde, la scheda non cambia'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: NEWS } }); await login(p);
    const at = await centerOf(p, '[data-news-item="due"]');
    await drag(p, at, -200);
    const t = await activeTab(p);
    const fx = await p.evaluate(() => { const f = document.querySelector('[data-news-row="due"] [data-swipe-fx]'); return f ? f.getAttribute('data-swipe-fx') : null; });
    await ctx.close();
    assert(t === 'home', 'swipe sulla notizia: la scheda è cambiata in ' + t);
    assert(fx === 'smoke', 'la notizia non si nasconde: ' + fx);
    assert(!errs.length, errs.join(' | '));
  },

  async 'swipe su una riga che scorre di lato o su un cursore: la scheda non cambia'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await goTab(p, 'RACE');
    const row = await p.evaluate(() => { const e = document.querySelector('[data-race-tab]').parentElement; e.style.paddingRight = '420px'; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width * .7, y: r.top + r.height / 2 }; });
    await drag(p, row, -200);
    const t1 = await activeTab(p);
    await goTab(p, 'GARAGE'); await tapSel(p, '[data-game="deg"]'); await w(p, 400);
    await tapSel(p, '[data-deg-row]'); await w(p, 300);
    const slider = await centerOf(p, '[data-wear-slider]');
    await drag(p, slider, -150);
    const t2 = await activeTab(p);
    await ctx.close();
    assert(t1 === 'race', 'swipe sulla riga delle schede della Race: ' + t1);
    assert(t2 === 'garage', 'swipe sul cursore della gomma: ' + t2);
    assert(!errs.length, errs.join(' | '));
  },

  async "scorrere in verticale con un po' di diagonale: la scheda non cambia"(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    const at = await freeSpot(p);
    await drag(p, at, -80, -260, 300);
    const t = await activeTab(p);
    await ctx.close();
    assert(t === 'home', 'uno scorrimento quasi verticale ha cambiato scheda: ' + t);
    assert(!errs.length, errs.join(' | '));
  },

  async 'articolo aperto: niente swipe tra le schede'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: NEWS } }); await login(p);
    await tapSel(p, '[data-news-item="due"]'); await w(p, 500);
    const opened = await p.evaluate(() => /Testo due/.test(document.body.innerText));
    const nav = await p.evaluate(() => !!document.querySelector('[data-nav-tab]'));
    await drag(p, { x: 300, y: 420 }, -220);
    const still = await p.evaluate(() => /Testo due/.test(document.body.innerText));
    await tapSel(p, '[aria-label="Indietro"]'); await w(p, 400);
    const t = await activeTab(p);
    await ctx.close();
    assert(opened && !nav, 'l\'articolo non si è aperto sopra le schede: ' + JSON.stringify({ opened, nav }));
    assert(still && t === 'home', 'swipe nell\'articolo: ' + JSON.stringify({ still, t }));
    assert(!errs.length, errs.join(' | '));
  },
});
