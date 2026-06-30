/**
 * Ajoute le POI "La Toison d'Or" aux descriptions, quizData et quiz_translations.
 * Usage: node scripts/add-toison-poi.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const POI_KEY = "La Toison d'Or";

const langsDescriptions = ["fr", "en", "nl", "de", "it", "es", "pl", "ar", "cn", "jp"];
const langsI18n = ["en", "nl", "de", "it", "es", "pl", "ar", "cn", "jp"];

function readFrenchText() {
  const raw = fs.readFileSync(path.join(root, "data", "La_Toison_d_Or.txt"), "utf8");
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n\n");
}

function patchDescriptions(frText, i18n) {
  const filePath = path.join(root, "translations", "descriptions.json");
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

  for (const lang of langsDescriptions) {
    if (!data[lang]) {
      throw new Error(`Missing language section in descriptions.json: ${lang}`);
    }
    const text = lang === "fr" ? frText : i18n[lang];
    if (!text) {
      throw new Error(`Missing translation for ${lang}`);
    }
    data[lang][POI_KEY] = text;
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

const quizFr = [
  {
    question: "À quel ordre de chevalerie renvoie le nom de la Maison de la Toison d'Or ?",
    options: [
      "L'ordre des Chevaliers du Waffle de Namur",
      "L'Ordre de la Toison d'Or, fondé au XVe siècle par Philippe le Bon",
      "La confrérie des fans du Singe du Grand'Garde"
    ],
    answer: 1
  },
  {
    question: "De quel style date principalement la façade de la Maison de la Toison d'Or ?",
    options: [
      "Du style Renaissance du début du XVIIe siècle, en briques et pierre bleue",
      "Du néo-baroque flamboyant avec pigeons dorés",
      "Du gothique civil du XVIe siècle à trois niveaux dégressifs"
    ],
    answer: 0
  },
  {
    question: "Quelle anecdote lie la Toison d'Or au Café du Commerce ?",
    options: [
      "Les serveurs changeaient de maison selon la couleur des blasons",
      "Une salle voisine aurait servi d'annexe au débit de boisson lors des jours d'affluence, avant 1892",
      "Le café servait exclusivement de la bière teinte en or pour la Ducasse"
    ],
    answer: 1
  }
];

const quizTranslations = {
  fr: quizFr,
  en: [
    {
      question: "Which order of chivalry does the name Maison de la Toison d'Or refer to?",
      options: [
        "The Order of the Waffle Knights of Namur",
        "The Order of the Golden Fleece, founded in the 15th century by Philip the Good",
        "The Brotherhood of Singe du Grand'Garde Fans"
      ],
      answer: 1
    },
    {
      question: "What style is the façade of the Maison de la Toison d'Or mainly from?",
      options: [
        "Early 17th-century Renaissance, in brick and blue stone",
        "Flamboyant neo-Baroque with golden pigeons",
        "16th-century civic Gothic with three stepped levels"
      ],
      answer: 0
    },
    {
      question: "Which anecdote links the Golden Fleece to the Café du Commerce?",
      options: [
        "Waiters changed houses depending on the colour of the coats of arms",
        "A neighbouring room is said to have served as an annex to the drinking establishment on busy days, before 1892",
        "The café served only beer dyed gold for the Ducasse"
      ],
      answer: 1
    }
  ],
  nl: [
    {
      question: "Naar welke ridderorde verwijst de naam van het Huis van het Gulden Vlies?",
      options: [
        "De Orde van de Wafelridders van Namen",
        "De Orde van het Gulden Vlies, in de 15e eeuw gesticht door Filips de Goede",
        "De broederschap van fans van de Aap van de Grote Wacht"
      ],
      answer: 1
    },
    {
      question: "Uit welke stijl dateert vooral de gevel van het Huis van het Gulden Vlies?",
      options: [
        "Vroege 17e-eeuwse Renaissance, in baksteen en blauwe hardsteen",
        "Flamboyant neobarok met gouden duiven",
        "16e-eeuwse burgerlijke gotiek met drie afnemende niveaus"
      ],
      answer: 0
    },
    {
      question: "Welke anekdote verbindt het Gulden Vlies met het Café du Commerce?",
      options: [
        "Kelners wisselden van huis naargelang de kleur van de wapenschilden",
        "Een naburige zaal zou op drukke dagen vóór 1892 als annex van de drankgelegenheid hebben gediend",
        "Het café serveerde uitsluitend voor de Ducasse goudgekleurd bier"
      ],
      answer: 1
    }
  ],
  de: [
    {
      question: "Auf welchen Ritterorden verweist der Name Haus vom Goldenen Vlies?",
      options: [
        "Den Orden der Waffelritter von Namur",
        "Den Orden vom Goldenen Vlies, im 15. Jahrhundert von Philipp dem Guten gegründet",
        "Die Bruderschaft der Fans des Affen vom Grand'Garde"
      ],
      answer: 1
    },
    {
      question: "Aus welchem Stil stammt die Fassade des Hauses vom Goldenen Vlies vor allem?",
      options: [
        "Frühe Renaissance des 17. Jahrhunderts, aus Ziegel und blauem Stein",
        "Flamboyanter Neobarock mit goldenen Tauben",
        "Bürgerliche Gotik des 16. Jahrhunderts mit drei abgestuften Ebenen"
      ],
      answer: 0
    },
    {
      question: "Welche Anekdote verbindet das Goldene Vlies mit dem Café du Commerce?",
      options: [
        "Kellner wechselten je nach Farbe der Wappen das Haus",
        "Ein Nachbarraum soll an vollen Tagen vor 1892 als Annex der Schankwirtschaft gedient haben",
        "Das Café servierte ausschließlich für die Ducasse goldgefärbtes Bier"
      ],
      answer: 1
    }
  ],
  it: [
    {
      question: "A quale ordine cavalleresco rimanda il nome della Maison de la Toison d'Or?",
      options: [
        "L'ordine dei Cavalieri del Waffle di Namur",
        "L'Ordine della Toison d'Or, fondato nel XV secolo da Filippo il Buono",
        "La confraternita dei fan della Scimmia del Grand'Garde"
      ],
      answer: 1
    },
    {
      question: "Di quale stile è principalmente la facciata della Maison de la Toison d'Or?",
      options: [
        "Rinascimento di inizio Seicento, in mattoni e pietra blu",
        "Neobarocco fiammeggiante con piccioni dorati",
        "Gotico civile del XVI secolo a tre livelli digradanti"
      ],
      answer: 0
    },
    {
      question: "Quale aneddoto lega la Toison d'Or al Café du Commerce?",
      options: [
        "I camerieri cambiavano casa secondo il colore degli stemmi",
        "Una sala vicina sarebbe servita, nei giorni di affluenza prima del 1892, da annesso al locale",
        "Il caffè serviva esclusivamente birra tinta d'oro per la Ducasse"
      ],
      answer: 1
    }
  ],
  es: [
    {
      question: "¿A qué orden de caballería remite el nombre de la Maison de la Toison d'Or?",
      options: [
        "La orden de los Caballeros del Waffle de Namur",
        "La Orden de la Toison d'Or, fundada en el siglo XV por Felipe el Bueno",
        "La cofradía de fans del Mono del Grand'Garde"
      ],
      answer: 1
    },
    {
      question: "¿De qué estilo es principalmente la fachada de la Maison de la Toison d'Or?",
      options: [
        "Renacimiento de principios del siglo XVII, en ladrillo y piedra azul",
        "Neobarroco flamígero con palomas doradas",
        "Gótico civil del siglo XVI con tres niveles decrecientes"
      ],
      answer: 0
    },
    {
      question: "¿Qué anécdota une la Toison d'Or al Café du Commerce?",
      options: [
        "Los camareros cambiaban de casa según el color de los blasones",
        "Una sala vecina habría servido de anexo al establecimiento en días de gran afluencia, antes de 1892",
        "El café servía exclusivamente cerveza teñida de oro para la Ducasse"
      ],
      answer: 1
    }
  ],
  pl: [
    {
      question: "Do jakiego orderu rycerskiego odnosi się nazwa Maison de la Toison d'Or?",
      options: [
        "Do Zakonu Rycerzy Wafli z Namur",
        "Do Orderu Złotego Runa, założonego w XV wieku przez Filipa Dobrego",
        "Do bractwa fanów Małpy Grand'Garde"
      ],
      answer: 1
    },
    {
      question: "Z jakiego stylu pochodzi głównie fasada Maison de la Toison d'Or?",
      options: [
        "Renesansu z początku XVII wieku, z cegły i niebieskiego kamienia",
        "Flamboyantowego neobaroku ze złotymi gołębiami",
        "Mieszczańskiego gotyku XVI wieku z trzema stopniowanymi kondygnacjami"
      ],
      answer: 0
    },
    {
      question: "Jaka anegdota łączy Toison d'Or z Café du Commerce?",
      options: [
        "Kelnerzy zmieniali dom w zależności od koloru herbów",
        "Sąsiednia sala miała podobno służyć przed 1892 rokiem jako aneks lokalu w dni dużego natężenia",
        "Kawiarnia serwowała wyłącznie piwo barwione na złoto na Ducasse"
      ],
      answer: 1
    }
  ],
  ar: [
    {
      question: "إلى أي وسام فروسية يشير اسم بيت التوسان دور؟",
      options: [
        "وسام فرسان الوافل في نامور",
        "وسام التوسان دور، تأسس في القرن الخامس عشر على يد فيليب الصالح",
        "أخوية معجبي قرد الغراند غارد"
      ],
      answer: 1
    },
    {
      question: "من أي طراز تعود واجهة بيت التوسان دور أساساً؟",
      options: [
        "النهضة في أوائل القرن السابع عشر، من الطوب والحجر الأزرق",
        "الباروك المتوهج مع حمام ذهبي",
        "القوطية المدنية من القرن السادس عشر بثلاثة مستويات متدرجة"
      ],
      answer: 0
    },
    {
      question: "أي حكاية تربط التوسان دور بمقهى التجارة؟",
      options: [
        "كان النادلون يغيرون البيت حسب لون الشعارات",
        "يُقال إن قاعة مجاورة كانت تخدم كملحق للمشروبات في أيام الازدحام قبل 1892",
        "كان المقهى يقدم حصراً بيرة ملونة بالذهب للدوكاس"
      ],
      answer: 1
    }
  ],
  cn: [
    {
      question: "金羊毛之家的名称指向哪个骑士团？",
      options: [
        "那慕尔华夫饼骑士团",
        "十五世纪由菲利普三世（善者）创立的金羊毛骑士团",
        "大守卫猿粉丝兄弟会"
      ],
      answer: 1
    },
    {
      question: "金羊毛之家立面主要属于哪种风格？",
      options: [
        "十七世纪初文艺复兴风格，砖与蓝石",
        "带金色鸽子的火焰式新巴洛克",
        "十六世纪三层递减的市民哥特式"
      ],
      answer: 0
    },
    {
      question: "哪则轶事将金羊毛与商业咖啡馆联系起来？",
      options: [
        "侍者根据纹章颜色换屋工作",
        "1892年前客流高峰日，邻近厅堂据说曾作酒类的附属空间",
        "咖啡馆杜卡斯期间只供应染成金色的啤酒"
      ],
      answer: 1
    }
  ],
  jp: [
    {
      question: "金羊毛の家の名はどの騎士団を指しますか？",
      options: [
        "ナミュールのワッフル騎士団",
        "15世紀に善良公フィリップによって設立された金羊毛勲章",
        "グラン＝ガルドの猿ファンクラブ"
      ],
      answer: 1
    },
    {
      question: "金羊毛の家のファサードは主にどの様式ですか？",
      options: [
        "17世紀初頭のルネサンス、レンガと青石",
        "金色の鳩付きフランボワヤン・ネオバロック",
        "三段の段差を持つ16世紀市民ゴシック"
      ],
      answer: 0
    },
    {
      question: "金羊毛とコマース・カフェを結ぶ逸話はどれですか？",
      options: [
        "紋章の色に応じて給仕が家を替えた",
        "1892年以前、混雑日には隣の部屋が飲食店の別館になったとされる",
        "ドゥカス用に金色に染めたビールだけを提供した"
      ],
      answer: 1
    }
  ]
};

function formatQuizEntry(questions) {
  const lines = questions.map((q) => {
    const opts = q.options
      .map((opt) => `        "${opt.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`)
      .join(",\n");
    return `    {
      question: "${q.question.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}",
      options: [
${opts}
      ],
      answer: ${q.answer}
    }`;
  });
  return `  "${POI_KEY}": [\n${lines.join(",\n")}\n  ]`;
}

function patchQuizData() {
  const filePath = path.join(root, "quizData.js");
  let content = fs.readFileSync(filePath, "utf8");

  if (content.includes(`"${POI_KEY}"`)) {
    console.log(`quizData.js already contains "${POI_KEY}" — skipping.`);
    return;
  }

  const marker = "\n};";
  const idx = content.lastIndexOf(marker);
  if (idx === -1) {
    throw new Error("Could not find closing }; in quizData.js");
  }

  const entry = `\n\n${formatQuizEntry(quizFr)}\n`;
  content = content.slice(0, idx) + entry + content.slice(idx);
  fs.writeFileSync(filePath, content, "utf8");
}

function patchQuizTranslations() {
  const filePath = path.join(root, "translations", "quiz_translations.json");
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

  for (const lang of langsDescriptions) {
    if (!data[lang]) {
      throw new Error(`Missing language section in quiz_translations.json: ${lang}`);
    }
    if (data[lang][POI_KEY]) {
      console.log(`quiz_translations.json[${lang}] already contains "${POI_KEY}" — skipping.`);
      continue;
    }
    data[lang][POI_KEY] = quizTranslations[lang];
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function main() {
  const frText = readFrenchText();
  const i18n = JSON.parse(
    fs.readFileSync(path.join(root, "translations", "toison_dor_i18n.json"), "utf8")
  );

  for (const lang of langsI18n) {
    if (!i18n[lang]) {
      throw new Error(`Missing key in toison_dor_i18n.json: ${lang}`);
    }
  }

  patchDescriptions(frText, i18n);
  patchQuizData();
  patchQuizTranslations();

  console.log(`Added "${POI_KEY}" to descriptions.json (${langsDescriptions.length} langs).`);
  console.log(`Added "${POI_KEY}" to quizData.js (3 questions, FR).`);
  console.log(`Added "${POI_KEY}" to quiz_translations.json (${langsDescriptions.length} langs).`);
}

main();
