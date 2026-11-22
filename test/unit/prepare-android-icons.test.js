// 22/11 (icona dell'app che si sceglie): scripts/prepare_android.py su un progetto Android finto, come lo crea Capacitor.
// Controlla che MainActivity perda la categoria LAUNCHER, che ci sia un alias per icona (acceso solo "classica"), che le
// risorse ci siano e che il plugin BtIcon sia registrato. Uso: node test/unit/prepare-android-icons.test.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bt-android-'));
const cp = (rel) => fs.cpSync(path.join(ROOT, rel), path.join(tmp, rel), { recursive: true });
['scripts', 'resources', 'capacitor.config.json'].forEach(cp);
const main = path.join(tmp, 'android/app/src/main');
fs.mkdirSync(path.join(main, 'java/it/bt/app'), { recursive: true });
fs.mkdirSync(path.join(main, 'res'), { recursive: true });
fs.writeFileSync(path.join(main, 'AndroidManifest.xml'), `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application android:allowBackup="true" android:icon="@mipmap/ic_launcher" android:label="@string/app_name">
        <activity
            android:configChanges="orientation|keyboardHidden"
            android:name=".MainActivity"
            android:label="@string/title_activity_main"
            android:launchMode="singleTask"
            android:exported="true">

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>

        </activity>
    </application>
</manifest>
`);
fs.writeFileSync(path.join(main, 'java/it/bt/app/MainActivity.java'), 'package it.bt.app;\n\nimport com.getcapacitor.BridgeActivity;\n\npublic class MainActivity extends BridgeActivity {}\n');
fs.writeFileSync(path.join(tmp, 'android/app/build.gradle'), 'android {\n    defaultConfig {\n        versionCode 1\n    }\n}\n');
fs.writeFileSync(path.join(tmp, 'android/build.gradle'), "buildscript { dependencies { classpath 'com.android.tools.build:gradle:8.7.2' } }\n");

let out;
try {
  out = execFileSync('python3', ['-I', 'scripts/prepare_android.py'], { cwd: tmp, encoding: 'utf8', env: { ...process.env, BT_ADMOB_TEST: '' } });
} catch (e) {
  console.log('FAIL  prepare_android.py\n      → ' + (e.stdout || '') + (e.stderr || ''));
  process.exit(1);
}
const man = fs.readFileSync(path.join(main, 'AndroidManifest.xml'), 'utf8');
const act = man.match(/<activity\b[\s\S]*?<\/activity>/)[0];
const aliases = [...man.matchAll(/<activity-alias\b[^>]*android:name="it\.bt\.app\.BtIcon_([a-z0-9]+)"[^>]*android:enabled="(true|false)"[^>]*>/g)].map(m => ({ id: m[1], on: m[2] === 'true' }));
const icons = fs.readdirSync(path.join(ROOT, 'tools/icon/alt')).map(f => f.replace(/\.[a-z]+$/, '')).sort();
const tests = {
  'MainActivity senza LAUNCHER (resta il filtro NFC)': () => {
    assert(!/category\.LAUNCHER/.test(act), act);
    assert(/NDEF_DISCOVERED/.test(act), 'filtro NFC sparito');
  },
  'un alias per icona, acceso solo "classica", tutti col LAUNCHER': () => {
    assert.deepStrictEqual(aliases.map(a => a.id).sort(), ['classica', ...icons].sort());
    assert.deepStrictEqual(aliases.filter(a => a.on).map(a => a.id), ['classica']);
    assert.strictEqual((man.match(/category\.LAUNCHER/g) || []).length, aliases.length);
    assert(man.indexOf('</activity>') < man.indexOf('<activity-alias'), 'gli alias vanno dopo MainActivity');
  },
  'risorse delle icone e colore di sfondo': () => {
    for (const id of icons) {
      for (const f of [`mipmap-xxxhdpi/ic_bt_${id}.png`, `mipmap-xxxhdpi/ic_bt_${id}_round.png`, `mipmap-mdpi/ic_bt_${id}_fg.png`, `mipmap-anydpi-v26/ic_bt_${id}.xml`]) {
        assert(fs.existsSync(path.join(main, 'res', f)), 'manca ' + f);
      }
      assert(fs.readFileSync(path.join(main, 'res/values/ic_bt_colors.xml'), 'utf8').includes(`ic_bt_${id}_bg`), 'colore ' + id);
    }
  },
  'plugin BtIcon col package giusto e registrato': () => {
    const plug = fs.readFileSync(path.join(main, 'java/it/bt/app/BtIconPlugin.java'), 'utf8');
    assert(/^package it\.bt\.app;/.test(plug));
    assert(/registerPlugin\(BtIconPlugin\.class\)/.test(fs.readFileSync(path.join(main, 'java/it/bt/app/MainActivity.java'), 'utf8')));
  },
  'rifatto due volte non aggiunge niente': () => {
    execFileSync('python3', ['-I', 'scripts/prepare_android.py'], { cwd: tmp, encoding: 'utf8' });
    const again = fs.readFileSync(path.join(main, 'AndroidManifest.xml'), 'utf8');
    assert.strictEqual((again.match(/<activity-alias/g) || []).length, aliases.length);
  },
};
let ok = 0, ko = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); ok++; console.log('PASS  ' + name); } catch (e) { ko++; console.log('FAIL  ' + name + '\n      → ' + e.message.slice(0, 400)); }
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${ok} passati, ${ko} falliti`);
process.exit(ko ? 1 : 0);
