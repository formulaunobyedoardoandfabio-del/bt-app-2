// Foto da Wikimedia Commons (Tappa 3, G30; prove in test/unit/commons.test.js). Per ogni file l'app legge da Commons
// l'anteprima ridotta (480 px), la pagina del file, l'autore e la licenza: la foto si usa solo con CC0, pubblico dominio,
// CC BY o CC BY-SA (mai NC o ND, mai fair use). Una richiesta all'API per al massimo 50 file; i risultati restano
// 7 giorni sul telefono (local). Senza rete, o se Commons non risponde, il risultato è null e nessun errore.
const API = "https://commons.wikimedia.org/w/api.php";
const TTL = 7 * 24 * 3600e3, CHUNK = 50, CACHE_KEY = "bt-commons-cache";

// m: extmetadata di Commons ({ License, LicenseShortName }, solo i valori).
function licenseFree(m) {
  const code = String((m && m.License) || "").toLowerCase().trim(), short = String((m && m.LicenseShortName) || "").toLowerCase().trim();
  const s = code || short, all = code + " " + short;
  if (!s) return false;
  if (/(^|[^a-z])nc([^a-z]|$)|non.?commercial|(^|[^a-z])nd([^a-z]|$)|no.?deriv|fair.?use/.test(all)) return false;
  return /^(cc0|pd\b|pd-|public domain)/.test(s) || /^cc[- ]by([- ]sa)?([- ]\d|$)/.test(s);
}

const ENT = { nbsp: " ", amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", "#39": "'" };
const stripHtml = s => String(s == null ? "" : s).replace(/<[^>]*>/g, " ").replace(/&(nbsp|amp|quot|apos|lt|gt|#39);/g, (m, k) => ENT[k]).replace(/\s+/g, " ").trim();

// "File:Nome.jpg" da un link di Commons (…/wiki/File:Nome_del_file.jpg) o da un nome (con o senza "File:"); null se no.
function normFile(s) {
  let x = String(s == null ? "" : s).trim();
  if (!x) return null;
  if (/^https?:\/\//i.test(x)) {
    let u;
    try { u = new URL(x); } catch (e) { return null; }
    if (!/(^|\.)wikimedia\.org$|(^|\.)wikipedia\.org$/i.test(u.hostname)) return null;
    const t = u.searchParams.get("title");
    const m = /\/wiki\/(.+)$/.exec(u.pathname);
    x = t || (m ? m[1] : "");
    try { x = decodeURIComponent(x); } catch (e) { return null; }
  }
  x = x.replace(/_/g, " ").replace(/^(file|image|immagine):\s*/i, "").trim();
  if (!x || !/\.(jpe?g|png|svg|webp|gif|tiff?)$/i.test(x)) return null;
  return "File:" + x;
}

function infoOf(page) {
  const ii = page && Array.isArray(page.imageinfo) ? page.imageinfo[0] : null;
  if (!ii || page.missing !== undefined) return null;
  const em = ii.extmetadata || {}, v = k => (em[k] && em[k].value != null ? String(em[k].value) : "");
  const meta = { License: v("License"), LicenseShortName: stripHtml(v("LicenseShortName")) };
  const d = /\d{4}-\d{2}-\d{2}/.exec(stripHtml(v("DateTimeOriginal")) || v("DateTime"));
  return {
    thumb: ii.thumburl || ii.url || null, page: ii.descriptionurl || null,
    author: stripHtml(v("Artist")) || null, license: meta.LicenseShortName || meta.License || null,
    free: licenseFree(meta), date: d ? d[0] : null,
  };
}

function createCommons({ fetchImpl = (typeof fetch === "function" ? (...a) => fetch(...a) : null), now = () => Date.now(), local = null } = {}) {
  const mem = {};
  const readCache = () => { try { const c = local && local.get(CACHE_KEY); return c && typeof c === "object" ? c : {}; } catch (e) { return {}; } };
  const writeCache = c => { try { if (local) local.set(CACHE_KEY, c); } catch (e) {} };

  async function fetchChunk(titles) {
    const url = API + "?action=query&format=json&prop=imageinfo&iiprop=url%7Cextmetadata&iiurlwidth=480&origin=*&titles=" + encodeURIComponent(titles.join("|"));
    try {
      const r = await fetchImpl(url);
      if (!r || !r.ok) return null;
      const body = await r.json();
      const q = (body && body.query) || {};
      const alias = {};
      (q.normalized || []).forEach(n => { alias[n.from] = n.to; });
      const byTitle = {};
      Object.values(q.pages || {}).forEach(p => { if (p && p.title) byTitle[p.title] = p; });
      const out = {};
      titles.forEach(t => { out[t] = infoOf(byTitle[alias[t] || t] || null); });
      return out;
    } catch (e) { return null; }
  }

  // files: ["File:…"] → { file: { thumb, page, author, license, free, date } | null }
  async function info(files) {
    const list = [...new Set((files || []).filter(f => typeof f === "string" && f))];
    const out = {}, t = now(), cache = readCache(), todo = [];
    list.forEach(f => {
      const c = mem[f] || cache[f];
      if (c && t - c.at < TTL) out[f] = c.v; else todo.push(f);
    });
    let changed = false;
    for (let i = 0; i < todo.length; i += CHUNK) {
      const chunk = todo.slice(i, i + CHUNK), got = await fetchChunk(chunk);
      chunk.forEach(f => {
        if (!got) { out[f] = null; return; }   // senza risposta: null, si riprova la prossima volta
        out[f] = got[f]; mem[f] = cache[f] = { at: t, v: got[f] }; changed = true;
      });
    }
    if (changed) writeCache(cache);
    return out;
  }
  return { info };
}

module.exports = { createCommons, licenseFree, stripHtml, normFile, TTL, API };
