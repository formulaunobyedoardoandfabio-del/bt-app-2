// 15/11 (Edoardo): "problema grave nel Fanta: il sondaggio storico e forse altri che ho creato io non funzionano".
// Causa (documento vero shared/bt-predictions): la sua domanda era di tipo Scuderia con la risposta già segnata
// (pitstop più veloce a Las Vegas 2023, Red Bull) per la gara di sabato prossimo; con la risposta segnata la domanda
// risultava chiusa ("Il risultato lo segna l'admin") e nessuno poteva rispondere. Ora, se la risposta c'è già prima che
// la sessione cominci, è una domanda di storia: un tentativo e si vede subito se è giusta (BtLogic.predKnown).
// Uso: node test/build-test.js && node test/e2e/run120-storia-admin.js [filtro]
const { open, w, tapSel, goTab, login, assert, run } = require('./helpers');

const HIS_Q = { id: 'p1794692361973', kind: 'team', cat: 'Scuderia', q: 'Quale scuderie fece il pitstop più veloce della gara di Las Vegas nel 2023?', answer: 'redbull', raceId: 'r21', about: 'RACE' };
const POLL_Q = { id: 'p1794692399999', kind: 'poll', cat: 'Sondaggio', q: 'Chi vinse a Las Vegas nel 2023?', answer: 'o1', raceId: 'r21', about: 'QUALI', options: [{ id: 'o0', label: 'Leclerc' }, { id: 'o1', label: 'Verstappen' }] };
const SEED = { addDocs: { 'shared/bt-predictions': { __arr: [HIS_Q, POLL_Q] } } };
const card = (p, id) => p.evaluate(i => {
  const c = document.querySelector(`[data-prediction="${i}"]`);
  return c && { text: c.innerText.replace(/\s+/g, ' '), open: !!c.querySelector('[data-pred-open]:not([disabled])'), opts: [...c.querySelectorAll('[data-option]')].filter(b => !b.disabled).length };
}, id);
const toFanta = async p => { await login(p); await w(p, 700); await goTab(p, 'FANTA'); await w(p, 1200); };

run({
  async 'domanda di scuderia con la risposta già segnata (prima della gara): si risponde una volta e si vede se è giusta'(b) {
    const { ctx, p } = await open(b, { now: '2026-11-15T11:00:00Z', seed: SEED });
    await toFanta(p);
    const c0 = await card(p, HIS_Q.id);
    await p.$eval(`[data-prediction="${HIS_Q.id}"]`, e => e.scrollIntoView({ block: 'center' }));
    await tapSel(p, `[data-prediction="${HIS_Q.id}"] [data-pred-open]`); await w(p, 500);
    await tapSel(p, `[data-pred-picker="${HIS_Q.id}"] [data-pick-option="ferrari"]`); await w(p, 1400);
    const c1 = await card(p, HIS_Q.id);
    await p.$eval(`[data-prediction="${POLL_Q.id}"]`, e => e.scrollIntoView({ block: 'center' }));
    await tapSel(p, `[data-prediction="${POLL_Q.id}"] [data-option="o1"]`); await w(p, 1400);
    const c2 = await card(p, POLL_Q.id);
    await ctx.close();
    assert(c0 && /^STORIA/.test(c0.text) && c0.open && !/Chiusa|lo segna l'admin/.test(c0.text), 'prima: domanda di storia aperta, non chiusa: ' + JSON.stringify(c0));
    assert(c1 && /Non era giusta: la risposta esatta è Red Bull/.test(c1.text) && !c1.open, 'risposta sbagliata: si vede subito quella giusta, niente secondo tentativo: ' + JSON.stringify(c1));
    assert(c2 && /Giusto! \+1 punto FantaF1/.test(c2.text) && c2.opts === 0, 'anche un sondaggio con la risposta già segnata: giusto, +1: ' + JSON.stringify(c2));
  },

  async 'a gara cominciata la stessa domanda è un pronostico chiuso, come prima'(b) {
    const { ctx, p } = await open(b, { now: '2026-11-22T06:30:00Z', seed: SEED });
    await toFanta(p);
    const c = await card(p, HIS_Q.id);
    await ctx.close();
    assert(c && /Chiusa/.test(c.text) && !c.open, 'chiusa a gara cominciata: ' + JSON.stringify(c));
  },
});
