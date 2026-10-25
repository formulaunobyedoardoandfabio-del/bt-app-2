# Dati F1 che si aggiornano da soli (25/10). Li genera il workflow di GitHub .github/workflows/dati-f1.yml (ogni ora nei
# weekend di gara) da TracingInsights/2026 (licenza Apache 2.0, dati FastF1 dal live timing di Formula 1) e li mette in
# public/data/f1: con il push su tappa-3 Vercel li pubblica e l'app li scarica da sola (src/services/f1data.js).
#  - weekend.json: tutte le gare e le qualifiche 2026 già corse (Degrado gomme, Strategie, Compagni, Bluff, zone Q) e le
#    prove libere degli ultimi 3 weekend (Scanner dell'assetto). Stesso formato di src/data/real-weekend.js.
#  - ghost-<circuito>.json: Ghost Lap delle ultime 2 qualifiche (giri più veloci dei primi 8). Formato di real-data.js.
#  - index.json: cosa c'è e un'impronta di ogni file (l'app riscarica solo quello che è cambiato).
# Uso: TI_DIR=<clone di TracingInsights/2026> TI_REF=<HEAD|FETCH_HEAD> python3 tools/make_live_data.py
import hashlib, json, math, os, re, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
TI = os.environ.get('TI_DIR', '/home/claude/tracinginsights/2026')
REF = os.environ.get('TI_REF', 'FETCH_HEAD')
OUT = os.path.join(ROOT, 'public', 'data', 'f1')
CIRC = json.load(open(os.path.join(ROOT, 'src', 'data', 'circuits.json')))
CIRCUIT_IDS = ["au-1953", "cn-2004", "jp-1962", "us-2022", "ca-1978", "mc-1929", "es-1991", "at-1969", "gb-1948", "be-1925", "hu-1986",
               "nl-1948", "it-1922", "es-2026", "az-2016", "my-1999", "sg-2008", "us-2012", "mx-1962", "br-1940", "us-2023", "qa-2004", "ae-2009"]
EVENTS = ['Australian Grand Prix', 'Chinese Grand Prix', 'Japanese Grand Prix', 'Miami Grand Prix', 'Canadian Grand Prix', 'Monaco Grand Prix',
          'Barcelona Grand Prix', 'Austrian Grand Prix', 'British Grand Prix', 'Belgian Grand Prix', 'Hungarian Grand Prix', 'Dutch Grand Prix',
          'Italian Grand Prix', 'Spanish Grand Prix', 'Azerbaijan Grand Prix', 'Bahrain Grand Prix', 'Singapore Grand Prix',
          'United States Grand Prix', 'Mexico City Grand Prix', 'São Paulo Grand Prix', 'Las Vegas Grand Prix', 'Qatar Grand Prix',
          'Abu Dhabi Grand Prix']   # stesso ordine del calendario dell'app (round 1-23)
PLACE = {'au-1953': 'Melbourne', 'cn-2004': 'Shanghai', 'jp-1962': 'Suzuka', 'us-2022': 'Miami', 'ca-1978': 'Montréal', 'mc-1929': 'Monaco',
         'es-1991': 'Barcellona', 'at-1969': 'Spielberg', 'gb-1948': 'Silverstone', 'be-1925': 'Spa', 'hu-1986': 'Budapest', 'nl-1948': 'Zandvoort',
         'it-1922': 'Monza', 'es-2026': 'Madrid', 'az-2016': 'Baku', 'my-1999': 'Sepang', 'sg-2008': 'Singapore', 'us-2012': 'Austin',
         'mx-1962': 'Città del Messico', 'br-1940': 'San Paolo', 'us-2023': 'Las Vegas', 'qa-2004': 'Lusail', 'ae-2009': 'Abu Dhabi'}
GP = re.findall(r'\["(GP [^"]+)",', open(os.path.join(ROOT, 'src', 'data', 'f1-2026.js'), encoding='utf-8').read())   # nomi del calendario
TEAM = {'McLaren': 'mclaren', 'Red Bull Racing': 'redbull', 'Mercedes': 'mercedes', 'Ferrari': 'ferrari', 'Williams': 'williams',
        'Racing Bulls': 'racingbulls', 'Aston Martin': 'astonmartin', 'Haas F1 Team': 'haas', 'Audi': 'audi', 'Kick Sauber': 'audi',
        'Alpine': 'alpine', 'Cadillac': 'cadillac'}
