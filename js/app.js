// js/app.js
import { db, ref, set, push, onValue, update } from "./firebase.js";
import { assignRoles, lancerTourAuto, afficherResultatFinal } from "./gameEngine.js";
import { allCountries } from "./allCountries.js";

// Références DOM
const registerScreen = document.getElementById("register-screen");
const gameScreen = document.getElementById("game-screen");
const pseudoInput = document.getElementById("pseudoInput");
const countrySearch = document.getElementById("countrySearch");
const countryList = document.getElementById("countryList");
const countrySelect = document.getElementById("countrySelect");
const countryPreview = document.getElementById("selectedCountryPreview");
const createRoomBtn = document.getElementById("createRoomBtn");
const joinRoomBtn = document.getElementById("joinRoomBtn");
const roomCodeInput = document.getElementById("roomCodeInput");
const roomCodeDisplay = document.getElementById("roomCodeDisplay");
const playerList = document.getElementById("playerList");
const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const sendMsgBtn = document.getElementById("sendMsgBtn");
const voteArea = document.getElementById("voteArea");
const voteOptions = document.getElementById("voteOptions");
const rulesBtn = document.getElementById("rulesBtn");
const rulesModal = document.getElementById("rulesModal");
const closeRulesBtn = document.getElementById("closeRulesBtn");

const privateChatArea = document.getElementById("privateChatArea");
const privateChatMessages = document.getElementById("privateChatMessages");
const privateChatInput = document.getElementById("privateChatInput");
const sendPrivateMsgBtn = document.getElementById("sendPrivateMsgBtn");

// Variables globales
let pseudo = "";
let country = "";
let roomCode = "";
let isCreator = false;
let gameStarted = false;
let localPlayers = {};
let myRole = null;

// Fonctions utilitaires
function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach((el) => el.classList.add("hidden"));
  document.getElementById(screenId).classList.remove("hidden");
}

function addChatMessage(author, message) {
  const div = document.createElement("div");
  div.innerHTML = `<strong>${author}:</strong> ${message}`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Autocomplete pays
countrySearch.addEventListener("input", () => {
  const value = countrySearch.value.toLowerCase();
  countryList.innerHTML = "";

  if (!value) return;

  const matches = allCountries.filter(c => c.name.toLowerCase().includes(value));
  matches.slice(0, 10).forEach(c => {
    const li = document.createElement("li");
    li.textContent = `${c.emoji} ${c.name}`;
    li.onclick = () => {
      countrySelect.value = c.emoji;
      countryPreview.textContent = `🌍 Ton pays sélectionné : ${c.emoji} ${c.name}`;
      countrySearch.value = "";
      countryList.innerHTML = "";
    };
    countryList.appendChild(li);
  });
});

// 🎲 Création de partie
createRoomBtn.onclick = () => {
  pseudo = pseudoInput.value.trim();
  country = countrySelect.value;
  if (!pseudo || !country) return alert("Remplis ton pseudo et choisis un drapeau !");
  roomCode = generateRoomCode();
  isCreator = true;
  joinRoom();
};

// 🔑 Rejoindre une partie
joinRoomBtn.onclick = () => {
  pseudo = pseudoInput.value.trim();
  country = countrySelect.value;
  roomCode = roomCodeInput.value.trim().toUpperCase();
  if (!pseudo || !country || !roomCode) return alert("Tous les champs sont requis !");
  isCreator = false;
  joinRoom();
};

// 🔗 Connexion à Firebase
function joinRoom() {
  showScreen("game-screen");
  roomCodeDisplay.textContent = roomCode;

  const playerRef = ref(db, `rooms/${roomCode}/players/${pseudo}`);
  set(playerRef, {
    pseudo,
    country,
    timestamp: Date.now()
  });

  listenToPlayers();
  listenToChat();
  listenToPrivateChat();
}

// 🔁 Suivre les joueurs
function listenToPlayers() {
  const playersRef = ref(db, `rooms/${roomCode}/players`);
  onValue(playersRef, (snapshot) => {
    const players = snapshot.val() || {};
    localPlayers = players;

    playerList.innerHTML = "<h3>👥 Joueurs dans la salle :</h3>";
    Object.entries(players).forEach(([key, p], i) => {
      playerList.innerHTML += `<p>#${i + 1} ${p.country} <strong>${p.pseudo}</strong></p>`;
    });

    // ⚙️ Créateur déclenche le jeu
    if (isCreator && !gameStarted && Object.keys(players).length >= 6) {
      gameStarted = true;
      assignRoles(roomCode, players);
      lancerTourAuto(roomCode);
    }
  });
}

// 📩 Chat public
sendMsgBtn.onclick = () => {
  const message = chatInput.value.trim();
  if (!message) return;
  const msgRef = push(ref(db, `rooms/${roomCode}/chat`));
  set(msgRef, {
    pseudo,
    message,
    timestamp: Date.now()
  });
  chatInput.value = "";
};

function listenToChat() {
  const chatRef = ref(db, `rooms/${roomCode}/chat`);
  onValue(chatRef, (snapshot) => {
    chatMessages.innerHTML = "";
    const all = snapshot.val() || {};
    Object.values(all).forEach((msg) => {
      addChatMessage(msg.pseudo, msg.message);
    });
  });
}

// 🔒 Chat privé journalistes
sendPrivateMsgBtn.onclick = () => {
  const msg = privateChatInput.value.trim();
  if (!msg) return;
  const msgRef = push(ref(db, `rooms/${roomCode}/privateChat`));
  set(msgRef, {
    pseudo,
    message: msg,
    timestamp: Date.now()
  });
  privateChatInput.value = "";
};

function listenToPrivateChat() {
  const roleRef = ref(db, `rooms/${roomCode}/roles/${pseudo}`);
  onValue(roleRef, (snap) => {
    myRole = snap.val();
    if (myRole === "journaliste") {
      privateChatArea.classList.remove("hidden");

      const chatRef = ref(db, `rooms/${roomCode}/privateChat`);
      onValue(chatRef, (snapshot) => {
        privateChatMessages.innerHTML = "";
        const all = snapshot.val() || {};
        Object.values(all).forEach((msg) => {
          const div = document.createElement("div");
          div.innerHTML = `<strong>${msg.pseudo}:</strong> ${msg.message}`;
          privateChatMessages.appendChild(div);
        });
        privateChatMessages.scrollTop = privateChatMessages.scrollHeight;
      });
    }
  });
}

// 📘 Règles



rulesBtn.onclick = () => rulesModal.classList.remove("hidden");
closeRulesBtn.onclick = () => rulesModal.classList.add("hidden");


// 🔁 Suivre les tours en cours
const tourRef = ref(db, `rooms/${roomCode}/tour`);
onValue(tourRef, (snapshot) => {
  const data = snapshot.val();
  if (!data) return;
  const dernier = data[Object.keys(data).pop()];
  if (dernier?.indice) {
    addChatMessage("🧠 Indice", dernier.indice);
    renderVoteOptions();
  }

  if (dernier?.tour > 5) {
    afficherResultatFinal(roomCode);
  }
});

// 🗳️ Vote
function renderVoteOptions() {
  voteArea.classList.remove("hidden");
  const joueurs = ["Messi", "Mbappé", "Haaland", "Modric", "Kane", "Griezmann"];
  voteOptions.innerHTML = "";

  joueurs.forEach((joueur) => {
    const btn = document.createElement("button");
    btn.textContent = joueur;
    btn.onclick = () => {
      addChatMessage("Vote", `${pseudo} a voté pour ${joueur}`);
      voteArea.classList.add("hidden");
    };
    voteOptions.appendChild(btn);
  });
}
