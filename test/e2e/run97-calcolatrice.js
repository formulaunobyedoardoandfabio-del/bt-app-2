// 8/11 (Edoardo): "nella schermata classifica crea un tasto calcolatrice che calcoli il campionato e tutto quello che
// si vuole con punti ecc, solo se il campionato non è finito". Race → Mondiale: tasto Calcolatrice solo con gare rimaste;
// punti in palio (25 a GP, 8 a Sprint), chi può ancora vincere, scenario fra due piloti scegliendo gli arrivi.
// Uso: node test/build-test.js && node test/e2e/run97-calcolatrice.js [filtro]
const { open, w, tapSel, goTab, login, assert, run } = require('./helpers');
const K = require('../../src/logic/champ-calc');

const MID = '2026-11-09T10:00:00Z';    // dopo il Brasile: restano Las Vegas, Qatar (con Sprint) e Abu Dhabi
const END = '2026-12-20T10:00:00Z';    // mondiale finito
const readCalc = p => p.evaluate(() => {
  const c = document.querySelector('[data-calc]'); if (!c) return null;
  const rows = [...c.querySelectorAll('[data-calc-row]')].map(r => ({ id: r.getAttribute('data-calc-row'), alive: r.getAttribute('data-calc-alive') === '1', pts: +r.querySelector('span:nth-of-type(3)').innerText.replace(/\./g, '') }));
  const evs = [...c.querySelectorAll('[data-calc-event]')].map(e => ({ id: e.getAttribute('data-calc-event'), sprint: /SPRINT/.test(e.innerText) }));
  const res = c.querySelector('[data-calc-result]');
  return { left: +c.querySelector('[data-calc-left]').getAttribute('data-calc-left'), rows, evs, result: res && res.getAttribute('data-calc-result'), score: res && res.querySelector('[data-calc-score]').innerText, verdict: res && res.querySelector('[data-calc-verdict]').innerText, kind: (c.querySelector('[data-calc-kind][aria-pressed="true"]') || {}).getAttribute && c.querySelector('[data-calc-kind][aria-pressed="true"]').getAttribute('data-calc-kind') };
});

