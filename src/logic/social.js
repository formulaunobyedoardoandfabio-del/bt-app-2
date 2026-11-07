// Post ufficiali di Instagram e X dentro l'app (7/11, Edoardo: "fai come dice il testo di Gemini": incorporare i post
// con gli strumenti ufficiali, niente copia di foto o testi). Qui le regole comuni ad app e workflow:
// - parseSocial: un link di un post diventa { net, ... } con l'indirizzo pulito (o null se non è un post incorporabile);
// - cleanPosts / mergePosts: l'elenco di public/data/social.json (solo link, profilo e data: niente didascalie né foto).
const MAX_POSTS = 40;                 // post tenuti nel file
const MAX_AGE_MS = 10 * 86400000;     // e non più vecchi di 10 giorni

const IG_RE = /^https:\/\/(?:www\.)?instagram\.com\/(?:([A-Za-z0-9._]{1,30})\/)?(p|reel|tv)\/([A-Za-z0-9_-]{5,40})\/?(?:\?[^\s"'<>]*)?$/;
const X_RE = /^https:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})\/status\/(\d{5,25})\/?(?:\?[^\s"'<>]*)?$/;
const ACCOUNT_RE = /^[A-Za-z0-9._]{1,30}$/;

function parseSocial(url) {
  if (typeof url !== "string") return null;
  const u = url.trim();
  let m = IG_RE.exec(u);
  if (m) {
    const kind = m[2], code = m[3];
    const clean = `https://www.instagram.com/${kind}/${code}/`;
    return { net: "instagram", kind, code, user: m[1] || null, url: clean, embed: clean + "embed/" };
  }
  m = X_RE.exec(u);
  if (m) return { net: "x", user: m[1], id: m[2], url: `https://x.com/${m[1]}/status/${m[2]}` };
  return null;
}

const keyOf = s => (s.net === "instagram" ? "instagram:" + s.code : "x:" + s.id);
const isObj = v => !!v && typeof v === "object" && !Array.isArray(v);

// Un post del file: { id, net, url, account, date } con url pulito e data ISO; altrimenti null.
function cleanPost(p) {
  if (!isObj(p)) return null;
  const s = parseSocial(p.url);
  if (!s || (p.net && p.net !== s.net)) return null;
  const t = Date.parse(p.date);
  if (!Number.isFinite(t)) return null;
  const account = typeof p.account === "string" && ACCOUNT_RE.test(p.account) ? p.account : s.user || "";
  return { id: keyOf(s), net: s.net, url: s.url, account, date: new Date(t).toISOString() };
}
const cleanPosts = list => (Array.isArray(list) ? list : []).map(cleanPost).filter(Boolean);

// Vecchi + nuovi: i nuovi vincono, niente doppioni, i più recenti prima, al massimo MAX_POSTS e non oltre MAX_AGE_MS.
function mergePosts(old, fresh, { now = Date.now(), max = MAX_POSTS, maxAge = MAX_AGE_MS } = {}) {
  const by = new Map();
  for (const p of cleanPosts(old)) by.set(p.id, p);
  for (const p of cleanPosts(fresh)) by.set(p.id, p);
  return [...by.values()]
    .filter(p => now - Date.parse(p.date) <= maxAge)
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date) || (a.id < b.id ? -1 : 1))
    .slice(0, max);
}

const validFeed = f => isObj(f) && f.v === 1 && Array.isArray(f.posts);

module.exports = { MAX_POSTS, MAX_AGE_MS, parseSocial, cleanPost, cleanPosts, mergePosts, validFeed };
