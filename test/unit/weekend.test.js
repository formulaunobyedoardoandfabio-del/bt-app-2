// Test degli strumenti del weekend (src/logic/bt-weekend.js) sui dati veri 2026 (src/data/real-weekend.js).
// Uso: node test/unit/weekend.test.js
const assert = require('assert');
const W = require('../../src/data/real-weekend.js');
const B = require('../../src/logic/bt-weekend.js');
const race = id => W.races.find(r => r.circuitId === id);
const quali = id => W.quali.find(q => q.circuitId === id);
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('PASS  ' + name); } catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); } };

// ── Degrado gomme ─────────────────────────────────────────────────────
t('degrado: Russell a Baku, primo stint sulle Medie, senza i giri dietro la Safety Car', () => {
  const D = race('az-2016').drivers.RUS, d = B.degradation(D, 0);
  assert.strictEqual(d.c, 'M'); assert.strictEqual(d.from, 1); assert.strictEqual(d.to, 31);
  assert.ok(d.used >= 18 && d.used <= 27, 'giri usati: ' + d.used);
  assert.ok(d.pts.every(p => p.lap >= 4), 'i primi 3 giri non contano');
  assert.ok(!d.pts.some(p => p.lap >= 30 || p.lap === 9), 'non contano la gialla (giro 9) e la Safety Car (30-31): ' + d.pts.map(p => p.lap));
  // A Baku il passo migliora per tutto lo stint (benzina che cala, pista più gommata): niente crollo, degrado vicino a zero.
  assert.ok(d.slope > -0.12 && d.slope < 0.05, 'degrado: ' + d.slope);
  assert.strictEqual(d.cliff, null, 'nessun crollo: ' + JSON.stringify(d.cliff));
});
t('degrado: correzione del carburante (0,03 s a giro) e retta che passa per i punti', () => {
  const D = { t: [], f: [], st: [['H', 1, 20, 1, 1]] };
  for (let lap = 1; lap <= 20; lap++) { D.t.push(Math.round((90 + 0.08 * lap - B.FUEL * (lap - 1)) * 1000)); D.f.push(0); }
  const d = B.degradation(D, 0);
  assert.ok(Math.abs(d.slope - 0.08) < 0.002, 'pendenza ' + d.slope); assert.strictEqual(d.cliff, null);
});
t('degrado: crollo delle gomme negli ultimi giri ("crollo rilevato")', () => {
  const D = { t: [], f: [], st: [['S', 1, 18, 1, 1]] };
  for (let lap = 1; lap <= 18; lap++) { const drop = lap >= 16 ? 1.1 : 0; D.t.push(Math.round((95 + 0.05 * lap + drop - B.FUEL * (lap - 1)) * 1000)); D.f.push(0); }
  const d = B.degradation(D, 0);
  assert.ok(d.cliff && d.cliff.lap === 16 && d.cliff.loss > 0.8, 'crollo: ' + JSON.stringify(d.cliff));
  assert.ok(Math.abs(d.slope - 0.05) < 0.01, 'la pendenza non si sporca col crollo: ' + d.slope);
});
t('degrado: classifica degli stint di una gara per mescola', () => {
  const list = B.raceDeg(race('az-2016'), { compound: 'M' });
  assert.ok(list.length >= 8, 'stint: ' + list.length);
  assert.ok(list.every(s => s.c === 'M' && s.used >= 5));
  for (let i = 1; i < list.length; i++) assert.ok(list[i - 1].slope <= list[i].slope, 'ordinati dal degrado più basso');
});

