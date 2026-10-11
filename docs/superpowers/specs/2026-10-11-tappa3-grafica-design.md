# Tappa 3, prima parte: grafica nuova ed easter egg (progetto)

Data: 11/10/2026. La lista è stata approvata da Edoardo in chat l'11/10 ("okay, tutto apposto, procedi"); questo
documento la scrive per intero, con le scelte che servono per costruirla.

## Scopo
Sector 4 deve sembrare un'app fatta da tifosi di F1, curata nei dettagli: colori, suoni, vibrazioni e animazioni in
stile box, muretto e monoposto, e qualche sorpresa nascosta (easter egg). Prima tutta la grafica, poi Edoardo prova
l'APK; dopo arrivano i trofei e le altre funzioni che manderà.

## Regole
- R1. Testi in italiano, senza emoji nei titoli, senza lineette lunghe (—) e senza frasi generiche.
- R2. Tutto disegnato da noi nell'app (SVG e CSS): niente grafiche della F1 o della TV, niente caschi veri dei piloti,
  niente pacchetti di animazioni presi da fuori. Le sole cose nuove da fuori: le icone Tabler (licenza MIT, nei
  crediti) e il pezzo ufficiale di Capacitor per le vibrazioni (`@capacitor/haptics`, MIT).
- R3. I suoni li crea il telefono (Web Audio): nessun file audio di altri.
- R4. L'app resta veloce: le animazioni muovono solo posizione, scala e trasparenza; durante la diretta nessun
  ridisegno in più.
