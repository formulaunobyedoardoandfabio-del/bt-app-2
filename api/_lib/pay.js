// Aiuti per le funzioni dei pagamenti su Vercel (1/11). I file con "_" davanti non sono indirizzi: solo codice in comune.
// Segreti SOLO nelle variabili di Vercel, mai nell'app né su GitHub:
//   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_PREMIUM, STRIPE_PRICE_COFFEE,
//   FIREBASE_SERVICE_ACCOUNT (il JSON dell'account di servizio scaricato dalla console di Firebase).
// Niente librerie: Stripe e Google si chiamano con fetch, le firme con crypto di Node.
const crypto = require("crypto");

const SITE = "https://bt-app-2.vercel.app";
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;
const cfgErr = () => Object.assign(new Error("config"), { code: "config" });

function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(obj));
}
// Corpo della richiesta così com'è (serve per la firma di Stripe): prima il flusso, poi quello già letto da Vercel.
async function rawBody(req) {
  if (Buffer.isBuffer(req.rawBody)) return req.rawBody.toString("utf8");
  if (typeof req.rawBody === "string") return req.rawBody;
  const chunks = [];
  try { if (req.readable !== false && typeof req[Symbol.asyncIterator] === "function") for await (const c of req) chunks.push(Buffer.from(c)); } catch (e) {}
  if (chunks.length) return Buffer.concat(chunks).toString("utf8");
  const b = req.body;
  if (Buffer.isBuffer(b)) return b.toString("utf8");
  if (typeof b === "string") return b;
  if (b && typeof b === "object") return JSON.stringify(b, null, 2);   // Stripe manda il JSON con 2 spazi
  return "";
}
async function jsonBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body;
  try { return JSON.parse(await rawBody(req) || "{}"); } catch (e) { return {}; }
}

// ── Stripe ──
// Parametri come li vuole Stripe: { line_items: [{ price }] } → line_items[0][price]=...
function form(obj, pre = "", out = []) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = pre ? `${pre}[${k}]` : k;
    if (typeof v === "object") form(v, key, out);
    else out.push(encodeURIComponent(key) + "=" + encodeURIComponent(String(v)));
  }
  return out.join("&");
}
// Firma degli avvisi di Stripe (intestazione Stripe-Signature: t=..., v1=...): HMAC-SHA256 di "t.corpo"; al massimo 5
// minuti di differenza, così un avviso vecchio rimandato non vale.
function stripeSigOk(payload, header, secret, nowS, tolS = 300) {
  if (!header || !secret) return false;
  let t = null; const v1 = [];
  for (const part of String(header).split(",")) {
    const [k, v] = part.split("=");
    if (k && v && k.trim() === "t") t = v.trim();
    if (k && v && k.trim() === "v1") v1.push(v.trim());
  }
  if (!t || !v1.length || !isFinite(+t) || Math.abs(nowS - +t) > tolS) return false;
  const exp = crypto.createHmac("sha256", secret).update(t + "." + payload, "utf8").digest("hex");
  return v1.some(s => s.length === exp.length && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(exp)));
}

// ── Google (Firestore con l'account di servizio) ──
const b64u = b => Buffer.from(b).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
function createGoogle({ fetchImpl = (...a) => fetch(...a), env = process.env, now = () => Date.now() } = {}) {
  let tok = null, exp = 0, sa = null;
  function account() {
    if (sa) return sa;
    let a = null;
    try { a = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT || ""); } catch (e) { a = null; }
    if (!a || !a.client_email || !a.private_key || !a.project_id) throw cfgErr();
    sa = a;
    return sa;
  }
  async function token() {
    if (tok && now() < exp - 60000) return tok;
    const a = account(), iat = Math.floor(now() / 1000);
    const head = b64u(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const claim = b64u(JSON.stringify({ iss: a.client_email, scope: "https://www.googleapis.com/auth/datastore", aud: "https://oauth2.googleapis.com/token", iat, exp: iat + 3600 }));
    const sig = crypto.createSign("RSA-SHA256").update(head + "." + claim).sign(a.private_key);
    const r = await fetchImpl("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: head + "." + claim + "." + b64u(sig) }).toString() });
    let j = null;
    try { j = await r.json(); } catch (e) { j = null; }
    if (!r.ok || !j || !j.access_token) throw Object.assign(new Error("google-auth"), { code: "auth" });
    tok = j.access_token; exp = now() + (Number(j.expires_in) || 3600) * 1000;
    return tok;
  }
  const val = v => (v === null || v === undefined ? { nullValue: null }
    : typeof v === "boolean" ? { booleanValue: v }
    : typeof v === "number" ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v })
    : { stringValue: String(v) });
  // Cambia solo questi campi di users/<email>, e solo se l'account c'è: un pagamento non crea mai account nuovi.
  async function patchUser(email, fields) {
    const a = account(), keys = Object.keys(fields);
    const q = keys.map(k => "updateMask.fieldPaths=" + encodeURIComponent(k)).join("&") + "&currentDocument.exists=true";
    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(a.project_id)}/databases/(default)/documents/users/${encodeURIComponent(email)}?${q}`;
    const r = await fetchImpl(url, { method: "PATCH", headers: { Authorization: "Bearer " + await token(), "Content-Type": "application/json" }, body: JSON.stringify({ fields: Object.fromEntries(keys.map(k => [k, val(fields[k])])) }) });
    if (r.status === 404) return { ok: false, reason: "no-user" };
    return { ok: !!r.ok, status: r.status };
  }
  return { token, patchUser };
}

module.exports = { SITE, EMAIL, send, rawBody, jsonBody, form, stripeSigOk, createGoogle, cfgErr };
