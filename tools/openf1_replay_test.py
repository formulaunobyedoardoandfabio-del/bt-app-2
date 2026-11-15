# Prove dei calcoli di tools/openf1_replay.py (pista finta, senza rete). Uso: python3 tools/openf1_replay_test.py
import math, os, random, sys, unittest
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import openf1_replay as R

# Pista quadrata 1000 x 1000 (unità di OpenF1, circa decimetri): giro di 4000; il traguardo è il primo punto.
SQUARE = [(0, 0), (500, 0), (1000, 0), (1000, 500), (1000, 1000), (500, 1000), (0, 1000), (0, 500)]
def at(s):
    s %= 4000
    if s < 1000: return (s, 0)
    if s < 2000: return (1000, s - 1000)
    if s < 3000: return (3000 - s, 1000)
    return (0, 4000 - s)

class Calcoli(unittest.TestCase):
    def setUp(self):
        self.line, self.cum, self.L = R.track_line(SQUARE)

    def test_tracciato(self):
        self.assertEqual(self.L, 4000)
        self.assertEqual(self.cum[:3], [0, 500, 1000])

    def test_proiezione_e_finestra(self):
        self.assertAlmostEqual(R.project(self.line, self.cum, self.L, 300, 20), 300, delta=1)
        # il punto (5, 500) è sul lato sinistro (3500); con la finestra attorno a 500 si resta sul lato di sotto
        self.assertAlmostEqual(R.project(self.line, self.cum, self.L, 5, 500), 3500, delta=1)
        self.assertAlmostEqual(R.project(self.line, self.cum, self.L, 5, 500, near=500, window=200), 500, delta=1)

    def test_progresso_con_griglia_giri_e_rumore(self):
        random.seed(3)
        samples, t = [], 0.0
        while t <= 90:                        # 100 unità al secondo, partenza 100 dietro il traguardo
            x, y = at(3900 + 100 * t)
            samples.append((t, x + random.uniform(-6, 6), y + random.uniform(-6, 6)))
            t += 0.27
        ser = R.progress_series(samples, self.line, self.cum, self.L)
        self.assertAlmostEqual(ser[0][1], -100, delta=10, msg='in griglia: dietro il traguardo')
        tt, pp = ser[-1]
        self.assertAlmostEqual(pp, -100 + 100 * tt, delta=12, msg='dopo 2 giri e passa il conto torna')

    def test_ritirato_resta_fermo_e_avanti_indietro_sul_traguardo(self):
        samples = [(0, *at(3990)), (1, *at(10)), (2, *at(3995)), (3, *at(20)), (4, *at(400)), (10, *at(400)), (60, *at(400))]
        ser = R.progress_series(samples, self.line, self.cum, self.L)
        self.assertEqual([round(p) for _, p in ser], [-10, 10, -5, 20, 400, 400, 400])

    def test_un_secondo_alla_volta_e_differenze(self):
        ser = [(0.5, -100.0), (2.5, 100.0), (4.0, 250.0)]
        m = R.per_second(ser, t0=0, t1=5, scale=0.1)          # in metri
        self.assertEqual(m, [-10, -5, 5, 15, 25, 25])
        self.assertEqual(R.deltas(m), [-10, 5, 10, 10, 10, 0])
        self.assertEqual(R.undeltas(R.deltas(m)), m)

    def test_stato_della_pista_dai_messaggi(self):
        msgs = [{'date': 't10', 'category': 'SafetyCar', 'message': 'SAFETY CAR DEPLOYED'},
                {'date': 't20', 'category': 'SafetyCar', 'message': 'SAFETY CAR IN THIS LAP'},
                {'date': 't30', 'category': 'Flag', 'flag': 'GREEN', 'message': 'TRACK CLEAR'},
                {'date': 't40', 'category': 'SafetyCar', 'message': 'VIRTUAL SAFETY CAR DEPLOYED'},
                {'date': 't45', 'category': 'SafetyCar', 'message': 'VIRTUAL SAFETY CAR ENDING'},
                {'date': 't50', 'category': 'Flag', 'flag': 'RED', 'message': 'RED FLAG'},
                {'date': 't60', 'category': 'Flag', 'flag': 'GREEN', 'message': 'GREEN LIGHT - PIT EXIT OPEN'},
                {'date': 't70', 'category': 'Flag', 'flag': 'YELLOW', 'message': 'YELLOW IN TRACK SECTOR 3'}]
        sec = lambda d: int(d[1:])
        self.assertEqual(R.track_status(msgs, sec), [[10, 'sc'], [30, 'green'], [40, 'vsc'], [45, 'green'], [50, 'red'], [60, 'green']])

if __name__ == '__main__':
    unittest.main(verbosity=1)
