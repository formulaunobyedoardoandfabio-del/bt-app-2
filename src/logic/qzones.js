// Zona eliminazione delle leghe del FantaF1 (Tappa 3, G22; prove in test/unit/qzones.test.js). Nelle proporzioni delle
// qualifiche 2026 (22 vetture: 6 fuori in Q1, 6 fuori in Q2, 10 in Q3): con N squadre le ultime round(N × 6 / 22) righe
// sono la "Zona Q1", le round(N × 6 / 22) prima la "Zona Q2", le altre "Q3". Con meno di 10 squadre niente zone.
const QZ = { cars: 22, out: 6, min: 10 };

// n: squadre della lega → { q1, q2 }: quante righe in fondo per ciascuna zona.
function qZones(n) {
  const k = Math.floor(Number(n));
  if (!isFinite(k) || k < QZ.min) return { q1: 0, q2: 0 };
  const z = Math.round(k * QZ.out / QZ.cars);
  return { q1: z, q2: z };
}

// pos: posizione in classifica (1 = primo); n: squadre → "q1" | "q2" | "q3".
function zoneOf(pos, n) {
  const { q1, q2 } = qZones(n);
  if (pos > n - q1) return "q1";
  if (pos > n - q1 - q2) return "q2";
  return "q3";
}

module.exports = { qZones, zoneOf, QZ };
