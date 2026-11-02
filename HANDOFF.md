# Handoff
Updated: 2026-11-01 by Claude (claude-opus-5-5)   Branch: tappa-3   (vedi "1/11 pomeriggio" in fondo per l'ultimo lavoro)

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

## 25/10 sera: trofei da Firebase, chat (profilo veloce, reazioni), Instagram nuova, caricamento
Edoardo: "usa questo design (canvas "Profili tifosi e Instagram", con le sue modifiche), logo B&T ritagliato e
trasparente, solo la schermata di caricamento, trofei modificabili in Firebase (Pit stop in 2,30), profilo degli altri
toccando il nome in chat (tifo, casco, trofei, segnalazione), reazioni con le emoji come WhatsApp".
- Trofei: `shared/bt-trophies` = `{ <id>: { name, how, goal, off } }` (`src/logic/trophies.js`: `cleanTrophyConfig`,
  `trophyDefs`, `trophyConfigDefaults`). Se manca lo crea l'app di un admin coi valori di serie
  (`AppData.ensureTrophyDoc`); si cambia dalla console di Firebase. Obiettivi: conteggi interi 1-100, tempi del Pit
  Stop 1-5 s; `off: true` toglie il trofeo. Pit crew in 2,30 s o meno (prima sotto 2,5), Pit stop perfetto 2,00.
  Trofei che "non risultavano": il pilota del giorno e le pagelle votati nella prova DEMO finivano in `demoVotes` e
  non contavano; ora contano.
- Chat, profilo veloce (`ChatProfileSheet`): toccando il nome di un messaggio, tifo (scuderia, pilota del cuore, tipo di
  tifoso), casco, trofei vinti e "Segnala". Viaggia nei messaggi (`p` = `{t, d, f, h, w}`, `compat.profOf`), solo
  quando cambia o dopo 7 giorni, per stanza (`bt-chat-p-<stanza>` sul telefono): niente uid in giro e nessuna regola di
  Firebase cambiata. Chi non ha ancora scritto dopo l'aggiornamento: "si vede dal suo prossimo messaggio". Il trofeo
  segreto di un altro si vede come "Trofeo segreto" se non l'hai trovato anche tu.
- Reazioni come WhatsApp (👍 ❤️ 😂 😮 😢 🙏): voci della stanza `{id, user, aid, re, e, t}` (arrayUnion come i
  messaggi), una per persona e messaggio, vale l'ultima (`Chat.react`, `compat.applyReaction` per lo schermo subito).
  Si aprono tenendo premuto il messaggio (450 ms), col tasto ⋯ o toccando le reazioni sotto il messaggio; la stessa
  emoji la toglie. L'admin che elimina un messaggio toglie anche le sue reazioni. ATTENZIONE: l'app di oggi
  (bt-app-flutter) legge le stesse stanze e mostrerebbe le reazioni come messaggi vuoti.
- Instagram (`InstagramScreen`, `src/logic/instagram.js`): come la grafica, col logo nuovo nel cerchio del profilo
  (`src/data/logo.js`: PNG 384x384 bianco su trasparente, dal file caricato da Edoardo; il vecchio logo.js non era più
  usato). Nel Pannello Admin ogni reel ha anche descrizione breve (40 caratteri, sulla copertina) e data di uscita (di
  serie oggi). Ultimo reel = data più recente (senza date l'ultimo aggiunto); "NUOVO" per 7 giorni; "PIÙ VISTI DEL
  MESE" se almeno 2 reel degli ultimi 30 giorni, altrimenti "PIÙ VISTI" di tutti; senza visualizzazioni "ALTRI REEL".
  Numeri come li scrive l'admin ("12,3K", "1.200"). FOLLOWER resta il numero dell'admin: nella grafica Edoardo ha
  scritto "FOLLOWER (live)", ma senza la Graph API di Instagram (account Business + app Meta + token) non è vero.
  La HomeBanner della grafica Edoardo l'ha cancellata: non fatta.
- Avvio: via il Pit Exit Launch (15 LED del volante, "PIT EXIT OPEN", zoom). Dagli avvii dopo il primo solo
  `LoadingScreen`: la luce posteriore a LED in sequenza e "Caricamento…" (la schermata che prima si vedeva solo coi
  dati lenti), almeno 840 ms, poi l'app. Primo avvio in assoluto: i video, come prima. Una prima versione con una
  schermata nuova di 6 LED Edoardo non la voleva: "non devi creare una nuova schermata, solo togliere quella".
- Prove: `test/e2e/run72-trofei-chat.js` (9), `run73-instagram.js` (5), `run53-avvio.js` (4, riscritta per il
  caricamento), `run33-playstore.js` (splash senza i video), `test/unit/{trophies,appdata,compat,chat,instagram}.test.js`.
- Verificato il 25/10 sera: `JOBS=2 bash test/all.sh` a c6a9626 → TUTTO VERDE (77 file).
- Dopo (Edoardo, 21:28 e 21:36): nel tasto rosso in alto a sinistra solo il logo B&T (`[data-logo-img]`), via la
  scritta e i LED 2x4 (il "in alto a destra" era quello); i tre tocchi fanno lampeggiare il logo (`.logo-flash3`,
  run64 aggiornata); trofei in Firebase con `attivo: true/false` per ognuno (prima `off`; dentro l'app
  resta `off`, `cleanTrophyConfig` si può rifare due volte). Il documento lo crea l'app di un admin al primo avvio.
  Prove: run72 9/9, run64 5/5, run20 13/13, trophies.test 6/6, appdata.test 23/23.
- Link dell'app in chat (Edoardo, 21:40): messaggio con `k` = `{ t, id, ti, su, ln, s/a/b/n, u }` (`compat.linkOf`; solo
  testo e id, le foto le prende ogni telefono dai suoi dati; audio solo da livetiming.formula1.com). Tipi: notizia,
  gara, curva del Ghost Lap, team radio (solo quelli veri di OpenF1), pilota, scuderia, profilo, squadra FantaF1,
  traguardi del Garage, domanda del Fanta. Si allegano scrivendo @ o col tasto del link nel campo (`ChatLinkPicker`,
  categorie e ricerca), oppure con "Invia in chat" (`ShareChatBtn`: Chat B&T nella scheda Condividi della notizia,
  tasto in alto nella pagina della gara, sotto la curva scelta nel Ghost Lap) che chiede la stanza (`ChatRoomPicker`).
  Toccando la miniatura: notizia, gara e Ghost Lap aprono la pagina (Indietro torna in chat, `linkFrom`), il pilota la
  sua scheda, la domanda la pagina FANTA, il profilo il profilo veloce; scuderia, squadra, traguardi e team radio la
  scheda coi dettagli (`ChatLinkSheet`). Senza testo, `txt` = titolo del link (l'app di oggi vede solo quello).
  Prove: `test/e2e/run74-chat-link.js` (3), compat.test e chat.test.

## 29/10 (Edoardo, uso al 95%: lavoro fermato a metà e salvato)
Fatto (prove unitarie verdi; e2e nuove ancora da scrivere): Pit crew 2,35 s (`ensureTrophyDoc` aggiorna il documento
rimasto coi 2,30 di serie); swipe anche sulla barra in basso (`data-nav-swipe`); password col casco (`PwEye`: visiera
alzata = visibile, cifre oro); Pro con annuncio con premio fino a chiusura dell'app o schermo spento (`Ads.showRewarded`,
UNITS.rewarded in ordine se una non ha annunci, `adPro` solo in memoria, `visibilitychange`, tasto nel PremiumModal);
interstitial in fondo alla classifica (`Ads.standingsEnd`, `EndSpy`); profilo in chat anche senza scrivere
(`Chat.announce`: voce {pe:1, p} nella stanza; ogni messaggio mostra l'ultimo profilo dell'autore).
Da fare:
- e2e: swipe sulla barra, PwEye, adPro (AdMob finto di run70 + prepareRewardVideoAd/showRewardVideoAd), announce.
- Classifiche Fanta vere: leghe in `fanta/lega-<CODICE>` (regole: gli utenti autenticati leggono e scrivono), members[aid]
  = {name, team, hist:[{t, d, c, b}]} (squadra pubblicata a ogni cambio); i punti li calcola ogni telefono coi risultati
  veri di Jolpica (results, qualifying, sprint per round, in cache) con BtLogic.sessionPoints/squadScore/transfers e la
  squadra all'ora di blocco del weekend; togliere LEAGUE e LEAGUES_INIT finti; codici delle leghe nell'account.
- Disegni geometrici al posto delle foto di Commons (piloti, auto, loghi); le foto delle notizie restano.
- Suoni e vibrazioni F1 in fx.js (semaforo, radio, DRS, cambio marcia, bandiera a scacchi).
- 30/10 (Edoardo): notizie protette. Con una notizia aperta (view "article") l'app accende FLAG_SECURE col plugin
  nativo SecureScreen (`set({ on })`), che `scripts/prepare_android.py` scrive in SecureScreenPlugin.java e registra in
  MainActivity: screenshot, registrazioni e "Cerchia e cerca" danno nero; uscendo si spegne. Prova: run75. Attenzione:
  l'useEffect sta prima dei return anticipati dell'App (messo dopo, la pagina dopo l'accesso andava in errore).
  Le prove e2e cercano Chromium in /opt/pw-browsers/chromium-1194 solo se c'è (altrimenti quello di Playwright).
  Verificato il 30/10: `JOBS=2 bash test/all.sh` a c3e135d → tutto verde tranne 3 file, ora sistemati: f1data.test (legge
  quanti GP ci sono dal file vero), revisione-b e run72 (nella stanza c.è anche la voce del profilo).

## 31/10: FantaF1 vero (leghe e punti veri)
- Punti dei GP veri: risultati della stagione da Jolpica (results, qualifying, sprint, a pagine da 100, cache 3 ore sul
  telefono, senza rete gli ultimi letti) → `src/logic/fanta-season.js` (roundsFromJolpica, seasonPoints) con le regole
  di sempre (BtLogic.sessionPoints/squadScore/transfers/nextFree) e la squadra che c'era al blocco del weekend
  (teamLock: inizio delle qualifiche o delle Qualifiche Sprint, da CIRCUIT_INFO[...].weekend).
- Storia della squadra nell'account (`squadLog`: {t, d, c, b, n}, una voce a ogni cambio della squadra completa, dopo
  che i dati dell'account sono arrivati; max 80). I punti contano dai weekend da quando si ha la storia: i GP prima
  non hanno la squadra di allora (niente numeri inventati).
- Leghe vere su Firebase: `fanta/lega-<CODICE>` {name, owner, created, members: {aid: {name, team, color, log, bonus,
  gone}}} (`src/services/fantaleague.js`); codici delle mie leghe nell'account (`leagues`). Si crea una lega (Premium,
  come prima), si entra col codice, si invita (condivisione del telefono o copia), chi l'ha creata la rinomina, si esce
  (gone). Ognuno scrive solo il proprio membro: storia della squadra e bonus dei pronostici; i punti li calcola ogni
  telefono, uguali per tutti. Classifica di lega = punti dei GP + bonus. Eliminando l'account il membro resta "uscito"
  senza nome né storia. Tolte le leghe finte (LEAGUE, LEAGUES_INIT, MY_SEASON_PTS).
- Regole di Firestore: `fanta/{doc}` già leggibile e scrivibile dagli utenti con l'accesso (docs/firestore.rules), quindi
  nessun cambio. Limite noto: un utente potrebbe scrivere anche i membri degli altri (servirebbe una regola per campo).
- Prove: `test/unit/{fanta-season,fantaleague}.test.js`, e2e aggiornate sulle leghe vere (run14, run15, run63 con
  `test/fake/leagues.js`).
- Restano: disegni geometrici al posto delle foto di Commons (piloti, auto, loghi); suoni e vibrazioni F1 in fx.js.
- Disegni geometrici (31/10): `GEO_ONLY` in App.jsx spegne le foto di Commons (piloti, monoposto, loghi; le foto delle
  notizie restano). Pilota = casco geometrico nel colore della scuderia (`driverHelmet`: grafica e visiera diverse per
  pilota) + sigla se c'è spazio (Headshot "disegno"); scuderia = scudo `TeamMark` con banda e sigla; scheda pilota =
  casco grande. run67 riaccende Commons con `window.__btCommons = true`.
- Suoni e vibrazioni F1 (31/10, `src/services/fx.js`): suoni nuovi creati dal telefono `light` (luce rossa del
  semaforo), `go` (luci spente e motore), `gun` (pistola delle gomme), `drs` (scatto dell'ala e soffio), `flag` (bandiera
  a scacchi); vibrazioni nuove `lights`, `go`, `gun`, `drs`, `flag` (nel browser schemi di navigator.vibrate, nell'APK
  più colpi di Haptics in sequenza con `later`; spegnendo Vibrazioni i colpi rimasti non partono). Dove: Pit Stop
  Challenge (3 luci, via, pistola su svita/avvita, scatto sugli altri passi, partenza anticipata = abort, bandiera a
  fine), swipe tra le pagine = DRS, trofeo sbloccato = bandiera, messaggio in chat inviato = bip del Team Radio.
- Prove delle richieste del 29/10: `test/e2e/run76-richieste-29-10.js` (swipe sulla barra, casco della password, Pro
  con la pubblicità e spegnimento dello schermo, pubblicità chiusa prima, profilo in chat una voce sola, vibrazioni F1)
  e `test/unit/fx.test.js` (suoni nuovi, sequenze nell'APK).
- Verificato il 31/10: `JOBS=2 bash test/all.sh` a 5763965 → tutto verde tranne run66 e run68, che aspettavano i suoni
  di prima (tic sullo swipe, Shift Light sul trofeo): aggiornate a DRS e bandiera a scacchi, ora 8/8 e 5/5.

## 31/10 sera: richieste dopo la prova dell'APK
- Vibrazioni: nell'APK ora `Haptics.vibrate({duration})` con gli schemi di BUZZ (colpi da almeno 15 ms, sequenze con
  `later`). Prima impact/selection/notification: seguono "Vibrazione al tocco" di Android, spesso spenta, ed Edoardo
  non sentiva niente. Volume dei suoni 1,4 (era 0,8). Non provato su un telefono vero da qui.
- Password: via il casco, etichetta MOSTRA / NASCONDI con l'occhio disegnato (oro quando si vede). run76.
- Profilo pubblico: `src/services/profiles.js` → `fanta/profilo-<aid>` {name, aid, p, medal, t, gone}; ognuno lo
  salva entrando nell'app (solo se cambia o una volta al giorno), il profilo veloce della chat lo legge (vince il più
  recente tra profilo pubblico e messaggi). Scheda sempre completa: "Messaggi qui" e "In chat dal" (dati veri della
  stanza); senza profilo "non ha ancora condiviso casco e trofei". Eliminando l'account il profilo si svuota.
  Regole di Firestore invariate (fanta/* già aperto a chi ha l'accesso; stesso limite noto delle leghe).
  Prove: test/unit/profiles.test.js, run76 (profilo pubblico), run72 aggiornata.
- Bandiera a scacchi: sfondo e scritta solo se la sessione si è vista mentre era in corso (`liveSeen`, sul telefono
  `bt-live-seen`, ultime 30); la sessione di OpenF1 aperta già finita non li mostra più (il podio resta). run40.
- Previsioni e sondaggi del Fanta: finita la gara (stato CONCLUSA) quelli di quel weekend spariscono da FANTA e dai
  link della chat (`predictionsOpen`); restano in shared/bt-predictions, così i punti presi non si perdono. run63.
- Scroll ricordato: nell'App (prima dei return anticipati) la colonna che scorre (.scrollcol) della pagina visibile
  ricorda la sua posizione per scheda/pagina + titolo della pagina interna (tasto Indietro: i giochi del Garage hanno
  la loro); tornando si rimette lì. La chat no (va in fondo). Si riaggancia anche dopo l'accesso (deps: appShown).
  Prove: test/e2e/run77-scroll.js.
- Ghost Lap e Degrado gomme nel weekend in corso: la catena dei dati funzionava già (workflow ogni ora nel weekend,
  sito aggiornato, app che riscarica ogni 30 minuti), ma il Ghost Lap usava solo le qualifiche e il Degrado solo le
  gare: durante il weekend si vedeva il GP prima. Ora:
  - tools/make_live_data.py: se l'ultimo weekend ha prove libere ma non ancora le qualifiche, il Ghost Lap è quello
    dell'ultima sessione di prove (FP3, poi FP2, poi FP1), id `<circuito>-2026-fp2`, nome "… · Prove Libere 2"; poi le
    ultime qualifiche (sempre 2 Ghost Lap in tutto). Rigenerato il 31/10 da TracingInsights 0d9f163: Messico FP2 + Austin.
  - App: card della Race ed elenco del Garage dicono "prove libere N" o "qualifiche" (`ghostSessLabel`); la card del
    Ghost Lap di prove c'è dall'inizio del weekend; il Garage mostra il weekend già iniziato (ghostForNow).
  - Degrado gomme: sorgente "Prove libere" (di serie se l'ultimo weekend non ha ancora la gara nei dati) con FP1/FP2/FP3:
    `BtWk.practiceRace` trasforma la sessione in stint (numero di stint, mescola, giri delle gomme) e `raceDeg` la
    calcola senza confronto col gruppo (giri non allineati) e contando dal primo giro.
  - test/unit/f1data.test.js ora legge le attese da index.json (prima scritte a mano: si rompeva a ogni weekend).
  Prove: test/unit/weekend.test.js (Messico FP2), run76 (Degrado nel weekend del Messico), run70 ok.
- Figure dei piloti: `DriverFace` (SVG) al posto del casco negli avatar dei piloti (Headshot "disegno") e nella
  scheda del pilota: pelle, colore e taglio dei capelli, barba/baffi da `DRIVER_LOOKS` (tratti noti, da correggere lì
  se Edoardo vede qualcosa di sbagliato), tuta nel colore della scuderia; piloti non in tabella: 3 figure di riserva.
  run67 (figure di serie, Hamilton e Bottas, almeno 10 diverse).
- Verificato il 31/10 sera: `JOBS=2 bash test/all.sh` a 31968a3 → TUTTO VERDE (84 file).

## 31/10 pomeriggio
- Admin (admins/<email>): Premium e tutti i trofei gratis (`isAdminNow`; i trofei mancanti si segnano coi dati
  dell'account arrivati). Nelle prove a@b.it è admin: `__btSeed.noAdmin` lo rende utente normale. run78.
- Fanta: i nuovi utenti partono senza squadra (5 piloti e 2 scuderie da scegliere, squadBase null = la prima squadra
  non conta come cambi); chi aveva ancora la vecchia squadra di serie (FANTA_OLD_DEFAULT) la ritrova vuota, senza le
  voci della storia di quella squadra. Nelle carte dei piloti la figura (DriverFace). run78.
- Chat: la prova di togliere il profilo dai messaggi e dalle stanze è stata ANNULLATA su richiesta di Edoardo (2ac243c):
  la chat è com'era.
- Profili users/<email>, un campo per cosa (Edoardo: "ci sono molte volte l'utente premium"): via nick (= name),
  isPremium/premium/plan (il Premium sta in app2.premium.sub), notif (mai usati). Entrando il profilo si sistema da
  solo (account.js tidyProfile); un isPremium: true dato a mano passa in app2.premium.sub; i nuovi account nascono
  puliti. compat.profileFromStore: isPremium = isPremium vecchio o app2.premium.sub. test/unit/account.test.js.
  Nota: per dare il Premium a mano da Firebase ora si mette app2 → premium → sub = true.
  Con un abbonamento Stripe dell'app di prima (stripeSubscriptionId) isPremium e plan restano: li scrive il suo server.
- Prove: a@b.it non è più admin di serie (seed.admin per averlo); openAdmin() lo rende admin e l'app rilegge
  admins/<email> toccando il Profilo (Account.refreshAdmin, account nuovo così si ridisegna). Il tester ha una squadra
  Fanta sua (fake-firebase).

## 31/10 notte: temi delle feste e OpenF1 in tempo reale
- Temi delle feste (`src/logic/holidays.js`, date di Roma): Halloween 30/10-1/11 (#FF7A1A), Natale 1/12-26/12
  (#D7263D), Befana 5-6/1 (#F2A541), Monza dal giovedì al lunedì del GP del circuito it-1922 (#CE2B37).
  Cambiano colore dei tasti, caricamento (HolidayLoader), splash, segno nella testata, alcuni suoni (fx.setHoliday:
  es. a Halloween lo swipe fa "howl"). Card della festa in Home (HOLIDAY_STORY: la stagione raccontata coi dati veri).
  Interruttore "Temi delle feste" nel Profilo (users app2.holidays, sul telefono bt-holidays-on); movimento ridotto
  rispettato. Admin: scheda TEMI del Pannello → shared/bt-holidays {force, off} (forzare una festa o spegnerne una).
  Progetto grafico: docs/design/temi-feste.html.
- Halloween fatto tutto: zucche che compaiono ogni 2 cambi di scheda (al massimo 3 al giorno, bt-pumpkins), scherzo
  con la bandiera gialla, trofeo "Zucche" (events.pumpkins >= 3). Trofei nuovi anche avvento, calza, monza (segreto):
  19 in tutto.
- Da fare (task #21-#24): Natale = calendario dell'Avvento (logica pronta in `src/logic/advent.js`, manca la UI e la
  chiave "advent" tra i dati dell'utente), regalo del 25/12, cartolina da condividere; Befana = calza (finitura
  carbone); Monza = invasione di pista + trofeo "Ero a Monza" + VMAX solo con dati veri; holidayOpen per Natale e
  Befana (ora null). Poi prove e APK.
- OpenF1 in tempo reale: Edoardo ha il piano Sponsor (9,90 euro/mese, uso commerciale piccolo, 6 richieste/s e
  60/min; Bruno di OpenF1 chiede una sola connessione dal server e gradisce la citazione). `api/live.js` su Vercel
  (progetto bt-app-2): prende il token con OPENF1_USERNAME / OPENF1_PASSWORD (SOLO nelle variabili di Vercel, mai
  nel codice né in chat), lo tiene per l'ora di validità, cache 10 s in memoria e s-maxage 10 sul CDN, solo gli
  endpoint dell'elenco ALLOWED; `?check=1` dice se le credenziali vanno ({"ok":true} il 31/10).
  App: durante una sessione l'API gratis è bloccata → `OF1.loadSession(key, {live: true})` passa da api/live, ogni
  15 s; "Aggiorna" forza subito (tick(true)); `ongoing` = sessione non ancora finita → niente bandiera a scacchi.
  Provato il 31/10 con le FP3 del Messico: 22 auto, posizioni, stint e meteo (giri ancora vuoti in quel momento).
  Crediti in "Informazioni": OpenF1, Jolpica F1, TracingInsights, MET Norway.
  Attenzione: l'abbonamento OpenF1 finisce il 18/11 se Edoardo non preme "Non annullare l'abbonamento"; il piano
  Hobby di Vercel potrebbe non essere per uso commerciale (Pro o Cloudflare se serve).
  Prove: test/unit/live-api.test.js, test/unit/openf1.test.js (diretta).
- Prove: test/unit/holidays.test.js, advent.test.js, trophies (19), appdata (26 chiavi); e2e run79-feste (6).
  a@b.it nelle prove non è admin: `seed: { admin: true }` dove serve dall'avvio (revisione-b C1, run34 DEMO, run72).
  La prova DEMO di "Voce del paddock" ora controlla che il voto resti sul telefono (l'admin ha già tutti i trofei).
- Verificato il 31/10 notte: JOBS=2 bash test/all.sh a 3aa5db3 → 87 file su 89 verdi; run68 (totale dei trofei scritto a mano) ora prende il numero da logic/trophies ed è verde; run33 "caricamento lento" è rossa solo con 2 prove alla volta (da sola 22/22: questione di tempi). APK di prova da 3aa5db3: GitHub run 41232720813 riuscito.

## 31/10 tarda sera: rivedere tutte le sessioni del weekend, mini Pit Board
- Edoardo: "quando voglio rivedere le prove libere o le qualifiche non fa vedere niente". Causa: l'app mostrava solo
  l'ultima sessione di OpenF1, e le PL3 del Messico (finite da 2 ore) su OpenF1 avevano la classifica ma 0 giri e una
  sola posizione a testa: sessione vuota, tutti "–". Ora:
  - Tasti delle sessioni del weekend già cominciate (PL1, PL2, PL3, Q SPRINT, SPRINT, QUALIFICHE, GARA) sopra la diretta
    della Race (SessionPicker, data-session-pick); di serie l'ultima; quando comincia una sessione nuova si torna lì.
    `OF1.weekendSessions(meeting_key, {before})` (1 richiesta quando cambia l'ultima sessione), `replayTarget`,
    `sessionShort` in src/services/openf1.js. Sessioni finite già caricate in memoria (al massimo 4): tornandoci niente
    richieste (OpenF1 gratis: 30 al minuto, ~11 a sessione).
  - Prove e qualifiche senza giri ma con la classifica: `buildReplay` prende posizione e miglior giro da session_result
    (duration; in qualifica il più veloce di Q1/Q2/Q3), con la scritta "I tempi giro per giro non sono ancora su OpenF1".
  - Sessione senza giri né classifica: "Dati non ancora disponibili" (prima una sessione vuota), si riprova ogni 5 minuti,
    i tasti restano per scegliere le altre.
  - Una sessione passata presa da api/live (OpenF1 gratis bloccato da quella in corso) non si ricarica ogni 15 s
    (liveMode solo per l'ultima): niente spreco del limite di 60 richieste al minuto.
  - Prove: test/unit/openf1.test.js (weekendSessions, replayTarget, sessionShort, prove senza giri), test/e2e/run80-sessioni.js.
- Mini Pit Board (Edoardo: "il tuo pilota, tempo sul giro, posizione… che ti segue per tutta l'app in piccolo e che si
  possa togliere"): `MiniPitBoard` sopra la barra in basso (e in fondo alle altre pagine) durante una sessione in corso
  o rivista mentre scorre: sigla col colore della scuderia, posizione, tempo sul giro (l'ultimo in gara, il migliore nelle
  altre), distacco, giro/tempo. Non nella Race (ha la Pit Board grande), non nella chat aperta né nel Pannello Admin.
  Toccandola si va alla Race; la X la chiude per quella sessione (torna con la sessione dopo); interruttore "Pit Board in
  tutta l'app" nel Profilo (sul telefono: bt-minipit-on). Prove: test/e2e/run81-minipit.js.
- Verificato il 31/10 tarda sera: JOBS=2 bash test/all.sh a 7f9f129 → TUTTO VERDE (91 file).

## 1/11 notte: diretta che non arrivava durante le qualifiche del Messico, Ghost Lap solo qualifiche
- Edoardo, durante le qualifiche: solo un messaggio tipo "riprova / connessione", caricato solo dopo la fine. Causa:
  in diretta OpenF1 gratis è bloccato per TUTTO, anche `sessions?session_key=latest`; l'app chiedeva l'ultima sessione
  solo lì, quindi non arrivava mai ad api/live (provato prima solo con uno script che conosceva già la session_key).
  Ora: se OpenF1 gratis non risponde (bloccato, irraggiungibile, occupato) ultima sessione, sessioni del weekend e dati
  arrivano da api/live (`OF1.latestSession({live: true})`); se anche api/live non risponde resta "SESSIONE IN CORSO".
  Ricarica ogni 15 s solo con la sessione in corso (ongoing). Prova: test/e2e/run82-diretta.js (OpenF1 gratis bloccato
  per tutto, api/live finta; e api/live giù).
- api/live: cache 15 s (era 10): l'app chiede ~12 indirizzi ogni 15 s, con 10 s OpenF1 poteva riceverne fino a 72 al
  minuto (limite del piano 60). test/unit/live-api.test.js.
- Ghost Lap: solo qualifiche (Edoardo). Tolto il Ghost Lap dalle prove libere di 2009f67 (tools/make_live_data.py,
  ghostSessLabel, ghostForNow dall'inizio del weekend); la card del Garage resta sul GP delle ultime qualifiche già corse
  (ghostForNow). Dati rigenerati da TracingInsights 2b8da62: Ghost Lap Messico Q + Austin Q. Il Degrado gomme dalle
  prove libere resta (run76 ora legge le sessioni attese da weekend.json).
- Verificato il 1/11 notte: JOBS=2 bash test/all.sh a 54396d4 → TUTTO VERDE (92 file). APK di prova da 54396d4 (GitHub, 00:30).

## 1/11 mattina: Pit Swipe, easter egg, stile Duolingo (niente leghe a livelli: Edoardo "non fare le robe della F3-2")
- Pit Swipe (design docs/design/pit-swipe.html; logica src/logic/pitswipe.js, test/unit/pitswipe.test.js): riquadro in
  Home AL POSTO di quello di Instagram (Instagram resta nel Profilo), vista "pitswipe". Mazzo del giorno (chiave: giorno
  dalle 8:00 di Roma + sessioni del weekend finite): 6 notizie (gusti o per data), 2 opinioni accese non votate, 1 vero o
  falso (makeFacts: titoli e città di nascita dei piloti, lunghezza/curve/giri/primo GP/record dei circuiti), 1 carta del
  pilota del cuore (ultima gara e mondiale veri). Gesti: destra BOX BOX (salva), sinistra STAY OUT, su RADIO (in chat,
  solo notizie), GIRO VELOCE (1 per giro, vota "f"), BANDIERA ROSSA (indietro). Tutto nei dati dell'account app2.swipe:
  { w gusti, mode, deck { key, cards [{k,id}], i, acts, hist, seen, fast, done, ok }, tot { decks, box, votes, tfOk, radio,
  fast, pit, pred, missions }, week { key, c }, streak { n, last, pits, decks }, tf { run, best }, eggs [], onb }.
- Voti veri: fanta/pitswipe-voti (__arr con arrayUnion, firebase.docAppend; src/services/swipevotes.js); conta l'ultimo
  voto per account; percentuale solo da 20 voti ("Sei tra i primi a votare"). Opinioni: shared/bt-takes, scheda OPINIONI
  del Pannello Admin (KINDS.takes in appdata.js).
- Serie per GP (roundOf: dal martedì dopo un GP al lunedì dopo il successivo), pit stop salva-serie ogni 5 giri (max 2);
  missioni della settimana (3 su 8, settimana ISO di Roma; anche Pit Stop e pronostici le fanno avanzare); livello del
  tifoso (Kart, Rookie, Pilota titolare, Caposquadra, Leggenda del paddock, Campione del mondo) da giri, risposte, voti,
  box, missioni e trofei: in Home, a fine giro e nel Profilo (FanLevelCard).
- Easter egg (swipe.eggs; toast "Easter egg trovato: X (k/6)"): Donuts (carta girata in tondo), Limiti della pista (carta
  lanciata troppo veloce; 3 volte = 5 s di penalità), Pioggia vera (meteo vero MET Norway del circuito nel weekend,
  rainingNow), Launch control (logo premuto 3 s; prima "Anti-stallo"), Radio in chat ("box box"), Il muretto risponde
  (5 tocchi sulla mini Pit Board: PUSH PUSH o BOX se il pilota è ai box). Trofei nuovi: boxbox (100), opinionista (50),
  giroperfetto (10 di fila), ingegnere (segreto, tutti e sei): 23 trofei.
- Stile Duolingo: primi passi in Home (pilota del cuore, squadra Fanta, primo giro; "Nascondi" = swipe.onb "off");
  Bentornato dopo 7 giorni (bt-last-seen sul telefono); promemoria sul telefono con @capacitor/local-notifications
  (src/services/reminders.js: giro di domani alle 8:30, qualifiche/sprint/gara un'ora prima, serie in pericolo la domenica
  alle 18; mai 22-8; permesso chiesto solo dopo il primo giro; interruttore "Promemoria sul telefono" = notifPrefs.reminders;
  scripts/prepare_android.py aggiunge POST_NOTIFICATIONS); "Stessa strategia" a fine giro con l'amico della lega (almeno 3
  opinioni in comune, 60% uguali) e sfida 1 contro 1 al Pit Stop col proprio miglior tempo (src/services/duels.js,
  fanta/pitswipe-sfide: un tentativo, conta il primo; scade in 7 giorni; riquadro "Sfide al Pit Stop" in Home).
- Non fatto: leghe a livelli (Edoardo no); notifiche mandate dal server (servono Firebase Cloud Messaging e il file
  google-services.json dalla console di Firebase: lo deve scaricare Edoardo).
- Prove: test/unit/pitswipe.test.js, test/unit/swipe-services.test.js, trophies (23), appdata (27 chiavi);
  e2e run83-pitswipe, run84-easter, run85-duolingo.
- Verificato 1/11: suite completa, 4 file rotti dal riquadro Instagram spostato e dal numero dei trofei (run20, run34-admin, run72, run73) sistemati e rilanciati verdi.

## 1/11 pomeriggio: pubblicità vere, funzioni Pro col video, notizie Premium, suoni nuovi, Google Play e Stripe
- Suoni: i 5 file di Edoardo (Pixabay, licenza libera) in public/sounds (tap, click, nav, swipe, radio: silenzio tolto,
  mono, volume pareggiato con ffmpeg); src/services/fx.js li carica al primo tocco (Web Audio, buffer) e ogni nome dell'app
  (tick, clack, shift, swoosh, radio, done, abort, light, go, gun, drs, flag, rev, howl, bell) usa un file con velocità e
  volume (SOUND_MAP). Niente più sintetizzatori. Le carte di Pit Swipe suonano swoosh.
- Pubblicità vere: tolto BT_ADMOB_TEST da .github/workflows/apk-prova.yml e da codemagic.yaml (APK di prova e Play Store);
  ads.js accetta test come funzione: agli admin unità di prova (adsTestForAdmin), ma gli admin sono Premium e di fatto non
  vedono annunci. Rischio: chi tocca apposta gli annunci veri mette a rischio l'account AdMob.
- Funzioni Pro (Edoardo): Second Screen, telemetria, tempi sul giro, radio e gomme della diretta. Senza Premium: foglio
  "Funzione Pro" (ProGateSheet, data-pro-gate) o scheda bloccata (ProLockCard, data-pro-lock) con GUARDA UN VIDEO
  (data-pro-ad, solo nell'APK) e PASSA A PREMIUM. Un video le sblocca TUTTE finché non chiudi l'app (adPro, come prima);
  se Google non ha annunci ("unavailable", per esempio finché AdMob non approva l'app) si sblocca lo stesso.
  isPaid = Premium vero (account.paidPremium dal server, app2.premium.sub, prova, admin): toglie banner e interstitial e
  apre le notizie Premium; isPremium = isPaid || adPro (funzioni Pro). Il video NON toglie più i banner.
- Notizie Premium: un video per notizia (data-article-ad), resta sbloccata sul telefono (bt-ad-news, ultime 200). Admin:
  interruttore SOLO PREMIUM (data-news-premium) per qualsiasi categoria.
- Pagamenti veri (PAYMENTS_ENABLED = true, src/services/billing.js): nell'APK SOLO Google Play (regole del Play Store:
  niente Stripe, link o schede del browser verso pagamenti esterni), plugin @capgo/native-purchases (NativePurchases).
  Prodotti da creare nella Play Console (nomi fissi): abbonamento premium_stagione con piano base stagione (annuale,
  6 euro); prodotto singolo caffe (si consuma, si può offrire di nuovo). Pagato con Google Play: app2.premium = { sub: true,
  src: "play", at } (vale anche sul sito); all'apertura dell'APK, se Google Play non vede più l'abbonamento, sub torna false
  (solo per src "play"). Il prezzo vero di Google Play compare nel foglio Premium e accanto a "Offrici un caffè".
- Sul sito Stripe: api/stripe-checkout.js (pagina di pagamento; torna a ?pagamento=ok&cosa=premium|coffee o
  ?pagamento=annullato, avviso dopo l'accesso) e api/stripe-webhook.js (firma controllata; scrive in users/<email> solo
  isPremium, plan, premiumSource, premiumUntil, stripeSubscriptionId, stripeCustomerId; mai account nuovi); api/_lib/pay.js
  senza librerie (fetch e crypto). Variabili da mettere su Vercel (le scrive Edoardo): STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_PREMIUM, STRIPE_PRICE_COFFEE, FIREBASE_SERVICE_ACCOUNT. Webhook in Stripe:
  https://bt-app-2.vercel.app/api/stripe-webhook con checkout.session.completed, customer.subscription.updated/deleted.
- Da sapere: Vercel gratis (Hobby) è solo per uso non commerciale: coi pagamenti serve Vercel Pro o spostare le due
  funzioni altrove. Il Premium di Google Play per ora lo decide il telefono (nessun controllo dal server con l'API di Google
  Play) e le regole di Firestore lasciano scrivere all'utente il suo documento: chi sa programmare potrebbe darsi il
  Premium. Prossimo passo: controllo dal server e regole che proteggono i campi del Premium.
- Prove: test/unit/billing.test.js, test/unit/payments-api.test.js, fx (12), ads (10), compat (paidPremium);
  e2e run86-pro-pagamenti (7); aggiornate run14, run40 (seed pro), run69, run76; seed.pro nel Firebase finto.

## 1/11 sera, dopo: pagamenti di nuovo accesi
- Edoardo: "no, perché li hai tolti, ci sono tante altre possibilità, fai tornare tutto come prima". Annullato il commit
  9126781 (pagamenti spenti): tornano Google Play Billing nell'app (@capgo/native-purchases), Stripe sul sito, i prezzi e
  "Abbonati" nel foglio Premium, la §4 dei Termini coi pagamenti. Vale la sezione "1/11 pomeriggio".

## 1/11 notte: gara in diretta (piano nel progetto: claude/piano-gara-live.md) e sconti delle feste
- Edoardo: "fai il più possibile anche se lascia il codice a metà" (token settimanali all'85%).
- Telemetria del giro in diretta: openf1.carData(…, { live }) passa da api/live (l'API gratuita in gara è bloccata);
  buildReplay riceve live.
- Mappa fluida in diretta: con la sessione in corso (of1Live.ongoing) si guarda LIVE_LAG_S = 20 s dietro gli ultimi
  dati e il tempo scorre da solo nell'intervallo da 250 ms (prima restava fermo 15 s e poi saltava). Non ancora fatto:
  coordinate vere (location di OpenF1) nella mappa.
- Ritiri in diretta (openf1.js): un'auto che non chiude il giro da più di 3 giri tipici, non ai box e non con la rossa,
  è ritirata in quel giro (RIT in classifica).
- Bandiera rossa: pagina Race rossa (data-red-screen, RED_SCREEN_BG) con la scritta "BANDIERA ROSSA · SESSIONE
  SOSPESA" e, nella Classifica di gara, la nuova griglia vista dall'alto (RedFlagGrid, data-red-grid: auto due a due
  sfalsate, posizioni guadagnate o perse rispetto a c.grid).
- Team radio (RadioPlay): tasto grande Ascolta/Pausa, un audio alla volta, le 3 più recenti caricate in anticipo;
  interruttore "Ascolta i team radio" (bt-radio-auto) fa partire da sole quelle nuove. Solo in RadioList (pagina Race).
- Garage "In arrivo": Telecronaca AI.
- Feste: Black Friday (src/logic/holidays.js: dal venerdì dopo il quarto giovedì di novembre al lunedì; oro, suono
  "gun"); sconti sale: Black Friday 50, Natale 30, Befana 20, Monza 25 (saleOf). Lo sconto si vede nel foglio Premium
  (data-sale) solo col prezzo vero dell'offerta di Google Play con lo stesso nome (blackfriday, natale, befana, monza:
  da creare nella Play Console) e l'acquisto usa quell'offerta; sul sito api/stripe-checkout mette il coupon
  STRIPE_COUPON_<NOME> se c'è su Vercel.
- Chat: le stanze diverse da Generale e FantaF1 Talk mostrano solo i messaggi dopo la fine dell'ultimo GP (chatSince,
  partenza della gara + 4 ore): i vecchi non si cancellano. Da fare: anche anteprima e non letti della lista delle chat.
- Da fare (piano): mappa con location vera, B&T Highlights (pit più
  veloce, rientro dopo il pit), telecronaca scritta, avvisi ogni 20 giri / SC / rossa / penalità, notifiche push.
- Prove: holidays (Black Friday e sconti), billing (offerta della festa), payments-api (coupon).
- 1/11 23:00 (Edoardo durante il GP del Messico): giri totali dal circuito (CIRCUIT_INFO.laps, buildReplay laps: in
  Messico 71, non i giri fatti); bandiera rossa con "RIPARTENZA TRA m:ss" dal messaggio della direzione gara
  (resumeAt: "... RESUME AT 15:05", ora del circuito); interruttore "Ascolta i team radio" anche prima delle radio;
  scheda Gomme: tasto "N PIT" per pilota, toccando gli stint veri (sim.stints: mescola, giri, usata). Non provati con
  la suite (Edoardo ha fermato le prove). Da capire: punti sulla mappa spariti con la rossa (le auto sono in pit lane) e
  telemetria del giro che ancora non arriva in diretta.
- 1/11 23:20: punti dei piloti spariti dalla mappa in diretta (Edoardo) → tolto il ritardo di 20 s (LIVE_LAG_S = 0, come
  prima delle 22:44); la mappa fluida va fatta con location di OpenF1. Pagina Race: trascina in giù per aggiornare
  (usePullRefresh con onOf1Refresh, data-race-pull).
- 1/11 23:40: grafico del degrado delle gomme (TyreDegChart, data-deg-chart) aprendo "N PIT" nella scheda Gomme: tempi
  veri per stint (senza giri di uscita, bandiere, neutralizzazioni e oltre il 107% della mediana), retta e s/giro.
  Verificato con la gara vera di Baku a metà gara: grafico visibile; 20 punti distinti sulla mappa.
- 1/11 23:50, punti dei piloti (causa trovata): in diretta OpenF1 scrive il giro solo quando è chiuso, così dopo l'ultimo
  giro chiuso tutte le auto finivano sulla linea del traguardo, una sopra l'altra. openf1.js carAt: giro in corso
  stimato dalla fine dell'ultimo (ghost, giro tipico, max 2 giri; mai ai box, ritirata o a gara finita); in diretta il
  tempo scorre da solo fino a 90 s oltre gli ultimi dati (LIVE_AHEAD_S) e coi dati nuovi si riparte da dove si era
  (lastOf1Sim). Prova: test/unit/openf1.test.js "diretta senza il giro in corso".

## 2/11 mattina: progetto grafico "Campione del mondo" (esempio Kimi Antonelli)
- docs/design/campione-del-mondo.html e .png: 1) match point (vantaggio contro punti in palio, cosa serve), 2) schermata
  del titolo a tutto schermo una volta sola, 3) storia Instagram 9:16, 4) dopo: trofeo segreto "Ci credevo", tema della
  squadra 48 ore, bonus FantaF1 del pronostico. Numeri d'esempio. Non ancora nel codice.
