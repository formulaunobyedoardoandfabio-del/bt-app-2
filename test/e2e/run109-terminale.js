// 14/11 (Edoardo): "il bottone admin lo devono vedere tutti in fondo all'app prima di Esci ed Elimina; aperto deve
// sembrare un terminale, come se stessi hackerando l'app; col solito codice si apre la pagina admin, con altri codici si
// sbloccano cose diverse". La logica dei codici è provata in test/unit/secret-codes.test.js.
// Uso: node test/build-test.js && node test/e2e/run109-terminale.js [filtro]
const fs = require('fs');
const path = require('path');
const { open, w, tapSel, goTab, login, assert, run } = require('./helpers');

// Il codice admin si prende dall'app (non si scrive anche qui).
const ADMIN = fs.readFileSync(path.join(__dirname, '../../src/App.jsx'), 'utf8').match(/const ADMIN_CODE = "([0-9]+)"/)[1];
const NOW = '2026-11-17T10:00:00Z';

const toProfile = async p => { await tapSel(p, '[aria-label="Profilo"]'); await w(p, 500); };
const openTerm = async p => {
  await toProfile(p);
  await p.$eval('[data-hack-open]', e => e.scrollIntoView({ block: 'center' }));
  await tapSel(p, '[data-hack-open]'); await w(p, 400);
};
const type = async (p, code) => {
  await p.fill('[data-hack-input]', code);
  await p.press('[data-hack-input]', 'Enter');
  await w(p, 700);
};
const term = p => p.evaluate(() => {
  const t = document.querySelector('[data-hack-term]');
  return t && { state: t.getAttribute('data-hack-state'), text: t.innerText, lines: t.querySelectorAll('[data-hack-line]').length, found: (t.querySelector('[data-hack-found]') || {}).textContent || '', tele: (t.querySelector('[data-hack-telemetry]') || {}).innerText || '' };
});
const adminOpen = p => p.evaluate(() => [...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'NOTIFICHE') && !document.querySelector('[data-hack-term]'));

