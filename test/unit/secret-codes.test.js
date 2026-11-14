// 14/11 (Edoardo): il bottone ADMIN lo vedono tutti e apre un terminale "da hacker". Il codice admin apre il pannello
// (solo a un account admin), altri codici sbloccano cose diverse. Il codice admin non sta in questo file: lo passa l'app.
// Uso: node test/unit/secret-codes.test.js
const assert = require('assert');
const S = require('../../src/logic/secret-codes');
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('PASS  ' + name); } catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); } };

const ADMIN = '000000';   // per la prova: quello vero lo passa l'app
const T0 = Date.parse('2026-11-14T21:00:00Z');

t('norm: maiuscole, senza spazi e simboli', () => {
  assert.strictEqual(S.norm('  pit wall! '), 'PITWALL');
  assert.strictEqual(S.norm(null), '');
});

t('codice admin su un account admin → pannello', () => {
  assert.deepStrictEqual(S.check('000000', { adminCode: ADMIN, isAdmin: true }), { kind: 'admin' });
});

t('codice admin su un account NON admin → identico a un codice sbagliato (non si scopre che era giusto)', () => {
  const right = S.check('000000', { adminCode: ADMIN, isAdmin: false });
  const wrong = S.check('123456', { adminCode: ADMIN, isAdmin: false });
  assert.deepStrictEqual(right, { kind: 'denied' });
  assert.deepStrictEqual(right, wrong);
});

t('codici degli sblocchi: ognuno dà il suo; codice vuoto → niente', () => {
  const ids = S.UNLOCKS.map(u => S.check(u.code.toLowerCase(), { adminCode: ADMIN, isAdmin: false }));
  assert.deepStrictEqual(ids.map(x => x.kind), S.UNLOCKS.map(() => 'unlock'));
  assert.deepStrictEqual(ids.map(x => x.id), S.UNLOCKS.map(u => u.id));
  assert.ok(S.UNLOCKS.length >= 3);
  assert.ok(S.UNLOCKS.every(u => u.code !== ADMIN && /^[A-Z0-9]{4,12}$/.test(u.code) && u.title && u.on && u.off));
  assert.deepStrictEqual(S.check('   ', { adminCode: ADMIN, isAdmin: true }), { kind: 'empty' });
});

t('toggle: lo stesso codice accende e spegne; load tiene solo sblocchi che esistono', () => {
  let list = S.toggle([], 'pitswipe');
  assert.deepStrictEqual(list, ['pitswipe']);
  list = S.toggle(list, 'retro');
  assert.deepStrictEqual(list, ['pitswipe', 'retro']);
  assert.deepStrictEqual(S.toggle(list, 'pitswipe'), ['retro']);
  assert.deepStrictEqual(S.clean(['retro', 'boh', 'retro', 5]), ['retro']);
  assert.deepStrictEqual(S.clean(null), []);
});

t('firewall: 5 codici sbagliati di fila → 30 secondi chiuso, anche il codice giusto non passa; poi si riapre', () => {
  let st = S.freshGuard();
  for (let i = 0; i < 4; i++) st = S.afterTry(st, false, T0 + i * 1000);
  assert.strictEqual(S.lockedFor(st, T0 + 4000), 0, 'dopo 4 sbagliati si può ancora provare');
  st = S.afterTry(st, false, T0 + 4500);
  assert.strictEqual(S.lockedFor(st, T0 + 5000), 29500, 'dopo 5: chiuso per 30 secondi');
  assert.deepStrictEqual(S.check('000000', { adminCode: ADMIN, isAdmin: true, guard: st, now: T0 + 6000 }), { kind: 'locked', ms: 28500 });
  assert.deepStrictEqual(S.check('000000', { adminCode: ADMIN, isAdmin: true, guard: st, now: T0 + 35000 }), { kind: 'admin' });
  assert.strictEqual(S.afterTry(st, false, T0 + 35000).fails, 1, 'riaperto: si riparte da uno');
  assert.strictEqual(S.afterTry(S.afterTry(S.freshGuard(), false, T0), true, T0 + 1).fails, 0, 'un codice giusto azzera');
  assert.deepStrictEqual(S.cleanGuard({ fails: 'x', until: null }), S.freshGuard(), 'stato rovinato → da capo');
});

console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
