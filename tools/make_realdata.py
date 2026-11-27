# Dati veri per la 2.0 (genera src/data/real-data.js).
#  - Ghost Lap: qualifiche 2026 di Baku e di Sepang (GP del Bahrain in Malesia), giri più veloci dei primi 8.
#  - Guida 2D dei tracciati: per ogni pista del calendario 2026, il giro più veloce delle qualifiche (2026, oppure 2025
#    per le piste non ancora corse nel 2026): tracciato, curve e numeri curva per curva (marcia, velocità d'ingresso e
#    minima, punto di staccata, decelerazione, rischio di bloccaggio, gas al 100%).
#  - Circuit Spec Clash: valori delle ricerche (Formula1.com, Brembo, Pirelli...) + valori calcolati dalla telemetria.
#  - Momenti storici e nomi delle curve: ricerca con le fonti (research_notes/Tracciati B&T/corners.md).
# Fonte della telemetria: TracingInsights/2025 e /2026 su GitHub (licenza Apache 2.0), dati FastF1 dal live timing F1.
# Uso: python3 realdata/make_realdata.py
import json, math, os, subprocess, glob
HERE = os.path.dirname(os.path.abspath(__file__))
TI = '/home/claude/tracinginsights'
RES = '/home/claude/research_notes/Tracciati B&T'
CIRC = json.load(open(os.path.join(HERE, '..', 'src', 'data', 'circuits.json')))
SRC = {  # pista -> (anno, cartella dell'evento)
    'au-1953': (2026, 'Australian Grand Prix'), 'cn-2004': (2026, 'Chinese Grand Prix'), 'jp-1962': (2026, 'Japanese Grand Prix'),
    'us-2022': (2026, 'Miami Grand Prix'), 'ca-1978': (2026, 'Canadian Grand Prix'), 'mc-1929': (2026, 'Monaco Grand Prix'),
    'es-1991': (2026, 'Barcelona Grand Prix'), 'at-1969': (2026, 'Austrian Grand Prix'), 'gb-1948': (2026, 'British Grand Prix'),
    'be-1925': (2026, 'Belgian Grand Prix'), 'hu-1986': (2026, 'Hungarian Grand Prix'), 'nl-1948': (2026, 'Dutch Grand Prix'),
    'it-1922': (2026, 'Italian Grand Prix'), 'es-2026': (2026, 'Spanish Grand Prix'), 'az-2016': (2026, 'Azerbaijan Grand Prix'),
    'my-1999': (2026, 'Bahrain Grand Prix'), 'sg-2008': (2025, 'Singapore Grand Prix'), 'us-2012': (2025, 'United States Grand Prix'),
    'mx-1962': (2025, 'Mexico City Grand Prix'), 'br-1940': (2025, 'São Paulo Grand Prix'), 'us-2023': (2025, 'Las Vegas Grand Prix'),
    'qa-2004': (2025, 'Qatar Grand Prix'), 'ae-2009': (2025, 'Abu Dhabi Grand Prix'),
}
def repo(year): return f'{TI}/{year}'
def ref(year): return 'FETCH_HEAD' if year == 2026 else 'HEAD'
def git(year, *args): return subprocess.run(['git', '-c', 'core.quotepath=false', '-C', repo(year), *args], capture_output=True, text=True).stdout
def fetch(year, path):
    full = os.path.join(repo(year), path)
    if not os.path.exists(full): subprocess.run(['git', '-C', repo(year), 'checkout', ref(year), '--', path], capture_output=True)
    return full if os.path.exists(full) else None
def load(year, path):
    f = fetch(year, path); return json.load(open(f)) if f else None
def num(v, nd=None, lo=None, hi=None):
    if v is None or (isinstance(v, float) and math.isnan(v)): v = 0
    if lo is not None: v = max(lo, v)
    if hi is not None: v = min(hi, v)
    return round(v, nd) if nd else int(round(v))
def fastest_laps(year, event, n=1):
    Q = f'{event}/Qualifying'; out = []
    for f in git(year, 'ls-tree', '-r', '--name-only', ref(year), Q).splitlines():
        if not f.endswith('/laptimes.json'): continue
        x = load(year, f); drv = f.split('/')[-2]
        dl = x.get('del') or [False] * len(x['time'])
        v = [(t, l) for t, l, d in zip(x['time'], x['lap'], dl) if isinstance(t, (int, float)) and t and not d]
        if v:
            t, l = min(v); i = x['lap'].index(l)
            out.append({'time': t, 'drv': drv, 'lap': l, 'compound': x['compound'][i], 'team': x['team'][i], 'sectors': [x['s1'][i], x['s2'][i], x['s3'][i]], 'vst': x['vst'][i]})
    out.sort(key=lambda r: r['time']); return out[:n]
