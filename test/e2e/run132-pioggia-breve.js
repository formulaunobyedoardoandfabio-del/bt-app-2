// 21/11 (piano claude/multiviewer-in-sector4.md, "Pioggia a breve" al posto del radar di MultiViewer): in Race → Meteo
// la tabella delle prossime 6 ore sul circuito (MET Norway vero, Circuit of the Americas), con cielo, temperatura,
// vento con la freccia e pioggia, solo nei giorni della gara. Niente probabilità di pioggia: il dato non c'è.
// Uso: node test/build-test.js && node test/e2e/run132-pioggia-breve.js
const { open, w, tapSel, goTab, login, assert, run } = require('./helpers');
const Meteo = require('../../src/services/meteo');
const INFO = require('../../src/data/circuit-info.json');

const json = (status, body) => r => r.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
const OF1_LOCKED = { 'https://api.openf1.org/**': json(401, { detail: 'Live F1 session in progress.' }) };
const METEO_FX = { circuitId: 'us-2012', source: 'MET Norway', ...Meteo.shapeForecast(require('../fixtures/met-cota.json')) };
const routes = { ...OF1_LOCKED, 'https://bt-app-2.vercel.app/api/meteo**': json(200, METEO_FX) };
const meteoTab = async p => { await goTab(p, 'RACE'); await w(p, 600); await tapSel(p, '[data-race-tab="meteo"]'); await w(p, 900); };
const NOW = '2026-10-24T21:30:00Z';

run({
  async 'nel weekend: le prossime 6 ore vere, col vento e la riga della sessione se parte in quelle ore'(b) {
    const { ctx, p, errs } = await open(b, { now: NOW, routes }); await login(p);
    await meteoTab(p);
    const r = await p.evaluate(() => {
      const box = document.querySelector('[data-wx-short]');
      if (!box) return null;
      return {
        hours: [...box.querySelectorAll('[data-wx-hour]')].map(e => e.getAttribute('data-wx-hour')),
        hi: [...box.querySelectorAll('[data-wx-hi]')].map(e => e.getAttribute('data-wx-hi')),
        arrows: box.querySelectorAll('[data-wx-wind] svg').length,
        text: box.innerText.replace(/\s+/g, ' '),
        wide: document.documentElement.scrollWidth,
      };
    });
    await ctx.close();
    const want = Meteo.shortTerm(METEO_FX, INFO['us-2012'].weekend, Date.parse(NOW));
    assert(r, 'manca la tabella "Pioggia a breve"');
    assert(JSON.stringify(r.hours) === JSON.stringify(want.rows.map(h => h.t)), 'le ore vere: ' + r.hours.join(' '));
    assert(r.arrows === want.rows.filter(h => h.to != null).length && r.arrows === 6, 'freccia del vento per ogni ora: ' + r.arrows);
    assert(JSON.stringify(r.hi) === JSON.stringify(want.hi >= 0 ? [want.hiKey] : []), 'riga della sessione: ' + r.hi);
    assert(new RegExp(Math.round(want.rows[0].temp) + '°').test(r.text) && /MET Norway/.test(r.text), 'temperatura e fonte: ' + r.text.slice(0, 160));
    assert(!/%/.test(r.text.replace(/km\/h/g, '')) && !/probabilit/i.test(r.text), 'niente probabilità inventate');
    assert(r.wide <= 390, 'niente scorrimento di lato: ' + r.wide);
    assert(!errs.length, errs.join(' | '));
  },
  async 'lontano dalla gara la tabella non c\'è'(b) {
    const { ctx, p, errs } = await open(b, { now: '2026-10-20T10:00:00Z', routes }); await login(p);
    await meteoTab(p);
    const has = await p.evaluate(() => !!document.querySelector('[data-wx-short]'));
    await ctx.close();
    assert(!has, 'quattro giorni prima della gara niente tabella delle prossime ore');
    assert(!errs.length, errs.join(' | '));
  },
});
