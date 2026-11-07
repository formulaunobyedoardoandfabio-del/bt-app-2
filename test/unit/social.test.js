// Prove dei post ufficiali di Instagram e X (src/logic/social.js, src/services/social.js, tools/social_sync.js).
// Uso: node test/unit/social.test.js
const assert = require('assert');
const S = require('../../src/logic/social');
const { createSocial } = require('../../src/services/social');
const Sync = require('../../tools/social_sync');

let pass = 0, fail = 0;
const queue = [];
const t = (name, fn) => queue.push([name, fn]);

t('link di Instagram: post, reel e link col nome del profilo diventano l\'indirizzo pulito e quello da incorporare', () => {
  const a = S.parseSocial('https://www.instagram.com/p/DAbc123_-x/?utm_source=ig_web_copy_link');
  assert.deepStrictEqual(a, { net: 'instagram', kind: 'p', code: 'DAbc123_-x', user: null, url: 'https://www.instagram.com/p/DAbc123_-x/', embed: 'https://www.instagram.com/p/DAbc123_-x/embed/' });
  const r = S.parseSocial('https://instagram.com/reel/C9xYz12AbC');
  assert.strictEqual(r.kind, 'reel');
  assert.strictEqual(r.embed, 'https://www.instagram.com/reel/C9xYz12AbC/embed/');
  const u = S.parseSocial('https://www.instagram.com/scuderiaferrari/p/DAbc123_-x/');
  assert.strictEqual(u.user, 'scuderiaferrari');
  assert.strictEqual(u.url, 'https://www.instagram.com/p/DAbc123_-x/');
});

t('link di X e di Twitter: si tengono profilo e numero del post', () => {
  const a = S.parseSocial('https://x.com/ScuderiaFerrari/status/1850000000000000001?s=46');
  assert.deepStrictEqual(a, { net: 'x', user: 'ScuderiaFerrari', id: '1850000000000000001', url: 'https://x.com/ScuderiaFerrari/status/1850000000000000001' });
  assert.strictEqual(S.parseSocial('https://twitter.com/F1/status/123456789012').net, 'x');
  assert.strictEqual(S.parseSocial('https://mobile.twitter.com/F1/status/123456789012').user, 'F1');
});

t('link che non sono post ufficiali incorporabili: niente', () => {
  for (const bad of ['', null, 42, 'http://www.instagram.com/p/DAbc123/', 'https://www.instagram.com/scuderiaferrari/', 'https://evil.com/p/DAbc123/',
    'https://x.com/F1', 'https://x.com/F1/status/abc', 'https://www.instagram.com.evil.com/p/DAbc123/', 'javascript:alert(1)', 'https://x.com/F1/status/123456789012/photo/1"onload=1'])
    assert.strictEqual(S.parseSocial(bad), null, String(bad));
});

t('elenco dei post: si tengono solo quelli validi, i più nuovi prima, niente doppioni, al massimo MAX e non troppo vecchi', () => {
  const now = Date.parse('2026-11-07T12:00:00Z');
  const old = [
    { net: 'instagram', url: 'https://www.instagram.com/p/AAAAA1/', account: 'f1', date: '2026-11-06T10:00:00Z' },
    { net: 'instagram', url: 'https://www.instagram.com/p/OLD001/', account: 'f1', date: '2026-10-01T10:00:00Z' },
    { net: 'x', url: 'https://x.com/F1/status/111111', account: 'F1', date: 'ieri' },
  ];
  const fresh = [
    { net: 'instagram', url: 'https://www.instagram.com/p/AAAAA1/?x=1', account: 'f1', date: '2026-11-06T10:00:00Z' },
    { net: 'x', url: 'https://x.com/F1/status/222222', account: 'F1', date: '2026-11-07T11:00:00Z' },
    { net: 'x', url: 'https://evil.com/F1/status/333333', account: 'F1', date: '2026-11-07T11:30:00Z' },
  ];
  const m = S.mergePosts(old, fresh, { now });
  assert.deepStrictEqual(m.map(p => p.id), ['x:222222', 'instagram:AAAAA1']);
  assert.strictEqual(m[1].url, 'https://www.instagram.com/p/AAAAA1/');
  const many = Array.from({ length: S.MAX_POSTS + 5 }, (_, i) => ({ net: 'x', url: 'https://x.com/F1/status/' + (900000 + i), account: 'F1', date: new Date(now - i * 60000).toISOString() }));
  assert.strictEqual(S.mergePosts([], many, { now }).length, S.MAX_POSTS);
});

t('il file dei post: validFeed accetta solo la forma giusta e cleanPosts butta il resto', () => {
  assert.strictEqual(S.validFeed({ v: 1, posts: [] }), true);
  assert.strictEqual(S.validFeed({ v: 2, posts: [] }), false);
  assert.strictEqual(S.validFeed({ posts: 'no' }), false);
  const c = S.cleanPosts([{ net: 'x', url: 'https://x.com/F1/status/123456', account: 'F1<script>', date: '2026-11-07T11:00:00Z' }, 'nope']);
  assert.strictEqual(c.length, 1);
  assert.strictEqual(c[0].account, 'F1');
});

