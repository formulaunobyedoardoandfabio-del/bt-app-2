// Suoni e vibrazioni dell'app (Tappa 3, G03; prove in test/unit/fx.test.js e test/e2e/run51-suoni.js).
// - 1/11 (Edoardo: "cambia i suoni dell'app che fanno schifo, usa quelli che ti ho allegato"): i suoni sono i suoi 5
//   file (Pixabay, licenza libera senza obbligo di citazione), in public/sounds, suonati con Web Audio. Prima (R3) li
//   creava il telefono con dei piccoli sintetizzatori. L'audio parte solo dopo il primo tocco
//   dell'utente (unlock: i browser non lo lasciano partire prima), non suona con l'app in secondo piano e si ferma
//   quando l'app non si vede (sleep), così non consuma batteria.
// - Le vibrazioni usano il plugin Haptics di Capacitor nell'APK (@capacitor/haptics), altrimenti navigator.vibrate.
// - "Suoni" e "Vibrazioni" sono accesi di serie; la scelta resta sul telefono (bt-sounds, bt-haptics) e l'app la salva
//   anche nell'account.
// Nessuna funzione lancia errori: se l'audio o la vibrazione non vanno, semplicemente non si sentono.

// Vibrazioni del browser (millisecondi; un elenco = vibra, pausa, vibra...).
const BUZZ = {
  light: 10, medium: 20, heavy: 35, select: 6, error: [60, 40, 60, 40, 60], success: [15, 60, 25],
  // 31/10, stile F1: una luce rossa del semaforo, lo spegnimento (via), la pistola delle gomme, l'ala del DRS che si apre,
  // la bandiera a scacchi.
  lights: 45, go: [70, 50, 40], gun: [14, 22, 14, 22, 14], drs: [8, 40, 18], flag: [25, 70, 25, 70, 25, 70, 90],
};
// Nell'APK (31/10 sera) le vibrazioni sono vibrate({duration}) del plugin Haptics: la vibrazione vera del telefono,
// che si sente sempre. impact/selection seguono invece "Vibrazione al tocco" di Android, spesso spenta: per questo
// Edoardo non le sentiva. Ogni colpo dura almeno MIN_PULSE ms (sotto il motore di molti telefoni non parte).
const MIN_PULSE = 15;

// ── Suoni: i 5 file di Edoardo ────────────────────────────────────────────
// public/sounds (tagliati e pareggiati da tools: silenzio tolto, mono). tap: tocco morbido; click: tasto; nav: passaggio
// tra le schede; swipe: carta lanciata; radio: vecchio tasto della radio.
const FILES = { tap: "sounds/tap.mp3", click: "sounds/click.mp3", nav: "sounds/nav.mp3", swipe: "sounds/swipe.mp3", radio: "sounds/radio.mp3" };
// Ogni suono dell'app usa uno dei file; rate > 1 = più acuto e più corto, < 1 = più grave; vol pareggia i file (nav è
// molto più forte degli altri, radio più piano).
const SOUND_MAP = {
  tick: { f: "tap", vol: 0.9 },                    // interruttori, scelte, tocchi
  clack: { f: "click", vol: 0.8 },                 // salva, conferma un tasto
  shift: { f: "nav", vol: 0.45 },                  // cambio di scheda
  swoosh: { f: "swipe", vol: 0.9 },                // carte di Pit Swipe
  radio: { f: "radio", vol: 1 },                   // radio della squadra
  done: { f: "click", vol: 0.8, rate: 1.15 },      // fatto, risposta giusta
  abort: { f: "radio", vol: 1, rate: 0.75 },       // annullato, risposta sbagliata
  light: { f: "tap", vol: 0.9, rate: 0.8 },        // luce del semaforo
  go: { f: "swipe", vol: 0.9, rate: 1.1 },         // via
  gun: { f: "click", vol: 0.8, rate: 1.3 },        // pistola delle gomme (Pit Stop)
  drs: { f: "swipe", vol: 0.9, rate: 0.9 },        // ala che si apre
  flag: { f: "nav", vol: 0.45, rate: 1.1 },        // bandiera a scacchi
  rev: { f: "swipe", vol: 0.9, rate: 0.8 },        // motore che sale
  howl: { f: "swipe", vol: 0.9, rate: 0.65 },      // festa: Halloween
  bell: { f: "tap", vol: 0.9, rate: 1.5 },         // festa: Natale
};
const SOUNDS = Object.keys(SOUND_MAP);

