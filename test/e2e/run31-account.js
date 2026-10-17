// Task 7: account con Firebase Authentication (accesso, registrazione con "Su di te", password dimenticata,
// eliminazione, sessione che resta, admin solo per l'account admin).
// Uso: node test/build-test.js && node test/e2e/run31-account.js [filtro]
const { open, w, text, inner, tapText, tapSel, goTab, login, assert, run } = require('./helpers');

const doc = (p, path) => p.evaluate(x => window.firebase.__fake.doc(x), path);
const authState = p => p.evaluate(() => window.firebase.__fake.authState());
// adult: la casella "Ho almeno 14 anni" (Task 22), spuntata di serie.
async function register(p, { name = 'Fabio', email = 'fabio@b.it', pw = 'abcdef', birth = null, steps = 0, fan = 'vivo', adult = true } = {}) {
  await tapText(p, 'REGISTRATI', { exact: true }); await w(p, 300);
  await p.fill('#regName', name); await p.fill('#authEmail', email); await p.fill('#authPw', pw); await p.fill('#regPw2', pw);
  // Tappa 3 (G16-G17): l'anno col manettino (il primo scatto porta al 2000) e gli anni col contachilometri (parte da 1).
  if (birth) { await p.focus('#regBirth'); await p.keyboard.press('ArrowUp'); for (let i = 0; i < Math.abs(birth - 2000); i++) await p.keyboard.press(birth > 2000 ? 'ArrowUp' : 'ArrowDown'); }
  if (steps) { await p.focus('#regFollow'); for (let i = 0; i < steps; i++) await p.keyboard.press('ArrowRight'); }
  await tapSel(p, `[data-fan-option="${fan}"]`); await w(p, 150);
  if (adult) await p.check('#regAdult');
  await tapText(p, 'CREA ACCOUNT', { exact: true }); await w(p, 1500);
}
const OLD = { 'users/v@b.it': { name: 'Edo', nick: 'Edo', email: 'v@b.it', pw: 'segreta', isPremium: false, premium: false, notif: { news: true, live: true, fanta: true }, ts: 1726000000000, plan: 'free' } };

