// Test della 2.0: novità portate dall'app vera (moderazione chat, Termini, privacy,
// eliminazione account, Premium in arrivo, dicitura non ufficiale, email di contatto).
// Uso: bash build.sh (dalla cartella scratchpad) && node rtest/run8.js [filtro]
const { chromium } = require('/opt/node-tools/node_modules/playwright');
// Le notizie, le previsioni, i video e il calendario d'esempio della 2.0 ora stanno su Firebase (Task 6): il Firebase
// finto parte con quei documenti, così le prove li ritrovano.
const SEED_20 = require('../fixtures/seed-2.0.json');
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

// fresh: primo avvio dell'app (Termini ancora da accettare, Task 9); di serie il Firebase finto li dà già accettati.
async function open(b, { fresh = false } = {}) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await ctx.addInitScript(seed => { window.__btSeed = seed; }, fresh ? { ...SEED_20, freshInstall: true } : SEED_20);
  await ctx.addInitScript(() => { window.__opened = []; window.open = u => { window.__opened.push(String(u)); return null; }; });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/' + (process.env.PAGE || 'test.html')); await p.waitForTimeout(400);
  return { ctx, p, errs };
}
const w = (p, ms = 300) => p.waitForTimeout(ms);
const text = p => p.evaluate(() => document.body.innerText);
// Clic affidabile col mini-React: cerca un bottone per testo (contenuto) e lo clicca nella pagina.
async function tapText(p, txt, { exact = false, timeout = 4000 } = {}) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const ok = await p.evaluate(({ txt, exact }) => {
      const n = s => s.replace(/\s+/g, ' ').trim();
      const el = [...document.querySelectorAll('button, a')].find(b => exact ? n(b.textContent) === txt : n(b.textContent).includes(txt));
      if (!el) return false; el.click(); return true;
    }, { txt, exact });
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
  // Due bottoni "ACCEDI": la scheda e il bottone di conferma (il secondo), come nei test di ieri.
  await p.evaluate(() => { const bs = [...document.querySelectorAll('button')].filter(b => b.textContent.replace(/\s+/g, ' ').trim() === 'ACCEDI'); bs[bs.length - 1].click(); });
  await w(p, 2500);
}
// Termini del primo avvio (Task 9): ACCETTO si accende solo dopo averli scorsi fino in fondo.
async function acceptTerms(p) {
  await p.evaluate(() => { const e = document.querySelector('[data-terms-body]'); if (e) { e.scrollTop = e.scrollHeight; e.dispatchEvent(new Event('scroll')); } });
  await w(p, 200); await tapText(p, 'ACCETTO'); await w(p, 500);
}
async function enter(p) { await login(p); }   // i Termini li ha già accettati il Firebase finto
// Dalla versione 22 la chat non è più una scheda in basso: si apre dalla pagina RACE.
async function openChat(p, name = 'Chat Generale') { await tapText(p, 'RACE', { exact: true }); await w(p); await tapSel(p, '[data-race-chat]'); await w(p); await tapText(p, name); await w(p, 500); }
async function openAdminChat(p) { await tapSel(p, '[aria-label="Profilo"]'); await w(p); await tapText(p, 'Pannello Admin'); await w(p); for (const d of '080824') { await tapText(p, d, { exact: true }); await w(p, 60); } await w(p, 900); await tapText(p, 'CHAT', { exact: true }); await w(p, 400); }
const assert = (c, m) => { if (!c) throw new Error(m); };

