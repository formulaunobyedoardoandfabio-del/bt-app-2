// Prove dei suoni e delle vibrazioni (Tappa 3, G03; src/services/fx.js) con un Web Audio finto, il plugin Haptics
// finto dell'APK e navigator.vibrate finto. Gira in Node.
// Uso: node test/unit/fx.test.js [filtro]
const assert = require('assert');
const path = require('path');
const { createFx, SOUNDS, SOUND_MAP, FILES, BUZZ } = require(path.join(__dirname, '..', '..', 'src', 'services', 'fx.js'));

// Web Audio finto: ricorda gli oscillatori e i suoni avviati (dal 1/11 i file di Edoardo: createBufferSource).
function fakeAudio({ failResume = false, failCreate = false, state = 'suspended' } = {}) {
  const log = { ctx: 0, osc: [], noise: [], resumed: 0 };
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} });
  const node = extra => ({ connect() { return this; }, disconnect() {}, ...extra });
  const factory = () => {
    log.ctx++;
    if (failCreate) throw new Error('AudioContext non disponibile');
    const ctx = {
      state, currentTime: 1, sampleRate: 44100, destination: node(),
      resume() { log.resumed++; if (failResume) return Promise.reject(new Error('non permesso')); ctx.state = 'running'; return Promise.resolve(); },
      createOscillator() { const o = node({ type: 'sine', frequency: param(), detune: param(), start(t) { log.osc.push(o); o.started = t; }, stop() {} }); return o; },
      createGain() { return node({ gain: param() }); },
      createBiquadFilter() { return node({ type: 'lowpass', frequency: param(), Q: param(), gain: param() }); },
      createBuffer(ch, len) { return { getChannelData: () => new Float32Array(len), length: len }; },
      createBufferSource() { const s = node({ buffer: null, playbackRate: param(), start() { log.noise.push(s); }, stop() {} }); return s; },
      decodeAudioData(ab) { log.decoded = (log.decoded || 0) + 1; return ab && ab.bad ? Promise.reject(new Error('file rotto')) : Promise.resolve({ duration: 0.3, from: ab && ab.url }); },
    };
    return ctx;
  };
  return { factory, log };
}
const fakeLocal = (init = {}) => { const m = { ...init }; return { get: k => (k in m ? m[k] : null), set: (k, v) => { m[k] = v; }, m }; };
const fakeHaptics = () => {
  const calls = [];
  const rec = name => arg => { calls.push([name, arg]); return Promise.resolve(); };
  return { calls, impact: rec('impact'), notification: rec('notification'), vibrate: rec('vibrate'), selectionStart: rec('selectionStart'), selectionChanged: rec('selectionChanged'), selectionEnd: rec('selectionEnd') };
};
const tick = () => new Promise(r => setTimeout(r, 0));
// I file dei suoni finti: { url } come ArrayBuffer; miss = file che non arriva, bad = file rotto.
const fakeLoad = ({ miss = [], bad = [] } = {}) => { const urls = []; const fn = url => { urls.push(url); if (miss.some(m => url.includes(m))) return Promise.reject(new Error('404')); return Promise.resolve({ url, bad: bad.some(m => url.includes(m)) }); }; fn.urls = urls; return fn; };

