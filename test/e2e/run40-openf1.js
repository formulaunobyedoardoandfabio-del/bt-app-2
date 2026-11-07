// Task 17: pagina Race con i dati veri di OpenF1. Le risposte di api.openf1.org arrivano da Playwright con la gara vera
// di Baku 2026 nella forma di OpenF1 (test/fixtures/openf1-*.json, da tools/make_openf1_fixture.py).
// Uso: node test/build-test.js && node test/e2e/run40-openf1.js [filtro]
const { open, w, text, norm, inner, inners, count, has, tapText, tapSel, goTab, login, openAdmin, assert, run } = require('./helpers');
const FX = require('../fixtures/openf1-baku-race.json');
const CAR = require('../fixtures/openf1-car-data-rus-10.json');
const BtWeekend = require('../../src/data/real-weekend.js');

const CORS = { 'Access-Control-Allow-Origin': '*' };
// GP dell'Azerbaigian messo LIVE dall'admin (come lo salva il menu dello stato in shared/bt-races).
const BAKU_LIVE = { 'shared/bt-races': { __arr: [{ id: 'r15', name: "GP dell'Azerbaigian", circuit: 'Baku City Circuit', country: 'Azerbaigian', round: 15, date: '2026-09-26T15:00:00', status: 'LIVE', totalLaps: 51, circuitId: 'az-2016' }] } };
const USERS = { 'a@b.it': { pw: 'x', uid: 'uid-a' }, 'u@b.it': { pw: 'y', uid: 'uid-u' } };
const USER_DOC = { 'users/u@b.it': { name: 'Utente', nick: 'Utente', email: 'u@b.it', about: { birth: null, follow: null, fan: null } } };
const T0 = Date.parse(FX.session.date_start);
const lapStart = (num, lap) => (Date.parse(FX.laps.find(l => l.driver_number === num && l.lap_number === lap).date_start) - T0) / 1000;

