// Prove delle conversioni tra i documenti Firebase di oggi e i formati della 2.0 (src/services/compat.js).
// Uso: node test/unit/compat.test.js [filtro]
const assert = require('assert');
const C = require('../../src/services/compat');
const F1 = require('../../src/data/f1-2026');
const S = require('../fixtures/store-oggi.json');

const NOW = Date.parse('2026-10-07T10:00:00Z');   // mercoledì prima del GP di Singapore, come le prove nel browser
const BASE = F1.CALENDAR.map(([name, circuit, country, date], i) => ({ id: 'r' + (i + 1), round: i + 1, name, circuit, country, date, circuitId: F1.CIRCUIT_IDS[i] }));
const ME = { name: 'Edo', aid: C.authorId('edo@b.it') };

let pass = 0, fail = 0;
const tests = [];
const t = (name, fn) => tests.push([name, fn]);

// ── Notizie ─────────────────────────────────────────────────────────────
t('notizie: andata e ritorno senza perdere title, summary, category, author, image, published, date, content', () => {
  const art = C.newsFromStore(S.news, NOW);
  assert.strictEqual(art[0].excerpt, S.news[0].summary);
  assert.strictEqual(art[0].cat, S.news[0].category);
  assert.strictEqual(art[0].body, S.news[0].content);
  assert.ok(art.every(a => typeof a.id === 'string' && typeof a.time === 'string'));
  const back = C.newsToStore(art);
  for (const k of ['id', 'title', 'summary', 'category', 'author', 'image', 'published', 'date', 'content']) {
    assert.deepStrictEqual(back.map(x => x[k]), S.news.map(x => x[k]), k);
  }
  // I campi in più della 2.0 viaggiano negli stessi oggetti (l'app di oggi li ignora).
  const extra = C.newsToStore([{ ...art[0], teams: ['ferrari'], drivers: ['leclerc'], featured: true, poll: { q: 'Chi vince?', answer: null, options: [{ id: 'a', label: 'A' }] } }]);
  const again = C.newsFromStore(extra, NOW)[0];
  assert.deepStrictEqual(again.teams, ['ferrari']);
  assert.strictEqual(again.poll.q, 'Chi vince?');
  assert.strictEqual(again.featured, true);
  assert.deepStrictEqual(C.newsFromStore(null, NOW), []);
});

// ── Gare ────────────────────────────────────────────────────────────────
t('gare: Baku → az-2016, Madrid → es-2026, Bahrain in Malesia → my-1999, Miami non è Austin', () => {
  assert.strictEqual(C.circuitIdOf({ name: 'Azerbaijan GP', circuit: 'CIRCUITO DI BAKU', country: 'Azerbaijan' }), 'az-2016');
  assert.strictEqual(C.circuitIdOf({ name: 'Madrid GP', circuit: 'MADRING', country: 'Spagna' }), 'es-2026');
  assert.strictEqual(C.circuitIdOf({ name: 'Bahrain GP', circuit: 'Sakhir', country: 'Bahrain' }), 'my-1999');
  assert.strictEqual(C.circuitIdOf({ name: 'GP di Miami', circuit: 'Miami International Autodrome', country: 'USA' }), 'us-2022');
  assert.strictEqual(C.circuitIdOf({ name: 'GP degli Stati Uniti', circuit: 'Circuit of the Americas, Austin', country: 'USA' }), 'us-2012');
  assert.strictEqual(C.circuitIdOf({ name: 'Las Vegas GP', circuit: 'Strip', country: 'Stati Uniti' }), 'us-2023');
  assert.strictEqual(C.circuitIdOf({ name: 'GP di Spagna', circuit: 'Spagna', country: 'Spagna' }), null);   // "spa" non è Spa-Francorchamps
  assert.strictEqual(C.circuitIdOf({ name: 'GP di Fantasia', circuit: 'Pista Inventata', country: 'Atlantide' }), null);
  assert.strictEqual(C.circuitIdOf({ circuitId: 'sg-2008', name: 'qualsiasi' }), 'sg-2008');
  F1.CALENDAR.forEach(([name, circuit, country], i) => assert.strictEqual(C.circuitIdOf({ name, circuit, country }), F1.CIRCUIT_IDS[i], name));
});

