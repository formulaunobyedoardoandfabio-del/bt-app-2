// 15/11 (Edoardo): terminale come blocco di codice (righe numerate, testo che si scrive, a capo, copia), registro
// delle novità nel Profilo, password che si sbriciola su Accedi, pallino guida nel giro guidato e pallino rosso con
// tre tocchi sulla scheda dove sei già. Componenti in src/ui/effetti.jsx.
// Uso: node test/build-test.js && node test/e2e/run116-effetti.js
const { open, w, tapSel, login, assert, run } = require('./helpers');

const openTerm = async p => { await tapSel(p, '[aria-label="Profilo"]'); await w(p, 500); await tapSel(p, '[data-hack-open]'); await w(p, 1800); };
const code = async (p, c) => { await p.fill('[data-hack-input]', c); await p.press('[data-hack-input]', 'Enter'); };

run({
  async 'terminale a blocco di codice: titolo, righe numerate, la riga nuova si scrive, a capo e copia'(b) {
    const { ctx, p, errs } = await open(b);
    await login(p); await w(p, 600);
    await openTerm(p);
    const head = await p.evaluate(() => ({ title: (document.querySelector('[data-code-block] [data-code-title]') || {}).textContent, ln: document.querySelectorAll('[data-code-ln]').length, copy: !!document.querySelector('[data-code-copy]') }));
    await code(p, 'ZZZZ'); await w(p, 120);
    const typing = await p.evaluate(() => { const ls = [...document.querySelectorAll('[data-hack-line]')]; const last = ls[ls.length - 1]; return { cursor: !!last.querySelector('[data-type-cursor]'), text: last.textContent }; });
    await w(p, 2500);
    const after = await p.evaluate(() => { const ls = [...document.querySelectorAll('[data-hack-line]')]; const last = ls[ls.length - 1]; return { cursor: !!last.querySelector('[data-type-cursor]'), num: (last.querySelector('[data-code-ln]') || {}).textContent }; });
    const ws0 = await p.evaluate(() => getComputedStyle(document.querySelector('[data-hack-line]')).whiteSpace);
    await tapSel(p, '[data-code-wrap]'); await w(p, 200);
    const ws1 = await p.evaluate(() => ({ ws: getComputedStyle(document.querySelector('[data-hack-line]')).whiteSpace, pressed: document.querySelector('[data-code-wrap]').getAttribute('aria-pressed') }));
    await ctx.close();
    assert(head.title === 'box-bt/terminale.sh' && head.ln >= 3 && head.copy, 'blocco di codice con titolo, numeri di riga e copia: ' + JSON.stringify(head));
    assert(typing.cursor && typing.text.length > 4, 'la riga nuova si sta scrivendo col cursore (il testo intero c\'è già): ' + JSON.stringify(typing));
    assert(!after.cursor && +after.num > head.ln, 'finita di scrivere, numerata dopo le altre: ' + JSON.stringify(after));
    assert(ws0 === 'pre-wrap' && ws1.ws === 'pre' && ws1.pressed === 'false', 'a capo si spegne: ' + ws0 + ' → ' + JSON.stringify(ws1));
    assert(!errs.length, errs.join(' | '));
  },

  async 'registro delle novità nel Profilo: scheda compatta, bordi che sfumano scorrendo'(b) {
    const { ctx, p, errs } = await open(b);
    await login(p); await w(p, 600);
    await tapSel(p, '[aria-label="Profilo"]'); await w(p, 600);
    const r = await p.evaluate(() => {
      const c = document.querySelector('[data-changelog]'), l = c && c.querySelector('[data-changelog-list]');
      const m0 = l ? (l.style.webkitMaskImage || l.style.maskImage) : '';
      return { on: !!c, items: c ? c.querySelectorAll('[data-changelog-item]').length : 0, head: c ? c.innerText.split('\n')[0] : '', m0, scroll: l ? l.scrollHeight > l.clientHeight : false };
    });
    await p.evaluate(() => { const l = document.querySelector('[data-changelog-list]'); l.scrollTop = l.scrollHeight; l.dispatchEvent(new Event('scroll')); });
    await w(p, 200);
    const m1 = await p.evaluate(() => { const l = document.querySelector('[data-changelog-list]'); return l.style.webkitMaskImage || l.style.maskImage; });
    await ctx.close();
    assert(r.on && r.items >= 10 && /Novità/.test(r.head), 'scheda Novità con gli aggiornamenti: ' + JSON.stringify(r));
    const K = '(#000|rgb\\(0, 0, 0\\))';   // il browser riscrive #000 come rgb(0, 0, 0)
    assert(r.scroll && new RegExp(K + ' 0px').test(r.m0) && /100% - 40px/.test(r.m0), 'in cima sfuma solo il fondo: ' + r.m0);
    assert(new RegExp(K + ' 40px').test(m1) && /100% [-+] 0px/.test(m1), 'in fondo sfuma solo la cima: ' + m1);
    assert(!errs.length, errs.join(' | '));
  },

  async 'password: premendo Accedi si sbriciola in particelle'(b) {
    const { ctx, p, errs } = await open(b);
    await p.fill('#authEmail', 'a@b.it'); await p.fill('#authPw', 'segreta1');
    await p.evaluate(() => { const bs = [...document.querySelectorAll('button')].filter(x => x.textContent.replace(/\s+/g, ' ').trim() === 'ACCEDI'); bs[bs.length - 1].click(); });
    await w(p, 60);
    const r = await p.evaluate(() => ({ count: (document.querySelector('[data-vanish-count]') || { getAttribute: () => '0' }).getAttribute('data-vanish-count'), canvas: !!document.querySelector('[data-pw-vanish]') }));
    await ctx.close();
    assert(r.count === '1', 'una sbriciolata per un Accedi: ' + JSON.stringify(r));
    assert(!errs.length, errs.join(' | '));
  },

  async 'pallino rosso: tre tocchi sulla scheda dove sei già; pallino guida nel giro guidato (02)'(b) {
    const { ctx, p, errs } = await open(b);
    await login(p); await w(p, 800);
    await tapSel(p, '[data-nav-tab="home"]'); await w(p, 150); await tapSel(p, '[data-nav-tab="home"]'); await w(p, 300);
    const two = await p.evaluate(() => !!document.querySelector('[data-red-orb]'));
    await tapSel(p, '[data-nav-tab="home"]'); await w(p, 1000);   // 15/11: prima la barra in basso diventa la palla di Enzo
    const three = await p.evaluate(() => ({ on: !!document.querySelector('[data-red-orb]') && !!document.querySelector('[data-enzo-ball] [data-live-orb="red"]') }));
    // 15/11: il pallino rosso ora è Enzo (run117): si chiude con Chiudi, dopo la frase di saluto
    await tapSel(p, '[data-enzo-close]'); await w(p, 7600);   // congedo da leggere, poi la palla torna barra
    const closed = await p.evaluate(() => !document.querySelector('[data-red-orb]'));
    await openTerm(p);
    await code(p, '02'); await w(p, 2200);
    const e0 = await p.evaluate(() => (document.querySelector('[data-tour-orb] [data-orb-eyes]') || {}).style ? document.querySelector('[data-tour-orb] [data-orb-eyes]').style.transform : null);
    const o0 = await p.evaluate(() => document.querySelector('[data-tour-orb-wrap]').style.transform);
    await tapSel(p, '[data-tour-next]'); await w(p, 1300);   // 15/11: il pallino vola sul pezzo e lo guarda
    const o1 = await p.evaluate(() => document.querySelector('[data-tour-orb-wrap]').style.transform);
    const e1 = await p.evaluate(() => { const e = document.querySelector('[data-tour-orb] [data-orb-eyes]'); return e ? e.style.transform : null; });
    await ctx.close();
    assert(!two, 'con due tocchi non succede niente');
    assert(three.on, 'al terzo tocco il pallino rosso');
    assert(closed, 'tocco sul pallino: si chiude');
    assert(e1 !== null && /translate/.test(e1) && o0 !== o1, 'nel giro guidato il pallino vola sul pezzo e lo guarda: ' + o0 + ' → ' + o1 + ' occhi ' + e1);
    assert(!errs.length, errs.join(' | '));
  },
});
