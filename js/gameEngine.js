// gameEngine.js
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

// --- ÉTAT LOCAL ---
let currentTour = 1;
let timer = null;

// --- 🔁 Mélange
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
    const role = journalistes.includes(pseudo) ? "journaliste" : "supporter";
    set(ref(db, `rooms/${roomCode}/roles/${pseudo}`), role);
  });

  const candidats = ["Messi", "Mbappé", "Modric", "Haaland", "Kane", "Griezmann"];
  let vrai = candidats[Math.floor(Math.random() * candidats.length)];
  let leurre;
  do {
    leurre = candidats[Math.floor(Math.random() * candidats.length)];
  } while (leurre === vrai);

  set(ref(db, `rooms/${roomCode}/objectif`), {
    vrai,
    leurre,
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

    // Annonce dans le chat
    const chatRef = push(ref(db, `rooms/${roomCode}/chat`));
    set(chatRef, {
      pseudo: "🧠 Système",
      message: `Indice du tour ${currentTour} : ${indice}`,
      timestamp: Date.now()
    });

    let timeLeft = TEMPS_PAR_TOUR;
    const timerDiv = document.getElementById("timerDisplay");

    const intervalId = setInterval(() => {
      if (!timerDiv) return;

      // Format MM:SS
      const minutes = Math.floor(timeLeft / 60);
      const seconds = (timeLeft % 60).toString().padStart(2, '0');
      timerDiv.textContent = `⏳ Temps restant : ${minutes}:${seconds}`;

      // Mise à jour des couleurs
      timerDiv.className = "";
      if (timeLeft > 120) timerDiv.classList.add("safe");
      else if (timeLeft > 30) timerDiv.classList.add("warning");
      else timerDiv.classList.add("danger");

      if (timeLeft <= 0) {
        clearInterval(intervalId);
        timerDiv.textContent = "";

        // Bip sonore
        const beep = document.getElementById("endBeep");
        if (beep) beep.play().catch(() => {});

        // Vibration mobile
        if ("vibrate" in navigator) {
          navigator.vibrate(400);
        }

        // Message de fin
        const endRef = push(ref(db, `rooms/${roomCode}/chat`));
        set(endRef, {
          pseudo: "⌛ Système",
          message: `Tour ${currentTour} terminé ! Préparez-vous...`,
          timestamp: Date.now()
        });
      }

      timeLeft--;
    }, 1000);

    console.log(`🧠 Tour ${currentTour} lancé avec indice : ${indice}`);
    currentTour++;
  };

  lancerUnTour();
  timer = setInterval(lancerUnTour, TEMPS_PAR_TOUR * 1000);
}

// --- 🧹 Reset d'une partie
export function resetGameState(roomCode) {
  const baseRef = ref(db, `rooms/${roomCode}`);
  remove(ref(baseRef, "votes"));
  remove(ref(baseRef, "tour"));
  remove(ref(baseRef, "objectif"));
  remove(ref(baseRef, "roles"));
  remove(ref(baseRef, "privateChat"));
  set(ref(baseRef, "chat"), {});
}

// --- 🎬 Affichage final
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



