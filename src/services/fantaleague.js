// Leghe FantaF1 vere (31/10; prove in test/unit/fantaleague.test.js).
// - Risultati veri della stagione da Jolpica (gare, qualifiche, Sprint), a pagine da 100 righe, tenuti sul telefono per
//   3 ore (senza rete: gli ultimi letti). Jolpica è per uso non commerciale: vedi HANDOFF (JOLPICA_ON).
// - Una lega è il documento fanta/lega-<CODICE> { name, owner, created, members: { <aid>: { name, team, color, log, gone } } }:
//   ognuno scrive solo il suo membro (la storia della sua squadra, log); i punti li calcola ogni telefono coi risultati
//   veri e le regole di sempre (src/logic/fanta-season.js), così sono uguali per tutti.
const FB = require("./firebase");
const FS = require("../logic/fanta-season");

const BASE = "https://api.jolpi.ca/ergast/f1";
const FRESH_MS = 3 * 3600000, PAGE = 100, MAX_PAGES = 12, LOG_MAX = 80;
const COLORS = ["#2E9E8F", "#3B6FD4", "#E8842C", "#7B5FC4", "#D9B830", "#9AA0A6", "#C2185B", "#3FAE6B"];
const isObj = v => !!v && typeof v === "object" && !Array.isArray(v);
const mkErr = code => Object.assign(new Error(code), { code });
const codeOk = c => (typeof c === "string" && /^BT-[A-Z0-9]{4,6}$/.test(c) ? c : null);
const docId = code => "lega-" + code;

function cleanLeague(code, d) {
  if (!isObj(d)) return null;
  const members = Object.entries(isObj(d.members) ? d.members : {})
    .filter(([aid, m]) => /^[A-Za-z0-9_-]{1,40}$/.test(aid) && isObj(m) && !m.gone)
    .map(([aid, m], i) => ({ aid, name: String(m.name || "Tifoso").slice(0, 30), team: String(m.team || "").slice(0, 40), color: /^#[0-9A-F]{6}$/i.test(m.color || "") ? m.color : COLORS[i % COLORS.length], log: FS.cleanLog(m.log).slice(-LOG_MAX) }));
  return { code, name: String(d.name || "Lega").slice(0, 40), owner: String(d.owner || ""), created: Number(d.created) || 0, members };
}

function createFantaLeague({ fetch: f = (...a) => fetch(...a), now = () => Date.now(), store = null, season = 2026, dbGet = FB.dbGet, dbSet = FB.dbSet, rand = Math.random } = {}) {
  const KEY = "jolpica-results-" + season;
  const get = async path => {
    const r = await f(BASE + path, { headers: { Accept: "application/json" } });
    if (!r || !r.ok) throw new Error("Jolpica: HTTP " + (r ? r.status : "?"));
    return r.json();
  };
  // Tutte le pagine di un elenco della stagione (results, qualifying, sprint).
  async function pages(kind) {
    const out = [];
    for (let i = 0, total = Infinity; i < MAX_PAGES && i * PAGE < total; i++) {
      const j = await get(`/${season}/${kind}.json?limit=${PAGE}&offset=${i * PAGE}`);
      out.push(j);
      total = Number(j && j.MRData && j.MRData.total) || 0;
    }
    return out;
  }
  let inflight = null;
  async function load() {
    const saved = store ? store.get(KEY) : null;
    if (saved && Array.isArray(saved.rounds) && now() - saved.at >= 0 && now() - saved.at < FRESH_MS) return saved.rounds;
    try {
      const [results, qualifying, sprint] = await Promise.all([pages("results"), pages("qualifying"), pages("sprint").catch(() => [])]);
      const rounds = FS.roundsFromJolpica({ results, qualifying, sprint });
      if (store) store.set(KEY, { at: now(), rounds });
      return rounds;
    } catch (e) {
      if (saved && Array.isArray(saved.rounds)) return saved.rounds;   // senza rete: gli ultimi letti
      throw e;
    }
  }
  const results = () => (inflight = inflight || load().finally(() => { inflight = null; }));

  const loadLeague = async code => (codeOk(code) ? cleanLeague(code, await dbGet("fanta", docId(code))) : null);
  const member = (me, log, i = 0) => ({ name: me.name, team: me.team || "", color: COLORS[i % COLORS.length], log: FS.cleanLog(log).slice(-LOG_MAX), gone: false });
  async function createLeague(name, me, log) {
    const n = String(name || "").trim().slice(0, 40);
    if (!n) throw mkErr("name");
    let code = null;
    for (let i = 0; i < 5 && !code; i++) {
      const c = "BT-" + Array.from({ length: 4 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(rand() * 32)]).join("");
      if (!(await dbGet("fanta", docId(c)))) code = c;
    }
    if (!code) throw mkErr("code");
    await dbSet("fanta", docId(code), { name: n, owner: me.aid, created: now(), members: { [me.aid]: member(me, log) } });
    return loadLeague(code);
  }
  async function joinLeague(code, me, log) {
    const c = codeOk(String(code || "").trim().toUpperCase());
    const cur = c ? await dbGet("fanta", docId(c)) : null;
    if (!cur) throw mkErr("not-found");
    const n = Object.keys(isObj(cur.members) ? cur.members : {}).length;
    await dbSet("fanta", docId(c), { members: { [me.aid]: member(me, log, n) } });
    return loadLeague(c);
  }
  // Squadra cambiata (o nome della squadra): la storia aggiornata va in tutte le mie leghe.
  async function pushLog(codes, me, log) {
    for (const c of (codes || []).filter(codeOk)) {
      await dbSet("fanta", docId(c), { members: { [me.aid]: { name: me.name, team: me.team || "", log: FS.cleanLog(log).slice(-LOG_MAX), gone: false } } }).catch(() => {});
    }
  }
  const leaveLeague = (code, aid) => (codeOk(code) ? dbSet("fanta", docId(code), { members: { [aid]: { gone: true } } }) : Promise.resolve());
  const renameLeague = (code, name) => { const n = String(name || "").trim().slice(0, 40); return n && codeOk(code) ? dbSet("fanta", docId(code), { name: n }) : Promise.resolve(); };

  // Classifica di una lega: punti veri di ogni membro (dalla sua storia e dai risultati), dal primo all'ultimo.
  function standings(league, rounds, lockOf) {
    return (league ? league.members : []).map(m => ({ ...m, pts: FS.seasonPoints({ log: m.log, rounds, lockOf }).total }))
      .sort((a, b) => b.pts - a.pts || a.name.localeCompare(b.name));
  }

  return { results, loadLeague, createLeague, joinLeague, pushLog, leaveLeague, renameLeague, standings };
}

module.exports = { createFantaLeague, cleanLeague, BASE, LOG_MAX };
