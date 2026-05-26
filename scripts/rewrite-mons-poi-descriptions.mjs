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
  out = out
    .split(/(?<=[.!?。؟])\s+/)
    .filter((sentence) => !/(50\s*km|rayon|within 50|Umkreis|entro 50|menos de 50|promieniu 50|ضمن نطاق|周边50|半径50)/i.test(sentence))
    .filter((sentence) => !/(mérite un véritable arrêt|verdient een echte halte|deserves a real stop|verdient einen bewussten Halt|merita una vera sosta|merece una parada|zasługuje na prawdziwy|يستحق محطة|值得.*专门停留|しっかり立ち寄りたい)/i.test(sentence))
    .filter((sentence) => !/(Cette étape|Deze halte|This stop|Dieser Halt|Questa tappa|Esta parada|Ten przystanek|هذه المحطة|这个停靠点|この立ち寄り先)/i.test(sentence))
    .filter((sentence) => !/(Sur place, le visiteur|Ter plaatse vind je|On site, visitors|Vor Ort findet|Sul posto si trovano|En el lugar se combinan|Na miejscu spotykają|في المكان نفسه|到达现场后|現地では)/i.test(sentence))
    .filter((sentence) => !/(ne se limite pas à un point|more than a point on the map|punt op de kaart|Punkt auf der Karte|punto sulla mappa|punto en el mapa|punkt na mapie|نقطة على الخريطة|地图上的一个点|地図上の点)/i.test(sentence))
    .filter((sentence) => !/(Le meilleur moment|À l’intérieur|Levez les yeux|Regardez l’implantation|La visite se savoure|Approchez-le|Neem vooral|Binnen loont|Kijk omhoog|Let op de ligging|Deze plek beleef|Benader het|The reward comes|Inside, follow|Look up at|Look at the setting|This visit is best|Approach it|Am meisten|Im Inneren|Richten Sie|Achten Sie|Diesen Ort|Betrachten Sie|Il momento migliore|All’interno|Alza lo sguardo|Osserva posizione|La visita si gusta|Avvicinalo|Lo mejor|Dentro, conviene|Levanta la vista|Observa la implantación|La visita se disfruta|Acércate|Najwięcej|W środku warto|Spójrz w górę|Zwróć uwagę|To miejsce najlepiej|Potraktuj|تظهر أجمل|في الداخل|ارفع بصرك|تأمل الموقع|تُستمتع الزيارة|اقترب منه|放慢脚步|进入其中|抬头看|观察它的位置|这里最适合|可以把这里|少し歩み|内部では|空間の広がり|立地、庭園|屋外で味わう|屋外に開かれた)/i.test(sentence))
    .filter((sentence) => !/(Prévoyez environ|Reken op ongeveer|Allow around|Planen Sie etwa|Prevedi circa|Calcula unos|Zaplanuj około|خصص نحو|建议预留约|所要時間の目安)/i.test(sentence))
    .filter((sentence) => !/(Pensez à vérifier|Controleer vooraf|Check opening times|Prüfen Sie vorab|Verifica gli orari|Conviene comprobar|Przed wyjazdem warto|يُفضّل التحقق|建议出发前确认|訪問前に開館時間)/i.test(sentence))
    .join(" ")
    .trim();
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

