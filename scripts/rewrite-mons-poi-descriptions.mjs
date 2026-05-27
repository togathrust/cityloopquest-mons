/**
 * Réécrit les descriptions POI Mons en textes visiteurs, sans formulation interne.
 * Usage: node scripts/rewrite-mons-poi-descriptions.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const jsonPath = path.join(root, "data", "pois_mons_experiment.json");
const langs = ["fr", "nl", "en", "de", "it", "es", "pl", "ar", "cn", "ja"];

const bannedPatterns = [
  /Prévoyez environ/i,
  /assez pour regarder/i,
  /Reken op ongeveer/i,
  /Allow around/i,
  /Planen Sie etwa/i,
  /Prevedi circa/i,
  /Calcula unos/i,
  /Zaplanuj około/i,
  /خصص نحو/i,
  /建议预留约/i,
  /所要時間の目安/i,
  /CityLoopQuest/i,
  /rayon de 50 km/i,
  /within 50 km/i,
  /Umkreis von 50 km/i,
  /entro 50 km/i,
  /menos de 50 km/i,
  /promieniu 50 km/i,
  /ضمن نطاق 50/i,
  /周边50公里/i,
  /半径50km/i,
];

const genericPatterns = [
  /Ce POI est pertinent pour CityLoopQuest[\s\S]*$/i,
  /This POI works well for CityLoopQuest[\s\S]*$/i,
  /这个POI非常适合CityLoopQuest[\s\S]*$/i,
  /CityLoopQuestに適したPOI[\s\S]*$/i,
  /Het is een echte, nauwkeurig te plaatsen POI[\s\S]*$/i,
  /Es handelt sich um einen echten, kartierbaren POI[\s\S]*$/i,
  /È un vero POI geolocalizzabile[\s\S]*$/i,
  /Es un punto turístico real[\s\S]*$/i,
  /Jest to realny, możliwy do geolokalizacji POI[\s\S]*$/i,
  /إنه POI حقيقي[\s\S]*$/i,
];

function cleanSeed(text) {
  let out = String(text || "").trim();
  for (const re of genericPatterns) out = out.replace(re, "").trim();
  out = out.replace(/(?:SPARKOH!\s*){2,}/g, "SPARKOH! ");
  out = out
    .split(/(?<=[.!?。؟])\s+/)
    .filter((sentence) => !/(50\s*km|rayon|within 50|Umkreis|entro 50|menos de 50|promieniu 50|ضمن نطاق|周边50|半径50)/i.test(sentence))
    .filter((sentence) => !/(mérite un véritable arrêt|verdient een echte halte|deserves a real stop|verdient einen bewussten Halt|merita una vera sosta|merece una parada|zasługuje na prawdziwy|يستحق محطة|值得.*专门停留|しっかり立ち寄りたい)/i.test(sentence))
    .filter((sentence) => !/(Cette étape|Deze halte|This stop|Dieser Halt|Questa tappa|Esta parada|Ten przystanek|هذه المحطة|这个停靠点|この立ち寄り先)/i.test(sentence))
    .filter((sentence) => !/(Sur place, le visiteur|Ter plaatse vind je|On site, visitors|Vor Ort findet|Sul posto si trovano|En el lugar se combinan|Na miejscu spotykają|في المكان نفسه|到达现场后|現地では)/i.test(sentence))
    .filter((sentence) => !/(ne se limite pas à un point|more than a point on the map|punt op de kaart|Punkt auf der Karte|punto sulla mappa|punto en el mapa|punkt na mapie|نقطة على الخريطة|地图上的一个点|地図上の点)/i.test(sentence))
    .filter((sentence) => !/(Le meilleur moment|À l’intérieur|Levez les yeux|Regardez l’implantation|La visite se savoure|Approchez-le|Neem vooral|Binnen loont|Kijk omhoog|Let op de ligging|Deze plek beleef|Benader het|The reward comes|Inside, follow|Look up at|Look at the setting|This visit is best|Approach it|Am meisten|Im Inneren|Richten Sie|Achten Sie|Diesen Ort|Betrachten Sie|Il momento migliore|All’interno|Alza lo sguardo|Osserva posizione|La visita si gusta|Avvicinalo|Lo mejor|Dentro, conviene|Levanta la vista|Observa la implantación|La visita se disfruta|Acércate|Najwięcej|W środku warto|Spójrz w górę|Zwróć uwagę|To miejsce najlepiej|Potraktuj|تظهر أجمل|في الداخل|ارفع بصرك|تأمل الموقع|تُستمتع الزيارة|اقترب منه|放慢脚步|进入其中|抬头看|观察它的位置|这里最适合|可以把这里|少し歩み|内部では|空間の広がり|立地、庭園|屋外で味わう|屋外に開かれた)/i.test(sentence))
    .filter((sentence) => !/(Le lieu se découvre|De plek ontdek|The place reveals|Der Ort erschließt|Il luogo si scopre|El lugar se descubre|Miejsce odkrywa|يتكشف المكان|这个地点的魅力|この場所の魅力)/i.test(sentence))
    .filter((sentence) => !/(C’est un arrêt idéal|Ideaal om adem|It is a good place|Ideal, um durchzuatmen|È una sosta ideale|Es una parada ideal|Dobry przystanek|إنها محطة مثالية|适合放慢呼吸|深呼吸し)/i.test(sentence))
    .filter((sentence) => !/(mérite un véritable arrêt|verdient een echte halte|deserves a real stop|verdient einen bewussten Halt|merita una vera sosta|merece una parada|zasługuje na prawdziwy|يستحق محطة|值得.*专门停留|しっかり立ち寄りたい)/i.test(sentence))
    .filter((sentence) => !/(Prévoyez environ|assez pour regarder|Reken op ongeveer|Allow around|Planen Sie etwa|Prevedi circa|Calcula unos|Zaplanuj około|خصص نحو|建议预留约|所要時間の目安)/i.test(sentence))
    .filter((sentence) => !/(Pensez à vérifier|Controleer vooraf|Check opening times|Prüfen Sie vorab|Verifica gli orari|Conviene comprobar|Przed wyjazdem warto|يُفضّل التحقق|建议出发前确认|訪問前に開館時間)/i.test(sentence))
    .join(" ")
    .trim();
  out = out.replace(/\b(SPARKOH!\s*){2,}/g, "SPARKOH! ");
  out = out.replace(/\s+/g, " ");
  out = out.replace(/\s+([,.;:!?])/g, "$1");
  return out;
}

function localized(field, lang) {
  if (!field) return "";
  if (typeof field === "string") return field;
  if (lang === "cn") return field.cn || field.zh || field.fr || field.en || "";
  if (lang === "ja") return field.ja || field.jp || field.fr || field.en || "";
  return field[lang] || field.fr || field.en || "";
}

function normalizedCategory(poi) {
  const cat = localized(poi.category, "fr").toLowerCase();
  const id = poi.id.toLowerCase();
  if (/musée|museum|centre|interpret|cid|macs|bam|mundaneum|sparkoh|mumask|silex|iguanodon|artotheque|maison-van-gogh/.test(cat + " " + id)) return "museum";
  if (/château|chateau|domaine|beloeil|attre|seneffe|boussu|havre|louvignies/.test(cat + " " + id)) return "castle";
  if (/nature|marais|grand-large|caillou|honnelles|vignoble|harchies|belvedere|pairi/.test(cat + " " + id)) return "nature";
  if (/église|eglise|chapelle|collégiale|cathedrale|notre-dame|tresor/.test(cat + " " + id)) return "religious";
  if (/beffroi|ascenseur|remparts|pont|canal|mine|bois-du-luc|bois-du-cazier|grand-hornu/.test(cat + " " + id)) return "heritage";
  if (/place|grand-place|hotel-de-ville|theatre|singe|car-dor/.test(cat + " " + id)) return "urban";
  return "heritage";
}

function pick(list, seed, offset = 0) {
  let hash = offset;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return list[hash % list.length];
}

function minutesText(lang, minutes) {
  const m = Number(minutes) || 30;
  const words = {
    fr: `${m} minutes`,
    nl: `${m} minuten`,
    en: `${m} minutes`,
    de: `${m} Minuten`,
    it: `${m} minuti`,
    es: `${m} minutos`,
    pl: `${m} minut`,
    ar: `${m} دقيقة`,
    cn: `${m}分钟`,
    ja: `${m}分`,
  };
  return words[lang];
}

function lowerFirst(text) {
  return text ? text[0].toLocaleLowerCase() + text.slice(1) : text;
}

function smoothStart(lang, text) {
  const lowered = lowerFirst(text);
  if (lang === "fr") {
    return lowered
      .replace(/^pour une visite confortable, comptez plutôt/i, "comptez plutôt")
      .replace(/^pour une visite/i, "une visite");
  }
  return lowered;
}

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanFactPrefix(fact, name) {
  return fact
    .replace(new RegExp(`^${escapeRegex(name)}\\s*`, "i"), "")
    .replace(/^\s*[-:–]\s*/, "")
    .trim();
}

