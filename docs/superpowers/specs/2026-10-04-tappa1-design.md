# B&T App: la 2.0 diventa l'app vera (Tappa 1)

Progetto del 4 ottobre 2026. Prima di toccare l'app serve il sì di Edoardo su questo progetto e poi sul piano di lavoro.

## Cosa ha deciso Edoardo
- **Grafica e funzioni:** tutta la 2.0 va nell'APK (Home, Garage con giochi e strumenti, FantaF1 nuovo, pagina Race, pagina del circuito, Ghost Lap, pagelle, Second Screen e mappa).
- **Parti vere da tenere:** restano gli stessi account e Firebase, la pubblicità, il Pannello Admin e le regole del Play Store.
- **Solo dati veri:** gli utenti non vedono simulazioni. La diretta simulata resta solo nel Pannello Admin, per fare prove.
- **Registrazione:** come ora nella 2.0, con "About you": che tifoso sei, da quanti anni segui la F1 e anno di nascita.
- **Pannello Admin:**
  - nell'archivio dei video highlights si possono mettere anche quelli delle gare passate, collegati alla loro gara;
  - le notizie si possono condividere e scaricare.
- **Foto:** niente foto ufficiali dei piloti né dei caschi. Edoardo manderà foto fatte con l'AI; finché non ci sono, compaiono le iniziali col colore della scuderia.
- **Second Screen e mappa:** restano. Per ora l'app non va sul Play Store, quindi i diritti non sono un problema adesso.
- **Team radio e Rilevatore di bluff:** usano OpenF1.
- **Repository:** si lavora in un nuovo repository GitHub di B&T. L'app di oggi resta com'è finché la nuova non è pronta.

