// Calcolatrice del Mondiale (8/11, Edoardo: "nella classifica un tasto calcolatrice che calcoli il campionato e tutto
// quello che si vuole con i punti, solo se il campionato non è finito"). Punti del regolamento 2026 (come dal 2025,
// senza il punto del giro veloce): GP 25-18-15-12-10-8-6-4-2-1, Sprint 8-7-6-5-4-3-2-1. Costruttori: le due auto.
// Solo conti sui punti veri della classifica e sulle gare rimaste del calendario.
const GP = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
const SPRINT = [8, 7, 6, 5, 4, 3, 2, 1];
const isNum = v => typeof v === "number" && Number.isFinite(v);

// Punti per una posizione (1 = primo); 0 fuori dai punti o ritirato (pos null/0).
const ptsOf = (pos, sprint = false) => { const t = sprint ? SPRINT : GP; return isNum(pos) && pos >= 1 && pos <= t.length ? t[pos - 1] : 0; };

// Punti ancora in palio: per un pilota 25 a GP e 8 a Sprint; per una squadra 1° e 2° (43 e 15).
function maxLeft(events, kind = "piloti") {
  return (Array.isArray(events) ? events : []).reduce((s, e) => s + (kind === "costruttori" ? (e.sprint ? 15 : 43) : (e.sprint ? 8 : 25)), 0);
}

// Chi può ancora vincere: { ...riga, gap, best, alive } in ordine di classifica. alive = arrivando sempre primo può
// almeno raggiungere il primo (a pari punti decidono le vittorie, che qui non si conoscono: "a pari punti" lo dice la UI).
function contenders(rows, events, kind = "piloti") {
  const list = (Array.isArray(rows) ? rows : []).filter(r => r && isNum(r.points)).slice().sort((a, b) => b.points - a.points);
  if (!list.length) return [];
  const top = list[0].points, left = maxLeft(events, kind);
  return list.map(r => ({ ...r, gap: top - r.points, best: r.points + left, alive: r.points + left >= top }));
}

// Scenario fra due: picks = { [eventId]: { a: pos|null, b: pos|null } } (pos del GP o della Sprint, ognuno è un
// evento a sé: id "<gara>" e "<gara>:s"). Totali, chi è avanti e se è già deciso con le gare non scelte.
// Chi non ha una scelta in un evento può ancora fare il massimo con i posti che l'altro non ha preso (openA/openB).
// Deciso = chi insegue non recupera nemmeno con il massimo che gli resta. openLeft = quello che resta a chi insegue.
const toList = v => (Array.isArray(v) ? v : [v]).filter(x => isNum(x) && x >= 1);
function bestFree(taken, n, sprint) {
  const t = sprint ? SPRINT : GP, used = new Set(taken);
  let s = 0, k = 0;
  for (let pos = 1; pos <= t.length && k < n; pos++) if (!used.has(pos)) { s += t[pos - 1]; k++; }
  return s;
}
function scenario({ a, b, events = [], picks = {}, kind = "piloti" }) {
  let pa = a.points, pb = b.points, openA = 0, openB = 0;
  const per = kind === "costruttori", cars = per ? 2 : 1;
  const got = (v, sp) => toList(v).reduce((s, x) => s + ptsOf(x, sp), 0);
  (Array.isArray(events) ? events : []).forEach(e => {
    const p = picks[e.id] || {};
    if (p.a !== undefined) pa += got(p.a, e.sprint); else openA += bestFree(p.b !== undefined ? toList(p.b) : [], cars, e.sprint);
    if (p.b !== undefined) pb += got(p.b, e.sprint); else openB += bestFree(p.a !== undefined ? toList(p.a) : [], cars, e.sprint);
  });
  const lead = pa - pb;
  const decided = lead > openB ? "a" : -lead > openA ? "b" : null;
  return { pa, pb, lead, openA, openB, openLeft: lead >= 0 ? openB : openA, decided };
}

