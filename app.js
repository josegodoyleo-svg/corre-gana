// ------------------ Firebase ------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, updateDoc, onSnapshot, getDoc, arrayUnion, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCk-nZAA3_MdVmhTMeqfC6wxbjCqTqnzto",
  authDomain: "carreras-en-tablero.firebaseapp.com",
  projectId: "carreras-en-tablero",
  storageBucket: "carreras-en-tablero.firebasestorage.app",
  messagingSenderId: "94485249467",
  appId: "1:94485249467:web:5d16dec2a1c9a78adf989e",
  measurementId: "G-DMJBR8GCTK"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ------------------ UI ------------------
const regEmail = document.getElementById("regEmail");
const regPass = document.getElementById("regPass");
const btnReg = document.getElementById("btnReg");

const logEmail = document.getElementById("logEmail");
const logPass = document.getElementById("logPass");
const btnLogin = document.getElementById("btnLogin");

const btnLogout = document.getElementById("btnLogout");
const userPanel = document.getElementById("userPanel");
const userInfo = document.getElementById("userInfo");

const gamePanel = document.getElementById("gamePanel");
const btnCrearPartida = document.getElementById("btnCrearPartida");
const partidaInfo = document.getElementById("partidaInfo");
const jugadoresInfo = document.getElementById("jugadoresInfo");
const btnRevancha = document.getElementById("btnRevancha");
const btnNuevaPartida = document.getElementById("btnNuevaPartida");

const joinPanel = document.getElementById("joinPanel");
const joinId = document.getElementById("joinId");
const btnUnirsePartida = document.getElementById("btnUnirsePartida");
const joinInfo = document.getElementById("joinInfo");

const tableroDiv = document.getElementById("tablero");
const btnLanzarDado = document.getElementById("btnLanzarDado");
const resultadoDado = document.getElementById("resultadoDado");
const dadoVisual = document.getElementById("dadoVisual"); // 👈 cuadrado dinámico

let currentPartidaRef = null;

// ------------------ Auth ------------------
btnReg.addEventListener("click", async () => {
  try {
    await createUserWithEmailAndPassword(auth, regEmail.value, regPass.value);
    alert("✅ Usuario registrado");
  } catch (err) {
    alert("❌ " + err.message);
  }
});

btnLogin.addEventListener("click", async () => {
  try {
    await signInWithEmailAndPassword(auth, logEmail.value, logPass.value);
    alert("🔑 Sesión iniciada");
  } catch (err) {
    alert("❌ " + err.message);
  }
});

btnLogout.addEventListener("click", async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    userPanel.style.display = "block";
    gamePanel.style.display = "block";
    joinPanel.style.display = "block";
    userInfo.textContent = `Bienvenido, ${user.email}`;
  } else {
    userPanel.style.display = "none";
    gamePanel.style.display = "none";
    joinPanel.style.display = "none";
  }
});

// ------------------ Crear partida ------------------
btnCrearPartida.addEventListener("click", async () => {
  if (!auth.currentUser) return alert("Inicia sesión primero");
  try {
    const ahora = new Date();
    const fechaFormateada = ahora.toLocaleString("es-BO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });

    const docRef = await addDoc(collection(db, "partidas"), {
      creador: auth.currentUser.uid,
      jugadores: [auth.currentUser.uid],
      jugadoresEmails: [auth.currentUser.email],
      estado: "jugando",
      posJugador1: 0,
      posJugador2: 0,
      turno: 1,
      timestamp: serverTimestamp(),
      fechaHora: fechaFormateada
    });
    currentPartidaRef = docRef;
    partidaInfo.textContent = "Partida creada con ID: " + docRef.id;
    escucharPartida(docRef);
  } catch (err) {
    alert("❌ " + err.message);
  }
});

// ------------------ Unirse a partida ------------------
btnUnirsePartida.addEventListener("click", async () => {
  if (!auth.currentUser) return alert("Inicia sesión primero");
  const id = joinId.value.trim();
  if (!id) return alert("Ingresa un ID válido");

  try {
    const ref = doc(db, "partidas", id);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      joinInfo.textContent = "❌ No existe esa partida.";
      return;
    }

    await updateDoc(ref, {
      jugadores: arrayUnion(auth.currentUser.uid),
      jugadoresEmails: arrayUnion(auth.currentUser.email)
    });

    currentPartidaRef = ref;
    joinInfo.textContent = "✅ Te uniste a la partida con ID: " + id;
    escucharPartida(ref);
  } catch (err) {
    alert("❌ " + err.message);
  }
});

