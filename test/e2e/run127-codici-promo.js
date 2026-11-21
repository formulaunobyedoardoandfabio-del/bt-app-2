// 21/11 (Edoardo): codici promo da 6 cifre. L'admin li crea (Pannello Admin, PROMO) per l'email di un account e un
// numero di giorni, e li scrive su Firebase (shared/bt-promo, con l'impronta SHA-256 dell'email, mai l'email). Chi ha
// quell'account lo scrive in Profilo, Codice promo: cifre a rullo come nel video "Digit Spin", Verifica, giro finale
// "Smooth" (65 ms tra una cifra e l'altra, 260 ms ciascuna), verde; Funzioni Pro per quei giorni e il trofeo
// "Codice scritto". Logica: test/unit/promo.test.js. Uso: node test/build-test.js && node test/e2e/run127-codici-promo.js [filtro]
const { open, w, tapSel, tapText, login, openAdmin, skipTour, assert, run } = require('./helpers');
const P = require('../../src/logic/promo');

const NOW = Date.parse('2026-10-07T10:00:00Z');   // l'orologio di serie delle prove
const seedCode = (code, email, days = 14) => ({ 'shared/bt-promo': { codes: [{ code, to: P.emailKey(email), days, at: NOW - 864e5 }] } });
const openPromo = async p => { await tapSel(p, '[aria-label="Profilo"]'); await w(p, 500); await tapText(p, 'Codice promo'); await w(p, 400); };
const typeCode = async (p, code, gap = 120) => { await p.focus('[data-promo-input]'); for (const ch of code) { await p.keyboard.type(ch); await w(p, gap); } };
const sheet = p => p.evaluate(() => {
  const s = document.querySelector('[data-promo-sheet]'); if (!s) return null;
  const boxes = [...s.querySelectorAll('[data-promo-box]')];
  const reels = boxes.map(b => b.querySelector('[data-promo-reel]'));
  const btn = s.querySelector('[data-promo-verify]'), msg = s.querySelector('[data-promo-msg]');
  return {
    status: s.querySelector('[data-promo-code]').getAttribute('data-promo-status'),
    digits: boxes.map(b => b.getAttribute('data-promo-digit')).join(''),
    reelAnim: reels.map(r => (r ? getComputedStyle(r).animationName : null)),
    reelDur: reels.map(r => (r ? getComputedStyle(r).animationDuration : null)),
    reelDelay: reels.map(r => (r ? getComputedStyle(r).animationDelay : null)),
    border: boxes.map(b => getComputedStyle(b).borderTopColor),
    card: getComputedStyle(s).animationName,
    btn: btn && btn.innerText.trim(), btnOff: btn && btn.disabled,
    msg: msg && msg.getAttribute('data-promo-msg'), msgText: msg && msg.innerText,
  };
});

