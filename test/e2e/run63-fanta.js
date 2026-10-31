// Tappa 3, Task 14 (G21, G22, G23): FantaF1.
// - Parc fermé: quando si chiudono la squadra o un pronostico, un telo in carbonio scende sopra con "PARC FERMÉ" e
//   l'ora della chiusura (la squadra si può ancora guardare alzando il telo).
// - Zona eliminazione nelle leghe con almeno 10 squadre, nelle proporzioni delle qualifiche 2026: con N squadre le
//   ultime round(N × 6 / 22) in rosso ("Zona Q1"), le round(N × 6 / 22) prima in giallo ("Zona Q2").
// - Carte che si girano in 3D: davanti il pilota e il prezzo, dietro punti, quotazione e numeri veri della stagione.
// Uso: node test/build-test.js && node test/e2e/run63-fanta.js [filtro]
const { open, w, text, tapText, tapSel, goTab, login, assert, run } = require('./helpers');
const { leagueSeed } = require('../fake/leagues');

// Singapore (r17): Qualifiche Sprint ven 9 ott 12:30Z (14:30 in Italia), gara dom 11 ott.
const LOCKED = '2026-10-09T13:00:00Z';
const PREDS = { 'shared/bt-predictions': { __arr: [
  { id: 's1', kind: 'driver', cat: 'Pilota', q: 'Chi farà la pole della Sprint a Singapore?', about: 'SQ', raceId: 'r17', answer: null },
  { id: 's2', kind: 'driver', cat: 'Pilota', q: 'Chi sarà il pilota del giorno a Singapore?', about: 'RACE', raceId: 'r17', answer: null },
] } };
const tarp = (p, sel) => p.evaluate(s => {
  const e = document.querySelector(s); if (!e) return null;
  const st = getComputedStyle(e);
  return { state: e.getAttribute('data-state'), text: e.innerText.replace(/\s+/g, ' ').trim(), bg: st.backgroundImage, anim: st.animationName, transform: st.transform };
}, sel);
const card = (p, id) => p.evaluate(id => {
  const c = document.querySelector(`[data-fanta-card="${id}"]`); if (!c) return null;
  const inner = c.querySelector('[data-flip-inner]'), back = c.querySelector('[data-card-back]');
  const st = inner && getComputedStyle(inner);
  return { flip: c.getAttribute('data-flip'), transform: st && st.transform, prop: st && st.transitionProperty, back: back ? back.innerText.replace(/\s+/g, ' ').trim() : null, perspective: getComputedStyle(c).perspective };
}, id);

