# Sector 4 (B&T App 2.0): istruzioni per tutte le AI

App di tifosi di Formula 1 in italiano: React in un solo file (`src/App.jsx`), servizi in `src/services`, calcoli in
`src/logic`, APK Android con Capacitor 8. Chi la usa (Edoardo) non scrive codice: prova l'APK sul telefono.

## Handoff protocol (all AIs)
- Before any work: read HANDOFF.md (and TASKS.md if present), run `git log --oneline -10` and `git status`.
- Re-run the command in HANDOFF.md "Verified" before building on it.
- After every finished step: update HANDOFF.md, then commit only the files you changed (`git add <paths>`).
- Never undo another AI's work without writing why in HANDOFF.md.

## Regole del progetto
- Testi dell'app in italiano; niente "—" nei testi, niente emoji nei titoli. Commit in italiano.
- Nessun segreto nei file o nei commit (chiavi Stripe, OpenAI, account di servizio Firebase, password del keystore).
- Solo dati veri nelle schermate: niente numeri inventati.
- Animazioni solo con `transform` e `opacity`; con "Rimuovi animazioni" (prefers-reduced-motion) ferme o brevi.
- Prima di ogni commit: `node tools/check.js src/App.jsx` → `SYNTAX OK`; `node tools/sem.js src/App.jsx` →
  `total unique 0`; `node --check` sui `.js` cambiati.
- Prove: `node test/build-test.js` poi `node test/e2e/<prova>.js` (browser) o `node test/unit/<prova>.test.js`;
  tutte: `JOBS=1 bash test/all.sh`. Nessuna prova si cancella.
- APK di prova: `git push origin <ramo>:refs/heads/apk-prova` fa partire il workflow di GitHub.
