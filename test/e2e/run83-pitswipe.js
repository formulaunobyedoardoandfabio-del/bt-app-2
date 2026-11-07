// Pit Swipe (1/11, Edoardo: "metti la funzione Pit Swipe al posto del rettangolo instagram della home"; design in
// docs/design/pit-swipe.html): mazzo del giorno con i gesti BOX BOX / STAY OUT / RADIO / GIRO VELOCE / BANDIERA ROSSA,
// opinioni con voti veri (fanta/pitswipe-voti), vero o falso, carta del pilota, fine giro, perché la vedo, admin OPINIONI.
// Uso: node test/build-test.js && node test/e2e/run83-pitswipe.js [filtro]
const { open: open0, w, norm, inner, count, has, tapText, tapSel, goTab, login, openAdmin, assert, run } = require('./helpers');
// 7/11: Pit Swipe è spento di serie e si accende dall'admin (shared/bt-flags): queste prove lo accendono.
const open = (b, o = {}) => open0(b, { ...o, seed: { ...(o.seed || {}), addDocs: { 'shared/bt-flags': { pitSwipe: true }, ...((o.seed || {}).addDocs || {}) } } });

const art = (id, date, extra = {}) => ({ id, title: 'Notizia ' + id, summary: 'Riassunto ' + id, category: 'GARA', author: 'Team B&T', image: '', published: true, date, content: 'Testo ' + id, ...extra });
const NEWS = { 'shared/bt-news': { __arr: [
  art('n1', '2026-10-07T09:00:00Z'), art('n2', '2026-10-07T08:00:00Z', { teams: ['ferrari'] }), art('n3', '2026-10-07T07:00:00Z'),
  art('n4', '2026-10-06T09:00:00Z'), art('n5', '2026-10-06T08:00:00Z', { drivers: ['leclerc'] }), art('n6', '2026-10-06T07:00:00Z'), art('n7', '2026-10-05T07:00:00Z'),
] } };
const TAKES = { 'shared/bt-takes': { __arr: [{ id: 'mon', text: 'A Monaco la qualifica conta più della gara.', on: true, at: 2 }, { id: 'pit', text: 'Due soste sono meglio di una.', on: true, at: 1 }, { id: 'old', text: 'Spenta', on: false, at: 3 }] } };
const USER = { 'users/a@b.it': { name: 'Tester', email: 'a@b.it', about: { birth: 1999, follow: 2, fan: 'vivo', years: 5 }, app2: { favDriver: 'leclerc', favTeam: 'ferrari' } } };
const SEED = { addDocs: { ...NEWS, ...TAKES, ...USER } };
const doc = (p, path) => p.evaluate(x => window.firebase.__fake.doc(x), path);
const top = p => p.evaluate(() => { const e = document.querySelector('[data-ps-card]'); return e ? { kind: e.getAttribute('data-kind'), id: e.getAttribute('data-id'), text: e.innerText.replace(/\s+/g, ' ') } : null; });
const dots = p => p.evaluate(() => [...document.querySelectorAll('[data-ps-dot]')].map(e => e.getAttribute('data-state')));
const openPs = async p => { await tapSel(p, '[data-pitswipe-card]'); await w(p, 500); };
// Passa le carte con il tasto giusto per ognuna: notizia BOX, opinione d'accordo, vero o falso "vero", pilota avanti.
async function playAll(p, max = 12) {
  for (let i = 0; i < max; i++) {
    const c = await top(p);
    if (!c) break;
    await tapSel(p, '[data-ps-act="box"]'); await w(p, 450);
  }
}

