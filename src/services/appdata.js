// Contenuti condivisi (shared/<documento>) e dati personali (users/<email>.app2) della nuova app su Firebase.
// I documenti restano nel formato dell'app di oggi (B2 di docs/riferimenti/confronto-app-oggi-2.0.md), che continua a
// leggerli; le conversioni da e verso le forme della 2.0 sono in compat.js. Qui si decide cosa si legge, cosa si scrive
// e quando:
// - loadShared legge tutti i documenti insieme; se un documento non c'è vale il suo valore di serie (SHARED_DOCS);
// - saveShared rilegge i documenti, converte e scrive, oppure lancia l'errore (chi chiama avvisa "Non salvato"). Gli
//   stessi documenti li scrivono anche l'app di oggi e gli altri telefoni degli admin (revisione della Fase B, C2 e I4):
//   una modifica data come funzione si applica ai documenti appena riletti; un valore intero (la bozza di una scheda
//   del Pannello) si scrive solo se i documenti sono ancora come all'ultima lettura di questo telefono, altrimenti
//   errore "changed" (o "stale", se all'avvio non si erano potuti leggere) con il valore nuovo da rimettere sullo schermo;
// - i dati personali si salvano 800 ms dopo l'ultima modifica, tutti insieme, nel campo app2 dell'account.
const FB = require("./firebase");
const C = require("./compat");
const F1 = require("../data/f1-2026");
const T = require("../logic/trophies");

const isObj = v => v && typeof v === "object" && !Array.isArray(v);
const list = v => (Array.isArray(v) ? v.filter(isObj) : []);
const obj = v => (isObj(v) ? v : {});
// Foto di Commons scelte dall'admin (G30): { drivers, cars, logos } con solo nomi di file ("File:…").
const fileMap = v => Object.fromEntries(Object.entries(obj(v)).filter(([, f]) => typeof f === "string" && f));
const commonsOf = v => ({ drivers: fileMap(obj(v).drivers), cars: fileMap(obj(v).cars), logos: fileMap(obj(v).logos) });
const clone = v => JSON.parse(JSON.stringify(v));
const mkErr = (code, message) => Object.assign(new Error(message || code), { code });

// Notizia di benvenuto dell'app di oggi (D_NEWS di bt-app-flutter/src/App.jsx): si vede finché l'admin non salva bt-news.
const D_NEWS = [{ id: "n1", title: "Vi presentiamo l'app B&T!!", summary: "Introduzione all'app ufficiale", category: "APP", author: "Team B&T", image: "", published: true, date: "2026-09-01T10:00:00",
  content: "Benvenuti nell'app ufficiale B&T Formula1!\n\nQui troverete tutte le ultime notizie, classifiche mondiali in tempo reale, live race tracking con dati dalle gomme ai distacchi, e presto anche il Fanta F1.\n\nRestate sintonizzati per tutti gli aggiornamenti della stagione 2026!" }];

// Previsioni: nella 2.0 le risposte sono [id, testo]; Firestore non accetta array dentro array, quindi si salvano {id, label}.
const predictionsToStore = qs => list(qs).map(q => (Array.isArray(q.options) ? { ...q, options: q.options.map(o => (Array.isArray(o) ? { id: o[0], label: o[1] } : o)) } : q));
const predictionsFromStore = qs => list(qs).map(q => (Array.isArray(q.options) ? { ...q, options: q.options.map(o => (isObj(o) ? [o.id, o.label] : o)) } : q));

// FantaF1: { drivers: { id: { price, change, pts } }, teams: {…} } (documento nuovo, già nella forma della 2.0).
const fantaRows = o => Object.fromEntries(Object.entries(o).map(([id, [price, change, pts]]) => [id, { price, change, pts }]));
const FANTA_DEFAULT = { drivers: fantaRows(F1.FANTASY.drivers), teams: fantaRows(F1.FANTASY.teams) };
const fantaOf = d => (isObj(d) && isObj(d.drivers) && isObj(d.teams) ? { drivers: d.drivers, teams: d.teams } : clone(FANTA_DEFAULT));

