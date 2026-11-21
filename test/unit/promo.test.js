// Codici promo da 6 cifre (21/11, Edoardo): l'admin crea un codice per un account (email) e un numero di giorni, lo
// scrive su Firebase (shared/bt-promo); solo quell'account lo può usare, una volta: Funzioni Pro per quei giorni e il
// trofeo "Codice scritto". Nel documento (leggibile da tutti) l'email non c'è: c'è la sua impronta SHA-256.
// Uso: node test/unit/promo.test.js
const assert = require('assert');
const P = require('../../src/logic/promo');
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('PASS  ' + name); } catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); } };
const DAY = 864e5, NOW = Date.parse('2026-11-21T10:00:00Z');

t('sha256: valori di riferimento', () => {
  assert.strictEqual(P.sha256(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  assert.strictEqual(P.sha256('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.strictEqual(P.sha256('à€'), require('crypto').createHash('sha256').update('à€', 'utf8').digest('hex'), 'caratteri non ASCII come UTF-8');
  const long = 'x'.repeat(1000);
  assert.strictEqual(P.sha256(long), require('crypto').createHash('sha256').update(long).digest('hex'));
});
t('emailKey: minuscole e senza spazi, poi SHA-256; niente email: null', () => {
  assert.strictEqual(P.emailKey(' Mario.Rossi@Gmail.com '), P.sha256('mario.rossi@gmail.com'));
  assert.strictEqual(P.emailKey(''), null);
  assert.strictEqual(P.emailKey(null), null);
  assert.strictEqual(P.emailKey('senza-chiocciola'), null);
});
t('cleanPromo: solo codici di 6 cifre, impronta valida, giorni 1-365, niente doppioni, al massimo 300', () => {
  const k = P.emailKey('a@b.it');
  const out = P.cleanPromo({ codes: [
    { code: '274851', to: k, days: 7, at: NOW, extra: 'via' },
    { code: '274851', to: k, days: 3, at: NOW },
    { code: '12345', to: k, days: 7, at: NOW },
    { code: '123456', to: 'nonhex', days: 7, at: NOW },
    { code: '654321', to: k, days: 0, at: NOW },
    { code: '111111', to: k, days: 400, at: NOW },
    { code: '222222', to: k, days: 2.5, at: 'x' },
  ] });
  assert.deepStrictEqual(out, { codes: [{ code: '274851', to: k, days: 7, at: NOW }, { code: '111111', to: k, days: 365, at: NOW }, { code: '222222', to: k, days: 2, at: 0 }] });
  assert.deepStrictEqual(P.cleanPromo(null), { codes: [] });
  assert.deepStrictEqual(P.cleanPromo({ codes: 'no' }), { codes: [] });
  const many = Array.from({ length: 320 }, (_, i) => ({ code: String(100000 + i), to: k, days: 1, at: i }));
  assert.strictEqual(P.cleanPromo({ codes: many }).codes.length, 300);
  assert.strictEqual(P.cleanPromo({ codes: many }).codes[0].code, '100020', 'tiene i più recenti');
});
t('cleanUserPromo: until in ms, codici usati (6 cifre, senza doppioni, al massimo 50)', () => {
  assert.deepStrictEqual(P.cleanUserPromo(null), { until: 0, used: [] });
  assert.deepStrictEqual(P.cleanUserPromo({ until: NOW, used: ['274851', '274851', 'x', 5] }), { until: NOW, used: ['274851'] });
  assert.deepStrictEqual(P.cleanUserPromo({ until: -3, used: 'no' }), { until: 0, used: [] });
});
t('redeem: il codice giusto dell\'account giusto dà le Funzioni Pro per quei giorni', () => {
  const promo = { codes: [{ code: '274851', to: P.emailKey('a@b.it'), days: 7, at: NOW - DAY }] };
  const r = P.redeem({ promo, code: '274851', email: 'A@B.it', mine: null, now: NOW });
  assert.deepStrictEqual(r, { ok: true, code: '274851', days: 7, until: NOW + 7 * DAY, mine: { until: NOW + 7 * DAY, used: ['274851'] } });
});
t('redeem: con giorni già attivi si aggiungono in fondo', () => {
  const promo = { codes: [{ code: '274851', to: P.emailKey('a@b.it'), days: 7, at: NOW }] };
  const r = P.redeem({ promo, code: '274851', email: 'a@b.it', mine: { until: NOW + 3 * DAY, used: ['111111'] }, now: NOW });
  assert.strictEqual(r.until, NOW + 10 * DAY);
  assert.deepStrictEqual(r.mine.used, ['111111', '274851']);
});
t('redeem: i no, con il motivo', () => {
  const promo = { codes: [{ code: '274851', to: P.emailKey('a@b.it'), days: 7, at: NOW }] };
  assert.deepStrictEqual(P.redeem({ promo, code: '27485', email: 'a@b.it', now: NOW }), { ok: false, why: 'formato' });
  assert.deepStrictEqual(P.redeem({ promo, code: '999999', email: 'a@b.it', now: NOW }), { ok: false, why: 'nessuno' });
  assert.deepStrictEqual(P.redeem({ promo, code: '274851', email: 'c@d.it', now: NOW }), { ok: false, why: 'altro' });
  assert.deepStrictEqual(P.redeem({ promo, code: '274851', email: '', now: NOW }), { ok: false, why: 'ospite' });
  assert.deepStrictEqual(P.redeem({ promo, code: '274851', email: 'a@b.it', mine: { until: 0, used: ['274851'] }, now: NOW }), { ok: false, why: 'usato' });
  assert.deepStrictEqual(P.redeem({ promo: null, code: '274851', email: 'a@b.it', now: NOW }), { ok: false, why: 'nessuno' });
});
t('proActive: vale fino a until escluso', () => {
  assert.strictEqual(P.proActive({ until: NOW + 1 }, NOW), true);
  assert.strictEqual(P.proActive({ until: NOW }, NOW), false);
  assert.strictEqual(P.proActive(null, NOW), false);
});
t('newCode: 6 cifre, mai uno che c\'è già, rand → codice', () => {
  assert.strictEqual(P.newCode(() => 0, []), '100000', 'non comincia con 0 (si legge e si detta meglio)');
  assert.strictEqual(P.newCode(() => 0.999999, []), '999999');
  let i = 0; const seq = [0, 0, 0.5];
  assert.strictEqual(P.newCode(() => seq[i++], ['100000']), '550000', 'quello preso si salta');
  for (let k = 0; k < 200; k++) assert.ok(P.CODE_RE.test(P.newCode(Math.random, [])));
});
t('addCode e dropCode: il documento come lo scrive l\'admin', () => {
  const doc0 = { codes: [] };
  const doc1 = P.addCode(doc0, { code: '274851', email: 'Mario@Rossi.it', days: 14, at: NOW });
  assert.deepStrictEqual(doc1, { codes: [{ code: '274851', to: P.emailKey('mario@rossi.it'), days: 14, at: NOW }] });
  assert.throws(() => P.addCode(doc1, { code: '274851', email: 'x@y.it', days: 3, at: NOW }), /già/);
  assert.throws(() => P.addCode(doc1, { code: '1234', email: 'x@y.it', days: 3, at: NOW }), /6 cifre/);
  assert.throws(() => P.addCode(doc1, { code: '123456', email: 'xy', days: 3, at: NOW }), /email/);
  assert.throws(() => P.addCode(doc1, { code: '123456', email: 'x@y.it', days: 0, at: NOW }), /giorni/);
  assert.deepStrictEqual(P.dropCode(doc1, '274851'), { codes: [] });
  assert.deepStrictEqual(P.dropCode(doc1, '000000'), doc1);
});

console.log(`\n${pass} passate, ${fail} fallite`);
process.exit(fail ? 1 : 0);
