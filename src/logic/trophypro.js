// Premium coi trofei (8/11, Edoardo: "solo chi ha ottenuto tutti i trofei può avere il premium"). Vinti tutti i trofei
// che si possono vincere adesso, l'app dà il Premium, come quello pagato, finché i trofei restano (non si perdono).
// Quelli di Pit Swipe contano solo se l'admin ha acceso Pit Swipe (spento non si possono vincere). Il 7/11 mattina le
// funzioni Pro si sbloccavano a scalini (3, 5, 8, 11, 14 trofei): tolto.
// Prove: test/unit/trophypro.test.js.
const PIT_SWIPE_TROPHIES = ["boxbox", "opinionista"];

// I trofei che servono: quelli attivi (defs), meno quelli da saltare.
const trophyGoal = (defs, { skip = [] } = {}) => (Array.isArray(defs) ? defs : []).map(t => t && t.id).filter(id => id && !skip.includes(id));

// won: { <id>: data in ms } dei trofei vinti.
function allDone(won, defs, opts) {
  const need = trophyGoal(defs, opts);
  return need.length > 0 && need.every(id => !!(won && won[id]));
}

// Frase per il lucchetto delle funzioni Pro: quanti trofei mancano al Premium (null se ci sei già).
function premiumHint(won, defs, opts) {
  const need = trophyGoal(defs, opts), have = need.filter(id => won && won[id]).length;
  if (!need.length || have >= need.length) return null;
  return `Oppure vinci tutti i ${need.length} trofei: il Premium è tuo, gratis. Ne hai ${have}.`;
}

module.exports = { PIT_SWIPE_TROPHIES, trophyGoal, allDone, premiumHint };
