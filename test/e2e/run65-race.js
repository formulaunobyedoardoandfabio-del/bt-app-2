// Tappa 3, Task 16 (G27, G28):
// - Pit Board: nella pagina Race, scorrendo i tempi, l'intestazione diventa il tabellone del muretto (posizione,
//   distacco, giro) del pilota preferito, o del primo senza preferito.
// - Degrado gomme: scorrendo i giri dello stint la gomma disegnata passa da lucida a rovinata (graining, poi
//   blistering) secondo il degrado vero calcolato (tempo perso dalla retta del degrado; dopo il crollo: blistering).
// Uso: node test/build-test.js && node test/e2e/run65-race.js [filtro]
const { open, w, tapText, tapSel, goTab, login, openAdmin, assert, run } = require('./helpers');

const USER = fav => ({ 'users/a@b.it': { name: 'Tester', nick: 'Tester', email: 'a@b.it', about: { birth: null, follow: 2, fan: 'vivo' }, app2: fav ? { favDriver: fav } : {} } });
async function startRace(p) {
  await openAdmin(p, 'GARA LIVE'); await tapText(p, 'AVVIA GARA', { exact: true }); await w(p, 300);
  await tapSel(p, '[aria-label="Indietro"]'); await w(p); await tapSel(p, '[aria-label="Indietro"]'); await w(p, 300);
  await p.evaluate(() => window.__btLive.advance(600)); await w(p, 300);
  await goTab(p, 'RACE'); await w(p, 400);
}
const raceScroll = p => p.evaluate(() => [...document.querySelectorAll('.scrollcol')].findIndex(s => s.querySelector('[data-timing-row]')));
const scrollTo = (p, where) => p.evaluate(where => {
  const sc = [...document.querySelectorAll('.scrollcol')].find(s => s.querySelector('[data-timing-row]'));
  const tbl = sc.querySelector('[data-timing-row]');
  sc.scrollTop = where === 'top' ? 0 : sc.scrollTop + tbl.getBoundingClientRect().top - sc.getBoundingClientRect().top + 60;
}, where);
const board = p => p.evaluate(() => {
  const b = document.querySelector('[data-pit-board]'); if (!b) return null;
  return { visible: b.getAttribute('data-visible'), driver: b.getAttribute('data-pit-board'), text: b.innerText.replace(/\s+/g, ' ').trim(), opacity: getComputedStyle(b.firstElementChild).opacity };
});
const rowOf = (p, id) => p.evaluate(id => {
  const r = document.querySelector(`[data-timing-id="${id}"]`); if (!r) return null;
  const g = r.querySelector('[data-timing-gap]');
  return { pos: r.getAttribute('data-timing-pos'), gap: g ? g.textContent.trim() : null };
}, id);

run({
  "scorrendo i tempi l'intestazione diventa la Pit Board (posizione, distacco, giro) del preferito"(b) {
    return (async () => {
      const { ctx, p, errs } = await open(b, { seed: { addDocs: USER('leclerc') } }); await login(p);
      await startRace(p);
      const idx = await raceScroll(p);
      const top = await board(p);
      await scrollTo(p, 'table'); await w(p, 450);
      const lec = await rowOf(p, 'leclerc'), on = await board(p);
      await scrollTo(p, 'top'); await w(p, 450);
      const off = await board(p);
      await ctx.close();
      // Senza preferito: il primo.
      const o = await open(b); await login(o.p); await startRace(o.p);
      await scrollTo(o.p, 'table'); await w(o.p, 450);
      const lead = await board(o.p);
      await o.ctx.close();
      assert(idx >= 0, 'nella pagina Race mancano i tempi');
      assert(top && top.visible === '0' && top.opacity === '0', 'in cima alla pagina la Pit Board non deve vedersi: ' + JSON.stringify(top));
      assert(on && on.visible === '1' && on.opacity === '1' && on.driver === 'leclerc', 'scorrendo i tempi manca la Pit Board di Leclerc: ' + JSON.stringify(on));
      assert(lec && on.text.includes('LEC') && on.text.includes('P' + lec.pos) && on.text.includes(lec.gap), 'Pit Board diversa dalla riga di Leclerc: ' + JSON.stringify({ lec, on }));
      assert(/GIRO \d+\/\d+/.test(on.text), 'sulla Pit Board manca il giro: ' + on.text);
      assert(off && off.visible === '0', 'tornando su la Pit Board resta: ' + JSON.stringify(off));
      assert(lead && lead.visible === '1' && /P1\b/.test(lead.text) && /LEADER/.test(lead.text), 'senza preferito la Pit Board è del primo: ' + JSON.stringify(lead));
      assert(!errs.length && !o.errs.length, [...errs, ...o.errs].join(' | '));
    })();
  },

  "Degrado gomme: scorrendo i giri la gomma passa da lucida a graining e blistering secondo il degrado"(b) {
    return (async () => {
      const { ctx, p, errs } = await open(b); await login(p);
      await goTab(p, 'GARAGE'); await tapSel(p, '[data-game="deg"]'); await w(p, 500);
      await p.selectOption('#degRace', 'es-2026'); await w(p, 300);
      await tapSel(p, '[data-deg-row][data-cliff="1"]'); await w(p, 300);
      const read = () => p.evaluate(() => {
        const s = document.querySelector('[data-wear-slider]'), t = document.querySelector('[data-wear-tyre]');
        if (!s || !t) return null;
        const layer = n => { const e = t.querySelector(`[data-wear-layer="${n}"]`); return e ? +getComputedStyle(e).opacity : null; };
        return { min: +s.min, max: +s.max, value: +s.value, wear: t.getAttribute('data-wear'), loss: +t.getAttribute('data-loss'), cliff: t.getAttribute('data-cliff-age'), label: (document.querySelector('[data-wear-label]') || {}).textContent, gloss: layer('gloss'), grain: layer('graining'), blister: layer('blistering') };
      });
      const set = v => p.evaluate(v => { const s = document.querySelector('[data-wear-slider]'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(s, String(v)); s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })); }, v);
      const a = await read();
      const seen = [];
      for (let v = a.min; v <= a.max; v++) { await set(v); await w(p, 40); seen.push(await read()); }
      await ctx.close();
      const expect = r => (r.cliff && r.value >= +r.cliff) || r.loss >= 0.8 ? 'blistering' : r.loss >= 0.3 ? 'graining' : 'lucida';
      assert(a && a.wear === 'lucida' && a.value === a.min, 'all\'inizio dello stint la gomma è lucida: ' + JSON.stringify(a));
      assert(seen.every(r => r.wear === expect(r)), 'stato della gomma diverso dal degrado: ' + JSON.stringify(seen.filter(r => r.wear !== expect(r)).slice(0, 3)));
      assert(seen[seen.length - 1].wear === 'blistering', 'dopo il crollo la gomma non ha il blistering: ' + JSON.stringify(seen[seen.length - 1]));
      const last = seen[seen.length - 1];
      assert(last.blister > .5 && a.gloss > .5 && last.gloss < a.gloss, 'il disegno non cambia: ' + JSON.stringify({ a, last }));
      assert(/Giro \d+ dello stint/.test(last.label) && /blistering/i.test(last.label), 'etichetta: ' + last.label);
      assert(!errs.length, errs.join(' | '));
    })();
  },
});
