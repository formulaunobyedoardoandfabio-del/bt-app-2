// 8/11 (Edoardo: "controlla che nell'app sia tutto automatizzato", poi "Tutti"): previsioni del weekend fatte e corrette
// da sole, notizie scritte dall'app coi risultati, prezzi FantaF1 che cambiano dopo il GP, highlights ufficiali F1.
// Risultati finti di Jolpica (GP 20: vince Antonelli) e feed finto della funzione api/highlights.
// Uso: node test/build-test.js && node test/e2e/run99-automatici.js [filtro]
const { open, w, goTab, tapSel, login, assert, run } = require('./helpers');

const NOW = '2026-11-17T10:00:00Z';   // settimana di Las Vegas, dopo il Brasile
const CORS = { 'Access-Control-Allow-Origin': '*' };
const drv = (g, f) => ({ givenName: g, familyName: f });
const RES = [
  { position: '1', positionText: '1', grid: '2', Driver: drv('Andrea Kimi', 'Antonelli'), FastestLap: { rank: '2' } },
  { position: '2', positionText: '2', grid: '1', Driver: drv('George', 'Russell'), FastestLap: { rank: '1' } },
  { position: '3', positionText: '3', grid: '3', Driver: drv('Charles', 'Leclerc') },
  { position: '4', positionText: '4', grid: '5', Driver: drv('Lando', 'Norris') },
  { position: '5', positionText: 'R', grid: '4', Driver: drv('Lewis', 'Hamilton') },
];
const QUALI = [
  { position: '1', Driver: drv('George', 'Russell'), Q3: '1:10.1' },
  { position: '2', Driver: drv('Andrea Kimi', 'Antonelli'), Q3: '1:10.2' },
  { position: '3', Driver: drv('Charles', 'Leclerc'), Q3: '1:10.3' },
];
const page = (field, rows) => ({ MRData: { total: rows ? '1' : '0', RaceTable: { season: '2026', Races: rows ? [{ season: '2026', round: '20', [field]: rows }] : [] } } });
const jolpica = { 'https://api.jolpi.ca/**': r => {
  const u = r.request().url();
  const json = body => r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(body) });
  if (/\/2026\/results\.json/.test(u)) return json(page('Results', RES));
  if (/\/2026\/qualifying\.json/.test(u)) return json(page('QualifyingResults', QUALI));
  if (/\/2026\/sprint\.json/.test(u)) return json(page('SprintResults', null));
  return r.abort();
} };
const HL = { 'https://bt-app-2.vercel.app/api/highlights**': r => r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({ source: 'YouTube · FORMULA 1', items: [
  { id: 'yt-AAAAAAAAAAA', title: 'Gara · 2026 São Paulo Grand Prix', link: 'https://www.youtube.com/watch?v=AAAAAAAAAAA', thumb: 'https://i.ytimg.com/vi/AAAAAAAAAAA/hqdefault.jpg', date: '2026-11-08T19:30:00.000Z' },
  { id: 'yt-BBBBBBBBBBB', title: 'Qualifiche · 2026 São Paulo Grand Prix', link: 'https://www.youtube.com/watch?v=BBBBBBBBBBB', thumb: 'https://i.ytimg.com/vi/BBBBBBBBBBB/hqdefault.jpg', date: '2026-11-07T19:30:00.000Z' },
] }) }) };
const USER = { name: 'Tester', email: 'a@b.it', about: { birth: null, follow: 2, fan: 'vivo' }, app2: {
  squad: { name: 'Squadra del Tester', drivers: ['hamilton', 'russell', 'hulkenberg', 'perez', 'antonelli'], teams: ['audi', 'haas'], boost: 'russell' },
  squadBase: { drivers: ['hamilton', 'russell', 'hulkenberg', 'perez', 'antonelli'], teams: ['audi', 'haas'] },
  predAnswers: { 'auto:r20:win': 'antonelli', 'auto:r20:pole': 'leclerc' } } };
const SEED = { addDocs: { 'users/a@b.it': USER } };
const body = p => p.evaluate(() => document.body.innerText);

