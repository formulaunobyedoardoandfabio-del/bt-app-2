#!/usr/bin/env node
// Post nuovi dei profili ufficiali (7/11). Lo lancia .github/workflows/social.yml; scrive public/data/social.json
// (solo link, profilo e data: le foto e i testi restano su Instagram e X, l'app li mostra coi loro widget ufficiali).
//  - Instagram: Business Discovery della Graph API di Meta (gratis), coi segreti IG_USER_ID (il tuo profilo Instagram
//    professionale) e IG_TOKEN (token utente di Facebook con instagram_basic, instagram_manage_insights e
//    pages_read_engagement). Funziona solo per profili professionali (quelli di F1 e scuderie lo sono).
//  - X: API v2 a consumo (a pagamento, circa 0,005 dollari per post letto), solo se c'è il segreto X_BEARER.
// Profili in tools/social-accounts.json. Senza chiavi non fa niente. Token di Instagram scaduto: esce con errore, così
// GitHub manda un'email. Uso a mano: IG_USER_ID=... IG_TOKEN=... node tools/social_sync.js
const fs = require("fs");
const path = require("path");
const { mergePosts, validFeed } = require("../src/logic/social");

const GRAPH = "https://graph.facebook.com/v25.0/";
const XAPI = "https://api.x.com/2/";
const FEED = "public/data/social.json";

const isoOf = t => { const n = Date.parse(String(t || "").replace(/([+-]\d\d)(\d\d)$/, "$1:$2")); return Number.isFinite(n) ? new Date(n).toISOString() : null; };
const readJson = async r => { try { return await r.json(); } catch (e) { return null; } };

async function fetchInstagram(accounts, { userId, token, fetch, perAccount = 6 }) {
  const posts = [], errors = [];
  let expired = false;
  for (const name of accounts) {
    const fields = `business_discovery.username(${name}){username,media.limit(${perAccount}){permalink,timestamp,media_type}}`;
    const url = `${GRAPH}${encodeURIComponent(userId)}?fields=${fields}&access_token=${encodeURIComponent(token)}`;
    try {
      const r = await fetch(url, { headers: { Accept: "application/json" } });
      const j = await readJson(r);
      if (!r.ok || !j || j.error) {
        const e = (j && j.error) || {};
        if (e.code === 190) expired = true;
        errors.push(`instagram @${name}: ${e.message || "HTTP " + r.status}`);
        if (expired) break;
        continue;
      }
      const media = (j.business_discovery && j.business_discovery.media && j.business_discovery.media.data) || [];
      for (const m of media) {
        const date = isoOf(m.timestamp);
        if (m.permalink && date) posts.push({ net: "instagram", url: m.permalink, account: name, date });
      }
    } catch (e) { errors.push(`instagram @${name}: ${e.message}`); }
  }
  return { posts, errors, expired };
}

// state: { <profilo>: { id, since } } (dentro social.json): l'id del profilo si cerca una volta sola, poi si leggono
// solo i post dopo "since". Su X si paga ogni post letto.
async function fetchX(accounts, { bearer, fetch, state, perAccount = 5 }) {
  const posts = [], errors = [];
  const headers = { Authorization: "Bearer " + bearer, Accept: "application/json" };
  const missing = accounts.filter(a => !(state[a] && state[a].id));
  if (missing.length) {
    try {
      const r = await fetch(`${XAPI}users/by?usernames=${encodeURIComponent(missing.join(","))}`, { headers });
      const j = await readJson(r);
      if (!r.ok || !j) errors.push(`x: profili non trovati (HTTP ${r.status})`);
      for (const u of (j && j.data) || []) {
        const name = accounts.find(a => a.toLowerCase() === String(u.username).toLowerCase());
        if (name) state[name] = { ...(state[name] || {}), id: String(u.id) };
      }
    } catch (e) { errors.push("x: " + e.message); }
  }
  for (const name of accounts) {
    const s = state[name];
    if (!s || !s.id) continue;
    const q = new URLSearchParams({ max_results: String(perAccount), exclude: "retweets,replies", "tweet.fields": "created_at" });
    if (s.since) q.set("since_id", s.since);
    try {
      const r = await fetch(`${XAPI}users/${s.id}/tweets?${q}`, { headers });
      const j = await readJson(r);
      if (!r.ok || !j) { errors.push(`x @${name}: HTTP ${r.status}`); continue; }
      for (const tw of j.data || []) {
        const date = isoOf(tw.created_at);
        if (date) posts.push({ net: "x", url: `https://x.com/${name}/status/${tw.id}`, account: name, date });
      }
      if (j.meta && j.meta.newest_id) s.since = String(j.meta.newest_id);
    } catch (e) { errors.push(`x @${name}: ${e.message}`); }
  }
  return { posts, errors };
}

async function run({ env = process.env, fetch = globalThis.fetch, io, now = () => Date.now(), accounts, log = () => {} } = {}) {
  const rawOld = io.read(FEED);
  let old = null;
  try { old = rawOld ? JSON.parse(rawOld) : null; } catch (e) { old = null; }
  if (!validFeed(old)) old = { v: 1, updated: null, posts: [], state: {} };
  const state = { x: { ...((old.state && old.state.x) || {}) } };
  const fresh = [], errors = [];
  let expired = false, used = false;
  if (env.IG_USER_ID && env.IG_TOKEN && accounts.instagram && accounts.instagram.length) {
    used = true;
    const r = await fetchInstagram(accounts.instagram, { userId: env.IG_USER_ID, token: env.IG_TOKEN, fetch });
    fresh.push(...r.posts); errors.push(...r.errors); expired = r.expired;
  }
  if (env.X_BEARER && accounts.x && accounts.x.length) {
    used = true;
    const r = await fetchX(accounts.x, { bearer: env.X_BEARER, fetch, state: state.x });
    fresh.push(...r.posts); errors.push(...r.errors);
  }
  errors.forEach(e => log("  " + e));
  if (!used) { log("Nessuna chiave (IG_USER_ID e IG_TOKEN, oppure X_BEARER): niente da fare."); return { changed: false, expired, errors }; }
  const posts = mergePosts(old.posts, fresh, { now: now() });
  const same = JSON.stringify(posts) === JSON.stringify(old.posts) && JSON.stringify(state) === JSON.stringify(old.state || {});
  log(`${fresh.length} post letti, ${posts.length} nel file${same ? ", niente di nuovo" : ""}.`);
  if (same) return { changed: false, expired, errors };
  io.write(FEED, JSON.stringify({ v: 1, updated: new Date(now()).toISOString(), posts, state }, null, 1) + "\n");
  return { changed: true, expired, errors };
}

module.exports = { fetchInstagram, fetchX, run, FEED };

if (require.main === module) {
  const root = path.join(__dirname, "..");
  const io = {
    read: p => { try { return fs.readFileSync(path.join(root, p), "utf8"); } catch (e) { return null; } },
    write: (p, s) => { fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true }); fs.writeFileSync(path.join(root, p), s); },
  };
  const accounts = JSON.parse(fs.readFileSync(path.join(__dirname, "social-accounts.json"), "utf8"));
  run({ io, accounts, log: s => console.log(s) }).then(r => {
    if (r.expired) { console.error("Il token di Instagram (IG_TOKEN) è scaduto: rifallo e rimettilo nei segreti di GitHub."); process.exit(1); }
  }, e => { console.error(e); process.exit(1); });
}
