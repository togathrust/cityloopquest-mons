import json
import os

base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
with open(os.path.join(base, "translations", "descriptions.json"), encoding="utf-8") as f:
    data = json.load(f)

key = "La Toison d'Or"
out_dir = os.path.join(base, "data", "audio_scripts", "La_Toison_d_Or")
os.makedirs(out_dir, exist_ok=True)

langs = ["fr", "en", "nl", "de", "it", "es", "pl", "ar", "cn", "jp"]
readme = [
    "Scripts audio — La Toison d'Or",
    "",
    "Fichiers MP3 à placer dans le dossier audio/ :",
    "",
]

for lang in langs:
    text = data.get(lang, {}).get(key, "")
    if not text:
        print("MISSING", lang)
        continue
    path = os.path.join(out_dir, f"{lang}.txt")
    with open(path, "w", encoding="utf-8") as out:
        out.write(text)
    print(f"{lang}: {len(text)} chars -> {path}")
    readme.append(
        f"  audio/toison_d_or_{lang}.mp3  <-  data/audio_scripts/La_Toison_d_Or/{lang}.txt"
    )

with open(os.path.join(out_dir, "README.txt"), "w", encoding="utf-8") as r:
    r.write("\n".join(readme))

print("Done.")
