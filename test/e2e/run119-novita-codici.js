// 15/11 (Edoardo): "ultimi aggiornamenti anche con un piccolo bottone dalla Home che mostra all'utente, grazie a Dot ed
// Enzo assieme (battute tra loro o piccole litigate), le nuove funzioni come mini tutorial a parte" e "nella schermata
// admin la possibilità di aggiungere codice del terminale". La logica dei codici è in test/unit/secret-codes.test.js.
// Uso: node test/build-test.js && node test/e2e/run119-novita-codici.js [filtro]
const { open, w, tapSel, login, openAdmin, assert, run } = require('./helpers');

const duo = p => p.evaluate(() => {
  const g = document.querySelector('[data-duo-guide]');
  if (!g) return null;
  const t = g.querySelector('[data-duo-text]'), spot = g.querySelector('[data-duo-spot]');
  return {
    count: (g.querySelector('[data-duo-count]') || {}).textContent || '', who: t && t.getAttribute('data-duo-who'),
    dotOn: !!g.querySelector('[data-duo-dot][data-speaking]'), enzoOn: !!g.querySelector('[data-duo-enzo][data-speaking]'),
    spot: spot ? spot.getBoundingClientRect().toJSON() : null, done: !!g.querySelector('[data-duo-done]'),
    orbs: g.querySelectorAll('[data-duo-dot] [data-live-orb], [data-duo-enzo] [data-live-orb="red"]').length,
  };
});
const rectOf = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); return e ? e.getBoundingClientRect().toJSON() : null; }, sel);
const inside = (a, b) => a && b && a.left <= b.left + 1 && a.top <= b.top + 1 && a.right >= b.right - 1 && a.bottom >= b.bottom - 1;

