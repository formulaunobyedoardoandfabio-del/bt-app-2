// 22/11 (Edoardo): "l'orario di silenzio si possa modificare cliccandoci sopra ... prima l'inizio e poi la fine" col
// righello; "usa questo per la schermata dei feedback coi veri dati dei feedback" (grafica "B&T: Schermata Feedback") e
// le recensioni che si muovono in 3D; "per i trofei metti quelli veri dell'utente idem per ELO"; nel proprio profilo
// niente hashtag scritti ma l'avatar del pilota e della scuderia del cuore presi dal Fanta.
// Uso: node test/build-test.js && node test/e2e/run137-silenzio-feedback.js [filtro]
const path = require('path');
const fs = require('fs');
const { open, w, tapSel, tapText, goTab, login, assert, run } = require('./helpers');
const { authorId } = require('../../src/services/compat');

const SHOTS = path.join(__dirname, '..', 'logs', 'run137');
fs.mkdirSync(SHOTS, { recursive: true });
const shot = (p, n) => p.screenshot({ path: path.join(SHOTS, n + '.png') });
const press = async (p, key, n) => { for (let i = 0; i < n; i++) { await p.keyboard.press(key); await w(p, 120); } await w(p, 600); };
const rulerVal = p => p.evaluate(() => { const e = document.querySelector('[data-quiet-sheet] [data-ruler-value]'); return e && e.textContent; });

const T0 = Date.parse('2026-10-07T09:00:00Z');
const MARCO = authorId('marco@b.it');
const MARCO_P = { t: 'ferrari', d: 'leclerc', f: 'vivo', h: { base: '#E8002D', c1: '#FFFFFF', c2: '#111111', pattern: 'flames', visor: 'smoke', finish: 'gloss' }, w: ['pitcrew'], wa: { pitcrew: '2026-10-05' } };
const CHAT = {
  'shared/bt-chat-generale': { __arr: [{ id: 'mm1', user: 'Marco', aid: MARCO, txt: 'Forza Ferrari', t: T0, p: MARCO_P }] },
  ['fanta/profilo-' + MARCO]: { name: 'Marco', aid: MARCO, p: MARCO_P, elo: { rating: 1540, games: 4 }, t: T0 + 60000, gone: false },
};

