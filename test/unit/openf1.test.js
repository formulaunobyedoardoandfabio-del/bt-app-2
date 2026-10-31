// Prove del servizio OpenF1 (src/services/openf1.js): richieste nei limiti gratuiti, sessione rivista dai dati veri
// e ultima gara. I dati sono la gara vera di Baku 2026 messa nella forma di OpenF1 (tools/make_openf1_fixture.py).
// Uso: node test/unit/openf1.test.js [filtro]
const assert = require('assert');
const { OF1_BASE, createOpenF1, buildReplay, lastRaceFromResult, sessionType } = require('../../src/services/openf1');
const LiveSim = require('../../src/logic/live-sim');
const W = require('../../src/logic/bt-weekend');
const F1 = require('../../src/data/f1-2026');
const CIRCUITS = require('../../src/data/circuits.json');
const FX = require('../fixtures/openf1-baku-race.json');
const CAR = require('../fixtures/openf1-car-data-rus-10.json');

let pass = 0, fail = 0;
const tests = [];
const t = (name, fn) => tests.push([name, fn]);

// Piloti dell'app come LIVE_DRIVERS di App.jsx: id, sigla (come driverCode), colore della scuderia.
const codeOf = full => full.split(' ').slice(-1)[0].normalize('NFD').replace(/[̀-ͯ]/g, '').slice(0, 3).toUpperCase();
const DRIVERS = F1.DRIVER_DATA.map(([id, , full, teamId]) => ({ id, code: codeOf(full), color: F1.TEAMS.find(x => x.id === teamId).color }));
const track = LiveSim.buildTrack(CIRCUITS['az-2016']);
const ctx = { drivers: DRIVERS, of1: null };
const RACES = F1.RACES;

// Orologio finto: sleep fa avanzare il tempo senza aspettare davvero.
function clock() { let ms = 1e9; return { now: () => ms, sleep: async d => { ms += Math.max(0, d); } }; }
const res = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const O = (fetchImpl, c = clock()) => createOpenF1({ fetchImpl, ...c });
const fetch401 = async () => res(401, { detail: 'Unauthorized' });
const always429 = async () => res(429, { detail: 'Too Many Requests' });
function make({ onCall, reply = () => res(200, []) } = {}) {
  const c = clock();
  return createOpenF1({ fetchImpl: async url => { if (onCall) onCall(c.now(), url); return reply(url); }, ...c });
}
const maxInWindow = (calls, w) => Math.max(0, ...calls.map(s => calls.filter(x => x >= s && x < s + w).length));
// of1 finto con solo carData: car_data filtrato per pilota e per data, come fa OpenF1.
const fakeCarData = list => ({ carData: async (sk, n, from, to) => list.filter(x => x.driver_number === n && x.date.slice(0, 23) >= from.slice(0, 23) && x.date.slice(0, 23) <= to.slice(0, 23)) });
// OpenF1 finto che risponde con le parti della fixture (path → elenco); registra gli indirizzi chiesti.
function fixtureFetch(session, urls) {
  const parts = { ...FX, sessions: [session] };
  return async url => { urls.push(url); const path = url.slice(OF1_BASE.length + 1).split('?')[0]; return res(200, parts[path] || []); };
}

t('sessione bloccata: errore locked', async () => {
  await assert.rejects(O(fetch401).get('laps', 'session_key=latest'), e => e.locked === true);
  await assert.rejects(O(async () => res(403, {})).get('laps', 'session_key=latest'), e => e.locked === true);
  await assert.rejects(O(async () => res(200, { detail: 'Access is restricted while a live F1 session in progress.' })).get('laps', ''), e => e.locked === true);
  await assert.rejects(O(async () => res(500, { detail: 'Internal error' })).get('laps', ''), e => e.locked === false && !!e.code);
});

