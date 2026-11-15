# Replay sulla mappa delle gare finite (15/11, Edoardo: "copiare quel sito ... nella sezione replay delle gare quando
# sono finite"). Da OpenF1 (dati storici gratis dal 2023, api.openf1.org) per ogni gara:
#   public/data/replay/<session_key>.json: il disegno del tracciato (dal giro più pulito del vincitore), per ogni pilota
#     i metri percorsi lungo la pista a ogni secondo scritti come differenze dal secondo prima, gomme, pit, stato della
#     pista (Safety Car, VSC, rossa) e classifica finale; l'app li fa scorrere (src/logic/track-replay.js);
#   public/data/replay/index.json: le gare che ci sono.
# Solo gare finite. Lo fa girare il workflow .github/workflows/replay-f1.yml (dopo ogni GP e a mano).
# Uso: ANNI=2026 python3 tools/openf1_replay.py   (oppure KEYS=11412)   Prove: python3 tools/openf1_replay_test.py
import hashlib, json, math, os, sys, time, urllib.request, urllib.error
from datetime import datetime, timezone, timedelta

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
OUT = os.path.join(ROOT, 'public', 'data', 'replay')
API = 'https://api.openf1.org/v1/'
SCALE = 0.1          # unità di OpenF1 → metri (circa decimetri)
PRE = 30             # secondi prima del via (le auto in griglia)

# ── calcoli (senza rete) ────────────────────────────────────────────────────────────────────────────────────────────
def track_line(points):
    """Punti di un giro → (linea chiusa, distanza progressiva di ogni punto, lunghezza del giro)."""
    line = []
    for p in points:
        p = (float(p[0]), float(p[1]))
        if not line or (abs(p[0] - line[-1][0]) + abs(p[1] - line[-1][1])) > 1e-9: line.append(p)
    if len(line) > 1 and line[0] == line[-1]: line.pop()
    cum, d = [0.0], 0.0
    for i in range(1, len(line)):
        d += math.dist(line[i - 1], line[i]); cum.append(d)
    return line, cum, d + math.dist(line[-1], line[0])

def project(line, cum, L, x, y, near=None, window=None):
    """Distanza lungo la pista del punto più vicino a (x, y); con near/window si cerca solo attorno a near."""
    best, bs, n = None, 0.0, len(line)
    for i in range(n):
        a, b = line[i], line[(i + 1) % n]
        s0 = cum[i]; seg = (cum[i + 1] if i + 1 < n else L) - s0
        dx, dy = b[0] - a[0], b[1] - a[1]
        u = 0.0 if seg <= 0 else max(0.0, min(1.0, ((x - a[0]) * dx + (y - a[1]) * dy) / (seg * seg)))
        s = s0 + u * seg
        if near is not None and window is not None:
            dd = abs(s - near) % L
            if min(dd, L - dd) > window: continue
        d2 = (a[0] + u * dx - x) ** 2 + (a[1] + u * dy - y) ** 2
        if best is None or d2 < best: best, bs = d2, s
    return bs % L if best is not None else project(line, cum, L, x, y)

def progress_series(samples, line, cum, L, window=1500, gap=5):
    """[(t, x, y)] in ordine di tempo → [(t, progresso)]: distanza percorsa dal traguardo (negativa in griglia)."""
    out, laps, prev, pt = [], 0, None, None
    for t, x, y in samples:
        if prev is None:
            s = project(line, cum, L, x, y); laps = 0 if s > 0.5 * L else 1
        else:
            s = project(line, cum, L, x, y, near=prev, window=window) if t - pt < gap else project(line, cum, L, x, y)
            if prev > 0.7 * L and s < 0.3 * L: laps += 1
            elif prev < 0.3 * L and s > 0.7 * L: laps -= 1
        out.append((t, s + (laps - 1) * L)); prev, pt = s, t
    return out

def per_second(ser, t0, t1, scale=SCALE):
    """Progresso a ogni secondo intero da t0 a t1 (compresi), in metri interi."""
    out, j = [], 0
    for k in range(int(t0), int(t1) + 1):
        if not ser: out.append(0); continue
        if k <= ser[0][0]: p = ser[0][1]
        elif k >= ser[-1][0]: p = ser[-1][1]
        else:
            while ser[j + 1][0] < k: j += 1
            (ta, pa), (tb, pb) = ser[j], ser[j + 1]
            p = pa + (pb - pa) * (k - ta) / (tb - ta) if tb > ta else pb
        out.append(int(round(p * scale)))
    return out

def deltas(v): return [v[0]] + [v[i] - v[i - 1] for i in range(1, len(v))] if v else []
def undeltas(d):
    out, s = [], 0
    for x in d: s += x; out.append(s)
    return out

