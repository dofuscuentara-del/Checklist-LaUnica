
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBi-Tmzls1uAvOgA_M3QidnbhQc6vb6vyI",
  authDomain: "checklist-app-9e1cf.firebaseapp.com",
  databaseURL: "https://checklist-app-9e1cf-default-rtdb.firebaseio.com",
  projectId: "checklist-app-9e1cf",
  storageBucket: "checklist-app-9e1cf.firebasestorage.app",
  messagingSenderId: "821122748866",
  appId: "1:821122748866:web:f3f060d88b46c69265065b"
};

//Inicializar Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);