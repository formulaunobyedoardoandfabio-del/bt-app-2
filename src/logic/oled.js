// Protezione degli schermi OLED nella modalità TV (8/11, Edoardo: "modalità TV in dual screen con anti-burn-in"). Sugli
// OLED le parti ferme e chiare per ore lasciano un'ombra. Qui: tutta la schermata si sposta di pochi pixel ogni minuto
// (giro di 8 punti entro 3 pixel, non si nota), si abbassa se non la tocchi (dopo 5 e 15 minuti) e si risveglia quando
// cambia una bandiera importante. Lo sfondo nero vero e le scritte ferme meno chiare li fa la grafica.
const PATH = [[0, 0], [2, 1], [3, -1], [1, -3], [-1, -2], [-3, 0], [-2, 2], [1, 3]];
const STEP_MS = 60e3;
function pixelShift(now) {
  const n = Number.isFinite(now) ? Math.floor(now / STEP_MS) : 0;
  const [x, y] = PATH[((n % PATH.length) + PATH.length) % PATH.length];
  return { x, y };
}
function dimFor(idleMs) {
  if (!Number.isFinite(idleMs) || idleMs < 5 * 60e3) return 0;
  return idleMs < 15 * 60e3 ? 0.3 : 0.5;
}
const BIG = new Set(["yellow", "sc", "vsc", "red"]);
const wakes = (prev, flag) => !!prev && prev !== flag && (BIG.has(prev) || BIG.has(flag));

module.exports = { PATH, STEP_MS, pixelShift, dimFor, wakes };
