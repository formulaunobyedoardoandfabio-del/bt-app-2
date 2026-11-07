// Prove della griglia di partenza dopo la qualifica (src/logic/start-grid.js). Uso: node test/unit/start-grid.test.js
const assert = require('assert');
const S = require('../../src/logic/start-grid');
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('PASS  ' + name); } catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); } };
const Q = [
  { number: 1, code: 'VER', color: '#3671C6', pos: 1 }, { number: 4, code: 'NOR', color: '#FF8000', pos: 2 },
  { number: 16, code: 'LEC', color: '#ED1131', pos: 3 }, { number: 44, code: 'HAM', color: '#ED1131', pos: 4 },
];

t('senza griglia ufficiale: l\'ordine della qualifica, nessuna posizione ufficiale', () => {
  const g = S.buildStartGrid({ quali: Q, official: [] });
  assert.strictEqual(g.official, false);
  assert.deepStrictEqual(g.rows.map(r => [r.code, r.quali, r.grid]), [['VER', 1, null], ['NOR', 2, null], ['LEC', 3, null], ['HAM', 4, null]]);
});

t('con la griglia ufficiale: ordine della griglia e quanti posti si perdono o si guadagnano per le penalità', () => {
  const official = [{ driver_number: 1, position: 4 }, { driver_number: 4, position: 1 }, { driver_number: 16, position: 2 }, { driver_number: 44, position: 3 }];
  const g = S.buildStartGrid({ quali: Q, official });
  assert.strictEqual(g.official, true);
  assert.deepStrictEqual(g.rows.map(r => [r.code, r.grid, r.quali, r.delta]), [['NOR', 1, 2, 1], ['LEC', 2, 3, 1], ['HAM', 3, 4, 1], ['VER', 4, 1, -3]]);
  assert.strictEqual(g.changed, true);
});

t('griglia ufficiale uguale alla qualifica: changed falso', () => {
  const g = S.buildStartGrid({ quali: Q, official: Q.map(q => ({ driver_number: q.number, position: q.pos })) });
  assert.strictEqual(g.official, true);
  assert.strictEqual(g.changed, false);
});

t('penalità scritte dalla direzione gara: etichetta sul pilota (anche prima della griglia ufficiale)', () => {
  const rc = [
    { message: 'FIA STEWARDS: 5 PLACE GRID PENALTY FOR CAR 1 (VER) - POWER UNIT ELEMENTS' },
    { message: 'CAR 44 (HAM) REQUIRED TO START FROM THE BACK OF THE GRID' },
    { message: 'CAR 16 (LEC) WILL START FROM THE PIT LANE' },
    { message: 'CAR 4 (NOR) TIME 1:30.123 DELETED - TRACK LIMITS AT TURN 4' },
  ];
  const g = S.buildStartGrid({ quali: Q, official: [], rc });
  const tag = c => g.rows.find(r => r.code === c).tag;
  assert.strictEqual(tag('VER'), '5 posti di penalità');
  assert.strictEqual(tag('HAM'), 'parte in fondo');
  assert.strictEqual(tag('LEC'), 'parte dalla pit lane');
  assert.strictEqual(tag('NOR'), null);
});

t('dati rotti: niente errori, righe valide soltanto', () => {
  const g = S.buildStartGrid({ quali: [null, { code: 'X' }, ...Q], official: [{ position: 3 }, null] });
  assert.strictEqual(g.rows.length, 4);
  assert.strictEqual(g.official, false);
});

console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
