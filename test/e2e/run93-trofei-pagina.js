// 7/11 sera (Edoardo): dal design del Profilo solo la pagina "I miei trofei", che si apre solo toccando il bottone dei
// propri trofei (Apri la bacheca). Medaglia con quanti trofei e quanto manca alla prossima, Vinti / Da vincere,
// piastrelle a due colonne; tra i vinti in fondo, larga, quella da vincere più vicina con la barra.
// Uso: node test/build-test.js && node test/e2e/run93-trofei-pagina.js [filtro]
const { open, w, tapSel, login, assert, run } = require('./helpers');
const { TROPHIES } = require('../../src/logic/trophies');

const DAY = Date.parse('2026-10-12T10:00:00Z');
const WON = { casco: DAY, superlicenza: DAY + 1, griglia: DAY + 2, indovino: DAY + 3, mercato: DAY + 4, radio: DAY + 5 };
const USER = app2 => ({ 'users/a@b.it': { name: 'Tester', nick: 'Tester', email: 'a@b.it', about: { birth: 1999, follow: 2, fan: 'vivo', years: 5 }, app2 } });
const page = p => p.evaluate(() => {
  const e = document.querySelector('[data-trophy-page]'); if (!e) return null;
  const tiles = [...e.querySelectorAll('[data-trophy]')].map(x => ({ id: x.getAttribute('data-trophy'), won: x.getAttribute('data-won'), next: x.hasAttribute('data-tp-next'), text: x.innerText.replace(/\s+/g, ' ').trim(), span: getComputedStyle(x).gridColumnStart }));
  const medal = e.querySelector('[data-tp-medal]');
  return {
    title: (e.querySelector('h1') || {}).innerText, medal: medal && medal.getAttribute('data-tp-medal'), head: medal && medal.innerText.replace(/\s+/g, ' ').trim(),
    tabs: [...e.querySelectorAll('[data-tp-view]')].map(x => x.innerText.trim() + (x.getAttribute('aria-pressed') === 'true' ? '*' : '')),
    tiles, font: getComputedStyle(e).fontFamily, wide: document.documentElement.scrollWidth > window.innerWidth + 1,
  };
});

run({
  async 'si apre solo dal bottone: medaglia, Vinti e Da vincere, la prossima larga con la barra, Indietro torna al Profilo'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: USER({ trophies: WON, saved: ['n1', 'n2', 'n3'] }) } }); await login(p); await w(p, 800);
    await tapSel(p, '[aria-label="Profilo"]'); await w(p, 600);
    const before = await page(p);
    await tapSel(p, '[data-trophies-open]'); await w(p, 600);
    const won = await page(p);
    await p.screenshot({ path: '/tmp/bt/run93-vinti.png' });
    await tapSel(p, '[data-tp-view="todo"]'); await w(p, 400);
    const todo = await page(p);
    await tapSel(p, '[data-trophy-page] [aria-label="Indietro"]'); await w(p, 500);
    const back = await p.evaluate(() => ({ page: !!document.querySelector('[data-trophy-page]'), card: !!document.querySelector('[data-trophies]') }));
    await ctx.close();
    const n = won.tiles.filter(t => t.won === '1').length;
    assert(before === null, 'la pagina non deve esserci prima del tocco');
    assert(won && won.title === 'I miei trofei' && /Manrope/.test(won.font), 'pagina: ' + JSON.stringify(won && { t: won.title, f: won.font }));
    assert(n >= 6 && won.medal === (n >= 10 ? 'oro' : 'argento'), 'medaglia: ' + won.medal + ' con ' + n);
    assert(new RegExp('Argento, ' + n + ' trofei').test(won.head) && new RegExp('Ne mancan[oa] ' + (10 - n) + ' per l\'oro').test(won.head), 'testa: ' + won.head);
    assert(won.tabs[0] === `Vinti ${n}*` && won.tabs[1] === `Da vincere ${TROPHIES.length - n}`, 'interruttore: ' + won.tabs.join(' | '));
    assert(/Il mio casco 12 ottobre/.test(won.tiles.find(t => t.id === 'casco').text), 'data del trofeo: ' + JSON.stringify(won.tiles.find(t => t.id === 'casco')));
    const nx = won.tiles.find(t => t.next);
    assert(nx && nx.id === 'archivio' && nx.won === '0' && /3 di 5/.test(nx.text) && nx.span === 'span 2', 'la prossima, larga: ' + JSON.stringify(nx));
    assert(todo.tabs[1].endsWith('*') && todo.tiles.length === TROPHIES.length - n && todo.tiles.every(t => t.won === '0'), 'da vincere: ' + todo.tiles.length);
    const secret = todo.tiles.find(t => t.id === 'sgasata');
    assert(secret && /Trofeo segreto/.test(secret.text) && !/Sgasata/.test(secret.text), 'il segreto resta segreto: ' + JSON.stringify(secret));
    assert(!won.wide && !todo.wide, 'niente scorrimento orizzontale');
    assert(!back.page && back.card, 'Indietro torna al Profilo: ' + JSON.stringify(back));
    assert(!errs.length, errs.join(' | '));
  },
});
