// 31/10 sera (Edoardo: "metti la funzione che c'è quando scrolli in basso alla classifica, che fa vedere il tuo pilota,
// tempo sul giro, posizione ecc, che ti segue per tutta l'app in piccolo e che si possa togliere"): durante una sessione
// in corso la mini Pit Board col pilota del cuore sta in fondo a ogni pagina (non nella Race, che ha la sua); la X la
// toglie per quella sessione; nel Profilo si spegne del tutto. Sessione finita (rivista e ferma): niente mini.
// Uso: node test/build-test.js && node test/e2e/run81-minipit.js [filtro]
const { open, w, norm, inner, has, tapText, tapSel, goTab, login, openAdmin, assert, run } = require('./helpers');

const USER = { 'users/a@b.it': { name: 'Tester', email: 'a@b.it', about: { birth: 1999, follow: 2, fan: 'vivo', years: 5 }, app2: { favDriver: 'leclerc' } } };
const backHome = async p => { await tapSel(p, '[aria-label="Indietro"]'); await w(p); await tapSel(p, '[aria-label="Indietro"]'); await w(p); };
async function startDemo(p, session) { await openAdmin(p, 'GARA LIVE'); await tapText(p, 'AVVIA ' + session, { exact: true }); await w(p, 300); await backHome(p); }
const mini = p => p.evaluate(() => { const e = document.querySelector('[data-mini-pit]'); return e ? { id: e.getAttribute('data-mini-pit'), text: e.innerText.replace(/\s+/g, ' ') } : null; });
const car = (p, id) => p.evaluate(x => { const s = window.__btLive && window.__btLive.state(); const c = s && s.cars.find(k => k.id === x); return c ? { code: c.code, pos: c.pos, lap: s.lap } : null; }, id);

run({
  async 'DEMO della gara: il tuo pilota in piccolo in HOME, GARAGE e FANTA, non nella Race; toccandolo si va alla Race'(b) {
    const { ctx, p, errs } = await open(b, { seed: { admin: true, addDocs: USER } }); await login(p); await w(p, 600);
    await startDemo(p, 'GARA');
    await goTab(p, 'HOME'); await p.evaluate(() => window.__btLive.advance(400)); await w(p, 600);
    const home = await mini(p), c = await car(p, 'leclerc');
    await goTab(p, 'GARAGE'); const garage = await mini(p);
    await goTab(p, 'FANTA'); const fanta = await mini(p);
    await goTab(p, 'RACE'); const race = await mini(p);
    await goTab(p, 'HOME'); await tapSel(p, '[data-mini-pit] [data-mini-pit-open]'); await w(p, 500);
    const onRace = await has(p, '[data-race-tab]');
    await ctx.close();
    assert(home && home.id === 'leclerc', 'in HOME manca la mini Pit Board del pilota del cuore: ' + JSON.stringify(home));
    assert(c && home.text.includes('LEC') && home.text.includes('P' + c.pos) && /GIRO \d+\/\d+/.test(home.text), 'pilota, posizione e giro: ' + home.text + ' ' + JSON.stringify(c));
    assert(/\d:\d\d\.\d{3}/.test(home.text), 'tempo sul giro: ' + home.text);
    assert(garage && fanta, 'la mini deve seguire in tutte le schede: ' + JSON.stringify({ garage, fanta }));
    assert(!race, 'nella Race c\'è già la Pit Board grande: ' + JSON.stringify(race));
    assert(onRace, 'toccando la mini si va alla pagina Race');
    assert(!errs.length, errs.join(' | '));
  },

  async 'la X la toglie per questa sessione; nel Profilo si spegne e resta spenta'(b) {
    const { ctx, p, errs } = await open(b, { seed: { admin: true, addDocs: USER } }); await login(p); await w(p, 600);
    await startDemo(p, 'GARA'); await goTab(p, 'HOME'); await w(p, 300);
    const before = await mini(p);
    await tapSel(p, '[data-mini-pit] [aria-label="Chiudi la mini Pit Board"]'); await w(p, 300);
    const closed = await mini(p);
    await goTab(p, 'FANTA'); const stillClosed = await mini(p);
    // nuova sessione DEMO (qualifiche): torna
    await startDemo(p, 'QUALIFICHE'); await goTab(p, 'HOME'); await w(p, 300);
    const again = await mini(p);
    await tapSel(p, '[aria-label="Profilo"]'); await w(p, 500);
    const toggle = await has(p, `[role="switch"][aria-label="Pit Board in tutta l'app"]`);
    await tapSel(p, `[role="switch"][aria-label="Pit Board in tutta l'app"]`); await w(p, 300);
    await tapSel(p, '[aria-label="Indietro"]'); await w(p, 400);
    const off = await mini(p);
    const saved = await p.evaluate(() => localStorage.getItem('bt_bt-minipit-on'));
    await ctx.close();
    assert(before, 'prima della X la mini c\'è');
    assert(!closed && !stillClosed, 'dopo la X non deve tornare in questa sessione: ' + JSON.stringify({ closed, stillClosed }));
    assert(again, 'con una sessione nuova la mini torna');
    assert(toggle, 'nel Profilo manca "Pit Board in tutta l\'app"');
    assert(!off && saved === 'false', 'spenta dal Profilo: ' + JSON.stringify({ off, saved }));
    assert(!errs.length, errs.join(' | '));
  },
});