run({
  async 'Home: al posto del riquadro Instagram il riquadro di Pit Swipe; si apre il mazzo di 10 carte'(b) {
    const { ctx, p, errs } = await open(b, { seed: SEED }); await login(p); await w(p, 800);
    const home = norm(await inner(p, '.scrollcol'));
    const card = norm(await inner(p, '[data-pitswipe-card]'));
    await openPs(p);
    const d = await dots(p), c = await top(p);
    await ctx.close();
    assert(!/SEGUICI SU INSTAGRAM/.test(home), 'in Home c\'è ancora il riquadro di Instagram');
    assert(/Il giro di oggi/.test(card) && /10 carte/.test(card), 'riquadro di Pit Swipe: ' + card);
    assert(d.length === 10 && d[0] === 'now', 'giro di 10 curve: ' + JSON.stringify(d));
    assert(c && c.kind === 'news', 'la prima carta è una notizia: ' + JSON.stringify(c));
    assert(!errs.length, errs.join(' | '));
  },

  async 'BOX BOX salva la notizia, STAY OUT passa, BANDIERA ROSSA torna indietro; i gusti si salvano'(b) {
    const { ctx, p, errs } = await open(b, { seed: SEED }); await login(p); await w(p, 800);
    await openPs(p);
    const c1 = await top(p);
    await tapSel(p, '[data-ps-act="box"]'); await w(p, 450);
    const c2 = await top(p);
    await tapSel(p, '[data-ps-act="out"]'); await w(p, 450);
    const c3 = await top(p);
    await tapSel(p, '[data-ps-act="undo"]'); await w(p, 450);
    const back = await top(p), d = await dots(p);
    await w(p, 1200);
    const app2 = (await doc(p, 'users/a@b.it')).app2;
    await ctx.close();
    assert(c1.id !== c2.id && c2.id !== c3.id, 'le carte devono cambiare: ' + JSON.stringify([c1, c2, c3]));
    assert(back.id === c2.id, 'la bandiera rossa riporta la carta di prima: ' + JSON.stringify(back));
    assert(d[0] === 'box' && d[1] === 'now', 'il giro segna la curva fatta: ' + JSON.stringify(d));
    assert(app2.saved && app2.saved.includes(c1.id), 'BOX BOX salva la notizia: ' + JSON.stringify(app2.saved));
    assert(app2.swipe && app2.swipe.deck && app2.swipe.deck.i === 1, 'posizione nel mazzo salvata: ' + JSON.stringify(app2.swipe && app2.swipe.deck));
    assert(app2.swipe.w && Object.values(app2.swipe.w).some(v => v > 0), 'gusti: ' + JSON.stringify(app2.swipe.w));
    assert(!errs.length, errs.join(' | '));
  },

  async 'opinione: il voto va su Firebase; sotto 20 voti "Sei tra i primi a votare", con 25 voti la percentuale vera'(b) {
    const votes = Array.from({ length: 25 }, (_, i) => ({ k: 't', id: 'pit', aid: 'u' + i, v: i < 15 ? 1 : -1, at: 1 }));
    const { ctx, p, errs } = await open(b, { seed: { addDocs: { ...SEED.addDocs, 'fanta/pitswipe-voti': { __arr: votes } } } }); await login(p); await w(p, 800);
    await openPs(p);
    const seen = [];
    let firstRes = null, secondRes = null;
    for (let i = 0; i < 10; i++) {
      const c = await top(p); if (!c) break; seen.push(c.kind + ':' + c.id);
      await tapSel(p, '[data-ps-act="box"]'); await w(p, 500);
      if (c.kind === 'take') { const r = norm(await inner(p, '[data-ps-result]')); if (c.id === 'mon') firstRes = r; else secondRes = r; }
    }
    const v = (await doc(p, 'fanta/pitswipe-voti')).__arr;
    await ctx.close();
    assert(seen.filter(x => x.startsWith('take:')).sort().join(',') === 'take:mon,take:pit', 'opinioni nel mazzo (non la spenta): ' + seen.join(' '));
    assert(v.some(x => x.k === 't' && x.id === 'mon' && x.v === 1 && x.aid), 'voto salvato: ' + JSON.stringify(v.slice(-3)));
    assert(/Sei tra i primi a votare/.test(firstRes || ''), 'sotto 20 voti: ' + firstRes);
    assert(/62% d'accordo/.test(secondRes || '') && /26 voti/.test(secondRes || ''), 'percentuale vera (16 su 26): ' + secondRes);
    assert(!errs.length, errs.join(' | '));
  },

  async 'fine giro: bandiera a scacchi, serie, missioni; in Home "Giro completato"; contatori nei dati dell\'account'(b) {
    const { ctx, p, errs } = await open(b, { seed: SEED }); await login(p); await w(p, 800);
    await openPs(p);
    const kinds = [];
    for (let i = 0; i < 12; i++) { const c = await top(p); if (!c) break; kinds.push(c.kind); await tapSel(p, '[data-ps-act="box"]'); await w(p, 450); }
    const end = norm(await inner(p, '[data-ps-end]'));
    await w(p, 1200);
    const app2 = (await doc(p, 'users/a@b.it')).app2;
    await tapSel(p, '[aria-label="Indietro"]'); await w(p, 500);
    const card = norm(await inner(p, '[data-pitswipe-card]'));
    await ctx.close();
    assert(kinds.length === 10 && kinds.includes('tf') && kinds[9] === 'driver', 'mazzo: ' + kinds.join(','));
    assert(/Giro completato/.test(end) && /1 GP DI FILA/i.test(end), 'fine giro: ' + end);
    assert(/MISSIONI DELLA SETTIMANA/i.test(end), 'missioni nella fine giro: ' + end);
    assert(app2.swipe.tot.decks === 1 && app2.swipe.streak.n === 1 && app2.swipe.deck.done === true, 'contatori: ' + JSON.stringify(app2.swipe));
    assert(/Giro completato/.test(card), 'in Home: ' + card);
    assert(!errs.length, errs.join(' | '));
  },

  async 'trascinando la carta a destra è BOX BOX (con il timbro); perché la vedo'(b) {
    const { ctx, p, errs } = await open(b, { seed: SEED }); await login(p); await w(p, 800);
    await openPs(p);
    const c1 = await top(p);
    const box = await (await p.$('[data-ps-card]')).boundingBox();
    const y = box.y + box.height / 2, x0 = box.x + box.width / 2;
    await p.mouse.move(x0, y); await p.mouse.down();
    for (let i = 1; i <= 8; i++) { await p.mouse.move(x0 + i * 18, y + i); await w(p, 30); }
    const stamp = await p.evaluate(() => { const e = document.querySelector('[data-ps-stamp]'); return e ? e.innerText : null; });
    await p.mouse.up(); await w(p, 600);
    const c2 = await top(p);
    await tapSel(p, '[data-ps-why]'); await w(p, 300);
    const why = norm(await inner(p, '[data-ps-why-sheet]'));
    await ctx.close();
    assert(stamp === 'BOX BOX', 'timbro durante il trascinamento: ' + stamp);
    assert(c2 && c2.id !== c1.id, 'dopo il trascinamento la carta cambia');
    assert(/Perché vedo questa carta/.test(why) && /(nuove|cuore|box)/.test(why), 'perché la vedo: ' + why);
    assert(!errs.length, errs.join(' | '));
  },

  async 'admin: scheda OPINIONI, si scrive un\'opinione e va in shared/bt-takes'(b) {
    const { ctx, p, errs } = await open(b, { seed: { admin: true, addDocs: NEWS } }); await login(p); await w(p, 600);
    await openAdmin(p, 'OPINIONI');
    await p.fill('[data-take-input]', 'La sprint del sabato piace a tutti.');
    await tapText(p, 'AGGIUNGI', { exact: true }); await w(p, 900);
    const list = await doc(p, 'shared/bt-takes'), rows = await count(p, '[data-take-row]');
    await ctx.close();
    const arr = Array.isArray(list) ? list : (list && list.__arr) || [];
    assert(arr.length === 1 && arr[0].text === 'La sprint del sabato piace a tutti.' && arr[0].on === true, 'opinione salvata: ' + JSON.stringify(list));
    assert(rows === 1, 'riga nella scheda: ' + rows);
    assert(!errs.length, errs.join(' | '));
  },
});
