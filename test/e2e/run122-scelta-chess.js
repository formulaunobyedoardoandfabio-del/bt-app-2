// 15/11 (Edoardo): "per la selezione del pilota nella scuderia del Fanta fai come su chess.com, ecco il testo per ogni
// pilota". In alto il pilota scelto con la sua frase (src/data/driver-lines.js), sotto tutti i piloti per scuderia, in
// fondo "Prendi". Frasi: test/unit/driver-lines.test.js. Uso: node test/build-test.js && node test/e2e/run122-scelta-chess.js
const { open, w, tapSel, goTab, login, assert, run } = require('./helpers');
const { DRIVER_LINES } = require('../../src/data/driver-lines');

const st = p => p.evaluate(() => {
  const k = document.querySelector('[data-chess-picker]');
  if (!k) return null;
  const c = k.querySelector('[data-chess-confirm]');
  return {
    hero: k.querySelector('[data-chess-hero]').getAttribute('data-chess-hero'), name: k.querySelector('[data-chess-name]').textContent,
    line: k.querySelector('[data-chess-line]').textContent.trim(), confirm: c.textContent.trim(), off: c.disabled,
    why: (k.querySelector('[data-chess-why]') || {}).textContent || '', teams: k.querySelectorAll('[data-chess-team]').length,
    tiles: k.querySelectorAll('[data-pick]').length, pressed: [...k.querySelectorAll('[data-pick][aria-pressed="true"]')].map(e => e.getAttribute('data-pick')),
  };
});

run({
  async 'si apre col pilota del posto e la sua frase; toccando un altro pilota parla lui, toccandolo di nuovo dice l\'altra frase'(b) {
    const { ctx, p } = await open(b);
    await login(p); await goTab(p, 'FANTA'); await w(p, 600);
    await tapSel(p, '[aria-label="Cambia Lewis Hamilton"]'); await w(p, 600);
    const s0 = await st(p);
    await tapSel(p, '[data-pick="leclerc"]'); await w(p, 400);
    const s1 = await st(p);
    await tapSel(p, '[data-pick="leclerc"]'); await w(p, 400);
    const s2 = await st(p);
    await tapSel(p, '[data-pick="russell"]'); await w(p, 400);
    const s3 = await st(p);
    await tapSel(p, '[data-pick="leclerc"]'); await w(p, 300);
    await tapSel(p, '[data-chess-confirm]'); await w(p, 700);
    const after = await p.evaluate(() => ({ open: !!document.querySelector('[data-chess-picker]'), cards: [...document.querySelectorAll('[data-fanta-card]')].map(e => e.getAttribute('data-fanta-card')) }));
    await ctx.close();
    assert(s0 && s0.hero === 'hamilton' && s0.line === DRIVER_LINES.hamilton[0] && /^Tieni /.test(s0.confirm) && s0.teams === 11 && s0.tiles === 22, 'apre con Hamilton e la sua frase, 11 scuderie e 22 piloti: ' + JSON.stringify(s0));
    assert(s1 && s1.hero === 'leclerc' && s1.line === DRIVER_LINES.leclerc[0] && /^Prendi C\. Leclerc · \$/.test(s1.confirm) && !s1.off && s1.pressed.join() === 'leclerc', 'tocco Leclerc: parla lui: ' + JSON.stringify(s1));
    assert(s2 && s2.line === DRIVER_LINES.leclerc[1], 'di nuovo Leclerc: l\'altra frase: ' + JSON.stringify(s2));
    assert(s3 && s3.hero === 'russell' && s3.off && /Già in squadra/.test(s3.why) && s3.line === DRIVER_LINES.russell[0], 'chi è già in squadra si sente ma non si prende: ' + JSON.stringify(s3));
    assert(!after.open && after.cards.includes('leclerc') && !after.cards.includes('hamilton'), 'Prendi: Leclerc entra al posto di Hamilton: ' + JSON.stringify(after));
  },

  async 'chi costa troppo si guarda ma non si prende (e c\'è scritto quanto manca)'(b) {
    const { ctx, p } = await open(b);
    await login(p); await goTab(p, 'FANTA'); await w(p, 600);
    await tapSel(p, '[aria-label="Togli Nico Hülkenberg"]'); await w(p, 300);
    await tapSel(p, '[data-fanta-add="drivers:2"]'); await w(p, 500);
    await tapSel(p, '[data-pick="verstappen"]'); await w(p, 400);
    const s = await st(p);
    const off = await p.evaluate(() => document.querySelector('[data-pick="verstappen"]').hasAttribute('data-pick-off'));
    await ctx.close();
    assert(s && s.hero === 'verstappen' && s.line === DRIVER_LINES.verstappen[0], 'Verstappen parla anche se costa troppo: ' + JSON.stringify(s));
    assert(off && s.off && /Budget insufficiente: ti mancano \$/.test(s.why), 'ma non si prende, e c\'è quanto manca: ' + JSON.stringify(s));
  },
});
