// 7/11 sera (Edoardo): se piove al circuito, gocce a vetro liquido sullo schermo (al massimo 15, da zero all'apertura,
// in un punto a caso, dopo qualche secondo scivolano giù). Meteo finto: MET Norway (api/meteo) dice pioggia adesso a
// Interlagos, nel weekend del GP del Brasile. Più le altre cose della sera: Home senza Pit Lane e gomme, contagiri
// intero durante l'aggiornamento, fuoco sulla prima notizia tornando in cima, team radio automatiche.
// Uso: node test/build-test.js && node test/e2e/run91-pioggia.js [filtro]
const { open, w, has, login, assert, run } = require('./helpers');

// 8/11 (Edoardo): gocce solo con qualifica o gara in corso. NOW = durante le qualifiche del Brasile (18:00 UTC).
const NOW = '2026-11-07T18:20:00Z';
const BEFORE_Q = '2026-11-07T17:10:00Z';   // sabato, prima delle qualifiche: anche se piove niente gocce
const meteo = rain => ({
  'https://bt-app-2.vercel.app/api/meteo**': route => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ updated: '2026-11-07T16:00:00Z', hours: [16, 17, 18, 19].map(h => ({ t: `2026-11-07T${h}:00:00Z`, step: 1, temp: 21, wind: 12, hum: 88, rain: rain ? 1.4 : 0, sym: rain ? 'rain' : 'cloudy' })) }) }),
});
const rain = p => p.evaluate(() => { const r = document.querySelector('[data-rain]'); return r ? { on: r.getAttribute('data-rain'), n: r.querySelectorAll('[data-rain-drop]').length } : null; });

