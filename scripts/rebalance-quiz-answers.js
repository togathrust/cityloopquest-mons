/**
 * Rééquilibre les réponses du quiz : 1/3 à la position 0, 1/3 à 1, 1/3 à 2.
 * Réordonne les options pour chaque question (sans changer les textes).
 * Même nouvelle position pour une même question dans toutes les langues.
 * Usage: node scripts/rebalance-quiz-answers.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const quizPath = path.join(__dirname, '../translations/quiz_translations.json');
const quizDistPath = path.join(__dirname, '../dist/translations/quiz_translations.json');

const data = JSON.parse(fs.readFileSync(quizPath, 'utf8'));
const langs = Object.keys(data);
const pois = Object.keys(data.fr);
const numSlots = pois.length * 3;

// Construire une liste [0,0,...,1,1,...,2,2,...] puis mélanger (Fisher-Yates) pour éviter un cycle
const third = Math.floor(numSlots / 3);
let targetAnswers = [
  ...Array(third).fill(0),
  ...Array(third).fill(1),
  ...Array(numSlots - 2 * third).fill(2),
];
// Fisher-Yates shuffle (seed fixe pour reproductibilité, ou sans seed pour aléatoire)
for (let i = targetAnswers.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [targetAnswers[i], targetAnswers[j]] = [targetAnswers[j], targetAnswers[i]];
}

function reorderOptions(options, currentAnswer, newAnswer) {
  const correct = options[currentAnswer];
  const others = options.filter((_, i) => i !== currentAnswer);
  const newOptions = [];
  let otherIdx = 0;
  for (let i = 0; i < 3; i++) {
    if (i === newAnswer) {
      newOptions[i] = correct;
    } else {
      newOptions[i] = others[otherIdx++];
    }
  }
  return newOptions;
}

for (const lang of langs) {
  for (let poiIdx = 0; poiIdx < pois.length; poiIdx++) {
    const poi = pois[poiIdx];
    const questions = data[lang][poi];
    if (!Array.isArray(questions)) continue;
    for (let qIdx = 0; qIdx < questions.length; qIdx++) {
      const slot = poiIdx * 3 + qIdx;
      const newAnswer = targetAnswers[slot];
      const q = questions[qIdx];
      const currentAnswer = q.answer;
      if (currentAnswer === newAnswer) continue;
      q.options = reorderOptions(q.options, currentAnswer, newAnswer);
      q.answer = newAnswer;
    }
  }
}

fs.writeFileSync(quizPath, JSON.stringify(data, null, 2), 'utf8');
console.log('Écrit:', quizPath);

if (fs.existsSync(path.dirname(quizDistPath))) {
  fs.writeFileSync(quizDistPath, JSON.stringify(data, null, 2), 'utf8');
  console.log('Écrit:', quizDistPath);
}

// Stats (une langue suffit, même répartition partout)
const counts = { 0: 0, 1: 0, 2: 0 };
for (const poi of pois) {
  const questions = data.fr[poi];
  if (!Array.isArray(questions)) continue;
  for (const q of questions) counts[q.answer]++;
}
console.log('Répartition des réponses (fr):', counts);
