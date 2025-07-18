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

// Config Firebase
const firebaseConfig = {
  apiKey: "...",
  authDomain: "le-ballon-de-plomb.firebaseapp.com",
  databaseURL: "https://...default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "...",
  measurementId: "..."
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Exporter tout ce dont on a besoin
export { db, ref, set, push, onValue, update, remove };

