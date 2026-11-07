// Tappa 3, Task 1 (G01-G02): sfondo nero puro, tasti rosso LED di serie e il colore dei tasti scelto da chi usa l'app
// (Profilo → "Colori dell'app": colore della scuderia del cuore, 12 colori o la ruota dei colori). I contrasti si
// calcolano dai colori veri della pagina (getComputedStyle), con i conti di src/logic/colors.js.
// Uso: node test/build-test.js && node test/e2e/run50-colori.js [filtro]
const path = require('path');
const { open, w, norm, inner, tapText, tapSel, login, assert, run } = require('./helpers');
const K = require(path.join(__dirname, '..', '..', 'src', 'logic', 'colors.js'));
const F1 = require(path.join(__dirname, '..', '..', 'src', 'data', 'f1-2026.js'));

const hexOf = rgb => '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
const css = hex => { const n = parseInt(hex.slice(1), 16); return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`; };
const FERRARI = F1.TEAMS.find(t => t.id === 'ferrari').color;

// Colori veri di un elemento: testo (fg), fondo su cui si vede (bg: i fondi trasparenti composti fino al primo pieno,
// sopra il nero) e fondo suo (own). pick = { sel, text }: l'ultimo elemento sel con quel testo; { sel }: il primo.
const look = (p, pick) => p.evaluate(({ sel, text }) => {
  const n = s => s.replace(/\s+/g, ' ').trim();
  const els = [...document.querySelectorAll(sel)].filter(e => text == null || n(e.textContent) === text);
  const el = text == null ? els[0] : els[els.length - 1];
  if (!el) return null;
  const nums = c => (c.match(/[\d.]+/g) || [0, 0, 0, 0]).map(Number);
  const layers = [];
  for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
    const [r, g, b, a = 1] = nums(getComputedStyle(e).backgroundColor);
    if (a > 0) { layers.push([r, g, b, a]); if (a >= 1) break; }
  }
  let c = [0, 0, 0];
  for (let i = layers.length - 1; i >= 0; i--) { const [r, g, b, a] = layers[i]; c = [r * a + c[0] * (1 - a), g * a + c[1] * (1 - a), b * a + c[2] * (1 - a)]; }
  return { fg: nums(getComputedStyle(el).color).slice(0, 3), bg: c.map(Math.round), own: getComputedStyle(el).backgroundColor };
}, pick);
// Il rosso di prima (#E8121D) in qualsiasi colore, fondo, bordo, ombra o disegno della pagina.
const oldReds = p => p.evaluate(() => [...document.querySelectorAll('body *')].filter(e => {
  const s = getComputedStyle(e);
  return /rgba?\(232, 18, 29\b/.test([s.color, s.backgroundColor, s.backgroundImage, s.borderTopColor, s.borderBottomColor, s.borderLeftColor, s.borderRightColor, s.boxShadow, s.fill, s.stroke, s.outlineColor].join('|'));
}).map(e => e.tagName + ' ' + (e.textContent || '').trim().slice(0, 30)));
// Il tasto della scheda attiva nella barra in basso (pieno del colore dei tasti). Dal 25/10 è una pillola sola che
// scivola sotto la scheda attiva ([data-nav-pill]); prima era dentro il tasto della scheda. 8/11: è la palla della
// barra "Floating Notch" ([data-nav-ball]), col colore dei tasti.
const navPill = p => p.evaluate(() => { const e = document.querySelector('[data-nav-ball]'); return e ? getComputedStyle(e).backgroundColor : null; });
const openColors = async p => { await tapSel(p, '[aria-label="Profilo"]'); await w(p); await tapText(p, "Colori dell'app"); await w(p, 400); };
// La ruota dei colori del telefono cambia il valore del campo da sé (come il selettore vero), poi l'evento "input".
const setWheel = (p, hex) => p.evaluate(h => {
  const el = document.querySelector('[data-theme-wheel]');
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, h);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}, hex);

run({
  async 'di serie: sfondo #000000 e tasti rosso LED #FF1801'(b) {
    const { ctx, p, errs } = await open(b);
    const shell = await p.evaluate(() => getComputedStyle(document.getElementById('phone-shell')).backgroundColor);
    // 8/11 (design "Accesso e Registrazione"): il tasto ACCEDI è bianco; il colore dei tasti sta sul segno B&T e sui link.
    const acc = await look(p, { sel: '[data-login-badge]' });
    const go = await look(p, { sel: '[data-login-submit]' });
    const link = await look(p, { sel: 'button', text: 'Password dimenticata?' });
    const old1 = await oldReds(p);
    await login(p);
    const pill = await navPill(p), nav = await look(p, { sel: '[data-nav-tab]' }), old2 = await oldReds(p);
    await ctx.close();
    assert(shell === 'rgb(0, 0, 0)', 'fondo dell\'app: ' + shell);
    assert(acc && acc.own === css(K.LED_RED), 'segno B&T dell\'accesso: ' + JSON.stringify(acc));
    assert(go && hexOf(go.bg) === '#F4F4F5' && hexOf(go.fg) === '#0B0B0C', 'tasto ACCEDI bianco del design: ' + JSON.stringify(go));
    assert(link && hexOf(link.fg) === K.LED_RED && hexOf(link.bg) === '#0B0B0C', '"Password dimenticata?": ' + JSON.stringify(link));
    assert(pill === css(K.LED_RED), 'scheda attiva nella barra in basso: ' + pill);
    assert(nav && hexOf(nav.bg) === '#000000', 'fondo della barra in basso: ' + JSON.stringify(nav));
    assert(!old1.length && !old2.length, 'resta il rosso di prima: ' + [...old1, ...old2].slice(0, 6).join(' | '));
    assert(!errs.length, errs.join(' | '));
  },

  async 'scuderia del cuore Ferrari: i tasti prendono il suo colore'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await openColors(p);
    const before = norm(await inner(p, '[data-theme-sheet]'));
    const teamOn1 = await p.evaluate(() => { const e = document.querySelector('[data-theme-team]'); return e && e.getAttribute('aria-pressed'); });
    await tapSel(p, '[data-theme-sheet] [aria-label="Chiudi"]'); await w(p);
    await tapText(p, 'Scuderia del cuore'); await w(p);
    await tapText(p, 'Ferrari'); await w(p, 500);
    const avatar = await p.evaluate(() => { const e = document.querySelector('[data-profile-avatar]'); return e ? getComputedStyle(e).backgroundColor : null; });
    await tapText(p, "Colori dell'app"); await w(p, 400);
    const after = norm(await inner(p, '[data-theme-sheet]'));
    await tapSel(p, '[data-theme-sheet] [aria-label="Chiudi"]'); await w(p);
    await tapSel(p, '[aria-label="Indietro"]'); await w(p, 400);
    const pill = await navPill(p);
    await ctx.close();
    const t = K.accentTones(FERRARI);
    assert(teamOn1 === 'true' && /Colore della mia scuderia/.test(before) && /Rosso LED/.test(before), 'di serie, senza scuderia: ' + before.slice(0, 200));
    assert(/Colore della mia scuderia/.test(after) && /Ferrari/.test(after), 'con la Ferrari: ' + after.slice(0, 200));
    assert(avatar === css(t.accent), `tondo del profilo: ${avatar} invece di ${css(t.accent)}`);
    assert(pill === css(t.accent), `scheda attiva nella barra in basso: ${pill} invece di ${css(t.accent)}`);
    assert(!errs.length, errs.join(' | '));
  },

  async 'colore scelto dalla ruota (#FFFF00): tasto ACCEDI e testi colorati leggibili'(b) {
    const { ctx, p, errs } = await open(b);
    await tapText(p, 'ENTRA COME OSPITE'); await w(p, 600);
    await openColors(p);
    await setWheel(p, '#ffff00'); await w(p, 300);
    const sheet = norm(await inner(p, '[data-theme-sheet]'));
    const prev = await look(p, { sel: '[data-theme-preview] [data-theme-sample="tasto"]' });
    await tapSel(p, '[data-theme-sheet] [aria-label="Chiudi"]'); await w(p);
    await tapText(p, 'ACCEDI O REGISTRATI'); await w(p, 500);
    const acc = await look(p, { sel: '[data-login-badge]' });   // 8/11: il colore scelto sul segno B&T (ACCEDI è bianco)
    const go = await look(p, { sel: '[data-login-submit]' });
    const texts = [];
    for (const text of ['Password dimenticata?', 'Registrati']) texts.push([text, await look(p, { sel: 'button', text })]);
    const stored = await p.evaluate(() => localStorage.getItem('bt_bt-theme'));
    await ctx.close();
    const t = K.accentTones('#FFFF00');
    assert(/Scegli tu/.test(sheet) && /#FFFF00/.test(sheet), 'nella scheda dei colori manca la scelta fatta: ' + sheet.slice(0, 300));
    assert(prev && hexOf(prev.bg) === t.accent, 'anteprima del tasto: ' + JSON.stringify(prev));
    assert(acc && hexOf(acc.bg) === t.accent, `segno B&T dell'accesso: ${JSON.stringify(acc)} invece di ${t.accent}`);
    const cAcc = K.contrast(hexOf(go.fg), hexOf(go.bg));
    assert(cAcc >= 3, `testo del tasto ACCEDI poco leggibile: ${cAcc.toFixed(2)}:1`);
    for (const [text, x] of texts) {
      assert(x && hexOf(x.fg) === '#FFFF00', `"${text}": ${JSON.stringify(x)}`);
      const c = K.contrast(hexOf(x.fg), hexOf(x.bg));
      assert(c >= 4.5, `"${text}" poco leggibile: ${c.toFixed(2)}:1`);
    }
    assert(stored && JSON.parse(stored).mode === 'custom' && JSON.parse(stored).color === '#FFFF00', 'sul telefono: ' + stored);
    assert(!errs.length, errs.join(' | '));
  },

  async "la scelta resta dopo il riavvio e si salva nell'account"(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await openColors(p);
    await tapSel(p, '[data-theme-color="#27F4D2"]'); await w(p, 1500);   // i dati dell'account si salvano dopo 800 ms
    const pressed = await p.evaluate(() => document.querySelector('[data-theme-color="#27F4D2"]').getAttribute('aria-pressed'));
    const user = await p.evaluate(() => window.firebase.__fake.doc('users/a@b.it'));
    await p.reload(); await w(p, 600);
    await p.waitForFunction(() => !document.querySelector('[data-splash]'), null, { timeout: 8000 }).catch(() => {});
    await w(p, 800);
    const pill = await navPill(p);
    const stored = await p.evaluate(() => JSON.parse(localStorage.getItem('bt_bt-theme')));
    await ctx.close();
    const t = K.accentTones('#27F4D2');
    assert(pressed === 'true', 'il colore scelto non risulta scelto');
    const th = user && user.app2 && user.app2.theme;
    assert(JSON.stringify(th) === JSON.stringify({ mode: 'custom', color: '#27F4D2' }), 'users/a@b.it.app2.theme: ' + JSON.stringify(th));
    assert(pill === css(t.accent), `dopo il riavvio la scheda attiva è ${pill} invece di ${css(t.accent)}`);
    assert(stored && stored.mode === 'custom' && stored.color === '#27F4D2', 'sul telefono: ' + JSON.stringify(stored));
    assert(!errs.length, errs.join(' | '));
  },

  async "colore scelto da ospite: entrando, l'account senza colore prende quello del telefono"(b) {
    const { ctx, p, errs } = await open(b);
    await tapText(p, 'ENTRA COME OSPITE'); await w(p, 600);
    await openColors(p);
    await tapSel(p, '[data-theme-color="#FF8000"]'); await w(p, 300);
    await tapSel(p, '[data-theme-sheet] [aria-label="Chiudi"]'); await w(p);
    await tapText(p, 'ACCEDI O REGISTRATI'); await w(p, 500);
    await login(p); await w(p, 1500);   // i dati dell'account si salvano dopo 800 ms
    const user = await p.evaluate(() => window.firebase.__fake.doc('users/a@b.it'));
    const avatar = await p.evaluate(() => { const e = document.querySelector('[data-profile-avatar]'); return e ? getComputedStyle(e).backgroundColor : null; });
    await ctx.close();
    const th = user && user.app2 && user.app2.theme;
    assert(JSON.stringify(th) === JSON.stringify({ mode: 'custom', color: '#FF8000' }), 'users/a@b.it.app2.theme: ' + JSON.stringify(th));
    assert(avatar === css(K.accentTones('#FF8000').accent), 'tondo del profilo dopo l\'accesso: ' + avatar);
    assert(!errs.length, errs.join(' | '));
  },

  async "colore dell'account su un telefono nuovo: arriva con l'accesso"(b) {
    const me = { name: 'Tester', nick: 'Tester', email: 'a@b.it', about: { birth: null, follow: 2, fan: 'vivo' }, app2: { theme: { mode: 'custom', color: '#6692FF' } } };
    const { ctx, p, errs } = await open(b, { seed: { addDocs: { 'users/a@b.it': me } } });
    const before = await look(p, { sel: '[data-login-badge]' });   // 8/11: il colore dei tasti sul segno B&T
    await login(p); await w(p, 400);
    const pill = await navPill(p);
    const stored = await p.evaluate(() => JSON.parse(localStorage.getItem('bt_bt-theme')));
    await ctx.close();
    const t = K.accentTones('#6692FF');
    assert(before && before.own === css(K.LED_RED), 'prima dell\'accesso, telefono nuovo: ' + JSON.stringify(before));
    assert(pill === css(t.accent), `dopo l'accesso la scheda attiva è ${pill} invece di ${css(t.accent)}`);
    assert(stored && stored.mode === 'custom' && stored.color === '#6692FF', 'copia sul telefono: ' + JSON.stringify(stored));
    assert(!errs.length, errs.join(' | '));
  },
});
