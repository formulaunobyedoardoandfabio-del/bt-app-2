// Profilo pubblico dei tifosi (31/10 sera, src/services/profiles.js): ognuno salva il proprio tifo, casco e trofei in
// fanta/profilo-<aid> quando entra nell'app; il profilo veloce della chat lo legge anche se quella persona non ha
// ancora scritto. Gira in Node con un Firestore finto.
// Uso: node test/unit/profiles.test.js [filtro]
const assert = require('assert');
const path = require('path');
const { createProfiles } = require(path.join(__dirname, '..', '..', 'src', 'services', 'profiles.js'));
const { authorId } = require(path.join(__dirname, '..', '..', 'src', 'services', 'compat.js'));

const fakeDb = () => {
  const docs = {}, log = [];
  return {
    docs, log,
    dbGet: async (c, id) => { log.push('get:' + c + '/' + id); return docs[c + '/' + id] ? JSON.parse(JSON.stringify(docs[c + '/' + id])) : null; },
    dbSet: async (c, id, d) => { log.push('set:' + c + '/' + id); docs[c + '/' + id] = { ...(docs[c + '/' + id] || {}), ...JSON.parse(JSON.stringify(d)) }; },
  };
};
const fakeStore = () => { const m = {}; return { get: k => (k in m ? m[k] : null), set: (k, v) => { m[k] = v; }, m }; };
const AID = authorId('ft22@b.it');
const P = { t: 'ferrari', d: 'leclerc', f: 'vivo', h: { base: '#E8002D', c1: '#FFFFFF', c2: '#111111', pattern: 'flames', visor: 'smoke', finish: 'gloss' }, w: ['pitcrew'] };

const tests = {
  async 'publish salva tifo, casco, trofei e medaglia in fanta/profilo-<aid>'() {
    const db = fakeDb();
    const pr = createProfiles({ ...db, store: fakeStore(), now: () => 1000 });
    assert.strictEqual(await pr.publish({ name: 'FT22', aid: AID, p: P, medal: 'oro' }), true);
    const d = db.docs['fanta/profilo-' + AID];
    assert.ok(d, 'documento non scritto: ' + Object.keys(db.docs));
    assert.strictEqual(d.name, 'FT22');
    assert.strictEqual(d.p.t, 'ferrari');
    assert.deepStrictEqual(d.p.w, ['pitcrew']);
    assert.strictEqual(d.medal, 'oro');
    assert.strictEqual(d.t, 1000);
  },
  async 'publish non riscrive se niente è cambiato (entro un giorno); riscrive se cambia'() {
    const db = fakeDb(), st = fakeStore();
    let t = 1000;
    const pr = createProfiles({ ...db, store: st, now: () => t });
    await pr.publish({ name: 'FT22', aid: AID, p: P });
    t += 60000;
    assert.strictEqual(await pr.publish({ name: 'FT22', aid: AID, p: P }), false);
    assert.strictEqual(await pr.publish({ name: 'FT22', aid: AID, p: { ...P, t: 'mclaren' } }), true);
    assert.strictEqual(db.log.filter(x => x.startsWith('set:')).length, 2);
  },
  async 'publish anche senza scelte: nome e nient\'altro (il profilo si vede comunque)'() {
    const db = fakeDb();
    const pr = createProfiles({ ...db, store: fakeStore(), now: () => 5 });
    assert.strictEqual(await pr.publish({ name: 'FT22', aid: AID, p: { w: [] } }), true);
    assert.strictEqual(db.docs['fanta/profilo-' + AID].name, 'FT22');
  },
  async 'load legge il profilo di un altro; aid strano o senza documento: null; errori: null'() {
    const db = fakeDb();
    db.docs['fanta/profilo-' + AID] = { name: 'FT22', aid: AID, p: P, medal: 'argento', t: 9 };
    const pr = createProfiles({ ...db, store: fakeStore(), now: () => 10 });
    const got = await pr.load(AID);
    assert.strictEqual(got.name, 'FT22');
    assert.strictEqual(got.p.d, 'leclerc');
    assert.strictEqual(got.medal, 'argento');
    assert.strictEqual(await pr.load('../users/a@b.it'), null);
    assert.strictEqual(await pr.load(authorId('nessuno@b.it')), null);
    const bad = createProfiles({ dbGet: async () => { throw new Error('offline'); }, dbSet: async () => {}, store: fakeStore() });
    assert.strictEqual(await bad.load(AID), null);
  },
  async 'cleanupFor: eliminando l\'account il profilo pubblico si svuota'() {
    const db = fakeDb();
    db.docs['fanta/profilo-' + AID] = { name: 'FT22', aid: AID, p: P, t: 9 };
    const pr = createProfiles({ ...db, store: fakeStore(), now: () => 10 });
    await pr.cleanupFor({ email: 'ft22@b.it' });
    const d = db.docs['fanta/profilo-' + AID];
    assert.strictEqual(d.gone, true);
    assert.strictEqual(d.name, '');
    assert.strictEqual(d.p, null);
    assert.strictEqual(await pr.load(AID), null, 'un profilo eliminato non si mostra');
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
