// Easter egg nuovi (1/11, design docs/design/pit-swipe.html): Donuts, Limiti della pista, Pioggia vera, Launch control,
// Radio in chat, Il muretto risponde; con tutti e sei il trofeo segreto "Ingegnere di pista".
// Uso: node test/build-test.js && node test/e2e/run84-easter.js [filtro]
const { open, w, norm, inner, has, tapText, tapSel, goTab, login, openAdmin, assert, run } = require('./helpers');

const art = (id, date) => ({ id, title: 'Notizia ' + id, summary: 'Riassunto ' + id, category: 'GARA', author: 'Team B&T', image: '', published: true, date, content: 'Testo ' + id });
const NEWS = { 'shared/bt-news': { __arr: ['n1', 'n2', 'n3', 'n4', 'n5', 'n6'].map((id, i) => art(id, `2026-10-0${7 - i}T09:00:00Z`)) } };
const user = swipe => ({ 'users/a@b.it': { name: 'Tester', email: 'a@b.it', about: { birth: 1999, follow: 2, fan: 'vivo', years: 5 }, app2: { favDriver: 'leclerc', swipe } } });
const doc = (p, path) => p.evaluate(x => window.firebase.__fake.doc(x), path);
const eggs = async p => { await w(p, 1100); const d = await doc(p, 'users/a@b.it'); return (d && d.app2 && d.app2.swipe && d.app2.swipe.eggs) || []; };
const toast = p => p.evaluate(() => { const t = document.querySelector('.toast'); return t ? t.innerText : ''; });
const openPs = async p => { await tapSel(p, '[data-pitswipe-card]'); await w(p, 500); };
const cardBox = async p => (await p.$('[data-ps-card]')).boundingBox();

