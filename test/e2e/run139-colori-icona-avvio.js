// 22/11 sera (Edoardo: "nella sezione personalizza l'app usa questo nuovo design B&T: Colori, icona e avvio ma la parte
// anteprima solo se l'utente ha cambiato la sua selezione"; icone: attuale, logo, light, auto dettagliata, 3D, on track,
// scuderia del cuore, 8 agosto; avvii: attuale, mercurio, trasparente, liquid glass, sunshine).
// Uso: node test/build-test.js && node test/e2e/run139-colori-icona-avvio.js [filtro]
const path = require('path');
const fs = require('fs');
const { open, w, tapSel, tapText, login, assert, run } = require('./helpers');

const SHOTS = path.join(__dirname, '..', 'logs', 'run139');
fs.mkdirSync(SHOTS, { recursive: true });
const shot = (p, n) => p.screenshot({ path: path.join(SHOTS, n + '.png') });
const IDS = ['classica', 'logo', 'light', 'auto', 'd3', 'track', 'racingbulls', 'haas', 'astonmartin', 'williams', 'alpine', 'cadillac', 'audi', 'mclaren', 'mercedes', 'redbull', 'ferrari'];
// APK finto col plugin BtIcon: window.__icon = { sets: [{ id, now }], current }
const APK = ids => `window.__icon = { sets: [], current: 'classica', ids: ${JSON.stringify(ids)} };
  window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'android', Plugins: { BtIcon: {
    available: async () => ({ ids: window.__icon.ids, current: window.__icon.current, pending: null }),
    set: async ({ id, now }) => { window.__icon.sets.push({ id, now: !!now }); if (now) window.__icon.current = id; return { ok: true }; },
  } } };`;
const USER = (app2 = {}) => ({ 'users/a@b.it': { name: 'Tester', nick: 'Tester', email: 'a@b.it', about: { birth: null, follow: 2, fan: 'vivo' }, app2 } });
const openLook = async p => { await tapSel(p, '[aria-label="Profilo"]'); await w(p, 500); await tapText(p, 'Colori, icona e avvio'); await w(p, 400); };
const has = (p, sel) => p.evaluate(s => !!document.querySelector(s), sel);

