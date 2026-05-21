const TARGET_LANGS = ["fr", "en", "nl", "de", "it", "es", "pl", "ar", "zh", "ja"];

const MYMEMORY = {
  fr: "fr",
  en: "en",
  nl: "nl",
  de: "de",
  it: "it",
  es: "es",
  pl: "pl",
  ar: "ar",
  zh: "zh-CN",
  ja: "ja",
};

function normSource(lang) {
  const l = String(lang || "fr").toLowerCase();
  if (l === "cn") return "zh";
  if (l === "jp") return "ja";
  return TARGET_LANGS.includes(l) ? l : "fr";
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function translateOne(text, from, to) {
  if (from === to) return text;
  const pair = `${MYMEMORY[from] || from}|${MYMEMORY[to] || to}`;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${pair}`;
  const res = await fetch(url);
  if (!res.ok) return text;
  const data = await res.json();
  const out = data?.responseData?.translatedText;
  if (!out || typeof out !== "string") return text;
  if (/QUERY LENGTH LIMIT/i.test(out)) return text;
  return out;
}

/** Traduit une description courte vers les 10 langues de l'app. */
export async function translateDescription(text, sourceLang) {
  const from = normSource(sourceLang);
  const clip = String(text || "").trim().slice(0, 500);
  const descriptions = { [from]: clip };
  const others = TARGET_LANGS.filter((to) => to !== from);

  for (let i = 0; i < others.length; i += 3) {
    const batch = others.slice(i, i + 3);
    await Promise.all(
      batch.map(async (to) => {
        try {
          descriptions[to] = await translateOne(clip, from, to);
        } catch {
          descriptions[to] = clip;
        }
      })
    );
    if (i + 3 < others.length) await delay(300);
  }
  return descriptions;
}

export { TARGET_LANGS, normSource };
