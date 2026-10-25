// Chat dei tifosi e moderazione come nell'app di oggi (bt-app-flutter/src/App.jsx, ChatPage e AdminChat):
// - 5 stanze, un documento ciascuna (shared/bt-chat-*), messaggi {id, user, aid, txt, t} aggiunti con arrayUnion;
// - segnalazioni in shared/bt-chat-reports, sospensioni in shared/bt-chat-banned (le cambia solo l'admin);
// - utenti bloccati e messaggi letti solo su questo telefono (bt-blocked, bt-chat-seen-<chiave della stanza di oggi>).
// I messaggi arrivano all'app nella forma della 2.0: {id, from, text, at, aid, mine} (compat.chatFromStore).
const FB = require("./firebase");
const C = require("./compat");

const CHAT_MSG = {
  banned: "Non puoi più scrivere in chat: il tuo account è stato sospeso per violazione delle regole.",
  offline: "Messaggio non inviato: controlla la connessione e riprova.",
  reported: "Segnalazione inviata: la controlleremo al più presto. Grazie!",
  "report-failed": "Segnalazione non inviata: controlla la connessione e riprova.",
  empty: "Nessun messaggio: scrivi tu il primo!",
  "no-aid": "Non riesco a identificare con certezza chi ha scritto questo messaggio (è vecchio, senza l'ID dell'autore): sospendilo da un suo messaggio più recente.",
  reaction: "Reazione non riuscita: riprova.",
  "reaction-offline": "Reazione non salvata: controlla la connessione e riprova.",
};
// 25/10: il profilo veloce (p: tifo, casco, trofei) va col messaggio solo quando cambia, o dopo una settimana, per
// stanza: chi lo guarda prende l'ultimo messaggio dell'autore che ce l'ha. Ricordato sul telefono (bt-chat-p-<stanza>).
const PROFILE_KEY = k => "bt-chat-p-" + k, PROFILE_REFRESH_MS = 7 * 86400000;
const REPORTS_KEY = "bt-chat-reports", BANNED_KEY = "bt-chat-banned", BLOCKED_KEY = "bt-blocked", LEGACY_KEY = "bt-chat";
const ROOM_IDS = Object.keys(C.CHAT_DB_KEY);
const mkErr = code => Object.assign(new Error(CHAT_MSG[code] || code), { code });
const list = v => (Array.isArray(v) ? v.filter(x => x && typeof x === "object") : []);
// Stesso autore per blocchi e sospensioni: con l'aid se c'è, altrimenti col nome (messaggi vecchi).
const sameWho = (a, b) => C.sameAuthor({ aid: a.aid || "", name: a.name }, { aid: b.aid || "", user: b.name != null ? b.name : b.user });

