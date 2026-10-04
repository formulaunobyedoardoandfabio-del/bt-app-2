// Test delle regole di gioco B&T (pronostici meteo, FantaF1 come F1 Fantasy, previsioni) — gira in Node.
// Uso: node test/unit/logic.test.js [filtro]
const assert = require('assert');
const path = require('path');
const L = require(path.join(__dirname, '..', '..', 'src', 'logic', 'bt-logic.js'));

// Weekend del GP del Bahrain in Malesia (orari ufficiali, UTC).
const MY = [{ key: 'FP1', utc: '2026-10-02T04:30Z' }, { key: 'FP2', utc: '2026-10-02T08:00Z' }, { key: 'FP3', utc: '2026-10-03T04:30Z' }, { key: 'QUALI', utc: '2026-10-03T08:00Z' }, { key: 'RACE', utc: '2026-10-04T07:00Z' }];
const SG = [{ key: 'FP1', utc: '2026-10-09T08:30Z' }, { key: 'SQ', utc: '2026-10-09T12:30Z' }, { key: 'SPRINT', utc: '2026-10-10T09:00Z' }, { key: 'QUALI', utc: '2026-10-10T13:00Z' }, { key: 'RACE', utc: '2026-10-11T12:00Z' }];
const T = s => Date.parse(s);
const BEFORE = T('2026-09-30T12:00Z');
const idx = k => MY.findIndex(s => s.key === k);
const wx = (key, now, o = {}) => L.wxLock({ sessions: MY, idx: idx(key), now, ...o });

// Due macchine per scuderia: A e B di "alfa", C e D di "beta", E ed F di "gamma".
const TEAM_OF = { a: 'alfa', b: 'alfa', c: 'beta', d: 'beta', e: 'gamma', f: 'gamma' };
const row = (id, pos, extra = {}) => ({ id, pos, grid: pos, out: null, dnf: false, ...extra });

const STATS = {
  drivers: { a: { price: 30, pts: 300 }, b: { price: 25, pts: 250 }, c: { price: 20, pts: 200 }, d: { price: 10, pts: 150 }, e: { price: 8, pts: 90 }, f: { price: 5, pts: 20 }, g: { price: 4, pts: 10 }, h: { price: 3, pts: 5 } },
  teams: { alfa: { price: 30, pts: 500 }, beta: { price: 20, pts: 300 }, gamma: { price: 10, pts: 100 }, delta: { price: 5, pts: 10 } },
};

