// 7/11 (Edoardo: "fai come dice il testo di Gemini", scelta B): post ufficiali di Instagram e X dentro l'app coi loro
// widget. Link incollato dall'admin nella notizia, striscia "DAI PROFILI UFFICIALI" in Home da public/data/social.json.
// Prima del tocco niente si carica da Instagram o X (privacy). Instagram e X qui sono finti (routes).
// Uso: node test/build-test.js && node test/e2e/run90-social.js [filtro]
const { open, w, text, has, tapText, tapSel, login, openAdmin, assert, run } = require('./helpers');

const IG = 'https://www.instagram.com/p/DAbc123xyz/';
const FEED = { v: 1, updated: '2026-10-07T09:00:00Z', posts: [
  { id: 'instagram:DAbc123xyz', net: 'instagram', url: IG, account: 'scuderiaferrari', date: '2026-10-07T08:00:00Z' },
  { id: 'x:1850000000000000009', net: 'x', url: 'https://x.com/F1/status/1850000000000000009', account: 'F1', date: '2026-10-07T07:30:00Z' },
], state: {} };
const X_STUB = "window.twttr={ready:function(f){f(window.twttr)},widgets:{createTweet:function(id,el){var d=document.createElement('div');d.setAttribute('data-fake-tweet',id);d.textContent='Post finto '+id;el.appendChild(d);return Promise.resolve(d);}}};";
// Instagram e X finti; si contano le richieste, per vedere che prima del tocco non parte niente.
function socialRoutes(hits, feed = FEED) {
  return {
    'https://www.instagram.com/**': route => { hits.push(route.request().url()); route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>Post finto di Instagram</body></html>' }); },
    'https://platform.twitter.com/**': route => { hits.push(route.request().url()); route.fulfill({ status: 200, contentType: 'application/javascript', body: X_STUB }); },
    'https://bt-app-2.vercel.app/data/social.json': route => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(feed) }),
  };
}
const doc = (p, path) => p.evaluate(x => window.firebase.__fake.doc(x), path);
const embed = p => p.evaluate(() => { const e = document.querySelector('[data-social-embed]'); if (!e) return null; const f = e.querySelector('iframe'); return { net: e.getAttribute('data-social-embed'), state: e.getAttribute('data-social-state'), src: f ? f.getAttribute('src') : null, tweet: (e.querySelector('[data-fake-tweet]') || {}).textContent || null }; });
async function publish(p, title, social) {
  await openAdmin(p, 'NEWS');
  await p.fill('#adTitle', title);
  await p.fill('#adSub', 'Il post ufficiale nella notizia');
  await p.fill('#adText', 'Primo paragrafo.');
  await p.fill('#adSocial', social);
  await tapText(p, 'PUBBLICA', { exact: true }); await w(p, 700);
}
const openArticle = async (p, title) => { await p.getByText(title).first().click(); await w(p, 700); };