t('gare: lo stato LIVE salvato passa nel calendario della 2.0; la gara sconosciuta resta in extra', () => {
  const stored = [...S.races.slice(0, 2), S.races[2]].map(r => r.circuit === 'CIRCUITO DI BAKU' ? { ...r, status: 'LIVE' } : r);
  const { races, extra } = C.mergeRaces(BASE, stored, NOW);
  assert.strictEqual(races.length, 23);
  assert.strictEqual(races.find(r => r.circuitId === 'az-2016').status, 'LIVE');
  assert.strictEqual(races.find(r => r.circuitId === 'es-2026').status, 'CONCLUSA');   // salvata così
  assert.strictEqual(races.find(r => r.circuitId === 'my-1999').status, 'CONCLUSA');   // 4 ottobre: passata, nessuno stato salvato
  assert.strictEqual(races.find(r => r.circuitId === 'sg-2008').status, 'IN ARRIVO');
  assert.deepStrictEqual(extra.map(x => x.id), ['r3']);
  assert.deepStrictEqual(C.mergeRaces(BASE, null, NOW).extra, []);
});

t('gare: date "2026-09-26", "2026-09-26T13:00" e round "17" scritto come testo non rompono niente', () => {
  const stored = [
    { name: 'Madrid GP', circuit: 'MADRING', country: 'Spagna', round: '17', date: '2026-09-13', status: 'CONCLUSA' },
    { name: 'Baku', circuit: 'Baku City Circuit', country: 'Azerbaigian', round: '18', date: '2026-09-26T13:00', status: 'LIVE' },
    { name: 'Monza', circuit: 'Monza', country: 'Italia', round: 13, date: '2026-09-06T15:00:00', status: 'SCONOSCIUTO' },
  ];
  const { races, extra } = C.mergeRaces(BASE, stored, NOW);
  assert.strictEqual(races.find(r => r.circuitId === 'az-2016').status, 'LIVE');
  assert.strictEqual(races.find(r => r.circuitId === 'it-1922').status, 'CONCLUSA');   // stato non valido: dalla data
  assert.ok(C.racesToStore(races, extra).every(r => typeof r.round === 'number' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00$/.test(r.date)));
  assert.strictEqual(C.fmtDate('2026-09-26'), '26 set 2026');
  assert.strictEqual(C.fmtDate('2026-09-26T13:00'), '26 set 2026');
  assert.strictEqual(C.fmtDate('2026-09-26T23:30:00Z'), '27 set 2026');   // con il fuso: la data in Italia
  assert.strictEqual(C.fmtDate(''), '–');   // Tappa 3 (G05): valore mancante con la lineetta corta
  assert.strictEqual(C.fmtDate('non è una data'), '–');
});

t('gare: date scritta in ora italiana senza fuso (Singapore → "2026-10-11T14:00:00")', () => {
  const { races, extra } = C.mergeRaces(BASE, S.races, NOW);
  const out = C.racesToStore(races, extra);
  const sg = out.find(r => r.circuitId === 'sg-2008');
  assert.strictEqual(sg.date, '2026-10-11T14:00:00');
  assert.strictEqual(sg.totalLaps, 62);
  assert.strictEqual(sg.status, 'IN ARRIVO');
  assert.deepStrictEqual(Object.keys(sg).sort(), ['circuit', 'circuitId', 'country', 'date', 'id', 'name', 'round', 'status', 'totalLaps']);
  assert.strictEqual(out.find(r => r.circuitId === 'ae-2009').date, '2026-12-06T14:00:00');   // a dicembre l'ora solare (+1)
  assert.strictEqual(out.find(r => r.circuitId === 'az-2016').date, '2026-09-26T13:00:00');   // senza orario ufficiale: quello salvato
  assert.deepStrictEqual(out[out.length - 1], S.races[2]);                                   // le extra in fondo, invariate
  // Rileggendo quello che si è scritto, il calendario resta uguale.
  const again = C.mergeRaces(BASE, out, NOW);
  assert.deepStrictEqual(again.races.map(r => r.status), races.map(r => r.status));
  assert.deepStrictEqual(again.extra, [S.races[2]]);
});

