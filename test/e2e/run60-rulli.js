// Tappa 3, Task 11 (G16, G17): in registrazione e in "Su di te" gli anni da tifoso sono un contachilometri a rulli (le
// cifre girano; + e −, trascinando i rulli o con le frecce) e l'anno di nascita è un manettino rotante, uno scatto per
// anno con il tic e la vibrazione. Il controllo dei 14 anni resta.
// Uso: node test/build-test.js && node test/e2e/run60-rulli.js [filtro]
const { open, w, text, tapText, tapSel, login, assert, run } = require('./helpers');

const spyFx = p => p.evaluate(() => { const fx = window.__btFx; window.__played = []; const play = fx.play; fx.play = n => { window.__played.push(n); return play(n); }; });
const odo = (p, sel = '[data-odometer]') => p.evaluate(s => {
  const e = document.querySelector(s); if (!e) return null;
  const strips = [...e.querySelectorAll('[data-odo-strip]')].map(x => x.style.transform);
  return { now: e.getAttribute('aria-valuenow'), role: e.getAttribute('role'), strips, label: (document.querySelector('[data-follow-label]') || {}).textContent };
}, sel);
const knob = (p, sel) => p.evaluate(s => {
  const e = document.querySelector(s); if (!e) return null;
  const g = e.querySelector('[data-knob-dial]');
  return { role: e.getAttribute('role'), now: e.getAttribute('aria-valuenow'), text: e.getAttribute('aria-valuetext'), max: e.getAttribute('aria-valuemax'), rot: g ? g.style.transform : null };
}, sel);
const keys = async (p, sel, list) => { await p.focus(sel); for (const k of list) { await p.keyboard.press(k); await w(p, 60); } };

run({
  async 'anni da tifoso: rulli con le cifre, + e − cambiano il valore'(b) {
    const { ctx, p, errs } = await open(b);
    await tapText(p, 'REGISTRATI', { exact: true }); await w(p, 300);
    await spyFx(p);
    const a = await odo(p);
    for (let i = 0; i < 3; i++) { await tapSel(p, '[aria-label="Un anno in più"]'); await w(p, 80); }
    const b4 = await odo(p);
    await tapSel(p, '[aria-label="Un anno in meno"]'); await w(p, 120);
    const c = await odo(p);
    const box = await p.evaluate(() => { const r = document.querySelector('[data-odometer]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await p.mouse.move(box.x, box.y); await p.mouse.down();
    for (let i = 1; i <= 6; i++) { await p.mouse.move(box.x, box.y - i * 9); await w(p, 30); }
    await p.mouse.up(); await w(p, 200);
    const d = await odo(p);
    await keys(p, '[data-odometer]', ['ArrowUp', 'ArrowUp', 'ArrowDown']);
    const e = await odo(p);
    const played = await p.evaluate(() => window.__played.slice());
    await ctx.close();
    assert(a && a.role === 'spinbutton' && a.now === '1' && a.strips.length === 2, 'contachilometri all\'inizio: ' + JSON.stringify(a));
    assert(a.strips[0] !== a.strips[1], 'i rulli non mostrano 0 e 1: ' + JSON.stringify(a.strips));
    assert(b4.now === '4' && b4.strips[1] !== a.strips[1], 'con + non sale (o il rullo non gira): ' + JSON.stringify(b4));
    assert(c.now === '3' && /3 anni/.test(c.label), 'con − non scende: ' + JSON.stringify(c));
    assert(d.now === '6', 'trascinando il rullo in su: ' + JSON.stringify(d));
    assert(e.now === '7', 'con le frecce: ' + JSON.stringify(e));
    assert(played.filter(x => x === 'tick').length >= 6, 'gli scatti non fanno il tic: ' + JSON.stringify(played));
    assert(!errs.length, errs.join(' | '));
  },

  async 'anno di nascita: manettino (role="slider"), uno scatto per anno con il tic, frecce della tastiera'(b) {
    const { ctx, p, errs } = await open(b);
    await tapText(p, 'REGISTRATI', { exact: true }); await w(p, 300);
    await spyFx(p);
    const a = await knob(p, '#regBirth');
    await keys(p, '#regBirth', ['ArrowUp']); const b1 = await knob(p, '#regBirth');
    await keys(p, '#regBirth', ['ArrowUp', 'ArrowUp', 'ArrowDown']); const b2 = await knob(p, '#regBirth');
    await tapSel(p, '[aria-label="Anno dopo"]'); await w(p, 100); const b3 = await knob(p, '#regBirth');
    const played = await p.evaluate(() => window.__played.slice());
    const t = await text(p);
    await ctx.close();
    assert(a && a.role === 'slider' && a.text === 'Non indicato', 'manettino all\'inizio: ' + JSON.stringify(a));
    assert(b1.now === '2000', 'primo scatto: ' + JSON.stringify(b1));
    assert(b2.now === '2001' && b2.rot !== b1.rot, 'frecce: ' + JSON.stringify(b2));
    assert(b3.now === '2002', 'tasto "Anno dopo": ' + JSON.stringify(b3));
    assert(played.filter(x => x === 'tick').length === 5, 'uno scatto per anno con il tic: ' + JSON.stringify(played));
    assert(/2002/.test(t), 'l\'anno scelto non si legge');
    assert(!errs.length, errs.join(' | '));
  },

  async 'il controllo dei 14 anni resta'(b) {
    const { ctx, p, errs } = await open(b);
    await tapText(p, 'REGISTRATI', { exact: true }); await w(p, 300);
    await p.fill('#regName', 'Piccolo'); await p.fill('#authEmail', 'piccolo@b.it'); await p.fill('#authPw', 'abcdef'); await p.fill('#regPw2', 'abcdef');
    await keys(p, '#regBirth', ['End', 'ArrowDown']);   // 2015
    const k = await knob(p, '#regBirth');
    await tapSel(p, '[data-fan-option="vivo"]'); await p.check('#regAdult');
    await tapText(p, 'CREA ACCOUNT', { exact: true }); await w(p, 1500);
    const t = await text(p), user = await p.evaluate(() => window.firebase.__fake.doc('users/piccolo@b.it'));
    await ctx.close();
    const c = await open(b); await login(c.p);
    await tapSel(c.p, '[aria-label="Profilo"]'); await w(c.p, 400);
    await tapSel(c.p, '[aria-label="Modifica Su di te"]'); await w(c.p, 300);
    const k2 = await knob(c.p, '#aboutBirth');
    await c.ctx.close();
    assert(k.now === '2015', 'manettino a 2015: ' + JSON.stringify(k));
    assert(/Per iscriverti a Sector 4 devi avere almeno 14 anni\./.test(t) && !user, 'con meno di 14 anni l\'account si crea (o manca l\'avviso)');
    assert(k2 && k2.max === '2012', 'in "Su di te" il manettino arriva a ' + (k2 && k2.max) + ' invece del 2012');
    assert(!errs.length && !c.errs.length, [...errs, ...c.errs].join(' | '));
  },
});
