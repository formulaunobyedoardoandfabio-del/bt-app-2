// Tappa 3, Task 12 (G18): "Centro Notifiche" con la riga dello stato ("Stato: Connesso al Pit Wall", senza rete "Pit
// Wall non raggiungibile"), le preferenze come righe con icona e gli interruttori "Fluid Minimal Pill": capsula grigia
// da spento, colorata da acceso, pallino bianco con l'ombra che scatta come una molla (con il tic della selezione).
// Uso: node test/build-test.js && node test/e2e/run61-notifiche.js [filtro]
const { open, w, text, tapText, tapSel, login, assert, run } = require('./helpers');

const openNotif = async p => { await tapSel(p, '[aria-label="Notifiche"]'); await w(p, 400); };
const status = p => p.evaluate(() => { const e = document.querySelector('[data-pitwall]'); return e ? { text: e.textContent.replace(/\s+/g, ' ').trim(), state: e.getAttribute('data-pitwall') } : null; });
const pill = (p, sel) => p.evaluate(s => {
  const e = document.querySelector(s); if (!e) return null;
  const k = e.querySelector('[data-pill-knob]'), on = e.querySelector('[data-pill-on]');
  const ks = k && getComputedStyle(k), os = on && getComputedStyle(on);
  return {
    pill: e.hasAttribute('data-pill'), checked: e.getAttribute('aria-checked'), bg: getComputedStyle(e).backgroundColor,
    knob: ks && { transform: ks.transform, shadow: ks.boxShadow, bg: ks.backgroundColor, ease: ks.transitionTimingFunction, prop: ks.transitionProperty },
    onOpacity: os ? os.opacity : null,
  };
}, sel);

run({
  async 'titolo "Centro Notifiche", "Stato: Connesso al Pit Wall"'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await openNotif(p);
    const h1 = await p.evaluate(() => [...document.querySelectorAll('h1')].map(e => e.textContent.trim()));
    const st = await status(p);
    const rows = await p.evaluate(() => [...document.querySelectorAll('[data-pref-row]')].map(r => ({ icon: !!r.querySelector('[data-pref-icon] svg'), pill: !!r.querySelector('[data-pill]') })));
    await ctx.close();
    assert(h1.includes('Centro Notifiche'), 'titolo: ' + JSON.stringify(h1));
    assert(st && st.text === 'Stato: Connesso al Pit Wall' && st.state === 'on', 'stato: ' + JSON.stringify(st));
    assert(rows.length === 2 && rows.every(r => r.icon && r.pill), 'righe delle preferenze con icona e interruttore: ' + JSON.stringify(rows));
    assert(!errs.length, errs.join(' | '));
  },

  async 'senza rete "Pit Wall non raggiungibile"'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await openNotif(p);
    await ctx.setOffline(true); await w(p, 300);
    const off = await status(p);
    await ctx.setOffline(false); await w(p, 300);
    const back = await status(p);
    await ctx.close();
    // App aperta senza rete (Firebase non si carica): da ospite, la riga dice subito che il Pit Wall non risponde.
    const c = await open(b, { query: '?nofake', routes: { 'https://www.gstatic.com/**': r => r.abort() } });
    await tapText(c.p, 'ENTRA COME OSPITE'); await w(c.p, 600);
    await openNotif(c.p);
    const guest = await status(c.p);
    await c.ctx.close();
    assert(off && off.text === 'Stato: Pit Wall non raggiungibile' && off.state === 'off', 'senza rete: ' + JSON.stringify(off));
    assert(back && back.text === 'Stato: Connesso al Pit Wall', 'tornata la rete: ' + JSON.stringify(back));
    assert(guest && guest.state === 'off' && /Pit Wall non raggiungibile/.test(guest.text), 'aperta senza rete: ' + JSON.stringify(guest));
    assert(!errs.length && !c.errs.length, [...errs, ...c.errs].join(' | '));
  },

  async 'interruttori a capsula (data-pill) con pallino che scatta'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await tapSel(p, '[aria-label="Profilo"]'); await w(p, 400);
    await p.evaluate(() => { const fx = window.__btFx; window.__played = []; const play = fx.play; fx.play = n => { window.__played.push(n); return play(n); }; });
    const S = '[role="switch"][aria-label="Suoni"]';
    await p.evaluate(() => { const g = document.querySelector('[data-settings-group][aria-expanded="false"]'); if (g) g.click(); }); await w(p, 400);   // 8/11: Suoni sta in "Personalizza l'app"
    const a = await pill(p, S);
    await tapSel(p, S); await w(p, 700);
    const off = await pill(p, S);
    await tapSel(p, S); await w(p, 700);
    const on = await pill(p, S);
    const played = await p.evaluate(() => window.__played.slice());
    await ctx.close();
    assert(a && a.pill && a.checked === 'true' && a.onOpacity === '1', 'acceso di serie, capsula colorata: ' + JSON.stringify(a));
    assert(off.checked === 'false' && off.onOpacity === '0', 'spento: la capsula resta grigia: ' + JSON.stringify(off));
    const rgb = (/rgba?\(([^)]+)\)/.exec(off.bg) || [, ''])[1].split(',').slice(0, 3).map(Number);
    assert(rgb.length === 3 && rgb[0] === rgb[1] && rgb[1] === rgb[2], 'la capsula sotto non è grigia: ' + off.bg);
    assert(a.knob && a.knob.bg === 'rgb(255, 255, 255)' && a.knob.shadow && a.knob.shadow !== 'none', 'pallino bianco con ombra: ' + JSON.stringify(a.knob));
    assert(a.knob.transform !== off.knob.transform && on.knob.transform === a.knob.transform, 'il pallino non si sposta: ' + JSON.stringify([a.knob.transform, off.knob.transform, on.knob.transform]));
    const m = /cubic-bezier\(([^)]+)\)/.exec(a.knob.ease || '');
    assert(m && m[1].split(',').map(Number).some(v => v > 1), 'il pallino non scatta come una molla (curva con rimbalzo): ' + a.knob.ease);
    assert(a.knob.prop === 'transform', 'il pallino si anima con transform (R4): ' + a.knob.prop);
    assert(played.filter(x => x === 'tick').length >= 1, 'manca il tic della selezione: ' + JSON.stringify(played));
    assert(!errs.length, errs.join(' | '));
  },
});
