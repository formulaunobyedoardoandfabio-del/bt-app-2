// 7/11 (Edoardo): data di nascita nella registrazione, scritta GG/MM/AAAA o scelta dal calendario, con l'anno su una
// rotella che si scorre in su e in giù. Più le micro-animazioni rifatte: la carta del pagamento rifiutato solo per un
// pagamento andato male davvero.
// Uso: node test/build-test.js && node test/e2e/run88-nascita.js
const { open, w, tapText, tapSel, goTab, login, openAdmin, assert, run } = require('./helpers');

const field = p => p.evaluate(() => {
  const i = document.querySelector('#regBirth'), pan = document.querySelector('[data-birth-panel]'), wh = document.querySelector('[data-year-wheel]'), er = document.querySelector('[data-birth-err]');
  return { val: i && i.value, panel: !!pan, year: wh && wh.getAttribute('data-year-wheel'), month: pan && pan.querySelector('[data-birth-month]').textContent, err: er && er.textContent };
});

run({
  async 'data di nascita: si scrive GG/MM/AAAA, sbagliata dà errore, dal calendario si sceglie e l\'anno gira con la rotella'(b) {
    const { ctx, p, errs } = await open(b);
    await tapText(p, 'REGISTRATI', { exact: true }); await w(p, 300);
    await p.focus('#regBirth'); await p.keyboard.type('31022001'); await w(p, 100);
    const bad = await field(p);
    await p.fill('#regBirth', ''); await p.focus('#regBirth'); await p.keyboard.type('15062001'); await w(p, 100);
    const good = await field(p);
    await tapSel(p, '[data-birth-cal]'); await w(p, 300);
    const opened = await field(p);
    // la rotella: scorrere fino al 1990 cambia l'anno del calendario
    await p.evaluate(() => { const el = document.querySelector('[data-year-wheel]'); el.scrollTop = (1990 - Number(el.getAttribute('aria-valuemin'))) * 34; el.dispatchEvent(new Event('scroll')); });
    await w(p, 300);
    const rolled = await field(p);
    await p.focus('[data-year-wheel]'); await p.keyboard.press('ArrowDown'); await w(p, 200);
    const arrow = await field(p);
    await tapSel(p, '[data-birth-day="3"]'); await w(p, 300);
    const picked = await field(p);
    await ctx.close();
    assert(bad.val === '31/02/2001' && bad.err === 'Data non valida', 'le barre si mettono da sole e il 31 febbraio non vale: ' + JSON.stringify(bad));
    assert(good.val === '15/06/2001' && !good.err, 'data scritta: ' + JSON.stringify(good));
    assert(opened.panel && opened.month === 'Giugno' && opened.year === '2001', 'il calendario si apre sulla data scritta: ' + JSON.stringify(opened));
    assert(rolled.year === '1990', 'la rotella cambia l\'anno: ' + JSON.stringify(rolled));
    assert(arrow.year === '1991', 'con la freccia giù l\'anno dopo: ' + JSON.stringify(arrow));
    assert(picked.val === '03/06/1991' && !picked.panel, 'giorno scelto dal calendario: ' + JSON.stringify(picked));
    assert(!errs.length, errs.join(' | '));
  },

  // 7/11 (Edoardo): "rimuovi Pit Swipe se non lo attivo io nella sezione admin".
  async 'Pit Swipe: spento di serie (niente scheda in Home), acceso dall\'admin in FUNZIONI torna'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await w(p, 600);
    const before = await p.evaluate(() => ({ card: !!document.querySelector('[data-pitswipe-card]'), step: /Pit Swipe/.test(document.body.innerText) }));
    await openAdmin(p, 'FUNZIONI');
    const row = await p.evaluate(() => { const r = document.querySelector('[data-admin-flag="pitSwipe"] [role="switch"]'); return r && r.getAttribute('aria-checked'); });
    await tapSel(p, '[data-admin-flag="pitSwipe"] [role="switch"]'); await w(p, 600);
    const saved = await p.evaluate(() => window.firebase.__fake.doc('shared/bt-flags'));
    for (let i = 0; i < 3 && !(await p.evaluate(() => !!document.querySelector('[data-nav-tab="home"]'))); i++) { await tapSel(p, '[aria-label="Indietro"]').catch(() => {}); await w(p, 400); }
    await tapSel(p, '[data-nav-tab="home"]'); await w(p, 600);
    const after = await p.evaluate(() => !!document.querySelector('[data-pitswipe-card]'));
    await ctx.close();
    assert(!before.card && !before.step, 'Pit Swipe c\'è senza che l\'admin lo accenda: ' + JSON.stringify(before));
    assert(row === 'false' && saved && saved.pitSwipe === true, 'interruttore admin: ' + JSON.stringify({ row, saved }));
    assert(after, 'acceso dall\'admin, in Home non torna la scheda di Pit Swipe');
    assert(!errs.length, errs.join(' | '));
  },

  // 7/11 (Edoardo, video di riferimento): elenco verticale con le schede di sempre; dietro la luce del colore della
  // notizia che stai guardando (cambia scorrendo); le schede entrano salendo mentre arrivano dal basso.
  async 'notizie: schede orizzontali di sempre, luce del colore della notizia che cambia scorrendo, schede che entrano'(b) {
    const { ctx, p, errs } = await open(b, { seed: require('../fixtures/seed-2.0.json') }); await login(p); await w(p, 900);
    const first = await p.evaluate(() => ({ amb: document.querySelector('[data-news-ambient]').getAttribute('data-news-ambient'), grid: !!document.querySelector('[data-news-grid-toggle]'), list: document.querySelector('[data-news-list]').getAttribute('data-news-list'), rowImgLeft: (() => { const r = document.querySelector('[data-news-item]'); return r ? getComputedStyle(r).display : null; })() }));
    const seen = new Set([first.amb]);
    for (let i = 1; i <= 8; i++) { await p.evaluate(i => { const h = document.querySelector('[data-home]'); h.scrollTop = i * 260; h.dispatchEvent(new Event('scroll')); }, i); await w(p, 250); seen.add(await p.evaluate(() => document.querySelector('[data-news-ambient]').getAttribute('data-news-ambient'))); }
    const rows = await p.evaluate(() => { const all = [...document.querySelectorAll('[data-news-row]')]; const h = document.querySelector('[data-home]'); return { n: all.length, focus: all.filter(e => getComputedStyle(e).animationName === 'newsFocus').length, side: h.scrollWidth - h.clientWidth }; });
    // scroll-snap: ogni scheda si ferma al centro; quella al centro è a fuoco, le altre più spente
    await p.evaluate(() => { const r = document.querySelectorAll('[data-news-row]')[3]; r.scrollIntoView({ block: 'center' }); });
    await w(p, 500);
    const snap = await p.evaluate(() => {
      const h = document.querySelector('[data-home]'), mid = h.getBoundingClientRect().top + h.clientHeight / 2;
      const rows = [...document.querySelectorAll('[data-news-row]')].map(e => { const r = e.getBoundingClientRect(); return { d: Math.abs((r.top + r.bottom) / 2 - mid), op: +getComputedStyle(e).opacity }; }).sort((a, b) => a.d - b.d);
      return { type: getComputedStyle(h).scrollSnapType, align: getComputedStyle(document.querySelector('[data-news-item]')).scrollSnapAlign, near: rows[0] && rows[0].op, far: rows.length > 3 ? rows[rows.length - 1].op : null };
    });
    await ctx.close();
    assert(first.amb && !first.grid && first.list === 'list' && first.rowImgLeft === 'flex', 'elenco di sempre con la luce dietro: ' + JSON.stringify(first));
    assert(seen.size >= 2, 'scorrendo la luce non cambia colore: ' + JSON.stringify([...seen]));
    assert(rows.focus === rows.n && rows.n > 3 && rows.side <= 0, '8/11: fuoco fatto dal browser su ogni scheda, la Home non scorre di lato: ' + JSON.stringify(rows));
    assert(/^y( proximity)?$/.test(snap.type) && /center/.test(snap.align) && snap.near > .85 && snap.far < snap.near, '8/11: scatto leggero (proximity) con la scheda al centro a fuoco: ' + JSON.stringify(snap));
    assert(!errs.length, errs.join(' | '));
  },

  // 7/11: ELO del FantaF1, funzioni Pro coi trofei nel Profilo, schermata Premium rifatta.
  async 'ELO nel Fanta, sblocchi Pro coi trofei nel Profilo, Premium con Stagione scelta e risparmio'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await w(p, 600);
    await goTab(p, 'FANTA'); await w(p, 500);
    const elo0 = await p.evaluate(() => { const e = document.querySelector('[data-fanta-elo]'); return e && { v: e.getAttribute('data-fanta-elo'), t: e.innerText.replace(/\s+/g, ' ') }; });
    await tapSel(p, '[data-elo-how]'); await w(p, 200);
    const rule = await p.evaluate(() => { const e = document.querySelector('[data-elo-rule]'); return e && e.innerText; });
    await tapSel(p, '[aria-label="Profilo"]'); await w(p, 500);
    const unl = await p.evaluate(() => ({ pro: document.querySelectorAll('[data-pro-unlock]').length, level: !!document.querySelector('[data-fan-level]'), subs: document.querySelectorAll('[data-settings-sub]').length, group: (document.querySelector('[data-settings-group]') || {}).textContent || null }));
    await tapSel(p, '[data-settings-group]'); await w(p, 200);
    const open8 = await p.evaluate(() => [...document.querySelectorAll('[data-settings-sub]')].map(e => e.textContent.trim()));
    await tapSel(p, '[aria-label="Indietro"]').catch(() => {}); await w(p, 300);
    await tapSel(p, '[data-premium-chip]'); await w(p, 600);
    const prem = await p.evaluate(() => {
      const sh = document.querySelector('[data-premium-sheet]');
      const sel = [...sh.querySelectorAll('[data-plan]')].map(e => e.getAttribute('data-plan') + ':' + e.getAttribute('aria-checked'));
      return { title: sh.querySelector('[data-premium-title]').textContent, cells: sh.querySelectorAll('[data-gp-cell]').length, perks: sh.querySelectorAll('[data-premium-perks] > *').length, sel, saving: (sh.querySelector('[data-saving]') || {}).textContent || null, after: !!sh.querySelector('[data-after-trial]') };
    });
    await ctx.close();
    assert(elo0 && elo0.v === 'none' && /Parti da 1200/.test(elo0.t), 'ELO senza leghe: ' + JSON.stringify(elo0));
    assert(rule && /scacchi/.test(rule) && /400/.test(rule) && /K vale 40/.test(rule), 'regola dell\'ELO: ' + rule);
    // 8/11: nel mio profilo niente "Livello del tifoso" (lo vedono gli altri) né "Funzioni Pro coi trofei"; sei impostazioni in una voce
    assert(!unl.pro && !unl.level && unl.subs === 0 && /Personalizza l'app/.test(unl.group || ''), 'profilo: ' + JSON.stringify(unl));
    assert(['Colori dell\'app', 'Suoni', 'Vibrazioni', 'Temi delle feste', 'Pit Board in tutta l\'app', 'Promemoria sul telefono'].every(x => open8.some(t => t.startsWith(x))), 'dentro "Personalizza l\'app": ' + JSON.stringify(open8));
    assert(prem.title === 'Ogni GP vissuto dal muretto box' && prem.cells >= 20 && prem.perks === 3, 'Premium: ' + JSON.stringify(prem));
    assert(prem.sel.join(',') === 'annual:true,month:false' && /RISPARMI \d+%/.test(prem.saving || '') && prem.after, 'piani: ' + JSON.stringify(prem));
    assert(!errs.length, errs.join(' | '));
  },

  // 8/11 (Edoardo): a metà swipe la scheda accanto si vede già dove l'avevi lasciata, non dall'inizio (poi non salta).
  async 'swipe: la scheda accanto si vede dal punto dove l\'avevi lasciata'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await w(p, 500);
    await tapSel(p, '[data-nav-tab="garage"]'); await w(p, 700);
    const saved = await p.evaluate(() => { const el = document.querySelector('[data-tab-page="garage"] .scrollcol'); el.scrollTop = 420; el.dispatchEvent(new Event('scroll')); return el.scrollTop; });
    await w(p, 200);
    await tapSel(p, '[data-nav-tab="home"]'); await w(p, 700);
    const y = await p.evaluate(() => { const h = document.querySelector('[data-home]').getBoundingClientRect(); return h.top + 40; });
    await p.mouse.move(300, y); await p.mouse.down(); await p.mouse.move(150, y, { steps: 8 }); await w(p, 250);
    const half = await p.evaluate(() => { const n = document.querySelector('[data-tab-neighbor] .scrollcol'); return n ? n.scrollTop : null; });
    await p.mouse.move(40, y, { steps: 4 }); await p.mouse.up(); await w(p, 700);
    const after = await p.evaluate(() => { const el = document.querySelector('[data-tab-page="garage"]:not([data-tab-neighbor]) .scrollcol'); return el ? el.scrollTop : null; });
    await ctx.close();
    assert(saved > 300, 'la pagina GARAGE non scorre abbastanza per la prova: ' + saved);
    assert(half !== null && Math.abs(half - saved) <= 3, 'a metà swipe GARAGE riparte dall\'inizio: ' + JSON.stringify({ saved, half }));
    assert(after !== null && Math.abs(after - saved) <= 3, 'arrivati su GARAGE il punto è cambiato: ' + JSON.stringify({ saved, after }));
    assert(!errs.length, errs.join(' | '));
  },

  // 7/11 (video di Edoardo, "Gooey Drop"): una notifica nuova ad app aperta scende come una goccia e apre le Notifiche.
  async 'notifica nuova: goccia in alto con titolo e testo, toccandola si aprono le Notifiche'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await w(p, 600);
    await p.evaluate(() => { window.__btNow += 60000; });   // un minuto dopo l'apertura
    await openAdmin(p, 'NOTIFICHE');
    await p.fill('[aria-label="Titolo notifica"]', 'Qualifiche rinviate'); await p.fill('[aria-label="Testo notifica"]', 'Si riparte alle 16');
    await tapText(p, 'INVIA NOTIFICA ORA'); await w(p, 700);
    const drop = await p.evaluate(() => { const d = document.querySelector('[data-drop-notice]'); return d && { text: d.innerText.replace(/\s+/g, ' '), anim: !!d.querySelector('.gd-dot') && !!d.querySelector('.gd-bg') }; });
    await tapSel(p, '[data-drop-notice] button'); await w(p, 500);
    const opened = await p.evaluate(() => ({ notif: /Qualifiche rinviate/.test(document.body.innerText), drop: !!document.querySelector('[data-drop-notice]') }));
    await ctx.close();
    assert(drop && /Qualifiche rinviate/.test(drop.text) && /Si riparte alle 16/.test(drop.text) && drop.anim, 'goccia della notifica: ' + JSON.stringify(drop));
    assert(opened.notif && !opened.drop, 'toccando la goccia non si aprono le Notifiche: ' + JSON.stringify(opened));
    assert(!errs.length, errs.join(' | '));
  },
});
