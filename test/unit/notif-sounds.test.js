// 22/11 (Edoardo: "suono predefinito per le notizie in generale" e "per le notizie metà gara o inizio"): canali Android
// col suono. Uso: node test/unit/notif-sounds.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const R = require('../../src/services/reminders');
let pass = 0, fail = 0;
const t = async (name, fn) => { try { await fn(); pass++; console.log('PASS  ' + name); } catch (e) { fail++; console.log('FAIL  ' + name + '\n      → ' + e.message); } };

(async () => {
  await t('due canali: notizie con l\'avvitatore, inizio e metà gara col fruscio F1; i file ci sono', () => {
    const dur = f => require('child_process').execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path.join(__dirname, '../../resources/sounds', f)]).toString().trim();
    try { assert(+dur('bt_news.ogg') < 2, 'bt_news deve essere l\'avvitatore (corto)'); assert(+dur('bt_gara.ogg') > 2, 'bt_gara deve essere il fruscio (lungo)'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    assert.deepStrictEqual(R.CHANNELS.map(c => [c.id, c.sound]), [['bt-news', 'bt_news.ogg'], ['bt-gara', 'bt_gara.ogg']]);
    for (const c of R.CHANNELS) assert(fs.existsSync(path.join(__dirname, '../../resources/sounds', c.sound)), 'manca ' + c.sound);
  });
  await t('ogni avviso va nel suo canale', () => {
    assert.strictEqual(R.look(R.ID.half).channelId, 'bt-gara');
    assert.strictEqual(R.look(R.ID.halfLive).channelId, 'bt-gara');
    assert.strictEqual(R.look(R.ID.session + 3).channelId, 'bt-gara');
    assert.strictEqual(R.look(R.ID.deck).channelId, 'bt-news');
    assert.strictEqual(R.look(R.ID.trial).channelId, 'bt-news');
  });
  await t('ensureChannels li crea col plugin; senza plugin non fa niente', async () => {
    const made = [];
    assert.strictEqual(await R.ensureChannels({ createChannel: async c => { made.push(c.id); } }), true);
    assert.deepStrictEqual(made, ['bt-news', 'bt-gara']);
    assert.strictEqual(await R.ensureChannels(null), false);
  });
  await t('le notifiche push usano il canale delle notizie', () => {
    assert.strictEqual(require('../../src/services/push').CHANNEL.id, 'bt-news');
    assert(/channel_id: "bt-news"/.test(fs.readFileSync(path.join(__dirname, '../../api/push.js'), 'utf8')));
  });
  console.log(`\n${pass} passati, ${fail} falliti`);
  process.exit(fail ? 1 : 0);
})();
