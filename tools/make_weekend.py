# Dati veri per gli strumenti del weekend nel Garage (genera src/data/real-weekend.js).
#  - Scanner dell'assetto: prove libere di Sepang e Baku 2026 (giri, mescole, speed trap) e, per il giro più veloce di ogni
#    pilota, velocità massima e velocità minime nelle curve lente, medie e veloci (dalla telemetria).
#  - Tire Strategy Predictor e Degrado gomme: tutte le gare 2026 già corse (tempi giro per giro, stint e mescole,
#    soste, bandiere), posizione finale.
#  - Compagni a confronto: migliori giri di ogni pilota in Q1, Q2 e Q3 di tutte le qualifiche 2026.
# Fonte: TracingInsights/2026 su GitHub (licenza Apache 2.0), dati FastF1 dal live timing di Formula 1 (tempi di gara
# e posizioni corretti con Ergast/Jolpica). Uso: python3 realdata/make_weekend.py
import json, math, os, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
TI = '/home/claude/tracinginsights/2026'
CIRC = json.load(open(os.path.join(HERE, '..', 'src', 'data', 'circuits.json')))
CIRCUIT_IDS = ["au-1953", "cn-2004", "jp-1962", "us-2022", "ca-1978", "mc-1929", "es-1991", "at-1969", "gb-1948", "be-1925", "hu-1986",
               "nl-1948", "it-1922", "es-2026", "az-2016", "my-1999", "sg-2008", "us-2012", "mx-1962", "br-1940", "us-2023", "qa-2004", "ae-2009"]
EVENTS = ['Australian Grand Prix', 'Chinese Grand Prix', 'Japanese Grand Prix', 'Miami Grand Prix', 'Canadian Grand Prix', 'Monaco Grand Prix',
          'Barcelona Grand Prix', 'Austrian Grand Prix', 'British Grand Prix', 'Belgian Grand Prix', 'Hungarian Grand Prix', 'Dutch Grand Prix',
          'Italian Grand Prix', 'Spanish Grand Prix', 'Azerbaijan Grand Prix', 'Bahrain Grand Prix']   # stesso ordine del calendario (round 1-16)
TEAM = {'McLaren': 'mclaren', 'Red Bull Racing': 'redbull', 'Mercedes': 'mercedes', 'Ferrari': 'ferrari', 'Williams': 'williams',
        'Racing Bulls': 'racingbulls', 'Aston Martin': 'astonmartin', 'Haas F1 Team': 'haas', 'Audi': 'audi', 'Kick Sauber': 'audi',
        'Alpine': 'alpine', 'Cadillac': 'cadillac'}
COMP = {'SOFT': 'S', 'MEDIUM': 'M', 'HARD': 'H', 'INTERMEDIATE': 'I', 'WET': 'W'}
def git(*a): return subprocess.run(['git', '-c', 'core.quotepath=false', '-C', TI, *a], capture_output=True, text=True).stdout
def load(path):
    full = os.path.join(TI, path)
    if not os.path.exists(full): subprocess.run(['git', '-C', TI, 'checkout', 'FETCH_HEAD', '--', path], capture_output=True)
    return json.load(open(full)) if os.path.exists(full) else None
def num(v): return v if isinstance(v, (int, float)) and not (isinstance(v, float) and math.isnan(v)) else None
def rows(x):
    keys = list(x.keys()); n = len(x['time'])
    return [{k: x[k][i] for k in keys} for i in range(n)]
def ms(t): t = num(t); return int(round(t * 1000)) if t else 0
def flags(r):
    st = str(r.get('status') or ''); f = 0
    if num(r.get('pin')) is not None: f |= 1          # giro di rientro ai box
    if num(r.get('pout')) is not None: f |= 2         # giro di uscita dai box
    if '4' in st: f |= 4                              # Safety Car
    if '6' in st or '7' in st: f |= 8                 # Virtual Safety Car
    if '2' in st: f |= 16                             # bandiera gialla
    if '5' in st: f |= 32                             # bandiera rossa
    if r.get('del') is True: f |= 64                  # tempo cancellato (limiti della pista)
    return f
