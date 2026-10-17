// Suoni e vibrazioni dell'app (Tappa 3, G03; prove in test/unit/fx.test.js e test/e2e/run51-suoni.js).
// - I suoni li crea il telefono con Web Audio (R3: nessun file audio di altri). L'audio parte solo dopo il primo tocco
//   dell'utente (unlock: i browser non lo lasciano partire prima), non suona con l'app in secondo piano e si ferma
//   quando l'app non si vede (sleep), così non consuma batteria.
// - Le vibrazioni usano il plugin Haptics di Capacitor nell'APK (@capacitor/haptics), altrimenti navigator.vibrate.
// - "Suoni" e "Vibrazioni" sono accesi di serie; la scelta resta sul telefono (bt-sounds, bt-haptics) e l'app la salva
//   anche nell'account.
// Nessuna funzione lancia errori: se l'audio o la vibrazione non vanno, semplicemente non si sentono.

// Vibrazioni del browser (millisecondi; un elenco = vibra, pausa, vibra...).
const BUZZ = { light: 10, medium: 20, heavy: 35, select: 6, error: [60, 40, 60, 40, 60], success: [15, 60, 25] };
const IMPACT = { light: "LIGHT", medium: "MEDIUM", heavy: "HEAVY" };      // ImpactStyle di @capacitor/haptics
const NOTIFY = { error: "ERROR", success: "SUCCESS" };                  // NotificationType di @capacitor/haptics

// ── Suoni: piccoli sintetizzatori ────────────────────────────────────────
// Un tono con il volume che sale in 5 ms e poi scende; la frequenza va da f0 a f1.
function tone(ctx, out, { t, dur, f0, f1 = f0, type = "sine", vol = 0.15, filter }) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let last = o;
  if (filter) { const f = ctx.createBiquadFilter(); f.type = filter.type; f.frequency.setValueAtTime(filter.freq, t); if (filter.q) f.Q.setValueAtTime(filter.q, t); o.connect(f); last = f; }
  last.connect(g); g.connect(out);
  o.start(t); o.stop(t + dur + 0.02);
  return o;
}
// Un soffio di rumore filtrato (clack, scrocchio della cambiata, fruscio della radio).
function noise(ctx, out, { t, dur, vol = 0.2, type = "bandpass", freq = 1500, q = 1 }) {
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur)), buf = ctx.createBuffer(1, len, ctx.sampleRate), data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = buf;
  f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.setValueAtTime(q, t);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(out);
  s.start(t); s.stop(t + dur + 0.02);
  return s;
}
const SYNTH = {
  // Tic della selezione.
  tick: (ctx, out, t) => { tone(ctx, out, { t, dur: 0.025, f0: 2400, type: "square", vol: 0.08, filter: { type: "highpass", freq: 1200 } }); },
  // Cambiata: il motore sale, poi lo scatto della marcia.
  shift: (ctx, out, t) => {
    tone(ctx, out, { t, dur: 0.12, f0: 210, f1: 480, type: "sawtooth", vol: 0.12, filter: { type: "lowpass", freq: 1800 } });
    noise(ctx, out, { t: t + 0.12, dur: 0.04, vol: 0.22, freq: 900, q: 2 });
    tone(ctx, out, { t: t + 0.12, dur: 0.08, f0: 130, f1: 90, type: "triangle", vol: 0.18 });
  },
  // Clack della visiera del casco che si chiude.
  clack: (ctx, out, t) => {
    noise(ctx, out, { t, dur: 0.035, vol: 0.32, freq: 2200, q: 2 });
    tone(ctx, out, { t, dur: 0.06, f0: 160, f1: 80, vol: 0.22 });
  },
  // Bip del Team Radio: fruscio e due bip.
  radio: (ctx, out, t) => {
    noise(ctx, out, { t, dur: 0.06, vol: 0.07, freq: 1500, q: 0.7 });
    tone(ctx, out, { t: t + 0.05, dur: 0.07, f0: 1320, vol: 0.14 });
    tone(ctx, out, { t: t + 0.17, dur: 0.07, f0: 1320, vol: 0.14 });
  },
  // Sgasata: il motore sale di giri e torna giù.
  rev: (ctx, out, t) => {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = "sawtooth"; o2.type = "square";
    [[o, 1], [o2, 0.5]].forEach(([x, k]) => {
      x.frequency.setValueAtTime(70 * k, t);
      x.frequency.linearRampToValueAtTime(340 * k, t + 0.35);
      x.frequency.linearRampToValueAtTime(150 * k, t + 0.7);
      x.connect(f);
    });
    f.type = "lowpass"; f.frequency.setValueAtTime(1200, t); f.Q.setValueAtTime(4, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.72);
    f.connect(g); g.connect(out);
    o.start(t); o2.start(t); o.stop(t + 0.75); o2.stop(t + 0.75);
  },
  // Partenza abortita: tre ronzii che scendono.
  abort: (ctx, out, t) => {
    tone(ctx, out, { t, dur: 0.1, f0: 300, type: "square", vol: 0.09, filter: { type: "lowpass", freq: 1400 } });
    tone(ctx, out, { t: t + 0.12, dur: 0.1, f0: 240, type: "square", vol: 0.09, filter: { type: "lowpass", freq: 1400 } });
    tone(ctx, out, { t: t + 0.24, dur: 0.22, f0: 180, f1: 120, type: "square", vol: 0.1, filter: { type: "lowpass", freq: 1400 } });
  },
  // Conferma (Shift Light finita): due note che salgono.
  done: (ctx, out, t) => {
    tone(ctx, out, { t, dur: 0.09, f0: 880, vol: 0.13 });
    tone(ctx, out, { t: t + 0.1, dur: 0.14, f0: 1320, vol: 0.13 });
  },
};
const SOUNDS = Object.keys(SYNTH);

