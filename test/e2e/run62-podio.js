// Tappa 3, Task 13 (G19, G20): il podio è un sollevatore idraulico (i gradini salgono uno alla volta quando compare) e
// accanto a posizioni e prezzi che cambiano ci sono le frecce animate: verde che scatta in su, rossa che scende,
// trattino grigio se uguale. Posizioni del mondiale rispetto alla gara prima (prevPosition salvata dall'admin quando
// arrivano i punti di una gara nuova), prezzi del FantaF1 (variazione dopo l'ultima gara).
// Uso: node test/build-test.js && node test/e2e/run62-podio.js [filtro]
const { open, w, tapText, tapSel, goTab, login, openAdmin, assert, run } = require('./helpers');

const doc = (p, path) => p.evaluate(x => window.firebase.__fake.doc(x), path);
const openChamp = async p => { await goTab(p, 'RACE'); await tapSel(p, '[data-race-tab="mondiale"]'); };
const lifts = p => p.evaluate(() => [...document.querySelectorAll('[data-lift]')].map(e => {
  const s = getComputedStyle(e);
  return { order: +e.getAttribute('data-lift'), place: +e.closest('[data-podium-place]').getAttribute('data-podium-place'), name: s.animationName, delay: parseFloat(s.animationDelay), dur: parseFloat(s.animationDuration), transform: s.transform, old: !!e.__old };
}));
const trend = (p, sel) => p.evaluate(s => {
  const e = document.querySelector(s); if (!e) return null;
  const st = getComputedStyle(e);
  return { dir: e.getAttribute('data-trend') || e.getAttribute('data-price-change'), text: e.textContent, label: e.getAttribute('aria-label'), color: st.color, anim: st.animationName };
}, sel);

const PILOTI = [
  { id: 'p1', name: 'Andrea Kimi Antonelli', team: 'MERCEDES', position: 1, points: 302, prevPosition: 1 },
  { id: 'p2', name: 'George Russell', team: 'MERCEDES', position: 2, points: 236, prevPosition: 3 },
  { id: 'p3', name: 'Lewis Hamilton', team: 'FERRARI', position: 3, points: 199, prevPosition: 2 },
  { id: 'p4', name: 'Lando Norris', team: 'MCLAREN', position: 4, points: 186, prevPosition: 6 },
  { id: 'p5', name: 'Charles Leclerc', team: 'FERRARI', position: 5, points: 179, prevPosition: 4 },
  { id: 'p6', name: 'Max Verstappen', team: 'RED BULL', position: 6, points: 163 },
];
const SEED = { addDocs: { 'shared/bt-piloti': { __arr: PILOTI } } };
const GREEN = 'rgb(74, 229, 74)', RED = 'rgb(255, 90, 95)', GREY = 'rgb(134, 133, 140)';

