# Icone di Android dall'immagine dell'app (il logo BT con la monoposto, mandato da Edoardo il 10/10/2026).
# Uso: python3 -I tools/icon/make-icons.py immagine.jpg resources/icons
# - ic_launcher.png e ic_launcher_round.png (Android 7 e prima): l'immagine intera, quella rotonda tagliata a cerchio;
# - ic_launcher_foreground.png (icona adattiva, Android 8+): l'immagine occupa i 72 dp centrali dei 108 dp del livello,
#   così la maschera del telefono (cerchio, quadrato arrotondato…) non taglia né le lettere né le ruote; intorno è
#   trasparente e sotto c'è lo sfondo nero dell'icona adattiva (scripts/prepare_android.py);
# - playstore-icon-512.png: l'immagine intera a 512 px, RGBA (PNG a 32 bit come chiede Google Play).
# Il nero quasi nero dell'immagine (fino a 10 su 255) diventa nero vero, come lo sfondo dell'icona adattiva.
import os, sys
from PIL import Image, ImageDraw

src, out = sys.argv[1], sys.argv[2]
DENSITIES = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
img = Image.open(src).convert("RGB")
side = min(img.size)
img = img.crop(((img.width - side) // 2, (img.height - side) // 2, (img.width + side) // 2, (img.height + side) // 2))
img = img.point(lambda v: 0 if v <= 10 else v)

def scaled(px):
    return img.resize((px, px), Image.LANCZOS)

def round_icon(px):
    big = scaled(px * 4)
    mask = Image.new("L", big.size, 0)
    ImageDraw.Draw(mask).ellipse((0, 0, big.width - 1, big.height - 1), fill=255)
    rgba = big.convert("RGBA")
    rgba.putalpha(mask)
    return rgba.resize((px, px), Image.LANCZOS)

def foreground(px):
    layer = Image.new("RGBA", (px, px), (0, 0, 0, 0))
    inner = round(px * 72 / 108)
    off = (px - inner) // 2
    layer.paste(scaled(inner).convert("RGBA"), (off, off))
    return layer

for name, k in DENSITIES.items():
    d = os.path.join(out, "mipmap-" + name)
    os.makedirs(d, exist_ok=True)
    launcher, fg = round(48 * k), round(108 * k)
    scaled(launcher).save(os.path.join(d, "ic_launcher.png"), optimize=True)
    round_icon(launcher).save(os.path.join(d, "ic_launcher_round.png"), optimize=True)
    foreground(fg).save(os.path.join(d, "ic_launcher_foreground.png"), optimize=True)
scaled(512).convert("RGBA").save(os.path.join(out, "playstore-icon-512.png"), optimize=True)   # Google Play: PNG a 32 bit (con l'alfa)
print("icone fatte in", out)
