// Genera src/App.jsx e src/App.css dall'anteprima 2.0 (app-preview/index.html). Si usa una volta sola (Task 3):
// da qui in avanti src/App.jsx è il sorgente vero e si modifica a mano.
// Uso: node tools/port-2.0.js [percorso di app-preview/index.html]
const fs = require('fs');
const path = require('path');

const S20 = '/tmp/claude-0/-home-claude-bt-app-flutter/e699408e-d2d3-5a5c-a010-3d0f18a2e6cc/scratchpad';
const SRC_HTML = process.argv[2] || path.join(S20, 'app-preview', 'index.html');
const ROOT = path.join(__dirname, '..');

const html = fs.readFileSync(SRC_HTML, 'utf8');
const style = html.match(/<style>([\s\S]*?)<\/style>/);
const script = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/);
if (!style || !script) throw new Error('nella 2.0 non trovo <style> o lo script text/babel');
let js = script[1].replace(/^\n/, '');

// Sostituisce un pezzo che deve esserci una volta sola.
function rep(from, to) {
  const n = js.split(from).length - 1;
  if (n !== 1) throw new Error(`atteso una volta, trovato ${n} volte: ${from.slice(0, 80)}`);
  js = js.replace(from, () => to);
}

// Moduli e dati: al posto dei segnaposto riempiti da rtest/build.sh e delle variabili globali window.X.
const IMPORTS = [
  'import React, { useState, useRef, useEffect } from "react";',
  'import "./App.css";',
  'import CIRCUITS from "./data/circuits.json";',
  'import CIRCUIT_INFO from "./data/circuit-info.json";',
  'import BT_WATERMARK from "./data/watermark";',
  'import BtRealData from "./data/real-data";',
  'import BtWeekend from "./data/real-weekend";',
  'import LiveSim from "./logic/live-sim";',
  'import BtLogic from "./logic/bt-logic";',
  'import BtInsights from "./logic/bt-insights";',
  'import DnfArtData from "./logic/dnf-art";',
  'import BtGhost from "./logic/bt-ghost";',
  'import BtWk from "./logic/bt-weekend";',
].join('\n');

rep('const { useState, useRef, useEffect } = React;', IMPORTS);

// Foto e caschi ufficiali: vuoti. Li sostituisce il Task 14 (iniziali o foto caricate dall'Admin).
rep('const PHOTOS = {/*__PHOTOS__*/};', 'const PHOTOS = {};');
rep('const AVATARS = {/*__AVATARS__*/};', 'const AVATARS = {};');
rep('const HELMETS = {/*__HELMETS__*/};', 'const HELMETS = {};');

// Righe che diventano import (si tiene il commento, se c'era).
const dropLine = (re, what) => {
  const m = js.match(re);
  if (!m) throw new Error('non trovo ' + what);
  js = js.replace(re, (all, comment) => (comment ? '//' + comment : ''));
};
dropLine(/^const BT_WATERMARK = "\/\*__WATERMARK__\*\/";[ \t]*(?:\/\/(.*))?$/m, 'BT_WATERMARK');
dropLine(/^const CIRCUITS = \{\/\*__CIRCUITS__\*\/\};[ \t]*(?:\/\/(.*))?$/m, 'CIRCUITS');
dropLine(/^const CIRCUIT_INFO = \{\/\*__CIRCUIT_INFO__\*\/\};[ \t]*(?:\/\/(.*))?$/m, 'CIRCUIT_INFO');

for (const [mark, line] of [
  ['/*__LIVESIM__*/', 'const LiveSim = window.LiveSim;'],
  ['/*__BTLOGIC__*/', 'const BtLogic = window.BtLogic;'],
  ['/*__BTINSIGHTS__*/', 'const BtInsights = window.BtInsights;'],
  ['/*__DNFART__*/', 'const DnfArtData = window.BtDnfArt;'],
  ['/*__BTGHOST__*/', 'const BtGhost = window.BtGhost;'],
  ['/*__REALDATA__*/', 'const BtRealData = window.BtRealData;'],
  ['/*__BTWEEKEND__*/', 'const BtWk = window.BtWeekendLogic;'],
  ['/*__WEEKEND__*/', 'const BtWeekend = window.BtWeekend;'],
]) {
  rep(mark + '\n', '');
  rep(line + '\n', '');
}

// L'app la monta src/index.js.
rep('const root = ReactDOM.createRoot(document.getElementById("root"));\nroot.render(<App />);\n', 'export default App;\n');

const left = js.match(/\/\*__[A-Z_]+__\*\/|\bReactDOM\b/);
if (left) throw new Error('resta qualcosa della 2.0 da sistemare: ' + left[0]);

const head = '// B&T App 2.0. Generato una volta da tools/port-2.0.js (anteprima 2.0, app-preview/index.html, versione 25);\n' +
  '// da qui in avanti è il sorgente vero e si modifica a mano.\n';
fs.writeFileSync(path.join(ROOT, 'src', 'App.jsx'), head + js);
fs.writeFileSync(path.join(ROOT, 'src', 'App.css'), '/* Stile della 2.0 (dall\'anteprima, tools/port-2.0.js). */\n' + style[1].replace(/^\n/, ''));
console.log(`src/App.jsx: ${js.split('\n').length} righe; src/App.css: ${style[1].split('\n').length} righe`);
