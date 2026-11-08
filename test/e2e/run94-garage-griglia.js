// 7/11 sera (Edoardo, video): Garage a piastrelle quadrate sfalsate a mattoncino, colorate per sezione, da trascinare
// in tutte le direzioni; i bottoni in alto (GIOCHI, WEEKEND DI GARA, TRACCIATI, ANALISI, IN ARRIVO) portano lì.
// Uso: node test/build-test.js && node test/e2e/run94-garage-griglia.js [filtro]
const { open, w, tapSel, goTab, login, assert, run } = require('./helpers');

const grid = p => p.evaluate(() => {
  const c = document.querySelector('[data-garage-canvas]'); if (!c) return null;
  const box = c.getBoundingClientRect();
  const tiles = [...c.querySelectorAll('[data-garage-tile]')].map(e => { const r = e.getBoundingClientRect(); return { id: e.getAttribute('data-game') || e.getAttribute('data-soon'), sec: e.getAttribute('data-garage-tile'), x: Math.round(r.left - box.left + c.scrollLeft), y: Math.round(r.top - box.top + c.scrollTop), w: Math.round(r.width), h: Math.round(r.height), bg: getComputedStyle(e).backgroundImage + ' ' + getComputedStyle(e).backgroundColor, button: e.tagName === 'BUTTON' }; });
  return {
    tiles, sx: c.scrollLeft, sy: c.scrollTop, over: { x: c.scrollWidth > c.clientWidth + 20, y: c.scrollHeight > c.clientHeight + 20 },
    chips: [...document.querySelectorAll('[data-garage-sec]')].map(e => ({ id: e.getAttribute('data-garage-sec'), on: e.getAttribute('aria-pressed') === 'true', text: e.innerText.replace(/\s+/g, ' ').trim() })),
    wide: document.documentElement.scrollWidth > window.innerWidth + 1,
  };
});

run({
  // 8/11 (Edoardo): piastrelle con solo le icone, niente bottoni delle sezioni, lista come prima a scelta (resta scelta).
  async 'Garage: piastrelle solo icone (nome per il lettore dello schermo), niente bottoni sezioni, interruttore lista che resta'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await goTab(p, 'GARAGE'); await w(p, 400);
    const grid = await p.evaluate(() => ({ secs: document.querySelectorAll('[data-garage-sec]').length, tiles: [...document.querySelectorAll('[data-garage-tile]')].map(e => ({ txt: e.innerText.trim(), label: e.getAttribute('aria-label') || '' })), mode: document.querySelector('[data-garage-screen]').getAttribute('data-garage-mode') }));
    await tapSel(p, '[data-garage-view="lista"]'); await w(p, 400);
    const list = await p.evaluate(() => ({ rows: document.querySelectorAll('[data-garage-row]').length, text: document.querySelector('[data-garage-list]').innerText }));
    await goTab(p, 'HOME'); await w(p, 400); await goTab(p, 'GARAGE'); await w(p, 400);   // si esce e si rientra
    const again = await p.evaluate(() => (document.querySelector('[data-garage-screen]') || { getAttribute: () => 'nessuna' }).getAttribute('data-garage-mode') + ':' + localStorage.getItem('bt_bt-garage-view'));
    await ctx.close();
    assert(grid.mode === 'griglia' && grid.secs === 0, 'griglia senza bottoni delle sezioni: ' + JSON.stringify(grid).slice(0, 200));
    assert(grid.tiles.length > 10 && grid.tiles.every(t => t.txt === '' && t.label.length > 3), 'piastrelle senza testo, col nome nascosto: ' + JSON.stringify(grid.tiles.slice(0, 3)));
    assert(list.rows >= 10 && /Pit Stop Challenge/.test(list.text) && /GIOCHI/.test(list.text) && /IN ARRIVO/.test(list.text), 'lista come prima: ' + list.text.slice(0, 200));
    assert(again === 'lista:"lista"', 'la scelta resta (salvata sul telefono): ' + again);
    assert(!errs.length, errs.join(' | '));
  },
  async 'SKIP 8/11 tolti i bottoni delle sezioni e i nomi sulle piastrelle (Edoardo): piastrelle quadrate a mattoncino, colori per sezione, si trascina nei due versi; i bottoni portano alla sezione'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await goTab(p, 'GARAGE'); await w(p, 700);
    const g0 = await grid(p);
    await p.screenshot({ path: '/tmp/bt/run94-garage.png' });
    await tapSel(p, '[data-garage-sec="soon"]'); await w(p, 900);
    const g1 = await grid(p);
    const seen = await p.evaluate(() => { const c = document.querySelector('[data-garage-canvas]').getBoundingClientRect(), e = document.querySelector('[data-soon="reaction"]').getBoundingClientRect(); return e.top >= c.top - 1 && e.bottom <= c.bottom + 1 && e.left >= c.left - 1 && e.right <= c.right + 1; });
    await tapSel(p, '[data-game="aero"]'); await w(p, 500);
    const opened = await p.evaluate(() => !document.querySelector('[data-garage-canvas]') && /Drag vs Downforce/i.test(document.body.innerText));
    await ctx.close();
    const t = g0.tiles;
    assert(t.length === 22 && t.every(x => x.w === x.h && x.w >= 88), 'piastrelle quadrate: ' + JSON.stringify(t.slice(0, 2)));
    const rows = [...new Set(t.map(x => x.y))].sort((a, b) => a - b);
    const row0 = t.filter(x => x.y === rows[0]), row1 = t.filter(x => x.y === rows[1]);
    const step = row0[1].x - row0[0].x;
    assert(row0.length === 4 && Math.abs((row1[0].x - row0[0].x) - step / 2) <= 1, 'mattoncino: la seconda riga spostata di mezza piastrella ' + JSON.stringify({ r0: row0[0].x, r1: row1[0].x, step }));
    assert(t.slice(0, 3).map(x => x.id).join() === 'pitstop,silly,aero', 'prima i giochi: ' + t.slice(0, 3).map(x => x.id).join());
    const bgOf = sec => new Set(t.filter(x => x.sec === sec).map(x => x.bg));
    assert(['giochi', 'weekend', 'tracciati', 'analisi'].every(s => bgOf(s).size === 1) && new Set(['giochi', 'weekend', 'tracciati', 'analisi'].map(s => [...bgOf(s)][0])).size === 4, 'un colore per sezione');
    assert(t.filter(x => x.sec === 'soon').every(x => !x.button) && t.filter(x => x.sec !== 'soon').every(x => x.button), 'solo i giochi pronti si toccano');
    assert(g0.over.x && g0.over.y, 'si trascina di lato e in giù: ' + JSON.stringify(g0.over));
    assert(g0.chips.map(c => c.id).join() === 'giochi,weekend,tracciati,analisi,soon' && g0.chips[0].on && /^GIOCHI 3$/.test(g0.chips[0].text) && /^IN ARRIVO 11$/.test(g0.chips[4].text), 'bottoni: ' + JSON.stringify(g0.chips));
    assert(g1.chips.find(c => c.id === 'soon').on && seen && (g1.sy > g0.sy || g1.sx !== g0.sx), 'IN ARRIVO porta alle piastrelle in arrivo: ' + JSON.stringify({ sx: g1.sx, sy: g1.sy, seen }));
    assert(opened, 'la piastrella apre il gioco');
    assert(!g0.wide, 'niente scorrimento orizzontale della pagina');
    assert(!errs.length, errs.join(' | '));
  },
});
