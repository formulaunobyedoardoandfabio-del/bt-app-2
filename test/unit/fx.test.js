// Prove dei suoni e delle vibrazioni (Tappa 3, G03; src/services/fx.js) con un Web Audio finto, il plugin Haptics
// finto dell'APK e navigator.vibrate finto. Gira in Node.
// Uso: node test/unit/fx.test.js [filtro]
const assert = require('assert');
const path = require('path');
const { createFx, SOUNDS, BUZZ } = require(path.join(__dirname, '..', '..', 'src', 'services', 'fx.js'));

// Web Audio finto: ricorda gli oscillatori e i rumori avviati.
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
      createBufferSource() { const s = node({ buffer: null, start() { log.noise.push(s); }, stop() {} }); return s; },
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

const tests = {
  async 'prima di unlock nessun suono e nessun errore'() {
    const a = fakeAudio();
    const fx = createFx({ audioCtx: a.factory, local: fakeLocal() });
    for (const name of SOUNDS) assert.strictEqual(fx.play(name), false, name + ' prima del primo tocco');
    assert.strictEqual(a.log.ctx, 0, 'l\'audio non deve partire prima di un tocco');
    assert.strictEqual(fx.play('nessuno'), false);
  },
  async 'dopo unlock play("shift") crea gli oscillatori'() {
    const a = fakeAudio();
    const fx = createFx({ audioCtx: a.factory, local: fakeLocal() });
    fx.unlock(); await tick();
    assert.strictEqual(a.log.ctx, 1); assert.strictEqual(a.log.resumed, 1);
    assert.strictEqual(fx.play('shift'), true);
    assert(a.log.osc.length >= 1, 'nessun oscillatore per la cambiata');
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
    assert.deepStrictEqual(h.calls, [['impact', { style: 'LIGHT' }]]);
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
    assert.strictEqual(apk.buzz('error'), true);
    assert.deepStrictEqual(h.calls, [['notification', { type: 'ERROR' }]]);
    apk.buzz('success'); apk.buzz('medium'); apk.buzz('heavy');
    assert.deepStrictEqual(h.calls.slice(1), [['notification', { type: 'SUCCESS' }], ['impact', { style: 'MEDIUM' }], ['impact', { style: 'HEAVY' }]]);
    apk.buzz('select'); await tick(); await tick();
    assert.deepStrictEqual(h.calls.slice(4).map(c => c[0]), ['selectionStart', 'selectionChanged', 'selectionEnd']);
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
    const fx = createFx({ audioCtx: a.factory, local: fakeLocal() });
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
  async 'app in secondo piano: nessun suono'() {
    const a = fakeAudio();
    let hidden = false;
    const fx = createFx({ audioCtx: a.factory, local: fakeLocal(), hidden: () => hidden });
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
