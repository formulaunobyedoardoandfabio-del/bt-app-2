// 15/11 (Edoardo): nel giro guidato si può toccare quello che indica il pallino: resta il pallino che galleggia e
// guarda i tocchi, e uscendo dalla scheda aperta torna il riquadro del testo; chi entra come ospite ha il giro da solo;
// tappe nuove (Profilo, Second Screen con la gara demo, B&T Trophies); "03" nel terminale: gara demo dal 5° giro a 30x.
// Uso: node test/build-test.js && node test/e2e/run118-giro-tocchi.js
const { open, w, tapSel, tapText, login, assert, run } = require('./helpers');

const start02 = async p => { await tapSel(p, '[aria-label="Profilo"]'); await w(p, 500); await tapSel(p, '[data-hack-open]'); await w(p, 1800); await p.fill('[data-hack-input]', '02'); await p.press('[data-hack-input]', 'Enter'); await w(p, 2600); };

run({
  async 'tocchi il pezzo indicato: resta il pallino che galleggia; torni indietro e riappare il testo'(b) {
    const { ctx, p, errs } = await open(b);
    await login(p); await w(p, 800);
    await start02(p);
    await p.waitForSelector('[data-tour-spot="on"]', { timeout: 5000 });
    const box = await p.evaluate(() => { const r = document.querySelector('[data-featured]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await p.mouse.click(box.x, box.y); await w(p, 900);
    const mid = await p.evaluate(() => ({ float: !!document.querySelector('[data-tour-float]'), card: !!document.querySelector('[aria-label="Giro guidato"]'), article: !document.querySelector('[data-home]') }));
    await tapSel(p, '[aria-label="Indietro"]'); await w(p, 1400);
    const back = await p.evaluate(() => ({ float: !!document.querySelector('[data-tour-float]'), card: ((document.querySelector('[data-tour-count]') || {}).textContent || '') }));
    await ctx.close();
    assert(mid.float && !mid.card && mid.article, 'aperto il pezzo: solo il pallino che galleggia: ' + JSON.stringify(mid));
    assert(!back.float && /^1 di/.test(back.card), 'tornato in Home: di nuovo il riquadro della stessa tappa: ' + JSON.stringify(back));
    assert(!errs.length, errs.join(' | '));
  },

  async 'ospite da Accedi: parte il giro col pallino; tappe Profilo, Second Screen (gara demo) e B&T Trophies'(b) {
    const { ctx, p, errs } = await open(b);
    await tapText(p, 'ENTRA COME OSPITE'); await w(p, 1500);
    const on = await p.evaluate(() => !!document.querySelector('[data-app-guide]'));
    await ctx.close();
    const two = await open(b);
    await login(two.p); await w(two.p, 800);
    await start02(two.p);
    const titles = new Set();
    let demoSS = false;
    for (let k = 0; k < 30; k++) {
      await two.p.waitForFunction(() => !!document.querySelector('[data-tour-spot="on"]') || !document.querySelector('[data-app-guide]'), null, { timeout: 4500 }).catch(() => {});
      const s = await two.p.evaluate(() => { const d = document.querySelector('[aria-label="Giro guidato"]'); if (!document.querySelector('[data-app-guide]')) return null; return { t: d ? d.innerText.split('\n')[1] : '', demo: !!document.querySelector('[data-live-card][data-live-source="demo"]') }; });
      if (!s) break;
      titles.add(s.t);
      if (s.t === 'Second Screen' && s.demo) demoSS = true;
      await tapSel(two.p, '[data-tour-next]'); await w(two.p, 1100);
    }
    await two.ctx.close();
    assert(on, 'ospite da Accedi: giro guidato partito da solo');
    assert(['Il tuo Profilo', 'Second Screen', 'B&T Trophies'].every(x => titles.has(x)), 'tappe nuove: ' + [...titles].join('|'));
    assert(demoSS, 'Second Screen mostrato con la gara demo accesa');
    assert(!errs.length && !two.errs.length, errs.concat(two.errs).join(' | '));
  },

  async '03 nel terminale: gara demo già al 5° giro, scheda Race'(b) {
    const { ctx, p, errs } = await open(b);
    await login(p); await w(p, 800);
    await tapSel(p, '[aria-label="Profilo"]'); await w(p, 500); await tapSel(p, '[data-hack-open]'); await w(p, 1800);
    await p.fill('[data-hack-input]', '03'); await p.press('[data-hack-input]', 'Enter'); await w(p, 2500);
    const r = await p.evaluate(() => { const c = document.querySelector('[data-live-card]'); return { demo: !!(c && c.getAttribute('data-live-source') === 'demo'), lap: c ? +c.getAttribute('data-live-lap') : null, txt: c ? c.innerText.slice(0, 120) : '' }; });
    await ctx.close();
    assert(r.demo && r.lap >= 5, 'gara demo al 5° giro o dopo: ' + JSON.stringify(r));
    assert(!errs.length, errs.join(' | '));
  },
});
