// Notifiche push sul telefono (13/11): iscrizione al tema "novita" col plugin FirebaseMessaging, canale "Novità da B&T",
// e l'avviso al server dopo che l'admin ha scritto una notifica. Uso: node test/unit/push-client.test.js
const assert = require('assert');
const P = require('../../src/services/push');
let pass = 0, fail = 0;
const jobs = [];
const t = (name, fn) => jobs.push(Promise.resolve().then(fn).then(() => { pass++; console.log('PASS  ' + name); }, e => { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); }));

const fake = ({ failSub = false } = {}) => {
  const log = [];
  return { log, plugin: {
    createChannel: async c => { log.push(['channel', c.id, c.importance]); },
    subscribeToTopic: async o => { if (failSub) throw new Error('Default FirebaseApp is not initialized'); log.push(['sub', o.topic]); },
    unsubscribeFromTopic: async o => { log.push(['unsub', o.topic]); },
  } };
};

t('acceso: crea il canale (importanza alta) e si iscrive al tema; spento: si toglie', async () => {
  const a = fake();
  assert.deepStrictEqual(await P.sync(a.plugin, true), { ok: true, on: true });
  assert.deepStrictEqual(a.log, [['channel', 'bt-novita', 4], ['sub', 'novita']]);
  const b = fake();
  assert.deepStrictEqual(await P.sync(b.plugin, false), { ok: true, on: false });
  assert.deepStrictEqual(b.log, [['unsub', 'novita']]);
});

t('senza plugin (sito) o senza Firebase nell\'APK: nessun errore, dice perché', async () => {
  assert.deepStrictEqual(await P.sync(null, true), { ok: false, reason: 'no-plugin' });
  const r = await P.sync(fake({ failSub: true }).plugin, true);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, 'not-configured');
});

t('announce: POST a api/push senza testi (il server legge da Firebase); esito e motivo tornano all\'admin', async () => {
  const calls = [];
  const ok = await P.announce(async (url, o) => { calls.push([url, o.method, o.body]); return { ok: true, json: async () => ({ ok: true, sent: 1, skipped: 0 }) }; });
  assert.deepStrictEqual(ok, { ok: true, sent: 1, skipped: 0 });
  assert.deepStrictEqual(calls, [['https://bt-app-2.vercel.app/api/push', 'POST', undefined]]);
  const cfg = await P.announce(async () => ({ ok: false, status: 503, json: async () => ({ ok: false, reason: 'config' }) }));
  assert.deepStrictEqual(cfg, { ok: false, reason: 'config' });
  const net = await P.announce(async () => { throw new Error('rete'); });
  assert.deepStrictEqual(net, { ok: false, reason: 'network' });
  assert.ok(/Vercel/.test(P.MSG.config) && P.MSG.network && P.MSG.fcm);
});

Promise.all(jobs).then(() => { console.log(`\n${pass} passati, ${fail} falliti`); process.exit(fail ? 1 : 0); });
