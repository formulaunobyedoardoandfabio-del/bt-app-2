# Icone che si possono scegliere nell'app (22/11, Edoardo: "le icone disponibili sono quella attuale e allegato 1 e il
# secondo è la stessa versione light ... 3 auto dettagliata, 4 3D, 5 on track, dalla 6 in poi in base al team preferito").
# Uso: python3 -I tools/icon/make-alt-icons.py  (legge tools/icon/alt/<id>.png|jpg, scrive resources/app-icons e public/app-icons)
# Per ogni icona e densità:
# - ic_bt_<id>.png e ic_bt_<id>_round.png (Android 7 e prima): l'immagine intera, la rotonda tagliata a cerchio;
# - ic_bt_<id>_fg.png (icona adattiva, Android 8+): l'immagine a tutto il livello di 108 dp (la maschera del telefono ne
#   tiene i 72 dp centrali, dove sta il logo); sotto, lo sfondo ic_bt_<id>_bg (il colore dell'angolo dell'immagine);
# - mipmap-anydpi-v26/ic_bt_<id>.xml e _round.xml, values/ic_bt_colors.xml.
# public/app-icons/<id>.png (192 px): le caselle della pagina "Icona dell'app".
# L'icona attuale ("classica") resta quella di resources/icons: qui se ne fa solo la casella.
import os, sys, glob
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, "tools", "icon", "alt")
OUT = os.path.join(ROOT, "resources", "app-icons")
WEB = os.path.join(ROOT, "public", "app-icons")
DENSITIES = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}

def square(path):
    img = Image.open(path).convert("RGB")
    side = min(img.size)
    return img.crop(((img.width - side) // 2, (img.height - side) // 2, (img.width + side) // 2, (img.height + side) // 2))

def round_icon(img, px):
    big = img.resize((px * 4, px * 4), Image.LANCZOS)
    mask = Image.new("L", big.size, 0)
    ImageDraw.Draw(mask).ellipse((0, 0, big.width - 1, big.height - 1), fill=255)
    rgba = big.convert("RGBA")
    rgba.putalpha(mask)
    return rgba.resize((px, px), Image.LANCZOS)

def corner(img):
    px = img.resize((64, 64), Image.LANCZOS).getpixel((2, 2))
    return "#%02X%02X%02X" % px

os.makedirs(WEB, exist_ok=True)
colors = []
ids = []
for path in sorted(glob.glob(os.path.join(SRC, "*.*"))):
    iid = os.path.splitext(os.path.basename(path))[0]
    img = square(path)
    ids.append(iid)
    colors.append((iid, corner(img)))
    for name, k in DENSITIES.items():
        d = os.path.join(OUT, "mipmap-" + name)
        os.makedirs(d, exist_ok=True)
        launcher, fg = round(48 * k), round(108 * k)
        img.resize((launcher, launcher), Image.LANCZOS).save(os.path.join(d, f"ic_bt_{iid}.png"), optimize=True)
        round_icon(img, launcher).save(os.path.join(d, f"ic_bt_{iid}_round.png"), optimize=True)
        img.resize((fg, fg), Image.LANCZOS).save(os.path.join(d, f"ic_bt_{iid}_fg.png"), optimize=True)
    any_dir = os.path.join(OUT, "mipmap-anydpi-v26")
    os.makedirs(any_dir, exist_ok=True)
    xml = ('<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
           f'    <background android:drawable="@color/ic_bt_{iid}_bg"/>\n    <foreground android:drawable="@mipmap/ic_bt_{iid}_fg"/>\n</adaptive-icon>\n')
    for suffix in ("", "_round"):
        open(os.path.join(any_dir, f"ic_bt_{iid}{suffix}.xml"), "w").write(xml)
    img.resize((192, 192), Image.LANCZOS).save(os.path.join(WEB, f"{iid}.png"), optimize=True)

vals = os.path.join(OUT, "values")
os.makedirs(vals, exist_ok=True)
with open(os.path.join(vals, "ic_bt_colors.xml"), "w") as f:
    f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n')
    for iid, c in colors:
        f.write(f'    <color name="ic_bt_{iid}_bg">{c}</color>\n')
    f.write("</resources>\n")
# casella dell'icona attuale
cur = os.path.join(ROOT, "resources", "icons", "mipmap-xxxhdpi", "ic_launcher.png")
Image.open(cur).convert("RGB").resize((192, 192), Image.LANCZOS).save(os.path.join(WEB, "classica.png"), optimize=True)
print("icone:", ", ".join(ids))