function contextualize(lang, name, text, seed) {
  const compact = text
    .replace(/([.!?])\s+/g, "; ")
    .replace(/([。！？])\s*/g, "；")
    .replace(/;\s+(\p{Lu})/gu, (_, char) => `; ${char.toLocaleLowerCase()}`);
  const start = smoothStart(lang, compact);
  const variants = {
    fr: [
      () => `Pour ${name}, ${start}`,
      () => `Dans le cas de ${name}, ${start}`,
      () => `Autour de ${name}, ${start}`,
    ],
    nl: [
      () => `Bij ${name} geldt vooral dit: ${compact}`,
      () => `Voor ${name} krijgt dat concreet vorm: ${compact}`,
      () => `Rond ${name} merk je het duidelijk: ${compact}`,
    ],
    en: [
      () => `For ${name}, this becomes concrete: ${start}`,
      () => `Around ${name}, the visit is shaped by this idea: ${start}`,
      () => `At ${name}, the detail matters: ${start}`,
    ],
    de: [
      () => `Bei ${name} wird das konkret: ${compact}`,
      () => `Rund um ${name} zeigt sich das besonders: ${compact}`,
      () => `Für ${name} lohnt dieser Blick: ${compact}`,
    ],
    it: [
      () => `Per ${name}, questo diventa concreto: ${start}`,
      () => `Attorno a ${name}, la visita prende forma così: ${start}`,
      () => `Nel caso di ${name}, il dettaglio conta: ${start}`,
    ],
    es: [
      () => `En ${name}, esto se vuelve concreto: ${start}`,
      () => `Alrededor de ${name}, la visita se entiende así: ${start}`,
      () => `Para ${name}, el detalle importa: ${start}`,
    ],
    pl: [
      () => `Przy ${name} widać to konkretnie: ${compact}`,
      () => `Wokół ${name} ta obserwacja nabiera sensu: ${compact}`,
      () => `Dla ${name} liczy się taki sposób patrzenia: ${compact}`,
    ],
    ar: [
      () => `في ${name} يصبح ذلك واضحاً: ${compact}`,
      () => `حول ${name} تتشكل الزيارة بهذه الطريقة: ${compact}`,
      () => `عند ${name} تصبح التفاصيل مهمة: ${compact}`,
    ],
    cn: [
      () => `在${name}，这一点很具体：${compact}`,
      () => `围绕${name}，参观体验可以这样理解：${compact}`,
      () => `对${name}来说，细节尤其重要：${compact}`,
    ],
    ja: [
      () => `${name}では、それが具体的に感じられます。${compact}`,
      () => `${name}の周辺では、この見方が役立ちます。${compact}`,
      () => `${name}では細部が大切です。${compact}`,
    ],
  };
  return pick(variants[lang], seed)();
}

