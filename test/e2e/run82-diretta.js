// 31/10 notte (Edoardo, durante le qualifiche del Messico: "solo questo messaggio riprova, connessione… solo adesso ha
// caricato"): in diretta OpenF1 gratis è bloccato per TUTTO, anche per sapere qual è l'ultima sessione; l'app chiedeva
// l'ultima sessione solo lì e così non arrivava mai alla nostra funzione su Vercel (api/live, l'abbonamento). Ora se
// OpenF1 gratis non risponde (bloccato o irraggiungibile) l'ultima sessione, le sessioni del weekend e i dati arrivano da
// api/live. Dati: la gara vera di Baku 2026 (test/fixtures/openf1-baku-race.json), "in corso" alle 12:00 UTC.
// Uso: node test/build-test.js && node test/e2e/run82-diretta.js [filtro]
const { open, w, has, goTab, login, assert, run } = require('./helpers');
const FX = require('../fixtures/openf1-baku-race.json');

const CORS = { 'Access-Control-Allow-Origin': '*' };
const BAKU_LIVE = { 'shared/bt-races': { __arr: [{ id: 'r15', name: "GP dell'Azerbaigian", circuit: 'Baku City Circuit', country: 'Azerbaigian', round: 15, date: '2026-09-26T15:00:00', status: 'LIVE', totalLaps: 51, circuitId: 'az-2016' }] } };
const NOW = '2026-09-26T12:00:00Z';   // gara 11:00-13:00 UTC: in corso
const PL3 = { ...FX.session, session_key: 99913, session_name: 'Practice 3', session_type: 'Practice', date_start: '2026-09-25T08:30:00+00:00', date_end: '2026-09-25T09:30:00+00:00' };
const RACE = FX.session;
const { session: _s, _nota, ...FULL } = FX;
const PARTS = { [RACE.session_key]: FULL, [PL3.session_key]: FULL };

// OpenF1 gratis: bloccato per tutto (come in diretta). api/live: risponde con i dati (o, con liveDown, non risponde).
function routes({ liveDown = false } = {}) {
  const free = [], live = [];
  const json = (r, status, body) => r.fulfill({ status, contentType: 'application/json', headers: CORS, body: JSON.stringify(body) });
  const answer = (r, path, q) => {
    if (path === 'sessions') {
      if (/session_key=latest/.test(q)) return json(r, 200, [RACE]);
      if (/meeting_key=/.test(q)) return json(r, 200, [PL3, RACE]);
      const k = +(/session_key=(\d+)/.exec(q) || [])[1];
      return json(r, 200, [PL3, RACE].filter(x => x.session_key === k));
    }
    const k = +(/session_key=(\d+)/.exec(q) || [])[1];
    const list = (PARTS[k] || {})[path];
    return Array.isArray(list) && list.length ? json(r, 200, list) : json(r, 404, { detail: 'No results found.' });
  };
  return {
    free, live,
    routes: {
      'https://api.openf1.org/v1/**': async r => {
        const u = new URL(r.request().url());
        free.push(u.pathname + u.search);
        return json(r, 401, { detail: 'No access: a live F1 session in progress, data available after the session' });
      },
      'https://bt-app-2.vercel.app/api/live**': async r => {
        const u = new URL(r.request().url());
        const p = u.searchParams.get('p'), q = decodeURIComponent(u.search.slice(1));
        live.push(p + ' ' + q);
        if (liveDown) return r.abort();
        return answer(r, p, q);
      },
    },
  };
}

run({
  async 'diretta: OpenF1 gratis bloccato, ultima sessione e dati da api/live; sessione in corso, mini Pit Board nelle altre pagine'(b) {
    const R = routes();
    const { ctx, p, errs } = await open(b, { now: NOW, seed: { addDocs: BAKU_LIVE }, routes: R.routes }); await login(p);
    await goTab(p, 'RACE');
    const ok = await p.waitForFunction(() => window.__btLive && window.__btLive.state().cars.length > 0, null, { timeout: 15000 }).then(() => true, () => false);
    await w(p, 500);
    const st = ok ? await p.evaluate(() => { const s = window.__btLive.state(); return { cars: s.cars.length, type: s.type }; }) : null;
    const status = await p.evaluate(() => { const e = document.querySelector('[data-of1-status], [data-of1-locked]'); return e ? (e.getAttribute('data-of1-status') || 'locked') : null; });
    const liveDot = await has(p, `[data-session-pick="${RACE.session_key}"] [aria-label="in corso"]`);
    await goTab(p, 'HOME'); await w(p, 400);
    const mini = await has(p, '[data-mini-pit]');
    await ctx.close();
    assert(ok && st && st.cars >= 20 && st.type === 'RACE', 'la diretta non si carica da api/live: ' + JSON.stringify(st) + ' stato ' + status);
    assert(R.live.some(x => /^sessions .*session_key=latest/.test(x)), 'l\'ultima sessione va chiesta ad api/live: ' + JSON.stringify(R.live.slice(0, 5)));
    assert(R.live.some(x => /^laps .*session_key=99915/.test(x)), 'i giri vanno chiesti ad api/live');
    assert(!status, 'non deve restare "SESSIONE IN CORSO" né "Riprova": ' + status);
    assert(liveDot, 'il tasto GARA deve avere il pallino "in corso"');
    assert(mini, 'sessione in corso: la mini Pit Board nelle altre pagine');
    assert(!errs.length, errs.join(' | '));
  },

  async 'diretta con api/live che non risponde: "SESSIONE IN CORSO" (non "Riprova")'(b) {
    const R = routes({ liveDown: true });
    const { ctx, p, errs } = await open(b, { now: NOW, seed: { addDocs: BAKU_LIVE }, routes: R.routes }); await login(p);
    await goTab(p, 'RACE'); await w(p, 2500);
    const locked = await has(p, '[data-of1-locked]'), sim = await p.evaluate(() => !!window.__btLive);
    await ctx.close();
    assert(locked && !sim, 'senza api/live resta il riquadro della sessione in corso: ' + JSON.stringify({ locked, sim }));
    assert(R.live.length >= 1, 'api/live va provata');
    assert(!errs.length, errs.join(' | '));
  },
});
