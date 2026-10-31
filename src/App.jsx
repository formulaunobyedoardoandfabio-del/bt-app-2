// Sector 4 (la B&T App 2.0). Generato una volta da tools/port-2.0.js (anteprima 2.0, app-preview/index.html, versione 25);
// da qui in avanti è il sorgente vero e si modifica a mano.
import React, { useState, useRef, useEffect } from "react";
import "./App.css";
import CIRCUITS from "./data/circuits.json";
import CIRCUIT_INFO from "./data/circuit-info.json";
import BT_WATERMARK from "./data/watermark";
import BT_LOGO from "./data/logo";
import IGL from "./logic/instagram";
import BtRealData from "./data/real-data";
import BtWeekend from "./data/real-weekend";
import LiveSim from "./logic/live-sim";
import BtLogic from "./logic/bt-logic";
import BtInsights from "./logic/bt-insights";
import DnfArtData from "./logic/dnf-art";
import BtGhost from "./logic/bt-ghost";
import BtWk from "./logic/bt-weekend";
import Colors from "./logic/colors";
import { filterNews, TYRES, LANES } from "./logic/newsfilter";
import { classifySwipe, SWIPE, dragFollow, dragProgress, leaveTo } from "./logic/gesture";
import { HELMET_DEFAULT, HELMET_PATTERNS, HELMET_VISORS, HELMET_FINISHES, cleanHelmet } from "./logic/helmet";
import { qZones, zoneOf } from "./logic/qzones";
import { TROPHIES, SECRET_NAME, SECRET_HOW, trophyProgress, medalOf, cleanTrophies, trophyDefs } from "./logic/trophies";
import CommonsData from "./data/commons-candidates";
import F1 from "./data/f1-2026";
import AppData from "./services/appdata";
import Compat from "./services/compat";
import { createAccount, MESSAGES as ACCOUNT_MSG, messageOf, MIN_AGE, pwStrength } from "./services/account";
import { createChat, CHAT_MSG, ROOM_IDS } from "./services/chat";
import { createFeedback, FEEDBACK_CATS, FEEDBACK_MSG } from "./services/feedback";
import { local, IMG_REF, uploadImage, loadImage as loadStoredImage, dropImage } from "./services/firebase";
import { generateArticle } from "./services/backend";
import { fx } from "./services/fx";
import { createCommons, normFile as commonsFileOf } from "./services/commons";
import { createOpenF1, buildReplay, lastRaceFromResult, sessionType as of1SessionType } from "./services/openf1";
import { createJolpica, pick as pickStandings } from "./services/jolpica";
import { createMeteo, sessionForecast, skyOf } from "./services/meteo";
import { createAds } from "./services/ads";
import { createF1Data, apply as applyF1Data } from "./services/f1data";
import FantaSeason from "./logic/fanta-season";
import { createFantaLeague } from "./services/fantaleague";

/* ── DESIGN TOKENS (matches the B&T concept style) ─────────────────── */
// Tappa 3 (G01-G02): sfondo nero puro (schermi OLED) e il colore dei tasti scelto da chi usa l'app. applyTheme cambia
// accent (fondo dei tasti, col testo bianco sopra almeno 3:1), accentInk (testi, icone, bordi e linee sul nero, almeno
// 4,5:1) e onAccent (il testo sui tasti); red resta il rosso LED per le cose rosse per forza (gomme morbide, bandiera
// rossa, semafori, errori, usura e budget superato).
const { LED_RED, shade, rgba: alpha } = Colors;
const C = {
  bg:      "#000000",
  card:    "#18181C",
  raised:  "rgba(255,255,255,.05)",
  border:  "rgba(255,255,255,.08)",
  divider: "rgba(255,255,255,.07)",
  text:    "#F4F2EF",
  muted:   "#9C9CA1",
  dim:     "#86858C",
  accent:  LED_RED,
  accentInk: LED_RED,
  onAccent: "#FFFFFF",
  red:     LED_RED,
  gold:    "#E7B34C",
  green:   "#4AE54A",
};
// Colori dell'app (Profilo → "Colori dell'app"): theme = { mode: "team", color: null } (di serie: il colore della
// scuderia del cuore, senza scuderia il rosso LED) o { mode: "custom", color }. Sul telefono (bt-theme) si tiene anche il
// colore usato l'ultima volta (bootColor): vale all'avvio finché non arrivano i dati dell'account.
const THEME_KEY = "bt-theme";
function cleanTheme(t) {
  if (!t || typeof t !== "object") return null;
  if (t.mode === "custom") { const color = Colors.normHex(t.color); return color ? { mode: "custom", color } : null; }
  return t.mode === "team" ? { mode: "team", color: null } : null;
}
function themeBase(theme, favTeam, bootColor = null) {
  const th = cleanTheme(theme);
  if (th && th.mode === "custom") return th.color;
  const team = favTeam && teamById(favTeam);
  if (team) return Colors.normHex(team.color) || LED_RED;
  return Colors.normHex(bootColor) || LED_RED;
}
function applyTheme(theme, favTeam, bootColor = null) {
  const base = themeBase(theme, favTeam, bootColor), tones = Colors.accentTones(base, C.bg);
  C.accent = tones.accent; C.accentInk = tones.ink; C.onAccent = tones.on;
  return { base, ...tones };
}
const F_HEAD = "'Titillium Web', sans-serif";
const F_BODY = "'Work Sans', sans-serif";

/* ── PLAY STORE: privacy, contatti, dicitura F1, Premium (come nell'app vera) ── */
// Pagine pubbliche richieste da Google Play (privacy policy ed eliminazione account).
const SITE_URL = "https://formulaunobyedoardoandfabio-del.github.io/bt-app-flutter";
const PRIVACY_URL = SITE_URL + "/privacy.html";
const CONTACT_EMAIL = "bt.formula1@gmail.com";
const APP_NAME = "Sector 4";   // nome dell'app (dal 10/10/2026); B&T resta il nome della squadra di Edoardo e Fabio
const F1_DISCLAIMER = APP_NAME + " è un'app non ufficiale e non è associata in alcun modo alle società di Formula 1. F1, FORMULA ONE, FORMULA 1, FIA FORMULA ONE WORLD CHAMPIONSHIP, GRAND PRIX e i marchi correlati sono marchi di Formula One Licensing B.V.";
// Pagamenti veri (abbonamento con Google Play Billing): spenti, come nell'app di oggi. Finché sono spenti la §4 dei
// Termini dice che il Premium non è ancora disponibile.
const PAYMENTS_ENABLED = false;
// Prova del Premium dell'anteprima 2.0: si attiva con un tocco, senza pagare. La toglie il Task 11 (D44, Premium come oggi).
const PREMIUM_DEMO = true;
// Prova gratuita per un GP (18/10, Edoardo), una sola volta per account: fino alla fine del prossimo GP (4 ore dopo la
// partenza della gara); senza GP in calendario 7 giorni. Sul Play Store si imposta come offerta dell'abbonamento.
const trialEndFor = (races, now) => {
  const r = (races || []).map(x => ({ x, t: raceStartMs(x) })).filter(o => isFinite(o.t) && o.t + 4 * 3600e3 > now).sort((a, b) => a.t - b.t)[0];
  return r ? r.t + 4 * 3600e3 : now + 7 * 86400000;
};
// Premium a stagione (18/10): 6 € la prima, ogni stagione dopo 1 € in meno, fino a 1 €.
const SEASON_PRICE = 6;
// Link di Buy Me a Coffee: finché manca, nel Profilo "Offrici un caffè" è "in arrivo".
const COFFEE_URL = "";
const premiumOffer = ({ trialUsed, isPremium }) => isPremium ? "premium" : trialUsed ? "subscribe" : "trial";
const trialDaysLeft = trial => trial ? Math.max(0, Math.ceil((trial.end - nowMs()) / 86400000)) : 0;
const fmtDay = ms => new Date(ms).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
// Apre un link fuori dall'app: nell'APK col browser di sistema, sul web in una nuova scheda.
const openUrl = url => {
  try { const B = window.Capacitor?.Plugins?.Browser; if (window.Capacitor?.isNativePlatform?.() && B) { B.open({ url }); return; } } catch (e) {}
  window.open(url, "_blank");
};
/* ── FOTO SALVATE SU FIREBASE: "fsimg:<id>" (notizie, copertine dei video) ── */
// Le foto caricate dall'admin stanno in shared/img-<id> (src/services/firebase.js); notizie e video salvano solo il
// riferimento "fsimg:<id>", come l'app di oggi. Link https e data URL si usano così come sono.
const isStoredRef = src => typeof src === "string" && src.startsWith(IMG_REF);
// Indirizzo da mettere nell'<img>: "" finché la foto salvata non è arrivata (o se non si trova).
function useImageSrc(src) {
  const [u, setU] = useState(() => (src && !isStoredRef(src) ? src : ""));
  useEffect(() => {
    let alive = true;
    if (!src) { setU(""); return undefined; }
    if (!isStoredRef(src)) { setU(src); return undefined; }
    setU("");
    loadStoredImage(src).then(v => { if (alive) setU(v || ""); }, () => {});
    return () => { alive = false; };
  }, [src]);
  return u;
}
// <img> di una foto che può essere salvata su Firebase; finché non c'è, al suo posto fallback.
function StoredImg({ src, fallback = null, ...rest }) {
  const u = useImageSrc(src);
  return u ? <img alt="" {...rest} src={u} /> : fallback;
}
// Riquadro con la foto come sfondo (copertine); empty è lo sfondo quando la foto non c'è.
function StoredBg({ src, as: Tag = "div", fit = "cover", empty, style, children, ...rest }) {
  const u = useImageSrc(src);
  return <Tag {...rest} style={{ ...style, background: u ? `#111 url("${u}") center / ${fit} no-repeat` : empty }}>{children}</Tag>;
}
// Una foto tolta da una notizia o da un video si cancella da Firebase, se nient'altro la usa.
const dropStoredImage = ref => { if (isStoredRef(ref)) dropImage(ref).catch(() => {}); };
// Moderazione chat (richiesta da Google Play): i messaggi degli utenti bloccati non si vedono.
// Messaggio di un utente bloccato? Con l'ID autore se c'è, altrimenti col nome (messaggi vecchi), come l'app di oggi.
const isBlockedMsg = (blocked, m) => !m.mine && blocked.some(b => (b.aid && m.aid ? b.aid === m.aid : !b.aid && !m.aid && b.name === m.from));

/* ── TELEFONO: tasto indietro di Android, barra di stato, avvio ─────── */
// Plugin di Capacitor dall'APK (@capacitor/app e SystemBars di @capacitor/core), senza import come gli altri;
// nel browser non ci sono e non succede niente.
const capPlugin = name => { try { return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins[name]) || null; } catch (e) { return null; } };
// Barra di stato del telefono (ora, batteria, Wi-Fi) nascosta: all'avvio e ogni volta che si torna nell'app.
const hideStatusBar = () => { const SB = capPlugin("SystemBars"); if (SB && SB.hide) Promise.resolve().then(() => SB.hide({ bar: "StatusBar" })).catch(() => {}); };
// Tasto indietro: chiude per prima la finestra o la pagina interna aperta per ultima. Chi apre qualcosa che il tasto
// deve chiudere lo registra con useBack(aperto, chiudi); quando non c'è niente da chiudere decide l'App.
const BACK_STACK = [];
function useBack(active, onBack) {
  const ref = useRef(onBack);
  ref.current = onBack;
  useEffect(() => {
    if (!active) return undefined;
    const h = () => ref.current();
    BACK_STACK.push(h);
    return () => { const i = BACK_STACK.lastIndexOf(h); if (i >= 0) BACK_STACK.splice(i, 1); };
  }, [!!active]);
}
// Dalla Home (o dall'accesso) il tasto indietro manda l'app in secondo piano, come fa Android 12 e successivi:
// riaprendola si torna dove si era, senza rifare l'avvio.
const leaveApp = () => { const A = capPlugin("App"); if (!A) return; Promise.resolve().then(() => (A.minimizeApp ? A.minimizeApp() : A.exitApp())).catch(() => { try { A.exitApp(); } catch (e) {} }); };
// Splash con i video di Edoardo (public/splash, WebM VP9 senza audio): apertura (7 s); se i dati non sono ancora
// arrivati, il video d'attesa (2,8 s) che si ripete; poi il finale (3,2 s), dove le lettere B e T si aprono sull'app vera:
// da OUTRO_REVEAL_S il video è trasparente (fatto da tools/splash/outro.py) e i tocchi passano all'app sotto.
const SPLASH_VIDEO = { intro: "splash/intro.webm", loop: "splash/loop.webm", outro: "splash/outro.webm" };
// Immagine di partenza nera dei video: senza, finché un video non disegna Android mostra il suo tasto play grigio.
const SPLASH_POSTER = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR42mNgYGAAAAAEAAHI6uv5AAAAAElFTkSuQmCC";
const OUTRO_REVEAL_S = 40 / 24;
const SPLASH_VIDEO_START_MS = 3000;   // il primo video non parte (file mancante, formato non supportato): splash fisso
const SPLASH_FADE_MS = 600;   // dissolvenza dello splash dei video quando il finale si inceppa
const LOAD_MAX_MS = 15000;   // Firebase che non risponde: dopo 15 secondi l'app si apre lo stesso con i contenuti di serie

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
    // Tappa 3 (G04): da qui le icone di Tabler Icons (tabler.io, licenza MIT: src/licenze/tabler-icons.txt, crediti in
    // "Info su B&T"): coppa, bandiera, volante, casco, motore, contagiri, colori, volume, vibrazione, play, pausa, avanti.
    case "trophy": return <svg {...s}><path d="M8 21l8 0" /><path d="M12 17l0 4" /><path d="M7 4l10 0" /><path d="M17 4v8a5 5 0 0 1 -10 0v-8" /><path d="M3 9a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M17 9a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /></svg>;
    case "flag": return <svg {...s}><path d="M5 5a5 5 0 0 1 7 0a5 5 0 0 0 7 0v9a5 5 0 0 1 -7 0a5 5 0 0 0 -7 0v-9" /><path d="M5 21v-7" /></svg>;
    case "wheel": return <svg {...s}><path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /><path d="M10 12a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M12 14l0 7" /><path d="M10 12l-6.75 -2" /><path d="M14 12l6.75 -2" /></svg>;
    case "helmet": return <svg {...s}><path d="M12 4a9 9 0 0 1 5.656 16h-11.312a9 9 0 0 1 5.656 -16" /><path d="M20 9h-8.8a1 1 0 0 0 -.968 1.246c.507 2 1.596 3.418 3.268 4.254c2 1 4.333 1.5 7 1.5" /></svg>;
    case "engine": return <svg {...s}><path d="M3 10v6" /><path d="M12 5v3" /><path d="M10 5h4" /><path d="M5 13h-2" /><path d="M6 10h2l2 -2h3.382a1 1 0 0 1 .894 .553l1.448 2.894a1 1 0 0 0 .894 .553h1.382v-2h2a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-2v-2h-3v2a1 1 0 0 1 -1 1h-3.465a1 1 0 0 1 -.832 -.445l-1.703 -2.555h-2v-6" /></svg>;
    case "gauge": return <svg {...s}><path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /><path d="M11 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M13.41 10.59l2.59 -2.59" /><path d="M7 12a5 5 0 0 1 5 -5" /></svg>;
    case "media-play": return <svg {...s}><path d="M7 4v16l13 -8l-13 -8" /></svg>;
    case "media-pause": return <svg {...s}><path d="M6 6a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1l0 -12" /><path d="M14 6a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1l0 -12" /></svg>;
    case "media-skip": return <svg {...s}><path d="M4 5v14l12 -7l-12 -7" /><path d="M20 5l0 14" /></svg>;
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
    case "sound": return <svg {...s}><path d="M15 8a5 5 0 0 1 0 8" /><path d="M17.7 5a9 9 0 0 1 0 14" /><path d="M6 15h-2a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h2l3.5 -4.5a.8 .8 0 0 1 1.5 .5v14a.8 .8 0 0 1 -1.5 .5l-3.5 -4.5" /></svg>;
    case "vibrate": return <svg {...s}><path d="M3 5a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2l0 -14" /><path d="M8 4l2 0" /><path d="M9 17l0 .01" /><path d="M21 6l-2 3l2 3l-2 3l2 3" /></svg>;
    case "palette": return <svg {...s}><path d="M12 21a9 9 0 0 1 0 -18c4.97 0 9 3.582 9 8c0 1.06 -.474 2.078 -1.318 2.828c-.844 .75 -1.989 1.172 -3.182 1.172h-2.5a2 2 0 0 0 -1 3.75a1.3 1.3 0 0 1 -1 2.25" /><path d="M7.5 10.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M11.5 7.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M15.5 10.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /></svg>;
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
const GAPS = ["–", "+0.412", "+1.038", "+2.774", "+4.116", "+6.902", "+9.554", "+14.310", "+17.882", "+21.407", "+24.019", "+27.655", "+31.230", "+34.918", "+38.104", "+41.772", "+45.390", "+49.861", "+53.227", "+58.004", "+1 giro", "+1 giro"];
const DRIVERS = DRIVER_DATA.map(([id, name, full, teamId, born, nat, wins, podiums, titles, bio], i) => {
  const t = teamById(teamId);
  const ACCENTS = { "ü": "u", "é": "e", "è": "e", "á": "a", "í": "i", "ó": "o" };
  const surname = full.split(" ").slice(-1)[0].split("").map(ch => ACCENTS[ch] || ch).join("");
  return { id, pos: i + 1, name, full, teamId, team: t.name, color: t.color, tag: "#" + surname, gap: GAPS[i], fastest: id === "leclerc",
    born, nat, wins, podiums, titles, bio, photo: PHOTOS[id] || null, avatar: AVATARS[id] || null,
    helmet: HELMETS[id] || null, helmetNote: HELMET_NOTES[id] || null };
});
const driverById = (id) => DRIVERS.find(d => d.id === id);

/* ── FOTO DI WIKIMEDIA COMMONS (G30) ─────────────────────────────────── */
// L'app carica le foto dal link di Commons (anteprima di 480 px) e le mostra solo con licenza libera, con i crediti
// "Foto: autore, licenza, Wikimedia Commons" (src/services/commons.js). Vale la scelta dell'admin (Pannello Admin →
// FOTO, shared/bt-commons-photos), altrimenti la prima candidata (src/data/commons-candidates.js). Finché la foto non
// arriva, senza rete o senza licenza libera: le iniziali, la sagoma o il disegno di sempre.
const CommonsApi = createCommons({ local });
const commons = { choice: { drivers: {}, cars: {}, logos: {} }, info: {}, queue: new Set(), timer: null, subs: new Set() };
const commonsNotify = () => commons.subs.forEach(fn => { try { fn(); } catch (e) {} });
const commonsCandidates = (kind, id) => (id && CommonsData.COMMONS_CANDIDATES[kind] && CommonsData.COMMONS_CANDIDATES[kind][id]) || [];
const commonsFile = (kind, id) => (id && (commons.choice[kind] || {})[id]) || commonsCandidates(kind, id)[0] || null;
function commonsRequest(files) {
  files.forEach(f => { if (f && !(f in commons.info)) commons.queue.add(f); });
  if (!commons.queue.size || commons.timer) return;
  commons.timer = setTimeout(async () => {
    const list = [...commons.queue]; commons.queue.clear(); commons.timer = null;
    const got = await CommonsApi.info(list);
    list.forEach(f => { commons.info[f] = got[f] || null; });
    commonsNotify();
  }, 30);
}
const commonsCredit = x => `Foto: ${x.author || "autore non indicato"}, ${x.license}, Wikimedia Commons`;
// Info di un file per il Pannello Admin (anche senza licenza libera): undefined finché non arriva.
function commonsInfoOf(file) { if (!file) return null; if (!(file in commons.info)) { commonsRequest([file]); return undefined; } return commons.info[file]; }
// La foto da mostrare: null finché non arriva, senza licenza libera o senza rete.
function commonsPhotoOf(file) {
  const x = commonsInfoOf(file);
  return x && x.free && x.thumb ? { thumb: x.thumb, credit: commonsCredit(x), page: x.page, file } : null;
}
// Tornata la rete: si riprovano le foto rimaste senza risposta (i file che mancano su Commons restano senza).
if (typeof window !== "undefined" && window.addEventListener) window.addEventListener("online", () => {
  let n = 0;
  Object.keys(commons.info).forEach(f => { if (commons.info[f] === null) { delete commons.info[f]; n++; } });
  if (n) commonsNotify();
});
function useCommonsTick() {
  const [, set] = useState(0);
  useEffect(() => { const fn = () => set(n => n + 1); commons.subs.add(fn); return () => { commons.subs.delete(fn); }; }, []);
}
// 31/10 (Edoardo): niente foto di piloti, monoposto e loghi: al loro posto i disegni geometrici dell'app (DriverMark,
// TeamMark, CarSilhouette). Le foto delle notizie restano. Per riaccendere Commons: GEO_ONLY = false.
const GEO_ONLY = !(typeof window !== "undefined" && window.__btCommons);   // le prove di Commons (run67) lo riaccendono
function useCommonsPhoto(kind, id) {
  useCommonsTick();
  if (GEO_ONLY) return null;
  if (kind === "logos" && !CommonsData.SHOW_TEAM_LOGOS) return null;
  return commonsPhotoOf(commonsFile(kind, id));
}
// Disegno del pilota: un casco geometrico nel colore della sua scuderia, con una grafica diversa per ognuno (così i
// compagni di squadra si distinguono) e, se c'è spazio, la sigla.
const GEO_PATTERNS = ["stripes", "bolt", "checks", "stars", "pinstripes", "dots", "flames"];
const geoHash = id => String(id || "").split("").reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const driverHelmet = d => ({ base: d.color, c1: "#FFFFFF", c2: "#111114", pattern: GEO_PATTERNS[geoHash(d.id) % GEO_PATTERNS.length], visor: ["smoke", "iridium-blue", "iridium-gold", "mirror-red"][geoHash(d.id + "v") % 4], finish: "gloss", number: null });

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
// Dati veri di OpenF1 (src/services/openf1.js): una sola coda di richieste per tutta l'app (3 al secondo, 30 al minuto).
// Gara LIVE: ogni 30 secondi si guarda l'ultima sessione; finita (non più bloccata) si carica una volta e si rivede.
const OF1 = createOpenF1();
// Classifiche del mondiale in automatico (24/10): Jolpica F1, gratis e senza chiave (src/services/jolpica.js), lette al
// massimo ogni 30 minuti. È pensato per uso non commerciale: prima dell'uscita pubblica con la pubblicità serve il
// permesso di Jolpica (HANDOFF.md). false = solo le classifiche dell'admin.
const JOLPICA_ON = true;
const Jolpica = createJolpica({ store: local, now: nowMs });
const FantaL = createFantaLeague({ store: local, now: nowMs });   // 31/10: leghe FantaF1 vere e risultati veri
// Previsioni meteo del weekend (24/10): MET Norway tramite la funzione su Vercel api/meteo.js (src/services/meteo.js).
const Meteo = createMeteo({ store: local, now: nowMs });
// Dati F1 che si aggiornano da soli (25/10, src/services/f1data.js): Ghost Lap delle ultime qualifiche, gare, qualifiche e
// prove libere, rigenerati ogni ora nei weekend da GitHub (tools/make_live_data.py) e pubblicati su Vercel.
const F1Data = createF1Data({ store: local, now: nowMs });
const MET_LICENSE_URL = "https://api.met.no/doc/License";
// Pubblicità AdMob (24/10, src/services/ads.js): solo nell'APK, banner in Home e in Race e interstitial tra le notizie;
// niente con il Premium. ADMOB_TEST = annunci di prova di Google: scripts/prepare_android.py scrive
// window.BT_ADMOB_TEST = true quando su Codemagic c'è BT_ADMOB_TEST=1 (APK di prova e, per ora, il test chiuso).
const ADS_ON = true;
const ADMOB_TEST = typeof window !== "undefined" && window.BT_ADMOB_TEST === true;
const AD_GAP = 10;   // distacco tra il banner e la barra delle schede: AdMob vieta i banner attaccati ai pulsanti
const isNativeApp = () => { try { return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); } catch (e) { return false; } };
const adMobPlugin = () => (ADS_ON && isNativeApp() ? capPlugin("AdMob") : null);
// Altezza vera del banner nativo (0 = nessun banner): la manda AdMob, la root lascia lo spazio sotto le schede.
const adBannerBus = { h: 0, subs: new Set(), set(h) { if (h === this.h) return; this.h = h; this.subs.forEach(f => f(h)); } };
const Ads = createAds({ plugin: adMobPlugin, test: ADMOB_TEST, now: nowMs, onBanner: h => adBannerBus.set(h) });
// Una finestra aperta sopra l'app (role="dialog", aria-modal o un livello a tutto schermo): il banner nativo, disegnato
// da Android sopra la pagina, coprirebbe i suoi tasti. Solo nell'APK (on).
const overlayOpen = () => [...document.querySelectorAll('[role="dialog"], [aria-modal="true"], [style*="inset: 0"]')]
  .some(e => e.getAttribute("role") === "dialog" || e.getAttribute("aria-modal") === "true" || ((e.style.position === "absolute" || e.style.position === "fixed") && Number(e.style.zIndex) >= 500));
function useOverlayOpen(on) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!on || typeof MutationObserver === "undefined") { setOpen(false); return undefined; }
    let raf = 0;
    const check = () => { raf = 0; const v = overlayOpen(); setOpen(o => (o === v ? o : v)); };
    const mo = new MutationObserver(() => { if (!raf) raf = requestAnimationFrame(check); });
    mo.observe(document.body, { childList: true, subtree: true });
    check();
    return () => { mo.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, [on]);
  return open;
}
const OF1_POLL_MS = 30000;
const OF1_LAST_RACE_KEY = "bt-of1-last-race", OF1_LAST_RACE_MS = 6 * 3600000;   // ultima gara di OpenF1: sul telefono per 6 ore
const OF1_RETRY_MS = 5 * 60000;                                                  // senza risposta: si riprova dopo 5 minuti
const OF1_WX_KEY = "bt-of1-wx";        // esito del meteo delle sessioni finite (non cambia più): { "r16:FP1": "rain" | "dry" }
const OF1_SRC = "Sessione (dati OpenF1)";
// OpenF1 gratis tiene i dati bloccati fino a 30 minuti dopo la fine della sessione (openf1.org: "Data is considered
// live from 30 minutes before a session starts until 30 minutes after it ends"). Appena sbloccati possono arrivare a
// metà: per altri 30 minuti (fino a un'ora dopo la fine) si ricarica ogni 5 minuti.
const OF1_LIVE_LAG_MS = 30 * 60000, OF1_SETTLE_MS = 30 * 60000, OF1_RELOAD_MS = 5 * 60000;
const of1NeedsReload = (session, loadedAt, now) => {
  const end = session && Date.parse(session.date_end || session.date_start);
  return isFinite(end) && now < end + OF1_LIVE_LAG_MS + OF1_SETTLE_MS && now - loadedAt >= OF1_RELOAD_MS;
};
const isDemoLive = live => !!(live && live.source === "demo");
const isOf1Live = live => !!(live && live.source === "openf1");
// L'ultima sessione di OpenF1 è di questo weekend? (dai 4 giorni prima della gara al giorno dopo)
const sessionOfWeekend = (s, race) => {
  const at = s && Date.parse(s.date_start), day = race && Date.parse(String(race.date).slice(0, 10) + "T12:00:00Z");
  return isFinite(at) && isFinite(day) && at >= day - 4.5 * 86400000 && at <= day + 1.5 * 86400000;
};
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
  red: { color: LED_RED, ink: "#fff" },
};

/* ── DATI MODIFICABILI DAL PANNELLO ADMIN ─────────────────────────── */
// Calendario 2026 e tracciati: src/data/f1-2026.js
const CIRCUIT_IDS = F1.CIRCUIT_IDS;
// Calendario come nella 2.0 (lo stato vero arriva da Firebase, shared/bt-races: src/services/appdata.js).
const RACES_INIT = F1.RACES.map((r, i) => ({ ...r, status: i < 15 ? "CONCLUSA" : "IN ARRIVO" }));
// La gara del weekend: quella LIVE (weekend in corso, compat.raceStatusesAt), altrimenti la prossima in arrivo.
const weekendRace = (races, ok = () => true) => races.find(r => r.status === "LIVE" && ok(r)) || races.find(r => r.status === "IN ARRIVO" && ok(r)) || null;
// La sessione in pista adesso, dagli orari ufficiali (durata indicativa in minuti, con un po' di margine): il badge
// "IN PISTA" in alto si vede solo mentre le macchine girano, non per tutto il weekend.
const SESSION_MIN = { FP1: 60, FP2: 60, FP3: 60, SQ: 50, SPRINT: 70, QUALI: 70, RACE: 150 };
const sessionNow = (race, now) => {
  const w = race && CIRCUIT_INFO[race.circuitId] ? CIRCUIT_INFO[race.circuitId].weekend : null;
  return (Array.isArray(w) ? w : []).find(s => { const at = Date.parse(s.utc); return isFinite(at) && now >= at && now < at + (SESSION_MIN[s.key] || 60) * 60000; }) || null;
};
const RACE_STATUSES = F1.RACE_STATUSES;
const fmtDate = (iso) => { if (!iso) return "–"; const [y, m, d] = iso.split("-").map(Number); const M = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"]; return `${d} ${M[m - 1]} ${y}`; };

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
// Punti e cambi del FantaF1 dalle sessioni vere (OpenF1): spenti. Nell'anteprima i punti del weekend non si salvano
// nell'account e la sessione rivista si chiude a ogni avvio: i cambi della squadra si rifarebbero ogni volta. Il FantaF1
// apre a fine stagione, come nell'app di oggi.
const FANTA_REAL_POINTS = false;

// Previsioni avanzate del FantaF1: +1 punto per ogni risposta giusta. Tutte a risposta chiusa:
// kind: "poll" (sondaggio con le sue risposte), "driver" (si sceglie tra tutti i piloti), "team" (tra tutte le scuderie),
// "number" (un numero, col tastierino numerico), "history" (storia: la risposta si sa già).
// about: sessione del weekend all'inizio della quale la domanda si chiude; la risposta esatta la segna l'admin.
// Le domande stanno in shared/bt-predictions: le scrive l'admin; di serie ci sono solo quelle di storia (src/data/f1-2026.js).

// Instagram: shared/bt-ig-config (handle, follower, post e video li scrive l'admin; niente numeri inventati).
const fmtK = (n) => n == null || n === "" ? "–" : n >= 1000 ? (n / 1000).toFixed(n >= 100000 ? 0 : 1).replace(".0", "") + "K" : String(n);
// Sondaggi (Home e notizie): la risposta esatta la segna l'admin e chi ha indovinato prende +2 punti FantaF1.
// Il sondaggio della Home sta in shared/bt-home-poll: se non c'è, il riquadro non si vede.
const articlePoll = a => a && a.poll ? { ...a.poll, id: "art-" + a.id } : null;
const NEWS_CATEGORIES = ["NEWS", "GARA", "APP", "ANALISI", "FANTA", "PILOTI", "SCUDERIE", "METEO", "TECNICA"];   // METEO e TECNICA: Tappa 3 (G09-G10)
const STATS_NOTE = "Statistiche carriera aggiornate a settembre 2026";


// Stanze della chat dei tifosi (nome, colore e icona della 2.0). I messaggi sono su Firebase, una stanza per documento
// (shared/bt-chat-*, come nell'app di oggi): src/services/chat.js.
const CHAT_ROOMS = [
  { id: "generale", name: "Chat Generale", color: "#C1121F", icon: "chat", iconColor: "#fff" },
  { id: "live", name: "Live Gara", color: "#3FAE6B", icon: "stopwatch", iconColor: "#141414" },
  { id: "fanta", name: "FantaF1 Talk", color: "#E7B34C", icon: "trophy", iconColor: "#141414" },
  { id: "radio", name: "Box Radio", color: "#2E9E8F", icon: "chat", iconColor: "#fff" },
  { id: "paddock", name: "Paddock Talk", color: "#3B6FD4", icon: "chat", iconColor: "#fff" },
];

// Le notifiche dell'admin stanno in shared/bt-notifs, nel formato di oggi (src/services/appdata.js).

const PREMIUM_CATEGORIES = [
  { name: "Fanta F1", items: [
    { icon: "trophy", title: "Fanta F1 completo con leghe" },
    { icon: "group", title: "Leghe private illimitate" },
    { icon: "bulb", title: "Consigli formazione pre-gara" },
  ]},
  { name: "Contenuti", items: [
    { icon: "doc", title: "News esclusive e in anteprima" },
    { icon: "history", title: "Archivio storico dei GP" },
    { icon: "play", title: "Video highlights esclusivi" },
  ]},
  { name: "Esperienza B&T", items: [
    { icon: "no", title: "Zero pubblicità" },
    { icon: "star", title: "Distintivo Premium in chat", starIcon: true },
    { icon: "unlock", title: "Accesso anticipato alle nuove funzioni" },
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

// Logo in alto con la luce posteriore a LED (G25). Easter egg (G26): tre tocchi veloci (ognuno entro EGG_GAP_MS dal
// precedente) e i LED lampeggiano tre volte, con la sgasata e la vibrazione. onTrack: c'è una sessione in pista, il
// badge "IN PISTA" con i LED che pulsano.
const EGG_GAP_MS = 450, EGG_SHOW_MS = 1100;
function TopHeader({ isPremium, unread, onPremium, onBell, onProfile, trialDays = 0, helmet = null, onTrack = false, onLogoEgg }) {
  const [egg, setEgg] = useState(false);
  const taps = useRef({ n: 0, at: 0 }), eggT = useRef(null);
  useEffect(() => () => clearTimeout(eggT.current), []);
  const tapLogo = () => {
    const t = performance.now(), k = taps.current;
    k.n = t - k.at <= EGG_GAP_MS ? k.n + 1 : 1; k.at = t;
    if (k.n < 3) return;
    k.n = 0;
    setEgg(true); fx.play("rev"); fx.buzz("success"); if (onLogoEgg) onLogoEgg();
    clearTimeout(eggT.current); eggT.current = setTimeout(() => setEgg(false), EGG_SHOW_MS);
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 16px 14px", flexShrink: 0 }}>
      <button className="press" data-logo="" aria-label={"B&T"} onClick={tapLogo} style={{ height: 38, padding: "0 12px", borderRadius: 11, background: C.accent, display: "flex", alignItems: "center", flexShrink: 0 }}>
        <img data-logo-img="" data-mode={egg ? "flash3" : "idle"} className={egg ? "logo-flash3" : undefined} src={BT_LOGO} alt="" style={{ width: 28, height: 28, objectFit: "contain", display: "block" }} />
      </button>
      {onTrack && (
        <span data-on-track="" role="status" style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 9px", borderRadius: 999, background: alpha(C.red, .12), border: `1px solid ${alpha(C.red, .45)}`, flexShrink: 0 }}>
          <LedGrid mode="pulse" size={3} />
          <span style={{ fontFamily: F_HEAD, fontWeight: 900, fontSize: 10.5, letterSpacing: .8, color: C.text }}>IN PISTA</span>
        </span>
      )}
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
        {unread > 0 && <span data-unread-dot="" style={{ position: "absolute", top: 6, right: 7, width: 8, height: 8, borderRadius: "50%", background: C.accentInk, border: "1.5px solid " + C.bg }} />}
      </button>
      <button className="press" aria-label="Profilo" onClick={onProfile} style={{ width: 38, height: 38, borderRadius: "50%", background: C.card, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <HelmetArt spec={helmet} size={30} />
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
const TAB_IDS = TABS.map(t => t.id);
// G29: un gesto che parte da qui è dell'elemento, non dello swipe tra le schede: data-swipe-own (notizie, manettini,
// grafici da scorrere…), campi di testo, cursori e righe che scorrono davvero di lato.
function ownGesture(el, root) {
  for (let e = el; e && e !== root && e.nodeType === 1; e = e.parentElement) {
    if (e.hasAttribute("data-swipe-own") || /^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName)) return true;
    const role = e.getAttribute("role");
    if (role === "slider" || role === "spinbutton") return true;
    const cs = getComputedStyle(e);
    if ((cs.overflowX === "auto" || cs.overflowX === "scroll") && e.scrollWidth > e.clientWidth + 1) return true;
  }
  return false;
}

// Barra in basso (25/10): la pillola rossa è una sola e scivola sotto la scheda attiva; durante lo swipe segue il dito
// (--nav-drag, scritto dal codice dello swipe). Icona bianca e grigia una sopra l'altra: cambia solo l'opacità.
const NAV_ICO = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center" };
function BottomNav({ active, onChange, pillRef }) {
  const idx = Math.max(0, TAB_IDS.indexOf(active));
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", padding: "10px 8px 14px", borderTop: `1px solid ${C.border}`, background: C.bg, flexShrink: 0 }}>
      <div aria-hidden="true" style={{ position: "absolute", left: 8, right: 8, top: 16, height: 26, pointerEvents: "none" }}>
        <div ref={pillRef} data-nav-pill="" className="nav-pill" style={{ "--nav-i": idx, width: 100 / TABS.length + "%", height: "100%", display: "flex", justifyContent: "center", transform: "translateX(calc((var(--nav-i) + var(--nav-drag, 0)) * 100%))" }}>
          <div style={{ width: 34, height: 26, borderRadius: 9, background: C.accent }} />
        </div>
      </div>
      {TABS.map(t => {
        const on = t.id === active;
        return (
          <button key={t.id} className="press" data-nav-tab={t.id} aria-current={on ? "page" : undefined} onClick={() => onChange(t.id)} style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "6px 0" }}>
            <span style={{ position: "relative", display: "block", width: 34, height: 26 }}>
              <span className="nav-ico" style={{ ...NAV_ICO, opacity: on ? 1 : 0 }}><Icon name={t.icon} size={16} color="#fff" sw={2.3} /></span>
              <span className="nav-ico" style={{ ...NAV_ICO, opacity: on ? 0 : 1 }}><Icon name={t.icon} size={18} color={C.dim} /></span>
            </span>
            <span style={{ fontFamily: F_HEAD, fontWeight: 700, fontSize: 9, color: on ? C.text : C.dim, letterSpacing: .4 }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
// Scheda accanto che compare ai lati durante lo swipe (25/10): sta appena fuori dallo schermo ed entra attaccata al
// bordo della pagina che il dito sposta (mai sopra la pagina); opacità, posizione e data-ready (lasciando il dito si
// cambia scheda) li scrive il codice dello swipe. Il nome arriva dal CSS (data-label), così non è testo della pagina.
function TabPeek({ side, tab, peekRef }) {
  if (!tab) return null;
  return (
    <div ref={peekRef} aria-hidden="true" data-tab-peek={side} className="tab-peek" style={{ position: "absolute", top: "50%", [side === "right" ? "left" : "right"]: "calc(100% + 12px)", marginTop: -34, display: "flex", flexDirection: "column", alignItems: "center", gap: 7, opacity: 0, pointerEvents: "none" }}>
      <span className="tab-peek-ico" style={{ "--peek-on": C.accent, width: 46, height: 46, borderRadius: 15, background: C.card, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={tab.icon} size={20} color={C.text} /></span>
      <span data-label={tab.label} style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 10, letterSpacing: .8, color: C.text }} />
    </div>
  );
}
// Da che parte entra il contenuto di una sottoscheda (25/10): "left" se la nuova è a destra della vecchia, "right" se è
// a sinistra, null alla prima apertura.
function useSlideFrom(index) {
  const ref = useRef({ index, dir: null });
  if (ref.current.index !== index) ref.current = { index, dir: index > ref.current.index ? "left" : "right" };
  return ref.current.dir;
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
const shareMessage = (a, handle) => `${a.title}\n${a.excerpt || ""}\n\nLeggilo su ${APP_NAME} e seguici su Instagram${handle ? " @" + handle : ""}`;
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
async function shareNative(data, dialogTitle = "Condividi articolo") {
  try {
    const S = window.Capacitor?.Plugins?.Share;
    if (window.Capacitor?.isNativePlatform?.() && S) await S.share({ ...data, dialogTitle });
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
  // Tappa 3 (G13): la fascia del Team Radio e il titolo come messaggio radio, tra le virgolette.
  if (paint) {
    ctx.fillStyle = C.accent; roundRect(ctx, IMG_PAD, y, IMG_TW, 72, 18); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = `italic 900 32px ${CF_HEAD}`; ctx.fillText("TEAM RADIO // BREAKING NEWS", IMG_PAD + 28, y + 47);
    [18, 34, 50, 26, 42, 20, 36].forEach((h, i) => { ctx.fillStyle = "rgba(255,255,255,.85)"; roundRect(ctx, IMG_W - IMG_PAD - 150 + i * 18, y + 36 - h / 2, 8, h, 4); ctx.fill(); });
  }
  y += 72 + 26;
  ctx.font = `800 24px ${CF_HEAD}`;
  const catW = ctx.measureText(a.cat).width + 44;
  if (paint) { ctx.fillStyle = "rgba(255,255,255,.08)"; roundRect(ctx, IMG_PAD, y, catW, 48, 12); ctx.fill(); ctx.fillStyle = C.text; ctx.fillText(a.cat, IMG_PAD + 22, y + 33); }
  y += 48 + 12;
  ctx.font = `italic 900 66px ${CF_HEAD}`;
  for (const l of wrapText(ctx, "«" + a.title + "»", IMG_TW)) { y += 76; if (paint) { ctx.fillStyle = C.text; ctx.fillText(l, IMG_PAD, y); } }
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
      const g = ctx.createLinearGradient(IMG_PAD, y, IMG_PAD + IMG_TW * .7, y + heroH); g.addColorStop(0, shade(C.accent, .25)); g.addColorStop(.7, "#0f0f12");
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
    ctx.fillStyle = C.text; ctx.font = `italic 900 38px ${CF_HEAD}`; ctx.fillText("Letto su " + APP_NAME, IMG_PAD + 152, y + 76);
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
  const photo = await loadImage(await loadStoredImage(a.image).catch(() => ""));   // foto salvata su Firebase (fsimg:) o link
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
  const ph = useCommonsPhoto("drivers", driver ? driver.id : null);   // G30: la foto di Commons, se c'è
  if (!driver) return <span style={{ width: size, height: size, borderRadius: "50%", background: "rgba(255,255,255,.1)", flexShrink: 0 }} />;
  const ring = Math.max(2, Math.round(size / 14));
  // Foto piccola = il casco del pilota; se manca, il volto; poi la foto di Commons; altrimenti le iniziali.
  const kind = driver.helmet ? "casco" : driver.avatar ? "volto" : driver.photo ? "foto" : ph ? "commons" : "disegno";
  const bg = driver.helmet ? `#1c1c20 url(${driver.helmet}) 50% 55% / 86% auto no-repeat`
    : driver.avatar ? `#1c1c20 url(${driver.avatar}) center / cover no-repeat`
    : driver.photo ? `#1c1c20 url(${driver.photo}) 50% 3% / 190% auto no-repeat`
    : ph ? `#1c1c20 url("${ph.thumb}") 50% 22% / cover no-repeat` : `radial-gradient(circle at 50% 30%, ${alpha(driver.color, .35)}, #141418 70%)`;
  return (
    <span aria-hidden="true" style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, padding: ring, background: driver.color, display: "inline-block", boxSizing: "border-box" }}>
      <span data-img={kind} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", borderRadius: "50%", background: bg, overflow: "hidden" }}>
        {kind === "disegno" && <span data-geo-driver={driver.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1 }}>
          <HelmetArt spec={driverHelmet(driver)} size={Math.round(size * (size >= 50 ? .56 : .7))} />
          {size >= 50 && <span style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: Math.round(size * .17), letterSpacing: .5, color: "#fff", lineHeight: 1 }}>{driverCode(driver)}</span>}
        </span>}
      </span>
    </span>
  );
}

// Interruttore "Fluid Minimal Pill" (G18): capsula grigia da spento; da acceso la copre il colore dei tasti (con
// l'opacità) e il pallino bianco con l'ombra scatta come una molla (transform con una curva che rimbalza, R4), con il
// tic e la vibrazione della selezione (G03).
function Toggle({ on, onChange, disabled, label }) {
  const lit = !!on && !disabled;
  return (
    <button className="press" data-pill="" role="switch" aria-checked={on} aria-label={label} disabled={disabled}
      onClick={() => { if (disabled) return; fx.play("tick"); fx.buzz("select"); onChange(!on); }}
      style={{ width: 50, height: 30, borderRadius: 15, background: "rgba(255,255,255,.16)", position: "relative", flexShrink: 0, opacity: disabled ? .45 : 1, overflow: "hidden" }}>
      <span data-pill-on="" className="pill-on" style={{ position: "absolute", inset: 0, borderRadius: 15, background: C.accent, opacity: lit ? 1 : 0 }} />
      <span data-pill-knob="" className="pill-knob" style={{ position: "absolute", top: 3, left: 3, width: 24, height: 24, borderRadius: "50%", background: "#fff", boxShadow: "0 2px 6px rgba(0,0,0,.38), 0 0 1px rgba(0,0,0,.3)", transform: `translateX(${lit ? 20 : 0}px)` }} />
    </button>
  );
}
// Rete del telefono (navigator.onLine con gli eventi "online" e "offline"): per lo stato del Pit Wall (G18).
function useNetOnline() {
  const [on, setOn] = useState(() => typeof navigator === "undefined" || navigator.onLine !== false);
  useEffect(() => {
    const up = () => setOn(true), down = () => setOn(false);
    window.addEventListener("online", up); window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);
  return on;
}

// Il casco del profilo (G15), disegnato da noi (niente caschi veri dei piloti): profilo verso destra, il disegno nei due
// colori, il numero sul fianco, la visiera (che si alza con visorOpen) e la finitura. Senza colore di base vale quello dei
// tasti. spec: valori come cleanHelmet (src/logic/helmet.js).
const HELMET_SHELL = "M18 70 C10 52 14 26 34 14 C50 4 74 6 86 20 C94 30 96 44 95 56 L92 70 C91 74 88 76 84 76 L28 76 C22 76 19 74 18 70 Z";
const HELMET_VISOR = "M52 32 C64 27 82 28 93 34 L95 47 C82 43 66 43 54 47 C50 43 50 36 52 32 Z";
const VISOR_STOPS = { clear: ["rgba(200,222,238,.55)", "rgba(160,190,210,.35)"], smoke: ["#2A2E36", "#101216"], "iridium-blue": ["#1E3A8A", "#60A5FA"], "iridium-gold": ["#7C4A03", "#FBBF24"], "mirror-red": ["#7F1D1D", "#F87171"] };
const starPath = (cx, cy, r) => Array.from({ length: 10 }, (_, i) => { const a = Math.PI / 5 * i - Math.PI / 2, rr = i % 2 ? r * .45 : r; return `${i ? "L" : "M"}${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)}`; }).join(" ") + "Z";
function HelmetPattern({ id, c1, c2 }) {
  switch (id) {
    case "stripes": return <g><path d="M8 44 C32 30 62 18 100 18 L100 27 C64 27 34 38 8 54 Z" fill={c1} /><path d="M8 58 C32 44 62 32 100 31 L100 36 C64 37 34 48 8 63 Z" fill={c2} /></g>;
    case "flames": return <g><path d="M100 60 C86 58 80 50 70 54 C74 46 66 44 58 50 C60 42 52 40 44 48 C46 40 38 36 30 46 C30 38 22 38 14 50 L12 80 L100 80 Z" fill={c1} stroke={c2} strokeWidth="1.6" strokeLinejoin="round" /></g>;
    case "checks": return <g>{Array.from({ length: 30 }, (_, i) => { const x = 8 + (i % 5) * 9, y = 8 + Math.floor(i / 5) * 12; return <rect key={i} x={x} y={y} width="9" height="12" fill={(i % 5 + Math.floor(i / 5)) % 2 ? c1 : c2} />; })}</g>;
    case "stars": return <g>{[[30, 30, 7], [44, 20, 5], [26, 52, 6], [62, 18, 4.5], [40, 62, 5]].map(([x, y, r], i) => <path key={i} d={starPath(x, y, r)} fill={i % 2 ? c2 : c1} />)}</g>;
    case "bolt": return <path d="M76 12 L46 42 L62 44 L28 76 L48 50 L34 48 L58 12 Z" fill={c1} stroke={c2} strokeWidth="1.6" strokeLinejoin="round" />;
    case "pinstripes": return <g fill="none" strokeLinecap="round">{[0, 1, 2, 3].map(i => <path key={i} d={`M10 ${50 + i * 6} C34 ${36 + i * 6} 64 ${24 + i * 5} 100 ${22 + i * 5}`} stroke={i % 2 ? c2 : c1} strokeWidth="1.6" />)}</g>;
    case "dots": return <g>{[[24, 28], [36, 20], [30, 42], [44, 34], [20, 56], [40, 54], [56, 22], [50, 64], [66, 58], [32, 66]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3.6" fill={i % 3 ? c1 : c2} />)}</g>;
    default: return null;
  }
}
function HelmetArt({ spec, size = 40, visorOpen = false }) {
  const h = cleanHelmet(spec);
  const uid = (React.useId ? React.useId() : "h").replace(/[^a-zA-Z0-9]/g, "");
  const base = h.base || C.accent, [v0, v1] = VISOR_STOPS[h.visor] || VISOR_STOPS.smoke;
  return (
    <svg data-helmet="" data-pattern={h.pattern} data-visor={visorOpen ? "open" : "closed"} data-finish={h.finish} viewBox="0 0 100 86" width={size} height={Math.round(size * .86)} aria-hidden="true" style={{ display: "block", overflow: "visible" }}>
      <defs>
        <clipPath id={"hc" + uid}><path d={HELMET_SHELL} /></clipPath>
        <linearGradient id={"hv" + uid} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={v0} /><stop offset="1" stopColor={v1} /></linearGradient>
        <linearGradient id={"hg" + uid} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".5" /><stop offset=".45" stopColor="#fff" stopOpacity="0" /></linearGradient>
        <linearGradient id={"ha" + uid} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={h.c1} stopOpacity="0" /><stop offset="1" stopColor={h.c1} stopOpacity=".75" /></linearGradient>
      </defs>
      <path d={HELMET_SHELL} fill={base} />
      <g clipPath={`url(#hc${uid})`}>
        <HelmetPattern id={h.pattern} c1={h.c1} c2={h.c2} />
        {h.finish === "airbrush" && <rect x="0" y="0" width="100" height="86" fill={`url(#ha${uid})`} />}
        {h.finish === "matte" && <rect x="0" y="0" width="100" height="86" fill="rgba(0,0,0,.2)" />}
        {h.finish !== "matte" && <ellipse cx="46" cy="22" rx="34" ry="16" fill={`url(#hg${uid})`} />}
        <path d="M16 66 L96 66 L96 80 L16 80 Z" fill="#141418" />
      </g>
      <path d={HELMET_SHELL} fill="none" stroke="rgba(0,0,0,.45)" strokeWidth="1.4" />
      <path d={HELMET_VISOR} fill="#07080A" />
      <g className="helmet-visor" style={{ transform: visorOpen ? "rotate(-26deg)" : "none", transformOrigin: "54px 40px" }}>
        <path d={HELMET_VISOR} fill={`url(#hv${uid})`} stroke="#07080A" strokeWidth="1.2" />
        <path d="M60 34 C70 31 80 31 88 34" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="54" cy="40" r="2.6" fill="#2A2A30" stroke="#55555F" strokeWidth=".8" />
      </g>
      {h.number != null && <text x="33" y="55" textAnchor="middle" fontFamily={F_HEAD} fontWeight="900" fontStyle="italic" fontSize="17" fill="#fff" stroke="#000" strokeWidth=".8" paintOrder="stroke">{h.number}</text>}
    </svg>
  );
}

// Editor del casco (G15): colore di base (o quello dei tasti), i due colori del disegno, il disegno, il numero (0-99),
// la visiera e la finitura. Entrando la visiera si alza; salvando si abbassa con il clack (suono e vibrazione), poi
// l'editor si chiude e il casco va nei dati dell'account.
const HELMET_EXTRA = [{ name: "Bianco", color: "#FFFFFF" }, { name: "Nero", color: "#111111" }];
function HelmetEditor({ helmet, onSave, onClose }) {
  const [d, setD] = useState(() => cleanHelmet(helmet));
  const [closing, setClosing] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const set = (k, v) => setD(x => cleanHelmet({ ...x, [k]: v }));
  const save = () => {
    if (closing) return;
    setClosing(true); fx.play("clack"); fx.buzz("medium");
    timer.current = setTimeout(() => { onSave && onSave(cleanHelmet(d)); onClose(); }, 520);
  };
  const head = { fontFamily: F_BODY, fontWeight: 700, fontSize: 11, color: C.dim, letterSpacing: 1, margin: "16px 0 8px" };
  const sw = (on, color) => ({ width: 30, height: 30, borderRadius: "50%", background: color, boxShadow: on ? `0 0 0 2px ${C.card}, 0 0 0 4px ${C.text}` : "inset 0 0 0 1px rgba(255,255,255,.2)", flexShrink: 0 });
  const swatches = (key, list, extra = null) => (
    <div data-helmet-opt={key} style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
      {extra}
      {list.map(c => <button key={c.color} className="press" aria-label={c.name} aria-pressed={d[key] === c.color ? "true" : "false"} onClick={() => set(key, c.color)} style={sw(d[key] === c.color, c.color)} />)}
    </div>
  );
  const chips = (key, list) => (
    <div data-helmet-opt={key} style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {list.map(o => <button key={o.id} className="press" aria-pressed={d[key] === o.id ? "true" : "false"} onClick={() => { set(key, o.id); fx.play("tick"); fx.buzz("select"); }} style={aChip(d[key] === o.id)}>{o.name}</button>)}
    </div>
  );
  const num = d.number == null ? "" : String(d.number);
  const step = k => set("number", Math.max(0, Math.min(99, (d.number == null ? (k > 0 ? -1 : 1) : d.number) + k)));
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.8)", zIndex: 640, display: "flex", alignItems: "flex-end" }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="scrollcol" data-helmet-editor="" style={{ background: C.card, borderRadius: "24px 24px 0 0", width: "100%", maxHeight: "92%", padding: "18px 20px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
          <h2 style={{ flex: 1, fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 17, color: C.text, margin: 0 }}>IL TUO CASCO</h2>
          <button className="press" aria-label="Chiudi" onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="close" size={13} sw={2.2} /></button>
        </div>
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px", background: "radial-gradient(60% 70% at 50% 55%, rgba(255,255,255,.07), rgba(255,255,255,0))" }}>
          <HelmetArt spec={d} size={150} visorOpen={!closing} />
        </div>
        <div style={head}>COLORE DI BASE</div>
        {swatches("base", Colors.PALETTE, (
          <>
            <button className="press" aria-label="Colore dei tasti" aria-pressed={d.base == null ? "true" : "false"} onClick={() => set("base", null)} style={{ ...sw(d.base == null, C.accent), display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="palette" size={14} color={C.onAccent} /></button>
            <label style={{ position: "relative", ...sw(false, "conic-gradient(#FF1801, #FFD100, #4AE54A, #27F4D2, #3671C6, #A142F4, #FF87BC, #FF1801)"), overflow: "hidden", cursor: "pointer" }}>
              <input type="color" aria-label="Scegli tu il colore di base" value={(d.base || C.accent).toLowerCase()} onChange={e => set("base", e.target.value)} style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", border: "none", padding: 0 }} />
            </label>
          </>
        ))}
        <div style={head}>PRIMO COLORE DEL DISEGNO</div>
        {swatches("c1", [...HELMET_EXTRA, ...Colors.PALETTE])}
        <div style={head}>SECONDO COLORE DEL DISEGNO</div>
        {swatches("c2", [...HELMET_EXTRA, ...Colors.PALETTE])}
        <div style={head}>DISEGNO</div>
        {chips("pattern", HELMET_PATTERNS)}
        <div style={head}>NUMERO</div>
        <div data-helmet-opt="number" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button className="press" aria-label="Numero più basso" onClick={() => step(-1)} style={{ ...aChip(false), width: 38, justifyContent: "center", fontSize: 16 }}>−</button>
          <input data-helmet-number="" type="number" inputMode="numeric" min="0" max="99" aria-label="Numero (0-99)" placeholder="–" value={num} onChange={e => set("number", e.target.value === "" ? null : e.target.value)}
            style={{ width: 92, padding: "9px 12px", borderRadius: 11, background: C.bg, border: `1px solid ${C.border}`, fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 18, color: C.text, textAlign: "center" }} />
          <button className="press" aria-label="Numero più alto" onClick={() => step(1)} style={{ ...aChip(false), width: 38, justifyContent: "center", fontSize: 16 }}>+</button>
          <span style={{ fontFamily: F_BODY, fontSize: 11.5, color: C.dim }}>da 0 a 99, vuoto = senza</span>
        </div>
        <div style={head}>VISIERA</div>
        {chips("visor", HELMET_VISORS)}
        <div style={head}>FINITURA</div>
        {chips("finish", HELMET_FINISHES)}
        <button className="press" onClick={save} style={{ display: "block", width: "100%", marginTop: 20, padding: "14px 0", borderRadius: 14, background: C.accent, fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 14, color: C.onAccent }}>SALVA IL CASCO</button>
        <button className="press" onClick={onClose} style={{ display: "block", width: "100%", padding: "12px 0", fontFamily: F_BODY, fontWeight: 600, fontSize: 13, color: C.muted }}>Annulla</button>
      </div>
    </div>
  );
}

// Profilo → "Colori dell'app" (G02): il colore della scuderia del cuore (di serie), uno dei 12 colori pronti o "Scegli
// tu" con la ruota dei colori del telefono. Dal colore applyTheme ricava i toni dei tasti e dei testi: si vedono subito
// in tutta l'app e nell'anteprima in fondo.
function ThemeSheet({ theme, favTeam, onPick, onClose }) {
  const team = favTeam ? teamById(favTeam) : null;
  const custom = theme && theme.mode === "custom" ? theme.color : null;
  const wheel = custom && !Colors.PALETTE.some(c => c.color === custom) ? custom : null;
  const head = { fontFamily: F_BODY, fontWeight: 700, fontSize: 11, color: C.dim, letterSpacing: 1, margin: "18px 0 10px" };
  const rowStyle = on => ({ position: "relative", display: "flex", alignItems: "center", gap: 12, width: "100%", padding: 12, borderRadius: 14, textAlign: "left", background: on ? alpha(C.accentInk, .1) : "rgba(255,255,255,.04)", border: `1px solid ${on ? C.accentInk : C.border}`, cursor: "pointer" });
  const check = <Icon name="check" size={16} color={C.accentInk} sw={2.4} />;
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 620, display: "flex", alignItems: "flex-end" }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="scrollcol" data-theme-sheet="" style={{ background: C.card, borderRadius: "24px 24px 0 0", width: "100%", maxHeight: "88%", padding: "20px 20px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
          <h2 style={{ flex: 1, fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 17, color: C.text, margin: 0 }}>COLORI DELL'APP</h2>
          <button className="press" aria-label="Chiudi" onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="close" size={13} sw={2.2} /></button>
        </div>
        <p style={{ margin: 0, fontFamily: F_BODY, fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>Il colore dei tasti, dei titoli e delle linee. Con qualsiasi colore i testi restano leggibili: se serve, l'app lo scurisce o lo schiarisce un po'.</p>
        <div style={{ marginTop: 16 }}>
          <button className="press" data-theme-team="" aria-pressed={theme && theme.mode === "team" ? "true" : "false"} onClick={() => onPick({ mode: "team", color: null })} style={rowStyle(theme && theme.mode === "team")}>
            <span style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, background: team ? team.color : LED_RED, border: "2px solid rgba(255,255,255,.2)" }} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontFamily: F_BODY, fontWeight: 700, fontSize: 14, color: C.text }}>Colore della mia scuderia</span>
              <span style={{ display: "block", fontFamily: F_BODY, fontSize: 11.5, color: C.muted, marginTop: 2 }}>{team ? team.name : "Rosso LED: scegli la scuderia del cuore nel Profilo"}</span>
            </span>
            {theme && theme.mode === "team" && check}
          </button>
        </div>
        <div style={head}>COLORI</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {Colors.PALETTE.map(c => {
            const on = custom === c.color;
            return (
              <button key={c.color} className="press" data-theme-color={c.color} aria-label={c.name} aria-pressed={on ? "true" : "false"} onClick={() => onPick({ mode: "custom", color: c.color })} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "6px 0" }}>
                <span style={{ width: 38, height: 38, borderRadius: "50%", background: c.color, boxShadow: on ? `0 0 0 3px ${C.card}, 0 0 0 5px ${C.text}` : "inset 0 0 0 1px rgba(255,255,255,.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {on && <Icon name="check" size={16} color={Colors.contrast(c.color, "#000000") > Colors.contrast(c.color, "#FFFFFF") ? "#000" : "#fff"} sw={2.6} />}
                </span>
                <span style={{ fontFamily: F_BODY, fontSize: 10.5, color: on ? C.text : C.muted, textAlign: "center", lineHeight: 1.2 }}>{c.name}</span>
              </button>
            );
          })}
        </div>
        <div style={head}>COME VUOI TU</div>
        <label htmlFor="themeWheel" style={rowStyle(!!wheel)}>
          <span style={{ position: "relative", width: 30, height: 30, borderRadius: "50%", flexShrink: 0, overflow: "hidden", background: wheel || "conic-gradient(#FF1801, #FFD100, #4AE54A, #27F4D2, #3671C6, #A142F4, #FF87BC, #FF1801)", border: "2px solid rgba(255,255,255,.2)" }}>
            <input id="themeWheel" data-theme-wheel="" type="color" aria-label="Scegli tu il colore" value={(wheel || custom || C.accentInk).toLowerCase()} onChange={e => { const v = Colors.normHex(e.target.value); if (v) onPick({ mode: "custom", color: v }); }} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, border: "none", padding: 0, cursor: "pointer" }} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontFamily: F_BODY, fontWeight: 700, fontSize: 14, color: C.text }}>Scegli tu</span>
            <span style={{ display: "block", fontFamily: F_BODY, fontSize: 11.5, color: C.muted, marginTop: 2 }}>{wheel || "Con la ruota dei colori del telefono"}</span>
          </span>
          {wheel && check}
        </label>
        <div data-theme-preview="" style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 18, padding: 14, borderRadius: 14, background: C.bg, border: `1px solid ${C.border}` }}>
          <span data-theme-sample="tasto" style={{ padding: "10px 16px", borderRadius: 11, background: C.accent, fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 13, color: C.onAccent }}>TASTO</span>
          <span data-theme-sample="testo" style={{ flex: 1, fontFamily: F_HEAD, fontWeight: 800, fontSize: 13, color: C.accentInk, borderBottom: `2px solid ${C.accentInk}`, paddingBottom: 3 }}>Titoli e linee</span>
        </div>
      </div>
    </div>
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
          <button key={o.id} className="press" onClick={() => { onPick(o.id); onClose(); }} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "11px 20px", textAlign: "left", background: selected === o.id ? alpha(C.accentInk, .08) : "transparent" }}>
            {o.driver ? <Headshot driver={o.driver} size={32} /> : <span style={{ width: 12, height: 12, borderRadius: "50%", background: o.color, flexShrink: 0 }} />}
            <span style={{ flex: 1, fontFamily: F_BODY, fontWeight: 600, fontSize: 14, color: C.text }}>{o.label}</span>
            {o.sub && <span style={{ fontFamily: F_BODY, fontSize: 11, color: C.dim }}>{o.sub}</span>}
            {selected === o.id && <Icon name="check" size={15} color={C.accentInk} sw={2.4} />}
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
/* ── SU DI TE: da quanto segui la F1 e che tifoso sei (registrazione e profilo) ── */
const FOLLOW_STEPS = ["Meno di 1 anno", "1 – 3 anni", "4 – 6 anni", "7 – 10 anni", "Più di 10 anni"];
const FAN_TYPES = [["vivo", "Vivo e respiro F1!"], ["vroom", "Se fa Vroom è bello"], ["matricola", "Matricola delle 4 ruote"], ["nuovo", "Nuovo sport da seguire"]];
const ABOUT_INIT = { birth: null, follow: 1, fan: "vivo", years: 1 };   // valori di partenza dei moduli "Su di te"
// Tappa 3 (G16): gli anni da tifoso si scelgono esatti (years); follow, la fascia che legge anche l'app di oggi, si
// ricava da years. Per chi ha solo la fascia, il contachilometri parte da un valore dentro la fascia.
const YEARS_MAX = 60;
const followOf = y => (y == null ? null : y < 1 ? 0 : y <= 3 ? 1 : y <= 6 ? 2 : y <= 10 ? 3 : 4);
const yearsOf = a => (a && Number.isInteger(a.years) ? a.years : a && a.follow != null ? [0, 2, 5, 8, 12][a.follow] ?? 1 : ABOUT_INIT.years);
const yearsLabel = y => `${y} ${y === 1 ? "anno" : "anni"}`;
const DEFAULT_BIRTH = 2000;   // primo scatto del manettino quando l'anno non è ancora indicato
const BIRTH_YEARS = Array.from({ length: 2016 - 1935 + 1 }, (_, i) => 2016 - i);
const fanLabel = id => (FAN_TYPES.find(f => f[0] === id) || [null, "–"])[1];
// Anni da tifoso (G16): il contachilometri a rulli. Le cifre girano (transform) quando il valore cambia; si cambia con −
// e +, trascinando i rulli in su o in giù (16 px = un anno) o con le frecce della tastiera (role="spinbutton").
function OdometerYears({ id, value, onChange }) {
  const v = Math.max(0, Math.min(YEARS_MAX, value == null ? 0 : value));
  const set = n => { const x = Math.max(0, Math.min(YEARS_MAX, n)); if (x !== v) { onChange(x); fx.play("tick"); fx.buzz("select"); } };
  const drag = useRef(null);
  const down = e => { drag.current = { y: e.clientY, v }; try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {} };
  const move = e => { const d = drag.current; if (!d) return; set(d.v + Math.round((d.y - e.clientY) / 16)); };
  const up = () => { drag.current = null; };
  const key = e => {
    const k = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 5, PageDown: -5 }[e.key];
    if (k) { e.preventDefault(); set(v + k); } else if (e.key === "Home") { e.preventDefault(); set(0); } else if (e.key === "End") { e.preventDefault(); set(YEARS_MAX); }
  };
  const btn = { width: 34, height: 34, borderRadius: 10, background: "rgba(255,255,255,.07)", border: `1px solid ${C.border}`, fontFamily: F_HEAD, fontWeight: 900, fontSize: 17, color: C.text, flexShrink: 0 };
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
        <span id={id + "Label"} style={{ fontFamily: F_BODY, fontWeight: 600, fontSize: 12, color: C.muted }}>Da quanti anni segui la F1</span>
        <span data-follow-label="" style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 13.5, color: C.text }}>{yearsLabel(v)}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button type="button" className="press" aria-label="Un anno in meno" onClick={() => set(v - 1)} style={btn}>−</button>
        <div id={id} data-odometer={v} data-swipe-own="" role="spinbutton" tabIndex={0} aria-labelledby={id + "Label"} aria-valuemin={0} aria-valuemax={YEARS_MAX} aria-valuenow={v} aria-valuetext={yearsLabel(v)}
          onKeyDown={key} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
          style={{ display: "flex", gap: 3, padding: 5, borderRadius: 10, background: "#0B0B0E", border: `1px solid ${C.border}`, boxShadow: "inset 0 2px 6px rgba(0,0,0,.8)", touchAction: "none", cursor: "ns-resize", userSelect: "none" }}>
          {[Math.floor(v / 10), v % 10].map((dg, i) => (
            <span key={i} style={{ position: "relative", width: 26, height: 36, overflow: "hidden", borderRadius: 5, background: "linear-gradient(#26262E, #101014 45%, #101014 55%, #26262E)" }}>
              <span data-odo-strip="" className="odo-strip" style={{ position: "absolute", left: 0, right: 0, top: 0, transform: `translateY(${-dg * 36}px)` }}>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => <span key={n} style={{ display: "block", height: 36, lineHeight: "36px", textAlign: "center", fontFamily: F_HEAD, fontWeight: 900, fontSize: 22, color: "#F4F2EF" }}>{n}</span>)}
              </span>
              <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(rgba(0,0,0,.55), rgba(0,0,0,0) 30%, rgba(0,0,0,0) 70%, rgba(0,0,0,.55))", pointerEvents: "none" }} />
            </span>
          ))}
        </div>
        <button type="button" className="press" aria-label="Un anno in più" onClick={() => set(v + 1)} style={btn}>+</button>
        <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 11, letterSpacing: 1, color: C.dim }}>ANNI</span>
      </div>
    </div>
  );
}

// Anno di nascita (G17): un manettino rotante, come quelli del volante. Ogni anno è uno scatto (tic e vibrazione); si
// gira trascinando (in su o a destra = anno dopo, 14 px a scatto), con le frecce della tastiera o con i tasti accanto.
// role="slider"; senza anno: "Non indicato" (il primo scatto porta al DEFAULT_BIRTH).
const KNOB_DEG = 15;
function BirthKnob({ id, value, onChange, min = 1935, max }) {
  const set = y => { const v = y == null ? null : Math.max(min, Math.min(max, y)); if (v !== value) { onChange(v); if (v != null) { fx.play("tick"); fx.buzz("select"); } } };
  const step = k => set(value == null ? Math.min(max, DEFAULT_BIRTH) : value + k);
  const drag = useRef(null);
  const down = e => { drag.current = { x: e.clientX, y: e.clientY, v: value == null ? Math.min(max, DEFAULT_BIRTH) : value, moved: false }; try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {} };
  const move = e => {
    const d = drag.current; if (!d) return;
    const n = Math.round(((e.clientX - d.x) - (e.clientY - d.y)) / 14);
    if (n !== 0 || d.moved) { d.moved = true; set(d.v + n); }
  };
  const up = () => { drag.current = null; };
  const key = e => {
    const k = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 10, PageDown: -10 }[e.key];
    if (k) { e.preventDefault(); step(k); }
    else if (e.key === "Home") { e.preventDefault(); set(min); } else if (e.key === "End") { e.preventDefault(); set(max); }
    else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); set(null); }
  };
  const rot = value == null ? -30 : (value - min) * KNOB_DEG;
  const small = { width: 30, height: 30, borderRadius: 9, background: "rgba(255,255,255,.07)", border: `1px solid ${C.border}`, fontFamily: F_HEAD, fontWeight: 900, fontSize: 15, color: C.text, flexShrink: 0 };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div id={id} data-knob="" data-swipe-own="" role="slider" tabIndex={0} aria-label="Anno di nascita" aria-valuemin={min} aria-valuemax={max} aria-valuenow={value == null ? undefined : value} aria-valuetext={value == null ? "Non indicato" : String(value)}
        onKeyDown={key} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        style={{ position: "relative", width: 70, height: 70, flexShrink: 0, borderRadius: "50%", touchAction: "none", cursor: "grab", userSelect: "none", outlineOffset: 3 }}>
        <svg viewBox="0 0 70 70" width="70" height="70" aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
          {Array.from({ length: 24 }, (_, i) => <line key={i} x1="35" y1="2" x2="35" y2={i % 6 ? 6 : 8} stroke={i % 6 ? "rgba(255,255,255,.25)" : "rgba(255,255,255,.55)"} strokeWidth="1.4" transform={`rotate(${i * 15} 35 35)`} />)}
        </svg>
        <span data-knob-dial="" className="knob-dial" style={{ position: "absolute", inset: 10, borderRadius: "50%", background: "radial-gradient(circle at 40% 35%, #3A3A44, #15151A 70%)", boxShadow: "0 4px 10px rgba(0,0,0,.7), inset 0 0 0 2px #2C2C34", transform: `rotate(${rot}deg)` }}>
          {Array.from({ length: 12 }, (_, i) => <span key={i} style={{ position: "absolute", left: "50%", top: 1, width: 2, height: 6, marginLeft: -1, borderRadius: 1, background: "rgba(255,255,255,.12)", transformOrigin: "1px 24px", transform: `rotate(${i * 30}deg)` }} />)}
          <span style={{ position: "absolute", left: "50%", top: 5, width: 4, height: 14, marginLeft: -2, borderRadius: 2, background: C.accentInk }} />
        </span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: value == null ? 15 : 24, color: value == null ? C.muted : C.text }}>{value == null ? "Non indicato" : value}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
          <button type="button" className="press" aria-label="Anno prima" onClick={() => step(-1)} style={small}>−</button>
          <button type="button" className="press" aria-label="Anno dopo" onClick={() => step(1)} style={small}>+</button>
          {value != null && <button type="button" className="press" onClick={() => set(null)} style={{ fontFamily: F_BODY, fontWeight: 600, fontSize: 11.5, color: C.dim, textDecoration: "underline", marginLeft: 4 }}>Non indicare</button>}
        </div>
      </div>
    </div>
  );
}

function FanTypePicker({ value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Che tifoso sei" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      {FAN_TYPES.map(([id, label]) => {
        const on = value === id;
        return <button key={id} type="button" className="press" role="radio" aria-checked={on ? "true" : "false"} aria-pressed={on ? "true" : "false"} data-fan-option={id} onClick={() => onChange(id)} style={{ padding: "11px 8px", borderRadius: 12, background: on ? alpha(C.accentInk, .16) : C.card, border: `1px solid ${on ? C.accentInk : C.border}`, fontFamily: F_BODY, fontWeight: 700, fontSize: 12, color: on ? C.text : C.muted, textAlign: "center", lineHeight: 1.3 }}>{label}</button>;
      })}
    </div>
  );
}
// Scheda "Su di te" del profilo: anno di nascita (manettino), da quanti anni segui la F1 (contachilometri), tipo di tifoso.
function AboutCard({ about, onSave }) {
  const a = about || ABOUT_INIT;
  const [edit, setEdit] = useState(false);
  useBack(edit, () => setEdit(false));
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
        <span style={{ fontFamily: F_BODY, fontWeight: 600, fontSize: 15, color: C.muted }}>Su di te</span>
        <div style={{ flex: 1 }} />
        {!edit && <button className="press" aria-label="Modifica Su di te" onClick={() => { setDraft({ ...a, years: yearsOf(a) }); setEdit(true); }} style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: F_HEAD, fontWeight: 800, fontSize: 14, color: C.gold }}><Icon name="edit" size={14} color={C.gold} sw={2.2} />Modifica</button>}
      </div>
      <div style={{ borderRadius: 18, background: C.card, border: `1px solid ${C.border}`, overflow: "hidden" }}>
        {edit ? (
          <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div style={{ ...small, marginBottom: 8 }}>Anno di nascita</div>
              <BirthKnob id="aboutBirth" value={draft.birth || null} min={BIRTH_YEARS[BIRTH_YEARS.length - 1]} max={new Date(nowMs()).getFullYear() - MIN_AGE} onChange={v => setDraft(d => ({ ...d, birth: v }))} />
            </div>
            <OdometerYears id="aboutFollow" value={draft.years} onChange={v => setDraft(d => ({ ...d, years: v }))} />
            <div>
              <div style={{ ...small, marginBottom: 8 }}>Che tifoso sei?</div>
              <FanTypePicker value={draft.fan} onChange={v => setDraft(d => ({ ...d, fan: v }))} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="press" onClick={() => setEdit(false)} style={{ flex: 1, padding: "12px 0", borderRadius: 12, background: "rgba(255,255,255,.06)", border: `1px solid ${C.border}`, fontFamily: F_HEAD, fontWeight: 800, fontSize: 13, color: C.muted }}>Annulla</button>
              <button className="press" onClick={() => { onSave && onSave({ birth: draft.birth || null, follow: followOf(draft.years), fan: draft.fan, years: draft.years }); setEdit(false); }} style={{ flex: 1, padding: "12px 0", borderRadius: 12, background: C.accent, fontFamily: F_HEAD, fontWeight: 800, fontSize: 13, color: "#fff" }}>Salva</button>
            </div>
          </div>
        ) : (
          <>
            {row("birth", "Anno di nascita", a.birth || "Non indicato", true)}
            {row("follow", "Segue F1", Number.isInteger(a.years) ? yearsLabel(a.years) : FOLLOW_STEPS[a.follow] || "Non indicato")}
            {row("fan", "Tipo fan", fanLabel(a.fan))}
          </>
        )}
      </div>
    </div>
  );
}

// Accesso e registrazione con Firebase Authentication (src/services/account.js); i messaggi sono quelli dell'app di oggi.
// auth = { login(email, pw), register({ name, email, pw, pw2, about }), resetPassword(email) }.
// Password sbagliata (G07): i 5 semafori della partenza, rossi, che lampeggiano gialli, e "PARTENZA ABORTITA". Con
// "Rimuovi animazioni" restano gialli fermi (App.css): il colore dell'errore resta, il movimento no.
// Shift Light (G24): al posto delle rotelline e dei "Caricamento…" brevi (accesso, salvataggi, invii). 15 LED come sul
// volante: 5 verdi, 5 rossi, 5 blu. "run": verdi e rossi si accendono in sequenza finché si aspetta; "done": tutti accesi
// e i blu lampeggiano, operazione finita. Solo opacità (R4); con "Rimuovi animazioni" accesi fermi (R5, App.css).
const SHIFT_COLORS = { g: "#2BE05A", r: "#FF1801", b: "#3D7BFF" };
const SHIFT_PATTERN = "gggggrrrrrbbbbb".split("");
const SHIFT_DONE_MS = 650;
function ShiftLight({ state = "run", size = 7, label }) {
  return (
    <span data-shift={state} role="status" aria-label={label || (state === "done" ? "Fatto" : "Attendi")} className={"shift-" + state} style={{ display: "inline-flex", alignItems: "center", verticalAlign: "middle", gap: Math.max(2, Math.round(size * .45)) }}>
      {SHIFT_PATTERN.map((c, i) => <span key={i} data-shift-led={c} style={{ width: size, height: size, borderRadius: "50%", background: SHIFT_COLORS[c], boxShadow: `0 0 ${size}px ${alpha(SHIFT_COLORS[c], .7)}`, animationDelay: state === "run" && c !== "b" ? `${i * 55}ms` : undefined }} />)}
    </span>
  );
}

function AbortLights() {
  return (
    <div data-abort-lights="" role="status" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <div style={{ display: "flex", gap: 9, padding: "9px 14px", borderRadius: 14, background: "#0B0B0E", border: "1px solid rgba(255,255,255,.08)" }}>
        {[0, 1, 2, 3, 4].map(i => (
          <span key={i} data-abort-light={i} style={{ position: "relative", width: 18, height: 18, borderRadius: "50%", background: C.red, boxShadow: `0 0 10px ${alpha(C.red, .7)}` }}>
            <span className="abort-yellow" style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#FFD21F", boxShadow: "0 0 12px rgba(255,210,31,.8)" }} />
          </span>
        ))}
      </div>
      <span style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 14, letterSpacing: 1.5, color: "#FFD21F" }}>PARTENZA ABORTITA</span>
    </div>
  );
}

// Robustezza della password in registrazione (18/10): 3 tacche; serve almeno "buona" (8 caratteri, lettere e numeri).
const PW_LEVELS = [null, ["Debole: almeno 8 caratteri, con lettere e numeri", "#FF5A5F"], ["Buona", "#E7B34C"], ["Forte", "#3DDC84"]];
function PwMeter({ level }) {
  const [label, color] = PW_LEVELS[level] || PW_LEVELS[1];
  return (
    <div data-pw-strength={level} style={{ marginTop: 7 }}>
      <div style={{ display: "flex", gap: 4 }}>{[1, 2, 3].map(i => <span key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= level ? color : "rgba(255,255,255,.1)" }} />)}</div>
      <span style={{ display: "block", marginTop: 5, fontFamily: F_BODY, fontSize: 11.5, color: level >= 2 ? C.muted : color }}>Password: {label}</span>
    </div>
  );
}

// Mostra/nascondi la password come nel paddock (29/10): la visiera del casco si alza e la password si legge con le cifre
// del tabellone dei tempi.
const PW_SHOWN = { fontFamily: F_HEAD, fontWeight: 800, letterSpacing: 2, color: C.gold, fontVariantNumeric: "tabular-nums" };
function PwEye({ on, onToggle }) {
  return (
    <button type="button" className="press" data-pw-eye={on ? "open" : "closed"} aria-pressed={on ? "true" : "false"} aria-label={on ? "Nascondi la password" : "Mostra la password"}
      onClick={() => { fx.play("tick"); fx.buzz("select"); onToggle(!on); }} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 30, padding: 0, flexShrink: 0 }}>
      <HelmetArt spec={{ base: on ? C.accent : "#3A3A42", c1: "#FFFFFF", c2: "#111111", pattern: "stripes", visor: "iridium-gold", finish: "gloss" }} size={30} visorOpen={on} />
    </button>
  );
}
function LoginScreen({ auth, onDone, onGuest, onBack, reason, onHold }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);   // 29/10: password visibile (visiera alzata)
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [shiftDone, setShiftDone] = useState(false);   // G24: accesso riuscito, i blu della Shift Light lampeggiano
  const [birth, setBirth] = useState(null);
  const [years, setYears] = useState(ABOUT_INIT.years);   // anni da tifoso (G16); la fascia follow si ricava
  const [fan, setFan] = useState(null);
  const [adult, setAdult] = useState(false);   // "Ho almeno 14 anni" (Task 22)
  const [aborts, setAborts] = useState(0);      // password sbagliata (G07): ogni volta ripartono semafori e tremolio
  const [kerbTried, setKerbTried] = useState(false);   // CREA ACCOUNT toccato con le password diverse
  const isLogin = mode === "login";
  useBack(!isLogin, () => setMode("login"));   // da REGISTRATI il tasto indietro torna ad ACCEDI
  // Password diverse (G08): fuori pista quando la conferma è lunga almeno quanto la password (o dopo CREA ACCOUNT).
  const offTrack = !isLogin && pw2 !== "" && pw !== pw2 && (pw2.length >= pw.length || kerbTried);
  const typePw = v => { setPw(v); if (aborts) setAborts(0); };

  const submit = async () => {
    if (busy) return;
    if (!isLogin && pw && pw2 && pw !== pw2) { setKerbTried(true); setErr(""); fx.buzz("error"); return; }
    if (!isLogin && name.trim() && email.trim() && pw && pw2 && pw === pw2 && pw.length >= 6 && !fan) { setErr("Scegli che tifoso sei."); return; }
    setErr(""); setInfo(""); setBusy(true); setAborts(0);
    if (onHold) onHold(true);   // l'app aspetta la fine della Shift Light prima di entrare
    try {
      if (isLogin) await auth.login(email, pw);
      else await auth.register({ name, email, pw, pw2, about: { birth, follow: followOf(years), fan, years }, adult });
      setShiftDone(true); fx.play("done"); fx.buzz("success");
      await new Promise(r => setTimeout(r, SHIFT_DONE_MS));
      setBusy(false); setShiftDone(false);
      if (onHold) onHold(false);
      onDone && onDone({ created: !isLogin });
    } catch (e) {
      if (onHold) onHold(false);
      setBusy(false); setErr(messageOf(e));
      if (isLogin && e && e.code === "wrong-password") { setAborts(n => n + 1); fx.buzz("error"); fx.play("abort"); }
    }
  };
  const forgot = async () => {
    if (busy) return;
    setErr(""); setInfo("");
    if (!email.trim()) { setErr(ACCOUNT_MSG["empty-email"]); return; }
    setBusy(true);
    try { await auth.resetPassword(email); setInfo(ACCOUNT_MSG["reset-sent"]); }
    catch (e) { setErr(messageOf(e)); }
    setBusy(false);
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
          {isLogin ? `Bentornato su ${APP_NAME}` : "Crea il tuo account"}
        </h1>
        <p style={{ fontFamily: F_BODY, fontSize: 13, color: C.muted, textAlign: "center", lineHeight: 1.5, margin: 0 }}>
          Notizie, classifiche live, FantaF1 e la community B&amp;T, tutto in un'app.
        </p>
        {reason && <div role="status" style={{ marginTop: 14, padding: "10px 14px", borderRadius: 12, background: alpha(C.accentInk, .1), border: `1px solid ${alpha(C.accentInk, .35)}`, fontFamily: F_BODY, fontSize: 12.5, color: C.text, textAlign: "center", lineHeight: 1.45 }}>{reason}</div>}
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
          <div style={fieldStyle}><Icon name="lock" size={15} color={C.dim} /><input id="authPw" type={showPw ? "text" : "password"} style={showPw ? { ...inputStyle, ...PW_SHOWN } : inputStyle} placeholder="••••••••" value={pw} onChange={e => typePw(e.target.value)} /><PwEye on={showPw} onToggle={setShowPw} /></div>
          {!isLogin && pw && <PwMeter level={pwStrength(pw)} />}
        </div>
        {!isLogin && (
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle} htmlFor="regPw2">Conferma password</label>
            {/* Fuori pista: il bordo diventa un cordolo bianco e rosso (stesso campo, così chi scrive non perde il punto). */}
            <div data-kerb={offTrack ? "" : undefined} style={offTrack ? { ...fieldStyle, padding: "12px 13px", border: "2px solid transparent", background: `linear-gradient(${C.card}, ${C.card}) padding-box, repeating-linear-gradient(135deg, #FFFFFF 0 9px, ${C.red} 9px 18px) border-box` } : fieldStyle}><Icon name="lock" size={15} color={C.dim} /><input id="regPw2" type={showPw ? "text" : "password"} style={showPw ? { ...inputStyle, ...PW_SHOWN } : inputStyle} placeholder="••••••••" value={pw2} onChange={e => setPw2(e.target.value)} aria-invalid={offTrack ? "true" : undefined} aria-describedby={offTrack ? "regPw2Err" : undefined} /></div>
            {offTrack && <p id="regPw2Err" role="alert" style={{ margin: "7px 2px 0", fontFamily: F_BODY, fontSize: 12, fontWeight: 600, color: "#ff6b6b" }}><b style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic" }}>Track Limits Exceeded:</b> le password non coincidono</p>}
          </div>
        )}
        {!isLogin && (
          <div style={{ marginBottom: 16, padding: 14, borderRadius: 14, background: "rgba(255,255,255,.03)", border: `1px solid ${C.border}` }}>
            <div style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 13.5, color: C.text, marginBottom: 12 }}>Su di te</div>
            <div style={labelStyle}>Anno di nascita</div>
            <div style={{ marginBottom: 16 }}><BirthKnob id="regBirth" value={birth} min={BIRTH_YEARS[BIRTH_YEARS.length - 1]} max={BIRTH_YEARS[0]} onChange={setBirth} /></div>
            <OdometerYears id="regFollow" value={years} onChange={setYears} />
            <div style={{ ...labelStyle, marginTop: 16, marginBottom: 8 }}>Che tifoso sei?</div>
            <FanTypePicker value={fan} onChange={setFan} />
          </div>
        )}
        {!isLogin && (
          <label htmlFor="regAdult" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, fontFamily: F_BODY, fontSize: 13, color: C.text, cursor: "pointer" }}>
            <input id="regAdult" type="checkbox" checked={adult} onChange={e => setAdult(e.target.checked)} style={{ width: 18, height: 18, margin: 0, accentColor: C.accent, flexShrink: 0 }} />
            Ho almeno 14 anni
          </label>
        )}
        {isLogin && <div style={{ textAlign: "right", marginBottom: 18 }}><button className="press" onClick={forgot} style={{ fontFamily: F_BODY, fontWeight: 600, fontSize: 12, color: C.accentInk, padding: "6px 0" }}>Password dimenticata?</button></div>}
        {info && <p style={{ background: "rgba(255,255,255,.05)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 14px", marginTop: 0, marginBottom: 14, color: C.text, fontSize: 12, lineHeight: 1.5 }}>{info}</p>}
        {isLogin && aborts > 0 && <AbortLights key={aborts} />}
        {err && <p style={{ background: "#E1060018", border: `1px solid ${C.red}`, borderRadius: 10, padding: "9px 14px", marginTop: 0, marginBottom: 14, color: "#ff6b6b", fontSize: 12, lineHeight: 1.5 }}>{err}</p>}
        <button key={"go-" + aborts} className={aborts && isLogin ? "press abort-shake" : "press"} data-shake={aborts && isLogin ? "1" : undefined} onClick={submit} disabled={busy} style={{ display: "block", width: "100%", padding: busy ? "14px 0" : "15px 0", borderRadius: 14, background: busy ? "#0E0E12" : C.accent, border: busy ? `1px solid ${C.border}` : "none", boxShadow: busy ? "none" : `0 10px 22px -10px ${C.accent}`, fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 14, color: "#fff", letterSpacing: .3, textAlign: "center", marginBottom: 16 }}>
          {busy ? <ShiftLight state={shiftDone ? "done" : "run"} label={shiftDone ? "Accesso riuscito" : isLogin ? "Accesso in corso" : "Creazione dell'account in corso"} /> : isLogin ? "ACCEDI" : "CREA ACCOUNT"}
        </button>
        <p style={{ textAlign: "center", fontFamily: F_BODY, fontSize: 12, color: C.muted, margin: 0 }}>
          {isLogin ? <>Non hai un account? <button className="press" onClick={() => setMode("register")} style={{ display: "inline", fontFamily: F_BODY, fontWeight: 700, fontSize: 12, color: C.accentInk }}>Registrati</button></>
                   : <>Hai già un account? <button className="press" onClick={() => setMode("login")} style={{ display: "inline", fontFamily: F_BODY, fontWeight: 700, fontSize: 12, color: C.accentInk }}>Accedi</button></>}
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
      <div style={{ flexGrow: 1, minHeight: 24 }} />
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

// Tira giù per aggiornare (G14): dall'inizio della pagina il dito che tira fa salire il contagiri; oltre la soglia
// (fuorigiri) al rilascio la cambiata (suono e vibrazione) e onRefresh rilegge le notizie da Firebase. Col dito si usano
// gli eventi touch (touchmove non passivo: mentre si tira la pagina non rimbalza), col mouse i pointer events.
const PULL_MAX = 96;   // px di tirata (dopo la resistenza) per arrivare al fuorigiri
function usePullRefresh(ref, onRefresh) {
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const st = useRef(null), pullRef = useRef(0), busyRef = useRef(false);
  pullRef.current = pull; busyRef.current = busy;
  const start = (x, y) => { const el = ref.current; if (!el || el.scrollTop > 0 || busyRef.current) return; st.current = { x, y, active: false }; };
  const move = (x, y, e) => {
    const s = st.current; if (!s) return;
    const dy = y - s.y, dx = x - s.x;
    if (!s.active) {
      if (Math.abs(dy) < 8 && Math.abs(dx) < 8) return;
      if (dy > 0 && Math.abs(dx) < dy * SWIPE.ratio && ref.current && ref.current.scrollTop <= 0) { s.active = true; setDragging(true); try { window.getSelection().removeAllRanges(); } catch (err) {} }
      else { st.current = null; return; }
    }
    if (e && e.cancelable) e.preventDefault();
    setPull(Math.max(0, Math.min(PULL_MAX * 1.35, (dy - 8) * 0.6)));
  };
  const end = () => {
    const s = st.current; st.current = null; setDragging(false);
    if (!s || !s.active) return;
    if (pullRef.current >= PULL_MAX) {
      fx.play("shift"); fx.buzz("medium");
      setBusy(true); setPull(56);
      Promise.resolve(onRefresh && onRefresh()).catch(() => {}).then(() => { setBusy(false); setPull(0); });
    } else setPull(0);
  };
  const fns = useRef({});
  fns.current = { start, move, end };
  useEffect(() => {
    const el = ref.current; if (!el) return undefined;
    const ts = e => { const t = e.touches[0]; if (t && e.touches.length === 1) fns.current.start(t.clientX, t.clientY); };
    const tm = e => { const t = e.touches[0]; if (t) fns.current.move(t.clientX, t.clientY, e); };
    const te = () => fns.current.end();
    el.addEventListener("touchstart", ts, { passive: true });
    el.addEventListener("touchmove", tm, { passive: false });
    el.addEventListener("touchend", te); el.addEventListener("touchcancel", te);
    return () => { el.removeEventListener("touchstart", ts); el.removeEventListener("touchmove", tm); el.removeEventListener("touchend", te); el.removeEventListener("touchcancel", te); };
  }, []);
  const mouse = e => e.pointerType === "mouse";
  return {
    pull, busy, dragging, rev: Math.min(1, pull / PULL_MAX),
    handlers: {
      onPointerDown: e => { if (mouse(e) && e.button === 0) start(e.clientX, e.clientY); },
      onPointerMove: e => { if (mouse(e)) move(e.clientX, e.clientY, e); },
      onPointerUp: e => { if (mouse(e)) end(); },
      onPointerCancel: e => { if (mouse(e)) end(); },
    },
  };
}
// Il contagiri di "tira giù per aggiornare": la lancetta sale con la tirata (rev da 0 a 1), l'ultimo tratto è rosso.
function PullGauge({ rev, busy, pull }) {
  const ang = -120 + 240 * rev, red = rev >= 1;
  const arc = (a0, a1) => { const p = a => [24 + 18 * Math.sin(a * Math.PI / 180), 26 - 18 * Math.cos(a * Math.PI / 180)]; const [x0, y0] = p(a0), [x1, y1] = p(a1); return `M${x0.toFixed(2)} ${y0.toFixed(2)}A18 18 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`; };
  return (
    <div data-rev={rev.toFixed(2)} role="status" aria-live="polite" style={{ position: "absolute", left: 0, right: 0, top: 0, height: Math.max(pull, 56), display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 2, paddingBottom: 4, pointerEvents: "none", opacity: busy ? 1 : Math.min(1, .35 + rev) }}>
      <svg viewBox="0 0 48 44" width="52" height="48" aria-hidden="true" className={busy ? "gauge-busy" : undefined}>
        <path d={arc(-120, 72)} fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="4" strokeLinecap="round" />
        <path d={arc(72, 120)} fill="none" stroke={C.red} strokeWidth="4" strokeLinecap="round" />
        {[-120, -72, -24, 24, 72, 120].map(a => <line key={a} x1="24" y1="11" x2="24" y2="14" stroke="rgba(255,255,255,.4)" strokeWidth="1.4" transform={`rotate(${a} 24 26)`} />)}
        <g style={{ transform: `rotate(${ang}deg)`, transformOrigin: "24px 26px" }}><line x1="24" y1="26" x2="24" y2="11" stroke={red ? C.red : C.text} strokeWidth="2.4" strokeLinecap="round" /></g>
        <circle cx="24" cy="26" r="3" fill={C.text} />
      </svg>
      <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 10.5, letterSpacing: .8, color: red || busy ? C.text : C.dim }}>{busy ? "Aggiornamento…" : red ? "Rilascia per aggiornare" : "Tira per aggiornare"}</span>
    </div>
  );
}

// Riga di una notizia dell'elenco che si trascina (G11): a destra si salva (la pistola pneumatica avvita il dado), a
// sinistra si nasconde (il fumo del bloccaggio). La riga segue il dito (solo transform); lo swipe vale come dice
// classifySwipe; se il dito va in verticale la pagina scorre come sempre (touch-action: pan-y). Dopo un trascinamento
// il tocco non apre la notizia. data-swipe-own: da qui non parte lo swipe tra le schede (G29).
function SwipeRow({ id, onSave, onHide, children }) {
  const ref = useRef(null);
  const st = useRef(null);          // { x, y, t, pid, h } del dito giù (h: orizzontale sì/no, deciso dopo 8 px)
  const dragged = useRef(false);
  const timers = useRef([]);
  const [dx, setDx] = useState(0);
  const [effect, setEffect] = useState(null);   // "gun" | "smoke"
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));
  const down = e => { if (effect || (e.button != null && e.button > 0)) return; st.current = { x: e.clientX, y: e.clientY, t: e.timeStamp, pid: e.pointerId, h: null }; dragged.current = false; };
  const move = e => {
    const s = st.current; if (!s) return;
    const ddx = e.clientX - s.x, ddy = e.clientY - s.y;
    if (s.h == null && (Math.abs(ddx) > 8 || Math.abs(ddy) > 8)) {
      s.h = Math.abs(ddy) < Math.abs(ddx) * SWIPE.ratio;
      if (s.h) { try { ref.current.setPointerCapture(s.pid); } catch (err) {} }
    }
    if (s.h) { dragged.current = true; setDx(ddx); }
    else if (s.h === false) { st.current = null; }
  };
  const up = e => {
    const s = st.current; st.current = null; setDx(0);
    if (!s || !s.h) return;
    const width = (ref.current && ref.current.offsetWidth) || 360;
    const dir = classifySwipe({ dx: e.clientX - s.x, dy: e.clientY - s.y, dt: e.timeStamp - s.t, width });
    if (dir === "right") { setEffect("gun"); fx.play("clack"); fx.buzz("medium"); if (onSave) onSave(id); later(() => setEffect(null), 950); }
    else if (dir === "left") { setEffect("smoke"); fx.buzz("light"); later(() => { if (onHide) onHide(id); }, 700); }
  };
  const cancel = () => { st.current = null; setDx(0); };
  return (
    <div ref={ref} data-news-row={id} data-swipe-own="" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel}
      onClickCapture={e => { if (dragged.current) { e.stopPropagation(); e.preventDefault(); dragged.current = false; } }}
      style={{ position: "relative", touchAction: "pan-y" }}>
      {dx !== 0 && (
        <div aria-hidden="true" style={{ position: "absolute", inset: "0 16px 12px", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: dx > 0 ? "flex-start" : "flex-end", padding: "0 18px", background: dx > 0 ? "rgba(231,179,76,.12)" : "rgba(255,255,255,.05)", gap: 8 }}>
          <Icon name={dx > 0 ? "bookmark" : "close"} size={16} color={dx > 0 ? C.gold : C.muted} />
          <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 11, letterSpacing: 1, color: dx > 0 ? C.gold : C.muted }}>{dx > 0 ? "SALVA" : "NASCONDI"}</span>
        </div>
      )}
      <div className={effect === "smoke" ? "row-out" : undefined} style={{ position: "relative", transform: dx ? `translateX(${dx}px)` : undefined }}>{children}</div>
      {effect === "gun" && (
        <div data-swipe-fx="gun" aria-hidden="true" className="fx-gun" style={{ position: "absolute", left: 22, top: "50%", marginTop: -22, display: "flex", alignItems: "center", gap: 6, pointerEvents: "none", zIndex: 3 }}>
          <svg viewBox="0 0 60 44" width="60" height="44">
            <path d="M2 14h26l6 4v8l-6 4H2z" fill="#2E2E36" stroke="#55555F" strokeWidth="1.2" />
            <rect x="8" y="30" width="9" height="13" rx="2" fill="#2E2E36" stroke="#55555F" strokeWidth="1.2" />
            <rect x="34" y="19" width="8" height="6" rx="1" fill="#77777F" />
            <g className="nut-spin" style={{ transformOrigin: "50px 22px" }}><path d="M50 14l7 4v8l-7 4-7-4v-8z" fill={C.gold} stroke="#8A6A20" strokeWidth="1" /><circle cx="50" cy="22" r="2.6" fill="#2E2E36" /></g>
          </svg>
          <span style={{ padding: "3px 8px", borderRadius: 6, background: "rgba(231,179,76,.92)", fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 11, color: "#15120A", letterSpacing: .5 }}>SALVATA</span>
        </div>
      )}
      {effect === "smoke" && (
        <div data-swipe-fx="smoke" aria-hidden="true" style={{ position: "absolute", inset: "0 16px 12px", pointerEvents: "none", zIndex: 3 }}>
          {[[14, 60, 0], [32, 40, 60], [52, 64, 120], [70, 38, 40], [86, 58, 160]].map(([x, y, d], i) => (
            <span key={i} className="smoke-puff" style={{ position: "absolute", left: x + "%", top: y + "%", width: 54, height: 54, marginLeft: -27, marginTop: -27, borderRadius: "50%", background: "radial-gradient(circle, rgba(200,200,206,.55), rgba(200,200,206,0) 70%)", animationDelay: d + "ms" }} />
          ))}
        </div>
      )}
    </div>
  );
}

// Monoposto vista dall'alto, col muso a destra (disegno nostro), nel colore dei tasti.
function TopCar({ w = 38 }) {
  return (
    <svg viewBox="0 0 48 20" width={w} height={w * 20 / 48} aria-hidden="true">
      <rect x="1" y="3" width="5" height="14" rx="1.5" fill={C.accent} />
      <rect x="7" y="1" width="8" height="5" rx="2" fill="#1A1A1E" /><rect x="7" y="14" width="8" height="5" rx="2" fill="#1A1A1E" />
      <rect x="31" y="1" width="7" height="5" rx="2" fill="#1A1A1E" /><rect x="31" y="14" width="7" height="5" rx="2" fill="#1A1A1E" />
      <path d="M5 8.5h10l4-2.5h10l6 2.5h7l4 1.5-4 1.5h-7l-6 2.5H19l-4-2.5H5z" fill={C.accent} />
      <ellipse cx="22" cy="10" rx="3.2" ry="2" fill="#0B0B0E" />
      <rect x="44" y="5" width="3" height="10" rx="1" fill={C.accent} />
    </svg>
  );
}

// Selettore "Pit Lane" (G10) sopra i filtri: la corsia dei box con Tutte, Scuderie, Piloti, Tecnica; la monoposto
// scivola sulla voce scelta (solo transform), con il suono della cambiata.
function PitLane({ value, onChange }) {
  const i = Math.max(0, LANES.findIndex(l => l.id === value));
  return (
    <div data-pit-lane="" role="group" aria-label="Pit Lane: argomento delle notizie" style={{ position: "relative", margin: "0 16px 10px", padding: "6px 6px 4px", borderRadius: 14, background: "#0B0B0E", border: `1px solid ${C.border}`, overflow: "hidden" }}>
      <span aria-hidden="true" style={{ position: "absolute", left: 12, right: 12, top: 17, borderTop: "2px dashed rgba(255,255,255,.13)" }} />
      <span aria-hidden="true" style={{ position: "absolute", left: 6, top: 5, fontFamily: F_HEAD, fontWeight: 800, fontSize: 8, letterSpacing: 1, color: C.dim }}>PIT LANE</span>
      <span data-lane-car={LANES[i].id} className="lane-car" aria-hidden="true" style={{ position: "absolute", top: 8, left: 6, width: "calc((100% - 12px) / 4)", display: "flex", justifyContent: "center", transform: `translateX(${i * 100}%)` }}><TopCar w={34} /></span>
      <div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", marginTop: 22 }}>
        {LANES.map(l => {
          const on = l.id === value;
          return <button key={l.id} className="press" data-lane={l.id} aria-pressed={on ? "true" : "false"} onClick={() => onChange(l.id)} style={{ padding: "7px 0 6px", fontFamily: F_HEAD, fontWeight: 800, fontSize: 12, color: on ? C.text : C.dim, letterSpacing: .3 }}>{l.label}</button>;
        })}
      </div>
    </div>
  );
}

// Filtri a forma di gomma (G09): Soft = ultim'ora, Medium = generali, Hard = approfondimenti, Intermedia = meteo.
// Toccata, la gomma ruota e lascia l'impronta del battistrada; toccata di nuovo si toglie.
function TyreFilter({ value, onChange }) {
  return (
    <div data-tyres="" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, margin: "0 16px 10px" }}>
      {TYRES.map(t => {
        const on = value === t.id;
        return (
          <button key={t.id} className="press" data-tyre={t.id} data-tyre-on={on ? "1" : undefined} aria-pressed={on ? "true" : "false"} aria-label={`Gomma ${t.name}: ${t.label.toLowerCase()}`} onClick={() => onChange(on ? null : t.id)}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "7px 0 6px", borderRadius: 12, background: on ? alpha(t.color, .1) : "rgba(255,255,255,.03)", border: `1px solid ${on ? alpha(t.color, .55) : C.border}` }}>
            <svg key={on ? "on" : "off"} className={on ? "tyre-spin" : undefined} viewBox="0 0 40 40" width="32" height="32" aria-hidden="true">
              <circle cx="20" cy="20" r="18.5" fill="#141418" stroke="#2C2C33" strokeWidth="1.5" />
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(k => <rect key={k} x="19" y="1.6" width="2" height="3.4" rx="1" fill="#2C2C33" transform={`rotate(${k * 30} 20 20)`} />)}
              <circle cx="20" cy="20" r="12.5" fill="none" stroke={t.color} strokeWidth="2.6" strokeDasharray="14 5.6" />
              <circle cx="20" cy="20" r="8" fill="#24242A" stroke="#3A3A42" strokeWidth="1" />
              <circle cx="20" cy="20" r="2.4" fill="#5A5A64" />
            </svg>
            <span style={{ height: 5, display: "flex", alignItems: "center" }}>
              {on && <svg data-tyre-print="" className="tyre-print" viewBox="0 0 36 5" width="36" height="5" aria-hidden="true"><path d="M1 4.5l2.5-4 2.5 4M7 4.5l2.5-4 2.5 4M13 4.5l2.5-4 2.5 4M19 4.5l2.5-4 2.5 4M25 4.5l2.5-4 2.5 4M31 4.5l2.5-4 2.5 4" fill="none" stroke={alpha(t.color, .7)} strokeWidth="1.3" /></svg>}
            </span>
            <span style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 9.5, color: on ? C.text : C.muted, whiteSpace: "nowrap" }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function HomeScreen({ ig, onOpenIg, highlights = [], articles, tagFilter, onTag, onClearTag, onOpenArticle, isPremium, onPremium, onToast, onLiveTrack, onGoFanta, saved = [], onToggleSave, savedOnly = false, setSavedOnly, onOpenCircuit, homePoll = null, homeVote = null, onVote, hidden = [], onHide, onUnhideAll, onSwipeSave, onRefresh }) {
  const [q, setQ] = useState("");
  const homeRef = useRef(null);
  const pullRev = usePullRefresh(homeRef, onRefresh);
  const [tyre, setTyre] = useState(null);     // filtro a gomma (G09): soft | medium | hard | inter
  const [lane, setLane] = useState("all");    // Pit Lane (G10): all | teams | drivers | tech
  const published = articles.filter(a => a.published !== false);
  const visible = published.filter(a => !hidden.includes(a.id));   // notizie nascoste con lo swipe (G11)
  const hiddenCount = published.length - visible.length;
  const byTag = tagFilter ? visible.filter(a => articleTags(a).some(t => t.key === tagFilter.key)) : visible;
  const bySaved = savedOnly ? byTag.filter(a => saved.includes(a.id)) : byTag;
  const byPit = filterNews(bySaved, { tyre, lane, now: nowMs() });
  const nq = normText(q.trim());
  // "#soggetto" (18/10): le notizie con quell'hashtag (pilota, scuderia, circuito) e quelle che lo nominano nel testo,
  // anche senza spazi ("#redbull" trova "Red Bull").
  const hq = nq.startsWith("#") ? nq.slice(1).replace(/\s+/g, "") : null;
  const hashHit = a => articleTags(a).some(t => normText(t.label).replace(/^#/, "").startsWith(hq)) || articleText(a).replace(/\s+/g, "").includes(hq);
  const matches = !nq ? byPit : hq != null ? (hq ? byPit.filter(hashHit) : byPit) : byPit.filter(a => articleText(a).includes(nq));
  const pitOn = !!tyre || lane !== "all";
  // Anche i circuiti si cercano: per nome, città, paese, GP o hashtag (#Monza).
  const cq = nq.replace(/^#/, "");
  const circuitHits = cq.length >= 3 && !savedOnly ? CIRCUIT_IDS.filter(id => CIRCUIT_INFO[id] && circuitText(id).includes(cq)) : [];
  const listMode = !!(tagFilter || nq || savedOnly || pitOn);   // ricerca o filtri: elenco semplice, senza articolo in evidenza
  // In grande sempre la notizia più recente; sotto le altre, dalla più nuova alla più vecchia.
  const sorted = BtLogic.newestFirst(matches);
  const featured = listMode ? null : sorted[0] || null;
  const featuredImg = useImageSrc(featured ? featured.image : "");   // finché la foto non arriva, il riquadro B&T
  const rest = listMode ? sorted : sorted.slice(1);
  const ARCHIVE = [
    { name: "GP d'Australia 2025", winner: "L. Norris" },
    { name: "GP di Cina 2025", winner: "O. Piastri" },
    { name: "GP del Giappone 2025", winner: "M. Verstappen" },
    { name: "GP del Bahrain 2025", winner: "O. Piastri" },
  ];
  return (
    <div ref={homeRef} data-home="" className="scrollcol" {...pullRev.handlers} style={{ height: "100%", position: "relative", overscrollBehaviorY: "contain", userSelect: pullRev.dragging ? "none" : undefined, WebkitUserSelect: pullRev.dragging ? "none" : undefined }}>
      {(pullRev.pull > 0 || pullRev.busy) && <PullGauge rev={pullRev.rev} busy={pullRev.busy} pull={pullRev.pull} />}
      <div style={{ transform: pullRev.pull ? `translateY(${pullRev.pull}px)` : undefined, transition: pullRev.dragging ? "none" : "transform .25s ease" }}>

      {/* 24/10: tolto il riquadro finto "ADV · Spazio pubblicitario": nell'APK c'è il banner vero di AdMob in fondo
          (src/services/ads.js), nel sito niente pubblicità. */}
      <SectionLabel icon="flag">ULTIME NEWS</SectionLabel>

      <div style={{ margin: "0 16px 10px" }}>
        <label htmlFor="newsSearch" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}>Cerca articoli</label>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 14px", borderRadius: 14, background: C.card, border: `1px solid ${C.border}` }}>
          <Icon name="search" size={15} color={C.dim} />
          <input id="newsSearch" type="search" placeholder="Cerca articoli, piloti, scuderie…" value={q} onChange={e => setQ(e.target.value)} style={{ flex: 1, minWidth: 0, border: "none", background: "none", outline: "none", fontFamily: F_BODY, fontSize: 13, color: C.text }} />
        </div>
      </div>
      <PitLane value={lane} onChange={v => { if (v === lane) return; setLane(v); fx.play("shift"); fx.buzz("light"); }} />
      <TyreFilter value={tyre} onChange={v => { setTyre(v); fx.play("tick"); fx.buzz("select"); }} />
      <div style={{ display: "flex", gap: 8, margin: "0 16px 14px" }}>
        <button className="press" aria-pressed={savedOnly ? "true" : "false"} onClick={() => setSavedOnly && setSavedOnly(!savedOnly)} style={aChip(savedOnly, C.gold)}><Icon name={savedOnly ? "bookmark-fill" : "bookmark"} size={12} color={savedOnly ? C.gold : C.muted} /> Salvati{saved.length ? ` · ${saved.length}` : ""}</button>
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
      {matches.length === 0 && pitOn && !nq && !savedOnly && !tagFilter && (
        <p data-pit-empty="" style={{ margin: "0 16px 16px", fontFamily: F_BODY, fontSize: 12.5, color: C.dim, lineHeight: 1.55 }}>Nessuna notizia per questa scelta. Tocca di nuovo la gomma per toglierla, o scegli "Tutte" nella corsia.</p>
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
          <div style={{ minHeight: featuredImg ? 0 : 170, position: "relative", background: featuredImg ? "#111" : `linear-gradient(155deg,${shade(C.accent, .25)} 0%,#0f0f12 65%)` }}>
            {featuredImg && <img data-news-img="" src={featuredImg} alt="" style={{ display: "block", width: "100%", height: "auto", maxHeight: 440, objectFit: "contain", background: "#111" }} />}
            <span style={{ position: "absolute", top: 14, left: 14, padding: "5px 11px", borderRadius: 7, background: C.accent, fontFamily: F_HEAD, fontWeight: 800, fontSize: 10, letterSpacing: 1, color: "#fff" }}>{featured.cat}</span>
            {!featuredImg && (
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
        <SwipeRow key={a.id} id={a.id} onSave={onSwipeSave} onHide={onHide}>
        <SaveBtn a={a} saved={saved.includes(a.id)} onToggle={onToggleSave} style={{ top: 8, right: 24 }} />
        <button className="press" data-news-item={a.id} data-age={String(BtLogic.newsAge(a))} onClick={() => onOpenArticle(a.id)} style={{ display: "flex", textAlign: "left", width: "calc(100% - 32px)", margin: "0 16px 12px", borderRadius: 16, overflow: "hidden", background: C.card, border: `1px solid ${C.border}` }}>
          <div style={{ width: 92, minHeight: 92, flexShrink: 0, position: "relative", background: a.image ? "#111" : "linear-gradient(155deg,#1a1a2e 0%,#0f0f12 70%)" }}>
            {a.image && <StoredImg data-news-img="" src={a.image} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />}
            <span style={{ position: "absolute", top: 8, left: 8, padding: "3px 8px", borderRadius: 6, background: a.premium ? "rgba(231,179,76,.2)" : "rgba(255,255,255,.12)", fontFamily: F_HEAD, fontWeight: 800, fontSize: 8, letterSpacing: .8, color: a.premium ? C.gold : "#fff" }}>{a.cat}</span>
          </div>
          <div style={{ flex: 1, padding: "12px 52px 12px 14px", display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0 }}>
            <h3 style={{ fontFamily: F_HEAD, fontWeight: 700, fontSize: 14, color: C.text, lineHeight: 1.3, margin: "0 0 6px" }}>{a.title}</h3>
            {articleTags(a).length > 0 && <div style={{ marginBottom: 6 }}><HashtagChips tags={articleTags(a)} onTag={onTag} size="sm" /></div>}
            <span style={{ fontFamily: F_BODY, fontSize: 11, color: C.dim }}>{a.time}</span>
          </div>
        </button>
        </SwipeRow>
      ))}
      {hiddenCount > 0 && (
        <p data-hidden-footer="" style={{ margin: "0 16px 18px", fontFamily: F_BODY, fontSize: 12, color: C.dim, textAlign: "center" }}>
          Notizie nascoste: {hiddenCount} · <button className="press" onClick={() => onUnhideAll && onUnhideAll()} style={{ display: "inline", fontFamily: F_BODY, fontWeight: 700, fontSize: 12, color: C.accentInk, textDecoration: "underline" }}>Mostra</button>
        </p>
      )}

      <SectionLabel icon="star">CONTENUTI PREMIUM</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 16px 20px" }}>
        {homePoll && <PollCard poll={homePoll} vote={homeVote} onVote={onVote} title="SONDAGGIO DELLA REDAZIONE" />}

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
    </div>
  );
}

function ArticleScreen({ article, onBack, isPremium, onPremium, onTag, saved = false, onToggleSave, onShare, vote = null, onVote }) {
  const [zoomed, setZoomed] = useState(false);   // foto a tutto schermo, con lo zoom
  useBack(zoomed, () => setZoomed(false));
  const photo = useImageSrc(article.image);       // foto salvata su Firebase (fsimg:) o link: finché non arriva, il riquadro B&T
  const locked = article.premium && !isPremium;
  const tags = articleTags(article);
  const round = { width: 38, height: 38, borderRadius: "50%", background: C.card, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
  // Barra ERS (G12): si riempie mentre si legge (quanto si è scesi nella pagina); si misura al massimo una volta per
  // fotogramma, solo quando si scorre.
  const scRef = useRef(null), ersRaf = useRef(0);
  const [ers, setErs] = useState(0);
  const measureErs = () => { const el = scRef.current; if (!el) return; const max = el.scrollHeight - el.clientHeight; const v = max <= 2 ? 100 : Math.round(Math.min(1, Math.max(0, el.scrollTop / max)) * 100); setErs(x => (x === v ? x : v)); };
  const onScroll = () => { if (ersRaf.current) return; ersRaf.current = requestAnimationFrame(() => { ersRaf.current = 0; measureErs(); }); };
  useEffect(() => { measureErs(); const t = setTimeout(measureErs, 450); return () => { clearTimeout(t); cancelAnimationFrame(ersRaf.current); ersRaf.current = 0; }; }, [article.id, photo, locked]);
  return (
    <div ref={scRef} onScroll={onScroll} className="scrollcol" style={{ height: "100%" }}>
      <SubHeader title="ARTICOLO" onBack={onBack} right={
        <div style={{ display: "flex", gap: 8 }}>
          <button className="press" aria-label="Condividi articolo" onClick={onShare} style={round}><Icon name="share" size={16} /></button>
          <button className="press" aria-label={saved ? "Togli dai preferiti" : "Salva tra i preferiti"} onClick={onToggleSave} style={round}>
            <Icon name={saved ? "bookmark-fill" : "bookmark"} size={16} color={saved ? C.gold : C.text} />
          </button>
        </div>} />
      <div data-ers={ers} role="progressbar" aria-label="ERS: quanto hai letto dell'articolo" aria-valuemin={0} aria-valuemax={100} aria-valuenow={ers}
        style={{ position: "sticky", top: 0, zIndex: 5, display: "flex", alignItems: "center", gap: 10, padding: "8px 20px", marginBottom: 12, background: "rgba(0,0,0,.92)", borderBottom: `1px solid ${C.border}` }}>
        <span style={{ minWidth: 76, fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 11, letterSpacing: .6, color: ers >= 100 ? C.green : C.muted, whiteSpace: "nowrap" }}>ERS: {ers}%</span>
        <span style={{ position: "relative", flex: 1, height: 8, borderRadius: 4, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
          <span style={{ position: "absolute", inset: 0, transformOrigin: "0 50%", transform: `scaleX(${ers / 100})`, background: `linear-gradient(90deg, #4C8DFF, ${C.green})`, transition: "transform .12s linear" }} />
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(k => <span key={k} style={{ position: "absolute", top: 0, bottom: 0, left: `${k * 10}%`, width: 2, background: "rgba(0,0,0,.55)" }} />)}
        </span>
      </div>
      <div style={{ padding: "0 20px 28px" }}>
        <span style={{ display: "inline-block", padding: "5px 11px", borderRadius: 7, background: C.accent, fontFamily: F_HEAD, fontWeight: 800, fontSize: 10, letterSpacing: 1, color: "#fff", marginBottom: 12 }}>{article.cat}</span>
        <h1 style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 22, color: C.text, lineHeight: 1.25, margin: "0 0 8px" }}>{article.title}</h1>
        <span style={{ fontFamily: F_BODY, fontSize: 11, color: C.dim }}>{article.author ? article.author + " · " : ""}{article.time}</span>
        {tags.length > 0 && <div style={{ marginTop: 12 }}><HashtagChips tags={tags} onTag={onTag} /></div>}
        {photo
          ? <button className="press" data-article-zoom="" aria-label="Apri la foto a tutto schermo" onClick={() => setZoomed(true)} style={{ position: "relative", display: "block", width: "100%", margin: "16px 0", padding: 0, borderRadius: 16, cursor: "zoom-in" }}>
              <img data-article-img="" src={photo} alt="" style={{ display: "block", width: "100%", height: "auto", maxHeight: 560, objectFit: "contain", borderRadius: 16, background: "#111" }} />
              <span aria-hidden="true" style={{ position: "absolute", right: 10, bottom: 10, display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 9px", borderRadius: 999, background: "rgba(0,0,0,.6)", fontFamily: F_BODY, fontWeight: 700, fontSize: 11, color: "#fff" }}><Icon name="search" size={12} color="#fff" /> Tocca per ingrandire</span>
            </button>
          : (
            <div style={{ height: 160, borderRadius: 16, margin: "16px 0", background: `linear-gradient(155deg,${shade(C.accent, .25)} 0%,#0f0f12 70%)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
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
      {zoomed && photo && <ImageViewer src={photo} onClose={() => setZoomed(false)} />}
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
  useEffect(() => { fx.play("radio"); fx.buzz("light"); }, []);   // Team Radio (G13): il bip all'apertura
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
  const SENT = "Radio Check: notizia inviata";
  const other = () => shareNative({ title: article.title, text: msg, url: SHARE_URL }).then(r => { if (r === "ok") { onToast(SENT); onClose(); } else if (r === "fail") setManual(full); });
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
        <div data-team-radio="" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", marginBottom: 12, borderRadius: 12, background: C.accent }}>
          <span style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 12.5, letterSpacing: 1, color: C.onAccent }}>TEAM RADIO</span>
          <span data-radio-wave="" className="radio-wave" aria-hidden="true" style={{ display: "flex", alignItems: "center", gap: 3, height: 18 }}>
            {[9, 15, 18, 12, 16, 8, 13].map((h, i) => <i key={i} style={{ display: "block", width: 3, height: h, borderRadius: 2, background: C.onAccent, animationDelay: `${i * 90}ms` }} />)}
          </span>
          <span style={{ marginLeft: "auto", fontFamily: F_HEAD, fontWeight: 800, fontSize: 10.5, letterSpacing: 1, color: C.onAccent, opacity: .85 }}>IN ONDA</span>
        </div>
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
            {saving ? <ShiftLight label="Salvataggio in corso" /> : <><Icon name="download" size={16} color="#fff" />SCARICA IMMAGINE</>}
          </button>
        )}
        <Eyebrow>INVIA A</Eyebrow>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div style={{ gridColumn: "1 / -1" }}><ShareChatBtn k={{ t: "news", id: article.id, ti: article.title, su: article.excerpt || "" }} label="Chat B&T" /></div>
          {shareTargets(article, handle).map(t => (
            <a key={t.id} className="press" href={t.href} target="_blank" rel="noopener noreferrer" onClick={() => { onToast(SENT); setTimeout(onClose, 0); }} style={pill}>{t.label}<Icon name="external" size={13} color={C.dim} /></a>
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
const SECTOR_COLORS = [LED_RED, "#27D8C8", "#F2C230"];   // S1, S2, S3 sulla mappa (confini stimati)
const fmtGap = g => (g == null ? "–" : "+" + g.toFixed(3));

/* ── CIRCUITI: disegno di sfondo, mappa coi settori e scheda "Mostra di più" ── */
// Disegno del circuito: tracciato luminoso sui colori del paese (nessuna foto, nessun problema di diritti).
function CircuitArt({ circuitId, uid = "a" }) {
  const tr = trackOf(circuitId), info = CIRCUIT_INFO[circuitId];
  const [c1, c2] = info ? info.colors : [C.accentInk, C.gold];
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
  const [openQ, setOpenQ] = useState(null);  if (!info || !circ) return <div style={{ padding: 24 }}><SubHeader title="Circuito" onBack={onBack} /></div>;
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
      <SubHeader title={race ? race.name : circ.name} onBack={onBack} right={race ? <ShareChatBtn round k={{ t: "race", id: circuitId, ti: race.name, su: [circ.name, status].filter(Boolean).join(" · ") }} /> : null} />
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
                  <span style={{ flex: 1, fontFamily: F_HEAD, fontWeight: 800, fontSize: 13.5, color: s.key === "RACE" ? C.accentInk : C.text }}>{LiveSim.SESSION_LABEL[s.key] || s.key}</span>
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
            <StoredBg as="span" src={a.image} fit="contain" empty="linear-gradient(155deg,#1a1a2e 0%,#0f0f12 70%)" style={{ width: 54, height: 54, flexShrink: 0, borderRadius: 10 }} />
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
// source "openf1": la sessione finita, rivista con i dati veri di OpenF1 (parte dalla fine; si può rivedere dall'inizio).
// source "demo": la "Prova diretta" del Pannello Admin (simulata, solo sul telefono dell'admin), con la scritta DEMO.
function LiveCard({ race, st, track, source, onExpand, replay }) {
  const demo = source === "demo", of1 = source === "openf1";
  const lastMsg = st.messages[st.messages.length - 1];
  const rbtn = { padding: "7px 11px", borderRadius: 9, background: "rgba(255,255,255,.07)", border: `1px solid ${C.border}`, fontFamily: F_HEAD, fontWeight: 800, fontSize: 11.5, color: C.text, whiteSpace: "nowrap" };
  return (
    <div data-live-card="" data-live-source={source} style={{ margin: "4px 16px 14px", padding: "14px 14px 12px", borderRadius: 18, background: C.card, border: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: of1 ? C.gold : C.accentInk }} />
        <span style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 11, color: of1 ? C.gold : C.accentInk, letterSpacing: 1.2 }}>{of1 ? "SESSIONE RIVISTA" : "IN DIRETTA"} · {sessionName(st.type)}</span>
        {demo && <span data-demo="" title="Prova diretta: sessione simulata, la vedi solo tu" style={{ padding: "2px 7px", borderRadius: 6, background: C.gold, fontFamily: F_HEAD, fontWeight: 900, fontSize: 10, letterSpacing: .8, color: "#141414" }}>DEMO</span>}
        <div style={{ flexGrow: 1 }} />
        <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 13, color: C.text, fontVariantNumeric: "tabular-nums" }}>{liveCounter(st)}</span>
      </div>
      <h1 style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 20, color: C.text, margin: "0 0 2px" }}>{race.name}</h1>
      <span style={{ fontFamily: F_BODY, fontSize: 12, color: C.muted }}>{race.circuit}{demo ? " · sessione simulata, la vedi solo tu" : of1 ? " · " + OF1_SRC : ""}</span>
      <FlagBanner st={st} style={{ marginTop: 10 }} />
      <div data-live-card-map="" style={{ position: "relative", marginTop: 8, borderRadius: 12, background: "#0D0D10", padding: "6px 4px" }}>
        <LiveMap track={track} st={st} />
        <Watermark style={{ left: 10, right: "auto", bottom: 8 }} />
        <button className="press" onClick={onExpand} style={{ position: "absolute", top: 6, right: 6, padding: "6px 10px", borderRadius: 8, background: "rgba(24,24,28,.9)", border: `1px solid ${C.border}`, fontFamily: F_BODY, fontWeight: 700, fontSize: 11, color: C.text }}>Ingrandisci</button>
      </div>
      {of1 && replay && (
        <div data-replay-bar="" style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
          <button className="press" data-replay="play" onClick={replay.onPlay} style={rbtn}><span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name={replay.playing ? "rotate" : "media-play"} size={12} sw={2.4} />{replay.playing ? "Di nuovo dall'inizio" : "Rivedi dall'inizio"}</span></button>
          <button className="press" data-replay="x10" aria-label={`Velocità ×${replay.speed}: tocca per cambiarla`} onClick={replay.onSpeed} style={rbtn}>×{replay.speed}</button>
          <button className="press" data-replay="fine" onClick={replay.onEnd} style={{ ...rbtn, marginLeft: "auto" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>Fine<Icon name="media-skip" size={12} sw={2.4} /></span></button>
        </div>
      )}
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
const DNF_COLORS = { ink: "#F4F2EF", smoke: "#9C9CA6", fire: "#FF7A1A", flame: "#FFD23F", red: LED_RED };
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
      style={{ ...place, display: "flex", alignItems: "center", gap: 10, padding: "8px 10px 8px 8px", borderRadius: 16, background: "linear-gradient(100deg, #2A0A0D 0%, #3A0C10 60%, #4A1015 100%)", boxShadow: "0 14px 30px -12px rgba(0,0,0,.8), inset 0 0 0 1px rgba(255,24,1,.45)" }}>
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
              <span style={{ fontWeight: 700, color: secColor(sec), opacity: cur ? 1 : .6, fontVariantNumeric: "tabular-nums" }}>{sec && sec.t != null ? sec.t.toFixed(compact ? 2 : 3) : "–"}</span>
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
// Distacco come nella tabella dei tempi (i = posto nell'ordine di st.cars); lo usa anche la Pit Board (G27).
const timingGap = (st, c, i) => c.dnf ? "RIT" : isRaceType(st.type) ? (i === 0 ? (st.finished ? "VINCITORE" : "LEADER") : c.lapsDown > 0 ? `+${c.lapsDown} ${c.lapsDown === 1 ? "GIRO" : "GIRI"}` : fmtGap(c.gap)) : (i === 0 ? (c.best ? "MIGLIOR TEMPO" : "–") : fmtGap(c.gap));
function TimingTable({ st, onTelemetry, onSelectDriver, onLapTimes }) {
  const race = isRaceType(st.type);
  const lapColor = rec => rec && rec.st === "purple" ? TIMING.purple : rec && rec.st === "green" ? TIMING.green : C.text;
  return (
    <div style={{ margin: "0 16px 16px", borderRadius: 18, background: C.card, border: `1px solid ${C.border}`, overflow: "hidden" }}>
      {st.cars.map((c, i) => {
        if (race && st.finished && c.pos <= 3) return null;   // i primi tre sono sul podio qui sopra
        const d = driverById(c.id);
        const main = race ? c.last : c.best ? { ...c.best, st: i === 0 ? "purple" : "none" } : null;
        const gap = timingGap(st, c, i);
        return (
          <div key={c.id} data-timing-row="" data-timing-pos={c.pos} data-timing-id={c.id} data-dnf={c.dnf ? c.dnf.cause : undefined} style={{ padding: "10px 12px 11px", borderBottom: i < st.cars.length - 1 ? `1px solid ${C.divider}` : "none", opacity: c.out ? .45 : 1, background: c.dnf ? "rgba(255,24,1,.05)" : "transparent" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 20, fontFamily: F_HEAD, fontWeight: 800, fontSize: 14, color: c.dnf ? C.dim : C.text, fontVariantNumeric: "tabular-nums" }}>{c.pos}</span>
              <button className="press" onClick={() => d && onSelectDriver(d)} style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1, textAlign: "left" }}>
                {d && <Headshot driver={d} size={30} />}
                <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 14, color: C.text }}>{c.code}</span>
                {c.pit && !c.out && <span style={{ padding: "1px 6px", borderRadius: 5, background: "rgba(76,141,255,.18)", fontFamily: F_HEAD, fontWeight: 800, fontSize: 9, color: TIMING.pit }}>BOX</span>}
                {c.out && <span style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 9.5, color: C.dim }}>ELIM. {c.outIn}</span>}
              </button>
              <span data-timing-gap="" style={{ fontFamily: F_BODY, fontWeight: c.dnf ? 800 : 600, fontSize: 11.5, color: c.dnf ? "#FF5A5F" : C.muted, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{gap}</span>
              {main ? (
                <button className="press" aria-label={`Tempi sul giro di ${c.code}`} onClick={() => onLapTimes ? onLapTimes(c.id) : onTelemetry(c.id, main.lapNo, 0)}
                  style={{ padding: "4px 7px", borderRadius: 7, background: "rgba(255,255,255,.05)", fontFamily: F_HEAD, fontWeight: 800, fontSize: 13, color: c.dnf ? C.dim : lapColor(main), fontVariantNumeric: "tabular-nums" }}>{LiveSim.fmtLap(main.time)}</button>
              ) : <span style={{ width: 62, textAlign: "right", fontFamily: F_HEAD, fontWeight: 800, fontSize: 13, color: C.dim }}>–</span>}
            </div>
            {c.dnf ? <DnfRow c={c} style={{ marginTop: 8, paddingLeft: 28 }} /> : <SectorCells c={c} onTelemetry={onTelemetry} style={{ marginTop: 8, paddingLeft: 28 }} />}
          </div>
        );
      })}
    </div>
  );
}

// Pit Board (G27): scorrendo i tempi l'intestazione diventa il tabellone del muretto con posizione, distacco e giro del
// pilota preferito (o del primo, senza preferito). Sta in cima alla pagina (sticky, alta 0) e appare solo con transform
// e opacità (R4).
function PitBoard({ st, driverId, visible }) {
  const i0 = st.cars.findIndex(c => c.id === driverId), i = i0 >= 0 ? i0 : 0, c = st.cars[i];
  if (!c) return null;
  const cell = (label, value, color, big) => (
    <span style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 0 }}>
      <span style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 8, letterSpacing: .8, color: "#77767D" }}>{label}</span>
      <span style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: big ? 20 : 15, lineHeight: 1.05, color, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </span>
  );
  return (
    <div data-pit-board={c.id} data-visible={visible ? "1" : "0"} aria-hidden={visible ? undefined : "true"} style={{ position: "sticky", top: 0, zIndex: 6, height: 0 }}>
      <div className="pit-board" role="status" aria-label={`Pit Board: ${c.code}, posizione ${c.pos}, ${timingGap(st, c, i)}, ${liveCounter(st)}`}
        style={{ margin: "0 16px", padding: "7px 12px 8px", borderRadius: "0 0 14px 14px", background: "linear-gradient(180deg, #121215, #070708)", border: "2px solid #2C2C33", borderTop: "none", boxShadow: "0 12px 26px rgba(0,0,0,.65)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
          transform: visible ? "translateY(0)" : "translateY(-115%)", opacity: visible ? 1 : 0, pointerEvents: visible ? "auto" : "none" }}>
        {cell("PILOTA", c.code, "#FFFFFF", true)}
        {cell("POS", "P" + c.pos, "#FFD23F", true)}
        {cell("DISTACCO", timingGap(st, c, i), "#FFFFFF")}
        {cell(isRaceType(st.type) ? "GIRO" : "SESSIONE", liveCounter(st), "#FFFFFF")}
      </div>
    </div>
  );
}

// Messaggi della direzione gara, dal più recente.
function RaceControlList({ messages }) {
  // Colori dei messaggi: quelli del simulatore in italiano, quelli veri di OpenF1 in inglese (come li scrive la FIA).
  const tone = m => /RITIRATO|SQUALIFICA|RETIRED|DISQUALIFIED/.test(m.text) ? "#FF5A5F" : /ROSSA|RED FLAG/.test(m.text) ? FLAG_UI.red.color : /GIALLA|SAFETY CAR|YELLOW/.test(m.text) ? FLAG_UI.yellow.color : /PENALITÀ|PENALTY/.test(m.text) ? "#FF8A1F"
    : /INVESTIGA|INCIDENTE|INCIDENT|NOTED/.test(m.text) ? "#FFB35C" : /DRS|BLU|BLUE/.test(m.text) ? TIMING.pit : /LIBERA|VERDE|RIPRESA|CLEAR|GREEN/.test(m.text) ? TIMING.green : C.dim;
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

// Icone del cielo (sole, luna, nuvole, pioggia), disegnate in SVG.
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
// L'esito del pronostico arriva dal meteo vero di OpenF1 della sessione, quando è finita (D09).
const WX_LATER = "Esito a fine sessione, con i dati veri.";
const WX_EMPTY = "Il meteo della sessione arriva con i dati veri a fine sessione.";
// Meteo di adesso della sessione che si vede: vero (OpenF1) nella sessione rivista, simulato nella prova DEMO; null senza
// sessione o se OpenF1 non ha il meteo.
function sessionWeather(live, st, race) {
  if (!live || !st) return null;
  if (isOf1Live(live)) return live.sim.weather();
  const w = race ? weekendWeather(race, st.t, live.raceId === race.id ? live.type : null) : null;
  return w ? w.current : null;
}

// Pronostico meteo di una sessione: si indovina se pioverà, +2 punti FantaF1 se giusto.
// Si cambia fino alla fine della sessione di due prima (FP2: fine FP1; FP1: fino all'inizio), mai durante una sessione.
function WeatherGuess({ s, guess, result, lock, onGuess }) {
  const [asking, setAsking] = useState(false);
  useBack(asking, () => setAsking(false));
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
  const later = guess ? <> {WX_LATER}</> : "";
  if (lock && lock.locked) return <p data-wx-state="locked" style={line}>Pronostico chiuso: si poteva fare {until}.{mine}{later}</p>;
  if (lock && lock.paused) return <p data-wx-state="paused" role="status" style={line}>In pausa: {sessionLabelIt(lock.liveKey).toLowerCase()} in corso. Potrai cambiarlo a fine sessione, {until}.{mine}{later}</p>;
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
      <p style={{ ...line, fontSize: 11, color: C.dim, margin: "4px 0 0" }}>{WX_LATER}</p>
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

// Meteo (D08-D10): i valori veri della sessione (OpenF1; nella prova DEMO quelli simulati) e il pronostico pioggia di ogni
// sessione del weekend, con l'esito dal meteo vero a fine sessione. Niente previsioni né radar inventati.
function WeatherPanel({ race, st, live, guesses = {}, results = {}, onGuess }) {
  const [sel, setSel] = useState(null);
  // Previsioni vere del weekend (MET Norway, src/services/meteo.js): solo se arrivano, niente numeri inventati.
  const [fc, setFc] = useState(null);
  const fcId = race ? race.circuitId : null;
  useEffect(() => {
    let alive = true;
    setFc(null);
    if (fcId) Meteo.forecast(fcId).then(v => { if (alive) setFc(v); }, () => {});
    return () => { alive = false; };
  }, [fcId]);
  if (!race) return null;
  const liveKey = live && live.raceId === race.id && !isOf1Live(live) ? live.type : null;   // la sessione rivista è già finita
  const w = weekendWeather(race, 0, liveKey);   // solo le sessioni del weekend e i loro orari
  const gk = k => race.id + ":" + k;
  const ended = Object.fromEntries(w.sessions.map(x => [x.key, !!results[gk(x.key)]]));
  const lockOf = x => BtLogic.wxLock({ sessions: w.sessions, idx: w.sessions.indexOf(x), now: nowMs(), ended, liveKey, hasResult: !!results[gk(x.key)] });
  const s = sel ? w.sessions.find(x => x.key === sel) : null;
  const now = sessionWeather(live, st, race), demo = isDemoLive(live);
  const tile = (label, value) => (
    <div style={{ padding: "10px 8px", borderRadius: 12, background: "rgba(255,255,255,.04)", textAlign: "center" }}>
      <div style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 16, color: C.text }}>{value}</div>
      <div style={{ fontFamily: F_BODY, fontWeight: 600, fontSize: 9.5, letterSpacing: .6, color: C.dim, marginTop: 2 }}>{label}</div>
    </div>
  );
  const num = (v, d = 0) => (v == null || !isFinite(v) ? "–" : Number(v).toFixed(d));
  return (
    <div style={{ margin: "0 16px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
      {now ? (
        <div data-wx-now="" style={{ padding: 14, borderRadius: 18, background: C.card, border: `1px solid ${C.border}` }}>
          <Eyebrow>{demo ? "ADESSO IN PISTA · DEMO" : "METEO DELLA SESSIONE · DATI OPENF1"}</Eyebrow>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
            {tile("ARIA", num(now.air, 1) + "°")}{tile("PISTA", num(now.track, 1) + "°")}{tile("UMIDITÀ", num(now.humidity) + "%")}{tile("VENTO", num(now.wind) + " km/h")}
          </div>
          <p style={{ margin: "8px 2px 0", fontFamily: F_BODY, fontSize: 11.5, color: C.muted }}>{now.rain ? "Pioggia sul circuito." : "Nessuna pioggia sul circuito."}</p>
        </div>
      ) : (
        <p data-wx-empty="" style={{ margin: 0, padding: 14, borderRadius: 18, background: C.card, border: `1px solid ${C.border}`, fontFamily: F_BODY, fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>{WX_EMPTY}</p>
      )}
      {(() => {
        const info = CIRCUIT_INFO[race.circuitId];
        const rows = fc && info ? sessionForecast(fc, info.weekend, nowMs()).filter(x => x.fc) : [];
        if (!rows.length) return null;
        return (
          <div data-wx-forecast="" style={{ padding: "12px 12px 10px", borderRadius: 18, background: C.card, border: `1px solid ${C.border}` }}>
            <Eyebrow>PREVISIONI DEL WEEKEND</Eyebrow>
            {rows.map(x => {
              const ses = w.sessions.find(s => s.key === x.key), f = x.fc, wet = f.rain != null && f.rain > 0;
              return (
                <div key={x.key} data-wx-fc={x.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 2px", borderTop: `1px solid ${C.divider}` }}>
                  <span style={{ width: 46, flexShrink: 0, fontFamily: F_HEAD, fontWeight: 800, fontSize: 11.5, color: C.text }}>{WX_SHORT[x.key] || x.key}</span>
                  <span style={{ flex: 1, minWidth: 0, fontFamily: F_BODY, fontSize: 11, color: C.dim, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ses ? (ses.day ? String(ses.day).split(" ").slice(0, 2).join(" ") + " · " : "") + ses.time : ""}</span>
                  <SkyIcon kind={skyOf(f.sym) || "cloud"} size={20} />
                  <span style={{ width: 36, textAlign: "right", fontFamily: F_HEAD, fontWeight: 800, fontSize: 13.5, color: C.text }}>{Math.round(f.temp)}°</span>
                  <span style={{ width: 82, textAlign: "right", fontFamily: F_BODY, fontSize: 11, color: wet ? TIMING.pit : C.muted }}>{f.rain == null ? "–" : wet ? `${String(f.rain).replace(".", ",")} mm${f.step === 6 ? " in 6 h" : ""}` : "Asciutto"}</span>
                </div>
              );
            })}
            <p style={{ margin: "8px 2px 0", fontFamily: F_BODY, fontSize: 10.5, color: C.dim, lineHeight: 1.45 }}>
              Previsioni: dati di <button className="press" onClick={() => openUrl(MET_LICENSE_URL)} style={{ padding: 0, fontFamily: F_BODY, fontSize: 10.5, color: C.muted, textDecoration: "underline" }}>MET Norway (CC BY 4.0)</button>, all'inizio di ogni sessione (ore locali del circuito).
            </p>
          </div>
        );
      })()}
      <div style={{ padding: "12px 10px 10px", borderRadius: 18, background: C.card, border: `1px solid ${C.border}` }}>
        <div style={{ padding: "0 4px" }}><Eyebrow>PRONOSTICO METEO DEL WEEKEND</Eyebrow></div>
        <div role="group" aria-label="Pronostico per sessione" style={{ display: "flex", gap: 6 }}>
          {w.sessions.map(x => {
            const on = sel === x.key, g = guesses[gk(x.key)], res = results[gk(x.key)];
            return (
              <button key={x.key} data-weather-box={x.key} className="press" aria-pressed={on} aria-label={`${x.label}${g ? ": pronostico " + WX_WORD(g) : ""}${res ? ", com'è andata: " + WX_WORD(res) : ""}`} onClick={() => setSel(on ? null : x.key)}
                style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "8px 2px 7px", borderRadius: 12, background: on ? "rgba(255,255,255,.13)" : "rgba(255,255,255,.05)", border: `1px solid ${on ? "rgba(255,255,255,.32)" : C.border}`, position: "relative" }}>
                <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 10.5, letterSpacing: .4, color: on ? C.text : C.muted }}>{WX_SHORT[x.key] || x.key}</span>
                {g ? <SkyIcon kind={g === "rain" ? "rain" : "sun"} size={18} mono bg={on ? "#37373B" : "#232327"} /> : <span aria-hidden="true" style={{ height: 18, fontFamily: F_HEAD, fontWeight: 800, fontSize: 13, color: C.dim }}>?</span>}
                {(g || res) && <span aria-hidden="true" style={{ position: "absolute", top: 5, right: 5, width: 6, height: 6, borderRadius: "50%", background: res ? (g === res ? TIMING.green : C.dim) : C.gold }} />}
              </button>
            );
          })}
        </div>
        {s ? (
          <div style={{ marginTop: 10, padding: "12px 12px", borderRadius: 14, background: "rgba(255,255,255,.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ flex: 1, fontFamily: F_HEAD, fontWeight: 800, fontSize: 14.5, color: C.text }}>{s.label}</span>
              <span style={{ fontFamily: F_BODY, fontSize: 11.5, color: C.dim }}>{s.day ? s.day + " · " : ""}ore {s.time} locali</span>
            </div>
            <WeatherGuess key={s.key} s={s} guess={guesses[gk(s.key)]} result={results[gk(s.key)]} lock={lockOf(s)} onGuess={v => onGuess && onGuess(race, s.key, v)} />
          </div>
        ) : <p style={{ margin: "8px 4px 0", fontFamily: F_BODY, fontSize: 11, color: C.dim }}>Tocca una sessione: pioverà? +2 punti FantaF1 se indovini.</p>}
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
      <svg data-tel-chart={field} data-swipe-own="" viewBox={`0 0 ${W} ${H}`} onPointerMove={move} onPointerDown={move} style={{ display: "block", width: "100%", height: "auto", touchAction: "none" }}>
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
// Telemetria di un giro: nella prova DEMO subito (simulata); con OpenF1 si chiede car_data del giro (una volta, poi resta
// in memoria). delay: si aspetta prima di chiederla (Second Screen: il giro cambia di continuo mentre la sessione scorre).
function useLapTelemetry(live, carId, lapNo, { delay = 0 } = {}) {
  const ok = !!(live && carId && lapNo);
  const tel = ok ? live.sim.telemetry(carId, lapNo) : null;
  const canAsk = ok && !tel && typeof live.sim.telemetryAsync === "function";
  const key = ok ? `${live.sessionKey || live.raceId}:${carId}:${lapNo}` : null;
  const [ask, setAsk] = useState({ key: null, done: false });
  useEffect(() => {
    if (!canAsk) return undefined;
    let alive = true;
    setAsk({ key, done: false });
    const tm = setTimeout(() => {
      live.sim.telemetryAsync(carId, lapNo).then(() => { if (alive) setAsk({ key, done: true }); }, () => { if (alive) setAsk({ key, done: true }); });
    }, delay);
    return () => { alive = false; clearTimeout(tm); };
  }, [key, canAsk]);
  return { tel, loading: canAsk && !(ask.key === key && ask.done), missing: ok && !tel && (!canAsk || (ask.key === key && ask.done)) };
}
const TEL_LOADING = "Caricamento della telemetria…", TEL_MISSING = "Telemetria non disponibile per questo giro";
function TelemetryModal({ live, st, carId, lapNo, sector, onClose }) {
  const [zoom, setZoom] = useState(sector || 0);
  const [hover, setHover] = useState(null);
  const d = driverById(carId);
  const T = useLapTelemetry(live, carId, lapNo);
  const blOf = st.bestLap && !(st.bestLap.id === carId && st.bestLap.lapNo === lapNo) ? st.bestLap : null;
  const B = useLapTelemetry(live, blOf && blOf.id, blOf && blOf.lapNo);
  const tel = T.tel, bl = B.tel;
  const car = st.cars.find(c => c.id === carId), code = tel ? tel.code : car ? car.code : carId;
  const closeBtn = <button className="press" aria-label="Chiudi telemetria" onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="close" size={13} sw={2.2} /></button>;
  if (!tel) return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.78)", zIndex: 640, display: "flex", alignItems: "flex-end" }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div data-telemetry="" style={{ background: C.card, borderRadius: "24px 24px 0 0", width: "100%", padding: "16px 16px 26px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {d && <Headshot driver={d} size={34} />}
          <h2 style={{ flex: 1, minWidth: 0, margin: 0, fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 16, color: C.text }}>TELEMETRIA · {code} · GIRO {lapNo}</h2>
          {closeBtn}
        </div>
        <p role="status" data-tel-state={T.loading ? "loading" : "missing"} style={{ display: "flex", alignItems: "center", gap: 9, margin: "16px 2px 4px", fontFamily: F_BODY, fontSize: 13, color: C.muted }}>{T.loading && <LedGrid mode="seq" size={4} />}{T.loading ? TEL_LOADING : TEL_MISSING}</p>
      </div>
    </div>
  );
  const L = live.track.lenM, bounds = [0, tel.sectorDist[0], tel.sectorDist[1], L];
  const range = zoom ? [bounds[zoom - 1], bounds[zoom]] : [0, L];
  const color = (d && d.color) || C.accentInk;
  const hv = hover != null ? { d: tel.dist[hover], v: tel.speed[hover], thr: tel.throttle[hover], br: tel.brake[hover], g: tel.gear[hover], rpm: tel.rpm[hover] } : null;
  // Velocità del giro più veloce nello stesso punto della pista (i campioni dei due giri non sono gli stessi).
  const cmpAt = bl && hover != null ? bl.speed[bl.dist.reduce((k, dd, i) => Math.abs(dd - tel.dist[hover]) < Math.abs(bl.dist[k] - tel.dist[hover]) ? i : k, 0)] : null;
  const inRange = (arr) => arr.filter((_, i) => tel.dist[i] >= range[0] && tel.dist[i] <= range[1]);
  const vIn = inRange(tel.speed), top = Math.max(...vIn), low = Math.min(...vIn);
  const full = Math.round(inRange(tel.throttle).filter(x => x >= 99).length / Math.max(1, vIn.length) * 100);
  const chip = (id, label) => <button key={id} className="press" aria-pressed={zoom === id ? "true" : "false"} onClick={() => { setZoom(id); setHover(null); }} style={{ padding: "6px 10px", borderRadius: 999, background: zoom === id ? alpha(C.accentInk, .16) : "rgba(255,255,255,.05)", border: `1px solid ${zoom === id ? C.accentInk : C.border}`, fontFamily: F_BODY, fontWeight: 700, fontSize: 11, color: zoom === id ? C.text : C.muted }}>{label}</button>;
  const common = { tel, range, hover, onHover: setHover, color };
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.78)", zIndex: 640, display: "flex", alignItems: "flex-end" }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div data-telemetry="" className="scrollcol" style={{ background: C.card, borderRadius: "24px 24px 0 0", width: "100%", maxHeight: "94%", padding: "16px 16px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {d && <Headshot driver={d} size={34} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 16, color: C.text }}>TELEMETRIA · {tel.code} · GIRO {lapNo}{zoom ? ` · SETTORE ${zoom}` : ""}</h2>
            <span style={{ fontFamily: F_BODY, fontSize: 11.5, color: C.muted, fontVariantNumeric: "tabular-nums" }}>{LiveSim.fmtLap(tel.time)} · {[0, 1, 2].map(k => `S${k + 1} ${tel.sectors[k] && tel.sectors[k].t != null ? tel.sectors[k].t.toFixed(3) : "–"}`).join(" · ")}</span>
          </div>
          {closeBtn}
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
        <p style={{ margin: "8px 2px 0", fontFamily: F_BODY, fontSize: 10.5, color: C.dim, lineHeight: 1.5 }}>Distanza da {Math.round(range[0])} a {Math.round(range[1])} m · {isOf1Live(live) ? "telemetria vera del giro: dati OpenF1 (car_data)." : "telemetria simulata della prova DEMO."}</p>
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
                  {l.sectors.map((x, k) => <span key={k}>S{k + 1} <b style={{ color: secColor(x), fontWeight: 700 }}>{x && x.t != null ? x.t.toFixed(3) : "–"}</b></span>)}
                </span>
              </button>
            );
          })}
        </div>
        <p style={{ margin: "10px 2px 0", fontFamily: F_BODY, fontSize: 10.5, color: C.dim }}>Tocca un giro per vederne la telemetria · {isOf1Live(live) ? "dati OpenF1" : "dati simulati della prova DEMO"}.</p>
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
          <span style={{ fontFamily: F_BODY, fontSize: 11, color: C.dim }}>{st ? `${sessionName(st.type)} · ${liveCounter(st)} · ${isOf1Live(live) ? "dati OpenF1" : "prova DEMO"}` : "Nessuna sessione in diretta"}</span>
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
                <span style={{ fontFamily: F_BODY, fontSize: 10.5, color: C.dim, fontVariantNumeric: "tabular-nums" }}>{c.pos === 1 ? "–" : isRaceType(st.type) ? (c.lapsDown ? `+${c.lapsDown}G` : fmtGap(c.gap)) : fmtGap(c.gap)}</span>
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
const INS = { top: "#121218", body: "#0C0C10", get band() { return C.accent; }, bandInk: "#FFFFFF", label: C.gold, hi: C.gold, hiInk: "#15120A", up: "#27D8C8", down: "#FF5A5F" };
const surname = id => { const d = driverById(id); return (d ? d.full.split(" ").slice(-1)[0] : id).toUpperCase(); };
const teamColorOf = id => { const d = driverById(id), t = d && teamById(d.teamId); return t ? t.color : "#8E8E96"; };
const insightCtx = (live, st, race) => ({ st, lapsOf: id => live.sim.laps(id), telemetry: (id, n) => live.sim.telemetry(id, n), lenM: live.track.lenM, lapTime: live.track.lapTime, teamOf: TEAM_OF, seed: (race && race.round) || 1 });
// Grafiche che si possono fare (D17). Con i dati veri di OpenF1 niente "Pagella" (i voti per tipo di curva sono una stima
// con una parte a caso, cioè numeri inventati) e la frenata solo se la telemetria dell'ultimo giro dei primi due è già
// arrivata (OpenF1 la dà giro per giro, a richiesta).
const brakingReady = (live, st) => { const cs = st.cars.filter(c => !c.dnf && c.last).slice(0, 2); return cs.length === 2 && cs.every(c => !!live.sim.telemetry(c.id, c.last.lapNo)); };
const insightTypesOf = (live, st) => (isOf1Live(live) ? INSIGHT_TYPES.filter(([t]) => t !== "vettura" && (t !== "frenata" || brakingReady(live, st))) : INSIGHT_TYPES);

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
  const [type0, setType] = useState("sorpasso");
  const [kind, setKind] = useState(null);
  const types = insightTypesOf(live, st), type = types.some(([t]) => t === type0) ? type0 : types[0][0], of1 = isOf1Live(live);
  return (
    <div data-insights="" style={{ margin: "0 16px 14px", padding: "12px 12px 12px", borderRadius: 18, background: C.card, border: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 14, color: C.text }}><span style={{ padding: "1px 6px", borderRadius: 5, background: C.accent, color: "#fff", marginRight: 6 }}>B&amp;T</span>INSIGHTS</span>
        <span style={{ marginLeft: "auto", fontFamily: F_BODY, fontSize: 10.5, color: C.dim }}>analisi nostre · {of1 ? "dati OpenF1" : "prova DEMO"}</span>
      </div>
      <div className="scrollrow" style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", marginBottom: 10 }}>
        {types.map(([id, l]) => <button key={id} data-insight-tab={id} className="press" aria-pressed={type === id ? "true" : "false"} onClick={() => setType(id)} style={{ flex: "0 0 auto", padding: "6px 11px", borderRadius: 999, background: type === id ? alpha(C.accentInk, .18) : "rgba(255,255,255,.05)", border: `1px solid ${type === id ? INS.band : C.border}`, fontFamily: F_BODY, fontWeight: 700, fontSize: 11.5, color: type === id ? C.text : C.muted }}>{l}</button>)}
      </div>
      {type === "vettura" && (
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          {CORNER_KINDS.map(([id, , l]) => <button key={id} className="press" aria-pressed={(kind || CORNER_KINDS[st.lap % 3][0]) === id ? "true" : "false"} onClick={() => setKind(id)} style={{ ...aChip((kind || CORNER_KINDS[st.lap % 3][0]) === id, INS.band), fontSize: 10.5 }}>{l}</button>)}
        </div>
      )}
      <InsightBanner type={type} live={live} st={st} race={race} kind={type === "vettura" ? kind : undefined} />
      <p style={{ margin: "8px 2px 0", fontFamily: F_BODY, fontSize: 10.5, color: C.dim, lineHeight: 1.45 }}>{of1 ? "Grafiche disegnate da B&T con i nostri calcoli sui tempi della sessione (dati OpenF1). La frenata a confronto compare quando c'è la telemetria dell'ultimo giro dei primi due." : "Grafiche disegnate da B&T con i nostri calcoli sui dati simulati della prova DEMO."}</p>
    </div>
  );
}

// Banner che compare da solo sulla mappa (Second Screen e mappa grande), come in TV: ogni 3 giri,
// nella prima parte del giro, una grafica diversa. Si può chiudere.
function insightPopupOf(st, track, types = INSIGHT_TYPES) {
  if (!st || !isRaceType(st.type) || st.finished || st.lap < 3 || st.lap % 3 !== 0) return null;
  const lead = st.cars.find(c => !c.dnf); if (!lead) return null;
  const prog = ((lead.dist % track.lenM) + track.lenM) % track.lenM / track.lenM;
  if (prog > 0.45) return null;
  return { lap: st.lap, type: types[(st.lap / 3) % types.length][0] };
}
function InsightPopup({ live, st, race, style, hidden = false }) {
  const [closedLap, setClosedLap] = useState(null);
  if (!live || !st || hidden) return null;
  const pop = insightPopupOf(st, live.track, insightTypesOf(live, st));
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
const TYRE_UI = { S: [LED_RED, "Morbida"], M: ["#F2C230", "Media"], H: ["#F4F2EF", "Dura"], I: ["#3ED66B", "Intermedia"], W: ["#4C8DFF", "Da bagnato"] };
// Mescola non nota (OpenF1 senza stint): cerchio grigio e trattino.
const tyreUi = k => TYRE_UI[k] || ["#86858C", "–"];
// Radio dei team (demo): una nuova ogni 45 secondi di sessione, dai piloti di testa.
const RADIO_LINES = ["Box, box. Box questo giro.", "Gomme ok, possiamo spingere.", "Il distacco dietro è stabile, gestisci.", "Bandiera gialla nel settore 2, attento.", "Overtake mode disponibile, attacca!", "Occhio alle temperature dei freni.", "Ottimo giro, continua così.", "Il radar dice pioggia tra poco, teniamoci pronti."];
function radioFeed(st, n = 3) {
  if (!st) return [];
  const k = Math.floor(st.t / 45), m = Math.min(10, st.cars.length), out = [];
  for (let i = k; i > k - n && i >= 0; i--) {
    const c = st.cars[(i * 7) % m];
    out.push({ who: c.code, text: RADIO_LINES[(i * 5) % RADIO_LINES.length], when: isRaceType(st.type) ? `Giro ${Math.max(1, st.lap - (k - i))}` : st.clockText });
  }
  return out;
}
// Team radio veri di OpenF1 fino al punto della sessione che si vede, dal più recente (D12).
const RADIO_EMPTY = "I team radio arrivano a fine sessione.", RADIO_NONE = "Per questa sessione la F1 non ha pubblicato team radio.";
const of1RadiosAt = (live, st) => (isOf1Live(live) && st ? live.sim.radios().filter(r => r.t <= st.t + 0.001).reverse() : []);
const TYRES_EMPTY = "Le gomme compaiono quando arrivano i dati della sessione.";
// Team radio veri con l'audio: pilota, giro e lettore (D12).
function RadioList({ live, st }) {
  const rs = of1RadiosAt(live, st);
  const note = (k, t) => <p data-radio-empty={k} style={{ margin: 0, padding: 16, fontFamily: F_BODY, fontSize: 12.5, color: C.dim, lineHeight: 1.5 }}>{t}</p>;
  if (!live.sim.radios().length) return note("none", RADIO_NONE);
  if (!rs.length) return note("later", "Ancora nessuna radio a questo punto della sessione.");
  return rs.map((r, i) => { const d = driverById(r.id); return (
    <div key={r.url} data-radio-row={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderBottom: i < rs.length - 1 ? `1px solid ${C.divider}` : "none" }}>
      {d && <Headshot driver={d} size={36} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: F_BODY, fontWeight: 600, fontSize: 12.5, color: C.text }}>{d ? d.full : r.code}{r.lap ? <span style={{ color: C.dim, fontWeight: 400 }}> · Giro {r.lap}</span> : null}</div>
        <audio controls preload="none" src={r.url} aria-label={`Team radio di ${d ? d.full : r.code}${r.lap ? ", giro " + r.lap : ""}`} style={{ display: "block", width: "100%", height: 34, marginTop: 6 }} />
      </div>
    </div>
  ); });
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
  const delay = isOf1Live(live) ? 1500 : 0;
  const T = useLapTelemetry(live, carId, lapNo, { delay });
  const blOf = st.bestLap && !(st.bestLap.id === carId && st.bestLap.lapNo === lapNo) ? st.bestLap : null;
  const B = useLapTelemetry(live, blOf && blOf.id, blOf && blOf.lapNo, { delay });
  const tel = T.tel, bl = B.tel;
  const note = t => <p style={{ margin: 0, fontFamily: F_BODY, fontSize: 10.5, color: C.dim }}>{t}</p>;
  if (!lapNo) return note(`Il grafico arriva quando ${car ? car.code : "il pilota"} completa un giro.`);
  if (!tel) return note(T.loading ? TEL_LOADING : TEL_MISSING);
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
    const rows = st ? st.cars.slice(0, fits).map(c => ({ k: c.id, pos: c.pos, code: c.code, color: c.color, dnf: c.dnf, right: c.dnf ? "RIT" : isRaceType(st.type) ? (c.pos === 1 ? "LEADER" : c.lapsDown > 0 ? `+${c.lapsDown}G` : fmtGap(c.interval)) : (c.best ? LiveSim.fmtLap(c.best.time) : "–") }))
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
    const lt = live.sim.liveTelemetry(cur);
    const car = st.cars.find(c => c.id === cur);
    const step = dir => setPrefs(p => ({ ...p, tel: ids[(ids.indexOf(cur) + dir + ids.length) % ids.length] }));
    const arrow = (dir, label) => <button className="press" aria-label={label} onClick={e => { if (e && e.stopPropagation) e.stopPropagation(); step(dir); }} style={{ width: 20, height: 20, borderRadius: 6, background: "rgba(255,255,255,.07)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span style={{ display: "inline-flex", transform: dir < 0 ? "rotate(180deg)" : "none" }}><Icon name="chevron" size={10} sw={2.6} /></span></button>;
    return (
      <SsCard id={id} title={title} attrs={{ "data-ss-tel-driver": cur }} action={ssAction("Scegli il pilota della telemetria", () => onPicker("telemetria"))}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {arrow(-1, "Pilota precedente")}
          <span style={{ fontFamily: F_HEAD, fontWeight: 900, fontSize: 12.5, color: car ? car.color : C.text }}>{car ? car.code : ""}</span>
          <span style={{ fontFamily: F_BODY, fontWeight: 600, fontSize: 9.5, color: C.dim }}>P{car ? car.pos : "-"}</span>
          {lt && <span data-ss-tel-speed="" style={{ marginLeft: "auto", fontFamily: F_HEAD, fontWeight: 900, fontSize: 13, color: C.text, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{lt.speed} km/h</span>}
          {!lt && <span style={{ flex: 1 }} />}
          {arrow(1, "Pilota successivo")}
        </div>
        {lt ? <div style={{ margin: "1px 0 3px", fontFamily: F_BODY, fontSize: 9.5, color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Marcia <b style={{ color: C.text }}>{lt.pit ? "N" : lt.gear}</b> · Gas <b style={{ color: C.text }}>{lt.throttle || 0}%</b> · Freno <b style={{ color: C.text }}>{lt.brake ? "sì" : "no"}</b></div>
          : <div data-ss-tel-now="empty" style={{ margin: "1px 0 3px", fontFamily: F_BODY, fontSize: 9.5, color: C.dim, lineHeight: 1.3 }}>Velocità, marcia e pedali di adesso: con OpenF1 la telemetria arriva giro per giro.</div>}
        {h > 1 && <SsLapCharts live={live} st={st} carId={cur} charts={h === 4 ? ["speed", "throttle", "gear"] : h === 3 ? ["speed", "throttle"] : ["speed"]} />}
      </SsCard>
    );
  }
  if (id === "gomme") {
    // Di norma i primi in gara; con "Scegli" i piloti che vuoi tu (nell'ordine della gara): 2, 4, 6 o 10 secondo l'altezza.
    const chosen = prefs.tyre && prefs.tyre.length ? prefs.tyre : null;
    if (!st) return <SsCard id={id} title={title}><p style={{ margin: 0, fontFamily: F_BODY, fontSize: 11, color: C.dim, lineHeight: 1.4 }}>{TYRES_EMPTY}</p></SsCard>;
    const rows = ssChosen(st, chosen, nDrivers).map(c => ({ k: c.id, code: c.code, tyre: c.tyre, age: c.tyreAge, wear: c.wear, pit: c.pit, dnf: c.dnf }));
    return <SsCard id={id} title={SS_CARD_TITLE.gomme + (chosen ? ` · ${rows.length} SCELTI` : ` · PRIMI ${nDrivers}`)} action={ssAction("Scegli i piloti delle gomme", () => onPicker("gomme"))}>
      <div style={ssRows(h >= 3 ? 9 : 2)}>{rows.map(r => (
        <div key={r.k} data-ss-tyre-row={r.k} style={row}>
          <span style={{ width: 28, fontFamily: F_HEAD, fontWeight: 800 }}>{r.code}</span>
          <span title={tyreUi(r.tyre)[1]} style={{ width: 11, height: 11, borderRadius: "50%", border: `2.5px solid ${tyreUi(r.tyre)[0]}`, flexShrink: 0 }} />
          {r.wear != null ? <span style={{ flex: 1, height: 5, borderRadius: 3, background: "rgba(255,255,255,.08)", overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: r.wear + "%", background: r.wear > 75 ? C.red : r.wear > 50 ? TIMING.yellow : TIMING.green }} /></span>
            : <span style={{ flex: 1, color: C.muted }}>{tyreUi(r.tyre)[1]}</span>}
          <span style={{ width: 52, textAlign: "right", color: C.muted, fontVariantNumeric: "tabular-nums" }}>{r.dnf ? "RIT" : r.pit ? "BOX" : r.wear != null ? `${r.wear}%${r.age != null ? ` · ${r.age}g` : ""}` : r.age != null ? `${r.age} ${r.age === 1 ? "giro" : "giri"}` : "–"}</span>
        </div>
      ))}</div>
    </SsCard>;
  }
  if (id === "chat") {
    const msgs = (chat ? chat.messages : []).filter(m => !isBlockedMsg(blocked, m)).slice(-({ 1: 2, 2: 4, 3: 6, 4: 9 }[h] || 4));
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
    const types = insightTypesOf(live, st), type = types[Math.floor(st.t / 20) % types.length][0];   // cambia ogni 20 secondi di gara
    return <SsCard id={id} title={title}><InsightBanner type={type} live={live} st={st} race={race} variant={h === 1 ? "ticker" : h === 4 ? "full" : "compact"} /></SsCard>;
  }
  if (id === "meteo") {
    const now = sessionWeather(live, st, race);
    if (!now) return <SsCard id={id} title={title}><p style={{ margin: 0, fontFamily: F_BODY, fontSize: 11, color: C.dim, lineHeight: 1.4 }}>{WX_EMPTY}</p></SsCard>;
    const num = v => (v == null || !isFinite(v) ? "–" : Math.round(v));
    const cell = (l, v) => <div style={{ padding: "4px 6px", borderRadius: 8, background: "rgba(255,255,255,.05)" }}><div style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 13, color: C.text }}>{v}</div><div style={{ fontFamily: F_BODY, fontSize: 8.5, letterSpacing: .5, color: C.dim }}>{l}</div></div>;
    return (
      <SsCard id={id} title={title + (isDemoLive(live) ? " · DEMO" : "")}>
        <div style={{ display: "grid", gridTemplateColumns: h === 1 ? "repeat(4, 1fr)" : "1fr 1fr", gap: 4, marginBottom: 5 }}>{cell("ARIA", num(now.air) + "°")}{cell("PISTA", num(now.track) + "°")}{cell("UMIDITÀ", num(now.humidity) + "%")}{cell("VENTO", num(now.wind) + " km/h")}</div>
        <div style={{ ...row, color: C.muted }}><SkyIcon kind={now.rain ? "rain" : "cloud"} size={14} />{now.rain ? "Pioggia in corso" : "Pista asciutta"}</div>
      </SsCard>
    );
  }
  if (id === "radio") {
    const n = { 1: 1, 2: 3, 3: 4, 4: 6 }[h] || 3, empty = t => <SsCard id={id} title={title}><p style={{ margin: 0, fontFamily: F_BODY, fontSize: 11, color: C.dim, lineHeight: 1.4 }}>{t}</p></SsCard>;
    if (isOf1Live(live)) {
      const rs = of1RadiosAt(live, st).slice(0, n);
      if (!rs.length) return empty(live.sim.radios().length ? "Ancora nessuna radio a questo punto della sessione." : RADIO_NONE);
      return <SsCard id={id} title={title}><div style={ssRows(4)}>{rs.map(r => (
        <div key={r.url} data-ss-radio={r.id} style={{ width: "100%", flexShrink: 0, fontFamily: F_BODY, fontSize: 10.5, color: C.muted, lineHeight: 1.3 }}><b style={{ color: C.text, fontFamily: F_HEAD }}>{r.code}</b> <span style={{ color: C.dim }}>{r.lap ? `Giro ${r.lap}` : ""}</span><br />Radio del team · si ascolta nella scheda</div>
      ))}</div></SsCard>;
    }
    if (!st) return empty(RADIO_EMPTY);
    return <SsCard id={id} title={title + " · DEMO"}><div style={ssRows(4)}>{radioFeed(st, n).map((r, i) => (
      <div key={i} style={{ width: "100%", flexShrink: 0, fontFamily: F_BODY, fontSize: 10.5, color: C.muted, lineHeight: 1.3 }}><b style={{ color: C.text, fontFamily: F_HEAD }}>{r.who}</b> <span style={{ color: C.dim }}>{r.when}</span><br />{r.text}</div>
    ))}</div></SsCard>;
  }
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
          <td style={{ ...td, color: c.dnf ? "#FF5A5F" : C.muted }}>{c.dnf ? "RITIRATO" : isRaceType(st.type) ? (c.pos === 1 ? "LEADER" : c.lapsDown > 0 ? `+${c.lapsDown} giri` : fmtGap(c.gap)) : (c.best ? LiveSim.fmtLap(c.best.time) : "–")}</td>
          <td style={{ ...td, color: C.muted }}>{c.dnf || !isRaceType(st.type) || c.pos === 1 ? "" : fmtGap(c.interval)}</td>
          <td style={td}>{c.last ? LiveSim.fmtLap(c.last.time) : "–"}</td>
          <td style={td}><span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: "50%", border: `2.5px solid ${tyreUi(c.tyre)[0]}` }} />{c.tyreAge != null ? c.tyreAge + "g" : "–"}</span></td>
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
          {st.cars.map(c => <button key={c.id} className="press" data-pick-driver={c.id} aria-pressed={cur === c.id ? "true" : "false"} onClick={() => { setPrefs(p => ({ ...p, tel: c.id })); setHover(null); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 7px", borderRadius: 8, background: cur === c.id ? alpha(C.accentInk, .18) : "rgba(255,255,255,.04)", border: `1px solid ${cur === c.id ? C.accentInk : "transparent"}`, textAlign: "left" }}><span style={{ width: 3, height: 13, borderRadius: 2, background: c.color }} /><b style={{ fontFamily: F_HEAD, fontSize: 11.5, color: C.text }}>{c.code}</b><span style={{ marginLeft: "auto", fontFamily: F_BODY, fontSize: 10, color: C.dim }}>P{c.pos}</span></button>)}
        </div>
        <div style={{ minWidth: 0 }}><SsLapCharts live={live} st={st} carId={cur} charts={["speed", "throttle", "brake", "gear"]} hover={hover} onHover={setHover} grid /></div>
      </div>
    );
  }
  else if (id === "gomme") body = !st ? <p style={{ margin: 0, fontFamily: F_BODY, fontSize: 12.5, color: C.dim }}>{TYRES_EMPTY}</p> : (() => {
    const wear = st.cars.some(c => c.wear != null);   // l'usura c'è solo nella prova DEMO (simulata)
    return (
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{["POS", "PILOTA", "MESCOLA", "GIRI", ...(wear ? ["USURA"] : []), "SOSTE"].map((h, i) => <th key={i} style={th}>{h}</th>)}</tr></thead>
        <tbody>{st.cars.map(c => (
          <tr key={c.id} data-ss-sheet-row={c.id}>
            <td style={{ ...td, fontFamily: F_HEAD, fontWeight: 800 }}>{c.pos}</td>
            <td style={td}><b style={{ fontFamily: F_HEAD }}>{c.code}</b></td>
            <td style={td}><span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: "50%", border: `2.5px solid ${tyreUi(c.tyre)[0]}` }} />{tyreUi(c.tyre)[1]}</span></td>
            <td style={td}>{c.dnf ? "RIT" : c.pit ? "BOX" : c.tyreAge != null ? c.tyreAge : "–"}</td>
            {wear && <td style={{ ...td, width: "40%" }}><span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(255,255,255,.08)", overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: (c.wear || 0) + "%", background: c.wear > 75 ? C.red : c.wear > 50 ? TIMING.yellow : TIMING.green }} /></span>{c.dnf ? "RIT" : c.pit ? "BOX" : (c.wear || 0) + "%"}</span></td>}
            <td style={td}>{c.stops}</td>
          </tr>
        ))}</tbody>
      </table>
    );
  })();
  else if (id === "voto") body = !st || st.type !== "RACE" ? <p style={{ margin: 0, fontFamily: F_BODY, fontSize: 12.5, color: C.dim }}>Il voto si apre durante il GP, da metà gara.</p> : <DotdVote st={st} race={race} vote={vote} onVote={onVote} onOpenPicker={k => onOpenPicker("vote-" + k)} />;
  else if (id === "insights") body = !st || !live || !isRaceType(st.type) ? <p style={{ margin: 0, fontFamily: F_BODY, fontSize: 12.5, color: C.dim }}>Le grafiche B&amp;T Insights arrivano durante la gara.</p> : (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
      {insightTypesOf(live, st).map(([t]) => <InsightBanner key={t} type={t} live={live} st={st} race={race} />)}
    </div>
  );
  else if (id === "meteo") {
    const now = sessionWeather(live, st, race);
    body = !now ? <p style={{ margin: 0, fontFamily: F_BODY, fontSize: 12.5, color: C.dim }}>{WX_EMPTY}</p> : (
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.4fr)", gap: 14 }}>
        <SsWidget id="meteo" h={4} st={st} live={live} race={race} prefs={prefs} />
        <p style={{ margin: 0, fontFamily: F_BODY, fontSize: 11.5, color: C.muted, lineHeight: 1.5 }}>{isDemoLive(live) ? "Meteo simulato della prova DEMO." : "Meteo vero della sessione, dai dati di OpenF1 (aria, pista, umidità, vento e pioggia)."}</p>
      </div>
    );
  }
  else if (id === "chat") body = (
    <div data-ss-chat="" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {(chat ? chat.messages : []).filter(m => !isBlockedMsg(blocked, m)).slice(-40).map(m => <div key={m.id} data-ss-chat-msg="" style={{ padding: "4px 0", borderTop: `1px solid ${C.divider}`, fontFamily: F_BODY, fontSize: 12.5, color: C.muted, lineHeight: 1.4 }}><b style={{ color: m.mine ? C.gold : C.text, fontFamily: F_HEAD }}>{m.from}</b> {m.text}</div>)}
      <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
        <label htmlFor="ssChatInput" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}>Scrivi in chat</label>
        <input id="ssChatInput" value={draft} onChange={e => setDraft(e.target.value)} placeholder="Scrivi alla community…" style={{ flex: 1, minWidth: 0, padding: "9px 12px", borderRadius: 11, background: C.bg, border: `1px solid ${C.border}`, color: C.text, fontFamily: F_BODY, fontSize: 13 }} />
        <button className="press" data-ss-chat-send="" onClick={() => { const t = draft.trim(); if (!t || !onChatSend) return; onChatSend(t); setDraft(""); }} style={{ padding: "0 14px", borderRadius: 11, background: C.accent, fontFamily: F_HEAD, fontWeight: 800, fontSize: 12, color: "#fff" }}>INVIA</button>
      </div>
    </div>
  );
  else if (id === "radio") body = isOf1Live(live) ? <RadioList live={live} st={st} />
    : !st ? <p style={{ margin: 0, fontFamily: F_BODY, fontSize: 12.5, color: C.dim }}>{RADIO_EMPTY}</p>
    : radioFeed(st, 8).map((r, i) => <div key={i} style={{ padding: "7px 0", borderTop: i ? `1px solid ${C.divider}` : "none", fontFamily: F_BODY, fontSize: 12.5, color: C.muted, lineHeight: 1.4 }}><b style={{ color: C.text, fontFamily: F_HEAD }}>{r.who}</b> <span style={{ color: C.dim }}>{r.when}</span> · {r.text}</div>);
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
          const col = c.i > .75 ? "255,24,1" : c.i > .5 ? "242,194,48" : c.i > .3 ? "62,214,107" : "76,141,255";
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
  useBack(edit, () => setEdit(false));
  useBack(!!pick, () => setPick(null));
  useBack(!!picker, () => setPicker(null));
  useBack(!!sheet, () => setSheet(null));
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
  // Radar della pioggia: simulato, quindi solo nella prova DEMO dell'admin (con i dati veri non c'è, D10).
  const wx = race && isDemoLive(live) ? weekendWeather(race, st ? st.t : 0, live.raceId === race.id ? live.type : null) : null;
  const rainChance = wx ? (wx.current.rain ? 95 : Math.max(...wx.sessions.map(x => x.rainPct))) : 0;
  const cells = prefs.radar && wx ? LiveSim.radarCells({ seed: (race && race.round) || 1, rainChance, windDeg: wx.current.windDir }) : [];
  const bg = st && (st.bg === "yellow" || st.bg === "red") ? (st.bg === "yellow" ? "radial-gradient(120% 90% at 50% 0%, rgba(255,210,31,.5), rgba(255,210,31,.14)), #050506" : "radial-gradient(120% 90% at 50% 0%, rgba(255,24,1,.55), rgba(255,24,1,.16)), #050506") : "#050506";
  const iconBtn = (label, icon, onClick, on) => <button className="press" aria-label={label} onClick={onClick} style={{ height: 28, padding: "0 10px", borderRadius: 9, background: on ? C.accent : "rgba(255,255,255,.08)", border: `1px solid ${on ? C.accent : C.border}`, display: "flex", alignItems: "center", gap: 5, fontFamily: F_HEAD, fontWeight: 800, fontSize: 11, color: "#fff" }}>{icon}{label === "Modifica grafiche" ? (edit ? "Fatto" : "Modifica") : null}</button>;
  const openPicker = k => { setPicker(k); setPickMsg(null); };
  // Maniglietta nell'angolo in basso a destra di ogni grafica: si trascina su e giù (½, 1, 1½ o 2 posti).
  const grip = w => {
    const name = (SS_WIDGETS.find(x => x[0] === w.id) || [w.id, w.id])[1], on = drag === w.id;
    return (
      <div id={"ss-grip-" + w.id} data-ss-grip={w.id} data-swipe-own="" role="slider" tabIndex={0} aria-orientation="vertical" aria-label={`Altezza di ${name}: trascina su o giù`}
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
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 8px", borderRadius: 10, background: on ? alpha(C.accentInk, .18) : "rgba(255,255,255,.05)", border: `1px solid ${on ? C.accentInk : C.border}`, textAlign: "left" }}>
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
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: st ? C.accentInk : C.dim }} />
          <span style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 13, color: C.text, whiteSpace: "nowrap" }}>SECOND SCREEN</span>
          <span style={{ fontFamily: F_BODY, fontSize: 11, color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{race ? race.name : ""} · {st ? `${sessionName(st.type)} · ${liveCounter(st)}` : "Nessuna sessione in corso"}</span>
          {st && FLAG_UI[st.flag] && <span style={{ padding: "3px 8px", borderRadius: 7, background: FLAG_UI[st.flag].color, fontFamily: F_HEAD, fontWeight: 900, fontSize: 10, color: FLAG_UI[st.flag].ink, whiteSpace: "nowrap" }}>{st.flag === "yellow" ? "GIALLA" : st.flag === "red" ? "ROSSA" : st.flag.toUpperCase()}</span>}
          <div style={{ flex: 1 }} />
          {wx && <button className="press" aria-label="Radar meteo sulla mappa" aria-pressed={prefs.radar ? "true" : "false"} onClick={() => setPrefs(p => ({ ...p, radar: !p.radar }))} style={{ height: 28, padding: "0 10px", borderRadius: 9, background: prefs.radar ? "rgba(76,141,255,.22)" : "rgba(255,255,255,.08)", border: `1px solid ${prefs.radar ? "#4C8DFF" : C.border}`, display: "flex", alignItems: "center", gap: 5, fontFamily: F_HEAD, fontWeight: 800, fontSize: 11, color: "#fff" }}><SkyIcon kind="rain" size={14} bg="transparent" />Radar</button>}
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
                <button key={id} data-ss-chip={id} className="press" aria-pressed={on ? "true" : "false"} onClick={() => toggle(id)} style={{ padding: "5px 9px", borderRadius: 999, background: on ? alpha(C.accentInk, .18) : "rgba(255,255,255,.05)", border: `1px solid ${on ? C.accentInk : C.border}`, fontFamily: F_BODY, fontWeight: 700, fontSize: 10.5, color: on ? C.text : C.muted }}>{on ? "✓ " : ""}{label}</button>
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
  useBack(!!choosing, () => setChoosing(null));
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
      <div data-swipe-own="" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onWheel={e => setS(zRef.current.s * (e.deltaY < 0 ? 1.15 : 0.87))}
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
              <span style={{ fontFamily: F_BODY, fontSize: 11, color: C.dim }}>{h.dur || "durata non indicata"} · {h.link ? "con link" : "senza link"}{h.thumb ? " · copertina" : ""}</span>
            </span>
            <button className="press" data-hl-edit={h.id} onClick={() => { setEdit(h.id); setF({ title: h.title, dur: h.dur || "", link: h.link || "", thumb: h.thumb || null }); }} style={{ padding: "6px 10px", borderRadius: 9, background: "rgba(255,255,255,.07)", border: `1px solid ${C.border}`, fontFamily: F_BODY, fontWeight: 700, fontSize: 11, color: C.text }}>Modifica</button>
            <button className="press" data-hl-delete={h.id} onClick={() => { setItems(xs => xs.filter(x => x.id !== h.id)).then(ok => { if (!ok) return; if (edit === h.id) { setEdit(null); setF(empty); } onToast("Video eliminato"); }); }} style={{ padding: "6px 10px", borderRadius: 9, background: alpha(C.accentInk, .14), border: `1px solid ${alpha(C.accentInk, .4)}`, fontFamily: F_BODY, fontWeight: 700, fontSize: 11, color: "#FF8A8F" }}>Elimina</button>
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
        <span style={{ display: "block", marginTop: 1, fontFamily: F_BODY, fontSize: 12, color: "rgba(255,255,255,.9)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>@{ig.handle}{ig.followers != null && ig.followers !== "" ? ` · ${fmtK(ig.followers)} follower` : ""} · video e reazioni</span>
      </span>
      <Icon name="chevron" size={18} color="#fff" sw={2.6} />
    </button>
  );
}
function BackBar({ title, onBack, right = null }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px 10px", flexShrink: 0 }}>
      <button className="press" aria-label="Indietro" onClick={onBack} style={{ width: 36, height: 36, borderRadius: 12, background: C.card, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="back" size={18} /></button>
      <span style={{ flex: 1, minWidth: 0, fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 17, color: C.text }}>{title}</span>
      {right}
    </div>
  );
}
function InstagramView({ ig, onToast, onBack }) {
  const share = <button className="press" aria-label="Condividi la pagina" onClick={() => shareLink(Compat.igProfileUrl(ig.handle), "B&T su Instagram: @" + ig.handle, onToast)} style={{ width: 36, height: 36, borderRadius: 12, background: C.card, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="share" size={17} /></button>;
  return <div data-ig-screen="" style={{ height: "100%", display: "flex", flexDirection: "column" }}><BackBar title="INSTAGRAM" onBack={onBack} right={share} /><div style={{ flex: 1, minHeight: 0 }}><InstagramScreen ig={ig} onToast={onToast} /></div></div>;
}
function ChatsView({ chats, onOpen, blocked, onBack, unreadOf }) {
  return <div data-chats-screen="" style={{ height: "100%", display: "flex", flexDirection: "column" }}><BackBar title="CHAT DEI TIFOSI" onBack={onBack} /><div style={{ flex: 1, minHeight: 0 }}><ChatListScreen chats={chats} onOpen={onOpen} blocked={blocked} unreadOf={unreadOf} /></div></div>;
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
      <rect x="30" y="8" width="140" height="22" rx="6" fill={C.accent} />
      <rect x="40" y="30" width="120" height="6" rx="3" fill={shade(C.accent, .78)} />
      <path d="M92 30 L108 30 L116 110 L132 140 L136 250 L124 300 L76 300 L64 250 L68 140 L84 110 Z" fill={C.accent} />
      <path d="M68 150 L44 160 L44 245 L64 250 Z M132 150 L156 160 L156 245 L136 250 Z" fill={shade(C.accent, .78)} />
      <ellipse cx="100" cy="168" rx="15" ry="26" fill="#0A0A0C" />
      <path d="M86 150 Q100 136 114 150" stroke="#E7B34C" strokeWidth="5" fill="none" strokeLinecap="round" />
      <rect x="36" y="300" width="128" height="20" rx="5" fill={C.accent} />
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
      <span style={{ width: "62%", height: "70%", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: tyre === "none" ? "transparent" : "#1A1A1E", border: tyre === "none" ? "2px dashed rgba(255,255,255,.35)" : `4px solid ${tyre === "new" ? LED_RED : "#4A4A52"}`, boxShadow: done ? "0 0 0 3px #3ED66B" : active ? "0 0 0 2px rgba(231,179,76,.6)" : "none" }}>
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
  useEffect(() => { if (s.phase === "done" && !reported.current) { reported.current = true; fx.play("flag"); fx.buzz("flag"); onResult(s.time); } }, [s.phase]);
  const start = () => {
    timers.current.forEach(clearTimeout); timers.current = []; reported.current = false;
    setS(BtLogic.pitLights(BtLogic.pitNew())); setLights(0);
    [1, 2, 3].forEach(k => timers.current.push(setTimeout(() => { setLights(k); fx.play("light"); fx.buzz("lights"); }, k * 450)));
    timers.current.push(setTimeout(() => { setLights(0); fx.play("go"); fx.buzz("go"); setS(cur => cur.phase === "lights" ? BtLogic.pitGo(cur, performance.now()) : cur); }, 4 * 450));
  };
  // Suono del tocco: la pistola per svitare e avvitare (passi 1 e 4), lo scatto della gomma negli altri; toccare prima del
  // via è partenza anticipata.
  const tap = id => {
    if (s.phase === "lights") { fx.play("abort"); fx.buzz("error"); }
    else if (s.phase === "go") { const n = s.steps[id] || 0; if (n === 0 || n === 3) { fx.play("gun"); fx.buzz("gun"); } else if (n < 4) { fx.play("clack"); fx.buzz("light"); } }
    setS(cur => BtLogic.pitTap(cur, id, performance.now()));
  };
  const live = s.phase === "go" ? (performance.now() - s.start + s.penaltyMs) / 1000 : s.phase === "done" ? s.time : 0;
  const rating = s.phase === "done" ? PIT_RATING[BtLogic.pitRating(s.time)] : null;
  return (
    <div className="scrollcol" data-pit-phase={s.phase} style={{ height: "100%" }}>
      <GameHeader title="PIT STOP CHALLENGE" sub="Cambia le 4 gomme nel minor tempo possibile. Obiettivo: sotto i 2,0 secondi." onBack={onBack} />
      <div style={{ margin: "0 16px 10px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ display: "flex", gap: 6 }}>{[1, 2, 3].map(k => <span key={k} style={{ width: 18, height: 18, borderRadius: "50%", background: lights >= k ? LED_RED : "#2A2A30", boxShadow: lights >= k ? "0 0 10px rgba(255,24,1,.8)" : "none" }} />)}</div>
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
      <button className="press" data-pit-start="" disabled={s.phase === "lights" || s.phase === "go"} onClick={start} style={{ display: "block", width: "calc(100% - 32px)", margin: "0 16px 18px", padding: "13px 0", borderRadius: 14, background: s.phase === "lights" || s.phase === "go" ? alpha(C.accent, .3) : C.accent, fontFamily: F_HEAD, fontWeight: 900, fontSize: 14, color: "#fff" }}>{s.phase === "done" ? "RIPROVA" : "INIZIA IL PIT STOP"}</button>
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
  useBack(!!openSeat, () => setOpenSeat(null));
  const [draft, setDraft] = useState({});
  const current = Object.fromEntries(SILLY_SEATS.map(s => [s.id, s.id]));
  const board = BtLogic.sillyBoard({ official, current, mine: preds, seed: 27 });
  const chip = (on, label, attrs, onClick) => <button key={label} className="press" {...attrs} aria-pressed={on ? "true" : "false"} onClick={onClick} style={{ padding: "6px 9px", borderRadius: 9, background: on ? alpha(C.accentInk, .2) : "rgba(255,255,255,.05)", border: `1px solid ${on ? C.accentInk : C.border}`, fontFamily: F_BODY, fontWeight: 700, fontSize: 11, color: on ? C.text : C.muted }}>{label}</button>;
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
            <button className="press" data-silly-publish="" disabled={!(draft.pick && draft.renew)} onClick={() => { if (!(draft.pick && draft.renew)) return; onPredict(s.id, { pick: draft.pick, renew: draft.renew, at: nowMs() }); setOpenSeat(null); }} style={{ width: "100%", padding: "10px 0", borderRadius: 11, background: draft.pick && draft.renew ? C.accent : alpha(C.accent, .3), fontFamily: F_HEAD, fontWeight: 800, fontSize: 12.5, color: "#fff" }}>PUBBLICA LA PREVISIONE</button>
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
            <div key={r.name} data-silly-row="" data-me={r.me ? "true" : "false"} data-points={r.points} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 11, marginBottom: 5, background: r.me ? alpha(C.accentInk, .14) : C.card, border: `1px solid ${r.me ? C.accentInk : C.border}` }}>
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
  const next = weekendRace(races, r => CIRCUITS[r.circuitId]) || opts[0];
  const [cid, setCid] = useState(next ? next.circuitId : null);
  const [wing, setWing] = useState(5), [ride, setRide] = useState(3);
  if (!cid) return null;
  const race = opts.find(r => r.circuitId === cid), m = BtLogic.aeroModel({ share: aeroShare(cid), lapTime: trackOf(cid).lapTime, wing, ride });
  const slider = (id, label, value, set, lo, hi) => (
    <div style={{ marginBottom: 14 }}>
      <label htmlFor={id} style={{ display: "flex", justifyContent: "space-between", fontFamily: F_BODY, fontWeight: 700, fontSize: 12, color: C.text, marginBottom: 6 }}><span>{label}</span><span style={{ color: C.gold }}>{String(value).replace(".", ",")} / 10</span></label>
      <input id={id} type="range" min="0" max="10" step="0.5" value={value} onChange={e => set(+e.target.value)} style={{ width: "100%", accentColor: C.accentInk }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: F_BODY, fontSize: 10.5, color: C.dim }}><span>{lo}</span><span>{hi}</span></div>
    </div>
  );
  const bar = (k, label, v, min, max, ideal) => (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: F_BODY, fontSize: 12, color: C.muted, marginBottom: 4 }}><span>{label}</span><b style={{ fontFamily: F_HEAD, fontSize: 15, color: C.text }}>{v} km/h</b></div>
      <div data-aero-bar={k} data-value={v} style={{ position: "relative", height: 12, borderRadius: 6, background: "rgba(255,255,255,.07)", overflow: "hidden" }}>
        <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.max(3, Math.min(100, (v - min) / (max - min) * 100))}%`, background: k === "top" ? C.accentInk : C.gold, borderRadius: 6 }} />
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
    <button className="press cta-shine" data-circuit-cta={circuitId} onClick={onOpen} style={{ position: "relative", display: "flex", alignItems: "center", gap: 12, width: "100%", minHeight: 62, marginTop: 14, padding: "10px 12px 10px 10px", borderRadius: 14, overflow: "hidden", background: `linear-gradient(100deg, ${C.accent} 0%, ${shade(C.accent, .79)} 58%, ${shade(C.accent, .5)} 100%)`, border: "1px solid rgba(255,255,255,.22)", boxShadow: `0 10px 24px -8px ${alpha(C.accent, .65)}`, textAlign: "left" }}>
      <span style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.22)" }}><GuideMini circuitId={circuitId} size={34} /></span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <b style={{ display: "block", fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 16, color: "#fff", letterSpacing: .3 }}>ESPLORA IL CIRCUITO</b>
        <span style={{ display: "block", marginTop: 1, fontFamily: F_BODY, fontWeight: 600, fontSize: 11.5, color: "rgba(255,255,255,.88)" }}>{has ? "Guida 2D delle curve · staccate · momenti storici" : "Numeri, programma del weekend e curiosità"}</span>
      </span>
      <span style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#fff" }}><Icon name="chevron" size={15} color={C.accent} sw={2.8} /></span>
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
          <path d={d} fill="none" stroke={C.accentInk} strokeWidth="2.4" strokeLinejoin="round" opacity=".9" />
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
          <div style={{ marginTop: 6, padding: "9px 10px", borderRadius: 11, background: alpha(C.accentInk, .1), border: `1px solid ${alpha(C.accentInk, .3)}` }}>
            <div style={{ fontFamily: F_HEAD, fontWeight: 900, fontSize: 12, color: C.accentInk, marginBottom: 3 }}>Momento storico B&T</div>
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
  const next = weekendRace(races, r => GUIDE()[r.circuitId]) || opts[0];
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
        <span style={{ width: 10, height: 10, borderRadius: 3, background: C.accentInk, flexShrink: 0 }} />{sel("clashA", a, setA)}
        <span style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 13, color: C.gold }}>VS</span>
        {sel("clashB", b, setB)}<span style={{ width: 10, height: 10, borderRadius: 3, background: C.gold, flexShrink: 0 }} />
      </div>
      {rows.map(([k, l, va, vb, u, max0]) => { const max = max0 || Math.max(1, va || 0, vb || 0); return (
        <div key={k} data-clash-row={k} data-a={va == null ? "" : va} data-b={vb == null ? "" : vb} style={{ marginBottom: 10 }}>
          <div style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 11, color: C.muted, textAlign: "center", marginBottom: 4 }}>{l}</div>
          <div style={{ display: "grid", gridTemplateColumns: "58px 1fr 1fr 58px", alignItems: "center", gap: 6 }}>
            <b style={{ fontFamily: F_HEAD, fontSize: 13.5, color: C.text, textAlign: "right", whiteSpace: "nowrap" }}>{fmt(va, u)}</b>
            <span style={{ height: 10, borderRadius: 5, background: "rgba(255,255,255,.06)", display: "flex", justifyContent: "flex-end", overflow: "hidden" }}><span style={{ width: (va == null ? 0 : Math.min(100, va / max * 100)) + "%", background: C.accentInk, borderRadius: 5 }} /></span>
            <span style={{ height: 10, borderRadius: 5, background: "rgba(255,255,255,.06)", overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: (vb == null ? 0 : Math.min(100, vb / max * 100)) + "%", background: C.gold, borderRadius: 5 }} /></span>
            <b style={{ fontFamily: F_HEAD, fontSize: 13.5, color: C.text, whiteSpace: "nowrap" }}>{fmt(vb, u)}</b>
          </div>
        </div>
      ); })}
      <div data-clash-row="downforce" data-a={dfA || ""} data-b={dfB || ""} style={{ marginBottom: 10 }}>
        <div style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 11, color: C.muted, textAlign: "center", marginBottom: 4 }}>Livello di carico aerodinamico</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>{[dfA, dfB].map((v, i) => <span key={i} style={{ padding: "6px 8px", borderRadius: 9, textAlign: "center", background: i ? "rgba(231,179,76,.12)" : alpha(C.accentInk, .12), fontFamily: F_HEAD, fontWeight: 800, fontSize: 12, color: v ? C.text : C.dim }}>{v || "n.d."}</span>)}</div>
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
const COMP_UI = { S: [LED_RED, "Morbide", "#fff"], M: ["#F2C230", "Medie", "#15120A"], H: ["#F4F2EF", "Dure", "#15120A"], I: ["#3ED66B", "Intermedie", "#0A0A0C"], W: ["#4C8DFF", "Da bagnato", "#fff"], "?": ["#86858C", "Sconosciute", "#fff"] };
const compUi = c => COMP_UI[c] || COMP_UI["?"];
const TEAM_SHORT = { mclaren: "MCL", redbull: "RBR", mercedes: "MER", ferrari: "FER", williams: "WIL", racingbulls: "RB", astonmartin: "AST", haas: "HAA", audi: "AUD", alpine: "ALP", cadillac: "CAD" };
const roundOfCircuit = cid => CIRCUIT_IDS.indexOf(cid) + 1;
const fmtLapMs = ms => ms ? LiveSim.fmtLap(ms / 1000) : "–";
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
      <div data-swipe-own="" onPointerMove={onMove} onPointerUp={() => { drag.current = null; }} onPointerLeave={() => { drag.current = null; }} style={{ position: "relative", height: 48, margin: "6px 0 4px", borderRadius: 12, background: "rgba(255,255,255,.04)", touchAction: "none" }}>
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
// Nome della sessione che si vede nel Garage (D27): quella vera di OpenF1 o la prova DEMO dell'admin.
const liveSrcLabel = live => (isOf1Live(live) ? OF1_SRC : "Prova DEMO (simulata)");
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
// La gomma che si rovina (G28): scorrendo i giri dello stint la gomma disegnata passa da lucida a graining e poi a
// blistering secondo il degrado vero calcolato: tempo perso dalla retta del degrado (s.slope a giro) da 0,3 s graining,
// da 0,8 s blistering; dopo il crollo rilevato, blistering. Gli strati cambiano solo opacità (R4).
const WEAR_GRAIN_S = 0.3, WEAR_BLISTER_S = 0.8;
const WEAR_UI = { lucida: "Gomma lucida", graining: "Graining", blistering: "Blistering" };
function wearOf(s, age) {
  const a0 = Math.min(...s.pts.map(p => p.age)), cliff = !!(s.cliff && age >= s.cliff.age);
  const loss = Math.max(0, (s.slope || 0) * (age - a0)) + (cliff ? Math.max(0, s.cliff.loss || 0) : 0);   // dopo il crollo, in più quello che perde
  const wear = cliff || loss >= WEAR_BLISTER_S ? "blistering" : loss >= WEAR_GRAIN_S ? "graining" : "lucida";
  return { loss, wear };
}
function WearTyre({ s }) {
  const ages = s.pts.map(p => p.age), min = Math.min(...ages), max = Math.max(...ages);
  const [age, setAge] = useState(min);
  const { loss, wear } = wearOf(s, age);
  const col = compUi(s.c)[0];
  const op = { gloss: wear === "lucida" ? 1 - Math.min(1, loss / WEAR_GRAIN_S) * .35 : wear === "graining" ? .3 : .08, graining: wear === "graining" ? .9 : wear === "blistering" ? .55 : 0, blistering: wear === "blistering" ? 1 : 0 };
  const R = 44, ring = n => Array.from({ length: n }, (_, k) => k * 2 * Math.PI / n);
  return (
    <div data-wear="" style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.divider}` }}>
      <svg data-wear-tyre="" data-wear={wear} data-loss={loss.toFixed(2)} data-cliff-age={s.cliff ? s.cliff.age : undefined} viewBox="0 0 100 100" width="92" height="92" role="img" aria-label={`${WEAR_UI[wear]} al giro ${age} dello stint`} style={{ flexShrink: 0 }}>
        <circle cx="50" cy="50" r={R} fill="#151517" stroke="#000" strokeWidth="1" />
        <circle cx="50" cy="50" r="33" fill="none" stroke={col} strokeWidth="3" />
        <circle cx="50" cy="50" r="27" fill="#2A2A2F" />
        <circle cx="50" cy="50" r="9" fill="#3A3A40" />
        <g data-wear-layer="gloss" style={{ opacity: op.gloss, transition: "opacity .25s" }}><path d="M18 38 A34 34 0 0 1 46 12" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="3.4" strokeLinecap="round" /></g>
        <g data-wear-layer="graining" style={{ opacity: op.graining, transition: "opacity .25s" }}>{ring(36).map((a, k) => <line key={k} x1={(50 + 37 * Math.cos(a)).toFixed(1)} y1={(50 + 37 * Math.sin(a)).toFixed(1)} x2={(50 + 42 * Math.cos(a + .05)).toFixed(1)} y2={(50 + 42 * Math.sin(a + .05)).toFixed(1)} stroke="#6E6E76" strokeWidth="1.3" strokeLinecap="round" />)}</g>
        <g data-wear-layer="blistering" style={{ opacity: op.blistering, transition: "opacity .25s" }}>{ring(9).map((a, k) => <circle key={k} cx={(50 + 39.5 * Math.cos(a + .3)).toFixed(1)} cy={(50 + 39.5 * Math.sin(a + .3)).toFixed(1)} r={k % 3 ? 2.2 : 3} fill="#4A4A52" stroke="#8A8A92" strokeWidth=".8" />)}</g>
      </svg>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div data-wear-label="" style={{ fontFamily: F_HEAD, fontWeight: 900, fontSize: 13.5, color: wear === "blistering" ? "#FF5A5F" : wear === "graining" ? C.gold : C.text }}>Giro {age} dello stint · {WEAR_UI[wear]}</div>
        <div style={{ fontFamily: F_BODY, fontSize: 11.5, color: C.muted, margin: "2px 0 8px" }}>{loss > 0.005 ? `+${fmtDec(loss)} s al giro rispetto all'inizio dello stint` : "Nessun tempo perso rispetto all'inizio dello stint"}</div>
        <input type="range" data-wear-slider="" data-swipe-own="" aria-label="Giro dello stint" min={min} max={max} step={1} value={age} onChange={e => setAge(+e.target.value)} style={{ width: "100%", accentColor: C.accent }} />
      </div>
    </div>
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
          {liveRace && <WkChip attrs={{ "data-deg-src": "live" }} on={src === "live"} onClick={() => { setSrc("live"); setSel(null); }}>{liveSrcLabel(live)}</WkChip>}
        </div>
        {src === "real" ? <select id="degRace" value={cid} onChange={e => { setCid(e.target.value); setSel(null); }} style={{ width: "100%", padding: "10px 12px", marginBottom: 10, borderRadius: 12, background: C.bg, border: `1px solid ${C.border}`, color: C.text, fontFamily: F_BODY, fontSize: 13 }}>{RS.map(r => <option key={r.circuitId} value={r.circuitId}>{raceNameOfCid(races, r.circuitId)} · {r.laps} giri</option>)}</select>
          : <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontFamily: F_BODY, fontSize: 12.5, color: C.text }}><span style={{ flex: 1 }}>{liveSrcLabel(live)}: giro {R.lap} di {R.laps}</span><button className="press" data-deg-refresh="" onClick={() => setTick(n => n + 1)} style={{ padding: "6px 10px", borderRadius: 9, background: "rgba(255,255,255,.07)", border: `1px solid ${C.border}`, fontFamily: F_HEAD, fontWeight: 800, fontSize: 11.5, color: C.text }}>Aggiorna</button></div>}
        <div className="scrollrow" style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
          {["all", ...comps].map(c => <WkChip key={c} attrs={{ "data-deg-comp": c }} on={comp === c} onClick={() => { setComp(c); setSel(null); }}>{c === "all" ? "Tutte" : <><CompDot c={c} />{compUi(c)[1]}</>}</WkChip>)}
        </div>
      </div>
      {cur && (
        <div style={WK_CARD}>
          <div style={{ fontFamily: F_HEAD, fontWeight: 900, fontSize: 13.5, color: C.text, marginBottom: 2 }}>{ghostInfo(cur.code).name} · {compUi(cur.c)[1]} dal giro {cur.from} al {cur.to}</div>
          <div style={{ fontFamily: F_BODY, fontSize: 11.5, color: C.muted, marginBottom: 4 }}>Tempi corretti per la benzina (puntini) e retta del degrado (oro){cur.cliff ? "; in rosso i giri del crollo" : ""}.</div>
          <DegChart s={cur} />
          <WearTyre key={cur.code + ":" + cur.si} s={cur} />
        </div>
      )}
      <div style={WK_CARD}>
        <WkLabel>{list.length} STINT · {src === "live" ? liveSrcLabel(live).toUpperCase() : raceNameOfCid(races, cid).toUpperCase()}</WkLabel>
        {list.map(s => { const on = cur && cur === s; return (
          <button key={s.code + s.si} className="press" data-deg-row={s.code + ":" + s.si} data-cliff={s.cliff ? "1" : "0"} onClick={() => setSel(on ? null : s.code + ":" + s.si)} style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 6px", borderRadius: 0, background: on ? "rgba(231,179,76,.1)" : "transparent", border: "none", borderTop: `1px solid ${C.divider}` }}>
            <span style={{ display: "flex", alignItems: "center", gap: 7 }}><CompDot c={s.c} /><span style={{ flex: 1, fontFamily: F_BODY, fontSize: 12.5, color: C.text, lineHeight: 1.35 }}>{degLine(s)}</span></span>
            {s.slope < -0.005 && <span style={{ display: "block", marginLeft: 17, fontFamily: F_BODY, fontSize: 11, color: C.dim }}>il passo migliora di {fmtDec(s.slope)} s al giro (benzina che cala, pista più gommata)</span>}
            {s.cliff && <span style={{ display: "inline-block", margin: "4px 0 0 17px", padding: "2px 7px", borderRadius: 6, background: "rgba(255,90,95,.14)", border: "1px solid rgba(255,90,95,.5)", fontFamily: F_HEAD, fontWeight: 900, fontSize: 11, color: "#FF5A5F" }}>Crollo rilevato al giro {s.cliff.lap}: +{fmtDec(s.cliff.loss, 1)} s al giro</span>}
          </button>
        ); })}
        {!list.length && <p style={{ margin: 0, fontFamily: F_BODY, fontSize: 12, color: C.dim }}>Ancora pochi giri buoni per calcolare il degrado.</p>}
      </div>
      <WkNote>Tempi corretti per la benzina che si consuma (stima B&T: {String(BtWk.FUEL).replace(".", ",")} s a giro). Non contano i primi 3 giri, l'ultimo, i giri ai box, con Safety Car, VSC o bandiere. Crollo: almeno 3 giri di fila più lenti di oltre 0,4 s. {src === "live" ? (isOf1Live(live) ? "Sessione: dati veri di OpenF1." : "Prova DEMO: gara simulata, la vedi solo tu.") : "Dati veri: TracingInsights (github.com/TracingInsights/2026), FastF1 e tempi ufficiali Ergast/Jolpica."}</WkNote>
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
   Le radio sono quelle vere di OpenF1, con l'audio: durante la gara l'admin segna quelle in cui un pilota parla di gomme
   (shared/bt-bluff-<sessione>, col testo che scrive lui ascoltandole). La demo con le radio simulate resta solo nella
   prova DEMO dell'admin (D24). */
const BLUFF_UI = { bluff: ["BLUFF PROBABILE", C.gold], vero: ["RADIO VERA", "#FF5A5F"], dubbio: ["DA CAPIRE", C.muted] };
const BLUFF_EXPLAIN = "Durante la gara l'admin segna le radio in cui un pilota parla di gomme: qui vedrai se era vero o un bluff.";
function BluffTool({ races, live, tags = [], onRefresh, onBack }) {
  const [, setTick] = useState(0);
  useEffect(() => { if (onRefresh) onRefresh(); }, []);
  const of1 = isOf1Live(live) && isRaceType(live.type), demo = isDemoLive(live) && live.type === "RACE";
  const R = of1 || demo ? raceFromLive(live) : null;
  const codes = R ? Object.keys(R.drivers) : [];
  const verdictOf = (code, lap) => BtWk.bluffVerdict(BtWk.lapsOf(R, code), lap, codes.filter(k => k !== code).map(k => BtWk.lapsOf(R, k)));
  const ready = c => !!R && (c.lap + 3 < R.lap || R.lap >= R.laps);   // servono 3 giri dopo la radio
  let items = [];
  if (of1) {
    const radios = live.sim.radios();
    const seen = new Set();   // la stessa radio segnata due volte (da due telefoni) si conta una volta
    items = tags.filter(c => c && c.code && c.lap && !seen.has(c.code + "|" + c.date) && seen.add(c.code + "|" + c.date))
      .map(c => ({ ...c, url: (radios.find(r => r.code === c.code && r.date === c.date) || {}).url || null }));
  } else if (demo) items = BtWk.demoClaims(R).map(c => ({ ...c, sim: true }));
  const waiting = items.filter(c => !ready(c)).length;
  items = items.filter(ready).map(c => ({ ...c, v: verdictOf(c.code, c.lap) })).sort((a, b) => b.lap - a.lap);   // le più recenti in alto
  const n = k => items.filter(x => x.v.kind === k).length;
  const why = v => v.pitLap ? `È rientrato ai box al giro ${v.pitLap}: le gomme erano davvero finite.`
    : v.delta == null ? "Troppi giri lenti (box o bandiere) per giudicare."
    : `Nei 3 giri dopo ${v.rel > 0 ? `ha perso ${fmtDec(v.rel)} s al giro più del gruppo` : `è andato come il gruppo (${sgn(v.rel)} s)`}: ${LiveSim.fmtLap(v.before)} → ${LiveSim.fmtLap(v.after)}.${v.kind === "bluff" ? " Non sembra in crisi." : v.kind === "vero" ? " Calo vero." : " Difficile dirlo."}`;
  return (
    <div data-bluff="" className="scrollcol" style={{ height: "100%" }}>
      <GameHeader title="RILEVATORE DI BLUFF" sub="Quando un pilota dice alla radio che le gomme sono finite guardiamo i tempi: è vero o vuole ingannare gli avversari?" onBack={onBack} />
      {R && (
        <div style={WK_CARD}>
          <div style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 14.5, color: C.text }}>{`${liveSrcLabel(live)} · giro ${R.lap} di ${R.laps}`}</div>
          {demo
            ? <p style={{ margin: "4px 0 8px", padding: "8px 10px", borderRadius: 10, background: "rgba(242,194,48,.1)", border: "1px solid rgba(242,194,48,.35)", fontFamily: F_BODY, fontSize: 11.5, color: C.text, lineHeight: 1.45 }}>Radio simulate della prova DEMO: le frasi le inventa il simulatore e i tempi sono quelli della gara simulata. La vedi solo tu.</p>
            : <p style={{ margin: "4px 0 8px", fontFamily: F_BODY, fontSize: 11.5, color: C.muted, lineHeight: 1.45 }}>Radio vere di OpenF1 con l'audio, segnate dall'admin: il testo è quello che ha scritto lui ascoltandole.</p>}
          <div style={{ display: "flex", gap: 8 }}>{[["bluff", "Bluff scoperti"], ["vero", "Radio vere"], ["dubbio", "Da capire"]].map(([k, l]) => <div key={k} style={{ flex: 1, padding: "8px 6px", borderRadius: 11, background: "rgba(255,255,255,.04)", textAlign: "center" }}><b style={{ display: "block", fontFamily: F_HEAD, fontSize: 20, color: BLUFF_UI[k][1] }}>{n(k)}</b><span style={{ fontFamily: F_BODY, fontSize: 10.5, color: C.muted }}>{l}</span></div>)}</div>
          <button className="press" onClick={() => { setTick(x => x + 1); if (onRefresh) onRefresh(); }} style={{ marginTop: 8, padding: "6px 10px", borderRadius: 9, background: "rgba(255,255,255,.07)", border: `1px solid ${C.border}`, fontFamily: F_HEAD, fontWeight: 800, fontSize: 11.5, color: C.text }}>Aggiorna</button>
        </div>
      )}
      <div style={WK_CARD}>
        {items.map((x, i) => { const u = BLUFF_UI[x.v.kind], I = ghostInfo(x.code); return (
          <div key={x.code + x.lap + (x.date || "")} data-bluff-item={x.v.kind} style={{ padding: "9px 0", borderTop: i ? `1px solid ${C.divider}` : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 3, height: 26, borderRadius: 2, background: I.color }} />
              <span style={{ flex: 1, minWidth: 0 }}><b style={{ display: "block", fontFamily: F_HEAD, fontWeight: 800, fontSize: 13, color: C.text }}>{I.name}</b><span style={{ fontFamily: F_BODY, fontSize: 11, color: C.dim }}>Giro {x.lap} · {x.sim ? "radio simulata" : "radio vera (OpenF1)"}</span></span>
              <span style={{ padding: "3px 8px", borderRadius: 7, background: "rgba(255,255,255,.05)", border: `1px solid ${u[1]}`, fontFamily: F_HEAD, fontWeight: 900, fontSize: 10.5, color: u[1], whiteSpace: "nowrap" }}>{u[0]}</span>
            </div>
            <p style={{ margin: "5px 0 2px 11px", fontFamily: F_BODY, fontStyle: "italic", fontSize: 13, color: x.text ? C.text : C.muted }}>{x.text ? `“${x.text}”` : "Parla di gomme (l'admin non ha scritto la frase)."}</p>
            {x.url && <audio controls preload="none" src={x.url} aria-label={`Team radio di ${I.name}, giro ${x.lap}`} style={{ display: "block", width: "calc(100% - 11px)", height: 32, margin: "4px 0 4px 11px" }} />}
            <p style={{ margin: "0 0 0 11px", fontFamily: F_BODY, fontSize: 11.5, color: C.muted, lineHeight: 1.4 }}>{why(x.v)}</p>
          </div>
        ); })}
        {!items.length && <p data-bluff-empty="" style={{ margin: 0, fontFamily: F_BODY, fontSize: 12, color: C.dim, lineHeight: 1.5 }}>{waiting ? `Radio segnate: ${waiting}. Il verdetto arriva 3 giri dopo la radio.` : demo ? "Ancora nessuna radio da giudicare: servono almeno 3 giri dopo ogni radio." : BLUFF_EXPLAIN}</p>}
      </div>
      <WkNote>Come giudica: confronta i 3 giri dopo la radio con i 3 prima, al netto di quanto è cambiato il passo di tutto il gruppo (benzina, pista, bandiere). Radio vera: rientra ai box entro 3 giri o perde oltre mezzo secondo al giro; bluff: va come prima (meno di 0,25 s).</WkNote>
    </div>
  );
}

// Icone dei giochi del Garage (disegno "Icone del Garage" del 24/10): un glifo per gioco su una piastrella nera a puntini
// LED. Bianco, colore dell'app e oro; mescole e settori con i loro colori. "In arrivo": grigie, bordo tratteggiato e
// orologio oro.
const GARAGE_INK = accent => ({ w: "#F4F2EF", a: accent, g: "#E7B34C", m: "#3A3A42", k: "#0C0C0F", soft: "#FF1801", med: "#F2C230", hard: "#F4F2EF", pu: "#B35CFF", gr: "#3ED66B", ye: "#F2C230" });
const GARAGE_INK_SOON = { w: "#8E8D94", a: "#BDBCC2", g: "#8E8D94", m: "#2A2A30", k: "#0C0C0F", soft: "#BDBCC2", med: "#8E8D94", hard: "#6E6D74", pu: "#6E6D74", gr: "#8E8D94", ye: "#BDBCC2" };
const GARAGE_GLYPHS = {
  pitstop: c => (<>
    <circle cx="20" cy="21.5" r="15.5" fill="none" stroke={c.m} strokeWidth="2.5" />
    <path d="M20 6 A15.5 15.5 0 1 1 4.5 21.5" fill="none" stroke={c.a} strokeWidth="2.5" strokeLinecap="round" />
    <rect x="17.5" y="1.5" width="5" height="3" rx="1.2" fill={c.w} />
    <circle cx="20" cy="21.5" r="8.5" fill="none" stroke={c.w} strokeWidth="4" />
    <circle cx="20" cy="21.5" r="3" fill={c.g} />
  </>),
  silly: c => (<>
    <path d="M11 24.5 C11 18.5 14.6 14.5 20 14.5 C25.4 14.5 29 18.3 29 22.8 L29 26 C29 27 28.3 27.6 27.4 27.6 L14.2 27.6 C12.4 27.6 11 26.4 11 24.5 Z" fill="none" stroke={c.w} strokeWidth="2.4" strokeLinejoin="round" />
    <path d="M20.2 18.6 L28.6 18.6 L29 22.8 L21.2 22.8 C20.4 22.8 19.8 22.2 19.8 21.4 L19.8 19 C19.8 18.8 20 18.6 20.2 18.6 Z" fill={c.a} />
    <path d="M8 12.5 C12 6.5 28 6.5 32 12.5" fill="none" stroke={c.a} strokeWidth="2.4" strokeLinecap="round" />
    <path d="M28.3 12 L32 12.5 L32.7 8.8" fill="none" stroke={c.a} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M32 31 C28 37 12 37 8 31" fill="none" stroke={c.g} strokeWidth="2.4" strokeLinecap="round" />
    <path d="M11.7 31.5 L8 31 L7.3 34.7" fill="none" stroke={c.g} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </>),
  aero: c => (<>
    <path d="M3.5 8.5 C12 4 28 4 36.5 8.5" fill="none" stroke={c.g} strokeWidth="2" strokeLinecap="round" strokeDasharray="2.5 3" />
    <rect x="5" y="11" width="3.5" height="15" rx="1.5" fill={c.w} />
    <rect x="31.5" y="11" width="3.5" height="15" rx="1.5" fill={c.w} />
    <rect x="7" y="13.5" width="26" height="5" rx="2" fill={c.w} />
    <path d="M12 18.5 V31 M28 18.5 V31" stroke={c.w} strokeWidth="2.5" strokeLinecap="round" />
    <path d="M20 21 V33 M16.2 29.2 L20 33 L23.8 29.2" fill="none" stroke={c.a} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
  </>),
  setup: c => (<>
    <path d="M10 6 V34 M20 6 V34 M30 6 V34" stroke={c.m} strokeWidth="2.5" strokeLinecap="round" />
    <path d="M10 22 V34 M20 13 V34 M30 26 V34" stroke={c.w} strokeWidth="2.5" strokeLinecap="round" />
    <path d="M4 18 H36" stroke={c.a} strokeWidth="1.6" strokeLinecap="round" strokeDasharray="1.5 2.5" opacity=".8" />
    <circle cx="10" cy="22" r="3.7" fill={c.a} stroke={c.k} strokeWidth="1.5" />
    <circle cx="20" cy="13" r="3.7" fill={c.g} stroke={c.k} strokeWidth="1.5" />
    <circle cx="30" cy="26" r="3.7" fill={c.w} stroke={c.k} strokeWidth="1.5" />
  </>),
  strategy: c => (<>
    <rect x="4" y="16.5" width="11" height="8" rx="4" fill={c.soft} />
    <rect x="18" y="16.5" width="9" height="8" rx="4" fill={c.med} />
    <rect x="30" y="16.5" width="6" height="8" rx="3" fill={c.hard} />
    <path d="M14.5 8.5 H18.5 L16.5 12 Z M26.5 8.5 H30.5 L28.5 12 Z" fill={c.w} stroke={c.w} strokeWidth="1" strokeLinejoin="round" />
    <path d="M4 31 H36" stroke={c.m} strokeWidth="2.5" strokeLinecap="round" />
    <path d="M16.5 28.5 V33.5 M28.5 28.5 V33.5" stroke={c.w} strokeWidth="2" strokeLinecap="round" />
  </>),
  deg: c => (<>
    <path d="M17.5 34 H36" stroke={c.m} strokeWidth="2.5" strokeLinecap="round" />
    <path d="M17.5 29 C23 28.5 27 26.5 30 22.5 L34 8" fill="none" stroke={c.a} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="30" cy="22.5" r="2.4" fill={c.g} />
    <circle cx="10.5" cy="27" r="6.5" fill="none" stroke={c.w} strokeWidth="3.5" />
    <circle cx="10.5" cy="27" r="2" fill={c.w} />
  </>),
  mates: c => (<>
    <path d="M20 8 V34" stroke={c.m} strokeWidth="1.6" strokeLinecap="round" strokeDasharray="2 2.5" />
    <path d="M3.5 22 C3.5 16.5 7 13 12 13 C16.5 13 18.5 16.5 18.5 20 L18.5 24 L6 24 C4.6 24 3.5 23.2 3.5 22 Z" fill="none" stroke={c.w} strokeWidth="2.4" strokeLinejoin="round" />
    <path d="M12 16.5 L18 16.5 L18.5 20 L12.8 20 C12.2 20 11.7 19.5 11.7 18.9 L11.7 16.8 Z" fill={c.g} />
    <path d="M36.5 22 C36.5 16.5 33 13 28 13 C23.5 13 21.5 16.5 21.5 20 L21.5 24 L34 24 C35.4 24 36.5 23.2 36.5 22 Z" fill="none" stroke={c.a} strokeWidth="2.4" strokeLinejoin="round" />
    <path d="M28 16.5 L22 16.5 L21.5 20 L27.2 20 C27.8 20 28.3 19.5 28.3 18.9 L28.3 16.8 Z" fill={c.a} />
    <path d="M5 30.5 H15" stroke={c.w} strokeWidth="3" strokeLinecap="round" />
    <path d="M25 30.5 H36" stroke={c.a} strokeWidth="3" strokeLinecap="round" />
  </>),
  bluff: c => (<>
    <path d="M7 7.5 H33 A3 3 0 0 1 36 10.5 V24.5 A3 3 0 0 1 33 27.5 H17.5 L10.5 33.5 V27.5 H7 A3 3 0 0 1 4 24.5 V10.5 A3 3 0 0 1 7 7.5 Z" fill="none" stroke={c.w} strokeWidth="2.4" strokeLinejoin="round" />
    <path d="M8.5 17.5 H12.5 L15 12 L18.5 23 L21.5 13.5 L24 19.5 L26 16.5 H31.5" fill="none" stroke={c.a} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </>),
  guide: c => (<>
    <path d="M9 28.5 C5.5 22 8.5 12.5 16 11 C21 10 22.5 14.5 26.5 13 C31 11.3 35 13.8 34.3 18.8 C33.7 23.4 28.3 23.2 27.3 27.4 C26.4 31 21.6 33 16.6 32.3 C13 31.8 10.6 31.2 9 28.5 Z" fill="none" stroke={c.w} strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M6.3 30.4 L11.2 26.8" stroke={c.w} strokeWidth="2" strokeLinecap="round" />
    <circle cx="16" cy="11" r="3.5" fill={c.a} stroke={c.k} strokeWidth="1.5" />
    <circle cx="27.3" cy="27.4" r="3.5" fill={c.g} stroke={c.k} strokeWidth="1.5" />
  </>),
  clash: c => (<>
    <path d="M4.5 25 C3 19.5 6 14 10.5 14 C14.5 14 15 17.5 16.5 19.5 C17.8 21.4 17.5 25 14.8 26.7 C11.8 28.6 6.4 28.6 4.5 25 Z" fill="none" stroke={c.w} strokeWidth="2.4" strokeLinejoin="round" />
    <path d="M24 13.5 H32.5 C35 13.5 36.3 15.8 35.2 18 L31.8 25.2 C30.8 27.4 28.2 27.8 26.4 26.3 L23.6 24 C22.2 22.8 22.1 21 23.1 19.8 L24.8 17.8 C25.6 16.8 25.1 15.6 24 15.6 Z" fill="none" stroke={c.a} strokeWidth="2.4" strokeLinejoin="round" />
    <path d="M21 7 L18.6 20.5 H21.6 L19.2 33" fill="none" stroke={c.g} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </>),
  ghost: c => (<>
    <path d="M4 25 C9 25 11.6 22 13.4 17 C15.5 11 19 6 28.5 4.8" fill="none" stroke={c.w} strokeWidth="2.2" strokeLinecap="round" strokeDasharray="2.5 3" opacity=".75" />
    <circle cx="29.5" cy="4.8" r="2.6" fill="none" stroke={c.w} strokeWidth="1.8" opacity=".75" />
    <path d="M4 32 C10 32 13.5 29 15.5 23.5 C17.8 17 21.5 10.5 32.5 9" fill="none" stroke={c.a} strokeWidth="2.8" strokeLinecap="round" />
    <circle cx="33" cy="9" r="3.1" fill={c.a} />
  </>),
  reaction: c => (<>
    <rect x="5" y="5" width="30" height="3.5" rx="1.75" fill={c.m} />
    <circle cx="11" cy="15.5" r="4.2" fill={c.a} />
    <circle cx="20" cy="15.5" r="4.2" fill={c.a} />
    <circle cx="29" cy="15.5" r="3.7" fill="none" stroke={c.w} strokeWidth="2" />
    <path d="M21.5 22 L15.5 30.5 H20 L18.5 36 L25 27.5 H20.5 Z" fill={c.g} stroke={c.g} strokeWidth="1" strokeLinejoin="round" />
  </>),
  cutoff: c => (<>
    <rect x="8" y="4" width="24" height="32" rx="5" fill="none" stroke={c.w} strokeWidth="2.4" />
    <path d="M15.6 13.6 A4.6 4.6 0 1 1 22.9 17.4 C21.3 18.4 20.2 19.5 20.2 21.6" fill="none" stroke={c.a} strokeWidth="2.8" strokeLinecap="round" />
    <circle cx="20.2" cy="25.6" r="1.8" fill={c.a} />
    <path d="M12.5 31 H27.5" stroke={c.m} strokeWidth="2.5" strokeLinecap="round" />
    <path d="M12.5 31 H21" stroke={c.g} strokeWidth="2.5" strokeLinecap="round" />
  </>),
  delta: c => (<>
    <path d="M20 5 L34 27 H6 Z" fill="none" stroke={c.w} strokeWidth="2.8" strokeLinejoin="round" />
    <rect x="6" y="31" width="8.5" height="4" rx="2" fill={c.pu} />
    <rect x="15.75" y="31" width="8.5" height="4" rx="2" fill={c.gr} />
    <rect x="25.5" y="31" width="8.5" height="4" rx="2" fill={c.ye} />
  </>),
  crew: c => (<>
    <circle cx="20" cy="19" r="8.5" fill="none" stroke={c.w} strokeWidth="3.8" />
    <circle cx="20" cy="19" r="2.6" fill={c.w} />
    <path d="M3 19 H8.5 M6.2 15.6 L9.6 19 L6.2 22.4" fill="none" stroke={c.a} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M37 19 H31.5 M33.8 15.6 L30.4 19 L33.8 22.4" fill="none" stroke={c.g} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M13 34 H27" stroke={c.m} strokeWidth="2.5" strokeLinecap="round" />
  </>),
  telemetry: c => (<>
    <rect x="4" y="6" width="32" height="24" rx="4" fill="none" stroke={c.m} strokeWidth="2" />
    <path d="M7.5 24 H11 L13 12.5 H17 L19 20.5 H23 L25 11 H28.5 L30.5 18 H32.5" fill="none" stroke={c.w} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="30.5" cy="31" r="6.5" fill={c.a} />
    <path d="M28.4 29.4 A2.2 2.2 0 1 1 31.6 31.3 C30.9 31.7 30.6 32.1 30.6 32.9" fill="none" stroke={c.k} strokeWidth="1.9" strokeLinecap="round" />
    <circle cx="30.6" cy="35" r="1" fill={c.k} />
  </>),
  engineer: c => (<>
    <path d="M11.5 10.5 C11.5 4.8 28.5 4.8 28.5 10.5" fill="none" stroke={c.a} strokeWidth="2.4" strokeLinecap="round" />
    <rect x="8.8" y="8.5" width="4.4" height="6.5" rx="2" fill={c.a} />
    <rect x="26.8" y="8.5" width="4.4" height="6.5" rx="2" fill={c.a} />
    <path d="M7 21 C7 18.2 9.2 16 12 16 H28 C30.8 16 33 18.2 33 21 V26.5 C33 29.5 30.5 32 27.5 32 H25 L23 35 H17 L15 32 H12.5 C9.5 32 7 29.5 7 26.5 Z" fill="none" stroke={c.w} strokeWidth="2.4" strokeLinejoin="round" />
    <rect x="15.5" y="19.5" width="9" height="5.5" rx="1.2" fill={c.g} />
    <circle cx="11.5" cy="25" r="1.6" fill={c.w} />
    <circle cx="28.5" cy="25" r="1.6" fill={c.w} />
  </>),
  stewards: c => (<>
    <g transform="rotate(-40 21 14)">
      <rect x="12" y="8" width="18" height="7.5" rx="2.5" fill={c.w} />
      <rect x="19.6" y="15.5" width="2.8" height="16" rx="1.4" fill={c.w} />
    </g>
    <rect x="4.5" y="31" width="17" height="4.5" rx="2" fill={c.a} />
    <path d="M7.5 26.5 L5 24.3 M11.5 25.6 L10.8 22.5" stroke={c.g} strokeWidth="2.2" strokeLinecap="round" />
  </>),
  radar: c => (<>
    <path d="M20 5 L33 12.5 L33 27.5 L20 35 L7 27.5 L7 12.5 Z" fill="none" stroke={c.m} strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M20 12 L26.9 16 L26.9 24 L20 28 L13.1 24 L13.1 16 Z" fill="none" stroke={c.m} strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M20 20 L20 5 M20 20 L33 12.5 M20 20 L33 27.5 M20 20 L20 35 M20 20 L7 27.5 M20 20 L7 12.5" stroke={c.m} strokeWidth="1.2" />
    <path d="M20 8 L30.4 14 L28.7 25 L20 31 L11.3 25 L13.9 16.5 Z" fill={c.a} fillOpacity=".28" stroke={c.a} strokeWidth="2.2" strokeLinejoin="round" />
    <circle cx="20" cy="8" r="1.9" fill={c.g} />
    <circle cx="28.7" cy="25" r="1.9" fill={c.g} />
  </>),
  attack: c => (<>
    <path d="M3 16.5 H8.5 M2 22.5 H7.5 M3 28.5 H8.5" stroke={c.g} strokeWidth="2.4" strokeLinecap="round" />
    <circle cx="23.5" cy="22.5" r="12" fill="none" stroke={c.w} strokeWidth="2.6" />
    <rect x="21" y="5" width="5" height="3.2" rx="1.2" fill={c.w} />
    <path d="M32.5 12.5 L34.5 10.5" stroke={c.w} strokeWidth="2.6" strokeLinecap="round" />
    <path d="M23.5 22.5 L28.5 16.8" stroke={c.a} strokeWidth="2.8" strokeLinecap="round" />
    <circle cx="23.5" cy="22.5" r="2.2" fill={c.a} />
  </>),
  stint: c => (<>
    <path d="M15 4.5 C15 4.5 6 14.5 6 21.5 A9 9 0 0 0 24 21.5 C24 14.5 15 4.5 15 4.5 Z" fill="none" stroke={c.w} strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M9.2 22 C11.5 20.5 13.5 23.5 15.5 22 C17.5 20.5 19.2 23 20.8 22" fill="none" stroke={c.a} strokeWidth="2.4" strokeLinecap="round" />
    <circle cx="31" cy="30.5" r="5" fill="none" stroke={c.g} strokeWidth="3" />
    <circle cx="31" cy="30.5" r="1.6" fill={c.g} />
  </>),
};
function GarageIcon({ id, soon = false, size = 62 }) {
  const glyph = GARAGE_GLYPHS[id];
  const R = Math.round(size * 0.28), G = Math.round(size * 0.64), B = Math.max(14, Math.round(size * 0.3)), off = Math.round(size * 0.06);
  return (
    <span data-garage-icon={id} aria-hidden="true" style={{ position: "relative", width: size, height: size, flexShrink: 0, boxSizing: "border-box", borderRadius: R, display: "flex", alignItems: "center", justifyContent: "center",
      background: "#0C0C0F radial-gradient(rgba(255,255,255,.075) .9px, transparent 1.15px) 0 0/6px 6px", border: `1px ${soon ? "dashed rgba(255,255,255,.2)" : "solid rgba(255,255,255,.09)"}`, boxShadow: "inset 0 1px 0 rgba(255,255,255,.05)" }}>
      {glyph && <svg viewBox="0 0 40 40" width={G} height={G} style={{ display: "block" }}>{glyph(soon ? GARAGE_INK_SOON : GARAGE_INK(C.accentInk))}</svg>}
      {soon && (
        <span data-soon-clock="" style={{ position: "absolute", right: off, bottom: off, width: B, height: B, borderRadius: "50%", background: "#E7B34C", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 2px #0C0C0F" }}>
          <svg viewBox="0 0 24 24" width={Math.round(B * 0.64)} height={Math.round(B * 0.64)} fill="none" stroke="#15120A" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8" /><path d="M12 7.5v5l3 2" /></svg>
        </span>
      )}
    </span>
  );
}

// Giochi e strumenti annunciati nel Garage ("In arrivo"): non si aprono ancora.
const GARAGE_SOON = [
  ["reaction", "Reaction Test 1v1", "Il duello dei semafori: sfida un amico sui millisecondi della partenza."],
  ["cutoff", "Quiz Cut-Off", "Stessa domanda per due: chi risponde giusto per primo ruba un decimo all'altro."],
  ["delta", "Delta Time Trial", "Il tuo tempo su F1 24 o GT7 contro quello di un amico, settore per settore."],
  ["crew", "Pit Stop Crew Challenge", "Il pit stop in due, in tempo reale: l'ordine sbagliato costa 1,5 secondi."],
  ["telemetry", "Guess the Telemetry", "Un grafico di telemetria vero: indovina pilota e pista in 15 secondi."],
  ["engineer", "Pilota & Ingegnere", "In due: uno guida, l'altro dal muretto decide gomme e soste."],
  ["stewards", "Tribunale dei Commissari", "Un incidente, due difese: decide la community."],
  ["radar", "Setup Radar", "Distribuisci i punti dell'assetto e avvicinati al setup ideale della pista."],
  ["attack", "B&T Time Attack", "La sfida della settimana su F1 24 o GT7, con la classifica stile tabellone F1."],
  ["stint", "Stint Analyzer & Fuel Calculator", "Durata della gara e consumi: calo delle gomme e benzina da imbarcare."],
];

function GarageScreen({ races, pitBest, onPitResult, sillyPreds, onPredict, sillyOfficial, live, stratPreds = {}, onStrat, bluffTags = [], onBluffRefresh }) {
  const [game, setGame] = useState(null);
  const back = () => setGame(null);
  useBack(!!game, back);   // tasto indietro: dallo strumento si torna al Garage
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
  if (game === "bluff") return <BluffTool races={races} live={live} tags={bluffTags} onRefresh={onBluffRefresh} onBack={back} />;
  const card = (id, title, sub, tag) => (
    <button key={id} className="press" data-game={id} onClick={() => setGame(id)} style={{ display: "flex", alignItems: "center", gap: 12, width: "calc(100% - 32px)", margin: "0 16px 12px", padding: 14, borderRadius: 18, background: C.card, border: `1px solid ${C.border}`, textAlign: "left" }}>
      <GarageIcon id={id} />
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
      {card("deg", "Degrado gomme", "Quanto perde ogni gomma a ogni giro e quando arriva il crollo.", live && live.type === "RACE" ? liveSrcLabel(live) : "Gare vere 2026")}
      {card("mates", "Compagni a confronto", "Stessa macchina, chi va più forte? L'indice Over-Driving e i testa a testa del 2026.", "Dati veri 2026")}
      {card("bluff", "Rilevatore di bluff", "Radio contro tempi: le gomme sono davvero finite o è un bluff per ingannare gli altri?", isOf1Live(live) ? "Radio vere · " + OF1_SRC : isDemoLive(live) ? "Prova DEMO (simulata)" : "Durante la gara")}
      <div style={{ padding: "6px 18px 8px", fontFamily: F_BODY, fontWeight: 700, fontSize: 11, letterSpacing: 1.2, color: C.gold }}>TRACCIATI</div>
      {card("guide", "Guida 2D dei tracciati", "Tocca le curve: marcia, velocità, punto di staccata, rischio di bloccaggio e il momento storico B&T.", "Dati veri")}
      {card("clash", "Circuit Spec Clash", "Due piste a confronto: Safety Car, sorpassi, frenate, gas a tavoletta e carico aerodinamico.", null)}
      <div style={{ padding: "6px 18px 8px", fontFamily: F_BODY, fontWeight: 700, fontSize: 11, letterSpacing: 1.2, color: C.gold }}>ANALISI CON DATI VERI</div>
      {card("ghost", `Ghost Lap · qualifiche di ${ghostSessions().length ? ghostSessions()[0][1] : "Baku"}`, "Due giri veri a confronto: velocità, frenate e replay 2D di ogni curva.", "Dati veri")}
      {/* Idee di Edoardo del 3-6/10 (documento "Idee nuove"): per ora solo annunciate (18/10: "creale ma mettile come in arrivo"). */}
      <div style={{ padding: "6px 18px 8px", fontFamily: F_BODY, fontWeight: 700, fontSize: 11, letterSpacing: 1.2, color: C.gold }}>IN ARRIVO</div>
      {GARAGE_SOON.map(([id, title, sub]) => (
        <div key={id} data-soon={id} style={{ display: "flex", alignItems: "center", gap: 12, margin: "0 16px 10px", padding: "12px 14px", borderRadius: 16, background: "transparent", border: `1px dashed ${C.border}` }}>
          <GarageIcon id={id} soon size={48} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontFamily: F_HEAD, fontWeight: 800, fontStyle: "italic", fontSize: 14.5, color: C.muted }}>{title}</span>
            <span style={{ display: "block", marginTop: 3, fontFamily: F_BODY, fontSize: 11.5, color: C.dim, lineHeight: 1.35 }}>{sub}</span>
          </span>
          <span style={{ flexShrink: 0, padding: "3px 8px", borderRadius: 6, background: "rgba(231,179,76,.14)", fontFamily: F_BODY, fontWeight: 700, fontSize: 10, letterSpacing: .4, color: C.gold }}>IN ARRIVO</span>
        </div>
      ))}
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
        {cap && <div data-ghost-caption="" style={{ position: "absolute", left: 8, right: 8, bottom: 8, padding: "6px 9px", borderRadius: 8, background: alpha(C.accent, .92), fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 13, color: "#fff", textAlign: "center" }}>{capText}</div>}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: 8 }}>
        {btn({ "data-ghost-play": "" }, play ? "Pausa" : "Play", play, () => { setPlay(x => !x); setCap(null); })}
        {btn({ "data-ghost-slow": "" }, "Rallenty", slow, () => setSlow(x => !x))}
        {[["frenata", "Frenata"], ["apice", "Apice"], ["uscita", "Uscita"]].map(([kk, l]) => <React.Fragment key={kk}>{btn({ "data-ghost-freeze": kk }, <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="media-pause" size={11} color="#fff" sw={2.4} />{l}</span>, cap === kk, () => freeze(kk))}</React.Fragment>)}
      </div>
      <p style={{ margin: 0, padding: "0 10px 9px", fontFamily: F_BODY, fontSize: 10.5, color: C.dim, lineHeight: 1.4 }}>Le due vetture entrano nella curva insieme: la distanza tra loro è solo quella guadagnata in questa curva. Posizioni da GPS (circa 4 al secondo, interpolate).</p>
    </div>
  );
}
// Qualifiche con i dati veri, dalla più recente: il Ghost Lap si apre sempre sull'ultima.
const GHOST_SESSIONS = [["sepang2026q", "Sepang"], ["baku2026q", "Baku"]];
const ghostSessions = () => GHOST_SESSIONS.filter(([id]) => typeof BtRealData !== "undefined" && BtRealData && BtRealData[id]);
// Ghost Lap nella pagina Race (18/10): solo dopo le qualifiche di quel GP. Si guarda il GP delle ultime qualifiche
// corse: se l'app ha i suoi giri veri si vede, altrimenti (qualifiche di un GP dopo) no.
const GHOST_CIRCUIT = { sepang2026q: "my-1999", baku2026q: "az-2016" };
function ghostForNow(races, now) {
  let last = null;
  (races || []).forEach(r => {
    const w = CIRCUIT_INFO[r.circuitId] && CIRCUIT_INFO[r.circuitId].weekend;
    const q = Array.isArray(w) ? w.find(x => x.key === "QUALI") : null;
    const t = q ? Date.parse(q.utc) : Date.parse(String(r.date || "").slice(0, 10) + "T12:00:00Z") - 86400000;
    if (isFinite(t) && t <= now && (!last || t > last.t)) last = { r, t };
  });
  return last ? ghostSessions().find(([id]) => GHOST_CIRCUIT[id] === last.r.circuitId) || null : null;
}
// init (25/10): aperto da un link della chat, sulla sessione, i piloti e la curva del link.
function GhostLap({ sessionId, init = null, onBack }) {
  const list = ghostSessions();
  const [sid, setSid] = useState(init && init.s && BtRealData[init.s] ? init.s : sessionId && BtRealData[sessionId] ? sessionId : list[0][0]);
  const S = BtRealData[sid], codes = Object.keys(S.laps);
  const [a0, setA] = useState(init && S.laps[init.a] ? init.a : codes[0]), [b0, setB] = useState(init && S.laps[init.b] && init.b !== init.a ? init.b : codes[1]);
  const [cur, setCur] = useState(null), [cn, setCn] = useState(init && S.corners.some(c => c.n === init.n) ? init.n : null), [replay, setReplay] = useState(false);
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
      {codes.map(c => { const I = ghostInfo(c), on = c === sel; return <button key={c} className="press" {...{ ["data-ghost-" + side]: c }} aria-pressed={on ? "true" : "false"} disabled={c === other} onClick={() => { set(c); setReplay(false); }} style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: 5, padding: "5px 8px", borderRadius: 9, background: on ? alpha(C.accentInk, .18) : "rgba(255,255,255,.05)", border: `1px solid ${on ? C.accentInk : C.border}`, opacity: c === other ? .35 : 1 }}><span style={{ width: 3, height: 12, borderRadius: 2, background: I.color }} /><b style={{ fontFamily: F_HEAD, fontSize: 11.5, color: C.text }}>{c}</b></button>; })}
    </div>
  );
  const capBrake = !duel ? "" : duel.brake.later == null ? "QUI NESSUNO FRENA: CURVA IN PIENO" : duel.brake.later === "pari" ? "STESSO PUNTO DI FRENATA" : `${(duel.brake.later === "A" ? IA : IB).last} FRENA ${duel.brake.diff.toFixed(1).replace(".", ",").replace(",0", "")} m DOPO`;
  const row = (label, va, vb, fmt) => <div style={{ display: "grid", gridTemplateColumns: "1fr 72px 72px", gap: 6, padding: "5px 0", borderTop: `1px solid ${C.divider}`, fontFamily: F_BODY, fontSize: 12, color: C.muted }}><span>{label}</span><b style={{ textAlign: "right", color: C.text, fontFamily: F_HEAD }}>{va == null ? "–" : fmt(va)}</b><b style={{ textAlign: "right", color: C.text, fontFamily: F_HEAD }}>{vb == null ? "–" : fmt(vb)}</b></div>;
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
        <svg data-ghost-chart="speed" data-swipe-own="" viewBox={`0 0 ${W} 150`} onPointerMove={scrub} onPointerDown={scrub} style={{ display: "block", width: "100%", touchAction: "pan-y", cursor: "crosshair" }} role="img" aria-label={`Velocità di ${IA.code} e ${IB.code} lungo il giro`}>
          {[100, 200, 300].map(v => <g key={v}><line x1={padL} x2={W - padR} y1={YV(v)} y2={YV(v)} stroke="rgba(255,255,255,.07)" /><text x={padL - 4} y={YV(v) + 3} textAnchor="end" fill={C.dim} fontFamily={F_BODY} fontSize="8.5">{v}</text></g>)}
          {(() => { let lastX = -99; return S.corners.map(c => { const x = X(c.d), show = c.n === cn || x - lastX >= 9; if (show) lastX = x; return <g key={c.n}><line x1={x} x2={x} y1="138" y2="142" stroke={c.n === cn ? C.gold : "rgba(255,255,255,.25)"} />{show && <text x={x} y="149" textAnchor="middle" fill={c.n === cn ? C.gold : C.dim} fontFamily={F_BODY} fontSize="6.5">{c.n}</text>}</g>; }); })()}
          <polyline points={line(B, YV)} fill="none" stroke={IB.color} strokeWidth="1.8" strokeDasharray={same ? "4 3" : undefined} opacity=".95" />
          <polyline points={line(A, YV)} fill="none" stroke={IA.color} strokeWidth="1.8" />
          {cur != null && <g><line x1={X(cur)} x2={X(cur)} y1="8" y2="138" stroke="#fff" strokeWidth="1" opacity=".6" /><circle cx={X(cur)} cy={YV(val(A, "v"))} r="3.5" fill={IA.color} stroke="#fff" /><circle cx={X(cur)} cy={YV(val(B, "v"))} r="3.5" fill={IB.color} stroke="#fff" /></g>}
        </svg>
        <div style={{ padding: "6px 4px 2px", fontFamily: F_BODY, fontWeight: 700, fontSize: 10.5, letterSpacing: 1, color: C.dim }}>DISTACCO DI {IB.code} DA {IA.code} (sopra la riga {IB.code} è dietro)</div>
        <svg data-ghost-chart="delta" data-swipe-own="" viewBox={`0 0 ${W} 80`} onPointerMove={scrub} onPointerDown={scrub} style={{ display: "block", width: "100%", touchAction: "pan-y", cursor: "crosshair" }}>
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
            <div style={{ marginTop: 10 }}><ShareChatBtn k={{ t: "ghost", s: sid, a: IA.code, b: IB.code, n: duel.n, ti: `${S.name} · curva ${duel.n}: ${IA.code} contro ${IB.code}`, su: ghostGain(duel, IA, IB) }} /></div>
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
          <button key={x.id} className="press" data-rating-driver={x.id} aria-pressed={on ? "true" : "false"} onClick={() => choose(x.id)} style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: 5, padding: "6px 9px", borderRadius: 10, background: on ? alpha(C.accentInk, .18) : "rgba(255,255,255,.05)", border: `1px solid ${on ? C.accentInk : C.border}` }}>
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
              <button className="press" data-rate-send="" disabled={!complete} onClick={() => { if (!complete) return; onRate(sessionKey, cur, { ...draft }); setDraft(null); }} style={{ flex: 2, padding: "10px 12px", borderRadius: 11, background: complete ? C.accent : alpha(C.accent, .3), fontFamily: F_HEAD, fontWeight: 800, fontSize: 12.5, color: complete ? "#fff" : "rgba(255,255,255,.55)" }}>{complete ? "INVIA IL VOTO" : (n => n === 1 ? "Manca 1 parametro" : `Mancano ${n} parametri`)(P.filter(([k]) => !draft[k]).length)}</button>
            </div>
          </div>
        )}
    </div>
  );
}

// Stato di OpenF1 per la gara LIVE quando non c'è ancora la sessione da rivedere: bloccato durante la sessione, dati
// che non arrivano, elenchi vuoti o caricamento.
function Of1Status({ of1, standings, onRefresh }) {
  const card = { margin: "0 16px 14px", padding: 14, borderRadius: 18, background: C.card, border: `1px solid ${C.border}` };
  const refresh = onRefresh ? <button className="press" data-of1-refresh="" onClick={onRefresh} style={{ marginTop: 10, padding: "8px 12px", borderRadius: 10, background: "rgba(255,255,255,.07)", border: `1px solid ${C.border}`, fontFamily: F_HEAD, fontWeight: 800, fontSize: 12, color: C.text }}>↻ Aggiorna</button> : null;
  if (of1.status === "locked") {
    const top = standings.drivers.slice().sort((a, b) => a.position - b.position).slice(0, 10);
    return (
      <div data-of1-locked="" style={card}>
        <Eyebrow color={C.gold}>SESSIONE IN CORSO</Eyebrow>
        <p style={{ margin: 0, fontFamily: F_BODY, fontSize: 12.5, color: C.muted, lineHeight: 1.55 }}>Posizioni, gomme, pit stop, tempi e team radio saranno disponibili qui circa 30 minuti dopo la fine della sessione. Intanto segui la classifica mondiale e commenta in chat!</p>
        {refresh}
        <div style={{ marginTop: 12, borderTop: `1px solid ${C.divider}` }}>
          {top.map(r => { const d = standingsDriver(r.id); return (
            <div key={r.id} data-of1-standing={r.position} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 2px", borderBottom: `1px solid ${C.divider}` }}>
              <span style={{ width: 20, fontFamily: F_HEAD, fontWeight: 800, fontSize: 13, color: r.position <= 3 ? C.gold : C.text }}>{r.position}</span>
              <span style={{ flex: 1, fontFamily: F_BODY, fontWeight: 600, fontSize: 12.5, color: C.text }}>{d ? d.full : r.id}</span>
              <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 12.5, color: C.text }}>{r.points}<span style={{ fontFamily: F_BODY, fontWeight: 600, fontSize: 10, color: C.dim }}> pt</span></span>
            </div>
          ); })}
        </div>
      </div>
    );
  }
  const text = of1.status === "error" ? "Impossibile raggiungere il servizio dati. Riprova tra poco." : of1.status === "empty" ? "Dati non ancora disponibili" : "Caricamento dei dati della sessione…";
  return (
    <div data-of1-status={of1.status} role="status" style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, fontFamily: F_HEAD, fontWeight: 800, fontSize: 13.5, color: C.text }}>{of1.status === "loading" && <LedGrid mode="seq" size={4} />}{text}</div>
      {of1.status === "empty" && <p style={{ margin: "4px 0 0", fontFamily: F_BODY, fontSize: 12, color: C.muted, lineHeight: 1.5 }}>I dati veri della sessione arrivano da OpenF1 circa 30 minuti dopo la fine.</p>}
      {of1.status !== "loading" && refresh}
    </div>
  );
}

// Chiama onEnd quando si arriva in fondo (29/10: la pubblicità in fondo alla classifica).
function EndSpy({ onEnd }) {
  const ref = useRef(null), cb = useRef(onEnd);
  cb.current = onEnd;
  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) cb.current(); });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} data-end-spy="" aria-hidden="true" style={{ height: 1 }} />;
}
function RaceScreen({ onStandingsEnd = null, isPremium, onPremium, onSelectDriver, races, standings, live, liveSt, onExpandMap, onTelemetry, onOpenCircuit, wxGuess, wxResult, onGuessWeather, onLapTimes, onSecondScreen, lastRace, dotdVote, onDotdVote, ratings = {}, onRate, onOpenChats, onOpenGhost, of1 = null, onOf1Refresh, replay = null, favDriver = null }) {
  const [tab, setTab] = useState(null);
  // Pit Board (G27): si vede quando la tabella dei tempi arriva in cima alla pagina (stato cambiato solo al passaggio).
  const scRef = useRef(null), tblRef = useRef(null);
  const [board, setBoard] = useState(false);
  const checkBoard = () => { const sc = scRef.current, tb = tblRef.current; const v = !!(sc && tb && tb.getBoundingClientRect().top < sc.getBoundingClientRect().top + 4); setBoard(b => (b === v ? b : v)); };
  const [champ, setChamp] = useState("piloti");
  const st = live ? liveSt : null;
  const tabs = st ? [["classifica", "Tempi"], ["radio", "Radio"], ["meteo", "Meteo"], ["gomme", "Gomme"], ["messaggi", "Direzione gara"], ["mondiale", "Mondiale"]]
    : [["mondiale", "Mondiale"], ["classifica", "Ultima gara"], ["radio", "Radio"], ["meteo", "Meteo"], ["gomme", "Gomme"]];
  // Senza sessione (18/10): di serie il mondiale; l'ultima gara nella sua scheda.
  const curTab = tab && tabs.some(t => t[0] === tab) ? tab : tabs[0][0];
  const subDir = useSlideFrom(tabs.findIndex(t => t[0] === curTab));   // 25/10: da che parte entra il contenuto
  const liveRace = live ? races.find(r => r.id === live.raceId) : null;
  const next = races.find(r => r.status === "IN ARRIVO");
  const realLive = races.find(r => r.status === "LIVE") || null;
  const shown = liveRace || realLive || next;
  const done = races.filter(r => r.status === "CONCLUSA").length;
  const card = { margin: "0 16px 16px", borderRadius: 18, background: C.card, border: `1px solid ${C.border}`, overflow: "hidden" };
  useEffect(checkBoard, [curTab, !!st]);
  return (
    <div className="scrollcol" ref={scRef} onScroll={checkBoard} style={{ height: "100%" }}>
      {st && curTab === "classifica" && <PitBoard st={st} driverId={favDriver} visible={board} />}
      {st && liveRace && st.finished && isRaceType(st.type) && <FinishPodium st={st} race={liveRace} onSelectDriver={onSelectDriver} />}
      {st && liveRace ? <LiveCard race={liveRace} st={st} track={live.track} source={live.source} onExpand={onExpandMap} replay={replay} /> : (
      <div style={{ position: "relative", margin: "4px 16px 14px", borderRadius: 18, overflow: "hidden", background: C.card, border: `1px solid ${C.border}` }}>
        {shown && <CircuitArt circuitId={shown.circuitId} uid="next" />}
        {shown && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(13,13,16,.94) 0%, rgba(13,13,16,.72) 48%, rgba(13,13,16,.18) 100%)" }} />}
        <div style={{ position: "relative", padding: "18px 16px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          {/* Gara messa LIVE dall'admin (shared/bt-races): "In diretta", senza dati simulati (D23); i dati veri arrivano da OpenF1. */}
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: shown && shown.status === "LIVE" ? C.accentInk : C.gold }} />
          <span style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 11, color: shown && shown.status === "LIVE" ? C.accentInk : C.gold, letterSpacing: 1.2 }}>{shown && shown.status === "LIVE" ? "IN DIRETTA" : "PROSSIMA GARA"}</span>
          <div style={{ flexGrow: 1 }} />
          <span style={{ fontFamily: F_BODY, fontWeight: 600, fontSize: 12, color: C.muted }}>{shown ? `ROUND ${shown.round}/${races.length}` : `${done}/${races.length}`}</span>
        </div>
        <h1 style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 20, color: C.text, margin: "0 0 4px" }}>{shown ? shown.name : "Stagione conclusa"}</h1>
        <span style={{ display: "block", fontFamily: F_BODY, fontSize: 13, color: C.muted }}>{shown ? `${shown.circuit} · ${fmtDate(shown.date)}` : `${done} gare disputate`}</span>
        {shown && CIRCUIT_INFO[shown.circuitId] && <CircuitCta circuitId={shown.circuitId} onOpen={() => onOpenCircuit && onOpenCircuit(shown.circuitId)} />}
        </div>
      </div>
      )}
      {!st && realLive && of1 && of1.raceId === realLive.id && of1.status !== "idle" && of1.status !== "ok" && <Of1Status of1={of1} standings={standings} onRefresh={onOf1Refresh} />}
      {st && liveRace && st.type === "RACE" && <DotdCard st={st} race={liveRace} vote={dotdVote || {}} onVote={onDotdVote} />}
      {st && liveRace && st.finished && isRaceType(st.type) && (() => { const key = liveRace.id + ":" + st.type; return (
        <RatingsCard key={key} sessionKey={key} title={liveRace.name + (st.type === "SPRINT" ? " · Sprint" : "")} seed={liveRace.round * 10 + (st.type === "SPRINT" ? 1 : 0)} mine={ratings[key] || {}} onRate={onRate}
          field={st.cars.map(c => ({ id: c.id, pos: c.dnf ? null : c.pos, dnf: c.dnf ? c.dnf.cause : null, grid: c.grid, stops: c.stops }))} />
      ); })()}
      {st && liveRace && isRaceType(st.type) && <InsightsCard live={live} st={st} race={liveRace} />}

      <button className="press" onClick={() => onSecondScreen && onSecondScreen()} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "calc(100% - 32px)", margin: "0 16px 14px", padding: "11px 14px", borderRadius: 12, background: `linear-gradient(rgba(231,179,76,.1), rgba(231,179,76,.1)) ${C.bg}`, border: "1px solid rgba(231,179,76,.3)" }}>
        <Icon name="grid" size={14} color={C.gold} />
        <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 12, color: C.gold }}>Modalità Second Screen</span>
        <span style={{ fontFamily: F_BODY, fontSize: 10.5, color: C.muted }}>· in orizzontale</span>
      </button>
      {onOpenGhost && !st && ghostForNow(races, nowMs()) && (() => { const [gid, gname] = ghostForNow(races, nowMs()), gc = Object.keys(BtRealData[gid].laps), surn = c => ghostInfo(c).name.split(" ").slice(-1)[0]; return (
        <button className="press" data-ghost-open={gid} onClick={onOpenGhost} style={{ display: "block", width: "calc(100% - 32px)", margin: "0 16px 14px", padding: 14, borderRadius: 16, textAlign: "left", background: `linear-gradient(120deg, ${alpha(C.accentInk, .24)}, rgba(24,24,28,1) 62%)`, border: `1px solid ${alpha(C.accentInk, .45)}` }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ flexShrink: 0, whiteSpace: "nowrap", padding: "2px 7px", borderRadius: 6, background: C.accent, fontFamily: F_HEAD, fontWeight: 900, fontSize: 10, color: "#fff" }}>DATI VERI</span><span style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 15, color: C.text }}>GHOST LAP · QUALIFICHE DI {gname.toUpperCase()}</span></span>
          <span style={{ display: "block", marginTop: 5, fontFamily: F_BODY, fontSize: 12, color: C.muted, lineHeight: 1.4 }}>Il giro più veloce di {surn(gc[0])} contro {gc.slice(1, 4).map(surn).join(", ")} e gli altri: velocità metro per metro, curva per curva e replay 2D.</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 8, fontFamily: F_HEAD, fontWeight: 800, fontSize: 12, color: C.gold }}>Apri il Ghost Lap <Icon name="chevron" size={12} color={C.gold} sw={2.6} /></span>
        </button>
      ); })()}
      {onOpenChats && (
        <button className="press" data-race-chat="" onClick={onOpenChats} style={{ display: "flex", alignItems: "center", gap: 10, width: "calc(100% - 32px)", margin: "0 16px 14px", padding: "11px 14px", borderRadius: 14, background: C.card, border: `1px solid ${C.border}`, textAlign: "left" }}>
          <span style={{ width: 36, height: 36, borderRadius: 12, background: alpha(C.accentInk, .16), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="chat" size={18} color={C.accentInk} /></span>
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

      <div key={curTab} data-race-pane={curTab} data-sub-enter={subDir || undefined} className={subDir ? "sub-enter-" + subDir : undefined}>
      {curTab === "classifica" && st && <div ref={tblRef}><TimingTable st={st} onTelemetry={onTelemetry} onSelectDriver={onSelectDriver} onLapTimes={onLapTimes} /></div>}
      {curTab === "messaggi" && st && <RaceControlList messages={st.messages} />}
      {curTab === "meteo" && <WeatherPanel race={shown} st={st} live={live} guesses={wxGuess} results={wxResult} onGuess={onGuessWeather} />}

      {curTab === "classifica" && !st && lastRace && <LastRaceCard race={lastRace} onSelectDriver={onSelectDriver} />}
      {curTab === "classifica" && !st && lastRace && (() => { const key = lastRace.raceId + ":" + (lastRace.type || "RACE"); return (
        <RatingsCard key={key} sessionKey={key} title={lastRace.name} seed={(+String(lastRace.raceId).replace(/\D/g, "") || 1) * 10} mine={ratings[key] || {}} onRate={onRate}
          field={lastRace.rows.map(x => ({ id: x.id, pos: x.pos || null, dnf: x.dnf || null }))} />
      ); })()}

      {curTab === "gomme" && (
        <div data-tyres="" style={{ ...card, padding: "4px 0" }}>
          {!st && <p data-tyres-empty="" style={{ margin: 0, padding: 16, fontFamily: F_BODY, fontSize: 12.5, color: C.dim, lineHeight: 1.5 }}>{TYRES_EMPTY}</p>}
          {st && st.cars.map((c, i) => { const d = driverById(c.id), laps = c.tyreAge != null ? `${c.tyreAge} ${c.tyreAge === 1 ? "giro" : "giri"}` : "–"; return (
            <div key={c.id} data-tyre-row={c.id} style={{ padding: "11px 16px", borderBottom: i < st.cars.length - 1 ? `1px solid ${C.divider}` : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span style={{ width: 20, fontFamily: F_HEAD, fontWeight: 800, fontSize: 13, color: C.text }}>{c.pos}</span>
                {d && <Headshot driver={d} size={28} />}
                <span style={{ flex: 1, minWidth: 0, fontFamily: F_BODY, fontWeight: 600, fontSize: 13, color: C.text }}>{d ? d.full : c.code}</span>
                <span title={tyreUi(c.tyre)[1]} style={{ width: 12, height: 12, borderRadius: "50%", border: `2.5px solid ${tyreUi(c.tyre)[0]}`, flexShrink: 0 }} />
                <span style={{ fontFamily: F_BODY, fontSize: 11.5, color: c.dnf ? "#FF5A5F" : C.muted, whiteSpace: "nowrap" }}>{c.dnf ? "Ritirato" : `${tyreUi(c.tyre)[1]} · ${laps}${c.pit ? " · ai box" : ""}`}</span>
              </div>
              {c.wear != null && <div style={{ height: 5, marginTop: 7, borderRadius: 3, background: "rgba(255,255,255,.08)", overflow: "hidden" }}><div style={{ height: "100%", width: c.wear + "%", borderRadius: 3, background: c.wear > 50 ? C.red : C.green }} /></div>}
            </div>
          ); })}
        </div>
      )}

      {curTab === "mondiale" && (
        <div style={{ margin: "0 16px 16px" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {[["piloti", "Piloti"], ["costruttori", "Costruttori"]].map(([id, l]) => (
              <button key={id} className="press" onClick={() => setChamp(id)} style={{ padding: "7px 14px", borderRadius: 999, background: champ === id ? alpha(C.accentInk, .16) : "rgba(255,255,255,.05)", border: `1px solid ${champ === id ? C.accentInk : C.border}`, fontFamily: F_BODY, fontWeight: 700, fontSize: 11.5, color: champ === id ? C.text : C.muted }}>{l}</button>
            ))}
          </div>
          {!st && (() => {
            const top = (champ === "piloti" ? standings.drivers : standings.teams).slice().sort((a, b) => a.position - b.position).slice(0, 3);
            const tr = r => ({ trend: <PosTrend pos={r.position} prev={r.prev} />, trendLabel: posTrendLabel(r.position, r.prev) });
            const items = champ === "piloti" ? driverPodium(top.map(r => ({ id: r.id, value: r.points + " pt", ...tr(r) })), onSelectDriver)
              : top.map((r, i) => { const t = teamById(r.id); return t ? { title: t.name, value: r.points + " pt", ...tr(r), figure: <TeamFigure team={t} place={i + 1} /> } : null; }).filter(Boolean);
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
                    <span style={{ width: 26, display: "flex", flexDirection: "column", alignItems: "flex-start", flexShrink: 0 }}>
                      <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 14, color: row.position <= 3 ? C.gold : C.text }}>{row.position}</span>
                      <PosTrend pos={row.position} prev={row.prev} size={9.5} />
                    </span>
                    {d ? <Headshot driver={d} size={32} /> : <TeamBadge team={t} size={32} />}
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
          {onStandingsEnd && <EndSpy onEnd={onStandingsEnd} />}
        </div>
      )}

      {curTab === "radio" && (
        <div data-radios="" style={card}>
          {isOf1Live(live) && st ? <RadioList live={live} st={st} />
            : st ? radioFeed(st, 6).map((r, i, all) => (
              <div key={i} data-radio-demo="" style={{ padding: "12px 16px", borderBottom: i < all.length - 1 ? `1px solid ${C.divider}` : "none", fontFamily: F_BODY, fontSize: 12.5, color: C.muted, lineHeight: 1.4 }}><b style={{ color: C.text, fontFamily: F_HEAD }}>{r.who}</b> <span style={{ color: C.dim }}>{r.when} · DEMO</span><br />{r.text}</div>
            ))
            : <p data-radio-empty="later" style={{ margin: 0, padding: 16, fontFamily: F_BODY, fontSize: 12.5, color: C.dim, lineHeight: 1.5 }}>{RADIO_EMPTY}</p>}
        </div>
      )}
      </div>
      </>
    </div>
  );
}

// Pagina Instagram rinnovata (25/10, dalla grafica approvata): profilo col logo B&T, follower e post scritti
// dall'admin, l'ultimo reel in grande, la classifica dei più visti, perché seguirci e l'invito finale.
// "SEGUI SU INSTAGRAM" apre il profilo; un reel apre il suo link (o il profilo, se l'admin non l'ha messo) (D06).
const IG_WHY = [
  ["flag", "WEEKEND DI GARA GOAT", "I momenti chiave dei GP analizzati senza filtri. Solo storie di spessore, gufate storiche e l’hype della pista raccontato come si deve."],
  ["poll", "Sondaggi e pronostici", "Vota nelle storie e confronta le previsioni con l'app."],
  ["group", "La nostra storia", "Come nasce B&T e chi c'è dietro all'app."],
];
const IG_SURFACE = "#111114";
const IG_EMPTY = "repeating-linear-gradient(135deg, rgba(255,255,255,.035) 0 14px, rgba(255,255,255,0) 14px 28px), #141418";
// Numero scritto dall'admin come lo mostra Instagram ("12,3K"); scritto in un modo che non si capisce: così com'è.
const igCount = v => { const n = IGL.parseCount(v); return n != null ? IGL.shortCount(n) : (String(v == null ? "" : v).trim() || null); };
const igDay = ms => { const d = new Date(ms); return d.toLocaleDateString("it-IT", { day: "numeric", month: "long", ...(d.getFullYear() !== new Date(nowMs()).getFullYear() ? { year: "numeric" } : {}) }); };
// Condivide un link: col menu del telefono se c'è, altrimenti lo copia.
async function shareLink(url, title, onToast) {
  if (nativeShareKind()) { const r = await shareNative({ title, text: title, url }, "Condividi"); if (r !== "fail") return; }
  const ok = await Promise.resolve(copyText(url)).catch(() => false);
  if (onToast) onToast(ok ? "Link copiato: incollalo dove vuoi" : "Non riesco a copiare il link");
}
const IgPlay = ({ size, color }) => <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" /></svg>;
function IgStat({ value, label, line }) {
  return (
    <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 3, borderRight: line ? `1px solid ${C.border}` : "none" }}>
      <span style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 24, lineHeight: 1, color: C.text }}>{value}</span>
      <span style={{ fontFamily: F_BODY, fontWeight: 600, fontSize: 10.5, letterSpacing: 1.1, color: C.dim }}>{label}</span>
    </div>
  );
}
// Una riga della classifica (pos: P1, P2…) o degli altri reel (senza pos).
function IgRow({ v, pos = null, line, onOpen }) {
  const views = igCount(v.views);
  return (
    <button className="press" data-ig-video={v.id} aria-label={"Apri su Instagram: " + (v.title || "reel")} onClick={onOpen}
      style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "10px 14px", textAlign: "left", borderBottom: line ? `1px solid ${C.divider}` : "none" }}>
      {pos != null && <span data-ig-pos={pos} style={{ width: 34, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 13, flexShrink: 0, ...(pos === 1 ? { background: C.accent, color: C.onAccent } : { background: C.card, color: C.text, border: "1px solid rgba(255,255,255,.1)" }) }}>P{pos}</span>}
      <StoredBg as="span" data-ig-thumb="" src={v.thumb} empty="#1F1F24" style={{ width: 40, height: 52, borderRadius: 9, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {!v.thumb && <IgPlay size={14} color={C.dim} />}
      </StoredBg>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ fontFamily: F_BODY, fontWeight: 600, fontSize: 13.5, lineHeight: 1.3, color: C.text, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{v.title || "Reel senza titolo"}</span>
        {views && <span style={{ fontFamily: F_BODY, fontSize: 11.5, color: C.dim }}>{views} visualizzazioni</span>}
      </span>
      <Icon name="external" size={16} color={C.dim} />
    </button>
  );
}
function InstagramScreen({ ig, onToast }) {
  const now = nowMs(), profile = Compat.igProfileUrl(ig.handle), videos = ig.videos || [];
  const last = IGL.latestReel(videos, now), top = IGL.topReels(videos, now);
  const ranked = top.list.length >= 2 && top.list.some(v => IGL.parseCount(v.views) != null);
  const others = ranked ? [] : videos.filter(v => v !== last).reverse();   // senza visualizzazioni: gli altri, dal più nuovo
  const open = v => openUrl((v && v.url) || profile);
  const sec = { display: "flex", flexDirection: "column", gap: 12, padding: "0 16px" };
  const h2 = { margin: 0, fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 17, color: C.text };
  const cta = { display: "flex", alignItems: "center", justifyContent: "center", gap: 9, width: "100%", borderRadius: 15, background: C.accent, fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 19, letterSpacing: .4, color: "#fff" };
  const outline = { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 48, borderRadius: 14, border: "1px solid rgba(255,255,255,.22)", color: C.text };
  const lastDay = last && IGL.dateMs(last);
  const lastStats = last ? [igCount(last.views) && igCount(last.views) + " visualizzazioni", igCount(last.likes) && igCount(last.likes) + " mi piace"].filter(Boolean).join(" · ") : "";
  const stat = v => (v == null || v === "" ? "–" : igCount(v) || "–");
  return (
    <div className="scrollcol" style={{ height: "100%", display: "flex", flexDirection: "column", gap: 20, paddingBottom: 28 }}>
      <section aria-label="Profilo Instagram di B&T" style={{ ...sec, gap: 16, paddingTop: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div data-ig-avatar="" style={{ width: 82, height: 82, borderRadius: "50%", background: C.accent, padding: 3, boxSizing: "border-box", flexShrink: 0 }}>
            <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: C.bg, padding: 3, boxSizing: "border-box" }}>
              <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: C.card, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                <img src={BT_LOGO} alt="B&T" style={{ width: "64%", height: "64%", objectFit: "contain" }} />
              </div>
            </div>
          </div>
          <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
              <Icon name="instagram" size={18} />
              <h1 style={{ margin: 0, fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 23, lineHeight: 1.05, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>@{ig.handle}</h1>
            </div>
            <p style={{ margin: 0, fontFamily: F_BODY, fontSize: 13, lineHeight: 1.4, color: C.muted }}>La community B&amp;T di Formula 1: gare, Fanta e la nostra storia</p>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", background: IG_SURFACE, border: `1px solid ${C.border}`, borderRadius: 16 }}>
          <IgStat value={stat(ig.followers)} label="FOLLOWER" line />
          <IgStat value={stat(ig.posts)} label="POST" />
        </div>
        <button className="press" data-ig-follow="" onClick={() => openUrl(profile)} style={{ ...cta, height: 52 }}><Icon name="plus" size={18} color="#fff" sw={2.4} />SEGUI SU INSTAGRAM</button>
      </section>

      {last ? (
        <section aria-label="Ultimo reel" style={sec}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
            <h2 style={h2}>ULTIMO REEL</h2>
            {lastDay && <span data-ig-date="" style={{ fontFamily: F_BODY, fontSize: 12, color: C.muted }}>{igDay(lastDay)}</span>}
          </div>
          <button className="press" data-ig-video={last.id} data-ig-last="" aria-label={"Guarda su Instagram: " + (last.title || "l'ultimo reel")} onClick={() => open(last)} style={{ display: "block", width: "100%", padding: 0, borderRadius: 22, overflow: "hidden", border: `1px solid ${C.border}`, textAlign: "left" }}>
            <StoredBg as="span" data-ig-thumb="" src={last.thumb} empty={IG_EMPTY} style={{ display: "block", position: "relative", aspectRatio: "4 / 5" }}>
              {last.desc && <span data-ig-desc="" style={{ position: "absolute", top: 14, left: 14, maxWidth: "60%", padding: "6px 10px", borderRadius: 8, background: "rgba(0,0,0,.6)", border: "1px solid rgba(255,255,255,.16)", fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 11, letterSpacing: 1, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", boxSizing: "border-box" }}>{last.desc}</span>}
              {IGL.isNew(last, now) && <span data-ig-new="" style={{ position: "absolute", top: 14, right: 14, display: "flex", alignItems: "center", gap: 6, padding: "6px 9px", borderRadius: 8, background: "#fff", color: "#0A0A0C", fontFamily: F_HEAD, fontWeight: 900, fontSize: 11, letterSpacing: 1 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: C.accent }} />NUOVO</span>}
              <span aria-hidden="true" style={{ position: "absolute", top: "50%", left: "50%", width: 68, height: 68, margin: "-34px 0 0 -34px", borderRadius: "50%", background: "rgba(255,255,255,.16)", border: "1px solid rgba(255,255,255,.3)", display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" }}><IgPlay size={26} color="#fff" /></span>
              {(last.title || lastStats) && (
                <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "48px 16px 16px", background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,.82) 62%)" }}>
                  {last.title && <span style={{ display: "block", fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 21, lineHeight: 1.15, color: "#fff" }}>{last.title}</span>}
                  {lastStats && <span style={{ display: "block", marginTop: 6, fontFamily: F_BODY, fontSize: 12, color: "#C7C7CC" }}>{lastStats}</span>}
                </span>
              )}
            </StoredBg>
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="press" onClick={() => open(last)} style={{ ...outline, flex: 1, fontFamily: F_BODY, fontWeight: 600, fontSize: 13.5 }}><Icon name="external" size={16} color={C.text} />Guarda su Instagram</button>
            <button className="press" aria-label="Condividi il reel" onClick={() => shareLink(last.url || profile, last.title || "Il reel di B&T", onToast)} style={{ ...outline, width: 48 }}><Icon name="share" size={18} color={C.text} /></button>
          </div>
        </section>
      ) : (
        <section aria-label="Ultimo reel" style={sec}>
          <h2 style={h2}>ULTIMO REEL</h2>
          <p data-ig-empty="" style={{ margin: 0, padding: "18px 16px", borderRadius: 18, background: IG_SURFACE, border: `1px solid ${C.border}`, fontFamily: F_BODY, fontSize: 13, lineHeight: 1.45, color: C.muted }}>I reel arrivano qui appena li pubblichiamo. Intanto li trovi tutti sul profilo @{ig.handle}.</p>
        </section>
      )}

      {ranked && (
        <section aria-label={top.month ? "I reel più visti del mese" : "I reel più visti"} style={sec}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
            <h2 style={h2}>{top.month ? "PIÙ VISTI DEL MESE" : "PIÙ VISTI"}</h2>
            <span style={{ fontFamily: F_BODY, fontSize: 12, color: C.muted }}>classifica per visualizzazioni</span>
          </div>
          <div data-ig-top="" style={{ background: IG_SURFACE, border: `1px solid ${C.border}`, borderRadius: 18, overflow: "hidden" }}>
            {top.list.map((v, i) => <IgRow key={v.id} v={v} pos={i + 1} line={i < top.list.length - 1} onOpen={() => open(v)} />)}
          </div>
        </section>
      )}
      {others.length > 0 && (
        <section aria-label="Altri reel" style={sec}>
          <h2 style={h2}>ALTRI REEL</h2>
          <div style={{ background: IG_SURFACE, border: `1px solid ${C.border}`, borderRadius: 18, overflow: "hidden" }}>
            {others.map((v, i) => <IgRow key={v.id} v={v} line={i < others.length - 1} onOpen={() => open(v)} />)}
          </div>
        </section>
      )}

      <section aria-label="Perché seguirci" style={sec}>
        <h2 style={h2}>PERCHÉ SEGUIRCI</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {IG_WHY.map(([icon, title, text]) => (
            <div key={icon} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "13px 14px", borderRadius: 16, background: IG_SURFACE, border: `1px solid ${C.border}` }}>
              <span style={{ width: 38, height: 38, borderRadius: 11, background: C.card, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name={icon} size={18} /></span>
              <span style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                <span style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 14, color: C.text }}>{title}</span>
                <span style={{ fontFamily: F_BODY, fontSize: 12.5, lineHeight: 1.4, color: C.muted }}>{text}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section aria-label="Segui B&T" style={{ margin: "0 16px", padding: "18px 16px", borderRadius: 20, background: IG_SURFACE, border: "1px solid rgba(255,255,255,.1)", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 20, lineHeight: 1.15, color: C.text }}>Non perderti il prossimo reel</div>
        <button className="press" data-ig-follow-end="" onClick={() => openUrl(profile)} style={{ ...cta, height: 50 }}>SEGUI @{ig.handle}</button>
        <span style={{ fontFamily: F_BODY, fontSize: 11.5, color: C.dim, textAlign: "center" }}>Si apre l'app Instagram</span>
      </section>
    </div>
  );
}

function ChatListScreen({ chats, onOpen, blocked = [], unreadOf = () => 0 }) {
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
        const unread = unreadOf(c.id, visible);   // messaggi degli altri dopo l'ultimo visto
        return (
          <button key={c.id} className="press" onClick={() => onOpen(c.id)} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "12px 16px", textAlign: "left", borderBottom: `1px solid ${C.divider}` }}>
            <IconCircle name={c.icon} bg={c.color} stroke={c.iconColor} filled />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontFamily: F_HEAD, fontWeight: 700, fontSize: 14, color: C.text }}>{c.name}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 2 }}>
                <span style={{ fontFamily: F_BODY, fontSize: 12, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{last ? (last.mine ? "Tu: " : last.from + ": ") + last.text : "Nessun messaggio"}</span>
                {unread > 0 && <span data-chat-unread={c.id} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 18, height: 18, padding: "0 5px", borderRadius: 9, background: C.accent, fontFamily: F_BODY, fontWeight: 700, fontSize: 10, color: "#fff", flexShrink: 0 }}>{unread}</span>}
              </div>
            </div>
          </button>
        );
      })}
      <p style={{ fontFamily: F_BODY, fontSize: 11, color: C.dim, lineHeight: 1.55, textAlign: "center", margin: "18px 28px 24px" }}>Rispetta gli altri tifosi: niente insulti, spam o dati personali. Con ⋯ su un messaggio puoi segnalarlo o bloccare chi l'ha scritto.</p>
    </div>
  );
}

/* ── LINK DELL'APP IN CHAT (25/10) ───────────────────────────────────── */
// Un messaggio può portare un link a una cosa dell'app (campo k, compat.linkOf): notizia, gara, curva del Ghost Lap,
// team radio, pilota, scuderia, profilo, squadra FantaF1, traguardi del Garage, domanda del Fanta. In chat si vede come
// una miniatura che si capisce da sola (tipo, titolo, una riga); toccandola si apre la pagina dell'app o, per quello
// che una pagina non ce l'ha, la scheda coi dettagli. Si allega scrivendo @ (o col tasto del link accanto al campo),
// oppure con "Invia in chat" su notizie, gare e Ghost Lap (ChatShare: share apre la scelta della stanza).
const ChatShare = React.createContext(null);
const LINK_KINDS = [
  ["news", "NOTIZIA", "doc"], ["race", "GARA", "flag"], ["ghost", "GHOST LAP", "stopwatch"], ["radio", "TEAM RADIO", "radio"],
  ["driver", "PILOTA", "helmet"], ["team", "SCUDERIA", "wheel"], ["profile", "PROFILO", "person"],
  ["fanta", "SQUADRA FANTAF1", "trophy"], ["games", "TRAGUARDI NEL GARAGE", "garage"], ["question", "DOMANDA DEL FANTA", "poll"],
];
const LINK_LABEL = Object.fromEntries(LINK_KINDS.map(([t, l]) => [t, l])), LINK_ICON = Object.fromEntries(LINK_KINDS.map(([t, , i]) => [t, i]));
const LINK_SHEET = ["team", "fanta", "games", "radio"];   // si aprono nella scheda coi dettagli
const LINK_CATS = [["news", "Notizie"], ["race", "Gare"], ["ghost", "Ghost Lap"], ["radio", "Team radio"], ["driver", "Piloti"], ["team", "Scuderie"], ["me", "I miei"], ["question", "Domande del Fanta"]];
const LINK_EMPTY = { news: "Nessuna notizia per ora.", radio: "I team radio veri arrivano durante e dopo le sessioni.", question: "Nessuna domanda del Fanta per questo weekend.", me: "Accedi per mandare il tuo profilo, la squadra e i traguardi." };
const ghostGain = (duel, IA, IB) => (!duel ? "" : duel.gained.who === "pari" ? "In questa curva sono pari" : `${(duel.gained.who === "A" ? IA : IB).last} guadagna ${duel.gained.s.toFixed(3).replace(".", ",")} s`);
const countOf = v => (v && typeof v === "object" ? Object.keys(v).length : 0);
// I link di una categoria dell'elenco (S: i dati dell'app, ChatShare.sources).
function linkItems(cat, S) {
  if (!S) return [];
  if (cat === "news") return (S.articles || []).filter(a => a.published !== false && a.title).slice(0, 30).map(a => ({ t: "news", id: a.id, ti: a.title, su: a.excerpt || a.cat || "" }));
  if (cat === "race") return (S.races || []).filter(r => r.circuitId && r.name).map(r => ({ t: "race", id: r.circuitId, ti: r.name, su: [r.circuit, r.date ? fmtDate(r.date) : ""].filter(Boolean).join(" · ") }));
  if (cat === "ghost") return ghostSessions().flatMap(([sid]) => {
    const G = BtRealData[sid], codes = Object.keys(G.laps), a = codes[0], b = codes[1], IA = ghostInfo(a), IB = ghostInfo(b);
    return G.corners.map(c => ({ t: "ghost", s: sid, a, b, n: c.n, ti: `${G.name} · curva ${c.n}: ${a} contro ${b}`, su: ghostGain(BtGhost.cornerDuel(G.laps[a], G.laps[b], c), IA, IB) }));
  });
  if (cat === "radio") return (S.radios || []).map(r => { const d = driverById(r.id); return { t: "radio", id: r.id, ti: `${d ? d.full : r.code}${r.lap ? " · giro " + r.lap : ""}`, su: "Team radio con l'audio", u: r.url }; });
  if (cat === "driver") return DRIVERS.map(d => ({ t: "driver", id: d.id, ti: d.full, su: d.team }));
  if (cat === "team") return TEAMS.map(t => { const ds = DRIVERS.filter(d => d.teamId === t.id).map(d => d.full); return { t: "team", id: t.id, ti: t.name, su: ds.join(" e "), ln: ds }; });
  if (cat === "question") return (S.predictions || []).filter(q => q.q).map(q => ({ t: "question", id: q.id, ti: q.q, su: S.predAnswers && S.predAnswers[q.id] != null ? "Ho già risposto: e tu?" : "Rispondi nella pagina FANTA" }));
  if (cat === "me") {
    const M = S.me;
    if (!M || !M.name) return [];
    const tm = M.team && teamById(M.team), dr = M.driver && driverById(M.driver);
    const out = [{ t: "profile", ti: `Profilo di ${M.name}`, su: [tm ? "Tifa " + tm.name : "", dr ? "pilota del cuore " + dr.full : ""].filter(Boolean).join(", ") || fanLabel(M.fan) }];
    const sq = S.squad || {}, ds = (sq.drivers || []).map(driverById).filter(Boolean), ts = (sq.teams || []).map(teamById).filter(Boolean);
    if (ds.length || ts.length) out.push({ t: "fanta", ti: sq.name || `La squadra di ${M.name}`, su: `${ds.length} piloti e ${ts.length} scuderie`, ln: [...ds.map(d => d.full), ...ts.map(t => t.name)] });
    const all = S.trophyList || [], won = all.filter(t => S.trophies && S.trophies[t.id]);
    const ln = [S.pitBest ? `Pit Stop Challenge: ${S.pitBest.toFixed(2).replace(".", ",")} s` : "", countOf(S.sillyPreds) ? `Silly Season: ${countOf(S.sillyPreds)} previsioni` : "",
      countOf(S.stratPreds) ? `Strategie: ${countOf(S.stratPreds)} previsioni` : "", ...won.slice(0, 5).map(t => "Trofeo: " + (t.secret ? SECRET_NAME : t.name))].filter(Boolean);
    out.push({ t: "games", ti: `I traguardi di ${M.name}`, su: `${won.length} trofei su ${all.length}`, ln });
    return out;
  }
  return [];
}
// Miniatura: la foto della notizia, il pilota, lo stemma della scuderia, il casco; per il resto l'icona del tipo.
function ChatLinkThumb({ k, prof = null, size = 52 }) {
  const ctx = React.useContext(ChatShare);
  const box = { width: size, height: size, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", background: C.card };
  if (k.t === "news") {
    const a = ctx && ctx.sources ? (ctx.sources.articles || []).find(x => x.id === k.id) : null;
    return <StoredBg data-link-thumb="news" src={a && a.image} empty={C.card} style={box}>{!(a && a.image) && <Icon name="doc" size={Math.round(size * .42)} color={C.muted} />}</StoredBg>;
  }
  const d = (k.t === "driver" || k.t === "radio") && driverById(k.id), t = k.t === "team" && teamById(k.id);
  if (d) return <span data-link-thumb="driver" style={{ ...box, background: alpha(d.color, .28) }}><Headshot driver={d} size={size - 8} /></span>;
  if (t) return <span data-link-thumb="team" style={box}><TeamBadge team={t} size={size - 14} /></span>;
  if (k.t === "profile") return <span data-link-thumb="profile" style={box}><HelmetArt spec={prof && prof.h ? prof.h : null} size={size - 10} /></span>;
  return <span data-link-thumb={k.t} style={box}><Icon name={LINK_ICON[k.t] || "link"} size={Math.round(size * .42)} color={C.gold} /></span>;
}
function ChatLinkCard({ k, prof = null, onOpen = null }) {
  const Tag = onOpen ? "button" : "div";
  const clamp = n => ({ overflow: "hidden", display: "-webkit-box", WebkitLineClamp: n, WebkitBoxOrient: "vertical" });
  return (
    <Tag className={onOpen ? "press" : undefined} data-chat-link={k.t} {...(onOpen ? { onClick: onOpen, "aria-label": `${LINK_LABEL[k.t]}: ${k.ti}` } : {})}
      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", boxSizing: "border-box", padding: 8, borderRadius: 12, background: "rgba(0,0,0,.3)", border: "1px solid rgba(255,255,255,.12)", textAlign: "left" }}>
      <ChatLinkThumb k={k} prof={prof} />
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontFamily: F_HEAD, fontWeight: 900, fontSize: 9.5, letterSpacing: 1, color: C.gold }}>{LINK_LABEL[k.t]}</span>
        <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 13.5, lineHeight: 1.2, color: "#fff", ...clamp(2) }}>{k.ti}</span>
        {k.su && <span style={{ fontFamily: F_BODY, fontSize: 11.5, lineHeight: 1.3, color: "rgba(255,255,255,.72)", ...clamp(2) }}>{k.su}</span>}
      </span>
      {onOpen && <Icon name="chevron" size={14} color="rgba(255,255,255,.6)" />}
    </Tag>
  );
}
const sheetWrap = (extra, onClose, children) => (
  <div {...extra} role="dialog" aria-modal="true" onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.62)", zIndex: 560, display: "flex", alignItems: "flex-end" }}>{children}</div>
);
// Scheda coi dettagli (scuderia, squadra FantaF1, traguardi, team radio): tutto quello che c'è nel link.
function ChatLinkSheet({ k, from, onClose }) {
  return sheetWrap({ "data-chat-link-sheet": k.t, "aria-label": LINK_LABEL[k.t] + ": " + k.ti }, onClose,
    <div style={{ width: "100%", maxHeight: "86%", overflowY: "auto", boxSizing: "border-box", background: "#111114", borderTop: "1px solid rgba(255,255,255,.12)", borderRadius: "24px 24px 0 0", padding: "10px 18px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div aria-hidden="true" style={{ alignSelf: "center", width: 40, height: 5, borderRadius: 3, background: "rgba(255,255,255,.22)" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <ChatLinkThumb k={k} size={64} />
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontFamily: F_HEAD, fontWeight: 900, fontSize: 10.5, letterSpacing: 1, color: C.gold }}>{LINK_LABEL[k.t]}</span>
          <h2 style={{ margin: 0, fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 20, lineHeight: 1.15, color: C.text }}>{k.ti}</h2>
          {k.su && <span style={{ fontFamily: F_BODY, fontSize: 12.5, color: C.muted }}>{k.su}</span>}
        </div>
      </div>
      {k.ln && <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>{k.ln.map((l, i) => <div key={i} data-link-line="" style={{ padding: "10px 12px", borderTop: i ? `1px solid ${C.divider}` : "none", fontFamily: F_BODY, fontSize: 13, color: C.text }}>{l}</div>)}</div>}
      {k.u && <audio controls preload="none" src={k.u} aria-label={"Team radio: " + k.ti} style={{ display: "block", width: "100%" }} />}
      {from && <span style={{ fontFamily: F_BODY, fontSize: 11.5, color: C.dim }}>Mandato in chat da {from}</span>}
    </div>);
}
// Elenco dei link da mandare (si apre scrivendo @ o col tasto del link): categorie, ricerca, le miniature come in chat.
function ChatLinkPicker({ onPick, onClose }) {
  const ctx = React.useContext(ChatShare);
  const [cat, setCat] = useState("news"), [q, setQ] = useState("");
  const items = React.useMemo(() => linkItems(cat, ctx && ctx.sources), [cat, ctx && ctx.sources]);
  const f = q.trim().toLowerCase(), shown = f ? items.filter(k => (k.ti + " " + (k.su || "")).toLowerCase().includes(f)) : items;
  return sheetWrap({ "data-link-picker": "", "aria-label": "Manda in chat un link dell'app" }, onClose,
    <div style={{ width: "100%", height: "80%", boxSizing: "border-box", background: "#111114", borderTop: "1px solid rgba(255,255,255,.12)", borderRadius: "24px 24px 0 0", paddingTop: 10, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 16px 10px" }}>
        <h2 style={{ flex: 1, margin: 0, fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 18, color: C.text }}>MANDA IN CHAT</h2>
        <button className="press" aria-label="Chiudi" onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="close" size={13} sw={2.2} /></button>
      </div>
      <div className="scrollrow" style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", padding: "0 16px 10px", flexShrink: 0 }}>
        {LINK_CATS.map(([id, label]) => <button key={id} className="press" data-link-cat={id} aria-pressed={cat === id ? "true" : "false"} onClick={() => { setCat(id); setQ(""); }} style={{ flex: "0 0 auto", padding: "8px 12px", borderRadius: 999, background: cat === id ? C.accent : C.card, border: `1px solid ${cat === id ? C.accent : C.border}`, fontFamily: F_HEAD, fontWeight: 800, fontSize: 12, color: cat === id ? "#fff" : C.muted }}>{label}</button>)}
      </div>
      <div style={{ padding: "0 16px 10px", flexShrink: 0 }}>
        <input aria-label="Cerca nell'elenco" placeholder="Cerca…" value={q} onChange={e => setQ(e.target.value)} style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 12, background: C.card, border: `1px solid ${C.border}`, outline: "none", color: C.text, fontFamily: F_BODY, fontSize: 13 }} />
      </div>
      <div className="scrollcol" style={{ flex: 1, minHeight: 0, padding: "0 16px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
        {shown.length === 0 && <p data-link-empty="" style={{ margin: "12px 0", fontFamily: F_BODY, fontSize: 12.5, lineHeight: 1.45, color: C.dim }}>{LINK_EMPTY[cat] || "Niente da mostrare."}</p>}
        {shown.map((k, i) => <ChatLinkCard key={k.t + (k.id || "") + (k.s || "") + (k.n || "") + i} k={k} onOpen={() => onPick(k)} />)}
      </div>
    </div>);
}
// "Invia in chat": in quale stanza.
function ChatRoomPicker({ onPick, onClose }) {
  return (
    <div data-room-picker="" role="dialog" aria-modal="true" aria-label="In quale chat?" onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.62)", zIndex: 640, display: "flex", alignItems: "flex-end" }}>
      <div style={{ width: "100%", boxSizing: "border-box", background: C.card, borderRadius: "22px 22px 0 0", padding: "18px 16px 22px", display: "flex", flexDirection: "column", gap: 8 }}>
        <h2 style={{ margin: "0 0 4px", fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 17, color: C.text }}>IN QUALE CHAT?</h2>
        {CHAT_ROOMS.map(r => <button key={r.id} className="press" data-room={r.id} onClick={() => onPick(r.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 14, background: "rgba(255,255,255,.05)", border: `1px solid ${C.border}`, textAlign: "left" }}><IconCircle name={r.icon} bg={r.color} stroke={r.iconColor} size={34} filled /><span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 14, color: C.text }}>{r.name}</span></button>)}
        <button className="press" onClick={onClose} style={{ padding: "12px 0", fontFamily: F_BODY, fontWeight: 600, fontSize: 13, color: C.muted }}>Annulla</button>
      </div>
    </div>
  );
}
// Tasto "Invia in chat" (notizia, gara, curva del Ghost Lap).
function ShareChatBtn({ k, label = "Invia in chat", round = false }) {
  const ctx = React.useContext(ChatShare);
  if (!ctx || !k) return null;
  if (round) return <button className="press" data-share-chat={k.t} aria-label={label} onClick={() => ctx.share(k)} style={{ width: 36, height: 36, borderRadius: 12, background: C.card, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="chat" size={16} /></button>;
  return <button className="press" data-share-chat={k.t} onClick={() => ctx.share(k)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "11px 0", borderRadius: 12, background: "rgba(255,255,255,.05)", border: `1px solid ${C.border}`, fontFamily: F_BODY, fontWeight: 600, fontSize: 13, color: C.text }}><Icon name="chat" size={15} />{label}</button>;
}

// Profilo veloce (25/10): toccando il nome in chat, tifo (squadra e pilota del cuore, tipo di tifoso), casco e trofei
// dall'ultimo messaggio dell'autore che li ha (viaggiano coi messaggi, src/services/chat.js), e Segnala.
function ChatProfileSheet({ msg, messages, trophyList = TROPHIES, myWon = {}, onReport, onClose }) {
  const same = x => (msg.aid ? x.aid === msg.aid : !x.aid && x.from === msg.from);
  const withProf = [...messages].reverse().find(x => same(x) && x.prof);
  const prof = withProf ? withProf.prof : null;
  const team = prof && prof.t ? teamById(prof.t) : null, drv = prof && prof.d ? driverById(prof.d) : null;
  const won = prof && prof.w ? trophyList.filter(t => prof.w.includes(t.id)) : [];
  const medal = (withProf && withProf.medal) || msg.medal;
  return (
    <div data-chat-profile={msg.id} role="dialog" aria-modal="true" aria-label={"Profilo di " + msg.from} onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.62)", zIndex: 560, display: "flex", alignItems: "flex-end" }}>
      <div style={{ width: "100%", maxHeight: "86%", overflowY: "auto", boxSizing: "border-box", background: "#111114", borderTop: "1px solid rgba(255,255,255,.12)", borderRadius: "24px 24px 0 0", padding: "10px 18px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div aria-hidden="true" style={{ alignSelf: "center", width: 40, height: 5, borderRadius: 3, background: "rgba(255,255,255,.22)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 74, height: 74, borderRadius: 18, background: C.card, border: `1px solid ${C.border}`, position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {team && <div aria-hidden="true" style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: team.color }} />}
            {prof && prof.h ? <HelmetArt spec={prof.h} size={56} />
              : <span data-helmet-placeholder="" style={{ display: "flex", opacity: .32 }}><HelmetArt spec={{ base: "#6A6A73", c1: "#6A6A73", c2: "#6A6A73", pattern: "none", finish: "matte" }} size={56} /></span>}
          </div>
          <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <h2 style={{ margin: 0, fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 23, lineHeight: 1.05, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{msg.from}</h2>
              {medal && <Medal medal={medal} size={18} />}
            </div>
            {team && <span data-chat-profile-team={team.id} style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: F_BODY, fontSize: 13, color: C.muted }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: team.color, flexShrink: 0 }} />Tifa <b style={{ color: C.text, fontWeight: 600 }}>{team.name}</b></span>}
            {drv && <span style={{ fontFamily: F_BODY, fontSize: 13, color: C.muted }}>Pilota del cuore: <b style={{ color: C.text, fontWeight: 600 }}>{drv.full || drv.name}</b></span>}
            {prof && prof.f && <span style={{ fontFamily: F_BODY, fontSize: 12, color: C.dim }}>{fanLabel(prof.f)}</span>}
          </div>
        </div>
        {prof ? (
          <section aria-label={"Trofei di " + msg.from} data-chat-profile-trophies={won.length} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "12px 12px 10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
              <span style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 15, color: C.text }}>TROFEI</span>
              <span style={{ fontFamily: F_BODY, fontSize: 12, color: C.muted }}><b style={{ color: C.text }}>{won.length}</b> di {trophyList.length}</span>
            </div>
            {won.length ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {won.map(t => (
                  <span key={t.id} data-chat-profile-trophy={t.id} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 9px 5px 6px", borderRadius: 999, background: "rgba(231,179,76,.1)", border: "1px solid rgba(231,179,76,.4)", fontFamily: F_BODY, fontWeight: 600, fontSize: 11.5, color: C.text }}>
                    <Icon name="trophy" size={12} color={C.gold} sw={2} />{t.secret && !myWon[t.id] ? SECRET_NAME : t.name}
                  </span>
                ))}
              </div>
            ) : <p style={{ margin: 0, fontFamily: F_BODY, fontSize: 12.5, color: C.dim }}>Nessun trofeo per ora.</p>}
          </section>
        ) : (
          <p data-chat-profile-empty="" style={{ margin: 0, fontFamily: F_BODY, fontSize: 12.5, lineHeight: 1.45, color: C.dim }}>Il tifo, il casco e i trofei di {msg.from} si vedono dal suo prossimo messaggio in chat.</p>
        )}
        <button className="press" data-chat-profile-report="" onClick={() => { onReport && onReport(msg); onClose(); }} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 48, borderRadius: 14, border: "1.5px solid rgba(255,90,95,.45)", fontFamily: F_HEAD, fontWeight: 800, fontSize: 14, color: "#FF7A7E" }}><Icon name="flag" size={15} color="#FF7A7E" /> Segnala {msg.from}</button>
      </div>
    </div>
  );
}

// Reazioni (25/10), come su WhatsApp: tenendo premuto un messaggio (o col tasto ⋯, o toccando le reazioni sotto il
// messaggio) si apre la barra delle emoji; toccando di nuovo la propria la si toglie. Una per persona.
const REACTION_NAMES = { "👍": "Mi piace", "❤️": "Cuore", "😂": "Risata", "😮": "Stupore", "😢": "Tristezza", "🙏": "Grazie" };
const LONG_PRESS_MS = 450;
function ChatThreadScreen({ chat, onBack, onSend, isPremium, blocked = [], onReport, onBlock, onReact, trophyList = TROPHIES, myWon = {}, liveRace = null, pendingLink = null, onPendingUsed, onOpenLink }) {
  const [draft, setDraft] = useState("");
  const [menu, setMenu] = useState(null); // messaggio su cui ho aperto le opzioni e le reazioni
  const [peek, setPeek] = useState(null); // messaggio di cui guardo l'autore (profilo veloce)
  const [attach, setAttach] = useState(null);     // link dell'app da mandare col messaggio
  const [picking, setPicking] = useState(false);  // elenco dei link aperto (@ o tasto del link)
  const [linkOpen, setLinkOpen] = useState(null); // messaggio di cui guardo il link nella scheda
  useBack(picking, () => setPicking(false));
  useBack(!!linkOpen, () => setLinkOpen(null));
  useEffect(() => { if (pendingLink) { setAttach(pendingLink); if (onPendingUsed) onPendingUsed(); } }, [pendingLink]);
  useBack(!!menu, () => setMenu(null));
  useBack(!!peek, () => setPeek(null));
  const endRef = useRef(null);
  const press = useRef({ t: 0, x: 0, y: 0 }), menuAt = useRef(0);
  useEffect(() => () => clearTimeout(press.current.t), []);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [chat.messages.length]);
  const shown = chat.messages.filter(m => !isBlockedMsg(blocked, m));
  const canReact = m => !!onReact && !String(m.id).startsWith("invio-");
  const openMenu = m => { if (!m.mine || canReact(m)) { menuAt.current = performance.now(); setMenu(m); } };
  // Tenere premuto: dopo LONG_PRESS_MS senza spostare il dito si apre la barra delle reazioni.
  const holdStart = (m, e) => {
    if (!canReact(m)) return;
    clearTimeout(press.current.t);
    press.current = { x: e.clientX, y: e.clientY, t: setTimeout(() => { fx.buzz("select"); openMenu(m); }, LONG_PRESS_MS) };
  };
  const holdMove = e => { if (Math.hypot(e.clientX - press.current.x, e.clientY - press.current.y) > 10) clearTimeout(press.current.t); };
  const holdEnd = () => clearTimeout(press.current.t);
  const react = e => { if (menu && onReact) onReact(chat.id, menu, e); setMenu(null); };
  const totalOf = m => m.reactions.reduce((s, r) => s + r.n, 0);
  const send = () => {
    const t = draft.trim(), k = attach;
    if (!t && !k) return;
    setDraft(""); setAttach(null);
    Promise.resolve(onSend(chat.id, t, k)).then(ok => { if (ok === false) { setDraft(d => d || t); setAttach(a => a || k); } });   // non inviato: testo e link tornano
  };
  // Profilo dell'autore (per la miniatura di un profilo): l'ultimo dei suoi messaggi che ce l'ha.
  const authorProf = m => { const w = [...shown].reverse().find(x => (m.aid ? x.aid === m.aid : !x.aid && x.from === m.from) && x.prof); return w ? w.prof : null; };
  const openLinkOf = m => {
    const k = m.link;
    if (k.t === "profile") setPeek(m);
    else if (LINK_SHEET.includes(k.t)) setLinkOpen(m);
    else if (onOpenLink) onOpenLink(k);
  };
  const typed = v => { if (v.length === draft.length + 1 && /(^|\s)@$/.test(v)) { setDraft(v.slice(0, -1)); setPicking(true); } else setDraft(v); };   // @: l'elenco dei link
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <SubHeader title={chat.name} onBack={onBack} right={<IconCircle name={chat.icon} bg={chat.color} stroke={chat.iconColor} size={32} filled />} />
      {chat.id === "live" && liveRace && <div data-live-band="" style={{ margin: "0 16px 8px", padding: "8px 12px", borderRadius: 10, background: alpha(C.accentInk, .14), border: `1px solid ${alpha(C.accentInk, .4)}`, fontFamily: F_HEAD, fontWeight: 800, fontSize: 12.5, color: C.text, flexShrink: 0 }}>LIVE: {liveRace.name}</div>}
      <div className="scrollcol" style={{ flex: 1, padding: "6px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {shown.length === 0 && <p data-chat-empty="" style={{ margin: "24px 0", textAlign: "center", fontFamily: F_BODY, fontSize: 13, color: C.muted }}>{CHAT_MSG.empty}</p>}
        {shown.map((m, i) => (
          <div key={m.id || i} data-chat-msg={m.id} style={{ display: "flex", flexDirection: "column", alignItems: m.mine ? "flex-end" : "flex-start" }}>
            {m.mine && (isPremium || m.medal) && <span style={{ display: "flex", alignItems: "center", gap: 3, fontFamily: F_BODY, fontWeight: 700, fontSize: 10.5, color: C.gold, margin: "0 4px 3px" }}>{isPremium && <Icon name="star" size={9} color={C.gold} />}Tu{m.medal && <Medal medal={m.medal} size={12} />}</span>}
            {!m.mine && <span style={{ display: "flex", alignItems: "center", gap: 2, fontFamily: F_BODY, fontWeight: 600, fontSize: 10.5, color: C.dim, margin: "0 4px 1px" }}>
              <button className="press" data-chat-author={m.id} aria-label={"Profilo di " + m.from} onClick={() => setPeek(m)} style={{ display: "flex", alignItems: "center", gap: 2, minHeight: 24, padding: "2px 2px", font: "inherit", color: "inherit" }}>{m.from}{m.medal && <Medal medal={m.medal} size={12} style={{ marginLeft: 2 }} />}</button>
              <button className="press" aria-label={`Opzioni messaggio di ${m.from}`} onClick={() => openMenu(m)} style={{ minWidth: 30, height: 22, borderRadius: 8, fontFamily: F_BODY, fontWeight: 700, fontSize: 14, lineHeight: 1, color: C.dim }}>⋯</button>
            </span>}
            <div data-chat-bubble={m.id} onPointerDown={e => holdStart(m, e)} onPointerMove={holdMove} onPointerUp={holdEnd} onPointerCancel={holdEnd} onPointerLeave={holdEnd}
              onContextMenu={e => { e.preventDefault(); if (canReact(m)) openMenu(m); }}
              style={{ maxWidth: "78%", width: m.link ? "78%" : undefined, boxSizing: "border-box", padding: m.link ? 6 : "9px 13px", borderRadius: m.mine ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: m.mine ? C.accent : C.card, border: m.mine ? "none" : `1px solid ${C.border}`, userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" }}>
              {m.link && <ChatLinkCard k={m.link} prof={m.link.t === "profile" ? authorProf(m) : null} onOpen={String(m.id).startsWith("invio-") ? null : () => openLinkOf(m)} />}
              {(!m.link || (m.text && m.text !== m.link.ti)) && <span style={{ display: "block", padding: m.link ? "7px 7px 3px" : 0, fontFamily: F_BODY, fontSize: 13.5, color: "#fff", lineHeight: 1.4 }}>{m.text}</span>}
            </div>
            {m.reactions && m.reactions.length > 0 && (
              <button className="press" data-reactions={m.id} aria-label={"Reazioni: " + m.reactions.map(r => `${REACTION_NAMES[r.e] || r.e} ${r.n}`).join(", ")} onClick={() => { if (canReact(m)) openMenu(m); }}
                style={{ position: "relative", zIndex: 1, marginTop: -7, [m.mine ? "marginRight" : "marginLeft"]: 10, display: "flex", alignItems: "center", gap: 2, padding: "3px 8px", borderRadius: 999, background: "#1F1F24", border: `1px solid ${m.myReaction ? alpha(C.accentInk, .65) : "rgba(255,255,255,.14)"}`, boxShadow: "0 0 0 2px " + C.bg, fontSize: 13, lineHeight: 1.25, color: C.text }}>
                {m.reactions.slice(0, 3).map(r => <span key={r.e} aria-hidden="true">{r.e}</span>)}
                {totalOf(m) > 1 && <span style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 11, color: C.muted, marginLeft: 3 }}>{totalOf(m)}</span>}
              </button>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {attach && (
        <div data-chat-attach={attach.t} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px 0", borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}><ChatLinkCard k={attach} /></div>
          <button className="press" aria-label="Togli il link" onClick={() => setAttach(null)} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="close" size={12} sw={2.2} /></button>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderTop: attach ? "none" : `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", padding: "11px 14px", borderRadius: 20, background: C.card, border: `1px solid ${C.border}` }}>
          <button className="press" data-link-btn="" aria-label="Manda un link dell'app" onClick={() => setPicking(true)} style={{ display: "flex", padding: 0, marginRight: 9, flexShrink: 0 }}><Icon name="link" size={17} color={C.muted} /></button>
          <input value={draft} onChange={e => typed(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Scrivi un messaggio…" style={{ flex: 1, minWidth: 0, border: "none", background: "none", outline: "none", fontFamily: F_BODY, fontSize: 13.5, color: C.text }} />
        </div>
        <button className="press" aria-label="Invia" onClick={send} style={{ width: 40, height: 40, borderRadius: "50%", background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon name="send" size={16} color="#fff" sw={2} />
        </button>
      </div>
      {menu && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 550, display: "flex", alignItems: "flex-end" }} onClick={e => { if (e.target === e.currentTarget && performance.now() - menuAt.current > 350) setMenu(null); }}>
          <div style={{ background: C.card, borderRadius: "22px 22px 0 0", width: "100%", padding: "18px 18px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ fontFamily: F_BODY, fontSize: 12, color: C.muted, textAlign: "center", margin: "0 0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{menu.mine ? "Tu" : menu.from}: “{menu.text}”</p>
            {canReact(menu) && (
              <div data-react-bar="" role="group" aria-label="Reazioni" style={{ display: "flex", justifyContent: "space-between", padding: "2px 2px 8px" }}>
                {Compat.REACTIONS.map(e => {
                  const on = menu.myReaction === e;
                  return <button key={e} className="press" data-react={e} aria-pressed={on ? "true" : "false"} aria-label={(REACTION_NAMES[e] || e) + (on ? ": togli" : "")} onClick={() => react(on ? null : e)}
                    style={{ width: 48, height: 48, borderRadius: "50%", fontSize: 27, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", background: on ? alpha(C.accentInk, .22) : "rgba(255,255,255,.05)", border: `1.5px solid ${on ? alpha(C.accentInk, .75) : "transparent"}` }}>{e}</button>;
                })}
              </div>
            )}
            {!menu.mine && <button className="press" onClick={() => { onReport && onReport(chat.id, menu); setMenu(null); }} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px 0", borderRadius: 14, background: C.accent, fontFamily: F_HEAD, fontWeight: 800, fontSize: 14, color: "#fff" }}><Icon name="flag" size={15} color="#fff" /> Segnala messaggio</button>}
            {!menu.mine && <button className="press" onClick={() => { onBlock && onBlock(menu); setMenu(null); }} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px 0", borderRadius: 14, border: `1.5px solid ${C.border}`, fontFamily: F_HEAD, fontWeight: 800, fontSize: 14, color: C.text }}><Icon name="no" size={15} /> Blocca {menu.from}</button>}
            <button className="press" onClick={() => setMenu(null)} style={{ padding: "12px 0", fontFamily: F_BODY, fontWeight: 600, fontSize: 13, color: C.muted }}>Annulla</button>
          </div>
        </div>
      )}
      {peek && <ChatProfileSheet msg={peek} messages={shown} trophyList={trophyList} myWon={myWon || {}} onReport={m => onReport && onReport(chat.id, m)} onClose={() => setPeek(null)} />}
      {picking && <ChatLinkPicker onPick={k => { setAttach(k); setPicking(false); }} onClose={() => setPicking(false)} />}
      {linkOpen && <ChatLinkSheet k={linkOpen.link} from={linkOpen.mine ? null : linkOpen.from} onClose={() => setLinkOpen(null)} />}
    </div>
  );
}

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
// Sollevatore idraulico (G19): quando il podio compare i gradini, con chi ci sta sopra, salgono dal pavimento uno alla
// volta (il 3°, il 2°, poi il 1°), solo con transform (R4); con "Rimuovi animazioni" sono già al loro posto (R5). Il
// podio di un'altra classifica (label diversa) è un podio nuovo e risale. it.trend: la freccia accanto al valore (G20).
const PODIUM_LIFT = { 3: 1, 2: 2, 1: 3 };
const PODIUM_LIFT_GAP_S = .38;
function Podium({ items, label }) {
  const H = { 1: 70, 2: 50, 3: 34 };
  return (
    <div key={label} role="list" aria-label={label} data-podium={label} style={{ display: "flex", alignItems: "flex-end", gap: 6, overflow: "hidden" }}>
      {[2, 1, 3].map(place => {
        const it = items[place - 1];
        if (!it) return <div key={place} style={{ flex: 1 }} />;
        return (
          <div key={place} role="listitem" data-podium-place={place} aria-label={`${place}° posto: ${it.title}${it.value ? ", " + it.value : ""}${it.trendLabel ? ", " + it.trendLabel : ""}`} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div data-lift={PODIUM_LIFT[place]} className="podium-lift" style={{ width: "100%", minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", animationDelay: (PODIUM_LIFT[place] - 1) * PODIUM_LIFT_GAP_S + "s" }}>
              {(() => {
                const body = <>
                  {it.figure}
                  <div style={{ marginTop: 5, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: F_HEAD, fontWeight: 800, fontSize: place === 1 ? 13.5 : 12.5, color: C.text, textAlign: "center" }}>{it.title}</div>
                  <div style={{ minHeight: 16, marginBottom: 5, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontFamily: F_BODY, fontWeight: 600, fontSize: 11, color: C.muted, textAlign: "center", whiteSpace: "nowrap" }}>{it.value || ""}{it.trend || null}</div>
                </>;
                return it.onClick ? <button className="press" onClick={it.onClick} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", minWidth: 0, padding: 0, background: "none" }}>{body}</button> : body;
              })()}
              <div data-podium-step={place} style={{ width: "100%", height: H[place], borderRadius: "10px 10px 0 0", background: `linear-gradient(180deg, ${MEDAL[place]}59, ${MEDAL[place]}12)`, borderTop: `3px solid ${MEDAL[place]}`, display: "flex", justifyContent: "center", paddingTop: 5, boxSizing: "border-box" }}>
                <span style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: place === 1 ? 28 : 22, lineHeight: 1, color: MEDAL[place] }}>{place}</span>
              </div>
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
  const ph = useCommonsPhoto("cars", team.id);   // G30: la monoposto vera di lato, se c'è una foto libera
  const w = place === 1 ? 104 : 88, h = place === 1 ? 64 : 54;
  if (ph) return <img data-commons-car={team.id} src={ph.thumb} alt={"Monoposto " + team.name} title={ph.credit} style={{ display: "block", width: w, height: h, objectFit: "cover", borderRadius: 8, border: `2px solid ${team.color}` }} />;
  return <div style={{ height: h, display: "flex", alignItems: "flex-end" }}><CarSilhouette color={team.color} width={w} /></div>;
}
// Logo della scuderia (G30, solo con SHOW_TEAM_LOGOS: versioni di prova), altrimenti il quadratino col colore.
function TeamBadge({ team, size = 32 }) {
  const ph = useCommonsPhoto("logos", team.id);
  if (ph) return <img data-team-logo={team.id} src={ph.thumb} alt={team.name} title={ph.credit} style={{ width: size, height: size, padding: 3, boxSizing: "border-box", objectFit: "contain", borderRadius: 10, background: "#F4F2EF", flexShrink: 0 }} />;
  return <TeamMark team={team} size={size} />;
}
// Emblema geometrico della scuderia (31/10): scudo nel suo colore con una banda in diagonale e la sigla.
function TeamMark({ team, size = 32 }) {
  const id = "tm" + team.id.replace(/[^a-z0-9]/gi, "");
  const short = (team.name || team.id).replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();
  return (
    <svg data-geo-team={team.id} viewBox="0 0 40 40" width={size} height={size} aria-hidden="true" style={{ flexShrink: 0, display: "block" }}>
      <defs><clipPath id={id}><path d="M6 4 H34 Q36 4 36 6 V22 Q36 32 20 37 Q4 32 4 22 V6 Q4 4 6 4 Z" /></clipPath></defs>
      <path d="M6 4 H34 Q36 4 36 6 V22 Q36 32 20 37 Q4 32 4 22 V6 Q4 4 6 4 Z" fill={team.color} />
      <g clipPath={`url(#${id})`}>
        <path d="M-2 26 L42 6 L42 14 L-2 34 Z" fill="rgba(255,255,255,.22)" />
        <path d="M-2 31 L42 11 L42 13 L-2 33 Z" fill="rgba(0,0,0,.25)" />
      </g>
      {size >= 28 && <text x="20" y="21" textAnchor="middle" fontFamily="Titillium Web, sans-serif" fontWeight="900" fontStyle="italic" fontSize="10.5" fill="#fff" stroke="rgba(0,0,0,.35)" strokeWidth=".6" paintOrder="stroke">{short}</text>}
    </svg>
  );
}
function UserFigure({ user, place }) {
  const s = place === 1 ? 60 : 50;
  return <span aria-hidden="true" style={{ width: s, height: s, borderRadius: "50%", background: user.color, border: `3px solid ${MEDAL[place]}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F_HEAD, fontWeight: 900, fontSize: Math.round(s * .34), color: "#fff", boxSizing: "border-box" }}>{initialsOf(user)}</span>;
}
const driverPodium = (ids, onSelect) => ids.slice(0, 3).map((x, i) => { const d = standingsDriver(x.id); return { title: d ? d.name : x.id, value: x.value, trend: x.trend, trendLabel: x.trendLabel, figure: <DriverFigure driver={d} place={i + 1} />, onClick: onSelect && d && !d.guest ? () => onSelect(d) : null }; });

// Ultima gara: podio con le foto di chi ha vinto e classifica completa.
function LastRaceCard({ race, onSelectDriver }) {
  const fmtRow = r => r.time;
  return (
    <div style={{ margin: "0 16px 16px" }} data-last-race={race.real ? "real" : "demo"} data-last-race-src={race.src || "app"}>
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
                <span style={{ fontFamily: F_BODY, fontWeight: 600, fontSize: 12, color: r.pos ? C.dim : "#FF5A5F", flexShrink: 0 }}>{fmtRow(r)}</span>
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
// Frecce animate (G20): verde che scatta in su, rossa che scende, trattino grigio se uguale; se non si sa, niente.
const TREND_UP = C.green, TREND_DOWN = "#FF5A5F";
const trendStyle = (size, color) => ({ display: "inline-block", fontFamily: F_HEAD, fontWeight: 800, fontSize: size, lineHeight: 1.2, color, whiteSpace: "nowrap" });
function PriceChange({ v, size = 11 }) {
  if (v == null || v === "" || !isFinite(Number(v))) return null;
  const n = Number(v);
  if (!n) return <span data-price-change="same" className="trend-same" aria-label="prezzo uguale dopo l'ultima gara" style={trendStyle(size, C.dim)}>–</span>;
  const up = n > 0;
  return <span data-price-change={up ? "up" : "down"} className={up ? "trend-up" : "trend-down"} aria-label={(up ? "prezzo salito di " : "prezzo sceso di ") + fmtM(Math.abs(n), true)} style={trendStyle(size, up ? TREND_UP : TREND_DOWN)}>{up ? "▲" : "▼"}{fmtM(Math.abs(n), true)}</span>;
}
// Posizione nel mondiale rispetto alla gara prima: prev = posizione prima dell'ultima gara (prevPosition, la salva
// l'admin con i punti di una gara nuova); senza prev niente freccia.
const posTrendLabel = (pos, prev) => {
  if (!Number.isInteger(pos) || !Number.isInteger(prev)) return "";
  const d = prev - pos, n = Math.abs(d);
  if (!d) return "stessa posizione della gara prima";
  return (d > 0 ? (n === 1 ? "guadagnata 1 posizione" : `guadagnate ${n} posizioni`) : (n === 1 ? "persa 1 posizione" : `perse ${n} posizioni`)) + " rispetto alla gara prima";
};
function PosTrend({ pos, prev, size = 10.5 }) {
  const label = posTrendLabel(pos, prev);
  if (!label) return null;
  const d = prev - pos;
  if (!d) return <span data-trend="same" className="trend-same" aria-label={label} style={trendStyle(size, C.dim)}>–</span>;
  return <span data-trend={d > 0 ? "up" : "down"} className={d > 0 ? "trend-up" : "trend-down"} aria-label={label} style={trendStyle(size, d > 0 ? TREND_UP : TREND_DOWN)}>{d > 0 ? "▲" : "▼"}{Math.abs(d)}</span>;
}
const cardName = d => d.name.replace(/ (.+)$/, (m, sur) => " " + sur.toUpperCase());   // "K. ANTONELLI", come sulle carte di F1 Fantasy
// Contorno del tracciato, per l'intestazione della squadra.
function MiniTrack({ circuitId, width = 96 }) {
  const c = CIRCUITS[circuitId];
  if (!c) return null;
  return <svg viewBox="0 0 1600 900" width={width} height={Math.round(width * 900 / 1600)} aria-hidden="true"><polygon points={c.pts} fill="none" stroke="#fff" strokeWidth="38" strokeLinejoin="round" /></svg>;
}

// Parc fermé (G21): quando si chiudono la squadra del FantaF1 o un pronostico, un telo in carbonio scende sopra con
// "PARC FERMÉ" e l'ora della chiusura (transform, R4; con "Rimuovi animazioni" è già giù, R5). liftable: la squadra si
// può guardare alzando il telo; resta giù una striscia per riabbassarlo.
const CARBON_BG = "repeating-linear-gradient(45deg, rgba(255,255,255,.055) 0 2px, rgba(255,255,255,0) 2px 6px), repeating-linear-gradient(-45deg, rgba(0,0,0,.5) 0 2px, rgba(0,0,0,0) 2px 6px), linear-gradient(180deg, #2A2A31 0%, #111116 100%)";
const PARC_STRIP = 34;   // px del telo che restano giù quando lo si alza
function ParcFerme({ kind, at, liftable = false, compact = false }) {
  const [up, setUp] = useState(false);
  const when = at ? `Chiusa ${fmtRome(at)}, ora italiana` : "Chiusa";
  return (
    <div data-parc-ferme={kind} data-state={up ? "up" : "down"} className="parc-ferme" role="status" aria-label={`Parc fermé. ${when}`}
      style={{ position: "absolute", inset: 0, zIndex: 4, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: compact ? 2 : 6, padding: compact ? "6px 10px" : "12px 14px", background: CARBON_BG, borderRadius: compact ? 10 : 0, boxShadow: "inset 0 -10px 18px rgba(0,0,0,.45)", textAlign: "center", transform: up ? `translateY(calc(-100% + ${PARC_STRIP}px))` : "translateY(0px)" }}>
      <span aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 4, background: "repeating-linear-gradient(-45deg, #F2C230 0 7px, #111 7px 14px)" }} />
      <span style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: compact ? 15 : 26, letterSpacing: compact ? 1.5 : 3, color: "#fff", textShadow: "0 2px 6px rgba(0,0,0,.6)" }}>PARC FERMÉ</span>
      <span style={{ fontFamily: F_BODY, fontWeight: 600, fontSize: compact ? 11 : 12.5, color: "#D6D5DA" }}>{when}</span>
      {liftable && (up
        ? <button className="press" aria-label="Copri la squadra con il telo" onClick={() => setUp(false)}
            style={{ position: "absolute", left: 0, right: 0, bottom: 4, height: PARC_STRIP - 4, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F_HEAD, fontWeight: 800, fontSize: 11.5, color: "#fff", letterSpacing: .4 }}>PARC FERMÉ · copri la squadra</button>
        : <button className="press" aria-label="Alza il telo e guarda la squadra" onClick={() => setUp(true)}
            style={{ marginTop: 10, padding: "9px 16px", borderRadius: 999, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.28)", fontFamily: F_HEAD, fontWeight: 800, fontSize: 12.5, color: "#fff" }}>Guarda la squadra</button>)}
    </div>
  );
}

// Carta del FantaF1 che si gira in 3D (G23): davanti il pilota (o la scuderia) e il prezzo; toccandola si gira e dietro
// ci sono i numeri veri che l'app ha già: punti FantaF1 della stagione, quotazione con la variazione, posizione e punti
// nel mondiale. Dal retro "Cambia" apre la scelta (con la squadra chiusa è spento).
function FantaSlot({ kind, index, id, stats, boost, locked, standings, onOpen, onRemove, onBoost }) {
  const [flip, setFlip] = useState(false);
  const ph = useCommonsPhoto(kind === "drivers" ? "drivers" : "cars", id);   // G30: pilota o monoposto veri
  useEffect(() => { setFlip(false); }, [id]);
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
  const champ = ((standings && (isD ? standings.drivers : standings.teams)) || []).find(r => r.id === id) || null;
  const face = { borderRadius: 14, overflow: "hidden", border: `1px solid ${C.border}`, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" };
  // Sul retro: etichetta sopra e valore sotto (le carte dei piloti sono strette).
  const stat = (k, v, extra) => (
    <div style={{ padding: "1px 0 0", borderTop: "1px solid rgba(255,255,255,.09)", minWidth: 0 }}>
      <div style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 7.5, letterSpacing: .5, lineHeight: 1.1, color: C.dim }}>{k}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 3, fontFamily: F_HEAD, fontWeight: 900, fontSize: 10.5, lineHeight: 1.2, color: C.text, whiteSpace: "nowrap", overflow: "hidden" }}>{v}{extra}</div>
    </div>
  );
  return (
    <div data-fanta-card={id} data-flip={flip ? "back" : "front"} style={{ position: "relative", perspective: 700, opacity: locked ? .85 : 1 }}>
      <div data-flip-inner="" className="flip-inner" style={{ position: "relative", transformStyle: "preserve-3d", transform: `rotateY(${flip ? 180 : 0}deg)` }}>
        <div data-card-front="" style={{ ...face, position: "relative", background: "#0B0B0E", pointerEvents: flip ? "none" : "auto" }}>
          <button className="press" onClick={() => setFlip(true)} aria-label={`Gira la carta di ${label}`} style={{ display: "block", width: "100%", textAlign: "left" }}>
            {isD
              ? <div data-card-photo={ph ? "commons" : d.photo ? "foto" : "colore"} style={{ height: 70, background: d.photo ? `${t.color} url(${d.photo}) 50% 0 / 100% auto no-repeat` : ph ? `${t.color} url("${ph.thumb}") 50% 20% / cover no-repeat` : t.color }} />
              : ph ? <div data-card-photo="commons" style={{ height: 62, background: `${t.color} url("${ph.thumb}") center / cover no-repeat` }} />
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
        <div data-card-back="" style={{ ...face, position: "absolute", inset: 0, transform: "rotateY(180deg)", background: `linear-gradient(160deg, ${alpha(t.color, .34)} 0%, #0B0B0E 58%)`, display: "flex", flexDirection: "column", pointerEvents: flip ? "auto" : "none" }}>
          <button className="press" onClick={() => setFlip(false)} aria-label={`Torna davanti: ${label}`} style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "center", width: "100%", padding: "5px 7px 1px", textAlign: "left" }}>
            <div style={{ fontFamily: F_HEAD, fontWeight: 900, fontSize: 10, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 1 }}>{isD ? cardName(d) : t.name.toUpperCase()}</div>
            {stat("PUNTI FANTAF1", row.pts == null ? "–" : String(row.pts))}
            {stat("QUOTAZIONE", fmtM(row.price), <PriceChange v={row.change} size={9} />)}
            {stat("MONDIALE", champ && champ.position != null ? `${champ.position}° · ${champ.points == null ? "–" : champ.points} pt` : "–")}
          </button>
          <button className="press" aria-label={`Cambia ${label}`} onClick={onOpen} disabled={locked}
            style={{ margin: "0 7px 6px", padding: "4px 0", borderRadius: 8, background: locked ? "rgba(255,255,255,.08)" : C.accent, fontFamily: F_HEAD, fontWeight: 800, fontSize: 10.5, color: locked ? C.dim : "#fff" }}>{locked ? "Squadra chiusa" : "Cambia"}</button>
        </div>
      </div>
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
  const chip = (id, l) => <button key={id} className="press" aria-pressed={sort === id ? "true" : "false"} onClick={() => setSort(id)} style={{ padding: "6px 12px", borderRadius: 999, background: sort === id ? alpha(C.accentInk, .16) : "rgba(255,255,255,.05)", border: `1px solid ${sort === id ? C.accentInk : C.border}`, fontFamily: F_BODY, fontWeight: 700, fontSize: 11.5, color: sort === id ? C.text : C.muted }}>{l}</button>;
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
              <button key={r.id} data-pick={r.id} className="press" disabled={off} onClick={() => { onPick(r.id); onClose(); }} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "9px 18px", textAlign: "left", opacity: off ? .42 : 1, background: r.id === current ? alpha(C.accentInk, .08) : "transparent" }}>
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
function FantaSquadCard({ squad, setSquad, base, freeTransfers, budget, stats, race, lock, onToast, needAccount, standings }) {
  const [picking, setPicking] = useState(null);   // { kind, slot }
  const [naming, setNaming] = useState(false);
  useBack(!!picking, () => setPicking(null));
  useBack(naming, () => setNaming(false));
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
    <FantaSlot key={kind + i} kind={kind} index={i} id={squad[kind][i]} stats={stats} standings={standings} boost={kind === "drivers" && squad.drivers[i] && squad.boost === squad.drivers[i]} locked={locked}
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
          <div role="status" data-team-lock="locked" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, padding: "11px 14px", borderRadius: 14, background: alpha(C.accentInk, .14), border: `1px solid ${alpha(C.accentInk, .4)}` }}>
            <Icon name="lock" size={15} color={C.accentInk} />
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
          <div data-transfers="" style={{ fontFamily: F_HEAD, fontWeight: 900, fontSize: 15, color: tr.extra ? "#FF5A5F" : C.text }}>{tr.unlimited ? "Illimitati" : `${Math.max(0, tr.free - tr.used)} di ${tr.free}`}</div>
        </div>
      </div>
      {tr.extra > 0 && <p role="status" style={{ margin: "4px 14px 0", fontFamily: F_BODY, fontSize: 11.5, color: "#FF5A5F" }}>{tr.extra === 1 ? "1 cambio in più" : `${tr.extra} cambi in più`} dei gratis: −{tr.penalty} punti a fine weekend.</p>}

      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px 4px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: F_BODY, fontSize: 12, color: C.muted }}>Budget: <b data-budget-left="" style={{ fontFamily: F_HEAD, fontWeight: 900, fontSize: 16, color: left < 0 ? "#FF5A5F" : C.text }}>{fmtM(left, true)}</b></div>
          <div style={{ height: 4, width: 150, marginTop: 5, borderRadius: 2, background: "rgba(255,255,255,.1)", overflow: "hidden" }}><div style={{ height: "100%", width: Math.max(0, Math.min(100, left / budget * 100)) + "%", background: left < 0 ? C.red : TIMING.green }} /></div>
        </div>
        <button className="press" disabled={locked} onClick={guard(() => { setSquad(s => ({ ...s, drivers: s.drivers.map(() => null), teams: s.teams.map(() => null), boost: null })); onToast("Squadra svuotata: scegli piloti e scuderie"); })} style={{ padding: "8px 10px", fontFamily: F_HEAD, fontWeight: 800, fontSize: 13, color: C.muted, textDecoration: "underline", opacity: locked ? .45 : 1 }}>Reset</button>
        <button className="press" disabled={locked || complete} onClick={guard(() => { setSquad(s => BtLogic.autoFill(s, stats, budget)); onToast("Squadra completata: la combinazione con più punti in stagione che entra nel budget"); })} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 999, background: locked || complete ? "rgba(255,255,255,.12)" : "#fff", fontFamily: F_HEAD, fontWeight: 900, fontSize: 13, color: locked || complete ? C.dim : "#111" }}><Icon name="sparkle" size={14} color={locked || complete ? C.dim : "#111"} />Riempi</button>
      </div>
      <p style={{ margin: "2px 14px 0", fontFamily: F_BODY, fontSize: 10.5, color: C.dim }}>Budget totale {fmtM(budget, true)} · squadra {fmtM(value, true)} · tocca "2X" per raddoppiare i punti di un pilota.</p>

      <div data-squad-area="" style={{ position: "relative", overflow: "hidden" }}>
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
        {locked && <ParcFerme kind="squad" at={lock.lockAt} liftable />}
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
              style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "9px 18px", textAlign: "left", background: selected === o.id ? alpha(C.accentInk, .1) : "transparent" }}>
              {o.driver ? <Headshot driver={o.driver} size={34} /> : <span style={{ width: 34, height: 34, borderRadius: 10, background: o.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><CarSilhouette color="#F4F2EF" width={28} /></span>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 13.5, color: C.text }}>{o.label}</div>
                <div style={{ fontFamily: F_BODY, fontSize: 10.5, color: C.dim }}>{o.sub}</div>
              </div>
              {selected === o.id && <Icon name="check" size={15} color={C.accentInk} />}
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
        <div data-numpad-display="" aria-live="polite" style={{ flex: 1, height: 44, borderRadius: 12, background: "rgba(255,255,255,.04)", border: `1px solid ${value ? C.accentInk : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F_HEAD, fontWeight: 900, fontSize: 24, color: value ? C.text : C.dim, fontVariantNumeric: "tabular-nums" }}>{value || "–"}</div>
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
  useBack(picking, () => setPicking(false));
  useBack(pad != null, () => setPad(null));
  const res = BtLogic.predictionCorrect(q, answer);
  const history = q.kind === "history";
  const choice = q.kind === "poll" || history;
  const done = history ? answer != null : lock.locked;
  const parcFerme = !history && lock.locked && q.answer == null;   // G21: chiusa e risultato non ancora segnato
  const right = q.answer == null ? null : predLabel(q, q.answer);
  const badge = PRED_BADGE[q.kind] || ["DOMANDA", C.dim];
  const mine = predLabel(q, answer);
  const d = q.kind === "driver" && answer ? driverById(answer) : null, t = q.kind === "team" && answer ? teamById(answer) : null;
  const openBtn = { display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 11px", borderRadius: 12, textAlign: "left", background: "rgba(255,255,255,.05)", border: `1px solid ${answer != null ? C.accentInk : C.border}`, opacity: done ? .6 : 1 };
  return (
    <div data-prediction={q.id} style={{ padding: "13px 14px", borderRadius: 16, background: C.card, border: `1px solid ${res === true ? "rgba(62,214,107,.5)" : C.border}`, marginBottom: 10 }}>
      <span style={{ display: "inline-block", padding: "2px 7px", borderRadius: 6, background: badge[1] + "22", fontFamily: F_HEAD, fontWeight: 800, fontSize: 9.5, letterSpacing: .6, color: badge[1] }}>{badge[0]}</span>
      <div style={{ margin: "7px 0 10px", fontFamily: F_HEAD, fontWeight: 800, fontSize: 14, color: C.text, lineHeight: 1.3 }}>{q.q}</div>
      <div style={{ position: "relative", overflow: "hidden", borderRadius: 10, minHeight: parcFerme ? 54 : 0 }}>
      {parcFerme && <ParcFerme kind="prediction" at={lock.lockAt != null && lock.lockAt <= nowMs() ? lock.lockAt : null} compact />}
      {choice ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {q.options.map(([id, l]) => {
            const isMine = answer === id, isRight = q.answer === id && (history ? answer != null : true);
            const show = done && q.answer != null;
            return <button key={id} data-option={id} className="press" disabled={done} aria-pressed={isMine ? "true" : "false"} onClick={() => onAnswer(id)}
              style={{ padding: "9px 8px", borderRadius: 10, textAlign: "center", fontFamily: F_BODY, fontWeight: 700, fontSize: 12, color: C.text, background: show && isRight ? "rgba(62,214,107,.18)" : isMine ? alpha(C.accentInk, .16) : "rgba(255,255,255,.05)", border: `1px solid ${show && isRight ? "rgba(62,214,107,.6)" : isMine ? C.accentInk : C.border}` }}>{l}</button>;
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
      </div>
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

// Zona eliminazione delle leghe (G22, src/logic/qzones.js): in fondo la Zona Q1 in rosso, sopra la Zona Q2 in giallo.
const LEAGUE_ZONES = {
  q1: { label: "ZONA Q1", bg: "rgba(255,24,1,.13)", line: "rgba(255,90,95,.45)", ink: "#FF5A5F" },
  q2: { label: "ZONA Q2", bg: "rgba(255,210,31,.11)", line: "rgba(255,210,31,.45)", ink: "#FFD23F" },
};
function FantaScreen({ squad, setSquad, base, freeTransfers, budget, stats, race, lock, weekends = [], isPremium, onPremium, onToast, bonus = [], leagues = [], seasonPts = 0, realWeek = null, meAid = null, onCreateLeague, onJoinLeague, onLeaveLeague, onRenameLeague, needAccount, predictions = [], predAnswers = {}, predLockOf, onAnswerPrediction, standings }) {
  const [, setTick] = useState(0);
  useEffect(() => { const iv = setInterval(() => setTick(n => n + 1), 30000); return () => clearInterval(iv); }, []);
  const bonusPts = bonus.reduce((a, b) => a + b.pts, 0);
  const weekendPts = weekends.reduce((a, w) => a + w.total, 0);
  // 31/10: punti veri dei GP già corsi (risultati di Jolpica, regole di sempre, squadra al via di ogni weekend) + quelli
  // della sessione in corso non ancora nei risultati + i bonus dei pronostici.
  const total = seasonPts + weekendPts + bonusPts;
  const [activeLeague, setActiveLeague] = useState(null);
  const [mode, setMode] = useState(null);   // "create" | "join" | "rename"
  const [draft, setDraft] = useState("");
  const [leaveArmed, setLeaveArmed] = useState(false);
  useBack(!!mode, () => setMode(null));
  const league = leagues.find(l => l.code === activeLeague) || leagues[0] || null;
  const rows = league ? league.members.map(m => ({ ...m, me: m.aid === meAid })) : [];
  const myPos = rows.findIndex(r => r.me) + 1;
  // I migliori di tutte le mie leghe (ognuno contato una volta sola).
  const everyone = [...new Map(leagues.flatMap(l => l.members).map(m => [m.aid, { ...m, me: m.aid === meAid }])).values()].sort((a, b) => b.pts - a.pts);
  const TIPS = [
    { driver: "C. Leclerc", note: "Veloce nelle ultime gare: buon potenziale su un tracciato con curve veloci come Sepang." },
    { driver: "K. Antonelli", note: "Leader del mondiale: il 2X più sicuro per il weekend." },
  ];
  const openMode = m => { if (m === "create" && !isPremium) { onPremium(); return; } setDraft(m === "rename" && league ? league.name : ""); setMode(mode === m ? null : m); };
  const submit = () => {
    const v = draft.trim(); if (!v) return;
    const p = mode === "create" ? onCreateLeague(v) : mode === "join" ? onJoinLeague(v) : onRenameLeague(league.code, v);
    Promise.resolve(p).then(r => { if (!r) return; setMode(null); setDraft(""); if (typeof r === "string") setActiveLeague(r); });
  };
  const invite = () => {
    const txt = `Entra nella mia lega FantaF1 "${league.name}" su B&T: FANTA → Entra con un codice → ${league.code}`;
    if (nativeShareKind()) { shareNative({ title: "Lega FantaF1", text: txt }, "Invita nella lega"); return; }
    Promise.resolve(copyText(txt)).then(ok => onToast(ok ? "Invito copiato: mandalo ai tuoi amici" : "Codice della lega: " + league.code), () => onToast("Codice della lega: " + league.code));
  };
  const input = { flex: 1, minWidth: 0, padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.05)", border: `1px solid ${C.border}`, fontFamily: F_BODY, fontSize: 13, color: C.text, outline: "none" };
  const smallBtn = (label, onClick, opts = {}) => <button className="press" onClick={onClick} disabled={opts.disabled} aria-label={opts.aria} style={{ flexShrink: 0, padding: "9px 12px", borderRadius: 10, background: opts.primary ? C.accent : "rgba(255,255,255,.07)", border: `1px solid ${opts.primary ? C.accent : C.border}`, fontFamily: F_HEAD, fontWeight: 800, fontSize: 12, color: "#fff", opacity: opts.disabled ? .45 : 1 }}>{label}</button>;
  const heading = (icon, text, right) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px 10px" }}>
      <Icon name={icon} size={15} color={C.accentInk} />
      <h2 style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 16, color: C.text, margin: 0 }}>{text}</h2>
      {right && <span style={{ marginLeft: "auto", fontFamily: F_BODY, fontSize: 11, color: C.dim }}>{right}</span>}
    </div>
  );
  const wkLive = race ? weekends.filter(w => w.raceId === race.id) : [];
  const wk = realWeek ? realWeek.lines.map(l => ({ id: realWeek.round + ":" + l.type, type: l.type, total: l.pts })) : wkLive;
  return (
    <div className="scrollcol" style={{ height: "100%" }}>
      <FantaSquadCard squad={squad} setSquad={setSquad} base={base} freeTransfers={freeTransfers} budget={budget} stats={stats} race={race} lock={lock} onToast={onToast} needAccount={needAccount} standings={standings} />

      <div style={{ margin: "0 16px 16px", padding: "16px", borderRadius: 18, background: C.card, border: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 11, color: C.dim, letterSpacing: 1 }}>PUNTI DELLA STAGIONE</span>
          {myPos > 0 && <span style={{ padding: "4px 10px", borderRadius: 8, background: "rgba(231,179,76,.14)", fontFamily: F_HEAD, fontWeight: 800, fontSize: 11, color: C.gold }}>#{myPos} in lega</span>}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span data-fanta-total="" style={{ fontFamily: F_HEAD, fontWeight: 900, fontSize: 30, color: C.accentInk }}>{total}</span>
          <span style={{ fontFamily: F_BODY, fontSize: 12, color: C.muted }}>punti totali{bonusPts ? ` · di cui ${bonusPts} bonus` : ""}</span>
        </div>
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.divider}` }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
            <span style={{ flex: 1, fontFamily: F_HEAD, fontWeight: 800, fontSize: 12.5, color: C.text }}>Questo weekend{race ? " · " + race.name : ""}</span>
            <b data-weekend-pts="" style={{ fontFamily: F_HEAD, fontSize: 14, color: wk.length ? C.text : C.dim }}>{wk.reduce((a, w) => a + w.total, 0)} pt</b>
          </div>
          {wk.length ? wk.map(w => (
            <div key={w.id} data-weekend-row={w.type} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0", fontFamily: F_BODY, fontSize: 12, color: C.muted }}>
              <span style={{ flex: 1 }}>{w.type === "PEN" ? "Cambi oltre i gratis" : sessionLabelIt(w.type)}</span><b style={{ color: w.total < 0 ? "#FF5A5F" : TIMING.green }}>{w.total > 0 ? "+" : ""}{w.total}</b>
            </div>
          )) : <p style={{ margin: 0, fontFamily: F_BODY, fontSize: 11.5, color: C.dim, lineHeight: 1.45 }}>I punti arrivano con qualifiche e gara: si calcolano dai risultati veri con la squadra che avevi al via del weekend.</p>}
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

      {everyone.length >= 2 && <>
        {heading("trophy", "I MIGLIORI DI TUTTE LE LEGHE")}
        <div data-fanta-podium="" style={{ margin: "0 16px 16px", padding: "14px 12px 0", borderRadius: 18, background: C.card, border: `1px solid ${C.border}`, overflow: "hidden" }}>
          <Podium label="Podio di tutte le mie leghe" items={everyone.slice(0, 3).map((u, i) => ({ title: u.me ? "Tu" : u.name, value: fmtPts(u.pts), figure: <UserFigure user={u} place={i + 1} /> }))} />
        </div>
      </>}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px 10px" }}>
        <span style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 11, color: C.dim, letterSpacing: 1 }}>LE MIE LEGHE</span>
      </div>
      <div className="scrollrow" style={{ display: "flex", gap: 8, padding: "0 16px 12px", overflowX: "auto", scrollbarWidth: "none" }}>
        {leagues.map(l => (
          <button key={l.code} className="press" data-league={l.code} onClick={() => { setActiveLeague(l.code); setMode(null); setLeaveArmed(false); }} style={{ flexShrink: 0, padding: "9px 14px", borderRadius: 20, background: league && league.code === l.code ? C.accent : C.card, border: `1px solid ${league && league.code === l.code ? C.accent : C.border}`, fontFamily: F_HEAD, fontWeight: 700, fontSize: 12, color: league && league.code === l.code ? "#fff" : C.muted }}>{l.name}</button>
        ))}
        <button className="press" data-league-new="" onClick={() => openMode("create")} style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 5, padding: "9px 14px", borderRadius: 20, background: "rgba(231,179,76,.1)", border: "1px solid rgba(231,179,76,.3)" }}>
          {!isPremium && <Icon name="lock" size={11} color={C.gold} />}
          <span style={{ fontFamily: F_HEAD, fontWeight: 700, fontSize: 12, color: C.gold }}>+ Nuova lega</span>
        </button>
        <button className="press" data-league-join="" onClick={() => openMode("join")} style={{ flexShrink: 0, padding: "9px 14px", borderRadius: 20, background: C.card, border: `1px solid ${C.border}`, fontFamily: F_HEAD, fontWeight: 700, fontSize: 12, color: C.text }}>Entra con un codice</button>
      </div>
      {mode && (
        <div style={{ display: "flex", gap: 8, margin: "0 16px 12px" }}>
          <label htmlFor="leagueDraft" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}>{mode === "join" ? "Codice della lega" : "Nome della lega"}</label>
          <input id="leagueDraft" value={draft} onChange={e => setDraft(mode === "join" ? e.target.value.toUpperCase() : e.target.value)} placeholder={mode === "join" ? "Codice, per esempio BT-7Q2K" : "Nome della lega"} maxLength={40} style={input} />
          {smallBtn(mode === "create" ? "Crea lega" : mode === "join" ? "Entra" : "Salva nome", submit, { primary: true, disabled: !draft.trim() })}
        </div>
      )}
      {!leagues.length && !mode && <p data-league-empty="" style={{ margin: "0 20px 16px", fontFamily: F_BODY, fontSize: 12, color: C.dim, lineHeight: 1.5 }}>Crea una lega o entra col codice di un amico. I punti si calcolano dai risultati veri di ogni GP, con le regole del FantaF1 e la squadra che ognuno aveva al via del weekend.</p>}
      {league && (
        <div data-league-card={league.code} style={{ margin: "0 16px 14px", padding: "12px 14px", borderRadius: 16, background: C.card, border: `1px solid ${C.border}` }}>
          <div style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 14, color: C.text }}>{league.name}</div>
          <div style={{ fontFamily: F_BODY, fontSize: 11, color: C.dim, marginTop: 2 }}>{league.owner === meAid ? "Creata da te" : "Sei un membro"} · {league.members.length} {league.members.length === 1 ? "partecipante" : "partecipanti"} · codice {league.code}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            {smallBtn("Invita amici", invite, { primary: true })}
            {league.owner === meAid && smallBtn("Rinomina", () => openMode("rename"))}
            {smallBtn(leaveArmed ? "Esci davvero?" : "Esci dalla lega", () => { if (leaveArmed) { setLeaveArmed(false); onLeaveLeague(league.code); } else setLeaveArmed(true); })}
          </div>
        </div>
      )}

      {league && <>
      {heading("trophy", "CLASSIFICA LEGA", league.name)}
      <div data-league-table="" style={{ margin: "0 16px 16px", borderRadius: 18, background: C.card, border: `1px solid ${C.border}`, overflow: "hidden" }}>
        {rows.map((u, i) => { const zone = zoneOf(i + 1, rows.length), Z = LEAGUE_ZONES[zone], first = Z && (i === 0 || zoneOf(i, rows.length) !== zone); return (
          <React.Fragment key={u.aid}>
          {first && <div data-zone-label={zone} style={{ padding: "6px 14px 4px", background: Z.bg, borderTop: `1px solid ${Z.line}`, fontFamily: F_HEAD, fontWeight: 900, fontSize: 10, letterSpacing: 1.2, color: Z.ink }}>{Z.label}</div>}
          <div data-zone={zone} data-league-row={u.aid} data-league-me={u.me ? u.pts : undefined}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", background: Z ? Z.bg : u.me ? alpha(C.accentInk, .07) : "transparent", boxShadow: Z && u.me ? `inset 3px 0 0 ${C.accentInk}` : "none" }}>
              <span style={{ width: 20, fontFamily: F_HEAD, fontWeight: 800, fontSize: 15, color: Z ? Z.ink : C.text }}>{i + 1}</span>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: u.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontFamily: F_BODY, fontWeight: u.me ? 700 : 600, fontSize: 13, color: C.text }}>{u.name}</span>
                  {u.me && <span style={{ padding: "1px 6px", borderRadius: 5, background: C.accent, fontFamily: F_HEAD, fontWeight: 800, fontSize: 9, color: "#fff" }}>TU</span>}
                </div>
                <div style={{ fontFamily: F_BODY, fontSize: 10, color: C.dim }}>{u.team || "Squadra senza nome"}</div>
              </div>
              <span style={{ fontFamily: F_BODY, fontWeight: u.me ? 700 : 600, fontSize: 12, color: u.me ? C.text : C.dim, flexShrink: 0 }}>{fmtPts(u.pts)}</span>
            </div>
            {i < rows.length - 1 && <div style={{ height: 1, background: C.divider, margin: "0 14px" }} />}
          </div>
          </React.Fragment>
        ); })}
      </div>
      <p data-league-note="" style={{ margin: "-8px 20px 16px", fontFamily: F_BODY, fontSize: 10.5, color: C.dim, lineHeight: 1.45 }}>Punti dei GP veri (gara, qualifiche, Sprint) con le regole del FantaF1 e la squadra di ognuno al via del weekend; i cambi oltre i gratis tolgono punti. Contano i weekend da quando si ha la squadra in app.{qZones(rows.length).q1 > 0 ? ` Come nelle qualifiche 2026: con ${rows.length} squadre le ultime ${qZones(rows.length).q1} sono in Zona Q1 e le ${qZones(rows.length).q2} prima in Zona Q2.` : ""}</p>
      </>}

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

// ── TROFEI (G31) ─────────────────────────────────────────────────────────
// Medaglia dei trofei: bronzo da 1 trofeo, argento da 5, oro da 10. Nastro e disco disegnati qui; il nome della
// medaglia è nell'aria-label (non si capisce solo dal colore).
const MEDAL_INFO = {
  bronzo: { label: "Medaglia di bronzo", c0: "#8A5A2E", c1: "#CD8D52" },
  argento: { label: "Medaglia d'argento", c0: "#7C838A", c1: "#D7DCE1" },
  oro: { label: "Medaglia d'oro", c0: "#A57716", c1: "#EDC55C" },
};
function Medal({ medal, size = 14, style }) {
  const m = MEDAL_INFO[medal];
  if (!m) return null;
  return (
    <svg data-medal={medal} role="img" aria-label={m.label} width={size} height={size} viewBox="0 0 24 24" style={{ display: "inline-block", flexShrink: 0, ...style }}>
      <path d="M6.5 1h4.6l2.4 7.6H8.9z" fill="#C8102E" />
      <path d="M12.9 1h4.6l-2.4 7.6h-4.6z" fill="#8E0C21" />
      <circle cx="12" cy="15" r="8" fill={m.c0} />
      <circle cx="12" cy="15" r="6.3" fill={m.c1} />
      {size >= 18 && <path d="M12 11.4L12.88 13.79L15.42 13.89L13.43 15.46L14.12 17.91L12 16.5L9.88 17.91L10.57 15.46L8.58 13.89L11.12 13.79Z" fill={m.c0} />}
    </svg>
  );
}
// Avviso "Trofeo sbloccato: <nome>" in alto (3,6 s): non copre i tocchi; più trofei insieme in un avviso solo.
function TrophyNotice({ n }) {
  const many = n.names.length > 1, title = many ? "Trofei sbloccati" : "Trofeo sbloccato";
  return (
    <div key={n.key} className="live-notice" data-trophy-notice={n.ids.join(",")} role="status" aria-label={title + ": " + n.names.join(", ")}
      style={{ position: "absolute", top: 10, left: 10, right: 10, zIndex: 900, pointerEvents: "none", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px 9px 9px", borderRadius: 16, background: "linear-gradient(100deg, #1C1810 0%, #2B2314 100%)", border: "1px solid rgba(231,179,76,.5)", boxShadow: "0 14px 30px -12px rgba(0,0,0,.75)" }}>
      <span style={{ width: 38, height: 38, borderRadius: 12, background: "rgba(231,179,76,.16)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="trophy" size={20} color={C.gold} sw={2} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 12, letterSpacing: .6, color: C.gold }}>{title}</div>
        <div style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 15, color: "#fff", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.names.join(", ")}</div>
      </div>
    </div>
  );
}
// Bacheca nel Profilo: il casco, la medaglia, "N di 15 trofei" e la prossima medaglia; aperta, i trofei vinti con la
// data (i più recenti prima) e quelli da vincere con cosa serve e, dove si conta, quanto manca.
function TrophyCase({ trophies = {}, progress = {}, helmet = null, defs = TROPHIES }) {
  const [open, setOpen] = useState(false);
  const won = defs.filter(t => trophies[t.id]).sort((a, b) => trophies[b.id] - trophies[a.id]);
  const todo = defs.filter(t => !trophies[t.id]);
  const n = won.length, medal = medalOf(n);
  const nextAt = n < 1 ? 1 : n < 5 ? 5 : n < 10 ? 10 : null;
  const extra = t => {
    const p = progress[t.id] || {};
    if (t.id === "pitcrew" || t.id === "pitperfetto") return p.value != null ? `Record ${fmtSec(p.value)} s` : null;
    return t.goal > 1 && p.value != null ? `${Math.min(p.value, t.goal)} di ${t.goal}` : null;
  };
  const group = { padding: "12px 14px 4px", fontFamily: F_BODY, fontWeight: 700, fontSize: 10.5, letterSpacing: 1, color: C.dim, borderTop: `1px solid ${C.divider}` };
  const row = (t, w, i) => {
    const hide = t.secret && !w, x = !w && extra(t);
    return (
      <div key={t.id} data-trophy={t.id} data-won={w ? "1" : "0"} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderTop: i ? `1px solid ${C.divider}` : "none" }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, background: w ? "rgba(231,179,76,.14)" : "transparent", border: w ? "1px solid rgba(231,179,76,.4)" : `1px dashed ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon name={hide ? "lock" : "trophy"} size={16} color={w ? C.gold : C.dim} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 13.5, color: w ? C.text : C.muted }}>{hide ? SECRET_NAME : t.name}</div>
          <div style={{ fontFamily: F_BODY, fontSize: 11.5, color: C.dim, lineHeight: 1.35, marginTop: 1 }}>{w ? `Vinto il ${fmtDay(trophies[t.id])}` : hide ? SECRET_HOW : t.how}</div>
        </div>
        {x && <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 12, color: C.muted, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{x}</span>}
      </div>
    );
  };
  return (
    <>
      <div style={{ padding: "0 24px 10px" }}><span style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 11, color: C.dim, letterSpacing: 1 }}>I MIEI TROFEI</span></div>
      <div data-trophies="" style={{ margin: "0 20px 22px", borderRadius: 18, background: C.card, border: `1px solid ${C.border}`, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 14 }}>
          <div style={{ position: "relative", width: 58, height: 58, borderRadius: "50%", background: "#111114", border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <HelmetArt spec={helmet} size={46} />
            {medal && <span style={{ position: "absolute", right: -5, bottom: -5, display: "flex" }}><Medal medal={medal} size={26} /></span>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 16, color: C.text }}>{n} di {defs.length} trofei</div>
            <div style={{ fontFamily: F_BODY, fontWeight: 600, fontSize: 12, color: medal ? C.gold : C.muted, marginTop: 2 }}>{medal ? MEDAL_INFO[medal].label : "Nessuna medaglia per ora"}</div>
            <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,.07)", marginTop: 8, overflow: "hidden" }}>
              <div style={{ width: `${(n / defs.length) * 100}%`, height: "100%", borderRadius: 2, background: C.gold }} />
            </div>
            <div style={{ fontFamily: F_BODY, fontSize: 11, color: C.dim, marginTop: 5 }}>{nextAt ? `${MEDAL_INFO[medalOf(nextAt)].label} a ${nextAt} ${nextAt === 1 ? "trofeo" : "trofei"}` : "Hai la medaglia più alta"}</div>
          </div>
        </div>
        <button className="press" aria-expanded={open ? "true" : "false"} onClick={() => setOpen(o => !o)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", minHeight: 44, borderTop: `1px solid ${C.divider}`, fontFamily: F_HEAD, fontWeight: 800, fontSize: 12.5, color: C.text }}>
          {open ? "Chiudi la bacheca" : "Apri la bacheca"}
          <span style={{ display: "flex", transform: `rotate(${open ? -90 : 90}deg)`, transition: "transform .2s" }}><Icon name="chevron" size={13} color={C.muted} /></span>
        </button>
        {open && won.length > 0 && <div style={group}>VINTI</div>}
        {open && won.map((t, i) => row(t, true, i))}
        {open && todo.length > 0 && <div style={group}>DA VINCERE</div>}
        {open && todo.map((t, i) => row(t, false, i))}
      </div>
    </>
  );
}

function ProfiloScreen({ ig, onOpenIg, trial = null, trialUsed = false, onBack, onNotifiche, onPremium, onAdmin, onLogout, isPremium, onAbout, onHelp, onFeedback, aboutMe, onSaveAboutMe, favTeam, favDriver, onPickTeam, onPickDriver, guest, onLogin, onTerms, blocked = [], onUnblock, onDeleteAccount, savedCount = 0, onOpenSaved, account = null, onSaveName, isAdmin = false, onTheme, sounds = true, haptics = true, onSounds, onHaptics, helmet = null, onHelmet, trophies = {}, trophyProg = {}, trophyList = TROPHIES, onAdPrivacy = null }) {
  const ft = favTeam ? teamById(favTeam) : null;
  const fd = favDriver ? driverById(favDriver) : null;
  const favRows = [
    { key: "team", icon: "flag", label: "Scuderia del cuore", value: ft ? ft.name : "Scegli", color: ft && ft.color, tag: ft && ft.tag, onClick: onPickTeam },
    { key: "driver", icon: "heart", label: "Pilota del cuore", value: fd ? fd.full : "Scegli", color: fd && fd.color, tag: fd && fd.tag, onClick: onPickDriver },
    { key: "saved", icon: "bookmark", label: "Articoli salvati", value: savedCount ? `${savedCount} ${savedCount === 1 ? "articolo" : "articoli"}` : "Nessuno", color: savedCount ? C.gold : null, onClick: onOpenSaved },
  ];
  const [editing, setEditing] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  useBack(editing, () => setEditing(false));
  useBack(confirmDel, () => { if (!delBusy) { setConfirmDel(false); setDelPw(""); setDelErr(""); } });
  // Nome ed email dell'account (Firebase): il nome si modifica, l'email no.
  const email = account ? account.email : "";
  const [name, setName] = useState(account ? account.name : "");
  const [nameErr, setNameErr] = useState("");
  const saveName = () => {
    if (!name.trim()) { setNameErr("Scrivi il tuo nome"); return; }
    setNameErr("");
    Promise.resolve(onSaveName && onSaveName(name)).then(() => setEditing(false), () => setNameErr("Non salvato: controlla la connessione e riprova."));
  };
  // Eliminazione: si chiede la password, così Firebase la riconosce prima di cancellare qualsiasi cosa.
  const [delPw, setDelPw] = useState("");
  const [showDelPw, setShowDelPw] = useState(false);
  const [delErr, setDelErr] = useState("");
  const [delBusy, setDelBusy] = useState(false);
  const doDelete = () => {
    if (delBusy) return;
    if (!delPw) { setDelErr(ACCOUNT_MSG["need-password"]); return; }
    setDelErr(""); setDelBusy(true);
    Promise.resolve(onDeleteAccount && onDeleteAccount(delPw)).then(() => { setDelBusy(false); setConfirmDel(false); }, e => { setDelBusy(false); setDelErr(messageOf(e)); });
  };
  // Profilo non ancora letto da Firebase (avvio senza rete): niente nome né "Su di te" da mostrare o modificare.
  const waiting = !!account && account.loaded === false;
  const noAbout = !waiting && !!aboutMe && aboutMe.fan == null && aboutMe.follow == null;   // account di oggi senza "Su di te"
  const rows = [
    { icon: "bell", label: "Notifiche", onClick: onNotifiche, chevron: true },
    { icon: "palette", label: "Colori dell'app", onClick: onTheme, chevron: true },
    { icon: "sound", label: "Suoni", toggle: { on: sounds, onChange: onSounds } },
    { icon: "vibrate", label: "Vibrazioni", toggle: { on: haptics, onChange: onHaptics } },
    ...(isAdmin ? [{ icon: "gear", label: "Pannello Admin · Pubblica notizia", onClick: onAdmin, badge: "ADMIN" }] : []),
    { icon: "help", label: "Assistenza", onClick: onHelp, chevron: true },
    { icon: "chat", label: "Invia feedback", onClick: onFeedback, chevron: true },   // come oggi, ma dal Profilo (niente pulsante fluttuante)
    // Buy Me a Coffee (18/10): finché il link non c'è, "in arrivo".
    { icon: "star", label: "Offrici un caffè", onClick: COFFEE_URL ? () => openUrl(COFFEE_URL) : undefined, ...(COFFEE_URL ? { chevron: true } : { badge: "IN ARRIVO" }) },
    { icon: "info", label: "Info su B&T", onClick: onAbout, chevron: true },
    { icon: "lock", label: "Privacy Policy", onClick: () => openUrl(PRIVACY_URL), chevron: true },
    // Scelte sul consenso degli annunci (UE): Google chiede che si possano cambiare quando servono (Termini, punto 7).
    ...(onAdPrivacy ? [{ icon: "lock", label: "Preferenze privacy annunci", onClick: onAdPrivacy, chevron: true }] : []),
    { icon: "doc", label: "Termini e Condizioni", onClick: onTerms, chevron: true },
  ];
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
          <div data-profile-avatar="" style={{ width: 84, height: 84, borderRadius: "50%", background: C.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <button className="press" aria-label="Modifica il casco" onClick={onHelmet} style={{ width: 78, height: 78, borderRadius: "50%", background: "#111114", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <HelmetArt spec={helmet} size={64} />
            </button>
          </div>
          {!waiting && <button className="press" aria-label={editing ? "Salva profilo" : "Modifica profilo"} onClick={() => (editing ? saveName() : (setName(account ? account.name : ""), setEditing(true)))} style={{ position: "absolute", bottom: -2, right: -2, width: 30, height: 30, borderRadius: "50%", background: editing ? C.accent : C.card, border: `2px solid ${C.bg}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name={editing ? "check" : "edit"} size={13} color={editing ? "#fff" : C.text} sw={2.3} />
          </button>}
        </div>
        {editing ? (
          <div style={{ width: "100%", marginTop: 18 }}>
            <label style={{ display: "block", fontFamily: F_BODY, fontWeight: 600, fontSize: 11.5, color: C.muted, marginBottom: 5 }} htmlFor="pfName">Nome</label>
            <input id="pfName" value={name} onChange={e => setName(e.target.value)} style={{ width: "100%", padding: "11px 13px", borderRadius: 12, background: C.card, border: `1px solid ${C.border}`, fontFamily: F_BODY, fontSize: 13, color: C.text, marginBottom: 10 }} />
            <span style={{ display: "block", fontFamily: F_BODY, fontWeight: 600, fontSize: 11.5, color: C.muted, marginBottom: 5 }}>Email</span>
            <div style={{ padding: "11px 13px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: `1px solid ${C.border}`, fontFamily: F_BODY, fontSize: 13, color: C.muted, marginBottom: 6 }}>{email}</div>
            <p style={{ margin: "0 0 12px", fontFamily: F_BODY, fontSize: 11, color: C.dim }}>L'email è quella con cui accedi e non si può cambiare.</p>
            {nameErr && <p role="alert" style={{ margin: "0 0 10px", fontFamily: F_BODY, fontSize: 12, color: "#ff6b6b" }}>{nameErr}</p>}
            <button className="press" onClick={saveName} style={{ display: "block", width: "100%", padding: "12px 0", borderRadius: 12, background: C.accent, fontFamily: F_HEAD, fontWeight: 800, fontSize: 13, color: "#fff", textAlign: "center" }}>SALVA</button>
          </div>
        ) : (
          <>
            <h2 data-profile-name={waiting ? "waiting" : ""} style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 18, color: waiting ? C.muted : C.text, margin: "14px 0 3px" }}>{waiting ? "Profilo in caricamento…" : account ? account.name : ""}{!waiting && <Medal medal={medalOf(Object.keys(trophies).length)} size={18} style={{ marginLeft: 7, verticalAlign: "-2px" }} />}</h2>
            <span style={{ fontFamily: F_BODY, fontSize: 12, color: C.muted }}>{email}</span>
          </>
        )}
      </div>
      )}
      {ig && onOpenIg && <IgBigButton ig={ig} onOpen={onOpenIg} />}
      {!guest && noAbout && <p data-about-missing="" style={{ margin: "0 20px 10px", padding: "10px 14px", borderRadius: 12, background: "rgba(231,179,76,.1)", border: "1px solid rgba(231,179,76,.3)", fontFamily: F_BODY, fontSize: 12.5, color: C.text, lineHeight: 1.45 }}>Completa il tuo profilo: che tifoso sei e da quanti anni segui la F1</p>}
      {!guest && waiting && <p data-profile-waiting="" role="status" style={{ margin: "0 20px 14px", padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,.04)", border: `1px solid ${C.border}`, fontFamily: F_BODY, fontSize: 12.5, color: C.muted, lineHeight: 1.45 }}>{ACCOUNT_MSG["not-loaded"]}</p>}
      {!guest && !waiting && <AboutCard about={aboutMe} onSave={onSaveAboutMe} />}
      {!guest && !waiting && <TrophyCase trophies={trophies} progress={trophyProg} helmet={helmet} defs={trophyList} />}

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
          : trialUsed ? "Rimuovi la pubblicità e sblocca tutti i contenuti esclusivi B&T." : "Prova gratis per un GP: niente pubblicità e tutti i contenuti esclusivi B&T."}</p>
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
            <div key={(b.aid || "") + ":" + b.name}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="no" size={16} /></div>
                <span style={{ flex: 1, fontFamily: F_BODY, fontWeight: 600, fontSize: 14, color: C.text }}>{b.name}</span>
                <button className="press" onClick={() => onUnblock && onUnblock(b)} style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${C.border}`, fontFamily: F_BODY, fontWeight: 600, fontSize: 12, color: C.muted }}>Sblocca</button>
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
            {r.toggle ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name={r.icon} size={16} /></div>
                <span style={{ flex: 1, fontFamily: F_BODY, fontWeight: 600, fontSize: 14, color: C.text }}>{r.label}</span>
                <Toggle on={!!r.toggle.on} onChange={v => r.toggle.onChange && r.toggle.onChange(v)} label={r.label} />
              </div>
            ) : (
            <button className="press" onClick={r.onClick || undefined} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: 14, textAlign: "left" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name={r.icon} size={16} /></div>
              <span style={{ flex: 1, fontFamily: F_BODY, fontWeight: 600, fontSize: 14, color: C.text }}>{r.label}</span>
              {r.badge && <span style={{ padding: "2px 8px", borderRadius: 6, background: "rgba(231,179,76,.16)", fontFamily: F_HEAD, fontWeight: 800, fontSize: 9, color: C.gold, letterSpacing: .4 }}>{r.badge}</span>}
              {r.chevron && <Icon name="chevron" size={16} color={C.dim} />}
            </button>
            )}
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
            <Icon name="trash" size={30} color={C.accentInk} />
            <h2 style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 19, color: C.text, margin: "12px 0 8px" }}>Eliminare l'account?</h2>
            <p style={{ fontFamily: F_BODY, fontSize: 13, color: C.muted, lineHeight: 1.6, margin: "0 0 14px" }}>Cancelleremo il tuo profilo, i messaggi che hai scritto in chat, le segnalazioni e i feedback che hai inviato. L'operazione non si può annullare.</p>
            <label htmlFor="delPw" style={{ display: "block", textAlign: "left", fontFamily: F_BODY, fontWeight: 600, fontSize: 12, color: C.muted, marginBottom: 6 }}>Per confermare scrivi la tua password</label>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}><input id="delPw" type={showDelPw ? "text" : "password"} value={delPw} onChange={e => { setDelPw(e.target.value); setDelErr(""); }} placeholder="••••••••" style={{ flex: 1, minWidth: 0, padding: "11px 13px", borderRadius: 12, background: C.bg, border: `1px solid ${C.border}`, fontFamily: F_BODY, fontSize: 14, color: C.text, ...(showDelPw ? PW_SHOWN : {}) }} /><PwEye on={showDelPw} onToggle={setShowDelPw} /></div>
            {delErr && <p role="alert" style={{ margin: "0 0 10px", fontFamily: F_BODY, fontSize: 12, color: "#ff6b6b", lineHeight: 1.45 }}>{delErr}</p>}
            <button className="press" onClick={doDelete} disabled={delBusy} style={{ display: "block", width: "100%", padding: "14px 0", borderRadius: 14, background: delBusy ? "#555" : C.accent, fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 13.5, color: "#fff", marginBottom: 6 }}>ELIMINA DEFINITIVAMENTE</button>
            <button className="press" onClick={() => { setConfirmDel(false); setDelPw(""); setDelErr(""); }} style={{ display: "block", width: "100%", padding: "12px 0", fontFamily: F_BODY, fontWeight: 600, fontSize: 13, color: C.muted }}>Annulla</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Centro Notifiche (G18): la riga dello stato dice se il Pit Wall (Firebase) si raggiunge: senza la rete del telefono,
// o se all'avvio i dati non sono arrivati (offline), "Pit Wall non raggiungibile".
function NotificheScreen({ onBack, notifs, onReadAll, isPremium, onPremium, favTeam, favDriver, prefs, onPrefs, onGoProfilo, onAction, offline = false }) {
  const ft = favTeam ? teamById(favTeam) : null;
  const fd = favDriver ? driverById(favDriver) : null;
  const net = useNetOnline();
  const reach = net && !offline;
  const prefRows = [
    { key: "team", icon: "garage", title: ft ? `News su ${ft.name}` : "News sulla scuderia del cuore", sub: ft ? ft.tag : "Nessuna scuderia scelta", color: ft && ft.color, enabled: !!ft },
    { key: "driver", icon: "helmet", title: fd ? `News su ${fd.full}` : "News sul pilota del cuore", sub: fd ? fd.tag : "Nessun pilota scelto", color: fd && fd.color, enabled: !!fd },
  ];
  return (
    <div className="scrollcol" style={{ height: "100%" }}>
      <SubHeader title="Centro Notifiche" onBack={onBack} />
      <div role="status" data-pitwall={reach ? "on" : "off"} style={{ display: "flex", alignItems: "center", gap: 9, margin: "-4px 20px 14px", padding: "10px 14px", borderRadius: 12, background: C.card, border: `1px solid ${reach ? alpha(C.green, .35) : "rgba(231,179,76,.4)"}` }}>
        <span className={reach ? "pitwall-led" : undefined} style={{ width: 9, height: 9, borderRadius: "50%", background: reach ? C.green : C.gold, boxShadow: `0 0 8px ${reach ? C.green : C.gold}`, flexShrink: 0 }} />
        <span style={{ fontFamily: F_BODY, fontWeight: 600, fontSize: 12.5, color: C.text }}>{reach ? "Stato: Connesso al Pit Wall" : "Stato: Pit Wall non raggiungibile"}</span>
      </div>
      <div style={{ padding: "0 24px 8px" }}><span style={{ fontFamily: F_BODY, fontWeight: 700, fontSize: 11, color: C.dim, letterSpacing: 1 }}>NOTIZIE DEDICATE</span></div>
      <div style={{ margin: "0 20px 8px", borderRadius: 16, background: C.card, border: `1px solid ${C.border}`, overflow: "hidden" }}>
        {prefRows.map((r, i) => (
          <div key={r.key}>
            <div data-pref-row={r.key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px" }}>
              <span data-pref-icon="" style={{ width: 34, height: 34, borderRadius: 10, background: r.color ? alpha(r.color, .16) : "rgba(255,255,255,.06)", border: `1px solid ${r.color ? alpha(r.color, .4) : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name={r.icon} size={17} color={r.color ? (Colors.contrast(r.color, "#000000") >= 3 ? r.color : C.text) : C.dim} /></span>
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
        <button className="press" onClick={onGoProfilo} style={{ display: "block", margin: "0 24px 12px", fontFamily: F_BODY, fontWeight: 600, fontSize: 12, color: C.accentInk }}>Scegli scuderia e pilota del cuore nel profilo →</button>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 20px 10px" }}>
        <button className="press" onClick={onReadAll} style={{ fontFamily: F_BODY, fontWeight: 600, fontSize: 12, color: C.accentInk }}>Segna tutte come lette</button>
      </div>
      <div style={{ padding: "0 20px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, background: C.card, border: `1px solid ${C.border}` }}>
            <Icon name="bell" size={15} color={C.gold} />
            <span style={{ flex: 1, fontFamily: F_BODY, fontWeight: 600, fontSize: 12.5, color: C.text }}>Avvisi in gara sul tuo pilota attivi</span>
            <Icon name="check" size={14} color={C.green} sw={2.4} />
          </div>
      </div>
      {notifs.map((n, i) => {
        const Row = n.action ? "button" : "div";   // le notifiche con un'azione (es. il feedback) si toccano
        return (
        <div key={n.id || i}>
          <Row {...(n.action ? { className: "press", "data-notif-action": n.action, onClick: () => onAction && onAction(n.action) } : {})} style={{ display: "flex", alignItems: "flex-start", gap: 12, width: "100%", textAlign: "left", padding: "14px 20px", background: n.unread ? alpha(C.accentInk, .06) : "transparent" }}>
            {n.bg === "gold-soft"
              ? <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(231,179,76,.16)", border: "1px solid rgba(231,179,76,.35)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="star" size={16} color={C.gold} /></div>
              : <IconCircle name={n.icon} bg={n.bg} stroke={n.stroke} size={40} filled />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontFamily: F_HEAD, fontWeight: 700, fontSize: 13, color: C.text }}>{n.title}</span>
              <p style={{ margin: "3px 0 0", fontFamily: F_BODY, fontSize: 12, color: C.muted, lineHeight: 1.4 }}>{n.body}</p>
              <span style={{ display: "block", marginTop: 6, fontFamily: F_BODY, fontSize: 10, color: C.dim }}>{n.time}</span>
            </div>
          </Row>
          {i < notifs.length - 1 && <div style={{ height: 1, background: C.divider }} />}
        </div>
        );
      })}
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
      <div style={{ width: 54, height: 54, borderRadius: 16, background: alpha(C.accentInk, .12), display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}><Icon name="lock" size={24} color={C.accentInk} /></div>
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
const ADMIN_TABS = ["NEWS", "SONDAGGI", "FANTA F1", "PREVISIONI", "CLASSIFICHE", "GARA LIVE", "MERCATO", "INSTAGRAM", "VIDEO", "FOTO", "NOTIFICHE", "CHAT"];
const aInput = { width: "100%", padding: "10px 12px", borderRadius: 10, background: "#101013", border: `1px solid ${C.border}`, fontFamily: F_BODY, fontSize: 13, color: C.text, boxSizing: "border-box" };
const aNum = { ...aInput, padding: "8px 6px", textAlign: "center", fontSize: 12.5 };
const aLabel = { display: "block", fontFamily: F_BODY, fontWeight: 700, fontSize: 10.5, letterSpacing: .8, color: C.dim, margin: "0 0 6px" };
const aCard = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 14 };
const aTitle = { fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 13, get color() { return C.accentInk; }, margin: "4px 0 10px", letterSpacing: .3 };
const aChip = (active, color = C.accentInk) => ({ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: 999, background: active ? color + "33" : "rgba(255,255,255,.04)", border: `1px solid ${active ? color : C.border}`, fontFamily: F_BODY, fontWeight: 600, fontSize: 11.5, color: active ? C.text : C.muted });
function ABtn({ children, onClick, disabled, kind = "primary", style }) {
  const bg = kind === "primary" ? C.accent : "rgba(255,255,255,.07)";
  return <button className="press" onClick={onClick} disabled={disabled} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "12px 0", borderRadius: 12, background: bg, opacity: disabled ? .45 : 1, fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 13, color: "#fff", ...style }}>{children}</button>;
}
function TrashBtn({ onClick, label }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => { if (!armed) return; const t = setTimeout(() => setArmed(false), 2500); return () => clearTimeout(t); }, [armed]);
  return <button className="press" aria-label={label} onClick={() => armed ? onClick() : setArmed(true)} style={{ flexShrink: 0, padding: armed ? "6px 9px" : 6, borderRadius: 8, background: armed ? alpha(C.accentInk, .18) : "transparent", fontFamily: F_BODY, fontWeight: 700, fontSize: 10.5, color: C.accentInk }}>{armed ? "Elimina?" : <Icon name="trash" size={15} color={C.dim} />}</button>;
}
// Messaggi dell'app di oggi per la foto caricata dall'admin (codici di uploadImage, src/services/firebase.js).
const IMG_MSG = {
  formato: "Formato non supportato: scegli una foto JPG o PNG.",
  "troppo-grande": "Foto troppo pesante anche dopo la compressione: scegline un'altra.",
  timeout: "La foto non è stata caricata: connessione assente o troppo lenta, riprova.",
  offline: "La foto non è stata caricata: connessione assente o troppo lenta, riprova.",
};
// Pulsante "Allega immagine" come nella vecchia app: il tocco arriva direttamente al campo file vero,
// che è trasparente e copre tutto il pulsante (funziona anche dove l'apertura "comandata" è bloccata).
// La foto si comprime sul telefono e va su Firebase (shared/img-<id>); onChange riceve "fsimg:<id>".
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
    uploadImage(file).then(ref => { setBusy(false); onChange(ref); }, x => { setBusy(false); setErr(IMG_MSG[x && x.code] || "Upload non riuscito, riprova."); });
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
          {busy ? <ShiftLight size={5} label="Caricamento della foto" /> : <><Icon name="image" size={15} />{value ? changeLabel : label}</>}
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
  const [gen, setGen] = useState({ busy: false, err: null });   // tasto "ChatGPT" (backend di oggi, src/services/backend.js)
  const set = (k, v) => { if (k === "image") setImgBroken(false); setF(p => ({ ...p, [k]: v })); setError(null); };
  // Foto cambiata o tolta prima di pubblicare: quella caricata prima si cancella da Firebase (nessuna notizia la usa).
  const setImage = v => { if (f.image && f.image !== v && !articles.some(a => a.image === f.image)) dropStoredImage(f.image); set("image", v); };
  const writeWithChatGPT = () => {
    setGen({ busy: true, err: null });
    generateArticle({ title: f.title, summary: f.summary, category: f.cat })
      .then(text => { setGen({ busy: false, err: null }); set("body", text); }, e => setGen({ busy: false, err: e.message }));
  };
  // Eliminando una notizia si cancella anche la sua foto, se nessun'altra notizia la usa (come l'app di oggi): si
  // guarda nell'elenco appena riletto da Firebase, dove ci sono anche quelle scritte intanto dagli altri.
  const remove = a => {
    let used = true;
    setArticles(list => { const next = list.filter(x => x.id !== a.id); used = next.some(x => x.image === a.image); return next; }).then(ok => {
      if (!ok) return;
      onToast("Articolo eliminato");
      if (!used) dropStoredImage(a.image);
    });
  };
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
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: gen.err ? 6 : 10 }}>
          <ImagePicker id="adImg" value={f.image} onChange={setImage} />
          <button type="button" className="press" data-chatgpt="" onClick={writeWithChatGPT} disabled={gen.busy} aria-label="Scrivi il contenuto con ChatGPT"
            style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6, padding: "10px 13px", borderRadius: 10, background: "rgba(255,255,255,.06)", border: `1px solid ${C.border}`, fontFamily: F_BODY, fontWeight: 600, fontSize: 12.5, color: C.text, opacity: gen.busy ? .6 : 1, whiteSpace: "nowrap" }}>
            {gen.busy ? <ShiftLight size={4} label="ChatGPT sta scrivendo" /> : <><Icon name="sparkle" size={15} />ChatGPT</>}
          </button>
        </div>
        {gen.err && <p role="alert" style={{ margin: "0 2px 10px", fontFamily: F_BODY, fontSize: 11.5, color: "#ff6b6b" }}>{gen.err}</p>}
        {f.image && (
          <div style={{ position: "relative", marginBottom: 10 }}>
            {imgBroken
              ? <div role="alert" style={{ height: 70, borderRadius: 10, border: "1px dashed rgba(255,24,1,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 40px", fontFamily: F_BODY, fontSize: 12, color: "#ff6b6b", textAlign: "center" }}>Impossibile caricare l'immagine da questo link.</div>
              : <StoredImg src={f.image} alt="Anteprima immagine" onError={() => setImgBroken(true)} style={{ width: "100%", height: "auto", maxHeight: 260, objectFit: "contain", background: "#111", borderRadius: 10, display: "block" }}
                  fallback={<div style={{ height: 70, borderRadius: 10, background: "#111", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F_BODY, fontSize: 12, color: C.dim }}>Caricamento della foto…</div>} />}
            <button className="press" aria-label="Rimuovi immagine" onClick={() => setImage("")} style={{ position: "absolute", top: 6, right: 6, width: 26, height: 26, borderRadius: "50%", background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="close" size={11} color="#fff" sw={2.4} /></button>
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
        {error && <p role="alert" style={{ margin: "0 0 10px", fontFamily: F_BODY, fontSize: 12, color: "#ff6b6b" }}>{error}</p>}
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
          <TrashBtn label={"Elimina " + a.title} onClick={() => remove(a)} />
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
  useBack(!!picking, () => setPicking(null));
  useBack(!!pad, () => setPad(null));
  const next = weekendRace(races) || races[races.length - 1];
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
                {kind === "history" && <button className="press" aria-label={"Risposta giusta: " + (i + 1)} aria-pressed={histAns === i ? "true" : "false"} onClick={() => setHistAns(i)} style={aChip(histAns === i, TIMING.green)}>{histAns === i ? "Giusta" : "–"}</button>}
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
            <p style={{ margin: "0 0 10px", fontFamily: F_BODY, fontSize: 11, color: C.dim }}>Per il weekend di: {next ? next.name : "–"}</p>
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
    // Frecce del mondiale (G20): se cambiano dei punti è arrivata una gara nuova e la posizione di prima (prev) di tutte
    // le righe diventa quella salvata finora; se cambiano solo posizioni o nota (una correzione) prev resta com'era.
    const withPrev = (list, old) => {
      const byId = new Map((old || []).map(o => [o.id, o]));
      const race = list.some(r => { const o = byId.get(r.id); return o && o.points !== r.points; });
      return list.map(r => { const { prev: _p, ...rest } = r, o = byId.get(r.id), prev = o ? (race ? o.position : o.prev) : null; return Number.isInteger(prev) && prev > 0 ? { ...rest, prev } : rest; });
    };
    setStandings({ note: draft.note, drivers: withPrev(conv(draft.drivers), standings.drivers), teams: withPrev(conv(draft.teams), standings.teams) }).then(ok => ok && onToast("Classifiche salvate"));
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

// Prova diretta (DEMO): l'admin fa partire una sessione simulata e manda bandiere come la direzione gara, per provare
// la pagina Race. Gira solo sul suo telefono e non cambia niente di quello che vedono gli altri (D23).
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
      <div style={aTitle}>PROVA DIRETTA (DEMO)</div>
      <div style={aCard} data-admin-demo="">
        <p style={{ margin: "0 0 10px", fontFamily: F_BODY, fontSize: 11.5, color: C.muted, lineHeight: 1.5 }}>Prova la pagina Race con una sessione simulata sul tracciato della gara scelta: piloti in pista, tempi, settori, bandiere e messaggi, con la scritta DEMO. La vedi solo tu, su questo telefono: per gli altri non cambia niente (stato delle gare, ultima gara, punti FantaF1). Le dirette vere arrivano da OpenF1.</p>
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

// Radio delle gomme (Rilevatore di bluff): l'admin ascolta i team radio veri della sessione della gara LIVE e segna
// quelli in cui un pilota parla di gomme, con la frase se vuole (shared/bt-bluff-<sessione>). Nel Garage tutti vedono
// il verdetto contro i tempi dei giri dopo. Una radio senza giro non si può giudicare.
function AdminBluffCard({ live, tags = [], onTag, onUntag }) {
  const [texts, setTexts] = useState({});
  const [busy, setBusy] = useState(null);
  const of1 = isOf1Live(live), race = of1 && isRaceType(live.type);
  const radios = race ? live.sim.radios() : [];
  const keyOf = r => r.code + "|" + r.date;
  const tagOf = r => tags.find(x => x && x.code === r.code && x.date === r.date) || null;
  const act = (r, fn) => { const k = keyOf(r); setBusy(k); Promise.resolve(fn()).then(ok => { if (ok) setTexts(x => ({ ...x, [k]: "" })); }).finally(() => setBusy(b => (b === k ? null : b))); };
  const note = (k, t) => <p data-bluff-admin-empty={k} style={{ margin: 0, fontFamily: F_BODY, fontSize: 12, color: C.dim, lineHeight: 1.5 }}>{t}</p>;
  const btn = { flexShrink: 0, padding: "9px 12px", borderRadius: 10, fontFamily: F_HEAD, fontWeight: 800, fontSize: 12, color: C.text, background: "rgba(255,255,255,.07)", border: `1px solid ${C.border}` };
  return (
    <>
      <div style={aTitle}>RADIO DELLE GOMME</div>
      <div style={aCard} data-admin-bluff="">
        <p style={{ margin: "0 0 10px", fontFamily: F_BODY, fontSize: 11.5, color: C.muted, lineHeight: 1.5 }}>Ascolta i team radio della sessione e segna quelli in cui un pilota parla di gomme: nel Garage, nel Rilevatore di bluff, tutti vedranno se era vero o un bluff guardando i tempi dei giri dopo.</p>
        {!of1 && note("wait", "Le radio arrivano con la sessione vera della gara LIVE (dati OpenF1), a fine sessione.")}
        {of1 && !race && note("session", "Il rilevatore di bluff guarda la gara e la sprint: in questa sessione non si segnano radio.")}
        {race && !radios.length && note("none", RADIO_NONE)}
        {radios.map((r, i) => {
          const d = driverById(r.id), name = d ? d.full : ghostInfo(r.code).name, t = tagOf(r), k = keyOf(r);
          return (
            <div key={k} data-bluff-radio={r.code} data-bluff-tagged={t ? "1" : "0"} style={{ padding: "10px 0", borderTop: i ? `1px solid ${C.divider}` : "none" }}>
              <div style={{ fontFamily: F_BODY, fontWeight: 600, fontSize: 12.5, color: C.text }}>{name}{r.lap ? <span style={{ color: C.dim, fontWeight: 400 }}> · Giro {r.lap}</span> : null}</div>
              <audio controls preload="none" src={r.url} aria-label={`Team radio di ${name}${r.lap ? ", giro " + r.lap : ""}`} style={{ display: "block", width: "100%", height: 34, margin: "6px 0" }} />
              {t ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ flex: 1, minWidth: 0, fontFamily: F_BODY, fontStyle: "italic", fontSize: 12.5, color: t.text ? C.text : C.muted }}>{t.text ? `“${t.text}”` : "Segnata: parla di gomme."}</span>
                  <button className="press" data-bluff-untag="" disabled={busy === k} onClick={() => act(r, () => onUntag && onUntag(r))} style={{ ...btn, opacity: busy === k ? .5 : 1 }}>Togli</button>
                </div>
              ) : !r.lap ? note("nolap", "Radio senza giro: non si può giudicare.") : (
                <div style={{ display: "flex", gap: 8 }}>
                  <input aria-label="Cosa dice…" placeholder="Cosa dice (facoltativo)" value={texts[k] || ""} maxLength={140} onChange={e => { const v = e.target.value; setTexts(x => ({ ...x, [k]: v })); }} style={{ ...aInput, flex: 1, minWidth: 0 }} />
                  <button className="press" data-bluff-tag="" disabled={busy === k} onClick={() => act(r, () => onTag && onTag(r, texts[k] || ""))} style={{ ...btn, background: C.accent, border: `1px solid ${C.accent}`, color: "#fff", opacity: busy === k ? .5 : 1 }}>Parla di gomme</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// Calendario e stato delle gare (shared/bt-races). Le 23 gare del 2026 ci sono già; il menu dello stato scrive solo
// bt-races (LIVE non fa partire la diretta simulata: quella è nella "Prova diretta (DEMO)"). Le gare aggiunte a mano
// restano nel documento per l'app di oggi, fuori dal calendario della nuova app.
// La stessa gara fuori calendario nell'elenco appena riletto da Firebase: per id (per nome e data se manca).
const sameExtraRace = (x, r) => (r.id != null ? x.id === r.id : x.name === r.name && x.date === r.date);
function AdminRacesTab({ races, setRaces, extra = [], setExtra, onToast, live, liveSt, onStartLive, onStopLive, onFlag, onLastLap, onRetire, liveSpeed, setLiveSpeed, bluff = null }) {
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
      {bluff && <AdminBluffCard {...bluff} />}
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
      <p style={{ margin: "-4px 0 10px", fontFamily: F_BODY, fontSize: 11, color: C.dim, lineHeight: 1.45 }}>Lo stato cambia da solo con gli orari del weekend: LIVE da 30 minuti prima delle prove libere fino a 4 ore dopo la partenza. Con LIVE apri la diretta fino a 3 giorni prima, con CONCLUSA la chiudi prima.</p>
      {races.map(r => (
        <div key={r.id} style={{ ...aCard, padding: "10px 12px", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 26, fontFamily: F_HEAD, fontWeight: 800, fontSize: 12, color: C.dim }}>R{r.round}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: F_BODY, fontWeight: 600, fontSize: 12.5, color: C.text }}>{r.name}</div>
            <div style={{ fontFamily: F_BODY, fontSize: 10.5, color: C.dim }}>{r.circuit || "–"} · {fmtDate(r.date)}</div>
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
              <div style={{ fontFamily: F_BODY, fontWeight: 600, fontSize: 12.5, color: C.text }}>{r.name || "–"}</div>
              <div style={{ fontFamily: F_BODY, fontSize: 10.5, color: C.dim }}>{r.circuit || "–"} · {Compat.fmtDate(r.date)} · {r.status || ""}</div>
            </div>
            <TrashBtn label={"Elimina " + (r.name || "gara")} onClick={() => { setExtra(list => list.filter(x => !sameExtraRace(x, r))).then(ok => ok && onToast("Gara eliminata")); }} />
          </div>
        ))}
      </>)}
    </div>
  );
}

// Profilo Instagram e video virali (shared/bt-ig-config): ogni video ha il suo link (url), che si apre toccandolo
// nella pagina Instagram (D06); le copertine si caricano su Firebase (fsimg:) o con un link.
// Foto di Commons (G30): per ogni pilota, monoposto e logo le candidate trovate su Commons (fino a 3, la prima è di
// serie) con autore e licenza letti da Commons; si usa solo una foto con licenza libera. Oppure il link di un file di
// Commons. La scelta va su Firebase (shared/bt-commons-photos) e la vedono tutti.
const PHOTO_KINDS = [["drivers", "PILOTI"], ["cars", "MONOPOSTO"], ["logos", "LOGHI"]];
function AdminPhotosTab({ photos = {}, setPhotos, onToast }) {
  useCommonsTick();
  const [kind, setKind] = useState("drivers");
  const [open, setOpen] = useState(null);
  const [link, setLink] = useState("");
  const [err, setErr] = useState("");
  const list = kind === "drivers" ? DRIVERS.map(d => ({ id: d.id, name: d.full, color: d.color })) : TEAMS.map(t => ({ id: t.id, name: t.name, color: t.color }));
  const choose = (id, file) => Promise.resolve(setPhotos(d => ({ ...d, [kind]: { ...((d && d[kind]) || {}), [id]: file } }))).then(ok => { if (ok) { setLink(""); setErr(""); onToast("Foto salvata: la vedono tutti"); } });
  const useLink = id => { const f = commonsFileOf(link); if (!f) { setErr("Link non valido: incolla il link di un file di Wikimedia Commons"); return; } choose(id, f); };
  return (
    <div>
      <p style={{ margin: "0 0 12px", fontFamily: F_BODY, fontSize: 12, color: C.muted, lineHeight: 1.5 }}>Le foto si vedono nell'app solo con licenza libera (CC0, pubblico dominio, CC BY, CC BY-SA), con autore e licenza nei crediti. I loghi sono marchi delle scuderie: si vedono solo nelle versioni di prova.</p>
      <div style={{ display: "flex", gap: 8, margin: "0 0 12px" }}>
        {PHOTO_KINDS.map(([id, l]) => <button key={id} className="press" data-photo-kind={id} onClick={() => { setKind(id); setOpen(null); setLink(""); setErr(""); }} style={aChip(kind === id)}>{l}</button>)}
      </div>
      <div style={{ ...aCard, padding: 0 }}>
        {list.map((e, i) => {
          const cur = (photos[kind] || {})[e.id] || null, eff = cur || commonsCandidates(kind, e.id)[0] || null, ph = commonsPhotoOf(eff), isOpen = open === e.id;
          const files = [...new Set([...commonsCandidates(kind, e.id), ...(cur ? [cur] : [])])];
          return (
            <div key={e.id} style={{ borderTop: i ? `1px solid ${C.divider}` : "none" }}>
              <button className="press" data-photo-entry={kind + ":" + e.id} aria-expanded={isOpen ? "true" : "false"} onClick={() => { setOpen(isOpen ? null : e.id); setLink(""); setErr(""); }} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 12px", textAlign: "left" }}>
                <span aria-hidden="true" style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, boxSizing: "border-box", background: ph ? `#1c1c20 url("${ph.thumb}") center / cover no-repeat` : e.color + "33", border: `2px solid ${e.color}` }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontFamily: F_BODY, fontWeight: 600, fontSize: 13, color: C.text }}>{e.name}</span>
                  <span style={{ display: "block", fontFamily: F_BODY, fontSize: 10.5, color: C.dim, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{eff ? (cur ? "Scelta: " : "Di serie: ") + eff.replace(/^File:/, "") : "Nessuna foto: iniziali o disegno"}</span>
                </span>
                <Icon name="chevron" size={13} color={C.dim} />
              </button>
              {isOpen && (
                <div style={{ padding: "2px 12px 12px" }}>
                  {!files.length && <p style={{ margin: "6px 0", fontFamily: F_BODY, fontSize: 12, color: C.dim }}>Nessuna candidata: incolla il link di un file di Commons.</p>}
                  {files.map(f => { const x = commonsInfoOf(f), free = !!(x && x.free), using = f === eff; return (
                    <div key={f} data-photo-candidate={f} data-free={x === undefined ? "?" : free ? "1" : "0"} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 0", borderTop: `1px solid ${C.divider}` }}>
                      {x && x.thumb ? <img src={x.thumb} alt="" style={{ width: 72, height: 54, objectFit: "cover", borderRadius: 8, opacity: free ? 1 : .35, flexShrink: 0 }} /> : <span style={{ width: 72, height: 54, borderRadius: 8, background: "#1c1c20", flexShrink: 0 }} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: F_BODY, fontWeight: 600, fontSize: 11.5, color: C.text, wordBreak: "break-word" }}>{f.replace(/^File:/, "")}</div>
                        <div style={{ fontFamily: F_BODY, fontSize: 10.5, lineHeight: 1.35, color: x && !free ? "#FF5A5F" : C.muted }}>{x === undefined ? "Lettura da Commons…" : !x ? "Non trovata su Commons (o Commons non risponde)" : free ? `${x.author || "autore non indicato"} · ${x.license}${x.date ? " · " + x.date : ""}` : `Licenza non libera (${x.license || "sconosciuta"}): non si può usare`}</div>
                      </div>
                      <button className="press" disabled={!free || using} onClick={() => choose(e.id, f)} style={{ ...aChip(using), flexShrink: 0, opacity: !free ? .45 : 1 }}>{using ? "In uso" : "Usa questa"}</button>
                    </div>
                  ); })}
                  <label style={{ ...aLabel, marginTop: 10 }} htmlFor={"photoLink-" + e.id}>OPPURE IL LINK DI UN FILE DI COMMONS</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input id={"photoLink-" + e.id} data-photo-link="" value={link} onChange={ev => { setLink(ev.target.value); setErr(""); }} placeholder="https://commons.wikimedia.org/wiki/File:…" style={{ ...aInput, flex: 1, minWidth: 0 }} />
                    <ABtn onClick={() => useLink(e.id)} disabled={!link.trim()} style={{ width: "auto", flex: "none", padding: "12px 16px" }}>Usa il link</ABtn>
                  </div>
                  {err && <p role="alert" style={{ margin: "8px 0 0", fontFamily: F_BODY, fontSize: 12, color: "#FF5A5F" }}>{err}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const todayIso = () => { const d = new Date(nowMs()), z = n => String(n).padStart(2, "0"); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`; };
function AdminInstagramTab({ ig, setIg, onToast }) {
  const [d, setD] = useState(() => ({ ...ig, followers: ig.followers == null ? "" : String(ig.followers), posts: ig.posts == null ? "" : String(ig.posts), videos: ig.videos.map(v => ({ ...v, url: v.url || "" })) }));
  const setV = (id, k, val) => setD(p => ({ ...p, videos: p.videos.map(v => v.id === id ? { ...v, [k]: val } : v) }));
  const count = v => (String(v).trim() === "" ? null : parseInt(v) || 0);   // campo vuoto = numero non indicato
  const savedThumb = ref => ig.videos.some(v => v.thumb === ref);
  // Copertina cambiata o video tolto prima di salvare: una copertina appena caricata (non ancora salvata) si cancella
  // subito; quelle già salvate si cancellano quando il salvataggio riesce.
  const setThumb = (v, url) => { if (v.thumb && v.thumb !== url && !savedThumb(v.thumb)) dropStoredImage(v.thumb); setV(v.id, "thumb", url); };
  const removeVideo = v => { if (v.thumb && !savedThumb(v.thumb)) dropStoredImage(v.thumb); setD(p => ({ ...p, videos: p.videos.filter(x => x.id !== v.id) })); };
  const save = () => {
    const videos = d.videos.map(v => ({ ...v, url: String(v.url || "").trim() }));
    const bad = videos.findIndex(v => v.url && !/^https:\/\/\S+$/i.test(v.url));
    if (bad >= 0) { onToast(`Il link del video ${bad + 1} deve iniziare con https://`); return; }
    setIg({ ...d, followers: count(d.followers), posts: count(d.posts), videos }).then(ok => {
      if (!ok) return;
      onToast("Instagram aggiornato");
      ig.videos.forEach(v => { if (v.thumb && !videos.some(x => x.thumb === v.thumb)) dropStoredImage(v.thumb); });
    });
  };
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
      <div style={aTitle}>REEL</div>
      {d.videos.map((v, i) => (
        <div key={v.id} style={aCard}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
            <span style={{ flex: 1, fontFamily: F_BODY, fontWeight: 700, fontSize: 12, color: C.text }}>Video {i + 1}</span>
            <TrashBtn label={"Elimina video " + (i + 1)} onClick={() => removeVideo(v)} />
          </div>
          <input aria-label={"Titolo video " + (i + 1)} placeholder="Titolo" value={v.title} onChange={e => setV(v.id, "title", e.target.value)} style={{ ...aInput, marginBottom: 8 }} />
          <input aria-label={"Link video " + (i + 1)} placeholder="Link del video: https://www.instagram.com/reel/…" value={v.url || ""} onChange={e => setV(v.id, "url", e.target.value)} style={{ ...aInput, marginBottom: 8 }} />
          <input aria-label={"Descrizione breve video " + (i + 1)} placeholder="Descrizione breve (va sulla copertina)" maxLength={40} value={v.desc || ""} onChange={e => setV(v.id, "desc", e.target.value)} style={{ ...aInput, marginBottom: 8 }} />
          <label style={aLabel} htmlFor={"igDate" + v.id}>DATA DI USCITA</label>
          <input id={"igDate" + v.id} type="date" aria-label={"Data video " + (i + 1)} value={v.date || ""} onChange={e => setV(v.id, "date", e.target.value)} style={{ ...aInput, marginBottom: 8 }} />
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input aria-label={"Visualizzazioni video " + (i + 1)} placeholder="Views" value={v.views} onChange={e => setV(v.id, "views", e.target.value)} style={aInput} />
            <input aria-label={"Like video " + (i + 1)} placeholder="Likes" value={v.likes} onChange={e => setV(v.id, "likes", e.target.value)} style={aInput} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {v.thumb && <StoredImg src={v.thumb} alt={"Copertina video " + (i + 1)} style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover" }} />}
            <ImagePicker id={"igThumb" + v.id} value={v.thumb} onChange={url => setThumb(v, url)} label="Carica copertina" changeLabel="Cambia copertina" compact />
          </div>
        </div>
      ))}
      <p style={{ margin: "-4px 2px 12px", fontFamily: F_BODY, fontSize: 11, color: C.dim, lineHeight: 1.45 }}>Toccando un video nell'app si apre il suo link; senza link si apre il profilo @{d.handle || "bt_formula1"}. L'ultimo reel è quello con la data più recente (senza date, l'ultimo aggiunto); "NUOVO" resta 7 giorni.</p>
      <button className="press" onClick={() => setD(p => ({ ...p, videos: [...p.videos, { id: "v" + Date.now(), title: "", views: "", likes: "", thumb: "", url: "", desc: "", date: todayIso() }] }))} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: 12, borderRadius: 12, background: "transparent", border: `1.5px dashed ${C.border}`, fontFamily: F_BODY, fontWeight: 600, fontSize: 12.5, color: C.muted, marginBottom: 14 }}><Icon name="plus" size={14} color={C.muted} /> Aggiungi video</button>
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
              <button className="press" onClick={() => onSuspend({ aid: r.aid, name: r.author })} style={small()}>SOSPENDI {r.author}</button>
              <button className="press" onClick={() => onIgnore(r.id)} style={small("ghost")}>IGNORA</button>
            </div>
          </div>
        );
      })}
      <div style={aTitle}>UTENTI SOSPESI</div>
      {banned.length === 0 ? <div style={{ ...aCard, fontFamily: F_BODY, fontSize: 12.5, color: C.muted }}>Nessun utente sospeso.</div> : banned.map(b => (
        <div key={(b.aid || "") + ":" + b.name} style={{ ...aCard, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: F_BODY, fontSize: 13.5, color: C.text }}>{b.name}</span>
          <button className="press" onClick={() => onUnsuspend(b)} style={small("ghost")}>RIATTIVA</button>
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
            <button className="press" onClick={() => onSuspend({ aid: m.aid, name: m.from })} style={small()}>SOSPENDI</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Impronta di un valore: le schede con la bozza (classifiche, prezzi FantaF1, Instagram) si rifanno da capo quando i
// dati sotto cambiano (riletti da Firebase o appena salvati), così SALVA non riscrive valori vecchi (revisione Fase B, C2).
const versionOf = v => { const s = JSON.stringify(v) || ""; let h = 5381; for (let i = 0; i < s.length; i++) h = (Math.imul(h, 33) + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + "." + s.length; };
function AdminScreen({ photos, setPhotos, silly = {}, onSilly, highlights = [], setHighlights, onBack, onPublish, articles, setArticles, fantaStats, setFantaStats, standings, setStandings, races, setRaces, extraRaces = [], setExtraRaces, ig, setIg, sentNotifs, onSendNotif, onDeleteNotif, onToast, tab, setTab, chats, reports, banned, onDeleteMsg, onSuspend, onUnsuspend, onIgnoreReport, liveProps = {}, polls = [], votes = {}, onPollAnswer, predictions = [], setPredictions, predAnswers = {} }) {
  return (
    <div className="scrollcol" style={{ height: "100%" }}>
      <SubHeader title="PANNELLO ADMIN" onBack={onBack} />
      <div className="scrollcol" style={{ display: "flex", gap: 7, overflowX: "auto", padding: "0 16px 14px" }}>
        {ADMIN_TABS.map(t => <button key={t} className="press" onClick={() => setTab(t)} style={{ flexShrink: 0, padding: "7px 14px", borderRadius: 999, background: tab === t ? C.accent : C.card, border: `1px solid ${tab === t ? C.accent : C.border}`, fontFamily: F_HEAD, fontWeight: 800, fontStyle: "italic", fontSize: 11, color: tab === t ? "#fff" : C.muted, whiteSpace: "nowrap" }}>{t}</button>)}
      </div>
      <div style={{ padding: "0 16px 28px" }}>
        {tab === "NEWS" && <AdminNewsTab articles={articles} setArticles={setArticles} onPublish={onPublish} onToast={onToast} />}
        {tab === "SONDAGGI" && <AdminPollsTab polls={polls} votes={votes} onAnswer={onPollAnswer} />}
        {tab === "FANTA F1" && <AdminFantaTab key={"fs:" + versionOf(fantaStats)} fantaStats={fantaStats} setFantaStats={setFantaStats} onToast={onToast} />}
        {tab === "PREVISIONI" && <AdminPredictionsTab predictions={predictions} setPredictions={setPredictions} answers={predAnswers} races={races} onToast={onToast} />}
        {tab === "CLASSIFICHE" && <AdminStandingsTab key={"st:" + versionOf(standings)} standings={standings} setStandings={setStandings} onToast={onToast} />}
        {tab === "GARA LIVE" && <AdminRacesTab races={races} setRaces={setRaces} extra={extraRaces} setExtra={setExtraRaces} onToast={onToast} {...liveProps} />}
        {tab === "INSTAGRAM" && <AdminInstagramTab key={"ig:" + versionOf(ig)} ig={ig} setIg={setIg} onToast={onToast} />}
        {tab === "MERCATO" && <AdminSillyTab official={silly} onOfficial={onSilly} onToast={onToast} />}
        {tab === "VIDEO" && <AdminHighlightsTab items={highlights} setItems={setHighlights} onToast={onToast} />}
        {tab === "FOTO" && <AdminPhotosTab photos={photos || {}} setPhotos={setPhotos} onToast={onToast} />}
        {tab === "NOTIFICHE" && <AdminNotifTab sent={sentNotifs} onSend={onSendNotif} onDelete={onDeleteNotif} />}
        {tab === "CHAT" && <AdminChatTab chats={chats} reports={reports} banned={banned} onDeleteMsg={onDeleteMsg} onSuspend={onSuspend} onUnsuspend={onUnsuspend} onIgnore={onIgnoreReport} />}
      </div>
    </div>
  );
}

function PremiumModal({ onClose, isPremium, plan, setPlan, onSubscribe, subscribing, subscribed, trialUsed, onTrial, trial, onAdPro = null, adBusy = false }) {
  const offer = premiumOffer({ trialUsed, isPremium });
  const price = SEASON_PRICE + " € a stagione";
  const heroGradient = `linear-gradient(135deg, ${shade(C.accent, .11)}, ${alpha(C.accentInk, .27)}, ${shade(C.accent, .11)})`;
  if (subscribed) {
    return (
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.9)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ background: C.card, borderRadius: 20, padding: "32px 24px", textAlign: "center", maxWidth: 320, width: "100%" }}>
          <Icon name="star" size={50} color={C.gold} />
          {subscribed === "trial" && trial ? (<>
            <h2 style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 22, color: C.text, margin: "16px 0 8px" }}>Prova gratuita attiva!</h2>
            <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.6, margin: "0 0 24px" }}>Hai B&amp;T Premium gratis per il prossimo GP, fino al {fmtDay(trial.end)}. Poi {price}: puoi disdire quando vuoi.</p>
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
            <p style={{ textAlign: "center", fontFamily: F_BODY, fontSize: 13, color: C.green, padding: "20px 0" }}>Sei già Premium: grazie per il supporto!</p>
          ) : (
            <>
              {PREMIUM_CATEGORIES.map(cat => (
                <React.Fragment key={cat.name}>
                  <Eyebrow color={C.accentInk}>{cat.name.toUpperCase()}</Eyebrow>
                  <div>{cat.items.map(it => <FeatureRow key={it.title} icon={it.icon} title={it.title} starIcon={it.starIcon} />)}</div>
                </React.Fragment>
              ))}

              <div data-season-plan="" style={{ margin: "18px 0 0", padding: "14px 16px", borderRadius: 14, background: "rgba(231,179,76,.12)", border: `1.5px solid ${C.gold}`, textAlign: "center" }}>
                <span style={{ display: "block", fontFamily: F_BODY, fontWeight: 700, fontSize: 10, color: C.muted, letterSpacing: .6, marginBottom: 6 }}>STAGIONE</span>
                <span style={{ display: "block", fontFamily: F_HEAD, fontWeight: 900, fontSize: 22, color: C.text }}>{SEASON_PRICE} €</span>
                <span style={{ display: "block", fontFamily: F_BODY, fontSize: 11, color: C.dim, marginTop: 2 }}>per tutta la stagione</span>
                <span style={{ display: "block", fontFamily: F_BODY, fontSize: 11.5, color: C.gold, marginTop: 8, lineHeight: 1.4 }}>Ogni stagione dopo costa 1 € in meno, fino a 1 €</span>
              </div>

              {!PREMIUM_DEMO ? (
                <>
                  <button className="press" disabled style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", marginTop: 16, padding: "16px 0", borderRadius: 14, background: "rgba(255,255,255,.08)", fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 15, color: C.text, letterSpacing: .3 }}><Icon name="stopwatch" size={16} /> PREMIUM IN ARRIVO</button>
                  <p style={{ textAlign: "center", fontFamily: F_BODY, fontSize: 10.5, color: C.dim, lineHeight: 1.7, margin: "14px 0 0" }}>Gli abbonamenti arriveranno presto, tramite Google Play.</p>
                </>
              ) : <>
              {offer === "trial" ? (<>
                <button className="press" disabled={subscribing} onClick={onTrial} style={{ display: "block", width: "100%", marginTop: 16, padding: "16px 0", borderRadius: 14, background: subscribing ? "#555" : C.accent, boxShadow: subscribing ? "none" : `0 10px 22px -10px ${C.accent}`, fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 14.5, color: "#fff", letterSpacing: .2, textAlign: "center" }}>
                  {subscribing ? <ShiftLight /> : "PROVA GRATIS PER UN GP"}
                </button>
                <p style={{ textAlign: "center", fontFamily: F_BODY, fontSize: 11.5, color: C.muted, margin: "10px 0 0" }}>Poi {price}: si rinnova da solo a ogni stagione finché non disdici. Disdici quando vuoi, anche durante la prova.</p>
                <button className="press" disabled={subscribing} onClick={onSubscribe} style={{ display: "block", margin: "8px auto 0", padding: "8px 12px", fontFamily: F_BODY, fontWeight: 700, fontSize: 12, color: C.gold }}>Oppure abbonati subito: {price}</button>
              </>) : (<>
                <button className="press" disabled={subscribing} onClick={onSubscribe} style={{ display: "block", width: "100%", marginTop: 16, padding: "16px 0", borderRadius: 14, background: subscribing ? "#555" : C.accent, boxShadow: subscribing ? "none" : `0 10px 22px -10px ${C.accent}`, fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 14.5, color: "#fff", letterSpacing: .2, textAlign: "center" }}>
                  {subscribing ? <ShiftLight /> : `ABBONATI · ${price}`}
                </button>
                <p style={{ textAlign: "center", fontFamily: F_BODY, fontSize: 11.5, color: C.muted, margin: "10px 0 0" }}>Si rinnova da solo a ogni stagione finché non disdici. Disdici quando vuoi.</p>
                {trialUsed && <p style={{ textAlign: "center", fontFamily: F_BODY, fontSize: 11.5, color: C.muted, margin: "10px 0 0" }}>Hai già usato la prova gratuita di un GP.</p>}
              </>)}
              {onAdPro && (
                <div data-ad-pro="" style={{ marginTop: 14, padding: "12px 12px 10px", borderRadius: 14, background: "rgba(255,255,255,.04)", border: `1px solid ${C.border}` }}>
                  <button className="press" disabled={adBusy} onClick={onAdPro} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "13px 0", borderRadius: 12, border: `1.5px solid ${C.gold}`, fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 13.5, color: C.gold }}>
                    {adBusy ? <ShiftLight label="Carico la pubblicità" /> : <><Icon name="play" size={14} color={C.gold} />GUARDA UNA PUBBLICITÀ: PRO GRATIS</>}
                  </button>
                  <p style={{ textAlign: "center", fontFamily: F_BODY, fontSize: 11, color: C.muted, margin: "8px 0 0", lineHeight: 1.45 }}>Il Pro resta attivo finché non chiudi l'app o spegni lo schermo.</p>
                </div>
              )}
              <p style={{ textAlign: "center", fontFamily: F_BODY, fontSize: 10.5, color: C.dim, lineHeight: 1.7, margin: "14px 0 0" }}>
                Rinnovo automatico a ogni stagione al prezzo di quella stagione ({SEASON_PRICE} €, poi 1 € in meno ogni anno, fino a 1 €) finché non disdici. Si disdice quando vuoi da Google Play → Abbonamenti.<br /><span style={{ color: C.accentInk }}>Anteprima demo: nessun pagamento reale</span>
              </p>
              </>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Termini e Condizioni come nell'app di oggi (TermsModal): al primo avvio, prima dell'accesso, il tasto resta spento
// ("Scorri per continuare…") finché non si arriva in fondo; dal Profilo si rileggono e si chiudono con CHIUDI.
function TermsSheet({ review, onAccept, onClose }) {
  const [scrolled, setScrolled] = useState(!!review);
  const bodyRef = useRef(null);
  const atEnd = el => el.scrollTop + el.clientHeight >= el.scrollHeight - 20;
  // Su uno schermo così alto che il testo non scorre, il tasto si accende da solo. Si ricontrolla quando cambiano le
  // misure (i caratteri arrivano dopo, il telefono si gira): a volte il testo diventa più corto dello spazio.
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return undefined;
    const check = () => { if (atEnd(el)) setScrolled(true); };
    check();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(check) : null;
    if (ro) { ro.observe(el); if (el.firstElementChild) ro.observe(el.firstElementChild); }
    window.addEventListener("resize", check);
    return () => { if (ro) ro.disconnect(); window.removeEventListener("resize", check); };
  }, []);
  const S = [
    ["1. Accettazione dei Termini", `Utilizzando l'app ${APP_NAME} (“l'App”), l'utente accetta di essere vincolato ai presenti Termini e Condizioni. Se non si accettano questi termini, si prega di non utilizzare l'App.`],
    ["2. Descrizione del Servizio", `${APP_NAME} è un'app di informazione e intrattenimento dedicata alla Formula 1. Offre notizie, classifiche, dati live delle gare tramite OpenF1 API, una sezione community (chat) e funzionalità Fanta F1.`],
    ["3. Account Utente", "Per accedere a tutte le funzionalità è necessario creare un account. L'utente è responsabile della riservatezza delle proprie credenziali. Ogni attività effettuata dall'account è responsabilità dell'utente."],
    ["4. Abbonamento Premium", PAYMENTS_ENABLED ? "L'abbonamento Premium (6 € a stagione, ogni stagione dopo 1 € in meno, fino a 1 €) sblocca funzionalità avanzate e rimuove la pubblicità. Il rinnovo è automatico e può essere annullato in qualsiasi momento dal profilo. Non sono previsti rimborsi per il periodo in corso." : "L'abbonamento Premium non è ancora disponibile. Quando verrà attivato, prezzi, rinnovo e modalità di disdetta saranno indicati in questa sezione e nella schermata di acquisto."],
    ["5. Contenuti e Proprietà Intellettuale", "Tutti i contenuti pubblicati dal Team B&T (articoli, immagini, video) sono di proprietà del Team B&T. I dati di gara sono forniti da OpenF1 API. I loghi e i marchi di Formula 1, FIA e team sono di proprietà dei rispettivi titolari. Le foto di piloti e monoposto vengono da Wikimedia Commons con licenza libera e i crediti dell'autore (Profilo → Info su B&T). Se pensi che un contenuto dell'app violi un tuo diritto d'autore, scrivici a bt.formula1@gmail.com con il link o la descrizione del contenuto: lo controlliamo e, se serve, lo togliamo.", `${F1_DISCLAIMER} ${APP_NAME} non è associata nemmeno alla FIA, alle scuderie o ai piloti.`],
    ["6. Condotta degli Utenti", "Nella chat community è vietato pubblicare contenuti offensivi, discriminatori, sessualmente espliciti, spam, materiale illegale, informazioni personali altrui o contenuti di altri (testi, foto, video) senza il loro permesso. Con il tasto ⋯ su ogni messaggio puoi segnalarlo o bloccare chi l'ha scritto: i messaggi segnalati vengono controllati dai moderatori e rimossi se violano queste regole. Le violazioni possono comportare la sospensione dalla chat o dell'account."],
    ["7. Pubblicità", "Gli utenti non abbonati visualizzeranno annunci pubblicitari forniti tramite Google AdMob. Nell'Unione Europea ti chiediamo il consenso con il messaggio di Google e puoi cambiare le tue scelte in qualsiasi momento da Profilo → Preferenze privacy annunci."],
    ["8. Privacy e Cookie", null],
    ["9. Limitazione di Responsabilità", `${APP_NAME} non garantisce l'accuratezza assoluta dei dati live di gara. L'App è fornita “così com'è”. Non siamo responsabili per interruzioni del servizio, perdita di dati o danni derivanti dall'uso dell'App.`],
    ["10. Modifiche ai Termini", "Ci riserviamo il diritto di modificare questi termini. Gli utenti saranno notificati tramite l'App. L'uso continuato dopo le modifiche costituisce accettazione dei nuovi termini."],
    ["11. Legge Applicabile", `I presenti Termini sono regolati dalla legge italiana. Per qualsiasi controversia è competente il Foro di Milano. Per contatti: ${CONTACT_EMAIL}`],
  ];
  const pStyle = { fontFamily: F_BODY, fontSize: 13, color: "#D8D8DA", lineHeight: 1.65, margin: "0 0 14px" };
  return (
    <div data-terms="" role="dialog" aria-modal="true" aria-label="Termini e Condizioni" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.92)", zIndex: 900, display: "flex", alignItems: "flex-end" }}>
      <div style={{ background: C.card, borderRadius: "24px 24px 0 0", width: "100%", height: "88%", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "22px 22px 8px", flexShrink: 0 }}>
          <h2 style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 19, color: C.text, margin: "0 0 4px" }}>TERMINI E CONDIZIONI</h2>
          {!review && <p style={{ fontFamily: F_BODY, fontSize: 12, color: C.muted, margin: 0 }}>Leggili fino in fondo e accettali per usare {APP_NAME}.</p>}
        </div>
        <div ref={bodyRef} data-terms-body="" className="scrollcol" onScroll={e => { if (atEnd(e.currentTarget)) setScrolled(true); }} style={{ flex: 1, minHeight: 0, padding: "8px 22px 6px" }}>
          <div>{S.map(([h, b, b2]) => (
            <div key={h}>
              <h3 style={{ fontFamily: F_HEAD, fontWeight: 800, fontStyle: "italic", fontSize: 14, color: C.accentInk, margin: "4px 0 6px" }}>{h}</h3>
              {b !== null ? <p style={pStyle}>{b}</p> : (
                <p style={pStyle}>Raccogliamo solo i dati necessari al funzionamento del servizio (email, nome, "Su di te" cioè anno di nascita, da quanti anni segui la F1 e che tifoso sei, messaggi in chat, segnalazioni, feedback con la tua email, preferenze) e li conserviamo su Firebase (Google). Non vendiamo i dati a terzi. Puoi eliminare l'account e i tuoi dati in qualsiasi momento da Profilo → Elimina account. Tutti i dettagli sono nella <button className="press" onClick={() => openUrl(PRIVACY_URL)} aria-label="Apri la Privacy Policy" style={{ font: "inherit", color: C.accentInk, textDecoration: "underline", padding: 0 }}>Privacy Policy</button>.</p>
              )}
              {b2 && <p style={pStyle}>{b2}</p>}
            </div>
          ))}</div>
        </div>
        <div style={{ padding: "12px 22px 22px", borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
          {!scrolled && <p style={{ fontFamily: F_BODY, fontSize: 11.5, color: C.dim, textAlign: "center", margin: "0 0 10px" }}>↓ Scorri fino in fondo per accettare</p>}
          <button className="press" data-terms-accept="" disabled={!scrolled} onClick={review ? onClose : onAccept} style={{ display: "block", width: "100%", padding: "15px 0", borderRadius: 14, background: scrolled ? C.accent : "rgba(255,255,255,.1)", fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 14, color: scrolled ? "#fff" : C.dim, transition: "background .3s, color .3s" }}>{!scrolled ? "Scorri per continuare…" : review ? "CHIUDI" : "✓ ACCETTO I TERMINI E CONDIZIONI"}</button>
        </div>
      </div>
    </div>
  );
}

// Avvio (G06). Al primo avvio in assoluto i video dello splash (VideoSplash); dagli avvii dopo, o se i video non si
// possono vedere (file mancante, formato) o il telefono chiede meno animazioni, il caricamento (LoadingScreen). Il primo avvio fatto
// (i video visti fino alla fine) si ricorda sul telefono (bt-intro-seen). ready = contenuti di Firebase letti e account
// noto (o LOAD_MAX_MS passati). Lo splash sta sopra l'app, che intanto si carica sotto.
const INTRO_KEY = "bt-intro-seen";
const prefersReduced = () => { try { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; } };
function SplashScreen({ ready, onDone }) {
  const [mode, setMode] = useState(() => (!prefersReduced() && !local.get(INTRO_KEY) ? "video" : "loading"));
  if (mode === "video") return <VideoSplash ready={ready} onFail={() => setMode("loading")} onDone={() => { local.set(INTRO_KEY, true); onDone(); }} />;
  return <LoadingScreen ready={ready} onDone={onDone} />;
}

// I video di Edoardo: il primo si vede tutto; se a quel punto i dati non ci sono ancora parte quello d'attesa, che si
// ripete; appena i dati arrivano parte il finale, dove le lettere B e T si aprono sull'app vera. Se un video non parte
// (file mancante, formato non supportato, o il primo non parte entro SPLASH_VIDEO_START_MS) si passa al caricamento.
function VideoSplash({ ready, onDone, onFail }) {
  const [phase, setPhase] = useState("intro");          // intro | loop | outro
  const [loops, setLoops] = useState(0);              // quante volte è partito il video d'attesa
  const [outroShown, setOutroShown] = useState(false); // il finale è partito: via lo sfondo nero e gli altri video
  const [shown, setShown] = useState("intro");         // il video che si vede: solo quello che sta andando (11/10: il
                                                       // finale fermo stava sopra l'apertura e la copriva)
  const [revealed, setRevealed] = useState(false);     // le lettere si aprono: i tocchi passano all'app
  const [maxDone, setMaxDone] = useState(false);
  const [fading, setFading] = useState(false);
  const vids = { intro: useRef(null), loop: useRef(null), outro: useRef(null) };
  const go = ready || maxDone;
  const goRef = useRef(go);
  goRef.current = go;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const started = useRef(false);
  const failed = useRef(false);
  const fail = () => { if (failed.current) return; failed.current = true; Object.values(vids).forEach(r => { try { if (r.current) r.current.pause(); } catch (e) {} }); onFail(); };
  const finish = () => setFading(true);
  const play = key => {
    const v = vids[key].current;
    if (!v) return;
    try { v.muted = true; v.currentTime = 0; } catch (e) {}
    Promise.resolve().then(() => v.play()).catch(() => { if (key === "outro") finish(); else fail(); });
  };
  useEffect(() => {
    const b = setTimeout(() => setMaxDone(true), LOAD_MAX_MS);
    const c = setTimeout(() => { if (!started.current) fail(); }, SPLASH_VIDEO_START_MS);
    return () => { clearTimeout(b); clearTimeout(c); };
  }, []);
  useEffect(() => {
    if (phase === "intro" || phase === "outro") play(phase);
    else if (phase === "loop") { setLoops(n => n + 1); play("loop"); }
  }, [phase]);
  useEffect(() => { if (phase === "loop" && go) setPhase("outro"); }, [phase, go]);   // dati arrivati: subito il finale
  useEffect(() => {   // finale partito: gli altri due video si fermano; se il finale si inceppa, lo splash va via lo stesso
    if (!outroShown) return undefined;
    ["intro", "loop"].forEach(k => { try { if (vids[k].current) vids[k].current.pause(); } catch (e) {} });
    const t = setTimeout(onDone, 6000);
    return () => clearTimeout(t);
  }, [outroShown]);
  useEffect(() => { if (!fading) return undefined; const t = setTimeout(onDone, SPLASH_FADE_MS); return () => clearTimeout(t); }, [fading]);
  const onEnded = key => {
    if (key === "intro") setPhase(goRef.current ? "outro" : "loop");
    else if (key === "loop") { if (goRef.current) setPhase("outro"); else { setLoops(n => n + 1); play("loop"); } }
    else onDone();
  };
  // Un video che non si carica: se è il finale mentre va, si chiude; altrimenti (anche un file che manca e dà errore
  // appena si apre l'app) si passa al caricamento.
  const onError = key => { if (key === "outro" && phaseRef.current === "outro") finish(); else fail(); };
  const video = key => (
    <video key={key} ref={vids[key]} src={SPLASH_VIDEO[key]} poster={SPLASH_POSTER} muted playsInline preload="auto" aria-hidden="true"
      onPlaying={() => { started.current = true; setShown(key); if (key === "outro") setOutroShown(true); }}
      onTimeUpdate={key === "outro" ? e => { if (e.currentTarget.currentTime >= OUTRO_REVEAL_S) setRevealed(true); } : undefined}
      onEnded={() => onEnded(key)} onError={() => onError(key)}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: key !== shown ? 0 : 1, pointerEvents: "none" }} />
  );
  const clear = phase === "outro" && outroShown;
  return (
    <div data-splash="" data-splash-phase={phase} data-splash-loops={loops} data-splash-revealed={revealed ? "1" : undefined}
      style={{ position: "fixed", inset: 0, background: clear ? "transparent" : "#000", zIndex: 9999, transition: `opacity ${SPLASH_FADE_MS}ms ease`, opacity: fading ? 0 : 1, pointerEvents: revealed || fading ? "none" : "auto" }}>
      {["intro", "loop", "outro"].map(video)}
    </div>
  );
}

// Luce posteriore della monoposto, come nel video dell'avvio: 2 colonne × 4 righe di LED rossi. mode "idle": accesi
// fermi; "seq": si accendono una riga alla volta dal basso (caricamenti lunghi). Con "Rimuovi animazioni" la sequenza
// resta ferma (App.css). Il Task 15 aggiunge i modi "pulse" e "flash3".
function LedGrid({ mode = "idle", size = 10 }) {
  const gap = Math.max(1, Math.round(size / 5));
  return (
    <span data-led-grid="" data-mode={mode} className={"led-grid led-" + mode} aria-hidden="true" style={{ display: "inline-grid", gridTemplateColumns: `repeat(2, ${size}px)`, gap, flexShrink: 0 }}>
      {Array.from({ length: 8 }, (_, i) => (
        <span key={i} data-led={i} style={{ width: size, height: size, borderRadius: Math.max(1, Math.round(size / 5)), background: C.red, boxShadow: `0 0 ${Math.round(size * .8)}px ${alpha(C.red, .65)}`, animationDelay: mode === "seq" ? `${(3 - Math.floor(i / 2)) * 140}ms` : undefined }} />
      ))}
    </span>
  );
}

// Caricamento (25/10, chiesto da Edoardo: "togli il Pit Exit Launch, tieni solo la schermata di caricamento"; prove in
// test/e2e/run53-avvio.js): dagli avvii dopo il primo, o se i video non si possono vedere, solo la luce posteriore a LED
// che si accende una riga alla volta e "Caricamento…", finché i dati arrivano (al massimo LOAD_MAX_MS); poi l'app.
// Resta almeno LOAD_MIN_MS (un giro dei LED), così coi dati già pronti non lampeggia. Con "Rimuovi animazioni": LED
// accesi fermi. Prima, coi dati pronti, c'era il Pit Exit Launch (15 LED del volante, "PIT EXIT OPEN" e lo zoom).
const LOAD_MIN_MS = 840, LOAD_FADE_MS = 200;
function LoadingScreen({ ready, onDone }) {
  const reduce = useRef(prefersReduced()).current;
  const [minDone, setMinDone] = useState(false);
  const [maxDone, setMaxDone] = useState(false);
  const [out, setOut] = useState(false);
  useEffect(() => {
    const ts = [setTimeout(() => setMinDone(true), LOAD_MIN_MS), setTimeout(() => setMaxDone(true), LOAD_MAX_MS)];
    return () => ts.forEach(clearTimeout);
  }, []);
  useEffect(() => { if (minDone && (ready || maxDone)) setOut(true); }, [minDone, ready, maxDone]);
  useEffect(() => { if (!out) return undefined; const t = setTimeout(onDone, reduce ? 0 : LOAD_FADE_MS); return () => clearTimeout(t); }, [out]);
  return (
    <div data-splash="" data-splash-phase="loading" data-reduced={reduce ? "1" : undefined}
      style={{ position: "fixed", inset: 0, background: "#000", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", opacity: out ? 0 : 1, transition: reduce ? "none" : `opacity ${LOAD_FADE_MS}ms ease`, pointerEvents: out ? "none" : "auto" }}>
      <div role="status" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
        <LedGrid mode={reduce ? "idle" : "seq"} size={14} />
        <p style={{ fontFamily: F_BODY, fontSize: 13, color: C.dim, margin: 0 }}>Caricamento…</p>
      </div>
    </div>
  );
}

// Feedback come l'app di oggi (FeedbackModal): da 1 a 5 stelle (obbligatorie), una categoria e un testo facoltativo;
// si salva in shared/bt-feedback-<id> (src/services/feedback.js).
function FeedbackModal({ onClose, onSend }) {
  const [stars, setStars] = useState(0);
  const [msg, setMsg] = useState("");
  const [category, setCategory] = useState("generale");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const buzz = () => { fx.buzz("select"); fx.play("tick"); };
  useEffect(() => { if (!sent) return undefined; const t = setTimeout(onClose, 2000); return () => clearTimeout(t); }, [sent]);
  const send = async () => {
    if (!stars || sending) return;
    setSending(true); setErr("");
    try { await onSend({ stars, category, msg }); setSent(true); }
    catch (e) { setErr(FEEDBACK_MSG.offline); }
    setSending(false);
  };
  const LABELS = ["", "Molto male", "Migliorabile", "Nella media", "Bene", "Ottimo"];
  return (
    <div data-feedback="" role="dialog" aria-modal="true" aria-label="Invia feedback" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.8)", zIndex: 760, display: "flex", alignItems: "flex-end" }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: C.card, borderRadius: "24px 24px 0 0", width: "100%", padding: "20px 20px 26px" }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,.14)", margin: "0 auto 16px" }} />
        {sent ? (
          <div style={{ textAlign: "center", padding: "18px 0" }}>
            <svg viewBox="0 0 48 48" width="52" height="52" aria-hidden="true" style={{ display: "block", margin: "0 auto 10px" }}><path d="M10 6v38" stroke={C.text} strokeWidth="3" strokeLinecap="round" />{[0, 1, 2].map(r => [0, 1, 2, 3].map(c => <rect key={r + "-" + c} x={12 + c * 7.5} y={8 + r * 7} width="7.5" height="7" fill={(r + c) % 2 ? C.text : "#000"} />))}<rect x="12" y="8" width="30" height="21" fill="none" stroke={C.text} strokeWidth="1.2" /></svg>
            <div style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 18, color: C.text }}>Grazie per il feedback!</div>
            <p style={{ fontFamily: F_BODY, color: C.muted, fontSize: 13, margin: "8px 0 0" }}>Lo leggiamo tutti: ci aiuta a scegliere cosa sistemare.</p>
          </div>
        ) : (
          <>
            <h2 style={{ fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 17, color: C.text, margin: "0 0 4px" }}>Invia feedback</h2>
            <p style={{ fontFamily: F_BODY, color: C.muted, fontSize: 12, margin: "0 0 16px" }}>Bastano 30 secondi: scegli le stelle e, se vuoi, scrivici cosa cambiare.</p>
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 12 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} className="press" data-feedback-star={n} aria-label={`${n} stell${n === 1 ? "a" : "e"}`} aria-pressed={n <= stars ? "true" : "false"} onClick={() => { setStars(n); buzz(40); }}
                  style={{ lineHeight: 0, transition: "transform .15s", transform: n <= stars ? "scale(1.15)" : "scale(1)" }}><svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true"><path d="M12 2.8l2.8 5.7 6.3.9-4.6 4.4 1.1 6.2L12 17.1 6.4 20l1.1-6.2L2.9 9.4l6.3-.9z" fill={n <= stars ? C.gold : "none"} stroke={n <= stars ? C.gold : C.dim} strokeWidth="1.6" strokeLinejoin="round" /></svg></button>
              ))}
            </div>
            <p style={{ textAlign: "center", fontFamily: F_BODY, fontSize: 12, color: C.muted, margin: "0 0 14px", minHeight: 16 }}>{LABELS[stars]}</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
              {FEEDBACK_CATS.map(c => {
                const on = category === c.id;
                return <button key={c.id} className="press" data-feedback-cat={c.id} aria-pressed={on ? "true" : "false"} onClick={() => { setCategory(c.id); buzz(30); }} style={{ padding: "6px 12px", borderRadius: 20, background: on ? alpha(C.accentInk, .14) : "rgba(255,255,255,.05)", border: `1px solid ${on ? C.accentInk : C.border}`, fontFamily: F_BODY, fontWeight: 600, fontSize: 11.5, color: on ? C.accentInk : C.muted }}>{c.label}</button>;
              })}
            </div>
            <textarea data-feedback-msg="" aria-label="Il tuo feedback" placeholder="Scrivi qui (opzionale)… cosa ti piace? Cosa manca?" value={msg} onChange={e => setMsg(e.target.value)} rows={3}
              style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: "11px 13px", color: C.text, fontFamily: F_BODY, fontSize: 13, outline: "none", resize: "none", marginBottom: 12 }} />
            {err && <p role="alert" style={{ background: "#E1060018", border: `1px solid ${C.red}`, borderRadius: 10, padding: "9px 14px", margin: "0 0 12px", color: "#ff6b6b", fontFamily: F_BODY, fontSize: 12, lineHeight: 1.5 }}>{err}</p>}
            <button className="press" onClick={send} disabled={!stars || sending} style={{ display: "block", width: "100%", padding: "15px 0", borderRadius: 14, background: stars && !sending ? C.accent : "rgba(255,255,255,.1)", fontFamily: F_HEAD, fontWeight: 900, fontStyle: "italic", fontSize: 14, color: stars ? "#fff" : C.dim }}>{sending ? <ShiftLight label="Invio in corso" /> : "INVIA FEEDBACK"}</button>
          </>
        )}
      </div>
    </div>
  );
}

function InfoModal({ title, body, extra = null, onClose }) {
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
        {extra}
      </div>
    </div>
  );
}

// Crediti delle foto di Commons in "Info su B&T" (G30): le foto piccole (classifiche, carte, loghi) non li hanno
// accanto. Solo le foto che si vedono davvero: licenza libera, arrivate da Commons.
function CommonsCredits() {
  useCommonsTick();
  const rows = [];
  DRIVERS.forEach(d => rows.push({ key: "drivers:" + d.id, who: d.full, file: commonsFile("drivers", d.id) }));
  TEAMS.forEach(t => rows.push({ key: "cars:" + t.id, who: "Monoposto " + t.name, file: commonsFile("cars", t.id) }));
  if (CommonsData.SHOW_TEAM_LOGOS) TEAMS.forEach(t => rows.push({ key: "logos:" + t.id, who: "Logo " + t.name, file: commonsFile("logos", t.id) }));
  const shown = rows.map(r => ({ ...r, ph: commonsPhotoOf(r.file) })).filter(r => r.ph);
  if (!shown.length) return null;
  return (
    <div data-photo-credits style={{ borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 14, marginTop: 4 }}>
      <h3 style={{ fontFamily: F_HEAD, fontWeight: 800, fontStyle: "italic", fontSize: 14, color: C.text, margin: "0 0 8px" }}>Foto da Wikimedia Commons</h3>
      {shown.map(r => (
        <p key={r.key} data-photo-credit-row={r.key} style={{ fontFamily: F_BODY, fontSize: 12, color: "#A9A9AD", lineHeight: 1.5, margin: "0 0 6px" }}>{r.who}: {r.ph.credit.replace(/^Foto: /, "").replace(/, Wikimedia Commons$/, "")}</p>
      ))}
    </div>
  );
}

// Scheda del pilota: bio, statistiche della carriera e i dati veri dell'ultimo weekend (D19): posizione e distacco
// nell'ultima gara (lastRace) e il miglior giro in qualifica dello stesso round (TracingInsights, dati FastF1).
function DriverDetailModal({ driver, lastRace = null, races = [], onClose }) {
  const ph = useCommonsPhoto("drivers", driver.id);   // G30
  const row = lastRace && Array.isArray(lastRace.rows) ? lastRace.rows.find(r => r.id === driver.id) || null : null;
  const race = lastRace ? races.find(r => r.id === lastRace.raceId) || null : null;
  const Q = race ? (BtWeekend.quali || []).find(q => q.round === race.round) || null : null;
  const qd = Q && Q.drivers ? Q.drivers[driverCode(driver)] || null : null;
  const qs = qd ? qd.q.map((v, i) => [v, i]).filter(([v]) => v > 0) : [];
  const qBest = qs.length ? Math.min(...qs.map(([v]) => v)) : null, qSeg = qs.length ? "Q" + (qs[qs.length - 1][1] + 1) : null;
  const box = (label, value) => (
    <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.04)" }}>
      <span style={{ display: "block", fontFamily: F_BODY, fontSize: 10, color: C.dim, marginBottom: 3 }}>{label}</span>
      <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 16, color: C.text }}>{value}</span>
    </div>
  );
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 600, display: "flex", alignItems: "flex-end" }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div data-driver-modal={driver.id} className="scrollcol" style={{ background: C.card, borderRadius: "24px 24px 0 0", width: "100%", maxHeight: "90%", position: "relative" }}>
        <div style={{ position: "relative", height: 230, borderRadius: "24px 24px 0 0", overflow: "hidden", background: `linear-gradient(160deg, ${driver.color} 0%, ${driver.color}55 45%, ${C.card} 100%)` }}>
          {driver.photo ? (
            <img src={driver.photo} alt={driver.full} style={{ position: "absolute", right: 8, bottom: 0, height: 222, width: "auto", maxWidth: "50%", objectFit: "contain", objectPosition: "right bottom" }} />
          ) : ph ? (
            <>
              <img data-commons-photo="" src={ph.thumb} alt={driver.full} style={{ position: "absolute", right: 0, top: 0, height: "100%", width: "56%", objectFit: "cover", objectPosition: "50% 18%", WebkitMaskImage: "linear-gradient(90deg, transparent 0%, #000 34%)", maskImage: "linear-gradient(90deg, transparent 0%, #000 34%)" }} />
            </>
          ) : (
            <span data-geo-driver-big={driver.id} aria-hidden="true" style={{ position: "absolute", right: 14, bottom: 22, filter: "drop-shadow(0 10px 18px rgba(0,0,0,.45))" }}>
              <HelmetArt spec={driverHelmet(driver)} size={170} />
            </span>
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
        {!driver.photo && ph && <span data-photo-credit="" style={{ display: "block", fontFamily: F_BODY, fontSize: 10, lineHeight: 1.35, color: C.dim, textAlign: "right", margin: "-8px 0 10px" }}>{ph.credit}</span>}
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
        <span style={{ display: "block", fontFamily: F_BODY, fontWeight: 700, fontSize: 10.5, letterSpacing: 1, color: C.dim, marginBottom: 8 }}>ULTIMA GARA{lastRace ? " · " + lastRace.name.toUpperCase() : ""}</span>
        {row ? (
          <div data-driver-last="" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            {box("POSIZIONE", row.pos ? "P" + row.pos : "RIT")}
            {box(row.pos === 1 ? "TEMPO DI GARA" : "DISTACCO", row.time)}
          </div>
        ) : <p style={{ margin: "0 0 16px", fontFamily: F_BODY, fontSize: 12, color: C.dim }}>Non ha corso l'ultima gara.</p>}
        <span style={{ display: "block", fontFamily: F_BODY, fontWeight: 700, fontSize: 10.5, letterSpacing: 1, color: C.dim, marginBottom: 8 }}>QUALIFICA{race ? " · " + race.name.toUpperCase() : ""}</span>
        {qBest ? (
          <div data-driver-quali="" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            {box("MIGLIOR GIRO", fmtLapMs(qBest))}
            {box("FINO A", qSeg)}
          </div>
        ) : <p style={{ margin: "0 0 16px", fontFamily: F_BODY, fontSize: 12, color: C.dim }}>Tempi della qualifica non disponibili.</p>}
        <span style={{ display: "block", fontFamily: F_BODY, fontSize: 10, color: C.dim, lineHeight: 1.45 }}>Ultima gara: risultato ufficiale. Qualifica: tempi veri di TracingInsights (dati FastF1 del live timing).</span>
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
          <span style={{ fontFamily: F_BODY, fontSize: 11, color: C.dim }}>Anteprima grafica: posizioni non reali</span>
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
// Account con Firebase Authentication (src/services/account.js). ACCOUNT_CLEANUPS: pulizie che l'eliminazione
// dell'account fa prima di cancellare il profilo (chat del Task 8, feedback del Task 9).
const ACCOUNT_CLEANUPS = [];
const Account = createAccount({ cleanups: ACCOUNT_CLEANUPS });
// Chat dei tifosi su Firebase (src/services/chat.js); eliminando l'account si tolgono i suoi messaggi e segnalazioni.
const Chat = createChat({ now: nowMs });
ACCOUNT_CLEANUPS.push(u => Chat.cleanupFor(u));
// Feedback (src/services/feedback.js): eliminando l'account si cancellano anche quelli che ha mandato.
const Feedback = createFeedback({ now: nowMs });
ACCOUNT_CLEANUPS.push(u => Feedback.cleanupFor(u));
ACCOUNT_CLEANUPS.push(u => FantaL.cleanupFor(u));   // 31/10: leghe FantaF1
const TERMS_KEY = "bt-terms-accepted";   // Termini accettati: solo su questo telefono, {ts}, come oggi
// Richiesta di feedback come notifica nella campanella, al 5° accesso (solo su questo telefono, come oggi i Termini):
// un accesso è un'apertura dell'app o un ritorno dopo almeno 30 minuti in secondo piano.
const OPENS_KEY = "bt-opens", FEEDBACK_ASK_KEY = "bt-feedback-ask";
const FEEDBACK_ASK_AFTER = 5, NEW_VISIT_AWAY_MS = 30 * 60 * 1000;
// Conta un accesso; al 5° crea la richiesta di feedback (una volta sola). Restituisce la richiesta se è appena nata.
const countVisit = () => {
  const o = local.get(OPENS_KEY) || {};
  const n = (o.n || 0) + 1;
  local.set(OPENS_KEY, { ...o, n, away: null });
  if (n >= FEEDBACK_ASK_AFTER && !local.get(FEEDBACK_ASK_KEY)) { const ask = { at: Date.now(), read: false, done: false }; local.set(FEEDBACK_ASK_KEY, ask); return ask; }
  return null;
};
const CHAT_LIST_MS = 6000, CHAT_ROOM_MS = 4000;   // come l'app di oggi: elenco ogni 6 s, stanza aperta ogni 4 s

// Dati personali di chi entra con un account (users/<email>.app2, src/services/appdata.js): valori di partenza.
const USER_INIT = {
  saved: [], favTeam: null, favDriver: null, notifPrefs: { team: true, driver: true }, votes: {},
  squad: FANTA_SQUAD_INIT, squadBase: { drivers: FANTA_SQUAD_INIT.drivers.slice(), teams: FANTA_SQUAD_INIT.teams.slice() }, freeTransfers: 3,
  predAnswers: {}, sillyPreds: {}, stratPreds: {}, pitBest: null, wxGuess: {}, ratings: {}, dotd: {}, notifSeenAt: 0,
  theme: { mode: "team", color: null }, sounds: true, haptics: true, helmet: null, hidden: [], trophies: {},
  premium: { sub: false, trial: null }, squadLog: [], leagues: [],
};
// Premium dell'anteprima salvato nell'account (24/10): sub = abbonamento di prova, trial = prova per un GP { start, end }.
const cleanPremium = v => {
  const t = v && v.trial, ok = t && isFinite(t.start) && isFinite(t.end);
  return { sub: !!(v && v.sub), trial: ok ? { start: +t.start, end: +t.end, ...(t.converted ? { converted: true } : {}) } : null };
};
// Dati dell'account che restano anche sul telefono: uscendo dall'account non tornano quelli di serie.
const PHONE_KEYS = ["theme", "sounds", "haptics"];
const NOT_SAVED = "Non salvato: controlla la connessione e riprova.";
const USER_WAIT = "I tuoi dati non sono ancora arrivati: controlla la connessione e riprova tra poco.";
const DATA_CHANGED = "Non salvato: nel frattempo i dati sono stati cambiati. Ora vedi quelli aggiornati: rifai la modifica e salva di nuovo.";
const OFFLINE_LINE = "Sei offline: alcuni contenuti potrebbero non essere aggiornati.";
const SHARED_REFRESH_MS = 60000;   // ogni minuto si rilegge bt-races: una gara messa LIVE arriva senza riavviare
const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const fmtSent = iso => { const t = Compat.parseDate(iso); return isNaN(t) ? "" : new Date(t).toLocaleString("it-IT", { timeZone: "Europe/Rome", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); };

function App() {
  // Account: undefined finché Authentication non dice se c'è una sessione salvata, null = nessun account.
  const [account, setAccount] = useState(undefined);
  const authed = !!account;
  const [loginHold, setLoginHold] = useState(false);   // G24: la Shift Light dell'accesso finisce prima di entrare
  useEffect(() => {
    const off = Account.onChange(u => setAccount(u));
    Account.start().then(u => setAccount(u || null), () => setAccount(null));
    // Authentication che non risponde (rete lentissima): finito lo splash si vede l'accesso (si può entrare da ospite);
    // se la sessione salvata arriva dopo, si entra da soli.
    const t = setTimeout(() => setAccount(a => (a === undefined ? null : a)), LOAD_MAX_MS);
    return () => { off(); clearTimeout(t); };
  }, []);
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
  const [commonsPhotos, setCommonsPhotos] = useState(shared0.commonsPhotos);   // G30: foto di Commons scelte dall'admin
  const [trophyCfg, setTrophyCfg] = useState(shared0.trophies);   // 25/10: trofei cambiati da Firebase (shared/bt-trophies)
  commons.choice = commonsPhotos || commons.choice;
  useEffect(() => { commonsNotify(); }, [commonsPhotos]);
  const predictSeat = (id, pr) => { if (userDataWait()) return; setSillyPreds(x => x[id] ? x : { ...x, [id]: pr }); };
  const [articleId, setArticleId] = useState(null);
  const [chatId, setChatId] = useState(null);
  // Messaggi delle stanze (Firebase): { stanza: [{ id, from, text, at, aid, mine }] }. Ogni messaggio ha un id: serve a
  // segnalarlo ed eliminarlo (moderazione).
  const [chatMsgs, setChatMsgs] = useState({});
  const chats = CHAT_ROOMS.map(r => ({ ...r, messages: chatMsgs[r.id] || [] }));
  const [termsAccepted, setTermsAccepted] = useState(() => !!local.get(TERMS_KEY));   // al primo avvio no: Termini prima di tutto
  const [termsOpen, setTermsOpen] = useState(false);         // rilettura dal profilo
  const acceptTerms = () => { local.set(TERMS_KEY, { ts: Date.now() }); setTermsAccepted(true); setTermsOpen(false); };
  const [splash, setSplash] = useState(true);                // avvio: logo e "Caricamento…"
  const [sharedReady, setSharedReady] = useState(false);     // prima lettura dei contenuti di Firebase finita (anche senza rete)
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackAsk, setFeedbackAsk] = useState(() => local.get(FEEDBACK_ASK_KEY));   // { at, read, done } o null
  const saveAsk = a => { local.set(FEEDBACK_ASK_KEY, a); setFeedbackAsk(a); };
  useEffect(() => { const ask = countVisit(); if (ask) setFeedbackAsk(ask); }, []);   // questa apertura è un accesso
  // Feedback inviato (dal Profilo o dalla notifica): la richiesta sparisce e non torna più.
  const sendFeedback = f => Feedback.send({ ...f, email: account ? account.email : "" }).then(r => {
    saveAsk({ ...(local.get(FEEDBACK_ASK_KEY) || { at: Date.now(), read: true }), done: true });
    return r;
  });
  const [reports, setReports] = useState([]);   // segnalazioni per il moderatore (shared/bt-chat-reports)
  const [banned, setBanned] = useState([]);     // utenti sospesi dalla chat (shared/bt-chat-banned)
  const [blocked, setBlocked] = useState(() => Chat.blocked());   // utenti che ho bloccato (solo su questo telefono)
  const [saved, setSaved] = useState(USER_INIT.saved);       // articoli salvati tra i preferiti (id)
  const [savedOnly, setSavedOnly] = useState(false); // Home: mostra solo i salvati
  // FantaF1 come F1 Fantasy: la squadra, quella dell'ultima chiusura (per contare i cambi) e i cambi gratis.
  const [squad, setSquad] = useState(USER_INIT.squad);
  const [squadBase, setSquadBase] = useState(USER_INIT.squadBase);
  const [freeTransfers, setFreeTransfers] = useState(USER_INIT.freeTransfers);
  const [fantaWeekends, setFantaWeekends] = useState([]);   // punti delle sessioni già corse: { id, raceId, type, total, lines }
  const [predictions, setPredictions] = useState(shared0.predictions);   // previsioni avanzate (+1 punto), dell'admin
  const [predAnswers, setPredAnswers] = useState(USER_INIT.predAnswers);   // { idDomanda: risposta }
  const [lastRace, setLastRace] = useState(LAST_RACE_INIT);           // ultima gara: podio e classifica
  // 31/10: FantaF1 vero. squadLog = storia della squadra (account); leagueCodes = codici delle mie leghe (account);
  // leagues = le leghe lette da Firebase; fantaRounds = risultati veri della stagione (Jolpica).
  const [squadLog, setSquadLog] = useState(USER_INIT.squadLog);
  const [leagueCodes, setLeagueCodes] = useState(USER_INIT.leagues);
  const [leagues, setLeagues] = useState([]);
  const [fantaRounds, setFantaRounds] = useState([]);
  const [homePoll, setHomePoll] = useState(shared0.homePoll);    // sondaggio della Home (Premium); null = nessuno
  const [votes, setVotes] = useState(USER_INIT.votes);           // { idSondaggio: idRisposta }
  const [notifsRaw, setNotifsRaw] = useState(shared0.notifs);    // shared/bt-notifs come sono salvate
  const [localNotifs, setLocalNotifs] = useState([]);            // avvisi di questo telefono (notizia sul tuo preferito)
  const [notifSeenAt, setNotifSeenAt] = useState(USER_INIT.notifSeenAt);   // ora dell'ultima "Segna tutte come lette"
  const [premiumOpen, setPremiumOpen] = useState(false);
  // Premium: si salva nell'account (users/<email>.app2.premium) e torna riaprendo l'app; la prova finisce da sola.
  const [premium, setPremium] = useState(USER_INIT.premium);
  const trial = premium.trial;   // prova gratuita: { start, end } (una sola volta)
  // 29/10: Pro con una pubblicità con premio, solo in memoria: finisce chiudendo l'app o spegnendo lo schermo (pagina
  // nascosta). Mentre l'annuncio è sullo schermo (e un attimo dopo) la pagina nascosta non conta.
  const [adPro, setAdPro] = useState(false), [adBusy, setAdBusy] = useState(false);
  const adShowing = useRef(0);
  useEffect(() => {
    const h = () => { if (document.hidden && performance.now() > adShowing.current) setAdPro(false); };
    document.addEventListener("visibilitychange", h);
    return () => document.removeEventListener("visibilitychange", h);
  }, []);
  const isPremium = !!(account && account.isPremium) || premium.sub || (!!trial && nowMs() < trial.end) || adPro;
  const [plan, setPlan] = useState("annual");
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const [selectedDriver, setSelectedDriver] = useState(null);
  // Link dell'app in chat (25/10): "Invia in chat" sceglie la stanza (linkShare), poi il link si allega (pendingLink);
  // aperto un link dalla chat, Indietro torna in chat (linkFrom); il Ghost Lap si apre sulla curva del link (ghostInit).
  const [linkShare, setLinkShare] = useState(null), [pendingLink, setPendingLink] = useState(null);
  const [linkFrom, setLinkFrom] = useState(null), [ghostInit, setGhostInit] = useState(null);
  const [liveTrackOpen, setLiveTrackOpen] = useState(false);
  const [infoModal, setInfoModal] = useState(null);
  const [articles, setArticles] = useState(shared0.news);
  const [tagFilter, setTagFilter] = useState(null);
  const [favTeam, setFavTeam] = useState(USER_INIT.favTeam);
  const [favDriver, setFavDriver] = useState(USER_INIT.favDriver);
  const [notifPrefs, setNotifPrefs] = useState(USER_INIT.notifPrefs);
  // Tappa 3: colori dell'app (sul telefono e nell'account), suoni, vibrazioni, casco e notizie nascoste (account).
  const [theme, setTheme] = useState(() => cleanTheme(local.get(THEME_KEY)) || USER_INIT.theme);
  const [bootColor] = useState(() => { const t = local.get(THEME_KEY); return (t && Colors.normHex(t.color)) || null; });
  const [sounds, setSounds] = useState(() => fx.sounds());     // suoni e vibrazioni: la scelta del telefono (fx)
  const [haptics, setHaptics] = useState(() => fx.haptics());
  const [helmet, setHelmet] = useState(USER_INIT.helmet);
  const [trophies, setTrophies] = useState(USER_INIT.trophies);   // trofei vinti (G31): { id: data in ms }
  const [eggFound, setEggFound] = useState(false);                 // tre tocchi sul logo (trofeo segreto)
  const [trophyNotice, setTrophyNotice] = useState(null);         // avviso "Trofeo sbloccato"
  const trophyTimer = useRef(null);
  const [hidden, setHidden] = useState(USER_INIT.hidden);
  const [themeOpen, setThemeOpen] = useState(false);
  const [helmetOpen, setHelmetOpen] = useState(false);
  const [picker, setPicker] = useState(null); // 'team' | 'driver'
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [guest, setGuest] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginReason, setLoginReason] = useState(null);
  const needLogin = (reason) => { setLoginReason(reason); setLoginOpen(true); };
  const [adminTab, setAdminTab] = useState("NEWS");
  const [fantaStats, setFantaStats] = useState(shared0.fantaStats);
  const [standings, setStandings] = useState(shared0.standings);   // { note, drivers, teams, guests }
  // 24/10: le classifiche si mostrano da Jolpica (vere, dopo ogni gara) se non sono più vecchie di quelle dell'admin; il
  // Pannello Admin continua a modificare le sue (standings).
  const [jolpicaSt, setJolpicaSt] = useState(null);
  useEffect(() => {
    if (!JOLPICA_ON) return undefined;
    let alive = true;
    const load = () => Jolpica.standings().then(v => {
      if (!alive || !v) return;
      addStandingsGuests(v.guests);
      setJolpicaSt(cur => (sameJson(cur, v) ? cur : v));
    }, () => {});
    load();
    const iv = setInterval(load, 30 * 60000);
    return () => { alive = false; clearInterval(iv); };
  }, []);
  const shownStandings = pickStandings(standings, jolpicaSt);
  // 25/10: dati F1 nuovi dopo ogni sessione (src/services/f1data.js): all'avvio e ogni 30 minuti cambiano sul posto quelli
  // dentro l'APK (Ghost Lap, gare, qualifiche, prove libere) e l'app si ridisegna.
  const [, setF1Ver] = useState(0);
  useEffect(() => {
    let alive = true;
    const load = () => F1Data.refresh().then(r => {
      if (alive && applyF1Data(r, { weekend: BtWeekend, ghostData: BtRealData, ghostSessions: GHOST_SESSIONS, ghostCircuit: GHOST_CIRCUIT })) setF1Ver(v => v + 1);
    }, () => {});
    load();
    const iv = setInterval(load, 30 * 60000);
    return () => { alive = false; clearInterval(iv); };
  }, []);
  // Calendario 2026 con lo stato di shared/bt-races; extra = gare salvate fuori calendario, che restano nel documento.
  const [racesDoc, setRacesDoc] = useState(shared0.races);
  // 24/10: lo stato delle gare segue gli orari del weekend anche con l'app aperta (LIVE da 30 minuti prima delle prove
  // libere, src/services/compat.js): si ricontrolla ogni 20 secondi. Senza cambi resta la stessa lista.
  const [, setClockMin] = useState(() => Math.floor(nowMs() / 60000));
  useEffect(() => { const iv = setInterval(() => setClockMin(Math.floor(nowMs() / 60000)), 20000); return () => clearInterval(iv); }, []);
  const races = Compat.raceStatusesAt(racesDoc.races, nowMs());
  const [ig, setIg] = useState(shared0.ig);
  const [shareId, setShareId] = useState(null);   // articolo aperto nel foglio "Condividi"
  const [circuitId, setCircuitId] = useState(null); // pagina "Mostra di più" del circuito
  // Sessione in diretta che avanza 4 volte al secondo: { raceId, type, sim, track, source }. Per ora c'è solo la
  // Diretta: la "Prova diretta" del Pannello Admin (source "demo", simulata: gira solo sul telefono dell'admin, su una
  // copia dello stato, e non cambia niente di quello che vedono gli altri né dei suoi dati, D23) oppure la sessione finita
  // della gara LIVE, rivista con i dati veri di OpenF1 (source "openf1"). Con la prova DEMO accesa, si vede la prova.
  const [demoLive, setDemoLive] = useState(null);
  const [of1Live, setOf1Live] = useState(null);
  const live = demoLive || of1Live;
  const [of1, setOf1] = useState({ status: "idle", raceId: null });   // gara LIVE: "loading" | "locked" | "error" | "empty" | "ok"
  const of1TickRef = useRef(null);
  // Sessione rivista: parte ferma alla fine; "Rivedi dall'inizio" la fa scorrere ×10 (o ×60).
  const [replay, setReplay] = useState({ playing: false, speed: 10 });
  const replayRef = useRef(replay);
  replayRef.current = replay;
  const [, setLiveTick] = useState(0);
  const [liveSpeed, setLiveSpeed] = useState(3);
  const [telemetry, setTelemetry] = useState(null); // { carId, lapNo, sector }
  const [lapList, setLapList] = useState(null);     // pilota di cui vedere tutti i tempi sul giro
  const [ssOpen, setSsOpen] = useState(false);      // Second Screen a tutto schermo
  const [ssLayout, setSsLayout] = useState(SS_LAYOUT_INIT);   // grafiche scelte e loro posto
  const [ssPrefs, setSsPrefs] = useState(SS_PREFS_INIT);      // piloti delle gomme, pilota della telemetria, radar
  const [dotd, setDotd] = useState({});                       // voti del pilota e della scuderia del giorno, per gara
  const aboutMe = account ? account.about : null;             // "Su di te" dell'account: anno di nascita, anni di F1, tipo di tifoso
  // Pagelle della community: { "r16:RACE": { pilota: { pace, aggr, gomme, fortuna, strategia } } }; un voto per pilota.
  const [ratings, setRatings] = useState({});
  // Durante la prova DEMO i voti (pagelle e pilota del giorno) vanno in questa copia, solo in memoria: finita la prova
  // spariscono e non toccano quelli dell'account (che valgono per le gare vere).
  const demoOn = !!(live && live.source === "demo");
  const [demoVotes, setDemoVotes] = useState({ ratings: {}, dotd: {} });
  const votesNow = demoOn ? demoVotes : { ratings, dotd };
  const rateDriver = (key, id, vals) => {
    const add = r => { const cur = r[key] || {}; return cur[id] ? r : { ...r, [key]: { ...cur, [id]: vals } }; };
    if (demoOn) setDemoVotes(v => ({ ...v, ratings: add(v.ratings) })); else if (!userDataWait()) setRatings(add);
  };
  const voteDotd = (raceId, kind, id) => {
    const add = v => { const cur = v[raceId] || {}; return cur[kind] ? v : { ...v, [raceId]: { ...cur, [kind]: id } }; };
    if (demoOn) setDemoVotes(v => ({ ...v, dotd: add(v.dotd) })); else if (!userDataWait()) setDotd(add);
  };
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
  // Sessione rivista: gli avvisi ripartono dal punto in cui si è (all'arrivo è finita: niente avvisi di ritiri già passati).
  const syncNotices = lv => {
    const R = noticeRef.current, f = lv.sim.feed();
    R.dnf = f.dnfs.length; R.best = f.bestLap; R.q = []; clearTimeout(R.timer); R.cur = null; setNotice(null);
  };
  useEffect(() => {
    const R = noticeRef.current; clearTimeout(R.timer);
    noticeRef.current = { q: [], cur: null, best: null, dnf: 0, timer: null }; setNotice(null);
    if (!live) return;
    if (isOf1Live(live)) syncNotices(live);
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
      jumpTo: t => { if (!live.sim.jumpTo) return; live.sim.jumpTo(t); syncNotices(live); setLiveTick(n => n + 1); },   // sessione rivista
    };
    // La prova DEMO va avanti da sola; la sessione rivista solo dopo "Rivedi dall'inizio", fino alla fine.
    const iv = setInterval(() => {
      if (isOf1Live(live)) {
        const r = replayRef.current;
        if (!r.playing) return;
        live.sim.advance(0.25 * r.speed);
        if (live.sim.t >= live.sim.duration) setReplay(x => ({ ...x, playing: false }));
      } else live.sim.advance(0.25 * liveSpeed);
      if (liveShown.current) setLiveTick(n => n + 1);
    }, 250);
    return () => clearInterval(iv);
  }, [live, liveSpeed]);
  const replayCtl = isOf1Live(live) ? {
    playing: replay.playing, speed: replay.speed,
    onPlay: () => { live.sim.jumpTo(0); syncNotices(live); setReplay(r => ({ ...r, playing: true })); setLiveTick(n => n + 1); },
    onSpeed: () => setReplay(r => ({ ...r, speed: r.speed === 10 ? 60 : 10 })),
    onEnd: () => { live.sim.jumpTo(live.sim.duration); syncNotices(live); setReplay(r => ({ ...r, playing: false })); setLiveTick(n => n + 1); },
  } : null;
  // ── Contenuti condivisi su Firebase (src/services/appdata.js) ──────────
  // Un nuovo valore uguale a quello che c'è già non cambia lo stato (niente ridisegni inutili a ogni rilettura).
  const keep = set => v => set(cur => (sameJson(cur, v) ? cur : v));
  const sharedSet = {
    news: keep(setArticles), races: keep(setRacesDoc), notifs: keep(setNotifsRaw), ig: keep(setIg),
    standings: v => { addStandingsGuests(v.guests); keep(setStandings)(v); },
    highlights: keep(setHighlights), silly: keep(setSillyOfficial), predictions: keep(setPredictions),
    homePoll: keep(setHomePoll), fantaStats: keep(setFantaStats), driverPhotos: keep(setDriverPhotos), commonsPhotos: keep(setCommonsPhotos),
    trophies: keep(setTrophyCfg),
  };
  // Rilegge i contenuti indicati (tutti, all'avvio) e mette nello stato quelli letti davvero.
  const refreshShared = kinds => AppData.loadShared(nowMs(), kinds ? { kinds } : undefined).then(r => {
    (kinds ? r.fresh : Object.keys(r.values)).forEach(k => sharedSet[k](r.values[k]));
    setOffline(r.offline);
  });
  // Salvataggio dell'Admin: prima Firebase, poi lo schermo (src/services/appdata.js rilegge i documenti prima di
  // scrivere). update funzione: si applica ai dati appena riletti, così non si cancella quello che intanto hanno
  // scritto l'app di oggi o un altro admin. update valore (bozza delle schede CLASSIFICHE, FANTA F1, INSTAGRAM): se
  // intanto i dati sono cambiati non si scrive, lo schermo passa ai dati nuovi e l'admin rifà la modifica.
  const commitShared = (kind, update) => AppData.saveShared(kind, update, nowMs()).then(v => { sharedSet[kind](v); return true; }, e => {
    if (e && (e.code === "changed" || e.code === "stale") && e.value !== undefined) { sharedSet[kind](e.value); showToast(DATA_CHANGED); return false; }
    showToast(NOT_SAVED);
    return false;
  });
  const updOf = (cur, u) => (typeof u === "function" ? u(cur) : u);
  const adminSet = {
    articles: u => commitShared("news", u),
    races: u => commitShared("races", d => ({ races: updOf(d.races, u), extra: d.extra })),
    extraRaces: u => commitShared("races", d => ({ races: d.races, extra: updOf(d.extra, u) })),
    standings: u => commitShared("standings", typeof u === "function" ? d => ({ ...d, ...u(d) }) : { ...standings, ...u }),   // gli ospiti restano
    fantaStats: u => commitShared("fantaStats", u),
    ig: u => commitShared("ig", u),
    highlights: u => commitShared("highlights", u),
    predictions: u => commitShared("predictions", u),
    commonsPhotos: u => commitShared("commonsPhotos", u),
  };
  const officialSeat = (id, o) => commitShared("silly", s => ({ ...s, [id]: o }));

  // ── Dati personali dell'account: si leggono all'accesso e si salvano 800 ms dopo ogni modifica ──
  // (users/<email>.app2). Per l'ospite restano in memoria.
  const [userEmail, setUserEmail] = useState(null);
  const userEmailRef = useRef(null);
  const userReady = useRef(false);   // dati dell'account letti: da qui in poi le modifiche si salvano
  const userSnap = useRef({});       // ultimo valore letto o salvato di ogni dato (JSON): si manda solo quello che cambia
  const userVals = { saved, favTeam, favDriver, notifPrefs, votes, squad, squadBase, freeTransfers, predAnswers, sillyPreds, stratPreds, pitBest, wxGuess, ratings, dotd, notifSeenAt,
    theme, sounds, haptics, helmet, hidden, trophies, premium, squadLog, leagues: leagueCodes };
  const userValsRef = useRef(userVals);
  userValsRef.current = userVals;
  const userSet = { saved: setSaved, favTeam: setFavTeam, favDriver: setFavDriver, notifPrefs: setNotifPrefs, votes: setVotes, squad: setSquad, squadBase: setSquadBase,
    freeTransfers: setFreeTransfers, predAnswers: setPredAnswers, sillyPreds: setSillyPreds, stratPreds: setStratPreds, pitBest: setPitBest, wxGuess: setWxGuess,
    ratings: setRatings, dotd: setDotd, notifSeenAt: setNotifSeenAt,
    theme: v => setTheme(cleanTheme(v) || USER_INIT.theme), sounds: v => setSounds(v !== false), haptics: v => setHaptics(v !== false),
    helmet: v => setHelmet(v == null ? null : cleanHelmet(v)), hidden: v => setHidden(Array.isArray(v) ? v : []),
    trophies: v => setTrophies(cleanTrophies(v)), premium: v => setPremium(cleanPremium(v)),
    squadLog: v => setSquadLog(FantaSeason.cleanLog(v).slice(-80)), leagues: v => setLeagueCodes(Array.isArray(v) ? v.filter(c => /^BT-[A-Z0-9]{4,6}$/.test(c)).slice(0, 10) : []) };
  // Dati dell'account arrivati (per quale email): finché non arrivano, il colore dell'app resta quello del telefono.
  const [userLoaded, setUserLoaded] = useState(null);
  const loadUser = em => AppData.loadUserData(em).then(data => {
    if (userEmailRef.current !== em) return;   // intanto si è usciti, o è entrato un altro account
    const cur = userValsRef.current;
    AppData.USER_KEYS.forEach(k => { if (data[k] !== undefined) userSet[k](data[k]); });
    // Un dato del telefono (il colore scelto da ospite) che l'account non ha ancora si salva anche nell'account.
    userSnap.current = Object.fromEntries(AppData.USER_KEYS.map(k => [k, JSON.stringify(data[k] !== undefined ? data[k] : PHONE_KEYS.includes(k) ? USER_INIT[k] : cur[k])]));
    userReady.current = true;
    setUserLoaded(em);
  }, () => {});   // senza rete i dati restano in memoria: si riprova alla prossima rilettura
  // FantaF1 vero (31/10): a ogni cambio della squadra (completa, coi dati dell'account arrivati) una voce nella storia,
  // salvata nell'account e mandata alle mie leghe; leghe e risultati veri si rileggono aprendo FANTA.
  const fantaUserReady = !!userEmail && userLoaded === userEmail;
  const fantaBonusRef = useRef(0);
  useEffect(() => {
    if (!fantaUserReady || !account) return;
    const e = FantaSeason.logEntry(squad, nowMs()), last = squadLog[squadLog.length - 1];
    if (!e.d.every(Boolean) || !e.c.every(Boolean) || (last && FantaSeason.sameSquad(last, e) && (last.n || "") === (e.n || ""))) return;
    const next = [...squadLog, e].slice(-80);
    setSquadLog(next);
    FantaL.pushLog(leagueCodes, { aid: account.aid, name: account.name, team: squad.name, bonus: fantaBonusRef.current }, next);
  }, [fantaUserReady, JSON.stringify([squad.drivers, squad.teams, squad.boost, squad.name])]);
  useEffect(() => {
    if (!fantaUserReady) return;
    Promise.all(leagueCodes.map(c => FantaL.loadLeague(c).catch(() => null))).then(ls => setLeagues(ls.filter(Boolean)));
  }, [fantaUserReady, leagueCodes.join(","), tab === "fanta"]);
  useEffect(() => { if (tab === "fanta" && JOLPICA_ON) FantaL.results().then(setFantaRounds, () => {}); }, [tab]);
  // Colori dell'app (G01-G02): si applicano qui, prima di disegnare le pagine. Finché Authentication non ha risposto o
  // i dati dell'account non sono arrivati vale il colore usato l'ultima volta su questo telefono.
  const themePending = account === undefined || (!!userEmail && userLoaded !== userEmail);
  const tones = applyTheme(theme, favTeam, themePending ? bootColor : null);
  useEffect(() => {
    const st = document.documentElement.style;
    st.setProperty("--accent", tones.accent); st.setProperty("--accent-ink", tones.ink);
  }, [tones.accent, tones.ink]);
  useEffect(() => { if (!themePending) local.set(THEME_KEY, { mode: theme.mode, color: tones.base }); }, [themePending, theme.mode, tones.base]);
  // Suoni e vibrazioni (G03): la scelta va a fx (che la tiene sul telefono). L'audio parte al primo tocco dell'app.
  useEffect(() => { fx.setSounds(sounds); }, [sounds]);
  useEffect(() => { fx.setHaptics(haptics); }, [haptics]);
  useEffect(() => {
    const evs = ["pointerup", "touchend", "keydown", "click"];
    const off = () => evs.forEach(e => window.removeEventListener(e, go, true));
    const go = () => { fx.unlock(); if (fx.ready()) off(); };
    evs.forEach(e => window.addEventListener(e, go, true));
    return off;
  }, []);
  const enterAccount = email => {
    const em = String(email || "").trim().toLowerCase();
    if (!em) return;
    userEmailRef.current = em; userReady.current = false; setUserEmail(em);
    loadUser(em);
  };
  const resetUser = () => { userEmailRef.current = null; userReady.current = false; setEggFound(false); setUserEmail(null); setUserLoaded(null); AppData.USER_KEYS.forEach(k => { if (!PHONE_KEYS.includes(k)) userSet[k](USER_INIT[k]); }); };
  // Dati personali non ancora letti da Firebase (avvio senza rete): finché non arrivano non si cambiano, altrimenti la
  // modifica, fatta sopra i valori di serie, andrebbe persa o cancellerebbe quelli veri (revisione della Fase B, I1).
  // Intanto si riprova a leggerli.
  const userDataWait = () => {
    if (!userEmailRef.current || userReady.current) return false;
    showToast(USER_WAIT);
    loadUser(userEmailRef.current);
    return true;
  };
  const leaveAccount = () => { AppData.flushUserData().catch(() => {}); resetUser(); };
  // Esci: prima si salvano i dati personali in attesa (al massimo 3 secondi), poi si esce da Authentication: dopo il
  // cambio di account Firestore non manderebbe più le scritture rimaste in coda (revisione Fase B, minore 4).
  const logout = () => {
    Promise.race([AppData.flushUserData().catch(() => {}), new Promise(r => setTimeout(r, 3000))]).then(() => {
      resetUser();
      return Account.logout();
    });
    setGuest(false); setAdminUnlocked(false); setView("tab"); goTab("home");
  };
  // L'account di Authentication decide di chi sono i dati personali.
  const accountEmail = account ? account.email : null;
  useEffect(() => {
    if (accountEmail && accountEmail !== userEmailRef.current) enterAccount(accountEmail);
    else if (!accountEmail && userEmailRef.current) resetUser();
    // Entrato come ospite mentre la sessione salvata arrivava (rete lenta): ora è il suo account (revisione Fase B, I3).
    if (accountEmail) { setGuest(false); setLoginOpen(false); }
    // Cambia l'account (anche per un'uscita decisa da Firebase): il Pannello Admin si richiude e chiede di nuovo il
    // codice (revisione Fase B, minore 7).
    setAdminUnlocked(false);
    setView(v => (v === "admin" || v === "adminLock" ? "tab" : v));
  }, [accountEmail]);

  // ── Chat (Firebase, src/services/chat.js): si leggono solo le stanze che si vedono, come l'app di oggi ──
  const [chatTick, setChatTick] = useState(0);   // per rileggere subito (blocco tolto, account eliminato)
  const chatMeRef = useRef(null);
  chatMeRef.current = account ? { name: account.name, aid: account.aid } : null;
  const chatMe = () => chatMeRef.current;
  const loadRoomMsgs = id => Chat.loadRoom(id, chatMeRef.current).then(ms => setChatMsgs(x => (sameJson(x[id], ms) ? x : { ...x, [id]: ms })), () => {});   // senza rete restano quelli di prima
  const chatAdmin = view === "admin" && adminTab === "CHAT";
  const chatRooms = view === "chatThread" && chatId ? [chatId] : (view === "chats" || chatAdmin) ? ROOM_IDS : ssOpen ? ["generale"] : [];
  const chatEvery = view === "chats" || chatAdmin ? CHAT_LIST_MS : CHAT_ROOM_MS;
  useEffect(() => {
    if (!chatRooms.length) return;
    const load = () => { chatRooms.forEach(loadRoomMsgs); if (chatAdmin) reloadModeration(); };
    load();
    const iv = setInterval(load, chatEvery);
    return () => clearInterval(iv);
  }, [chatRooms.join(), chatAdmin, chatEvery, accountEmail, chatTick]);
  // Letti: la stanza aperta segna come visto il suo ultimo messaggio (bt-chat-seen-<stanza>, solo sul telefono).
  const threadMsgs = view === "chatThread" && chatId ? chatMsgs[chatId] : null;
  useEffect(() => { if (threadMsgs) Chat.markSeen(chatId, threadMsgs); }, [threadMsgs]);
  // La chat di una volta (shared/bt-chat) diventa la Generale, se questa non c'è ancora.
  useEffect(() => { if (accountEmail) Chat.migrateLegacy().catch(() => {}); }, [accountEmail]);
  useEffect(() => {
    if (!userEmail || !userReady.current) return;
    const patch = {};
    AppData.USER_KEYS.forEach(k => { const j = JSON.stringify(userVals[k]); if (j !== userSnap.current[k]) { patch[k] = userVals[k]; userSnap.current[k] = j; } });
    if (Object.keys(patch).length) AppData.saveUserData(userEmail, patch).catch(() => {});   // se non riesce resta in attesa
  }, [userEmail, ...AppData.USER_KEYS.map(k => userVals[k])]);

  // All'avvio si legge tutto; poi ogni minuto bt-races (una gara messa LIVE arriva da sola), quello che non si era
  // potuto leggere e i dati personali non ancora letti o non ancora salvati.
  // Lo stesso succede subito quando torna la rete (evento "online" del telefono) e quando si torna nell'app: si
  // rileggono anche profilo e admin, se all'avvio non erano arrivati (Account.retry, revisione della Fase B).
  const reconnectRef = useRef(null);
  reconnectRef.current = () => {
    refreshShared(["races", ...AppData.staleKinds().filter(k => k !== "races")]);
    Account.retry().catch(() => {});
    if (userEmailRef.current && !userReady.current) loadUser(userEmailRef.current);
    AppData.flushUserData().catch(() => {});
  };
  useEffect(() => {
    refreshShared().catch(() => {}).then(() => setSharedReady(true));
    const iv = setInterval(() => reconnectRef.current(), SHARED_REFRESH_MS);
    const online = () => reconnectRef.current();
    window.addEventListener("online", online);
    return () => { clearInterval(iv); window.removeEventListener("online", online); };
  }, []);
  // Finito lo splash con le letture di Firebase ancora in corso (rete lentissima) si vedono i contenuti di serie: lo dice
  // la riga "Sei offline", finché non arrivano (revisione Fase B, minore 10).
  useEffect(() => { if (!splash && !sharedReady) setOffline(true); }, [splash, sharedReady]);
  // Aprendo il Profilo con il profilo non ancora arrivato si riprova subito.
  useEffect(() => { if (view === "profilo" && account && account.loaded === false) Account.retry().catch(() => {}); }, [view]);

  // ── OpenF1 (src/services/openf1.js) ────────────────────────────────────
  // Gara LIVE (shared/bt-races): subito e poi ogni 30 secondi si guarda l'ultima sessione, una richiesta alla volta.
  // Durante la sessione OpenF1 gratis è bloccato: "SESSIONE IN CORSO". Finita, la si carica una volta sola e la si rivede
  // (source "openf1"); intanto si continua a guardare, così la sessione dopo del weekend prende il suo posto.
  // (Il progetto diceva ogni 10 secondi: con il limite di 30 richieste al minuto si guarda ogni 30 s e si carica una volta.)
  const racesRef = useRef(races);
  racesRef.current = races;
  const realLiveRace = races.find(r => r.status === "LIVE") || null;
  const realLiveId = realLiveRace ? realLiveRace.id : null;
  useEffect(() => {
    setOf1Live(null);
    if (!realLiveId) { setOf1({ status: "idle", raceId: null }); return undefined; }
    let alive = true, busy = false, loaded = null, loadedAt = 0;
    setOf1({ status: "loading", raceId: realLiveId });
    const tick = async () => {
      if (busy || !alive) return;
      busy = true;
      try {
        const race = racesRef.current.find(r => r.id === realLiveId);
        const s = await OF1.latestSession();
        if (!alive) return;
        if (!s || !race || !sessionOfWeekend(s, race)) { if (!loaded) setOf1({ status: "empty", raceId: realLiveId }); return; }
        if (loaded === s.session_key && !of1NeedsReload(s, loadedAt, nowMs())) return;
        if (!loaded) setOf1({ status: "loading", raceId: realLiveId });
        const raw = await OF1.loadSession(s.session_key);
        if (!alive) return;
        const track = trackOf(race.circuitId);
        if (!raw || !track || (!raw.laps.length && !raw.position.length)) { if (!loaded) setOf1({ status: "empty", raceId: realLiveId }); return; }
        const sim = buildReplay(raw, track, { drivers: LIVE_DRIVERS, of1: OF1 });
        loaded = s.session_key; loadedAt = nowMs();
        setReplay(r => ({ ...r, playing: false }));
        setOf1Live({ raceId: race.id, type: sim.type, sim, track, source: "openf1", raw, sessionKey: s.session_key });
        setOf1({ status: "ok", raceId: realLiveId });
      } catch (e) {
        if (!alive) return;
        // Bloccato: è cominciata un'altra sessione. Senza rete (o OpenF1 occupato) si tiene quello che c'è.
        if (e && e.locked) { loaded = null; setOf1Live(null); setOf1({ status: "locked", raceId: realLiveId }); }
        else if (!loaded) setOf1({ status: "error", raceId: realLiveId });
      } finally { busy = false; }
    };
    of1TickRef.current = tick;
    tick();
    const iv = setInterval(tick, OF1_POLL_MS);
    return () => { alive = false; clearInterval(iv); of1TickRef.current = null; };
  }, [realLiveId]);
  // Rilevatore di bluff: le radio della sessione vera segnate dall'admin (shared/bt-bluff-<sessione>). Si leggono quando
  // arriva la sessione e quando si apre il rilevatore; senza rete resta quello che c'è.
  const [bluffTags, setBluffTags] = useState({ key: null, list: [] });
  const of1Key = of1Live ? of1Live.sessionKey : null;
  const of1KeyRef = useRef(of1Key);
  of1KeyRef.current = of1Key;
  const loadBluffTags = () => {
    const key = of1KeyRef.current;
    if (key == null) return Promise.resolve();
    return AppData.loadBluff(key).then(list => { if (of1KeyRef.current === key) setBluffTags({ key, list }); }, () => {});
  };
  useEffect(() => { loadBluffTags(); }, [of1Key]);
  const bluffNow = of1Key != null && bluffTags.key === of1Key ? bluffTags.list : [];
  const tagBluffRadio = (r, text) => {
    const key = of1KeyRef.current;
    if (key == null) return Promise.resolve(false);
    return AppData.tagBluff(key, { code: r.code, date: r.date, lap: r.lap, text: String(text || "").trim(), by: (account && account.name) || "" })
      .then(() => { showToast("Radio segnata: nel Rilevatore di bluff"); loadBluffTags(); return true; }, () => { showToast(NOT_SAVED); return false; });
  };
  const untagBluffRadio = r => {
    const key = of1KeyRef.current;
    if (key == null) return Promise.resolve(false);
    return AppData.untagBluff(key, r.code, r.date)
      .then(() => { showToast("Radio tolta dal Rilevatore di bluff"); loadBluffTags(); return true; }, () => { showToast(NOT_SAVED); return false; });
  };
  // Ultima gara: all'avvio quella vera di OpenF1 (podio e classifica da session_result), salvata sul telefono per 6 ore.
  // Senza risposta resta quella che c'è (LAST_RACE_INIT) e si riprova dopo 5 minuti.
  useEffect(() => {
    let alive = true, tm = null;
    const cached = local.get(OF1_LAST_RACE_KEY);
    if (cached && cached.race && Array.isArray(cached.race.rows)) setLastRace(cached.race);
    const load = async () => {
      try {
        const now = nowMs();
        const list = await OF1.get("sessions", `year=${new Date(now).getUTCFullYear()}&session_name=Race`);
        const ended = list.filter(x => x && isFinite(Date.parse(x.date_end || x.date_start)) && Date.parse(x.date_end || x.date_start) + 3600000 <= now)
          .sort((a, b) => Date.parse(b.date_start) - Date.parse(a.date_start));
        if (!ended.length) throw new Error("nessuna gara");
        const s = ended[0], q = "session_key=" + s.session_key;
        const [session_result, drivers, laps] = await Promise.all([OF1.get("session_result", q), OF1.get("drivers", q), OF1.get("laps", q)]);
        const L = lastRaceFromResult({ session: s, session_result, drivers, laps }, racesRef.current, { drivers: LIVE_DRIVERS });
        if (!L) throw new Error("nessun risultato");
        if (!alive) return;
        setLastRace(L);
        local.set(OF1_LAST_RACE_KEY, { at: Date.now(), race: L });
      } catch (e) {
        if (alive) tm = setTimeout(load, OF1_RETRY_MS);
      }
    };
    if (!(cached && cached.at && Date.now() - cached.at < OF1_LAST_RACE_MS)) load();
    return () => { alive = false; clearTimeout(tm); };
  }, []);
  // Esito del pronostico pioggia (D09): per le sessioni finite su cui si è fatto il pronostico, il meteo vero di OpenF1
  // della sessione dello stesso tipo e dello stesso weekend. Gli esiti restano sul telefono: non cambiano più.
  const wxRef = useRef({ guess: wxGuess, result: wxResult });
  wxRef.current = { guess: wxGuess, result: wxResult };
  useEffect(() => {
    const c = local.get(OF1_WX_KEY);
    if (c && typeof c === "object") setWxResult(r => ({ ...c, ...r }));
    let alive = true, busy = false;
    const years = {};
    const sync = async () => {
      if (busy) return;
      busy = true;
      try {
        const { guess, result } = wxRef.current;
        for (const k of Object.keys(guess).filter(x => !result[x])) {
          const [rid, key] = k.split(":"), race = racesRef.current.find(r => r.id === rid);
          if (!race) continue;
          const ses = weekendWeather(race).sessions.find(x => x.key === key);
          const at = ses && ses.utc ? Date.parse(ses.utc) : null;
          if (at != null ? nowMs() < at + 2 * 3600000 : nowMs() < Date.parse(String(race.date).slice(0, 10) + "T23:59:59Z")) continue;   // non ancora finita
          const y = String(race.date).slice(0, 4);
          if (!years[y]) years[y] = await OF1.get("sessions", "year=" + y);
          const s = years[y].find(x => of1SessionType(x) === key && sessionOfWeekend(x, race) && (at == null || Math.abs(Date.parse(x.date_start) - at) < 6 * 3600000));
          if (!s || Date.parse(s.date_end || s.date_start) > nowMs()) continue;
          const w = await OF1.weatherOf(s.session_key);
          if (!alive) return;
          if (w.length) saveWxResult(k, w.some(x => x && x.rainfall) ? "rain" : "dry");
        }
      } catch (e) {
        // senza rete (o OpenF1 occupato) si riprova al prossimo giro
      } finally { busy = false; }
    };
    const t0 = setTimeout(sync, 4000), iv = setInterval(sync, 15 * 60000);
    return () => { alive = false; clearTimeout(t0); clearInterval(iv); };
  }, [userEmail]);

  // Notifiche: quelle dell'admin (shared/bt-notifs) più gli avvisi di questo telefono. Sono da leggere quelle più nuove
  // dell'ultima "Segna tutte come lette" (notifSeenAt, nell'account).
  const notifs = [
    ...(feedbackAsk && !feedbackAsk.done ? [{ id: "feedback-ask", action: "feedback", icon: "chat", bg: C.accent, stroke: "#fff", title: "Dicci cosa ne pensi dell'app",
      body: "Bastano 30 secondi: tocca qui per mandarci un feedback.", time: Compat.relTime(new Date(feedbackAsk.at).toISOString(), Date.now()), unread: !feedbackAsk.read }] : []),
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
    if (userDataWait()) return;
    const was = saved.includes(id);
    setSaved(s => was ? s.filter(x => x !== id) : [id, ...s]);
    showToast(was ? "Tolto dai preferiti" : "Salvato tra i preferiti");
  };
  // Swipe sulle notizie (G11): a destra si salva (senza togliere chi è già salvata), a sinistra si nasconde.
  const saveFromSwipe = (id) => {
    if (guest) { needLogin(SAVE_NEEDS_ACCOUNT); return; }
    if (userDataWait()) return;
    if (saved.includes(id)) { showToast("Già tra i preferiti"); return; }
    setSaved(s => [id, ...s]);
    showToast("Salvato tra i preferiti");
  };
  const hideArticle = (id) => {
    if (userDataWait()) return;
    setHidden(h => (h.includes(id) ? h : [...h, id].slice(-200)));
    showToast("Notizia nascosta");
  };
  const openSaved = () => { if (guest) { needLogin(SAVE_NEEDS_ACCOUNT); return; } setTagFilter(null); setSavedOnly(true); setTab("home"); setView("tab"); };

  // Pubblica (o salva in bozza) una notizia in shared/bt-news. Restituisce true se è salvata: solo allora il modulo
  // dell'admin si svuota e si torna alla Home.
  const publishArticle = (a) => {
    const art = { ...a, id: Compat.uid(), date: new Date(nowMs()).toISOString() };
    return commitShared("news", list => [art, ...list]).then(ok => {
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

  const ABOUT_TEXT = APP_NAME + " è l'app di B&T, nata dalla passione di un gruppo di amici per la Formula 1: un posto solo nostro per seguire le gare, parlarne insieme e tenere traccia di come va la nostra lega FantaF1.\n\nQui trovi le news, la diretta gara, la nostra chat e il nostro Instagram, tutto in un'unica app.\n\nTracciati dei circuiti: f1-circuits di Tomislav Bacinger, licenza MIT.\nCaratteri: Titillium Web (Accademia di Belle Arti di Urbino) e Work Sans, licenza SIL Open Font License 1.1.\n\nIcone: Tabler Icons, licenza MIT.\n\nVersione 2.0, 2026.";
  const HELP_TEXT = "Hai domande o hai trovato un problema nell'app? Scrivici, ti rispondiamo il prima possibile.\n\nEmail: bt.formula1@gmail.com\n\nOppure passa dalla Chat Generale: la community è sempre pronta a dare una mano.";

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };

  const goTab = (t) => { setTab(t); setView("tab"); };
  // Swipe tra le schede (G29): solo con la barra in basso (view "tab"). Col dito gli eventi touch, col mouse i pointer
  // events; il gesto non parte dagli elementi con gesti propri (ownGesture) e lo decide classifySwipe (src/logic/gesture.js).
  // 25/10: durante il gesto la pagina segue il dito (dragFollow) e ai lati compare la scheda accanto (TabPeek); col tocco
  // sulla barra o con lo swipe la scheda vecchia esce (tabLeave, data-tab-leave) mentre entra la nuova (tabEnter). Lo
  // stile durante il gesto si scrive direttamente sugli elementi: niente stato di React a ogni movimento del dito.
  const tabSwipe = useRef(null), swipeClick = useRef(0);
  const [tabEnter, setTabEnter] = useState(null);   // "left" | "right": da che parte arriva la scheda nuova
  const [tabLeave, setTabLeave] = useState(null);   // la scheda che esce: { id, body, dir, from, op, to }
  const [tabIn, setTabIn] = useState(null);         // px da cui parte la nuova: attaccata alla vecchia (--tab-in)
  const tabBody = useRef(null), tabPageRef = useRef(null), swipeBoxRef = useRef(null), navPillRef = useRef(null), peekRef = useRef({});
  useEffect(() => { if (view !== "tab") { setTabEnter(null); setTabLeave(null); } }, [view]);
  useEffect(() => {
    if (!tabLeave) return undefined;
    const t = setTimeout(() => setTabLeave(l => (l === tabLeave ? null : l)), 420);   // se animationend non arriva
    return () => clearTimeout(t);
  }, [tabLeave]);
  const switchTab = (next, drag) => {
    const i = TAB_IDS.indexOf(tab), j = TAB_IDS.indexOf(next);
    if (next === tab || j < 0) return;
    const dir = j > i ? "left" : "right", still = prefersReduced(), last = tabBody.current;
    const width = (swipeBoxRef.current && swipeBoxRef.current.clientWidth) || 390, from = drag ? drag.off : 0;
    setTabEnter(still ? null : dir);
    setTabIn(still ? null : dir === "left" ? width + from : from - width);
    setTabLeave(still || !last || last.id !== tab ? null : { id: tab, body: last.body, dir, from, op: drag ? drag.op : 1, to: leaveTo(from, dir, width) });
    goTab(next);
  };
  const peeks = () => ["left", "right"].map(side => peekRef.current[side]).filter(Boolean);
  const dragPaint = (s, dx) => {
    const page = tabPageRef.current;
    if (!page) return;
    const i = TAB_IDS.indexOf(tab), j = dx < 0 ? i + 1 : i - 1, can = j >= 0 && j < TAB_IDS.length;
    const width = page.clientWidth || 390, off = dragFollow(dx, width, can), pr = can ? dragProgress(dx, width) : 0, op = 1 - pr * 0.25;
    s.off = off; s.op = op;
    if (page.btBack) { clearTimeout(page.btBack); page.btBack = 0; }
    page.classList.remove("tab-back");
    page.style.transform = `translateX(${off}px)`; page.style.opacity = String(op);
    peeks().forEach(k => {
      const side = k.getAttribute("data-tab-peek"), show = can && (side === "right") === (dx < 0);
      k.classList.add("dragging");
      k.style.opacity = show ? String(Math.min(1, 0.3 + pr)) : "0";
      k.style.transform = show ? `translateX(${off}px)` : "";
      k.setAttribute("data-ready", show && pr >= 1 ? "1" : "");
    });
    const pill = navPillRef.current;
    if (pill) { pill.classList.add("dragging"); pill.style.setProperty("--nav-drag", String(can ? (dx < 0 ? pr : -pr) * 0.5 : 0)); }
  };
  // Fine del gesto: se non si cambia scheda la pagina torna a posto (back); la scheda accanto e la pillola sempre.
  const dragReset = back => {
    const page = tabPageRef.current;
    if (page && back) {
      page.classList.add("tab-back");
      page.style.transform = "translateX(0px)"; page.style.opacity = "1";
      clearTimeout(page.btBack);
      page.btBack = setTimeout(() => { page.btBack = 0; page.classList.remove("tab-back"); page.style.transform = ""; page.style.opacity = ""; }, 320);
    }
    peeks().forEach(k => { k.classList.remove("dragging"); k.style.opacity = "0"; k.style.transform = ""; k.setAttribute("data-ready", ""); });
    const pill = navPillRef.current;
    if (pill) { pill.classList.remove("dragging"); pill.style.removeProperty("--nav-drag"); }
  };
  const swipeStart = (x, y, t, target, root) => { tabSwipe.current = ownGesture(target, root) ? null : { x, y, t, still: prefersReduced(), on: false, off: 0, op: 1 }; };
  const swipeMove = (x, y) => {
    const s = tabSwipe.current;
    if (!s || s.still || s.dead) return;
    const dx = x - s.x, dy = y - s.y, ax = Math.abs(dx), ay = Math.abs(dy);
    if (!s.on) {
      if (ay > 12 && ay >= ax * SWIPE.ratio) { s.dead = true; return; }   // scorre in verticale: la pagina non segue
      if (ax < 10 || ay >= ax * SWIPE.ratio) return;
      s.on = true;
    }
    s.dx = dx;
    if (!s.raf) s.raf = requestAnimationFrame(() => { s.raf = 0; if (tabSwipe.current === s) dragPaint(s, s.dx); });
  };
  const swipeEnd = (x, y, t, width, mouse) => {
    const s = tabSwipe.current; tabSwipe.current = null;
    if (!s) return;
    if (s.raf) { cancelAnimationFrame(s.raf); s.raf = 0; }
    const dir = classifySwipe({ dx: x - s.x, dy: y - s.y, dt: t - s.t, width });
    const i = TAB_IDS.indexOf(tab), j = dir === "left" ? i + 1 : i - 1, go = !!dir && j >= 0 && j < TAB_IDS.length;
    if (s.on) dragReset(!go);
    if (mouse && (dir || s.on)) swipeClick.current = performance.now();   // il click che segue il trascinamento col mouse non apre niente
    if (!go) return;
    fx.play("drs"); fx.buzz("drs");
    switchTab(TAB_IDS[j], s.on ? { off: s.off, op: s.op } : null);
  };
  const swipeCancel = () => { const s = tabSwipe.current; tabSwipe.current = null; if (s && s.raf) cancelAnimationFrame(s.raf); if (s && s.on) dragReset(true); };
  const unreadCount = notifs.filter(n => n.unread).length;

  const castVote = (pollId, optionId) => {
    if (guest) { needLogin("Per votare nei sondaggi serve un account."); return; }
    if (userDataWait()) return;
    setVotes(v => ({ ...v, [pollId]: optionId }));
  };
  const setPollAnswer = (pollId, optionId) => {
    const save = pollId === "home"
      ? commitShared("homePoll", pl => (pl ? { ...pl, answer: optionId } : pl))
      : commitShared("news", list => list.map(a => a.poll && "art-" + a.id === pollId ? { ...a, poll: { ...a.poll, answer: optionId } } : a));
    return save.then(ok => { if (ok) showToast(optionId ? "Risposta esatta segnata: chi l'ha votata prende +2 punti" : "Risposta esatta tolta"); return ok; });
  };
  const openArticle = (id) => { setArticleId(id); setShareId(null); setView("article"); };
  const openCircuit = (id) => { setCircuitId(id); setView("circuit"); };
  // Fine di una sessione, una volta sola: com'è andato il meteo, punti FantaF1 della sessione e, a fine gara, podio e
  // riapertura della squadra (con i cambi gratis del weekend dopo). La prova DEMO non cambia niente di tutto questo:
  // né l'ultima gara, né il meteo, né i punti, né squadra e cambi (D23).
  const saveWxResult = (k, res) => {
    setWxResult(r => (r[k] ? r : { ...r, [k]: res }));
    local.set(OF1_WX_KEY, { ...(local.get(OF1_WX_KEY) || {}), [k]: res });
  };
  const closeSession = (lv) => {
    if (!lv || lv.closed) return;
    if (lv.source === "demo") { lv.closed = true; return; }
    const race = races.find(r => r.id === lv.raceId); if (!race) return;
    lv.closed = true;
    const stNow = lv.sim.state();
    const k = race.id + ":" + lv.type;
    // Esito del pronostico: il meteo vero di OpenF1 della sessione (D09); senza meteo nessun esito.
    if (lv.raw && Array.isArray(lv.raw.weather) && lv.raw.weather.length) saveWxResult(k, lv.sim.rained() ? "rain" : "dry");
    // Dopo la gara, l'ultima gara è quella vera: podio e classifica dal risultato ufficiale (session_result).
    if (lv.type === "RACE" && stNow.finished && lv.raw) {
      const L = lastRaceFromResult(lv.raw, races, { drivers: LIVE_DRIVERS });
      if (L) { setLastRace(L); local.set(OF1_LAST_RACE_KEY, { at: Date.now(), race: L }); }
    }
    if (!FANTA_REAL_POINTS) return;
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
    }
  };
  closeSessionRef.current = closeSession;
  const guessWeather = (race, key, v) => {
    if (guest) { needLogin("Per fare i pronostici serve un account."); return; }
    if (userDataWait()) return;
    setWxGuess(g => ({ ...g, [race.id + ":" + key]: v }));
    showToast(`Pronostico salvato: ${WX_WORD(v)}`);
  };
  // Prova diretta (DEMO) dal Pannello Admin: avvio, stop, bandiere e ultimo giro. Non scrive niente su Firebase (né lo
  // stato delle gare in shared/bt-races, né i dati dell'account) e non blocca la squadra FantaF1 (D23).
  const startLive = (raceId, type) => {
    if (demoLive) closeSession(demoLive);
    const race = races.find(r => r.id === raceId);
    const circ = race && CIRCUITS[race.circuitId];
    if (!circ) { showToast("Per questa gara non c'è il tracciato"); return; }
    const track = LiveSim.buildTrack(circ);
    const sched = weekendWeather(race).sessions.find(s => s.key === type);
    const [hh, mm] = (sched ? sched.time : "15:00").split(":").map(Number);
    const sim = LiveSim.createSession({ track, drivers: LIVE_DRIVERS, type, seed: race.round * 97 + type.length, script: true, startClock: hh * 3600 + mm * 60 });
    setDemoLive({ raceId, type, sim, track, source: "demo" }); setLapList(null); setTelemetry(null);
    setDemoVotes({ ratings: {}, dotd: {} });
    showToast(`Prova diretta (DEMO): ${sessionName(type)}. La vedi solo tu.`);
  };
  const stopLive = () => {
    if (demoLive) closeSession(demoLive);
    setDemoLive(null); setTelemetry(null); setLapList(null); setDemoVotes({ ratings: {}, dotd: {} }); showToast("Prova diretta terminata");
  };
  // Bandiere, ritiri e ultimo giro: solo nella prova DEMO (la sessione vera è quella che è stata).
  const liveFlag = (kind, sector) => { if (demoLive) { demoLive.sim.setFlag(kind, sector); setLiveTick(n => n + 1); } };
  const liveRetire = (id, cause) => {
    if (!demoLive || !demoLive.sim.retire(id, cause)) return;
    setLiveTick(n => n + 1); pollNotices(demoLive);
    const d = driverById(id); showToast(`${d ? d.full : id} ritirato: ${DNF_LABEL[cause] || DNF_LABEL.altro}`);
  };
  const liveLastLap = () => { if (demoLive) { demoLive.sim.jumpToLastLap(); demoLive.sim.advance(0.5); setLiveTick(n => n + 1); showToast(isRaceType(demoLive.type) ? "Ultimo giro" : "Ultimo minuto"); } };
  const openChat = (id) => { setChatId(id); setView("chatThread"); };
  // Profilo non ancora letto (avvio senza rete): prima di scrivere in chat lo si rilegge; finché non arriva il nome non
  // si conosce, e il messaggio non parte (revisione della Fase B, C1).
  const withProfile = then => {
    if (!account || account.loaded !== false) return then();
    return Account.retry().then(u => u, () => null).then(u => {
      if (u && u.loaded !== false) return then();
      showToast(ACCOUNT_MSG["not-loaded"]);
      return false;
    });
  };
  // Il messaggio si vede subito; se l'invio non riesce si toglie e la stanza rimette il testo nel campo (risponde false).
  const sendMessage = (id, text, link = null) => {
    if (!chatMe()) { needLogin("Per scrivere in chat serve un account."); return Promise.resolve(false); }
    return Promise.resolve(withProfile(() => postChat(id, text, link)));
  };
  // Profilo veloce (25/10): tifo, casco (col colore dei tasti se non ne ha uno suo) e trofei vinti viaggiano col
  // messaggio; Chat.send li manda solo quando cambiano.
  const myProf = () => ({
    t: favTeam || undefined, d: favDriver || undefined, f: (aboutMe && aboutMe.fan) || undefined,
    h: helmet ? { ...helmet, base: helmet.base || C.accent } : undefined,
    w: trophyList.filter(t => trophies[t.id]).map(t => t.id),
  });
  // 29/10: entrando in una stanza ci va il proprio profilo (voce nascosta, solo quando cambia): così chi tocca il nome
  // vede tifo, casco e trofei anche se non si è ancora scritto niente.
  useEffect(() => {
    if (view !== "chatThread" || !chatId || !account || account.loaded === false) return;
    Chat.announce(chatId, { name: account.name, aid: account.aid, p: myProf() }).then(sent => { if (sent) loadRoomMsgs(chatId); }, () => {});
  }, [view, chatId, account && account.aid, account && account.loaded, favTeam, favDriver, JSON.stringify(helmet || null), Object.keys(trophies || {}).length]);
  const postChat = (id, text, link = null) => {
    const u = Account.current(), who = u ? { name: u.name, aid: u.aid } : chatMe();
    const me = { ...(myMedal ? { ...who, medal: myMedal } : who), p: myProf() };   // la medaglia dei trofei viaggia con il messaggio (G31)
    const temp = { id: "invio-" + Date.now(), from: me.name, text: text.trim() || (link ? link.ti : ""), at: nowMs(), aid: me.aid, mine: true, medal: myMedal || null, link: link || null };
    setChatMsgs(x => ({ ...x, [id]: [...(x[id] || []), temp] }));
    return Chat.send(id, text, me, link).then(m => {
      fx.play("radio"); fx.buzz("light");
      setChatMsgs(x => ({ ...x, [id]: (x[id] || []).map(y => (y.id === temp.id ? m : y)) }));
      return true;
    }, e => {
      setChatMsgs(x => ({ ...x, [id]: (x[id] || []).filter(y => y.id !== temp.id) }));
      showToast(e && e.code === "banned" ? CHAT_MSG.banned : CHAT_MSG.offline);
      return false;
    });
  };
  // Reazioni (25/10): subito sullo schermo, poi in Firebase; se non va, la reazione torna com'era e lo si dice.
  const reactMessage = (chatId, m, emoji) => {
    if (!chatMe() || String(m.id).startsWith("invio-")) return;
    const put = fn => setChatMsgs(x => ({ ...x, [chatId]: (x[chatId] || []).map(y => (y.id === m.id ? fn(y) : y)) }));
    const before = m.myReaction || null;
    put(y => Compat.applyReaction(y, emoji));
    withProfile(() => {
      const u = Account.current() || chatMe();
      return Chat.react(chatId, m.id, emoji, { name: u.name, aid: u.aid }).then(() => loadRoomMsgs(chatId), e => {
        put(y => Compat.applyReaction(y, before));
        showToast(e && e.code === "banned" ? CHAT_MSG.banned : e && e.code === "offline" ? CHAT_MSG["reaction-offline"] : CHAT_MSG.reaction);
      });
    });
  };
  // Leghe FantaF1 vere (31/10).
  const leagueMe = () => (account ? { aid: account.aid, name: account.name, team: squad.name, bonus: fantaBonusRef.current } : null);
  const addLeague = l => { setLeagueCodes(cs => [...cs.filter(c => c !== l.code), l.code]); setLeagues(ls => [...ls.filter(x => x.code !== l.code), l]); };
  const createLeague = name => {
    const me = leagueMe();
    if (!me) { needLogin("Per creare una lega serve un account."); return null; }
    return FantaL.createLeague(name, me, squadLog).then(l => { addLeague(l); fx.play("done"); showToast(`Lega "${l.name}" creata: invita i tuoi amici col codice ${l.code}`); return l.code; }, () => { showToast(NOT_SAVED); return null; });
  };
  const joinLeague = code => {
    const me = leagueMe();
    if (!me) { needLogin("Per entrare in una lega serve un account."); return null; }
    return FantaL.joinLeague(code, me, squadLog).then(l => { addLeague(l); fx.play("done"); showToast(`Sei entrato nella lega "${l.name}"`); return l.code; }, e => { showToast(e && e.code === "not-found" ? "Nessuna lega con questo codice" : NOT_SAVED); return null; });
  };
  const leaveLeague = code => { const me = leagueMe(); if (!me) return; FantaL.leaveLeague(code, me.aid).then(() => { setLeagueCodes(cs => cs.filter(c => c !== code)); setLeagues(ls => ls.filter(l => l.code !== code)); showToast("Sei uscito dalla lega"); }, () => showToast(NOT_SAVED)); };
  const renameLeague = (code, name) => FantaL.renameLeague(code, name).then(() => { setLeagues(ls => ls.map(l => (l.code === code ? { ...l, name: name.trim() } : l))); showToast("Nome della lega aggiornato"); return true; }, () => { showToast(NOT_SAVED); return null; });
  const fantaLockOf = round => {
    const r = races.find(x => x.round === round), w = r && CIRCUIT_INFO[r.circuitId] ? CIRCUIT_INFO[r.circuitId].weekend || [] : [];
    return w.length ? BtLogic.teamLock({ sessions: w, now: 0 }).lockAt : null;
  };
  // "Invia in chat" (notizia, gara, Ghost Lap): prima si sceglie la stanza.
  const shareToChat = k => { if (guest) { needLogin("Per scrivere in chat serve un account."); return; } setShareId(null); setLinkShare(k); };
  // Un link toccato in chat: la sua pagina dell'app (Indietro torna in chat).
  const openLink = k => {
    const gone = () => showToast("Non c'è più nell'app");
    const page = fn => { setLinkFrom(view); fn(); };
    if (k.t === "news") { if (articles.some(a => a.id === k.id)) page(() => openArticle(k.id)); else gone(); }
    else if (k.t === "race") { if (CIRCUITS[k.id]) page(() => openCircuit(k.id)); else gone(); }
    else if (k.t === "ghost") page(() => { setGhostInit({ s: k.s, a: k.a, b: k.b, n: k.n }); setView("ghost"); });
    else if (k.t === "driver") { const d = driverById(k.id); if (d) setSelectedDriver(d); else gone(); }
    else if (k.t === "question") goTab("fanta");
  };
  // Moderazione chat, come nell'app di oggi.
  const reportMessage = (chatId, m) => {
    if (!chatMe()) return;
    withProfile(() => { const u = Account.current(); return Chat.report(chatId, m, { name: u.name, aid: u.aid }).then(() => showToast(CHAT_MSG.reported), () => showToast(CHAT_MSG["report-failed"])); });
  };
  const blockUser = (m) => {
    Chat.block(m);
    const bl = Chat.blocked();
    setBlocked(bl);
    setChatMsgs(x => Object.fromEntries(Object.entries(x).map(([k, ms]) => [k, ms.filter(y => !isBlockedMsg(bl, y))])));
    showToast(`Non vedrai più i messaggi di ${m.from}. Puoi sbloccarlo dal Profilo.`);
  };
  const unblockUser = (entry) => { Chat.unblock(entry); setBlocked(Chat.blocked()); setChatTick(n => n + 1); };
  const reloadModeration = () => { Chat.loadReports().then(setReports, () => {}); Chat.loadBanned().then(setBanned, () => {}); };
  const deleteChatMsg = (chatId, msgId) => Chat.deleteMessage(chatId, msgId).then(() => {
    setChatMsgs(x => ({ ...x, [chatId]: (x[chatId] || []).filter(m => m.id !== msgId) }));
    setReports(rs => rs.filter(r => r.msgId !== msgId));
    showToast("Messaggio eliminato");
  }, () => showToast(NOT_SAVED));
  const suspendUser = (who) => Chat.suspend(who).then(() => { reloadModeration(); showToast(`${who.name} non può più scrivere in chat`); }, e => showToast(e && e.code === "no-aid" ? CHAT_MSG["no-aid"] : NOT_SAVED));
  const unsuspendUser = (entry) => Chat.unsuspend(entry).then(reloadModeration, () => showToast(NOT_SAVED));
  const ignoreReport = (id) => Chat.ignoreReport(id).then(() => setReports(rs => rs.filter(r => r.id !== id)), () => showToast(NOT_SAVED));
  // Elimina account (richiesto da Google Play): profilo, dati personali, account Authentication e dati del telefono
  // (src/services/account.js). Con la password sbagliata o senza rete lancia l'errore: lo mostra la finestra di conferma.
  const deleteAccount = async pw => {
    const em = account ? account.email : null;
    await AppData.flushUserData().catch(() => {});
    await Account.deleteAccount(pw);
    if (em) AppData.cancelUserData(em);   // niente salvataggi che ricreino l'account
    setChatMsgs({}); setChatTick(n => n + 1);   // i suoi messaggi li ha già tolti la pulizia della chat: si rilegge
    resetUser();
    setBlocked([]); setSavedOnly(false);   // il Premium lo rimette come di serie resetUser (è un dato dell'account)
    setGuest(false); setAdminUnlocked(false); setView("tab"); setTab("home");
  };
  const needAccount = () => { if (guest) { needLogin("Per creare la tua squadra FantaF1 serve un account."); return true; } return userDataWait(); };
  const answerPrediction = (q, v) => {
    if (guest) { needLogin("Per rispondere alle previsioni serve un account."); return; }
    if (userDataWait()) return;
    if (q.kind === "history" && predAnswers[q.id] != null) return;
    setPredAnswers(a => ({ ...a, [q.id]: v }));
    showToast(q.kind === "history" ? (BtLogic.predictionCorrect(q, v) ? "Giusto! +1 punto FantaF1" : "Risposta sbagliata") : "Previsione salvata");
  };
  const readAll = () => {
    if (userDataWait()) return;
    setNotifSeenAt(nowMs()); setLocalNotifs(ns => ns.map(n => ({ ...n, unread: false })));
    if (feedbackAsk && !feedbackAsk.read) saveAsk({ ...feedbackAsk, read: true });
  };

  const doSubscribe = () => {
    if (guest) { setPremiumOpen(false); needLogin("Per abbonarti a B&T Premium serve un account."); return; }
    setSubscribing(true);
    if (userDataWait()) { setPremiumOpen(false); return; }
    setSubscribing(true);
    setTimeout(() => { setSubscribing(false); setSubscribed(true); setPremium(p => ({ sub: true, trial: p.trial ? { ...p.trial, converted: true } : null })); }, 1100);
  };
  const doTrial = () => {
    if (guest) { setPremiumOpen(false); needLogin("Per la prova gratuita di B&T Premium serve un account."); return; }
    if (trial) return;
    if (userDataWait()) { setPremiumOpen(false); return; }
    setSubscribing(true);
    setTimeout(() => { const now = nowMs(); setPremium(p => ({ ...p, trial: { start: now, end: trialEndFor(races, now) } })); setSubscribing(false); setSubscribed("trial"); }, 900);
  };
  const closePremium = () => { setPremiumOpen(false); setTimeout(() => setSubscribed(false), 300); };
  const watchAdPro = () => {
    if (adBusy) return;
    setAdBusy(true); adShowing.current = Infinity;
    Ads.showRewarded().then(r => {
      adShowing.current = performance.now() + 2500; setAdBusy(false);
      if (r === "ok") { setAdPro(true); closePremium(); fx.play("done"); fx.buzz("success"); showToast("Pro sbloccato finché non chiudi l'app"); }
      else showToast(r === "skipped" ? "Guarda la pubblicità fino in fondo per sbloccare il Pro" : "Nessuna pubblicità disponibile ora: riprova tra poco");
    });
  };

  // ── Tasto indietro di Android e barra di stato (nell'APK) ──────────────
  // Pagine interne: il tasto indietro fa come la freccia in alto a sinistra.
  const backFromLink = () => { setView(linkFrom || "tab"); setLinkFrom(null); setGhostInit(null); };
  const viewBack = {
    article: backFromLink, circuit: backFromLink, ghost: backFromLink, chats: () => setView("tab"),
    profilo: () => setView("tab"), notifiche: () => setView("tab"), instagram: () => setView(igFrom),
    adminLock: () => setView("profilo"), admin: () => setView("profilo"), chatThread: () => goTab("race"),
  };
  const closeLogin = () => { setLoginOpen(false); setLoginReason(null); };
  const inApp = authed || guest;
  // 30/10 (Edoardo): mentre una notizia è aperta niente screenshot, registrazioni né "Cerchia e cerca" (FLAG_SECURE col
  // plugin nativo SecureScreen di scripts/prepare_android.py; per condividere la notizia c'è Condividi).
  const secureOn = view === "article";
  useEffect(() => { const S = capPlugin("SecureScreen"); if (S && S.set) Promise.resolve().then(() => S.set({ on: secureOn })).catch(() => {}); }, [secureOn]);
  useBack(inApp && view !== "tab", () => (viewBack[view] || (() => setView("tab")))());
  useBack(loginOpen && !authed, closeLogin);
  useBack(premiumOpen, () => closePremium());
  useBack(!!selectedDriver, () => setSelectedDriver(null));
  useBack(!!linkShare, () => setLinkShare(null));
  useBack(liveTrackOpen, () => setLiveTrackOpen(false));
  useBack(ssOpen, () => setSsOpen(false));
  useBack(!!lapList, () => setLapList(null));
  useBack(!!telemetry, () => setTelemetry(null));
  useBack(!!infoModal, () => setInfoModal(null));
  useBack(!!picker, () => setPicker(null));
  useBack(themeOpen, () => setThemeOpen(false));
  useBack(helmetOpen, () => setHelmetOpen(false));
  useBack(shareId != null, () => setShareId(null));
  useBack(termsOpen, () => setTermsOpen(false));
  useBack(feedbackOpen, () => setFeedbackOpen(false));
  const onBackButton = () => {
    if (splash) return;                                   // durante l'avvio non fa niente
    if (!termsAccepted) { leaveApp(); return; }           // Termini del primo avvio: senza accettarli si esce
    const top = BACK_STACK[BACK_STACK.length - 1];
    if (top) { top(); return; }
    if (!inApp) { leaveApp(); return; }                   // schermata di accesso
    if (view !== "tab") { setView("tab"); return; }
    if (tab !== "home") { goTab("home"); return; }
    if (tagFilter || savedOnly) { setTagFilter(null); setSavedOnly(false); return; }   // Home filtrata: si toglie il filtro
    leaveApp();
  };
  const backRef = useRef(onBackButton);
  backRef.current = onBackButton;
  useEffect(() => {
    hideStatusBar();
    const A = capPlugin("App");
    if (!A || !A.addListener) return undefined;
    const subs = [
      A.addListener("backButton", () => backRef.current()),
      A.addListener("appStateChange", st => {
        if (!st) return;
        if (!st.isActive) { local.set(OPENS_KEY, { ...(local.get(OPENS_KEY) || {}), away: Date.now() }); return; }
        hideStatusBar();
        reconnectRef.current();   // di ritorno nell'app: si rilegge quello che manca
        const o = local.get(OPENS_KEY) || {};
        if (o.away && Date.now() - o.away >= NEW_VISIT_AWAY_MS) { const ask = countVisit(); if (ask) setFeedbackAsk(ask); }
        else if (o.away) local.set(OPENS_KEY, { ...o, away: null });
      }),
    ];
    return () => subs.forEach(h => Promise.resolve(h).then(x => x && x.remove && x.remove()).catch(() => {}));
  }, []);

  // Telefono: lo spazio delle barre del sistema sta in #phone-shell (App.css). Sopra l'app, in ogni schermata (anche
  // prima dell'accesso), i Termini del primo avvio e lo splash: restano montati quando cambia la schermata sotto.
  const shell = content => (
    <div id="phone-shell">
      <div className="shell-in">
        {content}
        {!termsAccepted && <TermsSheet onAccept={acceptTerms} />}
      </div>
      {splash && <SplashScreen ready={sharedReady && account !== undefined} onDone={() => setSplash(false)} />}
    </div>
  );

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
  // 31/10: il totale dei bonus va nelle mie leghe quando cambia (anche la classifica di lega conta i pronostici).
  const bonusTotal = bonus.reduce((a, x) => a + x.pts, 0);
  fantaBonusRef.current = bonusTotal;
  useEffect(() => {
    if (!fantaUserReady || !account || !leagueCodes.length) return;
    FantaL.pushLog(leagueCodes, { aid: account.aid, name: account.name, team: squad.name, bonus: bonusTotal }, squadLog);
    setLeagues(ls => ls.map(l => ({ ...l, members: l.members.map(m => (m.aid === account.aid ? { ...m, bonus: bonusTotal } : m)) })));
  }, [fantaUserReady, bonusTotal, leagueCodes.join(",")]);
  // Trofei (G31): dai dati veri dell'account e dei documenti condivisi (src/logic/trophies.js). Solo con un account e i
  // suoi dati letti (si salvano lì); un trofeo nuovo si segna con la data, con l'avviso, il suono della Shift Light e
  // la vibrazione. La squadra del FantaF1 conta solo se non è più quella di partenza.
  const sameSet = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && [...a].sort().join() === [...b].sort().join();
  const squadOwn = !!squad && !(sameSet(squad.drivers, FANTA_SQUAD_INIT.drivers) && sameSet(squad.teams, FANTA_SQUAD_INIT.teams));
  // Primo messaggio in chat: uno di questo account (aid) arrivato su Firebase, scritto ora o prima.
  const myAid = account && account.aid;
  const chatMine = !!myAid && Object.values(chatMsgs).some(l => Array.isArray(l) && l.some(m => m && m.aid === myAid && !String(m.id).startsWith("invio-")));
  // 25/10: nomi, testi e obiettivi da Firebase (shared/bt-trophies, trophyDefs); le pagelle e il pilota del giorno
  // della prova DEMO contano per i trofei (prima no: "li ho fatti ma il trofeo non arriva"), non per punti e classifiche.
  const trophyList = trophyDefs(trophyCfg);
  const trophyProg = trophyProgress({
    about: aboutMe, helmet, squad: squadOwn ? squad : null, saved, pitBest, sillyPreds,
    ratings: { ...demoVotes.ratings, ...ratings }, dotd: { ...demoVotes.dotd, ...dotd },
    correctPreds: bonus.filter(x => x.kind === "previsione").length, correctWx: bonus.filter(x => x.kind === "meteo").length,
    correctPolls: bonus.filter(x => x.kind === "sondaggio").length, events: { chat: chatMine, egg: eggFound },
  }, trophyList);
  const trophyReady = !!userEmail && userLoaded === userEmail;
  const trophyNew = trophyReady ? trophyList.filter(t => trophyProg[t.id] && trophyProg[t.id].done && !trophies[t.id]).map(t => t.id).join(",") : "";
  useEffect(() => {
    if (!trophyNew) return;
    const ids = trophyNew.split(","), at = nowMs();
    setTrophies(t => { const x = { ...t }; ids.forEach(id => { if (!x[id]) x[id] = at; }); return x; });
    setTrophyNotice({ key: at + ":" + trophyNew, ids, names: ids.map(id => (trophyList.find(t => t.id === id) || { name: id }).name) });
    fx.play("flag"); fx.buzz("flag");
    clearTimeout(trophyTimer.current);
    trophyTimer.current = setTimeout(() => setTrophyNotice(null), 3600);
  }, [trophyNew]);
  useEffect(() => () => clearTimeout(trophyTimer.current), []);
  const myMedal = medalOf(trophyList.filter(t => trophies[t.id]).length);
  // 25/10: con l'app di un admin il documento dei trofei su Firebase (shared/bt-trophies) si crea coi valori di serie se
  // manca: nella console ci sono già tutti, pronti da cambiare (nome, how, goal, off).
  const adminNow = !!account && Account.isAdmin();
  useEffect(() => { if (adminNow) AppData.ensureTrophyDoc().then(w => { if (w) refreshShared(["trophies"]); }, () => {}); }, [adminNow]);

  // ── Pubblicità (24/10, src/services/ads.js): banner in Home e in Race, solo nell'APK e senza Premium ──
  // Il banner nativo è disegnato da Android sopra l'app: si toglie con ogni finestra aperta (coprirebbe i suoi tasti) e
  // durante avvio, Termini e accesso. Le schede salgono della sua altezza vera più AD_GAP (spazio data-ad-space).
  const [adH, setAdH] = useState(adBannerBus.h);
  useEffect(() => { adBannerBus.subs.add(setAdH); return () => { adBannerBus.subs.delete(setAdH); }; }, []);
  const overlay = useOverlayOpen(!!adMobPlugin());
  const appShown = !(account === undefined && !guest) && !((!authed || loginHold) && !guest) && !(loginOpen && (!authed || loginHold));
  const adsPaused = splash || !termsAccepted || !appShown || overlay || premiumOpen || !!selectedDriver || liveTrackOpen || ssOpen || !!lapList || !!telemetry
    || !!infoModal || helmetOpen || themeOpen || !!picker || termsOpen || feedbackOpen;
  const bannerSlot = !isPremium && view === "tab" && !adsPaused && (tab === "home" || tab === "race") ? tab : null;
  useEffect(() => { Ads.setBanner(bannerSlot); }, [bannerSlot]);
  // Interstitial tra le notizie: si conta ogni notizia aperta e si mostra tornando alla lista (src/services/ads.js).
  const adView = useRef(view);
  useEffect(() => {
    const was = adView.current;
    adView.current = view;
    if (isPremium || was === view) return;
    if (view === "article") Ads.articleOpened();
    else if (was === "article") Ads.articleClosed();
  }, [view]);

  if (account === undefined && !guest) {   // si aspetta Authentication: forse c'è già una sessione
    return shell(
      <div data-auth-wait="" style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, fontFamily: F_BODY, fontSize: 13, color: C.muted }}><LedGrid mode="seq" size={7} />Caricamento…</div>
    );
  }
  if ((!authed || loginHold) && !guest) {
    return shell(
      <LoginScreen auth={Account} onHold={setLoginHold} onGuest={() => { setGuest(true); showToast("Stai navigando come ospite"); }} />
    );
  }
  if (loginOpen && (!authed || loginHold)) {
    return shell(
      <>
        <LoginScreen auth={Account} onHold={setLoginHold} reason={loginReason} onBack={closeLogin}
          onDone={r => { setGuest(false); setLoginOpen(false); setLoginReason(null); showToast(r && r.created ? "Account creato" : "Accesso effettuato"); }} />
        {toast && <div className="toast">{toast}</div>}
      </>
    );
  }

  const activeChat = chats.find(c => c.id === chatId);
  const activeArticle = articles.find(a => a.id === articleId);
  const shareArticle = shareId != null ? articles.find(a => a.id === shareId) : null;
  const liveSt = live ? live.sim.state() : null;
  // Quello che si può mandare in chat come link (ChatLinkPicker) e le foto delle miniature.
  const chatShareCtx = { share: shareToChat, sources: {
    articles, races, predictions, predAnswers, squad, trophyList, trophies, pitBest, sillyPreds, stratPreds,
    me: account ? { name: account.name, team: favTeam, driver: favDriver, fan: aboutMe && aboutMe.fan } : null,
    radios: of1RadiosAt(live, liveSt).slice(0, 20),
  } };
  const trialActive = isPremium && !!trial && !trial.converted;
  // Weekend del FantaF1: quello in diretta, altrimenti la prossima gara. La squadra si blocca all'inizio delle qualifiche.
  const fantaRace = (live && !demoOn && races.find(r => r.id === live.raceId)) || weekendRace(races);
  const fantaSeason = FantaSeason.seasonPoints({ log: squadLog, rounds: fantaRounds, lockOf: fantaLockOf });
  const fantaReal = new Set(fantaRounds.map(r => r.round));
  const fantaLive = fantaWeekends.filter(w => { const r = races.find(x => x.id === w.raceId); return !(r && fantaReal.has(r.round)); });
  const leagueRows = leagues.map(l => ({ ...l, members: FantaL.standings(l, fantaRounds, fantaLockOf) }));
  const fantaSessions = fantaRace && CIRCUIT_INFO[fantaRace.circuitId] ? CIRCUIT_INFO[fantaRace.circuitId].weekend || [] : [];
  const teamLockInfo = BtLogic.teamLock({ sessions: fantaSessions, now: nowMs() });   // solo l'ora vera: la prova DEMO non blocca (D23)
  // Previsioni sul weekend: si chiudono all'inizio della sessione a cui si riferiscono (o quando l'admin segna la risposta).
  const predLockOf = q => {
    if (q.kind === "history") return { locked: false, text: "" };
    const r = races.find(x => x.id === q.raceId);
    const ses = r && CIRCUIT_INFO[r.circuitId] ? CIRCUIT_INFO[r.circuitId].weekend || [] : [];
    const at = BtLogic.startOf(ses.find(x => x.key === q.about));
    const keys = r ? weekendKeys(r) : [];
    const liveHere = !!live && !!r && live.raceId === r.id && keys.indexOf(live.type) >= keys.indexOf(q.about);
    const endedHere = !!r && !!wxResult[r.id + ":" + q.about];
    return { locked: q.answer != null || (at != null && nowMs() >= at) || liveHere || endedHere, lockAt: at, text: `all'inizio ${SESSION_DEL[q.about] || ""}${at ? ` (${fmtRome(at)})` : ""}` };
  };
  const onRaceTab = view === "tab" && tab === "race";
  liveShown.current = !!live && (onRaceTab || liveTrackOpen || ssOpen || view === "admin");
  // Pannello Admin: i comandi della prova DEMO valgono solo per la prova (la sessione vera di OpenF1 non si tocca).
  const liveProps = { live: demoLive, liveSt: demoLive ? (demoLive === live ? liveSt : demoLive.sim.state()) : null, onStartLive: startLive, onStopLive: stopLive, onFlag: liveFlag, onLastLap: liveLastLap, onRetire: liveRetire, liveSpeed, setLiveSpeed, bluff: { live: of1Live, tags: bluffNow, onTag: tagBluffRadio, onUntag: untagBluffRadio } };
  // Sfondo della pagina Race: giallo con bandiera gialla / SC / VSC, rosso con la rossa, a scacchi al primo e all'ultimo giro.
  const pageBg = onRaceTab && liveSt ? liveSt.bg : null;
  const PAGE_BG = {
    yellow: "radial-gradient(140% 75% at 50% 0%, rgba(255,210,31,.75) 0%, rgba(255,210,31,.42) 45%, rgba(255,210,31,.26) 100%), #000000",
    red: "radial-gradient(140% 75% at 50% 0%, rgba(255,24,1,.8) 0%, rgba(255,24,1,.45) 45%, rgba(255,24,1,.28) 100%), #000000",
    chequered: "repeating-conic-gradient(rgba(255,255,255,.2) 0% 25%, rgba(255,255,255,0) 0% 50%) 0 0 / 44px 44px, #000000",
  };

  let body;
  if (view === "article" && activeArticle) body = <ArticleScreen article={activeArticle} onBack={viewBack.article} isPremium={isPremium} onPremium={() => setPremiumOpen(true)} onTag={filterByTag} saved={saved.includes(activeArticle.id)} onToggleSave={() => toggleSave(activeArticle.id)} onShare={() => setShareId(activeArticle.id)} vote={votes["art-" + activeArticle.id] || null} onVote={castVote} />;
  else if (view === "circuit" && circuitId) body = <CircuitScreen circuitId={circuitId} races={races} articles={articles} onBack={viewBack.circuit} onTag={filterByTag} onOpenArticle={openArticle} />;
  else if (view === "adminLock") body = <AdminKeypad onOk={() => { setAdminUnlocked(true); setView("admin"); }} onCancel={viewBack.adminLock} />;
  else if (view === "admin" && adminUnlocked && Account.isAdmin()) body = <AdminScreen photos={commonsPhotos} setPhotos={adminSet.commonsPhotos} silly={sillyOfficial} onSilly={officialSeat} highlights={highlights} setHighlights={adminSet.highlights} onBack={viewBack.admin} onPublish={publishArticle} articles={articles} setArticles={adminSet.articles} fantaStats={fantaStats} setFantaStats={adminSet.fantaStats} standings={standings} setStandings={adminSet.standings} races={races} setRaces={adminSet.races} extraRaces={racesDoc.extra} setExtraRaces={adminSet.extraRaces} ig={ig} setIg={adminSet.ig} sentNotifs={sentNotifs} onSendNotif={sendNotif} onDeleteNotif={deleteNotif} onToast={showToast} tab={adminTab} setTab={setAdminTab} chats={chats} reports={reports} banned={banned} onDeleteMsg={deleteChatMsg} onSuspend={suspendUser} onUnsuspend={unsuspendUser} onIgnoreReport={ignoreReport} liveProps={liveProps} polls={allPolls} votes={votes} onPollAnswer={setPollAnswer} predictions={predictions} setPredictions={adminSet.predictions} predAnswers={predAnswers} />;
  else if (view === "chatThread" && activeChat) body = <ChatThreadScreen chat={activeChat} onBack={viewBack.chatThread} onSend={guest ? () => needLogin("Per scrivere in chat serve un account.") : sendMessage} isPremium={isPremium} blocked={blocked} onReport={guest ? () => needLogin("Per segnalare un messaggio serve un account.") : reportMessage} onBlock={blockUser} onReact={guest ? () => needLogin("Per reagire ai messaggi serve un account.") : reactMessage} trophyList={trophyList} myWon={trophies} pendingLink={pendingLink} onPendingUsed={() => setPendingLink(null)} onOpenLink={openLink} liveRace={races.find(r => r.status === "LIVE") || null} />;
  else if (view === "instagram") body = <InstagramView ig={ig} onToast={showToast} onBack={viewBack.instagram} />;
  else if (view === "ghost") body = <GhostLap key={ghostInit ? JSON.stringify(ghostInit) : "ghost"} init={ghostInit} onBack={viewBack.ghost} />;
  else if (view === "chats") body = <ChatsView chats={chats} onOpen={openChat} blocked={blocked} onBack={viewBack.chats} unreadOf={(id, ms) => Chat.unread(id, ms)} />;
  else if (view === "profilo") body = <ProfiloScreen ig={ig} onOpenIg={() => { setIgFrom("profilo"); setView("instagram"); }} aboutMe={aboutMe} onSaveAboutMe={a => Account.updateAbout(a).catch(e => showToast(e && (e.code === "too-young" || e.code === "not-loaded") ? messageOf(e) : NOT_SAVED))} account={account} onSaveName={n => Account.updateName(n)} isAdmin={Account.isAdmin()} trial={trialActive ? trial : null} trialUsed={!!trial} onBack={viewBack.profilo} onNotifiche={() => setView("notifiche")} onPremium={() => setPremiumOpen(true)} onAdmin={() => guest ? needLogin("Accedi per usare il pannello admin.") : setView(adminUnlocked ? "admin" : "adminLock")} onLogout={logout} isPremium={isPremium} onAbout={() => setInfoModal({ title: "Info su B&T", body: ABOUT_TEXT, credits: true })} onFeedback={() => setFeedbackOpen(true)} onHelp={() => setInfoModal({ title: "Assistenza", body: HELP_TEXT })} favTeam={favTeam} favDriver={favDriver} onPickTeam={() => guest ? needLogin("Per scegliere scuderia e pilota del cuore serve un account.") : setPicker("team")} onPickDriver={() => guest ? needLogin("Per scegliere scuderia e pilota del cuore serve un account.") : setPicker("driver")} guest={guest} onLogin={() => needLogin(null)} onTerms={() => setTermsOpen(true)} blocked={blocked} onUnblock={unblockUser} onDeleteAccount={deleteAccount} savedCount={saved.length} onOpenSaved={openSaved} onTheme={() => setThemeOpen(true)} helmet={helmet} onHelmet={() => setHelmetOpen(true)} trophies={trophies} trophyProg={trophyProg} trophyList={trophyList}
    onAdPrivacy={Ads.privacyRequired() ? () => Ads.openPrivacy().catch(() => showToast("Le preferenze sulla privacy degli annunci non sono disponibili in questo momento.")) : null}
    sounds={sounds} haptics={haptics} onSounds={v => { if (userDataWait()) return; setSounds(v); fx.setSounds(v); if (v) fx.play("tick"); }} onHaptics={v => { if (userDataWait()) return; setHaptics(v); fx.setHaptics(v); if (v) fx.buzz("light"); }} />;
  else if (view === "notifiche") body = <NotificheScreen offline={offline} onBack={viewBack.notifiche} onAction={a => { if (a === "feedback") { if (feedbackAsk && !feedbackAsk.read) saveAsk({ ...feedbackAsk, read: true }); setFeedbackOpen(true); } }} notifs={notifs} onReadAll={readAll} isPremium={isPremium} onPremium={() => setPremiumOpen(true)} favTeam={favTeam} favDriver={favDriver} prefs={notifPrefs} onPrefs={v => { if (!userDataWait()) setNotifPrefs(v); }} onGoProfilo={() => setView("profilo")} />;
  else {
    if (tab === "home") body = <HomeScreen ig={ig} highlights={highlights} onOpenIg={() => { setIgFrom("tab"); setView("instagram"); }} articles={articles} tagFilter={tagFilter} onTag={filterByTag} onClearTag={() => setTagFilter(null)} onOpenArticle={openArticle} isPremium={isPremium} onPremium={() => setPremiumOpen(true)} onToast={showToast} onLiveTrack={() => setLiveTrackOpen(true)} onGoFanta={() => goTab("fanta")}  saved={saved} onToggleSave={toggleSave} savedOnly={savedOnly} setSavedOnly={setSavedOnly} onOpenCircuit={openCircuit} homePoll={homePoll} homeVote={votes.home || null} onVote={castVote}
      hidden={hidden} onHide={hideArticle} onUnhideAll={() => { if (!userDataWait()) setHidden([]); }} onSwipeSave={saveFromSwipe}
      onRefresh={() => refreshShared(["news", "highlights", "ig", "homePoll"]).catch(() => {})} />;
    else if (tab === "race") body = <RaceScreen onStandingsEnd={isPremium ? null : Ads.standingsEnd} favDriver={favDriver} dotdVote={live ? votesNow.dotd[live.raceId] : null} onDotdVote={(k, id) => live && voteDotd(live.raceId, k, id)} ratings={votesNow.ratings} onRate={rateDriver} onOpenChats={() => setView("chats")} onOpenGhost={() => setView("ghost")} races={races} standings={shownStandings} isPremium={isPremium} onPremium={() => setPremiumOpen(true)} onSelectDriver={setSelectedDriver} live={live} liveSt={liveSt} onExpandMap={() => setLiveTrackOpen(true)} onTelemetry={(carId, lapNo, sector) => setTelemetry({ carId, lapNo, sector })} onOpenCircuit={openCircuit} wxGuess={wxGuess} wxResult={wxResult} onGuessWeather={guessWeather} onLapTimes={setLapList} onSecondScreen={() => setSsOpen(true)} lastRace={lastRace} of1={of1} onOf1Refresh={() => of1TickRef.current && of1TickRef.current()} replay={replayCtl} />;
    else if (tab === "garage") body = <GarageScreen races={races} pitBest={pitBest} onPitResult={t => { if (!userDataWait()) setPitBest(b => b == null || t < b ? t : b); }} sillyPreds={sillyPreds} onPredict={predictSeat} sillyOfficial={sillyOfficial} live={live} stratPreds={stratPreds} onStrat={(id, st) => { if (!userDataWait()) setStratPreds(x => ({ ...x, [id]: { stints: st, at: nowMs() } })); }} bluffTags={bluffNow} onBluffRefresh={loadBluffTags} />;
    else if (tab === "fanta") body = <FantaScreen standings={shownStandings} squad={squad} setSquad={setSquad} base={squadBase} freeTransfers={freeTransfers} budget={FANTA_BUDGET} stats={fantaStats} race={fantaRace} lock={teamLockInfo} weekends={fantaLive} isPremium={isPremium} onPremium={() => setPremiumOpen(true)} onToast={showToast} bonus={bonus} leagues={leagueRows} seasonPts={fantaSeason.total} realWeek={fantaRace ? fantaSeason.rounds.find(r => r.round === fantaRace.round) || null : null} meAid={account ? account.aid : null} onCreateLeague={createLeague} onJoinLeague={joinLeague} onLeaveLeague={leaveLeague} onRenameLeague={renameLeague} needAccount={needAccount} predictions={predictions} predAnswers={predAnswers} predLockOf={predLockOf} onAnswerPrediction={answerPrediction} />;
  }

  const showTopHeader = view === "tab";
  const showBottomNav = view === "tab";
  // Schede montate (25/10): quella attiva e, durante il passaggio, quella che esce (inert: non si tocca). Sempre
  // nell'ordine della barra, così React non sposta i nodi (lo scroll della scheda resta dov'è).
  const tabPages = () => {
    tabBody.current = { id: tab, body };
    const leave = tabLeave && tabLeave.id !== tab ? tabLeave : null;
    return TAB_IDS.filter(id => id === tab || (leave && id === leave.id)).map(id => (id === tab
      ? <div key={"tab-" + id} ref={tabPageRef} data-tab-page={id} data-tab-enter={tabEnter || undefined} className={tabEnter ? "tab-enter-" + tabEnter : undefined} style={{ height: "100%", "--tab-in": tabEnter && tabIn != null ? tabIn + "px" : undefined }}>{body}</div>
      : <div key={"tab-" + id} data-tab-page={id} data-tab-leave={leave.dir} className="tab-leave" inert="true" aria-hidden="true"
          style={{ "--tab-from": leave.from + "px", "--tab-from-op": leave.op, "--tab-to": leave.to + "px" }}
          onAnimationEnd={e => { if (e.target === e.currentTarget) setTabLeave(l => (l === leave ? null : l)); }}>{leave.body}</div>));
  };

  return shell(
      <div data-bg={pageBg || undefined} style={{ height: "100%", display: "flex", flexDirection: "column", position: "relative", background: pageBg && PAGE_BG[pageBg] ? PAGE_BG[pageBg] : undefined, transition: "background .3s" }}>
        {showTopHeader && <TopHeader trialDays={trialActive ? trialDaysLeft(trial) : 0} isPremium={isPremium} unread={unreadCount} onPremium={() => setPremiumOpen(true)} onBell={() => setView("notifiche")} onProfile={() => setView("profilo")} helmet={helmet} onTrack={isDemoLive(live) || !!sessionNow(realLiveRace, nowMs())} onLogoEgg={() => setEggFound(true)} />}
        {showTopHeader && offline && <div role="status" data-offline="" style={{ margin: "-6px 16px 10px", padding: "8px 12px", borderRadius: 10, background: "rgba(231,179,76,.12)", border: "1px solid rgba(231,179,76,.35)", fontFamily: F_BODY, fontSize: 12, color: C.text, lineHeight: 1.4, flexShrink: 0 }}>{OFFLINE_LINE}</div>}
        <div ref={swipeBoxRef} data-tab-swipe={showBottomNav ? "" : undefined} style={{ flex: 1, minHeight: 0, overflow: "hidden", position: "relative" }}
          onTouchStart={showBottomNav ? e => { const k = e.touches[0]; if (e.touches.length === 1) swipeStart(k.clientX, k.clientY, e.timeStamp, e.target, e.currentTarget); else swipeCancel(); } : undefined}
          onTouchMove={showBottomNav ? e => { const k = e.touches[0]; if (k && e.touches.length === 1) swipeMove(k.clientX, k.clientY); } : undefined}
          onTouchEnd={showBottomNav ? e => { const k = e.changedTouches[0]; if (k) swipeEnd(k.clientX, k.clientY, e.timeStamp, e.currentTarget.clientWidth, false); } : undefined}
          onTouchCancel={swipeCancel}
          onPointerDown={showBottomNav ? e => { if (e.pointerType === "mouse" && e.button === 0) swipeStart(e.clientX, e.clientY, e.timeStamp, e.target, e.currentTarget); } : undefined}
          onPointerMove={showBottomNav ? e => { if (e.pointerType === "mouse" && (e.buttons & 1)) swipeMove(e.clientX, e.clientY); } : undefined}
          onPointerUp={showBottomNav ? e => { if (e.pointerType === "mouse") swipeEnd(e.clientX, e.clientY, e.timeStamp, e.currentTarget.clientWidth, true); } : undefined}
          onClickCapture={e => { if (performance.now() - swipeClick.current < 400) { e.stopPropagation(); e.preventDefault(); } }}>
          <ChatShare.Provider value={chatShareCtx}>{showBottomNav ? tabPages() : <div key="view" style={{ height: "100%" }}>{body}</div>}</ChatShare.Provider>
          {/* Una per scheda accanto (key): cambiata scheda non resta il nome di quella di prima mentre svanisce. */}
          {showBottomNav && <TabPeek key={"peek-left-" + tab} side="left" tab={TABS[TAB_IDS.indexOf(tab) - 1]} peekRef={el => { peekRef.current.left = el; }} />}
          {showBottomNav && <TabPeek key={"peek-right-" + tab} side="right" tab={TABS[TAB_IDS.indexOf(tab) + 1]} peekRef={el => { peekRef.current.right = el; }} />}
        </div>
        {/* 29/10: lo swipe cambia scheda anche partendo dalla barra in basso. */}
        {showBottomNav && <div data-nav-swipe="" style={{ flexShrink: 0 }}
          onTouchStart={showBottomNav ? e => { const k = e.touches[0]; if (e.touches.length === 1) swipeStart(k.clientX, k.clientY, e.timeStamp, e.target, e.currentTarget); else swipeCancel(); } : undefined}
          onTouchMove={showBottomNav ? e => { const k = e.touches[0]; if (k && e.touches.length === 1) swipeMove(k.clientX, k.clientY); } : undefined}
          onTouchEnd={showBottomNav ? e => { const k = e.changedTouches[0]; if (k) swipeEnd(k.clientX, k.clientY, e.timeStamp, e.currentTarget.clientWidth, false); } : undefined}
          onTouchCancel={swipeCancel}
          onPointerDown={showBottomNav ? e => { if (e.pointerType === "mouse" && e.button === 0) swipeStart(e.clientX, e.clientY, e.timeStamp, e.target, e.currentTarget); } : undefined}
          onPointerMove={showBottomNav ? e => { if (e.pointerType === "mouse" && (e.buttons & 1)) swipeMove(e.clientX, e.clientY); } : undefined}
          onPointerUp={showBottomNav ? e => { if (e.pointerType === "mouse") swipeEnd(e.clientX, e.clientY, e.timeStamp, e.currentTarget.clientWidth, true); } : undefined}
          onClickCapture={e => { if (performance.now() - swipeClick.current < 400) { e.stopPropagation(); e.preventDefault(); } }}>
          <BottomNav active={tab} pillRef={navPillRef} onChange={t => switchTab(t)} /></div>}
        {showBottomNav && adH > 0 && <div data-ad-space="" aria-hidden="true" style={{ height: adH + AD_GAP, flexShrink: 0 }} />}
        {premiumOpen && <PremiumModal onClose={closePremium} isPremium={isPremium} plan={plan} setPlan={setPlan} onSubscribe={doSubscribe} subscribing={subscribing} subscribed={subscribed} trialUsed={!!trial} onTrial={doTrial} trial={trial} onAdPro={Ads.canReward() ? watchAdPro : null} adBusy={adBusy} />}
        {selectedDriver && <DriverDetailModal driver={selectedDriver} lastRace={lastRace} races={races} onClose={() => setSelectedDriver(null)} />}
        {liveTrackOpen && <LiveMapView race={live ? races.find(r => r.id === live.raceId) : weekendRace(races)} live={live} st={liveSt} onClose={() => setLiveTrackOpen(false)} />}
        {ssOpen && <SecondScreen chat={chats.find(c => c.id === "generale")} blocked={blocked} onChatSend={guest ? () => needLogin("Per scrivere in chat serve un account.") : t => sendMessage("generale", t)} race={live ? races.find(r => r.id === live.raceId) : weekendRace(races)} live={live} st={liveSt} standings={shownStandings} layout={ssLayout} setLayout={setSsLayout} prefs={ssPrefs} setPrefs={setSsPrefs} vote={live ? votesNow.dotd[live.raceId] || {} : {}} onVote={(k, id) => live && voteDotd(live.raceId, k, id)} notice={notice} onCloseNotice={nextNotice} onClose={() => setSsOpen(false)} />}
        {lapList && live && liveSt && <LapTimesModal live={live} st={liveSt} carId={lapList} onOpenLap={n => setTelemetry({ carId: lapList, lapNo: n, sector: 0 })} onClose={() => setLapList(null)} />}
        {telemetry && live && liveSt && <TelemetryModal live={live} st={liveSt} carId={telemetry.carId} lapNo={telemetry.lapNo} sector={telemetry.sector} onClose={() => setTelemetry(null)} />}
        {infoModal && <InfoModal title={infoModal.title} body={infoModal.body} extra={infoModal.credits ? <CommonsCredits /> : null} onClose={() => setInfoModal(null)} />}
        {helmetOpen && <HelmetEditor helmet={helmet} onSave={v => { if (!userDataWait()) setHelmet(v); }} onClose={() => setHelmetOpen(false)} />}
        {themeOpen && <ThemeSheet theme={theme} favTeam={favTeam} onPick={v => { if (!userDataWait()) setTheme(v); }} onClose={() => setThemeOpen(false)} />}
        {picker === "team" && <PickerModal title="SCUDERIA DEL CUORE" selected={favTeam} onPick={v => { if (!userDataWait()) setFavTeam(v); }} onClose={() => setPicker(null)}
          options={TEAMS.map(t => ({ id: t.id, label: t.name, color: t.color, sub: t.tag }))} />}
        {picker === "driver" && <PickerModal title="PILOTA DEL CUORE" selected={favDriver} onPick={v => { if (!userDataWait()) setFavDriver(v); }} onClose={() => setPicker(null)}
          options={DRIVERS.map(d => ({ id: d.id, label: d.full, color: d.color, sub: d.team, driver: d }))} />}
        <ChatShare.Provider value={chatShareCtx}>{shareArticle && view === "article" && <ShareSheet article={shareArticle} locked={!!shareArticle.premium && !isPremium} handle={ig.handle} onClose={() => setShareId(null)} onToast={showToast} />}</ChatShare.Provider>
        {linkShare && <ChatRoomPicker onPick={id => { setPendingLink(linkShare); setLinkShare(null); openChat(id); }} onClose={() => setLinkShare(null)} />}
        {termsAccepted && termsOpen && <TermsSheet review onClose={() => setTermsOpen(false)} />}
        {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} onSend={sendFeedback} />}
        {toast && <div className="toast" style={showBottomNav && adH > 0 ? { bottom: 104 + adH + AD_GAP } : undefined}>{toast}</div>}
        {notice && !ssOpen && <LiveNotice n={notice} onClose={nextNotice} />}
        {trophyNotice && <TrophyNotice n={trophyNotice} />}
      </div>
  );
}

export default App;
// Usati dalle prove della 2.0 dentro la pagina (nell'anteprima erano variabili globali).
export { weekendWeather, RACES_INIT, premiumOffer, of1NeedsReload };
