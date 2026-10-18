// Tappa 3, Task 19 (G31): trofei. Si vincono con quello che si fa davvero nell'app (dati veri dell'account e dei
// documenti condivisi); il trofeo vinto si salva nell'account (app2.trophies: { id: data in ms }) con l'avviso
// "Trofeo sbloccato: <nome>", il suono della Shift Light e la vibrazione. Medaglia di bronzo da 1 trofeo, d'argento
// da 5, d'oro da 10: nel Profilo e accanto al nome nei messaggi della chat (viaggia con il messaggio). Bacheca nel
// Profilo: casco, medaglia, "N di 15 trofei", vinti con la data, da vincere con cosa serve e quanto manca.
// Uso: node test/build-test.js && node test/e2e/run68-trofei.js [filtro]
const { open, w, text, tapText, tapSel, goTab, login, assert, run } = require('./helpers');
const { authorId } = require('../../src/services/compat');

const DAY = Date.parse('2026-10-12T10:00:00Z');
const USER = app2 => ({ 'users/a@b.it': { name: 'Tester', nick: 'Tester', email: 'a@b.it', about: { birth: null, follow: 2, fan: 'vivo' }, app2 } });
const spyFx = p => p.evaluate(() => {
  const fx = window.__btFx; window.__played = []; window.__buzzed = [];
  const play = fx.play, buzz = fx.buzz;
  fx.play = n => { window.__played.push(n); return play(n); };
  fx.buzz = n => { window.__buzzed.push(n); return buzz(n); };
});
const notice = p => p.evaluate(() => { const e = document.querySelector('[data-trophy-notice]'); return e ? { ids: e.getAttribute('data-trophy-notice'), label: e.getAttribute('aria-label'), text: e.innerText.replace(/\s+/g, ' ').trim(), pe: getComputedStyle(e).pointerEvents } : null; });
const doc = (p, path) => p.evaluate(x => window.firebase.__fake.doc(x), path);
const openProfile = async p => { await tapSel(p, '[aria-label="Profilo"]'); await w(p, 500); };
const openRoom = async p => { await goTab(p, 'RACE'); await tapSel(p, '[data-race-chat]'); await w(p, 500); await tapText(p, 'Chat Generale'); await w(p, 700); };