def track_status(msgs, sec):
    """Messaggi della direzione gara → [[secondo, stato]] con stato sc | vsc | red | green (solo quando cambia)."""
    out, cur = [], 'green'
    for m in msgs or []:
        msg, flag, cat = str(m.get('message') or '').upper(), str(m.get('flag') or '').upper(), str(m.get('category') or '')
        scope = str(m.get('scope') or 'Track')
        new = None
        if cat == 'SafetyCar':
            if 'VIRTUAL SAFETY CAR DEPLOYED' in msg: new = 'vsc'
            elif 'VIRTUAL SAFETY CAR ENDING' in msg: new = 'green'
            elif 'SAFETY CAR DEPLOYED' in msg: new = 'sc'
        elif flag == 'RED': new = 'red'
        elif (flag == 'GREEN' and scope == 'Track') or 'TRACK CLEAR' in msg: new = 'green'
        if new and new != cur:
            out.append([sec(m.get('date')), new]); cur = new
    return out

def quality(rec, lap_share=0.8, order_share=0.25):
    """Si pubblica solo un replay che torna coi dati ufficiali: giri di ognuno (±1) per almeno l'80% dei piloti e ordine
    d'arrivo (chi completa i suoi giri prima) diverso da quello ufficiale per al massimo il 25% (penalità comprese)."""
    L = rec.get('L') or 0
    ds = [d for d in rec.get('drivers', []) if d.get('laps') is not None]
    if not L or not ds: return False, 'senza giri ufficiali'
    good, fin = 0, []
    for d in ds:
        v = undeltas(d.get('p') or [])
        top = max(v) if v else 0
        if abs(math.floor(top / L + 1e-9) - d['laps']) <= 1: good += 1
        if d.get('pos') is not None:
            t = next((k for k, x in enumerate(v) if x >= d['laps'] * L - 2), None)
            fin.append((d['pos'], -d['laps'], t if t is not None else 10 ** 9, d.get('code')))
    if good < lap_share * len(ds): return False, f'giri che non tornano: {good}/{len(ds)} giusti'
    official = [x[3] for x in sorted(fin)]
    data = [x[3] for x in sorted(fin, key=lambda x: (x[1], x[2]))]
    diff = sum(1 for a, b in zip(official, data) if a != b)
    if fin and diff > order_share * len(fin): return False, f'arrivo diverso da quello ufficiale: {diff}/{len(fin)}'
    return True, 'ok'

# ── OpenF1 ──────────────────────────────────────────────────────────────────────────────────────────────────────────
def iso(d): return datetime.fromisoformat(str(d).replace('Z', '+00:00'))

def fetch(path, tries=4):
    for k in range(tries):
        try:
            time.sleep(2.1)                       # versione gratuita: al massimo 30 richieste al minuto
            with urllib.request.urlopen(API + path, timeout=120) as r:
                return json.loads(r.read().decode())
        except urllib.error.HTTPError as e:
            if e.code == 404: return []
            if e.code == 429 or e.code >= 500: time.sleep(15 * (k + 1)); continue
            raise
        except urllib.error.URLError:
            time.sleep(10 * (k + 1))
    raise RuntimeError('OpenF1 non risponde: ' + path)

