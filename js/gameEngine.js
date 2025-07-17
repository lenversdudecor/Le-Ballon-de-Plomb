// js/gameEngine.js
import { db, ref, set, onValue } from "./firebase.js";

// --- CONFIGURATION ---
const TOURS_TOTAL = 5;
const TEMPS_PAR_TOUR = 60; // secondes
const INDICES = [
  "Le joueur #2 aime la presse écrite...",
  "Le joueur #4 suit beaucoup les conférences...",
  "Le joueur #7 a voté très tôt au dernier tour...",
  "Un journaliste se cache parmi les pseudos courts...",
  "Certains joueurs votent toujours pour le même candidat...",
  "Le joueur qui parle peu a peut-être quelque chose à cacher...",
  "Un joueur a changé son vote à chaque tour...",
  "Les journalistes semblent voter groupés...",
  "Un supporter a défendu le mauvais joueur...",
  "Quelqu’un essaie de manipuler la discussion..."
];

// --- ÉTAT DE LA PARTIE ---
let currentTour = 1;
let roles = {}; // {pseudo: "supporter" ou "journaliste"}
let joueurCible = ""; // Ballon d'Or (objectif des supporters)
let joueurLeurre = ""; // Leurre (objectif des journalistes)
let timer = null;

// --- 🔁 Utilitaire de mélange
function shuffle(array) {
  let a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// --- 🎭 Attribution des rôles (à lancer par le créateur)
export function assignRoles(roomCode, joueurs) {
  const total = Object.keys(joueurs).length;
  const nbJournalistes = Math.floor(total / 2);
  const tous = shuffle(Object.keys(joueurs));
  const journalistes = tous.slice(0, nbJournalistes);
  const supporters = tous.slice(nbJournalistes);

  tous.forEach((pseudo) => {
    roles[pseudo] = journalistes.includes(pseudo) ? "journaliste" : "supporter";
    set(ref(db, `rooms/${roomCode}/roles/${pseudo}`), roles[pseudo]);
  });

  // Sélection des objectifs
  const candidats = ["Messi", "Mbappé", "Modric", "Haaland", "Kane", "Griezmann"];
  joueurCible = candidats[Math.floor(Math.random() * candidats.length)];
  do {
    joueurLeurre = candidats[Math.floor(Math.random() * candidats.length)];
  } while (joueurLeurre === joueurCible);

  set(ref(db, `rooms/${roomCode}/objectif`), {
    vrai: joueurCible,
    leurre: joueurLeurre,
    tourActuel: 1
  });
}

// --- 🧠 Lancer automatiquement tous les tours
export function lancerTourAuto(roomCode) {
  currentTour = 1;

  const lancerUnTour = () => {
    if (currentTour > TOURS_TOTAL) {
      clearInterval(timer);
      afficherResultatFinal(roomCode);
      return;
    }

    const indice = INDICES[Math.floor(Math.random() * INDICES.length)];
    set(ref(db, `rooms/${roomCode}/tour/${currentTour}`), {
      indice,
      tour: currentTour,
      timestamp: Date.now()
    });

    console.log(`🧠 Tour ${currentTour} lancé avec indice : ${indice}`);
    currentTour++;
  };

  lancerUnTour(); // Démarre immédiatement
  timer = setInterval(lancerUnTour, TEMPS_PAR_TOUR * 1000);
}

// --- 🎬 Révélation finale
export function afficherResultatFinal(roomCode) {
  const rolesRef = ref(db, `rooms/${roomCode}/roles`);
  const objectifRef = ref(db, `rooms/${roomCode}/objectif`);
  const playersRef = ref(db, `rooms/${roomCode}/players`);

  onValue(rolesRef, (snapRoles) => {
    const allRoles = snapRoles.val() || {};

    onValue(objectifRef, (snapObj) => {
      const obj = snapObj.val();
      const vrai = obj?.vrai;
      const leurre = obj?.leurre;

      onValue(playersRef, (snapPlayers) => {
        const players = snapPlayers.val() || {};

        let message = "🎭 Fin du jeu !\n\n";
        message += `🎯 Objectif Supporters : élire ${vrai}\n`;
        message += `🕵️‍♂️ Objectif Journalistes : élire ${leurre}\n\n`;

        Object.entries(allRoles).forEach(([pseudo, role]) => {
          const country = players[pseudo]?.country || "";
          message += `${country} ${pseudo} ➜ ${role.toUpperCase()}\n`;
        });

        alert(message);
      });
    });
  });
}