t('degrado: i crolli sono rari (un giro storto o il traffico non bastano)', () => {
  let n = 0, c = 0; W.races.forEach(R => B.raceDeg(R).forEach(s => { n++; if (s.cliff) c++; }));
  assert.ok(c / n < 0.12, `crolli in ${c} stint su ${n}`);
});
t('degrado: i primi giri dello stint più lenti di oltre 1 s dei 3 dopo non contano (gomme da scaldare, pista che si asciuga)', () => {
  const D = { t: [], f: [], st: [['M', 10, 30, 1, 1]] };
  for (let lap = 1; lap <= 30; lap++) { const wet = lap < 10 ? 0 : Math.max(0, 14 - lap) * 1.5; D.t.push(Math.round((100 + wet + 0.1 * (lap - 10) - B.FUEL * (lap - 1)) * 1000)); D.f.push(0); }
  const d = B.degradation(D, 0);
  assert.strictEqual(d.pts[0].lap, 14, 'primo giro usato: ' + d.pts[0].lap);
  assert.ok(Math.abs(d.slope - 0.1) < 0.02, 'pendenza ' + d.slope); assert.strictEqual(d.cliff, null);
});
t('degrado: Sepang 2026, partenza sul bagnato: sulle gomme da asciutto del giro 10 degrado positivo, nessun crollo finto', () => {
  const R = race('my-1999');
  for (const c of ['OCO', 'GAS', 'LIN']) {
    const D = R.drivers[c], d = B.degradation(D, 1, R.laps, R, c);
    assert.strictEqual(D.st[1][1], 10, c + ': stint dal giro 10');
    assert.ok(d.slope > 0.1, c + ': degrado ' + d.slope);
    assert.strictEqual(d.cliff, null, c + ': crollo ' + JSON.stringify(d.cliff));
  }
});

// ── Strategia ─────────────────────────────────────────────────────────
t('strategia vera: il vincitore di Baku (Medie poi Morbide, con la sosta sotto Safety Car)', () => {
  const s = B.strategy(race('az-2016').drivers.RUS);
  assert.deepStrictEqual(s.map(x => x.c), ['M', 'S', 'S']); assert.strictEqual(s[0].to, 31);
});
t('punti strategia: soste, mescole, giri del pit stop e bonus podio', () => {
  const R = { laps: 50, drivers: {
    A: { pos: 1, st: [['M', 1, 20, 1, 1], ['H', 21, 50, 1, 1]] },
    B: { pos: 2, st: [['H', 1, 30, 1, 1], ['M', 31, 50, 1, 1]] },
    C: { pos: 3, st: [['M', 1, 15, 1, 1], ['H', 16, 35, 1, 1], ['M', 36, 50, 1, 1]] } } };
  const exact = B.strategyPoints([{ c: 'M', to: 20 }, { c: 'H', to: 50 }], R);
  assert.strictEqual(exact.total, 10 + 8 + 6 + 0 + 5, JSON.stringify(exact));
  const close = B.strategyPoints([{ c: 'M', to: 24 }, { c: 'H', to: 50 }], R);
  assert.strictEqual(close.parts.laps, 3, 'pit stop a 4 giri: +3');
  const other = B.strategyPoints([{ c: 'H', to: 30 }, { c: 'M', to: 50 }], R);
  assert.strictEqual(other.parts.stops, 10); assert.strictEqual(other.parts.compounds, 0); assert.strictEqual(other.parts.podium, 5, 'uguale al secondo');
  assert.strictEqual(other.winner, 'A');
});
t('strategia: almeno due mescole da asciutto e stint di almeno 3 giri', () => {
  assert.ok(B.validatePred([{ c: 'M', to: 25 }, { c: 'M', to: 50 }], 50).warnings.some(w => /due mescole/.test(w)));
  assert.ok(B.validatePred([{ c: 'M', to: 2 }, { c: 'H', to: 50 }], 50).warnings.some(w => /3 giri/.test(w)));
  assert.strictEqual(B.validatePred([{ c: 'M', to: 25 }, { c: 'H', to: 50 }], 50).warnings.length, 0);
});
t('strategia: percentuali della community (demo) che fanno 100', () => {
  const c = B.communityPicks(16, 56), sum = c.reduce((a, x) => a + x.pct, 0);
  assert.ok(c.length >= 4 && sum === 100, JSON.stringify(c));
  assert.deepStrictEqual(c, B.communityPicks(16, 56), 'sempre uguali per la stessa gara');
});