run({
  async 'podio: i gradini salgono uno alla volta (data-lift)'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await openChamp(p); await w(p, 60);
    const a = await lifts(p);
    await w(p, 2200);
    const end = await lifts(p);
    await p.evaluate(() => document.querySelectorAll('[data-lift]').forEach(e => { e.__old = true; }));
    await tapText(p, 'Costruttori', { exact: true }); await w(p, 60);
    const again = await lifts(p);
    await ctx.close();
    const r = await open(b, { reducedMotion: 'reduce' }); await login(r.p);
    await openChamp(r.p); await w(r.p, 60);
    const still = await lifts(r.p);
    await r.ctx.close();
    a.sort((x, y) => x.order - y.order);
    assert(a.length === 3 && a.every(x => x.name === 'podiumlift'), 'gradini con il sollevatore: ' + JSON.stringify(a));
    assert(a.map(x => x.place).join() === '3,2,1', 'salgono il 3°, poi il 2°, poi il 1°: ' + JSON.stringify(a));
    assert(a[0].delay < a[1].delay && a[1].delay < a[2].delay && a[1].delay - a[0].delay >= a[0].dur * .4, 'non salgono uno alla volta: ' + JSON.stringify(a));
    assert(end.every(x => x.transform === 'none' || x.transform === 'matrix(1, 0, 0, 1, 0, 0)'), 'a fine salita i gradini non sono al loro posto: ' + JSON.stringify(end));
    assert(again.length === 3 && again.every(x => !x.old && x.name === 'podiumlift'), 'cambiando classifica il podio non risale: ' + JSON.stringify(again));
    assert(still.length === 3 && still.every(x => x.name === 'none'), 'con "Rimuovi animazioni" i gradini salgono lo stesso: ' + JSON.stringify(still));
    assert(!errs.length && !r.errs.length, [...errs, ...r.errs].join(' | '));
  },

  async 'frecce: verde su, rossa giù, trattino grigio uguale'(b) {
    const { ctx, p, errs } = await open(b, { seed: SEED }); await login(p);
    await openChamp(p); await w(p, 400);
    const same = await trend(p, '[data-podium-place="1"] [data-trend]');
    const up1 = await trend(p, '[data-podium-place="2"] [data-trend]');
    const down1 = await trend(p, '[data-podium-place="3"] [data-trend]');
    const up2 = await trend(p, '[data-champ-row="4"] [data-trend]');
    const down2 = await trend(p, '[data-champ-row="5"] [data-trend]');
    const none = await trend(p, '[data-champ-row="6"] [data-trend]');
    await goTab(p, 'FANTA'); await w(p, 300);
    const pUp = await trend(p, '[data-fanta-card="russell"] [data-price-change]');
    const pDown = await trend(p, '[data-fanta-card="hamilton"] [data-price-change]');
    const pSame = await trend(p, '[data-fanta-card="perez"] [data-price-change]');
    await tapSel(p, '[aria-label="Cambia Lewis Hamilton"]'); await w(p, 400);   // nell'elenco per la scelta ci sono tutti
    const pNone = await trend(p, '[data-pick="verstappen"] [data-price-change]');
    const pPick = await trend(p, '[data-pick="russell"] [data-price-change]');
    await ctx.close();
    assert(same && same.dir === 'same' && same.text === '–' && same.color === GREY && /stessa posizione/.test(same.label), 'uguale: ' + JSON.stringify(same));
    assert(up1 && up1.dir === 'up' && up1.color === GREEN && up1.anim === 'trendup' && /1/.test(up1.text) && /guadagnata 1 posizione/i.test(up1.label), 'su di 1: ' + JSON.stringify(up1));
    assert(down1 && down1.dir === 'down' && down1.color === RED && down1.anim === 'trenddown' && /persa 1 posizione/i.test(down1.label), 'giù di 1: ' + JSON.stringify(down1));
    assert(up2 && up2.dir === 'up' && /2/.test(up2.text) && /guadagnate 2 posizioni/i.test(up2.label), 'su di 2: ' + JSON.stringify(up2));
    assert(down2 && down2.dir === 'down', 'giù: ' + JSON.stringify(down2));
    assert(none === null, 'senza la posizione di prima non ci deve essere la freccia: ' + JSON.stringify(none));
    assert(pUp && pUp.dir === 'up' && pUp.color === GREEN && pUp.anim === 'trendup' && /▲\$0\.3M/.test(pUp.text), 'prezzo su: ' + JSON.stringify(pUp));
    assert(pDown && pDown.dir === 'down' && pDown.color === RED && pDown.anim === 'trenddown' && /▼\$0\.3M/.test(pDown.text), 'prezzo giù: ' + JSON.stringify(pDown));
    assert(pSame && pSame.dir === 'same' && pSame.text === '–' && pSame.color === GREY, 'prezzo uguale: ' + JSON.stringify(pSame));
    assert(pNone === null, 'variazione non conosciuta: niente freccia ' + JSON.stringify(pNone));
    assert(pPick && pPick.dir === 'up' && pPick.anim === 'trendup', 'freccia anche nell\'elenco per la scelta: ' + JSON.stringify(pPick));
    assert(!errs.length, errs.join(' | '));
  },

  async 'admin: con i punti di una gara nuova la posizione di prima resta per le frecce'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: { 'shared/bt-piloti': { __arr: PILOTI.map(({ prevPosition, ...r }) => r) } } } }); await login(p);
    await openAdmin(p, 'CLASSIFICHE');
    await p.fill('[aria-label="Punti Lando Norris"]', '250'); await w(p, 100);
    await tapText(p, 'ORDINA PER PUNTI', { exact: true }); await w(p, 100);
    await tapText(p, 'SALVA', { exact: true }); await w(p, 900);
    const first = await doc(p, 'shared/bt-piloti');
    // Seconda volta solo la nota: le posizioni di prima restano quelle di prima della gara.
    await p.fill('#stNote', 'Aggiornata dopo il GP di prova'); await w(p, 100);
    await tapText(p, 'SALVA', { exact: true }); await w(p, 900);
    const second = await doc(p, 'shared/bt-piloti');
    await tapSel(p, '[aria-label="Indietro"]'); await w(p, 300);
    await tapSel(p, '[aria-label="Indietro"]'); await w(p, 300);
    await openChamp(p); await w(p, 400);
    const nor = await trend(p, '[data-podium-place="2"] [data-trend]');
    await ctx.close();
    const arr = d => (d && (d.__arr || d.list || d)) || [];
    const by = (d, name) => arr(d).find(x => x.name === name) || {};
    assert(by(first, 'Lando Norris').position === 2 && by(first, 'Lando Norris').prevPosition === 4, 'Norris dopo il salvataggio: ' + JSON.stringify(by(first, 'Lando Norris')));
    assert(by(first, 'George Russell').prevPosition === 2 && by(first, 'George Russell').position === 3, 'Russell: ' + JSON.stringify(by(first, 'George Russell')));
    assert(by(second, 'Lando Norris').prevPosition === 4 && by(second, 'George Russell').prevPosition === 2, 'cambiando solo la nota le posizioni di prima cambiano: ' + JSON.stringify(arr(second)));
    assert(nor && nor.dir === 'up' && /2/.test(nor.text), 'nel mondiale Norris sale di 2: ' + JSON.stringify(nor));
    assert(!errs.length, errs.join(' | '));
  },
});
