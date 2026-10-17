// Tappa 3, Task 8 (G12, G13): nell'articolo la barra ERS si riempie mentre si legge ("ERS: 100%" in fondo); il foglio
// di condivisione diventa una radio (onda, bip, vibrazione), l'immagine ha la fascia "TEAM RADIO // BREAKING NEWS" con il
// titolo come messaggio radio e alla fine c'è l'avviso "Radio Check: notizia inviata".
// Uso: node test/build-test.js && node test/e2e/run57-articolo.js [filtro]
const { open, w, text, tapSel, login, assert, run } = require('./helpers');

const TITLE = 'Leclerc in pole a Monza con un giro perfetto';
const BODY = Array.from({ length: 14 }, (_, i) => `Paragrafo ${i + 1}: la cronaca del giro, curva per curva, con i tempi dei settori e le parole del pilota dopo la qualifica.`).join('\n\n');
const NEWS = { 'shared/bt-news': { __arr: [{ id: 'lungo', title: TITLE, summary: 'Il giro della pole', category: 'GARA', author: 'Team B&T', image: '', published: true, date: '2026-10-07T11:00:00', content: BODY }] } };
// Registra i testi scritti sulle immagini (canvas) e i suoni chiesti all'app.
const SPY = () => {
  window.__texts = [];
  const ft = CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText = function (t, ...r) { window.__texts.push(String(t)); return ft.call(this, t, ...r); };
};
const spyFx = p => p.evaluate(() => { const fx = window.__btFx; window.__played = []; const play = fx.play; fx.play = n => { window.__played.push(n); return play(n); }; });
const ers = p => p.evaluate(() => { const e = document.querySelector('[data-ers]'); return e ? { now: e.getAttribute('aria-valuenow'), text: e.innerText.replace(/\s+/g, ' ').trim(), role: e.getAttribute('role') } : null; });
const openArticle = async p => { await tapSel(p, '[data-featured="lungo"]'); await w(p, 500); };

run({
  async 'barra ERS: 0% in cima, 100% in fondo con "ERS: 100%"'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: NEWS } }); await login(p);
    await openArticle(p);
    const top = await ers(p);
    await p.evaluate(() => { const s = document.querySelector('[data-ers]').closest('.scrollcol'); s.scrollTop = (s.scrollHeight - s.clientHeight) / 2; });
    await w(p, 300);
    const mid = await ers(p);
    await p.evaluate(() => { const s = document.querySelector('[data-ers]').closest('.scrollcol'); s.scrollTop = s.scrollHeight; });
    await w(p, 300);
    const end = await ers(p);
    const pinned = await p.evaluate(() => { const e = document.querySelector('[data-ers]'); return e.getBoundingClientRect().top < 140; });
    await ctx.close();
    assert(top && top.role === 'progressbar' && top.now === '0' && /ERS: 0%/.test(top.text), 'in cima: ' + JSON.stringify(top));
    assert(mid && Number(mid.now) > 20 && Number(mid.now) < 80, 'a metà: ' + JSON.stringify(mid));
    assert(end && end.now === '100' && /ERS: 100%/.test(end.text), 'in fondo: ' + JSON.stringify(end));
    assert(pinned, 'la barra ERS non resta in cima mentre si legge');
    assert(!errs.length, errs.join(' | '));
  },

  async 'condivisione: onda della radio, bip, immagine con "TEAM RADIO // BREAKING NEWS", avviso "Radio Check: notizia inviata"'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: NEWS }, init: SPY, routes: { 'https://wa.me/**': r => r.abort() } });
    await login(p);
    await openArticle(p); await spyFx(p);
    await tapSel(p, '[aria-label="Condividi articolo"]'); await w(p, 300);
    await p.waitForFunction(() => { const i = document.querySelector('img[alt^="Anteprima"]'); return !!(i && i.complete && i.naturalWidth > 0); }, null, { timeout: 8000 }).catch(() => {});
    const sheet = await p.evaluate(() => ({ wave: !!document.querySelector('[data-radio-wave]'), text: document.body.innerText }));
    const played = await p.evaluate(() => window.__played.slice()), texts = await p.evaluate(() => window.__texts.slice());
    await p.evaluate(() => { const a = [...document.querySelectorAll('a')].find(x => x.textContent.trim() === 'WhatsApp'); a.click(); });
    await w(p, 500);
    const t = await text(p);
    await ctx.close();
    const all = texts.join(' ');
    assert(sheet.wave, 'nel foglio manca l\'onda della radio');
    assert(/CONDIVIDI ARTICOLO/.test(sheet.text) && /TEAM RADIO/.test(sheet.text), 'foglio: ' + sheet.text.slice(0, 200));
    assert(played.includes('radio'), 'niente bip della radio: ' + JSON.stringify(played));
    assert(texts.includes('TEAM RADIO // BREAKING NEWS'), 'sull\'immagine manca la fascia "TEAM RADIO // BREAKING NEWS"');
    assert(/«Leclerc in pole/.test(all) && /perfetto»/.test(all), 'il titolo non è scritto come messaggio radio: ' + all.slice(0, 300));
    assert(/Radio Check: notizia inviata/.test(t), 'manca l\'avviso "Radio Check: notizia inviata"');
    assert(!errs.length, errs.join(' | '));
  },
});