// 31/10: con l'abbonamento, durante la sessione i dati arrivano dalla nostra funzione su Vercel (api/live.js).
t('sessione in corso: con liveBase la stessa richiesta passa da api/live (anche loadSession)', async () => {
  const urls = [];
  const c = clock();
  const of1 = createOpenF1({ ...c, liveBase: 'https://bt-app-2.vercel.app/api/live', fetchImpl: async url => {
    urls.push(url);
    if (url.startsWith('https://api.openf1.org')) return res(401, { detail: 'No access: a live F1 session in progress' });
    const path = (/[?&]p=([a-z_]+)/.exec(url) || [])[1];
    return res(200, path === 'sessions' ? [{ session_key: 9, session_name: 'Race', session_type: 'Race', date_start: '2026-11-01T20:00:00Z', date_end: '2026-11-01T22:00:00Z' }] : []);
  } });
  const live = await of1.get('laps', 'session_key=9', { live: true });
  assert.deepStrictEqual(live, []);
  assert.strictEqual(urls[urls.length - 1], 'https://bt-app-2.vercel.app/api/live?p=laps&session_key=9');
  await assert.rejects(of1.get('laps', 'session_key=9'), e => e.locked === true, 'senza live resta bloccato');
  const before = urls.length;
  const raw = await of1.loadSession(9, { live: true });
  assert.ok(raw && raw.session.session_key === 9);
  assert.ok(urls.slice(before).every(u => u.startsWith('https://bt-app-2.vercel.app/api/live?p=')), 'tutte da api/live: ' + urls.slice(before).join(' '));
});
t('limite: mai più di 3 richieste in un secondo né 30 in un minuto', async () => {
  const calls = [];
  const o = make({ onCall: ms => calls.push(ms) });
  for (let i = 0; i < 35; i++) await o.get('laps', '');
  assert.ok(maxInWindow(calls, 1000) <= 3 && maxInWindow(calls, 60000) <= 30, `in un secondo ${maxInWindow(calls, 1000)}, in un minuto ${maxInWindow(calls, 60000)}`);
  // anche con le richieste fatte tutte insieme
  const calls2 = [];
  const o2 = make({ onCall: ms => calls2.push(ms) });
  await Promise.all(Array.from({ length: 12 }, () => o2.get('laps', '')));
  assert.ok(maxInWindow(calls2, 1000) <= 3, 'richieste insieme: ' + maxInWindow(calls2, 1000));
});

t('429: riprova una volta, poi busy', async () => {
  await assert.rejects(O(always429).get('laps', ''), e => e.code === 'busy');
  const c = clock(), seen = [];
  let n = 0;
  const o = createOpenF1({ fetchImpl: async () => { seen.push(c.now()); return ++n === 1 ? res(429, {}) : res(200, [{ lap_number: 1 }]); }, ...c });
  assert.deepStrictEqual(await o.get('laps', ''), [{ lap_number: 1 }]);
  assert.ok(seen.length === 2 && seen[1] - seen[0] >= 20000, 'deve aspettare 20 s prima di riprovare: ' + (seen[1] - seen[0]));
});

t('nessun risultato (404 "No results found."): elenco vuoto, non un errore', async () => {
  assert.deepStrictEqual(await O(async () => res(404, { detail: 'No results found.' })).get('team_radio', 'session_key=1'), []);
  const o = O(async url => { if (!url.startsWith(OF1_BASE + '/sessions?session_key=latest')) throw new Error('indirizzo ' + url); return res(200, [FX.session]); });
  assert.strictEqual((await o.latestSession()).session_key, FX.session.session_key);
});

t('loadSession: tutte le parti con al massimo 11 richieste; intervals solo per la gara', async () => {
  const urls = [];
  const raw = await O(fixtureFetch(FX.session, urls)).loadSession(FX.session.session_key);
  assert.ok(urls.length <= 11, 'richieste: ' + urls.length);
  ['session', 'drivers', 'laps', 'stints', 'pit', 'position', 'intervals', 'race_control', 'team_radio', 'weather', 'session_result'].forEach(k => assert.ok(k in raw, 'manca ' + k));
  assert.strictEqual(raw.laps.length, FX.laps.length);
  assert.ok(urls.every(u => u.includes('session_key=' + FX.session.session_key)));
  const qurls = [];
  const q = await O(fixtureFetch({ ...FX.session, session_name: 'Qualifying', session_type: 'Qualifying' }, qurls)).loadSession(FX.session.session_key);
  assert.ok(!qurls.some(u => /\/intervals\?/.test(u)) && q.intervals.length === 0, 'in qualifica intervals non si chiede');
  assert.strictEqual(buildReplay(q, track, ctx).type, 'QUALI');
});

