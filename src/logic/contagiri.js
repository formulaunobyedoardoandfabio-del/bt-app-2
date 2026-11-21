// Contagiri (21/11, dal widget circolare del video di Edoardo; piano nel documento claude/multiviewer-in-sector4.md):
// velocità al centro e sull'arco esterno (0-360 km/h su 270°, da -135° a +135°, 0° in alto), acceleratore sull'arco
// interno a sinistra (sale dal basso), freno sull'arco interno a destra (nei dati del Ghost Lap è 0/1: pieno o
// vuoto), marcia. Niente giri motore né DRS: il dato non c'è. Sotto i 140 px solo velocità e marcia.
// Prove: test/unit/contagiri.test.js.

const VMAX = 360, COMPACT_PX = 140;
const TICKS = [0, 60, 120, 180, 240, 300, 360];
const clamp01 = x => Math.max(0, Math.min(1, x));
const num = x => (typeof x === "number" && Number.isFinite(x) ? x : null);

function reading({ v, thr, brk, g } = {}) {
  const vv = num(v);
  if (vv == null) return null;
  const gg = num(g);
  return { v: Math.round(vv), speed: clamp01(vv / VMAX), throttle: clamp01((num(thr) || 0) / 100), brake: (num(brk) || 0) >= 0.5, gear: gg != null && gg >= 0.5 ? Math.round(gg) : null };
}

const speedAngle = v => -135 + (270 * Math.max(0, Math.min(VMAX, v))) / VMAX;

// Arco SVG in senso orario da a0 ad a1, angoli in gradi misurati dall'alto.
function arc(cx, cy, r, a0, a1) {
  const sw = a1 - a0;
  if (!(sw > 0)) return "";
  const p = a => { const q = (a * Math.PI) / 180; return [cx + r * Math.sin(q), cy - r * Math.cos(q)]; };
  const [x0, y0] = p(a0), [x1, y1] = p(a1), f = n => (Math.abs(n) < 1e-9 ? 0 : n).toFixed(1);
  return `M${f(x0)} ${f(y0)} A${r} ${r} 0 ${sw > 180 ? 1 : 0} 1 ${f(x1)} ${f(y1)}`;
}

// Archi interni: acceleratore da 210° (in basso a sinistra) verso 330° in proporzione; freno da 30° a 150°, tutto o niente.
function pedals(r) {
  if (!r) return { thr: null, brk: null };
  return { thr: r.throttle > 0 ? [210, 210 + 120 * r.throttle] : null, brk: r.brake ? [30, 150] : null };
}

const compact = px => px < COMPACT_PX;

module.exports = { VMAX, COMPACT_PX, TICKS, reading, speedAngle, arc, pedals, compact };