## Cosa non c'è nella Tappa 1
- **Tappa 2:** voti e percentuali dei tifosi veri (pagelle, pilota del giorno, sondaggi, Silly Season, strategie della community).
- **Tappa 3:** dati veri che si scaricano da soli dopo ogni sessione (oggi sono già dentro l'app) e meteo vero.
- **Tappa 4:** diretta vera durante la sessione, con lo Sponsor OpenF1 (9,90 € al mese) e un piccolo server per il codice di accesso.

## Come è fatta
- **Nuovo repository `bt-app-2`:** stesso tipo di app di oggi (React, Capacitor, AdMob) e stesse librerie, nessuna nuova.
- **File:**
  - l'interfaccia arriva dalla 2.0;
  - accanto ci sono i servizi presi dall'app di oggi: Firebase, account, pubblicità, server Vercel per l'Admin;
  - nuovo servizio OpenF1;
  - i calcoli dei giochi e degli strumenti, già provati;
  - i dati veri 2026 (circuiti, Ghost Lap, guida dei tracciati, weekend di gara).
- **Firebase:** è lo stesso progetto di oggi, quindi gli stessi utenti e le stesse notizie. I dati nuovi vanno in documenti nuovi, così l'app di oggi continua a funzionare.
- **Codemagic:** si aggiunge una nuova app collegata al nuovo repository, con le stesse due build: "APK di prova" e "Play Store". Edoardo la crea con la mia guida passo passo.

## Dove si salvano le cose
| Cosa | Dove (Firebase) | Note |
|---|---|---|
| Account | `users` | come oggi, più "About you" |
| Notizie e foto delle notizie | `shared/bt-news` e foto | come oggi, più hashtag e sondaggio |
| Video highlights | `shared/bt-highlights` | nuovo; ogni video può essere collegato a una gara, anche passata |
| Calendario e stato delle gare | `shared/bt-races` | come oggi; la gara su LIVE accende la pagina Race con OpenF1 |
| Classifiche piloti e scuderie | come oggi | |
| Notifiche | `shared/bt-notifs` | come oggi |
| Chat, segnalazioni, sospensioni | come oggi | blocchi solo sul telefono, come oggi |
| Instagram | `shared/bt-ig-config` | come oggi |
| Foto dei piloti (AI) | `shared/bt-driver-photos` | nuovo; le carica l'Admin, una per pilota |
| Comunicati del mercato (Silly Season) | `shared/bt-silly-official` | nuovo |
| Radio "gomme" per il bluff | `shared/bt-bluff-<sessione>` | nuovo; l'Admin segna le radio di OpenF1 in cui un pilota parla di gomme |
| Preferiti, notizie salvate, notifiche, squadra Fanta, previsioni | `users` (il proprio account) | nuovo; ognuno vede solo i suoi |

## Sicurezza degli account (da sistemare nella Tappa 1)
- **Il problema di oggi:** le password sono salvate in chiaro su Firebase e l'app le confronta sul telefono. Anche il codice per cambiare la password sta su Firebase in chiaro. Chi conosce il trucco potrebbe leggere le password degli iscritti o cambiarle.
- **La soluzione:** Firebase Authentication con email e password. È gratis e non serve il piano Blaze.
  - Le password le custodisce Firebase, criptate.
  - L'email per cambiare la password la manda Firebase.
- **Gli account restano gli stessi:** al primo accesso con la nuova app, l'account passa da solo a Firebase Authentication con la stessa password, e la password in chiaro viene cancellata. Un account già passato non entra più nell'app vecchia, ma oggi l'app non è sul Play Store e la usano solo Edoardo e chi l'ha provata.
- **Regole di Firebase:** ognuno può leggere e modificare solo il proprio account. Notizie, gare, notifiche, highlights e foto le modifica solo l'account admin. Le regole vanno incollate nella console di Firebase: le preparo io, Edoardo le incolla.
- **Pannello Admin:** oltre al codice a 6 cifre, si apre solo con l'account admin, cioè l'email che sceglie Edoardo.

## Pagina Race con OpenF1
- **Quando una gara è su LIVE nel Pannello Admin,** l'app legge OpenF1 ogni 10 secondi.
- **Durante la sessione** OpenF1 gratis è bloccato. Compare "SESSIONE IN CORSO: i dati veri arrivano a fine sessione", come nell'app di oggi.
- **A fine sessione** arrivano i dati veri e si rivede la sessione:
  - classifica, distacchi, giri e settori colorati;
  - gomme e soste, direzione gara e meteo;
  - audio dei team radio.
- **Mappa e Second Screen:** usano gli stessi dati. La posizione delle vetture sulla pista si calcola dai tempi dei giri e dei settori.
- **Con lo Sponsor (Tappa 4)** lo stesso codice diventa la diretta vera.
- **Rilevatore di bluff:** le radio sono quelle vere di OpenF1, con l'audio. L'Admin segna quelle in cui il pilota si lamenta delle gomme e il rilevatore confronta i tempi dei giri prima e dopo. Senza radio segnate, la scheda spiega come funziona.

## Cosa cambia rispetto alla 2.0
- **Foto:** iniziali col colore della scuderia finché l'Admin non carica le foto AI.
- **Community:** i propri voti si salvano nell'account, ma medie e percentuali degli altri tifosi non si vedono fino alla Tappa 2 (niente numeri inventati).
- **Premium, pubblicità e FantaF1 come nell'app di oggi:**
  - Premium gratis per tutti, con "Premium in arrivo";
  - banner in Home e in fondo alla pagina Race;
  - FantaF1 chiuso fino a fine stagione, con l'anteprima dopo un video.
- **Diretta simulata:** solo nel Pannello Admin ("Prova diretta"), con la scritta DEMO.

## Prove prima di dire che è pronta
- **Calcoli:** le prove dei calcoli come oggi (degrado, strategie, compagni, assetto, bluff, Ghost Lap, regole del Fanta).
- **Prove nel browser come per la 2.0:**
  - accesso e registrazione con "About you";
  - passaggio dell'account a Firebase Authentication;
  - notizie da condividere e scaricare;
  - highlights collegati alle gare passate e caricamento delle foto dei piloti dall'Admin;
  - chat e moderazione;
  - pagina Race con OpenF1, sia durante il blocco sia nel rivedere la sessione;
  - radio del bluff segnate dall'Admin;
  - FantaF1 chiuso con l'anteprima;
  - Garage, Tracciati e Ghost Lap.
- **Prove con OpenF1:** il servizio OpenF1 si prova con dati veri presi da TracingInsights e messi nella stessa forma di OpenF1.
- **Prova finale sul telefono:** Edoardo installa l'APK di prova da Codemagic e controlla la gara di oggi a Sepang.

## Rischi da sapere
- **Foto fatte con l'AI che mostrano piloti veri:** possono comunque creare problemi di diritto all'immagine se l'app diventa pubblica. Per l'APK di prova vanno bene.
- **Dati F1 in un'app con pubblicità:** OpenF1 e la telemetria delle gare richiedono un permesso prima del Play Store.
- **Firebase Authentication:** non funziona finché Edoardo non lo accende nella console di Firebase. È un interruttore, con la mia guida.