run({
  async 'Colori: l\'anteprima compare solo dopo aver cambiato colore'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: USER() } });
    await login(p); await openLook(p);
    const before = await has(p, '[data-theme-preview]');
    const rows = await p.evaluate(() => [...document.querySelectorAll('[data-look-open]')].map(e => e.innerText.replace(/\s+/g, ' ')));
    await shot(p, 'colori-390');
    await tapSel(p, '[data-theme-color]'); await w(p, 300);
    const after = await has(p, '[data-theme-preview] [data-theme-sample="tasto"]');
    await shot(p, 'colori-anteprima-390');
    await ctx.close();
    assert(!before, 'senza modifiche niente anteprima');
    assert(after, 'dopo un colore nuovo l\'anteprima c\'è');
    assert(rows.length === 2 && /Icona Classica/.test(rows[0]) && /Animazione d'avvio Attuale/.test(rows[1]), 'righe Icona e Animazione: ' + JSON.stringify(rows));
    assert(!errs.length, errs.join(' | '));
  },

  async 'Icona: anteprima solo dopo una scelta, Applica cambia l\'icona subito e la salva nell\'account'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: USER() }, init: APK(IDS) });
    await login(p); await w(p, 800); await openLook(p);
    await tapSel(p, '[data-look-open="icona"]'); await w(p, 300);
    const s0 = await p.evaluate(() => ({ prev: !!document.querySelector('[data-icon-preview]'), apply: document.querySelector('[data-icon-apply]').disabled, tiles: [...document.querySelectorAll('[data-icon-pick]')].map(e => e.getAttribute('data-icon-pick')) }));
    await tapSel(p, '[data-icon-pick="light"]'); await w(p, 300);
    const s1 = await p.evaluate(() => ({ prev: document.querySelector('[data-icon-preview]') && document.querySelector('[data-icon-preview]').getAttribute('data-icon-preview'), apply: document.querySelector('[data-icon-apply]').disabled }));
    await shot(p, 'icona-390');
    await tapSel(p, '[data-icon-apply]'); await w(p, 1800);
    const r = await p.evaluate(() => ({ sets: window.__icon.sets, local: JSON.parse(localStorage.getItem('bt_bt-look') || 'null'), doc: (window.firebase.__fake.doc('users/a@b.it').app2 || {}).look }));
    await ctx.close();
    assert(!s0.prev && s0.apply, 'all\'inizio niente anteprima e Applica spento: ' + JSON.stringify(s0));
    assert(JSON.stringify(s0.tiles) === JSON.stringify(['classica', 'logo', 'light', 'auto', 'd3', 'track', 'team']), 'icone: ' + JSON.stringify(s0.tiles));
    assert(s1.prev === 'light' && !s1.apply, 'scelta Light: anteprima e Applica acceso: ' + JSON.stringify(s1));
    assert(r.sets.some(x => x.id === 'light' && x.now), 'icona cambiata subito: ' + JSON.stringify(r.sets));
    assert(r.local && r.local.icon === 'light' && r.doc && r.doc.icon === 'light', 'salvata sul telefono e nell\'account: ' + JSON.stringify(r));
    assert(!errs.length, errs.join(' | '));
  },

  async 'Icona della scuderia del cuore: quella del team preferito (Ferrari)'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: USER({ favTeam: 'ferrari' }) }, init: APK(IDS) });
    await login(p); await w(p, 800); await openLook(p);
    await tapSel(p, '[data-look-open="icona"]'); await w(p, 300);
    const tile = await p.evaluate(() => { const e = document.querySelector('[data-icon-pick="team"]'); return e && { off: e.disabled, img: e.querySelector('img').getAttribute('src'), text: e.innerText.replace(/\s+/g, ' ') }; });
    await tapSel(p, '[data-icon-pick="team"]'); await w(p, 200);
    await tapSel(p, '[data-icon-apply]'); await w(p, 1500);
    const sets = await p.evaluate(() => window.__icon.sets);
    await ctx.close();
    assert(tile && !tile.off && /ferrari\.png$/.test(tile.img) && /Ferrari/.test(tile.text), 'casella della scuderia: ' + JSON.stringify(tile));
    assert(sets.some(x => x.id === 'ferrari' && x.now), 'icona Ferrari: ' + JSON.stringify(sets));
    assert(!errs.length, errs.join(' | '));
  },

  async 'L\'8 agosto l\'icona del giorno per tutti (quando l\'APK ce l\'ha), cambiata andando in secondo piano'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: USER() }, init: APK([...IDS, 'agosto']), now: '2027-08-08T10:00:00Z' });
    await login(p); await w(p, 2000);
    const sets = await p.evaluate(() => window.__icon.sets);
    await ctx.close();
    assert(sets.length && sets[sets.length - 1].id === 'agosto' && !sets[sets.length - 1].now, 'icona dell\'8 agosto (non subito): ' + JSON.stringify(sets));
    assert(!errs.length, errs.join(' | '));
  },

  async 'Sul sito l\'icona non si cambia: lo dice e Applica resta spento'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: USER() } });
    await login(p); await openLook(p);
    await tapSel(p, '[data-look-open="icona"]'); await w(p, 300);
    await tapSel(p, '[data-icon-pick="d3"]'); await w(p, 200);
    const r = await p.evaluate(() => ({ off: document.querySelector('[data-icon-apply]').disabled, text: document.querySelector('[data-look="icona"]').innerText }));
    await ctx.close();
    assert(r.off && /dall'app Android/.test(r.text), 'sul sito: ' + JSON.stringify(r.off));
    assert(!errs.length, errs.join(' | '));
  },

  async 'Avvio: anteprima solo dopo una scelta, Fatto la salva; all\'avvio dopo parte quella scelta'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: USER() } });
    await login(p); await openLook(p);
    await tapSel(p, '[data-look-open="avvio"]'); await w(p, 300);
    const list = await p.evaluate(() => ({ ids: [...document.querySelectorAll('[data-boot-pick]')].map(e => e.getAttribute('data-boot-pick')), prev: !!document.querySelector('[data-boot-preview]') }));
    await tapSel(p, '[data-boot-pick="sunshine"]'); await w(p, 200);
    const prev = await has(p, '[data-boot-preview]');
    await shot(p, 'avvio-390');
    await tapSel(p, '[data-boot-preview]'); await w(p, 600);
    const ant = await p.evaluate(() => { const e = document.querySelector('[data-look="anteprima"]'); return e && { video: !!e.querySelector('[data-boot-video="sunshine"]'), text: e.innerText }; });
    await shot(p, 'avvio-anteprima-390');
    await tapSel(p, '[aria-label="Chiudi l\'anteprima"]'); await w(p, 300);
    await tapSel(p, '[data-boot-done]'); await w(p, 1500);
    const saved = await p.evaluate(() => ({ local: JSON.parse(localStorage.getItem('bt_bt-look') || 'null'), row: document.querySelector('[data-look-open="avvio"]').innerText }));
    await ctx.close();
    assert(JSON.stringify(list.ids) === JSON.stringify(['pit', 'mercurio', 'trasparente', 'liquid', 'sunshine', 'motore']) && !list.prev, 'avvii e niente anteprima all\'inizio: ' + JSON.stringify(list));
    assert(prev, 'dopo la scelta "Vedi anteprima"');
    assert(ant && ant.video && /Dura circa 3 secondi/.test(ant.text), 'anteprima col video: ' + JSON.stringify(ant));
    assert(saved.local && saved.local.boot === 'sunshine' && /Sunshine/.test(saved.row), 'salvato: ' + JSON.stringify(saved));
    assert(!errs.length, errs.join(' | '));
  },

  async 'Dal secondo avvio: l\'animazione scelta; liquid glass con l\'icona Light su bianco'(b) {
    // il video nelle prove non si carica (pagina da file): lo splash passa subito al caricamento; si guarda il primo
    const init = "localStorage.setItem('bt_bt-intro-seen', 'true'); localStorage.setItem('bt_bt-look', JSON.stringify({ icon: 'light', boot: 'liquid' }));"
      + "new MutationObserver(() => { const s = document.querySelector('[data-splash-anim]'); if (s && !window.__anim) { const v = s.querySelector('[data-boot-video]'); window.__anim = { anim: s.getAttribute('data-splash-anim'), light: v && v.getAttribute('data-boot-light'), bg: s.style.background }; } }).observe(document, { childList: true, subtree: true });";
    const { ctx, p, errs } = await open(b, { init, waitSplash: false });
    await w(p, 600);
    const r = await p.evaluate(() => window.__anim || null);
    await ctx.close();
    assert(r && r.anim === 'liquid' && r.light === '1' && /^(#fff|rgb\(255, 255, 255\))$/.test(r.bg), 'liquid glass su bianco: ' + JSON.stringify(r));
    assert(!errs.length, errs.join(' | '));
  },
});
