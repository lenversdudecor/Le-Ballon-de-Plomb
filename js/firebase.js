// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  push,
  onValue,
  update,
  remove
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

// 🔧 Configuration Firebase (corrigée)
const firebaseConfig = {
  apiKey: "AIzaSyBDxkMi1JwAKhR0VaA0cqXb3mLeHc-XZcw",
  authDomain: "le-ballon-de-plomb.firebaseapp.com",
  databaseURL: "https://le-ballon-de-plomb-default-rtdb.europe-west1.firebasedatabase.app", // ✅ CORRIGÉ ICI
  projectId: "le-ballon-de-plomb",
  storageBucket: "le-ballon-de-plomb.appspot.com",
  messagingSenderId: "382972822900",
  appId: "1:382972822900:web:79a25d551ef32c13c71821",
  measurementId: "G-NF3LESNKFE"
};

// 🚀 Initialisation Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 📦 Exports
export {
  db,
  ref,
  set,
  push,
  onValue,
  update,
  remove
};
