// Notifica vera di metà gara (8/11, Edoardo alle 11:36: "intendo proprio come notifica vera che si vede nel centro
// notifiche del telefono"): se l'app è aperta o in sottofondo quando la gara arriva a metà, notifica del telefono coi
// dati veri (giro, primi tre, distacchi). Ad app chiusa resta quella generica a +50' (test/unit/halfway.test.js).
// Uso: node test/unit/half-notify.test.js
const assert = require('assert');
const H = require('../../src/logic/halfway');
const R = require('../../src/services/reminders');
let pass = 0, fail = 0;
const jobs = [];
const t = (name, fn) => jobs.push(Promise.resolve().then(fn).then(() => { pass++; console.log('PASS  ' + name); }, e => { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); }));

const TOP = [{ id: 12, code: 'ANT', pos: 1, gap: null }, { id: 63, code: 'RUS', pos: 2, gap: '+2,3 s' }, { id: 16, code: 'LEC', pos: 3, gap: '+5,1 s' }];

t('testo della notifica: giro di metà gara, nome del GP, primi tre coi distacchi', () => {
  const n = H.halfwayNotice({ raceName: "GP dell'Azerbaigian", lap: 26, total: 51, top: TOP });
  assert.strictEqual(n.title, 'Metà gara · Giro 26/51');
  assert.strictEqual(n.body, "GP dell'Azerbaigian: ANT davanti a RUS (+2,3 s) e LEC (+5,1 s)");
  const noName = H.halfwayNotice({ lap: 26, total: 51, top: TOP });
  assert.strictEqual(noName.body, 'ANT davanti a RUS (+2,3 s) e LEC (+5,1 s)');
  assert.strictEqual(H.halfwayNotice({ lap: 26, total: 51, top: [] }), null, 'senza classifica niente notifica');
});

const fake = display => {
  const log = { asked: 0, scheduled: [] };
  return { log, plugin: { checkPermissions: async () => ({ display }), requestPermissions: async () => { log.asked++; return { display: 'granted' }; }, schedule: async o => { log.scheduled.push(...o.notifications); } } };
};

t('notifyNow: col permesso la notifica parte subito (id 121, diverso da quella programmata)', async () => {
  const { log, plugin } = fake('granted');
  const before = Date.now();
  const ok = await R.notifyNow(plugin, { id: R.ID.halfLive, title: 'Metà gara · Giro 26/51', body: 'x' });
  assert.strictEqual(ok, true);
  assert.strictEqual(R.ID.halfLive, 121);
  assert.strictEqual(log.scheduled.length, 1);
  const n = log.scheduled[0];
  assert.strictEqual(n.id, 121);
  assert.ok(+n.schedule.at >= before && +n.schedule.at <= Date.now() + 2000, 'subito: ' + n.schedule.at);
});

t('notifyNow: senza permesso non chiede niente a metà gara e non manda niente', async () => {
  const { log, plugin } = fake('prompt');
  const ok = await R.notifyNow(plugin, { id: R.ID.halfLive, title: 't', body: 'b' });
  assert.strictEqual(ok, false);
  assert.strictEqual(log.asked, 0);
  assert.strictEqual(log.scheduled.length, 0);
  assert.strictEqual(await R.notifyNow(null, { id: 121, title: 't', body: 'b' }), false, 'senza plugin (sito)');
});

t('dopo la notifica vera la generica non si riprogramma: plan con startSeen non la mette', () => {
  const race = { id: 'r15', name: "GP dell'Azerbaigian", date: '2026-09-26T11:00:00Z' };
  const at = Date.parse(race.date);
  const list = R.plan({ now: at - 3600e3, race, sessions: [{ type: 'RACE', start: at }], prefs: {}, decks: 0, startSeen: true });
  assert.ok(!list.some(x => x.id === R.ID.half), JSON.stringify(list.map(x => x.id)));
});

Promise.all(jobs).then(() => { console.log(`\n${pass} passati, ${fail} falliti`); process.exit(fail ? 1 : 0); });
