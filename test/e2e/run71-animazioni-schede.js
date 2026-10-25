// 25/10: animazioni tra le schede della barra in basso e tra le sottoschede della pagina RACE.
// - Tocco o swipe: la scheda vecchia esce dalla parte del movimento e svanisce, la nuova entra dall'altra parte
//   (data-tab-leave / data-tab-enter); finito il passaggio resta montata una scheda sola, senza transform.
// - Col dito la pagina segue lo swipe; se è corto torna a posto. Ai lati compare la scheda accanto (data-tab-peek).
// - La pillola rossa della barra scivola sotto la scheda attiva.
// - Con "Rimuovi animazioni" (prefers-reduced-motion) niente scivolate: si cambia scheda e basta.
// Uso: node test/build-test.js && node test/e2e/run71-animazioni-schede.js [filtro]
const { open, w, tapSel, goTab, login, assert, run } = require('./helpers');

const activeTab = p => p.evaluate(() => { const b = document.querySelector('[data-nav-tab][aria-current="page"]'); return b ? b.getAttribute('data-nav-tab') : null; });
// Com'è il passaggio in questo momento: scheda che esce, scheda che entra, quante schede montate.
const layers = p => p.evaluate(() => {
  const l = document.querySelector('[data-tab-leave]'), e = document.querySelector('[data-tab-enter]');
  return {
    leave: l && l.getAttribute('data-tab-leave'), leaveTab: l && l.getAttribute('data-tab-page'),
    pe: l && getComputedStyle(l).pointerEvents, inert: !!(l && l.hasAttribute('inert')), from: l ? l.style.getPropertyValue('--tab-from') : null,
    leaveX: l ? new DOMMatrix(getComputedStyle(l).transform).m41 : null,
    enter: e && e.getAttribute('data-tab-enter'), enterTab: e && e.getAttribute('data-tab-page'),
    pages: document.querySelectorAll('[data-tab-page]').length,
  };
});
// Pagina attuale: spostamento orizzontale (px) e transform ("none" se ferma).
const pageNow = p => p.evaluate(() => {
  const e = [...document.querySelectorAll('[data-tab-page]')].find(x => !x.hasAttribute('data-tab-leave'));
  if (!e) return null;
  const tr = getComputedStyle(e).transform;
  const peek = s => { const k = document.querySelector(`[data-tab-peek="${s}"]`); return k ? +getComputedStyle(k).opacity : null; };
  return { tr, x: tr === 'none' ? 0 : new DOMMatrix(tr).m41, peekRight: peek('right'), peekLeft: peek('left') };
});
// Un punto della pagina senza gesti propri (come in run66).
const freeSpot = p => p.evaluate(() => {
  const root = document.querySelector('[data-tab-swipe]'); if (!root) return null;
  const r = root.getBoundingClientRect();
  const own = e => { for (; e && e !== root; e = e.parentElement) { if (e.hasAttribute('data-swipe-own') || /INPUT|TEXTAREA|SELECT/.test(e.tagName)) return true; const role = e.getAttribute('role'); if (role === 'slider' || role === 'spinbutton') return true; const cs = getComputedStyle(e); if ((cs.overflowX === 'auto' || cs.overflowX === 'scroll') && e.scrollWidth > e.clientWidth + 1) return true; } return false; };
  const x = r.left + r.width * .75;   // il punto dove parte il dito
  for (let y = r.top + 40; y < r.bottom - 20; y += 20) { const e = document.elementFromPoint(x, y); if (e && root.contains(e) && !own(e)) return { x, y }; }
  return null;
});
// Dito (mouse) giù, spostamento a passi in "ms" millisecondi; il dito resta giù.
async function press(p, from, dx, ms, steps = 10) {
  await p.mouse.move(from.x, from.y); await p.mouse.down();
  for (let i = 1; i <= steps; i++) { await p.mouse.move(from.x + dx * i / steps, from.y); await p.waitForTimeout(ms / steps); }
}
const pillGap = p => p.evaluate(() => {
  const pill = document.querySelector('[data-nav-pill] > *'), on = document.querySelector('[data-nav-tab][aria-current="page"]');
  if (!pill || !on) return null;
  const a = pill.getBoundingClientRect(), b = on.getBoundingClientRect();
  return Math.round((a.left + a.width / 2) - (b.left + b.width / 2));
});

