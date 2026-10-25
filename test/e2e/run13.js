// Test della 2.0: caschi come foto piccole, Premium di prova, diretta in stile F1Dash
// (mappa con i piloti, bandiere e sfondo, settori e minisettori, direzione gara, meteo, telemetria).
// Uso: bash rtest/build.sh && node rtest/run13.js [filtro]
const { chromium } = require('/opt/node-tools/node_modules/playwright');
// Le notizie, le previsioni, i video e il calendario d'esempio della 2.0 ora stanno su Firebase (Task 6): il Firebase
// finto parte con quei documenti, così le prove li ritrovano.
const SEED_20 = require('../fixtures/seed-2.0.json');
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

async function open(b) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await ctx.route('https://api.jolpi.ca/**', r => r.abort());               // 24/10: classifiche di Jolpica e previsioni
  await ctx.route('https://bt-app-2.vercel.app/**', r => r.abort());   // meteo di serie non rispondono (come helpers.js)
  await ctx.addInitScript(() => { window.__btNow = window.__btNow || Date.parse('2026-09-30T11:48:00Z'); });   // ora fissa: mercoledì prima del GP in Malesia (come run14-23)
  await ctx.addInitScript(seed => { window.__btSeed = seed; }, SEED_20);
  await ctx.addInitScript(() => { window.open = () => null; });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/' + (process.env.PAGE || 'test.html')); await p.waitForTimeout(400);
  return { ctx, p, errs };
}
const w = (p, ms = 300) => p.waitForTimeout(ms);
const text = p => p.evaluate(() => document.body.innerText);
async function tapText(p, txt, { exact = false, timeout = 4000 } = {}) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const ok = await p.evaluate(({ txt, exact }) => { const n = s => s.replace(/\s+/g, ' ').trim(); const el = [...document.querySelectorAll('button')].find(b => exact ? n(b.textContent) === txt : n(b.textContent).includes(txt)); if (!el) return false; el.click(); return true; }, { txt, exact });
    if (ok) return; await w(p, 150);
  }
  throw new Error(`bottone non trovato: "${txt}"`);
}
async function tapSel(p, sel, timeout = 4000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; e.click(); return true; }, sel)) return; await w(p, 150); }
  throw new Error(`elemento non trovato: ${sel}`);
}
async function login(p) {
  await p.fill('#authEmail', 'a@b.it'); await p.fill('#authPw', 'x');
  await p.evaluate(() => { const bs = [...document.querySelectorAll('button')].filter(b => b.textContent.replace(/\s+/g, ' ').trim() === 'ACCEDI'); bs[bs.length - 1].click(); });
  await w(p, 2500); await p.waitForFunction(() => !document.querySelector('[data-splash]'), null, { timeout: 8000 }).catch(() => {}); await w(p, 400);   // Task 9: si aspetta la fine dello splash (i Termini li ha già accettati il Firebase finto)
}
const goRace = async p => { await tapText(p, 'RACE', { exact: true }); await w(p, 400); };
async function openAdminLive(p) {
  await tapSel(p, '[aria-label="Profilo"]'); await w(p); await tapText(p, 'Pannello Admin'); await w(p);
  const keypad = await p.evaluate(() => [...document.querySelectorAll('button')].some(b => b.textContent.trim() === '8'));
  if (keypad) { for (const d of '080824') { await tapText(p, d, { exact: true }); await w(p, 60); } await w(p, 900); }   // il codice serve solo la prima volta
  await tapText(p, 'GARA LIVE', { exact: true }); await w(p, 300);
}
const backHome = async p => { await tapSel(p, '[aria-label="Indietro"]'); await w(p); await tapSel(p, '[aria-label="Indietro"]'); await w(p); };
// Avvia una sessione demo dal pannello admin e torna alla pagina Race.
async function startLive(p, session = 'GARA') { await openAdminLive(p); await tapText(p, 'AVVIA ' + session, { exact: true }); await w(p, 300); await backHome(p); await goRace(p); }
const advance = (p, sec) => p.evaluate(s => window.__btLive.advance(s), sec);
const bg = p => p.evaluate(() => { const e = document.querySelector('[data-bg]'); return e ? e.getAttribute('data-bg') : null; });
const assert = (c, m) => { if (!c) throw new Error(m); };

