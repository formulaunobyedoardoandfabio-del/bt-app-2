// 14/11 (Edoardo: "nell'archivio storico GP prendi dati da FastF1 e rendi possibile riguardare la gara dalla sezione
// race se l'utente vuole"). Archivio vero al posto dei 4 riquadri "(demo)": gli anni passati da FastF1
// (public/data/archivio, tools/fastf1_archivio.py), il 2026 dai dati già nell'app; ogni gara si riguarda giro per giro
// (src/logic/replay.js). Si apre dalla Home (Contenuti Premium) e dalla scheda RACE. Contenuto Premium.
// Uso: node test/build-test.js && node test/e2e/run114-archivio.js
const { open, w, tapSel, login, goTab, assert, run } = require('./helpers');

const RACE25 = { round: 1, name: "GP d'Australia", place: 'Melbourne', date: '2025-03-16', circuitId: 'au-1953', laps: 3, drivers: {
  NOR: { team: 'mclaren', tn: 'McLaren', name: 'Lando Norris', pos: 1, grid: 1, status: 'Finished', n: 3, t: [92000, 90000, 90000], p: [2, 1, 1], f: [0, 4, 0] },
  VER: { team: 'redbull', tn: 'Red Bull Racing', name: 'Max Verstappen', pos: 2, grid: 3, status: 'Finished', n: 3, t: [91000, 92000, 90000], p: [1, 2, 2], f: [0, 4, 0] },
  RUS: { team: 'mercedes', tn: 'Mercedes', name: 'George Russell', pos: null, grid: 4, status: 'Accident', n: 1, t: [93000], p: [3], f: [0] },
} };
const json = body => r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
const ROUTES = {
  'https://bt-app-2.vercel.app/data/archivio/index.json': json({ source: 'FastF1', years: [{ year: 2025, races: 1, h: 'abc' }] }),
  'https://bt-app-2.vercel.app/data/archivio/2025.json*': json({ year: 2025, source: 'FastF1', races: [RACE25] }),
};
const st = p => p.evaluate(() => ({
  text: document.body.innerText,
  lap: (document.querySelector('[data-replay-lap]') || {}).textContent || '',
  order: [...document.querySelectorAll('[data-replay-row]')].sort((a, b) => +a.getAttribute('data-pos') - +b.getAttribute('data-pos')).map(e => e.getAttribute('data-replay-row')).join(','),
  flag: (document.querySelector('[data-replay-flag]') || {}).textContent || '',
}));

run({
  async 'archivio dalla Home: anni da FastF1, gara, classifica e "Riguarda la gara" giro per giro'(b) {
    const { ctx, p, errs } = await open(b, { seed: { pro: true }, routes: ROUTES });
    await login(p); await w(p, 800);
    const demo = await p.evaluate(() => /\(demo\)|Vinto da L\. Norris/.test(document.body.innerText));
    await tapSel(p, '[data-archive-open]'); await w(p, 900);
    const years = await p.evaluate(() => [...document.querySelectorAll('[data-archive-year]')].map(e => e.getAttribute('data-archive-year')));
    await tapSel(p, '[data-archive-year="2025"]'); await w(p, 700);
    await tapSel(p, '[data-archive-race="2025-1"]'); await w(p, 600);
    const detail = await p.evaluate(() => [...document.querySelectorAll('[data-archive-row]')].map(e => e.innerText.replace(/\s+/g, ' ')));
    await tapSel(p, '[data-replay-open]'); await w(p, 600);
    const l1 = await st(p);
    await tapSel(p, '[data-replay-play]'); await w(p, 1600);
    const l2 = await st(p);
    await p.evaluate(() => { const s = document.querySelector('[data-replay-slider]'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(s, '3'); s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })); });
    await w(p, 500);
    const l3 = await st(p);
    await tapSel(p, '[aria-label="Indietro"]'); await w(p, 400);
    const backDetail = await p.evaluate(() => !!document.querySelector('[data-archive-detail]'));
    await ctx.close();
    assert(!demo, 'niente più riquadri "(demo)" nell\'archivio');
    assert(years.includes('2026') && years.includes('2025'), 'anni: il 2026 dell\'app e il 2025 da FastF1: ' + years.join(','));
    assert(/^1 .*NOR|Norris/.test(detail[0] || '') && detail.length === 3 && /Ritirato|Accident/.test(detail[2] || ''), 'classifica della gara: ' + JSON.stringify(detail));
    assert(/GIRO 1\/3/.test(l1.lap) && l1.order === 'VER,NOR,RUS', 'giro 1: VER davanti (posizioni di FastF1): ' + JSON.stringify([l1.lap, l1.order]));
    assert(/GIRO 2\/3/.test(l2.lap) && l2.order === 'NOR,VER,RUS' && /SAFETY CAR/.test(l2.flag), 'play: al giro 2 NOR passa, Safety Car: ' + JSON.stringify([l2.lap, l2.order, l2.flag]));
    assert(/GIRO 3\/3/.test(l3.lap) && l3.order === 'NOR,VER,RUS' && /RIT/.test(l3.text), 'fine gara: ordine ufficiale, RUS ritirato: ' + JSON.stringify([l3.lap, l3.order]));
    assert(backDetail, 'Indietro dal replay: si torna alla gara');
    assert(!errs.length, errs.join(' | '));
  },

  async 'dalla scheda RACE: "Riguarda una gara" apre l\'archivio; una gara 2026 si riguarda coi dati dell\'app'(b) {
    const { ctx, p, errs } = await open(b, { seed: { pro: true } });   // sito irraggiungibile: niente anni passati
    await login(p); await w(p, 800);
    await goTab(p, 'RACE'); await w(p, 600);
    await tapSel(p, '[data-race-archive]'); await w(p, 900);
    const s = await p.evaluate(() => ({ on: !!document.querySelector('[data-archive]'), years: [...document.querySelectorAll('[data-archive-year]')].map(e => e.getAttribute('data-archive-year')), text: document.body.innerText }));
    await tapSel(p, '[data-archive-race^="2026-"]'); await w(p, 600);
    await tapSel(p, '[data-replay-open]'); await w(p, 600);
    const r = await st(p);
    await ctx.close();
    assert(s.on && s.years.join() === '2026', 'archivio aperto dalla RACE, solo il 2026 senza sito: ' + s.years.join());
    assert(/anni prima del 2026 non sono ancora/i.test(s.text), 'detto chiaro che gli anni passati non ci sono ancora');
    assert(/GIRO 1\//.test(r.lap) && r.order.split(',').length >= 10, 'replay di una gara 2026: ' + JSON.stringify([r.lap, r.order.slice(0, 40)]));
    assert(!errs.length, errs.join(' | '));
  },

  async 'senza Premium: "Riguarda una gara" apre la finestra Premium'(b) {
    const { ctx, p, errs } = await open(b, { routes: ROUTES });
    await login(p); await w(p, 800);
    await goTab(p, 'RACE'); await w(p, 600);
    await tapSel(p, '[data-race-archive]'); await w(p, 700);
    const s = await p.evaluate(() => ({ sheet: !!document.querySelector('[data-premium-sheet]'), arch: !!document.querySelector('[data-archive]') }));
    await ctx.close();
    assert(s.sheet && !s.arch, 'senza Premium si apre la finestra Premium, non l\'archivio: ' + JSON.stringify(s));
    assert(!errs.length, errs.join(' | '));
  },
});
