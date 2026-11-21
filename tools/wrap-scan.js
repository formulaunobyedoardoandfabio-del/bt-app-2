// Cerca gli a-capo brutti in tutta l'app (21/11, Edoardo: "cercare un po' in tutta l'app dove ci sono cambi di riga a
// caso che rendono tutto brutto"). Apre la pagina di prova (test/e2e/app.js, da node test/build-test.js) a 320, 360 e
// 390 px, gira le schermate principali e misura le righe vere di ogni testo (test/e2e/wrap-lib.js: corto, orfana,
// spezza). La prova fissa è test/e2e/run133-a-capo.js.
// Uso: node tools/wrap-scan.js   (elenco in /tmp/bt/wrap-scan.json; WRAP_OUT=file per scriverlo altrove)
const fs = require('fs');
const { open, w, tapSel, tapText, goTab, login, run } = require('../test/e2e/helpers');
const { scan } = require('../test/e2e/wrap-lib');
const OUT = process.env.WRAP_OUT || '/tmp/bt/wrap-scan.json';
const found = new Map();

// torna alle schede: tocca "Indietro" finché c'è (pagine e schede sopra le schede)
async function back(p) {
  for (let i = 0; i < 4; i++) {
    const had = await p.evaluate(() => { const b = document.querySelector('[aria-label="Indietro"], [aria-label="Chiudi"]'); if (b) b.click(); return !!b; });
    if (!had) return;
    await w(p, 350);
  }
}
async function visit(p, screen, width, act) {
  try { if (act) await act(); await w(p, 700); } catch (e) { console.log('  (non aperta: ' + screen + ' a ' + width + ': ' + String(e.message).slice(0, 80) + ')'); return; }
  const r = await scan(p, screen, width);
  r.forEach(x => { const k = x.kind + '|' + x.text; const o = found.get(k) || { ...x, widths: [], screens: [] }; if (!o.widths.includes(width)) o.widths.push(width); if (!o.screens.includes(screen)) o.screens.push(screen); found.set(k, o); });
  console.log(`  ${screen} @${width}: ${r.length}`);
}

run({
  async 'giro delle schermate'(b) {
    for (const width of [320, 360, 390]) {
      const { ctx, p } = await open(b, { seed: { pro: true }, width, height: 800 });
      await login(p); await w(p, 900);
      await visit(p, 'Home', width, () => goTab(p, 'Home'));
      await visit(p, 'Garage', width, () => goTab(p, 'Garage'));
      await visit(p, 'Fanta', width, () => goTab(p, 'Fanta'));
      await visit(p, 'Race', width, () => goTab(p, 'Race'));
      const raceTabs = await p.evaluate(() => [...document.querySelectorAll('[data-race-tab]')].map(e => e.getAttribute('data-race-tab')));
      for (const rt of raceTabs) await visit(p, 'Race/' + rt, width, () => tapSel(p, `[data-race-tab="${rt}"]`));
      await visit(p, 'Profilo', width, () => tapSel(p, '[aria-label="Profilo"]'));
      await visit(p, 'Profilo/Personalizza', width, () => tapText(p, "Personalizza l'app", { exact: true }));
      await visit(p, 'Profilo/Trofei', width, () => tapSel(p, '[data-trophies-open]'));
      await back(p);
      await visit(p, 'Notifiche', width, async () => { await goTab(p, 'Home'); await tapSel(p, '[aria-label="Notifiche"]'); });
      await back(p);
      await visit(p, 'GhostLap', width, async () => { await goTab(p, 'Race'); await w(p, 400); await tapSel(p, '[data-ghost-open]'); });
      await back(p);
      await visit(p, 'Circuito', width, async () => { await goTab(p, 'Race'); await w(p, 400); await tapSel(p, '[data-circuit-cta]'); });
      await back(p);
      await visit(p, 'Premium', width, async () => { await goTab(p, 'Home'); await tapSel(p, '[data-premium-chip]'); });
      await ctx.close();
    }
    const list = [...found.values()].sort((a, b) => a.kind.localeCompare(b.kind) || a.screens[0].localeCompare(b.screens[0]));
    fs.writeFileSync(OUT, JSON.stringify(list, null, 1));
    console.log(`\n${list.length} a-capo sospetti → ${OUT}`);
  },
});
