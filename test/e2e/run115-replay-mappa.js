// 15/11 (Edoardo: "devi copiare quel sito ... da mettere nella sezione replay delle gare quando sono finite (nel nuovo
// bottone)"). "Riguarda la gara" apre il replay sulla mappa quando il sito ha il file della gara
// (public/data/replay, tools/openf1_replay.py, da OpenF1): tracciato con le auto che si muovono, classifica con gomme e
// distacchi, barra del tempo. Senza file resta il giro per giro. Qui il file è quello vero di São Paulo 2026.
// Uso: node test/build-test.js && node test/e2e/run115-replay-mappa.js
const fs = require('fs');
const path = require('path');
const { open, w, tapSel, login, assert, run } = require('./helpers');

const REAL = fs.readFileSync(path.join(__dirname, '../../public/data/replay/11412.json'), 'utf8');
const RACE = { round: 21, name: 'GP di San Paolo', place: 'São Paulo', date: '2025-11-09', circuitId: 'br-1940', laps: 3, drivers: {
  NOR: { team: 'mclaren', pos: 1, n: 3, t: [80000, 80000, 80000] }, VER: { team: 'redbull', pos: 2, n: 3, t: [80500, 80000, 80000] } } };
const json = body => r => r.fulfill({ status: 200, contentType: 'application/json', body: typeof body === 'string' ? body : JSON.stringify(body) });
const ARCH = {
  'https://bt-app-2.vercel.app/data/archivio/index.json': json({ years: [{ year: 2025, races: 1, h: 'a' }] }),
  'https://bt-app-2.vercel.app/data/archivio/2025.json*': json({ year: 2025, races: [RACE] }),
};
const WITH_REPLAY = { ...ARCH,
  'https://bt-app-2.vercel.app/data/replay/index.json': json({ races: [{ key: 11412, year: 2025, date: '2025-11-09', name: 'GP di San Paolo', h: 'z' }] }),
  'https://bt-app-2.vercel.app/data/replay/11412.json*': json(REAL),
};
async function toDetail(p) {
  await tapSel(p, '[data-archive-open]'); await w(p, 800);
  await tapSel(p, '[data-archive-year="2025"]'); await w(p, 700);
  await tapSel(p, '[data-archive-race="2025-21"]'); await w(p, 700);
}
const seek = (p, v) => p.evaluate(v => { const s = document.querySelector('[data-map-slider]'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(s, String(v)); s.dispatchEvent(new Event('input', { bubbles: true })); }, v);
const look = p => p.evaluate(() => ({
  on: !!document.querySelector('[data-map-replay]'),
  track: !!document.querySelector('[data-map-track]'),
  cars: document.querySelectorAll('[data-car]').length,
  carT: (document.querySelector('[data-car="NOR"]') || { getAttribute: () => '' }).getAttribute('transform'),
  lap: (document.querySelector('[data-map-lap]') || {}).textContent || '',
  rows: [...document.querySelectorAll('[data-tower-row]')].sort((a, b) => +a.getAttribute('data-pos') - +b.getAttribute('data-pos')).map(e => e.getAttribute('data-tower-row')),
  second: ((document.querySelector('[data-tower-row][data-pos="2"]') || {}).innerText || '').replace(/\s+/g, ' '),
  norTyre: (document.querySelector('[data-tower-row="NOR"] [data-tyre]') || {}).textContent || '',
}));

run({
  async 'Riguarda la gara: mappa con le auto, classifica con gomme e distacchi, barra del tempo (dati veri di São Paulo)'(b) {
    const { ctx, p, errs } = await open(b, { seed: { pro: true }, routes: WITH_REPLAY });
    await login(p); await w(p, 800);
    await toDetail(p);
    const label = await p.evaluate(() => (document.querySelector('[data-replay-open]') || {}).textContent || '');
    await tapSel(p, '[data-replay-open]'); await w(p, 1500);
    const a = await look(p);
    await seek(p, 60); await w(p, 300);
    const a2 = await look(p);
    await tapSel(p, '[data-map-play]'); await w(p, 1500);
    const b2 = await look(p);
    await tapSel(p, '[data-map-play]');
    await seek(p, 2400); await w(p, 600);
    const c = await look(p);
    await tapSel(p, '[data-tower-row="HAD"]'); await w(p, 300);
    const sel = await p.evaluate(() => ({ row: (document.querySelector('[data-tower-row="HAD"]') || {}).ariaPressed, car: !!document.querySelector('[data-car="HAD"][data-selected]') }));
    await seek(p, 99999); await w(p, 600);
    const d = await look(p);
    await tapSel(p, '[aria-label="Indietro"]'); await w(p, 500);
    const back = await p.evaluate(() => !!document.querySelector('[data-archive-detail]') && !!document.querySelector('[data-replay-laps]'));
    await ctx.close();
    assert(/mappa/i.test(label), 'il bottone dice che c\'è la mappa: ' + label);
    assert(a.on && a.track && a.cars === 22 && a.rows.length === 22, 'mappa, tracciato, 22 auto e 22 righe: ' + JSON.stringify({ on: a.on, track: a.track, cars: a.cars, rows: a.rows.length }));
    assert(/GRIGLIA|GIRO 1\/71/.test(a.lap), 'si parte dalla griglia: ' + a.lap);
    assert(b2.carT && b2.carT !== a2.carT, 'play (un minuto dopo il via): le auto si muovono: ' + a2.carT + ' → ' + b2.carT);
    assert(/GIRO (2[89]|30)\/71/.test(c.lap), 'a 40 minuti circa giro 29: ' + c.lap);
    assert(c.rows[0] === 'NOR' && c.norTyre === 'S', 'davanti NOR con le Soft: ' + c.rows.slice(0, 3) + ' ' + c.norTyre);
    assert(/HAD/.test(c.second) && /\+4,\d/.test(c.second), 'secondo HAD a circa 4 secondi: ' + c.second);
    assert(sel.row === 'true' && sel.car, 'tocchi un pilota: evidenziato in classifica e sulla mappa');
    assert(d.rows[0] === 'NOR' && /SCACCHI/.test(d.lap), 'fine: bandiera a scacchi, vince NOR: ' + d.lap + ' ' + d.rows[0]);
    assert(back, 'Indietro: si torna alla gara, con anche il giro per giro');
    assert(!errs.length, errs.join(' | '));
  },

  async 'senza il file della gara resta il giro per giro; file che non arriva: lo dice e offre il giro per giro'(b) {
    const { ctx, p, errs } = await open(b, { seed: { pro: true }, routes: ARCH });
    await login(p); await w(p, 800);
    await toDetail(p);
    const label = await p.evaluate(() => (document.querySelector('[data-replay-open]') || {}).textContent || '');
    await tapSel(p, '[data-replay-open]'); await w(p, 600);
    const laps = await p.evaluate(() => !!document.querySelector('[data-race-replay]') && !document.querySelector('[data-map-replay]'));
    await ctx.close();
    const two = await open(b, { seed: { pro: true }, routes: { ...ARCH, 'https://bt-app-2.vercel.app/data/replay/index.json': WITH_REPLAY['https://bt-app-2.vercel.app/data/replay/index.json'] } });
    await login(two.p); await w(two.p, 800);
    await toDetail(two.p);
    await tapSel(two.p, '[data-replay-open]'); await w(two.p, 1500);
    const miss = await two.p.evaluate(() => document.body.innerText);
    await tapSel(two.p, '[data-replay-fallback]'); await w(two.p, 600);
    const fb = await two.p.evaluate(() => !!document.querySelector('[data-race-replay]'));
    await two.ctx.close();
    assert(!/mappa/i.test(label) && laps, 'senza file: bottone normale e giro per giro');
    assert(/replay sulla mappa non è arrivato/i.test(miss), 'file che non arriva: lo dice');
    assert(fb, 'e si può guardare il giro per giro');
    assert(!errs.length && !two.errs.length, errs.concat(two.errs).join(' | '));
  },
});
