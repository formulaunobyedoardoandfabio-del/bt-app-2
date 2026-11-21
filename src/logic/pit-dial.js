// Quadrante dei box (21/11, dal "Circle of Doom" di MultiViewer; piano nel documento del progetto
// claude/multiviewer-in-sector4.md). Dal file del replay (src/logic/track-replay.js):
// - lapTime / refLap / frac: il tempo di un giro e, sul giro di riferimento del primo, a che punto del giro (in tempo,
//   non in metri) si trova ogni macchina: così sul cerchio la distanza tra due auto è il loro distacco in secondi;
// - pitLosses / lossModel: quanto si perde ai box, misurato sui pit veri della gara come quanto cresce il distacco da
//   chi non si ferma (i rivali vicini) tra prima dell'entrata e dopo l'uscita; con la Safety Car la mediana dei pit
//   veri fatti con la Safety Car se ce ne sono almeno 3, altrimenti una frazione scritta come stima;
// - predict / dial: dove rientrerebbe chi si ferma adesso (posizione, chi ha davanti e dietro, aria libera);
// - backtest: per ogni pit vero, la stima fatta poco prima dell'entrata contro la posizione vera all'uscita.
// Nei file il tempo del pit (date di OpenF1) è l'USCITA dalla corsia (sui 417 pit del 2026 la macchina è più lenta
// ~12 s prima e a quel tempo ha già passato il traguardo); la corsia va da t - durata a t.
// Prove: test/unit/pit-dial.test.js.

const TR = require("./track-replay");

// Con la Safety Car: misurato sulle gare 2026 con almeno 3 pit in SC (Spa 0,89, Suzuka 0,87, Shanghai 0,89 del tempo
// perso normale; tools/pit-dial-backtest.js). Si usa quando la gara non ha abbastanza pit in SC suoi.
const SC_FACTOR = 0.88;
const VSC_FACTOR = 0.9;   // stima: nessun pit con la VSC nei file 2026; la VSC rallenta meno della SC, quindi poco sotto il normale
const FREE_AIR = 2;       // secondi: con più di 2 s davanti si rientra in aria libera
const LANE = 22;          // secondi in corsia quando il file non li ha
const NEAR = 60;          // secondi: rivali usati per misurare il tempo perso (vicini in pista a quel pilota)
const PROF = 120;         // punti del profilo del giro di riferimento

