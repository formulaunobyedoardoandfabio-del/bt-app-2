// Prova gratuita del Premium (8/11, Edoardo: nuovo design, "la prova finisce da sola"): 14 giorni gestiti dall'app,
// nessun addebito; la schermata Conferma promette un avviso al giorno 12. Uso: node test/unit/trial-reminder.test.js
const assert = require('assert');
const R = require('../../src/services/reminders');
let pass = 0, fail = 0;
const jobs = [];
const t = (name, fn) => jobs.push(Promise.resolve().then(fn).then(() => { pass++; console.log('PASS  ' + name); }, e => { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); }));

const DAY = 86400000;
const START = Date.parse('2026-11-08T10:00:00Z');
const END = START + 14 * DAY;   // 22/11 alle 11 di Roma

t('avviso della prova: 2 giorni prima della fine, alle 18 di Roma', () => {
  const list = R.plan({ now: START, prefs: {}, decks: 0, trialEnd: END });
  const tr = list.find(x => x.id === R.ID.trial);
  assert.ok(tr, JSON.stringify(list.map(x => x.id)));
  assert.strictEqual(tr.at, Date.parse('2026-11-20T17:00:00Z'), new Date(tr.at).toISOString());
  assert.ok(/prova/i.test(tr.title) && /2 giorni/.test(tr.title), tr.title);
  assert.ok(/da sola/.test(tr.body) && /addebit/.test(tr.body), tr.body);
});

t('avviso della prova: anche coi promemoria spenti (è la promessa della prova), mai se è già passato', () => {
  const off = R.plan({ now: START, prefs: { reminders: false }, decks: 0, trialEnd: END });
  assert.ok(off.some(x => x.id === R.ID.trial), 'promemoria spenti: l\'avviso della prova resta');
  const late = R.plan({ now: END - DAY, prefs: {}, decks: 0, trialEnd: END });
  assert.ok(!late.some(x => x.id === R.ID.trial), 'a un giorno dalla fine è tardi');
  const none = R.plan({ now: START, prefs: {}, decks: 0 });
  assert.ok(!none.some(x => x.id === R.ID.trial), 'senza prova niente');
});

t('apply: cancella anche l\'avviso della prova prima di rifare la lista', async () => {
  const seen = [];
  const plugin = { checkPermissions: async () => ({ display: 'granted' }), cancel: async a => { seen.push(...a.notifications.map(n => n.id)); }, schedule: async () => {} };
  await R.apply(plugin, []);
  assert.ok(seen.includes(R.ID.trial), JSON.stringify(seen));
});

Promise.all(jobs).then(() => { console.log(`\n${pass} passati, ${fail} falliti`); process.exit(fail ? 1 : 0); });
