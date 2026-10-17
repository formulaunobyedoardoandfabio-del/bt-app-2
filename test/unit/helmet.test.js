// Prove del casco del profilo (Tappa 3, G15; src/logic/helmet.js): i valori che si salvano nell'account sono sempre
// validi (colori, disegno, numero da 0 a 99, visiera e finitura). Gira in Node.
// Uso: node test/unit/helmet.test.js [filtro]
const assert = require('assert');
const path = require('path');
const H = require(path.join(__dirname, '..', '..', 'src', 'logic', 'helmet.js'));

const tests = {
  'cleanHelmet: colori, disegno e numero validi'() {
    assert.deepStrictEqual(H.cleanHelmet(null), H.HELMET_DEFAULT, 'senza casco: quello di serie');
    assert.deepStrictEqual(H.cleanHelmet('casco'), H.HELMET_DEFAULT);
    assert.strictEqual(H.HELMET_DEFAULT.base, null, 'di serie il colore di base è quello dei tasti');
    const ok = H.cleanHelmet({ base: '#27f4d2', c1: '#fff', c2: '#0A1F44', pattern: 'flames', number: 44, visor: 'iridium-gold', finish: 'matte' });
    assert.deepStrictEqual(ok, { base: '#27F4D2', c1: '#FFFFFF', c2: '#0A1F44', pattern: 'flames', number: 44, visor: 'iridium-gold', finish: 'matte' });
    const bad = H.cleanHelmet({ base: 'rosso', c1: 12, c2: null, pattern: 'laser', number: 120, visor: 'gold', finish: 'chrome', extra: 1 });
    assert.deepStrictEqual(bad, { ...H.HELMET_DEFAULT, base: null }, 'valori non validi: quelli di serie, niente chiavi in più: ' + JSON.stringify(bad));
    assert.strictEqual(H.cleanHelmet({ number: '7' }).number, 7, 'numero scritto come testo');
    assert.strictEqual(H.cleanHelmet({ number: 0 }).number, 0, 'lo 0 vale');
    assert.strictEqual(H.cleanHelmet({ number: 99 }).number, 99);
    for (const n of [-1, 100, 7.5, 'sette', NaN]) assert.strictEqual(H.cleanHelmet({ number: n }).number, null, 'numero ' + n);
  },
  'disegni, visiere e finiture con il nome in italiano'() {
    assert.deepStrictEqual(H.HELMET_PATTERNS.map(x => x.id), ['stripes', 'flames', 'checks', 'stars', 'bolt', 'pinstripes', 'dots', 'none']);
    assert.deepStrictEqual(H.HELMET_PATTERNS.map(x => x.name), ['Strisce', 'Fiamme', 'Scacchi', 'Stelle', 'Fulmine', 'Righe sottili', 'Pois', 'Nessuno']);
    assert.deepStrictEqual(H.HELMET_VISORS.map(x => x.id), ['clear', 'smoke', 'iridium-blue', 'iridium-gold', 'mirror-red']);
    assert.deepStrictEqual(H.HELMET_VISORS.map(x => x.name), ['Chiara', 'Fumé', 'Iridio blu', 'Iridio oro', 'Specchio rosso']);
    assert.deepStrictEqual(H.HELMET_FINISHES.map(x => x.id), ['gloss', 'matte', 'airbrush']);
    assert.deepStrictEqual(H.HELMET_FINISHES.map(x => x.name), ['Lucida', 'Opaca', 'Aerografo']);
  },
};

let pass = 0, fail = 0;
const filter = process.argv[2] ? new RegExp(process.argv[2], 'i') : null;
for (const [name, fn] of Object.entries(tests)) {
  if (filter && !filter.test(name)) continue;
  try { fn(); pass++; console.log('PASS  ' + name); }
  catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + String(e.message).split('\n')[0].slice(0, 300)); }
}
console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
