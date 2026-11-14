# Prove della conversione di tools/fastf1_archivio.py (righe come quelle di session.laps e session.results di FastF1),
# senza rete né FastF1. Uso: python3 tools/fastf1_archivio_test.py
import math, os, sys, unittest
from datetime import timedelta
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fastf1_archivio as A

NAN = float('nan')
def lap(d, n, sec, pos, ts='1', pin=None, pout=None):
    return {'Driver': d, 'LapNumber': float(n), 'LapTime': timedelta(seconds=sec) if sec else None, 'Position': pos,
            'TrackStatus': ts, 'PitInTime': pin, 'PitOutTime': pout}
LAPS = [lap('VER', 1, 95.1, 1.0), lap('VER', 2, 91.0, 1.0, ts='4'), lap('VER', 3, 90.5, 1.0),
        lap('LEC', 2, 91.2, 2.0, ts='4', pin=timedelta(seconds=3000)), lap('LEC', 1, 95.4, 2.0), lap('LEC', 3, None, NAN, pout=timedelta(seconds=3100)),
        lap('ALO', 1, 96.0, 3.0)]
RES = [{'Abbreviation': 'VER', 'TeamName': 'Red Bull Racing', 'FullName': 'Max Verstappen', 'Position': 1.0, 'ClassifiedPosition': '1', 'GridPosition': 2.0, 'Status': 'Finished'},
       {'Abbreviation': 'LEC', 'TeamName': 'Ferrari', 'FullName': 'Charles Leclerc', 'Position': 2.0, 'ClassifiedPosition': '2', 'GridPosition': 1.0, 'Status': 'Finished'},
       {'Abbreviation': 'ALO', 'TeamName': 'Alpine', 'FullName': 'Fernando Alonso', 'Position': 20.0, 'ClassifiedPosition': 'R', 'GridPosition': 0.0, 'Status': 'Engine'}]

class Conversione(unittest.TestCase):
    def setUp(self):
        self.r = A.race_record(5, {'event': 'Italian Grand Prix', 'place': 'Monza', 'date': '2021-09-12', 'circuitId': 'it-1922'}, LAPS, RES)

    def test_gara(self):
        r = self.r
        self.assertEqual((r['round'], r['name'], r['place'], r['circuitId'], r['laps']), (5, "GP d'Italia", 'Monza', 'it-1922', 3))

    def test_giri_in_ordine_tempi_e_posizioni(self):
        v = self.r['drivers']['LEC']
        self.assertEqual(v['n'], 3)
        self.assertEqual(v['t'], [95400, 91200, 0], 'giri in ordine; tempo che manca = 0')
        self.assertEqual(v['p'], [2, 2, None], 'posizione che manca = null')

    def test_segni_dei_giri(self):
        self.assertEqual(self.r['drivers']['VER']['f'], [0, 4, 0], 'Safety Car al giro 2')
        self.assertEqual(self.r['drivers']['LEC']['f'], [0, 4 | 1, 2], 'rientro e uscita dai box')

    def test_classifica_scuderie_griglia(self):
        d = self.r['drivers']
        self.assertEqual((d['VER']['pos'], d['VER']['team'], d['VER']['tn'], d['VER']['grid']), (1, 'redbull', 'Red Bull Racing', 2))
        self.assertEqual((d['ALO']['pos'], d['ALO']['status'], d['ALO']['grid'], d['ALO']['team']), (None, 'Engine', None, 'alpine'), 'ritirato; partito dai box')

    def test_nomi_e_anni(self):
        self.assertEqual(A.italian('Abu Dhabi Grand Prix'), 'GP di Abu Dhabi')
        self.assertEqual(A.italian('Grand Prix of Nowhere'), 'Grand Prix of Nowhere', 'nome sconosciuto: resta quello di FastF1')
        self.assertEqual(A.years_of('2018-2020, 2024'), [2018, 2019, 2020, 2024])
        self.assertEqual(A.years_of('2010-2018'), [2018], 'FastF1 ha giri e posizioni dal 2018')

    def test_dati_sporchi(self):
        r = A.race_record(1, {}, [{'Driver': None, 'LapNumber': 1}, {'Driver': 'X', 'LapNumber': NAN}], [{'Abbreviation': ''}])
        self.assertEqual((r['drivers'], r['laps']), ({}, 0))

if __name__ == '__main__':
    unittest.main(verbosity=1)