run({
  async 'Donuts: girando una carta col dito in tondo fa due giri col fumo'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: { ...NEWS, ...user({}) } } }); await login(p); await w(p, 800);
    await openPs(p);
    const bx = await cardBox(p), cx = bx.x + bx.width / 2, cy = bx.y + bx.height / 2, r = 70;
    await p.mouse.move(cx + r, cy); await p.mouse.down();
    for (let k = 1; k <= 48; k++) { const a = k / 48 * 2.2 * 2 * Math.PI; await p.mouse.move(cx + r * Math.cos(a), cy + r * Math.sin(a)); }
    const spin = await has(p, '[data-ps-card].ps-donut');
    await p.mouse.up();
    const t = await toast(p), e = await eggs(p);
    await ctx.close();
    assert(spin, 'la carta deve fare i donuts');
    assert(/Easter egg trovato: Donuts \(1\/6\)/.test(t), 'avviso: ' + t);
    assert(e.includes('donuts'), 'salvato nei dati: ' + JSON.stringify(e));
    assert(!errs.length, errs.join(' | '));
  },

  async 'Limiti della pista: la carta lanciata troppo forte torna indietro'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: { ...NEWS, ...user({}) } } }); await login(p); await w(p, 800);
    await openPs(p);
    const before = await p.evaluate(() => document.querySelector('[data-ps-card]').getAttribute('data-id'));
    const bx = await cardBox(p), x0 = bx.x + bx.width / 2, y = bx.y + bx.height / 2;
    await p.mouse.move(x0, y); await p.mouse.down(); await p.mouse.move(x0 + 300, y, { steps: 2 }); await p.mouse.up();
    await w(p, 200);
    const warn = norm(await inner(p, '[data-ps-warn]'));
    await w(p, 400);
    const after = await p.evaluate(() => document.querySelector('[data-ps-card]').getAttribute('data-id'));
    const e = await eggs(p);
    await ctx.close();
    assert(/Limiti della pista/.test(warn), 'avviso dei limiti: ' + warn);
    assert(after === before, 'la carta resta in pista');
    assert(e.includes('limiti'), JSON.stringify(e));
    assert(!errs.length, errs.join(' | '));
  },

  async 'Pioggia vera: nel weekend, se il meteo vero dice pioggia adesso, gocce e tergicristallo; con il sole niente'(b) {
    const meteo = rain => ({ 'https://bt-app-2.vercel.app/api/meteo**': r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({ updated: '2026-10-10T11:00:00Z', hours: [{ t: '2026-10-10T12:00:00Z', step: 1, temp: 28, wind: 10, hum: 80, rain: rain ? 2.1 : 0, sym: rain ? 'rain' : 'clearsky_day' }] }) }) });
    const one = async rain => {
      const { ctx, p, errs } = await open(b, { now: '2026-10-10T12:20:00Z', seed: { addDocs: { ...NEWS, ...user({}) } }, routes: meteo(rain) }); await login(p); await w(p, 800);
      await openPs(p); await w(p, 1200);
      const on = await has(p, '[data-ps-rain]'), e = await eggs(p);
      await ctx.close();
      return { on, e, errs };
    };
    const wet = await one(true), dry = await one(false);
    assert(wet.on && wet.e.includes('pioggia'), 'pioggia sulle carte: ' + JSON.stringify(wet));
    assert(!dry.on && !dry.e.includes('pioggia'), 'col sole niente pioggia: ' + JSON.stringify(dry));
    assert(!wet.errs.length && !dry.errs.length, wet.errs.concat(dry.errs).join(' | '));
  },

  async 'Launch control: logo premuto 3 secondi = partenza; lasciato prima = anti-stallo'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: { ...NEWS, ...user({}) } } }); await login(p); await w(p, 800);
    const lb = await (await p.$('[data-logo]')).boundingBox(), x = lb.x + lb.width / 2, y = lb.y + lb.height / 2;
    await p.mouse.move(x, y); await p.mouse.down(); await w(p, 1100); await p.mouse.up(); await w(p, 200);
    const stall = await toast(p);
    await w(p, 2600);
    await p.mouse.down(); await w(p, 1500);
    const charging = await p.evaluate(() => { const e = document.querySelector('[data-launch]'); return e ? e.getAttribute('data-launch') : null; });
    await w(p, 1800);
    const ready = await p.evaluate(() => { const e = document.querySelector('[data-launch]'); return e ? e.getAttribute('data-launch') : null; });
    await p.mouse.up(); await w(p, 100);
    const zoom = await has(p, '.ps-launch-zoom');
    const e = await eggs(p), egg3 = await p.evaluate(() => document.querySelector('[data-logo-img]').getAttribute('data-mode'));
    await ctx.close();
    assert(/Anti-stallo/.test(stall), 'lasciato dopo un secondo: ' + stall);
    assert(charging === 'charging' && ready === 'ready', 'LED che si accendono: ' + charging + ' → ' + ready);
    assert(zoom && e.includes('launch'), 'partenza: ' + JSON.stringify({ zoom, e }));
    assert(egg3 === 'idle', 'la pressione lunga non conta come tocco sul logo');
    assert(!errs.length, errs.join(' | '));
  },

  async 'Radio in chat: "box box" esce come una radio del box'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: { ...NEWS, ...user({}) } } }); await login(p); await w(p, 800);
    await goTab(p, 'RACE'); await tapSel(p, '[data-race-chat]'); await w(p, 500); await tapText(p, 'Chat Generale'); await w(p, 600);
    await p.fill('input[placeholder="Scrivi un messaggio…"]', 'Box box!'); await w(p, 100); await tapSel(p, '[aria-label="Invia"]'); await w(p, 1200);
    const radio = await p.evaluate(() => { const e = [...document.querySelectorAll('[data-radio-msg]')].pop(); return e ? e.innerText.replace(/\s+/g, ' ') : null; });
    const e = await eggs(p);
    await ctx.close();
    assert(radio && /TEAM RADIO/.test(radio) && /Box box!/.test(radio), 'messaggio radio: ' + radio);
    assert(e.includes('radio'), JSON.stringify(e));
    assert(!errs.length, errs.join(' | '));
  },

  async 'Il muretto risponde: 5 tocchi sulla mini Pit Board (prova DEMO dell\'admin)'(b) {
    const five = ['donuts', 'limiti', 'pioggia', 'launch', 'radio'];
    const { ctx, p, errs } = await open(b, { seed: { admin: true, addDocs: { ...NEWS, ...user({ eggs: five }) } } }); await login(p); await w(p, 800);
    await openAdmin(p, 'GARA LIVE'); await tapText(p, 'AVVIA GARA', { exact: true }); await w(p, 300);
    await tapSel(p, '[aria-label="Indietro"]'); await w(p); await tapSel(p, '[aria-label="Indietro"]'); await w(p);
    await goTab(p, 'HOME'); await w(p, 400);
    for (let k = 0; k < 5; k++) { await p.click('[data-mini-pit] button[data-mini-pit-open], [data-mini-pit-flip]'); await w(p, 90); }
    await w(p, 200);
    const flip = await p.evaluate(() => { const e = document.querySelector('[data-mini-pit-flip]'); return e ? e.innerText : null; });
    const onRace = await has(p, '[data-race-tab]');
    const e = await eggs(p);
    await ctx.close();
    assert(flip === 'PUSH PUSH' || flip === 'BOX', 'il muretto risponde: ' + flip);
    assert(!onRace, 'i 5 tocchi non devono aprire la Race');
    assert(e.length === 6 && e.includes('muretto'), JSON.stringify(e));
    assert(!errs.length, errs.join(' | '));
  },

  // L'admin ha già tutti i trofei: qui un tifoso con 5 easter egg trova il sesto (la radio in chat).
  async 'trovato il sesto easter egg arriva il trofeo segreto "Ingegnere di pista"'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: { ...NEWS, ...user({ eggs: ['donuts', 'limiti', 'pioggia', 'launch', 'muretto'] }) } } }); await login(p); await w(p, 5200);
    await goTab(p, 'RACE'); await tapSel(p, '[data-race-chat]'); await w(p, 500); await tapText(p, 'Chat Generale'); await w(p, 600);
    await p.fill('input[placeholder="Scrivi un messaggio…"]', 'box box'); await w(p, 100); await tapSel(p, '[aria-label="Invia"]'); await w(p, 900);
    await w(p, 1000);
    const tr = ((await doc(p, 'users/a@b.it')).app2 || {}).trophies || {};
    await ctx.close();
    assert(tr.ingegnere, 'trofeo segreto Ingegnere di pista: ' + JSON.stringify(Object.keys(tr)));
    assert(!errs.length, errs.join(' | '));
  },
});
