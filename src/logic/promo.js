// Codici promo da 6 cifre (21/11, Edoardo; prove in test/unit/promo.test.js). L'admin crea un codice per un account
// (email) e un numero di giorni, e lo scrive su Firebase (shared/bt-promo, KINDS.promo in src/services/appdata.js).
// Solo quell'account lo può usare, una volta: Funzioni Pro per quei giorni (come il video, mai il Premium vero: regole
// di Google Play) e il trofeo "Codice scritto". shared/ si legge senza account, quindi nel documento non c'è l'email ma
// la sua impronta SHA-256 (to). Il controllo è nel telefono: va bene per cose che si sbloccano anche gratis.
(function (root) {
  const CODE_RE = /^[1-9]\d{5}$/, KEY_RE = /^[0-9a-f]{64}$/, DAY = 864e5, MAX_CODES = 300, MAX_USED = 50;
  const isObj = v => !!v && typeof v === "object" && !Array.isArray(v);

  // SHA-256 (FIPS 180-4) su UTF-8: sincrono, anche fuori da https (crypto.subtle non c'è sempre).
  const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  function utf8(s) {
    const out = [];
    for (let i = 0; i < s.length; i++) {
      let c = s.charCodeAt(i);
      if (c >= 0xd800 && c < 0xdc00 && i + 1 < s.length) { const d = s.charCodeAt(i + 1); if (d >= 0xdc00 && d < 0xe000) { c = 0x10000 + ((c - 0xd800) << 10) + (d - 0xdc00); i++; } }
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
      else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return out;
  }
  function sha256(str) {
    const b = utf8(String(str)), bitLen = b.length * 8;
    b.push(0x80);
    while (b.length % 64 !== 56) b.push(0);
    for (let i = 7; i >= 0; i--) b.push(i >= 4 ? 0 : (bitLen >>> (i * 8)) & 255);
    const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19], W = new Array(64);
    const rotr = (x, n) => (x >>> n) | (x << (32 - n));
    for (let o = 0; o < b.length; o += 64) {
      for (let i = 0; i < 16; i++) W[i] = (b[o + 4 * i] << 24) | (b[o + 4 * i + 1] << 16) | (b[o + 4 * i + 2] << 8) | b[o + 4 * i + 3];
      for (let i = 16; i < 64; i++) {
        const s0 = rotr(W[i - 15], 7) ^ rotr(W[i - 15], 18) ^ (W[i - 15] >>> 3), s1 = rotr(W[i - 2], 17) ^ rotr(W[i - 2], 19) ^ (W[i - 2] >>> 10);
        W[i] = (W[i - 16] + s0 + W[i - 7] + s1) | 0;
      }
      let [a, bb, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        const t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + W[i]) | 0;
        const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & bb) ^ (a & c) ^ (bb & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + bb) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    return H.map(x => (x >>> 0).toString(16).padStart(8, "0")).join("");
  }
  const normEmail = e => (typeof e === "string" ? e.trim().toLowerCase() : "");
  const emailKey = e => { const n = normEmail(e); return /^[^@\s]+@[^@\s]+$/.test(n) ? sha256(n) : null; };

  // Documento shared/bt-promo: { codes: [{ code, to, days, at }] }, dal più vecchio al più recente.
  function cleanPromo(v) {
    const seen = new Set(), codes = [];
    for (const c of isObj(v) && Array.isArray(v.codes) ? v.codes : []) {
      if (!isObj(c) || typeof c.code !== "string" || !CODE_RE.test(c.code) || seen.has(c.code)) continue;
      if (typeof c.to !== "string" || !KEY_RE.test(c.to) || typeof c.days !== "number" || !(c.days >= 1)) continue;
      seen.add(c.code);
      codes.push({ code: c.code, to: c.to, days: Math.min(365, Math.floor(c.days)), at: typeof c.at === "number" && isFinite(c.at) && c.at > 0 ? c.at : 0 });
    }
    return { codes: codes.slice(-MAX_CODES) };
  }
  // Nell'account (users/<email>.app2.promo): Funzioni Pro fino a until; used: codici già usati.
  function cleanUserPromo(v) {
    const until = isObj(v) && typeof v.until === "number" && isFinite(v.until) && v.until > 0 ? v.until : 0;
    const used = isObj(v) && Array.isArray(v.used) ? [...new Set(v.used.filter(c => typeof c === "string" && CODE_RE.test(c)))].slice(-MAX_USED) : [];
    return { until, used };
  }
  const proActive = (mine, now = Date.now()) => cleanUserPromo(mine).until > now;
  // { ok: true, code, days, until, mine } oppure { ok: false, why: "formato" | "ospite" | "nessuno" | "altro" | "usato" }
  function redeem({ promo, code, email, mine, now = Date.now() } = {}) {
    const c = typeof code === "string" ? code.trim() : "";
    if (!CODE_RE.test(c)) return { ok: false, why: "formato" };
    const key = emailKey(email);
    if (!key) return { ok: false, why: "ospite" };
    const hit = cleanPromo(promo).codes.find(x => x.code === c);
    if (!hit) return { ok: false, why: "nessuno" };
    if (hit.to !== key) return { ok: false, why: "altro" };
    const m = cleanUserPromo(mine);
    if (m.used.includes(c)) return { ok: false, why: "usato" };
    const until = Math.max(now, m.until) + hit.days * DAY;
    return { ok: true, code: c, days: hit.days, until, mine: { until, used: [...m.used, c].slice(-MAX_USED) } };
  }
  // Codice nuovo a caso (non comincia con 0, si detta meglio), mai uno che c'è già.
  function newCode(rand = Math.random, taken = []) {
    const busy = new Set(taken);
    for (let i = 0; i < 1000; i++) { const c = String(100000 + Math.min(899999, Math.floor(rand() * 900000))); if (!busy.has(c)) return c; }
    throw new Error("nessun codice libero");
  }
  function addCode(doc, { code, email, days, at = Date.now() } = {}) {
    const d = cleanPromo(doc);
    if (typeof code !== "string" || !CODE_RE.test(code)) throw new Error("il codice deve avere 6 cifre (non comincia con 0)");
    if (d.codes.some(x => x.code === code)) throw new Error("questo codice c'è già");
    const to = emailKey(email);
    if (!to) throw new Error("email non valida");
    if (!(typeof days === "number" && days >= 1 && days <= 365)) throw new Error("giorni da 1 a 365");
    return cleanPromo({ codes: [...d.codes, { code, to, days: Math.floor(days), at }] });
  }
  const dropCode = (doc, code) => { const d = cleanPromo(doc); return { codes: d.codes.filter(x => x.code !== code) }; };

  const api = { CODE_RE, sha256, emailKey, cleanPromo, cleanUserPromo, proActive, redeem, newCode, addCode, dropCode };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.BtPromo = api;
})(typeof window !== "undefined" ? window : this);