run({
  async 'previsione giusta: "Trofeo sbloccato: Indovino"'(b) {
    const seed = { addDocs: {
      'shared/bt-predictions': { __arr: [{ id: 'p1', kind: 'driver', cat: 'Pilota', q: 'Chi vincerà a Baku?', about: 'RACE', raceId: 'r16', answer: 'verstappen' }] },
      ...USER({ predAnswers: { p1: 'verstappen' } }),
    } };
    const { ctx, p, errs } = await open(b, { seed });
    await spyFx(p);
    await login(p); await w(p, 600);
    const n = await notice(p);
    const fx = await p.evaluate(() => ({ played: window.__played.slice(), buzzed: window.__buzzed.slice() }));
    await w(p, 1200);
    const user = await doc(p, 'users/a@b.it');
    await w(p, 3000);
    const gone = await notice(p);
    await ctx.close();
    assert(n && n.label === 'Trofeo sbloccato: Indovino' && /Trofeo sbloccato/.test(n.text) && /Indovino/.test(n.text), 'avviso del trofeo: ' + JSON.stringify(n));
    assert(n.pe === 'none', 'l\'avviso non deve coprire i tocchi: ' + n.pe);
    assert(fx.played.includes('shift') && fx.buzzed.includes('success'), 'suono della Shift Light e vibrazione: ' + JSON.stringify(fx));
    const tr = user && user.app2 && user.app2.trophies;
    assert(tr && typeof tr.indovino === 'number' && tr.indovino > 0 && Object.keys(tr).join() === 'indovino', 'trofeo salvato nell\'account: ' + JSON.stringify(tr));
    assert(!gone, 'l\'avviso deve sparire da solo');
    assert(!errs.length, errs.join(' | '));
  },

  async 'nessun avviso per i trofei già vinti; nessun trofeo per la squadra di partenza'(b) {
    const seed = { addDocs: {
      'shared/bt-predictions': { __arr: [{ id: 'p1', kind: 'driver', cat: 'Pilota', q: 'Chi vincerà a Baku?', about: 'RACE', raceId: 'r16', answer: 'verstappen' }] },
      ...USER({ predAnswers: { p1: 'verstappen' }, trophies: { indovino: DAY } }),
    } };
    const { ctx, p, errs } = await open(b, { seed }); await login(p); await w(p, 600);
    const n = await notice(p);
    await w(p, 1000);
    const user = await doc(p, 'users/a@b.it');
    await ctx.close();
    assert(!n, 'avviso per un trofeo già vinto: ' + JSON.stringify(n));
    assert(user.app2.trophies && user.app2.trophies.indovino === DAY && !user.app2.trophies.griglia, 'trofei nell\'account: ' + JSON.stringify(user.app2.trophies));
    assert(!errs.length, errs.join(' | '));
  },

  async 'bacheca nel Profilo: casco, medaglia, vinti con la data, da vincere con quanto manca'(b) {
    const seed = { addDocs: USER({ helmet: { base: '#1E5BC6', c1: '#F4F2EF', c2: '#E10600', number: '7' }, saved: ['n1', 'n2'], pitBest: 2.73, trophies: { casco: DAY } }) };
    const { ctx, p, errs } = await open(b, { seed }); await login(p);
    await openProfile(p);
    const card = await p.evaluate(() => { const c = document.querySelector('[data-trophies]'); if (!c) return null; const m = c.querySelector('[data-medal]'); return { helmet: !!c.querySelector('[data-helmet]'), medal: m ? m.getAttribute('data-medal') : null, text: c.innerText.replace(/\s+/g, ' ').trim() }; });
    await tapText(p, 'Apri la bacheca'); await w(p, 400);
    const rows = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-trophy]')].map(e => [e.getAttribute('data-trophy'), { won: e.getAttribute('data-won'), text: e.innerText.replace(/\s+/g, ' ').trim() }])));
    const t = await text(p);
    await ctx.close();
    assert(card && card.helmet, 'casco nella bacheca: ' + JSON.stringify(card));
    assert(card.medal === 'bronzo' && /Medaglia di bronzo/.test(card.text), 'medaglia: ' + JSON.stringify(card));
    assert(/1 di 15 trofei/.test(card.text), 'conteggio dei trofei: ' + card.text);
    assert(Object.keys(rows).length === 15, 'trofei nella bacheca: ' + Object.keys(rows).length);
    assert(rows.casco.won === '1' && /Il mio casco/.test(rows.casco.text) && /12 ottobre 2026/.test(rows.casco.text), 'trofeo vinto con la data: ' + JSON.stringify(rows.casco));
    assert(rows.archivio.won === '0' && /Salva 5 notizie/.test(rows.archivio.text) && /2 di 5/.test(rows.archivio.text), 'da vincere con quanto manca: ' + JSON.stringify(rows.archivio));
    assert(/2,73 s/.test(rows.pitcrew.text), 'Pit crew: il record per sapere quanto manca: ' + JSON.stringify(rows.pitcrew));
    assert(rows.sgasata.won === '0' && /Trofeo segreto/.test(rows.sgasata.text) && !/Sgasata|logo/i.test(rows.sgasata.text), 'il trofeo segreto non si svela: ' + JSON.stringify(rows.sgasata));
    assert(!t.includes('—'), 'lineetta lunga nella bacheca');
    assert(!errs.length, errs.join(' | '));
  },

  async 'chat: la medaglia accanto al nome, anche nei messaggi degli altri'(b) {
    const T0 = Date.parse('2026-10-07T09:00:00Z');
    const five = { superlicenza: DAY, casco: DAY, griglia: DAY, mercato: DAY, archivio: DAY };
    const seed = { addDocs: {
      'shared/bt-chat-generale': { __arr: [
        { id: 'f1', user: 'Fabio', aid: authorId('fabio@b.it'), txt: 'Forza Ferrari', t: T0, medal: 'oro' },
        { id: 'g1', user: 'Giulia', aid: authorId('giulia@b.it'), txt: 'Ciao da Giulia', t: T0 + 1000 },
      ] },
      ...USER({ trophies: five }),
    } };
    const { ctx, p, errs } = await open(b, { seed }); await login(p);
    await openRoom(p);
    const others = await p.evaluate(() => [...document.querySelectorAll('[data-chat-msg]')].map(e => { const m = e.querySelector('[data-medal]'); return { id: e.getAttribute('data-chat-msg'), medal: m ? m.getAttribute('data-medal') : null, label: m ? m.getAttribute('aria-label') : null }; }));
    await p.fill('input[placeholder="Scrivi un messaggio…"]', 'Ciao con la medaglia'); await w(p, 100); await tapSel(p, '[aria-label="Invia"]'); await w(p, 800);
    const stored = await doc(p, 'shared/bt-chat-generale');
    const mine = await p.evaluate(() => { const l = [...document.querySelectorAll('[data-chat-msg]')]; const e = l[l.length - 1]; const m = e && e.querySelector('[data-medal]'); return m ? m.getAttribute('data-medal') : null; });
    await ctx.close();
    const f = others.find(x => x.id === 'f1'), g = others.find(x => x.id === 'g1');
    assert(f && f.medal === 'oro' && f.label === 'Medaglia d\'oro', 'medaglia di Fabio: ' + JSON.stringify(others));
    assert(g && !g.medal, 'Giulia non ha medaglie: ' + JSON.stringify(g));
    const sent = stored.__arr.find(m => m.txt === 'Ciao con la medaglia');
    assert(sent && sent.medal === 'argento', 'la medaglia viaggia con il messaggio (5 trofei = argento): ' + JSON.stringify(sent));
    assert(mine === 'argento', 'medaglia accanto al mio messaggio: ' + mine);
    assert(!errs.length, errs.join(' | '));
  },

  async 'tre tocchi sul logo: il trofeo segreto'(b) {
    const { ctx, p, errs } = await open(b); await login(p); await w(p, 400);
    for (let i = 0; i < 3; i++) { await tapSel(p, '[data-logo]'); await w(p, 90); }
    await w(p, 300);
    const n = await notice(p);
    await w(p, 1200);
    const user = await doc(p, 'users/a@b.it');
    await w(p, 3000);
    await openProfile(p);
    await tapText(p, 'Apri la bacheca'); await w(p, 400);
    const row = await p.evaluate(() => { const e = document.querySelector('[data-trophy="sgasata"]'); return e ? { won: e.getAttribute('data-won'), text: e.innerText.replace(/\s+/g, ' ').trim() } : null; });
    await ctx.close();
    assert(n && n.label === 'Trofeo sbloccato: Sgasata', 'avviso del trofeo segreto: ' + JSON.stringify(n));
    assert(user.app2 && user.app2.trophies && typeof user.app2.trophies.sgasata === 'number', 'trofeo segreto salvato: ' + JSON.stringify(user.app2));
    assert(row && row.won === '1' && /Sgasata/.test(row.text) && !/Trofeo segreto/.test(row.text), 'trovato, il trofeo segreto ha il suo nome: ' + JSON.stringify(row));
    assert(!errs.length, errs.join(' | '));
  },
});
