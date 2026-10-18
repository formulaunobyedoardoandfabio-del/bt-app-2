// Richieste di Edoardo del 18/10: Home senza i tasti LIVE RACE e FANTA F1; ricerca con "#soggetto"; pagina Race senza
// sessione: in fondo il mondiale (l'ultima gara in una scheda a parte); Ghost Lap solo dopo le qualifiche di quel GP.
// Uso: node test/build-test.js && node test/e2e/run69-richieste.js [filtro]
const { open, w, text, tapSel, tapText, goTab, login, assert, run } = require('./helpers');

const NEWS = { 'shared/bt-news': { __arr: [
  { id: 1, title: 'Leclerc vola nelle libere', summary: 'Il monegasco davanti a tutti', category: 'GARA', author: 'Redazione', published: true, date: '2026-10-06' },
  { id: 2, title: 'Mercato: novità in casa Haas', summary: 'Ocon resta', category: 'NEWS', author: 'Redazione', published: true, date: '2026-10-05' },
] } };
const titles = p => p.evaluate(() => [...document.querySelectorAll('[data-article-row], [data-hero]')].map(e => e.innerText.split('\n')[0]).join(' | '));

run({
  async 'Home senza i tasti LIVE RACE e FANTA F1'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    const t = await text(p);
    await ctx.close();
    assert(!/LIVE RACE/.test(t) && !/FANTA F1/.test(t), 'i tasti ci sono ancora');
    assert(!errs.length, errs.join(' | '));
  },

  async 'ricerca con #soggetto: anche le notizie che lo nominano solo nel testo'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: NEWS } }); await login(p);
    await p.fill('#newsSearch', '#leclerc'); await w(p, 500);
    const t1 = await text(p);
    await p.fill('#newsSearch', '#haas'); await w(p, 500);
    const t2 = await text(p);
    await ctx.close();
    assert(/Leclerc vola nelle libere/.test(t1) && !/novità in casa Haas/.test(t1), '#leclerc: ' + t1.slice(0, 300));
    assert(/novità in casa Haas/.test(t2) && !/Leclerc vola/.test(t2), '#haas: ' + t2.slice(0, 300));
    assert(!errs.length, errs.join(' | '));
  },

  async 'Race senza sessione: in fondo il mondiale, l\'ultima gara nella sua scheda'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await goTab(p, 'RACE'); await w(p, 600);
    const first = await p.evaluate(() => ({ podium: !!document.querySelector('[data-champ-podium]'), last: !!document.querySelector('[data-last-race]'), tabs: [...document.querySelectorAll('[data-race-tab]')].map(e => e.getAttribute('data-race-tab') + ':' + e.textContent.trim()) }));
    await tapSel(p, '[data-race-tab="classifica"]'); await w(p, 400);
    const last = await p.evaluate(() => !!document.querySelector('[data-last-race]'));
    await ctx.close();
    assert(first.podium && !first.last, 'di serie il mondiale, non l\'ultima gara: ' + JSON.stringify(first));
    assert(first.tabs[0] === 'mondiale:Mondiale' && first.tabs.includes('classifica:Ultima gara'), 'schede: ' + JSON.stringify(first.tabs));
    assert(last, 'l\'ultima gara nella sua scheda');
    assert(!errs.length, errs.join(' | '));
  },

  async 'Ghost Lap solo dopo le qualifiche di quel GP'(b) {
    const card = async now => { const o = await open(b, { now }); await login(o.p); await goTab(o.p, 'RACE'); await w(o.p, 500); const c = await o.p.evaluate(() => { const e = document.querySelector('[data-ghost-open]'); return e ? e.getAttribute('data-ghost-open') : null; }); const errs = o.errs; await o.ctx.close(); return { c, errs }; };
    const before = await card('2026-10-02T10:00:00Z');   // weekend di Sepang, qualifiche il 3/10
    const after = await card('2026-10-05T10:00:00Z');    // dopo le qualifiche di Sepang
    const next = await card('2026-10-11T10:00:00Z');     // dopo le qualifiche di Singapore (dati non ancora nell'app)
    assert(before.c === 'baku2026q', 'prima delle qualifiche di Sepang: quello di Baku (ultime qualifiche corse), non Sepang: ' + before.c);
    assert(after.c === 'sepang2026q', 'dopo le qualifiche di Sepang: ' + after.c);
    assert(!next.c, 'dopo le qualifiche di Singapore si vede ancora quello di Sepang: ' + next.c);
    assert(![...before.errs, ...after.errs, ...next.errs].length, [...before.errs, ...after.errs, ...next.errs].join(' | '));
  },

  async 'Premium: le funzioni della gara, il Second Screen, gli avvisi e i sondaggi sono gratis; stagione 6 €, prova per un GP'(b) {
    const POLL = { 'shared/bt-home-poll': { id: 'home', q: 'Chi vince il prossimo GP?', options: [{ id: 'a', label: 'Norris' }, { id: 'b', label: 'Leclerc' }] } };
    const { ctx, p, errs } = await open(b, { seed: { addDocs: POLL } }); await login(p);
    const poll = await p.evaluate(() => document.querySelectorAll('[data-poll-option]').length);
    await tapSel(p, '[data-premium-chip="off"]'); await w(p, 500);
    const sheet = await text(p);
    await tapSel(p, '[aria-label="Chiudi"]'); await w(p, 300);
    await goTab(p, 'RACE'); await w(p, 400);
    await tapText(p, 'Modalità Second Screen'); await w(p, 700);
    const ss = await p.evaluate(() => !!document.querySelector('[data-ss]'));
    await ctx.close();
    assert(poll === 2, 'il sondaggio della redazione senza Premium: ' + poll);
    ['Tempi su giro in tempo reale', 'Gomme: usura e strategia', 'Team radio audio live', 'Pit stop e distacchi completi', 'Modalità Second Screen durante la gara', 'Notifiche personalizzate in tempo reale', 'Sondaggi e contenuti della redazione']
      .forEach(f => assert(!sheet.includes(f), 'ancora nel Premium: ' + f));
    assert(/6 €/.test(sheet) && /stagione/i.test(sheet) && /1 € in meno/.test(sheet), 'prezzo a stagione: ' + sheet.slice(0, 400));
    assert(/PROVA GRATIS PER UN GP/.test(sheet), 'prova per un GP');
    assert(!/2,99|24,99|2 SETTIMANE/.test(sheet), 'prezzi o prova vecchi');
    assert(ss, 'il Second Screen senza Premium');
    assert(!errs.length, errs.join(' | '));
  },

  async 'avvisi in gara nel Centro Notifiche senza Premium; "Offrici un caffè" e giochi "In arrivo"'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await tapSel(p, '[aria-label="Notifiche"]').catch(() => {}); await w(p, 500);
    const notif = await text(p);
    await tapSel(p, '[aria-label="Indietro"]').catch(() => {}); await w(p, 300);
    await tapSel(p, '[aria-label="Profilo"]'); await w(p, 400);
    const prof = await text(p);
    await tapSel(p, '[aria-label="Indietro"]').catch(() => {}); await w(p, 300);
    await goTab(p, 'GARAGE'); await w(p, 500);
    const garage = await text(p);
    await ctx.close();
    assert(/Avvisi in gara sul tuo pilota attivi/.test(notif), 'avvisi in gara senza Premium: ' + notif.slice(0, 300));
    assert(/Offrici un caffè/.test(prof), 'manca "Offrici un caffè" nel Profilo');
    assert(/IN ARRIVO/i.test(garage) && /Reaction Test/.test(garage) && /Setup Radar/.test(garage), 'giochi in arrivo nel Garage: ' + garage.slice(0, 300));
    assert(!errs.length, errs.join(' | '));
  },
});