// Gli eventi rimasti dal calendario: per ogni gara non finita la Sprint (se c'è) e il GP, in ordine.
function eventsLeft(races, now, { isSprint = () => false, startMs = r => Date.parse(r && r.date) } = {}) {
  return (Array.isArray(races) ? races : [])
    .filter(r => r && r.status !== "CONCLUSA" && isNum(startMs(r)) && startMs(r) + 3 * 3600e3 > now)
    .sort((x, y) => startMs(x) - startMs(y))
    .flatMap(r => [...(isSprint(r) ? [{ id: r.id + ":s", race: r.id, name: r.name, sprint: true }] : []), { id: r.id, race: r.id, name: r.name, sprint: false }]);
}

// 8/11 (Edoardo): "il minimo di ogni pilota per far vincere matematicamente il pilota in testa".
// Primo evento (atIndex) dopo cui chi è in testa può essere campione, e per ogni rivale ancora in corsa:
// need = punti che il primo deve fare più di quel rivale da qui a quell'evento (negativo: il rivale può recuperarne al
// massimo -need). Solo se si decide al prossimo evento, gli arrivi minimi (piloti):
//   ifWin       se il primo vince: il rivale deve arrivare N° o peggio ("any" = qualunque, "out" = fuori dai punti)
//   leaderMin   col rivale fuori dai punti: il primo deve arrivare almeno N° ("out" = gli basta anche zero)
//   ifRivalWins se vince il rivale: il primo deve arrivare almeno N° ("any" = va bene tutto; null = non basta)
// A pari punti decidono le vittorie, che qui non ci sono: si chiede sempre un punto in più (conto prudente).
function titleWatch(rows, events = [], kind = "piloti") {
  const list = (Array.isArray(rows) ? rows : []).filter(r => r && isNum(r.points)).sort((a, b) => b.points - a.points);
  if (!list.length) return null;
  const ev = Array.isArray(events) ? events : [];
  const per = kind === "costruttori";
  const leader = list[0];
  const rivals = list.slice(1).filter(r => r.points + maxLeft(ev, kind) >= leader.points);
  if (!ev.length || !rivals.length) return { leader, decided: true, atIndex: null, at: null, rivals: [] };
  const gainMax = e => (per ? (e.sprint ? 15 : 43) : (e.sprint ? 8 : 25));
  let atIndex = null, gain = 0;
  for (let k = 0; k < ev.length; k++) {
    gain += gainMax(ev[k]);
    const after = maxLeft(ev.slice(k + 1), kind);
    if (rivals.every(r => r.points + after - leader.points + 1 <= gain)) { atIndex = k; break; }
  }
  if (atIndex == null) atIndex = ev.length - 1;   // non succede: all'ultimo evento basta battere chi è dietro
  const after = maxLeft(ev.slice(atIndex + 1), kind);
  const single = atIndex === 0 && !per, sp = !!ev[0].sprint, T = sp ? SPRINT : GP;
  const worstWith = minPts => { if (minPts <= 0) return "out"; let p = null; T.forEach((v, i) => { if (v >= minPts) p = i + 1; }); return p; };
  return {
    leader, decided: false, atIndex, at: ev[atIndex],
    rivals: rivals.map(r => {
      const need = r.points + after - leader.points + 1;
      let ifWin = null, leaderMin = null, ifRivalWins = null;
      if (single) {
        const allowed = T[0] - need;   // punti massimi del rivale se il primo vince
        if (allowed >= T[1]) ifWin = "any";
        else if (allowed < 1) ifWin = allowed < 0 ? null : "out";
        else ifWin = T.findIndex(v => v <= allowed) + 1;
        leaderMin = worstWith(need);
        const req = T[0] + need;       // punti che servono al primo se vince il rivale
        ifRivalWins = req <= 0 ? "any" : req > T[1] ? null : worstWith(req);
      }
      return { id: r.id, name: r.name, color: r.color, points: r.points, need, ifWin, leaderMin, ifRivalWins };
    }),
  };
}

module.exports = { GP, SPRINT, ptsOf, maxLeft, contenders, scenario, eventsLeft, titleWatch };
