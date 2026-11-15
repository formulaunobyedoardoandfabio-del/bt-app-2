// 15/11 (Edoardo): "fai in modo che le immagini a seconda della loro dimensione vengano scaricate in qualità inferiore
// o normale a seconda della dimensione che devono ricoprire". Miniature delle liste: copia "s" (400 px), ultima notizia:
// copia "m" (800 px), notizia aperta: la foto intera (1080 px). Foto di prima (senza copie): le fa il telefono e le
// tiene; foto nuove: l'admin carica anche le copie (shared/img-<id>-s e -m). Livelli: test/unit/imgstore.test.js.
// Uso: node test/build-test.js && node test/e2e/run123-foto-leggere.js [filtro]
const fs = require('fs'), os = require('os'), path = require('path');
const { open, w, tapSel, login, openAdmin, assert, run } = require('./helpers');
const FOTO = require('../fixtures/foto-1080.json');

const art = (id, img, hoursAgo) => ({ id, title: 'Notizia di prova ' + id, summary: 'Riassunto ' + id, content: 'Testo della notizia ' + id + '.', category: 'F1', author: 'Redazione', date: new Date(Date.parse('2026-10-03T10:00:00Z') - hoursAgo * 3600e3).toISOString(), image: img, published: true, premium: false, drivers: [], teams: [], circuits: [] });
const SEED = { addDocs: {
  'shared/bt-news': { __arr: [art(901, 'fsimg:foto1', 1), art(902, 'fsimg:foto2', 3)] },
  'shared/img-foto1': { data: FOTO.data, ts: 1 }, 'shared/img-foto2': { data: FOTO.data, ts: 1 },
} };
// larghezza vera (in pixel della foto) di un'immagine sullo schermo
const natural = (p, sel) => p.evaluate(async s => {
  const el = document.querySelector(s); if (!el) return null;
  const src = el.currentSrc || el.src; if (!src) return null;
  const i = new Image(); i.src = src; await i.decode().catch(() => {});
  return { w: i.naturalWidth, kb: Math.round(src.length / 1024) };
}, sel);
const waitImg = async (p, sel) => { for (let k = 0; k < 30 && !(await p.$(sel)); k++) await w(p, 200); };

run({
  async 'foto di prima: lista con la copia "s", ultima notizia con la "m", notizia aperta con la foto intera'(b) {
    const { ctx, p } = await open(b, { seed: SEED });
    await login(p); await w(p, 800);
    await waitImg(p, '[data-featured] [data-news-img]'); await waitImg(p, '[data-news-item="902"] [data-news-img]');
    const hero = await natural(p, '[data-featured] [data-news-img]');
    const row = await natural(p, '[data-news-item="902"] [data-news-img]');
    await w(p, 600);
    const kept = await p.evaluate(() => new Promise(res => {
      const r = indexedDB.open('bt-img', 1);
      r.onsuccess = () => { const q = r.result.transaction('foto').objectStore('foto').getAllKeys(); q.onsuccess = () => res(q.result); q.onerror = () => res([]); };
      r.onerror = () => res([]);
    }));
    await tapSel(p, '[data-news-item="902"]'); await w(p, 1200);
    const full = await p.evaluate(async () => {
      const el = [...document.querySelectorAll('img')].find(i => i.src && i.src.startsWith('data:image') && i.getBoundingClientRect().width > 300);
      if (!el) return null; const i = new Image(); i.src = el.src; await i.decode().catch(() => {}); return { w: i.naturalWidth };
    });
    await ctx.close();
    assert(row && row.w <= 400 && row.w >= 300, 'miniatura della lista: copia leggera (400 px): ' + JSON.stringify(row));
    assert(hero && hero.w <= 800 && hero.w > 400, 'ultima notizia: copia media (800 px): ' + JSON.stringify(hero));
    assert(row.kb < FOTO.data.length / 1024 / 4, 'la miniatura pesa molto meno della foto intera: ' + row.kb + ' KB');
    assert(kept.includes('fsimg:foto2-s') && kept.includes('fsimg:foto1-m'), 'le copie leggere restano sul telefono: ' + JSON.stringify(kept));
    assert(full && full.w === 1080, 'notizia aperta: la foto intera: ' + JSON.stringify(full));
  },

  async 'foto nuova dell\'admin: con la foto vanno su anche le copie leggere'(b) {
    const file = path.join(os.tmpdir(), 'bt-foto-1080.jpg');
    fs.writeFileSync(file, Buffer.from(FOTO.data.split(',')[1], 'base64'));
    const { ctx, p } = await open(b);
    await login(p); await w(p, 600);
    await openAdmin(p, 'NEWS'); await w(p, 400);
    await p.setInputFiles('#adImg', file); await w(p, 3000);
    const docs = await p.evaluate(async () => {
      const f = window.firebase.__fake, out = {};
      const ids = Object.keys(f.docs()).filter(k => /^shared\/img-/.test(k));
      for (const k of ids) {
        const d = f.doc(k); if (!d || !d.data) continue;
        const i = new Image(); i.src = d.data; await i.decode().catch(() => {});
        out[k.replace(/^shared\/img-[^-]+/, 'img')] = i.naturalWidth;
      }
      return out;
    });
    await ctx.close();
    assert(docs.img === 1080 && docs['img-s'] === 320 && docs['img-m'] === 640, 'foto intera e copie s e m (lato lungo 400 e 800): ' + JSON.stringify(docs));
  },
});
