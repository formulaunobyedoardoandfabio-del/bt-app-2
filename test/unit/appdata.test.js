// Prove dei contenuti condivisi e dei dati personali su Firebase (src/services/appdata.js), col Firebase finto.
// Uso: node test/unit/appdata.test.js [filtro]
const assert = require('assert');
const { setupWindow } = require('./node-window');
const D = require('../../src/services/appdata');
const S = require('../fixtures/store-oggi.json');

const NOW = Date.parse('2026-10-07T10:00:00Z');   // mercoledì prima del GP di Singapore, come le prove nel browser
const wait = ms => new Promise(r => setTimeout(r, ms));
const seed = docs => setupWindow({ seed: { addDocs: docs } });
let pass = 0, fail = 0;
const tests = [];
const t = (name, fn) => tests.push([name, fn]);

// ── Contenuti condivisi ─────────────────────────────────────────────────
t('senza documenti: valori di serie (notizia di benvenuto, calendario 2026, classifiche dopo Baku, solo le domande di storia)', async () => {
  setupWindow();
  const A = D.createAppData();
  const { values, offline } = await A.loadShared(NOW);
  assert.strictEqual(offline, false);
  assert.deepStrictEqual(values.news.map(a => a.title), ["Vi presentiamo l'app B&T!!"]);
  assert.strictEqual(values.news[0].cat, 'APP');
  assert.strictEqual(values.races.races.length, 23);
  assert.strictEqual(values.races.races.find(r => r.circuitId === 'my-1999').status, 'CONCLUSA');   // corsa il 4 ottobre
  assert.strictEqual(values.races.races.find(r => r.circuitId === 'sg-2008').status, 'IN ARRIVO');
  assert.deepStrictEqual(values.races.extra, []);
  assert.deepStrictEqual(values.standings.drivers.slice(0, 2).map(r => [r.id, r.position, r.points]), [['antonelli', 1, 302], ['russell', 2, 236]]);
  assert.deepStrictEqual(values.standings.teams[0].id, 'mercedes');
  assert.strictEqual(values.standings.note, "Aggiornata dopo il GP dell'Azerbaigian (round 15)");
  assert.ok(Object.values(values.standings.guests).some(g => g.full === 'Yuki Tsunoda'), 'manca Tsunoda');
  assert.deepStrictEqual(values.predictions.map(q => q.id), ['h1', 'h2', 'h3', 'h4']);
  assert.deepStrictEqual(values.predictions[0].options[0], ['hamilton', 'L. Hamilton']);   // forma della 2.0
  assert.strictEqual(values.homePoll, null);
  assert.deepStrictEqual(values.highlights, []);
  assert.deepStrictEqual(values.notifs, []);
  assert.deepStrictEqual(values.ig, { handle: 'bt_formula1', followers: null, posts: null, videos: [] });
  assert.strictEqual(values.fantaStats.drivers.antonelli.pts, 622);
  assert.deepStrictEqual(values.silly, {});
  assert.deepStrictEqual(values.driverPhotos, {});
  assert.deepStrictEqual(D.sharedDefaults(NOW), values, 'i valori di prima della lettura devono essere gli stessi');
});

t('documenti di oggi: notizie, gare (stato salvato), classifiche, Instagram e notifiche convertiti', async () => {
  seed({
    'shared/bt-news': { __arr: S.news }, 'shared/bt-races': { __arr: S.races },
    'shared/bt-piloti': { __arr: S.piloti }, 'shared/bt-costruttori': { __arr: S.costruttori },
    'shared/bt-ig-config': S.ig, 'shared/bt-notifs': { __arr: S.notifs },
  });
  const A = D.createAppData();
  const { values } = await A.loadShared(NOW);
  assert.deepStrictEqual(values.news.map(a => a.id), S.news.map(n => n.id));
  assert.strictEqual(values.news[0].excerpt, S.news[0].summary);
  const baku = values.races.races.find(r => r.circuitId === 'az-2016');
  assert.strictEqual(baku.status, S.races.find(r => /Baku/i.test(r.circuit)).status);
  assert.ok(values.races.extra.some(r => r.name === 'GP di Fantasia'), 'la gara senza circuito deve restare per il salvataggio');
  assert.strictEqual(values.standings.drivers[0].id, 'antonelli');
  assert.strictEqual(values.standings.drivers[0].oldId, 'p1');
  assert.strictEqual(values.ig.followers, 128544);
  assert.strictEqual(values.ig.videos[0].url, S.ig.videos[0].url);
  assert.deepStrictEqual(values.notifs.map(n => n.id), ['nt1', 'nt2']);   // come sono salvate: l'app le converte con notifSeenAt
});