run({
  async 'tutti vedono ADMIN in fondo al Profilo, prima di Esci ed Elimina account (anche da ospite)'(b) {
    const { ctx, p, errs } = await open(b, { now: NOW }); await login(p); await w(p, 800);
    await toProfile(p);
    const order = await p.evaluate(() => {
      const bs = [...document.querySelectorAll('button')];
      const at = f => bs.findIndex(f);
      return { admin: at(x => x.hasAttribute('data-hack-open')), esci: at(x => x.textContent.trim() === 'Esci'), del: at(x => x.textContent.trim() === 'Elimina account'), label: (document.querySelector('[data-hack-open]') || {}).textContent || '' };
    });
    await ctx.close();
    const g = await open(b, { now: NOW });
    await g.p.evaluate(() => { const x = [...document.querySelectorAll('button')].find(e => /ospite/i.test(e.textContent)); if (x) x.click(); });
    await w(g.p, 900); await toProfile(g.p);
    const guest = await g.p.evaluate(() => { const bs = [...document.querySelectorAll('button')]; return { admin: bs.findIndex(x => x.hasAttribute('data-hack-open')), login: bs.findIndex(x => x.textContent.trim() === 'Accedi') }; });
    await g.ctx.close();
    assert(order.admin >= 0 && /ADMIN/.test(order.label), 'bottone ADMIN per un utente normale: ' + JSON.stringify(order));
    assert(order.admin < order.esci && order.esci < order.del, 'ADMIN prima di Esci e di Elimina: ' + JSON.stringify(order));
    assert(guest.admin >= 0 && guest.admin < guest.login, 'anche da ospite, prima di Accedi: ' + JSON.stringify(guest));
    assert(!errs.length && !g.errs.length, errs.concat(g.errs).join(' | '));
  },

  async 'il terminale: avvio da hacker; codice sbagliato → ACCESSO NEGATO; il codice admin su un account normale → uguale'(b) {
    const { ctx, p, errs } = await open(b, { now: NOW }); await login(p); await w(p, 800);
    await openTerm(p); await w(p, 1800);
    const boot = await term(p);
    await p.screenshot({ path: '/tmp/bt/run109-avvio.png' });
    await type(p, 'boh123');
    const wrong = await term(p);
    await p.screenshot({ path: '/tmp/bt/run109-negato.png' });
    await type(p, ADMIN);
    const adminWrong = await term(p);
    const opened = await adminOpen(p);
    await ctx.close();
    assert(boot && boot.lines >= 6 && /BOX TERMINAL/.test(boot.text), 'righe di avvio: ' + JSON.stringify(boot && { lines: boot.lines, text: boot.text.slice(0, 200) }));
    assert(wrong.state === 'denied' && /ACCESSO NEGATO/.test(wrong.text), 'sbagliato: ' + JSON.stringify(wrong.state));
    assert(adminWrong.state === 'denied' && !opened, 'il codice admin su un account normale non apre niente: ' + adminWrong.state);
    const tail = s => s.text.split('\n').filter(Boolean).slice(-3).join(' | ').replace(/\d+/g, 'N');   // eco col codice nascosto + risposta, senza i numeri
    assert(tail(adminWrong).replace(ADMIN, 'X') === tail(wrong).replace('BOH123', 'X'), 'stessa risposta di un codice sbagliato (non si scopre che era giusto): ' + tail(adminWrong) + ' // ' + tail(wrong));
    assert(!errs.length, errs.join(' | '));
  },

  async 'sblocchi: PITWALL accende Pit Swipe solo qui, 1950 bianco e nero, TELEMETRIA dati veri; ridigitato si spegne; restano riaprendo'(b) {
    const { ctx, p, errs } = await open(b, { now: NOW }); await login(p); await w(p, 800);
    await goTab(p, 'HOME'); await w(p, 500);
    const before = await p.evaluate(() => !!document.querySelector('[data-pitswipe-card]'));
    await openTerm(p);
    await type(p, 'pit wall');
    const a = await term(p);
    await type(p, '1950');
    await type(p, 'TELEMETRIA');
    const c = await term(p);
    const retro = await p.evaluate(() => !!document.querySelector('[data-retro]'));
    await tapSel(p, '[data-hack-term] [aria-label="Indietro"]'); await w(p, 400);   // torna al Profilo
    await tapSel(p, '[aria-label="Indietro"]'); await w(p, 400);                     // dal Profilo alle schede
    await goTab(p, 'HOME'); await w(p, 600);
    const card = await p.evaluate(() => !!document.querySelector('[data-pitswipe-card]'));
    const flags = await p.evaluate(() => window.firebase.__fake.doc('shared/bt-flags'));
    await p.reload(); await w(p, 2500);
    const kept = await p.evaluate(() => ({ retro: !!document.querySelector('[data-retro]'), list: localStorage.getItem('bt_bt-unlocks') }));
    await openTerm(p);
    await type(p, '1950');
    const off = await p.evaluate(() => !!document.querySelector('[data-retro]'));
    await ctx.close();
    assert(!before, 'di serie Pit Swipe è spento');
    assert(a.state === 'granted' && /Pit Swipe acceso/.test(a.text) && /1\/3/.test(a.found), 'PITWALL: ' + JSON.stringify({ s: a.state, f: a.found }));
    assert(/3\/3/.test(c.found), 'tre sblocchi su tre: ' + c.found);
    assert(/2\.0\.0/.test(c.tele) && /RETE/.test(c.tele) && /ACCOUNT/.test(c.tele), 'telemetria con dati veri: ' + c.tele.slice(0, 300));
    assert(retro, 'modalità 1950 accesa');
    assert(card, 'la carta di Pit Swipe c\'è in Home');
    assert(!flags || !flags.pitSwipe, 'acceso solo su questo telefono, non per tutti: ' + JSON.stringify(flags));
    assert(kept.retro && /retro/.test(kept.list || ''), 'restano riaprendo l\'app: ' + JSON.stringify(kept));
    assert(!off, 'ridigitato 1950 si spegne');
    assert(!errs.length, errs.join(' | '));
  },

  async 'firewall: 5 codici sbagliati di fila → 30 secondi chiuso, anche un codice giusto non passa'(b) {
    const { ctx, p, errs } = await open(b, { now: NOW }); await login(p); await w(p, 800);
    await openTerm(p);
    for (let i = 0; i < 5; i++) await type(p, 'x' + i);
    const locked = await term(p);
    const input = await p.$eval('[data-hack-input]', e => ({ off: e.disabled, ph: e.placeholder }));
    await p.reload(); await w(p, 2000);   // riaprendo l'app il firewall resta (sta sul telefono)
    await openTerm(p);
    const again = await p.$eval('[data-hack-input]', e => e.disabled);
    await ctx.close();
    assert(locked.state === 'locked' && /FIREWALL/.test(locked.text), 'chiuso: ' + locked.state);
    assert(input.off && /firewall/i.test(input.ph), 'mentre è chiuso non si può scrivere: ' + JSON.stringify(input));
    assert(again, 'chiudere e riaprire non lo riapre');
    assert(!errs.length, errs.join(' | '));
  },

  async 'admin: col solito codice si apre il pannello admin'(b) {
    const { ctx, p, errs } = await open(b, { now: NOW, seed: { admin: true } }); await login(p); await w(p, 1200);
    await openTerm(p);
    await type(p, ADMIN);
    const g = await term(p);
    await p.screenshot({ path: '/tmp/bt/run109-consentito.png' });
    await w(p, 1500);
    const opened = await adminOpen(p);
    await ctx.close();
    assert(g && g.state === 'granted' && /ACCESSO CONSENTITO/.test(g.text), 'accesso consentito: ' + (g && g.state));
    assert(opened, 'si apre il pannello admin');
    assert(!errs.length, errs.join(' | '));
  },
});