// ------------------ Escuchar partida ------------------
function escucharPartida(ref) {
  onSnapshot(ref, (snap) => {
    const data = snap.data();
    if (!data) return;

    jugadoresInfo.textContent = "Jugadores: " + data.jugadoresEmails.join(" vs ");

    if (data.turno === 1) {
      resultadoDado.textContent = "👉 Turno de: " + data.jugadoresEmails[0];
    } else if (data.turno === 2) {
      resultadoDado.textContent = "👉 Turno de: " + data.jugadoresEmails[1];
    }

    actualizarFichas(data);

    // --------- Revisión de meta -----------
    let ganador = null;
    if (data.posJugador1 >= 20) ganador = data.jugadoresEmails[0];
    else if (data.posJugador2 >= 20) ganador = data.jugadoresEmails[1];

    if (ganador) {
      alert(`🏆 ¡${ganador} ha llegado a la meta!`);
      btnRevancha.style.display = "inline-block"; // Mostrar botón de revancha
    }
  });
}

// ------------------ Lanzar dado ------------------
btnLanzarDado.addEventListener("click", async () => {
  if (!currentPartidaRef) return;

  const snap = await getDoc(currentPartidaRef);
  const data = snap.data();
  let pos1 = data.posJugador1;
  let pos2 = data.posJugador2;
  let turno = data.turno;

  const dado = Math.floor(Math.random() * 6) + 1;

  // 👇 mostrar resultado en texto y cuadrado visual
  resultadoDado.textContent = "Resultado: " + dado;
  dadoVisual.textContent = dado;

  if (turno === 1) {
    pos1 += dado;
    if (pos1 > 20) pos1 = 20;
    turno = 2;
  } else {
    pos2 += dado;
    if (pos2 > 20) pos2 = 20;
    turno = 1;
  }

  await updateDoc(currentPartidaRef, {
    posJugador1: pos1,
    posJugador2: pos2,
    turno: turno
  });
});

// ------------------ Fichas ------------------
function actualizarFichas(data) {
  document.querySelectorAll(".ficha").forEach(f => f.remove());

  if (data.posJugador1 > 0) {
    const c1 = document.getElementById("celda-" + data.posJugador1);
    if (c1) {
      const f1 = document.createElement("div");
      f1.className = "ficha j1";
      c1.appendChild(f1);
    }
  }

  if (data.posJugador2 > 0) {
    const c2 = document.getElementById("celda-" + data.posJugador2);
    if (c2) {
      const f2 = document.createElement("div");
      f2.className = "ficha j2";
      c2.appendChild(f2);
    }
  }
}

// ------------------ Nueva partida ------------------
btnNuevaPartida.addEventListener("click", async () => {
  if (!currentPartidaRef) return;
  const snap = await getDoc(currentPartidaRef);
  const data = snap.data();

  const ahora = new Date();
  const fechaFormateada = ahora.toLocaleString("es-BO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

  const nuevaRef = await addDoc(collection(db, "partidas"), {
    creador: auth.currentUser.uid,
    jugadores: data.jugadores,
    jugadoresEmails: data.jugadoresEmails,
    estado: "jugando",
    posJugador1: 0,
    posJugador2: 0,
    turno: 1,
    timestamp: serverTimestamp(),
    fechaHora: fechaFormateada
  });

  currentPartidaRef = nuevaRef;
  btnNuevaPartida.style.display = "none";
  partidaInfo.textContent = "Nueva partida creada con ID: " + nuevaRef.id;
  escucharPartida(nuevaRef);
});

// ------------------ Botón revancha ------------------
btnRevancha.addEventListener("click", async () => {
  if (!currentPartidaRef) return;
  const aceptar = confirm("¿Quieres jugar de nuevo con la misma partida?");
  if (!aceptar) return;

  const snap = await getDoc(currentPartidaRef);
  const data = snap.data();

  const ahora = new Date();
  const fechaFormateada = ahora.toLocaleString("es-BO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

  // Crear nueva partida con mismo jugadores pero nuevo ID
  const nuevaRef = await addDoc(collection(db, "partidas"), {
    creador: auth.currentUser.uid,
    jugadores: data.jugadores,
    jugadoresEmails: data.jugadoresEmails,
    estado: "jugando",
    posJugador1: 0,
    posJugador2: 0,
    turno: 1,
    timestamp: serverTimestamp(),
    fechaHora: fechaFormateada
  });

  currentPartidaRef = nuevaRef;
  btnRevancha.style.display = "none";
  partidaInfo.textContent = "¡Nueva partida creada con ID: " + nuevaRef.id + "!";
  escucharPartida(nuevaRef);
});

// ------------------ Tablero ------------------
tableroDiv.innerHTML = "";
const filas = 5;
const columnas = 4;
let invertir = false;

for (let fila = filas; fila >= 1; fila--) {
  const numerosFila = [];
  for (let col = 1; col <= columnas; col++) {
    numerosFila.push((fila - 1) * columnas + col);
  }
  if (invertir) numerosFila.reverse();
  numerosFila.forEach(num => {
    const celda = document.createElement("div");
    celda.className = "celda";
    celda.id = "celda-" + num;
    celda.textContent = num;

    if (num === 1) celda.classList.add("inicio");
    if (num === 20) celda.classList.add("fin");

    tableroDiv.appendChild(celda);
  });
  invertir = !invertir;
}
