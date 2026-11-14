// 13/11 (Edoardo: "le domande sulla storia cambino da sole in base al weekend di gara; l'admin le può aggiungere o
// togliere"). Le domande di storia del weekend si fanno da sole dai dati veri del circuito (src/data/circuit-info.json:
// primo GP, record sul giro, anno di costruzione, curve). Niente dato → niente domanda. Tre per weekend, a rotazione.
// Uso: node test/unit/history-quiz.test.js
const assert = require('assert');
const H = require('../../src/logic/history-quiz');
const INFO = require('../../src/data/circuit-info.json');
const F1 = require('../../src/data/f1-2026');
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('PASS  ' + name); } catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); } };

const BR = F1.RACES.find(r => r.circuitId === 'br-1940');
const optIds = q => q.options.map(o => o[0]);

t('tre domande per il weekend, con id fissi legati alla gara e risposta già nota', () => {
  const qs = H.questionsFor(BR, INFO, { season: 2026 });
  assert.strictEqual(qs.length, 3, JSON.stringify(qs.map(q => q.id)));
  assert.ok(qs.every(q => q.id.startsWith('auto:' + BR.id + ':h-')), qs.map(q => q.id).join(','));
  assert.ok(qs.every(q => q.kind === 'history' && q.raceId === BR.id && q.auto === true && q.cat === 'Storia'));
  assert.ok(qs.every(q => q.options.length === 4 && new Set(optIds(q)).size === 4), 'quattro risposte diverse');
  assert.ok(qs.every(q => optIds(q).includes(q.answer)), 'la risposta giusta è tra le quattro');
  assert.ok(qs.every(q => q.q.includes(BR.circuit) && typeof q.note === 'string' && q.note.length > 5));
  assert.deepStrictEqual(H.questionsFor(BR, INFO, { season: 2026 }), qs, 'sempre le stesse (stesso ordine delle risposte)');
});

t('solo dati veri: record sul giro e primo GP vengono dal file del circuito', () => {
  const all = H.pool(BR, INFO, { season: 2026 });
  const rec = all.find(q => q.id.endsWith(':h-rec')), first = all.find(q => q.id.endsWith(':h-first'));
  const info = INFO['br-1940'];
  assert.strictEqual(rec.options.find(o => o[0] === rec.answer)[1], info.lapRecord.driver);
  assert.ok(rec.note.includes(info.lapRecord.time) && rec.note.includes(String(info.lapRecord.year)), rec.note);
  assert.strictEqual(first.answer, String(info.firstGP));
  // le risposte sbagliate del record sono altri primatisti veri (di altri circuiti), mai inventati
  const holders = new Set(Object.values(INFO).map(i => i.lapRecord && i.lapRecord.driver).filter(Boolean));
  assert.ok(rec.options.every(o => holders.has(o[1])), JSON.stringify(rec.options));
  // gli anni sbagliati non vanno nel futuro
  assert.ok(first.options.every(o => Number(o[0]) <= 2026 && Number(o[0]) >= 1950), JSON.stringify(first.options));
});

t('tutte le gare del calendario: nessuna domanda rotta, mai risposte doppie', () => {
  let total = 0;
  F1.RACES.forEach(r => {
    const qs = H.questionsFor(r, INFO, { season: 2026 });
    total += qs.length;
    assert.ok(qs.length <= 3, r.id);
    qs.forEach(q => {
      assert.strictEqual(new Set(optIds(q)).size, q.options.length, r.id + ' ' + q.id + ' ' + JSON.stringify(q.options));
      assert.ok(optIds(q).includes(q.answer), r.id + ' ' + q.id);
      assert.ok(q.options.every(o => typeof o[0] === 'string' && o[1] != null && String(o[1]).trim()), q.id);
    });
  });
  assert.ok(total >= F1.RACES.length * 2, 'quasi ogni gara ha le sue domande: ' + total);
});

t('circuito nuovo (prima volta quest\'anno, senza record): niente domande su quello che non si sa', () => {
  const madrid = F1.RACES.find(r => r.circuitId === 'es-2026');
  const ids = H.pool(madrid, INFO, { season: 2026 }).map(q => q.id.split(':h-')[1]);
  assert.ok(!ids.includes('first'), 'niente "primo GP" se è quest\'anno: ' + ids.join(','));
  if (!INFO['es-2026'].lapRecord) assert.ok(!ids.includes('rec') && !ids.includes('recyear'), ids.join(','));
  assert.deepStrictEqual(H.questionsFor({ id: 'r99', circuitId: 'boh', circuit: 'Boh' }, INFO, { season: 2026 }), [], 'circuito sconosciuto: nessuna domanda');
  assert.deepStrictEqual(H.questionsFor(null, INFO), []);
});

t('rotazione: gare diverse non fanno sempre le stesse tre domande', () => {
  const kinds = new Set();
  F1.RACES.forEach(r => H.questionsFor(r, INFO, { season: 2026 }).forEach(q => kinds.add(q.id.split(':h-')[1])));
  assert.ok(kinds.size >= 4, [...kinds].join(','));
});

t('l\'admin toglie una domanda automatica: visible la salta', () => {
  const qs = H.questionsFor(BR, INFO, { season: 2026 });
  assert.deepStrictEqual(H.visible(qs, [qs[1].id]).map(q => q.id), [qs[0].id, qs[2].id]);
  assert.deepStrictEqual(H.visible(qs, null), qs);
  assert.strictEqual(H.isHistoryAuto(qs[0].id), true);
  assert.strictEqual(H.isHistoryAuto('auto:r20:win'), false);
  assert.strictEqual(H.isHistoryAuto('p123'), false);
});

console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
