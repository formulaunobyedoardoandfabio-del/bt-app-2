// 25/10: pagina Instagram rinnovata come nella grafica approvata: logo B&T al posto della foto del profilo, follower e
// post, l'ultimo reel in grande (descrizione breve, NUOVO, data), la classifica dei più visti (del mese, se ci sono le
// date), perché seguirci, l'invito finale e Condividi; nel Pannello Admin la descrizione breve e la data di ogni reel.
// Uso: node test/build-test.js && node test/e2e/run73-instagram.js [filtro]
const { open, w, tapText, tapSel, login, openAdmin, assert, run } = require('./helpers');

const doc = (p, path) => p.evaluate(x => window.firebase.__fake.doc(x), path);
const toast = p => p.evaluate(() => { const t = document.querySelector('.toast'); return t ? t.innerText : ''; });
const opened = p => p.evaluate(() => window.__opened.slice());
const ig = videos => ({ 'shared/bt-ig-config': { handle: 'bt_formula1', followers: 12345, posts: 87, videos } });
// Le prove partono il 7 ottobre 2026 (helpers.js).
const VIDEOS = [
  { id: 'v1', title: 'Sorpasso a Monza', thumbnail: '', views: '12,3K', likes: '900', url: 'https://www.instagram.com/reel/V1/', date: '2026-09-20' },
  { id: 'v2', title: 'Gufata storica', thumbnail: '', views: '3000', likes: '450', url: 'https://www.instagram.com/reel/V2/', date: '2026-10-03', desc: 'Gara pazza a Monza' },
  { id: 'v3', title: 'Pit stop da record', thumbnail: '', views: '950', likes: '', url: '', date: '2026-09-28' },
  { id: 'v4', title: 'Vecchio reel', thumbnail: '', views: '99K', likes: '', url: '', date: '2026-06-01' },
];
// Niente menu di condivisione del telefono (come sul computer): Condividi copia il link.
const NO_SHARE = () => {
  window.__copied = [];
  Object.defineProperty(Navigator.prototype, 'clipboard', { configurable: true, get() { return { writeText: async t => { window.__copied.push(String(t)); } }; } });
  delete Navigator.prototype.share; delete Navigator.prototype.canShare;
};
const openIg = async p => { await tapSel(p, '[aria-label="Profilo"]'); await w(p, 400); await tapSel(p, '[data-ig-big]'); await w(p, 500); };   // 1/11: dal Profilo (in Home c'è Pit Swipe)
const screen = p => p.evaluate(() => {
  const q = s => document.querySelector(s), t = s => (q(s) ? q(s).innerText.replace(/\s+/g, ' ').trim() : null);
  const logo = q('[data-ig-avatar] img');
  return {
    text: t('[data-ig-screen]'),
    logo: logo ? { src: logo.getAttribute('src').split(',')[0], w: logo.naturalWidth, alt: logo.alt } : null,
    last: q('[data-ig-last]') ? q('[data-ig-last]').getAttribute('data-ig-video') : null,
    lastText: t('[data-ig-last]'), desc: t('[data-ig-desc]'), isNew: !!q('[data-ig-new]'), date: t('[data-ig-date]'),
    top: [...document.querySelectorAll('[data-ig-top] [data-ig-video]')].map(e => e.getAttribute('data-ig-video')),
    p1: t('[data-ig-pos="1"]'),
  };
});

