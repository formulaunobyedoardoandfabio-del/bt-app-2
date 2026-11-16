// 16/11 (Edoardo): "usa questo codice (RollingText) per la parola sector 4 e fai che cambia": in alto a sinistra la
// parola del momento (gara, qualifica, notte, giorno normale) che arriva rotolando lettera per lettera; toccandola ne
// esce una motivazionale a caso, mai la stessa. Logica: test/unit/header-words.test.js.
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
  async 'la parola del momento: gara, qualifica, notte, giorno normale (dal calendario vero)'(b) {
    const out = {};
    // Las Vegas: gara il 22/11 alle 04:00 UTC; Qatar: qualifica il 28/11 alle 18:00 UTC.
    for (const [mood, now] of [['race', '2026-11-22T12:00:00Z'], ['quali', '2026-11-28T12:00:00Z'], ['night', '2026-11-18T02:00:00Z'], ['normal', '2026-11-18T12:00:00Z']]) {
      const { ctx, p, errs } = await open(b, { now }); await login(p); await settle(p);
      out[mood] = await word(p);
      if (errs.length) out[mood + 'Err'] = errs.join(' | ');
      await ctx.close();
    }
    for (const mood of ['race', 'quali', 'night', 'normal']) {
      const r = out[mood];
      assert(r && W.WORDS[mood].includes(r.target), mood + ': parola fuori lista ' + JSON.stringify(r));
      assert(r.shown === r.target && r.letters === r.target.length && r.settled === '1', mood + ': a fine giro si legge la parola intera, niente lettere a caso: ' + JSON.stringify(r));
      assert(r.label === 'Sector 4', 'il tasto si chiama ancora Sector 4: ' + r.label);
      assert(r.anim === 'rlIn', mood + ': le lettere arrivano rotolando: ' + r.anim);
      assert(!out[mood + 'Err'], out[mood + 'Err']);
    }
  },

  async 'tocco: una parola motivazionale a caso, mai la stessa, e la larghezza non cambia'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await settle(p);
    const seen = [await word(p)];
    for (let i = 0; i < 4; i++) { await tapSel(p, '[data-logo]'); await w(p, 120); seen.push(await word(p)); await settle(p); await w(p, 500); }
    const end = await word(p);
    await ctx.close();
    for (let i = 1; i < seen.length; i++) {
      assert(seen[i] && W.TAP.includes(seen[i].target), 'tocco ' + i + ': non è una delle motivazionali: ' + JSON.stringify(seen[i]));
      assert(seen[i].target !== seen[i - 1].target, 'tocco ' + i + ': è uscita la stessa parola ' + seen[i].target);
    }
    assert(seen[1].settled === '0', 'subito dopo il tocco le lettere stanno ancora girando: ' + JSON.stringify(seen[1]));
    assert(end.shown === end.target, 'alla fine si legge la parola intera: ' + JSON.stringify(end));
    assert(new Set(seen.map(s => s.w)).size === 1, 'il tasto cambia larghezza con la parola: ' + seen.map(s => s.target + '=' + s.w).join(', '));
    assert(!errs.length, errs.join(' | '));
  },

  async 'la parola resta la stessa per tutta la sessione (andando nel Profilo e tornando), cambia solo col tocco'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await settle(p);
    const a = await word(p);
    await tapSel(p, '[aria-label="Profilo"]'); await w(p, 500); await tapSel(p, '[aria-label="Indietro"]'); await w(p, 600); await settle(p);
    const back = await word(p);
    await tapSel(p, '[data-logo]'); await settle(p);
    const tapped = await word(p);
    await tapSel(p, '[aria-label="Profilo"]'); await w(p, 500); await tapSel(p, '[aria-label="Indietro"]'); await w(p, 600); await settle(p);
    const back2 = await word(p);
    await ctx.close();
    assert(a && back && a.target === back.target, 'tornando dal Profilo la parola è cambiata: ' + (a && a.target) + ' → ' + (back && back.target));
    assert(tapped && back2 && tapped.target === back2.target && W.TAP.includes(back2.target), 'la parola del tocco si perde tornando dal Profilo: ' + (tapped && tapped.target) + ' → ' + (back2 && back2.target));
    assert(!errs.length, errs.join(' | '));
  },

  async 'Rimuovi animazioni: la parola è subito intera e ferma'(b) {
    const { ctx, p, errs } = await open(b, { reducedMotion: 'reduce' }); await login(p);
    const r = await word(p);
    await tapSel(p, '[data-logo]'); await w(p, 60);
    const after = await word(p);
    await ctx.close();
    assert(r && r.shown === r.target && r.anim === 'none' && r.settled === '1', 'senza animazioni: ' + JSON.stringify(r));
    assert(after && W.TAP.includes(after.target) && after.shown === after.target && after.settled === '1', 'tocco senza animazioni: subito la parola nuova intera: ' + JSON.stringify(after));
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
