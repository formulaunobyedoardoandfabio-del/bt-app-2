// Ricevuta del Premium in PDF (8/11, design "9 Ricevuta"). Un PDF vero di una pagina, scritto a mano (niente librerie):
// Helvetica con codifica WinAnsi (euro e lettere accentate), coi dati veri dell'acquisto di Google Play (numero d'ordine,
// data, piano, prezzo). Non è un documento fiscale: la ricevuta ufficiale la manda Google Play.
const MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
function dayIt(ms) {
  const d = new Date(ms);
  if (!Number.isFinite(d.getTime())) return "";
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", year: "numeric", month: "numeric", day: "numeric" }).formatToParts(d).map(x => [x.type, x.value]));
  return `${Number(p.day)} ${MONTHS[Number(p.month) - 1]} ${p.year}`;
}
const planName = plan => (plan === "month" ? "Premium Mensile" : "Premium Stagione");

// [sinistra, destra] per ogni riga (destra vuota = riga intera)
function receiptLines(r) {
  const rec = r || {};
  return [
    ["B&T Premium", ""],
    ["Conferma d'ordine", ""],
    ["", ""],
    [planName(rec.plan), "1 x"],
    ["Totale", rec.price || ""],
    ["", ""],
    ["Pagamento", "Google Play"],
    ["Data", dayIt(rec.at)],
    ["N. ordine", String(rec.orderId || "")],
    rec.account ? ["Account", String(rec.account)] : ["", ""],
    ["Non è un documento fiscale.", ""],
    ["La ricevuta ufficiale arriva da Google Play.", ""],
  ];
}

// Codice a barre Code 128, set B (8/11, Edoardo: "prova vera e univoca che l'utente è Premium"): barre vere del numero
// d'ordine di Google Play, leggibili da qualunque lettore. La prova vera è il numero: Edoardo lo cerca nella Play Console
// (Gestione ordini); il codice serve a leggerlo senza errori. Motivi da 11 moduli per i valori 0..105 (dalla tabella
// standard, controllata con python-barcode), fine da 13 moduli.
const C128 = [1740,1644,1638,1176,1164,1100,1224,1220,1124,1608,1604,1572,1436,1244,1230,1484,1260,1254,1650,1628,1614,1764,1652,1902,1868,1836,1830,1892,1844,1842,1752,1734,1590,1304,1112,1094,1416,1128,1122,1672,1576,1570,1464,1422,1134,1496,1478,1142,1910,1678,1582,1768,1762,1774,1880,1862,1814,1896,1890,1818,1914,1602,1930,1328,1292,1200,1158,1068,1062,1424,1412,1232,1218,1076,1074,1554,1616,1978,1556,1146,1340,1212,1182,1508,1268,1266,1956,1940,1938,1758,1782,1974,1400,1310,1118,1512,1506,1960,1954,1502,1518,1886,1966,1668,1680,1692];
const C128_STOP = "1100011101011";
const code128Pattern = v => C128[v].toString(2).padStart(11, "0");
function code128(text) {
  const vals = [...String(text || "")].map(ch => ch.charCodeAt(0)).filter(c => c >= 32 && c <= 126).map(c => c - 32);
  if (!vals.length) return "";
  const check = (104 + vals.reduce((a, v, i) => a + v * (i + 1), 0)) % 103;
  return [104, ...vals, check].map(code128Pattern).join("") + C128_STOP;
}
// moduli ("1" nero, "0" bianco) → barre nere [primo modulo, quanti moduli]
function bars(modules) {
  const out = [];
  for (let i = 0; i < modules.length; i++) {
    if (modules[i] !== "1") continue;
    let j = i;
    while (modules[j] === "1") j++;
    out.push([i, j - i]);
    i = j - 1;
  }
  return out;
}

// Testo → byte WinAnsi (euro 0x80; il resto di Latin-1 uguale), dentro una stringa PDF con gli escape.
const WIN = { "€": 0x80, "’": 0x92, "“": 0x93, "”": 0x94, "–": 0x96, "—": 0x97 };
function pdfText(s) {
  let out = "";
  for (const ch of String(s)) {
    let c = WIN[ch] != null ? WIN[ch] : ch.charCodeAt(0);
    if (c > 255) c = 63;   // "?"
    const x = String.fromCharCode(c);
    out += x === "(" || x === ")" || x === "\\" ? "\\" + x : x;
  }
  return out;
}

function receiptPdf(r) {
  const W = 300, H = 420, lines = receiptLines(r);
  let y = H - 50, ops = "";
  lines.forEach(([l, rt], i) => {
    const size = i === 0 ? 16 : i === 1 ? 11 : i >= 10 ? 8 : 10;
    const font = i === 0 || i === 4 ? "/F2" : "/F1";
    if (l) ops += `BT ${font} ${size} Tf 24 ${y} Td (${pdfText(l)}) Tj ET\n`;
    if (rt) ops += `BT ${font} ${size} Tf ${W - 24 - Math.round(rt.length * size * 0.56)} ${y} Td (${pdfText(rt)}) Tj ET\n`;
    y -= i === 0 ? 22 : 18;
  });
  ops += `0.8 w 24 ${H - 90} m ${W - 24} ${H - 90} l S\n`;
  // codice a barre del numero d'ordine, centrato, con 10 moduli bianchi per lato
  const mods = code128(r && r.orderId);
  if (mods) {
    const X = Math.min(1, (W - 48) / (mods.length + 20)), x0 = (W - mods.length * X) / 2, by = 64, bh = 52, id = String(r.orderId);
    ops += "0 0 0 rg\n" + bars(mods).map(([st, n]) => `${(x0 + st * X).toFixed(3)} ${by} ${(n * X).toFixed(3)} ${bh} re\n`).join("") + "f\n";
    ops += `BT /F1 8 Tf ${Math.round(W / 2 - id.length * 8 * 0.28)} ${by - 14} Td (${pdfText(id)}) Tj ET\n`;
  }
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    `<< /Length ${ops.length} >>\nstream\n${ops}endstream`,
  ];
  let pdf = "%PDF-1.4\n%\xe2\xe3\xcf\xd3\n";
  const offs = [];
  objs.forEach((o, i) => { offs.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map(o => String(o).padStart(10, "0") + " 00000 n \n").join("");
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 255;
  return bytes;
}

function toBase64(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  if (typeof btoa === "function") return btoa(bin);
  return Buffer.from(bin, "latin1").toString("base64");
}

// La ricevuta salvata nell'account (premium.receipt): solo con numero d'ordine e data veri, campi puliti.
function cleanReceipt(v) {
  if (!v || typeof v !== "object") return null;
  const orderId = typeof v.orderId === "string" ? v.orderId.trim().slice(0, 80) : "";
  const at = Number(v.at);
  if (!orderId || !Number.isFinite(at) || at <= 0) return null;
  return { orderId, at, plan: v.plan === "month" ? "month" : "season", price: typeof v.price === "string" ? v.price.slice(0, 24) : "" };
}

module.exports = { receiptLines, receiptPdf, toBase64, dayIt, planName, cleanReceipt, code128, code128Pattern, bars };
