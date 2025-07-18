import { db, ref, set, onValue, remove } from "./firebase.js";

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
let roles = {};
let joueurCible = "";
let joueurLeurre = "";
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

// --- 🎭 Attribution des rôles
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

// --- 🔁 Lancer les tours automatiquement
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

  lancerUnTour();
  timer = setInterval(lancerUnTour, TEMPS_PAR_TOUR * 1000);
}

// --- 🧹 Reset d'une partie (sans recharger la page)
export function resetGameState(roomCode) {
  const baseRef = ref(db, `rooms/${roomCode}`);
  remove(ref(baseRef, "votes"));
  remove(ref(baseRef, "tour"));
  remove(ref(baseRef, "objectif"));
  remove(ref(baseRef, "roles"));
  remove(ref(baseRef, "privateChat"));
  set(ref(baseRef, "chat"), {});
}

// --- 🎬 Affichage final dans #resultPanel
export function afficherResultatFinal(roomCode) {
  const rolesRef = ref(db, `rooms/${roomCode}/roles`);
  const objectifRef = ref(db, `rooms/${roomCode}/objectif`);
  const playersRef = ref(db, `rooms/${roomCode}/players`);
  const voteRef = ref(db, `rooms/${roomCode}/votes`);

  onValue(rolesRef, (snapRoles) => {
    const allRoles = snapRoles.val() || {};

    onValue(objectifRef, (snapObj) => {
      const obj = snapObj.val();
      const vrai = obj?.vrai;
      const leurre = obj?.leurre;

      onValue(playersRef, (snapPlayers) => {
        const players = snapPlayers.val() || {};

        onValue(voteRef, (snapVotes) => {
          const allVotes = snapVotes.val() || {};

          const scores = {};
          Object.values(allVotes).forEach(v => {
            scores[v.joueur] = (scores[v.joueur] || 0) + 1;
          });

          const resultPanel = document.getElementById("resultPanel");
          if (!resultPanel) return;

          resultPanel.innerHTML = `
            <h3>🎭 Résultat final</h3>
            <p><strong>🎯 Objectif Supporters :</strong> ${vrai}</p>
            <p><strong>🕵️‍♂️ Objectif Journalistes :</strong> ${leurre}</p>
            <h4>🎤 Votes :</h4>
            <ul>${Object.entries(scores).map(([j, s]) => `<li>${j} : ${s} vote(s)</li>`).join("")}</ul>
            <h4>👥 Rôles :</h4>
            <ul>${Object.entries(allRoles).map(([p, r]) => {
              const flag = players[p]?.country || "";
              return `<li>${flag} <strong>${p}</strong> ➜ ${r.toUpperCase()}</li>`;
            }).join("")}</ul>
          `;

          resultPanel.classList.remove("hidden");
        });
      });
    });
  });
}


