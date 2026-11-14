// 14/11 (Edoardo: "se uno visualizza i propri salvati mettili nello stesso modo stile appwatch lo stesso del Garage"):
// gli articoli salvati si vedono a piastrelle come il Garage (mattoncino, righe dispari spostate di mezza piastrella,
// foto dell'articolo), con l'interruttore griglia/lista ricordato sul telefono. Tocca una piastrella: si apre l'articolo.
// Uso: node test/build-test.js && node test/e2e/run112-salvati.js
const { open, w, tapSel, tapText, login, assert, run } = require('./helpers');

const TINY_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const news = (n, image) => ({ id: 'n' + n, title: 'Notizia salvata numero ' + n, summary: 'Riassunto ' + n, category: 'NEWS', author: 'Team B&T', image, content: 'Testo della notizia ' + n + '.', published: true, date: `2026-11-0${n}T10:00:00Z` });
const NEWS = {
  'shared/bt-news': { __arr: [news(1, 'fsimg:foto1'), news(2, ''), news(3, 'fsimg:foto1'), news(4, ''), news(5, ''), news(6, '')] },
  'shared/img-foto1': { data: TINY_PNG, ts: 1 },
};
const USER = app2 => ({ 'users/a@b.it': { name: 'Tester', nick: 'Tester', email: 'a@b.it', about: { birth: null, follow: 2, fan: 'vivo' }, app2 } });
const SEED = saved => ({ addDocs: { ...NEWS, ...USER({ saved }) } });

async function openSaved(p) {
  await tapSel(p, '[aria-label="Profilo"]'); await w(p, 400);
  await tapText(p, 'Profilo pubblico'); await w(p, 400);
  await tapText(p, 'Articoli salvati'); await w(p, 700);
}
const tiles = p => p.evaluate(() => [...document.querySelectorAll('[data-saved-grid] [data-saved-tile]')].map(t => {
  const r = t.getBoundingClientRect(), bg = t.querySelector('[data-saved-photo]');
  return { id: t.getAttribute('data-saved-tile'), label: t.getAttribute('aria-label'), x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), photo: bg ? getComputedStyle(bg).backgroundImage.slice(0, 30) : '' };
}));

run({
  async 'salvati: a piastrelle come il Garage, a mattoncino, con la foto; tocchi e si apre l\'articolo'(b) {
    const { ctx, p, errs } = await open(b, { seed: SEED(['n1', 'n2', 'n3', 'n4', 'n5']) });
    await login(p); await w(p, 600);
    await openSaved(p);
    await p.waitForFunction(() => { const t = document.querySelector('[data-saved-tile="n1"] [data-saved-photo]'); return t && /url\(/.test(getComputedStyle(t).backgroundImage); }, null, { timeout: 6000 }).catch(() => {});
    const t = await tiles(p);
    const list = await p.evaluate(() => document.querySelectorAll('[data-news-item]').length);
    const row0 = t.filter(x => x.y === (t[0] || {}).y), row1 = t.filter(x => x.y > (t[0] || {}).y);
    await tapSel(p, '[data-saved-tile="n2"]'); await w(p, 700);
    const body = await p.evaluate(() => document.body.innerText);
    await tapSel(p, '[aria-label="Indietro"]'); await w(p, 600);
    const backTiles = await p.evaluate(() => document.querySelectorAll('[data-saved-grid] [data-saved-tile]').length);
    await ctx.close();
    assert(t.length === 5, 'una piastrella per ogni salvato (5): ' + t.length);
    assert(list === 0, 'a piastrelle non c\'è anche l\'elenco: ' + list);
    assert(t.every(x => x.w === x.h && x.w >= 80), 'piastrelle quadrate come nel Garage: ' + JSON.stringify(t.map(x => [x.w, x.h])));
    assert(row0.length === 4 && row1.length === 1, 'quattro per riga come nel Garage: ' + row0.length + '+' + row1.length);
    assert(row1[0] && row1[0].x > row0[0].x + 20, 'righe dispari spostate di mezza piastrella: ' + (row1[0] && row1[0].x) + ' vs ' + row0[0].x);
    assert(t.every(x => /Notizia salvata numero \d/.test(x.label)), 'ogni piastrella dice quale articolo è: ' + t.map(x => x.label).join(' | '));
    assert(/url\(/.test(t.find(x => x.id === 'n1').photo), 'la piastrella mostra la foto dell\'articolo: ' + t.find(x => x.id === 'n1').photo);
    assert(/Testo della notizia 2\./.test(body), 'toccando la piastrella si apre l\'articolo');
    assert(backTiles === 5, 'tornando indietro si ritrovano le piastrelle: ' + backTiles);
    assert(!errs.length, errs.join(' | '));
  },

  async 'salvati: interruttore griglia/lista, la scelta resta anche riaprendo l\'app'(b) {
    const { ctx, p, errs } = await open(b, { seed: SEED(['n1', 'n2', 'n3']) });
    await login(p); await w(p, 600);
    await openSaved(p);
    const before = await p.evaluate(() => ({ grid: !!document.querySelector('[data-saved-grid]'), pressed: (document.querySelector('[data-saved-view="griglia"]') || {}).ariaPressed }));
    await tapSel(p, '[data-saved-view="lista"]'); await w(p, 400);
    const asList = await p.evaluate(() => ({ grid: !!document.querySelector('[data-saved-grid]'), items: document.querySelectorAll('[data-news-item]').length }));
    await p.reload(); await w(p, 2500);
    await openSaved(p);
    const after = await p.evaluate(() => ({ grid: !!document.querySelector('[data-saved-grid]'), items: document.querySelectorAll('[data-news-item]').length }));
    await ctx.close();
    assert(before.grid && before.pressed === 'true', 'si parte a piastrelle: ' + JSON.stringify(before));
    assert(!asList.grid && asList.items === 3, 'a lista: l\'elenco di prima con i 3 salvati: ' + JSON.stringify(asList));
    assert(!after.grid && after.items === 3, 'riaprendo l\'app resta a lista: ' + JSON.stringify(after));
    assert(!errs.length, errs.join(' | '));
  },

  async 'salvati: senza articoli salvati c\'è il messaggio, niente piastrelle'(b) {
    const { ctx, p, errs } = await open(b, { seed: SEED([]) });
    await login(p); await w(p, 600);
    await openSaved(p);
    const r = await p.evaluate(() => ({ grid: document.querySelectorAll('[data-saved-tile]').length, text: document.body.innerText }));
    await ctx.close();
    assert(r.grid === 0, 'nessuna piastrella: ' + r.grid);
    assert(/Non hai ancora salvato articoli/.test(r.text), 'messaggio per chi non ha salvati');
    assert(!errs.length, errs.join(' | '));
  },
});