function createChat({ sg = FB.sg, sgStrict = FB.sgStrict, ss = FB.ss, sharedAppend = FB.sharedAppend, sharedRemoveWhere = FB.sharedRemoveWhere, local = FB.local, now = () => Date.now() } = {}) {
  const keyOf = roomId => {
    const k = C.CHAT_DB_KEY[roomId];
    if (!k) throw mkErr("room");
    return k;
  };
  const read = async k => { try { return list(await sgStrict(k)); } catch (e) { throw mkErr("offline"); } };
  const blocked = () => list(local.get(BLOCKED_KEY));
  const isBlocked = (m, bl) => bl.some(b => sameWho(b, { aid: m.aid, name: m.user }));

  // Messaggi della stanza senza quelli degli utenti bloccati. Senza rete lancia "offline" (chi chiama tiene quelli di prima).
  async function loadRoom(roomId, me) {
    const bl = blocked();
    return C.chatFromStore((await read(keyOf(roomId))).filter(m => !isBlocked(m, bl)), me);
  }
  // Un invio non riuscito può arrivare lo stesso più tardi (tempo scaduto): rimandando lo stesso testo si rimanda lo
  // stesso messaggio, che arrayUnion non aggiunge due volte (revisione della Fase B, minore 2).
  const failedSends = new Map();   // stanza → messaggio non partito
  async function send(roomId, text, me) {
    const txt = String(text || "").trim();
    if (!txt) throw mkErr("empty");
    const key = keyOf(roomId);
    const banned = await read(BANNED_KEY);
    if (banned.some(b => sameWho(b, { aid: me.aid, name: me.name }))) throw mkErr("banned");
    const prev = failedSends.get(key);
    let m = prev && prev.txt === txt && prev.aid === (me.aid || "") && prev.user === me.name ? prev : null;
    if (!m) {
      m = C.chatMsgToStore(txt, me, now());
      const sent = local.get(PROFILE_KEY(key));
      if (m.p && sent && sent.j === JSON.stringify(m.p) && now() - (sent.t || 0) < PROFILE_REFRESH_MS) delete m.p;
    }
    try { await sharedAppend(key, m); } catch (e) { failedSends.set(key, m); throw mkErr("offline"); }
    failedSends.delete(key);
    if (m.p) local.set(PROFILE_KEY(key), { j: JSON.stringify(m.p), t: m.t });
    return C.chatFromStore([m], me)[0];
  }
  // Reazione al messaggio msgId: emoji di C.REACTIONS, oppure null per toglierla. Una per persona: la vecchia va via.
  async function react(roomId, msgId, emoji, me) {
    const key = keyOf(roomId);
    if (emoji != null && !C.REACTIONS.includes(emoji)) throw mkErr("reaction");
    const banned = await read(BANNED_KEY);
    const who = { aid: me.aid || "", name: me.name };
    if (banned.some(b => sameWho(b, who))) throw mkErr("banned");
    try {
      await sharedRemoveWhere(key, x => !!x && x.re === String(msgId) && sameWho(who, { aid: x.aid || "", name: x.user }));
      if (emoji) await sharedAppend(key, C.reactionToStore(msgId, emoji, me, now()));
    } catch (e) { throw mkErr("offline"); }
  }

  // ── Moderazione ─────────────────────────────────────────────────────
  async function report(roomId, msg, me) {
    const reps = await read(REPORTS_KEY);
    if (reps.some(r => r.msgId === msg.id && r.byAid === (me.aid || ""))) return;
    try { await sharedAppend(REPORTS_KEY, C.reportToStore(roomId, msg, me, now())); } catch (e) { throw mkErr("report-failed"); }
  }
  const loadReports = async () => (await read(REPORTS_KEY)).map(C.reportFromStore).sort((a, b) => b.t - a.t);
  const loadBanned = async () => read(BANNED_KEY);
  async function deleteMessage(roomId, msgId) {
    await sharedRemoveWhere(keyOf(roomId), m => m && (m.id === msgId || m.re === msgId));   // con le sue reazioni
    await sharedRemoveWhere(REPORTS_KEY, r => r && r.msgId === msgId);
  }
  // Si sospende per aid: un messaggio vecchio senza aid non dice chi l'ha scritto (lo stesso nome lo può avere chiunque,
  // e qui non si possono cercare gli account per nome come faceva l'app di oggi). Errore "no-aid": lo si dice all'admin.
  async function suspend({ aid = "", name = "" } = {}) {
    if (!aid) throw mkErr("no-aid");
    const entry = { aid, name: name || "", t: now() };
    const banned = await read(BANNED_KEY);
    const old = banned.find(b => sameWho(b, entry));
    if (old) return old;
    await sharedAppend(BANNED_KEY, entry);
    return entry;
  }
  const unsuspend = entry => sharedRemoveWhere(BANNED_KEY, b => b && (entry.aid ? b.aid === entry.aid : !b.aid && b.name === entry.name));
  const ignoreReport = id => sharedRemoveWhere(REPORTS_KEY, r => r && r.id === id);

  // ── Solo su questo telefono ─────────────────────────────────────────
  function block(msg) {
    const who = { aid: msg.aid || "", name: msg.from != null ? msg.from : msg.user };
    local.set(BLOCKED_KEY, [...blocked().filter(b => !(b.aid === who.aid && b.name === who.name)), who]);
    return who;
  }
  function unblock(entry) {
    local.set(BLOCKED_KEY, blocked().filter(b => !(b.aid === (entry.aid || "") && b.name === entry.name)));
  }
  // Letti = ora dell'ultimo messaggio visto (formato di oggi); un numero piccolo è il formato vecchio (quanti messaggi).
  const seenKey = roomId => "bt-chat-seen-" + (C.ROOM_OLD_KEY[roomId] || roomId);
  function unread(roomId, msgs) {
    const seen = Number(local.get(seenKey(roomId))) || 0;
    const arr = Array.isArray(msgs) ? msgs : [];
    if (seen > 1e12) return arr.filter(m => (m.at || 0) > seen && !m.mine).length;
    return Math.max(0, arr.length - seen);
  }
  function markSeen(roomId, msgs) {
    const last = (Array.isArray(msgs) ? msgs : []).reduce((mx, m) => Math.max(mx, m.at || 0), 0);
    local.set(seenKey(roomId), last || now());
  }

  // La chat di una volta (shared/bt-chat) diventa la Generale, se questa non c'è ancora.
  async function migrateLegacy() {
    if ((await sgStrict(C.CHAT_DB_KEY.generale)) != null) return;
    const old = await sgStrict(LEGACY_KEY);
    if (old) await ss(C.CHAT_DB_KEY.generale, list(old));
  }

  // Eliminazione dell'account: i suoi messaggi (stesso aid, oppure senza aid e con lo stesso nome) dalle 5 stanze e da
  // bt-chat, e le segnalazioni fatte da lui o sui suoi messaggi.
  async function cleanupFor(user) {
    const aid = user.aid || C.authorId(user.email);
    const mine = m => !!m && (m.aid ? m.aid === aid : !!user.name && m.user === user.name);
    for (const k of [...ROOM_IDS.map(r => C.CHAT_DB_KEY[r]), LEGACY_KEY]) await sharedRemoveWhere(k, mine);
    await sharedRemoveWhere(REPORTS_KEY, r => !!r && (r.byAid === aid || r.aid === aid || (!r.aid && !!user.name && r.author === user.name)));
  }

  return { loadRoom, send, react, report, loadReports, loadBanned, deleteMessage, suspend, unsuspend, ignoreReport, block, unblock, blocked, unread, markSeen, migrateLegacy, cleanupFor };
}

module.exports = { CHAT_MSG, ROOM_IDS, createChat };
