// Dati veri della stagione 2026 usati dall'app e dai servizi (spostati da src/App.jsx, Task 5):
// scuderie, piloti (bio e statistiche), calendario e stati delle gare.

// Scuderie 2026 (colori indicativi, usati per pallini, hashtag e sfondi)
const TEAMS = [
  { id: "mclaren", name: "McLaren", tag: "#McLaren", color: "#FF8000" },
  { id: "redbull", name: "Red Bull Racing", tag: "#RedBull", color: "#3671C6" },
  { id: "mercedes", name: "Mercedes", tag: "#Mercedes", color: "#27F4D2" },
  { id: "ferrari", name: "Ferrari", tag: "#Ferrari", color: "#E8002D" },
  { id: "williams", name: "Williams", tag: "#Williams", color: "#1868DB" },
  { id: "racingbulls", name: "Racing Bulls", tag: "#RacingBulls", color: "#6692FF" },
  { id: "astonmartin", name: "Aston Martin", tag: "#AstonMartin", color: "#229971" },
  { id: "haas", name: "Haas", tag: "#Haas", color: "#9AA0A6" },
  { id: "audi", name: "Audi", tag: "#Audi", color: "#A3162E" },
  { id: "alpine", name: "Alpine", tag: "#Alpine", color: "#FF87BC" },
  { id: "cadillac", name: "Cadillac", tag: "#Cadillac", color: "#E6E6E6" },
];

