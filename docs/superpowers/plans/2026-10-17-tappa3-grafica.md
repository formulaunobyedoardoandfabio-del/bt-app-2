# Tappa 3, prima parte: grafica nuova, easter egg, schede a swipe e foto di Commons (piano)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** tutte le voci G01-G30 del progetto nella 2.0 (ramo `tappa-3`), con le prove, poi l'APK di prova.

**Architecture:** tutto dentro l'app che c'è (`src/App.jsx` e i servizi in `src/services`, i calcoli in `src/logic`):
disegni in SVG e CSS, animazioni solo su `transform`/`opacity`, suoni con Web Audio, vibrazioni con
`@capacitor/haptics`, foto lette da Wikimedia Commons al momento. I calcoli nuovi (contrasto dei colori, casco,
licenze di Commons, gesti) stanno in moduli piccoli con le loro prove Node; le schermate si provano nel browser
(Playwright, `test/e2e`).

**Tech Stack:** React 18 (react-scripts), Capacitor 8 (+ `@capacitor/haptics` 8.0.2), Firebase compat (Firestore e
Authentication), Playwright con Chromium per le prove, Node per le prove dei moduli.

**Spec:** `docs/superpowers/specs/2026-10-11-tappa3-grafica-design.md`

## Global Constraints
- Testi in italiano; niente emoji nei titoli, niente "—" nei testi, niente frasi generiche (R1).
- Disegni tutti nostri (SVG/CSS); fuori solo Tabler Icons (MIT, nei crediti) e `@capacitor/haptics` (R2); suoni
  creati con Web Audio (R3).
- Animazioni solo con `transform` e `opacity`; nessun timer o ridisegno in più quando la pagina non si vede (R4).
- `prefers-reduced-motion: reduce` → animazioni grandi ferme o brevi, stesso significato (R5).
- Contrasto: testo bianco sui tasti almeno 3:1, colore d'accento usato come testo sul nero almeno 4,5:1 (R6).
- Nessuna prova cancellata; si aggiornano solo frasi o disegni cambiati (R7). Prove del browser in `test/e2e`,
  prove dei moduli in `test/unit`; `bash test/all.sh` verde a fine fase.
- Prima di ogni commit: `node tools/check.js src/App.jsx` → `SYNTAX OK`; `node tools/sem.js src/App.jsx` →
  `total unique 0`; `node --check` sui `.js` cambiati.
- Commit in italiano, con le righe `Co-Authored-By` e `Claude-Session` della sessione. Nessun segreto nei file.
  `bt-app-flutter` non si tocca.
