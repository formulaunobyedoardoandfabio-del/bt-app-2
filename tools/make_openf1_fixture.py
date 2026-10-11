# Prova del servizio OpenF1 (src/services/openf1.js): la gara vera di Baku 2026 presa da TracingInsights/2026 su GitHub
# (licenza Apache 2.0; dati FastF1 dal live timing di Formula 1, tempi di gara e posizioni corretti con Ergast/Jolpica)
# e messa negli stessi elenchi di OpenF1 (api.openf1.org/v1), che da qui non si raggiunge.
# Uso: python3 tools/make_openf1_fixture.py
#   → test/fixtures/openf1-baku-race.json      { session, drivers, laps, stints, pit, position, intervals,
#                                                race_control, team_radio, weather, session_result }
#   → test/fixtures/openf1-car-data-rus-10.json car_data del giro 10 di Russell
# Cose che OpenF1 avrebbe e TracingInsights no (scritte qui, segnate nella nota del file):
#   - session_key e meeting_key (non sono quelli veri di OpenF1);
#   - posizioni e distacchi solo a fine giro (OpenF1 li dà più spesso), niente griglia di partenza;
#   - risultato dall'ordine d'arrivo in pista, senza le penalità date dopo la gara;
#   - tre radio inventate con "fixture": true, solo per le prove (l'audio non esiste).
import datetime, json, math, os, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'test', 'fixtures')
TI = '/home/claude/tracinginsights/2026'
EV = 'Azerbaijan Grand Prix/Race'
SESSION_KEY, MEETING_KEY = 99915, 9915
DATE_START = datetime.datetime(2026, 9, 26, 11, 0, 0)        # partenza ufficiale: 15:00 a Baku (UTC+4)
DATE_END = DATE_START + datetime.timedelta(hours=2)
GMT_OFFSET = '04:00:00'


def load(path):
    full = os.path.join(TI, path)
    if not os.path.exists(full):
        subprocess.run(['git', '-c', 'core.quotepath=false', '-C', TI, 'checkout', 'FETCH_HEAD', '--', path], capture_output=True)
    return json.load(open(full))


def num(v):
    return v if isinstance(v, (int, float)) and not isinstance(v, bool) and not (isinstance(v, float) and math.isnan(v)) else None


def rows(x):
    keys = list(x.keys())
    return [{k: x[k][i] for k in keys} for i in range(len(x[keys[0]]))]


def parse_date(s):
    return datetime.datetime.fromisoformat(str(s)[:26]) if s not in (None, 'None') else None


def iso(dt):
    return dt.isoformat(timespec='microseconds') + '+00:00'


def r3(v):
    return None if v is None else round(v, 3)


# Minisettori di TracingInsights (ms1..ms3: una cifra per minisettore) → valori di OpenF1 (segments_sector_N).
SEG = {'0': 2048, '1': 2049, '2': 2050, '3': 2051, '4': 2052, '5': 2064, '6': 2068, '7': 0}


def segments(ms):
    s = str(ms)
    return [SEG[ch] for ch in s] if s and all(ch in SEG for ch in s) else None


laps_raw = [r for r in rows(load(f'{EV}/session_laptimes.json')) if r['drv'] not in (None, 'None')]
drivers_raw = load(f'{EV}/drivers.json')['drivers']
rcm_raw = rows(load(f'{EV}/rcm.json'))
weather_raw = rows(load(f'{EV}/weather.json'))
tel_raw = load(f'{EV}/RUS/10_tel.json')['tel']

# Ora zero dei tempi di sessione di FastF1 (lST, sesT, pin, pout, wT): data di inizio giro meno tempo di inizio giro.
ref = next(r for r in laps_raw if parse_date(r['lSD']) and num(r['lST']) is not None)
T0 = parse_date(ref['lSD']) - datetime.timedelta(seconds=ref['lST'])
at = lambda sec: T0 + datetime.timedelta(seconds=sec)
base = {'meeting_key': MEETING_KEY, 'session_key': SESSION_KEY}