// ── Classifiche ─────────────────────────────────────────────────────────
t('classifiche: Antonelli p1 → antonelli; "RB F1 Team" → racingbulls; pilota sconosciuto → ospite', () => {
  const st = C.standingsFromStore({ piloti: S.piloti, costruttori: S.costruttori });
  assert.strictEqual(st.drivers[0].id, 'antonelli');
  assert.strictEqual(st.drivers[0].points, 267);
  assert.strictEqual(st.drivers.find(d => d.oldId === 'p9').id, 'lawson');
  const team = old => st.teams.find(x => x.oldId === old).id;
  assert.deepStrictEqual(['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10', 'c11'].map(team),
    ['mercedes', 'ferrari', 'mclaren', 'redbull', 'racingbulls', 'alpine', 'haas', 'audi', 'williams', 'astonmartin', 'cadillac']);
  const g = st.drivers.find(d => d.oldId === 'p11');
  assert.strictEqual(g.id, 'x-rossi');
  assert.ok(st.guests['x-rossi'].guest);
  assert.strictEqual(st.guests['x-rossi'].teamId, 'ferrari');
  assert.strictEqual(st.guests['x-rossi'].full, 'Mario Rossi');
  const back = C.standingsToStore(st);
  assert.deepStrictEqual(back.piloti[0], { id: 'p1', name: 'Andrea Kimi Antonelli', team: 'MERCEDES', position: 1, points: 267 });
  assert.strictEqual(back.costruttori.find(c => c.id === 'c5').name, 'Racing Bulls');
  assert.strictEqual(back.piloti.find(p => p.id === 'p11').name, 'Mario Rossi');
  // Un pilota arrivato dalla 2.0 (senza id di oggi) prende un id nuovo.
  const nuovo = C.standingsToStore({ drivers: [{ id: 'bottas', position: 22, points: 0 }], teams: [], guests: {} });
  assert.deepStrictEqual(nuovo.piloti[0], { id: 'p-bottas', name: 'Valtteri Bottas', team: 'CADILLAC', position: 22, points: 0 });
});

// Tappa 3 (G20): la posizione prima dell'ultima gara (prevPosition) per le frecce del mondiale; senza, niente campo.
t('classifiche: prevPosition passa dal documento alla 2.0 e ritorna', () => {
  const st = C.standingsFromStore({ piloti: [{ id: 'p1', name: 'Andrea Kimi Antonelli', team: 'MERCEDES', position: 1, points: 302, prevPosition: 2 }, { id: 'p2', name: 'George Russell', team: 'MERCEDES', position: 2, points: 236 }], costruttori: [{ id: 'c1', name: 'Mercedes', position: 1, points: 538, prevPosition: 1 }] });
  assert.strictEqual(st.drivers[0].prev, 2);
  assert.ok(!('prev' in st.drivers[1]));
  assert.strictEqual(st.teams[0].prev, 1);
  const back = C.standingsToStore(st);
  assert.deepStrictEqual(back.piloti[0], { id: 'p1', name: 'Andrea Kimi Antonelli', team: 'MERCEDES', position: 1, points: 302, prevPosition: 2 });
  assert.deepStrictEqual(back.piloti[1], { id: 'p2', name: 'George Russell', team: 'MERCEDES', position: 2, points: 236 });
  assert.deepStrictEqual(back.costruttori[0], { id: 'c1', name: 'Mercedes', position: 1, points: 538, prevPosition: 1 });
});

t('classifiche: points null resta null', () => {
  const st = C.standingsFromStore({ piloti: [{ id: 'p1', name: 'Andrea Kimi Antonelli', team: 'MERCEDES', position: 1, points: null }], costruttori: null });
  assert.strictEqual(st.drivers[0].points, null);
  assert.deepStrictEqual(st.teams, []);
});

