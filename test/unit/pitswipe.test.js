// Pit Swipe (1/11, src/logic/pitswipe.js; design docs/design/pit-swipe.html): mazzo del giorno, gusti, voti veri,
// vero o falso dai dati veri, serie per GP con pit stop, missioni della settimana, livello del tifoso.
// Uso: node test/unit/pitswipe.test.js
const assert = require('assert');
const P = require('../../src/logic/pitswipe');
const F1 = require('../../src/data/f1-2026');
const CI = require('../../src/data/circuit-info.json');
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('PASS  ' + name); } catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); } };
const at = s => Date.parse(s);
const N = (id, topics = []) => ({ id, topics });

t('chiave del mazzo: nuovo alle 8:00 di Roma e dopo ogni sessione finita', () => {
  assert.strictEqual(P.deckKey(at('2026-11-01T06:59:00Z')), '2026-10-31#0', 'prima delle 8:00 (ora solare: UTC+1) vale il giorno prima');
  assert.strictEqual(P.deckKey(at('2026-11-01T07:01:00Z')), '2026-11-01#0');
  const ends = [at('2026-11-01T22:00:00Z'), at('2026-10-31T22:00:00Z')];
  assert.strictEqual(P.deckKey(at('2026-11-01T21:00:00Z'), ends), '2026-11-01#0');
  assert.strictEqual(P.deckKey(at('2026-11-01T22:30:00Z'), ends), '2026-11-01#1', 'finita la gara, mazzo nuovo');
});

t('mazzo: 6 notizie, 2 opinioni non votate, 1 vero o falso, 1 pilota, mescolati; più corto se mancano', () => {
  const news = Array.from({ length: 12 }, (_, i) => N('n' + i, ['c:x']));
  const takes = [{ id: 't1', text: 'A', on: true }, { id: 't2', text: 'B', on: true }, { id: 't3', text: 'C', on: true }, { id: 't0', text: 'spenta', on: false }];
  const d = P.buildDeck({ news, takes, voted: { t1: 1 }, facts: [{ id: 'f1', text: 'x', truth: true }], driverCard: { id: 'leclerc' }, key: 'k' });
  const kinds = d.map(c => c.kind);
  assert.strictEqual(d.length, 10);
  assert.deepStrictEqual(kinds.filter(k => k === 'news').length, 6);
  assert.deepStrictEqual(d.filter(c => c.kind === 'take').map(c => c.id), ['t2', 't3'], 'non quelle già votate né spente');
  assert.strictEqual(kinds.filter(k => k === 'tf').length, 1);
  assert.strictEqual(kinds[kinds.length - 1], 'driver', 'la carta del pilota in fondo');
  assert.notStrictEqual(kinds[1], 'take');
  const short = P.buildDeck({ news: news.slice(0, 2), takes: [], facts: [], key: 'k' });
  assert.deepStrictEqual(short.map(c => c.id), ['n0', 'n1'], 'mai riempito con altro');
});

t('gusti: BOX +2, GIRO VELOCE +3, STAY OUT −1, RADIO +2; le notizie coi gusti vengono prima (o per data se spenti)', () => {
  let w = P.applySwipe({}, ['d:leclerc', 'c:tecnica'], 'box');
  w = P.applySwipe(w, ['d:leclerc'], 'fast');
  w = P.applySwipe(w, ['t:redbull'], 'out');
  w = P.applySwipe(w, ['t:redbull'], 'nonsense');
  assert.deepStrictEqual(w, { 'd:leclerc': 5, 'c:tecnica': 2, 't:redbull': -1 });
  const capped = Array.from({ length: 9 }, () => 0).reduce(x => P.applySwipe(x, ['d:a'], 'fast'), {});
  assert.strictEqual(capped['d:a'], 10, 'al massimo 10');
  const news = [N('a', ['t:redbull']), N('b', []), N('c', ['d:leclerc'])];
  assert.deepStrictEqual(P.buildDeck({ news, weights: w, key: 'k' }).map(c => c.id), ['c', 'b', 'a']);
  assert.deepStrictEqual(P.buildDeck({ news, weights: w, mode: 'date', key: 'k' }).map(c => c.id), ['a', 'b', 'c']);
  assert.deepStrictEqual(P.buildDeck({ news, fav: { driver: 'redbullx', team: 'redbull' }, key: 'k' }).map(c => c.id)[0], 'a', 'la scuderia del cuore viene prima');
});

t('perché la vedo: pilota e scuderia del cuore, gusti, più votate; sempre almeno un motivo', () => {
  const r = P.whyReasons({ topics: ['d:leclerc', 'c:piloti'] }, { fav: { driver: 'leclerc', team: 'ferrari' }, weights: { 'c:piloti': 4 }, hot: true, labelOf: k => k === 'c:piloti' ? 'PILOTI' : k });
  assert.deepStrictEqual(r, ['Parla del tuo pilota del cuore', 'Hai messo nel box altre notizie di PILOTI', 'È tra le più votate di oggi']);
  assert.deepStrictEqual(P.whyReasons({ topics: [] }, {}), ['Una delle notizie più nuove']);
});