// Classifiche della 2.0 (R02) nel formato di oggi.
const ST = F1.STANDINGS;
const ST_STORE = C.standingsToStore({
  drivers: ST.drivers.map(([id, points], i) => ({ id, position: i + 1, points })),
  teams: ST.teams.map(([id, points], i) => ({ id, position: i + 1, points })),
  guests: ST.guests,
});
const noteOf = d => (isObj(d) && typeof d.text === "string" ? d.text : "");

// Documento → valore di serie se manca, nel formato in cui sta su Firebase. bt-fanta-pilots (FantaF1 dell'app di oggi)
// non si tocca.
const SHARED_DOCS = {
  "bt-news": D_NEWS,
  "bt-races": null,                       // niente di salvato: calendario 2026 con lo stato dalla data (mergeRaces)
  "bt-piloti": ST_STORE.piloti,
  "bt-costruttori": ST_STORE.costruttori,
  "bt-standings-note": { text: ST.note },
  "bt-notifs": [],
  "bt-ig-config": { handle: "bt_formula1", followers: null, posts: null, videos: [] },
  "bt-highlights": [],
  "bt-silly-official": {},
  "bt-predictions": predictionsToStore(F1.HISTORY_QUESTIONS),   // solo le domande di storia h1-h4
  "bt-home-poll": null,                   // riquadro del sondaggio nascosto
  "bt-fanta-stats": FANTA_DEFAULT,
  "bt-driver-photos": {},
  "bt-commons-photos": { drivers: {}, cars: {}, logos: {} },   // Tappa 3 (G30): foto di Commons scelte dall'admin
  "bt-trophies": null,                    // 25/10: trofei cambiati da Firebase (niente documento: quelli di serie)
};

// Ogni contenuto dell'app (nome dello stato della 2.0) → i suoi documenti e le conversioni.
// from(documenti, ora) dà il valore per l'app; to(valore) dà i documenti da scrivere (null = documento da cancellare).
const KINDS = {
  news: { docs: ["bt-news"], from: (d, now) => C.newsFromStore(d["bt-news"], now), to: v => ({ "bt-news": C.newsToStore(v) }) },
  // { races: le 23 gare della 2.0 con lo stato salvato, extra: gare salvate fuori calendario, che restano nel documento }
  races: { docs: ["bt-races"], from: (d, now) => C.mergeRaces(F1.RACES, d["bt-races"], now), to: v => ({ "bt-races": C.racesToStore(v.races, v.extra) }) },
  standings: {
    docs: ["bt-piloti", "bt-costruttori", "bt-standings-note"],
    from: d => ({ ...C.standingsFromStore({ piloti: d["bt-piloti"], costruttori: d["bt-costruttori"] }), note: noteOf(d["bt-standings-note"]) }),
    to: st => { const s = C.standingsToStore(st); return { "bt-piloti": s.piloti, "bt-costruttori": s.costruttori, "bt-standings-note": { text: st.note || "" } }; },
  },
  // Notifiche come sono salvate: l'app le converte con l'ora dell'ultima lettura (compat.notifsFromStore). Si aggiungono
  // e si tolgono una alla volta (appendNotif, removeNotif), come oggi.
  notifs: { docs: ["bt-notifs"], from: d => list(d["bt-notifs"]) },
  ig: { docs: ["bt-ig-config"], from: d => C.igFromStore(d["bt-ig-config"]), to: v => ({ "bt-ig-config": C.igToStore(v) }) },
  highlights: { docs: ["bt-highlights"], from: d => list(d["bt-highlights"]), to: v => ({ "bt-highlights": list(v) }) },
  silly: { docs: ["bt-silly-official"], from: d => obj(d["bt-silly-official"]), to: v => ({ "bt-silly-official": obj(v) }) },
  predictions: { docs: ["bt-predictions"], from: d => predictionsFromStore(d["bt-predictions"]), to: v => ({ "bt-predictions": predictionsToStore(v) }) },
  homePoll: { docs: ["bt-home-poll"], from: d => (isObj(d["bt-home-poll"]) && Array.isArray(d["bt-home-poll"].options) ? d["bt-home-poll"] : null), to: v => ({ "bt-home-poll": isObj(v) ? v : null }) },
  fantaStats: { docs: ["bt-fanta-stats"], from: d => fantaOf(d["bt-fanta-stats"]), to: v => ({ "bt-fanta-stats": fantaOf(v) }) },
  driverPhotos: { docs: ["bt-driver-photos"], from: d => obj(d["bt-driver-photos"]), to: v => ({ "bt-driver-photos": obj(v) }) },
  commonsPhotos: { docs: ["bt-commons-photos"], from: d => commonsOf(d["bt-commons-photos"]), to: v => ({ "bt-commons-photos": commonsOf(v) }) },
  // 25/10: { <id trofeo>: { name, how, goal, attivo } } in Firebase, { name, how, goal, off } qui solo con i campi validi (src/logic/trophies.js, cleanTrophyConfig).
  // Si cambia dalla console di Firebase (shared/bt-trophies); l'app non lo riscrive (ensureTrophyDoc lo crea se manca).
  trophies: { docs: ["bt-trophies"], from: d => T.cleanTrophyConfig(d["bt-trophies"]) },
};

