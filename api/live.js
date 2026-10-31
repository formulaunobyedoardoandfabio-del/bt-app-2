// Funzione su Vercel: dati di OpenF1 durante le sessioni (31/10). Con l'abbonamento Sponsor di Edoardo (9,90 €/mese, ok
// per un'app piccola con pubblicità: mail di Bruno Godefroy del 30/10) i dati in diretta richiedono l'accesso: utente e
// password stanno SOLO nelle variabili di Vercel (OPENF1_USERNAME, OPENF1_PASSWORD), mai nell'app né su GitHub.
// È l'unica che parla con OpenF1 (come chiede OpenF1): il pass (token) dura un'ora e si rinnova da solo; le risposte
// restano 15 secondi nella cache di Vercel e in memoria, così tanti telefoni fanno poche richieste (limite: 60/min).
// GET /api/live?p=laps&session_key=9876  → la risposta di OpenF1 (stesso formato)
// GET /api/live?check=1                   → { ok, reason } (le credenziali funzionano? senza mostrarle)
const OF1 = "https://api.openf1.org";
const ALLOWED = ["sessions", "meetings", "drivers", "laps", "stints", "pit", "position", "intervals", "race_control", "team_radio", "weather", "session_result", "car_data", "starting_grid"];
const CACHE_S = 15;   // l'app chiede ~12 indirizzi ogni 15 s: con 15 s di cache OpenF1 ne riceve al massimo ~48 al minuto (limite 60)
const PART_OK = /^[a-z_]+(%3[cCeE](=|%3[dD])?|<=?|>=?|=)[A-Za-z0-9_.:%+-]*$/;

function createLive({ fetchImpl = (...a) => fetch(...a), env = process.env, now = () => Date.now() } = {}) {
  let tok = null, tokExp = 0;
  const mem = new Map();   // url → { at, status, body }
  async function token(force) {
    if (!force && tok && now() < tokExp - 60000) return tok;
    const u = env.OPENF1_USERNAME, pw = env.OPENF1_PASSWORD;
    if (!u || !pw) throw Object.assign(new Error("config"), { code: "config" });
    const r = await fetchImpl(OF1 + "/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ username: String(u).trim(), password: String(pw).trim() }).toString() });
    let j = null;
    try { j = await r.json(); } catch (e) { j = null; }
    if (!r.ok || !j || !j.access_token) throw Object.assign(new Error("auth"), { code: "auth", status: r.status });
    tok = j.access_token; tokExp = now() + (Number(j.expires_in) || 3600) * 1000;
    return tok;
  }
  async function upstream(url) {
    const hit = mem.get(url);
    if (hit && now() - hit.at < CACHE_S * 1000) return hit;
    let r = await fetchImpl(url, { headers: { Authorization: "Bearer " + await token(), Accept: "application/json" } });
    if (r.status === 401) r = await fetchImpl(url, { headers: { Authorization: "Bearer " + await token(true), Accept: "application/json" } });
    let body = null;
    try { body = await r.json(); } catch (e) { body = null; }
    const out = { at: now(), status: r.status, body };
    if (r.status === 200 || r.status === 404) mem.set(url, out);
    if (mem.size > 300) mem.delete(mem.keys().next().value);
    return out;
  }
  return async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    const raw = String(req.url || "").split("?")[1] || "";
    const parts = raw.split("&").filter(Boolean);
    const p = ((parts.find(x => x.startsWith("p=")) || "").slice(2));
    if (parts.some(x => x === "check" || x.startsWith("check="))) {
      res.setHeader("Cache-Control", "no-store");
      try { await token(true); res.status(200).json({ ok: true }); }
      catch (e) { res.status(200).json({ ok: false, reason: e.code === "config" ? "mancano OPENF1_USERNAME o OPENF1_PASSWORD su Vercel" : e.code === "auth" ? "OpenF1 non accetta utente e password" : "OpenF1 non raggiungibile", status: e.status || null }); }
      return;
    }
    const fwd = parts.filter(x => !x.startsWith("p="));
    if (!ALLOWED.includes(p) || !fwd.length || fwd.some(x => !PART_OK.test(x))) { res.setHeader("Cache-Control", "public, max-age=3600"); res.status(400).json({ detail: "Richiesta non valida" }); return; }
    try {
      const out = await upstream(`${OF1}/v1/${p}?${fwd.sort().join("&")}`);
      res.setHeader("Cache-Control", out.status === 200 || out.status === 404 ? `public, max-age=5, s-maxage=${CACHE_S}, stale-while-revalidate=20` : "no-store");
      res.status(out.status).json(out.body == null ? { detail: "Risposta vuota" } : out.body);
    } catch (e) {
      res.setHeader("Cache-Control", "no-store");
      res.status(e.code === "config" || e.code === "auth" ? 503 : 502).json({ detail: e.code === "config" || e.code === "auth" ? "Diretta non configurata" : "OpenF1 non raggiungibile" });
    }
  };
}

module.exports = createLive();
module.exports.createLive = createLive;
