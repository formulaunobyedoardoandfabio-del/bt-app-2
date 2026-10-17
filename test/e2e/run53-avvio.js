// Tappa 3, Task 4 (G06): al primo avvio in assoluto i tre video di Edoardo; dagli avvii dopo il "Pit Exit Launch"
// (circa 1,5 s): i LED del volante si accendono da sinistra a destra, "PIT EXIT OPEN", zoom con le linee della velocità,
// poi l'app. Con i dati lenti i LED del logo si accendono in sequenza con "Caricamento…" finché arrivano.
// Uso: node test/build-test.js && node test/e2e/run53-avvio.js [filtro]
const { open, w, assert, run } = require('./helpers');

const SEEN = () => { try { localStorage.setItem('bt_bt-intro-seen', 'true'); } catch (e) {} };
// Registro dell'avvio, fotogramma per fotogramma: quando compare e quando sparisce lo splash, i LED del volante accesi,
// le scritte e le fasi viste.
// Gira prima dell'app (init di open): il telefono ha già visto i video, poi si registra l'avvio.
const RECORD = () => {
  try { localStorage.setItem('bt_bt-intro-seen', 'true'); } catch (e) {}
  const L = window.__splashLog = { first: null, gone: null, snaps: [], phases: [], sawOpen: false, sawZoom: false, ledAnim: [] };
  const step = () => {
    const e = document.querySelector('[data-splash]'), now = performance.now();
    if (e && L.first == null) L.first = now;
    if (!e && L.first != null && L.gone == null) L.gone = now;
    if (e) {
      const leds = [...e.querySelectorAll('[data-pit-led]')];
      if (leds.length) L.snaps.push(leds.map(x => (x.getAttribute('data-on') === '1' ? 1 : 0)).join(''));
      if (leds.length && !L.ledAnim.length) L.ledAnim = leds.map(x => getComputedStyle(x).animationName);
      if (/PIT EXIT OPEN/.test(e.innerText)) L.sawOpen = true;
      if (e.querySelector('[data-pit-zoom]')) L.sawZoom = true;
      const ph = e.getAttribute('data-splash-phase'); if (L.phases[L.phases.length - 1] !== ph) L.phases.push(ph);
    }
    if (L.gone == null) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};
const log = p => p.evaluate(() => window.__splashLog);
const goneSplash = (p, ms) => p.waitForFunction(() => !document.querySelector('[data-splash]'), null, { timeout: ms }).then(() => true, () => false);

run({
  async 'primo avvio: i tre video'(b) {
    const { ctx, p, errs } = await open(b, { page: 'video/index.html', waitSplash: false });
    const first = await p.evaluate(() => { const e = document.querySelector('[data-splash]'); return e ? { phase: e.dataset.splashPhase, videos: e.querySelectorAll('video').length } : null; });
    const seenBefore = await p.evaluate(() => localStorage.getItem('bt_bt-intro-seen'));
    const gone = await goneSplash(p, 20000);
    const seenAfter = await p.evaluate(() => localStorage.getItem('bt_bt-intro-seen'));
    await p.reload(); await w(p, 300);
    const second = await p.evaluate(() => { const e = document.querySelector('[data-splash]'); return e ? { phase: e.dataset.splashPhase, videos: e.querySelectorAll('video').length } : null; });
    await ctx.close();
    assert(first && first.phase === 'intro' && first.videos === 3, 'primo avvio: ' + JSON.stringify(first));
    assert(seenBefore === null, 'il primo avvio risulta già fatto');
    assert(gone, 'lo splash dei video non se ne va');
    assert(seenAfter === 'true', 'il primo avvio fatto non resta sul telefono: ' + seenAfter);
    assert(second && second.phase === 'pitexit' && second.videos === 0, 'secondo avvio: ' + JSON.stringify(second));
    assert(!errs.length, errs.join(' | '));
  },

  async "secondo avvio: PIT EXIT OPEN, LED del volante, poi l'app entro 2 s con i dati pronti"(b) {
    const { ctx, p, errs } = await open(b, { waitSplash: false, init: RECORD });
    const gone = await goneSplash(p, 6000);
    const L = await log(p);
    const login = await p.evaluate(() => !!document.querySelector('#authEmail'));
    await ctx.close();
    const n = L.snaps.length ? L.snaps[0].length : 0;
    assert(L.phases.includes('pitexit'), 'fasi viste: ' + JSON.stringify(L.phases));
    assert(n >= 10, 'LED del volante: ' + n);
    assert(L.snaps.every(s => /^1*0*$/.test(s)), 'i LED non si accendono da sinistra a destra: ' + L.snaps.filter(s => !/^1*0*$/.test(s)).slice(0, 3).join(' '));
    assert(L.snaps.some(s => /^1+0+$/.test(s)), 'non si vede la sequenza dei LED: ' + [...new Set(L.snaps)].join(' '));
    assert(L.snaps.some(s => /^1+$/.test(s)), 'i LED non si accendono tutti');
    assert(L.sawOpen, 'manca "PIT EXIT OPEN"');
    assert(L.sawZoom, 'manca lo zoom con le linee della velocità');
    assert(gone && L.gone != null && L.gone - L.first <= 2000, `l'app arriva dopo ${L.gone && Math.round(L.gone - L.first)} ms`);
    assert(login, 'finito l\'avvio non si vede l\'app');
    assert(!errs.length, errs.join(' | '));
  },

  async 'dati lenti: LED del logo in sequenza e "Caricamento…" fino ai dati'(b) {
    const { ctx, p, errs } = await open(b, { waitSplash: false, seed: { holdReads: true }, init: SEEN });
    await w(p, 2600);
    const mid = await p.evaluate(() => { const e = document.querySelector('[data-splash]'), g = e && e.querySelector('[data-led-grid]'); return e ? { text: e.innerText, phase: e.dataset.splashPhase, grid: g ? g.getAttribute('data-mode') : null, leds: g ? g.querySelectorAll('[data-led]').length : 0 } : null; });
    await p.evaluate(() => { window.firebase.__fake.holdReads = false; });
    const gone = await goneSplash(p, 3000);
    await ctx.close();
    assert(mid && mid.phase === 'pitexit', 'con i dati lenti lo splash se ne va prima dei dati: ' + JSON.stringify(mid));
    assert(mid.grid === 'seq' && mid.leds === 8, 'LED del logo: ' + JSON.stringify(mid));
    assert(/Caricamento…/.test(mid.text), 'manca "Caricamento…": ' + JSON.stringify(mid.text));
    assert(gone, 'arrivati i dati lo splash non se ne va');
    assert(!errs.length, errs.join(' | '));
  },

  async 'Rimuovi animazioni: niente zoom, solo la scritta e i LED fermi'(b) {
    const { ctx, p, errs } = await open(b, { waitSplash: false, reducedMotion: 'reduce', init: RECORD });
    const gone = await goneSplash(p, 6000);
    const L = await log(p);
    await ctx.close();
    assert(L.phases.includes('pitexit'), 'fasi viste: ' + JSON.stringify(L.phases));
    assert(L.sawOpen, 'manca "PIT EXIT OPEN"');
    assert(!L.sawZoom, 'con "Rimuovi animazioni" c\'è lo zoom');
    assert(L.snaps.length && L.snaps.every(s => /^1+$/.test(s)), 'i LED non sono fermi e accesi: ' + [...new Set(L.snaps)].join(' '));
    assert(L.ledAnim.every(a => a === 'none'), 'LED animati: ' + L.ledAnim.join(','));
    assert(gone, 'lo splash non se ne va');
    assert(!errs.length, errs.join(' | '));
  },
});
