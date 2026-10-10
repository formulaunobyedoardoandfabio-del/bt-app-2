// Task 6: notizie, gare, classifiche, notifiche e preferenze salvate su Firebase nei formati di oggi.
// Uso: node test/build-test.js && node test/e2e/run30-dati.js [filtro]
const { open, w, text, tapText, tapSel, goTab, login, openAdmin, assert, run } = require('./helpers');

const WELCOME = "Vi presentiamo l'app B&T!!";
const NOT_SAVED = 'Non salvato: controlla la connessione e riprova.';
const doc = (p, path) => p.evaluate(x => window.firebase.__fake.doc(x), path);
const toast = p => p.evaluate(() => { const t = document.querySelector('.toast'); return t ? t.innerText : ''; });
const value = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); return e ? e.value : null; }, sel);
async function reloadAndLogin(p) { await p.reload(); await w(p, 600); await login(p); }
async function publish(p, title) {
  await openAdmin(p, 'NEWS');
  await p.fill('#adTitle', title);
  await p.fill('#adSub', 'Giro perfetto sotto le luci di Marina Bay');
  await p.fill('#adText', 'Primo paragrafo.\n\nSecondo paragrafo.');
  await tapText(p, 'PUBBLICA', { exact: true }); await w(p, 600);
}

run({
  async 'admin: la notizia pubblicata resta dopo aver ricaricato e in bt-news ha i campi di oggi'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await publish(p, 'Leclerc in pole a Singapore');
    const home = await text(p);
    const news = (await doc(p, 'shared/bt-news')).__arr;
    await reloadAndLogin(p);
    const after = await text(p); await ctx.close();
    assert(/Leclerc in pole a Singapore/.test(home), 'dopo PUBBLICA la notizia non è in Home');
    const n = news[0];
    assert(n.title === 'Leclerc in pole a Singapore' && n.summary === 'Giro perfetto sotto le luci di Marina Bay' && n.category === 'NEWS' && n.author === 'Team B&T', 'campi di oggi: ' + JSON.stringify(n).slice(0, 300));
    assert(n.content === 'Primo paragrafo.\n\nSecondo paragrafo.' && n.published === true && typeof n.id === 'string' && n.image === '', 'contenuto, pubblicato, id e foto: ' + JSON.stringify(n).slice(0, 300));
    assert(!isNaN(Date.parse(n.date)), 'data della notizia: ' + n.date);
    assert(news.some(x => x.title === WELCOME), 'la notizia di benvenuto deve restare in bt-news');
    assert(/Leclerc in pole a Singapore/.test(after) && after.includes(WELCOME), 'dopo aver ricaricato la notizia non c\'è più');
    assert(!errs.length, errs.join(' | '));
  },

  async 'admin: la gara messa LIVE resta in bt-races con circuitId'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await openAdmin(p, 'GARA LIVE');
    await p.selectOption('select[aria-label="Stato GP di Singapore"]', 'LIVE'); await w(p, 600);
    const races = (await doc(p, 'shared/bt-races')).__arr;
    const demo = await p.evaluate(() => !!window.__btLive);   // la diretta simulata lascia window.__btLive
    await reloadAndLogin(p);
    await openAdmin(p, 'GARA LIVE');
    const after = await value(p, 'select[aria-label="Stato GP di Singapore"]'); await ctx.close();
    const sg = races.find(r => r.circuitId === 'sg-2008');
    assert(sg && sg.status === 'LIVE', 'Singapore in bt-races: ' + JSON.stringify(sg));
    assert(sg.name === 'GP di Singapore' && sg.circuit === 'Marina Bay' && sg.round === 17 && typeof sg.totalLaps === 'number' && /^2026-10-11T/.test(sg.date), 'campi di oggi: ' + JSON.stringify(sg));
    assert(races.length === 23 && races.filter(r => r.status === 'LIVE').length === 1, 'calendario salvato: ' + races.length + ' gare');
    assert(!demo, 'LIVE dal menu non deve far partire la diretta simulata');
    assert(after === 'LIVE', 'dopo aver ricaricato lo stato è ' + after);
    assert(!errs.length, errs.join(' | '));
  },

  async 'notizia salvata: resta nel mio account dopo esci e rientra'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await tapSel(p, `[aria-label="Salva tra i preferiti: ${WELCOME}"]`); await w(p, 1200);
    const user = await doc(p, 'users/a@b.it');
    await tapSel(p, '[aria-label="Profilo"]'); await w(p);
    await tapText(p, 'Esci', { exact: true }); await w(p, 500);
    await login(p);
    const back = await p.evaluate(t => !!document.querySelector(`[aria-label="Togli dai preferiti: ${t}"]`), WELCOME);
    await tapSel(p, '[aria-label="Profilo"]'); await w(p);
    const prof = await text(p); await ctx.close();
    assert(user && user.app2 && Array.isArray(user.app2.saved) && user.app2.saved.length === 1, 'users/a@b.it.app2: ' + JSON.stringify(user && user.app2));
    assert(user.name === 'Tester', 'l\'account ha perso i suoi campi: ' + JSON.stringify(user));
    assert(back, 'dopo esci e rientra la notizia non è più tra i preferiti');
    assert(/Articoli salvati\s*1 articolo/.test(prof), 'nel profilo: ' + (prof.match(/Articoli salvati[^\n]*\n?[^\n]*/) || [''])[0]);
    assert(!errs.length, errs.join(' | '));
  },

  async 'admin con la rete che cade: "Non salvato: controlla la connessione e riprova."'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await openAdmin(p, 'NEWS');
    await p.evaluate(() => { window.firebase.__fake.failWrites = true; });
    await p.fill('#adTitle', 'Notizia che non parte');
    await tapText(p, 'PUBBLICA', { exact: true }); await w(p, 500);
    const msg = await toast(p);
    const kept = await value(p, '#adTitle');
    const stored = await doc(p, 'shared/bt-news');
    const list = await text(p);
    await p.evaluate(() => { window.firebase.__fake.failWrites = false; });
    await tapText(p, 'PUBBLICA', { exact: true }); await w(p, 600);
    const home = await text(p); await ctx.close();
    assert(msg === NOT_SAVED, 'avviso: "' + msg + '"');
    assert(kept === 'Notizia che non parte', 'il modulo dell\'admin si è svuotato: "' + kept + '"');
    assert(stored === undefined, 'bt-news scritto lo stesso: ' + JSON.stringify(stored));
    assert(!/ARTICOLI \(2\)/.test(list), 'l\'elenco dell\'admin mostra la notizia non salvata');
    assert(/Notizia che non parte/.test(home), 'riprovando con la rete la notizia deve partire');
    assert(!errs.length, errs.join(' | '));
  },

  async 'offline: l\'app si apre con le notizie di serie e "Sei offline"'(b) {
    const { ctx, p, errs } = await open(b, { query: '?nofake', routes: { 'https://www.gstatic.com/**': r => r.abort() } });
    await login(p); await w(p, 600);
    const t = await text(p);
    await goTab(p, 'RACE');
    const race = await text(p); await ctx.close();
    assert(t.includes(WELCOME), 'senza rete manca la notizia di benvenuto');
    assert(t.includes('Sei offline: alcuni contenuti potrebbero non essere aggiornati.'), 'manca la riga "Sei offline"');
    assert(/GP di Singapore/.test(race), 'senza rete la pagina Race non ha il calendario');
    assert(!errs.length, errs.join(' | '));
  },
});
