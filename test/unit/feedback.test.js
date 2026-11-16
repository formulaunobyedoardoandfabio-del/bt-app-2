// Prove del modulo feedback (src/services/feedback.js), col Firebase finto: formato di oggi (A10) con appVersion 2.0.0
// e cancellazione dei feedback di chi elimina l'account.
// Uso: node test/unit/feedback.test.js [filtro]
const assert = require('assert');
const { setupWindow } = require('./node-window');
const F = require('../../src/services/firebase');
const { createFeedback, FEEDBACK_CATS, FEEDBACK_MSG } = require('../../src/services/feedback');

let pass = 0, fail = 0;
const tests = [];
const t = (name, fn) => tests.push([name, fn]);
const NOW = Date.parse('2026-10-07T10:00:00Z');
function ctx(docs = {}) {
  const { firebase } = setupWindow({ seed: { addDocs: docs } });
  const fb = createFeedback({ ...F, now: () => NOW });
  const feedbacks = () => Object.entries(firebase.__fake.docs()).filter(([k]) => k.startsWith('shared/bt-feedback-'));
  return { firebase, fake: firebase.__fake, fb, feedbacks };
}

t('invio: shared/bt-feedback-<id> = {id, stars, category, msg, user, date, appVersion "2.0.0"}', async () => {
  const c = ctx();
  const out = await c.fb.send({ stars: 4, category: 'bug', msg: '  La classifica si vede bene  ', email: 'a@b.it' });
  const all = c.feedbacks();
  assert.strictEqual(all.length, 1);
  const [path, d] = all[0];
  assert.strictEqual(path, 'shared/bt-feedback-' + d.id);
  assert.deepStrictEqual(Object.keys(d).sort(), ['appVersion', 'category', 'date', 'id', 'msg', 'stars', 'user']);
  assert.deepStrictEqual({ ...d, id: 'x' }, { id: 'x', stars: 4, category: 'bug', msg: 'La classifica si vede bene', user: 'a@b.it', date: '2026-10-07T10:00:00.000Z', appVersion: '2.0.0' });
  assert.deepStrictEqual(out, d);
});

// 16/11 (Edoardo: le schede dei feedback nella scheda Feedback, "con dati e cose vere"): si mostra solo il feedback di
// chi lo permette (public, col suo nickname, mai l'email), con un testo vero, non nascosto dall'admin.
t('16/11 permesso di mostrarlo: public e nickname (o "Tifoso anonimo"); senza permesso il documento è come prima', async () => {
  const c = ctx();
  await c.fb.send({ stars: 5, msg: 'App bellissima, la uso ogni weekend', email: 'a@b.it', share: true, name: '  Edo il Ferrarista che scrive un nome lunghissimo  ' });
  await c.fb.send({ stars: 4, msg: 'Mi piace il Fanta', share: true });
  const docs = c.feedbacks().map(([, d]) => d).sort((a, b) => b.stars - a.stars);
  assert.strictEqual(docs[0].public, true);
  assert.strictEqual(docs[0].name, 'Edo il Ferrarista che sc');
  assert.strictEqual(docs[1].name, 'Tifoso anonimo');
});

t('16/11 elenco da mostrare: solo permessi, testo di almeno 8 lettere, non nascosti; i più nuovi prima; mai l\'email', async () => {
  const d = (id, o) => ({ ['shared/bt-feedback-' + id]: { id, stars: 4, category: 'generale', msg: 'Testo vero del feedback', user: 'x@y.it', date: '2026-11-0' + id + 'T10:00:00.000Z', appVersion: '2.0.0', public: true, name: 'Nick' + id, ...o } });
  const c = ctx({ ...d(1), ...d(2), ...d(3, { public: false }), ...d(4, { hidden: true }), ...d(5, { msg: 'corto' }), ...d(6, { stars: 9 }), 'shared/bt-takes': { public: true } });
  const out = await c.fb.listPublic();
  assert.deepStrictEqual(out.map(x => x.id), ['2', '1']);
  assert.deepStrictEqual(Object.keys(out[0]).sort(), ['category', 'date', 'id', 'msg', 'name', 'stars']);
  await c.fb.hide('2');
  assert.deepStrictEqual((await c.fb.listPublic()).map(x => x.id), ['1'], 'nascosto dall\'admin: non si vede più');
  assert.strictEqual(c.fake.doc('shared/bt-feedback-2').msg, 'Testo vero del feedback', 'nascondere non cancella il feedback');
});

t('senza account il feedback è "anonimo"; categoria sconosciuta → generale; testo facoltativo', async () => {
  const c = ctx();
  await c.fb.send({ stars: 5 });
  await c.fb.send({ stars: 2, category: 'boh', msg: 'x', email: '' });
  const ds = c.feedbacks().map(([, d]) => d).sort((a, b) => a.stars - b.stars);
  assert.deepStrictEqual(ds.map(d => [d.stars, d.category, d.msg, d.user]), [[2, 'generale', 'x', 'anonimo'], [5, 'generale', '', 'anonimo']]);
  assert.deepStrictEqual(FEEDBACK_CATS.map(x => x.id), ['generale', 'bug', 'live', 'design', 'idea']);
});

t('stelle obbligatorie (da 1 a 5): senza non si scrive niente', async () => {
  const c = ctx();
  for (const stars of [0, 6, 2.5, undefined, '4']) await assert.rejects(c.fb.send({ stars, msg: 'ciao' }), e => e.code === 'stars');
  assert.strictEqual(c.feedbacks().length, 0);
});

t('senza rete rifiuta con "offline" e il messaggio da mostrare', async () => {
  const c = ctx();
  c.fake.offline = true;
  await assert.rejects(c.fb.send({ stars: 3, email: 'a@b.it' }), e => e.code === 'offline');
  c.fake.offline = false;
  assert.strictEqual(c.feedbacks().length, 0);
  assert.strictEqual(FEEDBACK_MSG.offline, 'Feedback non inviato: controlla la connessione e riprova.');
});

t('eliminazione account: cleanupFor toglie solo i feedback con user == email', async () => {
  const c = ctx({
    'shared/bt-feedback-old1': { id: 'old1', stars: 3, category: 'generale', msg: '', user: 'fabio@b.it', date: '2026-01-01T00:00:00.000Z', appVersion: '1.0.0' },
    'shared/bt-feedback-old2': { id: 'old2', stars: 5, category: 'idea', msg: 'bella', user: 'marco@b.it', date: '2026-01-01T00:00:00.000Z', appVersion: '1.0.0' },
    'shared/bt-altro': { user: 'fabio@b.it', nota: 'non è un feedback' },
  });
  await c.fb.send({ stars: 4, email: 'fabio@b.it' });
  await c.fb.cleanupFor({ email: 'fabio@b.it', name: 'Fabio' });
  const left = Object.keys(c.fake.docs()).filter(k => k.startsWith('shared/bt-feedback-') || k === 'shared/bt-altro').sort();
  assert.deepStrictEqual(left, ['shared/bt-altro', 'shared/bt-feedback-old2']);
});

(async () => {
  const filter = process.argv[2] ? new RegExp(process.argv[2], 'i') : null;
  for (const [name, fn] of tests) {
    if (filter && !filter.test(name)) continue;
    try { await fn(); pass++; console.log('PASS  ' + name); }
    catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + String(e && e.message).split('\n').slice(0, 6).join('\n        ')); }
  }
  console.log(`\n${pass} passati, ${fail} falliti`);
  process.exit(fail ? 1 : 0);
})();
