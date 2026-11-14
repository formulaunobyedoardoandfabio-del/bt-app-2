// 14/11 (Edoardo: "rendi più veloce il caricamento delle foto delle news"). Ogni foto è un documento di Firestore
// (fino a 600 KB) e la copia stava solo in memoria: a ogni apertura dell'app le foto si riscaricavano tutte. Ora si
// tengono sul telefono (IndexedDB): una foto caricata non cambia mai, quindi dalla seconda volta si apre subito.
// Uso: node test/unit/imgstore.test.js
const assert = require('assert');
const { createImgStore, memoryBackend } = require('../../src/services/imgstore');
let pass = 0, fail = 0;
const tests = [];
const t = (name, fn) => tests.push([name, fn]);

t('una foto messa da parte si ritrova anche con un negozio nuovo (app riaperta)', async () => {
  const back = memoryBackend();
  const A = createImgStore({ backend: () => back, now: () => 1 });
  await A.put('fsimg:a', 'data:image/jpeg;base64,AAA');
  const B = createImgStore({ backend: () => back, now: () => 2 });
  assert.strictEqual(await B.get('fsimg:a'), 'data:image/jpeg;base64,AAA');
  assert.strictEqual(await B.get('fsimg:x'), null);
});

t('al massimo max foto: si tolgono quelle viste meno di recente', async () => {
  const back = memoryBackend();
  let clock = 0;
  const S = createImgStore({ backend: () => back, now: () => ++clock, max: 3 });
  const img = k => 'data:image/jpeg;base64,' + k.toUpperCase();
  for (const k of ['a', 'b', 'c']) await S.put('fsimg:' + k, img(k));
  await S.get('fsimg:a');                         // a vista adesso: resta
  await S.put('fsimg:d', img('d'));               // quarta: esce la meno recente (b)
  assert.strictEqual(await S.get('fsimg:b'), null);
  assert.strictEqual(await S.get('fsimg:a'), img('a'));
  assert.strictEqual(await S.get('fsimg:d'), img('d'));
  assert.strictEqual((await back.keys()).length, 3);
});

t('senza IndexedDB (o se si rompe) non succede niente: get dà null, put non lancia errori', async () => {
  const none = createImgStore({ backend: () => null });
  assert.strictEqual(await none.get('fsimg:a'), null);
  await none.put('fsimg:a', 'data:image/jpeg;base64,AA');
  const broken = { get: () => Promise.reject(new Error('rotto')), set: () => Promise.reject(new Error('pieno')), del: () => Promise.reject(new Error('x')), keys: () => Promise.reject(new Error('x')) };
  const S = createImgStore({ backend: () => broken });
  assert.strictEqual(await S.get('fsimg:a'), null);
  await S.put('fsimg:a', 'data:image/jpeg;base64,AA');
  await S.drop('fsimg:a');
});

t('solo data URL di immagini e solo riferimenti fsimg: (niente altro finisce sul telefono)', async () => {
  const back = memoryBackend();
  const S = createImgStore({ backend: () => back });
  await S.put('https://x/y.jpg', 'data:image/jpeg;base64,AAA');
  await S.put('fsimg:b', 'non una foto');
  assert.strictEqual((await back.keys()).length, 0);
  await S.put('fsimg:c', 'data:image/png;base64,QQ==');
  await S.drop('fsimg:c');
  assert.strictEqual(await S.get('fsimg:c'), null, 'foto tolta dalla notizia: tolta anche dal telefono');
});

(async () => {
  const filter = process.argv[2] || '';
  for (const [name, fn] of tests) {
    if (filter && !name.includes(filter)) continue;
    try { await fn(); pass++; console.log('PASS  ' + name); } catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); }
  }
  console.log(`\n${pass} passati, ${fail} falliti`);
  process.exit(fail ? 1 : 0);
})();
