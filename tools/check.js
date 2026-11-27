// Controllo della sintassi (JSX compreso) con TypeScript: node tools/check.js src/App.jsx
const ts = require('/opt/node-tools/node_modules/typescript');
const fs = require('fs');
const file = process.argv[2];
if (!file) { console.error('uso: node tools/check.js <file>'); process.exit(2); }
const code = fs.readFileSync(file, 'utf8');
const kind = /\.(jsx|tsx)$/.test(file) ? ts.ScriptKind.JSX : ts.ScriptKind.JS;
const sf = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, kind);
const d = sf.parseDiagnostics;
console.log(d.length ? `ERRORS: ${d.length}` : 'SYNTAX OK');
d.slice(0, 8).forEach(x => {
  const { line, character } = sf.getLineAndCharacterOfPosition(x.start);
  const l = code.split('\n')[line];
  console.log(`L${line + 1}:${character} ${ts.flattenDiagnosticMessageText(x.messageText, ' ')}\n   …${l.slice(Math.max(0, character - 120), character + 80)}`);
});
process.exit(d.length ? 1 : 0);