run({
  async 'Ore di silenzio: si toccano, prima l\'inizio poi la fine col righello, si salvano nell\'account'(b) {
    const { ctx, p, errs } = await open(b);
    await login(p); await w(p, 800);
    await tapSel(p, '[aria-label="Notifiche"]'); await w(p, 700);
    await tapSel(p, '[data-notif-open-settings]'); await w(p, 400);
    const before = await p.evaluate(() => { const e = document.querySelector('[data-quiet-value]'); return e && e.textContent; });
    await tapSel(p, '[data-quiet-open]'); await w(p, 500);
    const step1 = await p.evaluate(() => { const e = document.querySelector('[data-quiet-sheet]'); return e && e.getAttribute('data-quiet-sheet'); });
    const v0 = await rulerVal(p);
    await shot(p, 'silenzio-inizio-390');
    await p.focus('[data-quiet-sheet] [data-ruler]');
    await press(p, 'ArrowRight', 4);
    const v1 = await rulerVal(p);
    await tapSel(p, '[data-quiet-next]'); await w(p, 400);
    const step2 = await p.evaluate(() => document.querySelector('[data-quiet-sheet]').getAttribute('data-quiet-sheet'));
    await p.focus('[data-quiet-sheet] [data-ruler]');
    await press(p, 'ArrowLeft', 4);
    const v2 = await rulerVal(p), sum = await p.evaluate(() => document.querySelector('[data-quiet-sum]').textContent);
    await shot(p, 'silenzio-fine-390');
    await tapSel(p, '[data-quiet-save]'); await w(p, 1800);
    const after = await p.evaluate(() => { const e = document.querySelector('[data-quiet-value]'); return e && e.textContent; });
    const saved = await p.evaluate(() => { const u = window.firebase.__fake.doc('users/a@b.it'); return u && u.app2 && u.app2.notifPrefs ? u.app2.notifPrefs.quiet : null; });
    await ctx.close();
    assert(before === '22:00 - 08:00', 'di serie 22:00 - 08:00: ' + before);
    assert(step1 === 'inizio' && v0 === '22:00' && v1 === '23:00', 'prima l\'inizio: ' + JSON.stringify({ step1, v0, v1 }));
    assert(step2 === 'fine' && v2 === '07:00' && /Dalle 23:00 alle 07:00/.test(sum), 'poi la fine: ' + JSON.stringify({ step2, v2, sum }));
    assert(after === '23:00 - 07:00', 'nella riga: ' + after);
    assert(saved && saved.from === 23 * 60 && saved.to === 7 * 60, 'salvato nell\'account: ' + JSON.stringify(saved));
    assert(!errs.length, errs.join(' | '));
  },

  async 'Profilo pubblico mio: niente hashtag scritti, avatar della scuderia e del pilota del cuore'(b) {
    const USER = { 'users/a@b.it': { name: 'Tester', nick: 'Tester', email: 'a@b.it', about: { birth: 1999, follow: 2, fan: 'vivo', years: 5 }, app2: { favTeam: 'ferrari', favDriver: 'leclerc' } } };
    const { ctx, p, errs } = await open(b, { seed: { addDocs: USER } });
    await login(p); await tapSel(p, '[aria-label="Profilo"]'); await w(p, 600);
    await tapText(p, 'Profilo pubblico'); await w(p, 500);
    const r = await p.evaluate(() => {
      const e = document.querySelector('[data-profile-public]');
      const av = k => { const x = e.querySelector(`[data-pub-avatar="${k}"]`); return x && { on: x.getAttribute('data-pub-avatar-on'), kids: x.children.length }; };
      return { hash: /#\w/.test(e.innerText), team: av('team'), driver: av('driver') };
    });
    await shot(p, 'profilo-pubblico-avatar-390');
    await ctx.close();
    assert(!r.hash, 'niente #scuderia #pilota scritti');
    assert(r.team && r.team.on === 'ferrari' && r.team.kids === 1 && r.driver && r.driver.on === 'leclerc' && r.driver.kids === 1, 'avatar dal Fanta: ' + JSON.stringify(r));
    assert(!errs.length, errs.join(' | '));
  },

  async 'Chat: nel profilo di un tifoso l\'ELO vero del Fanta e il giorno dei trofei'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: CHAT } });
    await login(p); await w(p, 800);
    await goTab(p, 'RACE'); await tapSel(p, '[data-race-chat]'); await w(p, 500); await tapText(p, 'Chat Generale'); await w(p, 700);
    await tapSel(p, '[data-chat-author="mm1"]'); await w(p, 900);
    const r = await p.evaluate(() => {
      const e = document.querySelector('[data-chat-profile]');
      const elo = e && e.querySelector('[data-chat-profile-elo]'), day = e && e.querySelector('[data-trophy-day]');
      return e && { elo: elo && elo.getAttribute('data-chat-profile-elo'), day: day && day.getAttribute('data-trophy-day'), text: e.innerText.replace(/\s+/g, ' ') };
    });
    await shot(p, 'chat-profilo-elo-390');
    await ctx.close();
    assert(r && r.elo === '1540' && /ELO FantaF1/.test(r.text) && /4 GP/.test(r.text), 'ELO vero: ' + JSON.stringify(r));
    assert(r.day === '2026-10-05', 'giorno del trofeo: ' + JSON.stringify(r));
    assert(!errs.length, errs.join(' | '));
  },

  async 'Feedback: un problema col dove e le info del telefono; "Le tue segnalazioni" coi feedback veri e lo stato'(b) {
    const OLD = { 'shared/bt-feedback-old1': { id: 'old1', category: 'idea', msg: 'Una idea di ottobre', user: 'a@b.it', date: '2026-10-01T10:00:00.000Z', appVersion: '2.0.0', status: 'letto' },
      'shared/bt-feedback-alt1': { id: 'alt1', category: 'idea', msg: 'Di un altro', user: 'z@b.it', date: '2026-10-02T10:00:00.000Z', appVersion: '2.0.0' } };
    const { ctx, p, errs } = await open(b, { seed: { addDocs: OLD } });
    await login(p); await tapSel(p, '[aria-label="Profilo"]'); await w(p, 600);
    await tapText(p, 'Invia feedback'); await w(p, 800);
    const off = await p.evaluate(() => document.querySelector('[data-fb-send]').disabled);
    await tapSel(p, '[data-feedback-cat="problema"]'); await w(p, 200);
    await tapSel(p, '[data-fb-where="chat"]'); await w(p, 150);
    await p.fill('[data-feedback-msg]', 'La chat non scorre fino in fondo');
    await tapSel(p, '[role="switch"][aria-label="Aggiungi info del telefono"]'); await w(p, 150);
    await shot(p, 'feedback-problema-390');
    await tapSel(p, '[data-fb-send]'); await w(p, 900);
    const sent = await p.evaluate(() => { const e = document.querySelector('[data-feedback="sent"]'); return e && e.innerText.replace(/\s+/g, ' '); });
    await shot(p, 'feedback-inviato-390');
    const d = await p.evaluate(() => Object.values(window.firebase.__fake.docs()).find(x => x && /non scorre/.test(x.msg || '')));
    await tapSel(p, '[data-fb-history]'); await w(p, 900);
    const list = await p.evaluate(() => [...document.querySelectorAll('[data-fb-mine]')].map(e => ({ id: e.getAttribute('data-fb-mine'), st: e.getAttribute('data-fb-status'), text: e.innerText.replace(/\s+/g, ' ') })));
    await shot(p, 'feedback-storico-390');
    await ctx.close();
    assert(off, 'senza testo Invia è spento');
    assert(d && d.category === 'problema' && d.where === 'chat' && d.device && d.device.app && !('stars' in d) && d.user === 'a@b.it', 'documento: ' + JSON.stringify(d));
    assert(sent && /FEEDBACK RICEVUTO/.test(sent) && /INVIATO/.test(sent) && /LETTO DAL TEAM/.test(sent), 'pagina inviato: ' + sent);
    assert(list.length === 2 && list[0].st === 'ricevuto' && /non scorre/.test(list[0].text) && list[1].id === 'old1' && list[1].st === 'letto' && /LETTO/.test(list[1].text), 'storico vero, il più nuovo in alto, solo i miei: ' + JSON.stringify(list));
    assert(!errs.length, errs.join(' | '));
  },
});
