# Video dello splash

I tre video sono di Edoardo (10/10/2026): apertura, attesa che si ripete, finale con le lettere B e T che si aprono.
Nell'app stanno in `public/splash/` come WebM VP9, 720×1280, senza audio. L'app li usa in `SplashScreen` (`src/App.jsx`).

Come sono stati fatti (ffmpeg e Python con numpy e Pillow):

```bash
# apertura e attesa: 30 fotogrammi al secondo
ffmpeg -i apertura.mp4 -an -vf "scale=720:1280:flags=lanczos,fps=30" -c:v libvpx-vp9 -b:v 0 -crf 34 -deadline good -cpu-used 2 -row-mt 1 -pix_fmt yuv420p public/splash/intro.webm
ffmpeg -i attesa.mp4   -an -vf "scale=720:1280:flags=lanczos,fps=30" -c:v libvpx-vp9 -b:v 0 -crf 34 -deadline good -cpu-used 2 -row-mt 1 -pix_fmt yuv420p public/splash/loop.webm
# finale: dal fotogramma 40 si toglie lo screenshot dell'app che c'è nel video (diventa trasparente)
python3 -I tools/splash/outro.py finale.mp4 /tmp/fotogrammi
ffmpeg -framerate 24 -i /tmp/fotogrammi/f%03d.png -an -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 0 -crf 32 -deadline good -cpu-used 2 -row-mt 1 -auto-alt-ref 0 public/splash/outro.webm
```

Se cambia il video finale, vanno ricontrollati in `outro.py` il fotogramma in cui compare lo screenshot (`REVEAL`),
quello dopo cui è tutto trasparente (`LAST`) e, in `src/App.jsx`, `OUTRO_REVEAL_S` (= `REVEAL` / 24).
