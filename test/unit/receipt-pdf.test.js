// Ricevuta del Premium in PDF (8/11, design "9 Ricevuta"): un PDF vero e leggibile, coi dati veri dell'acquisto di
// Google Play. Uso: node test/unit/receipt-pdf.test.js
const assert = require('assert');
const R = require('../../src/premium/receipt-pdf');
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('PASS  ' + name); } catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); } };
const str = bytes => Buffer.from(bytes).toString('latin1');

const REC = { orderId: 'GPA.3312-4455-6677-88990', at: Date.parse('2026-11-08T10:30:00Z'), plan: 'season', price: '5,99 €' };

t('righe della ricevuta: piano, prezzo, Google Play, data italiana, numero d\'ordine, avvertenza', () => {
  const L = R.receiptLines(REC);
  const all = L.map(l => l.join('  ')).join('\n');
  assert.ok(/Premium Stagione/.test(all) && /5,99 €/.test(all) && /Google Play/.test(all) && /8 novembre 2026/.test(all) && /GPA\.3312-4455-6677-88990/.test(all), all);
  assert.ok(/Non è un documento fiscale/.test(all));
  assert.ok(/Premium Mensile/.test(R.receiptLines({ ...REC, plan: 'month' }).map(l => l.join(' ')).join(' ')));
});

t('PDF valido: intestazione, xref con gli scarti giusti, euro e accenti in WinAnsi', () => {
  const bytes = R.receiptPdf(REC);
  const s = str(bytes);
  assert.ok(s.startsWith('%PDF-1.4'), 'intestazione');
  assert.ok(/%%EOF\s*$/.test(s), 'fine');
  const xref = Number(/startxref\s+(\d+)/.exec(s)[1]);
  assert.strictEqual(s.slice(xref, xref + 4), 'xref', 'startxref punta alla tabella');
  const offs = [...s.slice(xref).matchAll(/(\d{10}) 00000 n/g)].map(m => Number(m[1]));
  offs.forEach((o, i) => assert.ok(s.slice(o).startsWith(`${i + 1} 0 obj`), `oggetto ${i + 1} allo scarto ${o}`));
  assert.ok(s.includes('5,99 \x80'), 'euro come 0x80');
  assert.ok(s.includes('\xe8 un documento'), 'è come 0xE8');
  assert.ok(s.includes('/BaseFont /Helvetica') && s.includes('/Encoding /WinAnsiEncoding'));
});

t('parentesi e barre nel testo escapate; base64 per salvarlo sul telefono', () => {
  const s = str(R.receiptPdf({ ...REC, orderId: 'A(1)\\B' }));
  assert.ok(s.includes('A\\(1\\)\\\\B'), 'escape');
  const b64 = R.toBase64(R.receiptPdf(REC));
  assert.ok(/^[A-Za-z0-9+/]+=*$/.test(b64) && Buffer.from(b64, 'base64').toString('latin1').startsWith('%PDF'), 'base64');
});

t('ricevuta salvata nell\'account: si tiene solo se è vera (numero d\'ordine, data), campi puliti', () => {
  assert.deepStrictEqual(R.cleanReceipt(REC), REC);
  assert.strictEqual(R.cleanReceipt(null), null);
  assert.strictEqual(R.cleanReceipt({ ...REC, orderId: '' }), null, 'senza numero d\'ordine niente ricevuta');
  assert.strictEqual(R.cleanReceipt({ ...REC, at: 'ieri' }), null, 'senza data niente ricevuta');
  const odd = R.cleanReceipt({ ...REC, plan: 'boh', price: 5, extra: 'x', orderId: 'A'.repeat(200) });
  assert.strictEqual(odd.plan, 'season');
  assert.strictEqual(odd.price, '');
  assert.strictEqual(odd.orderId.length, 80);
  assert.ok(!('extra' in odd));
});

// 8/11 (Edoardo: "il codice a barre serve come prova vera e univoca che l'utente è Premium"): codice a barre Code 128
// vero col numero d'ordine di Google Play (lo si cerca nella Play Console). La lettura vera la prova tools/scan-receipt.py.
t('codice a barre: Code 128 (set B) del numero d\'ordine, con inizio, controllo e fine giusti', () => {
  const m = R.code128('GPA.1');
  assert.ok(/^[01]+$/.test(m), m);
  assert.strictEqual(m.length, 11 * 5 + 35, 'lunghezza: inizio + 5 caratteri + controllo + fine');
  assert.ok(m.startsWith('11010010000'), 'inizio B');
  assert.ok(m.endsWith('1100011101011'), 'fine');
  // controllo: (104 + somma posizione × valore) mod 103; G=39 P=48 A=33 .=14 1=17 → 104+39+96+99+56+85 = 479 → 67
  assert.strictEqual(m.slice(11 * 6, 11 * 7), R.code128Pattern(67), 'cifra di controllo');
  assert.strictEqual(R.code128(''), '');
  const b = R.bars(m);
  assert.ok(b.length > 10 && b.every(([s, n]) => m.slice(s, s + n) === '1'.repeat(n) && m[s + n] !== '1'), 'barre giuste');
});

t('ricevuta PDF: il codice a barre è disegnato (barre nere) col numero sotto, e l\'account se c\'è', () => {
  const pdf = Buffer.from(R.receiptPdf({ ...REC, account: 'a@b.it' })).toString('latin1');
  const nBars = R.bars(R.code128(REC.orderId)).length;
  assert.strictEqual((pdf.match(/ re\n/g) || []).length, nBars, 'una barra per ogni rettangolo');
  assert.ok(pdf.includes('(a@b.it)'), 'account nella ricevuta');
});

console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
