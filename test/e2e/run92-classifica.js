// 7/11 sera (Edoardo): la classifica completa della lega FantaF1 è una pagina a parte che si apre solo toccando
// "Vedi la classifica completa" (o il titolo CLASSIFICA LEGA). Design "Amici del paddock": nome della lega, quante
// squadre, interruttore Questo GP / Stagione, podio 2-1-3 coi gradini, poi gli altri con le zone Q1/Q2.
// Uso: node test/build-test.js && node test/e2e/run92-classifica.js [filtro]
const { open, w, tapSel, goTab, login, assert, run } = require('./helpers');
const { leagueSeed } = require('../fake/leagues');

const NAMES = ['Anna', 'Bruno', 'Carla', 'Dario', 'Elena', 'Fabio', 'Gina', 'Ivo', 'Luca', 'Mara', 'Nico'];
const page = p => p.evaluate(() => {
  const e = document.querySelector('[data-league-full]'); if (!e) return null;
  const q = s => [...e.querySelectorAll(s)];
  return {
    count: (e.querySelector('[data-lt-count]') || {}).innerText,
    title: (e.querySelector('h1') || {}).innerText,
    podium: q('[data-lt-podium]').map(x => x.getAttribute('data-lt-podium') + ':' + x.innerText.replace(/\s+/g, ' ').trim()),
    rows: q('[data-lt-row]').map(x => ({ pos: x.getAttribute('data-lt-pos'), text: x.innerText.replace(/\s+/g, ' ').trim() })),
    zones: q('[data-lt-zone]').map(x => x.getAttribute('data-lt-zone')),
    pressed: q('[data-lt-view]').filter(x => x.getAttribute('aria-pressed') === 'true').map(x => x.getAttribute('data-lt-view')),
    moves: q('[data-lt-move]').map(x => x.getAttribute('data-lt-move')),
    empty: !!e.querySelector('[data-lt-empty]'),
    font: getComputedStyle(e).fontFamily, bg: getComputedStyle(e).backgroundColor,
    wide: document.documentElement.scrollWidth > window.innerWidth + 1,
  };
});

run({
  async 'si apre solo toccando: podio 2-1-3, 12 squadre, zone; Questo GP senza risultati; Indietro torna al Fanta'(b) {
    const members = NAMES.map((name, i) => ({ name, bonus: 100 - i * 5 }));
    const { ctx, p, errs } = await open(b, { seed: { addDocs: leagueSeed({ members }) } }); await login(p);
    await goTab(p, 'FANTA'); await w(p, 700);
    const before = await page(p);
    await p.evaluate(() => document.querySelector('[data-league-full-btn]').scrollIntoView({ block: 'center' })); await w(p, 200);
    await tapSel(p, '[data-league-full-btn]'); await w(p, 600);
    const season = await page(p);
    await p.screenshot({ path: '/tmp/bt/run92-stagione.png' });
    await tapSel(p, '[data-lt-view="gp"]'); await w(p, 400);
    const gp = await page(p);
    await tapSel(p, '[data-league-full] [aria-label="Indietro"]'); await w(p, 500);
    const back = await p.evaluate(() => ({ full: !!document.querySelector('[data-league-full]'), table: !!document.querySelector('[data-league-table]') }));
    await tapSel(p, '[data-league-open]'); await w(p, 500);
    const again = await page(p);
    await ctx.close();
    assert(before === null, 'la pagina non deve esserci prima del tocco');
    assert(season, 'la classifica completa non si apre');
    assert(season.count === '12 squadre', 'squadre: ' + season.count);
    assert(/Manrope/.test(season.font) && season.bg === 'rgb(0, 0, 0)', 'stile del design: ' + season.font + ' ' + season.bg);
    assert(season.podium.map(x => x[0]).join() === '2,1,3', 'podio 2-1-3: ' + season.podium.join(' | '));
    assert(season.podium[1] === '1:AN Anna 100 pt 1' && season.podium[0] === '2:BR Bruno 95 pt 2' && season.podium[2] === '3:CA Carla 90 pt 3', 'podio: ' + season.podium.join(' | '));
    assert(season.rows.length === 9 && season.rows[0].pos === '4' && /^4 DA Dario 85$/.test(season.rows[0].text), 'lista dal 4° (posizione, sigla, nome, punti): ' + JSON.stringify(season.rows.slice(0, 2)));
    assert(season.rows.some(r => /Tester \(tu\)/.test(r.text)), 'la mia riga con (tu): ' + JSON.stringify(season.rows.map(r => r.text)));
    assert(season.moves.every(m => m === 'same'), 'senza GP contati nessuna freccia su o giù: ' + season.moves.join());
    assert(season.zones.join() === 'q2,q1', 'zone Q2 e Q1: ' + season.zones.join());
    assert(season.pressed.join() === 'season', 'senza GP contati si parte dalla Stagione: ' + season.pressed.join());
    assert(gp.pressed.join() === 'gp' && gp.empty && gp.podium.length === 0, 'Questo GP senza risultati: ' + JSON.stringify(gp));
    assert(gp.rows.length === 12 && gp.rows.every(r => r.pos === '' && /–$/.test(r.text)), 'senza GP tutti "–": ' + JSON.stringify(gp.rows.slice(0, 2)));
    assert(!season.wide, 'niente scorrimento orizzontale');
    assert(!back.full && back.table, 'Indietro deve tornare al Fanta: ' + JSON.stringify(back));
    assert(again && again.count === '12 squadre', 'anche il titolo CLASSIFICA LEGA apre la pagina');
    assert(!errs.length, errs.join(' | '));
  },
});