const intros = {
  fr: [
    ({ name, city, category }) => `${name} fait partie de ces haltes de ${city} que l’on comprend vraiment en prenant le temps de la regarder comme un lieu vivant, pas comme un simple repère de carte. Classé ici comme ${category}, il donne une entrée concrète dans l’histoire locale, l’ambiance des rues et les détails qui rendent le territoire montois si reconnaissable.`,
    ({ name, city, category }) => `À ${city}, ${name} se découvre comme une étape de type ${category} avec plusieurs niveaux de lecture: le premier regard accroche la forme générale, puis les détails racontent peu à peu les usages, les époques et la place du site dans le quotidien des habitants.`,
    ({ name, city, category }) => `${name} n’est pas seulement une étape à cocher dans ${city}: c’est un point d’observation utile pour relier architecture, mémoire locale, circulation des visiteurs et petits signes de vie urbaine ou paysagère.`,
    ({ name, city, category }) => `Pour aborder ${city} autrement, ${name} offre une halte dense et lisible. Le lieu appartient à la famille ${category}, mais son intérêt dépasse l’étiquette: il se révèle par son contexte, ses abords, ses traces visibles et ce qu’il permet de comprendre du Hainaut.`,
  ],
  nl: [
    ({ name, city, category }) => `${name} is in ${city} meer dan een punt op de kaart: als ${category} laat het zich lezen via details, omgeving, gebruik en herinneringen die samen de lokale identiteit vormgeven.`,
    ({ name, city, category }) => `Wie ${city} aandachtig wil ontdekken, vindt in ${name} een rijke halte. De plek hoort bij ${category}, maar vertelt tegelijk iets over architectuur, landschap, ritme van bezoekers en dagelijks leven.`,
    ({ name, city, category }) => `${name} werkt het best wanneer je even vertraagt. In ${city} brengt dit ${category} geschiedenis, sfeer en concrete herkenningspunten samen.`,
  ],
  en: [
    ({ name, city, category }) => `${name} is more than a pin on a map of ${city}. As a ${category}, it opens a practical way into local history, atmosphere, visible details and the way this part of Hainaut is experienced today.`,
    ({ name, city, category }) => `In ${city}, ${name} rewards visitors who look beyond the first impression. The site belongs to the ${category} family, yet its value also lies in its setting, its uses and the stories suggested by its surroundings.`,
    ({ name, city, category }) => `${name} gives a dense, readable stop in ${city}: part landmark, part local memory, part invitation to notice the forms, materials and habits around it.`,
  ],
  de: [
    ({ name, city, category }) => `${name} ist in ${city} mehr als ein Kartenpunkt. Als ${category} verbindet der Ort Geschichte, Atmosphäre, sichtbare Details und den heutigen Umgang mit dem Kulturerbe.`,
    ({ name, city, category }) => `Wer ${city} aufmerksam erkundet, findet in ${name} einen vielschichtigen Halt. Der Ort gehört zur Kategorie ${category}, erzählt aber auch von Umgebung, Nutzung und lokaler Erinnerung.`,
    ({ name, city, category }) => `${name} erschließt sich langsam: In ${city} wird daraus ein konkreter Zugang zu Architektur, Landschaft, Stadtleben und den Spuren früherer Epochen.`,
  ],
  it: [
    ({ name, city, category }) => `${name} a ${city} non è solo un punto sulla mappa: come ${category} permette di leggere storia locale, atmosfera, dettagli visibili e vita del territorio.`,
    ({ name, city, category }) => `Per scoprire ${city} con più attenzione, ${name} offre una sosta ricca. Appartiene alla categoria ${category}, ma interessa anche per contesto, usi e memoria del luogo.`,
    ({ name, city, category }) => `${name} invita a rallentare: a ${city} unisce riferimento patrimoniale, ambiente, materiali e piccoli indizi che rendono il sito più vivo.`,
  ],
  es: [
    ({ name, city, category }) => `${name} en ${city} no es solo un punto en el mapa: como ${category}, permite leer historia local, ambiente, detalles visibles y vida cotidiana del territorio.`,
    ({ name, city, category }) => `Quien quiera descubrir ${city} con atención encuentra en ${name} una parada densa. Pertenece a la categoría ${category}, pero también habla de contexto, usos y memoria local.`,
    ({ name, city, category }) => `${name} gana cuando se observa sin prisa: en ${city} reúne patrimonio, atmósfera, materiales y señales concretas del paisaje urbano o natural.`,
  ],
  pl: [
    ({ name, city, category }) => `${name} w ${city} to coś więcej niż punkt na mapie. Jako ${category} pozwala czytać lokalną historię, atmosferę, widoczne detale i sposób życia miejsca.`,
    ({ name, city, category }) => `Podczas uważnego zwiedzania ${city} warto zatrzymać się przy ${name}. To ${category}, ale znaczenie miejsca wykracza poza samą kategorię: liczy się kontekst, otoczenie i pamięć lokalna.`,
    ({ name, city, category }) => `${name} najlepiej odkrywać spokojnie. W ${city} łączy dziedzictwo, atmosferę, materiały i drobne ślady codzienności.`,
  ],
  ar: [
    ({ name, city, category }) => `${name} في ${city} ليس مجرد نقطة على الخريطة؛ فهو بوصفه ${category} يفتح باباً لقراءة التاريخ المحلي والأجواء والتفاصيل المرئية وحياة المكان اليوم.`,
    ({ name, city, category }) => `لمن يريد اكتشاف ${city} بانتباه، يشكل ${name} محطة غنية. ينتمي إلى فئة ${category}، لكنه يهم أيضاً بسياقه ومحيطه والذاكرة التي يحملها.`,
    ({ name, city, category }) => `${name} يكشف قيمته عندما تتأمله بهدوء: في ${city} يجمع بين التراث والأجواء والمواد وعلامات الحياة اليومية أو الطبيعية.`,
  ],
  cn: [
    ({ name, city, category }) => `${name}在${city}并不只是地图上的一个点。作为${category}，它把地方历史、现场氛围、可见细节和今天的城市生活连接在一起。`,
    ({ name, city, category }) => `如果想更细致地理解${city}，${name}是一个内容充实的停靠点。它属于${category}，但价值也来自周边环境、使用方式和地方记忆。`,
    ({ name, city, category }) => `${name}适合放慢脚步观察：在${city}，它把遗产、气氛、材料和城市或自然景观中的细微信号结合起来。`,
  ],
  ja: [
    ({ name, city, category }) => `${name}は、${city}の地図上の一点にとどまりません。${category}として、地域の歴史、現地の空気、見える細部、現在の暮らしを結びつけてくれます。`,
    ({ name, city, category }) => `${city}を丁寧に知りたいなら、${name}は内容の濃い立ち寄り先です。${category}に分類されますが、周囲の環境、使われ方、土地の記憶にも価値があります。`,
    ({ name, city, category }) => `${name}は少し時間をかけて見るほど印象が深まります。${city}の中で、遺産、雰囲気、素材、都市や自然の細かなサインを結びつけています。`,
  ],
};