run({
  async 'piove al circuito: si parte da zero, poi le gocce arrivano una alla volta, mai più di 15'(b) {
    const { ctx, p, errs } = await open(b, { now: NOW, routes: meteo(true) }); await login(p);
    const first = await rain(p);
    let most = 0;
    for (let i = 0; i < 14; i++) { await w(p, 1000); const r = await rain(p); most = Math.max(most, r ? r.n : 0); }
    const looks = await p.evaluate(() => { const d = document.querySelector('[data-rain-drop]'); if (!d) return null; const cs = getComputedStyle(d); const r = d.getBoundingClientRect(); return { w: r.width, bf: cs.backdropFilter, anim: cs.animationName, pe: getComputedStyle(d.parentElement).pointerEvents }; });
    await p.screenshot({ path: '/tmp/bt/shots/pioggia.png' });
    await ctx.close();
    assert(first && first.on === 'on' && first.n <= 1, 'all\'apertura niente gocce (o la prima): ' + JSON.stringify(first));
    assert(most >= 4 && most <= 15, 'gocce viste al massimo: ' + most);
    assert(looks && looks.w <= 22 && /url\(/.test(looks.bf) && /rain-in/.test(looks.anim) && /rain-fall/.test(looks.anim) && looks.pe === 'none', 'goccia: ' + JSON.stringify(looks));
    assert(!errs.length, errs.join(' | '));
  },

  async 'senza pioggia (o fuori dal weekend) niente gocce'(b) {
    const dry = await open(b, { now: NOW, routes: meteo(false) }); await login(dry.p); await w(dry.p, 3500);
    const a = await rain(dry.p); await dry.ctx.close();
    const off = await open(b, { routes: meteo(true) }); await login(off.p); await w(off.p, 3500);   // 7/10: niente weekend
    const c = await rain(off.p); await off.ctx.close();
    assert(a && a.on === 'off' && a.n === 0, 'senza pioggia: ' + JSON.stringify(a));
    assert(c && c.on === 'off' && c.n === 0, 'fuori dal weekend: ' + JSON.stringify(c));
    assert(!dry.errs.length && !off.errs.length, dry.errs.concat(off.errs).join(' | '));
  },

  async 'piove ma non c\'è qualifica né gara in corso: niente gocce'(b) {
    const { ctx, p, errs } = await open(b, { now: BEFORE_Q, routes: meteo(true) }); await login(p); await w(p, 3500);
    const r = await rain(p); await ctx.close();
    assert(r && r.on === 'off' && r.n === 0, 'prima delle qualifiche: ' + JSON.stringify(r));
    assert(!errs.length, errs.join(' | '));
  },
  async 'con "Rimuovi animazioni" niente gocce'(b) {
    const { ctx, p, errs } = await open(b, { now: NOW, routes: meteo(true), reducedMotion: 'reduce' }); await login(p); await w(p, 3500);
    const r = await rain(p); await ctx.close();
    assert(r && r.n === 0, 'gocce con "Rimuovi animazioni": ' + JSON.stringify(r));
    assert(!errs.length, errs.join(' | '));
  },

  async 'Home: tornando in cima dopo essere scesi in fondo, la prima notizia è di nuovo accesa (non buia)'(b) {
    const art = (id, d) => ({ id, title: 'Notizia ' + id, summary: 'Riassunto ' + id, category: 'NEWS', author: 'Team B&T', image: '', published: true, date: d, content: 'Testo ' + id });
    const news = { 'shared/bt-news': { __arr: [1, 2, 3, 4, 5, 6, 7, 8].map(i => art('n' + i, `2026-10-0${i > 7 ? 7 : i}T0${i}:00:00`)) } };
    const { ctx, p, errs } = await open(b, { seed: { addDocs: news } }); await login(p); await w(p, 500);
    const lit = () => p.evaluate(() => { const c = document.querySelector('.news-center'); const f = c && c.querySelector('[data-featured], [data-news-item]'); return f ? (f.getAttribute('data-featured') || f.getAttribute('data-news-item')) : null; });
    const firstId = await p.evaluate(() => { const f = document.querySelector('[data-featured], [data-news-item]'); return f.getAttribute('data-featured') || f.getAttribute('data-news-item'); });
    await p.evaluate(() => { const h = document.querySelector('[data-home]'); h.scrollTop = h.scrollHeight; }); await w(p, 700);
    const bottom = await lit();
    await p.evaluate(() => { const h = document.querySelector('[data-home]'); h.scrollTop = 0; }); await w(p, 700);
    const top = await lit();
    await ctx.close();
    assert(bottom && bottom !== firstId, 'in fondo accesa una notizia in basso: ' + bottom);
    assert(top === firstId, 'tornati in cima la prima notizia è spenta (accesa: ' + top + ', prima: ' + firstId + ')');
    assert(!errs.length, errs.join(' | '));
  },

  async 'riassunto lungo tagliato a metà parola: in Home i tre puntini dopo l\'ultima parola intera'(b) {
    const long = 'Pole di Leclerc a Interlagos '.repeat(6).slice(0, 140);   // come le notizie salvate prima del 7/11: finisce con "Interl"
    const news = { 'shared/bt-news': { __arr: [{ id: 'lungo', title: 'Pole a Interlagos', summary: long, category: 'NEWS', author: 'Team B&T', image: '', published: true, date: '2026-10-07T09:00:00', content: 'Testo' }] } };
    const { ctx, p, errs } = await open(b, { seed: { addDocs: news } }); await login(p); await w(p, 400);
    const shown = await p.evaluate(() => { const f = document.querySelector('[data-featured="lungo"] p'); return f ? f.textContent : null; });
    await ctx.close();
    assert(long.length === 140 && /Interl$/.test(long), 'riassunto di prova: ' + long);
    assert(shown && shown.endsWith('Leclerc a…') && !/Interl…/.test(shown), 'anteprima: ' + shown);
    assert(!errs.length, errs.join(' | '));
  },

  async 'tira per aggiornare: durante l\'aggiornamento il contagiri si vede intero'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await w(p, 400);
    await p.evaluate(() => { window.__btFake = window.firebase && window.firebase.__fake; if (window.__btFake) window.__btFake.holdReads = true; });
    await p.mouse.move(195, 300); await p.mouse.down();
    for (let i = 1; i <= 12; i++) { await p.mouse.move(195, 300 + i * 22); await w(p, 16); }
    await p.mouse.up(); await w(p, 120);
    const g = await p.evaluate(() => { const r = document.querySelector('[data-rev]'), s = r && r.querySelector('svg'), h = document.querySelector('[data-home]'); if (!s) return null; const a = s.getBoundingClientRect(), c = h.getBoundingClientRect(); return { top: a.top - c.top, text: r.innerText }; });
    await p.evaluate(() => { if (window.__btFake) window.__btFake.holdReads = false; });
    await ctx.close();
    assert(g && /Aggiornamento/.test(g.text), 'niente aggiornamento in corso: ' + JSON.stringify(g));
    assert(g.top >= 0, 'la cima del contagiri è tagliata: ' + JSON.stringify(g));
    assert(!errs.length, errs.join(' | '));
  },
});
