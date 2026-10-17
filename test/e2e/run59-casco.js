// Tappa 3, Task 10 (G15): il casco al posto delle iniziali nel Profilo e nel tasto del profilo in alto, con l'editor
// completo (colori, disegno, numero, visiera, finitura). Entrando nell'editor la visiera si alza; salvando si abbassa con
// il clack; il casco si salva nell'account (helmet).
// Uso: node test/build-test.js && node test/e2e/run59-casco.js [filtro]
const { open, w, tapText, tapSel, login, assert, run } = require('./helpers');

const spyFx = p => p.evaluate(() => { const fx = window.__btFx; window.__played = []; const play = fx.play; fx.play = n => { window.__played.push(n); return play(n); }; });
const helmetIn = (p, sel) => p.evaluate(s => { const e = document.querySelector(s + ' [data-helmet]'); return e ? { pattern: e.getAttribute('data-pattern'), visor: e.getAttribute('data-visor'), finish: e.getAttribute('data-finish'), text: e.textContent.trim() } : null; }, sel);
const openProfile = async p => { await tapSel(p, '[aria-label="Profilo"]'); await w(p, 400); };
const openEditor = async p => { await tapSel(p, '[aria-label="Modifica il casco"]'); await w(p, 500); };
const choose = (p, group, label) => p.evaluate(({ group, label }) => {
  const b = [...document.querySelectorAll(`[data-helmet-editor] [data-helmet-opt="${group}"] button`)].find(x => (x.getAttribute('aria-label') || x.textContent).trim() === label);
  if (!b) return false; b.click(); return true;
}, { group, label });

run({
  async 'nel Profilo il casco al posto delle iniziali'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await openProfile(p);
    const h = await helmetIn(p, '[data-profile-avatar]');
    const avatarText = await p.evaluate(() => { const e = document.querySelector('[data-profile-avatar]'); return e ? e.innerText.trim() : null; });
    await ctx.close();
    assert(h && h.pattern === 'stripes' && h.visor === 'closed', 'casco di serie nel Profilo: ' + JSON.stringify(h));
    assert(avatarText === '', 'nel tondo del profilo ci sono ancora le iniziali: ' + avatarText);
    assert(!errs.length, errs.join(' | '));
  },

  async 'editor: la visiera si alza (data-visor="open")'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await openProfile(p); await openEditor(p);
    const h = await helmetIn(p, '[data-helmet-editor]');
    const groups = await p.evaluate(() => [...document.querySelectorAll('[data-helmet-editor] [data-helmet-opt]')].map(e => e.getAttribute('data-helmet-opt')));
    const t = await p.evaluate(() => document.querySelector('[data-helmet-editor]').innerText);
    await ctx.close();
    assert(h && h.visor === 'open', 'nell\'editor la visiera non si alza: ' + JSON.stringify(h));
    for (const g of ['base', 'c1', 'c2', 'pattern', 'visor', 'finish']) assert(groups.includes(g), 'manca la scelta ' + g + ': ' + groups.join(','));
    for (const s of ['Strisce', 'Fiamme', 'Scacchi', 'Stelle', 'Fulmine', 'Righe sottili', 'Pois', 'Nessuno', 'Chiara', 'Fumé', 'Iridio blu', 'Iridio oro', 'Specchio rosso', 'Lucida', 'Opaca', 'Aerografo', 'NUMERO', 'COLORE DI BASE']) assert(t.includes(s), 'nell\'editor manca "' + s + '"');
    assert(!errs.length, errs.join(' | '));
  },

  async 'salvando la visiera si abbassa con il clack e il casco resta dopo il riavvio'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await openProfile(p); await openEditor(p); await spyFx(p);
    const picks = [await choose(p, 'base', 'Turchese'), await choose(p, 'pattern', 'Fiamme'), await choose(p, 'visor', 'Iridio oro'), await choose(p, 'finish', 'Opaca')];
    await p.fill('[data-helmet-editor] input[data-helmet-number]', '44'); await w(p, 200);
    await tapText(p, 'SALVA IL CASCO', { exact: true }); await w(p, 150);
    const closing = await helmetIn(p, '[data-helmet-editor]');
    const played = await p.evaluate(() => window.__played.slice());
    await w(p, 1600);
    const user = await p.evaluate(() => window.firebase.__fake.doc('users/a@b.it'));
    await p.reload(); await w(p, 600);
    await p.waitForFunction(() => !document.querySelector('[data-splash]'), null, { timeout: 8000 }).catch(() => {});
    await w(p, 800);
    await openProfile(p);
    const after = await helmetIn(p, '[data-profile-avatar]');
    await ctx.close();
    assert(picks.every(Boolean), 'scelte non trovate nell\'editor: ' + JSON.stringify(picks));
    assert(closing && closing.visor === 'closed', 'salvando la visiera non si abbassa: ' + JSON.stringify(closing));
    assert(played.includes('clack'), 'niente clack: ' + JSON.stringify(played));
    const hm = user && user.app2 && user.app2.helmet;
    assert(hm && hm.base === '#27F4D2' && hm.pattern === 'flames' && hm.number === 44 && hm.visor === 'iridium-gold' && hm.finish === 'matte', 'nell\'account: ' + JSON.stringify(hm));
    assert(after && after.pattern === 'flames' && after.finish === 'matte' && after.text.includes('44'), 'dopo il riavvio: ' + JSON.stringify(after));
    assert(!errs.length, errs.join(' | '));
  },

  async 'il casco anche nel tasto del profilo in alto'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    const top0 = await helmetIn(p, '[aria-label="Profilo"]');
    await openProfile(p); await openEditor(p);
    await choose(p, 'pattern', 'Scacchi');
    await tapText(p, 'SALVA IL CASCO', { exact: true }); await w(p, 900);
    await tapSel(p, '[aria-label="Indietro"]'); await w(p, 400);
    const top1 = await helmetIn(p, '[aria-label="Profilo"]');
    await ctx.close();
    assert(top0 && top0.pattern === 'stripes', 'nel tasto in alto manca il casco: ' + JSON.stringify(top0));
    assert(top1 && top1.pattern === 'checks', 'il tasto in alto non mostra il casco nuovo: ' + JSON.stringify(top1));
    assert(!errs.length, errs.join(' | '));
  },
});
