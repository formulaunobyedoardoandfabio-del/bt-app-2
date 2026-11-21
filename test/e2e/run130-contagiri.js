// 21/11 (piano claude/multiviewer-in-sector4.md, Contagiri): nel Ghost Lap due contagiri circolari (pilota A e B) con
// velocità, arco della velocità 0-360, acceleratore a sinistra, freno a destra e marcia, senza giri motore né DRS (il
// dato non c'è). Seguono il dito sul grafico della velocità e i pallini del replay 2D della curva. Sotto i 140 px solo
// velocità e marcia. I numeri devono essere quelli che il Ghost Lap già scrive (stessi dati veri).
// Uso: node test/build-test.js && node test/e2e/run130-contagiri.js
const { open, w, tapSel, goTab, login, assert, run } = require('./helpers');

const NOW_SEPANG = '2026-10-05T11:48:00Z';
async function openGhost(p) { await goTab(p, 'RACE'); await tapSel(p, '[data-ghost-open]'); await w(p, 600); }
async function scrubAt(p, f) {
  const box = await p.evaluate(() => { const r = document.querySelector('[data-ghost-chart="speed"]').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  await p.mouse.move(box.x + box.w * (f - 0.05), box.y + box.h / 2); await p.mouse.move(box.x + box.w * f, box.y + box.h / 2); await w(p, 250);
}
const gauges = (p, scope) => p.evaluate(scope => [...document.querySelectorAll(scope + ' [data-contagiri]')].map(g => ({
  code: g.getAttribute('data-contagiri'),
  v: (g.querySelector('[data-contagiri-v]') || {}).textContent || '',
  gear: (g.querySelector('[data-contagiri-gear]') || {}).textContent || '',
  brake: g.getAttribute('data-brake'),
  thr: +g.getAttribute('data-throttle'),
  compact: g.hasAttribute('data-compact'),
  ticks: g.querySelectorAll('[data-contagiri-tick]').length,
  thrArc: !!g.querySelector('[data-contagiri-thr]'),
  w: g.getBoundingClientRect().width,
})), scope);

run({
  async 'col dito sul grafico: due contagiri con gli stessi numeri della lettura, senza giri motore né DRS'(b) {
    const { ctx, p, errs } = await open(b, { now: NOW_SEPANG });
    await login(p); await w(p, 600);
    await openGhost(p);
    const before = await gauges(p, '[data-ghost-readout]');
    await scrubAt(p, 0.55);
    const g = await gauges(p, '[data-ghost-readout]');
    const ro = await p.evaluate(() => (document.querySelector('[data-ghost-readout]') || {}).innerText || '');
    const body = await p.evaluate(() => (document.querySelector('[data-ghost-readout]') || {}).innerText || '');
    const wide = await p.evaluate(() => document.documentElement.scrollWidth);
    await ctx.close();
    assert(before.length === 0, 'prima di toccare il grafico niente contagiri');
    assert(g.length === 2, 'due contagiri: ' + g.length);
    // nella lettura: "CODE 287 km/h, 7ª, gas 100%" per A e per B
    g.forEach(x => {
      const m = new RegExp(x.code + '\\s+(\\d+) km/h, (\\d+)ª, gas (\\d+)%(, freno)?').exec(ro);
      assert(m, 'lettura di ' + x.code + ' non trovata: ' + ro);
      assert(x.v === m[1], x.code + ' velocità come la lettura: ' + x.v + ' invece di ' + m[1]);
      assert(x.gear === m[2], x.code + ' marcia come la lettura: ' + x.gear + ' invece di ' + m[2]);
      assert(Math.abs(x.thr * 100 - +m[3]) <= 1, x.code + ' gas come la lettura: ' + x.thr + ' / ' + m[3]);
      assert((x.brake === 'on') === !!m[4], x.code + ' freno come la lettura');
      assert(!x.compact && x.ticks === 7, x.code + ' a 390 px grande, con le cifre 0-360: ' + JSON.stringify(x));
    });
    assert(!/RPM|giri motore|DRS/i.test(body), 'niente giri motore né DRS: ' + body);
    assert(wide <= 390, 'niente scorrimento di lato: ' + wide);
    assert(!errs.length, errs.join(' | '));
  },

  async 'nel replay 2D della curva i contagiri seguono le due macchine'(b) {
    const { ctx, p, errs } = await open(b, { now: NOW_SEPANG });
    await login(p); await w(p, 600);
    await openGhost(p);
    await tapSel(p, '[data-ghost-corner="1"]'); await w(p, 300);
    await tapSel(p, '[data-ghost-replay]'); await w(p, 500);
    const read = () => p.evaluate(() => {
      const st = document.querySelector('[data-ghost-stage]');
      const chips = [...st.querySelectorAll('[data-ghost-chip]')].map(e => e.textContent);
      const gs = [...st.querySelectorAll('[data-contagiri]')].map(g => g.getAttribute('data-contagiri') + ' ' + (g.querySelector('[data-contagiri-v]') || {}).textContent + ' km/h');
      return { chips, gs };
    });
    await tapSel(p, '[data-ghost-play]'); await w(p, 200);   // pausa: i numeri restano fermi per confrontarli
    const a = await read();
    await tapSel(p, '[data-ghost-play]'); await w(p, 900);
    await tapSel(p, '[data-ghost-play]'); await w(p, 200);
    const b2 = await read();
    await ctx.close();
    assert(a.gs.length === 2, 'due contagiri nel replay: ' + JSON.stringify(a));
    assert(JSON.stringify(a.gs) === JSON.stringify(a.chips), 'stessi km/h delle etichette sulle macchine: ' + JSON.stringify(a));
    assert(JSON.stringify(b2.gs) === JSON.stringify(b2.chips) && JSON.stringify(b2.gs) !== JSON.stringify(a.gs), 'si muovono con le macchine: ' + JSON.stringify([a.gs, b2.gs]));
    assert(!errs.length, errs.join(' | '));
  },

  async 'a 320 px: contagiri compatti, solo velocità e marcia'(b) {
    const { ctx, p, errs } = await open(b, { now: NOW_SEPANG, width: 320, height: 640 });
    await login(p); await w(p, 600);
    await openGhost(p);
    await scrubAt(p, 0.3);
    const g = await gauges(p, '[data-ghost-readout]');
    const wide = await p.evaluate(() => document.documentElement.scrollWidth);
    await ctx.close();
    assert(g.length === 2 && g.every(x => x.compact && x.ticks === 0 && !x.thrArc && x.v && x.w < 140), 'compatti sotto i 140 px: ' + JSON.stringify(g));
    assert(wide <= 320, 'niente scorrimento di lato: ' + wide);
    assert(!errs.length, errs.join(' | '));
  },
});