session = {**base, 'session_name': 'Race', 'session_type': 'Race', 'date_start': iso(DATE_START), 'date_end': iso(DATE_END),
           'gmt_offset': GMT_OFFSET, 'circuit_key': 144, 'circuit_short_name': 'Baku', 'location': 'Baku',
           'country_code': 'AZE', 'country_key': 30, 'country_name': 'Azerbaijan', 'year': 2026}

drivers = [{**base, 'driver_number': int(d['dn']), 'broadcast_name': f"{d['fn'][0]} {d['ln'].upper()}", 'full_name': f"{d['fn']} {d['ln'].upper()}",
            'name_acronym': d['driver'], 'team_name': d['team'], 'team_colour': d['tc'], 'first_name': d['fn'], 'last_name': d['ln'],
            'country_code': None} for d in drivers_raw]

# Giri: senza quelli aggiunti da FastF1 (ff1G), tranne il primo, che resta senza tempo come il giro in cui un pilota
# si ferma su OpenF1.
by_drv = {}
for r in laps_raw:
    by_drv.setdefault(r['drv'], []).append(r)
for d in by_drv:
    by_drv[d].sort(key=lambda r: r['lap'])
    kept, gen = [], False
    for r in by_drv[d]:
        if r['ff1G'] is True:
            if gen: continue
            gen = True
            r = {**r, 'time': None, 's1': None, 's2': None, 's3': None, 'ms1': None, 'ms2': None, 'ms3': None, 'pos': None, 'sesT': None}
        kept.append(r)
    by_drv[d] = kept


def start_of(r):
    d = parse_date(r['lSD'])
    if d: return d
    return at(r['lST']) if num(r['lST']) is not None else None


def end_of(r):
    if num(r['sesT']) is not None: return at(r['sesT'])
    s = start_of(r)
    return s + datetime.timedelta(seconds=r['time']) if s and num(r['time']) else None


laps, stints, pit, ends = [], [], [], {}
for d, L in by_drv.items():
    dn = int(L[0]['dNum'])
    cur = None
    for i, r in enumerate(L):
        s = start_of(r)
        laps.append({**base, 'driver_number': dn, 'lap_number': r['lap'], 'date_start': iso(s) if s else None,
                     'lap_duration': r3(num(r['time'])), 'duration_sector_1': r3(num(r['s1'])), 'duration_sector_2': r3(num(r['s2'])),
                     'duration_sector_3': r3(num(r['s3'])), 'i1_speed': num(r['vi1']), 'i2_speed': num(r['vi2']), 'st_speed': num(r['vst']),
                     'is_pit_out_lap': num(r['pout']) is not None,
                     'segments_sector_1': segments(r['ms1']), 'segments_sector_2': segments(r['ms2']), 'segments_sector_3': segments(r['ms3'])})
        ends[(d, r['lap'])] = end_of(r)
        st = r['stint'] if isinstance(r['stint'], int) else (cur['stint_number'] if cur else 1)
        if not cur or cur['stint_number'] != st:
            life = num(r['life'])
            cur = {**base, 'driver_number': dn, 'stint_number': st, 'compound': r['compound'] if r['compound'] not in (None, 'None') else 'UNKNOWN',
                   'lap_start': r['lap'], 'lap_end': r['lap'], 'tyre_age_at_start': int(life - 1) if life else 0}
            stints.append(cur)
        cur['lap_end'] = r['lap']
        if num(r['pin']) is not None:
            nxt = L[i + 1] if i + 1 < len(L) else None
            lane = r3(nxt['pout'] - r['pin']) if nxt and num(nxt['pout']) is not None else None
            pit.append({**base, 'driver_number': dn, 'lap_number': r['lap'], 'date': iso(at(r['pin'])),
                        'lane_duration': lane, 'pit_duration': lane, 'stop_duration': None})

# Posizioni e distacchi a fine giro (OpenF1 li dà più spesso: qui bastano per la classifica giro per giro).
position, intervals = [], []
last_pos = {}
lap_end_by_pos = {}     # (giro, posizione) → (pilota, fine del giro)
for d, L in by_drv.items():
    for r in L:
        if isinstance(r['pos'], int) and ends.get((d, r['lap'])):
            lap_end_by_pos[(r['lap'], r['pos'])] = (d, ends[(d, r['lap'])])
