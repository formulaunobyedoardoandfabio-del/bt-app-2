// Foto candidate da Wikimedia Commons (Tappa 3, G30), per ogni pilota (il viso, la più recente), monoposto (di lato,
// la più recente) e logo delle scuderie: fino a 3 file per voce, la prima è quella di serie finché l'admin non ne
// sceglie un'altra (Pannello Admin → FOTO, shared/bt-commons-photos). L'app mostra una foto solo se Commons dice che
// la licenza è libera (CC0, pubblico dominio, CC BY, CC BY-SA): src/services/commons.js.
// I loghi sono marchi delle scuderie (decisione del 29/9: non nella versione per il Play Store): SHOW_TEAM_LOGOS va
// messo a false prima della versione per il Play Store.
// Elenco del 18/10/2026 da una ricerca sui titoli dei file di Commons (le pagine non si potevano aprire da qui):
// licenza, autore e immagine li controlla l'app. Mancano: Lindblad (nessuna foto del viso, solo in pista col casco),
// le monoposto di Williams e Audi, il logo della Racing Bulls (nessun file sicuro): si possono aggiungere dal
// Pannello Admin incollando il link del file di Commons.
const COMMONS_CANDIDATES = {
  drivers: {
    norris: ["File:Lando Norris at the Melbourne Walk during the 2026 Australian Grand Prix (028A8561).jpg", "File:2024-08-25 Motorsport, Formel 1, Großer Preis der Niederlande 2024 STP 4016 by Stepro (cropped).jpg", "File:Lando Norris Formula 1 Driver (49379469418) (cropped).jpg"],
    verstappen: ["File:Max Verstappen at the Red Bull Fan Zone – Crown Riverwalk, Melbourne (028A7657).jpg", "File:2024-08-25 Motorsport, Formel 1, Großer Preis der Niederlande 2024 STP 3973 by Stepro (medium crop).jpg"],
    antonelli: ["File:Kimi Antonelli at the Melbourne Walk during the 2026 Australian Grand Prix (028A7923) cropped.jpg", "File:Kimi Antonelli at the 2025 US Grand Prix in Austin, TX.jpg", "File:2025 Imola GP Kimi Antonelli.jpg"],
    hadjar: ["File:Isack Hadjar at the Melbourne Walk during the 2026 Australian Grand Prix (028A8753) cropped.jpg", "File:Isack Hadjar 2022 (cropped).JPG"],
    leclerc: ["File:2024-08-25 Motorsport, Formel 1, Großer Preis der Niederlande 2024 STP 3978 by Stepro (cropped2).jpg", "File:Charles-Leclerc (cropped).jpg", "File:Charles Leclerc and Alexandra Leclerc at the 2026 Cannes Film Festival.jpg"],
    piastri: ["File:Oscar Piastri at the Melbourne Walk during the 2026 Australian Grand Prix (028A8596).jpg", "File:Oscar Piastri 2025 (cropped).jpg", "File:Oscar Piastri Spa (cropped).jpg"],
    russell: ["File:KingsLeonSilverstne040724 (28 of 112) (53838006028) (cropped).jpg", "File:George Russell racing driver cropd.png"],
    hamilton: ["File:2025 Japan GP - Ferrari - Lewis Hamilton - Fanzone Stage (cropped).jpg", "File:Prime Minister Keir Starmer meets Sir Lewis Hamilton (54566928382) (cropped).jpg", "File:Lewis Hamilton portrait.jpg"],
    sainz: ["File:Carlos Sainz at the 83rd Venice FILM festival-9 (cropped).jpg", "File:Carlos Sainz Jr. during Hungarian Formula 1 Grand Prix.jpg", "File:Carlos Sainz jr.JPG"],
    albon: ["File:Alex Albon at the Melbourne Walk during the 2026 Australian Grand Prix (028A8626) (cropped).jpg", "File:Alex Albon at the Melbourne Walk during the 2026 Australian Grand Prix (028A8626).jpg", "File:Alex Albon (cropped).jpg"],
    alonso: ["File:Fernando Alonso racing at the 2024 F1 in Schools World Finals (cropped).jpg", "File:Fernando Alonso 070615.jpg"],
    gasly: ["File:Pierre Gasly 2024 Chinese GP.jpg", "File:Pierre Gasly - 2021 US GP driver parade.jpg", "File:Pierre Gasly, Alpha Tauri F1 Team, British GP, Silverstone 2021 (51349540793).jpg"],
    lawson: ["File:Liam Lawson at the Red Bull Fan Zone – Crown Riverwalk, Melbourne (028A7792) (cropped).jpg", "File:Lawson headshot.jpg", "File:Liam Lawson Austria 2022.jpg"],
    bearman: ["File:2025 Japan GP - Haas - Oliver Bearman - Thursday (cropped).jpg", "File:Oliver-bearman-silverstone-2024-showing-eurospares-sponsorship.jpg"],
    hulkenberg: ["File:2019 Formula One tests Barcelona, Hulkenberg (40287128313) (headshot).jpg", "File:2017 United States Grand Prix - Nico Hülkenberg 01.jpg", "File:Nico Hulkenberg 2017 Malaysia.jpg"],
    bortoleto: ["File:Gabriel Bortoleto at the Melbourne Walk during the 2026 Australian Grand Prix (028A8581) cropped.jpg", "File:G. Bortoleto 17 Sep 2024.png", "File:2024-07-28 022 Spa, Formel 2 Hauptrennen; Gabriel Bortoleto (53891366585).jpg"],
    ocon: ["File:Esteban Ocon 2024 Suzuka (cropped).jpg", "File:FIA F1 Austria 2022 Drivers Parade (1) (Ocon crop).jpg"],
    colapinto: ["File:Franco Colapinto at the Melbourne Walk during the 2026 Australian Grand Prix (028A8698) cropped.jpg", "File:Franco Colapinto at the Melbourne Walk during the 2026 Australian Grand Prix (028A8697).jpg", "File:Franco Colapinto at the Melbourne Walk during the 2026 Australian Grand Prix (028A8689).jpg"],
    stroll: ["File:2025 Japan GP - Aston Martin - Lance Stroll - Fanzone Stage.jpg", "File:Lance Stroll during Hungarian Formula 1 GP.jpg", "File:Sergey Sirotkin, Lance Stroll, 2018 Italian Grand Prix.jpg"],
    bottas: ["File:Valtteri Bottas at the 2026 Adelaide Motorsport Festival (028A7556).jpg", "File:Valtteri Bottas 2017.jpg", "File:Valtteri Bottas.JPG"],
    perez: ["File:Sergio Pérez 2019 (cropped).jpg"],
  },
  cars: {
    mclaren: ["File:Mclaren MCL40 - Lando Norris approaches Spoon Curve at Suzuka during the 2026 Japanese GP (55195326398).jpg"],
    redbull: ["File:FIA F1 Austria 2026 Nr. 3 Verstappen (1).jpg", "File:Red Bull Racing RB22 of Max Verstappen (028A8078).jpg"],
    mercedes: ["File:FIA F1 Austria 2026 Nr. 12 Antonelli (1).jpg", "File:2026 Chinese GP - Mercedes - George Russell - Qualifying.jpg", "File:Mercedes-AMG F1 W17 E Performance of Andrea Kimi Antonelli (028A8073).jpg"],
    ferrari: ["File:FIA F1 Austria 2026 Nr. 44 Hamilton (1).jpg", "File:2026 Chinese GP - Ferrari - Lewis Hamilton - Qualifying.jpg", "File:2026 Chinese GP - Ferrari - Lewis Hamilton - FP1.jpg"],
    racingbulls: ["File:2026 Chinese GP - Racing Bulls - Arvid Lindblad - Qualifying.jpg", "File:2025 Japan GP - Racing Bulls - Liam Lawson - FP2.jpg"],
    astonmartin: ["File:2025 Japan GP - Aston Martin - Fernando Alonso - FP1.jpg"],
    haas: ["File:FIA F1 Austria 2025 Nr. 87 Bearman.jpg", "File:2025 Japan GP - Haas - Esteban Ocon - FP2.jpg", "File:2025 Japan GP - Haas VF-25 Show Car - 1.jpg"],
    alpine: ["File:2025 Singapore GP - Alpine - Franco Colapinto - FP2.jpg", "File:FIA F1 Austria 2025 Nr. 43 Colapinto.jpg"],
    cadillac: ["File:FIA F1 Austria 2026 Nr. 11 Perez (3).jpg"],
  },
  logos: {
    mclaren: ["File:McLaren logo (2026).svg", "File:Mclaren Logo 2021.svg", "File:McLaren Speedmark.svg"],
    redbull: ["File:Red Bull Racing logo ita.png", "File:Logo of Red bull.svg", "File:F1 Team Icon - Red Bull(2009).svg"],
    mercedes: ["File:Mercedes-AMG Petronas F1 Team logo (2026).svg", "File:Mercedes-AMG Petronas Formula One Team Logo (2026).webp", "File:Mercedes AMG Petronas F1 Logo.svg"],
    ferrari: ["File:Ferrari wordmark.svg", "File:Ferrari wordmark vector HQ.svg", "File:Ferrari wordmark.png"],
    williams: ["File:Williams F1 logo 2026.png", "File:Atlassian Williams F1 Team logo.svg", "File:Atlassian Williams F1 Team horizontal logo.svg"],
    astonmartin: ["File:Aston Martin F1 Team logo 2024.jpg", "File:Aston Martin wordmark.svg"],
    haas: ["File:TGR Haas F1 Team Logo (2026).svg", "File:Haas F1 Team Logo.svg", "File:MoneyGram Haas F1 Team Logo.svg"],
    audi: ["File:Audif1.com logo17.svg", "File:Audif1.com logo17 (cropped).svg", "File:AUDI Logo (2024).svg"],
    alpine: ["File:Alpine F1 Team Logo.svg", "File:Alpine logo.svg", "File:Alpine logo.png"],
    cadillac: ["File:Cadillac Formula 1 Team logo.png", "File:Cadillac textlogo.png", "File:Cadillac Logo 2021.svg"],
  },
};

module.exports = { COMMONS_CANDIDATES, SHOW_TEAM_LOGOS: true };
