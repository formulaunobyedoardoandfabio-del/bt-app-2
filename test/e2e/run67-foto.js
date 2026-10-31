// Tappa 3, Task 18 (G30): foto da Wikimedia Commons. L'app legge da Commons licenza e autore e mostra la foto solo con
// licenza libera (CC0, pubblico dominio, CC BY, CC BY-SA), con "Foto: autore, licenza, Wikimedia Commons"; altrimenti
// le iniziali o la sagoma. Nel Pannello Admin, scheda FOTO, le candidate di ogni pilota e scuderia (o il link incollato
// di un file di Commons): la scelta va su Firebase (shared/bt-commons-photos) e la vedono tutti. I loghi solo con
// SHOW_TEAM_LOGOS (versioni di prova).
// Qui Commons è finto (routes): "NonLibera" nel nome = CC BY-NC 2.0, gli altri CC BY-SA 4.0 con autore "Autore <nome>".
// Uso: node test/build-test.js && node test/e2e/run67-foto.js [filtro]
const H = require('./helpers');
const { w, text, tapText, tapSel, goTab, login, openAdmin, assert, run } = H;
// 31/10: di serie l'app mostra i disegni geometrici al posto delle foto; queste prove riaccendono Commons.
const COMMONS_ON = () => { window.__btCommons = true; };
const open = (b, o = {}) => H.open(b, { ...o, init: o.init ? `(${COMMONS_ON})();(${o.init})();` : COMMONS_ON });

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR42mP8z8AARgEB/3rZ0kQAAAAASUVORK5CYII=', 'base64');
const ROUTES = {
  'https://commons.wikimedia.org/w/api.php**': route => {
    const titles = (new URL(route.request().url()).searchParams.get('titles') || '').split('|').filter(Boolean);
    const pages = {};
    titles.forEach((t, i) => {
      const free = !/NonLibera/.test(t), name = t.replace(/^File:/, '').replace(/\.\w+$/, '');
      pages[String(i + 1)] = { title: t, imageinfo: [{ thumburl: 'https://upload.wikimedia.org/fake/' + encodeURIComponent(name) + '.png', descriptionurl: 'https://commons.wikimedia.org/wiki/' + t.replace(/ /g, '_'), extmetadata: {
        License: { value: free ? 'cc-by-sa-4.0' : 'cc-by-nc-2.0' }, LicenseShortName: { value: free ? 'CC BY-SA 4.0' : 'CC BY-NC 2.0' }, Artist: { value: '<a href="#">Autore ' + name + '</a>' }, DateTimeOriginal: { value: '2025-07-06' } } }] };
    });
    route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ query: { pages } }) });
  },
  'https://upload.wikimedia.org/**': route => route.fulfill({ status: 200, contentType: 'image/png', body: PNG }),
};
const PHOTOS = drivers => ({ 'shared/bt-commons-photos': { drivers, cars: {}, logos: {} } });
const doc = (p, path) => p.evaluate(x => window.firebase.__fake.doc(x), path);
const setCandidates = (p, kind, id, files) => p.evaluate(({ kind, id, files }) => { window.__req('./data/commons-candidates').COMMONS_CANDIDATES[kind][id] = files; }, { kind, id, files });
const champRow = async (p, pos) => { await goTab(p, 'RACE'); await tapSel(p, '[data-race-tab="mondiale"]'); await w(p, 600); return p.evaluate(pos => { const r = document.querySelector(`[data-champ-row="${pos}"]`); const i = r && r.querySelector('[data-img]'); return i ? { kind: i.getAttribute('data-img'), bg: getComputedStyle(i).backgroundImage } : null; }, pos); };

