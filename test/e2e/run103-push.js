// 13/11 (Edoardo: "le notifiche che scrivo io nell'app non appaiono nella schermata di blocco"): le notifiche del team
// ora partono davvero (Firebase Cloud Messaging). Qui col plugin finto e api/push finta: il telefono si iscrive al tema,
// l'interruttore del Profilo lo toglie, e quando l'admin scrive una notifica la sua app chiama il server e dice l'esito.
// Il server vero è provato in test/unit/push-api.test.js. Uso: node test/build-test.js && node test/e2e/run103-push.js
const { open, w, tapSel, tapText, login, openAdmin, assert, run } = require('./helpers');

const capPush = () => {
  window.__push = [];
  window.Capacitor = { isNativePlatform: () => false, getPlatform: () => 'web', Plugins: {
    FirebaseMessaging: {
      createChannel: c => { window.__push.push('channel:' + c.id + ':' + c.importance); return Promise.resolve(); },
      subscribeToTopic: o => { window.__push.push('sub:' + o.topic); return Promise.resolve(); },
      unsubscribeFromTopic: o => { window.__push.push('unsub:' + o.topic); return Promise.resolve(); },
    },
    LocalNotifications: { checkPermissions: () => Promise.resolve({ display: 'granted' }), requestPermissions: () => { window.__push.push('ask'); return Promise.resolve({ display: 'granted' }); }, cancel: () => Promise.resolve(), schedule: () => Promise.resolve() },
  } };
};
const toast = p => p.evaluate(() => { const e = document.querySelector('[role="status"][data-toast], [data-toast]'); return e ? e.textContent : ''; });

run({
  async 'telefono: si iscrive da solo al tema delle novità (canale ad alta importanza); dal Profilo si spegne e si riaccende'(b) {
    const { ctx, p, errs } = await open(b, { init: capPush }); await login(p); await w(p, 600);
    const start = await p.evaluate(() => window.__push.slice());
    await tapSel(p, '[aria-label="Profilo"]'); await w(p, 400);
    await tapSel(p, '[data-settings-group][aria-expanded="false"]').catch(() => {}); await w(p, 300);
    const SW = '[role="switch"][aria-label^="Novità da B&T sul telefono"]';
    await tapSel(p, SW); await w(p, 400);
    const off = await p.evaluate(() => window.__push.slice());
    await tapSel(p, SW); await w(p, 400);
    const on = await p.evaluate(() => window.__push.slice());
    await ctx.close();
    assert(start.includes('channel:bt-novita:4') && start.includes('sub:novita'), 'iscrizione all\'avvio: ' + JSON.stringify(start));
    assert(off[off.length - 1] === 'unsub:novita', 'spento dal Profilo: ' + JSON.stringify(off));
    assert(on.includes('ask') && on[on.length - 1] === 'sub:novita', 'riacceso: chiede il permesso e si riscrive: ' + JSON.stringify(on));
    assert(!errs.length, errs.join(' | '));
  },

  async 'admin: scrive una notifica, l\'app chiama api/push (senza testi) e dice che è partita ai telefoni'(b) {
    const calls = [];
    const routes = { '**/api/push': r => { calls.push({ method: r.request().method(), body: r.request().postData() }); return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ ok: true, sent: 1, skipped: 0 }) }); } };
    const { ctx, p, errs } = await open(b, { seed: { admin: true }, routes }); await login(p); await openAdmin(p, 'NOTIFICHE');
    await p.fill('[aria-label="Titolo notifica"]', 'Qualifiche tra un\'ora');
    await p.fill('[aria-label="Testo notifica"]', 'Hai fatto il pronostico?');
    await tapText(p, 'INVIA NOTIFICA ORA'); await w(p, 900);
    const body = await p.evaluate(() => document.body.innerText);
    const saved = await p.evaluate(() => { const d = window.firebase.__fake.doc('shared/bt-notifs'); return d && d.__arr ? d.__arr.map(n => n.title) : []; });
    await ctx.close();
    const posts = calls.filter(c => c.method === 'POST');
    assert(saved.includes('Qualifiche tra un\'ora'), 'salvata su Firebase (campanella): ' + JSON.stringify(saved));
    assert(posts.length === 1 && !posts[0].body, 'una chiamata al server, senza testi: ' + JSON.stringify(calls));
    assert(/Notifica mandata anche ai telefoni/.test(body), 'l\'admin vede l\'esito: ' + body.slice(-200));
    assert(!errs.length, errs.join(' | '));
  },

  async 'admin: se su Vercel manca l\'account di servizio la notifica resta nella campanella e l\'admin sa perché'(b) {
    const routes = { '**/api/push': r => r.fulfill({ status: 503, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ ok: false, reason: 'config' }) }) };
    const { ctx, p, errs } = await open(b, { seed: { admin: true }, routes }); await login(p); await openAdmin(p, 'NOTIFICHE');
    await p.fill('[aria-label="Titolo notifica"]', 'Prova');
    await p.fill('[aria-label="Testo notifica"]', 'Testo di prova');
    await tapText(p, 'INVIA NOTIFICA ORA'); await w(p, 900);
    const body = await p.evaluate(() => document.body.innerText);
    await ctx.close();
    assert(/Salvata nella campanella/.test(body) && /FIREBASE_SERVICE_ACCOUNT/.test(body), 'motivo per l\'admin: ' + body.slice(-260));
    assert(!errs.filter(e => !/503/.test(e)).length, errs.join(' | '));
  },
});