t('voti: vale l\'ultimo di ogni account; percentuale solo da 20 voti', () => {
  const arr = [{ k: 't', id: 'x', aid: 'a', v: 1 }, { k: 't', id: 'x', aid: 'a', v: -1 }, { k: 't', id: 'x', aid: 'b', v: 1 }, { k: 'f', id: 'n1', aid: 'a', v: 1 }, null, { k: 't', id: 'x' }];
  const T = P.tallyVotes(arr);
  assert.deepStrictEqual([T['t:x'].agree, T['t:x'].disagree, T['t:x'].total], [1, 1, 2]);
  assert.strictEqual(T['t:x'].byAid.a, -1);
  assert.strictEqual(T['f:n1'].total, 1);
  assert.strictEqual(P.pctOf(T['t:x']), null, 'sotto 20 voti niente percentuale');
  const many = Array.from({ length: 20 }, (_, i) => ({ k: 't', id: 'y', aid: 'u' + i, v: i < 13 ? 1 : -1 }));
  assert.deepStrictEqual(P.pctOf(P.tallyVotes(many)['t:y']), { agree: 65, disagree: 35, total: 20 });
});

t('vero o falso dai dati veri: affermazioni giuste e sbagliate, la sbagliata non è mai vera per caso', () => {
  const facts = P.makeFacts({ drivers: F1.DRIVER_DATA, circuits: CI });
  assert.ok(facts.length >= 40, 'tante domande: ' + facts.length);
  assert.ok(facts.some(f => f.truth) && facts.some(f => !f.truth));
  const monza = facts.filter(f => /Monza/.test(f.text));
  assert.ok(monza.length >= 2, 'domande su Monza');
  const lenTrue = facts.find(f => f.id === 'len:it-1922:v');
  assert.ok(lenTrue && lenTrue.truth && /5,793 km/.test(lenTrue.text), JSON.stringify(lenTrue));
  facts.filter(f => !f.truth).forEach(f => assert.ok(f.note && f.note.length > 5, 'la spiegazione dice il valore vero: ' + f.id));
  const nor = facts.find(f => f.id === 'titles:norris:v');
  assert.ok(nor && /1 mondiale/.test(nor.text), JSON.stringify(nor));
  assert.strictEqual(P.pickFact(facts, 'a'), P.pickFact(facts, 'a'), 'lo stesso mazzo, la stessa domanda');
});

t('serie per GP: un giro nel weekend conta; un GP saltato usa un pit stop; ogni 5 giri un pit stop (massimo 2)', () => {
  const rounds = ['r1', 'r2', 'r3', 'r4', 'r5'];
  let s = P.streakAfterDeck(undefined, { round: 'r1', rounds });
  assert.deepStrictEqual([s.n, s.last, s.pits, s.decks], [1, 'r1', 0, 1]);
  s = P.streakAfterDeck(s, { round: 'r1', rounds });
  assert.strictEqual(s.n, 1, 'stesso GP: la serie non sale');
  s = P.streakAfterDeck(s, { round: 'r2', rounds });
  assert.strictEqual(s.n, 2);
  s = { ...s, pits: 1 };
  s = P.streakAfterDeck(s, { round: 'r4', rounds });
  assert.deepStrictEqual([s.n, s.pits], [3, 0], 'r3 saltato: pit stop usato');
  s = P.streakAfterDeck({ n: 3, last: 'r1', pits: 0, decks: 9 }, { round: 'r4', rounds });
  assert.deepStrictEqual([s.n, s.pits, s.decks], [1, 1, 10], 'due GP saltati senza pit stop: si riparte; il 10° giro dà un pit stop');
  assert.strictEqual(P.streakAfterDeck({ n: 1, last: 'r1', pits: 2, decks: 4 }, { round: 'r1', rounds }).pits, 2, 'massimo 2');
  assert.deepStrictEqual(P.streakNow({ n: 4, last: 'r2', pits: 0 }, { round: 'r3', rounds }), { n: 4, danger: true });
  assert.deepStrictEqual(P.streakNow({ n: 4, last: 'r1', pits: 0 }, { round: 'r3', rounds }), { n: 0, danger: false });
  assert.deepStrictEqual(P.streakNow({ n: 4, last: 'r1', pits: 1 }, { round: 'r3', rounds }), { n: 4, danger: true });
  assert.deepStrictEqual(P.streakNow({ n: 4, last: 'r3', pits: 0 }, { round: 'r3', rounds }), { n: 4, danger: false });
});