const tests = {
  'meteo: la gara si cambia fino alla fine delle FP3'() {
    assert.strictEqual(wx('RACE', BEFORE).locked, false);
    assert.strictEqual(wx('RACE', T('2026-10-03T05:29Z')).locked, false, 'durante le FP3 (reali) è ancora prima della fine');
    assert.strictEqual(wx('RACE', T('2026-10-03T05:30Z')).locked, true, 'a fine FP3 deve chiudersi');
    assert.deepStrictEqual([wx('RACE', BEFORE).deadline.key, wx('RACE', BEFORE).deadline.when], ['FP3', 'end']);
  },
  'meteo: qualifiche fino alla fine delle FP2, FP3 e FP2 fino alla fine delle FP1'() {
    assert.strictEqual(wx('QUALI', T('2026-10-02T08:59Z')).locked, false);
    assert.strictEqual(wx('QUALI', T('2026-10-02T09:00Z')).locked, true);
    for (const k of ['FP3', 'FP2']) {
      assert.strictEqual(wx(k, T('2026-10-02T05:29Z')).locked, false, k);
      assert.strictEqual(wx(k, T('2026-10-02T05:30Z')).locked, true, k + ' deve chiudersi a fine FP1');
      assert.strictEqual(wx(k, BEFORE).deadline.key, 'FP1');
    }
  },
  'meteo: le FP1 si cambiano solo fino al loro inizio'() {
    assert.strictEqual(wx('FP1', T('2026-10-02T04:29Z')).locked, false);
    assert.strictEqual(wx('FP1', T('2026-10-02T04:30Z')).locked, true);
    assert.deepStrictEqual([wx('FP1', BEFORE).deadline.key, wx('FP1', BEFORE).deadline.when], ['FP1', 'start']);
  },
  'meteo: mai mentre una sessione è in corso (demo)'() {
    const r = wx('RACE', BEFORE, { liveKey: 'FP2' });
    assert.strictEqual(r.locked, false); assert.strictEqual(r.paused, true, 'durante le FP2 il pronostico della gara è in pausa');
    assert.strictEqual(wx('FP2', BEFORE, { liveKey: 'FP2' }).locked, true, 'la sessione in corso è chiusa');
  },
  'meteo: nella demo conta la fine delle sessioni simulate, e l\'esito chiude'() {
    assert.strictEqual(wx('FP3', BEFORE, { ended: { FP1: true } }).locked, true);
    assert.strictEqual(wx('RACE', BEFORE, { ended: { FP1: true, FP2: true } }).locked, false);
    assert.strictEqual(wx('RACE', BEFORE, { ended: { FP3: true } }).locked, true);
    assert.strictEqual(wx('RACE', BEFORE, { hasResult: true }).locked, true);
  },
  'meteo: weekend Sprint (SQ fino alla fine delle FP1, gara fino alla fine della Sprint)'() {
    const at = (k, now) => L.wxLock({ sessions: SG, idx: SG.findIndex(s => s.key === k), now });
    assert.strictEqual(at('SQ', BEFORE).deadline.key, 'FP1');
    assert.strictEqual(at('SPRINT', BEFORE).deadline.key, 'FP1');
    assert.strictEqual(at('QUALI', BEFORE).deadline.key, 'SQ');
    assert.strictEqual(at('RACE', BEFORE).deadline.key, 'SPRINT');
    assert.strictEqual(at('RACE', T('2026-10-10T10:00Z')).locked, true, 'dopo la Sprint (1 ora) la gara è chiusa');
  },
  'squadra: si chiude all\'inizio delle qualifiche e riapre a fine gara'() {
    const a = L.teamLock({ sessions: MY, now: BEFORE });
    assert.strictEqual(a.locked, false); assert.strictEqual(a.lockAt, T('2026-10-03T08:00Z')); assert.strictEqual(a.lockKey, 'QUALI');
    assert.strictEqual(L.teamLock({ sessions: MY, now: T('2026-10-03T08:00Z') }).locked, true);
    assert.strictEqual(L.teamLock({ sessions: MY, now: T('2026-10-04T08:59Z') }).locked, true);
    const after = L.teamLock({ sessions: MY, now: T('2026-10-04T09:00Z') });
    assert.strictEqual(after.locked, false); assert.strictEqual(after.over, true);
    assert.strictEqual(L.teamLock({ sessions: SG, now: BEFORE }).lockKey, 'SQ', 'nei weekend Sprint chiude alle Qualifiche Sprint');
    assert.strictEqual(L.teamLock({ sessions: MY, now: BEFORE, demo: { locked: true } }).locked, true);
  },
  'conto alla rovescia: giorni, ore e minuti'() {
    assert.deepStrictEqual(L.countdown(T('2026-10-03T08:00Z') - T('2026-09-30T11:48Z')), { d: 2, h: 20, m: 12 });
    assert.deepStrictEqual(L.countdown(-5), { d: 0, h: 0, m: 0 });
  },
  'punti qualifiche: posizioni e bonus delle scuderie (Q2/Q3)'() {
    const res = { type: 'QUALI', order: [row('a', 1), row('c', 2), row('b', 3), row('e', 11, { out: 'Q2' }), row('d', 16, { out: 'Q1' }), row('f', 17, { out: 'Q1' })] };
    const p = L.sessionPoints(res, TEAM_OF);
    assert.strictEqual(p.drivers.a.pts, 10); assert.strictEqual(p.drivers.c.pts, 9); assert.strictEqual(p.drivers.b.pts, 8); assert.strictEqual(p.drivers.e.pts, 0);
    assert.strictEqual(p.teams.alfa.pts, 10 + 8 + 10, 'alfa: entrambi in Q3');
    assert.strictEqual(p.teams.beta.pts, 9 + 3, 'beta: uno in Q3, l\'altro fuori in Q1');
    assert.strictEqual(p.teams.gamma.pts, 0 + 1, 'gamma: uno in Q2');
    const both2 = L.sessionPoints({ type: 'QUALI', order: [row('a', 11, { out: 'Q2' }), row('b', 12, { out: 'Q2' })] }, TEAM_OF);
    assert.strictEqual(both2.teams.alfa.pts, 5, 'entrambi in Q2');
    const both1 = L.sessionPoints({ type: 'QUALI', order: [row('a', 18, { out: 'Q1' }), row('b', 19, { out: 'Q1' })] }, TEAM_OF);
    assert.strictEqual(both1.teams.alfa.pts, -1, 'entrambi fuori in Q1');
  },
  'punti gara: posizione, posizioni guadagnate e perse, giro più veloce'() {
    const res = { type: 'RACE', fastest: 'c', order: [row('a', 1, { grid: 5 }), row('b', 2, { grid: 1 }), row('c', 3, { grid: 3 }), row('d', 12, { grid: 10 })] };
    const p = L.sessionPoints(res, TEAM_OF);
    assert.strictEqual(p.drivers.a.pts, 25 + 4);
    assert.strictEqual(p.drivers.b.pts, 18 - 1);
    assert.strictEqual(p.drivers.c.pts, 15 + 10);
    assert.strictEqual(p.drivers.d.pts, 0 - 2);
    assert.strictEqual(p.teams.alfa.pts, 29 + 17, 'la scuderia prende i punti dei suoi piloti');
    const dnf = L.sessionPoints({ type: 'RACE', order: [row('e', null, { grid: 4, dnf: true })] }, TEAM_OF);
    assert.strictEqual(dnf.drivers.e.pts, -20);
  },
  'punti Sprint: 8 al primo, giro più veloce +5, ritiro -10'() {
    const p = L.sessionPoints({ type: 'SPRINT', fastest: 'a', order: [row('a', 1), row('b', 8), row('c', 9), row('d', null, { dnf: true, grid: 2 })] }, TEAM_OF);
    assert.strictEqual(p.drivers.a.pts, 8 + 5); assert.strictEqual(p.drivers.b.pts, 1); assert.strictEqual(p.drivers.c.pts, 0); assert.strictEqual(p.drivers.d.pts, -10);
    assert.strictEqual(L.sessionPoints({ type: 'SQ', order: [row('a', 1)] }, TEAM_OF).drivers.a.pts, 0, 'le Qualifiche Sprint non danno punti');
  },
  'punti della squadra: il 2X raddoppia un pilota, contano anche le scuderie'() {
    const pts = { drivers: { a: { pts: 29 }, b: { pts: 17 }, c: { pts: 25 } }, teams: { alfa: { pts: 46 }, beta: { pts: 25 } } };
    const s = L.squadScore({ drivers: ['a', 'b', 'c', null, 'z'], teams: ['alfa', 'beta'], boost: 'c' }, pts);
    assert.strictEqual(s.total, 29 + 17 + 50 + 0 + 46 + 25);
    assert.strictEqual(s.lines.find(l => l.id === 'c').boost, true);
  },
  'cambi: squadra nuova illimitata, poi conta la squadra finale e oltre i gratis -10 punti'() {
    const base = { drivers: ['a', 'b', 'c', 'd', 'e'], teams: ['alfa', 'beta'] };
    assert.strictEqual(L.transfers(null, base, 3).unlimited, true);
    assert.deepStrictEqual(L.transfers(base, base, 3), { used: 0, free: 3, extra: 0, penalty: 0, unlimited: false });
    const one = { drivers: ['f', 'b', 'c', 'd', 'e'], teams: ['alfa', 'beta'] };
    assert.strictEqual(L.transfers(base, one, 3).used, 1);
    const back = { drivers: ['e', 'b', 'c', 'd', 'a'], teams: ['beta', 'alfa'] };
    assert.strictEqual(L.transfers(base, back, 3).used, 0, 'rimettere gli stessi (anche in altro ordine) non costa');
    const four = { drivers: ['f', 'g', 'h', 'd', 'e'], teams: ['gamma', 'beta'] };
    assert.deepStrictEqual(L.transfers(base, four, 3), { used: 4, free: 3, extra: 1, penalty: 10, unlimited: false });
    assert.strictEqual(L.transfers(base, { drivers: ['f', null, 'c', 'd', 'e'], teams: ['alfa', 'beta'] }, 2).used, 1, 'un posto vuoto non è un cambio');
    assert.deepStrictEqual([L.nextFree(3, 0), L.nextFree(3, 2), L.nextFree(3, 3), L.nextFree(2, 0), L.nextFree(2, 2)], [3, 3, 2, 3, 2]);
  },
  'budget: valore della squadra e cosa si può comprare'() {
    const sq = { drivers: ['a', 'b', null, null, null], teams: [null, null] };
    assert.strictEqual(L.squadValue(sq, STATS), 55);
    assert.strictEqual(L.canAfford(sq, STATS, 100, 'drivers', 2, 'c'), true);
    assert.strictEqual(L.canAfford({ drivers: ['a', 'b', 'c', 'd', 'e'], teams: ['alfa', null] }, STATS, 100, 'teams', 1, 'beta'), false, '93 + 20 supera 100');
    const full = { drivers: ['a', 'b', 'c', 'd', 'e'], teams: ['alfa', 'beta'] };   // valore 143
    assert.strictEqual(L.canAfford(full, STATS, 140, 'drivers', 4, 'f'), true, 'sostituire libera il prezzo del vecchio (8): ne restano 5');
    assert.strictEqual(L.canAfford(full, STATS, 139, 'drivers', 4, 'f'), false, 'ne restano 4, F costa 5');
  },
  'riempi automatico: completa nel budget senza doppioni e tiene chi c\'è già'() {
    const sq = { drivers: ['a', null, null, null, null], teams: [null, null], boost: null };
    const out = L.autoFill(sq, STATS, 100);
    assert.strictEqual(out.drivers[0], 'a');
    assert.ok(out.drivers.every(Boolean) && out.teams.every(Boolean), 'posti vuoti: ' + JSON.stringify(out));
    assert.strictEqual(new Set(out.drivers).size, 5); assert.strictEqual(new Set(out.teams).size, 2);
    assert.ok(L.squadValue(out, STATS) <= 100, 'fuori budget: ' + L.squadValue(out, STATS));
    assert.ok(out.drivers.includes(out.boost), 'manca il 2X');
    const none = L.autoFill({ drivers: [null, null, null, null, null], teams: [null, null], boost: null }, STATS, 20);
    assert.ok(L.squadValue(none, STATS) <= 20, 'col budget piccolo non deve sforare');
  },
  'riempi automatico: sceglie la squadra con più punti che entra nel budget (non il primo che capita)'() {
    // Brute force su tutte le squadre possibili per confronto.
    const ids = Object.keys(STATS.drivers), tids = Object.keys(STATS.teams);
    const pts = s => s.drivers.reduce((a, id) => a + STATS.drivers[id].pts, 0) + s.teams.reduce((a, id) => a + STATS.teams[id].pts, 0);
    for (const budget of [60, 80, 100, 120]) {
      let best = -Infinity;
      const comb = (arr, k, st = 0, acc = [], out = []) => { if (acc.length === k) { out.push(acc.slice()); return out; } for (let i = st; i < arr.length; i++) { acc.push(arr[i]); comb(arr, k, i + 1, acc, out); acc.pop(); } return out; };
      for (const d of comb(ids, 5)) for (const t of comb(tids, 2)) { const s = { drivers: d, teams: t }; if (L.squadValue(s, STATS) <= budget) best = Math.max(best, pts(s)); }
      const out = L.autoFill({ drivers: [null, null, null, null, null], teams: [null, null], boost: null }, STATS, budget);
      assert.ok(L.squadValue(out, STATS) <= budget, 'fuori budget con ' + budget);
      assert.strictEqual(pts(out), best, `budget ${budget}: ${pts(out)} punti invece del massimo ${best}`);
    }
  },
  'previsioni: risposte aperte senza badare a maiuscole e accenti, numeri, sondaggi'() {
    assert.strictEqual(L.predictionCorrect({ kind: 'open', answer: ['Hülkenberg', 'Hulkenberg'] }, ' hulkenberg '), true);
    assert.strictEqual(L.predictionCorrect({ kind: 'open', answer: ['Max Verstappen', 'Verstappen'] }, 'verstappen'), true);
    assert.strictEqual(L.predictionCorrect({ kind: 'open', answer: ['2'] }, '2 soste'), false);
    assert.strictEqual(L.predictionCorrect({ kind: 'number', answer: 3 }, '3'), true);
    assert.strictEqual(L.predictionCorrect({ kind: 'poll', answer: 'x' }, 'x'), true);
    assert.strictEqual(L.predictionCorrect({ kind: 'poll', answer: 'x' }, 'y'), false);
    assert.strictEqual(L.predictionCorrect({ kind: 'poll', answer: null }, 'y'), null, 'risposta non ancora segnata');
    assert.strictEqual(L.predictionCorrect({ kind: 'poll', answer: 'x' }, null), null);
  },
  'previsioni chiuse: piloti e scuderie per id, numeri anche con lo zero davanti'() {
    assert.strictEqual(L.predictionCorrect({ kind: 'driver', answer: 'hadjar' }, 'hadjar'), true);
    assert.strictEqual(L.predictionCorrect({ kind: 'driver', answer: 'hadjar' }, 'lindblad'), false);
    assert.strictEqual(L.predictionCorrect({ kind: 'team', answer: 'ferrari' }, 'ferrari'), true);
    assert.strictEqual(L.predictionCorrect({ kind: 'team', answer: 'ferrari' }, 'mclaren'), false);
    assert.strictEqual(L.predictionCorrect({ kind: 'number', answer: 3 }, '03'), true);
    assert.strictEqual(L.predictionCorrect({ kind: 'number', answer: '2' }, '12'), false);
    assert.strictEqual(L.predictionCorrect({ kind: 'driver', answer: null }, 'hadjar'), null, 'risposta esatta non ancora segnata');
  },
  'notizie: età dal testo ("Adesso", "2 min fa", "5 h fa", "Ieri", "3 giorni fa", "1 settimana fa") e ordine dalla più nuova'() {
    const ages = ['Adesso', '2 min fa', '1 h fa', '5 h fa', 'Ieri', '3 giorni fa', '1 settimana fa', '3 settimane fa', '2 mesi fa'].map(t => L.newsAge({ time: t }));
    assert.deepStrictEqual(ages, [0, 2, 60, 300, 1440, 4320, 10080, 30240, 86400]);
    assert.strictEqual(L.newsAge({ time: 'boh' }), Infinity, 'testo sconosciuto: in fondo');
    const list = [{ id: 'a', time: '5 h fa' }, { id: 'b', time: 'Ieri' }, { id: 'c', time: 'Adesso' }, { id: 'd', time: '30 min fa' }, { id: 'e', time: 'Adesso' }, { id: 'f', time: 'boh' }];
    assert.deepStrictEqual(L.newestFirst(list).map(a => a.id), ['c', 'e', 'd', 'a', 'b', 'f'], 'a parità di età resta l\'ordine di partenza');
    assert.deepStrictEqual(list.map(a => a.id), ['a', 'b', 'c', 'd', 'e', 'f'], 'la lista di partenza è stata cambiata');
  },
  'pagelle: 5 parametri da 1 a 10 per ogni pilota, media della community con i voti simulati (sempre uguali)'() {
    const field = [{ id: 'a', pos: 1 }, { id: 'b', pos: 2 }, { id: 'c', pos: 15 }, { id: 'd', pos: null, dnf: 'incidente' }];
    const r = L.communityRatings({ field, seed: 16 });
    assert.deepStrictEqual(L.RATING_PARAMS.map(p => p[0]), ['pace', 'aggr', 'gomme', 'fortuna', 'strategia']);
    assert.deepStrictEqual(Object.keys(r).sort(), ['a', 'b', 'c', 'd']);
    for (const x of Object.values(r)) {
      for (const [k] of L.RATING_PARAMS) assert(x.avg[k] >= 1 && x.avg[k] <= 10 && Math.round(x.avg[k] * 10) === x.avg[k] * 10, `${k}: ${x.avg[k]}`);
      assert(Number.isInteger(x.votes) && x.votes > 20, 'voti: ' + x.votes);
    }
    assert.deepStrictEqual(L.communityRatings({ field, seed: 16 }), r, 'con lo stesso seme i voti cambiano');
    assert(r.a.avg.pace > r.c.avg.pace, `il vincitore ha meno passo del 15°: ${r.a.avg.pace} contro ${r.c.avg.pace}`);
    assert(r.d.avg.fortuna < r.b.avg.fortuna && r.d.avg.fortuna <= 4, 'chi si ritira per incidente non è sfortunato: ' + r.d.avg.fortuna);
    assert(r.a.votes > r.c.votes, 'il vincitore riceve meno voti del 15°');
  },
  'pagelle: il mio voto entra nella media (un voto in più)'() {
    const field = [{ id: 'a', pos: 1 }, { id: 'b', pos: 2 }];
    const base = L.communityRatings({ field, seed: 3 });
    const mine = { a: { pace: 10, aggr: 10, gomme: 10, fortuna: 1, strategia: 10 } };
    const r = L.communityRatings({ field, seed: 3, mine });
    assert.strictEqual(r.a.votes, base.a.votes + 1);
    for (const [k] of L.RATING_PARAMS) assert(Math.abs(r.a.total[k] - base.a.total[k] - mine.a[k]) < 1e-9, `${k}: il mio voto non entra nella somma`);
    assert.strictEqual(r.a.avg.fortuna, Math.round(r.a.total.fortuna / r.a.votes * 10) / 10, 'la media non è somma / voti');
    assert.deepStrictEqual(r.b, base.b, 'è cambiato anche un pilota che non ho votato');
    assert.deepStrictEqual(r.a.mine, mine.a);
  },
  'pit stop: 4 passi per ruota (svita, togli, monta, avvita); finisce quando tutte e 4 sono avvitate'() {
    let s = L.pitGo(L.pitNew(), 1000);
    assert.deepStrictEqual(L.PIT_STEPS.map(x => x[0]), ['svita', 'togli', 'monta', 'avvita']);
    let t = 1000;
    for (let k = 0; k < 4; k++) for (const w of L.PIT_WHEELS) { t += 150; s = L.pitTap(s, w, t); }
    assert.strictEqual(s.phase, 'done'); assert.deepStrictEqual(s.steps, { fl: 4, fr: 4, rl: 4, rr: 4 });
    assert.strictEqual(s.time, 2.4); assert.strictEqual(s.errors, 0);
    assert.strictEqual(L.pitTap(s, 'fl', t + 500), s, 'dopo la fine i tocchi contano ancora');
  },
  'pit stop: stessa ruota toccata troppo in fretta = errore (+0,2 s); toccare prima del via = +0,5 s'() {
    let s = L.pitNew();
    assert.strictEqual(L.pitTap(s, 'fl', 500), s, 'prima di partire un tocco conta');
    s = L.pitLights(s); s = L.pitTap(s, 'fl', 900);
    assert.strictEqual(s.penaltyMs, 500); assert.strictEqual(s.steps.fl, 0);
    s = L.pitGo(s, 1000); s = L.pitTap(s, 'fl', 1010); s = L.pitTap(s, 'fl', 1050);
    assert.strictEqual(s.steps.fl, 1, 'il tocco troppo veloce fa avanzare la ruota');
    assert.strictEqual(s.penaltyMs, 700); assert.strictEqual(s.errors, 2);
    s = L.pitTap(s, 'fl', 1200); assert.strictEqual(s.steps.fl, 2);
    assert.strictEqual(L.pitTap(s, 'xx', 1300), s);
    assert.deepStrictEqual([1.95, 2.3, 3.0, 4].map(L.pitRating), ['record', 'ottimo', 'buono', 'lento']);
  },
  'silly season: 10 punti col pilota giusto, bonus per chi l\'ha detto prima (fino a +20), +5 per rinnovo o cambio'() {
    const D = 86400000, off = { driver: 'russell', at: 100 * D };
    const pts = (pick, renew, daysBefore) => L.sillyPoints({ pred: { pick, renew, at: off.at - daysBefore * D }, official: off, current: 'russell' }).points;
    assert.strictEqual(pts('russell', 'rinnova', 90), 35);
    assert.strictEqual(pts('russell', 'cambia', 10), 15);
    assert.strictEqual(pts('russell', 'rinnova', 2), 15);
    assert.strictEqual(pts('bearman', 'rinnova', 40), 5);
    assert.strictEqual(pts('bearman', 'cambia', 40), 0);
    assert.strictEqual(L.sillyPoints({ pred: { pick: 'russell', renew: 'rinnova', at: off.at + D }, official: off, current: 'russell' }).points, 0, 'una previsione fatta dopo il comunicato prende punti');
    const changed = L.sillyPoints({ pred: { pick: 'lindblad', renew: 'cambia', at: 0 }, official: { driver: 'lindblad', at: 70 * D }, current: 'lawson' });
    assert.strictEqual(changed.points, 35);
  },
  'silly season: classifica con i tifosi simulati e la mia previsione'() {
    const D = 86400000, official = { s1: { driver: 'russell', at: 100 * D } }, current = { s1: 'russell', s2: 'ocon' };
    const mine = { s1: { pick: 'russell', renew: 'rinnova', at: 10 * D } };
    const b1 = L.sillyBoard({ official, current, mine, seed: 7 });
    const me = b1.find(r => r.me);
    assert(me && me.points === 35, 'i miei punti: ' + JSON.stringify(me));
    assert(b1.length >= 8 && b1.every((r, i) => i === 0 || b1[i - 1].points >= r.points), 'classifica non ordinata');
    assert.deepStrictEqual(L.sillyBoard({ official, current, mine, seed: 7 }), b1, 'la classifica cambia da sola');
    const none = L.sillyBoard({ official: {}, current, mine, seed: 7 });
    assert(none.every(r => r.points === 0), 'punti senza comunicati ufficiali');
  },
  'drag vs downforce: più ala = meno velocità in rettilineo e più in curva; troppo carico a Monza = avviso'() {
    const monza = { share: 0.55, lapTime: 82 }, monaco = { share: 0.06, lapTime: 74.5 };
    const a = L.aeroModel({ ...monza, wing: 2, ride: 3 }), b = L.aeroModel({ ...monza, wing: 9, ride: 3 });
    assert(a.vmax > b.vmax && a.vcorner < b.vcorner, `velocità: ${JSON.stringify([a.vmax, a.vcorner, b.vmax, b.vcorner])}`);
    assert(L.aeroModel({ ...monza, wing: 5, ride: 5 }).ideal.wing < L.aeroModel({ ...monaco, wing: 5, ride: 5 }).ideal.wing, 'Monza vuole più ala di Monaco');
    const heavy = L.aeroModel({ ...monza, wing: 10, ride: 3 }), w = heavy.warnings.find(x => x.kind === 'drag');
    assert(w && w.kmh >= 10 && /Perdita stimata di \d+ km\/h sul rettilineo principale!/.test(w.text), 'avviso: ' + JSON.stringify(heavy.warnings));
    const light = L.aeroModel({ ...monaco, wing: 0, ride: 3 });
    assert(light.warnings.some(x => x.kind === 'grip'), 'a Monaco senza ala nessun avviso');
    assert(L.aeroModel({ ...monza, wing: 2, ride: 0 }).warnings.some(x => x.kind === 'bottoming'), 'troppo bassa: nessun avviso');
    const ok = L.aeroModel({ ...monza, wing: heavy.ideal.wing, ride: heavy.ideal.ride });
    assert(!ok.warnings.length && ok.lapDelta === 0, 'assetto ideale con avvisi: ' + JSON.stringify(ok));
    assert(heavy.lapDelta > 0.3, 'troppo carico a Monza costa poco: ' + heavy.lapDelta);
  },
};

let pass = 0, fail = 0;
const filter = process.argv[2] ? new RegExp(process.argv[2], 'i') : null;
for (const [name, fn] of Object.entries(tests)) {
  if (filter && !filter.test(name)) continue;
  try { fn(); pass++; console.log('PASS  ' + name); }
  catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + String(e.message).split('\n')[0].slice(0, 300)); }
}
console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