COMP = {'SOFT': 'S', 'MEDIUM': 'M', 'HARD': 'H', 'INTERMEDIATE': 'I', 'WET': 'W'}
SOURCE = "TracingInsights (github.com/TracingInsights/2026), dati FastF1 dal live timing di Formula 1"

def git(*a): return subprocess.run(['git', '-c', 'core.quotepath=false', '-C', TI, *a], capture_output=True, text=True).stdout
TREE = set(git('ls-tree', '-r', '--name-only', REF).splitlines())
def has(path): return path in TREE
# Cartella dell'evento: il nome di FastF1; se per un GP non ancora corso il nome cambia, una parola chiave sola.
TOP = {p.split('/')[0] for p in TREE}
KEYS = {'sg-2008': 'singapore', 'us-2012': 'united states', 'mx-1962': 'mexic', 'br-1940': 'paulo', 'us-2023': 'vegas',
        'qa-2004': 'qatar', 'ae-2009': 'abu dhabi'}
def folder(i):
    ev = EVENTS[i]
    if ev in TOP: return ev
    k = KEYS.get(CIRCUIT_IDS[i]); hit = [t for t in TOP if k and k in t.lower()]
    return hit[0] if len(hit) == 1 else ev
def load(path):
    if not has(path): return None
    full = os.path.join(TI, path)
    if not os.path.exists(full): subprocess.run(['git', '-C', TI, 'checkout', REF, '--', path], capture_output=True)
    try: return json.load(open(full))
    except (OSError, ValueError): return None
def num(v): return v if isinstance(v, (int, float)) and not (isinstance(v, float) and math.isnan(v)) else None
def rnd(v, nd=None, lo=None):
    v = num(v) or 0
    if lo is not None: v = max(lo, v)
    return round(v, nd) if nd else int(round(v))
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
def team_of(L): return TEAM.get(next((r['team'] for r in L if r.get('team') in TEAM), None))

# ── Gare e qualifiche (come tools/make_weekend.py) ─────────────────────
def race(i, ev):
    x = load(f'{ev}/Race/session_laptimes.json')
    if not x: return None
    D = by_driver(x); total = 0
    for d, L in D.items():
        if L[-1].get('pos') == 1: total = max(total, L[-1]['lap'])
    if not total: return None   # gara non ancora finita (nessun vincitore)
    out = {}
    for d, L in D.items():
        stints = []
        for r in L:
            c = COMP.get(r.get('compound'), '?'); s = r.get('stint') if isinstance(r.get('stint'), int) else (stints[-1][0] if stints else 1)
            life = r.get('life') if isinstance(r.get('life'), int) else None
            if not stints or stints[-1][0] != s or stints[-1][1] != c: stints.append([s, c, r['lap'], r['lap'], 1 if r.get('fresh') is True else 0, life])
            else: stints[-1][3] = r['lap']
        pos = L[-1].get('pos') if isinstance(L[-1].get('pos'), int) else None
        out[d] = {'team': team_of(L), 'pos': pos, 'n': len(L), 't': [ms(r['time']) for r in L], 'f': [flags(r) for r in L],
                  'st': [[c, a, b, fr, lf] for _, c, a, b, fr, lf in stints]}
    return {'circuitId': CIRCUIT_IDS[i], 'round': i + 1, 'laps': total, 'drivers': out}
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
        out[d] = {'team': team_of(L), 'q': [ms(best.get(q)) for q in ('Q1', 'Q2', 'Q3')]}
    return {'circuitId': CIRCUIT_IDS[i], 'round': i + 1, 'drivers': out} if out else None

# ── Prove libere (Scanner dell'assetto, come tools/make_weekend.py) ────
def guide():
    js = open(os.path.join(ROOT, 'src', 'data', 'real-data.js'), encoding='utf-8').read()
    a = js.index('const data = ') + len('const data = '); b = js.rindex(';\n  if (typeof module')
    return json.loads(js[a:b])['guide']
