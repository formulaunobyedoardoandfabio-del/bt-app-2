// Tappa 3, Task 2 (G03): suoni (Web Audio, creati dal telefono) e vibrazioni (Haptics nell'APK, navigator.vibrate nel
// browser), con gli interruttori "Suoni" e "Vibrazioni" nel Profilo, accesi di serie.
// Uso: node test/build-test.js && node test/e2e/run51-suoni.js [filtro]
const { open, w, tapSel, login, assert, run } = require('./helpers');

const switches = p => p.evaluate(() => Object.fromEntries(['Suoni', 'Vibrazioni'].map(n => {
  const e = document.querySelector(`[role="switch"][aria-label="${n}"]`);
  return [n, e ? e.getAttribute('aria-checked') : null];
})));
const openProfile = async p => { await tapSel(p, '[aria-label="Profilo"]'); await w(p, 400); };

run({
  async 'Profilo: interruttori Suoni e Vibrazioni accesi di serie, si spengono e restano spenti dopo il riavvio'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await openProfile(p);
    const before = await switches(p);
    await tapSel(p, '[role="switch"][aria-label="Suoni"]'); await w(p, 200);
    await tapSel(p, '[role="switch"][aria-label="Vibrazioni"]'); await w(p, 1500);   // i dati dell'account si salvano dopo 800 ms
    const mid = await switches(p);
    const user = await p.evaluate(() => window.firebase.__fake.doc('users/a@b.it'));
    await p.reload(); await w(p, 600);
    await p.waitForFunction(() => !document.querySelector('[data-splash]'), null, { timeout: 8000 }).catch(() => {});
    await w(p, 600);
    await openProfile(p);
    const after = await switches(p);
    const stored = await p.evaluate(() => [localStorage.getItem('bt_bt-sounds'), localStorage.getItem('bt_bt-haptics')]);
    await ctx.close();
    assert(before.Suoni === 'true' && before.Vibrazioni === 'true', 'di serie: ' + JSON.stringify(before));
    assert(mid.Suoni === 'false' && mid.Vibrazioni === 'false', 'dopo il tocco: ' + JSON.stringify(mid));
    assert(user && user.app2 && user.app2.sounds === false && user.app2.haptics === false, 'nell\'account: ' + JSON.stringify(user && user.app2));
    assert(after.Suoni === 'false' && after.Vibrazioni === 'false', 'dopo il riavvio: ' + JSON.stringify(after));
    assert(stored[0] === 'false' && stored[1] === 'false', 'sul telefono: ' + JSON.stringify(stored));
    assert(!errs.length, errs.join(' | '));
  },

  async "l'audio parte solo dopo il primo tocco dell'app"(b) {
    const { ctx, p, errs } = await open(b);
    const before = await p.evaluate(() => !!(window.__btFx && window.__btFx.ready()));
    await p.tap('#authEmail'); await w(p, 300);
    const after = await p.evaluate(() => !!(window.__btFx && window.__btFx.ready()));
    await ctx.close();
    assert(before === false, 'l\'audio è partito prima di un tocco');
    assert(after === true, 'dopo il primo tocco l\'audio non è pronto');
    assert(!errs.length, errs.join(' | '));
  },
});