run({
  async 'tocco sulla barra: la nuova entra da destra, la vecchia esce verso sinistra e poi sparisce'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await tapSel(p, '[data-nav-tab="garage"]');
    const mid = await layers(p);
    await w(p, 600);
    const after = await layers(p), still = await pageNow(p);
    await ctx.close();
    assert(mid.leave === 'left' && mid.leaveTab === 'home', 'la scheda vecchia non esce: ' + JSON.stringify(mid));
    assert(mid.pe === 'none' && mid.inert, 'la scheda che esce si può ancora toccare: ' + JSON.stringify(mid));
    assert(mid.enter === 'left' && mid.enterTab === 'garage', 'la scheda nuova non entra da destra: ' + JSON.stringify(mid));
    assert(after.pages === 1 && !after.leave, 'finito il passaggio restano più schede: ' + JSON.stringify(after));
    assert(still && still.tr === 'none', 'finito il passaggio la scheda ha ancora transform: ' + JSON.stringify(still));
    assert(!errs.length, errs.join(' | '));
  },

  async 'tocco verso sinistra (RACE → HOME): la nuova entra da sinistra'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await goTab(p, 'RACE');
    await tapSel(p, '[data-nav-tab="home"]');
    const mid = await layers(p);
    await ctx.close();
    assert(mid.leave === 'right' && mid.leaveTab === 'race', 'la scheda vecchia non esce verso destra: ' + JSON.stringify(mid));
    assert(mid.enter === 'right' && mid.enterTab === 'home', 'la scheda nuova non entra da sinistra: ' + JSON.stringify(mid));
    assert(!errs.length, errs.join(' | '));
  },

  // Revisione del 25/10: con le dissolvenze a metà passaggio lo schermo restava quasi nero per qualche fotogramma. Ora le
  // due schede scorrono attaccate (nessun buco, nessuna sovrapposizione) e restano visibili.
  async 'a metà passaggio le due schede sono attaccate e si vedono'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    const gapOf = () => p.evaluate(() => {
      const l = document.querySelector('[data-tab-leave]'), e = document.querySelector('[data-tab-enter]');
      if (!l || !e) return null;
      const a = l.getBoundingClientRect(), c = e.getBoundingClientRect();
      return { gap: Math.round(c.left - a.right), x: Math.round(c.left), opL: +getComputedStyle(l).opacity, opE: +getComputedStyle(e).opacity };
    });
    await tapSel(p, '[data-nav-tab="garage"]'); await w(p, 90);
    const tap = await gapOf();
    await w(p, 600);
    await press(p, await freeSpot(p), -200, 240, 8);
    await p.mouse.up(); await w(p, 40);
    const drag = await gapOf();
    await ctx.close();
    assert(tap && Math.abs(tap.gap) <= 2 && tap.x > 5 && tap.x < 385, 'col tocco le schede non sono attaccate: ' + JSON.stringify(tap));
    assert(tap.opL > .5 && tap.opE === 1, 'a metà passaggio le schede non si vedono: ' + JSON.stringify(tap));
    assert(drag && Math.abs(drag.gap) <= 2, 'dopo lo swipe le schede non sono attaccate: ' + JSON.stringify(drag));
    assert(!errs.length, errs.join(' | '));
  },

  async 'la pillola rossa scivola sotto la scheda attiva'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    const start = await pillGap(p);
    await tapSel(p, '[data-nav-tab="race"]');
    await w(p, 60);
    const early = await pillGap(p);
    await w(p, 700);
    const end = await pillGap(p);
    await ctx.close();
    assert(start !== null && Math.abs(start) <= 2, 'all\'inizio la pillola non è sotto HOME: ' + start);
    assert(early < -40, 'la pillola salta invece di scivolare (dopo 60 ms è già a ' + early + ' px da RACE)');
    assert(Math.abs(end) <= 2, 'alla fine la pillola non è sotto RACE: ' + end);
    assert(!errs.length, errs.join(' | '));
  },

  async 'col dito la pagina segue lo swipe; se è corto torna a posto'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await press(p, await freeSpot(p), -60, 600);
    const mid = await pageNow(p);
    await p.mouse.up(); await w(p, 600);
    const end = await pageNow(p), tab = await activeTab(p);
    await ctx.close();
    assert(mid && mid.x < -20 && mid.x > -60, 'la pagina non segue il dito: ' + JSON.stringify(mid));
    assert(mid.peekRight > .3, 'non si vede la scheda accanto: ' + JSON.stringify(mid));
    assert(tab === 'home', 'uno swipe corto non deve cambiare scheda: ' + tab);
    assert(end.tr === 'none' && end.peekRight === 0, 'la pagina non torna a posto: ' + JSON.stringify(end));
    assert(!errs.length, errs.join(' | '));
  },

  // Sul telefono il gesto arriva come eventi touch (CDP Input.dispatchTouchEvent, come un dito vero).
  async 'col dito vero (touch): la pagina segue e poi cambia scheda'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    const cdp = await ctx.newCDPSession(p);
    const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
    const from = await freeSpot(p);
    await touch('touchStart', from.x, from.y);
    for (let i = 1; i <= 6; i++) { await touch('touchMove', from.x - 15 * i, from.y); await w(p, 40); }
    const mid = await pageNow(p);
    for (let i = 7; i <= 14; i++) { await touch('touchMove', from.x - 15 * i, from.y); await w(p, 20); }
    await w(p, 40);
    // Lungo abbastanza: la scheda accanto è tutta nello spazio lasciato dalla pagina (mai sopra) ed è rossa.
    const ready = await p.evaluate(() => {
      const k = document.querySelector('[data-tab-peek="right"]'), pg = document.querySelector('[data-tab-page]');
      const ico = k && k.querySelector('.tab-peek-ico');
      return k && { over: Math.round(pg.getBoundingClientRect().right - k.getBoundingClientRect().left), bg: getComputedStyle(ico).backgroundColor };
    });
    await touch('touchEnd');
    const out = await layers(p);
    await w(p, 600);
    const tab = await activeTab(p);
    await ctx.close();
    assert(mid && mid.x < -30 && mid.peekRight > .5, 'col dito vero la pagina non segue: ' + JSON.stringify(mid));
    assert(ready && ready.over <= 0, 'la scheda accanto copre la pagina: ' + JSON.stringify(ready));
    assert(ready.bg === 'rgb(255, 24, 1)', 'lasciando il dito si cambia scheda ma la scheda accanto non è rossa: ' + JSON.stringify(ready));
    assert(out.leave === 'left' && parseFloat(out.from) < -60, 'la scheda vecchia non parte dal dito: ' + JSON.stringify(out));
    assert(tab === 'garage', 'col dito vero non cambia scheda: ' + tab);
    assert(!errs.length, errs.join(' | '));
  },

  async 'swipe lungo: la vecchia esce dal punto dove la lascia il dito'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await press(p, await freeSpot(p), -200, 240, 8);
    const mid = await pageNow(p);
    await p.mouse.up();
    const out = await layers(p);
    await w(p, 600);
    const tab = await activeTab(p), after = await layers(p);
    await ctx.close();
    assert(mid && mid.x <= -100, 'col dito la pagina non si sposta: ' + JSON.stringify(mid));
    assert(out.leave === 'left' && Math.abs(parseFloat(out.from) - mid.x) <= 2, 'la scheda vecchia non parte dal dito: ' + JSON.stringify([mid, out]));
    assert(out.leaveX <= mid.x + 2, 'la scheda vecchia torna indietro prima di uscire: ' + JSON.stringify([mid, out]));
    assert(tab === 'garage' && after.pages === 1, 'dopo lo swipe: ' + JSON.stringify([tab, after]));
    assert(!errs.length, errs.join(' | '));
  },

  async 'con Rimuovi animazioni niente scivolate'(b) {
    const { ctx, p, errs } = await open(b, { reducedMotion: 'reduce' }); await login(p);
    await tapSel(p, '[data-nav-tab="garage"]');
    const mid = await layers(p);
    await press(p, await freeSpot(p), -60, 600);
    const drag = await pageNow(p);
    await p.mouse.up(); await w(p, 300);
    // Col mouse il primo trascinamento seleziona il testo e il secondo lo trascinerebbe (pointercancel): sul telefono no.
    await p.evaluate(() => getSelection().removeAllRanges());
    await press(p, await freeSpot(p), -220, 240, 8); await p.mouse.up(); await w(p, 300);
    const tab = await activeTab(p);
    await ctx.close();
    assert(!mid.leave && !mid.enter && mid.pages === 1, 'con Rimuovi animazioni la scheda scivola: ' + JSON.stringify(mid));
    assert(drag.tr === 'none', 'con Rimuovi animazioni la pagina segue il dito: ' + JSON.stringify(drag));
    assert(tab === 'fanta', 'con Rimuovi animazioni lo swipe deve cambiare scheda lo stesso: ' + tab);
    assert(!errs.length, errs.join(' | '));
  },

  async 'sottoschede della pagina RACE: il contenuto entra dalla parte giusta'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await goTab(p, 'RACE');
    const ids = await p.evaluate(() => [...document.querySelectorAll('[data-race-tab]')].map(e => e.getAttribute('data-race-tab')));
    await tapSel(p, `[data-race-tab="${ids[2]}"]`);
    const fwd = await p.evaluate(() => { const e = document.querySelector('[data-race-pane]'); return e && [e.getAttribute('data-race-pane'), e.getAttribute('data-sub-enter')]; });
    await w(p, 400);
    await tapSel(p, `[data-race-tab="${ids[0]}"]`);
    const back = await p.evaluate(() => { const e = document.querySelector('[data-race-pane]'); return e && [e.getAttribute('data-race-pane'), e.getAttribute('data-sub-enter')]; });
    await w(p, 500);
    const tr = await p.evaluate(() => getComputedStyle(document.querySelector('[data-race-pane]')).transform);
    await ctx.close();
    assert(fwd && fwd[0] === ids[2] && fwd[1] === 'left', 'verso destra il contenuto non entra da destra: ' + JSON.stringify(fwd));
    assert(back && back[0] === ids[0] && back[1] === 'right', 'verso sinistra il contenuto non entra da sinistra: ' + JSON.stringify(back));
    assert(tr === 'none', 'finita l\'animazione il contenuto ha ancora transform: ' + tr);
    assert(!errs.length, errs.join(' | '));
  },

  async 'tocchi veloci: mai più di due schede, alla fine una sola'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    const seen = [];
    for (const t of ['garage', 'fanta', 'race', 'home']) { await tapSel(p, `[data-nav-tab="${t}"]`); await w(p, 60); seen.push((await layers(p)).pages); }
    await w(p, 700);
    const end = await layers(p), tab = await activeTab(p);
    await ctx.close();
    assert(Math.max(...seen) <= 2, 'troppe schede montate insieme: ' + JSON.stringify(seen));
    assert(end.pages === 1 && tab === 'home', 'alla fine: ' + JSON.stringify([end, tab]));
    assert(!errs.length, errs.join(' | '));
  },
});
