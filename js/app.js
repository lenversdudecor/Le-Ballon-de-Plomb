// ✅ app.js
import { db, ref, set, push, onValue } from "./firebase.js";
import { assignRoles, lancerTourAuto, afficherResultatFinal, resetGameState } from "./gameEngine.js";
import { allCountries } from "./allCountries.js";

document.addEventListener("DOMContentLoaded", () => {
  const pseudoInput = document.getElementById("pseudoInput");
  const countrySearch = document.getElementById("countrySearch");
  const countryList = document.getElementById("countryList");
  const countrySelect = document.getElementById("countrySelect");
  const countryPreview = document.getElementById("selectedCountryPreview");
  const createRoomBtn = document.getElementById("createRoomBtn");
  const joinRoomBtn = document.getElementById("joinRoomBtn");
  const roomCodeInput = document.getElementById("roomCodeInput");
  const spectatorBtn = document.getElementById("spectatorBtn");
  const spectatorCounter = document.getElementById("spectatorCount");
  const roomCodeDisplay = document.getElementById("roomCodeDisplay");
  const playerList = document.getElementById("playerList");
  const chatMessages = document.getElementById("chatMessages");
  const chatInput = document.getElementById("chatInput");
  const sendMsgBtn = document.getElementById("sendMsgBtn");
  const voteArea = document.getElementById("voteArea");
  const voteOptions = document.getElementById("voteOptions");
  const resultPanel = document.getElementById("resultPanel");
  const resetGameBtn = document.getElementById("resetGameBtn");
  const relancerBtn = document.getElementById("relancerBtn") || document.getElementById("resetGameBtn");
  const rulesBtn = document.getElementById("rulesBtn");
  const rulesModal = document.getElementById("rulesModal");
  const closeRulesBtn = document.getElementById("closeRulesBtn");

  let pseudo = "";
  let country = "";
  let roomCode = "";
  let isCreator = false;
  let isSpectator = false;
  let gameStarted = false;
  let localPlayers = {};

  function generateRoomCode() {
    return Math.random().toString(36).substring(2, 7).toUpperCase();
  }

  function showScreen(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.add("hidden"));
    document.getElementById(id).classList.remove("hidden");
  }

  // --- Autocomplete Pays ---
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
        countryPreview.textContent = `🌍 Ton pays : ${c.emoji} ${c.name}`;
        countryList.innerHTML = "";
        countrySearch.value = "";
      };
      countryList.appendChild(li);
    });
  });

  // --- Rejoindre une Room ---
  function joinRoom(asSpectator = false) {
    showScreen("game-screen");
    roomCodeDisplay.textContent = roomCode;

    if (!asSpectator) {
      const playerRef = ref(db, `rooms/${roomCode}/players/${pseudo}`);
      set(playerRef, { pseudo, country });
    } else {
      const spectRef = ref(db, `rooms/${roomCode}/spectators/${pseudo}`);
      set(spectRef, { pseudo });
    }

    listenToPlayers();
    listenToChat();
    listenToSpectators();
    listenToVotes();
  }

  // --- Listeners ---
  function listenToPlayers() {
    const playersRef = ref(db, `rooms/${roomCode}/players`);
    onValue(playersRef, snap => {
      const data = snap.val() || {};
      localPlayers = data;
      playerList.innerHTML = `<h3>👥 Joueurs :</h3>`;
      Object.entries(data).forEach(([k, p], i) => {
        playerList.innerHTML += `<p>#${i + 1} ${p.country} <strong>${p.pseudo}</strong></p>`;
      });
      if (!gameStarted && Object.keys(data).length >= 6 && isCreator) {
        gameStarted = true;
        assignRoles(roomCode, data);
        lancerTourAuto(roomCode);
      }
    });
  }

  function listenToChat() {
    const chatRef = ref(db, `rooms/${roomCode}/chat`);
    onValue(chatRef, snap => {
      const messages = snap.val() || {};
      chatMessages.innerHTML = "";
      Object.values(messages).forEach(msg => {
        chatMessages.innerHTML += `<div><strong>${msg.pseudo}:</strong> ${msg.message}</div>`;
      });
      chatMessages.scrollTop = chatMessages.scrollHeight;
    });
  }

  function listenToSpectators() {
    const specRef = ref(db, `rooms/${roomCode}/spectators`);
    onValue(specRef, snap => {
      const specs = snap.val() || {};
      spectatorCounter.textContent = Object.keys(specs).length;
    });
  }

  function listenToVotes() {
    const tourRef = ref(db, `rooms/${roomCode}/tour`);
    onValue(tourRef, snap => {
      const tour = snap.val();
      if (!tour) return;
      voteArea.classList.remove("hidden");
      renderVoteOptions();
    });
  }

  // --- Actions ---
  createRoomBtn.onclick = () => {
    pseudo = pseudoInput.value.trim();
    country = countrySelect.value;
    if (!pseudo || !country) return alert("Remplis ton pseudo + pays");
    roomCode = generateRoomCode();
    isCreator = true;
    joinRoom();
  };

  joinRoomBtn.onclick = () => {
    pseudo = pseudoInput.value.trim();
    country = countrySelect.value;
    roomCode = roomCodeInput.value.trim().toUpperCase();
    if (!pseudo || !country || !roomCode) return alert("Champs requis !");
    joinRoom();
  };

  spectatorBtn.onclick = () => {
    roomCode = roomCodeInput.value.trim().toUpperCase();
    if (!roomCode) return alert("Code requis pour spectateur !");
    pseudo = "Spectateur" + Math.floor(Math.random() * 1000);
    isSpectator = true;
    joinRoom(true);
  };

  sendMsgBtn.onclick = () => {
    const msg = chatInput.value.trim();
    if (!msg) return;
    const msgRef = push(ref(db, `rooms/${roomCode}/chat`));
    set(msgRef, { pseudo, message: msg });
    chatInput.value = "";
  };

  resetGameBtn.onclick = () => {
    resetGameState(roomCode);
    assignRoles(roomCode, localPlayers);
    lancerTourAuto(roomCode);
    resultPanel.classList.add("hidden");
  };

  rulesBtn.onclick = () => rulesModal.classList.remove("hidden");
  closeRulesBtn.onclick = () => rulesModal.classList.add("hidden");

  function renderVoteOptions() {
    voteOptions.innerHTML = "";
    const joueurs = ["Messi", "Mbappé", "Haaland", "Kane", "Griezmann", "Modric"];
    joueurs.forEach(nom => {
      const btn = document.createElement("button");
      btn.textContent = nom;
      btn.onclick = () => {
        const voteRef = ref(db, `rooms/${roomCode}/votes/${pseudo}`);
        set(voteRef, { joueur: nom });
        voteArea.classList.add("hidden");
      };
      voteOptions.appendChild(btn);
    });
  }
});