run({
  async 'pilota con foto libera: foto e "Foto: autore, licenza"'(b) {
    const { ctx, p, errs } = await open(b, { routes: ROUTES, seed: { addDocs: PHOTOS({ leclerc: 'File:Leclerc Uno.jpg' }) } }); await login(p);
    await setCandidates(p, 'drivers', 'norris', ['File:Norris Serie.jpg']);   // senza scelta dell'admin: la prima candidata
    const lec = await champRow(p, 5);   // Leclerc è 5° nel mondiale di serie
    const nor = await p.evaluate(() => { const r = document.querySelector('[data-champ-row="4"]'); const i = r && r.querySelector('[data-img]'); return i ? { kind: i.getAttribute('data-img'), bg: getComputedStyle(i).backgroundImage } : null; });
    await tapSel(p, '[data-champ-row="5"] button'); await w(p, 600);
    const modal = await p.evaluate(() => { const m = document.querySelector('[data-driver-modal="leclerc"]'); if (!m) return null; const img = m.querySelector('[data-commons-photo]'); const c = m.querySelector('[data-photo-credit]'); const h = m.querySelector('h2'); const r1 = c && c.getBoundingClientRect(), r2 = h && h.getBoundingClientRect(); const cross = !!(r1 && r2 && r1.left < r2.right && r2.left < r1.right && r1.top < r2.bottom && r2.top < r1.bottom); return { src: img ? img.getAttribute('src') : null, credit: c ? c.textContent : null, cross }; });
    await ctx.close();
    assert(lec && lec.kind === 'commons' && /upload\.wikimedia\.org\/fake\/Leclerc%2520Uno\.png|Leclerc%20Uno/.test(lec.bg), 'foto tonda di Leclerc: ' + JSON.stringify(lec));
    assert(nor && nor.kind === 'commons' && /Norris/.test(nor.bg), 'senza scelta dell\'admin si usa la prima candidata: ' + JSON.stringify(nor));
    assert(modal && /Leclerc%20Uno/.test(modal.src || ''), 'foto grande nella scheda del pilota: ' + JSON.stringify(modal));
    assert(modal.credit === 'Foto: Autore Leclerc Uno, CC BY-SA 4.0, Wikimedia Commons', 'crediti della foto: ' + JSON.stringify(modal));
    assert(!modal.cross, 'i crediti della foto coprono il nome del pilota');
    assert(!errs.length, errs.join(' | '));
  },

  async 'licenza non libera: iniziali'(b) {
    const { ctx, p, errs } = await open(b, { routes: ROUTES, seed: { addDocs: PHOTOS({ leclerc: 'File:Leclerc NonLibera.jpg' }) } }); await login(p);
    const lec = await champRow(p, 5);
    await ctx.close();
    // Commons che non risponde: le iniziali, nessun errore.
    const o = await open(b, { routes: { 'https://commons.wikimedia.org/**': r => r.abort() }, seed: { addDocs: PHOTOS({ leclerc: 'File:Leclerc Uno.jpg' }) } }); await login(o.p);
    const off = await champRow(o.p, 5);
    await o.ctx.close();
    assert(lec && lec.kind === 'disegno', 'con licenza non libera la foto si vede: ' + JSON.stringify(lec));
    assert(off && off.kind === 'disegno', 'senza Commons: ' + JSON.stringify(off));
    assert(!errs.length && !o.errs.length, [...errs, ...o.errs].join(' | '));
  },

  async 'Admin → FOTO: candidate di Leclerc, scelta della seconda, la vedono tutti'(b) {
    const { ctx, p, errs } = await open(b, { routes: ROUTES }); await login(p);
    await setCandidates(p, 'drivers', 'leclerc', ['File:Leclerc Uno.jpg', 'File:Leclerc Due.jpg', 'File:Leclerc NonLibera.jpg']);
    await openAdmin(p, 'FOTO');
    await tapSel(p, '[data-photo-entry="drivers:leclerc"]'); await w(p, 800);
    const cands = await p.evaluate(() => [...document.querySelectorAll('[data-photo-candidate]')].map(e => ({ file: e.getAttribute('data-photo-candidate'), free: e.getAttribute('data-free'), img: !!e.querySelector('img'), text: e.innerText.replace(/\s+/g, ' ').trim(), disabled: (e.querySelector('button') || {}).disabled })));
    await tapSel(p, '[data-photo-candidate="File:Leclerc Due.jpg"] button'); await w(p, 900);
    const stored = await doc(p, 'shared/bt-commons-photos');
    await tapSel(p, '[aria-label="Indietro"]'); await w(p); await tapSel(p, '[aria-label="Indietro"]'); await w(p, 300);
    const lec = await champRow(p, 5);
    await ctx.close();
    assert(cands.length === 3 && cands.every(c => c.img), 'candidate di Leclerc: ' + JSON.stringify(cands));
    assert(cands[0].free === '1' && cands[2].free === '0' && cands[2].disabled === true && /non libera/i.test(cands[2].text), 'la candidata con licenza non libera non si può usare: ' + JSON.stringify(cands[2]));
    assert(/Autore Leclerc Due/.test(cands[1].text) && /CC BY-SA 4\.0/.test(cands[1].text), 'autore e licenza delle candidate: ' + cands[1].text);
    assert(stored && stored.drivers && stored.drivers.leclerc === 'File:Leclerc Due.jpg', 'scelta su Firebase: ' + JSON.stringify(stored));
    assert(lec && /Leclerc%20Due|Leclerc%2520Due/.test(lec.bg), 'nell\'app si vede la seconda: ' + JSON.stringify(lec));
    assert(!errs.length, errs.join(' | '));
  },

  async 'link incollato da Commons'(b) {
    const { ctx, p, errs } = await open(b, { routes: ROUTES }); await login(p);
    await openAdmin(p, 'FOTO');
    await tapSel(p, '[data-photo-entry="drivers:leclerc"]'); await w(p, 400);
    const inputW = await p.evaluate(() => document.querySelector('[data-photo-link]').getBoundingClientRect().width);
    await p.fill('[data-photo-link]', 'https://example.com/foto.jpg'); await tapText(p, 'Usa il link', { exact: true }); await w(p, 300);
    const bad = await text(p);
    await p.fill('[data-photo-link]', 'https://commons.wikimedia.org/wiki/File:Leclerc_Incollata.jpg'); await tapText(p, 'Usa il link', { exact: true }); await w(p, 900);
    const stored = await doc(p, 'shared/bt-commons-photos');
    await ctx.close();
    assert(inputW >= 160, 'il campo del link è troppo stretto: ' + inputW + ' px');
    assert(/Link non valido: incolla il link di un file di Wikimedia Commons/.test(bad), 'link non di Commons: manca l\'avviso');
    assert(stored && stored.drivers && stored.drivers.leclerc === 'File:Leclerc Incollata.jpg', 'link incollato: ' + JSON.stringify(stored));
    assert(!errs.length, errs.join(' | '));
  },

  async 'crediti delle foto in Info su B&T'(b) {
    // Le foto piccole (classifiche, carte, loghi) non hanno i crediti accanto: sono tutti in "Info su B&T".
    const { ctx, p, errs } = await open(b, { routes: ROUTES, seed: { addDocs: PHOTOS({ leclerc: 'File:Leclerc Uno.jpg', norris: 'File:Norris NonLibera.jpg' }) } }); await login(p);
    await tapSel(p, '[aria-label="Profilo"]'); await w(p, 400);
    await tapText(p, 'Info su B&T'); await w(p, 900);
    const c = await p.evaluate(() => { const e = document.querySelector('[data-photo-credits]'); return e ? e.innerText : null; });
    const t = await text(p);
    await ctx.close();
    assert(c && /Foto da Wikimedia Commons/.test(c), 'manca la sezione dei crediti delle foto: ' + JSON.stringify(c));
    assert(c.includes('Charles Leclerc: Autore Leclerc Uno, CC BY-SA 4.0'), 'crediti della foto di Leclerc: ' + c.slice(0, 300));
    assert(!c.includes('Lando Norris:'), 'una foto con licenza non libera non va nei crediti (non si vede)');
    assert(t.includes('Icone: Tabler Icons, licenza MIT') && !t.includes('—'), 'gli altri crediti restano, senza lineette lunghe');
    assert(!errs.length, errs.join(' | '));
  },

  async 'rete che torna: le foto arrivano senza riavviare'(b) {
    let down = true;
    const api = 'https://commons.wikimedia.org/w/api.php**';
    const { ctx, p, errs } = await open(b, { routes: { ...ROUTES, [api]: route => (down ? route.abort() : ROUTES[api](route)) }, seed: { addDocs: PHOTOS({ leclerc: 'File:Leclerc Uno.jpg' }) } }); await login(p);
    const before = await champRow(p, 5);
    down = false;
    await p.evaluate(() => window.dispatchEvent(new Event('online'))); await w(p, 900);
    const after = await p.evaluate(() => { const r = document.querySelector('[data-champ-row="5"]'); const i = r && r.querySelector('[data-img]'); return i ? i.getAttribute('data-img') : null; });
    await ctx.close();
    assert(before && before.kind === 'disegno', 'senza Commons: le iniziali: ' + JSON.stringify(before));
    assert(after === 'commons', 'tornata la rete la foto deve arrivare: ' + after);
    assert(!errs.length, errs.join(' | '));
  },

  async 'loghi solo con SHOW_TEAM_LOGOS'(b) {
    const { ctx, p, errs } = await open(b, { routes: ROUTES }); await login(p);
    await setCandidates(p, 'logos', 'haas', ['File:Haas Logo.svg']);
    await goTab(p, 'RACE'); await tapSel(p, '[data-race-tab="mondiale"]'); await w(p, 300);
    await tapText(p, 'Costruttori', { exact: true }); await w(p, 800);
    const on = await p.evaluate(() => { const e = document.querySelector('[data-team-logo="haas"]'); return e ? e.getAttribute('src') : null; });
    await p.evaluate(() => { window.__req('./data/commons-candidates').SHOW_TEAM_LOGOS = false; });
    await tapText(p, 'Piloti', { exact: true }); await w(p, 200); await tapText(p, 'Costruttori', { exact: true }); await w(p, 500);
    const off = await p.evaluate(() => !!document.querySelector('[data-team-logo]'));
    await ctx.close();
    assert(on && /Haas%20Logo/.test(on), 'con SHOW_TEAM_LOGOS il logo della Haas si vede: ' + on);
    assert(!off, 'senza SHOW_TEAM_LOGOS i loghi si vedono');
    assert(!errs.length, errs.join(' | '));
  },
});
