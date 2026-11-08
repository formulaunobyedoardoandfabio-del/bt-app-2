// Funzione su Vercel (8/11): ultimi video "Highlights" del canale YouTube di FORMULA 1 per l'app, dal feed pubblico
// (Atom, gratis, senza chiave). Si salvano solo id, titolo, link e data: i video si guardano su YouTube.
// Il canale si può cambiare con la variabile F1_YT_CHANNEL; se il feed non risponde si ricava l'id dalla pagina
// pubblica @formula1. La cache di Vercel tiene la risposta 30 minuti.
// GET /api/highlights → { source, updated, items: [{ id, title, link, thumb, date }] }
const { CHANNEL_ID, FEED, parseFeed, channelFromPage } = require("../src/services/highlights");

const UA = { "User-Agent": "Sector4/2.0 https://bt-app-2.vercel.app", Accept: "application/atom+xml, text/xml, */*" };
async function feedOf(id) {
  const r = await fetch(FEED(id), { headers: UA });
  return r && r.ok ? parseFeed(await r.text()) : null;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    let items = await feedOf(process.env.F1_YT_CHANNEL || CHANNEL_ID).catch(() => null);
    if (!items || !items.length) {
      const page = await fetch("https://www.youtube.com/@formula1", { headers: { ...UA, Accept: "text/html" } }).then(r => (r && r.ok ? r.text() : ""), () => "");
      const id = channelFromPage(page);
      if (id) items = await feedOf(id).catch(() => null);
    }
    if (!items) { res.setHeader("Cache-Control", "no-store"); res.status(502).json({ error: "YouTube non ha risposto" }); return; }
    res.setHeader("Cache-Control", "public, max-age=600, s-maxage=1800, stale-while-revalidate=3600");
    res.status(200).json({ source: "YouTube · FORMULA 1", updated: new Date().toISOString(), items });
  } catch (e) {
    res.setHeader("Cache-Control", "no-store");
    res.status(502).json({ error: "YouTube non raggiungibile" });
  }
};
