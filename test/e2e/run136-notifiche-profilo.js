// 22/11 (Edoardo): "Collega PC" subito sopra "Codice promo"; scroll fade nel Profilo; promemoria, novità da B&T e avviso
// a metà gara spostati nella pagina Notifiche, che ha la grafica "B&T: Notifiche" (filtri, Oggi/Ieri, vuoto "Tutto
// tranquillo", impostazioni); senza rete nella pagina Notifiche solo SENZA RETE.
// Uso: node test/build-test.js && node test/e2e/run136-notifiche-profilo.js [filtro]
const path = require('path');
const fs = require('fs');
const { open, w, tapSel, tapText, login, assert, run } = require('./helpers');

const SHOTS = path.join(__dirname, '..', 'logs', 'run136');
fs.mkdirSync(SHOTS, { recursive: true });
const NOTIFS = { 'shared/bt-notifs': { __arr: [
  { id: 'n1', title: 'Qualifiche alle 16', text: 'Squadra e pronostici si chiudono al via delle qualifiche.', date: '2026-10-07T08:30:00.000Z' },
  { id: 'n2', title: 'Nuovo video su Instagram', text: 'Il riassunto del GP di Singapore.', date: '2026-10-06T19:10:00.000Z' },
  { id: 'n3', title: 'Benvenuto in Sector 4', text: 'Grazie di essere qui.', date: '2026-10-01T09:00:00.000Z' },
] } };
const rows = p => p.evaluate(() => [...document.querySelectorAll('[data-profile-row]')].map(e => e.getAttribute('data-profile-row')));
const toProfile = async p => { await tapSel(p, '[aria-label="Profilo"]'); await w(p, 600); };

