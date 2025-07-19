import { db, ref, set, onValue, remove } from "./firebase.js";

// --- CONFIG ---
const TOURS_TOTAL = 5;
const TEMPS_PAR_TOUR = 240; // ⏱️ 4 minutes (en secondes)

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
  "Quelqu’un essaie de manipuler la discussion...",
  "Le joueur #3 a reçu beaucoup de votes suspects...",
  "Le joueur qui plaisante souvent semble cacher quelque chose...",
  "Un pseudo contenant des chiffres attire l'attention...",
  "Certains joueurs restent silencieux pendant les débats...",
  "Le joueur qui écrit en majuscules est suspecté...",
  "Un journaliste a félicité un autre sans raison...",
  "Le joueur #1 a changé d'avis en dernière minute...",
  "Des messages privés ont fuité depuis le clan journaliste...",
  "Un joueur semble suivre une stratégie bien rodée...",
  "Le joueur #5 a accusé sans preuve...",
  "Un supporter doute de ses propres choix...",
  "Le joueur qui tape lentement suscite des doutes...",
  "Certains votent toujours en dernier...",
  "Un journaliste a fait l’éloge d’un mauvais choix...",
  "Le joueur #6 est resté muet tout le tour...",
  "Un joueur a essayé de détourner la conversation...",
  "Un pseudo avec un emoji soulève des soupçons...",
  "Un journaliste tente de semer la confusion...",
  "Un joueur a sauté son tour précédent...",
  "Le joueur qui demande les règles semble suspect..."
];

// --- Base de 50 joueurs (nom, drapeau, club)
const JOUEURS_BALLO = [
  { nom: "Lionel Messi", pays: "🇦🇷", club: "Inter Miami" },
  { nom: "Kylian Mbappé", pays: "🇫🇷", club: "Real Madrid" },
  { nom: "Erling Haaland", pays: "🇳🇴", club: "Man City" },
  { nom: "Kevin De Bruyne", pays: "🇧🇪", club: "Man City" },
  { nom: "Cristiano Ronaldo", pays: "🇵🇹", club: "Al Nassr" },
  { nom: "Karim Benzema", pays: "🇫🇷", club: "Al-Ittihad" },
  { nom: "Luka Modric", pays: "🇭🇷", club: "Real Madrid" },
  { nom: "Jude Bellingham", pays: "🇬🇧", club: "Real Madrid" },
  { nom: "Vinícius Jr.", pays: "🇧🇷", club: "Real Madrid" },
  { nom: "Mohamed Salah", pays: "🇪🇬", club: "Liverpool" },
  { nom: "Antoine Griezmann", pays: "🇫🇷", club: "Atlético" },
  { nom: "Harry Kane", pays: "🇬🇧", club: "Bayern Munich" },
  { nom: "Robert Lewandowski", pays: "🇵🇱", club: "Barcelona" },
  { nom: "Neymar Jr.", pays: "🇧🇷", club: "Al-Hilal" },
  { nom: "Bukayo Saka", pays: "🇬🇧", club: "Arsenal" },
  { nom: "Jamal Musiala", pays: "🇩🇪", club: "Bayern Munich" },
  { nom: "Pedri", pays: "🇪🇸", club: "Barcelona" },
  { nom: "Gavi", pays: "🇪🇸", club: "Barcelona" },
  { nom: "Rafael Leão", pays: "🇵🇹", club: "AC Milan" },
  { nom: "Lautaro Martínez", pays: "🇦🇷", club: "Inter Milan" },
  { nom: "João Félix", pays: "🇵🇹", club: "Barcelona" },
  { nom: "Ousmane Dembélé", pays: "🇫🇷", club: "PSG" },
  { nom: "Riyad Mahrez", pays: "🇩🇿", club: "Al-Ahli" },
  { nom: "Bruno Fernandes", pays: "🇵🇹", club: "Man United" },
  { nom: "Marcus Rashford", pays: "🇬🇧", club: "Man United" },
  { nom: "Leroy Sané", pays: "🇩🇪", club: "Bayern Munich" },
  { nom: "Trent A. Arnold", pays: "🇬🇧", club: "Liverpool" },
  { nom: "Alphonso Davies", pays: "🇨🇦", club: "Bayern Munich" },
  { nom: "Declan Rice", pays: "🇬🇧", club: "Arsenal" },
  { nom: "Khvicha Kvaratskhelia", pays: "🇬🇪", club: "Napoli" },
  { nom: "Victor Osimhen", pays: "🇳🇬", club: "Napoli" },
  { nom: "Federico Valverde", pays: "🇺🇾", club: "Real Madrid" },
  { nom: "Eduardo Camavinga", pays: "🇫🇷", club: "Real Madrid" },
  { nom: "Rodrygo", pays: "🇧🇷", club: "Real Madrid" },
  { nom: "Enzo Fernández", pays: "🇦🇷", club: "Chelsea" },
  { nom: "Jorginho", pays: "🇮🇹", club: "Arsenal" },
  { nom: "Theo Hernandez", pays: "🇫🇷", club: "AC Milan" },
  { nom: "Achraf Hakimi", pays: "🇲🇦", club: "PSG" },
  { nom: "Marquinhos", pays: "🇧🇷", club: "PSG" },
  { nom: "André Onana", pays: "🇨🇲", club: "Man United" },
  { nom: "Diogo Costa", pays: "🇵🇹", club: "Porto" },
  { nom: "Mike Maignan", pays: "🇫🇷", club: "AC Milan" },
  { nom: "Emiliano Martínez", pays: "🇦🇷", club: "Aston Villa" },
  { nom: "David Alaba", pays: "🇦🇹", club: "Real Madrid" },
  { nom: "Raphaël Varane", pays: "🇫🇷", club: "Man United" },
  { nom: "Ilkay Gündogan", pays: "🇩🇪", club: "Barcelona" },
  { nom: "Martin Ødegaard", pays: "🇳🇴", club: "Arsenal" },
  { nom: "N'Golo Kanté", pays: "🇫🇷", club: "Al-Ittihad" },
  { nom: "Sergio Busquets", pays: "🇪🇸", club: "Inter Miami" }
];

