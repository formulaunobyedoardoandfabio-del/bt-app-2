// 31/10 sera (Edoardo: "quando voglio rivedere le prove libere o le qualifiche non fa vedere niente"): nel weekend in
// corso si sceglie quale sessione rivedere; una sessione con la classifica ma senza giri (OpenF1 li aggiunge ore dopo)
// mostra la classifica e il miglior giro; una sessione ancora senza niente dice "Dati non ancora disponibili" e lascia
// scegliere le altre. Dati: la gara vera di Baku 2026 (test/fixtures/openf1-baku-race.json), le altre sessioni fatte
// con le stesse parti.
// Uso: node test/build-test.js && node test/e2e/run80-sessioni.js [filtro]
const { open, w, norm, inner, inners, count, tapSel, goTab, login, assert, run } = require('./helpers');
const FX = require('../fixtures/openf1-baku-race.json');

const CORS = { 'Access-Control-Allow-Origin': '*' };
const BAKU_LIVE = { 'shared/bt-races': { __arr: [{ id: 'r15', name: "GP dell'Azerbaigian", circuit: 'Baku City Circuit', country: 'Azerbaigian', round: 15, date: '2026-09-26T15:00:00', status: 'LIVE', totalLaps: 51, circuitId: 'az-2016' }] } };
const S = (key, name, type, start, end) => ({ ...FX.session, session_key: key, session_name: name, session_type: type, date_start: start, date_end: end });
const PL3 = S(99913, 'Practice 3', 'Practice', '2026-09-25T08:30:00+00:00', '2026-09-25T09:30:00+00:00');
const QUALI = S(99914, 'Qualifying', 'Qualifying', '2026-09-25T12:00:00+00:00', '2026-09-25T13:00:00+00:00');
const RACE = FX.session;
// Una posizione a testa all'inizio, come OpenF1 prima dei giri.
const START = FX.position.filter((x, i, l) => l.findIndex(y => y.driver_number === x.driver_number) === i).map((x, i) => ({ ...x, position: i + 1 }));
const RESULT_PL3 = [
  { driver_number: 16, position: 1, duration: 101.234, number_of_laps: 21, gap_to_leader: 0 },
  { driver_number: 1, position: 2, duration: 101.5, number_of_laps: 19, gap_to_leader: 0.266 },
  { driver_number: 63, position: 3, duration: 101.9, number_of_laps: 18, gap_to_leader: 0.666 },
];

