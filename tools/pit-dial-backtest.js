// Prova del Quadrante dei box sui pit veri delle gare 2026 (public/data/replay). Per ogni pit: stima del rientro
// `lead` secondi prima dell'entrata, col tempo perso degli ALTRI pit della gara, contro la posizione vera 5 s dopo
// l'uscita. Confronto con "resta dov'è" (nessuna stima) per capire se la stima aggiunge qualcosa.
// Uso: node tools/pit-dial-backtest.js [lead] [chiave]
const fs = require("fs");
const path = require("path");
const TR = require("../src/logic/track-replay");
const PD = require("../src/logic/pit-dial");
const dir = path.join(__dirname, "..", "public", "data", "replay");
const raw = JSON.parse(fs.readFileSync(path.join(dir, "index.json"), "utf8"));
const idx = Array.isArray(raw) ? raw : (raw.races || Object.values(raw).find(Array.isArray));
const lead = +(process.argv[2] || 10), only = process.argv[3];
const pct = (a, b) => (b ? Math.round((100 * a) / b) + "%" : "-");
let N = 0, EX = 0, W1 = 0, STAY = 0, AE = 0, MASS = 0;
const scRatios = [], byFlag = {};
for (const g of idx) {
  if (only && String(g.key) !== only) continue;
  const rep = TR.decode(JSON.parse(fs.readFileSync(path.join(dir, g.key + ".json"), "utf8")));
  const m = PD.lossModel(rep), bt = PD.backtest(rep, { lead });
  const ok = bt.rows.filter(r => !r.mass), stay = ok.filter(r => r.before === r.real).length;
  N += bt.n; EX += bt.exact; W1 += bt.within1; STAY += stay; MASS += bt.nMass; AE += ok.reduce((s, r) => s + Math.abs(r.err), 0);
  ok.forEach(r => {
    [r.flag, r.crowd ? "con altri ai box" : "da solo ai box"].forEach(key => {
      const f = (byFlag[key] = byFlag[key] || { n: 0, ex: 0, w1: 0 }); f.n++; f.ex += r.err === 0; f.w1 += Math.abs(r.err) <= 1;
    });
  });
  if (m.scMeasured && m.green) scRatios.push(m.sc / m.green);
  console.log(`${String(g.key).padEnd(6)} ${String(g.place).padEnd(18)} persi ${String(m.green).padStart(5)} s (${m.nGreen} pit)` +
    ` SC ${m.sc}${m.scMeasured ? " misurato" : " stima"} | pit ${String(bt.n).padStart(2)} esatti ${pct(bt.exact, bt.n).padStart(4)}` +
    ` ±1 ${pct(bt.within1, bt.n).padStart(4)} | resta dov'è ${pct(stay, bt.n).padStart(4)}${bt.nMass ? ` | di massa ${bt.nMass}` : ""}`);
  if (only) bt.rows.forEach(r => console.log("   ", r.code, "giro", r.lap, r.flag, r.mass ? "MASSA" : "", "persi", r.loss, "prima", r.before, "stima", r.pred, "vero", r.real));
}
console.log(`\nTOTALE ${N} pit (più ${MASS} di massa a parte): esatti ${pct(EX, N)}, ±1 ${pct(W1, N)}, errore medio ${(AE / Math.max(1, N)).toFixed(2)} posizioni; "resta dov'è" ${pct(STAY, N)}`);
Object.entries(byFlag).forEach(([f, v]) => console.log(`  ${f}: ${v.n} pit, esatti ${pct(v.ex, v.n)}, ±1 ${pct(v.w1, v.n)}`));
if (scRatios.length) console.log("SC/normale misurato nelle gare con almeno 3 pit in SC:", scRatios.map(x => x.toFixed(2)).join(", "));