for d, L in by_drv.items():
    dn = int(L[0]['dNum'])
    for r in L:
        e = ends.get((d, r['lap']))
        if not isinstance(r['pos'], int) or not e: continue
        if last_pos.get(d) != r['pos']:
            position.append({**base, 'driver_number': dn, 'date': iso(e), 'position': r['pos']})
            last_pos[d] = r['pos']
        lead = lap_end_by_pos.get((r['lap'], 1))
        if not lead: continue
        down = 0
        while ends.get((lead[0], r['lap'] + down + 1)) and ends[(lead[0], r['lap'] + down + 1)] <= e: down += 1
        gap = 0 if r['pos'] == 1 else (f"+{down} LAP{'S' if down > 1 else ''}" if down else r3((e - lead[1]).total_seconds()))
        ahead = lap_end_by_pos.get((r['lap'], r['pos'] - 1))
        if r['pos'] == 1: iv = 0
        elif not ahead: iv = None
        elif ends.get((ahead[0], r['lap'] + 1)) and ends[(ahead[0], r['lap'] + 1)] <= e: iv = '+1 LAP'
        else: iv = r3((e - ahead[1]).total_seconds())
        intervals.append({**base, 'driver_number': dn, 'date': iso(e), 'gap_to_leader': gap, 'interval': iv})
position.sort(key=lambda x: x['date']); intervals.sort(key=lambda x: x['date'])
laps.sort(key=lambda x: (x['driver_number'], x['lap_number'])); pit.sort(key=lambda x: x['date'])

race_control = [{**base, 'date': iso(parse_date(m['time'])), 'driver_number': int(m['dNum']) if m['dNum'] not in (None, 'None') else None,
                 'lap_number': m['lap'] if isinstance(m['lap'], int) else None, 'category': m['cat'],
                 'flag': m['flag'] if m['flag'] not in (None, 'None') else None, 'scope': m['scope'] if m['scope'] not in (None, 'None') else None,
                 'sector': int(m['sector']) if num(m['sector']) is not None else None, 'message': m['msg']} for m in rcm_raw]
race_control.sort(key=lambda x: x['date'])

weather = [{**base, 'date': iso(at(w['wT'])), 'air_temperature': w['wAT'], 'track_temperature': w['wTT'], 'humidity': w['wH'],
            'pressure': w['wP'], 'rainfall': 1 if w['wR'] is True else 0, 'wind_direction': w['wWD'], 'wind_speed': w['wWS']} for w in weather_raw]

# Tre radio inventate (l'audio non esiste): servono solo a provare la scheda Radio e il rilevatore di bluff.
def radio(code, lap, dn, tag):
    r = next(x for x in by_drv[code] if x['lap'] == lap)
    when = start_of(r) + datetime.timedelta(seconds=40)
    stamp = (when + datetime.timedelta(hours=4)).strftime('%Y%m%d_%H%M%S')
    return {**base, 'driver_number': dn, 'date': iso(when), 'fixture': True,
            'recording_url': f"https://livetiming.formula1.com/static/2026/2026-09-26_Azerbaijan_Grand_Prix/2026-09-26_Race/TeamRadio/{tag}_{dn}_{stamp}.mp3"}
team_radio = [radio('RUS', 20, 63, 'GEORUS01'), radio('LEC', 28, 16, 'CHALEC01'), radio('VER', 45, 3, 'MAXVER01')]

# Risultato: chi prende la bandiera a scacchi in ordine di arrivo; poi chi si è fermato dopo aver fatto almeno il 90%
# dei giri del vincitore (classificato, ma ritirato), poi gli altri ritirati.
winner = next(d for d, L in by_drv.items() if any(r['lap'] and r['pos'] == 1 for r in L[-1:]))
win_laps = by_drv[winner][-1]['lap']
chequered = ends[(winner, win_laps)]
total = lambda d: sum(num(r['time']) or 0 for r in by_drv[d])
done = lambda d: sum(1 for r in by_drv[d] if num(r['time']) is not None)
fin, out = [], []
for d, L in by_drv.items():
    last = L[-1]
    e = ends.get((d, last['lap']))
    (fin if isinstance(last['pos'], int) and e and e >= chequered else out).append(d)
