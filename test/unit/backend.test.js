// Prove del modulo backend (src/services/backend.js): il tasto "ChatGPT" del Pannello Admin chiama il backend
// dell'app di oggi (POST /generateArticle → {content}) con i messaggi di oggi.
// Uso: node test/unit/backend.test.js [filtro]
const assert = require('assert');
const { FUNCTIONS_BASE, BACKEND_MSG, generateArticle } = require('../../src/services/backend');

let pass = 0, fail = 0;
const tests = [];
const t = (name, fn) => tests.push([name, fn]);
// fetch finto: registra le chiamate e risponde con { status, body } (body = oggetto JSON o testo).
function fakeFetch(reply) {
  const calls = [];
  const f = async (url, opts) => {
    calls.push({ url, opts });
    const r = typeof reply === 'function' ? await reply(url, opts) : reply;
    return { ok: r.status >= 200 && r.status < 300, status: r.status, json: async () => (typeof r.body === 'string' ? JSON.parse(r.body) : r.body) };
  };
  f.calls = calls;
  return f;
}

t('indirizzo del backend di oggi (Vercel)', () => {
  assert.strictEqual(FUNCTIONS_BASE, 'https://bt-app-flutter.vercel.app/api');
});

t('POST /generateArticle con titolo, sottotitolo e categoria; il testo è {content}', async () => {
  const f = fakeFetch({ status: 200, body: { content: '  Primo paragrafo.\n\nSecondo paragrafo.  ' } });
  const out = await generateArticle({ title: ' Leclerc in pole ', summary: 'Giro perfetto', category: 'NEWS' }, { fetchImpl: f });
  assert.strictEqual(out, 'Primo paragrafo.\n\nSecondo paragrafo.');
  assert.strictEqual(f.calls.length, 1);
  const { url, opts } = f.calls[0];
  assert.strictEqual(url, 'https://bt-app-flutter.vercel.app/api/generateArticle');
  assert.strictEqual(opts.method, 'POST');
  assert.strictEqual(opts.headers['Content-Type'], 'application/json');
  assert.deepStrictEqual(JSON.parse(opts.body), { title: 'Leclerc in pole', summary: 'Giro perfetto', category: 'NEWS' });
});

t('senza titolo: "Scrivi prima un titolo" e nessuna chiamata', async () => {
  const f = fakeFetch({ status: 200, body: { content: 'x' } });
  await assert.rejects(generateArticle({ title: '   ', summary: 'a' }, { fetchImpl: f }), e => e.code === 'no-title' && e.message === 'Scrivi prima un titolo');
  assert.strictEqual(f.calls.length, 0);
  assert.strictEqual(BACKEND_MSG['no-title'], 'Scrivi prima un titolo');
});

t('errore del server, testo vuoto, risposta non JSON o rete assente: "ChatGPT non ha risposto, riprova"', async () => {
  const bad = [
    fakeFetch({ status: 502, body: { error: 'ChatGPT non ha risposto correttamente' } }),
    fakeFetch({ status: 200, body: { content: '   ' } }),
    fakeFetch({ status: 200, body: '<html>errore</html>' }),
    async () => { throw new TypeError('Failed to fetch'); },
  ];
  for (const f of bad) await assert.rejects(generateArticle({ title: 'Titolo' }, { fetchImpl: f }), e => e.code === 'failed' && e.message === 'ChatGPT non ha risposto, riprova');
  assert.strictEqual(BACKEND_MSG.failed, 'ChatGPT non ha risposto, riprova');
});

t('il backend che non risponde mai: dopo il tempo massimo "ChatGPT non ha risposto, riprova"', async () => {
  const never = () => new Promise(() => {});
  const t0 = Date.now();
  await assert.rejects(generateArticle({ title: 'Titolo' }, { fetchImpl: never, timeoutMs: 80 }), e => e.code === 'failed');
  assert.ok(Date.now() - t0 < 2000);
});

(async () => {
  const filter = process.argv[2] ? new RegExp(process.argv[2], 'i') : null;
  for (const [name, fn] of tests) {
    if (filter && !filter.test(name)) continue;
    try { await fn(); pass++; console.log('PASS  ' + name); }
    catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + String(e && e.message).split('\n')[0]); }
  }
  console.log(`\n${pass} passati, ${fail} falliti`);
  process.exit(fail ? 1 : 0);
})();
