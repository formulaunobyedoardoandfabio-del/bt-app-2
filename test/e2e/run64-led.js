// Tappa 3, Task 15 (G24, G25, G26): Shift Light al posto dei "Caricamento…" brevi (5 LED verdi, 5 rossi, poi i blu
// che lampeggiano a operazione finita, con il suono di conferma), la griglia dei LED rossi della luce posteriore nel logo
// in alto (pulsa sul badge "IN PISTA" quando c'è una sessione) e l'easter egg: tre tocchi veloci sul logo e i LED
// lampeggiano tre volte, con il suono e la vibrazione.
// Uso: node test/build-test.js && node test/e2e/run64-led.js [filtro]
const { open, w, text, tapText, tapSel, login, openAdmin, assert, run } = require('./helpers');

const spyFx = p => p.evaluate(() => {
  const fx = window.__btFx; window.__played = []; window.__buzzed = [];
  const play = fx.play, buzz = fx.buzz;
  fx.play = n => { window.__played.push(n); return play(n); };
  fx.buzz = n => { window.__buzzed.push(n); return buzz(n); };
});
const shift = p => p.evaluate(() => {
  const e = document.querySelector('[data-shift]'); if (!e) return null;
  const leds = [...e.querySelectorAll('[data-shift-led]')];
  const anim = c => { const x = leds.find(l => l.getAttribute('data-shift-led') === c); return x ? getComputedStyle(x).animationName : null; };
  return { state: e.getAttribute('data-shift'), colors: leds.map(l => l.getAttribute('data-shift-led')).join(''), green: anim('g'), blue: anim('b'), inButton: !!e.closest('button') };
});
// 25/10: nel tasto in alto solo il logo B&T (prima la griglia di LED accanto alla scritta); i tre tocchi lo fanno lampeggiare.
const logo = p => p.evaluate(() => {
  const i = document.querySelector('[data-logo] [data-logo-img]'); if (!i) return null;
  const cs = getComputedStyle(i);
  return { grid: !!document.querySelector('[data-logo] [data-led-grid]'), mode: i.getAttribute('data-mode'), anim: cs.animationName, iter: cs.animationIterationCount, src: i.getAttribute('src').split(',')[0] };
});
const tapLogo = async (p, n, gap = 90) => { for (let i = 0; i < n; i++) { await tapSel(p, '[data-logo]'); await w(p, gap); } };