const experiences = {
  urban: {
    fr: [
      "Observez les façades, les alignements, les pavés, les enseignes et les perspectives: ils montrent comment le centre s’est organisé autour des échanges, des cérémonies, des commerces et des rencontres.",
      "Le lieu change selon l’heure: animation des terrasses, lumière sur les matériaux, circulation des passants et sons de la ville donnent une lecture très différente le matin, en fin d’après-midi ou lors d’un événement.",
      "Prenez aussi en compte les rues qui partent du site. Elles prolongent la visite vers d’autres repères, et aident à comprendre comment la ville se déplie à partir de quelques espaces forts.",
    ],
    nl: ["Let op gevels, bestrating, zichtlijnen en straatleven: ze tonen hoe het centrum zich rond handel, ontmoeting en publieke momenten heeft gevormd.", "De plek verandert met het uur; licht, terrassen, stemmen en beweging geven telkens een andere lezing.", "Kijk ook naar de straten rond de halte, want zij verbinden deze plek met andere herkenningspunten."],
    en: ["Look at façades, paving, sightlines and street life: they show how the centre grew around trade, meetings and public moments.", "The place changes through the day; light, terraces, voices and movement alter the visit.", "Notice the streets leading away from the stop, as they connect it with other landmarks."],
    de: ["Achten Sie auf Fassaden, Pflaster, Sichtachsen und Straßenleben: Sie zeigen, wie sich das Zentrum um Handel, Begegnung und öffentliche Momente formte.", "Der Ort verändert sich im Tageslauf; Licht, Terrassen, Stimmen und Bewegung erzeugen neue Eindrücke.", "Auch die umliegenden Straßen sind wichtig, denn sie verbinden diesen Halt mit weiteren Orientierungspunkten."],
    it: ["Osserva facciate, pavimentazione, prospettive e vita di strada: mostrano come il centro si sia formato attorno a scambi e incontri.", "Il luogo cambia durante la giornata; luce, terrazze, voci e movimento modificano la visita.", "Guarda anche le strade vicine, perché collegano la sosta ad altri punti di riferimento."],
    es: ["Observa fachadas, pavimento, perspectivas y vida de calle: muestran cómo el centro se formó alrededor de intercambios y encuentros.", "El lugar cambia a lo largo del día; luz, terrazas, voces y movimiento transforman la visita.", "Mira también las calles cercanas, porque conectan esta parada con otros referentes."],
    pl: ["Zwróć uwagę na fasady, bruk, osie widokowe i życie ulicy: pokazują rozwój centrum wokół handlu i spotkań.", "Miejsce zmienia się w ciągu dnia; światło, tarasy, głosy i ruch tworzą inną atmosferę.", "Ważne są także pobliskie ulice, bo łączą ten punkt z kolejnymi znakami orientacyjnymi."],
    ar: ["لاحظ الواجهات والأرضيات ومحاور النظر وحركة الشارع؛ فهي تشرح كيف تشكل المركز حول التجارة واللقاءات.", "يتغير المكان مع ساعات اليوم؛ فالضوء والمقاهي والأصوات والحركة تصنع قراءة مختلفة.", "انظر أيضاً إلى الشوارع المحيطة، فهي تربط هذه المحطة بمعالم أخرى."],
    cn: ["注意立面、铺地、视线轴和街头生活：它们说明中心如何围绕交易、相遇和公共时刻形成。", "这个地点会随一天中的时间变化；光线、露台、人声和流动都会改变参观感受。", "也可以观察周围街道，它们把这个停靠点与其他地标连接起来。"],
    ja: ["ファサード、舗装、視線の抜け、通りの動きに注目すると、中心部が交流や商いを軸に形成されたことが見えてきます。", "時間帯によって光、テラス、人の声、動きが変わり、訪問の印象も変化します。", "周囲の通りも見てください。この場所をほかの目印へつなげています。"],
  },
  museum: {
    fr: [
      "À l’intérieur, ne cherchez pas seulement les pièces majeures: suivez le fil du récit, les cartels, les maquettes, les archives et les transitions entre salles, car c’est souvent là que le territoire devient compréhensible.",
      "La visite gagne à être menée lentement. Les œuvres, objets ou dispositifs racontent autant les collections que les personnes qui les ont rassemblées, protégées, interprétées ou réinventées.",
      "Gardez un œil sur la scénographie: choix de lumière, ordre des salles, documents secondaires et citations donnent souvent les clés pour replacer les collections dans l’histoire régionale.",
    ],
    nl: ["Binnen is het zinvol het verhaal te volgen via objecten, teksten, maquettes en overgangen tussen zalen.", "Neem tijd voor de opstelling; collecties vertellen ook over verzamelaars, onderzoekers en bewoners.", "Licht, volgorde van zalen en kleine documenten helpen om het regionale verhaal te begrijpen."],
    en: ["Inside, follow the narrative through objects, labels, models and transitions between rooms.", "Take time with the display; collections also speak about collectors, researchers and local communities.", "Lighting, room order and small documents often explain the regional context."],
    de: ["Im Inneren lohnt es sich, der Erzählung über Objekte, Texte, Modelle und Raumwechsel zu folgen.", "Nehmen Sie sich Zeit für die Präsentation; Sammlungen erzählen auch von Sammlern, Forschern und Bewohnern.", "Licht, Raumfolge und kleine Dokumente helfen, den regionalen Kontext zu verstehen."],
    it: ["All’interno segui il racconto attraverso oggetti, testi, modelli e passaggi tra le sale.", "La collezione parla anche di chi ha raccolto, studiato e trasmesso questi elementi.", "Luce, ordine delle sale e documenti minori aiutano a capire il contesto regionale."],
    es: ["Dentro conviene seguir el relato por objetos, textos, maquetas y pasos entre salas.", "Las colecciones también hablan de quienes las reunieron, estudiaron y transmitieron.", "Luz, orden de salas y documentos secundarios ayudan a comprender el contexto regional."],
    pl: ["W środku warto śledzić opowieść przez obiekty, opisy, makiety i przejścia między salami.", "Kolekcje mówią także o osobach, które je gromadziły, badały i chroniły.", "Światło, układ sal i drobne dokumenty pomagają odczytać kontekst regionu."],
    ar: ["في الداخل، اتبع الحكاية عبر القطع والنصوص والنماذج والانتقال بين القاعات.", "المجموعات تتحدث أيضاً عن من جمعها ودرسها وحافظ عليها.", "الإضاءة وترتيب القاعات والوثائق الصغيرة تساعد على فهم السياق المحلي."],
    cn: ["进入室内后，可以顺着展品、说明、模型和展厅之间的转换来理解叙事。", "藏品也讲述了收藏者、研究者和地方社群的故事。", "灯光、展厅顺序和辅助文献常常能解释区域背景。"],
    ja: ["内部では、資料、解説、模型、部屋のつながりを追うと物語が見えてきます。", "コレクションは、集め、研究し、守ってきた人々についても語っています。", "照明、展示順、小さな文書が地域的背景を理解する助けになります。"],
  },
  religious: {
    fr: [
      "Levez les yeux vers les voûtes, les vitraux, les chapelles latérales, les pierres usées et les objets de dévotion: chacun ajoute une couche de lecture entre architecture, silence et mémoire spirituelle.",
      "Même lorsque la visite est brève, l’expérience passe par la lumière, l’acoustique et la circulation intérieure. Ces éléments donnent au lieu une profondeur que les photos seules ne restituent pas.",
      "Regardez comment le bâtiment s’insère dans la ville: porte, parvis, voisinage et orientation expliquent souvent son rôle dans les processions, les rassemblements et les repères quotidiens.",
    ],
    nl: ["Kijk naar gewelven, glasramen, kapellen, stenen en sporen van devotie; ze verbinden architectuur en stilte.", "Licht, akoestiek en binnenruimte maken de ervaring dieper dan een foto kan tonen.", "Let op deur, voorplein en ligging, want die verklaren de rol in processies en dagelijks leven."],
    en: ["Look at vaults, stained glass, chapels, worn stone and devotional traces; they link architecture with silence.", "Light, acoustics and interior circulation add depth beyond photographs.", "Doorway, forecourt and setting often explain the role in processions and daily landmarks."],
    de: ["Achten Sie auf Gewölbe, Glasfenster, Kapellen, abgenutzten Stein und Spuren der Andacht.", "Licht, Akustik und Wege im Inneren geben dem Ort mehr Tiefe als Fotos zeigen.", "Portal, Vorplatz und Lage erklären oft die Rolle bei Prozessionen und im Alltag."],
    it: ["Guarda volte, vetrate, cappelle, pietre consumate e tracce devozionali; uniscono architettura e silenzio.", "Luce, acustica e percorsi interni danno profondità oltre le fotografie.", "Portale, sagrato e posizione spiegano il ruolo nelle processioni e nella vita quotidiana."],
    es: ["Mira bóvedas, vidrieras, capillas, piedra gastada y huellas devocionales; unen arquitectura y silencio.", "Luz, acústica y circulación interior añaden profundidad más allá de la fotografía.", "Puerta, atrio y ubicación explican a menudo su papel en procesiones y vida diaria."],
    pl: ["Zwróć uwagę na sklepienia, witraże, kaplice, zużyty kamień i ślady pobożności.", "Światło, akustyka i ruch we wnętrzu nadają miejscu głębię, której nie oddają zdjęcia.", "Portal, plac i położenie wyjaśniają rolę w procesjach i codzienności."],
    ar: ["تأمل العقود والزجاج الملوّن والمصليات والحجر المصقول وآثار التعبد؛ فهي تصل العمارة بالصمت.", "الضوء والصوت ومسار الحركة في الداخل تمنح المكان عمقاً لا تنقله الصور وحدها.", "المدخل والساحة والموقع تشرح أحياناً دوره في المواكب والحياة اليومية."],
    cn: ["观察拱顶、彩窗、小礼拜堂、磨损的石材和信仰痕迹；它们把建筑与寂静连接起来。", "光线、声学和室内动线带来的深度，是照片难以呈现的。", "入口、前场和位置常常解释它在游行与日常生活中的角色。"],
    ja: ["ヴォールト、ステンドグラス、礼拝堂、磨かれた石、祈りの痕跡に注目してください。", "光、音、内部の動線が、写真だけでは伝わらない深みを与えます。", "入口、前庭、立地は、行列や日常の目印としての役割を示します。"],
  },
  castle: {
    fr: [
      "Lisez le domaine par ses accès, ses façades, ses jardins, ses douves ou ses perspectives. Un château raconte toujours un équilibre entre défense, prestige, confort, représentation sociale et maîtrise du paysage.",
      "La qualité de la visite tient autant aux abords qu’aux salles: grille, cour, parc, dépendances et vues lointaines montrent comment le pouvoir s’organisait dans l’espace.",
      "Cherchez les signes de transformation: éléments défensifs, décors de plaisance, traces de familles propriétaires et usages contemporains se superposent souvent dans un même domaine.",
    ],
    nl: ["Lees het domein via toegang, gevels, tuinen en zichtlijnen; kastelen spreken over macht, prestige en landschap.", "Ook poort, binnenplaats, park en bijgebouwen tonen hoe sociale status in ruimte werd georganiseerd.", "Let op sporen van verandering tussen verdediging, wooncomfort en hedendaags gebruik."],
    en: ["Read the estate through gates, façades, gardens and views; castles speak about power, prestige and landscape.", "Gate, courtyard, park and outbuildings show how social status was organised in space.", "Look for layers between defence, comfort, family memory and present-day use."],
    de: ["Lesen Sie das Anwesen über Zugänge, Fassaden, Gärten und Blickachsen; Schlösser erzählen von Macht, Prestige und Landschaft.", "Tor, Hof, Park und Nebengebäude zeigen, wie sozialer Rang räumlich inszeniert wurde.", "Suchen Sie nach Schichten zwischen Verteidigung, Wohnkomfort, Familiengeschichte und heutiger Nutzung."],
    it: ["Leggi il dominio attraverso accessi, facciate, giardini e prospettive; i castelli parlano di potere, prestigio e paesaggio.", "Cancello, corte, parco e dipendenze mostrano come lo status sociale fosse organizzato nello spazio.", "Cerca strati tra difesa, comfort, memoria familiare e usi attuali."],
    es: ["Lee el dominio por accesos, fachadas, jardines y perspectivas; los castillos hablan de poder, prestigio y paisaje.", "Puerta, patio, parque y dependencias muestran cómo se organizaba el estatus en el espacio.", "Busca capas entre defensa, confort, memoria familiar y usos actuales."],
    pl: ["Czytaj posiadłość przez bramy, fasady, ogrody i widoki; zamki mówią o władzy, prestiżu i krajobrazie.", "Brama, dziedziniec, park i zabudowania pokazują przestrzenną organizację statusu.", "Szukaj warstw między obroną, wygodą, pamięcią rodzin i współczesnym użyciem."],
    ar: ["اقرأ المجال من خلال المداخل والواجهات والحدائق والمناظر؛ فالقصور تتحدث عن السلطة والهيبة والمنظر.", "البوابة والفناء والحديقة والمباني الملحقة تشرح تنظيم المكان اجتماعياً.", "ابحث عن طبقات بين الدفاع والراحة وذاكرة العائلات والاستخدام الحالي."],
    cn: ["可以从入口、立面、花园和视线来阅读庄园；城堡总与权力、声望和景观有关。", "大门、庭院、公园和附属建筑展示了社会地位如何在空间中被安排。", "寻找防御、居住舒适、家族记忆和当代使用之间的层次。"],
    ja: ["入口、ファサード、庭園、眺めから領地を読むと、城が権力、威信、景観を語っていることが分かります。", "門、中庭、公園、付属建物は、社会的地位が空間にどう表されたかを示します。", "防御、快適な住まい、家族の記憶、現在の利用が重なる層を探してみてください。"],
  },
  nature: {
    fr: [
      "Ici, l’expérience dépend du dehors: lumière, relief, eau, végétation, vents, chants d’oiseaux et points de vue changent selon l’heure. Le lieu aide à replacer le patrimoine dans un paysage plus large.",
      "Avancez lentement et regardez les transitions: sol humide ou sec, lisières, chemins, reflets, pentes, traces animales et ouvertures visuelles composent une visite très sensorielle.",
      "La météo transforme fortement la perception du site. Un ciel couvert insiste sur les matières et les sons; une lumière basse révèle les volumes, les berges ou la profondeur du paysage.",
    ],
    nl: ["De ervaring hangt af van buitenlicht, reliëf, water, planten, wind en geluiden; het landschap verandert voortdurend.", "Loop langzaam en let op overgangen tussen paden, oevers, begroeiing en uitzicht.", "Weer en uur bepalen sterk hoe kleuren, volumes en geluiden overkomen."],
    en: ["The experience depends on outdoor light, relief, water, vegetation, wind and sounds; the landscape keeps changing.", "Move slowly and notice transitions between paths, banks, plants and views.", "Weather and time of day strongly affect colours, volumes and sounds."],
    de: ["Das Erlebnis hängt von Licht, Relief, Wasser, Pflanzen, Wind und Geräuschen ab; die Landschaft verändert sich ständig.", "Gehen Sie langsam und achten Sie auf Übergänge zwischen Wegen, Ufern, Vegetation und Ausblicken.", "Wetter und Tageszeit prägen Farben, Volumen und Geräusche stark."],
    it: ["L’esperienza dipende da luce, rilievo, acqua, vegetazione, vento e suoni; il paesaggio cambia sempre.", "Procedi lentamente e nota passaggi tra sentieri, rive, piante e vedute.", "Meteo e ora influenzano colori, volumi e suoni."],
    es: ["La experiencia depende de luz, relieve, agua, vegetación, viento y sonidos; el paisaje cambia continuamente.", "Avanza despacio y observa transiciones entre caminos, orillas, plantas y vistas.", "Tiempo y hora modifican colores, volúmenes y sonidos."],
    pl: ["Doświadczenie zależy od światła, rzeźby terenu, wody, roślin, wiatru i dźwięków; krajobraz stale się zmienia.", "Idź powoli i obserwuj przejścia między ścieżkami, brzegami, roślinnością i widokami.", "Pogoda i pora dnia mocno wpływają na kolory, bryły i dźwięki."],
    ar: ["تعتمد التجربة على الضوء والتضاريس والماء والنبات والريح والأصوات؛ فالمنظر يتغير باستمرار.", "تحرك ببطء ولاحظ الانتقال بين المسارات والضفاف والنباتات والمشاهد.", "الطقس والوقت يغيران الألوان والأحجام والأصوات بقوة."],
    cn: ["体验取决于户外光线、地形、水、植被、风和声音；景观一直在变化。", "慢慢走，留意路径、岸边、植物和视野之间的转换。", "天气和时间会强烈改变色彩、体量和声音。"],
    ja: ["体験は屋外の光、地形、水、植生、風、音に左右され、景観は常に変化します。", "ゆっくり進み、道、岸辺、植物、眺めの移り変わりに注目してください。", "天候と時間帯は色、量感、音の印象を大きく変えます。"],
  },
  heritage: {
    fr: [
      "Approchez le site comme une page d’histoire ouverte: matériaux, machines, inscriptions, volumes, traces industrielles ou symboles civiques montrent ce que la région a produit, défendu et transmis.",
      "Les détails techniques comptent autant que l’émotion. Une structure, un escalier, une pierre, une ligne de force ou une plaque commémorative peut révéler un pan entier de l’histoire locale.",
      "La visite devient plus forte quand on relie le monument à son territoire: charbon, canaux, libertés communales, guerres, fêtes ou mutations urbaines donnent du relief à ce qui se voit sur place.",
    ],
    nl: ["Benader de plek als een open geschiedenisboek: materialen, machines, inscripties en symbolen tonen wat de streek doorgaf.", "Technische details zijn belangrijk; een trap, steen, lijn of plaat kan veel lokale geschiedenis openen.", "Verbind het monument met mijnbouw, kanalen, burgerlijke vrijheden, oorlogen of stedelijke veranderingen."],
    en: ["Approach the site as an open page of history: materials, machines, inscriptions and symbols show what the region passed on.", "Technical details matter; a stair, stone, line or plaque can open a whole chapter of local history.", "Link the monument with coal, canals, civic liberties, wars, festivals or urban change."],
    de: ["Betrachten Sie den Ort als offene Geschichtsseite: Materialien, Maschinen, Inschriften und Symbole zeigen, was die Region weitergab.", "Technische Details zählen; Treppe, Stein, Linie oder Tafel können viel lokale Geschichte öffnen.", "Verbinden Sie das Denkmal mit Kohle, Kanälen, Bürgerrechten, Kriegen, Festen oder Stadtwandel."],
    it: ["Avvicina il sito come una pagina aperta di storia: materiali, macchine, iscrizioni e simboli mostrano ciò che la regione ha trasmesso.", "I dettagli tecnici contano; scala, pietra, linea o targa possono aprire un capitolo locale.", "Collega il monumento a carbone, canali, libertà civiche, guerre, feste o trasformazioni urbane."],
    es: ["Acércate al sitio como a una página abierta de historia: materiales, máquinas, inscripciones y símbolos muestran lo que la región transmitió.", "Los detalles técnicos cuentan; una escalera, piedra, línea o placa puede abrir un capítulo local.", "Relaciona el monumento con carbón, canales, libertades cívicas, guerras, fiestas o cambios urbanos."],
    pl: ["Traktuj miejsce jak otwartą kartę historii: materiały, maszyny, napisy i symbole pokazują, co region przekazał dalej.", "Detale techniczne są ważne; schody, kamień, linia czy tablica mogą odsłonić lokalną historię.", "Połącz zabytek z węglem, kanałami, wolnościami miejskimi, wojnami, świętami lub zmianą urbanistyczną."],
    ar: ["اقترب من الموقع كصفحة تاريخ مفتوحة: المواد والآلات والكتابات والرموز تظهر ما نقلته المنطقة.", "التفاصيل التقنية مهمة؛ درج أو حجر أو خط أو لوحة قد يفتح فصلاً كاملاً من التاريخ المحلي.", "اربط المعلم بالفحم والقنوات والحريات المدنية والحروب والاحتفالات أو التحولات الحضرية."],
    cn: ["可以把这里当作一页打开的历史：材料、机器、铭文和象征展示了地区传承下来的东西。", "技术细节同样重要；楼梯、石块、线条或纪念牌可能打开一段地方历史。", "把纪念物与煤炭、运河、市民自由、战争、节庆或城市变化联系起来。"],
    ja: ["この場所を開かれた歴史のページとして見てください。素材、機械、銘文、象徴が地域の継承を示します。", "技術的な細部も重要です。階段、石、線、銘板が地域史の一章を開くことがあります。", "石炭、運河、市民の自由、戦争、祭り、都市変化と結びつけると理解が深まります。"],
  },
};

