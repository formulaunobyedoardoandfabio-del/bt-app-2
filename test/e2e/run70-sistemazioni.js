// Richieste di Edoardo del 24/10 sera: il Premium resta dopo aver chiuso e riaperto l'app (prova e abbonamento di
// prova), la prova finisce da sola alla fine del GP; icone nuove nel Garage, anche per i giochi "In arrivo";
// classifiche e meteo in tempo reale da fonti gratuite; pubblicità AdMob solo nell'APK.
// Uso: node test/build-test.js && node test/e2e/run70-sistemazioni.js [filtro]
const { open, w, text, norm, has, inner, tapSel, tapText, goTab, login, assert, run } = require('./helpers');
const Meteo = require('../../src/services/meteo');

const chip = p => p.evaluate(() => { const e = document.querySelector('[data-premium-chip]'); return e ? e.getAttribute('data-premium-chip') + ':' + e.innerText.replace(/\s+/g, ' ').trim() : null; });
const json = (status, body) => r => r.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
// OpenF1 gratis durante una sessione (risposta vera del 24/10): bloccato fino alla fine.
const OF1_LOCKED = { 'https://api.openf1.org/**': json(401, { detail: 'Live F1 session in progress. Global API access (including past sessions) is restricted to authenticated users until the session ends.' }) };
const US_FP3 = '2026-10-24T18:00:00Z';   // sabato del GP degli Stati Uniti, durante le FP3
const raceHead = p => p.evaluate(() => document.querySelector('.scrollcol') ? document.querySelector('.scrollcol').innerText.slice(0, 300).replace(/\s+/g, ' ') : '');
// Jolpica finto con le classifiche vere dopo il GP di Singapore (round 17) e dopo la gara prima (round 16).
const JOLPICA_FX = {
  '/2026/driverstandings.json': require('../fixtures/jolpica-piloti.json'),
  '/2026/constructorstandings.json': require('../fixtures/jolpica-costruttori.json'),
  '/2026/16/driverstandings.json': require('../fixtures/jolpica-piloti-prima.json'),
  '/2026/16/constructorstandings.json': require('../fixtures/jolpica-costruttori-prima.json'),
};
const jolpica = (hits = []) => ({ 'https://api.jolpi.ca/**': r => {
  const path = new URL(r.request().url()).pathname.replace('/ergast/f1', '');
  hits.push(path);
  return JOLPICA_FX[path] ? json(200, JOLPICA_FX[path])(r) : json(404, {})(r);
} });
// La funzione meteo su Vercel finta: risponde con la previsione vera di MET Norway per il COTA (24/10, sabato sera).
const METEO_FX = { circuitId: 'us-2012', source: 'MET Norway', ...Meteo.shapeForecast(require('../fixtures/met-cota.json')) };
const meteoTab = async p => { await goTab(p, 'RACE'); await w(p, 600); await tapSel(p, '[data-race-tab="meteo"]'); await w(p, 900); };
const mondiale = async p => { await goTab(p, 'RACE'); await w(p, 600); await tapSel(p, '[data-race-tab="mondiale"]').catch(() => {}); await w(p, 500); return norm(await text(p)); };
// Chiude e riapre l'app: stessa memoria del telefono (il Firebase finto è nel localStorage), pagina nuova.
async function reopen(p) {
  await p.reload(); await w(p, 400);
  await p.waitForFunction(() => !document.querySelector('[data-splash]'), null, { timeout: 8000 }).catch(() => {});
  await w(p, 1500);
}