run({
  async 'Profilo: Collega PC sopra Codice promo, niente avvisi del telefono in Personalizza, scroll fade'(b) {
    const { ctx, p, errs } = await open(b, { seed: { pro: true } });
    await login(p); await toProfile(p);
    await tapSel(p, '[data-settings-group][aria-expanded="false"]'); await w(p, 300);
    const list = await rows(p);
    const fade0 = await p.evaluate(() => { const e = document.querySelector('[data-scroll-fade]'); return e && (e.style.maskImage || e.style.webkitMaskImage); });
    await p.evaluate(() => { const e = document.querySelector('[data-scroll-fade]'); e.scrollTop = 600; }); await w(p, 300);
    const fade1 = await p.evaluate(() => {
      const e = document.querySelector('[data-scroll-fade]');
      const shrunk = [...e.querySelectorAll('[data-sf]')].filter(x => /scale\(0\.9/.test(x.style.transform)).length;
      return { mask: e.style.maskImage || e.style.webkitMaskImage, shrunk };
    });
    await p.screenshot({ path: path.join(SHOTS, 'profilo-scroll-390.png') });
    await ctx.close();
    const i = list.indexOf('Collega PC'), j = list.indexOf('Codice promo');
    assert(i >= 0 && j === i + 1, 'Collega PC subito sopra Codice promo: ' + JSON.stringify(list));
    assert(!list.some(x => /Promemoria sul telefono|Novità da B&T|Avviso a metà gara/.test(x)), 'avvisi del telefono non più nel Profilo: ' + JSON.stringify(list));
    assert(/^linear-gradient\(rgb\(0, 0, 0\) 0px/.test(String(fade0)), 'in cima nessuna sfumatura sopra: ' + fade0);
    assert(/^linear-gradient\(rgba\(0, 0, 0, 0\) 0px/.test(String(fade1.mask)) && fade1.shrunk >= 1, 'scorrendo sfuma e le righe al bordo si rimpiccioliscono: ' + JSON.stringify(fade1));
    assert(!errs.length, errs.join(' | '));
  },

  async 'Notifiche: Oggi, Ieri, Prima con i pallini, impostazioni coi 3 avvisi del telefono'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: NOTIFS } });
    await login(p); await w(p, 800);
    await tapSel(p, '[aria-label="Notifiche"]'); await w(p, 800);
    const page = await p.evaluate(() => { const e = document.querySelector('[data-notif-page]'); return e && e.innerText.replace(/\s+/g, ' '); });
    const unread = await p.evaluate(() => document.querySelectorAll('[data-nx-unread]').length);
    await p.screenshot({ path: path.join(SHOTS, 'notifiche-390.png') });
    await tapSel(p, '[data-notif-open-settings]'); await w(p, 400);
    const set = await p.evaluate(() => { const e = document.querySelector('[data-notif-settings]'); return e && { text: e.innerText.replace(/\s+/g, ' '), rows: [...e.querySelectorAll('[data-pref-row]')].map(r => r.getAttribute('data-pref-row')) }; });
    await p.screenshot({ path: path.join(SHOTS, 'notifiche-impostazioni-390.png') });
    await tapSel(p, '[role="switch"][aria-label="Avviso a metà gara"]'); await w(p, 300);
    const half = await p.evaluate(() => document.querySelector('[role="switch"][aria-label="Avviso a metà gara"]').getAttribute('aria-checked'));
    await tapSel(p, '[data-notif-settings] [aria-label="Chiudi"]'); await w(p, 300);
    const back = await p.evaluate(() => !!document.querySelector('[data-notif-page]'));
    await ctx.close();
    assert(page && /Oggi/.test(page) && /Ieri/.test(page) && /Prima/.test(page), 'gruppi per giorno: ' + page);
    assert(page.indexOf('Qualifiche alle 16') < page.indexOf('Nuovo video su Instagram'), 'la più nuova in alto');
    assert(unread === 3, 'tre da leggere: ' + unread);
    assert(set && ['team', 'driver', 'reminders', 'news', 'halfway'].every(k => set.rows.includes(k)), 'impostazioni: ' + JSON.stringify(set && set.rows));
    assert(/Promemoria sul telefono/.test(set.text) && /Novità da B&T sul telefono/.test(set.text) && /Avviso a metà gara/.test(set.text) && /22:00 - 08:00/.test(set.text), 'testi: ' + set.text);
    assert(half === 'false', 'avviso a metà gara spento: ' + half);
    assert(back, 'X torna alle notifiche');
    assert(!errs.length, errs.join(' | '));
  },

  async 'Notifiche vuote: "Tutto tranquillo" porta a "Scegli cosa ricevere"'(b) {
    const { ctx, p, errs } = await open(b, {});
    await login(p); await w(p, 800);
    await tapSel(p, '[aria-label="Notifiche"]'); await w(p, 800);
    const empty = await p.evaluate(() => { const e = document.querySelector('[data-notif-empty]'); return e && e.innerText.replace(/\s+/g, ' '); });
    await p.screenshot({ path: path.join(SHOTS, 'notifiche-vuoto-390.png') });
    await tapSel(p, '[data-notif-choose]'); await w(p, 400);
    const set = await p.evaluate(() => !!document.querySelector('[data-notif-settings]'));
    await ctx.close();
    assert(empty && /Tutto tranquillo/.test(empty), 'vuoto: ' + empty);
    assert(set, 'apre le impostazioni');
    assert(!errs.length, errs.join(' | '));
  },

  // 22/11 (Edoardo: "fai diventare questa la sezione profilo (anche quella visibile agli altri)", "B&T: Profilo pubblico")
  async 'Profilo pubblico: grafica nuova; Modifica nasconde agli altri e si salva nell\'account'(b) {
    const { ctx, p, errs } = await open(b);
    await login(p); await toProfile(p);
    await tapText(p, 'Profilo pubblico'); await w(p, 500);
    const pub = await p.evaluate(() => { const e = document.querySelector('[data-profile-public]'); return e && { text: e.innerText.replace(/\s+/g, ' '), favs: [...e.querySelectorAll('[data-pub-fav]')].map(x => x.getAttribute('data-pub-fav')), name: (e.querySelector('[data-pub-name]') || {}).textContent }; });
    await p.screenshot({ path: path.join(SHOTS, 'profilo-pubblico-390.png') });
    await tapSel(p, '[data-pub-edit]'); await w(p, 400);
    const rowsE = await p.evaluate(() => [...document.querySelectorAll('[data-pub-row]')].map(e => e.getAttribute('data-pub-row')));
    await tapSel(p, '[role="switch"][aria-label="Scuderia del cuore: visibile agli altri"]'); await w(p, 200);
    await p.screenshot({ path: path.join(SHOTS, 'profilo-modifica-390.png') });
    await tapSel(p, '[data-pub-save]'); await w(p, 1800);
    const saved = await p.evaluate(() => { const u = window.firebase.__fake.doc('users/a@b.it'); return u && u.app2 ? u.app2.pubHide : null; });
    const back = await p.evaluate(() => !!document.querySelector('[data-profile-public]'));
    await ctx.close();
    assert(pub && pub.name === 'Tester' && pub.favs.join() === 'team,driver', 'pagina pubblica: ' + JSON.stringify(pub));
    assert(/Così ti vedono gli altri/.test(pub.text) && /Segue F1/.test(pub.text) && /Tipo fan/.test(pub.text) && /Solo tu/.test(pub.text) && /Non lo vede nessuno/.test(pub.text), 'testi: ' + pub.text);
    assert(['follow', 'fan', 'team', 'driver', 'birth'].every(k => rowsE.includes(k)), 'righe di Modifica profilo: ' + JSON.stringify(rowsE));
    assert(saved && saved.team === true, 'scuderia nascosta nell\'account: ' + JSON.stringify(saved));
    assert(back, 'Salva torna al Profilo pubblico');
    assert(!errs.length, errs.join(' | '));
  },

  async 'Notifiche senza rete: solo la schermata SENZA RETE'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: NOTIFS } });
    await login(p); await w(p, 800);
    await tapSel(p, '[aria-label="Notifiche"]'); await w(p, 600);
    await ctx.setOffline(true);
    await p.evaluate(() => window.dispatchEvent(new Event('offline'))); await w(p, 800);
    const off = await p.evaluate(() => ({ off: !!document.querySelector('[data-offline-mode]'), list: !!document.querySelector('[data-notif-page]'), text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 200) }));
    await p.screenshot({ path: path.join(SHOTS, 'notifiche-senza-rete-390.png') });
    await ctx.setOffline(false);
    await p.evaluate(() => window.dispatchEvent(new Event('online'))); await w(p, 1200);
    const on = await p.evaluate(() => !!document.querySelector('[data-notif-page]'));
    await ctx.close();
    assert(off.off && !off.list && /SENZA RETE/.test(off.text), 'senza rete solo SENZA RETE: ' + JSON.stringify(off));
    assert(on, 'tornata la rete tornano le notifiche');
    assert(!errs.filter(e => !/net::|Failed to fetch|offline/i.test(e)).length, errs.join(' | '));
  },
});
