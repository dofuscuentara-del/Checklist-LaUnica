import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
  getAuth,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
  onSnapshot,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBi-Tmzls1uAvOgA_M3QidnbhQc6vb6vyI",
  authDomain: "checklist-app-9e1cf.firebaseapp.com",
  projectId: "checklist-app-9e1cf",
  storageBucket: "checklist-app-9e1cf.appspot.com",
  messagingSenderId: "821122748866",
  appId: "1:821122748866:web:f3f060d88b46c69265065b"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let taskToDelete = null;
let unsubscribeAdminTasks = null;

// -------------------- ROLE CHECK --------------------
async function getUserRole(uid) {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return userSnap.data().role;
  }

  return "empleado";
}

// -------------------- AUTH CONTROL --------------------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const role = await getUserRole(user.uid);

  if (role !== "admin") {
    alert("Acceso denegado. Solo administrador.");
    window.location.href = "app.html";
    return;
  }

  loadAdminTasks();
});

// -------------------- LOGOUT --------------------
window.logout = function () {
  signOut(auth).then(() => {
    window.location.href = "login.html";
  });
};

// -------------------- NAVIGATION --------------------
window.goToEmployee = function () {
  window.location.href = "app.html";
};

// -------------------- ADD TASK --------------------
window.addTask = async function () {
  const title = prompt("Escribe la tarea:");
  if (!title) return;

  try {
    await addDoc(collection(db, "tasks"), {
      title: title,
      status: "pendiente",
      comment: "",
      photo: "",
      createdAt: new Date()
    });
  } catch (error) {
    console.error("ERROR AL AGREGAR:", error);
    alert("Error al agregar tarea");
  }
};

// -------------------- LOAD ADMIN TASKS --------------------
function loadAdminTasks() {
  const container = document.getElementById("adminTasks");
  if (!container) return;

  if (unsubscribeAdminTasks) {
    unsubscribeAdminTasks();
  }

  unsubscribeAdminTasks = onSnapshot(collection(db, "tasks"), (snapshot) => {
    container.innerHTML = "";

    if (snapshot.empty) {
      container.innerHTML = `<p class="no-photo">No hay tareas todavía</p>`;
      return;
    }

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();

      const div = document.createElement("div");
      div.className = "task-card";

      div.innerHTML = `
        <div class="delete-icon" onclick="openDeleteModal('${docSnap.id}')">
          ×
        </div>

        <div class="task-title">${data.title || "Sin título"}</div>

        <div class="task-status ${data.status === "hecho" ? "status-done" : ""}">
          Estado: ${data.status || "pendiente"}
        </div>

        <div class="task-comment-view">
          <strong>Comentario:</strong> ${data.comment || "Sin comentario"}
        </div>

        ${
          data.photo
            ? `<img src="${data.photo}" class="task-image">`
            : `<div class="no-photo">Sin foto todavía</div>`
        }
      `;

      container.appendChild(div);
    });
  });
}

// -------------------- DELETE MODAL --------------------
window.openDeleteModal = function (id) {
  taskToDelete = id;
  document.getElementById("deleteModal").style.display = "flex";
};

window.closeDeleteModal = function () {
  taskToDelete = null;
  document.getElementById("deleteModal").style.display = "none";
};

window.confirmDelete = async function () {
  if (!taskToDelete) return;

  try {
    await deleteDoc(doc(db, "tasks", taskToDelete));
    closeDeleteModal();
  } catch (error) {
    console.error("ERROR AL ELIMINAR:", error);
    alert(error.message);
  }
};