// audioCtx: () => AudioContext (o null); haptics: plugin Haptics (o una funzione che lo dà); vibrate: (ms | [ms]) => void;
// local: { get, set } del telefono; hidden: () => true quando l'app non si vede.
function createFx({ audioCtx = null, haptics = null, vibrate = null, local = null, hidden = () => false } = {}) {
  const read = (k, def) => { try { const v = local && local.get(k); return typeof v === "boolean" ? v : def; } catch (e) { return def; } };
  const save = (k, v) => { try { if (local) local.set(k, v); } catch (e) {} };
  let soundsOn = read("bt-sounds", true), hapticsOn = read("bt-haptics", true);
  let ctx = null, master = null;
  const quiet = p => { if (p && typeof p.catch === "function") p.catch(() => {}); };
  const isHidden = () => { try { return !!hidden(); } catch (e) { return false; } };

  function unlock() {
    try {
      if (!ctx) {
        ctx = audioCtx ? audioCtx() : null;
        if (!ctx) return false;
        master = ctx.createGain();
        master.gain.value = 0.8;
        master.connect(ctx.destination);
      }
      if (ctx.state !== "running" && !isHidden() && typeof ctx.resume === "function") quiet(ctx.resume());
      return true;
    } catch (e) { ctx = null; master = null; return false; }
  }
  const ready = () => !!ctx && ctx.state === "running";
  function play(name) {
    if (!soundsOn || !SYNTH[name] || isHidden() || !ready()) return false;
    try { SYNTH[name](ctx, master, ctx.currentTime + 0.005); return true; } catch (e) { return false; }
  }
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
        if (IMPACT[kind]) quiet(h.impact({ style: IMPACT[kind] }));
        else if (NOTIFY[kind]) quiet(h.notification({ type: NOTIFY[kind] }));
        else quiet(Promise.resolve().then(() => h.selectionStart()).then(() => h.selectionChanged()).then(() => h.selectionEnd()));
        return true;
      }
      if (vibrate) { vibrate(BUZZ[kind]); return true; }
    } catch (e) {}
    return false;
  }
  return {
    play, buzz, unlock, ready, sleep,
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
  haptics: () => { try { const Cap = W && W.Capacitor; return (Cap && Cap.isNativePlatform && Cap.isNativePlatform() && Cap.Plugins && Cap.Plugins.Haptics) || null; } catch (e) { return null; } },
  vibrate: W && W.navigator && typeof W.navigator.vibrate === "function" ? p => { try { W.navigator.vibrate(p); } catch (e) {} } : null,
  local: W ? require("./firebase").local : null,
  hidden: () => !!(typeof document !== "undefined" && document.hidden),
});
if (typeof document !== "undefined" && document.addEventListener) document.addEventListener("visibilitychange", () => fx.sleep(document.hidden));
if (W) W.__btFx = fx;   // per le prove nel browser (test/e2e/run51-suoni.js), come window.__btLive

module.exports = { createFx, fx, SOUNDS, BUZZ };
