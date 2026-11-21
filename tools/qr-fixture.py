# Matrici QR di riferimento dalla libreria Python "qrcode" (21/11), per provare src/logic/qr.js punto per punto.
# Modalità byte (un solo pezzo, optimize=0), correzione M, versione automatica, ogni maschera 0-7 e la maschera scelta
# da sola. Uso: pip install qrcode && python3 tools/qr-fixture.py  → test/fixtures/qr-python.json
import json, os
import qrcode
from qrcode.constants import ERROR_CORRECT_M, ERROR_CORRECT_L

TEXTS = ["https://bt-app-2.vercel.app/?collega=123456", "https://bt-app-2.vercel.app/?collega=987654", "Sector 4", "ciao"]
out = []
for text in TEXTS:
    for ecc_name, ecc in (("M", ERROR_CORRECT_M), ("L", ERROR_CORRECT_L)):
        for mask in list(range(8)) + [None]:
            qr = qrcode.QRCode(version=None, error_correction=ecc, border=0, mask_pattern=mask)
            qr.add_data(text.encode("utf-8"), optimize=0)
            qr.make(fit=True)
            rows = ["".join("1" if c else "0" for c in r) for r in qr.get_matrix()]
            out.append({"text": text, "ecc": ecc_name, "mask": mask, "version": qr.version, "rows": rows})
path = os.path.join(os.path.dirname(__file__), "..", "test", "fixtures", "qr-python.json")
with open(path, "w") as f:
    json.dump(out, f)
print(len(out), "matrici in", os.path.normpath(path))
