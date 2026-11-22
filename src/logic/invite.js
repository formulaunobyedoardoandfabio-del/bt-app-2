// Invito a una lega FantaF1 (22/11, Edoardo: "far unire le persone alla propria lega", grafiche N4-N6): un link del
// sito con ?lega=<codice>, più il nome della lega (n) e di chi invita (da) solo da mostrare nell'invito. Lo portano il
// QR, la condivisione e l'NFC. Il codice decide tutto: entrando si usa l'"Entra con un codice" che c'era già.
// Prove: test/unit/invite.test.js
const SITE = "https://bt-app-2.vercel.app";
const LEAGUE_RE = /^BT-[A-Z0-9]{4,6}$/;
const short = (v, n) => (typeof v === "string" ? v.trim().slice(0, n) : "");

function link({ code, name, from }) {
  if (!LEAGUE_RE.test(String(code || ""))) throw new Error("codice della lega non valido");
  const q = new URLSearchParams({ lega: code });
  if (short(name, 30)) q.set("n", short(name, 30));
  if (short(from, 30)) q.set("da", short(from, 30));
  return `${SITE}/?${q.toString()}`;
}

const of = (q, code) => ({ code, name: short(q.get("n"), 30), from: short(q.get("da"), 30) });

function parse(text) {
  const s = String(text == null ? "" : text).trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) {
    try {
      const u = new URL(s);
      if (u.origin !== SITE) return null;
      const c = String(u.searchParams.get("lega") || "").toUpperCase();
      return LEAGUE_RE.test(c) ? of(u.searchParams, c) : null;
    } catch (e) { return null; }
  }
  const c = s.toUpperCase();
  return LEAGUE_RE.test(c) ? { code: c, name: "", from: "" } : null;
}

function fromPage(loc) {
  if (!loc || typeof loc.search !== "string") return null;
  const q = new URLSearchParams(loc.search);
  const c = String(q.get("lega") || "").toUpperCase();
  return LEAGUE_RE.test(c) ? of(q, c) : null;
}

module.exports = { SITE, LEAGUE_RE, link, parse, fromPage };