// ── Compagni a confronto ───────────────────────────────────────────────
t('compagni: in qualifica si confronta l\'ultima fase in cui erano entrambi (Sepang)', () => {
  const Q = quali('my-1999').drivers, d = B.qualiDuel(Q.HAM, Q.LEC);
  assert.strictEqual(d.seg, 'Q3'); assert.ok(Math.abs(d.pct - Q.LEC.q[2] / Q.HAM.q[2] * 100) < 1e-9);
  const e = B.qualiDuel({ q: [90000, 0, 0] }, { q: [90500, 89000, 0] });
  assert.strictEqual(e.seg, 'Q1');
});
t('compagni: stagione della Ferrari (testa a testa, indice e un evento per gara)', () => {
  const s = B.teammates(W, 'ferrari');
  assert.deepStrictEqual(s.pair.slice().sort(), ['HAM', 'LEC']);
  assert.ok(s.events.length >= 15, 'eventi: ' + s.events.length);
  const [qa, qb] = s.h2h.quali; assert.ok(qa + qb >= 14, 'testa a testa: ' + s.h2h.quali);
  assert.ok(Math.abs(s.index[s.pair[0]] - (200 - s.index[s.pair[1]])) < 0.2, 'indici simmetrici: ' + JSON.stringify(s.index));
});
t('compagni: l\'indice segue il testa a testa (mediana: Verstappen davanti a Hadjar)', () => {
  const s = B.teammates(W, 'redbull'), [a, b] = s.h2h.quali;
  assert.ok(a > b && s.index.VER > 100 && s.index.HAD < 100, JSON.stringify({ h2h: s.h2h, index: s.index }));
  assert.ok(s.h2h.finish[0] + s.h2h.finish[1] >= 8, 'arrivi: ' + s.h2h.finish);
});
t('compagni: passo gara = mediana dei giri puliti', () => {
  const D = { t: [], f: [], st: [['M', 1, 12, 1, 1]] };
  for (let lap = 1; lap <= 12; lap++) { D.t.push(lap === 5 ? 99000 : 90000 + lap * 10); D.f.push(lap === 5 ? 4 : 0); }
  // Giri buoni: 4 e 6-12 (non i primi 3, non il 5 con la Safety Car); mediana tra il giro 8 e il 9, corretti per la benzina.
  const exp = ((90.08 + B.FUEL * 7) + (90.09 + B.FUEL * 8)) / 2;
  assert.ok(Math.abs(B.racePace(D) - exp) < 1e-9, 'passo: ' + B.racePace(D) + ' invece di ' + exp);
});

// ── Scanner dell'assetto (prove libere) ───────────────────────────────
t('prove libere: Verstappen in FP2 a Sepang, simulazione di qualifica e long run sulle Medie', () => {
  const r = B.runs(W.practice['my-1999'].FP2.VER);
  const q = r.find(x => x.kind === 'quali'), l = r.find(x => x.kind === 'long');
  assert.ok(q && q.best === 97785, 'simulazione di qualifica: ' + JSON.stringify(q));
  assert.ok(l && l.c === 'M' && l.laps >= 10 && l.avg > 103000 && l.avg < 106000, 'long run: ' + JSON.stringify(l));
});
t('prove libere: profilo delle 11 scuderie (velocità di punta contro velocità in curva)', () => {
  const p = B.profile(W.practice['my-1999'].FP2);
  assert.strictEqual(p.teams.length, 11);
  const fer = p.teams.find(x => x.team === 'ferrari'), mer = p.teams.find(x => x.team === 'mercedes');
  assert.ok(fer.top < mer.top, 'Ferrari più lenta in rettilineo della Mercedes');
  assert.ok(p.teams.every(x => ['scarico', 'carico', 'efficiente', 'difficolta', 'medio'].includes(x.label)));
  assert.ok(p.teams.every(x => typeof x.dTop === 'number' && typeof x.dCorner === 'number'));
});

// ── Rilevatore di bluff ────────────────────────────────────────────────
t('bluff: dice che le gomme sono finite ma va come prima', () => {
  const L = [91.2, 91.3, 91.25, 91.3, 91.2, 91.35, 91.3, 91.4].map((t, i) => ({ lap: i + 10, t }));
  const v = B.bluffVerdict(L, 13); assert.strictEqual(v.kind, 'bluff', JSON.stringify(v));
});
t('bluff: era vero, rientra ai box due giri dopo', () => {
  const L = [91.2, 91.3, 91.5, 91.9, 92.4, 92.2].map((t, i) => ({ lap: i + 10, t, pit: i === 5 }));
  const v = B.bluffVerdict(L, 13); assert.strictEqual(v.kind, 'vero'); assert.strictEqual(v.pitLap, 15);
});
t('bluff: era vero, perde più di mezzo secondo al giro', () => {
  const L = [91.2, 91.3, 91.2, 91.3, 92.1, 92.0, 92.3].map((t, i) => ({ lap: i + 10, t }));
  const v = B.bluffVerdict(L, 13); assert.strictEqual(v.kind, 'vero'); assert.ok(v.delta > 0.5);
});