// Ordine di gara e distacchi = demo. Bio e statistiche carriera = dati reali (Wikipedia / f1pedia, settembre 2026).
const DRIVER_DATA = [
  ["norris", "L. Norris", "Lando Norris", "mclaren", "Bristol, 13 novembre 1999", "Regno Unito", 13, 48, 1,
    "Pilota britannico nato a Bristol. Debutta in Formula 1 nel 2019 con la McLaren, la squadra con cui ha sempre corso. Nel 2025 conquista il suo primo titolo mondiale piloti, davanti al compagno Oscar Piastri e a Max Verstappen."],
  ["verstappen", "M. Verstappen", "Max Verstappen", "redbull", "Hasselt, 30 settembre 1997", "Paesi Bassi", 71, 131, 4,
    "Pilota olandese nato in Belgio. Debutta nel 2015 con la Toro Rosso a soli 17 anni e passa alla Red Bull nel 2016. Campione del mondo per quattro stagioni consecutive, dal 2021 al 2024, detiene il record di vittorie in una singola stagione (19)."],
  ["antonelli", "K. Antonelli", "Andrea Kimi Antonelli", "mercedes", "Bologna, 25 agosto 2006", "Italia", 8, 15, 0,
    "Pilota italiano nato a Bologna. Debutta nel 2025 con la Mercedes, prendendo il posto di Lewis Hamilton. Nel 2026 diventa il più giovane poleman della storia della F1 e, vincendo in Cina, il primo italiano a vincere un Gran Premio dopo vent'anni."],
  ["hadjar", "I. Hadjar", "Isack Hadjar", "redbull", "Parigi, 28 settembre 2004", "Francia", 0, 2, 0,
    "Isack Hadjar (Parigi, 28 settembre 2004) è un pilota automobilistico francese di origini algerine. Dopo essersi messo in mostra nei kart e nelle formule minori, si è laureato vicecampione di Formula 2 nel 2024. Ha fatto il suo debutto ufficiale in Formula 1 nel 2025 con il team Racing Bulls, conquistando i suoi primi punti e il suo primo podio da rookie. Le sue ottime prestazioni gli hanno garantito la promozione nel team principale Oracle Red Bull Racing per la stagione 2026, dove corre al fianco del pluricampione del mondo Max Verstappen."],
  ["leclerc", "C. Leclerc", "Charles Leclerc", "ferrari", "Monte Carlo, 16 ottobre 1997", "Monaco", 9, 54, 0,
    "Pilota monegasco. Debutta nel 2018 con la Sauber e dal 2019 è pilota Ferrari. Vicecampione del mondo nel 2022, nel 2024 vince il Gran Premio di casa a Monaco. Detiene il record di pole position per un pilota senza titolo mondiale."],
  ["piastri", "O. Piastri", "Oscar Piastri", "mclaren", "Melbourne, 6 aprile 2001", "Australia", 9, 28, 0,
    "Pilota australiano nato a Melbourne. Debutta nel 2023 con la McLaren e ottiene la prima vittoria al GP d'Ungheria 2024. Nel 2025 chiude terzo nel mondiale con sette vittorie, record per un pilota australiano in una stagione."],
  ["russell", "G. Russell", "George Russell", "mercedes", "King's Lynn, 15 febbraio 1998", "Regno Unito", 7, 30, 0,
    "Pilota britannico. Debutta nel 2019 con la Williams e dal 2022 corre per la Mercedes. La sua prima vittoria arriva al GP di San Paolo 2022; nel 2025 chiude quarto nel mondiale."],
  ["hamilton", "L. Hamilton", "Lewis Hamilton", "ferrari", "Stevenage, 7 gennaio 1985", "Regno Unito", 106, 207, 7,
    "Pilota britannico. Debutta nel 2007 con la McLaren e vince il primo mondiale nel 2008; con la Mercedes ne conquista altri sei. Sette volte campione del mondo, record condiviso con Michael Schumacher, e primatista di vittorie, pole e podi. Dal 2025 corre per la Ferrari."],
  ["sainz", "C. Sainz", "Carlos Sainz", "williams", "Madrid, 1 settembre 1994", "Spagna", 4, 29, 0,
    "Pilota spagnolo, figlio dell'omonimo campione di rally. Debutta nel 2015 con la Toro Rosso, poi corre per Renault, McLaren e Ferrari prima di passare alla Williams nel 2025. È il secondo pilota della storia, dopo Alain Prost, a salire sul podio con Ferrari, McLaren e Williams."],
  ["albon", "A. Albon", "Alexander Albon", "williams", "Londra, 23 marzo 1996", "Thailandia", 0, 2, 0,
    "Nato a Londra, corre con licenza thailandese. Debutta nel 2019 con la Toro Rosso e passa in Red Bull a metà stagione. Nel 2020 diventa il primo pilota thailandese a salire sul podio in F1. Dal 2022 è il punto di riferimento della Williams."],
  ["alonso", "F. Alonso", "Fernando Alonso", "astonmartin", "Oviedo, 29 luglio 1981", "Spagna", 32, 106, 2,
    "Pilota spagnolo. Debutta nel 2001 con la Minardi e vince due mondiali consecutivi con la Renault nel 2005 e 2006. È l'unico campione del mondo di F1 ad aver vinto anche il Mondiale Endurance, con due successi alla 24 Ore di Le Mans. Dal 2023 corre per l'Aston Martin."],
  ["gasly", "P. Gasly", "Pierre Gasly", "alpine", "Rouen, 7 febbraio 1996", "Francia", 1, 5, 0,
    "Pilota francese. Debutta nel 2017 con la Toro Rosso e nel 2020 vince il GP d'Italia a Monza con l'AlphaTauri. Dal 2023 corre per l'Alpine, con cui nel 2026 conquista la sua prima pole position, proprio a Monza."],
  ["lawson", "L. Lawson", "Liam Lawson", "racingbulls", "Hastings, 11 febbraio 2002", "Nuova Zelanda", 0, 0, 0,
    "Pilota neozelandese. Debutta nel 2023 con l'AlphaTauri come sostituto e, dopo le prime gare del 2025 in Red Bull, torna alla squadra junior. Nel 2026 corre per la Racing Bulls."],
  ["bearman", "O. Bearman", "Oliver Bearman", "haas", "Havering, 8 maggio 2005", "Regno Unito", 0, 0, 0,
    "Pilota britannico. Debutta nel 2024 in Arabia Saudita con la Ferrari, sostituendo Carlos Sainz: a 18 anni è il più giovane pilota della storia del Cavallino. Dal 2025 è titolare alla Haas."],
  ["hulkenberg", "N. Hülkenberg", "Nico Hülkenberg", "audi", "Emmerich am Rhein, 19 agosto 1987", "Germania", 0, 1, 0,
    "Pilota tedesco. Debutta nel 2010 con la Williams. Dopo il record di 239 gare senza podio, conquista il suo primo terzo posto al GP di Gran Bretagna 2025 con la Sauber, sotto la pioggia. Nel 2026 corre per l'Audi."],
  ["bortoleto", "G. Bortoleto", "Gabriel Bortoleto", "audi", "Osasco, 14 ottobre 2004", "Brasile", 0, 0, 0,
    "Pilota brasiliano. Campione di Formula 3 nel 2023 e di Formula 2 nel 2024, dove è stato il primo a vincere partendo ultimo in griglia. Debutta in F1 nel 2025 con la Sauber e dal 2026 corre per l'Audi."],
  ["ocon", "E. Ocon", "Esteban Ocon", "haas", "Évreux, 17 settembre 1996", "Francia", 1, 4, 0,
    "Pilota francese. Debutta nel 2016 con la Manor e ottiene la sua unica vittoria al GP d'Ungheria 2021 con l'Alpine. Dal 2025 corre per la Haas."],
  ["lindblad", "A. Lindblad", "Arvid Lindblad", "racingbulls", "Virginia Water, 8 agosto 2007", "Regno Unito", 0, 0, 0,
    "Pilota britannico e unico debuttante della stagione 2026, con la Racing Bulls. A 18 anni è il quarto pilota più giovane della storia della F1 e il più giovane britannico di sempre."],
  ["colapinto", "F. Colapinto", "Franco Colapinto", "alpine", "Pilar, 27 maggio 2003", "Argentina", 0, 0, 0,
    "Pilota argentino. Debutta a Monza nel 2024 con la Williams, primo argentino in F1 dopo oltre vent'anni. Dal 2025 corre per l'Alpine."],
  ["stroll", "L. Stroll", "Lance Stroll", "astonmartin", "Montréal, 29 ottobre 1998", "Canada", 0, 3, 0,
    "Pilota canadese. Debutta nel 2017 con la Williams e sale sul podio già al primo anno. Conquista la sua unica pole position in Turchia nel 2020 e dal 2019 corre per la squadra di famiglia, oggi Aston Martin."],
  ["bottas", "V. Bottas", "Valtteri Bottas", "cadillac", "Nastola, 28 agosto 1989", "Finlandia", 10, 67, 0,
    "Pilota finlandese. Debutta nel 2013 con la Williams e dal 2017 al 2021 è compagno di Hamilton in Mercedes, con due secondi posti nel mondiale (2019 e 2020). Nel 2026 torna in griglia con la nuova Cadillac."],
  ["perez", "S. Pérez", "Sergio Pérez", "cadillac", "Guadalajara, 26 gennaio 1990", "Messico", 6, 39, 0,
    "Pilota messicano. Debutta nel 2011 con la Sauber e vince la prima gara al GP di Sakhir 2020, dopo 190 partenze: un record. Vicecampione del mondo con la Red Bull nel 2023, nel 2026 torna con la Cadillac."],
];

