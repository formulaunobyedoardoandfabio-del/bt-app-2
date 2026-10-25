// Prove dei dati F1 che si aggiornano da soli (src/services/f1data.js) con i file veri generati da
// tools/make_live_data.py (public/data/f1: Ghost Lap di Austin e Singapore, gare fino a Singapore, qualifiche fino ad Austin).
// Uso: node test/unit/f1data.test.js [filtro]
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const D = require('../../src/services/f1data');
const DIR = path.join(__dirname, '../../public/data/f1');
const file = f => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
const NOW = Date.parse('2026-10-25T08:00:00Z');

function fakeFetch({ fail = false } = {}) {
  const calls = [];
  const f = async url => {
    calls.push(url.replace(D.BASE, ''));
    if (fail) throw new TypeError('Failed to fetch');
    const name = url.replace(D.BASE, '').split('?')[0];
    if (!fs.existsSync(path.join(DIR, name))) return { ok: false, status: 404, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => file(name) };
  };
  f.calls = calls;
  return f;
}
const memStore = () => { const m = new Map(); return { get: k => (m.has(k) ? JSON.parse(m.get(k)) : null), set: (k, v) => m.set(k, JSON.stringify(v)), del: k => m.delete(k), m }; };

let pass = 0, fail = 0;
const tests = [];
const t = (name, fn) => tests.push([name, fn]);

t('dati F1: indice, gare e qualifiche e il Ghost Lap delle ultime qualifiche (Austin)', async () => {
  const f = fakeFetch();
  const r = await D.createF1Data({ fetch: f, now: () => NOW }).refresh();
  assert.deepStrictEqual(f.calls, ['index.json', 'weekend.json', 'ghost-us-2012.json', 'ghost-sg-2008.json']);
  assert.strictEqual(r.weekend.races[r.weekend.races.length - 1].circuitId, 'sg-2008');
  assert.ok(r.weekend.quali.some(q => q.circuitId === 'us-2012'));
  assert.ok(r.weekend.practice['us-2012'] && r.weekend.practice['us-2012'].FP1);
  assert.deepStrictEqual(r.ghosts.map(g => [g.id, g.circuitId, g.place]), [['us-2012-2026-q', 'us-2012', 'Austin'], ['sg-2008-2026-q', 'sg-2008', 'Singapore']]);
  assert.strictEqual(Object.keys(r.ghosts[0].data.laps)[0], 'ANT');
});

t('dati F1: si riscarica solo quello che è cambiato; indice al massimo ogni 15 minuti', async () => {
  const store = memStore();
  let now = NOW;
  const f = fakeFetch();
  const A = D.createF1Data({ fetch: f, now: () => now, store });
  await A.refresh();
  assert.strictEqual(f.calls.length, 4);
  now += 10 * 60000; await A.refresh();
  assert.strictEqual(f.calls.length, 4, 'dopo 10 minuti niente');
  now += 10 * 60000; const r = await A.refresh();
  assert.deepStrictEqual(f.calls.slice(4), ['index.json'], 'stesse impronte: solo l\'indice');
  assert.strictEqual(r.ghosts.length, 2);
  // Un'altra apertura dell'app: tutto dalla memoria del telefono
  const f2 = fakeFetch();
  const r2 = await D.createF1Data({ fetch: f2, now: () => now + 60000, store }).refresh();
  assert.strictEqual(f2.calls.length, 0);
  assert.strictEqual(r2.weekend.races.length, r.weekend.races.length);
});

t('dati F1: senza rete restano quelli salvati; senza niente null (l\'app usa quelli dentro l\'APK)', async () => {
  assert.strictEqual(await D.createF1Data({ fetch: fakeFetch({ fail: true }), now: () => NOW }).refresh(), null);
  const store = memStore();
  await D.createF1Data({ fetch: fakeFetch(), now: () => NOW, store }).refresh();
  const r = await D.createF1Data({ fetch: fakeFetch({ fail: true }), now: () => NOW + 3600000, store }).refresh();
  assert.ok(r && r.weekend && r.ghosts.length === 2);
});

t('dati F1: file strani non si usano', async () => {
  const bad = async url => ({ ok: true, status: 200, json: async () => (url.includes('index') ? { weekend: { h: 'x' }, ghosts: [{ id: 'a', circuitId: 'us-2012', h: 'y' }] } : { races: 'no' }) });
  const r = await D.createF1Data({ fetch: bad, now: () => NOW }).refresh();
  assert.strictEqual(r, null);
  assert.strictEqual(D.validWeekend({ races: [], quali: [], practice: {} }), true);
  assert.strictEqual(D.validGhost({ id: 'x', circuitId: 'us-2012', laps: { ANT: { d: [0], t: [0], v: [0], x: [0], y: [0] } } }), false, 'serve più di un pilota');
});

t('dati F1: aggiornare i dati dell\'app (gare, prove, Ghost Lap) senza perdere quelli dentro l\'APK', async () => {
  const r = await D.createF1Data({ fetch: fakeFetch(), now: () => NOW }).refresh();
  const W = { races: [{ round: 1 }], quali: [], practice: { 'az-2016': { FP1: {} } } }, G = { baku2026q: { laps: {} }, guide: {} };
  const sessions = [['baku2026q', 'Baku']], circuit = { baku2026q: 'az-2016' };
  const changed = D.apply(r, { weekend: W, ghostData: G, ghostSessions: sessions, ghostCircuit: circuit });
  assert.strictEqual(changed, true);
  assert.strictEqual(W.races.length, 17);
  assert.ok(W.practice['az-2016'] && W.practice['us-2012']);
  assert.deepStrictEqual(sessions.map(s => s[1]), ['Austin', 'Singapore', 'Baku']);
  assert.strictEqual(circuit['us-2012-2026-q'], 'us-2012');
  assert.ok(G['us-2012-2026-q'].laps.ANT && G.baku2026q);
  assert.strictEqual(D.apply(r, { weekend: W, ghostData: G, ghostSessions: sessions, ghostCircuit: circuit }), false, 'di nuovo uguale: niente cambia');
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
