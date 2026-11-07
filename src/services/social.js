// Post ufficiali dei profili di F1 e scuderie (7/11). Il workflow .github/workflows/social.yml (tools/social_sync.js)
// scrive public/data/social.json e Vercel lo pubblica; qui l'app lo scarica al massimo ogni 15 minuti e lo tiene nella
// memoria del telefono. Senza rete restano gli ultimi scaricati; senza niente, nessun post (la striscia non si vede).
const { cleanPosts, validFeed } = require("../logic/social");

const URL_FEED = "https://bt-app-2.vercel.app/data/social.json";
const FRESH_MS = 15 * 60000;
const K = "social-feed";

function createSocial({ fetch: f = (...a) => fetch(...a), store = null, now = () => Date.now(), url = URL_FEED } = {}) {
  const get = () => (store ? store.get(K) : null), set = v => { if (store) store.set(K, v); };
  return {
    async load() {
      const saved = get();
      if (saved && now() - saved.at < FRESH_MS && Array.isArray(saved.posts)) return saved.posts;
      try {
        const r = await f(url, { headers: { Accept: "application/json" } });
        if (!r || !r.ok) throw new Error("social: HTTP " + (r ? r.status : "?"));
        const feed = await r.json();
        if (!validFeed(feed)) throw new Error("social: file non valido");
        const posts = cleanPosts(feed.posts);
        set({ at: now(), posts });
        return posts;
      } catch (e) {
        return saved && Array.isArray(saved.posts) ? saved.posts : [];
      }
    },
  };
}

module.exports = { createSocial, URL_FEED };