GUIDE = guide()
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
    if len(V) < 100 or not D or abs(D[-1] - LEN) > LEN * 0.08 or not T or abs(T[-1] - lap_s) > lap_s * 0.03: return None
    mv = sum(V) / len(V)
    if (sum((v - mv) ** 2 for v in V) / len(V)) ** 0.5 < 30: return None
    D = [v * LEN / D[-1] for v in D]
    cls = {'slow': [], 'medium': [], 'fast': []}
    for c in GUIDE[cid]['corners']:
        if c.get('brake') is None and c['vMin'] > 250: continue
        win = [V[k] for k, d in enumerate(D) if c['d'] - 110 <= d <= c['d'] + 110]
        if not win: continue
        ref = c['vMin']; k = 'slow' if ref < 120 else 'medium' if ref < 200 else 'fast'
        cls[k].append(min(win))
    full = sum(T[i] - T[i - 1] for i in range(1, len(T)) if thr[i] >= 98) / T[-1] * 100 if T[-1] else None
    avg = lambda a: round(sum(a) / len(a), 1) if a else None
    m = {'vmax': round(max(V)), 'slow': avg(cls['slow']), 'medium': avg(cls['medium']), 'fast': avg(cls['fast']), 'full': round(full) if full else None}
    seq = [m[k] for k in ('slow', 'medium', 'fast') if m[k] is not None]
    if any(b < a for a, b in zip(seq, seq[1:])): return None
    return m
def practice(ev, cid):
    out = {}
    for key, folder in (('FP1', 'Practice 1'), ('FP2', 'Practice 2'), ('FP3', 'Practice 3')):
        x = load(f'{ev}/{folder}/session_laptimes.json')
        if not x: continue
        S = {}
        for d, L in by_driver(x).items():
            valid = [(num(r['time']), r['lap']) for r in L if num(r['time']) and r.get('del') is not True and num(r.get('pin')) is None and num(r.get('pout')) is None]
            e = {'team': team_of(L), 't': [ms(r['time']) for r in L], 'c': ''.join(COMP.get(r.get('compound'), '?') for r in L),
                 'life': [r['life'] if isinstance(r.get('life'), int) else 0 for r in L], 's': [r['stint'] if isinstance(r.get('stint'), int) else 0 for r in L],
                 'f': [flags(r) for r in L], 'vst': [int(num(r.get('vst')) or 0) for r in L]}
            if valid:
                bt, bl = min(valid); e['best'] = {'lap': bl, 'ms': ms(bt)}
                for tt, ll in sorted(valid)[:4]:
                    if tt > bt * 1.015: break
                    m = lap_metrics(ev, folder, d, ll, cid, tt)
                    if m: e['best'].update({'mlap': ll, **m}); break
            S[d] = e
        if S: out[key] = S
    return out

# ── Ghost Lap (come tools/make_realdata.py) ───────────────────────────
def fastest_laps(ev, n):
    Q = f'{ev}/Qualifying/'; out = []
    for f in sorted(p for p in TREE if p.startswith(Q) and p.endswith('/laptimes.json')):
        x = load(f); drv = f.split('/')[-2]
        if not x: continue
        dl = x.get('del') or [False] * len(x['time'])
        v = [(t, l) for t, l, d in zip(x['time'], x['lap'], dl) if isinstance(t, (int, float)) and t and not d]
        if v:
            t, l = min(v); i = x['lap'].index(l)
            out.append({'time': t, 'drv': drv, 'lap': l, 'compound': x['compound'][i], 'team': x['team'][i], 'sectors': [x['s1'][i], x['s2'][i], x['s3'][i]], 'vst': x['vst'][i]})
    out.sort(key=lambda r: r['time']); return out[:n]
def telemetry(ev, drv, lap):
    x = load(f'{ev}/Qualifying/{drv}/{lap}_tel.json')
    if not x: return None
    t = x['tel']
    return {'d': [max(0.0, v or 0) for v in t['distance']], 't': [v or 0 for v in t['time']], 'v': [v or 0 for v in t['speed']],
            'thr': [min(100, max(0, v or 0)) for v in t['throttle']], 'brk': [1 if v else 0 for v in t['brake']], 'g': [v or 0 for v in t['gear']],
            'x': [v or 0 for v in t['x']], 'y': [v or 0 for v in t['y']]}