// Calendario 2026 reale (fonti: Wikipedia, formula1.com). Lo stato lo imposta l'admin.
// Il GP del Bahrain, annullato ad aprile, si corre a Sepang come round 16 (2-4 ottobre 2026).
// Tracciato di ogni gara, nello stesso ordine del calendario.
const CIRCUIT_IDS = ["au-1953", "cn-2004", "jp-1962", "us-2022", "ca-1978", "mc-1929", "es-1991", "at-1969", "gb-1948", "be-1925", "hu-1986",
  "nl-1948", "it-1922", "es-2026", "az-2016", "my-1999", "sg-2008", "us-2012", "mx-1962", "br-1940", "us-2023", "qa-2004", "ae-2009"];
const CALENDAR = [
  ["GP d'Australia", "Albert Park, Melbourne", "Australia", "2026-03-08"],
  ["GP di Cina", "Shanghai International Circuit", "Cina", "2026-03-15"],
  ["GP del Giappone", "Suzuka", "Giappone", "2026-03-29"],
  ["GP di Miami", "Miami International Autodrome", "USA", "2026-05-03"],
  ["GP del Canada", "Circuit Gilles Villeneuve, Montréal", "Canada", "2026-05-24"],
  ["GP di Monaco", "Circuit de Monaco", "Monaco", "2026-06-07"],
  ["GP di Barcellona-Catalogna", "Circuit de Barcelona-Catalunya", "Spagna", "2026-06-14"],
  ["GP d'Austria", "Red Bull Ring, Spielberg", "Austria", "2026-06-28"],
  ["GP di Gran Bretagna", "Silverstone", "Regno Unito", "2026-07-05"],
  ["GP del Belgio", "Spa-Francorchamps", "Belgio", "2026-07-19"],
  ["GP d'Ungheria", "Hungaroring", "Ungheria", "2026-07-26"],
  ["GP d'Olanda", "Zandvoort", "Paesi Bassi", "2026-08-23"],
  ["GP d'Italia", "Monza", "Italia", "2026-09-06"],
  ["GP di Spagna", "Madring, Madrid", "Spagna", "2026-09-13"],
  ["GP dell'Azerbaigian", "Baku City Circuit", "Azerbaigian", "2026-09-26"],
  ["GP del Bahrain in Malesia", "Sepang International Circuit", "Malesia", "2026-10-04"],
  ["GP di Singapore", "Marina Bay", "Singapore", "2026-10-11"],
  ["GP degli Stati Uniti", "Circuit of the Americas, Austin", "USA", "2026-10-25"],
  ["GP di Città del Messico", "Autódromo Hermanos Rodríguez", "Messico", "2026-11-01"],
  ["GP di San Paolo", "Interlagos", "Brasile", "2026-11-08"],
  ["GP di Las Vegas", "Las Vegas Strip Circuit", "USA", "2026-11-21"],
  ["GP del Qatar", "Lusail", "Qatar", "2026-11-29"],
  ["GP di Abu Dhabi", "Yas Marina", "Emirati Arabi Uniti", "2026-12-06"],
];
const RACE_STATUSES = ["IN ARRIVO", "LIVE", "CONCLUSA"];

module.exports = { TEAMS, DRIVER_DATA, CIRCUIT_IDS, CALENDAR, RACE_STATUSES };
