# Archivio storico dei GP (14/11, Edoardo: "nell'archivio storico GP prendi dati da FastF1").
# FastF1 (github.com/theOehrly/Fast-F1: dati del live timing di Formula 1, giri e posizioni dal 2018) →
#   public/data/archivio/<anno>.json: le gare di quell'anno nello stesso formato di public/data/f1/weekend.json, più
#     nome, luogo, data, griglia e stato d'arrivo; src/logic/replay.js le fa riguardare giro per giro;
#   public/data/archivio/index.json: gli anni che ci sono, con un'impronta di ogni file.
# Lo fa girare il workflow .github/workflows/archivio-f1.yml (a mano: Actions → "Archivio storico F1" → Run workflow);
# con il push su tappa-3 Vercel pubblica i file e l'app li scarica (src/services/archive.js).
# Uso: pip install fastf1 && ANNI=2018-2025 python3 tools/fastf1_archivio.py
# Prove della conversione (senza rete né FastF1): python3 tools/fastf1_archivio_test.py
import hashlib, json, math, os, sys
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
OUT = os.path.join(ROOT, 'public', 'data', 'archivio')
SOURCE = "FastF1 (github.com/theOehrly/Fast-F1), dati del live timing di Formula 1"

# Scuderie di allora → colori dell'app (src/data/f1-2026.js); il nome vero resta in "tn".
TEAM = {'McLaren': 'mclaren', 'Red Bull Racing': 'redbull', 'Red Bull': 'redbull', 'Mercedes': 'mercedes', 'Ferrari': 'ferrari',
        'Williams': 'williams', 'Racing Bulls': 'racingbulls', 'RB': 'racingbulls', 'AlphaTauri': 'racingbulls',
        'Toro Rosso': 'racingbulls', 'Aston Martin': 'astonmartin', 'Racing Point': 'astonmartin', 'Force India': 'astonmartin',
        'Haas F1 Team': 'haas', 'Haas': 'haas', 'Audi': 'audi', 'Kick Sauber': 'audi', 'Sauber': 'audi', 'Alfa Romeo': 'audi',
        'Alfa Romeo Racing': 'audi', 'Alpine': 'alpine', 'Renault': 'alpine', 'Cadillac': 'cadillac'}
# Luogo di FastF1 → circuito dell'app (src/data/circuits.json); quelli che non ci sono restano senza.
CIRCUIT = {'Melbourne': 'au-1953', 'Shanghai': 'cn-2004', 'Suzuka': 'jp-1962', 'Miami': 'us-2022', 'Montréal': 'ca-1978',
           'Monaco': 'mc-1929', 'Monte Carlo': 'mc-1929', 'Barcelona': 'es-1991', 'Spielberg': 'at-1969', 'Silverstone': 'gb-1948',
           'Spa-Francorchamps': 'be-1925', 'Budapest': 'hu-1986', 'Zandvoort': 'nl-1948', 'Monza': 'it-1922', 'Baku': 'az-2016',
           'Marina Bay': 'sg-2008', 'Singapore': 'sg-2008', 'Austin': 'us-2012', 'Mexico City': 'mx-1962', 'São Paulo': 'br-1940',
           'Las Vegas': 'us-2023', 'Lusail': 'qa-2004', 'Yas Island': 'ae-2009', 'Yas Marina': 'ae-2009', 'Madrid': 'es-2026'}
NAME = {'Australian': "GP d'Australia", 'Chinese': 'GP di Cina', 'Japanese': 'GP del Giappone', 'Miami': 'GP di Miami',
        'Canadian': 'GP del Canada', 'Monaco': 'GP di Monaco', 'Spanish': 'GP di Spagna', 'Barcelona': 'GP di Barcellona',
        'Austrian': "GP d'Austria", 'Styrian': 'GP di Stiria', 'British': 'GP di Gran Bretagna', '70th Anniversary': 'GP del 70° anniversario',
        'Belgian': 'GP del Belgio', 'Hungarian': "GP d'Ungheria", 'Dutch': "GP d'Olanda", 'Italian': "GP d'Italia",
        'Emilia Romagna': "GP dell'Emilia-Romagna", 'Tuscan': 'GP di Toscana', 'Azerbaijan': "GP d'Azerbaigian",
        'Singapore': 'GP di Singapore', 'United States': 'GP degli Stati Uniti', 'Mexican': 'GP del Messico',
        'Mexico City': 'GP di Città del Messico', 'Brazilian': 'GP del Brasile', 'São Paulo': 'GP di San Paolo',
        'Las Vegas': 'GP di Las Vegas', 'Qatar': 'GP del Qatar', 'Abu Dhabi': 'GP di Abu Dhabi', 'Bahrain': 'GP del Bahrein',
        'Sakhir': 'GP di Sakhir', 'Saudi Arabian': "GP dell'Arabia Saudita", 'Portuguese': 'GP del Portogallo',
        'Russian': 'GP di Russia', 'French': 'GP di Francia', 'German': 'GP di Germania', 'Turkish': 'GP di Turchia',
        'Eifel': "GP dell'Eifel"}

def num(v):
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return None if math.isnan(f) else f
def ival(v):
    f = num(v)
    return int(f) if f is not None else None
def secs(v):
    # timedelta di Python o di pandas (NaT = None)
    if v is None: return None
    ts = getattr(v, 'total_seconds', None)
    if ts is None: return num(v)
    try:
        s = ts()
    except (TypeError, ValueError):
        return None
    return None if s is None or (isinstance(s, float) and math.isnan(s)) else s
def ms(v):
    s = secs(v)
    return int(round(s * 1000)) if s and s > 0 else 0