function durationSentence(lang, minutes, hasOpeningHours) {
  const m = Number(minutes) || 30;
  const opening = {
    fr: hasOpeningHours ? " Pensez à vérifier les horaires avant de partir, surtout hors saison ou les jours fériés." : "",
    nl: hasOpeningHours ? " Controleer vooraf de openingsuren, vooral buiten het seizoen of op feestdagen." : "",
    en: hasOpeningHours ? " Check opening times before you go, especially outside peak season or on public holidays." : "",
    de: hasOpeningHours ? " Prüfen Sie vorab die Öffnungszeiten, besonders außerhalb der Saison oder an Feiertagen." : "",
    it: hasOpeningHours ? " Verifica gli orari prima di partire, soprattutto fuori stagione o nei giorni festivi." : "",
    es: hasOpeningHours ? " Conviene comprobar los horarios antes de ir, sobre todo fuera de temporada o en festivos." : "",
    pl: hasOpeningHours ? " Przed wyjazdem warto sprawdzić godziny otwarcia, zwłaszcza poza sezonem lub w dni świąteczne." : "",
    ar: hasOpeningHours ? " يُفضّل التحقق من مواعيد الفتح قبل الزيارة، خصوصاً خارج الموسم أو في أيام العطل." : "",
    cn: hasOpeningHours ? " 建议出发前确认开放时间，尤其是淡季或节假日。" : "",
    ja: hasOpeningHours ? " 訪問前に開館時間を確認しておくと安心です。特にオフシーズンや祝日は注意してください。" : "",
  };
  const base = {
    fr: `Prévoyez environ ${m} minutes: assez pour regarder, lire les détails et profiter du lieu sans courir.`,
    nl: `Reken op ongeveer ${m} minuten: genoeg om rond te kijken, details te lezen en de plek rustig op te nemen.`,
    en: `Allow around ${m} minutes: enough time to look closely, read the details and enjoy the place without rushing.`,
    de: `Planen Sie etwa ${m} Minuten ein: genug Zeit, um genauer hinzusehen, Details zu lesen und den Ort ohne Eile wirken zu lassen.`,
    it: `Prevedi circa ${m} minuti: il tempo giusto per osservare, leggere i dettagli e goderti il luogo senza fretta.`,
    es: `Calcula unos ${m} minutos: suficiente para mirar con calma, leer los detalles y disfrutar del lugar sin prisas.`,
    pl: `Zaplanuj około ${m} minut: wystarczy, by spokojnie się rozejrzeć, przeczytać szczegóły i poczuć atmosferę miejsca.`,
    ar: `خصص نحو ${m} دقيقة: وقت كافٍ للتأمل وقراءة التفاصيل والاستمتاع بالمكان من دون استعجال.`,
    cn: `建议预留约${m}分钟：足以细看环境、阅读细节，并从容感受这个地点。`,
    ja: `所要時間の目安は約${m}分です。細部を眺め、説明を読み、急がずに場所の雰囲気を味わえます。`,
  };
  return base[lang] + opening[lang];
}