// ── Chat ────────────────────────────────────────────────────────────────
t('chat: messaggio senza aid è mio se il nome è uguale; con aid conta solo l\'aid', () => {
  const msgs = C.chatFromStore([...S.chat, { id: 'm3', user: 'Edo', aid: ME.aid, txt: 'mio', t: 1727000003000 }], ME);
  assert.deepStrictEqual(msgs.map(m => m.mine), [true, false, true]);
  assert.deepStrictEqual(msgs.map(m => m.text), ['messaggio vecchio senza aid', 'un omonimo', 'mio']);
  assert.strictEqual(msgs[0].from, 'Edo');
  assert.strictEqual(msgs[0].aid, '');
  assert.strictEqual(msgs[2].at, 1727000003000);
  assert.deepStrictEqual(C.chatFromStore(null, ME), []);
  assert.ok(C.sameAuthor({ aid: 'u1' }, { aid: 'u1', user: 'X' }) && !C.sameAuthor({ aid: 'u1', name: 'X' }, { user: 'X' }));
});

t('chat: la medaglia dei trofei viaggia con il messaggio (Tappa 3, G31)', () => {
  const m = C.chatMsgToStore('ciao', { ...ME, medal: 'oro' }, NOW);
  assert.strictEqual(m.medal, 'oro');
  assert.ok(!('medal' in C.chatMsgToStore('ciao', { ...ME, medal: 'platino' }, NOW)), 'medaglia che non esiste');
  const got = C.chatFromStore([{ id: 'a', user: 'Fabio', aid: 'u2', txt: 'ciao', t: 1, medal: 'argento' }, { id: 'b', user: 'Ugo', aid: 'u3', txt: 'x', t: 2, medal: 'platino' }, { id: 'c', user: 'Ada', aid: 'u4', txt: 'y', t: 3 }], ME);
  assert.deepStrictEqual(got.map(x => x.medal), ['argento', null, null]);
});

t('chat: messaggio della 2.0 nel formato di oggi {id,user,aid,txt,t}', () => {
  const m = C.chatMsgToStore('ciao', ME, NOW);
  assert.deepStrictEqual(Object.keys(m).sort(), ['aid', 'id', 't', 'txt', 'user']);
  assert.deepStrictEqual([m.user, m.txt, m.aid, m.t], ['Edo', 'ciao', ME.aid, NOW]);
  const msg = C.chatFromStore(S.chat, ME)[1];
  const r = C.reportToStore('fanta', msg, ME, NOW);
  assert.deepStrictEqual(r, { id: r.id, room: 'fantaf1', msgId: 'm2', txt: 'un omonimo', author: 'Edo', aid: 'u_altro', by: 'Edo', byAid: ME.aid, t: NOW });
  assert.strictEqual(C.reportFromStore(S.report).chatId, 'fanta');
  assert.strictEqual(C.reportFromStore(S.report).text, 'un omonimo');
  assert.strictEqual(C.CHAT_DB_KEY.radio, 'bt-chat-boxradio');
  assert.strictEqual(C.authorId('Edo@B.it '), C.authorId('edo@b.it'));
  assert.ok(/^u[0-9a-f]{16}$/.test(C.authorId('edo@b.it')));
});

// ── Account ─────────────────────────────────────────────────────────────
t('account vecchio senza about: profilo con about a null e nessun errore', () => {
  const p = C.profileFromStore(S.oldUser);
  assert.deepStrictEqual(p, { name: 'Edo', nick: 'Edo', email: 'edo@b.it', about: { birth: null, follow: null, fan: null }, app2: {}, isPremium: false });
  const q = C.profileFromStore({ email: 'f@b.it', name: 'Fabio', about: { fan: 'vivo' }, app2: { saved: ['n1'] }, isPremium: true });
  assert.deepStrictEqual(q.about, { birth: null, follow: null, fan: 'vivo' });
  assert.strictEqual(q.nick, 'Fabio');
  assert.deepStrictEqual(q.app2, { saved: ['n1'] });
  assert.strictEqual(C.profileFromStore(null), null);
});

