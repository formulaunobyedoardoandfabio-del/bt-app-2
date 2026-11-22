// Solo foto (niente prove): la pagina Recensioni coi 4 rulli 3D e la pagina Scrivi, per guardarle a occhio.
// Uso: node test/build-test.js && node test/e2e/shot-recensioni.js
const path = require('path');
const fs = require('fs');
const { open, w, tapSel, tapText, login, run } = require('./helpers');

const SHOTS = path.join(__dirname, '..', 'logs', 'run137');
fs.mkdirSync(SHOTS, { recursive: true });
const fb = (id, o) => ({ ['shared/bt-feedback-' + id]: { id, stars: 5, category: 'complimento', msg: 'Recensione vera numero ' + id + ': il Fanta con gli amici è la parte migliore', user: 't' + id + '@mail.it', date: '2026-11-1' + id + 'T10:00:00.000Z', appVersion: '2.0.0', public: true, name: ['Giulia', 'Marco', 'Luca', 'Sara', 'Paolo'][id - 1], ...o } });
const SEED = { addDocs: { ...fb(1), ...fb(2, { stars: 4 }), ...fb(3), ...fb(4, { stars: 4 }), ...fb(5) } };

run({
  async 'foto: Scrivi e Recensioni'(b) {
    const { ctx, p } = await open(b, { seed: SEED });
    await login(p); await tapSel(p, '[aria-label="Profilo"]'); await w(p, 600);
    await tapText(p, 'Invia feedback'); await w(p, 900);
    await p.screenshot({ path: path.join(SHOTS, 'feedback-idea-390.png') });
    await tapSel(p, '[data-feedback-cat="complimento"]'); await w(p, 300);
    await p.screenshot({ path: path.join(SHOTS, 'feedback-complimento-390.png') });
    await tapSel(p, '[data-fb-open-reviews]'); await w(p, 1500);
    await p.screenshot({ path: path.join(SHOTS, 'feedback-recensioni-390.png') });
    await ctx.close();
  },
});
