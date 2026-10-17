// Tappa 3, Task 5 (G07, G08): password sbagliata = 5 semafori rossi che lampeggiano gialli ("PARTENZA ABORTITA"), il
// tasto ACCEDI trema e il telefono vibra (il messaggio di oggi resta sotto); password diverse in registrazione = il campo
// col bordo a cordolo bianco e rosso e "Track Limits Exceeded: le password non coincidono".
// Uso: node test/build-test.js && node test/e2e/run54-accesso.js [filtro]
const { open, w, text, tapText, login, assert, run } = require('./helpers');

// navigator.vibrate finto: ricorda le vibrazioni chieste dall'app.
const VIB = () => { window.__vib = []; try { Object.defineProperty(navigator, 'vibrate', { configurable: true, value: p => { window.__vib.push(p); return true; } }); } catch (e) {} };

run({
  async 'password sbagliata: 5 semafori (data-abort-lights) con "PARTENZA ABORTITA", vibrazione "error", il messaggio di oggi resta'(b) {
    const { ctx, p, errs } = await open(b, { init: VIB });
    const before = await p.evaluate(() => document.querySelectorAll('[data-abort-lights]').length);
    await login(p, { pw: 'sbagliata' });
    const st = await p.evaluate(() => {
      const box = document.querySelector('[data-abort-lights]');
      const btn = [...document.querySelectorAll('button')].filter(b => b.textContent.trim() === 'ACCEDI').pop();
      return { lights: box ? box.querySelectorAll('[data-abort-light]').length : 0, text: box ? box.innerText : '', shake: btn ? btn.getAttribute('data-shake') : null, vib: window.__vib };
    });
    const t = await text(p);
    await p.fill('#authPw', 'x'); await w(p, 200);
    const afterType = await p.evaluate(() => document.querySelectorAll('[data-abort-lights]').length);
    await ctx.close();
    assert(before === 0, 'i semafori ci sono già prima di sbagliare');
    assert(st.lights === 5, 'semafori: ' + st.lights);
    assert(/PARTENZA ABORTITA/.test(st.text), 'manca "PARTENZA ABORTITA": ' + st.text);
    assert(st.shake === '1', 'il tasto ACCEDI non trema');
    assert(st.vib.some(v => Array.isArray(v) && v.length >= 3), 'nessuna vibrazione di errore: ' + JSON.stringify(st.vib));
    assert(/Password errata/.test(t), 'il messaggio di oggi non c\'è più');
    assert(afterType === 0, 'riscrivendo la password i semafori restano');
    assert(!errs.length, errs.join(' | '));
  },

  async 'registrazione con password diverse: bordo a cordolo (data-kerb) e "Track Limits Exceeded: le password non coincidono"'(b) {
    const { ctx, p, errs } = await open(b, { init: VIB });
    await tapText(p, 'REGISTRATI', { exact: true }); await w(p, 300);
    await p.fill('#regName', 'Gino'); await p.fill('#authEmail', 'g@b.it');
    await p.fill('#authPw', 'abcdef'); await p.fill('#regPw2', 'abc'); await w(p, 200);
    const typing = await p.evaluate(() => ({ kerb: document.querySelectorAll('[data-kerb]').length, t: document.body.innerText }));
    await p.fill('#regPw2', 'abcdeg'); await w(p, 200);
    const wrong = await p.evaluate(() => { const k = document.querySelector('[data-kerb]'); return { kerb: !!k, bg: k ? getComputedStyle(k).backgroundImage : '', hasField: !!(k && k.querySelector('#regPw2')), focus: document.activeElement && document.activeElement.id, t: document.body.innerText }; });
    await p.fill('#regPw2', 'abcdef'); await w(p, 200);
    const fixed = await p.evaluate(() => ({ kerb: document.querySelectorAll('[data-kerb]').length, t: document.body.innerText }));
    await ctx.close();
    const MSG = 'Track Limits Exceeded: le password non coincidono';
    assert(typing.kerb === 0 && !typing.t.includes(MSG), 'mentre si scrive la conferma è già fuori pista');
    assert(wrong.kerb && wrong.hasField, 'manca il bordo a cordolo sul campo della conferma');
    assert(/repeating-linear-gradient/.test(wrong.bg) && /255, 255, 255/.test(wrong.bg) && /255, 24, 1/.test(wrong.bg), 'il cordolo non è bianco e rosso: ' + wrong.bg);
    assert(wrong.t.includes(MSG), 'manca "' + MSG + '"');
    assert(wrong.focus === 'regPw2', 'col cordolo il campo perde il punto in cui si scrive: ' + wrong.focus);
    assert(fixed.kerb === 0 && !fixed.t.includes(MSG), 'con le password uguali resta il cordolo');
    assert(!errs.length, errs.join(' | '));
  },
});