t('tipo della sessione dal nome: prove, Sprint, qualifiche e gara', () => {
  const pairs = [['Practice 1', 'FP1'], ['Practice 2', 'FP2'], ['Practice 3', 'FP3'], ['Sprint Qualifying', 'SQ'], ['Sprint Shootout', 'SQ'], ['Sprint', 'SPRINT'], ['Qualifying', 'QUALI'], ['Race', 'RACE']];
  pairs.forEach(([name, type]) => assert.strictEqual(sessionType({ session_name: name }), type, name));
});

t('Baku: alla fine vince Russell, 51 giri', () => {
  const r = buildReplay(FX, track, ctx);
  r.jumpTo(r.duration);
  const st = r.state();
  assert.strictEqual(st.cars[0].code, 'RUS');
  assert.strictEqual(st.totalLaps, 51);
  assert.strictEqual(r.source, 'openf1');
  assert.strictEqual(r.type, 'RACE');
  assert.strictEqual(st.cars[0].id, 'russell');
  assert.deepStrictEqual([st.cars[0].tyre, st.cars[0].tyreAge], ['S', 20]);   // Morbide montate usate (5 giri) al giro 37, poi 15 giri
  assert.deepStrictEqual(st.cars.slice(0, 3).map(c => c.code), ['RUS', 'VER', 'HAD']);
  assert.ok(st.finished && st.cars[0].finished, 'gara finita');
  assert.strictEqual(st.cars[1].gap, 0.232);   // distacco sulla linea all'ultimo giro (il risultato ufficiale dice +0.196)
  assert.ok(st.bestLap && st.bestLap.code === 'RUS' && st.bestLap.lapNo === 49 && st.bestLap.time === 104.916, 'giro più veloce: ' + JSON.stringify(st.bestLap));
  // il primo giro (con la partenza da fermo) non conta come giro più veloce, come nel simulatore
  const fast1 = buildReplay({ ...FX, laps: FX.laps.map(l => l.driver_number === 16 && l.lap_number === 1 ? { ...l, lap_duration: 100 } : l) }, track, ctx);
  assert.strictEqual(fast1.state().bestLap.lapNo, 49);
});

t('gomme come nella gara vera: Russell sulle Medie al giro 31', () => {
  const L = buildReplay(FX, track, ctx).laps('russell');
  assert.strictEqual(L.find(l => l.lapNo === 31).tyre, 'M');
  assert.strictEqual(L.find(l => l.lapNo === 31).pitIn, true);
  const l32 = L.find(l => l.lapNo === 32);
  assert.deepStrictEqual([l32.tyre, l32.age], ['S', 0]);
  assert.strictEqual(L.find(l => l.lapNo === 1).age, 2);   // Medie usate in qualifica (2 giri)
  assert.strictEqual(L.length, 51);
  const l10 = L.find(l => l.lapNo === 10);
  assert.ok(l10.minis.length === 24 && l10.minis.every(m => ['purple', 'green', 'yellow', 'pit', 'none'].includes(m)), 'minisettori: ' + l10.minis);
  assert.ok(l10.sectors.length === 3 && Math.abs(l10.sectors.reduce((a, s) => a + s.t, 0) - l10.time) < 0.01, 'settori del giro 10');
});

t('direzione gara: Safety Car con il giro', () => {
  const r = buildReplay(FX, track, ctx);
  r.jumpTo(r.duration);
  assert.ok(r.state().messages.some(m => /SAFETY CAR/i.test(m.text) && m.lap));
  const sc = r.state().messages.find(m => m.text === 'SAFETY CAR DEPLOYED');
  assert.strictEqual(sc.time, '15:58:05');   // ora di Baku
  r.jumpTo(sc.t + 30);
  assert.strictEqual(r.state().flag, 'sc');
  const clear = r.state().messages.length;
  r.jumpTo(r.state().messages.find(m => m.text === 'SAFETY CAR DEPLOYED').t - 60);
  assert.ok(r.state().messages.length < clear, 'i messaggi arrivano col tempo');
  // gialla nel minisettore 15 al giro 9: è il settore 2 (Baku: 8 + 10 + 9 minisettori)
  const y = r.state().messages.find(m => m.text === 'YELLOW IN TRACK SECTOR 15');
  r.jumpTo(y.t + 0.5);
  assert.deepStrictEqual([r.state().flag, r.state().flagSector], ['yellow', 2]);
  r.jumpTo(y.t + 60);
  assert.strictEqual(r.state().flag, 'green');
  r.jumpTo(r.duration);
  const y18 = r.state().messages.find(m => m.text === 'YELLOW IN TRACK SECTOR 18');   // minisettore 18: ultimo del settore 2
  r.jumpTo(y18.t + 0.3);
  assert.deepStrictEqual([r.state().flag, r.state().flagSector], ['yellow', 2]);
  // la Safety Car rientra con TRACK CLEAR
  r.jumpTo(r.duration);
  const end = r.state().messages.filter(m => m.text === 'TRACK CLEAR').pop();
  r.jumpTo(end.t - 5); const before = r.state().flag;
  r.jumpTo(end.t + 5);
  assert.deepStrictEqual([before, r.state().flag], ['sc', 'green']);
});

