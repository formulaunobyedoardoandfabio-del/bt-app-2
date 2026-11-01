// Promemoria di Sector 4 (1/11, stile Duolingo ma gentili): li programma il telefono con @capacitor/local-notifications,
// senza server. Ogni volta che l'app si apre si cancellano e si rifanno: il giro di domani alle 8:30, le sessioni che
// contano (qualifiche, sprint, gara) un'ora prima, la serie in pericolo la domenica del GP alle 18. Mai tra le 22 e le 8
// di Roma, si spengono dal Profilo (prefs.reminders === false). Il permesso si chiede solo dopo il primo giro completato.
const HOUR = 3600000, DAY = 86400000;
const ID = { deck: 101, streak: 102, session: 110 };
const LABEL = { SQ: "Qualifiche Sprint", SPRINT: "Sprint", QUALI: "Qualifiche", RACE: "Gara" };

function romeHM(ms) {
  const f = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const p = Object.fromEntries(f.formatToParts(new Date(ms)).map(x => [x.type, x.value]));
  return { day: `${p.year}-${p.month}-${p.day}`, h: Number(p.hour), m: Number(p.minute) };
}
// Il momento (ms) di un'ora di Roma in un giorno di Roma (YYYY-MM-DD): si prova con +1 e +2 ore di fuso.
function romeAt(day, h, m = 0) {
  for (const off of [1, 2]) {
    const ms = Date.parse(`${day}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00Z`) - off * HOUR;
    const r = romeHM(ms);
    if (r.day === day && r.h === h && r.m === m) return ms;
  }
  return NaN;
}
const quiet = ms => { const h = romeHM(ms).h; return h < 8 || h >= 22; };

function plan({ now, race = null, sessions = [], deckDone = false, streak = null, prefs = {} } = {}) {
  if (prefs && prefs.reminders === false) return [];
  const out = [];
  // Giro del giorno: le 8:30 di Roma successive (oggi se non sono ancora passate e il giro non è fatto).
  const today = romeHM(now).day;
  let deckAt = romeAt(today, 8, 30);
  if (!(deckAt > now) || deckDone) deckAt = romeAt(romeHM(now + DAY).day, 8, 30);
  if (isFinite(deckAt)) out.push({ id: ID.deck, at: deckAt, title: "Il giro di oggi è pronto", body: "10 carte, 2 minuti: notizie, opinioni e un vero o falso." });
  // Sessioni che contano, nei prossimi 7 giorni.
  (sessions || []).filter(s => s && LABEL[s.key]).forEach((s, i) => {
    const start = Date.parse(s.utc), at = start - HOUR;
    if (!isFinite(at) || at <= now || at > now + 7 * DAY || quiet(at)) return;
    const what = race && race.name ? race.name : "il GP";
    const body = s.key === "RACE" ? `${what}: vota il pilota del giorno a fine gara.` : `${what}: hai fatto il pronostico?`;
    out.push({ id: ID.session + i, at, title: `${LABEL[s.key]} tra un'ora`, body });
  });
  // Serie in pericolo: la domenica del GP alle 18, se la serie c'è e il giro di questo GP non è ancora fatto.
  if (streak && streak.danger && streak.n > 0 && race && race.date) {
    const at = romeAt(String(race.date).slice(0, 10), 18, 0);
    if (at > now) out.push({ id: ID.streak, at, title: "La tua serie è in pericolo", body: `${streak.n} GP di fila: basta un giro di Pit Swipe per tenerla.` });
  }
  return out.filter(x => isFinite(x.at) && !quiet(x.at)).sort((a, b) => a.at - b.at);
}

// Programma i promemoria col plugin (null nel browser: niente). ask: chiedere il permesso se manca.
async function apply(plugin, list, { ask = false } = {}) {
  if (!plugin || !plugin.schedule) return false;
  try {
    let perm = plugin.checkPermissions ? await plugin.checkPermissions() : { display: "granted" };
    if (perm.display !== "granted" && ask && plugin.requestPermissions) perm = await plugin.requestPermissions();
    if (perm.display !== "granted") return false;
    const ids = [ID.deck, ID.streak, ...Array.from({ length: 10 }, (_, i) => ID.session + i)];
    if (plugin.cancel) await plugin.cancel({ notifications: ids.map(id => ({ id })) });
    if (!list.length) return true;
    await plugin.schedule({ notifications: list.map(x => ({ id: x.id, title: x.title, body: x.body, schedule: { at: new Date(x.at), allowWhileIdle: true } })) });
    return true;
  } catch (e) { return false; }
}

module.exports = { plan, apply, ID, romeAt };