run({
  async 'squadra chiusa: telo in carbonio "PARC FERMÉ" con l\'ora'(b) {
    const { ctx, p, errs } = await open(b, { now: LOCKED, seed: { addDocs: PREDS } }); await login(p);
    await goTab(p, 'FANTA'); await w(p, 900);
    const sq = await tarp(p, '[data-parc-ferme="squad"]');
    const pr1 = await tarp(p, '[data-prediction="s1"] [data-parc-ferme]');
    const pr2 = await tarp(p, '[data-prediction="s2"] [data-parc-ferme]');
    await tapSel(p, '[aria-label="Alza il telo e guarda la squadra"]'); await w(p, 900);
    const up = await tarp(p, '[data-parc-ferme="squad"]');
    const cards = await p.evaluate(() => document.querySelectorAll('[data-fanta-card]').length);
    await tapSel(p, '[aria-label="Copri la squadra con il telo"]'); await w(p, 900);
    const down = await tarp(p, '[data-parc-ferme="squad"]');
    await ctx.close();
    // Prima della chiusura niente telo; con "Rimuovi animazioni" il telo è già giù.
    const o = await open(b, { seed: { addDocs: PREDS } }); await login(o.p); await goTab(o.p, 'FANTA'); await w(o.p, 400);
    const before = await tarp(o.p, '[data-parc-ferme]');
    await o.ctx.close();
    const r = await open(b, { now: LOCKED, reducedMotion: 'reduce' }); await login(r.p); await goTab(r.p, 'FANTA'); await w(r.p, 300);
    const still = await tarp(r.p, '[data-parc-ferme="squad"]');
    await r.ctx.close();
    assert(sq && /PARC FERMÉ/.test(sq.text) && /ven 9 ott, 14:30/.test(sq.text), 'telo della squadra: ' + JSON.stringify(sq));
    assert(/gradient/.test(sq.bg), 'il telo non è in carbonio: ' + sq.bg);
    assert(sq.anim === 'parcferme' && sq.state === 'down', 'il telo non scende: ' + JSON.stringify(sq));
    assert(pr1 && /PARC FERMÉ/.test(pr1.text) && /14:30/.test(pr1.text), 'telo sul pronostico chiuso: ' + JSON.stringify(pr1));
    assert(pr2 === null, 'il pronostico ancora aperto ha il telo: ' + JSON.stringify(pr2));
    assert(up && up.state === 'up' && up.transform !== down.transform && cards === 7, 'il telo non si alza per guardare la squadra: ' + JSON.stringify(up));
    assert(down && down.state === 'down', 'il telo non torna giù: ' + JSON.stringify(down));
    assert(before === null, 'con la squadra aperta c\'è il telo: ' + JSON.stringify(before));
    assert(still && still.anim === 'none' && still.state === 'down', 'con "Rimuovi animazioni": ' + JSON.stringify(still));
    assert(!errs.length && !o.errs.length && !r.errs.length, [...errs, ...o.errs, ...r.errs].join(' | '));
  },

  // 31/10: le leghe sono quelle vere (Firebase): una di 7 non ha zone, una di 12 sì.
  // 31/10: le leghe sono quelle vere (Firebase): una di 7 non ha zone, una di 12 sì.
  // 31/10: le leghe sono quelle vere (Firebase): una di 7 non ha zone, una di 12 sì.
  // 31/10 sera (Edoardo): finita la gara, i sondaggi e le previsioni di quel weekend spariscono da soli dal Fanta;
  // i punti presi restano (e le domande di storia, che non hanno un weekend, restano sempre).
  async 'dopo la gara le previsioni di quel weekend spariscono; i punti restano'(b) {
    const seed = { 'shared/bt-predictions': { __arr: [
      { id: 's1', kind: 'driver', cat: 'Pilota', q: 'Chi farà la pole della Sprint a Singapore?', about: 'SQ', raceId: 'r17', answer: 'russell' },
      { id: 'm1', kind: 'driver', cat: 'Pilota', q: 'Chi vince in Messico?', about: 'RACE', raceId: 'r20', answer: null },
    ] }, 'users/a@b.it': { name: 'Mario', predAnswers: { s1: 'russell' } } };
    const { ctx, p, errs } = await open(b, { now: '2026-10-14T10:00:00Z', seed: { addDocs: seed } }); await login(p);
    await goTab(p, 'FANTA'); await w(p, 900);
    const shown = await p.evaluate(() => [...document.querySelectorAll('[data-prediction]')].map(e => e.getAttribute('data-prediction')));
    const page = await text(p);
    await ctx.close();
    assert(!shown.includes('s1'), 'la previsione di Singapore (gara finita) deve sparire: ' + shown.join(','));
    assert(shown.includes('m1'), 'quella del Messico (gara da fare) resta: ' + shown.join(','));
    assert(!errs.length, errs.join(' | '));
  },
  async 'lega di 12: zone Q1 e Q2 colorate'(b) {
    const zonesOf = p => p.evaluate(() => [...document.querySelectorAll('[data-league-table] [data-zone]')].map(e => e.getAttribute('data-zone')));
    const seven = await open(b, { seed: { addDocs: leagueSeed({ members: ['Anna', 'Bruno', 'Carla', 'Dario', 'Elena', 'Fabio', 'Gina', 'Ivo', 'Luca', 'Mara', 'Nico'].slice(0, 6).map(name => ({ name })) }) } }); await login(seven.p); await goTab(seven.p, 'FANTA'); await w(seven.p, 600);
    const zones0 = await zonesOf(seven.p); await seven.ctx.close();
    const members = ['Anna', 'Bruno', 'Carla', 'Dario', 'Elena', 'Fabio', 'Gina', 'Ivo', 'Luca', 'Mara', 'Nico'].map((name, i) => ({ name, bonus: 100 - i }));
    const { ctx, p, errs } = await open(b, { seed: { addDocs: leagueSeed({ members }) } }); await login(p); await goTab(p, 'FANTA'); await w(p, 600);
    const rows = await p.evaluate(() => [...document.querySelectorAll('[data-league-table] [data-zone]')].map(e => ({ zone: e.getAttribute('data-zone'), bg: getComputedStyle(e.firstElementChild).backgroundColor, text: e.innerText.replace(/\s+/g, ' ') })));
    const labels = await p.evaluate(() => [...document.querySelectorAll('[data-league-table] [data-zone-label]')].map(e => ({ zone: e.getAttribute('data-zone-label'), text: e.innerText.trim(), color: getComputedStyle(e).color })));
    await ctx.close();
    assert(zones0.length === 7 && zones0.every(z => z === 'q3'), 'lega di 7: niente zone ' + JSON.stringify(zones0));
    assert(rows.length === 12, 'righe della lega: ' + rows.length);
    assert(rows.map(r => r.zone).join() === 'q3,q3,q3,q3,q3,q3,q2,q2,q2,q1,q1,q1', 'zone: ' + rows.map(r => r.zone).join());
    const rgb = s => (s.match(/\d+(\.\d+)?/g) || []).map(Number);
    const [r1, g1, b1] = rgb(rows[11].bg), [r2, g2, b2] = rgb(rows[7].bg);
    assert(r1 > g1 + 10 && r1 > b1 + 10, 'la Zona Q1 non è rossa: ' + rows[11].bg);
    assert(r2 > b2 + 10 && g2 > b2 + 10, 'la Zona Q2 non è gialla: ' + rows[7].bg);
    assert(labels.map(l => l.text).join() === 'ZONA Q2,ZONA Q1', 'etichette delle zone: ' + JSON.stringify(labels));
    assert(!errs.length, errs.join(' | '));
  },
  async 'carta del pilota: tocco e si gira con punti, prezzo e statistiche veri'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await goTab(p, 'FANTA');
    const a = await card(p, 'russell');
    await tapSel(p, '[aria-label="Gira la carta di George Russell"]'); await w(p, 900);
    const back = await card(p, 'russell');
    await tapSel(p, '[aria-label="Cambia George Russell"]'); await w(p, 300);
    const picker = /SCEGLI IL PILOTA/.test(await text(p));
    await tapSel(p, '[aria-label="Chiudi"]'); await w(p, 300);
    await tapSel(p, '[aria-label="Torna davanti: George Russell"]'); await w(p, 900);
    const front = await card(p, 'russell');
    await tapSel(p, '[aria-label="Gira la carta di Audi"]'); await w(p, 900);
    const team = await card(p, 'audi');
    await ctx.close();
    const r = await open(b, { reducedMotion: 'reduce' }); await login(r.p); await goTab(r.p, 'FANTA');
    const quick = await r.p.evaluate(() => getComputedStyle(document.querySelector('[data-fanta-card="russell"] [data-flip-inner]')).transitionDuration);
    await r.ctx.close();
    assert(a && a.flip === 'front' && a.perspective !== 'none', 'carta davanti, con la prospettiva 3D: ' + JSON.stringify(a));
    assert(back.flip === 'back' && /matrix3d\(-1/.test(back.transform) && back.prop === 'transform', 'la carta non si gira in 3D: ' + JSON.stringify(back));
    // Numeri veri già nell'app: FantaF1 (413 punti, $28.1M, +$0.3M) e mondiale di serie (2°, 236 punti).
    assert(/413/.test(back.back) && /\$28\.1M/.test(back.back) && /▲\$0\.3M/.test(back.back), 'dietro mancano punti e quotazione: ' + back.back);
    assert(/2°/.test(back.back) && /236 pt/.test(back.back), 'dietro manca il mondiale: ' + back.back);
    assert(!/%|probabilit/i.test(back.back), 'dietro ci sono probabilità: ' + back.back);
    assert(picker, 'dal retro "Cambia" non apre la scelta del pilota');
    assert(front.flip === 'front' && !/matrix3d\(-1/.test(front.transform || ''), 'la carta non torna davanti: ' + JSON.stringify(front));
    assert(team && team.flip === 'back' && /\$9\.2M/.test(team.back) && /209/.test(team.back) && /8°/.test(team.back), 'carta della scuderia: ' + JSON.stringify(team));
    assert(parseFloat(quick) <= .15, 'con "Rimuovi animazioni" la carta gira piano: ' + quick);
    assert(!errs.length && !r.errs.length, [...errs, ...r.errs].join(' | '));
  },
});
