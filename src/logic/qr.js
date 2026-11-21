// Generatore di QR senza librerie (21/11, per il collegamento PC ↔ telefono: il PC mostra il QR del link
// https://bt-app-2.vercel.app/?collega=<cifre>). Modalità byte (UTF-8), correzione L o M, versioni 1-10, maschera
// scelta col punteggio delle penalità come la libreria Python "qrcode" (che la valuta con le informazioni di formato
// spente). Le matrici sono identiche punto per punto a quelle della libreria Python (test/unit/qr.test.js).

// Campo di Galois GF(256) col polinomio 0x11D (Reed-Solomon dei QR).
const EXP = new Array(512), LOG = new Array(256);
(() => { let x = 1; for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11d; } for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]; })();
const mul = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);
function genPoly(n) {
  let p = [1];
  for (let i = 0; i < n; i++) {
    const q = new Array(p.length + 1).fill(0);
    p.forEach((c, j) => { q[j] ^= c; q[j + 1] ^= mul(c, EXP[i]); });
    p = q;
  }
  return p;
}
function ecBytes(data, n) {
  const g = genPoly(n), r = new Array(n).fill(0);
  data.forEach(b => {
    const f = b ^ r[0];
    r.shift(); r.push(0);
    if (f) for (let j = 0; j < n; j++) r[j] ^= mul(g[j + 1], f);
  });
  return r;
}

// Blocchi per versione: [correzione per blocco, [blocchi, dati per blocco], ...]. Solo L e M, versioni 1-10.
const BLOCKS = {
  L: [null, [7, [1, 19]], [10, [1, 34]], [15, [1, 55]], [20, [1, 80]], [26, [1, 108]], [18, [2, 68]], [20, [2, 78]], [24, [2, 97]], [30, [2, 116]], [18, [2, 68], [2, 69]]],
  M: [null, [10, [1, 16]], [16, [1, 28]], [26, [1, 44]], [18, [2, 32]], [24, [2, 43]], [16, [4, 27]], [18, [4, 31]], [22, [2, 38], [2, 39]], [22, [3, 36], [2, 37]], [26, [4, 43], [1, 44]]],
};
const ALIGN = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];
const ECC_BITS = { L: 1, M: 0 };   // come la libreria Python (L=1, M=0, Q=3, H=2)
const blocksOf = (ecc, v) => { const [ec, ...groups] = BLOCKS[ecc][v]; const out = []; groups.forEach(([n, dc]) => { for (let i = 0; i < n; i++) out.push({ dc, ec }); }); return out; };
const dataCap = (ecc, v) => blocksOf(ecc, v).reduce((s, b) => s + b.dc, 0);
const countBits = v => (v < 10 ? 8 : 16);

const digits = d => { let n = 0; while (d) { n++; d >>>= 1; } return n; };
function bch(data, shift, gen) {
  let d = data << shift;
  while (digits(d) - digits(gen) >= 0) d ^= gen << (digits(d) - digits(gen));
  return (data << shift) | d;
}
const typeInfo = (ecc, mask) => bch((ECC_BITS[ecc] << 3) | mask, 10, 0x537) ^ 0x5412;
const typeNumber = v => bch(v, 12, 0x1f25);