t('servizio dell\'app: scarica social.json, lo tiene 15 minuti e senza rete usa quello salvato', async () => {
  let calls = 0, now = 1000;
  const mem = new Map();
  const store = { get: k => (mem.has(k) ? mem.get(k) : null), set: (k, v) => mem.set(k, v) };
  const feed = { v: 1, updated: '2026-11-07T11:00:00Z', posts: [{ net: 'x', id: 'x:222222', url: 'https://x.com/F1/status/222222', account: 'F1', date: '2026-11-07T11:00:00Z' }] };
  let online = true;
  const fetch = async url => { calls++; assert.strictEqual(url, 'https://bt-app-2.vercel.app/data/social.json'); if (!online) throw new Error('offline'); return { ok: true, json: async () => feed }; };
  const s = createSocial({ fetch, store, now: () => now });
  const a = await s.load();
  assert.strictEqual(a.length, 1);
  await s.load();
  assert.strictEqual(calls, 1);
  now += 16 * 60000; online = false;
  const b = await s.load();
  assert.strictEqual(calls, 2);
  assert.strictEqual(b.length, 1);
});

t('sync Instagram: Business Discovery di ogni profilo, link permalink e data con il fuso sistemato', async () => {
  const seen = [];
  const fetch = async url => {
    seen.push(url);
    if (url.includes('username(f1)')) return { ok: true, json: async () => ({ business_discovery: { username: 'f1', media: { data: [{ permalink: 'https://www.instagram.com/p/DAbc123/', timestamp: '2026-11-07T10:00:00+0000' }, { permalink: 'https://www.instagram.com/reel/DXyz987/', timestamp: '2026-11-07T09:00:00+0000' }] } } }) };
    return { ok: false, status: 400, json: async () => ({ error: { code: 110, message: 'Invalid user id' } }) };
  };
  const r = await Sync.fetchInstagram(['f1', 'nonesiste'], { userId: '178', token: 'tok', fetch });
  assert.strictEqual(r.posts.length, 2);
  assert.strictEqual(r.posts[0].date, '2026-11-07T10:00:00.000Z');
  assert.strictEqual(r.posts[0].account, 'f1');
  assert.strictEqual(r.errors.length, 1);
  assert.ok(seen[0].startsWith('https://graph.facebook.com/v25.0/178?fields=business_discovery.username(f1)'));
  assert.ok(seen[0].includes('access_token=tok'));
});

t('sync Instagram: con il token scaduto (codice 190) lo dice chiaro', async () => {
  const fetch = async () => ({ ok: false, status: 400, json: async () => ({ error: { code: 190, message: 'Error validating access token: Session has expired' } }) });
  const r = await Sync.fetchInstagram(['f1'], { userId: '178', token: 'tok', fetch });
  assert.strictEqual(r.expired, true);
});

t('sync X: profili cercati una volta sola, poi solo i post nuovi (since_id) e niente risposte né repost', async () => {
  const seen = [];
  const fetch = async (url, opt) => {
    seen.push(url);
    assert.strictEqual(opt.headers.Authorization, 'Bearer xb');
    if (url.includes('/users/by?')) return { ok: true, json: async () => ({ data: [{ id: '69008563', username: 'F1' }] }) };
    return { ok: true, json: async () => ({ data: [{ id: '1850000000000000009', created_at: '2026-11-07T11:00:00.000Z' }], meta: { newest_id: '1850000000000000009' } }) };
  };
  const state = {};
  const r = await Sync.fetchX(['F1'], { bearer: 'xb', fetch, state });
  assert.strictEqual(r.posts.length, 1);
  assert.strictEqual(r.posts[0].url, 'https://x.com/F1/status/1850000000000000009');
  assert.deepStrictEqual(state.F1, { id: '69008563', since: '1850000000000000009' });
  assert.ok(seen[1].includes('exclude=retweets%2Creplies') && !seen[1].includes('since_id'));
  seen.length = 0;
  await Sync.fetchX(['F1'], { bearer: 'xb', fetch, state });
  assert.strictEqual(seen.length, 1);
  assert.ok(seen[0].includes('since_id=1850000000000000009'));
});

t('sync: senza chiavi non tocca niente; con Instagram scrive social.json solo se i post cambiano', async () => {
  const files = new Map([['public/data/social.json', JSON.stringify({ v: 1, updated: 'x', posts: [], state: {} })]]);
  const io = { read: p => (files.has(p) ? files.get(p) : null), write: (p, s) => files.set(p, s) };
  const now = () => Date.parse('2026-11-07T12:00:00Z');
  const none = await Sync.run({ env: {}, fetch: async () => { throw new Error('non deve chiamare'); }, io, now, accounts: { instagram: ['f1'], x: ['F1'] } });
  assert.strictEqual(none.changed, false);
  const fetch = async () => ({ ok: true, json: async () => ({ business_discovery: { media: { data: [{ permalink: 'https://www.instagram.com/p/DAbc123/', timestamp: '2026-11-07T10:00:00+0000' }] } } }) });
  const one = await Sync.run({ env: { IG_USER_ID: '1', IG_TOKEN: 't' }, fetch, io, now, accounts: { instagram: ['f1'], x: [] } });
  assert.strictEqual(one.changed, true);
  const saved = JSON.parse(files.get('public/data/social.json'));
  assert.strictEqual(saved.posts.length, 1);
  assert.ok(S.validFeed(saved));
  const two = await Sync.run({ env: { IG_USER_ID: '1', IG_TOKEN: 't' }, fetch, io, now, accounts: { instagram: ['f1'], x: [] } });
  assert.strictEqual(two.changed, false);
});

(async () => {
  for (const [name, fn] of queue) {
    try { await fn(); pass++; console.log('PASS  ' + name); } catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); }
  }
  console.log(`\n${pass} passati, ${fail} falliti`);
  process.exit(fail ? 1 : 0);
})();
