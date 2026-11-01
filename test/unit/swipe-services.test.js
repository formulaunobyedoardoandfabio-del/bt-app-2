// Servizi di Pit Swipe (1/11): voti veri in fanta/pitswipe-voti (src/services/swipevotes.js) e promemoria programmati
// sul telefono (src/services/reminders.js, @capacitor/local-notifications; nessun server). Firestore e plugin finti.
// Uso: node test/unit/swipe-services.test.js [filtro]
const assert = require('assert');
const { createSwipeVotes } = require('../../src/services/swipevotes');
const R = require('../../src/services/reminders');
let pass = 0, fail = 0;
const tests = [];
const t = (name, fn) => tests.push([name, fn]);
const at = s => Date.parse(s);

t('voti: si aggiungono all\'elenco con arrayUnion, si leggono tutti; voti non validi non partono', async () => {
  const docs = {}, appends = [];
  const V = createSwipeVotes({
    dbGet: async (c, id) => docs[c + '/' + id] || null,
    docAppend: async (c, id, item) => { appends.push([c, id, item]); const k = c + '/' + id; docs[k] = { __arr: [...((docs[k] || {}).__arr || []), item] }; },
  });
  assert.deepStrictEqual(await V.load(), []);
  await V.vote({ k: 't', id: 'x1', aid: 'a', v: 1 });
  await V.vote({ k: 'f', id: 'n9', aid: 'a', v: 1 });
  await assert.rejects(V.vote({ k: 't', id: 'x1', aid: '', v: 1 }));
  await assert.rejects(V.vote({ k: 'z', id: 'x1', aid: 'a', v: 1 }));
  await assert.rejects(V.vote({ k: 't', id: 'x1', aid: 'a', v: 2 }));
  assert.deepStrictEqual(appends.map(x => x[0] + '/' + x[1]), ['fanta/pitswipe-voti', 'fanta/pitswipe-voti']);
  const list = await V.load();
  assert.strictEqual(list.length, 2);
  assert.ok(list.every(x => typeof x.at === 'number'), 'con l\'ora del voto');
});

t('promemoria: sessione tra un\'ora, giro pronto domani alle 8:30, serie in pericolo la domenica alle 18; mai di notte', () => {
  const now = at('2026-10-31T10:00:00Z');   // sabato del Messico, 11:00 a Roma
  const sessions = [{ key: 'QUALI', utc: '2026-10-31T21:00:00Z' }, { key: 'RACE', utc: '2026-11-01T20:00:00Z' }, { key: 'FP3', utc: '2026-10-31T17:30:00Z' }];
  const list = R.plan({ now, race: { name: 'GP di Città del Messico', date: '2026-11-01' }, sessions, deckDone: true, streak: { n: 4, danger: true }, prefs: {} });
  const q = list.find(x => /Qualifiche/.test(x.title));
  assert.strictEqual(q.at, at('2026-10-31T20:00:00Z'), 'un\'ora prima');
  assert.ok(/pronostic/i.test(q.body));
  assert.ok(!list.some(x => /FP3|Prove/.test(x.title)), 'niente promemoria per le prove libere');
  const race = list.find(x => /Gara/.test(x.title));
  assert.ok(race && race.at === at('2026-11-01T19:00:00Z'), 'gara alle 21 di Roma: promemoria alle 20: ' + JSON.stringify(list.map(x => x.title)));
  const deck = list.find(x => x.id === R.ID.deck);
  assert.strictEqual(deck.at, at('2026-11-01T07:30:00Z'), 'giro di domani alle 8:30 di Roma (oggi già fatto)');
  const danger = list.find(x => x.id === R.ID.streak);
  assert.ok(danger && danger.at === at('2026-11-01T17:00:00Z') && /4/.test(danger.body), 'serie in pericolo domenica alle 18: ' + JSON.stringify(danger));
  const notToday = R.plan({ now, race: { name: 'X', date: '2026-11-01' }, sessions, deckDone: false, streak: { n: 0, danger: false }, prefs: {} });
  assert.strictEqual(notToday.find(x => x.id === R.ID.deck).at, at('2026-11-01T07:30:00Z'), 'le 8:30 di oggi sono passate: domani');
  assert.ok(!notToday.some(x => x.id === R.ID.streak), 'senza serie niente avviso');
  const night = R.plan({ now, race: { name: 'Las Vegas', date: '2026-11-22' }, sessions: [{ key: 'RACE', utc: '2026-11-22T04:00:00Z' }], deckDone: true, streak: { n: 0 }, prefs: {} });
  assert.ok(!night.some(x => /Gara/.test(x.title)), 'gara alle 5 di Roma: il promemoria alle 4 no (ore di silenzio 22-8)');
  const off = R.plan({ now, race: { name: 'X', date: '2026-11-01' }, sessions, deckDone: true, streak: { n: 4, danger: true }, prefs: { reminders: false } });
  assert.deepStrictEqual(off, [], 'spenti dal Profilo');
});