// Dati personali dell'account (users/<email>.app2): ognuno vede e modifica solo i suoi.
// Tappa 3: colori dell'app (theme), suoni e vibrazioni (sounds, haptics), casco (helmet), notizie nascoste (hidden).
// 24/10: Premium dell'anteprima (premium = { sub, trial }): prima restava solo in memoria e chiudendo l'app spariva.
const USER_KEYS = ["saved", "favTeam", "favDriver", "notifPrefs", "votes", "squad", "squadBase", "freeTransfers", "predAnswers", "sillyPreds", "stratPreds", "pitBest", "wxGuess", "ratings", "dotd", "notifSeenAt",
  "theme", "sounds", "haptics", "helmet", "hidden", "trophies", "premium", "squadLog", "leagues"];   // 31/10: FantaF1 vero
const USER_SAVE_MS = 800;
const pickUser = v => { const out = {}; if (isObj(v)) USER_KEYS.forEach(k => { if (v[k] !== undefined) out[k] = v[k]; }); return out; };

function createAppData({ fb = FB } = {}) {
  // Ultima versione di ogni documento letta da Firebase (o scritta) da questo telefono: null = il documento non c'è.
  // Un documento che non c'è in base non si è mai potuto leggere.
  const base = new Map();
  const pending = new Map();        // email → { patch, timer, waiters }
  const docsOf = kinds => [...new Set(kinds.flatMap(k => KINDS[k].docs))];
  const isFresh = kind => KINDS[kind].docs.every(d => base.has(d));
  // Valore per l'app dai documenti com'erano su Firebase (null = manca: vale quello di serie).
  const valueOf = (kind, raw, now) => {
    const data = {};
    KINDS[kind].docs.forEach(d => { data[d] = clone(raw[d] == null ? SHARED_DOCS[d] : raw[d]); });
    return KINDS[kind].from(data, now);
  };

  // Legge i documenti dei contenuti richiesti (tutti, se non si dice). values: un valore per ogni contenuto (quello di
  // serie se il documento manca o non si è potuto leggere); fresh: i contenuti letti davvero; offline: qualcosa non si
  // è potuto leggere.
  async function loadShared(now = Date.now(), { kinds = Object.keys(KINDS) } = {}) {
    const docs = docsOf(kinds), raw = {}, ok = new Set();
    await Promise.all(docs.map(async k => {
      try {
        const v = await fb.sgStrict(k);
        raw[k] = v == null ? null : v;
        ok.add(k); base.set(k, clone(raw[k]));
      } catch (e) { raw[k] = null; }
    }));
    const values = {};
    kinds.forEach(kind => { values[kind] = valueOf(kind, raw, now); });
    return { values, offline: ok.size < docs.length, fresh: kinds.filter(k => KINDS[k].docs.every(d => ok.has(d))) };
  }
  const staleKinds = () => Object.keys(KINDS).filter(k => !isFresh(k));

  // Converte e scrive un contenuto; restituisce il valore per l'app come si rilegge da quello che si è scritto.
  // update: funzione (valore riletto → valore da scrivere) oppure il valore intero da scrivere (vedi in cima).
  async function saveShared(kind, update, now = Date.now()) {
    const K = KINDS[kind];
    if (!K || !K.to) throw mkErr("unknown", "contenuto senza salvataggio: " + kind);
    const latestRaw = {};
    for (const d of K.docs) { const v = await fb.sgStrict(d); latestRaw[d] = v == null ? null : v; }   // senza rete: errore, niente scritto
    const latest = valueOf(kind, latestRaw, now);
    let next;
    if (typeof update === "function") next = update(latest);
    else {
      const known = isFresh(kind);
      const same = known && JSON.stringify(valueOf(kind, Object.fromEntries(K.docs.map(d => [d, base.get(d)])), now)) === JSON.stringify(latest);
      if (!same) {
        K.docs.forEach(d => base.set(d, clone(latestRaw[d])));   // d'ora in poi lo schermo mostra questi
        throw Object.assign(mkErr(known ? "changed" : "stale", "documento cambiato o mai letto: " + kind), { value: latest });
      }
      next = update;
    }
    const out = clone(K.to(next));   // come lo scrive ss: senza undefined, NaN → null
    for (const [doc, v] of Object.entries(out)) {
      if (v == null) await fb.sd(doc, true); else await fb.ss(doc, v);
      base.set(doc, v == null ? null : clone(v));
    }
    return valueOf(kind, out, now);
  }

  // Notifiche dell'admin (shared/bt-notifs): una alla volta senza riscrivere le altre, come oggi. Un invio andato in tempo
  // scaduto può arrivare lo stesso più tardi: riprovando con lo stesso titolo e testo si rimanda la stessa notifica
  // (stesso id e data), che arrayUnion non aggiunge due volte (revisione della Fase B, minore 2).
  let failedNotif = null;
  async function appendNotif({ title, body } = {}, now = Date.now()) {
    const fresh = C.notifToStore({ title, body }, now);
    const n = failedNotif && failedNotif.title === fresh.title && failedNotif.text === fresh.text ? failedNotif : fresh;
    try { await fb.sharedAppend("bt-notifs", n); } catch (e) { failedNotif = n; throw e; }
    failedNotif = null;
    return n;
  }
  const removeNotif = id => fb.sharedRemoveWhere("bt-notifs", x => x && String(x.id) === String(id));

  // Rilevatore di bluff: le radio "gomme" che l'admin segna, un documento per sessione di OpenF1
  // (shared/bt-bluff-<sessione>) = [{ code, date, lap, text, by }]. Si aggiungono e si tolgono una alla volta, senza
  // riscrivere le altre (come le notifiche); la stessa radio segnata due volte resta una.
  const bluffDoc = sessionKey => "bt-bluff-" + String(sessionKey).replace(/[^0-9A-Za-z_-]/g, "");
  const loadBluff = async sessionKey => list(await fb.sgStrict(bluffDoc(sessionKey)));
  const tagBluff = (sessionKey, { code, date, lap, text = "", by = "" } = {}) =>
    fb.sharedAppend(bluffDoc(sessionKey), { code: String(code), date: String(date), lap: Number(lap) || null, text: String(text || ""), by: String(by || "") });
  const untagBluff = (sessionKey, code, date) => fb.sharedRemoveWhere(bluffDoc(sessionKey), x => x && x.code === code && x.date === date);

  // Trofei da Firebase (25/10): se shared/bt-trophies non c'è, lo scrive con i valori di serie (lo chiama l'app di un
  // admin), così nella console ci sono già tutti i trofei da cambiare. Se c'è non lo tocca. → true se l'ha scritto.
  async function ensureTrophyDoc() {
    const cur = await fb.sgStrict("bt-trophies");
    // 29/10: il Pit crew passa da 2,30 a 2,35 secondi; un documento rimasto coi 2,30 di serie si aggiorna (se l'admin
    // l'ha cambiato a mano, resta il suo).
    const old = cur && cur.pitcrew;
    if (old && old.goal === 2.3 && old.how === "Pit Stop Challenge in 2,30 secondi o meno") {
      const pitcrew = { ...old, goal: 2.35, how: "Pit Stop Challenge in 2,35 secondi o meno" };
      await fb.ss("bt-trophies", { ...cur, pitcrew });
      base.set("bt-trophies", { ...cur, pitcrew });
      return true;
    }
    if (cur != null) return false;
    await fb.ss("bt-trophies", T.trophyConfigDefaults());
    base.set("bt-trophies", T.trophyConfigDefaults());
    return true;
  }

  async function loadUserData(email) {
    const u = await fb.dbGet("users", email);
    return pickUser(u && u.app2);
  }
  // Unisce la modifica a quelle in attesa e salva tutto delay ms dopo l'ultima. La promessa si risolve quando è salvato;
  // se il salvataggio non riesce rifiuta, e la modifica resta in attesa per il prossimo tentativo.
  function saveUserData(email, patch, delay = USER_SAVE_MS) {
    const p = pending.get(email) || { patch: {}, timer: null, waiters: [] };
    Object.assign(p.patch, pickUser(patch));
    pending.set(email, p);
    clearTimeout(p.timer);
    return new Promise((res, rej) => { p.waiters.push({ res, rej }); p.timer = setTimeout(() => { writeUser(email); }, delay); });
  }
  async function writeUser(email) {
    const p = pending.get(email);
    if (!p) return;
    pending.delete(email); clearTimeout(p.timer);
    try {
      await fb.dbSet("users", email, { app2: p.patch });
      p.waiters.forEach(w => w.res());
    } catch (e) {
      const cur = pending.get(email);   // modifiche arrivate intanto: le più nuove valgono di più
      if (cur) cur.patch = { ...p.patch, ...cur.patch };
      else pending.set(email, { patch: p.patch, timer: null, waiters: [] });
      p.waiters.forEach(w => w.rej(e));
    }
  }
  // Salva subito quello che è in attesa (per esempio prima di uscire dall'account).
  const flushUserData = () => Promise.all([...pending.keys()].map(writeUser));
  // Butta le modifiche in attesa di un account (per esempio quando lo si elimina: non devono ricrearlo).
  function cancelUserData(email) {
    const p = pending.get(email);
    if (!p) return;
    clearTimeout(p.timer); pending.delete(email);
    p.waiters.forEach(w => w.rej(mkErr("cancelled")));
  }
  // Toglie dall'account tutti i dati personali dell'app (app2 vuoto; il resto del profilo resta).
  async function clearUserData(email) {
    cancelUserData(email);
    await fb.dbSet("users", email, { app2: {} });
  }

  return { loadShared, staleKinds, saveShared, ensureTrophyDoc, appendNotif, removeNotif, loadBluff, tagBluff, untagBluff, loadUserData, saveUserData, flushUserData, cancelUserData, clearUserData };
}

// I valori di serie di tutti i contenuti, già convertiti per l'app: quelli che si vedono finché Firebase non risponde.
function sharedDefaults(now = Date.now()) {
  const data = clone(SHARED_DOCS), values = {};
  Object.keys(KINDS).forEach(kind => { values[kind] = KINDS[kind].from(data, now); });
  return values;
}

module.exports = { D_NEWS, SHARED_DOCS, KINDS, USER_KEYS, USER_SAVE_MS, sharedDefaults, createAppData, ...createAppData() };