const angles = {
  urban: {
    fr: "Le meilleur moment est souvent celui où l’on ralentit: façades, pavés, perspectives, terrasses et petits détails racontent comment la ville s’est construite et comment elle continue de vivre aujourd’hui.",
    nl: "Neem vooral de tijd om te vertragen: gevels, kasseien, doorkijken, terrassen en kleine details tonen hoe de stad gegroeid is en hoe ze vandaag nog leeft.",
    en: "The reward comes when you slow down: façades, paving stones, views, terraces and small details reveal how the city was built and how it still lives today.",
    de: "Am meisten entdeckt man, wenn man langsamer wird: Fassaden, Pflaster, Blickachsen, Terrassen und kleine Details erzählen, wie die Stadt entstanden ist und heute weiterlebt.",
    it: "Il momento migliore arriva quando rallenti: facciate, pavé, prospettive, terrazze e piccoli dettagli raccontano come la città si è formata e come continua a vivere.",
    es: "Lo mejor aparece al bajar el ritmo: fachadas, adoquines, perspectivas, terrazas y pequeños detalles cuentan cómo nació la ciudad y cómo sigue viviendo hoy.",
    pl: "Najwięcej widać, gdy zwolnisz: fasady, bruk, perspektywy, tarasy i drobne detale pokazują, jak miasto powstawało i jak żyje dziś.",
    ar: "تظهر أجمل التفاصيل عندما تبطئ الخطى: الواجهات والحجارة والمناظير والمقاهي والعناصر الصغيرة تروي كيف تشكلت المدينة وكيف ما زالت تنبض اليوم.",
    cn: "放慢脚步才最有收获：立面、石板路、街景、露台和细节，会讲述城市如何形成，又如何延续今天的生活。",
    ja: "少し歩みをゆるめると魅力が見えてきます。ファサード、石畳、眺め、テラス、小さな細部が、街の成り立ちと現在の息づかいを語ります。",
  },
  museum: {
    fr: "À l’intérieur, prenez le temps de suivre le récit: objets, maquettes, images, archives ou œuvres ne sont pas seulement exposés, ils aident à comprendre un territoire et les personnes qui l’ont façonné.",
    nl: "Binnen loont het om het verhaal te volgen: objecten, maquettes, beelden, archieven of kunstwerken worden niet alleen getoond, ze helpen een streek en haar makers te begrijpen.",
    en: "Inside, follow the story rather than just the display: objects, models, images, archives or artworks help explain a place and the people who shaped it.",
    de: "Im Inneren lohnt es sich, der Erzählung zu folgen: Objekte, Modelle, Bilder, Archive oder Kunstwerke erklären nicht nur sich selbst, sondern auch eine Region und ihre Menschen.",
    it: "All’interno conviene seguire il racconto: oggetti, modelli, immagini, archivi o opere non sono solo esposti, ma aiutano a capire un territorio e chi lo ha modellato.",
    es: "Dentro, conviene seguir el relato: objetos, maquetas, imágenes, archivos u obras no solo se exponen, sino que ayudan a entender un territorio y a quienes lo transformaron.",
    pl: "W środku warto śledzić opowieść: obiekty, makiety, obrazy, archiwa czy dzieła sztuki nie tylko są eksponowane, lecz pomagają zrozumieć miejsce i ludzi, którzy je ukształtowali.",
    ar: "في الداخل، اتبع الحكاية لا المعروضات فقط: القطع والصور والأرشيفات والأعمال تساعد على فهم المكان والناس الذين صنعوا هويته.",
    cn: "进入其中，不妨顺着叙事参观：展品、模型、图像、档案或艺术作品，不只是陈列物，也解释了这片土地与塑造它的人。",
    ja: "内部では展示物を眺めるだけでなく、物語を追ってみてください。資料、模型、写真、アーカイブ、作品が、その土地と人々を理解する手がかりになります。",
  },
  religious: {
    fr: "Levez les yeux vers les volumes, les vitraux, les chapelles ou les matériaux: ces lieux se lisent autant par l’architecture que par le silence, la lumière et les traces de dévotion.",
    nl: "Kijk omhoog naar volumes, glasramen, kapellen en materialen: zulke plekken lees je via architectuur, maar ook via stilte, licht en sporen van devotie.",
    en: "Look up at the volumes, stained glass, chapels and materials: places like this are read through architecture, silence, light and traces of devotion.",
    de: "Richten Sie den Blick auf Raumvolumen, Glasfenster, Kapellen und Materialien: Solche Orte erschließen sich über Architektur, Stille, Licht und Spuren der Andacht.",
    it: "Alza lo sguardo verso volumi, vetrate, cappelle e materiali: luoghi così si leggono attraverso architettura, silenzio, luce e tracce di devozione.",
    es: "Levanta la vista hacia los volúmenes, vidrieras, capillas y materiales: estos lugares se entienden por la arquitectura, el silencio, la luz y las huellas de devoción.",
    pl: "Spójrz w górę na bryły, witraże, kaplice i materiały: takie miejsca czyta się poprzez architekturę, ciszę, światło i ślady pobożności.",
    ar: "ارفع بصرك نحو الأحجام المعمارية والزجاج الملوّن والمصليات والمواد: فهذه الأماكن تُقرأ عبر العمارة والصمت والضوء وآثار التعبد.",
    cn: "抬头看空间、彩窗、小礼拜堂与材料：这类地点不仅靠建筑讲述，也靠寂静、光线与信仰痕迹传递气氛。",
    ja: "空間の広がり、ステンドグラス、礼拝堂、素材に目を向けてください。こうした場所は建築だけでなく、静けさ、光、祈りの痕跡からも読み解けます。",
  },
  castle: {
    fr: "Regardez l’implantation, les jardins, les murs et les accès: un château raconte toujours une relation entre pouvoir, paysage, défense, prestige et art de vivre.",
    nl: "Let op de ligging, tuinen, muren en toegangen: een kasteel vertelt altijd iets over macht, landschap, verdediging, prestige en levensstijl.",
    en: "Look at the setting, gardens, walls and entrances: a castle always tells a story of power, landscape, defence, prestige and ways of living.",
    de: "Achten Sie auf Lage, Gärten, Mauern und Zugänge: Ein Schloss erzählt stets von Macht, Landschaft, Verteidigung, Prestige und Lebensart.",
    it: "Osserva posizione, giardini, mura e accessi: un castello racconta sempre un rapporto tra potere, paesaggio, difesa, prestigio e stile di vita.",
    es: "Observa la implantación, los jardines, los muros y los accesos: un castillo siempre habla de poder, paisaje, defensa, prestigio y formas de vida.",
    pl: "Zwróć uwagę na położenie, ogrody, mury i wejścia: zamek zawsze opowiada o władzy, krajobrazie, obronie, prestiżu i stylu życia.",
    ar: "تأمل الموقع والحدائق والجدران والمداخل: فالقصر أو القلعة يروي دائماً علاقة بين السلطة والمنظر والدفاع والهيبة وفن العيش.",
    cn: "观察它的位置、花园、墙体和入口：城堡总在讲述权力、景观、防御、声望与生活方式之间的关系。",
    ja: "立地、庭園、壁、入口に注目してください。城は常に、権力、景観、防御、威厳、暮らし方の関係を物語ります。",
  },
  nature: {
    fr: "La visite se savoure dehors: lumière, relief, eau, végétation, sons et points de vue changent selon l’heure. C’est un arrêt idéal pour respirer et replacer le patrimoine dans son paysage.",
    nl: "Deze plek beleef je buiten: licht, reliëf, water, begroeiing, geluiden en uitzichten veranderen met het uur. Ideaal om adem te halen en erfgoed in zijn landschap te plaatsen.",
    en: "This visit is best enjoyed outdoors: light, relief, water, vegetation, sounds and viewpoints change with the hour. It is a good place to breathe and see heritage in its landscape.",
    de: "Diesen Ort erlebt man am besten draußen: Licht, Relief, Wasser, Vegetation, Geräusche und Ausblicke verändern sich je nach Tageszeit. Ideal, um durchzuatmen und Kulturerbe in seiner Landschaft zu sehen.",
    it: "La visita si gusta all’aperto: luce, rilievo, acqua, vegetazione, suoni e punti di vista cambiano con l’ora. È una sosta ideale per respirare e collocare il patrimonio nel paesaggio.",
    es: "La visita se disfruta al aire libre: luz, relieve, agua, vegetación, sonidos y miradores cambian según la hora. Es una parada ideal para respirar y situar el patrimonio en su paisaje.",
    pl: "To miejsce najlepiej przeżywa się na zewnątrz: światło, ukształtowanie terenu, woda, roślinność, dźwięki i widoki zmieniają się z godziną. Dobry przystanek, by odetchnąć i zobaczyć dziedzictwo w krajobrazie.",
    ar: "تُستمتع الزيارة هنا في الهواء الطلق: الضوء والتضاريس والماء والنباتات والأصوات والمناظر تتغير مع الوقت. إنها محطة مثالية للتنفس ورؤية التراث داخل مشهده الطبيعي.",
    cn: "这里最适合在户外慢慢感受：光线、地形、水面、植被、声音和视角会随时间变化。它适合放慢呼吸，把遗产放回景观中理解。",
    ja: "屋外で味わう場所です。光、地形、水、植生、音、眺めは時間によって変化します。深呼吸し、景観の中で遺産を捉えるのに向いています。",
  },
  heritage: {
    fr: "Approchez-le comme une page d’histoire à ciel ouvert: matériaux, machines, lignes de force, traces industrielles ou symboles civiques révèlent ce que la région a produit, défendu et transmis.",
    nl: "Benader het als een open geschiedenisboek: materialen, machines, krachtlijnen, industriële sporen of burgerlijke symbolen tonen wat de regio heeft gemaakt, verdedigd en doorgegeven.",
    en: "Approach it as an open-air page of history: materials, machines, strong lines, industrial traces or civic symbols reveal what the region produced, defended and passed on.",
    de: "Betrachten Sie den Ort wie eine Geschichtsseite unter freiem Himmel: Materialien, Maschinen, Linien, industrielle Spuren oder bürgerliche Symbole zeigen, was die Region hervorgebracht und weitergegeben hat.",
    it: "Avvicinalo come una pagina di storia a cielo aperto: materiali, macchine, linee di forza, tracce industriali o simboli civici rivelano ciò che la regione ha prodotto e trasmesso.",
    es: "Acércate como a una página de historia al aire libre: materiales, máquinas, líneas de fuerza, huellas industriales o símbolos cívicos revelan lo que la región produjo, defendió y transmitió.",
    pl: "Potraktuj to miejsce jak otwartą księgę historii: materiały, maszyny, linie konstrukcji, ślady przemysłu czy symbole obywatelskie pokazują, co region tworzył, chronił i przekazywał dalej.",
    ar: "اقترب منه كصفحة تاريخ مفتوحة: المواد والآلات والخطوط القوية والآثار الصناعية أو الرموز المدنية تكشف ما أنتجته المنطقة ودافعت عنه ونقلته.",
    cn: "可以把这里当作一页露天历史来读：材料、机器、线条、工业痕迹或城市象征，揭示了这个地区曾生产、守护并传承的东西。",
    ja: "屋外に開かれた歴史の一頁として見てみましょう。素材、機械、構造線、産業の痕跡、市民的象徴が、この地域が生み、守り、伝えてきたものを示します。",
  },
};