def by_driver(x):
    out = {}
    for r in rows(x):
        if r['drv'] in (None, 'None'): continue
        out.setdefault(r['drv'], []).append(r)
    for d in out: out[d].sort(key=lambda r: r['lap'] if isinstance(r['lap'], int) else 0)
    return out

# ── Gare ────────────────────────────────────────────────────────────────
def race(i, ev):
    x = load(f'{ev}/Race/session_laptimes.json')
    if not x: return None
    D = by_driver(x); total = 0
    for d, L in D.items():
        last = L[-1]
        if last.get('pos') == 1: total = max(total, last['lap'])
    out = {}
    for d, L in D.items():
        stints = []
        for r in L:
            c = COMP.get(r.get('compound'), '?'); s = r.get('stint') if isinstance(r.get('stint'), int) else (stints[-1][0] if stints else 1)
            life = r.get('life') if isinstance(r.get('life'), int) else None
            if not stints or stints[-1][0] != s or stints[-1][1] != c: stints.append([s, c, r['lap'], r['lap'], 1 if r.get('fresh') is True else 0, life])
            else: stints[-1][3] = r['lap']
        pos = L[-1].get('pos') if isinstance(L[-1].get('pos'), int) else None
        team = TEAM.get(next((r['team'] for r in L if r.get('team') in TEAM), None))
        out[d] = {'team': team, 'pos': pos, 'n': len(L), 't': [ms(r['time']) for r in L], 'f': [flags(r) for r in L],
                  'st': [[c, a, b, fr, lf] for _, c, a, b, fr, lf in stints]}
    return {'circuitId': CIRCUIT_IDS[i], 'round': i + 1, 'laps': total, 'drivers': out}

# ── Qualifiche ─────────────────────────────────────────────────────────
def quali(i, ev):
    x = load(f'{ev}/Qualifying/session_laptimes.json')
    if not x: return None
    out = {}
    for d, L in by_driver(x).items():
        best = {}
        for r in L:
            t = num(r['time']); q = r.get('qs')
            if not t or r.get('del') is True or q not in ('Q1', 'Q2', 'Q3'): continue
            best[q] = min(best.get(q, 1e9), t)
        team = TEAM.get(next((r['team'] for r in L if r.get('team') in TEAM), None))
        out[d] = {'team': team, 'q': [ms(best.get(q)) for q in ('Q1', 'Q2', 'Q3')]}
    return {'circuitId': CIRCUIT_IDS[i], 'round': i + 1, 'drivers': out}

# ── Prove libere (Scanner dell'assetto) ────────────────────────────────
GUIDE = None
def guide():
    global GUIDE
    if GUIDE is None:
        js = open(os.path.join(HERE, '..', 'src', 'data', 'real-data.js')).read()
        a = js.index('const data = ') + len('const data = '); b = js.rindex(';\n  if (typeof module')
        GUIDE = json.loads(js[a:b])['guide']
    return GUIDE
def at(X, Y, x):
    if x <= X[0]: return Y[0]
    if x >= X[-1]: return Y[-1]
    lo, hi = 0, len(X) - 1
    while hi - lo > 1:
        m = (lo + hi) // 2
        if X[m] <= x: lo = m
        else: hi = m
    return Y[lo] if X[hi] == X[lo] else Y[lo] + (Y[hi] - Y[lo]) * (x - X[lo]) / (X[hi] - X[lo])