t('elenchi vuoti: nessun errore e zero vetture', () => {
  const r = buildReplay({ ...FX, laps: [], position: [], intervals: [], stints: [] }, track, ctx);
  assert.strictEqual(r.state().cars.length, 0);
  const e = buildReplay({ session: FX.session }, track, ctx);
  e.advance(30); e.jumpToLastLap();
  assert.deepStrictEqual([e.state().cars.length, e.radios().length, e.weather(), e.rained(), e.feed().dnfs.length], [0, 0, null, false, 0]);
});

t('il degrado delle gomme si calcola sui giri OpenF1', () => {
  const r = buildReplay(FX, track, ctx);
  r.jumpTo(r.duration);
  const R = W.fromSim({ totalLaps: r.totalLaps, cars: r.state().cars.map(c => ({ code: c.code, laps: r.laps(c.id) })) });
  assert.ok(W.raceDeg(R).length > 10);
  // i giri con la Safety Car (31-37) sono segnati: non entrano nel degrado
  assert.ok([32, 33, 34].every(n => r.laps('russell').find(l => l.lapNo === n).flag === 'sc'), 'giri con la Safety Car');
});

t('telemetria da car_data: distanza crescente, velocità, gas, freno e marcia', async () => {
  const r = buildReplay(FX, track, { ...ctx, of1: fakeCarData(CAR) });
  assert.strictEqual(r.telemetry('russell', 10), null);
  const tel = await r.telemetryAsync('russell', 10);
  assert.ok(tel.dist.every((d, i) => i === 0 || d >= tel.dist[i - 1]) && tel.speed.length > 100 && tel.gear.some(g => g >= 7));
  assert.ok(tel.brake.some(b => b === 1) && tel.brake.every(b => b === 0 || b === 1) && tel.throttle.some(x => x === 100));
  assert.ok(Math.abs(tel.dist[tel.dist.length - 1] - 6003) < 400, 'un giro di Baku è lungo circa 6 km: ' + tel.dist[tel.dist.length - 1]);
  assert.ok(tel.sectorDist[0] > 1000 && tel.sectorDist[1] > tel.sectorDist[0], 'fine dei settori: ' + tel.sectorDist);
  assert.strictEqual(r.telemetry('russell', 10), tel, 'poi resta in memoria');
  assert.strictEqual(await r.telemetryAsync('russell', 11), null, 'senza car_data per quel giro: null');
  assert.strictEqual(r.liveTelemetry('russell'), null);
});

t('ultima gara da session_result: Russell primo, poi i distacchi', () => {
  const L = lastRaceFromResult(FX, RACES, ctx);
  assert.strictEqual(L.rows[0].id, 'russell');
  assert.ok(/^\+/.test(L.rows[1].time));
  assert.deepStrictEqual([L.raceId, L.name, L.type, L.real, L.src, L.fastest], ['r15', "GP dell'Azerbaigian", 'RACE', true, 'openf1', 'russell']);
  assert.deepStrictEqual(L.rows.slice(0, 3).map(x => [x.id, x.time, x.pos]), [['russell', '1:38:02.143', 1], ['verstappen', '+0.196s', 2], ['hadjar', '+10.704s', 3]]);
  const bot = L.rows.find(x => x.id === 'bottas'), str = L.rows.find(x => x.id === 'stroll');
  assert.deepStrictEqual([bot.pos, bot.time, !!bot.dnf], [16, 'Ritirato', true]);
  assert.deepStrictEqual([str.pos, str.time, !!str.dnf], [null, 'Ritirato', true]);
  assert.strictEqual(L.rows.length, 22);
  assert.strictEqual(lastRaceFromResult({ ...FX, session_result: [] }, RACES, ctx), null);
});