fin.sort(key=lambda d: by_drv[d][-1]['pos'])
out.sort(key=lambda d: (-done(d), ends.get((d, by_drv[d][-1]['lap'])) or chequered))
session_result, pos = [], 0
for d in fin:
    pos += 1
    down = win_laps - by_drv[d][-1]['lap']
    session_result.append({**base, 'driver_number': int(by_drv[d][0]['dNum']), 'position': pos, 'number_of_laps': by_drv[d][-1]['lap'],
                           'duration': r3(total(d)), 'gap_to_leader': 0 if pos == 1 else (f"+{down} LAP{'S' if down > 1 else ''}" if down else r3(total(d) - total(winner))),
                           'dnf': False, 'dns': False, 'dsq': False})
for d in out:
    classified = done(d) >= math.floor(win_laps * 0.9)
    if classified: pos += 1
    session_result.append({**base, 'driver_number': int(by_drv[d][0]['dNum']), 'position': pos if classified else None, 'number_of_laps': done(d),
                           'duration': None, 'gap_to_leader': None, 'dnf': True, 'dns': False, 'dsq': False})

nota = ("Prova del servizio OpenF1: gara vera di Baku 2026 (TracingInsights/2026, licenza Apache 2.0) messa nella forma di OpenF1 "
        "da tools/make_openf1_fixture.py. session_key e meeting_key non sono quelli veri; posizioni e distacchi solo a fine giro; "
        "risultato senza le penalità date dopo la gara; "
        "le tre radio sono inventate (\"fixture\": true).")
data = {'_nota': nota, 'session': session, 'drivers': drivers, 'laps': laps, 'stints': stints, 'pit': pit, 'position': position,
        'intervals': intervals, 'race_control': race_control, 'team_radio': team_radio, 'weather': weather, 'session_result': session_result}

# car_data del giro 10 di Russell (la telemetria di TracingInsights parte dall'inizio del giro).
r10 = next(r for r in by_drv['RUS'] if r['lap'] == 10)
s10 = start_of(r10)
car = [{**base, 'driver_number': 63, 'date': iso(s10 + datetime.timedelta(seconds=tel_raw['time'][i])), 'speed': int(round(tel_raw['speed'][i])),
        'throttle': int(round(tel_raw['throttle'][i])), 'brake': 100 if tel_raw['brake'][i] else 0, 'n_gear': int(tel_raw['gear'][i]),
        'rpm': int(round(tel_raw['rpm'][i])), 'drs': 0} for i in range(len(tel_raw['time']))]


def write(name, obj):
    # Un elemento per riga: si legge e si confronta meglio.
    def dump(v): return json.dumps(v, ensure_ascii=False, separators=(',', ':'))
    if isinstance(obj, list):
        text = '[\n' + ',\n'.join(dump(x) for x in obj) + '\n]\n'
    else:
        parts = []
        for k, v in obj.items():
            if isinstance(v, list) and v:
                parts.append(f'{dump(k)}:[\n' + ',\n'.join(dump(x) for x in v) + '\n]')
            else:
                parts.append(f'{dump(k)}:{dump(v)}')
        text = '{\n' + ',\n'.join(parts) + '\n}\n'
    with open(os.path.join(OUT, name), 'w') as f: f.write(text)
    print(f'{name}: {len(text) // 1024} KB')


write('openf1-baku-race.json', data)
write('openf1-car-data-rus-10.json', car)
print('giri', len(laps), 'stint', len(stints), 'soste', len(pit), 'posizioni', len(position), 'distacchi', len(intervals),
      'direzione gara', len(race_control), 'meteo', len(weather), 'risultato', [(x['driver_number'], x['position'], x['dnf']) for x in session_result][:3])
