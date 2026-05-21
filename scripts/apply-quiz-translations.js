/**
 * Applique les traductions nl, de, it, es, pl, ar, cn, jp depuis les fichiers
 * quiz_lang_XX.json en conservant les réponses (answer) du français.
 * Usage: node scripts/apply-quiz-translations.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const quizPath = path.join(__dirname, '../translations/quiz_translations.json');
const quizDistPath = path.join(__dirname, '../dist/translations/quiz_translations.json');
const langDir = path.join(__dirname, '../translations/quiz_lang');

const quiz = JSON.parse(fs.readFileSync(quizPath, 'utf8'));
const pois = Object.keys(quiz.fr);
const targetLangs = ['es', 'nl', 'de', 'it', 'pl', 'ar', 'cn', 'jp'];

for (const lang of targetLangs) {
  const filePath = path.join(langDir, `${lang}.json`);
  if (!fs.existsSync(filePath)) {
    console.warn('Manquant:', filePath);
    continue;
  }
  const langData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  for (const poi of pois) {
    if (!langData[poi] || !Array.isArray(langData[poi])) continue;
    for (let q = 0; q < quiz.fr[poi].length; q++) {
      quiz[lang][poi][q] = {
        question: langData[poi][q].question,
        options: langData[poi][q].options,
        answer: quiz.fr[poi][q].answer,
      };
    }
  }
  console.log('Appliqué:', lang);
}

fs.writeFileSync(quizPath, JSON.stringify(quiz, null, 2), 'utf8');
console.log('Écrit:', quizPath);
if (fs.existsSync(path.dirname(quizDistPath))) {
  fs.writeFileSync(quizDistPath, JSON.stringify(quiz, null, 2), 'utf8');
  console.log('Écrit:', quizDistPath);
}
