// Conversioni tra i documenti Firebase dell'app di oggi e i formati della 2.0 (docs/riferimenti/confronto-app-oggi-2.0.md,
// tabelle B2 e B5). I documenti restano nel formato di oggi (l'app vecchia continua a leggerli); i campi in più della
// 2.0 viaggiano negli stessi oggetti, che l'app di oggi ignora.
const F1 = require("../data/f1-2026");
const CIRCUIT_INFO = require("../data/circuit-info.json");
const { cleanHelmet } = require("../logic/helmet");

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);   // come l'app di oggi
// Minuscolo e senza accenti (Montréal → montreal).
const strip = s => String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const isObj = v => v && typeof v === "object" && !Array.isArray(v);

// ── Date e ore (Europe/Rome) ───────────────────────────────────────────
const ROME = "Europe/Rome";
const ROME_FMT = new Intl.DateTimeFormat("en-GB", { timeZone: ROME, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
function romeParts(ms) {
  const o = {};
  ROME_FMT.formatToParts(new Date(ms)).forEach(p => { o[p.type] = p.value; });
  return o;
}
// Minuti di differenza tra l'ora italiana e UTC all'istante ms (+120 d'estate, +60 d'inverno).
function romeOffsetMin(ms) {
  const p = romeParts(ms);
  return Math.round((Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(ms / 1000) * 1000) / 60000);
}
const HAS_ZONE = /(Z|[+-]\d{2}:?\d{2})$/i;
// Data ISO → millisecondi. Le date senza fuso (come quelle dell'app di oggi) sono in ora italiana.
function parseDate(iso) {
  if (!iso || typeof iso !== "string") return NaN;
  const s = iso.trim();
  if (HAS_ZONE.test(s)) return Date.parse(s);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?)?$/);
  if (!m) return NaN;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
  const first = guess - romeOffsetMin(guess) * 60000;
  return guess - romeOffsetMin(first) * 60000;   // due passi: giusto anche vicino al cambio dell'ora
}
// Ora italiana senza fuso, come la scrive l'app di oggi: "2026-10-11T14:00:00".
function romeLocal(ms) {
  const p = romeParts(ms);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:00`;
}
const MESI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
// "26 set 2026" (anche con l'ora; mai NaN). Senza fuso conta la data scritta, col fuso la data in Italia.
function fmtDate(iso) {
  const s = typeof iso === "string" ? iso.trim() : "";
  let y, mo, d;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m && !HAS_ZONE.test(s)) { y = +m[1]; mo = +m[2]; d = +m[3]; }
  else {
    const t = parseDate(s);
    if (isNaN(t)) return "–";
    const p = romeParts(t);
    y = +p.year; mo = +p.month; d = +p.day;
  }
  if (!(mo >= 1 && mo <= 12 && d >= 1 && d <= 31)) return "–";
  return `${d} ${MESI[mo - 1]} ${y}`;
}
// "Adesso", "N min fa", "N h fa", "Ieri", "N giorni fa" (meno di 7), poi la data.
function relTime(iso, now = Date.now()) {
  const t = parseDate(iso);
  if (isNaN(t)) return "";
  const s = Math.max(0, (now - t) / 1000);
  if (s < 60) return "Adesso";
  if (s < 3600) return Math.floor(s / 60) + " min fa";
  if (s < 86400) return Math.floor(s / 3600) + " h fa";
  if (s < 2 * 86400) return "Ieri";
  if (s < 7 * 86400) return Math.floor(s / 86400) + " giorni fa";
  return fmtDate(iso);
}

// ── Notizie (shared/bt-news) ───────────────────────────────────────────
// Oggi summary/category/content; nella 2.0 excerpt/cat/body. "time" si calcola dalla data, non si salva.
const FREE_CATEGORIES = ["NEWS", "GARA", "APP", "ANALISI", "FANTA"];   // come l'app di oggi: le altre sono Premium
function newsFromStore(arr, now = Date.now()) {
  return (Array.isArray(arr) ? arr : []).filter(isObj).map(n => {
    const { summary, category, content, ...rest } = n;
    const cat = category || "NEWS";
    return {
      ...rest,
      id: String(n.id),
      excerpt: summary || "",
      cat,
      body: content || "",
      time: relTime(n.date, now),
      premium: n.premium != null ? !!n.premium : !FREE_CATEGORIES.includes(String(cat).toUpperCase()),
    };
  });
}
function newsToStore(list) {
  return (Array.isArray(list) ? list : []).filter(isObj).map(a => {
    const { excerpt, cat, body, time, ...rest } = a;
    return {
      ...rest,
      id: String(a.id),
      title: a.title || "",
      summary: excerpt != null ? excerpt : a.summary || "",
      category: cat || a.category || "NEWS",
      author: a.author || "Team B&T",
      image: a.image || "",
      content: body != null ? body : a.content || "",
      published: a.published !== false,
      date: a.date || new Date().toISOString(),
    };
  });
}

// ── Gare (shared/bt-races) ─────────────────────────────────────────────
// Parole che riconoscono il circuito nel nome, nel circuito o nel paese salvati oggi (testo libero dell'admin).
// L'ordine conta: Miami e Las Vegas prima degli Stati Uniti (Austin). "*" = basta l'inizio della parola.
const CIRCUIT_WORDS = [
  ["us-2022", ["miami"]],
  ["us-2023", ["las vegas", "vegas"]],
  ["es-2026", ["madring", "madrid"]],
  ["my-1999", ["sepang", "malesia", "malaysia", "bahrain", "sakhir"]],   // nel 2026 il GP del Bahrain si corre a Sepang
  ["au-1953", ["albert park", "melbourne", "australia"]],
  ["cn-2004", ["shanghai", "cina", "china"]],
  ["jp-1962", ["suzuka", "giappone", "japan"]],
  ["ca-1978", ["villeneuve", "montreal", "canada"]],
  ["mc-1929", ["monaco", "monte carlo", "montecarlo"]],
  ["es-1991", ["barcellona", "barcelona", "catalunya", "catalogna", "montmelo"]],
  ["at-1969", ["red bull ring", "spielberg", "austria"]],
  ["gb-1948", ["silverstone", "gran bretagna", "great britain", "regno unito", "british"]],
  ["be-1925", ["spa", "francorchamps", "belgio", "belgium"]],
  ["hu-1986", ["hungaroring", "ungheria", "hungary"]],
  ["nl-1948", ["zandvoort", "olanda", "paesi bassi", "netherlands", "dutch"]],
  ["it-1922", ["monza", "italia", "italy"]],
  ["az-2016", ["baku", "azerbai*"]],
  ["sg-2008", ["marina bay", "singapore"]],
  ["us-2012", ["americas", "austin", "cota", "stati uniti", "united states"]],
  ["mx-1962", ["messico", "mexico", "hermanos rodriguez"]],
  ["br-1940", ["interlagos", "san paolo", "sao paulo", "brasile", "brazil"]],
  ["qa-2004", ["lusail", "qatar"]],
  ["ae-2009", ["yas marina", "abu dhabi", "emirati"]],
].map(([id, words]) => [id, words.map(w => new RegExp("\\b" + w.replace("*", "") + (w.endsWith("*") ? "" : "\\b")))]);
function circuitIdOf(race) {
  if (!isObj(race)) return null;
  if (race.circuitId && F1.CIRCUIT_IDS.includes(race.circuitId)) return race.circuitId;
  const text = strip([race.name, race.circuit, race.country].join(" "));
  const hit = CIRCUIT_WORDS.find(([, res]) => res.some(re => re.test(text)));
  return hit ? hit[0] : null;
}
function raceDayPassed(date, now) {   // il giorno della gara è già finito, in Italia
  const day = String(date || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const p = romeParts(now);
  return day < `${p.year}-${p.month}-${p.day}`;
}
// Stato della gara (24/10). Con gli orari ufficiali del weekend (CIRCUIT_INFO.weekend) cambia da solo: IN ARRIVO fino a
// 30 minuti prima della prima sessione, LIVE fino a 4 ore dopo la partenza della gara, poi CONCLUSA. Prima la gara era
// LIVE solo se l'admin la metteva così (in shared/bt-races, che spesso non c'è): nel weekend la diretta non partiva.
// Lo stato salvato: LIVE vale da 3 giorni prima della prima sessione a 6 ore dopo la partenza (l'admin apre prima o
// tiene aperta la diretta); CONCLUSA chiude prima la diretta; IN ARRIVO è quello di serie (spesso vecchio) e non conta.
// Senza orari ufficiali (le gare passate prima della Malesia) vale lo stato salvato, se no la data, come prima.
const HOUR = 3600000;
const AUTO_LIVE_BEFORE_MS = 30 * 60000, AUTO_LIVE_AFTER_MS = 4 * HOUR, SAVED_LIVE_BEFORE_MS = 72 * HOUR, SAVED_LIVE_AFTER_MS = 6 * HOUR;
function weekendSpan(circuitId) {
  const info = CIRCUIT_INFO[circuitId];
  const times = (info && Array.isArray(info.weekend) ? info.weekend : []).map(s => ({ key: s && s.key, at: Date.parse(s && s.utc) })).filter(s => isFinite(s.at));
  const race = times.find(s => s.key === "RACE");
  return race ? { first: Math.min(...times.map(s => s.at)), race: race.at } : null;
}
function raceStatusAt(race, saved, now) {
  const ok = F1.RACE_STATUSES.includes(saved) ? saved : null;
  const span = weekendSpan(race.circuitId);
  if (!span) return ok || (raceDayPassed(race.date, now) ? "CONCLUSA" : "IN ARRIVO");
  if (ok === "CONCLUSA") return "CONCLUSA";
  if (ok === "LIVE" && now >= span.first - SAVED_LIVE_BEFORE_MS && now <= span.race + SAVED_LIVE_AFTER_MS) return "LIVE";
  return now < span.first - AUTO_LIVE_BEFORE_MS ? "IN ARRIVO" : now <= span.race + AUTO_LIVE_AFTER_MS ? "LIVE" : "CONCLUSA";
}
// Una sola gara LIVE: resta quella con la partenza più vicina a adesso (un LIVE dimenticato non ruba il weekend in corso).
function oneLive(races, now) {
  const live = races.filter(r => r.status === "LIVE");
  if (live.length < 2) return races;
  const startOf = r => { const s = weekendSpan(r.circuitId); return s ? s.race : Date.parse(String(r.date).slice(0, 10) + "T12:00:00Z"); };
  const keep = live.reduce((a, b) => (Math.abs(startOf(b) - now) < Math.abs(startOf(a) - now) ? b : a));
  return races.map(r => (r.status === "LIVE" && r !== keep ? { ...r, status: raceDayPassed(r.date, now) ? "CONCLUSA" : "IN ARRIVO" } : r));
}
// Lo stato con l'ora nuova (l'app resta aperta durante il weekend). Se non cambia niente, la stessa lista.
function raceStatusesAt(races, now = Date.now()) {
  if (!Array.isArray(races)) return races;
  const next = oneLive(races.map(r => { const s = raceStatusAt(r, r.savedStatus, now); return s === r.status ? r : { ...r, status: s }; }), now);
  return next.every((r, i) => r === races[i]) ? races : next;
}
// Calendario della 2.0 (base, 23 gare verificate) con lo stato salvato oggi; le gare salvate che non corrispondono
// restano in extra, così nel salvataggio non si perdono.
function mergeRaces(base, stored, now = Date.now()) {
  const list = (Array.isArray(stored) ? stored : []).filter(isObj);
  const byCircuit = new Map(), extra = [];
  const ids = new Set((base || []).map(b => b.circuitId));
  list.forEach(s => {
    const cid = circuitIdOf(s);
    if (cid && ids.has(cid) && !byCircuit.has(cid)) byCircuit.set(cid, s);
    else extra.push(s);
  });
  const races = (base || []).map(b => {
    const s = byCircuit.get(b.circuitId);
    const saved = s && F1.RACE_STATUSES.includes(s.status) ? s.status : null;
    const out = { ...b, status: raceStatusAt(b, saved, now) };
    if (saved) out.savedStatus = saved;   // lo stato salvato: con l'ora nuova si ricalcola (raceStatusesAt)
    if (s && typeof s.date === "string") out.savedStart = s.date;   // l'ora salvata, per le gare senza orario ufficiale
    return out;
  });
  return { races: oneLive(races, now), extra };
}
// Partenza della gara in ora italiana senza fuso: dagli orari ufficiali di CIRCUIT_INFO; se mancano, l'ora salvata
// quel giorno; altrimenti le 15:00.
function raceStart(r) {
  const info = CIRCUIT_INFO[r.circuitId];
  const w = info && Array.isArray(info.weekend) ? info.weekend.find(x => x.key === "RACE") : null;
  if (w && w.utc && !isNaN(Date.parse(w.utc))) return romeLocal(Date.parse(w.utc));
  const day = String(r.date || "").slice(0, 10), saved = String(r.savedStart || "");
  const hm = saved.slice(0, 10) === day && saved.match(/T(\d{2}):(\d{2})/);
  return `${day}T${hm ? hm[1] + ":" + hm[2] : "15:00"}:00`;
}
function racesToStore(races, extra = []) {
  const out = (Array.isArray(races) ? races : []).map(r => ({
    id: r.id,
    name: r.name,
    circuit: r.circuit,
    country: r.country,
    round: Number(r.round) || 0,
    date: raceStart(r),
    status: r.status,
    totalLaps: (CIRCUIT_INFO[r.circuitId] || {}).laps || 57,
    circuitId: r.circuitId || null,
  }));
  return [...out, ...(Array.isArray(extra) ? extra : [])];
}

// ── Classifiche (shared/bt-piloti e shared/bt-costruttori) ─────────────
// Oggi: [{id: "p1", name, team, position, points}]; nella 2.0: [{id: "antonelli", position, points}].
const DRIVERS_LITE = F1.DRIVER_DATA.map(([id, name, full, teamId]) => ({ id, name, full, teamId }));
const TEAM_WORDS = [
  ["racingbulls", ["racing bulls", "rb f1", "visa", "rb"]],
  ["redbull", ["red bull"]],
  ["audi", ["sauber", "kick", "audi"]],
  ["astonmartin", ["aston"]],
  ["mercedes", ["mercedes"]], ["ferrari", ["ferrari"]], ["mclaren", ["mclaren"]], ["alpine", ["alpine"]],
  ["haas", ["haas"]], ["williams", ["williams"]], ["cadillac", ["cadillac"]],
].map(([id, words]) => [id, words.map(w => new RegExp("\\b" + w + "\\b"))]);
function teamIdOf(name) {
  const text = strip(name);
  const hit = TEAM_WORDS.find(([, res]) => res.some(re => re.test(text)));
  return hit ? hit[0] : null;
}
const lastWord = s => strip(s).trim().split(/\s+/).pop() || "";
function driverIdOf(name) {
  const n = strip(name).replace(/\s+/g, " ").trim();
  if (!n) return null;
  const full = DRIVERS_LITE.find(d => strip(d.full) === n);
  if (full) return full.id;
  const same = DRIVERS_LITE.filter(d => lastWord(d.full) === lastWord(n));
  return same.length === 1 ? same[0].id : null;
}
const teamById = id => F1.TEAMS.find(t => t.id === id) || null;
const num = v => (v == null || v === "" ? null : Number(v));
// Tappa 3 (G20): prevPosition = la posizione prima dell'ultima gara (la salva la 2.0 quando l'admin mette i punti di una
// gara nuova), per le frecce del mondiale. L'app di oggi non la scrive: senza, il campo non c'è e le frecce nemmeno.
const withPrev = (row, prev) => { const n = num(prev); if (Number.isInteger(n) && n > 0) row.prev = n; return row; };
const prevField = r => (Number.isInteger(r.prev) && r.prev > 0 ? { prevPosition: r.prev } : {});
function standingsFromStore({ piloti, costruttori } = {}) {
  const guests = {};
  const drivers = (Array.isArray(piloti) ? piloti : []).filter(isObj).map(p => {
    let id = driverIdOf(p.name);
    if (!id) {   // non è tra i 22 titolari: ospite, come Tsunoda nella 2.0
      const words = String(p.name || "").trim().split(/\s+/).filter(Boolean);
      id = "x-" + (lastWord(p.name).replace(/[^a-z0-9]/g, "") || "pilota");
      const teamId = teamIdOf(p.team), t = teamById(teamId);
      guests[id] = {
        id, guest: true, full: p.name || "",
        name: words.length > 1 ? `${words[0][0]}. ${words.slice(1).join(" ")}` : p.name || "",
        teamId, team: t ? t.name : p.team || "", color: t ? t.color : "#9AA0A6",
      };
    }
    return withPrev({ id, position: num(p.position), points: num(p.points), oldId: p.id }, p.prevPosition);
  });
  const teams = (Array.isArray(costruttori) ? costruttori : []).filter(isObj)
    .map(c => withPrev({ id: teamIdOf(c.name), position: num(c.position), points: num(c.points), oldId: c.id }, c.prevPosition))
    .filter(c => c.id);   // una scuderia che non c'è nel 2026 non si mostra
  return { drivers, teams, guests };
}
function standingsToStore(st = {}) {
  const guests = st.guests || {};
  const piloti = (st.drivers || []).map(r => {
    const d = DRIVERS_LITE.find(x => x.id === r.id), g = guests[r.id];
    const t = teamById(d ? d.teamId : g ? g.teamId : null);
    return {
      id: r.oldId || "p-" + r.id,
      name: d ? d.full : g ? g.full : r.id,
      team: t ? t.name.toUpperCase() : g && g.team ? String(g.team).toUpperCase() : "",
      position: num(r.position),
      points: num(r.points),
      ...prevField(r),
    };
  });
  const costruttori = (st.teams || []).map(r => {
    const t = teamById(r.id);
    return { id: r.oldId || "c-" + r.id, name: t ? t.name : r.id, position: num(r.position), points: num(r.points), ...prevField(r) };
  });
  return { piloti, costruttori };
}

// ── Notifiche (shared/bt-notifs) ───────────────────────────────────────
// Oggi {id, title, text, date, read: false}; "letta" = più vecchia di notifSeenAt dell'account.
function notifsFromStore(arr, seenAt = 0, now = Date.now()) {
  return (Array.isArray(arr) ? arr : []).filter(isObj)
    .map(n => ({ id: String(n.id), title: n.title || "", body: n.text || n.body || "", date: n.date || "", time: relTime(n.date, now), unread: (parseDate(n.date) || 0) > (seenAt || 0) }))
    .sort((a, b) => (parseDate(b.date) || 0) - (parseDate(a.date) || 0));
}
function notifToStore({ title, body } = {}, now = Date.now()) {
  return { id: uid(), title: title || "", text: body || "", date: new Date(now).toISOString(), read: false };
}

// ── Instagram (shared/bt-ig-config) ────────────────────────────────────
// Oggi {followers, videos: [{id, title, thumbnail, views, likes, url}]}; in più handle e posts. Niente numeri inventati.
// 25/10: per ogni reel anche una descrizione breve (desc, al massimo 40 caratteri: va sulla copertina) e la data di
// uscita (date, AAAA-MM-GG: ultimo reel, "NUOVO", più visti del mese). L'app di oggi non le legge.
const igDesc = v => String(v == null ? "" : v).trim().slice(0, 40);
const igDate = v => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v)) ? v : "");
function igFromStore(doc) {
  const d = isObj(doc) ? doc : {};
  return {
    handle: d.handle || "bt_formula1",
    followers: d.followers == null ? null : d.followers,
    posts: d.posts == null ? null : d.posts,
    videos: (Array.isArray(d.videos) ? d.videos : []).filter(isObj).map(v => ({
      id: String(v.id), title: v.title || "", views: v.views == null ? "" : v.views, likes: v.likes == null ? "" : v.likes,
      thumb: v.thumbnail || v.thumb || "", url: v.url || "", desc: igDesc(v.desc), date: igDate(v.date),
    })),
  };
}
function igToStore(ig = {}) {
  return {
    handle: ig.handle || "bt_formula1",
    followers: ig.followers == null ? null : ig.followers,
    posts: ig.posts == null ? null : ig.posts,
    videos: (ig.videos || []).map(v => ({ id: String(v.id), title: v.title || "", thumbnail: v.thumb || "", views: v.views == null ? "" : v.views, likes: v.likes == null ? "" : v.likes, url: v.url || "", desc: igDesc(v.desc), date: igDate(v.date) })),
  };
}
const igProfileUrl = handle => `https://www.instagram.com/${String(handle || "bt_formula1").replace(/^@/, "")}/`;

// ── Chat (shared/bt-chat-*) e segnalazioni (shared/bt-chat-reports) ────
const CHAT_DB_KEY = { generale: "bt-chat-generale", live: "bt-chat-live-gara", fanta: "bt-chat-fantaf1-talk", radio: "bt-chat-boxradio", paddock: "bt-chat-paddocktalk" };
const ROOM_OLD_KEY = { generale: "generale", live: "live", fanta: "fantaf1", radio: "boxradio", paddock: "paddock" };
// ID autore anonimo e stabile (impronta dell'email), copiato dall'app di oggi: serve a bloccare e moderare senza
// mettere l'email nei messaggi.
function authorId(email) {
  const s = String(email || "").toLowerCase().trim();
  let h1 = 0x811c9dc5, h2 = 0x9747b28c;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 ^ c, 2246822519) >>> 0;
  }
  return "u" + h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
}
// Stesso autore? ID con ID; il nome si usa solo quando mancano entrambi gli ID (messaggi vecchi), come oggi.
function sameAuthor(a, m) {
  if (!a || !m) return false;
  const x = a.aid || "", y = m.aid || "";
  if (x && y) return x === y;
  if (!x && !y) return (a.name || a.user) === (m.user || m.name);
  return false;
}
// Medaglia dei trofei (Tappa 3, G31) accanto al nome: campo in più che l'app di oggi ignora.
const CHAT_MEDALS = ["bronzo", "argento", "oro"];
const medalOk = v => (CHAT_MEDALS.includes(v) ? v : null);
// 25/10: reazioni come su WhatsApp. Ogni reazione è una voce della stanza {id, user, aid, re: id del messaggio, e, t}
// (aggiunta con arrayUnion come i messaggi, così bastano le regole di oggi); una per persona e per messaggio: vale
// l'ultima. L'app di oggi non le conosce.
const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
const isReaction = m => typeof m.re === "string" && m.re !== "";
const whoKey = m => (m.aid ? "a:" + m.aid : "n:" + (m.user || ""));
// [{ e, n, mine }]: più reazioni prima; a pari numero nell'ordine di REACTIONS.
const sortReactions = l => l.filter(r => r.n > 0).sort((a, b) => b.n - a.n || REACTIONS.indexOf(a.e) - REACTIONS.indexOf(b.e));
// Profilo veloce nel messaggio (p): squadra (t) e pilota (d) del cuore, tipo di tifoso (f), casco (h), trofei vinti (w).
const idOk = (v, max) => (typeof v === "string" && /^[a-z0-9-]{1,40}$/.test(v) && v.length <= max ? v : null);
function profOf(p) {
  if (!isObj(p)) return null;
  const out = {};
  const t = idOk(p.t, 24), d = idOk(p.d, 30), f = idOk(p.f, 20);
  if (t) out.t = t; if (d) out.d = d; if (f) out.f = f;
  if (isObj(p.h)) out.h = cleanHelmet(p.h);
  if (Array.isArray(p.w)) { const w = p.w.filter(x => idOk(x, 24)).slice(0, 30); if (w.length) out.w = w; }
  return Object.keys(out).length ? out : null;
}
// 25/10: link a una cosa dell'app nel messaggio (k): { t, id, ti, su, ln, s/a/b/n (Ghost Lap), u (team radio) }.
// Solo testo e id: le foto le prende ogni telefono dai suoi dati (nessun indirizzo d'immagine da fuori); l'audio dei
// team radio solo dal sito della F1. L'app di oggi vede solo il testo (txt).
const LINK_TYPES = ["news", "race", "ghost", "radio", "driver", "team", "profile", "fanta", "games", "question"];
const lineOk = (v, n) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, n) : "");
function linkOf(k) {
  if (!isObj(k) || !LINK_TYPES.includes(k.t)) return null;
  const ti = lineOk(k.ti, 80);
  if (!ti) return null;
  const out = { t: k.t };
  if (typeof k.id === "string" && /^[A-Za-z0-9_-]{1,60}$/.test(k.id)) out.id = k.id;
  out.ti = ti;
  const su = lineOk(k.su, 120);
  if (su) out.su = su;
  if (Array.isArray(k.ln)) { const ln = k.ln.map(x => lineOk(x, 70)).filter(Boolean).slice(0, 8); if (ln.length) out.ln = ln; }
  if (k.t === "ghost") {
    if (typeof k.s === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(k.s)) out.s = k.s;
    ["a", "b"].forEach(x => { if (typeof k[x] === "string" && /^[A-Z]{3}$/.test(k[x])) out[x] = k[x]; });
    if (Number.isInteger(k.n) && k.n > 0 && k.n < 100) out.n = k.n;
  }
  if (k.t === "radio" && typeof k.u === "string" && /^https:\/\/livetiming\.formula1\.com\/[\w./-]+\.mp3$/i.test(k.u)) out.u = k.u;
  return out;
}
function chatFromStore(arr, me) {
  const myAid = (me && me.aid) || "", myName = (me && me.name) || "";
  const all = (Array.isArray(arr) ? arr : []).filter(isObj);
  const isMine = m => (m.aid ? !!myAid && m.aid === myAid : !!myName && m.user === myName);
  // Reazioni: per messaggio, per persona, l'ultima con un'emoji prevista.
  const last = new Map();   // id messaggio → Map(persona → { e, t, mine })
  all.filter(isReaction).filter(r => REACTIONS.includes(r.e)).forEach(r => {
    const per = last.get(r.re) || new Map(), k = whoKey(r), old = per.get(k);
    if (!old || (r.t || 0) >= old.t) per.set(k, { e: r.e, t: r.t || 0, mine: isMine(r) });
    last.set(r.re, per);
  });
  // 29/10: il profilo di ogni autore è l'ultimo che ha mandato, coi messaggi (p) o con la voce del profilo
  // ({pe: 1, p}, che entra nella stanza anche senza scrivere e non è un messaggio).
  const profBy = new Map();
  all.forEach(m => {
    const pr = !isReaction(m) && profOf(m.p);
    if (!pr) return;
    const k = whoKey(m), old = profBy.get(k);
    if (!old || (m.t || 0) >= old.t) profBy.set(k, { p: pr, t: m.t || 0 });
  });
  return all.filter(m => !isReaction(m) && m.pe !== 1).map(m => {
    const per = [...(last.get(String(m.id)) || new Map()).values()];
    const mineR = per.find(r => r.mine);
    const reactions = sortReactions(REACTIONS.map(e => ({ e, n: per.filter(r => r.e === e).length, mine: !!mineR && mineR.e === e })));
    return {
      id: String(m.id), from: m.user || "", text: m.txt || "", at: m.t || 0, aid: m.aid || "",
      mine: isMine(m), medal: medalOk(m.medal), prof: (profBy.get(whoKey(m)) || {}).p || null, link: linkOf(m.k), reactions, myReaction: mineR ? mineR.e : null,
    };
  });
}
// La reazione messa (o cambiata, o tolta con null) da chi usa l'app, subito sullo schermo: un messaggio nuovo.
function applyReaction(msg, emoji) {
  const e = REACTIONS.includes(emoji) ? emoji : null, prev = msg.myReaction || null;
  const counts = REACTIONS.map(x => { const r = (msg.reactions || []).find(y => y.e === x); return { e: x, n: (r ? r.n : 0) - (prev === x ? 1 : 0) + (e === x ? 1 : 0), mine: e === x }; });
  return { ...msg, reactions: sortReactions(counts), myReaction: e };
}
function reactionToStore(msgId, emoji, me, now = Date.now()) {
  if (!REACTIONS.includes(emoji)) return null;
  return { id: uid(), user: me.name, aid: me.aid || "", re: String(msgId), e: emoji, t: now };
}
function profileEntryToStore(me, now = Date.now()) {
  const p = profOf(me && me.p);
  return p && me.name ? { id: uid(), user: me.name, aid: me.aid || "", pe: 1, p, t: now } : null;
}
function chatMsgToStore(text, me, now = Date.now(), link = null) {
  const medal = medalOk(me && me.medal), p = profOf(me && me.p), k = linkOf(link);
  return { id: uid(), user: me.name, aid: me.aid || "", txt: text, t: now, ...(medal ? { medal } : {}), ...(p ? { p } : {}), ...(k ? { k } : {}) };
}
function reportToStore(roomId, msg, me, now = Date.now()) {
  return { id: uid(), room: ROOM_OLD_KEY[roomId] || roomId, msgId: msg.id, txt: msg.text, author: msg.from, aid: msg.aid || "", by: me.name, byAid: me.aid || "", t: now };
}
function reportFromStore(r) {
  const chatId = Object.keys(ROOM_OLD_KEY).find(k => ROOM_OLD_KEY[k] === r.room) || r.room;
  return { id: r.id, chatId, msgId: r.msgId, text: r.txt || "", author: r.author || "", aid: r.aid || "", by: r.by || "", byAid: r.byAid || "", t: r.t || 0 };
}

