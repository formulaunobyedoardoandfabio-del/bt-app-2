// Notizie automatiche (8/11, Edoardo: "rendi automatico tutto"): dopo qualifica, Sprint e gara una notizia scritta
// dall'app coi risultati veri (Jolpica). Uso: node test/unit/auto-news.test.js
const assert = require('assert');
const N = require('../../src/logic/auto-news');
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('PASS  ' + name); } catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); } };

const NAMES = { russell: 'George Russell', antonelli: 'Andrea Kimi Antonelli', leclerc: 'Charles Leclerc', hamilton: 'Lewis Hamilton', norris: 'Lando Norris' };
const TEAMS = { russell: 'Mercedes', antonelli: 'Mercedes', leclerc: 'Ferrari', hamilton: 'Ferrari', norris: 'McLaren' };
const opt = { name: id => NAMES[id], team: id => TEAMS[id], now: Date.parse('2026-11-09T10:00:00Z') };
const races = [
  { id: 'r19', round: 19, name: 'GP del Messico', circuitId: 'mx-1962', date: '2026-10-25T20:00:00Z' },
  { id: 'r20', round: 20, name: 'GP del Brasile', circuitId: 'br-1940', date: '2026-11-08T17:00:00Z' },
];
const WK = { 'br-1940': [{ key: 'QUALI', utc: '2026-11-07T18:00Z' }, { key: 'RACE', utc: '2026-11-08T17:00Z' }] };
const order = ids => ids.map((id, i) => ({ id, pos: i + 1, dnf: false }));
const rounds = [
  { round: 19, quali: { order: order(['norris', 'leclerc', 'russell']) }, race: { order: order(['norris', 'leclerc', 'russell']), fastest: 'norris' }, sprint: null },
  { round: 20, quali: { order: order(['russell', 'antonelli', 'leclerc']) }, race: { order: [...order(['antonelli', 'russell', 'leclerc', 'norris']), { id: 'hamilton', pos: null, dnf: true }], fastest: 'russell' }, sprint: null },
];

t('gara: vincitore nel titolo, podio e giro veloce, ordine d\'arrivo e ritirati nel testo', () => {
  const list = N.autoNews(rounds, races, { ...opt, weekendOf: c => WK[c] });
  const g = list.find(a => a.id === 'auto-r-20');
  assert.ok(g, JSON.stringify(list.map(a => a.id)));
  assert.strictEqual(g.title, 'Antonelli vince il GP del Brasile');
  assert.ok(/Russell/.test(g.excerpt) && /Leclerc/.test(g.excerpt) && /giro più veloce/i.test(g.excerpt), g.excerpt);
  assert.ok(/1\. Andrea Kimi Antonelli \(Mercedes\)/.test(g.body) && /Ritirati: Lewis Hamilton/.test(g.body), g.body);
  assert.strictEqual(g.cat, 'GARA');
  assert.strictEqual(g.premium, false);
  assert.strictEqual(g.auto, true);
  assert.deepStrictEqual(g.circuits, ['br-1940']);
  assert.strictEqual(g.date, new Date(Date.parse('2026-11-08T17:00Z') + 2 * 3600e3).toISOString(), 'data: fine gara dal calendario');
});

t('qualifica: pole nel titolo e prima fila', () => {
  const q = N.autoNews(rounds, races, { ...opt, weekendOf: c => WK[c] }).find(a => a.id === 'auto-q-20');
  assert.strictEqual(q.title, 'Russell in pole al GP del Brasile');
  assert.ok(/Antonelli/.test(q.excerpt), q.excerpt);
  assert.strictEqual(q.date, new Date(Date.parse('2026-11-07T18:00Z') + 3600e3).toISOString());
});

t('solo le più recenti (l\'ultimo weekend e la gara prima), dalla più nuova; senza risultati niente', () => {
  const list = N.autoNews(rounds, races, { ...opt, weekendOf: c => WK[c] });
  assert.deepStrictEqual(list.map(a => a.id), ['auto-r-20', 'auto-q-20', 'auto-r-19']);
  assert.deepStrictEqual(N.autoNews([], races, opt), []);
  assert.deepStrictEqual(N.autoNews(null, null, opt), []);
});

t('Sprint: notizia propria; pilota senza nome noto = round saltato senza errori', () => {
  const sp = [{ round: 20, quali: null, race: null, sprint: { order: order(['leclerc', 'norris']), fastest: null } }];
  const s = N.autoNews(sp, races, { ...opt, weekendOf: () => null });
  assert.strictEqual(s[0].id, 'auto-s-20');
  assert.strictEqual(s[0].title, 'Leclerc vince la Sprint del GP del Brasile');
  const bad = N.autoNews([{ round: 20, race: { order: order(['ignoto']) } }], races, { ...opt, name: () => null });
  assert.deepStrictEqual(bad, []);
});

console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
