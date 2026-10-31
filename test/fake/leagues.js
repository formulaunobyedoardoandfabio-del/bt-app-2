// Leghe FantaF1 vere per le prove (31/10): documento fanta/lega-<CODICE> e i codici delle leghe nell'account di prova.
// members: [{ name, team, bonus }] oltre a Tester (l'utente delle prove, a@b.it).
const { authorId } = require('../../src/services/compat');
const ME = authorId('a@b.it');
function leagueSeed({ code = 'BT-TEST', name = 'Amici del Bar', owner = ME, members = [], meIn = true, myCodes = [code], meBonus = 0 } = {}) {
  const ms = Object.fromEntries(members.map((m, i) => ['u' + i, { name: m.name, team: m.team || 'Squadra ' + (i + 1), log: [], bonus: m.bonus || 0 }]));
  if (meIn) ms[ME] = { name: 'Tester', team: 'Scuderia B&T', log: [], bonus: meBonus };
  return {
    ['fanta/lega-' + code]: { name, owner, created: 1, members: ms },
    'users/a@b.it': { name: 'Tester', nick: 'Tester', email: 'a@b.it', about: { birth: null, follow: 2, fan: 'vivo' }, app2: { leagues: myCodes } },
  };
}
module.exports = { leagueSeed, ME };