const MASKS = [
  (i, j) => (i + j) % 2 === 0,
  i => i % 2 === 0,
  (i, j) => j % 3 === 0,
  (i, j) => (i + j) % 3 === 0,
  (i, j) => (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0,
  (i, j) => ((i * j) % 2) + ((i * j) % 3) === 0,
  (i, j) => (((i * j) % 2) + ((i * j) % 3)) % 2 === 0,
  (i, j) => (((i * j) % 3) + ((i + j) % 2)) % 2 === 0,
];

function utf8(text) {
  if (typeof TextEncoder !== "undefined") return Array.from(new TextEncoder().encode(text));
  return Array.from(unescape(encodeURIComponent(text)), c => c.charCodeAt(0));
}

// Parole di codice: modo byte, lunghezza, dati, fine, riempimento; poi correzione per blocco e intreccio.
function codewords(bytes, ecc, v) {
  const bits = [];
  const put = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  put(4, 4); put(bytes.length, countBits(v)); bytes.forEach(b => put(b, 8));
  const limit = dataCap(ecc, v) * 8;
  for (let i = 0; i < 4 && bits.length < limit; i++) bits.push(0);
  while (bits.length % 8) bits.push(0);
  for (let i = 0; bits.length < limit; i++) put(i % 2 ? 0x11 : 0xec, 8);
  const all = [];
  for (let i = 0; i < bits.length; i += 8) all.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  const blocks = blocksOf(ecc, v);
  let off = 0;
  const dcs = blocks.map(b => { const d = all.slice(off, off + b.dc); off += b.dc; return d; });
  const ecs = blocks.map((b, k) => ecBytes(dcs[k], b.ec));
  const out = [];
  const maxDc = Math.max(...dcs.map(d => d.length)), maxEc = Math.max(...ecs.map(e => e.length));
  for (let i = 0; i < maxDc; i++) dcs.forEach(d => { if (i < d.length) out.push(d[i]); });
  for (let i = 0; i < maxEc; i++) ecs.forEach(e => { if (i < e.length) out.push(e[i]); });
  return out;
}

// Matrice come la libreria Python: test = true lascia spente le informazioni di formato e di versione (per scegliere
// la maschera).
function build(data, ecc, v, mask, test) {
  const n = 17 + 4 * v, m = Array.from({ length: n }, () => new Array(n).fill(null));
  const probe = (row, col) => {
    for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++) {
      if (row + r < 0 || row + r >= n || col + c < 0 || col + c >= n) continue;
      m[row + r][col + c] = (r >= 0 && r <= 6 && (c === 0 || c === 6)) || (c >= 0 && c <= 6 && (r === 0 || r === 6)) || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
    }
  };
  probe(0, 0); probe(n - 7, 0); probe(0, n - 7);
  const pos = ALIGN[v];
  pos.forEach(i => pos.forEach(j => {
    if (m[i][j] !== null) return;
    for (let r = -2; r <= 2; r++) for (let c = -2; c <= 2; c++) m[i + r][j + c] = r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0);
  }));
  for (let r = 8; r < n - 8; r++) if (m[r][6] === null) m[r][6] = r % 2 === 0;
  for (let c = 8; c < n - 8; c++) if (m[6][c] === null) m[6][c] = c % 2 === 0;
  const bits = typeInfo(ecc, mask);
  for (let i = 0; i < 15; i++) {
    const on = !test && ((bits >> i) & 1) === 1;
    if (i < 6) m[i][8] = on; else if (i < 8) m[i + 1][8] = on; else m[n - 15 + i][8] = on;
  }
  for (let i = 0; i < 15; i++) {
    const on = !test && ((bits >> i) & 1) === 1;
    if (i < 8) m[8][n - i - 1] = on; else if (i < 9) m[8][15 - i] = on; else m[8][14 - i] = on;
  }
  m[n - 8][8] = !test;
  if (v >= 7) {
    const vb = typeNumber(v);
    for (let i = 0; i < 18; i++) { const on = !test && ((vb >> i) & 1) === 1; m[Math.floor(i / 3)][(i % 3) + n - 11] = on; }
    for (let i = 0; i < 18; i++) { const on = !test && ((vb >> i) & 1) === 1; m[(i % 3) + n - 11][Math.floor(i / 3)] = on; }
  }
  const fn = MASKS[mask];
  let inc = -1, row = n - 1, bit = 7, byte = 0;
  for (let c0 = n - 1; c0 > 0; c0 -= 2) {
    const col = c0 <= 6 ? c0 - 1 : c0;   // la colonna 6 (temporizzazione) si salta, senza toccare il passo del ciclo
    for (;;) {
      for (const c of [col, col - 1]) {
        if (m[row][c] !== null) continue;
        let dark = byte < data.length ? ((data[byte] >> bit) & 1) === 1 : false;
        if (fn(row, c)) dark = !dark;
        m[row][c] = dark;
        if (--bit === -1) { byte++; bit = 7; }
      }
      row += inc;
      if (row < 0 || row >= n) { row -= inc; inc = -inc; break; }
    }
  }
  return m;
}

// Penalità (le quattro regole del QR) come la libreria Python.
function penalty(m) {
  const n = m.length;
  let p = 0;
  const runs = get => { for (let a = 0; a < n; a++) { let prev = get(a, 0), len = 0; for (let b = 0; b < n; b++) { const x = get(a, b); if (x === prev) len++; else { if (len >= 5) p += len - 2; len = 1; prev = x; } } if (len >= 5) p += len - 2; } };
  runs((a, b) => m[a][b]); runs((a, b) => m[b][a]);
  for (let r = 0; r < n - 1; r++) for (let c = 0; c < n - 1; c++) { const x = m[r][c]; if (x === m[r][c + 1] && x === m[r + 1][c] && x === m[r + 1][c + 1]) p += 3; }
  const finder = get => {
    for (let a = 0; a < n; a++) for (let b = 0; b < n - 10; b++) {
      const g = k => get(a, b + k);
      if (!g(1) && g(4) && !g(5) && g(6) && !g(9) && ((g(0) && g(2) && g(3) && !g(7) && !g(8) && !g(10)) || (!g(0) && !g(2) && !g(3) && g(7) && g(8) && g(10)))) p += 40;
    }
  };
  finder((a, b) => m[a][b]); finder((a, b) => m[b][a]);
  const dark = m.reduce((s, r) => s + r.filter(Boolean).length, 0);
  p += Math.floor(Math.abs((dark / (n * n)) * 100 - 50) / 5) * 10;
  return p;
}

function encode(text, { ecc = "M", mask = null } = {}) {
  const bytes = utf8(String(text));
  let v = 1;
  while (v <= 10 && dataCap(ecc, v) * 8 < 4 + countBits(v) + 8 * bytes.length) v++;
  if (v > 10) throw new Error("testo troppo lungo per il QR");
  const data = codewords(bytes, ecc, v);
  let k = mask;
  if (k == null) {
    let best = Infinity;
    for (let i = 0; i < 8; i++) { const s = penalty(build(data, ecc, v, i, true)); if (s < best) { best = s; k = i; } }
  }
  const modules = build(data, ecc, v, k, false);
  return { version: v, size: modules.length, mask: k, ecc, modules };
}

// Un solo tracciato SVG coi quadratini scuri, con il bordo bianco (zona di quiete) di `border` quadratini.
function svgPath(q, border = 4) {
  let d = "";
  q.modules.forEach((row, r) => row.forEach((on, c) => { if (on) d += `M${c + border} ${r + border}h1v1h-1z`; }));
  return { d, size: q.size + 2 * border };
}

module.exports = { encode, svgPath };
