// Prove delle foto di Wikimedia Commons (Tappa 3, G30; src/services/commons.js): licenza e autore letti dall'API di
// Commons, solo licenze libere (CC0, pubblico dominio, CC BY, CC BY-SA), risultati tenuti 7 giorni. Gira in Node.
// Uso: node test/unit/commons.test.js [filtro]
const assert = require('assert');
const path = require('path');
const { createCommons, licenseFree, normFile, TTL } = require(path.join(__dirname, '..', '..', 'src', 'services', 'commons.js'));

const DAY = 24 * 3600e3;
const meta = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { value: v }]));
// Risposta finta dell'API: titles → pagine con imageinfo (o missing).
function api(files) {
  return {
    query: {
      pages: Object.fromEntries(Object.entries(files).map(([title, f], i) => [f ? String(i + 1) : String(-(i + 1)), f ? {
        title, imageinfo: [{ thumburl: 'https://upload.wikimedia.org/thumb/' + i + '.jpg', descriptionurl: 'https://commons.wikimedia.org/wiki/' + title.replace(/ /g, '_'), extmetadata: meta(f) }],
      } : { title, missing: '' }])),
    },
  };
}
const fetchOf = (body, log = []) => async url => { log.push(url); return { ok: true, json: async () => body }; };
const memLocal = () => { const m = {}; return { get: k => m[k], set: (k, v) => { m[k] = v; }, m }; };