const med = a => { const s = a.filter(Number.isFinite).sort((x, y) => x - y); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const r1 = x => Math.round(x * 10) / 10;
const norm = a => ((a % 360) + 360) % 360;
const laneOf = p => (p[3] > 0 ? p[3] : LANE);

function flagAt(rep, t) {
  const f = (rep.status || []).filter(s => s[0] <= t).pop();
  return f ? f[1] : "green";
}
const greenBetween = (rep, a, b) => flagAt(rep, a) === "green" && !(rep.status || []).some(s => s[0] > a && s[0] <= b && s[1] !== "green");

// Tempo del giro `lap` (1 = dal traguardo al primo passaggio) del pilota i; null se non l'ha fatto tutto.
function lapTime(rep, i, lap) {
  if (!(lap >= 1)) return null;
  const a = TR.tAt(rep, i, (lap - 1) * rep.L), b = TR.tAt(rep, i, lap * rep.L);
  return a == null || b == null ? null : b - a;
}

const pitLapsOf = (rep, n) => new Set((rep.pits || []).filter(p => p[1] === n).flatMap(p => [p[2], p[2] + 1]));

// Giro di riferimento: l'ultimo giro pulito (non di pit, bandiera verde, entro il 7% del migliore degli ultimi) del
// primo all'istante t; il profilo dice dopo quanti secondi dal traguardo si passa da ogni punto del giro.
function refLap(rep, t) {
  const st = TR.stateAt(rep, t), lead = st.rows.find(r => !r.out);
  if (!lead) return null;
  const i = lead.i, L = rep.L, done = Math.floor(TR.progAt(rep, i, t) / L);
  if (done < 1) return null;
  const key = i + ":" + done;
  if (rep._pdRef && rep._pdRef.key === key) return rep._pdRef.ref;
  const pitLaps = pitLapsOf(rep, rep.drivers[i].n);
  const cands = [];
  for (let k = done; k >= Math.max(1, done - 5); k--) {
    const T = lapTime(rep, i, k);
    if (T != null) cands.push({ k, T, ok: !pitLaps.has(k) && greenBetween(rep, TR.tAt(rep, i, (k - 1) * L), TR.tAt(rep, i, k * L)) });
  }
  if (!cands.length) return null;
  const best = Math.min(...cands.map(c => c.T));
  const pick = cands.find(c => c.ok && c.T <= best * 1.07) || cands.find(c => c.T === best);
  const s0 = (pick.k - 1) * L, t0 = TR.tAt(rep, i, s0), prof = new Float64Array(PROF + 1);
  for (let j = 0; j <= PROF; j++) prof[j] = TR.tAt(rep, i, s0 + (j * L) / PROF) - t0;
  const ref = { i, code: lead.code, lap: pick.k, T: pick.T, prof, L };
  rep._pdRef = { key, ref };
  return ref;
}

// Frazione di giro (in tempo) al punto x metri dal traguardo.
function frac(ref, x) {
  const L = ref.L, u = (((x % L) + L) % L) / L * PROF, j = Math.min(PROF - 1, Math.floor(u));
  const tt = ref.prof[j] + (ref.prof[j + 1] - ref.prof[j]) * (u - j);
  return ref.T > 0 ? tt / ref.T : u / PROF;
}

// Rientro di chi si ferma adesso: il suo distacco dal primo cresce di `loss` secondi, gli altri restano dove sono.
function predict(st, i, loss) {
  const me = st.rows.find(r => r.i === i);
  if (!me || me.out || me.gap == null || !Number.isFinite(loss)) return null;
  const g = me.gap + loss;
  const others = st.rows.filter(r => r.i !== i && !r.out && r.gap != null).sort((a, b) => a.gap - b.gap);
  const k = others.filter(r => r.gap < g).length;
  const ahead = k ? others[k - 1] : null, behind = others[k] || null;
  const gapAhead = ahead ? r1(g - ahead.gap) : null, gapBehind = behind ? r1(behind.gap - g) : null;
  const pick = r => r && { i: r.i, code: r.code, color: r.color, pos: r.pos };
  return { pos: k + 1, gap: r1(g), ahead: pick(ahead), behind: pick(behind), gapAhead, gapBehind, free: !ahead || gapAhead > FREE_AIR };
}

// Tempo perso a ogni pit vero: quanto cresce il distacco dai rivali vicini che non si fermano tra 15 s prima
// dell'entrata e 15 s dopo l'uscita. Mediana sui rivali; null se ce ne sono meno di 2.
function pitLosses(rep) {
  if (rep._pdLoss) return rep._pdLoss;
  const pits = rep.pits || [];
  const laneSpans = rep.drivers.map(d => pits.filter(p => p[1] === d.n).map(p => [p[0] - laneOf(p) - 5, p[0] + 5]));
  const out = pits.map((p, k) => {
    const i = rep.drivers.findIndex(d => d.n === p[1]);
    if (i < 0) return null;
    const entry = p[0] - laneOf(p);
    const a = TR.progAt(rep, i, entry - 15), b = TR.progAt(rep, i, p[0] + 15);
    const ta = TR.tAt(rep, i, a), tb = TR.tAt(rep, i, b);
    if (ta == null || tb == null || b <= a) return null;
    const deltas = [];
    rep.drivers.forEach((d, j) => {
      if (j === i) return;
      const ja = TR.tAt(rep, j, a), jb = TR.tAt(rep, j, b);
      if (ja == null || jb == null || Math.abs(ja - ta) > NEAR) return;
      if (laneSpans[j].some(([s, e]) => s < jb && e > ja)) return;
      deltas.push((tb - jb) - (ta - ja));
    });
    const loss = deltas.length >= 2 ? med(deltas) : null;
    return { k, i, code: rep.drivers[i].code, lap: p[2], t: p[0], entry, lane: p[3] || null, flag: flagAt(rep, entry), loss: loss == null ? null : r1(loss), rivals: deltas.length };
  }).filter(Boolean);
  rep._pdLoss = out;
  return out;
}

// Tempo perso tipico della gara: normale (mediana dei pit veri a bandiera verde) e con SC / VSC.
// `skip`: indice di un pit da lasciare fuori (per la prova onesta del backtest).
function lossModel(rep, opts = {}) {
  const all = pitLosses(rep).filter(x => x.loss != null && x.k !== opts.skip);
  const by = f => all.filter(x => x.flag === f).map(x => x.loss);
  const g = by("green"), sc = by("sc"), vsc = by("vsc");
  const green = g.length ? r1(med(g)) : null;
  const scM = sc.length >= 3, vscM = vsc.length >= 3;
  return {
    green,
    sc: scM ? r1(med(sc)) : green == null ? null : r1(green * SC_FACTOR),
    vsc: vscM ? r1(med(vsc)) : green == null ? null : r1(green * VSC_FACTOR),
    nGreen: g.length, nSc: sc.length, nVsc: vsc.length, scMeasured: scM, vscMeasured: vscM,
  };
}

// Il quadrante all'istante t: ogni auto sul cerchio del giro (0° = traguardo, in senso di marcia), il distacco dal
// pilota scelto (o dal primo) e, per il pilota scelto, dove rientrerebbe fermandosi adesso: normale, SC e VSC.
function dial(rep, t, opts = {}) {
  const st = TR.stateAt(rep, t), ref = refLap(rep, t);
  if (!ref) return null;
  const model = opts.model || lossModel(rep);
  const selRow = opts.sel != null ? st.rows.find(r => r.i === opts.sel && !r.out) : null;
  const base = selRow && selRow.gap != null ? selRow.gap : 0;
  const cars = st.rows.filter(r => !r.out).map(r => ({
    i: r.i, n: r.n, code: r.code, team: r.team, color: r.color, pos: r.pos, tyre: r.tyre, box: r.box, down: r.down,
    angle: r1(norm(frac(ref, r.p) * 360)), rel: r.gap == null ? null : r1(r.gap - base),
  }));
  let rejoin = null;
  if (selRow) {
    const me = cars.find(c => c.i === selRow.i);
    const one = loss => { const p = predict(st, selRow.i, loss); return p && { ...p, loss, angle: r1(norm(me.angle - (loss / ref.T) * 360)) }; };
    rejoin = { green: one(model.green), sc: one(model.sc), vsc: one(model.vsc), scMeasured: !!model.scMeasured, vscMeasured: !!model.vscMeasured };
    // la stima principale segue la bandiera di adesso; l'altra è il caso opposto (verde ↔ SC). Con la rossa le gomme si
    // cambiano in corsia durante la sospensione: nessuna posizione persa, niente stima.
    const nowKey = st.flag === "sc" ? "sc" : st.flag === "vsc" ? "vsc" : "green", altKey = nowKey === "green" ? "sc" : "green";
    Object.assign(rejoin, { nowKey, altKey, red: st.flag === "red", now: st.flag === "red" ? null : rejoin[nowKey], alt: st.flag === "red" ? null : rejoin[altKey] });
  }
  return { t, lap: st.lap, total: rep.laps || rep.N || null, flag: st.flag, T: r1(ref.T), refCode: ref.code, cars, sel: selRow ? cars.find(c => c.i === selRow.i) : null, rejoin, model };
}

// Prova sui pit veri: `lead` secondi prima dell'entrata si stima il rientro (col tempo perso degli ALTRI pit della
// gara, o col modello dato), e lo si confronta con la posizione vera 5 s dopo l'uscita.
function backtest(rep, opts = {}) {
  const lead = opts.lead != null ? opts.lead : 10;
  const rows = [];
  pitLosses(rep);
  (rep.pits || []).forEach((p, k) => {
    const i = rep.drivers.findIndex(d => d.n === p[1]);
    if (i < 0) return;
    const t0 = p[0] - laneOf(p) - lead;
    if (t0 < rep.start + 1) return;
    const st = TR.stateAt(rep, t0);
    const m = opts.model || lossModel(rep, { skip: k });
    const loss = st.flag === "sc" ? m.sc : st.flag === "vsc" ? m.vsc : m.green;
    const pr = predict(st, i, loss);
    if (!pr) return;
    const real = TR.stateAt(rep, p[0] + 5).rows.find(r => r.i === i);
    if (!real || real.out) return;
    // pit di massa: più di metà delle auto in gara entra entro 30 s (bandiera rossa, tutti dentro con la SC): se si
    // fermano tutti nessuno perde posizioni, e la stima "mi fermo solo io" non è messa alla prova
    const entry = p[0] - laneOf(p), running = st.rows.filter(r => !r.out).length;
    const together = new Set((rep.pits || []).filter(q => Math.abs(q[0] - laneOf(q) - entry) <= 30).map(q => q[1])).size;
    // altri piloti ai box tra la stima e l'uscita: quello che una stima fatta prima non può sapere
    const crowd = new Set((rep.pits || []).filter(q => q[1] !== p[1] && q[0] - laneOf(q) < p[0] + 5 && q[0] > t0).map(q => q[1])).size;
    rows.push({ code: rep.drivers[i].code, lap: p[2], flag: st.flag, loss, mass: together > running / 2, crowd, before: st.rows.find(r => r.i === i).pos, pred: pr.pos, real: real.pos, err: pr.pos - real.pos });
  });
  const ok = rows.filter(r => !r.mass);
  return { n: ok.length, exact: ok.filter(r => r.err === 0).length, within1: ok.filter(r => Math.abs(r.err) <= 1).length, nMass: rows.length - ok.length, rows };
}

module.exports = { SC_FACTOR, VSC_FACTOR, FREE_AIR, flagAt, lapTime, refLap, frac, predict, pitLosses, lossModel, dial, backtest };
