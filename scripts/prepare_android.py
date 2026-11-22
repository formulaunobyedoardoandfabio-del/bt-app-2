"""Prepara il progetto Android generato da Capacitor per la build.

- aggiunge l'App ID di AdMob al manifest
- imposta versionCode dal numero di build di Codemagic
- se c'è un keystore (build di release), configura la firma
- copia l'icona dell'app (logo BT con la monoposto, "Sector 4") al posto di quella di default
- con BT_ADMOB_TEST=1 accende gli annunci di prova di Google ("B&T - APK di prova" e, finché c'è il
  test chiuso, anche "B&T - Play Store": vedi codemagic.yaml)
"""
import json
import os
import time
import re
import shutil
import sys

MANIFEST = "android/app/src/main/AndroidManifest.xml"
GRADLE = "android/app/build.gradle"
WEB_INDEX = "android/app/src/main/assets/public/index.html"
ADMOB_APP_ID = "ca-app-pub-5787516371588469~8054706643"
ADMOB_TEST_FLAG = "<script>window.BT_ADMOB_TEST=true;</script>"

# ── ANNUNCI DI PROVA (APK di prova e, per ora, test chiuso del Play Store) ──
# L'app legge window.BT_ADMOB_TEST (vedi ADMOB_TEST in src/App.jsx): va scritto in cima
# alla pagina, prima dello script dell'app. Senza la variabile l'app usa le unità vere.
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

# ── ICONA APP (logo BT con la monoposto su sfondo nero al posto del robottino di default Capacitor) ──
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
    # Sfondo nero dell'icona adattiva (Android 8+), come lo sfondo dell'icona (tools/icon/make-icons.py)
    values_dir = os.path.join(RES_DIR, "values")
    os.makedirs(values_dir, exist_ok=True)
    with open(os.path.join(values_dir, "ic_launcher_background.xml"), "w") as f:
        f.write(
            '<?xml version="1.0" encoding="utf-8"?>\n'
            "<resources>\n"
            '    <color name="ic_launcher_background">#000000</color>\n'
            "</resources>\n"
        )
    print(f"Icona di Sector 4 applicata ({copied} file copiati)")

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

# 21/11: Collega PC. Il lettore QR di Google (@capacitor-mlkit/barcode-scanning, scan()) non chiede il permesso della
# fotocamera; con questa riga Google Play scarica il suo modulo già all'installazione dell'app.
manifest = open(MANIFEST).read()
if "com.google.mlkit.vision.DEPENDENCIES" not in manifest:
    manifest = manifest.replace(
        "</application>",
        '    <meta-data android:name="com.google.mlkit.vision.DEPENDENCIES" android:value="barcode_ui"/>\n    </application>',
        1,
    )
    open(MANIFEST, "w").write(manifest)
    print("Lettore QR di Google (barcode_ui) aggiunto al manifest")

# 1/11: promemoria sul telefono (@capacitor/local-notifications): da Android 13 serve il permesso delle notifiche.
manifest = open(MANIFEST).read()
if "android.permission.POST_NOTIFICATIONS" not in manifest:
    manifest = manifest.replace("<application", '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />\n    <application', 1)
    open(MANIFEST, "w").write(manifest)
    print("Permesso POST_NOTIFICATIONS aggiunto al manifest")