run({
  async 'accesso: Shift Light mentre aspetta, blu a fine'(b) {
    const { ctx, p, errs } = await open(b);
    await spyFx(p);
    await p.fill('#authEmail', 'a@b.it'); await p.fill('#authPw', 'x');
    await p.evaluate(() => { window.firebase.__fake.holdReads = true; });   // il profilo non arriva: si aspetta
    await p.evaluate(() => { const bs = [...document.querySelectorAll('button')].filter(b => b.textContent.replace(/\s+/g, ' ').trim() === 'ACCEDI'); bs[bs.length - 1].click(); });
    await w(p, 400);
    const busy = await shift(p);
    await p.evaluate(() => { window.firebase.__fake.holdReads = false; });
    await w(p, 250);
    const done = await shift(p);
    const played = await p.evaluate(() => window.__played.slice());
    await w(p, 1400);
    const after = { login: await p.evaluate(() => !!document.querySelector('#authEmail')), shift: await shift(p), text: await text(p) };
    await ctx.close();
    assert(busy && busy.state === 'run' && busy.inButton, 'mentre aspetta manca la Shift Light nel tasto: ' + JSON.stringify(busy));
    assert(busy.colors === 'gggggrrrrrbbbbb', 'i LED non sono 5 verdi, 5 rossi e 5 blu: ' + busy.colors);
    assert(busy.green === 'shiftrun', 'i LED non si accendono in sequenza: ' + busy.green);
    assert(done && done.state === 'done' && done.blue === 'shiftblue', 'a fine accesso i blu non lampeggiano: ' + JSON.stringify(done));
    assert(played.includes('done'), 'manca il suono di conferma: ' + JSON.stringify(played));
    assert(!after.login && !after.shift && /HOME/i.test(after.text), 'dopo la Shift Light non si entra nell\'app: ' + JSON.stringify({ login: after.login, shift: after.shift }));
    assert(!errs.length, errs.join(' | '));
  },

  async 'logo in alto: il logo B&T, senza la griglia di LED'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    const l = await logo(p);
    const label = await p.evaluate(() => { const e = document.querySelector('[data-logo]'); return e && e.getAttribute('aria-label'); });
    await ctx.close();
    assert(l && !l.grid && l.mode === 'idle' && l.src === 'data:image/png;base64', 'nel tasto in alto deve esserci solo il logo: ' + JSON.stringify(l));
    assert(label === 'B&T', 'il logo ha perso il nome: ' + label);
    assert(!errs.length, errs.join(' | '));
  },

  async 'sessione LIVE: i LED pulsano sul badge "in pista"'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    const before = await p.evaluate(() => !!document.querySelector('[data-on-track]'));
    await openAdmin(p, 'GARA LIVE'); await tapText(p, 'AVVIA PROVE LIBERE 1', { exact: true }); await w(p, 300);
    await tapSel(p, '[aria-label="Indietro"]'); await w(p); await tapSel(p, '[aria-label="Indietro"]'); await w(p, 400);
    const badge = await p.evaluate(() => {
      const e = document.querySelector('[data-on-track]'); if (!e) return null;
      const g = e.querySelector('[data-led-grid]'), led = g && g.querySelector('[data-led]');
      return { text: e.innerText.replace(/\s+/g, ' ').trim(), mode: g && g.getAttribute('data-mode'), anim: led ? getComputedStyle(led).animationName : null };
    });
    await ctx.close();
    assert(!before, 'senza sessione c\'è il badge "in pista"');
    assert(badge && /IN PISTA/.test(badge.text) && badge.mode === 'pulse' && badge.anim === 'ledpulse', 'badge "in pista" con i LED che pulsano: ' + JSON.stringify(badge));
    assert(!errs.length, errs.join(' | '));
  },

  async 'tre tocchi sul logo: tre lampeggi del logo, suono e vibrazione'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await spyFx(p);
    await tapLogo(p, 3);
    const l = await logo(p);
    const fx = await p.evaluate(() => ({ played: window.__played.slice(), buzzed: window.__buzzed.slice() }));
    await w(p, 1800);
    const back = await logo(p);
    await ctx.close();
    assert(l && l.mode === 'flash3' && l.anim === 'logoflash3' && l.iter === '3', 'il logo non lampeggia tre volte: ' + JSON.stringify(l));
    assert(fx.played.includes('rev') && fx.buzzed.includes('success'), 'manca suono o vibrazione: ' + JSON.stringify(fx));
    assert(back && back.mode === 'idle', 'dopo i lampeggi il logo non torna fermo: ' + JSON.stringify(back));
    assert(!errs.length, errs.join(' | '));
  },

  async 'un tocco solo: niente'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await spyFx(p);
    await tapLogo(p, 1); await w(p, 300);
    const one = await logo(p);
    await tapLogo(p, 2, 700);   // due tocchi lenti: neanche
    const slow = await logo(p);
    const fx = await p.evaluate(() => ({ played: window.__played.slice(), buzzed: window.__buzzed.slice() }));
    await ctx.close();
    assert(one && one.mode === 'idle' && slow && slow.mode === 'idle', 'con un tocco (o tocchi lenti) i LED lampeggiano: ' + JSON.stringify([one, slow]));
    assert(!fx.played.includes('rev') && !fx.buzzed.includes('success'), 'suono o vibrazione senza easter egg: ' + JSON.stringify(fx));
    assert(!errs.length, errs.join(' | '));
  },
});
