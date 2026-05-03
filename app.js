// -------------------- FIREBASE --------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  onSnapshot,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadString,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";


// -------------------- CONFIG --------------------
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
const storage = getStorage(app);


// -------------------- VARIABLES CONTROL --------------------
let unsubscribeTasks = null;
let tasksLoaded = false;
let activeCameraId = null;
let activeStream = null;


// -------------------- LOGIN --------------------
window.login = function () {
  const email = document.getElementById("email")?.value;
  const password = document.getElementById("password")?.value;

  if (!email || !password) {
    alert("Ingresa email y contraseña");
    return;
  }

  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      window.location.href = "app.html";
    })
    .catch((error) => {
      console.error(error);
      alert(error.message);
    });
};


// -------------------- LOGOUT --------------------
window.logout = function () {
  stopActiveCamera();

  signOut(auth).then(() => {
    window.location.href = "login.html";
  });
};


// -------------------- AUTH + ROLES --------------------
onAuthStateChanged(auth, async (user) => {
  const path = window.location.pathname;
  const isLoginPage = path.includes("login.html") || path === "/";
  const isAppPage = path.includes("app.html");

  if (!user && isAppPage) {
    window.location.href = "login.html";
    return;
  }

  if (!user && isLoginPage) {
    return;
  }

  if (user && isLoginPage) {
    const role = await getUserRole(user.uid);

    if (role === "admin") {
      window.location.href = "admin.html";
    } else {
      window.location.href = "app.html";
    }

    return;
  }

  if (user && isAppPage) {
    const role = await getUserRole(user.uid);

    if (role === "admin") {
      window.location.href = "admin.html";
      return;
    }

    if (!tasksLoaded) {
      tasksLoaded = true;
      startTasksListener();
    }
  }
});


// -------------------- LISTENER TIEMPO REAL --------------------
function startTasksListener() {
  const container = document.getElementById("tasks");
  if (!container) return;

  if (unsubscribeTasks) unsubscribeTasks();

  unsubscribeTasks = onSnapshot(collection(db, "tasks"), (snapshot) => {
    container.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();

      const div = document.createElement("div");
      div.className = "task-card";

      div.innerHTML = `
        <div class="task-title">${data.title}</div>

        <div class="task-status ${data.status === "hecho" ? "status-done" : ""}">
          Estado: ${data.status}
        </div>

        ${
          data.photo
            ? `
              <div class="comment-saved">
                <strong>Comentario:</strong> ${data.comment || "Sin comentario"}
              </div>
              <img src="${data.photo}" class="task-image">
            `
            : `
              <div class="comment-box">
                <textarea
                  id="comment-${docSnap.id}"
                  class="task-comment"
                  placeholder="Agregar comentario..."
                >${data.comment || ""}</textarea>

                <button
                  class="update-btn"
                  onclick="updateComment('${docSnap.id}')">
                  Actualizar
                </button>
              </div>

              <div class="camera-area" id="camera-area-${docSnap.id}" onclick="startCamera('${docSnap.id}')">
                <video id="video-${docSnap.id}" class="camera-preview" autoplay playsinline></video>
                <canvas id="canvas-${docSnap.id}" style="display:none;"></canvas>

                <div class="camera-overlay" id="overlay-${docSnap.id}">
                  <div class="camera-text">Tocar para abrir cámara</div>
                </div>

                <button
                  class="close-camera-btn"
                  id="close-${docSnap.id}"
                  onclick="closeCamera(event)">
                  ×
                </button>

                <button
                  class="capture-btn"
                  id="capture-${docSnap.id}"
                  onclick="takePhoto(event, '${docSnap.id}')">
                </button>
              </div>
            `
        }
      `;

      container.appendChild(div);
    });
  });
}


// -------------------- ADD TASK --------------------
window.addTask = async function () {
  const title = prompt("Escribe la tarea:");
  if (!title) return;

  await addDoc(collection(db, "tasks"), {
    title,
    status: "pendiente",
    comment: "",
    photo: "",
    createdAt: new Date()
  });
};


// -------------------- CAMERA --------------------
window.startCamera = async function (id) {
  try {
    if (activeCameraId && activeCameraId !== id) {
      stopActiveCamera();
    }

    const video = document.getElementById(`video-${id}`);
    const overlay = document.getElementById(`overlay-${id}`);
    const captureBtn = document.getElementById(`capture-${id}`);
    const closeBtn = document.getElementById(`close-${id}`);

    if (!video) return;

    if (activeCameraId === id && activeStream) return;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false
    });

    video.srcObject = stream;
    video.dataset.cameraActive = "true";

    activeCameraId = id;
    activeStream = stream;

    if (overlay) overlay.style.display = "none";
    if (captureBtn) captureBtn.style.display = "block";
    if (closeBtn) closeBtn.style.display = "flex";

  } catch (error) {
    console.error(error);
    alert("No se pudo abrir la cámara. Revisa permisos del navegador.");
  }
};


// -------------------- STOP CAMERA --------------------
function stopActiveCamera() {
  if (activeStream) {
    activeStream.getTracks().forEach(track => track.stop());
  }

  if (activeCameraId) {
    const video = document.getElementById(`video-${activeCameraId}`);
    const overlay = document.getElementById(`overlay-${activeCameraId}`);
    const captureBtn = document.getElementById(`capture-${activeCameraId}`);
    const closeBtn = document.getElementById(`close-${activeCameraId}`);

    if (video) {
      video.srcObject = null;
      video.dataset.cameraActive = "false";
    }

    if (overlay) overlay.style.display = "flex";
    if (captureBtn) captureBtn.style.display = "none";
    if (closeBtn) closeBtn.style.display = "none";
  }

  activeCameraId = null;
  activeStream = null;
}

window.closeCamera = function (event) {
  event.stopPropagation();
  stopActiveCamera();
};


// -------------------- FOTO + FINALIZAR --------------------
window.takePhoto = async function (event, id) {
  event.stopPropagation();

  try {
    const video = document.getElementById(`video-${id}`);
    const canvas = document.getElementById(`canvas-${id}`);

    if (!video || !canvas) {
      alert("Primero abre la cámara.");
      return;
    }

    if (activeCameraId !== id || video.dataset.cameraActive !== "true") {
      alert("Primero toca el cuadro para abrir la cámara.");
      return;
    }

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      alert("Espera un momento a que cargue la cámara.");
      return;
    }

    const context = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL("image/jpeg", 0.85);
    const storageRef = ref(storage, `tasks/${id}-${Date.now()}.jpg`);

    await uploadString(storageRef, imageData, "data_url");

    const url = await getDownloadURL(storageRef);
    const comment = document.getElementById(`comment-${id}`)?.value || "";

    await updateDoc(doc(db, "tasks", id), {
      status: "hecho",
      photo: url,
      comment,
      completedAt: new Date()
    });

    stopActiveCamera();

  } catch (error) {
    console.error(error);
    alert("Error al tomar o subir la foto.");
  }
};


// -------------------- UPDATE COMMENT --------------------
window.updateComment = async function (id) {
  try {
    const comment = document.getElementById(`comment-${id}`)?.value || "";

    await updateDoc(doc(db, "tasks", id), {
      comment,
      updatedAt: new Date()
    });

    alert("Comentario actualizado");

  } catch (error) {
    console.error(error);
    alert("Error al guardar comentario");
  }
};


// -------------------- ROLES --------------------
async function getUserRole(uid) {
  const docRef = doc(db, "users", uid);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data().role;
  }

  return "empleado";
}


// -------------------- NAV ADMIN --------------------
window.goToAdmin = function () {
  window.location.href = "admin.html";
};