const practicals = {
  fr: [
    ({ minutes, hasOpeningHours }) => `Pour une visite confortable, comptez plutôt ${minutes} si vous voulez lire, comparer les points de vue et laisser une place aux photos. ${hasOpeningHours ? "Les horaires peuvent changer selon les saisons, les expositions ou les jours fériés; une vérification rapide évite une arrivée devant une porte close." : "Le lieu se prête bien à une pause souple, à intégrer entre deux autres étapes sans obligation de suivre un parcours fermé."}`,
    ({ minutes, hasOpeningHours }) => `Le temps utile tourne autour de ${minutes}, non pour courir d’un panneau à l’autre, mais pour installer un vrai regard. ${hasOpeningHours ? "Avant le départ, contrôlez les conditions d’accès, car certaines parties peuvent dépendre d’un billet, d’une visite guidée ou d’une ouverture ponctuelle." : "Comme l’accès est surtout extérieur ou libre, la météo et la lumière comptent davantage que l’horaire."}`,
    ({ minutes, hasOpeningHours }) => `Gardez environ ${minutes} dans le parcours si vous aimez comprendre plutôt que seulement photographier. ${hasOpeningHours ? "Un passage sur le site officiel ou la page touristique reste prudent pour confirmer l’ouverture du moment." : "L’arrêt peut aussi fonctionner comme respiration courte, mais il devient plus riche si l’on s’autorise quelques détours autour du point principal."}`,
    ({ minutes, hasOpeningHours }) => `En pratique, ${minutes} donnent une bonne marge pour observer les détails, replacer le site dans son environnement et repartir avec autre chose qu’une image rapide. ${hasOpeningHours ? "Vérifiez l’accès du jour, surtout si vous visez l’intérieur, une exposition temporaire ou une visite accompagnée." : "Choisissez si possible un moment où la lumière rend les volumes lisibles, car l’expérience dépend beaucoup de l’ambiance sur place."}`,
  ],
  nl: [
    ({ minutes, hasOpeningHours }) => `Reken in de route op ${minutes} om rustig te kijken en details te begrijpen. ${hasOpeningHours ? "Controleer de toegang vooraf, want opening, tickets of rondleidingen kunnen wijzigen." : "Omdat de halte vrijer werkt, bepalen weer en licht sterk de ervaring."}`,
    ({ minutes, hasOpeningHours }) => `${minutes} geven voldoende ruimte voor tekst, foto’s en observatie. ${hasOpeningHours ? "Een snelle controle van de actuele uren voorkomt een gesloten deur." : "De plek past gemakkelijk tussen twee andere stappen."}`,
  ],
  en: [
    ({ minutes, hasOpeningHours }) => `In the route, ${minutes} gives enough room to read, compare views and take photographs without turning the stop into a checklist. ${hasOpeningHours ? "Check current access before leaving, as tickets, guided visits or seasonal hours may affect the visit." : "With a mostly open visit, weather and light shape the experience more than a timetable."}`,
    ({ minutes, hasOpeningHours }) => `${minutes} is a useful margin if you want to understand the place rather than simply record it. ${hasOpeningHours ? "A quick look at official opening information is wise before setting out." : "The stop also works as a short pause, but it becomes richer with a small detour around the main point."}`,
  ],
  de: [
    ({ minutes, hasOpeningHours }) => `Für die Route sind ${minutes} sinnvoll, um zu lesen, zu vergleichen und Details wahrzunehmen. ${hasOpeningHours ? "Prüfen Sie den aktuellen Zugang, da Öffnung, Tickets oder Führungen variieren können." : "Bei einem eher freien Halt prägen Wetter und Licht die Erfahrung stark."}`,
    ({ minutes, hasOpeningHours }) => `${minutes} geben genug Spielraum, um den Ort nicht nur zu fotografieren, sondern zu verstehen. ${hasOpeningHours ? "Ein kurzer Blick auf die offiziellen Zeiten ist vor der Abfahrt ratsam." : "Der Halt lässt sich flexibel zwischen zwei Etappen einbauen."}`,
  ],
  it: [
    ({ minutes, hasOpeningHours }) => `Nel percorso, ${minutes} sono utili per leggere, osservare e fotografare senza fretta. ${hasOpeningHours ? "Controlla l’accesso aggiornato, perché orari, biglietti o visite guidate possono variare." : "Con una visita più libera, meteo e luce contano molto."}`,
    ({ minutes, hasOpeningHours }) => `${minutes} lasciano margine per capire il luogo, non solo registrarlo. ${hasOpeningHours ? "Meglio verificare le informazioni ufficiali prima di partire." : "La sosta si inserisce facilmente tra due tappe."}`,
  ],
  es: [
    ({ minutes, hasOpeningHours }) => `En la ruta, ${minutes} ayudan a leer, mirar y fotografiar sin convertir la visita en una lista. ${hasOpeningHours ? "Comprueba el acceso actualizado, porque horarios, entradas o visitas guiadas pueden variar." : "Al ser una parada flexible, clima y luz influyen mucho."}`,
    ({ minutes, hasOpeningHours }) => `${minutes} dan margen para entender el lugar, no solo registrarlo. ${hasOpeningHours ? "Conviene revisar la información oficial antes de salir." : "La parada encaja bien entre dos etapas."}`,
  ],
  pl: [
    ({ minutes, hasOpeningHours }) => `Na trasie warto zostawić ${minutes}, by spokojnie czytać, patrzeć i robić zdjęcia. ${hasOpeningHours ? "Sprawdź aktualny dostęp, bo godziny, bilety lub oprowadzanie mogą się zmieniać." : "Przy bardziej swobodnym postoju pogoda i światło mają duże znaczenie."}`,
    ({ minutes, hasOpeningHours }) => `${minutes} daje czas na zrozumienie miejsca, nie tylko jego sfotografowanie. ${hasOpeningHours ? "Przed wyjściem warto zajrzeć do oficjalnych informacji." : "Punkt łatwo włączyć między dwie kolejne etapy."}`,
  ],
  ar: [
    ({ minutes, hasOpeningHours }) => `في المسار، تمنحك ${minutes} وقتاً للقراءة والملاحظة والتصوير بهدوء. ${hasOpeningHours ? "تحقق من الوصول الحالي، فقد تتغير المواعيد أو التذاكر أو الجولات." : "في الزيارة الحرة نسبياً، يؤثر الطقس والضوء كثيراً في التجربة."}`,
    ({ minutes, hasOpeningHours }) => `${minutes} تترك هامشاً لفهم المكان لا لتسجيله فقط. ${hasOpeningHours ? "من الأفضل مراجعة المعلومات الرسمية قبل الانطلاق." : "يمكن إدراج المحطة بسهولة بين مرحلتين."}`,
  ],
  cn: [
    ({ minutes, hasOpeningHours }) => `在路线中留出${minutes}，可以从容阅读、观察和拍照，而不是匆匆打卡。${hasOpeningHours ? "出发前请确认当天开放情况，因为门票、导览或季节时间可能变化。" : "这种较自由的停靠很受天气和光线影响。"}`,
    ({ minutes, hasOpeningHours }) => `${minutes}能让你理解地点，而不只是拍下它。${hasOpeningHours ? "出发前查看官方开放信息会更稳妥。" : "它也适合安排在两个景点之间作为灵活停顿。"}`,
  ],
  ja: [
    ({ minutes, hasOpeningHours }) => `行程では${minutes}ほど見ると、説明を読み、眺めを比べ、写真も落ち着いて撮れます。${hasOpeningHours ? "チケット、ガイド、季節の時間が変わる場合があるため、出発前に最新情報を確認してください。" : "自由度の高い立ち寄りなので、天候と光が印象を大きく左右します。"}`,
    ({ minutes, hasOpeningHours }) => `${minutes}あれば、記録するだけでなく場所を理解する余裕が生まれます。${hasOpeningHours ? "公式情報を事前に見ておくと安心です。" : "二つの目的地の間に組み込みやすい停留点です。"}`,
  ],
};