run({
  async 'Novità in Home: Dot ed Enzo si alternano, aprono le schede e illuminano i pezzi; finito, il bottone si spegne'(b) {
    const { ctx, p } = await open(b);
    await login(p); await w(p, 800);
    const chip0 = await p.evaluate(() => { const c = document.querySelector('[data-novita-open]'); return c && { isNew: c.hasAttribute('data-novita-new'), text: c.textContent.trim() }; });
    await tapSel(p, '[data-novita-open]'); await w(p, 700);
    const s1 = await duo(p);
    await tapSel(p, '[data-duo-next]'); await w(p, 700);
    const s2 = await duo(p);
    await tapSel(p, '[data-duo-next]'); await w(p, 1800);
    const s3 = await duo(p), arch = await rectOf(p, '[data-race-archive]');
    const seen = { dot: 0, enzo: 0, spots: 0 };
    let k = 0;
    for (; k < 30; k++) {
      const s = await duo(p);
      if (!s) break;
      seen[s.who]++; if (s.spot) seen.spots++;
      if (s.done) break;
      await tapSel(p, '[data-duo-next]'); await w(p, 650);
    }
    const end = await duo(p);
    await tapSel(p, '[data-duo-next]'); await w(p, 900);
    const after = await p.evaluate(() => ({ guide: !!document.querySelector('[data-duo-guide]'), chip: !!document.querySelector('[data-novita-open]'), isNew: !!document.querySelector('[data-novita-open][data-novita-new]'), home: !!document.querySelector('[data-saved-chip]') }));
    await ctx.close();
    assert(chip0 && chip0.isNew && /Novità/.test(chip0.text), 'bottone Novità in Home, acceso (novità non viste): ' + JSON.stringify(chip0));
    assert(s1 && /^1 di \d+ · Novità$/.test(s1.count) && s1.who === 'dot' && s1.dotOn && !s1.enzoOn && s1.orbs === 2, 'parte Dot, con Enzo accanto: ' + JSON.stringify(s1));
    assert(s2 && s2.who === 'enzo' && s2.enzoOn && !s2.dotOn, 'poi risponde Enzo: ' + JSON.stringify(s2));
    assert(s3 && inside(s3.spot, arch), 'alla terza battuta si apre Race e si illumina "Riguarda una gara": ' + JSON.stringify({ spot: s3 && s3.spot, arch }));
    assert(seen.dot >= 5 && seen.enzo >= 5 && seen.spots >= 6, 'battute di tutti e due, quasi tutte su un pezzo dell\'app: ' + JSON.stringify(seen));
    assert(end && end.done, 'si arriva alla fine (Fine): ' + JSON.stringify(end));
    assert(!after.guide && after.chip && !after.isNew && after.home, 'finito: torna la Home e il bottone non è più acceso: ' + JSON.stringify(after));
  },

  async 'Novità: Salta chiude subito; il bottone resta per rivederle'(b) {
    const { ctx, p } = await open(b);
    await login(p); await w(p, 800);
    await tapSel(p, '[data-novita-open]'); await w(p, 600);
    await tapSel(p, '[data-duo-skip]'); await w(p, 600);
    const r = await p.evaluate(() => ({ guide: !!document.querySelector('[data-duo-guide]'), chip: !!document.querySelector('[data-novita-open]') }));
    await ctx.close();
    assert(!r.guide && r.chip, 'Salta: chiuso, bottone ancora lì: ' + JSON.stringify(r));
  },

  async 'Admin TERMINALE: aggiunge un codice (no a quelli di serie), il terminale lo riconosce e fa partire la gara demo'(b) {
    const { ctx, p } = await open(b);
    await login(p); await w(p, 600);
    await openAdmin(p, 'TERMINALE');
    const empty = await p.evaluate(() => !!document.querySelector('[data-term-empty]'));
    await p.fill('[data-term-code-input]', '01'); await p.fill('[data-term-title-input]', 'Copia');
    await tapSel(p, '[data-term-add] button'); await w(p, 300);
    const err = await p.evaluate(() => (document.querySelector('[data-term-err]') || {}).textContent || '');
    await p.fill('[data-term-code-input]', 'monza 25'); await p.fill('[data-term-title-input]', 'Monza');
    await p.fill('[data-term-say-input]', 'Il tempio della velocità');
    await p.selectOption('[data-term-action]', 'demo');
    await tapSel(p, '[data-term-add] button'); await w(p, 900);
    const saved = await p.evaluate(() => {
      const d = window.firebase.__fake.doc('shared/bt-terminal-codes');
      return { row: !!document.querySelector('[data-term-row="MONZA25"]'), doc: d && (d.__arr || d) };
    });
    await tapSel(p, '[aria-label="Indietro"]'); await w(p, 600);   // dal Pannello si torna al Profilo
    if (!(await p.$('[data-hack-open]'))) { await tapSel(p, '[aria-label="Profilo"]'); await w(p, 500); }
    await p.$eval('[data-hack-open]', e => e.scrollIntoView({ block: 'center' }));
    await tapSel(p, '[data-hack-open]'); await w(p, 1800);
    await p.fill('[data-hack-input]', 'monza25'); await p.press('[data-hack-input]', 'Enter'); await w(p, 500);
    const said = await p.evaluate(() => (document.querySelector('[data-hack-term]') || {}).innerText || '');
    await w(p, 1500);
    const live = await p.evaluate(() => ({ card: !!document.querySelector('[data-live-card]'), lap: Number((document.querySelector('[data-live-lap]') || { getAttribute: () => 0 }).getAttribute('data-live-lap')) }));
    await ctx.close();
    assert(empty, 'all\'inizio nessun codice aggiunto');
    assert(/c'è già/.test(err), 'un codice di serie non si può riusare: ' + err);
    assert(saved.row && Array.isArray(saved.doc) && saved.doc.some(c => c.code === 'MONZA25' && c.title === 'Monza' && c.action === 'demo'), 'codice salvato per tutti (shared/bt-terminal-codes): ' + JSON.stringify(saved));
    assert(/CODICE ACCETTATO: MONZA/.test(said) && /Il tempio della velocità/.test(said), 'il terminale lo riconosce e scrive il messaggio: ' + said.slice(-200));
    assert(live.card && live.lap >= 5, 'e fa partire la gara demo dal 5° giro: ' + JSON.stringify(live));
  },

  async 'codice dell\'admin già su Firebase: un utente normale lo usa nel terminale'(b) {
    const { ctx, p } = await open(b, { seed: { addDocs: { 'shared/bt-terminal-codes': { __arr: [{ code: 'SPA', title: 'Eau Rouge', say: 'In pieno, se hai coraggio.', action: '', at: 1 }] } } } });
    await login(p); await w(p, 800);
    await tapSel(p, '[aria-label="Profilo"]'); await w(p, 500);
    await p.$eval('[data-hack-open]', e => e.scrollIntoView({ block: 'center' }));
    await tapSel(p, '[data-hack-open]'); await w(p, 1800);
    await p.fill('[data-hack-input]', 'spa'); await p.press('[data-hack-input]', 'Enter'); await w(p, 700);
    const said = await p.evaluate(() => (document.querySelector('[data-hack-term]') || {}).innerText || '');
    await ctx.close();
    assert(/CODICE ACCETTATO: EAU ROUGE/.test(said) && /In pieno, se hai coraggio\./.test(said), 'messaggio del codice: ' + said.slice(-200));
  },
});
