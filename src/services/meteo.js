// Previsioni meteo del weekend (24/10): MET Norway (l'istituto meteorologico norvegese, api.met.no), gratis anche con la
// pubblicità citando la fonte (licenza CC BY 4.0 / NLOD 2.0: "Dati di MET Norway"). MET chiede che le app non lo chiamino
// dal telefono ma da un server proprio, con un nome che le identifica e la cache rispettata: lo fa la funzione su Vercel
// api/meteo.js (stesso codice di forma qui sotto). Il telefono chiede a quella al massimo ogni 30 minuti per circuito.
const MET_URL = "https://api.met.no/weatherapi/locationforecast/2.0/compact";
const USER_AGENT = "Sector4/2.0 https://bt-app-2.vercel.app";
const METEO_URL = "https://bt-app-2.vercel.app/api/meteo";
const FRESH_MS = 30 * 60000;

// Coordinate dei circuiti (da Jolpica F1, 4 decimali al massimo come chiede MET).
const CIRCUIT_COORDS = {
  "au-1953": [-37.8497, 144.968], "cn-2004": [31.3389, 121.22], "jp-1962": [34.8431, 136.541], "us-2022": [25.9581, -80.2389],
  "ca-1978": [45.5, -73.5228], "mc-1929": [43.7347, 7.4206], "es-1991": [41.57, 2.2611], "at-1969": [47.2197, 14.7647],
  "gb-1948": [52.0786, -1.0169], "be-1925": [50.4372, 5.9714], "hu-1986": [47.5789, 19.2486], "nl-1948": [52.3888, 4.5409],
  "it-1922": [45.6156, 9.2811], "es-2026": [40.4653, -3.6153], "az-2016": [40.3725, 49.8533], "my-1999": [2.7608, 101.738],
  "sg-2008": [1.2914, 103.864], "us-2012": [30.1328, -97.6411], "mx-1962": [19.4042, -99.0907], "br-1940": [-23.7036, -46.6997],
  "us-2023": [36.1147, -115.173], "qa-2004": [25.49, 51.4542], "ae-2009": [24.4672, 54.6031],
};

const round1 = v => Math.round(v * 10) / 10;
const finite = v => typeof v === "number" && isFinite(v);
// Dalla risposta di MET Norway (compact) alle ore per l'app: { updated, hours: [{ t, step, temp, wind, hum, rain, sym }] }
// con t l'ora UTC, step le ore che copre la voce (1 nei primi 2-3 giorni, poi 6), vento in km/h, pioggia in mm.
function shapeForecast(json) {
  const p = json && json.properties, list = p && Array.isArray(p.timeseries) ? p.timeseries : [];
  const hours = [];
  list.forEach(x => {
    const d = x && x.data, now = d && d.instant && d.instant.details;
    const next = d && (d.next_1_hours || d.next_6_hours), step = d && d.next_1_hours ? 1 : 6;
    if (!x || typeof x.time !== "string" || isNaN(Date.parse(x.time)) || !now || !next || !finite(now.air_temperature)) return;
    const rain = next.details && finite(next.details.precipitation_amount) ? round1(next.details.precipitation_amount) : null;
    hours.push({
      t: x.time, step, temp: round1(now.air_temperature),
      wind: finite(now.wind_speed) ? Math.round(now.wind_speed * 3.6) : null,
      hum: finite(now.relative_humidity) ? Math.round(now.relative_humidity) : null,
      rain, sym: (next.summary && typeof next.summary.symbol_code === "string") ? next.summary.symbol_code : null,
    });
  });
  if (!hours.length) return null;
  return { updated: (p.meta && typeof p.meta.updated_at === "string") ? p.meta.updated_at : null, hours };
}
const validForecast = v => !!(v && Array.isArray(v.hours) && v.hours.length && v.hours.every(h => h && typeof h.t === "string" && finite(h.temp) && (h.step === 1 || h.step === 6)));

// Icone del cielo dell'app (SkyIcon) dai simboli di MET.
function skyOf(sym) {
  if (typeof sym !== "string" || !sym) return null;
  if (/rain|sleet|snow|shower|thunder|drizzle/.test(sym)) return "rain";
  if (/^(cloudy|fog)/.test(sym)) return "cloud";
  if (/^partlycloudy/.test(sym)) return /_night$/.test(sym) ? "cloud-moon" : "cloud-sun";
  if (/^(clearsky|fair)/.test(sym)) return /_night$/.test(sym) ? "moon" : "sun";
  return "cloud";
}

// Previsione per ogni sessione del weekend ({ key, utc }): la voce che copre l'inizio della sessione. Le sessioni finite
// (iniziate da più di un'ora) e quelle fuori dalle previsioni hanno fc null.
function sessionForecast(fc, sessions, now) {
  const hours = fc && Array.isArray(fc.hours) ? fc.hours : [];
  return (Array.isArray(sessions) ? sessions : []).map(s => {
    const at = Date.parse(s && s.utc);
    if (!isFinite(at) || at + 3600000 <= now) return { key: s && s.key, utc: s && s.utc, fc: null };
    const hit = hours.find(h => { const t = Date.parse(h.t); return t <= at && at < t + h.step * 3600000; })
      || (hours[0] && Date.parse(hours[0].t) > at && Date.parse(hours[0].t) - at <= 3600000 ? hours[0] : null);
    return { key: s.key, utc: s.utc, fc: hit || null };
  });
}

function createMeteo({ fetch: f = (...a) => fetch(...a), now = () => Date.now(), store = null, url = METEO_URL } = {}) {
  const inflight = {};
  async function load(circuitId) {
    if (!CIRCUIT_COORDS[circuitId]) return null;
    const key = "meteo-" + circuitId, saved = store ? store.get(key) : null;
    if (saved && validForecast(saved.fc) && now() - saved.at >= 0 && now() - saved.at < FRESH_MS) return saved.fc;
    try {
      const r = await f(url + "?c=" + encodeURIComponent(circuitId), { headers: { Accept: "application/json" } });
      if (!r || !r.ok) throw new Error("meteo: HTTP " + (r ? r.status : "?"));
      const body = await r.json();
      const fc = { updated: body && typeof body.updated === "string" ? body.updated : null, hours: body && body.hours };
      if (!validForecast(fc)) throw new Error("meteo: risposta non valida");
      if (store) store.set(key, { at: now(), fc });
      return fc;
    } catch (e) {
      return saved && validForecast(saved.fc) ? saved.fc : null;   // senza rete: l'ultima letta, se c'è
    }
  }
  const forecast = circuitId => (inflight[circuitId] = inflight[circuitId] || load(circuitId).finally(() => { delete inflight[circuitId]; }));
  return { forecast };
}

module.exports = { createMeteo, shapeForecast, sessionForecast, skyOf, CIRCUIT_COORDS, MET_URL, USER_AGENT, METEO_URL };
