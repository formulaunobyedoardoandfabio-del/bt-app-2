// Notifiche push dell'admin (13/11, Edoardo: "le notifiche che scrivo io nell'app non appaiono nella schermata di blocco").
// api/push.js non si fida di chi lo chiama: legge shared/bt-notifs (che su Firebase scrive solo l'admin) e manda col
// servizio di Google (FCM) solo le notifiche nuove, una volta sola. Uso: node test/unit/push-api.test.js
const assert = require('assert');
const { createPush, fresh, message, TOPIC } = require('../../api/push');
let pass = 0, fail = 0;
const jobs = [];
const t = (name, fn) => jobs.push(Promise.resolve().then(fn).then(() => { pass++; console.log('PASS  ' + name); }, e => { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); }));

const NOW = Date.parse('2026-11-13T20:00:00Z');
const iso = ms => new Date(ms).toISOString();
const N = (id, minAgo, title = 'Titolo ' + id) => ({ id, title, text: 'Testo ' + id, date: iso(NOW - minAgo * 60000), read: false });

t('fresh: solo le notifiche degli ultimi 15 minuti (non quelle col futuro), le 3 più nuove, la più vecchia prima', () => {
  const list = [N('a', 60), N('b', 14), N('c', 1), N('d', -30), { id: 'x' }, null, N('e', 2), N('f', 3), N('g', 4)];
  assert.deepStrictEqual(fresh(list, NOW).map(n => n.id), ['f', 'e', 'c']);
  assert.deepStrictEqual(fresh([N('a', 60), N('b', 14)], NOW).map(n => n.id), ['b']);
  assert.deepStrictEqual(fresh(null, NOW), []);
});

t('message: tema di tutti, titolo e testo, canale, icona e colore di B&T', () => {
  const m = message(N('a', 1, 'Qualifiche tra un\'ora'));
  assert.strictEqual(m.message.topic, TOPIC);
  assert.deepStrictEqual(m.message.notification, { title: 'Qualifiche tra un\'ora', body: 'Testo a' });
  assert.strictEqual(m.message.android.priority, 'HIGH');
  assert.deepStrictEqual(m.message.android.notification, { channel_id: 'bt-novita', icon: 'ic_stat_bt', color: '#FF1801' });
  assert.strictEqual(m.message.data.id, 'a');
});

// Google finto: registra le chiamate; pushlog già presi in "taken".
const fakeGoogle = ({ list = [], taken = [], fcmOk = true } = {}) => {
  const log = { claims: [], sent: [], released: [] };
  return { log, G: {
    project: () => 'bt-demo',
    getShared: async k => { assert.strictEqual(k, 'bt-notifs'); return list; },
    claim: async (id, data) => { if (taken.includes(id)) return false; taken.push(id); log.claims.push({ id, data }); return true; },
    release: async id => { log.released.push(id); },
    fcm: async m => { log.sent.push(m); return fcmOk ? { ok: true } : { ok: false, status: 403 }; },
  } };
};
const call = async (handler, method = 'POST') => {
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b ? JSON.parse(b) : null; } };
  await handler({ method, headers: {} }, res);
  return res;
};

t('POST: manda la notifica nuova una volta sola (la seconda chiamata non rimanda)', async () => {
  const { G, log } = fakeGoogle({ list: [N('old', 90), N('n1', 2)] });
  const h = createPush({ google: G, now: () => NOW, env: { FIREBASE_SERVICE_ACCOUNT: '{}' } });
  const r1 = await call(h), r2 = await call(h);
  assert.deepStrictEqual(r1.body, { ok: true, sent: 1, skipped: 0 });
  assert.deepStrictEqual(r2.body, { ok: true, sent: 0, skipped: 1 });
  assert.strictEqual(log.sent.length, 1);
  assert.strictEqual(log.sent[0].message.notification.title, 'Titolo n1');
  assert.strictEqual(r1.headers['Access-Control-Allow-Origin'], '*');
});

t('niente di nuovo: non manda niente; chi chiama non può far mandare un testo suo', async () => {
  const { G, log } = fakeGoogle({ list: [N('old', 90)] });
  const r = await call(createPush({ google: G, now: () => NOW, env: { FIREBASE_SERVICE_ACCOUNT: '{}' } }));
  assert.deepStrictEqual(r.body, { ok: true, sent: 0, skipped: 0 });
  assert.strictEqual(log.sent.length, 0);
});

t('Google rifiuta l\'invio: la prenotazione si libera (si può riprovare) e l\'errore si vede', async () => {
  const { G, log } = fakeGoogle({ list: [N('n1', 1)], fcmOk: false });
  const r = await call(createPush({ google: G, now: () => NOW, env: { FIREBASE_SERVICE_ACCOUNT: '{}' } }));
  assert.strictEqual(r.statusCode, 502);
  assert.deepStrictEqual(r.body, { ok: false, reason: 'fcm', status: 403 });
  assert.deepStrictEqual(log.released, ['n1']);
});

t('senza l\'account di servizio su Vercel: 503 "config"; GET non ammesso; OPTIONS risponde per il telefono', async () => {
  const { G } = fakeGoogle();
  const noCfg = await call(createPush({ google: null, now: () => NOW, env: {} }));
  assert.strictEqual(noCfg.statusCode, 503);
  assert.strictEqual(noCfg.body.reason, 'config');
  const h = createPush({ google: G, now: () => NOW, env: { FIREBASE_SERVICE_ACCOUNT: '{}' } });
  assert.strictEqual((await call(h, 'GET')).statusCode, 405);
  assert.strictEqual((await call(h, 'OPTIONS')).statusCode, 204);
});

Promise.all(jobs).then(() => { console.log(`\n${pass} passati, ${fail} falliti`); process.exit(fail ? 1 : 0); });
