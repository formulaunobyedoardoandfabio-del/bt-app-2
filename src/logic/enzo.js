// Enzo, l'assistente svogliato di Sector 4 (15/11, copione di Edoardo): si apre toccando 3 volte la scheda dove sei
// già. Le frasi sono quelle del copione, parola per parola; qui si sceglie quale dire. Le risposte sulle funzioni
// hanno anche cosa mostrare nell'app (DEMO: la scheda da aprire e il pezzo da evidenziare, li usa App.jsx).
// Prove: test/unit/enzo.test.js.

const GREET = {
  A: "Oh, un altro utente. Ciao, sono Enzo. Ti prego dimmi che è una cosa veloce perché stavo giusto facendo un riposino tra una bandiera rossa e l'altra.",
  B: "Ma non avete una gara da guardare invece di disturbare me? Dai, spara, cosa ti serve su Sector 4? Hai 10 secondi prima che vada in modalità risparmio energetico.",
  C: "Oggi non si corre, perché io dovrei lavorare? Comunque sono Enzo. Dimmi pure, così poi torniamo entrambi a far niente.",
};
const ANSWER = {
  telemetry: "Vuoi vedere i tempi e i dati della pista? Clicca su Live Telemetry. Ci sono tutti i numerini che piacciono a voi fanatici, così la smetti di chiedere a me quanto stanno girando lenti oggi. Dai, vai a guardare lo schermo.",
  fanta: "Il Fanta F1 è nell'apposita sezione, non è mica nascosto. Vai lì, fai i tuoi pronostici sbagliati, crea una lega con i tuoi amici e lasciami in pace. Tanto lo sappiamo entrambi che arriverai ultimo anche stavolta.",
  news: "Le ultime notizie dal paddock sono nella sezione News. Le aggiornano gli admin che, a differenza mia, hanno pure voglia di scrivere. Vai a leggere lì e non farmi fare il riassunto.",
  community: "Se hai tanta voglia di chiacchierare, vai nella sezione Community. È piena di gente di B&T Motorsport che non vede l'ora di commentare le gare. Io passo, ho già mal di testa solo a pensarci.",
};
const OFF = "Senti, io sono pagato (cioè, non sono pagato) solo per dirti dov'è la telemetria e il Fanta F1. Per tutto il resto c'è Google. Aria!";
const BUG = "Probabilmente i server stanno dormendo, li capisco benissimo. Ricarica la pagina e non venire a lamentarti da me, io faccio solo presenza.";
const LONG = "Mamma mia quanto scrivi. Ti ho già detto tutto: Telemetria, News, Fanta F1, Community. Clicca un tasto a caso e lasciami tornare a fissare il vuoto.";
const CLOSING = [
  "Perfetto, problema risolto. Ora però chiudi questa finestrella che mi fai corrente.",
  "Tutto chiaro? Bene. Adesso scusa ma ho un impegno urgentissimo con la modalità stand-by. Ciao eh!",
  "Ecco fatto. Non tornare troppo presto, mi raccomando.",
];
// Cosa mostra mentre parla: scheda e pezzi da evidenziare, in ordine (il primo che c'è).
const DEMO = {
  telemetry: { tab: "race", sel: ["[data-live-card]", "[data-session-picker]", '[data-nav-tab="race"]'] },
  fanta: { tab: "fanta", sel: ["[data-league-new]", "[data-squad-area]", '[data-nav-tab="fanta"]'] },
  news: { tab: "home", sel: ["[data-featured]", "[data-news-item]", '[data-nav-tab="home"]'] },
  community: { tab: "race", sel: ["[data-race-chat]", '[data-nav-tab="race"]'] },
};
const INTENTS = [
  ["bug", /\bbug\b|non carica|non va\b|errore|bloccat|non funziona|crash|si pianta|non si apre/],
  ["telemetry", /telemetr|tempi|\blive\b|diretta|pista|giri\b|cronometr/],
  ["fanta", /fanta|\bleg(a|he)\b|pronostic|squadra|punteggi/],
  ["news", /\bnews\b|notizi|paddock|articol/],
  ["community", /community|chat|tifosi|motorsport|chiacchier|comment/],
  ["bye", /\b(ciao|grazie|basta|chiudi|a posto|perfetto)\b/],
];

const pick = (list, rand) => list[Math.min(list.length - 1, Math.floor(rand() * list.length))];
const greeting = ({ raceToday = false, rand = Math.random } = {}) => (raceToday ? (rand() < 0.5 ? GREET.A : GREET.B) : GREET.C);
const closing = (rand = Math.random) => pick(CLOSING, rand);

function reply(text, { streak = 0, rand = Math.random } = {}) {
  const t = String(text || "").toLowerCase().trim();
  if (!t) return null;
  const hit = INTENTS.find(([, re]) => re.test(t));
  const intent = hit ? hit[0] : null;
  if (intent === "bug") return { intent, text: BUG };
  if (intent === "bye") return { intent, text: closing(rand) };
  if (intent) return { intent, text: ANSWER[intent], demo: DEMO[intent] };
  if (t.length > 160 || streak >= 2) return { intent: "long", text: LONG };
  return { intent: "off", text: OFF };
}

module.exports = { GREET, ANSWER, OFF, BUG, LONG, CLOSING, DEMO, greeting, reply, closing };
