// Tappa 3, Task 4 (G06): al primo avvio in assoluto i tre video di Edoardo. 25/10 (chiesto da Edoardo: "togli il Pit
// Exit Launch, tieni solo la schermata di caricamento"): dagli avvii dopo, solo la luce posteriore a LED che si accende
// una riga alla volta e "Caricamento…", finché arrivano i dati; poi l'app. Prima c'era il Pit Exit Launch (15 LED del
// volante, "PIT EXIT OPEN", zoom con le linee della velocità) e il caricamento si vedeva solo coi dati lenti.
// Uso: node test/build-test.js && node test/e2e/run53-avvio.js [filtro]
const { open, w, assert, run } = require('./helpers');

const SEEN = () => { try { localStorage.setItem('bt_bt-intro-seen', 'true'); } catch (e) {} };
// Registro dell'avvio, fotogramma per fotogramma: quando compare e quando sparisce lo splash, la luce a LED, le scritte
// e le fasi viste. Gira prima dell'app (init di open): il telefono ha già visto i video.
const RECORD = () => {
  try { localStorage.setItem('bt_bt-intro-seen', 'true'); } catch (e) {}
  const L = window.__splashLog = { first: null, gone: null, phases: [], grids: [], texts: [], pitLeds: 0, sawOpen: false, sawZoom: false, ledAnim: null };
  const step = () => {
    const e = document.querySelector('[data-splash]'), now = performance.now();
    if (e && L.first == null) L.first = now;
    if (!e && L.first != null && L.gone == null) L.gone = now;
    if (e) {
      const g = e.querySelector('[data-led-grid]');
      const grid = g ? g.getAttribute('data-mode') + ':' + g.querySelectorAll('[data-led]').length : 'none';
      if (L.grids[L.grids.length - 1] !== grid) L.grids.push(grid);
      if (g && L.ledAnim == null) L.ledAnim = getComputedStyle(g.querySelector('[data-led]')).animationName;
      const t = e.innerText.trim(); if (t && !L.texts.includes(t)) L.texts.push(t);
      L.pitLeds = Math.max(L.pitLeds, e.querySelectorAll('[data-pit-led], [data-launch-led]').length);
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
    assert(second && second.phase === 'loading' && second.videos === 0, 'secondo avvio: ' + JSON.stringify(second));
    assert(!errs.length, errs.join(' | '));
  },

  async "secondo avvio: solo la luce a LED e \"Caricamento…\" (niente Pit Exit Launch), poi l'app entro 2 s"(b) {
    const { ctx, p, errs } = await open(b, { waitSplash: false, init: RECORD });
    const gone = await goneSplash(p, 6000);
    const L = await log(p);
    const login = await p.evaluate(() => !!document.querySelector('#authEmail'));
    await ctx.close();
    assert(JSON.stringify(L.phases) === '["loading"]', 'fasi viste: ' + JSON.stringify(L.phases));
    assert(JSON.stringify(L.grids) === '["seq:8"]', 'luce a LED (dall\'inizio alla fine, 8 LED in sequenza): ' + JSON.stringify(L.grids));
    assert(JSON.stringify(L.texts) === '["Caricamento…"]', 'scritte: ' + JSON.stringify(L.texts));
    assert(!L.pitLeds && !L.sawOpen && !L.sawZoom, 'c\'è ancora il Pit Exit Launch: ' + JSON.stringify(L));
    assert(gone && L.gone != null && L.gone - L.first <= 2000, `l'app arriva dopo ${L.gone && Math.round(L.gone - L.first)} ms`);
    assert(L.gone - L.first >= 800, `il caricamento lampeggia: ${Math.round(L.gone - L.first)} ms`);
    assert(login, 'finito l\'avvio non si vede l\'app');
    assert(!errs.length, errs.join(' | '));
  },

  // 8/11 (Edoardo: "il secondo file per la schermata di caricamento se internet è molto lento"): oltre 2,5 secondi al
  // posto dei LED le icone F1 in orbita, sempre fino ai dati.
  async 'dati lenti: la luce a LED in sequenza e "Caricamento…", poi le icone in orbita fino ai dati'(b) {
    const { ctx, p, errs } = await open(b, { waitSplash: false, seed: { holdReads: true }, init: SEEN });
    await w(p, 1500);
    const mid = await p.evaluate(() => { const e = document.querySelector('[data-splash]'), g = e && e.querySelector('[data-led-grid]'); return e ? { text: e.innerText, phase: e.dataset.splashPhase, grid: g ? g.getAttribute('data-mode') : null, leds: g ? g.querySelectorAll('[data-led]').length : 0, status: !!e.querySelector('[role="status"]') } : null; });
    await w(p, 1700);
    const slow = await p.evaluate(() => { const e = document.querySelector('[data-splash]'), o = e && e.querySelector('[data-orbit-loader]'); return e ? { phase: e.dataset.splashPhase, orbit: o ? o.innerText : null, leds: !!e.querySelector('[data-led-grid]') } : null; });
    await p.evaluate(() => { window.firebase.__fake.holdReads = false; });
    const gone = await goneSplash(p, 3000);
    await ctx.close();
    assert(mid && mid.phase === 'loading', 'con i dati lenti lo splash se ne va prima dei dati: ' + JSON.stringify(mid));
    assert(slow && slow.phase === 'loading' && !slow.leds && /rete è lenta/.test(slow.orbit || ''), 'oltre 2,5 secondi le icone in orbita: ' + JSON.stringify(slow));
    assert(mid.grid === 'seq' && mid.leds === 8, 'luce a LED: ' + JSON.stringify(mid));
    assert(/Caricamento…/.test(mid.text) && mid.status, 'manca "Caricamento…": ' + JSON.stringify(mid));
    assert(gone, 'arrivati i dati lo splash non se ne va');
    assert(!errs.length, errs.join(' | '));
  },

  async 'Rimuovi animazioni: LED accesi fermi e "Caricamento…", niente zoom'(b) {
    const { ctx, p, errs } = await open(b, { waitSplash: false, reducedMotion: 'reduce', init: RECORD });
    const gone = await goneSplash(p, 6000);
    const L = await log(p);
    await ctx.close();
    assert(JSON.stringify(L.phases) === '["loading"]', 'fasi viste: ' + JSON.stringify(L.phases));
    assert(JSON.stringify(L.grids) === '["idle:8"]' && L.ledAnim === 'none', 'i LED non sono fermi e accesi: ' + JSON.stringify({ grids: L.grids, anim: L.ledAnim }));
    assert(JSON.stringify(L.texts) === '["Caricamento…"]' && !L.sawZoom && !L.sawOpen, 'scritte e zoom: ' + JSON.stringify(L));
    assert(gone, 'lo splash non se ne va');
    assert(!errs.length, errs.join(' | '));
  },
});
