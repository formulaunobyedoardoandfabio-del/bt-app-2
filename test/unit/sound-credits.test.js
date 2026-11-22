// 22/11 (Edoardo: "scriviamo comunque i CC-BY"): i crediti dei due suoni stanno in Profilo → Info su B&T.
// Uso: node test/unit/sound-credits.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '../../src/App.jsx'), 'utf8');
const about = (src.match(/const ABOUT_TEXT = [^\n]*/) || [''])[0];
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('PASS  ' + name); } catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); } };
t('crediti dei suoni: autore, titolo, Freesound e licenza CC BY, senza lineette lunghe', () => {
  for (const s of ['Freesound.org', 'licenza CC BY', 'air impact wrench', 'sevenbsb', 'formula 1 whoosh zip flyby 6', 'Geoff-Bremner-Audio']) assert(about.includes(s), 'manca ' + s);
  assert(!about.includes('—'));
});
console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
