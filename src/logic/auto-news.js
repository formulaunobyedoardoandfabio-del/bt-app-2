// Notizie automatiche (8/11, Edoardo: "rendi automatico tutto"). Dopo qualifica, Sprint e gara l'app scrive da sola
// una notizia coi risultati veri della stagione (Jolpica, gli stessi del FantaF1: [{ round, race, quali, sprint }]).
// Testo scritto dall'app (niente articoli di altri), categoria GARA (gratis). Solo le più recenti: l'ultimo weekend coi
// risultati e la gara prima. Si calcola sul telefono, uguale per tutti: in Firebase non si salva niente.
const isObj = v => !!v && typeof v === "object" && !Array.isArray(v);
const surname = full => String(full || "").split(" ").slice(-1)[0];
const H = 3600e3;

function sessionMs(race, key, weekendOf) {
  const wk = weekendOf ? weekendOf(race.circuitId) : null;
  const s = Array.isArray(wk) ? wk.find(x => x && x.key === key) : null;
  const at = s ? Date.parse(s.utc) : NaN;
  if (Number.isFinite(at)) return at;
  const r = Date.parse(race.date);
  if (!Number.isFinite(r)) return null;
  return key === "RACE" ? r : key === "QUALI" ? r - 23 * H : r - 26 * H;   // senza orari: il giorno prima
}

function lines(order, name, team, max = 10) {
  return order.filter(x => x && x.pos && !x.dnf).slice(0, max).map(x => `${x.pos}. ${name(x.id)}${team(x.id) ? ` (${team(x.id)})` : ""}`).join("\n");
}

function autoNews(rounds, races, { name = () => null, team = () => null, weekendOf = null } = {}) {
  const raceOf = new Map((Array.isArray(races) ? races : []).filter(isObj).map(r => [Number(r.round) || Number(String(r.id || "").slice(1)), r]));
  const out = [];
  (Array.isArray(rounds) ? rounds : []).filter(isObj).forEach(rd => {
    const race = raceOf.get(rd.round);
    if (!race) return;
    const base = { cat: "GARA", premium: false, published: true, auto: true, image: "", author: "B&T · risultati Jolpica", circuits: race.circuitId ? [race.circuitId] : [] };
    const ok = (s, n) => s && Array.isArray(s.order) && s.order.filter(x => x && x.pos && !x.dnf).length >= n && s.order.slice(0, n).every(x => name(x.id));
    const at = (key, plus) => { const t = sessionMs(race, key, weekendOf); return t == null ? null : new Date(t + plus).toISOString(); };
    if (ok(rd.quali, 3)) {
      const [p1, p2, p3] = rd.quali.order;
      out.push({ ...base, id: `auto-q-${rd.round}`, date: at("QUALI", H), title: `${surname(name(p1.id))} in pole al ${race.name}`,
        excerpt: `In prima fila con lui ${name(p2.id)}; terzo ${name(p3.id)}.`,
        body: `Qualifiche del ${race.name}: la griglia dei primi dieci.\n\n${lines(rd.quali.order, name, team)}\n\nLe penalità possono cambiare la griglia: quella ufficiale è nella pagina Race.` });
    }
    if (ok(rd.sprint, 3)) {
      const [p1, p2, p3] = rd.sprint.order;
      out.push({ ...base, id: `auto-s-${rd.round}`, date: at("SPRINT", H), title: `${surname(name(p1.id))} vince la Sprint del ${race.name}`,
        excerpt: `Sul podio della Sprint anche ${name(p2.id)} e ${name(p3.id)}.`,
        body: `Sprint del ${race.name}: chi ha preso punti.\n\n${lines(rd.sprint.order, name, team, 8)}` });
    } else if (ok(rd.sprint, 1)) {
      const p1 = rd.sprint.order[0];
      out.push({ ...base, id: `auto-s-${rd.round}`, date: at("SPRINT", H), title: `${surname(name(p1.id))} vince la Sprint del ${race.name}`, excerpt: "Risultato della Sprint.", body: `Sprint del ${race.name}.\n\n${lines(rd.sprint.order, name, team, 8)}` });
    }
    if (ok(rd.race, 3)) {
      const [p1, p2, p3] = rd.race.order;
      const out_ = rd.race.order.filter(x => x && x.dnf && name(x.id)).map(x => name(x.id));
      out.push({ ...base, id: `auto-r-${rd.round}`, date: at("RACE", 2 * H), title: `${surname(name(p1.id))} vince il ${race.name}`,
        excerpt: `Sul podio ${name(p2.id)} e ${name(p3.id)}.${rd.race.fastest && name(rd.race.fastest) ? ` Giro più veloce di ${name(rd.race.fastest)}.` : ""}`,
        body: `Ordine d'arrivo del ${race.name}.\n\n${lines(rd.race.order, name, team)}${out_.length ? `\n\nRitirati: ${out_.join(", ")}.` : ""}\n\nClassifica del Mondiale aggiornata nella pagina Race.` });
    }
  });
  // l'ultimo weekend coi risultati (tutte le sue notizie) e la gara del weekend prima
  const roundsWith = [...new Set(out.map(a => Number(a.id.split("-")[2])))].sort((a, b) => b - a);
  const last = roundsWith[0], prev = roundsWith[1];
  return out.filter(a => { const r = Number(a.id.split("-")[2]); return r === last || (r === prev && a.id.startsWith("auto-r-")); })
    .sort((a, b) => Date.parse(b.date || 0) - Date.parse(a.date || 0));
}

module.exports = { autoNews };