const tests = {
  // 31/10 (Edoardo: "più suoni e vibrazioni stile F1"): semaforo, via, pistola delle gomme, DRS, bandiera a scacchi.
  async 'suoni F1 nuovi: semaforo, via, pistola, DRS e bandiera suonano'() {
    for (const name of ['light', 'go', 'gun', 'drs', 'flag']) {
      assert.ok(SOUNDS.includes(name), 'manca il suono ' + name);
      const a = fakeAudio({ state: 'running' });
      const fx = createFx({ audioCtx: a.factory, load: fakeLoad(), local: fakeLocal() });
      fx.unlock(); await tick();
      assert.strictEqual(fx.play(name), true, name);
      assert.ok(a.log.noise.length >= 1, name + ': nessun suono');
    }
  },
  async 'vibrazioni a sequenza nell\'APK: la bandiera dà più colpi nel tempo'() {
    const h = fakeHaptics(), q = [];
    const fx = createFx({ haptics: h, local: fakeLocal(), later: (fn, ms) => q.push([ms, fn]) });
    assert.strictEqual(fx.buzz('flag'), true);
    assert.deepStrictEqual(h.calls, [['vibrate', { duration: BUZZ.flag[0] }]], 'il primo colpo parte subito');
    assert.deepStrictEqual(q.map(x => x[0]), [95, 190, 285], 'gli altri colpi dopo le pause dello schema');
    q.forEach(([, fn]) => fn());
    assert.deepStrictEqual(h.calls.map(c => c[1].duration), [25, 25, 25, 90]);
    for (const k of ['lights', 'go', 'gun', 'drs', 'flag']) assert.ok(k in BUZZ, 'manca la vibrazione ' + k);
  },
  async 'vibrazioni a sequenza: spegnendo Vibrazioni i colpi rimasti non partono; nel browser lo schema intero'() {
    const h = fakeHaptics(), q = [];
    const fx = createFx({ haptics: h, local: fakeLocal(), later: (fn, ms) => q.push(fn) });
    fx.buzz('gun');
    const n = h.calls.length;
    fx.setHaptics(false);
    q.forEach(fn => fn());
    assert.strictEqual(h.calls.length, n);
    const got = [];
    const fx2 = createFx({ vibrate: p => got.push(p), local: fakeLocal() });
    assert.strictEqual(fx2.buzz('flag'), true);
    assert.deepStrictEqual(got, [BUZZ.flag]);
  },
  // 31/10: temi delle feste: a Natale il tic è un campanellino, a Halloween lo swipe (drs) un ululato, ecc.
  async 'temi delle feste: setHoliday cambia i suoni (tic → campanellino); senza tema tornano quelli di sempre'() {
    for (const name of ['bell', 'howl', 'swoosh']) assert.ok(SOUNDS.includes(name), 'manca il suono ' + name);
    const a = fakeAudio({ state: 'running' });
    const fx = createFx({ audioCtx: a.factory, load: fakeLoad(), local: fakeLocal() });
    fx.unlock(); await tick();
    fx.setHoliday({ tick: 'bell' });
    assert.strictEqual(fx.soundOf('tick'), 'bell');
    assert.strictEqual(fx.play('tick'), true);
    assert.strictEqual(fx.soundOf('shift'), 'shift', 'gli altri restano');
    fx.setHoliday(null);
    assert.strictEqual(fx.soundOf('tick'), 'tick');
    fx.setHoliday({ tick: 'nessuno' });
    assert.strictEqual(fx.soundOf('tick'), 'tick', 'suono che non esiste: quello di sempre');
  },
  async 'prima di unlock nessun suono e nessun errore'() {
    const a = fakeAudio();
    const fx = createFx({ audioCtx: a.factory, load: fakeLoad(), local: fakeLocal() });
    for (const name of SOUNDS) assert.strictEqual(fx.play(name), false, name + ' prima del primo tocco');
    assert.strictEqual(a.log.ctx, 0, 'l\'audio non deve partire prima di un tocco');
    assert.strictEqual(fx.play('nessuno'), false);
  },
  async 'dopo unlock play("shift") suona il file del cambio di scheda'() {
    const a = fakeAudio();
    const fx = createFx({ audioCtx: a.factory, load: fakeLoad(), local: fakeLocal() });
    fx.unlock(); await tick();
    assert.strictEqual(a.log.ctx, 1); assert.strictEqual(a.log.resumed, 1);
    assert.strictEqual(fx.play('shift'), true);
    assert(a.log.noise.length >= 1 && a.log.noise[0].buffer && /nav\.mp3$/.test(a.log.noise[0].buffer.from), 'la cambiata non suona nav.mp3');
    fx.unlock(); await tick();
    assert.strictEqual(a.log.ctx, 1, 'un secondo tocco non crea un altro audio');
    const before = a.log.osc.length + a.log.noise.length;
    for (const name of SOUNDS) assert.strictEqual(fx.play(name), true, name);
    assert(a.log.osc.length + a.log.noise.length >= before + SOUNDS.length, 'qualche suono non suona');
    assert.strictEqual(fx.play('nessuno'), false, 'un suono che non c\'è');
  },
  async 'Suoni spento: nessun suono, le vibrazioni restano'() {
    const a = fakeAudio(), loc = fakeLocal(), h = fakeHaptics();
    const fx = createFx({ audioCtx: a.factory, haptics: h, local: loc });
    assert.strictEqual(fx.sounds(), true, 'di serie i suoni sono accesi');
    assert.strictEqual(fx.haptics(), true, 'di serie le vibrazioni sono accese');
    fx.unlock(); await tick();
    fx.setSounds(false);
    assert.strictEqual(fx.sounds(), false);
    assert.strictEqual(loc.m['bt-sounds'], false, 'la scelta non resta sul telefono');
    assert.strictEqual(fx.play('tick'), false);
    assert.strictEqual(a.log.osc.length + a.log.noise.length, 0);
    assert.strictEqual(fx.buzz('light'), true);
    assert.deepStrictEqual(h.calls, [['vibrate', { duration: 15 }]]);
    fx.setHaptics(false);
    assert.strictEqual(fx.buzz('heavy'), false);
    assert.strictEqual(h.calls.length, 1, 'con Vibrazioni spento il telefono vibra');
    assert.strictEqual(loc.m['bt-haptics'], false);
    const again = createFx({ audioCtx: a.factory, haptics: h, local: loc });
    assert.strictEqual(again.sounds(), false, 'dopo il riavvio i suoni tornano accesi');
    assert.strictEqual(again.haptics(), false, 'dopo il riavvio le vibrazioni tornano accese');
  },
  async 'Haptics dell\'APK per buzz("error"), navigator.vibrate nel browser'() {
    const h = fakeHaptics(), vib = [];
    const apk = createFx({ haptics: h, vibrate: p => vib.push(p), local: fakeLocal() });
    apk.buzz('medium'); apk.buzz('heavy'); apk.buzz('select');
    assert.deepStrictEqual(h.calls.map(c => c[0]), ['vibrate', 'vibrate', 'vibrate'], 'nell\'APK vibrate di Haptics (sempre sentita)');
    assert.deepStrictEqual(h.calls.map(c => c[1].duration), [BUZZ.medium, BUZZ.heavy, 15], 'anche il tic più leggero dura almeno 15 ms');
    assert.strictEqual(apk.buzz('error'), true);
    assert.deepStrictEqual(vib, [], 'nell\'APK si usa Haptics, non navigator.vibrate');
    const web = createFx({ vibrate: p => vib.push(p), local: fakeLocal() });
    assert.strictEqual(web.buzz('error'), true);
    assert.deepStrictEqual(vib, [BUZZ.error]);
    assert(Array.isArray(BUZZ.error) && BUZZ.error.length >= 3, 'l\'errore vibra più volte');
    const none = createFx({ local: fakeLocal() });
    assert.strictEqual(none.buzz('error'), false, 'senza vibrazione nel telefono');
    assert.strictEqual(web.buzz('nessuna'), false);
  },
  async 'audio che non parte: nessun errore'() {
    const a = fakeAudio({ failCreate: true });
    const fx = createFx({ audioCtx: a.factory, load: fakeLoad(), local: fakeLocal() });
    assert.doesNotThrow(() => fx.unlock());
    assert.strictEqual(fx.play('tick'), false);
    const b = fakeAudio({ failResume: true });
    const fx2 = createFx({ audioCtx: b.factory, local: fakeLocal() });
    assert.doesNotThrow(() => fx2.unlock()); await tick();
    assert.strictEqual(fx2.play('tick'), false, 'audio rimasto sospeso: niente suono');
    const fx3 = createFx({ audioCtx: () => null, local: fakeLocal() });
    assert.doesNotThrow(() => fx3.unlock());
    assert.strictEqual(fx3.play('rev'), false);
    const h = { impact() { throw new Error('rotto'); }, notification() { return Promise.reject(new Error('rotto')); } };
    const fx4 = createFx({ haptics: h, local: fakeLocal() });
    assert.doesNotThrow(() => fx4.buzz('light'));
    assert.doesNotThrow(() => fx4.buzz('error')); await tick();
    const fx5 = createFx({ local: { get() { throw new Error('niente memoria'); }, set() { throw new Error('niente memoria'); } } });
    assert.strictEqual(fx5.sounds(), true);
    assert.doesNotThrow(() => fx5.setSounds(false));
  },
  // 1/11 (Edoardo: "cambia i suoni dell'app che fanno schifo, usa quelli che ti ho allegato").
  async 'i 5 file di Edoardo: si caricano al primo tocco e ogni suono usa il suo file, con velocità e volume'() {
    assert.deepStrictEqual(Object.keys(FILES).sort(), ['click', 'nav', 'radio', 'swipe', 'tap']);
    for (const [name, m] of Object.entries(SOUND_MAP)) assert.ok(FILES[m.f], name + ' usa un file che non c\'è');
    for (const url of Object.values(FILES)) {   // i file veri, accanto alla pagina (Vite li copia da public)
      const f = path.join(__dirname, '..', '..', 'public', url);
      assert.ok(require('fs').existsSync(f) && require('fs').statSync(f).size < 20000, url + ' manca o è troppo grande');
    }
    const a = fakeAudio({ state: 'running' }), load = fakeLoad();
    const fx = createFx({ audioCtx: a.factory, load, local: fakeLocal() });
    assert.strictEqual(load.urls.length, 0, 'nessun file prima del primo tocco');
    fx.unlock(); await tick();
    assert.deepStrictEqual(load.urls.slice().sort(), Object.values(FILES).sort(), 'al primo tocco si caricano i 5 file');
    assert.strictEqual(fx.loaded(), 5);
    fx.unlock(); await tick();
    assert.strictEqual(load.urls.length, 5, 'un secondo tocco non li ricarica');
    assert.strictEqual(fx.play('tick'), true);
    assert.strictEqual(fx.play('gun'), true);
    const [t, g] = a.log.noise;
    assert.ok(/tap\.mp3$/.test(t.buffer.from) && t.playbackRate.value === 1, 'il tic è il tocco morbido a velocità normale');
    assert.ok(/click\.mp3$/.test(g.buffer.from) && g.playbackRate.value === 1.3, 'la pistola è il click più acuto');
  },
  async 'file che non arriva o rotto: quel suono tace, gli altri suonano, nessun errore'() {
    const a = fakeAudio({ state: 'running' });
    const fx = createFx({ audioCtx: a.factory, load: fakeLoad({ miss: ['radio'], bad: ['swipe'] }), local: fakeLocal() });
    assert.doesNotThrow(() => fx.unlock()); await tick();
    assert.strictEqual(fx.loaded(), 3);
    assert.strictEqual(fx.play('radio'), false, 'radio.mp3 non è arrivato');
    assert.strictEqual(fx.play('swoosh'), false, 'swipe.mp3 è rotto');
    assert.strictEqual(fx.play('clack'), true);
    const none = createFx({ audioCtx: fakeAudio({ state: 'running' }).factory, local: fakeLocal() });
    none.unlock(); await tick();
    assert.strictEqual(none.play('tick'), false, 'senza i file nessun suono (e nessun sintetizzatore)');
  },
  async 'app in secondo piano: nessun suono'() {
    const a = fakeAudio();
    let hidden = false;
    const fx = createFx({ audioCtx: a.factory, load: fakeLoad(), local: fakeLocal(), hidden: () => hidden });
    fx.unlock(); await tick();
    hidden = true;
    assert.strictEqual(fx.play('tick'), false);
    hidden = false;
    assert.strictEqual(fx.play('tick'), true);
  },
};

(async () => {
  let pass = 0, fail = 0;
  const filter = process.argv[2] ? new RegExp(process.argv[2], 'i') : null;
  for (const [name, fn] of Object.entries(tests)) {
    if (filter && !filter.test(name)) continue;
    try { await fn(); pass++; console.log('PASS  ' + name); }
    catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + String(e.message).split('\n')[0].slice(0, 300)); }
  }
  console.log(`\n${pass} passati, ${fail} falliti`);
  process.exit(fail ? 1 : 0);
})();
