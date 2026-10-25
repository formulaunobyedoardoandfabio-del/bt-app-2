// Dati F1 che si aggiornano da soli (25/10). Il workflow di GitHub .github/workflows/dati-f1.yml, ogni ora nei weekend di
// gara, rigenera da TracingInsights/2026 i file di public/data/f1 (tools/make_live_data.py) e Vercel li pubblica sul sito.
// Qui l'app li scarica: l'indice al massimo ogni 15 minuti e gli altri file solo quando cambia la loro impronta (h), poi
// restano nella memoria del telefono. Senza rete restano gli ultimi scaricati; senza niente, quelli dentro l'APK.
//  - weekend: gare e qualifiche 2026 già corse e prove libere degli ultimi weekend (formato di src/data/real-weekend.js)
//  - ghosts: Ghost Lap delle ultime qualifiche (formato delle sessioni di src/data/real-data.js)
const BASE = "https://bt-app-2.vercel.app/data/f1/";
const INDEX_FRESH_MS = 15 * 60000;
const K_INDEX = "f1-index", K_WEEKEND = "f1-weekend", K_GHOST = "f1-ghost-";

const isObj = v => !!v && typeof v === "object" && !Array.isArray(v);
const validIndex = x => isObj(x) && isObj(x.weekend) && typeof x.weekend.h === "string" && Array.isArray(x.ghosts)
  && x.ghosts.every(g => isObj(g) && typeof g.id === "string" && typeof g.circuitId === "string" && typeof g.h === "string");
const validWeekend = w => isObj(w) && Array.isArray(w.races) && Array.isArray(w.quali) && isObj(w.practice)
  && w.races.every(r => isObj(r) && typeof r.circuitId === "string" && Number.isInteger(r.round) && isObj(r.drivers))
  && w.quali.every(q => isObj(q) && typeof q.circuitId === "string" && Number.isInteger(q.round) && isObj(q.drivers));
const lapOk = L => isObj(L) && ["d", "t", "v", "x", "y"].every(k => Array.isArray(L[k]) && L[k].length >= 2 && L[k].length === L.d.length);
const validGhost = g => isObj(g) && typeof g.id === "string" && typeof g.circuitId === "string" && isObj(g.laps)
  && Object.keys(g.laps).length >= 2 && Object.values(g.laps).every(lapOk) && Array.isArray(g.corners || []);

function createF1Data({ fetch: f = (...a) => fetch(...a), now = () => Date.now(), store = null, base = BASE } = {}) {
  const get = k => (store ? store.get(k) : null), set = (k, v) => { if (store) store.set(k, v); };
  const json = async name => {
    const r = await f(base + name, { headers: { Accept: "application/json" } });
    if (!r || !r.ok) throw new Error("dati F1: HTTP " + (r ? r.status : "?"));
    return r.json();
  };
  // Un file con la sua impronta: dalla memoria se è quella giusta, altrimenti scaricato (e salvato se valido).
  const fileOf = async (key, name, h, valid) => {
    const saved = get(key);
    if (saved && saved.h === h && valid(saved.data)) return saved.data;
    try {
      const data = await json(name);
      if (!valid(data)) return null;
      set(key, { h, data });
      return data;
    } catch (e) {
      return null;
    }
  };
  async function load() {
    const cached = get(K_INDEX);
    let idx = cached && validIndex(cached.data) ? cached.data : null;
    if (!cached || !(now() - cached.at >= 0 && now() - cached.at < INDEX_FRESH_MS)) {
      try {
        const fresh = await json("index.json");
        if (validIndex(fresh)) { idx = fresh; set(K_INDEX, { at: now(), data: fresh }); }
      } catch (e) { /* senza rete: l'indice salvato, se c'è */ }
    }
    if (!idx) return null;
    const weekend = await fileOf(K_WEEKEND, "weekend.json", idx.weekend.h, validWeekend);
    const ghosts = [];
    for (const g of idx.ghosts.slice(0, 2)) {
      const data = await fileOf(K_GHOST + g.id, "ghost-" + g.circuitId + ".json", g.h, validGhost);
      if (data) ghosts.push({ id: g.id, circuitId: g.circuitId, place: g.place || g.circuitId, round: g.round || null, h: g.h, data });
    }
    if (!weekend && !ghosts.length) return null;
    return { weekend, weekendH: weekend ? idx.weekend.h : null, ghosts };
  }
  let inflight = null;
  const refresh = () => (inflight = inflight || load().catch(() => null).finally(() => { inflight = null; }));
  return { refresh };
}

// Mette i dati nuovi in quelli dell'app (gli oggetti di real-weekend.js e real-data.js, cambiati sul posto) senza perdere
// quelli dentro l'APK. ghostSessions: [[id, luogo]] dal più recente; ghostCircuit: id → circuito. true se è cambiato qualcosa.
function apply(r, { weekend, ghostData, ghostSessions, ghostCircuit }) {
  if (!r) return false;
  let changed = false;
  if (r.weekend && weekend && weekend.__h !== r.weekendH && r.weekend.races.length >= (weekend.races || []).length) {
    weekend.races = r.weekend.races;
    weekend.quali = r.weekend.quali;
    weekend.practice = { ...(weekend.practice || {}), ...r.weekend.practice };
    weekend.__h = r.weekendH;
    changed = true;
  }
  const ids = r.ghosts.map(g => g.id), cids = r.ghosts.map(g => g.circuitId);
  r.ghosts.forEach(g => {
    if (ghostData[g.id] && ghostData[g.id].__h === g.h) return;
    ghostData[g.id] = { ...g.data, __h: g.h };
    ghostCircuit[g.id] = g.circuitId;
    changed = true;
  });
  // Elenco: prima i Ghost Lap scaricati (dal più recente), poi quelli dell'APK di altri circuiti.
  const rest = ghostSessions.filter(([id]) => !ids.includes(id) && !cids.includes(ghostCircuit[id]));
  const next = [...r.ghosts.map(g => [g.id, g.place]), ...rest];
  if (JSON.stringify(next) !== JSON.stringify(ghostSessions)) { ghostSessions.splice(0, ghostSessions.length, ...next); changed = true; }
  return changed;
}

module.exports = { createF1Data, apply, validIndex, validWeekend, validGhost, BASE };