def flags(r):
    st = str(r.get('TrackStatus') or ''); f = 0
    if secs(r.get('PitInTime')) is not None: f |= 1     # giro di rientro ai box
    if secs(r.get('PitOutTime')) is not None: f |= 2    # giro di uscita dai box
    if '4' in st: f |= 4                                # Safety Car
    if '6' in st or '7' in st: f |= 8                   # Virtual Safety Car
    if '2' in st: f |= 16                               # bandiera gialla
    if '5' in st: f |= 32                               # bandiera rossa
    return f
def italian(event):
    key = str(event or '').replace(' Grand Prix', '').strip()
    return NAME.get(key, str(event or ''))

def race_record(rnd, info, laps, results):
    """Una gara: laps e results sono righe (dict) di session.laps e session.results di FastF1."""
    by = {}
    for r in laps or []:
        d = r.get('Driver')
        if not d or ival(r.get('LapNumber')) is None: continue
        by.setdefault(str(d), []).append(r)
    for d in by: by[d].sort(key=lambda r: ival(r.get('LapNumber')))
    drivers = {}
    for res in results or []:
        code = str(res.get('Abbreviation') or '').strip()
        if not code: continue
        L = by.get(code, [])
        cp = str(res.get('ClassifiedPosition') or '').strip()
        tn = str(res.get('TeamName') or '')
        grid = ival(res.get('GridPosition'))
        drivers[code] = {'team': TEAM.get(tn), 'tn': tn, 'name': str(res.get('FullName') or code), 'pos': int(cp) if cp.isdigit() else None,
                         'grid': grid if grid and grid > 0 else None, 'status': str(res.get('Status') or ''), 'n': len(L),
                         't': [ms(r.get('LapTime')) for r in L], 'p': [ival(r.get('Position')) for r in L], 'f': [flags(r) for r in L]}
    win = next((d for d in drivers.values() if d['pos'] == 1), None)
    total = win['n'] if win else max([d['n'] for d in drivers.values()] or [0])
    return {'round': rnd, 'name': italian(info.get('event')), 'place': info.get('place') or '', 'date': info.get('date') or '',
            'circuitId': info.get('circuitId'), 'laps': total, 'drivers': drivers}

def years_of(text):
    out = []
    for part in str(text or '').split(','):
        part = part.strip()
        if '-' in part:
            a, b = part.split('-', 1); out += list(range(int(a), int(b) + 1))
        elif part: out.append(int(part))
    return sorted(set(y for y in out if 2018 <= y <= date.today().year))

def dump(name, obj):
    os.makedirs(OUT, exist_ok=True)
    text = json.dumps(obj, ensure_ascii=False, separators=(',', ':'))
    open(os.path.join(OUT, name), 'w', encoding='utf-8').write(text)
    return hashlib.sha1(text.encode('utf-8')).hexdigest()[:12]

def write_index():
    years = []
    for f in sorted(os.listdir(OUT)) if os.path.isdir(OUT) else []:
        if not f[:4].isdigit() or not f.endswith('.json'): continue
        text = open(os.path.join(OUT, f), encoding='utf-8').read(); j = json.loads(text)
        years.append({'year': j['year'], 'races': len(j['races']), 'h': hashlib.sha1(text.encode('utf-8')).hexdigest()[:12]})
    dump('index.json', {'source': SOURCE, 'years': years})
    return years

LAP_COLS = ['Driver', 'LapNumber', 'LapTime', 'Position', 'PitInTime', 'PitOutTime', 'TrackStatus']
RES_COLS = ['Abbreviation', 'TeamName', 'FullName', 'Position', 'ClassifiedPosition', 'GridPosition', 'Status']

def main():
    import fastf1   # solo qui: le prove della conversione non ne hanno bisogno
    cache = os.environ.get('FF1_CACHE', os.path.join(os.path.expanduser('~'), 'ff1-cache'))
    os.makedirs(cache, exist_ok=True)
    fastf1.Cache.enable_cache(cache)
    known = set(json.load(open(os.path.join(ROOT, 'src', 'data', 'circuits.json'))).keys())
    today = date.today()
    for y in years_of(os.environ.get('ANNI', '2018-2025')):
        sched = fastf1.get_event_schedule(y, include_testing=False)
        races = []
        for _, ev in sched.iterrows():
            rnd = ival(ev.get('RoundNumber'))
            when = ev.get('EventDate')
            if not rnd or (when is not None and hasattr(when, 'date') and when.date() >= today): continue
            try:
                s = fastf1.get_session(y, rnd, 'R')
                s.load(laps=True, telemetry=False, weather=False, messages=False)
                laps = s.laps[[c for c in LAP_COLS if c in s.laps.columns]].to_dict('records')
                res = s.results[[c for c in RES_COLS if c in s.results.columns]].to_dict('records')
            except Exception as e:   # gara che FastF1 non ha: si salta e si va avanti
                print(f'{y} round {rnd}: salto ({e})'); continue
            loc = str(ev.get('Location') or '')
            cid = CIRCUIT.get(loc)
            info = {'event': ev.get('EventName'), 'place': loc, 'date': when.date().isoformat() if hasattr(when, 'date') else '',
                    'circuitId': cid if cid in known else None}
            races.append(race_record(rnd, info, laps, res))
            print(f'{y} round {rnd}: {info["event"]} ok ({len(laps)} giri in tutto)')
        if races: dump(f'{y}.json', {'year': y, 'source': SOURCE, 'races': races})
    print('anni nell\'archivio:', [x['year'] for x in write_index()])

if __name__ == '__main__':
    sys.exit(main())