t('saveShared("news"): bt-news nel formato di oggi; rilette uguali', async () => {
  const { firebase } = setupWindow();
  const A = D.createAppData();
  const { values } = await A.loadShared(NOW);
  const art = { id: 77, title: 'Leclerc in pole', excerpt: 'Giro perfetto', cat: 'GARA', author: 'Team B&T', image: '', body: 'Testo', published: true, teams: ['ferrari'], drivers: ['leclerc'], circuits: [], date: '2026-10-07T09:55:00.000Z' };
  const back = await A.saveShared('news', [art, ...values.news], NOW);
  const doc = firebase.__fake.doc('shared/bt-news').__arr;
  assert.deepStrictEqual(Object.keys(doc[0]).filter(k => ['id', 'title', 'summary', 'category', 'author', 'image', 'content', 'published', 'date'].includes(k)).sort(),
    ['author', 'category', 'content', 'date', 'id', 'image', 'published', 'summary', 'title']);
  assert.strictEqual(doc[0].id, '77');
  assert.strictEqual(doc[0].summary, 'Giro perfetto');
  assert.strictEqual(doc[0].content, 'Testo');
  assert.strictEqual(doc[1].id, 'n1');
  assert.strictEqual(back[0].time, '5 min fa');
  assert.deepStrictEqual(back[0].teams, ['ferrari']);
  const again = await D.createAppData().loadShared(NOW);
  assert.deepStrictEqual(again.values.news.map(a => a.id), ['77', 'n1']);
});

t('saveShared("predictions"): opzioni salvate come [{id,label}] (Firestore rifiuta gli array dentro gli array)', async () => {
  const { firebase } = setupWindow();
  const A = D.createAppData();
  const { values } = await A.loadShared(NOW);
  const q = { id: 'p9', kind: 'poll', cat: 'Sondaggio', q: 'Chi vince?', answer: null, options: [['o0', 'Norris'], ['o1', 'Leclerc']], about: 'RACE', raceId: 'r17' };
  const back = await A.saveShared('predictions', [...values.predictions, q], NOW);
  const doc = firebase.__fake.doc('shared/bt-predictions').__arr;
  assert.deepStrictEqual(doc[4].options, [{ id: 'o0', label: 'Norris' }, { id: 'o1', label: 'Leclerc' }]);
  assert.deepStrictEqual(doc[0].options[1], { id: 'verstappen', label: 'M. Verstappen' });
  assert.deepStrictEqual(back[4].options, [['o0', 'Norris'], ['o1', 'Leclerc']]);
  assert.strictEqual(back[0].answer, 'verstappen');
});

t('saveShared("standings"): bt-piloti, bt-costruttori e bt-standings-note; gli id e gli ospiti di oggi restano', async () => {
  const { firebase } = seed({ 'shared/bt-piloti': { __arr: S.piloti }, 'shared/bt-costruttori': { __arr: S.costruttori } });
  const A = D.createAppData();
  const { values } = await A.loadShared(NOW);
  const st = values.standings;
  const next = { ...st, note: 'Dopo Singapore', drivers: st.drivers.map(r => r.id === 'antonelli' ? { ...r, points: 290 } : r) };
  const back = await A.saveShared('standings', next, NOW);
  const piloti = firebase.__fake.doc('shared/bt-piloti').__arr;
  assert.strictEqual(piloti[0].id, 'p1');
  assert.strictEqual(piloti[0].points, 290);
  assert.strictEqual(piloti[0].name, 'Andrea Kimi Antonelli');
  const guest = piloti.find(p => p.id === 'p11');
  assert.strictEqual(guest.name, 'Mario Rossi', 'l\'ospite deve tenere il suo nome');
  assert.ok(firebase.__fake.doc('shared/bt-costruttori').__arr.length > 0);
  assert.deepStrictEqual(firebase.__fake.doc('shared/bt-standings-note'), { text: 'Dopo Singapore' });
  assert.strictEqual(back.note, 'Dopo Singapore');
});

