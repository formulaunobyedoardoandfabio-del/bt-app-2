// 21/11 (Edoardo: "fai tutto quello che devi", piano claude/multiviewer-in-sector4.md): nel Replay sulla mappa
// l'interruttore Mappa | Box mostra il Quadrante dei box: le auto sul cerchio del giro (in tempo), e per il pilota
// scelto dove rientrerebbe fermandosi adesso (posizione, chi ha davanti e dietro, aria libera), anche con la Safety Car.
// Il tempo perso viene dai pit veri della gara (src/logic/pit-dial.js; prova sui 417 pit 2026: esatto 56%, ±1 78%,
// da solo ai box 80% / 96%). File vero di São Paulo 2026; la posizione attesa si calcola qui con lo stesso modulo.
// Uso: node test/build-test.js && node test/e2e/run129-quadrante-box.js
const fs = require('fs');
const path = require('path');
const { open, w, tapSel, login, assert, run } = require('./helpers');
const TR = require('../../src/logic/track-replay');
const PD = require('../../src/logic/pit-dial');

const REAL = fs.readFileSync(path.join(__dirname, '../../public/data/replay/11412.json'), 'utf8');
const REP = TR.decode(JSON.parse(REAL));
const RACE = { round: 21, name: 'GP di San Paolo', place: 'São Paulo', date: '2025-11-09', circuitId: 'br-1940', laps: 3, drivers: {
  NOR: { team: 'mclaren', pos: 1, n: 3, t: [80000, 80000, 80000] }, VER: { team: 'redbull', pos: 2, n: 3, t: [80500, 80000, 80000] } } };
