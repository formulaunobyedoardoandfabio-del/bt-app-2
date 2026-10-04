"""Prepara il progetto Android generato da Capacitor per la build.

- aggiunge l'App ID di AdMob al manifest
- imposta versionCode dal numero di build di Codemagic
- se c'è un keystore (build di release), configura la firma
- copia l'icona dell'app (immagine B&T) al posto di quella di default
- con BT_ADMOB_TEST=1 (solo "B&T - APK di prova") accende gli annunci di prova di Google
"""
import os
import re
import shutil
import sys

MANIFEST = "android/app/src/main/AndroidManifest.xml"
GRADLE = "android/app/build.gradle"
WEB_INDEX = "android/app/src/main/assets/public/index.html"
ADMOB_APP_ID = "ca-app-pub-5787516371588469~8054706643"
ADMOB_TEST_FLAG = "<script>window.BT_ADMOB_TEST=true;</script>"

# ── ANNUNCI DI PROVA (solo APK di prova) ──
# L'app legge window.BT_ADMOB_TEST (vedi ADMOB_TEST in src/App.jsx): va scritto in cima
# alla pagina, prima dello script dell'app. La build del Play Store non lo imposta mai.
if os.environ.get("BT_ADMOB_TEST") == "1":
    if not os.path.isfile(WEB_INDEX):
        sys.exit(f"ERRORE: {WEB_INDEX} non trovato (npx cap sync non ha copiato l'app?)")
    page = open(WEB_INDEX, encoding="utf-8").read()
    if ADMOB_TEST_FLAG not in page:
        page, n = re.subn(r"(<head[^>]*>)", r"\1" + ADMOB_TEST_FLAG, page, count=1, flags=re.I)
        if not n:
            sys.exit(f"ERRORE: <head> non trovato in {WEB_INDEX}")
        open(WEB_INDEX, "w", encoding="utf-8").write(page)
    print("Annunci di prova di Google attivi (APK di prova)")

# ── ICONA APP (immagine B&T su sfondo blu al posto del robottino di default Capacitor) ──
ICON_SRC = "resources/icons"
RES_DIR = "android/app/src/main/res"
if os.path.isdir(ICON_SRC):
    copied = 0
    for density in os.listdir(ICON_SRC):
        src_dir = os.path.join(ICON_SRC, density)
        if not os.path.isdir(src_dir):
            continue
        dst_dir = os.path.join(RES_DIR, density)
        os.makedirs(dst_dir, exist_ok=True)
        for fname in os.listdir(src_dir):
            shutil.copyfile(os.path.join(src_dir, fname), os.path.join(dst_dir, fname))
            copied += 1
    # Sfondo blu dell'icona adattiva (Android 8+), lo stesso del bordo della nuova icona
    values_dir = os.path.join(RES_DIR, "values")
    os.makedirs(values_dir, exist_ok=True)
    with open(os.path.join(values_dir, "ic_launcher_background.xml"), "w") as f:
        f.write(
            '<?xml version="1.0" encoding="utf-8"?>\n'
            "<resources>\n"
            '    <color name="ic_launcher_background">#02184A</color>\n'
            "</resources>\n"
        )
    print(f"Icona B&T applicata ({copied} file copiati)")

manifest = open(MANIFEST).read()
if "com.google.android.gms.ads.APPLICATION_ID" not in manifest:
    manifest = manifest.replace(
        "</application>",
        '    <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" '
        f'android:value="{ADMOB_APP_ID}"/>\n    </application>',
        1,
    )
    open(MANIFEST, "w").write(manifest)
    print("AdMob App ID aggiunto al manifest")

gradle = open(GRADLE).read()
build_number = os.environ.get("BUILD_NUMBER")
if build_number and build_number.isdigit():
    gradle = re.sub(r"versionCode\s+\d+", f"versionCode {int(build_number)}", gradle)
    print(f"versionCode = {build_number}")

if os.environ.get("CM_KEYSTORE_PATH") and "signingConfigs.btRelease" not in gradle:
    gradle += """
android {
    signingConfigs {
        btRelease {
            storeFile file(System.getenv("CM_KEYSTORE_PATH"))
            storePassword System.getenv("CM_KEYSTORE_PASSWORD")
            keyAlias System.getenv("CM_KEY_ALIAS")
            keyPassword System.getenv("CM_KEY_PASSWORD")
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.btRelease
        }
    }
}
"""
    print("Firma di release configurata")

open(GRADLE, "w").write(gradle)