run({
  async 'Premium: la prova gratuita resta dopo aver chiuso e riaperto l\'app'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await tapSel(p, '[data-premium-chip="off"]'); await w(p, 400);
    await tapText(p, 'PROVA GRATIS'); await w(p, 1500);
    await tapText(p, 'INIZIA'); await w(p, 1500);   // i dati dell'account si salvano 800 ms dopo l'ultima modifica
    const before = await chip(p);
    await reopen(p);
    const after = await chip(p);
    await ctx.close();
    assert(/^on:PROVA/.test(before || ''), 'la prova non si attiva: ' + before);
    assert(/^on:PROVA/.test(after || ''), 'riaprendo l\'app il Premium non c\'è più: ' + after);
    assert(!errs.length, errs.join(' | '));
  },

  async 'Premium: l\'abbonamento di prova resta dopo aver chiuso e riaperto l\'app'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await tapSel(p, '[data-premium-chip="off"]'); await w(p, 400);
    await tapText(p, 'Oppure abbonati subito'); await w(p, 1600);
    await tapText(p, 'INIZIA'); await w(p, 1500);
    const before = await chip(p);
    await reopen(p);
    const after = await chip(p);
    await ctx.close();
    assert(before === 'on:PREMIUM', 'l\'abbonamento non si attiva: ' + before);
    assert(after === 'on:PREMIUM', 'riaprendo l\'app l\'abbonamento non c\'è più: ' + after);
    assert(!errs.length, errs.join(' | '));
  },

  async 'Premium: la prova finisce da sola dopo il GP e non si può rifare'(b) {
    const { ctx, p, errs } = await open(b); await login(p);   // 7/10: la prova vale fino alla fine del GP di Singapore (11/10)
    await tapSel(p, '[data-premium-chip="off"]'); await w(p, 400);
    await tapText(p, 'PROVA GRATIS'); await w(p, 1500);
    await tapText(p, 'INIZIA'); await w(p, 1500);
    await ctx.addInitScript(() => { window.__btNow = Date.parse('2026-10-14T10:00:00Z'); });   // tre giorni dopo il GP
    await reopen(p);
    const after = await chip(p);
    await tapSel(p, '[data-premium-chip="off"]').catch(() => {}); await w(p, 400);
    const sheet = await text(p);
    await ctx.close();
    assert(after === 'off:Premium', 'dopo il GP la prova è ancora attiva: ' + after);
    assert(!/PROVA GRATIS PER UN GP/.test(sheet) && /ABBONATI/.test(sheet), 'la prova si può rifare: ' + sheet.slice(0, 300));
    assert(!errs.length, errs.join(' | '));
  },

  async 'Premium: uscendo dall\'account si toglie, rientrando torna'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await tapSel(p, '[data-premium-chip="off"]'); await w(p, 400);
    await tapText(p, 'PROVA GRATIS'); await w(p, 1500);
    await tapText(p, 'INIZIA'); await w(p, 1500);
    await tapSel(p, '[aria-label="Profilo"]'); await w(p, 400);
    await tapText(p, 'Esci', { exact: true }); await w(p, 1200);
    const out = await chip(p);
    await login(p); await w(p, 1500);
    const back = await chip(p);
    await ctx.close();
    assert(out === null || /^off/.test(out), 'fuori dall\'account il Premium resta: ' + out);
    assert(/^on:PROVA/.test(back || ''), 'rientrando il Premium non torna: ' + back);
    assert(!errs.length, errs.join(' | '));
  },

  // ── Diretta e dati: la gara del weekend è LIVE da sola, con gli orari ufficiali (senza l'admin) ──
  async 'diretta: nel weekend degli Stati Uniti la gara è IN DIRETTA da sola e dice che la sessione è in corso'(b) {
    const { ctx, p, errs } = await open(b, { now: US_FP3, routes: OF1_LOCKED }); await login(p);
    await goTab(p, 'RACE'); await w(p, 1500);
    const head = await raceHead(p), locked = await has(p, '[data-of1-locked]');
    await ctx.close();
    assert(/IN DIRETTA/.test(head) && /GP degli Stati Uniti/.test(head), 'la gara non è in diretta: ' + head);
    assert(locked, 'durante la sessione manca il riquadro SESSIONE IN CORSO');
    assert(!errs.length, errs.join(' | '));
  },
  async 'diretta: con l\'app aperta prima delle FP1 la diretta parte da sola'(b) {
    const { ctx, p, errs } = await open(b, { now: '2026-10-23T16:50:00Z', routes: OF1_LOCKED }); await login(p);
    await goTab(p, 'RACE'); await w(p, 800);
    const before = await raceHead(p);
    await p.evaluate(() => { window.__btNow = Date.parse('2026-10-23T17:05:00Z'); });   // 25 minuti prima delle FP1
    await p.waitForFunction(() => /IN DIRETTA/.test(document.body.innerText), null, { timeout: 30000 }).catch(() => {});
    const after = await raceHead(p);
    await ctx.close();
    assert(/PROSSIMA GARA/.test(before) && /GP degli Stati Uniti/.test(before), 'prima delle FP1: ' + before);
    assert(/IN DIRETTA/.test(after), 'alle 17:05 la gara non è ancora in diretta: ' + after);
    assert(!errs.length, errs.join(' | '));
  },
  async 'diretta: gli stati vecchi salvati non contano (Malesia e Singapore "IN ARRIVO" dopo la gara)'(b) {
    const old = { 'shared/bt-races': { __arr: [
      { id: 'r16', name: 'GP del Bahrain in Malesia', circuit: 'Sepang International Circuit', country: 'Malesia', round: 16, date: '2026-10-04T09:00:00', status: 'IN ARRIVO', circuitId: 'my-1999' },
      { id: 'r17', name: 'GP di Singapore', circuit: 'Marina Bay', country: 'Singapore', round: 17, date: '2026-10-11T14:00:00', status: 'IN ARRIVO', circuitId: 'sg-2008' },
    ] } };
    const { ctx, p, errs } = await open(b, { now: '2026-10-22T10:00:00Z', seed: { addDocs: old } }); await login(p);
    await goTab(p, 'RACE'); await w(p, 800);
    const head = await raceHead(p);
    await ctx.close();
    assert(/PROSSIMA GARA/.test(head) && /GP degli Stati Uniti/.test(head), 'la prossima gara non è quella degli Stati Uniti: ' + head);
    assert(!errs.length, errs.join(' | '));
  },

  // ── Classifiche del mondiale in automatico (Jolpica F1, gratis) ──
  async 'classifiche: il Mondiale mostra quelle vere di Jolpica dopo l\'ultima gara, con la fonte'(b) {
    const hits = [];
    const { ctx, p, errs } = await open(b, { now: '2026-10-22T10:00:00Z', routes: jolpica(hits) }); await login(p);
    const t = await mondiale(p);
    const podium = norm(await p.evaluate(() => (document.querySelector('[data-champ-podium]') || {}).innerText || ''));
    await ctx.close();
    assert(/GP di Singapore \(round 17\)/.test(t) && /Jolpica/.test(t), 'manca la nota con la fonte: ' + t.slice(-400));
    assert(/Antonelli/.test(podium) && /340 pt/.test(podium), 'il podio non è quello vero: ' + podium);
    assert(hits.length >= 2 && hits.length <= 4, 'richieste a Jolpica: ' + hits.join(', '));
    assert(!errs.length, errs.join(' | '));
  },
  async 'classifiche: senza Jolpica restano quelle dell\'admin'(b) {
    const { ctx, p, errs } = await open(b, { now: '2026-10-22T10:00:00Z' }); await login(p);
    const t = await mondiale(p);
    await ctx.close();
    assert(!/Jolpica/.test(t), 'senza Jolpica non deve citarlo: ' + t.slice(-300));
    assert(/pt/.test(t), 'manca la classifica dell\'admin');
    assert(!errs.length, errs.join(' | '));
  },

  // ── Icone nuove del Garage (disegno "Icone del Garage" del 24/10), anche per i giochi in arrivo ──
  async 'garage: icone nuove per tutti i giochi, quelle in arrivo grigie con l\'orologio'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await goTab(p, 'GARAGE'); await w(p, 500);
    const r = await p.evaluate(() => {
      const icon = el => el.querySelector('[data-garage-icon]');
      const games = [...document.querySelectorAll('[data-game]')].map(g => ({ id: g.getAttribute('data-game'), icon: icon(g) && icon(g).getAttribute('data-garage-icon'), shapes: icon(g) ? icon(g).querySelectorAll('svg *').length : 0 }));
      const soon = [...document.querySelectorAll('[data-soon]')].map(g => ({ id: g.getAttribute('data-soon'), icon: icon(g) && icon(g).getAttribute('data-garage-icon'), clock: !!g.querySelector('[data-soon-clock]'),
        colors: icon(g) && icon(g).querySelector('svg') ? [...icon(g).querySelector('svg').querySelectorAll('[stroke], [fill]')].flatMap(e => [e.getAttribute('stroke'), e.getAttribute('fill')]).filter(c => c && c !== 'none') : [] }));
      return { games, soon };
    });
    await ctx.close();
    assert(r.games.length === 11 && r.games.every(g => g.icon === g.id && g.shapes >= 2), 'giochi: ' + JSON.stringify(r.games));
    assert(r.soon.length === 10 && r.soon.every(g => g.icon === g.id && g.clock), 'in arrivo: ' + JSON.stringify(r.soon.map(g => [g.id, g.icon, g.clock])));
    const grey = /^#(8E8D94|BDBCC2|2A2A30|0C0C0F|6E6D74)$/i;
    assert(r.soon.every(g => g.colors.length && g.colors.every(c => grey.test(c))), 'le icone in arrivo devono essere grigie: ' + JSON.stringify(r.soon.map(g => g.colors.filter(c => !grey.test(c)))));
    assert(!errs.length, errs.join(' | '));
  },

  // ── Previsioni meteo vere del weekend (MET Norway, tramite la funzione su Vercel) ──
  async 'meteo: nel weekend le previsioni vere delle sessioni che mancano, con la fonte MET Norway'(b) {
    const hits = [];
    const routes = { ...OF1_LOCKED, 'https://bt-app-2.vercel.app/api/meteo**': r => { hits.push(r.request().url()); return json(200, METEO_FX)(r); } };
    const { ctx, p, errs } = await open(b, { now: '2026-10-24T21:30:00Z', routes }); await login(p);
    await meteoTab(p);
    const box = norm(await inner(p, '[data-wx-forecast]'));
    const rows = await p.evaluate(() => [...document.querySelectorAll('[data-wx-fc]')].map(e => e.getAttribute('data-wx-fc')));
    await ctx.close();
    assert(hits.length === 1 && /c=us-2012/.test(hits[0]), 'richieste: ' + hits.join(', '));
    assert(rows.join(',') === 'QUALI,RACE', 'sessioni con la previsione: ' + rows.join(','));
    assert(/MET Norway/.test(box) && /\d°/.test(box), 'riquadro: ' + box);
    assert(!errs.length, errs.join(' | '));
  },
  async 'meteo: senza previsioni il riquadro non c\'è (niente numeri inventati)'(b) {
    const { ctx, p, errs } = await open(b, { now: '2026-10-24T21:30:00Z', routes: OF1_LOCKED }); await login(p);
    await meteoTab(p);
    const shown = await has(p, '[data-wx-forecast]');
    await ctx.close();
    assert(!shown, 'senza previsioni il riquadro deve sparire');
    assert(!errs.length, errs.join(' | '));
  },
});
