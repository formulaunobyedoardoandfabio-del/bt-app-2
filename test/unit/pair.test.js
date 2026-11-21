// Collegamento PC ↔ telefono (21/11, Edoardo: "collegare un PC e il telefono grazie a un QR code per fare la stessa
// cosa del second screen, ma ancora più grande"; piano claude/f1tv-e-schermo-pc.md). Il PC apre il sito con
// ?schermo e mostra un QR e 6 cifre; il telefono con l'account scrive pair/<cifre> e il PC diventa il Second Screen
// grande, coi riquadri scelti sul telefono. Uso: node test/unit/pair.test.js
const assert = require('assert');
const P = require('../../src/logic/pair');
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('PASS  ' + name); } catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); } };

t('codice di 6 cifre che non comincia con 0', () => {
  assert.strictEqual(P.newCode(() => 0), '100000');
  assert.strictEqual(P.newCode(() => 0.999999), '999999');
  assert.ok(P.CODE_RE.test(P.newCode(Math.random)));
});
t('link del QR e lettura del codice da QR, link o testo', () => {
  assert.strictEqual(P.qrText('123456'), 'https://bt-app-2.vercel.app/?collega=123456');
  assert.strictEqual(P.parseCode('https://bt-app-2.vercel.app/?collega=123456'), '123456');
  assert.strictEqual(P.parseCode('https://bt-app-2.vercel.app/schermo?x=1&collega=654321'), '654321');
  assert.strictEqual(P.parseCode(' 123 456 '), '123456');
  assert.strictEqual(P.parseCode('012345'), null, 'non comincia con 0');
  assert.strictEqual(P.parseCode('https://altro.it/?collega=123456'), null, 'solo il nostro sito');
  assert.strictEqual(P.parseCode('ciao'), null);
});
t('modalità della pagina dal link: PC (?schermo o /schermo), collega dal telefono (?collega=)', () => {
  assert.deepStrictEqual(P.pageMode({ search: '?schermo', pathname: '/' }), { pc: true, link: null });
  assert.deepStrictEqual(P.pageMode({ search: '', pathname: '/schermo' }), { pc: true, link: null });
  assert.deepStrictEqual(P.pageMode({ search: '?collega=123456', pathname: '/' }), { pc: false, link: '123456' });
  assert.deepStrictEqual(P.pageMode({ search: '', pathname: '/' }), { pc: false, link: null });
});
t('documento scritto dal telefono: proprietario, Pro, scadenza a 12 ore, riquadri puliti', () => {
  const d = P.claim({ owner: 'uid-a', pro: true, name: 'Edo', layout: { left: ['gomme'], x: 1 }, prefs: { a: 1 }, now: 1000 });
  assert.deepStrictEqual(Object.keys(d).sort(), ['at', 'exp', 'layout', 'name', 'owner', 'prefs', 'pro', 'v']);
  assert.strictEqual(d.at, 1000); assert.strictEqual(d.exp, 1000 + P.LINK_MS); assert.strictEqual(d.v, 1);
  assert.strictEqual(d.pro, true); assert.strictEqual(d.name, 'Edo');
  assert.throws(() => P.claim({ owner: '', pro: true, now: 1 }), /account/);
  assert.strictEqual(P.claim({ owner: 'u', pro: 'sì', name: 'x'.repeat(80), now: 1 }).pro, false, 'Pro solo se vero');
  assert.strictEqual(P.claim({ owner: 'u', pro: true, name: 'x'.repeat(80), now: 1 }).name.length, 30);
});
// 21/11: niente confronti tra l'orologio del PC e quello del telefono (possono essere indietro di minuti): vale un
// documento diverso da quello che c'era già quando il codice è comparso sul PC (old = il suo "at", o null).
t('stato sul PC: attesa, collegato (scritto dopo che il codice è comparso), scaduto', () => {
  const doc = P.claim({ owner: 'u', pro: true, now: 5000 });
  assert.strictEqual(P.status(null, { old: null, now: 6000 }), 'attesa');
  assert.strictEqual(P.status(doc, { old: null, now: 6000 }), 'collegato');
  assert.strictEqual(P.status(doc, { old: 5000, now: 21000 }), 'attesa', 'un collegamento vecchio dello stesso codice non vale');
  assert.strictEqual(P.status(doc, { old: 1000, now: 6000 }), 'collegato', 'riscritto dopo: vale');
  assert.strictEqual(P.status(doc, { old: null, now: 5000 + P.LINK_MS + 1 }), 'scaduto');
  assert.strictEqual(P.status({ owner: '', at: 5000, exp: 9e15 }, { old: null, now: 6000 }), 'attesa', 'senza proprietario non vale');
});
t('il codice sul PC cambia ogni 2 minuti finché nessuno lo usa', () => {
  assert.strictEqual(P.codeStale(1000, 1000 + P.CODE_MS - 1), false);
  assert.strictEqual(P.codeStale(1000, 1000 + P.CODE_MS), true);
});

