// Backend dell'app di oggi (le funzioni su Vercel di bt-app-flutter/functions/api): la nuova app usa lo stesso.
// Le chiavi segrete (OpenAI, Stripe) restano lì; qui non ce n'è nessuna. Per ora serve al tasto "ChatGPT" del
// Pannello Admin, con gli stessi messaggi dell'app di oggi.
const FUNCTIONS_BASE = "https://bt-app-flutter.vercel.app/api";
const GEN_TIMEOUT = 60000;   // di solito ChatGPT risponde in 5-20 secondi; dopo un minuto si smette di aspettare
const BACKEND_MSG = { "no-title": "Scrivi prima un titolo", failed: "ChatGPT non ha risposto, riprova" };
const mkErr = code => Object.assign(new Error(BACKEND_MSG[code] || code), { code });

// Testo dell'articolo scritto da ChatGPT da titolo, sottotitolo e categoria: POST /generateArticle → { content }.
// Rifiuta con { code: "no-title" } senza titolo (e non chiama niente), con { code: "failed" } per tutto il resto
// (server che risponde male, testo vuoto, rete assente, nessuna risposta entro timeoutMs).
async function generateArticle({ title, summary = "", category = "" } = {}, { fetchImpl, timeoutMs = GEN_TIMEOUT } = {}) {
  const t = String(title || "").trim();
  if (!t) throw mkErr("no-title");
  const f = fetchImpl || (typeof fetch === "function" ? fetch : null);
  if (!f) throw mkErr("failed");
  const ask = async () => {
    const r = await f(FUNCTIONS_BASE + "/generateArticle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: t, summary: String(summary || "").trim(), category: String(category || "").trim() }),
    });
    const d = await r.json().catch(() => null);
    const content = d && typeof d.content === "string" ? d.content.trim() : "";
    if (!r.ok || !content) throw mkErr("failed");
    return content;
  };
  let timer;
  try {
    return await Promise.race([ask(), new Promise((_, rej) => { timer = setTimeout(() => rej(mkErr("failed")), timeoutMs); })]);
  } catch (e) {
    throw e && e.code === "failed" ? e : mkErr("failed");
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { FUNCTIONS_BASE, BACKEND_MSG, generateArticle };