def ghost(i, ev, n=8):
    cid = CIRCUIT_IDS[i]; LEN = CIRC[cid]['len']; laps = {}; first = None
    for r in fastest_laps(ev, n):
        L = telemetry(ev, r['drv'], r['lap'])
        if not L or len(L['d']) < 50 or not L['d'][-1]: continue
        first = first or L
        end = L['d'][-1]
        laps[r['drv']] = {'lap': r['lap'], 'time': r['time'], 'compound': r['compound'], 'team': r['team'], 'sectors': r['sectors'], 'vst': r['vst'],
                          'd': [rnd(v * LEN / end, 1, 0) for v in L['d']], 't': [rnd(v, 3, 0) for v in L['t']], 'v': [rnd(v) for v in L['v']],
                          'thr': [rnd(v) for v in L['thr']], 'brk': L['brk'], 'g': [rnd(v) for v in L['g']], 'x': [rnd(v) for v in L['x']], 'y': [rnd(v) for v in L['y']]}
    if len(laps) < 2: return None
    cj = load(f'{ev}/Qualifying/corners.json')
    if cj:
        rot = cj['Rotation'][0] if isinstance(cj['Rotation'], list) else cj['Rotation']
        corners = [{'n': int(c), 'd': round(d, 1), 'x': round(x), 'y': round(y), 'detected': False} for c, d, x, y in zip(cj['CornerNumber'], cj['Distance'], cj['X'], cj['Y'])]
    else:
        rot = 0; corners = [{'n': c['n'], 'd': c['d'], 'x': c['x'], 'y': c['y'], 'detected': True} for c in GUIDE[cid]['corners']]
    name = (GP[i] if i < len(GP) else ev) + ' 2026 · Qualifiche'
    return {'id': cid + '-2026-q', 'name': name, 'circuitId': cid, 'source': SOURCE, 'laps': laps, 'rotation': rot,
            'cornersDetected': not cj, 'corners': corners}

def dump(path, data):
    text = json.dumps(data, separators=(',', ':'), ensure_ascii=False)
    os.makedirs(OUT, exist_ok=True)
    open(os.path.join(OUT, path), 'w', encoding='utf-8').write(text)
    return hashlib.sha1(text.encode('utf-8')).hexdigest()[:12]

weekend = {'races': [], 'quali': [], 'practice': {}}
with_quali, with_fp = [], []
for i in range(len(EVENTS)):
    ev = folder(i)
    if not any(p.startswith(ev + '/') for p in TREE): continue
    r = race(i, ev)
    if r: weekend['races'].append(r)
    q = quali(i, ev)
    if q: weekend['quali'].append(q); with_quali.append(i)
    if any(p.startswith(f'{ev}/Practice ') for p in TREE): with_fp.append(i)
for i in with_fp[-3:][::-1]:
    p = practice(folder(i), CIRCUIT_IDS[i])
    if p: weekend['practice'][CIRCUIT_IDS[i]] = p
ghosts = []
for i in with_quali[-2:][::-1]:
    g = ghost(i, folder(i))
    if not g: continue
    cid = CIRCUIT_IDS[i]
    ghosts.append({'id': g['id'], 'circuitId': cid, 'round': i + 1, 'place': PLACE[cid], 'h': dump(f'ghost-{cid}.json', g)})
index = {'weekend': {'h': dump('weekend.json', weekend), 'races': [r['round'] for r in weekend['races']], 'quali': [q['round'] for q in weekend['quali']],
                     'practice': list(weekend['practice'].keys())},
         'ghosts': ghosts, 'source': SOURCE}
keep = {'index.json', 'weekend.json'} | {f"ghost-{g['circuitId']}.json" for g in ghosts}
for f in os.listdir(OUT):
    if f not in keep: os.remove(os.path.join(OUT, f))   # Ghost Lap più vecchi: non servono più
open(os.path.join(OUT, 'index.json'), 'w', encoding='utf-8').write(json.dumps(index, ensure_ascii=False, indent=1) + '\n')
print('gare', index['weekend']['races'], 'qualifiche', index['weekend']['quali'], 'prove', index['weekend']['practice'],
      'ghost', [g['place'] for g in ghosts])