run({
  async 'con gare rimaste: tasto Calcolatrice, punti in palio, chi è in corsa e uno scenario fra i primi due'(b) {
    const { ctx, p, errs } = await open(b, { now: MID }); await login(p);
    await goTab(p, 'RACE'); await w(p, 700);
    const btn = await p.$('[data-calc-open]');
    assert(btn, 'nel Mondiale deve esserci il tasto Calcolatrice');
    await tapSel(p, '[data-calc-open]'); await w(p, 500);
    const c = await readCalc(p);
    await p.screenshot({ path: '/tmp/bt/run97-calc.png' });
    assert(c, 'la calcolatrice deve aprirsi');
    assert(c.kind === 'piloti', 'di serie i piloti: ' + c.kind);
    assert(c.evs.length >= 1, 'deve esserci almeno una gara rimasta');
    const left = c.evs.reduce((s, e) => s + (e.sprint ? 8 : 25), 0);
    assert(c.left === left, `punti in palio ${c.left}, dalle gare ${left} (${JSON.stringify(c.evs)})`);
    const top = Math.max(...c.rows.map(r => r.pts));
    c.rows.forEach(r => assert(r.alive === (r.pts + left >= top), `in corsa sbagliato per ${r.id}: ${r.pts}+${left} vs ${top}`));
    assert(c.result === 'aperto' || c.result === 'a' || c.result === 'b', 'scenario: ' + c.result);
    // 8/11: in cima cosa serve a chi è in testa per vincere il Mondiale, rivale per rivale (stessi conti di titleWatch)
    await w(p, 1800);   // fine delle animazioni del titolo
    const tb = await p.evaluate(() => { const e = document.querySelector('[data-calc-title]'); return e && { at: e.getAttribute('data-calc-title'), title: e.querySelector('h2').innerText, needs: [...e.querySelectorAll('[data-calc-need]')].map(x => [x.getAttribute('data-calc-need'), +x.getAttribute('data-need'), x.innerText]), chips: e.querySelectorAll('[data-calc-chip]').length, op: getComputedStyle(e.querySelector('.calc-word')).opacity }; });
    const tw = K.titleWatch(c.rows.map(r => ({ id: r.id, name: r.id, points: r.pts })), c.evs);
    await (await p.$('[data-calc-title]')).screenshot({ path: '/tmp/bt/run97-titolo.png' });
    assert(tb, 'manca il riquadro di cosa serve per vincere il Mondiale');
    assert(tb.at === (tw.decided ? 'deciso' : String(tw.atIndex)), `quando si decide: ${tb.at} contro ${tw.atIndex}`);
    assert(JSON.stringify(tb.needs.map(x => [x[0], x[1]])) === JSON.stringify(tw.rivals.map(r => [r.id, r.need])), 'punti che servono: ' + JSON.stringify(tb.needs) + ' attesi ' + JSON.stringify(tw.rivals));
    assert(/Mondiale|campione/.test(tb.title) && tb.op === '1', 'titolo animato e poi visibile: ' + JSON.stringify(tb));
    if (!tw.decided && tw.atIndex === 0) assert(tb.chips >= tw.rivals.length, 'arrivi minimi per ogni rivale: ' + tb.chips);
    const [pa0, pb0] = c.score.split('–').map(x => +x.trim());
    // primo evento: il primo pilota vince, il secondo fuori dai punti
    const e0 = c.evs[0];
    const sels = await p.$$(`[data-calc-event="${e0.id}"] select`);
    await sels[0].selectOption('1'); await sels[1].selectOption('0'); await w(p, 300);
    const c2 = await readCalc(p);
    const [pa1, pb1] = c2.score.split('–').map(x => +x.trim());
    assert(pa1 === pa0 + (e0.sprint ? 8 : 25) && pb1 === pb0, `scenario dopo la scelta: ${c2.score} (prima ${c.score})`);
    // un pilota non può avere lo stesso posto dell'altro nella stessa gara
    const dis = await p.evaluate(id => { const s = document.querySelectorAll(`[data-calc-event="${id}"] select`)[1]; return s.querySelector('option[value="1"]').disabled; }, e0.id);
    assert(dis, 'il 1° già preso dal primo pilota deve essere disattivato per il secondo');
    await p.evaluate(() => { const c = document.querySelector('[data-calc]'); c.scrollTop = c.scrollHeight; }); await w(p, 300);
    await p.screenshot({ path: '/tmp/bt/run97-scenario.png' });
    // costruttori: 43 a GP e 15 a Sprint
    await tapSel(p, '[data-calc-kind="costruttori"]'); await w(p, 300);
    const c3 = await readCalc(p);
    assert(c3.left === c3.evs.reduce((s, e) => s + (e.sprint ? 15 : 43), 0), 'punti in palio costruttori: ' + c3.left);
    // indietro: torna al Mondiale
    await tapSel(p, '[data-calc] button[aria-label="Indietro"]'); await w(p, 400);
    const back = await p.evaluate(() => !document.querySelector('[data-calc]') && !!document.querySelector('[data-champ-seg]'));
    await ctx.close();
    assert(back, 'Indietro deve tornare al Mondiale');
    assert(!errs.length, errs.join(' | '));
  },

  async 'mondiale finito: niente tasto Calcolatrice'(b) {
    const { ctx, p, errs } = await open(b, { now: END }); await login(p);
    await goTab(p, 'RACE'); await w(p, 700);
    const s = await p.evaluate(() => ({ seg: !!document.querySelector('[data-champ-seg]'), btn: !!document.querySelector('[data-calc-open]') }));
    await ctx.close();
    assert(s.seg && !s.btn, 'a mondiale finito il tasto non c\'è: ' + JSON.stringify(s));
    assert(!errs.length, errs.join(' | '));
  },
});