run({
  async 'pagina: logo B&T, follower e post, ultimo reel con descrizione e NUOVO, più visti del mese'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: ig(VIDEOS) } });
    await login(p); await openIg(p);
    const s = await screen(p);
    await ctx.close();
    assert(s.logo && s.logo.src === 'data:image/png;base64' && s.logo.w === 384 && s.logo.alt === 'B&T', 'logo nel cerchio: ' + JSON.stringify(s.logo));
    assert(/@bt_formula1/.test(s.text) && /12,3K FOLLOWER/.test(s.text) && /87 POST/.test(s.text), 'profilo: ' + s.text.slice(0, 200));
    assert(/La community B&T di Formula 1: gare, Fanta e la nostra storia/.test(s.text), 'descrizione del profilo: ' + s.text.slice(0, 200));
    assert(s.last === 'v2', 'ultimo reel: deve essere quello con la data più recente: ' + s.last);
    assert(s.desc === 'Gara pazza a Monza' && s.isNew && s.date === '3 ottobre', 'copertina dell\'ultimo reel: ' + JSON.stringify(s));
    assert(/Gufata storica/.test(s.lastText) && /3K visualizzazioni · 450 mi piace/.test(s.lastText), 'titolo e numeri dell\'ultimo reel: ' + s.lastText);
    assert(/PIÙ VISTI DEL MESE/.test(s.text) && JSON.stringify(s.top) === '["v1","v2","v3"]' && s.p1 === 'P1', 'classifica del mese (senza il reel di giugno): ' + JSON.stringify(s.top));
    assert(/WEEKEND DI GARA GOAT/.test(s.text) && /gufate storiche e l’hype della pista/.test(s.text), 'perché seguirci: ' + s.text.slice(-500));
    assert(/Non perderti il prossimo reel/.test(s.text) && /SEGUI @bt_formula1/.test(s.text), 'invito finale');
    assert(!/FOLLOWER \(live\)/.test(s.text), 'i follower li scrive l\'admin: non sono "live"');
    assert(!errs.length, errs.join(' | '));
  },

  async 'reel senza data: l\'ultimo aggiunto in grande, niente NUOVO; senza visualizzazioni "ALTRI REEL"'(b) {
    const plain = [{ id: 'a', title: 'Primo', thumbnail: '', views: '', likes: '', url: '' }, { id: 'b', title: 'Secondo', thumbnail: '', views: '', likes: '', url: '' }, { id: 'c', title: 'Terzo', thumbnail: '', views: '', likes: '', url: '' }];
    const { ctx, p, errs } = await open(b, { seed: { addDocs: ig(plain) } });
    await login(p); await openIg(p);
    const s = await screen(p);
    const others = await p.evaluate(() => [...document.querySelectorAll('[aria-label="Altri reel"] [data-ig-video]')].map(e => e.getAttribute('data-ig-video')));
    await ctx.close();
    assert(s.last === 'c' && !s.isNew && !s.date && !s.desc, 'ultimo reel senza data: ' + JSON.stringify(s));
    assert(!/PIÙ VISTI/.test(s.text) && JSON.stringify(others) === '["b","a"]', 'senza visualizzazioni niente classifica: ' + JSON.stringify(others));
    assert(!/visualizzazioni/.test(s.text.replace('classifica per visualizzazioni', '')), 'numeri inventati: ' + s.text);
    assert(!errs.length, errs.join(' | '));
  },

  async 'nessun reel: la pagina lo dice e il profilo si apre lo stesso'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: ig([]) } });
    await login(p); await openIg(p);
    const s = await screen(p);
    await tapSel(p, '[data-ig-follow-end]'); await w(p, 300);
    const urls = await opened(p);
    await ctx.close();
    assert(/I reel arrivano qui appena li pubblichiamo/.test(s.text) && !s.last, 'senza reel: ' + s.text.slice(0, 300));
    assert(JSON.stringify(urls) === '["https://www.instagram.com/bt_formula1/"]', 'SEGUI in fondo: ' + JSON.stringify(urls));
    assert(!errs.length, errs.join(' | '));
  },

  async 'Condividi: senza il menu del telefono copia il link (della pagina e del reel)'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: ig(VIDEOS) }, init: NO_SHARE });
    await login(p); await openIg(p);
    await tapSel(p, '[aria-label="Condividi la pagina"]'); await w(p, 400);
    const t1 = await toast(p);
    await tapSel(p, '[aria-label="Condividi il reel"]'); await w(p, 400);
    const copied = await p.evaluate(() => window.__copied.slice());
    await tapText(p, 'Guarda su Instagram', { exact: true }); await w(p, 300);
    const urls = await opened(p);
    await ctx.close();
    assert(/Link copiato/.test(t1), 'avviso: ' + t1);
    assert(JSON.stringify(copied) === JSON.stringify(['https://www.instagram.com/bt_formula1/', 'https://www.instagram.com/reel/V2/']), 'link copiati: ' + JSON.stringify(copied));
    assert(JSON.stringify(urls) === '["https://www.instagram.com/reel/V2/"]', 'Guarda su Instagram: ' + JSON.stringify(urls));
    assert(!errs.length, errs.join(' | '));
  },

  async 'Pannello Admin: descrizione breve e data del reel si salvano (il reel nuovo ha la data di oggi)'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await openAdmin(p, 'INSTAGRAM');
    await tapText(p, 'Aggiungi video'); await w(p, 300);
    const day0 = await p.inputValue('[aria-label="Data video 1"]');
    await p.fill('[aria-label="Titolo video 1"]', 'Il nostro reel');
    await p.fill('[aria-label="Descrizione breve video 1"]', 'Gufata del secolo');
    await p.fill('[aria-label="Data video 1"]', '2026-10-05');
    await tapText(p, 'SALVA TUTTO', { exact: true }); await w(p, 800);
    const d = await doc(p, 'shared/bt-ig-config');
    await ctx.close();
    const v = d && d.videos && d.videos[0];
    assert(day0 === '2026-10-07', 'il reel nuovo deve avere la data di oggi: ' + day0);
    assert(v && v.title === 'Il nostro reel' && v.desc === 'Gufata del secolo' && v.date === '2026-10-05', 'reel salvato: ' + JSON.stringify(v));
    assert(!errs.length, errs.join(' | '));
  },
});