def telemetry(year, event, drv, lap):
    t = load(year, f'{event}/Qualifying/{drv}/{lap}_tel.json')['tel']
    return {'d': [max(0.0, v or 0) for v in t['distance']], 't': [v or 0 for v in t['time']], 'v': [v or 0 for v in t['speed']],
            'thr': [min(100, max(0, v or 0)) for v in t['throttle']], 'brk': [1 if v else 0 for v in t['brake']], 'g': [v or 0 for v in t['gear']],
            'x': [v or 0 for v in t['x']], 'y': [v or 0 for v in t['y']]}
def at(L, k, x, by='d'):
    X, Y = L[by], L[k]
    if x <= X[0]: return Y[0]
    if x >= X[-1]: return Y[-1]
    lo, hi = 0, len(X) - 1
    while hi - lo > 1:
        m = (lo + hi) // 2
        if X[m] <= x: lo = m
        else: hi = m
    return Y[lo] if X[hi] == X[lo] else Y[lo] + (Y[hi] - Y[lo]) * (x - X[lo]) / (X[hi] - X[lo])
def brake_start(L, frm, to):
    for i, d in enumerate(L['d']):
        if frm <= d <= to and L['brk'][i]:
            j = i
            while j > 0 and L['brk'][j - 1]: j -= 1
            return L['d'][j]
    return None
def detect_corners(L):
    # Senza le curve ufficiali: una "curva" per ogni frenata vera (calo di almeno 15 km/h), all'apice (velocità minima).
    segs, i, n = [], 0, len(L['d'])
    while i < n:
        if L['brk'][i]:
            j = i
            while j + 1 < n and L['brk'][j + 1]: j += 1
            segs.append([L['d'][i], L['d'][j]]); i = j + 1
        else: i += 1
    merged = []
    for s in segs:
        if merged and s[0] - merged[-1][1] < 40: merged[-1][1] = s[1]
        else: merged.append(s)
    out = []
    for a, b in merged:
        idx = [k for k, d in enumerate(L['d']) if a <= d <= b + 120]
        if not idx: continue
        k = min(idx, key=lambda q: L['v'][q])
        if at(L, 'v', a) - L['v'][k] < 15: continue
        out.append({'n': len(out) + 1, 'd': round(L['d'][k], 1), 'x': round(L['x'][k]), 'y': round(L['y'][k]), 'a': None, 'detected': True})
    return out
def corner_stats(L, c, prev_brake):
    cd = c['d']; b = brake_start(L, cd - 450, cd + 40)
    win = [k for k, d in enumerate(L['d']) if cd - 150 <= d <= cd + 150]
    k = min(win, key=lambda q: L['v'][q]) if win else None
    vmin = round(L['v'][k]) if k is not None else round(at(L, 'v', cd)); dmin = L['d'][k] if k is not None else cd
    avg_g = [L['g'][q] for q, d in enumerate(L['d']) if cd - 50 <= d <= cd + 50] or [at(L, 'g', cd)]
    shared = b is not None and prev_brake is not None and abs(b - prev_brake) < 1
    ventry = round(at(L, 'v', b)) if b is not None else round(at(L, 'v', cd - 100))
    dv = ventry - vmin
    dt = (at(L, 't', dmin) - at(L, 't', b)) if b is not None else 0
    gdec = round(dv / 3.6 / dt / 9.81, 1) if b is not None and dt > 0.05 else None
    full = next((L['d'][q] for q, d in enumerate(L['d']) if d >= dmin and d <= cd + 600 and L['thr'][q] >= 99), None)
    if b is None or dv < 15: risk = 'nessuno'
    elif (ventry >= 280 and dv >= 150) or (gdec or 0) >= 4.5: risk = 'alto'
    elif dv >= 80: risk = 'medio'
    else: risk = 'basso'
    return {'brake': round(cd - b) if b is not None else None, 'shared': shared, 'vEntry': ventry, 'vMin': vmin, 'gApex': round(at(L, 'g', dmin)),
            'gAvg': round(sum(avg_g) / len(avg_g), 1), 'dv': dv, 'gDec': gdec, 'full': round(full - dmin) if full is not None else None, 'risk': risk}, b
