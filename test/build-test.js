// Costruisce la pagina delle prove nel browser (test/e2e/test.html + test/e2e/app.js) da src/, senza react-scripts
// (qui npm install non funziona; il build vero lo fa Codemagic).
// Ogni file di src/ diventa un modulo CommonJS con la trasformazione di TypeScript (JSX → React.createElement,
// import/export → require/exports con le stesse regole di webpack: il default di un modulo CommonJS è module.exports).
// "react" e "react-dom/client" vengono da test/vendor/react-real.js; i .css finiscono in un <style> della pagina.
const ts = require('/opt/node-tools/node_modules/typescript');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const OUT = path.join(__dirname, 'e2e');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

const files = walk(SRC).filter(f => /\.(js|jsx|json|css)$/.test(f) && path.basename(f) !== 'index.js');
const modules = [];
let css = '';
for (const file of files) {
  const rel = './' + path.relative(SRC, file).split(path.sep).join('/');
  const id = rel.replace(/\.(jsx?|json|css)$/, '');
  const text = fs.readFileSync(file, 'utf8');
  if (file.endsWith('.css')) { css += `\n/* ${rel} */\n${text}`; modules.push([id, 'module.exports = {};']); continue; }
  if (file.endsWith('.json')) { modules.push([id, `module.exports = ${text.trim()};`]); continue; }
  const out = ts.transpileModule(text, {
    fileName: rel,
    compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2019, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
    reportDiagnostics: true,
  });
  if (out.diagnostics && out.diagnostics.length) {
    out.diagnostics.slice(0, 5).forEach(d => console.error(rel + ': ' + ts.flattenDiagnosticMessageText(d.messageText, ' ')));
    process.exit(1);
  }
  modules.push([id, out.outputText]);
}

const runtime = `(function () {
  var defs = {}, cache = {};
${modules.map(([id, code]) => `  defs[${JSON.stringify(id)}] = function (module, exports, require) {\n${code}\n};`).join('\n')}
  var external = {
    'react': function () { return window.React; },
    'react-dom': function () { return window.ReactDOM; },
    'react-dom/client': function () { return window.ReactDOM; }
  };
  function resolve(from, spec) {
    if (spec.charAt(0) !== '.') return spec;
    var parts = from.split('/').slice(0, -1).concat(spec.split('/')), out = [];
    parts.forEach(function (p) { if (p === '..') out.pop(); else if (p !== '.' && p !== '') out.push(p); });
    return './' + out.join('/').replace(/\\.(jsx?|json|css)$/, '');
  }
  function load(id) {
    if (external[id]) return external[id]();
    if (!defs[id] && defs[id + '/index']) id = id + '/index';
    if (!defs[id]) throw new Error('modulo non trovato nelle prove: ' + id);
    if (cache[id]) return cache[id].exports;
    var module = cache[id] = { exports: {} };
    defs[id](module, module.exports, function (spec) { return load(resolve(id, spec)); });
    return module.exports;
  }
  window.__req = function (spec) { return load(resolve('./index', spec)); };
  var App = window.__req('./App');
  App = App && App.default ? App.default : App;
  window.ReactDOM.createRoot(document.getElementById('root')).render(window.React.createElement(App));
})();
`;

const base = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8').match(/<style>([\s\S]*?)<\/style>/);
const html = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>B&amp;T App (prove)</title>
<style>${base ? base[1] : ''}${css}</style>
</head>
<body>
<div id="root"></div>
<script charset="utf-8" src="../fake/fake-firebase.js"></script>
<script charset="utf-8" src="../vendor/react-real.js"></script>
<script charset="utf-8" src="app.js"></script>
</body>
</html>
`;

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'app.js'), runtime);
fs.writeFileSync(path.join(OUT, 'test.html'), html);
// Pagina con i video dello splash (public/splash): test.html non li trova e usa lo splash fisso (le prove restano
// veloci); video/index.html li ha accanto, come l'APK, e serve alle prove dei video.
const VIDEO = path.join(OUT, 'video');
fs.mkdirSync(path.join(VIDEO, 'splash'), { recursive: true });
for (const f of fs.readdirSync(path.join(ROOT, 'public', 'splash'))) fs.copyFileSync(path.join(ROOT, 'public', 'splash', f), path.join(VIDEO, 'splash', f));
fs.writeFileSync(path.join(VIDEO, 'index.html'), html.replace('src="../fake/', 'src="../../fake/').replace('src="../vendor/', 'src="../../vendor/').replace('src="app.js"', 'src="../app.js"'));
console.log(`pagina delle prove: ${modules.length} moduli, ${Math.round(runtime.length / 1024)} KB`);
