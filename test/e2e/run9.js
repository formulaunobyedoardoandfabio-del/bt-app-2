// Giro completo della 2.0: tutte le schermate senza errori + screenshot delle parti nuove (fallisce con un errore JS).
const { chromium } = require('/opt/node-tools/node_modules/playwright');
// Le notizie, le previsioni, i video e il calendario d'esempio della 2.0 ora stanno su Firebase (Task 6): il Firebase
// finto parte con quei documenti, così le prove li ritrovano.
const SEED_20 = require('../fixtures/seed-2.0.json');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
  await ctx.addInitScript(seed => { window.__btSeed = seed; }, { ...SEED_20, freshInstall: true });   // primo avvio: Termini (Task 9)
  await ctx.addInitScript(() => { window.open = () => null; });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const w = (ms = 350) => p.waitForTimeout(ms);
  const tap = async (txt, exact = false) => { const ok = await p.evaluate(({ txt, exact }) => { const n = s => s.replace(/\s+/g, ' ').trim(); const el = [...document.querySelectorAll('button')].find(b => exact ? n(b.textContent) === txt : n(b.textContent).includes(txt)); if (el) el.click(); return !!el; }, { txt, exact }); if (!ok) throw new Error('manca: ' + txt); await w(); };
  const sel = async s => { await p.evaluate(s => document.querySelector(s).click(), s); await w(); };
  await p.goto('file://' + __dirname + '/' + (process.env.PAGE || 'test.html')); await w(500);
  await p.waitForFunction(() => !document.querySelector('[data-splash]'), null, { timeout: 8000 }).catch(() => {});
  await p.screenshot({ path: 'n1-termini.png' });
  await p.evaluate(() => { const e = document.querySelector('[data-terms-body]'); e.scrollTop = e.scrollHeight; e.dispatchEvent(new Event('scroll')); }); await w();
  await tap('ACCETTO');
  await p.fill('#authEmail', 'a@b.it'); await p.fill('#authPw', 'x');
  await p.evaluate(() => { const bs = [...document.querySelectorAll('button')].filter(b => b.textContent.trim() === 'ACCEDI'); bs[bs.length - 1].click(); }); await w(2500);
  for (const t of ['RACE', 'GARAGE', 'FANTA', 'HOME']) await tap(t, true);
  await tap('RACE', true); await sel('[data-race-chat]'); await tap('Chat Generale'); await sel('[aria-label="Opzioni messaggio di Davide S."]');
  await p.screenshot({ path: 'n2-chat-menu.png' });
  await tap('Segnala messaggio'); await p.screenshot({ path: 'n3-segnalato.png' });
  await sel('[aria-label="Indietro"]'); await p.screenshot({ path: 'n4-lista-chat.png' });
  await sel('[aria-label="Profilo"]');
  await p.evaluate(() => document.querySelectorAll('.scrollcol').forEach(s => s.scrollTop = s.scrollHeight)); await w();
  await p.screenshot({ path: 'n5-profilo-fondo.png' });
  await tap('Elimina account'); await p.screenshot({ path: 'n6-conferma.png' }); await tap('Annulla');
  await tap('Passa a Premium'); await p.evaluate(() => document.querySelectorAll('.scrollcol').forEach(s => s.scrollTop = s.scrollHeight)); await w();
  await p.screenshot({ path: 'n7-premium.png' }); await sel('[aria-label="Chiudi"]');
  await tap('Pannello Admin'); for (const d of '080824') { await tap(d, true); } await w(900);
  for (const t of ['FANTA F1', 'CLASSIFICHE', 'GARA LIVE', 'INSTAGRAM', 'NOTIFICHE', 'NEWS', 'CHAT']) await tap(t, true);
  await p.screenshot({ path: 'n8-admin-chat.png' });
  console.log('errori JS:', errs.length ? errs.join(' | ') : 'nessuno');
  await b.close();
  // Un errore JS in una schermata qualsiasi fa fallire il giro (test/all.sh guarda l'uscita e questa riga).
  console.log(`\n${errs.length ? 0 : 1} passati, ${errs.length ? 1 : 0} falliti`);
  process.exit(errs.length ? 1 : 0);
})().catch(e => { console.log('FAIL  giro completo: ' + String(e.message).split('\n')[0] + '\n\n0 passati, 1 falliti'); process.exit(1); });