const closings = {
  fr: [
    ({ name }) => `${name} fonctionne donc comme une étape de compréhension: on y repère des détails précis, mais aussi une manière de sentir le lien entre patrimoine, habitants, visiteurs et paysage.`,
    ({ name }) => `L’intérêt de ${name} tient à cette combinaison entre information et présence physique: le lieu se regarde, se traverse, se photographie, puis continue souvent à éclairer les étapes suivantes.`,
    ({ name }) => `En quittant ${name}, gardez en tête ce que le site révèle de son environnement immédiat; c’est souvent cette relation au quartier, au domaine ou au paysage qui donne le meilleur souvenir.`,
    ({ name }) => `${name} mérite surtout d’être vécu avec attention: quelques minutes de plus transforment une simple halte en vraie lecture du territoire.`,
  ],
  nl: [
    ({ name }) => `${name} blijft daardoor een halte die details, erfgoed, bewoners, bezoekers en landschap met elkaar verbindt.`,
    ({ name }) => `De kracht van ${name} ligt in de combinatie van informatie, aanwezigheid en context.`,
  ],
  en: [
    ({ name }) => `${name} therefore works as a stop for understanding, linking details, heritage, residents, visitors and landscape.`,
    ({ name }) => `The strength of ${name} lies in the mix of information, physical presence and local context.`,
  ],
  de: [
    ({ name }) => `${name} wird so zu einem Halt des Verstehens, der Details, Erbe, Bewohner, Besucher und Landschaft verbindet.`,
    ({ name }) => `Die Stärke von ${name} liegt in der Verbindung von Information, Präsenz und lokalem Kontext.`,
  ],
  it: [
    ({ name }) => `${name} diventa così una sosta di comprensione, tra dettagli, patrimonio, abitanti, visitatori e paesaggio.`,
    ({ name }) => `La forza di ${name} sta nell’unione tra informazione, presenza fisica e contesto locale.`,
  ],
  es: [
    ({ name }) => `${name} funciona así como una parada para comprender, uniendo detalles, patrimonio, vecinos, visitantes y paisaje.`,
    ({ name }) => `La fuerza de ${name} está en la mezcla de información, presencia física y contexto local.`,
  ],
  pl: [
    ({ name }) => `${name} staje się więc punktem zrozumienia, łącząc detale, dziedzictwo, mieszkańców, gości i krajobraz.`,
    ({ name }) => `Siła ${name} tkwi w połączeniu informacji, obecności i lokalnego kontekstu.`,
  ],
  ar: [
    ({ name }) => `لذلك يصبح ${name} محطة للفهم، تربط التفاصيل والتراث والسكان والزوار والمشهد المحيط.`,
    ({ name }) => `تكمن قوة ${name} في الجمع بين المعلومات والحضور المادي والسياق المحلي.`,
  ],
  cn: [
    ({ name }) => `因此，${name}是一个帮助理解的停靠点，把细节、遗产、居民、游客和景观联系起来。`,
    ({ name }) => `${name}的力量在于信息、现场存在感和地方语境的结合。`,
  ],
  ja: [
    ({ name }) => `そのため${name}は、細部、遺産、住民、訪問者、景観を結びつける理解のための立ち寄り先になります。`,
    ({ name }) => `${name}の魅力は、情報、現地での存在感、地域の文脈が重なる点にあります。`,
  ],
};

