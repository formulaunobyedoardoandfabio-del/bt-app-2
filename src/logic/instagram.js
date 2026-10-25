// Pagina Instagram rinnovata (25/10; prove in test/unit/instagram.test.js). I numeri e le date li scrive l'admin
// (shared/bt-ig-config): qui si leggono come li scrive lui ("12,3K", "1.200"), si sceglie l'ultimo reel e si fa la
// classifica dei più visti. Niente numeri inventati: un campo vuoto resta vuoto.
const DAY = 86400000;

// "1200", "1.200", "12,3K", "1,2M", "1.5 mln" → numero; vuoto o scritto male → null.
function parseCount(v) {
  if (typeof v === "number") return isFinite(v) && v >= 0 ? Math.round(v) : null;
  if (typeof v !== "string") return null;
  const m = v.trim().toLowerCase().match(/^(\d+(?:[.,]\d+)*)\s*(k|mila|m|mln)?$/);
  if (!m) return null;
  const [, num, unit] = m, groups = num.split(/[.,]/);
  let n;
  if (unit || groups.length === 2 && groups[1].length !== 3) {
    if (groups.length > 2) return null;          // "1.2.3K": non è un numero
    n = Number(groups.join("."));                 // virgola o punto: i decimali
  } else {
    if (groups.slice(1).some(g => g.length !== 3)) return null;
    n = Number(groups.join(""));                  // "1.200" e "10.500.000": i separatori delle migliaia
  }
  const mult = unit === "k" || unit === "mila" ? 1e3 : unit ? 1e6 : 1;
  return isFinite(n) ? Math.round(n * mult) : null;
}

// 12300 → "12,3K", 1250000 → "1,3M" (come li mostra Instagram, con la virgola).
function shortCount(n) {
  if (typeof n !== "number" || !isFinite(n)) return null;
  const fmt = x => String(x).replace(".", ",").replace(/,0$/, "");
  if (n < 1000) return String(n);
  const k = Math.round(n / 100) / 10;
  if (k < 1000) return fmt(k) + "K";
  return fmt(Math.round(n / 1e5) / 10) + "M";
}

// Data del reel (AAAA-MM-GG, scritta dall'admin) in ms, a mezzogiorno; senza data o scritta male: null.
const dateMs = v => (v && /^\d{4}-\d{2}-\d{2}$/.test(v.date || "") ? Date.parse(v.date + "T12:00:00Z") || null : null);
const notFuture = (d, now) => d != null && d <= now + DAY;

// L'ultimo reel: quello con la data più recente (non nel futuro); se nessuno ha la data, l'ultimo aggiunto.
function latestReel(videos, now = Date.now()) {
  const list = Array.isArray(videos) ? videos : [];
  if (!list.length) return null;
  let best = null, bestAt = -Infinity;
  list.forEach(v => { const d = dateMs(v); if (notFuture(d, now) && d >= bestAt) { best = v; bestAt = d; } });
  return best || list[list.length - 1];
}

// "NUOVO": uscito da 7 giorni o meno.
const isNew = (v, now = Date.now()) => { const d = dateMs(v); return notFuture(d, now) && now - d <= 7 * DAY; };

// I più visti (al massimo 5), per visualizzazioni; quelli usciti negli ultimi 30 giorni se sono almeno 2 (month: true),
// altrimenti tutti. Senza visualizzazioni vanno in fondo, nell'ordine dell'admin.
function topReels(videos, now = Date.now(), max = 5) {
  const list = Array.isArray(videos) ? videos : [];
  const recent = list.filter(v => { const d = dateMs(v); return notFuture(d, now) && now - d <= 30 * DAY; });
  const month = recent.length >= 2;
  const views = v => { const n = parseCount(v.views); return n == null ? -1 : n; };
  return { month, list: [...(month ? recent : list)].sort((a, b) => views(b) - views(a)).slice(0, max) };
}

module.exports = { parseCount, shortCount, latestReel, isNew, topReels, dateMs };
