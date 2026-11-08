// 8/11 (Edoardo: "notifiche di aggiornamento a metà dei giri della gara se l'utente non ha visto la partenza"). Gara vera
// di Baku 2026 in diretta (api/live, come run82): 51 giri, metà = giro 26 (11:48:51 UTC). Aperta a metà gara senza aver
// visto la partenza → avviso "METÀ GARA" coi primi tre; partenza vista (app aperta nei primi minuti) → niente avviso.
// Uso: node test/build-test.js && node test/e2e/run100-meta-gara.js [filtro]
const { open, w, goTab, login, assert, run } = require('./helpers');
const FX = require('../fixtures/openf1-baku-race.json');

const CORS = { 'Access-Control-Allow-Origin': '*' };
const BAKU_LIVE = { 'shared/bt-races': { __arr: [{ id: 'r15', name: "GP dell'Azerbaigian", circuit: 'Baku City Circuit', country: 'Azerbaigian', round: 15, date: '2026-09-26T15:00:00', status: 'LIVE', totalLaps: 51, circuitId: 'az-2016' }] } };
const RACE = FX.session;
const { session: _s, _nota, ...FULL } = FX;
const json = (r, status, body) => r.fulfill({ status, contentType: 'application/json', headers: CORS, body: JSON.stringify(body) });
const ROUTES = {
  'https://api.openf1.org/v1/**': r => json(r, 401, { detail: 'No access: a live F1 session in progress' }),
  'https://bt-app-2.vercel.app/api/live**': r => {
    const u = new URL(r.request().url()), p = u.searchParams.get('p'), q = decodeURIComponent(u.search.slice(1));
    if (p === 'sessions') return json(r, 200, [RACE]);
    const list = FULL[p];
    return Array.isArray(list) && list.length ? json(r, 200, list) : json(r, 404, { detail: 'No results found.' });
  },
};
const loaded = p => p.waitForFunction(() => window.__btLive && window.__btLive.state().cars.length > 0, null, { timeout: 15000 }).then(() => true, () => false);
const notice = p => p.evaluate(() => { const e = document.querySelector('[data-live-notice="half"]'); return e ? { lap: e.getAttribute('data-notice-lap'), text: e.innerText } : null; });
// Nella prova i dati della gara arrivano tutti insieme (in diretta vera arrivano fino a "adesso"): si porta la diretta al
// momento giusto con jumpTo, come farebbe il tempo che passa.
const jump = (p, t) => p.evaluate(x => window.__btLive.jumpTo(x), t);
// Notifiche del telefono finte (permesso già dato): segnano cosa parte (8/11: notifica vera nel centro notifiche).
const capNotif = () => { window.__notifs = []; window.Capacitor = { isNativePlatform: () => false, getPlatform: () => 'web', Plugins: { LocalNotifications: { checkPermissions: () => Promise.resolve({ display: 'granted' }), requestPermissions: () => Promise.resolve({ display: 'granted' }), cancel: () => Promise.resolve(), schedule: o => { window.__notifs.push(...o.notifications.map(n => ({ id: n.id, title: n.title, body: n.body }))); return Promise.resolve(); } } } }; };
const store = (p, k) => p.evaluate(key => JSON.parse(localStorage.getItem('bt_' + key) || 'null'), k);

run({
  async 'aperta a metà gara senza aver visto la partenza: avviso coi primi tre e distacchi, e notifica vera del telefono'(b) {
    const { ctx, p, errs } = await open(b, { now: '2026-09-26T11:50:00Z', seed: { addDocs: BAKU_LIVE }, routes: ROUTES, init: capNotif }); await login(p);
    await goTab(p, 'RACE');
    const ok = await loaded(p);
    if (ok) await jump(p, 2950);   // giro 26 di 51
    const st = ok ? await p.evaluate(() => { const s = window.__btLive.state(); return { lap: s.lap, total: s.totalLaps, t: s.t }; }) : null;
    let n = null;
    for (let i = 0; i < 12 && !n; i++) { await w(p, 250); n = await notice(p); }
    const el = await p.$('[data-live-notice="half"]');
    if (el) await el.screenshot({ path: '/tmp/bt/run100-meta-gara.png' });
    const done = await store(p, 'bt-half-done');
    await w(p, 300);
    const sent = await p.evaluate(() => window.__notifs.filter(n => n.id === 121));
    await ctx.close();
    assert(ok, 'la gara in diretta deve caricarsi');
    assert(sent.length === 1 && /^Metà gara · Giro \d+\/51$/.test(sent[0].title) && /^GP dell'Azerbaigian: [A-Z]{3} davanti a [A-Z]{3} \(\+/.test(sent[0].body), 'notifica vera coi dati veri: ' + JSON.stringify(sent));
    assert(n, 'manca l\'avviso di metà gara: ' + JSON.stringify(st));
    assert(/METÀ GARA/.test(n.text) && /\/51/.test(n.text) && /1\. /.test(n.text) && /2\. /.test(n.text) && /3\. /.test(n.text), 'testo: ' + n.text);
    assert(done && done.r15 === true, 'segnato come dato: ' + JSON.stringify(done));
    assert(!errs.length, errs.join(' | '));
  },

  async 'partenza vista: app aperta nei primi minuti della gara → si ricorda, e a metà gara niente avviso'(b) {
    const a = await open(b, { now: '2026-09-26T11:04:00Z', seed: { addDocs: BAKU_LIVE }, routes: ROUTES }); await login(a.p);
    await goTab(a.p, 'RACE');
    const ok = await loaded(a.p);
    if (ok) await jump(a.p, 300);   // primi minuti dal via
    await w(a.p, 1200);
    const seen = await store(a.p, 'bt-start-seen');
    await a.ctx.close();
    assert(ok && seen && seen.r15 === true, 'partenza vista salvata: ' + JSON.stringify(seen));
    // stessa memoria del telefono, aperta a metà gara
    const c = await open(b, { now: '2026-09-26T11:50:00Z', seed: { addDocs: BAKU_LIVE }, routes: ROUTES, init: () => { try { localStorage.setItem('bt_bt-start-seen', JSON.stringify({ r15: true })); } catch (e) {} } }); await login(c.p);
    await goTab(c.p, 'RACE');
    if (await loaded(c.p)) await jump(c.p, 2950);
    await w(c.p, 2500);
    const n = await notice(c.p);
    await c.ctx.close();
    assert(!n, 'partenza vista: niente avviso di metà gara');
    assert(!a.errs.length && !c.errs.length, a.errs.concat(c.errs).join(' | '));
  },
});