t('saveShared("races"): stato e circuitId in bt-races, le gare fuori calendario restano', async () => {
  const { firebase } = seed({ 'shared/bt-races': { __arr: S.races } });
  const A = D.createAppData();
  const { values } = await A.loadShared(NOW);
  const races = values.races.races.map(r => r.circuitId === 'sg-2008' ? { ...r, status: 'LIVE' } : r);
  const back = await A.saveShared('races', { races, extra: values.races.extra }, NOW);
  const doc = firebase.__fake.doc('shared/bt-races').__arr;
  const sg = doc.find(r => r.circuitId === 'sg-2008');
  assert.strictEqual(sg.status, 'LIVE');
  assert.strictEqual(typeof sg.round, 'number');
  assert.ok(/^2026-10-11T\d{2}:\d{2}:00$/.test(sg.date), 'data di Singapore: ' + sg.date);
  assert.ok(doc.some(r => r.name === 'GP di Fantasia'));
  assert.strictEqual(back.races.find(r => r.circuitId === 'sg-2008').status, 'LIVE');
});

t('senza rete all\'avvio: offline vero, valori di serie, e niente salvataggi sopra i dati veri finché non si rilegge', async () => {
  const { firebase } = seed({ 'shared/bt-news': { __arr: S.news } });
  const A = D.createAppData();
  firebase.__fake.offline = true;
  const first = await A.loadShared(NOW);
  assert.strictEqual(first.offline, true);
  assert.deepStrictEqual(first.values.news.map(a => a.title), ["Vi presentiamo l'app B&T!!"]);
  assert.deepStrictEqual(first.fresh, []);
  firebase.__fake.offline = false;
  // La rete è tornata ma le notizie sullo schermo sono quelle di serie: salvarle cancellerebbe quelle vere.
  await assert.rejects(A.saveShared('news', first.values.news, NOW), e => e.code === 'stale');
  assert.deepStrictEqual(firebase.__fake.doc('shared/bt-news').__arr.map(n => n.id), S.news.map(n => n.id));
  const again = await A.loadShared(NOW, { kinds: A.staleKinds() });
  assert.strictEqual(again.offline, false);
  assert.ok(again.fresh.includes('news'));
  await A.saveShared('news', again.values.news, NOW);   // ora sì
});

t('scrittura rifiutata: saveShared lancia l\'errore e il documento resta com\'era', async () => {
  const { firebase } = setupWindow();
  const A = D.createAppData();
  const { values } = await A.loadShared(NOW);
  firebase.__fake.failWrites = true;
  await assert.rejects(A.saveShared('highlights', [{ id: 'h1', title: 'Video', dur: '', link: '', thumb: null }], NOW), e => e.code === 'permission-denied');
  assert.strictEqual(firebase.__fake.doc('shared/bt-highlights'), undefined);
  assert.deepStrictEqual(values.highlights, []);
});

t('notifiche dell\'admin: aggiunte con sharedAppend e tolte con sharedRemoveWhere, nel formato di oggi', async () => {
  const { firebase } = seed({ 'shared/bt-notifs': { __arr: S.notifs } });
  const A = D.createAppData();
  await A.loadShared(NOW);
  const n = await A.appendNotif({ title: 'Pole!', body: 'Leclerc davanti a tutti' }, NOW);
  let doc = firebase.__fake.doc('shared/bt-notifs').__arr;
  assert.deepStrictEqual(Object.keys(doc[2]).sort(), ['date', 'id', 'read', 'text', 'title']);
  assert.deepStrictEqual(doc.map(x => x.id), ['nt1', 'nt2', n.id]);
  assert.strictEqual(doc[2].text, 'Leclerc davanti a tutti');
  await A.removeNotif('nt1');
  doc = firebase.__fake.doc('shared/bt-notifs').__arr;
  assert.deepStrictEqual(doc.map(x => x.id), ['nt2', n.id]);
});

