// 14/11 (Edoardo): "metti tutti gli utenti in automatico nella lega B&T (codice BT-M7AS)". Una volta per account: chi
// poi esce dalla lega non ci viene rimesso a forza. Ospite: niente lega (serve un account).
// Uso: node test/build-test.js && node test/e2e/run110-lega-bt.js [filtro]
const { open, w, login, goTab, assert, run } = require('./helpers');

const LEAGUE = { 'fanta/lega-BT-M7AS': { name: 'Lega B&T', owner: 'uowner', created: 1, members: { uowner: { name: 'Edoardo', team: 'B&T' } } } };
const doc = (p, path) => p.evaluate(x => window.firebase.__fake.doc(x), path);
const myAid = p => p.evaluate(() => Object.keys(((window.firebase.__fake.doc('fanta/lega-BT-M7AS') || {}).members) || {}).find(k => k !== 'uowner'));

run({
  async 'chi entra finisce da solo nella lega B&T (e lo vede nel Fanta)'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: LEAGUE } }); await login(p); await w(p, 2500);
    const lg = await doc(p, 'fanta/lega-BT-M7AS');
    const user = await doc(p, 'users/a@b.it');
    await goTab(p, 'FANTA'); await w(p, 900);
    const body = await p.evaluate(() => document.body.innerText);
    await ctx.close();
    const mine = Object.entries((lg && lg.members) || {}).filter(([k]) => k !== 'uowner');
    assert(mine.length === 1 && mine[0][1].name === 'Tester', 'membro della lega: ' + JSON.stringify(lg && lg.members));
    assert(user && user.app2 && (user.app2.leagues || []).includes('BT-M7AS'), 'la lega è tra le mie: ' + JSON.stringify(user && user.app2 && user.app2.leagues));
    assert((user.app2.autoLeagues || []).includes('BT-M7AS'), 'segnato: fatto una volta per questo account');
    assert(/Lega B&T/.test(body), 'nel Fanta si vede la lega B&T');
    assert(!errs.length, errs.join(' | '));
  },

  async 'chi esce dalla lega B&T non ci viene rimesso riaprendo l\'app'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: LEAGUE } }); await login(p); await w(p, 2500);
    const aid = await myAid(p);
    // esce dalla lega come farebbe il tasto "Esci dalla lega"
    await p.evaluate(a => {
      const f = window.firebase.__fake, d = f.doc('fanta/lega-BT-M7AS');
      f.setDoc('fanta/lega-BT-M7AS', { ...d, members: { ...d.members, [a]: { ...d.members[a], gone: true } } });
      const u = f.doc('users/a@b.it');
      f.setDoc('users/a@b.it', { ...u, app2: { ...u.app2, leagues: (u.app2.leagues || []).filter(c => c !== 'BT-M7AS') } });
    }, aid);
    await p.reload(); await w(p, 3000);
    const lg = await doc(p, 'fanta/lega-BT-M7AS');
    const user = await doc(p, 'users/a@b.it');
    await ctx.close();
    assert(aid, 'era entrato');
    assert(lg.members[aid].gone === true, 'resta fuori: ' + JSON.stringify(lg.members[aid]));
    assert(!(user.app2.leagues || []).includes('BT-M7AS'), 'non è tornata tra le sue leghe');
    assert(!errs.length, errs.join(' | '));
  },

  async 'da ospite niente lega; se la lega non c\'è l\'app non si rompe'(b) {
    const g = await open(b, { seed: { addDocs: LEAGUE } });
    await g.p.evaluate(() => { const x = [...document.querySelectorAll('button')].find(e => /ospite/i.test(e.textContent)); if (x) x.click(); });
    await w(g.p, 2000);
    const lg = await doc(g.p, 'fanta/lega-BT-M7AS');
    await g.ctx.close();
    const { ctx, p, errs } = await open(b); await login(p); await w(p, 2500);
    const user = await doc(p, 'users/a@b.it');
    await ctx.close();
    assert(Object.keys(lg.members).length === 1, 'l\'ospite non entra: ' + JSON.stringify(lg.members));
    assert(!(user.app2 && user.app2.autoLeagues || []).includes('BT-M7AS'), 'lega che non c\'è: non si segna come fatto (si riprova la volta dopo)');
    assert(!errs.length && !g.errs.length, errs.concat(g.errs).join(' | '));
  },
});