function rewrite(lang, poi) {
  const name = localized(poi.name, lang);
  const city = poi.city || "Mons";
  const category = localized(poi.category, lang);
  const seed = cleanSeed(localized(poi.description, lang));
  const type = normalizedCategory(poi);
  const angle = angles[type][lang];
  const duration = durationSentence(lang, poi.visitDurationMin, poi.hasOpeningHours);

  const fallbackSeed = {
    fr: "Le lieu se découvre par ses détails, son ambiance et les histoires qu’il laisse deviner autour de lui.",
    nl: "De plek ontdek je via details, sfeer en de verhalen die ze om zich heen oproept.",
    en: "The place reveals itself through details, atmosphere and the stories suggested by its surroundings.",
    de: "Der Ort erschließt sich über Details, Atmosphäre und die Geschichten, die seine Umgebung anklingen lässt.",
    it: "Il luogo si scopre attraverso dettagli, atmosfera e storie suggerite da ciò che lo circonda.",
    es: "El lugar se descubre por sus detalles, su ambiente y las historias que sugiere el entorno.",
    pl: "Miejsce odkrywa się przez detale, atmosferę i historie, które podpowiada jego otoczenie.",
    ar: "يتكشف المكان من خلال تفاصيله وأجوائه والقصص التي يوحي بها محيطه.",
    cn: "这个地点的魅力来自细节、氛围，以及周围环境所暗示的故事。",
    ja: "この場所の魅力は、細部、空気感、周囲から伝わる物語の中にあります。",
  };
  const fact = seed || fallbackSeed[lang];

  const intros = {
    fr: `${name} mérite un véritable arrêt lors d’une découverte de ${city}. ${fact}`,
    nl: `${name} verdient een echte halte tijdens een bezoek aan ${city}. ${fact}`,
    en: `${name} deserves a real stop during a visit to ${city}. ${fact}`,
    de: `${name} verdient einen bewussten Halt bei einem Besuch in ${city}. ${fact}`,
    it: `${name} merita una vera sosta durante una visita a ${city}. ${fact}`,
    es: `${name} merece una parada de verdad durante una visita a ${city}. ${fact}`,
    pl: `${name} zasługuje na prawdziwy przystanek podczas odkrywania ${city}. ${fact}`,
    ar: `${name} يستحق محطة حقيقية أثناء زيارة ${city}. ${fact}`,
    cn: `${name}值得在游览${city}时专门停留。${fact}`,
    ja: `${name}は、${city}を訪れるならしっかり立ち寄りたい場所です。${fact}`,
  };

  const transitions = {
    fr: `Sur place, le visiteur trouve à la fois un repère culturel, une ambiance locale et souvent une belle occasion de photo.`,
    nl: `Ter plaatse vind je tegelijk een cultureel herkenningspunt, lokale sfeer en vaak ook een mooi fotomoment.`,
    en: `On site, visitors find a cultural landmark, local atmosphere and often a strong photo opportunity.`,
    de: `Vor Ort findet man zugleich einen kulturellen Orientierungspunkt, lokale Atmosphäre und oft ein schönes Fotomotiv.`,
    it: `Sul posto si trovano un riferimento culturale, atmosfera locale e spesso una bella occasione fotografica.`,
    es: `En el lugar se combinan referencia cultural, ambiente local y a menudo una buena ocasión para fotografiar.`,
    pl: `Na miejscu spotykają się punkt kulturowy, lokalna atmosfera i często dobra okazja do zdjęć.`,
    ar: `في المكان نفسه يجد الزائر علامة ثقافية وأجواء محلية وفرصة جميلة للتصوير في كثير من الأحيان.`,
    cn: `到达现场后，游客能感受到文化地标、地方氛围，也常常能找到适合拍照的角度。`,
    ja: `現地では、文化的な目印、土地の雰囲気、写真に残したくなる視点が重なります。`,
  };

  return [intros[lang], transitions[lang], angle, duration].join("\n\n").replace(/\s+\n/g, "\n").trim();
}

const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
for (const poi of data.pois) {
  poi.description = Object.fromEntries(langs.map((lang) => [lang, rewrite(lang, poi)]));
}

fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log(`Rewrote descriptions for ${data.pois.length} POI x ${langs.length} languages.`);
