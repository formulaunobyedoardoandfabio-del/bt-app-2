// Il casco del profilo (Tappa 3, G15; prove in test/unit/helmet.test.js): le scelte dell'editor e la pulizia dei valori
// che si salvano nei dati dell'account (helmet). base null = il colore dei tasti scelto nell'app.
const { normHex } = require("./colors");

const HELMET_PATTERNS = [
  { id: "stripes", name: "Strisce" }, { id: "flames", name: "Fiamme" }, { id: "checks", name: "Scacchi" },
  { id: "stars", name: "Stelle" }, { id: "bolt", name: "Fulmine" }, { id: "pinstripes", name: "Righe sottili" },
  { id: "dots", name: "Pois" }, { id: "none", name: "Nessuno" },
];
const HELMET_VISORS = [
  { id: "clear", name: "Chiara" }, { id: "smoke", name: "Fumé" }, { id: "iridium-blue", name: "Iridio blu" },
  { id: "iridium-gold", name: "Iridio oro" }, { id: "mirror-red", name: "Specchio rosso" },
];
const HELMET_FINISHES = [{ id: "gloss", name: "Lucida" }, { id: "matte", name: "Opaca" }, { id: "airbrush", name: "Aerografo" }];
const HELMET_DEFAULT = Object.freeze({ base: null, c1: "#FFFFFF", c2: "#111111", pattern: "stripes", number: null, visor: "smoke", finish: "gloss" });

const oneOf = (list, v, def) => (list.some(x => x.id === v) ? v : def);
// Numero da 0 a 99 (anche scritto come testo); altrimenti nessun numero.
function cleanNumber(v) {
  const n = typeof v === "string" && /^\s*\d{1,2}\s*$/.test(v) ? Number(v) : v;
  return Number.isInteger(n) && n >= 0 && n <= 99 ? n : null;
}
function cleanHelmet(spec) {
  const s = spec && typeof spec === "object" && !Array.isArray(spec) ? spec : {};
  const D = HELMET_DEFAULT;
  return {
    base: normHex(s.base) || null,
    c1: normHex(s.c1) || D.c1,
    c2: normHex(s.c2) || D.c2,
    pattern: oneOf(HELMET_PATTERNS, s.pattern, D.pattern),
    number: cleanNumber(s.number),
    visor: oneOf(HELMET_VISORS, s.visor, D.visor),
    finish: oneOf(HELMET_FINISHES, s.finish, D.finish),
  };
}

module.exports = { HELMET_DEFAULT, HELMET_PATTERNS, HELMET_VISORS, HELMET_FINISHES, cleanHelmet };
