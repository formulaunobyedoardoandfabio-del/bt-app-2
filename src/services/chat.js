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
};
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
  async function send(roomId, text, me) {
    const txt = String(text || "").trim();
    if (!txt) throw mkErr("empty");
    const key = keyOf(roomId);
    const banned = await read(BANNED_KEY);
    if (banned.some(b => sameWho(b, { aid: me.aid, name: me.name }))) throw mkErr("banned");
    const m = C.chatMsgToStore(txt, me, now());
    try { await sharedAppend(key, m); } catch (e) { throw mkErr("offline"); }
    return C.chatFromStore([m], me)[0];
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
    await sharedRemoveWhere(keyOf(roomId), m => m && m.id === msgId);
    await sharedRemoveWhere(REPORTS_KEY, r => r && r.msgId === msgId);
  }
  async function suspend({ aid = "", name = "" } = {}) {
    const entry = { aid: aid || "", name: name || "", t: now() };
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

  return { loadRoom, send, report, loadReports, loadBanned, deleteMessage, suspend, unsuspend, ignoreReport, block, unblock, blocked, unread, markSeen, migrateLegacy, cleanupFor };
}

module.exports = { CHAT_MSG, ROOM_IDS, createChat };
