// 15/11 (Edoardo): "nella sezione nuove funzioni se qualcuno clicca sopra una determinata lo porta a quella funzione".
// Registro delle novità nel Profilo: le voci con un posto nell'app sono bottoni; toccandole si va lì e il pezzo si indica
// per un attimo (data-flash-spot), oppure parte la funzione (Novità con Dot ed Enzo).
// Uso: node test/build-test.js && node test/e2e/run121-novita-vai.js [filtro]
const { open, w, tapSel, login, assert, run } = require('./helpers');

const toChangelog = async p => {
  await login(p); await w(p, 700);
  await tapSel(p, '[aria-label="Profilo"]'); await w(p, 600);
  await p.$eval('[data-changelog]', e => e.scrollIntoView({ block: 'center' })); await w(p, 300);
};
const tapEntry = (p, title) => p.evaluate(t => {
  const b = [...document.querySelectorAll('[data-changelog] [data-changelog-go]')].find(x => x.textContent.includes(t));
  if (b) { b.scrollIntoView({ block: 'center' }); b.click(); }
  return !!b;
}, title);

run({
  async 'una novità con un posto nell\'app porta lì e indica il pezzo'(b) {
    const { ctx, p } = await open(b);
    await toChangelog(p);
    const list = await p.evaluate(() => [...document.querySelectorAll('[data-changelog-item]')].map(li => ({ t: li.textContent.trim().slice(0, 60), go: !!li.querySelector('[data-changelog-go]') })));
    const ok = await tapEntry(p, 'ELO B&T'); await w(p, 1900);   // scorre fino al pezzo, poi l'anello
    const there = await p.evaluate(() => {
      const f = document.querySelector('[data-flash-spot]'), e = [...document.querySelectorAll('[data-fanta-elo]')].find(x => x.getBoundingClientRect().width > 0);
      const a = f && f.getBoundingClientRect(), r = e && e.getBoundingClientRect();
      return { flash: !!f, elo: !!e, around: !!(a && r && a.left <= r.left && a.top <= r.top && a.right >= r.right && a.bottom >= r.bottom), fanta: document.querySelector('[data-nav-tab="fanta"]')?.getAttribute('aria-selected') };
    });
    await w(p, 3400);
    const gone = await p.evaluate(() => !document.querySelector('[data-flash-spot]'));
    await ctx.close();
    assert(list.length > 10 && list.some(x => x.go) && list.some(x => !x.go), 'alcune voci si toccano, altre no: ' + JSON.stringify(list.slice(0, 6)));
    assert(list.find(x => /Avvio senza aspettare la rete/.test(x.t)).go === false, 'una novità senza posto nell\'app non è un bottone');
    assert(ok && there.elo && there.flash && there.around, 'ELO: apre il Fanta e indica il pezzo: ' + JSON.stringify(there));
    assert(gone, 'poi l\'anello sparisce');
  },

  async 'la novità di Dot ed Enzo li fa partire'(b) {
    const { ctx, p } = await open(b);
    await toChangelog(p);
    const ok = await tapEntry(p, 'Novità raccontate da Dot ed Enzo'); await w(p, 900);
    const duo = await p.evaluate(() => !!document.querySelector('[data-duo-guide]'));
    await ctx.close();
    assert(ok && duo, 'parte il mini giro di Dot ed Enzo');
  },
});
