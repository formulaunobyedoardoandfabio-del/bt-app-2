// Prove delle previsioni meteo del weekend (src/services/meteo.js e la funzione su Vercel api/meteo.js), con una risposta
// vera di MET Norway per il Circuit of the Americas (24/10, test/fixtures/met-cota.json).
// Uso: node test/unit/meteo.test.js [filtro]
const assert = require('assert');
const M = require('../../src/services/meteo');
const MET = require('../fixtures/met-cota.json');
const INFO = require('../../src/data/circuit-info.json');
const F1 = require('../../src/data/f1-2026');

const NOW = Date.parse('2026-10-24T21:30:00Z');
const memStore = () => { const m = new Map(); return { get: k => (m.has(k) ? JSON.parse(m.get(k)) : null), set: (k, v) => m.set(k, JSON.stringify(v)) }; };

let pass = 0, fail = 0;
const tests = [];
const t = (name, fn) => tests.push([name, fn]);

t('meteo: dalla risposta di MET Norway le ore con temperatura, vento in km/h, pioggia e cielo', () => {
  const fc = M.shapeForecast(MET);
  assert.strictEqual(fc.updated, '2026-10-24T19:17:01Z');
  assert.ok(fc.hours.length > 60);
  const h0 = fc.hours[0];
  // 21/11: anche la direzione del vento (da dove soffia, gradi) per la freccia di "Pioggia a breve"
  assert.deepStrictEqual(h0, { t: '2026-10-24T21:00:00Z', step: 1, temp: 28.8, wind: 17, dir: 128, hum: 41, rain: 0, sym: 'partlycloudy_day' });
  assert.ok(fc.hours.some(h => h.step === 6), 'dopo 2-3 giorni MET dà le previsioni ogni 6 ore');
  assert.strictEqual(M.shapeForecast({}), null);
  assert.strictEqual(M.shapeForecast({ properties: { timeseries: [] } }), null);
});

// 21/11 (piano claude/multiviewer-in-sector4.md, "Pioggia a breve" al posto del radar di MultiViewer): le prossime 6
// ore (solo le voci di un'ora), freccia del vento verso dove soffia, riga della sessione che parte in quell'ora; si vede
// solo nei giorni della gara (una sessione entro 24 ore, o iniziata da meno di 3).
t('pioggia a breve: prossime 6 ore, vento, riga della sessione, solo nei giorni della gara', () => {
  const fc = M.shapeForecast(MET);
  const r = M.shortTerm(fc, [{ key: 'RACE', utc: '2026-10-24T23:10:00Z' }], NOW);
  assert.strictEqual(r.visible, true);
  assert.deepStrictEqual(r.rows.map(h => h.t.slice(11, 13)), ['21', '22', '23', '00', '01', '02']);
  assert.ok(r.rows.every(h => h.step === 1));
  assert.strictEqual(r.rows[0].to, 308, 'vento da 128° → freccia verso 308°');
  assert.strictEqual(r.hi, 2); assert.strictEqual(r.hiKey, 'RACE');
  const late = M.shortTerm(fc, [{ key: 'RACE', utc: '2026-10-25T20:00:00Z' }], NOW);
  assert.strictEqual(late.visible, true, 'gara domani entro 24 ore'); assert.strictEqual(late.hi, -1, 'fuori dalle 6 ore: nessuna riga evidenziata');
  assert.strictEqual(M.shortTerm(fc, [{ key: 'RACE', utc: '2026-10-28T20:00:00Z' }], NOW).visible, false, 'gara tra 4 giorni: niente tabella');
  assert.strictEqual(M.shortTerm(fc, [{ key: 'RACE', utc: '2026-10-24T19:00:00Z' }], NOW).visible, true, 'iniziata da 2 ore e mezza');
  assert.strictEqual(M.shortTerm(null, [{ key: 'RACE', utc: '2026-10-24T23:10:00Z' }], NOW).visible, false);
});

t('meteo: ogni circuito del calendario ha le coordinate (al massimo 4 decimali, come chiede MET)', () => {
  F1.CIRCUIT_IDS.forEach(id => {
    const c = M.CIRCUIT_COORDS[id];
    assert.ok(Array.isArray(c) && c.length === 2, 'manca ' + id);
    assert.ok(Math.abs(c[0]) <= 90 && Math.abs(c[1]) <= 180, id);
    c.forEach(v => assert.ok(String(v).split('.')[1] === undefined || String(v).split('.')[1].length <= 4, id + ' ' + v));
  });
  assert.deepStrictEqual(M.CIRCUIT_COORDS['us-2012'], [30.1328, -97.6411]);
});

