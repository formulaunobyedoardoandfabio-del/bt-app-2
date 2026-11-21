// Generatore di QR senza librerie (21/11, per il collegamento PC ↔ telefono): le matrici devono essere identiche,
// punto per punto, a quelle della libreria Python "qrcode" 8.2 (test/fixtures/qr-python.json, da
// tools/qr-fixture.py): modalità byte, correzione M e L, versione automatica, ogni maschera e quella scelta da sola.
// Uso: node test/unit/qr.test.js
const assert = require('assert');
const QR = require('../../src/logic/qr');
const FX = require('../fixtures/qr-python.json');
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('PASS  ' + name); } catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); } };
const rows = m => m.map(r => r.map(x => (x ? '1' : '0')).join(''));
const diff = (a, b) => { for (let r = 0; r < b.length; r++) for (let c = 0; c < b.length; c++) if ((a[r] || '')[c] !== b[r][c]) return `primo punto diverso: riga ${r}, colonna ${c}`; return ''; };

t('versione e dimensione come la libreria Python', () => {
  FX.filter(f => f.mask === 0).forEach(f => {
    const q = QR.encode(f.text, { ecc: f.ecc, mask: 0 });
    assert.strictEqual(q.version, f.version, `${f.text} ${f.ecc}`);
    assert.strictEqual(q.size, f.rows.length);
  });
});
t('ogni maschera 0-7: matrice identica punto per punto', () => {
  FX.filter(f => f.mask !== null).forEach(f => {
    const got = rows(QR.encode(f.text, { ecc: f.ecc, mask: f.mask }).modules);
    const d = diff(got, f.rows);
    assert.ok(!d, `${f.text} ${f.ecc} maschera ${f.mask}: ${d}`);
  });
});
t('maschera scelta da sola: la stessa della libreria Python', () => {
  FX.filter(f => f.mask === null).forEach(f => {
    const q = QR.encode(f.text, { ecc: f.ecc });
    const d = diff(rows(q.modules), f.rows);
    assert.ok(!d, `${f.text} ${f.ecc} (maschera scelta ${q.mask}): ${d}`);
  });
});
t('disegno: un solo tracciato SVG coi quadratini scuri, con il bordo bianco di 4', () => {
  const q = QR.encode('https://bt-app-2.vercel.app/?collega=123456');
  const s = QR.svgPath(q);
  assert.strictEqual(s.size, q.size + 8);
  const dark = q.modules.flat().filter(Boolean).length;
  assert.strictEqual((s.d.match(/M/g) || []).length, dark);
  assert.ok(/^M4 4h1v1h-1z/.test(s.d), 'il primo quadratino scuro è l\'angolo in alto a sinistra, dopo il bordo');
});
t('testo troppo lungo per la versione 10: errore chiaro', () => {
  assert.throws(() => QR.encode('x'.repeat(400)), /troppo lungo/);
});

console.log(`\n${pass} passate, ${fail} fallite`);
process.exit(fail ? 1 : 0);
