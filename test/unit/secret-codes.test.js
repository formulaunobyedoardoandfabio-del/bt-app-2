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

// 14/11 (Edoardo): "01" fa vedere il video di presentazione dell'app, "02" fa partire il giro guidato. Sono azioni:
// non si accendono e non contano negli sblocchi.
t('azioni: 01 video, 02 giro guidato; non sono sblocchi e il firewall vale anche per loro', () => {
  assert.deepStrictEqual(S.check('01', { adminCode: ADMIN }), { kind: 'action', id: 'video' });
  assert.deepStrictEqual(S.check(' 0 2 ', { adminCode: ADMIN }), { kind: 'action', id: 'tour' });
  // 15/11: "03" fa partire la gara demo dal 5° giro a 30x
  assert.deepStrictEqual(S.check('03', { adminCode: ADMIN }), { kind: 'action', id: 'demo' });
  assert.ok(S.ACTIONS.every(x => x.title && x.say), 'ogni azione dice cosa fa');
  assert.ok(!S.UNLOCKS.some(u => S.ACTIONS.some(x => x.code === u.code || x.id === u.id)), 'codici e id diversi dagli sblocchi');
  assert.deepStrictEqual(S.clean(['video', 'tour', 'retro']), ['retro'], 'le azioni non si salvano come sblocchi');
  let st = S.freshGuard();
  for (let i = 0; i < 5; i++) st = S.afterTry(st, false, T0 + i);
  assert.strictEqual(S.check('01', { adminCode: ADMIN, guard: st, now: T0 + 10 }).kind, 'locked');
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

// 15/11 (Edoardo, lista dei codici): 04 pubblicazione rapida, 05 reset forzato, 06 errori, 07 prova notifiche,
// 08 interruttore d'emergenza. 04, 06 e 08 solo per l'admin (gli altri dicono che il codice è riservato).
t('codici 04-08: azioni giuste; 04, 06 e 08 riservati all\'admin', () => {
  const opts = isAdmin => ({ adminCode: ADMIN, isAdmin });
  assert.deepStrictEqual(['04', '05', '06', '07', '08'].map(c => S.check(c, opts(true))), ['publish', 'reset', 'errors', 'notify', 'emergency'].map(id => ({ kind: 'action', id })));
  assert.deepStrictEqual(S.check('04', opts(false)), { kind: 'admin-only', id: 'publish' });
  assert.deepStrictEqual(S.check('06', opts(false)), { kind: 'admin-only', id: 'errors' });
  assert.deepStrictEqual(S.check('08', opts(false)), { kind: 'admin-only', id: 'emergency' });
  assert.deepStrictEqual(S.check('05', opts(false)), { kind: 'action', id: 'reset' });
  assert.deepStrictEqual(S.check('07', opts(false)), { kind: 'action', id: 'notify' });
  assert.deepStrictEqual(S.ACTIONS.map(a => a.code), ['01', '02', '03', '04', '05', '06', '07', '08']);
  assert.ok(S.ACTIONS.every(a => a.title && a.desc), 'ogni codice ha titolo e descrizione per la lista dell\'admin');
});

// 15/11 (Edoardo): codici aggiunti dall'admin nel Pannello (shared/bt-terminal-codes): scrivono un messaggio e al massimo
// fanno una delle azioni che ci sono già (video, giro, gara demo). Non sbloccano niente.
t('codici dell\'admin: puliti (maiuscole, niente doppioni, niente codici di serie, campi accorciati)', () => {
  const out = S.cleanCustom([
    { code: ' monza 25 ', title: '  Monza  ', say: 'Il tempio della velocità', action: 'demo', at: 5 },
    { code: 'MONZA25', title: 'doppio', say: 'x' },
    { code: '01', title: 'come il video', say: 'x' },
    { code: 'pitwall', title: 'come Pit Swipe', say: 'x' },
    { code: 'A', title: 'troppo corto', say: 'x' },
    { code: 'IMOLA', title: '', say: 'senza titolo' },
    { code: 'SPA', title: 'Spa', say: 'y'.repeat(300), action: 'admin' },
    'rotto', null,
  ]);
  assert.deepStrictEqual(out, [
    { code: 'MONZA25', title: 'Monza', say: 'Il tempio della velocità', action: 'demo', at: 5 },
    { code: 'SPA', title: 'Spa', say: 'y'.repeat(200), action: '', at: 0 },
  ]);
  assert.deepStrictEqual(S.cleanCustom(null), []);
  assert.strictEqual(S.cleanCustom(Array.from({ length: 50 }, (_, k) => ({ code: 'C' + k, title: 'T' }))).length, S.CUSTOM_MAX);
});

t('codici dell\'admin: il terminale li riconosce; quelli di serie e il codice admin vincono', () => {
  const custom = [{ code: 'MONZA25', title: 'Monza', say: 'Il tempio della velocità', action: 'demo' }, { code: '000000', title: 'finto admin', say: 'x' }];
  assert.deepStrictEqual(S.check('monza 25', { adminCode: ADMIN, custom }), { kind: 'custom', code: 'MONZA25', title: 'Monza', say: 'Il tempio della velocità', action: 'demo' });
  assert.deepStrictEqual(S.check('000000', { adminCode: ADMIN, isAdmin: false, custom }), { kind: 'denied' }, 'mai un modo per scoprire il codice admin');
  assert.deepStrictEqual(S.check('01', { adminCode: ADMIN, custom: [{ code: '01', title: 'x', say: 'y' }] }), { kind: 'action', id: 'video' });
  assert.deepStrictEqual(S.check('NIENTE', { adminCode: ADMIN, custom }), { kind: 'denied' });
});

t('codici dell\'admin: perché un codice non si può usare', () => {
  assert.strictEqual(S.takenWhy('01', { adminCode: ADMIN }), 'serie');
  assert.strictEqual(S.takenWhy('pit wall', { adminCode: ADMIN }), 'serie');
  assert.strictEqual(S.takenWhy('000000', { adminCode: ADMIN }), 'serie', 'il codice admin sembra un codice di serie qualsiasi');
  assert.strictEqual(S.takenWhy('MONZA', { adminCode: ADMIN, custom: [{ code: 'MONZA', title: 'x' }] }), 'doppio');
  assert.strictEqual(S.takenWhy('a', { adminCode: ADMIN }), 'corto');
  assert.strictEqual(S.takenWhy('MONZA', { adminCode: ADMIN }), null);
});

console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
