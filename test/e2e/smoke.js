// Prova di fumo: la nuova app si apre nel browser senza errori.
// Uso: node test/build-test.js && node test/e2e/smoke.js
const { open, text, assert, run } = require('./helpers');

run({
  async 'si apre la schermata di accesso'(b) {
    const { ctx, p, errs } = await open(b);
    const t = await text(p); await ctx.close();
    assert(/ACCEDI/.test(t), 'manca il tasto ACCEDI');
    assert(!errs.length, 'errori JS: ' + errs.join(' | '));
  },
});