- R5. Con "Rimuovi animazioni" acceso nel telefono (prefers-reduced-motion) le animazioni grandi diventano ferme o
  brevi, e il significato resta (per esempio il colore dell'errore resta, il movimento no).
- R6. I testi restano leggibili con qualsiasi colore scelto dall'utente (contrasto calcolato, G02).
- R7. Ogni cosa nuova ha la sua prova automatica; le prove di oggi restano tutte (si aggiornano solo le frasi o i
  disegni cambiati).

## Scelte

### In tutta l'app
- **G01. Colori di base.** Sfondo nero puro `#000000` (schermi OLED), carte e superfici grigio scuro, testi bianchi e
  grigi come oggi. Colore dei tasti di serie: rosso LED `#FF1801` (al posto di `#E8121D`).
- **G02. Colore dei tasti scelto dall'utente.** Profilo → "Colori dell'app":
  - "Colore della mia scuderia" (di serie quando c'è la scuderia del cuore; senza scuderia, il rosso LED);
  - una serie di 12 colori (i colori delle scuderie e qualcuno in più);
  - "Scegli tu" con la ruota dei colori.
  Dal colore scelto si ricavano due toni: quello dei tasti (scurito finché il testo bianco sopra ha contrasto almeno
  3:1) e quello di testi, bordi e linee sul nero (schiarito finché ha contrasto almeno 4,5:1 con lo sfondo). La scelta
  si salva nei dati dell'account (`theme`) e sul telefono, così all'avvio l'app ha subito il colore giusto; per
  l'ospite solo sul telefono.
- **G03. Suoni e vibrazioni.** Accesi di serie, con due interruttori nel Profilo: "Suoni" e "Vibrazioni" (`sounds`,
  `haptics` nei dati dell'account e sul telefono). Suoni: tic della selezione, cambiata, clack della visiera, bip del
  Team Radio, sgasata, errore della partenza abortita, conferma della Shift Light. Vibrazioni con `@capacitor/haptics`
  nell'APK; nel browser `navigator.vibrate` dove c'è.
- **G04. Icone nuove** (Tabler, 24 px, linea 2 come le icone di oggi): volante, casco, motore, bandiera, coppa,
  contagiri, dove servono nelle schede nuove; crediti: "Icone: Tabler Icons, licenza MIT".
- **G05. Testi "da app fatta con l'IA".** Via le emoji nei titoli, le lineette lunghe nei testi e le frasi generiche
  (R1), in tutta l'app.

### Avvio e accesso
- **G06. Avvio.** Al primo avvio in assoluto i tre video di Edoardo, come oggi. Dagli avvii dopo il "Pit Exit
  Launch" (circa 1,5 s): i LED del volante si accendono da sinistra a destra, compare "PIT EXIT OPEN", zoom con le
  linee della velocità, poi l'app. Se i dati non sono ancora arrivati, i LED rossi del logo si accendono in sequenza
  con "Caricamento…" fino a quando arrivano (al massimo 15 s, come oggi). Il primo avvio fatto si ricorda sul telefono.
- **G07. Password sbagliata:** 5 semafori rossi che lampeggiano gialli ("PARTENZA ABORTITA"), il tasto ACCEDI trema e
  il telefono vibra; il messaggio di errore di oggi resta sotto.
- **G08. Password diverse in registrazione:** il campo prende il bordo a cordolo bianco e rosso e compare "Track
  Limits Exceeded: le password non coincidono".

### Notizie
- **G09. Filtri a forma di gomma** (riga sotto la ricerca): Soft rossa = ultim'ora (notizie delle ultime 24 ore),
  Medium gialla = generali (tutte tranne approfondimenti e meteo), Hard bianca = approfondimenti (categoria ANALISI),
  Intermedia verde = meteo (categoria nuova METEO). Toccata, la gomma ruota e lascia l'impronta del battistrada;
  toccata di nuovo si toglie. Nel Pannello Admin si aggiungono le categorie METEO e TECNICA.
- **G10. Selettore "Pit Lane"** sopra i filtri: corsia dei box con Tutte, Scuderie, Piloti, Tecnica (categorie
  SCUDERIE, PILOTI, TECNICA); la monoposto scivola sulla voce scelta, con il suono della cambiata. Si combina con le
  gomme, gli hashtag, la ricerca e "Salvati".
- **G11. Swipe sulle notizie** dell'elenco: a destra salva (pistola pneumatica che avvita il dado), a sinistra
  nasconde (fumo del bloccaggio). Le nascoste si salvano nei dati dell'account (`hidden`) e si possono rimettere dal
  fondo dell'elenco ("Notizie nascoste: N · Mostra"). Con il tasto del segnalibro si salva come oggi.
- **G12. Barra ERS** in cima all'articolo: si riempie mentre si legge; a fine articolo "ERS: 100%".
- **G13. Condivisione "Team Radio":** il foglio di condivisione diventa una radio (bip, vibrazione, onda della radio);
  l'immagine condivisa ha la fascia "TEAM RADIO // BREAKING NEWS" e il titolo come messaggio radio; alla fine
  l'avviso "Radio Check: notizia inviata".
- **G14. Tira giù per aggiornare** (Home): compare un contagiri che sale verso il fuorigiri mentre si tira; al
  rilascio, sopra la soglia, la cambiata (suono e vibrazione) e le notizie si rileggono da Firebase.

### Profilo
- **G15. Casco al posto della foto** (nel Profilo e nel tasto del profilo in alto). Editor completo: colore di base,
  due colori per il disegno, il disegno (Strisce, Fiamme, Scacchi, Stelle, Fulmine, Righe sottili, Pois, Nessuno), il
  numero (0-99), la visiera (Chiara, Fumé, Iridio blu, Iridio oro, Specchio rosso), la finitura (Lucida, Opaca,
  Aerografo, cioè sfumata). Entrando nell'editor la visiera si alza; salvando si abbassa con il clack (suono e
  vibrazione). Si salva nei dati dell'account (`helmet`); senza casco, uno di serie con il colore dei tasti.
- **G16. Anni da tifoso** (registrazione e "Su di te"): il contachilometri a rulli, con le cifre che girano; si
  cambia trascinando i rulli o con − e +.
- **G17. Anno di nascita** (registrazione e "Su di te"): un manettino rotante al posto del menu a tendina, uno scatto
  (tic e vibrazione) per ogni anno.
- **G18. Centro Notifiche:** titolo "Centro Notifiche", riga "Stato: Connesso al Pit Wall" (senza rete "Pit Wall non
  raggiungibile"), le preferenze come righe con icona e interruttore "Fluid Minimal Pill" (capsula grigia da spento,
  colorata da acceso, pallino bianco con ombra che scatta come una molla).

### Classifiche, FantaF1 e giochi
- **G19. Podio a sollevatore idraulico** in cima alle classifiche (2° a sinistra, 1° al centro, 3° a destra): i
  gradini salgono uno alla volta quando il podio compare.
- **G20. Frecce animate** accanto a posizioni e prezzi che cambiano: verde che scatta in su, rossa che scende,
  trattino grigio se uguale.
- **G21. Parc fermé:** quando si chiudono la squadra del FantaF1 o i pronostici, un telo in carbonio scende sopra con
  "PARC FERMÉ" e l'ora della chiusura.
- **G22. Zona eliminazione** nelle classifiche delle leghe del FantaF1 con almeno 10 squadre, nelle proporzioni delle
  qualifiche 2026 (22 vetture: 6 fuori in Q1, 6 fuori in Q2, 10 in Q3): con N squadre le ultime round(N × 6 / 22)
  righe in rosso ("Zona Q1"), le round(N × 6 / 22) prima in giallo ("Zona Q2"), le altre normali ("Q3").
- **G23. Carte pilota che si girano in 3D** nel FantaF1: davanti il pilota e il prezzo, dietro punti, quotazione e
  statistiche della stagione (numeri veri già nell'app; nessuna probabilità inventata).

### Caricamenti e Race
- **G24. Shift Light** al posto delle rotelline e dei "Caricamento…" brevi (accesso, salvataggi, invii): 5 LED verdi,
  5 rossi, poi i blu che lampeggiano quando l'operazione è finita.
- **G25. I LED rossi del logo:** la griglia di LED della luce posteriore (come nel video dell'avvio) nel logo in alto;
  pulsano sul badge "in pista" quando c'è una sessione; si accendono in sequenza nei caricamenti lunghi.
- **G26. Easter egg:** tre tocchi veloci sul logo in alto e i LED lampeggiano tre volte, con il suono e la vibrazione.
- **G27. Pit Board:** nella pagina Race, scorrendo i tempi, l'intestazione diventa il tabellone del muretto
  (posizione, distacco, giro) del pilota preferito, o del primo senza preferito.
- **G28. La gomma che si rovina** nel Degrado gomme: scorrendo i giri dello stint la gomma disegnata passa da lucida a
  rovinata (graining, poi blistering) secondo il degrado vero calcolato oggi.

## Dati
- Nei dati dell'account (`users/<email>.app2`, elenco `USER_KEYS`): `theme` ({ mode: "team" | "custom", color }),
  `sounds`, `haptics`, `helmet`, `hidden`. Sul telefono anche una copia di `theme`, `sounds`, `haptics` per l'avvio e
  per l'ospite, e il primo avvio fatto.
- Categorie nuove delle notizie: METEO e TECNICA.

## Fuori da questa parte (dopo l'APK)
- Obiettivi e trofei, medaglia accanto al nome in chat e scheda con casco e trofei (scelte di Edoardo: C, C).
- Le altre funzioni che Edoardo manderà.
- Della Tappa 1: revisione della Fase D, regole di Firebase (Task 19) prima che la 2.0 vada a tutti, controllo finale
  (Task 20), pubblicità, Premium e foto (rimandati).

## Come si prova
- Prove nel browser (Playwright) per ogni scelta G01-G28, con le frasi esatte e gli stati (per esempio: colore dei
  tasti dopo la scelta, contrasto, semafori dopo una password sbagliata, notizia nascosta dopo lo swipe).
- Controllo a occhio con le schermate di ogni pagina nuova.
- Alla fine tutte le prove (`bash test/all.sh`), un revisore nuovo su tutto il lavoro, poi l'APK di prova.
