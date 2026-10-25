// Test della 2.0 (versione 20): nel Second Screen l'altezza delle grafiche si cambia trascinando una maniglietta
// nell'angolo in basso a destra (½, 1, 1½ o 2 posti; l'altra grafica della colonna si stringe fino a ½),
// anche con lo schermo girato; più è alta la grafica, più piloti si scelgono. Grafiche B&T Insights con nomi
// e colori nostri.
// Uso: bash rtest/build.sh && node rtest/run18.js [filtro]      (PAGE=real.html per React vero)
const { chromium } = require('/opt/node-tools/node_modules/playwright');
// Le notizie, le previsioni, i video e il calendario d'esempio della 2.0 ora stanno su Firebase (Task 6): il Firebase
// finto parte con quei documenti, così le prove li ritrovano.
const SEED_20 = require('../fixtures/seed-2.0.json');
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const NOW = '2026-09-30T11:48:00Z';

async function open(b, { now = NOW, width = 390, height = 844 } = {}) {
  const ctx = await b.newContext({ viewport: { width, height }, hasTouch: true });
  await ctx.route('https://api.jolpi.ca/**', r => r.abort());               // 24/10: classifiche di Jolpica e previsioni
  await ctx.route('https://bt-app-2.vercel.app/**', r => r.abort());   // meteo di serie non rispondono (come helpers.js)
  await ctx.addInitScript(seed => { window.__btSeed = seed; }, SEED_20);
  await ctx.addInitScript(now => { window.open = () => null; window.__btNow = Date.parse(now); }, now);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/' + (process.env.PAGE || 'test.html')); await p.waitForTimeout(400);
  return { ctx, p, errs };
}
const w = (p, ms = 300) => p.waitForTimeout(ms);
const text = p => p.evaluate(() => document.body.innerText);
const norm = s => s.replace(/\s+/g, ' ').trim();
async function tapText(p, txt, { exact = false, timeout = 4000, sel = 'button' } = {}) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const ok = await p.evaluate(({ txt, exact, sel }) => { const n = s => s.replace(/\s+/g, ' ').trim(); const el = [...document.querySelectorAll(sel)].find(b => exact ? n(b.textContent) === txt : n(b.textContent).includes(txt)); if (!el) return false; el.click(); return true; }, { txt, exact, sel });
    if (ok) return; await w(p, 150);
  }
  throw new Error(`bottone non trovato: "${txt}"`);
}
async function tapSel(p, sel, timeout = 4000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; e.click(); return true; }, sel)) return; await w(p, 150); }
  throw new Error(`elemento non trovato: ${sel}`);
}
const has = (p, sel) => p.evaluate(s => !!document.querySelector(s), sel);
const count = (p, sel) => p.evaluate(s => document.querySelectorAll(s).length, sel);
const inner = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); return e ? e.innerText.replace(/\s+/g, ' ').trim() : null; }, sel);
const attrs = (p, sel, a) => p.evaluate(([s, a]) => [...document.querySelectorAll(s)].map(e => e.getAttribute(a)), [sel, a]);
async function login(p) {
  await p.fill('#authEmail', 'a@b.it'); await p.fill('#authPw', 'x');
  await p.evaluate(() => { const bs = [...document.querySelectorAll('button')].filter(b => b.textContent.replace(/\s+/g, ' ').trim() === 'ACCEDI'); bs[bs.length - 1].click(); });
  await w(p, 2500); await p.waitForFunction(() => !document.querySelector('[data-splash]'), null, { timeout: 8000 }).catch(() => {}); await w(p, 400);   // Task 9: si aspetta la fine dello splash (i Termini li ha già accettati il Firebase finto)
}
const goTab = async (p, t) => { await tapText(p, t, { exact: true }); await w(p, 400); };
async function openAdmin(p, tab) {
  await tapSel(p, '[aria-label="Profilo"]'); await w(p); await tapText(p, 'Pannello Admin'); await w(p);
  const keypad = await p.evaluate(() => [...document.querySelectorAll('button')].some(b => b.textContent.trim() === '8'));
  if (keypad) { for (const d of '080824') { await tapText(p, d, { exact: true }); await w(p, 60); } await w(p, 900); }
  if (tab) { await tapText(p, tab, { exact: true }); await w(p, 300); }
}
const backHome = async p => { await tapSel(p, '[aria-label="Indietro"]'); await w(p); await tapSel(p, '[aria-label="Indietro"]'); await w(p); };
async function startLive(p, session, then = 'RACE') { await openAdmin(p, 'GARA LIVE'); await tapText(p, 'AVVIA ' + session, { exact: true }); await w(p, 300); await backHome(p); if (then) await goTab(p, then); }
const advance = (p, sec) => p.evaluate(s => window.__btLive.advance(s), sec);
const assert = (c, m) => { if (!c) throw new Error(m); };
async function premiumTrial(p) {
  await tapSel(p, '[aria-label="Profilo"]'); await w(p); await tapText(p, 'Passa a Premium'); await w(p, 300);
  await tapText(p, 'PROVA GRATIS'); await w(p, 1500); await tapText(p, 'INIZIA'); await w(p, 300);
  await tapSel(p, '[aria-label="Indietro"]'); await w(p, 300);
}
async function openSS(p) { await tapText(p, 'Modalità Second Screen'); await w(p, 600); }
const hOf = (p, id) => p.evaluate(id => { const e = document.querySelector(`[data-ss-slot="${id}"]`); return e ? +e.getAttribute('data-ss-h') : null; }, id);
const pxOf = (p, id) => p.evaluate(id => { const e = document.querySelector(`[data-ss-slot="${id}"]`); return e ? e.offsetHeight : null; }, id);
const colOf = (p, col) => attrs(p, `[data-ss-col="${col}"] [data-ss-slot]`, 'data-ss-slot');
// Trascina la maniglietta di una grafica di n mezzi posti "in giù" nella schermata del Second Screen
// (n negativo = in su). Con il telefono in verticale la schermata è girata: si usa la sua rotazione vera.
async function dragGrip(p, id, n) {
  const g = await p.evaluate(id => {
    const e = document.querySelector(`[data-ss-grip="${id}"]`); if (!e) return null;
    const r = e.getBoundingClientRect(), col = e.closest('[data-ss-col]'), st = document.querySelector('[data-ss-stage]');
    const m = /matrix\(([^)]+)\)/.exec(getComputedStyle(st).transform), v = m ? m[1].split(',').map(Number) : [1, 0, 0, 1];
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, unit: (col.offsetHeight + 8) / 4, c: v[2], d: v[3] };
  }, id);
  if (!g) throw new Error('manca la maniglietta di ' + id);
  const dx = g.c * n * g.unit, dy = g.d * n * g.unit;
  await p.mouse.move(g.x, g.y); await p.mouse.down();
  for (let i = 1; i <= 10; i++) { await p.mouse.move(g.x + dx * i / 10, g.y + dy * i / 10); await w(p, 20); }
  await p.mouse.up(); await w(p, 250);
}

