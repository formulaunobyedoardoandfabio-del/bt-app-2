// Funzione su Vercel api/live.js (31/10): dati di OpenF1 in diretta con l'abbonamento, credenziali solo nelle variabili.
// Uso: node test/unit/live-api.test.js
const assert = require('assert');
const { createLive } = require('../../api/live');
let pass = 0, fail = 0;
const tests = [];
const t = (name, fn) => tests.push([name, fn]);

function fakeOpenF1({ badAuth = false } = {}) {
  const calls = [];
  const fetchImpl = async (url, opt = {}) => {
    calls.push({ url, auth: opt.headers && opt.headers.Authorization, body: opt.body });
    if (url.endsWith('/token')) return badAuth ? { ok: false, status: 401, json: async () => ({ detail: 'bad' }) } : { ok: true, status: 200, json: async () => ({ access_token: 'TOK', expires_in: '3600', token_type: 'bearer' }) };
    if (opt.headers.Authorization !== 'Bearer TOK') return { ok: false, status: 401, json: async () => ({ detail: 'no' }) };
    if (url.includes('/v1/laps')) return { ok: true, status: 200, json: async () => [{ lap_number: 1 }] };
    return { ok: false, status: 404, json: async () => ({ detail: 'No results found.' }) };
  };
  return { fetchImpl, calls };
}
function res() {
  const r = { headers: {}, code: 0, body: null };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  r.status = c => { r.code = c; return r; };
  r.json = b => { r.body = b; return r; };
  return r;
}
const ENV = { OPENF1_USERNAME: ' utente ', OPENF1_PASSWORD: 'segreta' };

t('dati in diretta: token con utente e password (senza spazi), poi la richiesta con il pass; 15 secondi in cache (limite 60 al minuto)', async () => {
  const f = fakeOpenF1(); let now = 1000;
  const h = createLive({ fetchImpl: f.fetchImpl, env: ENV, now: () => now });
  const r1 = res(); await h({ url: '/api/live?p=laps&session_key=9876' }, r1);
  assert.strictEqual(r1.code, 200); assert.deepStrictEqual(r1.body, [{ lap_number: 1 }]);
  assert.ok(f.calls[0].url.endsWith('/token') && /username=utente&password=segreta/.test(f.calls[0].body));
  assert.strictEqual(f.calls[1].url, 'https://api.openf1.org/v1/laps?session_key=9876');
  assert.ok(/s-maxage=15/.test(r1.headers['Cache-Control']), r1.headers['Cache-Control']);
  const r2 = res(); now += 14000; await h({ url: '/api/live?p=laps&session_key=9876' }, r2);
  assert.strictEqual(f.calls.length, 2, 'entro 15 secondi dalla memoria');
  const r3 = res(); now += 2000; await h({ url: '/api/live?p=laps&session_key=9876' }, r3);
  assert.strictEqual(f.calls.length, 3, 'dopo 15 secondi si richiede (stesso pass)');
});
t('check: dice se le credenziali vanno, senza mostrarle; senza variabili lo dice', async () => {
  const ok = res(); await createLive({ fetchImpl: fakeOpenF1().fetchImpl, env: ENV })({ url: '/api/live?check=1' }, ok);
  assert.deepStrictEqual(ok.body, { ok: true });
  const bad = res(); await createLive({ fetchImpl: fakeOpenF1({ badAuth: true }).fetchImpl, env: ENV })({ url: '/api/live?check=1' }, bad);
  assert.strictEqual(bad.body.ok, false); assert.ok(/non accetta/.test(bad.body.reason));
  assert.ok(!JSON.stringify(bad.body).includes('segreta'));
  const none = res(); await createLive({ fetchImpl: fakeOpenF1().fetchImpl, env: {} })({ url: '/api/live?check=1' }, none);
  assert.ok(/mancano/.test(none.body.reason));
});
t('richieste strane rifiutate: endpoint non in elenco, parametri sporchi', async () => {
  const h = createLive({ fetchImpl: fakeOpenF1().fetchImpl, env: ENV });
  for (const url of ['/api/live?p=token&x=1', '/api/live?p=laps', '/api/live?p=laps&session_key=1;drop', '/api/live?p=../token&session_key=1']) {
    const r = res(); await h({ url }, r); assert.strictEqual(r.code, 400, url);
  }
  const r = res(); await h({ url: '/api/live?p=car_data&session_key=9&driver_number=63&date%3E=2026-10-31T10:00:00' }, r);
  assert.notStrictEqual(r.code, 400, 'i filtri per data di car_data passano');
});

(async () => {
  for (const [name, fn] of tests) {
    try { await fn(); pass++; console.log('PASS  ' + name); } catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); }
  }
  console.log(`\n${pass} passati, ${fail} falliti`);
  process.exit(fail ? 1 : 0);
})();