t('ritiri: chi si ferma esce dalla classifica dopo il suo ultimo giro', () => {
  const r = buildReplay(FX, track, ctx);
  r.jumpTo(r.duration);
  const out = r.feed().dnfs;
  assert.deepStrictEqual(out.map(d => d.code).sort(), ['ALB', 'ALO', 'BOT', 'COL', 'GAS', 'NOR', 'STR']);
  assert.deepStrictEqual([out[0].code, out[0].lap, out[0].cause], ['STR', 8, 'altro']);
  assert.ok(out.every((d, i) => i === 0 || d.t >= out[i - 1].t), 'in ordine di tempo');
  const st = r.state(), tail = st.cars.slice(-7);
  assert.ok(tail.every(c => c.dnf) && st.cars.slice(0, 15).every(c => !c.dnf), 'i ritirati in fondo');
  const stroll = out.find(d => d.code === 'STR');
  r.jumpTo(stroll.t - 5);
  assert.ok(!r.state().cars.find(c => c.code === 'STR').dnf && !r.feed().dnfs.some(d => d.code === 'STR'), 'prima del ritiro è ancora in gara');
});

t('meteo, radio e pioggia: solo i valori della sessione', () => {
  const r = buildReplay(FX, track, ctx);
  r.jumpTo(r.duration);
  const w = r.weather(), last = FX.weather[FX.weather.length - 1];
  assert.deepStrictEqual([w.air, w.track, w.humidity, w.windDir, w.rain], [last.air_temperature, last.track_temperature, last.humidity, last.wind_direction, false]);
  assert.strictEqual(w.wind, Math.round(last.wind_speed * 3.6));   // km/h
  assert.strictEqual(r.rained(), false);
  assert.strictEqual(buildReplay({ ...FX, weather: FX.weather.map((x, i) => i === 40 ? { ...x, rainfall: 1 } : x) }, track, ctx).rained(), true);
  const radios = r.radios();
  assert.deepStrictEqual(radios.map(x => [x.id, x.code, x.lap]), [['russell', 'RUS', 20], ['leclerc', 'LEC', 28], ['verstappen', 'VER', 45]]);
  assert.ok(radios.every(x => /^https:\/\/.+\.mp3$/.test(x.url) && x.date));
});

t('scorrere la sessione: dall\'inizio, avanti, ultimo giro e fine', () => {
  const r = buildReplay(FX, track, ctx);
  assert.strictEqual(r.t, r.duration, 'la sessione rivista parte dalla fine');
  r.jumpTo(0);
  let st = r.state();
  assert.ok(st.t === 0 && st.lap === 1 && !st.finished && st.cars.length === 22, 'partenza: ' + JSON.stringify([st.t, st.lap, st.finished, st.cars.length]));
  assert.strictEqual(st.cars[0].code, 'RUS', 'prima del primo giro conta il primo ordine noto');
  assert.strictEqual(r.laps('russell').length, 0, 'alla partenza nessun giro fatto');
  r.advance(600);
  st = r.state();
  assert.strictEqual(r.laps('russell').length, 3, 'dopo 10 minuti 3 giri finiti');
  assert.ok(st.t === 600 && st.lap > 1 && st.cars.every(c => isFinite(c.x) && isFinite(c.y)), 'dopo 10 minuti');
  r.jumpToLastLap();
  assert.strictEqual(r.state().lap, 51);
  r.advance(1e6);
  assert.strictEqual(r.t, r.duration, 'non va oltre la fine');
  r.setFlag('red'); r.retire('russell', 'motore');
  assert.strictEqual(r.state().flag, 'green');
});

(async () => {
  const filter = process.argv[2] ? new RegExp(process.argv[2], 'i') : null;
  for (const [name, fn] of tests) {
    if (filter && !filter.test(name)) continue;
    try { await fn(); pass++; console.log('PASS  ' + name); }
    catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + String(e && e.message).split('\n')[0]); }
  }
  console.log(`\n${pass} passati, ${fail} falliti`);
  process.exit(fail ? 1 : 0);
})();
