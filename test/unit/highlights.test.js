// Highlights ufficiali F1 dal feed YouTube (8/11). Uso: node test/unit/highlights.test.js
const assert = require('assert');
const H = require('../../src/services/highlights');
const api = require('../../api/highlights');
let pass = 0, fail = 0;
const tests = [];
const t = (name, fn) => tests.push([name, fn]);

const entry = (id, title, date) => `<entry><id>yt:video:${id}</id><yt:videoId>${id}</yt:videoId><yt:channelId>UCB_qr75-ydFVKSF9Dmo6izg</yt:channelId><title>${title}</title><link rel="alternate" href="https://www.youtube.com/watch?v=${id}"/><published>${date}</published><media:group><media:thumbnail url="https://i2.ytimg.com/vi/${id}/hqdefault.jpg"/></media:group></entry>`;
const FEED = `<?xml version="1.0"?><feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom"><title>FORMULA 1</title>
${entry('AAAAAAAAAAA', 'Race Highlights | 2026 S&#227;o Paulo Grand Prix', '2026-11-08T19:30:00+00:00')}
${entry('BBBBBBBBBBB', 'Qualifying Highlights | 2026 S&#227;o Paulo Grand Prix', '2026-11-07T19:30:00+00:00')}
${entry('CCCCCCCCCCC', 'Drivers React After The Race &amp; More', '2026-11-08T20:00:00+00:00')}
${entry('DDDDDDDDDDD', 'Sprint Highlights | 2026 Chinese Grand Prix', '2026-03-14T08:00:00+00:00')}
${entry('EEEEEEEEEEE', 'Best overtakes highlights #shorts', '2026-11-08T21:00:00+00:00')}
</feed>`;

t('feed: solo gli highlights (niente shorts né altri video), dal più nuovo, titoli in italiano', () => {
  const items = H.parseFeed(FEED);
  assert.deepStrictEqual(items.map(x => x.id), ['yt-AAAAAAAAAAA', 'yt-BBBBBBBBBBB', 'yt-DDDDDDDDDDD']);
  assert.strictEqual(items[0].title, 'Gara · 2026 São Paulo Grand Prix');
  assert.strictEqual(items[1].title, 'Qualifiche · 2026 São Paulo Grand Prix');
  assert.strictEqual(items[2].title, 'Sprint · 2026 Chinese Grand Prix');
  assert.strictEqual(items[0].link, 'https://www.youtube.com/watch?v=AAAAAAAAAAA');
  assert.strictEqual(items[0].thumb, 'https://i.ytimg.com/vi/AAAAAAAAAAA/hqdefault.jpg');
  assert.strictEqual(items[0].date, '2026-11-08T19:30:00.000Z');
});

t('titoli: prove libere e qualifica Sprint; quelli sconosciuti restano com\'erano', () => {
  assert.strictEqual(H.italianTitle('FP2 Highlights | 2026 Las Vegas Grand Prix'), 'Prove libere 2 · 2026 Las Vegas Grand Prix');
  assert.strictEqual(H.italianTitle('Sprint Qualifying Highlights | 2026 Qatar Grand Prix'), 'Qualifica Sprint · 2026 Qatar Grand Prix');
  assert.strictEqual(H.italianTitle('Extended Highlights'), 'Extended Highlights');
});

t('id del canale dalla pagina pubblica; feed rotto = lista vuota', () => {
  assert.strictEqual(H.channelFromPage('..."externalId":"UCB_qr75-ydFVKSF9Dmo6izg"...'), 'UCB_qr75-ydFVKSF9Dmo6izg');
  assert.strictEqual(H.channelFromPage('niente'), null);
  assert.deepStrictEqual(H.parseFeed('<html>errore</html>'), []);
  assert.deepStrictEqual(H.parseFeed(null), []);
});

t('app: scarica, salva 30 minuti, senza rete gli ultimi letti', async () => {
  const mem = {}; const store = { get: k => mem[k], set: (k, v) => { mem[k] = v; } };
  let now = 1000, calls = 0, ok = true;
  const f = async () => { calls++; if (!ok) throw new Error('rete'); return { ok: true, json: async () => ({ items: H.parseFeed(FEED) }) }; };
  const c = H.createHighlights({ fetch: f, store, now: () => now });
  assert.strictEqual((await c.list()).length, 3);
  now += 10 * 60e3; await c.list();
  assert.strictEqual(calls, 1, 'entro 30 minuti non riscarica');
  now += 40 * 60e3; ok = false;
  assert.strictEqual((await c.list()).length, 3, 'senza rete restano gli ultimi');
  const bad = H.createHighlights({ fetch: async () => ({ ok: true, json: async () => ({ items: [{ id: 'x', title: 1 }] }) }), store: null });
  assert.deepStrictEqual(await bad.list(), [], 'voci rotte scartate');
});

t('funzione Vercel: feed vero → 200 con gli highlights; YouTube giù → 502', async () => {
  const realFetch = global.fetch;
  const run = async fake => { global.fetch = fake; const out = {}; const res = { setHeader: (k, v) => { out[k] = v; }, status: c => ({ json: b => { out.code = c; out.body = b; } }) }; await api({ query: {} }, res); return out; };
  try {
    const okRes = await run(async url => ({ ok: true, text: async () => (String(url).includes('feeds/videos.xml') ? FEED : '') }));
    assert.strictEqual(okRes.code, 200);
    assert.strictEqual(okRes.body.items.length, 3);
    assert.ok(/s-maxage=1800/.test(okRes['Cache-Control']));
    const down = await run(async () => { throw new Error('giù'); });
    assert.strictEqual(down.code, 502);
  } finally { global.fetch = realFetch; }
});

(async () => {
  for (const [name, fn] of tests) {
    try { await fn(); pass++; console.log('PASS  ' + name); } catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); }
  }
  console.log(`\n${pass} passati, ${fail} falliti`);
  process.exit(fail ? 1 : 0);
})();
