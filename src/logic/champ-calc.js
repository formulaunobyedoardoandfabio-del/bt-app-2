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

module.exports = { GP, SPRINT, ptsOf, maxLeft, contenders, scenario, eventsLeft };