t('meteo: la previsione di ogni sessione del weekend degli Stati Uniti (quelle già finite no)', () => {
  const fc = M.shapeForecast(MET);
  const out = M.sessionForecast(fc, INFO['us-2012'].weekend, NOW);
  assert.deepStrictEqual(out.map(x => x.key), ['FP1', 'FP2', 'FP3', 'QUALI', 'RACE']);
  assert.strictEqual(out[0].fc, null);               // FP1 di venerdì: già finita
  assert.strictEqual(out[2].fc, null);               // FP3 di sabato: già finita
  assert.ok(out[3].fc && out[3].fc.t === '2026-10-24T21:00:00Z', 'le qualifiche (21:00) sono in corso: ' + JSON.stringify(out[3]));
  const race = out[4].fc;
  assert.ok(race && race.t === '2026-10-25T20:00:00Z' && race.step === 1, JSON.stringify(race));
  assert.strictEqual(typeof race.temp, 'number');
  assert.ok(['sun', 'moon', 'cloud-sun', 'cloud-moon', 'cloud', 'rain'].includes(M.skyOf(race.sym)));
});

t('meteo: icone del cielo dai simboli di MET', () => {
  assert.strictEqual(M.skyOf('clearsky_day'), 'sun');
  assert.strictEqual(M.skyOf('fair_night'), 'moon');
  assert.strictEqual(M.skyOf('partlycloudy_day'), 'cloud-sun');
  assert.strictEqual(M.skyOf('partlycloudy_night'), 'cloud-moon');
  assert.strictEqual(M.skyOf('cloudy'), 'cloud');
  assert.strictEqual(M.skyOf('fog'), 'cloud');
  assert.strictEqual(M.skyOf('lightrainshowers_day'), 'rain');
  assert.strictEqual(M.skyOf('heavyrainandthunder'), 'rain');
  assert.strictEqual(M.skyOf(undefined), null);
});

t('meteo nel telefono: si chiede alla funzione su Vercel al massimo ogni 30 minuti; senza rete null', async () => {
  const fc = M.shapeForecast(MET), calls = [];
  const ok = async url => { calls.push(url); return { ok: true, status: 200, json: async () => ({ circuitId: 'us-2012', source: 'MET Norway', ...fc }) }; };
  const store = memStore();
  let now = NOW;
  const W = M.createMeteo({ fetch: ok, now: () => now, store });
  const a = await W.forecast('us-2012');
  assert.strictEqual(calls[0], 'https://bt-app-2.vercel.app/api/meteo?c=us-2012');
  assert.strictEqual(a.hours.length, fc.hours.length);
  now += 20 * 60000; await W.forecast('us-2012');
  assert.strictEqual(calls.length, 1);
  now += 15 * 60000; await W.forecast('us-2012');
  assert.strictEqual(calls.length, 2);
  const down = async () => { throw new TypeError('Failed to fetch'); };
  assert.strictEqual(await M.createMeteo({ fetch: down, now: () => NOW }).forecast('us-2012'), null);
  assert.strictEqual(await M.createMeteo({ fetch: ok, now: () => NOW }).forecast('pista-inventata'), null);
  const bad = async () => ({ ok: true, status: 200, json: async () => ({ hours: 'no' }) });
  assert.strictEqual(await M.createMeteo({ fetch: bad, now: () => NOW }).forecast('us-2012'), null);
});

t('funzione api/meteo: chiede a MET Norway con il nome dell\'app e risponde con le ore, in cache fino a "Expires"', async () => {
  const handler = require('../../api/meteo');
  const seen = [];
  global.fetch = async (url, opts) => { seen.push({ url, ua: opts && opts.headers && opts.headers['User-Agent'] }); return { ok: true, status: 200, headers: { get: k => (k.toLowerCase() === 'expires' ? new Date(Date.now() + 25 * 60000).toUTCString() : null) }, json: async () => MET }; };
  const res = () => { const r = { code: 0, headers: {}, body: null }; r.setHeader = (k, v) => { r.headers[k.toLowerCase()] = v; }; r.status = c => { r.code = c; return r; }; r.json = b => { r.body = b; return r; }; return r; };
  const r1 = res();
  await handler({ query: { c: 'us-2012' } }, r1);
  assert.strictEqual(r1.code, 200);
  assert.strictEqual(seen[0].url, 'https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=30.1328&lon=-97.6411');
  assert.ok(/^Sector4\/2\.0 /.test(seen[0].ua), 'User-Agent: ' + seen[0].ua);
  assert.strictEqual(r1.headers['access-control-allow-origin'], '*');
  const sm = /s-maxage=(\d+)/.exec(r1.headers['cache-control'] || '');
  assert.ok(sm && +sm[1] >= 1400 && +sm[1] <= 1500, 'cache: ' + r1.headers['cache-control']);
  assert.strictEqual(r1.body.circuitId, 'us-2012');
  assert.strictEqual(r1.body.hours[0].temp, 28.8);
  // Circuito che non c'è: niente richiesta a MET
  const r2 = res();
  await handler({ query: { c: 'x' } }, r2);
  assert.strictEqual(r2.code, 400);
  assert.strictEqual(seen.length, 1);
  // MET non risponde: errore, niente cache
  global.fetch = async () => { throw new TypeError('Failed to fetch'); };
  const r3 = res();
  await handler({ query: { c: 'us-2012' } }, r3);
  assert.strictEqual(r3.code, 502);
  assert.strictEqual(r3.headers['cache-control'], 'no-store');
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
