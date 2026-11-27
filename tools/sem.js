// Controllo dei nomi: variabili non definite e dichiarazioni doppie. node tools/sem.js src/App.jsx
const ts = require('/opt/node-tools/node_modules/typescript');
const file = process.argv[2];
if (!file) { console.error('uso: node tools/sem.js <file>'); process.exit(2); }
const p = ts.createProgram([file], { allowJs: true, checkJs: true, noEmit: true, jsx: ts.JsxEmit.Preserve, noResolve: true, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'], types: [] });
const CODES = new Set([2304, 2448, 2451, 2552]);   // nome non trovato, usato prima della dichiarazione, dichiarato due volte, refuso
const ds = ts.getPreEmitDiagnostics(p).filter(d => CODES.has(d.code) && d.file && d.file.fileName.endsWith(file.replace(/^\.\//, '')));
const seen = new Set();
ds.forEach(d => {
  const m = ts.flattenDiagnosticMessageText(d.messageText, ' ');
  if (seen.has(m)) return; seen.add(m);
  const { line } = d.file.getLineAndCharacterOfPosition(d.start);
  console.log(`L${line + 1} [${d.code}] ${m}`);
});
console.log('total unique', seen.size);
process.exit(seen.size ? 1 : 0);