t('risposta del PC: pc.seen ripete l\'"at" del collegamento che ha visto; pc.n cresce a ogni battito', () => {
  const doc = { owner: 'u', at: 1000, pc: { seen: 1000, n: 3, ua: 'Chrome' } };
  assert.strictEqual(P.acked(doc, 1000), true);
  assert.strictEqual(P.acked({ ...doc, pc: { seen: 200, n: 1 } }, 1000), false, 'di un collegamento di prima');
  assert.strictEqual(P.acked({ owner: 'u', at: 1000 }, 1000), false);
  assert.strictEqual(P.acked(null, 1000), false);
  assert.strictEqual(P.ackOf(null, 'Chrome'), null);
  assert.strictEqual(P.ackOf({ owner: '', at: 7 }, 'Chrome'), null, 'senza proprietario niente risposta');
  assert.deepStrictEqual(P.ackOf({ owner: 'u', at: 7 }, 'Chrome'), { seen: 7, n: 1, ua: 'Chrome' });
  assert.deepStrictEqual(P.ackOf({ owner: 'u', at: 7, pc: { seen: 7, n: 2, ua: 'Chrome' } }, 'Chrome'), { seen: 7, n: 3, ua: 'Chrome' });
  assert.deepStrictEqual(P.ackOf({ owner: 'u', at: 9, pc: { seen: 7, n: 5, ua: 'Chrome' } }, 'Edge'), { seen: 9, n: 1, ua: 'Edge' }, 'collegamento nuovo: si riparte da 1');
});

t('nome del browser del PC dal suo user agent', () => {
  assert.strictEqual(P.browserName('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'), 'Chrome');
  assert.strictEqual(P.browserName('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/130.0 Safari/537.36 Edg/130.0'), 'Edge');
  assert.strictEqual(P.browserName('Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0'), 'Firefox');
  assert.strictEqual(P.browserName('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'), 'Safari');
  assert.strictEqual(P.browserName(''), 'Browser');
});

t('disposizione arrivata dal documento: solo riquadri noti, altezze 1-4, colonne da 4 posti, niente doppioni', () => {
  const ids = ['classifica', 'gomme', 'settori', 'meteo'], init = { left: [{ id: 'classifica', h: 2 }], right: [] };
  const ok = { left: [{ id: 'classifica', h: 2 }, { id: 'gomme', h: 2 }], right: [{ id: 'meteo', h: 4 }] };
  assert.deepStrictEqual(P.cleanLayout(ok, ids, init), ok);
  assert.deepStrictEqual(P.cleanLayout({ left: [{ id: 'boh', h: 2 }, { id: 'gomme', h: 9 }], right: [{ id: 'gomme', h: 1 }] }, ids, init), { left: [{ id: 'gomme', h: 4 }], right: [] });
  assert.deepStrictEqual(P.cleanLayout({ left: [{ id: 'classifica', h: 3 }, { id: 'gomme', h: 3 }], right: [] }, ids, init), { left: [{ id: 'classifica', h: 3 }, { id: 'gomme', h: 1 }], right: [] }, 'la colonna non supera 4 posti');
  assert.deepStrictEqual(P.cleanLayout(null, ids, init), init);
  assert.deepStrictEqual(P.cleanLayout({ left: 'x' }, ids, init), init);
});

// 21/11 (Edoardo: "fai che si possa anche dall'app del Cell decidere cosa mettere sul PC"): i pannelli del PC, in
// ordine, li sceglie il telefono (grafica "B&T: Second Screen PC").
t('pannelli del PC: di serie i 10 della grafica, solo nomi noti e una volta sola', () => {
  assert.deepStrictEqual(P.PANELS_INIT, ['mappa', 'classifica', 'quadrante', 'telemetria', 'meteo', 'radio', 'gomme', 'chat', 'trophies', 'direzione']);
  assert.ok(P.PANELS.length > P.PANELS_INIT.length && P.PANELS_INIT.every(id => P.PANELS.includes(id)));
  assert.deepStrictEqual(P.cleanPanels(['radio', 'boh', 'mappa', 'radio', 7]), ['radio', 'mappa']);
  assert.deepStrictEqual(P.cleanPanels([]), [], 'anche nessun pannello');
  assert.deepStrictEqual(P.cleanPanels(null), P.PANELS_INIT);
  assert.deepStrictEqual(P.cleanPanels('mappa'), P.PANELS_INIT);
});

t('pannelli del PC: accendi in fondo, spegni, sposta su e giù', () => {
  const l = ['mappa', 'classifica', 'meteo'];
  assert.deepStrictEqual(P.togglePanel(l, 'radio'), ['mappa', 'classifica', 'meteo', 'radio']);
  assert.deepStrictEqual(P.togglePanel(l, 'classifica'), ['mappa', 'meteo']);
  assert.deepStrictEqual(P.togglePanel(l, 'boh'), l);
  assert.deepStrictEqual(P.movePanel(l, 'meteo', -1), ['mappa', 'meteo', 'classifica']);
  assert.deepStrictEqual(P.movePanel(l, 'mappa', 1), ['classifica', 'mappa', 'meteo']);
  assert.strictEqual(P.movePanel(l, 'mappa', -1), l, 'il primo non sale');
  assert.strictEqual(P.movePanel(l, 'meteo', 1), l, "l'ultimo non scende");
  assert.strictEqual(P.movePanel(l, 'radio', 1), l, 'spento: niente');
});

console.log(`\n${pass} passate, ${fail} fallite`);
process.exit(fail ? 1 : 0);