// --- SHUFFLE ---
function shuffle(array) {
  return array.slice().sort(() => Math.random() - 0.5);
}

// --- 🎭 Attribution des rôles
export function assignRoles(roomCode, joueurs) {
  const total = Object.keys(joueurs).length;
  const nbJournalistes = Math.floor(total / 2);
  const tous = shuffle(Object.keys(joueurs));
  const journalistes = tous.slice(0, nbJournalistes);

  tous.forEach((pseudo) => {
    const role = journalistes.includes(pseudo) ? "journaliste" : "supporter";
    set(ref(db, `rooms/${roomCode}/roles/${pseudo}`), role);
  });

  // 🎯 Tirage aléatoire de 6 candidats
  const candidats = shuffle(JOUEURS_BALLO).slice(0, 6);
  const vrai = candidats[Math.floor(Math.random() * 6)].nom;
  let leurre;
  do {
    leurre = candidats[Math.floor(Math.random() * 6)].nom;
  } while (leurre === vrai);

  set(ref(db, `rooms/${roomCode}/objectif`), { vrai, leurre, candidats });
}

// --- Tour Auto
let currentTour = 1;
let timer;
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
      tour: currentTour,
      indice,
      timestamp: Date.now()
    });
    currentTour++;
  };
  lancerUnTour();
  timer = setInterval(lancerUnTour, TEMPS_PAR_TOUR * 1000);
}

// --- Résultat final
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
      const candidats = obj?.candidats || [];
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

// --- Reset
export function resetGameState(roomCode) {
  const baseRef = ref(db, `rooms/${roomCode}`);
  remove(ref(baseRef, "votes"));
  remove(ref(baseRef, "tour"));
  remove(ref(baseRef, "objectif"));
  remove(ref(baseRef, "roles"));
  remove(ref(baseRef, "privateChat"));
  set(ref(baseRef, "chat"), {});
}

// ✅ Export de la liste des joueurs avec pays et clubs
export function getAllPlayersList() {
  return JOUEURS_BALLON_OR;
}


