// Prove dei file dell'app che non sono codice: icone di Android (Task 21) e caratteri (Task 22).
// Le immagini si leggono con Python e Pillow (qui ci sono; su Codemagic le prove non girano).
// Uso: node test/unit/assets.test.js [filtro]
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const ICONS = path.join(ROOT, 'resources', 'icons');
let pass = 0, fail = 0;
const tests = [];
const t = (name, fn) => tests.push([name, fn]);

// Misura, modo e alcuni punti di un'immagine: { w, h, mode, px: [[r,g,b,a], ...] } per i punti (x, y in 0..1).
// Un punto può essere anche un riquadro [x0, y0, x1, y1]: allora si prende il pixel più rosso del riquadro.
function probe(file, points) {
  const py = `import sys, json
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGBA')
W, H = im.size
def at(x, y): return list(im.getpixel((min(W - 1, int(x * W)), min(H - 1, int(y * H)))))
def reddest(x0, y0, x1, y1):
    best = None
    for yy in range(int(y0 * H), max(int(y0 * H) + 1, int(y1 * H))):
        for xx in range(int(x0 * W), max(int(x0 * W) + 1, int(x1 * W))):
            p = list(im.getpixel((min(W - 1, xx), min(H - 1, yy))))
            if best is None or p[0] - max(p[1], p[2]) > best[0] - max(best[1], best[2]): best = p
    return best
pts = json.loads(sys.argv[2])
print(json.dumps({'w': W, 'h': H, 'mode': Image.open(sys.argv[1]).mode, 'px': [at(*q) if len(q) == 2 else reddest(*q) for q in pts]}))`;
  return JSON.parse(execFileSync('python3', ['-I', '-c', py, file, JSON.stringify(points)]).toString());
}
const isRed = ([r, g, b]) => r > 150 && g < 80 && b < 80;
const isBlack = ([r, g, b, a]) => a === 255 && r < 12 && g < 12 && b < 12;

const DENS = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const LED = [0.481, 0.577, 0.523, 0.657];   // riquadro della griglia di LED rossi al centro della monoposto (immagine intera)

t('icone di Android: tutte le misure (48-192 px e 108-432 px per l\'icona adattiva)', () => {
  for (const [d, k] of Object.entries(DENS)) {
    for (const f of ['ic_launcher.png', 'ic_launcher_round.png']) {
      const r = probe(path.join(ICONS, 'mipmap-' + d, f), []);
      assert.deepStrictEqual([r.w, r.h], [48 * k, 48 * k], `${d}/${f}`);
    }
    const fg = probe(path.join(ICONS, 'mipmap-' + d, 'ic_launcher_foreground.png'), []);
    assert.deepStrictEqual([fg.w, fg.h], [108 * k, 108 * k], `${d}/ic_launcher_foreground.png`);
  }
  const ps = probe(path.join(ICONS, 'playstore-icon-512.png'), []);
  assert.deepStrictEqual([ps.w, ps.h], [512, 512]);
});

t('icona nuova (logo BT con la monoposto): angoli neri e i LED rossi al centro', () => {
  const big = probe(path.join(ICONS, 'mipmap-xxxhdpi', 'ic_launcher.png'), [[0.02, 0.02], [0.98, 0.02], LED]);
  assert.ok(isBlack(big.px[0]) && isBlack(big.px[1]), 'angoli non neri: ' + JSON.stringify(big.px.slice(0, 2)));
  assert.ok(isRed(big.px[2]), 'al centro non ci sono i LED rossi: ' + JSON.stringify(big.px[2]));
  const store = probe(path.join(ICONS, 'playstore-icon-512.png'), [LED]);
  assert.ok(isRed(store.px[0]), 'icona del Play Store senza i LED rossi');
});

t('icona adattiva: il disegno sta nei 72 dp centrali (la maschera del telefono non lo taglia), intorno è trasparente', () => {
  // L'immagine occupa 72/108 del livello, centrata: i LED stanno a 18/108 + LED * 72/108.
  const inner = v => 18 / 108 + v * 72 / 108;
  const fg = probe(path.join(ICONS, 'mipmap-xxxhdpi', 'ic_launcher_foreground.png'), [[0.03, 0.03], [0.5, 0.06], LED.map(inner)]);
  assert.strictEqual(fg.px[0][3], 0, 'angolo dell\'icona adattiva non trasparente');
  assert.strictEqual(fg.px[1][3], 0, 'sopra il disegno deve esserci lo spazio per la maschera');
  assert.ok(isRed(fg.px[2]), 'i LED non sono dove devono essere: ' + JSON.stringify(fg.px[2]));
  const round = probe(path.join(ICONS, 'mipmap-xxxhdpi', 'ic_launcher_round.png'), [[0.02, 0.02], [0.5, 0.5]]);
  assert.strictEqual(round.px[0][3], 0, 'icona rotonda: l\'angolo deve essere trasparente');
  assert.strictEqual(round.px[1][3], 255, 'icona rotonda: il centro deve essere pieno');
});

t('sfondo dell\'icona adattiva nero (scripts/prepare_android.py)', () => {
  const py = fs.readFileSync(path.join(ROOT, 'scripts', 'prepare_android.py'), 'utf8');
  assert.ok(/<color name="ic_launcher_background">#000000<\/color>/.test(py), 'lo sfondo dell\'icona adattiva deve essere #000000');
});

t('nome dell\'app "Sector 4": capacitor.config.json (nome sul telefono) e public/index.html', () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'capacitor.config.json'), 'utf8'));
  assert.strictEqual(cfg.appName, 'Sector 4');
  assert.strictEqual(cfg.appId, 'it.btapp.app', 'l\'appId non si cambia');
  const html = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
  assert.ok(/<title>Sector 4<\/title>/.test(html), 'titolo della pagina');
  assert.ok(!/B&amp;T App|B&T App/.test(html), 'in public/index.html c\'è ancora "B&T App"');
});

t('caratteri nell\'app: niente Google Fonts, @font-face per Titillium Web e Work Sans con i file in src/fonts e la licenza OFL', () => {
  const html = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
  assert.ok(!/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(html), 'public/index.html chiede ancora i caratteri a Google (l\'indirizzo IP finisce a Google)');
  const css = fs.readFileSync(path.join(ROOT, 'src', 'App.css'), 'utf8');
  const faces = [...css.matchAll(/@font-face\s*{([^}]*)}/g)].map(m => m[1]);
  const fam = f => faces.filter(b => b.includes(`font-family: "${f}"`));
  assert.ok(fam('Titillium Web').length >= 4 && fam('Work Sans').length >= 1, 'mancano le @font-face: ' + faces.length);
  for (const b of faces) {
    const url = (b.match(/url\("\.\/fonts\/([^"]+)"\)/) || [])[1];
    assert.ok(url && fs.existsSync(path.join(ROOT, 'src', 'fonts', url)), 'file del carattere mancante: ' + url);
    assert.ok(/font-display:\s*swap/.test(b), 'senza font-display: swap');
  }
  for (const f of ['OFL-TitilliumWeb.txt', 'OFL-WorkSans.txt']) assert.ok(fs.existsSync(path.join(ROOT, 'src', 'fonts', f)), 'manca la licenza ' + f);
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