def convert(key, get=fetch):
    import fastf1_archivio as A                    # nomi italiani e circuiti dell'app
    sess = (get(f'sessions?session_key={key}') or [None])[0]
    if not sess: raise RuntimeError(f'sessione {key} non trovata')
    meet = (get(f'meetings?meeting_key={sess["meeting_key"]}') or [{}])[0]
    drivers = get(f'drivers?session_key={key}')
    laps = get(f'laps?session_key={key}')
    res = get(f'session_result?session_key={key}')
    stints = get(f'stints?session_key={key}')
    pits = get(f'pit?session_key={key}')
    rc = sorted(get(f'race_control?session_key={key}'), key=lambda m: m['date'])
    starts = [iso(l['date_start']) for l in laps if l.get('lap_number') == 1 and l.get('date_start')]
    ends = [iso(l['date_start']) + timedelta(seconds=l['lap_duration']) for l in laps if l.get('date_start') and l.get('lap_duration')]
    if not starts or not ends: raise RuntimeError(f'sessione {key}: mancano i giri')
    T0, T1 = min(starts), max(ends) + timedelta(seconds=20)
    sec = lambda d: int(round((iso(d) - T0).total_seconds()))
    win = next((r for r in res if r.get('position') == 1), None)
    lo, hi = (T0 - timedelta(seconds=PRE + 5)).isoformat(), T1.isoformat()
    samples = {}
    for d in drivers:
        n = d['driver_number']
        rows = get(f'location?session_key={key}&driver_number={n}&date%3E={lo}&date%3C={hi}')
        samples[n] = sorted(((iso(p['date']) - T0).total_seconds(), p['x'], p['y']) for p in rows if p.get('x') or p.get('y'))
    # tracciato: il giro più veloce del vincitore che non sia d'uscita dai box
    wn = win['driver_number'] if win else drivers[0]['driver_number']
    cand = [l for l in laps if l.get('driver_number') == wn and l.get('lap_duration') and l.get('lap_number', 0) > 1 and not l.get('is_pit_out_lap')]
    best = min(cand, key=lambda l: l['lap_duration'])
    b0 = (iso(best['date_start']) - T0).total_seconds(); b1 = b0 + best['lap_duration']
    pts = [(x, y) for t, x, y in samples[wn] if b0 <= t <= b1]
    line, cum, L = track_line(pts)
    total = win.get('number_of_laps') if win else max(l['lap_number'] for l in laps)
    dur = int(math.ceil((T1 - T0).total_seconds()))
    by_n = {r['driver_number']: r for r in res}
    out_drivers = []
    for d in drivers:
        n = d['driver_number']; r = by_n.get(n, {})
        ser = progress_series(samples.get(n, []), line, cum, L)
        prog = per_second(ser, -PRE, dur)
        status = 'DSQ' if r.get('dsq') else 'DNS' if r.get('dns') else 'RIT' if r.get('dnf') else ''
        st = sorted(([s['lap_start'], s['lap_end'], str(s.get('compound') or '')[:1]] for s in stints if s.get('driver_number') == n and s.get('lap_start')), key=lambda x: x[0])
        out_drivers.append({'n': n, 'code': d.get('name_acronym'), 'name': d.get('full_name'), 'team': d.get('team_name'),
                            'color': '#' + str(d.get('team_colour') or '8E8E96'), 'pos': r.get('position') if not status else None,
                            'status': status, 'laps': r.get('number_of_laps'), 'stints': st, 'p': deltas(prog)})
    mx, my = min(p[0] for p in line), min(p[1] for p in line)
    loc = str(sess.get('location') or '')
    cid = A.CIRCUIT.get(loc)
    known = set(json.load(open(os.path.join(ROOT, 'src', 'data', 'circuits.json'))).keys())
    return {'v': 1, 'key': key, 'year': sess.get('year'), 'name': A.italian(meet.get('meeting_name')), 'place': loc,
            'circuitId': cid if cid in known else None, 'date': sess['date_start'][:10], 't0': T0.isoformat(), 'start': -PRE, 'dur': dur,
            'laps': total, 'L': round(L * SCALE, 1),
            'line': [[round((x - mx) * SCALE, 1), round((y - my) * SCALE, 1)] for x, y in line],
            'drivers': out_drivers,
            'pits': [[sec(p['date']), p['driver_number'], p.get('lap_number'), p.get('pit_duration')] for p in pits if p.get('date')],
            'status': track_status(rc, sec),
            'source': 'OpenF1 (api.openf1.org), dati del live timing di Formula 1'}

def dump(name, obj):
    os.makedirs(OUT, exist_ok=True)
    text = json.dumps(obj, ensure_ascii=False, separators=(',', ':'))
    open(os.path.join(OUT, name), 'w', encoding='utf-8').write(text)
    return text

def write_index():
    races = []
    for f in sorted(os.listdir(OUT)):
        if not f[:1].isdigit() or not f.endswith('.json'): continue
        text = open(os.path.join(OUT, f), encoding='utf-8').read(); j = json.loads(text)
        races.append({'key': j['key'], 'year': j['year'], 'date': j['date'], 'name': j['name'], 'place': j['place'],
                      'circuitId': j.get('circuitId'), 'laps': j['laps'], 'h': hashlib.sha1(text.encode('utf-8')).hexdigest()[:12], 'kb': len(text) // 1024})
    races.sort(key=lambda r: r['date'], reverse=True)
    dump('index.json', {'source': 'OpenF1', 'races': races})
    return races

def main():
    have = {int(f[:-5]) for f in os.listdir(OUT) if f[:-5].isdigit()} if os.path.isdir(OUT) else set()
    force = os.environ.get('FORCE') == '1'
    keys = [int(k) for k in os.environ.get('KEYS', '').split(',') if k.strip()]
    if not keys:
        import fastf1_archivio as A
        now = datetime.now(timezone.utc) - timedelta(hours=3)
        for y in A.years_of(os.environ.get('ANNI', str(datetime.now().year))):
            if y < 2023: continue                      # OpenF1 ha i dati dal 2023
            keys += [s['session_key'] for s in fetch(f'sessions?year={y}&session_name=Race') if s.get('date_end') and iso(s['date_end']) < now]
    for k in keys:
        if k in have and not force: continue
        try:
            rec = convert(k)
            ok, why = quality(rec)
            if not ok:                                  # replay che non torna: non si pubblica (resta il giro per giro)
                old = os.path.join(OUT, f'{k}.json')
                if os.path.exists(old): os.remove(old)
                print(f'{k}: salto ({why})'); continue
            text = dump(f'{k}.json', rec)
            print(f'{k}: ok ({len(text) // 1024} KB)')
        except Exception as e:
            print(f'{k}: salto ({e})')
    print('gare nel replay:', len(write_index()))

if __name__ == '__main__':
    sys.exit(main())
