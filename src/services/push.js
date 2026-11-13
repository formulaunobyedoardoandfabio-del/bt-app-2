// Notifiche push (13/11, Edoardo: "le notifiche che scrivo io nell'app non appaiono nella schermata di blocco").
// Prima le notifiche dell'admin stavano solo su Firebase (campanella): con l'app chiusa non arrivava niente. Ora:
//  - ogni telefono si iscrive al tema "novita" di Firebase Cloud Messaging (plugin @capacitor-firebase/messaging), se
//    l'utente non ha spento "Novità da B&T" nel Profilo;
//  - quando l'admin scrive una notifica, la sua app avvisa api/push (Vercel), che la manda a tutto il tema.
// Sul telefono non si salva nessun codice del dispositivo nel database: l'iscrizione al tema la tiene Google.
// Serve google-services.json nell'APK (resources/google-services.json, lo copia scripts/prepare_android.py): senza, il
// plugin risponde "not-configured" e l'app va avanti come prima.
const API = "https://bt-app-2.vercel.app/api/";
const TOPIC = "novita";
// Canale Android: importanza 4 = alta (banner e suono), visibilità 1 = si legge anche a schermo bloccato.
const CHANNEL = { id: "bt-novita", name: "Novità da B&T", description: "Avvisi scritti dal team B&T", importance: 4, visibility: 1 };
const MSG = {
  config: "Salvata nella campanella. Per mandarla ai telefoni manca l'account di servizio su Vercel (FIREBASE_SERVICE_ACCOUNT).",
  fcm: "Salvata nella campanella. Google ha rifiutato l'invio ai telefoni: controlla che Cloud Messaging sia attivo nel progetto Firebase.",
  network: "Salvata nella campanella. Invio ai telefoni non riuscito: riprova tra poco.",
  failed: "Salvata nella campanella. Invio ai telefoni non riuscito.",
};

// Iscrive (on) o toglie (off) questo telefono dal tema delle novità. Non chiede permessi: quello delle notifiche lo
// chiede l'app quando serve (src/services/reminders.js).
async function sync(plugin, on) {
  if (!plugin || !plugin.subscribeToTopic) return { ok: false, reason: "no-plugin" };
  try {
    if (on) {
      if (plugin.createChannel) await plugin.createChannel(CHANNEL).catch(() => {});
      await plugin.subscribeToTopic({ topic: TOPIC });
    } else {
      await plugin.unsubscribeFromTopic({ topic: TOPIC });
    }
    return { ok: true, on: !!on };
  } catch (e) {
    return { ok: false, reason: "not-configured", message: String((e && e.message) || e) };
  }
}

// L'admin ha appena scritto una notifica su Firebase: chiede al server di mandarla ai telefoni. Niente testi nella
// richiesta: il server legge la notifica da Firebase (dove scrive solo l'admin).
async function announce(fetchImpl = (...a) => fetch(...a)) {
  try {
    const r = await fetchImpl(API + "push", { method: "POST" });
    let j = null;
    try { j = await r.json(); } catch (e) { j = null; }
    if (j && j.ok) return { ok: true, sent: j.sent || 0, skipped: j.skipped || 0 };
    return { ok: false, reason: (j && j.reason) || "failed" };
  } catch (e) {
    return { ok: false, reason: "network" };
  }
}

module.exports = { sync, announce, TOPIC, CHANNEL, MSG };
