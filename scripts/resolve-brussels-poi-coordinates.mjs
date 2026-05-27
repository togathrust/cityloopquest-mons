/**
 * Resolves Brussels POI candidate coordinates with OpenStreetMap Nominatim.
 * Usage: node scripts/resolve-brussels-poi-coordinates.mjs
 */
const center = { lat: 50.8465573, lng: 4.351697 };

const candidates = [
  ["brussels-grand-place", "Grand-Place, Brussels, Belgium"],
  ["brussels-hotel-de-ville", "Brussels Town Hall, Grand Place, Brussels, Belgium"],
  ["brussels-maison-du-roi", "Maison du Roi, Grand Place, Brussels, Belgium"],
  ["brussels-galeries-royales", "Galeries Royales Saint-Hubert, Brussels, Belgium"],
  ["brussels-manneken-pis", "Manneken Pis, Brussels, Belgium"],
  ["brussels-jeanneke-pis", "Jeanneke Pis, Brussels, Belgium"],
  ["brussels-cathedral", "Cathedral of St. Michael and St. Gudula, Brussels, Belgium"],
  ["brussels-mont-des-arts", "Mont des Arts, Brussels, Belgium"],
  ["brussels-royal-palace", "Royal Palace of Brussels, Belgium"],
  ["brussels-park", "Brussels Park, Brussels, Belgium"],
  ["brussels-bozar", "Bozar, Brussels, Belgium"],
  ["brussels-magritte-museum", "Magritte Museum, Brussels, Belgium"],
  ["brussels-fine-arts", "Royal Museums of Fine Arts of Belgium, Brussels"],
  ["brussels-mim", "Musical Instruments Museum, Brussels, Belgium"],
  ["brussels-palais-justice", "Palace of Justice, Brussels, Belgium"],
  ["brussels-sablon-church", "Church of Our Blessed Lady of the Sablon, Brussels, Belgium"],
  ["brussels-grand-sablon", "Place du Grand Sablon, Brussels, Belgium"],
  ["brussels-halle-gate", "Halle Gate, Brussels, Belgium"],
  ["brussels-comics-center", "Belgian Comic Strip Center, Brussels, Belgium"],
  ["brussels-choco-story", "Choco-Story Brussels, Belgium"],
  ["brussels-parlamentarium", "Parlamentarium, Brussels, Belgium"],
  ["brussels-house-european-history", "House of European History, Brussels, Belgium"],
  ["brussels-cinquantenaire", "Parc du Cinquantenaire, Brussels, Belgium"],
  ["brussels-autoworld", "Autoworld, Brussels, Belgium"],
  ["brussels-art-history-museum", "Art & History Museum, Brussels, Belgium"],
  ["brussels-army-museum", "Royal Museum of the Armed Forces and Military History, Brussels, Belgium"],
  ["brussels-atomium", "Atomium, Brussels, Belgium"],
  ["brussels-mini-europe", "Mini-Europe, Brussels, Belgium"],
  ["brussels-design-museum", "Design Museum Brussels, Belgium"],
  ["brussels-royal-greenhouses", "Royal Greenhouses of Laeken, Brussels, Belgium"],
  ["brussels-train-world", "Train World, Brussels, Belgium"],
  ["brussels-horta-museum", "Horta Museum, Brussels, Belgium"],
  ["brussels-bois-cambre", "Bois de la Cambre, Brussels, Belgium"],
  ["brussels-sonian-forest", "Sonian Forest, Brussels, Belgium"],
  ["brussels-abbaye-cambre", "Abbaye de la Cambre, Brussels, Belgium"],
  ["brussels-van-buuren", "Van Buuren Museum, Brussels, Belgium"],
  ["brussels-koekelberg-basilica", "National Basilica of the Sacred Heart, Koekelberg, Belgium"],
  ["brussels-tour-taxis", "Tour & Taxis, Brussels, Belgium"],
  ["tervuren-africamuseum", "AfricaMuseum, Tervuren, Belgium"],
  ["la-hulpe-domaine-solvay", "Domaine régional Solvay, La Hulpe, Belgium"],
  ["la-hulpe-fondation-folon", "Fondation Folon, La Hulpe, Belgium"],
  ["waterloo-butte-lion", "Lion's Mound, Braine-l'Alleud, Belgium"],
  ["waterloo-memorial-1815", "Memorial 1815, Waterloo, Belgium"],
  ["waterloo-wellington-museum", "Wellington Museum, Waterloo, Belgium"],
  ["gaasbeek-castle", "Gaasbeek Castle, Lennik, Belgium"],
  ["beersel-castle", "Beersel Castle, Belgium"],
  ["halle-basilica", "Basilica of Saint Martin, Halle, Belgium"],
  ["villers-abbey", "Villers Abbey, Villers-la-Ville, Belgium"],
  ["nivelles-collegiate", "Collegiate Church of Saint Gertrude, Nivelles, Belgium"],
  ["leuven-town-hall", "Leuven Town Hall, Leuven, Belgium"],
  ["leuven-groot-begijnhof", "Groot Begijnhof Leuven, Belgium"],
  ["leuven-university-library", "University Library Leuven, Belgium"],
  ["mechelen-st-rumbold", "St. Rumbold's Cathedral, Mechelen, Belgium"],
  ["mechelen-grote-markt", "Grote Markt Mechelen, Belgium"],
  ["mechelen-kazerne-dossin", "Kazerne Dossin, Mechelen, Belgium"],
  ["mechelen-planckendael", "Planckendael, Mechelen, Belgium"],
  ["antwerp-central-station", "Antwerp Central Station, Belgium"],
  ["antwerp-cathedral", "Cathedral of Our Lady, Antwerp, Belgium"],
  ["antwerp-mas", "Museum aan de Stroom, Antwerp, Belgium"],
  ["antwerp-plantin-moretus", "Plantin-Moretus Museum, Antwerp, Belgium"],
];

function haversineKm(a, b) {
  const toRad = (n) => (n * Math.PI) / 180;
  const r = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(s));
}

async function resolve(id, query) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("q", query);
  const res = await fetch(url, {
    headers: {
      "User-Agent": "CityLoopQuest Brussels coordinate validation (local development)",
      "Accept-Language": "en",
    },
  });
  if (!res.ok) throw new Error(`${id}: Nominatim HTTP ${res.status}`);
  const rows = await res.json();
  const row = rows[0];
  if (!row) return { id, query, error: "not_found" };
  const lat = Number(row.lat);
  const lng = Number(row.lon);
  return {
    id,
    query,
    lat,
    lng,
    distanceKm: Number(haversineKm(center, { lat, lng }).toFixed(2)),
    type: `${row.category}/${row.type}`,
    osm: `${row.osm_type}/${row.osm_id}`,
    displayName: row.display_name,
  };
}

const out = [];
for (const [id, query] of candidates) {
  const result = await resolve(id, query);
  out.push(result);
  console.log(JSON.stringify(result));
  await new Promise((resolve) => setTimeout(resolve, 1100));
}

console.error(`Resolved ${out.length} candidate(s).`);
