// Funzioni Pro sbloccate per sempre coi trofei (7/11, Edoardo: "idealizza quali funzioni premium sbloccare a tot
// trofei e con quali trofei"). Oltre a Premium e al video con premio, ogni funzione Pro della gara si sblocca quando
// hai almeno quel numero di trofei E il trofeo legato al suo tema; una volta sbloccata resta (i trofei non si perdono).
// - Tempi sul giro: 3 trofei, tra cui "Pit crew" (Pit Stop Challenge in 2,35 s): chi ha il cronometro in mano.
// - Gomme e degrado: 5 trofei, tra cui "Griglia completa" (squadra del FantaF1 fatta): strategia.
// - Team radio: 8 trofei, tra cui "Radio aperta" (primo messaggio in chat): chi parla, ascolta.
// - Telemetria: 11 trofei, tra cui "Oracolo" (5 previsioni del weekend indovinate): chi legge i dati.
// - Second Screen: 14 trofei, tra cui "Pit stop perfetto" (Pit Stop Challenge in 2,00 s): il livello più alto.
// Contano i trofei vinti tra quelli attivi (anche i segreti). Pubblicità e notizie Premium restano di Premium.
// Prove: test/unit/trophypro.test.js.
const PRO_UNLOCKS = [
  { what: "laps", label: "Tempi sul giro", count: 3, key: "pitcrew" },
  { what: "gomme", label: "Gomme e degrado", count: 5, key: "griglia" },
  { what: "radio", label: "Team radio", count: 8, key: "radio" },
  { what: "telemetry", label: "Telemetria", count: 11, key: "oracolo" },
  { what: "ss", label: "Second Screen", count: 14, key: "pitperfetto" },
];

// earned: id dei trofei vinti → [{ what, label, count, key, have, keyOk, done }]
function proUnlocks(earned) {
  const set = new Set(Array.isArray(earned) ? earned : []);
  return PRO_UNLOCKS.map(u => ({ ...u, have: set.size, keyOk: set.has(u.key), done: set.size >= u.count && set.has(u.key) }));
}
const proUnlocked = earned => proUnlocks(earned).filter(u => u.done).map(u => u.what);

// Frase per il lucchetto di una funzione: cosa manca per sbloccarla coi trofei (nameOf: id → nome del trofeo).
function proHint(what, earned, nameOf = id => id) {
  const u = proUnlocks(earned).find(x => x.what === what);
  if (!u) return null;
  if (u.done) return null;
  const left = Math.max(0, u.count - u.have);
  const parts = [];
  if (left > 0) parts.push(left === 1 ? "ancora 1 trofeo" : `ancora ${left} trofei`);
  if (!u.keyOk) parts.push(`il trofeo «${nameOf(u.key)}»`);
  return `Oppure sbloccala per sempre coi trofei: ${u.count} trofei, tra cui «${nameOf(u.key)}». Ti mancano ${parts.join(" e ")}.`;
}

module.exports = { PRO_UNLOCKS, proUnlocks, proUnlocked, proHint };