function rewrite(lang, poi) {
  const name = localized(poi.name, lang);
  const city = poi.city || "Mons";
  const category = localized(poi.category, lang);
  const seed = cleanSeed(localized(poi.description, lang));
  const type = normalizedCategory(poi);
  const intro = pick(intros[lang], poi.id, 1)({ name, city, category });
  const experience = contextualize(lang, name, pick(experiences[type][lang], poi.id, 2), `${poi.id}:experience`);
  const practical = contextualize(lang, name, pick(practicals[lang], poi.id, 3)({
    minutes: minutesText(lang, poi.visitDurationMin),
    hasOpeningHours: poi.hasOpeningHours,
  }), `${poi.id}:practical`);
  const closing = pick(closings[lang], poi.id, 4)({ name, city, category });

  const fallbackSeed = {
    fr: `${name} se découvre par ses détails propres, son ambiance à ${city} et les histoires que son environnement immédiat laisse deviner autour de ce ${category}.`,
    nl: `${name} ontdek je via eigen details, sfeer in ${city} en verhalen die de omgeving rond dit ${category} oproept.`,
    en: `${name} reveals itself through its own details, its atmosphere in ${city} and the stories suggested by the surroundings of this ${category}.`,
    de: `${name} erschließt sich über eigene Details, die Atmosphäre in ${city} und die Geschichten, die die Umgebung dieses Ortes als ${category} anklingen lässt.`,
    it: `${name} si scopre attraverso dettagli propri, atmosfera a ${city} e storie suggerite dall’ambiente di questo ${category}.`,
    es: `${name} se descubre por sus detalles propios, su ambiente en ${city} y las historias que sugiere el entorno de este ${category}.`,
    pl: `${name} odkrywa się przez własne detale, atmosferę w ${city} i historie podpowiadane przez otoczenie tego miejsca jako ${category}.`,
    ar: `يتكشف ${name} من خلال تفاصيله الخاصة وأجوائه في ${city} والقصص التي يوحي بها محيط هذا ${category}.`,
    cn: `${name}的魅力来自自身细节、在${city}的现场氛围，以及这个${category}周边环境所暗示的故事。`,
    ja: `${name}の魅力は、固有の細部、${city}での空気感、そしてこの${category}の周辺から伝わる物語にあります。`,
  };
  const fact = cleanFactPrefix(seed || fallbackSeed[lang], name);

  return [
    `${intro} ${fact}`,
    experience,
    practical,
    closing,
  ].join("\n\n").replace(/\s+\n/g, "\n").trim();
}

