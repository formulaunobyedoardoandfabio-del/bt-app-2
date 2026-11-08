# Legge davvero il codice a barre di una ricevuta del Premium (8/11): PDF → immagine (pdftoppm) → lettore zxing-cpp.
# Serve a provare che il codice a barre è vero e porta il numero d'ordine giusto.
# Uso: pip install zxing-cpp pillow; python3 tools/scan-receipt.py ricevuta.pdf [numero-atteso]
import subprocess, sys, tempfile, os
import zxingcpp
from PIL import Image

pdf = sys.argv[1]
want = sys.argv[2] if len(sys.argv) > 2 else None
with tempfile.TemporaryDirectory() as d:
    base = os.path.join(d, 'r')
    subprocess.run(['pdftoppm', '-png', '-r', '300', '-singlefile', pdf, base], check=True)
    found = zxingcpp.read_barcodes(Image.open(base + '.png'))
text = [(r.format.name, r.text) for r in found]
print(text)
if want is not None:
    ok = any(t == want for _, t in text)
    print('OK' if ok else 'NON LETTO')
    sys.exit(0 if ok else 1)
