// Regole di gioco B&T: pronostici meteo, FantaF1 (come il gioco ufficiale F1 Fantasy) e previsioni avanzate.
// Funzioni pure, senza schermate: le usa l'app e le provano i test in Node (rtest/logic.test.js).
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.BtLogic = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  // Durata delle sessioni in minuti (programma ufficiale F1), per sapere quando finiscono.
  const SESSION_MIN = { FP1: 60, FP2: 60, FP3: 60, SQ: 45, SPRINT: 60, QUALI: 60, RACE: 120 };
  const startOf = s => (s && s.utc ? Date.parse(s.utc) : null);
  const endOf = s => (s && s.utc ? Date.parse(s.utc) + (SESSION_MIN[s.key] || 60) * 60000 : null);

  // Pronostico meteo della sessione idx: si cambia fino alla fine della sessione di due prima
  // (le FP2 fino alla fine delle FP1, le FP1 fino al loro inizio) e mai mentre una sessione è in corso.
  // sessions: [{ key, utc }] in ordine; ended: sessioni già finite nella demo; liveKey: sessione in corso.
  function wxLock({ sessions, idx, now, ended = {}, liveKey = null, hasResult = false }) {
    const s = sessions[idx];
    const ref = idx >= 2 ? sessions[idx - 2] : idx === 1 ? sessions[0] : null;
    const deadline = ref ? { key: ref.key, at: endOf(ref), when: "end" } : { key: s.key, at: startOf(s), when: "start" };
    if (hasResult) return { locked: true, paused: false, reason: "result", deadline };
    const refOver = ref ? !!ended[ref.key] || (deadline.at != null && now >= deadline.at) : false;
    const selfStarted = liveKey === s.key || !!ended[s.key] || (startOf(s) != null && now >= startOf(s));
    if (refOver || selfStarted) return { locked: true, paused: false, reason: "deadline", deadline };
    if (liveKey) return { locked: false, paused: true, reason: "live", liveKey, deadline };
    return { locked: false, paused: false, reason: null, deadline };
  }

  // Squadra FantaF1: si blocca all'inizio delle qualifiche (Qualifiche Sprint nei weekend Sprint) e riapre a fine gara.
  // demo: { locked: true } quando la diretta demo ha già fatto partire le qualifiche di quel weekend.
  function teamLock({ sessions, now, demo = null }) {
    const lockS = sessions.find(s => s.key === "SQ") || sessions.find(s => s.key === "QUALI") || null;
    const raceS = sessions.find(s => s.key === "RACE") || null;
    const lockAt = startOf(lockS), unlockAt = endOf(raceS);
    const real = lockAt != null && now >= lockAt && (unlockAt == null || now < unlockAt);
    const demoOn = !!(demo && demo.locked);
    return { locked: real || demoOn, real, demo: demoOn && !real, lockAt, unlockAt, lockKey: lockS ? lockS.key : null, over: unlockAt != null && now >= unlockAt };
  }

  function countdown(ms) {
    const m = Math.max(0, Math.floor(ms / 60000));
    return { d: Math.floor(m / 1440), h: Math.floor((m % 1440) / 60), m: m % 60 };
  }

  // Punti come nel gioco ufficiale F1 Fantasy (stagione 2026).
  const QUALI_PTS = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
  const SPRINT_PTS = [8, 7, 6, 5, 4, 3, 2, 1];
  const RACE_PTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
  const RULES = {
    qualiPts: QUALI_PTS, sprintPts: SPRINT_PTS, racePts: RACE_PTS, qualiNoTime: -5,
    raceFastest: 10, sprintFastest: 5, dotd: 10, raceDnf: -20, sprintDnf: -10, perPosition: 1, overtake: 1,
    teamQuali: { bothQ3: 10, bothQ2: 5, oneQ3: 3, oneQ2: 1, bothQ1: -1 },
    pitStops: [["sotto 2,2 s", 10], ["da 2,2 a 2,49 s", 5], ["da 2,5 a 2,99 s", 2]], fastestStop: 5, recordStop: 15,
    boost: 2, freeTransfers: 2, maxTransfers: 3, transferCost: 10, startBudget: 100,
    wxBonus: 2, pollBonus: 2, predictionBonus: 1,
  };

  // result: { type, order: [{ id, pos, grid, out: "Q1"|"Q2"|"SQ1"|"SQ2"|null, dnf }], fastest: id del giro più veloce }
  // teamOf: { idPilota: idScuderia }. Nella demo mancano sorpassi, pilota del giorno e pit stop.
  function sessionPoints(result, teamOf) {
    const drivers = {}, teams = {};
    const add = (obj, id, pts, why) => { const e = obj[id] || (obj[id] = { pts: 0, items: [] }); e.pts += pts; if (pts) e.items.push([why, pts]); };
    const type = result.type, isRace = type === "RACE" || type === "SPRINT";
    (result.order || []).forEach(r => {
      add(drivers, r.id, 0, "");
      if (type === "QUALI") { const p = QUALI_PTS[r.pos - 1] || 0; add(drivers, r.id, p, "Qualifiche P" + r.pos); return; }
      if (!isRace) return;   // prove libere e Qualifiche Sprint non danno punti
      const sprint = type === "SPRINT";
      if (r.dnf) { add(drivers, r.id, sprint ? RULES.sprintDnf : RULES.raceDnf, "Ritiro"); return; }
      const table = sprint ? SPRINT_PTS : RACE_PTS;
      add(drivers, r.id, table[r.pos - 1] || 0, (sprint ? "Sprint" : "Gara") + " P" + r.pos);
      if (r.grid && r.pos) {
        const d = r.grid - r.pos;
        if (d > 0) add(drivers, r.id, d, `+${d} posizioni`);
        if (d < 0) add(drivers, r.id, d, `${d} posizioni`);
      }
      if (result.fastest === r.id) add(drivers, r.id, sprint ? RULES.sprintFastest : RULES.raceFastest, "Giro più veloce");
    });
    const byTeam = {};
    Object.keys(drivers).forEach(id => { const t = teamOf[id]; if (t) (byTeam[t] = byTeam[t] || []).push(id); });
    Object.entries(byTeam).forEach(([t, ids]) => {
      add(teams, t, 0, "");
      ids.forEach(id => { if (drivers[id].pts) add(teams, t, drivers[id].pts, "Punti di " + id); });
      if (type === "QUALI" && ids.length) {
        const rows = ids.map(id => result.order.find(r => r.id === id));
        const q3 = rows.filter(r => r && !r.out).length, q2 = rows.filter(r => r && r.out !== "Q1").length;
        const B = RULES.teamQuali;
        const bonus = q3 >= 2 ? B.bothQ3 : q2 >= 2 ? B.bothQ2 : q3 === 1 ? B.oneQ3 : q2 === 1 ? B.oneQ2 : B.bothQ1;
        add(teams, t, bonus, "Bonus Q2/Q3");
      }
    });
    return { drivers, teams };
  }

  // Punti di una squadra (5 piloti + 2 scuderie) in una sessione: il pilota col 2X vale doppio.
  function squadScore(squad, pts) {
    const lines = []; let total = 0;
    (squad.drivers || []).forEach(id => {
      if (!id) return;
      const base = pts.drivers[id] ? pts.drivers[id].pts : 0, boost = id === squad.boost, p = boost ? base * RULES.boost : base;
      total += p; lines.push({ id, kind: "driver", pts: p, boost });
    });
    (squad.teams || []).forEach(id => {
      if (!id) return;
      const p = pts.teams[id] ? pts.teams[id].pts : 0;
      total += p; lines.push({ id, kind: "team", pts: p, boost: false });
    });
    return { total, lines };
  }

  // Cambi rispetto alla squadra dell'ultima chiusura: conta la squadra finale (rimettere chi c'era non costa).
  function transfers(base, squad, free) {
    if (!base) return { used: 0, free: Infinity, extra: 0, penalty: 0, unlimited: true };
    const had = [...base.drivers, ...base.teams].filter(Boolean);
    const used = [...squad.drivers, ...squad.teams].filter(x => x && !had.includes(x)).length;
    const extra = Math.max(0, used - free);
    return { used, free, extra, penalty: extra * RULES.transferCost, unlimited: false };
  }
  // Cambi gratis del weekend dopo: 2 nuovi più al massimo 1 non usato (massimo 3).
  const nextFree = (free, used) => RULES.freeTransfers + Math.min(1, Math.max(0, free - used));

  const priceOf = (stats, kind, id) => (id && stats[kind][id] ? Number(stats[kind][id].price) || 0 : 0);
  const squadValue = (squad, stats) => Math.round((squad.drivers.reduce((s, id) => s + priceOf(stats, "drivers", id), 0) + squad.teams.reduce((s, id) => s + priceOf(stats, "teams", id), 0)) * 10) / 10;
  // 13/11 (bug dei tester: "dopo un certo punto non si può più scegliere la scuderia"): budget come in F1 Fantasy.
  // Prima i soldi liberi erano budget − prezzi di OGGI di chi hai: coi prezzi automatici chi va forte sale a ogni GP, la
  // squadra finiva "fuori budget" e tolta una scuderia non si poteva più rimettere. Ora conta quanto hai PAGATO
  // (squad.paid[kind][id]); chi vendi si vende al prezzo di oggi e il guadagno (o la perdita) resta tuo (squad.gain).
  // `listing` = il listino senza i prezzi automatici: vale come prezzo pagato per le squadre fatte prima del 13/11.
  const KINDS2 = ["drivers", "teams"];
  const fin = v => typeof v === "number" && isFinite(v);
  const paidOf = (squad, stats, kind, id, listing) => {
    const v = squad.paid && squad.paid[kind] ? squad.paid[kind][id] : undefined;
    return fin(v) ? v : priceOf(listing || stats, kind, id);
  };
  // Soldi liberi: budget + guadagni già incassati − quanto hai pagato chi hai in squadra.
  function bank(squad, stats, budget, listing) {
    const paid = KINDS2.reduce((t, kind) => t + squad[kind].reduce((a, id) => a + (id ? paidOf(squad, stats, kind, id, listing) : 0), 0), 0);
    return Math.round((budget + (Number(squad.gain) || 0) - paid) * 10) / 10;
  }
  // Si può mettere `id` al posto `slot`? (il vecchio del posto si vende al prezzo di oggi)
  function canAfford(squad, stats, budget, kind, slot, id, listing) {
    const left = bank(squad, stats, budget, listing) + priceOf(stats, kind, squad[kind][slot]);
    return priceOf(stats, kind, id) <= left + 1e-9;
  }
  // Segna quanto è stato pagato chi è in squadra e non ce l'ha ancora segnato (dal listino). Niente da segnare: la
  // stessa squadra (nessun salvataggio inutile).
  function withPaid(squad, listing) {
    if (!squad || !Array.isArray(squad.drivers) || !Array.isArray(squad.teams)) return squad;
    let changed = false;
    const paid = { drivers: { ...(squad.paid && squad.paid.drivers) }, teams: { ...(squad.paid && squad.paid.teams) } };
    KINDS2.forEach(kind => squad[kind].forEach(id => { if (id && !fin(paid[kind][id])) { paid[kind][id] = priceOf(listing, kind, id); changed = true; } }));
    return changed ? { ...squad, paid } : squad;
  }
  // Mette `id` (null = toglie) al posto `slot`: vende il vecchio al prezzo di oggi, compra il nuovo al prezzo di oggi.
  function place(squad, stats, kind, slot, id, listing) {
    const cur = squad[kind][slot];
    if ((cur || null) === (id || null)) return squad;
    const base = withPaid(squad, listing || stats);
    const paid = { drivers: { ...(base.paid && base.paid.drivers) }, teams: { ...(base.paid && base.paid.teams) } };
    let gain = Number(squad.gain) || 0;
    if (cur) { gain = Math.round((gain + priceOf(stats, kind, cur) - paid[kind][cur]) * 10) / 10; delete paid[kind][cur]; }
    if (id) paid[kind][id] = priceOf(stats, kind, id);
    return { ...squad, [kind]: squad[kind].map((x, i) => (i === slot ? id || null : x)), paid, gain };
  }
  // Svuota la squadra vendendo tutti al prezzo di oggi (i guadagni restano).
  function clearSquad(squad, stats, listing) {
    let s = squad;
    KINDS2.forEach(kind => squad[kind].forEach((id, i) => { if (id) s = place(s, stats, kind, i, null, listing); }));
    return { ...s, boost: null };
  }

  // Riempie i posti vuoti con la combinazione che fa più punti della stagione restando nel budget
  // (a parità di punti, quella che costa meno). Chi è già in squadra resta.
  function autoFill(squad, stats, budget, listing) {
    let s = { ...squad, drivers: squad.drivers.slice(), teams: squad.teams.slice() };
    const fixed = [...s.drivers, ...s.teams].filter(Boolean);
    const pool = kind => Object.entries(stats[kind]).map(([id, v]) => ({ id, price: Number(v.price) || 0, pts: Number(v.pts) || 0 })).filter(x => !fixed.includes(x.id));
    const combos = (arr, k) => {
      const out = [], pick = [];
      const rec = (start, price, pts) => {
        if (pick.length === k) { out.push({ ids: pick.slice(), price, pts }); return; }
        for (let i = start; i <= arr.length - (k - pick.length); i++) { pick.push(arr[i].id); rec(i + 1, price + arr[i].price, pts + arr[i].pts); pick.pop(); }
      };
      rec(0, 0, 0);
      return out;
    };
    const needD = s.drivers.filter(x => !x).length, needT = s.teams.filter(x => !x).length;
    const left = bank(s, stats, budget, listing);
    const dC = combos(pool("drivers"), needD).sort((a, b) => a.price - b.price);
    const bestUpTo = []; let bi = -1;   // per ogni prezzo: la combinazione di piloti con più punti che costa al massimo così
    dC.forEach((c, i) => { if (bi < 0 || c.pts > dC[bi].pts || (c.pts === dC[bi].pts && c.price < dC[bi].price)) bi = i; bestUpTo.push(bi); });
    let win = null;
    combos(pool("teams"), needT).forEach(t => {
      const room = left - t.price;
      let lo = 0, hi = dC.length - 1, idx = -1;
      while (lo <= hi) { const mid = (lo + hi) >> 1; if (dC[mid].price <= room + 1e-9) { idx = mid; lo = mid + 1; } else hi = mid - 1; }
      if (idx < 0) return;
      const d = dC[bestUpTo[idx]], pts = d.pts + t.pts, price = d.price + t.price;
      if (!win || pts > win.pts || (pts === win.pts && price < win.price)) win = { d, t, pts, price };
    });
    if (win) {
      const dq = win.d.ids.slice(), tq = win.t.ids.slice();
      s.drivers.forEach((x, i) => { if (!x && dq.length) s = place(s, stats, "drivers", i, dq.shift(), listing); });
      s.teams.forEach((x, i) => { if (!x && tq.length) s = place(s, stats, "teams", i, tq.shift(), listing); });
    }
    if (!s.drivers.includes(s.boost)) {
      const best = s.drivers.filter(Boolean).sort((a, b) => (stats.drivers[b].pts || 0) - (stats.drivers[a].pts || 0))[0];
      s.boost = best || null;
    }
    return s;
  }

  // Previsioni avanzate, tutte a risposta chiusa: sondaggio, pilota (tra tutti), scuderia (tra tutte), numero
  // (col tastierino) e storia. "open" (testo libero) resta solo per le risposte già date nelle versioni vecchie.
  const norm = t => String(t == null ? "" : t).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  function predictionCorrect(q, answer) {
    if (answer == null || answer === "" || q.answer == null || (Array.isArray(q.answer) && !q.answer.length)) return null;
    if (q.kind === "number") return Number(String(answer).replace(",", ".")) === Number(q.answer);
    if (q.kind === "open") return (Array.isArray(q.answer) ? q.answer : [q.answer]).some(a => norm(a) === norm(answer));
    return answer === q.answer;
  }

  // Notizie: quanti minuti fa sono uscite, dal testo mostrato ("Adesso", "2 min fa", "5 h fa", "Ieri", "3 giorni fa"...).
  // Serve a mettere in grande sempre la più recente e le altre dalla più nuova. Testo sconosciuto: in fondo.
  const AGE_UNITS = [[/^min/, 1], [/^(h|or)/, 60], [/^giorn/, 1440], [/^settiman/, 10080], [/^mes/, 43200], [/^ann/, 525600]];
  function newsAge(a) {
    const s = norm(a && a.time);
    if (s === "adesso" || s === "ora") return 0;
    if (s === "ieri") return 1440;
    const m = /^(\d+)\s*([a-z]+)/.exec(s);
    if (m) { const u = AGE_UNITS.find(([re]) => re.test(m[2])); if (u) return Number(m[1]) * u[1]; }
    return Infinity;
  }
  const newestFirst = list => list.map((a, i) => [a, newsAge(a), i]).sort((x, y) => (x[1] - y[1]) || (x[2] - y[2])).map(x => x[0]);

  // ── PAGELLE DELLA COMMUNITY ─────────────────────────────────────────────
  // Dopo ogni gara (e Sprint) i tifosi votano i piloti da 1 a 10 su 5 parametri. I voti degli altri tifosi sono
  // simulati (demo) ma sensati: il passo segue la posizione, chi rimonta è più aggressivo, la fortuna crolla con un
  // ritiro; sempre uguali per la stessa gara (seed). field: [{ id, pos (null se ritirato), dnf, grid, stops }];
  // mine: { [pilota]: { pace, aggr, gomme, fortuna, strategia } }. Per ogni pilota: media (1 decimale), voti, somma.
  const RATING_PARAMS = [["pace", "Pace gara"], ["aggr", "Aggressività"], ["gomme", "Gestione gomme"], ["fortuna", "Fortuna"], ["strategia", "Strategia del team"]];
  const clamp10 = v => Math.max(1, Math.min(10, v));
  function communityRatings({ field, seed = 1, mine = {} }) {
    const rnd = (i, k) => { const x = Math.sin((seed + 1) * 12.9898 + i * 78.233 + k * 37.719) * 43758.5453; return x - Math.floor(x); };
    const out = {};
    field.forEach((d, i) => {
      const q = d.pos != null ? Math.min(1, (d.pos - 1) / 21) : 0.8;   // 0 = vincitore, 1 = ultimo
      const dnf = d.dnf || null, gained = d.grid && d.pos ? d.grid - d.pos : 0;
      const noise = (k, a) => (rnd(i, k) - 0.5) * 2 * a;
      const base = {
        pace: 9.3 - q * 5.2 + noise(1, 0.5),
        aggr: 6 + Math.max(-2, Math.min(3, gained * 0.3)) + noise(2, 1.3) + (dnf === "incidente" ? 0.8 : 0),
        gomme: 8 - q * 3 - (d.stops > 1 ? (d.stops - 1) * 0.6 : 0) - (dnf ? 0.8 : 0) + noise(3, 0.8),
        fortuna: dnf ? (dnf === "penalita" ? 3.6 : 2.4) + noise(4, 0.6) : 6.4 - q * 1.2 + noise(4, 1),
        strategia: 8.4 - q * 3.4 - (dnf === "penalita" ? 2 : dnf ? 1 : 0) + noise(5, 0.7),
      };
      const others = Math.round(60 + 520 * Math.exp(-q * 3.2) + rnd(i, 6) * 40);   // chi va forte riceve più voti
      const my = mine[d.id] || null, votes = others + (my ? 1 : 0), avg = {}, total = {};
      RATING_PARAMS.forEach(([k]) => { total[k] = clamp10(base[k]) * others + (my ? my[k] : 0); avg[k] = Math.round(total[k] / votes * 10) / 10; });
      out[d.id] = { avg, votes, total, mine: my };
    });
    return out;
  }

  // ── PIT STOP CHALLENGE ──────────────────────────────────────────────────
  // Mini-gioco: per ogni ruota 4 tocchi in ordine (svita, togli la gomma vecchia, monta la nuova, avvita).
  // Le 4 ruote sono indipendenti (si può giocare con due dita). Toccare di nuovo la stessa ruota prima che il
  // passo sia finito (lockMs) è un errore; toccare durante il semaforo è una partenza anticipata.
  const PIT_WHEELS = ["fl", "fr", "rl", "rr"];
  const PIT_STEPS = [["svita", "Svita"], ["togli", "Togli la gomma"], ["monta", "Monta la nuova"], ["avvita", "Avvita"]];
  const PIT_RULES = { lockMs: 110, errorMs: 200, falseStartMs: 500, target: 2.0 };
  const pitNew = () => ({ phase: "ready", steps: { fl: 0, fr: 0, rl: 0, rr: 0 }, last: {}, start: null, end: null, time: null, penaltyMs: 0, errors: 0 });
  const pitLights = s => ({ ...s, phase: "lights" });
  const pitGo = (s, now) => ({ ...s, phase: "go", start: now });
  function pitTap(s, wheel, now) {
    if (!PIT_WHEELS.includes(wheel) || s.phase === "done" || s.phase === "ready") return s;
    if (s.phase === "lights") return { ...s, penaltyMs: s.penaltyMs + PIT_RULES.falseStartMs, errors: s.errors + 1, falseStart: true };
    const n = s.steps[wheel]; if (n >= PIT_STEPS.length) return s;
    if (s.last[wheel] != null && now - s.last[wheel] < PIT_RULES.lockMs) return { ...s, penaltyMs: s.penaltyMs + PIT_RULES.errorMs, errors: s.errors + 1 };
    const steps = { ...s.steps, [wheel]: n + 1 }, last = { ...s.last, [wheel]: now };
    const done = PIT_WHEELS.every(w => steps[w] >= PIT_STEPS.length);
    return { ...s, steps, last, phase: done ? "done" : "go", end: done ? now : null, time: done ? Math.round((now - s.start + s.penaltyMs) / 10) / 100 : null };
  }
  const pitRating = t => t < 2 ? "record" : t < 2.5 ? "ottimo" : t < 3.2 ? "buono" : "lento";

  // ── SILLY SEASON PREDICTOR ──────────────────────────────────────────────
  // Quando arriva il comunicato ufficiale di un sedile: 10 punti se avevi detto il pilota giusto, più un bonus per
  // quanto prima l'avevi detto (60 giorni o più +20, 30 +15, 14 +10, 7 +5); +5 se avevi indovinato se il pilota
  // attuale rinnova o cambia. Una previsione fatta dopo il comunicato non vale.
  const SILLY_RULES = { right: 10, renew: 5, early: [[60, 20], [30, 15], [14, 10], [7, 5]] };
  function sillyPoints({ pred, official, current }) {
    if (!pred || !official) return { points: 0, days: 0, right: false, renewRight: false, bonus: 0 };
    if (pred.at > official.at) return { points: 0, days: 0, right: false, renewRight: false, bonus: 0, late: true };
    const days = Math.floor((official.at - pred.at) / 86400000), right = pred.pick === official.driver;
    const renewRight = !!pred.renew && (pred.renew === "rinnova") === (official.driver === current);
    const bonus = right ? (SILLY_RULES.early.find(([d]) => days >= d) || [0, 0])[1] : 0;
    return { points: (right ? SILLY_RULES.right + bonus : 0) + (renewRight ? SILLY_RULES.renew : 0), days, right, renewRight, bonus };
  }
  // Classifica: io e i tifosi simulati (demo; le loro previsioni sono fisse per ogni seme). official: { sedile: { driver, at } };
  // current: { sedile: pilota attuale }; mine: { sedile: { pick, renew, at } }.
  const SILLY_FANS = ["TifosoRosso_88", "BoxBoxGiulia", "PitWallPaolo", "Sara_Overtake", "MonzaLover", "Ale_GrandPrix", "LucaSlipstream", "ChiaraCurva1", "Fede_Parabolica"];
  function sillyBoard({ official, current, mine = {}, seed = 1 }) {
    const rnd = (i, j, k) => { const x = Math.sin((seed + 1) * 15.733 + i * 91.37 + j * 47.11 + k * 13.97) * 31758.5453; return x - Math.floor(x); };
    const seats = Object.keys(official);
    const sum = predOf => seats.reduce((a, id) => a + sillyPoints({ pred: predOf(id), official: official[id], current: current[id] }).points, 0);
    const rows = SILLY_FANS.map((name, i) => ({ name, me: false, points: sum((id, j = seats.indexOf(id)) => ({
      pick: rnd(i, j, 1) < 0.45 ? official[id].driver : "altro",
      renew: (rnd(i, j, 2) < 0.6) === (official[id].driver === current[id]) ? "rinnova" : "cambia",
      at: official[id].at - Math.floor(rnd(i, j, 3) * 90) * 86400000 })) }));
    rows.push({ name: "Tu", me: true, points: sum(id => mine[id]) });
    return rows.sort((a, b) => b.points - a.points || (a.me ? -1 : b.me ? 1 : 0));
  }

  // ── DRAG VS DOWNFORCE ───────────────────────────────────────────────────
  // Calcolatore didattico (stima B&T, non dati di squadra). share: parte del giro passata in rettilineo (sopra i
  // 250 km/h, dal profilo di velocità della pista); wing 0-10 (ala posteriore: 0 scarico, 10 massimo carico);
  // ride 0-10 (altezza da terra: 0 bassissima). Più ala = più carico ma più resistenza; il fondo basso dà carico
  // "gratis" (effetto suolo) finché la vettura non tocca l'asfalto (sotto 2).
  // Ala ideale: tanto più bassa quanto più giro si passa in rettilineo (Monza ~0,5, Monaco 10); altezza ideale 2,5.
  // Allontanarsi dall'ideale costa tempo (quadratico); le velocità sono stime lineari, solo per capire l'effetto.
  const aeroV = (w, r) => ({ vmax: 360 - 4.2 * w, vcorner: 160 + 3.4 * w + 2.2 * (10 - r) - (r < 2 ? 12 * (2 - r) : 0) });
  function aeroModel({ share, lapTime, wing, ride }) {
    const iw = Math.max(0, Math.min(10, Math.round(20 * (0.58 - share) / 0.5) / 2)), ir = 2.5;
    const v = aeroV(wing, ride), vi = aeroV(iw, ir), warnings = [];
    const loss = Math.round(vi.vmax - v.vmax), slow = Math.round(vi.vcorner - v.vcorner);
    if (loss >= 6) warnings.push({ kind: "drag", kmh: loss, text: `Troppo carico per questa pista. Perdita stimata di ${loss} km/h sul rettilineo principale!` });
    if (iw - wing >= 1.5 && slow >= 4 && ride >= 2) warnings.push({ kind: "grip", kmh: slow, text: `Troppo scarico: perdi ${slow} km/h di velocità in curva e le gomme scivolano (usura più alta).` });
    if (ride >= 6.5) warnings.push({ kind: "ride", text: `Vettura alta: perdi l'effetto suolo, circa ${Math.round(2.2 * (ride - ir))} km/h in curva.` });
    if (ride < 2) warnings.push({ kind: "bottoming", text: "Vettura troppo bassa: il fondo tocca l'asfalto (porpoising), perdi carico e rischi di danneggiarlo." });
    const pen = 0.012 * (wing - iw) ** 2 + 0.01 * (ride - ir) ** 2 + (ride < 2 ? 0.08 * (2 - ride) ** 2 : 0);
    return { vmax: Math.round(v.vmax), vcorner: Math.round(v.vcorner), lapDelta: Math.round(pen * lapTime) / 100, ideal: { wing: iw, ride: ir, vmax: Math.round(vi.vmax), vcorner: Math.round(vi.vcorner) }, warnings };
  }

  return { SESSION_MIN, startOf, endOf, wxLock, teamLock, countdown, RULES, aeroModel, sessionPoints, squadScore, transfers, nextFree, squadValue, canAfford, autoFill, bank, place, withPaid, clearSquad, norm, predictionCorrect, newsAge, newestFirst, RATING_PARAMS, communityRatings,
    PIT_WHEELS, PIT_STEPS, PIT_RULES, pitNew, pitLights, pitGo, pitTap, pitRating, SILLY_RULES, sillyPoints, SILLY_FANS, sillyBoard };
});
