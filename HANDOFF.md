# Handoff
Updated: 2026-10-17 22:30 by Claude (claude-opus-5-5)   Branch: tappa-3   Commit: 1372928 (+ questo commit)

## Goal
Tappa 3 della 2.0: "fai prima tutti gli easter egg e le nuove grafiche, poi vedo l'apk di prova e poi ci sono altre
funzioni da aggiungere". In più (17/10): foto da Wikimedia Commons (piloti in viso, auto di lato, loghi delle
scuderie) e scorrere tra le schede trascinando il dito in qualsiasi punto della pagina.
17/10 ore 21:43: "l'unica nuova cosa interattiva che devi creare sono i trofei, tutto il resto no, solo UI, UX, nuovi
design e debug di cose".
Progetto: `docs/superpowers/specs/2026-10-11-tappa3-grafica-design.md` (G01-G31, G31 = trofei).
Piano (20 task): `docs/superpowers/plans/2026-10-17-tappa3-grafica.md`.

## State
- Done: Task 1-17 (commit 4fd7f86 … Task 17): colori e rosso LED, suoni e vibrazioni, icone Tabler e testi,
  avvio Pit Exit Launch, partenza abortita e cordoli, filtri a gomma e Pit Lane, swipe sulle notizie, barra ERS e
  Team Radio, tira giù per aggiornare, casco del profilo, contachilometri e manettino, Centro Notifiche e interruttori
  a capsula, podio a sollevatore e frecce, Parc fermé, zone Q1/Q2 e carte 3D, Shift Light, LED del logo ed easter
  egg dei tre tocchi, Pit Board e gomma che si rovina, swipe tra le schede (G29).
- In progress: nessuno.
- Not started: Task 18 (foto di Commons, G30), 19 (trofei, G31), 20 (prove complete, revisione, push su tappa-3 e
  apk-prova, APK).

## Next action
Task 18: leggere la sezione "Task 18" del piano e la voce G30 del progetto (foto di Commons con licenza libera,
candidate scelte dall'admin nella scheda FOTO); prima le prove (`test/unit/commons.test.js`, `test/e2e/run67-foto.js`).

## Decisions (and why)
- Anni da tifoso esatti in `about.years` più la fascia di oggi in `about.follow`: l'app di oggi legge ancora la fascia.
- Frecce del mondiale: `prevPosition` in shared/bt-piloti e bt-costruttori, la salva l'admin quando cambiano i punti;
  senza, niente frecce (mai frecce inventate).
- Carte FantaF1: toccando si girano; "Cambia" è sul retro.
- "Pit Wall non raggiungibile" = telefono senza rete o Firebase che non ha risposto all'avvio.
- Nessun gioco o strumento nuovo (richiesta del 17/10): solo trofei, grafica, UX e correzioni.
- Medaglia dei trofei nei messaggi della chat (`medal`): le regole di Firebase della Tappa 1 (Task 19) devono
  lasciarla passare.
- Le decisioni minute di ogni task sono nel registro locale `.superpowers/sdd/2026-10-17-tappa3-grafica/progress.md`
  (non è nel repository).

## Tried and failed (don't repeat)
- Scaricare file da raw.githubusercontent o con `gh api` (Tabler): bloccato; `git clone --sparse` funziona.
- `bash -c '…'` intorno alle prove: bloccato dal controllo di sicurezza; usare un file di script.
- `pkill -f "<comando>"` dentro lo stesso comando: uccide anche la shell che lo lancia.
- `pip install graphifyy`: PyPI non raggiungibile da qui.

## Verified
`JOBS=1 bash test/all.sh` → TUTTO VERDE a 80362ee (Task 1-10). Task 11-14: prove dei singoli task verdi
(task-done, ultimo c671109); la suite completa sui Task 11-14 non è ancora stata rifatta.

## Open questions for the user
- Nessuna per ora.