t('promemoria: si programmano col plugin, prima si cancellano i vecchi; senza plugin non fa niente', async () => {
  const calls = [];
  const plugin = {
    checkPermissions: async () => ({ display: 'granted' }), requestPermissions: async () => ({ display: 'granted' }),
    cancel: async x => { calls.push(['cancel', x.notifications.map(n => n.id)]); },
    schedule: async x => { calls.push(['schedule', x.notifications.map(n => [n.id, n.schedule.at.toISOString()])]); },
  };
  const list = [{ id: R.ID.deck, at: at('2026-11-01T07:30:00Z'), title: 'a', body: 'b' }];
  assert.strictEqual(await R.apply(plugin, list, { ask: false }), true);
  assert.deepStrictEqual(calls[0][0], 'cancel');
  assert.deepStrictEqual(calls[1], ['schedule', [[R.ID.deck, '2026-11-01T07:30:00.000Z']]]);
  assert.strictEqual(await R.apply(null, list), false);
  const denied = { ...plugin, checkPermissions: async () => ({ display: 'prompt' }) };
  assert.strictEqual(await R.apply(denied, list, { ask: false }), false, 'senza permesso e senza chiederlo: niente');
});

t('sfide: da giocare, in attesa, vinte, perse, pari; conta il primo tentativo; scadono dopo 7 giorni', () => {
  const { duelState } = require('../../src/services/duels');
  const now = at('2026-11-01T12:00:00Z'), d = 86400000;
  const arr = [
    { t: 'c', id: 's1', from: 'marco', fromName: 'Marco', to: 'me', toName: 'Io', time: 2.41, at: now - d },
    { t: 'c', id: 's2', from: 'me', fromName: 'Io', to: 'giulia', toName: 'Giulia', time: 2.3, at: now - 2 * d },
    { t: 'c', id: 's3', from: 'me', fromName: 'Io', to: 'luca', toName: 'Luca', time: 2.5, at: now - 3 * d },
    { t: 'r', id: 's3', aid: 'luca', time: 2.2, at: now - d },
    { t: 'r', id: 's3', aid: 'luca', time: 3.9, at: now },
    { t: 'c', id: 's4', from: 'anna', fromName: 'Anna', to: 'me', toName: 'Io', time: 2.6, at: now - 4 * d },
    { t: 'r', id: 's4', aid: 'me', time: 2.45, at: now - 3 * d },
    { t: 'c', id: 's5', from: 'piero', fromName: 'Piero', to: 'me', toName: 'Io', time: 2.6, at: now - 9 * d },
    { t: 'c', id: 's6', from: 'x', fromName: 'X', to: 'y', toName: 'Y', time: 2.6, at: now },
    { t: 'r', id: 's2', aid: 'intruso', time: 1.1, at: now },
  ];
  const st = duelState(arr, 'me', now);
  assert.deepStrictEqual(st.map(x => [x.id, x.status]), [['s1', 'todo'], ['s2', 'waiting'], ['s3', 'lost'], ['s4', 'won']]);
  assert.deepStrictEqual([st[2].myTime, st[2].theirTime, st[2].other], [2.5, 2.2, 'Luca'], 'il primo tentativo di Luca');
  assert.deepStrictEqual([st[3].myTime, st[3].theirTime], [2.45, 2.6]);
});

t('sfide: si mandano e si risponde con arrayUnion; tempi validi', async () => {
  const { createDuels } = require('../../src/services/duels');
  const docs = {};
  const D = createDuels({ now: () => 1000, rand: () => 0.5, dbGet: async (c, id) => docs[c + '/' + id] || null,
    docAppend: async (c, id, item) => { const k = c + '/' + id; docs[k] = { __arr: [...((docs[k] || {}).__arr || []), item] }; } });
  const c = await D.challenge({ from: 'me', fromName: 'Io', to: 'm', toName: 'Marco', time: 2.4134 });
  assert.strictEqual(c.time, 2.413);
  await D.reply({ id: c.id, aid: 'm', time: 2.39 });
  await assert.rejects(D.challenge({ from: 'me', to: 'me', time: 2 }));
  await assert.rejects(D.reply({ id: c.id, aid: 'm', time: 0 }));
  assert.strictEqual((await D.load()).length, 2);
  assert.ok(Object.keys(docs).includes('fanta/pitswipe-sfide'));
});

(async () => {
  const filter = process.argv[2] ? new RegExp(process.argv[2], 'i') : null;
  for (const [name, fn] of tests) {
    if (filter && !filter.test(name)) continue;
    try { await fn(); pass++; console.log('PASS  ' + name); } catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + String(e && e.message).split('\n')[0]); }
  }
  console.log(`\n${pass} passati, ${fail} falliti`);
  process.exit(fail ? 1 : 0);
})();