def lap_metrics(ev, sess, drv, lap, cid, lap_s):
    tel = load(f'{ev}/{sess}/{drv}/{lap}_tel.json')
    if not tel: return None
    t = tel['tel']; D = [max(0.0, v or 0) for v in t['distance']]; V = [v or 0 for v in t['speed']]; T = [v or 0 for v in t['time']]
    thr = [min(100, max(0, v or 0)) for v in t['throttle']]
    LEN = CIRC[cid]['len']
    # Telemetria rovinata (velocità sempre uguale, giro troppo corto o lungo, tempo diverso dal giro): non si usa.
    if len(V) < 100 or not D or abs(D[-1] - LEN) > LEN * 0.08 or not T or abs(T[-1] - lap_s) > lap_s * 0.03: return None
    mv = sum(V) / len(V)
    if (sum((v - mv) ** 2 for v in V) / len(V)) ** 0.5 < 30: return None
    D = [v * LEN / D[-1] for v in D]
    cls = {'slow': [], 'medium': [], 'fast': []}
    for c in guide()[cid]['corners']:
        if c.get('brake') is None and c['vMin'] > 250: continue                   # curve in pieno: non dicono niente sul carico
        win = [V[k] for k, d in enumerate(D) if c['d'] - 110 <= d <= c['d'] + 110]
        if not win: continue
        ref = c['vMin']; k = 'slow' if ref < 120 else 'medium' if ref < 200 else 'fast'
        cls[k].append(min(win))
    full = sum(T[i] - T[i - 1] for i in range(1, len(T)) if thr[i] >= 98) / T[-1] * 100 if T[-1] else None
    avg = lambda a: round(sum(a) / len(a), 1) if a else None
    m = {'vmax': round(max(V)), 'slow': avg(cls['slow']), 'medium': avg(cls['medium']), 'fast': avg(cls['fast']), 'full': round(full) if full else None}
    seq = [m[k] for k in ('slow', 'medium', 'fast') if m[k] is not None]
    if any(b < a for a, b in zip(seq, seq[1:])): return None            # curve lente più veloci delle medie: dati sfasati
    return m
def practice(ev, cid, sessions):
    out = {}
    for key, folder in sessions:
        x = load(f'{ev}/{folder}/session_laptimes.json')
        if not x: continue
        S = {}
        for d, L in by_driver(x).items():
            valid = [(num(r['time']), r['lap']) for r in L if num(r['time']) and r.get('del') is not True and num(r.get('pin')) is None and num(r.get('pout')) is None]
            team = TEAM.get(next((r['team'] for r in L if r.get('team') in TEAM), None))
            e = {'team': team, 't': [ms(r['time']) for r in L], 'c': ''.join(COMP.get(r.get('compound'), '?') for r in L),
                 'life': [r['life'] if isinstance(r.get('life'), int) else 0 for r in L], 's': [r['stint'] if isinstance(r.get('stint'), int) else 0 for r in L],
                 'f': [flags(r) for r in L], 'vst': [int(num(r.get('vst')) or 0) for r in L]}
            if valid:
                # Tempo: il giro più veloce. Numeri dalla telemetria: il primo giro valido tra i 4 più veloci (entro l'1,5%).
                bt, bl = min(valid); e['best'] = {'lap': bl, 'ms': ms(bt)}
                for tt, ll in sorted(valid)[:4]:
                    if tt > bt * 1.015: break
                    m = lap_metrics(ev, folder, d, ll, cid, tt)
                    if m: e['best'].update({'mlap': ll, **m}); break
            S[d] = e
        out[key] = S
        print(' ', cid, key, len(S), 'piloti')
    return out

data = {'races': [], 'quali': [], 'practice': {}}
for i, ev in enumerate(EVENTS):
    r = race(i, ev)
    if r: data['races'].append(r); print('gara', r['circuitId'], r['laps'], 'giri', len(r['drivers']), 'piloti')
    q = quali(i, ev)
    if q: data['quali'].append(q)
FP = [('FP1', 'Practice 1'), ('FP2', 'Practice 2'), ('FP3', 'Practice 3')]
data['practice']['my-1999'] = practice('Bahrain Grand Prix', 'my-1999', FP)
data['practice']['az-2016'] = practice('Azerbaijan Grand Prix', 'az-2016', FP)
js = ("// Dati veri del weekend (generato da realdata/make_weekend.py): prove libere di Sepang e Baku 2026, gare e qualifiche 2026.\n"
      "// Fonte: TracingInsights/2026 su GitHub (licenza Apache 2.0), dati FastF1 dal live timing di Formula 1. Solo per l'anteprima.\n"
      "(function (root) { const data = " + json.dumps(data, separators=(',', ':'), ensure_ascii=False) + ";\n"
      "  if (typeof module !== 'undefined' && module.exports) module.exports = data; else root.BtWeekend = data;\n"
      "})(typeof window !== 'undefined' ? window : globalThis);\n")
open(os.path.join(HERE, '..', 'src', 'data', 'real-weekend.js'), 'w').write(js)
print('scritto', len(js) // 1024, 'KB')
