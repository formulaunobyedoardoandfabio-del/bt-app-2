# Handoff
Updated: 2026-10-25 by Claude (claude-opus-5-5)   Branch: tappa-3   (vedi "24/10" in fondo per l'ultimo lavoro)

## Goal
Tappa 3 della 2.0: "fai prima tutti gli easter egg e le nuove grafiche, poi vedo l'apk di prova e poi ci sono altre
funzioni da aggiungere". In più (17/10): foto da Wikimedia Commons (piloti in viso, auto di lato, loghi delle
scuderie) e scorrere tra le schede trascinando il dito in qualsiasi punto della pagina.
17/10 ore 21:43: "l'unica nuova cosa interattiva che devi creare sono i trofei, tutto il resto no, solo UI, UX, nuovi
design e debug di cose".
Progetto: `docs/superpowers/specs/2026-10-11-tappa3-grafica-design.md` (G01-G31, G31 = trofei).
Piano (20 task): `docs/superpowers/plans/2026-10-17-tappa3-grafica.md`.

## State
- Done: Task 1-19 (commit 4fd7f86 … Task 19): colori e rosso LED, suoni e vibrazioni, icone Tabler e testi,
  avvio Pit Exit Launch, partenza abortita e cordoli, filtri a gomma e Pit Lane, swipe sulle notizie, barra ERS e
  Team Radio, tira giù per aggiornare, casco del profilo, contachilometri e manettino, Centro Notifiche e interruttori
  a capsula, podio a sollevatore e frecce, Parc fermé, zone Q1/Q2 e carte 3D, Shift Light, LED del logo ed easter
  egg dei tre tocchi, Pit Board e gomma che si rovina, swipe tra le schede (G29), foto di Wikimedia Commons (G30),
  trofei con bacheca nel Profilo e medaglia in chat (G31).
- In progress: nessuno.
- Not started: Task 20 (prove complete, revisione di un revisore nuovo, push su tappa-3 e apk-prova, APK).

## Richieste del 18/10 (ore 16:08), in corso
Token di Edoardo al 75%: prima le cose importanti e veloci.
- Fatto: pacchetto `com.bt.app` (Play Console); account: niente disconnessione dopo tanto offline (ultimo account
  ricordato, `bt-last-account`); creazione account: si riprova il salvataggio del profilo e "Errore di connessione"
  mostra il codice vero (Edoardo vede "Errore di connessione, riprova tra poco" creando l'account: causa vera ancora
  da vedere col codice).
- Fatto (da provare tutto insieme): Home senza LIVE RACE/FANTA F1; ricerca `#soggetto`; Race senza sessione: di serie il
  Mondiale, "Ultima gara" in una scheda; Ghost Lap solo dopo le qualifiche di quel GP (GP delle ultime qualifiche con
  dati: ora Sepang/Baku, dopo Singapore nessuno); Premium: gratis tempi, gomme, radio, pit stop, Second Screen, avvisi,
  sondaggi; prova per un GP; 6 € a stagione (1 € in meno ogni stagione, fino a 1 €); "Offrici un caffè" (link da
  mettere in `COFFEE_URL`); giochi "In arrivo" nel Garage; finita la scivolata tra le schede niente transform.