gradle = open(GRADLE).read()
build_number = os.environ.get("BUILD_NUMBER")
if os.environ.get("CM_KEYSTORE_PATH"):
    # AAB per il Play Store: codice che cresce sempre (minuti dal 1/1/2020), più alto di quelli già caricati
    build_number = str(int((time.time() - 1577836800) // 60))
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

# ── NOTIFICHE (13/11): icona piccola bianca (bandiera a scacchi), rosso B&T, logo grande; Firebase per le push ──
# Icona e colore valgono per le notifiche del telefono (promemoria, Pit Swipe: capacitor.config.json → LocalNotifications)
# e per quelle del team mandate da Firebase Cloud Messaging (valori di serie nel manifest).
draw_dir = os.path.join(RES_DIR, "drawable")
os.makedirs(draw_dir, exist_ok=True)
with open(os.path.join(draw_dir, "ic_stat_bt.xml"), "w") as f:
    f.write(
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="24dp" android:height="24dp"'
        ' android:viewportWidth="24" android:viewportHeight="24">\n'
        '    <path android:fillColor="#FFFFFFFF" android:pathData="M4,2h2v20h-2z"/>\n'
        '    <path android:fillColor="#FFFFFFFF" android:pathData="M7,3h13v12h-13zM8.5,4.5v9h10v-9z"/>\n'
        '    <path android:fillColor="#FFFFFFFF" android:pathData="M8.5,4.5h3.3v3h-3.3zM15.2,4.5h3.3v3h-3.3zM11.8,7.5h3.4v3h-3.4zM8.5,10.5h3.3v3h-3.3zM15.2,10.5h3.3v3h-3.3z"/>\n'
        "</vector>\n"
    )
logo = os.path.join(ICON_SRC, "mipmap-xxhdpi", "ic_launcher.png")
if os.path.isfile(logo):
    shutil.copyfile(logo, os.path.join(draw_dir, "bt_logo.png"))
values_dir = os.path.join(RES_DIR, "values")
os.makedirs(values_dir, exist_ok=True)
with open(os.path.join(values_dir, "bt_notif.xml"), "w") as f:
    f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="bt_notif">#FF1801</color>\n</resources>\n')
manifest = open(MANIFEST).read()
if "default_notification_icon" not in manifest:
    manifest = manifest.replace(
        "</application>",
        '    <meta-data android:name="com.google.firebase.messaging.default_notification_icon" android:resource="@drawable/ic_stat_bt" />\n'
        '        <meta-data android:name="com.google.firebase.messaging.default_notification_color" android:resource="@color/bt_notif" />\n'
        '        <meta-data android:name="com.google.firebase.messaging.default_notification_channel_id" android:value="bt-novita" />\n'
        "    </application>",
        1,
    )
    open(MANIFEST, "w").write(manifest)
print("Icona e colore delle notifiche applicati")

# Firebase Cloud Messaging: serve resources/google-services.json (Firebase → Impostazioni progetto → app Android).
# Non è un segreto (come la configurazione web già nell'app). Si copia solo se è proprio di questa app: un file di
# un'altra app farebbe fallire la build. Senza file l'app funziona lo stesso, solo senza notifiche push.
GS = "resources/google-services.json"
push_on = False
if os.path.isfile(GS):
    try:
        app_id = json.load(open("capacitor.config.json"))["appId"]
        names = [c["client_info"]["android_client_info"]["package_name"] for c in json.load(open(GS)).get("client", [])]
    except Exception as e:
        app_id, names = None, []
        print(f"ATTENZIONE: {GS} non si legge ({e}): notifiche push spente")
    if app_id and app_id in names:
        shutil.copyfile(GS, "android/app/google-services.json")
        push_on = True
    elif app_id:
        print(f"ATTENZIONE: {GS} è per {names}, non per {app_id}: notifiche push spente")
else:
    print(f"ATTENZIONE: manca {GS}: notifiche push spente (il resto dell'app funziona)")
if push_on:
    ROOT_GRADLE = "android/build.gradle"
    rg = open(ROOT_GRADLE).read()
    if "com.google.gms:google-services" not in rg:
        rg = re.sub(r"(classpath\s+['\"]com\.android\.tools\.build:gradle:[^'\"]+['\"])", r"\1\n        classpath 'com.google.gms:google-services:4.4.2'", rg, count=1)
        open(ROOT_GRADLE, "w").write(rg)
    if "com.google.gms.google-services" not in gradle:
        gradle += "\napply plugin: 'com.google.gms.google-services'\n"
    print("Notifiche push (Firebase Cloud Messaging) configurate")

open(GRADLE, "w").write(gradle)

# ── PAGINE PROTETTE (30/10): nelle notizie niente screenshot, registrazioni né "Cerchia e cerca" ──
# Plugin nativo SecureScreen (set({ on })): accende o spegne FLAG_SECURE sulla finestra; con il flag acceso lo screenshot
# viene nero. Lo usa l'app (src/App.jsx) solo mentre è aperta una notizia.
JAVA_ROOT = "android/app/src/main/java"
main_act = None
for root, _, files in os.walk(JAVA_ROOT):
    if "MainActivity.java" in files:
        main_act = os.path.join(root, "MainActivity.java")
        break
if not main_act:
    sys.exit(f"ERRORE: MainActivity.java non trovato in {JAVA_ROOT}")
src = open(main_act, encoding="utf-8").read()
pkg = re.search(r"^package\s+([\w.]+)\s*;", src, flags=re.M)
if not pkg:
    sys.exit(f"ERRORE: package non trovato in {main_act}")
pkg = pkg.group(1)
open(os.path.join(os.path.dirname(main_act), "SecureScreenPlugin.java"), "w", encoding="utf-8").write(f"""package {pkg};

import android.view.WindowManager;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SecureScreen")
public class SecureScreenPlugin extends Plugin {{
    @PluginMethod
    public void set(PluginCall call) {{
        final boolean on = Boolean.TRUE.equals(call.getBoolean("on", false));
        getActivity().runOnUiThread(() -> {{
            if (on) getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
            else getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
            call.resolve();
        }});
    }}
}}
""")
if "SecureScreenPlugin" not in src:
    src, n = re.subn(
        r"public class MainActivity extends BridgeActivity\s*\{\s*\}",
        "public class MainActivity extends BridgeActivity {\n"
        "    @Override\n"
        "    public void onCreate(android.os.Bundle savedInstanceState) {\n"
        "        registerPlugin(SecureScreenPlugin.class);\n"
        "        super.onCreate(savedInstanceState);\n"
        "    }\n"
        "}",
        src,
    )
    if not n:
        sys.exit(f"ERRORE: MainActivity diversa da quella di Capacitor, SecureScreen non registrato ({main_act})")
    open(main_act, "w", encoding="utf-8").write(src)
print("Plugin SecureScreen aggiunto (notizie protette dagli screenshot)")

# ── 21/11 NFC: inviti in lega e collegamenti col tocco ──
# Plugin nativo BtNfc (lettura di tag e telefoni, condivisione di un link con l'emulazione di tag) + servizio BtHceService.
# I sorgenti sono modelli in resources/android-nfc/ con __PKG__ al posto del package di MainActivity.
NFC_SRC = "resources/android-nfc"
java_dir = os.path.dirname(main_act)
for name in ("BtNfcPlugin.java", "BtHceService.java"):
    tpl = open(os.path.join(NFC_SRC, name), encoding="utf-8").read()
    open(os.path.join(java_dir, name), "w", encoding="utf-8").write(tpl.replace("__PKG__", pkg))
xml_dir = os.path.join(RES_DIR, "xml")
os.makedirs(xml_dir, exist_ok=True)
shutil.copyfile(os.path.join(NFC_SRC, "apduservice.xml"), os.path.join(xml_dir, "bt_apduservice.xml"))
print("Plugin NFC (BtNfcPlugin, BtHceService, bt_apduservice.xml) copiato nel progetto")

# Registrazione in MainActivity, subito dopo SecureScreen
src = open(main_act, encoding="utf-8").read()
if "BtNfcPlugin" not in src:
    anchor = "registerPlugin(SecureScreenPlugin.class);"
    if anchor not in src:
        sys.exit(f"ERRORE: riga di SecureScreen non trovata in {main_act}, plugin NFC non registrato")
    src = src.replace(anchor, anchor + "\n        registerPlugin(BtNfcPlugin.class);", 1)
    open(main_act, "w", encoding="utf-8").write(src)
print("Plugin NFC registrato in MainActivity")

# Manifest: permessi, funzioni, servizio di emulazione e filtro per i link del sito
manifest = open(MANIFEST).read()
if "android.permission.NFC" not in manifest:
    manifest = manifest.replace(
        "<application",
        '<uses-permission android:name="android.permission.NFC" />\n'
        '    <uses-feature android:name="android.hardware.nfc" android:required="false" />\n'
        '    <uses-feature android:name="android.hardware.nfc.hce" android:required="false" />\n'
        "    <application",
        1,
    )
if "BtHceService" not in manifest:
    # Nome completo col package di MainActivity: il namespace del manifest potrebbe essere diverso
    manifest = manifest.replace(
        "</application>",
        f'    <service android:name="{pkg}.BtHceService" android:exported="true" '
        'android:permission="android.permission.BIND_NFC_SERVICE">'
        '<intent-filter><action android:name="android.nfc.cardemulation.action.HOST_APDU_SERVICE" /></intent-filter>'
        '<meta-data android:name="android.nfc.cardemulation.host_apdu_service" android:resource="@xml/bt_apduservice" />'
        "</service>\n    </application>",
        1,
    )
if "NDEF_DISCOVERED" not in manifest:
    manifest, n = re.subn(
        r'(<activity\b[^>]*android:name="[^"]*MainActivity"[^>]*>.*?)(</activity>)',
        lambda m: m.group(1)
        + '    <intent-filter><action android:name="android.nfc.action.NDEF_DISCOVERED" />'
        '<category android:name="android.intent.category.DEFAULT" />'
        '<data android:scheme="https" android:host="bt-app-2.vercel.app" /></intent-filter>\n        '
        + m.group(2),
        manifest,
        count=1,
        flags=re.S,
    )
    if not n:
        sys.exit(f"ERRORE: <activity> di MainActivity non trovata in {MANIFEST}")
if "android.permission.CAMERA" not in manifest:
    manifest = manifest.replace(
        "<application",
        '<uses-permission android:name="android.permission.CAMERA" />\n'
        '    <uses-feature android:name="android.hardware.camera" android:required="false" />\n'
        "    <application",
        1,
    )
open(MANIFEST, "w").write(manifest)
print("NFC e fotocamera (lettore QR) aggiunti al manifest")

# ── 22/11 SUONI DELLE NOTIFICHE (resources/sounds -> res/raw): bt_news (notizie), bt_gara (inizio e metà gara) ──
if os.path.isdir("resources/sounds"):
    raw = os.path.join(RES_DIR, "raw")
    os.makedirs(raw, exist_ok=True)
    for fname in os.listdir("resources/sounds"):
        shutil.copyfile(os.path.join("resources/sounds", fname), os.path.join(raw, fname))
    print("Suoni delle notifiche copiati in res/raw")

# ── 22/11 ICONA DELL'APP: si sceglie nell'app (Profilo > Personalizza l'app > Colori, icona e avvio) ──
# Ogni icona è un <activity-alias> di MainActivity con la sua icona: ne è acceso uno solo (di serie "classica", l'icona di
# resources/icons) e lo cambia il plugin BtIcon (resources/android-icon/BtIconPlugin.java). MainActivity non ha più la
# categoria LAUNCHER: la mettono gli alias. Le immagini sono in resources/app-icons (tools/icon/make-alt-icons.py); un'icona
# si aggiunge mettendo la sua immagine in tools/icon/alt e rifacendo le risorse (per esempio "agosto", l'icona dell'8 agosto).
ALT_ICONS = "resources/app-icons"
alt_ids = []
if os.path.isdir(ALT_ICONS):
    for density in os.listdir(ALT_ICONS):
        src_dir = os.path.join(ALT_ICONS, density)
        if not os.path.isdir(src_dir):
            continue
        dst_dir = os.path.join(RES_DIR, density)
        os.makedirs(dst_dir, exist_ok=True)
        for fname in os.listdir(src_dir):
            shutil.copyfile(os.path.join(src_dir, fname), os.path.join(dst_dir, fname))
            m = re.match(r"ic_bt_([a-z0-9]+)\.png$", fname)
            if density == "mipmap-xxxhdpi" and m:
                alt_ids.append(m.group(1))
alt_ids.sort()
tpl = open("resources/android-icon/BtIconPlugin.java", encoding="utf-8").read()
open(os.path.join(java_dir, "BtIconPlugin.java"), "w", encoding="utf-8").write(tpl.replace("__PKG__", pkg))
src = open(main_act, encoding="utf-8").read()
if "BtIconPlugin" not in src:
    anchor = "registerPlugin(BtNfcPlugin.class);"
    if anchor not in src:
        sys.exit(f"ERRORE: riga di BtNfc non trovata in {main_act}, plugin BtIcon non registrato")
    src = src.replace(anchor, anchor + "\n        registerPlugin(BtIconPlugin.class);", 1)
    open(main_act, "w", encoding="utf-8").write(src)

manifest = open(MANIFEST).read()
if "BtIcon_classica" not in manifest:
    act = re.search(r'<activity\b[^>]*android:name="([^"]*MainActivity)"[^>]*>.*?</activity>', manifest, flags=re.S)
    if not act:
        sys.exit(f"ERRORE: <activity> di MainActivity non trovata in {MANIFEST} (icone)")
    block = act.group(0)
    launcher = re.compile(r"\s*<intent-filter>(?:(?!</intent-filter>).)*?android\.intent\.category\.LAUNCHER(?:(?!</intent-filter>).)*?</intent-filter>", re.S)
    new_block, n = launcher.subn("", block, count=1)
    if not n:
        sys.exit("ERRORE: categoria LAUNCHER di MainActivity non trovata: senza toglierla ci sarebbero due icone")
    main_name = act.group(1)

    def alias(iid, on, icon, rnd):
        return (f'\n        <activity-alias android:name="{pkg}.BtIcon_{iid}" android:targetActivity="{main_name}" '
                f'android:enabled="{"true" if on else "false"}" android:exported="true" android:label="@string/app_name" '
                f'android:icon="{icon}" android:roundIcon="{rnd}">'
                '<intent-filter><action android:name="android.intent.action.MAIN" />'
                '<category android:name="android.intent.category.LAUNCHER" /></intent-filter></activity-alias>')

    aliases = alias("classica", True, "@mipmap/ic_launcher", "@mipmap/ic_launcher_round")
    for iid in alt_ids:
        aliases += alias(iid, False, f"@mipmap/ic_bt_{iid}", f"@mipmap/ic_bt_{iid}_round")
    manifest = manifest.replace(block, new_block + aliases, 1)
    open(MANIFEST, "w").write(manifest)
print(f"Icone dell'app: classica + {len(alt_ids)} da scegliere ({', '.join(alt_ids)}), plugin BtIcon registrato")