const tests = {
  async 'maniglietta: in basso a destra di ogni grafica, al posto dei tasti ½ · 1 · 2'(b) {
    const { ctx, p, errs } = await open(b, { width: 844, height: 390 }); await login(p); await premiumTrial(p); await startLive(p, 'GARA');
    await openSS(p);
    const out = await p.evaluate(() => [...document.querySelectorAll('[data-ss-slot]')].map(s => {
      const g = s.querySelector('[data-ss-grip]'); if (!g) return { id: s.getAttribute('data-ss-slot'), grip: false };
      const r = s.getBoundingClientRect(), q = g.getBoundingClientRect();
      return { id: s.getAttribute('data-ss-slot'), grip: true, role: g.getAttribute('role'), corner: r.right - q.right < 12 && r.bottom - q.bottom < 12 && q.width >= 18 && q.height >= 18 };
    }));
    await tapSel(p, '[aria-label="Modifica grafiche"]'); await w(p, 300);
    const buttons = await count(p, '[data-ss-size]');
    const inEdit = await count(p, '[data-ss-slot] [data-ss-grip]');
    await ctx.close();
    assert(out.length === 4 && out.every(x => x.grip && x.corner), 'maniglietta mancante o non nell\'angolo in basso a destra: ' + JSON.stringify(out));
    assert(out.every(x => x.role === 'slider'), 'la maniglietta non dice cosa fa (slider): ' + JSON.stringify(out));
    assert(buttons === 0, 'ci sono ancora i tasti ½ · 1 · 2: ' + buttons);
    assert(inEdit === 4, 'in Modifica la maniglietta sparisce: ' + inEdit);
    assert(!errs.length, errs.join(' | '));
  },
  async 'maniglietta: trascinando in giù diventa 1 e ½ e l\'altra della colonna si stringe a ½; in su torna piccola'(b) {
    const { ctx, p, errs } = await open(b, { width: 844, height: 390 }); await login(p); await premiumTrial(p); await startLive(p, 'GARA');
    await openSS(p);
    await dragGrip(p, 'settori', 1);
    const a = { settori: await hOf(p, 'settori'), telemetria: await hOf(p, 'telemetria'), pxS: await pxOf(p, 'settori'), pxT: await pxOf(p, 'telemetria') };
    await dragGrip(p, 'settori', 2);   // 2 posti: non entra con un'altra grafica nella colonna
    const capped = await hOf(p, 'settori'), hint = norm(await text(p));
    await dragGrip(p, 'settori', -2);
    const small = await hOf(p, 'settori'), sheet = await has(p, '[data-ss-sheet]');
    await ctx.close();
    assert(a.settori === 3 && a.telemetria === 1, `dopo il trascinamento: settori ${a.settori}, telemetria ${a.telemetria} (attesi 1½ e ½)`);
    assert(a.pxS > a.pxT * 2.6, `altezze sbagliate: ${a.pxS} px contro ${a.pxT} px`);
    assert(capped === 3 && /da sola/i.test(hint), 'con un\'altra grafica nella colonna diventa alta 2 posti, o non lo spiega: ' + capped);
    assert(small === 1, 'trascinando in su non torna a ½: ' + small);
    assert(!sheet, 'trascinando la maniglietta si è aperta la scheda');
    assert(!errs.length, errs.join(' | '));
  },
  async 'maniglietta: da sola nella colonna arriva a 2 posti; col telefono in verticale si trascina lo stesso'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await premiumTrial(p); await startLive(p, 'GARA');
    await openSS(p);
    await tapSel(p, '[aria-label="Modifica grafiche"]'); await w(p, 200); await tapSel(p, '[data-ss-chip="classifica"]'); await w(p, 200);
    await tapSel(p, '[aria-label="Modifica grafiche"]'); await w(p, 300);
    await dragGrip(p, 'gomme', 2);
    const two = await hOf(p, 'gomme'), left = await colOf(p, 'left');
    await dragGrip(p, 'gomme', -1);
    const oneHalf = await hOf(p, 'gomme');
    await ctx.close();
    assert(left.join() === 'gomme' && two === 4, `da sola nella colonna: ${left.join(',')} alta ${two} (attesi 2 posti)`);
    assert(oneHalf === 3, 'trascinando in su di mezzo posto non diventa 1 e ½: ' + oneHalf);
    assert(!errs.length, errs.join(' | '));
  },
  async 'maniglietta: si usa anche coi tasti freccia (accessibilità)'(b) {
    const { ctx, p } = await open(b, { width: 844, height: 390 }); await login(p); await premiumTrial(p); await startLive(p, 'GARA');
    await openSS(p);
    await p.focus('[data-ss-grip="classifica"]'); await p.keyboard.press('ArrowDown'); await w(p, 200);
    const down = { c: await hOf(p, 'classifica'), g: await hOf(p, 'gomme'), val: await p.evaluate(() => document.querySelector('[data-ss-grip="classifica"]').getAttribute('aria-valuetext')) };
    await p.keyboard.press('ArrowUp'); await p.keyboard.press('ArrowUp'); await w(p, 200);
    const up = await hOf(p, 'classifica');
    await ctx.close();
    assert(down.c === 3 && down.g === 1 && /1 posto e mezzo/.test(down.val || ''), 'freccia giù: ' + JSON.stringify(down));
    assert(up === 1, 'freccia su due volte: ' + up);
  },
  async 'più piloti nelle grafiche più alte: ½ → 2, 1 → 4, 1½ → 6, 2 → 10'(b) {
    const { ctx, p, errs } = await open(b, { width: 844, height: 390 }); await login(p); await premiumTrial(p); await startLive(p, 'GARA'); await advance(p, 200);
    await openSS(p);
    await tapSel(p, '[aria-label="Modifica grafiche"]'); await w(p, 200); await tapSel(p, '[data-ss-chip="classifica"]'); await w(p, 200);
    await tapSel(p, '[aria-label="Modifica grafiche"]'); await w(p, 300);
    const rows = {};
    rows[2] = await count(p, '[data-ss-tyre-row]');
    await p.focus('[data-ss-grip="gomme"]'); await p.keyboard.press('ArrowDown'); await w(p, 200); rows[3] = await count(p, '[data-ss-tyre-row]');
    await p.keyboard.press('ArrowDown'); await w(p, 200); rows[4] = await count(p, '[data-ss-tyre-row]');
    await tapSel(p, '[aria-label="Scegli i piloti delle gomme"]'); await w(p, 300);
    const all = await attrs(p, '[data-ss-picker="gomme"] [data-pick-driver]', 'data-pick-driver');
    for (const id of await attrs(p, '[data-ss-picker="gomme"] [data-pick-driver][aria-pressed="true"]', 'data-pick-driver')) { await tapSel(p, `[data-ss-picker="gomme"] [data-pick-driver="${id}"]`); await w(p, 40); }
    const want = all.slice(-11);
    for (const id of want) { await tapSel(p, `[data-ss-picker="gomme"] [data-pick-driver="${id}"]`); await w(p, 40); }
    const t = norm(await text(p)); const counter = await inner(p, '[data-ss-picker="gomme"] [data-pick-count]');
    await tapText(p, 'Fatto', { exact: true, sel: '[data-ss-picker="gomme"] button' }); await w(p, 300);
    const chosen = await attrs(p, '[data-ss-tyre-row]', 'data-ss-tyre-row');
    await p.focus('[data-ss-grip="gomme"]'); for (let i = 0; i < 3; i++) await p.keyboard.press('ArrowUp'); await w(p, 300);
    rows[1] = await count(p, '[data-ss-tyre-row]');
    // anche i settori: alti 2 posti mostrano 10 piloti
    await p.focus('[data-ss-grip="telemetria"]'); await p.keyboard.press('ArrowUp'); await w(p, 150);
    await p.focus('[data-ss-grip="settori"]'); await p.keyboard.press('ArrowDown'); await w(p, 300);
    const secRows = await count(p, '[data-ss-sector-row]');
    await ctx.close();
    assert(rows[2] === 4 && rows[3] === 6 && rows[4] === 10, 'piloti delle gomme per altezza: ' + JSON.stringify(rows));
    assert(/massimo 10/i.test(t) && counter === '10/10', 'con 2 posti si scelgono fino a 10 piloti: ' + counter);
    assert(chosen.length === 10 && chosen.every(id => want.slice(0, 10).includes(id)), 'piloti scelti: ' + chosen.join(','));
    assert(rows[1] === 2, 'alta ½ deve mostrare 2 piloti: ' + rows[1]);
    assert(secRows === 6, 'settori alti 1 posto e mezzo: ' + secRows + ' piloti (attesi 6)');
    assert(!errs.length, errs.join(' | '));
  },
  async 'alte ½ posto: le righe di classifica, settori e gomme si vedono intere'(b) {
    const { ctx, p, errs } = await open(b, { width: 844, height: 390 }); await login(p); await premiumTrial(p); await startLive(p, 'GARA'); await advance(p, 200);
    await openSS(p);
    for (const id of ['classifica', 'settori']) { await p.focus(`[data-ss-grip="${id}"]`); await p.keyboard.press('ArrowUp'); await w(p, 200); }
    await p.focus('[data-ss-grip="gomme"]'); await p.keyboard.press('Home'); await w(p, 300);
    const out = await p.evaluate(() => ['classifica', 'settori', 'gomme'].map(id => {
      const body = document.querySelector(`[data-ss-widget="${id}"] [data-ss-body]`); if (!body) return { id, body: false };
      // righe intere (dentro la grafica) e righe tagliate (dentro solo in parte)
      const B = body.getBoundingClientRect(), rows = [...body.children[0].children].map(r => r.getBoundingClientRect());
      const inside = r => r.top >= B.top - 0.5 && r.bottom <= B.bottom + 0.5 && r.left >= B.left - 0.5 && r.right <= B.right + 0.5;
      const touches = r => r.top < B.bottom - 0.5 && r.bottom > B.top + 0.5 && r.left < B.right - 0.5 && r.right > B.left + 0.5;
      return { id, h: document.querySelector(`[data-ss-slot="${id}"]`).getAttribute('data-ss-h'), whole: rows.filter(inside).length, cut: rows.filter(r => touches(r) && !inside(r)).length };
    }));
    await ctx.close();
    assert(out.every(x => x.body !== false && x.h === '1'), 'grafiche non alte ½ posto: ' + JSON.stringify(out));
    assert(out.every(x => x.whole >= 2 && x.cut === 0), 'righe tagliate: ' + JSON.stringify(out));
    assert(!errs.length, errs.join(' | '));
  },
  async 'il titolo dice quanti piloti si vedono, senza tagli'(b) {
    const { ctx, p, errs } = await open(b, { width: 844, height: 390 }); await login(p); await premiumTrial(p); await startLive(p, 'GARA');
    await openSS(p);
    await p.focus('[data-ss-grip="settori"]'); await p.keyboard.press('ArrowDown'); await w(p, 300);
    const t = await p.evaluate(() => ['settori', 'gomme'].map(id => { const e = document.querySelector(`[data-ss-widget="${id}"] [data-ss-title]`); return e ? { id, text: e.textContent, cut: e.scrollWidth > e.clientWidth + 1 } : { id, text: null }; }));
    await ctx.close();
    assert(t[0].text && /PRIMI 6/.test(t[0].text) && !t[0].cut, 'settori: ' + JSON.stringify(t[0]));
    assert(t[1].text && /PRIMI 4/.test(t[1].text) && !t[1].cut, 'gomme: ' + JSON.stringify(t[1]));
    assert(!errs.length, errs.join(' | '));
  },
  async 'posto libero anche fuori da Modifica: si vede e toccandolo si aggiunge una grafica'(b) {
    const { ctx, p, errs } = await open(b, { width: 844, height: 390 }); await login(p); await premiumTrial(p); await startLive(p, 'GARA');
    await openSS(p);
    await p.focus('[data-ss-grip="telemetria"]'); await p.keyboard.press('ArrowUp'); await w(p, 300);
    const free = await inner(p, '[data-ss-col="right"] [data-ss-free="right"]');
    const chipsBefore = await count(p, '[data-ss-chip]');
    await tapSel(p, '[data-ss-free="right"]'); await w(p, 300);
    const chipsAfter = await count(p, '[data-ss-chip]'), sheet = await has(p, '[data-ss-sheet]');
    await ctx.close();
    assert(free && /posto libero/i.test(free), 'fuori da Modifica il posto libero non si vede: ' + free);
    assert(chipsBefore === 0 && chipsAfter === 10 && !sheet, `toccando il posto libero non si apre Modifica: ${chipsBefore} → ${chipsAfter}`);
    assert(!errs.length, errs.join(' | '));
  },
  async 'insights: nomi e colori nostri (Chi raggiunge chi, Strategie ai box, Ritmo gara, Frenata a confronto, Pagella monoposto)'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await startLive(p, 'GARA'); await advance(p, 1500); await w(p, 300);
    const tabs = await p.evaluate(() => [...document.querySelectorAll('[data-insights] [data-insight-tab]')].map(e => e.textContent.trim()));
    const titles = {};
    for (const t of ['sorpasso', 'strategia', 'passo', 'frenata', 'vettura']) { await tapSel(p, `[data-insights] [data-insight-tab="${t}"]`); await w(p, 150); titles[t] = await inner(p, `[data-insights] [data-insight="${t}"]`); }
    const band = await p.evaluate(() => { const e = document.querySelector('[data-insights] [data-insight-band]'); return e ? getComputedStyle(e).backgroundColor : null; });
    await ctx.close();
    assert(JSON.stringify(tabs) === JSON.stringify(['Chi raggiunge chi', 'Strategie', 'Ritmo gara', 'Frenata', 'Pagella']), 'schede: ' + tabs.join(', '));
    const want = { sorpasso: 'CHI RAGGIUNGE CHI', strategia: 'STRATEGIE AI BOX', passo: 'RITMO GARA', frenata: 'FRENATA A CONFRONTO', vettura: 'PAGELLA MONOPOSTO' };
    for (const [k, v] of Object.entries(want)) assert(titles[k] && titles[k].includes(v), `${k}: ${titles[k] && titles[k].slice(0, 80)}`);
    assert(Object.values(titles).every(t => !/BRAKING|PERFORMANCE|BATTLE FORECAST|PRESTAZIONI IN FRENATA|PRESTAZIONI VETTURA/.test(t)), 'restano nomi tradotti da quelli di F1');
    assert(band === 'rgb(255, 24, 1)', 'la fascia non è nel rosso LED dei tasti (Tappa 3, G01): ' + band);
    assert(!errs.length, errs.join(' | '));
  },
};

(async () => {
  const filter = process.argv[2] ? new RegExp(process.argv[2], 'i') : null;
  const b = await chromium.launch({ executablePath: EXE });
  let pass = 0, fail = 0;
  for (const [name, fn] of Object.entries(tests)) {
    if (filter && !filter.test(name)) continue;
    try { await fn(b); pass++; console.log('PASS  ' + name); }
    catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + String(e.message).split('\n')[0].slice(0, 400)); }
  }
  await b.close();
  console.log(`\n${pass} passati, ${fail} falliti`);
  process.exit(fail ? 1 : 0);
})();
