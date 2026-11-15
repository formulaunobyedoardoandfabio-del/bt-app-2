// 14/11 (Edoardo: "i piccoli bug del Fanta"). Scimmia: 50 mosse a caso sulla squadra (togli, aggiungi, cambia, 2X,
// Svuota, Completa) con le regole che devono valere sempre: budget mai sotto zero, 7 posti, nessun doppione, il 2X su un
// pilota se ce n'è almeno uno, salvato = schermo, prezzi pagati solo di chi è in squadra. Stesso seme = stesse mosse.
// Ha trovato: 2X spento dopo "Svuota" e piloti venduti che restavano salvati (merge di Firestore in profondità).
// Uso: node test/build-test.js && node test/e2e/run108-fanta-scimmia.js   (SEED=n N=mosse per cambiarle)
const { open, w, login, goTab, assert, run } = require('./helpers');
const NOW = '2026-11-17T10:00:00Z';
let seed = Number(process.env.SEED) || 7;
const N = Number(process.env.N) || 50;
const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = a => a[Math.floor(rnd() * a.length)];
const state = p => p.evaluate(() => {
  const num = s => Number(String(s || '').replace(/[^0-9.,-]/g, '').replace(',', '.'));
  const cards = [...document.querySelectorAll('[data-fanta-card]')].map(e => e.getAttribute('data-fanta-card'));
  return {
    budget: num((document.querySelector('[data-budget-left]') || {}).textContent), budgetText: (document.querySelector('[data-budget-left]') || {}).textContent,
    cards, empty: [...document.querySelectorAll('[data-fanta-add]')].map(e => e.getAttribute('data-fanta-add')),
    boost: [...document.querySelectorAll('[data-boost="on"]')].length, boosts: document.querySelectorAll('[data-boost]').length,
    picker: !!document.querySelector('[data-pick]'), toast: (document.querySelector('.toast') || {}).textContent || '',
  };
});
const choose = async p => {   // nel selettore aperto: una riga a caso tra quelle che si possono scegliere
  await w(p, 250);
  // 15/11: piloti nella scelta stile chess.com: chi non si prende ha data-pick-off e il motivo nell'aria-label
  const rows = await p.evaluate(() => [...document.querySelectorAll('[data-pick]')].map(e => ({ id: e.getAttribute('data-pick'), off: e.disabled || e.hasAttribute('data-pick-off'), text: (e.getAttribute('aria-label') || '') + ' ' + e.innerText.replace(/\n/g, ' ') })));
  const ok = rows.filter(r => !r.off);
  const wrongOff = rows.filter(r => r.off && !/Budget insufficiente|In squadra|già|È già nel tuo posto/i.test(r.text));
  if (!ok.length) { await p.keyboard.press('Escape').catch(() => {}); await p.evaluate(() => { const b = document.querySelector('[aria-label="Chiudi"]'); if (b) b.click(); }); await w(p, 200); return { picked: null, rows: rows.length, wrongOff }; }
  const r = pick(ok);
  await p.evaluate(id => document.querySelector(`[data-pick="${id}"]`).click(), r.id);
  await w(p, 150);
  await p.evaluate(() => { const c = document.querySelector('[data-chess-confirm]'); if (c && !c.disabled) c.click(); });
  await w(p, 250);
  return { picked: r.id, rows: rows.length, wrongOff };
};
run({
  async 'Fanta: 50 mosse a caso sulla squadra, le regole valgono sempre e il salvato è quello sullo schermo'(b) {
    const { ctx, p, errs } = await open(b, { now: NOW }); await login(p); await w(p, 1200);
    await goTab(p, 'FANTA'); await w(p, 900);
    const bad = [];
    const note = (i, op, msg) => { bad.push(`mossa ${i} (${op}): ${msg}`); };
    for (let i = 1; i <= N; i++) {
      const s0 = await state(p);
      if (s0.picker) { await choose(p); continue; }
      const ops = [];
      if (s0.cards.length) ops.push('togli', 'togli', 'cambia', 'cambia', '2x');
      if (s0.empty.length) ops.push('aggiungi', 'aggiungi', 'aggiungi', 'completa');
      ops.push('svuota');
      const op = pick(ops);
      let info = '';
      try {
        if (op === 'togli') { const id = pick(s0.cards); await p.evaluate(id => { const c = document.querySelector(`[data-fanta-card="${id}"]`); c.querySelector('[aria-label^="Togli "]').click(); }, id); info = id; }
        if (op === 'aggiungi') { const k = pick(s0.empty); await p.evaluate(k => document.querySelector(`[data-fanta-add="${k}"]`).click(), k); const r = await choose(p); info = k + ' → ' + r.picked; if (r.wrongOff.length) note(i, op, 'riga spenta senza motivo: ' + JSON.stringify(r.wrongOff[0])); if (!r.picked) info += ' (nessuno entra nel budget)'; }
        if (op === 'cambia') { const id = pick(s0.cards); await p.evaluate(id => { const c = document.querySelector(`[data-fanta-card="${id}"]`); c.querySelector('[aria-label^="Gira la carta"]').click(); }, id); await w(p, 250); await p.evaluate(id => { const c = document.querySelector(`[data-fanta-card="${id}"]`); c.querySelector('[aria-label^="Cambia "]').click(); }, id); const r = await choose(p); info = id + ' → ' + r.picked; if (r.wrongOff.length) note(i, op, 'riga spenta senza motivo: ' + JSON.stringify(r.wrongOff[0])); }
        if (op === '2x') { const off = await p.evaluate(() => [...document.querySelectorAll('[data-boost="off"]')].length); if (off) await p.evaluate(n => document.querySelectorAll('[data-boost="off"]')[n].click(), Math.floor(rnd() * off)); }
        if (op === 'svuota') await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /^(svuota|reset)/i.test(x.textContent.trim())); if (b) b.click(); });
        if (op === 'completa') await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /completa/i.test(x.textContent.trim())); if (b) b.click(); });
      } catch (e) { note(i, op, 'errore della prova: ' + e.message.slice(0, 120)); }
      await w(p, 300);
      const s = await state(p);
      if (s.picker) { await choose(p); }
      const s1 = await state(p);
      if (!(s1.budget >= -0.001)) note(i, op + ' ' + info, 'budget sotto zero: ' + s1.budgetText);
      if (s1.cards.length + s1.empty.length !== 7) note(i, op + ' ' + info, 'posti: ' + s1.cards.length + ' carte + ' + s1.empty.length + ' vuoti');
      if (new Set(s1.cards).size !== s1.cards.length) note(i, op + ' ' + info, 'doppione: ' + s1.cards.join(','));
      if (s1.boosts > 0 && s1.boost !== 1) note(i, op + ' ' + info, '2X accesi: ' + s1.boost + ' su ' + s1.boosts + ' piloti');
      if (errs.length) { note(i, op + ' ' + info, 'errore della pagina: ' + errs.join(' | ').slice(0, 200)); break; }
      if (i % 10 === 0) console.log('mossa', i, op, info, '| budget', s1.budgetText, '| carte', s1.cards.length);
    }
    await w(p, 1500);
    const saved = await p.evaluate(() => ((window.firebase.__fake.doc('users/a@b.it') || {}).app2 || {}).squad || null);
    const s = await state(p);
    const owned = [...(saved ? saved.drivers.concat(saved.teams) : [])].filter(Boolean).sort();
    if (JSON.stringify(owned) !== JSON.stringify(s.cards.slice().sort())) bad.push('salvato diverso dallo schermo: ' + owned.join(',') + ' / ' + s.cards.join(','));
    const paidIds = saved && saved.paid ? Object.keys(saved.paid.drivers || {}).concat(Object.keys(saved.paid.teams || {})).sort() : [];
    if (JSON.stringify(paidIds) !== JSON.stringify(owned)) bad.push('prezzi pagati non allineati: ' + paidIds.join(',') + ' / ' + owned.join(','));
    if (saved && !(Number.isFinite(saved.gain || 0))) bad.push('gain non è un numero: ' + saved.gain);
    console.log('FINE', N, 'mosse | problemi:', bad.length, '| salvato', JSON.stringify(saved).slice(0, 400));
    bad.slice(0, 14).forEach(x => console.log('  !!', x));
    await ctx.close();
    assert(!bad.length, bad.length + ' problemi: ' + bad.slice(0, 3).join(' | '));
  },
});
