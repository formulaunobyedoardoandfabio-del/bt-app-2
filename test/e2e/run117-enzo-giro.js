// 15/11 (Edoardo): Enzo, l'assistente svogliato (tre tocchi sulla scheda dove sei già), che mentre risponde porta
// l'app nella scheda giusta e illumina il pezzo; giro guidato a tappe in tutta l'app col pallino che vola sul pezzo,
// con la prova diretta (DEMO) per le tappe della diretta quando non si corre. src/ui/guida.jsx, src/logic/enzo.js.
// Uso: node test/build-test.js && node test/e2e/run117-enzo-giro.js
const { open, w, tapSel, login, assert, run } = require('./helpers');

const triple = async p => { for (let k = 0; k < 3; k++) { await tapSel(p, '[data-nav-tab="home"]'); await w(p, 130); } await w(p, 1000); };   // 15/11: prima la barra diventa Enzo
const lastEnzo = p => p.evaluate(() => { const m = [...document.querySelectorAll('[data-enzo-msg="enzo"]')]; return m.length ? m[m.length - 1].textContent : ''; });

run({
  async 'Enzo: saluta, risponde dal copione e mentre parla mostra la scheda; fuori tema; si congeda'(b) {
    const { ctx, p, errs } = await open(b);
    await login(p); await w(p, 800);
    await triple(p);
    const hi = await lastEnzo(p);
    const ball = await p.evaluate(() => ({ ball: !!document.querySelector('[data-enzo-ball] [data-live-orb="red"]'), nav: getComputedStyle(document.querySelector('[data-bottom-nav]')).opacity }));
    await tapSel(p, '[data-enzo-chip="Fanta F1"]'); await w(p, 1800);
    const fanta = await p.evaluate(() => ({ tab: (document.querySelector('[data-nav-tab][aria-current="page"]') || {}).getAttribute ? document.querySelector('[data-nav-tab][aria-current="page"]').getAttribute('data-nav-tab') : '', spot: !!document.querySelector('[data-enzo-spot]'), visible: (() => { const s = document.querySelector('[data-enzo-spot]'), e = document.querySelector('[data-enzo]'); if (!s || !e) return false; const a = s.getBoundingClientRect(), b = e.getBoundingClientRect(); return a.bottom <= b.top + 2 || a.top >= b.bottom - 2; })() }));
    const said = await lastEnzo(p);
    await p.fill('[data-enzo-input]', 'mi dai la ricetta della carbonara?'); await p.press('[data-enzo-input]', 'Enter'); await w(p, 900);
    const off = await lastEnzo(p);
    await tapSel(p, '[data-enzo-close]'); await w(p, 400);
    const bye = await lastEnzo(p);
    await w(p, 7000);   // 15/11: Enzo saluta più piano, per dare il tempo di leggere
    await w(p, 800);
    const gone = await p.evaluate(() => !document.querySelector('[data-enzo]') && getComputedStyle(document.querySelector('[data-bottom-nav]')).opacity === '1');
    await ctx.close();
    assert(/sono Enzo/.test(hi), 'saluto di Enzo: ' + hi);
    assert(ball.ball && ball.nav === '0', 'la barra in basso è diventata la palla di Enzo: ' + JSON.stringify(ball));
    assert(fanta.tab === 'fanta' && fanta.spot && fanta.visible, 'Fanta: l\'app va nella scheda Fanta e il pezzo si illumina, non coperto da Enzo: ' + JSON.stringify(fanta));
    assert(/Il Fanta F1 è nell'apposita sezione/.test(said), 'risposta del copione: ' + said);
    assert(/Per tutto il resto c'è Google/.test(off), 'fuori tema: ' + off);
    assert(/chiudi questa finestrella|stand-by|Non tornare troppo presto/.test(bye), 'frase di chiusura: ' + bye);
    assert(gone, 'poi Enzo se ne va e torna la barra');
    assert(!errs.length, errs.join(' | '));
  },

  async 'giro guidato (02): tappe in tutte le schede, il pallino vola sul pezzo, prova diretta per la Race e poi spenta'(b) {
    const { ctx, p, errs } = await open(b);
    await login(p); await w(p, 800);
    await tapSel(p, '[aria-label="Profilo"]'); await w(p, 500); await tapSel(p, '[data-hack-open]'); await w(p, 1800);
    await p.fill('[data-hack-input]', '02'); await p.press('[data-hack-input]', 'Enter'); await w(p, 2600);
    const seen = new Set(), orb = new Set();
    let demo = false, total = '', steps = 0;
    for (let k = 0; k < 30; k++) {
      await p.waitForFunction(() => !!document.querySelector('[data-tour-spot="on"]') || !document.querySelector('[data-app-guide]'), null, { timeout: 4000 }).catch(() => {});
      const s = await p.evaluate(() => {
        if (!document.querySelector('[data-app-guide]')) return null;
        const c = (document.querySelector('[data-tour-count]') || {}).textContent || '';
        const live = document.querySelector('[data-live-card]');
        return { c, demo: !!(live && live.getAttribute('data-live-source') === 'demo'), orb: (document.querySelector('[data-tour-orb-wrap]') || { style: {} }).style.transform, spot: !!document.querySelector('[data-tour-spot="on"]') };
      });
      if (!s) break;
      steps++; total = (s.c.split(' di ')[1] || '').split('·')[0].trim() || total;
      seen.add((s.c.split('·')[1] || '').trim());
      orb.add(s.orb);
      if (/Race/.test(s.c) && s.demo) demo = true;
      await tapSel(p, '[data-tour-next]'); await w(p, 1300);
    }
    const after = await p.evaluate(() => ({ home: (document.querySelector('[data-nav-tab="home"]') || { getAttribute: () => '' }).getAttribute('aria-current') === 'page', demo: !!document.querySelector('[data-live-card][data-live-source="demo"]'), dialog: !!document.querySelector('[aria-label="Giro guidato"]') }));
    await ctx.close();
    assert(+total >= 15, 'molte tappe: ' + total);
    assert(['Home', 'Fanta', 'Race', 'Garage', 'Profilo'].every(a => seen.has(a)), 'tappe in tutte le parti dell\'app: ' + [...seen].join(','));
    assert(orb.size >= 5, 'il pallino si sposta sui pezzi: ' + orb.size + ' posizioni');
    assert(demo, 'nella Race senza sessione vera parte la prova diretta (DEMO)');
    assert(!after.dialog && after.home && !after.demo, 'alla fine: giro chiuso, Home, prova diretta spenta: ' + JSON.stringify(after));
    assert(!errs.length, errs.join(' | '));
  },
});