const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
for (const poi of data.pois) {
  poi.description = Object.fromEntries(langs.map((lang) => [lang, rewrite(lang, poi)]));
}

fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2) + "\n", "utf8");

const descriptionsByLang = data.pois.flatMap((poi) => langs.map((lang) => ({ lang, text: poi.description[lang] })));
const descriptions = descriptionsByLang.map(({ text }) => text);
const bannedHits = descriptions.flatMap((text) => bannedPatterns.filter((re) => re.test(text)).map((re) => re.source));
const minLengthByLang = { fr: 850, nl: 430, en: 520, de: 460, it: 430, es: 430, pl: 410, ar: 360, cn: 170, ja: 220 };
const lengths = descriptionsByLang.map(({ lang, text }) => ({ lang, len: text.length }));
const shortCount = lengths.filter(({ lang, len }) => len < minLengthByLang[lang]).length;
const sentenceCounts = new Map();
for (const text of descriptions) {
  for (const sentence of text.split(/(?<=[.!?。؟])\s+/).map((s) => s.trim()).filter(Boolean)) {
    sentenceCounts.set(sentence, (sentenceCounts.get(sentence) || 0) + 1);
  }
}
const repeatedSentences = [...sentenceCounts.entries()].filter(([sentence, count]) => count > 12 && sentence.length > 30).length;
if (bannedHits.length || shortCount || repeatedSentences) {
  throw new Error(`Validation failed: ${bannedHits.length} banned phrase(s), ${shortCount} short description(s), ${repeatedSentences} repeated sentence(s).`);
}

console.log(`Rewrote descriptions for ${data.pois.length} POI x ${langs.length} languages.`);
const lengthValues = lengths.map(({ len }) => len);
console.log(`Description length: min ${Math.min(...lengthValues)}, avg ${Math.round(lengthValues.reduce((a, b) => a + b, 0) / lengthValues.length)}, max ${Math.max(...lengthValues)} chars.`);
