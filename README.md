# B&T App 2.0

App dei tifosi di Formula 1 di B&T (non ufficiale): notizie, FantaF1, chat tra tifosi, pagina Race con i dati veri, Garage con giochi e strumenti, la storia di B&T e il nostro Instagram.

È la versione 2.0 dell'app: l'interfaccia viene dall'anteprima 2.0 e restano gli stessi account, gli stessi dati Firebase, la stessa pubblicità e lo stesso Pannello Admin dell'app di oggi (repository `bt-app-flutter`).

## Com'è fatta
- `src/App.jsx`: tutte le schermate (React 18).
- `src/services/`: Firebase, account, chat, pubblicità, OpenF1, condivisione (moduli separati, provati anche con Node).
- `src/logic/` e `src/data/`: calcoli dei giochi e degli strumenti, dati veri 2026 (circuiti, Ghost Lap, guida dei tracciati, weekend di gara).
- `docs/`: progetto, piano di lavoro, regole di Firebase e guide.

## Come si prova (sul computer di sviluppo)
- `bash test/all.sh`: tutte le prove (Node e browser). I log completi finiscono in `test/logs/`.
- `node test/build-test.js`: costruisce la pagina di prova `test/e2e/test.html` con un Firebase finto, senza toccare i dati veri.

## Come si costruisce l'APK
Con Codemagic, come oggi: la build "B&T - APK di prova" parte da sola a ogni push sul ramo `main` (vedi `codemagic.yaml` e `docs/guida-codemagic.md`). Lo sviluppo si fa sul ramo `tappa-1` e si unisce a `main` solo quando è pronto.
