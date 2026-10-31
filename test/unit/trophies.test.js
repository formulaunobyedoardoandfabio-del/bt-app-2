// Prove dei trofei (Tappa 3, G31; src/logic/trophies.js): 19 trofei (31/10: +4 segreti delle feste) che si vincono con quello che si fa davvero
// nell'app, letto dai dati che l'app ha già; medaglia di bronzo da 1 trofeo, d'argento da 5, d'oro da 10. Gira in Node.
// Uso: node test/unit/trophies.test.js [filtro]
const assert = require('assert');
const path = require('path');
const { TROPHIES, trophyProgress, medalOf, trophyDefs, trophyConfigDefaults, cleanTrophyConfig } = require(path.join(__dirname, '..', '..', 'src', 'logic', 'trophies.js'));

const done = p => Object.keys(p).filter(id => p[id].done).sort();

const tests = {
  // 25/10: Pit crew in 2,35 secondi o meno (prima sotto i 2,5); "o meno": il tempo esatto vale.
  'pit stop: Pit crew entro 2,35 s, Pit stop perfetto entro 2,00 s'() {
    const pc = TROPHIES.find(t => t.id === 'pitcrew'), pp = TROPHIES.find(t => t.id === 'pitperfetto');
    assert.strictEqual(pc.goal, 2.35); assert.strictEqual(pp.goal, 2);
    assert.ok(/2,35/.test(pc.how), pc.how);
    assert.deepStrictEqual(done(trophyProgress({ pitBest: 2.35 })), ['pitcrew']);
    assert.deepStrictEqual(done(trophyProgress({ pitBest: 2.36 })), []);
    assert.deepStrictEqual(done(trophyProgress({ pitBest: 2 })), ['pitcrew', 'pitperfetto']);
  },

  // 25/10: i trofei si cambiano da Firebase (shared/bt-trophies): per ogni id nome, come si vince, obiettivo, spento.
  'trofei da Firebase: nome, testo, obiettivo e spento sopra i valori di serie'() {
    const defs = trophyDefs({ pitcrew: { goal: 2.1, name: 'Pit crew pro' }, archivio: { goal: 3, how: 'Salva 3 notizie' }, sgasata: { attivo: false },
      fantasma: { name: 'x' }, oracolo: { goal: -1 }, indovino: { name: '   ' }, radar: { goal: 'tanti' } });
    const by = id => defs.find(t => t.id === id);
    assert.strictEqual(by('pitcrew').name, 'Pit crew pro'); assert.strictEqual(by('pitcrew').goal, 2.1);
    assert.strictEqual(by('archivio').goal, 3); assert.strictEqual(by('archivio').how, 'Salva 3 notizie');
    assert.strictEqual(by('sgasata'), undefined, 'spento: non c\'è più');
    assert.strictEqual(by('fantasma'), undefined, 'id sconosciuto: ignorato');
    assert.strictEqual(by('oracolo').goal, 5, 'obiettivo non valido: quello di serie');
    assert.strictEqual(by('indovino').name, 'Indovino', 'nome vuoto: quello di serie');
    assert.strictEqual(by('radar').goal, 1);
    assert.strictEqual(defs.length, 18);
    assert.deepStrictEqual(done(trophyProgress({ pitBest: 2.2 }, defs)), [], '2,2 s non basta con 2,1');
    assert.deepStrictEqual(done(trophyProgress({ saved: ['a', 'b', 'c'] }, defs)), ['archivio']);
    assert.strictEqual(trophyProgress({ events: { egg: true } }, defs).sgasata, undefined, 'spento: non si vince');
    assert.deepStrictEqual(trophyDefs(null).map(t => t.id), TROPHIES.map(t => t.id), 'senza documento: quelli di serie');
  },

  'valori di serie da scrivere su Firebase, e ritorno'() {
    const cfg = trophyConfigDefaults();
    assert.deepStrictEqual(Object.keys(cfg).sort(), TROPHIES.map(t => t.id).sort());
    assert.deepStrictEqual(cfg.pitcrew, { name: 'Pit crew', how: TROPHIES.find(t => t.id === 'pitcrew').how, goal: 2.35, attivo: true });
    assert.strictEqual(cfg.casco.goal, undefined, 'senza obiettivo: niente goal');
    assert.deepStrictEqual(trophyDefs(cfg), trophyDefs(null));
    assert.deepStrictEqual(cleanTrophyConfig({ pitcrew: { goal: '2,4', name: 7, attivo: 'no' }, x: {} }), { pitcrew: {} });
    assert.deepStrictEqual(cleanTrophyConfig('rotto'), {});
  },

  'medalOf: 1 bronzo, 5 argento, 10 oro'() {
    assert.strictEqual(medalOf(0), null);
    assert.strictEqual(medalOf(1), 'bronzo');
    assert.strictEqual(medalOf(4), 'bronzo');
    assert.strictEqual(medalOf(5), 'argento');
    assert.strictEqual(medalOf(9), 'argento');
    assert.strictEqual(medalOf(10), 'oro');
    assert.strictEqual(medalOf(15), 'oro');
    assert.strictEqual(medalOf(undefined), null);
  },

  'elenco: 19 trofei, 5 segreti (Sgasata e i 4 delle feste), nomi del progetto'() {
    assert.strictEqual(TROPHIES.length, 19);
    assert.strictEqual(new Set(TROPHIES.map(t => t.id)).size, 19, 'id ripetuti');
    assert.deepStrictEqual(TROPHIES.filter(t => t.secret).map(t => t.id), ['sgasata', 'zucche', 'avvento', 'calza', 'monza']);
    const names = TROPHIES.map(t => t.name);
    ['Superlicenza', 'Il mio casco', 'Griglia completa', 'Indovino', 'Oracolo', 'Uomo radar', 'Sondaggista', 'Pit crew', 'Pit stop perfetto',
      'Mercato piloti', 'Pagellone', 'Voce del paddock', 'Archivio', 'Radio aperta'].forEach(n => assert.ok(names.includes(n), 'manca ' + n));
    TROPHIES.forEach(t => { assert.ok(t.how && !/—/.test(t.how + t.name), 'testo di ' + t.id); });
  },

  'trophyProgress: condizioni sui dati veri'() {
    // Nessun dato: nessun trofeo.
    assert.deepStrictEqual(done(trophyProgress({})), []);
    assert.deepStrictEqual(done(trophyProgress({ about: { birth: null, follow: 1, fan: 'vivo', years: 1 }, squad: null, saved: [], pitBest: null })), []);
    const all = trophyProgress({
      about: { birth: 1990, follow: 2, fan: 'vivo', years: 7 },
      helmet: { base: '#c00' },
      squad: { drivers: ['norris', 'leclerc', 'hadjar', 'gasly', 'ocon'], teams: ['ferrari', 'haas'] },
      saved: ['a', 'b', 'c', 'd', 'e'],
      pitBest: 1.98,
      sillyPreds: { 'ferrari-2': { pick: 'bearman', at: 1 } },
      ratings: { 'r16:RACE': { leclerc: { pace: 8 } } },
      dotd: { r16: { driver: 'leclerc' } },
      correctPreds: 5, correctWx: 1, correctPolls: 1,
      events: { chat: true, egg: true, pumpkins: 3, advent: true, stocking: true, monza: true },
    });
    assert.deepStrictEqual(done(all), TROPHIES.map(t => t.id).sort(), 'tutti i trofei con tutti i dati');
    // Uno alla volta.
    const one = (input, id) => assert.deepStrictEqual(done(trophyProgress(input)), [id], JSON.stringify(input));
    one({ about: { birth: 2001, follow: 3, fan: 'vivo', years: 9 } }, 'superlicenza');
    one({ helmet: { base: '#c00' } }, 'casco');
    one({ squad: { drivers: ['norris', 'leclerc', 'hadjar', 'gasly', 'ocon'], teams: ['ferrari', 'haas'] } }, 'griglia');
    one({ pitBest: 2.35 }, 'pitcrew');   // 25/10: Edoardo vuole il Pit crew in 2,35 secondi (prima sotto i 2,5)
    one({ sillyPreds: { 'ferrari-2': { pick: 'bearman', at: 1 } } }, 'mercato');
    one({ ratings: { 'r16:RACE': { leclerc: { pace: 8 } } } }, 'pagellone');
    one({ dotd: { r16: { driver: 'leclerc' } } }, 'paddock');
    one({ correctWx: 1 }, 'radar');
    one({ correctPolls: 2 }, 'sondaggista');
    one({ events: { chat: true } }, 'radio');
    one({ events: { egg: true } }, 'sgasata');
    // Quasi: "Su di te" senza anno di nascita, squadra con un posto vuoto, 2,5 s esatti, voti vuoti.
    assert.deepStrictEqual(done(trophyProgress({ about: { birth: null, follow: 3, fan: 'vivo', years: 9 } })), []);
    assert.deepStrictEqual(done(trophyProgress({ squad: { drivers: ['norris', null, 'hadjar', 'gasly', 'ocon'], teams: ['ferrari', 'haas'] } })), []);
    assert.deepStrictEqual(done(trophyProgress({ pitBest: 2.5 })), []);
    assert.deepStrictEqual(done(trophyProgress({ ratings: { 'r16:RACE': {} }, dotd: { r16: { team: 'ferrari' } } })), []);
    // Dove si conta: quanto manca.
    const p = trophyProgress({ correctPreds: 3, saved: ['a', 'b'] });
    assert.deepStrictEqual(done(p), ['indovino']);
    assert.deepStrictEqual([p.oracolo.value, p.oracolo.goal], [3, 5]);
    assert.deepStrictEqual([p.archivio.value, p.archivio.goal], [2, 5]);
    assert.strictEqual(p.indovino.done, true);
    // Pit Stop Challenge: il record per sapere quanto manca.
    const q = trophyProgress({ pitBest: 2.73 });
    assert.strictEqual(q.pitcrew.done, false);
    assert.strictEqual(q.pitcrew.value, 2.73);
    assert.strictEqual(q.pitcrew.goal, 2.35);   // 25/10: era 2,5
  },
};

(async () => {
  let pass = 0, fail = 0;
  const filter = process.argv[2] ? new RegExp(process.argv[2], 'i') : null;
  for (const [name, fn] of Object.entries(tests)) {
    if (filter && !filter.test(name)) continue;
    try { await fn(); pass++; console.log('PASS  ' + name); }
    catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + String(e.message).split('\n')[0].slice(0, 300)); }
  }
  console.log(`\n${pass} passati, ${fail} falliti`);
  process.exit(fail ? 1 : 0);
})();