- Dati veri: nessun numero inventato nelle grafiche nuove (le carte 3D mostrano solo numeri che l'app ha già).
- Gli APK di prova si fanno con il workflow di GitHub (`git push origin tappa-3:refs/heads/apk-prova`).

## Review Focus
1. **Colori scelti dall'utente estremi** (bianco `#FFFFFF`, nero `#000000`, giallo `#FFFF00`, blu notte `#0A1F44`):
   tasti e testi colorati restano leggibili in tutte le pagine (G02). Prova nel Task 1.
2. **Gesti che si pestano i piedi:** swipe tra le schede mentre si scorre in verticale, su una riga che scorre di lato,
   su una notizia (G11), su un cursore o sul Second Screen: deve vincere il gesto dell'elemento, la scheda non cambia.
   Prove nel Task 17.
3. **Telefono con "Rimuovi animazioni" o lento:** niente animazioni lunghe, e durante la diretta nessun ridisegno in
   più per le animazioni nuove. Prove nei Task 4, 15 e 17.
4. **Suoni prima del primo tocco e app in secondo piano:** Web Audio parte solo dopo un tocco dell'utente; nessun
   errore se l'audio non si può avviare; con "Suoni" spento nessun suono. Prove nel Task 2.
5. **Commons che non risponde, file cancellato o licenza non libera:** si vedono le iniziali o la sagoma, mai una foto
   senza licenza libera, nessun errore. Prove nel Task 18.

---

### Task 1: Colori: nero puro, rosso LED, colore scelto dall'utente (G01, G02)

**Files:**
- Create: `src/logic/colors.js`, `test/unit/colors.test.js`, `test/e2e/run50-colori.js`.
- Modify: `src/App.jsx` (`C`, i rossi scritti a mano, ProfiloScreen "Colori dell'app"), `src/App.css` (rossi e fondo),
  `src/services/appdata.js` (`USER_KEYS` + `theme`, `sounds`, `haptics`, `helmet`, `hidden`).

**Interfaces:**
- Produces (`src/logic/colors.js`): `contrast(hexA, hexB) -> number` (rapporto WCAG); `accentTones(hex, bg = "#000000")
  -> { accent, ink, on }` (`accent` = tono dei tasti, scurito finché `contrast(accent, "#FFFFFF") >= 3`; `ink` = tono
  per testi e linee, schiarito finché `contrast(ink, bg) >= 4.5`; `on` = `"#FFFFFF"`); `rgba(hex, a) -> string`;
  `LED_RED = "#FF1801"`; `PALETTE` (12 colori).
- Produces (App): `C.accent`, `C.accentInk`, `C.onAccent` aggiornati da `applyTheme(theme, favTeam)`; `theme` =
  `{ mode: "team" | "custom", color }` (dati dell'account e `local` "bt-theme").

- [ ] **Step 1: Prove (falliscono)** in `colors.test.js`: `'contrasto: bianco su nero 21, nero su nero 1'`;
  `'giallo #FFFF00: tasto scurito con almeno 3:1 col bianco, testo uguale (già leggibile)'`; `'blu notte #0A1F44:
  tasto uguale, testo schiarito con almeno 4,5:1 sul nero'`; `'bianco e nero estremi: toni validi'`. In
  `run50-colori.js`: `'di serie: sfondo #000000 e tasti rosso LED #FF1801'`; `'scuderia del cuore Ferrari: i tasti
  prendono il suo colore'`; `'colore scelto dalla ruota (#FFFF00): tasto ACCEDI e testi colorati leggibili'`
  (contrasto calcolato dai colori veri della pagina); `'la scelta resta dopo il riavvio e si salva nell'account'`.
- [ ] **Step 2: Eseguirle** → FAIL.
- [ ] **Step 3: Implementare** `colors.js`; in App `C.bg = "#000000"` e `C.accent` da `applyTheme`; i rossi scritti a
  mano (`#E8121D`, `rgba(232,18,29,…)`) passano a `C.accent`/`rgba(C.accent, a)`; dove il rosso è testo o linea su
  nero si usa `C.accentInk`; Profilo → "Colori dell'app" con "Colore della mia scuderia", i 12 colori e "Scegli tu"
  (`<input type="color">`).
- [ ] **Step 4:** `node test/unit/colors.test.js && node test/build-test.js && node test/e2e/run50-colori.js` → verde.
- [ ] **Step 5: Commit** "Colori: nero puro, rosso LED e il colore dei tasti scelto da chi usa l'app".

### Task 2: Suoni e vibrazioni (G03)

**Files:**
- Create: `src/services/fx.js`, `test/unit/fx.test.js`, `test/e2e/run51-suoni.js`.
- Modify: `package.json` (`"@capacitor/haptics": "^8.0.2"`), `src/App.jsx` (interruttori nel Profilo, avvio di fx).

**Interfaces:**
- Produces: `createFx({ audioCtx, haptics, vibrate, local })` → `{ play(name), buzz(kind), unlock(), setSounds(on),
  setHaptics(on), sounds(), haptics() }`; nomi dei suoni: `"tick" | "shift" | "clack" | "radio" | "rev" | "abort" |
  "done"`; vibrazioni: `"light" | "medium" | "heavy" | "select" | "error" | "success"`. Esporta anche `fx` (istanza
  dell'app: `window.Capacitor.Plugins.Haptics` se c'è, altrimenti `navigator.vibrate`).

- [ ] **Step 1: Prove (falliscono)** in `fx.test.js` (Web Audio finto): `'prima di unlock nessun suono e nessun
  errore'`; `'dopo unlock play("shift") crea gli oscillatori'`; `'Suoni spento: nessun suono, le vibrazioni
  restano'`; `'Haptics dell'APK per buzz("error"), navigator.vibrate nel browser'`; `'audio che non parte: nessun
  errore'`. In `run51-suoni.js`: `'Profilo: interruttori Suoni e Vibrazioni accesi di serie, si spengono e restano
  spenti dopo il riavvio'`.
- [ ] **Step 2:** → FAIL. **Step 3: Implementare** (suoni sintetizzati: tic, cambiata, clack, bip radio, sgasata,
  partenza abortita, conferma; `unlock` al primo tocco dell'app). **Step 4:** prove verdi.
- [ ] **Step 5: Commit** "Suoni e vibrazioni, con gli interruttori nel Profilo".

### Task 3: Icone Tabler e testi senza l'aria "da IA" (G04, G05)

**Files:** Modify `src/App.jsx` (`Icon`: volante, casco, motore, bandiera, coppa, contagiri; crediti in Info; testi);
Create `test/e2e/run52-testi.js`.

- [ ] **Step 1: Prove (falliscono):** `'nessun "—" nei testi di Home, Garage, Fanta, Race, Profilo e Notifiche'`;
  `'nessuna emoji nei titoli delle pagine'`; `'crediti: "Icone: Tabler Icons, licenza MIT"'`.
- [ ] **Step 2:** → FAIL. **Step 3:** icone in SVG (tracciati di Tabler, 24 px, linea 2) e testi corretti (le
  lineette lunghe diventano due punti, virgole o frasi). **Step 4:** prove verdi (e le prove di oggi aggiornate solo
  nelle frasi cambiate).
- [ ] **Step 5: Commit** "Icone nuove (Tabler) e testi senza lineette lunghe ed emoji nei titoli".

### Task 4: Avvio: i video la prima volta, poi il Pit Exit Launch (G06)

**Files:** Modify `src/App.jsx` (`SplashScreen`, nuovo `PitExitLaunch`); Modify `test/e2e/run33-playstore.js` (le
prove dello splash con i video aprono il primo avvio); Create `test/e2e/run53-avvio.js`.

**Interfaces:** `local` "bt-intro-seen" = true dopo i video; `PitExitLaunch({ ready, onDone })` con
`data-splash-phase="pitexit"`.

- [ ] **Step 1: Prove (falliscono):** `'primo avvio: i tre video'`; `'secondo avvio: PIT EXIT OPEN, LED del volante,
  poi l'app entro 2 s con i dati pronti'`; `'dati lenti: LED del logo in sequenza e "Caricamento…" fino ai dati'`;
  `'Rimuovi animazioni: niente zoom, solo la scritta e i LED fermi'`.
- [ ] **Step 2-4:** FAIL → implementare → verde. **Step 5: Commit** "Avvio: i video la prima volta, poi il Pit Exit
  Launch".

### Task 5: Accesso: semafori della partenza abortita e cordoli (G07, G08)

**Files:** Modify `src/App.jsx` (`LoginScreen`); Create `test/e2e/run54-accesso.js`.

- [ ] **Step 1: Prove (falliscono):** `'password sbagliata: 5 semafori (data-abort-lights) con "PARTENZA ABORTITA",
  vibrazione "error", il messaggio di oggi resta'`; `'registrazione con password diverse: bordo a cordolo
  (data-kerb) e "Track Limits Exceeded: le password non coincidono"'`.
- [ ] **Step 2-4.** **Step 5: Commit** "Accesso: semafori della partenza abortita e cordoli per le password diverse".

### Task 6: Notizie: filtri a gomma e selettore Pit Lane (G09, G10)

**Files:** Modify `src/App.jsx` (`HomeScreen`, `NEWS_CATEGORIES` + METEO, TECNICA); Create
`test/e2e/run55-filtri.js`; Create `src/logic/newsfilter.js` + `test/unit/newsfilter.test.js`.

**Interfaces:** `filterNews(articles, { tyre, lane, now }) -> articles`; `tyre`: `"soft" | "medium" | "hard" |
"inter" | null`; `lane`: `"all" | "teams" | "drivers" | "tech"`.

- [ ] **Step 1: Prove (falliscono):** unit `'soft: ultime 24 ore'`, `'medium: tutte tranne ANALISI e METEO'`,
  `'hard: ANALISI'`, `'inter: METEO'`, `'lane: SCUDERIE, PILOTI, TECNICA'`, `'gomma e corsia insieme'`; e2e `'la gomma
  scelta ruota e lascia l'impronta (data-tyre-on), un altro tocco la toglie'`, `'Pit Lane: la monoposto scivola sulla
  voce, il suono della cambiata'`, `'Pannello Admin: categorie METEO e TECNICA'`.
- [ ] **Step 2-4.** **Step 5: Commit** "Notizie: filtri a forma di gomma e selettore Pit Lane".

### Task 7: Swipe sulle notizie: salva e nascondi (G11)

**Files:** Modify `src/App.jsx` (righe delle notizie, `hidden` nei dati dell'account); Create
`src/logic/gesture.js` + `test/unit/gesture.test.js`; Create `test/e2e/run56-swipe.js`.

**Interfaces:** `classifySwipe({ dx, dy, dt, width }) -> "left" | "right" | null` (quasi orizzontale: |dy| < |dx| ×
0,58; oltre 25% della larghezza o più di 0,6 px/ms); usata anche dal Task 17.

- [ ] **Step 1: Prove (falliscono):** unit `'swipe corto o diagonale: null'`, `'veloce: anche se corto'`; e2e `'swipe a
  destra: notizia salvata con la pistola che avvita il dado (data-swipe-fx="gun")'`, `'swipe a sinistra: notizia
  nascosta col fumo (data-swipe-fx="smoke"), "Notizie nascoste: 1 · Mostra" la rimette'`, `'nascoste salvate
  nell'account'`.
- [ ] **Step 2-4.** **Step 5: Commit** "Swipe sulle notizie: a destra si salva, a sinistra si nasconde".

### Task 8: Articolo: barra ERS e condivisione Team Radio (G12, G13)

**Files:** Modify `src/App.jsx` (`ArticleScreen`, `ShareSheet`, immagine dell'articolo); Create
`test/e2e/run57-articolo.js`.

- [ ] **Step 1: Prove (falliscono):** `'barra ERS: 0% in cima, 100% in fondo con "ERS: 100%"'`; `'condivisione:
  onda della radio, bip, immagine con "TEAM RADIO // BREAKING NEWS", avviso "Radio Check: notizia inviata"'`.
- [ ] **Step 2-4.** **Step 5: Commit** "Articolo: barra ERS e condivisione Team Radio".

### Task 9: Tira giù per aggiornare con la sgasata (G14)

**Files:** Modify `src/App.jsx` (`HomeScreen`, `refreshShared`); Create `test/e2e/run58-aggiorna.js`.

- [ ] **Step 1: Prove (falliscono):** `'tirando giù il contagiri sale (data-rev da 0 a 1)'`; `'rilascio oltre la soglia:
  cambiata e notizie rilette da Firebase'`; `'rilascio sotto la soglia: niente'`.
- [ ] **Step 2-4.** **Step 5: Commit** "Home: tira giù per aggiornare con la sgasata".

### Task 10: Il casco del profilo e il suo editor (G15)

**Files:** Create `src/logic/helmet.js` + `test/unit/helmet.test.js`; Modify `src/App.jsx` (`HelmetArt`,
`HelmetEditor`, ProfiloScreen, `TopHeader`); Create `test/e2e/run59-casco.js`.

**Interfaces:** `HELMET_DEFAULT`, `HELMET_PATTERNS` (`stripes`, `flames`, `checks`, `stars`, `bolt`, `pinstripes`,
`dots`, `none`), `HELMET_VISORS` (`clear`, `smoke`, `iridium-blue`, `iridium-gold`, `mirror-red`),
`HELMET_FINISHES` (`gloss`, `matte`, `airbrush`); `cleanHelmet(spec) -> spec` (valori validi, numero 0-99);
`<HelmetArt spec size visorOpen />`.

- [ ] **Step 1: Prove (falliscono):** unit `'cleanHelmet: colori, disegno e numero validi'`; e2e `'nel Profilo il
  casco al posto delle iniziali'`, `'editor: la visiera si alza (data-visor="open")'`, `'salvando la visiera si
  abbassa con il clack e il casco resta dopo il riavvio'`, `'il casco anche nel tasto del profilo in alto'`.
- [ ] **Step 2-4.** **Step 5: Commit** "Il casco al posto della foto del profilo, con l'editor".

### Task 11: Contachilometri degli anni da tifoso e manettino dell'anno di nascita (G16, G17)

**Files:** Modify `src/App.jsx` (registrazione e "Su di te"); Create `test/e2e/run60-rulli.js`.

- [ ] **Step 1: Prove (falliscono):** `'anni da tifoso: rulli con le cifre, + e − cambiano il valore'`; `'anno di
  nascita: manettino (role="slider"), uno scatto per anno con il tic, frecce della tastiera'`; `'il controllo dei 14
  anni resta'`.
- [ ] **Step 2-4.** **Step 5: Commit** "Contachilometri degli anni da tifoso e manettino dell'anno di nascita".

### Task 12: Centro Notifiche e interruttori a capsula (G18)

**Files:** Modify `src/App.jsx` (`NotificheScreen`, `Toggle`); Create `test/e2e/run61-notifiche.js`.

- [ ] **Step 1: Prove (falliscono):** `'titolo "Centro Notifiche", "Stato: Connesso al Pit Wall"'`; `'senza rete "Pit
  Wall non raggiungibile"'`; `'interruttori a capsula (data-pill) con pallino che scatta'`.
- [ ] **Step 2-4.** **Step 5: Commit** "Centro Notifiche con lo stato del Pit Wall e gli interruttori a capsula".

### Task 13: Podio a sollevatore e frecce animate (G19, G20)

**Files:** Modify `src/App.jsx` (`Podium`, righe delle classifiche e dei prezzi del FantaF1); Create
`test/e2e/run62-podio.js`.

- [ ] **Step 1: Prove (falliscono):** `'podio: i gradini salgono uno alla volta (data-lift)'`; `'frecce: verde su,
  rossa giù, trattino grigio uguale'` (posizioni del mondiale rispetto alla gara prima, prezzi FantaF1).
- [ ] **Step 2-4.** **Step 5: Commit** "Podio a sollevatore idraulico e frecce animate".

### Task 14: Parc fermé, zona eliminazione e carte pilota 3D (G21, G22, G23)

**Files:** Modify `src/App.jsx` (`FantaScreen`, pronostici, classifica delle leghe, `FantaSlot`); Create
`src/logic/qzones.js` + `test/unit/qzones.test.js`; Create `test/e2e/run63-fanta.js`.

**Interfaces:** `qZones(n) -> { q1: number, q2: number }` (righe in fondo: `round(n×6/22)` ciascuna; `n < 10` →
`{ q1: 0, q2: 0 }`).

- [ ] **Step 1: Prove (falliscono):** unit `'qZones(22) = 6 e 6, qZones(10) = 3 e 3, qZones(9) = 0'`; e2e `'squadra
  chiusa: telo in carbonio "PARC FERMÉ" con l'ora'`, `'lega di 12: zone Q1 e Q2 colorate'`, `'carta del pilota: tocco
  e si gira con punti, prezzo e statistiche veri'`.
- [ ] **Step 2-4.** **Step 5: Commit** "FantaF1: Parc fermé, zona eliminazione e carte pilota 3D".

### Task 15: Shift Light, LED del logo ed easter egg (G24, G25, G26)

**Files:** Modify `src/App.jsx` (`ShiftLight`, `LedGrid`, `TopHeader`, caricamenti brevi); Create
`test/e2e/run64-led.js`.

**Interfaces:** `<ShiftLight state="run" | "done" />` (5 verdi, 5 rossi, blu lampeggianti a fine); `<LedGrid
mode="idle" | "pulse" | "seq" | "flash3" />`.

- [ ] **Step 1: Prove (falliscono):** `'accesso: Shift Light mentre aspetta, blu a fine'`; `'logo in alto con la griglia
  di LED'`; `'sessione LIVE: i LED pulsano sul badge "in pista"'`; `'tre tocchi sul logo: tre lampeggi
  (data-led="flash3"), suono e vibrazione'`; `'un tocco solo: niente'`.
- [ ] **Step 2-4.** **Step 5: Commit** "Shift Light, LED rossi del logo e l'easter egg dei tre tocchi".

### Task 16: Pit Board e la gomma che si rovina (G27, G28)

**Files:** Modify `src/App.jsx` (`RaceScreen` tempi, `DegChart`/Degrado gomme); Create `test/e2e/run65-race.js`.

- [ ] **Step 1: Prove (falliscono):** `'scorrendo i tempi l'intestazione diventa la Pit Board (posizione, distacco,
  giro) del preferito'`; `'Degrado gomme: scorrendo i giri la gomma passa da lucida a graining e blistering secondo il
  degrado'`.
- [ ] **Step 2-4.** **Step 5: Commit** "Race: Pit Board; Degrado gomme: la gomma che si rovina".

### Task 17: Scorrere tra le schede (G29)

**Files:** Modify `src/App.jsx` (contenitore delle schede, `data-swipe-own` sugli elementi con gesti propri); Create
`test/e2e/run66-schede.js`.

**Interfaces:** consuma `classifySwipe` (Task 7). Elementi con gesti propri: notizie (G11), righe che scorrono di
lato, cursori, manettini, mappe, campi di testo, Second Screen → `data-swipe-own`.

- [ ] **Step 1: Prove (falliscono):** `'da HOME swipe a sinistra: GARAGE; poi a destra: HOME'`; `'da RACE a sinistra:
  resta RACE'`; `'swipe su una notizia: salva o nasconde, la scheda non cambia'`; `'swipe su una riga che scorre di
  lato o su un cursore: la scheda non cambia'`; `'scorrere in verticale con un po' di diagonale: la scheda non
  cambia'`; `'articolo aperto: niente swipe tra le schede'`.
- [ ] **Step 2-4.** **Step 5: Commit** "Swipe tra le schede della barra in basso".

### Task 18: Foto da Wikimedia Commons (G30)

**Files:** Create `src/services/commons.js` + `test/unit/commons.test.js`; Create `src/data/commons-candidates.js`;
Modify `src/App.jsx` (`Headshot`, foto grande del pilota, podio costruttori, carte del FantaF1, scheda Admin FOTO,
crediti), `src/services/appdata.js` (`bt-commons-photos`); Create `test/e2e/run67-foto.js`.

**Interfaces:**
- `createCommons({ fetchImpl, now, local })` → `{ info(files) -> Promise<{ [file]: { thumb, page, author, license,
  free, date } }> }`: una richiesta all'API di Commons (`action=query&prop=imageinfo&iiprop=url|extmetadata
  &iiurlwidth=480&origin=*`, al massimo 50 file), risultati tenuti 7 giorni; `free` vero solo per CC0, pubblico
  dominio, CC BY, CC BY-SA (non NC, non ND).
- `COMMONS_CANDIDATES = { drivers: { id: [file…] }, cars: { teamId: [file…] }, logos: { teamId: [file…] } }`
  (fino a 3 per voce, la prima è quella di serie); `SHOW_TEAM_LOGOS = true` (da mettere a false per il Play Store).
- `useCommonsPhoto(kind, id) -> { thumb, credit } | null`.

- [ ] **Step 1: Prove (falliscono):** unit `'licenze: CC BY-SA 4.0 e CC0 sì, CC BY-NC no, fair use no'`, `'autore
  senza HTML'`, `'Commons che non risponde: null, nessun errore'`, `'file mancante: null'`, `'cache di 7 giorni'`;
  e2e (Commons finto con `routes`): `'pilota con foto libera: foto e "Foto: autore, licenza"'`, `'licenza non
  libera: iniziali'`, `'Admin → FOTO: candidate di Leclerc, scelta della seconda, la vedono tutti'`, `'link incollato
  da Commons'`, `'loghi solo con SHOW_TEAM_LOGOS'`.
- [ ] **Step 2-4.** **Step 5: Commit** "Foto da Wikimedia Commons con licenza e autore, scelte dal Pannello Admin".

### Task 19: Trofei (G31, richiesta del 17/10)

**Files:** Create `src/logic/trophies.js` + `test/unit/trophies.test.js`, `test/e2e/run68-trofei.js`; Modify
`src/App.jsx` (bacheca "I miei trofei" nel Profilo, medaglia, chat, assegnazione), `src/services/appdata.js`
(`USER_KEYS` + `trophies`), `src/services/compat.js` (`medal` nei messaggi della chat).

**Interfaces:** `TROPHIES` (15: `{ id, name, how, goal?, secret? }`); `trophyProgress(input) -> { [id]: { done, value?,
goal? } }` con `input = { about, helmet, squad, saved, pitBest, sillyPreds, ratings, dotd, correctPreds, correctWx,
correctPolls, events }`; `medalOf(count) -> null | "bronzo" | "argento" | "oro"` (1, 5, 10).

- [ ] **Step 1: Prove (falliscono):** unit `'medalOf: 1 bronzo, 5 argento, 10 oro'`, `'trophyProgress: condizioni sui
  dati veri'`; e2e `'previsione giusta: "Trofeo sbloccato: Indovino"'`, `'bacheca nel Profilo: casco, medaglia, vinti
  con la data, da vincere con quanto manca'`, `'chat: la medaglia accanto al nome, anche nei messaggi degli altri'`,
  `'tre tocchi sul logo: il trofeo segreto'`.
- [ ] **Step 2-4.** **Step 5: Commit** "Trofei: bacheca nel Profilo, medaglia in chat e avviso del trofeo".

### Task 20: Verifica finale e APK di prova

- [ ] **Step 1:** `bash test/all.sh` → TUTTO VERDE.
- [ ] **Step 2:** schermate di tutte le pagine nuove (telefono 390 e 540 px) e controllo a occhio.
- [ ] **Step 3:** revisione di tutto il ramo da parte di un revisore nuovo; correzioni con prova RED→GREEN.
- [ ] **Step 4:** push di `tappa-3` e `apk-prova`; controllare che la build di GitHub finisca bene e dare il link a
  Edoardo con le cose da provare.
