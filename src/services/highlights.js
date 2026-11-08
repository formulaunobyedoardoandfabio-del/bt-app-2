// Highlights ufficiali di F1 (8/11, Edoardo: "rendi automatico tutto"). La funzione su Vercel (api/highlights.js) legge
// il feed pubblico del canale YouTube di FORMULA 1 (Atom, gratis, senza chiave) e tiene solo i video "Highlights";
// l'app li scarica ogni 30 minuti e li mostra in Home con un link a YouTube (niente video copiati: si aprono là).
// Il canale "Video highlights esclusivi" del Premium resta quello di B&T, caricato dall'admin.
const HL_URL = "https://bt-app-2.vercel.app/api/highlights";
const CHANNEL_ID = "UCB_qr75-ydFVKSF9Dmo6izg";   // FORMULA 1 (@formula1); se cambia, la funzione lo ricava dalla pagina
const FEED = id => `https://www.youtube.com/feeds/videos.xml?channel_id=${id}`;
const FRESH_MS = 30 * 60e3;
const MAX = 10;

const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const decode = s => String(s || "").replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => {
  if (e[0] === "#") { const n = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) ? String.fromCodePoint(n) : m; }
  return ENT[e.toLowerCase()] != null ? ENT[e.toLowerCase()] : m;
});
const tag = (xml, name) => { const m = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`).exec(xml); return m ? decode(m[1].trim()) : ""; };

// Nome della sessione in italiano davanti al GP ("Race Highlights | 2026 São Paulo Grand Prix" → "Gara · 2026 São Paulo Grand Prix").
const LABELS = [
  [/^sprint (qualifying|shootout) highlights/i, "Qualifica Sprint"],
  [/^sprint (race )?highlights/i, "Sprint"],
  [/^qualifying highlights/i, "Qualifiche"],
  [/^(race|grand prix) highlights/i, "Gara"],
  [/^fp\s?(\d) highlights/i, m => "Prove libere " + m[1]],
  [/^(free )?practice (\d) highlights/i, m => "Prove libere " + m[2]],
];
function italianTitle(title) {
  const t = String(title || "").trim();
  const [head, ...rest] = t.split("|");
  const event = rest.join("|").trim();
  for (const [re, l] of LABELS) {
    const m = re.exec(head.trim());
    if (m) { const label = typeof l === "function" ? l(m) : l; return event ? `${label} · ${event}` : label; }
  }
  return t;
}

// Feed Atom di YouTube → [{ id, title, link, thumb, date }] solo coi video di highlights, dal più nuovo.
function parseFeed(xml) {
  const out = [];
  String(xml || "").split("<entry>").slice(1).forEach(chunk => {
    const e = chunk.split("</entry>")[0];
    const id = tag(e, "yt:videoId");
    const title = tag(e, "title");
    if (!/^[\w-]{11}$/.test(id) || !/highlights/i.test(title) || /#shorts/i.test(title)) return;
    const date = tag(e, "published");
    out.push({ id: "yt-" + id, title: italianTitle(title), link: "https://www.youtube.com/watch?v=" + id, thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, date: Number.isFinite(Date.parse(date)) ? new Date(Date.parse(date)).toISOString() : null });
  });
  return out.sort((a, b) => Date.parse(b.date || 0) - Date.parse(a.date || 0)).slice(0, MAX);
}

// Id del canale dalla pagina pubblica (se quello scritto qui smettesse di funzionare).
function channelFromPage(html) {
  const m = /"(?:channelId|externalId)":"(UC[\w-]{22})"/.exec(String(html || "")) || /channel\/(UC[\w-]{22})/.exec(String(html || ""));
  return m ? m[1] : null;
}

// Lato app: ultimi highlights, salvati sul telefono (senza rete restano gli ultimi letti).
function createHighlights({ fetch: f = (...a) => fetch(...a), store = null, now = () => Date.now(), url = HL_URL } = {}) {
  const KEY = "bt-yt-highlights";
  async function list() {
    const saved = store ? store.get(KEY) : null;
    if (saved && Array.isArray(saved.items) && now() - saved.at >= 0 && now() - saved.at < FRESH_MS) return saved.items;
    try {
      const r = await f(url, { headers: { Accept: "application/json" } });
      if (!r || !r.ok) throw new Error("HTTP " + (r ? r.status : "?"));
      const j = await r.json();
      const items = (Array.isArray(j && j.items) ? j.items : []).filter(x => x && /^yt-[\w-]{11}$/.test(x.id) && typeof x.title === "string").slice(0, MAX);
      if (store) store.set(KEY, { at: now(), items });
      return items;
    } catch (e) {
      return saved && Array.isArray(saved.items) ? saved.items : [];
    }
  }
  return { list };
}

module.exports = { HL_URL, CHANNEL_ID, FEED, FRESH_MS, parseFeed, italianTitle, channelFromPage, createHighlights };