// ── Account (users/<email>) ────────────────────────────────────────────
// Ai campi che mancano (account vecchi senza "Su di te") si dà null; notif, plan, ts e pw di oggi non servono.
function profileFromStore(doc) {
  if (!isObj(doc)) return null;
  const a = isObj(doc.about) ? doc.about : {};
  const about = { birth: a.birth == null ? null : a.birth, follow: a.follow == null ? null : a.follow, fan: a.fan == null ? null : a.fan };
  if (Number.isInteger(a.years) && a.years >= 0) about.years = a.years;   // Tappa 3 (G16): anni da tifoso esatti
  return {
    name: doc.name || "",
    nick: doc.nick || doc.name || "",
    email: doc.email || "",
    about,
    app2: isObj(doc.app2) ? doc.app2 : {},
    isPremium: !!doc.isPremium,
  };
}

module.exports = {
  uid, parseDate, fmtDate, relTime, romeLocal,
  FREE_CATEGORIES, newsFromStore, newsToStore,
  circuitIdOf, mergeRaces, raceStatusesAt, racesToStore,
  teamIdOf, driverIdOf, standingsFromStore, standingsToStore,
  notifsFromStore, notifToStore,
  igFromStore, igToStore, igProfileUrl, linkOf, profileEntryToStore,
  CHAT_DB_KEY, ROOM_OLD_KEY, authorId, sameAuthor, chatFromStore, chatMsgToStore, reportToStore, reportFromStore,
  REACTIONS, applyReaction, reactionToStore,
  profileFromStore, profOf, medalOk,
};
