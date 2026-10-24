// Test della 2.0 (versione 18, aggiornati alla 19): classifiche dal 4° sotto il podio, Second Screen con 4 grafiche, gomme di
// 4 piloti a scelta, telemetria del pilota scelto, radar meteo sulla mappa, voto del pilota e della scuderia
// del giorno, filigrana B&T sulla diretta, "About You" nel profilo e nella registrazione.
// Uso: bash rtest/build.sh && node rtest/run16.js [filtro]      (PAGE=real.html per React vero)
const { chromium } = require('/opt/node-tools/node_modules/playwright');
// Le notizie, le previsioni, i video e il calendario d'esempio della 2.0 ora stanno su Firebase (Task 6): il Firebase
// finto parte con quei documenti, così le prove li ritrovano.
const SEED_20 = require('../fixtures/seed-2.0.json');
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const NOW = '2026-09-30T11:48:00Z';

async function open(b, { now = NOW, width = 390, height = 844 } = {}) {
  const ctx = await b.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true });
  await ctx.route('https://api.jolpi.ca/**', r => r.abort());               // 24/10: classifiche di Jolpica e previsioni
  await ctx.route('https://bt-app-2.vercel.app/api/**', r => r.abort());   // meteo di serie non rispondono (come helpers.js)
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
async function lastLap(p) { await openAdmin(p, 'GARA LIVE'); await tapText(p, 'ULTIMO GIRO', { exact: true }); await w(p, 300); await backHome(p); await goTab(p, 'RACE'); }
async function finishRace(p) { await lastLap(p); for (let i = 0; i < 40 && !(await has(p, '[data-finish-podium]')); i++) { await advance(p, 20); await w(p, 120); } }
const advance = (p, sec) => p.evaluate(s => window.__btLive.advance(s), sec);
const assert = (c, m) => { if (!c) throw new Error(m); };
async function premiumTrial(p) {
  await tapSel(p, '[aria-label="Profilo"]'); await w(p); await tapText(p, 'Passa a Premium'); await w(p, 300);
  await tapText(p, 'PROVA GRATIS'); await w(p, 1500); await tapText(p, 'INIZIA'); await w(p, 300);
  await tapSel(p, '[aria-label="Indietro"]'); await w(p, 300);
}
async function openSS(p) { await tapText(p, 'Modalità Second Screen'); await w(p, 600); }
const widgets = p => attrs(p, '[data-ss-widget]', 'data-ss-widget');
// Filigrana: dentro il riquadro della mappa, piccola, trasparente e che non blocca i tocchi.
const watermark = (p, root) => p.evaluate(root => {
  const r = document.querySelector(root); if (!r) return { root: false };
  const wm = r.querySelector('[data-watermark]'); if (!wm) return { root: true, wm: false };
  const cs = getComputedStyle(wm), img = wm.querySelector('img');
  return { root: true, wm: true, opacity: +cs.opacity, events: cs.pointerEvents, wmW: wm.getBoundingClientRect().width, rootW: r.getBoundingClientRect().width, img: !!(img && /^data:image\//.test(img.getAttribute('src') || '')) };
}, root);

const tests = {
  // ── Classifiche: sotto il podio la lista parte dal 4° ─────────────────
  async 'mondiale: sotto il podio la classifica piloti e costruttori parte dal 4°'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await goTab(p, 'RACE');
    await tapText(p, 'Mondiale', { exact: true }); await w(p, 400);
    const piloti = (await attrs(p, '[data-champ-row]', 'data-champ-row')).map(Number);
    const podP = await has(p, '[data-champ-podium="piloti"]');
    await tapText(p, 'Costruttori', { exact: true }); await w(p, 400);
    const team = (await attrs(p, '[data-champ-row]', 'data-champ-row')).map(Number);
    await ctx.close();
    assert(podP, 'manca il podio del mondiale piloti');
    assert(piloti.length === 20 && piloti[0] === 4 && !piloti.some(x => x < 4), 'lista piloti: ' + piloti.join(','));
    assert(team.length === 8 && team[0] === 4 && !team.some(x => x < 4), 'lista costruttori: ' + team.join(','));
    assert(!errs.length, errs.join(' | '));
  },
  async 'mondiale: con la sessione in corso (niente podio) la lista parte dal 1°'(b) {
    const { ctx, p } = await open(b); await login(p); await startLive(p, 'GARA');
    await tapText(p, 'Mondiale', { exact: true }); await w(p, 400);
    const rows = (await attrs(p, '[data-champ-row]', 'data-champ-row')).map(Number); await ctx.close();
    assert(rows[0] === 1 && rows.length === 23, 'durante la diretta la lista deve essere completa: ' + rows.join(','));
  },
  async 'ultima gara: sotto il podio la classifica parte dal 4° (ritirati in fondo)'(b) {
    const { ctx, p } = await open(b); await login(p); await goTab(p, 'RACE');
    await tapSel(p, '[data-race-tab="classifica"]').catch(() => {}); await w(p, 300); const pos = await attrs(p, '[data-last-race="real"] [data-result-pos]', 'data-result-pos'); await ctx.close();
    assert(pos.length === 19 && pos[0] === '4' && !pos.some(x => ['1', '2', '3'].includes(x)), 'classifica ultima gara: ' + pos.join(','));
    assert(pos[pos.length - 1] === 'RIT', 'i ritirati non sono in fondo: ' + pos.join(','));
  },
  async 'gara appena finita: sotto il podio i tempi partono dal 4°, durante la gara dal 1°'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await startLive(p, 'GARA'); await advance(p, 200); await w(p, 300);
    const during = (await attrs(p, '[data-timing-pos]', 'data-timing-pos')).map(Number);
    await finishRace(p); await w(p, 300);
    const after = (await attrs(p, '[data-timing-pos]', 'data-timing-pos')).map(Number);
    const pod = await has(p, '[data-finish-podium]'); await ctx.close();
    assert(during[0] === 1 && during.length === 22, 'durante la gara: ' + during.join(','));
    assert(pod, 'a fine gara manca il podio');
    assert(after[0] === 4 && after.length === 19 && !after.some(x => x < 4), 'a fine gara: ' + after.join(','));
    assert(!errs.length, errs.join(' | '));
  },
  // ── Second Screen ─────────────────────────────────────────────────────
  async 'second screen: i 4 posti sono tutti usati di serie; con lo spazio pieno una grafica in più non entra'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await premiumTrial(p); await startLive(p, 'GARA');
    await openSS(p); await tapSel(p, '[aria-label="Modifica grafiche"]'); await w(p, 300);
    const chips = await attrs(p, '[data-ss-chip]', 'data-ss-chip');
    const four = await widgets(p);
    await tapSel(p, '[data-ss-chip="meteo"]'); await w(p, 200);
    const t = norm(await text(p)); const still = await widgets(p);
    await tapSel(p, '[data-ss-chip="gomme"]'); await w(p, 200); await tapSel(p, '[data-ss-chip="voto"]'); await w(p, 200);
    const after = await widgets(p); await ctx.close();
    assert(chips.includes('voto') && chips.includes('settori') && chips.length === 10, 'grafiche disponibili: ' + chips.join(','));
    assert(four.length === 4, 'di serie le grafiche sono: ' + four.join(','));
    assert(still.length === 4 && !still.includes('meteo') && /massimo 4/i.test(t), 'con lo spazio pieno la grafica in più non va rifiutata così: ' + still.join(','));
    assert(after.length === 4 && after.includes('voto') && !after.includes('gomme'), 'tolta una grafica, la nuova non entra: ' + after.join(','));
    assert(!errs.length, errs.join(' | '));
  },
  async 'second screen: usura gomme dei 4 piloti scelti (il 5° non entra)'(b) {
    const { ctx, p } = await open(b); await login(p); await premiumTrial(p); await startLive(p, 'GARA'); await advance(p, 120);
    await openSS(p);
    const before = await attrs(p, '[data-ss-tyre-row]', 'data-ss-tyre-row');
    await tapSel(p, '[aria-label="Scegli i piloti delle gomme"]'); await w(p, 300);
    const all = await attrs(p, '[data-ss-picker="gomme"] [data-pick-driver]', 'data-pick-driver');
    // toglie quelli già scelti e sceglie gli ultimi 5 della lista
    for (const id of await attrs(p, '[data-ss-picker="gomme"] [data-pick-driver][aria-pressed="true"]', 'data-pick-driver')) { await tapSel(p, `[data-ss-picker="gomme"] [data-pick-driver="${id}"]`); await w(p, 80); }
    const want = all.slice(-5);
    for (const id of want) { await tapSel(p, `[data-ss-picker="gomme"] [data-pick-driver="${id}"]`); await w(p, 80); }
    const t = norm(await text(p));
    await tapText(p, 'Fatto', { exact: true, sel: '[data-ss-picker="gomme"] button' }); await w(p, 300);
    const rows = await attrs(p, '[data-ss-tyre-row]', 'data-ss-tyre-row'); await ctx.close();
    assert(before.length === 4, 'all\'inizio le gomme vanno mostrate per 4 piloti: ' + before.length);
    assert(all.length === 22, 'nella scelta ci devono essere tutti i 22 piloti: ' + all.length);
    assert(/massimo 4/i.test(t), 'non avvisa che si scelgono al massimo 4 piloti');
    assert(rows.length === 4 && rows.every(id => want.slice(0, 4).includes(id)), `righe ${rows.join(',')} invece di ${want.slice(0, 4).join(',')}`);
  },
  async 'second screen: la telemetria mostra il pilota scelto dalla lista'(b) {
    const { ctx, p } = await open(b); await login(p); await premiumTrial(p); await startLive(p, 'GARA'); await advance(p, 120);
    await openSS(p);
    await tapSel(p, '[aria-label="Scegli il pilota della telemetria"]'); await w(p, 300);
    const all = await attrs(p, '[data-ss-picker="telemetria"] [data-pick-driver]', 'data-pick-driver');
    const target = all[all.length - 1];
    await tapSel(p, `[data-ss-picker="telemetria"] [data-pick-driver="${target}"]`); await w(p, 300);
    const open2 = await has(p, '[data-ss-picker="telemetria"]');
    const tel = await p.evaluate(() => document.querySelector('[data-ss-widget="telemetria"]').getAttribute('data-ss-tel-driver'));
    await ctx.close();
    assert(all.length === 22, 'piloti nella scelta: ' + all.length);
    assert(!open2, 'dopo la scelta l\'elenco resta aperto');
    assert(tel === target, `telemetria di ${tel} invece di ${target}`);
  },
  async 'second screen: radar meteo sulla mappa, si accende e si spegne'(b) {
    const { ctx, p } = await open(b); await login(p); await premiumTrial(p); await startLive(p, 'GARA');
    await openSS(p);
    const off = await has(p, '[data-ss-map] [data-ss-radar]');
    await tapSel(p, '[aria-label="Radar meteo sulla mappa"]'); await w(p, 400);
    const on = await p.evaluate(() => { const c = document.querySelector('[data-ss-map] [data-ss-radar]'); if (!c) return null; const m = document.querySelector('[data-ss-map] [data-live-map]'); return { canvas: c.tagName, pe: getComputedStyle(c).pointerEvents, map: !!m, pressed: document.querySelector('[aria-label="Radar meteo sulla mappa"]').getAttribute('aria-pressed') }; });
    await tapSel(p, '[aria-label="Radar meteo sulla mappa"]'); await w(p, 300);
    const off2 = await has(p, '[data-ss-map] [data-ss-radar]'); await ctx.close();
    assert(!off, 'il radar è acceso prima di sceglierlo');
    assert(on && on.canvas === 'CANVAS' && on.map && on.pe === 'none' && on.pressed === 'true', 'radar sulla mappa: ' + JSON.stringify(on));
    assert(!off2, 'il radar non si spegne');
  },
  // ── Voto del pilota e della scuderia del giorno ───────────────────────
  async 'voto del giorno: si apre a metà gara, si vota pilota e scuderia e si vedono i risultati'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await startLive(p, 'GARA'); await advance(p, 200); await w(p, 300);
    const early = await inner(p, '[data-dotd]');
    const earlyBtn = await has(p, '[data-dotd] [data-vote-kind="driver"] [data-vote-open]');
    await lastLap(p); await w(p, 300);
    await tapSel(p, '[data-dotd] [data-vote-kind="driver"] [data-vote-open]'); await w(p, 300);
    const opts = await attrs(p, '[data-vote-option]', 'data-vote-option');
    await tapSel(p, `[data-vote-option="${opts[opts.length - 1]}"]`); await w(p, 300);
    await tapSel(p, '[data-dotd] [data-vote-kind="team"] [data-vote-open]'); await w(p, 300);
    const topts = await attrs(p, '[data-vote-option]', 'data-vote-option');
    await tapSel(p, `[data-vote-option="${topts[0]}"]`); await w(p, 300);
    const t = await inner(p, '[data-dotd]');
    const pct = await p.evaluate(() => [...document.querySelectorAll('[data-dotd] [data-vote-kind="driver"] [data-vote-result]')].map(e => parseFloat(e.getAttribute('data-vote-result'))));
    const again = await has(p, '[data-dotd] [data-vote-kind="driver"] [data-vote-open]');
    await ctx.close();
    assert(early && /metà gara/i.test(early) && !earlyBtn, 'prima di metà gara si può già votare: ' + early);
    assert(opts.length === 22 && topts.length === 11, `opzioni di voto: ${opts.length} piloti, ${topts.length} scuderie`);
    assert(/Hai votato/.test(t) && /PILOTA DEL GIORNO/i.test(t) && /SCUDERIA DEL GIORNO/i.test(t), 'dopo il voto: ' + t);
    assert(pct.length >= 3 && pct.every(x => x > 0 && x <= 100), 'percentuali dei risultati: ' + pct.join(','));
    assert(!again, 'si può votare due volte');
    assert(!errs.length, errs.join(' | '));
  },
  async 'voto del giorno: c\'è anche come grafica del Second Screen'(b) {
    const { ctx, p } = await open(b); await login(p); await premiumTrial(p); await startLive(p, 'GARA'); await lastLap(p);
    await openSS(p); await tapSel(p, '[aria-label="Modifica grafiche"]'); await w(p, 300);
    // lo spazio di serie è pieno: si toglie una grafica per mettere il voto
    await tapSel(p, '[data-ss-chip="gomme"]'); await w(p, 200); await tapSel(p, '[data-ss-chip="voto"]'); await w(p, 300);
    const t = await inner(p, '[data-ss-widget="voto"]');
    const btn = await has(p, '[data-ss-widget="voto"] [data-vote-open]'); await ctx.close();
    assert(t && /PILOTA DEL GIORNO/i.test(t) && /SCUDERIA DEL GIORNO/i.test(t) && btn, 'grafica del voto: ' + t);
  },
  // ── Filigrana B&T sulla diretta ───────────────────────────────────────
  async 'filigrana: logo B&T piccolo e trasparente su mappa in diretta, mappa grande e Second Screen'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await premiumTrial(p); await startLive(p, 'GARA');
    const card = await watermark(p, '[data-live-card-map]');
    await tapText(p, 'Ingrandisci'); await w(p, 400);
    const big = await watermark(p, '[data-live-map-view]');
    await tapSel(p, '[aria-label="Chiudi"]'); await w(p, 300);
    await openSS(p);
    const ss = await watermark(p, '[data-ss-map]'); await ctx.close();
    for (const [n, r] of [['mappa', card], ['mappa grande', big], ['Second Screen', ss]]) {
      assert(r.root && r.wm, `${n}: manca la filigrana`);
      assert(r.img, `${n}: la filigrana non usa il logo B&T`);
      assert(r.opacity > 0.05 && r.opacity <= 0.4, `${n}: opacità ${r.opacity}`);
      assert(r.events === 'none', `${n}: la filigrana blocca i tocchi`);
      assert(r.wmW <= r.rootW * 0.3, `${n}: filigrana troppo grande (${Math.round(r.wmW)} su ${Math.round(r.rootW)} px)`);
    }
    assert(!errs.length, errs.join(' | '));
  },
  // ── About You ─────────────────────────────────────────────────────────
  // Tappa 3 (G16): la barra degli anni da tifoso è diventata il contachilometri a rulli (anni esatti).
  async 'registrazione: da quanti anni segui la F1 con il contachilometri e tipo di tifoso, poi si vedono nel profilo'(b) {
    const { ctx, p, errs } = await open(b);
    await tapText(p, 'REGISTRATI', { exact: true }); await w(p, 300);
    const lbl0 = await inner(p, '[data-follow-label]');
    const fans = await p.evaluate(() => [...document.querySelectorAll('[data-fan-option]')].map(e => e.textContent.replace(/\s+/g, ' ').trim()));
    await p.fill('#regName', 'Gino'); await p.fill('#authEmail', 'g@b.it'); await p.fill('#authPw', 'abcdef12'); await p.fill('#regPw2', 'abcdef12');   // Task 7: almeno 6 caratteri
    await p.focus('#regFollow'); await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight'); await w(p, 400);
    const lbl = await inner(p, '[data-follow-label]');
    await tapSel(p, '[data-fan-option="vroom"]'); await w(p, 150);
    await p.check('#regAdult');   // Task 22: "Ho almeno 14 anni"
    await tapText(p, 'CREA ACCOUNT', { exact: true }); await w(p, 2900);   // Task 9: i Termini si accettano al primo avvio, non dopo l'accesso
    await tapSel(p, '[aria-label="Profilo"]'); await w(p, 400);
    const follow = await inner(p, '[data-about-row="follow"]'), fan = await inner(p, '[data-about-row="fan"]'), birth = await inner(p, '[data-about-row="birth"]');
    await ctx.close();
    assert(lbl0 === '1 anno', 'valore iniziale del contachilometri: ' + lbl0);
    for (const f of ['Vivo e respiro F1!', 'Se fa Vroom è bello', 'Matricola delle 4 ruote', 'Nuovo sport da seguire']) assert(fans.includes(f), 'manca il tipo di tifoso: ' + f + ' — ' + fans.join(' | '));
    assert(lbl === '3 anni', 'il contachilometri non cambia gli anni: ' + lbl);
    assert(follow && /3 anni/.test(follow), 'profilo, segue F1: ' + follow);
    assert(fan && /Se fa Vroom è bello/.test(fan), 'profilo, tipo fan: ' + fan);
    assert(birth && /Non indicato/.test(birth), 'profilo, anno di nascita non scelto: ' + birth);   // Tappa 3 (G05): niente lineetta lunga
    assert(!errs.length, errs.join(' | '));
  },
  // Tappa 3 (G16-G17): "Su di te" (prima "About You") con il manettino dell'anno e il contachilometri degli anni.
  async 'profilo: "Su di te" si modifica (anno di nascita, anni di F1, tipo di tifoso)'(b) {
    const { ctx, p } = await open(b); await login(p);
    await tapSel(p, '[aria-label="Profilo"]'); await w(p, 400);
    await tapSel(p, '[aria-label="Modifica Su di te"]'); await w(p, 300);
    await p.focus('#aboutBirth'); for (let i = 0; i < 5; i++) await p.keyboard.press('ArrowUp'); await w(p, 100);   // primo scatto 2000, poi 2004
    await p.focus('#aboutFollow'); await p.keyboard.press('End'); await w(p, 150);
    await tapSel(p, '[data-about] [data-fan-option="matricola"]'); await w(p, 150);
    await tapText(p, 'Salva', { exact: true, sel: '[data-about] button' }); await w(p, 300);
    const rows = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-about-row]')].map(e => [e.getAttribute('data-about-row'), e.innerText.replace(/\s+/g, ' ').trim()])));
    await ctx.close();
    assert(/2004/.test(rows.birth || ''), 'anno di nascita: ' + rows.birth);
    assert(/60 anni/.test(rows.follow || ''), 'anni di F1: ' + rows.follow);
    assert(/Matricola delle 4 ruote/.test(rows.fan || ''), 'tipo di tifoso: ' + rows.fan);
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