// audioCtx: () => AudioContext (o null); load: url => Promise<ArrayBuffer> (i file dei suoni);
// haptics: plugin Haptics (o una funzione che lo dà); vibrate: (ms | [ms]) => void;
// local: { get, set } del telefono; hidden: () => true quando l'app non si vede.
// later: (fn, ms) => void per i colpi successivi delle vibrazioni a sequenza.
function createFx({ audioCtx = null, load = null, haptics = null, vibrate = null, local = null, hidden = () => false, later = (fn, ms) => setTimeout(fn, ms) } = {}) {
  const read = (k, def) => { try { const v = local && local.get(k); return typeof v === "boolean" ? v : def; } catch (e) { return def; } };
  const save = (k, v) => { try { if (local) local.set(k, v); } catch (e) {} };
  let soundsOn = read("bt-sounds", true), hapticsOn = read("bt-haptics", true);
  let variant = {};   // 31/10: suoni della festa ({ tick: "bell" }), da setHoliday
  let ctx = null, master = null;
  const buffers = {};   // file → AudioBuffer, caricati al primo tocco
  // Decodifica che va sia con la Promise sia con le callback (vecchie WebView di Android).
  const decode = ab => new Promise((res, rej) => { try { const r = ctx.decodeAudioData(ab, res, rej); if (r && typeof r.then === "function") r.then(res, rej); } catch (e) { rej(e); } });
  function loadAll() {
    if (!load) return;
    for (const [f, url] of Object.entries(FILES)) {
      if (buffers[f]) continue;
      try { Promise.resolve(load(url)).then(ab => (ab ? decode(ab) : null)).then(buf => { if (buf) buffers[f] = buf; }, () => {}); } catch (e) {}
    }
  }
  const quiet = p => { if (p && typeof p.catch === "function") p.catch(() => {}); };
  const isHidden = () => { try { return !!hidden(); } catch (e) { return false; } };

  function unlock() {
    try {
      if (!ctx) {
        ctx = audioCtx ? audioCtx() : null;
        if (!ctx) return false;
        master = ctx.createGain();
        master.gain.value = 1;   // 1/11: i file sono già pareggiati (prima 1.4 per i sintetizzatori)
        master.connect(ctx.destination);
        loadAll();
      }
      if (ctx.state !== "running" && !isHidden() && typeof ctx.resume === "function") quiet(ctx.resume());
      return true;
    } catch (e) { ctx = null; master = null; return false; }
  }
  const ready = () => !!ctx && ctx.state === "running";
  const soundOf = name => (variant[name] && SOUND_MAP[variant[name]] ? variant[name] : name);
  function play(name) {
    const s = soundOf(name), m = SOUND_MAP[s];
    if (!soundsOn || !m || isHidden() || !ready()) return false;
    const buf = buffers[m.f];
    if (!buf) return false;   // file non ancora caricato (o non trovato): niente suono, niente errore
    try {
      const src = ctx.createBufferSource(), g = ctx.createGain();
      src.buffer = buf;
      if (src.playbackRate) src.playbackRate.value = m.rate || 1;
      g.gain.value = m.vol == null ? 1 : m.vol;
      src.connect(g); g.connect(master);
      src.start(ctx.currentTime + 0.005);
      return true;
    } catch (e) { return false; }
  }
  const loaded = () => Object.keys(buffers).length;
  // App in secondo piano: l'audio si ferma (niente consumo); tornando si riprende se era già partito.
  function sleep(off) {
    try {
      if (!ctx) return;
      if (off && ctx.state === "running" && typeof ctx.suspend === "function") quiet(ctx.suspend());
      if (!off && ctx.state === "suspended" && typeof ctx.resume === "function") quiet(ctx.resume());
    } catch (e) {}
  }
  function buzz(kind) {
    if (!hapticsOn || !(kind in BUZZ)) return false;
    try {
      const h = typeof haptics === "function" ? haptics() : haptics;
      if (h) {
        const pat = [].concat(BUZZ[kind]);   // [vibra, pausa, vibra, ...]
        let at = 0;
        for (let i = 0; i < pat.length; i += 2) {
          const duration = Math.max(MIN_PULSE, pat[i]);
          const hit = () => { try { if (hapticsOn) quiet(h.vibrate({ duration })); } catch (e) {} };
          if (at) later(hit, at); else hit();
          at += pat[i] + (pat[i + 1] || 0);
        }
        return true;
      }
      if (vibrate) { vibrate(BUZZ[kind]); return true; }
    } catch (e) {}
    return false;
  }
  return {
    play, buzz, unlock, ready, sleep, soundOf, loaded,
    setHoliday(map) { variant = map && typeof map === "object" ? { ...map } : {}; },
    setSounds(on) { soundsOn = !!on; save("bt-sounds", soundsOn); },
    setHaptics(on) { hapticsOn = !!on; save("bt-haptics", hapticsOn); },
    sounds: () => soundsOn,
    haptics: () => hapticsOn,
  };
}

// L'istanza dell'app: Web Audio del telefono, Haptics nell'APK, navigator.vibrate nel browser.
const W = typeof window !== "undefined" ? window : null;
const fx = createFx({
  audioCtx: () => { const AC = W && (W.AudioContext || W.webkitAudioContext); return AC ? new AC() : null; },
  // I file accanto alla pagina (nell'APK dentro l'app, sul sito su Vercel); aperta da file (prove) non si caricano.
  load: W && typeof W.fetch === "function" && !(W.location && W.location.protocol === "file:")
    ? url => W.fetch(url).then(r => (r.ok ? r.arrayBuffer() : null)) : null,
  haptics: () => { try { const Cap = W && W.Capacitor; return (Cap && Cap.isNativePlatform && Cap.isNativePlatform() && Cap.Plugins && Cap.Plugins.Haptics) || null; } catch (e) { return null; } },
  vibrate: W && W.navigator && typeof W.navigator.vibrate === "function" ? p => { try { W.navigator.vibrate(p); } catch (e) {} } : null,
  local: W ? require("./firebase").local : null,
  hidden: () => !!(typeof document !== "undefined" && document.hidden),
});
if (typeof document !== "undefined" && document.addEventListener) document.addEventListener("visibilitychange", () => fx.sleep(document.hidden));
if (W) W.__btFx = fx;   // per le prove nel browser (test/e2e/run51-suoni.js), come window.__btLive

module.exports = { createFx, fx, SOUNDS, SOUND_MAP, FILES, BUZZ };
