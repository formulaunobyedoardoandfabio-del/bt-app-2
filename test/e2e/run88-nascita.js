// 7/11 (Edoardo): data di nascita nella registrazione, scritta GG/MM/AAAA o scelta dal calendario, con l'anno su una
// rotella che si scorre in su e in giù. Più le micro-animazioni rifatte: la carta del pagamento rifiutato solo per un
// pagamento andato male davvero.
// Uso: node test/build-test.js && node test/e2e/run88-nascita.js
const { open, w, tapText, tapSel, assert, run } = require('./helpers');

const field = p => p.evaluate(() => {
  const i = document.querySelector('#regBirth'), pan = document.querySelector('[data-birth-panel]'), wh = document.querySelector('[data-year-wheel]'), er = document.querySelector('[data-birth-err]');
  return { val: i && i.value, panel: !!pan, year: wh && wh.getAttribute('data-year-wheel'), month: pan && pan.querySelector('[data-birth-month]').textContent, err: er && er.textContent };
});

run({
  async 'data di nascita: si scrive GG/MM/AAAA, sbagliata dà errore, dal calendario si sceglie e l\'anno gira con la rotella'(b) {
    const { ctx, p, errs } = await open(b);
    await tapText(p, 'REGISTRATI', { exact: true }); await w(p, 300);
    await p.focus('#regBirth'); await p.keyboard.type('31022001'); await w(p, 100);
    const bad = await field(p);
    await p.fill('#regBirth', ''); await p.focus('#regBirth'); await p.keyboard.type('15062001'); await w(p, 100);
    const good = await field(p);
    await tapSel(p, '[data-birth-cal]'); await w(p, 300);
    const opened = await field(p);
    // la rotella: scorrere fino al 1990 cambia l'anno del calendario
    await p.evaluate(() => { const el = document.querySelector('[data-year-wheel]'); el.scrollTop = (1990 - Number(el.getAttribute('aria-valuemin'))) * 34; el.dispatchEvent(new Event('scroll')); });
    await w(p, 300);
    const rolled = await field(p);
    await p.focus('[data-year-wheel]'); await p.keyboard.press('ArrowDown'); await w(p, 200);
    const arrow = await field(p);
    await tapSel(p, '[data-birth-day="3"]'); await w(p, 300);
    const picked = await field(p);
    await ctx.close();
    assert(bad.val === '31/02/2001' && bad.err === 'Data non valida', 'le barre si mettono da sole e il 31 febbraio non vale: ' + JSON.stringify(bad));
    assert(good.val === '15/06/2001' && !good.err, 'data scritta: ' + JSON.stringify(good));
    assert(opened.panel && opened.month === 'Giugno' && opened.year === '2001', 'il calendario si apre sulla data scritta: ' + JSON.stringify(opened));
    assert(rolled.year === '1990', 'la rotella cambia l\'anno: ' + JSON.stringify(rolled));
    assert(arrow.year === '1991', 'con la freccia giù l\'anno dopo: ' + JSON.stringify(arrow));
    assert(picked.val === '03/06/1991' && !picked.panel, 'giorno scelto dal calendario: ' + JSON.stringify(picked));
    assert(!errs.length, errs.join(' | '));
  },
});
