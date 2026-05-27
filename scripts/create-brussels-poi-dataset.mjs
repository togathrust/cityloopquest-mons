/**
 * Creates the Brussels POI experiment dataset in the same schema as Mons.
 * Usage: node scripts/create-brussels-poi-dataset.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outPath = path.join(root, "data", "pois_bruxelles_experiment.json");
const langs = ["fr", "nl", "en", "de", "it", "es", "pl", "ar", "cn", "ja"];
const center = {
  name: "Grand-Place de Bruxelles",
  lat: 50.8467139,
  lng: 4.3525151,
  coordinateSystem: "WGS84 decimal degrees",
};

const categoryLabels = {
  historic_square: {
    fr: "place historique",
    nl: "historisch plein",
    en: "historic square",
    de: "historischer Platz",
    it: "piazza storica",
    es: "plaza histórica",
    pl: "historyczny plac",
    ar: "ساحة تاريخية",
    cn: "历史广场",
    ja: "歴史的広場",
  },
  monument: {
    fr: "monument",
    nl: "monument",
    en: "monument",
    de: "Denkmal",
    it: "monumento",
    es: "monumento",
    pl: "zabytek",
    ar: "معلم",
    cn: "纪念性建筑 / 地标",
    ja: "モニュメント／ランドマーク",
  },
  museum: {
    fr: "musée / centre d’interprétation",
    nl: "museum / interpretatiecentrum",
    en: "museum / interpretation centre",
    de: "Museum / Interpretationszentrum",
    it: "museo / centro d’interpretazione",
    es: "museo / centro de interpretación",
    pl: "muzeum / centrum interpretacji",
    ar: "متحف / مركز تفسير",
    cn: "博物馆 / 解说中心",
    ja: "博物館／解説センター",
  },
  religious: {
    fr: "patrimoine religieux",
    nl: "religieus erfgoed",
    en: "religious heritage",
    de: "religiöses Erbe",
    it: "patrimonio religioso",
    es: "patrimonio religioso",
    pl: "dziedzictwo religijne",
    ar: "تراث ديني",
    cn: "宗教遗产",
    ja: "宗教遺産",
  },
  park: {
    fr: "site naturel / parc",
    nl: "natuurgebied / park",
    en: "natural site / park",
    de: "Naturort / Park",
    it: "sito naturale / parco",
    es: "sitio natural / parque",
    pl: "teren naturalny / park",
    ar: "موقع طبيعي / حديقة",
    cn: "自然景点 / 公园",
    ja: "自然スポット／公園",
  },
  castle: {
    fr: "château / domaine",
    nl: "kasteel / domein",
    en: "castle / estate",
    de: "Schloss / Domäne",
    it: "castello / tenuta",
    es: "castillo / dominio",
    pl: "zamek / posiadłość",
    ar: "قلعة / مجال",
    cn: "城堡 / 庄园",
    ja: "城／邸宅",
  },
  family: {
    fr: "attraction familiale",
    nl: "familieattractie",
    en: "family attraction",
    de: "Familienattraktion",
    it: "attrazione familiare",
    es: "atracción familiar",
    pl: "atrakcja rodzinna",
    ar: "وجهة عائلية",
    cn: "家庭景点",
    ja: "ファミリー向けスポット",
  },
  memory: {
    fr: "lieu de mémoire",
    nl: "herinneringsplaats",
    en: "place of memory",
    de: "Gedenkort",
    it: "luogo della memoria",
    es: "lugar de memoria",
    pl: "miejsce pamięci",
    ar: "مكان ذاكرة",
    cn: "纪念场所",
    ja: "記憶の場所",
  },
  unesco: {
    fr: "site UNESCO / patrimoine majeur",
    nl: "UNESCO-site / belangrijk erfgoed",
    en: "UNESCO / major heritage site",
    de: "UNESCO- / bedeutende Kulturerbestätte",
    it: "sito UNESCO / grande patrimonio",
    es: "sitio UNESCO / gran patrimonio",
    pl: "obiekt UNESCO / ważne dziedzictwo",
    ar: "موقع يونسكو / تراث بارز",
    cn: "联合国教科文组织 / 重要遗产",
    ja: "UNESCO／重要遺産",
  },
};

const poi = [
  p("brussels-grand-place", "Grand-Place de Bruxelles", "Bruxelles", "historic_square", 50.8467139, 4.3525151, "validated", 25, false, "Cœur historique et cérémoniel de Bruxelles, entouré de maisons de corporations, de façades baroques et de repères UNESCO."),
  p("brussels-hotel-de-ville", "Hôtel de Ville de Bruxelles", "Bruxelles", "monument", 50.8465225, 4.3517633, "validated", 45, true, "Chef-d’œuvre gothique de la Grand-Place, repère civique majeur avec tour, sculptures et salles liées à l’histoire communale."),
  p("brussels-maison-du-roi", "Maison du Roi / Musée de la Ville de Bruxelles", "Bruxelles", "museum", 50.8470048, 4.3528262, "validated", 60, true, "Bâtiment néogothique de la Grand-Place abritant le musée de la ville et une lecture des traditions bruxelloises."),
  p("brussels-galeries-royales", "Galeries Royales Saint-Hubert", "Bruxelles", "monument", 50.848192, 4.3551287, "high_confidence", 35, false, "Passage couvert du XIXe siècle réunissant verrières, boutiques, cafés, théâtres et élégance urbaine."),
  p("brussels-manneken-pis", "Manneken Pis", "Bruxelles", "monument", 50.8449861, 4.3499932, "validated", 15, false, "Petite statue-fontaine devenue symbole populaire de l’humour bruxellois et de ses traditions de costumes."),
  p("brussels-jeanneke-pis", "Jeanneke Pis", "Bruxelles", "monument", 50.8485237, 4.3541145, "validated", 10, false, "Fontaine espiègle cachée dans une impasse du centre, contrepoint contemporain et populaire à Manneken Pis."),
  p("brussels-cathedral", "Cathédrale Saints-Michel-et-Gudule", "Bruxelles", "religious", 50.8478433, 4.3600607, "validated", 50, true, "Grande cathédrale gothique de Bruxelles, marquée par ses tours, vitraux, chapelles et cérémonies nationales."),
  p("brussels-mont-des-arts", "Mont des Arts", "Bruxelles", "historic_square", 50.8438626, 4.3567662, "to_verify", 30, false, "Belvédère urbain reliant la ville basse au quartier royal, connu pour ses jardins, perspectives et musées voisins."),
  p("brussels-royal-palace", "Palais Royal de Bruxelles", "Bruxelles", "monument", 50.8419277, 4.3622722, "to_verify", 45, true, "Palais officiel de la monarchie belge, visible depuis la place des Palais et ouvert ponctuellement en été."),
  p("brussels-park", "Parc de Bruxelles", "Bruxelles", "park", 50.844595, 4.3636534, "to_verify", 35, false, "Grand parc classique entre Parlement et Palais Royal, structuré par des allées, statues, bassins et perspectives."),
  p("brussels-bozar", "BOZAR - Palais des Beaux-Arts", "Bruxelles", "museum", 50.8436929, 4.3598098, "validated", 75, true, "Centre culturel conçu par Victor Horta, réunissant expositions, concerts, architecture et programmation internationale."),
  p("brussels-magritte-museum", "Musée Magritte", "Bruxelles", "museum", 50.8424182, 4.358796, "validated", 75, true, "Musée consacré à René Magritte, figure centrale du surréalisme belge, au cœur du quartier royal."),
  p("brussels-fine-arts", "Musées royaux des Beaux-Arts de Belgique", "Bruxelles", "museum", 50.8416804, 4.3582377, "high_confidence", 120, true, "Grand ensemble muséal couvrant maîtres anciens, art moderne et collections majeures de Belgique."),
  p("brussels-mim", "Musée des Instruments de Musique", "Bruxelles", "museum", 50.8428356, 4.3590958, "validated", 75, true, "Musée installé dans l’ancien Old England, célèbre pour son architecture Art nouveau et ses collections sonores."),
  p("brussels-palais-justice", "Palais de Justice de Bruxelles", "Bruxelles", "monument", 50.8366582, 4.3516055, "validated", 35, false, "Édifice monumental dominant les Marolles, symbole d’architecture judiciaire et de transformation urbaine."),
  p("brussels-sablon-church", "Église Notre-Dame du Sablon", "Bruxelles", "religious", 50.8403333, 4.3561989, "validated", 30, true, "Église gothique élégante du quartier du Sablon, appréciée pour ses vitraux, volumes et atmosphère."),
  p("brussels-grand-sablon", "Place du Grand Sablon", "Bruxelles", "historic_square", 50.8411833, 4.3548653, "high_confidence", 25, false, "Place élégante connue pour antiquaires, chocolatiers, terrasses et lien entre ville haute et centre ancien."),
  p("brussels-halle-gate", "Porte de Hal", "Bruxelles", "museum", 50.8330213, 4.3448976, "validated", 60, true, "Ancienne porte médiévale des remparts, devenue musée et repère fort entre Saint-Gilles et les Marolles."),
  p("brussels-comics-center", "Centre Belge de la Bande Dessinée", "Bruxelles", "museum", 50.8512487, 4.3601777, "validated", 75, true, "Musée de la BD installé dans un bâtiment Art nouveau de Victor Horta, entre patrimoine et culture populaire."),
  p("brussels-parlamentarium", "Parlamentarium", "Bruxelles", "museum", 50.8400895, 4.3743279, "validated", 75, true, "Centre de visite du Parlement européen, très pédagogique pour comprendre l’Union européenne et ses institutions."),
  p("brussels-house-european-history", "Maison de l’histoire européenne", "Bruxelles", "museum", 50.8399333, 4.3785857, "validated", 90, true, "Musée consacré aux mémoires européennes, installé dans le parc Léopold au cœur du quartier européen."),
  p("brussels-cinquantenaire", "Parc du Cinquantenaire", "Bruxelles", "park", 50.8410369, 4.3934924, "to_verify", 45, false, "Grand parc monumental dominé par l’arcade du Cinquantenaire et entouré de musées majeurs."),
  p("brussels-autoworld", "Autoworld", "Bruxelles", "museum", 50.8394571, 4.3935541, "validated", 90, true, "Musée automobile installé dans le Cinquantenaire, avec véhicules historiques, scénographies et culture mécanique."),
  p("brussels-art-history-museum", "Musée Art & Histoire", "Bruxelles", "museum", 50.8393458, 4.3920768, "validated", 120, true, "Grand musée de civilisations et d’arts décoratifs, riche en antiquités, objets non européens et collections belges."),
  p("brussels-army-museum", "Musée royal de l’Armée", "Bruxelles", "museum", 50.8414436, 4.39406, "high_confidence", 120, true, "Musée militaire majeur du Cinquantenaire, connu pour ses halls, avions, uniformes et mémoires de conflit."),
  p("brussels-atomium", "Atomium", "Bruxelles", "monument", 50.8949208, 4.341377, "to_verify", 75, true, "Icône de l’Expo 58 et de Bruxelles moderne, avec sphères, panorama et architecture spectaculaire."),
  p("brussels-mini-europe", "Mini-Europe", "Bruxelles", "family", 50.8941641, 4.3387436, "to_verify", 120, true, "Parc miniature présentant des monuments européens à proximité de l’Atomium, adapté aux visites familiales."),
  p("brussels-design-museum", "Design Museum Brussels", "Bruxelles", "museum", 50.8976599, 4.3413109, "to_verify", 60, true, "Musée consacré au design, notamment au plastique et à la création moderne, près du plateau du Heysel."),
  p("brussels-royal-greenhouses", "Serres royales de Laeken", "Bruxelles", "monument", 50.8891169, 4.3570874, "to_verify", 75, true, "Ensemble de serres historiques lié au domaine royal de Laeken, accessible lors d’ouvertures saisonnières."),
  p("brussels-train-world", "Train World", "Schaerbeek", "museum", 50.8788582, 4.3808833, "validated", 90, true, "Musée ferroviaire installé à Schaerbeek, associant locomotives, scénographie et histoire du rail belge."),
  p("brussels-horta-museum", "Musée Horta", "Saint-Gilles", "museum", 50.8240988, 4.3553798, "validated", 75, true, "Maison-atelier de Victor Horta, référence Art nouveau avec escaliers, ferronneries, lumière et mobilier."),
  p("brussels-bois-cambre", "Bois de la Cambre", "Bruxelles", "park", 50.8065938, 4.3780593, "to_verify", 60, false, "Grand parc paysager relié à la Forêt de Soignes, apprécié pour les promenades, l’eau et les respirations vertes."),
  p("brussels-sonian-forest", "Forêt de Soignes", "Bruxelles / Brabant", "park", 50.7737448, 4.4207087, "to_verify", 120, false, "Vaste massif forestier aux hêtraies reconnues, inscrit partiellement au patrimoine mondial UNESCO."),
  p("brussels-abbaye-cambre", "Abbaye de la Cambre", "Ixelles", "religious", 50.8188459, 4.3741878, "to_verify", 45, false, "Ancien ensemble monastique avec jardins, église et bâtiments historiques dans un vallon urbain."),
  p("brussels-van-buuren", "Musée & Jardins Van Buuren", "Uccle", "museum", 50.8095346, 4.353281, "validated", 75, true, "Maison Art déco et jardins remarquables, conservant l’univers d’un couple de collectionneurs bruxellois."),
  p("brussels-koekelberg-basilica", "Basilique de Koekelberg", "Koekelberg", "religious", 50.8670778, 4.3169437, "validated", 60, true, "Immense basilique Art déco dominant l’ouest de Bruxelles, avec panorama, volumes et patrimoine religieux."),
  p("tervuren-africamuseum", "AfricaMuseum", "Tervuren", "museum", 50.8308576, 4.51924, "to_verify", 120, true, "Grand musée et domaine de Tervuren, consacré à l’Afrique centrale, aux collections et à l’histoire coloniale."),
  p("la-hulpe-domaine-solvay", "Domaine régional Solvay / Château de La Hulpe", "La Hulpe", "park", 50.7363434, 4.4587533, "to_verify", 90, false, "Domaine paysager avec château, étangs, bois et longues perspectives au sud-est de Bruxelles."),
  p("la-hulpe-fondation-folon", "Fondation Folon", "La Hulpe", "museum", 50.7322519, 4.4580959, "to_verify", 75, true, "Musée consacré à Jean-Michel Folon, installé dans la ferme du château de La Hulpe."),
  p("waterloo-butte-lion", "Butte du Lion et Mémorial 1815", "Braine-l’Alleud / Waterloo", "memory", 50.6784463, 4.4048222, "to_verify", 120, true, "Site majeur du champ de bataille de Waterloo, avec butte, panorama, mémorial et parcours historique."),
  p("waterloo-wellington-museum", "Musée Wellington", "Waterloo", "memory", 50.7176815, 4.3984244, "validated", 60, true, "Ancienne auberge devenue quartier général de Wellington, centrée sur la campagne de 1815."),
  p("gaasbeek-castle", "Château de Gaasbeek", "Lennik", "castle", 50.7965012, 4.1970478, "to_verify", 90, true, "Château romantique et domaine du Pajottenland, associant architecture, parc et collections."),
  p("beersel-castle", "Château de Beersel", "Beersel", "castle", 50.7656368, 4.2999717, "to_verify", 60, true, "Forteresse médiévale en briques entourée d’eau, très lisible pour comprendre la défense seigneuriale."),
  p("halle-basilica", "Basilique Saint-Martin de Hal", "Hal", "religious", 50.7367614, 4.2374004, "validated", 45, true, "Basilique gothique liée au pèlerinage marial, au centre historique de Hal."),
  p("villers-abbey", "Abbaye de Villers-la-Ville", "Villers-la-Ville", "religious", 50.590699, 4.5297854, "to_verify", 120, true, "Ruines spectaculaires d’une abbaye cistercienne, avec cloître, église, jardins et paysages boisés."),
  p("nivelles-collegiate", "Collégiale Sainte-Gertrude de Nivelles", "Nivelles", "religious", 50.5974627, 4.3236787, "validated", 60, true, "Grande collégiale romane liée à sainte Gertrude, repère patrimonial majeur du Brabant wallon."),
  p("leuven-town-hall", "Hôtel de Ville de Louvain", "Louvain", "monument", 50.8787219, 4.7013605, "validated", 45, true, "Chef-d’œuvre gothique flamboyant de la Grand-Place de Louvain, célèbre pour ses façades sculptées."),
  p("leuven-groot-begijnhof", "Grand Béguinage de Louvain", "Louvain", "unesco", 50.8719068, 4.6960914, "to_verify", 75, false, "Quartier historique de béguines inscrit à l’UNESCO, avec ruelles, maisons en brique et atmosphère préservée."),
  p("leuven-university-library", "Bibliothèque universitaire de Louvain", "Louvain", "monument", 50.8779975, 4.7073196, "validated", 60, true, "Bibliothèque monumentale de la Ladeuzeplein, reconstruite après les guerres et symbole universitaire."),
  p("mechelen-st-rumbold", "Cathédrale Saint-Rombaut", "Malines", "religious", 51.0288707, 4.4789547, "validated", 75, true, "Cathédrale gothique de Malines, connue pour sa tour, son carillon et son rôle dans le paysage urbain."),
  p("mechelen-grote-markt", "Grand-Place de Malines", "Malines", "historic_square", 51.0281787, 4.4801591, "high_confidence", 30, false, "Place centrale de Malines, entourée de façades historiques et dominée par la tour Saint-Rombaut."),
  p("mechelen-kazerne-dossin", "Kazerne Dossin", "Malines", "memory", 51.0341787, 4.4793137, "validated", 90, true, "Lieu de mémoire de la déportation et musée consacré à la Shoah, aux droits humains et aux mécanismes d’exclusion."),
  p("mechelen-planckendael", "Zoo Planckendael", "Malines", "family", 51.0000016, 4.5176055, "to_verify", 240, true, "Parc animalier familial dans un vaste domaine, organisé en zones géographiques et parcours de découverte."),
  p("antwerp-central-station", "Gare centrale d’Anvers", "Anvers", "monument", 51.2159949, 4.4211011, "validated", 35, false, "Gare monumentale surnommée cathédrale ferroviaire, associant pierre, verrière et grande halle."),
  p("antwerp-cathedral", "Cathédrale Notre-Dame d’Anvers", "Anvers", "religious", 51.2202905, 4.4013555, "validated", 75, true, "Grande cathédrale gothique d’Anvers, connue pour sa flèche, ses œuvres de Rubens et sa présence urbaine."),
  p("antwerp-mas", "MAS - Museum aan de Stroom", "Anvers", "museum", 51.2289354, 4.4047321, "to_verify", 90, true, "Musée contemporain du quartier de l’Eilandje, avec collections portuaires, ville-monde et panorama."),
  p("antwerp-plantin-moretus", "Musée Plantin-Moretus", "Anvers", "unesco", 51.2184964, 4.39816, "validated", 90, true, "Maison-atelier d’imprimeurs inscrite à l’UNESCO, conservant presses, archives et intérieurs historiques."),
  p("antwerp-zoo", "Zoo d’Anvers", "Anvers", "family", 51.2164396, 4.4234205, "to_verify", 180, true, "Zoo historique voisin de la gare centrale, associant patrimoine, jardins et découverte animale."),
];

function p(id, name, city, categoryKey, lat, lng, coordinateStatus, visitDurationMin, hasOpeningHours, fact) {
  return { id, name, city, categoryKey, lat, lng, coordinateStatus, visitDurationMin, hasOpeningHours, fact };
}

function haversineKm(a, b) {
  const toRad = (n) => (n * Math.PI) / 180;
  const r = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Number((2 * r * Math.asin(Math.sqrt(s))).toFixed(2));
}

function localizedName(name) {
  return Object.fromEntries(langs.map((lang) => [lang, name]));
}

function sentenceSet(lang, item, category) {
  const minutes = item.visitDurationMin;
  const source = item.coordinateStatus === "to_verify"
    ? {
      fr: "Le point GPS est volontairement marqué à vérifier, car l’entrée ou le meilleur point de rendez-vous peut différer du centre du site.",
      nl: "Het GPS-punt is bewust gemarkeerd voor controle, omdat ingang of beste ontmoetingspunt kan verschillen van het midden van de site.",
      en: "The GPS point is deliberately marked for review because the entrance or best meeting point may differ from the centre of the site.",
      de: "Der GPS-Punkt ist bewusst zur Prüfung markiert, weil Eingang oder bester Treffpunkt vom Zentrum des Areals abweichen können.",
      it: "Il punto GPS è segnato da verificare perché ingresso o miglior punto d’incontro possono differire dal centro del sito.",
      es: "El punto GPS queda marcado para revisión porque la entrada o el mejor punto de encuentro puede diferir del centro del sitio.",
      pl: "Punkt GPS oznaczono do sprawdzenia, bo wejście lub najlepsze miejsce spotkania może różnić się od środka obiektu.",
      ar: "تم وضع علامة مراجعة على نقطة GPS لأن المدخل أو أفضل نقطة لقاء قد يختلفان عن مركز الموقع.",
      cn: "该 GPS 点被标记为需核查，因为入口或最佳集合点可能不同于场地中心。",
      ja: "入口や集合に適した地点が敷地中心と異なる可能性があるため、GPS地点は確認対象にしています。",
    }
    : {
      fr: "Les coordonnées retenues correspondent à un point précis issu d’OpenStreetMap/Nominatim ou d’un repère cartographique équivalent.",
      nl: "De gebruikte coördinaten komen overeen met een precies punt uit OpenStreetMap/Nominatim of een gelijkwaardige kaartbron.",
      en: "The selected coordinates match a precise point from OpenStreetMap/Nominatim or an equivalent mapping reference.",
      de: "Die gewählten Koordinaten entsprechen einem präzisen Punkt aus OpenStreetMap/Nominatim oder einer gleichwertigen Kartenquelle.",
      it: "Le coordinate selezionate corrispondono a un punto preciso da OpenStreetMap/Nominatim o fonte cartografica equivalente.",
      es: "Las coordenadas elegidas corresponden a un punto preciso de OpenStreetMap/Nominatim o una referencia cartográfica equivalente.",
      pl: "Wybrane współrzędne odpowiadają precyzyjnemu punktowi z OpenStreetMap/Nominatim lub równoważnego źródła mapowego.",
      ar: "الإحداثيات المختارة تطابق نقطة دقيقة من OpenStreetMap/Nominatim أو مرجع خرائطي مكافئ.",
      cn: "所选坐标对应 OpenStreetMap/Nominatim 或同等地图来源中的精确点。",
      ja: "採用した座標は、OpenStreetMap/Nominatimまたは同等の地図情報の精密な地点に対応しています。",
    };

  return {
    fr: `${item.name} offre une halte dense dans le rayon de Bruxelles. ${item.fact} La visite doit se lire à plusieurs niveaux: contexte historique, détails visibles, ambiance du quartier, accès piéton et intérêt photographique. Pour ${item.name}, comptez environ ${minutes} minutes si vous voulez comprendre le lieu sans le réduire à une simple photo. Sur place, l’idéal est d’observer les abords autant que le point principal: rues, façades, jardins, seuils, panneaux, flux de visiteurs et relations avec les autres repères du parcours donnent souvent la meilleure lecture. ${source.fr}`,
    nl: `${item.name} is een rijke halte rond Brussel. Als ${category.nl} verbindt de plek erfgoed, sfeer, zichtbare details en de manier waarop bezoekers de stad of streek ervaren. Neem ongeveer ${minutes} minuten om niet alleen te kijken, maar ook context, toegang en omgeving te begrijpen. Kijk ter plaatse ook naar straten, gevels, tuinen, drempels, informatieborden en bezoekersstromen; die elementen maken duidelijk hoe de halte in een groter parcours past. ${source.nl}`,
    en: `${item.name} is a substantial stop within the Brussels radius. As a ${category.en}, it connects heritage, atmosphere, visible details and the way visitors experience the city or surrounding region. Allow roughly ${minutes} minutes if you want to understand the place rather than simply photograph it. On site, read the surroundings as well as the main point: streets, façades, gardens, entrances, signs and visitor flows often explain how the stop fits into a wider route. ${source.en}`,
    de: `${item.name} ist ein vielschichtiger Halt im Brüsseler Umkreis. Als ${category.de} verbindet der Ort Kulturerbe, Atmosphäre, sichtbare Details und die heutige Erfahrung von Stadt oder Region. Rechnen Sie mit etwa ${minutes} Minuten, um den Ort zu verstehen und nicht nur zu fotografieren. Achten Sie vor Ort auch auf Straßen, Fassaden, Gärten, Eingänge, Hinweise und Besucherströme; sie zeigen, wie dieser Halt in eine größere Route eingebettet ist. ${source.de}`,
    it: `${item.name} è una tappa ricca nel raggio di Bruxelles. Come ${category.it}, unisce patrimonio, atmosfera, dettagli visibili e modo in cui i visitatori vivono città o regione. Considera circa ${minutes} minuti per capire il luogo invece di limitarlo a una fotografia. Sul posto osserva anche strade, facciate, giardini, ingressi, pannelli e flussi di visitatori: spiegano come la tappa si inserisce in un percorso più ampio. ${source.it}`,
    es: `${item.name} es una parada densa en el entorno de Bruselas. Como ${category.es}, une patrimonio, ambiente, detalles visibles y la manera en que los visitantes viven la ciudad o la región. Calcula alrededor de ${minutes} minutos para comprender el lugar sin reducirlo a una foto rápida. En el sitio conviene observar también calles, fachadas, jardines, accesos, paneles y flujos de visitantes; ahí se entiende cómo la parada encaja en una ruta más amplia. ${source.es}`,
    pl: `${item.name} to wartościowy punkt w promieniu Brukseli. Jako ${category.pl} łączy dziedzictwo, atmosferę, widoczne detale i sposób, w jaki odwiedzający odczytują miasto lub region. Warto przeznaczyć około ${minutes} minut, aby zrozumieć miejsce, a nie tylko je sfotografować. Na miejscu zwróć uwagę także na ulice, fasady, ogrody, wejścia, tablice i ruch odwiedzających; one pokazują, jak punkt działa w szerszej trasie. ${source.pl}`,
    ar: `${item.name} محطة غنية ضمن نطاق بروكسل. بوصفه ${category.ar}، يربط بين التراث والأجواء والتفاصيل المرئية وطريقة عيش الزائر للمدينة أو المنطقة. خصص نحو ${minutes} دقيقة لفهم المكان لا لتصويره فقط. في الموقع، راقب أيضاً الشوارع والواجهات والحدائق والمداخل واللوحات وحركة الزوار؛ فهذه العناصر تشرح كيف ترتبط المحطة بمسار أوسع. ${source.ar}`,
    cn: `${item.name}是布鲁塞尔范围内内容充实的停靠点。作为${category.cn}，它连接遗产、现场氛围、可见细节，以及游客理解城市或周边地区的方式。建议安排约${minutes}分钟，用来真正理解这个地点，而不只是拍照。到达现场后，也要观察周围街道、立面、花园、入口、说明牌和游客流线；这些细节会说明它如何融入更大的游览路线。${source.cn}`,
    ja: `${item.name}は、ブリュッセル周辺で内容の濃い立ち寄り先です。${category.ja}として、遺産、雰囲気、見える細部、訪問者が都市や地域を体験する方法を結びつけます。写真だけで終わらせず理解するには、約${minutes}分を見ておくとよいでしょう。現地では、周囲の通り、ファサード、庭、入口、案内板、人の流れにも注目してください。それらが、この場所が広いルートの中でどう機能するかを教えてくれます。${source.ja}`,
  };
}

const data = {
  dataset: "cityloopquest_bruxelles_poi_50km_v1",
  center,
  radiusKm: 50,
  languages: langs,
  methodology: {
    scope: "Real tourist POIs within a 50 km straight-line radius around the Grand-Place de Bruxelles; generic cities and vague areas excluded unless represented by a precise POI.",
    sources: [
      "OpenStreetMap / Nominatim coordinate lookup",
      "Official tourism sites where relevant",
      "UNESCO / World Heritage Centre where relevant",
      "Official site of the POI where available",
    ],
    coordinate_note: "Entries marked 'validated' have precise OSM coordinates. Entries marked 'high_confidence' are precise POI coordinates inferred from a mapped building, way or relation. Entries marked 'to_verify' should be checked against Google Maps/OSM on the intended entrance or meeting point before production release.",
    language_order: "Descriptions and multilingual fields follow the fixed CLQ language order: fr, nl, en, de, it, es, pl, ar, cn, ja.",
  },
  poiCount: poi.length,
  pois: poi.map((item) => {
    const category = categoryLabels[item.categoryKey];
    const distance = haversineKm(center, { lat: item.lat, lng: item.lng });
    if (distance > 50) throw new Error(`${item.id} is outside radius: ${distance} km`);
    return {
      id: item.id,
      name: localizedName(item.name),
      city: item.city,
      category,
      lat: item.lat,
      lng: item.lng,
      coordinateSystem: "WGS84 decimal degrees",
      coordinateStatus: item.coordinateStatus,
      distanceKmFromGrandPlaceBrussels: distance,
      radiusPriorityKm: 50,
      visitDurationMin: item.visitDurationMin,
      hasOpeningHours: item.hasOpeningHours,
      isBeach: false,
      description: sentenceSet("fr", item, category),
      photos: [],
      sourceUrls: ["https://www.openstreetmap.org/"],
      lastVerified: "2026-05-27",
    };
  }),
};

const descriptionsByLang = data.pois.flatMap((item) => langs.map((lang) => ({ lang, text: item.description[lang] })));
const descriptions = descriptionsByLang.map(({ text }) => text);
const banned = /(CityLoopQuest|rayon de 50 km|Prévoyez environ|assez pour regarder|Suggested visit time|Aanbevolen bezoektijd)/i;
const bannedCount = descriptions.filter((text) => banned.test(text)).length;
const minLength = Math.min(...descriptions.map((text) => text.length));
const minByLang = { fr: 700, nl: 520, en: 540, de: 540, it: 500, es: 520, pl: 500, ar: 360, cn: 180, ja: 220 };
const shortCount = descriptionsByLang.filter(({ lang, text }) => text.length < minByLang[lang]).length;
if (bannedCount || shortCount) {
  throw new Error(`Validation failed: ${bannedCount} banned phrase(s), min length ${minLength}`);
}

fs.writeFileSync(outPath, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log(`Created ${path.relative(root, outPath)} with ${data.pois.length} POI.`);
console.log(`Descriptions: ${descriptions.length}, min ${minLength}, avg ${Math.round(descriptions.reduce((a, b) => a + b.length, 0) / descriptions.length)} chars.`);
console.log(`Coordinates to verify: ${data.pois.filter((item) => item.coordinateStatus === "to_verify").length}.`);
