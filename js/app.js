import { db, ref, set, push, onValue, update, remove } from "./firebase.js";
import { assignRoles, lancerTourAuto, afficherResultatFinal, resetGameState } from "./gameEngine.js";
import { allCountries } from "./allCountries.js";

document.addEventListener("DOMContentLoaded", () => {
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
  const debugBtn = document.getElementById("debugAccessBtn");
  const logoImg = document.querySelector("header img");
  const spectatorBtn = document.getElementById("addSpectatorBtn");
  const spectatorCounter = document.getElementById("spectatorCount");
  const resultPanel = document.getElementById("resultPanel");
  const relancerBtn = document.getElementById("relancerBtn");

  let pseudo = "";
  let country = "";
  let roomCode = "";
  let isCreator = false;
  let gameStarted = false;
  let localPlayers = {};
  let myRole = null;
  let isSpectator = false;

  function generateRoomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  function showScreen(screenId) {
    document.querySelectorAll(".screen").forEach(el => el.classList.add("hidden"));
    document.getElementById(screenId).classList.remove("hidden");
  }

  function addChatMessage(author, message) {
    const div = document.createElement("div");
    div.innerHTML = `<strong>${author}:</strong> ${message}`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

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

  createRoomBtn.onclick = () => {
    pseudo = pseudoInput.value.trim();
    country = countrySelect.value;
    if (!pseudo || !country) return alert("Remplis ton pseudo et choisis un drapeau !");
    roomCode = generateRoomCode();
    isCreator = true;
    joinRoom();
  };

  joinRoomBtn.onclick = () => {
    pseudo = pseudoInput.value.trim();
    country = countrySelect.value;
    roomCode = roomCodeInput.value.trim().toUpperCase();
    if (!pseudo || !country || !roomCode) return alert("Tous les champs sont requis !");
    isCreator = false;
    joinRoom();
  };

  spectatorBtn.onclick = () => {
    isSpectator = true;
    roomCode = roomCodeInput.value.trim().toUpperCase();
    if (!roomCode) return alert("Entre un code de room !");
    pseudo = "Spectateur_" + Math.floor(Math.random() * 10000);
    joinRoom(true);
  };

  relancerBtn.onclick = () => {
    if (!isCreator) return;
    resetGameState(roomCode);
    assignRoles(roomCode, localPlayers);
    lancerTourAuto(roomCode);
    voteArea.classList.add("hidden");
    resultPanel.classList.add("hidden");
  };

  function joinRoom(asSpectator = false) {
    showScreen("game-screen");
    roomCodeDisplay.textContent = roomCode;

    if (!asSpectator) {
      const playerRef = ref(db, `rooms/${roomCode}/players/${pseudo}`);
      set(playerRef, { pseudo, country, timestamp: Date.now() });
    } else {
      const spectRef = ref(db, `rooms/${roomCode}/spectators/${pseudo}`);
      set(spectRef, { pseudo, timestamp: Date.now() });
    }

    listenToPlayers();
    listenToChat();
    listenToPrivateChat();
    listenToTour();
    listenToSpectators();
  }

  function listenToPlayers() {
    const playersRef = ref(db, `rooms/${roomCode}/players`);
    onValue(playersRef, (snapshot) => {
      const players = snapshot.val() || {};
      localPlayers = players;
      playerList.innerHTML = "<h3>👥 Joueurs dans la salle :</h3>";
      Object.entries(players).forEach(([key, p], i) => {
        playerList.innerHTML += `<p>#${i + 1} ${p.country} <strong>${p.pseudo}</strong></p>`;
      });
      if (isCreator && !gameStarted && Object.keys(players).length >= 6) {
        gameStarted = true;
        assignRoles(roomCode, players);
        lancerTourAuto(roomCode);
      }
    });
  }

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

  sendMsgBtn.onclick = () => {
    const message = chatInput.value.trim();
    if (!message) return;
    const msgRef = push(ref(db, `rooms/${roomCode}/chat`));
    set(msgRef, { pseudo, message, timestamp: Date.now() });
    chatInput.value = "";
  };

  sendPrivateMsgBtn.onclick = () => {
    const msg = privateChatInput.value.trim();
    if (!msg) return;
    const msgRef = push(ref(db, `rooms/${roomCode}/privateChat`));
    set(msgRef, { pseudo, message: msg, timestamp: Date.now() });
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

  function listenToTour() {
    const tourRef = ref(db, `rooms/${roomCode}/tour`);
    onValue(tourRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;
      const dernier = data[Object.keys(data).pop()];
      if (dernier?.indice) {
        addChatMessage("🧠 Indice", dernier.indice);
        renderVoteOptions();
      }
      if (dernier?.tour > 5) afficherResultatFinal(roomCode);
    });
  }

  function renderVoteOptions() {
    if (isSpectator) return;
    voteArea.classList.remove("hidden");
    const joueurs = ["Messi", "Mbappé", "Haaland", "Modric", "Kane", "Griezmann"];
    voteOptions.innerHTML = "";
    joueurs.forEach((joueur) => {
      const btn = document.createElement("button");
      btn.textContent = joueur;
      btn.onclick = () => {
        const voteRef = ref(db, `rooms/${roomCode}/votes/${pseudo}`);
        set(voteRef, {
          joueur,
          timestamp: Date.now()
        });
        addChatMessage("Vote", `${pseudo} a voté pour ${joueur}`);
        voteArea.classList.add("hidden");
      };
      voteOptions.appendChild(btn);
    });
  }

  rulesBtn.onclick = () => rulesModal.classList.remove("hidden");
  closeRulesBtn.onclick = () => rulesModal.classList.add("hidden");

  let logoClickCount = 0;
  if (logoImg && debugBtn) {
    logoImg.addEventListener("click", () => {
      logoClickCount++;
      if (logoClickCount === 3) debugBtn.classList.remove("hidden");
    });
    debugBtn.addEventListener("click", () => {
      window.open("checklist-debug.html", "_blank");
    });
  }

  function listenToSpectators() {
    const spectRef = ref(db, `rooms/${roomCode}/spectators`);
    onValue(spectRef, (snapshot) => {
      const specs = snapshot.val() || {};
      spectatorCounter.textContent = Object.keys(specs).length;
    });
  }
});