// OpenF1 finto con più sessioni. parts[key] = { path: elenco } (quello che manca: "No results found.").
function of1Route({ latest, weekend, parts }) {
  const calls = [];
  const handler = async r => {
    const u = new URL(r.request().url());
    const path = u.pathname.replace(/^\/v1\//, ''), q = decodeURIComponent(u.search.slice(1));
    calls.push({ path, q });
    const json = (status, body) => r.fulfill({ status, contentType: 'application/json', headers: CORS, body: JSON.stringify(body) });
    const none = () => json(404, { detail: 'No results found.' });
    if (path === 'sessions') {
      if (/session_key=latest/.test(q)) return json(200, [latest]);
      if (/meeting_key=/.test(q)) return json(200, weekend);
      const k = +(/session_key=(\d+)/.exec(q) || [])[1];
      const s = weekend.find(x => x.session_key === k);
      return s ? json(200, [s]) : none();
    }
    const k = +(/session_key=(\d+)/.exec(q) || [])[1];
    const list = (parts[k] || {})[path];
    return Array.isArray(list) && list.length ? json(200, list) : none();
  };
  return { calls, routes: { 'https://api.openf1.org/v1/**': handler } };
}
const { session: _s, _nota, ...FULL } = FX;
const typeNow = p => p.evaluate(() => window.__btLive ? window.__btLive.state().type : null);
const waitType = (p, t, ms = 15000) => p.waitForFunction(x => window.__btLive && window.__btLive.state().type === x, t, { timeout: ms }).then(() => true, () => false);
const chips = p => p.evaluate(() => [...document.querySelectorAll('[data-session-pick]')].map(e => ({ key: e.getAttribute('data-session-pick'), on: e.getAttribute('aria-pressed') === 'true', text: e.innerText.trim() })));

run({
  async 'tasti delle sessioni del weekend: dalla gara si passa a PL3 (classifica e miglior giro, giri non ancora arrivati) e si torna'(b) {
    const of1 = of1Route({ latest: RACE, weekend: [PL3, RACE], parts: { [RACE.session_key]: FULL, [PL3.session_key]: { drivers: FX.drivers, position: START, session_result: RESULT_PL3 } } });
    const { ctx, p, errs } = await open(b, { seed: { addDocs: BAKU_LIVE }, routes: of1.routes }); await login(p);
    await goTab(p, 'RACE');
    const race0 = await waitType(p, 'RACE'); await w(p, 400);
    const c0 = await chips(p);
    await tapSel(p, `[data-session-pick="${PL3.session_key}"]`);
    const pl3 = await waitType(p, 'FP3'); await w(p, 400);
    const st = await p.evaluate(() => { const s = window.__btLive.state(); return s.cars.slice(0, 3).map(c => [c.code, c.best && c.best.time]); });
    const c1 = await chips(p), note = norm(await inner(p, '[data-session-note]')), rows = await count(p, '[data-timing-row]');
    await tapSel(p, `[data-session-pick="${RACE.session_key}"]`);
    const back = await waitType(p, 'RACE');
    await ctx.close();
    assert(race0, 'la gara (ultima sessione) non si carica');
    assert(c0.length === 2 && c0[0].text === 'PL3' && c0[1].text === 'GARA' && c0[1].on && !c0[0].on, 'tasti delle sessioni: ' + JSON.stringify(c0));
    assert(pl3, 'toccando PL3 la sessione non cambia: ' + await Promise.resolve('tipo ' + JSON.stringify(st)));
    assert(JSON.stringify(st) === JSON.stringify([['LEC', 101.234], ['NOR', 101.5], ['RUS', 101.9]]), 'PL3: classifica dalla classifica di OpenF1: ' + JSON.stringify(st));
    assert(c1[0].on && !c1[1].on, 'dopo la scelta deve essere acceso PL3: ' + JSON.stringify(c1));
    assert(/giro per giro/.test(note) && /classifica/.test(note), 'scritta della sessione senza giri: ' + note);
    assert(rows >= 3, 'righe dei tempi in PL3: ' + rows);
    assert(back, 'tornando su GARA la gara non ricompare');
    assert(!errs.length, errs.join(' | '));
  },

  async 'ultima sessione ancora senza dati: "Dati non ancora disponibili" e si può rivedere PL3'(b) {
    const of1 = of1Route({ latest: QUALI, weekend: [PL3, QUALI], parts: { [QUALI.session_key]: { drivers: FX.drivers, position: START }, [PL3.session_key]: FULL } });
    const { ctx, p, errs } = await open(b, { seed: { addDocs: BAKU_LIVE }, routes: of1.routes }); await login(p);
    await goTab(p, 'RACE'); await w(p, 2500);
    const status = await p.evaluate(() => { const e = document.querySelector('[data-of1-status]'); return e ? e.getAttribute('data-of1-status') : null; });
    const sim0 = await typeNow(p), c0 = await chips(p);
    await tapSel(p, `[data-session-pick="${PL3.session_key}"]`);
    const pl3 = await waitType(p, 'FP3');
    const c1 = await chips(p);
    await ctx.close();
    assert(status === 'empty' && !sim0, 'qualifiche senza giri né classifica: "Dati non ancora disponibili", non una sessione vuota: ' + status + ' ' + sim0);
    assert(c0.length === 2 && c0.map(x => x.text).join(',') === 'PL3,QUALIFICHE' && c0[1].on, 'tasti anche senza dati: ' + JSON.stringify(c0));
    assert(pl3, 'toccando PL3 non si vede la sessione');
    assert(c1[0].on, 'PL3 acceso: ' + JSON.stringify(c1));
    assert(!errs.length, errs.join(' | '));
  },
});
