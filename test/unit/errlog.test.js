// 15/11: registro degli errori del telefono (codice 06 del terminale), src/services/errlog.js
// Uso: node test/unit/errlog.test.js
const assert = require('assert');
const { createErrLog, install, KEY } = require('../../src/services/errlog');
let pass = 0, fail = 0;
const tests = [];
const t = (name, fn) => tests.push([name, fn]);
const mem = () => { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, m }; };

t('si segnano gli errori, ripetuti di seguito si contano, al massimo 40, restano sul telefono', () => {
  const st = mem();
  const L = createErrLog({ storage: st, now: () => 5 });
  L.add('rete', 503, '/api/live'); L.add('rete', 503, '/api/live');
  L.add('firestore', Object.assign(new Error('permesso negato'), { code: 'permission-denied' }));
  assert.deepStrictEqual(L.list(), [{ kind: 'rete', msg: '503 /api/live', at: 5, n: 2 }, { kind: 'firestore', msg: 'permission-denied: permesso negato', at: 5, n: 1 }]);
  for (let i = 0; i < 50; i++) L.add('console', 'errore ' + i);
  assert.strictEqual(L.list().length, 40);
  assert.strictEqual(createErrLog({ storage: st }).list().length, 40, 'riaprendo l\'app la lista c\'è ancora');
  assert.ok(st.m[KEY]);
  L.clear(); assert.deepStrictEqual(L.list(), []);
});

t('install: console.error, errori non presi e fetch fallite finiscono nella lista; la console scrive lo stesso', async () => {
  const seen = [], handlers = {};
  const w = {
    console: { error: (...a) => seen.push(a.join(' ')) },
    addEventListener: (k, h) => { handlers[k] = h; },
    fetch: url => (/rotto/.test(url) ? Promise.reject(new Error('Failed to fetch')) : Promise.resolve({ status: /server/.test(url) ? 502 : 404 })),
  };
  const L = createErrLog();
  install(w, L); install(w, L);   // la seconda volta non fa niente
  w.console.error('qualcosa', 'non va');
  handlers.error({ message: 'x is not defined' });
  handlers.unhandledrejection({ reason: new Error('rifiutata') });
  await w.fetch('https://api.openf1.org/v1/laps?x=1');   // 404 normale: non si segna
  await w.fetch('https://bt.app/api/server?k=1');
  await w.fetch('https://bt.app/rotto').catch(() => {});
  assert.deepStrictEqual(seen, ['qualcosa non va']);
  assert.deepStrictEqual(L.list().map(x => [x.kind, x.msg]), [['console', 'qualcosa non va'], ['errore', 'x is not defined'], ['promessa', 'rifiutata'], ['rete', '502 https://bt.app/api/server'], ['rete', 'https://bt.app/rotto Failed to fetch']]);
});

(async () => {
  for (const [name, fn] of tests) {
    try { await fn(); pass++; console.log('PASS ', name); } catch (e) { fail++; console.log('FAIL ', name, '\n      →', e.message); }
  }
  console.log(`\n${pass} passati, ${fail} falliti`);
  process.exit(fail ? 1 : 0);
})();
