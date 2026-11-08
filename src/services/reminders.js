// Promemoria di Sector 4 (1/11, stile Duolingo ma gentili): li programma il telefono con @capacitor/local-notifications,
// senza server. Ogni volta che l'app si apre si cancellano e si rifanno: il giro di domani alle 8:30, le sessioni che
// contano (qualifiche, sprint, gara) un'ora prima, la serie in pericolo la domenica del GP alle 18. Mai tra le 22 e le 8
// di Roma, si spengono dal Profilo (prefs.reminders === false). Il permesso si chiede solo dopo il primo giro completato.
const HOUR = 3600000, DAY = 86400000;
const ID = { deck: 101, streak: 102, session: 110, half: 120, halfLive: 121, trial: 130 };
// 8/11: avviso di metà gara, 50 minuti dopo il via (una gara dura di solito un'ora e mezza): solo se non hai visto la
// partenza (startSeen). Il telefono non sa chi è in testa (niente server): l'avviso invita ad aprire; con l'app aperta a
// metà gara il riassunto vero lo dà l'app (src/logic/halfway.js).
const HALF_MS = 50 * 60000;
// 8/11: prova gratuita del Premium (14 giorni, finisce da sola): avviso 2 giorni prima della fine, alle 18 di Roma. È la
// promessa della schermata Conferma ("Giorno 12: ti avvisiamo"), quindi resta anche coi promemoria spenti.
const TRIAL_WARN_DAYS = 2;
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

// decks: giri di Pit Swipe fatti (0 = niente promemoria del giro e della serie; non indicato = come prima).
function trialWarn(now, trialEnd) {
  if (!isFinite(trialEnd) || trialEnd == null) return null;
  const at = romeAt(romeHM(trialEnd - TRIAL_WARN_DAYS * DAY).day, 18, 0);
  if (!(at > now) || at >= trialEnd) return null;
  return { id: ID.trial, at, title: "La prova Premium finisce tra 2 giorni", body: "Finisce da sola, senza addebiti. Se vuoi restare Premium scegli Stagione o Mensile." };
}

// trialEnd: fine della prova gratuita in corso (ms), solo se non è già diventata un abbonamento.
function plan({ now, race = null, sessions = [], deckDone = false, streak = null, prefs = {}, decks = undefined, startSeen = false, trialEnd = null } = {}) {
  const tw = trialWarn(now, trialEnd);
  if (prefs && prefs.reminders === false) return tw ? [tw] : [];
  const out = tw ? [tw] : [];
  // Giro del giorno: le 8:30 di Roma successive (oggi se non sono ancora passate e il giro non è fatto).
  const today = romeHM(now).day;
  let deckAt = romeAt(today, 8, 30);
  if (!(deckAt > now) || deckDone) deckAt = romeAt(romeHM(now + DAY).day, 8, 30);
  if (isFinite(deckAt) && decks !== 0) out.push({ id: ID.deck, at: deckAt, title: "Il giro di oggi è pronto", body: "10 carte, 2 minuti: notizie, opinioni e un vero o falso." });
  // Sessioni che contano, nei prossimi 7 giorni.
  (sessions || []).filter(s => s && LABEL[s.key]).forEach((s, i) => {
    const start = Date.parse(s.utc), at = start - HOUR;
    if (!isFinite(at) || at <= now || at > now + 7 * DAY || quiet(at)) return;
    const what = race && race.name ? race.name : "il GP";
    const body = s.key === "RACE" ? `${what}: vota il pilota del giorno a fine gara.` : `${what}: hai fatto il pronostico?`;
    out.push({ id: ID.session + i, at, title: `${LABEL[s.key]} tra un'ora`, body });
  });
  // Serie in pericolo: la domenica del GP alle 18, se la serie c'è e il giro di questo GP non è ancora fatto.
  if (decks !== 0 && streak && streak.danger && streak.n > 0 && race && race.date) {
    const at = romeAt(String(race.date).slice(0, 10), 18, 0);
    if (at > now) out.push({ id: ID.streak, at, title: "La tua serie è in pericolo", body: `${streak.n} GP di fila: basta un giro di Pit Swipe per tenerla.` });
  }
  // Metà gara, se non hai visto la partenza e non l'hai spento dal Profilo.
  const rs = (sessions || []).find(x => x && x.key === "RACE");
  if (rs && !startSeen && !(prefs && prefs.halfway === false)) {
    const at = Date.parse(rs.utc) + HALF_MS;
    if (isFinite(at) && at > now && at <= now + 7 * DAY) out.push({ id: ID.half, at, title: `Metà gara: ${race && race.name ? race.name : "il GP"}`, body: "Ti sei perso la partenza? Apri B&T: chi è in testa, distacchi e chi ha già fermato." });
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
    const ids = [ID.deck, ID.streak, ID.half, ID.trial, ...Array.from({ length: 10 }, (_, i) => ID.session + i)];
    if (plugin.cancel) await plugin.cancel({ notifications: ids.map(id => ({ id })) });
    if (!list.length) return true;
    await plugin.schedule({ notifications: list.map(x => ({ id: x.id, title: x.title, body: x.body, schedule: { at: new Date(x.at), allowWhileIdle: true } })) });
    return true;
  } catch (e) { return false; }
}

// Toglie l'avviso di metà gara già programmato (partenza vista, o riassunto dato dall'app aperta).
async function cancelHalf(plugin) {
  try { if (plugin && plugin.cancel) await plugin.cancel({ notifications: [{ id: ID.half }] }); return true; } catch (e) { return false; }
}

// 8/11 (Edoardo: "notifica vera nel centro notifiche"): notifica del telefono subito, coi dati veri, quando l'app è aperta o
// in sottofondo (metà gara: id 121, così non la toglie chi cancella quella programmata). Il permesso non si chiede qui:
// a metà gara nessuno lo aspetta; se manca, niente.
async function notifyNow(plugin, { id, title, body }) {
  if (!plugin || !plugin.schedule) return false;
  try {
    const perm = plugin.checkPermissions ? await plugin.checkPermissions() : { display: "granted" };
    if (perm.display !== "granted") return false;
    await plugin.schedule({ notifications: [{ id, title, body, schedule: { at: new Date(Date.now() + 1000), allowWhileIdle: true } }] });
    return true;
  } catch (e) { return false; }
}

module.exports = { plan, apply, cancelHalf, notifyNow, ID, romeAt, HALF_MS };