const tests = {
  async 'Termini: al primo ingresso vanno accettati, poi si entra'(b) {
    const { ctx, p, errs } = await open(b, { fresh: true });   // Task 9: al primo avvio, prima dell'accesso
    await w(p, 2600);
    const t1 = await text(p);
    assert(/Accettazione dei Termini/.test(t1), 'i Termini non compaiono al primo ingresso');
    await acceptTerms(p);
    await login(p);
    const t2 = await text(p); await ctx.close();
    assert(!/Accettazione dei Termini/.test(t2), 'i Termini restano aperti dopo ACCETTO');
    assert(/HOME/.test(t2), 'dopo i Termini e l\'accesso non si entra nell\'app');
    assert(!errs.length, 'errori JS: ' + errs.join(' | '));
  },
  async 'chat: segnalare un messaggio lo manda al pannello admin'(b) {
    const { ctx, p } = await open(b);
    await enter(p); await openChat(p);
    await tapSel(p, '[aria-label="Opzioni messaggio di Davide S."]'); await w(p);
    await tapText(p, 'Segnala messaggio'); await w(p, 400);
    const t = await text(p);
    assert(/Segnalazione inviata/.test(t), 'manca la conferma della segnalazione');
    await tapSel(p, '[aria-label="Indietro"]').catch(() => {}); await w(p);
    await tapText(p, 'HOME', { exact: true }).catch(() => {}); await w(p);
    await openAdminChat(p);
    const t2 = await text(p); await ctx.close();
    assert(/SEGNALAZIONI/.test(t2) && /Io spero in un po' di pioggia/.test(t2), 'la segnalazione non compare nella scheda CHAT dell\'admin');
  },
  async 'chat: bloccare un utente ne nasconde i messaggi, e dal profilo si sblocca'(b) {
    const { ctx, p } = await open(b);
    await enter(p); await openChat(p);
    await tapSel(p, '[aria-label="Opzioni messaggio di Giulia R."]'); await w(p);
    await tapText(p, 'Blocca Giulia R.'); await w(p, 400);
    const t = await text(p);
    assert(!/Occhio alle previsioni meteo/.test(t), 'i messaggi di Giulia sono ancora visibili');
    assert(/Ragazzi pronti per il weekend/.test(t), 'sono spariti anche i messaggi degli altri');
    await tapSel(p, '[aria-label="Indietro"]'); await w(p);
    await tapSel(p, '[aria-label="Profilo"]'); await w(p);
    const t2 = await text(p);
    assert(/UTENTI BLOCCATI/.test(t2) && /Giulia R\./.test(t2), 'nel profilo manca l\'elenco dei bloccati');
    await tapText(p, 'Sblocca'); await w(p);
    const t3 = await text(p); await ctx.close();
    assert(!/UTENTI BLOCCATI/.test(t3), 'lo sblocco non funziona');
  },
  async 'admin: elimina il messaggio segnalato e sospende l\'autore'(b) {
    const { ctx, p } = await open(b);
    await enter(p); await openChat(p);
    await tapSel(p, '[aria-label="Opzioni messaggio di Davide S."]'); await w(p);
    await tapText(p, 'Segnala messaggio'); await w(p, 300);
    await tapSel(p, '[aria-label="Indietro"]'); await w(p);
    await openAdminChat(p);
    await tapText(p, 'SOSPENDI Davide S.'); await w(p);
    const t1 = await text(p);
    assert(/UTENTI SOSPESI/.test(t1) && /RIATTIVA/.test(t1), 'l\'utente sospeso non compare');
    await tapText(p, 'ELIMINA MESSAGGIO'); await w(p);
    await tapSel(p, '[aria-label="Indietro"]'); await w(p); await tapSel(p, '[aria-label="Indietro"]').catch(() => {}); await w(p);
    await openChat(p);
    const t2 = await text(p); await ctx.close();
    assert(!/Io spero in un po' di pioggia/.test(t2), 'il messaggio eliminato è ancora in chat');
  },
  async 'elimina account: chiede conferma e cancella anche i miei messaggi'(b) {
    const { ctx, p } = await open(b);
    await enter(p); await openChat(p);
    await p.fill('input[placeholder="Scrivi un messaggio…"]', 'messaggio da cancellare'); await w(p, 150);
    await tapSel(p, '[aria-label="Invia"]'); await w(p, 300);
    await tapSel(p, '[aria-label="Indietro"]'); await w(p);
    await tapSel(p, '[aria-label="Profilo"]'); await w(p);
    await tapText(p, 'Elimina account'); await w(p);
    const t1 = await text(p);
    assert(/Eliminare l'account\?/.test(t1), 'nessuna richiesta di conferma');
    await p.fill('#delPw', 'x'); await tapText(p, 'ELIMINA DEFINITIVAMENTE'); await w(p, 600);   // Task 7: la password conferma l'eliminazione
    const t2 = await text(p);
    assert(/ENTRA SENZA ACCOUNT/.test(t2), 'dopo l\'eliminazione non torna alla schermata di accesso');
    await tapText(p, 'ENTRA SENZA ACCOUNT'); await w(p, 700);   // i Termini restano accettati su questo telefono, come oggi
    await openChat(p);
    const t3 = await text(p); await ctx.close();
    assert(!/messaggio da cancellare/.test(t3), 'i miei messaggi restano in chat dopo l\'eliminazione');
  },
  async 'privacy: link nel profilo (anche da ospite) e nei Termini'(b) {
    const { ctx, p } = await open(b);
    await w(p, 2600); await tapText(p, 'ENTRA SENZA ACCOUNT'); await w(p, 700);
    await tapSel(p, '[aria-label="Profilo"]'); await w(p);
    await tapText(p, 'Privacy Policy'); await w(p);
    let op = await p.evaluate(() => window.__opened.slice());
    assert(op.some(u => /privacy\.html$/.test(u)), 'il link Privacy Policy non apre la pagina: ' + op.join(','));
    await tapText(p, 'Termini e Condizioni'); await w(p, 400);
    await tapSel(p, '[aria-label="Apri la Privacy Policy"]'); await w(p);
    op = await p.evaluate(() => window.__opened.slice()); await ctx.close();
    assert(op.filter(u => /privacy\.html$/.test(u)).length >= 2, 'nei Termini manca il link alla privacy');
  },
  async 'Premium: per ora si prova senza pagare (anteprima demo)'(b) {
    const { ctx, p } = await open(b);
    await enter(p);
    await tapSel(p, '[aria-label="Profilo"]'); await w(p); await tapText(p, 'Passa a Premium'); await w(p, 400);
    const t = await text(p); await ctx.close();
    assert(/PROVA GRATIS 2 SETTIMANE/.test(t) && /abbonati subito/i.test(t), 'mancano i bottoni per la prova gratuita e per abbonarsi');   // dalla versione 16
    assert(/nessun pagamento reale/.test(t), 'non è chiaro che è una prova senza pagamento');
  },
  async 'dicitura non ufficiale su Home e Profilo, email di contatto giusta'(b) {
    const { ctx, p } = await open(b);
    await enter(p);
    await p.evaluate(() => document.querySelectorAll('.scrollcol').forEach(s => s.scrollTop = s.scrollHeight)); await w(p);
    const home = await text(p);
    await tapSel(p, '[aria-label="Profilo"]'); await w(p);
    const prof = await text(p);
    await tapText(p, 'Assistenza'); await w(p);
    const help = await text(p); await ctx.close();
    assert(/non ufficiale/.test(home), 'manca la dicitura sulla Home');
    assert(/non ufficiale/.test(prof), 'manca la dicitura nel Profilo');
    assert(/bt\.formula1@gmail\.com/.test(help) && !/supporto@bt-app\.demo/.test(help), 'email di assistenza sbagliata');
  },
  // Task 7: "Password dimenticata?" chiede l'email e fa mandare da Firebase l'email per la nuova password
  // (prima indicava l'indirizzo bt.formula1@gmail.com da scrivere a mano).
  async 'accesso: "Password dimenticata?" dice come fare'(b) {
    const { ctx, p } = await open(b);
    await tapText(p, 'Password dimenticata?'); await w(p);
    const t = await text(p);
    await p.fill('#authEmail', 'a@b.it');
    await tapText(p, 'Password dimenticata?'); await w(p, 600);
    const t2 = await text(p); await ctx.close();
    assert(/Inserisci la tua email/.test(t), 'senza email non dice di scriverla');
    assert(/Ti abbiamo mandato un'email per scegliere una nuova password/.test(t2), 'nessuna indicazione per recuperare la password');
  },
};

(async () => {
  const filter = process.argv[2] ? new RegExp(process.argv[2], 'i') : null;
  const b = await chromium.launch({ executablePath: EXE });
  let pass = 0, fail = 0;
  for (const [name, fn] of Object.entries(tests)) {
    if (filter && !filter.test(name)) continue;
    try { await fn(b); pass++; console.log('PASS  ' + name); }
    catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + String(e.message).split('\n')[0].slice(0, 250)); }
  }
  await b.close(); console.log(`\n${pass} passati, ${fail} falliti`); process.exit(fail ? 1 : 0);
})();
