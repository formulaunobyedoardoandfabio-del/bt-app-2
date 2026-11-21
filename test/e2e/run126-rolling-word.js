// 16/11 (Edoardo): "usa questo codice (RollingText) per la parola sector 4 e fai che cambia". 21/11: "le scritte
// devono comparire solo quando si clicca su Sector 4, e dopo poco con la stessa animazione tornare a Sector 4".
// Di serie SECTOR 4; il tocco fa rotolare una parola (del momento o motivazionale), dopo SHOW_MS torna SECTOR 4
// rotolando. Logica: test/unit/header-words.test.js.
// Uso: node test/build-test.js && node test/e2e/run126-rolling-word.js [filtro]
const { open, w, tapSel, tapText, login, openAdmin, assert, run } = require('./helpers');
const W = require('../../src/logic/header-words');

const word = p => p.evaluate(() => {
  const b = document.querySelector('[data-logo]'), t = b && b.querySelector('[data-rolling-text]');
  if (!t) return null;
  const ins = [...t.querySelectorAll('[data-roll-in]')];
  return { label: b.getAttribute('aria-label'), target: t.getAttribute('data-rolling-text'), shown: ins.map(e => e.textContent).join('').replace(/ /g, ' '), letters: ins.length, anim: ins[0] && getComputedStyle(ins[0]).animationName, settled: t.getAttribute('data-rolling-settled'), w: Math.round(b.getBoundingClientRect().width) };
});
const settle = p => p.waitForFunction(() => { const t = document.querySelector('[data-logo] [data-rolling-text]'); return t && t.getAttribute('data-rolling-settled') === '1'; }, null, { timeout: 4000 }).catch(() => {});