t('GP del momento: dal lunedì dopo un GP fino al lunedì dopo il successivo', () => {
  const races = [{ id: 'r18', date: '2026-10-25' }, { id: 'r19', date: '2026-11-01' }, { id: 'r20', date: '2026-11-21' }];
  assert.strictEqual(P.roundOf(races, at('2026-10-27T10:00:00Z')), 'r19');
  assert.strictEqual(P.roundOf(races, at('2026-11-01T20:00:00Z')), 'r19');
  assert.strictEqual(P.roundOf(races, at('2026-11-02T20:00:00Z')), 'r19', 'il lunedì conta ancora');
  assert.strictEqual(P.roundOf(races, at('2026-11-03T10:00:00Z')), 'r20');
  assert.strictEqual(P.roundOf(races, at('2026-12-30T10:00:00Z')), null, 'stagione finita');
});

t('missioni: 3 a settimana, sempre le stesse nella stessa settimana; contatori che ripartono il lunedì', () => {
  const w = P.weekKey(at('2026-11-01T10:00:00Z'));
  assert.strictEqual(w, '2026-W44');
  assert.strictEqual(P.weekKey(at('2026-11-02T10:00:00Z')), '2026-W45');
  const m = P.missionsFor(w);
  assert.strictEqual(m.length, 3);
  assert.deepStrictEqual(P.missionsFor(w).map(x => x.id), m.map(x => x.id));
  assert.strictEqual(new Set(m.map(x => x.id)).size, 3);
  let ws = P.bumpWeek(undefined, 'box', 2, w);
  ws = P.bumpWeek(ws, 'box', 1, w);
  assert.deepStrictEqual(ws, { key: w, c: { box: 3 } });
  assert.deepStrictEqual(P.bumpWeek(ws, 'box', 1, '2026-W45'), { key: '2026-W45', c: { box: 1 } }, 'settimana nuova');
  const st = P.missionStatus({ key: w, c: { decks: 3, box: 1, votes: 9, tfOk: 0, radio: 1, pit: 1, fast: 0, pred: 2 } }, w);
  st.forEach(x => { assert.ok(x.goal >= 1 && typeof x.text === 'string'); assert.strictEqual(x.done, x.value >= x.goal); });
  assert.deepStrictEqual(P.missionStatus({ key: '2026-W40', c: { decks: 9 } }, w).map(x => x.value), [0, 0, 0], 'contatori di un\'altra settimana: zero');
});

t('livello del tifoso: punti da giri, risposte, voti, box, missioni e trofei', () => {
  const xp = P.xpOf({ decks: 3, tfOk: 2, votes: 5, box: 4, missions: 1 }, 2);
  assert.strictEqual(xp, 3 * 10 + 2 * 5 + 5 * 2 + 4 + 30 + 2 * 50);
  assert.deepStrictEqual(P.levelOf(0).name, 'Kart');
  const l = P.levelOf(184);
  assert.deepStrictEqual([l.name, l.nextName, l.toNext], ['Rookie', 'Pilota titolare', 116]);
  assert.ok(l.frac > 0.4 && l.frac < 0.5, String(l.frac));
  assert.strictEqual(P.levelOf(99999).nextName, null);
});

t('stessa strategia: opinioni votate uguali tra due tifosi', () => {
  const T = P.tallyVotes([{ k: 't', id: 'a', aid: 'me', v: 1 }, { k: 't', id: 'a', aid: 'm', v: 1 }, { k: 't', id: 'b', aid: 'me', v: 1 }, { k: 't', id: 'b', aid: 'm', v: -1 },
    { k: 't', id: 'c', aid: 'me', v: -1 }, { k: 'f', id: 'n', aid: 'me', v: 1 }, { k: 'f', id: 'n', aid: 'm', v: 1 }]);
  assert.deepStrictEqual(P.sameStrategy(T, 'me', 'm'), { same: 1, both: 2 });
});

t('pioggia vera: solo se la previsione dell\'ora di adesso dice pioggia', () => {
  const fc = { hours: [{ t: '2026-11-01T19:00:00Z', step: 1, rain: 0, sym: 'cloudy' }, { t: '2026-11-01T20:00:00Z', step: 1, rain: 1.4, sym: 'rain' }, { t: '2026-11-01T21:00:00Z', step: 6, rain: 0, sym: 'lightrainshowers_night' }] };
  assert.strictEqual(P.rainingNow(fc, at('2026-11-01T19:30:00Z')), false);
  assert.strictEqual(P.rainingNow(fc, at('2026-11-01T20:30:00Z')), true);
  assert.strictEqual(P.rainingNow(fc, at('2026-11-02T01:00:00Z')), true, 'dal simbolo');
  assert.strictEqual(P.rainingNow(fc, at('2026-11-02T05:00:00Z')), false, 'fuori dalla previsione');
  assert.strictEqual(P.rainingNow(null, 1), false);
});

console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
