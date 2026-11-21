// Tempo perso ai box a bandiera verde per pista, misurato sui replay 2026 (src/logic/pit-dial.js, lossModel), e
// mediana della stagione. Serve alla diretta prima dei primi pit della gara. Stampa la riga da mettere in
// src/logic/pit-dial.js (PIT_LOSS_2026). Uso: node tools/pit-loss-table.js
const fs = require("fs");
const path = require("path");
const TR = require("../src/logic/track-replay");
const PD = require("../src/logic/pit-dial");
const dir = path.join(__dirname, "..", "public", "data", "replay");
const raw = JSON.parse(fs.readFileSync(path.join(dir, "index.json"), "utf8"));
const idx = Array.isArray(raw) ? raw : (raw.races || Object.values(raw).find(Array.isArray));
const byTrack = {}, all = [];
for (const g of idx) {
  const rep = TR.decode(JSON.parse(fs.readFileSync(path.join(dir, g.key + ".json"), "utf8")));
  const m = PD.lossModel(rep);
  if (m.green != null && rep.circuitId) byTrack[rep.circuitId] = m.green;
  PD.pitLosses(rep).filter(x => x.flag === "green" && x.loss != null).forEach(x => all.push(x.loss));
}
all.sort((a, b) => a - b);
const season = Math.round(all[all.length >> 1] * 10) / 10;
console.log(JSON.stringify({ season, n: all.length, tracks: byTrack }));