run({
  async 'di serie SECTOR 4 (gara, qualifica, notte, giorno normale): le parole non escono da sole'(b) {
    const out = {};
    for (const [mood, now] of [['race', '2026-11-22T12:00:00Z'], ['quali', '2026-11-28T12:00:00Z'], ['night', '2026-11-18T02:00:00Z'], ['normal', '2026-11-18T12:00:00Z']]) {
      const { ctx, p, errs } = await open(b, { now }); await login(p); await settle(p); await w(p, W.SHOW_MS + 500);
      out[mood] = await word(p);
      if (errs.length) out[mood + 'Err'] = errs.join(' | ');
      await ctx.close();
    }
    for (const mood of ['race', 'quali', 'night', 'normal']) {
      const r = out[mood];
      assert(r && r.target === 'SECTOR 4' && r.shown === 'SECTOR 4' && r.settled === '1', mood + ': ci deve essere SECTOR 4: ' + JSON.stringify(r));
      assert(r.label === 'Sector 4' && r.anim === 'rlIn', mood + ': ' + JSON.stringify(r));
      assert(!out[mood + 'Err'], out[mood + 'Err']);
    }
  },

  async 'tocco: rotola una parola (del momento o motivazionale), poi da sola torna SECTOR 4 rotolando'(b) {
    const { ctx, p, errs } = await open(b, { now: '2026-11-22T12:00:00Z' }); await login(p); await settle(p);
    const start = await word(p);
    await tapSel(p, '[data-logo]'); await w(p, 120);
    const rolling = await word(p);
    await settle(p);
    const shown = await word(p);
    await p.waitForFunction(() => { const t = document.querySelector('[data-logo] [data-rolling-text]'); return t && t.getAttribute('data-rolling-text') === 'SECTOR 4'; }, null, { timeout: W.SHOW_MS + 1500 }).catch(() => {});
    await w(p, 80);
    const back = await word(p);
    await settle(p);
    const end = await word(p);
    await ctx.close();
    const pool = [...W.WORDS.race, ...W.TAP];
    assert(start.target === 'SECTOR 4', 'prima del tocco: ' + JSON.stringify(start));
    assert(rolling && pool.includes(rolling.target) && rolling.settled === '0', 'subito dopo il tocco la parola nuova sta rotolando: ' + JSON.stringify(rolling));
    assert(shown.shown === shown.target && shown.target === rolling.target, 'poi si legge intera: ' + JSON.stringify(shown));
    assert(back.target === 'SECTOR 4' && back.settled === '0', 'torna SECTOR 4 con la stessa animazione (lettere che girano): ' + JSON.stringify(back));
    assert(end.shown === 'SECTOR 4' && end.settled === '1', 'alla fine SECTOR 4 intera: ' + JSON.stringify(end));
    assert(new Set([start, rolling, shown, back, end].map(s => s.w)).size === 1, 'il tasto cambia larghezza: ' + [start, rolling, shown, back, end].map(s => s.target + '=' + s.w).join(', '));
    assert(!errs.length, errs.join(' | '));
  },

  async 'tocchi di fila: ogni volta una parola diversa, e si torna a SECTOR 4 solo dopo l\'ultimo tocco'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await settle(p);
    const seen = [];
    for (let i = 0; i < 4; i++) { await tapSel(p, '[data-logo]'); await w(p, 900); seen.push(await word(p)); }
    await w(p, W.SHOW_MS - 1500);
    const stillWord = await word(p);
    await w(p, 1500 + 1200);
    const end = await word(p);
    await ctx.close();
    for (let i = 0; i < seen.length; i++) {
      assert(seen[i] && seen[i].target !== 'SECTOR 4' && W.allWords().includes(seen[i].target), 'tocco ' + (i + 1) + ': ' + JSON.stringify(seen[i]));
      if (i) assert(seen[i].target !== seen[i - 1].target, 'tocco ' + (i + 1) + ': è uscita la stessa parola ' + seen[i].target);
    }
    assert(stillWord.target === seen[3].target, 'il tempo riparte a ogni tocco: ' + JSON.stringify(stillWord));
    assert(end.target === 'SECTOR 4' && end.shown === 'SECTOR 4', 'alla fine torna SECTOR 4: ' + JSON.stringify(end));
    assert(!errs.length, errs.join(' | '));
  },

  async 'andando nel Profilo e tornando c\'è SECTOR 4'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await settle(p);
    await tapSel(p, '[data-logo]'); await w(p, 300);
    await tapSel(p, '[aria-label="Profilo"]'); await w(p, 500); await tapSel(p, '[aria-label="Indietro"]'); await w(p, 600); await settle(p);
    const back = await word(p);
    await ctx.close();
    assert(back && back.target === 'SECTOR 4' && back.shown === 'SECTOR 4', 'tornando dal Profilo: ' + JSON.stringify(back));
    assert(!errs.length, errs.join(' | '));
  },

  async 'Rimuovi animazioni: parola subito intera e ferma, poi SECTOR 4 subito intera'(b) {
    const { ctx, p, errs } = await open(b, { reducedMotion: 'reduce' }); await login(p);
    const r = await word(p);
    await tapSel(p, '[data-logo]'); await w(p, 60);
    const after = await word(p);
    await w(p, W.SHOW_MS + 200);
    const back = await word(p);
    await ctx.close();
    assert(r && r.target === 'SECTOR 4' && r.shown === 'SECTOR 4' && r.anim === 'none' && r.settled === '1', 'senza animazioni: ' + JSON.stringify(r));
    assert(after && after.target !== 'SECTOR 4' && after.shown === after.target && after.settled === '1', 'tocco senza animazioni: subito la parola intera: ' + JSON.stringify(after));
    assert(back && back.target === 'SECTOR 4' && back.shown === 'SECTOR 4' && back.settled === '1', 'poi subito SECTOR 4: ' + JSON.stringify(back));
    assert(!errs.length, errs.join(' | '));
  },

  async 'telefoni stretti (320, 360, 390 px): la parola sta in alto, campanella e profilo restano tondi'(b) {
    const out = [];
    for (const width of [320, 360, 390]) {
      const { ctx, p, errs } = await open(b, { width, now: '2026-11-18T02:00:00Z' }); await login(p); await settle(p);
      const r = await p.evaluate(() => {
        const box = s => { const e = document.querySelector(s); if (!e) return null; const q = e.getBoundingClientRect(); return { l: Math.round(q.left), r: Math.round(q.right), w: Math.round(q.width), h: Math.round(q.height) }; };
        return { sw: document.documentElement.scrollWidth, word: box('[data-logo] [data-rolling-text]'), prem: box('[data-premium-chip]'), bell: box('[aria-label="Notifiche"]'), prof: box('[aria-label="Profilo"]'), fs: parseFloat(getComputedStyle(document.querySelector('[data-logo] [data-rolling-text]')).fontSize) };
      });
      out.push({ width, ...r, errs: errs.join(' | ') });
      await ctx.close();
    }
    for (const r of out) {
      assert(r.sw <= r.width, r.width + ': la pagina scorre di lato: ' + JSON.stringify(r));
      assert(r.bell.w === 38 && r.bell.h === 38 && r.prof.w === 38 && r.prof.h === 38, r.width + ': campanella o profilo schiacciati: ' + JSON.stringify(r));
      assert(r.word.r <= r.prem.l, r.width + ': la scritta finisce sotto il tasto Premium: ' + JSON.stringify(r));
      assert(!r.errs, r.errs);
    }
    assert(out[2].fs >= 21 && out[1].fs >= 16, 'la scritta resta grande dove c\'è posto: ' + out.map(r => r.width + '=' + r.fs).join(', '));
  },

  async 'sessione in pista: col badge IN PISTA la scritta resta leggibile (Premium solo con la stella)'(b) {
    const out = [];
    for (const width of [360, 390]) {
      const { ctx, p, errs } = await open(b, { width }); await login(p);
      await openAdmin(p, 'GARA LIVE'); await tapText(p, 'AVVIA PROVE LIBERE 1', { exact: true }); await w(p, 300);
      await tapSel(p, '[aria-label="Indietro"]'); await w(p); await tapSel(p, '[aria-label="Indietro"]'); await w(p, 400); await settle(p);
      const r = await p.evaluate(() => {
        const box = s => { const e = document.querySelector(s); if (!e) return null; const q = e.getBoundingClientRect(); return { l: Math.round(q.left), r: Math.round(q.right), w: Math.round(q.width) }; };
        const t = document.querySelector('[data-logo] [data-rolling-text]'), chip = document.querySelector('[data-premium-chip]');
        return { sw: document.documentElement.scrollWidth, word: box('[data-logo] [data-rolling-text]'), track: box('[data-on-track]'), prem: box('[data-premium-chip]'), premText: chip && chip.innerText.trim(), premLabel: chip && chip.getAttribute('aria-label'), bell: box('[aria-label="Notifiche"]'), prof: box('[aria-label="Profilo"]'), fs: t && parseFloat(getComputedStyle(t).fontSize) };
      });
      out.push({ width, ...r, errs: errs.join(' | ') });
      await ctx.close();
    }
    for (const r of out) {
      assert(r.track && r.sw <= r.width && r.word.r <= r.track.l, r.width + ': la scritta va sotto il badge: ' + JSON.stringify(r));
      assert(r.fs >= 12, r.width + ': scritta troppo piccola: ' + JSON.stringify(r));
      assert(r.bell.w === 38 && r.prof.w === 38, r.width + ': campanella o profilo schiacciati: ' + JSON.stringify(r));
      assert(r.premText === '' && /Premium/.test(r.premLabel || '') && r.prem.w <= 44, r.width + ': in pista il Premium è solo la stella (col nome per chi non vede): ' + JSON.stringify(r));
      assert(!r.errs, r.errs);
    }
  },
});
