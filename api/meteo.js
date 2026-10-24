// Funzione su Vercel: previsioni meteo di un circuito per l'app (24/10). Fa da tramite verso MET Norway (api.met.no), che
// chiede alle app di non chiamarlo dal telefono ma da un server proprio, con un nome che le identifica (User-Agent), e di
// non richiedere prima dell'ora scritta in "Expires": la cache di Vercel (s-maxage) tiene la risposta fino a lì.
// Gratis anche per uso commerciale, citando la fonte (CC BY 4.0 / NLOD 2.0). Nessuna chiave.
// GET /api/meteo?c=us-2012 → { circuitId, source, updated, hours: [{ t, step, temp, wind, hum, rain, sym }] }
const { CIRCUIT_COORDS, MET_URL, USER_AGENT, shapeForecast } = require("../src/services/meteo");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const id = String((req.query && req.query.c) || "");
  const pos = CIRCUIT_COORDS[id];
  if (!pos) { res.setHeader("Cache-Control", "public, max-age=3600"); res.status(400).json({ error: "Circuito sconosciuto" }); return; }
  try {
    const r = await fetch(`${MET_URL}?lat=${pos[0]}&lon=${pos[1]}`, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
    const out = r && r.ok ? shapeForecast(await r.json()) : null;
    if (!out) { res.setHeader("Cache-Control", "no-store"); res.status(502).json({ error: "MET Norway non ha risposto" }); return; }
    const exp = Date.parse((r.headers && r.headers.get && r.headers.get("expires")) || "");
    const ttl = Math.max(600, Math.min(3600, isFinite(exp) ? Math.round((exp - Date.now()) / 1000) : 1800));
    res.setHeader("Cache-Control", `public, max-age=600, s-maxage=${ttl}, stale-while-revalidate=1800`);
    res.status(200).json({ circuitId: id, source: "MET Norway", ...out });
  } catch (e) {
    res.setHeader("Cache-Control", "no-store");
    res.status(502).json({ error: "MET Norway non raggiungibile" });
  }
};