t('bluff: si confronta col resto del gruppo (se tutti rallentano, non è il pilota)', () => {
  const mk = (base, step) => [0, 1, 2, 3, 4, 5, 6].map(i => ({ lap: i + 10, t: base + (i >= 4 ? step : 0) }));
  const others = [mk(92, 0.6), mk(92.3, 0.55), mk(91.8, 0.65)];
  const v = B.bluffVerdict(mk(91.5, 0.6), 13, others);
  assert.strictEqual(v.kind, 'bluff', JSON.stringify(v)); assert.ok(Math.abs(v.rel) < 0.1 && v.delta > 0.5);
});

// ── Diretta simulata: dal simulatore al formato dei dati veri ─────────
const LiveSim = require('../../src/logic/live-sim.js'), CIRCUITS = require('../../src/data/circuits.json');
const CODES = ['NOR', 'VER', 'ANT', 'HAD', 'LEC', 'PIA', 'RUS', 'HAM', 'SAI', 'ALB', 'ALO', 'GAS', 'LAW', 'BEA', 'HUL', 'BOR', 'OCO', 'LIN', 'COL', 'STR', 'BOT', 'PER'];
function simRace() {
  const sim = LiveSim.createSession({ track: LiveSim.buildTrack(CIRCUITS['my-1999']), drivers: CODES.map((code, i) => ({ id: code.toLowerCase(), code, number: i + 1, color: '#fff' })), type: 'RACE', seed: 16 * 97 + 4, script: true });
  for (let i = 0; i < 40000 && !sim.state().finished; i++) sim.advance(2);
  const st = sim.state();
  return B.fromSim({ totalLaps: st.totalLaps, cars: st.cars.map(c => ({ code: c.code, team: null, pos: c.dnf ? null : c.pos, laps: sim.laps(c.id) })) });
}
const SIM = simRace();
t('diretta simulata: giri, stint e bandiere nel formato dei dati veri', () => {
  const D = Object.values(SIM.drivers).find(d => d.st.length >= 2);
  assert.ok(D && D.t.length >= 50, 'giri: ' + (D && D.t.length));
  const s1 = D.st[1]; assert.ok(D.f[s1[1] - 2] & 1, 'giro di rientro prima del secondo stint');
  assert.ok(D.f[s1[1] - 1] & 2, 'giro di uscita all\'inizio del secondo stint');
  assert.ok(Object.values(SIM.drivers).some(d => d.f.some(f => f & (4 | 8 | 16))), 'bandiere del copione');
  assert.ok(B.raceDeg(SIM).length > 20, 'degrado anche in diretta');
});
t('bluff in diretta simulata: il rilevatore scopre i bluff e conferma le radio vere', () => {
  const claims = B.demoClaims(SIM);
  const v = claims.map(c => ({ ...c, v: B.bluffVerdict(B.lapsOf(SIM, c.code), c.lap, Object.keys(SIM.drivers).filter(k => k !== c.code).map(k => B.lapsOf(SIM, k))) }));
  const bl = v.filter(x => x.truth === 'bluff'), ve = v.filter(x => x.truth === 'vero');
  assert.ok(bl.length >= 4 && ve.length >= 6, `radio: ${bl.length} bluff, ${ve.length} vere`);
  const okB = bl.filter(x => x.v.kind === 'bluff').length, okV = ve.filter(x => x.v.kind === 'vero').length;
  assert.ok(okB / bl.length >= 0.75, `bluff scoperti ${okB}/${bl.length}`); assert.strictEqual(okV, ve.length, `vere confermate ${okV}/${ve.length}`);
  assert.ok(claims.every(c => c.text && c.lap >= 5));
});

console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
