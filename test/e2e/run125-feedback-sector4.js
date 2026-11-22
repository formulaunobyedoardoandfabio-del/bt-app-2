// 16/11 (Edoardo): "metti questo codice (RevealText) al posto del logo B&T con la scritta Sector 4" e "metti questi
// (schede che scorrono in 3D) con dati e cose vere nella scheda feedback". Le schede mostrano solo i feedback veri di chi
// ha detto sì (nickname, mai l'email); l'admin ne può nascondere uno. Logica: test/unit/feedback.test.js.
// Uso: node test/build-test.js && node test/e2e/run125-feedback-sector4.js [filtro]
const { open, w, tapSel, tapText, login, assert, run } = require('./helpers');

const fb = (id, o) => ({ ['shared/bt-feedback-' + id]: { id, stars: 5, category: 'generale', msg: 'Feedback vero numero ' + id + ' sul Fanta', user: 'tifoso' + id + '@mail.it', date: '2026-11-1' + id + 'T10:00:00.000Z', appVersion: '2.0.0', public: true, name: 'Tifoso' + id, ...o } });
const SEED = { addDocs: { ...fb(1), ...fb(2, { stars: 4, category: 'idea' }), ...fb(3), ...fb(4, { public: false, msg: 'Questo non deve vedersi in giro' }), ...fb(5, { hidden: true, msg: 'Nascosto dall admin prima' }) } };
const openFeedback = async p => { await tapSel(p, '[aria-label="Profilo"]'); await w(p, 500); await tapText(p, 'Invia feedback'); await w(p, 1200); };

run({
  // 16/11, dopo: la scritta rotola lettera per lettera (run126); dal 21/11 di serie è di nuovo SECTOR 4.
  async 'in alto la scritta SECTOR 4 al posto del logo, che arriva lettera per lettera'(b) {
    const { ctx, p } = await open(b);
    await login(p); await w(p, 1800);
    const r = await p.evaluate(() => {
      const l = document.querySelector('[data-logo]'), t = l && l.querySelector('[data-rolling-text]');
      return { label: l && l.getAttribute('aria-label'), text: t && t.getAttribute('aria-label'), letters: t ? t.querySelectorAll('[data-roll-in]').length : 0, img: !!(l && l.querySelector('img')), anim: t && getComputedStyle(t.querySelector('[data-roll-in]')).animationName };
    });
    await ctx.close();
    assert(r.label === 'Sector 4' && r.text === 'SECTOR 4' && r.letters === 8 && !r.img && r.anim === 'rlIn', 'scritta al posto del logo: ' + JSON.stringify(r));
  },

  async 'scheda Feedback: scorrono i feedback veri di chi ha detto sì, mai l\'email; si può dire sì inviando'(b) {
    const { ctx, p } = await open(b, { seed: SEED });
    await login(p); await w(p, 800);
    await openFeedback(p);
    await tapSel(p, '[data-fb-open-reviews]'); await w(p, 500);
    const wall = await p.evaluate(() => { const e = document.querySelector('[data-fb-wall]'); return e && { n: Number(e.getAttribute('data-fb-wall')), text: e.innerText, cards: e.querySelectorAll('[data-fb-card]').length }; });
    await tapSel(p, '[data-fb-write-review]'); await w(p, 300);   // complimento con "Mostra nelle recensioni" già acceso
    const shareOn = await p.evaluate(() => { const e = document.querySelector('[data-feedback-share] [role="switch"]'); return e && e.getAttribute('aria-checked'); });
    await tapSel(p, '[data-feedback-face="5"]'); await w(p, 200);
    await p.fill('[data-feedback-msg]', 'Mi piace tanto la scelta dei piloti');
    await tapSel(p, '[data-fb-send]'); await w(p, 1200);
    const mine = await p.evaluate(() => Object.entries(window.firebase.__fake.docs()).filter(([k, d]) => k.startsWith('shared/bt-feedback-') && /scelta dei piloti/.test(d.msg)).map(([, d]) => d)[0]);
    await ctx.close();
    assert(shareOn === 'true', 'da "Scrivi la tua recensione" il permesso è già acceso: ' + shareOn);
    assert(wall && wall.n === 3 && wall.cards === 24, 'tre feedback da mostrare (in ognuna delle 4 colonne, due volte per il giro): ' + JSON.stringify(wall));
    assert(/Tifoso1/.test(wall.text) && /Feedback vero numero 2/.test(wall.text), 'nickname e testo veri: ' + wall.text.slice(0, 160));
    assert(!/@/.test(wall.text) && !/non deve vedersi/.test(wall.text) && !/Nascosto/.test(wall.text), 'niente email, niente feedback senza permesso o nascosti');
    assert(mine && mine.public === true && mine.name === 'Tester', 'il mio feedback col permesso e il mio nickname: ' + JSON.stringify(mine));
  },

  async 'admin: nasconde un feedback dalle schede (resta su Firebase)'(b) {
    const { ctx, p } = await open(b, { seed: SEED });
    await login(p); await w(p, 600);
    await p.evaluate(() => window.firebase.__fake.setDoc('admins/a@b.it', { ruolo: 'admin' }));
    await openFeedback(p);
    await tapSel(p, '[data-fb-open-reviews]'); await w(p, 500);
    await p.evaluate(() => { document.querySelector('[data-fb-admin]').open = true; });
    await tapSel(p, '[data-fb-hide="1"]'); await w(p, 600);
    const r = await p.evaluate(() => ({ doc: window.firebase.__fake.doc('shared/bt-feedback-1'), wall: !!document.querySelector('[data-fb-wall]') }));
    await ctx.close();
    assert(r.doc && r.doc.hidden === true && /numero 1/.test(r.doc.msg), 'nascosto ma non cancellato: ' + JSON.stringify(r.doc));
    assert(!r.wall, 'con due soli feedback da mostrare le schede non ci sono più');
  },
});