def outline(L, n=300):
    step = max(1, len(L['d']) // n)
    return [[round(L['x'][i]), round(L['y'][i])] for i in range(0, len(L['d']), step)]
def lap_stats(L):
    T = L['t'][-1]; ft = br = 0.0
    for i in range(1, len(L['t'])):
        dt = L['t'][i] - L['t'][i - 1]
        if L['thr'][i] >= 98: ft += dt
        if L['brk'][i]: br += dt
    return {'fullPct': round(ft / T * 100), 'brakePct': round(br / T * 100), 'vMax': round(max(L['v'])), 'vAvg': round(L['d'][-1] / T * 3.6)}
specs = json.load(open(f'{RES}/specs.json')); hist = json.load(open(f'{RES}/corners.json'))
guide = {}
for cid, (year, ev) in SRC.items():
    best = fastest_laps(year, ev, 1)
    if not best: print('niente dati', cid); continue
    b0 = best[0]; L = telemetry(year, ev, b0['drv'], b0['lap'])
    cj = load(year, f'{ev}/Qualifying/corners.json')
    if cj:
        rot = cj['Rotation'][0] if isinstance(cj['Rotation'], list) else cj['Rotation']
        corners = [{'n': int(n), 'd': round(d, 1), 'x': round(x), 'y': round(y), 'a': round(a, 1) if a is not None else None, 'detected': False} for n, d, x, y, a in zip(cj['CornerNumber'], cj['Distance'], cj['X'], cj['Y'], cj['Angle'])]
    else:
        rot = 0; corners = detect_corners(L)
    names = (hist.get(cid) or {}).get('names') or {}
    prev = None
    for c in corners:
        st, prev = corner_stats(L, c, prev); c.update(st)
        if not c['detected'] and str(c['n']) in names: c['name'] = names[str(c['n'])]
    guide[cid] = {'year': year, 'event': ev, 'drv': b0['drv'], 'time': b0['time'], 'team': b0['team'], 'rotation': rot, 'detected': not cj,
                  'outline': outline(L), 'corners': corners, 'lap': lap_stats(L)}
    print(cid, year, b0['drv'], b0['time'], len(corners), 'curve', 'rilevate' if not cj else 'ufficiali', guide[cid]['lap'])
def session(year, ev, cid, name, n=8):
    laps = {}; LEN = CIRC[cid]['len']
    for r in fastest_laps(year, ev, n):
        L = telemetry(year, ev, r['drv'], r['lap']); end = L['d'][-1]
        laps[r['drv']] = {'lap': r['lap'], 'time': r['time'], 'compound': r['compound'], 'team': r['team'], 'sectors': r['sectors'], 'vst': r['vst'],
                          'd': [num(v * LEN / end, 1, 0) for v in L['d']], 't': [num(v, 3, 0) for v in L['t']], 'v': [num(v) for v in L['v']],
                          'thr': [num(v) for v in L['thr']], 'brk': L['brk'], 'g': [num(v) for v in L['g']], 'x': [num(v) for v in L['x']], 'y': [num(v) for v in L['y']]}
    g = guide[cid]
    return {'id': cid + '-' + str(year) + '-q', 'name': name, 'circuitId': cid, 'source': "TracingInsights (github.com/TracingInsights/%d), dati FastF1 dal live timing di Formula 1" % year,
            'laps': laps, 'rotation': g['rotation'], 'cornersDetected': g['detected'],
            'corners': [{'n': c['n'], 'd': c['d'], 'x': c['x'], 'y': c['y'], 'detected': c['detected']} for c in g['corners']]}
data = {'baku2026q': session(2026, 'Azerbaijan Grand Prix', 'az-2016', "GP dell'Azerbaigian 2026 · Qualifiche"),
        'sepang2026q': session(2026, 'Bahrain Grand Prix', 'my-1999', "GP del Bahrain in Malesia 2026 (Sepang) · Qualifiche")}
keep = lambda s: {k: s.get(k) for k in ('safety_car', 'overtakes', 'brembo', 'downforce', 'full_throttle_pct')}
data['guide'] = guide
data['specs'] = {cid: keep(v) for cid, v in specs.items()}
data['history'] = {cid: v.get('moments') or [] for cid, v in hist.items()}
js = ("// Dati veri (generato da realdata/make_realdata.py): Ghost Lap (qualifiche 2026 di Sepang e Baku), Guida 2D dei tracciati,\n"
      "// Circuit Spec Clash e momenti storici. Telemetria: TracingInsights/2025 e /2026 su GitHub (licenza Apache 2.0), dati FastF1 dal\n"
      "// live timing di Formula 1. Specifiche e momenti: ricerche con le fonti (research_notes/Tracciati B&T). Solo per l'anteprima.\n"
      "(function (root) { const data = " + json.dumps(data, separators=(',', ':'), ensure_ascii=False) + ";\n"
      "  if (typeof module !== 'undefined' && module.exports) module.exports = data; else root.BtRealData = data;\n"
      "})(typeof window !== 'undefined' ? window : globalThis);\n")
open(os.path.join(HERE, '..', 'src', 'data', 'real-data.js'), 'w').write(js)
print('scritto', len(js) // 1024, 'KB')