run({
  async 'iscrizione: senza "Ho almeno 14 anni" o nato nel 2015 l\'account non si crea'(b) {
    const { ctx, p, errs } = await open(b);
    await register(p, { adult: false });
    const t1 = await text(p), u1 = await doc(p, 'users/fabio@b.it');
    await p.focus('#regBirth'); await p.keyboard.press('End'); await p.keyboard.press('ArrowDown'); await p.check('#regAdult');   // Tappa 3 (G17): manettino, 2016 poi 2015
    await tapText(p, 'CREA ACCOUNT', { exact: true }); await w(p, 1500);
    const t2 = await text(p), u2 = await doc(p, 'users/fabio@b.it'), auth = await authState(p); await ctx.close();
    assert(/Conferma di avere almeno 14 anni\./.test(t1) && !u1, 'senza la casella si è creato l\'account (o manca l\'avviso)');
    assert(/Per iscriverti a Sector 4 devi avere almeno 14 anni\./.test(t2) && !u2 && !auth.users['fabio@b.it'], 'con meno di 14 anni si è creato l\'account (o manca l\'avviso)');
    assert(!errs.length, errs.join(' | '));
  },

  async 'registrazione: "Su di te" (che tifoso sei, da quanti anni segui la F1, anno di nascita) nel profilo'(b) {
    const { ctx, p, errs } = await open(b);
    await register(p, { birth: 2001, steps: 4, fan: 'vroom' });   // 5 anni da tifoso
    await tapSel(p, '[aria-label="Profilo"]'); await w(p, 400);
    const rows = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-about-row]')].map(e => [e.getAttribute('data-about-row'), e.innerText.replace(/\s+/g, ' ').trim()])));
    const user = await doc(p, 'users/fabio@b.it'), auth = await authState(p); await ctx.close();
    assert(/2001/.test(rows.birth || '') && /5 anni/.test(rows.follow || '') && /Se fa Vroom è bello/.test(rows.fan || ''), 'Su di te nel profilo: ' + JSON.stringify(rows));
    assert(user && JSON.stringify(user.about) === JSON.stringify({ birth: 2001, follow: 2, fan: 'vroom', years: 5 }), 'users/fabio@b.it.about: ' + JSON.stringify(user && user.about));   // follow = la fascia "4 – 6 anni" per l'app di oggi
    assert(user.pw === undefined && auth.users['fabio@b.it'], 'la password deve stare in Authentication, non nel profilo');
    assert(!errs.length, errs.join(' | '));
  },

  async 'account vecchio senza About you: il profilo chiede di completarlo'(b) {
    const { ctx, p, errs } = await open(b, { seed: { addDocs: OLD } });
    await login(p, { email: 'v@b.it', pw: 'segreta' });
    await tapSel(p, '[aria-label="Profilo"]'); await w(p, 400);
    const t = await text(p), user = await doc(p, 'users/v@b.it'); await ctx.close();
    assert(t.includes('Completa il tuo profilo: che tifoso sei e da quanti anni segui la F1'), 'manca l\'invito a completare il profilo');
    assert(/Edo/.test(t) && /v@b\.it/.test(t), 'nome ed email dell\'account vecchio');
    assert(user.pw === undefined && user.migrated, 'l\'account vecchio non è passato ad Authentication: ' + JSON.stringify(user));
    assert(!errs.length, errs.join(' | '));
  },

  async 'profilo con il nome e l\'email dell\'account (niente "edoardo@bt-app.demo")'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await tapSel(p, '[aria-label="Profilo"]'); await w(p, 400);
    const t = await text(p);
    await tapSel(p, '[aria-label="Modifica profilo"]'); await w(p, 200);
    const emailInput = await p.evaluate(() => !!document.querySelector('#pfEmail'));
    await p.fill('#pfName', 'Tester Due');
    await tapSel(p, '[aria-label="Salva profilo"]'); await w(p, 500);
    const t2 = await text(p), user = await doc(p, 'users/a@b.it'); await ctx.close();
    assert(/Tester/.test(t) && /a@b\.it/.test(t), 'nel profilo mancano nome ed email dell\'account');
    assert(!/edoardo@bt-app\.demo/.test(t) && !/Edoardo/.test(t), 'nel profilo ci sono ancora i dati di prova');
    assert(!/Accesso anticipato/.test(t), 'c\'è ancora "Accesso anticipato · BETA"');
    assert(!emailInput, 'l\'email non si deve poter modificare');
    assert(/Tester Due/.test(t2) && user.name === 'Tester Due' && user.nick === 'Tester Due', 'nome modificato: ' + JSON.stringify({ name: user.name, nick: user.nick }));
    assert(!errs.length, errs.join(' | '));
  },

  async 'password dimenticata: "Ti abbiamo mandato un\'email"'(b) {
    const { ctx, p, errs } = await open(b);
    await tapText(p, 'Password dimenticata?'); await w(p, 400);
    const empty = await text(p);
    await p.fill('#authEmail', 'a@b.it');
    await tapText(p, 'Password dimenticata?'); await w(p, 600);
    const t = await text(p), auth = await authState(p); await ctx.close();
    assert(/Inserisci la tua email/.test(empty), 'senza email deve chiederla');
    assert(t.includes("Ti abbiamo mandato un'email per scegliere una nuova password. Controlla anche lo spam."), 'manca il messaggio dell\'email mandata');
    assert(auth.resetSent.includes('a@b.it'), 'email di Firebase non mandata: ' + JSON.stringify(auth.resetSent));
    assert(!/Anteprima dimostrativa/.test(t), 'c\'è ancora "Anteprima dimostrativa"');
    assert(!errs.length, errs.join(' | '));
  },

  async 'eliminazione: dopo, l\'accesso con quell\'email dice "Account non trovato"'(b) {
    const { ctx, p, errs } = await open(b);
    await register(p);
    await tapSel(p, '[aria-label="Profilo"]'); await w(p, 400);
    await tapText(p, 'Elimina account'); await w(p, 300);
    await tapText(p, 'ELIMINA DEFINITIVAMENTE'); await w(p, 400);
    const ask = await text(p);
    await p.fill('#delPw', 'abcdef');
    await tapText(p, 'ELIMINA DEFINITIVAMENTE'); await w(p, 1200);
    const after = await text(p), user = await doc(p, 'users/fabio@b.it'), auth = await authState(p);
    await login(p, { email: 'fabio@b.it', pw: 'abcdef' });
    const again = await text(p); await ctx.close();
    assert(/Per eliminare l'account scrivi la tua password/.test(ask), 'senza password non deve cancellare: ' + ask.slice(0, 200));
    assert(/ENTRA SENZA ACCOUNT/.test(after), 'dopo l\'eliminazione non torna alla schermata di accesso');
    assert(user === undefined && !auth.users['fabio@b.it'], 'account ancora presente');
    assert(/Account non trovato/.test(again), 'accesso dopo l\'eliminazione: ' + again.slice(0, 200));
    assert(!errs.length, errs.join(' | '));
  },

  async 'account non admin: nessuna riga "Pannello Admin"'(b) {
    const { ctx, p, errs } = await open(b);
    await register(p);
    await tapSel(p, '[aria-label="Profilo"]'); await w(p, 400);
    const t = await text(p);
    await tapText(p, 'Esci', { exact: true }); await w(p, 500);
    await login(p);
    await tapSel(p, '[aria-label="Profilo"]'); await w(p, 400);
    const admin = await text(p); await ctx.close();
    assert(!/Pannello Admin/.test(t), 'un account non admin vede "Pannello Admin"');
    assert(/Pannello Admin/.test(admin), 'l\'account admin (admins/a@b.it) non vede "Pannello Admin"');
    assert(!errs.length, errs.join(' | '));
  },

  async 'ospite: legge le notizie; per scrivere in chat gli si chiede l\'account'(b) {
    const { ctx, p, errs } = await open(b);
    await tapText(p, 'ENTRA SENZA ACCOUNT'); await w(p, 500);
    const home = await text(p);
    await goTab(p, 'RACE'); await tapSel(p, '[data-race-chat]'); await w(p); await tapText(p, 'Chat Generale'); await w(p, 500);
    await p.fill('input[placeholder="Scrivi un messaggio…"]', 'ciao'); await w(p, 100);
    await tapSel(p, '[aria-label="Invia"]'); await w(p, 500);
    const t = await text(p); await ctx.close();
    assert(home.includes("Vi presentiamo l'app B&T!!"), 'l\'ospite non vede le notizie');
    assert(/Per scrivere in chat serve un account/.test(t) && /ACCEDI/.test(t), 'all\'ospite non si chiede l\'account per scrivere');
    assert(!errs.length, errs.join(' | '));
  },

  async 'sessione: chiudendo e riaprendo l\'app si resta dentro'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await p.reload(); await w(p, 1000);
    const t = await text(p);
    await tapSel(p, '[aria-label="Profilo"]'); await w(p, 400);
    const prof = await text(p); await ctx.close();
    assert(!/ENTRA SENZA ACCOUNT/.test(t), 'dopo aver riaperto l\'app chiede di nuovo l\'accesso');
    assert(/a@b\.it/.test(prof), 'dopo aver riaperto l\'app il profilo non è quello dell\'account');
    assert(!errs.length, errs.join(' | '));
  },

  async 'offline: "Errore di connessione, riprova tra poco"'(b) {
    const { ctx, p, errs } = await open(b, { query: '?nofake', routes: { 'https://www.gstatic.com/**': r => r.abort() } });
    await login(p);
    const t = await text(p); await ctx.close();
    assert(/Errore di connessione, riprova tra poco/.test(t), 'senza rete manca "Errore di connessione, riprova tra poco"');
    assert(/ENTRA SENZA ACCOUNT/.test(t), 'senza rete non deve entrare');
    assert(!errs.length, errs.join(' | '));
  },
});