run({
  async 'admin: link di Instagram nella notizia; nella notizia il post si carica solo dopo MOSTRA IL POST'(b) {
    const hits = [];
    const { ctx, p, errs } = await open(b, { routes: socialRoutes(hits) }); await login(p);
    await publish(p, 'Ferrari: il post del box', IG + '?utm_source=ig_web_copy_link');
    const saved = (await doc(p, 'shared/bt-news')).__arr[0];
    await openArticle(p, 'Ferrari: il post del box');
    const before = await embed(p), hitsBefore = hits.length, txt = await text(p);
    await tapSel(p, '[data-social-show]'); await w(p, 800);
    const after = await embed(p);
    await ctx.close();
    assert(saved && saved.social === IG, 'nella notizia salvata il link pulito: ' + JSON.stringify(saved && saved.social));
    assert(before && before.net === 'instagram' && before.state === 'off' && !before.src && hitsBefore === 0, 'prima del tocco niente da Instagram: ' + JSON.stringify({ before, hitsBefore }));
    assert(/Post su Instagram/.test(txt) && /MOSTRA IL POST/.test(txt) && /riceve l'indirizzo/.test(txt), 'il riquadro spiega cosa succede toccando');
    assert(after && after.src === IG + 'embed/', 'dopo il tocco l\'embed ufficiale di Instagram: ' + JSON.stringify(after));
    assert(!errs.length, errs.join(' | '));
  },

  async 'admin: un link che non è un post di Instagram o di X non si pubblica'(b) {
    const { ctx, p, errs } = await open(b); await login(p);
    await publish(p, 'Notizia col link sbagliato', 'https://www.instagram.com/scuderiaferrari/');
    const t = await text(p), news = ((await doc(p, 'shared/bt-news')) || { __arr: [] }).__arr;
    await ctx.close();
    assert(/Il link del post non va/.test(t), 'manca l\'errore del link');
    assert(!news.some(n => n.title === 'Notizia col link sbagliato'), 'la notizia col link sbagliato è stata pubblicata');
    assert(!errs.length, errs.join(' | '));
  },

  async 'post di X: widget ufficiale (widgets.js) col numero del post dopo il tocco'(b) {
    const hits = [];
    const seed = { addDocs: { 'shared/bt-news': { __arr: [{ id: 'n-x', title: 'Il post della F1', summary: 'Da X', category: 'NEWS', author: 'Team B&T', date: '2026-10-07T08:00:00Z', body: 'Testo.', published: true, social: 'https://x.com/F1/status/1850000000000000009' }] } } };
    const { ctx, p, errs } = await open(b, { seed, routes: socialRoutes(hits) }); await login(p);
    await openArticle(p, 'Il post della F1');
    const before = await embed(p), n0 = hits.length;
    await tapSel(p, '[data-social-show]'); await w(p, 900);
    const after = await embed(p);
    await ctx.close();
    assert(before && before.net === 'x' && before.state === 'off' && n0 === 0, 'prima del tocco niente da X: ' + JSON.stringify({ before, n0 }));
    assert(after && after.state === 'ok' && after.tweet === 'Post finto 1850000000000000009', 'dopo il tocco il widget di X: ' + JSON.stringify(after));
    assert(hits.some(u => /platform\.twitter\.com\/widgets\.js/.test(u)), 'widgets.js non chiesto');
    assert(!errs.length, errs.join(' | '));
  },

  async 'Home: striscia DAI PROFILI UFFICIALI dal file dei post; "Mostra sempre" carica anche i prossimi'(b) {
    const hits = [];
    const { ctx, p, errs } = await open(b, { routes: socialRoutes(hits) }); await login(p); await w(p, 600);
    const strip = await p.evaluate(() => { const s = document.querySelector('[data-social-strip]'); return s ? [...s.querySelectorAll('[data-social-card]')].map(c => c.innerText.replace(/\s+/g, ' ')) : null; });
    await tapSel(p, '[data-social-card="instagram:DAbc123xyz"]'); await w(p, 500);
    const sheet = await has(p, '[data-social-sheet]'), first = await embed(p);
    await tapSel(p, '[data-social-always]'); await w(p, 600);
    const loaded = await embed(p), auto = await p.evaluate(() => localStorage.getItem('bt_bt-social-auto'));
    await tapSel(p, '[aria-label="Chiudi"]'); await w(p, 400);
    await tapSel(p, '[data-social-card="x:1850000000000000009"]'); await w(p, 900);
    const second = await embed(p);
    await ctx.close();
    assert(strip && strip.length === 2 && /@scuderiaferrari/.test(strip[0]) && /Instagram/.test(strip[0]) && /@F1/.test(strip[1]), 'striscia: ' + JSON.stringify(strip));
    assert(sheet && first && first.state === 'off', 'toccando la scheda si apre il foglio col riquadro da toccare: ' + JSON.stringify(first));
    assert(loaded && loaded.src === IG + 'embed/' && auto === 'true', '"Mostra sempre" carica e lo ricorda: ' + JSON.stringify({ loaded, auto }));
    assert(second && second.state === 'ok', 'col "Mostra sempre" il post di X si carica da solo: ' + JSON.stringify(second));
    assert(!errs.length, errs.join(' | '));
  },

  async 'Home: senza post (file vuoto o senza rete) la striscia non c\'è'(b) {
    const { ctx, p, errs } = await open(b, { routes: socialRoutes([], { v: 1, updated: null, posts: [], state: {} }) }); await login(p); await w(p, 600);
    const strip = await has(p, '[data-social-strip]');
    await ctx.close();
    assert(!strip, 'striscia vuota visibile');
    assert(!errs.length, errs.join(' | '));
  },
});
