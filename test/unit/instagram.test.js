// Prove della pagina Instagram rinnovata (25/10; src/logic/instagram.js): numeri scritti dall'admin ("12,3K",
// "1.200"), ultimo reel, reel "NUOVO", classifica dei più visti (del mese, se ci sono le date). Gira in Node.
// Uso: node test/unit/instagram.test.js [filtro]
const assert = require('assert');
const path = require('path');
const IG = require(path.join(__dirname, '..', '..', 'src', 'logic', 'instagram.js'));
const C = require(path.join(__dirname, '..', '..', 'src', 'services', 'compat.js'));

const NOW = Date.parse('2026-10-25T12:00:00Z');
const v = (id, extra = {}) => ({ id, title: 'Reel ' + id, views: '', likes: '', thumb: '', url: '', desc: '', date: '', ...extra });

const tests = {
  'numeri come li scrive l\'admin'() {
    const cases = [['1200', 1200], ['1.200', 1200], ['12,3K', 12300], ['12.3k', 12300], ['1,2M', 1200000], ['1.5 mln', 1500000],
      ['950', 950], [4500, 4500], ['  ', null], ['', null], [null, null], ['tanti', null], ['-3', null], ['10.500.000', 10500000]];
    cases.forEach(([s, n]) => assert.strictEqual(IG.parseCount(s), n, JSON.stringify(s)));
  },

  'numeri brevi per lo schermo'() {
    assert.strictEqual(IG.shortCount(950), '950');
    assert.strictEqual(IG.shortCount(12300), '12,3K');
    assert.strictEqual(IG.shortCount(12000), '12K');
    assert.strictEqual(IG.shortCount(1250000), '1,3M');
    assert.strictEqual(IG.shortCount(null), null);
  },

  'ultimo reel: quello con la data più recente, altrimenti l\'ultimo aggiunto'() {
    assert.strictEqual(IG.latestReel([], NOW), null);
    assert.strictEqual(IG.latestReel([v('a'), v('b'), v('c')], NOW).id, 'c');
    const list = [v('a', { date: '2026-10-20' }), v('b', { date: '2026-10-23' }), v('c')];
    assert.strictEqual(IG.latestReel(list, NOW).id, 'b');
    // Una data nel futuro (scritta male) non passa davanti a tutti.
    assert.strictEqual(IG.latestReel([...list, v('d', { date: '2027-01-01' })], NOW).id, 'b');
  },

  'NUOVO: uscito da 7 giorni o meno'() {
    assert.strictEqual(IG.isNew(v('a', { date: '2026-10-19' }), NOW), true);
    assert.strictEqual(IG.isNew(v('a', { date: '2026-10-17' }), NOW), false);
    assert.strictEqual(IG.isNew(v('a'), NOW), false);
  },

  'più visti: per visualizzazioni, al massimo 5; del mese se ce ne sono almeno 2 con la data'() {
    const all = [v('a', { views: '1.200' }), v('b', { views: '12,3K' }), v('c'), v('d', { views: '950' }), v('e', { views: '2K' }), v('f', { views: '3K' })];
    const t = IG.topReels(all, NOW);
    assert.strictEqual(t.month, false);
    assert.deepStrictEqual(t.list.map(x => x.id), ['b', 'f', 'e', 'a', 'd']);
    const dated = [v('a', { views: '9K', date: '2026-08-01' }), v('b', { views: '1K', date: '2026-10-20' }), v('c', { views: '3K', date: '2026-10-02' }), v('d', { views: '5K' })];
    const m = IG.topReels(dated, NOW);
    assert.strictEqual(m.month, true);
    assert.deepStrictEqual(m.list.map(x => x.id), ['c', 'b']);
    // Un solo reel del mese: la classifica è di tutti.
    const one = IG.topReels([v('a', { views: '9K', date: '2026-08-01' }), v('b', { views: '1K', date: '2026-10-20' })], NOW);
    assert.strictEqual(one.month, false);
    assert.deepStrictEqual(one.list.map(x => x.id), ['a', 'b']);
  },

  'Firebase: descrizione breve e data del reel (l\'app di oggi non le conosce e le lascia stare)'() {
    const doc = { followers: 1200, videos: [{ id: 'v1', title: 'T', thumbnail: '', views: '10', likes: '2', url: '', desc: '  Gara pazza a Monza  ', date: '2026-10-20' },
      { id: 'v2', title: 'U', desc: 'x'.repeat(80), date: '20/10/2026' }] };
    const ig = C.igFromStore(doc);
    assert.strictEqual(ig.videos[0].desc, 'Gara pazza a Monza');
    assert.strictEqual(ig.videos[0].date, '2026-10-20');
    assert.strictEqual(ig.videos[1].desc.length, 40);
    assert.strictEqual(ig.videos[1].date, '');
    const back = C.igToStore(ig);
    assert.strictEqual(back.videos[0].desc, 'Gara pazza a Monza');
    assert.strictEqual(back.videos[0].date, '2026-10-20');
    assert.strictEqual(back.videos[0].thumbnail, '');
  },
};

(async () => {
  let pass = 0, fail = 0;
  const filter = process.argv[2] ? new RegExp(process.argv[2], 'i') : null;
  for (const [name, fn] of Object.entries(tests)) {
    if (filter && !filter.test(name)) continue;
    try { await fn(); pass++; console.log('PASS  ' + name); }
    catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + String(e.message).split('\n')[0].slice(0, 300)); }
  }
  console.log(`\n${pass} passati, ${fail} falliti`);
  process.exit(fail ? 1 : 0);
})();
