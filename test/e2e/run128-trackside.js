// 21/11 (Edoardo, "ho tutti i permessi da I Built Things"): Trackside (ibuiltthings.com/trackside, la vista in 3D da
// ogni posto del GP di Singapore) dentro l'app: pagina a tutto schermo col sito in un riquadro, il nostro Indietro, il
// credito e "Apri fuori dall'app". Si apre dal Garage (Tracciati) e dalla pagina del circuito di Marina Bay.
// Qui il sito vero non si raggiunge: al suo posto una pagina finta. Uso: node test/e2e/run128-trackside.js [filtro]
const { open, w, tapSel, goTab, login, assert, run } = require('./helpers');

const TS = 'https://ibuiltthings.com/trackside';
const fake = hits => ({ 'https://ibuiltthings.com/**': r => { hits.push(r.request().url()); return r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Trackside</title><body style="background:#0b0f14;color:#fff"><h1 id="ts">Marina Bay Street Circuit</h1></body>' }); } });
const opened = p => p.evaluate(() => { window.__opened = []; window.open = u => { window.__opened.push(u); return null; }; });
const page = p => p.evaluate(() => {
  const s = document.querySelector('[data-trackside]'); if (!s) return null;
  const f = s.querySelector('iframe');
  return { src: f && f.getAttribute('src'), title: f && f.getAttribute('title'), allow: f && f.getAttribute('allow'), loading: !!s.querySelector('[data-trackside-loading]'), credit: (s.querySelector('[data-trackside-credit]') || {}).innerText || '', head: s.innerText.slice(0, 120), h: f && Math.round(f.getBoundingClientRect().height) };
});

run({
  async 'Garage, Tracciati: la piastrella Trackside apre il sito dentro l\'app, col credito; Indietro torna al Garage'(b) {
    const hits = [];
    const { ctx, p, errs } = await open(b, { routes: fake(hits) }); await login(p); await w(p, 600);
    await goTab(p, 'GARAGE'); await w(p, 400);
    await tapSel(p, '[data-garage-view="lista"]'); await w(p, 300);
    const row = await p.evaluate(() => (document.querySelector('[data-game="trackside"]') || {}).innerText || '');
    await tapSel(p, '[data-game="trackside"]'); await w(p, 1200);
    const r = await page(p);
    const inFrame = await p.frames().find(f => f.url().startsWith('https://ibuiltthings.com/'))?.evaluate(() => document.getElementById('ts').innerText).catch(() => null);
    await opened(p);
    await tapSel(p, '[data-trackside-out]'); await w(p, 200);
    const out = await p.evaluate(() => window.__opened);
    await tapSel(p, '[aria-label="Indietro"]'); await w(p, 500);
    const back = await p.evaluate(() => ({ ts: !!document.querySelector('[data-trackside]'), garage: !!document.querySelector('[data-game="trackside"]') }));
    await ctx.close();
    assert(/Trackside/.test(row) && /Singapore/.test(row), 'piastrella nel Garage: ' + row);
    assert(r && r.src === TS && /Trackside/.test(r.title) && /fullscreen/.test(r.allow), 'riquadro col sito: ' + JSON.stringify(r));
    assert(!r.loading && r.h > 400, 'caricato, a tutto schermo: ' + JSON.stringify(r));
    assert(inFrame === 'Marina Bay Street Circuit' && hits.some(u => u.startsWith(TS)), 'il sito si apre nel riquadro: ' + inFrame + ' ' + hits.join(','));
    assert(/I Built Things/.test(r.credit) && /permesso/.test(r.credit), 'credito: ' + r.credit);
    assert(out.length === 1 && out[0] === TS, 'Apri fuori dall\'app: ' + JSON.stringify(out));
    assert(!back.ts && back.garage, 'Indietro torna al Garage: ' + JSON.stringify(back));
    assert(!errs.length, errs.join(' | '));
  },

  async 'pagina del circuito di Marina Bay: c\'è Trackside; sugli altri circuiti no'(b) {
    const hits = [];
    const sg = await open(b, { routes: fake(hits) }); await login(sg.p); await goTab(sg.p, 'RACE');
    await tapSel(sg.p, '[data-circuit-cta]'); await w(sg.p, 500);
    const card = await sg.p.evaluate(() => (document.querySelector('[data-circuit-page] [data-trackside-open]') || {}).innerText || '');
    await tapSel(sg.p, '[data-trackside-open]'); await w(sg.p, 1000);
    const r = await page(sg.p);
    await tapSel(sg.p, '[aria-label="Indietro"]'); await w(sg.p, 400);
    const backToCircuit = await sg.p.evaluate(() => !!document.querySelector('[data-circuit-page]') && !document.querySelector('[data-trackside]'));
    await sg.ctx.close();
    const lv = await open(b, { now: '2026-11-17T10:00:00Z', routes: fake(hits) }); await login(lv.p); await goTab(lv.p, 'RACE');
    await tapSel(lv.p, '[data-circuit-cta]'); await w(lv.p, 500);
    const other = await lv.p.evaluate(() => ({ page: !!document.querySelector('[data-circuit-page]'), ts: !!document.querySelector('[data-trackside-open]') }));
    await lv.ctx.close();
    assert(/Trackside/i.test(card) && /posto/i.test(card) && /I Built Things/.test(card), 'invito sulla pagina di Marina Bay: ' + card);
    assert(r && r.src === TS, 'si apre Trackside: ' + JSON.stringify(r));
    assert(backToCircuit, 'Indietro torna alla pagina del circuito');
    assert(other.page && !other.ts, 'Las Vegas: niente Trackside: ' + JSON.stringify(other));
    assert(!sg.errs.length && !lv.errs.length, sg.errs.concat(lv.errs).join(' | '));
  },
});
