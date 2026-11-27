# Video finale dello splash. Fino al fotogramma 39 è la scena su nero (opaca). Dal 40 nel video originale compare lo
# screenshot dell'app: lo si toglie e resta solo quello che sta sopra (il nero che sfuma, le lettere, le linee della
# pista), così sotto si vede l'app vera. Modello: C = l*L + (1-l)*f*P, con P lo screenshot pulito, f la dissolvenza dal
# nero (misurata sul video) e L, l le lettere e la loro copertura. Uscita: alpha = 1-(1-l)*f e colore l*L/alpha.
# Le lettere e le linee sono bianche o grigie: la differenza si misura sul canale che cambia meno (min dei tre), così
# il bagliore rosso del tasto LIVE dello screenshot (che pulsa) non diventa una macchia sopra l'app.
import subprocess, sys, os, numpy as np
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
W, H = 720, 1280
REVEAL, LAST = 40, 77
T0, T1 = 12.0, 40.0                 # durante la dissolvenza dal nero
T0_LATE, T1_LATE, LATE = 55.0, 110.0, 52   # dopo: solo le lettere e le linee (bianche, molto diverse dallo sfondo); il tasto LIVE
                                          # dello screenshot che pulsa resta sotto la soglia e non lascia l'ombra sull'app
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-an', '-vf', f'scale={W}:{H}:flags=lanczos', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3).astype(np.float32)
P = np.median(fr[80:100], axis=0)
Pl = P.mean(axis=2)
def blur3(a):
    p = np.pad(a, 1, mode='edge')
    return sum(p[dy:dy + a.shape[0], dx:dx + a.shape[1]] for dy in range(3) for dx in range(3)) / 9.0
os.makedirs(out, exist_ok=True)
for i in range(LAST):
    C = fr[i]
    if i < REVEAL:
        f = 0.0
    else:
        Cl = C.mean(axis=2)
        m = (Pl > 70) & (Cl < Pl + 25)
        f = float(np.median(Cl[m] / Pl[m])) if m.sum() > 50 else 1.0
        f = min(1.0, max(0.0, f / 0.97))
    B = f * P
    d = np.maximum((C - B).min(axis=2), (B - C).min(axis=2))
    d = blur3(np.maximum(d, 0))
    t0, t1 = (T0_LATE, T1_LATE) if i >= LATE else (T0, T1)
    l = np.clip((d - t0) / (t1 - t0), 0, 1)
    l = l * l * (3 - 2 * l)
    if i < REVEAL: l[:] = 1.0
    lL = np.clip(C - (1 - l[..., None]) * B, 0, 255)
    a = 1.0 - (1.0 - l) * f
    a[a < 0.02] = 0
    F = np.where(a[..., None] > 0, lL / np.maximum(a[..., None], 1e-3), 0)
    rgba = np.dstack([np.clip(F, 0, 255), a * 255]).round().astype(np.uint8)
    Image.fromarray(rgba, 'RGBA').save(os.path.join(out, f'f{i:03d}.png'))
print('fotogrammi', LAST)