- Da fare: pubblicità native tra le notizie e con premio (servono codice nativo e le unità AdMob di Edoardo); accesso
  con Google (Firebase: provider Google, SHA-1/SHA-256 delle chiavi, google-services.json per com.bt.app); Apple no
  (serve l'Apple Developer Program a pagamento). Revisione finale con un revisore nuovo: rimandata (token).

## Richieste del 18/10 sera (22:20), NON iniziate (token di Edoardo al 93%: niente codice a metà)
Ordine consigliato per la prossima sessione:
1. Registrazione: togliere la casella "Ho almeno 14 anni"; manettino dell'anno che funzioni meglio e parta dall'anno
   minimo consentito (anno di oggi meno 14); il controllo dell'età resta sull'anno scelto.
2. Mostra/nascondi password "in stile F1" (es. visiera del casco che si alza).
3. Feedback tattili (vibrazioni) dove mancano.
4. Ogni pagina: stati di caricamento, riuscito, errore e vuoto (controllo pagina per pagina).
5. Grafiche come nella foto di Edoardo (la foto non è arrivata: va rimandata).
6. "Non scollegarti offline": già fatto nell'APK del 18/10 alle 17:40 (ultimo account ricordato); se succede ancora
   servono i passi esatti.

## Next action
Task 20: `JOBS=1 bash test/all.sh` in una copia separata (`/home/claude/bt-t3-suite`), screenshot delle pagine nuove,
revisione dell'intero ramo con un revisore nuovo (pacchetto con review-package), una sola passata di correzioni,
poi push di tappa-3 e di `tappa-3:refs/heads/apk-prova` e controllo della build su GitHub.

## Decisions (and why)
- Anni da tifoso esatti in `about.years` più la fascia di oggi in `about.follow`: l'app di oggi legge ancora la fascia.
- Frecce del mondiale: `prevPosition` in shared/bt-piloti e bt-costruttori, la salva l'admin quando cambiano i punti;
  senza, niente frecce (mai frecce inventate).
- Carte FantaF1: toccando si girano; "Cambia" è sul retro.
- "Pit Wall non raggiungibile" = telefono senza rete o Firebase che non ha risposto all'avvio.
- Nessun gioco o strumento nuovo (richiesta del 17/10): solo trofei, grafica, UX e correzioni.
- Medaglia dei trofei nei messaggi della chat (`medal`): le regole di Firebase della Tappa 1 (Task 19) devono
  lasciarla passare.
- Foto di Commons: le candidate in `src/data/commons-candidates.js` sono titoli trovati con la ricerca (da qui le
  pagine di Commons non si aprono): licenza, autore e immagine li legge l'app e mostra solo CC0, pubblico dominio,
  CC BY, CC BY-SA; Edoardo sceglie dal Pannello Admin → FOTO. Mancano Lindblad, le auto di Williams e Audi e il logo
  della Racing Bulls. Crediti di tutte le foto mostrate in "Info su B&T". `SHOW_TEAM_LOGOS` a false per il Play Store.
- Trofei (G31): `src/logic/trophies.js` (15 trofei, medalOf 1/5/10); si vincono solo con un account e i suoi dati
  letti; la squadra del FantaF1 conta solo se non è quella di partenza; previsioni, meteo e sondaggi giusti sono gli
  stessi dei punti bonus del FantaF1 (la DEMO non conta). Avviso in alto che non copre i tocchi. Il trofeo segreto è
  "Sgasata" (tre tocchi sul logo).
- Le decisioni minute di ogni task sono nel registro locale `.superpowers/sdd/2026-10-17-tappa3-grafica/progress.md`
  (non è nel repository).

## Tried and failed (don't repeat)
- Scaricare file da raw.githubusercontent o con `gh api` (Tabler): bloccato; `git clone --sparse` funziona.
- `bash -c '…'` intorno alle prove: bloccato dal controllo di sicurezza; usare un file di script.
- `pkill -f "<comando>"` dentro lo stesso comando: uccide anche la shell che lo lancia.
- `pip install graphifyy`: PyPI non raggiungibile da qui.
- Aprire commons.wikimedia.org (WebFetch, curl): bloccato da qui; nelle prove Commons è finto (routes) e di serie
  non risponde (helpers.js).

## Verified
`JOBS=1 bash test/all.sh` → TUTTO VERDE a 61dbea3 (Task 1-14). Task 15-18: prove dei singoli task verdi
(task-done); la suite completa si rifà nel Task 20.

## Open questions for the user
- Nessuna per ora.

## 18/10 sera: AAB per il test chiuso
- codemagic.yaml, workflow play-store: prima della build mette SHOW_TEAM_LOGOS a false. I loghi delle scuderie restano solo nelle versioni di prova (APK).
- Test chiuso: Edoardo compila l'AAB da Codemagic ("B&T - Play Store (AAB firmato)", ramo tappa-3).
- OpenF1: tutti e due i piani (gratis e sponsor) dicono "personal use". Edoardo chiede a OpenF1 (Contact, "Custom projects") se va bene per l'app pubblica con pubblicità e Premium. Finché non rispondono, niente diretta a pagamento nell'app. Le credenziali solo nelle variabili di Vercel, mai nel codice.
- Prima della produzione: audio team radio e Premium (Google Play Billing) da sistemare.
- 23:11: la Play Console vuole il pacchetto com.bt.formula1 (com.bt.app è di un altro sviluppatore: autorità androidx-startup e fileprovider già in uso). appId tornato com.bt.formula1, anche per il futuro google-services.json. AAB del Play Store: versionCode = minuti dal 1/1/2020 (cresce sempre, più alto delle build vecchie); APK di prova invariati.

## 19/10: unità pubblicitarie AdMob (da Edoardo; dal 24/10 banner e interstitial sono nel codice, vedi sotto)
App ID: ca-app-pub-5787516371588469~8054706643 (già nel manifest).
- Banner nelle News (Banner): ca-app-pub-5787516371588469/2997561321
- Pubblicità Banner (Banner): ca-app-pub-5787516371588469/3821223256
- Pubblicità tra le News (Interstitial): ca-app-pub-5787516371588469/9706030785
- Pubblicità in fondo alla classifica (Interstitial): ca-app-pub-5787516371588469/2087570220
- Premium (Con premio): ca-app-pub-5787516371588469/5624901693, /6784763097, /9675827346
- Pubblicità (Con premio): ca-app-pub-5787516371588469/6456990840
- Personalizzabile, Pubblicità personalizzabile (Nativo avanzato): /9774488555, /5590821687 (il plugin @capacitor-community/admob non fa i nativi)
Da fare in una sessione con token, su un ramo a parte: consenso UE (UMP, messaggio GDPR da creare in AdMob > Privacy e messaggi), interstitial con limite di frequenza, banner che non copre la barra delle schede, con premio; prove. Nel test chiuso niente annunci veri (amici che cliccano = rischio per l'account AdMob).

## 19/10: sito su Vercel (bt-app-2.vercel.app)
- Il 404 veniva dal ramo main, che contiene solo il README. Edoardo ha impostato su Vercel il ramo di produzione `tappa-3`: ogni push su tappa-3 aggiorna il sito.

## 24/10: le 5 richieste di Edoardo ("niente ad, niente live, icone nuove, Premium che sparisce, dati gratis")
- Premium: si salva nell'account (`app2.premium = { sub, trial }`), resta chiudendo l'app; la prova finisce da sola.
- Diretta: lo stato della gara segue gli orari ufficiali (`CIRCUIT_INFO.weekend`, `compat.raceStatusesAt`): LIVE da 30
  min prima delle FP1 a 4 h dopo la partenza, poi CONCLUSA, ricalcolato ogni 20 s con l'app aperta. Causa: in Firebase
  `shared/bt-races` non esiste, quindi nessuna gara era mai LIVE. LIVE salvato dall'admin vale da 3 giorni prima a 6 ore
  dopo; CONCLUSA chiude prima; IN ARRIVO salvato non conta; una sola gara LIVE. `weekendRace()` per Fanta e strumenti.
- Durante una sessione OpenF1 gratis risponde 401 ("Live F1 session in progress"): non c'è una fonte gratuita e legale
  del cronometraggio in tempo reale. L'app dice "SESSIONE IN CORSO" e mostra i dati veri a fine sessione.
- Classifiche: Jolpica F1 (`src/services/jolpica.js`, cache 30 min, frecce dal round prima), usate se non più vecchie di
  quelle dell'admin (round nella nota). Jolpica è pensato per uso non commerciale: prima dell'uscita pubblica con la
  pubblicità chiedere il permesso (admin@jolpi.ca) o mettere `JOLPICA_ON = false` in `src/App.jsx`.
- Meteo: MET Norway (gratis anche commerciale, CC BY 4.0, attribuzione nel riquadro) tramite la funzione Vercel
  `api/meteo.js` (MET vuole un server proprio, User-Agent "Sector4/2.0 …" e la cache fino a Expires). Riquadro
  "PREVISIONI DEL WEEKEND" in Race → Meteo, solo se la previsione arriva.
- SerpApi: non usato (250 ricerche al mese gratis, chiave solo su un server, dati di Google meno precisi per classifiche
  e meteo). Se serve per altro, la chiave va nelle variabili di Vercel, mai nell'app.
- Garage: icone nuove (disegno "Icone del Garage") per gli 11 giochi e i 10 in arrivo (`GARAGE_GLYPHS`, `GarageIcon`).
- Pubblicità (`src/services/ads.js`): consenso UE (UMP) prima di tutto; banner adattivo in Home (2997561321) e Race
  (3821223256) in fondo, sopra la barra di sistema, con le schede alzate di altezza + 10 (`data-ad-space`); si toglie con
  ogni finestra aperta, nel resto dell'app e con il Premium. Interstitial tra le notizie (9706030785): dopo 3 notizie,
  max 1 ogni 4 minuti, mai nel primo minuto. "Preferenze privacy annunci" nel Profilo quando Google lo chiede. Tolto il
  riquadro finto "ADV · Spazio pubblicitario". Non usate: interstitial classifica, unità con premio (manca la decisione
  su cosa regalare), nativi (il plugin non li fa).
- Annunci di prova (BT_ADMOB_TEST=1) anche nel workflow play-store per il test chiuso: **all'uscita pubblica togliere
  le righe `vars: BT_ADMOB_TEST` dal workflow play-store di codemagic.yaml**. Serve anche il messaggio GDPR in AdMob
  (Privacy e messaggi) per il consenso nell'UE.
- 25/10, dati F1 che si aggiornano da soli (Ghost Lap, Scanner, Degrado, Strategie, Compagni, Bluff, zone Q):
  `.github/workflows/dati-f1.yml` (su tappa-3 e su main: i workflow a orario partono solo dal ramo principale), ogni ora
  ven-sab-dom e ogni 4 ore lun e gio: se TracingInsights/2026 ha un commit nuovo esegue `tools/make_live_data.py` e fa il
  commit di `public/data/f1` su tappa-3 (autore B&T); Vercel pubblica `/data/f1/*.json` (CORS in vercel.json). L'app
  (`src/services/f1data.js`) scarica l'indice ogni 15 min e solo i file cambiati, li salva e li mette sul posto in
  BtWeekend, BtRealData e GHOST_SESSIONS; senza rete restano quelli dell'APK. Restano a mano: notizie, Fanta, risposte
  delle previsioni, highlights. Nelle prove tutto `https://bt-app-2.vercel.app/**` di serie non risponde.
  Il workflow fa commit su tappa-3 da solo: prima di lavorare e prima di ogni push, `git pull --rebase origin tappa-3`.
  Lunedì 12:41 UTC `tools/check_live_data.py`: se manca un GP già corso (o il calendario 2026 è finito da 75 giorni) il
  workflow fallisce e GitHub manda un'email a Edoardo. Per il 2027: nuovo calendario, EVENTS/CIRCUIT_IDS e repo TI 2027.
- Prove: `test/e2e/run70-sistemazioni.js` (Premium, diretta, classifiche, meteo, icone, pubblicità con AdMob finto),
  `test/unit/{compat,jolpica,meteo,ads}.test.js`. Nelle prove Jolpica e la funzione meteo di serie non rispondono.

## 25/10 pomeriggio: animazioni delle schede (Edoardo: "migliora le animazioni di spostamento di schede")
- Barra in basso, col tocco e con lo swipe: le due schede scorrono attaccate come un nastro, 300 ms, stessa curva: la
  vecchia esce tutta (`.tab-leave`, `data-tab-leave`, `inert`, tenuta montata da `tabLeave` in App fino ad
  animationend), la nuova entra attaccata (`.tab-enter-left/right`, `--tab-in`). Scartata la prima versione con le
  dissolvenze: a metà passaggio lo schermo restava quasi nero per qualche fotogramma. Le schede montate sono sempre
  nell'ordine della barra (`tabPages()`): React non sposta i nodi e lo scroll della vecchia resta fermo mentre esce.
- Col dito la pagina segue lo swipe (`dragFollow` in `src/logic/gesture.js`: 60% del dito, elastico ai lati), la
  scheda accanto (`TabPeek`) entra attaccata al bordo della pagina e diventa rossa quando lasciando si cambia, la
  pillola rossa segue il dito; se lo swipe è corto la pagina torna a posto (`.tab-back`). Durante il gesto lo stile si
  scrive sugli elementi (niente stato React a ogni movimento).
- Fotogrammi veri a velocità normale: CDP `Page.startScreencast` (le schermate con le animazioni rallentate da
  `Animation.setPlaybackRate` non mostrano la scheda che esce: non servono per giudicare).
- Pillola rossa della barra: una sola, scivola sotto la scheda attiva (`[data-nav-pill]`, `--nav-i`, `--nav-drag`).
- Sottoschede della pagina RACE: il contenuto entra dalla parte della sottoscheda toccata (`useSlideFrom`,
  `[data-race-pane]`, `.sub-enter-left/right`).
- Con "Rimuovi animazioni" (prefers-reduced-motion): niente scivolate, la pagina non segue il dito, lo swipe cambia
  scheda lo stesso.
- Prove: `test/e2e/run71-animazioni-schede.js` (10), `test/unit/gesture.test.js` (dragFollow, dragProgress, leaveTo).
  Col mouse un trascinamento seleziona il testo e il successivo lo trascinerebbe (pointercancel): nella prova si toglie
  la selezione; sul telefono (touch) non succede.
- Verificato il 25/10: `JOBS=2 bash test/all.sh` a e882fa6 → tutto verde tranne run50-colori, che cercava la pillola
  dentro il tasto (`[data-nav-tab] > div`): ora `[data-nav-pill] > *`, 6/6. Dopo l'ultimo ritocco (scheda accanto col
  colore dei tasti, `--peek-on`) run71 10/10, run50 6/6, run66 8/8.
