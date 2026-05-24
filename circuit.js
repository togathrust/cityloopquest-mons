// Suppression de la déclaration de circuits car elle est déjà définie dans app.js et map.js
// const circuits = {
//   grand: [...Array(59).keys()].map(i => i + 1),
//   moyen: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 28, 29, 34, 35, 36, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59],
//   petit: [1, 2, 3, 5, 6, 11, 12, 13, 14, 15, 16, 17, 10, 18, 19, 20, 21, 22, 23, 24, 25, 26, 28, 29, 34, 35, 49, 50, 51, 52, 54, 53, 55, 56, 57, 58, 59]
// };

function confirmYes() {
  localStorage.setItem('selectedCircuit', selectedCircuit);
  // Définir le type de parcours pour le selfie
  const parcoursType = {
    grand: 'long',
    petit: 'court'
  }[selectedCircuit];
  localStorage.setItem('mons_parcoursType', parcoursType);

  setTimeout(() => {
    window.location.href = 'main.html';
  }, 500);
}