const json = body => r => r.fulfill({ status: 200, contentType: 'application/json', body: typeof body === 'string' ? body : JSON.stringify(body) });
const routesFor = (key, body) => ({
  'https://bt-app-2.vercel.app/data/archivio/index.json': json({ years: [{ year: 2025, races: 1, h: 'a' }] }),
  'https://bt-app-2.vercel.app/data/archivio/2025.json*': json({ year: 2025, races: [RACE] }),
  'https://bt-app-2.vercel.app/data/replay/index.json': json({ races: [{ key, year: 2025, date: '2025-11-09', name: 'GP', h: 'z' + key }] }),
  [`https://bt-app-2.vercel.app/data/replay/${key}.json*`]: json(body),
});
const ROUTES = routesFor(11412, REAL);
// Suzuka 2026: Safety Car da 2049 a 2842 s (file vero)
const SUZ = fs.readFileSync(path.join(__dirname, '../../public/data/replay/11253.json'), 'utf8');
const SREP = TR.decode(JSON.parse(SUZ));
async function toMap(p) {
  await tapSel(p, '[data-archive-open]'); await w(p, 800);
  await tapSel(p, '[data-archive-year="2025"]'); await w(p, 700);
  await tapSel(p, '[data-archive-race="2025-21"]'); await w(p, 700);
  await tapSel(p, '[data-replay-open]'); await w(p, 1500);
}
const seek = (p, v) => p.evaluate(v => { const s = document.querySelector('[data-map-slider]'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(s, String(v)); s.dispatchEvent(new Event('input', { bubbles: true })); }, v);
const look = p => p.evaluate(() => ({
  dial: !!document.querySelector('[data-dial]'),
  map: !!document.querySelector('[data-map-svg]'),
  cars: document.querySelectorAll('[data-dial-car]').length,
  norT: (document.querySelector('[data-dial-car="NOR"]') || { getAttribute: () => '' }).getAttribute('transform'),
  info: ((document.querySelector('[data-dial-info]') || {}).innerText || '').replace(/\s+/g, ' '),
  pos: ((document.querySelector('[data-dial-pos]') || {}).textContent || '').trim(),
  ghost: !!document.querySelector('[data-dial-ghost="now"]'),
  ghostAlt: !!document.querySelector('[data-dial-ghost="alt"]'),
  head: ((document.querySelector('[data-dial-info] p') || {}).textContent || '').trim(),
  free: ((document.querySelector('[data-dial-free]') || {}).textContent || '').trim(),
  alt: ((document.querySelector('[data-dial-alt]') || {}).textContent || '').trim(),
  view: [...document.querySelectorAll('[data-map-view]')].map(b => b.getAttribute('data-map-view') + ':' + b.getAttribute('aria-pressed')).join(' '),
  wide: document.documentElement.scrollWidth,
}));

run({
  async 'Mappa | Box: il quadrante coi distacchi in tempo, e il rientro del pilota scelto uguale al calcolo'(b) {
    const { ctx, p, errs } = await open(b, { seed: { pro: true }, routes: ROUTES });
    await login(p); await w(p, 800);
    await toMap(p);
    const m0 = await look(p);
    await tapSel(p, '[data-map-view="box"]'); await w(p, 400);
    await seek(p, 60); await w(p, 300);
    const lap1 = await look(p);
    await seek(p, 2400); await w(p, 400);
    const a = await look(p);
    await tapSel(p, '[data-tower-row="HAD"]'); await w(p, 400);
    const s = await look(p);
    await tapSel(p, '[data-map-play]'); await w(p, 1200);
    await tapSel(p, '[data-map-play]'); await w(p, 300);
    const moved = await look(p);
    await tapSel(p, '[data-map-view="map"]'); await w(p, 400);
    const back = await look(p);
    await ctx.close();

    const iHad = REP.drivers.findIndex(d => d.code === 'HAD');
    const want = PD.dial(REP, 2400, { sel: iHad }), m = PD.lossModel(REP);
    assert(m0.map && !m0.dial && /map:true/.test(m0.view), 'si apre sulla mappa: ' + m0.view);
    assert(lap1.dial && /giro 2/i.test(lap1.info), 'al primo giro il cerchio aspetta il giro 2: ' + lap1.info);
    assert(a.dial && !a.map && a.cars === want.cars.length, 'quadrante con le auto in gara: ' + a.cars + ' su ' + want.cars.length);
    assert(new RegExp('si perdono ' + String(m.green).replace('.', ',') + ' s').test(a.info) && new RegExp(m.nGreen + ' pit veri').test(a.info), 'tempo perso misurato e su quanti pit: ' + a.info);
    assert(want.rejoin.nowKey === 'green' && s.pos === 'P' + want.rejoin.now.pos, 'rientro di HAD come il calcolo: ' + s.pos + ' invece di P' + want.rejoin.now.pos);
    assert(s.ghost && s.ghostAlt, 'ombra del rientro e segno del caso con la Safety Car');
    assert(want.rejoin.now.ahead ? s.info.includes(want.rejoin.now.ahead.code) : true, 'chi avrebbe davanti: ' + s.info);
    assert(s.free === (want.rejoin.now.free ? 'Aria libera' : 'Nel traffico'), 'aria libera o traffico: ' + s.free);
    assert(new RegExp('Con la Safety Car: P' + want.rejoin.alt.pos).test(s.alt) && (want.rejoin.scMeasured || /stima/.test(s.alt)), 'Safety Car, con "stima" se non misurata: ' + s.alt);
    assert(moved.norT && moved.norT !== s.norT, 'play: sul cerchio le auto si muovono: ' + s.norT + ' → ' + moved.norT);
    assert(back.map && !back.dial, 'Mappa: torna il tracciato');
    assert(a.wide <= 400 && s.wide <= 400, 'niente scorrimento di lato: ' + a.wide);
    assert(!errs.length, errs.join(' | '));
  },

  async 'a 320 px la riga in alto non esce dallo schermo, anche a fine gara'(b) {
    const { ctx, p, errs } = await open(b, { seed: { pro: true }, routes: ROUTES, width: 320, height: 640 });
    await login(p); await w(p, 800);
    await toMap(p);
    await tapSel(p, '[data-map-view="box"]'); await w(p, 300);
    await seek(p, 99999); await w(p, 500);
    const r = await p.evaluate(() => {
      const bs = [...document.querySelectorAll('[data-map-view]')].map(e => e.getBoundingClientRect());
      return { wide: document.documentElement.scrollWidth, right: Math.max(...bs.map(x => x.right)), tall: Math.min(...bs.map(x => x.height)), info: (document.querySelector('[data-dial-info]') || {}).innerText || '' };
    });
    await ctx.close();
    assert(r.wide <= 320 && r.right <= 320, 'dentro lo schermo: ' + JSON.stringify(r));
    assert(r.tall >= 40, 'bottoni Mappa | Box comodi da toccare: ' + r.tall);
    assert(/finita/i.test(r.info), 'a fine gara il cerchio lo dice: ' + r.info);
    assert(!errs.length, errs.join(' | '));
  },

  async 'con la Safety Car in pista la stima grande usa il tempo perso con la SC, e sotto il caso a bandiera verde (Suzuka 2026)'(b) {
    const { ctx, p, errs } = await open(b, { seed: { pro: true }, routes: routesFor(11253, SUZ) });
    await login(p); await w(p, 800);
    await toMap(p);
    await tapSel(p, '[data-map-view="box"]'); await w(p, 300);
    await seek(p, 2300); await w(p, 400);
    await tapSel(p, '[data-tower-row="LEC"]'); await w(p, 400);
    const s = await look(p);
    await ctx.close();
    const want = PD.dial(SREP, 2300, { sel: SREP.drivers.findIndex(d => d.code === 'LEC') });
    assert(want.rejoin.nowKey === 'sc', 'il calcolo vede la Safety Car');
    assert(/AI BOX CON LA SC/.test(s.head) && s.pos === 'P' + want.rejoin.now.pos, 'stima con la SC: ' + s.head + ' ' + s.pos + ' invece di P' + want.rejoin.now.pos);
    assert(s.alt === 'A bandiera verde: P' + want.rejoin.alt.pos, 'sotto il caso a bandiera verde: ' + s.alt);
    assert(!errs.length, errs.join(' | '));
  },
});
