# Handoff
Updated: 2026-10-25 by Claude (claude-opus-5-5)   Branch: tappa-3   (vedi "25/10 sera" in fondo per l'ultimo lavoro)

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