run({
  async 'admin: crea un codice per un account, su Firebase c\'è l\'impronta dell\'email e non l\'email; poi lo cancella'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await w(p, 600);
    await openAdmin(p, 'PROMO'); await w(p, 500);
    const code = await p.inputValue('[data-promo-new]');
    await p.fill('[data-promo-email]', 'Mario.Rossi@Gmail.com'); await p.fill('[data-promo-days]', '14');
    await tapSel(p, '[data-promo-create]'); await w(p, 900);
    const doc = await p.evaluate(() => window.firebase.__fake.doc('shared/bt-promo'));
    const msg = await p.evaluate(() => (document.querySelector('[data-promo-admin-msg]') || {}).innerText || '');
    const row = await p.evaluate(c => (document.querySelector(`[data-promo-row="${c}"]`) || {}).innerText || '', code);
    await tapSel(p, `[aria-label="Cancella il codice ${code}"]`); await w(p, 900);
    const after = await p.evaluate(() => window.firebase.__fake.doc('shared/bt-promo'));
    await ctx.close();
    assert(P.CODE_RE.test(code), 'codice proposto di 6 cifre: ' + code);
    assert(doc && doc.codes.length === 1 && doc.codes[0].code === code && doc.codes[0].days === 14 && doc.codes[0].to === P.emailKey('mario.rossi@gmail.com'), 'su Firebase: ' + JSON.stringify(doc));
    assert(!/mario/i.test(JSON.stringify(doc)), 'l\'email non deve stare nel documento: ' + JSON.stringify(doc));
    assert(/creato per mario\.rossi@gmail\.com/.test(msg) && /14 giorni/.test(msg), 'messaggio: ' + msg);
    assert(/mario\.rossi@gmail\.com/.test(row) && /14 giorni/.test(row), 'riga del codice (l\'email la ricorda questo telefono): ' + row);
    assert(after && after.codes.length === 0, 'cancellato: ' + JSON.stringify(after));
    assert(!errs.length, errs.join(' | '));
  },

  async 'utente giusto: cifre a rullo, Verifica, giro finale Smooth (65 ms, 260 ms), verde; Funzioni Pro e trofeo'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: seedCode('274851', 'a@b.it', 14) } }); await login(p); await w(p, 800);
    await openPromo(p);
    const opened = await sheet(p);
    await typeCode(p, '27');
    const two = await sheet(p);
    await typeCode(p, '4851');
    const six = await sheet(p);
    await tapSel(p, '[data-promo-verify]'); await w(p, 120);
    const spin = await sheet(p);
    await w(p, 900);
    const done = await sheet(p);
    await w(p, 1200);
    const user = await p.evaluate(() => (window.firebase.__fake.doc('users/a@b.it') || {}).app2 || {});
    await tapSel(p, '[data-promo-verify]'); await w(p, 400);   // VERIFICATO chiude
    const rowVal = await p.evaluate(() => { const r = [...document.querySelectorAll('button, div')].find(e => e.innerText && e.innerText.startsWith('Codice promo')); return r ? r.innerText : ''; });
    // Il codice dà le Funzioni Pro, non il Premium: niente "Sei B&T Premium" e il tasto in alto resta "Premium" da prendere.
    const card = await p.evaluate(() => document.body.innerText.includes('Sei B&T Premium'));
    await tapSel(p, '[aria-label="Indietro"]'); await w(p, 600);
    const chip = await p.evaluate(() => { const c = document.querySelector('[data-premium-chip]'); return c && c.getAttribute('data-premium-chip'); });
    const pro = await p.evaluate(() => { const e = document.querySelector('[data-pro]'); return e && e.getAttribute('data-pro'); });
    await ctx.close();
    assert(!card && chip === 'off', 'col codice non si è Premium: card ' + card + ', tasto in alto ' + chip);
    assert(pro === 'on', 'ma le Funzioni Pro sono attive: ' + pro);
    assert(opened && opened.card === 'pcSpring' && opened.btnOff && opened.btn === 'VERIFICA', 'scheda aperta a molla, Verifica spento: ' + JSON.stringify(opened));
    assert(two.digits === '27' && two.reelAnim[0] === 'pcReel' && two.reelAnim[1] === 'pcReel' && two.reelDur[1] === '0.26s', 'ogni cifra arriva girando (260 ms): ' + JSON.stringify(two));
    assert(six.digits === '274851' && six.btnOff === false, 'con 6 cifre Verifica si accende: ' + JSON.stringify(six));
    assert(spin.status === 'ok' && spin.reelDelay.join(',') === '0s,0.065s,0.13s,0.195s,0.26s,0.325s', 'giro finale: una cifra ogni 65 ms: ' + JSON.stringify(spin.reelDelay));
    assert(done.btn === 'VERIFICATO' && done.border.every(c => c === 'rgb(43, 217, 160)') && done.msg === 'ok' && /14 giorni/.test(done.msgText) && /Codice scritto/.test(done.msgText), 'verde e Verificato: ' + JSON.stringify(done));
    assert(user.promo && user.promo.used && user.promo.used[0] === '274851' && user.promo.until > NOW + 13 * 864e5, 'nell\'account: ' + JSON.stringify(user.promo));
    assert(user.trophies && user.trophies.codice, 'trofeo Codice scritto: ' + JSON.stringify(user.trophies));
    assert(/Pro fino al/.test(rowVal), 'nel Profilo la riga dice fino a quando: ' + rowVal);
    assert(!errs.length, errs.join(' | '));
  },

  async 'i no: codice di un altro account, codice che non c\'è, codice già usato'(b) {
    const docs = { 'shared/bt-promo': { codes: [{ code: '111222', to: P.emailKey('altro@b.it'), days: 3, at: 1 }, { code: '333444', to: P.emailKey('a@b.it'), days: 3, at: 1 }] } };
    const { ctx, p, errs } = await open(b, { seed: { addDocs: docs } }); await login(p); await w(p, 800);
    await openPromo(p);
    const tryCode = async c => { await p.fill('[data-promo-input]', ''); await typeCode(p, c, 40); await tapSel(p, '[data-promo-verify]'); await w(p, 700); return sheet(p); };
    const other = await tryCode('111222');
    const none = await tryCode('999999');
    const ok = await tryCode('333444');
    await tapSel(p, '[data-promo-verify]'); await w(p, 400);   // VERIFICATO chiude: si resta nel Profilo
    await tapText(p, 'Codice promo'); await w(p, 400);
    const again = await tryCode('333444');
    await ctx.close();
    assert(other.status === 'err' && other.msg === 'altro' && /altro account/.test(other.msgText) && other.border.every(c => c === 'rgb(255, 90, 95)'), 'di un altro account: ' + JSON.stringify(other));
    assert(none.msg === 'nessuno' && /non esiste/.test(none.msgText), 'inesistente: ' + JSON.stringify(none));
    assert(ok.status === 'ok', 'il suo: ' + JSON.stringify(ok));
    assert(again.msg === 'usato' && /già usato/.test(again.msgText), 'la seconda volta: ' + JSON.stringify(again));
    assert(!errs.length, errs.join(' | '));
  },

  async 'ospite: per usare un codice serve un account'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: seedCode('274851', 'a@b.it') } });
    await tapText(p, 'ENTRA COME OSPITE'); await w(p, 600); await skipTour(p);
    await openPromo(p);
    await typeCode(p, '274851', 40); await tapSel(p, '[data-promo-verify]'); await w(p, 500);
    const r = await sheet(p);
    const login = await p.evaluate(() => [...document.querySelectorAll('[data-promo-sheet] button')].some(e => e.innerText.trim() === 'ACCEDI O REGISTRATI'));
    await ctx.close();
    assert(r.msg === 'ospite' && /serve un account/.test(r.msgText) && login, 'ospite: ' + JSON.stringify(r));
    assert(!errs.length, errs.join(' | '));
  },

  async 'Rimuovi animazioni: cifre e scheda ferme, il codice funziona lo stesso'(b) {
    const { ctx, p, errs } = await open(b, { reducedMotion: 'reduce', seed: { addDocs: seedCode('274851', 'a@b.it') } }); await login(p); await w(p, 800);
    await openPromo(p);
    await typeCode(p, '274851', 40);
    const r = await sheet(p);
    await tapSel(p, '[data-promo-verify]'); await w(p, 600);
    const done = await sheet(p);
    await ctx.close();
    assert(r.card === 'none' && r.reelAnim.every(a => a === 'none') && r.digits === '274851', 'ferme: ' + JSON.stringify(r));
    assert(done.status === 'ok' && done.btn === 'VERIFICATO', 'funziona: ' + JSON.stringify(done));
    assert(!errs.length, errs.join(' | '));
  },
});