const tests = {
  async 'SKIP foto tolte (Task 14): caschi: le foto piccole dei piloti sono i caschi'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await goRace(p);
    const n = await p.evaluate(() => [...document.querySelectorAll('[data-img="casco"]')].filter(s => /data:image\/webp/.test(s.style.backgroundImage)).length);
    await ctx.close();
    assert(n >= 19, 'foto piccole con il casco: ' + n + ' (dal 4° in giù; i primi 3 sono sul podio)');
    assert(!errs.length, 'errori JS: ' + errs.join(' | '));
  },
  async 'premium: per ora si attiva per prova, senza pagare'(b) {
    const { ctx, p } = await open(b); await login(p);
    await tapSel(p, '[aria-label="Profilo"]'); await w(p); await tapText(p, 'Passa a Premium'); await w(p, 300);
    await tapText(p, 'PROVA GRATIS'); await w(p, 1500);   // dalla versione 16: prova gratuita di 2 settimane
    const t = await text(p); await ctx.close();
    assert(/Prova gratuita attiva!/.test(t), 'il Premium di prova non si attiva');
  },
  async 'fuori diretta: la prossima gara resta come prima'(b) {
    const { ctx, p } = await open(b); await login(p); await goRace(p);
    const t = await text(p); const map = await p.evaluate(() => !!document.querySelector('[data-live-map]')); await ctx.close();
    assert(/PROSSIMA GARA/.test(t) && /GP del Bahrain in Malesia/.test(t), 'manca la prossima gara (dalla v17: Bahrain in Malesia)');
    assert(!map, 'la mappa live compare anche senza diretta');
  },
  async 'diretta gara: mappa del circuito con i 22 piloti che si muovono e giro 1/56 (Sepang)'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await startLive(p, 'GARA');
    const t = await text(p);
    const n = await p.evaluate(() => document.querySelectorAll('[data-live-map] [data-car]').length);
    const pos1 = await p.evaluate(() => [...document.querySelectorAll('[data-live-map] [data-car]')].map(e => e.getAttribute('data-pos')).join('|'));
    await advance(p, 30); await w(p, 400);
    const pos2 = await p.evaluate(() => [...document.querySelectorAll('[data-live-map] [data-car]')].map(e => e.getAttribute('data-pos')).join('|'));
    await ctx.close();
    assert(/IN DIRETTA/.test(t) && /GIRO 1\/56/.test(t), 'manca "IN DIRETTA" o "GIRO 1/56"');
    assert(n === 22, 'puntini sulla mappa: ' + n);
    assert(pos1 !== pos2, 'i puntini non si muovono');
    assert(!errs.length, 'errori JS: ' + errs.join(' | '));
  },
  async 'bandiere: primo giro a scacchi, gialla/SC/VSC pagina gialla, rossa pagina rossa, ultimo giro a scacchi'(b) {
    const { ctx, p } = await open(b); await login(p); await startLive(p, 'GARA');
    const seen = [['inizio', await bg(p), await text(p)]];
    for (const [btn, label] of [['GIALLA', 'BANDIERA GIALLA'], ['SC', 'SAFETY CAR'], ['VSC', 'VIRTUAL SAFETY CAR'], ['ROSSA', 'BANDIERA ROSSA'], ['VERDE', null], ['ULTIMO GIRO', null]]) {
      await openAdminLive(p); await tapText(p, btn, { exact: true }); await w(p, 200); await backHome(p); await goRace(p);
      if (btn === 'VERDE') await advance(p, 120);
      seen.push([btn, await bg(p), await text(p), label]);
    }
    await ctx.close();
    const get = k => seen.find(s => s[0] === k);
    assert(get('inizio')[1] === 'chequered', 'al primo giro lo sfondo non è a scacchi: ' + get('inizio')[1]);
    for (const k of ['GIALLA', 'SC', 'VSC']) { assert(get(k)[1] === 'yellow', `con ${k} lo sfondo non è giallo: ${get(k)[1]}`); assert(get(k)[2].includes(get(k)[3]), `con ${k} manca la scritta "${get(k)[3]}"`); }
    assert(get('ROSSA')[1] === 'red' && get('ROSSA')[2].includes('BANDIERA ROSSA'), 'con la rossa lo sfondo non è rosso');
    assert(get('VERDE')[1] === 'green', 'a pista libera lo sfondo resta colorato: ' + get('VERDE')[1]);
    assert(get('ULTIMO GIRO')[1] === 'chequered' && /GIRO 56\/56/.test(get('ULTIMO GIRO')[2]), 'all\'ultimo giro niente scacchi');
  },
  async 'contrasto: con la pagina gialla o rossa i tasti oro (Premium, Second Screen) restano leggibili (fondo scuro pieno)'(b) {
    const { ctx, p } = await open(b); await login(p); await startLive(p, 'GARA');
    // Il tasto Premium in alto e il tasto "Modalità Second Screen" stanno direttamente sullo sfondo della pagina.
    const chip = () => p.evaluate(() => { const els = [document.querySelector('[data-premium-chip]'), [...document.querySelectorAll('button')].find(x => /Modalità Second Screen/.test(x.textContent))];
      if (els.some(e => !e)) return null; return els.map(e => getComputedStyle(e).backgroundColor).join(' | '); });
    const out = [];
    for (const btn of ['GIALLA', 'ROSSA']) {
      await openAdminLive(p); await tapText(p, btn, { exact: true }); await w(p, 200); await backHome(p); await goRace(p);
      out.push([btn, await bg(p), await chip()]);
    }
    await ctx.close();
    for (const [btn, pageBg, c] of out) {
      assert(pageBg === (btn === 'GIALLA' ? 'yellow' : 'red'), 'sfondo della pagina: ' + pageBg);
      assert(c, 'manca il tasto Premium in alto o il tasto Second Screen');
      for (const col of c.split(' | ')) {
        const alpha = /rgba\([^)]*,\s*([\d.]+)\)/.exec(col); const a = alpha ? parseFloat(alpha[1]) : 1;
        assert(a === 1 && !/^rgba?\((2[0-9]{2}|1[5-9][0-9]),/.test(col), `con la ${btn} un tasto oro ha il fondo trasparente o chiaro (${c}): la scritta si confonde`);
      }
    }
  },
  async 'tempi: settori, minisettori e giro con i colori (viola, verde, giallo)'(b) {
    const { ctx, p } = await open(b); await login(p); await startLive(p, 'GARA');
    await advance(p, 260); await w(p, 400);
    const r = await p.evaluate(() => ({
      rows: document.querySelectorAll('[data-timing-row]').length,
      minis: document.querySelectorAll('[data-timing-row] [data-mini]').length,
      colors: [...new Set([...document.querySelectorAll('[data-timing-row] [data-mini]')].map(e => e.getAttribute('data-mini')))],
      sectors: [...document.querySelectorAll('[data-timing-row]')][0].innerText,
    }));
    await ctx.close();
    assert(r.rows === 22, 'righe dei tempi: ' + r.rows);
    assert(r.minis === 22 * 24, 'minisettori: ' + r.minis);
    assert(r.colors.includes('purple') && (r.colors.includes('green') || r.colors.includes('yellow')), 'colori dei minisettori: ' + r.colors);
    assert(/S1/.test(r.sectors) && /S2/.test(r.sectors) && /S3/.test(r.sectors) && /\d:\d\d\.\d{3}/.test(r.sectors), 'nella riga mancano settori o tempo sul giro: ' + r.sectors);
  },
  async 'direzione gara: investigazioni, limiti della pista, penalità e incidenti'(b) {
    const { ctx, p } = await open(b); await login(p); await startLive(p, 'GARA');
    await advance(p, 620); await w(p, 300);
    await tapText(p, 'Direzione gara', { exact: true }); await w(p, 300);
    const t = await text(p); await ctx.close();
    for (const x of ['LIMITI DELLA PISTA', 'INVESTIGA', 'PENALITÀ', 'INCIDENTE']) assert(t.includes(x), 'manca il messaggio: ' + x);
  },
  // Task 17 (D08-D10): radar e previsioni erano simulati; restano le sessioni del weekend per il pronostico e, senza
  // sessione, la frase dello stato vuoto del meteo vero.
  async 'meteo: niente radar né previsioni inventate; le sessioni FP1, FP2, FP3, qualifiche e gara per il pronostico'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await goRace(p);
    await tapText(p, 'Meteo', { exact: true }); await w(p, 600);
    const radar = await p.evaluate(() => !!document.querySelector('canvas'));
    const boxes = await p.evaluate(() => [...document.querySelectorAll('[data-weather-box]')].map(e => e.innerText));
    const emoji = await p.evaluate(() => /[☀⛅☂☁🌧]/u.test(document.body.innerText));
    const keys = await p.evaluate(() => [...document.querySelectorAll('[data-weather-box]')].map(e => e.getAttribute('data-weather-box')));
    let t = await text(p);
    for (const k of keys) { await tapSel(p, `[data-weather-box="${k}"]`); await w(p, 200); t += await text(p); await tapSel(p, `[data-weather-box="${k}"]`); await w(p, 100); }
    await ctx.close();
    assert(!radar && !/radar/i.test(t), 'c\'è ancora il radar simulato');
    assert(boxes.length === 5 && boxes.every(x => !/°|%/.test(x)), 'nelle caselle ci sono ancora previsioni inventate: ' + JSON.stringify(boxes));
    assert(!emoji, 'nel meteo ci sono ancora le emoji');
    for (const x of ['Prove libere 1', 'Prove libere 2', 'Prove libere 3', 'Qualifiche', 'Gara']) assert(t.includes(x), 'manca la sessione: ' + x);
    assert(!/Probabilità di pioggia/.test(t), 'ci sono ancora le previsioni scritte');
    assert(/Il meteo della sessione arriva con i dati veri a fine sessione\./.test(t), 'manca la frase del meteo vero a fine sessione');
    assert(!errs.length, 'errori JS: ' + errs.join(' | '));
  },
  async 'telemetria: toccando il tempo sul giro o un settore'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await startLive(p, 'GARA');
    await advance(p, 260); await w(p, 400);
    // Dalla versione 16: il tempo apre l'elenco dei giri (da lì la telemetria), il settore apre la telemetria di tutto il giro.
    await tapSel(p, '[aria-label^="Tempi sul giro di"]'); await w(p, 400);
    await tapSel(p, '[data-lap-row]'); await w(p, 500);
    const t1 = await text(p);
    const charts = await p.evaluate(() => document.querySelectorAll('[data-tel-chart] path').length);
    await tapSel(p, '[aria-label="Chiudi telemetria"]'); await w(p, 300); await tapSel(p, '[aria-label="Chiudi tempi"]'); await w(p, 300);
    await tapSel(p, '[data-sector-btn="2"]'); await w(p, 500);
    const t2 = await text(p); await ctx.close();
    assert(/TELEMETRIA/.test(t1), 'la telemetria non si apre');
    for (const x of ['Velocità', 'Acceleratore', 'Freno', 'Marcia']) assert(t1.includes(x), 'manca il grafico: ' + x);
    assert(charts >= 4, 'grafici vuoti: ' + charts);
    assert(/TELEMETRIA/.test(t2) && !/GIRO \d+ · SETTORE 2/.test(t2), 'toccando il settore non si apre la telemetria del giro intero');
    assert(!errs.length, 'errori JS: ' + errs.join(' | '));
  },
  async 'qualifiche: mappa, Q1 col cronometro e classifica per miglior giro'(b) {
    const { ctx, p } = await open(b); await login(p); await startLive(p, 'QUALIFICHE');
    await advance(p, 300); await w(p, 400);
    const t = await text(p); const n = await p.evaluate(() => document.querySelectorAll('[data-live-map] [data-car]').length);
    await ctx.close();
    assert(/Q1/.test(t) && /1[0-7]:\d\d/.test(t), 'manca Q1 con il cronometro');
    assert(n > 5, 'pochi piloti in pista in qualifica: ' + n);
  },
};

(async () => {
  const filter = process.argv[2] ? new RegExp(process.argv[2], 'i') : null;
  const b = await chromium.launch({ executablePath: EXE });
  let pass = 0, fail = 0, skip = 0;
  for (const [name, fn] of Object.entries(tests)) {
    if (filter && !filter.test(name)) continue;
    if (/^SKIP\b/.test(name)) { skip++; console.log(name); continue; }
    try { await fn(b); pass++; console.log('PASS  ' + name); }
    catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + String(e.message).split('\n')[0].slice(0, 250)); }
  }
  await b.close(); console.log(`\n${pass} passati, ${fail} falliti${skip ? `, ${skip} saltati` : ''}`); process.exit(fail ? 1 : 0);
})();