// ── Dati personali (users/<email>.app2) ─────────────────────────────────
t('saveUserData: dopo 800 ms un solo salvataggio con le modifiche unite, nel campo app2', async () => {
  const { firebase } = setupWindow();
  const A = D.createAppData();
  let writes = 0;
  const db = firebase.firestore(), real = db.collection.bind(db);
  db.collection = c => { const col = real(c); const doc = col.doc.bind(col); col.doc = id => { const r = doc(id), set = r.set.bind(r); r.set = (...a) => { writes++; return set(...a); }; return r; }; return col; };
  const p1 = A.saveUserData('a@b.it', { saved: ['n1'] });
  await wait(300);
  const p2 = A.saveUserData('a@b.it', { favTeam: 'ferrari' });
  await wait(500);
  assert.strictEqual(writes, 0, 'troppo presto: non sono passati 800 ms dall\'ultima modifica');
  await Promise.all([p1, p2]);
  assert.strictEqual(writes, 1);
  const u = firebase.__fake.doc('users/a@b.it');
  assert.deepStrictEqual(u.app2, { saved: ['n1'], favTeam: 'ferrari' });
  assert.strictEqual(u.name, 'Tester', 'gli altri campi dell\'account restano');
});

t('loadUserData: solo le chiavi dei dati personali; flushUserData salva subito', async () => {
  const { firebase } = setupWindow();
  firebase.__fake.setDoc('users/a@b.it', { name: 'Tester', app2: { saved: ['n1'], votes: { home: 'norris' }, strano: 1 } });
  const A = D.createAppData();
  assert.deepStrictEqual(await A.loadUserData('a@b.it'), { saved: ['n1'], votes: { home: 'norris' } });
  assert.deepStrictEqual(await A.loadUserData('nuovo@b.it'), {});
  A.saveUserData('a@b.it', { pitBest: 2.41, strano: 2 });
  await A.flushUserData();
  assert.deepStrictEqual(firebase.__fake.doc('users/a@b.it').app2, { saved: ['n1'], votes: { home: 'norris' }, strano: 1, pitBest: 2.41 });
  assert.ok(D.USER_KEYS.includes('notifSeenAt') && D.USER_KEYS.length === 16);
});

t('cancelUserData: le modifiche in attesa non si salvano più (account eliminato)', async () => {
  const { firebase } = setupWindow();
  const A = D.createAppData();
  const p = A.saveUserData('a@b.it', { saved: ['n1'] }, 50);
  A.cancelUserData('a@b.it');
  await assert.rejects(p, e => e.code === 'cancelled');
  await wait(120);
  assert.strictEqual(firebase.__fake.doc('users/a@b.it').app2, undefined);
});

t('clearUserData: via i dati personali dell\'account (anche quelli in attesa), il resto del profilo resta', async () => {
  const { firebase } = setupWindow();
  firebase.__fake.setDoc('users/a@b.it', { name: 'Tester', app2: { saved: ['n1'], votes: { home: 'norris' } } });
  const A = D.createAppData();
  A.saveUserData('a@b.it', { favTeam: 'ferrari' }, 50).catch(() => {});
  await A.clearUserData('a@b.it');
  await wait(120);
  const u = firebase.__fake.doc('users/a@b.it');
  assert.deepStrictEqual(u.app2, {});
  assert.strictEqual(u.name, 'Tester');
  assert.deepStrictEqual(await A.loadUserData('a@b.it'), {});
});

t('saveUserData senza rete: rifiuta e riprova con la modifica dopo', async () => {
  const { firebase } = setupWindow();
  const A = D.createAppData();
  firebase.__fake.failWrites = true;
  await assert.rejects(A.saveUserData('a@b.it', { saved: ['n1'] }, 10));
  firebase.__fake.failWrites = false;
  await A.saveUserData('a@b.it', { favDriver: 'leclerc' }, 10);
  assert.deepStrictEqual(firebase.__fake.doc('users/a@b.it').app2, { saved: ['n1'], favDriver: 'leclerc' });
});

(async () => {
  const filter = process.argv[2] ? new RegExp(process.argv[2], 'i') : null;
  for (const [name, fn] of tests) {
    if (filter && !filter.test(name)) continue;
    try { await fn(); pass++; console.log('PASS  ' + name); }
    catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); }
  }
  console.log(`\n${pass} passati, ${fail} falliti`);
  process.exit(fail ? 1 : 0);
})();