// Tappa 3 (G16): gli anni da tifoso esatti (years) passano dal documento al profilo; senza, il profilo resta com'era.
t('profileFromStore: tiene gli anni da tifoso esatti (years) se ci sono', () => {
  const p = C.profileFromStore({ email: 'f@b.it', name: 'Fabio', about: { birth: 2001, follow: 2, fan: 'vroom', years: 5 } });
  assert.deepStrictEqual(p.about, { birth: 2001, follow: 2, fan: 'vroom', years: 5 });
  const q = C.profileFromStore({ email: 'f@b.it', name: 'Fabio', about: { follow: 2, years: 'tanti' } });
  assert.deepStrictEqual(q.about, { birth: null, follow: 2, fan: null });
});

// ── Date ────────────────────────────────────────────────────────────────
t('relTime: Adesso, 5 min fa, 3 h fa, Ieri, 4 giorni fa, data', () => {
  assert.strictEqual(C.relTime('2026-10-07T09:59:30Z', NOW), 'Adesso');
  assert.strictEqual(C.relTime('2026-10-07T09:55:00Z', NOW), '5 min fa');
  assert.strictEqual(C.relTime('2026-10-07T07:00:00Z', NOW), '3 h fa');
  assert.strictEqual(C.relTime('2026-10-06T08:00:00Z', NOW), 'Ieri');
  assert.strictEqual(C.relTime('2026-10-03T08:00:00Z', NOW), '4 giorni fa');
  assert.strictEqual(C.relTime('2026-09-01T10:00:00', NOW), '1 set 2026');
  assert.strictEqual(C.relTime('2026-10-07T11:55:00', NOW), '5 min fa');   // senza fuso = ora italiana (11:55 in Italia = 09:55Z)
  assert.strictEqual(C.relTime('', NOW), '');
});

// ── Notifiche e Instagram (in più rispetto al piano) ────────────────────
t('notifiche: dal formato di oggi, dalla più nuova; non lette quelle dopo notifSeenAt', () => {
  const n = C.notifsFromStore(S.notifs, Date.parse('2026-10-05T00:00:00Z'), NOW);
  assert.deepStrictEqual(n.map(x => x.id), ['nt2', 'nt1']);
  assert.deepStrictEqual(n.map(x => x.unread), [true, false]);
  assert.strictEqual(n[0].body, 'Segui Singapore con noi.');
  assert.strictEqual(n[0].time, '22 h fa');
  const s = C.notifToStore({ title: 'Ciao', body: 'Testo' }, NOW);
  assert.deepStrictEqual(Object.keys(s).sort(), ['date', 'id', 'read', 'text', 'title']);
  assert.deepStrictEqual([s.title, s.text, s.read, s.date], ['Ciao', 'Testo', false, '2026-10-07T10:00:00.000Z']);
  assert.deepStrictEqual(C.notifsFromStore(null, 0, NOW), []);
});

t('Instagram: thumbnail ↔ thumb, url conservato, contatori vuoti senza numeri inventati', () => {
  const ig = C.igFromStore(S.ig);
  assert.strictEqual(ig.handle, 'bt_formula1');
  assert.strictEqual(ig.followers, 128544);
  assert.strictEqual(ig.posts, null);
  assert.strictEqual(ig.videos[0].thumb, S.ig.videos[0].thumbnail);
  assert.strictEqual(ig.videos[0].url, S.ig.videos[0].url);
  const back = C.igToStore(ig);
  assert.deepStrictEqual(back.videos, S.ig.videos);
  assert.strictEqual(back.followers, 128544);
  assert.deepStrictEqual(C.igFromStore(null), { handle: 'bt_formula1', followers: null, posts: null, videos: [] });
  assert.strictEqual(C.igProfileUrl('bt_formula1'), 'https://www.instagram.com/bt_formula1/');
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