// OpenF1 finto. mode: "ok" (la fixture), "locked" (sessione in corso), "429once" (la prima richiesta: troppe richieste),
// "empty" (la sessione c'è ma gli elenchi sono vuoti). calls: le richieste fatte, con l'ora.
function of1Route(mode = 'ok', { lastRace = false } = {}) {
  const calls = [];
  let n429 = 0;
  const handler = async r => {
    const u = new URL(r.request().url());
    const path = u.pathname.replace(/^\/v1\//, ''), q = decodeURIComponent(u.search.slice(1));
    calls.push({ path, q, at: Date.now() });
    const json = (status, body) => r.fulfill({ status, contentType: 'application/json', headers: CORS, body: JSON.stringify(body) });
    if (mode === 'locked') return json(401, { detail: 'No access: a live F1 session in progress, data available after the session' });
    if (mode === '429once' && path === 'sessions' && /session_key=latest/.test(q) && n429++ === 0) return json(429, { detail: 'Too Many Requests' });
    if (path === 'sessions') {
      if (/session_name=Race/.test(q) && !/session_key/.test(q)) return lastRace ? json(200, [FX.session]) : json(404, { detail: 'No results found.' });
      return json(200, [FX.session]);
    }
    if (mode === 'empty') return json(404, { detail: 'No results found.' });
    if (path === 'car_data') {
      const num = +(/driver_number=(\d+)/.exec(q) || [])[1], from = (/date>=([^&]+)/.exec(q) || [])[1], to = (/date<=([^&]+)/.exec(q) || [])[1];
      const list = CAR.filter(c => c.driver_number === num && c.date.slice(0, 23) >= String(from).slice(0, 23) && c.date.slice(0, 23) <= String(to).slice(0, 23));
      return list.length ? json(200, list) : json(404, { detail: 'No results found.' });
    }
    const list = FX[path];
    return Array.isArray(list) && list.length ? json(200, list) : json(404, { detail: 'No results found.' });
  };
  return { calls, routes: { 'https://api.openf1.org/v1/**': handler } };
}
const waitReplay = (p, ms = 15000) => p.waitForFunction(() => window.__btLive && window.__btLive.state().cars.length > 0, null, { timeout: ms }).then(() => true, () => false);
const raceTab = async (p, t) => { await tapSel(p, `[data-race-tab="${t}"]`); await w(p, 300); };

run({
  // ── Blocco e caricamento ──────────────────────────────────────────────
  async 'gara LIVE e OpenF1 bloccato: riquadro SESSIONE IN CORSO e classifica dei primi 10'(b) {
    const of1 = of1Route('locked');
    const { ctx, p, errs } = await open(b, { seed: { addDocs: BAKU_LIVE, pro: true }, routes: of1.routes }); await login(p);   // 1/11: funzioni Pro
    await goTab(p, 'RACE'); await w(p, 1500);
    const box = norm(await inner(p, '[data-of1-locked]')), rows = await count(p, '[data-of1-locked] [data-of1-standing]');
    const latest = () => of1.calls.filter(c => c.path === 'sessions' && /session_key=latest/.test(c.q)).length;
    const n1 = latest();
    await tapText(p, '↻ Aggiorna'); await w(p, 1500);
    const n2 = latest(), sim = await p.evaluate(() => !!window.__btLive); await ctx.close();
    assert(/SESSIONE IN CORSO/.test(box) && /Posizioni, gomme, pit stop, tempi e team radio saranno disponibili qui circa 30 minuti dopo la fine della sessione\. Intanto segui la classifica mondiale e commenta in chat!/.test(box), 'riquadro della sessione bloccata: ' + box.slice(0, 300));
    assert(rows === 10, 'sotto il riquadro la classifica dei primi 10: ' + rows);
    assert(n1 >= 1 && n2 === n1 + 1, `"↻ Aggiorna" deve chiedere di nuovo la sessione (${n1} → ${n2})`);
    assert(!sim, 'con la sessione bloccata non deve partire nessuna diretta');
    assert(!errs.length, errs.join(' | '));
  },
  async 'sbloccata: alla fine Russell primo, gomme vere e direzione gara con la Safety Car'(b) {
    const of1 = of1Route();
    const { ctx, p, errs } = await open(b, { seed: { addDocs: BAKU_LIVE, pro: true }, routes: of1.routes }); await login(p);   // 1/11: funzioni Pro
    await goTab(p, 'RACE');
    const ok = await waitReplay(p); await w(p, 500);
    const st = ok ? await p.evaluate(() => { const s = window.__btLive.state(); return { first: s.cars[0].code, finished: s.finished, total: s.totalLaps, t: s.t }; }) : null;
    const card = norm(await inner(p, '[data-live-card]')), podium = norm(await inner(p, '[data-finish-podium]'));
    const controls = await p.evaluate(() => ['play', 'x10', 'fine'].map(k => !!document.querySelector(`[data-replay="${k}"]`)));
    const fourth = await p.evaluate(() => { const e = document.querySelector('[data-timing-pos="4"]'); return e ? e.getAttribute('data-timing-id') : null; });
    await raceTab(p, 'gomme');
    const tyres = await count(p, '[data-tyre-row]'), rus = norm(await inner(p, '[data-tyre-row="russell"]')), tyreText = norm(await inner(p, '[data-tyres]'));
    await raceTab(p, 'messaggi');
    const rc = norm(await text(p)); await ctx.close();
    assert(ok && st.first === 'RUS' && st.finished && st.total === 51, 'sessione rivista: ' + JSON.stringify(st));
    assert(/Sessione \(dati OpenF1\)/.test(card) && !/DEMO/.test(card), 'scritta della sessione: ' + card.slice(0, 200));
    assert(/Russell/.test(podium) && /Verstappen/.test(podium) && /Hadjar/.test(podium), 'podio: ' + podium);
    assert(controls.every(Boolean), 'comandi per rivedere la sessione: ' + controls);
    assert(fourth === 'leclerc', 'quarto: ' + fourth);
    assert(tyres === 22 && /Morbida/.test(rus) && /20 giri/.test(rus), 'gomme di Russell: ' + rus);
    assert(!/%/.test(tyreText) && !/usura/i.test(tyreText), 'nelle gomme ci sono percentuali di usura inventate: ' + tyreText.slice(0, 200));
    assert(/SAFETY CAR DEPLOYED/.test(rc) && /giro 31/.test(rc), 'direzione gara senza la Safety Car');
    assert(!errs.length, errs.join(' | '));
  },
  // OpenF1 gratis tiene i dati bloccati fino a 30 minuti dopo la fine della sessione (openf1.org: "Data is considered
  // live from 30 minutes before a session starts until 30 minutes after it ends"): il primo caricamento arriva lì.
  // 31/10 sera (Edoardo): sessione finita ma non seguita in diretta: niente schermata con la bandiera a scacchi.
  async 'sessione finita non vista in diretta: niente sfondo a scacchi né "BANDIERA A SCACCHI"; il podio resta'(b) {
    const of1 = of1Route();
    const { ctx, p, errs } = await open(b, { seed: { addDocs: BAKU_LIVE, pro: true }, routes: of1.routes }); await login(p);   // 1/11: funzioni Pro
    await goTab(p, 'RACE');
    const ok = await waitReplay(p); await w(p, 600);
    const finished = ok && await p.evaluate(() => window.__btLive.state().finished);
    const bg = await p.evaluate(() => { const e = document.querySelector('[data-bg]'); return e ? e.getAttribute('data-bg') : null; });
    const banner = /BANDIERA A SCACCHI/.test(await text(p)), podium = await has(p, '[data-finish-podium]');
    await ctx.close();
    assert(finished, 'la sessione di prova deve essere finita');
    assert(bg !== 'chequered', 'sfondo a scacchi su una sessione non vista in diretta: ' + bg);
    assert(!banner, 'c\'è la scritta BANDIERA A SCACCHI su una sessione non vista in diretta');
    assert(podium, 'il podio della gara finita deve restare');
    assert(!errs.length, errs.join(' | '));
  },
  async 'sessione appena finita: OpenF1 la sblocca 30 minuti dopo la fine, poi per mezz\'ora si ricarica ogni 5 minuti (dati a metà), poi basta'(b) {
    const { ctx, p, errs } = await open(b); await w(p, 200);
    const r = await p.evaluate(s => { const f = window.__req('./App').of1NeedsReload, end = Date.parse(s.date_end), m = 60000;
      return [f(s, end + 30 * m, end + 32 * m), f(s, end + 30 * m, end + 36 * m), f(s, end + 36 * m, end + 42 * m), f(s, end + 52 * m, end + 58 * m),
        f(s, end + 55 * m, end + 61 * m), f(s, 0, end - 10 * m), f(s, end + 30 * m, end + 70 * m)]; }, FX.session);
    await ctx.close();
    assert(JSON.stringify(r) === JSON.stringify([false, true, true, true, false, true, false]), 'quando ricaricare: ' + JSON.stringify(r));
    assert(!errs.length, errs.join(' | '));
  },
  async '429 e poi risposta: la pagina si riprende senza errori'(b) {
    const of1 = of1Route('429once');
    const { ctx, p, errs } = await open(b, { seed: { addDocs: BAKU_LIVE, pro: true }, routes: of1.routes }); await login(p);   // 1/11: funzioni Pro
    await goTab(p, 'RACE');
    const ok = await waitReplay(p, 40000);
    const [first, second] = of1.calls.filter(c => c.path === 'sessions' && /session_key=latest/.test(c.q));
    const t = norm(await text(p)); await ctx.close();
    assert(ok, 'dopo il 429 la sessione non arriva');
    assert(second && second.at - first.at >= 19000, 'dopo il 429 deve aspettare 20 s: ' + (second ? second.at - first.at : '-'));
    assert(!/Impossibile raggiungere/.test(t), 'compare l\'errore anche se poi i dati sono arrivati');
    assert(!errs.length, errs.join(' | '));
  },
  // ── Schede ────────────────────────────────────────────────────────────
  async 'radio: audio veri col pilota e il giro'(b) {
    const of1 = of1Route();
    const { ctx, p, errs } = await open(b, { seed: { addDocs: BAKU_LIVE, pro: true }, routes: of1.routes }); await login(p);   // 1/11: funzioni Pro
    await goTab(p, 'RACE'); await waitReplay(p); await w(p, 300);
    await raceTab(p, 'radio');
    // 1/11 notte: tasto grande Ascolta (data-radio-play) con l'audio nascosto accanto, al posto dei comandi del browser
    const rows = await p.evaluate(() => [...document.querySelectorAll('[data-radio-row]')].map(r => ({ t: r.innerText.replace(/\s+/g, ' '), src: (r.querySelector('audio') || {}).src || null, play: !!r.querySelector('[data-radio-play]') })));
    assert(rows.every(r => r.play), 'manca il tasto Ascolta');
    await ctx.close();
    assert(rows.length === 3, 'radio: ' + rows.length);
    assert(rows.every(r => r.src && /^https:\/\/livetiming\.formula1\.com\/.+\.mp3$/.test(r.src)), 'audio delle radio: ' + JSON.stringify(rows.map(r => r.src)));
    const all = rows.map(r => r.t).join(' | ');
    assert(/Russell/.test(all) && /Giro 20/.test(all) && /Leclerc/.test(all) && /Giro 28/.test(all) && /Verstappen/.test(all) && /Giro 45/.test(all), 'pilota e giro: ' + all);
    assert(!/Passo buono|quanto manca alla sosta/.test(all), 'ci sono ancora le radio d\'esempio');
    assert(!errs.length, errs.join(' | '));
  },
  // 7/11 sera (Edoardo: "la funzione che se arrivano i team radio partono da soli non funziona"): ora partono anche con
  // l'elenco chiuso e in un'altra scheda, dal lettore unico (RadioBus); si spia play() degli audio.
  async 'radio automatiche: acceso "Ascolta i team radio", la radio nuova parte da sola anche dalla Home'(b) {
    const of1 = of1Route();
    const { ctx, p, errs } = await open(b, { seed: { addDocs: BAKU_LIVE, pro: true }, routes: of1.routes }); await login(p);
    await p.evaluate(() => { window.__plays = []; HTMLMediaElement.prototype.play = function () { window.__plays.push(this.src); setTimeout(() => this.dispatchEvent(new Event('playing')), 10); return Promise.resolve(); }; });
    await goTab(p, 'RACE'); await waitReplay(p); await w(p, 300);
    await raceTab(p, 'radio');
    await tapSel(p, '[data-radio-auto] [role="switch"]'); await w(p, 300);
    const on = await p.evaluate(() => document.querySelector('[data-radio-auto]').getAttribute('data-radio-auto'));
    const r0 = await p.evaluate(() => window.__btLive.radios()[0]);
    await p.evaluate(t => window.__btLive.jumpTo(t - 5), r0.t); await w(p, 2200);
    await p.evaluate(() => { window.__plays = window.__plays.filter(s => !/^data:/.test(s)); });
    const before = await p.evaluate(() => window.__plays.length);
    await goTab(p, 'HOME'); await w(p, 300);
    await p.evaluate(t => window.__btLive.jumpTo(t + 1), r0.t); await w(p, 2500);
    const plays = await p.evaluate(() => window.__plays.filter(s => !/^data:/.test(s)));
    await ctx.close();
    assert(on === 'on', 'interruttore: ' + on);
    assert(before === 0, 'prima della radio è partito qualcosa: ' + before);
    assert(plays.length === 1 && plays[0] === r0.url, 'la radio nuova non è partita da sola in Home: ' + JSON.stringify({ plays, url: r0.url }));
    assert(!errs.length, errs.join(' | '));
  },

  async 'elenchi vuoti: "Dati non ancora disponibili", nessun errore JS'(b) {
    const of1 = of1Route('empty');
    const { ctx, p, errs } = await open(b, { seed: { addDocs: BAKU_LIVE, pro: true }, routes: of1.routes }); await login(p);   // 1/11: funzioni Pro
    await goTab(p, 'RACE'); await w(p, 4000);
    const t0 = norm(await text(p)), sim = await p.evaluate(() => !!window.__btLive);
    await raceTab(p, 'gomme'); const tg = norm(await text(p));
    await raceTab(p, 'radio'); const tr = norm(await text(p));
    await raceTab(p, 'meteo'); const tm = norm(await text(p)); await ctx.close();
    assert(/Dati non ancora disponibili/.test(t0) && !sim, 'elenchi vuoti: ' + t0.slice(0, 300));
    assert(/Le gomme compaiono quando arrivano i dati della sessione\./.test(tg), 'gomme senza dati: ' + tg.slice(0, 300));
    assert(/I team radio arrivano a fine sessione\./.test(tr), 'radio senza dati');
    assert(/Il meteo della sessione arriva con i dati veri a fine sessione\./.test(tm), 'meteo senza dati');
    assert(!errs.length, errs.join(' | '));
  },
  async 'meteo: valori veri, nessun radar e nessuna previsione inventata'(b) {
    const of1 = of1Route(), last = FX.weather[FX.weather.length - 1];
    const { ctx, p, errs } = await open(b, { seed: { addDocs: BAKU_LIVE, pro: true }, routes: of1.routes }); await login(p);   // 1/11: funzioni Pro
    await goTab(p, 'RACE'); await waitReplay(p); await w(p, 300);
    await raceTab(p, 'meteo');
    const now = norm(await inner(p, '[data-wx-now]')), all = norm(await text(p));
    const radar = await has(p, 'canvas'), boxes = await inners(p, '[data-weather-box]');
    await ctx.close();
    assert(now.includes(last.air_temperature.toFixed(1) + '°') && now.includes(last.track_temperature.toFixed(1) + '°') && now.includes(Math.round(last.humidity) + '%') && now.includes(Math.round(last.wind_speed * 3.6) + ' km/h'), 'valori veri del meteo: ' + now);
    assert(/Nessuna pioggia/.test(now), 'pioggia: ' + now);
    assert(!radar && !/radar/i.test(all), 'c\'è ancora il radar (simulato)');
    assert(boxes.length === 5 && boxes.every(x => !/°|%/.test(x)), 'nelle caselle ci sono ancora previsioni inventate: ' + JSON.stringify(boxes));
    assert(!/Probabilità di pioggia|PREVISIONI/.test(all), 'ci sono ancora le previsioni scritte');
    assert(!errs.length, errs.join(' | '));
  },
  // ── Telemetria e pilota ───────────────────────────────────────────────
  async 'telemetria: toccando un giro arriva car_data e il grafico'(b) {
    const of1 = of1Route();
    const { ctx, p, errs } = await open(b, { seed: { addDocs: BAKU_LIVE, pro: true }, routes: of1.routes }); await login(p);   // 1/11: funzioni Pro
    await goTab(p, 'RACE'); await waitReplay(p);
    await p.evaluate(t => window.__btLive.jumpTo(t), lapStart(63, 12) + 5); await w(p, 600);
    await tapSel(p, '[aria-label="Tempi sul giro di RUS"]'); await w(p, 400);
    await tapSel(p, '[data-lap-row="10"]');
    const loading = await p.waitForFunction(() => /Caricamento della telemetria/.test(document.body.innerText), null, { timeout: 2000 }).then(() => true, () => false);
    await p.waitForFunction(() => document.querySelector('[data-telemetry] [data-tel-chart]'), null, { timeout: 8000 }).catch(() => {});
    const tel = norm(await inner(p, '[data-telemetry]')), charts = await count(p, '[data-telemetry] [data-tel-chart]');
    const asked = of1.calls.filter(c => c.path === 'car_data');
    await tapSel(p, '[aria-label="Chiudi telemetria"]'); await w(p, 300);
    await tapSel(p, '[aria-label="Tempi sul giro di RUS"]'); await w(p, 400);
    await tapSel(p, '[data-lap-row="9"]'); await w(p, 2500);
    const none = norm(await text(p)); await ctx.close();
    assert(loading, 'manca "Caricamento della telemetria…"');
    assert(/TELEMETRIA · RUS · GIRO 10/.test(tel) && charts >= 4, 'telemetria del giro 10: ' + tel.slice(0, 200) + ' · grafici ' + charts);
    assert(asked.length >= 1 && /driver_number=63/.test(asked[0].q) && /date>=2026-09-26T11:20:09/.test(asked[0].q), 'richiesta di car_data: ' + JSON.stringify(asked[0]));
    assert(!/telemetria demo/.test(tel), 'scritta della telemetria demo');
    assert(/Telemetria non disponibile per questo giro/.test(none), 'giro senza car_data: ' + none.slice(0, 200));
    assert(!errs.length, errs.join(' | '));
  },
  async 'scheda pilota: ultima gara e miglior giro veri, niente "IN QUESTA GARA" inventato'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await goTab(p, 'RACE'); await w(p, 400);
    await tapSel(p, '[data-race-tab="classifica"]'); await w(p, 300);   // 18/10: l'ultima gara ha la sua scheda
    await tapSel(p, '[data-result-row="leclerc"] button'); await w(p, 400);
    const t = norm(await inner(p, '[data-driver-modal]')); await ctx.close();
    const q = BtWeekend.quali.find(x => x.round === 15).drivers.LEC.q.filter(v => v > 0), best = Math.min(...q);
    const fmt = ms => `${Math.floor(ms / 60000)}:${((ms % 60000) / 1000).toFixed(3).padStart(6, '0')}`;
    assert(/ULTIMA GARA/.test(t) && /GP dell'Azerbaigian/i.test(t) && /P4/.test(t) && /\+14\.136s/.test(t), 'ultima gara di Leclerc: ' + t.slice(-400));
    assert(/QUALIFICA/.test(t) && t.includes(fmt(best)), `miglior giro in qualifica ${fmt(best)}: ` + t.slice(-400));
    assert(!/IN QUESTA GARA|GRIGLIA|F1Dash/.test(t), 'ci sono ancora i dati inventati della scheda: ' + t.slice(0, 400));
    assert(!errs.length, errs.join(' | '));
  },
  // ── Ultima gara e DEMO ────────────────────────────────────────────────
  async 'ultima gara dai dati OpenF1'(b) {
    const of1 = of1Route('ok', { lastRace: true });
    const { ctx, p, errs } = await open(b, { routes: of1.routes }); await login(p); await w(p, 3000);
    await goTab(p, 'RACE'); await w(p, 400);
    await tapSel(p, '[data-race-tab="classifica"]').catch(() => {}); await w(p, 300); const src = await p.evaluate(() => { const e = document.querySelector('[data-last-race]'); return e ? e.getAttribute('data-last-race-src') : null; });
    const bor = await p.evaluate(() => { const e = document.querySelector('[data-result-row="bortoleto"]'); return e ? [e.getAttribute('data-result-pos'), e.innerText.replace(/\s+/g, ' ')] : null; });
    const cached = await p.evaluate(() => { try { return JSON.parse(localStorage.getItem('bt_bt-of1-last-race')); } catch (e) { return null; } });
    const asked = of1.calls.filter(c => c.path === 'sessions' && /session_name=Race/.test(c.q) && /year=2026/.test(c.q)).length;
    await ctx.close();
    assert(asked >= 1, 'non chiede a OpenF1 l\'ultima gara');
    // Bortoleto: 13° in pista (la fixture non ha la penalità data dopo la gara), 15° nel risultato ufficiale scritto nell'app
    assert(src === 'openf1' && bor && bor[0] === '13' && /\+34\.\d{3}s/.test(bor[1]), 'ultima gara: ' + src + ' · ' + JSON.stringify(bor));
    assert(cached && cached.race && cached.race.rows && cached.race.rows[0].id === 'russell' && cached.at > 0, 'ultima gara salvata sul telefono: ' + JSON.stringify(cached && cached.at));
    assert(!errs.length, errs.join(' | '));
  },
  async 'prova DEMO: la scritta DEMO solo sul telefono dell\'admin'(b) {
    const of1 = of1Route();
    const u = await open(b, { seed: { users: USERS, addDocs: { ...USER_DOC, ...BAKU_LIVE } }, routes: of1.routes }); await login(u.p, { email: 'u@b.it', pw: 'y' });
    await goTab(u.p, 'RACE'); await waitReplay(u.p); await w(u.p, 300);
    const tUser = norm(await text(u.p)), demoUser = await has(u.p, '[data-demo]');
    await goTab(u.p, 'GARAGE'); await tapText(u.p, 'Degrado gomme'); await w(u.p, 500);
    const deg = norm(await text(u.p)); await u.ctx.close();
    const a = await open(b, { seed: { addDocs: BAKU_LIVE }, routes: of1Route().routes }); await login(a.p);
    await goTab(a.p, 'RACE'); await waitReplay(a.p);
    await openAdmin(a.p, 'GARA LIVE'); await tapText(a.p, 'AVVIA GARA', { exact: true }); await w(a.p, 300);
    await tapSel(a.p, '[aria-label="Indietro"]'); await w(a.p); await tapSel(a.p, '[aria-label="Indietro"]'); await w(a.p); await goTab(a.p, 'RACE');
    const badge = await inner(a.p, '[data-demo]'), srcDemo = await a.p.evaluate(() => document.querySelector('[data-live-card]').getAttribute('data-live-source'));
    await openAdmin(a.p, 'GARA LIVE'); await tapText(a.p, 'TERMINA DIRETTA', { exact: true }); await w(a.p, 300);
    await tapSel(a.p, '[aria-label="Indietro"]'); await w(a.p); await tapSel(a.p, '[aria-label="Indietro"]'); await w(a.p); await goTab(a.p, 'RACE');
    const srcAfter = await a.p.evaluate(() => { const e = document.querySelector('[data-live-card]'); return e ? e.getAttribute('data-live-source') : null; });
    await a.ctx.close();
    assert(!demoUser && !/\bDEMO\b/.test(tUser) && /Sessione \(dati OpenF1\)/.test(tUser), 'per gli utenti: ' + tUser.slice(0, 300));
    assert(/Sessione \(dati OpenF1\)/.test(deg) && !/simulata/.test(deg), 'Garage, degrado gomme: ' + deg.slice(0, 400));
    assert(badge === 'DEMO' && srcDemo === 'demo', 'admin, prova diretta: ' + badge + ' ' + srcDemo);
    assert(srcAfter === 'openf1', 'finita la prova torna la sessione vera: ' + srcAfter);
    assert(!u.errs.length && !a.errs.length, [...u.errs, ...a.errs].join(' | '));
  },
});
