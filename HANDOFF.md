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
- Animazione del titolo (docs/design/campione-animazione.html e .mp4, ~7 s, solo transform e opacity): ultimo giro →
  bandiera a scacchi → lampo turchese e "KIMI È CAMPIONE!" sulla pagina Race → "1" d'oro → casco → nome e titolo →
  numeri della stagione e coriandoli → tasti. Con "Rimuovi animazioni" solo l'ultima schermata.
- Il campione nelle pagine (docs/design/campione-pagine.html e .png), per 48 ore: Home (riquadro col "1" d'oro che
  rivede l'animazione, notizie e mazzo Pit Swipe del titolo), Race (riga d'oro "CAMPIONE" nel Mondiale fino alla nuova
  stagione, grafico della corsa al titolo), Fanta (bonus del pronostico, lega, punti doppi al campione nel GP del
  titolo), Chat (messaggio dell'app con reazioni), Notifiche e Profilo (avviso, trofeo, distintivo). Non ancora nel codice.
- Campione del mondo nel codice (versione ridotta, token quasi finiti): champOf (vantaggio > punti ancora in palio,
  25 a GP + 8 a Sprint, solo classifica vera) → ChampionTakeover a schermo intero una volta per telefono
  (bt-champ-<anno>-<pilota>), animazioni in App.css (solo transform/opacity, reduced-motion), riga d'oro
  "CAMPIONE DEL MONDO" sopra al podio del Mondiale + etichetta nella lista. Test: test/e2e/run87-campione.js.
  Da fare: match point, storia da condividere, trofeo "Ci credevo", bonus FantaF1, messaggio in chat, tema 48 ore, Home.

## 3/11: via immagini e Pit Swipe (versione ridotta, token al 2%)
- Niente immagini di piloti, scuderie e loghi: useCommonsPhoto restituisce sempre null, Headshot solo disegno,
  podio/scheda/pagina pilota senza foto, scheda FOTO tolta dall'admin (AdminPhotosTab resta nel codice, spento).
- Pit Swipe tolto dalla Home (PitSwipeCard non più mostrata; il codice resta).
- Highlights: se manca la copertina, usa quella del video YouTube (ytThumb, i.ytimg.com/vi/<id>/hqdefault.jpg).
- Passaggio tra schede più rapido (.24s, ease) con will-change.
- Prove su foto/caschi/Pit Swipe dalla Home ora possono fallire: aggiornarle (non cancellarle).
- Da fare: archivio storico GP modificabile dall'admin (aggiungi/modifica/togli), magari dati FastF1 da script.

## 4/11: micro-animazioni dal video di Edoardo (token all'1%)
- Fatto: "Bookmark Save" nell'articolo (segnalibro che si allunga quando salvi: .bm-pop in App.css, data-bm-pop).
- Da fare dallo stesso video (catalogo di 12 UI): Skeleton Pulse nei caricamenti, Segmented a molla (Mensile/Stagione
  nel Premium con "-20%"), Flip Knob negli interruttori, 3D Push Button, Shine Sweep su "Passa a Premium", Review Bars
  e Score Wheel nei sondaggi/voti, Flip Down per gli avvisi di aggiornamento, Warning Pulse per bandiera rossa,
  Card Declined per pagamento rifiutato. Blur-up scartato (filter: regola solo transform/opacity).
- 4/11 pomeriggio, fatte le altre dal video (solo transform/opacity, ferme con reduced-motion):
  Score Wheel (RollNumber, cifre a tamburo: punti nella schermata del campione), Review Bars (barre del sondaggio che
  crescono una dopo l'altra, data-poll-bar), Flip Knob (faccia del pomello di Toggle che gira, il pomello resta uguale),
  Segmented a molla (Mondiale Piloti/Costruttori, data-champ-seg), Shine Sweep (cta-shine sui tasti Premium),
  Warning Pulse (WarnPulse nel banner della bandiera rossa), Skeleton Pulse (dati della sessione in caricamento),
  3D Push Button (PushToggle per "Ascolta i team radio"), Card Declined (PayFailCard se il pagamento non va),
  Flip Down (toast che scende ruotando dal bordo alto). Blur-up scartato (filter).
  Verificato: check/sem, run61, run87, run15, run62, run14, run69, run40, run86 verdi.

## 7/11: micro-animazioni rifatte nei posti giusti + data di nascita
- Edoardo: "la carta parte quando scrollo nella Home". Nel browser di prova scorrendo la Home non compare nulla
  (sonda /tmp/bt/probe_home_0711.js); resi più stretti i due candidati: la carta del pagamento rifiutato (PayFailCard)
  ora parte solo con reason "failed" (non con Google Play assente, prodotto non configurato o annullato) e le barre
  del sondaggio crescono solo subito dopo il voto (prima a ogni apertura della scheda). Se lo rivede: chiedere uno screenshot.
- RollNumber rifatto: il testo resta il numero vero, le cifre salgono dal basso (.roll-in) e girano solo quelle cambiate.
  Usato in: schermata del campione, conto alla rovescia "Chiusura squadra" del FantaF1, punti totali FantaF1,
  percentuali del sondaggio dopo il voto.
- WarnPulse anche in FlagBanner per safety car, virtual safety car e bandiera rossa (colori della bandiera).
- Skeleton (componente) nei dati della sessione e nella telemetria in caricamento.
- Luccichio (cta-shine) su tutti gli inviti "Passa a Premium" (non sul tasto piccolo dell'intestazione).
- Data di nascita in registrazione: BirthDateField (GG/MM/AAAA con le barre automatiche, oppure calendario sotto al campo
  con rotella dell'anno a scorrimento, frecce e mesi). Salva about.birth (anno) + about.birthDate "AAAA-MM-GG";
  account.js controlla l'età esatta con la data (tooYoung), compat.js passa birthDate al profilo. Il profilo mostra la
  data; se si cambia l'anno col manettino del profilo la data intera diventa null.
- Prove: run88-nascita (nuova), run31 aggiornata (la data si scrive), unit account/compat con casi nuovi.
  Verificato: check/sem, unit account e compat, run31, run88, run87, run14, run69, run40, run86, run16, run15 verdi.

## 7/11 pomeriggio: notifiche, notizie, ELO, swipe come WhatsApp, Premium e trofei, Pit Swipe dall'admin
- Notifiche (video del 4/11): "Flip Down" sugli avvisi in alto (.live-notice: giro veloce, ritiro, trofeo; in Diretta il
  posto usa translate, il transform è dell'animazione) e "Gooey Drop" (DropNotice) per una notifica nuova arrivata dopo
  l'apertura dell'app (data > appOpenedAt): goccia → pillola in alto, tocco = Notifiche, sparisce in 5,2 s.
- Notizie (Home), rifatte su richiesta di Edoardo (prompt corretto + video di riferimento): elenco verticale con le
  schede orizzontali di sempre (niente griglia, niente pizzico: tolti), "ULTIM'ORA" sulla notizia in evidenza se ha meno
  di 3 ore, dietro al feed una luce del colore della notizia che stai guardando (colore del primo hashtag, due strati
  .news-amb che si danno il cambio con l'opacità, data-news-ambient), schede che entrano salendo mentre arrivano dal basso
  (IntersectionObserver → .news-in, con translate/scale così il transform resta dello swipe della riga), articolo che
  entra salendo (.article-in).
- FantaF1: ELO come negli scacchi (src/logic/elo.js, regola nel commento e nell'app con "Come si calcola"): parte da 1200,
  ogni GP confronti a coppie coi membri delle mie leghe, K 40/24/16, fasce Esordiente → Leggenda. FantaEloCard nel Fanta,
  "ELO n" nella classifica della lega. Solo punti veri dei GP (Jolpica), niente bonus dei pronostici.
- Swipe tra le schede come WhatsApp: la pagina segue il dito 1:1, accanto la scheda vera (data-tab-neighbor, montata
  quando si capisce la direzione, stessa key: lasciato il dito diventa la scheda attiva senza rimontarla), pillola che
  scorre insieme, fine corsa con la velocità del dito; elastico ai bordi. Tocco sulla barra: entrata e uscita con lo
  stesso passo (.28s). Via le icone ai lati (TabPeek resta nel codice, non usata). tabBodyFor(tab) dà il corpo di una scheda.
- Funzioni Pro coi trofei (src/logic/trophypro.js): tempi sul giro 3 trofei + "Pit crew", gomme 5 + "Griglia completa",
  radio 8 + "Radio aperta", telemetria 11 + "Oracolo", Second Screen 14 + "Pit stop perfetto". proGate e RaceScreen
  (proUnlocked) le aprono; il lucchetto dice cosa manca (proHint); nel Profilo "FUNZIONI PRO COI TROFEI".
- Premium rifatto (regole di Edoardo): titolo sul risultato, griglia della stagione (SeasonGrid), 3 icone con 2 parole,
  Stagione già scelta con "RISPARMI x%" e prezzo al mese, Mensile come alternativa (MONTH_PRICE 0,99 €), cosa succede
  dopo la prova, un solo colore. Mensile vero: piano base "mese" dell'abbonamento premium_stagione nella Play Console
  (se manca, nell'APK il Mensile non si vede) e STRIPE_PRICE_PREMIUM_MONTH su Vercel per il sito (se manca: "config").
- Pit Swipe spento di serie: interruttore in Admin → FUNZIONI (shared/bt-flags { pitSwipe }); spento non c'è la scheda
  in Home, né il passo dei primi passi, né il giro nel "Bentornato". Prove di Pit Swipe lo accendono nel seed.
- Prove: run88-nascita (Pit Swipe admin, goccia, notizie, ELO/trofei/Premium), run71 aggiornata allo swipe nuovo, run60
  (manettino provato in "Su di te", la registrazione ha la data),
  run20/83/84/85 col Pit Swipe acceso, run86 col titolo nuovo, unit elo, trophypro, billing (Mensile), payments-api.
- Verificato il 7/11: check/sem, unit elo, trophypro, billing, payments-api, appdata; run71 (10/10), run88 (notizie e
  le altre), run20/83/84/85 col Pit Swipe acceso. Il giro completo (all.sh) è stato fermato da Edoardo a 77 file su 104:
  fino lì falliva solo run60 (aggiornata dopo, non rigirata). Da rifare: JOBS=2 bash test/all.sh.
- 7/11 tarda mattinata (prompt "vertical snap" di Edoardo, come funzione dell'app): la Home scorre a scatti
  (scroll-snap-type y mandatory su [data-home]); punti di arresto: testa con ricerca e filtri (start), notizia in evidenza
  e ogni notizia (center), coda dei contenuti Premium (start). La scheda al centro è a fuoco, quelle sopra e sotto si
  vedono più piccole e spente ai bordi (paintFocus: scale e opacity sulla riga, il transform resta dello swipe). Luce del
  colore della notizia al centro. Schede orizzontali di sempre, barra in basso ferma. Prove: run88 (notizie), run77.
- 7/11 fine mattinata, prove finite: il giro completo è stato completato a pezzi (77 file prima, 26 dopo) e poi le
  prove delle notizie rifatte dopo la Home a scatti. Aggiornate 5 prove rimaste indietro: run66 (swipe nuovo), run67
  (le foto di piloti/scuderie/loghi sono tolte dal 3/11: ora controlla che non tornino e che l'admin non abbia FOTO),
  run69 (Premium con 3 icone), run70 (fra i giochi in arrivo la telecronaca AI, ora col suo disegno in GARAGE_GLYPHS),
  run76 (usa l'ultimo weekend con prove libere nel file che si aggiorna da solo). Verdi: run60, 66, 67, 69, 70, 76,
  run10, 14, 17, 20, 33, 34, 55, 56, 57, 58, 88.

## 8/11 (dal 7/11 sera): correzioni dopo la prova di Edoardo sull'APK
- Swipe: la scheda accanto si vede già dal punto dove l'avevi lasciata (useLayoutEffect su nb + scrollMem e scrollSig,
  ora a livello di file), così arrivandoci non salta; niente suono passando da una scheda all'altra (resta la vibrazione).
- Home: niente JavaScript a ogni movimento (via paintFocus, via l'entrata delle schede). Fuoco sulla notizia al centro
  fatto dal browser (CSS animation-timeline: view(), .news-focus e [data-news-row] dentro [data-home]; dove non c'è,
  niente effetto): al centro misura piena, sopra e sotto 0,88 e spente. Scatto "proximity" (aiuta, non frena chi scorre
  veloce) e overflowX hidden (l'ingrandimento faceva scorrere la Home di lato e bloccava lo swipe). Luce del colore con
  IntersectionObserver sulla riga a metà schermo.
- Profilo: via "Livello del tifoso" dal mio profilo; il livello (nome e punti) va nel profilo pubblico (profiles.js lv,
  xp) e si vede nel profilo veloce della chat (data-chat-profile-level). Via "Funzioni Pro coi trofei".
- Premium coi trofei, regola nuova di Edoardo: solo chi vince tutti i trofei ha il Premium (trophypro.js allDone; senza
  Pit Swipe acceso i suoi due trofei non contano). È in isPaid, come il Premium pagato. Il lucchetto dice quanti mancano.
- Profilo: Colori dell'app, Suoni, Vibrazioni, Temi delle feste, Pit Board e Promemoria dentro una sola voce che si apre,
  "Personalizza l'app" (data-settings-group). helpers.js la apre da solo se una prova cerca una di quelle voci.
- Registrazione: via la casella "Ho almeno 14 anni": serve la data di nascita e l'età si calcola da lì (account.js
  need-birth; adult true resta valido per le app vecchie senza data).
- Prove: unit account, profiles, trophypro; run10, 16, 31, 32, 33, 50, 51, 60, 66, 71, 77, 79, 81, 85, 86, 88 verdi.
- 8/11 pomeriggio (screenshot di Edoardo: Home tutta spenta; "se vado al fondo di una pagina porta al fondo anche le altre"):
  - Scroll delle schede: la memoria dello scroll prendeva la prima pagina non in uscita, che durante lo swipe poteva
    essere la scheda accanto, e subito dopo il cambio la nuova scheda con la chiave della vecchia (la portava in fondo).
    Ora scope() prende solo [data-tab-page="<scheda>"] senza data-tab-leave e data-tab-neighbor. Prova in run88.
  - Fuoco della Home: sul telefono animation-timeline: view() lasciava tutte le notizie spente. Ora è una classe:
    l'IntersectionObserver mette news-center alla notizia che passa per il centro e focus-on su [data-home]; CSS con
    transizione (scale .93 / opacity .5 le altre). Mai tutto spento: senza focus-on niente effetto.
  - Verificato: screenshot della Home (in cima e con una notizia al centro), run88, run77, run71, run66 verdi.

## 8/11 sera: nuovo accesso (design "Accesso e Registrazione") e orbita per la rete lenta
- Disegni di Claude Design mandati da Edoardo: tools/disegni2jsx.py li converte in src/benvenuto/disegni.jsx e
  disegni.css (generati: per cambiarli si rigenera, non si toccano a mano). Componenti in src/benvenuto/Benvenuto.jsx.
- Prima dell'accesso (App, entryView): "slides" = 6 schede (barre come le storie, Salta, Avanti, swipe) e poi
  l'Entrata ("Il paddock è aperto": Entra come ospite, Crea il tuo account, Ho già un account); "door" = l'Entrata;
  "form" = LoginScreen. local bt-entry lo ricorda: "door" dopo le schede, "form" dopo un accesso (anche con la sessione
  salvata). LoginScreen rifatta col design (Manrope, fondo #0B0B0C, tasto bianco), stessi campi e stesse funzioni;
  initialMode "register", onDoor = freccia e tasto indietro verso l'Entrata. "ENTRA SENZA ACCOUNT" ora "ENTRA COME OSPITE".
- Ospite dall'Entrata: GuestTour, 5 passi sulle parti vere (notizie, RACE, FANTA, GARAGE, Profilo) misurate con
  getBoundingClientRect; una volta per telefono (local bt-guest-tour). Il testo del design parlava di tab Live e Chat che
  l'app non ha: adattato alle schede vere (la chat dei tifosi è in RACE).
- Rete lenta: OrbitLoader (icone F1 in orbita) con SlowSwap dopo SLOW_LOAD_MS (2,5 s) al posto dei LED nel
  caricamento d'avvio e nell'attesa di Authentication, dello scheletro nella scheda della sessione (RACE) e nella
  telemetria. Le feste restano col loro caricamento.
- Font: src/fonts/Manrope-var-latin.woff2 (OFL, src/fonts/OFL-Manrope.txt), citato nelle info dell'app.
- Prove: helpers.open di serie mette bt-entry "form" (chi non è entrato vede Accedi come prima); opzione welcome:true
  per il telefono nuovo. Le prove vecchie con il loro newContext hanno la stessa riga. run89-accesso nuova (8 prove).

## 7/11 sera: bandiera rossa in qualifica e post ufficiali di Instagram e X
- Bug (Edoardo, qualifiche di Interlagos in diretta: "con la bandiera rossa si ferma come fossero finite"). Causa nei
  dati veri (test/fixtures/openf1-interlagos-q1-redflag.json): RED FLAG al minuto 2, poi TRACK CLEAR. TRACK CLEAR
  toglieva la rossa; poi i dati fermi davano finished (at >= duration) e lo sfondo a scacchi, e closeSession poteva dare
  i punti FantaF1 delle qualifiche a metà. Ora (src/services/openf1.js): la rossa la tolgono solo il verde, le scacchi o
  SESSION RESUMED/STARTED (SESSION ABORTED = rossa); in qualifica e Sprint Qualifying conta solo la bandiera a scacchi
  di Q3 (qualifying_phase); in diretta senza scacchi finali non è finita; sim.ended dice se ci sono. In App la diretta
  resta "ongoing" fino a OF1_OVERTIME_MS (3 ore) oltre la fine prevista finché non c'è sim.ended. Prove: 3 in
  test/unit/openf1.test.js.
- Post ufficiali (Edoardo ha scelto B: link a mano + Instagram automatico; X automatico no, è a pagamento):
  src/logic/social.js (parseSocial, cleanPosts, mergePosts), src/services/social.js (scarica
  bt-app-2.vercel.app/data/social.json ogni 15 minuti al massimo), SocialEmbed/SocialStrip/SocialSheet in App.jsx.
  Admin NEWS: campo "POST UFFICIALE" (#adSocial), si salva social: link pulito. Il post si carica solo dopo il tocco
  (privacy, sentenza Fashion ID); "Mostra sempre i post dei social" lo ricorda (local bt-social-auto). Instagram:
  iframe /p/CODICE/embed/; X: widgets.js e twttr.widgets.createTweet.
- Automatico: .github/workflows/social.yml (ogni 2 ore, anche su main) lancia tools/social_sync.js, che con i segreti
  IG_USER_ID e IG_TOKEN (Business Discovery della Graph API di Meta) scrive public/data/social.json; X solo con
  X_BEARER e profili in tools/social-accounts.json (oggi vuoto). Senza segreti non fa niente. Il token di Instagram
  scade (circa 60 giorni): il lavoro fallisce e GitHub manda un'email.
- Privacy aggiornata nel sito (bt-app-flutter/docs/privacy.html, 7 novembre 2026). Prove: test/unit/social.test.js
  (10), test/e2e/run90-social.js (5).

## 7/11 notte: Home pulita, anteprime, contagiri, team radio automatiche, pioggia a vetro liquido
- Home: tolte la Pit Lane e le gomme (filtri G09/G10: componenti e filterNews restano, di serie non filtrano). run55
  aggiornata (le due prove ora controllano che non ci siano). Prima scheda di benvenuto e giro guidato non parlano più
  del filtro a gomma (testo cambiato in Benvenuto.jsx, non nel file generato).
- Fuoco delle notizie: in cima la prima e in fondo l'ultima prendono il fuoco (prima, tornando su, restava spenta).
- Anteprime: src/logic/words.js (cutWords, fixCut) e WordClamp in App.jsx: tre puntini dopo l'ultima parola intera.
  L'admin salva il riassunto con cutWords (prima slice(0, 140) a metà parola); quelli vecchi si sistemano con fixCut.
- Tira per aggiornare: durante l'aggiornamento niente scatto della pagina (scrollSnapType none: prima la pagina
  saltava giù e il contagiri spariva), le notizie scendono di PULL_BUSY (78 px) e il contagiri si vede intero; in RACE
  sta sopra a tutto (overlay). Il clic col mouse dopo una tirata non apre la notizia.
- Team radio automatiche: lettore unico RadioBus e useRadioAuto nell'App: partono anche con l'elenco chiuso e da altre
  schede; tornando indietro nella sessione rivista ripartono; il tocco sull'interruttore sblocca l'audio.
- Pioggia: src/pioggia/ (RainGlass, lente con backdrop-filter e filtro SVG feDisplacementMap) e src/logic/rain.js
  (al massimo 15, da zero, punto a caso, vicine solo nell'8% dei casi, ferme 1,8-6 s, poi giù a ~1100 px/s).
  Piove se: in diretta il meteo di OpenF1 (rainfall); se no, nel weekend del GP, MET Norway adesso (rainingNow).
  Con "Rimuovi animazioni" niente gocce. Prove: test/unit/rain.test.js, words.test.js, run91-pioggia (6), run40 (radio).

## 7/11 sera: classifica completa della lega FantaF1
- Pagina a parte (src/fanta/ClassificaLega.jsx e .css), dal design "BT_FantaF1_nuovo_design.html" → "4 Lega" (solo
  quella pagina: Edoardo ha detto di usare quel file al posto del .txt tagliato). Si apre solo toccando "Vedi la
  classifica completa" in fondo alla tabella o il titolo CLASSIFICA LEGA; Indietro (anche quello del telefono) torna.
- Questo GP / Stagione: FantaL.standings ora dà anche gp (punti dell'ultimo GP con i risultati, null se per quella
  squadra non ha contato) e gpRound. Si parte da Questo GP se c'è un GP contato. Freccia su/giù = posizione in
  stagione prima e dopo l'ultimo GP (punti meno gp contro punti). Zone Q1/Q2 con la barretta colorata a sinistra.
  Sigle di due lettere tutte diverse (Marco MA, Matteo MT). Podio: i gradini salgono (transform), frecce che oscillano.
- Prove: test/unit/fantaleague.test.js (+1), test/e2e/run92-classifica.js (1).

## 7/11 sera: pagina "I miei trofei" (Profilo)
- Dal design "BT_Profilo_nuovo_design.html" solo "3 Trofei": src/profilo/TrofeiPage.jsx e .css. Si apre solo dal
  bottone "Apri la bacheca" della scheda dei trofei nel Profilo (prima la bacheca si apriva sotto). trophyItems() in
  App.jsx prepara nome, come si vince, data, quanto manca e barra. Vinti / Da vincere; tra i vinti, larga in fondo,
  quella da vincere più vicina. Data senza anno se è quest'anno (come nel design). Segreti nascosti finché non vinti.
- Prove: test/e2e/run93-trofei-pagina.js (1); run68 e run72 aggiornate (leggono le righe in tutte e due le viste).

## 7/11 sera: Garage a piastrelle (video)
- GarageScreen: piastrelle quadrate a mattoncino (4 colonne, righe dispari spostate di mezza piastrella), colori per
  sezione (GARAGE_SECTIONS: giochi arancio, weekend rosso, tracciati verde, analisi viola, in arrivo scure tratteggiate),
  da trascinare nei due versi (scroll vero del telefono, data-garage-canvas). Bottoni in alto per sezione (con quante
  piastrelle) che portano lì; la sezione accesa segue quello che si vede. Dentro il Garage lo swipe di lato tra le
  schede non c'è più (ownGesture: la griglia scorre di lato); si cambia scheda dalla barra in basso.
- La memoria dello scroll (scrollMem in App) ora ricorda anche scrollLeft.
- Prove: test/e2e/run94-garage-griglia.js (1); run77 aggiornata (giù e di lato).

## 8/11 notte: barra in basso "Floating Notch" (video di Edoardo)
- BottomNav: barra sospesa con angoli tondi; palla col colore dei tasti (C.accent) con l'icona della scheda attiva,
  dentro un incavo del bordo (cerchio nero che scivola, [data-nav-notch]). Toccando: la palla scivola e fa un balzo
  (.nav-hop), icona spenta in volo, onda sull'icona toccata (.nav-ripple), nome che compare sotto (.nav-label).
  Nomi delle schede ora "Home", "Garage", "Fanta", "Race" (nel cartello dello swipe in maiuscolo).
- pillRef (--nav-drag e classe "dragging" dello swipe) ora è sul <nav>: palla e incavo leggono --nav-drag.
- Prove: tapText (helpers e le copie vecchie in run8-run23) trova la scheda anche scritta in maiuscolo ('FANTA');
  run50 e run71 guardano [data-nav-ball]. run50 "riavvio" a volte fallisce sotto carico (splash), da sola passa.

## 8/11 notte: logica dei B&T Trophies del GP
- src/logic/gp-trophies.js: computeGpTrophies(raw, { type }) → { headline, list, all }. Gara: Maestro della difesa,
  Re del bagnato, La Fenice, Partenza razzo, Ripartenza fulminea, Il Mastino, Metronomo, Gomma eterna, Pit crew d'oro,
  Missile, Re dei minisettori, Pittore di cordoli, L'Eremita; qualifica: Giro della vita + Missile, minisettori,
  cordoli. Senza il dato vero il trofeo non c'è (griglia solo da posizioni prima del via, pit crew solo con
  stop_duration). t = secondi dalla partenza della sessione (come sim.jumpTo).
- UI (src/gara/Trophies.jsx e .css, dal design "B&T Trophies e pause di gara"): in RACE a sessione finita la scheda
  [data-tr-card] col trofeo della sessione → pagina [data-tr-screen] (trofeo grande + "Gli altri trofei") →
  dettaglio [data-tr-detail] con numeri, grafico, "Come si vince". "Rivedi sulla mappa" = replayAt(t) in App (salta
  in quel punto e fa partire la sessione rivista); "Manda in chat" = link "race" del circuito col nome del trofeo.
  gpTrophies (useMemo in App) sta PRIMA delle pagine di accesso (che fanno return prima): non spostarlo sotto.
- Prove: test/unit/gp-trophies.test.js (12), test/e2e/run95-trophies.js (1).

## 8/11 notte: notifiche e schermata del campione
- Permesso delle notifiche (promemoria) solo dopo un gesto in questo avvio: finire un giro di Pit Swipe adesso o
  accendere "Promemoria sul telefono" (remAskRef). Prima, reinstallando con giri vecchi nell'account, si chiedeva
  subito all'accesso. Prova nuova in run85 ("dopo una reinstallazione").
- ChampionTakeover solo quando si apre il profilo del campione (selectedDriver = campione), sempre una volta sola.
  run87 aggiornata (apre il profilo dal podio del Mondiale).
- Da sapere [Guessing]: se Android chiedesse le notifiche all'installazione per un altro motivo (non dal codice dei
  promemoria) va visto sul telefono: nel codice non c'è altra richiesta.

## 8/11 notte: griglia di partenza dopo la qualifica
- StartGrid in RACE (qualifica o Sprint Qualifying finita): auto due a due sfalsate come la griglia della rossa.
  Prima l'ordine della qualifica (+ etichette delle penalità scritte dalla direzione gara: posti, in fondo, pit lane);
  quando OpenF1 ha starting_grid la griglia ufficiale con ▲▼ e il tasto per tornare all'ordine della qualifica.
- OF1.startingGrid(meeting, qualiKey, { sprint }): chiave della gara (o Sprint) del weekend, poi quella della
  qualifica; sito pubblico e, se "bloccato", api/live (che già permette starting_grid). Riletta ogni 10 minuti.
- Logica: src/logic/start-grid.js. Prove: test/unit/start-grid.test.js (5), test/e2e/run96-griglia-qualifica.js (2).
- [Guessing] Non so con quale session_key OpenF1 pubblica starting_grid (gara o qualifica): si provano tutte e due.

## 8/11 notte: calcolatrice del Mondiale
- Race → Mondiale: tasto "Calcolatrice" (data-calc-open) accanto a Piloti/Costruttori, solo se restano GP o Sprint
  (calcEvents in App.jsx: gare non finite dal calendario; la Sprint conta solo se la sessione SPRINT non è passata).
- Pagina src/mondiale/Calcolatrice.jsx: punti in palio (25 a GP e 8 a Sprint; squadre 43 e 15), chi può ancora vincere
  (In corsa / Fuori), scenario fra due piloti con gli arrivi per ogni evento (il posto preso dall'altro è disattivato).
  Deciso = chi insegue non recupera nemmeno con il massimo che gli resta; se restano in corsa solo quei due, "campione".
- Conti: src/logic/champ-calc.js. Prove: test/unit/champ-calc.test.js (7), test/e2e/run97-calcolatrice.js (2).
- A pari punti decidono le vittorie: la calcolatrice non le conosce e lo scrive sotto la lista.
- .gitignore ha righe di Skipper (un plugin), non mie: lasciate fuori dal commit.

## 8/11 notte: Muretto dei tifosi (Safety Car e bandiera rossa)
- Design "B&T Trophies e pause di gara" (SafetyCar, Rossa, Esito), solo sessioni OpenF1, scheda Tempi della pagina Race.
- Safety Car / VSC in gara: "Box o fuori?" per i primi 8 quando entra (gomma ed età dagli stint), "Ha fermato" per chi
  è già ai box, "Pit stop regalato" con la gomma nuova; Fatto salva. A pausa finita (+20 s) la scheda "com'è andata"
  apre la pagina con Tu / Squadra / Esito: box = ha fermato fra l'ingresso della Safety Car e 20 s dopo la fine.
- Bandiera rossa (anche in qualifica): cosa è successo (messaggi della direzione gara poco prima, in italiano se noti),
  "Rivedi gli ultimi 60 s" (replayAt), "Quanto dura la rossa?" (5-90 min), gomma della ripartenza del pilota preferito
  (o di chi è primo), chat, Gioca. Risultato: minuti veri e gomma al primo giro dopo la ripresa.
- Finestre con le stesse regole della bandiera dell'app (openf1.js). Giocate in localStorage "bt-pitwall" (ultime 12).
- Logica: src/logic/pit-wall.js; aspetto: src/gara/PitWall.jsx. Prove: test/unit/pit-wall.test.js (6, Safety Car vere
  di Baku e rossa vera di Interlagos), test/e2e/run98-muretto.js (2).
- Prove sistemate dopo la serie completa dell'8/11 (nessuna cancellata): run8 e run64 cercavano "HOME" maiuscolo (la
  barra Floating Notch scrive "Home"); run88 voleva 300 px di scorrimento nel Garage (ora a piastrelle ne ha circa 140);
  run70 Ghost Lap era fissa su Austin, che il sito non ha più (TracingInsights tiene gli ultimi due): ora legge l'ultimo
  Ghost dall'indice vero. Instabili sotto carico (passano da sole, 2 volte su 2): run70 "Premium ... riaperto l'app".
- 8/11 mattina: gocce della pioggia solo con qualifica o gara in corso (anche Sprint e qualifica Sprint): in diretta
  OpenF1 conta live.type, se no gli orari del calendario (src/logic/rain.js rainSessionNow: Q 90 min, SQ 75, Sprint 90,
  gara 180); mai nelle prove libere. Prove: test/unit/rain.test.js (+2), run91 (orario spostato in qualifica, +1).
- 8/11 mattina: calcolatrice, riquadro "Per vincere il Mondiale" in cima (colori della squadra del primo, parole che
  entrano una alla volta, riflesso che passa): quando il primo può chiudere il titolo e, per ogni rivale in corsa, i punti
  di vantaggio che servono e gli arrivi minimi (titleWatch in champ-calc.js). Prove: champ-calc (+4), run97 (+controlli).
- Non fatto (di proposito): XP da tifoso del design (l'app non ha un contatore XP per questi giochi: niente numeri
  inventati), mappa col punto dell'incidente (OpenF1 non dice dove; c'è il testo della direzione gara).

## 8/11 mattina: controllo degli automatismi e i quattro che mancavano
- Già da soli: stato delle gare (orari del calendario), classifiche (Jolpica), punti FantaF1 e leghe (Jolpica), Ghost
  Lap e dati del weekend (workflow dati-f1, TracingInsights), trofei, griglia di partenza, sondaggi tolti dopo la gara.
- Non attivo: post di Instagram (workflow social): mancano i segreti IG_USER_ID e IG_TOKEN su GitHub (li mette Edoardo).
  Non controllabile da qui: le variabili di Vercel (accesso al team negato all'MCP).
- Previsioni automatiche (src/logic/auto-predictions.js): per la gara del weekend pole, Sprint (se c'è), vincitore,
  scuderia, giro veloce, quanti non arrivano; id fissi "auto:<gara>:<chiave>", si chiudono all'inizio della sessione,
  risposte dai risultati di Jolpica (FantaL.results ora si legge anche all'avvio). Risposte trovate salvate in
  bt_bt-auto-answers; il bonus va nelle leghe solo dopo il primo tentativo di lettura dei risultati (roundsTried).
- Notizie automatiche (src/logic/auto-news.js): qualifica, Sprint e gara dell'ultimo weekend + gara di quello prima,
  scritte dall'app (categoria GARA, gratis), accanto a quelle dell'admin (newsAll); paragrafi con a capo (pre-line).
- Prezzi FantaF1 automatici (src/logic/fanta-prices.js): dal listino con asOf (di serie F1 Fantasy dopo il round 15),
  ogni GP coi risultati sposta i prezzi per quarti dei punti del weekend (±0,3/±0,1; scuderie ±0,6/±0,2; minimo 3,0).
  Un listino salvato dall'admin senza asOf resta a mano finché l'admin non lo risalva (ora si salva asOf).
  [Guessing] I punti della stagione sono quelli di F1 Fantasy fino al round 15 più i nostri dopo: regole simili, non
  identiche.
- Highlights ufficiali F1 (api/highlights.js + src/services/highlights.js): feed YouTube del canale FORMULA 1, solo i
  video "Highlights", titoli in italiano, card gratis in Home fuori dai contenuti Premium; si aprono su YouTube.
  [Guessing] id del canale UCB_qr75-ydFVKSF9Dmo6izg: se il feed non risponde la funzione lo ricava da youtube.com/@formula1
  (variabile F1_YT_CHANNEL per cambiarlo). Non provata sul feed vero (la rete di qui non arriva a YouTube).
  I "Video highlights esclusivi" del Premium restano di B&T (dall'admin): sono contenuti propri, non si automatizzano.
- Prove: test/unit/{auto-predictions,auto-news,fanta-prices,highlights}.test.js, test/e2e/run99-automatici.js (4).

## 8/11 giorno: metà gara, schermo acceso nel Second Screen, Premium nuovo (design "B&T Premium, nuovo design 2")
- Metà gara (src/logic/halfway.js, src/services/reminders.js): partenza vista = app aperta sulla gara nei primi 15 minuti
  (bt-start-seen). Se non l'hai vista: notifica del telefono programmata a +50' dal via (id 120, testo generico: ad app
  chiusa il telefono non sa chi è in testa) e, se a metà gara l'app è aperta o in sottofondo, notifica vera subito coi
  dati veri (id 121: "Metà gara · Giro 26/51", "GP …: ANT davanti a RUS (+2,3 s) e LEC (+5,1 s)") più l'avviso in app;
  la generica si toglie e non si riprogramma (bt-half-done). Interruttore "Avviso a metà gara" nel Profilo.
  Dati veri anche ad app chiusa = notifiche dal server (Firebase Cloud Messaging): NON fatto, serve il sì di Edoardo.
- Second Screen (Edoardo 11:36: "modalità TV = solo che non si spegne mai lo schermo"): finché è aperto lo schermo
  resta acceso (useKeepAwake: plugin @capacitor-community/keep-awake nell'APK, aggiunto a package.json; Wake Lock nel
  browser, ripreso al ritorno). Tolti i due pannelli della prima versione. Unica cosa in più: spostamento di 1-3 px al
  minuto contro il burn-in OLED (src/logic/oled.js, proprietà CSS translate sullo stage). dimFor/wakes restano in
  oled.js con le loro prove ma l'app non li usa più.
- Premium (src/premium/Premium.jsx + .css): pagina a schermo intero, schermate Premium, Gratis o Premium, Sblocca senza
  pagare (video + tutti i trofei), Prova attiva (giorni rimasti), Sei Premium (numeri veri), Conferma, Attivazione,
  Premium attivo, Ricevuta. Tolte le schermate della carta (6b, 6c): nell'APK paga Google Play con la sua finestra.
  Prova: 14 giorni, una volta per account, FINISCE DA SOLA (scelta di Edoardo; prima durava un GP). Avviso 2 giorni
  prima alle 18 (id 130, anche coi promemoria spenti: è la promessa della Conferma). "Oppure abbonati subito" per chi
  non vuole la prova. Il chip PREMIUM in alto ora apre la pagina anche da Premium.
- Ricevuta (src/premium/receipt-pdf.js): con Google Play si salva nell'account premium.receipt {orderId, at, plan,
  price} (cleanReceipt) e premium.plan. PDF fatto a mano (Helvetica, euro), codice a barre Code 128 vero del numero
  d'ordine (letto davvero: tools/scan-receipt.py con zxing-cpp; a schermo si legge da densità 2x in su, cioè ogni
  telefono di oggi). "Problemi col Premium?" apre Condividi col PDF allegato e il testo con numero d'ordine e account
  (Per: bt.formula1@gmail.com); sul sito scarica il PDF e apre la mail.
  La prova vera è il numero d'ordine: Edoardo lo cerca nella Play Console → Gestione ordini. Il PDF da solo si può
  falsificare, il numero d'ordine no.
  [Likely] orderId arriva da @capgo/native-purchases su Android (tx.orderId); se mancasse, niente ricevuta (mai finta).
- Prove: test/unit/{halfway,half-notify,oled,trial-reminder,receipt-pdf}.test.js, test/e2e/run100-meta-gara.js,
  run101-tv.js (ora: schermo acceso), run102-premium.js (3). Aggiornate al nuovo Premium: run8, run13, run14, run16-22,
  run69, run70, run76, run86, run88.
- Verificato 8/11 15:52: `JOBS=2 bash test/all.sh` → 129 file verdi su 134; i 5 rossi (revisione-b C2, run31 riaperta
  senza rete, run32 messaggio dopo ricarica, run34 foto dopo ricarica, run56 nascoste dopo riavvio) sono prove con
  ricarica della pagina sotto carico: rifatte da sole sono verdi. Codice a barre letto davvero dal PDF (zxing-cpp).

## 8/11 pomeriggio: ultime sistemazioni (uso di Edoardo al 96%: prove da aggiornare NON fatte)
- RACE: senza sessione in corso solo le schede Mondiale e Meteo (pronostico meteo), scelta di Edoardo; con la sessione
  tutte come prima. Via "Ultima gara" (podio, classifica, pagelle) senza sessione. Podio di fine gara, B&T Trophies e
  griglia di partenza ora subito prima della riga delle schede (non più in cima).
- B&T Trophies nascondibili: X sulla scheda (data-tr-hide) + interruttore in Profilo → Personalizza l'app (bt-trophies-off,
  solo su questo telefono).
- Garage: interruttore piastrelle/lista (data-garage-view, bt-garage-view); piastrelle solo icone (nome in aria-label);
  tolti i bottoni delle sezioni (data-garage-sec); la lista è quella di prima (data-garage-row).
- Feedback: faccina animata (src/feedback/FaceRating.jsx + .css) al posto delle stelline; data-feedback-star resta.
- Profilo: "Su di te" e "I miei preferiti" non più nel proprio profilo; voce "Profilo pubblico" (data-profile-public) che
  apre la pagina per cambiarli. Gli altri li vedono come prima.
- DA FARE (prove rotte dai cambi voluti, da aggiornare, non cancellare): revisione-b (Su di te: entrare da Profilo
  pubblico), run15 (ultima gara x2 → niente scheda; mondiale/meteo ok col tab Meteo rimesso, rifare), run16 (ultima gara,
  Su di te), run17 ritiri ultima gara, run19 pagelle ultima gara, run20 garage sezioni, run31 Su di te, run34 ultima gara,
  run40 (gomme/classifica senza sessione, ultima gara, Degrado gomme), run60 Su di te; poi run62, run66, run67, run69-71,
  run81, run84, run87, run94, run95 da far girare. run33 rosse = ricarica sotto carico (verificare da sole).
- Verificato: check.js SYNTAX OK, sem.js total unique 0, schermate guardate (Garage griglia/lista, feedback, Profilo,
  RACE senza sessione). Suite NON rifatta.
- 8/11 sera: prove aggiornate. Verdi da sole: run15, run16, run17, run19, run20, run31, run34, run40, run52, run60, run62,
  run66, run67, run69, run71, run81, run84, run87, run94 (prova nuova: piastrelle solo icone + lista che resta), run95.
  Saltate col prefisso SKIP (cose tolte da Edoardo, non cancellate): ultima gara (run15 x2, run16, run17, run19, run34,
  run40 x3, run69), sottoschede RACE (run71), bottoni delle sezioni del Garage (run94).
  Ancora ballerine: revisione-b (C1/C2/I1/I3 a giro, "Profilo" non trovato dopo la riapertura) e run33 (campanella dopo
  la ricarica): a volte verdi, a volte no, anche prima di oggi sotto carico. Da indagare: cosa copre l'intestazione
  dopo la ricarica.

## 8/11 18:54: richieste di Edoardo NON iniziate (uso al 97%)
1. Fanta: "tutte le cose di storia si tolgono dopo ogni GP e si mettono in automatico (magari un po' meno)". Da capire
   cosa intende con "cose di storia": nel codice del Fanta non c'è niente che si chiami "storie" (forse sondaggi o
   previsioni del Fanta?). Chiedere prima di fare.
2. Mappa coi puntini (LiveMap): i primi passando dal via si fermano ad aspettare gli altri; gruppi di 4-7 puntini si
   teletrasportano. Probabile causa da verificare: interpolazione della posizione fatta per giro/distanza invece che col
   tempo vero (location di OpenF1), o puntini agganciati al leader al cambio giro.
3. Radar meteo sulla mappa vera come nelle grafiche F1 (oggi c'è un radar DEMO solo nel Second Screen: RadarOverlay).
   Solo dati veri: serve una fonte di pioggia vera (es. RainViewer o Open-Meteo); niente radar finto in diretta.
4. (18:56) Fanta = domande di STORIA delle previsioni (kind "history"): togliere dopo ogni GP e crearne in automatico
   prima di ogni GP, un po' meno di oggi. Solo dati veri: domande fatte da Jolpica (vincitore qui l'anno scorso, pole
   dell'anno scorso, chi ha vinto più volte su questa pista), risposte corrette in automatico, in
   src/logic/auto-predictions.js accanto alle previsioni del weekend. Non iniziato (uso al 98%).
5. (19:02) Penalità dei piloti: non solo notifica ma segno nella tabella dei tempi (es. "+5 s" accanto al pilota) che
   resta finché quel pilota non fa il pit stop (penalità scontata). Dati veri: messaggi race_control di OpenF1
   ("5 SECOND TIME PENALTY FOR CAR 44") + pit di OpenF1 dopo l'ora del messaggio. Non iniziato (uso al 98%).
6. (19:14) Altre richieste per la prossima volta:
   - prima della gara, al posto dei B&T Highlights, collegamento al Tire Strategy Predictor;
   - app tradotta in tutte le lingue (prima le principali, testi in un file per lingua);
   - icona dell'app modificabile (icone alternative di Android, scelte nel Profilo);
   - animazione della classifica (posizioni che scorrono) e animazione del pit quando il pilota passa dai box;
   - B&T Highlights: miglior pit stop della gara; rendere funzionanti le altre grafiche;
   - Fanta: scelta dei piloti come su Chess.com (presentazione del pilota, carta, ecc.);
   - codice admin: schermata in stile "hacker" (terminale verde, righe che scorrono) invece di quella bella;
   - BUG: nel Fanta l'admin vede ancora le previsioni dei vecchi GP (agli altri non si vedono più): pulirle anche per
     l'admin (o mostrarle solo in un archivio).
   - Idee già mandate da Edoardo sul Fanta e sulle funzioni nuove: nei documenti del progetto claude/idee-nuove.md,
     claude/piano-generale.md, claude/piano-gara-live.md, claude/piano-play-store-e-utenti-attivi.md e nella memoria
     (areas/idee-future.md). Rileggerli all'inizio della prossima sessione.

## 13/11: notifiche del team vere (push) e aspetto delle notifiche
- Causa (Edoardo: "le notifiche che scrivo nell'app non appaiono nella schermata di blocco"): le notifiche dell'admin
  stavano solo in shared/bt-notifs (campanella dentro l'app); nessun canale push. I promemoria (Pit Swipe) funzionano
  perché li programma il telefono (LocalNotifications).
- Fatto: plugin @capacitor-firebase/messaging ^8.6.0 (package.json); src/services/push.js (sync: canale "bt-novita" +
  tema "novita"; announce: POST api/push); api/push.js (legge shared/bt-notifs col FIREBASE_SERVICE_ACCOUNT, manda solo
  le notifiche degli ultimi 15 minuti, una volta sola con pushlog/<id>; non accetta testi da chi chiama);
  api/_lib/pay.js (getShared, claim, release, fcm; scope anche firebase.messaging); App.jsx (sendNotif chiama announce
  e l'admin vede l'esito; iscrizione all'avvio; interruttore "Novità da B&T sul telefono" in Personalizza l'app;
  riga nell'informativa). scripts/prepare_android.py: icona bianca ic_stat_bt, colore #FF1801, logo grande bt_logo,
  valori di serie di FCM nel manifest, copia resources/google-services.json solo se è di com.bt.formula1.
  capacitor.config.json: LocalNotifications smallIcon/iconColor. reminders.js: look() su tutte le notifiche locali.
- PASSI DI EDOARDO (senza, le push NON partono; l'app funziona lo stesso):
  1. Firebase → Impostazioni progetto → Le tue app → Aggiungi app Android, pacchetto com.bt.formula1 → scarica
     google-services.json → caricarlo nel repo in resources/google-services.json.
  2. Vercel → progetto bt-app-2 → Settings → Environment Variables → FIREBASE_SERVICE_ACCOUNT (JSON dell'account di
     servizio: Firebase → Impostazioni progetto → Account di servizio → Genera nuova chiave privata) → Redeploy.
  3. Aggiornare la Privacy Policy sul sito (PRIVACY_URL) con Firebase Cloud Messaging.
  4. Nuovo APK/AAB (il plugin è codice nativo: serve una build nuova).
- [Likely] non verificato su un telefono vero: la build Android col plugin, l'arrivo della push, l'icona.
- Prove: test/unit/push-api.test.js (6), push-client.test.js (3), test/e2e/run103-push.js (3); prova a secco di
  prepare_android.py su un progetto finto (senza file, file giusto, file di un'altra app).


## 13/11: Fanta, budget sul prezzo pagato (bug del tester: "non riesco più a scegliere la scuderia")

- Causa: il budget libero era `FANTA_BUDGET − valore di oggi della squadra`. Quando i prezzi salgono (in automatico dopo un GP o a mano dall'admin) chi aveva i più forti andava sotto zero e una scuderia tolta, anche la stessa, non si poteva più rimettere ("Budget insufficiente"). Non era un legame piloti → scuderia.
- Ora come F1 Fantasy: conta il prezzo pagato. `squad.paid[kind][id]` + `squad.gain` (guadagni delle vendite). Funzioni in `src/logic/bt-logic.js`: `bank`, `place`, `withPaid`, `clearSquad`; `canAfford` e `autoFill` prendono anche `listing`.
- `src/App.jsx`: `FantaPicker` e `FantaSquadCard` usano `bank`/`place`; chi non entra nel budget dice quanto manca ("ti mancano $X") e sopra la lista c'è una riga che spiega come liberare soldi. Le squadre già salvate prendono `paid` dal listino alla prima apertura (`withPaid`).
- `src/services/appdata.js`: il listino di serie ha `asOf: 15` anche prima che arrivi Firestore (prima i prezzi automatici partivano solo dopo).
- Da sapere: un listino salvato dall'admin SENZA `asOf` resta a mano (prezzi automatici spenti). Basta un "Salva" nella scheda admin del Fanta per riaccenderli. Non verificato sul Firestore vero.
- Prove: `test/unit/fanta-budget.test.js` (6), `test/e2e/run104-fanta-budget.js` (1), più run14-18, run62, run78, run99 verdi.


## 14/11: accesso più svelto (tester: "accesso lento, a un certo punto si blocca")

- Causa (dal codice): dopo Authentication c'erano tre letture di Firestore una dopo l'altra (`users/<email>`, poi `admins/<email>`, poi di nuovo `users/<email>` per i dati personali); all'iscrizione cinque giri (controllo, scrittura, rilettura del profilo appena scritto, admin, dati personali). A ogni accesso si rileggeva anche tutta la chat Generale (`migrateLegacy`).
- `src/services/account.js`: `loadProfile` legge profilo e admin insieme; dopo l'iscrizione il profilo appena scritto non si rilegge (`loadProfile(em, uid, profile)`). Profilo perso: la scrittura si aspetta al massimo 4 s.
- `src/services/appdata.js`: `userDataOf(app2)`; `src/App.jsx`: `enterAccount(email, seed)` prende i dati personali dal profilo appena letto (`account.app2`), senza rileggere. Dopo: 2 letture in parallelo invece di 3 in fila.
- `src/services/chat.js`: `migrateLegacy` una volta per telefono (`bt_bt-chat-migrated`).
- `src/App.jsx`: la chat non si rilegge con l'app non in vista (`document.hidden`), tornando in vista si rilegge subito; due tocchi insieme su ACCEDI non fanno due accessi (`sending` ref).
- `public/index.html`: `preconnect` ai server di Firebase.
- Non fatto (da decidere con Edoardo): la chat rilegge tutta la stanza ogni 4 s per ogni telefono (lista chat: 5 stanze ogni 6 s). Col piano gratis di Firestore (50.000 letture al giorno) bastano poche decine di persone in chat durante una gara per finire le letture: dopo, accessi e dati falliscono per tutti fino al giorno dopo. Rimedio vero: ascolto in tempo reale (`onSnapshot`) o una lettura sola che dice "c'è del nuovo". Altro: l'SDK di Firebase si scarica da gstatic a ogni primo avvio (meglio dentro l'APK).
- Prove: `test/unit/account.test.js` (+3), `appdata.test.js` (+1), `chat.test.js` (+1), `test/e2e/run105-accesso-svelto.js` (3). Il finto Firestore segna le letture (`__fake.reads`).
- Prove vecchie aggiornate (fallivano già dall'8/11, non per questo lavoro): `run50-colori.js` e `run10.js` (i preferiti ora stanno in "Profilo pubblico"), `run88-nascita.js` (il Garage a icone scorre meno).
- Prove "ballerine" dopo un ricarico (run33, revisione-b, run53): trovata la causa. Nel browser delle prove (pagine `file://`) ricaricando la pagina il localStorage a volte torna vuoto senza che l'app cancelli niente (sessione persa → schermata di accesso). `test/e2e/helpers.js`: `p.reload()` mette da parte il localStorage in `window.name` e uno script lo rimette se la pagina nuova lo trova vuoto. Dopo: run53 6 su 6, run33 e revisione-b verdi. Da guardare sul telefono (non verificabile da qui): chiudere e riaprire l'app subito dopo i video del primo avvio non deve farli rivedere.


## 14/11: Fanta, domande di storia del weekend (automatiche) con animazione; admin

- `src/logic/history-quiz.js` (nuovo): tre domande per weekend dai dati veri di `src/data/circuit-info.json` (primo GP o anno di nascita; record sul giro: chi o che anno; curve o giri), una per gruppo, a rotazione col round. Id `auto:<gara>:h-<tipo>`: restano legate alla gara come le previsioni automatiche (i punti di chi ha risposto restano). Dato mancante → niente domanda.
- `src/App.jsx`: `histQs` dentro `allPredictions`; in lista nel Fanta solo quelle del GP non concluso, non tolte dall'admin (`flags.hiddenQs`) e non `off`. Anche le domande di storia scritte dall'admin ora hanno `raceId` e escono col loro GP.
- Animazione della risposta (`PredictionCard`, classi `.quiz-*` in `src/App.css`): giusta = cinque luci verdi in fila, bandiera a scacchi, coriandoli, "+1"; sbagliata = cinque luci rosse che lampeggiano, scossa, velo rosso, pulsa la giusta. Solo transform e opacità; con "Rimuovi animazioni" resta l'esito fermo. Parte solo se la risposta è stata appena toccata.
- Admin, scheda PREVISIONI: le previsioni dei GP conclusi non sono più in lista (riga "N di GP conclusi" + Mostra; restano salvate, valgono i punti); nuova parte "DOMANDE DI STORIA": le automatiche del weekend con TOGLI/RIMETTI (salvato in `shared/bt-flags.hiddenQs`, nessuna lettura in più), quelle scritte a mano con TOGLI (`off: true`, non si cancellano). Una previsione salvata senza `about` non rompe più la scheda.
- `src/services/appdata.js`: `cleanFlags` tiene `hiddenQs`.
- Prove: `test/unit/history-quiz.test.js` (6), `test/e2e/run106-storia-weekend.js` (5).
- Da sapere: i dati del circuito sono quelli già mostrati nell'app; se un record cambia va aggiornato `circuit-info.json`.


## 14/11 (pomeriggio): avvio senza aspettare Firebase, fluidità, bug del Fanta trovati con la scimmia

Misure prima del lavoro (pagina di prova, CPU rallentata 4x come un telefono medio): da fermi Home, Fanta e Race facevano circa 340 impaginazioni ogni 10 secondi (il riflesso dei tasti animava `left`); al secondo avvio lo splash aspettava Firebase (18 documenti + profilo) fino a 15 secondi con la rete lenta.

- Avvio: `src/services/appdata.js` mette da parte sul telefono i documenti condivisi letti (`bt_bt-sc:<doc>`, il documento com'è su Firebase; più di 200.000 caratteri no, in tutto al massimo 1,2 milioni) e `sharedCached()` li ridà all'avvio dopo, passando dagli stessi controlli di una lettura vera. `src/App.jsx`: lo stato parte da quelli, lo splash non aspetta Firebase se ci sono tutti (`bootCache.complete`), nello stato entrano solo i contenuti letti davvero (`r.fresh`), niente riga "Sei offline" mentre Firebase sta ancora rispondendo con la copia a schermo.
- Avvio, utente entrato: `src/services/account.js` tiene sul telefono l'ultimo profilo (`bt_bt-last-profile`: nome, nick, "su di te", Premium; mai i dati personali né la password). `start()` risponde subito con quello (`loaded: false, quick: true`, admin no) e il profilo vero arriva dopo con la stessa lettura (`retry()` la riusa). L'app (`enterAccount(..., wait)`) prende i dati personali dal profilo vero appena arriva: una lettura sola. Senza rete resta il nome dell'ultima volta (mai preso dall'email). "Esci" ed "Elimina account" lo dimenticano.
- Fluidità: `.cta-shine` si sposta con `transform` (stesso percorso) invece di `left`: da fermi niente impaginazioni. Formattatori delle date creati una volta (`memoFmt` in App.jsx, `romeParts` in `holidays.js` e `pitswipe.js`).
- Bug del Fanta trovati con `test/e2e/run108-fanta-scimmia.js` (50 mosse a caso, regole che devono valere sempre; prima 31 problemi su 70 mosse, ora 0 con due semi):
  1. Dopo "Svuota" il 2X restava spento anche coi piloti rimessi (`drivers.includes(boost)` è vero con un posto vuoto). Nuovo `BtLogic.fixBoost`, usato da cambio pilota e "Completa".
  2. I dati personali si salvavano con `set({app2}, {merge: true})`: Firestore fonde le mappe in profondità, quindi una chiave tolta (un pilota venduto in `squad.paid`) non spariva mai. Ora `dbSet(..., { fields: ["app2.<chiave>"] })` → `mergeFields`: ogni chiave salvata si scrive intera, le altre restano. Vale per tutti i dati personali (anche quelli che non sono del Fanta). I documenti già sporchi si puliscono al primo salvataggio.
- Prove: `test/e2e/run107-fluidita.js` (3), `run108-fanta-scimmia.js` (1), `test/unit/perf-intl.test.js` (2), `account.test.js` (+4, 2 aggiornate: start() ora risponde col profilo dell'ultima volta), `appdata.test.js` (+5), `fake-firebase.test.js` (+1, il finto Firestore ora conosce `mergeFields`), `fanta-budget.test.js` (+1). `revisione-b.js`: le due prove "rete lentissima al primo avvio" tolgono le copie dal telefono prima di riaprire.
- Da provare sul telefono: secondo avvio in aereo/rete lenta (deve aprirsi subito coi contenuti di ieri); primo avvio dopo l'aggiornamento è come prima (la copia non c'è ancora).
- Rischio da sapere [Likely]: se un admin cambia un contenuto, chi apre l'app vede per un attimo quello vecchio finché Firebase risponde (secondi). Il Premium mostrato all'avvio è quello dell'ultima volta finché arriva il profilo.
- Chat (14/11 sera): niente più giro fisso. `nextPollDelay` in `src/services/chat.js`: se una lettura non porta niente di nuovo, il giro dopo è una volta e mezza più lungo (stanza: 4 → 6 → 9 → 13,5 → 15 s; elenco: da 6 fino a 30 s); un messaggio nuovo, un invio (`setChatTick` in `postChat`) o il ritorno in vista riportano subito al giro di base. Una stanza viva resta a 4 s; una ferma costa circa un terzo delle letture. Un messaggio in una stanza ferma si vede al massimo dopo 15 s. Prove: `chat.test.js` (+1), `run107-fluidita.js` (stanza ferma 32 s → 3-5 letture invece di 8; messaggio nuovo visto entro 15 s e poi di nuovo ogni 4 s). `run105`: la prova "in vista si rilegge" ora chiede almeno una lettura in 9 s.
- Suite completa (14/11, prima del cambio della chat): 139 file ok, 6 con prove fallite. Tre erano vecchie (Garage a icone dell'8/11: `run22`, `run23` ora guardano i gruppi nella vista a lista; `run30-dati`: i preferiti in "Profilo pubblico"). Tre falliscono uguali anche sull'ultimo commit (b0fdc21), quindi non per questo lavoro, e restano DA FARE: `run66-schede` (da RACE uno swipe a destra non porta a FANTA), `run70-sistemazioni` (2: il Ghost Lap nel Garage non si trova più, probabilmente il Garage a icone), `run76-richieste-29-10` (degrado gomme: prove libere del weekend in corso).
- Misure dopo (CPU 4x): da fermi 10 s → Home 1 impaginazione, Fanta 0, Race 0, Garage 0 (prima circa 340). Due cambi di scheda costano ancora circa 600 ms di script a CPU 4x (circa 150 ms su un telefono veloce): prossimo punto da guardare.


## 14/11 (sera): terminale del box per l'admin, annunci ai minori, Prompt 1

- Richiesta di Edoardo: bottone ADMIN visibile a tutti in fondo al Profilo, prima di Esci ed Elimina account; aperto deve sembrare un terminale "da hacker"; col solito codice si apre il pannello admin, con altri codici si sbloccano cose diverse.
- `src/logic/secret-codes.js` (nuovo): `check(codice, { adminCode, isAdmin, guard, now })` → admin | unlock | denied | locked | empty. Il codice admin lo passa l'app (`ADMIN_CODE` in App.jsx, non nel modulo). Su un account NON admin il codice admin risponde come un codice sbagliato (il terminale non conferma mai che era giusto). 5 codici sbagliati di fila → firewall 30 s, salvato sul telefono (`bt_bt-hack-guard`), resta anche riaprendo l'app.
- Sblocchi scelti da me (cambiabili in `UNLOCKS`): `PITWALL` Pit Swipe acceso solo su questo telefono (non cambia la regola Premium dei trofei); `TELEMETRIA` dati veri del telefono nel terminale (versione, rete, account, Premium, copia sul telefono, ora di Roma); `1950` app in bianco e nero (`[data-retro]`). Ridigitato un codice si spegne. Sblocchi in `bt_bt-unlocks`, solo sul telefono. Riga "gli indizi escono sulle storie Instagram di B&T" che apre la pagina Instagram.
- `src/App.jsx`: `HackTerminal` al posto di `AdminKeypad` (righe di avvio, linee del vecchio monitor, banda di luce che scende, scossa e lampo rosso sul codice sbagliato, barra verde sull'accesso consentito; codici mostrati come asterischi). Bottone `[data-hack-open]` nel Profilo per tutti (anche ospite). La riga "Pannello Admin" degli admin apre lo stesso terminale. CSS `.hack-*` in `src/App.css` con fermo per "Rimuovi animazioni".
- Sicurezza da sapere: il codice sta nell'APK (chi lo smonta lo legge). Il pannello resta protetto da Firestore (`admins/<email>`): senza quello il codice giusto non apre niente.
- Annunci e minori (dal controllo del Prompt 1): `src/services/ads.js` `createAds({ minor })` + `under18(about, now)`: chi ha meno di 18 anni secondo "Su di te" riceve solo annunci non personalizzati (`npa: true` su banner, interstitial e video premio). Con solo l'anno di nascita, chi compie 18 anni quest'anno conta ancora come minore. Ospite: età non nota.
- Prompt 1: prompt di produzione per lavorare su Sector 4 con qualsiasi AI + tabella di conformità, nel progetto claude.ai: `claude/prompt-1-sector4.md`. Da fare a mano (Edoardo): pagina web per chiedere la cancellazione dell'account senza l'app (Play la chiede); Privacy Policy aggiornata (notifiche FCM, copia sul telefono, feedback).
- Prove: `test/unit/secret-codes.test.js` (6), `ads.test.js` (+2), `test/e2e/run109-terminale.js` (5). `test/e2e/helpers.js`: `enterAdminCode(p)` scrive il codice nel terminale (o nel tastierino se tornasse); `openAdmin` lo usa e le 14 prove vecchie che premevano le cifre da sole ora lo chiamano. Il codice nelle prove si legge da App.jsx.


## 14/11 (notte): un solo bottone admin, lega B&T per tutti, terminale 01/02, salvati a piastrelle, foto veloci, modalità senza rete, ELO B&T, archivio storico da FastF1

- Richiesta di Edoardo (22:48): via il secondo bottone admin; senza rete una schermata con quello che l'app fa offline e "Riprova"; tutti nella lega B&T (BT-M7AS); nuovo ELO; salvati come il Garage; archivio storico da FastF1 e gara da riguardare dalla RACE; nel terminale "01" il video di presentazione e "02" il giro guidato; foto delle news più veloci.
- Admin: tolta la riga "Pannello Admin · Pubblica notizia" dal Profilo; resta solo ADMIN (terminale). Admin già sbloccato: nel terminale il bottone `[data-hack-panel]` apre il pannello.
- Lega B&T: `BT_LEAGUE` in App.jsx; ogni account (profilo vero letto) entra da solo una volta (`autoLeagues` nei dati personali, `appdata.js` USER_KEYS 28). Rischio: tutti i membri stanno in un documento `fanta/lega-BT-M7AS`: oltre circa 200 iscritti si avvicina al limite di 1 MB di Firestore (da dividere per membro, prima di allora).
- Terminale: `secret-codes.js` `ACTIONS` (01 video, 02 giro guidato). Video in `public/videos/presentazione.mp4` (720x1280, 1,5 MB) + `presentazione.jpg`. Giro guidato per chi ha l'account: `TOUR_MEMBER` in `Benvenuto.jsx`.
- Foto: `src/services/imgstore.js` (nuovo): le foto `fsimg:` restano sul telefono (IndexedDB "bt-img", al massimo 80, esce la meno vista); `firebase.js` `loadImage` guarda prima il telefono. In Home la foto in evidenza `fetchpriority="high"`, quelle in elenco `loading="lazy"`.
- Salvati: `SavedTiles` (mattoncino del Garage, foto + titolo); interruttore griglia/lista `[data-saved-view]` ricordato in `bt-saved-view`.
- Senza rete: `OfflineScreen` al posto delle schede quando il telefono dice offline (niente barra in basso): notizie scaricate, salvati, classifica dell'ultima copia, 4 strumenti del Garage che non scaricano niente (Pit Stop, Drag vs Downforce, Guida 2D, Spec Clash). "Riprova a collegarti" rilegge Firebase (`refreshShared` ora restituisce il risultato). Rete che c'è ma non risponde: la riga "Sei offline" ha "Cosa puoi fare senza rete" (schermata chiudibile).
- ELO B&T: `btElo` in `src/logic/elo.js` (il vecchio `fantaElo` resta con le sue prove). Un'unica classifica coi membri della lega B&T: 85% posizione nel GP + 15% vicinanza al migliore, atteso contro la media degli altri, K 48/32/20 (16 da 1700). Non provato in e2e con punti veri (servono risultati di GP e squadre di più persone): solo prove unitarie.
- Archivio storico: `tools/fastf1_archivio.py` (FastF1 → `public/data/archivio/<anno>.json` + `index.json`, stesso formato di weekend.json con `p` posizioni e `f` bandiere), prove `tools/fastf1_archivio_test.py`; workflow `.github/workflows/archivio-f1.yml` (a mano, anni dal 2018). App: `src/services/archive.js`, `src/logic/replay.js` (posizioni giro per giro; controllato sulle 20 gare 2026: tutte finiscono nell'ordine ufficiale), `ArchiveScreen` + `RaceReplay` (vista "archivio"), da Home (Contenuti Premium, al posto dei 4 riquadri "(demo)") e da RACE (`[data-race-archive]`). Premium come prima: senza Premium si apre la finestra Premium.
- NON verificato da qui: FastF1 vero (la rete di questa macchina non arriva al live timing). Finché il workflow non gira, l'archivio ha solo il 2026 e lo dice.
- Prove nuove: unit `imgstore` (4), `replay` (7), `archive` (3), `elo` (+7), `secret-codes` (+1); e2e `run110-lega-bt` (3), `run111-foto-veloci` (2), `run112-salvati` (3), `run113-offline` (3), `run114-archivio` (3); `run109-terminale` (+2). Aggiornate (non cancellate): `run88-nascita` (regola ELO: K 48, lega B&T), `run31-account`, `revisione-b` C1, 14 vecchie prove che aprono l'admin dal terminale.
- Da fare a mano (Edoardo): copiare `.github/workflows/archivio-f1.yml` anche su main e lanciarlo una volta (Actions → "Archivio storico F1", anni 2018-2025).


## 15/11: replay sulla mappa delle gare finite (come il sito di imcarto), nel bottone "Riguarda la gara"

- Richiesta di Edoardo: copiare mia.imcarto.com/gis/f1-track (replay da un file statico per gara: metri lungo la pista a ogni secondo, mappa con le auto, classifica, gomme, distacchi), solo per le gare finite, nel bottone "Riguarda la gara". La diretta non si tocca.
- Dati: `tools/openf1_replay.py` (OpenF1, dati storici gratis dal 2023, nessuna chiave): per ogni gara il tracciato dal giro più veloce del vincitore, le posizioni (x, y) di ogni pilota proiettate sulla linea → metri dal traguardo a ogni secondo, scritti come differenze; gomme (stints), pit, stato della pista (race_control: SC, VSC, rossa), classifica finale. File `public/data/replay/<session_key>.json` (São Paulo 2026: 376 KB, 116 KB compressi) + `index.json`. Prove: `tools/openf1_replay_test.py` (6).
- Controllato sui dati veri di São Paulo 2026: pista 4.230 m (ufficiale 4.309), giri ricostruiti uguali a quelli ufficiali per tutti i 22, ordine alla bandiera a scacchi uguale all'ufficiale tranne LEC/LAW (penalità o arrivo al fotofinish), nessuna SC in quella gara (vero: nei 212 messaggi della direzione gara solo GREEN e CHEQUERED).
- App: `src/logic/track-replay.js` (decode, posizione sulla linea, ordine, giro, distacco dal primo e da chi sta davanti, doppiati, gomma, box, bandiera, arrivo e ordine ufficiale a fine gara; prove `test/unit/track-replay.test.js`, 7). `src/services/archive.js`: `replays()`, `replay(key)`, `findReplay(lista, data)` (gara trovata dalla data, un giorno di tolleranza; le 23 gare del calendario 2026 si abbinano tutte con OpenF1). `MapReplay` in App.jsx: tracciato SVG, auto che si muovono a ogni fotogramma (solo transform), classifica a righe che scorrono con gomme e distacchi, play, velocità ×1/×10/×30/×60, barra del tempo con le fasce di SC, VSC e rossa, tocchi un pilota e si evidenzia. In `ArchiveScreen`: "Riguarda la gara sulla mappa" quando il sito ha il file, se no il giro per giro di prima; file che non arriva: messaggio e "Guarda il giro per giro".
- Grafica: stessa struttura del sito (mappa, classifica, barra del tempo) con i colori B&T; la grafica del sito non l'ho vista (solo l'analisi a testo di Edoardo).
- APK: `public/data/replay` e `public/data/archivio` tolti dall'APK (`codemagic.yaml`, `apk-prova.yml`: `rm -rf build/data/replay build/data/archivio`); l'app li scarica dal sito.
- Workflow `.github/workflows/replay-f1.yml`: lunedì e martedì mattina aggiunge le gare nuove; a mano per gli anni 2023-2025. Deve stare anche su main.
- Prova e2e `test/e2e/run115-replay-mappa.js` (2) col file vero di São Paulo.
- Da fare a mano (Edoardo): copiare `replay-f1.yml` su main; lanciarlo una volta con anni 2023-2025 se si vogliono anche gli anni passati.


## 15/11 (mattina): terminale a blocco di codice, Novità nel Profilo, password in particelle, pallino guida e pallino rosso

- Richiesta di Edoardo (10:12): 4 componenti presi da siti di esempio, rifatti a mano senza librerie in `src/ui/effetti.jsx` (React puro, solo transform/opacity/canvas, fermi con "Rimuovi animazioni").
- Terminale (`HackTerminal`): blocco di codice con titolo `box-bt/terminale.sh`, righe numerate, la riga nuova si scrive da sola col cursore (`TypeText`: il testo intero c'è già, la parte non scritta è trasparente, quindi le prove e i lettori di schermo lo leggono subito), righe evidenziate (verde accesso, rosso negato), bottoni "Vai a capo" e "Copia il terminale".
- Profilo: `ChangelogCard` "Novità" sopra il bottone ADMIN, coi bordi che sfumano quando si scorre. Dati veri: `CHANGELOG` in App.jsx, presi dai commit (date e titoli). Va aggiornato a mano a ogni versione.
- Accesso: premendo Accedi/Registrati la password si sbriciola in particelle (`VanishCanvas`, come "Devouring details sign in" di Skiper UI, che è un campo che si dissolve all'Invio); il valore resta (se l'accesso fallisce la password è ancora lì).
- Pallino (`LiveOrb`, dalla descrizione di "Live Orb": sfera con due occhi a capsula che seguono il dito e sbattono le palpebre; il codice originale non era pubblico): variante Auto (nera sul riquadro chiaro del giro guidato, bianca su sfondo scuro) nel giro guidato; rosso con tre tocchi sulla scheda dove sei già (`BottomNav` `onTriple`), si chiude toccandolo.
- Cosa devono fare il pallino rosso e quello normale: da chiedere a Edoardo (l'ha chiesto lui).
- Prova e2e `test/e2e/run116-effetti.js` (4); vista fallire sulla versione di prima.


## 15/11 (tarda mattina): Enzo, giro guidato a tappe col pallino che vola, replay 2026 col controllo di qualità

- Enzo (richiesta di Edoardo, copione suo parola per parola in `src/logic/enzo.js`, prove `test/unit/enzo.test.js`): tre tocchi sulla scheda dove sei già → foglio di Enzo (`EnzoChat` in `src/ui/guida.jsx`) col pallino rosso. Saluto A/B se c'è un weekend di gara, C se no; risposte su Live Telemetry, Fanta F1, News, Community: mentre parla l'app va nella scheda (`DEMO`) e il pezzo si illumina (se il pezzo sta in basso il foglio va in alto); fuori tema, bug (anche da solo se l'app è offline), chi insiste o scrive troppo; chiudendo dice una frase di congedo. Testo che si scrive veloce (`TypeText`). Risposte dal copione, non da un'AI: niente costi e funziona senza rete.
- Giro guidato nuovo (`AppGuide` in `src/ui/guida.jsx`, tappe `APP_TOUR` in App.jsx, 19): Home, Fanta, Race, Garage, Profilo, Enzo. Ogni tappa apre la sua scheda, il pezzo si illumina, il testo si scrive, il pallino (bianco sul fondo scuro) vola vicino al pezzo e lo guarda (`LiveOrb lookAt`). Le tappe col pezzo che non c'è (es. ospite) si saltano; il riquadro del testo compare solo quando il pezzo è trovato. Tappe Race senza sessione vera: parte la prova diretta (DEMO) e si spegne alla fine (`tourGo`/`tourDone`). Ospite: ultimo passo "Continua a guardare" o "Registrati". Il vecchio `GuestTour` di Benvenuto non si usa più nell'app.
- Prove: `test/e2e/run117-enzo-giro.js` (2); aggiornate (non cancellate) `run89-accesso`, `run109-terminale`, `run116-effetti` al giro nuovo e a Enzo.
- Replay 2026: 13 gare su 20 pubblicate. `tools/openf1_replay.py` `quality()` (prove +3): si pubblica solo se i giri di ognuno tornano (80%) e l'arrivo dai dati è come quello ufficiale (al massimo 25% diverso). Tolte: Ungheria (tracciato sbagliato, giri 0/22), Gran Bretagna, Olanda, Azerbaigian, Città del Messico, Bahrein (arrivo troppo diverso); Monaco non convertita (errore); 2 gare senza giri (mai corse). Per quelle resta il giro per giro.
- Da capire (prossimo passo): perché in quelle gare l'ordine non torna (probabile proiezione sulla pista sbagliata in alcuni punti, es. corsia box o curve vicine).


## 15/11 (12:00): giro guidato che si tocca, ospite col giro, tappe nuove, "03" gara demo

- Richiesta di Edoardo (11:35), prima parte. `AppGuide` (src/ui/guida.jsx): il pezzo acceso si può toccare (fuori dal pezzo i tocchi si fermano con 4 bordi trasparenti); toccandolo resta solo il pallino che galleggia (`data-tour-float`, su e giù piano) e guarda i tocchi, col bottone "Torna al giro"; quando si torna dove si era (vista e scheda, prop `where`) torna il riquadro della stessa tappa.
- Testo che si scrive più piano: giro guidato 45 caratteri al secondo, Enzo 50; Enzo prima di andare via aspetta il tempo di leggere il congedo (fino a 6,5 s).
- Ospite: da Accedi e dall'Entrata parte il giro col pallino (una volta per telefono). Cambiata la vecchia regola (prima solo dall'Entrata): aggiornata `run89-accesso`.
- Tappe nuove in `APP_TOUR` (22): "Il tuo Profilo" (bottone in alto, anche per l'ospite), "Second Screen" (con la gara demo), "B&T Trophies" (nel Profilo).
- Terminale "03" (`secret-codes.js` ACTIONS): gara demo dal 5° giro a 30x (`demoFromLap5`: `startLive` ora restituisce la simulazione; avanti finché il primo è al 5° giro; `setLiveSpeed(30)`; scheda Race). `data-live-lap` sulla scheda della diretta (giro del primo: `st.lap` è vuoto quando la sessione non sa i giri totali).
- Prove: unit `secret-codes` (+03); e2e `run118-giro-tocchi.js` (3); aggiornate `run89-accesso`, `run117-enzo-giro` (tempi).
- Da fare (stessa richiesta): Enzo come palla che galleggia con accanto il testo, che nasce dalla barra in basso; bottone Novità in Home con Dot e Enzo che presentano le novità; codici del terminale aggiunti dall'admin.


## 15/11 (12:30): Enzo è una palla che galleggia, nata dalla barra in basso

- Richiesta di Edoardo (11:35), seconda parte. `EnzoChat` (src/ui/guida.jsx): Enzo è una palla rossa che galleggia (`data-enzo-ball`, 58 px, in basso a sinistra; in alto quando il pezzo da mostrare è nella metà bassa) con accanto il riquadro del testo (`data-enzo`, angolo verso la palla). Attributi di prima tenuti: `data-red-orb`, `data-enzo-dock`, chip, campo, Chiudi.
- Animazione `BarMorph`: al terzo tocco la barra in basso si stacca (i due tappi tondi vanno al centro, il pezzo in mezzo si stringe), diventa un cerchio rosso e vola dove sta la palla (520 ms, solo transform/opacity; niente con riduzione movimento). Al congedo lo stesso al contrario e la barra torna. Mentre c'è Enzo la barra è nascosta (`BottomNav` prop `hidden`). App passa a `EnzoChat` la posizione della barra (`fromRect`) e il colore (`barColor`).
- Prove aggiornate: `run117-enzo-giro` (attese, palla rossa e barra nascosta, barra che torna), `run116-effetti` (attese).
- Da fare (stessa richiesta): bottone Novità in Home con Dot ed Enzo; codici del terminale aggiunti dall'admin.


## 15/11 (13:30): bottone Novità con Dot ed Enzo; codici del terminale dall'admin

- Richiesta di Edoardo (11:35), terza parte. Home: chip "Novità" accanto a Salvati (`data-novita-open`, acceso con
  `data-novita-new` finché non hai aperto l'ultima novità del registro: `NOVITA_KEY` sul telefono, versione = prima
  voce di `CHANGELOG`). Apre `DuoGuide` (src/ui/guida.jsx): Dot (bianco) ed Enzo (rosso) si alternano (`NOVITA_DUO`,
  20 battute con qualche battuta e litigata), ogni battuta apre la sua scheda (`tourGo`) e illumina il pezzo; chi parla
  è più grande e guarda il pezzo, l'altro guarda chi parla; un pezzo che non c'è: si parla lo stesso. Salta, Indietro,
  Avanti, Fine. Solo funzioni vere (le stesse del registro). Nuove voci del registro: Novità con Dot ed Enzo, Enzo,
  giro guidato nuovo.
- Admin, scheda nuova TERMINALE (`AdminTerminalTab`): codice, titolo, messaggio, azione (solo messaggio, video, giro
  guidato, gara demo). Salvati in `shared/bt-terminal-codes` (le regole di Firestore ci sono già: scrivono solo gli
  admin, leggono tutti). `secret-codes.js`: `cleanCustom` (al massimo 30, codice 2-16 lettere/numeri, niente doppioni,
  niente codici di serie), `takenWhy` (dice "c'è già" senza dire quale codice di serie, così il codice admin non si
  scopre), `check(..., { custom })` → `{ kind: "custom", title, say, action }`; i codici di serie e il codice admin
  vincono sempre. I codici dell'admin non sbloccano niente a pagamento. `appdata.js`: tipo `termCodes`.
- Prove: unit `secret-codes` (+3), `appdata` (+1); e2e `run119-novita-codici.js` (4).


## 15/11 (15:00): domande di storia dell'admin aperte, scelta piloti stile chess.com, novità che portano alle funzioni

- Bug grave (Edoardo: "nei sondaggi storici che ho fatto io dice che è chiuso il voto"). Causa, dal documento vero
  `shared/bt-predictions`: la sua domanda era di tipo Scuderia con la risposta già segnata (pitstop più veloce a Las
  Vegas 2023, Red Bull) per la gara di sabato prossimo; una domanda con la risposta segnata risultava chiusa ("Il
  risultato lo segna l'admin") e nessuno poteva rispondere. Ora `BtLogic.predKnown`: risposta segnata prima che la
  sessione cominci (o `hist: true`) = domanda di storia: un tentativo, si vede subito se è giusta, +1 se giusta, badge
  STORIA. A sessione cominciata torna un pronostico chiuso come prima. Spiegato anche nel Pannello (PREVISIONI).
  Prove: unit `logic` (+1), e2e `run120-storia-admin.js` (2; rossa sul codice di prima).
- Scelta del pilota nel Fanta "come su chess.com" (`ChessDriverPicker`): in alto il pilota scelto con la sua frase nel
  fumetto (`src/data/driver-lines.js`, testo di Edoardo, 2 frasi per pilota; toccandolo di nuovo dice l'altra), sotto i
  22 piloti a gruppi per scuderia (11), in fondo "Prendi <pilota> · prezzo". Chi non entra nel budget o è già in
  squadra si guarda (e parla) ma non si prende (`data-pick-off`, lucchetto o spunta sul volto, motivo sopra il
  bottone). Le scuderie restano con la lista di prima (`FantaPicker`). Nelle prove il pilota si prende con
  `pickDriver(p, id)` (helpers): aggiornate run14, run15, run108 (tocco + Prendi; "non si prende" = data-pick-off).
  Prove: unit `driver-lines` (3), e2e `run122-scelta-chess.js` (2).
- Registro delle novità (Profilo): le voci con un posto nell'app sono bottoni (`go` in `CHANGELOG`): aprono la scheda e
  indicano il pezzo per un attimo (`FlashSpot`, anello che si accende quando il pezzo ha smesso di scorrere), o fanno
  partire la funzione (Novità con Dot ed Enzo, giro guidato, Enzo, Archivio, Premium). Prova: `run121-novita-vai.js`.

- Foto più leggere (Edoardo: "le immagini scaricate in qualità inferiore o normale a seconda della dimensione che devono
  ricoprire"). Ogni foto ha due copie leggere: "s" (lato lungo 400 px: miniature della lista, Salvati, chat, copertine
  piccole) e "m" (800 px: ultima notizia in grande, copertina grande Instagram); la foto intera (1080 px) solo nella
  notizia aperta e nell'immagine da condividere. `src/services/imgstore.js`: `IMG_LEVELS`, `imgLevel(larghezza)`,
  `shrinkSize`; `firebase.js`: `loadImage(ref, larghezza)` (telefono → memoria → `shared/img-<id>-s|m` → per le foto di
  prima la copia si fa sul telefono dalla foto intera, una volta, e resta in IndexedDB, ora fino a 200 voci);
  `uploadImage` carica anche le copie; `dropImage` cancella anche quelle. App: `useImageSrc(src, w)`, prop `w` di
  `StoredImg`/`StoredBg`. Le notizie vere hanno tutte foto `fsimg:` (controllato sul documento pubblico).
  Prove: unit `imgstore` (+3), e2e `run123-foto-leggere.js` (2, rossa sul codice di prima), aggiornata `run34-admin`
  (con la foto ci sono anche le due copie).


## 15/11 (16:00): Avanti del giro guidato, modalità TV, giro dopo la registrazione, codici 04-08, manutenzione

- Giro guidato (Edoardo: "se schiacci l'evidenziato, torni indietro e schiacci Avanti, il bottone scompare"). Causa:
  quando il riquadro del testo sta sopra il pezzo acceso, il tocco su Avanti cadeva "dentro il pezzo" e il giro passava
  a esplorare. Ora i tocchi sul riquadro non contano mai come pezzo; mentre si esplora il tasto indietro del telefono
  torna indietro nell'app invece di chiudere il giro. Prova: run118 (+1, rossa sul codice di prima).
- Modalità TV (Profilo, Impostazioni: "Modalità TV: schermo sempre acceso", `bt-tv` sul telefono): lo schermo non si
  spegne finché l'app è aperta. `useKeepAwake` conta chi lo chiede (Second Screen + modalità TV): chiudendo il Second
  Screen lo schermo non si spegne più se la modalità TV è attiva. Prova: run101 (+1).
- Account appena creato = giro guidato, anche se visto da ospite (`tourAfterSignup`). Le prove che registrano un account
  e poi fanno altro saltano il giro con `skipTour(p)` (helpers; bottone Salta = `data-tour-skip`): run10, run16, run31,
  run32, run33, run60. Prova: run31 (+1).
- Codici del terminale (numerazione scelta da Edoardo, nella sua lista c'erano due 06): 04 pubblicazione rapida (apre il
  Pannello sul modulo NEWS), 05 reset forzato (toglie la copia dei dati `bt-sc:*` e le foto in IndexedDB, poi ricarica),
  06 errori dell'app (`src/services/errlog.js`: console.error, errori non presi, rete senza risposta o 5xx, letture e
  salvataggi Firebase non riusciti; ultimi 40 sul telefono), 07 prova notifiche (LocalNotifications tra 3 s; nel browser
  Notification o avviso), 08 interruttore d'emergenza (`shared/bt-flags.maintenance`: chi non è admin vede solo la
  schermata "Box, box: manutenzione", con "Accedi (solo admin)"). 04, 06, 08 solo admin (`admin-only`: "codice
  riservato"). Scheda TERMINALE del Pannello: solo l'elenco dei codici (azioni, codici segreti delle storie, quelli
  aggiunti prima su Firebase che funzionano ancora); il modulo per aggiungerli è tolto. Prove: unit secret-codes (+1),
  errlog (2), appdata (+1); e2e run124 (4), aggiornata run119 (scheda TERMINALE = elenco).
- Lingue (tutta l'app in qualsiasi lingua): rimandate con Edoardo a una sessione nuova con un piano (app da 13.600 righe
  tutte in italiano).
- Trofei (Edoardo: "se clicchi su quelli ottenuti: descrizione e come lo hai ottenuto; animazione più festiva"): nella
  pagina "I miei trofei" le piastrelle si toccano e aprono la scheda del trofeo: vinto = "Vinto il <data>" e "Come
  l'hai vinto: <regola>", coriandoli grandi; da vincere = "Come si vince" e quanto manca, coriandoli piccoli
  (`TpConfetti` in src/profilo/TrofeiPage.jsx, solo transform/opacity, niente con "Rimuovi animazioni"). Anche l'avviso
  "Trofeo sbloccato" ha i coriandoli e la coppa che salta. Prova: run93 (+1).
- `#madebyhuman` in fondo alle scritte piccole (avviso F1 in Home e Profilo, fonte dei prezzi del Fanta): scelta di
  Edoardo, dopo avergli detto che l'app è scritta in gran parte con l'IA (`MADE_TAG`, `madeTag()`).


## 16/11 (11:30): scritta Sector 4 in alto, schede dei feedback veri

- In alto, al posto del logo B&T: la scritta "SECTOR 4" che si rivela (`RevealText` in src/ui/effetti.jsx, ricreato
  dal RevealText di 21st.dev: lettere che salgono una dopo l'altra, poi una copia nel colore dell'app che passa sopra;
  col dito ripassa; solo transform/opacity, ferma con "Rimuovi animazioni"). Restano i tre tocchi (lampeggia) e il dito
  tenuto premuto (Launch control); il colore delle feste è quello della copia che passa (Halloween arancio).
- Scheda Feedback: in cima scorrono in 3D (tre colonne inclinate, ferme col dito sopra) i feedback veri dei tifosi che
  hanno spuntato "Si può mostrare agli altri tifosi" (`public: true`, `name` = nickname, mai l'email). `Feedback.
  listPublic()` (testo di almeno 8 lettere, non nascosti, i più nuovi prima, al massimo 18), `Feedback.hide(id)`
  (admin: "Nascondi" nell'elenco "Feedback mostrati", il feedback resta su Firebase). Con meno di 3 feedback da mostrare
  le schede non ci sono: all'inizio sono vuote, si riempiono man mano che i tifosi dicono sì.
- Prove: unit `feedback` (+2), e2e `run125-feedback-sector4.js` (3); aggiornate run64 (scritta al posto del logo) e
  run79 (colore della festa sulla scritta).

- 16/11 "l'app dice che è chiusa ma non lo è": non era un errore del codice. Su Firebase vero `shared/bt-flags.maintenance`
  era `true` dal 15/11 17:02 (codice 08 scritto da un admin): chi non è admin vedeva la schermata di manutenzione,
  l'admin no (entra lo stesso) e quindi non se ne accorgeva. Ora l'admin vede una striscia rossa in alto ("Manutenzione
  accesa: scrivi 08 nel terminale per spegnerla"). Da fare a mano: scrivere 08 nel terminale da admin (o mettere
  maintenance a false nella console di Firebase). Prova: run124 (+1 controllo).
- Prossimo lavoro consigliato (sessione nuova): accesso con Google nel Registrati (serve la SHA-1 del keystore in
  Firebase e il plugin nativo; passi di Edoardo nella console) prima del caricamento a pezzi (senza misure dei tempi
  sarebbe a occhio).

- 16/11 piano velocità (Edoardo: "app molto più veloce"), non iniziato per fine uso: 1) misurare prima (tempo al primo
  disegno e al primo tocco sul bundle di build, Playwright con CPU rallentata 4x; peso dei pezzi con source-map-explorer);
  2) caricare a pezzi le schermate pesanti con React.lazy (Archivio e mappa del replay, Second Screen, pagina Trofei,
  Pannello admin, terminale), così all'avvio arriva solo Home; 3) rimandare dopo il primo disegno le letture Firebase
  che la Home non usa; 4) rimisurare e tenere solo ciò che fa guadagnare davvero.

## 16/11 pomeriggio: parola che rotola in alto (al posto di SECTOR 4)
- Edoardo: "usa questo codice (RollingText di animate-ui) per la parola sector 4 e fai che cambia". Rifatto senza
  librerie in `src/ui/effetti.jsx` (`RollingText`): ogni lettera vecchia gira in su, la nuova arriva da sotto, una dopo
  l'altra; prima di fermarsi mostra caratteri a caso nel colore accent (per le feste è il colore della festa).
  `ghosts` = tutte le parole invisibili una sull'altra: la scritta occupa sempre lo stesso spazio.
- Parole in `src/logic/header-words.js` (prove: `test/unit/header-words.test.js`): all'apertura giorno di gara
  (RACE DAY / BOX NOW! / RED LIGHT), giorno di qualifica (FULL GAS / POLE POS / TIME ATT), notte 00-05 (NIGHT SHI /
  ROUGH MAP), altrimenti DEEP TECH / ANALYZE / COLD LAP. Giorni dagli orari veri di `circuit-info.json` (weekend) con
  l'ora del telefono; senza orari il giorno della data è gara e quello prima qualifica. Il weekend vince sulla notte.
  Tocco: una motivazionale a caso (LEVEL UP ... PUSH NOW), mai la stessa. Restano tre tocchi e Launch control.
  La parola resta per tutta la sessione (`headerWordNow` in App.jsx): l'intestazione si smonta quando si apre il
  Profilo o una pagina, e tornando non deve cambiare parola.
- Intestazione: la scritta prende lo spazio che resta (`flex 1000 1 0`, max 170 px, `container-type: inline-size`,
  font `min(22px, 15cqw)`); Premium, campanella e profilo non si schiacciano più (prima a 360 px la campanella era
  ovale). Con il badge IN PISTA il Premium mostra solo la stella (aria-label resta).
- Prove: nuova `test/e2e/run126-rolling-word.js` (6); aggiornate run125, run64, run79 (leggevano SECTOR 4 / `.rt-o`).
- Suite completa (16/11, JOBS=2): 172 file, 169 verdi. Le 3 rosse erano prove vecchie, ora verdi da sole:
  `run50-colori` (da ospite parte il giro guidato, che dal 15/11 riprende dopo l'accesso e porta in Home: la prova lo
  salta con skipTour), `run70-sistemazioni` (Garage a icone dall'8/11: i nomi si leggono nella vista lista, come
  run20/22/23/69), `run76-richieste-29-10` (il file del sito ha già la gara del weekend; la prova è al sabato e ora le
  dà il file senza quella gara). Le due "DA FARE" del 14/11 sono chiuse.
- Da sapere: in Firestore `shared/bt-flags.maintenance` è ancora `true` (dal 15/11 17:02): sul sito e nell'app chi non
  è admin vede "BOX, BOX: MANUTENZIONE". Va spenta (codice 08 da admin) prima di mandare l'AAB in revisione su Google Play.

## 21/11: blocco app (codice 08) che si sbloccava solo su quel telefono; SECTOR 4 di serie
- Bug (Edoardo: "se viene sbloccata è solo momentanea su quel telefono"): `shared/` si scrive con `{merge:true}` e
  `cleanFlags` toglieva `maintenance` quando era spenta, quindi spegnendo con 08 su Firebase restava `true`; il telefono
  dell'admin la vedeva spenta fino al riavvio. Ora `KINDS.flags.to` scrive sempre `maintenance: true|false`
  (`src/services/appdata.js`). Prove: unit appdata (codice 08 spento) e `run124` (08 con manutenzione accesa la spegne
  su Firebase, un altro telefono vede l'app aperta), rossa prima della correzione.
- Su Firebase oggi `shared/bt-flags.maintenance` è ancora `true` (dal 15/11): con la versione nuova (sito o APK nuovo)
  basta scrivere 08 da admin una volta. Le versioni vecchie leggono soltanto il valore, quindi si aprono anche loro.
- Scritta in alto (Edoardo: "le scritte devono comparire solo quando si clicca su Sector 4, e dopo poco tornare a
  Sector 4 con la stessa animazione"): di serie SECTOR 4; il tocco fa rotolare una parola a caso tra quelle del momento
  (gara, qualifica, notte, giorno normale) e le motivazionali; dopo `SHOW_MS` (3 s) torna SECTOR 4 rotolando; ogni tocco
  fa ripartire il tempo. Tolta la parola fissa per la sessione del 16/11 (`headerWordNow`). Prove: unit header-words,
  `run126` (7), run125 e run64 di nuovo su SECTOR 4.

## 21/11: codici promo da 6 cifre
- Edoardo: codici promo con l'animazione del video "Digit Spin" e tempi "Smooth" (stagger 65 ms, 260 ms ease-out,
  scheda a molla ω0 16 ζ 0.62); l'admin li scrive su Firebase. Premio (sua risposta): Funzioni Pro per X giorni + un
  trofeo, codice valido solo per un account. Il Premium vero non si regala coi codici (regole Play, prompt-1-sector4).
- Logica `src/logic/promo.js` (prove `test/unit/promo.test.js`): SHA-256 in JS, `emailKey`, `cleanPromo`, `redeem`
  (formato / ospite / nessuno / altro / usato), `newCode` (6 cifre, non comincia con 0), `addCode`, `dropCode`.
- Firebase: `shared/bt-promo` = `{ codes: [{ code, to: sha256(email), days, at }] }` (KINDS.promo, `lazy`: non si legge
  all'avvio, solo quando si scrive un codice o l'admin apre PROMO; `eagerKinds` in appdata). Nell'account
  `app2.promo = { until, used }`. `isPremium` (= Funzioni Pro) ora è `isPaid || adPro || promoPro`.
- Trofeo nuovo "Codice scritto" (id `codice`, dopo "Il mio casco", evento `promo`); non conta per "tutti i trofei =
  Premium" (`NOT_FOR_ALL` in trophypro). Interpretazione mia di "+ al trofeo Il mio casco codice scritto".
- Interfaccia: `src/ui/promo-code.jsx` (PromoCodeInput), `PromoSheet` in App.jsx (Profilo → Codice promo, con
  "Pro fino al ..." quando attivo), Pannello Admin → PROMO (`AdminPromoTab`: email, giorni, codice proposto, CREA,
  lista, cancella; a chi è ogni codice lo ricorda solo il telefono dell'admin, `bt-promo-notes`).
- Corretto anche: tasto in alto e scheda Premium del Profilo ora usano `isPaid`: col video o col codice non dicono più
  "Sei B&T Premium" (prima col video sì).
- Prove: nuova `run127-codici-promo` (5), unit promo, trofei, trophypro, appdata. `data-pro="on|off"` sul contenitore
  dell'app (invisibile) dice se le Funzioni Pro sono attive: lo leggono run76 (video) e run127 (codice), visto che il
  tasto in alto non lo dice più.
- Suite completa 21/11 (JOBS=2): 174 file, 171 verdi; run33 e run71 rossi solo sotto carico (da soli verdi: 22/22 e
  9/9), run76 aggiornata per il tasto in alto e verde (8/8).
- Per Edoardo: Privacy Policy da aggiornare (codici promo: impronta dell'email nel documento dei codici, codici usati
  nell'account). Regole di Firestore: `shared/bt-promo` deve essere scrivibile solo dagli admin, come gli altri shared.

## 21/11: Trackside di I Built Things dentro l'app
- Edoardo: "come integrare e rendere parte dell'app https://ibuiltthings.com/trackside", poi il video del sito e
  "ho tutti i permessi da I Built Things". Il sito (di Riska) è un'app 3D del solo GP di Singapore: mappa notturna con
  le tribune e i prezzi, settori, fila e sedile, vista in prima persona dal posto, link ai biglietti ufficiali.
  Nessun codice pubblico: da qui il sito non si raggiunge (filtro di rete), si è capito dal video.
- Fatto: `TracksideScreen` (App.jsx, accanto a CircuitScreen): il sito in un iframe a tutto schermo, SubHeader col
  nostro Indietro, credito "Trackside è di I Built Things (Riska), nell'app con il suo permesso", "APRI FUORI"
  (`openUrl`: browser dell'app su Android). Si apre dal Garage (Tracciati, piastrella `trackside` con icona nuova) e
  dalla pagina del circuito di Marina Bay (`TRACKSIDE_CIRCUIT = "sg-2008"`).
- Prove: nuova `run128-trackside` (2, col sito sostituito da una pagina finta); run70 conta 12 giochi.
- Da provare sul telefono (non si può da qui): che il sito si veda nel riquadro (se il sito vieta i riquadri, resta
  vuoto: allora "APRI FUORI", o chiedere a Riska di permetterlo), la grafica 3D e il link "Buy on the official site".
- Per Edoardo: Privacy Policy, contenuto di un sito terzo dentro l'app (Trackside).
- Più avanti, se Riska dà il codice o i modelli 3D: rifarlo dentro l'app (senza riquadro) e collegarlo al resto
  (salvare il proprio posto, vista dal posto nel replay).

### 21/11: Quadrante dei box nel Replay (piano claude/multiviewer-in-sector4.md, passi 1-3)
- `src/logic/pit-dial.js` (prove `test/unit/pit-dial.test.js`, 12): tempo perso ai box misurato sui pit veri della
  gara (crescita del distacco dai rivali vicini che non si fermano), stima del rientro (posizione, davanti/dietro,
  aria libera > 2 s), quadrante (auto sul giro in tempo), stima principale che segue la bandiera (SC → tempo perso
  con la SC; rossa → niente), prova sui pit veri `node tools/pit-dial-backtest.js [lead] [chiave]`.
- Risultato sui 417 pit 2026 (394 normali + 23 di massa a parte, Monza giro 3): rientro esatto 56%, ±1 78%;
  da solo ai box 80% / 96%; con altri ai box nello stesso momento 41% / 67%. "Resta dov'è" indovina il 23%.
- Con la SC misurato 0,87-0,89 del tempo normale (Spa, Suzuka, Shanghai): SC_FACTOR 0,88 (era 0,5 a stima, sbagliato).
- Scoperto: nei file il tempo del pit (date di OpenF1) è l'USCITA dalla corsia. Il badge BOX del Replay si accendeva
  dopo l'uscita: ora da t - durata a t (`track-replay.js`, prova aggiornata in track-replay.test.js).
- App: nel Replay sulla mappa interruttore Mappa | Box (`PitDialView`, `dialPlace`); cartello della bandiera sopra la
  mappa. Prova `test/e2e/run129-quadrante-box.js` (3, São Paulo e Suzuka veri).

### 21/11: Contagiri nel Ghost Lap (piano claude/multiviewer-in-sector4.md)
- `src/logic/contagiri.js` (prove `test/unit/contagiri.test.js`, 5): lettura (velocità, gas, freno 0/1, marcia),
  angoli 0-360 km/h su 270°, archi SVG, archi dei pedali, compatto sotto i 140 px.
- App: `Contagiri` (misura il suo riquadro con ResizeObserver) sotto la lettura del grafico della velocità e nel
  replay 2D della curva, per il pilota A e B. Niente giri motore né DRS (il dato non c'è). Prova
  `test/e2e/run130-contagiri.js` (3): numeri uguali alla lettura e alle etichette delle macchine, compatto a 320 px.

### 21/11: Quadrante dei box anche nella gara in diretta (Edoardo: "falli anche e soprattutto per la live gara")
- `src/logic/pit-dial.js`: `liveLosses` (tempo perso ai pit della gara in corso dai distacchi di OpenF1, come nel
  Replay: crescita del distacco dai rivali che non si fermano, solo quando il pilota è fuori da 15 s), `liveModel`
  (gara → pista nei replay 2026 → mediana 2026 22,7 s scritta come stima; tabella da `node tools/pit-loss-table.js`),
  `liveDial` (posizione sul giro dai metri della diretta, rientro tra chi è a pieni giri), `rejoinFor` in comune col
  Replay. Prove `test/unit/pit-dial-live.test.js` (4).
- `services/openf1.js` espone `tOf` e `flagAt` della sessione.
- App: nella scheda della diretta (solo gara e sprint) interruttore Mappa | Box; `LivePitDial` con la fila di sigle per
  scegliere il pilota (44 px). Nel Replay resta Mappa | Box per tornare alla mappa. Sigle in pila sul cerchio (sotto
  10° l'una dall'altra la seconda va fuori). Prova `test/e2e/run131-quadrante-diretta.js` (Baku 2026 vera).
- Da sapere: nella fixture di Baku i distacchi sono a campione (ogni ~2 min), troppo radi per misurare i pit: lì vale la
  mediana 2026. In diretta vera OpenF1 li manda ogni ~4 s.
- Non fatto: il quadrante nella mappa a tutto schermo (Ingrandisci).

### 21/11: Pioggia a breve in Race → Meteo (piano claude/multiviewer-in-sector4.md, al posto del radar)
- `src/services/meteo.js`: `shapeForecast` tiene la direzione del vento (`dir`, anche nella funzione su Vercel
  `api/meteo.js` al prossimo deploy); `shortTerm` = prossime 6 ore (voci di un'ora), freccia verso dove soffia il
  vento, riga dell'ora in cui parte una sessione, visibile solo nei giorni della gara (sessione entro 24 ore o
  iniziata da meno di 3). Prove in `test/unit/meteo.test.js` (prova dell'ora intera aggiornata con `dir`).
- App: riquadro "PIOGGIA A BREVE · PROSSIME 6 ORE" sopra le previsioni del weekend. Niente probabilità di pioggia (il
  formato compact di MET non la dà). Prova `test/e2e/run132-pioggia-breve.js` (2).
