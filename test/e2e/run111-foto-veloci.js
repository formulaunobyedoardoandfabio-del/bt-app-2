// 14/11 (Edoardo: "rendi più veloce il caricamento delle foto delle news"). Le foto caricate dall'admin sono documenti
// di Firestore (shared/img-<id>) e si tenevano solo in memoria: a ogni apertura dell'app si riscaricavano tutte.
// Ora restano sul telefono (IndexedDB, test/unit/imgstore.test.js); in elenco le foto si caricano solo quando servono.
// Uso: node test/build-test.js && node test/e2e/run111-foto-veloci.js
const { open, w, login, assert, run } = require('./helpers');

const TINY_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const news = (id, title, date, image) => ({ id, title, summary: 'Riassunto', category: 'NEWS', author: 'Team B&T', image, content: 'Testo.', published: true, date });
const NEWS = {
  'shared/bt-news': { __arr: [
    news('n1', 'Prima con la foto', '2026-11-06T10:00:00Z', 'fsimg:foto1'),
    news('n2', 'Seconda con un\'altra foto', '2026-11-05T10:00:00Z', 'fsimg:foto2'),
    news('n3', 'Terza', '2026-11-04T10:00:00Z', 'fsimg:foto2'),
  ] },
  'shared/img-foto1': { data: TINY_PNG, ts: 1 },
  'shared/img-foto2': { data: TINY_PNG, ts: 2 },
};
const reads = p => p.evaluate(() => window.firebase.__fake.reads.slice());
const imgReads = list => list.filter(x => /^shared\/img-/.test(x));
const shown = p => p.waitForFunction(() => { const i = document.querySelector('[data-featured] img[data-news-img]'); return !!(i && i.complete && i.naturalWidth > 0); }, null, { timeout: 10000 }).then(() => true, () => false);

run({
  async 'foto delle notizie: alla seconda apertura dell\'app si prendono dal telefono, non da Firestore'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: NEWS } });
    await login(p);
    const first = await shown(p); await w(p, 600);
    const r1 = imgReads(await reads(p));
    await p.reload();
    const again = await shown(p); await w(p, 900);
    const r2 = imgReads(await reads(p));
    await ctx.close();
    assert(first, 'primo avvio: la foto della notizia in evidenza si vede');
    assert(r1.includes('shared/img-foto1'), 'primo avvio: la foto si scarica da Firestore (' + r1.join(', ') + ')');
    assert(again, 'app riaperta: la foto si vede');
    assert(r2.length === 0, 'app riaperta: nessuna foto riletta da Firestore (lette: ' + r2.join(', ') + ')');
    assert(!errs.length, errs.join(' | '));
  },

  async 'foto delle notizie: in elenco si caricano quando servono, quella in evidenza subito'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: NEWS } });
    await login(p); await shown(p); await w(p, 500);
    const attrs = await p.evaluate(() => [...document.querySelectorAll('img[data-news-img]')].map(i => ({
      featured: !!i.closest('[data-featured]'), loading: i.getAttribute('loading'), decoding: i.getAttribute('decoding'), pr: i.getAttribute('fetchpriority'),
    })));
    await ctx.close();
    const top = attrs.find(a => a.featured), list = attrs.filter(a => !a.featured);
    assert(top && top.pr === 'high', 'la foto in evidenza parte per prima: ' + JSON.stringify(top));
    assert(list.length > 0 && list.every(a => a.loading === 'lazy' && a.decoding === 'async'), 'foto in elenco caricate solo quando servono: ' + JSON.stringify(list));
    assert(!errs.length, errs.join(' | '));
  },
});
