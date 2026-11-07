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
  // 3/11 (Edoardo: "rimuovi definitivamente le immagini piloti, scuderie e loghi anche dalla Admin parte"): anche con
  // una foto libera scelta su Commons si vede il disegno, nella riga del Mondiale e nella scheda del pilota.
  async '7/11 foto libera di Commons: niente foto, il disegno (nel Mondiale e nella scheda del pilota)'(b) {
    const { ctx, p, errs } = await open(b, { routes: ROUTES, seed: { addDocs: PHOTOS({ leclerc: 'File:Leclerc Uno.jpg' }) } }); await login(p);
    const lec = await champRow(p, 5);
    await tapSel(p, '[data-champ-row="5"] button'); await w(p, 600);
    const modal = await p.evaluate(() => { const m = document.querySelector('[data-driver-modal="leclerc"]'); return m ? { photo: !!m.querySelector('[data-commons-photo]'), credit: !!m.querySelector('[data-photo-credit]'), imgs: [...m.querySelectorAll('img')].map(i => i.src).filter(x => /wikimedia/.test(x)) } : null; });
    await ctx.close();
    assert(lec && lec.kind !== 'commons' && !/wikimedia/.test(lec.bg || ''), 'nel Mondiale c\'è ancora la foto: ' + JSON.stringify(lec));
    assert(modal && !modal.photo && !modal.credit && !modal.imgs.length, 'nella scheda del pilota c\'è ancora la foto: ' + JSON.stringify(modal));
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

  async '7/11 Admin: niente scheda FOTO (né candidate né link di Commons)'(b) {
    const { ctx, p, errs } = await open(b, { routes: ROUTES }); await login(p);
    await openAdmin(p);
    const tabs = await p.evaluate(() => [...document.querySelectorAll('button')].map(b => b.textContent.trim()).filter(t => /^[A-Z ]{3,}$/.test(t)));
    const entry = await p.evaluate(() => !!document.querySelector('[data-photo-entry], [data-photo-link]'));
    await ctx.close();
    assert(!tabs.includes('FOTO') && tabs.includes('FUNZIONI'), 'schede dell\'admin: ' + JSON.stringify(tabs));
    assert(!entry, 'nell\'admin si scelgono ancora le foto');
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

  async '7/11 rete che torna e loghi: le foto e i loghi non arrivano lo stesso'(b) {
    const { ctx, p, errs } = await open(b, { routes: ROUTES, seed: { addDocs: PHOTOS({ leclerc: 'File:Leclerc Uno.jpg' }) } }); await login(p);
    await setCandidates(p, 'logos', 'haas', ['File:Haas Logo.svg']);
    await p.evaluate(() => window.dispatchEvent(new Event('online'))); await w(p, 600);
    const lec = await champRow(p, 5);
    await tapText(p, 'Costruttori', { exact: true }); await w(p, 800);
    const logo = await p.evaluate(() => { const e = document.querySelector('[data-team-logo="haas"]'); return e ? e.getAttribute('src') : null; });
    await ctx.close();
    assert(lec && lec.kind !== 'commons', 'tornata la rete arriva la foto: ' + JSON.stringify(lec));
    assert(!logo, 'il logo della Haas si vede: ' + logo);
    assert(!errs.length, errs.join(' | '));
  },

  async 'di serie: figure stilizzate dei piloti, diverse tra loro, con la tuta della scuderia'(b) {
    const { ctx, p, errs } = await H.open(b); await login(p);
    await goTab(p, 'RACE'); await w(p, 600);
    await tapSel(p, '[data-race-tab="mondiale"]').catch(() => {}); await w(p, 700);
    const faces = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('svg[data-face]')].map(s => [s.getAttribute('data-face'), s.getAttribute('data-looks')])));
    const photos = await p.evaluate(() => document.querySelectorAll('[data-img="commons"]').length);
    await ctx.close();
    const ids = Object.keys(faces);
    assert(ids.length >= 20, 'figure dei piloti in classifica: ' + ids.length);
    assert(faces.hamilton === 'scura nero treccine piena' && faces.bottas === 'chiara biondo mullet baffi', 'tratti: ' + JSON.stringify({ h: faces.hamilton, b: faces.bottas }));
    assert(new Set(Object.values(faces)).size >= 10, 'troppe figure uguali: ' + new Set(Object.values(faces)).size);
    assert(photos === 0, 'nessuna foto di Commons di serie: ' + photos);
    assert(!errs.length, errs.join(' | '));
  },
});
