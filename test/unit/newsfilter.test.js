// Prove dei filtri delle notizie (Tappa 3, G09-G10; src/logic/newsfilter.js): le gomme (Soft = ultime 24 ore, Medium =
// tutte tranne approfondimenti e meteo, Hard = approfondimenti, Intermedia = meteo) e la corsia dei box (Tutte,
// Scuderie, Piloti, Tecnica). Gira in Node.
// Uso: node test/unit/newsfilter.test.js [filtro]
const assert = require('assert');
const path = require('path');
const { filterNews, TYRES, LANES } = require(path.join(__dirname, '..', '..', 'src', 'logic', 'newsfilter.js'));

const NOW = Date.parse('2026-10-07T10:00:00Z');
// Ora italiana senza fuso, come le scrive l'app: 10:00Z = 12:00 in Italia (ora legale).
const A = [
  { id: 'analisi', cat: 'ANALISI', date: '2026-10-01T10:00:00' },
  { id: 'meteo', cat: 'METEO', date: '2026-10-07T09:30:00' },          // 2,5 ore prima
  { id: 'piloti', cat: 'PILOTI', date: '2026-10-02T10:00:00' },
  { id: 'scuderie', cat: 'Scuderie', date: '2026-10-03T10:00:00' },     // maiuscole o minuscole non contano
  { id: 'tecnica', cat: 'TECNICA', date: '2026-10-06T13:00:00' },      // 23 ore prima
  { id: 'gara', cat: 'GARA', date: '2026-10-07T11:59:00' },            // un minuto prima
  { id: 'ieri', cat: 'NEWS', date: '2026-10-06T11:59:00' },            // 24 ore e un minuto prima
  { id: 'senza-data', cat: 'NEWS', date: '' },
];
const ids = list => list.map(a => a.id).sort().join(',');
const f = o => ids(filterNews(A, { now: NOW, ...o }));

const tests = {
  'soft: ultime 24 ore'() {
    assert.strictEqual(f({ tyre: 'soft' }), 'gara,meteo,tecnica');
  },
  'medium: tutte tranne ANALISI e METEO'() {
    assert.strictEqual(f({ tyre: 'medium' }), 'gara,ieri,piloti,scuderie,senza-data,tecnica');
  },
  'hard: ANALISI'() {
    assert.strictEqual(f({ tyre: 'hard' }), 'analisi');
  },
  'inter: METEO'() {
    assert.strictEqual(f({ tyre: 'inter' }), 'meteo');
  },
  'lane: SCUDERIE, PILOTI, TECNICA'() {
    assert.strictEqual(f({ lane: 'teams' }), 'scuderie');
    assert.strictEqual(f({ lane: 'drivers' }), 'piloti');
    assert.strictEqual(f({ lane: 'tech' }), 'tecnica');
    assert.strictEqual(f({ lane: 'all' }), ids(A), 'Tutte: nessun filtro');
    assert.strictEqual(f({}), ids(A), 'senza gomma e corsia: tutte');
    assert.strictEqual(f({ tyre: null, lane: 'nessuna' }), ids(A), 'una corsia che non c\'è non toglie niente');
  },
  'gomma e corsia insieme'() {
    assert.strictEqual(f({ tyre: 'soft', lane: 'tech' }), 'tecnica');
    assert.strictEqual(f({ tyre: 'medium', lane: 'drivers' }), 'piloti');
    assert.strictEqual(f({ tyre: 'hard', lane: 'drivers' }), '');
    assert.deepStrictEqual(TYRES.map(t => t.id), ['soft', 'medium', 'hard', 'inter']);
    assert.deepStrictEqual(LANES.map(l => l.id), ['all', 'teams', 'drivers', 'tech']);
    assert.deepStrictEqual(filterNews(null, { tyre: 'soft', now: NOW }), [], 'senza notizie');
    const order = filterNews(A, { tyre: 'medium', now: NOW }).map(a => a.id);
    assert.deepStrictEqual(order, A.filter(a => !['ANALISI', 'METEO'].includes(a.cat)).map(a => a.id), 'l\'ordine resta quello di prima');
  },
};

let pass = 0, fail = 0;
const filter = process.argv[2] ? new RegExp(process.argv[2], 'i') : null;
for (const [name, fn] of Object.entries(tests)) {
  if (filter && !filter.test(name)) continue;
  try { fn(); pass++; console.log('PASS  ' + name); }
  catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + String(e.message).split('\n')[0].slice(0, 300)); }
}
console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
