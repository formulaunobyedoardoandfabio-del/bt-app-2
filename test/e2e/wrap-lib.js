// Misura degli a-capo brutti (21/11), usata da tools/wrap-scan.js e da test/e2e/run133-a-capo.js. Per ogni testo
// visibile della pagina, parola per parola, in che riga cade ogni parola (due pezzi sono sulla stessa riga se le loro
// altezze si sovrappongono: testi di grandezze diverse sulla stessa riga contano una):
//   corto  = testo corto (bottoni, etichette, sigle, fino a 26 caratteri) su 2 o più righe;
//   orfana = l'ultima riga è una parola sola (testi di almeno 4 parole);
//   spezza = una parola spezzata a metà.
// Non contano: grafici SVG, messaggi della chat, corpo delle notizie, campi di testo, cose nascoste ai lettori di
// schermo e quelle larghe meno di 5 px (etichette solo per i lettori di schermo).
const scan = (p, screen, width) => p.evaluate(({ screen, width }) => {
  const res = [];
  const skip = e => e.closest('svg, [data-dial-info], [data-chat-msg], [data-news-body], input, textarea, [aria-hidden="true"]');
  const els = [...document.querySelectorAll('body *')].filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()));
  for (const e of els) {
    if (skip(e)) continue;
    const cs = getComputedStyle(e);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
    if ([...e.children].some(c => /^(block|flex|grid|table|list-item)/.test(getComputedStyle(c).display))) continue;
    const box = e.getBoundingClientRect();
    if (box.width < 5) continue;
    const text = (e.innerText || '').replace(/\s+/g, ' ').trim();
    if (!text || text.length > 160) continue;
    const ws = [], tw = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
    let broken = false;
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      const re = /\S+/g; let m;
      while ((m = re.exec(n.textContent))) {
        const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length);
        const rs = [...r.getClientRects()].filter(x => x.width > 0.5 && x.height > 4);
        if (!rs.length) continue;
        if (new Set(rs.map(x => Math.round((x.top + x.bottom) / 2 / 6))).size > 1) broken = true;
        ws.push({ top: rs[0].top, bottom: rs[0].bottom });
      }
    }
    if (!ws.length) continue;
    const lines = [];
    ws.forEach(x => { const l = lines.find(y => x.top < y.bottom - 2 && x.bottom > y.top + 2); if (l) { l.n++; l.top = Math.min(l.top, x.top); l.bottom = Math.max(l.bottom, x.bottom); } else lines.push({ top: x.top, bottom: x.bottom, n: 1 }); });
    lines.sort((a, b) => a.top - b.top);
    let kind = null;
    if (broken) kind = 'spezza';
    else if (lines.length >= 2 && text.length <= 26) kind = 'corto';
    else if (lines.length >= 2 && lines[lines.length - 1].n === 1 && ws.length >= 4) kind = 'orfana';
    if (kind) res.push({ kind, screen, width, text: text.slice(0, 90), tag: e.tagName.toLowerCase(), lines: lines.length, x: Math.round(box.left), boxW: Math.round(box.width) });
  }
  return res;
}, { screen, width });

module.exports = { scan };
