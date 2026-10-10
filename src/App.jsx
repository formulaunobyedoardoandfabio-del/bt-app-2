// B&T App 2.0. Generato una volta da tools/port-2.0.js (anteprima 2.0, app-preview/index.html, versione 25);
// da qui in avanti è il sorgente vero e si modifica a mano.
import React, { useState, useRef, useEffect } from "react";
import "./App.css";
import CIRCUITS from "./data/circuits.json";
import CIRCUIT_INFO from "./data/circuit-info.json";
import BT_WATERMARK from "./data/watermark";
import BtRealData from "./data/real-data";
import BtWeekend from "./data/real-weekend";
import LiveSim from "./logic/live-sim";
import BtLogic from "./logic/bt-logic";
import BtInsights from "./logic/bt-insights";
import DnfArtData from "./logic/dnf-art";
import BtGhost from "./logic/bt-ghost";
import BtWk from "./logic/bt-weekend";
import F1 from "./data/f1-2026";
import AppData from "./services/appdata";
import Compat from "./services/compat";

/* ── DESIGN TOKENS (matches the B&T concept style) ─────────────────── */
const C = {
  bg:      "#0A0A0C",
  card:    "#18181C",
  raised:  "rgba(255,255,255,.05)",
  border:  "rgba(255,255,255,.08)",
  divider: "rgba(255,255,255,.07)",
  text:    "#F4F2EF",
  muted:   "#9C9CA1",
  dim:     "#86858C",
  accent:  "#E8121D",
  gold:    "#E7B34C",
  green:   "#4AE54A",
};
const F_HEAD = "'Titillium Web', sans-serif";
const F_BODY = "'Work Sans', sans-serif";

/* ── PLAY STORE: privacy, contatti, dicitura F1, Premium (come nell'app vera) ── */
// Pagine pubbliche richieste da Google Play (privacy policy ed eliminazione account).
const SITE_URL = "https://formulaunobyedoardoandfabio-del.github.io/bt-app-flutter";
const PRIVACY_URL = SITE_URL + "/privacy.html";
const CONTACT_EMAIL = "bt.formula1@gmail.com";
const F1_DISCLAIMER = "B&T App è un'app non ufficiale e non è associata in alcun modo alle società di Formula 1. F1, FORMULA ONE, FORMULA 1, FIA FORMULA ONE WORLD CHAMPIONSHIP, GRAND PRIX e i marchi correlati sono marchi di Formula One Licensing B.V.";
// Premium di prova: nell'anteprima si attiva con un tocco, senza pagare.
// Sul Play Store un abbonamento va venduto con Google Play Billing: lì questa prova va spenta.
const PAYMENTS_ENABLED = true;
// Prova gratuita di 2 settimane, una sola volta per account (sul Play Store si imposta come offerta dell'abbonamento).
const TRIAL_DAYS = 14;
const premiumOffer = ({ trialUsed, isPremium }) => isPremium ? "premium" : trialUsed ? "subscribe" : "trial";
const trialDaysLeft = trial => trial ? Math.max(0, Math.ceil((trial.end - Date.now()) / 86400000)) : 0;
const fmtDay = ms => new Date(ms).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
// Apre un link fuori dall'app: nell'APK col browser di sistema, sul web in una nuova scheda.
const openUrl = url => {
  try { const B = window.Capacitor?.Plugins?.Browser; if (window.Capacitor?.isNativePlatform?.() && B) { B.open({ url }); return; } } catch (e) {}
  window.open(url, "_blank");
};
// Moderazione chat (richiesta da Google Play): i messaggi degli utenti bloccati non si vedono.
const isBlockedMsg = (blocked, m) => !m.mine && blocked.some(b => b.name === m.from);

/* ── ICONS ──────────────────────────────────────────────────────────── */
function Icon({ name, size = 18, color = C.text, sw = 2 }) {
  const s = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: sw, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "back": return <svg {...s}><polyline points="15,18 9,12 15,6" /></svg>;
    case "close": return <svg {...s}><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></svg>;
    case "chevron": return <svg {...s}><polyline points="9,6 15,12 9,18" /></svg>;
    case "garage": return <svg {...s}><path d="M3 21V9l9-6 9 6v12" /><path d="M7 21v-9h10v9" /><line x1="7" y1="15" x2="17" y2="15" /><line x1="7" y1="18" x2="17" y2="18" /></svg>;
    case "bell": return <svg {...s}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>;
    case "person": return <svg {...s}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-7 8-7s8 3 8 7" /></svg>;
    case "home": return <svg {...s}><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></svg>;
    case "instagram": return <svg {...s}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" /></svg>;
    case "chat": return <svg {...s}><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 8.4 8.4 0 0 1-3.8-.9L3 20l1-5.6a8.4 8.4 0 0 1-.9-3.9A8.5 8.5 0 0 1 21 11.5Z" /></svg>;
    case "trophy": return <svg {...s}><path d="M8 21h8M12 17v4M17 3H7a2 2 0 0 0-2 2v3a7 7 0 0 0 14 0V5a2 2 0 0 0-2-2Z" /><path d="M5 6H3a2 2 0 0 0 0 4h2M19 6h2a2 2 0 0 1 0 4h-2" /></svg>;
    case "flag": return <svg {...s}><path d="M5 21V4" /><path d="M5 4h13l-3 4 3 4H5" /></svg>;
    case "search": return <svg {...s}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>;
    case "mail": return <svg {...s}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m2 6 10 7 10-7" /></svg>;
    case "lock": return <svg {...s}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>;
    case "unlock": return <svg {...s}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 7.5-2" /></svg>;
    case "logout": return <svg {...s}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16,17 21,12 16,7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>;
    case "gear": return <svg {...s}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></svg>;
    case "help": return <svg {...s}><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 2-3 4" /><line x1="12" y1="17" x2="12" y2="17.5" /></svg>;
    case "info": return <svg {...s}><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>;
    case "check": return <svg {...s} strokeWidth={sw || 2.6}><polyline points="20,6 9,17 4,12" /></svg>;
    case "no": return <svg {...s}><circle cx="12" cy="12" r="9" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
    case "stopwatch": return <svg {...s}><rect x="4" y="3" width="15" height="10" rx="1" /><rect x="10" y="13" width="2" height="7" /></svg>;
    case "tire": return <svg {...s}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /></svg>;
    case "radio": return <svg {...s}><path d="M7 12a5 5 0 0 1 10 0" /><path d="M4 12a8 8 0 0 1 16 0" /><circle cx="12" cy="12" r="1.5" fill={color} /></svg>;
    case "group": return <svg {...s}><circle cx="9" cy="8" r="3" /><path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6" /><circle cx="17.5" cy="9" r="2.3" /><path d="M15 20c.3-2.7 2-4.6 5.5-4.6" /></svg>;
    case "bulb": return <svg {...s}><path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2a6.5 6.5 0 0 0-3.8 11.8c.5.4.8 1 .8 1.7v.5h6v-.5c0-.7.3-1.3.8-1.7A6.5 6.5 0 0 0 12 2Z" /></svg>;
    case "doc": return <svg {...s}><path d="M4 4h12l4 4v12H4z" /><line x1="8" y1="10" x2="16" y2="10" /><line x1="8" y1="14" x2="16" y2="14" /><line x1="8" y1="18" x2="12" y2="18" /></svg>;
    case "history": return <svg {...s}><circle cx="12" cy="12" r="9" /><polyline points="12,7 12,12 16,14" /></svg>;
    case "play": return <svg {...s}><circle cx="12" cy="12" r="9" /><polygon points="10,8 16,12 10,16" fill={color} /></svg>;
    case "poll": return <svg {...s}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="m8 12 2.5 2.5L16 9" /></svg>;
    case "grid": return <svg {...s}><rect x="3" y="4" width="8" height="7" rx="1" /><rect x="13" y="4" width="8" height="4" rx="1" /><rect x="13" y="10" width="8" height="10" rx="1" /><rect x="3" y="13" width="8" height="7" rx="1" /></svg>;
    case "send": return <svg {...s}><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22,2 15,22 11,13 2,9" /></svg>;
    case "star": return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><polygon points="12,2 15,9 22,9.5 16.5,14.5 18,22 12,18 6,22 7.5,14.5 2,9.5 9,9" /></svg>;
    case "heart": return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M12 21s-7-4.4-9.5-8.8C.8 8.8 2.4 5 6 5c2 0 3.3 1 4 2 .7-1 2-2 4-2 3.6 0 5.2 3.8 3.5 7.2C19 16.6 12 21 12 21Z" /></svg>;
    case "bookmark": return <svg {...s}><path d="M6.5 3.5h11v17l-5.5-4-5.5 4z" /></svg>;
    case "bookmark-fill": return <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth={sw} strokeLinejoin="round"><path d="M6.5 3.5h11v17l-5.5-4-5.5 4z" /></svg>;
    case "edit": return <svg {...s}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>;
    case "hash": return <svg {...s}><line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" /><line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" /></svg>;
    case "trash": return <svg {...s}><polyline points="3,6 5,6 21,6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>;
    case "image": return <svg {...s}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21,15 16,10 5,21" /></svg>;
    case "sparkle": return <svg {...s}><path d="M12 3l1.8 4.9L19 9.7l-5.2 1.8L12 16.4l-1.8-4.9L5 9.7l5.2-1.8Z" /><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8Z" /></svg>;
    case "plus": return <svg {...s}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
    case "share": return <svg {...s}><path d="M12 3v12" /><polyline points="7,8 12,3 17,8" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></svg>;
    case "download": return <svg {...s}><path d="M12 3v12" /><polyline points="7,10 12,15 17,10" /><path d="M5 20h14" /></svg>;
    case "link": return <svg {...s}><path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5" /><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" /></svg>;
    case "rotate": return <svg {...s}><path d="M20 12a8 8 0 1 1-2.34-5.66" /><polyline points="20,4 20,9 15,9" /></svg>;
    case "external": return <svg {...s}><path d="M14 4h6v6" /><path d="M20 4l-9 9" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>;
    default: return null;
  }
}

/* ── DATI ───────────────────────────────────────────────────────────── */
// Le notizie stanno in shared/bt-news (src/services/appdata.js): di serie c'è solo quella di benvenuto dell'app di oggi.

// Scuderie 2026: src/data/f1-2026.js
const TEAMS = F1.TEAMS;
const teamById = (id) => TEAMS.find(t => t.id === id);

// Piloti 2026 (bio e statistiche vere): src/data/f1-2026.js
const DRIVER_DATA = F1.DRIVER_DATA;
// Foto dei piloti e dei caschi, scontornate e incorporate nella pagina al momento della pubblicazione.
// Sono foto ufficiali delle scuderie e di negozi: vanno bene solo in questa anteprima privata, NON nella
// versione per il Play Store (lì servono foto con licenza libera, ad esempio da Wikimedia Commons, con i crediti).
const PHOTOS = {};    // foto intera
const AVATARS = {};  // quadrato centrato sul volto, per le foto tonde
const HELMETS = {};  // casco
// logo BT bianco su trasparente, per la filigrana della diretta
// Sotto il casco: la fonte, se la foto originale aveva il marchio di chi l'ha scattata, oppure "Immagine indicativa".
const HELMET_NOTES = { norris: "Foto: JMD (jmd.de)", piastri: "Foto: DNA F1", alonso: "Foto: DNA F1", albon: "Foto: carmodel.com", bottas: "Foto: carmodel.com",
  russell: "Immagine indicativa", antonelli: "Immagine indicativa", leclerc: "Immagine indicativa", bearman: "Immagine indicativa", colapinto: "Immagine indicativa" };
const GAPS = ["—", "+0.412", "+1.038", "+2.774", "+4.116", "+6.902", "+9.554", "+14.310", "+17.882", "+21.407", "+24.019", "+27.655", "+31.230", "+34.918", "+38.104", "+41.772", "+45.390", "+49.861", "+53.227", "+58.004", "+1 giro", "+1 giro"];
const DRIVERS = DRIVER_DATA.map(([id, name, full, teamId, born, nat, wins, podiums, titles, bio], i) => {
  const t = teamById(teamId);
  const ACCENTS = { "ü": "u", "é": "e", "è": "e", "á": "a", "í": "i", "ó": "o" };
  const surname = full.split(" ").slice(-1)[0].split("").map(ch => ACCENTS[ch] || ch).join("");
  return { id, pos: i + 1, name, full, teamId, team: t.name, color: t.color, tag: "#" + surname, gap: GAPS[i], fastest: id === "leclerc",
    born, nat, wins, podiums, titles, bio, photo: PHOTOS[id] || null, avatar: AVATARS[id] || null,
    helmet: HELMETS[id] || null, helmetNote: HELMET_NOTES[id] || null };
});
const driverById = (id) => DRIVERS.find(d => d.id === id);
const driverByName = (name) => DRIVERS.find(d => d.name === name);

/* ── DIRETTA: tracciati, numeri di gara e simulatore ─────────────────── */
// Tracciati dei circuiti: "f1-circuits" di Tomislav Bacinger (licenza MIT), lisciati e ruotati per la mappa.

// Schede dei circuiti per "Mostra di più": numeri verificati su formula1.com e Wikipedia (29/09/2026),
// domande e risposte, hashtag, fuso orario, colori del paese, weekend Sprint e orari ufficiali 2026 (UTC).

const CIRCUIT_TAG_COLOR = "#27D8C8";
// Simulatore di prove, qualifiche e gara (dati finti nel formato di OpenF1, finché non arrivano quelli veri).
// Regole di gioco (meteo, FantaF1 come F1 Fantasy, previsioni): app-preview/bt-logic.js, testate in rtest/logic.test.js.
// Grafiche B&T Insights (chi raggiunge chi, strategie ai box, ritmo gara, frenata a confronto, pagella monoposto): app-preview/bt-insights.js, testate in rtest/insights.test.js.
// Disegni dei ritiri (motore, incidente, incendio, penalità, generico): app-preview/dnf-art.js, anteprima con rtest/dnfsheet.js.
// Ghost Lap (due giri veri a confronto): app-preview/bt-ghost.js, testato in rtest/ghost.test.js.
// Dati veri (TracingInsights, da FastF1): Ghost Lap di Sepang e Baku, Guida 2D, Spec Clash e momenti storici: app-preview/real-data.js, creato da realdata/make_realdata.py.
// Strumenti del weekend nel Garage (degrado gomme, strategie, compagni, assetto, bluff): app-preview/bt-weekend.js,
// testati in rtest/weekend.test.js. Dati veri di prove libere, qualifiche e gare 2026: app-preview/real-weekend.js.
// Ora di adesso (i test possono fissarla con window.__btNow per provare chiusure e conti alla rovescia).
const nowMs = () => (typeof window !== "undefined" && window.__btNow) || Date.now();
const trackCache = {};
const trackOf = id => id && CIRCUITS[id] ? (trackCache[id] || (trackCache[id] = LiveSim.buildTrack(CIRCUITS[id]))) : null;
const fmtKm = v => v.toFixed(3).replace(".", ",") + " km";
const raceOfCircuit = id => RACES_INIT.find(r => r.circuitId === id);
const circuitTagOf = id => CIRCUIT_INFO[id] ? { key: "c:" + id, label: "#" + CIRCUIT_INFO[id].tag, color: CIRCUIT_TAG_COLOR } : null;
const circuitText = id => { const r = raceOfCircuit(id), c = CIRCUITS[id], i = CIRCUIT_INFO[id]; return normText([c && c.name, r && r.name, r && r.circuit, r && r.country, i && i.tag, i && "#" + i.tag].join(" ")); };
const CAR_NUMBERS = { norris: 1, verstappen: 3, antonelli: 12, hadjar: 6, leclerc: 16, piastri: 81, russell: 63, hamilton: 44, sainz: 55, albon: 23, alonso: 14,
  gasly: 10, lawson: 30, bearman: 87, hulkenberg: 27, bortoleto: 5, ocon: 31, lindblad: 41, colapinto: 43, stroll: 18, bottas: 77, perez: 11 };
const driverCode = d => d.full.split(" ").slice(-1)[0].normalize("NFD").replace(/[̀-ͯ]/g, "").slice(0, 3).toUpperCase();
const LIVE_DRIVERS = DRIVERS.map(d => ({ id: d.id, code: driverCode(d), number: CAR_NUMBERS[d.id] || d.pos, color: d.color }));
const SESSION_TYPES = [["FP1", "PROVE LIBERE 1"], ["FP2", "PROVE LIBERE 2"], ["FP3", "PROVE LIBERE 3"], ["SQ", "QUALIFICHE SPRINT"], ["SPRINT", "SPRINT"], ["QUALI", "QUALIFICHE"], ["RACE", "GARA"]];
const isRaceType = type => type === "RACE" || type === "SPRINT";
// Sessioni del weekend di una gara (weekend Sprint: FP1, Qualifiche Sprint, Sprint, Qualifiche, Gara).
const weekendKeys = race => race && CIRCUIT_INFO[race.circuitId] && CIRCUIT_INFO[race.circuitId].sprint ? LiveSim.WEEKEND_KEYS.sprint : LiveSim.WEEKEND_KEYS.classic;
// Meteo del weekend con gli orari ufficiali, se ci sono (liveKey: la sessione in diretta).
function weekendWeather(race, t = 0, liveKey) {
  const info = CIRCUIT_INFO[race.circuitId] || {};
  return LiveSim.weather({ circuitId: race.circuitId, raceDate: race.date, seed: race.round || 1, t, sessions: info.weekend, tz: info.tz, format: info.sprint ? "sprint" : "classic", liveKey });
}
const WX_SHORT = { FP1: "FP1", FP2: "FP2", FP3: "FP3", SQ: "SQ", SPRINT: "SPRINT", QUALI: "QUALI", RACE: "GARA" };
const sessionName = type => (SESSION_TYPES.find(s => s[0] === type) || [type, type])[1];
// Colori di cronometraggio (come sui monitor F1): viola record, verde personale, giallo più lento.
const TIMING = { purple: "#B35CFF", green: "#3ED66B", yellow: "#F2C230", pit: "#4C8DFF", none: "rgba(255,255,255,.12)" };
const FLAG_UI = {
  yellow: { color: "#FFD21F", ink: "#1A1400" }, sc: { color: "#FFD21F", ink: "#1A1400" }, vsc: { color: "#FFD21F", ink: "#1A1400" },
  red: { color: "#E8121D", ink: "#fff" },
};

/* ── DATI MODIFICABILI DAL PANNELLO ADMIN ─────────────────────────── */
// Calendario 2026 e tracciati: src/data/f1-2026.js
const CIRCUIT_IDS = F1.CIRCUIT_IDS;
// Calendario come nella 2.0 (lo stato vero arriva da Firebase, shared/bt-races: src/services/appdata.js).
const RACES_INIT = F1.RACES.map((r, i) => ({ ...r, status: i < 15 ? "CONCLUSA" : "IN ARRIVO" }));
const RACE_STATUSES = F1.RACE_STATUSES;
const fmtDate = (iso) => { if (!iso) return "—"; const [y, m, d] = iso.split("-").map(Number); const M = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"]; return `${d} ${M[m - 1]} ${y}`; };

// Classifiche: shared/bt-piloti, bt-costruttori e bt-standings-note (valori di partenza dopo Baku in src/data/f1-2026.js).
// In classifica c'è anche chi ha corso solo qualche gara da sostituto e non è tra i 22 titolari: gli ospiti arrivano con
// le classifiche lette da Firebase e l'app li aggiunge qui (addStandingsGuests).
const STANDINGS_GUESTS = { ...F1.STANDINGS.guests };
const addStandingsGuests = guests => { Object.assign(STANDINGS_GUESTS, guests || {}); };
const standingsDriver = id => driverById(id) || STANDINGS_GUESTS[id] || null;

// Ultima gara corsa (dati reali, formula1.com): GP dell'Azerbaigian 2026, round 15. Giro più veloce: Russell.
const LAST_RACE_INIT = { raceId: "r15", name: "GP dell'Azerbaigian", type: "RACE", real: true, fastest: "russell",
  rows: [["russell", "1:38:02.143"], ["verstappen", "+0.196s"], ["hadjar", "+10.704s"], ["leclerc", "+14.136s"], ["antonelli", "+14.512s"], ["hamilton", "+22.382s"],
    ["lindblad", "+31.159s"], ["ocon", "+31.189s"], ["bearman", "+31.929s"], ["sainz", "+32.416s"], ["hulkenberg", "+33.231s"], ["lawson", "+34.013s"],
    ["piastri", "+36.401s"], ["perez", "+41.400s"], ["bortoleto", "+44.230s"],
    // Ritiri e cause dal resoconto ufficiale della gara su formula1.com (letto il 01/10/2026): il disegno cambia con la causa.
    ["bottas", "Ritirato", 16, "incidente", "Contro le barriere nel finale"], ["colapinto", "Ritirato", null, "incidente", "Bloccaggio e contatto con Gasly alla ripartenza"],
    ["gasly", "Ritirato", null, "incidente", "Colpito da Colapinto, poi contro Norris"], ["norris", "Ritirato", null, "incidente", "Colpito da Gasly alla ripartenza"],
    ["albon", "Ritirato", null, "incidente", "Bloccaggio e barriere in curva 6"], ["alonso", "Ritirato", null, "motore", "Problemi tecnici"],
    ["stroll", "Ritirato", null, "motore", "Pressione dell'acqua, al giro 9"]]
    .map(([id, time, pos, dnf, why], i) => ({ id, time, pos: pos || (time === "Ritirato" ? null : i + 1), dnf: dnf || null, why: why || null })) };

// FantaF1 come il gioco ufficiale F1 Fantasy: prezzi (milioni di $), variazione e punti della stagione. Stanno in
// shared/bt-fanta-stats (valori di partenza dopo il GP dell'Azerbaigian in src/data/f1-2026.js); dopo ogni gara si
// aggiornano dal pannello admin (FANTA F1).
const FANTASY_SOURCE = "Prezzi e punti del gioco ufficiale F1 Fantasy dopo il GP dell'Azerbaigian (30/09/2026)";
const TEAM_OF = Object.fromEntries(DRIVERS.map(d => [d.id, d.teamId]));
// La tua squadra (demo): 5 piloti, 2 scuderie e il 2X. Budget = 100 M$ di partenza più il valore guadagnato in stagione.
const FANTA_BUDGET = 108.1;
const FANTA_SQUAD_INIT = { name: "Scuderia B&T", drivers: ["hamilton", "russell", "hulkenberg", "perez", "antonelli"], teams: ["audi", "haas"], boost: "russell" };

// Previsioni avanzate del FantaF1: +1 punto per ogni risposta giusta. Tutte a risposta chiusa:
// kind: "poll" (sondaggio con le sue risposte), "driver" (si sceglie tra tutti i piloti), "team" (tra tutte le scuderie),
// "number" (un numero, col tastierino numerico), "history" (storia: la risposta si sa già).
// about: sessione del weekend all'inizio della quale la domanda si chiude; la risposta esatta la segna l'admin.
// Le domande stanno in shared/bt-predictions: le scrive l'admin; di serie ci sono solo quelle di storia (src/data/f1-2026.js).

// Instagram: shared/bt-ig-config (handle, follower, post e video li scrive l'admin; niente numeri inventati).
const fmtK = (n) => n == null || n === "" ? "—" : n >= 1000 ? (n / 1000).toFixed(n >= 100000 ? 0 : 1).replace(".0", "") + "K" : String(n);
// Sondaggi (Home e notizie): la risposta esatta la segna l'admin e chi ha indovinato prende +2 punti FantaF1.
// Il sondaggio della Home sta in shared/bt-home-poll: se non c'è, il riquadro non si vede.
const articlePoll = a => a && a.poll ? { ...a.poll, id: "art-" + a.id } : null;
const NEWS_CATEGORIES = ["NEWS", "GARA", "APP", "ANALISI", "FANTA", "PILOTI", "SCUDERIE"];
const STATS_NOTE = "Statistiche carriera aggiornate a settembre 2026";

const TIRES = [
  { name: "L. Norris", compound: "Media", wear: 34 },
  { name: "M. Verstappen", compound: "Dura", wear: 18 },
  { name: "K. Antonelli", compound: "Media", wear: 47 },
  { name: "I. Hadjar", compound: "Morbida", wear: 61 },
  { name: "C. Leclerc", compound: "Media", wear: 29 },
];

// Messaggi radio d'esempio (non reali)
const RADIOS = [
  { driver: "L. Norris", text: "“Passo buono, la macchina risponde bene in curva 4.”", time: "Giro 32" },
  { driver: "M. Verstappen", text: "“Gomme un po' in calo, quanto manca alla sosta?”", time: "Giro 29" },
  { driver: "K. Antonelli", text: "“Ok box, capito, entro questo giro.”", time: "Giro 27" },
  { driver: "C. Leclerc", text: "“Giro veloce, ottimo lavoro squadra!”", time: "Giro 41" },
];



const LEAGUE = [
  { pos: 1, name: "M. Bianchi", nick: "@bianchi_bj", team: "Scuderia BlackJack", pts: "1.284 pt", color: "#2E9E8F" },
  { pos: 2, name: "F. Greco", nick: "@ferrarista92", team: "I Ferraristi", pts: "1.201 pt", color: "#3B6FD4" },
  { pos: 3, name: "Tu", team: "La tua squadra", pts: "1.166 pt", color: "#E8121D", me: true },
  { pos: 4, name: "S. Conti", nick: "@boxboys_sc", team: "Box Boys", pts: "1.098 pt", color: "#E8842C" },
  { pos: 5, name: "E. Marino", nick: "@pitwall_em", team: "Pit Wall Crew", pts: "1.034 pt", color: "#7B5FC4" },
  { pos: 6, name: "L. Rinaldi", nick: "@podiumhunter", team: "Podium Hunters", pts: "980 pt", color: "#D9B830" },
  { pos: 7, name: "G. Villa", nick: "@slipstream_g", team: "Slipstream", pts: "915 pt", color: "#9AA0A6" },
];

const CHATS_INIT = [
  { id: "generale", name: "Chat Generale", color: "#C1121F", icon: "chat", iconColor: "#fff",
    messages: [
      { from: "Marco T.", text: "Ragazzi pronti per il weekend?", mine: false },
      { from: "Giulia R.", text: "Sempre! Occhio alle previsioni meteo però", mine: false },
      { from: "Davide S.", text: "Io spero in un po' di pioggia, gare più belle 😄", mine: false },
      { from: "Marco T.", text: "Vediamo cosa dice la redazione B&T", mine: false },
    ] },
  { id: "live", name: "Live Gara", color: "#3FAE6B", icon: "stopwatch", iconColor: "#141414",
    messages: [
      { from: "Elena V.", text: "Bel sorpasso alla curva 3!", mine: false },
      { from: "Paolo M.", text: "Strategia rischiosa quella gomma dura...", mine: false },
      { from: "Sara B.", text: "Concordo, vediamo se regge fino alla fine", mine: false },
    ] },
  { id: "fanta", name: "FantaF1 Talk", color: "#E7B34C", icon: "trophy", iconColor: "#141414",
    messages: [
      { from: "Luca F.", text: "Chi schierate questo weekend?", mine: false },
      { from: "Anna P.", text: "Sto pensando di cambiare P3, non mi convince il passo", mine: false },
    ] },
  { id: "radio", name: "Box Radio", color: "#2E9E8F", icon: "chat", iconColor: "#fff",
    messages: [
      { from: "Fabio C.", text: "Avete sentito la radio dopo il pit stop? 😅", mine: false },
      { from: "Giulia R.", text: "Team radio più belle della stagione finora", mine: false },
    ] },
  { id: "paddock", name: "Paddock Talk", color: "#3B6FD4", icon: "chat", iconColor: "#fff",
    messages: [
      { from: "Davide S.", text: "Prossimo weekend si cambia circuito, non vedo l'ora", mine: false },
    ] },
];

// Le notifiche dell'admin stanno in shared/bt-notifs, nel formato di oggi (src/services/appdata.js).

const PREMIUM_CATEGORIES = [
  { name: "In gara", items: [
    { icon: "stopwatch", title: "Tempi su giro in tempo reale" },
    { icon: "tire", title: "Gomme: usura e strategia" },
    { icon: "radio", title: "Team radio audio live" },
    { icon: "flag", title: "Pit stop e distacchi completi" },
  ]},
  { name: "Fanta F1", items: [
    { icon: "trophy", title: "Fanta F1 completo con leghe" },
    { icon: "group", title: "Leghe private illimitate" },
    { icon: "bulb", title: "Consigli formazione pre-gara" },
  ]},
  { name: "Contenuti", items: [
    { icon: "doc", title: "News esclusive e in anteprima" },
    { icon: "history", title: "Archivio storico dei GP" },
    { icon: "play", title: "Video highlights esclusivi" },
    { icon: "poll", title: "Sondaggi e contenuti della redazione" },
  ]},
  { name: "Esperienza B&T", items: [
    { icon: "no", title: "Zero pubblicità" },
    { icon: "star", title: "Distintivo Premium in chat", starIcon: true },
    { icon: "bell", title: "Notifiche personalizzate in tempo reale" },
    { icon: "unlock", title: "Accesso anticipato alle nuove funzioni" },
    { icon: "grid", title: "Modalità Second Screen durante la gara" },
  ]},
];

/* ── SMALL SHARED UI ────────────────────────────────────────────────── */
function Eyebrow({ children, color = C.dim }) {
  return <div style={{ padding: "2px 4px 8px", fontFamily: F_BODY, fontWeight: 700, fontSize: 11, color, letterSpacing: 1.2 }}>{children}</div>;
}

function IconCircle({ name, size = 36, bg, stroke, filled }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size / 2, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {filled ? <Icon name={name} size={size * 0.45} color={stroke} /> : <Icon name={name} size={size * 0.47} color={stroke} />}
    </div>
  );
}

function SubHeader({ title, onBack, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 16px 14px", flexShrink: 0 }}>
      <button className="press" aria-label="Indietro" onClick={onBack} style={{ width: 38, height: 38, borderRadius: "50%", background: C.card, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon name="back" size={17} sw={2.2} />
      </button>
      <h1 style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 18, color: C.text, margin: 0, letterSpacing: .2, flex: 1 }}>{title}</h1>
      {right}
    </div>
  );
}

function TopHeader({ isPremium, unread, onPremium, onBell, onProfile, trialDays = 0 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 16px 14px", flexShrink: 0 }}>
      <div style={{ width: 38, height: 38, borderRadius: 11, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 14, color: "#fff", letterSpacing: -.5 }}>B&amp;T</span>
      </div>
      <div style={{ flexGrow: 1 }} />
      {isPremium ? (
        <div data-premium-chip="on" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 20, background: `linear-gradient(rgba(231,179,76,.16), rgba(231,179,76,.16)) ${C.bg}`, border: `1px solid ${C.gold}` }}>
          <Icon name="star" size={13} color={C.gold} />
          <span style={{ fontFamily: F_HEAD, fontWeight: 700, fontSize: 12, color: C.gold }}>{trialDays ? `PROVA · ${trialDays} gg` : "PREMIUM"}</span>
        </div>
      ) : (
        <button className="press" data-premium-chip="off" onClick={onPremium} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 20, background: `linear-gradient(rgba(231,179,76,.12), rgba(231,179,76,.12)) ${C.bg}`, border: "1px solid rgba(231,179,76,.35)" }}>
          <Icon name="star" size={13} color={C.gold} />
          <span style={{ fontFamily: F_HEAD, fontWeight: 700, fontSize: 12, color: C.gold }}>Premium</span>
        </button>
      )}
      <button className="press" aria-label="Notifiche" onClick={onBell} style={{ position: "relative", width: 38, height: 38, borderRadius: "50%", background: C.card, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon name="bell" size={16} />
        {unread > 0 && <span style={{ position: "absolute", top: 6, right: 7, width: 8, height: 8, borderRadius: "50%", background: C.accent, border: "1.5px solid " + C.bg }} />}
      </button>
      <button className="press" aria-label="Profilo" onClick={onProfile} style={{ width: 38, height: 38, borderRadius: "50%", background: C.card, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon name="person" size={16} />
      </button>
    </div>
  );
}

const TABS = [
  { id: "home", label: "HOME", icon: "home" },
  { id: "garage", label: "GARAGE", icon: "garage" },
  { id: "fanta", label: "FANTA", icon: "trophy" },
  { id: "race", label: "RACE", icon: "flag" },
];

function BottomNav({ active, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "10px 8px 14px", borderTop: `1px solid ${C.border}`, background: C.bg, flexShrink: 0 }}>
      {TABS.map(t => {
        const on = t.id === active;
        return (
          <button key={t.id} className="press" data-nav-tab={t.id} onClick={() => onChange(t.id)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "6px 0" }}>
            {on ? (
              <div style={{ width: 34, height: 26, borderRadius: 9, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name={t.icon} size={16} color="#fff" sw={2.3} />
              </div>
            ) : <Icon name={t.icon} size={18} color={C.dim} />}
            <span style={{ fontFamily: F_HEAD, fontWeight: 700, fontSize: 9, color: on ? C.text : C.dim, letterSpacing: .4 }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function FeatureRow({ icon, title, starIcon }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 4px", borderBottom: `1px solid ${C.divider}` }}>
      {starIcon ? <Icon name="star" size={18} color={C.gold} /> : <Icon name={icon} size={18} color={C.text} />}
      <span style={{ flex: 1, fontFamily: F_BODY, fontWeight: 500, fontSize: 13.5, color: C.text }}>{title}</span>
      <Icon name="check" size={15} color={C.green} sw={2.6} />
    </div>
  );
}

function PremiumLockCard({ icon, title, desc, onPremium }) {
  return (
    <button className="press" onClick={onPremium} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: 14, borderRadius: 16, background: "rgba(231,179,76,.08)", border: "1px solid rgba(231,179,76,.25)", textAlign: "left" }}>
      <div style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(231,179,76,.16)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon name={icon} size={17} color={C.gold} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 13, color: C.text }}>{title}</span>
          <Icon name="lock" size={11} color={C.gold} />
        </div>
        <p style={{ margin: "2px 0 0", fontFamily: F_BODY, fontSize: 11.5, color: C.muted, lineHeight: 1.4 }}>{desc}</p>
      </div>
      <Icon name="chevron" size={16} color={C.gold} />
    </button>
  );
}

/* ── HASHTAG / PREFERITI ───────────────────────────────────────────── */
// Converte gli id di scuderie e piloti di un articolo in hashtag cliccabili
function articleTags(a) {
  const t = (a.teams || []).map(id => teamById(id)).filter(Boolean).map(x => ({ key: "t:" + x.id, label: x.tag, color: x.color }));
  const d = (a.drivers || []).map(id => driverById(id)).filter(Boolean).map(x => ({ key: "d:" + x.id, label: x.tag, color: x.color }));
  const c = (a.circuits || []).map(circuitTagOf).filter(Boolean);
  return [...t, ...d, ...c];
}

// Ricerca articoli: minuscole e senza accenti ("velocita" trova "velocità").
const normText = s => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const articleText = a => normText([a.title, a.excerpt, a.body, a.cat, a.author,
  ...(a.drivers || []).map(id => { const d = driverById(id); return d ? d.full + " " + d.tag : id; }),
  ...(a.teams || []).map(id => { const t = teamById(id); return t ? t.name + " " + t.tag : id; }),
  ...(a.circuits || []).map(id => circuitText(id))].join(" "));

/* ── CONDIVIDI E SCARICA GLI ARTICOLI (immagine della notizia, senza filigrana) ── */
// Link condiviso: la pagina pubblica dell'app. Quando l'app sarà sul Play Store, qui andrà il link della scheda.
const SHARE_URL = SITE_URL + "/";
const shareMessage = (a, handle) => `${a.title}\n${a.excerpt || ""}\n\nLeggilo su B&T App e seguici su Instagram${handle ? " @" + handle : ""}`;
const shareTargets = (a, handle) => {
  const enc = encodeURIComponent, msg = shareMessage(a, handle);
  return [
    { id: "whatsapp", label: "WhatsApp", href: "https://wa.me/?text=" + enc(msg + "\n" + SHARE_URL) },
    { id: "telegram", label: "Telegram", href: "https://t.me/share/url?url=" + enc(SHARE_URL) + "&text=" + enc(msg) },
    { id: "x", label: "X", href: "https://x.com/intent/tweet?text=" + enc(a.title) + "&url=" + enc(SHARE_URL) },
    { id: "facebook", label: "Facebook", href: "https://www.facebook.com/sharer/sharer.php?u=" + enc(SHARE_URL) },
  ];
};
// Dentro una cornice (come l'anteprima in Claude) la condivisione del telefono e i download diretti non funzionano.
const IS_FRAMED = (() => { try { return window.top !== window.self; } catch (e) { return true; } })();
const nativeShareKind = () => {
  try { if (window.Capacitor?.isNativePlatform?.() && window.Capacitor?.Plugins?.Share) return "app"; } catch (e) {}
  return !IS_FRAMED && typeof navigator.share === "function" ? "web" : null;
};
async function shareNative(data) {
  try {
    const S = window.Capacitor?.Plugins?.Share;
    if (window.Capacitor?.isNativePlatform?.() && S) await S.share({ ...data, dialogTitle: "Condividi articolo" });
    else await navigator.share(data);
    return "ok";
  } catch (e) { return e && e.name === "AbortError" ? "cancel" : "fail"; }
}
// Copia negli appunti. Va chiamata subito nel tocco; se l'app lo impedisce restituisce false.
function copyText(t) {
  const legacy = () => {
    try {
      const ta = document.createElement("textarea"); ta.value = t; ta.setAttribute("readonly", "");
      ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select();
      const ok = document.execCommand("copy"); ta.remove(); return !!ok;
    } catch (e) { return false; }
  };
  try { if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t).then(() => true, legacy); } catch (e) {}
  return Promise.resolve(legacy());
}
// Salvataggio file: dentro Claude con la funzione "scarica" (chiede conferma); in un browser normale, download classico.
let downloadsPromise = null;
const getDownloads = () => {
  if (!downloadsPromise) downloadsPromise = (window.claude && typeof window.claude.use === "function") ? window.claude.use("downloads").catch(() => null) : Promise.resolve(null);
  return downloadsPromise;
};
async function saveFile(filename, blob) {
  const dl = await getDownloads();
  if (dl) { await dl.save({ filename, data: blob }); return; }
  if (IS_FRAMED) throw { code: "unavailable" };
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
const articleFileName = a => "bt-app-" + (normText(a.title).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/, "") || "articolo") + ".png";

// Immagine dell'articolo: 1080 px di larghezza, alta quanto serve. Niente filigrana: logo B&T in alto, Instagram in fondo.
const IMG_W = 1080, IMG_PAD = 72, IMG_TW = IMG_W - IMG_PAD * 2;
const CF_HEAD = "'Titillium Web', sans-serif", CF_BODY = "'Work Sans', sans-serif";
const loadImage = src => new Promise(res => {
  if (!src) return res(null);
  const im = new Image();
  if (!/^(data|blob):/.test(src)) im.crossOrigin = "anonymous";
  im.onload = () => res(im); im.onerror = () => res(null); im.src = src;
});
function wrapText(ctx, text, maxW) {
  const lines = []; let line = "";
  for (let w of String(text || "").split(/\s+/).filter(Boolean)) {
    while (ctx.measureText(w).width > maxW && w.length > 2) {          // parola più lunga della riga (es. un link)
      let i = w.length - 1; while (i > 1 && ctx.measureText(w.slice(0, i)).width > maxW) i--;
      if (line) { lines.push(line); line = ""; }
      lines.push(w.slice(0, i)); w = w.slice(i);
    }
    const t = line ? line + " " + w : w;
    if (!line || ctx.measureText(t).width <= maxW) line = t; else { lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  return lines;
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function paintBadge(ctx, x, y, size) {
  ctx.fillStyle = C.accent; roundRect(ctx, x, y, size, size, size * .26); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.font = `italic 900 ${Math.round(size * .38)}px ${CF_HEAD}`; ctx.textAlign = "center";
  ctx.fillText("B&T", x + size / 2, y + size * .63); ctx.textAlign = "left";
}
function drawArticle(ctx, paint, a, { locked, handle, photo }) {
  const tags = articleTags(a);
  let y = 56;
  if (paint) {
    paintBadge(ctx, IMG_PAD, y, 92);
    ctx.fillStyle = C.text; ctx.font = `italic 900 40px ${CF_HEAD}`; ctx.fillText("B&T APP", IMG_PAD + 120, y + 42);
    ctx.fillStyle = C.muted; ctx.font = `600 26px ${CF_BODY}`; ctx.fillText(handle ? "@" + handle + " · news di Formula 1" : "News di Formula 1", IMG_PAD + 120, y + 80);
  }
  y += 92 + 44;
  if (paint) { ctx.fillStyle = "rgba(255,255,255,.08)"; ctx.fillRect(IMG_PAD, y, IMG_TW, 2); }
  y += 54;
  ctx.font = `800 24px ${CF_HEAD}`;
  const catW = ctx.measureText(a.cat).width + 44;
  if (paint) { ctx.fillStyle = C.accent; roundRect(ctx, IMG_PAD, y, catW, 48, 12); ctx.fill(); ctx.fillStyle = "#fff"; ctx.fillText(a.cat, IMG_PAD + 22, y + 33); }
  y += 48 + 12;
  ctx.font = `italic 900 66px ${CF_HEAD}`;
  for (const l of wrapText(ctx, a.title, IMG_TW)) { y += 76; if (paint) { ctx.fillStyle = C.text; ctx.fillText(l, IMG_PAD, y); } }
  if (a.excerpt) {
    y += 16; ctx.font = `500 34px ${CF_BODY}`;
    for (const l of wrapText(ctx, a.excerpt, IMG_TW)) { y += 48; if (paint) { ctx.fillStyle = C.muted; ctx.fillText(l, IMG_PAD, y); } }
  }
  y += 50; ctx.font = `500 26px ${CF_BODY}`;
  if (paint) { ctx.fillStyle = C.dim; ctx.fillText((a.author ? a.author + " · " : "") + (a.time || ""), IMG_PAD, y); }
  if (tags.length) {
    y += 28; ctx.font = `700 24px ${CF_BODY}`; let x = IMG_PAD;
    for (const t of tags) {
      const w = ctx.measureText(t.label).width + 66;
      if (x + w > IMG_W - IMG_PAD) { x = IMG_PAD; y += 60; }
      if (paint) {
        ctx.fillStyle = "rgba(255,255,255,.06)"; roundRect(ctx, x, y, w, 48, 24); ctx.fill();
        ctx.strokeStyle = t.color + "88"; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = t.color; ctx.beginPath(); ctx.arc(x + 26, y + 24, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.text; ctx.fillText(t.label, x + 42, y + 33);
      }
      x += w + 12;
    }
    y += 48;
  }
  y += 40;
  const heroH = photo ? Math.round(IMG_TW * 9 / 16) : 300;
  if (paint) {
    ctx.save(); roundRect(ctx, IMG_PAD, y, IMG_TW, heroH, 36); ctx.clip();
    if (photo) {
      const s = Math.max(IMG_TW / photo.naturalWidth, heroH / photo.naturalHeight), dw = photo.naturalWidth * s, dh = photo.naturalHeight * s;
      ctx.drawImage(photo, IMG_PAD + (IMG_TW - dw) / 2, y + (heroH - dh) / 2, dw, dh);
    } else {
      const g = ctx.createLinearGradient(IMG_PAD, y, IMG_PAD + IMG_TW * .7, y + heroH); g.addColorStop(0, "#3a0a0c"); g.addColorStop(.7, "#0f0f12");
      ctx.fillStyle = g; ctx.fillRect(IMG_PAD, y, IMG_TW, heroH);
      ctx.fillStyle = "rgba(255,255,255,.06)"; ctx.font = `italic 900 150px ${CF_HEAD}`; ctx.textAlign = "center"; ctx.fillText("B&T", IMG_W / 2, y + heroH / 2 + 52); ctx.textAlign = "left";
    }
    ctx.restore();
  }
  y += heroH + 20;
  if (locked) {
    ctx.font = `400 30px ${CF_BODY}`;
    const ls = wrapText(ctx, "Questo articolo è riservato agli abbonati B&T Premium: leggilo nell'app B&T.", IMG_TW - 80);
    const boxH = 96 + ls.length * 44 + 30;
    y += 30;
    if (paint) {
      ctx.fillStyle = "rgba(231,179,76,.10)"; roundRect(ctx, IMG_PAD, y, IMG_TW, boxH, 28); ctx.fill();
      ctx.strokeStyle = "rgba(231,179,76,.45)"; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = C.gold; ctx.font = `800 30px ${CF_HEAD}`; ctx.fillText("CONTENUTO PREMIUM", IMG_PAD + 40, y + 64);
      ctx.font = `400 30px ${CF_BODY}`; ctx.fillStyle = "#D8D8DA";
      ls.forEach((l, i) => ctx.fillText(l, IMG_PAD + 40, y + 110 + i * 44));
    }
    y += boxH + 20;
  } else {
    ctx.font = `400 34px ${CF_BODY}`;
    for (const p of String(a.body || "").split("\n\n")) {
      y += 10;
      for (const l of wrapText(ctx, p, IMG_TW)) { y += 54; if (paint) { ctx.fillStyle = "#D8D8DA"; ctx.fillText(l, IMG_PAD, y); } }
      y += 20;
    }
  }
  y += 30;
  if (paint) {
    ctx.fillStyle = C.card; roundRect(ctx, IMG_PAD, y, IMG_TW, 164, 32); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.08)"; ctx.lineWidth = 2; ctx.stroke();
    paintBadge(ctx, IMG_PAD + 34, y + 36, 92);
    ctx.fillStyle = C.text; ctx.font = `italic 900 38px ${CF_HEAD}`; ctx.fillText("Letto su B&T App", IMG_PAD + 152, y + 76);
    ctx.fillStyle = C.gold; ctx.font = `600 28px ${CF_BODY}`; ctx.fillText(handle ? "Seguici su Instagram @" + handle : "La community B&T di Formula 1", IMG_PAD + 152, y + 120);
  }
  y += 164 + 14;
  ctx.font = `400 22px ${CF_BODY}`;
  for (const l of wrapText(ctx, F1_DISCLAIMER.split(". ")[0] + ".", IMG_TW)) { y += 32; if (paint) { ctx.fillStyle = C.dim; ctx.fillText(l, IMG_PAD, y); } }
  return y + 56;
}
async function renderArticleImage(a, opts) {
  try {
    await Promise.race([Promise.all([`italic 900 66px 'Titillium Web'`, `800 24px 'Titillium Web'`, `400 34px 'Work Sans'`, `600 28px 'Work Sans'`].map(f => document.fonts.load(f))),
      new Promise(r => setTimeout(r, 2500))]);
  } catch (e) {}
  const paintAll = photo => {
    const o = { ...opts, photo };
    const H = Math.ceil(drawArticle(document.createElement("canvas").getContext("2d"), false, a, o));
    const cv = document.createElement("canvas"); cv.width = IMG_W; cv.height = H;
    const ctx = cv.getContext("2d"); ctx.fillStyle = C.bg; ctx.fillRect(0, 0, IMG_W, H);
    drawArticle(ctx, true, a, o);
    return cv;
  };
  const photo = await loadImage(a.image);
  let cv = paintAll(photo), preview;
  try { preview = cv.toDataURL("image/jpeg", .85); }
  catch (e) { cv = paintAll(null); preview = cv.toDataURL("image/jpeg", .85); }   // foto di un altro sito che non si può esportare
  const blob = await new Promise((res, rej) => cv.toBlob(b => b ? res(b) : rej(new Error("immagine non creata")), "image/png"));
  return { blob, preview, width: cv.width, height: cv.height };
}

// Segnalibro per salvare un articolo tra i preferiti (sopra la card, non dentro il suo bottone).
function SaveBtn({ a, saved, onToggle, style }) {
  return (
    <button className="press" aria-label={`${saved ? "Togli dai preferiti" : "Salva tra i preferiti"}: ${a.title}`} onClick={() => onToggle && onToggle(a.id)}
      style={{ position: "absolute", width: 40, height: 40, borderRadius: 12, background: "rgba(10,10,12,.62)", border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2, ...style }}>
      <Icon name={saved ? "bookmark-fill" : "bookmark"} size={16} color={saved ? C.gold : "#fff"} />
    </button>
  );
}

function HashtagChips({ tags, onTag, size = "md" }) {
  if (!tags.length) return null;
  const small = size === "sm";
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: small ? 4 : 6 }}>
      {tags.map(t => (
        <span key={t.key} role="button" tabIndex={0} className="press"
          onClick={e => { e.stopPropagation(); onTag && onTag(t); }}
          onKeyDown={e => { if (e.key === "Enter") { e.stopPropagation(); onTag && onTag(t); } }}
          style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: small ? "2px 7px" : "4px 10px", borderRadius: 999, background: "rgba(255,255,255,.06)", border: `1px solid ${t.color}55`, fontFamily: F_BODY, fontWeight: 700, fontSize: small ? 10 : 11.5, color: C.text, cursor: "pointer" }}>
          <span style={{ width: small ? 5 : 6, height: small ? 5 : 6, borderRadius: "50%", background: t.color }} />{t.label}
        </span>
      ))}
    </div>
  );
}

// Foto tonda del pilota (volto), con anello del colore della scuderia
function Headshot({ driver, size = 32 }) {
  if (!driver) return <span style={{ width: size, height: size, borderRadius: "50%", background: "rgba(255,255,255,.1)", flexShrink: 0 }} />;
  const ring = Math.max(2, Math.round(size / 14));
  // Foto piccola = il casco del pilota; se manca, il volto; altrimenti le iniziali.
  const kind = driver.helmet ? "casco" : driver.avatar ? "volto" : driver.photo ? "foto" : "iniziali";
  const bg = driver.helmet ? `#1c1c20 url(${driver.helmet}) 50% 55% / 86% auto no-repeat`
    : driver.avatar ? `#1c1c20 url(${driver.avatar}) center / cover no-repeat`
    : driver.photo ? `#1c1c20 url(${driver.photo}) 50% 3% / 190% auto no-repeat` : "#26262b";
  return (
    <span aria-hidden="true" style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, padding: ring, background: driver.color, display: "inline-block", boxSizing: "border-box" }}>
      <span data-img={kind} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", borderRadius: "50%", background: bg, overflow: "hidden" }}>
        {kind === "iniziali" && <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: size * .34, color: C.muted }}>{driver.full.split(" ").map(w => w[0]).slice(-2).join("")}</span>}
      </span>
    </span>
  );
}

function Toggle({ on, onChange, disabled, label }) {
  return (
    <button className="press" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => !disabled && onChange(!on)}
      style={{ width: 44, height: 26, borderRadius: 13, background: on && !disabled ? C.accent : "rgba(255,255,255,.14)", position: "relative", flexShrink: 0, opacity: disabled ? .45 : 1, transition: "background .2s" }}>
      <span style={{ position: "absolute", top: 3, left: on && !disabled ? 21 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
    </button>
  );
}

function PickerModal({ title, options, selected, onPick, onClose }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 620, display: "flex", alignItems: "flex-end" }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="scrollcol" style={{ background: C.card, borderRadius: "24px 24px 0 0", width: "100%", maxHeight: "80%", padding: "20px 0 16px" }}>
        <div style={{ display: "flex", alignItems: "center", padding: "0 20px 12px" }}>
          <h2 style={{ flex: 1, fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 17, color: C.text, margin: 0 }}>{title}</h2>
          <button className="press" aria-label="Chiudi" onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="close" size={13} sw={2.2} /></button>
        </div>
        {options.map(o => (
          <button key={o.id} className="press" onClick={() => { onPick(o.id); onClose(); }} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "11px 20px", textAlign: "left", background: selected === o.id ? "rgba(232,18,29,.08)" : "transparent" }}>
            {o.driver ? <Headshot driver={o.driver} size={32} /> : <span style={{ width: 12, height: 12, borderRadius: "50%", background: o.color, flexShrink: 0 }} />}
            <span style={{ flex: 1, fontFamily: F_BODY, fontWeight: 600, fontSize: 14, color: C.text }}>{o.label}</span>
            {o.sub && <span style={{ fontFamily: F_BODY, fontSize: 11, color: C.dim }}>{o.sub}</span>}
            {selected === o.id && <Icon name="check" size={15} color={C.accent} sw={2.4} />}
          </button>
        ))}
      </div>
    </div>
  );
}

function SectionLabel({ icon, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px 12px" }}>
      <Icon name={icon} size={15} color={C.gold} />
      <h2 style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 16, color: C.text, margin: 0 }}>{children}</h2>
    </div>
  );
}

/* ── SCREENS ────────────────────────────────────────────────────────── */
/* ── ABOUT YOU: da quanto segui la F1 e che tifoso sei (registrazione e profilo) ── */
const FOLLOW_STEPS = ["Meno di 1 anno", "1 – 3 anni", "4 – 6 anni", "7 – 10 anni", "Più di 10 anni"];
const FAN_TYPES = [["vivo", "Vivo e respiro F1!"], ["vroom", "Se fa Vroom è bello"], ["matricola", "Matricola delle 4 ruote"], ["nuovo", "Nuovo sport da seguire"]];
const ABOUT_INIT = { birth: null, follow: 1, fan: "vivo" };   // profilo di prova (accesso senza registrazione)
const BIRTH_YEARS = Array.from({ length: 2016 - 1935 + 1 }, (_, i) => 2016 - i);
const fanLabel = id => (FAN_TYPES.find(f => f[0] === id) || [null, "—"])[1];
function FollowSlider({ id, value, onChange }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
        <label htmlFor={id} style={{ fontFamily: F_BODY, fontWeight: 600, fontSize: 12, color: C.muted }}>Da quanto segui la F1</label>
        <span data-follow-label="" style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 13.5, color: C.text }}>{FOLLOW_STEPS[value]}</span>
      </div>
      <input id={id} type="range" min="0" max={FOLLOW_STEPS.length - 1} step="1" value={value} aria-valuetext={FOLLOW_STEPS[value]} onChange={e => onChange(Number(e.target.value))} style={{ width: "100%", accentColor: C.accent, margin: "4px 0" }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: F_BODY, fontSize: 10, color: C.dim }}><span>meno di 1 anno</span><span>più di 10 anni</span></div>
    </div>
  );
}
function FanTypePicker({ value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Che tifoso sei" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      {FAN_TYPES.map(([id, label]) => {
        const on = value === id;
        return <button key={id} type="button" className="press" role="radio" aria-checked={on ? "true" : "false"} aria-pressed={on ? "true" : "false"} data-fan-option={id} onClick={() => onChange(id)} style={{ padding: "11px 8px", borderRadius: 12, background: on ? "rgba(232,18,29,.16)" : C.card, border: `1px solid ${on ? C.accent : C.border}`, fontFamily: F_BODY, fontWeight: 700, fontSize: 12, color: on ? C.text : C.muted, textAlign: "center", lineHeight: 1.3 }}>{label}</button>;
      })}
    </div>
  );
}
// Scheda "About You" del profilo, come nell'app ufficiale: anno di nascita, da quanto segui la F1, tipo di tifoso.
function AboutCard({ about, onSave }) {
  const a = about || ABOUT_INIT;
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState(a);
  const row = (key, label, value, first) => (
    <div key={key} data-about-row={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 16px", borderTop: first ? "none" : `1px solid ${C.divider}` }}>
      <span style={{ fontFamily: F_BODY, fontSize: 13.5, color: C.dim, whiteSpace: "nowrap" }}>{label}</span>
      <span style={{ fontFamily: F_BODY, fontWeight: 600, fontSize: 14.5, color: C.text, textAlign: "right" }}>{value}</span>
    </div>
  );
  const small = { fontFamily: F_BODY, fontWeight: 600, fontSize: 12, color: C.muted };
  return (
    <div data-about="" style={{ margin: "0 20px 22px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "0 2px" }}>
        <span style={{ fontFamily: F_BODY, fontWeight: 600, fontSize: 15, color: C.muted }}>About You</span>
        <div style={{ flex: 1 }} />
        {!edit && <button className="press" aria-label="Modifica About You" onClick={() => { setDraft(a); setEdit(true); }} style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: F_HEAD, fontWeight: 800, fontSize: 14, color: C.gold }}><Icon name="edit" size={14} color={C.gold} sw={2.2} />Modifica</button>}
      </div>
      <div style={{ borderRadius: 18, background: C.card, border: `1px solid ${C.border}`, overflow: "hidden" }}>
        {edit ? (
          <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label htmlFor="aboutBirth" style={{ ...small, display: "block", marginBottom: 6 }}>Anno di nascita</label>
              <select id="aboutBirth" value={draft.birth ? String(draft.birth) : ""} onChange={e => { const v = e.target.value; setDraft(d => ({ ...d, birth: v ? Number(v) : null })); }} style={{ width: "100%", padding: "11px 12px", borderRadius: 12, background: C.bg, border: `1px solid ${C.border}`, fontFamily: F_BODY, fontSize: 14, color: C.text }}>
                <option value="">Non indicato</option>
                {BIRTH_YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
              </select>
            </div>
            <FollowSlider id="aboutFollow" value={draft.follow} onChange={v => setDraft(d => ({ ...d, follow: v }))} />
            <div>
              <div style={{ ...small, marginBottom: 8 }}>Che tifoso sei?</div>
              <FanTypePicker value={draft.fan} onChange={v => setDraft(d => ({ ...d, fan: v }))} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="press" onClick={() => setEdit(false)} style={{ flex: 1, padding: "12px 0", borderRadius: 12, background: "rgba(255,255,255,.06)", border: `1px solid ${C.border}`, fontFamily: F_HEAD, fontWeight: 800, fontSize: 13, color: C.muted }}>Annulla</button>
              <button className="press" onClick={() => { onSave && onSave(draft); setEdit(false); }} style={{ flex: 1, padding: "12px 0", borderRadius: 12, background: C.accent, fontFamily: F_HEAD, fontWeight: 800, fontSize: 13, color: "#fff" }}>Salva</button>
            </div>
          </div>
        ) : (
          <>
            {row("birth", "Anno di nascita", a.birth || "—", true)}
            {row("follow", "Segue F1", FOLLOW_STEPS[a.follow] || "—")}
            {row("fan", "Tipo fan", fanLabel(a.fan))}
          </>
        )}
      </div>
    </div>
  );
}

function LoginScreen({ onDone, onGuest, onBack, reason }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [follow, setFollow] = useState(ABOUT_INIT.follow);
  const [fan, setFan] = useState(null);
  const isLogin = mode === "login";

  const submit = () => {
    if (!email.trim() || !pw.trim()) { setErr("Compila email e password."); return; }
    if (!isLogin && (!name.trim() || pw !== pw2)) { setErr(!name.trim() ? "Inserisci il tuo nome." : "Le password non coincidono."); return; }
    if (!isLogin && !fan) { setErr("Scegli che tifoso sei."); return; }
    setErr("");
    // Fino al Task 7 (Firebase Authentication) l'accesso non controlla la password: serve l'email per i dati dell'account.
    onDone({ email: email.trim().toLowerCase(), created: !isLogin, about: isLogin ? null : { birth: null, follow, fan } });
  };

  const fieldStyle = { display: "flex", alignItems: "center", gap: 10, padding: "13px 14px", borderRadius: 14, background: C.card, border: `1px solid ${C.border}` };
  const inputStyle = { flex: 1, minWidth: 0, border: "none", background: "none", outline: "none", fontFamily: F_BODY, fontSize: 14, color: C.text };
  const labelStyle = { display: "block", fontFamily: F_BODY, fontWeight: 600, fontSize: 12, color: C.muted, marginBottom: 6 };

  return (
    <div className="scrollcol" style={{ height: "100%", display: "flex", flexDirection: "column", position: "relative" }}>
      {onBack && (
        <button className="press" aria-label="Torna all'app" onClick={onBack} style={{ position: "absolute", top: 18, left: 16, display: "flex", alignItems: "center", gap: 6, padding: "8px 12px 8px 8px", borderRadius: 999, background: C.card, border: `1px solid ${C.border}`, fontFamily: F_BODY, fontWeight: 600, fontSize: 12, color: C.muted, zIndex: 2 }}>
          <Icon name="back" size={15} color={C.muted} /> Torna all'app
        </button>
      )}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "56px 32px 26px", flexShrink: 0 }}>
        <div style={{ width: 72, height: 72, borderRadius: 19, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 14px 28px -12px ${C.accent}` }}>
          <span style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 24, color: "#fff" }}>B&amp;T</span>
        </div>
        <h1 style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 21, color: C.text, margin: "18px 0 6px", textAlign: "center" }}>
          {isLogin ? "Bentornato su B&T" : "Crea il tuo account"}
        </h1>
        <p style={{ fontFamily: F_BODY, fontSize: 13, color: C.muted, textAlign: "center", lineHeight: 1.5, margin: 0 }}>
          Notizie, classifiche live, FantaF1 e la community B&amp;T, tutto in un'app.
        </p>
        {reason && <div role="status" style={{ marginTop: 14, padding: "10px 14px", borderRadius: 12, background: "rgba(232,18,29,.1)", border: "1px solid rgba(232,18,29,.35)", fontFamily: F_BODY, fontSize: 12.5, color: C.text, textAlign: "center", lineHeight: 1.45 }}>{reason}</div>}
      </div>

      <div style={{ display: "flex", margin: "0 24px 22px", padding: 4, borderRadius: 14, background: C.card, border: `1px solid ${C.border}`, flexShrink: 0 }}>
        <button className="press" onClick={() => setMode("login")} style={{ flex: 1, padding: "11px 0", borderRadius: 11, background: isLogin ? C.accent : "transparent", fontFamily: F_HEAD, fontWeight: 800, fontSize: 13, color: isLogin ? "#fff" : C.muted, letterSpacing: .3, textAlign: "center" }}>ACCEDI</button>
        <button className="press" onClick={() => setMode("register")} style={{ flex: 1, padding: "11px 0", borderRadius: 11, background: !isLogin ? C.accent : "transparent", fontFamily: F_HEAD, fontWeight: 800, fontSize: 13, color: !isLogin ? "#fff" : C.muted, letterSpacing: .3, textAlign: "center" }}>REGISTRATI</button>
      </div>

      <div style={{ padding: "0 24px" }}>
        {!isLogin && (
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle} htmlFor="regName">Nome</label>
            <div style={fieldStyle}><Icon name="person" size={15} color={C.dim} /><input id="regName" style={inputStyle} placeholder="Il tuo nome" value={name} onChange={e => setName(e.target.value)} /></div>
          </div>
        )}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle} htmlFor="authEmail">Email</label>
          <div style={fieldStyle}><Icon name="mail" size={15} color={C.dim} /><input id="authEmail" type="email" style={inputStyle} placeholder="nome@email.com" value={email} onChange={e => setEmail(e.target.value)} /></div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle} htmlFor="authPw">Password</label>
          <div style={fieldStyle}><Icon name="lock" size={15} color={C.dim} /><input id="authPw" type="password" style={inputStyle} placeholder="••••••••" value={pw} onChange={e => setPw(e.target.value)} /></div>
        </div>
        {!isLogin && (
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle} htmlFor="regPw2">Conferma password</label>
            <div style={fieldStyle}><Icon name="lock" size={15} color={C.dim} /><input id="regPw2" type="password" style={inputStyle} placeholder="••••••••" value={pw2} onChange={e => setPw2(e.target.value)} /></div>
          </div>
        )}
        {!isLogin && (
          <div style={{ marginBottom: 16, padding: 14, borderRadius: 14, background: "rgba(255,255,255,.03)", border: `1px solid ${C.border}` }}>
            <div style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 13.5, color: C.text, marginBottom: 12 }}>Su di te</div>
            <FollowSlider id="regFollow" value={follow} onChange={setFollow} />
            <div style={{ ...labelStyle, marginTop: 16, marginBottom: 8 }}>Che tifoso sei?</div>
            <FanTypePicker value={fan} onChange={setFan} />
          </div>
        )}
        {isLogin && <div style={{ textAlign: "right", marginBottom: 18 }}><button className="press" onClick={() => setInfo(`Per reimpostare la password scrivici a ${CONTACT_EMAIL} dall'indirizzo con cui ti sei registrato: ti aiutiamo noi.`)} style={{ fontFamily: F_BODY, fontWeight: 600, fontSize: 12, color: C.accent, padding: "6px 0" }}>Password dimenticata?</button></div>}
        {info && <p style={{ background: "rgba(255,255,255,.05)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 14px", marginTop: 0, marginBottom: 14, color: C.text, fontSize: 12, lineHeight: 1.5 }}>{info}</p>}
        {err && <p style={{ background: "#E1060018", border: `1px solid ${C.accent}`, borderRadius: 10, padding: "9px 14px", marginTop: 0, marginBottom: 14, color: "#ff6b6b", fontSize: 12, lineHeight: 1.5 }}>{err}</p>}
        <button className="press" onClick={submit} style={{ display: "block", width: "100%", padding: "15px 0", borderRadius: 14, background: C.accent, boxShadow: `0 10px 22px -10px ${C.accent}`, fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 14, color: "#fff", letterSpacing: .3, textAlign: "center", marginBottom: 16 }}>
          {isLogin ? "ACCEDI" : "CREA ACCOUNT"}
        </button>
        <p style={{ textAlign: "center", fontFamily: F_BODY, fontSize: 12, color: C.muted, margin: 0 }}>
          {isLogin ? <>Non hai un account? <button className="press" onClick={() => setMode("register")} style={{ display: "inline", fontFamily: F_BODY, fontWeight: 700, fontSize: 12, color: C.accent }}>Registrati</button></>
                   : <>Hai già un account? <button className="press" onClick={() => setMode("login")} style={{ display: "inline", fontFamily: F_BODY, fontWeight: 700, fontSize: 12, color: C.accent }}>Accedi</button></>}
        </p>
        {onGuest && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "22px 0 16px" }}>
              <span style={{ flex: 1, height: 1, background: C.border }} />
              <span style={{ fontFamily: F_BODY, fontSize: 11, color: C.dim }}>oppure</span>
              <span style={{ flex: 1, height: 1, background: C.border }} />
            </div>
            <button className="press" onClick={onGuest} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "14px 0", borderRadius: 14, background: "transparent", border: `1.5px solid ${C.border}`, fontFamily: F_HEAD, fontWeight: 800, fontStyle: "italic", fontSize: 13.5, color: C.text, letterSpacing: .3 }}>
              <Icon name="person" size={16} /> ENTRA SENZA ACCOUNT
            </button>
            <p style={{ textAlign: "center", fontFamily: F_BODY, fontSize: 11, color: C.dim, lineHeight: 1.45, margin: "8px 8px 0" }}>Puoi leggere news, seguire la gara e le classifiche. Per chat, FantaF1 e preferiti serve un account.</p>
          </>
        )}
      </div>
      <div style={{ flexGrow: 1 }} />
      <p style={{ textAlign: "center", fontFamily: F_BODY, fontSize: 10, color: C.dim, padding: "18px 32px 24px", margin: 0, flexShrink: 0 }}>Anteprima dimostrativa — nessun dato reale viene inviato.</p>
    </div>
  );
}

// Sondaggio: si vota una risposta; quando l'admin segna quella esatta si vede chi ha indovinato (+2 punti FantaF1).
function PollCard({ poll, vote, onVote, title = "SONDAGGIO" }) {
  const total = poll.options.reduce((s, o) => s + (o.base || 0), 0) + (vote ? 1 : 0);
  const pct = o => total ? Math.round(((o.base || 0) + (vote === o.id ? 1 : 0)) / total * 100) : 0;
  const show = !!vote || !!poll.answer;
  const voted = poll.options.find(o => o.id === vote);
  return (
    <div data-poll={poll.id} style={{ padding: 16, borderRadius: 16, background: C.card, border: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <Icon name="poll" size={14} color={C.gold} />
        <span style={{ flex: 1, fontFamily: F_BODY, fontWeight: 700, fontSize: 11, color: C.dim, letterSpacing: 1 }}>{title}</span>
        {!poll.answer && <span style={{ padding: "2px 7px", borderRadius: 6, background: "rgba(231,179,76,.14)", fontFamily: F_HEAD, fontWeight: 800, fontSize: 10, color: C.gold }}>+2 punti se indovini</span>}
      </div>
      <div style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 15, color: C.text, marginBottom: 10 }}>{poll.q}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {poll.options.map(o => {
          const right = poll.answer === o.id, mine = vote === o.id;
          return (
            <button key={o.id} data-poll-option={o.id} className="press" disabled={!!poll.answer} onClick={() => onVote && onVote(poll.id, o.id)} aria-pressed={mine ? "true" : "false"}
              style={{ position: "relative", width: "100%", minHeight: 38, borderRadius: 10, background: "rgba(255,255,255,.05)", border: `1px solid ${right ? TIMING.green : mine ? C.gold : C.border}`, overflow: "hidden", textAlign: "left" }}>
              {show && <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: pct(o) + "%", background: right ? "rgba(62,214,107,.18)" : "rgba(231,179,76,.16)" }} />}
              <span style={{ position: "relative", display: "flex", alignItems: "center", gap: 8, minHeight: 38, padding: "0 12px", fontFamily: F_BODY, fontWeight: 600, fontSize: 12.5, color: C.text }}>
                <span style={{ flex: 1 }}>{o.label}</span>
                {right && <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 9.5, color: TIMING.green }}>RISPOSTA ESATTA</span>}
                {mine && !right && <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 9.5, color: C.gold }}>IL TUO VOTO</span>}
                {show && <span style={{ fontWeight: 800, color: right ? TIMING.green : C.gold, fontVariantNumeric: "tabular-nums" }}>{pct(o)}%</span>}
              </span>
            </button>
          );
        })}
      </div>
      <p style={{ margin: "10px 2px 0", fontFamily: F_BODY, fontSize: 11.5, color: C.muted, lineHeight: 1.45 }}>
        {poll.answer
          ? (vote ? (vote === poll.answer ? <b style={{ color: TIMING.green }}>Hai indovinato! +2 punti FantaF1</b> : "Non hai indovinato questa volta.") : "Il sondaggio è chiuso: non avevi votato.")
          : voted ? <>Il tuo voto: <b style={{ color: C.text }}>{voted.label}</b> · puoi cambiarlo finché la redazione non segna la risposta esatta.</> : "Tocca una risposta per votare."}
      </p>
    </div>
  );
}

function HomeScreen({ ig, onOpenIg, highlights = [], articles, tagFilter, onTag, onClearTag, onOpenArticle, isPremium, onPremium, onToast, onLiveTrack, onGoFanta, saved = [], onToggleSave, savedOnly = false, setSavedOnly, onOpenCircuit, homePoll = null, homeVote = null, onVote }) {
  const [q, setQ] = useState("");
  const visible = articles.filter(a => a.published !== false);
  const byTag = tagFilter ? visible.filter(a => articleTags(a).some(t => t.key === tagFilter.key)) : visible;
  const bySaved = savedOnly ? byTag.filter(a => saved.includes(a.id)) : byTag;
  const nq = normText(q.trim());
  const matches = nq ? bySaved.filter(a => articleText(a).includes(nq)) : bySaved;
  // Anche i circuiti si cercano: per nome, città, paese, GP o hashtag (#Monza).
  const cq = nq.replace(/^#/, "");
  const circuitHits = cq.length >= 3 && !savedOnly ? CIRCUIT_IDS.filter(id => CIRCUIT_INFO[id] && circuitText(id).includes(cq)) : [];
  const listMode = !!(tagFilter || nq || savedOnly);   // ricerca o filtri: elenco semplice, senza articolo in evidenza
  // In grande sempre la notizia più recente; sotto le altre, dalla più nuova alla più vecchia.
  const sorted = BtLogic.newestFirst(matches);
  const featured = listMode ? null : sorted[0] || null;
  const rest = listMode ? sorted : sorted.slice(1);
  const ARCHIVE = [
    { name: "GP d'Australia 2025", winner: "L. Norris" },
    { name: "GP di Cina 2025", winner: "O. Piastri" },
    { name: "GP del Giappone 2025", winner: "M. Verstappen" },
    { name: "GP del Bahrain 2025", winner: "O. Piastri" },
  ];
  return (
    <div className="scrollcol" style={{ height: "100%" }}>
      <div style={{ display: "flex", gap: 10, padding: "4px 16px 20px" }}>
        <button className="press" onClick={() => isPremium ? onLiveTrack() : onPremium()} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px 0", borderRadius: 14, background: C.accent, boxShadow: `0 10px 22px -10px ${C.accent}` }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />
          <span style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 14, color: "#fff", letterSpacing: .3 }}>LIVE RACE</span>
          {!isPremium && <Icon name="lock" size={11} color="#fff" />}
        </button>
        <button className="press" onClick={onGoFanta} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px 0", borderRadius: 14, background: C.card, border: `1px solid ${C.border}` }}>
          <Icon name="trophy" size={15} />
          <span style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 14, color: C.text, letterSpacing: .3 }}>FANTA F1</span>
        </button>
      </div>

      {!isPremium && (
        <button className="press" onClick={onPremium} style={{ display: "flex", alignItems: "center", gap: 10, width: "calc(100% - 32px)", margin: "0 16px 16px", padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,.04)", border: `1px dashed ${C.border}`, textAlign: "left" }}>
          <span style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 9, color: C.dim, letterSpacing: 1, padding: "2px 6px", borderRadius: 4, background: "rgba(255,255,255,.08)", flexShrink: 0 }}>ADV</span>
          <span style={{ flex: 1, fontFamily: F_BODY, fontSize: 11.5, color: C.dim }}>Spazio pubblicitario — passa a Premium per rimuoverlo.</span>
          <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 10.5, color: C.gold, flexShrink: 0 }}>RIMUOVI</span>
        </button>
      )}

      <SectionLabel icon="flag">ULTIME NEWS</SectionLabel>

      <div style={{ margin: "0 16px 10px" }}>
        <label htmlFor="newsSearch" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}>Cerca articoli</label>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 14px", borderRadius: 14, background: C.card, border: `1px solid ${C.border}` }}>
          <Icon name="search" size={15} color={C.dim} />
          <input id="newsSearch" type="search" placeholder="Cerca articoli, piloti, scuderie…" value={q} onChange={e => setQ(e.target.value)} style={{ flex: 1, minWidth: 0, border: "none", background: "none", outline: "none", fontFamily: F_BODY, fontSize: 13, color: C.text }} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, margin: "0 16px 14px" }}>
        <button className="press" onClick={() => setSavedOnly && setSavedOnly(false)} style={aChip(!savedOnly)}>Tutte</button>
        <button className="press" onClick={() => setSavedOnly && setSavedOnly(true)} style={aChip(savedOnly, C.gold)}><Icon name={savedOnly ? "bookmark-fill" : "bookmark"} size={12} color={savedOnly ? C.gold : C.muted} /> Salvati{saved.length ? ` · ${saved.length}` : ""}</button>
      </div>
      {nq && matches.length > 0 && <p style={{ margin: "0 16px 12px", fontFamily: F_BODY, fontSize: 12, color: C.dim }}>{matches.length} {matches.length === 1 ? "risultato" : "risultati"} per “{q.trim()}”</p>}
      {circuitHits.length > 0 && (
        <div style={{ margin: "0 16px 12px" }}>
          <span style={{ display: "block", fontFamily: F_BODY, fontWeight: 700, fontSize: 10.5, color: C.dim, letterSpacing: 1, margin: "0 2px 8px" }}>CIRCUITI</span>
          {circuitHits.map(id => { const r = raceOfCircuit(id); return (
            <button key={id} className="press" onClick={() => onOpenCircuit && onOpenCircuit(id)} style={{ position: "relative", overflow: "hidden", display: "flex", alignItems: "center", gap: 10, width: "100%", minHeight: 64, padding: "12px 14px", marginBottom: 8, borderRadius: 14, background: C.card, border: `1px solid ${C.border}`, textAlign: "left" }}>
              <CircuitArt circuitId={id} uid={"s" + id} />
              <span style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(13,13,16,.95) 0%, rgba(13,13,16,.78) 60%, rgba(13,13,16,.3) 100%)" }} />
              <span style={{ position: "relative", flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontFamily: F_HEAD, fontWeight: 800, fontSize: 14, color: C.text }}>{CIRCUITS[id].name}</span>
                <span style={{ display: "block", fontFamily: F_BODY, fontSize: 11, color: C.muted, marginTop: 2 }}>{r ? `${r.name} · ${fmtDate(r.date)} · ` : ""}#{CIRCUIT_INFO[id].tag}</span>
              </span>
              <span style={{ position: "relative", display: "inline-flex" }}><Icon name="chevron" size={14} color={C.muted} /></span>
            </button>
          ); })}
        </div>
      )}
      {matches.length === 0 && (nq || savedOnly) && (
        <p style={{ margin: "0 16px 16px", fontFamily: F_BODY, fontSize: 12.5, color: C.dim, lineHeight: 1.55 }}>{nq ? `Nessun articolo trovato per “${q.trim()}”.` : "Non hai ancora salvato articoli: tocca il segnalibro su una notizia per ritrovarla qui."}</p>
      )}

      {tagFilter && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 16px 12px", padding: "10px 12px", borderRadius: 12, background: C.card, border: `1px solid ${tagFilter.color}66` }}>
          <Icon name="hash" size={14} color={tagFilter.color} />
          <span style={{ flex: 1, fontFamily: F_BODY, fontSize: 12.5, color: C.text }}>Notizie con <b>{tagFilter.label}</b> · {matches.length}</span>
          <button className="press" onClick={onClearTag} aria-label="Rimuovi filtro" style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="close" size={11} sw={2.4} /></button>
        </div>
      )}
      {tagFilter && matches.length === 0 && (
        <p style={{ margin: "0 16px 16px", fontFamily: F_BODY, fontSize: 12.5, color: C.dim }}>Nessuna notizia con questo hashtag, per ora.</p>
      )}

      {featured && (
        <div style={{ position: "relative" }}>
        <SaveBtn a={featured} saved={saved.includes(featured.id)} onToggle={onToggleSave} style={{ top: 12, right: 28 }} />
        <button className="press" data-featured={featured.id} onClick={() => onOpenArticle(featured.id)} style={{ display: "block", textAlign: "left", width: "calc(100% - 32px)", margin: "0 16px 14px", borderRadius: 18, overflow: "hidden", background: C.card, border: `1px solid ${C.border}` }}>
          {/* La foto si vede intera, con le sue proporzioni: niente ritagli. */}
          <div style={{ minHeight: featured.image ? 0 : 170, position: "relative", background: featured.image ? "#111" : "linear-gradient(155deg,#3a0a0c 0%,#0f0f12 65%)" }}>
            {featured.image && <img data-news-img="" src={featured.image} alt="" style={{ display: "block", width: "100%", height: "auto", maxHeight: 440, objectFit: "contain", background: "#111" }} />}
            <span style={{ position: "absolute", top: 14, left: 14, padding: "5px 11px", borderRadius: 7, background: C.accent, fontFamily: F_HEAD, fontWeight: 800, fontSize: 10, letterSpacing: 1, color: "#fff" }}>{featured.cat}</span>
            {!featured.image && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                <span style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 60, color: "rgba(255,255,255,.05)" }}>B&amp;T</span>
              </div>
            )}
          </div>
          <div style={{ padding: 16 }}>
            <h3 style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 17, color: C.text, lineHeight: 1.28, margin: "0 0 8px" }}>{featured.title}</h3>
            <p style={{ fontFamily: F_BODY, fontSize: 13, color: C.muted, lineHeight: 1.5, margin: "0 0 10px" }}>{featured.excerpt}</p>
            {articleTags(featured).length > 0 && <div style={{ marginBottom: 10 }}><HashtagChips tags={articleTags(featured)} onTag={onTag} size="sm" /></div>}
            <span style={{ fontFamily: F_BODY, fontSize: 11, color: C.dim }}>{featured.time}</span>
          </div>
        </button>
        </div>
      )}
      {ig && onOpenIg && <IgBigButton ig={ig} onOpen={onOpenIg} />}

      {rest.map(a => (
        <div key={a.id} style={{ position: "relative" }}>
        <SaveBtn a={a} saved={saved.includes(a.id)} onToggle={onToggleSave} style={{ top: 8, right: 24 }} />
        <button className="press" data-news-item={a.id} data-age={String(BtLogic.newsAge(a))} onClick={() => onOpenArticle(a.id)} style={{ display: "flex", textAlign: "left", width: "calc(100% - 32px)", margin: "0 16px 12px", borderRadius: 16, overflow: "hidden", background: C.card, border: `1px solid ${C.border}` }}>
          <div style={{ width: 92, minHeight: 92, flexShrink: 0, position: "relative", background: a.image ? "#111" : "linear-gradient(155deg,#1a1a2e 0%,#0f0f12 70%)" }}>
            {a.image && <img data-news-img="" src={a.image} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />}
            <span style={{ position: "absolute", top: 8, left: 8, padding: "3px 8px", borderRadius: 6, background: a.premium ? "rgba(231,179,76,.2)" : "rgba(255,255,255,.12)", fontFamily: F_HEAD, fontWeight: 800, fontSize: 8, letterSpacing: .8, color: a.premium ? C.gold : "#fff" }}>{a.cat}</span>
          </div>
          <div style={{ flex: 1, padding: "12px 52px 12px 14px", display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0 }}>
            <h3 style={{ fontFamily: F_HEAD, fontWeight: 700, fontSize: 14, color: C.text, lineHeight: 1.3, margin: "0 0 6px" }}>{a.title}</h3>
            {articleTags(a).length > 0 && <div style={{ marginBottom: 6 }}><HashtagChips tags={articleTags(a)} onTag={onTag} size="sm" /></div>}
            <span style={{ fontFamily: F_BODY, fontSize: 11, color: C.dim }}>{a.time}</span>
          </div>
        </button>
        </div>
      ))}

      <SectionLabel icon="star">CONTENUTI PREMIUM</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 16px 20px" }}>
        {homePoll && (isPremium ? (
          <PollCard poll={homePoll} vote={homeVote} onVote={onVote} title="SONDAGGIO DELLA REDAZIONE" />
        ) : (
          <PremiumLockCard icon="poll" title="Sondaggio della redazione" desc="Chi vincerà il prossimo GP? Vota e scopri cosa pensa la community." onPremium={onPremium} />
        ))}

        {isPremium ? (
          <div style={{ padding: 16, borderRadius: 16, background: C.card, border: `1px solid ${C.border}` }}>
            <span style={{ display: "block", fontFamily: F_BODY, fontWeight: 700, fontSize: 11, color: C.dim, letterSpacing: 1, marginBottom: 10 }}>ARCHIVIO STORICO GP</span>
            <div className="scrollcol" style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
              {ARCHIVE.map(g => (
                <button key={g.name} className="press" onClick={() => onToast("Apri " + g.name + " (demo)")} style={{ flexShrink: 0, width: 148, padding: 12, borderRadius: 12, background: "rgba(255,255,255,.04)", border: `1px solid ${C.border}`, textAlign: "left" }}>
                  <span style={{ display: "block", fontFamily: F_HEAD, fontWeight: 700, fontSize: 12, color: C.text, marginBottom: 4 }}>{g.name}</span>
                  <span style={{ display: "block", fontFamily: F_BODY, fontSize: 10.5, color: C.dim }}>Vinto da {g.winner}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <PremiumLockCard icon="history" title="Archivio storico dei GP" desc="Rivivi risultati e highlights di tutte le gare passate." onPremium={onPremium} />
        )}

        {isPremium ? (
          <div style={{ padding: 16, borderRadius: 16, background: C.card, border: `1px solid ${C.border}` }}>
            <span style={{ display: "block", fontFamily: F_BODY, fontWeight: 700, fontSize: 11, color: C.dim, letterSpacing: 1, marginBottom: 10 }}>VIDEO HIGHLIGHTS ESCLUSIVI</span>
            <HighlightsStrip items={highlights} onToast={onToast} />
            <div style={{ display: "none" }}>
              {[].map((g, i) => (
                <button key={i} className="press" onClick={() => onToast("Riproduzione video (demo)")} style={{ flex: 1, height: 64, borderRadius: 10, background: `linear-gradient(155deg, ${g} 0%, #0f0f12 70%)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="play" size={16} color="#fff" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <PremiumLockCard icon="play" title="Video highlights esclusivi" desc="I momenti migliori di ogni gara, montati solo per te." onPremium={onPremium} />
        )}
      </div>
      <p style={{ fontFamily: F_BODY, fontSize: 10, color: C.dim, lineHeight: 1.55, textAlign: "center", margin: "18px 24px 6px" }}>{F1_DISCLAIMER}</p>
      <div style={{ height: 8 }} />
    </div>
  );
}

function ArticleScreen({ article, onBack, isPremium, onPremium, onTag, saved = false, onToggleSave, onShare, vote = null, onVote }) {
  const [zoomed, setZoomed] = useState(false);   // foto a tutto schermo, con lo zoom
  const locked = article.premium && !isPremium;
  const tags = articleTags(article);
  const round = { width: 38, height: 38, borderRadius: "50%", background: C.card, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
  return (
    <div className="scrollcol" style={{ height: "100%" }}>
      <SubHeader title="ARTICOLO" onBack={onBack} right={
        <div style={{ display: "flex", gap: 8 }}>
          <button className="press" aria-label="Condividi articolo" onClick={onShare} style={round}><Icon name="share" size={16} /></button>
          <button className="press" aria-label={saved ? "Togli dai preferiti" : "Salva tra i preferiti"} onClick={onToggleSave} style={round}>
            <Icon name={saved ? "bookmark-fill" : "bookmark"} size={16} color={saved ? C.gold : C.text} />
          </button>
        </div>} />
      <div style={{ padding: "0 20px 28px" }}>
        <span style={{ display: "inline-block", padding: "5px 11px", borderRadius: 7, background: C.accent, fontFamily: F_HEAD, fontWeight: 800, fontSize: 10, letterSpacing: 1, color: "#fff", marginBottom: 12 }}>{article.cat}</span>
        <h1 style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 22, color: C.text, lineHeight: 1.25, margin: "0 0 8px" }}>{article.title}</h1>
        <span style={{ fontFamily: F_BODY, fontSize: 11, color: C.dim }}>{article.author ? article.author + " · " : ""}{article.time}</span>
        {tags.length > 0 && <div style={{ marginTop: 12 }}><HashtagChips tags={tags} onTag={onTag} /></div>}
        {article.image
          ? <button className="press" data-article-zoom="" aria-label="Apri la foto a tutto schermo" onClick={() => setZoomed(true)} style={{ position: "relative", display: "block", width: "100%", margin: "16px 0", padding: 0, borderRadius: 16, cursor: "zoom-in" }}>
              <img data-article-img="" src={article.image} alt="" style={{ display: "block", width: "100%", height: "auto", maxHeight: 560, objectFit: "contain", borderRadius: 16, background: "#111" }} />
              <span aria-hidden="true" style={{ position: "absolute", right: 10, bottom: 10, display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 9px", borderRadius: 999, background: "rgba(0,0,0,.6)", fontFamily: F_BODY, fontWeight: 700, fontSize: 11, color: "#fff" }}><Icon name="search" size={12} color="#fff" /> Tocca per ingrandire</span>
            </button>
          : (
            <div style={{ height: 160, borderRadius: 16, margin: "16px 0", background: "linear-gradient(155deg,#3a0a0c 0%,#0f0f12 70%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 44, color: "rgba(255,255,255,.06)" }}>B&amp;T</span>
            </div>
          )}
        {locked ? (
          <div style={{ padding: 20, borderRadius: 16, background: "rgba(231,179,76,.08)", border: "1px solid rgba(231,179,76,.3)", textAlign: "center" }}>
            <Icon name="lock" size={22} color={C.gold} />
            <p style={{ fontFamily: F_BODY, fontSize: 13, color: C.muted, lineHeight: 1.6, margin: "10px 0 16px" }}>Questo articolo è riservato agli abbonati B&amp;T Premium.</p>
            <button className="press" onClick={onPremium} style={{ padding: "12px 22px", borderRadius: 12, background: C.gold, fontFamily: F_HEAD, fontWeight: 800, fontStyle: "italic", fontSize: 13, color: "#141414" }}>SBLOCCA CON PREMIUM</button>
          </div>
        ) : (
          article.body.split("\n\n").map((p, i) => (
            <p key={i} style={{ fontFamily: F_BODY, fontSize: 14.5, color: "#D8D8DA", lineHeight: 1.75, margin: "0 0 14px" }}>{p}</p>
          ))
        )}
        {article.poll && !locked && <div style={{ margin: "4px 0 14px" }}><PollCard poll={articlePoll(article)} vote={vote} onVote={onVote} /></div>}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10, padding: "14px 16px", borderRadius: 16, background: C.card, border: `1px solid ${C.border}` }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 14, color: C.text }}>Ti è piaciuto?</div>
            <div style={{ fontFamily: F_BODY, fontSize: 12, color: C.muted, lineHeight: 1.45 }}>Condividilo o scaricalo come immagine.</div>
          </div>
          <button className="press" onClick={onShare} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", borderRadius: 12, background: C.accent, fontFamily: F_HEAD, fontWeight: 800, fontSize: 12.5, color: "#fff", flexShrink: 0 }}>
            <Icon name="share" size={14} color="#fff" />CONDIVIDI
          </button>
        </div>
      </div>
      {zoomed && article.image && <ImageViewer src={article.image} onClose={() => setZoomed(false)} />}
    </div>
  );
}

// Foglio "Condividi": anteprima dell'immagine, download, app di messaggi e copia del link.
function ShareSheet({ article, locked, handle, onClose, onToast }) {
  const [img, setImg] = useState(null);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [canDownload, setCanDownload] = useState(!IS_FRAMED);
  const [manual, setManual] = useState(null);
  useEffect(() => {
    let alive = true;
    renderArticleImage(article, { locked, handle }).then(r => { if (alive) setImg(r); }, () => { if (alive) setFailed(true); });
    getDownloads().then(dl => { if (alive) setCanDownload(!!dl || !IS_FRAMED); });
    return () => { alive = false; };
  }, [article.id, locked, handle]);
  useEffect(() => {
    if (!manual) return;
    const t = setTimeout(() => { const el = document.getElementById("shareManual"); if (el) { el.focus(); el.select(); } }, 60);
    return () => clearTimeout(t);
  }, [manual]);
  const msg = shareMessage(article, handle), full = msg + "\n" + SHARE_URL;
  const native = nativeShareKind();
  const copy = () => copyText(full).then(ok => { if (ok) { onToast("Link copiato"); onClose(); } else setManual(full); });
  const other = () => shareNative({ title: article.title, text: msg, url: SHARE_URL }).then(r => { if (r === "ok") onClose(); else if (r === "fail") setManual(full); });
  const download = () => {
    if (!img || saving) return;
    setSaving(true);
    saveFile(articleFileName(article), img.blob).then(() => { setSaving(false); onToast("Immagine scaricata"); onClose(); }, e => {
      setSaving(false);
      const code = e && e.code;
      if (code === "declined") onToast("Download annullato");
      else if (code === "rate_limited") onToast("Attendi un attimo e riprova");
      else if (code === "too_large") onToast("Immagine troppo grande da salvare");
      else { setCanDownload(false); onToast("Download non disponibile qui"); }
    });
  };
  const pill = { display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "12px 10px", borderRadius: 12, background: C.raised, border: `1px solid ${C.border}`, fontFamily: F_BODY, fontWeight: 600, fontSize: 13, color: C.text };
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.72)", zIndex: 620, display: "flex", alignItems: "flex-end" }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="scrollcol" style={{ background: C.card, borderRadius: "24px 24px 0 0", width: "100%", maxHeight: "92%", padding: "18px 18px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 style={{ flex: 1, fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 17, color: C.text, margin: 0 }}>CONDIVIDI ARTICOLO</h2>
          <button className="press" aria-label="Chiudi" onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="close" size={13} sw={2.2} /></button>
        </div>
        <p style={{ fontFamily: F_BODY, fontSize: 12, color: C.muted, margin: "4px 0 12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{article.title}</p>
        <div className="scrollcol" style={{ height: 220, borderRadius: 14, background: C.bg, border: `1px solid ${C.border}` }}>
          {img ? <img src={img.preview} alt="Anteprima dell'immagine della notizia" style={{ display: "block", width: "100%", height: "auto" }} />
            : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, textAlign: "center", fontFamily: F_BODY, fontSize: 12.5, color: C.dim }}>{failed ? "Non è stato possibile creare l'immagine. Puoi comunque condividere il link." : "Preparo l'immagine…"}</div>}
        </div>
        <p style={{ fontFamily: F_BODY, fontSize: 11.5, color: C.dim, lineHeight: 1.45, margin: "8px 2px 12px" }}>L'immagine ha il logo B&amp;T e il nostro Instagram, senza filigrana: perfetta per le storie e per le chat.</p>
        {canDownload && !failed && (
          <button className="press" onClick={download} disabled={!img || saving} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "14px 0", borderRadius: 14, background: C.accent, opacity: img && !saving ? 1 : .6, fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 14, color: "#fff", marginBottom: 16 }}>
            <Icon name="download" size={16} color="#fff" />{saving ? "SALVATAGGIO…" : "SCARICA IMMAGINE"}
          </button>
        )}
        <Eyebrow>INVIA A</Eyebrow>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {shareTargets(article, handle).map(t => (
            <a key={t.id} className="press" href={t.href} target="_blank" rel="noopener noreferrer" onClick={() => setTimeout(onClose, 0)} style={pill}>{t.label}<Icon name="external" size={13} color={C.dim} /></a>
          ))}
          <button className="press" onClick={copy} style={{ ...pill, gridColumn: native ? "auto" : "1 / -1" }}><Icon name="link" size={14} />Copia link</button>
          {native && <button className="press" onClick={other} style={pill}><Icon name="share" size={14} />Altre app</button>}
        </div>
        {manual && (
          <div style={{ marginTop: 14 }}>
            <textarea id="shareManual" aria-label="Testo da copiare" readOnly value={manual} rows={5} style={{ width: "100%", padding: 12, borderRadius: 12, background: C.bg, border: `1px solid ${C.border}`, color: C.text, fontFamily: F_BODY, fontSize: 12.5, lineHeight: 1.45, resize: "none" }} />
            <p style={{ fontFamily: F_BODY, fontSize: 11.5, color: C.dim, margin: "6px 2px 0" }}>Qui non si può copiare in automatico. Tieni premuto sul testo e scegli Copia.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── DIRETTA IN STILE F1DASH ─────────────────────────────────────────── */
const SECTOR_COLORS = ["#E8121D", "#27D8C8", "#F2C230"];   // S1, S2, S3 sulla mappa (confini stimati)
const fmtGap = g => (g == null ? "—" : "+" + g.toFixed(3));

/* ── CIRCUITI: disegno di sfondo, mappa coi settori e scheda "Mostra di più" ── */
// Disegno del circuito: tracciato luminoso sui colori del paese (nessuna foto, nessun problema di diritti).
function CircuitArt({ circuitId, uid = "a" }) {
  const tr = trackOf(circuitId), info = CIRCUIT_INFO[circuitId];
  const [c1, c2] = info ? info.colors : [C.accent, C.gold];
  const g = "art-" + uid + "-" + circuitId;
  return (
    <svg data-race-art="" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}>
      <defs>
        <radialGradient id={g + "1"} cx="22%" cy="18%" r="80%"><stop offset="0" stopColor={c1} stopOpacity=".6" /><stop offset="1" stopColor={c1} stopOpacity="0" /></radialGradient>
        <radialGradient id={g + "2"} cx="92%" cy="92%" r="70%"><stop offset="0" stopColor={c2} stopOpacity=".38" /><stop offset="1" stopColor={c2} stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="1600" height="900" fill="#0D0D10" />
      <rect width="1600" height="900" fill={`url(#${g}1)`} />
      <rect width="1600" height="900" fill={`url(#${g}2)`} />
      {tr && (
        <g transform="translate(560 450) scale(.78) translate(-800 -450)">
          <path d={tr.d} fill="none" stroke="#fff" strokeOpacity=".09" strokeWidth="86" strokeLinejoin="round" />
          <path d={tr.d} fill="none" stroke="#fff" strokeOpacity=".16" strokeWidth="40" strokeLinejoin="round" />
          <path d={tr.d} fill="none" stroke="#fff" strokeOpacity=".9" strokeWidth="13" strokeLinejoin="round" />
        </g>
      )}
    </svg>
  );
}

// Mappa del circuito coi tre settori colorati, la linea del traguardo e il senso di marcia.
function CircuitMap({ track }) {
  const start = track.pointAt(0), after = track.pointAt(40), ahead = track.pointAt(track.lenM * 0.035);
  const ang = Math.atan2(after[1] - start[1], after[0] - start[0]);
  const aDir = Math.atan2(ahead[1] - track.pointAt(track.lenM * 0.02)[1], ahead[0] - track.pointAt(track.lenM * 0.02)[0]);
  const perp = ang + Math.PI / 2;
  const ax = ahead[0] + Math.cos(aDir + Math.PI / 2) * 46, ay = ahead[1] + Math.sin(aDir + Math.PI / 2) * 46;
  const tip = (dx, dy) => `${(ax + dx).toFixed(1)},${(ay + dy).toFixed(1)}`;
  const arrow = [tip(Math.cos(aDir) * 26, Math.sin(aDir) * 26), tip(Math.cos(aDir + 2.5) * 20, Math.sin(aDir + 2.5) * 20), tip(Math.cos(aDir - 2.5) * 20, Math.sin(aDir - 2.5) * 20)].join(" ");
  return (
    <svg data-circuit-map="" viewBox="0 0 1600 900" role="img" aria-label={"Mappa del circuito " + track.name + " con i tre settori"} style={{ display: "block", width: "100%", height: "auto" }}>
      <path d={track.d} fill="none" stroke="#2A2A31" strokeWidth="46" strokeLinejoin="round" />
      {track.sectorD.map((d, i) => <path key={i} d={d} fill="none" stroke={SECTOR_COLORS[i]} strokeWidth="15" strokeLinejoin="round" strokeLinecap="round" />)}
      <line x1={start[0] - Math.cos(perp) * 34} y1={start[1] - Math.sin(perp) * 34} x2={start[0] + Math.cos(perp) * 34} y2={start[1] + Math.sin(perp) * 34} stroke="#fff" strokeWidth="9" strokeLinecap="round" />
      <polygon points={arrow} fill="#fff" />
    </svg>
  );
}

// Giorno e ora di una sessione: ora locale del circuito e ora italiana (con il giorno se cambia).
function sessionTimes(utc, tz) {
  const d = new Date(utc);
  const f = (o, zone) => new Intl.DateTimeFormat("it-IT", { ...o, timeZone: zone }).format(d);
  const d0 = f({ weekday: "short", day: "numeric", month: "short" }, tz), day = d0.charAt(0).toUpperCase() + d0.slice(1);
  const local = f({ hour: "2-digit", minute: "2-digit", hourCycle: "h23" }, tz);
  const italy = f({ hour: "2-digit", minute: "2-digit", hourCycle: "h23" }, "Europe/Rome");
  const itDay = f({ weekday: "short" }, "Europe/Rome"), locDay = f({ weekday: "short" }, tz);
  return { day, local, italy, italyDay: itDay !== locDay ? itDay : null };
}

// Pagina del circuito ("Mostra di più"), come la scheda circuito dell'app F1.
function CircuitScreen({ circuitId, races, articles, onBack, onTag, onOpenArticle }) {
  const info = CIRCUIT_INFO[circuitId], circ = CIRCUITS[circuitId];
  const race = races.find(r => r.circuitId === circuitId) || raceOfCircuit(circuitId);
  const track = trackOf(circuitId);
  const [openQ, setOpenQ] = useState(null);
  if (!info || !circ) return <div style={{ padding: 24 }}><SubHeader title="Circuito" onBack={onBack} /></div>;
  const tag = circuitTagOf(circuitId);
  const related = articles.filter(a => a.published !== false && (a.circuits || []).includes(circuitId));
  const rec = info.lapRecord;
  const stat = (label, value, sub, wide) => (
    <div style={{ gridColumn: wide ? "1 / -1" : "auto", padding: "12px 14px 13px", borderRadius: 14, background: C.card, border: `1px solid ${C.border}` }}>
      <div style={{ fontFamily: F_BODY, fontWeight: 600, fontSize: 11, color: C.dim, marginBottom: 5 }}>{label}</div>
      <div style={{ fontFamily: F_HEAD, fontWeight: 900, fontSize: 21, color: C.text, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub && <div style={{ fontFamily: F_BODY, fontSize: 12, color: C.muted, marginTop: 3 }}>{sub}</div>}
    </div>
  );
  const status = race ? (race.status === "CONCLUSA" ? `Gara disputata il ${fmtDate(race.date)}` : race.status === "LIVE" ? "Weekend in corso" : `In programma il ${fmtDate(race.date)}`) : "";
  return (
    <div data-circuit-page="" className="scrollcol" style={{ height: "100%" }}>
      <SubHeader title={race ? race.name : circ.name} onBack={onBack} />
      <div style={{ position: "relative", margin: "0 16px 14px", height: 190, borderRadius: 18, overflow: "hidden", border: `1px solid ${C.border}` }}>
        <CircuitArt circuitId={circuitId} uid="page" />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(10,10,12,.9) 0%, rgba(10,10,12,.2) 60%, rgba(10,10,12,0) 100%)" }} />
        <div style={{ position: "absolute", left: 14, right: 14, bottom: 12 }}>
          <div style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 19, color: "#fff", lineHeight: 1.15 }}>{circ.name}</div>
          <div style={{ fontFamily: F_BODY, fontSize: 12, color: "rgba(255,255,255,.75)", margin: "3px 0 8px" }}>{race ? race.country + " · " : ""}{status}</div>
          <HashtagChips tags={[tag]} onTag={onTag} size="sm" />
        </div>
      </div>

      <div style={{ padding: "0 16px 4px" }}><Eyebrow>CIRCUITO</Eyebrow></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, margin: "0 16px 16px" }}>
        {stat("Lunghezza del circuito", fmtKm(info.lengthKm), null, true)}
        {stat("Primo Gran Premio", String(info.firstGP))}
        {stat("Numero di giri", String(info.laps))}
        {stat("Record sul giro", rec.time, `${rec.driver} (${rec.year})`)}
        {stat("Distanza di gara", fmtKm(info.distanceKm))}
        {stat("Curve", String(info.corners))}
        {stat("Weekend", info.sprint ? "Sprint" : "Classico", info.sprint ? "Qualifiche Sprint venerdì, Sprint sabato" : "3 sessioni di prove libere")}
      </div>

      {track && (
        <div style={{ margin: "0 16px 16px", padding: "10px 10px 10px", borderRadius: 18, background: C.card, border: `1px solid ${C.border}` }}>
          <CircuitMap track={track} />
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 6, padding: "0 4px", fontFamily: F_BODY, fontSize: 10.5, color: C.dim }}>
            {SECTOR_COLORS.map((c, i) => <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 14, height: 3, borderRadius: 2, background: c }} />Settore {i + 1}</span>)}
            <span style={{ marginLeft: "auto" }}>Settori stimati</span>
          </div>
        </div>
      )}

      {GUIDE()[circuitId] && <>
        <div style={{ padding: "0 16px 4px" }}><Eyebrow>GUIDA 2D INTERATTIVA · PUNTI DI STACCATA</Eyebrow></div>
        <CircuitGuide key={circuitId} circuitId={circuitId} />
        <div style={{ padding: "0 16px 4px" }}><Eyebrow>CIRCUIT SPEC CLASH</Eyebrow></div>
        <SpecClash key={"clash-" + circuitId} a={circuitId} b={circuitId === "it-1922" ? "mc-1929" : "it-1922"} races={races} />
      </>}

      {info.weekend && (
        <>
          <div style={{ padding: "0 16px 4px" }}><Eyebrow>PROGRAMMA DEL WEEKEND</Eyebrow></div>
          <div style={{ margin: "0 16px 16px", borderRadius: 18, background: C.card, border: `1px solid ${C.border}`, overflow: "hidden" }}>
            {info.weekend.map((s, i) => {
              const t = sessionTimes(s.utc, info.tz);
              return (
                <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderTop: i ? `1px solid ${C.divider}` : "none" }}>
                  <span style={{ width: 70, fontFamily: F_BODY, fontWeight: 600, fontSize: 11.5, color: C.dim }}>{t.day}</span>
                  <span style={{ flex: 1, fontFamily: F_HEAD, fontWeight: 800, fontSize: 13.5, color: s.key === "RACE" ? C.accent : C.text }}>{LiveSim.SESSION_LABEL[s.key] || s.key}</span>
                  <span style={{ textAlign: "right", fontFamily: F_BODY, fontSize: 11, color: C.dim, lineHeight: 1.35 }}>
                    <b style={{ fontFamily: F_HEAD, fontSize: 14, color: C.text, fontVariantNumeric: "tabular-nums" }}>{t.local}</b> locale<br />
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>{t.italyDay ? t.italyDay + " " : ""}{t.italy}</span> in Italia
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div style={{ padding: "0 16px 4px" }}><Eyebrow>DOMANDE E RISPOSTE</Eyebrow></div>
      <div style={{ margin: "0 16px 16px", borderRadius: 18, background: C.card, border: `1px solid ${C.border}`, overflow: "hidden" }}>
        {info.faq.map((f, i) => (
          <div key={f.q} style={{ borderTop: i ? `1px solid ${C.divider}` : "none" }}>
            <button className="press" aria-expanded={openQ === i} onClick={() => setOpenQ(openQ === i ? null : i)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "14px 14px", textAlign: "left" }}>
              <span style={{ flex: 1, fontFamily: F_HEAD, fontWeight: 800, fontSize: 14.5, color: C.text }}>{f.q}</span>
              <span style={{ display: "inline-flex", transform: `rotate(${openQ === i ? 270 : 90}deg)`, transition: "transform .2s" }}><Icon name="chevron" size={15} color={C.muted} /></span>
            </button>
            {openQ === i && <p style={{ margin: 0, padding: "0 14px 14px", fontFamily: F_BODY, fontSize: 13, color: C.muted, lineHeight: 1.6 }}>{f.a}</p>}
          </div>
        ))}
      </div>

      <div style={{ padding: "0 16px 4px" }}><Eyebrow>ARTICOLI CORRELATI</Eyebrow></div>
      <div style={{ margin: "0 16px 12px" }}>
        {related.length ? related.map(a => (
          <button key={a.id} className="press" onClick={() => onOpenArticle(a.id)} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "11px 12px", marginBottom: 8, borderRadius: 14, background: C.card, border: `1px solid ${C.border}`, textAlign: "left" }}>
            <span style={{ width: 54, height: 54, flexShrink: 0, borderRadius: 10, background: a.image ? `#111 url(${a.image}) center / contain no-repeat` : "linear-gradient(155deg,#1a1a2e 0%,#0f0f12 70%)" }} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontFamily: F_HEAD, fontWeight: 700, fontSize: 13.5, color: C.text, lineHeight: 1.3 }}>{a.title}</span>
              <span style={{ display: "block", fontFamily: F_BODY, fontSize: 11, color: C.dim, marginTop: 3 }}>{a.cat} · {a.time}</span>
            </span>
            <Icon name="chevron" size={14} color={C.dim} />
          </button>
        )) : <p style={{ margin: "0 2px", fontFamily: F_BODY, fontSize: 12.5, color: C.dim }}>Nessun articolo con {tag.label}, per ora.</p>}
      </div>
      <p style={{ margin: "4px 20px 22px", fontFamily: F_BODY, fontSize: 10.5, color: C.dim, lineHeight: 1.5 }}>Dati del circuito: formula1.com e Wikipedia, aggiornati al 29 settembre 2026. Tracciato: f1-circuits (licenza MIT).</p>
    </div>
  );
}

// Mappa del circuito con i puntini dei piloti. Il tracciato prende il colore della bandiera.
function LiveMap({ track, st, big, svgStyle }) {
  const flag = st ? st.flag : "green";
  const color = i => {
    if (!st) return "rgba(255,255,255,.34)";
    if (flag === "red") return FLAG_UI.red.color;
    if (flag === "sc" || flag === "vsc") return FLAG_UI.sc.color;
    if (flag === "yellow") return st.flagSector === i + 1 ? FLAG_UI.yellow.color : "rgba(255,255,255,.26)";
    return SECTOR_COLORS[i];
  };
  const start = track.pointAt(0), after = track.pointAt(40);
  const ang = Math.atan2(after[1] - start[1], after[0] - start[0]) + Math.PI / 2;
  const cars = st ? st.cars.filter(c => !c.dnf && (!c.pit || flag === "red")) : [];
  const r = big ? 15 : 19, fs = big ? 30 : 40;
  return (
    <svg data-live-map="" viewBox="0 0 1600 900" role="img" aria-label={"Mappa del circuito " + track.name} style={{ display: "block", width: "100%", height: "auto", ...svgStyle }}>
      <path d={track.d} fill="none" stroke="#24242B" strokeWidth={big ? 34 : 44} strokeLinejoin="round" />
      {track.sectorD.map((d, i) => <path key={i} d={d} fill="none" stroke={color(i)} strokeWidth={big ? 12 : 16} strokeLinejoin="round" strokeLinecap="round" />)}
      <line x1={start[0] - Math.cos(ang) * 30} y1={start[1] - Math.sin(ang) * 30} x2={start[0] + Math.cos(ang) * 30} y2={start[1] + Math.sin(ang) * 30} stroke="#fff" strokeWidth="8" strokeLinecap="round" />
      {cars.slice().reverse().map(c => (
        <g key={c.id} data-car={c.code} data-pos={Math.round(c.x) + "," + Math.round(c.y)} style={{ transform: `translate(${c.x.toFixed(1)}px, ${c.y.toFixed(1)}px)`, transition: "transform .25s linear" }}>
          <circle r={r} fill={c.color} stroke="#0A0A0C" strokeWidth="5" />
          <text x={r + 6} y={-r + 2} fill={c.color} fontSize={fs} fontWeight="700" fontFamily="'Work Sans', sans-serif" stroke="#0A0A0C" strokeWidth="9" paintOrder="stroke">{c.code}</text>
        </g>
      ))}
    </svg>
  );
}

// Avviso della bandiera in corso (o del giro a scacchi).
function FlagBanner({ st, style }) {
  if (!st) return null;
  const labels = { yellow: "BANDIERA GIALLA" + (st.flagSector ? " · SETTORE " + st.flagSector : ""), sc: "SAFETY CAR", vsc: "VIRTUAL SAFETY CAR", red: "BANDIERA ROSSA" };
  const ui = FLAG_UI[st.flag];
  if (ui) return <div role="status" style={{ padding: "9px 12px", borderRadius: 10, background: ui.color, fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 13.5, letterSpacing: .6, color: ui.ink, textAlign: "center", ...style }}>{labels[st.flag]}</div>;
  if (st.bg !== "chequered") return null;
  const txt = st.finished || !isRaceType(st.type) ? "BANDIERA A SCACCHI" : st.lap === 1 ? "PRIMO GIRO" : "ULTIMO GIRO";
  return (
    <div role="status" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "8px 12px", borderRadius: 10, background: "#fff", fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 13.5, letterSpacing: .6, color: "#0A0A0C", ...style }}>
      <span aria-hidden="true" style={{ width: 26, height: 16, borderRadius: 3, background: "repeating-conic-gradient(#0A0A0C 0 25%, #fff 0 50%) 0 0 / 8px 8px" }} />{txt}
    </div>
  );
}

const liveCounter = st => isRaceType(st.type) ? `GIRO ${st.lap}/${st.totalLaps}` : `${st.segment ? st.segment + " · " : ""}${st.waiting ? "IN ATTESA" : st.clockText}`;

// Riquadro in cima alla pagina Race durante una sessione: nome, giro o cronometro, bandiera e mappa.
function LiveCard({ race, st, track, onExpand }) {
  const lastMsg = st.messages[st.messages.length - 1];
  return (
    <div style={{ margin: "4px 16px 14px", padding: "14px 14px 12px", borderRadius: 18, background: C.card, border: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.accent }} />
        <span style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 11, color: C.accent, letterSpacing: 1.2 }}>IN DIRETTA · {sessionName(st.type)}</span>
        <div style={{ flexGrow: 1 }} />
        <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 13, color: C.text, fontVariantNumeric: "tabular-nums" }}>{liveCounter(st)}</span>
      </div>
      <h1 style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 20, color: C.text, margin: "0 0 2px" }}>{race.name}</h1>
      <span style={{ fontFamily: F_BODY, fontSize: 12, color: C.muted }}>{race.circuit} · dati demo</span>
      <FlagBanner st={st} style={{ marginTop: 10 }} />
      <div data-live-card-map="" style={{ position: "relative", marginTop: 8, borderRadius: 12, background: "#0D0D10", padding: "6px 4px" }}>
        <LiveMap track={track} st={st} />
        <Watermark style={{ left: 10, right: "auto", bottom: 8 }} />
        <button className="press" onClick={onExpand} style={{ position: "absolute", top: 6, right: 6, padding: "6px 10px", borderRadius: 8, background: "rgba(24,24,28,.9)", border: `1px solid ${C.border}`, fontFamily: F_BODY, fontWeight: 700, fontSize: 11, color: C.text }}>Ingrandisci</button>
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 8, fontFamily: F_BODY, fontSize: 10.5, color: C.dim }}>
        {SECTOR_COLORS.map((c, i) => <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 14, height: 3, borderRadius: 2, background: c }} />S{i + 1}</span>)}
        <span style={{ marginLeft: "auto" }}>Settori stimati</span>
      </div>
      {lastMsg && (
        <div style={{ marginTop: 10, padding: "9px 11px", borderRadius: 10, background: "rgba(255,255,255,.04)", fontFamily: F_BODY, fontSize: 11.5, color: C.muted, lineHeight: 1.4 }}>
          <span style={{ fontWeight: 700, color: C.text }}>Direzione gara · {lastMsg.time}</span><br />{lastMsg.text}
        </div>
      )}
    </div>
  );
}

// Ritiri (DNF): il disegno cambia con la causa (incidente, motore, incendio, troppe penalità; generico se non si sa).
const DNF_LABEL = { incidente: "Incidente", motore: "Problema al motore", incendio: "Incendio sulla vettura", penalita: "Troppe penalità: squalificato", altro: "Ritirato" };
const DNF_COLORS = { ink: "#F4F2EF", smoke: "#9C9CA6", fire: "#FF7A1A", flame: "#FFD23F", red: "#E8121D" };
const svgAttr = a => a.replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
function DnfArt({ cause, width = 96, bg = "#101014" }) {
  const k = DnfArtData.CAUSES.includes(cause) ? cause : "altro";
  const col = v => v === "cut" ? bg : (DNF_COLORS[v] || v);
  const node = ([tag, attrs, kids], i) => {
    const props = { key: i };
    Object.entries(attrs || {}).forEach(([a, v]) => { props[svgAttr(a)] = a === "fill" || a === "stroke" ? col(v) : v; });
    return React.createElement(tag, props, ...(typeof kids === "string" ? [kids] : (kids || []).map(node)));
  };
  return (
    <svg data-dnf-art={k} viewBox={`0 0 ${DnfArtData.W} ${DnfArtData.H}`} role="img" aria-label={"Ritiro: " + DNF_LABEL[k]} style={{ display: "block", width, height: "auto", flexShrink: 0 }}>
      {DnfArtData.shapes(k).map(node)}
    </svg>
  );
}
// Riquadro scuro con il disegno, per righe e avvisi.
const DnfTile = ({ cause, width = 92, bg = "#101014", style }) => (
  <span style={{ display: "inline-flex", padding: 3, borderRadius: 10, background: bg, flexShrink: 0, ...style }}><DnfArt cause={cause} width={width} bg={bg} /></span>
);

// Avviso della diretta, come la notifica di un'app: il giro più veloce (viola, come la grafica TV) o un ritiro.
// Nel Second Screen sta dentro lo schermo girato; altrimenti in alto, sopra a tutto.
const NOTICE_MS = 6000;
function LiveNotice({ n, onClose, inStage = false }) {
  if (!n) return null;
  const d = driverById(n.id), t = d ? teamById(d.teamId) : null;
  const place = inStage
    ? { position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", width: "min(470px, 72%)", zIndex: 60 }
    : { position: "absolute", top: 10, left: 10, right: 10, zIndex: 900 };
  const close = <button className="press" aria-label="Chiudi avviso" onClick={onClose} style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(0,0,0,.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="close" size={11} color="#fff" sw={2.4} /></button>;
  if (n.kind === "fastest") return (
    <div key={n.key} className="live-notice" data-live-notice="fastest" data-notice-driver={n.id} data-notice-lap={n.lap} role="status"
      style={{ ...place, display: "flex", alignItems: "center", gap: 10, padding: "9px 10px 9px 9px", borderRadius: 16, background: "linear-gradient(100deg, rgb(110, 34, 196) 0%, rgb(146, 52, 232) 58%, rgb(179, 92, 255) 100%)", boxShadow: "0 14px 30px -12px rgba(0,0,0,.75), inset 0 0 0 1px rgba(255,255,255,.14)" }}>
      <span style={{ width: 38, height: 38, borderRadius: 12, background: "rgba(255,255,255,.16)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="stopwatch" size={20} color="#fff" sw={2.2} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 12.5, letterSpacing: .8, color: "#fff" }}>GIRO PIÙ VELOCE<span style={{ fontFamily: F_BODY, fontStyle: "normal", fontWeight: 700, fontSize: 9.5, letterSpacing: .4, color: "rgba(255,255,255,.7)" }}>· GIRO {n.lap}</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, minWidth: 0 }}>
          <span style={{ width: 4, height: 15, borderRadius: 2, background: t ? t.color : "#fff", flexShrink: 0 }} />
          <span style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 13, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d ? d.full : n.code}</span>
          <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 11, color: "rgba(255,255,255,.75)" }}>{n.code}</span>
        </div>
      </div>
      <span style={{ fontFamily: F_HEAD, fontWeight: 900, fontSize: 21, color: "#fff", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{LiveSim.fmtLap(n.time)}</span>
      {close}
    </div>
  );
  return (
    <div key={n.key} className="live-notice" data-live-notice="dnf" data-notice-driver={n.id} role="status"
      style={{ ...place, display: "flex", alignItems: "center", gap: 10, padding: "8px 10px 8px 8px", borderRadius: 16, background: "linear-gradient(100deg, #2A0A0D 0%, #3A0C10 60%, #4A1015 100%)", boxShadow: "0 14px 30px -12px rgba(0,0,0,.8), inset 0 0 0 1px rgba(232,18,29,.45)" }}>
      <DnfTile cause={n.cause} width={78} bg="#101014" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 12.5, letterSpacing: .8, color: "#FF5A5F" }}>RITIRATO · GIRO {n.lap}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, minWidth: 0 }}>
          <span style={{ width: 4, height: 15, borderRadius: 2, background: t ? t.color : "#fff", flexShrink: 0 }} />
          <span style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 13, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d ? d.full : n.code}</span>
          <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 11, color: "rgba(255,255,255,.7)" }}>{n.code}</span>
        </div>
        <div style={{ fontFamily: F_BODY, fontSize: 11, color: "rgba(255,255,255,.72)", marginTop: 1 }}>{DNF_LABEL[n.cause] || DNF_LABEL.altro}</div>
      </div>
      {close}
    </div>
  );
}

// Settori S1-S3 con gli 8 minisettori colorati di ciascuno (viola, verde, giallo), come nei tempi ufficiali.
// Con onTelemetry ogni settore apre la telemetria del giro; senza, sono solo da guardare (Second Screen).
const secColor = sec => sec && sec.st === "purple" ? TIMING.purple : sec && sec.st === "green" ? TIMING.green : sec && sec.st === "yellow" ? TIMING.yellow : C.dim;
// tiny: ancora più bassa (grafica del Second Screen alta ½ posto), sempre con i 24 minisettori e i tempi.
function SectorCells({ c, onTelemetry, compact = false, tiny = false, style }) {
  const lapNo = c.last ? c.last.lapNo : null;
  if (tiny) compact = true;
  return (
    <div style={{ display: "flex", gap: compact ? 4 : 6, ...style }}>
      {[0, 1, 2].map(si => {
        const cur = c.sectors[si], prev = c.last && c.last.sectors[si], sec = cur || prev;
        const inner = (
          <>
            <span style={{ display: "flex", gap: compact ? 1 : 1.5 }}>
              {c.minis.slice(si * 8, si * 8 + 8).map((m, k) => <span key={k} data-mini={m} style={{ flex: 1, height: tiny ? 2 : compact ? 3 : 4, borderRadius: 2, background: TIMING[m] || TIMING.none }} />)}
            </span>
            <span style={{ display: "flex", justifyContent: compact ? "flex-end" : "space-between", gap: 4, fontFamily: F_BODY, fontSize: tiny ? 9 : compact ? 9.5 : 10.5, lineHeight: tiny ? 1.1 : undefined, color: C.dim }}>
              {!compact && <span>S{si + 1}</span>}
              <span style={{ fontWeight: 700, color: secColor(sec), opacity: cur ? 1 : .6, fontVariantNumeric: "tabular-nums" }}>{sec ? sec.t.toFixed(compact ? 2 : 3) : "—"}</span>
            </span>
          </>
        );
        const box = { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: tiny ? 1 : compact ? 3 : 4, padding: tiny ? "1px 4px" : compact ? "3px 4px" : "5px 6px", borderRadius: tiny ? 6 : 8, background: "rgba(255,255,255,.03)", textAlign: "left" };
        return onTelemetry
          ? <button key={si} className="press" data-sector-btn={si + 1} disabled={!lapNo} aria-label={`Telemetria del giro ${lapNo || ""} di ${c.code} (settore ${si + 1})`} onClick={() => lapNo && onTelemetry(c.id, lapNo, 0)} style={box}>{inner}</button>
          : <span key={si} data-ss-sector={si + 1} style={box}>{inner}</span>;
      })}
    </div>
  );
}
// Riga del ritirato: disegno della causa, giro e motivo, al posto dei settori.
function DnfRow({ c, width = 92, style }) {
  return (
    <div data-dnf-panel="" style={{ display: "flex", alignItems: "center", gap: 10, ...style }}>
      <DnfTile cause={c.dnf.cause} width={width} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 12.5, letterSpacing: .6, color: "#FF5A5F" }}>RITIRATO · GIRO {c.dnf.lap}</div>
        <div style={{ fontFamily: F_BODY, fontSize: 11.5, color: C.muted, marginTop: 2 }}>{DNF_LABEL[c.dnf.cause] || DNF_LABEL.altro}</div>
      </div>
    </div>
  );
}

// Tabella dei tempi: posizione, casco, distacco, giro, settori e minisettori colorati. I ritirati in fondo, col disegno della causa.
function TimingTable({ st, onTelemetry, onSelectDriver, onLapTimes }) {
  const race = isRaceType(st.type);
  const lapColor = rec => rec && rec.st === "purple" ? TIMING.purple : rec && rec.st === "green" ? TIMING.green : C.text;
  return (
    <div style={{ margin: "0 16px 16px", borderRadius: 18, background: C.card, border: `1px solid ${C.border}`, overflow: "hidden" }}>
      {st.cars.map((c, i) => {
        if (race && st.finished && c.pos <= 3) return null;   // i primi tre sono sul podio qui sopra
        const d = driverById(c.id);
        const main = race ? c.last : c.best ? { ...c.best, st: i === 0 ? "purple" : "none" } : null;
        const gap = c.dnf ? "RIT" : race ? (i === 0 ? (st.finished ? "VINCITORE" : "LEADER") : c.lapsDown > 0 ? `+${c.lapsDown} ${c.lapsDown === 1 ? "GIRO" : "GIRI"}` : fmtGap(c.gap)) : (i === 0 ? (c.best ? "MIGLIOR TEMPO" : "—") : fmtGap(c.gap));
        return (
          <div key={c.id} data-timing-row="" data-timing-pos={c.pos} data-timing-id={c.id} data-dnf={c.dnf ? c.dnf.cause : undefined} style={{ padding: "10px 12px 11px", borderBottom: i < st.cars.length - 1 ? `1px solid ${C.divider}` : "none", opacity: c.out ? .45 : 1, background: c.dnf ? "rgba(232,18,29,.05)" : "transparent" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 20, fontFamily: F_HEAD, fontWeight: 800, fontSize: 14, color: c.dnf ? C.dim : C.text, fontVariantNumeric: "tabular-nums" }}>{c.pos}</span>
              <button className="press" onClick={() => d && onSelectDriver(d)} style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1, textAlign: "left" }}>
                {d && <Headshot driver={d} size={30} />}
                <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 14, color: C.text }}>{c.code}</span>
                {c.pit && !c.out && <span style={{ padding: "1px 6px", borderRadius: 5, background: "rgba(76,141,255,.18)", fontFamily: F_HEAD, fontWeight: 800, fontSize: 9, color: TIMING.pit }}>BOX</span>}
                {c.out && <span style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 9.5, color: C.dim }}>ELIM. {c.outIn}</span>}
              </button>
              <span style={{ fontFamily: F_BODY, fontWeight: c.dnf ? 800 : 600, fontSize: 11.5, color: c.dnf ? "#FF5A5F" : C.muted, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{gap}</span>
              {main ? (
                <button className="press" aria-label={`Tempi sul giro di ${c.code}`} onClick={() => onLapTimes ? onLapTimes(c.id) : onTelemetry(c.id, main.lapNo, 0)}
                  style={{ padding: "4px 7px", borderRadius: 7, background: "rgba(255,255,255,.05)", fontFamily: F_HEAD, fontWeight: 800, fontSize: 13, color: c.dnf ? C.dim : lapColor(main), fontVariantNumeric: "tabular-nums" }}>{LiveSim.fmtLap(main.time)}</button>
              ) : <span style={{ width: 62, textAlign: "right", fontFamily: F_HEAD, fontWeight: 800, fontSize: 13, color: C.dim }}>—</span>}
            </div>
            {c.dnf ? <DnfRow c={c} style={{ marginTop: 8, paddingLeft: 28 }} /> : <SectorCells c={c} onTelemetry={onTelemetry} style={{ marginTop: 8, paddingLeft: 28 }} />}
          </div>
        );
      })}
    </div>
  );
}

// Messaggi della direzione gara, dal più recente.
function RaceControlList({ messages }) {
  const tone = m => /RITIRATO|SQUALIFICA/.test(m.text) ? "#FF5A5F" : /ROSSA/.test(m.text) ? FLAG_UI.red.color : /GIALLA|SAFETY CAR/.test(m.text) ? FLAG_UI.yellow.color : /PENALITÀ/.test(m.text) ? "#FF8A1F"
    : /INVESTIGA|INCIDENTE/.test(m.text) ? "#FFB35C" : /DRS|BLU/.test(m.text) ? TIMING.pit : /LIBERA|VERDE|RIPRESA/.test(m.text) ? TIMING.green : C.dim;
  const list = messages.slice().reverse();
  return (
    <div style={{ margin: "0 16px 16px", borderRadius: 18, background: C.card, border: `1px solid ${C.border}`, overflow: "hidden" }}>
      {list.length === 0 && <p style={{ margin: 0, padding: 16, fontFamily: F_BODY, fontSize: 12.5, color: C.dim }}>Nessun messaggio della direzione gara.</p>}
      {list.map((m, i) => (
        <div key={i} style={{ display: "flex", gap: 10, padding: "11px 14px", borderBottom: i < list.length - 1 ? `1px solid ${C.divider}` : "none" }}>
          <span style={{ width: 3, borderRadius: 2, background: tone(m), flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: F_BODY, fontSize: 10.5, color: C.dim, marginBottom: 3, fontVariantNumeric: "tabular-nums" }}>{m.time}{m.lap ? ` · giro ${m.lap}` : ""}</div>
            <div style={{ fontFamily: F_BODY, fontWeight: 600, fontSize: 12.5, color: C.text, lineHeight: 1.4 }}>{m.text}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Radar della pioggia sopra al circuito (celle simulate che si muovono col vento).
function RadarCanvas({ track, cells, windDeg }) {
  useEffect(() => {
    let raf = 0, t0 = performance.now();
    const still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const draw = now => {
      const cv = document.getElementById("radarCanvas");
      if (cv && cv.getContext) {
        const ctx = cv.getContext("2d"), W = cv.width, H = cv.height, k = (now - t0) / 1000;
        ctx.fillStyle = "#0D1016"; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = "rgba(255,255,255,.05)"; ctx.lineWidth = 1;
        for (let x = 0; x < W; x += W / 8) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
        for (let y = 0; y < H; y += H / 5) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
        cells.forEach(c => {
          const x = (((c.x + c.vx * k) % 1.8 + 1.8) % 1.8 - 0.4) * W, y = (((c.y + c.vy * k) % 1.4 + 1.4) % 1.4 - 0.2) * H, rad = c.r * W;
          const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
          const col = c.i > .75 ? "232,18,29" : c.i > .5 ? "242,194,48" : c.i > .3 ? "62,214,107" : "76,141,255";
          g.addColorStop(0, `rgba(${col},.55)`); g.addColorStop(.6, `rgba(${col},.22)`); g.addColorStop(1, `rgba(${col},0)`);
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
        });
        if (track && window.Path2D) {
          ctx.save(); ctx.translate(W * .12, H * .12); ctx.scale(W * .76 / 1600, H * .76 / 900);
          ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 14; ctx.lineJoin = "round"; ctx.stroke(new Path2D(track.d)); ctx.restore();
        }
        // freccia del vento
        ctx.save(); ctx.translate(W - 34, 34); ctx.rotate(((windDeg || 0) + 180) * Math.PI / 180);
        ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 14); ctx.lineTo(0, -14); ctx.lineTo(-7, -5); ctx.moveTo(0, -14); ctx.lineTo(7, -5); ctx.stroke(); ctx.restore();
      }
      if (!still) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [track ? track.name : "", cells.length, windDeg]);
  return <canvas id="radarCanvas" aria-label="Radar meteo" role="img" width={716} height={400} style={{ display: "block", width: "100%", height: "auto", borderRadius: 12 }} />;
}

// Icone del cielo per le previsioni (sole, luna, nuvole, pioggia), disegnate in SVG.
const CLOUD_BIG = "M7 18A3.5 3.5 0 0 1 6.2 11.1A5 5 0 0 1 15.8 10.2A4 4 0 0 1 17 18Z";
const CLOUD_LOW = "M9 20A3 3 0 0 1 8.4 14.1A4.2 4.2 0 0 1 16.4 13.3A3.4 3.4 0 0 1 17.4 20Z";
const CLOUD_HIGH = "M7 15A3.5 3.5 0 0 1 6.2 8.1A5 5 0 0 1 15.8 7.2A4 4 0 0 1 17 15Z";
function SkyIcon({ kind, size = 22, mono = false, bg = C.card }) {
  const warm = mono ? C.muted : TIMING.yellow, grey = C.muted, rain = mono ? C.muted : TIMING.pit;
  const s = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "data-sky": kind, "aria-hidden": "true" };
  const cloud = d => <path d={d} stroke={grey} fill={bg} />;
  switch (kind) {
    case "sun": return <svg {...s}><circle cx="12" cy="12" r="4" stroke={warm} /><path stroke={warm} d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></svg>;
    case "moon": return <svg {...s}><path stroke={warm} d="M19.5 14.5A8 8 0 1 1 9.5 4.5a7.2 7.2 0 0 0 10 10Z" /></svg>;
    case "cloud-sun": return <svg {...s}><circle cx="9" cy="9" r="3.3" stroke={warm} /><path stroke={warm} d="M9 2.8v1.4M2.8 9h1.4M4.6 4.6l1 1M13.4 4.6l-1 1" />{cloud(CLOUD_LOW)}</svg>;
    case "cloud-moon": return <svg {...s}><path stroke={warm} d="M12.3 9.6A4.3 4.3 0 1 1 7.4 3.8a3.4 3.4 0 0 0 4.9 5.8Z" />{cloud(CLOUD_LOW)}</svg>;
    case "cloud": return <svg {...s}>{cloud(CLOUD_BIG)}</svg>;
    default: return <svg {...s}>{cloud(CLOUD_HIGH)}<path stroke={rain} d="M8.5 17.5l-1 2.8M12.5 17.5l-1 2.8M16.5 17.5l-1 2.8" /></svg>;
  }
}

const WX_WORD = v => v === "rain" ? "Pioggia" : "Asciutto";

// Pronostico meteo di una sessione: si indovina se pioverà, +2 punti FantaF1 se giusto.
// Si cambia fino alla fine della sessione di due prima (FP2: fine FP1; FP1: fino all'inizio), mai durante una sessione.
function WeatherGuess({ s, guess, result, lock, onGuess }) {
  const [asking, setAsking] = useState(false);
  const small = { display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 11px", borderRadius: 9, background: "rgba(255,255,255,.07)", border: `1px solid ${C.border}`, fontFamily: F_HEAD, fontWeight: 800, fontSize: 12, color: C.text };
  const line = { margin: 0, fontFamily: F_BODY, fontSize: 12, color: C.muted, lineHeight: 1.5 };
  if (result) return (
    <p role="status" style={line}>Com'è andata: <b style={{ color: C.text }}>{WX_WORD(result)}</b>. {guess
      ? (guess === result ? <b style={{ color: TIMING.green }}>Hai indovinato! +2 punti FantaF1</b> : <span>Non hai indovinato questa volta.</span>)
      : <span>Non avevi fatto il pronostico.</span>}</p>
  );
  const dl = lock && lock.deadline;
  const until = dl ? `${dl.when === "end" ? "fino alla fine" : "fino all'inizio"} ${SESSION_DEL[dl.key] || ""}${dl.at ? ` (${fmtRome(dl.at)}, ora italiana)` : ""}` : "";
  const mine = guess ? <> Il tuo pronostico: <b style={{ color: C.text }}>{WX_WORD(guess)}</b>.</> : "";
  if (lock && lock.locked) return <p data-wx-state="locked" style={line}>Pronostico chiuso: si poteva fare {until}.{mine}</p>;
  if (lock && lock.paused) return <p data-wx-state="paused" role="status" style={line}>In pausa: {sessionLabelIt(lock.liveKey).toLowerCase()} in corso. Potrai cambiarlo a fine sessione, {until}.{mine}</p>;
  if (asking) return (
    <div>
      <p style={{ ...line, margin: "0 0 8px" }}>Pioverà durante la sessione?</p>
      <div style={{ display: "flex", gap: 8 }}>
        {["rain", "dry"].map(v => (
          <button key={v} className="press" onClick={() => { onGuess(v); setAsking(false); }} style={{ ...small, flex: 1, justifyContent: "center", background: guess === v ? "rgba(255,255,255,.16)" : small.background }}>
            <SkyIcon kind={v === "rain" ? "rain" : "sun"} size={17} />{WX_WORD(v)}
          </button>
        ))}
      </div>
    </div>
  );
  const hint = until ? <p data-wx-state="open" style={{ ...line, fontSize: 11, color: C.dim, margin: "6px 0 0" }}>Si può cambiare {until}, ma non mentre una sessione è in corso.</p> : null;
  if (guess) return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <p style={{ ...line, flex: 1 }}>Il tuo pronostico: <b style={{ color: C.text }}>{WX_WORD(guess)}</b> · +2 punti FantaF1 se indovini</p>
        <button className="press" onClick={() => setAsking(true)} style={small}>Cambia</button>
      </div>
      {hint}
    </div>
  );
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button className="press" onClick={() => setAsking(true)} style={small}><SkyIcon kind="rain" size={16} mono />Indovina il meteo</button>
        <span style={{ fontFamily: F_BODY, fontSize: 11, color: C.dim }}>+2 punti FantaF1 se indovini</span>
      </div>
      {hint}
    </div>
  );
}

// Meteo del weekend: fila grigia di caselle (una per sessione), condizioni attuali e radar.
function WeatherPanel({ race, st, track, live, guesses = {}, results = {}, onGuess }) {
  const [sel, setSel] = useState(null);
  if (!race) return null;
  const liveKey = live && live.raceId === race.id ? live.type : null;
  const w = weekendWeather(race, st ? st.t : 0, liveKey);
  const gk = k => race.id + ":" + k;
  const ended = Object.fromEntries(w.sessions.map(x => [x.key, !!results[gk(x.key)]]));
  const lockOf = x => BtLogic.wxLock({ sessions: w.sessions, idx: w.sessions.indexOf(x), now: nowMs(), ended, liveKey, hasResult: !!results[gk(x.key)] });
  const s = sel ? w.sessions.find(x => x.key === sel) : null;
  const rainMax = Math.max(...w.sessions.map(s => s.rainPct));
  const cells = LiveSim.radarCells({ seed: race.round || 1, rainChance: rainMax, windDeg: w.current.windDir });
  const tile = (label, value) => (
    <div style={{ padding: "10px 8px", borderRadius: 12, background: "rgba(255,255,255,.04)", textAlign: "center" }}>
      <div style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 16, color: C.text }}>{value}</div>
      <div style={{ fontFamily: F_BODY, fontWeight: 600, fontSize: 9.5, letterSpacing: .6, color: C.dim, marginTop: 2 }}>{label}</div>
    </div>
  );
  return (
    <div style={{ margin: "0 16px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ padding: "12px 10px 10px", borderRadius: 18, background: C.card, border: `1px solid ${C.border}` }}>
        <div style={{ padding: "0 4px" }}><Eyebrow>PREVISIONI DEL WEEKEND</Eyebrow></div>
        <div role="group" aria-label="Previsioni per sessione" style={{ display: "flex", gap: 6 }}>
          {w.sessions.map(x => {
            const on = sel === x.key, g = guesses[gk(x.key)], res = results[gk(x.key)];
            return (
              <button key={x.key} data-weather-box={x.key} className="press" aria-pressed={on} aria-label={`${x.label}: ${x.air} gradi, pioggia ${x.rainPct}%`} onClick={() => setSel(on ? null : x.key)}
                style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "8px 2px 7px", borderRadius: 12, background: on ? "rgba(255,255,255,.13)" : "rgba(255,255,255,.05)", border: `1px solid ${on ? "rgba(255,255,255,.32)" : C.border}`, position: "relative" }}>
                <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 10.5, letterSpacing: .4, color: on ? C.text : C.muted }}>{WX_SHORT[x.key] || x.key}</span>
                <SkyIcon kind={x.icon} size={18} mono bg={on ? "#37373B" : "#232327"} />
                <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 13, color: C.text }}>{x.air}°</span>
                <span style={{ fontFamily: F_BODY, fontWeight: 600, fontSize: 10, color: C.dim }}>{x.rainPct}%</span>
                {(g || res) && <span aria-hidden="true" style={{ position: "absolute", top: 5, right: 5, width: 6, height: 6, borderRadius: "50%", background: res ? (g === res ? TIMING.green : C.dim) : C.gold }} />}
              </button>
            );
          })}
        </div>
        {s && (
          <div style={{ marginTop: 10, padding: "12px 12px", borderRadius: 14, background: "rgba(255,255,255,.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <SkyIcon kind={s.icon} size={22} bg="#1F1F23" />
              <span style={{ flex: 1, fontFamily: F_HEAD, fontWeight: 800, fontSize: 14.5, color: C.text }}>{s.label}</span>
              <span style={{ fontFamily: F_BODY, fontSize: 11.5, color: C.dim }}>ore {s.time} locali</span>
            </div>
            <p style={{ margin: "0 0 10px", fontFamily: F_BODY, fontSize: 12.5, color: C.muted, lineHeight: 1.55 }}>{s.text}</p>
            <WeatherGuess key={s.key} s={s} guess={guesses[gk(s.key)]} result={results[gk(s.key)]} lock={lockOf(s)} onGuess={v => onGuess && onGuess(race, s.key, v)} />
          </div>
        )}
      </div>
      {st && (
        <div style={{ padding: 14, borderRadius: 18, background: C.card, border: `1px solid ${C.border}` }}>
          <Eyebrow>ADESSO IN PISTA</Eyebrow>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
            {tile("ARIA", w.current.air.toFixed(1) + "°")}{tile("PISTA", w.current.track.toFixed(1) + "°")}{tile("UMIDITÀ", w.current.humidity + "%")}{tile("VENTO", w.current.wind.toFixed(0) + " km/h")}
          </div>
          <p style={{ margin: "8px 2px 0", fontFamily: F_BODY, fontSize: 11.5, color: C.muted }}>{w.current.rain ? "Pioggia in corso sul circuito." : "Nessuna pioggia in questo momento."}</p>
        </div>
      )}
      <div style={{ padding: 14, borderRadius: 18, background: C.card, border: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "baseline", marginBottom: 8 }}>
          <Eyebrow>RADAR · {race.circuit.toUpperCase()}</Eyebrow>
          <span style={{ marginLeft: "auto", fontFamily: F_BODY, fontSize: 10.5, color: C.dim }}>demo</span>
        </div>
        <RadarCanvas track={track} cells={cells} windDeg={w.current.windDir} />
        <div style={{ display: "flex", gap: 12, marginTop: 8, fontFamily: F_BODY, fontSize: 10.5, color: C.dim }}>
          {[["Debole", "#4C8DFF"], ["Moderata", "#3ED66B"], ["Forte", "#F2C230"], ["Molto forte", "#E8121D"]].map(([l, c]) => <span key={l} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: "50%", background: c }} />{l}</span>)}
        </div>
      </div>
    </div>
  );
}

// Un grafico della telemetria: una grandezza lungo la distanza del giro, con cursore condiviso.
function TelChart({ label, unit, tel, cmp, field, yMin, yMax, kind, range, hover, onHover, color, ticks }) {
  const W = 340, H = kind === "brake" ? 58 : 96, padL = 30, padR = 6, padT = 8, padB = 14;
  const [d0, d1] = range;
  const X = d => padL + (d - d0) / (d1 - d0) * (W - padL - padR), Y = v => padT + (1 - (v - yMin) / (yMax - yMin)) * (H - padT - padB);
  const path = (t, step) => {
    let s = "", first = true;
    for (let i = 0; i < t.dist.length; i++) {
      const d = t.dist[i]; if (d < d0 || d > d1) continue;
      const x = X(d).toFixed(1), y = Y(t[field][i]).toFixed(1);
      if (first) { s += `M${x},${y}`; first = false; } else if (step) { s += `H${x}V${y}`; } else { s += `L${x},${y}`; }
    }
    return s;
  };
  const main = path(tel, kind === "gear" || kind === "brake");
  const area = kind === "area" || kind === "brake" ? main + `V${Y(yMin).toFixed(1)}H${X(Math.max(d0, tel.dist.find(d => d >= d0) || d0)).toFixed(1)}Z` : null;
  const move = e => {
    const rect = e.currentTarget.getBoundingClientRect(), px = (e.clientX - rect.left) / rect.width * W;
    const d = d0 + (px - padL) / (W - padL - padR) * (d1 - d0);
    let best = 0; for (let i = 0; i < tel.dist.length; i++) if (Math.abs(tel.dist[i] - d) < Math.abs(tel.dist[best] - d)) best = i;
    onHover(best);
  };
  const hx = hover != null && tel.dist[hover] >= d0 && tel.dist[hover] <= d1 ? X(tel.dist[hover]) : null;
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, fontFamily: F_BODY, fontSize: 11, color: C.muted, margin: "0 0 2px 2px" }}>
        <span style={{ fontWeight: 700, color: C.text }}>{label}</span><span>{unit}</span>
      </div>
      <svg data-tel-chart={field} viewBox={`0 0 ${W} ${H}`} onPointerMove={move} onPointerDown={move} style={{ display: "block", width: "100%", height: "auto", touchAction: "none" }}>
        {ticks.map(v => <g key={v}><line x1={padL} x2={W - padR} y1={Y(v)} y2={Y(v)} stroke="rgba(255,255,255,.07)" strokeWidth="1" /><text x={padL - 4} y={Y(v) + 3} fill={C.dim} fontSize="8.5" textAnchor="end" fontFamily="'Work Sans', sans-serif">{v}</text></g>)}
        {tel.sectorDist.filter(d => d > d0 && d < d1).map((d, i) => <line key={i} x1={X(d)} x2={X(d)} y1={padT} y2={H - padB} stroke="rgba(255,255,255,.22)" strokeWidth="1" />)}
        {cmp && <path d={path(cmp, kind === "gear" || kind === "brake")} fill="none" stroke="#8E8E96" strokeWidth="1.5" strokeLinejoin="round" />}
        {area && <path d={area} fill={color} fillOpacity=".12" stroke="none" />}
        <path d={main} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {hx != null && <line x1={hx} x2={hx} y1={padT} y2={H - padB} stroke="rgba(255,255,255,.7)" strokeWidth="1" />}
      </svg>
    </div>
  );
}

// Telemetria di un giro (o di un settore): velocità, acceleratore, freno, marcia; confronto col giro più veloce.
function TelemetryModal({ live, st, carId, lapNo, sector, onClose }) {
  const [zoom, setZoom] = useState(sector || 0);
  const [hover, setHover] = useState(null);
  const tel = live.sim.telemetry(carId, lapNo);
  const d = driverById(carId);
  if (!tel) return null;
  const bl = st.bestLap && !(st.bestLap.id === carId && st.bestLap.lapNo === lapNo) ? live.sim.telemetry(st.bestLap.id, st.bestLap.lapNo) : null;
  const L = live.track.lenM, bounds = [0, tel.sectorDist[0], tel.sectorDist[1], L];
  const range = zoom ? [bounds[zoom - 1], bounds[zoom]] : [0, L];
  const color = (d && d.color) || C.accent;
  const hv = hover != null ? { d: tel.dist[hover], v: tel.speed[hover], thr: tel.throttle[hover], br: tel.brake[hover], g: tel.gear[hover], rpm: tel.rpm[hover] } : null;
  const cmpAt = bl && hover != null ? bl.speed[Math.min(hover, bl.speed.length - 1)] : null;
  const inRange = (arr) => arr.filter((_, i) => tel.dist[i] >= range[0] && tel.dist[i] <= range[1]);
  const vIn = inRange(tel.speed), top = Math.max(...vIn), low = Math.min(...vIn);
  const full = Math.round(inRange(tel.throttle).filter(x => x >= 99).length / Math.max(1, vIn.length) * 100);
  const chip = (id, label) => <button key={id} className="press" aria-pressed={zoom === id ? "true" : "false"} onClick={() => { setZoom(id); setHover(null); }} style={{ padding: "6px 10px", borderRadius: 999, background: zoom === id ? "rgba(232,18,29,.16)" : "rgba(255,255,255,.05)", border: `1px solid ${zoom === id ? C.accent : C.border}`, fontFamily: F_BODY, fontWeight: 700, fontSize: 11, color: zoom === id ? C.text : C.muted }}>{label}</button>;
  const common = { tel, range, hover, onHover: setHover, color };
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.78)", zIndex: 640, display: "flex", alignItems: "flex-end" }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="scrollcol" style={{ background: C.card, borderRadius: "24px 24px 0 0", width: "100%", maxHeight: "94%", padding: "16px 16px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {d && <Headshot driver={d} size={34} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 16, color: C.text }}>TELEMETRIA · {tel.code} · GIRO {lapNo}{zoom ? ` · SETTORE ${zoom}` : ""}</h2>
            <span style={{ fontFamily: F_BODY, fontSize: 11.5, color: C.muted, fontVariantNumeric: "tabular-nums" }}>{LiveSim.fmtLap(tel.time)} · S1 {tel.sectors[0].t.toFixed(3)} · S2 {tel.sectors[1].t.toFixed(3)} · S3 {tel.sectors[2].t.toFixed(3)}</span>
          </div>
          <button className="press" aria-label="Chiudi telemetria" onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="close" size={13} sw={2.2} /></button>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "12px 0 10px" }}>{chip(0, "Giro intero")}{chip(1, "Settore 1")}{chip(2, "Settore 2")}{chip(3, "Settore 3")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 10 }}>
          {[["VELOCITÀ MAX", top + " km/h"], ["VELOCITÀ MIN", low + " km/h"], ["GAS A TAVOLETTA", full + "%"]].map(([l, v]) => (
            <div key={l} style={{ padding: "8px 6px", borderRadius: 10, background: "rgba(255,255,255,.04)", textAlign: "center" }}>
              <div style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 14, color: C.text }}>{v}</div>
              <div style={{ fontFamily: F_BODY, fontWeight: 600, fontSize: 9, letterSpacing: .5, color: C.dim, marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
        {bl && (
          <div style={{ display: "flex", gap: 14, marginBottom: 6, fontFamily: F_BODY, fontSize: 11, color: C.muted }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 16, height: 2, background: color }} />{tel.code} giro {lapNo}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 16, height: 2, background: "#8E8E96" }} />{bl.code} giro più veloce ({LiveSim.fmtLap(bl.time)})</span>
          </div>
        )}
        <div style={{ minHeight: 18, marginBottom: 6, fontFamily: F_BODY, fontSize: 11.5, color: C.text, fontVariantNumeric: "tabular-nums" }}>
          {hv ? <><b>{hv.v} km/h</b>{cmpAt != null ? ` (${bl.code} ${cmpAt})` : ""} · gas {hv.thr}% · freno {hv.br ? "sì" : "no"} · marcia {hv.g} · {hv.rpm} giri/min · {hv.d} m</> : <span style={{ color: C.dim }}>Tocca un grafico per leggere i valori in quel punto.</span>}
        </div>
        <TelChart {...common} label="Velocità" unit="km/h" field="speed" cmp={bl} yMin={50} yMax={350} kind="line" ticks={[100, 200, 300]} />
        <TelChart {...common} label="Acceleratore" unit="%" field="throttle" cmp={null} yMin={0} yMax={100} kind="area" ticks={[0, 50, 100]} />
        <TelChart {...common} label="Freno" unit="acceso/spento" field="brake" cmp={null} yMin={0} yMax={1} kind="brake" ticks={[]} />
        <TelChart {...common} label="Marcia" unit="1–8" field="gear" cmp={bl} yMin={1} yMax={8} kind="gear" ticks={[2, 4, 6, 8]} />
        <p style={{ margin: "8px 2px 0", fontFamily: F_BODY, fontSize: 10.5, color: C.dim, lineHeight: 1.5 }}>Distanza da {Math.round(range[0])} a {Math.round(range[1])} m · telemetria demo, nell'app vera arriverà dai dati ufficiali (OpenF1).</p>
      </div>
    </div>
  );
}

// Tutti i giri di un pilota (dal più recente): tempo, settori, miglior giro; toccando un giro si apre la sua telemetria.
function LapTimesModal({ live, st, carId, onOpenLap, onClose }) {
  const laps = live.sim.laps(carId).slice().reverse();
  const car = st.cars.find(c => c.id === carId), d = driverById(carId);
  const code = car ? car.code : "", best = car && car.best;
  const overall = st.bestLap;
  const secColor = x => x && x.st === "purple" ? TIMING.purple : x && x.st === "green" ? TIMING.green : x && x.st === "yellow" ? TIMING.yellow : C.muted;
  const FLAG_TAG = { yellow: "GIALLA", sc: "SC", vsc: "VSC", red: "ROSSA" };
  const KIND_TAG = { cool: "giro lento", out: "giro di uscita" };
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 630, display: "flex", alignItems: "flex-end" }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div data-lap-list="" className="scrollcol" style={{ background: C.card, borderRadius: "24px 24px 0 0", width: "100%", maxHeight: "90%", padding: "16px 16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          {d && <Headshot driver={d} size={34} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 16, color: C.text }}>TEMPI SUL GIRO · {code}</h2>
            <span style={{ fontFamily: F_BODY, fontSize: 11.5, color: C.muted }}>{d ? d.full + " · " : ""}{laps.length} {laps.length === 1 ? "giro" : "giri"}{best ? ` · miglior giro ${LiveSim.fmtLap(best.time)} (giro ${best.lapNo})` : ""}</span>
          </div>
          <button className="press" aria-label="Chiudi tempi" onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="close" size={13} sw={2.2} /></button>
        </div>
        {laps.length === 0 && <p style={{ margin: "8px 2px", fontFamily: F_BODY, fontSize: 12.5, color: C.dim }}>Nessun giro completato, per ora.</p>}
        <div style={{ borderRadius: 14, border: `1px solid ${C.border}`, overflow: "hidden" }}>
          {laps.map((l, i) => {
            const isBest = best && best.lapNo === l.lapNo, isOverall = overall && overall.id === carId && overall.lapNo === l.lapNo;
            const tag = FLAG_TAG[l.flag] || KIND_TAG[l.kind];
            return (
              <button key={l.lapNo} data-lap-row={l.lapNo} className="press" aria-label={`Telemetria giro ${l.lapNo} di ${code}`} onClick={() => onOpenLap(l.lapNo)}
                style={{ display: "block", width: "100%", padding: "10px 12px", textAlign: "left", borderTop: i ? `1px solid ${C.divider}` : "none", background: isBest ? "rgba(62,214,107,.06)" : "transparent" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 52, fontFamily: F_BODY, fontWeight: 700, fontSize: 11.5, color: C.dim }}>Giro {l.lapNo}</span>
                  <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 15, color: isOverall ? TIMING.purple : isBest ? TIMING.green : C.text, fontVariantNumeric: "tabular-nums" }}>{LiveSim.fmtLap(l.time)}</span>
                  {isBest && <span style={{ padding: "1px 6px", borderRadius: 5, background: isOverall ? "rgba(179,92,255,.18)" : "rgba(62,214,107,.16)", fontFamily: F_HEAD, fontWeight: 800, fontSize: 9, color: isOverall ? TIMING.purple : TIMING.green }}>MIGLIOR GIRO</span>}
                  {tag && <span style={{ padding: "1px 6px", borderRadius: 5, background: "rgba(255,255,255,.07)", fontFamily: F_BODY, fontWeight: 700, fontSize: 9.5, color: C.muted }}>{tag}</span>}
                  <span style={{ marginLeft: "auto", display: "inline-flex" }}><Icon name="chevron" size={13} color={C.dim} /></span>
                </span>
                <span style={{ display: "flex", gap: 12, marginTop: 4, paddingLeft: 60, fontFamily: F_BODY, fontSize: 10.5, color: C.dim, fontVariantNumeric: "tabular-nums" }}>
                  {l.sectors.map((x, k) => <span key={k}>S{k + 1} <b style={{ color: secColor(x), fontWeight: 700 }}>{x.t.toFixed(3)}</b></span>)}
                </span>
              </button>
            );
          })}
        </div>
        <p style={{ margin: "10px 2px 0", fontFamily: F_BODY, fontSize: 10.5, color: C.dim }}>Tocca un giro per vederne la telemetria · dati demo.</p>
      </div>
    </div>
  );
}

// Mappa a tutto schermo: sessione in diretta, oppure il tracciato della prossima gara.
function LiveMapView({ race, live, st, onClose }) {
  const track = live ? live.track : (race && CIRCUITS[race.circuitId] ? LiveSim.buildTrack(CIRCUITS[race.circuitId]) : null);
  return (
    <div style={{ position: "absolute", inset: 0, background: "#050506", zIndex: 600, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 16px 10px", flexShrink: 0 }}>
        <button className="press" aria-label="Chiudi" onClick={onClose} style={{ width: 38, height: 38, borderRadius: "50%", background: C.card, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="close" size={15} sw={2.2} /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 17, color: C.text, margin: 0 }}>{race ? race.name : "TRACCIATO LIVE"}</h1>
          <span style={{ fontFamily: F_BODY, fontSize: 11, color: C.dim }}>{st ? `${sessionName(st.type)} · ${liveCounter(st)} · dati demo` : "Nessuna sessione in diretta"}</span>
        </div>
      </div>
      <div className="scrollcol" style={{ flex: 1, padding: "0 16px 16px" }}>
        <FlagBanner st={st} style={{ marginBottom: 10 }} />
        {track ? <div data-live-map-view="" style={{ position: "relative", borderRadius: 14, background: "#0D0D10", padding: 8 }}><LiveMap track={track} st={st} big /><Watermark /></div>
          : <p style={{ fontFamily: F_BODY, fontSize: 13, color: C.muted }}>Tracciato non disponibile per questa gara.</p>}
        {!st && <p style={{ fontFamily: F_BODY, fontSize: 12, color: C.dim, lineHeight: 1.5, margin: "10px 2px 0" }}>Quando c'è una sessione in diretta, qui vedi tutti i piloti muoversi in pista.</p>}
        {st && live && <InsightPopup live={live} st={st} race={race} style={{ position: "relative", left: "auto", bottom: "auto", transform: "none", width: "100%", marginTop: 10 }} />}
        {st && (
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {st.cars.slice(0, 10).map(c => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 10, background: C.card }}>
                <span style={{ width: 16, fontFamily: F_HEAD, fontWeight: 800, fontSize: 12, color: C.text }}>{c.pos}</span>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.color }} />
                <span style={{ flex: 1, fontFamily: F_HEAD, fontWeight: 800, fontSize: 12, color: C.text }}>{c.code}</span>
                <span style={{ fontFamily: F_BODY, fontSize: 10.5, color: C.dim, fontVariantNumeric: "tabular-nums" }}>{c.pos === 1 ? "—" : isRaceType(st.type) ? (c.lapsDown ? `+${c.lapsDown}G` : fmtGap(c.gap)) : fmtGap(c.gap)}</span>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 12, marginTop: 12, fontFamily: F_BODY, fontSize: 10.5, color: C.dim }}>
          {SECTOR_COLORS.map((c, i) => <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 14, height: 3, borderRadius: 2, background: c }} />S{i + 1}</span>)}
          <span style={{ marginLeft: "auto" }}>Confini dei settori stimati</span>
        </div>
      </div>
    </div>
  );
}

/* ── B&T INSIGHTS: grafiche in stile TV, disegnate da noi e calcolate dai dati della diretta ── */
// Cinque tipi, con nomi e colori nostri (rosso e oro B&T): chi raggiunge chi ("ti raggiunge in X giri"),
// strategie ai box, ritmo gara, frenata a confronto e pagella monoposto (curve lente, medie e veloci).
// Niente marchi o nomi delle grafiche di F1 e AWS.
const INSIGHT_TYPES = [["sorpasso", "Chi raggiunge chi"], ["strategia", "Strategie"], ["passo", "Ritmo gara"], ["frenata", "Frenata"], ["vettura", "Pagella"]];
const CORNER_KINDS = [["lente", "CURVE LENTE", "Curve lente"], ["medie", "CURVE MEDIE", "Curve medie"], ["veloci", "CURVE VELOCI", "Curve veloci"]];
const TYRE_WORD = { S: "Morbida", M: "Media", H: "Dura" };
const INS = { top: "#121218", body: "#0C0C10", band: C.accent, bandInk: "#FFFFFF", label: C.gold, hi: C.gold, hiInk: "#15120A", up: "#27D8C8", down: "#FF5A5F" };
const surname = id => { const d = driverById(id); return (d ? d.full.split(" ").slice(-1)[0] : id).toUpperCase(); };
const teamColorOf = id => { const d = driverById(id), t = d && teamById(d.teamId); return t ? t.color : "#8E8E96"; };
const insightCtx = (live, st, race) => ({ st, lapsOf: id => live.sim.laps(id), telemetry: (id, n) => live.sim.telemetry(id, n), lenM: live.track.lenM, lapTime: live.track.lapTime, teamOf: TEAM_OF, seed: (race && race.round) || 1 });

// Cornice comune: barra del titolo, marchio B&T Insights, fascia rossa B&T col sottotitolo.
function InsightShell({ type, title, sub, children, compact = false, popup = false, onClose }) {
  const wrap = !children;   // solo titolo e fascia: la fascia può andare a capo
  return (
    <div data-insight={type} style={{ borderRadius: compact ? 10 : 12, overflow: "hidden", background: INS.body, border: "1px solid rgba(255,255,255,.1)", boxShadow: popup ? "0 16px 34px -14px rgba(0,0,0,.85)" : "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: compact ? "5px 8px" : "7px 10px", background: `linear-gradient(90deg, #1E1E26, ${INS.top})` }}>
        <span style={{ flex: 1, minWidth: 0, fontFamily: F_HEAD, fontWeight: 900, fontSize: compact ? 12 : 14.5, letterSpacing: .4, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: compact ? 9 : 10.5, color: "#fff", whiteSpace: "nowrap" }}><span style={{ padding: "1px 5px", borderRadius: 4, background: C.accent }}>B&amp;T</span> INSIGHTS</span>
        {onClose && <button className="press" aria-label="Chiudi banner" onClick={e => { if (e && e.stopPropagation) e.stopPropagation(); onClose(); }} style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(255,255,255,.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="close" size={9} color="#fff" sw={2.6} /></button>}
      </div>
      {sub && <div data-insight-band="" style={{ padding: compact ? "3px 8px" : "4px 10px", background: INS.band, textAlign: "center", fontFamily: F_HEAD, fontWeight: 900, fontSize: compact ? 9.5 : 11.5, letterSpacing: .6, color: INS.bandInk, whiteSpace: wrap ? "normal" : "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.3 }}>{sub}</div>}
      {children && <div style={{ padding: compact ? "6px 7px" : "9px 10px" }}>{children}</div>}
    </div>
  );
}
// Nome del pilota nel riquadro col colore della scuderia, come nelle grafiche TV.
const InsName = ({ id, code, compact }) => (
  <div style={{ display: "flex", alignItems: "center", padding: compact ? "4px 6px" : "6px 8px", borderRadius: 5, background: `linear-gradient(90deg, ${teamColorOf(id)}66, ${teamColorOf(id)}1A)`, borderLeft: `4px solid ${teamColorOf(id)}`, minWidth: 0 }}>
    <span style={{ fontFamily: F_HEAD, fontWeight: 900, fontSize: compact ? 11 : surname(id).length > 8 ? 11.5 : 13, letterSpacing: .4, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{compact ? code : surname(id)}</span>
  </div>
);
const InsLabel = ({ children, compact }) => <div style={{ fontFamily: F_HEAD, fontWeight: 900, fontSize: compact ? 8.5 : 9.5, letterSpacing: .6, color: INS.label, textAlign: "center", whiteSpace: "nowrap" }}>{children}</div>;
const InsValue = ({ children, compact, color = "#fff" }) => <div style={{ fontFamily: F_HEAD, fontWeight: 900, fontSize: compact ? 13 : 17, color, textAlign: "center", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{children}</div>;
const InsEmpty = ({ children }) => <p style={{ margin: 0, fontFamily: F_BODY, fontSize: 11.5, color: C.muted, lineHeight: 1.45 }}>{children}</p>;
const fmtS = v => v.toFixed(3) + "s";

// variant: "full" (pagina Race e schede), "compact" (grafica del Second Screen), "ticker" (solo titolo e fascia,
// per il banner sulla mappa e per le grafiche alte ½ posto). La fascia rossa dice già la cosa più importante.
function InsightBanner({ type, live, st, race, variant = "full", popup = false, onClose, kind }) {
  const compact = variant !== "full", ticker = variant === "ticker";
  const ctx = insightCtx(live, st, race);
  const shell = (title, sub, body, tickerSub) => <InsightShell type={type} title={title} sub={ticker ? (tickerSub || sub) : sub} compact={compact} popup={popup} onClose={onClose}>{ticker ? null : body}</InsightShell>;
  const lapsDone = st.cars[0] && st.cars[0].last ? st.cars[0].last.lapNo : 0;
  if (lapsDone < 2) return shell("B&T INSIGHTS", ticker ? "LE ANALISI ARRIVANO DOPO I PRIMI GIRI" : null, <InsEmpty>Le analisi della gara arrivano dopo i primi giri completati.</InsEmpty>);
  if (type === "sorpasso") {
    if (["sc", "vsc", "red"].includes(st.flag)) return shell("CHI RAGGIUNGE CHI", st.flag === "red" ? "BANDIERA ROSSA" : st.flag === "vsc" ? "VIRTUAL SAFETY CAR" : "SAFETY CAR IN PISTA", <InsEmpty>Con la neutralizzazione i distacchi si azzerano: le previsioni ripartono con la bandiera verde.</InsEmpty>);
    const f = BtInsights.catchForecast(ctx);
    if (!f) {
      // Nessuno sta recuperando: la lotta più stretta, se qualcuno è già entro 1 secondo.
      const close = st.cars.map((c, i) => ({ c, a: st.cars[i - 1] })).filter(x => x.a && !x.c.dnf && !x.a.dnf && !x.c.pit && x.c.lapsDown === 0 && x.c.interval != null && x.c.interval < 1).sort((x, y) => x.c.interval - y.c.interval)[0];
      if (!close) return shell("CHI RAGGIUNGE CHI", "DISTACCHI STABILI", <InsEmpty>Nessun pilota sta recuperando su chi gli sta davanti, per ora.</InsEmpty>);
      return shell("CHI RAGGIUNGE CHI", `LOTTA IN CORSO · ${close.c.code} È A ${fmtS(close.c.interval)} DA ${close.a.code}`, (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)", gap: compact ? 6 : 10, alignItems: "center" }}>
          <InsName id={close.a.id} code={close.a.code} compact={compact} />
          <div style={{ textAlign: "center" }}><InsLabel compact={compact}>DISTACCO</InsLabel><InsValue compact={compact} color={INS.up}>{fmtS(close.c.interval)}</InsValue></div>
          <InsName id={close.c.id} code={close.c.code} compact={compact} />
          <div style={{ gridColumn: "1 / -1", textAlign: "center", fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: compact ? 12 : 14, color: "#fff" }}>GIÀ A PORTATA DI SORPASSO</div>
        </div>
      ));
    }
    const giri = f.laps === 1 ? "1 GIRO" : f.laps + " GIRI";
    return shell("CHI RAGGIUNGE CHI", `${f.behind.code} RAGGIUNGE ${f.ahead.code} IN ${giri} · A 1 SECONDO AL GIRO ${f.atLap}`, (
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)", gap: compact ? 6 : 10, alignItems: "center" }}>
        <div style={{ minWidth: 0 }}><InsName id={f.ahead.id} code={f.ahead.code} compact={compact} /><div style={{ marginTop: 4 }}><InsLabel compact={compact}>PASSO</InsLabel><InsValue compact={compact}>{LiveSim.fmtLap(f.paceAhead)}</InsValue></div></div>
        <div style={{ textAlign: "center" }}>
          <InsLabel compact={compact}>DISTACCO</InsLabel><InsValue compact={compact}>{fmtS(f.gap)}</InsValue>
          <div style={{ marginTop: 3 }}><InsLabel compact={compact}>RECUPERA AL GIRO</InsLabel><InsValue compact={compact} color={INS.up}>−{f.diff.toFixed(3)}s</InsValue></div>
        </div>
        <div style={{ minWidth: 0 }}><InsName id={f.behind.id} code={f.behind.code} compact={compact} /><div style={{ marginTop: 4 }}><InsLabel compact={compact}>PASSO</InsLabel><InsValue compact={compact}>{LiveSim.fmtLap(f.paceBehind)}</InsValue></div></div>
        <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: compact ? 2 : 4 }}>
          <span style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: compact ? 12 : 15, color: "#fff" }}>TI RAGGIUNGE IN</span>
          <span style={{ padding: compact ? "1px 7px" : "2px 9px", borderRadius: 6, background: INS.hi, fontFamily: F_HEAD, fontWeight: 900, fontSize: compact ? 14 : 18, color: INS.hiInk }}>{giri}</span>
        </div>
      </div>
    ), `${f.behind.code} RAGGIUNGE ${f.ahead.code} IN ${giri} · DISTACCO ${fmtS(f.gap)} · −${f.diff.toFixed(3)}s/GIRO`);
  }
  if (type === "strategia") {
    const car = st.cars.find(c => !c.dnf) || st.cars[0];
    const r = BtInsights.strategies({ car, lap: st.lap, totalLaps: st.totalLaps, lapTime: ctx.lapTime });
    const chip = k => <span title={TYRE_WORD[k]} aria-label={TYRE_WORD[k]} style={{ width: compact ? 16 : 19, height: compact ? 16 : 19, borderRadius: "50%", border: `2.5px solid ${TYRE_UI[k][0]}`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: F_HEAD, fontWeight: 900, fontSize: compact ? 8.5 : 10, color: "#fff", flexShrink: 0 }}>{k}</span>;
    const boxes = o => o.stops === 0 ? "NESSUNA SOSTA" : o.stops === 1 ? `BOX GIRI ${o.window[0]}–${o.window[1]}` : `BOX GIRI ${o.pits[0]} E ${o.pits[1]}`;
    const best = r.options.find(o => o.best);
    return shell("STRATEGIE AI BOX", `${car.code} · ${(TYRE_WORD[car.tyre] || "").toUpperCase()} DA ${car.tyreAge} ${car.tyreAge === 1 ? "GIRO" : "GIRI"} · ${st.totalLaps - st.lap} GIRI ALLA FINE`, (
      <div style={{ display: "flex", flexDirection: "column", gap: compact ? 4 : 6 }}>
        {r.options.map(o => (
          <div key={o.stops} data-strategy={o.stops} style={{ display: "flex", alignItems: "center", gap: compact ? 6 : 9, padding: compact ? "4px 6px" : "6px 8px", borderRadius: 7, background: o.best ? "rgba(231,179,76,.12)" : "rgba(255,255,255,.04)", border: `1px solid ${o.best ? "rgba(231,179,76,.55)" : "transparent"}` }}>
            <span style={{ width: compact ? 52 : 64, fontFamily: F_HEAD, fontWeight: 900, fontSize: compact ? 11 : 13, color: "#fff", flexShrink: 0 }}>{o.stops === 0 ? "0 SOSTE" : o.stops === 1 ? "1 SOSTA" : o.stops + " SOSTE"}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: compact ? 9.5 : 11, color: INS.label, letterSpacing: .4 }}>{boxes(o)}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>{o.compounds.map((k, i) => <React.Fragment key={i}>{i > 0 && <span style={{ color: C.dim, fontSize: 10 }}>→</span>}{chip(k)}</React.Fragment>)}</div>
            </div>
            <span style={{ fontFamily: F_HEAD, fontWeight: 900, fontSize: compact ? 12 : 14, color: o.best ? INS.hi : "#fff", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{o.best ? "CONSIGLIATA" : "+" + o.delta.toFixed(1) + "s"}</span>
          </div>
        ))}
        {!compact && <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", fontFamily: F_BODY, fontSize: 9.5, color: C.dim }}>{["S", "M", "H"].map(k => <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: "50%", border: `2px solid ${TYRE_UI[k][0]}` }} />{k} = {TYRE_WORD[k].toLowerCase()}</span>)}</div>}
      </div>
    ), best ? `${car.code} · CONSIGLIATA: ${best.stops === 1 ? "1 SOSTA" : best.stops + " SOSTE"}, ${boxes(best)} · ${best.compounds.map(k => TYRE_WORD[k].toUpperCase()).join(" → ")}` : null);
  }
  if (type === "passo") {
    const rows = BtInsights.racePace({ ...ctx, n: 5, top: compact ? 4 : 5 });
    if (!rows.length) return shell("RITMO GARA", "SERVONO ALTRI GIRI", <InsEmpty>Servono almeno 3 giri buoni per il ritmo gara.</InsEmpty>);
    const worst = Math.max(0.05, ...rows.map(r => r.delta));
    return shell("RITMO GARA", "MEDIA DEGLI ULTIMI 5 GIRI · I PRIMI IN GARA", (
      <div style={{ display: "flex", flexDirection: "column", gap: compact ? 3 : 5 }}>
        {rows.map((r, i) => (
          <div key={r.id} style={{ display: "grid", gridTemplateColumns: `${compact ? 52 : 112}px 1fr auto`, alignItems: "center", gap: 8 }}>
            <InsName id={r.id} code={r.code} compact={compact} />
            <span style={{ height: compact ? 5 : 7, borderRadius: 4, background: "rgba(255,255,255,.07)", overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: `${100 - 70 * r.delta / worst}%`, background: i === 0 ? TIMING.purple : INS.up, borderRadius: 4 }} /></span>
            <span style={{ fontFamily: F_HEAD, fontWeight: 900, fontSize: compact ? 11 : 13, color: "#fff", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{LiveSim.fmtLap(r.avg)} <span style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: compact ? 9 : 10.5, color: i === 0 ? TIMING.purple : C.muted }}>{i === 0 ? "MIGLIORE" : "+" + r.delta.toFixed(3)}</span></span>
          </div>
        ))}
      </div>
    ), "PIÙ VELOCE: " + rows.slice(0, 3).map((r, i) => i === 0 ? `${r.code} ${LiveSim.fmtLap(r.avg)}` : `${r.code} +${r.delta.toFixed(3)}`).join(" · "));
  }
  // Tabella a tre colonne come la grafica TV: valori del primo a sinistra, nomi delle voci al centro, del secondo a destra.
  const duel = (A, B, rows) => (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)", gap: compact ? "3px 8px" : "5px 12px", alignItems: "center" }}>
      <InsName id={A.id} code={A.code} compact={compact} /><span /><InsName id={B.id} code={B.code} compact={compact} />
      {rows.map(([label, a, b, colA, colB], i) => (
        <React.Fragment key={i}>
          <InsValue compact={compact} color={colA}>{a}</InsValue>
          <InsLabel compact={compact}>{label}</InsLabel>
          <InsValue compact={compact} color={colB}>{b}</InsValue>
        </React.Fragment>
      ))}
    </div>
  );
  if (type === "frenata") {
    const ids = st.cars.filter(c => !c.dnf && c.last).slice(0, 2).map(c => c.id);
    const b = ids.length === 2 ? BtInsights.braking({ ...ctx, ids }) : null;
    if (!b) return shell("FRENATA A CONFRONTO", "SERVE UN GIRO COMPLETO", <InsEmpty>La telemetria della frenata arriva dopo il primo giro completo.</InsEmpty>);
    return shell("FRENATA A CONFRONTO", `FRENATA PIÙ FORTE · CURVA ${b.turn}`, duel(b.a, b.b, [
      ["SPAZIO DI FRENATA", `${b.a.brakeM} M`, `${b.b.brakeM} M`],
      ["VELOCITÀ MAX", `${b.a.top} KM/H`, `${b.b.top} KM/H`],
      ["CALO DI VELOCITÀ", `${b.a.drop} KM/H`, `${b.b.drop} KM/H`],
      ["G MAX", `${b.a.g.toFixed(1)} G`, `${b.b.g.toFixed(1)} G`],
    ]), `CURVA ${b.turn} · ${b.a.code} ${b.a.top}→${b.a.low} KM/H IN ${b.a.brakeM} M · ${b.a.g.toFixed(1)} G · ${b.b.code} ${b.b.g.toFixed(1)} G`);
  }
  // vettura: curve lente, medie o veloci (cambia ogni giro, o la sceglie chi guarda)
  const k = kind || CORNER_KINDS[st.lap % 3][0];
  const r = BtInsights.carScores({ ...ctx, kind: k });
  const [A, B] = r.pair;
  const kLabel = (CORNER_KINDS.find(c => c[0] === k) || CORNER_KINDS[1])[1];
  return shell("PAGELLA MONOPOSTO", kLabel, duel(A, B, [
    ["POSIZIONE", A.rank + "°", B.rank + "°", INS.hi, INS.hi],
    ["VOTO / 10", A.score.toFixed(1), B.score.toFixed(1)],
    ["TEMPO PERSO", A.lost.toFixed(3) + "s", B.lost.toFixed(3) + "s"],
  ]), `${kLabel} · ${A.code} ${A.rank}° ${A.score.toFixed(1)}/10 · ${B.code} ${B.rank}° ${B.score.toFixed(1)}/10`);
}

// Nella pagina Race, durante la gara: le cinque grafiche, una alla volta.
function InsightsCard({ live, st, race }) {
  const [type, setType] = useState("sorpasso");
  const [kind, setKind] = useState(null);
  return (
    <div data-insights="" style={{ margin: "0 16px 14px", padding: "12px 12px 12px", borderRadius: 18, background: C.card, border: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 14, color: C.text }}><span style={{ padding: "1px 6px", borderRadius: 5, background: C.accent, color: "#fff", marginRight: 6 }}>B&amp;T</span>INSIGHTS</span>
        <span style={{ marginLeft: "auto", fontFamily: F_BODY, fontSize: 10.5, color: C.dim }}>analisi nostre · dati demo</span>
      </div>
      <div className="scrollrow" style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", marginBottom: 10 }}>
        {INSIGHT_TYPES.map(([id, l]) => <button key={id} data-insight-tab={id} className="press" aria-pressed={type === id ? "true" : "false"} onClick={() => setType(id)} style={{ flex: "0 0 auto", padding: "6px 11px", borderRadius: 999, background: type === id ? "rgba(232,18,29,.18)" : "rgba(255,255,255,.05)", border: `1px solid ${type === id ? INS.band : C.border}`, fontFamily: F_BODY, fontWeight: 700, fontSize: 11.5, color: type === id ? C.text : C.muted }}>{l}</button>)}
      </div>
      {type === "vettura" && (
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          {CORNER_KINDS.map(([id, , l]) => <button key={id} className="press" aria-pressed={(kind || CORNER_KINDS[st.lap % 3][0]) === id ? "true" : "false"} onClick={() => setKind(id)} style={{ ...aChip((kind || CORNER_KINDS[st.lap % 3][0]) === id, INS.band), fontSize: 10.5 }}>{l}</button>)}
        </div>
      )}
      <InsightBanner type={type} live={live} st={st} race={race} kind={type === "vettura" ? kind : undefined} />
      <p style={{ margin: "8px 2px 0", fontFamily: F_BODY, fontSize: 10.5, color: C.dim, lineHeight: 1.45 }}>Grafiche disegnate da B&T con i nostri calcoli sui tempi e sulla telemetria della diretta (nell'app vera: dati OpenF1).</p>
    </div>
  );
}

// Banner che compare da solo sulla mappa (Second Screen e mappa grande), come in TV: ogni 3 giri,
// nella prima parte del giro, una grafica diversa. Si può chiudere.
function insightPopupOf(st, track) {
  if (!st || !isRaceType(st.type) || st.finished || st.lap < 3 || st.lap % 3 !== 0) return null;
  const lead = st.cars.find(c => !c.dnf); if (!lead) return null;
  const prog = ((lead.dist % track.lenM) + track.lenM) % track.lenM / track.lenM;
  if (prog > 0.45) return null;
  return { lap: st.lap, type: INSIGHT_TYPES[(st.lap / 3) % INSIGHT_TYPES.length][0] };
}
function InsightPopup({ live, st, race, style, hidden = false }) {
  const [closedLap, setClosedLap] = useState(null);
  if (!live || !st || hidden) return null;
  const pop = insightPopupOf(st, live.track);
  if (!pop || closedLap === pop.lap) return null;
  return (
    <div data-insight-popup={pop.type} style={{ position: "absolute", left: "50%", bottom: 10, transform: "translateX(-50%)", width: "min(520px, 94%)", zIndex: 4, ...style }}>
      <InsightBanner type={pop.type} live={live} st={st} race={race} variant="ticker" popup onClose={() => setClosedLap(pop.lap)} />
    </div>
  );
}

/* ── SECOND SCREEN: in orizzontale, mappa grande e grafiche ai lati ─────── */
const SS_WIDGETS = [["classifica", "Classifica"], ["settori", "Settori e minisettori"], ["telemetria", "Telemetria pilota"], ["gomme", "Usura gomme"], ["meteo", "Meteo"], ["radio", "Radio"], ["direzione", "Direzione gara"], ["voto", "Pilota e scuderia del giorno"], ["insights", "B&T Insights"], ["chat", "Chat dei tifosi"]];
// gomme e settori: i piloti scelti (null = i primi in gara); telemetria: il pilota scelto; radar sulla mappa
const SS_PREFS_INIT = { tyre: null, sec: null, tel: null, radar: false };
// Due colonne ai lati della mappa, ognuna alta 2 posti (4 mezzi posti): una grafica è alta ½ posto (h 1),
// 1 posto (h 2), 1 posto e mezzo (h 3) o 2 posti (h 4). L'altezza si cambia con la maniglietta in basso a destra.
const SS_COL_UNITS = 4;
const SS_SIZE_TEXT = { 1: "½ posto", 2: "1 posto", 3: "1 posto e mezzo", 4: "2 posti" };
const SS_SIZE_SHORT = { 1: "½", 2: "1", 3: "1½", 4: "2" };
// Più è alta la grafica, più piloti si scelgono (gomme e settori).
const SS_DRIVERS = { 1: 2, 2: 4, 3: 6, 4: 10 };
const SS_LAYOUT_INIT = { left: [{ id: "classifica", h: 2 }, { id: "gomme", h: 2 }], right: [{ id: "settori", h: 2 }, { id: "telemetria", h: 2 }] };
const ssUsed = col => col.reduce((a, w) => a + w.h, 0);
const ssWhere = (layout, id) => { for (const side of ["left", "right"]) { const i = layout[side].findIndex(w => w.id === id); if (i >= 0) return { side, i }; } return null; };
const ssFit = h => Math.max(1, Math.min(SS_COL_UNITS, Math.floor(h)));   // la misura più grande che sta in h mezzi posti
// Nuova altezza di una grafica (h in mezzi posti, da 1 a 4). Se nella colonna non c'è posto, le altre grafiche
// della colonna si stringono (prima quella sotto, poi quella sopra) fino a ½ posto; se non basta, la grafica
// si ferma all'altezza più grande possibile (capped).
function ssResize(layout, id, h) {
  const at = ssWhere(layout, id); if (!at) return { layout, capped: false, others: 0 };
  const col = layout[at.side].map(w => ({ ...w })), others = col.length - 1;
  const want = ssFit(h), target = Math.min(want, SS_COL_UNITS - others);
  col[at.i].h = target;
  let over = ssUsed(col) - SS_COL_UNITS;
  const order = col.map((w, i) => i).filter(i => i > at.i).concat(col.map((w, i) => i).filter(i => i < at.i).reverse());
  for (const i of order) { if (over <= 0) break; const cut = Math.min(over, col[i].h - 1); col[i].h -= cut; over -= cut; }
  return { layout: { ...layout, [at.side]: col }, capped: want > target, others };
}
const ssCapText = others => others === 1
  ? "Alta 2 posti solo se è da sola nella colonna: sposta o togli l'altra grafica (tasto Modifica)."
  : `Con altre ${others} grafiche nella colonna arriva al massimo a ${SS_SIZE_TEXT[SS_COL_UNITS - others]}: per farla più alta sposta o togli un'altra grafica (tasto Modifica).`;
const TYRE_UI = { S: ["#E8121D", "Morbida"], M: ["#F2C230", "Media"], H: ["#F4F2EF", "Dura"] };
// Radio dei team (demo): una nuova ogni 45 secondi di sessione, dai piloti di testa.
const RADIO_LINES = ["Box, box. Box questo giro.", "Gomme ok, possiamo spingere.", "Il distacco dietro è stabile, gestisci.", "Bandiera gialla nel settore 2, attento.", "Overtake mode disponibile, attacca!", "Occhio alle temperature dei freni.", "Ottimo giro, continua così.", "Il radar dice pioggia tra poco, teniamoci pronti."];
function radioFeed(st, n = 3) {
  if (!st) return RADIOS.slice(0, n).map(r => ({ who: r.driver, text: r.text.replace(/[“”]/g, ""), when: r.time }));
  const k = Math.floor(st.t / 45), m = Math.min(10, st.cars.length), out = [];
  for (let i = k; i > k - n && i >= 0; i--) {
    const c = st.cars[(i * 7) % m];
    out.push({ who: c.code, text: RADIO_LINES[(i * 5) % RADIO_LINES.length], when: isRaceType(st.type) ? `Giro ${Math.max(1, st.lap - (k - i))}` : st.clockText });
  }
  return out;
}
// Piloti scelti per gomme o settori (al massimo n, nell'ordine della gara); senza scelta i primi n in pista.
const ssChosen = (st, ids, n = SS_DRIVERS[2]) => (ids && ids.length ? st.cars.filter(c => ids.includes(c.id)) : st.cars.filter(c => !c.dnf)).slice(0, n);

function SsCard({ id, title, children, action, attrs }) {
  return (
    <div data-ss-widget={id} {...(attrs || {})} style={{ height: "100%", display: "flex", flexDirection: "column", padding: "7px 9px 8px", borderRadius: 12, background: "rgba(24,24,28,.92)", border: `1px solid ${C.border}`, overflow: "hidden", minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexShrink: 0 }}>
        <span data-ss-title="" style={{ flex: 1, minWidth: 0, fontFamily: F_BODY, fontWeight: 700, fontSize: 9, letterSpacing: .6, color: C.dim, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</span>
        {action}
        {!action && <span aria-hidden="true" style={{ display: "inline-flex", opacity: .5 }}><Icon name="chevron" size={10} color={C.dim} /></span>}
      </div>
      <div data-ss-body="" style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>{children}</div>
    </div>
  );
}
// Elenco di righe che mostra solo righe intere: quelle che non entrano nell'altezza vanno a capo in una
// seconda colonna, fuori dalla grafica (nascosta). Le righe hanno width 100% e flexShrink 0.
const ssRows = gap => ({ display: "flex", flexDirection: "column", flexWrap: "wrap", alignContent: "flex-start", height: "100%", overflow: "hidden", rowGap: gap, columnGap: 24 });
const SS_CARD_TITLE = { settori: "SETTORI", gomme: "GOMME" };   // titoli corti: accanto c'è quanti piloti si vedono
// Tasto piccolo nell'intestazione di una grafica: non apre la scheda e non fa scattare lo spostamento.
const ssAction =(label, onClick) => <button className="press" aria-label={label} onClick={e => { if (e && e.stopPropagation) e.stopPropagation(); onClick(); }} style={{ flexShrink: 0, padding: "2px 7px", borderRadius: 6, background: "rgba(255,255,255,.08)", border: `1px solid ${C.border}`, fontFamily: F_BODY, fontWeight: 700, fontSize: 9, color: C.muted }}>Scegli</button>;

// Telemetria del giro come nella pagina Race: velocità (e, se c'è spazio, gas e marce) contro il giro più veloce.
function SsLapCharts({ live, st, carId, charts = ["speed"], hover = null, onHover = () => {}, grid = false }) {
  const car = st.cars.find(c => c.id === carId);
  const lapNo = car && car.last ? car.last.lapNo : null;
  const tel = lapNo ? live.sim.telemetry(carId, lapNo) : null;
  if (!tel) return <p style={{ margin: 0, fontFamily: F_BODY, fontSize: 10.5, color: C.dim }}>Il grafico arriva quando {car ? car.code : "il pilota"} completa un giro.</p>;
  const bl = st.bestLap && !(st.bestLap.id === carId && st.bestLap.lapNo === lapNo) ? live.sim.telemetry(st.bestLap.id, st.bestLap.lapNo) : null;
  const color = teamColorOf(carId), common = { tel, range: [0, live.track.lenM], hover, onHover, color };
  const C4 = {
    speed: <TelChart key="speed" {...common} label="Velocità" unit="km/h" field="speed" cmp={bl} yMin={50} yMax={350} kind="line" ticks={[100, 200, 300]} />,
    throttle: <TelChart key="throttle" {...common} label="Acceleratore" unit="%" field="throttle" cmp={null} yMin={0} yMax={100} kind="area" ticks={[0, 50, 100]} />,
    brake: <TelChart key="brake" {...common} label="Freno" unit="acceso/spento" field="brake" cmp={null} yMin={0} yMax={1} kind="brake" ticks={[]} />,
    gear: <TelChart key="gear" {...common} label="Marcia" unit="1–8" field="gear" cmp={bl} yMin={1} yMax={8} kind="gear" ticks={[2, 4, 6, 8]} />,
  };
  // Nella scheda (grid): come la telemetria della pagina Race, con velocità massima e minima, gas a tavoletta e valori nel punto toccato.
  const top = Math.max(...tel.speed), low = Math.min(...tel.speed), full = Math.round(tel.throttle.filter(x => x >= 99).length / tel.throttle.length * 100);
  const hv = hover != null && tel.dist[hover] != null ? { d: tel.dist[hover], v: tel.speed[hover], thr: tel.throttle[hover], br: tel.brake[hover], g: tel.gear[hover], rpm: tel.rpm[hover] } : null;
  return (
    <div>
      {grid && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 6 }}>
          {[["VELOCITÀ MAX", top + " km/h"], ["VELOCITÀ MIN", low + " km/h"], ["GAS A TAVOLETTA", full + "%"]].map(([l, v]) => (
            <div key={l} style={{ padding: "5px 6px", borderRadius: 9, background: "rgba(255,255,255,.04)", textAlign: "center" }}>
              <div style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 13, color: C.text }}>{v}</div>
              <div style={{ fontFamily: F_BODY, fontWeight: 600, fontSize: 8.5, letterSpacing: .5, color: C.dim }}>{l}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 10px", marginBottom: 2, fontFamily: F_BODY, fontSize: 9.5, color: C.muted }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 12, height: 2, background: color }} />{tel.code} giro {lapNo} · {LiveSim.fmtLap(tel.time)}</span>
        {bl && <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 12, height: 2, background: "#8E8E96" }} />{bl.code} giro più veloce ({LiveSim.fmtLap(bl.time)})</span>}
      </div>
      {grid && <div style={{ minHeight: 15, marginBottom: 2, fontFamily: F_BODY, fontSize: 10.5, color: C.text, fontVariantNumeric: "tabular-nums" }}>{hv ? <><b>{hv.v} km/h</b> · gas {hv.thr}% · freno {hv.br ? "sì" : "no"} · marcia {hv.g} · {hv.rpm} giri/min · {hv.d} m</> : <span style={{ color: C.dim }}>Tocca un grafico per leggere i valori in quel punto.</span>}</div>}
      {grid ? <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0 12px" }}>{charts.map(k => C4[k])}</div> : charts.map(k => C4[k])}
    </div>
  );
}

function SsWidget({ id, h = 2, st, live, race, standings, prefs, setPrefs, onPicker, vote, onVote, chat, blocked = [] }) {
  const row = { display: "flex", alignItems: "center", gap: 6, fontFamily: F_BODY, fontSize: 10.5, color: C.text, lineHeight: 1.25, padding: "1.5px 0", width: "100%", flexShrink: 0 };
  const title = (SS_WIDGETS.find(w => w[0] === id) || [id, id])[1].toUpperCase();
  const fits = { 1: 4, 2: 10, 3: 16, 4: 22 }[h] || 10;   // righe al massimo: se ne vedono solo quelle intere che entrano
  const nDrivers = SS_DRIVERS[h] || SS_DRIVERS[2];        // piloti di gomme e settori per questa altezza
  if (id === "classifica") {
    const rows = st ? st.cars.slice(0, fits).map(c => ({ k: c.id, pos: c.pos, code: c.code, color: c.color, dnf: c.dnf, right: c.dnf ? "RIT" : isRaceType(st.type) ? (c.pos === 1 ? "LEADER" : c.lapsDown > 0 ? `+${c.lapsDown}G` : fmtGap(c.interval)) : (c.best ? LiveSim.fmtLap(c.best.time) : "—") }))
      : standings.drivers.slice().sort((a, b) => a.position - b.position).slice(0, fits).map(r => { const d = driverById(r.id); return { k: r.id, pos: r.position, code: d ? driverCode(d) : r.id, color: d ? d.color : C.dim, right: r.points + " pt" }; });
    return <SsCard id={id} title={st ? title : "MONDIALE PILOTI"}><div style={ssRows(0)}>{rows.map(r => (
      <div key={r.k} style={row}><span style={{ width: 13, fontFamily: F_HEAD, fontWeight: 800 }}>{r.pos}</span><span style={{ width: 3, height: 11, borderRadius: 2, background: r.color }} /><span style={{ flex: 1, fontFamily: F_HEAD, fontWeight: 800 }}>{r.code}</span><span style={{ color: r.dnf ? "#FF5A5F" : C.muted, fontVariantNumeric: "tabular-nums" }}>{r.right}</span></div>
    ))}</div></SsCard>;
  }
  if (id === "settori") {
    if (!st) return <SsCard id={id} title={title}><p style={{ margin: 0, fontFamily: F_BODY, fontSize: 11, color: C.dim, lineHeight: 1.4 }}>Settori e minisettori si vedono durante le sessioni in diretta.</p></SsCard>;
    const cars = ssChosen(st, prefs.sec, nDrivers);
    return (
      <SsCard id={id} title={SS_CARD_TITLE.settori + (prefs.sec && prefs.sec.length ? ` · ${cars.length} SCELTI` : ` · PRIMI ${nDrivers}`)} action={ssAction("Scegli i piloti dei settori", () => onPicker("settori"))}>
        <div style={ssRows(h === 3 ? 8 : h === 4 ? 5 : h === 1 ? 2 : 3)}>
          {cars.map(c => (
            <div key={c.id} data-ss-sector-row={c.id} style={{ display: "flex", alignItems: "center", gap: 5, width: "100%", flexShrink: 0 }}>
              <span style={{ width: 3, alignSelf: "stretch", borderRadius: 2, background: c.color, flexShrink: 0 }} />
              <span style={{ width: 26, fontFamily: F_HEAD, fontWeight: 800, fontSize: 10.5, color: C.text, flexShrink: 0 }}>{c.code}</span>
              <SectorCells c={c} compact tiny={h === 1} style={{ flex: 1, minWidth: 0 }} />
            </div>
          ))}
        </div>
      </SsCard>
    );
  }
  if (id === "telemetria") {
    if (!st || !live) return <SsCard id={id} title={title}><p style={{ margin: 0, fontFamily: F_BODY, fontSize: 11, color: C.dim, lineHeight: 1.4 }}>La telemetria pilota si vede durante le sessioni in diretta.</p></SsCard>;
    const ids = st.cars.map(c => c.id), cur = ids.includes(prefs.tel) ? prefs.tel : ids[0];
    const lt = live.sim.liveTelemetry(cur) || {};
    const car = st.cars.find(c => c.id === cur);
    const step = dir => setPrefs(p => ({ ...p, tel: ids[(ids.indexOf(cur) + dir + ids.length) % ids.length] }));
    const arrow = (dir, label) => <button className="press" aria-label={label} onClick={e => { if (e && e.stopPropagation) e.stopPropagation(); step(dir); }} style={{ width: 20, height: 20, borderRadius: 6, background: "rgba(255,255,255,.07)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span style={{ display: "inline-flex", transform: dir < 0 ? "rotate(180deg)" : "none" }}><Icon name="chevron" size={10} sw={2.6} /></span></button>;
    return (
      <SsCard id={id} title={title} attrs={{ "data-ss-tel-driver": cur }} action={ssAction("Scegli il pilota della telemetria", () => onPicker("telemetria"))}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {arrow(-1, "Pilota precedente")}
          <span style={{ fontFamily: F_HEAD, fontWeight: 900, fontSize: 12.5, color: car ? car.color : C.text }}>{lt.code}</span>
          <span style={{ fontFamily: F_BODY, fontWeight: 600, fontSize: 9.5, color: C.dim }}>P{car ? car.pos : "-"}</span>
          <span data-ss-tel-speed="" style={{ marginLeft: "auto", fontFamily: F_HEAD, fontWeight: 900, fontSize: 13, color: C.text, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{lt.speed} km/h</span>
          {arrow(1, "Pilota successivo")}
        </div>
        <div style={{ margin: "1px 0 3px", fontFamily: F_BODY, fontSize: 9.5, color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Marcia <b style={{ color: C.text }}>{lt.pit ? "N" : lt.gear}</b> · Gas <b style={{ color: C.text }}>{lt.throttle || 0}%</b> · Freno <b style={{ color: C.text }}>{lt.brake ? "sì" : "no"}</b></div>
        {h > 1 && <SsLapCharts live={live} st={st} carId={cur} charts={h === 4 ? ["speed", "throttle", "gear"] : h === 3 ? ["speed", "throttle"] : ["speed"]} />}
      </SsCard>
    );
  }
  if (id === "gomme") {
    // Di norma i primi in gara; con "Scegli" i piloti che vuoi tu (nell'ordine della gara): 2, 4, 6 o 10 secondo l'altezza.
    const chosen = prefs.tyre && prefs.tyre.length ? prefs.tyre : null;
    const rows = st ? ssChosen(st, chosen, nDrivers).map(c => ({ k: c.id, code: c.code, tyre: c.tyre, age: c.tyreAge, wear: c.wear || 0, pit: c.pit, dnf: c.dnf }))
      : TIRES.slice(0, nDrivers).map(t => { const d = driverByName(t.name); return { k: t.name, code: d ? driverCode(d) : t.name, tyre: t.compound === "Morbida" ? "S" : t.compound === "Dura" ? "H" : "M", age: null, wear: t.wear }; });
    return <SsCard id={id} title={st ? SS_CARD_TITLE.gomme + (chosen ? ` · ${rows.length} SCELTI` : ` · PRIMI ${nDrivers}`) : title} action={st ? ssAction("Scegli i piloti delle gomme", () => onPicker("gomme")) : null}>
      <div style={ssRows(h >= 3 ? 9 : 2)}>{rows.map(r => (
        <div key={r.k} data-ss-tyre-row={r.k} style={row}>
          <span style={{ width: 28, fontFamily: F_HEAD, fontWeight: 800 }}>{r.code}</span>
          <span title={TYRE_UI[r.tyre][1]} style={{ width: 11, height: 11, borderRadius: "50%", border: `2.5px solid ${TYRE_UI[r.tyre][0]}`, flexShrink: 0 }} />
          <span style={{ flex: 1, height: 5, borderRadius: 3, background: "rgba(255,255,255,.08)", overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: r.wear + "%", background: r.wear > 75 ? C.accent : r.wear > 50 ? TIMING.yellow : TIMING.green }} /></span>
          <span style={{ width: 52, textAlign: "right", color: C.muted, fontVariantNumeric: "tabular-nums" }}>{r.dnf ? "RIT" : r.pit ? "BOX" : `${r.wear}%${r.age != null ? ` · ${r.age}g` : ""}`}</span>
        </div>
      ))}</div>
    </SsCard>;
  }
  if (id === "chat") {
    const msgs = (chat ? chat.messages : []).filter(m => !blocked.includes(m.from)).slice(-({ 1: 2, 2: 4, 3: 6, 4: 9 }[h] || 4));
    return <SsCard id={id} title="CHAT DEI TIFOSI"><div style={ssRows(3)}>{msgs.map(m => (
      <div key={m.id} data-ss-chat-msg="" style={{ width: "100%", flexShrink: 0, fontFamily: F_BODY, fontSize: 10.5, color: C.muted, lineHeight: 1.3 }}><b style={{ color: m.mine ? C.gold : C.text, fontFamily: F_HEAD }}>{m.from}</b> {m.text}</div>
    ))}</div></SsCard>;
  }
  if (id === "voto") {
    if (!st || st.type !== "RACE") return <SsCard id={id} title={title}><p style={{ margin: 0, fontFamily: F_BODY, fontSize: 11, color: C.dim, lineHeight: 1.4 }}>Il voto del pilota e della scuderia del giorno si apre durante il GP, da metà gara.</p></SsCard>;
    return <SsCard id={id} title="VOTO DEL GIORNO"><DotdVote st={st} race={race} vote={vote} onVote={onVote} onOpenPicker={k => onPicker("vote-" + k)} compact /></SsCard>;
  }
  if (id === "insights") {
    if (!st || !live || !isRaceType(st.type)) return <SsCard id={id} title={title}><p style={{ margin: 0, fontFamily: F_BODY, fontSize: 11, color: C.dim, lineHeight: 1.4 }}>Le grafiche B&amp;T Insights arrivano durante la gara.</p></SsCard>;
    const type = INSIGHT_TYPES[Math.floor(st.t / 20) % INSIGHT_TYPES.length][0];   // cambia ogni 20 secondi di gara
    return <SsCard id={id} title={title}><InsightBanner type={type} live={live} st={st} race={race} variant={h === 1 ? "ticker" : h === 4 ? "full" : "compact"} /></SsCard>;
  }
  if (id === "meteo") {
    const w = race ? weekendWeather(race, st ? st.t : 0, live && live.raceId === race.id ? live.type : null) : null;
    if (!w) return <SsCard id={id} title={title} />;
    const cell = (l, v) => <div style={{ padding: "4px 6px", borderRadius: 8, background: "rgba(255,255,255,.05)" }}><div style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 13, color: C.text }}>{v}</div><div style={{ fontFamily: F_BODY, fontSize: 8.5, letterSpacing: .5, color: C.dim }}>{l}</div></div>;
    return (
      <SsCard id={id} title={title}>
        <div style={{ display: "grid", gridTemplateColumns: h === 1 ? "repeat(4, 1fr)" : "1fr 1fr", gap: 4, marginBottom: 5 }}>{cell("ARIA", w.current.air.toFixed(0) + "°")}{cell("PISTA", w.current.track.toFixed(0) + "°")}{cell("UMIDITÀ", w.current.humidity + "%")}{cell("VENTO", w.current.wind.toFixed(0) + " km/h")}</div>
        <div style={{ ...row, color: C.muted }}><SkyIcon kind={w.current.rain ? "rain" : "cloud"} size={14} />{w.current.rain ? "Pioggia in corso" : "Pista asciutta"}</div>
      </SsCard>
    );
  }
  if (id === "radio") return <SsCard id={id} title={title + " · DEMO"}><div style={ssRows(4)}>{radioFeed(st, { 1: 1, 2: 3, 3: 4, 4: 6 }[h] || 3).map((r, i) => (
    <div key={i} style={{ width: "100%", flexShrink: 0, fontFamily: F_BODY, fontSize: 10.5, color: C.muted, lineHeight: 1.3 }}><b style={{ color: C.text, fontFamily: F_HEAD }}>{r.who}</b> <span style={{ color: C.dim }}>{r.when}</span><br />{r.text}</div>
  ))}</div></SsCard>;
  const msgs = st ? st.messages.slice(-({ 1: 1, 2: 3, 3: 5, 4: 7 }[h] || 3)).reverse() : [];
  return <SsCard id={id} title={title}>{msgs.length ? <div style={ssRows(4)}>{msgs.map((m, i) => (
    <div key={i} style={{ width: "100%", flexShrink: 0, fontFamily: F_BODY, fontSize: 10.5, color: C.muted, lineHeight: 1.3 }}><b style={{ color: C.text }}>{m.time}</b> {m.text}</div>
  ))}</div> : <p style={{ margin: 0, fontFamily: F_BODY, fontSize: 11, color: C.dim }}>Nessun messaggio: la sessione non è in corso.</p>}</SsCard>;
}

// Scheda di una grafica, a tutto schermo dentro il Second Screen (sempre in orizzontale). Indietro torna alla diretta.
function SsSheet({ id, st, live, race, standings, prefs, setPrefs, vote, onVote, onOpenPicker, onBack, chat, blocked = [], onChatSend }) {
  const [hover, setHover] = useState(null);
  const [draft, setDraft] = useState("");
  const title = (SS_WIDGETS.find(w => w[0] === id) || [id, id])[1];
  const th = { fontFamily: F_BODY, fontWeight: 700, fontSize: 9.5, letterSpacing: .8, color: C.dim, textAlign: "left", padding: "4px 6px", whiteSpace: "nowrap" };
  const td = { fontFamily: F_BODY, fontSize: 11.5, color: C.text, padding: "5px 6px", borderTop: `1px solid ${C.divider}`, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" };
  const noLive = <p style={{ margin: 0, fontFamily: F_BODY, fontSize: 12.5, color: C.dim }}>Questa scheda si riempie durante le sessioni in diretta.</p>;
  let body = null, attrs = {};
  if (id === "classifica") body = !st ? <SsWidget id="classifica" h={4} st={null} standings={standings} prefs={prefs} /> : (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead><tr>{["POS", "PILOTA", isRaceType(st.type) ? "DISTACCO" : "MIGLIOR GIRO", isRaceType(st.type) ? "INTERVALLO" : "", "ULTIMO GIRO", "GOMME", "SOSTE", ""].map((h, i) => <th key={i} style={th}>{h}</th>)}</tr></thead>
      <tbody>{st.cars.map(c => { const d = driverById(c.id); return (
        <tr key={c.id} data-ss-sheet-row={c.id} style={{ opacity: c.dnf ? .85 : 1 }}>
          <td style={{ ...td, fontFamily: F_HEAD, fontWeight: 800 }}>{c.pos}</td>
          <td style={td}><span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><span style={{ width: 3, height: 13, borderRadius: 2, background: c.color }} /><b style={{ fontFamily: F_HEAD }}>{c.code}</b><span style={{ color: C.muted }}>{d ? d.full : ""}</span></span></td>
          <td style={{ ...td, color: c.dnf ? "#FF5A5F" : C.muted }}>{c.dnf ? "RITIRATO" : isRaceType(st.type) ? (c.pos === 1 ? "LEADER" : c.lapsDown > 0 ? `+${c.lapsDown} giri` : fmtGap(c.gap)) : (c.best ? LiveSim.fmtLap(c.best.time) : "—")}</td>
          <td style={{ ...td, color: C.muted }}>{c.dnf || !isRaceType(st.type) || c.pos === 1 ? "" : fmtGap(c.interval)}</td>
          <td style={td}>{c.last ? LiveSim.fmtLap(c.last.time) : "—"}</td>
          <td style={td}><span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: "50%", border: `2.5px solid ${TYRE_UI[c.tyre][0]}` }} />{c.tyreAge}g</span></td>
          <td style={td}>{c.stops}</td>
          <td style={td}>{c.dnf ? <DnfTile cause={c.dnf.cause} width={46} style={{ padding: 1, borderRadius: 6 }} /> : c.pit ? <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 10, color: TIMING.pit }}>BOX</span> : null}</td>
        </tr>
      ); })}</tbody>
    </table>
  );
  else if (id === "settori") body = !st ? noLive : (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "6px 14px" }}>
      {st.cars.map(c => (
        <div key={c.id} data-ss-sheet-row={c.id} style={{ display: "flex", alignItems: "center", gap: 7, padding: "4px 0", borderTop: `1px solid ${C.divider}` }}>
          <span style={{ width: 18, fontFamily: F_HEAD, fontWeight: 800, fontSize: 11.5, color: C.text }}>{c.pos}</span>
          <span style={{ width: 3, alignSelf: "stretch", borderRadius: 2, background: c.color }} />
          <span style={{ width: 30, fontFamily: F_HEAD, fontWeight: 800, fontSize: 11.5, color: C.text }}>{c.code}</span>
          {c.dnf ? <DnfRow c={c} width={60} /> : <SectorCells c={c} compact style={{ flex: 1, minWidth: 0 }} />}
        </div>
      ))}
    </div>
  );
  else if (id === "telemetria") {
    const ids = st ? st.cars.map(c => c.id) : [], cur = ids.includes(prefs.tel) ? prefs.tel : ids[0];
    attrs = { "data-ss-tel-driver": cur || "" };
    body = !st || !live ? noLive : (
      <div style={{ display: "grid", gridTemplateColumns: "150px minmax(0, 1fr)", gap: 14 }}>
        <div className="scrollcol" style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: "100%" }}>
          <span style={{ ...th, padding: "0 2px 4px" }}>SCEGLI IL PILOTA</span>
          {st.cars.map(c => <button key={c.id} className="press" data-pick-driver={c.id} aria-pressed={cur === c.id ? "true" : "false"} onClick={() => { setPrefs(p => ({ ...p, tel: c.id })); setHover(null); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 7px", borderRadius: 8, background: cur === c.id ? "rgba(232,18,29,.18)" : "rgba(255,255,255,.04)", border: `1px solid ${cur === c.id ? C.accent : "transparent"}`, textAlign: "left" }}><span style={{ width: 3, height: 13, borderRadius: 2, background: c.color }} /><b style={{ fontFamily: F_HEAD, fontSize: 11.5, color: C.text }}>{c.code}</b><span style={{ marginLeft: "auto", fontFamily: F_BODY, fontSize: 10, color: C.dim }}>P{c.pos}</span></button>)}
        </div>
        <div style={{ minWidth: 0 }}><SsLapCharts live={live} st={st} carId={cur} charts={["speed", "throttle", "brake", "gear"]} hover={hover} onHover={setHover} grid /></div>
      </div>
    );
  }
  else if (id === "gomme") body = !st ? noLive : (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead><tr>{["POS", "PILOTA", "MESCOLA", "GIRI", "USURA", "SOSTE"].map((h, i) => <th key={i} style={th}>{h}</th>)}</tr></thead>
      <tbody>{st.cars.map(c => (
        <tr key={c.id} data-ss-sheet-row={c.id}>
          <td style={{ ...td, fontFamily: F_HEAD, fontWeight: 800 }}>{c.pos}</td>
          <td style={td}><b style={{ fontFamily: F_HEAD }}>{c.code}</b></td>
          <td style={td}><span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: "50%", border: `2.5px solid ${TYRE_UI[c.tyre][0]}` }} />{TYRE_UI[c.tyre][1]}</span></td>
          <td style={td}>{c.tyreAge}</td>
          <td style={{ ...td, width: "40%" }}><span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(255,255,255,.08)", overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: (c.wear || 0) + "%", background: c.wear > 75 ? C.accent : c.wear > 50 ? TIMING.yellow : TIMING.green }} /></span>{c.dnf ? "RIT" : c.pit ? "BOX" : (c.wear || 0) + "%"}</span></td>
          <td style={td}>{c.stops}</td>
        </tr>
      ))}</tbody>
    </table>
  );
  else if (id === "voto") body = !st || st.type !== "RACE" ? <p style={{ margin: 0, fontFamily: F_BODY, fontSize: 12.5, color: C.dim }}>Il voto si apre durante il GP, da metà gara.</p> : <DotdVote st={st} race={race} vote={vote} onVote={onVote} onOpenPicker={k => onOpenPicker("vote-" + k)} />;
  else if (id === "insights") body = !st || !live || !isRaceType(st.type) ? <p style={{ margin: 0, fontFamily: F_BODY, fontSize: 12.5, color: C.dim }}>Le grafiche B&amp;T Insights arrivano durante la gara.</p> : (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
      {INSIGHT_TYPES.map(([t]) => <InsightBanner key={t} type={t} live={live} st={st} race={race} />)}
    </div>
  );
  else if (id === "meteo") {
    const w = race ? weekendWeather(race, st ? st.t : 0, live && live.raceId === race.id ? live.type : null) : null;
    body = !w ? noLive : (
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.4fr)", gap: 14 }}>
        <SsWidget id="meteo" h={4} st={st} live={live} race={race} prefs={prefs} />
        <div>{w.sessions.map(x => <div key={x.key} style={{ padding: "6px 0", borderTop: `1px solid ${C.divider}`, fontFamily: F_BODY, fontSize: 11.5, color: C.muted, lineHeight: 1.4 }}><b style={{ color: C.text }}>{x.label}</b> · {x.text}</div>)}</div>
      </div>
    );
  }
  else if (id === "chat") body = (
    <div data-ss-chat="" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {(chat ? chat.messages : []).filter(m => !blocked.includes(m.from)).slice(-40).map(m => <div key={m.id} data-ss-chat-msg="" style={{ padding: "4px 0", borderTop: `1px solid ${C.divider}`, fontFamily: F_BODY, fontSize: 12.5, color: C.muted, lineHeight: 1.4 }}><b style={{ color: m.mine ? C.gold : C.text, fontFamily: F_HEAD }}>{m.from}</b> {m.text}</div>)}
      <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
        <label htmlFor="ssChatInput" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}>Scrivi in chat</label>
        <input id="ssChatInput" value={draft} onChange={e => setDraft(e.target.value)} placeholder="Scrivi alla community…" style={{ flex: 1, minWidth: 0, padding: "9px 12px", borderRadius: 11, background: C.bg, border: `1px solid ${C.border}`, color: C.text, fontFamily: F_BODY, fontSize: 13 }} />
        <button className="press" data-ss-chat-send="" onClick={() => { const t = draft.trim(); if (!t || !onChatSend) return; onChatSend(t); setDraft(""); }} style={{ padding: "0 14px", borderRadius: 11, background: C.accent, fontFamily: F_HEAD, fontWeight: 800, fontSize: 12, color: "#fff" }}>INVIA</button>
      </div>
    </div>
  );
  else if (id === "radio") body = radioFeed(st, 8).map((r, i) => <div key={i} style={{ padding: "7px 0", borderTop: i ? `1px solid ${C.divider}` : "none", fontFamily: F_BODY, fontSize: 12.5, color: C.muted, lineHeight: 1.4 }}><b style={{ color: C.text, fontFamily: F_HEAD }}>{r.who}</b> <span style={{ color: C.dim }}>{r.when}</span> · {r.text}</div>);
  else body = st ? <RaceControlList messages={st.messages} /> : noLive;
  return (
    <div data-ss-sheet={id} {...attrs} role="dialog" aria-label={title} onClick={e => { if (e && e.stopPropagation) e.stopPropagation(); }} style={{ position: "absolute", inset: 0, zIndex: 20, display: "flex", flexDirection: "column", background: "#09090B", padding: "8px 12px 10px", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <button className="press" aria-label="Indietro" onClick={onBack} style={{ height: 30, padding: "0 12px 0 8px", borderRadius: 9, background: "rgba(255,255,255,.08)", border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 6, fontFamily: F_HEAD, fontWeight: 800, fontSize: 12, color: "#fff" }}><span style={{ display: "inline-flex", transform: "rotate(180deg)" }}><Icon name="chevron" size={12} color="#fff" sw={2.6} /></span>Indietro</button>
        <span style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 15, color: C.text }}>{title.toUpperCase()}</span>
        <span style={{ fontFamily: F_BODY, fontSize: 11, color: C.muted }}>{st ? `${sessionName(st.type)} · ${liveCounter(st)}` : race ? race.name : ""}</span>
      </div>
      <div className="scrollcol" style={{ flex: 1, minHeight: 0, borderRadius: 12, background: "rgba(24,24,28,.6)", border: `1px solid ${C.border}`, padding: "8px 10px" }}>{body}</div>
    </div>
  );
}

// Radar meteo sopra la mappa del Second Screen, solo se l'utente lo accende: le zone di pioggia (demo)
// si spostano col vento. Il canvas non blocca i tocchi.
function RadarOverlay({ cells, windDeg }) {
  useEffect(() => {
    let raf = 0; const t0 = performance.now();
    const still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const draw = now => {
      const cv = document.getElementById("ssRadar");
      if (cv && cv.getContext && cv.parentNode) {
        const box = cv.parentNode.getBoundingClientRect();
        const W = Math.max(1, Math.round(box.width)), H = Math.max(1, Math.round(box.height));
        if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
        const ctx = cv.getContext("2d"), k = (now - t0) / 1000;
        ctx.clearRect(0, 0, W, H);
        cells.forEach(c => {
          const x = (((c.x + c.vx * k) % 1.8 + 1.8) % 1.8 - 0.4) * W, y = (((c.y + c.vy * k) % 1.4 + 1.4) % 1.4 - 0.2) * H, rad = c.r * W;
          const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
          const col = c.i > .75 ? "232,18,29" : c.i > .5 ? "242,194,48" : c.i > .3 ? "62,214,107" : "76,141,255";
          g.addColorStop(0, `rgba(${col},.5)`); g.addColorStop(.6, `rgba(${col},.2)`); g.addColorStop(1, `rgba(${col},0)`);
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
        });
      }
      if (!still) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [cells.length, windDeg]);
  return <canvas id="ssRadar" data-ss-radar="" role="img" aria-label="Radar meteo (demo)" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", borderRadius: 14, zIndex: 2 }} />;
}

// Filigrana B&T sulla diretta: piccola e trasparente, in un angolo, non blocca i tocchi.
// Chi fa uno screenshot o una registrazione dello schermo si porta dietro il logo dell'app.
function Watermark({ style }) {
  return (
    <div data-watermark="" aria-hidden="true" style={{ position: "absolute", right: 10, bottom: 10, width: "12%", minWidth: 26, maxWidth: 56, opacity: .28, pointerEvents: "none", zIndex: 3, ...style }}>
      <img src={BT_WATERMARK} alt="" style={{ display: "block", width: "100%", height: "auto" }} />
    </div>
  );
}

// Second Screen a tutto schermo: con il telefono in verticale si gira di 90° per vederlo in orizzontale.
// Due colonne di grafiche ai lati della mappa (4 posti in tutto): ogni grafica è alta ½, 1, 1½ o 2 posti
// e si allunga o si accorcia trascinando la maniglietta nell'angolo in basso a destra (l'altra grafica della
// colonna si stringe fino a ½ posto). Toccando una grafica si apre la sua scheda (sempre in orizzontale);
// gomme e settori si scelgono da un elenco: 2, 4, 6 o 10 piloti secondo l'altezza della grafica.
function SecondScreen({ race, live, st, standings, layout, setLayout, prefs, setPrefs, vote, onVote, notice, onCloseNotice, onClose, chat, blocked = [], onChatSend }) {
  const [edit, setEdit] = useState(false);
  const [flip, setFlip] = useState(false);
  const [pick, setPick] = useState(null);         // grafica scelta per spostarla (modalità Modifica)
  const [msg, setMsg] = useState(null);
  const [picker, setPicker] = useState(null);     // elenco aperto: "gomme", "settori", "telemetria", "vote-driver", "vote-team"
  const [pickMsg, setPickMsg] = useState(null);
  const [sheet, setSheet] = useState(null);       // scheda aperta di una grafica
  const [drag, setDrag] = useState(null);         // grafica di cui si sta trascinando la maniglietta
  const [hint, setHint] = useState(null);         // avviso breve (per esempio: non entra alta 2 posti)
  const layoutRef = useRef(layout); layoutRef.current = layout;   // l'ultima disposizione, anche tra due tasti premuti in fretta
  const dragEnd = useRef(0);                      // quando è finito l'ultimo trascinamento (il clic che segue non apre la scheda)
  const hintTimer = useRef(null);
  useEffect(() => () => clearTimeout(hintTimer.current), []);
  const track = live ? live.track : race ? trackOf(race.circuitId) : null;
  const all = [...layout.left, ...layout.right];
  const used = ssUsed(layout.left) + ssUsed(layout.right);
  const FULL = "Non c'è più posto: ci sono 4 posti in tutto (al massimo 4 grafiche da un posto). Rimpicciolisci o togli una grafica.";
  const toggle = id => {
    const at = ssWhere(layout, id);
    if (at) { setLayout(l => ({ ...l, [at.side]: l[at.side].filter(w => w.id !== id) })); setMsg(null); if (pick === id) setPick(null); return; }
    const freeL = SS_COL_UNITS - ssUsed(layout.left), freeR = SS_COL_UNITS - ssUsed(layout.right);
    if (!freeL && !freeR) { setMsg(FULL); return; }
    const side = freeR > freeL ? "right" : "left", free = Math.max(freeL, freeR);
    setLayout(l => ({ ...l, [side]: [...l[side], { id, h: ssFit(Math.min(2, free)) }] })); setMsg(null);
  };
  const showHint = text => { clearTimeout(hintTimer.current); setHint(text); hintTimer.current = setTimeout(() => setHint(null), 3500); };
  // Nuova altezza a partire dalla disposizione "base" (quella di inizio trascinamento, o l'attuale coi tasti).
  const applySize = (base, id, h) => {
    const r = ssResize(base, id, h);
    layoutRef.current = r.layout; setLayout(r.layout);
    if (r.capped) showHint(ssCapText(r.others)); else { clearTimeout(hintTimer.current); setHint(null); }
    setMsg(null);
  };
  const hOfLayout = (l, id) => { const at = ssWhere(l, id); return at ? l[at.side][at.i].h : 2; };
  // Maniglietta: si trascina su e giù. Con lo schermo girato (telefono in verticale) lo spostamento del dito
  // si riporta nel verso della schermata con la sua rotazione vera.
  const startDrag = (id, e) => {
    if (e.button != null && e.button !== 0) return;
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
    const el = e.currentTarget || e.target, stage = el.closest("[data-ss-stage]"), col = el.closest("[data-ss-col]");
    if (!stage || !col) return;
    const m = /matrix\(([^)]+)\)/.exec(getComputedStyle(stage).transform), v = m ? m[1].split(",").map(Number) : [1, 0, 0, 1];
    const [a, b, c, d] = v, det = (a * d - b * c) || 1;
    const unit = (col.offsetHeight + 8) / SS_COL_UNITS;   // mezzo posto più lo spazio tra le grafiche
    const x0 = e.clientX, y0 = e.clientY, base = layoutRef.current, h0 = hOfLayout(base, id);
    let last = h0, moved = false;
    const move = ev => {
      const dX = ev.clientX - x0, dY = ev.clientY - y0, ly = (-b * dX + a * dY) / det;
      if (Math.abs(ly) > 4) moved = true;
      const want = ssFit(h0 + Math.round(ly / unit));
      if (want === last) return;
      last = want; applySize(base, id, want);
    };
    const up = () => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up);
      if (moved) dragEnd.current = Date.now();
      setDrag(null);
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", up);
    setDrag(id);
  };
  // Coi tasti: freccia giù = più alta, freccia su = più bassa (come trascinare la maniglietta); Inizio e Fine.
  const gripKey = (id, e) => {
    const cur = hOfLayout(layoutRef.current, id);
    const h = { ArrowDown: cur + 1, ArrowRight: cur + 1, ArrowUp: cur - 1, ArrowLeft: cur - 1, Home: 1, End: SS_COL_UNITS, PageDown: SS_COL_UNITS, PageUp: 1 }[e.key];
    if (h == null) return;
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
    applySize(layoutRef.current, id, h);
  };
  // Sposta: tocca una grafica e poi un'altra (si scambiano) o un posto libero di una colonna.
  const swap = (a, b) => setLayout(l => {
    const A = ssWhere(l, a), B = ssWhere(l, b); if (!A || !B) return l;
    const n = { left: l.left.slice(), right: l.right.slice() }, wa = n[A.side][A.i], wb = n[B.side][B.i];
    n[A.side][A.i] = wb; n[B.side][B.i] = wa;
    ["left", "right"].forEach(side => { const over = ssUsed(n[side]) - SS_COL_UNITS; if (over > 0) { const k = n[side].findIndex(x => x.id === (side === A.side ? wb.id : wa.id)); if (k >= 0) n[side][k] = { ...n[side][k], h: ssFit(Math.max(1, n[side][k].h - over)) }; } });
    return n;
  });
  const moveTo = (id, side) => setLayout(l => {
    const A = ssWhere(l, id); if (!A) return l;
    const w = l[A.side][A.i], n = { ...l, [A.side]: l[A.side].filter(x => x.id !== id) };
    const free = SS_COL_UNITS - ssUsed(n[side]); if (free < 1) return l;
    n[side] = [...n[side], { ...w, h: ssFit(Math.min(w.h, free)) }];
    return n;
  });
  const tapWidget = (id, e) => {
    if (e && e.target && e.target.closest && e.target.closest("[data-ss-grip]")) return;
    if (Date.now() - dragEnd.current < 450) return;   // il clic alla fine di un trascinamento della maniglietta
    if (!edit) { if (e && e.target && e.target.closest && e.target.closest("button, select, input")) return; setSheet(id); return; }
    if (!pick) { setPick(id); setMsg(null); return; }
    if (pick !== id) swap(pick, id);
    setPick(null);
  };
  const tapFree = side => { if (edit && pick) { moveTo(pick, side); setPick(null); } };
  const wx = race ? weekendWeather(race, st ? st.t : 0, live && live.raceId === race.id ? live.type : null) : null;
  const rainChance = wx ? (wx.current.rain ? 95 : Math.max(...wx.sessions.map(x => x.rainPct))) : 0;
  const cells = prefs.radar && wx ? LiveSim.radarCells({ seed: (race && race.round) || 1, rainChance, windDeg: wx.current.windDir }) : [];
  const bg = st && (st.bg === "yellow" || st.bg === "red") ? (st.bg === "yellow" ? "radial-gradient(120% 90% at 50% 0%, rgba(255,210,31,.5), rgba(255,210,31,.14)), #050506" : "radial-gradient(120% 90% at 50% 0%, rgba(232,18,29,.55), rgba(232,18,29,.16)), #050506") : "#050506";
  const iconBtn = (label, icon, onClick, on) => <button className="press" aria-label={label} onClick={onClick} style={{ height: 28, padding: "0 10px", borderRadius: 9, background: on ? C.accent : "rgba(255,255,255,.08)", border: `1px solid ${on ? C.accent : C.border}`, display: "flex", alignItems: "center", gap: 5, fontFamily: F_HEAD, fontWeight: 800, fontSize: 11, color: "#fff" }}>{icon}{label === "Modifica grafiche" ? (edit ? "Fatto" : "Modifica") : null}</button>;
  const openPicker = k => { setPicker(k); setPickMsg(null); };
  // Maniglietta nell'angolo in basso a destra di ogni grafica: si trascina su e giù (½, 1, 1½ o 2 posti).
  const grip = w => {
    const name = (SS_WIDGETS.find(x => x[0] === w.id) || [w.id, w.id])[1], on = drag === w.id;
    return (
      <div id={"ss-grip-" + w.id} data-ss-grip={w.id} role="slider" tabIndex={0} aria-orientation="vertical" aria-label={`Altezza di ${name}: trascina su o giù`}
        aria-valuemin={1} aria-valuemax={SS_COL_UNITS} aria-valuenow={w.h} aria-valuetext={SS_SIZE_TEXT[w.h]}
        onPointerDown={e => startDrag(w.id, e)} onKeyDown={e => gripKey(w.id, e)} onClick={e => { if (e && e.stopPropagation) e.stopPropagation(); }}
        style={{ position: "absolute", right: 0, bottom: 0, zIndex: 5, width: 30, height: 30, display: "flex", alignItems: "flex-end", justifyContent: "flex-end", padding: 3, borderRadius: "10px 0 13px 0", cursor: "ns-resize", touchAction: "none", userSelect: "none", WebkitUserSelect: "none", outlineOffset: -2 }}>
        <span aria-hidden="true" style={{ width: 17, height: 17, borderRadius: "6px 3px 9px 3px", display: "flex", alignItems: "center", justifyContent: "center", background: on ? C.gold : "rgba(10,10,12,.82)", border: `1px solid ${on ? C.gold : "rgba(255,255,255,.22)"}`, boxShadow: "0 2px 6px rgba(0,0,0,.45)" }}>
          <svg width="9" height="9" viewBox="0 0 9 9"><path d="M8 1.5L1.5 8M8 4.5L4.5 8M8 7.2L7.2 8" stroke={on ? "#15120A" : "#D8D6D2"} strokeWidth="1.4" strokeLinecap="round" fill="none" /></svg>
        </span>
        {on && <span data-ss-grip-size="" style={{ position: "absolute", right: 2, bottom: 32, padding: "3px 7px", borderRadius: 7, background: C.gold, fontFamily: F_HEAD, fontWeight: 900, fontSize: 10.5, color: "#15120A", whiteSpace: "nowrap", pointerEvents: "none", boxShadow: "0 4px 10px rgba(0,0,0,.5)" }}>{SS_SIZE_TEXT[w.h].toUpperCase()}</span>}
      </div>
    );
  };
  const column = side => {
    const col = layout[side], free = SS_COL_UNITS - ssUsed(col);
    return (
      <div data-ss-col={side} style={{ gridArea: side, minHeight: 0, minWidth: 0, display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gridTemplateRows: `repeat(${SS_COL_UNITS}, minmax(0, 1fr))`, gap: 8 }}>
        {col.map(w => (
          <div key={w.id} data-ss-slot={w.id} data-ss-h={w.h} onClick={e => tapWidget(w.id, e)} style={{ gridRow: `span ${w.h}`, minHeight: 0, minWidth: 0, borderRadius: 13, position: "relative", outline: edit || drag === w.id ? `2px ${pick === w.id || drag === w.id ? "solid" : "dashed"} ${pick === w.id || drag === w.id ? C.gold : "rgba(255,255,255,.25)"}` : "none", outlineOffset: 2, cursor: "pointer" }}>
            <SsWidget id={w.id} h={w.h} st={st} live={live} race={race} standings={standings} prefs={prefs} setPrefs={setPrefs} onPicker={openPicker} vote={vote} onVote={onVote} chat={chat} blocked={blocked} />
            {edit && <div style={{ position: "absolute", inset: 0, zIndex: 2, borderRadius: 12, background: pick === w.id ? "rgba(231,179,76,.14)" : "rgba(0,0,0,.08)" }} />}
            {grip(w)}
          </div>
        ))}
        {free > 0 && (
          // Posto libero: in Modifica ci si sposta una grafica; fuori da Modifica toccandolo si apre Modifica per aggiungerne una.
          <div data-ss-free={side} onClick={() => { if (edit) tapFree(side); else { setEdit(true); setPick(null); setMsg(null); } }} style={{ gridRow: `span ${free}`, minHeight: 0, minWidth: 0, overflow: "hidden", borderRadius: 12, border: `1.5px dashed ${edit ? "rgba(255,255,255,.18)" : "rgba(255,255,255,.11)"}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, textAlign: "center", padding: 6, fontFamily: F_BODY, fontSize: 10.5, color: C.dim, cursor: edit && !pick ? "default" : "pointer" }}>
            {edit ? (pick ? "Tocca qui per spostarla" : `Posto libero (${free === 1 ? "½" : free === 2 ? "1" : free === 3 ? "1 e ½" : "2"})`)
              : <><b style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 10, letterSpacing: .7, color: C.muted }}>POSTO LIBERO</b><span>Tocca per aggiungere una grafica</span></>}
          </div>
        )}
      </div>
    );
  };
  const pickerView = () => {
    const multi = picker === "gomme" || picker === "settori", isTeam = picker === "vote-team", isVote = picker === "vote-driver" || isTeam;
    const cars = st ? st.cars : [];
    const list = isTeam ? TEAMS.map(t => ({ id: t.id, label: t.name, sub: "", color: t.color })) : cars.map(c => ({ id: c.id, label: c.code, sub: c.dnf ? "RIT" : "P" + c.pos, color: c.color }));
    const key = picker === "gomme" ? "tyre" : "sec";
    // Quanti piloti: dipende da quanto è alta la grafica (½ → 2, 1 → 4, 1½ → 6, 2 → 10).
    const wh = multi ? hOfLayout(layout, picker) : 2, limit = SS_DRIVERS[wh] || SS_DRIVERS[2];
    const sel = !multi ? [] : prefs[key] == null ? ssChosen(st, null, limit).map(c => c.id) : prefs[key].length > limit ? ssChosen(st, prefs[key], limit).map(c => c.id) : prefs[key];
    const heading = { gomme: `Usura gomme: scegli fino a ${limit} piloti`, settori: `Settori e minisettori: scegli fino a ${limit} piloti`, telemetria: "Telemetria: scegli il pilota", "vote-driver": "Vota il pilota del giorno", "vote-team": "Vota la scuderia del giorno" }[picker];
    const choose = id => {
      if (multi) {
        const on = sel.includes(id);
        if (!on && sel.length >= limit) { setPickMsg(`Puoi scegliere al massimo ${limit} piloti: togline uno per aggiungere questo.${wh < SS_COL_UNITS ? " Per sceglierne di più, fai la grafica più alta con la maniglietta in basso a destra." : ""}`); return; }
        setPrefs(p => ({ ...p, [key]: on ? sel.filter(x => x !== id) : [...sel, id] })); setPickMsg(null); return;
      }
      if (picker === "telemetria") setPrefs(p => ({ ...p, tel: id }));
      else onVote(isTeam ? "team" : "driver", id);
      setPicker(null); setPickMsg(null);
    };
    return (
      <div data-ss-picker={picker} role="dialog" aria-label={heading} onClick={e => { if (e && e.stopPropagation) e.stopPropagation(); }} style={{ position: "absolute", left: 10, right: 10, top: 44, bottom: 10, zIndex: 30, display: "flex", flexDirection: "column", gap: 8, padding: "10px 12px", borderRadius: 14, background: "rgba(16,16,20,.97)", border: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 13, color: C.text }}>{heading}</span>
          {multi && <span data-pick-count="" style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 11, color: C.muted }}>{sel.length}/{limit}</span>}
          {multi && <span style={{ fontFamily: F_BODY, fontSize: 10.5, color: C.dim }}>grafica alta {SS_SIZE_TEXT[wh]}</span>}
          <div style={{ flex: 1 }} />
          <button className="press" onClick={() => { setPicker(null); setPickMsg(null); }} style={{ height: 28, padding: "0 12px", borderRadius: 9, background: multi ? C.accent : "rgba(255,255,255,.08)", border: `1px solid ${multi ? C.accent : C.border}`, fontFamily: F_HEAD, fontWeight: 800, fontSize: 11.5, color: "#fff" }}>{multi ? "Fatto" : "Chiudi"}</button>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${isTeam ? 120 : 76}px, 1fr))`, gap: 6, alignContent: "start" }}>
          {list.map(o => {
            const on = multi ? sel.includes(o.id) : picker === "telemetria" && prefs.tel === o.id;
            return (
              <button key={o.id} className="press" data-pick-driver={isTeam ? undefined : o.id} data-vote-option={isVote ? o.id : undefined} aria-pressed={on ? "true" : "false"} onClick={() => choose(o.id)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 8px", borderRadius: 10, background: on ? "rgba(232,18,29,.18)" : "rgba(255,255,255,.05)", border: `1px solid ${on ? C.accent : C.border}`, textAlign: "left" }}>
                <span style={{ width: 4, height: 16, borderRadius: 2, background: o.color, flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0, fontFamily: F_HEAD, fontWeight: 800, fontSize: 12, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.label}</span>
                {o.sub && <span style={{ fontFamily: F_BODY, fontSize: 10, color: C.dim }}>{o.sub}</span>}
              </button>
            );
          })}
        </div>
        {pickMsg && <p role="status" style={{ margin: 0, flexShrink: 0, fontFamily: F_BODY, fontSize: 11, color: TIMING.yellow }}>{pickMsg}</p>}
      </div>
    );
  };
  return (
    <div className="ss-root" data-ss="" role="dialog" aria-label="Second Screen" style={{ background: bg }}>
      <div className={"ss-stage" + (flip ? " ss-flip" : "")} data-ss-stage="" style={{ background: bg, padding: "8px 10px 10px", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: st ? C.accent : C.dim }} />
          <span style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 13, color: C.text, whiteSpace: "nowrap" }}>SECOND SCREEN</span>
          <span style={{ fontFamily: F_BODY, fontSize: 11, color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{race ? race.name : ""} · {st ? `${sessionName(st.type)} · ${liveCounter(st)}` : "Nessuna sessione in corso"}</span>
          {st && FLAG_UI[st.flag] && <span style={{ padding: "3px 8px", borderRadius: 7, background: FLAG_UI[st.flag].color, fontFamily: F_HEAD, fontWeight: 900, fontSize: 10, color: FLAG_UI[st.flag].ink, whiteSpace: "nowrap" }}>{st.flag === "yellow" ? "GIALLA" : st.flag === "red" ? "ROSSA" : st.flag.toUpperCase()}</span>}
          <div style={{ flex: 1 }} />
          <button className="press" aria-label="Radar meteo sulla mappa" aria-pressed={prefs.radar ? "true" : "false"} onClick={() => setPrefs(p => ({ ...p, radar: !p.radar }))} style={{ height: 28, padding: "0 10px", borderRadius: 9, background: prefs.radar ? "rgba(76,141,255,.22)" : "rgba(255,255,255,.08)", border: `1px solid ${prefs.radar ? "#4C8DFF" : C.border}`, display: "flex", alignItems: "center", gap: 5, fontFamily: F_HEAD, fontWeight: 800, fontSize: 11, color: "#fff" }}><SkyIcon kind="rain" size={14} bg="transparent" />Radar</button>
          {iconBtn("Modifica grafiche", <Icon name="grid" size={12} color="#fff" />, () => { setEdit(e => !e); setPick(null); setMsg(null); setSheet(null); }, edit)}
          {iconBtn("Ruota lo schermo", <Icon name="rotate" size={12} color="#fff" />, () => setFlip(f => !f))}
          {iconBtn("Chiudi Second Screen", <Icon name="close" size={12} color="#fff" sw={2.4} />, onClose)}
        </div>
        <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "minmax(150px, 25%) 1fr minmax(150px, 25%)", gridTemplateRows: "minmax(0, 1fr)", gridTemplateAreas: '"left map right"', gap: 8 }}>
          {column("left")}
          <div data-ss-map="" style={{ gridArea: "map", position: "relative", minWidth: 0, minHeight: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 14, background: "rgba(13,13,16,.7)" }}>
            {track ? <LiveMap track={track} st={st} big svgStyle={{ width: "100%", height: "100%" }} /> : <span style={{ fontFamily: F_BODY, fontSize: 12, color: C.dim }}>Mappa non disponibile</span>}
            {prefs.radar && wx && <RadarOverlay cells={cells} windDeg={wx.current.windDir} />}
            {prefs.radar && wx && <span style={{ position: "absolute", left: 10, top: 8, zIndex: 3, padding: "3px 8px", borderRadius: 7, background: "rgba(10,10,12,.72)", fontFamily: F_BODY, fontWeight: 700, fontSize: 9.5, letterSpacing: .6, color: C.muted, pointerEvents: "none" }}>RADAR METEO · DEMO · {wx.current.rain ? "PIOGGIA IN CORSO" : `PIOGGIA ${rainChance}%`}</span>}
            <InsightPopup live={live} st={st} race={race} hidden={edit} />
            <Watermark />
          </div>
          {column("right")}
        </div>
        {edit && (
          <div style={{ flexShrink: 0, padding: "8px 10px", borderRadius: 12, background: "rgba(24,24,28,.96)", border: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
              <span style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 10.5, color: C.muted, marginRight: 4 }}>Grafiche ({all.length} · {used / 2 === Math.floor(used / 2) ? used / 2 : (used / 2).toFixed(1).replace(".", ",")} posti su 4):</span>
              {SS_WIDGETS.map(([id, label]) => { const on = all.some(w => w.id === id); return (
                <button key={id} data-ss-chip={id} className="press" aria-pressed={on ? "true" : "false"} onClick={() => toggle(id)} style={{ padding: "5px 9px", borderRadius: 999, background: on ? "rgba(232,18,29,.18)" : "rgba(255,255,255,.05)", border: `1px solid ${on ? C.accent : C.border}`, fontFamily: F_BODY, fontWeight: 700, fontSize: 10.5, color: on ? C.text : C.muted }}>{on ? "✓ " : ""}{label}</button>
              ); })}
            </div>
            <p role="status" style={{ margin: "5px 0 0", fontFamily: F_BODY, fontSize: 10.5, color: msg ? TIMING.yellow : C.dim }}>{msg || (pick ? "Ora tocca un'altra grafica per scambiarle, o un posto libero." : "Per spostare una grafica toccala e poi tocca dove metterla. Per l'altezza trascina su o giù la maniglietta in basso a destra: ½, 1, 1½ o 2 posti.")}</p>
          </div>
        )}
        {sheet && <SsSheet id={sheet} st={st} live={live} race={race} standings={standings} prefs={prefs} setPrefs={setPrefs} vote={vote} onVote={onVote} onOpenPicker={openPicker} onBack={() => setSheet(null)} chat={chat} blocked={blocked} onChatSend={onChatSend} />}
        {picker && pickerView()}
        {hint && !sheet && !picker && (
          <div data-ss-hint="" role="status" style={{ position: "absolute", top: 44, left: "50%", transform: "translateX(-50%)", width: "min(440px, 62%)", zIndex: 40, display: "flex", alignItems: "center", gap: 8, padding: "8px 11px", borderRadius: 12, background: "rgba(16,16,20,.96)", border: `1px solid ${C.gold}`, boxShadow: "0 12px 28px -12px rgba(0,0,0,.8)", pointerEvents: "none" }}>
            <span aria-hidden="true" style={{ width: 20, height: 20, borderRadius: "50%", background: C.gold, color: "#15120A", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F_HEAD, fontWeight: 900, fontSize: 12, flexShrink: 0 }}>!</span>
            <span style={{ fontFamily: F_BODY, fontSize: 11.5, lineHeight: 1.35, color: C.text }}>{hint}</span>
          </div>
        )}
        <LiveNotice n={notice} onClose={onCloseNotice} inStage />
      </div>
    </div>
  );
}

/* ── PILOTA E SCUDERIA DEL GIORNO ─────────────────────────────────────── */
// Si vota durante il GP da metà gara, un voto per il pilota e uno per la scuderia. I voti degli altri tifosi
// sono simulati (demo): contano la posizione, le posizioni guadagnate e un po' di caso; poi c'è il tuo.
const dotdHalfLap = st => Math.ceil(st.totalLaps / 2);
const dotdOpen = st => !!st && st.type === "RACE" && (st.finished || st.lap >= dotdHalfLap(st));
function dotdResults(st, kind, mine, seed) {
  const rnd = i => { const x = Math.sin((seed + 1) * 9301 + i * 4929.7) * 23328.1; return x - Math.floor(x); };
  const w = {};
  st.cars.forEach((c, i) => {
    const gained = Math.max(0, (c.grid || c.pos) - c.pos);
    const v = 100 * Math.exp(-(c.pos - 1) / 4) + gained * 6 + rnd(i) * 8;   // chi vince o rimonta prende più voti, come nel voto vero
    const key = kind === "driver" ? c.id : (driverById(c.id) || {}).teamId;
    if (key) w[key] = (w[key] || 0) + v;
  });
  const tot0 = Object.values(w).reduce((a, x) => a + x, 0) || 1;
  if (mine && w[mine] != null) w[mine] += tot0 * 0.02;   // il tuo voto
  const tot = Object.values(w).reduce((a, x) => a + x, 0) || 1;
  return Object.entries(w).map(([id, v]) => ({ id, pct: Math.round(v / tot * 1000) / 10 })).sort((a, b) => b.pct - a.pct);
}
function DotdVote({ st, race, vote = {}, onVote, onOpenPicker, compact = false }) {
  const [choosing, setChoosing] = useState(null);   // elenco aperto qui sotto (pagina RACE)
  const open = dotdOpen(st), seed = (race && race.round) || 1;
  const info = (kind, id) => { const x = kind === "driver" ? driverById(id) : teamById(id); return { name: x ? (kind === "driver" ? x.full || x.name : x.name) : id, color: x ? x.color : C.dim }; };
  const options = kind => kind === "driver" ? st.cars.map(c => c.id) : TEAMS.map(t => t.id);
  const section = (kind, title) => {
    const mine = vote[kind];
    const res = mine ? dotdResults(st, kind, mine, seed) : null;
    let top = res ? res.slice(0, compact ? 2 : 5) : null;
    if (res && !top.some(r => r.id === mine)) top = [...top, res.find(r => r.id === mine)];
    return (
      <div data-vote-kind={kind} style={{ marginBottom: compact ? 6 : 12 }}>
        <div style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: compact ? 9 : 10.5, letterSpacing: 1, color: C.gold, marginBottom: compact ? 3 : 6 }}>{title}</div>
        {!open ? <p style={{ margin: 0, fontFamily: F_BODY, fontSize: compact ? 10.5 : 12, color: C.dim, lineHeight: 1.4 }}>Si vota da metà gara (dal giro {dotdHalfLap(st)}).</p>
          : mine ? (
            <div>
              <p style={{ margin: "0 0 4px", fontFamily: F_BODY, fontSize: compact ? 10.5 : 12, color: C.muted }}>Hai votato <b style={{ color: C.text }}>{info(kind, mine).name}</b></p>
              {top.map(r => { const x = info(kind, r.id); return (
                <div key={r.id} data-vote-result={r.pct} style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 0", fontFamily: F_BODY, fontSize: compact ? 10 : 11.5, color: r.id === mine ? C.text : C.muted }}>
                  <span style={{ width: compact ? 70 : 118, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: r.id === mine ? 700 : 500 }}>{x.name}</span>
                  <span style={{ flex: 1, height: compact ? 4 : 6, borderRadius: 3, background: "rgba(255,255,255,.08)", overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: Math.min(100, r.pct * 2) + "%", background: x.color }} /></span>
                  <span style={{ width: 38, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{r.pct.toFixed(1)}%</span>
                </div>
              ); })}
            </div>
          ) : (
            <div>
              <button className="press" data-vote-open="" onClick={e => { if (e && e.stopPropagation) e.stopPropagation(); if (onOpenPicker) onOpenPicker(kind); else setChoosing(choosing === kind ? null : kind); }}
                style={{ padding: compact ? "4px 10px" : "8px 14px", borderRadius: 9, background: C.accent, fontFamily: F_HEAD, fontWeight: 800, fontSize: compact ? 10.5 : 12, color: "#fff" }}>Vota</button>
              {!onOpenPicker && choosing === kind && (
                <div role="list" aria-label={title} style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 6 }}>
                  {options(kind).map(id => { const x = info(kind, id); return (
                    <button key={id} role="listitem" className="press" data-vote-option={id} onClick={() => { onVote(kind, id); setChoosing(null); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 8px", borderRadius: 10, background: "rgba(255,255,255,.05)", border: `1px solid ${C.border}`, textAlign: "left" }}>
                      <span style={{ width: 4, height: 16, borderRadius: 2, background: x.color, flexShrink: 0 }} />
                      <span style={{ flex: 1, minWidth: 0, fontFamily: F_BODY, fontWeight: 600, fontSize: 11.5, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{kind === "driver" ? (driverById(id) || {}).name || id : x.name}</span>
                    </button>
                  ); })}
                </div>
              )}
            </div>
          )}
      </div>
    );
  };
  return <>{section("driver", "PILOTA DEL GIORNO")}{section("team", "SCUDERIA DEL GIORNO")}</>;
}
// Riquadro nella pagina RACE durante il GP.
function DotdCard({ st, race, vote, onVote }) {
  return (
    <div data-dotd="" style={{ margin: "0 16px 14px", padding: "14px 14px 4px", borderRadius: 18, background: C.card, border: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
        <span style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 14, color: C.text }}>VOTA IL MIGLIORE DEL GP</span>
        <span style={{ marginLeft: "auto", fontFamily: F_BODY, fontSize: 10, color: C.dim }}>voti degli altri: demo</span>
      </div>
      <DotdVote st={st} race={race} vote={vote} onVote={onVote} />
    </div>
  );
}

/* ── FOTO DELLA NOTIZIA A TUTTO SCHERMO, CON LO ZOOM ──────────────────── */
// Due dita = pizzico per ingrandire; un dito = sposta la foto ingrandita; doppio tocco = 2,5× o torna intera;
// tasti + e − e rotellina del mouse. Da 1× a 4×.
function ImageViewer({ src, onClose }) {
  const [z, setZ] = useState({ s: 1, x: 0, y: 0 });
  const zRef = useRef(z); zRef.current = z;
  const pts = useRef(new Map()), base = useRef(null), tap = useRef({ last: 0, t0: 0, p0: null });
  const fit = v => Math.max(1, Math.min(4, Math.round(v * 100) / 100));
  const setS = s => setZ(cur => (s = fit(s)) <= 1 ? { s: 1, x: 0, y: 0 } : { ...cur, s });
  const snap = () => { base.current = pts.current.size ? { z: { ...zRef.current }, pts: new Map(pts.current) } : null; };
  const down = e => { pts.current.set(e.pointerId, [e.clientX, e.clientY]); snap(); if (pts.current.size === 1) { tap.current.t0 = Date.now(); tap.current.p0 = [e.clientX, e.clientY]; } else tap.current.p0 = null; };
  const move = e => {
    if (!pts.current.has(e.pointerId)) return;
    pts.current.set(e.pointerId, [e.clientX, e.clientY]);
    const b = base.current; if (!b) return;
    if (pts.current.size >= 2 && b.pts.size >= 2) {
      const [p1, p2] = [...pts.current.values()], [q1, q2] = [...b.pts.values()];
      const d0 = Math.hypot(q1[0] - q2[0], q1[1] - q2[1]) || 1;
      setS(b.z.s * Math.hypot(p1[0] - p2[0], p1[1] - p2[1]) / d0);
    } else if (pts.current.size === 1 && b.z.s > 1) {
      const p = pts.current.get(e.pointerId), q = b.pts.get(e.pointerId);
      if (q) setZ(cur => ({ ...cur, x: b.z.x + p[0] - q[0], y: b.z.y + p[1] - q[1] }));
    }
  };
  // Doppio tocco riconosciuto a mano (due tocchi brevi entro 0,32 s): funziona anche sui telefoni.
  const up = e => {
    const t = tap.current, p0 = t.p0, now = Date.now();
    pts.current.delete(e.pointerId); snap();
    if (!p0 || pts.current.size || now - t.t0 > 260 || Math.hypot(e.clientX - p0[0], e.clientY - p0[1]) > 10) { t.p0 = null; return; }
    if (now - t.last < 320) { t.last = 0; setS(zRef.current.s > 1 ? 1 : 2.5); } else t.last = now;
    t.p0 = null;
  };
  const btn = (label, txt, onClick) => <button className="press" aria-label={label} onClick={e => { if (e && e.stopPropagation) e.stopPropagation(); onClick(); }} style={{ minWidth: 44, height: 44, padding: "0 12px", borderRadius: 14, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.2)", fontFamily: F_HEAD, fontWeight: 900, fontSize: 18, color: "#fff" }}>{txt}</button>;
  return (
    <div data-image-viewer="" role="dialog" aria-label="Foto della notizia" style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,.96)", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 14px 8px", flexShrink: 0 }}>
        <span style={{ flex: 1, fontFamily: F_BODY, fontSize: 12, color: "rgba(255,255,255,.7)" }}>Pizzica con due dita o tocca due volte per ingrandire</span>
        {btn("Chiudi foto", <Icon name="close" size={16} color="#fff" sw={2.4} />, onClose)}
      </div>
      <div onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onWheel={e => setS(zRef.current.s * (e.deltaY < 0 ? 1.15 : 0.87))}
        style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", touchAction: "none", cursor: z.s > 1 ? "grab" : "zoom-in" }}>
        <img data-zoom={z.s} src={src} alt="Foto della notizia" draggable={false} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", transform: `translate(${z.x}px, ${z.y}px) scale(${z.s})`, transition: pts.current.size ? "none" : "transform .18s ease-out", userSelect: "none" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 10, padding: "10px 0 22px", flexShrink: 0 }}>
        {btn("Riduci", "−", () => setS(z.s / 1.5))}
        {btn("Ripristina", <span style={{ fontSize: 13 }}>{Math.round(z.s * 10) / 10}×</span>, () => setS(1))}
        {btn("Ingrandisci", "+", () => setS(z.s * 1.5))}
      </div>
    </div>
  );
}

/* ── VIDEO HIGHLIGHTS ESCLUSIVI (Premium): archivio gestito dal Pannello Admin ── */
// Video di B&T (commenti, reazioni, sorpassi spiegati da noi), non filmati della TV. link: indirizzo del video
// (per esempio il post Instagram); thumb: copertina caricata dall'admin. L'archivio sta in shared/bt-highlights.
const HL_BG = ["#3a0a0c", "#1a1a2e", "#241505", "#0d2a24"];
function HighlightsStrip({ items, onToast }) {
  return (
    <div data-highlights="" className="scrollrow" style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none" }}>
      {items.map((h, i) => (
        <button key={h.id} className="press" data-highlight={h.id} onClick={() => h.link ? window.open(h.link, "_blank") : onToast("Video in arrivo (demo)")} style={{ flex: "0 0 132px", borderRadius: 12, overflow: "hidden", background: C.bg, border: `1px solid ${C.border}`, textAlign: "left" }}>
          <span style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", height: 74, background: h.thumb ? `center / cover no-repeat url(${h.thumb})` : `linear-gradient(155deg, ${HL_BG[i % HL_BG.length]} 0%, #0f0f12 70%)` }}>
            <span style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="play" size={14} color="#fff" /></span>
            {h.dur && <span style={{ position: "absolute", right: 5, bottom: 5, padding: "1px 5px", borderRadius: 5, background: "rgba(0,0,0,.7)", fontFamily: F_BODY, fontWeight: 700, fontSize: 9.5, color: "#fff" }}>{h.dur}</span>}
          </span>
          <span style={{ display: "block", padding: "6px 8px 8px", fontFamily: F_BODY, fontWeight: 600, fontSize: 11, color: C.text, lineHeight: 1.3 }}>{h.title}</span>
        </button>
      ))}
      {!items.length && <span style={{ fontFamily: F_BODY, fontSize: 12, color: C.dim }}>Nessun video per ora.</span>}
    </div>
  );
}
function AdminHighlightsTab({ items = [], setItems, onToast }) {
  const empty = { title: "", dur: "", link: "", thumb: null };
  const [f, setF] = useState(empty), [edit, setEdit] = useState(null);
  const box = { width: "100%", padding: "10px 12px", marginBottom: 10, borderRadius: 12, background: C.card, border: `1px solid ${C.border}`, color: C.text, fontFamily: F_BODY, fontSize: 13 };
  const lab = { display: "block", fontFamily: F_BODY, fontWeight: 700, fontSize: 11.5, color: C.muted, marginBottom: 5 };
  const pick = e => { const file = e.target.files && e.target.files[0]; if (!file) return; const r = new FileReader(); r.onload = () => setF(x => ({ ...x, thumb: r.result })); r.readAsDataURL(file); };
  const save = () => {
    const v = { title: f.title.trim(), dur: f.dur.trim(), link: f.link.trim(), thumb: f.thumb };
    if (!v.title) { onToast("Scrivi il titolo del video"); return; }
    if (v.link && !/^https:\/\//.test(v.link)) { onToast("Il link deve iniziare con https://"); return; }
    const done = msg => ok => { if (!ok) return; onToast(msg); setF(empty); setEdit(null); };
    if (edit) setItems(xs => xs.map(x => x.id === edit ? { ...x, ...v } : x)).then(done("Video aggiornato"));
    else setItems(xs => [{ id: "h" + Date.now(), ...v }, ...xs]).then(done("Video aggiunto all'archivio"));
  };
  return (
    <div style={{ padding: "0 16px 20px" }}>
      <p style={{ margin: "0 0 12px", fontFamily: F_BODY, fontSize: 12, color: C.muted, lineHeight: 1.45 }}>Archivio "Video HIGHLIGHTS esclusivi" (sezione Premium della Home). Metti i video di B&T (per esempio il link del post Instagram), non filmati della TV.</p>
      <label htmlFor="hlTitle" style={lab}>Titolo</label>
      <input id="hlTitle" value={f.title} onChange={e => setF(x => ({ ...x, title: e.target.value }))} placeholder="Es. Sepang: il nostro commento" style={box} />
      <label htmlFor="hlDur" style={lab}>Durata</label>
      <input id="hlDur" value={f.dur} onChange={e => setF(x => ({ ...x, dur: e.target.value }))} placeholder="Es. 4:30" style={box} />
      <label htmlFor="hlLink" style={lab}>Link del video (https://…)</label>
      <input id="hlLink" value={f.link} onChange={e => setF(x => ({ ...x, link: e.target.value }))} placeholder="https://www.instagram.com/…" style={box} />
      <label htmlFor="hlImg" style={lab}>Copertina (facoltativa)</label>
      <input id="hlImg" type="file" accept="image/*" onChange={pick} style={{ ...box, padding: 8 }} />
      {f.thumb && <img src={f.thumb} alt="Anteprima copertina" style={{ display: "block", width: 132, height: 74, objectFit: "cover", borderRadius: 10, marginBottom: 10 }} />}
      <div style={{ display: "flex", gap: 8 }}>
        {edit && <button className="press" onClick={() => { setF(empty); setEdit(null); }} style={{ flex: 1, padding: "12px 0", borderRadius: 12, background: "rgba(255,255,255,.07)", border: `1px solid ${C.border}`, fontFamily: F_HEAD, fontWeight: 800, fontSize: 12.5, color: C.muted }}>Annulla</button>}
        <button className="press" onClick={save} style={{ flex: 2, padding: "12px 0", borderRadius: 12, background: C.accent, fontFamily: F_HEAD, fontWeight: 800, fontSize: 13, color: "#fff" }}>{edit ? "SALVA MODIFICHE" : "AGGIUNGI VIDEO"}</button>
      </div>
      <div style={{ marginTop: 16 }}>
        {items.map(h => (
          <div key={h.id} data-hl-row={h.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: `1px solid ${C.divider}` }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <b style={{ display: "block", fontFamily: F_BODY, fontSize: 12.5, color: C.text }}>{h.title}</b>
              <span style={{ fontFamily: F_BODY, fontSize: 11, color: C.dim }}>{h.dur || "durata —"} · {h.link ? "con link" : "senza link"}{h.thumb ? " · copertina" : ""}</span>
            </span>
            <button className="press" data-hl-edit={h.id} onClick={() => { setEdit(h.id); setF({ title: h.title, dur: h.dur || "", link: h.link || "", thumb: h.thumb || null }); }} style={{ padding: "6px 10px", borderRadius: 9, background: "rgba(255,255,255,.07)", border: `1px solid ${C.border}`, fontFamily: F_BODY, fontWeight: 700, fontSize: 11, color: C.text }}>Modifica</button>
            <button className="press" data-hl-delete={h.id} onClick={() => { setItems(xs => xs.filter(x => x.id !== h.id)).then(ok => { if (!ok) return; if (edit === h.id) { setEdit(null); setF(empty); } onToast("Video eliminato"); }); }} style={{ padding: "6px 10px", borderRadius: 9, background: "rgba(232,18,29,.14)", border: "1px solid rgba(232,18,29,.4)", fontFamily: F_BODY, fontWeight: 700, fontSize: 11, color: "#FF8A8F" }}>Elimina</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── INSTAGRAM E CHAT: non sono più schede in basso ───────────────────── */
// Instagram è un grande bottone in Home e nel Profilo e apre la sua pagina; la chat si apre dalla pagina RACE
// (e c'è anche come grafica nel Second Screen).
function IgBigButton({ ig, onOpen }) {
  return (
    <button className="press" data-ig-big="" onClick={onOpen} style={{ display: "flex", alignItems: "center", gap: 12, width: "calc(100% - 32px)", margin: "0 16px 16px", padding: "14px 14px 14px 12px", borderRadius: 18, background: "linear-gradient(115deg, #F58529 0%, #DD2A7B 45%, #8134AF 78%, #515BD4 100%)", textAlign: "left", boxShadow: "0 12px 26px -14px rgba(221,42,123,.8)" }}>
      <span style={{ width: 46, height: 46, borderRadius: 15, background: "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="instagram" size={24} color="#fff" sw={2.2} /></span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 17, color: "#fff", letterSpacing: .3 }}>SEGUICI SU INSTAGRAM</span>
        <span style={{ display: "block", marginTop: 1, fontFamily: F_BODY, fontSize: 12, color: "rgba(255,255,255,.9)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>@{ig.handle} · {fmtK(ig.followers)} follower · video e reazioni</span>
      </span>
      <Icon name="chevron" size={18} color="#fff" sw={2.6} />
    </button>
  );
}
function BackBar({ title, onBack }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px 10px", flexShrink: 0 }}>
      <button className="press" aria-label="Indietro" onClick={onBack} style={{ width: 36, height: 36, borderRadius: 12, background: C.card, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="back" size={18} /></button>
      <span style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 17, color: C.text }}>{title}</span>
    </div>
  );
}
function InstagramView({ ig, onToast, onBack }) {
  return <div data-ig-screen="" style={{ height: "100%", display: "flex", flexDirection: "column" }}><BackBar title="INSTAGRAM" onBack={onBack} /><div style={{ flex: 1, minHeight: 0 }}><InstagramScreen ig={ig} onToast={onToast} /></div></div>;
}
function ChatsView({ chats, onOpen, blocked, onBack }) {
  return <div data-chats-screen="" style={{ height: "100%", display: "flex", flexDirection: "column" }}><BackBar title="CHAT DEI TIFOSI" onBack={onBack} /><div style={{ flex: 1, minHeight: 0 }}><ChatListScreen chats={chats} onOpen={onOpen} blocked={blocked} /></div></div>;
}

/* ── GARAGE: giochi e strumenti B&T ────────────────────────────────────── */
const fmtDMY = ms => { const d = new Date(ms); return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`; };
const fmtSec = v => v.toFixed(2).replace(".", ",");
const GameHeader = ({ title, sub, onBack }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 16px 12px" }}>
    <button className="press" aria-label="Indietro" onClick={onBack} style={{ width: 36, height: 36, borderRadius: 12, background: C.card, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="back" size={18} /></button>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 18, color: C.text }}>{title}</div>
      <div style={{ fontFamily: F_BODY, fontSize: 11.5, color: C.muted, lineHeight: 1.35 }}>{sub}</div>
    </div>
  </div>
);

// PIT STOP CHALLENGE: monoposto vista dall'alto, per ogni ruota 4 tocchi in ordine (svita, togli, monta, avvita).
const PIT_POS = { fl: { left: "4%", top: "17%" }, fr: { right: "4%", top: "17%" }, rl: { left: "2%", top: "63%" }, rr: { right: "2%", top: "63%" } };
const PIT_NAME = { fl: "anteriore sinistra", fr: "anteriore destra", rl: "posteriore sinistra", rr: "posteriore destra" };
const PIT_RATING = { record: ["DA RECORD!", "Sotto i 2,0 secondi, come i pit stop migliori della F1."], ottimo: ["OTTIMO PIT STOP", "Il pilota esce davanti: manca poco ai 2 secondi."], buono: ["BUONO", "Si può fare di meglio: usa due dita, una per lato."], lento: ["LENTO", "Il pilota perde posizioni: riprova!"] };
function PitCar() {
  return (
    <svg viewBox="0 0 200 330" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
      <rect x="30" y="8" width="140" height="22" rx="6" fill="#E8121D" />
      <rect x="40" y="30" width="120" height="6" rx="3" fill="#B50E17" />
      <path d="M92 30 L108 30 L116 110 L132 140 L136 250 L124 300 L76 300 L64 250 L68 140 L84 110 Z" fill="#E8121D" />
      <path d="M68 150 L44 160 L44 245 L64 250 Z M132 150 L156 160 L156 245 L136 250 Z" fill="#B50E17" />
      <ellipse cx="100" cy="168" rx="15" ry="26" fill="#0A0A0C" />
      <path d="M86 150 Q100 136 114 150" stroke="#E7B34C" strokeWidth="5" fill="none" strokeLinecap="round" />
      <rect x="36" y="300" width="128" height="20" rx="5" fill="#E8121D" />
      <text x="100" y="230" textAnchor="middle" fill="#fff" fontFamily={F_HEAD} fontWeight="900" fontStyle="italic" fontSize="18">B&amp;T</text>
    </svg>
  );
}
function PitWheel({ id, n, active, onTap }) {
  const steps = BtLogic.PIT_STEPS, done = n >= steps.length;
  const tyre = n === 2 ? "none" : n >= 3 ? "new" : "old";
  return (
    <button className="press" data-pit-wheel={id} data-step={n} aria-label={`Ruota ${PIT_NAME[id]}: ${done ? "fatta" : steps[n][1]}`} onClick={() => onTap(id)}
      style={{ position: "absolute", ...PIT_POS[id], width: "27%", height: "24%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, borderRadius: 14, background: "rgba(0,0,0,.25)", touchAction: "manipulation" }}>
      <span style={{ width: "62%", height: "70%", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: tyre === "none" ? "transparent" : "#1A1A1E", border: tyre === "none" ? "2px dashed rgba(255,255,255,.35)" : `4px solid ${tyre === "new" ? "#E8121D" : "#4A4A52"}`, boxShadow: done ? "0 0 0 3px #3ED66B" : active ? "0 0 0 2px rgba(231,179,76,.6)" : "none" }}>
        <span style={{ width: 16, height: 16, borderRadius: "50%", background: n === 1 || n === 2 ? "transparent" : "#9C9CA1", border: "2px solid #9C9CA1" }} />
      </span>
      <span style={{ padding: "2px 7px", borderRadius: 6, background: done ? "#3ED66B" : C.gold, fontFamily: F_HEAD, fontWeight: 900, fontSize: 10.5, color: "#15120A", whiteSpace: "nowrap" }}>{done ? "OK" : `${n + 1} · ${steps[n][0].toUpperCase()}`}</span>
    </button>
  );
}
function PitStopGame({ best, onResult, onBack }) {
  const [s, setS] = useState(() => BtLogic.pitNew());
  const [lights, setLights] = useState(0);
  const [, setTick] = useState(0);
  const timers = useRef([]), reported = useRef(false);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => { if (s.phase !== "go") return; const id = setInterval(() => setTick(t => t + 1), 60); return () => clearInterval(id); }, [s.phase]);
  useEffect(() => { if (s.phase === "done" && !reported.current) { reported.current = true; onResult(s.time); } }, [s.phase]);
  const start = () => {
    timers.current.forEach(clearTimeout); timers.current = []; reported.current = false;
    setS(BtLogic.pitLights(BtLogic.pitNew())); setLights(0);
    [1, 2, 3].forEach(k => timers.current.push(setTimeout(() => setLights(k), k * 450)));
    timers.current.push(setTimeout(() => { setLights(0); setS(cur => cur.phase === "lights" ? BtLogic.pitGo(cur, performance.now()) : cur); }, 4 * 450));
  };
  const tap = id => setS(cur => BtLogic.pitTap(cur, id, performance.now()));
  const live = s.phase === "go" ? (performance.now() - s.start + s.penaltyMs) / 1000 : s.phase === "done" ? s.time : 0;
  const rating = s.phase === "done" ? PIT_RATING[BtLogic.pitRating(s.time)] : null;
  return (
    <div className="scrollcol" data-pit-phase={s.phase} style={{ height: "100%" }}>
      <GameHeader title="PIT STOP CHALLENGE" sub="Cambia le 4 gomme nel minor tempo possibile. Obiettivo: sotto i 2,0 secondi." onBack={onBack} />
      <div style={{ margin: "0 16px 10px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ display: "flex", gap: 6 }}>{[1, 2, 3].map(k => <span key={k} style={{ width: 18, height: 18, borderRadius: "50%", background: lights >= k ? "#E8121D" : "#2A2A30", boxShadow: lights >= k ? "0 0 10px rgba(232,18,29,.8)" : "none" }} />)}</div>
        <span style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 14, color: s.phase === "go" ? "#3ED66B" : C.muted }}>{s.phase === "ready" ? "Pronto?" : s.phase === "lights" ? "Aspetta il via…" : s.phase === "go" ? "VIA!" : "FINITO"}</span>
        <span data-pit-clock="" style={{ marginLeft: "auto", fontFamily: F_HEAD, fontWeight: 900, fontSize: 26, color: C.text, fontVariantNumeric: "tabular-nums" }}>{fmtSec(live)} s</span>
      </div>
      <div style={{ position: "relative", margin: "0 auto 10px", width: "min(300px, 78%)", aspectRatio: "200 / 330", borderRadius: 20, background: "repeating-linear-gradient(0deg, #1C1C21 0 18px, #19191E 18px 36px)", border: `1px solid ${C.border}` }}>
        <PitCar />
        {BtLogic.PIT_WHEELS.map(id => <PitWheel key={id} id={id} n={s.steps[id]} active={s.phase === "go"} onTap={tap} />)}
      </div>
      <p style={{ margin: "0 16px 10px", fontFamily: F_BODY, fontSize: 11.5, color: C.muted, lineHeight: 1.45, textAlign: "center" }}>Per ogni ruota tocca 4 volte, in ordine: <b style={{ color: C.text }}>1 svita · 2 togli la gomma vecchia · 3 monta la nuova · 4 avvita</b>. Le ruote sono indipendenti: usa due dita! Se tocchi di nuovo la stessa ruota troppo in fretta sbagli (+0,2 s).</p>
      {s.phase === "done" ? (
        <div data-pit-result="" style={{ margin: "0 16px 12px", padding: 14, borderRadius: 16, background: C.card, border: `1px solid ${s.time < 2 ? C.gold : C.border}`, textAlign: "center" }}>
          <div data-pit-time={s.time} style={{ fontFamily: F_HEAD, fontWeight: 900, fontSize: 34, color: C.text }}>{fmtSec(s.time)} secondi</div>
          <div style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 15, color: s.time < 2 ? C.gold : C.text, marginTop: 2 }}>{rating[0]}</div>
          <div style={{ fontFamily: F_BODY, fontSize: 12, color: C.muted, marginTop: 3 }}>{rating[1]}</div>
          {(s.errors > 0) && <div style={{ fontFamily: F_BODY, fontSize: 12, color: TIMING.yellow, marginTop: 6 }}>{s.falseStart ? "Partenza anticipata: +0,5 s. " : ""}Errori: {s.errors} (penalità +{(s.penaltyMs / 1000).toFixed(1).replace(".", ",")} s)</div>}
          {best != null && <div data-pit-best={best} style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 12, color: C.gold, marginTop: 6 }}>Il tuo record: {fmtSec(best)} s</div>}
        </div>
      ) : null}
      <button className="press" data-pit-start="" disabled={s.phase === "lights" || s.phase === "go"} onClick={start} style={{ display: "block", width: "calc(100% - 32px)", margin: "0 16px 18px", padding: "13px 0", borderRadius: 14, background: s.phase === "lights" || s.phase === "go" ? "rgba(232,18,29,.3)" : C.accent, fontFamily: F_HEAD, fontWeight: 900, fontSize: 14, color: "#fff" }}>{s.phase === "done" ? "RIPROVA" : "INIZIA IL PIT STOP"}</button>
    </div>
  );
}

// SILLY SEASON PREDICTOR: contratti dei piloti per il 2027, controllati il 3/10/2026 su RacingNews365, Crash.net e
// The Race (articoli aggiornati al 29/09/2026). confirmed: sedile già ufficiale per il 2027; gli altri sono aperti.
const SILLY_SEATS = [
  ["norris", "Contratto fino al 2030", true], ["piastri", "Contratto fino al 2028", true], ["leclerc", "Contratto pluriennale", true], ["hamilton", "Contratto fino al 2027", true],
  ["verstappen", "Contratto fino al 2030", true], ["hadjar", "Contratto fino al 2027", true], ["russell", "Pluriennale con opzioni: 2027 non ancora ufficiale", false], ["antonelli", "Pluriennale con opzioni: 2027 non ancora ufficiale", false],
  ["alonso", "Confermato per il 2027", true], ["stroll", "Confermato per il 2027", true], ["gasly", "Contratto fino al 2028", true], ["colapinto", "Contratto fino al 2027", true],
  ["albon", "Contratto fino al 2027", true], ["sainz", "Contratto pluriennale", true], ["lawson", "Scade a fine 2026", false], ["lindblad", "Scade a fine 2026", false],
  ["ocon", "Scade a fine 2026", false], ["bearman", "Scade a fine 2026 (opzione per il 2027)", false], ["hulkenberg", "Contratto pluriennale", true], ["bortoleto", "Contratto pluriennale", true],
  ["perez", "Contratto pluriennale (dal 2026)", true], ["bottas", "Contratto pluriennale (dal 2026)", true],
].map(([id, contract, confirmed]) => ({ id, contract, confirmed }));
const sillyName = id => id === "altro" ? "Un altro pilota" : ((driverById(id) || {}).full || id);
const sillyRenewPct = i => { const x = Math.sin((i + 3) * 12.9898 + 78.233) * 43758.5453; return Math.round(35 + (x - Math.floor(x)) * 45); };
function SillySeason({ preds, onPredict, official, onBack }) {
  const [tab, setTab] = useState("sedili");
  const [openSeat, setOpenSeat] = useState(null);
  const [draft, setDraft] = useState({});
  const current = Object.fromEntries(SILLY_SEATS.map(s => [s.id, s.id]));
  const board = BtLogic.sillyBoard({ official, current, mine: preds, seed: 27 });
  const chip = (on, label, attrs, onClick) => <button key={label} className="press" {...attrs} aria-pressed={on ? "true" : "false"} onClick={onClick} style={{ padding: "6px 9px", borderRadius: 9, background: on ? "rgba(232,18,29,.2)" : "rgba(255,255,255,.05)", border: `1px solid ${on ? C.accent : C.border}`, fontFamily: F_BODY, fontWeight: 700, fontSize: 11, color: on ? C.text : C.muted }}>{label}</button>;
  const seatRow = (s, i) => {
    const d = driverById(s.id) || {}, off = official[s.id], pred = preds[s.id], open = !s.confirmed && !off;
    const pts = off && pred ? BtLogic.sillyPoints({ pred, official: off, current: s.id }) : null;
    return (
      <div key={s.id} data-seat={s.id} data-seat-open={open ? "true" : "false"} style={{ padding: "10px 0", borderTop: `1px solid ${C.divider}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 4, height: 30, borderRadius: 2, background: d.color || C.dim }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 13.5, color: C.text }}>{d.full || s.id}</div>
            <div style={{ fontFamily: F_BODY, fontSize: 11, color: C.muted }}>{s.contract}</div>
          </div>
          <span style={{ padding: "3px 7px", borderRadius: 6, background: open ? "rgba(231,179,76,.16)" : "rgba(62,214,107,.14)", fontFamily: F_HEAD, fontWeight: 900, fontSize: 9.5, letterSpacing: .4, color: open ? C.gold : "#3ED66B", whiteSpace: "nowrap" }}>{off ? "UFFICIALE" : s.confirmed ? "UFFICIALE 2027" : "MERCATO APERTO"}</span>
        </div>
        {off && <p style={{ margin: "6px 0 0 12px", fontFamily: F_BODY, fontSize: 11.5, color: C.muted, lineHeight: 1.4 }}>Comunicato del {fmtDMY(off.at)}: nel 2027 c'è <b style={{ color: C.text }}>{sillyName(off.driver)}</b>.{pts ? <> La tua previsione: <b style={{ color: pts.points ? C.gold : C.text }}>+{pts.points} punti</b>{pts.right ? ` (pilota giusto +10${pts.bonus ? `, detto ${pts.days} giorni prima +${pts.bonus}` : ""}${pts.renewRight ? ", rinnovo giusto +5" : ""})` : pts.renewRight ? " (rinnovo giusto +5)" : ""}.</> : null}</p>}
        {!off && pred && <p style={{ margin: "6px 0 0 12px", fontFamily: F_BODY, fontSize: 11.5, color: C.muted, lineHeight: 1.4 }}>La tua previsione: <b style={{ color: C.text }}>{sillyName(pred.pick)}</b> · {pred.renew === "rinnova" ? "Rinnova" : "Cambia scuderia"} · pubblicata il {fmtDMY(pred.at)}. Community: {sillyRenewPct(i)}% dice che {d.name || s.id} rinnova (demo).</p>}
        {open && !pred && openSeat !== s.id && <button className="press" data-silly-open="" onClick={() => { setOpenSeat(s.id); setDraft({}); }} style={{ margin: "8px 0 0 12px", padding: "7px 12px", borderRadius: 10, background: C.accent, fontFamily: F_HEAD, fontWeight: 800, fontSize: 11.5, color: "#fff" }}>PREVEDI IL 2027</button>}
        {open && !pred && openSeat === s.id && (
          <div data-silly-form="" style={{ margin: "8px 0 0 12px", padding: 10, borderRadius: 12, background: "rgba(255,255,255,.04)", border: `1px solid ${C.border}` }}>
            <div style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 11.5, color: C.text, marginBottom: 6 }}>Chi guiderà questo sedile nel 2027?</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>{[...SILLY_SEATS.map(x => x.id), "altro"].map(id => chip(draft.pick === id, id === "altro" ? "Un altro" : driverCode(driverById(id)), { "data-silly-pick": id }, () => setDraft(x => ({ ...x, pick: id }))))}</div>
            <div style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 11.5, color: C.text, marginBottom: 6 }}>{d.name || s.id}: rinnova o cambia scuderia?</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>{[["rinnova", "Rinnova"], ["cambia", "Cambia scuderia"]].map(([k, l]) => chip(draft.renew === k, l, { "data-silly-renew": k }, () => setDraft(x => ({ ...x, renew: k }))))}</div>
            <button className="press" data-silly-publish="" disabled={!(draft.pick && draft.renew)} onClick={() => { if (!(draft.pick && draft.renew)) return; onPredict(s.id, { pick: draft.pick, renew: draft.renew, at: nowMs() }); setOpenSeat(null); }} style={{ width: "100%", padding: "10px 0", borderRadius: 11, background: draft.pick && draft.renew ? C.accent : "rgba(232,18,29,.3)", fontFamily: F_HEAD, fontWeight: 800, fontSize: 12.5, color: "#fff" }}>PUBBLICA LA PREVISIONE</button>
          </div>
        )}
      </div>
    );
  };
  return (
    <div className="scrollcol" style={{ height: "100%" }}>
      <GameHeader title="SILLY SEASON PREDICTOR" sub="Mercato piloti 2027: indovina chi guiderà dove. Prima lo dici, più punti fai quando arriva il comunicato." onBack={onBack} />
      <div style={{ display: "flex", gap: 6, padding: "0 16px 10px" }}>{[["sedili", "Sedili"], ["classifica", "Classifica"]].map(([k, l]) => <button key={k} className="press" data-silly-tab={k} aria-pressed={tab === k ? "true" : "false"} onClick={() => setTab(k)} style={{ flex: 1, padding: "9px 0", borderRadius: 11, background: tab === k ? C.accent : C.card, border: `1px solid ${tab === k ? C.accent : C.border}`, fontFamily: F_HEAD, fontWeight: 800, fontSize: 12, color: tab === k ? "#fff" : C.muted }}>{l}</button>)}</div>
      {tab === "sedili" ? (
        <div style={{ padding: "0 16px 18px" }}>
          <p style={{ margin: "0 0 6px", fontFamily: F_BODY, fontSize: 11, color: C.dim, lineHeight: 1.4 }}>Contratti aggiornati al 29/09/2026 (RacingNews365, Crash.net, The Race). I comunicati ufficiali li registra il Pannello Admin.</p>
          {TEAMS.map(t => { const seats = SILLY_SEATS.map((s, i) => [s, i]).filter(([s]) => (driverById(s.id) || {}).teamId === t.id); return seats.length ? (
            <div key={t.id} style={{ marginTop: 8 }}>
              <div style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 10.5, letterSpacing: 1, color: t.color || C.gold }}>{t.name.toUpperCase()}</div>
              {seats.map(([s, i]) => seatRow(s, i))}
            </div>
          ) : null; })}
        </div>
      ) : (
        <div style={{ padding: "0 16px 18px" }}>
          {board.map((r, i) => (
            <div key={r.name} data-silly-row="" data-me={r.me ? "true" : "false"} data-points={r.points} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 11, marginBottom: 5, background: r.me ? "rgba(232,18,29,.14)" : C.card, border: `1px solid ${r.me ? C.accent : C.border}` }}>
              <span style={{ width: 20, fontFamily: F_HEAD, fontWeight: 900, fontSize: 13, color: i < 3 ? C.gold : C.muted }}>{i + 1}</span>
              <span style={{ flex: 1, fontFamily: F_BODY, fontWeight: r.me ? 800 : 600, fontSize: 12.5, color: C.text }}>{r.name}</span>
              <span style={{ fontFamily: F_HEAD, fontWeight: 900, fontSize: 14, color: C.text }}>{r.points} pt</span>
            </div>
          ))}
          <p style={{ margin: "8px 2px 0", fontFamily: F_BODY, fontSize: 11.5, color: C.muted, lineHeight: 1.45 }}>Come si fanno punti: 10 per il pilota giusto, più un bonus per quanto prima l'avevi detto (60 giorni o più +20, 30 +15, 14 +10, 7 +5); +5 se indovini se il pilota rinnova o cambia. Le previsioni degli altri tifosi sono simulate (demo).</p>
        </div>
      )}
    </div>
  );
}

// DRAG VS DOWNFORCE: ala posteriore e altezza da terra per la pista scelta (stima didattica B&T).
const AERO_SHARE = {};
const aeroShare = id => { if (AERO_SHARE[id] == null) { const t = trackOf(id); let a = 0, b = 0; for (let i = 0; i < t.n; i++) { const dt = t.ds / t.speed[i]; b += dt; if (t.speed[i] * 3.6 > 250) a += dt; } AERO_SHARE[id] = a / b; } return AERO_SHARE[id]; };
function AeroCalc({ races, onBack }) {
  const opts = races.filter((r, i) => CIRCUITS[r.circuitId] && races.findIndex(x => x.circuitId === r.circuitId) === i);
  const next = races.find(r => r.status === "IN ARRIVO" && CIRCUITS[r.circuitId]) || opts[0];
  const [cid, setCid] = useState(next ? next.circuitId : null);
  const [wing, setWing] = useState(5), [ride, setRide] = useState(3);
  if (!cid) return null;
  const race = opts.find(r => r.circuitId === cid), m = BtLogic.aeroModel({ share: aeroShare(cid), lapTime: trackOf(cid).lapTime, wing, ride });
  const slider = (id, label, value, set, lo, hi) => (
    <div style={{ marginBottom: 14 }}>
      <label htmlFor={id} style={{ display: "flex", justifyContent: "space-between", fontFamily: F_BODY, fontWeight: 700, fontSize: 12, color: C.text, marginBottom: 6 }}><span>{label}</span><span style={{ color: C.gold }}>{String(value).replace(".", ",")} / 10</span></label>
      <input id={id} type="range" min="0" max="10" step="0.5" value={value} onChange={e => set(+e.target.value)} style={{ width: "100%", accentColor: C.accent }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: F_BODY, fontSize: 10.5, color: C.dim }}><span>{lo}</span><span>{hi}</span></div>
    </div>
  );
  const bar = (k, label, v, min, max, ideal) => (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: F_BODY, fontSize: 12, color: C.muted, marginBottom: 4 }}><span>{label}</span><b style={{ fontFamily: F_HEAD, fontSize: 15, color: C.text }}>{v} km/h</b></div>
      <div data-aero-bar={k} data-value={v} style={{ position: "relative", height: 12, borderRadius: 6, background: "rgba(255,255,255,.07)", overflow: "hidden" }}>
        <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.max(3, Math.min(100, (v - min) / (max - min) * 100))}%`, background: k === "top" ? C.accent : C.gold, borderRadius: 6 }} />
        <span aria-hidden="true" style={{ position: "absolute", top: -2, bottom: -2, width: 2, left: `${Math.max(0, Math.min(100, (ideal - min) / (max - min) * 100))}%`, background: "#fff", opacity: .8 }} />
      </div>
    </div>
  );
  return (
    <div className="scrollcol" style={{ height: "100%" }}>
      <GameHeader title="DRAG VS DOWNFORCE" sub="Prepara la vettura per la pista: più carico va più forte in curva, ma è più lenta in rettilineo." onBack={onBack} />
      <div style={{ margin: "0 16px 14px", padding: 14, borderRadius: 18, background: C.card, border: `1px solid ${C.border}` }}>
        <label htmlFor="aeroCircuit" style={{ display: "block", fontFamily: F_BODY, fontWeight: 700, fontSize: 11, letterSpacing: 1, color: C.gold, marginBottom: 6 }}>PISTA</label>
        <select id="aeroCircuit" value={cid} onChange={e => setCid(e.target.value)} style={{ width: "100%", padding: "10px 12px", marginBottom: 14, borderRadius: 12, background: C.bg, border: `1px solid ${C.border}`, color: C.text, fontFamily: F_BODY, fontSize: 13 }}>
          {opts.map(r => <option key={r.circuitId} value={r.circuitId}>{r.name} · {r.circuit}</option>)}
        </select>
        {slider("aeroWing", "Ala posteriore (carico aerodinamico)", wing, setWing, "Scarico (Monza)", "Massimo (Monaco)")}
        {slider("aeroRide", "Altezza da terra (effetto suolo)", ride, setRide, "Bassissima", "Alta")}
        {bar("top", "Velocità max in rettilineo", m.vmax, 300, 365, m.ideal.vmax)}
        {bar("corner", "Velocità di percorrenza in curva", m.vcorner, 140, 215, m.ideal.vcorner)}
        <div style={{ fontFamily: F_BODY, fontSize: 12, color: C.muted, marginTop: 4 }}>Tempo sul giro: <b style={{ color: m.lapDelta ? C.text : "#3ED66B" }}>{m.lapDelta ? `+${m.lapDelta.toFixed(2).replace(".", ",")} s` : "assetto ideale"}</b> rispetto all'assetto migliore stimato per {race ? race.circuit : "questa pista"} (ala {String(m.ideal.wing).replace(".", ",")}, altezza {String(m.ideal.ride).replace(".", ",")}; la riga bianca sulle barre).</div>
        {m.warnings.map(x => <p key={x.kind} data-aero-warn={x.kind} style={{ margin: "10px 0 0", padding: "8px 10px", borderRadius: 10, background: "rgba(242,194,48,.12)", border: "1px solid rgba(242,194,48,.4)", fontFamily: F_BODY, fontWeight: 600, fontSize: 12, color: TIMING.yellow, lineHeight: 1.4 }}>{x.text}</p>)}
        <button className="press" onClick={() => { setWing(m.ideal.wing); setRide(m.ideal.ride); }} style={{ marginTop: 12, padding: "8px 12px", borderRadius: 10, background: "rgba(255,255,255,.07)", border: `1px solid ${C.border}`, fontFamily: F_HEAD, fontWeight: 800, fontSize: 11.5, color: C.text }}>Usa l'assetto ideale</button>
      </div>
      <p style={{ margin: "0 18px 18px", fontFamily: F_BODY, fontSize: 11, color: C.dim, lineHeight: 1.45 }}>Stima didattica B&T calcolata dal disegno della pista (quanto del giro si passa in rettilineo): non sono dati delle squadre.</p>
    </div>
  );
}

/* ── TRACCIATI: Guida 2D interattiva e Circuit Spec Clash (dati veri) ─── */
// Guida 2D: tracciato e curve dal giro più veloce delle qualifiche (2026, oppure 2025 per le piste non ancora corse nel
// 2026), dati TracingInsights/FastF1; per Sepang e Madrid le curve sono ricavate dalle frenate. Momenti storici e nomi
// delle curve: ricerca con le fonti. Spec Clash: Formula1.com (Safety Car, sorpassi), Brembo (frenata), Pirelli/F1/squadre
// (carico) e telemetria (gas a tavoletta, velocità massima).
const GUIDE = () => (typeof BtRealData !== "undefined" && BtRealData && BtRealData.guide) || {};
const DF_IT = t => !t ? null : /lowest/.test(t) ? "Il più basso dell'anno" : /maximum wing/.test(t) ? "Ala al massimo, carico effettivo basso (altitudine)" : /maximum/.test(t) ? "Massimo" : /medium-high/.test(t) ? "Medio-alto" : /high/.test(t) ? "Alto" : /medium/.test(t) ? "Medio" : /low/.test(t) ? "Basso" : null;
const RISK_UI = { alto: ["ALTO", "#FF5A5F", "frenata fortissima da alta velocità: è qui che le gomme si bloccano più facilmente"], medio: ["MEDIO", TIMING.yellow, "frenata decisa: serve precisione col pedale"], basso: ["BASSO", "#3ED66B", "frenata leggera"], nessuno: ["NESSUNO", C.muted, "si passa senza una vera frenata"] };
// Punti del tracciato ruotati come la mappa ufficiale e portati in un riquadro W×H (y verso l'alto).
function guideProject(g, W, H, pad) {
  const r = (g.rotation || 0) / 180 * Math.PI, rot = ([x, y]) => [x * Math.cos(r) - y * Math.sin(r), x * Math.sin(r) + y * Math.cos(r)];
  const pts = g.outline.map(rot), xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const k = Math.min((W - 2 * pad) / (maxX - minX || 1), (H - 2 * pad) / (maxY - minY || 1));
  const ox = (W - (maxX - minX) * k) / 2, oy = (H - (maxY - minY) * k) / 2;
  const P = p => { const [x, y] = rot(p); return [ox + (x - minX) * k, H - (oy + (y - minY) * k)]; };
  return { P, d: "M" + g.outline.map(p => P(p).map(v => v.toFixed(1)).join(",")).join("L") + "Z" };
}
// Dove mettere i numeri delle curve: spostati di 60 m verso l'esterno (angolo ufficiale, come la mappa di FastF1) o,
// per le curve ricavate dalle frenate, lontano dal centro della pista; poi allontanati tra loro se si sovrappongono.
function guideLabels(g, P, W, H, min = 25) {
  const out = g.outline.map(P), cx = out.reduce((a, p) => a + p[0], 0) / out.length, cy = out.reduce((a, p) => a + p[1], 0) / out.length;
  const L = g.corners.map(c => {
    if (c.a != null) { const a = c.a / 180 * Math.PI; return P([c.x + 600 * Math.cos(a), c.y + 600 * Math.sin(a)]); }
    const [x, y] = P([c.x, c.y]), dx = x - cx, dy = y - cy, n = Math.hypot(dx, dy) || 1; return [x + dx / n * 15, y + dy / n * 15];
  });
  for (let it = 0; it < 8; it++) for (let i = 0; i < L.length; i++) for (let j = 0; j < i; j++) {
    const dx = L[i][0] - L[j][0], dy = L[i][1] - L[j][1], d = Math.hypot(dx, dy);
    if (d >= min) continue;
    const ux = d ? dx / d : 1, uy = d ? dy / d : 0, push = (min - d) / 2;
    L[i][0] += ux * push; L[i][1] += uy * push; L[j][0] -= ux * push; L[j][1] -= uy * push;
  }
  return L.map(([x, y]) => [Math.max(13, Math.min(W - 13, x)), Math.max(13, Math.min(H - 13, y))]);
}
// Nome corto della pista per menu e confronti ("Sepang", "Monaco", "Montréal"...).
const SHORT_CIRCUIT = { "Shanghai International Circuit": "Shanghai", "Miami International Autodrome": "Miami", "Circuit de Monaco": "Monaco", "Circuit de Barcelona-Catalunya": "Barcellona", "Circuit Gilles Villeneuve, Montréal": "Montréal", "Baku City Circuit": "Baku", "Sepang International Circuit": "Sepang", "Autódromo Hermanos Rodríguez": "Città del Messico", "Las Vegas Strip Circuit": "Las Vegas", "Circuit of the Americas, Austin": "Austin" };
const shortCircuit = r => SHORT_CIRCUIT[r.circuit] || r.circuit.split(",")[0];
function GuideMini({ circuitId, size = 34, color = "#fff" }) {
  const g = GUIDE()[circuitId]; if (!g) return <Icon name="flag" size={18} color={color} />;
  const { d } = guideProject(g, 100, 100, 8);
  return <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true"><path d={d} fill="none" stroke={color} strokeWidth="7" strokeLinejoin="round" /></svg>;
}
// Al posto di "Mostra di più": un invito grande e rosso alla pagina del circuito.
function CircuitCta({ circuitId, onOpen }) {
  const has = !!GUIDE()[circuitId];
  return (
    <button className="press cta-shine" data-circuit-cta={circuitId} onClick={onOpen} style={{ position: "relative", display: "flex", alignItems: "center", gap: 12, width: "100%", minHeight: 62, marginTop: 14, padding: "10px 12px 10px 10px", borderRadius: 14, overflow: "hidden", background: "linear-gradient(100deg, #E8121D 0%, #B80E17 58%, #730A10 100%)", border: "1px solid rgba(255,255,255,.22)", boxShadow: "0 10px 24px -8px rgba(232,18,29,.65)", textAlign: "left" }}>
      <span style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.22)" }}><GuideMini circuitId={circuitId} size={34} /></span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <b style={{ display: "block", fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 16, color: "#fff", letterSpacing: .3 }}>ESPLORA IL CIRCUITO</b>
        <span style={{ display: "block", marginTop: 1, fontFamily: F_BODY, fontWeight: 600, fontSize: 11.5, color: "rgba(255,255,255,.88)" }}>{has ? "Guida 2D delle curve · staccate · momenti storici" : "Numeri, programma del weekend e curiosità"}</span>
      </span>
      <span style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#fff" }}><Icon name="chevron" size={15} color="#E8121D" sw={2.8} /></span>
    </button>
  );
}
function CircuitGuide({ circuitId }) {
  const [sel, setSel] = useState(null);
  const g = GUIDE()[circuitId], moments = ((typeof BtRealData !== "undefined" && BtRealData && BtRealData.history) || {})[circuitId] || [];
  if (!g) return <p style={{ margin: "0 16px 16px", fontFamily: F_BODY, fontSize: 12, color: C.dim }}>Per questa pista non ci sono ancora dati veri.</p>;
  const W = 340, H = 240, { P, d } = guideProject(g, W, H, 22);
  const cur = g.corners.find(c => c.n === sel) || null, moment = cur && !cur.detected ? moments.filter(m => m.turn === cur.n) : [];
  const label = c => (c.detected ? "FRENATA " : "CURVA ") + c.n;
  const lab = guideLabels(g, P, W, H);
  const pos = c => { const q = lab[g.corners.indexOf(c)]; return [q[0] / W * 100, q[1] / H * 100]; };
  const line = (k, v) => <div style={{ display: "flex", gap: 8, padding: "6px 0", borderTop: `1px solid ${C.divider}`, fontFamily: F_BODY, fontSize: 12.5, color: C.muted, lineHeight: 1.4 }}><span style={{ width: 128, flexShrink: 0, color: C.dim }}>{k}</span><span style={{ color: C.text }}>{v}</span></div>;
  return (
    <div data-guide={circuitId} style={{ margin: "0 16px 16px", padding: 10, borderRadius: 18, background: C.card, border: `1px solid ${C.border}` }}>
      <div style={{ position: "relative", borderRadius: 14, background: "radial-gradient(120% 90% at 50% 20%, #1d1d24, #0b0b0e)" }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ display: "block", width: "100%" }} role="img" aria-label="Mappa del circuito con le curve">
          <path d={d} fill="none" stroke="#33333d" strokeWidth="11" strokeLinejoin="round" />
          <path d={d} fill="none" stroke="#E8121D" strokeWidth="2.4" strokeLinejoin="round" opacity=".9" />
          {cur && (() => { const [x, y] = P([cur.x, cur.y]); return <circle cx={x} cy={y} r="13" fill="rgba(231,179,76,.25)" stroke={C.gold} strokeWidth="2" />; })()}
        </svg>
        {g.corners.map(c => { const [x, y] = pos(c), on = c.n === sel; return (
          <button key={c.n} className="press" data-guide-corner={c.n} aria-label={label(c) + (c.name ? " · " + c.name : "")} aria-pressed={on ? "true" : "false"} onClick={() => setSel(on ? null : c.n)}
            style={{ position: "absolute", left: x + "%", top: y + "%", transform: "translate(-50%, -50%)", minWidth: 26, height: 26, padding: "0 5px", borderRadius: 13, background: on ? C.gold : "rgba(10,10,12,.88)", border: `1.5px solid ${on ? C.gold : c.risk === "alto" ? "#FF5A5F" : "rgba(255,255,255,.35)"}`, fontFamily: F_HEAD, fontWeight: 900, fontSize: 11, color: on ? "#15120A" : "#fff" }}>{c.detected ? "F" + c.n : c.n}</button>
        ); })}
      </div>
      <p style={{ margin: "8px 4px 0", fontFamily: F_BODY, fontSize: 11, color: C.dim, lineHeight: 1.45 }}>Tocca una curva. Bordo rosso = rischio di bloccaggio alto. {g.detected ? "Curve ricavate dalle frenate del giro più veloce (F1, F2…): nei dati non ci sono ancora le curve ufficiali di questa pista. " : ""}Dati veri: giro più veloce delle qualifiche {g.year} ({g.drv}, {LiveSim.fmtLap(g.time)}){g.year < 2026 ? ", con le vetture del 2025" : ""}.</p>
      {cur && (
        <div data-guide-card="" style={{ marginTop: 10, padding: "12px 12px 8px", borderRadius: 14, background: "rgba(255,255,255,.035)", border: `1px solid ${C.border}` }}>
          <div style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 15, color: C.text }}>{label(cur)}{cur.name ? <span style={{ color: C.gold }}> · {cur.name}</span> : null}</div>
          <div style={{ fontFamily: F_BODY, fontSize: 11, color: C.dim, marginBottom: 6 }}>a {Math.round(cur.d).toLocaleString("it-IT")} m dal via</div>
          {line("Marcia media", `${String(cur.gAvg).replace(".", ",")}ª (all'apice ${cur.gApex}ª)`)}
          {line("Velocità d'ingresso", `${cur.vEntry} km/h · minima ${cur.vMin} km/h`)}
          {line("Punto di staccata", cur.brake == null ? "nessuna frenata: curva in pieno" : cur.shared ? "è la stessa frenata della curva prima" : `${cur.brake} m prima della curva, da ${cur.vEntry} a ${cur.vMin} km/h`)}
          <div style={{ display: "flex", gap: 8, padding: "6px 0", borderTop: `1px solid ${C.divider}`, fontFamily: F_BODY, fontSize: 12.5, lineHeight: 1.4 }}><span style={{ width: 128, flexShrink: 0, color: C.dim }}>Rischio di bloccaggio</span><span><b data-guide-risk={cur.risk} style={{ color: RISK_UI[cur.risk][1], fontFamily: F_HEAD }}>{RISK_UI[cur.risk][0]}</b> <span style={{ color: C.muted }}>· {RISK_UI[cur.risk][2]}</span></span></div>
          {cur.full != null && line("Gas al 100%", `${cur.full} m dopo il punto più lento`)}
          <div style={{ marginTop: 6, padding: "9px 10px", borderRadius: 11, background: "rgba(232,18,29,.1)", border: "1px solid rgba(232,18,29,.3)" }}>
            <div style={{ fontFamily: F_HEAD, fontWeight: 900, fontSize: 12, color: C.accent, marginBottom: 3 }}>Momento storico B&T</div>
            {moment.length ? moment.map((m, i) => <p key={i} style={{ margin: i ? "7px 0 0" : 0, fontFamily: F_BODY, fontSize: 12.5, color: C.text, lineHeight: 1.45 }}><b>{m.year} · {m.race} · {m.who} su {m.on}.</b> {m.text_it} <a href={m.url} target="_blank" rel="noopener noreferrer" style={{ color: C.gold, fontSize: 11 }}>Fonte</a></p>)
              : <p style={{ margin: 0, fontFamily: F_BODY, fontSize: 12, color: C.muted }}>{cur.detected ? "Per le curve ricavate dalle frenate non abbiamo ancora i momenti storici." : "Nessun sorpasso storico registrato da B&T in questa curva, per ora."}</p>}
          </div>
          <p style={{ margin: "6px 0 0", fontFamily: F_BODY, fontSize: 10.5, color: C.dim }}>Rischio di bloccaggio: stima B&T dalla frenata (velocità e quanta ne si perde). Telemetria a circa 4 campioni al secondo: qualche metro di incertezza.</p>
        </div>
      )}
      {moments.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 10.5, letterSpacing: 1, color: C.gold, marginBottom: 4 }}>MOMENTI STORICI DI QUESTA PISTA</div>
          {moments.map((m, i) => <button key={i} className="press" data-guide-moment={m.turn} onClick={() => setSel(m.turn)} style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 0", borderTop: `1px solid ${C.divider}`, fontFamily: F_BODY, fontSize: 12, color: C.muted, lineHeight: 1.4 }}><b style={{ color: C.text }}>Curva {m.turn} · {m.year}</b> · {m.who} su {m.on}</button>)}
        </div>
      )}
    </div>
  );
}
function GuideTool({ races, onBack }) {
  const opts = races.filter((r, i) => GUIDE()[r.circuitId] && races.findIndex(x => x.circuitId === r.circuitId) === i);
  const next = races.find(r => r.status === "IN ARRIVO" && GUIDE()[r.circuitId]) || opts[0];
  const [cid, setCid] = useState(next ? next.circuitId : null);
  return (
    <div className="scrollcol" style={{ height: "100%" }}>
      <GameHeader title="GUIDA 2D DEI TRACCIATI" sub="Ogni curva è cliccabile: marcia, velocità, punto di staccata, rischio di bloccaggio e momento storico." onBack={onBack} />
      <div style={{ margin: "0 16px 10px" }}>
        <label htmlFor="guideCircuit" style={{ display: "block", fontFamily: F_BODY, fontWeight: 700, fontSize: 11, letterSpacing: 1, color: C.gold, marginBottom: 6 }}>PISTA</label>
        <select id="guideCircuit" value={cid || ""} onChange={e => setCid(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 12, background: C.card, border: `1px solid ${C.border}`, color: C.text, fontFamily: F_BODY, fontSize: 13 }}>{opts.map(r => <option key={r.circuitId} value={r.circuitId}>{r.name} · {r.circuit}</option>)}</select>
      </div>
      {cid && <CircuitGuide key={cid} circuitId={cid} />}
    </div>
  );
}
function SpecClash({ a: a0, b: b0, races }) {
  const G = GUIDE(), SP = (typeof BtRealData !== "undefined" && BtRealData && BtRealData.specs) || {};
  const opts = races.filter((r, i) => (G[r.circuitId] || SP[r.circuitId]) && races.findIndex(x => x.circuitId === r.circuitId) === i);
  const [a, setA] = useState(a0), [b, setB] = useState(b0);
  const nameOf = id => { const r = races.find(x => x.circuitId === id); return r ? shortCircuit(r) : id; };
  const sa = SP[a] || {}, sb = SP[b] || {}, ga = G[a], gb = G[b];
  const rows = [
    ["sc", "Safety Car (probabilità)", (sa.safety_car || {}).pct, (sb.safety_car || {}).pct, "%", 100],
    ["overtakes", "Sorpassi per gara (media)", (sa.overtakes || {}).avg, (sb.overtakes || {}).avg, "", 0],
    ["brembo", "Severità di frenata (Brembo, 1–5)", (sa.brembo || {}).index, (sb.brembo || {}).index, "/5", 5],
    ["full", "Gas a tavoletta (% del giro)", ga && ga.lap.fullPct, gb && gb.lap.fullPct, "%", 100],
    ["vmax", "Velocità massima (giro più veloce)", ga && ga.lap.vMax, gb && gb.lap.vMax, " km/h", 360],
  ];
  const sel = (id, v, set) => <select id={id} value={v} onChange={e => set(e.target.value)} style={{ flex: 1, minWidth: 0, padding: "9px 10px", borderRadius: 11, background: C.bg, border: `1px solid ${C.border}`, color: C.text, fontFamily: F_BODY, fontSize: 12.5 }}>{opts.map(r => <option key={r.circuitId} value={r.circuitId}>{shortCircuit(r)}</option>)}</select>;
  const fmt = (v, u) => v == null ? "n.d." : String(v).replace(".", ",") + u;
  const dfA = DF_IT((sa.downforce || {}).text), dfB = DF_IT((sb.downforce || {}).text);
  const verdict = (k, label) => { const r = rows.find(x => x[0] === k); if (!r || r[2] == null || r[3] == null || r[2] === r[3]) return null; const w = r[2] > r[3] ? nameOf(a) : nameOf(b); return `${label}: ${w} (${fmt(Math.max(r[2], r[3]), r[4])} contro ${fmt(Math.min(r[2], r[3]), r[4])})`; };
  return (
    <div data-clash="" style={{ margin: "0 16px 16px", padding: 12, borderRadius: 18, background: C.card, border: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ width: 10, height: 10, borderRadius: 3, background: C.accent, flexShrink: 0 }} />{sel("clashA", a, setA)}
        <span style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 13, color: C.gold }}>VS</span>
        {sel("clashB", b, setB)}<span style={{ width: 10, height: 10, borderRadius: 3, background: C.gold, flexShrink: 0 }} />
      </div>
      {rows.map(([k, l, va, vb, u, max0]) => { const max = max0 || Math.max(1, va || 0, vb || 0); return (
        <div key={k} data-clash-row={k} data-a={va == null ? "" : va} data-b={vb == null ? "" : vb} style={{ marginBottom: 10 }}>
          <div style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 11, color: C.muted, textAlign: "center", marginBottom: 4 }}>{l}</div>
          <div style={{ display: "grid", gridTemplateColumns: "58px 1fr 1fr 58px", alignItems: "center", gap: 6 }}>
            <b style={{ fontFamily: F_HEAD, fontSize: 13.5, color: C.text, textAlign: "right", whiteSpace: "nowrap" }}>{fmt(va, u)}</b>
            <span style={{ height: 10, borderRadius: 5, background: "rgba(255,255,255,.06)", display: "flex", justifyContent: "flex-end", overflow: "hidden" }}><span style={{ width: (va == null ? 0 : Math.min(100, va / max * 100)) + "%", background: C.accent, borderRadius: 5 }} /></span>
            <span style={{ height: 10, borderRadius: 5, background: "rgba(255,255,255,.06)", overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: (vb == null ? 0 : Math.min(100, vb / max * 100)) + "%", background: C.gold, borderRadius: 5 }} /></span>
            <b style={{ fontFamily: F_HEAD, fontSize: 13.5, color: C.text, whiteSpace: "nowrap" }}>{fmt(vb, u)}</b>
          </div>
        </div>
      ); })}
      <div data-clash-row="downforce" data-a={dfA || ""} data-b={dfB || ""} style={{ marginBottom: 10 }}>
        <div style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 11, color: C.muted, textAlign: "center", marginBottom: 4 }}>Livello di carico aerodinamico</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>{[dfA, dfB].map((v, i) => <span key={i} style={{ padding: "6px 8px", borderRadius: 9, textAlign: "center", background: i ? "rgba(231,179,76,.12)" : "rgba(232,18,29,.12)", fontFamily: F_HEAD, fontWeight: 800, fontSize: 12, color: v ? C.text : C.dim }}>{v || "n.d."}</span>)}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3, margin: "4px 0 8px", fontFamily: F_HEAD, fontWeight: 800, fontStyle: "italic", fontSize: 12, color: C.text }}>
        {[verdict("overtakes", "Più sorpassi"), verdict("sc", "Safety Car più probabile"), verdict("full", "Più gas a tavoletta"), verdict("brembo", "Frenate più dure")].filter(Boolean).map((t, i) => <span key={i}>{t}</span>)}
      </div>
      <p style={{ margin: 0, fontFamily: F_BODY, fontSize: 10.5, color: C.dim, lineHeight: 1.45 }}>Fonti: Formula1.com (probabilità della Safety Car e sorpassi delle ultime gare, anteprime 2025-26), Brembo (indice di difficoltà della frenata), Pirelli, F1 e squadre (carico), telemetria TracingInsights/FastF1 (gas a tavoletta e velocità massima del giro più veloce delle qualifiche). n.d. = dato non trovato.</p>
    </div>
  );
}
function ClashTool({ races, onBack }) {
  return <div className="scrollcol" style={{ height: "100%" }}><GameHeader title="CIRCUIT SPEC CLASH" sub="Due piste a confronto: Safety Car, sorpassi, frenate, gas a tavoletta e carico aerodinamico." onBack={onBack} /><SpecClash a="it-1922" b="mc-1929" races={races} /></div>;
}

/* ── WEEKEND DI GARA: strumenti del Garage con i dati veri 2026 ─────── */
// Logica: app-preview/bt-weekend.js (BtWk, testata in rtest/weekend.test.js). Dati: app-preview/real-weekend.js
// (BtWeekend: prove libere di Sepang e Baku, qualifiche e gare 2026, da TracingInsights/FastF1).
const COMP_UI = { S: ["#E8121D", "Morbide", "#fff"], M: ["#F2C230", "Medie", "#15120A"], H: ["#F4F2EF", "Dure", "#15120A"], I: ["#3ED66B", "Intermedie", "#0A0A0C"], W: ["#4C8DFF", "Da bagnato", "#fff"], "?": ["#86858C", "Sconosciute", "#fff"] };
const compUi = c => COMP_UI[c] || COMP_UI["?"];
const TEAM_SHORT = { mclaren: "MCL", redbull: "RBR", mercedes: "MER", ferrari: "FER", williams: "WIL", racingbulls: "RB", astonmartin: "AST", haas: "HAA", audi: "AUD", alpine: "ALP", cadillac: "CAD" };
const roundOfCircuit = cid => CIRCUIT_IDS.indexOf(cid) + 1;
const fmtLapMs = ms => ms ? LiveSim.fmtLap(ms / 1000) : "—";
const fmtDec = (v, d = 2) => Math.abs(v).toFixed(d).replace(".", ",");
const sgn = (v, d = 2) => (v >= 0 ? "+" : "−") + fmtDec(v, d);
const surnameOf = code => ghostInfo(code).name.split(" ").slice(-1)[0];
const driverOfCode = code => DRIVERS.find(d => driverCode(d) === code) || null;
const circuitShort = (races, cid) => { const r = races.find(x => x.circuitId === cid); return r ? shortCircuit(r) : cid; };
const raceNameOfCid = (races, cid) => { const r = races.find(x => x.circuitId === cid); return r ? r.name : cid; };
const WK_CARD = { margin: "0 16px 12px", padding: 12, borderRadius: 16, background: C.card, border: `1px solid ${C.border}` };
const WkLabel = ({ children, style }) => <div style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 10.5, letterSpacing: 1, color: C.gold, marginBottom: 6, ...style }}>{children}</div>;
const WkNote = ({ children }) => <p style={{ margin: "0 18px 18px", fontFamily: F_BODY, fontSize: 10.5, color: C.dim, lineHeight: 1.45 }}>{children}</p>;
const WkChip = ({ attrs, on, onClick, children, color }) => <button className="press" {...attrs} aria-pressed={on ? "true" : "false"} onClick={onClick} style={{ flex: "0 0 auto", display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 11px", borderRadius: 10, background: on ? (color || C.accent) : "rgba(255,255,255,.05)", border: `1px solid ${on ? (color || C.accent) : C.border}`, fontFamily: F_HEAD, fontWeight: 800, fontSize: 12, color: "#fff", whiteSpace: "nowrap" }}>{children}</button>;
const CompDot = ({ c, size = 10 }) => <span aria-hidden="true" style={{ display: "inline-block", width: size, height: size, borderRadius: "50%", flexShrink: 0, background: compUi(c)[0], boxShadow: "0 0 0 1.5px rgba(0,0,0,.5)" }} />;

/* SCANNER DELL'ASSETTO: prove libere vere. Per ogni scuderia velocità di punta e velocità minima nelle curve medie e
   veloci (dal giro più veloce dei due piloti) contro la mediana del gruppo, e i programmi di lavoro (long run). */
const SETUP_LABEL = { scarico: ["ALA SCARICA", "#4C8DFF", "Ala più scarica della media: guadagna sui rettilinei e perde nelle curve medio-veloci."], carico: ["PIÙ CARICO", "#E7B34C", "Più carico aerodinamico: va forte in curva e paga qualcosa in rettilineo."], efficiente: ["EFFICIENTE", "#3ED66B", "Veloce sia in rettilineo sia in curva: una delle vetture più efficienti di questa sessione."], difficolta: ["IN DIFFICOLTÀ", "#FF5A5F", "Lenta sia in rettilineo sia in curva: sta ancora cercando l'assetto giusto."], medio: ["NELLA MEDIA", C.muted, "Assetto nella media del gruppo."] };
const runText = r => r.kind === "long" ? `Long run · ${r.laps} giri sulle ${compUi(r.c)[1]} · media ${fmtLapMs(r.avg)}` : `${r.n > 1 ? `Simulazioni di qualifica: ${r.n}, la migliore` : "Simulazione di qualifica"} · ${compUi(r.c)[1]} · ${fmtLapMs(r.best)}`;
function SetupScanner({ races, onBack }) {
  const P = BtWeekend.practice, weekends = Object.keys(P).sort((a, b) => roundOfCircuit(b) - roundOfCircuit(a));
  const [cid, setCid] = useState(weekends[0]);
  const sesList = Object.keys(P[cid]);
  const [ses0, setSes] = useState(sesList[sesList.length - 1]);
  const ses = P[cid][ses0] ? ses0 : sesList[sesList.length - 1], S = P[cid][ses];
  const prof = BtWk.profile(S);
  const [sel0, setSel] = useState(null);
  const sel = prof.teams.find(t => t.team === sel0) || prof.teams[0];
  const sesBest = Math.min(...prof.teams.map(t => t.best));
  const W = 340, H = 236, L = 34, R = 10, T = 12, B = 30;
  const xs = prof.teams.map(t => t.top), ys = prof.teams.map(t => t.corner);
  const x0 = Math.floor(Math.min(...xs) - 2), x1 = Math.ceil(Math.max(...xs) + 3), y0 = Math.floor(Math.min(...ys) - 1.5), y1 = Math.ceil(Math.max(...ys) + 1.5);
  const X = v => L + (v - x0) / (x1 - x0) * (W - L - R), Y = v => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
  const ticks = (a, b, n) => { const st = Math.max(1, Math.round((b - a) / n)), out = []; for (let v = Math.ceil(a / st) * st; v <= b; v += st) out.push(v); return out; };
  // Etichette delle scuderie accanto al punto, spostate se si sovrappongono.
  const boxes = prof.teams.map(t => [X(t.top) - 7, Y(t.corner) + 7, 14]), labels = prof.teams.map(t => {
    const px = X(t.top), py = Y(t.corner), wl = TEAM_SHORT[t.team].length * 6.2 + 2;
    const tries = [[px + 9, py + 3.5], [px + 9, py - 7], [px + 9, py + 14], [px - 9 - wl, py + 3.5], [px - 9 - wl, py - 7], [px - 9 - wl, py + 14]];
    const fits = ([x, y]) => x >= L && x + wl <= W - 2 && y - 9 >= T && y <= H - B && !boxes.some(b => x < b[0] + b[2] && x + wl > b[0] && y - 9 < b[1] && y > b[1] - (b[2] === 14 ? 14 : 9));
    const [x, y] = tries.find(fits) || tries[0]; boxes.push([x, y, wl]); return [x, y];
  });
  const lab = SETUP_LABEL[sel.label];
  const longs = prof.teams.filter(t => t.long).sort((a, b) => a.long.avg - b.long.avg);
  const row = (k, v) => <div style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "6px 0", borderTop: `1px solid ${C.divider}`, fontFamily: F_BODY, fontSize: 12.5, color: C.muted }}><span>{k}</span><b style={{ color: C.text, fontFamily: F_HEAD, whiteSpace: "nowrap" }}>{v}</b></div>;
  return (
    <div data-setup="" className="scrollcol" style={{ height: "100%" }}>
      <GameHeader title="SCANNER DELL'ASSETTO" sub="Prove libere vere: chi ha scaricato l'ala, chi cerca carico e chi ha già fatto la simulazione di gara." onBack={onBack} />
      <div style={WK_CARD}>
        <WkLabel>WEEKEND</WkLabel>
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>{weekends.map((w, i) => <WkChip key={w} attrs={{ "data-setup-weekend": w }} on={w === cid} onClick={() => { setCid(w); setSel(null); }}>{circuitShort(races, w)}{i === 0 ? " · ultimo" : ""}</WkChip>)}</div>
        <div style={{ display: "flex", gap: 6 }}>{sesList.map(k => <WkChip key={k} attrs={{ "data-setup-session": k }} on={k === ses} onClick={() => { setSes(k); setSel(null); }}>{k}</WkChip>)}</div>
      </div>
      <div style={{ ...WK_CARD, padding: "10px 8px 8px" }}>
        <div style={{ padding: "0 4px 4px", fontFamily: F_BODY, fontWeight: 700, fontSize: 10.5, letterSpacing: 1, color: C.dim }}>{raceNameOfCid(races, cid).toUpperCase()} · {(SES_NAME_IT[ses] || ses).toUpperCase()}</div>
        <div style={{ position: "relative" }}>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ display: "block", width: "100%" }} role="img" aria-label="Velocità di punta contro velocità in curva per scuderia">
            {ticks(x0, x1, 5).map(v => <g key={"x" + v}><line x1={X(v)} x2={X(v)} y1={T} y2={H - B} stroke="rgba(255,255,255,.06)" /><text x={X(v)} y={H - B + 12} textAnchor="middle" fill={C.dim} fontFamily={F_BODY} fontSize="8.5">{v}</text></g>)}
            {ticks(y0, y1, 4).map(v => <g key={"y" + v}><line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="rgba(255,255,255,.06)" /><text x={L - 4} y={Y(v) + 3} textAnchor="end" fill={C.dim} fontFamily={F_BODY} fontSize="8.5">{v}</text></g>)}
            <line x1={X(prof.mTop)} x2={X(prof.mTop)} y1={T} y2={H - B} stroke="rgba(255,255,255,.28)" strokeDasharray="3 4" />
            <line x1={L} x2={W - R} y1={Y(prof.mCorner)} y2={Y(prof.mCorner)} stroke="rgba(255,255,255,.28)" strokeDasharray="3 4" />
            {[["PIÙ CARICO", L + 4, T + 9, "start"], ["EFFICIENTI", W - R - 4, T + 9, "end"], ["IN DIFFICOLTÀ", L + 4, H - B - 5, "start"], ["ALA SCARICA", W - R - 4, H - B - 5, "end"]].map(([t, x, y, a]) => <text key={t} x={x} y={y} textAnchor={a} fill="rgba(255,255,255,.32)" fontFamily={F_HEAD} fontWeight="800" fontSize="8.5" letterSpacing=".6">{t}</text>)}
            {prof.teams.map((t, i) => { const tm = teamById(t.team), on = t.team === sel.team; return <g key={t.team}><circle cx={X(t.top)} cy={Y(t.corner)} r={on ? 8 : 6} fill={tm ? tm.color : C.dim} stroke={on ? "#fff" : C.card} strokeWidth="2" /><text x={labels[i][0]} y={labels[i][1]} fill={on ? C.text : C.muted} fontFamily={F_HEAD} fontWeight="800" fontSize="9.5">{TEAM_SHORT[t.team]}</text></g>; })}
            <text x={(L + W - R) / 2} y={H - 4} textAnchor="middle" fill={C.dim} fontFamily={F_BODY} fontSize="9">Velocità di punta (km/h) →</text>
          </svg>
          {prof.teams.map(t => { const tm = teamById(t.team); return <button key={t.team} className="press" data-setup-dot={t.team} aria-label={`${tm ? tm.name : t.team}: ${Math.round(t.top)} km/h in rettilineo, ${Math.round(t.corner)} km/h in curva`} onClick={() => setSel(t.team)} style={{ position: "absolute", left: X(t.top) / W * 100 + "%", top: Y(t.corner) / H * 100 + "%", width: 26, height: 26, transform: "translate(-50%, -50%)", borderRadius: "50%", background: "transparent" }} />; })}
        </div>
        <div style={{ padding: "2px 4px 0", fontFamily: F_BODY, fontSize: 10.5, color: C.dim, lineHeight: 1.4 }}>↑ Velocità minima nelle curve medie e veloci (km/h). Righe tratteggiate: la mediana del gruppo. Tocca una scuderia.</div>
      </div>
      {sel && (() => { const tm = teamById(sel.team); return (
        <div data-setup-team={sel.team} style={WK_CARD}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ width: 4, height: 22, borderRadius: 2, background: tm ? tm.color : C.dim }} />
            <b style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 16, color: C.text }}>{tm ? tm.name : sel.team}</b>
            <span data-setup-label={sel.label} style={{ padding: "2px 8px", borderRadius: 7, background: "rgba(255,255,255,.06)", border: `1px solid ${lab[1]}`, fontFamily: F_HEAD, fontWeight: 900, fontSize: 11, color: lab[1] }}>{lab[0]}</span>
          </div>
          <p style={{ margin: "6px 0 4px", fontFamily: F_BODY, fontSize: 12.5, color: C.text, lineHeight: 1.45 }}>{lab[2]} In rettilineo {sgn(sel.dTop, 1)} km/h e in curva {sgn(sel.dCorner, 1)} km/h rispetto alla mediana del gruppo.</p>
          {row("Velocità di punta", `${Math.round(sel.top)} km/h`)}
          {row("In curva (medie e veloci)", `${Math.round(sel.corner)} km/h`)}
          {sel.slow != null && row("Nelle curve lente", `${Math.round(sel.slow)} km/h`)}
          {sel.full != null && row("Gas a tavoletta", `${Math.round(sel.full)}% del giro`)}
          {sel.drivers.map(code => { const E = S[code], all = BtWk.runs(E), qs = all.filter(r => r.kind === "quali"), qb = qs.slice().sort((a, b) => a.best - b.best)[0];
            const rs = [...(qb ? [{ ...qb, n: qs.length }] : []), ...all.filter(r => r.kind === "long")]; return (
            <div key={code} style={{ padding: "8px 0 2px", borderTop: `1px solid ${C.divider}` }}>
              <div style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 13, color: C.text }}>{ghostInfo(code).name} · {fmtLapMs(E.best && E.best.ms)} <span style={{ fontFamily: F_BODY, fontWeight: 600, fontSize: 11, color: C.dim }}>{E.best && E.best.ms === sesBest ? "il più veloce della sessione" : E.best ? `${sgn((E.best.ms - sesBest) / 1000, 3)} s dal migliore` : ""}</span></div>
              {rs.length ? rs.map((r, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, fontFamily: F_BODY, fontSize: 12, color: C.muted }}><CompDot c={r.c} />{runText(r)}</div>) : <div style={{ marginTop: 4, fontFamily: F_BODY, fontSize: 12, color: C.dim }}>Pochi giri: nessun programma riconoscibile.</div>}
            </div>
          ); })}
        </div>
      ); })()}
      <div style={WK_CARD}>
        <WkLabel>PASSO GARA DELLE LONG RUN · {ses}</WkLabel>
        {longs.length ? longs.map((t, i) => { const tm = teamById(t.team); return (
          <div key={t.team} data-setup-long={t.team} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderTop: i ? `1px solid ${C.divider}` : "none", fontFamily: F_BODY, fontSize: 12, color: C.muted }}>
            <b style={{ width: 16, fontFamily: F_HEAD, color: i < 3 ? C.gold : C.muted }}>{i + 1}</b><span style={{ width: 3, height: 14, borderRadius: 2, background: tm ? tm.color : C.dim }} />
            <span style={{ flex: 1, minWidth: 0 }}><b style={{ color: C.text }}>{tm ? tm.name : t.team}</b> · {t.long.code} · {t.long.laps} giri <CompDot c={t.long.c} size={8} /></span>
            <b style={{ fontFamily: F_HEAD, color: C.text }}>{fmtLapMs(t.long.avg)}</b>
          </div>
        ); }) : <p style={{ margin: 0, fontFamily: F_BODY, fontSize: 12, color: C.dim }}>In questa sessione nessuna squadra ha fatto una simulazione di gara.</p>}
        <p style={{ margin: "6px 0 0", fontFamily: F_BODY, fontSize: 10.5, color: C.dim, lineHeight: 1.4 }}>Media dei giri costanti di almeno 5 giri di fila. La benzina a bordo non si sa: è un indizio, non una classifica.</p>
      </div>
      <WkNote>Dati veri: TracingInsights (github.com/TracingInsights/2026), dati FastF1 dal live timing di Formula 1. Velocità dalla telemetria del giro più veloce di ogni pilota (circa 4 campioni al secondo). Nel 2026 la velocità di punta dipende anche da come si usa la batteria: l'assetto è una stima B&T. Solo per l'anteprima.</WkNote>
    </div>
  );
}
const SES_NAME_IT = { FP1: "Prove libere 1", FP2: "Prove libere 2", FP3: "Prove libere 3" };

/* TIRE STRATEGY PREDICTOR: la strategia sulla linea dei giri (mescole e soste, si trascinano), chiusa 15 minuti prima
   del via. Punti contro la strategia vera del vincitore e del podio; allenamento sulle gare 2026 già corse. */
const raceStartMs = r => { const w = ((CIRCUIT_INFO[r.circuitId] || {}).weekend || []).find(s => s.key === "RACE"); return w ? Date.parse(w.utc) : Date.parse(r.date + "T13:00:00Z"); };
const defaultStints = laps => [{ c: "M", to: Math.round(laps * 0.4) }, { c: "H", to: laps }];
const stintsText = (st, laps) => `${st.length - 1} ${st.length - 1 === 1 ? "sosta" : "soste"}: ` + st.map((s, i) => `${compUi(s.c)[1]} (${i ? st[i - 1].to + 1 : 1}-${s.to})`).join(" → ");
function StrategyBuilder({ laps, value, onChange, locked }) {
  const drag = useRef(null);
  const [pick, setPick] = useState(0);
  const set = v => !locked && onChange(v);
  const moveTo = (i, lap) => { const lo = (i ? value[i - 1].to : 0) + 3, hi = value[i + 1].to - 3; const to = Math.max(lo, Math.min(hi, lap)); if (to !== value[i].to) set(value.map((s, k) => k === i ? { ...s, to } : s)); };
  const onMove = e => { if (drag.current == null) return; const r = e.currentTarget.getBoundingClientRect(); moveTo(drag.current, Math.round((e.clientX - r.left) / r.width * laps)); };
  const cycle = i => set(value.map((s, k) => k === i ? { ...s, c: { S: "M", M: "H", H: "S" }[s.c] || "M" } : s));
  const add = () => { if (value.length >= 4) return; let bi = 0, bl = 0; value.forEach((s, i) => { const n = s.to - (i ? value[i - 1].to : 0); if (n > bl) { bl = n; bi = i; } }); const from = bi ? value[bi - 1].to : 0, mid = from + Math.round(bl / 2); const v = value.slice(); v.splice(bi, 1, { c: value[bi].c, to: mid }, { c: value[bi].c === "H" ? "M" : "H", to: value[bi].to }); set(v); setPick(bi); };
  const remove = () => { if (value.length <= 1) return; const v = value.slice(0, -1); v[v.length - 1] = { ...v[v.length - 1], to: laps }; set(v); setPick(0); };
  const warn = BtWk.validatePred(value, laps).warnings;
  const p = Math.min(pick, value.length - 2);
  return (
    <div data-strat-builder="">
      <div onPointerMove={onMove} onPointerUp={() => { drag.current = null; }} onPointerLeave={() => { drag.current = null; }} style={{ position: "relative", height: 48, margin: "6px 0 4px", borderRadius: 12, background: "rgba(255,255,255,.04)", touchAction: "none" }}>
        {value.map((s, i) => { const from = i ? value[i - 1].to + 1 : 1, n = s.to - from + 1, u = compUi(s.c); return (
          <button key={"s" + i} className="press" data-strat-stint={i} data-compound={s.c} aria-label={`Stint ${i + 1}: ${u[1]}, ${n} giri. Tocca per cambiare mescola`} disabled={locked} onClick={() => cycle(i)}
            style={{ position: "absolute", top: 0, bottom: 0, left: `calc(${(from - 1) / laps * 100}% + 1px)`, width: `calc(${n / laps * 100}% - 2px)`, borderRadius: 10, background: u[0], fontFamily: F_HEAD, fontWeight: 900, fontSize: 12, color: u[2], overflow: "hidden", whiteSpace: "nowrap" }}>{n >= 6 ? `${s.c} · ${n}` : s.c}</button>
        ); })}
        {!locked && value.slice(0, -1).map((s, i) => (
          <span key={"p" + i} data-strat-pit={i} data-lap={s.to} role="slider" aria-label={`Sosta ${i + 1} al giro ${s.to}`} aria-valuenow={s.to} onPointerDown={() => { drag.current = i; setPick(i); }}
            style={{ position: "absolute", top: -6, bottom: -6, left: `${s.to / laps * 100}%`, width: 22, transform: "translateX(-50%)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "ew-resize", touchAction: "none" }}>
            <span style={{ width: 6, height: 40, borderRadius: 3, background: "#0A0A0C", border: `2px solid ${i === p ? C.gold : "#fff"}` }} />
          </span>
        ))}
      </div>
      <div style={{ position: "relative", height: 14, marginBottom: 6 }}>{[1, ...Array.from({ length: Math.floor(laps / 10) }, (_, k) => (k + 1) * 10).filter(v => v < laps - 3), laps].map(v => <span key={v} style={{ position: "absolute", left: `${(v - 0.5) / laps * 100}%`, transform: "translateX(-50%)", fontFamily: F_BODY, fontSize: 9.5, color: C.dim }}>{v}</span>)}</div>
      {value.slice(0, -1).map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderTop: `1px solid ${C.divider}`, fontFamily: F_BODY, fontSize: 12.5, color: C.muted }}>
          <span style={{ flex: 1 }}>Sosta {i + 1}: <b style={{ color: C.text }}>giro {s.to}</b> · da {compUi(s.c)[1]} a {compUi(value[i + 1].c)[1]}</span>
          {!locked && <>
            <button className="press" data-strat-minus={i} aria-label={`Sosta ${i + 1} un giro prima`} onClick={() => { setPick(i); moveTo(i, s.to - 1); }} style={{ width: 32, height: 30, borderRadius: 9, background: "rgba(255,255,255,.07)", border: `1px solid ${C.border}`, fontFamily: F_HEAD, fontWeight: 900, fontSize: 15, color: C.text }}>−</button>
            <button className="press" data-strat-plus={i} aria-label={`Sosta ${i + 1} un giro dopo`} onClick={() => { setPick(i); moveTo(i, s.to + 1); }} style={{ width: 32, height: 30, borderRadius: 9, background: "rgba(255,255,255,.07)", border: `1px solid ${C.border}`, fontFamily: F_HEAD, fontWeight: 900, fontSize: 15, color: C.text }}>+</button>
          </>}
        </div>
      ))}
      {!locked && <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button className="press" data-strat-add="" disabled={value.length >= 4} onClick={add} style={{ flex: 1, padding: "9px 0", borderRadius: 10, background: "rgba(255,255,255,.07)", border: `1px solid ${C.border}`, fontFamily: F_HEAD, fontWeight: 800, fontSize: 12, color: value.length >= 4 ? C.dim : C.text }}>+ Sosta</button>
        <button className="press" data-strat-remove="" disabled={value.length <= 1} onClick={remove} style={{ flex: 1, padding: "9px 0", borderRadius: 10, background: "rgba(255,255,255,.07)", border: `1px solid ${C.border}`, fontFamily: F_HEAD, fontWeight: 800, fontSize: 12, color: value.length <= 1 ? C.dim : C.text }}>− Sosta</button>
      </div>}
      {!locked && <p style={{ margin: "6px 0 0", fontFamily: F_BODY, fontSize: 11, color: C.dim, lineHeight: 1.4 }}>Tocca uno stint per cambiare mescola, trascina le righe bianche (o usa − e +) per spostare le soste.</p>}
      {warn.map(x => <p key={x} data-strat-warn="" style={{ margin: "8px 0 0", padding: "7px 10px", borderRadius: 10, background: "rgba(242,194,48,.12)", border: "1px solid rgba(242,194,48,.4)", fontFamily: F_BODY, fontWeight: 600, fontSize: 12, color: TIMING.yellow }}>{x}</p>)}
    </div>
  );
}
// Strategie vere (una riga per pilota, gli stint colorati sulla linea dei giri).
function StrategyBars({ rows, laps }) {
  return (
    <div>
      {rows.map(r => (
        <div key={r.key} data-strat-real={r.key} style={{ display: "flex", alignItems: "center", gap: 6, margin: "3px 0" }}>
          <span style={{ width: 46, flexShrink: 0, fontFamily: F_HEAD, fontWeight: 800, fontSize: 11, color: r.me ? C.gold : C.text, whiteSpace: "nowrap" }}>{r.label}</span>
          <span style={{ position: "relative", flex: 1, height: 16 }}>{r.st.map((s, i) => { const from = s.from, n = s.to - from + 1, u = compUi(s.c); return <span key={i} style={{ position: "absolute", top: 0, bottom: 0, left: `calc(${(from - 1) / laps * 100}% + 1px)`, width: `calc(${n / laps * 100}% - 2px)`, borderRadius: 4, background: u[0], fontFamily: F_HEAD, fontWeight: 900, fontSize: 9, lineHeight: "16px", color: u[2], textAlign: "center", overflow: "hidden" }}>{n / laps > 0.06 ? s.c : ""}</span>; })}</span>
        </div>
      ))}
      <div style={{ display: "flex", gap: 10, marginTop: 6, paddingLeft: 52, fontFamily: F_BODY, fontSize: 10.5, color: C.dim }}>{["S", "M", "H"].map(c => <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><CompDot c={c} size={8} />{c} = {compUi(c)[1]}</span>)}</div>
    </div>
  );
}
function StrategyResult({ R, pred, races }) {
  const res = BtWk.strategyPoints(pred, R); if (!res) return null;
  const win = BtWk.strategy(R.drivers[res.winner]);
  const order = Object.entries(R.drivers).filter(([, D]) => D.pos).sort((a, b) => a[1].pos - b[1].pos).slice(0, 10);
  const parts = [["Soste", res.parts.stops, `il vincitore ne ha fatte ${win.length - 1}`], ["Mescole", res.parts.compounds, "4 punti per ogni stint con la sua mescola"], ["Pit stop", res.parts.laps, "6 entro 2 giri dalla sua sosta, 3 entro 5"], ["Podio", res.parts.podium, "5 se le mescole sono come quelle di un pilota sul podio"]];
  return (
    <div data-strat-result="" style={{ marginTop: 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><b style={{ fontFamily: F_HEAD, fontWeight: 900, fontSize: 28, color: C.gold }}>{res.total}</b><span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 13, color: C.text }}>punti</span></div>
      <p style={{ margin: "2px 0 8px", fontFamily: F_BODY, fontSize: 12.5, color: C.text, lineHeight: 1.45 }}>Ha vinto <b>{ghostInfo(res.winner).name}</b> con {stintsText(win.map(s => ({ c: s.c, to: s.to })), R.laps)}.</p>
      {parts.map(([k, v, why]) => <div key={k} style={{ display: "flex", gap: 8, padding: "5px 0", borderTop: `1px solid ${C.divider}`, fontFamily: F_BODY, fontSize: 12, color: C.muted }}><span style={{ width: 70, color: C.text, fontWeight: 600 }}>{k}</span><span style={{ flex: 1 }}>{why}</span><b style={{ fontFamily: F_HEAD, color: v ? "#3ED66B" : C.dim }}>+{v}</b></div>)}
      <WkLabel style={{ marginTop: 12 }}>LE STRATEGIE VERE · {raceNameOfCid(races, R.circuitId).toUpperCase()}</WkLabel>
      <StrategyBars laps={R.laps} rows={[{ key: "me", label: "TU", me: true, st: pred.map((s, i) => ({ c: s.c, from: i ? pred[i - 1].to + 1 : 1, to: s.to })) }, ...order.map(([code, D]) => ({ key: code, label: `P${D.pos} ${code}`, st: BtWk.strategy(D) }))]} />
    </div>
  );
}
function StrategyPredictor({ races, preds = {}, onSave, onBack }) {
  const now = nowMs();
  const target = races.find(r => raceStartMs(r) + 3 * 3600e3 > now);
  const [tab, setTab] = useState("next");
  const past = BtWeekend.races.slice().sort((a, b) => b.round - a.round);
  const [pc, setPc] = useState(past[0].circuitId);
  const [trial, setTrial] = useState({});
  const [shown, setShown] = useState({});
  const info = target ? CIRCUIT_INFO[target.circuitId] : null, laps = info ? info.laps : 56;
  const start = target ? raceStartMs(target) : 0, lockAt = start - 15 * 60e3, locked = now >= lockAt;
  const mine = target && preds[target.id];
  const [draft, setDraft] = useState(null);
  const cur = draft || (mine ? mine.stints : defaultStints(laps));
  const realNext = target ? BtWeekend.races.find(r => r.round === target.round) : null;
  const comm = target ? BtWk.communityPicks(target.round, laps) : [];
  const myKey = (mine ? mine.stints : cur).map(s => s.c).join("");
  const PR = past.find(r => r.circuitId === pc), ptrial = trial[pc] || defaultStints(PR.laps);
  return (
    <div data-strat="" className="scrollcol" style={{ height: "100%" }}>
      <GameHeader title="TIRE STRATEGY PREDICTOR" sub="Disegna la strategia della gara: mescole e giri delle soste. Si chiude 15 minuti prima del via." onBack={onBack} />
      <div style={{ display: "flex", gap: 6, margin: "0 16px 12px" }}>
        <WkChip attrs={{ "data-strat-tab": "next" }} on={tab === "next"} onClick={() => setTab("next")}>Prossima gara</WkChip>
        <WkChip attrs={{ "data-strat-tab": "past" }} on={tab === "past"} onClick={() => setTab("past")}>Allenati sulle gare vere</WkChip>
      </div>
      {tab === "next" && (target ? (
        <>
          <div style={WK_CARD}>
            <div style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 16, color: C.text }}>{target.name}</div>
            <div style={{ fontFamily: F_BODY, fontSize: 12, color: C.muted, marginBottom: 6 }}>{laps} giri · via {fmtRome(start)} (ora italiana)</div>
            {locked ? <p data-strat-locked="" style={{ margin: "0 0 8px", padding: "8px 10px", borderRadius: 10, background: "rgba(255,255,255,.05)", fontFamily: F_BODY, fontWeight: 600, fontSize: 12.5, color: C.text }}><Icon name="lock" size={12} color={C.gold} /> Previsione chiusa: {now >= start ? "la gara è partita" : "manca meno di un quarto d'ora al via"}.</p>
              : <p style={{ margin: "0 0 8px", fontFamily: F_BODY, fontSize: 12.5, color: C.text }}>Si chiude {fmtRome(lockAt)} (ora italiana), 15 minuti prima del via.</p>}
            {(!locked || mine) && <StrategyBuilder laps={laps} value={cur} onChange={setDraft} locked={locked} />}
            {!locked && <button className="press" data-strat-publish="" onClick={() => { onSave(target.id, cur); setDraft(null); }} style={{ width: "100%", marginTop: 12, padding: "12px 0", borderRadius: 12, background: C.accent, fontFamily: F_HEAD, fontWeight: 800, fontSize: 13, color: "#fff" }}>{mine ? "AGGIORNA LA STRATEGIA" : "PUBBLICA LA STRATEGIA"}</button>}
            {mine && <p data-strat-saved="" style={{ margin: "10px 0 0", fontFamily: F_BODY, fontSize: 12, color: C.muted, lineHeight: 1.4 }}><b style={{ color: "#3ED66B" }}>Pubblicata:</b> {stintsText(mine.stints, laps)}.</p>}
            {locked && !mine && <p style={{ margin: 0, fontFamily: F_BODY, fontSize: 12, color: C.dim }}>Non hai pubblicato una strategia per questa gara.</p>}
            {locked && mine && (realNext ? <StrategyResult R={realNext} pred={mine.stints} races={races} /> : <p style={{ margin: "8px 0 0", fontFamily: F_BODY, fontSize: 12, color: C.muted }}>Il punteggio arriva con i dati veri della gara (di solito poche ore dopo la bandiera a scacchi).</p>)}
          </div>
          <div data-strat-community="" style={WK_CARD}>
            <WkLabel>LE STRATEGIE DELLA COMMUNITY B&T</WkLabel>
            {comm.map(x => (
              <div key={x.key} style={{ padding: "6px 0", borderTop: `1px solid ${C.divider}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: F_BODY, fontSize: 12, color: C.text }}>{x.stints.map((s, i) => <CompDot key={i} c={s.c} size={9} />)}<span style={{ flex: 1 }}>{x.label}{x.key === myKey && mine ? <span style={{ color: C.gold, fontWeight: 700 }}> · la tua</span> : null}</span><b data-pct={x.pct} style={{ fontFamily: F_HEAD, fontSize: 13 }}>{x.pct}%</b></div>
                <div style={{ height: 6, marginTop: 4, borderRadius: 3, background: "rgba(255,255,255,.06)", overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: x.pct + "%", background: C.gold, borderRadius: 3 }} /></div>
              </div>
            ))}
            <p style={{ margin: "6px 0 0", fontFamily: F_BODY, fontSize: 10.5, color: C.dim }}>Percentuali degli altri tifosi: demo. Nell'app vera si aggiornano in diretta con le strategie pubblicate.</p>
          </div>
        </>
      ) : <p style={{ margin: "0 18px", fontFamily: F_BODY, fontSize: 12.5, color: C.muted }}>La stagione è finita: allenati sulle gare vere.</p>)}
      {tab === "past" && (
        <div style={WK_CARD}>
          <label htmlFor="stratRace" style={{ display: "block", fontFamily: F_BODY, fontWeight: 700, fontSize: 10.5, letterSpacing: 1, color: C.gold, marginBottom: 6 }}>GARA VERA 2026</label>
          <select id="stratRace" value={pc} onChange={e => setPc(e.target.value)} style={{ width: "100%", padding: "10px 12px", marginBottom: 8, borderRadius: 12, background: C.bg, border: `1px solid ${C.border}`, color: C.text, fontFamily: F_BODY, fontSize: 13 }}>{past.map(r => <option key={r.circuitId} value={r.circuitId}>{raceNameOfCid(races, r.circuitId)} · {r.laps} giri</option>)}</select>
          <p style={{ margin: "0 0 4px", fontFamily: F_BODY, fontSize: 12, color: C.muted, lineHeight: 1.4 }}>Fai la tua strategia senza guardare il risultato, poi scopri quanti punti avresti fatto.</p>
          <StrategyBuilder key={pc} laps={PR.laps} value={ptrial} onChange={v => { setTrial(x => ({ ...x, [pc]: v })); setShown(x => ({ ...x, [pc]: false })); }} locked={false} />
          {!shown[pc] ? <button className="press" data-strat-reveal="" onClick={() => setShown(x => ({ ...x, [pc]: true }))} style={{ width: "100%", marginTop: 12, padding: "12px 0", borderRadius: 12, background: C.accent, fontFamily: F_HEAD, fontWeight: 800, fontSize: 13, color: "#fff" }}>SCOPRI COM'È ANDATA</button>
            : <StrategyResult R={PR} pred={ptrial} races={races} />}
        </div>
      )}
      <WkNote>Strategie vere: stint e mescole giro per giro delle gare 2026 (TracingInsights, dati FastF1 dal live timing; tempi e posizioni ufficiali Ergast/Jolpica). Il cambio gomme con la bandiera rossa conta come stint.</WkNote>
    </div>
  );
}

/* DEGRADO GOMME: per ogni stint quanto perde a giro (corretto per la benzina) e se c'è un crollo. Gare vere 2026 e,
   durante la diretta (simulata), anche la gara in corso. */
const degLine = s => { const n = s.to - s.from + 1; return `${surnameOf(s.code)} (${compUi(s.c)[1]} · ${n} giri): ${s.slope > 0.005 ? `degrado di +${fmtDec(s.slope)} s al giro` : "nessun degrado"}`; };
const raceFromLive = live => { const st = live.sim.state(); return { circuitId: null, laps: live.sim.totalLaps, lap: st.lap, ...BtWk.fromSim({ totalLaps: live.sim.totalLaps, cars: st.cars.map(c => ({ code: c.code, team: (driverById(c.id) || {}).teamId || null, pos: c.dnf ? null : c.pos, laps: live.sim.laps(c.id) })) }) }; };
function DegChart({ s }) {
  const W = 340, H = 170, L = 40, R = 10, T = 10, B = 26, P = s.pts;
  const ax = P.map(p => p.age), ay = P.map(p => p.tc);
  const x0 = Math.min(...ax), x1 = Math.max(...ax, x0 + 1), y0 = Math.min(...ay) - 0.15, y1 = Math.max(...ay) + 0.15;
  const X = v => L + (v - x0) / (x1 - x0) * (W - L - R), Y = v => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
  const fitTo = s.cliff ? s.cliff.age - 1 : x1;
  const yt = []; const step = (y1 - y0) > 2 ? 1 : 0.5; for (let v = Math.ceil(y0 / step) * step; v <= y1; v += step) yt.push(v);
  return (
    <svg data-deg-chart="" viewBox={`0 0 ${W} ${H}`} style={{ display: "block", width: "100%" }} role="img" aria-label={`Tempi corretti per la benzina di ${s.code} sulle ${compUi(s.c)[1]}, con la retta del degrado`}>
      {yt.map(v => <g key={v}><line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="rgba(255,255,255,.06)" /><text x={L - 4} y={Y(v) + 3} textAnchor="end" fill={C.dim} fontFamily={F_BODY} fontSize="8.5">{LiveSim.fmtLap(v).slice(0, -2)}</text></g>)}
      <line x1={X(x0)} y1={Y(s.base + s.slope * x0)} x2={X(fitTo)} y2={Y(s.base + s.slope * fitTo)} stroke={C.gold} strokeWidth="2" />
      {P.map(p => { const c = s.cliff && p.lap >= s.cliff.lap; return <circle key={p.lap} cx={X(p.age).toFixed(1)} cy={Y(p.tc).toFixed(1)} r="3.6" fill={c ? "#FF5A5F" : compUi(s.c)[0]} stroke={C.card} strokeWidth="1.5" />; })}
      <text x={(L + W - R) / 2} y={H - 4} textAnchor="middle" fill={C.dim} fontFamily={F_BODY} fontSize="9">Giri delle gomme →</text>
    </svg>
  );
}
function TyreDegTool({ races, live, onBack }) {
  const RS = BtWeekend.races.slice().sort((a, b) => b.round - a.round), liveRace = !!(live && live.type === "RACE");
  const [src0, setSrc] = useState(liveRace ? "live" : "real");
  const src = src0 === "live" && liveRace ? "live" : "real";
  const [cid, setCid] = useState(RS[0].circuitId), [comp, setComp] = useState("all"), [sel, setSel] = useState(null), [, setTick] = useState(0);
  const R = src === "live" ? raceFromLive(live) : RS.find(r => r.circuitId === cid);
  const list = BtWk.raceDeg(R, comp === "all" ? {} : { compound: comp }).sort((a, b) => (b.cliff ? 1 : 0) - (a.cliff ? 1 : 0) || b.slope - a.slope);
  const cur = list.find(s => s.code + ":" + s.si === sel) || null;
  const comps = [...new Set(Object.values(R.drivers).flatMap(D => D.st.map(s => s[0])))].filter(c => c !== "?");
  return (
    <div data-deg="" className="scrollcol" style={{ height: "100%" }}>
      <GameHeader title="DEGRADO GOMME" sub="Per ogni stint quanto perde la gomma a ogni giro e se arriva il crollo: il tracker del calo di prestazione." onBack={onBack} />
      <div style={WK_CARD}>
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <WkChip attrs={{ "data-deg-src": "real" }} on={src === "real"} onClick={() => { setSrc("real"); setSel(null); }}>Gare vere 2026</WkChip>
          {liveRace && <WkChip attrs={{ "data-deg-src": "live" }} on={src === "live"} onClick={() => { setSrc("live"); setSel(null); }}>Diretta (simulata)</WkChip>}
        </div>
        {src === "real" ? <select id="degRace" value={cid} onChange={e => { setCid(e.target.value); setSel(null); }} style={{ width: "100%", padding: "10px 12px", marginBottom: 10, borderRadius: 12, background: C.bg, border: `1px solid ${C.border}`, color: C.text, fontFamily: F_BODY, fontSize: 13 }}>{RS.map(r => <option key={r.circuitId} value={r.circuitId}>{raceNameOfCid(races, r.circuitId)} · {r.laps} giri</option>)}</select>
          : <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontFamily: F_BODY, fontSize: 12.5, color: C.text }}><span style={{ flex: 1 }}>Diretta (simulata): giro {R.lap} di {R.laps}</span><button className="press" data-deg-refresh="" onClick={() => setTick(n => n + 1)} style={{ padding: "6px 10px", borderRadius: 9, background: "rgba(255,255,255,.07)", border: `1px solid ${C.border}`, fontFamily: F_HEAD, fontWeight: 800, fontSize: 11.5, color: C.text }}>Aggiorna</button></div>}
        <div className="scrollrow" style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
          {["all", ...comps].map(c => <WkChip key={c} attrs={{ "data-deg-comp": c }} on={comp === c} onClick={() => { setComp(c); setSel(null); }}>{c === "all" ? "Tutte" : <><CompDot c={c} />{compUi(c)[1]}</>}</WkChip>)}
        </div>
      </div>
      {cur && (
        <div style={WK_CARD}>
          <div style={{ fontFamily: F_HEAD, fontWeight: 900, fontSize: 13.5, color: C.text, marginBottom: 2 }}>{ghostInfo(cur.code).name} · {compUi(cur.c)[1]} dal giro {cur.from} al {cur.to}</div>
          <div style={{ fontFamily: F_BODY, fontSize: 11.5, color: C.muted, marginBottom: 4 }}>Tempi corretti per la benzina (puntini) e retta del degrado (oro){cur.cliff ? "; in rosso i giri del crollo" : ""}.</div>
          <DegChart s={cur} />
        </div>
      )}
      <div style={WK_CARD}>
        <WkLabel>{list.length} STINT · {src === "live" ? "DIRETTA (SIMULATA)" : raceNameOfCid(races, cid).toUpperCase()}</WkLabel>
        {list.map(s => { const on = cur && cur === s; return (
          <button key={s.code + s.si} className="press" data-deg-row={s.code + ":" + s.si} data-cliff={s.cliff ? "1" : "0"} onClick={() => setSel(on ? null : s.code + ":" + s.si)} style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 6px", borderRadius: 0, background: on ? "rgba(231,179,76,.1)" : "transparent", border: "none", borderTop: `1px solid ${C.divider}` }}>
            <span style={{ display: "flex", alignItems: "center", gap: 7 }}><CompDot c={s.c} /><span style={{ flex: 1, fontFamily: F_BODY, fontSize: 12.5, color: C.text, lineHeight: 1.35 }}>{degLine(s)}</span></span>
            {s.slope < -0.005 && <span style={{ display: "block", marginLeft: 17, fontFamily: F_BODY, fontSize: 11, color: C.dim }}>il passo migliora di {fmtDec(s.slope)} s al giro (benzina che cala, pista più gommata)</span>}
            {s.cliff && <span style={{ display: "inline-block", margin: "4px 0 0 17px", padding: "2px 7px", borderRadius: 6, background: "rgba(255,90,95,.14)", border: "1px solid rgba(255,90,95,.5)", fontFamily: F_HEAD, fontWeight: 900, fontSize: 11, color: "#FF5A5F" }}>Crollo rilevato al giro {s.cliff.lap}: +{fmtDec(s.cliff.loss, 1)} s al giro</span>}
          </button>
        ); })}
        {!list.length && <p style={{ margin: 0, fontFamily: F_BODY, fontSize: 12, color: C.dim }}>Ancora pochi giri buoni per calcolare il degrado.</p>}
      </div>
      <WkNote>Tempi corretti per la benzina che si consuma (stima B&T: {String(BtWk.FUEL).replace(".", ",")} s a giro). Non contano i primi 3 giri, l'ultimo, i giri ai box, con Safety Car, VSC o bandiere. Crollo: almeno 3 giri di fila più lenti di oltre 0,4 s. {src === "live" ? "Diretta: gara simulata dell'anteprima." : "Dati veri: TracingInsights (github.com/TracingInsights/2026), FastF1 e tempi ufficiali Ergast/Jolpica."}</WkNote>
    </div>
  );
}

/* COMPAGNI A CONFRONTO: indice Over-Driving (quanto estrae un pilota dalla stessa macchina del compagno) e testa a testa
   in qualifica, passo gara e al traguardo, gara per gara del 2026. */
function TeammatesTool({ races, onBack }) {
  const [team, setTeam] = useState("ferrari");
  const s = BtWk.teammates(BtWeekend, team), [A, B] = s.pair, tm = teamById(team);
  const lead = (s.index[A] || 0) >= (s.index[B] || 0) ? A : B, other = lead === A ? B : A;
  const evs = s.events.filter(e => e.quali);
  const side = (code, k) => <div style={{ flex: 1, minWidth: 0, textAlign: k ? "right" : "left" }}>
    <div style={{ display: "flex", justifyContent: k ? "flex-end" : "flex-start" }}><Headshot driver={driverOfCode(code)} size={46} /></div>
    <div style={{ marginTop: 4, fontFamily: F_HEAD, fontWeight: 900, fontSize: 14, color: C.text }}>{ghostInfo(code).name}</div>
    <div data-mate-index={code} style={{ fontFamily: F_HEAD, fontWeight: 900, fontSize: 22, color: code === lead ? C.gold : C.muted }}>{fmtDec(s.index[code] || 100)}%</div>
  </div>;
  const h2hRow = (label, [a, b]) => <div style={{ display: "grid", gridTemplateColumns: "34px 1fr 34px", alignItems: "center", gap: 6, padding: "5px 0", borderTop: `1px solid ${C.divider}` }}><b style={{ fontFamily: F_HEAD, fontSize: 15, color: a > b ? C.gold : C.text }}>{a}</b><span style={{ textAlign: "center", fontFamily: F_BODY, fontSize: 12, color: C.muted }}>{label}</span><b style={{ textAlign: "right", fontFamily: F_HEAD, fontSize: 15, color: b > a ? C.gold : C.text }}>{b}</b></div>;
  return (
    <div data-mates="" className="scrollcol" style={{ height: "100%" }}>
      <GameHeader title="COMPAGNI A CONFRONTO" sub="Stessa macchina, chi va più forte? L'indice Over-Driving dalle qualifiche e i testa a testa di tutto il 2026." onBack={onBack} />
      <div className="scrollrow" style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", padding: "0 16px", marginBottom: 12 }}>
        {TEAMS.map(t => <WkChip key={t.id} attrs={{ "data-mate-team": t.id }} on={t.id === team} color={t.color} onClick={() => setTeam(t.id)}><span style={{ width: 8, height: 8, borderRadius: "50%", background: t.color, boxShadow: "0 0 0 1.5px rgba(0,0,0,.4)" }} />{t.name}</WkChip>)}
      </div>
      <div style={WK_CARD}>
        <div style={{ display: "flex", gap: 10 }}>{side(A, 0)}{side(B, 1)}</div>
        <p data-mate-headline="" style={{ margin: "8px 0 0", fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 14, color: C.text, lineHeight: 1.35 }}>{surnameOf(lead)} estrae il {fmtDec(s.index[lead] || 100)}% dal telaio rispetto a {surnameOf(other)}</p>
        <p style={{ margin: "4px 0 0", fontFamily: F_BODY, fontSize: 11, color: C.dim, lineHeight: 1.4 }}>Indice Over-Driving: tempo del compagno diviso il proprio tempo, nell'ultima fase di qualifica fatta da tutti e due (mediana del 2026). Sopra 100% = più veloce con la stessa {tm ? tm.name : "macchina"}.</p>
      </div>
      <div data-mate-h2h="" style={WK_CARD}>
        <WkLabel>TESTA A TESTA 2026</WkLabel>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: F_HEAD, fontWeight: 800, fontSize: 11.5, color: C.muted, marginBottom: 2 }}><span>{A}</span><span>{B}</span></div>
        {h2hRow("Qualifiche", s.h2h.quali)}{h2hRow("Passo gara", s.h2h.race)}{h2hRow("Al traguardo", s.h2h.finish)}
      </div>
      <div style={WK_CARD}>
        <WkLabel>QUALIFICA PER QUALIFICA · DISTACCO TRA I DUE</WkLabel>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: F_HEAD, fontWeight: 800, fontSize: 11, marginBottom: 4 }}><span style={{ color: C.gold }}>← più veloce {A}</span><span style={{ color: tm ? tm.color : C.text }}>più veloce {B} →</span></div>
        {evs.map(e => { const g = e.quali.pct - 100, w = Math.min(50, Math.abs(g) / 1.5 * 50); return (
          <div key={e.round} data-mate-event={e.circuitId} style={{ padding: "4px 0", borderTop: `1px solid ${C.divider}` }}>
            <div style={{ display: "grid", gridTemplateColumns: "74px 1fr 68px", alignItems: "center", gap: 6 }}>
              <span style={{ fontFamily: F_BODY, fontSize: 11.5, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{circuitShort(races, e.circuitId)}</span>
              <span style={{ position: "relative", height: 10 }}><span style={{ position: "absolute", left: "50%", top: -2, bottom: -2, width: 1, background: "rgba(255,255,255,.3)" }} /><span style={{ position: "absolute", top: 0, bottom: 0, borderRadius: 3, background: g >= 0 ? C.gold : (tm ? tm.color : C.text), left: g >= 0 ? `${50 - w}%` : "50%", width: `${w}%` }} /></span>
              <b style={{ textAlign: "right", fontFamily: F_HEAD, fontSize: 11.5, color: C.text, whiteSpace: "nowrap" }}>{Math.abs(g) < 0.005 ? "pari" : `${g >= 0 ? A : B} ${fmtDec(g)}%`}</b>
            </div>
            <div style={{ fontFamily: F_BODY, fontSize: 10.5, color: C.dim, marginTop: 1 }}>{e.quali.seg}: {fmtLapMs(e.quali.a)} contro {fmtLapMs(e.quali.b)}{e.race && e.race.posA && e.race.posB ? ` · gara: P${e.race.posA} e P${e.race.posB}` : e.race ? " · gara: un ritiro" : ""}</div>
          </div>
        ); })}
      </div>
      <WkNote>Dati veri: tutte le qualifiche e le gare 2026 (TracingInsights su GitHub, dati FastF1 dal live timing; tempi e posizioni di gara ufficiali Ergast/Jolpica). Passo gara: mediana dei giri puliti, corretti per la benzina.</WkNote>
    </div>
  );
}

/* RILEVATORE DI BLUFF: radio "le gomme sono finite" contro i tempi dei giri dopo, confrontati col resto del gruppo.
   Nell'anteprima le radio sono simulate (OpenF1 dà gli audio, non il testo): demo su una gara simulata o sulla diretta. */
const BLUFF_DEMO = {};
function bluffDemo(races) {
  const r = races.find(x => x.status === "IN ARRIVO" && trackOf(x.circuitId)) || races.find(x => trackOf(x.circuitId));
  if (BLUFF_DEMO[r.id]) return BLUFF_DEMO[r.id];
  const sim = LiveSim.createSession({ track: trackOf(r.circuitId), drivers: LIVE_DRIVERS, type: "RACE", seed: r.round * 97 + 4, script: true });
  for (let i = 0; i < 40000 && !sim.state().finished; i++) sim.advance(2);
  const st = sim.state();
  return (BLUFF_DEMO[r.id] = { race: r, R: { laps: st.totalLaps, lap: st.totalLaps, ...BtWk.fromSim({ totalLaps: st.totalLaps, cars: st.cars.map(c => ({ code: c.code, team: (driverById(c.id) || {}).teamId || null, pos: c.dnf ? null : c.pos, laps: sim.laps(c.id) })) }) } });
}
const BLUFF_UI = { bluff: ["BLUFF PROBABILE", C.gold], vero: ["RADIO VERA", "#FF5A5F"], dubbio: ["DA CAPIRE", C.muted] };
function BluffTool({ races, live, onBack }) {
  const liveRace = !!(live && live.type === "RACE"), [, setTick] = useState(0);
  const demo = liveRace ? null : bluffDemo(races);
  const R = liveRace ? raceFromLive(live) : demo.R;
  const codes = Object.keys(R.drivers);
  const items = BtWk.demoClaims(R).filter(c => c.lap + 3 < R.lap || R.lap >= R.laps).map(c => ({ ...c, v: BtWk.bluffVerdict(BtWk.lapsOf(R, c.code), c.lap, codes.filter(k => k !== c.code).map(k => BtWk.lapsOf(R, k))) })).sort((a, b) => liveRace ? b.lap - a.lap : a.lap - b.lap);   // diretta: le più recenti in alto; demo: in ordine di gara
  const n = k => items.filter(x => x.v.kind === k).length;
  const why = v => v.pitLap ? `È rientrato ai box al giro ${v.pitLap}: le gomme erano davvero finite.`
    : v.delta == null ? "Troppi giri lenti (box o bandiere) per giudicare."
    : `Nei 3 giri dopo ${v.rel > 0 ? `ha perso ${fmtDec(v.rel)} s al giro più del gruppo` : `è andato come il gruppo (${sgn(v.rel)} s)`}: ${LiveSim.fmtLap(v.before)} → ${LiveSim.fmtLap(v.after)}.${v.kind === "bluff" ? " Non sembra in crisi." : v.kind === "vero" ? " Calo vero." : " Difficile dirlo."}`;
  return (
    <div data-bluff="" className="scrollcol" style={{ height: "100%" }}>
      <GameHeader title="RILEVATORE DI BLUFF" sub="Quando un pilota dice alla radio che le gomme sono finite guardiamo i tempi: è vero o vuole ingannare gli avversari?" onBack={onBack} />
      <div style={WK_CARD}>
        <div style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 14.5, color: C.text }}>{liveRace ? `Diretta (simulata) · giro ${R.lap} di ${R.laps}` : `Demo: gara simulata · ${demo.race.name}`}</div>
        <p style={{ margin: "4px 0 8px", padding: "8px 10px", borderRadius: 10, background: "rgba(242,194,48,.1)", border: "1px solid rgba(242,194,48,.35)", fontFamily: F_BODY, fontSize: 11.5, color: C.text, lineHeight: 1.45 }}>Radio simulate: nell'anteprima le frasi le inventa il simulatore e i tempi sono quelli della gara simulata. Nell'app vera le radio le scrive l'admin mentre ascolta la diretta (OpenF1 dà gli audio, non il testo) e i tempi arrivano dal live timing.</p>
        <div style={{ display: "flex", gap: 8 }}>{[["bluff", "Bluff scoperti"], ["vero", "Radio vere"], ["dubbio", "Da capire"]].map(([k, l]) => <div key={k} style={{ flex: 1, padding: "8px 6px", borderRadius: 11, background: "rgba(255,255,255,.04)", textAlign: "center" }}><b style={{ display: "block", fontFamily: F_HEAD, fontSize: 20, color: BLUFF_UI[k][1] }}>{n(k)}</b><span style={{ fontFamily: F_BODY, fontSize: 10.5, color: C.muted }}>{l}</span></div>)}</div>
        {liveRace && <button className="press" onClick={() => setTick(x => x + 1)} style={{ marginTop: 8, padding: "6px 10px", borderRadius: 9, background: "rgba(255,255,255,.07)", border: `1px solid ${C.border}`, fontFamily: F_HEAD, fontWeight: 800, fontSize: 11.5, color: C.text }}>Aggiorna</button>}
      </div>
      <div style={WK_CARD}>
        {items.map((x, i) => { const u = BLUFF_UI[x.v.kind], I = ghostInfo(x.code); return (
          <div key={x.code + x.lap} data-bluff-item={x.v.kind} style={{ padding: "9px 0", borderTop: i ? `1px solid ${C.divider}` : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 3, height: 26, borderRadius: 2, background: I.color }} />
              <span style={{ flex: 1, minWidth: 0 }}><b style={{ display: "block", fontFamily: F_HEAD, fontWeight: 800, fontSize: 13, color: C.text }}>{I.name}</b><span style={{ fontFamily: F_BODY, fontSize: 11, color: C.dim }}>Giro {x.lap} · radio simulata</span></span>
              <span style={{ padding: "3px 8px", borderRadius: 7, background: "rgba(255,255,255,.05)", border: `1px solid ${u[1]}`, fontFamily: F_HEAD, fontWeight: 900, fontSize: 10.5, color: u[1], whiteSpace: "nowrap" }}>{u[0]}</span>
            </div>
            <p style={{ margin: "5px 0 2px 11px", fontFamily: F_BODY, fontStyle: "italic", fontSize: 13, color: C.text }}>“{x.text}”</p>
            <p style={{ margin: "0 0 0 11px", fontFamily: F_BODY, fontSize: 11.5, color: C.muted, lineHeight: 1.4 }}>{why(x.v)}</p>
          </div>
        ); })}
        {!items.length && <p style={{ margin: 0, fontFamily: F_BODY, fontSize: 12, color: C.dim }}>Ancora nessuna radio da giudicare: servono almeno 3 giri dopo ogni radio.</p>}
      </div>
      <WkNote>Come giudica: confronta i 3 giri dopo la radio con i 3 prima, al netto di quanto è cambiato il passo di tutto il gruppo (benzina, pista, bandiere). Radio vera: rientra ai box entro 3 giri o perde oltre mezzo secondo al giro; bluff: va come prima (meno di 0,25 s).</WkNote>
    </div>
  );
}

function GarageScreen({ races, pitBest, onPitResult, sillyPreds, onPredict, sillyOfficial, live, stratPreds = {}, onStrat }) {
  const [game, setGame] = useState(null);
  const back = () => setGame(null);
  if (game === "pitstop") return <PitStopGame best={pitBest} onResult={onPitResult} onBack={back} />;
  if (game === "silly") return <SillySeason preds={sillyPreds} onPredict={onPredict} official={sillyOfficial} onBack={back} />;
  if (game === "aero") return <AeroCalc races={races} onBack={back} />;
  if (game === "ghost") return <GhostLap onBack={back} />;
  if (game === "guide") return <GuideTool races={races} onBack={back} />;
  if (game === "clash") return <ClashTool races={races} onBack={back} />;
  if (game === "setup") return <SetupScanner races={races} onBack={back} />;
  if (game === "strategy") return <StrategyPredictor races={races} preds={stratPreds} onSave={onStrat} onBack={back} />;
  if (game === "deg") return <TyreDegTool races={races} live={live} onBack={back} />;
  if (game === "mates") return <TeammatesTool races={races} onBack={back} />;
  if (game === "bluff") return <BluffTool races={races} live={live} onBack={back} />;
  const art = { ghost: <svg viewBox="0 0 40 40" width="38" height="38" aria-hidden="true"><path d="M4 30 C12 8, 20 34, 36 10" stroke="#E8121D" strokeWidth="3" fill="none" strokeLinecap="round" /><path d="M4 33 C13 14, 21 36, 36 16" stroke="#27D8C8" strokeWidth="2.4" fill="none" strokeDasharray="3 3" strokeLinecap="round" /></svg>, pitstop: <svg viewBox="0 0 40 40" width="38" height="38" aria-hidden="true"><circle cx="20" cy="20" r="15" fill="#1A1A1E" stroke="#E8121D" strokeWidth="5" /><circle cx="20" cy="20" r="5" fill="#9C9CA1" /></svg>,
    silly: <svg viewBox="0 0 40 40" width="38" height="38" aria-hidden="true"><rect x="9" y="5" width="22" height="30" rx="3" fill="#F4F2EF" /><path d="M13 13h14M13 18h14M13 23h9" stroke="#86858C" strokeWidth="2" strokeLinecap="round" /><path d="M21 31l3-6 3 6" stroke="#E8121D" strokeWidth="2.5" fill="none" strokeLinecap="round" /></svg>,
    aero: <svg viewBox="0 0 40 40" width="38" height="38" aria-hidden="true"><path d="M5 14h30l-3 6H8z" fill="#E8121D" /><path d="M12 20v12M28 20v12" stroke="#F4F2EF" strokeWidth="3" strokeLinecap="round" /><path d="M5 9c8 3 22 3 30 0" stroke="#E7B34C" strokeWidth="2" fill="none" strokeDasharray="3 3" /></svg>,
    guide: <svg viewBox="0 0 40 40" width="38" height="38" aria-hidden="true"><path d="M8 28C5 19 11 9 20 10s13-3 13 6-9 6-7 12-12 6-18 0Z" stroke="#F4F2EF" strokeWidth="2.6" fill="none" strokeLinejoin="round" /><circle cx="20" cy="10" r="3.6" fill="#E8121D" /><circle cx="26" cy="28" r="3.6" fill="#E7B34C" /><circle cx="8" cy="28" r="2.6" fill="#F4F2EF" /></svg>,
    clash: <svg viewBox="0 0 40 40" width="38" height="38" aria-hidden="true"><rect x="5" y="9" width="13" height="5" rx="2.5" fill="#E8121D" /><rect x="22" y="9" width="9" height="5" rx="2.5" fill="#E7B34C" /><rect x="8" y="18" width="10" height="5" rx="2.5" fill="#E8121D" /><rect x="22" y="18" width="13" height="5" rx="2.5" fill="#E7B34C" /><rect x="3" y="27" width="15" height="5" rx="2.5" fill="#E8121D" /><rect x="22" y="27" width="6" height="5" rx="2.5" fill="#E7B34C" /><path d="M20 6v29" stroke="#F4F2EF" strokeWidth="1.5" /></svg>,
    setup: <svg viewBox="0 0 40 40" width="38" height="38" aria-hidden="true"><circle cx="20" cy="20" r="14" fill="none" stroke="#F4F2EF" strokeWidth="2" opacity=".45" /><circle cx="20" cy="20" r="8" fill="none" stroke="#F4F2EF" strokeWidth="2" opacity=".8" /><path d="M20 20 31 11" stroke="#E8121D" strokeWidth="3" strokeLinecap="round" /><circle cx="27" cy="25" r="2.6" fill="#E7B34C" /><circle cx="13" cy="15" r="2.2" fill="#E8121D" /></svg>,
    strategy: <svg viewBox="0 0 40 40" width="38" height="38" aria-hidden="true"><rect x="3" y="15" width="12" height="10" rx="3" fill="#E8121D" /><rect x="17" y="15" width="10" height="10" rx="3" fill="#F2C230" /><rect x="29" y="15" width="8" height="10" rx="3" fill="#F4F2EF" /><path d="M16 9v22M28 9v22" stroke="#F4F2EF" strokeWidth="1.6" strokeDasharray="2 2" /></svg>,
    deg: <svg viewBox="0 0 40 40" width="38" height="38" aria-hidden="true"><circle cx="14" cy="23" r="10" fill="#1A1A1E" stroke="#F2C230" strokeWidth="4" /><circle cx="14" cy="23" r="3" fill="#9C9CA1" /><path d="M23 9l5 7 4-3 5 9" stroke="#E8121D" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    mates: <svg viewBox="0 0 40 40" width="38" height="38" aria-hidden="true"><circle cx="13" cy="15" r="7" fill="#E8121D" /><circle cx="27" cy="15" r="7" fill="#E7B34C" /><path d="M4 34c1-6 4-9 9-9s8 3 9 9M18 34c1-6 4-9 9-9s8 3 9 9" stroke="#F4F2EF" strokeWidth="2.4" fill="none" strokeLinecap="round" /></svg>,
    bluff: <svg viewBox="0 0 40 40" width="38" height="38" aria-hidden="true"><path d="M6 8h28a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H17l-7 6v-6H6a3 3 0 0 1-3-3V11a3 3 0 0 1 3-3Z" fill="#F4F2EF" /><path d="M16.5 15a3.5 3.5 0 1 1 5 3.2c-1 .5-1.5 1.1-1.5 2.3" stroke="#E8121D" strokeWidth="2.6" fill="none" strokeLinecap="round" /><circle cx="20" cy="24.5" r="1.6" fill="#E8121D" /></svg> };
  const card = (id, title, sub, tag) => (
    <button key={id} className="press" data-game={id} onClick={() => setGame(id)} style={{ display: "flex", alignItems: "center", gap: 12, width: "calc(100% - 32px)", margin: "0 16px 12px", padding: 14, borderRadius: 18, background: C.card, border: `1px solid ${C.border}`, textAlign: "left" }}>
      <span style={{ width: 62, height: 62, borderRadius: 16, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, rgba(232,18,29,.3), rgba(231,179,76,.16))" }}>{art[id]}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 16, color: C.text }}>{title}</span>
        <span style={{ display: "block", marginTop: 3, fontFamily: F_BODY, fontSize: 12, color: C.muted, lineHeight: 1.35 }}>{sub}</span>
        {tag && <span style={{ display: "inline-block", marginTop: 5, padding: "2px 7px", borderRadius: 6, background: "rgba(231,179,76,.16)", fontFamily: F_BODY, fontWeight: 700, fontSize: 10.5, color: C.gold }}>{tag}</span>}
      </span>
      <Icon name="chevron" size={16} color={C.dim} />
    </button>
  );
  const open = Object.keys(sillyPreds || {}).length;
  const sNow = nowMs(), sRace = races.find(r => raceStartMs(r) + 3 * 3600e3 > sNow), sLock = sRace ? raceStartMs(sRace) - 15 * 60e3 : 0;
  const stratTag = !sRace ? null : stratPreds[sRace.id] ? "Strategia pubblicata" : sNow < sLock ? `Aperta fino a ${fmtRome(sLock)}` : "Chiusa · gara in corso";
  return (
    <div className="scrollcol" style={{ height: "100%" }}>
      <div style={{ padding: "4px 16px 14px" }}>
        <h1 style={{ margin: 0, fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 24, color: C.text }}>GARAGE</h1>
        <p style={{ margin: "4px 0 0", fontFamily: F_BODY, fontSize: 12.5, color: C.muted, lineHeight: 1.4 }}>Giochi e strumenti B&T per sfidare i tuoi riflessi e capire la F1 da vicino.</p>
      </div>
      <div style={{ padding: "0 18px 8px", fontFamily: F_BODY, fontWeight: 700, fontSize: 11, letterSpacing: 1.2, color: C.gold }}>GIOCHI</div>
      {card("pitstop", "Pit Stop Challenge", "Cambia le 4 gomme a tempo di record: obiettivo sotto i 2,0 secondi.", pitBest != null ? `Il tuo record: ${fmtSec(pitBest)} s` : null)}
      {card("silly", "Silly Season Predictor", "Mercato piloti 2027: indovina chi guiderà dove e fai punti quando arriva il comunicato.", open ? `${open} ${open === 1 ? "previsione pubblicata" : "previsioni pubblicate"}` : "6 sedili ancora aperti")}
      {card("aero", "Drag vs Downforce", "Prepara la vettura per la pista del weekend: ala posteriore e altezza da terra.", null)}
      <div style={{ padding: "6px 18px 8px", fontFamily: F_BODY, fontWeight: 700, fontSize: 11, letterSpacing: 1.2, color: C.gold }}>WEEKEND DI GARA</div>
      {card("setup", "Scanner dell'assetto", "Prove libere vere: chi ha scaricato l'ala, chi cerca carico e chi ha già fatto la simulazione di gara.", "Prove libere · dati veri")}
      {card("strategy", "Tire Strategy Predictor", "Disegna mescole e soste della prossima gara: punti contro la strategia del vincitore.", stratTag)}
      {card("deg", "Degrado gomme", "Quanto perde ogni gomma a ogni giro e quando arriva il crollo.", live && live.type === "RACE" ? "In diretta adesso" : "Gare vere 2026")}
      {card("mates", "Compagni a confronto", "Stessa macchina, chi va più forte? L'indice Over-Driving e i testa a testa del 2026.", "Dati veri 2026")}
      {card("bluff", "Rilevatore di bluff", "Radio contro tempi: le gomme sono davvero finite o è un bluff per ingannare gli altri?", "Durante la gara · demo")}
      <div style={{ padding: "6px 18px 8px", fontFamily: F_BODY, fontWeight: 700, fontSize: 11, letterSpacing: 1.2, color: C.gold }}>TRACCIATI</div>
      {card("guide", "Guida 2D dei tracciati", "Tocca le curve: marcia, velocità, punto di staccata, rischio di bloccaggio e il momento storico B&T.", "Dati veri")}
      {card("clash", "Circuit Spec Clash", "Due piste a confronto: Safety Car, sorpassi, frenate, gas a tavoletta e carico aerodinamico.", null)}
      <div style={{ padding: "6px 18px 8px", fontFamily: F_BODY, fontWeight: 700, fontSize: 11, letterSpacing: 1.2, color: C.gold }}>ANALISI CON DATI VERI</div>
      {card("ghost", `Ghost Lap · qualifiche di ${ghostSessions().length ? ghostSessions()[0][1] : "Baku"}`, "Due giri veri a confronto: velocità, frenate e replay 2D di ogni curva.", "Dati veri")}
    </div>
  );
}

// Pannello Admin → MERCATO: comunicati ufficiali dei sedili (danno i punti della Silly Season).
function AdminSillyTab({ official = {}, onOfficial, onToast }) {
  const [seat, setSeat] = useState("russell"), [drv, setDrv] = useState("russell");
  const [date, setDate] = useState(() => new Date(nowMs()).toISOString().slice(0, 10));
  const box = { width: "100%", padding: "10px 12px", marginBottom: 12, borderRadius: 12, background: C.card, border: `1px solid ${C.border}`, color: C.text, fontFamily: F_BODY, fontSize: 13 };
  const lab = { display: "block", fontFamily: F_BODY, fontWeight: 700, fontSize: 11.5, color: C.muted, marginBottom: 5 };
  const list = Object.entries(official);
  return (
    <div style={{ padding: "0 16px 20px" }}>
      <p style={{ margin: "0 0 12px", fontFamily: F_BODY, fontSize: 12, color: C.muted, lineHeight: 1.45 }}>Quando una scuderia pubblica il comunicato ufficiale di un pilota per il 2027, registralo qui: la Silly Season dà i punti a chi aveva indovinato (prima l'aveva detto, più punti).</p>
      <label htmlFor="sillySeat" style={lab}>Sedile</label>
      <select id="sillySeat" value={seat} onChange={e => setSeat(e.target.value)} style={box}>{SILLY_SEATS.map(s => { const d = driverById(s.id) || {}, t = teamById(d.teamId); return <option key={s.id} value={s.id}>{t ? t.name : ""} · sedile di {d.full || s.id}</option>; })}</select>
      <label htmlFor="sillyDriver" style={lab}>Pilota annunciato per il 2027</label>
      <select id="sillyDriver" value={drv} onChange={e => setDrv(e.target.value)} style={box}>{[...SILLY_SEATS.map(s => s.id), "altro"].map(id => <option key={id} value={id}>{sillyName(id)}</option>)}</select>
      <label htmlFor="sillyDate" style={lab}>Data del comunicato</label>
      <input id="sillyDate" type="date" value={date} onChange={e => setDate(e.target.value)} style={box} />
      <button className="press" onClick={() => { const at = Date.parse(date + "T12:00:00Z"); if (isNaN(at)) { onToast("Data non valida"); return; } onOfficial(seat, { driver: drv, at }).then(ok => ok && onToast("Comunicato registrato: punti assegnati")); }} style={{ width: "100%", padding: "12px 0", borderRadius: 12, background: C.accent, fontFamily: F_HEAD, fontWeight: 800, fontSize: 13, color: "#fff" }}>REGISTRA IL COMUNICATO</button>
      {list.length > 0 && <div style={{ marginTop: 16 }}>{list.map(([id, o]) => <div key={id} style={{ padding: "8px 0", borderTop: `1px solid ${C.divider}`, fontFamily: F_BODY, fontSize: 12, color: C.muted }}>Sedile di {sillyName(id)} → <b style={{ color: C.text }}>{sillyName(o.driver)}</b> · {fmtDMY(o.at)}</div>)}</div>}
    </div>
  );
}

/* ── GHOST LAP: due giri veri a confronto ─────────────────────────────── */
// Dati veri (BtRealData): qualifiche del GP dell'Azerbaigian 2026, giri più veloci dei primi 8 (TracingInsights,
// da FastF1). Velocità per distanza, distacco metro per metro, analisi curva per curva (BtGhost.cornerDuel) e
// replay 2D della curva: le due vetture entrano insieme e si muovono ognuna col suo tempo vero.
const ghostInfo = code => { const d = DRIVERS.find(x => driverCode(x) === code); return { code, name: d ? d.full : code, last: d ? d.full.split(" ").slice(-1)[0].toUpperCase() : code, color: d ? d.color : C.dim }; };
const fmtS3 = v => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(3).replace(".", ",");
const fmtMeters = v => Math.round(v).toLocaleString("it-IT");
function GhostReplay({ A, B, IA, IB, duel }) {
  const [tau, setTau] = useState(0), [play, setPlay] = useState(true), [slow, setSlow] = useState(false), [cap, setCap] = useState(null);
  const raf = useRef(0), last = useRef(0);
  const [w0, w1] = [duel.window[0] - 50, duel.window[1] + 30];
  const tA0 = BtGhost.at(A, "t", w0), tB0 = BtGhost.at(B, "t", w0);
  const dur = Math.max(BtGhost.at(A, "t", w1) - tA0, BtGhost.at(B, "t", w1) - tB0);
  useEffect(() => {
    if (!play) return;
    last.current = performance.now();
    const step = now => { const dt = (now - last.current) / 1000; last.current = now; setTau(x => { const n = x + dt * (slow ? 0.25 : 1); return n > dur ? 0 : n; }); raf.current = requestAnimationFrame(step); };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [play, slow, dur]);
  // Inquadratura: i punti di A dentro la finestra della curva.
  const pts = []; for (let i = 0; i < A.d.length; i++) if (A.d[i] >= w0 && A.d[i] <= w1) pts.push([A.x[i], A.y[i]]);
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys), W = 340, H = 210, pad = 18;
  const k = Math.min((W - 2 * pad) / Math.max(1, maxX - minX), (H - 2 * pad) / Math.max(1, maxY - minY));
  const P = (x, y) => [pad + (x - minX) * k + ((W - 2 * pad) - (maxX - minX) * k) / 2, H - pad - (y - minY) * k - ((H - 2 * pad) - (maxY - minY) * k) / 2];
  const path = L => { let s = ""; for (let i = 0; i < L.d.length; i++) if (L.d[i] >= w0 - 60 && L.d[i] <= w1 + 60) { const [x, y] = P(L.x[i], L.y[i]); s += (s ? "L" : "M") + x.toFixed(1) + "," + y.toFixed(1); } return s; };
  const car = (L, t0, I, key) => {
    const p = BtGhost.posAtTime(L, t0 + tau), [x, y] = P(p.x, p.y), trail = [];
    for (let s = Math.max(0, tau - 1); s <= tau; s += 0.05) { const q = BtGhost.posAtTime(L, t0 + s), [qx, qy] = P(q.x, q.y); trail.push(qx.toFixed(1) + "," + qy.toFixed(1)); }
    return { p, el: <g key={key}><polyline points={trail.join(" ")} fill="none" stroke={I.color} strokeWidth="3" strokeLinecap="round" opacity=".55" strokeDasharray={key === "b" && IA.color === IB.color ? "4 3" : undefined} /><circle data-ghost-car={I.code} cx={x.toFixed(1)} cy={y.toFixed(1)} r="6.5" fill={I.color} stroke="#fff" strokeWidth="2" /></g> };
  };
  const ca = car(A, tA0, IA, "a"), cb = car(B, tB0, IB, "b");
  const gapM = ca.p.d - cb.p.d;   // > 0: A davanti
  const freeze = (kind) => {
    const target = kind === "frenata" ? (duel.brake.a != null ? duel.brake.a : duel.d - 100) : kind === "apice" ? duel.vMin.da : (duel.full.a != null ? duel.full.a : duel.d + 120);
    setPlay(false); setTau(Math.max(0, BtGhost.at(A, "t", target) - tA0)); setCap(kind);
  };
  const capText = { frenata: duel.brake.later == null ? "QUI NESSUNO FRENA: CURVA IN PIENO" : duel.brake.later === "pari" ? "STESSO PUNTO DI FRENATA" : `${(duel.brake.later === "A" ? IA : IB).last} FRENA ${duel.brake.diff.toFixed(1).replace(".", ",").replace(",0", "")} m DOPO`,
    apice: duel.vMin.faster === "pari" ? `STESSA VELOCITÀ MINIMA: ${duel.vMin.a} km/h` : `${(duel.vMin.faster === "A" ? IA : IB).last} PASSA ${Math.abs(duel.vMin.a - duel.vMin.b)} km/h PIÙ VELOCE A CENTRO CURVA`,
    uscita: duel.full.first == null ? "NESSUNO TORNA AL 100% DI GAS PRIMA DELLA CURVA DOPO" : duel.full.first === "pari" ? "INSIEME AL 100% DI GAS" : `${(duel.full.first === "A" ? IA : IB).last} TORNA PRIMA AL 100% DI GAS (${Math.round(Math.abs(duel.full.a - duel.full.b))} m prima)` }[cap];
  const btn = (attrs, label, on, onClick) => <button className="press" {...attrs} aria-pressed={on ? "true" : "false"} onClick={onClick} style={{ padding: "7px 10px", borderRadius: 9, background: on ? C.accent : "rgba(255,255,255,.07)", border: `1px solid ${on ? C.accent : C.border}`, fontFamily: F_HEAD, fontWeight: 800, fontSize: 11.5, color: "#fff" }}>{label}</button>;
  return (
    <div data-ghost-stage="" style={{ marginTop: 10, borderRadius: 14, background: "#0B0B0E", border: `1px solid ${C.border}`, overflow: "hidden" }}>
      <div style={{ position: "relative" }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ display: "block", width: "100%" }} role="img" aria-label={`Replay 2D della curva ${duel.n}: ${IA.code} e ${IB.code}`}>
          <path d={path(A)} fill="none" stroke="#2E2E36" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" />
          <path d={path(A)} fill="none" stroke="#3E3E48" strokeWidth="1.2" strokeDasharray="6 6" />
          {cb.el}{ca.el}
        </svg>
        <div style={{ position: "absolute", left: 8, top: 8, display: "flex", flexDirection: "column", gap: 3 }}>
          {[[IA, ca.p], [IB, cb.p]].map(([I, p]) => <span key={I.code} style={{ padding: "2px 7px", borderRadius: 6, background: "rgba(0,0,0,.6)", fontFamily: F_HEAD, fontWeight: 800, fontSize: 11, color: "#fff", borderLeft: `3px solid ${I.color}` }}>{I.code} {Math.round(p.v)} km/h</span>)}
        </div>
        <span style={{ position: "absolute", right: 8, top: 8, padding: "2px 7px", borderRadius: 6, background: "rgba(0,0,0,.6)", fontFamily: F_HEAD, fontWeight: 800, fontSize: 11, color: C.gold }}>{Math.abs(gapM) < 0.5 ? "AFFIANCATI" : `${(gapM > 0 ? IA : IB).code} DAVANTI DI ${Math.abs(gapM).toFixed(1).replace(".", ",")} m`}</span>
        {cap && <div data-ghost-caption="" style={{ position: "absolute", left: 8, right: 8, bottom: 8, padding: "6px 9px", borderRadius: 8, background: "rgba(232,18,29,.92)", fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 13, color: "#fff", textAlign: "center" }}>{capText}</div>}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: 8 }}>
        {btn({ "data-ghost-play": "" }, play ? "Pausa" : "Play", play, () => { setPlay(x => !x); setCap(null); })}
        {btn({ "data-ghost-slow": "" }, "Rallenty", slow, () => setSlow(x => !x))}
        {[["frenata", "Frenata"], ["apice", "Apice"], ["uscita", "Uscita"]].map(([kk, l]) => <React.Fragment key={kk}>{btn({ "data-ghost-freeze": kk }, "⏸ " + l, cap === kk, () => freeze(kk))}</React.Fragment>)}
      </div>
      <p style={{ margin: 0, padding: "0 10px 9px", fontFamily: F_BODY, fontSize: 10.5, color: C.dim, lineHeight: 1.4 }}>Le due vetture entrano nella curva insieme: la distanza tra loro è solo quella guadagnata in questa curva. Posizioni da GPS (circa 4 al secondo, interpolate).</p>
    </div>
  );
}
// Qualifiche con i dati veri, dalla più recente: il Ghost Lap si apre sempre sull'ultima.
const GHOST_SESSIONS = [["sepang2026q", "Sepang"], ["baku2026q", "Baku"]];
const ghostSessions = () => GHOST_SESSIONS.filter(([id]) => typeof BtRealData !== "undefined" && BtRealData && BtRealData[id]);
function GhostLap({ sessionId, onBack }) {
  const list = ghostSessions();
  const [sid, setSid] = useState(sessionId && BtRealData[sessionId] ? sessionId : list[0][0]);
  const S = BtRealData[sid], codes = Object.keys(S.laps);
  const [a0, setA] = useState(codes[0]), [b0, setB] = useState(codes[1]);
  const [cur, setCur] = useState(null), [cn, setCn] = useState(null), [replay, setReplay] = useState(false);
  const a = S.laps[a0] ? a0 : codes[0], b = S.laps[b0] && b0 !== a ? b0 : codes.find(c => c !== a);
  const pickSession = id => { if (id === sid) return; const c = Object.keys(BtRealData[id].laps); setSid(id); setA(c[0]); setB(c[1]); setCn(null); setCur(null); setReplay(false); };
  const A = S.laps[a], B = S.laps[b], IA = ghostInfo(a), IB = ghostInfo(b), same = IA.color === IB.color;
  const L = BtGhost.end(A), W = 360, padL = 30, padR = 8;
  const X = d => padL + d / L * (W - padL - padR);
  const dts = BtGhost.delta(A, B, 15), maxDt = Math.max(0.2, ...dts.map(x => Math.abs(x.dt)));
  const line = (Lp, Y) => { let s = ""; for (let i = 0; i < Lp.d.length; i += 2) s += X(Lp.d[i]).toFixed(1) + "," + Y(Lp.v[i]).toFixed(1) + " "; return s; };
  const YV = v => 10 + (1 - (v - 40) / 310) * 128;
  const YD = v => 40 - v / maxDt * 30;
  const scrub = e => { const r = e.currentTarget.getBoundingClientRect(), fx = (e.clientX - r.left) / r.width * W; setCur(Math.max(0, Math.min(L, (fx - padL) / (W - padL - padR) * L))); };
  const corner = cn != null ? S.corners.find(c => c.n === cn) : null, duel = corner ? BtGhost.cornerDuel(A, B, corner) : null;
  const val = (Lp, k) => cur == null ? null : BtGhost.at(Lp, k, cur);
  const chips = (side, sel, set, other) => (
    <div className="scrollrow" style={{ display: "flex", gap: 5, overflowX: "auto", scrollbarWidth: "none", marginBottom: 6 }}>
      {codes.map(c => { const I = ghostInfo(c), on = c === sel; return <button key={c} className="press" {...{ ["data-ghost-" + side]: c }} aria-pressed={on ? "true" : "false"} disabled={c === other} onClick={() => { set(c); setReplay(false); }} style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: 5, padding: "5px 8px", borderRadius: 9, background: on ? "rgba(232,18,29,.18)" : "rgba(255,255,255,.05)", border: `1px solid ${on ? C.accent : C.border}`, opacity: c === other ? .35 : 1 }}><span style={{ width: 3, height: 12, borderRadius: 2, background: I.color }} /><b style={{ fontFamily: F_HEAD, fontSize: 11.5, color: C.text }}>{c}</b></button>; })}
    </div>
  );
  const capBrake = !duel ? "" : duel.brake.later == null ? "QUI NESSUNO FRENA: CURVA IN PIENO" : duel.brake.later === "pari" ? "STESSO PUNTO DI FRENATA" : `${(duel.brake.later === "A" ? IA : IB).last} FRENA ${duel.brake.diff.toFixed(1).replace(".", ",").replace(",0", "")} m DOPO`;
  const row = (label, va, vb, fmt) => <div style={{ display: "grid", gridTemplateColumns: "1fr 72px 72px", gap: 6, padding: "5px 0", borderTop: `1px solid ${C.divider}`, fontFamily: F_BODY, fontSize: 12, color: C.muted }}><span>{label}</span><b style={{ textAlign: "right", color: C.text, fontFamily: F_HEAD }}>{va == null ? "—" : fmt(va)}</b><b style={{ textAlign: "right", color: C.text, fontFamily: F_HEAD }}>{vb == null ? "—" : fmt(vb)}</b></div>;
  return (
    <div data-ghost="" className="scrollcol" style={{ height: "100%" }}>
      <GameHeader title="GHOST LAP · DATI VERI" sub={`${S.name}: due giri veloci sovrapposti, metro per metro.`} onBack={onBack} />
      <div style={{ margin: "0 16px 12px", padding: 12, borderRadius: 16, background: C.card, border: `1px solid ${C.border}` }}>
        <div style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 10.5, letterSpacing: 1, color: C.gold, marginBottom: 4 }}>QUALIFICHE</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>{list.map(([id, nm], i) => { const on = id === sid; return <button key={id} className="press" data-ghost-session={id} aria-pressed={on ? "true" : "false"} onClick={() => pickSession(id)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 10px", borderRadius: 10, background: on ? C.accent : "rgba(255,255,255,.05)", border: `1px solid ${on ? C.accent : C.border}`, fontFamily: F_HEAD, fontWeight: 800, fontSize: 12.5, color: "#fff" }}>{nm}{i === 0 && <span style={{ padding: "1px 5px", borderRadius: 5, background: on ? "rgba(0,0,0,.25)" : "rgba(231,179,76,.18)", fontFamily: F_BODY, fontWeight: 700, fontSize: 9.5, color: on ? "#fff" : C.gold }}>ULTIMA</span>}</button>; })}</div>
        <div style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 10.5, letterSpacing: 1, color: C.gold, marginBottom: 4 }}>PILOTA A</div>{chips("a", a, setA, b)}
        <div style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 10.5, letterSpacing: 1, color: C.gold, marginBottom: 4 }}>PILOTA B</div>{chips("b", b, setB, a)}
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
          <span style={{ fontFamily: F_HEAD, fontWeight: 900, fontSize: 15, color: C.text }}><span style={{ color: IA.color }}>■</span> {IA.code} {LiveSim.fmtLap(A.time)}</span>
          <span style={{ fontFamily: F_HEAD, fontWeight: 900, fontSize: 15, color: C.text }}><span style={{ color: IB.color }}>{same ? "▢" : "■"}</span> {IB.code} {LiveSim.fmtLap(B.time)}</span>
          <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 13, color: B.time >= A.time ? C.gold : TIMING.green }}>{fmtS3(B.time - A.time)} s</span>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4, fontFamily: F_BODY, fontSize: 11, color: C.dim }}>{[0, 1, 2].map(i => <span key={i}>S{i + 1}: {IA.code} {A.sectors[i].toFixed(3)} · {IB.code} {B.sectors[i].toFixed(3)}</span>)}<span>Speed trap: {A.vst} / {B.vst} km/h</span></div>
      </div>
      <div style={{ margin: "0 16px 12px", padding: "10px 8px 8px", borderRadius: 16, background: C.card, border: `1px solid ${C.border}` }}>
        <div style={{ padding: "0 4px 4px", fontFamily: F_BODY, fontWeight: 700, fontSize: 10.5, letterSpacing: 1, color: C.dim }}>VELOCITÀ (km/h) LUNGO IL GIRO · TOCCA E SCORRI</div>
        <svg data-ghost-chart="speed" viewBox={`0 0 ${W} 150`} onPointerMove={scrub} onPointerDown={scrub} style={{ display: "block", width: "100%", touchAction: "pan-y", cursor: "crosshair" }} role="img" aria-label={`Velocità di ${IA.code} e ${IB.code} lungo il giro`}>
          {[100, 200, 300].map(v => <g key={v}><line x1={padL} x2={W - padR} y1={YV(v)} y2={YV(v)} stroke="rgba(255,255,255,.07)" /><text x={padL - 4} y={YV(v) + 3} textAnchor="end" fill={C.dim} fontFamily={F_BODY} fontSize="8.5">{v}</text></g>)}
          {(() => { let lastX = -99; return S.corners.map(c => { const x = X(c.d), show = c.n === cn || x - lastX >= 9; if (show) lastX = x; return <g key={c.n}><line x1={x} x2={x} y1="138" y2="142" stroke={c.n === cn ? C.gold : "rgba(255,255,255,.25)"} />{show && <text x={x} y="149" textAnchor="middle" fill={c.n === cn ? C.gold : C.dim} fontFamily={F_BODY} fontSize="6.5">{c.n}</text>}</g>; }); })()}
          <polyline points={line(B, YV)} fill="none" stroke={IB.color} strokeWidth="1.8" strokeDasharray={same ? "4 3" : undefined} opacity=".95" />
          <polyline points={line(A, YV)} fill="none" stroke={IA.color} strokeWidth="1.8" />
          {cur != null && <g><line x1={X(cur)} x2={X(cur)} y1="8" y2="138" stroke="#fff" strokeWidth="1" opacity=".6" /><circle cx={X(cur)} cy={YV(val(A, "v"))} r="3.5" fill={IA.color} stroke="#fff" /><circle cx={X(cur)} cy={YV(val(B, "v"))} r="3.5" fill={IB.color} stroke="#fff" /></g>}
        </svg>
        <div style={{ padding: "6px 4px 2px", fontFamily: F_BODY, fontWeight: 700, fontSize: 10.5, letterSpacing: 1, color: C.dim }}>DISTACCO DI {IB.code} DA {IA.code} (sopra la riga {IB.code} è dietro)</div>
        <svg data-ghost-chart="delta" viewBox={`0 0 ${W} 80`} onPointerMove={scrub} onPointerDown={scrub} style={{ display: "block", width: "100%", touchAction: "pan-y", cursor: "crosshair" }}>
          <line x1={padL} x2={W - padR} y1={YD(0)} y2={YD(0)} stroke="rgba(255,255,255,.25)" />
          {[maxDt, -maxDt].map(v => <text key={v} x={padL - 4} y={YD(v) + 3} textAnchor="end" fill={C.dim} fontFamily={F_BODY} fontSize="8">{(v > 0 ? "+" : "−") + Math.abs(v).toFixed(2)}</text>)}
          <polyline points={dts.map(x => X(x.d).toFixed(1) + "," + YD(x.dt).toFixed(1)).join(" ")} fill="none" stroke={C.gold} strokeWidth="1.8" />
          {cur != null && <line x1={X(cur)} x2={X(cur)} y1="4" y2="76" stroke="#fff" strokeWidth="1" opacity=".6" />}
        </svg>
        <div data-ghost-readout="" style={{ minHeight: 34, padding: "4px 4px 0", fontFamily: F_BODY, fontSize: 11.5, color: C.muted, lineHeight: 1.45, fontVariantNumeric: "tabular-nums" }}>
          {cur == null ? <span style={{ color: C.dim }}>Tocca o scorri sul grafico per leggere i valori in quel punto.</span> : <>
            <b style={{ color: C.text }}>{fmtMeters(cur)} m</b> · <span style={{ color: IA.color }}>{IA.code}</span> {Math.round(val(A, "v"))} km/h, {Math.round(val(A, "g"))}ª, gas {Math.round(val(A, "thr"))}%{val(A, "brk") >= .5 ? ", freno" : ""} · <span style={{ color: IB.color }}>{IB.code}</span> {Math.round(val(B, "v"))} km/h, {Math.round(val(B, "g"))}ª, gas {Math.round(val(B, "thr"))}%{val(B, "brk") >= .5 ? ", freno" : ""} · distacco <b style={{ color: C.text }}>{fmtS3(BtGhost.at(B, "t", cur) - BtGhost.at(A, "t", cur))} s</b>
          </>}
        </div>
      </div>
      <div style={{ margin: "0 16px 12px", padding: 12, borderRadius: 16, background: C.card, border: `1px solid ${C.border}` }}>
        <div style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 14, color: C.text, marginBottom: 6 }}>CURVA PER CURVA</div>
        <div className="scrollrow" style={{ display: "flex", gap: 5, overflowX: "auto", scrollbarWidth: "none", marginBottom: 8 }}>
          {S.corners.map(c => <button key={c.n} className="press" data-ghost-corner={c.n} aria-pressed={c.n === cn ? "true" : "false"} onClick={() => { setCn(c.n); setReplay(false); setCur(c.d); }} style={{ flex: "0 0 auto", minWidth: 34, padding: "6px 8px", borderRadius: 9, background: c.n === cn ? C.accent : "rgba(255,255,255,.05)", border: `1px solid ${c.n === cn ? C.accent : C.border}`, fontFamily: F_HEAD, fontWeight: 800, fontSize: 11.5, color: "#fff" }}>{c.detected ? "F" : "T"}{c.n}</button>)}
        </div>
        {!duel ? <p style={{ margin: 0, fontFamily: F_BODY, fontSize: 12, color: C.dim }}>Scegli una curva per vedere chi frena più tardi, la velocità minima e chi torna prima sul gas.</p> : (
          <div data-ghost-duel="">
            <div style={{ fontFamily: F_HEAD, fontWeight: 900, fontSize: 13, color: C.gold, marginBottom: 4 }}>{corner.detected ? "FRENATA" : "CURVA"} {duel.n} · {fmtMeters(duel.d)} m dal via</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 72px 72px", gap: 6, fontFamily: F_HEAD, fontWeight: 800, fontSize: 11.5 }}><span /><span style={{ textAlign: "right", color: IA.color }}>{IA.code}</span><span style={{ textAlign: "right", color: IB.color }}>{IB.code}</span></div>
            {row("Punto di frenata", duel.brake.a, duel.brake.b, v => fmtMeters(v) + " m")}
            {row("Velocità alla frenata", duel.vBrake.a, duel.vBrake.b, v => v + " km/h")}
            {row("Velocità minima (apice)", duel.vMin.a, duel.vMin.b, v => v + " km/h")}
            {row("Gas al 100% da", duel.full.a, duel.full.b, v => fmtMeters(v) + " m")}
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8, fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 12.5, color: C.text }}>
              <span>{capBrake}</span>
              {duel.vMin.faster && duel.vMin.faster !== "pari" && <span>{(duel.vMin.faster === "A" ? IA : IB).last} PASSA {Math.abs(duel.vMin.a - duel.vMin.b)} km/h PIÙ VELOCE A CENTRO CURVA</span>}
              {duel.full.first && duel.full.first !== "pari" && <span>{(duel.full.first === "A" ? IA : IB).last} TORNA PRIMA AL 100% DI GAS</span>}
              <span style={{ color: C.gold }}>{duel.gained.who === "pari" ? "IN QUESTA CURVA SONO PARI" : `${(duel.gained.who === "A" ? IA : IB).last} GUADAGNA ${duel.gained.s.toFixed(3).replace(".", ",")} s IN QUESTA CURVA`}</span>
            </div>
            <button className="press" data-ghost-replay="" onClick={() => setReplay(x => !x)} style={{ marginTop: 10, width: "100%", padding: "10px 0", borderRadius: 11, background: replay ? "rgba(255,255,255,.08)" : C.accent, border: `1px solid ${replay ? C.border : C.accent}`, fontFamily: F_HEAD, fontWeight: 800, fontSize: 12.5, color: "#fff" }}>{replay ? "Chiudi il replay" : "GUARDA IL REPLAY 2D DELLA CURVA"}</button>
            {replay && <GhostReplay key={a + b + duel.n} A={A} B={B} IA={IA} IB={IB} duel={duel} />}
          </div>
        )}
      </div>
      <p style={{ margin: "0 18px 18px", fontFamily: F_BODY, fontSize: 10.5, color: C.dim, lineHeight: 1.45 }}>Dati veri: {S.source}.{S.cornersDetected ? " Su questa pista le curve sono ricavate dalle frenate del giro più veloce (F1, F2…): nei dati non ci sono ancora le curve ufficiali." : ""} Telemetria a circa 4 campioni al secondo: il punto di frenata ha qualche metro di incertezza. Distanze riportate alla lunghezza ufficiale della pista. Solo per l'anteprima: per l'app pubblica con pubblicità serve il permesso di Formula 1.</p>
    </div>
  );
}

/* ── PAGELLE DELLA COMMUNITY ──────────────────────────────────────────── */
// Dopo ogni gara (e Sprint) i tifosi votano i piloti da 1 a 10 su 5 parametri. Per ogni pilota un radar
// ("ragnatela") con la media dei voti della community B&T e, se hai votato, il tuo voto tratteggiato in oro.
// I voti degli altri tifosi sono simulati (demo, BtLogic.communityRatings).
const fmtVote = v => String(v).replace(".", ",");
const RATING_LINES = { pace: ["Pace gara"], aggr: ["Aggressività"], gomme: ["Gestione", "gomme"], fortuna: ["Fortuna"], strategia: ["Strategia", "del team"] };
function RadarChart({ avg, mine, color, name }) {
  const P = BtLogic.RATING_PARAMS, cx = 170, cy = 135, R = 86;
  const pt = (i, v) => { const a = -Math.PI / 2 + i * 2 * Math.PI / P.length, r = R * v / 10; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
  const pts = f => P.map(([k], i) => pt(i, f(k)).map(n => n.toFixed(1)).join(",")).join(" ");
  return (
    <svg data-radar="" viewBox="0 0 340 262" role="img" aria-label={`${name}: ${P.map(([k, l]) => `${l} ${fmtVote(avg[k])}`).join(", ")}${mine ? ". Il tuo voto: " + P.map(([k, l]) => `${l} ${mine[k]}`).join(", ") : ""}`} style={{ display: "block", width: "100%", maxWidth: 380, margin: "0 auto" }}>
      {[2, 4, 6, 8, 10].map(v => <polygon key={v} points={pts(() => v)} fill={v === 10 ? "rgba(255,255,255,.03)" : "none"} stroke={v === 10 ? "rgba(255,255,255,.2)" : "rgba(255,255,255,.08)"} strokeWidth="1" />)}
      {P.map(([k], i) => { const [x, y] = pt(i, 10); return <line key={k} data-radar-axis={k} x1={cx} y1={cy} x2={x.toFixed(1)} y2={y.toFixed(1)} stroke="rgba(255,255,255,.12)" strokeWidth="1" />; })}
      <polygon data-radar-community="" points={pts(k => avg[k])} fill={color} fillOpacity="0.24" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {mine && <polygon data-radar-mine="" points={pts(k => mine[k])} fill="none" stroke={C.gold} strokeWidth="2" strokeDasharray="5 4" strokeLinejoin="round" />}
      {P.map(([k], i) => { const [x, y] = pt(i, avg[k]); return <circle key={k} cx={x.toFixed(1)} cy={y.toFixed(1)} r="4" fill={color} stroke="#18181C" strokeWidth="2" />; })}
      {P.map(([k], i) => {
        const [x, y] = pt(i, 11.9), anchor = Math.abs(x - cx) < 6 ? "middle" : x > cx ? "start" : "end", lines = RATING_LINES[k];
        const y0 = i === 0 ? 12 : y - 6 - (lines.length - 1) * 6.5;
        return (
          <g key={k}>
            {lines.map((l, j) => <text key={j} x={x.toFixed(1)} y={(y0 + j * 13).toFixed(1)} textAnchor={anchor} fill={C.muted} fontFamily={F_BODY} fontSize="10.5" fontWeight="600">{l}</text>)}
            <text x={x.toFixed(1)} y={(y0 + lines.length * 13 + 2).toFixed(1)} textAnchor={anchor} fill={C.text} fontFamily={F_HEAD} fontSize="14" fontWeight="900">{fmtVote(avg[k])}</text>
          </g>
        );
      })}
    </svg>
  );
}
function RatingsCard({ sessionKey, title, field, seed, mine = {}, onRate }) {
  const [sel, setSel] = useState(null);
  const [draft, setDraft] = useState(null);   // voto in corso: { pace: 8, ... } (si invia con tutti e 5)
  const P = BtLogic.RATING_PARAMS;
  const res = BtLogic.communityRatings({ field, seed, mine });
  const cur = field.some(f => f.id === sel) ? sel : field[0] && field[0].id;
  if (!cur) return null;
  const d = driverById(cur), t = d ? teamById(d.teamId) : null, f = field.find(x => x.id === cur), r = res[cur];
  const color = (t && t.color) || C.accent, voted = !!mine[cur];
  const complete = draft && P.every(([k]) => draft[k]);
  const choose = id => { setSel(id); setDraft(null); };
  return (
    <div data-ratings={sessionKey} style={{ margin: "0 16px 14px", padding: "14px 14px 12px", borderRadius: 18, background: C.card, border: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 14, color: C.text }}>PAGELLE DELLA COMMUNITY</span>
        <span style={{ marginLeft: "auto", fontFamily: F_BODY, fontSize: 10, color: C.dim, whiteSpace: "nowrap" }}>voti degli altri: demo</span>
      </div>
      <p style={{ margin: "3px 0 10px", fontFamily: F_BODY, fontSize: 11.5, color: C.muted, lineHeight: 1.4 }}>{title} · vota i piloti da 1 a 10 su 5 parametri</p>
      <div className="scrollrow" style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", marginBottom: 10 }}>
        {field.map(x => { const dx = driverById(x.id), on = x.id === cur; return (
          <button key={x.id} className="press" data-rating-driver={x.id} aria-pressed={on ? "true" : "false"} onClick={() => choose(x.id)} style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: 5, padding: "6px 9px", borderRadius: 10, background: on ? "rgba(232,18,29,.18)" : "rgba(255,255,255,.05)", border: `1px solid ${on ? C.accent : C.border}` }}>
            <span style={{ width: 3, height: 14, borderRadius: 2, background: dx ? dx.color : C.dim }} />
            <b style={{ fontFamily: F_HEAD, fontSize: 12, color: C.text }}>{dx ? driverCode(dx) : x.id}</b>
            <span style={{ fontFamily: F_BODY, fontSize: 10, color: x.pos ? C.dim : "#FF5A5F" }}>{x.pos ? "P" + x.pos : "RIT"}</span>
            {mine[x.id] && <span aria-label="votato" style={{ width: 6, height: 6, borderRadius: "50%", background: C.gold }} />}
          </button>
        ); })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 4, height: 30, borderRadius: 2, background: color }} />
        <div style={{ minWidth: 0 }}>
          <div data-radar-name="" style={{ fontFamily: F_HEAD, fontWeight: 900, fontSize: 16, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{(d ? d.full : cur).toUpperCase()}</div>
          <div style={{ fontFamily: F_BODY, fontSize: 11, color: C.muted }}>{t ? t.name : ""} · {f.pos ? `${f.pos}° classificato` : `Ritirato${f.dnf && DNF_LABEL[f.dnf] ? " · " + DNF_LABEL[f.dnf].toLowerCase() : ""}`}</div>
        </div>
      </div>
      <RadarChart avg={r.avg} mine={r.mine} color={color} name={d ? d.full : cur} />
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "4px 14px", margin: "0 0 10px", fontFamily: F_BODY, fontSize: 11, color: C.muted }}>
        <span data-rating-votes={r.votes} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: color, opacity: .7 }} />Media della community · {r.votes} voti</span>
        {r.mine && <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><svg width="16" height="4" aria-hidden="true"><line x1="0" y1="2" x2="16" y2="2" stroke={C.gold} strokeWidth="2" strokeDasharray="4 3" /></svg>Il tuo voto</span>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {P.map(([k, l]) => (
          <div key={k} data-rating-param={k} data-value={r.avg[k]} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 1fr) 30px", alignItems: "center", gap: 8, fontFamily: F_BODY, fontSize: 11.5, color: C.muted }}>
            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l}{r.mine ? <span style={{ color: C.gold }}> · tuo {r.mine[k]}</span> : null}</span>
            <span style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,.07)", overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: r.avg[k] * 10 + "%", background: color }} /></span>
            <b style={{ textAlign: "right", fontFamily: F_HEAD, fontSize: 13, color: C.text, fontVariantNumeric: "tabular-nums" }}>{fmtVote(r.avg[k])}</b>
          </div>
        ))}
      </div>
      {voted ? <p style={{ margin: "10px 0 0", fontFamily: F_BODY, fontSize: 11.5, color: C.muted, lineHeight: 1.4 }}>Hai votato {d ? d.name : cur}: il tuo voto è la linea tratteggiata oro. Puoi votare anche gli altri piloti.</p>
        : !draft ? <button className="press" data-rate-open="" onClick={() => setDraft({})} style={{ marginTop: 12, width: "100%", padding: "11px 14px", borderRadius: 12, background: C.accent, fontFamily: F_HEAD, fontWeight: 800, fontSize: 13, color: "#fff" }}>VOTA {surname(cur)}</button>
        : (
          <div data-rate-form="" style={{ marginTop: 12, padding: "10px 10px 12px", borderRadius: 14, background: "rgba(255,255,255,.04)", border: `1px solid ${C.border}` }}>
            {P.map(([k, l]) => (
              <div key={k} data-rate-param={k} role="radiogroup" aria-label={`${l} di ${d ? d.name : cur}`} style={{ marginBottom: 9 }}>
                <div style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 11, color: C.text, marginBottom: 4 }}>{l} {draft[k] ? <span style={{ color: C.gold }}>· {draft[k]}</span> : null}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 3 }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => { const on = draft[k] === n; return (
                    <button key={n} className="press" role="radio" data-rate-value={n} aria-checked={on ? "true" : "false"} onClick={() => setDraft(x => ({ ...x, [k]: n }))} style={{ height: 30, borderRadius: 7, background: on ? C.gold : "rgba(255,255,255,.06)", border: `1px solid ${on ? C.gold : C.border}`, fontFamily: F_HEAD, fontWeight: 800, fontSize: 12, color: on ? "#15120A" : C.muted }}>{n}</button>
                  ); })}
                </div>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button className="press" onClick={() => setDraft(null)} style={{ flex: 1, padding: "10px 12px", borderRadius: 11, background: "rgba(255,255,255,.07)", border: `1px solid ${C.border}`, fontFamily: F_HEAD, fontWeight: 800, fontSize: 12, color: C.muted }}>Annulla</button>
              <button className="press" data-rate-send="" disabled={!complete} onClick={() => { if (!complete) return; onRate(sessionKey, cur, { ...draft }); setDraft(null); }} style={{ flex: 2, padding: "10px 12px", borderRadius: 11, background: complete ? C.accent : "rgba(232,18,29,.3)", fontFamily: F_HEAD, fontWeight: 800, fontSize: 12.5, color: complete ? "#fff" : "rgba(255,255,255,.55)" }}>{complete ? "INVIA IL VOTO" : (n => n === 1 ? "Manca 1 parametro" : `Mancano ${n} parametri`)(P.filter(([k]) => !draft[k]).length)}</button>
            </div>
          </div>
        )}
    </div>
  );
}

function RaceScreen({ isPremium, onPremium, onSelectDriver, races, standings, live, liveSt, onExpandMap, onTelemetry, onOpenCircuit, wxGuess, wxResult, onGuessWeather, onLapTimes, onSecondScreen, lastRace, dotdVote, onDotdVote, ratings = {}, onRate, onOpenChats, onOpenGhost }) {
  const [tab, setTab] = useState("classifica");
  const [champ, setChamp] = useState("piloti");
  const st = live ? liveSt : null;
  const tabs = st ? [["classifica", "Tempi"], ["radio", "Radio"], ["meteo", "Meteo"], ["gomme", "Gomme"], ["messaggi", "Direzione gara"], ["mondiale", "Mondiale"]]
    : [["classifica", "Gara"], ["radio", "Radio"], ["meteo", "Meteo"], ["gomme", "Gomme"], ["mondiale", "Mondiale"]];
  const curTab = tabs.some(t => t[0] === tab) ? tab : "classifica";
  const liveRace = live ? races.find(r => r.id === live.raceId) : null;
  const next = races.find(r => r.status === "IN ARRIVO");
  const shown = liveRace || races.find(r => r.status === "LIVE") || next;
  const done = races.filter(r => r.status === "CONCLUSA").length;
  const weatherTrack = live ? live.track : (shown ? trackOf(shown.circuitId) : null);
  return (
    <div className="scrollcol" style={{ height: "100%" }}>
      {st && liveRace && st.finished && isRaceType(st.type) && <FinishPodium st={st} race={liveRace} onSelectDriver={onSelectDriver} />}
      {st && liveRace ? <LiveCard race={liveRace} st={st} track={live.track} onExpand={onExpandMap} /> : (
      <div style={{ position: "relative", margin: "4px 16px 14px", borderRadius: 18, overflow: "hidden", background: C.card, border: `1px solid ${C.border}` }}>
        {shown && <CircuitArt circuitId={shown.circuitId} uid="next" />}
        {shown && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(13,13,16,.94) 0%, rgba(13,13,16,.72) 48%, rgba(13,13,16,.18) 100%)" }} />}
        <div style={{ position: "relative", padding: "18px 16px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.gold }} />
          <span style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 11, color: C.gold, letterSpacing: 1.2 }}>PROSSIMA GARA</span>
          <div style={{ flexGrow: 1 }} />
          <span style={{ fontFamily: F_BODY, fontWeight: 600, fontSize: 12, color: C.muted }}>{shown ? `ROUND ${shown.round}/${races.length}` : `${done}/${races.length}`}</span>
        </div>
        <h1 style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 20, color: C.text, margin: "0 0 4px" }}>{shown ? shown.name : "Stagione conclusa"}</h1>
        <span style={{ display: "block", fontFamily: F_BODY, fontSize: 13, color: C.muted }}>{shown ? `${shown.circuit} · ${fmtDate(shown.date)}` : `${done} gare disputate`}</span>
        {shown && CIRCUIT_INFO[shown.circuitId] && <CircuitCta circuitId={shown.circuitId} onOpen={() => onOpenCircuit && onOpenCircuit(shown.circuitId)} />}
        </div>
      </div>
      )}
      {st && liveRace && st.type === "RACE" && <DotdCard st={st} race={liveRace} vote={dotdVote || {}} onVote={onDotdVote} />}
      {st && liveRace && st.finished && isRaceType(st.type) && (() => { const key = liveRace.id + ":" + st.type; return (
        <RatingsCard key={key} sessionKey={key} title={liveRace.name + (st.type === "SPRINT" ? " · Sprint" : "")} seed={liveRace.round * 10 + (st.type === "SPRINT" ? 1 : 0)} mine={ratings[key] || {}} onRate={onRate}
          field={st.cars.map(c => ({ id: c.id, pos: c.dnf ? null : c.pos, dnf: c.dnf ? c.dnf.cause : null, grid: c.grid, stops: c.stops }))} />
      ); })()}
      {st && liveRace && isRaceType(st.type) && <InsightsCard live={live} st={st} race={liveRace} />}

      <button className="press" onClick={() => isPremium ? onSecondScreen && onSecondScreen() : onPremium()} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "calc(100% - 32px)", margin: "0 16px 14px", padding: "11px 14px", borderRadius: 12, background: `linear-gradient(rgba(231,179,76,.1), rgba(231,179,76,.1)) ${C.bg}`, border: "1px solid rgba(231,179,76,.3)" }}>
        <Icon name="grid" size={14} color={C.gold} />
        <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 12, color: C.gold }}>Modalità Second Screen</span>
        {isPremium ? <span style={{ fontFamily: F_BODY, fontSize: 10.5, color: C.muted }}>· in orizzontale</span> : <Icon name="lock" size={11} color={C.gold} />}
      </button>
      {onOpenGhost && !st && ghostSessions().length > 0 && (() => { const [gid, gname] = ghostSessions()[0], gc = Object.keys(BtRealData[gid].laps), surn = c => ghostInfo(c).name.split(" ").slice(-1)[0]; return (
        <button className="press" data-ghost-open={gid} onClick={onOpenGhost} style={{ display: "block", width: "calc(100% - 32px)", margin: "0 16px 14px", padding: 14, borderRadius: 16, textAlign: "left", background: "linear-gradient(120deg, rgba(232,18,29,.24), rgba(24,24,28,1) 62%)", border: "1px solid rgba(232,18,29,.45)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ flexShrink: 0, whiteSpace: "nowrap", padding: "2px 7px", borderRadius: 6, background: C.accent, fontFamily: F_HEAD, fontWeight: 900, fontSize: 10, color: "#fff" }}>DATI VERI</span><span style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 15, color: C.text }}>GHOST LAP · QUALIFICHE DI {gname.toUpperCase()}</span></span>
          <span style={{ display: "block", marginTop: 5, fontFamily: F_BODY, fontSize: 12, color: C.muted, lineHeight: 1.4 }}>Il giro più veloce di {surn(gc[0])} contro {gc.slice(1, 4).map(surn).join(", ")} e gli altri: velocità metro per metro, curva per curva e replay 2D.</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 8, fontFamily: F_HEAD, fontWeight: 800, fontSize: 12, color: C.gold }}>Apri il Ghost Lap <Icon name="chevron" size={12} color={C.gold} sw={2.6} /></span>
        </button>
      ); })()}
      {onOpenChats && (
        <button className="press" data-race-chat="" onClick={onOpenChats} style={{ display: "flex", alignItems: "center", gap: 10, width: "calc(100% - 32px)", margin: "0 16px 14px", padding: "11px 14px", borderRadius: 14, background: C.card, border: `1px solid ${C.border}`, textAlign: "left" }}>
          <span style={{ width: 36, height: 36, borderRadius: 12, background: "rgba(232,18,29,.16)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="chat" size={18} color={C.accent} /></span>
          <span style={{ flex: 1, minWidth: 0 }}><b style={{ display: "block", fontFamily: F_HEAD, fontWeight: 800, fontSize: 13.5, color: C.text }}>Chat dei tifosi</b><span style={{ fontFamily: F_BODY, fontSize: 11.5, color: C.muted }}>{st ? "Commenta la diretta con la community B&T" : "Parla di F1 con la community B&T"}</span></span>
          <Icon name="chevron" size={15} color={C.dim} />
        </button>
      )}

      <>
      <div className="scrollrow" style={{ display: "flex", gap: 8, padding: "0 16px", marginBottom: 16, overflowX: "auto", scrollbarWidth: "none" }}>
        {tabs.map(([id, label]) => (
          <button key={id} className="press" data-race-tab={id} onClick={() => setTab(id)} style={{ flex: "1 0 auto", padding: "10px 13px", borderRadius: 12, background: curTab === id ? C.accent : C.card, border: `1px solid ${curTab === id ? C.accent : C.border}`, fontFamily: F_HEAD, fontWeight: 800, fontSize: 12, color: curTab === id ? "#fff" : C.muted, textAlign: "center", whiteSpace: "nowrap" }}>{label}</button>
        ))}
      </div>

      {curTab === "classifica" && st && <TimingTable st={st} onTelemetry={onTelemetry} onSelectDriver={onSelectDriver} onLapTimes={onLapTimes} />}
      {curTab === "messaggi" && st && <RaceControlList messages={st.messages} />}
      {curTab === "meteo" && <WeatherPanel race={shown} st={st} track={weatherTrack} live={live} guesses={wxGuess} results={wxResult} onGuess={onGuessWeather} />}

      {curTab === "classifica" && !st && lastRace && <LastRaceCard race={lastRace} onSelectDriver={onSelectDriver} />}
      {curTab === "classifica" && !st && lastRace && (() => { const key = lastRace.raceId + ":" + (lastRace.type || "RACE"); return (
        <RatingsCard key={key} sessionKey={key} title={lastRace.name} seed={(+String(lastRace.raceId).replace(/\D/g, "") || 1) * 10} mine={ratings[key] || {}} onRate={onRate}
          field={lastRace.rows.map(x => ({ id: x.id, pos: x.pos || null, dnf: x.dnf || null }))} />
      ); })()}

      {curTab === "gomme" && (
        <div style={{ margin: "0 16px 16px", borderRadius: 18, background: C.card, border: `1px solid ${C.border}`, overflow: "hidden", padding: "4px 0" }}>
          {TIRES.map((t, i) => (
            <div key={t.name} style={{ padding: "12px 16px", borderBottom: i < TIRES.length - 1 ? `1px solid ${C.divider}` : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 9, fontFamily: F_BODY, fontWeight: 600, fontSize: 13, color: C.text }}><Headshot driver={driverByName(t.name)} size={28} />{t.name}</span>
                <span style={{ fontFamily: F_BODY, fontSize: 11, color: C.dim }}>{t.compound} · {t.wear}% usura</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: t.wear + "%", borderRadius: 3, background: t.wear > 50 ? C.accent : C.green }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {curTab === "mondiale" && (
        <div style={{ margin: "0 16px 16px" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {[["piloti", "Piloti"], ["costruttori", "Costruttori"]].map(([id, l]) => (
              <button key={id} className="press" onClick={() => setChamp(id)} style={{ padding: "7px 14px", borderRadius: 999, background: champ === id ? "rgba(232,18,29,.16)" : "rgba(255,255,255,.05)", border: `1px solid ${champ === id ? C.accent : C.border}`, fontFamily: F_BODY, fontWeight: 700, fontSize: 11.5, color: champ === id ? C.text : C.muted }}>{l}</button>
            ))}
          </div>
          {!st && (() => {
            const top = (champ === "piloti" ? standings.drivers : standings.teams).slice().sort((a, b) => a.position - b.position).slice(0, 3);
            const items = champ === "piloti" ? driverPodium(top.map(r => ({ id: r.id, value: r.points + " pt" })), onSelectDriver)
              : top.map((r, i) => { const t = teamById(r.id); return t ? { title: t.name, value: r.points + " pt", figure: <TeamFigure team={t} place={i + 1} /> } : null; }).filter(Boolean);
            return (
              <div data-champ-podium={champ} style={{ padding: "14px 12px 0", marginBottom: 10, borderRadius: 18, background: C.card, border: `1px solid ${C.border}`, overflow: "hidden" }}>
                <Podium label={champ === "piloti" ? "Podio del mondiale piloti" : "Podio del mondiale costruttori"} items={items} />
              </div>
            );
          })()}
          <div style={{ borderRadius: 18, background: C.card, border: `1px solid ${C.border}`, overflow: "hidden" }}>
            {(champ === "piloti" ? standings.drivers : standings.teams).slice().sort((a, b) => a.position - b.position).filter(row => st || row.position > 3).map((row, i, arr) => {
              const d = champ === "piloti" ? standingsDriver(row.id) : null;
              const t = champ === "piloti" ? (d && teamById(d.teamId)) : teamById(row.id);
              if (!t) return null;
              return (
                <div key={row.id} data-champ-row={row.position}>
                  <button className="press" onClick={() => d && !d.guest && onSelectDriver(d)} disabled={!d || d.guest} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 14px", textAlign: "left" }}>
                    <span style={{ width: 22, fontFamily: F_HEAD, fontWeight: 800, fontSize: 14, color: row.position <= 3 ? C.gold : C.text }}>{row.position}</span>
                    {d ? <Headshot driver={d} size={32} /> : <span style={{ width: 32, height: 32, borderRadius: 10, background: t.color + "33", border: `2px solid ${t.color}`, flexShrink: 0 }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: F_BODY, fontWeight: 600, fontSize: 13, color: C.text }}>{d ? d.full : t.name}</div>
                      <div style={{ fontFamily: F_BODY, fontSize: 10, color: C.dim }}>{d ? t.name : t.tag}</div>
                    </div>
                    <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 14, color: C.text }}>{row.points}<span style={{ fontFamily: F_BODY, fontWeight: 600, fontSize: 10, color: C.dim }}> pt</span></span>
                  </button>
                  {i < arr.length - 1 && <div style={{ height: 1, background: C.divider, margin: "0 14px" }} />}
                </div>
              );
            })}
          </div>
          <p style={{ margin: "8px 4px 0", fontFamily: F_BODY, fontSize: 10.5, color: C.dim }}>{standings.note}</p>
        </div>
      )}

      {curTab === "radio" && (
        <div style={{ margin: "0 16px 16px", borderRadius: 18, background: C.card, border: `1px solid ${C.border}`, overflow: "hidden" }}>
          {RADIOS.map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderBottom: i < RADIOS.length - 1 ? `1px solid ${C.divider}` : "none" }}>
              <Headshot driver={driverByName(r.driver)} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: F_BODY, fontWeight: 600, fontSize: 12.5, color: C.text }}>{r.driver} <span style={{ color: C.dim, fontWeight: 400 }}>· {r.time}</span></div>
                <div style={{ fontFamily: F_BODY, fontSize: 12, color: C.muted, marginTop: 2 }}>{r.text}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      </>
    </div>
  );
}

function InstagramScreen({ ig, onToast }) {
  const GRADS = ["#3a0a0c", "#1a1a2e", "#241505", "#0a2e28"];
  return (
    <div className="scrollcol" style={{ height: "100%" }}>
      <div style={{ margin: "4px 16px 16px", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 60, height: 60, borderRadius: "50%", background: "linear-gradient(155deg,#3a0a0c 0%,#0f0f12 70%)", border: `2px solid ${C.accent}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 16, color: C.text }}>B&amp;T</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 16, color: C.text, margin: "0 0 3px" }}>@{ig.handle}</h1>
          <span style={{ fontFamily: F_BODY, fontSize: 12, color: C.muted }}>La community B&amp;T di Formula 1</span>
        </div>
      </div>

      <div style={{ display: "flex", margin: "0 16px 16px", padding: "14px 0", borderRadius: 16, background: C.card, border: `1px solid ${C.border}` }}>
        <div style={{ flex: 1, textAlign: "center", borderRight: `1px solid ${C.border}` }}>
          <div style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 17, color: C.text }}>{fmtK(ig.followers)}</div>
          <div style={{ fontFamily: F_BODY, fontSize: 10, color: C.dim, marginTop: 2 }}>FOLLOWER</div>
        </div>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 17, color: C.text }}>{ig.posts}</div>
          <div style={{ fontFamily: F_BODY, fontSize: 10, color: C.dim, marginTop: 2 }}>POST</div>
        </div>
      </div>

      <button className="press" onClick={() => onToast("Apertura Instagram (demo)")} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "calc(100% - 32px)", margin: "0 16px 22px", padding: "13px 0", borderRadius: 14, background: C.accent, boxShadow: `0 10px 22px -10px ${C.accent}` }}>
        <Icon name="instagram" size={16} color="#fff" />
        <span style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 14, color: "#fff", letterSpacing: .3 }}>SEGUI SU INSTAGRAM</span>
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 16px 12px" }}>
        <Icon name="play" size={15} color={C.accent} />
        <h2 style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 16, color: C.text, margin: 0 }}>ULTIMI VIDEO</h2>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, margin: "0 16px 16px" }}>
        {ig.videos.map((v, i) => (
          <button key={v.id} className="press" onClick={() => onToast("Apertura " + (v.title || "video") + " (demo)")} style={{ display: "block", padding: 0, borderRadius: 14, overflow: "hidden", background: C.card, border: `1px solid ${C.border}` }}>
            <div style={{ height: 140, position: "relative", background: v.thumb ? `#111 url(${v.thumb}) center / cover` : `linear-gradient(155deg, ${GRADS[i % 4]} 0%, #0f0f12 70%)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,.16)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="play" size={13} color="#fff" />
              </div>
              <div style={{ position: "absolute", bottom: 8, left: 8, display: "flex", alignItems: "center", gap: 4, padding: "3px 7px", borderRadius: 6, background: "rgba(0,0,0,.55)" }}>
                <Icon name="heart" size={10} color="#fff" />
                <span style={{ fontFamily: F_BODY, fontWeight: 600, fontSize: 10, color: "#fff" }}>{v.likes}</span>
              </div>
            </div>
            {v.title && <div style={{ padding: "8px 10px", textAlign: "left" }}><div style={{ fontFamily: F_BODY, fontWeight: 600, fontSize: 11.5, color: C.text, lineHeight: 1.3 }}>{v.title}</div><div style={{ fontFamily: F_BODY, fontSize: 10, color: C.dim, marginTop: 2 }}>{v.views} visualizzazioni</div></div>}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatListScreen({ chats, onOpen, blocked = [] }) {
  const [q, setQ] = useState("");
  const filtered = chats.filter(c => c.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="scrollcol" style={{ height: "100%" }}>
      <div style={{ margin: "4px 16px 16px" }}>
        <label htmlFor="chatsearch" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}>Cerca chat</label>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 14px", borderRadius: 14, background: C.card, border: `1px solid ${C.border}` }}>
          <Icon name="search" size={15} color={C.dim} />
          <input id="chatsearch" type="search" placeholder="Cerca chat..." value={q} onChange={e => setQ(e.target.value)} style={{ flex: 1, minWidth: 0, border: "none", background: "none", outline: "none", fontFamily: F_BODY, fontSize: 13, color: C.text }} />
        </div>
      </div>
      <div style={{ padding: "0 16px 10px" }}><span style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 11, color: C.dim, letterSpacing: 1 }}>LE TUE CHAT</span></div>
      {filtered.map(c => {
        const visible = c.messages.filter(m => !isBlockedMsg(blocked, m));
        const last = visible[visible.length - 1];
        const unread = visible.filter(m => !m.mine).length > 2 ? 3 : 0;
        return (
          <button key={c.id} className="press" onClick={() => onOpen(c.id)} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "12px 16px", textAlign: "left", borderBottom: `1px solid ${C.divider}` }}>
            <IconCircle name={c.icon} bg={c.color} stroke={c.iconColor} filled />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontFamily: F_HEAD, fontWeight: 700, fontSize: 14, color: C.text }}>{c.name}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 2 }}>
                <span style={{ fontFamily: F_BODY, fontSize: 12, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{last ? (last.mine ? "Tu: " : last.from + ": ") + last.text : "Nessun messaggio"}</span>
                {unread > 0 && <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 18, height: 18, padding: "0 5px", borderRadius: 9, background: C.accent, fontFamily: F_BODY, fontWeight: 700, fontSize: 10, color: "#fff", flexShrink: 0 }}>{unread}</span>}
              </div>
            </div>
          </button>
        );
      })}
      <p style={{ fontFamily: F_BODY, fontSize: 11, color: C.dim, lineHeight: 1.55, textAlign: "center", margin: "18px 28px 24px" }}>Rispetta gli altri tifosi: niente insulti, spam o dati personali. Con ⋯ su un messaggio puoi segnalarlo o bloccare chi l'ha scritto.</p>
    </div>
  );
}

function ChatThreadScreen({ chat, onBack, onSend, isPremium, blocked = [], onReport, onBlock }) {
  const [draft, setDraft] = useState("");
  const [menu, setMenu] = useState(null); // messaggio su cui ho aperto le opzioni
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [chat.messages.length]);
  const shown = chat.messages.filter(m => !isBlockedMsg(blocked, m));
  const send = () => { if (!draft.trim()) return; onSend(chat.id, draft.trim()); setDraft(""); };
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <SubHeader title={chat.name} onBack={onBack} right={<IconCircle name={chat.icon} bg={chat.color} stroke={chat.iconColor} size={32} filled />} />
      <div className="scrollcol" style={{ flex: 1, padding: "6px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {shown.map((m, i) => (
          <div key={m.id || i} style={{ display: "flex", flexDirection: "column", alignItems: m.mine ? "flex-end" : "flex-start" }}>
            {m.mine && isPremium && <span style={{ display: "flex", alignItems: "center", gap: 3, fontFamily: F_BODY, fontWeight: 700, fontSize: 10.5, color: C.gold, margin: "0 4px 3px" }}><Icon name="star" size={9} color={C.gold} />Tu</span>}
            {!m.mine && <span style={{ display: "flex", alignItems: "center", gap: 2, fontFamily: F_BODY, fontWeight: 600, fontSize: 10.5, color: C.dim, margin: "0 4px 1px" }}>{m.from}
              <button className="press" aria-label={`Opzioni messaggio di ${m.from}`} onClick={() => setMenu(m)} style={{ minWidth: 30, height: 22, borderRadius: 8, fontFamily: F_BODY, fontWeight: 700, fontSize: 14, lineHeight: 1, color: C.dim }}>⋯</button>
            </span>}
            <div style={{ maxWidth: "78%", padding: "9px 13px", borderRadius: m.mine ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: m.mine ? C.accent : C.card, border: m.mine ? "none" : `1px solid ${C.border}` }}>
              <span style={{ fontFamily: F_BODY, fontSize: 13.5, color: "#fff", lineHeight: 1.4 }}>{m.text}</span>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", padding: "11px 14px", borderRadius: 20, background: C.card, border: `1px solid ${C.border}` }}>
          <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Scrivi un messaggio…" style={{ flex: 1, minWidth: 0, border: "none", background: "none", outline: "none", fontFamily: F_BODY, fontSize: 13.5, color: C.text }} />
        </div>
        <button className="press" aria-label="Invia" onClick={send} style={{ width: 40, height: 40, borderRadius: "50%", background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon name="send" size={16} color="#fff" sw={2} />
        </button>
      </div>
      {menu && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 550, display: "flex", alignItems: "flex-end" }} onClick={e => { if (e.target === e.currentTarget) setMenu(null); }}>
          <div style={{ background: C.card, borderRadius: "22px 22px 0 0", width: "100%", padding: "18px 18px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ fontFamily: F_BODY, fontSize: 12, color: C.muted, textAlign: "center", margin: "0 0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{menu.from}: “{menu.text}”</p>
            <button className="press" onClick={() => { onReport && onReport(chat.id, menu); setMenu(null); }} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px 0", borderRadius: 14, background: C.accent, fontFamily: F_HEAD, fontWeight: 800, fontSize: 14, color: "#fff" }}><Icon name="flag" size={15} color="#fff" /> Segnala messaggio</button>
            <button className="press" onClick={() => { onBlock && onBlock(menu); setMenu(null); }} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px 0", borderRadius: 14, border: `1.5px solid ${C.border}`, fontFamily: F_HEAD, fontWeight: 800, fontSize: 14, color: C.text }}><Icon name="no" size={15} /> Blocca {menu.from}</button>
            <button className="press" onClick={() => setMenu(null)} style={{ padding: "12px 0", fontFamily: F_BODY, fontWeight: 600, fontSize: 13, color: C.muted }}>Annulla</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Leghe FantaF1: quella creata da te si modifica (nome, membri, inviti); le altre no.
const LEAGUES_INIT = [
  { id: "amici", name: "Amici del Bar", owner: true, code: "BT-7Q2K",
    members: LEAGUE.filter(u => !u.me).map(u => ({ name: u.name, nick: u.nick, team: u.team, pts: parseInt(u.pts.replace(/\D/g, ""), 10), color: u.color })) },
  { id: "ufficio", name: "Lega Ufficio", owner: false, code: "BT-3M8D",
    members: [{ name: "A. Ferri", nick: "@undercut_af", team: "Undercut Club", pts: 1210, color: "#3B6FD4" }, { name: "C. Galli", nick: "@pole_galli", team: "Pole Position", pts: 1102, color: "#E8842C" }, { name: "R. Sala", nick: "@boxboxbox_rs", team: "Box Box Box", pts: 1040, color: "#2E9E8F" }] },
];
const MY_SEASON_PTS = 1166;   // punti della tua squadra nelle gare già corse (demo)
const fmtPts = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " pt";
const MEMBER_COLORS = ["#2E9E8F", "#3B6FD4", "#E8842C", "#7B5FC4", "#D9B830", "#9AA0A6", "#C2185B"];
const sessionLabelIt = type => LiveSim.SESSION_LABEL[type] || type;
// "fino alla fine delle FP3", "fino all'inizio delle qualifiche"...
const SESSION_DEL = { FP1: "delle FP1", FP2: "delle FP2", FP3: "delle FP3", SQ: "delle Qualifiche Sprint", SPRINT: "della Sprint", QUALI: "delle qualifiche", RACE: "della gara" };
const fmtRome = ms => new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(ms));
const initialsOf = u => String(u.me ? "Tu" : (u.nick || u.name || "?")).replace("@", "").split(/[ ._]+/).filter(Boolean).map(w => w[0]).slice(0, 2).join("").toUpperCase();

/* ── PODIO ─────────────────────────────────────────────────────────── */
const MEDAL = { 1: "#E7B34C", 2: "#C9CDD4", 3: "#CD8A4E" };
// Podio: il 1° al centro sul gradino più alto, il 2° a sinistra a metà, il 3° a destra più in basso.
function Podium({ items, label }) {
  const H = { 1: 70, 2: 50, 3: 34 };
  return (
    <div role="list" aria-label={label} data-podium={label} style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
      {[2, 1, 3].map(place => {
        const it = items[place - 1];
        if (!it) return <div key={place} style={{ flex: 1 }} />;
        return (
          <div key={place} role="listitem" data-podium-place={place} aria-label={`${place}° posto: ${it.title}${it.value ? ", " + it.value : ""}`} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
            {(() => {
              const body = <>
                {it.figure}
                <div style={{ marginTop: 5, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: F_HEAD, fontWeight: 800, fontSize: place === 1 ? 13.5 : 12.5, color: C.text, textAlign: "center" }}>{it.title}</div>
                <div style={{ minHeight: 16, marginBottom: 5, fontFamily: F_BODY, fontWeight: 600, fontSize: 11, color: C.muted, textAlign: "center", whiteSpace: "nowrap" }}>{it.value || ""}</div>
              </>;
              return it.onClick ? <button className="press" onClick={it.onClick} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", minWidth: 0, padding: 0, background: "none" }}>{body}</button> : body;
            })()}
            <div data-podium-step={place} style={{ width: "100%", height: H[place], borderRadius: "10px 10px 0 0", background: `linear-gradient(180deg, ${MEDAL[place]}59, ${MEDAL[place]}12)`, borderTop: `3px solid ${MEDAL[place]}`, display: "flex", justifyContent: "center", paddingTop: 5, boxSizing: "border-box" }}>
              <span style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: place === 1 ? 28 : 22, lineHeight: 1, color: MEDAL[place] }}>{place}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
// Sul podio: il pilota in piedi (foto scontornata), la monoposto della scuderia o le iniziali del giocatore.
function DriverFigure({ driver, place }) {
  const h = place === 1 ? 112 : place === 2 ? 96 : 88;
  if (driver && driver.photo) return <img src={driver.photo} alt="" data-podium-photo={driver.id} style={{ height: h, maxWidth: "100%", objectFit: "contain", objectPosition: "bottom", display: "block" }} />;
  return <Headshot driver={driver} size={place === 1 ? 64 : 54} />;
}
// Monoposto generica (non è la livrea vera) nel colore della scuderia.
function CarSilhouette({ color, width = 132 }) {
  return (
    <svg viewBox="0 0 132 40" width={width} height={Math.round(width * 40 / 132)} aria-hidden="true" style={{ display: "block" }}>
      <path d="M3 29 L3 25 L20 24 L28 21 L50 19 L58 13 L64 10 L72 10 L78 17 L100 18 L106 13 L106 7 L126 7 L126 13 L119 14 L118 29 Z" fill={color} />
      <path d="M62 13 Q68 6 76 12" stroke="#15151A" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M52 22 L94 22" stroke="rgba(0,0,0,.28)" strokeWidth="2" />
      <rect x="1" y="28" width="26" height="3.4" rx="1.7" fill="#15151A" />
      <circle cx="30" cy="29" r="8.4" fill="#15151A" /><circle cx="30" cy="29" r="3.3" fill="#44444C" />
      <circle cx="104" cy="29" r="9" fill="#15151A" /><circle cx="104" cy="29" r="3.5" fill="#44444C" />
    </svg>
  );
}
function TeamFigure({ team, place }) {
  return <div style={{ height: place === 1 ? 64 : 54, display: "flex", alignItems: "flex-end" }}><CarSilhouette color={team.color} width={place === 1 ? 104 : 88} /></div>;
}
function UserFigure({ user, place }) {
  const s = place === 1 ? 60 : 50;
  return <span aria-hidden="true" style={{ width: s, height: s, borderRadius: "50%", background: user.color, border: `3px solid ${MEDAL[place]}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F_HEAD, fontWeight: 900, fontSize: Math.round(s * .34), color: "#fff", boxSizing: "border-box" }}>{initialsOf(user)}</span>;
}
const driverPodium = (ids, onSelect) => ids.slice(0, 3).map((x, i) => { const d = standingsDriver(x.id); return { title: d ? d.name : x.id, value: x.value, figure: <DriverFigure driver={d} place={i + 1} />, onClick: onSelect && d && !d.guest ? () => onSelect(d) : null }; });

// Ultima gara: podio con le foto di chi ha vinto e classifica completa.
function LastRaceCard({ race, onSelectDriver }) {
  const fmtRow = r => r.time;
  return (
    <div style={{ margin: "0 16px 16px" }} data-last-race={race.real ? "real" : "demo"}>
      <div style={{ padding: "14px 12px 0", borderRadius: 18, background: C.card, border: `1px solid ${C.border}`, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "0 4px" }}>
          <Eyebrow color={C.gold}>ULTIMA GARA</Eyebrow>
          <span style={{ marginLeft: "auto", fontFamily: F_BODY, fontSize: 10.5, color: C.dim }}>{race.real ? "risultato ufficiale" : "diretta demo"}</span>
        </div>
        <h2 style={{ margin: "0 4px 10px", fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 18, color: C.text }}>{race.name}</h2>
        <Podium label={"Podio · " + race.name} items={driverPodium(race.rows.slice(0, 3).map((r, i) => ({ id: r.id, value: i === 0 ? "Vincitore" : fmtRow(r) })), onSelectDriver)} />
      </div>
      <div style={{ marginTop: 10, borderRadius: 18, background: C.card, border: `1px solid ${C.border}`, overflow: "hidden" }}>
        {race.rows.filter(r => !(r.pos && r.pos <= 3)).map((r, i, rows) => {
          const d = standingsDriver(r.id);
          return (
            <div key={r.id} data-result-row={r.id} data-result-pos={r.pos || "RIT"}>
              <button className="press" disabled={!d || d.guest} onClick={() => d && !d.guest && onSelectDriver(d)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 14px", textAlign: "left" }}>
                <span style={{ width: 26, fontFamily: F_HEAD, fontWeight: 800, fontSize: 14, color: r.pos && r.pos <= 3 ? C.gold : C.text }}>{r.pos || "RIT"}</span>
                <Headshot driver={d} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: F_BODY, fontWeight: 600, fontSize: 13, color: C.text }}>{d ? d.name : r.id}</div>
                  <div style={{ fontFamily: F_BODY, fontSize: 10, color: C.dim }}>{r.why || (d ? d.team : "")}</div>
                </div>
                {(r.dnf || r.time === "Ritirato") && <DnfTile cause={r.dnf || "altro"} width={56} style={{ padding: 2, borderRadius: 8 }} />}
                {race.fastest === r.id && <span title="Giro più veloce" style={{ padding: "2px 6px", borderRadius: 5, background: "rgba(168,85,247,.18)", fontFamily: F_HEAD, fontWeight: 800, fontSize: 9, color: "#C084FC" }}>GV</span>}
                <span style={{ fontFamily: F_BODY, fontWeight: 600, fontSize: 12, color: r.pos ? C.dim : C.accent, flexShrink: 0 }}>{fmtRow(r)}</span>
              </button>
              {i < rows.length - 1 && <div style={{ height: 1, background: C.divider, margin: "0 14px" }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
// Fine gara in diretta: podio con le foto dei primi tre.
function FinishPodium({ st, race, onSelectDriver }) {
  const top = st.cars.slice(0, 3);
  const label = (st.type === "SPRINT" ? "PODIO SPRINT" : "PODIO") + (race ? " · " + race.name : "");
  return (
    <div data-finish-podium="" style={{ margin: "0 16px 14px", padding: "14px 12px 0", borderRadius: 18, background: C.card, border: `1px solid ${MEDAL[1]}66`, overflow: "hidden" }}>
      <div style={{ padding: "0 4px 8px" }}><Eyebrow color={C.gold}>{label}</Eyebrow></div>
      <Podium label={label} items={driverPodium(top.map((c, i) => ({ id: c.id, value: i === 0 ? "Vincitore" : c.lapsDown > 0 ? `+${c.lapsDown} ${c.lapsDown === 1 ? "giro" : "giri"}` : "+" + (c.gap || 0).toFixed(3) + "s" })), onSelectDriver)} />
    </div>
  );
}

/* ── FANTAF1 COME F1 FANTASY ───────────────────────────────────────── */
const fmtM = (v, dec = false) => { const r = Math.round((Number(v) || 0) * 10) / 10; return "$" + (dec || r % 1 ? r.toFixed(1) : String(r)) + "M"; };
const PRICE_UP = "#4FA8FF", PRICE_DOWN = "#FF5A5F";
function PriceChange({ v, size = 11 }) {
  if (v == null || !Number(v)) return null;
  const up = v > 0;
  return <span data-price-change={up ? "up" : "down"} aria-label={(up ? "prezzo salito di " : "prezzo sceso di ") + fmtM(Math.abs(v), true)} style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: size, color: up ? PRICE_UP : PRICE_DOWN, whiteSpace: "nowrap" }}>{up ? "▲" : "▼"}{fmtM(Math.abs(v), true)}</span>;
}
const cardName = d => d.name.replace(/ (.+)$/, (m, sur) => " " + sur.toUpperCase());   // "K. ANTONELLI", come sulle carte di F1 Fantasy
// Contorno del tracciato, per l'intestazione della squadra.
function MiniTrack({ circuitId, width = 96 }) {
  const c = CIRCUITS[circuitId];
  if (!c) return null;
  return <svg viewBox="0 0 1600 900" width={width} height={Math.round(width * 900 / 1600)} aria-hidden="true"><polygon points={c.pts} fill="none" stroke="#fff" strokeWidth="38" strokeLinejoin="round" /></svg>;
}

function FantaSlot({ kind, index, id, stats, boost, locked, onOpen, onRemove, onBoost }) {
  const isD = kind === "drivers";
  const d = isD && id ? driverById(id) : null;
  const t = isD ? (d && teamById(d.teamId)) : (id && teamById(id));
  const row = id ? stats[kind][id] : null;
  if (!id || !t) return (
    <button data-fanta-add={kind + ":" + index} className="press" onClick={onOpen} disabled={locked} aria-label={isD ? "Aggiungi un pilota" : "Aggiungi una scuderia"}
      style={{ minHeight: isD ? 122 : 112, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, border: "1px dashed rgba(255,255,255,.18)", background: "rgba(255,255,255,.02)", opacity: locked ? .5 : 1 }}>
      <span style={{ width: 38, height: 38, borderRadius: "50%", background: "#050507", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="plus" size={18} color="#fff" sw={2.2} /></span>
      <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 12.5, color: C.text }}>{isD ? "Aggiungi pilota" : "Aggiungi scuderia"}</span>
    </button>
  );
  const label = isD ? d.full : t.name;
  return (
    <div data-fanta-card={id} style={{ position: "relative", borderRadius: 14, overflow: "hidden", background: "#0B0B0E", border: `1px solid ${C.border}`, opacity: locked ? .85 : 1 }}>
      <button className="press" onClick={onOpen} disabled={locked} aria-label={`Cambia ${label}`} style={{ display: "block", width: "100%", textAlign: "left" }}>
        {isD
          ? <div style={{ height: 70, background: d.photo ? `${t.color} url(${d.photo}) 50% 0 / 100% auto no-repeat` : t.color }} />
          : <div style={{ height: 62, background: t.color, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 2 }}><CarSilhouette color="#F4F2EF" width={118} /></div>}
        <div style={{ padding: "6px 8px 8px" }}>
          <div style={{ fontFamily: F_HEAD, fontWeight: 900, fontSize: isD ? (cardName(d).length > 12 ? 10.5 : 11.5) : 13, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{isD ? cardName(d) : t.name.toUpperCase()}</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4, marginTop: 4, paddingTop: 4, borderTop: "1px solid rgba(255,255,255,.12)" }}>
            <span style={{ fontFamily: F_HEAD, fontWeight: 900, fontSize: 12.5, color: C.text }}>{fmtM(row.price)}</span>
            <PriceChange v={row.change} size={10.5} />
          </div>
        </div>
      </button>
      {!locked && <button className="press" aria-label={`Togli ${label}`} onClick={onRemove} style={{ position: "absolute", top: 6, right: 6, width: 26, height: 26, borderRadius: "50%", background: "rgba(0,0,0,.72)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="close" size={11} color="#fff" sw={2.6} /></button>}
      {isD && <button className="press" data-boost={boost ? "on" : "off"} aria-pressed={boost ? "true" : "false"} aria-label={boost ? `${d.full} ha il 2X` : `Metti il 2X su ${d.full}`} onClick={onBoost} disabled={locked}
        style={{ position: "absolute", top: 6, left: 6, height: 24, minWidth: 32, padding: "0 6px", borderRadius: 12, background: boost ? "#fff" : "rgba(0,0,0,.55)", border: boost ? "none" : "1px dashed rgba(255,255,255,.55)", fontFamily: F_HEAD, fontWeight: 900, fontSize: 11, color: boost ? "#111" : "rgba(255,255,255,.8)" }}>2X</button>}
    </div>
  );
}

// Scelta di un pilota o di una scuderia: tutti, con prezzo, variazione e punti; chi non entra nel budget è spento.
function FantaPicker({ kind, slot, squad, stats, budget, onPick, onClose }) {
  const isD = kind === "drivers";
  const [sort, setSort] = useState("price");
  const current = squad[kind][slot];
  const left = budget - BtLogic.squadValue(squad, stats) + (current ? Number(stats[kind][current].price) : 0);
  const rows = Object.entries(stats[kind]).map(([id, v]) => ({ id, ...v })).sort((a, b) => sort === "price" ? b.price - a.price || b.pts - a.pts : b.pts - a.pts);
  const chip = (id, l) => <button key={id} className="press" aria-pressed={sort === id ? "true" : "false"} onClick={() => setSort(id)} style={{ padding: "6px 12px", borderRadius: 999, background: sort === id ? "rgba(232,18,29,.16)" : "rgba(255,255,255,.05)", border: `1px solid ${sort === id ? C.accent : C.border}`, fontFamily: F_BODY, fontWeight: 700, fontSize: 11.5, color: sort === id ? C.text : C.muted }}>{l}</button>;
  return (
    <div role="dialog" aria-modal="true" aria-label={isD ? "Scegli un pilota" : "Scegli una scuderia"} style={{ position: "absolute", inset: 0, zIndex: 640, background: "rgba(0,0,0,.72)", display: "flex", alignItems: "flex-end" }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: "100%", maxHeight: "86%", display: "flex", flexDirection: "column", background: C.card, borderRadius: "24px 24px 0 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 18px 10px" }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 17, color: C.text }}>{isD ? "SCEGLI IL PILOTA" : "SCEGLI LA SCUDERIA"}</h2>
            <div style={{ fontFamily: F_BODY, fontSize: 11.5, color: C.muted, marginTop: 2 }}>Puoi spendere fino a <b data-picker-left="" style={{ color: C.text }}>{fmtM(Math.max(0, left), true)}</b></div>
          </div>
          <button className="press" aria-label="Chiudi" onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="close" size={13} sw={2.2} /></button>
        </div>
        <div style={{ display: "flex", gap: 6, padding: "0 18px 10px" }}>{chip("price", "Per prezzo")}{chip("pts", "Per punti")}</div>
        <div className="scrollcol" style={{ flex: 1, minHeight: 0, paddingBottom: 12 }}>
          {rows.map(r => {
            const d = isD ? driverById(r.id) : null, t = isD ? (d && teamById(d.teamId)) : teamById(r.id);
            if (!t) return null;
            const inSquad = squad[kind].includes(r.id) && r.id !== current;
            const afford = BtLogic.canAfford(squad, stats, budget, kind, slot, r.id);
            const why = r.id === current ? "In squadra" : inSquad ? "Già in squadra" : !afford ? "Budget insufficiente" : null;
            const off = inSquad || (!afford && r.id !== current);
            return (
              <button key={r.id} data-pick={r.id} className="press" disabled={off} onClick={() => { onPick(r.id); onClose(); }} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "9px 18px", textAlign: "left", opacity: off ? .42 : 1, background: r.id === current ? "rgba(232,18,29,.08)" : "transparent" }}>
                {d ? <Headshot driver={d} size={36} /> : <span style={{ width: 36, height: 36, borderRadius: 10, background: t.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><CarSilhouette color="#F4F2EF" width={30} /></span>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 13.5, color: C.text }}>{d ? d.full : t.name}</div>
                  <div style={{ fontFamily: F_BODY, fontSize: 10.5, color: C.dim }}>{d ? t.name + " · " : ""}{r.pts} pt in stagione{why ? " · " + why : ""}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontFamily: F_HEAD, fontWeight: 900, fontSize: 13.5, color: C.text }}>{fmtM(r.price)}</div>
                  <PriceChange v={r.change} size={10} />
                </div>
              </button>
            );
          })}
          <p style={{ margin: "8px 18px 0", fontFamily: F_BODY, fontSize: 10.5, color: C.dim, lineHeight: 1.45 }}>{FANTASY_SOURCE}.</p>
        </div>
      </div>
    </div>
  );
}

// La tua squadra come in F1 Fantasy: chiusura con conto alla rovescia, nome, cambi gratis, budget, 5 piloti e 2 scuderie.
function FantaSquadCard({ squad, setSquad, base, freeTransfers, budget, stats, race, lock, onToast, needAccount }) {
  const [picking, setPicking] = useState(null);   // { kind, slot }
  const [naming, setNaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(squad.name);
  const value = BtLogic.squadValue(squad, stats);
  const left = Math.round((budget - value) * 10) / 10;
  const tr = BtLogic.transfers(base, squad, freeTransfers);
  const locked = lock.locked;
  const guard = fn => (...a) => { if (needAccount()) return; if (locked) { onToast(`Squadra bloccata fino alla fine della gara`); return; } fn(...a); };
  const setSlot = (kind, slot, id) => setSquad(s => {
    const next = { ...s, [kind]: s[kind].map((x, i) => i === slot ? id : x) };
    if (kind === "drivers" && !next.drivers.includes(next.boost)) next.boost = next.drivers.find(Boolean) || null;
    return next;
  });
  const complete = squad.drivers.every(Boolean) && squad.teams.every(Boolean);
  const cd = lock.lockAt ? BtLogic.countdown(lock.lockAt - nowMs()) : null;
  const pad = n => String(n).padStart(2, "0");
  const slot = (kind, i) => (
    <FantaSlot key={kind + i} kind={kind} index={i} id={squad[kind][i]} stats={stats} boost={kind === "drivers" && squad.drivers[i] && squad.boost === squad.drivers[i]} locked={locked}
      onOpen={guard(() => setPicking({ kind, slot: i }))}
      onRemove={guard(() => setSlot(kind, i, null))}
      onBoost={guard(() => { setSquad(s => ({ ...s, boost: s.drivers[i] })); onToast(`2X su ${driverById(squad.drivers[i]).name}: i suoi punti del weekend valgono doppio`); })} />
  );
  return (
    <div style={{ margin: "4px 16px 16px", borderRadius: 18, background: C.card, border: `1px solid ${C.border}`, overflow: "hidden" }}>
      <div style={{ padding: "14px 14px 12px", background: "#050507", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 10.5, color: C.dim, letterSpacing: 1 }}>{race ? `ROUND ${race.round} · ${race.country.toUpperCase()}` : "FANTAF1"}</div>
            <div style={{ fontFamily: F_HEAD, fontWeight: 900, fontSize: 16, color: C.text, lineHeight: 1.2, marginTop: 2 }}>{race ? race.name : "Stagione conclusa"}</div>
          </div>
          {race && <MiniTrack circuitId={race.circuitId} width={92} />}
        </div>
        {locked ? (
          <div role="status" data-team-lock="locked" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, padding: "11px 14px", borderRadius: 14, background: "rgba(232,18,29,.14)", border: "1px solid rgba(232,18,29,.4)" }}>
            <Icon name="lock" size={15} color={C.accent} />
            <span style={{ fontFamily: F_BODY, fontSize: 12.5, color: C.text, lineHeight: 1.4 }}><b>Squadra bloccata</b> · si riapre a fine gara{lock.demo ? " (diretta demo)" : lock.unlockAt ? ` (${fmtRome(lock.unlockAt)})` : ""}.</span>
          </div>
        ) : (
          <div data-team-lock="open" style={{ display: "flex", alignItems: "center", marginTop: 12, padding: "10px 14px", borderRadius: 14, background: "#F2F1EE", color: "#101014" }}>
            <span style={{ flex: 1, fontFamily: F_HEAD, fontWeight: 800, fontSize: 14 }}>Chiusura squadra</span>
            {cd ? <span data-countdown="" aria-label={`Mancano ${cd.d} giorni, ${cd.h} ore e ${cd.m} minuti`} style={{ fontFamily: F_HEAD, fontWeight: 900, fontSize: 19, letterSpacing: .3 }}>{pad(cd.d)}<small style={{ fontSize: 11 }}>G</small> : {pad(cd.h)}<small style={{ fontSize: 11 }}>H</small> : {pad(cd.m)}<small style={{ fontSize: 11 }}>M</small></span>
              : <span style={{ fontFamily: F_BODY, fontSize: 12 }}>all'inizio delle qualifiche</span>}
          </div>
        )}
        {!locked && lock.lockAt && <p style={{ margin: "7px 2px 0", fontFamily: F_BODY, fontSize: 11, color: C.dim }}>Si blocca all'inizio {SESSION_DEL[lock.lockKey] || "delle qualifiche"} ({fmtRome(lock.lockAt)}, ora italiana) e si riapre a fine gara.</p>}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px 4px" }}>
        {naming ? (
          <div style={{ flex: 1, display: "flex", gap: 6 }}>
            <label htmlFor="fantaName" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}>Nome della squadra</label>
            <input id="fantaName" value={nameDraft} maxLength={24} onChange={e => setNameDraft(e.target.value)} style={{ flex: 1, minWidth: 0, padding: "9px 11px", borderRadius: 10, background: "rgba(255,255,255,.05)", border: `1px solid ${C.border}`, fontFamily: F_BODY, fontSize: 13, color: C.text, outline: "none" }} />
            <button className="press" disabled={!nameDraft.trim()} onClick={() => { setSquad(s => ({ ...s, name: nameDraft.trim() })); setNaming(false); onToast("Nome della squadra salvato"); }} style={{ padding: "9px 12px", borderRadius: 10, background: C.accent, fontFamily: F_HEAD, fontWeight: 800, fontSize: 12, color: "#fff", opacity: nameDraft.trim() ? 1 : .45 }}>Salva</button>
          </div>
        ) : (
          <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 12, background: "rgba(255,255,255,.05)" }}>
            <span style={{ padding: "5px 8px", borderRadius: 8, background: "#6A2FC9", fontFamily: F_HEAD, fontWeight: 900, fontSize: 12, color: "#fff" }}>T1</span>
            <span data-fanta-name="" style={{ flex: 1, minWidth: 0, fontFamily: F_HEAD, fontWeight: 800, fontSize: 14, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{squad.name}</span>
            <button className="press" aria-label="Cambia il nome della squadra" onClick={() => { if (needAccount()) return; setNameDraft(squad.name); setNaming(true); }} style={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="edit" size={15} /></button>
          </div>
        )}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontFamily: F_BODY, fontSize: 10.5, color: C.dim }}>Cambi gratis</div>
          <div data-transfers="" style={{ fontFamily: F_HEAD, fontWeight: 900, fontSize: 15, color: tr.extra ? C.accent : C.text }}>{tr.unlimited ? "Illimitati" : `${Math.max(0, tr.free - tr.used)} di ${tr.free}`}</div>
        </div>
      </div>
      {tr.extra > 0 && <p role="status" style={{ margin: "4px 14px 0", fontFamily: F_BODY, fontSize: 11.5, color: C.accent }}>{tr.extra === 1 ? "1 cambio in più" : `${tr.extra} cambi in più`} dei gratis: −{tr.penalty} punti a fine weekend.</p>}

      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px 4px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: F_BODY, fontSize: 12, color: C.muted }}>Budget: <b data-budget-left="" style={{ fontFamily: F_HEAD, fontWeight: 900, fontSize: 16, color: left < 0 ? C.accent : C.text }}>{fmtM(left, true)}</b></div>
          <div style={{ height: 4, width: 150, marginTop: 5, borderRadius: 2, background: "rgba(255,255,255,.1)", overflow: "hidden" }}><div style={{ height: "100%", width: Math.max(0, Math.min(100, left / budget * 100)) + "%", background: left < 0 ? C.accent : TIMING.green }} /></div>
        </div>
        <button className="press" disabled={locked} onClick={guard(() => { setSquad(s => ({ ...s, drivers: s.drivers.map(() => null), teams: s.teams.map(() => null), boost: null })); onToast("Squadra svuotata: scegli piloti e scuderie"); })} style={{ padding: "8px 10px", fontFamily: F_HEAD, fontWeight: 800, fontSize: 13, color: C.muted, textDecoration: "underline", opacity: locked ? .45 : 1 }}>Reset</button>
        <button className="press" disabled={locked || complete} onClick={guard(() => { setSquad(s => BtLogic.autoFill(s, stats, budget)); onToast("Squadra completata: la combinazione con più punti in stagione che entra nel budget"); })} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 999, background: locked || complete ? "rgba(255,255,255,.12)" : "#fff", fontFamily: F_HEAD, fontWeight: 900, fontSize: 13, color: locked || complete ? C.dim : "#111" }}><Icon name="sparkle" size={14} color={locked || complete ? C.dim : "#111"} />Riempi</button>
      </div>
      <p style={{ margin: "2px 14px 0", fontFamily: F_BODY, fontSize: 10.5, color: C.dim }}>Budget totale {fmtM(budget, true)} · squadra {fmtM(value, true)} · tocca "2X" per raddoppiare i punti di un pilota.</p>

      <div data-fanta-drivers="" style={{ padding: "12px 14px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
          <div style={{ gridColumn: "2 / span 2" }}>{slot("drivers", 0)}</div>
          <div style={{ gridColumn: "4 / span 2" }}>{slot("drivers", 1)}</div>
          <div style={{ gridColumn: "1 / span 2" }}>{slot("drivers", 2)}</div>
          <div style={{ gridColumn: "3 / span 2" }}>{slot("drivers", 3)}</div>
          <div style={{ gridColumn: "5 / span 2" }}>{slot("drivers", 4)}</div>
        </div>
      </div>
      <div style={{ height: 1, background: "rgba(255,255,255,.22)", margin: "14px 14px 0" }} />
      <div data-fanta-teams="" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "14px 14px 16px" }}>
        {slot("teams", 0)}{slot("teams", 1)}
      </div>
      {!complete && <p role="status" style={{ margin: "-4px 14px 14px", fontFamily: F_BODY, fontSize: 11.5, color: C.gold }}>Mancano {squad.drivers.filter(x => !x).length + squad.teams.filter(x => !x).length} posti: completa la squadra prima della chiusura, altrimenti non prende punti.</p>}
      {picking && <FantaPicker kind={picking.kind} slot={picking.slot} squad={squad} stats={stats} budget={budget} onClose={() => setPicking(null)}
        onPick={id => { setSlot(picking.kind, picking.slot, id); const d = driverById(id), t = teamById(id); onToast(`${d ? d.full : t ? t.name : id} entra nella tua squadra`); }} />}
    </div>
  );
}

// Previsioni avanzate, tutte a risposta chiusa: sondaggi, piloti (tra tutti), scuderie (tra tutte), numeri
// (col tastierino numerico) e domande di storia. +1 punto per ogni risposta giusta.
const PRED_BADGE = { poll: ["SONDAGGIO", "#4C8DFF"], driver: ["PILOTA", "#27D8C8"], team: ["SCUDERIA", "#FF8A1F"], number: ["NUMERO", "#B35CFF"], open: ["DOMANDA", "#27D8C8"], history: ["STORIA", C.gold] };
const PRED_KINDS = [["poll", "Sondaggio"], ["driver", "Pilota"], ["team", "Scuderia"], ["number", "Numero"], ["history", "Storia"]];
// Come si legge una risposta: nome del pilota, della scuderia, testo del sondaggio o il numero.
const predLabel = (q, v) => {
  if (v == null || v === "") return "";
  if (Array.isArray(v)) v = v[0];
  if (q.kind === "driver") { const d = driverById(v); return d ? d.full : String(v); }
  if (q.kind === "team") { const t = teamById(v); return t ? t.name : String(v); }
  if (q.kind === "poll" || q.kind === "history") { const o = (q.options || []).find(x => x[0] === v); return o ? o[1] : String(v); }
  return String(v);
};

// Elenco di tutti i piloti o di tutte le scuderie, per rispondere (o per segnare la risposta esatta).
function EntityPicker({ id, kind, title, selected, onPick, onClose }) {
  const isTeam = kind === "team";
  const list = isTeam ? TEAMS.map(t => ({ id: t.id, label: t.name, sub: t.tag, color: t.color }))
    : DRIVERS.map(d => ({ id: d.id, label: d.full, sub: d.team, color: d.color, driver: d }));
  return (
    <div data-pred-picker={id} role="dialog" aria-modal="true" aria-label={isTeam ? "Scegli la scuderia" : "Scegli il pilota"} style={{ position: "absolute", inset: 0, zIndex: 645, background: "rgba(0,0,0,.72)", display: "flex", alignItems: "flex-end" }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: "100%", maxHeight: "86%", display: "flex", flexDirection: "column", background: C.card, borderRadius: "24px 24px 0 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 18px 10px" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 17, color: C.text }}>{isTeam ? "SCEGLI LA SCUDERIA" : "SCEGLI IL PILOTA"}</h2>
            <div style={{ fontFamily: F_BODY, fontSize: 11.5, color: C.muted, marginTop: 2, lineHeight: 1.35 }}>{title}</div>
          </div>
          <button className="press" aria-label="Chiudi" onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="close" size={13} sw={2.2} /></button>
        </div>
        <div className="scrollcol" style={{ flex: 1, minHeight: 0, paddingBottom: 12 }}>
          {list.map(o => (
            <button key={o.id} data-pick-option={o.id} className="press" aria-pressed={selected === o.id ? "true" : "false"} onClick={() => onPick(o.id)}
              style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "9px 18px", textAlign: "left", background: selected === o.id ? "rgba(232,18,29,.1)" : "transparent" }}>
              {o.driver ? <Headshot driver={o.driver} size={34} /> : <span style={{ width: 34, height: 34, borderRadius: 10, background: o.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><CarSilhouette color="#F4F2EF" width={28} /></span>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 13.5, color: C.text }}>{o.label}</div>
                <div style={{ fontFamily: F_BODY, fontSize: 10.5, color: C.dim }}>{o.sub}</div>
              </div>
              {selected === o.id && <Icon name="check" size={15} color={C.accent} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Tastierino solo numerico (niente tastiera del telefono): cifre, cancella e conferma. Al massimo `max` cifre.
function NumPad({ value, onChange, onOk, okLabel = "Invia", onCancel, max = 3 }) {
  const press = k => {
    if (k === "del") { onChange(value.slice(0, -1)); return; }
    if (value === "0") { onChange(k); return; }
    if (value.length < max) onChange(value + k);
  };
  const key = (k, label, extra = {}) => (
    <button key={k} className="press" data-numpad-key={k} aria-label={k === "del" ? "Cancella" : k} onClick={() => press(k)}
      style={{ height: 44, borderRadius: 12, background: "rgba(255,255,255,.07)", border: `1px solid ${C.border}`, fontFamily: F_HEAD, fontWeight: 800, fontSize: 19, color: C.text, display: "flex", alignItems: "center", justifyContent: "center", ...extra }}>{label || k}</button>
  );
  return (
    <div data-numpad="" style={{ marginTop: 2 }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <div data-numpad-display="" aria-live="polite" style={{ flex: 1, height: 44, borderRadius: 12, background: "rgba(255,255,255,.04)", border: `1px solid ${value ? C.accent : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F_HEAD, fontWeight: 900, fontSize: 24, color: value ? C.text : C.dim, fontVariantNumeric: "tabular-nums" }}>{value || "—"}</div>
        {onCancel && <button className="press" onClick={onCancel} style={{ padding: "0 12px", borderRadius: 12, background: "rgba(255,255,255,.05)", fontFamily: F_BODY, fontWeight: 700, fontSize: 12, color: C.muted }}>Annulla</button>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(k => key(k))}
        {key("del", <svg width="22" height="16" viewBox="0 0 22 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"><path d="M7 1h13v14H7L1 8z" /><path d="M11 5l6 6M17 5l-6 6" /></svg>, { color: C.muted })}
        {key("0")}
        <button className="press" data-numpad-ok="" disabled={!value} onClick={() => value && onOk(value)} style={{ height: 44, borderRadius: 12, background: C.accent, fontFamily: F_HEAD, fontWeight: 800, fontSize: 13, color: "#fff", opacity: value ? 1 : .45 }}>{okLabel}</button>
      </div>
    </div>
  );
}

function PredictionCard({ q, answer, lock, onAnswer }) {
  const [picking, setPicking] = useState(false);
  const [pad, setPad] = useState(null);   // numero che si sta scrivendo (null = tastierino chiuso)
  const res = BtLogic.predictionCorrect(q, answer);
  const history = q.kind === "history";
  const choice = q.kind === "poll" || history;
  const done = history ? answer != null : lock.locked;
  const right = q.answer == null ? null : predLabel(q, q.answer);
  const badge = PRED_BADGE[q.kind] || ["DOMANDA", C.dim];
  const mine = predLabel(q, answer);
  const d = q.kind === "driver" && answer ? driverById(answer) : null, t = q.kind === "team" && answer ? teamById(answer) : null;
  const openBtn = { display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 11px", borderRadius: 12, textAlign: "left", background: "rgba(255,255,255,.05)", border: `1px solid ${answer != null ? C.accent : C.border}`, opacity: done ? .6 : 1 };
  return (
    <div data-prediction={q.id} style={{ padding: "13px 14px", borderRadius: 16, background: C.card, border: `1px solid ${res === true ? "rgba(62,214,107,.5)" : C.border}`, marginBottom: 10 }}>
      <span style={{ display: "inline-block", padding: "2px 7px", borderRadius: 6, background: badge[1] + "22", fontFamily: F_HEAD, fontWeight: 800, fontSize: 9.5, letterSpacing: .6, color: badge[1] }}>{badge[0]}</span>
      <div style={{ margin: "7px 0 10px", fontFamily: F_HEAD, fontWeight: 800, fontSize: 14, color: C.text, lineHeight: 1.3 }}>{q.q}</div>
      {choice ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {q.options.map(([id, l]) => {
            const isMine = answer === id, isRight = q.answer === id && (history ? answer != null : true);
            const show = done && q.answer != null;
            return <button key={id} data-option={id} className="press" disabled={done} aria-pressed={isMine ? "true" : "false"} onClick={() => onAnswer(id)}
              style={{ padding: "9px 8px", borderRadius: 10, textAlign: "center", fontFamily: F_BODY, fontWeight: 700, fontSize: 12, color: C.text, background: show && isRight ? "rgba(62,214,107,.18)" : isMine ? "rgba(232,18,29,.16)" : "rgba(255,255,255,.05)", border: `1px solid ${show && isRight ? "rgba(62,214,107,.6)" : isMine ? C.accent : C.border}` }}>{l}</button>;
          })}
        </div>
      ) : q.kind === "number" ? (
        pad == null ? (
          <button className="press" data-pred-open="" disabled={done} onClick={() => setPad(answer != null ? String(answer) : "")} style={openBtn}>
            <span style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(179,92,255,.16)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F_HEAD, fontWeight: 900, fontSize: 16, color: "#C98BFF", flexShrink: 0 }}>{answer != null ? String(answer) : "#"}</span>
            <span style={{ flex: 1, fontFamily: F_BODY, fontWeight: 700, fontSize: 13, color: C.text }}>{answer != null ? "Cambia il numero" : "Scrivi il numero"}</span>
            {!done && <Icon name="chevron" size={13} color={C.dim} />}
          </button>
        ) : <NumPad value={pad} onChange={setPad} onOk={v => { onAnswer(v); setPad(null); }} onCancel={() => setPad(null)} />
      ) : (
        <button className="press" data-pred-open="" disabled={done} onClick={() => setPicking(true)} style={openBtn}>
          {d ? <Headshot driver={d} size={34} /> : t ? <span style={{ width: 34, height: 34, borderRadius: 10, background: t.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><CarSilhouette color="#F4F2EF" width={28} /></span>
            : <span style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(255,255,255,.07)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name={q.kind === "team" ? "flag" : "person"} size={15} color={C.muted} /></span>}
          <span data-pred-choice="" style={{ flex: 1, minWidth: 0, fontFamily: F_BODY, fontWeight: 700, fontSize: 13, color: answer != null ? C.text : C.muted }}>{answer != null ? mine : q.kind === "team" ? "Scegli la scuderia" : "Scegli il pilota"}</span>
          {!done && <span style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 11, color: C.dim }}>{answer != null ? "Cambia" : "Tutti i " + (q.kind === "team" ? TEAMS.length : DRIVERS.length)}</span>}
        </button>
      )}
      {picking && <EntityPicker id={q.id} kind={q.kind === "team" ? "team" : "driver"} title={q.q} selected={answer} onPick={v => { onAnswer(v); setPicking(false); }} onClose={() => setPicking(false)} />}
      <p role="status" style={{ margin: "9px 0 0", fontFamily: F_BODY, fontSize: 11.5, color: C.muted, lineHeight: 1.45 }}>
        {res === true ? <b style={{ color: TIMING.green }}>Giusto! +1 punto FantaF1.</b>
          : res === false ? <span>Non era giusta: la risposta esatta è <b style={{ color: C.text }}>{right}</b>.</span>
          : history ? <span>Rispondi: se è giusta vale +1 punto. Hai un solo tentativo.</span>
          : lock.locked ? <span>Chiusa{answer != null ? <> · la tua risposta: <b style={{ color: C.text }}>{mine}</b></> : ""}. Il risultato lo segna l'admin a fine sessione.</span>
          : <span>{answer != null ? <>La tua risposta: <b style={{ color: C.text }}>{mine}</b> · </> : ""}+1 punto se indovini · si chiude {lock.text}.</span>}
        {history && answer != null && q.note ? <span> {q.note}</span> : null}
      </p>
    </div>
  );
}

// Regole e punti, come nel gioco ufficiale F1 Fantasy, più i bonus B&T.
function FantaRules() {
  const [open, setOpen] = useState(false);
  const R = BtLogic.RULES;
  const list = (items) => <ul style={{ margin: "4px 0 10px", paddingLeft: 18, fontFamily: F_BODY, fontSize: 12, color: C.muted, lineHeight: 1.55 }}>{items.map((t, i) => <li key={i}>{t}</li>)}</ul>;
  const h = t => <div style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 13, color: C.text, marginTop: 6 }}>{t}</div>;
  return (
    <div style={{ margin: "0 16px 16px", borderRadius: 16, background: C.card, border: `1px solid ${C.border}`, overflow: "hidden" }}>
      <button className="press" aria-expanded={open ? "true" : "false"} onClick={() => setOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "13px 14px", textAlign: "left" }}>
        <Icon name="help" size={15} color={C.gold} />
        <span style={{ flex: 1, fontFamily: F_HEAD, fontWeight: 800, fontSize: 13.5, color: C.text }}>Regole e punti</span>
        <span style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }}><Icon name="chevron" size={14} color={C.dim} /></span>
      </button>
      {open && (
        <div data-fanta-rules="" style={{ padding: "0 14px 12px" }}>
          <p style={{ margin: "0 0 6px", fontFamily: F_BODY, fontSize: 12, color: C.muted, lineHeight: 1.5 }}>Si gioca come nel gioco ufficiale F1 Fantasy, con in più i bonus B&amp;T.</p>
          {h("La squadra")}
          {list([`5 piloti e 2 scuderie. Il budget parte da ${R.startBudget} milioni e sale o scende col valore della tua squadra.`,
            "2X: scegli un pilota a cui raddoppiare i punti del weekend.",
            "La squadra si blocca all'inizio delle qualifiche (nei weekend Sprint, all'inizio delle Qualifiche Sprint) e si riapre a fine gara.",
            `Cambi: ${R.freeTransfers} gratis a weekend. Se non li usi, 1 si accumula (massimo ${R.maxTransfers}). Ogni cambio in più costa ${R.transferCost} punti. Conta la squadra finale: se rimetti chi avevi, non è un cambio.`,
            "I prezzi salgono o scendono dopo ogni gara, in base ai risultati delle ultime tre."])}
          {h("Punti dei piloti")}
          {list([`Qualifiche: dal 1° al 10° posto ${R.qualiPts.join(", ")}. Senza tempo o squalificato: ${R.qualiNoTime}.`,
            `Sprint: dal 1° all'8° posto ${R.sprintPts.join(", ")}; +1 per ogni posizione guadagnata e −1 per ogni persa; +1 per sorpasso; giro più veloce +${R.sprintFastest}; ritiro o squalifica ${R.sprintDnf}.`,
            `Gara: dal 1° al 10° posto ${R.racePts.join(", ")}; +1 per ogni posizione guadagnata e −1 per ogni persa; +1 per sorpasso; giro più veloce +${R.raceFastest}; pilota del giorno +${R.dotd}; ritiro o squalifica ${R.raceDnf}.`])}
          {h("Punti delle scuderie")}
          {list(["I punti dei suoi due piloti (senza il pilota del giorno).",
            `Qualifiche: entrambi in Q3 +${R.teamQuali.bothQ3}, entrambi in Q2 +${R.teamQuali.bothQ2}, uno in Q3 +${R.teamQuali.oneQ3}, uno in Q2 +${R.teamQuali.oneQ2}, entrambi fuori in Q1 ${R.teamQuali.bothQ1}.`,
            `Pit stop: ${R.pitStops.map(([t, p]) => `${t} +${p}`).join(", ")}; il più veloce della gara +${R.fastestStop}; nuovo record +${R.recordStop}.`])}
          {h("Bonus B&T")}
          {list([`Meteo indovinato (pioggia sì o no): +${R.wxBonus}.`, `Sondaggio indovinato: +${R.pollBonus}.`, `Previsione avanzata giusta: +${R.predictionBonus}.`])}
          <p style={{ margin: 0, fontFamily: F_BODY, fontSize: 11, color: C.dim, lineHeight: 1.5 }}>Nella demo i punti del weekend si calcolano dalla diretta demo: posizioni, posizioni guadagnate e giro più veloce (sorpassi, pilota del giorno e pit stop non ci sono). I chip del gioco ufficiale (3X, Wildcard, Limitless…) non ci sono. {FANTASY_SOURCE}.</p>
        </div>
      )}
    </div>
  );
}

function FantaScreen({ squad, setSquad, base, freeTransfers, budget, stats, race, lock, weekends = [], isPremium, onPremium, onToast, bonus = [], leagues, setLeagues, needAccount, predictions = [], predAnswers = {}, predLockOf, onAnswerPrediction }) {
  const [, setTick] = useState(0);
  useEffect(() => { const iv = setInterval(() => setTick(n => n + 1), 30000); return () => clearInterval(iv); }, []);
  const bonusPts = bonus.reduce((a, b) => a + b.pts, 0);
  const weekendPts = weekends.reduce((a, w) => a + w.total, 0);
  const total = MY_SEASON_PTS + weekendPts + bonusPts;
  const [activeLeague, setActiveLeague] = useState(leagues[0] ? leagues[0].id : null);
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [addDraft, setAddDraft] = useState("");
  const [newDraft, setNewDraft] = useState("");
  const league = leagues.find(l => l.id === activeLeague) || leagues[0];
  const me = { name: "Tu", nick: "Tu", team: squad.name, pts: total, color: C.accent, me: true };
  const rows = league ? [...league.members, me].sort((a, b) => b.pts - a.pts) : [me];
  const myPos = rows.findIndex(r => r.me) + 1;
  // I migliori di tutte le leghe (ognuno contato una volta sola).
  const everyone = [...new Map(leagues.flatMap(l => l.members).map(m => [m.name, m])).values(), me].sort((a, b) => b.pts - a.pts);
  const lockMsg = "Le leghe si modificano quando la squadra non è bloccata.";
  const TIPS = [
    { driver: "C. Leclerc", note: "Veloce nelle ultime gare: buon potenziale su un tracciato con curve veloci come Sepang." },
    { driver: "K. Antonelli", note: "Leader del mondiale: il 2X più sicuro per il weekend." },
  ];
  const updateLeague = fn => setLeagues(ls => ls.map(l => l.id === league.id ? fn(l) : l));
  const startEdit = () => { if (lock.locked) return; setNameDraft(league.name); setAddDraft(""); setEditing(true); };
  const saveName = () => { const n = nameDraft.trim(); if (!n) return; updateLeague(l => ({ ...l, name: n })); onToast("Nome della lega aggiornato"); };
  const addMember = () => {
    const n = addDraft.trim(); if (!n) return;
    if (league.members.some(m => m.name.toLowerCase() === n.toLowerCase())) { onToast(`${n} è già nella lega`); return; }
    updateLeague(l => ({ ...l, members: [...l.members, { name: n, nick: n.startsWith("@") ? n : "@" + n.toLowerCase().replace(/[^a-z0-9]+/g, "_"), team: "Nuova squadra", pts: 0, color: MEMBER_COLORS[l.members.length % MEMBER_COLORS.length] }] }));
    setAddDraft(""); onToast(`${n} aggiunto alla lega`);
  };
  const removeMember = name => { updateLeague(l => ({ ...l, members: l.members.filter(m => m.name !== name) })); onToast(`${name} rimosso dalla lega`); };
  const createLeague = () => {
    const n = newDraft.trim(); if (!n) return;
    const id = "l" + Date.now(), code = "BT-" + Math.random().toString(36).slice(2, 6).toUpperCase();
    setLeagues(ls => [...ls, { id, name: n, owner: true, code, members: [] }]);
    setActiveLeague(id); setCreating(false); setNewDraft(""); onToast(`Lega "${n}" creata`);
  };
  const input = { flex: 1, minWidth: 0, padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.05)", border: `1px solid ${C.border}`, fontFamily: F_BODY, fontSize: 13, color: C.text, outline: "none" };
  const smallBtn = (label, onClick, opts = {}) => <button className="press" onClick={onClick} disabled={opts.disabled} aria-label={opts.aria} style={{ flexShrink: 0, padding: "9px 12px", borderRadius: 10, background: opts.primary ? C.accent : "rgba(255,255,255,.07)", border: `1px solid ${opts.primary ? C.accent : C.border}`, fontFamily: F_HEAD, fontWeight: 800, fontSize: 12, color: "#fff", opacity: opts.disabled ? .45 : 1 }}>{label}</button>;
  const heading = (icon, text, right) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px 10px" }}>
      <Icon name={icon} size={15} color={C.accent} />
      <h2 style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 16, color: C.text, margin: 0 }}>{text}</h2>
      {right && <span style={{ marginLeft: "auto", fontFamily: F_BODY, fontSize: 11, color: C.dim }}>{right}</span>}
    </div>
  );
  const wk = race ? weekends.filter(w => w.raceId === race.id) : [];
  return (
    <div className="scrollcol" style={{ height: "100%" }}>
      <FantaSquadCard squad={squad} setSquad={setSquad} base={base} freeTransfers={freeTransfers} budget={budget} stats={stats} race={race} lock={lock} onToast={onToast} needAccount={needAccount} />

      <div style={{ margin: "0 16px 16px", padding: "16px", borderRadius: 18, background: C.card, border: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 11, color: C.dim, letterSpacing: 1 }}>PUNTI DELLA STAGIONE</span>
          <span style={{ padding: "4px 10px", borderRadius: 8, background: "rgba(231,179,76,.14)", fontFamily: F_HEAD, fontWeight: 800, fontSize: 11, color: C.gold }}>#{myPos} in lega</span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span data-fanta-total="" style={{ fontFamily: F_HEAD, fontWeight: 900, fontSize: 30, color: C.accent }}>{total}</span>
          <span style={{ fontFamily: F_BODY, fontSize: 12, color: C.muted }}>punti totali{bonusPts ? ` · di cui ${bonusPts} bonus` : ""}</span>
        </div>
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.divider}` }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
            <span style={{ flex: 1, fontFamily: F_HEAD, fontWeight: 800, fontSize: 12.5, color: C.text }}>Questo weekend{race ? " · " + race.name : ""}</span>
            <b data-weekend-pts="" style={{ fontFamily: F_HEAD, fontSize: 14, color: wk.length ? C.text : C.dim }}>{wk.reduce((a, w) => a + w.total, 0)} pt</b>
          </div>
          {wk.length ? wk.map(w => (
            <div key={w.id} data-weekend-row={w.type} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0", fontFamily: F_BODY, fontSize: 12, color: C.muted }}>
              <span style={{ flex: 1 }}>{w.type === "PEN" ? "Cambi oltre i gratis" : sessionLabelIt(w.type)}</span><b style={{ color: w.total < 0 ? C.accent : TIMING.green }}>{w.total > 0 ? "+" : ""}{w.total}</b>
            </div>
          )) : <p style={{ margin: 0, fontFamily: F_BODY, fontSize: 11.5, color: C.dim, lineHeight: 1.45 }}>I punti arrivano con qualifiche e gara (nella demo: Profilo → Pannello Admin → GARA LIVE).</p>}
        </div>
      </div>

      {heading("sparkle", "PREVISIONI AVANZATE", "+1 punto a risposta")}
      <div style={{ padding: "0 16px 6px" }}>
        {predictions.map(q => <PredictionCard key={q.id} q={q} answer={predAnswers[q.id] != null ? predAnswers[q.id] : null} lock={predLockOf(q)} onAnswer={v => onAnswerPrediction(q, v)} />)}
      </div>

      <div style={{ margin: "0 16px 16px", padding: "12px 14px", borderRadius: 16, background: C.card, border: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: bonus.length ? 8 : 4 }}>
          <Icon name="sparkle" size={14} color={C.gold} />
          <span style={{ flex: 1, fontFamily: F_HEAD, fontWeight: 800, fontSize: 13, color: C.text }}>Punti bonus dei pronostici</span>
          <span data-bonus-total="" style={{ fontFamily: F_HEAD, fontWeight: 900, fontSize: 14, color: bonusPts ? C.gold : C.dim }}>+{bonusPts}</span>
        </div>
        {bonus.length ? bonus.map(x => (
          <div key={x.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontFamily: F_BODY, fontSize: 12, color: C.muted }}>
            <span style={{ flex: 1 }}>{x.label}</span><b style={{ color: TIMING.green }}>+{x.pts}</b>
          </div>
        )) : <p style={{ margin: 0, fontFamily: F_BODY, fontSize: 11.5, color: C.dim, lineHeight: 1.45 }}>Meteo delle sessioni (pagina Race → Meteo) e sondaggi indovinati valgono +2 punti; ogni previsione avanzata giusta +1.</p>}
      </div>

      {heading("trophy", "I MIGLIORI DI TUTTE LE LEGHE")}
      <div data-fanta-podium="" style={{ margin: "0 16px 16px", padding: "14px 12px 0", borderRadius: 18, background: C.card, border: `1px solid ${C.border}`, overflow: "hidden" }}>
        <Podium label="Podio di tutte le leghe B&T" items={everyone.slice(0, 3).map((u, i) => ({ title: u.me ? "Tu" : u.nick || u.name, value: fmtPts(u.pts), figure: <UserFigure user={u} place={i + 1} /> }))} />
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px 10px" }}>
        <span style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 11, color: C.dim, letterSpacing: 1 }}>LE MIE LEGHE</span>
      </div>
      <div style={{ display: "flex", gap: 8, padding: "0 16px 12px", overflowX: "auto" }}>
        {leagues.map(l => (
          <button key={l.id} className="press" onClick={() => { setActiveLeague(l.id); setEditing(false); }} style={{ flexShrink: 0, padding: "9px 14px", borderRadius: 20, background: league && league.id === l.id ? C.accent : C.card, border: `1px solid ${league && league.id === l.id ? C.accent : C.border}`, fontFamily: F_HEAD, fontWeight: 700, fontSize: 12, color: league && league.id === l.id ? "#fff" : C.muted }}>{l.name}</button>
        ))}
        <button className="press" onClick={() => isPremium ? (lock.locked ? onToast(lockMsg) : setCreating(c => !c)) : onPremium()} style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 5, padding: "9px 14px", borderRadius: 20, background: "rgba(231,179,76,.1)", border: "1px solid rgba(231,179,76,.3)" }}>
          {!isPremium && <Icon name="lock" size={11} color={C.gold} />}
          <span style={{ fontFamily: F_HEAD, fontWeight: 700, fontSize: 12, color: C.gold }}>+ Nuova lega</span>
        </button>
      </div>
      {creating && (
        <div style={{ display: "flex", gap: 8, margin: "0 16px 12px" }}>
          <label htmlFor="leagueNew" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}>Nome della nuova lega</label>
          <input id="leagueNew" value={newDraft} onChange={e => setNewDraft(e.target.value)} placeholder="Nome della nuova lega" style={input} />
          {smallBtn("Crea lega", createLeague, { primary: true, disabled: !newDraft.trim() })}
        </div>
      )}
      {league && (
        <div style={{ margin: "0 16px 14px", padding: "12px 14px", borderRadius: 16, background: C.card, border: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 14, color: C.text }}>{league.name}</div>
              <div style={{ fontFamily: F_BODY, fontSize: 11, color: C.dim, marginTop: 2 }}>{league.owner ? "Creata da te" : "Sei un membro"} · {league.members.length + 1} {league.members.length ? "partecipanti" : "partecipante"} · codice invito {league.code}</div>
            </div>
            {league.owner && !editing && smallBtn("Modifica lega", startEdit, { disabled: lock.locked })}
          </div>
          {league.owner && lock.locked && <p style={{ margin: "8px 0 0", fontFamily: F_BODY, fontSize: 11.5, color: C.dim }}>{lockMsg}</p>}
          {editing && !lock.locked && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.divider}` }}>
              <label htmlFor="leagueName" style={{ display: "block", fontFamily: F_BODY, fontWeight: 700, fontSize: 10.5, color: C.dim, letterSpacing: .8, marginBottom: 6 }}>NOME DELLA LEGA</label>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input id="leagueName" value={nameDraft} onChange={e => setNameDraft(e.target.value)} style={input} />
                {smallBtn("Salva nome", saveName, { disabled: !nameDraft.trim() })}
              </div>
              <span style={{ display: "block", fontFamily: F_BODY, fontWeight: 700, fontSize: 10.5, color: C.dim, letterSpacing: .8, marginBottom: 6 }}>MEMBRI</span>
              {league.members.map(m => (
                <div key={m.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: m.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontFamily: F_BODY, fontSize: 13, color: C.text }}>{m.name}</span>
                  <button className="press" aria-label={`Rimuovi ${m.name}`} onClick={() => removeMember(m.name)} style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,.06)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="close" size={11} sw={2.4} /></button>
                </div>
              ))}
              <label htmlFor="leagueAdd" style={{ display: "block", fontFamily: F_BODY, fontWeight: 700, fontSize: 10.5, color: C.dim, letterSpacing: .8, margin: "10px 0 6px" }}>AGGIUNGI UN AMICO</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input id="leagueAdd" value={addDraft} onChange={e => setAddDraft(e.target.value)} placeholder="Nome o nickname" style={input} />
                {smallBtn("Aggiungi", addMember, { disabled: !addDraft.trim() })}
              </div>
              <p style={{ margin: "8px 0 12px", fontFamily: F_BODY, fontSize: 11, color: C.dim }}>Oppure manda il codice invito {league.code}: chi lo inserisce entra nella lega.</p>
              {smallBtn("Fatto", () => setEditing(false), { primary: true })}
            </div>
          )}
        </div>
      )}

      {heading("trophy", "CLASSIFICA LEGA", league ? league.name : "")}
      <div data-league-table="" style={{ margin: "0 16px 16px", borderRadius: 18, background: C.card, border: `1px solid ${C.border}`, overflow: "hidden" }}>
        {rows.map((u, i) => (
          <div key={u.name} data-league-me={u.me ? u.pts : undefined}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", background: u.me ? "rgba(232,18,29,.07)" : "transparent" }}>
              <span style={{ width: 20, fontFamily: F_HEAD, fontWeight: 800, fontSize: 15, color: C.text }}>{i + 1}</span>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: u.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontFamily: F_BODY, fontWeight: u.me ? 700 : 600, fontSize: 13, color: C.text }}>{u.name}</span>
                  {u.me && <span style={{ padding: "1px 6px", borderRadius: 5, background: C.accent, fontFamily: F_HEAD, fontWeight: 800, fontSize: 9, color: "#fff" }}>TU</span>}
                </div>
                <div style={{ fontFamily: F_BODY, fontSize: 10, color: C.dim }}>{u.me ? squad.name : `${u.nick || ""}${u.nick ? " · " : ""}${u.team}`}{u.me && bonusPts ? ` · +${bonusPts} bonus pronostici` : ""}</div>
              </div>
              <span style={{ fontFamily: F_BODY, fontWeight: u.me ? 700 : 600, fontSize: 12, color: u.me ? C.text : C.dim, flexShrink: 0 }}>{fmtPts(u.pts)}</span>
            </div>
            {i < rows.length - 1 && <div style={{ height: 1, background: C.divider, margin: "0 14px" }} />}
          </div>
        ))}
      </div>

      <div style={{ padding: "0 16px 12px" }}>
        {isPremium ? (
          <div style={{ padding: 16, borderRadius: 16, background: C.card, border: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Icon name="bulb" size={15} color={C.gold} />
              <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 13, color: C.text }}>Consigli formazione pre-gara</span>
            </div>
            {TIPS.map((t, i) => (
              <div key={t.driver} style={{ display: "flex", gap: 8, marginTop: i > 0 ? 10 : 0 }}>
                <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 12, color: C.gold, flexShrink: 0 }}>{t.driver}</span>
                <span style={{ fontFamily: F_BODY, fontSize: 12, color: C.muted, lineHeight: 1.4 }}>{t.note}</span>
              </div>
            ))}
          </div>
        ) : (
          <PremiumLockCard icon="bulb" title="Consigli formazione pre-gara" desc="Suggerimenti della redazione su chi schierare prima di ogni weekend." onPremium={onPremium} />
        )}
      </div>

      <FantaRules />
    </div>
  );
}

function ProfiloScreen({ ig, onOpenIg, trial = null, trialUsed = false, onBack, onNotifiche, onPremium, onAdmin, onLogout, isPremium, onAbout, onHelp, aboutMe, onSaveAboutMe, favTeam, favDriver, onPickTeam, onPickDriver, guest, onLogin, onTerms, blocked = [], onUnblock, onDeleteAccount, savedCount = 0, onOpenSaved }) {
  const ft = favTeam ? teamById(favTeam) : null;
  const fd = favDriver ? driverById(favDriver) : null;
  const favRows = [
    { key: "team", icon: "flag", label: "Scuderia del cuore", value: ft ? ft.name : "Scegli", color: ft && ft.color, tag: ft && ft.tag, onClick: onPickTeam },
    { key: "driver", icon: "heart", label: "Pilota del cuore", value: fd ? fd.full : "Scegli", color: fd && fd.color, tag: fd && fd.tag, onClick: onPickDriver },
    { key: "saved", icon: "bookmark", label: "Articoli salvati", value: savedCount ? `${savedCount} ${savedCount === 1 ? "articolo" : "articoli"}` : "Nessuno", color: savedCount ? C.gold : null, onClick: onOpenSaved },
  ];
  const [editing, setEditing] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [name, setName] = useState("Edoardo");
  const [email, setEmail] = useState("edoardo@bt-app.demo");
  const rows = [
    { icon: "bell", label: "Notifiche", onClick: onNotifiche, chevron: true },
    ...(isPremium ? [{ icon: "unlock", label: "Accesso anticipato", onClick: null, badge: "BETA" }] : []),
    { icon: "gear", label: "Pannello Admin · Pubblica notizia", onClick: onAdmin, badge: "ADMIN" },
    { icon: "help", label: "Assistenza", onClick: onHelp, chevron: true },
    { icon: "info", label: "Info su B&T", onClick: onAbout, chevron: true },
    { icon: "lock", label: "Privacy Policy", onClick: () => openUrl(PRIVACY_URL), chevron: true },
    { icon: "doc", label: "Termini e Condizioni", onClick: onTerms, chevron: true },
  ];
  const initials = (name.trim().slice(0, 2) || "B&T").toUpperCase();
  return (
    <div className="scrollcol" style={{ height: "100%" }}>
      <SubHeader title="PROFILO" onBack={onBack} />
      {guest ? (
        <div style={{ margin: "6px 20px 22px", padding: "22px 18px", borderRadius: 18, background: C.card, border: `1px solid ${C.border}`, textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(255,255,255,.07)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}><Icon name="person" size={26} color={C.muted} /></div>
          <h2 style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 17, color: C.text, margin: "0 0 4px" }}>Stai navigando come ospite</h2>
          <p style={{ fontFamily: F_BODY, fontSize: 12.5, color: C.muted, lineHeight: 1.5, margin: "0 0 16px" }}>Crea un account per scrivere in chat, giocare a FantaF1 e ricevere le notizie sulla tua scuderia e sul tuo pilota del cuore.</p>
          <button className="press" onClick={onLogin} style={{ display: "block", width: "100%", padding: "13px 0", borderRadius: 12, background: C.accent, fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 13.5, color: "#fff" }}>ACCEDI O REGISTRATI</button>
        </div>
      ) : (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "14px 24px 22px" }}>
        <div style={{ position: "relative" }}>
          <div style={{ width: 84, height: 84, borderRadius: "50%", background: C.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 26, color: "#fff" }}>{initials}</span>
          </div>
          <button className="press" aria-label={editing ? "Salva profilo" : "Modifica profilo"} onClick={() => setEditing(e => !e)} style={{ position: "absolute", bottom: -2, right: -2, width: 30, height: 30, borderRadius: "50%", background: editing ? C.accent : C.card, border: `2px solid ${C.bg}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name={editing ? "check" : "edit"} size={13} color={editing ? "#fff" : C.text} sw={2.3} />
          </button>
        </div>
        {editing ? (
          <div style={{ width: "100%", marginTop: 18 }}>
            <label style={{ display: "block", fontFamily: F_BODY, fontWeight: 600, fontSize: 11.5, color: C.muted, marginBottom: 5 }} htmlFor="pfName">Nome</label>
            <input id="pfName" value={name} onChange={e => setName(e.target.value)} style={{ width: "100%", padding: "11px 13px", borderRadius: 12, background: C.card, border: `1px solid ${C.border}`, fontFamily: F_BODY, fontSize: 13, color: C.text, marginBottom: 10 }} />
            <label style={{ display: "block", fontFamily: F_BODY, fontWeight: 600, fontSize: 11.5, color: C.muted, marginBottom: 5 }} htmlFor="pfEmail">Email</label>
            <input id="pfEmail" type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: "100%", padding: "11px 13px", borderRadius: 12, background: C.card, border: `1px solid ${C.border}`, fontFamily: F_BODY, fontSize: 13, color: C.text, marginBottom: 12 }} />
            <button className="press" onClick={() => setEditing(false)} style={{ display: "block", width: "100%", padding: "12px 0", borderRadius: 12, background: C.accent, fontFamily: F_HEAD, fontWeight: 800, fontSize: 13, color: "#fff", textAlign: "center" }}>SALVA</button>
          </div>
        ) : (
          <>
            <h2 style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 18, color: C.text, margin: "14px 0 3px" }}>{name}</h2>
            <span style={{ fontFamily: F_BODY, fontSize: 12, color: C.muted }}>{email}</span>
          </>
        )}
      </div>
      )}
      {ig && onOpenIg && <IgBigButton ig={ig} onOpen={onOpenIg} />}
      {!guest && <AboutCard about={aboutMe} onSave={onSaveAboutMe} />}

      <button className="press" onClick={onPremium} style={{ display: "block", textAlign: "left", width: "calc(100% - 40px)", margin: "0 20px 22px", padding: 16, borderRadius: 18, background: "rgba(231,179,76,.1)", border: "1px solid rgba(231,179,76,.3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
          <Icon name="star" size={16} color={C.gold} />
          <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 14, color: C.gold }}>{isPremium && trial ? "Prova gratuita Premium" : isPremium ? "Sei B&T Premium" : "Passa a Premium"}</span>
          <div style={{ flexGrow: 1 }} />
          <Icon name="chevron" size={16} color={C.gold} />
        </div>
        <p style={{ margin: 0, fontFamily: F_BODY, fontSize: 12, color: "#D8C8A8", lineHeight: 1.5 }}>{isPremium && trial
          ? `${trialDaysLeft(trial)} giorni rimasti · fino al ${fmtDay(trial.end)}. Poi puoi abbonarti o disdire quando vuoi.`
          : isPremium ? "Grazie per il supporto: tutti i contenuti esclusivi sono sbloccati."
          : trialUsed ? "Rimuovi la pubblicità e sblocca tutti i contenuti esclusivi B&T." : "Prova gratis per 2 settimane: niente pubblicità e tutti i contenuti esclusivi B&T."}</p>
      </button>

      <div style={{ padding: "0 24px 10px" }}><span style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 11, color: C.dim, letterSpacing: 1 }}>I MIEI PREFERITI</span></div>
      <div style={{ margin: "0 20px 8px", borderRadius: 18, background: C.card, border: `1px solid ${C.border}`, overflow: "hidden" }}>
        {favRows.map((r, i) => (
          <div key={r.key}>
            <button className="press" onClick={r.onClick} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: 14, textAlign: "left" }}>
              {r.key === "driver" && fd ? <Headshot driver={fd} size={36} /> : <div style={{ width: 36, height: 36, borderRadius: 10, background: r.color ? r.color + "26" : "rgba(255,255,255,.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name={r.icon} size={16} color={r.color || C.text} /></div>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: F_BODY, fontSize: 11, color: C.dim }}>{r.label}</div>
                <div style={{ fontFamily: F_BODY, fontWeight: 600, fontSize: 14, color: r.color ? C.text : C.muted }}>{r.value}</div>
              </div>
              {r.tag && <span style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 11, color: r.color }}>{r.tag}</span>}
              <Icon name="chevron" size={16} color={C.dim} />
            </button>
            {i < favRows.length - 1 && <div style={{ height: 1, background: C.divider, margin: "0 14px" }} />}
          </div>
        ))}
      </div>
      <p style={{ margin: "0 24px 22px", fontFamily: F_BODY, fontSize: 11, color: C.dim, lineHeight: 1.45 }}>Riceverai una notifica quando pubblichiamo notizie sulla tua scuderia e sul tuo pilota del cuore. Puoi disattivarle dalla sezione Notifiche.</p>

      {blocked.length > 0 && <>
        <div style={{ padding: "0 24px 10px" }}><span style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 11, color: C.dim, letterSpacing: 1 }}>UTENTI BLOCCATI</span></div>
        <div style={{ margin: "0 20px 18px", borderRadius: 18, background: C.card, border: `1px solid ${C.border}`, overflow: "hidden" }}>
          {blocked.map((b, i) => (
            <div key={b.name}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="no" size={16} /></div>
                <span style={{ flex: 1, fontFamily: F_BODY, fontWeight: 600, fontSize: 14, color: C.text }}>{b.name}</span>
                <button className="press" onClick={() => onUnblock && onUnblock(b.name)} style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${C.border}`, fontFamily: F_BODY, fontWeight: 600, fontSize: 12, color: C.muted }}>Sblocca</button>
              </div>
              {i < blocked.length - 1 && <div style={{ height: 1, background: C.divider, margin: "0 14px" }} />}
            </div>
          ))}
        </div>
      </>}

      <div style={{ padding: "0 24px 10px" }}><span style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 11, color: C.dim, letterSpacing: 1 }}>IMPOSTAZIONI</span></div>
      <div style={{ margin: "0 20px 18px", borderRadius: 18, background: C.card, border: `1px solid ${C.border}`, overflow: "hidden" }}>
        {rows.map((r, i) => (
          <div key={r.label}>
            <button className="press" onClick={r.onClick || undefined} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: 14, textAlign: "left" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name={r.icon} size={16} /></div>
              <span style={{ flex: 1, fontFamily: F_BODY, fontWeight: 600, fontSize: 14, color: C.text }}>{r.label}</span>
              {r.badge && <span style={{ padding: "2px 8px", borderRadius: 6, background: "rgba(231,179,76,.16)", fontFamily: F_HEAD, fontWeight: 800, fontSize: 9, color: C.gold, letterSpacing: .4 }}>{r.badge}</span>}
              {r.chevron && <Icon name="chevron" size={16} color={C.dim} />}
            </button>
            {i < rows.length - 1 && <div style={{ height: 1, background: C.divider, margin: "0 14px" }} />}
          </div>
        ))}
      </div>

      <button className="press" onClick={guest ? onLogin : onLogout} style={{ display: "flex", alignItems: "center", gap: 12, width: "calc(100% - 40px)", margin: "0 20px", padding: 14, borderRadius: 18, background: C.card, border: `1px solid ${C.border}`, textAlign: "left" }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="logout" size={16} /></div>
        <span style={{ flex: 1, fontFamily: F_BODY, fontWeight: 600, fontSize: 14, color: C.text }}>{guest ? "Accedi" : "Esci"}</span>
      </button>
      {!guest && (
        <button className="press" onClick={() => setConfirmDel(true)} style={{ display: "flex", alignItems: "center", gap: 12, width: "calc(100% - 40px)", margin: "10px 20px 0", padding: 14, borderRadius: 18, border: `1px solid ${C.border}`, textAlign: "left" }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,.04)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="trash" size={16} color={C.muted} /></div>
          <span style={{ flex: 1, fontFamily: F_BODY, fontWeight: 600, fontSize: 14, color: C.muted }}>Elimina account</span>
        </button>
      )}
      <p style={{ textAlign: "center", fontFamily: F_BODY, fontSize: 10, color: C.dim, lineHeight: 1.55, padding: "18px 28px 22px", margin: 0 }}>{F1_DISCLAIMER}</p>
      {confirmDel && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.85)", zIndex: 650, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "26px 22px 18px", maxWidth: 330, width: "100%", textAlign: "center" }}>
            <Icon name="trash" size={30} color={C.accent} />
            <h2 style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 19, color: C.text, margin: "12px 0 8px" }}>Eliminare l'account?</h2>
            <p style={{ fontFamily: F_BODY, fontSize: 13, color: C.muted, lineHeight: 1.6, margin: "0 0 18px" }}>Cancelleremo il tuo profilo, i messaggi che hai scritto in chat e le segnalazioni che hai inviato. L'operazione non si può annullare.</p>
            <button className="press" onClick={() => { setConfirmDel(false); onDeleteAccount && onDeleteAccount(); }} style={{ display: "block", width: "100%", padding: "14px 0", borderRadius: 14, background: C.accent, fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 13.5, color: "#fff", marginBottom: 6 }}>ELIMINA DEFINITIVAMENTE</button>
            <button className="press" onClick={() => setConfirmDel(false)} style={{ display: "block", width: "100%", padding: "12px 0", fontFamily: F_BODY, fontWeight: 600, fontSize: 13, color: C.muted }}>Annulla</button>
          </div>
        </div>
      )}
    </div>
  );
}

function NotificheScreen({ onBack, notifs, onReadAll, isPremium, onPremium, favTeam, favDriver, prefs, onPrefs, onGoProfilo }) {
  const ft = favTeam ? teamById(favTeam) : null;
  const fd = favDriver ? driverById(favDriver) : null;
  const prefRows = [
    { key: "team", title: ft ? `News su ${ft.name}` : "News sulla scuderia del cuore", sub: ft ? ft.tag : "Nessuna scuderia scelta", color: ft && ft.color, enabled: !!ft },
    { key: "driver", title: fd ? `News su ${fd.full}` : "News sul pilota del cuore", sub: fd ? fd.tag : "Nessun pilota scelto", color: fd && fd.color, enabled: !!fd },
  ];
  return (
    <div className="scrollcol" style={{ height: "100%" }}>
      <SubHeader title="NOTIFICHE" onBack={onBack} />
      <div style={{ padding: "0 24px 8px" }}><span style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 11, color: C.dim, letterSpacing: 1 }}>NOTIZIE DEDICATE</span></div>
      <div style={{ margin: "0 20px 8px", borderRadius: 16, background: C.card, border: `1px solid ${C.border}`, overflow: "hidden" }}>
        {prefRows.map((r, i) => (
          <div key={r.key}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px" }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: r.color || "rgba(255,255,255,.2)", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: F_BODY, fontWeight: 600, fontSize: 13, color: C.text }}>{r.title}</div>
                <div style={{ fontFamily: F_BODY, fontSize: 11, color: r.color || C.dim }}>{r.sub}</div>
              </div>
              <Toggle on={r.enabled && prefs[r.key]} disabled={!r.enabled} onChange={v => onPrefs({ ...prefs, [r.key]: v })} label={r.title} />
            </div>
            {i < prefRows.length - 1 && <div style={{ height: 1, background: C.divider, margin: "0 14px" }} />}
          </div>
        ))}
      </div>
      {(!ft || !fd) && (
        <button className="press" onClick={onGoProfilo} style={{ display: "block", margin: "0 24px 12px", fontFamily: F_BODY, fontWeight: 600, fontSize: 12, color: C.accent }}>Scegli scuderia e pilota del cuore nel profilo →</button>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 20px 10px" }}>
        <button className="press" onClick={onReadAll} style={{ fontFamily: F_BODY, fontWeight: 600, fontSize: 12, color: C.accent }}>Segna tutte come lette</button>
      </div>
      <div style={{ padding: "0 20px 16px" }}>
        {isPremium ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, background: C.card, border: `1px solid ${C.border}` }}>
            <Icon name="bell" size={15} color={C.gold} />
            <span style={{ flex: 1, fontFamily: F_BODY, fontWeight: 600, fontSize: 12.5, color: C.text }}>Avvisi in gara sul tuo pilota attivi</span>
            <Icon name="check" size={14} color={C.green} sw={2.4} />
          </div>
        ) : (
          <PremiumLockCard icon="bell" title="Avvisi in tempo reale" desc="Sorpassi, pit stop e giri veloci del tuo pilota durante la gara." onPremium={onPremium} />
        )}
      </div>
      {notifs.map((n, i) => (
        <div key={i}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 20px", background: n.unread ? "rgba(232,18,29,.06)" : "transparent" }}>
            {n.bg === "gold-soft"
              ? <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(231,179,76,.16)", border: "1px solid rgba(231,179,76,.35)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="star" size={16} color={C.gold} /></div>
              : <IconCircle name={n.icon} bg={n.bg} stroke={n.stroke} size={40} filled />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontFamily: F_HEAD, fontWeight: 700, fontSize: 13, color: C.text }}>{n.title}</span>
              <p style={{ margin: "3px 0 0", fontFamily: F_BODY, fontSize: 12, color: C.muted, lineHeight: 1.4 }}>{n.body}</p>
              <span style={{ display: "block", marginTop: 6, fontFamily: F_BODY, fontSize: 10, color: C.dim }}>{n.time}</span>
            </div>
          </div>
          {i < notifs.length - 1 && <div style={{ height: 1, background: C.divider }} />}
        </div>
      ))}
      <p style={{ textAlign: "center", fontFamily: F_BODY, fontSize: 11, color: C.dim, padding: "18px 32px 24px", margin: 0 }}>Nessun'altra notifica</p>
    </div>
  );
}

// Stesso codice di accesso del pannello admin dell'app vera
const ADMIN_CODE = "080824";

function AdminKeypad({ onOk, onCancel }) {
  const [code, setCode] = useState("");
  const [err, setErr] = useState(false);
  const [ok, setOk] = useState(false);
  const press = (d) => {
    if (code.length >= 6 || ok) return;
    const nc = code + d; setCode(nc); setErr(false);
    if (nc.length === 6) {
      if (nc === ADMIN_CODE) { setOk(true); setTimeout(onOk, 450); }
      else setTimeout(() => { setCode(""); setErr(true); setTimeout(() => setErr(false), 1200); }, 300);
    }
  };
  const del = () => { if (!ok) { setCode(c => c.slice(0, -1)); setErr(false); } };
  const glow = err ? "#ff2020" : ok ? C.green : "#3aa0ff";
  const key = { width: 72, height: 58, borderRadius: 12, background: "linear-gradient(160deg,#4a4a4f,#2c2c30 60%,#38383d)", border: "1px solid #57575c", boxShadow: "0 5px 12px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.12)", color: "#ececec", fontFamily: F_BODY, fontSize: 22, fontWeight: 300, display: "flex", alignItems: "center", justifyContent: "center" };
  return (
    <div style={{ height: "100%", background: "#060606", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, position: "relative" }}>
      <button className="press" aria-label="Indietro" onClick={onCancel} style={{ position: "absolute", top: 18, left: 16, width: 38, height: 38, borderRadius: "50%", background: C.card, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon name="back" size={17} />
      </button>
      <div style={{ width: 54, height: 54, borderRadius: 16, background: "rgba(232,18,29,.12)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}><Icon name="lock" size={24} color={C.accent} /></div>
      <h2 style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 19, color: "#fff", margin: "0 0 4px" }}>PANNELLO ADMIN</h2>
      <p role="status" style={{ fontFamily: F_BODY, fontSize: 13, color: err ? "#ff5a5a" : "#6b6b70", margin: "0 0 24px" }}>{err ? "Codice errato, riprova" : ok ? "Accesso consentito" : "Inserisci il codice di accesso"}</p>
      <div aria-label={`${code.length} cifre su 6`} style={{ display: "flex", gap: 12, marginBottom: 28 }}>
        {[0, 1, 2, 3, 4, 5].map(i => (
          <span key={i} style={{ width: 13, height: 13, borderRadius: "50%", transition: "all .15s", background: err ? "#ff2020" : ok ? C.green : i < code.length ? "#fff" : "#26262a", boxShadow: i < code.length ? `0 0 12px ${glow}` : "none" }} />
        ))}
      </div>
      <div style={{ background: "linear-gradient(160deg,#3a3a3e,#242428,#303034)", borderRadius: 16, padding: 18, border: "1px solid #48484c", boxShadow: `0 14px 50px rgba(0,0,0,.9), 0 0 60px ${glow}33` }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,72px)", gap: 9 }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, "del"].map((d, i) => {
            if (d === null) return <span key={i} />;
            if (d === "del") return <button key={i} className="press" aria-label="Cancella" onClick={del} style={{ ...key, background: "transparent", border: "none", boxShadow: "none" }}><Icon name="back" size={20} color="#bbb" /></button>;
            return <button key={i} className="press" onClick={() => press(String(d))} style={key}>{d}</button>;
          })}
        </div>
      </div>
    </div>
  );
}

/* ── PANNELLO ADMIN (stesse sezioni della versione vecchia) ─────────── */
const ADMIN_TABS = ["NEWS", "SONDAGGI", "FANTA F1", "PREVISIONI", "CLASSIFICHE", "GARA LIVE", "MERCATO", "INSTAGRAM", "VIDEO", "NOTIFICHE", "CHAT"];
const aInput = { width: "100%", padding: "10px 12px", borderRadius: 10, background: "#101013", border: `1px solid ${C.border}`, fontFamily: F_BODY, fontSize: 13, color: C.text, boxSizing: "border-box" };
const aNum = { ...aInput, padding: "8px 6px", textAlign: "center", fontSize: 12.5 };
const aLabel = { display: "block", fontFamily: F_BODY, fontWeight: 700, fontSize: 10.5, letterSpacing: .8, color: C.dim, margin: "0 0 6px" };
const aCard = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 14 };
const aTitle = { fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 13, color: C.accent, margin: "4px 0 10px", letterSpacing: .3 };
const aChip = (active, color = C.accent) => ({ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: 999, background: active ? color + "33" : "rgba(255,255,255,.04)", border: `1px solid ${active ? color : C.border}`, fontFamily: F_BODY, fontWeight: 600, fontSize: 11.5, color: active ? C.text : C.muted });
function ABtn({ children, onClick, disabled, kind = "primary", style }) {
  const bg = kind === "primary" ? C.accent : "rgba(255,255,255,.07)";
  return <button className="press" onClick={onClick} disabled={disabled} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "12px 0", borderRadius: 12, background: bg, opacity: disabled ? .45 : 1, fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 13, color: "#fff", ...style }}>{children}</button>;
}
function TrashBtn({ onClick, label }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => { if (!armed) return; const t = setTimeout(() => setArmed(false), 2500); return () => clearTimeout(t); }, [armed]);
  return <button className="press" aria-label={label} onClick={() => armed ? onClick() : setArmed(true)} style={{ flexShrink: 0, padding: armed ? "6px 9px" : 6, borderRadius: 8, background: armed ? "rgba(232,18,29,.18)" : "transparent", fontFamily: F_BODY, fontWeight: 700, fontSize: 10.5, color: C.accent }}>{armed ? "Elimina?" : <Icon name="trash" size={15} color={C.dim} />}</button>;
}
// Legge un'immagine scelta dal telefono e la ridimensiona (max 1280px) per non appesantire l'app
const readImage = (file, cb, onErr) => {
  if (file.type && !file.type.startsWith("image/")) { onErr && onErr("Il file scelto non è un'immagine."); return; }
  const r = new FileReader();
  r.onerror = () => onErr && onErr("Impossibile leggere il file, riprova.");
  r.onload = () => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 1280 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      const dataUrl = c.toDataURL("image/jpeg", .85);
      if (c.toBlob) c.toBlob(blob => cb(dataUrl, blob), "image/jpeg", .85); else cb(dataUrl, null);
    };
    img.onerror = () => onErr && onErr("Formato non supportato: usa una foto JPG o PNG.");
    img.src = r.result;
  };
  r.readAsDataURL(file);
};

// Spazio di archiviazione per le foto (come lo Storage dell'app vera). Se non disponibile, la foto resta in memoria.
let assetsPromise = null;
const getAssets = () => {
  if (!assetsPromise) assetsPromise = (window.claude && typeof window.claude.use === "function") ? window.claude.use("assets").catch(() => null) : Promise.resolve(null);
  return assetsPromise;
};

// Pulsante "Allega immagine" come nella vecchia app: il tocco arriva direttamente al campo file vero,
// che è trasparente e copre tutto il pulsante (funziona anche dove l'apertura "comandata" è bloccata).
function ImagePicker({ id, value, onChange, label = "Allega immagine", changeLabel = "Cambia immagine", compact }) {
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const [url, setUrl] = useState("");
  const onFile = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setErr(null); setBusy(true);
    readImage(file, async (dataUrl, blob) => {
      const assets = blob ? await getAssets() : null;
      if (assets) {
        try { const res = await assets.upload(blob, { type: "image/jpeg" }); setBusy(false); onChange(res.url); return; }
        catch (x) { /* caricamento non riuscito: uso la copia in memoria */ }
      }
      setBusy(false); onChange(dataUrl);
    }, msg => { setBusy(false); setErr(msg); });
  };
  const useUrl = () => {
    const u = url.trim();
    if (!/^https?:\/\/\S+$/i.test(u)) { setErr("Incolla un link che inizia con http:// o https://"); return; }
    onChange(u); setUrl(""); setShowUrl(false); setErr(null);
  };
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ position: "relative", borderRadius: 10, overflow: "hidden" }}>
        <div aria-hidden="true" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, width: "100%", padding: compact ? "9px 0" : "10px 0", borderRadius: 10, background: "rgba(255,255,255,.06)", border: `1px solid ${C.border}`, fontFamily: F_BODY, fontWeight: 600, fontSize: 12.5, color: C.text, opacity: busy ? .6 : 1 }}>
          <Icon name="image" size={15} />{busy ? "Caricamento…" : value ? changeLabel : label}
        </div>
        <input id={id} type="file" accept="image/*" disabled={busy} onChange={onFile} aria-label={value ? changeLabel : label} title={value ? changeLabel : label}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", fontSize: 40, zIndex: 1 }} />
      </div>
      <button type="button" className="press" onClick={() => { setShowUrl(v => !v); setErr(null); }} style={{ display: "block", margin: "6px 2px 0", fontFamily: F_BODY, fontSize: 11, color: C.dim, textDecoration: "underline" }}>{showUrl ? "Annulla" : "oppure incolla un link"}</button>
      {showUrl && (
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          <input aria-label="Link immagine" placeholder="https://…" value={url} onChange={e => setUrl(e.target.value)} style={{ ...aInput, padding: "8px 10px", fontSize: 12 }} />
          <button type="button" className="press" onClick={useUrl} style={{ padding: "0 12px", borderRadius: 10, background: C.accent, fontFamily: F_HEAD, fontWeight: 800, fontSize: 11.5, color: "#fff", flexShrink: 0 }}>USA</button>
        </div>
      )}
      {err && <p role="alert" style={{ margin: "6px 2px 0", fontFamily: F_BODY, fontSize: 11.5, color: "#ff6b6b" }}>{err}</p>}
    </div>
  );
}

function AdminNewsTab({ articles, setArticles, onPublish, onToast }) {
  const empty = { title: "", summary: "", cat: "NEWS", author: "Team B&T", image: "", body: "", published: true };
  const [f, setF] = useState(empty);
  const [customCat, setCustomCat] = useState(false);
  const [teams, setTeams] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [circuits, setCircuits] = useState([]);
  const [pollOn, setPollOn] = useState(false);
  const [pollQ, setPollQ] = useState("");
  const [pollOpts, setPollOpts] = useState(["", "", "", ""]);
  const [error, setError] = useState(null);
  const [imgBroken, setImgBroken] = useState(false);
  const set = (k, v) => { if (k === "image") setImgBroken(false); setF(p => ({ ...p, [k]: v })); setError(null); };
  const toggle = (list, setList, id) => setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
  const preview = articleTags({ teams, drivers });
  const publish = () => {
    if (!f.title.trim()) { setError("Scrivi almeno un titolo."); return; }
    if (!f.cat.trim()) { setError("Scegli o scrivi una categoria."); return; }
    const body = f.body.trim() || f.summary.trim() || "Articolo pubblicato dalla redazione B&T.";
    const opts = pollOpts.map(o => o.trim()).filter(Boolean);
    if (pollOn && (!pollQ.trim() || opts.length < 2)) { setError("Per il sondaggio servono la domanda e almeno 2 risposte."); return; }
    const poll = pollOn ? { q: pollQ.trim(), answer: null, options: opts.map((label, k) => ({ id: "o" + (k + 1), label, base: 0 })) } : undefined;
    // Il modulo si svuota solo se la notizia è salvata su Firebase; altrimenti resta per riprovare.
    Promise.resolve(onPublish({ title: f.title.trim(), excerpt: (f.summary.trim() || body.split("\n")[0]).slice(0, 140), cat: f.cat.trim().toUpperCase(), premium: customCat, author: f.author.trim(), image: f.image, body, published: f.published, teams, drivers, circuits, ...(poll ? { poll } : {}) })).then(ok => {
      if (ok === false) return;
      setF(empty); setCustomCat(false); setTeams([]); setDrivers([]); setCircuits([]); setPollOn(false); setPollQ(""); setPollOpts(["", "", "", ""]);
    });
  };
  return (
    <div>
      <div style={aTitle}>NUOVO ARTICOLO</div>
      <div style={aCard}>
        <label style={aLabel} htmlFor="adTitle">TITOLO</label>
        <input id="adTitle" value={f.title} onChange={e => set("title", e.target.value)} placeholder="Es. Leclerc in pole a Monza" style={{ ...aInput, marginBottom: 10 }} />
        <label style={aLabel} htmlFor="adSub">SOTTOTITOLO</label>
        <input id="adSub" value={f.summary} onChange={e => set("summary", e.target.value)} placeholder="Una riga che riassume la notizia" style={{ ...aInput, marginBottom: 12 }} />
        <span style={aLabel}>CATEGORIA</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: customCat ? 8 : 12 }}>
          {NEWS_CATEGORIES.map(c => <button key={c} className="press" onClick={() => { setCustomCat(false); set("cat", c); }} style={aChip(!customCat && f.cat === c)}>{c}</button>)}
          <button className="press" onClick={() => { setCustomCat(true); set("cat", ""); }} style={aChip(customCat, C.gold)}><Icon name="star" size={11} color={C.gold} />Altra (Premium)</button>
        </div>
        {customCat && <input aria-label="Nuova categoria" value={f.cat} onChange={e => set("cat", e.target.value)} placeholder="Nome nuova categoria (riservata ai Premium)" style={{ ...aInput, marginBottom: 12, borderColor: "rgba(231,179,76,.4)" }} />}
        <label style={aLabel} htmlFor="adAuthor">AUTORE</label>
        <input id="adAuthor" value={f.author} onChange={e => set("author", e.target.value)} style={{ ...aInput, marginBottom: 12 }} />
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
          <ImagePicker id="adImg" value={f.image} onChange={url => set("image", url)} />
        </div>
        {f.image && (
          <div style={{ position: "relative", marginBottom: 10 }}>
            {imgBroken
              ? <div role="alert" style={{ height: 70, borderRadius: 10, border: "1px dashed rgba(232,18,29,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 40px", fontFamily: F_BODY, fontSize: 12, color: "#ff6b6b", textAlign: "center" }}>Impossibile caricare l'immagine da questo link.</div>
              : <img src={f.image} alt="Anteprima immagine" onError={() => setImgBroken(true)} style={{ width: "100%", height: "auto", maxHeight: 260, objectFit: "contain", background: "#111", borderRadius: 10, display: "block" }} />}
            <button className="press" aria-label="Rimuovi immagine" onClick={() => set("image", "")} style={{ position: "absolute", top: 6, right: 6, width: 26, height: 26, borderRadius: "50%", background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="close" size={11} color="#fff" sw={2.4} /></button>
          </div>
        )}
        <label style={aLabel} htmlFor="adText">CONTENUTO</label>
        <textarea id="adText" value={f.body} onChange={e => set("body", e.target.value)} rows={5} placeholder="Scrivi l'articolo…" style={{ ...aInput, resize: "vertical", lineHeight: 1.5, marginBottom: 12 }} />
        <span style={aLabel}>HASHTAG SCUDERIE</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {TEAMS.map(t => <button key={t.id} className="press" aria-pressed={teams.includes(t.id)} onClick={() => toggle(teams, setTeams, t.id)} style={aChip(teams.includes(t.id), t.color)}><span style={{ width: 6, height: 6, borderRadius: "50%", background: t.color }} />{t.tag}</button>)}
        </div>
        <span style={aLabel}>HASHTAG PILOTI</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {DRIVERS.map(d => <button key={d.id} className="press" aria-pressed={drivers.includes(d.id)} onClick={() => toggle(drivers, setDrivers, d.id)} style={aChip(drivers.includes(d.id), d.color)}><span style={{ width: 6, height: 6, borderRadius: "50%", background: d.color }} />{d.tag}</button>)}
        </div>
        <span style={aLabel}>HASHTAG CIRCUITI</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {CIRCUIT_IDS.filter(id => CIRCUIT_INFO[id]).map(id => <button key={id} className="press" aria-pressed={circuits.includes(id)} onClick={() => toggle(circuits, setCircuits, id)} style={aChip(circuits.includes(id), CIRCUIT_TAG_COLOR)}><span style={{ width: 6, height: 6, borderRadius: "50%", background: CIRCUIT_TAG_COLOR }} />#{CIRCUIT_INFO[id].tag}</button>)}
        </div>
        {preview.length > 0 && <p style={{ margin: "0 0 12px", fontFamily: F_BODY, fontSize: 11, color: C.dim, lineHeight: 1.45 }}>Chi ha {preview.map(t => t.label).join(", ")} tra i preferiti riceverà una notifica.</p>}
        <span style={aLabel}>SONDAGGIO</span>
        {!pollOn ? (
          <button className="press" onClick={() => setPollOn(true)} style={{ ...aChip(false, C.gold), marginBottom: 12 }}><Icon name="poll" size={12} color={C.gold} />Aggiungi un sondaggio</button>
        ) : (
          <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(231,179,76,.35)", marginBottom: 12 }}>
            <label style={aLabel} htmlFor="adPollQ">DOMANDA</label>
            <input id="adPollQ" value={pollQ} onChange={e => setPollQ(e.target.value)} placeholder="Es. Chi vince la gara?" style={{ ...aInput, marginBottom: 8 }} />
            {pollOpts.map((o, k) => (
              <input key={k} id={"adPollO" + (k + 1)} aria-label={"Risposta " + (k + 1)} value={o} onChange={e => setPollOpts(list => list.map((x, j) => j === k ? e.target.value : x))} placeholder={k < 2 ? `Risposta ${k + 1}` : `Risposta ${k + 1} (facoltativa)`} style={{ ...aInput, marginBottom: 6 }} />
            ))}
            <p style={{ margin: "4px 0 8px", fontFamily: F_BODY, fontSize: 11, color: C.dim, lineHeight: 1.45 }}>La risposta esatta la segni dopo, nella scheda SONDAGGI: chi ha indovinato prende +2 punti FantaF1.</p>
            <button className="press" onClick={() => { setPollOn(false); setPollQ(""); setPollOpts(["", "", "", ""]); }} style={aChip(false)}>Togli il sondaggio</button>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 12, color: C.text }}>PUBBLICATO <span style={{ fontWeight: 400, color: C.dim }}>{f.published ? "" : "(salva come bozza)"}</span></span>
          <Toggle on={f.published} onChange={v => set("published", v)} label="Pubblicato" />
        </div>
        {error && <p role="alert" style={{ margin: "0 0 10px", fontFamily: F_BODY, fontSize: 12, color: C.accent }}>{error}</p>}
        <ABtn onClick={publish}>{f.published ? "PUBBLICA" : "SALVA BOZZA"}</ABtn>
      </div>

      <div style={aTitle}>ARTICOLI ({articles.length})</div>
      {articles.map(a => (
        <div key={a.id} style={{ ...aCard, padding: "11px 12px", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
              <span style={{ padding: "2px 6px", borderRadius: 5, background: a.premium ? "rgba(231,179,76,.2)" : "rgba(255,255,255,.08)", fontFamily: F_HEAD, fontWeight: 800, fontSize: 8.5, color: a.premium ? C.gold : C.text }}>{a.cat}</span>
              {a.published === false && <span style={{ fontFamily: F_BODY, fontSize: 10.5, color: C.gold }}>bozza</span>}
              <span style={{ fontFamily: F_BODY, fontSize: 10.5, color: C.dim }}>{a.time}</span>
            </div>
            <div style={{ fontFamily: F_BODY, fontWeight: 600, fontSize: 12.5, color: C.text, lineHeight: 1.3 }}>{a.title}</div>
          </div>
          <Toggle on={a.published !== false} onChange={v => { setArticles(list => list.map(x => x.id === a.id ? { ...x, published: v } : x)).then(ok => ok && onToast(v ? "Articolo pubblicato" : "Spostato in bozze")); }} label={"Pubblica " + a.title} />
          <TrashBtn label={"Elimina " + a.title} onClick={() => { setArticles(list => list.filter(x => x.id !== a.id)).then(ok => ok && onToast("Articolo eliminato")); }} />
        </div>
      ))}
    </div>
  );
}

// Sondaggi: quando il risultato è noto l'admin segna la risposta esatta; chi l'aveva votata prende +2 punti FantaF1.
function AdminPollsTab({ polls, votes, onAnswer }) {
  return (
    <div>
      <div style={aTitle}>SONDAGGI ({polls.length})</div>
      <p style={{ margin: "0 2px 12px", fontFamily: F_BODY, fontSize: 11.5, color: C.muted, lineHeight: 1.5 }}>Quando il risultato è noto, tocca la risposta esatta: chi l'aveva votata prende +2 punti FantaF1. Toccala di nuovo per toglierla.</p>
      {polls.map(pl => {
        const right = pl.options.find(o => o.id === pl.answer);
        return (
          <div key={pl.id} data-poll-admin={pl.id} style={{ ...aCard, marginBottom: 8 }}>
            <div style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 10, color: C.dim, letterSpacing: .8, marginBottom: 3 }}>{pl.where.toUpperCase()}</div>
            <div style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 14, color: C.text, marginBottom: 8 }}>{pl.q}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {pl.options.map(o => <button key={o.id} data-answer={o.id} className="press" aria-pressed={pl.answer === o.id ? "true" : "false"} onClick={() => onAnswer(pl.id, pl.answer === o.id ? null : o.id)} style={aChip(pl.answer === o.id, TIMING.green)}>{pl.answer === o.id && <Icon name="check" size={11} color={TIMING.green} />}{o.label}</button>)}
            </div>
            <p style={{ margin: "8px 0 0", fontFamily: F_BODY, fontSize: 11, color: C.dim }}>{right ? `Risposta esatta: ${right.label}${votes[pl.id] ? (votes[pl.id] === pl.answer ? " · il tuo voto era giusto" : " · il tuo voto era sbagliato") : ""}` : "Nessuna risposta esatta segnata: il sondaggio è aperto."}</p>
          </div>
        );
      })}
    </div>
  );
}

function AdminFantaTab({ fantaStats, setFantaStats, onToast }) {
  const [kind, setKind] = useState("drivers");
  const toDraft = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { price: String(v.price), change: v.change == null ? "" : String(v.change), pts: String(v.pts) }]));
  const [draft, setDraft] = useState(() => ({ drivers: toDraft(fantaStats.drivers), teams: toDraft(fantaStats.teams) }));
  const set = (id, k, v) => setDraft(d => ({ ...d, [kind]: { ...d[kind], [id]: { ...d[kind][id], [k]: v } } }));
  const conv = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { price: parseFloat(v.price) || 0, change: v.change === "" ? null : parseFloat(v.change) || 0, pts: parseInt(v.pts, 10) || 0 }]));
  const save = () => { setFantaStats({ drivers: conv(draft.drivers), teams: conv(draft.teams) }).then(ok => ok && onToast("Prezzi e punti FantaF1 salvati")); };
  const ids = Object.keys(draft[kind]);
  return (
    <div>
      <div style={{ display: "flex", gap: 8, margin: "4px 0 10px" }}>
        {[["drivers", "PILOTI"], ["teams", "SCUDERIE"]].map(([id, l]) => <button key={id} className="press" onClick={() => setKind(id)} style={aChip(kind === id)}>{l}</button>)}
      </div>
      <p style={{ margin: "0 2px 10px", fontFamily: F_BODY, fontSize: 11.5, color: C.muted, lineHeight: 1.5 }}>Dopo ogni gara copia prezzi (milioni di $), variazione e punti della stagione dal gioco ufficiale F1 Fantasy. Variazione vuota = non la mostriamo.</p>
      <div style={{ display: "flex", padding: "0 12px 6px", fontFamily: F_BODY, fontWeight: 700, fontSize: 10, color: C.dim, letterSpacing: .6 }}>
        <span style={{ flex: 1 }}>{kind === "drivers" ? "PILOTA" : "SCUDERIA"}</span><span style={{ width: 54, textAlign: "center" }}>PREZZO</span><span style={{ width: 50, textAlign: "center", marginLeft: 6 }}>VAR.</span><span style={{ width: 56, textAlign: "center", marginLeft: 6 }}>PUNTI</span>
      </div>
      <div style={{ ...aCard, padding: 0 }}>
        {ids.map((id, i) => {
          const d = kind === "drivers" ? driverById(id) : null, t = d ? teamById(d.teamId) : teamById(id);
          const name = d ? d.full : t ? t.name : id;
          return (
            <div key={id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderTop: i ? `1px solid ${C.divider}` : "none" }}>
              {d ? <Headshot driver={d} size={28} /> : <span style={{ width: 28, height: 28, borderRadius: 8, background: t ? t.color : C.dim, flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0, fontFamily: F_BODY, fontWeight: 600, fontSize: 12, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
              <input aria-label={"Prezzo " + name} type="number" step=".1" value={draft[kind][id].price} onChange={e => set(id, "price", e.target.value)} style={{ ...aNum, width: 54 }} />
              <input aria-label={"Variazione " + name} type="number" step=".1" value={draft[kind][id].change} onChange={e => set(id, "change", e.target.value)} style={{ ...aNum, width: 50 }} />
              <input aria-label={"Punti " + name} type="number" value={draft[kind][id].pts} onChange={e => set(id, "pts", e.target.value)} style={{ ...aNum, width: 56 }} />
            </div>
          );
        })}
      </div>
      <ABtn onClick={save}>SALVA</ABtn>
    </div>
  );
}

// Previsioni avanzate: l'admin segna le risposte esatte (chi ha indovinato prende +1) e ne aggiunge di nuove.
// Anche qui tutto a risposta chiusa: si sceglie il pilota o la scuderia dall'elenco, il numero col tastierino.
const aOpenBtn = { display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 13px", borderRadius: 10, background: "rgba(255,255,255,.07)", border: `1px solid ${C.border}`, fontFamily: F_BODY, fontWeight: 700, fontSize: 12, color: C.text };
function AdminPredictionsTab({ predictions, setPredictions, answers, races, onToast }) {
  const [kind, setKind] = useState("poll");
  const [text, setText] = useState("");
  const [opts, setOpts] = useState(["", "", "", ""]);
  const [histAns, setHistAns] = useState(0);
  const [about, setAbout] = useState("QUALI");
  const [picking, setPicking] = useState(null);   // domanda di cui si sceglie la risposta esatta (piloti, scuderie)
  const [pad, setPad] = useState(null);           // { id, v } numero esatto che si sta scrivendo
  const next = races.find(r => r.status === "IN ARRIVO") || races[races.length - 1];
  const setAnswer = (q, v) => { setPredictions(ps => ps.map(x => x.id === q.id ? { ...x, answer: v } : x)).then(ok => ok && onToast(v == null ? "Risposta esatta tolta" : "Risposta esatta segnata: chi ha indovinato prende +1 punto")); };
  const needsOptions = kind === "poll" || kind === "history";
  const add = () => {
    const q = text.trim(); if (!q) return;
    const options = needsOptions ? opts.map(o => o.trim()).filter(Boolean).map((l, i) => ["o" + i, l]) : [];
    if (needsOptions && options.length < 2) { onToast("Servono almeno due risposte"); return; }
    const item = { id: "p" + Date.now(), kind, cat: (PRED_KINDS.find(k => k[0] === kind) || [0, "Domanda"])[1], q, answer: kind === "history" ? (options[Math.min(histAns, options.length - 1)] || [])[0] : null };
    if (options.length) item.options = options;
    if (kind !== "history") { item.about = about; item.raceId = next.id; }
    setPredictions(ps => [...ps, item]).then(ok => {
      if (!ok) return;
      setText(""); setOpts(["", "", "", ""]); setHistAns(0);
      onToast("Previsione aggiunta nel FantaF1");
    });
  };
  const open = predictions.filter(q => q.kind !== "history");
  const pickQ = picking ? predictions.find(q => q.id === picking) : null;
  return (
    <div>
      <div style={aTitle}>RISPOSTE ESATTE ({open.length})</div>
      <p style={{ margin: "0 2px 12px", fontFamily: F_BODY, fontSize: 11.5, color: C.muted, lineHeight: 1.5 }}>Quando il risultato è noto, segna la risposta esatta: chi ha indovinato prende +1 punto FantaF1. Le domande di storia hanno già la risposta.</p>
      {open.map(q => {
        const mine = answers[q.id];
        const res = BtLogic.predictionCorrect(q, mine);
        const kindLabel = (PRED_KINDS.find(k => k[0] === q.kind) || [0, q.cat || "Domanda"])[1];
        return (
          <div key={q.id} data-pred-admin={q.id} style={{ ...aCard, marginBottom: 8 }}>
            <div style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 10, color: C.dim, letterSpacing: .8, marginBottom: 3 }}>{kindLabel.toUpperCase()} · {sessionLabelIt(q.about).toUpperCase()}</div>
            <div style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 14, color: C.text, marginBottom: 8 }}>{q.q}</div>
            {q.kind === "poll" ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {q.options.map(([id, l]) => <button key={id} data-answer={id} className="press" aria-pressed={q.answer === id ? "true" : "false"} onClick={() => setAnswer(q, q.answer === id ? null : id)} style={aChip(q.answer === id, TIMING.green)}>{q.answer === id && <Icon name="check" size={11} color={TIMING.green} />}{l}</button>)}
              </div>
            ) : q.kind === "number" ? (
              pad && pad.id === q.id
                ? <NumPad value={pad.v} onChange={v => setPad({ id: q.id, v })} okLabel="SEGNA" onOk={v => { setAnswer(q, Number(v)); setPad(null); }} onCancel={() => setPad(null)} />
                : <button className="press" data-pred-open="" onClick={() => setPad({ id: q.id, v: "" })} style={aOpenBtn}><span style={{ fontFamily: F_HEAD, fontWeight: 900, fontSize: 15, color: "#C98BFF" }}>#</span>{q.answer != null ? "Cambia il numero esatto" : "Segna il numero esatto"}</button>
            ) : (
              <button className="press" data-pred-open="" onClick={() => setPicking(q.id)} style={aOpenBtn}><Icon name={q.kind === "team" ? "flag" : "person"} size={13} color={C.muted} />{q.answer != null ? "Cambia la risposta esatta" : q.kind === "team" ? "Scegli la scuderia giusta" : "Scegli il pilota giusto"}</button>
            )}
            <p style={{ margin: "8px 0 0", fontFamily: F_BODY, fontSize: 11, color: C.dim }}>{q.answer == null ? "Nessuna risposta esatta segnata." : `Risposta esatta: ${predLabel(q, q.answer)}`}{mine != null ? ` · la tua: ${predLabel(q, mine)}${res === true ? " (giusta)" : res === false ? " (sbagliata)" : ""}` : ""}</p>
            {q.answer != null && <button className="press" onClick={() => setAnswer(q, null)} style={{ marginTop: 6, fontFamily: F_BODY, fontSize: 11, color: C.muted, textDecoration: "underline" }}>Togli la risposta esatta</button>}
          </div>
        );
      })}
      {pickQ && <EntityPicker id={"admin-" + pickQ.id} kind={pickQ.kind === "team" ? "team" : "driver"} title={pickQ.q} selected={pickQ.answer} onPick={v => { setAnswer(pickQ, v); setPicking(null); }} onClose={() => setPicking(null)} />}
      <div style={aTitle}>NUOVA PREVISIONE</div>
      <div style={aCard}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {PRED_KINDS.map(([id, l]) => <button key={id} data-pred-kind={id} className="press" aria-pressed={kind === id ? "true" : "false"} onClick={() => setKind(id)} style={aChip(kind === id)}>{l}</button>)}
        </div>
        <p style={{ margin: "0 2px 10px", fontFamily: F_BODY, fontSize: 11, color: C.dim, lineHeight: 1.45 }}>{{ poll: "Sondaggio: scrivi tu le risposte tra cui scegliere.", driver: "Pilota: si risponde scegliendo tra tutti i piloti.", team: "Scuderia: si risponde scegliendo tra tutte le scuderie.", number: "Numero: si risponde col tastierino numerico.", history: "Storia: scrivi le risposte e tocca quella giusta." }[kind]}</p>
        <label style={aLabel} htmlFor="predText">DOMANDA</label>
        <input id="predText" value={text} onChange={e => setText(e.target.value)} placeholder={kind === "number" ? "Es. Quanti pit stop farà il vincitore?" : kind === "team" ? "Es. Quale scuderia vincerà la gara?" : "Es. Chi vincerà la gara?"} style={{ ...aInput, marginBottom: 10 }} />
        {needsOptions && (
          <>
            <span style={aLabel}>RISPOSTE{kind === "history" ? " (tocca quella giusta)" : ""}</span>
            {opts.map((o, i) => (
              <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                <input aria-label={"Risposta " + (i + 1)} value={o} onChange={e => setOpts(a => a.map((x, j) => j === i ? e.target.value : x))} style={{ ...aInput, flex: 1 }} />
                {kind === "history" && <button className="press" aria-label={"Risposta giusta: " + (i + 1)} aria-pressed={histAns === i ? "true" : "false"} onClick={() => setHistAns(i)} style={aChip(histAns === i, TIMING.green)}>{histAns === i ? "Giusta" : "—"}</button>}
              </div>
            ))}
          </>
        )}
        {kind !== "history" && (
          <>
            <span style={aLabel}>SI CHIUDE ALL'INIZIO DI</span>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              {[["QUALI", "Qualifiche"], ["RACE", "Gara"]].map(([id, l]) => <button key={id} className="press" aria-pressed={about === id ? "true" : "false"} onClick={() => setAbout(id)} style={aChip(about === id)}>{l}</button>)}
            </div>
            <p style={{ margin: "0 0 10px", fontFamily: F_BODY, fontSize: 11, color: C.dim }}>Per il weekend di: {next ? next.name : "—"}</p>
          </>
        )}
        <ABtn onClick={add} disabled={!text.trim()}>AGGIUNGI PREVISIONE</ABtn>
      </div>
    </div>
  );
}

function AdminStandingsTab({ standings, setStandings, onToast }) {
  const [which, setWhich] = useState("drivers");
  const [draft, setDraft] = useState(() => ({ note: standings.note, drivers: standings.drivers.map(r => ({ ...r, position: String(r.position), points: String(r.points) })), teams: standings.teams.map(r => ({ ...r, position: String(r.position), points: String(r.points) })) }));
  const rows = draft[which];
  const set = (id, k, v) => setDraft(d => ({ ...d, [which]: d[which].map(r => r.id === id ? { ...r, [k]: v } : r) }));
  const reorder = () => setDraft(d => ({ ...d, [which]: d[which].slice().sort((a, b) => (parseInt(b.points) || 0) - (parseInt(a.points) || 0)).map((r, i) => ({ ...r, position: String(i + 1) })) }));
  const save = () => {
    const conv = list => list.map(r => ({ ...r, position: parseInt(r.position) || 99, points: parseInt(r.points) || 0 }));   // ...r: resta l'id di oggi (oldId)
    setStandings({ note: draft.note, drivers: conv(draft.drivers), teams: conv(draft.teams) }).then(ok => ok && onToast("Classifiche salvate"));
  };
  return (
    <div>
      <div style={{ display: "flex", gap: 8, margin: "4px 0 12px" }}>
        {[["drivers", "PILOTI"], ["teams", "COSTRUTTORI"]].map(([id, l]) => <button key={id} className="press" onClick={() => setWhich(id)} style={aChip(which === id)}>{l}</button>)}
      </div>
      <label style={aLabel} htmlFor="stNote">NOTA SOTTO LA CLASSIFICA</label>
      <input id="stNote" value={draft.note} onChange={e => setDraft(d => ({ ...d, note: e.target.value }))} style={{ ...aInput, marginBottom: 12 }} />
      <div style={{ display: "flex", padding: "0 12px 6px", fontFamily: F_BODY, fontWeight: 700, fontSize: 10, color: C.dim, letterSpacing: .6 }}>
        <span style={{ width: 48, textAlign: "center" }}>POS</span><span style={{ flex: 1, marginLeft: 10 }}>{which === "drivers" ? "PILOTA" : "SCUDERIA"}</span><span style={{ width: 66, textAlign: "center" }}>PUNTI</span>
      </div>
      <div style={{ ...aCard, padding: 0 }}>
        {rows.slice().sort((a, b) => (parseInt(a.position) || 99) - (parseInt(b.position) || 99)).map((r, i) => {
          const d = which === "drivers" ? standingsDriver(r.id) : null;
          const t = (d ? teamById(d.teamId) : teamById(r.id)) || { color: C.dim, name: d ? d.team || "" : r.id };   // ospite senza scuderia nota
          return (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderTop: i ? `1px solid ${C.divider}` : "none" }}>
              <input aria-label={"Posizione " + (d ? d.full : t.name)} type="number" value={r.position} onChange={e => set(r.id, "position", e.target.value)} style={{ ...aNum, width: 48 }} />
              <span style={{ width: 4, alignSelf: "stretch", borderRadius: 2, background: t.color }} />
              <div style={{ flex: 1, minWidth: 0, fontFamily: F_BODY, fontWeight: 600, fontSize: 12.5, color: C.text }}>{d ? d.full : t.name}</div>
              <input aria-label={"Punti " + (d ? d.full : t.name)} type="number" value={r.points} onChange={e => set(r.id, "points", e.target.value)} style={{ ...aNum, width: 66 }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <ABtn kind="ghost" onClick={reorder} style={{ flex: 1 }}>ORDINA PER PUNTI</ABtn>
        <ABtn onClick={save} style={{ flex: 1 }}>SALVA</ABtn>
      </div>
    </div>
  );
}

// Comandi della diretta demo: avvia una sessione finta e manda bandiere come la direzione gara.
function AdminLiveCard({ races, live, liveSt, onStart, onStop, onFlag, onLastLap, onRetire, speed, setSpeed }) {
  const firstId = (races.find(r => r.status === "LIVE") || races.find(r => r.status === "IN ARRIVO") || races[0] || {}).id;
  const [raceId, setRaceId] = useState(firstId);
  const [sector, setSector] = useState(2);
  const [dnfCause, setDnfCause] = useState("motore");
  const inRace = liveSt ? liveSt.cars.filter(c => !c.dnf && !c.finished) : [];
  const [dnfPick, setDnfPick] = useState("");
  const dnfId = inRace.some(c => c.id === dnfPick) ? dnfPick : (inRace[inRace.length - 1] || {}).id || "";
  const liveRace = live && races.find(r => r.id === live.raceId);
  const chipBtn = (label, onClick, on, colors) => (
    <button key={label} className="press" onClick={onClick} style={{ padding: "9px 10px", borderRadius: 10, background: on ? colors[0] : "rgba(255,255,255,.05)", border: `1px solid ${on ? colors[0] : C.border}`, fontFamily: F_HEAD, fontWeight: 800, fontSize: 12, color: on ? colors[1] : C.text }}>{label}</button>
  );
  return (
    <>
      <div style={aTitle}>DIRETTA DEMO</div>
      <div style={aCard}>
        <p style={{ margin: "0 0 10px", fontFamily: F_BODY, fontSize: 11.5, color: C.muted, lineHeight: 1.5 }}>Fa partire una sessione finta sul tracciato della gara scelta: piloti in pista, tempi, settori, bandiere e messaggi. Nell'app vera questi dati arriveranno da OpenF1.</p>
        <select aria-label="Gara della diretta" value={raceId} onChange={e => setRaceId(e.target.value)} style={{ ...aInput, marginBottom: 10, colorScheme: "dark" }}>
          {races.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {weekendKeys(races.find(r => r.id === raceId)).map(k => <ABtn key={k} onClick={() => onStart(raceId, k)} kind={k === "RACE" ? "primary" : "secondary"}>AVVIA {sessionName(k)}</ABtn>)}
        </div>
        {live && liveSt && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.divider}` }}>
            <p style={{ margin: "0 0 10px", fontFamily: F_BODY, fontWeight: 700, fontSize: 12, color: C.text }}>In corso: {sessionName(live.type)} · {liveRace ? liveRace.name : ""} · {liveCounter(liveSt)}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {chipBtn("VERDE", () => onFlag("green"), liveSt.flag === "green", [TIMING.green, "#06210E"])}
              {chipBtn("GIALLA", () => onFlag("yellow", sector), liveSt.flag === "yellow", [FLAG_UI.yellow.color, FLAG_UI.yellow.ink])}
              {chipBtn("SC", () => onFlag("sc"), liveSt.flag === "sc", [FLAG_UI.sc.color, FLAG_UI.sc.ink])}
              {chipBtn("VSC", () => onFlag("vsc"), liveSt.flag === "vsc", [FLAG_UI.vsc.color, FLAG_UI.vsc.ink])}
              {chipBtn("ROSSA", () => onFlag("red"), liveSt.flag === "red", [FLAG_UI.red.color, "#fff"])}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <label htmlFor="flagSector" style={{ fontFamily: F_BODY, fontSize: 11.5, color: C.muted }}>Settore della gialla</label>
              <select id="flagSector" value={sector} onChange={e => setSector(parseInt(e.target.value, 10))} style={{ ...aInput, width: 70, colorScheme: "dark" }}>{[1, 2, 3].map(n => <option key={n} value={n}>{n}</option>)}</select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <span style={{ fontFamily: F_BODY, fontSize: 11.5, color: C.muted, marginRight: 4 }}>Velocità</span>
              {[1, 3, 8].map(x => chipBtn("×" + x, () => setSpeed(x), speed === x, [C.accent, "#fff"]))}
            </div>
            {isRaceType(live.type) && onRetire && (
              <div data-admin-dnf="" style={{ marginBottom: 12, padding: "10px 10px 12px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: `1px solid ${C.border}` }}>
                <span style={aLabel}>RITIRA UN PILOTA (CON LA CAUSA)</span>
                <select id="dnfDriver" aria-label="Pilota da ritirare" value={dnfId} onChange={e => setDnfPick(e.target.value)} style={{ ...aInput, marginBottom: 8, colorScheme: "dark" }}>
                  {inRace.map(c => <option key={c.id} value={c.id}>P{c.pos} · {c.code} · {(driverById(c.id) || {}).full || c.id}</option>)}
                </select>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  {DnfArtData.CAUSES.map(k => (
                    <button key={k} data-dnf-cause={k} className="press" aria-pressed={dnfCause === k ? "true" : "false"} onClick={() => setDnfCause(k)} style={{ ...aChip(dnfCause === k), padding: "4px 8px 4px 4px" }}>
                      <span style={{ display: "inline-flex", borderRadius: 6, background: "#101014", padding: 2 }}><DnfArt cause={k} width={36} bg="#101014" /></span>{DNF_LABEL[k]}
                    </button>
                  ))}
                </div>
                <ABtn onClick={() => dnfId && onRetire(dnfId, dnfCause)} disabled={!dnfId} kind="secondary">RITIRA</ABtn>
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <ABtn onClick={onLastLap} kind="secondary" style={{ flex: 1 }}>ULTIMO GIRO</ABtn>
              <ABtn onClick={onStop} kind="danger" style={{ flex: 1 }}>TERMINA DIRETTA</ABtn>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// Calendario e stato delle gare (shared/bt-races). Le 23 gare del 2026 ci sono già; il menu dello stato scrive solo
// bt-races (LIVE non fa partire la diretta simulata: quella è nella "Diretta demo"). Le gare aggiunte a mano restano
// nel documento per l'app di oggi, fuori dal calendario della nuova app.
function AdminRacesTab({ races, setRaces, extra = [], setExtra, onToast, live, liveSt, onStartLive, onStopLive, onFlag, onLastLap, onRetire, liveSpeed, setLiveSpeed }) {
  const empty = { name: "", circuit: "", country: "", round: "", date: "" };
  const [g, setG] = useState(empty);
  const add = () => {
    if (!g.name.trim()) { onToast("Scrivi il nome del GP"); return; }
    const race = { id: "r" + Date.now(), name: g.name.trim(), circuit: g.circuit.trim(), country: g.country.trim(), round: parseInt(g.round) || 0, date: g.date ? g.date + "T15:00:00" : "", status: "IN ARRIVO", totalLaps: 57 };
    setExtra(list => [...list, race]).then(ok => { if (!ok) return; setG(empty); onToast("Gara aggiunta"); });
  };
  const setStatus = (id, status) => {
    setRaces(list => list.map(r => r.id === id ? { ...r, status } : (status === "LIVE" && r.status === "LIVE" ? { ...r, status: "CONCLUSA" } : r)))
      .then(ok => ok && onToast(status === "LIVE" ? "Gara impostata IN DIRETTA" : "Stato aggiornato: " + status));
  };
  const statusColor = s => s === "LIVE" ? C.accent : s === "CONCLUSA" ? "rgba(255,255,255,.08)" : "rgba(231,179,76,.18)";
  return (
    <div>
      {onStartLive && <AdminLiveCard races={races} live={live} liveSt={liveSt} onStart={onStartLive} onStop={onStopLive} onFlag={onFlag} onLastLap={onLastLap} onRetire={onRetire} speed={liveSpeed} setSpeed={setLiveSpeed} />}
      <div style={aTitle}>AGGIUNGI GARA</div>
      <div style={aCard}>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input aria-label="Nome GP" placeholder="Nome GP" value={g.name} onChange={e => setG(p => ({ ...p, name: e.target.value }))} style={aInput} />
          <input aria-label="Circuito" placeholder="Circuito" value={g.circuit} onChange={e => setG(p => ({ ...p, circuit: e.target.value }))} style={aInput} />
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input aria-label="Paese" placeholder="Paese" value={g.country} onChange={e => setG(p => ({ ...p, country: e.target.value }))} style={aInput} />
          <input aria-label="Round" placeholder="Round #" type="number" value={g.round} onChange={e => setG(p => ({ ...p, round: e.target.value }))} style={{ ...aInput, width: 90, flexShrink: 0 }} />
        </div>
        <input aria-label="Data" type="date" value={g.date} onChange={e => setG(p => ({ ...p, date: e.target.value }))} style={{ ...aInput, marginBottom: 10, colorScheme: "dark" }} />
        <ABtn onClick={add}>AGGIUNGI GARA</ABtn>
      </div>
      <div style={aTitle}>CALENDARIO ({races.length})</div>
      <p style={{ margin: "-4px 0 10px", fontFamily: F_BODY, fontSize: 11, color: C.dim, lineHeight: 1.45 }}>Metti una gara su LIVE per mostrarla "In diretta" nella sezione Race.</p>
      {races.map(r => (
        <div key={r.id} style={{ ...aCard, padding: "10px 12px", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 26, fontFamily: F_HEAD, fontWeight: 800, fontSize: 12, color: C.dim }}>R{r.round}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: F_BODY, fontWeight: 600, fontSize: 12.5, color: C.text }}>{r.name}</div>
            <div style={{ fontFamily: F_BODY, fontSize: 10.5, color: C.dim }}>{r.circuit || "—"} · {fmtDate(r.date)}</div>
          </div>
          <select aria-label={"Stato " + r.name} value={r.status} onChange={e => setStatus(r.id, e.target.value)} style={{ padding: "6px 8px", borderRadius: 8, background: statusColor(r.status), border: `1px solid ${C.border}`, color: "#fff", fontFamily: F_BODY, fontWeight: 700, fontSize: 10.5, colorScheme: "dark" }}>
            {RACE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      ))}
      {extra.length > 0 && (<>
        <div style={aTitle}>FUORI CALENDARIO ({extra.length})</div>
        <p style={{ margin: "-4px 0 10px", fontFamily: F_BODY, fontSize: 11, color: C.dim, lineHeight: 1.45 }}>Gare aggiunte a mano: le vede solo l'app di oggi. Nel calendario della nuova app ci sono già tutte le gare del 2026.</p>
        {extra.map(r => (
          <div key={r.id} data-extra-race={r.id} style={{ ...aCard, padding: "10px 12px", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: F_BODY, fontWeight: 600, fontSize: 12.5, color: C.text }}>{r.name || "—"}</div>
              <div style={{ fontFamily: F_BODY, fontSize: 10.5, color: C.dim }}>{r.circuit || "—"} · {Compat.fmtDate(r.date)} · {r.status || ""}</div>
            </div>
            <TrashBtn label={"Elimina " + (r.name || "gara")} onClick={() => { setExtra(list => list.filter(x => x !== r)).then(ok => ok && onToast("Gara eliminata")); }} />
          </div>
        ))}
      </>)}
    </div>
  );
}

function AdminInstagramTab({ ig, setIg, onToast }) {
  const [d, setD] = useState(() => ({ ...ig, followers: ig.followers == null ? "" : String(ig.followers), posts: ig.posts == null ? "" : String(ig.posts), videos: ig.videos.map(v => ({ ...v })) }));
  const setV = (id, k, val) => setD(p => ({ ...p, videos: p.videos.map(v => v.id === id ? { ...v, [k]: val } : v) }));
  const count = v => (String(v).trim() === "" ? null : parseInt(v) || 0);   // campo vuoto = numero non indicato
  const save = () => { setIg({ ...d, followers: count(d.followers), posts: count(d.posts) }).then(ok => ok && onToast("Instagram aggiornato")); };
  return (
    <div>
      <div style={aTitle}>PROFILO</div>
      <div style={aCard}>
        <label style={aLabel} htmlFor="igHandle">NOME PROFILO</label>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <span style={{ fontFamily: F_BODY, fontSize: 14, color: C.dim }}>@</span>
          <input id="igHandle" value={d.handle} onChange={e => setD(p => ({ ...p, handle: e.target.value.replace(/[@\s]/g, "") }))} style={aInput} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}><label style={aLabel} htmlFor="igFol">FOLLOWER</label><input id="igFol" type="number" value={d.followers} onChange={e => setD(p => ({ ...p, followers: e.target.value }))} style={aInput} /></div>
          <div style={{ flex: 1 }}><label style={aLabel} htmlFor="igPosts">POST</label><input id="igPosts" type="number" value={d.posts} onChange={e => setD(p => ({ ...p, posts: e.target.value }))} style={aInput} /></div>
        </div>
      </div>
      <div style={aTitle}>VIDEO VIRALI</div>
      {d.videos.map((v, i) => (
        <div key={v.id} style={aCard}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
            <span style={{ flex: 1, fontFamily: F_BODY, fontWeight: 700, fontSize: 12, color: C.text }}>Video {i + 1}</span>
            <TrashBtn label={"Elimina video " + (i + 1)} onClick={() => setD(p => ({ ...p, videos: p.videos.filter(x => x.id !== v.id) }))} />
          </div>
          <input aria-label={"Titolo video " + (i + 1)} placeholder="Titolo" value={v.title} onChange={e => setV(v.id, "title", e.target.value)} style={{ ...aInput, marginBottom: 8 }} />
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input aria-label={"Visualizzazioni video " + (i + 1)} placeholder="Views" value={v.views} onChange={e => setV(v.id, "views", e.target.value)} style={aInput} />
            <input aria-label={"Like video " + (i + 1)} placeholder="Likes" value={v.likes} onChange={e => setV(v.id, "likes", e.target.value)} style={aInput} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {v.thumb && <img src={v.thumb} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover" }} />}
            <ImagePicker id={"igThumb" + v.id} value={v.thumb} onChange={url => setV(v.id, "thumb", url)} label="Carica copertina" changeLabel="Cambia copertina" compact />
          </div>
        </div>
      ))}
      <button className="press" onClick={() => setD(p => ({ ...p, videos: [...p.videos, { id: "v" + Date.now(), title: "", views: "0", likes: "0", thumb: "" }] }))} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: 12, borderRadius: 12, background: "transparent", border: `1.5px dashed ${C.border}`, fontFamily: F_BODY, fontWeight: 600, fontSize: 12.5, color: C.muted, marginBottom: 14 }}><Icon name="plus" size={14} color={C.muted} /> Aggiungi video</button>
      <ABtn onClick={save}>SALVA TUTTO</ABtn>
    </div>
  );
}

function AdminNotifTab({ sent, onSend, onDelete }) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [ok, setOk] = useState(false);
  const send = () => { onSend(title.trim(), text.trim()).then(sent => { if (!sent) return; setTitle(""); setText(""); setOk(true); setTimeout(() => setOk(false), 2500); }); };
  return (
    <div>
      <div style={aTitle}>INVIA NOTIFICA A TUTTI</div>
      <div style={aCard}>
        <input aria-label="Titolo notifica" placeholder="Titolo della notifica" value={title} onChange={e => setTitle(e.target.value)} style={{ ...aInput, marginBottom: 8 }} />
        <textarea aria-label="Testo notifica" placeholder="Testo del messaggio…" rows={3} value={text} onChange={e => setText(e.target.value)} style={{ ...aInput, resize: "vertical", marginBottom: 10 }} />
        {ok && <div role="status" style={{ padding: "9px 12px", borderRadius: 10, background: "rgba(74,229,74,.1)", border: `1px solid ${C.green}`, fontFamily: F_BODY, fontSize: 12.5, color: C.green, textAlign: "center", marginBottom: 10 }}>Notifica inviata a tutti gli utenti</div>}
        <ABtn onClick={send} disabled={!title.trim() || !text.trim()}><Icon name="send" size={14} color="#fff" /> INVIA NOTIFICA ORA</ABtn>
      </div>
      <div style={aTitle}>NOTIFICHE INVIATE ({sent.length})</div>
      {sent.length === 0 && <p style={{ fontFamily: F_BODY, fontSize: 12.5, color: C.dim, textAlign: "center", padding: "14px 0" }}>Nessuna notifica inviata ancora.</p>}
      {sent.map(n => (
        <div key={n.id} style={{ ...aCard, padding: "11px 12px", marginBottom: 8, display: "flex", gap: 10, alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 3 }}>
              <span style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 13, color: C.text }}>{n.title}</span>
              <span style={{ fontFamily: F_BODY, fontSize: 10, color: C.dim, flexShrink: 0 }}>{n.sentAt}</span>
            </div>
            <p style={{ margin: 0, fontFamily: F_BODY, fontSize: 12, color: C.muted, lineHeight: 1.45 }}>{n.body}</p>
          </div>
          <TrashBtn label={"Elimina notifica " + n.title} onClick={() => onDelete(n.id)} />
        </div>
      ))}
    </div>
  );
}

// Moderazione chat (richiesta da Google Play per le app dove gli utenti si scrivono).
function AdminChatTab({ chats, reports, banned, onDeleteMsg, onSuspend, onUnsuspend, onIgnore }) {
  const [room, setRoom] = useState(chats[0] ? chats[0].id : null);
  const cur = chats.find(c => c.id === room) || chats[0];
  const recent = cur ? cur.messages.filter(m => !m.mine).slice(-30).reverse() : [];
  const small = (kind) => ({ padding: "8px 11px", borderRadius: 9, background: kind === "red" ? C.accent : "rgba(255,255,255,.07)", border: kind === "ghost" ? `1px solid ${C.border}` : "none", fontFamily: F_HEAD, fontWeight: 800, fontSize: 11, color: kind === "ghost" ? C.muted : "#fff" });
  return (
    <div>
      <div style={aTitle}>SEGNALAZIONI{reports.length ? ` (${reports.length})` : ""}</div>
      {reports.length === 0 && <div style={{ ...aCard, fontFamily: F_BODY, fontSize: 12.5, color: C.muted }}>Nessuna segnalazione da controllare.</div>}
      {reports.map(r => {
        const chat = chats.find(c => c.id === r.chatId);
        return (
          <div key={r.id} style={aCard}>
            <div style={{ fontFamily: F_BODY, fontSize: 11, color: C.muted, marginBottom: 6 }}>{chat ? chat.name : r.chatId} · scritto da <b style={{ color: C.text }}>{r.author}</b></div>
            <div style={{ fontFamily: F_BODY, fontSize: 13.5, color: C.text, marginBottom: 6 }}>“{r.text}”</div>
            <div style={{ fontFamily: F_BODY, fontSize: 10.5, color: C.dim, marginBottom: 10 }}>Segnalato da {r.by}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="press" onClick={() => onDeleteMsg(r.chatId, r.msgId)} style={small("red")}>ELIMINA MESSAGGIO</button>
              <button className="press" onClick={() => onSuspend(r.author)} style={small()}>SOSPENDI {r.author}</button>
              <button className="press" onClick={() => onIgnore(r.id)} style={small("ghost")}>IGNORA</button>
            </div>
          </div>
        );
      })}
      <div style={aTitle}>UTENTI SOSPESI</div>
      {banned.length === 0 ? <div style={{ ...aCard, fontFamily: F_BODY, fontSize: 12.5, color: C.muted }}>Nessun utente sospeso.</div> : banned.map(b => (
        <div key={b.name} style={{ ...aCard, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: F_BODY, fontSize: 13.5, color: C.text }}>{b.name}</span>
          <button className="press" onClick={() => onUnsuspend(b.name)} style={small("ghost")}>RIATTIVA</button>
        </div>
      ))}
      <div style={aTitle}>ULTIMI MESSAGGI</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {chats.map(c => <button key={c.id} className="press" onClick={() => setRoom(c.id)} style={aChip(c.id === (cur && cur.id))}>{c.name}</button>)}
      </div>
      {recent.length === 0 ? <div style={{ ...aCard, fontFamily: F_BODY, fontSize: 12.5, color: C.muted }}>Nessun messaggio in questa stanza.</div> : recent.map(m => (
        <div key={m.id} style={{ ...aCard, display: "flex", gap: 10, alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: F_BODY, fontSize: 11, color: C.muted, marginBottom: 3 }}>{m.from}</div>
            <div style={{ fontFamily: F_BODY, fontSize: 13, color: C.text, wordBreak: "break-word" }}>{m.text}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <button className="press" onClick={() => onDeleteMsg(cur.id, m.id)} style={small("red")}>ELIMINA</button>
            <button className="press" onClick={() => onSuspend(m.from)} style={small()}>SOSPENDI</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function AdminScreen({ silly = {}, onSilly, highlights = [], setHighlights, onBack, onPublish, articles, setArticles, fantaStats, setFantaStats, standings, setStandings, races, setRaces, extraRaces = [], setExtraRaces, ig, setIg, sentNotifs, onSendNotif, onDeleteNotif, onToast, tab, setTab, chats, reports, banned, onDeleteMsg, onSuspend, onUnsuspend, onIgnoreReport, liveProps = {}, polls = [], votes = {}, onPollAnswer, predictions = [], setPredictions, predAnswers = {} }) {
  return (
    <div className="scrollcol" style={{ height: "100%" }}>
      <SubHeader title="PANNELLO ADMIN" onBack={onBack} />
      <div className="scrollcol" style={{ display: "flex", gap: 7, overflowX: "auto", padding: "0 16px 14px" }}>
        {ADMIN_TABS.map(t => <button key={t} className="press" onClick={() => setTab(t)} style={{ flexShrink: 0, padding: "7px 14px", borderRadius: 999, background: tab === t ? C.accent : C.card, border: `1px solid ${tab === t ? C.accent : C.border}`, fontFamily: F_HEAD, fontWeight: 800, fontStyle: "italic", fontSize: 11, color: tab === t ? "#fff" : C.muted, whiteSpace: "nowrap" }}>{t}</button>)}
      </div>
      <div style={{ padding: "0 16px 28px" }}>
        {tab === "NEWS" && <AdminNewsTab articles={articles} setArticles={setArticles} onPublish={onPublish} onToast={onToast} />}
        {tab === "SONDAGGI" && <AdminPollsTab polls={polls} votes={votes} onAnswer={onPollAnswer} />}
        {tab === "FANTA F1" && <AdminFantaTab fantaStats={fantaStats} setFantaStats={setFantaStats} onToast={onToast} />}
        {tab === "PREVISIONI" && <AdminPredictionsTab predictions={predictions} setPredictions={setPredictions} answers={predAnswers} races={races} onToast={onToast} />}
        {tab === "CLASSIFICHE" && <AdminStandingsTab standings={standings} setStandings={setStandings} onToast={onToast} />}
        {tab === "GARA LIVE" && <AdminRacesTab races={races} setRaces={setRaces} extra={extraRaces} setExtra={setExtraRaces} onToast={onToast} {...liveProps} />}
        {tab === "INSTAGRAM" && <AdminInstagramTab ig={ig} setIg={setIg} onToast={onToast} />}
        {tab === "MERCATO" && <AdminSillyTab official={silly} onOfficial={onSilly} onToast={onToast} />}
        {tab === "VIDEO" && <AdminHighlightsTab items={highlights} setItems={setHighlights} onToast={onToast} />}
        {tab === "NOTIFICHE" && <AdminNotifTab sent={sentNotifs} onSend={onSendNotif} onDelete={onDeleteNotif} />}
        {tab === "CHAT" && <AdminChatTab chats={chats} reports={reports} banned={banned} onDeleteMsg={onDeleteMsg} onSuspend={onSuspend} onUnsuspend={onUnsuspend} onIgnore={onIgnoreReport} />}
      </div>
    </div>
  );
}

function PremiumModal({ onClose, isPremium, plan, setPlan, onSubscribe, subscribing, subscribed, trialUsed, onTrial, trial }) {
  const offer = premiumOffer({ trialUsed, isPremium });
  const price = plan === "monthly" ? "2,99€/mese" : "24,99€/anno";
  const heroGradient = `linear-gradient(135deg, #1a0000, ${C.accent}44, #1a0000)`;
  if (subscribed) {
    return (
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.9)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ background: C.card, borderRadius: 20, padding: "32px 24px", textAlign: "center", maxWidth: 320, width: "100%" }}>
          <Icon name="star" size={50} color={C.gold} />
          {subscribed === "trial" && trial ? (<>
            <h2 style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 22, color: C.text, margin: "16px 0 8px" }}>Prova gratuita attiva!</h2>
            <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.6, margin: "0 0 24px" }}>Hai B&amp;T Premium gratis per {TRIAL_DAYS} giorni, fino al {fmtDay(trial.end)}. Poi {price}: puoi disdire quando vuoi.</p>
          </>) : (<>
            <h2 style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 22, color: C.text, margin: "16px 0 8px" }}>Sei Premium!</h2>
            <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.6, margin: "0 0 24px" }}>Tutte le funzioni avanzate sono ora sbloccate. Buona gara!</p>
          </>)}
          <button className="press" onClick={onClose} style={{ display: "block", width: "100%", padding: "15px 0", borderRadius: 14, background: C.accent, fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 14, color: "#fff" }}>INIZIA A USARE B&amp;T PREMIUM</button>
        </div>
      </div>
    );
  }
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 500, display: "flex", alignItems: "flex-end" }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="scrollcol" style={{ background: C.card, borderRadius: "24px 24px 0 0", width: "100%", maxHeight: "94%", position: "relative" }}>
        <div style={{ background: heroGradient, padding: "26px 24px 20px", textAlign: "center", position: "relative" }}>
          <button className="press" aria-label="Chiudi" onClick={onClose} style={{ position: "absolute", top: 16, right: 16, width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="close" size={14} color="#fff" sw={2.4} />
          </button>
          <Icon name="star" size={34} color={C.gold} />
          <h2 style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 22, color: "#fff", margin: "8px 0 4px" }}>B&amp;T PREMIUM</h2>
          <p style={{ fontFamily: F_BODY, fontSize: 13, color: "rgba(255,255,255,.7)", margin: 0 }}>Il massimo dell'esperienza F1</p>
        </div>

        <div style={{ padding: "16px 22px 24px" }}>
          {isPremium ? (
            <p style={{ textAlign: "center", fontFamily: F_BODY, fontSize: 13, color: C.green, padding: "20px 0" }}>Sei già Premium — grazie per il supporto! ✓</p>
          ) : (
            <>
              {PREMIUM_CATEGORIES.map(cat => (
                <React.Fragment key={cat.name}>
                  <Eyebrow color={C.accent}>{cat.name.toUpperCase()}</Eyebrow>
                  <div>{cat.items.map(it => <FeatureRow key={it.title} icon={it.icon} title={it.title} starIcon={it.starIcon} />)}</div>
                </React.Fragment>
              ))}

              <div style={{ display: "flex", gap: 10, margin: "18px 0 0" }}>
                <button className="press" onClick={() => setPlan("monthly")} style={{ flex: 1, padding: "14px 12px", borderRadius: 14, background: plan === "monthly" ? "rgba(231,179,76,.12)" : C.raised, border: plan === "monthly" ? `2px solid ${C.gold}` : `1px solid ${C.border}`, textAlign: "center" }}>
                  <span style={{ display: "block", fontFamily: F_BODY, fontWeight: 700, fontSize: 10, color: C.muted, letterSpacing: .6, marginBottom: 6 }}>MENSILE</span>
                  <span style={{ display: "block", fontFamily: F_HEAD, fontWeight: 900, fontSize: 17, color: C.text }}>2,99€</span>
                  <span style={{ display: "block", fontFamily: F_BODY, fontSize: 10, color: C.dim, marginTop: 2 }}>al mese</span>
                </button>
                <button className="press" onClick={() => setPlan("annual")} style={{ flex: 1, position: "relative", padding: "14px 12px", borderRadius: 14, background: plan === "annual" ? "rgba(231,179,76,.12)" : C.raised, border: plan === "annual" ? `2px solid ${C.gold}` : `1px solid ${C.border}`, textAlign: "center" }}>
                  <span style={{ position: "absolute", top: -9, right: 10, padding: "3px 7px", borderRadius: 6, background: C.green, fontFamily: F_HEAD, fontWeight: 800, fontSize: 9, color: "#0A2B0A" }}>−30%</span>
                  <span style={{ display: "block", fontFamily: F_BODY, fontWeight: 700, fontSize: 10, color: C.muted, letterSpacing: .6, marginBottom: 6 }}>ANNUALE</span>
                  <span style={{ display: "block", fontFamily: F_HEAD, fontWeight: 900, fontSize: 17, color: C.text }}>24,99€</span>
                  <span style={{ display: "block", fontFamily: F_BODY, fontSize: 10, color: C.dim, marginTop: 2 }}>all'anno</span>
                </button>
              </div>

              {!PAYMENTS_ENABLED ? (
                <>
                  <button className="press" disabled style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", marginTop: 16, padding: "16px 0", borderRadius: 14, background: "rgba(255,255,255,.08)", fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 15, color: C.text, letterSpacing: .3 }}><Icon name="stopwatch" size={16} /> PREMIUM IN ARRIVO</button>
                  <p style={{ textAlign: "center", fontFamily: F_BODY, fontSize: 10.5, color: C.dim, lineHeight: 1.7, margin: "14px 0 0" }}>Gli abbonamenti arriveranno presto, tramite Google Play.</p>
                </>
              ) : <>
              {offer === "trial" ? (<>
                <button className="press" disabled={subscribing} onClick={onTrial} style={{ display: "block", width: "100%", marginTop: 16, padding: "16px 0", borderRadius: 14, background: subscribing ? "#555" : C.accent, boxShadow: subscribing ? "none" : `0 10px 22px -10px ${C.accent}`, fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 14.5, color: "#fff", letterSpacing: .2, textAlign: "center" }}>
                  {subscribing ? "Attendi…" : "PROVA GRATIS 2 SETTIMANE"}
                </button>
                <p style={{ textAlign: "center", fontFamily: F_BODY, fontSize: 11.5, color: C.muted, margin: "10px 0 0" }}>Poi {price} · disdici quando vuoi, anche durante la prova</p>
                <button className="press" disabled={subscribing} onClick={onSubscribe} style={{ display: "block", margin: "8px auto 0", padding: "8px 12px", fontFamily: F_BODY, fontWeight: 700, fontSize: 12, color: C.gold }}>Oppure abbonati subito — {price}</button>
              </>) : (<>
                <button className="press" disabled={subscribing} onClick={onSubscribe} style={{ display: "block", width: "100%", marginTop: 16, padding: "16px 0", borderRadius: 14, background: subscribing ? "#555" : C.accent, boxShadow: subscribing ? "none" : `0 10px 22px -10px ${C.accent}`, fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 14.5, color: "#fff", letterSpacing: .2, textAlign: "center" }}>
                  {subscribing ? "Attendi…" : `ABBONATI — ${price}`}
                </button>
                {trialUsed && <p style={{ textAlign: "center", fontFamily: F_BODY, fontSize: 11.5, color: C.muted, margin: "10px 0 0" }}>Hai già usato la prova gratuita di 2 settimane.</p>}
              </>)}
              <p style={{ textAlign: "center", fontFamily: F_BODY, fontSize: 10.5, color: C.dim, lineHeight: 1.7, margin: "14px 0 0" }}>
                Annulla in qualsiasi momento · Rinnovo automatico<br /><span style={{ color: C.accent }}>Anteprima demo — nessun pagamento reale</span>
              </p>
              </>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TermsSheet({ review, onAccept, onClose }) {
  const S = [
    ["1. Accettazione dei Termini", "Utilizzando l'app B&T App (\u201cl'App\u201d), l'utente accetta di essere vincolato ai presenti Termini e Condizioni. Se non si accettano questi termini, si prega di non utilizzare l'App."],
    ["2. Descrizione del Servizio", "B&T App è un'app di informazione e intrattenimento dedicata alla Formula 1. Offre notizie, classifiche, dati live delle gare tramite OpenF1 API, una sezione community (chat) e funzionalità Fanta F1."],
    ["3. Account Utente", "Per accedere a tutte le funzionalità è necessario creare un account. L'utente è responsabile della riservatezza delle proprie credenziali. Ogni attività effettuata dall'account è responsabilità dell'utente."],
    ["4. Abbonamento Premium", PAYMENTS_ENABLED ? "L'abbonamento Premium (2,99€/mese o 24,99€/anno) sblocca funzionalità avanzate e rimuove la pubblicità. Il rinnovo è automatico e può essere annullato in qualsiasi momento dal profilo." : "L'abbonamento Premium non è ancora disponibile. Quando verrà attivato, prezzi, rinnovo e modalità di disdetta saranno indicati in questa sezione e nella schermata di acquisto."],
    ["5. Contenuti e Proprietà Intellettuale", "Tutti i contenuti pubblicati dal Team B&T (articoli, immagini, video) sono di proprietà di B&T App. I dati di gara sono forniti da OpenF1 API. I loghi e i marchi di Formula 1, FIA e team sono di proprietà dei rispettivi titolari."],
    ["6. Condotta degli Utenti", "Nella chat community è vietato pubblicare contenuti offensivi, discriminatori, sessualmente espliciti, spam, materiale illegale o informazioni personali altrui. Con il tasto ⋯ su ogni messaggio puoi segnalarlo o bloccare chi l'ha scritto: i messaggi segnalati vengono controllati dai moderatori e rimossi se violano queste regole. Le violazioni possono comportare la sospensione dalla chat o dell'account."],
    ["7. Pubblicità", "Gli utenti non abbonati visualizzeranno annunci pubblicitari forniti tramite Google AdMob. Nell'Unione Europea ti chiediamo il consenso con il messaggio di Google e puoi cambiare le tue scelte in qualsiasi momento da Profilo → Preferenze privacy annunci."],
    ["8. Privacy e Cookie", null],
    ["9. Limitazione di Responsabilità", "B&T App non garantisce l'accuratezza assoluta dei dati live di gara. L'App è fornita \u201ccosì com'è\u201d. Non siamo responsabili per interruzioni del servizio, perdita di dati o danni derivanti dall'uso dell'App."],
    ["10. Modifiche ai Termini", "Ci riserviamo il diritto di modificare questi termini. Gli utenti saranno notificati tramite l'App. L'uso continuato dopo le modifiche costituisce accettazione dei nuovi termini."],
    ["11. Legge Applicabile", `I presenti Termini sono regolati dalla legge italiana. Per qualsiasi controversia è competente il Foro di Milano. Per contatti: ${CONTACT_EMAIL}`],
  ];
  const pStyle = { fontFamily: F_BODY, fontSize: 13, color: "#D8D8DA", lineHeight: 1.65, margin: "0 0 14px" };
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.8)", zIndex: 700, display: "flex", alignItems: "flex-end" }}>
      <div style={{ background: C.card, borderRadius: "24px 24px 0 0", width: "100%", maxHeight: "94%", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "22px 22px 8px", flexShrink: 0 }}>
          <h2 style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 19, color: C.text, margin: "0 0 4px" }}>TERMINI E CONDIZIONI</h2>
          {!review && <p style={{ fontFamily: F_BODY, fontSize: 12, color: C.muted, margin: 0 }}>Leggili e accettali per usare B&amp;T App.</p>}
        </div>
        <div className="scrollcol" style={{ flex: 1, minHeight: 0, padding: "8px 22px 6px" }}>
          {S.map(([h, b]) => (
            <div key={h}>
              <h3 style={{ fontFamily: F_HEAD, fontWeight: 800, fontStyle: "italic", fontSize: 14, color: C.accent, margin: "4px 0 6px" }}>{h}</h3>
              {b !== null ? <p style={pStyle}>{b}</p> : (
                <p style={pStyle}>Raccogliamo solo i dati necessari al funzionamento del servizio (email, nome, messaggi in chat, preferenze) e li conserviamo su Firebase (Google). Non vendiamo i dati a terzi. Puoi eliminare l'account e i tuoi dati in qualsiasi momento da Profilo → Elimina account. Tutti i dettagli sono nella <button className="press" onClick={() => openUrl(PRIVACY_URL)} aria-label="Apri la Privacy Policy" style={{ font: "inherit", color: C.accent, textDecoration: "underline", padding: 0 }}>Privacy Policy</button>.</p>
              )}
            </div>
          ))}
        </div>
        <div style={{ padding: "12px 22px 22px", borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
          <button className="press" onClick={review ? onClose : onAccept} style={{ display: "block", width: "100%", padding: "15px 0", borderRadius: 14, background: C.accent, fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 14, color: "#fff" }}>{review ? "CHIUDI" : "ACCETTO"}</button>
        </div>
      </div>
    </div>
  );
}

function InfoModal({ title, body, onClose }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 600, display: "flex", alignItems: "flex-end" }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="scrollcol" style={{ background: C.card, borderRadius: "24px 24px 0 0", width: "100%", maxHeight: "80%", padding: "22px 22px 28px", position: "relative" }}>
        <button className="press" aria-label="Chiudi" onClick={onClose} style={{ position: "absolute", top: 16, right: 16, width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="close" size={13} sw={2.2} />
        </button>
        <h2 style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 19, color: C.text, margin: "0 26px 14px 0" }}>{title}</h2>
        {body.split("\n\n").map((p, i) => (
          <p key={i} style={{ fontFamily: F_BODY, fontSize: 13.5, color: "#D8D8DA", lineHeight: 1.7, margin: "0 0 12px" }}>{p}</p>
        ))}
      </div>
    </div>
  );
}

function DriverDetailModal({ driver, onClose }) {
  const q1 = `1:2${driver.pos % 5}.${300 + driver.pos * 37}`;
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 600, display: "flex", alignItems: "flex-end" }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="scrollcol" style={{ background: C.card, borderRadius: "24px 24px 0 0", width: "100%", maxHeight: "90%", position: "relative" }}>
        <div style={{ position: "relative", height: 230, borderRadius: "24px 24px 0 0", overflow: "hidden", background: `linear-gradient(160deg, ${driver.color} 0%, ${driver.color}55 45%, ${C.card} 100%)` }}>
          <span style={{ position: "absolute", left: 18, top: 8, fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 110, lineHeight: 1, color: "rgba(255,255,255,.14)" }}>{driver.pos}</span>
          {driver.photo ? (
            <img src={driver.photo} alt={driver.full} style={{ position: "absolute", right: 8, bottom: 0, height: 222, width: "auto", maxWidth: "50%", objectFit: "contain", objectPosition: "right bottom" }} />
          ) : (
            <svg viewBox="0 0 120 150" style={{ position: "absolute", right: 22, bottom: 0, height: 190 }} aria-hidden="true">
              <circle cx="60" cy="42" r="28" fill="rgba(0,0,0,.28)" />
              <path d="M8 150 C10 100 30 80 60 80 C90 80 110 100 112 150 Z" fill="rgba(0,0,0,.28)" />
            </svg>
          )}
          <button className="press" aria-label="Chiudi" onClick={onClose} style={{ position: "absolute", top: 14, right: 14, width: 32, height: 32, borderRadius: "50%", background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="close" size={13} sw={2.2} color="#fff" />
          </button>
          <div style={{ position: "absolute", left: 18, bottom: 16, maxWidth: "48%" }}>
            <span style={{ display: "block", fontFamily: F_BODY, fontWeight: 700, fontSize: 10.5, letterSpacing: 1.2, color: "rgba(255,255,255,.8)", marginBottom: 2 }}>{driver.team.toUpperCase()}</span>
            <h2 style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 24, lineHeight: 1.05, color: "#fff", margin: 0, textShadow: "0 2px 10px rgba(0,0,0,.4)" }}>{driver.full}</h2>
          </div>
        </div>
        <div style={{ padding: "16px 22px 28px" }}>
        <span style={{ display: "block", fontFamily: F_BODY, fontSize: 11.5, color: C.dim, marginBottom: 10 }}>{driver.born} · {driver.nat}</span>
        <p style={{ fontFamily: F_BODY, fontSize: 13, lineHeight: 1.55, color: C.muted, margin: "0 0 16px" }}>{driver.bio}</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 6 }}>
          {[["VITTORIE", driver.wins, C.text], ["PODI", driver.podiums, C.text], ["TITOLI MONDIALI", driver.titles, C.gold]].map(([label, val, col]) => (
            <div key={label} style={{ padding: "12px 6px", borderRadius: 12, background: "rgba(255,255,255,.04)", textAlign: "center" }}>
              <span style={{ display: "block", fontFamily: F_HEAD, fontWeight: 900, fontSize: 24, color: col, lineHeight: 1.1 }}>{val}</span>
              <span style={{ display: "block", fontFamily: F_BODY, fontWeight: 600, fontSize: 9, letterSpacing: .6, color: C.dim, marginTop: 3 }}>{label}</span>
            </div>
          ))}
        </div>
        <span style={{ display: "block", fontFamily: F_BODY, fontSize: 10, color: C.dim, marginBottom: 18 }}>{STATS_NOTE}</span>
        {driver.helmet && (
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", borderRadius: 16, marginBottom: 18, border: `1px solid ${C.border}`,
            background: `radial-gradient(90% 130% at 18% 50%, ${driver.color}40 0%, rgba(255,255,255,.03) 70%)` }}>
            <img src={driver.helmet} alt={"Casco di " + driver.full} style={{ width: 132, height: 104, objectFit: "contain", flexShrink: 0, filter: "drop-shadow(0 10px 14px rgba(0,0,0,.5))" }} />
            <div style={{ minWidth: 0 }}>
              <span style={{ display: "block", fontFamily: F_BODY, fontWeight: 700, fontSize: 10.5, letterSpacing: 1, color: C.dim, marginBottom: 4 }}>IL CASCO</span>
              <span style={{ display: "block", fontFamily: F_HEAD, fontWeight: 800, fontStyle: "italic", fontSize: 16, lineHeight: 1.2, color: C.text }}>{driver.full}</span>
              {driver.helmetNote && <span style={{ display: "block", fontFamily: F_BODY, fontSize: 10.5, color: C.dim, marginTop: 5 }}>{driver.helmetNote}</span>}
            </div>
          </div>
        )}
        <span style={{ display: "block", fontFamily: F_BODY, fontWeight: 700, fontSize: 10.5, letterSpacing: 1, color: C.dim, marginBottom: 8 }}>IN QUESTA GARA</span>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.04)" }}>
            <span style={{ display: "block", fontFamily: F_BODY, fontSize: 10, color: C.dim, marginBottom: 3 }}>POSIZIONE</span>
            <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 16, color: C.text }}>P{driver.pos}</span>
          </div>
          <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.04)" }}>
            <span style={{ display: "block", fontFamily: F_BODY, fontSize: 10, color: C.dim, marginBottom: 3 }}>DISTACCO</span>
            <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 16, color: C.text }}>{driver.gap}</span>
          </div>
          <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.04)" }}>
            <span style={{ display: "block", fontFamily: F_BODY, fontSize: 10, color: C.dim, marginBottom: 3 }}>MIGLIOR GIRO QUALIFICA</span>
            <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 16, color: C.text }}>{q1}</span>
          </div>
          <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.04)" }}>
            <span style={{ display: "block", fontFamily: F_BODY, fontSize: 10, color: C.dim, marginBottom: 3 }}>GRIGLIA</span>
            <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 16, color: C.text }}>P{driver.pos}</span>
          </div>
        </div>
        <div style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,.04)", display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="info" size={13} color={C.dim} />
          <span style={{ fontFamily: F_BODY, fontSize: 11, color: C.dim, lineHeight: 1.4 }}>Anteprima — nella app reale i dati di qualifica arriverebbero in diretta da F1Dash.</span>
        </div>
        </div>
      </div>
    </div>
  );
}

const TRACK_D = "M50,20 L250,20 A30,30 0 0 1 280,50 L280,130 A30,30 0 0 1 250,160 L50,160 A30,30 0 0 1 20,130 L20,50 A30,30 0 0 1 50,20 Z";

function LiveTrackView({ onClose }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: "#050506", zIndex: 600, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 16px 14px", flexShrink: 0 }}>
        <button className="press" aria-label="Chiudi" onClick={onClose} style={{ width: 38, height: 38, borderRadius: "50%", background: C.card, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="close" size={15} sw={2.2} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 17, color: C.text, margin: 0 }}>TRACCIATO LIVE</h1>
          <span style={{ fontFamily: F_BODY, fontSize: 11, color: C.dim }}>Anteprima grafica — posizioni non reali</span>
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ position: "relative", width: 300, height: 180 }}>
          <svg width="300" height="180" viewBox="0 0 300 180" style={{ position: "absolute", inset: 0 }}>
            <path d={TRACK_D} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="22" strokeLinejoin="round" />
            <path d={TRACK_D} fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2" strokeDasharray="6 6" strokeLinejoin="round" />
          </svg>
          {DRIVERS.map((d, i) => (
            <div key={d.id} className="track-dot" style={{
              position: "absolute", top: 0, left: 0,
              width: 11, height: 11, marginTop: -5.5, marginLeft: -5.5,
              borderRadius: "50%", background: d.color,
              border: "2px solid rgba(0,0,0,.45)", boxShadow: "0 0 6px rgba(0,0,0,.5)",
              offsetPath: `path("${TRACK_D}")`,
              animation: "trackmove 7s linear infinite",
              animationDelay: (-(i * 7 / DRIVERS.length)) + "s",
            }} />
          ))}
        </div>
        <div style={{ marginTop: 26, padding: "12px 16px", borderRadius: 12, background: C.card, border: `1px solid ${C.border}`, maxWidth: 280 }}>
          <span style={{ fontFamily: F_BODY, fontSize: 11.5, color: C.muted, lineHeight: 1.5 }}>Nella app reale le posizioni sarebbero sincronizzate in tempo reale con le API di telemetria ufficiali (es. F1Dash).</span>
        </div>
      </div>
    </div>
  );
}

/* ── APP ROOT ───────────────────────────────────────────────────────── */
// Dati personali di chi entra con un account (users/<email>.app2, src/services/appdata.js): valori di partenza.
const USER_INIT = {
  saved: [], favTeam: null, favDriver: null, notifPrefs: { team: true, driver: true }, votes: {},
  squad: FANTA_SQUAD_INIT, squadBase: { drivers: FANTA_SQUAD_INIT.drivers.slice(), teams: FANTA_SQUAD_INIT.teams.slice() }, freeTransfers: 3,
  predAnswers: {}, sillyPreds: {}, stratPreds: {}, pitBest: null, wxGuess: {}, ratings: {}, dotd: {}, notifSeenAt: 0,
};
const NOT_SAVED = "Non salvato: controlla la connessione e riprova.";
const OFFLINE_LINE = "Sei offline: alcuni contenuti potrebbero non essere aggiornati.";
const SHARED_REFRESH_MS = 60000;   // ogni minuto si rilegge bt-races: una gara messa LIVE arriva senza riavviare
const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const fmtSent = iso => { const t = Compat.parseDate(iso); return isNaN(t) ? "" : new Date(t).toLocaleString("it-IT", { timeZone: "Europe/Rome", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); };

function App() {
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState("home");
  const [view, setView] = useState("tab");
  const [igFrom, setIgFrom] = useState("tab");   // da dove si è aperta la pagina Instagram (Home o Profilo)
  // Contenuti condivisi (Firebase, shared/*): valori di serie finché Firebase non risponde (src/services/appdata.js).
  const [shared0] = useState(() => { const v = AppData.sharedDefaults(nowMs()); addStandingsGuests(v.standings.guests); return v; });
  const [offline, setOffline] = useState(false);   // all'avvio qualcosa non si è potuto leggere: riga "Sei offline"
  const [pitBest, setPitBest] = useState(USER_INIT.pitBest);   // Garage: miglior tempo del Pit Stop Challenge
  const [highlights, setHighlights] = useState(shared0.highlights);   // archivio "Video HIGHLIGHTS esclusivi" (Premium)
  const [sillyPreds, setSillyPreds] = useState(USER_INIT.sillyPreds);       // Silly Season: { sedile: { pick, renew, at } }
  const [stratPreds, setStratPreds] = useState(USER_INIT.stratPreds);       // Tire Strategy Predictor: { gara: { stints, at } }
  const [sillyOfficial, setSillyOfficial] = useState(shared0.silly);       // comunicati ufficiali registrati dall'admin
  const [driverPhotos, setDriverPhotos] = useState(shared0.driverPhotos);  // foto dei piloti caricate dall'admin (Task 14)
  const predictSeat = (id, pr) => setSillyPreds(x => x[id] ? x : { ...x, [id]: pr });
  const [articleId, setArticleId] = useState(null);
  const [chatId, setChatId] = useState(null);
  // Ogni messaggio ha un id: serve a segnalarlo ed eliminarlo (moderazione).
  const [chats, setChats] = useState(() => CHATS_INIT.map(c => ({ ...c, messages: c.messages.map((m, i) => ({ id: c.id + "-" + i, ...m })) })));
  const [termsAccepted, setTermsAccepted] = useState(false); // Termini accettati al primo ingresso
  const [termsOpen, setTermsOpen] = useState(false);         // rilettura dal profilo
  const [reports, setReports] = useState([]);   // segnalazioni per il moderatore
  const [banned, setBanned] = useState([]);     // utenti sospesi dalla chat
  const [blocked, setBlocked] = useState([]);   // utenti che ho bloccato
  const [saved, setSaved] = useState(USER_INIT.saved);       // articoli salvati tra i preferiti (id)
  const [savedOnly, setSavedOnly] = useState(false); // Home: mostra solo i salvati
  // FantaF1 come F1 Fantasy: la squadra, quella dell'ultima chiusura (per contare i cambi) e i cambi gratis.
  const [squad, setSquad] = useState(USER_INIT.squad);
  const [squadBase, setSquadBase] = useState(USER_INIT.squadBase);
  const [freeTransfers, setFreeTransfers] = useState(USER_INIT.freeTransfers);
  const [fantaWeekends, setFantaWeekends] = useState([]);   // punti delle sessioni già corse: { id, raceId, type, total, lines }
  const [demoLock, setDemoLock] = useState({});             // { idGara: true } squadra bloccata dalla diretta demo
  const [predictions, setPredictions] = useState(shared0.predictions);   // previsioni avanzate (+1 punto), dell'admin
  const [predAnswers, setPredAnswers] = useState(USER_INIT.predAnswers);   // { idDomanda: risposta }
  const [lastRace, setLastRace] = useState(LAST_RACE_INIT);           // ultima gara: podio e classifica
  const [leagues, setLeagues] = useState(LEAGUES_INIT);   // leghe FantaF1 (quella creata da te si modifica)
  const [homePoll, setHomePoll] = useState(shared0.homePoll);    // sondaggio della Home (Premium); null = nessuno
  const [votes, setVotes] = useState(USER_INIT.votes);           // { idSondaggio: idRisposta }
  const [notifsRaw, setNotifsRaw] = useState(shared0.notifs);    // shared/bt-notifs come sono salvate
  const [localNotifs, setLocalNotifs] = useState([]);            // avvisi di questo telefono (notizia sul tuo preferito)
  const [notifSeenAt, setNotifSeenAt] = useState(USER_INIT.notifSeenAt);   // ora dell'ultima "Segna tutte come lette"
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [plan, setPlan] = useState("annual");
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [trial, setTrial] = useState(null);   // prova gratuita: { start, end } (una sola volta)
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [liveTrackOpen, setLiveTrackOpen] = useState(false);
  const [infoModal, setInfoModal] = useState(null);
  const [articles, setArticles] = useState(shared0.news);
  const [tagFilter, setTagFilter] = useState(null);
  const [favTeam, setFavTeam] = useState(USER_INIT.favTeam);
  const [favDriver, setFavDriver] = useState(USER_INIT.favDriver);
  const [notifPrefs, setNotifPrefs] = useState(USER_INIT.notifPrefs);
  const [picker, setPicker] = useState(null); // 'team' | 'driver'
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [guest, setGuest] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginReason, setLoginReason] = useState(null);
  const needLogin = (reason) => { setLoginReason(reason); setLoginOpen(true); };
  const [adminTab, setAdminTab] = useState("NEWS");
  const [fantaStats, setFantaStats] = useState(shared0.fantaStats);
  const [standings, setStandings] = useState(shared0.standings);   // { note, drivers, teams, guests }
  // Calendario 2026 con lo stato di shared/bt-races; extra = gare salvate fuori calendario, che restano nel documento.
  const [racesDoc, setRacesDoc] = useState(shared0.races);
  const races = racesDoc.races;
  const [ig, setIg] = useState(shared0.ig);
  const [shareId, setShareId] = useState(null);   // articolo aperto nel foglio "Condividi"
  const [circuitId, setCircuitId] = useState(null); // pagina "Mostra di più" del circuito
  // Diretta demo: sessione simulata (prove, qualifiche, gara) che avanza 4 volte al secondo.
  const [live, setLive] = useState(null);          // { raceId, type, sim, track }
  const [, setLiveTick] = useState(0);
  const [liveSpeed, setLiveSpeed] = useState(3);
  const [telemetry, setTelemetry] = useState(null); // { carId, lapNo, sector }
  const [lapList, setLapList] = useState(null);     // pilota di cui vedere tutti i tempi sul giro
  const [ssOpen, setSsOpen] = useState(false);      // Second Screen a tutto schermo
  const [ssLayout, setSsLayout] = useState(SS_LAYOUT_INIT);   // grafiche scelte e loro posto
  const [ssPrefs, setSsPrefs] = useState(SS_PREFS_INIT);      // piloti delle gomme, pilota della telemetria, radar
  const [dotd, setDotd] = useState({});                       // voti del pilota e della scuderia del giorno, per gara
  const [aboutMe, setAboutMe] = useState(ABOUT_INIT);         // About You: anno di nascita, anni di F1, tipo di tifoso
  // Pagelle della community: { "r16:RACE": { pilota: { pace, aggr, gomme, fortuna, strategia } } }; un voto per pilota.
  const [ratings, setRatings] = useState({});
  const rateDriver = (key, id, vals) => setRatings(r => { const cur = r[key] || {}; return cur[id] ? r : { ...r, [key]: { ...cur, [id]: vals } }; });
  const voteDotd = (raceId, kind, id) => setDotd(v => { const cur = v[raceId] || {}; return cur[kind] ? v : { ...v, [raceId]: { ...cur, [kind]: id } }; });
  // Pronostici meteo (pioggia sì o no) e loro esito a fine sessione: danno i punti bonus del FantaF1.
  const [wxGuess, setWxGuess] = useState({});     // { "r16:FP1": "rain" | "dry" }
  const [wxResult, setWxResult] = useState({});   // { "r16:FP1": "rain" | "dry" }
  const closeSessionRef = useRef(null);
  useEffect(() => {   // sessione arrivata alla bandiera a scacchi: si scopre il meteo com'è andato
    if (!live) return;
    const iv = setInterval(() => { if (live.sim.state().finished && closeSessionRef.current) closeSessionRef.current(live); }, 1000);
    return () => clearInterval(iv);
  }, [live]);
  const liveShown = useRef(false);
  // Avvisi della diretta, come le notifiche di un'app, sopra a tutto (anche nel Second Screen):
  // il giro più veloce in gara e i ritiri. Uno alla volta per qualche secondo; i ritiri passano davanti.
  const [notice, setNotice] = useState(null);
  const noticeRef = useRef({ q: [], cur: null, best: null, dnf: 0, timer: null });
  const nextNotice = () => {
    const R = noticeRef.current; clearTimeout(R.timer);
    R.cur = R.q.shift() || null; setNotice(R.cur);
    if (R.cur) R.timer = setTimeout(nextNotice, NOTICE_MS);
  };
  const pollNotices = lv => {
    const R = noticeRef.current; if (!lv) return;
    const f = lv.sim.feed(), dnfs = [], fast = [];
    f.dnfs.slice(R.dnf).forEach(x => dnfs.push({ key: "dnf:" + x.id, kind: "dnf", id: x.id, code: x.code, cause: x.cause, lap: x.lap }));
    R.dnf = f.dnfs.length;
    const b = f.bestLap;
    if (b && isRaceType(lv.type) && !(R.best && R.best.id === b.id && R.best.lapNo === b.lapNo)) {
      R.best = b; fast.push({ key: "fl:" + b.id + ":" + b.lapNo, kind: "fastest", id: b.id, code: b.code, time: b.time, lap: b.lapNo });
    }
    if (!dnfs.length && !fast.length) return;
    R.q = [...dnfs, ...R.q.filter(n => !(fast.length && n.kind === "fastest")), ...fast];   // del giro più veloce vale l'ultimo
    if (!R.cur) nextNotice();
  };
  useEffect(() => {
    const R = noticeRef.current; clearTimeout(R.timer);
    noticeRef.current = { q: [], cur: null, best: null, dnf: 0, timer: null }; setNotice(null);
    if (!live) return;
    const iv = setInterval(() => pollNotices(live), 500);
    return () => { clearInterval(iv); clearTimeout(noticeRef.current.timer); };
  }, [live]);
  useEffect(() => {
    if (!live) { window.__btLive = null; return; }
    // usato dai test: avanti veloce, stato, un giro, ritiro
    window.__btLive = {
      advance: sec => { live.sim.advance(sec); setLiveTick(n => n + 1); pollNotices(live); },
      state: () => live.sim.state(),
      lap: (id, lapNo) => live.sim.laps(id).find(l => l.lapNo === lapNo) || null,
      retire: (id, cause) => { const ok = live.sim.retire(id, cause); setLiveTick(n => n + 1); pollNotices(live); return ok; },
    };
    const iv = setInterval(() => { live.sim.advance(0.25 * liveSpeed); if (liveShown.current) setLiveTick(n => n + 1); }, 250);
    return () => clearInterval(iv);
  }, [live, liveSpeed]);
  // ── Contenuti condivisi su Firebase (src/services/appdata.js) ──────────
  // Un nuovo valore uguale a quello che c'è già non cambia lo stato (niente ridisegni inutili a ogni rilettura).
  const keep = set => v => set(cur => (sameJson(cur, v) ? cur : v));
  const sharedSet = {
    news: keep(setArticles), races: keep(setRacesDoc), notifs: keep(setNotifsRaw), ig: keep(setIg),
    standings: v => { addStandingsGuests(v.guests); keep(setStandings)(v); },
    highlights: keep(setHighlights), silly: keep(setSillyOfficial), predictions: keep(setPredictions),
    homePoll: keep(setHomePoll), fantaStats: keep(setFantaStats), driverPhotos: keep(setDriverPhotos),
  };
  // Rilegge i contenuti indicati (tutti, all'avvio) e mette nello stato quelli letti davvero.
  const refreshShared = kinds => AppData.loadShared(nowMs(), kinds ? { kinds } : undefined).then(r => {
    (kinds ? r.fresh : Object.keys(r.values)).forEach(k => sharedSet[k](r.values[k]));
    setOffline(r.offline);
  });
  // Salvataggio dell'Admin: prima Firebase, poi lo schermo. Se non riesce, l'avviso e lo schermo come prima (si può
  // riprovare); se il contenuto non era ancora stato letto da Firebase, intanto lo si rilegge.
  const commitShared = (kind, value) => AppData.saveShared(kind, value, nowMs()).then(v => { sharedSet[kind](v); return true; }, e => {
    showToast(NOT_SAVED);
    if (e && e.code === "stale") refreshShared(AppData.staleKinds());
    return false;
  });
  const updOf = (cur, u) => (typeof u === "function" ? u(cur) : u);
  const adminSet = {
    articles: u => commitShared("news", updOf(articles, u)),
    races: u => commitShared("races", { races: updOf(races, u), extra: racesDoc.extra }),
    extraRaces: u => commitShared("races", { races, extra: updOf(racesDoc.extra, u) }),
    standings: u => commitShared("standings", { ...standings, ...updOf(standings, u) }),   // gli ospiti restano
    fantaStats: u => commitShared("fantaStats", updOf(fantaStats, u)),
    ig: u => commitShared("ig", updOf(ig, u)),
    highlights: u => commitShared("highlights", updOf(highlights, u)),
    predictions: u => commitShared("predictions", updOf(predictions, u)),
  };
  const officialSeat = (id, o) => commitShared("silly", { ...sillyOfficial, [id]: o });

  // ── Dati personali dell'account: si leggono all'accesso e si salvano 800 ms dopo ogni modifica ──
  // (users/<email>.app2). Per l'ospite restano in memoria.
  const [userEmail, setUserEmail] = useState(null);
  const userEmailRef = useRef(null);
  const userReady = useRef(false);   // dati dell'account letti: da qui in poi le modifiche si salvano
  const userSnap = useRef({});       // ultimo valore letto o salvato di ogni dato (JSON): si manda solo quello che cambia
  const userVals = { saved, favTeam, favDriver, notifPrefs, votes, squad, squadBase, freeTransfers, predAnswers, sillyPreds, stratPreds, pitBest, wxGuess, ratings, dotd, notifSeenAt };
  const userValsRef = useRef(userVals);
  userValsRef.current = userVals;
  const userSet = { saved: setSaved, favTeam: setFavTeam, favDriver: setFavDriver, notifPrefs: setNotifPrefs, votes: setVotes, squad: setSquad, squadBase: setSquadBase,
    freeTransfers: setFreeTransfers, predAnswers: setPredAnswers, sillyPreds: setSillyPreds, stratPreds: setStratPreds, pitBest: setPitBest, wxGuess: setWxGuess,
    ratings: setRatings, dotd: setDotd, notifSeenAt: setNotifSeenAt };
  const loadUser = em => AppData.loadUserData(em).then(data => {
    if (userEmailRef.current !== em) return;   // intanto si è usciti, o è entrato un altro account
    const cur = userValsRef.current;
    AppData.USER_KEYS.forEach(k => { if (data[k] !== undefined) userSet[k](data[k]); });
    userSnap.current = Object.fromEntries(AppData.USER_KEYS.map(k => [k, JSON.stringify(data[k] !== undefined ? data[k] : cur[k])]));
    userReady.current = true;
  }, () => {});   // senza rete i dati restano in memoria: si riprova alla prossima rilettura
  const enterAccount = email => {
    const em = String(email || "").trim().toLowerCase();
    if (!em) return;
    userEmailRef.current = em; userReady.current = false; setUserEmail(em);
    loadUser(em);
  };
  const resetUser = () => { userEmailRef.current = null; userReady.current = false; setUserEmail(null); AppData.USER_KEYS.forEach(k => userSet[k](USER_INIT[k])); };
  const leaveAccount = () => { AppData.flushUserData().catch(() => {}); resetUser(); };
  useEffect(() => {
    if (!userEmail || !userReady.current) return;
    const patch = {};
    AppData.USER_KEYS.forEach(k => { const j = JSON.stringify(userVals[k]); if (j !== userSnap.current[k]) { patch[k] = userVals[k]; userSnap.current[k] = j; } });
    if (Object.keys(patch).length) AppData.saveUserData(userEmail, patch).catch(() => {});   // se non riesce resta in attesa
  }, [userEmail, ...AppData.USER_KEYS.map(k => userVals[k])]);

  // All'avvio si legge tutto; poi ogni minuto bt-races (una gara messa LIVE arriva da sola), quello che non si era
  // potuto leggere e i dati personali non ancora letti o non ancora salvati.
  useEffect(() => {
    refreshShared();
    const iv = setInterval(() => {
      refreshShared(["races", ...AppData.staleKinds().filter(k => k !== "races")]);
      if (userEmailRef.current && !userReady.current) loadUser(userEmailRef.current);
      AppData.flushUserData().catch(() => {});
    }, SHARED_REFRESH_MS);
    return () => clearInterval(iv);
  }, []);

  // Notifiche: quelle dell'admin (shared/bt-notifs) più gli avvisi di questo telefono. Sono da leggere quelle più nuove
  // dell'ultima "Segna tutte come lette" (notifSeenAt, nell'account).
  const notifs = [
    ...localNotifs,
    ...Compat.notifsFromStore(notifsRaw, notifSeenAt, nowMs()).map(n => ({ icon: "bell", bg: C.accent, stroke: "#fff", ...n })),
  ];
  const sentNotifs = Compat.notifsFromStore(notifsRaw, 0, nowMs()).map(n => ({ id: n.id, title: n.title, body: n.body, sentAt: fmtSent(n.date) }));
  const sendNotif = (title, body) => AppData.appendNotif({ title, body }, nowMs())
    .then(n => { setNotifsRaw(l => [...l, n]); return true; }, () => { showToast(NOT_SAVED); return false; });
  const deleteNotif = id => AppData.removeNotif(id)
    .then(() => { setNotifsRaw(l => l.filter(n => String(n.id) !== String(id))); return true; }, () => { showToast(NOT_SAVED); return false; });

  const filterByTag = (t) => { setTagFilter(t); setSavedOnly(false); setTab("home"); setView("tab"); };
  const SAVE_NEEDS_ACCOUNT = "Per salvare gli articoli tra i preferiti serve un account.";
  const toggleSave = (id) => {
    if (guest) { needLogin(SAVE_NEEDS_ACCOUNT); return; }
    const was = saved.includes(id);
    setSaved(s => was ? s.filter(x => x !== id) : [id, ...s]);
    showToast(was ? "Tolto dai preferiti" : "Salvato tra i preferiti");
  };
  const openSaved = () => { if (guest) { needLogin(SAVE_NEEDS_ACCOUNT); return; } setTagFilter(null); setSavedOnly(true); setTab("home"); setView("tab"); };

  // Pubblica (o salva in bozza) una notizia in shared/bt-news. Restituisce true se è salvata: solo allora il modulo
  // dell'admin si svuota e si torna alla Home.
  const publishArticle = (a) => {
    const art = { ...a, id: Compat.uid(), date: new Date(nowMs()).toISOString() };
    return commitShared("news", [art, ...articles]).then(ok => {
      if (!ok) return false;
      if (a.published === false) { showToast("Bozza salvata"); return true; }
      const hits = [];
      if (favTeam && notifPrefs.team && (a.teams || []).includes(favTeam)) hits.push(teamById(favTeam));
      if (favDriver && notifPrefs.driver && (a.drivers || []).includes(favDriver)) hits.push(driverById(favDriver));
      if (hits.length) {
        const h = hits[0];
        setLocalNotifs(ns => [{ id: "l-" + art.id, icon: "doc", bg: h.color, stroke: "#141414", title: `Nuova notizia ${hits.map(x => x.tag).join(" ")}`, body: a.title, time: "Adesso", unread: true }, ...ns]);
        showToast(`Notifica inviata: ${hits.map(x => x.tag).join(" ")}`);
      } else {
        showToast("Notizia pubblicata");
      }
      setTagFilter(null);
      setTab("home");
      setView("tab");
      return true;
    });
  };

  const ABOUT_TEXT = "B&T nasce dalla passione di un gruppo di amici per la Formula 1: un posto solo nostro per seguire le gare, parlarne insieme e tenere traccia di come va la nostra lega FantaF1.\n\nQui trovi le news, la diretta gara, la nostra chat e il nostro Instagram, tutto in un'unica app.\n\nTracciati dei circuiti: f1-circuits di Tomislav Bacinger, licenza MIT.\n\nVersione anteprima — 2026.";
  const HELP_TEXT = "Hai domande o hai trovato un problema nell'app? Scrivici, ti rispondiamo il prima possibile.\n\nEmail: bt.formula1@gmail.com\n\nOppure passa dalla Chat Generale: la community è sempre pronta a dare una mano.";

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };

  const goTab = (t) => { setTab(t); setView("tab"); };
  const unreadCount = notifs.filter(n => n.unread).length;

  const castVote = (pollId, optionId) => {
    if (guest) { needLogin("Per votare nei sondaggi serve un account."); return; }
    setVotes(v => ({ ...v, [pollId]: optionId }));
  };
  const setPollAnswer = (pollId, optionId) => {
    const save = pollId === "home"
      ? commitShared("homePoll", { ...homePoll, answer: optionId })
      : commitShared("news", articles.map(a => a.poll && "art-" + a.id === pollId ? { ...a, poll: { ...a.poll, answer: optionId } } : a));
    return save.then(ok => { if (ok) showToast(optionId ? "Risposta esatta segnata: chi l'ha votata prende +2 punti" : "Risposta esatta tolta"); return ok; });
  };
  const openArticle = (id) => { setArticleId(id); setShareId(null); setView("article"); };
  const openCircuit = (id) => { setCircuitId(id); setView("circuit"); };
  // Fine di una sessione (demo), una volta sola: com'è andato il meteo, punti FantaF1 della sessione
  // e, a fine gara, podio e riapertura della squadra (con i cambi gratis del weekend dopo).
  const closeSession = (lv) => {
    if (!lv || lv.closed) return;
    const race = races.find(r => r.id === lv.raceId); if (!race) return;
    lv.closed = true;
    const stNow = lv.sim.state();
    const x = weekendWeather(race).sessions.find(s => s.key === lv.type);
    const k = race.id + ":" + lv.type;
    if (x) setWxResult(r => r[k] ? r : { ...r, [k]: x.outcome });
    if (stNow.finished && ["QUALI", "SPRINT", "RACE"].includes(lv.type)) {
      const order = stNow.cars.map(c => ({ id: c.id, pos: c.pos, grid: c.grid, out: c.out ? c.outIn : null, dnf: !!c.dnf }));
      const pts = BtLogic.sessionPoints({ type: lv.type, fastest: stNow.bestLap ? stNow.bestLap.id : null, order }, TEAM_OF);
      const complete = squad.drivers.every(Boolean) && squad.teams.every(Boolean);
      const sc = complete ? BtLogic.squadScore(squad, pts) : { total: 0, lines: [] };
      setFantaWeekends(ws => ws.some(w => w.id === k) ? ws : [...ws, { id: k, raceId: race.id, type: lv.type, total: sc.total, lines: sc.lines }]);
    }
    if (lv.type === "RACE") {
      const tr = BtLogic.transfers(squadBase, squad, freeTransfers);
      if (tr.penalty) setFantaWeekends(ws => ws.some(w => w.id === race.id + ":PEN") ? ws : [...ws, { id: race.id + ":PEN", raceId: race.id, type: "PEN", total: -tr.penalty, lines: [] }]);
      setSquadBase({ drivers: squad.drivers.slice(), teams: squad.teams.slice() });
      setFreeTransfers(tr.unlimited ? BtLogic.RULES.freeTransfers : BtLogic.nextFree(freeTransfers, tr.used));
      setDemoLock(d => ({ ...d, [race.id]: false }));
      if (stNow.finished) setLastRace({ raceId: race.id, name: race.name, type: "RACE", real: false, fastest: stNow.bestLap ? stNow.bestLap.id : null,
        rows: stNow.cars.map((c, i) => c.dnf ? { id: c.id, pos: null, time: "Ritirato", dnf: c.dnf.cause, why: `${DNF_LABEL[c.dnf.cause]} · giro ${c.dnf.lap}` } : ({ id: c.id, pos: c.pos, time: i === 0 ? `${stNow.totalLaps} giri` : c.lapsDown > 0 ? `+${c.lapsDown} ${c.lapsDown === 1 ? "giro" : "giri"}` : "+" + (c.gap || 0).toFixed(3) + "s" })) });
    }
  };
  closeSessionRef.current = closeSession;
  const guessWeather = (race, key, v) => {
    if (guest) { needLogin("Per fare i pronostici serve un account."); return; }
    setWxGuess(g => ({ ...g, [race.id + ":" + key]: v }));
    showToast(`Pronostico salvato: ${WX_WORD(v)}`);
  };
  // Diretta demo: avvio, stop, bandiere e ultimo giro (dal pannello admin).
  const startLive = (raceId, type) => {
    if (live) closeSession(live);
    const race = races.find(r => r.id === raceId);
    const circ = race && CIRCUITS[race.circuitId];
    if (!circ) { showToast("Per questa gara non c'è il tracciato"); return; }
    const track = LiveSim.buildTrack(circ);
    const sched = weekendWeather(race).sessions.find(s => s.key === type);
    const [hh, mm] = (sched ? sched.time : "15:00").split(":").map(Number);
    const sim = LiveSim.createSession({ track, drivers: LIVE_DRIVERS, type, seed: race.round * 97 + type.length, script: true, startClock: hh * 3600 + mm * 60 });
    setLive({ raceId, type, sim, track }); setLapList(null);
    if (["SQ", "QUALI", "SPRINT", "RACE"].includes(type)) setDemoLock(d => ({ ...d, [raceId]: true }));   // squadra bloccata fino a fine gara
    setTelemetry(null);   // la prova non cambia lo stato delle gare: quello lo vedono tutti (shared/bt-races, D23)
    showToast(`${sessionName(type)} in diretta (demo)`);
  };
  const stopLive = () => {
    if (live) closeSession(live);
    setLive(null); setTelemetry(null); setLapList(null); showToast("Diretta terminata");
  };
  const liveFlag = (kind, sector) => { if (live) { live.sim.setFlag(kind, sector); setLiveTick(n => n + 1); } };
  const liveRetire = (id, cause) => {
    if (!live || !live.sim.retire(id, cause)) return;
    setLiveTick(n => n + 1); pollNotices(live);
    const d = driverById(id); showToast(`${d ? d.full : id} ritirato: ${DNF_LABEL[cause] || DNF_LABEL.altro}`);
  };
  const liveLastLap = () => { if (live) { live.sim.jumpToLastLap(); live.sim.advance(0.5); setLiveTick(n => n + 1); showToast(isRaceType(live.type) ? "Ultimo giro" : "Ultimo minuto"); } };
  const openChat = (id) => { setChatId(id); setView("chatThread"); };
  const sendMessage = (id, text) => setChats(cs => cs.map(c => c.id === id ? { ...c, messages: [...c.messages, { id: "m" + Date.now(), from: "Tu", text, mine: true }] } : c));
  // Moderazione chat, come nell'app vera.
  const reportMessage = (chatId, m) => {
    setReports(rs => rs.some(r => r.msgId === m.id) ? rs : [{ id: "r" + Date.now(), chatId, msgId: m.id, text: m.text, author: m.from, by: "Tu" }, ...rs]);
    showToast("Segnalazione inviata: la controlleremo al più presto. Grazie!");
  };
  const blockUser = (m) => { setBlocked(bs => bs.some(b => b.name === m.from) ? bs : [...bs, { name: m.from }]); showToast(`Non vedrai più i messaggi di ${m.from}. Puoi sbloccarlo dal Profilo.`); };
  const unblockUser = (name) => setBlocked(bs => bs.filter(b => b.name !== name));
  const deleteChatMsg = (chatId, msgId) => { setChats(cs => cs.map(c => c.id === chatId ? { ...c, messages: c.messages.filter(m => m.id !== msgId) } : c)); setReports(rs => rs.filter(r => r.msgId !== msgId)); showToast("Messaggio eliminato"); };
  const suspendUser = (name) => { setBanned(bs => bs.some(b => b.name === name) ? bs : [...bs, { name }]); showToast(`${name} non può più scrivere in chat`); };
  const unsuspendUser = (name) => setBanned(bs => bs.filter(b => b.name !== name));
  const ignoreReport = (id) => setReports(rs => rs.filter(r => r.id !== id));
  // Elimina account (richiesto da Google Play): profilo, messaggi e segnalazioni inviate.
  const deleteAccount = () => {
    setChats(cs => cs.map(c => ({ ...c, messages: c.messages.filter(m => !m.mine) })));
    setReports(rs => rs.filter(r => r.by !== "Tu"));
    if (userEmail) AppData.clearUserData(userEmail).catch(() => {});   // via i dati personali (l'account intero lo toglie il Task 7)
    resetUser();
    setBlocked([]); setSavedOnly(false); setIsPremium(false);
    setAuthed(false); setGuest(false); setAdminUnlocked(false); setView("tab"); setTab("home");
  };
  const needAccount = () => { if (guest) { needLogin("Per creare la tua squadra FantaF1 serve un account."); return true; } return false; };
  const answerPrediction = (q, v) => {
    if (guest) { needLogin("Per rispondere alle previsioni serve un account."); return; }
    if (q.kind === "history" && predAnswers[q.id] != null) return;
    setPredAnswers(a => ({ ...a, [q.id]: v }));
    showToast(q.kind === "history" ? (BtLogic.predictionCorrect(q, v) ? "Giusto! +1 punto FantaF1" : "Risposta sbagliata") : "Previsione salvata");
  };
  const readAll = () => { setNotifSeenAt(nowMs()); setLocalNotifs(ns => ns.map(n => ({ ...n, unread: false }))); };

  const doSubscribe = () => {
    if (guest) { setPremiumOpen(false); needLogin("Per abbonarti a B&T Premium serve un account."); return; }
    setSubscribing(true);
    setTimeout(() => { setSubscribing(false); setSubscribed(true); setIsPremium(true); setTrial(t => t ? { ...t, converted: true } : t); }, 1100);
  };
  const doTrial = () => {
    if (guest) { setPremiumOpen(false); needLogin("Per la prova gratuita di B&T Premium serve un account."); return; }
    if (trial) return;
    setSubscribing(true);
    setTimeout(() => { const now = Date.now(); setTrial({ start: now, end: now + TRIAL_DAYS * 86400000 }); setSubscribing(false); setSubscribed("trial"); setIsPremium(true); }, 900);
  };
  const closePremium = () => { setPremiumOpen(false); setTimeout(() => setSubscribed(false), 300); };

  if (!authed && !guest) {
    return (
      <div id="phone-shell">
        <LoginScreen onDone={r => { setAuthed(true); if (r && r.about) setAboutMe(r.about); enterAccount(r && r.email); }} onGuest={() => { setGuest(true); showToast("Stai navigando come ospite"); }} />
      </div>
    );
  }
  if (loginOpen) {
    return (
      <div id="phone-shell">
        <LoginScreen reason={loginReason} onBack={() => { setLoginOpen(false); setLoginReason(null); }}
          onDone={r => { setAuthed(true); setGuest(false); setLoginOpen(false); setLoginReason(null); if (r && r.about) setAboutMe(r.about); enterAccount(r && r.email); showToast(r && r.created ? "Account creato" : "Accesso effettuato"); }} />
        {toast && <div className="toast">{toast}</div>}
      </div>
    );
  }

  const activeChat = chats.find(c => c.id === chatId);
  const activeArticle = articles.find(a => a.id === articleId);
  const shareArticle = shareId != null ? articles.find(a => a.id === shareId) : null;
  const liveSt = live ? live.sim.state() : null;
  const trialActive = isPremium && !!trial && !trial.converted;
  // Punti bonus del FantaF1: pronostici meteo indovinati (+2 ciascuno).
  const allPolls = [...(homePoll ? [{ ...homePoll, where: "Home" }] : []), ...articles.filter(a => a.poll).map(a => ({ ...articlePoll(a), where: a.title }))];
  const bonus = [
    ...Object.keys(wxResult).filter(k => wxGuess[k] && wxGuess[k] === wxResult[k]).map(k => {
      const [rid, key] = k.split(":"), r = races.find(x => x.id === rid);
      return { id: "wx:" + k, kind: "meteo", label: `Meteo ${LiveSim.SESSION_LABEL[key] || key}${r ? " · " + r.name : ""}`, pts: 2 };
    }),
    ...allPolls.filter(pl => pl.answer && votes[pl.id] === pl.answer).map(pl => ({ id: "poll:" + pl.id, kind: "sondaggio", label: "Sondaggio · " + pl.q, pts: 2 })),
    ...predictions.filter(q => BtLogic.predictionCorrect(q, predAnswers[q.id]) === true).map(q => ({ id: "pred:" + q.id, kind: "previsione", label: "Previsione · " + q.q, pts: BtLogic.RULES.predictionBonus })),
  ];
  // Weekend del FantaF1: quello in diretta, altrimenti la prossima gara. La squadra si blocca all'inizio delle qualifiche.
  const fantaRace = (live && races.find(r => r.id === live.raceId)) || races.find(r => r.status === "IN ARRIVO") || null;
  const fantaSessions = fantaRace && CIRCUIT_INFO[fantaRace.circuitId] ? CIRCUIT_INFO[fantaRace.circuitId].weekend || [] : [];
  const teamLockInfo = BtLogic.teamLock({ sessions: fantaSessions, now: nowMs(), demo: { locked: !!(fantaRace && demoLock[fantaRace.id]) } });
  // Previsioni sul weekend: si chiudono all'inizio della sessione a cui si riferiscono (o quando l'admin segna la risposta).
  const predLockOf = q => {
    if (q.kind === "history") return { locked: false, text: "" };
    const r = races.find(x => x.id === q.raceId);
    const ses = r && CIRCUIT_INFO[r.circuitId] ? CIRCUIT_INFO[r.circuitId].weekend || [] : [];
    const at = BtLogic.startOf(ses.find(x => x.key === q.about));
    const keys = r ? weekendKeys(r) : [];
    const liveHere = !!live && !!r && live.raceId === r.id && keys.indexOf(live.type) >= keys.indexOf(q.about);
    const endedHere = !!r && !!wxResult[r.id + ":" + q.about];
    return { locked: q.answer != null || (at != null && nowMs() >= at) || liveHere || endedHere, text: `all'inizio ${SESSION_DEL[q.about] || ""}${at ? ` (${fmtRome(at)})` : ""}` };
  };
  const onRaceTab = view === "tab" && tab === "race";
  liveShown.current = !!live && (onRaceTab || liveTrackOpen || ssOpen || view === "admin");
  const liveProps = { live, liveSt, onStartLive: startLive, onStopLive: stopLive, onFlag: liveFlag, onLastLap: liveLastLap, onRetire: liveRetire, liveSpeed, setLiveSpeed };
  // Sfondo della pagina Race: giallo con bandiera gialla / SC / VSC, rosso con la rossa, a scacchi al primo e all'ultimo giro.
  const pageBg = onRaceTab && liveSt ? liveSt.bg : null;
  const PAGE_BG = {
    yellow: "radial-gradient(140% 75% at 50% 0%, rgba(255,210,31,.75) 0%, rgba(255,210,31,.42) 45%, rgba(255,210,31,.26) 100%), #0A0A0C",
    red: "radial-gradient(140% 75% at 50% 0%, rgba(232,18,29,.8) 0%, rgba(232,18,29,.45) 45%, rgba(232,18,29,.28) 100%), #0A0A0C",
    chequered: "repeating-conic-gradient(rgba(255,255,255,.2) 0% 25%, rgba(255,255,255,0) 0% 50%) 0 0 / 44px 44px, #0A0A0C",
  };

  let body;
  if (view === "article" && activeArticle) body = <ArticleScreen article={activeArticle} onBack={() => setView("tab")} isPremium={isPremium} onPremium={() => setPremiumOpen(true)} onTag={filterByTag} saved={saved.includes(activeArticle.id)} onToggleSave={() => toggleSave(activeArticle.id)} onShare={() => setShareId(activeArticle.id)} vote={votes["art-" + activeArticle.id] || null} onVote={castVote} />;
  else if (view === "circuit" && circuitId) body = <CircuitScreen circuitId={circuitId} races={races} articles={articles} onBack={() => setView("tab")} onTag={filterByTag} onOpenArticle={openArticle} />;
  else if (view === "adminLock") body = <AdminKeypad onOk={() => { setAdminUnlocked(true); setView("admin"); }} onCancel={() => setView("profilo")} />;
  else if (view === "admin" && adminUnlocked) body = <AdminScreen silly={sillyOfficial} onSilly={officialSeat} highlights={highlights} setHighlights={adminSet.highlights} onBack={() => setView("profilo")} onPublish={publishArticle} articles={articles} setArticles={adminSet.articles} fantaStats={fantaStats} setFantaStats={adminSet.fantaStats} standings={standings} setStandings={adminSet.standings} races={races} setRaces={adminSet.races} extraRaces={racesDoc.extra} setExtraRaces={adminSet.extraRaces} ig={ig} setIg={adminSet.ig} sentNotifs={sentNotifs} onSendNotif={sendNotif} onDeleteNotif={deleteNotif} onToast={showToast} tab={adminTab} setTab={setAdminTab} chats={chats} reports={reports} banned={banned} onDeleteMsg={deleteChatMsg} onSuspend={suspendUser} onUnsuspend={unsuspendUser} onIgnoreReport={ignoreReport} liveProps={liveProps} polls={allPolls} votes={votes} onPollAnswer={setPollAnswer} predictions={predictions} setPredictions={adminSet.predictions} predAnswers={predAnswers} />;
  else if (view === "chatThread" && activeChat) body = <ChatThreadScreen chat={activeChat} onBack={() => goTab("race")} onSend={guest ? () => needLogin("Per scrivere in chat serve un account.") : sendMessage} isPremium={isPremium} blocked={blocked} onReport={guest ? () => needLogin("Per segnalare un messaggio serve un account.") : reportMessage} onBlock={blockUser} />;
  else if (view === "instagram") body = <InstagramView ig={ig} onToast={showToast} onBack={() => setView(igFrom)} />;
  else if (view === "ghost") body = <GhostLap onBack={() => setView("tab")} />;
  else if (view === "chats") body = <ChatsView chats={chats} onOpen={openChat} blocked={blocked} onBack={() => setView("tab")} />;
  else if (view === "profilo") body = <ProfiloScreen ig={ig} onOpenIg={() => { setIgFrom("profilo"); setView("instagram"); }} aboutMe={aboutMe} onSaveAboutMe={setAboutMe} trial={trialActive ? trial : null} trialUsed={!!trial} onBack={() => setView("tab")} onNotifiche={() => setView("notifiche")} onPremium={() => setPremiumOpen(true)} onAdmin={() => guest ? needLogin("Accedi per usare il pannello admin.") : setView(adminUnlocked ? "admin" : "adminLock")} onLogout={() => { leaveAccount(); setAuthed(false); setGuest(false); setAdminUnlocked(false); setView("tab"); goTab("home"); }} isPremium={isPremium} onAbout={() => setInfoModal({ title: "Info su B&T", body: ABOUT_TEXT })} onHelp={() => setInfoModal({ title: "Assistenza", body: HELP_TEXT })} favTeam={favTeam} favDriver={favDriver} onPickTeam={() => guest ? needLogin("Per scegliere scuderia e pilota del cuore serve un account.") : setPicker("team")} onPickDriver={() => guest ? needLogin("Per scegliere scuderia e pilota del cuore serve un account.") : setPicker("driver")} guest={guest} onLogin={() => needLogin(null)} onTerms={() => setTermsOpen(true)} blocked={blocked} onUnblock={unblockUser} onDeleteAccount={deleteAccount} savedCount={saved.length} onOpenSaved={openSaved} />;
  else if (view === "notifiche") body = <NotificheScreen onBack={() => setView("tab")} notifs={notifs} onReadAll={readAll} isPremium={isPremium} onPremium={() => setPremiumOpen(true)} favTeam={favTeam} favDriver={favDriver} prefs={notifPrefs} onPrefs={setNotifPrefs} onGoProfilo={() => setView("profilo")} />;
  else {
    if (tab === "home") body = <HomeScreen ig={ig} highlights={highlights} onOpenIg={() => { setIgFrom("tab"); setView("instagram"); }} articles={articles} tagFilter={tagFilter} onTag={filterByTag} onClearTag={() => setTagFilter(null)} onOpenArticle={openArticle} isPremium={isPremium} onPremium={() => setPremiumOpen(true)} onToast={showToast} onLiveTrack={() => setLiveTrackOpen(true)} onGoFanta={() => goTab("fanta")}  saved={saved} onToggleSave={toggleSave} savedOnly={savedOnly} setSavedOnly={setSavedOnly} onOpenCircuit={openCircuit} homePoll={homePoll} homeVote={votes.home || null} onVote={castVote} />;
    else if (tab === "race") body = <RaceScreen dotdVote={live ? dotd[live.raceId] : null} onDotdVote={(k, id) => live && voteDotd(live.raceId, k, id)} ratings={ratings} onRate={rateDriver} onOpenChats={() => setView("chats")} onOpenGhost={() => setView("ghost")} races={races} standings={standings} isPremium={isPremium} onPremium={() => setPremiumOpen(true)} onSelectDriver={setSelectedDriver} live={live} liveSt={liveSt} onExpandMap={() => setLiveTrackOpen(true)} onTelemetry={(carId, lapNo, sector) => setTelemetry({ carId, lapNo, sector })} onOpenCircuit={openCircuit} wxGuess={wxGuess} wxResult={wxResult} onGuessWeather={guessWeather} onLapTimes={setLapList} onSecondScreen={() => setSsOpen(true)} lastRace={lastRace} />;
    else if (tab === "garage") body = <GarageScreen races={races} pitBest={pitBest} onPitResult={t => setPitBest(b => b == null || t < b ? t : b)} sillyPreds={sillyPreds} onPredict={predictSeat} sillyOfficial={sillyOfficial} live={live} stratPreds={stratPreds} onStrat={(id, st) => setStratPreds(x => ({ ...x, [id]: { stints: st, at: nowMs() } }))} />;
    else if (tab === "fanta") body = <FantaScreen squad={squad} setSquad={setSquad} base={squadBase} freeTransfers={freeTransfers} budget={FANTA_BUDGET} stats={fantaStats} race={fantaRace} lock={teamLockInfo} weekends={fantaWeekends} isPremium={isPremium} onPremium={() => setPremiumOpen(true)} onToast={showToast} bonus={bonus} leagues={leagues} setLeagues={setLeagues} needAccount={needAccount} predictions={predictions} predAnswers={predAnswers} predLockOf={predLockOf} onAnswerPrediction={answerPrediction} />;
  }

  const showTopHeader = view === "tab";
  const showBottomNav = view === "tab";

  return (
    <div id="phone-shell">
      <div data-bg={pageBg || undefined} style={{ height: "100%", display: "flex", flexDirection: "column", position: "relative", background: pageBg && PAGE_BG[pageBg] ? PAGE_BG[pageBg] : undefined, transition: "background .3s" }}>
        {showTopHeader && <TopHeader trialDays={trialActive ? trialDaysLeft(trial) : 0} isPremium={isPremium} unread={unreadCount} onPremium={() => setPremiumOpen(true)} onBell={() => setView("notifiche")} onProfile={() => setView("profilo")} />}
        {showTopHeader && offline && <div role="status" data-offline="" style={{ margin: "-6px 16px 10px", padding: "8px 12px", borderRadius: 10, background: "rgba(231,179,76,.12)", border: "1px solid rgba(231,179,76,.35)", fontFamily: F_BODY, fontSize: 12, color: C.text, lineHeight: 1.4, flexShrink: 0 }}>{OFFLINE_LINE}</div>}
        <div style={{ flex: 1, minHeight: 0 }}>{body}</div>
        {showBottomNav && <BottomNav active={tab} onChange={goTab} />}
        {premiumOpen && <PremiumModal onClose={closePremium} isPremium={isPremium} plan={plan} setPlan={setPlan} onSubscribe={doSubscribe} subscribing={subscribing} subscribed={subscribed} trialUsed={!!trial} onTrial={doTrial} trial={trial} />}
        {selectedDriver && <DriverDetailModal driver={selectedDriver} onClose={() => setSelectedDriver(null)} />}
        {liveTrackOpen && <LiveMapView race={live ? races.find(r => r.id === live.raceId) : (races.find(r => r.status === "IN ARRIVO") || null)} live={live} st={liveSt} onClose={() => setLiveTrackOpen(false)} />}
        {ssOpen && isPremium && <SecondScreen chat={chats.find(c => c.id === "generale")} blocked={blocked} onChatSend={guest ? () => needLogin("Per scrivere in chat serve un account.") : t => sendMessage("generale", t)} race={live ? races.find(r => r.id === live.raceId) : (races.find(r => r.status === "IN ARRIVO") || null)} live={live} st={liveSt} standings={standings} layout={ssLayout} setLayout={setSsLayout} prefs={ssPrefs} setPrefs={setSsPrefs} vote={live ? dotd[live.raceId] || {} : {}} onVote={(k, id) => live && voteDotd(live.raceId, k, id)} notice={notice} onCloseNotice={nextNotice} onClose={() => setSsOpen(false)} />}
        {lapList && live && liveSt && <LapTimesModal live={live} st={liveSt} carId={lapList} onOpenLap={n => setTelemetry({ carId: lapList, lapNo: n, sector: 0 })} onClose={() => setLapList(null)} />}
        {telemetry && live && liveSt && <TelemetryModal live={live} st={liveSt} carId={telemetry.carId} lapNo={telemetry.lapNo} sector={telemetry.sector} onClose={() => setTelemetry(null)} />}
        {infoModal && <InfoModal title={infoModal.title} body={infoModal.body} onClose={() => setInfoModal(null)} />}
        {picker === "team" && <PickerModal title="SCUDERIA DEL CUORE" selected={favTeam} onPick={setFavTeam} onClose={() => setPicker(null)}
          options={TEAMS.map(t => ({ id: t.id, label: t.name, color: t.color, sub: t.tag }))} />}
        {picker === "driver" && <PickerModal title="PILOTA DEL CUORE" selected={favDriver} onPick={setFavDriver} onClose={() => setPicker(null)}
          options={DRIVERS.map(d => ({ id: d.id, label: d.full, color: d.color, sub: d.team, driver: d }))} />}
        {shareArticle && view === "article" && <ShareSheet article={shareArticle} locked={!!shareArticle.premium && !isPremium} handle={ig.handle} onClose={() => setShareId(null)} onToast={showToast} />}
        {(!termsAccepted || termsOpen) && <TermsSheet review={termsAccepted} onAccept={() => { setTermsAccepted(true); setTermsOpen(false); }} onClose={() => setTermsOpen(false)} />}
        {toast && <div className="toast">{toast}</div>}
        {notice && !(ssOpen && isPremium) && <LiveNotice n={notice} onClose={nextNotice} />}
      </div>
    </div>
  );
}

export default App;
// Usati dalle prove della 2.0 dentro la pagina (nell'anteprima erano variabili globali).
export { weekendWeather, RACES_INIT, premiumOffer };
