// Prove dei colori dell'app (Tappa 3, G01-G02): contrasto come lo calcola il WCAG e i due toni che l'app ricava dal
// colore scelto da chi la usa (tasti: testo bianco sopra almeno 3:1; testi e linee sul nero almeno 4,5:1). Gira in Node.
// Uso: node test/unit/colors.test.js [filtro]
const assert = require('assert');
const path = require('path');
const K = require(path.join(__dirname, '..', '..', 'src', 'logic', 'colors.js'));

const HEX = /^#[0-9A-F]{6}$/;
const rgbOf = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const near = (got, want, what) => assert(Math.abs(got - want) < 0.01, `${what}: ${got} invece di ${want}`);

const tests = {
  'contrasto: bianco su nero 21, nero su nero 1'() {
    near(K.contrast('#FFFFFF', '#000000'), 21, 'bianco su nero');
    near(K.contrast('#000000', '#FFFFFF'), 21, 'nero su bianco (l\'ordine non conta)');
    near(K.contrast('#000000', '#000000'), 1, 'nero su nero');
    near(K.contrast('#fff', '#000'), 21, 'colori scritti corti e minuscoli');
    near(K.contrast('#777777', '#FFFFFF'), 4.48, 'grigio #777777 sul bianco (valore noto)');
  },
  'giallo #FFFF00: tasto scurito con almeno 3:1 col bianco, testo uguale (già leggibile)'() {
    const t = K.accentTones('#FFFF00');
    assert(HEX.test(t.accent) && HEX.test(t.ink), 'toni non validi: ' + JSON.stringify(t));
    assert(K.contrast(t.accent, '#FFFFFF') >= 3, `tasto ${t.accent}: contrasto col bianco ${K.contrast(t.accent, '#FFFFFF')}`);
    assert(K.contrast(t.accent, '#FFFFFF') < 3.3, 'tasto scurito più del necessario: ' + t.accent);
    const [r, g, b] = rgbOf(t.accent);
    assert(r === g && b === 0, 'il tasto non è più giallo: ' + t.accent);
    assert.strictEqual(t.ink, '#FFFF00', 'il giallo sul nero si legge già');
    assert.strictEqual(t.on, '#FFFFFF');
  },
  'blu notte #0A1F44: tasto uguale, testo schiarito con almeno 4,5:1 sul nero'() {
    const t = K.accentTones('#0a1f44');
    assert.strictEqual(t.accent, '#0A1F44', 'col blu notte il testo bianco si legge già');
    assert(t.ink !== '#0A1F44' && K.contrast(t.ink, '#000000') >= 4.5, `testo ${t.ink}: contrasto sul nero ${K.contrast(t.ink, '#000000')}`);
    assert(K.contrast(t.ink, '#000000') < 5, 'testo schiarito più del necessario: ' + t.ink);
    const [r, g, b] = rgbOf(t.ink);
    assert(b > g && g > r, 'il testo non è più blu: ' + t.ink);
  },
  'bianco e nero estremi: toni validi'() {
    for (const c of ['#FFFFFF', '#000000']) {
      const t = K.accentTones(c);
      assert(HEX.test(t.accent) && HEX.test(t.ink) && t.on === '#FFFFFF', c + ': ' + JSON.stringify(t));
      assert(K.contrast(t.accent, '#FFFFFF') >= 3, `${c}: tasto ${t.accent} col bianco ${K.contrast(t.accent, '#FFFFFF')}`);
      assert(K.contrast(t.ink, '#000000') >= 4.5, `${c}: testo ${t.ink} sul nero ${K.contrast(t.ink, '#000000')}`);
    }
    assert.strictEqual(K.accentTones('#FFFFFF').ink, '#FFFFFF');
    assert.strictEqual(K.accentTones('#000000').accent, '#000000');
    assert.deepStrictEqual(K.accentTones('rosso'), K.accentTones(K.LED_RED), 'un colore non valido vale il rosso LED');
    assert.deepStrictEqual(K.accentTones(null), K.accentTones(K.LED_RED), 'nessun colore vale il rosso LED');
  },
  'rosso LED di serie e i 12 colori: validi, diversi, col nome; rgba'() {
    assert.strictEqual(K.LED_RED, '#FF1801');
    assert.deepStrictEqual(K.accentTones(K.LED_RED), { accent: '#FF1801', ink: '#FF1801', on: '#FFFFFF' }, 'il rosso LED va bene sia per i tasti sia per i testi');
    assert(Array.isArray(K.PALETTE) && K.PALETTE.length === 12, 'colori: ' + JSON.stringify(K.PALETTE));
    assert(K.PALETTE.every(c => HEX.test(c.color) && typeof c.name === 'string' && c.name.length > 1), 'colori senza nome o non validi: ' + JSON.stringify(K.PALETTE));
    assert.strictEqual(new Set(K.PALETTE.map(c => c.color)).size, 12, 'colori ripetuti');
    assert.strictEqual(new Set(K.PALETTE.map(c => c.name)).size, 12, 'nomi ripetuti');
    assert.strictEqual(K.PALETTE[0].color, K.LED_RED, 'il primo è il rosso LED di serie');
    assert.strictEqual(K.rgba('#FF1801', 0.5), 'rgba(255,24,1,0.5)');
    assert.strictEqual(K.rgba('#0a1f44', 0.12), 'rgba(10,31,68,0.12)');
    assert.strictEqual(K.shade('#FF1801', 0.5), '#800C01');
    assert.strictEqual(K.shade('#FF1801', 1), '#FF1801');
    assert.strictEqual(K.normHex('#abc'), '#AABBCC');
    assert.strictEqual(K.normHex('ff0000'), null, 'senza # non è un colore');
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
