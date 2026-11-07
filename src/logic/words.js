// Anteprime dei testi (7/11 sera, Edoardo: "se il testo è lungo metti i tre puntini dopo l'ultima parola e, se se ne
// dovesse tagliare una, dopo la penultima"): mai una parola tagliata a metà.
const END_PUNCT = /[\s,;:\-–(«"“]+$/;

// Al massimo max caratteri (più i tre puntini): si tengono solo parole intere.
function cutWords(text, max) {
  const s = String(text == null ? "" : text).replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  const head = s.slice(0, max + 1);              // un carattere in più: se è uno spazio l'ultima parola è intera
  const sp = head.lastIndexOf(" ");
  const cut = (sp > 0 ? head.slice(0, sp) : s.slice(0, max)).replace(END_PUNCT, "");
  return cut + "…";
}

// Riassunti già salvati tagliati a max caratteri (prima del 7/11: slice(0, 140) a metà parola, senza puntini):
// lunghi max e senza la fine di una frase, si toglie l'ultima parola (forse tagliata) e si mettono i puntini.
function fixCut(text, max = 140) {
  const s = String(text == null ? "" : text).trim();
  if (s.length < max || /[.!?…»"”)]$/.test(s)) return s;
  const sp = s.lastIndexOf(" ");
  return (sp > 0 ? s.slice(0, sp) : s).replace(END_PUNCT, "") + "…";
}

module.exports = { cutWords, fixCut };
