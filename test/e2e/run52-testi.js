// Tappa 3, Task 3 (G04, G05): icone nuove (Tabler, licenza MIT, nei crediti) e testi senza l'aria "da app fatta con
// l'IA": niente lineette lunghe (—) nei testi e niente emoji nei titoli.
// Uso: node test/build-test.js && node test/e2e/run52-testi.js [filtro]
const { open, w, text, tapText, tapSel, goTab, login, assert, run } = require('./helpers');

const EMOJI = /\p{Extended_Pictographic}/u;
const titles = p => p.evaluate(() => [...document.querySelectorAll('h1, h2, h3')].map(e => e.textContent.replace(/\s+/g, ' ').trim()));
// Le sei pagine principali: [nome, testo, titoli].
async function pages(p) {
  const out = [];
  for (const t of ['HOME', 'GARAGE', 'FANTA', 'RACE']) { await goTab(p, t); await w(p, 300); out.push([t, await text(p), await titles(p)]); }
  await tapSel(p, '[aria-label="Profilo"]'); await w(p, 400);
  out.push(['PROFILO', await text(p), await titles(p)]);
  await tapSel(p, '[aria-label="Indietro"]'); await w(p, 300);
  await tapSel(p, '[aria-label="Notifiche"]'); await w(p, 400);
  out.push(['NOTIFICHE', await text(p), await titles(p)]);
  await tapSel(p, '[aria-label="Indietro"]'); await w(p, 300);
  return out;
}

run({
  async 'nessun "—" nei testi di Home, Garage, Fanta, Race, Profilo e Notifiche'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    const all = await pages(p);
    await ctx.close();
    const bad = all.filter(([, t]) => t.includes('—')).map(([n, t]) => n + ': …' + t.slice(Math.max(0, t.indexOf('—') - 50), t.indexOf('—') + 30).replace(/\s+/g, ' ') + '…');
    assert(!bad.length, 'lineette lunghe: ' + bad.join(' | '));
    assert(!errs.length, errs.join(' | '));
  },

  async 'nessuna emoji nei titoli delle pagine'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    const all = await pages(p);
    await tapSel(p, '[aria-label="Profilo"]'); await w(p, 400);
    await tapText(p, 'Invia feedback'); await w(p, 400);
    const fb = await titles(p), fbText = await p.evaluate(() => { const e = document.querySelector('[data-feedback]'); return e ? e.innerText : ''; });
    await tapSel(p, '[data-feedback-star="5"]'); await w(p, 200);
    const fb5 = await p.evaluate(() => { const e = document.querySelector('[data-feedback]'); return e ? e.innerText : ''; });
    await ctx.close();
    const bad = [...all.map(([n, , ts]) => [n, ts]), ['FEEDBACK', fb]].flatMap(([n, ts]) => ts.filter(t => EMOJI.test(t)).map(t => n + ': ' + t));
    assert(fb.some(t => /Invia feedback/i.test(t)), 'titolo del feedback: ' + JSON.stringify(fb));
    assert(!bad.length, 'emoji nei titoli: ' + bad.join(' | '));
    assert(!EMOJI.test(fbText) && !EMOJI.test(fb5) && /Ottimo/.test(fb5), 'emoji nel feedback: ' + fb5.slice(0, 200));
    assert(!errs.length, errs.join(' | '));
  },

  async 'crediti: "Icone: Tabler Icons, licenza MIT"'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await tapSel(p, '[aria-label="Profilo"]'); await w(p, 400);
    await tapText(p, 'Info su B&T'); await w(p, 400);
    const t = await text(p);
    await ctx.close();
    assert(t.includes('Icone: Tabler Icons, licenza MIT'), 'crediti delle icone mancanti');
    assert(!t.includes('—'), 'lineetta lunga nelle informazioni');
    assert(!errs.length, errs.join(' | '));
  },
});
