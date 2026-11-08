// Previsioni automatiche (8/11, Edoardo: "rendi automatico tutto"): domande del weekend fatte da sole e risposte prese
// dai risultati veri (Jolpica, già letti dal FantaF1). Uso: node test/unit/auto-predictions.test.js
const assert = require('assert');
const A = require('../../src/logic/auto-predictions');
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('PASS  ' + name); } catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); } };

const LV = { id: 'r21', round: 21, name: 'GP di Las Vegas', circuitId: 'us-2023' };
const CN = { id: 'r2', round: 2, name: 'GP della Cina', circuitId: 'cn-2004' };
const ROUND21 = {
  round: 21,
  quali: { order: [{ id: 'russell', pos: 1 }, { id: 'antonelli', pos: 2 }] },
  race: { order: [{ id: 'antonelli', pos: 1, dnf: false }, { id: 'russell', pos: 2, dnf: false }, { id: 'hamilton', pos: null, dnf: true }, { id: 'stroll', pos: null, dnf: true }], fastest: 'russell' },
  sprint: null,
};

t('domande di un weekend classico: pole, vincitore, scuderia, giro veloce, ritiri (id fissi, sessione giusta)', () => {
  const qs = A.questionsFor(LV, { sprint: false });
  assert.deepStrictEqual(qs.map(q => q.id), ['auto:r21:pole', 'auto:r21:win', 'auto:r21:team', 'auto:r21:fast', 'auto:r21:dnf']);
  assert.deepStrictEqual(qs.map(q => q.kind), ['driver', 'driver', 'team', 'driver', 'number']);
  assert.deepStrictEqual(qs.map(q => q.about), ['QUALI', 'RACE', 'RACE', 'RACE', 'RACE']);
  assert.ok(qs.every(q => q.raceId === 'r21' && q.auto === true && q.answer == null && /GP di Las Vegas/.test(q.q)), JSON.stringify(qs[0]));
  assert.strictEqual(qs[0].q, 'Chi fa la pole al GP di Las Vegas?');
});

t('weekend Sprint: c\'è anche chi vince la Sprint', () => {
  const qs = A.questionsFor(CN, { sprint: true });
  const sp = qs.find(q => q.id === 'auto:r2:sprint');
  assert.ok(sp && sp.about === 'SPRINT' && sp.kind === 'driver', JSON.stringify(qs.map(q => q.id)));
});

t('risposte dai risultati veri: pole, vincitore e sua scuderia, giro veloce, quanti non classificati', () => {
  const qs = A.withAnswers(A.questionsFor(LV, { sprint: false }), [ROUND21], { teamOf: id => ({ antonelli: 'mercedes', russell: 'mercedes' })[id] || null });
  const ans = Object.fromEntries(qs.map(q => [q.id.split(':')[2], q.answer]));
  assert.deepStrictEqual(ans, { pole: 'russell', win: 'antonelli', team: 'mercedes', fast: 'russell', dnf: 2 });
});

t('risultati che mancano: la domanda resta senza risposta (niente risposte inventate)', () => {
  const half = { round: 21, quali: ROUND21.quali, race: null, sprint: null };
  const qs = A.withAnswers(A.questionsFor(LV, { sprint: false }), [half], { teamOf: () => 'mercedes' });
  assert.strictEqual(qs.find(q => q.id === 'auto:r21:pole').answer, 'russell');
  assert.ok(qs.filter(q => q.about === 'RACE').every(q => q.answer == null));
  const none = A.withAnswers(A.questionsFor(LV, { sprint: false }), [], {});
  assert.ok(none.every(q => q.answer == null));
  const noFast = A.withAnswers(A.questionsFor(LV, { sprint: false }), [{ ...ROUND21, race: { ...ROUND21.race, fastest: null } }], { teamOf: () => 'mercedes' });
  assert.strictEqual(noFast.find(q => q.id === 'auto:r21:fast').answer, null);
});

t('quali gare: quella del weekend e quelle a cui ho già risposto (per non perdere i punti)', () => {
  const races = [CN, LV, { id: 'r22', round: 22, name: 'GP del Qatar', circuitId: 'qa-2004' }];
  const ids = A.racesToAsk(races, { current: LV, answered: { 'auto:r2:win': 'x', 'p123': 'y', 'auto:r99:win': 'z' } }).map(r => r.id);
  assert.deepStrictEqual(ids, ['r2', 'r21']);
  assert.deepStrictEqual(A.racesToAsk(races, { current: null, answered: {} }), []);
});

t('id delle domande automatiche riconoscibili', () => {
  assert.strictEqual(A.isAuto('auto:r21:win'), true);
  assert.strictEqual(A.isAuto('p1700000'), false);
});

console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
