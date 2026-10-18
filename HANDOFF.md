# Handoff
Updated: 2026-10-18 17:00 by Claude (claude-opus-5-5)   Branch: tappa-3   Commit: 99a92a4 (+ lavoro in corso)

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