run({
  // 22/11 (Edoardo: "deve andare nelle notifiche che poi clicchi ... non come news"): i risultati sono notifiche.
  async 'risultati veri nelle notifiche (non più nelle notizie) e highlights ufficiali F1 in Home'(b) {
    const { ctx, p, errs } = await open(b, { now: NOW, seed: SEED, routes: { ...jolpica, ...HL } }); await login(p); await w(p, 1500);
    const t = await body(p);
    const hl = await p.evaluate(() => { const e = document.querySelector('[data-yt-highlights]'); return e && { n: +e.getAttribute('data-yt-highlights'), text: e.innerText, links: [...e.querySelectorAll('[data-highlight]')].map(x => x.getAttribute('data-highlight')) }; });
    const yt = await p.$('[data-yt-highlights]');
    if (yt) { await yt.scrollIntoViewIfNeeded(); await yt.screenshot({ path: '/tmp/bt/run99-highlights.png' }); }
    await p.screenshot({ path: '/tmp/bt/run99-home.png' });
    await tapSel(p, '[aria-label="Notifiche"]'); await w(p, 700);
    const n = await p.evaluate(() => [...document.querySelectorAll('[data-notif-action^="res:"]')].map(e => ({ a: e.getAttribute('data-notif-action'), text: e.innerText.replace(/\s+/g, ' ') })));
    await p.screenshot({ path: '/tmp/bt/run99-notifiche.png' });
    await ctx.close();
    assert(!/Antonelli vince il GP/.test(t) && !/Russell in pole al GP/.test(t), 'niente notizie automatiche in Home: ' + t.slice(0, 400));
    assert(n.length === 2 && n[0].a === 'res:race:20' && /Antonelli vince il GP/.test(n[0].text) && /Replay/.test(n[0].text), 'notifica della gara: ' + JSON.stringify(n));
    assert(n[1].a === 'res:quali:20' && /Russell in pole al GP/.test(n[1].text) && /griglia di partenza/.test(n[1].text), 'notifica della qualifica: ' + JSON.stringify(n));
    assert(hl && hl.n === 2 && /HIGHLIGHTS UFFICIALI F1/.test(hl.text) && /Gara · 2026 São Paulo Grand Prix/.test(hl.text), 'highlights: ' + JSON.stringify(hl));
    assert(!errs.length, errs.join(' | '));
  },

  async 'tocco sulle notifiche: qualifica → pagina Race; gara senza Premium → Premium'(b) {
    const { ctx, p, errs } = await open(b, { now: NOW, seed: SEED, routes: jolpica }); await login(p); await w(p, 1500);
    await tapSel(p, '[aria-label="Notifiche"]'); await w(p, 700);
    await tapSel(p, '[data-notif-action="res:quali:20"]'); await w(p, 900);
    const race = await p.evaluate(() => { const e = document.querySelector('[data-nav-tab][aria-current="page"]'); return e && e.getAttribute('data-nav-tab'); });
    await tapSel(p, '[aria-label="Notifiche"]'); await w(p, 700);
    await tapSel(p, '[data-notif-action="res:race:20"]'); await w(p, 900);
    const prem = await p.evaluate(() => !!document.querySelector('[data-premium-sheet], [data-premium-cta]'));
    await ctx.close();
    assert(race === 'race', 'qualifica: si apre la pagina Race: ' + race);
    assert(prem, 'gara senza Premium: si apre il Premium (il Replay è Premium)');
    assert(!errs.length, errs.join(' | '));
  },

  async 'Premium: dalla notifica della gara si apre subito il Replay di quella gara (Sepang, round 16)'(b) {
    const page16 = (field, rows) => ({ MRData: { total: '1', RaceTable: { season: '2026', Races: [{ season: '2026', round: '16', [field]: rows }] } } });
    const j16 = { 'https://api.jolpi.ca/**': r => {
      const u = r.request().url();
      const json = x => r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(x) });
      if (/\/2026\/results\.json/.test(u)) return json(page16('Results', RES));
      if (/\/2026\/qualifying\.json/.test(u)) return json(page16('QualifyingResults', QUALI));
      return r.abort();
    } };
    const { ctx, p, errs } = await open(b, { now: '2026-10-06T10:00:00Z', seed: { ...SEED, pro: true }, routes: j16 }); await login(p); await w(p, 1500);
    await tapSel(p, '[aria-label="Notifiche"]'); await w(p, 700);
    await tapSel(p, '[data-notif-action="res:race:16"]'); await w(p, 1500);
    const r = await p.evaluate(() => ({ replay: !!document.querySelector('[data-race-replay], [data-map-replay]'), archive: !!document.querySelector('[data-archive]') }));
    await p.screenshot({ path: '/tmp/bt/run99-replay.png' });
    await ctx.close();
    assert(r.replay, 'il Replay della gara è aperto: ' + JSON.stringify(r));
    assert(!errs.length, errs.join(' | '));
  },

  async 'previsioni del weekend fatte da sole e corrette coi risultati; prezzi cambiati dopo il GP'(b) {
    const { ctx, p, errs } = await open(b, { now: NOW, seed: SEED, routes: jolpica }); await login(p); await w(p, 1200);
    await goTab(p, 'FANTA'); await w(p, 1200);
    const s = await p.evaluate(() => ({
      preds: [...document.querySelectorAll('[data-prediction]')].map(e => e.getAttribute('data-prediction')),
      text: document.body.innerText,
      bonus: (document.querySelector('[data-bonus-total]') || {}).innerText,
      up: (document.querySelector('[data-fanta-card="antonelli"] [data-price-change]') || { getAttribute: () => null }).getAttribute('data-price-change'),
      upLabel: (document.querySelector('[data-fanta-card="antonelli"] [data-price-change]') || { getAttribute: () => null }).getAttribute('aria-label'),
      down: (document.querySelector('[data-fanta-card="hamilton"] [data-price-change]') || { getAttribute: () => null }).getAttribute('data-price-change'),
      stored: JSON.parse(localStorage.getItem('bt_bt-auto-answers') || 'null'),
    }));
    const first = await p.$('[data-prediction^="auto:"]');
    if (first) { await first.scrollIntoViewIfNeeded(); await first.screenshot({ path: '/tmp/bt/run99-previsione.png' }); }
    await ctx.close();
    const lv = s.preds.filter(x => x.startsWith('auto:r21:'));
    assert(lv.length >= 5, 'domande automatiche del GP di Las Vegas: ' + JSON.stringify(s.preds));
    assert(/Chi vince il GP/.test(s.text) && /Chi fa la pole al GP/.test(s.text), 'testo delle domande');
    assert(/Previsione · Chi vince il GP/.test(s.text), 'previsione giusta del Brasile nei punti bonus');
    assert(!/Previsione · Chi fa la pole al GP/.test(s.text), 'pole sbagliata (Leclerc): niente punto');
    assert(s.bonus === '+1', 'punti bonus: ' + s.bonus);
    assert(s.stored && s.stored['auto:r20:win'] === 'antonelli' && s.stored['auto:r20:pole'] === 'russell', 'risposte salvate sul telefono: ' + JSON.stringify(s.stored));
    assert(s.up === 'up' && /0[.,]3/.test(s.upLabel || ''), 'prezzo di Antonelli salito di 0,3: ' + s.up + ' ' + s.upLabel);
    assert(s.down === 'down', 'prezzo di Hamilton (ritirato) sceso: ' + s.down);
    assert(!errs.length, errs.join(' | '));
  },

  async 'senza Jolpica né funzione highlights: niente notizie automatiche, niente highlights, niente errori'(b) {
    const { ctx, p, errs } = await open(b, { now: NOW, seed: SEED }); await login(p); await w(p, 1200);
    const s = await p.evaluate(() => ({ auto: !!document.querySelector('[data-news-item^="auto-"], [data-featured^="auto-"]'), hl: !!document.querySelector('[data-yt-highlights]') }));
    await goTab(p, 'FANTA'); await w(p, 800);
    const preds = await p.evaluate(() => [...document.querySelectorAll('[data-prediction^="auto:r21:"]')].length);
    await ctx.close();
    assert(!s.auto && !s.hl, 'senza dati niente notizie automatiche né highlights: ' + JSON.stringify(s));
    assert(preds >= 5, 'le domande del weekend ci sono anche senza risultati: ' + preds);
    assert(!errs.length, errs.join(' | '));
  },
});
