// Pit Swipe (1/11, Edoardo: "Tinder B&T News"; design in docs/design/pit-swipe.html, prove in test/unit/pitswipe.test.js).
// Le notizie del giorno come mazzo di carte (un "giro" di 10 curve), con opinioni da votare (voti veri), vero o falso
// fatto con i dati veri dell'app e la carta del pilota del cuore. Qui solo i calcoli: mazzo, gusti, voti, serie per GP con
// pit stop, missioni della settimana, livello del tifoso. Niente leghe a livelli (Edoardo, 1/11: no).
(function (root) {
  const DAY = 86400000, HOUR = 3600000;
  function romeParts(now) {
    const f = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" });
    const [y, m, d] = f.format(new Date(now)).split("-").map(Number);
    return [y, m, d];
  }
  const pad = n => String(n).padStart(2, "0");
  const romeDay = now => { const [y, m, d] = romeParts(now); return `${y}-${pad(m)}-${pad(d)}`; };
  const hash = s => { let h = 5381; for (const ch of String(s)) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0; return h; };
  const isNum = v => typeof v === "number" && isFinite(v);

  // ── Mazzo ────────────────────────────────────────────────────────────
  // Mazzo nuovo alle 8:00 di Roma e dopo ogni sessione del weekend finita (ends: fine delle sessioni, ms).
  function deckKey(now, ends = []) {
    const day = romeDay(now - 8 * HOUR);
    const n = (ends || []).filter(e => isNum(e) && e <= now && romeDay(e - 8 * HOUR) === day).length;
    return day + "#" + n;
  }
  // Notizie (le più nuove prima): punteggio coi gusti e col pilota/scuderia del cuore; mode "date" = solo per data.
  function scoreNews(n, i, weights, fav) {
    const tp = n.topics || [];
    let s = tp.reduce((a, t) => a + (weights[t] || 0), 0);
    if (fav.driver && tp.includes("d:" + fav.driver)) s += 3;
    if (fav.team && tp.includes("t:" + fav.team)) s += 3;
    return s - i * 0.01;
  }
  const PATTERN = ["news", "news", "take", "news", "tf", "news", "take", "news", "news"];
  function buildDeck({ news = [], takes = [], voted = {}, facts = [], driverCard = null, weights = {}, fav = {}, mode = "taste", key = "" } = {}) {
    const cand = (news || []).filter(Boolean).slice(0, 20);
    const ranked = mode === "date" ? cand.slice(0, 6)
      : cand.map((n, i) => [n, scoreNews(n, i, weights || {}, fav || {})]).sort((a, b) => b[1] - a[1]).slice(0, 6).map(x => x[0]);
    const pools = {
      news: ranked.map(n => ({ ...n, kind: "news" })),
      take: (takes || []).filter(t => t && t.id && t.on !== false && !(voted && voted[t.id] != null)).slice(0, 2).map(t => ({ ...t, kind: "take" })),
      tf: facts && facts.length ? [{ ...pickFact(facts, key), kind: "tf" }] : [],
    };
    const out = [];
    PATTERN.forEach(k => { if (pools[k].length) out.push(pools[k].shift()); });
    out.push(...pools.news);
    if (driverCard && driverCard.id) out.push({ ...driverCard, kind: "driver" });
    return out;
  }
  // Gusti: un peso per argomento (t:scuderia, d:pilota, c:categoria), da −5 a 10.
  const DELTA = { box: 2, fast: 3, out: -1, radio: 2 };
  function applySwipe(weights, topics, act) {
    const w = { ...(weights || {}) };
    const d = DELTA[act];
    if (d == null) return w;
    (topics || []).forEach(t => { w[t] = Math.max(-5, Math.min(10, (w[t] || 0) + d)); });
    return w;
  }
  function whyReasons(card, { fav = {}, weights = {}, hot = false, labelOf = x => x } = {}) {
    const tp = (card && card.topics) || [], out = [];
    if (fav.driver && tp.includes("d:" + fav.driver)) out.push("Parla del tuo pilota del cuore");
    if (fav.team && tp.includes("t:" + fav.team)) out.push("Parla della tua scuderia del cuore");
    const liked = tp.filter(t => (weights[t] || 0) >= 2 && t !== "d:" + fav.driver && t !== "t:" + fav.team).sort((a, b) => weights[b] - weights[a])[0];
    if (liked) out.push(`Hai messo nel box altre notizie di ${labelOf(liked)}`);
    if (hot) out.push("È tra le più votate di oggi");
    return out.length ? out : ["Una delle notizie più nuove"];
  }

  // ── Voti (fanta/pitswipe-voti: elenco { k: "t" opinione | "f" giro veloce, id, aid, v: 1 | -1 }) ──────────
  function tallyVotes(arr) {
    const out = {};
    (Array.isArray(arr) ? arr : []).forEach(x => {
      if (!x || !x.k || x.id == null || !x.aid || (x.v !== 1 && x.v !== -1)) return;
      const key = x.k + ":" + x.id;
      (out[key] = out[key] || { byAid: {} }).byAid[x.aid] = x.v;   // vale l'ultimo voto dell'account
    });
    Object.values(out).forEach(t => { const v = Object.values(t.byAid); t.agree = v.filter(x => x === 1).length; t.disagree = v.length - t.agree; t.total = v.length; });
    return out;
  }
  function pctOf(t, min = 20) {
    if (!t || !t.total || t.total < min) return null;
    const agree = Math.round(t.agree / t.total * 100);
    return { agree, disagree: 100 - agree, total: t.total };
  }
  function sameStrategy(tally, me, other) {
    let same = 0, both = 0;
    Object.entries(tally || {}).forEach(([k, t]) => {
      if (!k.startsWith("t:")) return;
      const a = t.byAid[me], b = t.byAid[other];
      if (a == null || b == null) return;
      both++; if (a === b) same++;
    });
    return { same, both };
  }

  // ── Vero o falso, solo dai dati veri dell'app (piloti e circuiti) ─────────────────────────────
  const km = v => v.toFixed(3).replace(".", ",");
  function makeFacts({ drivers = [], circuits = {} } = {}) {
    const out = [];
    const add = (id, tTrue, tFalse, note) => { out.push({ id: id + ":v", text: tTrue, truth: true, note: "Vero." }); out.push({ id: id + ":f", text: tFalse, truth: false, note }); };
    const cities = drivers.map(d => String(d[4] || "").split(",")[0].trim()).filter(Boolean);
    drivers.forEach((d, i) => {
      const [id, , full, , born, , , , titles] = d;
      if (isNum(titles)) {
        const w = n => n === 1 ? "1 mondiale" : n + " mondiali";
        if (titles > 0) add("titles:" + id, `${full} ha vinto ${w(titles)}.`, `${full} ha vinto ${w(titles + 1)}.`, `Falso: ${full} ha vinto ${w(titles)}.`);
        else add("titles:" + id, `${full} non ha ancora vinto un mondiale.`, `${full} ha vinto 1 mondiale.`, `Falso: ${full} non ha ancora vinto un mondiale.`);
      }
      const city = String(born || "").split(",")[0].trim();
      const other = cities.find((c, j) => c && c !== city && j > i) || cities.find(c => c && c !== city);
      if (city && other) add("born:" + id, `${full} è nato a ${city}.`, `${full} è nato a ${other}.`, `Falso: ${full} è nato a ${city}.`);
    });
    const ids = Object.keys(circuits || {});
    ids.forEach((cid, i) => {
      const c = circuits[cid] || {}, tag = c.tag;
      if (!tag) return;
      if (isNum(c.lengthKm)) add("len:" + cid, `Il circuito di ${tag} è lungo ${km(c.lengthKm)} km.`, `Il circuito di ${tag} è lungo ${km(c.lengthKm + 0.4)} km.`, `Falso: è lungo ${km(c.lengthKm)} km.`);
      if (isNum(c.corners)) add("corners:" + cid, `Il circuito di ${tag} ha ${c.corners} curve.`, `Il circuito di ${tag} ha ${c.corners + 3} curve.`, `Falso: le curve sono ${c.corners}.`);
      if (isNum(c.laps)) add("laps:" + cid, `Il GP a ${tag} dura ${c.laps} giri.`, `Il GP a ${tag} dura ${c.laps + 4} giri.`, `Falso: i giri sono ${c.laps}.`);
      if (isNum(c.firstGP)) add("first:" + cid, `Il primo GP di F1 a ${tag} si è corso nel ${c.firstGP}.`, `Il primo GP di F1 a ${tag} si è corso nel ${c.firstGP + 6}.`, `Falso: il primo fu nel ${c.firstGP}.`);
      const rec = c.lapRecord, otherRec = ids.map(x => circuits[x] && circuits[x].lapRecord).find(r => r && rec && r.driver !== rec.driver);
      if (rec && rec.driver && rec.time && otherRec) add("rec:" + cid, `Il record sul giro a ${tag} è di ${rec.driver} (${rec.time}).`, `Il record sul giro a ${tag} è di ${otherRec.driver} (${rec.time}).`, `Falso: è di ${rec.driver} (${rec.time}, ${rec.year}).`);
    });
    return out;
  }
  const pickFact = (facts, key) => facts[hash("tf" + key) % facts.length];

  // ── Serie per GP, con pit stop salva-serie ───────────────────────────
  // GP del momento: quello il cui periodo (dal martedì dopo il GP prima al lunedì dopo il suo) contiene adesso.
  function roundOf(races, now) {
    const list = (races || []).filter(r => r && r.id && r.date).slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const hit = list.find(r => Date.parse(String(r.date).slice(0, 10) + "T00:00:00Z") + 2 * DAY > now);
    return hit ? hit.id : null;
  }
  const idx = (rounds, id) => (rounds || []).indexOf(id);
  function streakAfterDeck(st, { round, rounds } = {}) {
    const s = { n: 0, last: null, pits: 0, decks: 0, ...(st || {}) };
    s.decks += 1;
    if (s.decks % 5 === 0) s.pits = Math.min(2, s.pits + 1);
    if (!round || s.last === round) return s;
    if (!s.last) s.n = 1;
    else {
      const gap = idx(rounds, round) - idx(rounds, s.last) - 1;
      if (gap <= 0) s.n += 1;
      else if (s.pits >= gap) { s.pits -= gap; s.n += 1; }
      else s.n = 1;
    }
    s.last = round;
    return s;
  }
  function streakNow(st, { round, rounds } = {}) {
    if (!st || !st.last || !st.n) return { n: 0, danger: false };
    if (st.last === round) return { n: st.n, danger: false };
    const gap = idx(rounds, round) - idx(rounds, st.last) - 1;
    return gap <= (st.pits || 0) ? { n: st.n, danger: true } : { n: 0, danger: false };
  }

  // ── Missioni della settimana (settimana ISO, a Roma) ─────────────────
  function weekKey(now) {
    const [y, m, d] = romeParts(now);
    const dt = new Date(Date.UTC(y, m - 1, d));
    const dow = (dt.getUTCDay() + 6) % 7;
    dt.setUTCDate(dt.getUTCDate() - dow + 3);   // il giovedì della settimana
    const wy = dt.getUTCFullYear();
    const first = new Date(Date.UTC(wy, 0, 4));
    const week = 1 + Math.round(((dt - first) / DAY - 3 + ((first.getUTCDay() + 6) % 7)) / 7);
    return `${wy}-W${pad(week)}`;
  }
  const MISSIONS = [
    { id: "giri3", ev: "decks", goal: 3, text: "Completa 3 giri di Pit Swipe" },
    { id: "box5", ev: "box", goal: 5, text: "Metti 5 notizie nel box" },
    { id: "voti3", ev: "votes", goal: 3, text: "Vota 3 opinioni" },
    { id: "tf2", ev: "tfOk", goal: 2, text: "Indovina 2 vero o falso" },
    { id: "radio1", ev: "radio", goal: 1, text: "Manda una carta in chat" },
    { id: "pit1", ev: "pit", goal: 1, text: "Gioca al Pit Stop Challenge" },
    { id: "fast1", ev: "fast", goal: 1, text: "Dai il giro veloce a una notizia" },
    { id: "pred1", ev: "pred", goal: 1, text: "Fai un pronostico del weekend" },
  ];
  function missionsFor(week) {
    const order = MISSIONS.map((m, i) => [m, hash(week + ":" + m.id)]).sort((a, b) => a[1] - b[1]).map(x => x[0]);
    return order.slice(0, 3);
  }
  function bumpWeek(ws, ev, n = 1, week) {
    const base = ws && ws.key === week ? ws : { key: week, c: {} };
    return { key: week, c: { ...base.c, [ev]: (base.c[ev] || 0) + n } };
  }
  function missionStatus(ws, week) {
    const c = ws && ws.key === week ? ws.c || {} : {};
    return missionsFor(week).map(m => { const value = Math.min(m.goal, c[m.ev] || 0); return { id: m.id, text: m.text, goal: m.goal, value, done: value >= m.goal }; });
  }

  // ── Livello del tifoso ───────────────────────────────────────────────
  const LEVELS = [["Kart", 0], ["Rookie", 100], ["Pilota titolare", 300], ["Caposquadra", 700], ["Leggenda del paddock", 1500], ["Campione del mondo", 3000]];
  function xpOf(tot = {}, trophies = 0) {
    const n = k => (isNum(tot[k]) ? tot[k] : 0);
    return n("decks") * 10 + n("tfOk") * 5 + n("votes") * 2 + n("box") + n("missions") * 30 + (isNum(trophies) ? trophies : 0) * 50;
  }
  function levelOf(xp) {
    let i = 0;
    LEVELS.forEach(([, at], j) => { if (xp >= at) i = j; });
    const [name, at] = LEVELS[i], next = LEVELS[i + 1];
    return { idx: i, name, at, nextName: next ? next[0] : null, nextAt: next ? next[1] : null, toNext: next ? next[1] - xp : 0, frac: next ? (xp - at) / (next[1] - at) : 1 };
  }

  // Piove adesso? Dalla previsione vera (MET Norway, src/services/meteo.js: ore { t, step, rain, sym }).
  function rainingNow(fc, now) {
    const h = fc && Array.isArray(fc.hours) ? fc.hours.find(x => { const t = Date.parse(x.t); return t <= now && now < t + (x.step || 1) * HOUR; }) : null;
    return !!h && ((isNum(h.rain) && h.rain >= 0.2) || /rain|sleet|shower|thunder|drizzle/.test(String(h.sym || "")));
  }
  // Easter egg (trofeo segreto "Ingegnere di pista" con tutti e sei).
  const EGGS = ["donuts", "limiti", "pioggia", "launch", "radio", "muretto"];

  const api = { deckKey, buildDeck, applySwipe, whyReasons, tallyVotes, pctOf, sameStrategy, makeFacts, pickFact, roundOf,
    streakAfterDeck, streakNow, rainingNow, weekKey, MISSIONS, missionsFor, bumpWeek, missionStatus, LEVELS, xpOf, levelOf, EGGS, romeDay };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.BtPitSwipe = api;
})(typeof window !== "undefined" ? window : this);