const tests = {
  async 'licenze: CC BY-SA 4.0 e CC0 sì, CC BY-NC no, fair use no'() {
    assert.strictEqual(licenseFree({ License: 'cc-by-sa-4.0', LicenseShortName: 'CC BY-SA 4.0' }), true);
    assert.strictEqual(licenseFree({ License: 'cc0', LicenseShortName: 'CC0' }), true);
    assert.strictEqual(licenseFree({ License: 'pd', LicenseShortName: 'Public domain' }), true);
    assert.strictEqual(licenseFree({ License: 'cc-by-2.0', LicenseShortName: 'CC BY 2.0' }), true);
    assert.strictEqual(licenseFree({ License: 'cc-by-nc-2.0', LicenseShortName: 'CC BY-NC 2.0' }), false);
    assert.strictEqual(licenseFree({ License: 'cc-by-nd-4.0', LicenseShortName: 'CC BY-ND 4.0' }), false);
    assert.strictEqual(licenseFree({ LicenseShortName: 'Fair use' }), false);
    assert.strictEqual(licenseFree({}), false);
    const c = createCommons({ fetchImpl: fetchOf(api({ 'File:A.jpg': { License: 'cc-by-sa-4.0', LicenseShortName: 'CC BY-SA 4.0', Artist: 'Anna' }, 'File:B.jpg': { License: 'cc-by-nc-2.0', LicenseShortName: 'CC BY-NC 2.0', Artist: 'Bob' } })), local: memLocal() });
    const r = await c.info(['File:A.jpg', 'File:B.jpg']);
    assert.strictEqual(r['File:A.jpg'].free, true);
    assert.strictEqual(r['File:A.jpg'].license, 'CC BY-SA 4.0');
    assert.strictEqual(r['File:B.jpg'].free, false);
  },
  async 'autore senza HTML'() {
    const c = createCommons({ fetchImpl: fetchOf(api({ 'File:A.jpg': { License: 'cc-by-sa-4.0', LicenseShortName: 'CC BY-SA 4.0', Artist: '<a href="//commons.wikimedia.org/wiki/User:Anna" title="User:Anna">Anna&nbsp;Rossi</a> &amp; <span>Bob</span>', DateTimeOriginal: '2025-06-01 14:02:11' } })), local: memLocal() });
    const r = await c.info(['File:A.jpg']);
    assert.strictEqual(r['File:A.jpg'].author, 'Anna Rossi & Bob');
    assert.strictEqual(r['File:A.jpg'].date, '2025-06-01');
    assert.strictEqual(r['File:A.jpg'].thumb, 'https://upload.wikimedia.org/thumb/0.jpg');
  },
  async 'Commons che non risponde: null, nessun errore'() {
    const c = createCommons({ fetchImpl: async () => { throw new Error('rete'); }, local: memLocal() });
    const r = await c.info(['File:A.jpg']);
    assert.deepStrictEqual(r, { 'File:A.jpg': null });
    const c2 = createCommons({ fetchImpl: async () => ({ ok: false, status: 503, json: async () => ({}) }), local: memLocal() });
    assert.deepStrictEqual(await c2.info(['File:A.jpg']), { 'File:A.jpg': null });
  },
  async 'file mancante: null'() {
    const c = createCommons({ fetchImpl: fetchOf(api({ 'File:Nope.jpg': null })), local: memLocal() });
    assert.deepStrictEqual(await c.info(['File:Nope.jpg']), { 'File:Nope.jpg': null });
  },
  async 'cache di 7 giorni'() {
    let now = Date.parse('2026-10-17T10:00:00Z');
    const log = [], local = memLocal();
    const c = createCommons({ fetchImpl: fetchOf(api({ 'File:A.jpg': { License: 'cc0', LicenseShortName: 'CC0', Artist: 'Anna' } }), log), now: () => now, local });
    await c.info(['File:A.jpg']);
    await c.info(['File:A.jpg']);
    assert.strictEqual(log.length, 1, 'la seconda volta non deve richiedere');
    const c2 = createCommons({ fetchImpl: fetchOf(api({ 'File:A.jpg': { License: 'cc0', LicenseShortName: 'CC0', Artist: 'Anna' } }), log), now: () => now, local });
    await c2.info(['File:A.jpg']);
    assert.strictEqual(log.length, 1, 'il telefono ricorda anche dopo un riavvio');
    now += TTL + 1;
    await c2.info(['File:A.jpg']);
    assert.strictEqual(log.length, 2, 'dopo 7 giorni si rilegge');
    assert.strictEqual(TTL, 7 * DAY);
    assert.ok(/action=query/.test(log[0]) && /prop=imageinfo/.test(log[0]) && /iiurlwidth=480/.test(log[0]) && /origin=\*/.test(log[0]) && /titles=File%3AA.jpg/.test(log[0]), 'richiesta: ' + log[0]);
  },
  async 'al massimo 50 file per richiesta'() {
    const log = [];
    const files = Array.from({ length: 120 }, (_, i) => 'File:F' + i + '.jpg');
    const c = createCommons({ fetchImpl: fetchOf(api({}), log), local: memLocal() });
    const r = await c.info(files);
    assert.strictEqual(log.length, 3);
    assert.strictEqual(Object.keys(r).length, 120);
  },
  'normFile: link e nomi di Commons'() {
    assert.strictEqual(normFile('https://commons.wikimedia.org/wiki/File:Charles_Leclerc_2024_(cropped).jpg'), 'File:Charles Leclerc 2024 (cropped).jpg');
    assert.strictEqual(normFile('https://commons.m.wikimedia.org/wiki/File:Lando%20Norris%202025.jpg'), 'File:Lando Norris 2025.jpg');
    assert.strictEqual(normFile('Charles_Leclerc.jpg'), 'File:Charles Leclerc.jpg');
    assert.strictEqual(normFile('File:Ferrari logo.svg'), 'File:Ferrari logo.svg');
    assert.strictEqual(normFile('https://example.com/foto.jpg'), null);
    assert.strictEqual(normFile(''), null);
  },
};

(async () => {
  let pass = 0, fail = 0;
  const filter = process.argv[2] ? new RegExp(process.argv[2], 'i') : null;
  for (const [name, fn] of Object.entries(tests)) {
    if (filter && !filter.test(name)) continue;
    try { await fn(); pass++; console.log('PASS  ' + name); }
    catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + String(e.message).split('\n')[0].slice(0, 300)); }
  }
  console.log(`\n${pass} passati, ${fail} falliti`);
  process.exit(fail ? 1 : 0);
})();
