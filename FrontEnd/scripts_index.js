// scripts_index.js
// Backend ahora es Railway (Mongo), no Apps Script
const API_URL = "https://proyecto-integrado-production.up.railway.app";

document.addEventListener("DOMContentLoaded", () => {
  const card = document.querySelector("#card3d");
  const btnShowRegister = document.querySelector("#btn-show-register");
  const btnBackLogin = document.querySelector("#btn-back-login");

  // ir a registro
  if (btnShowRegister && card) {
    btnShowRegister.addEventListener("click", () => {
      card.classList.add("is-flipped");
    });
  }

  // volver a login
  if (btnBackLogin && card) {
    btnBackLogin.addEventListener("click", () => {
      card.classList.remove("is-flipped");
    });
  }

  /* ===== LOGIN ===== */
  const loginForm = document.querySelector("#login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = document.querySelector("#username")?.value.trim().toLowerCase() || "";
      const password = document.querySelector("#password")?.value.trim() || "";

      if (!username || !password) {
        alert("Ingresa correo y contraseña.");
        return;
      }

      // 1) intentar como USUARIO
      const usuario = await loginUsuarioRailway(username, password);
      if (usuario) {
        localStorage.setItem(
          "sesionActual",
          JSON.stringify({
            rol: "usuario",
            nombre: `${usuario.nombre || ""} ${usuario.apellido || ""}`.trim(),
            correo: usuario.correo,
            tipoContrato: usuario.tipoContrato,
            tipoBeneficio: usuario.tipoBeneficio,
            estadoEntrega: usuario.estadoEntrega || "",
            qrToken: usuario.qrToken || ""
          })
        );
        window.location.href = "index_Usuario.html";
        return;
      }

      // 2) intentar como GUARDIA
      const guardia = await loginGuardiaRailway(username, password);
      if (guardia) {
        localStorage.setItem(
          "sesionActual",
          JSON.stringify({
            rol: "guardia",
            nombre: `${guardia.nombre || ""} ${guardia.apellido || ""}`.trim(),
            correo: guardia.correo
          })
        );
        window.location.href = "index_Guardia.html";
        return;
      }

      alert("Usuario o contraseña no válidos, o no estás registrado.");
    });
  }

  /* ===== REGISTRO ===== */
  const registerForm = document.querySelector("#register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const correo = document.querySelector("#reg-correo")?.value.trim().toLowerCase() || "";
      const password = document.querySelector("#reg-password")?.value.trim() || "";
      const nombre = document.querySelector("#reg-nombre")?.value.trim() || "";
      const apellido = document.querySelector("#reg-apellido")?.value.trim() || "";

      if (!correo || !password) {
        alert("Ingresa al menos correo y contraseña.");
        return;
      }

      // 1) validar que esté en la NOMINA (en mongo.nomina)
      const trabajadorNomina = await buscarEnNominaRailway(correo);
      if (!trabajadorNomina) {
        alert("Este correo NO está en la nómina de trabajadores.");
        return;
      }

      // 2) generar un QR para este usuario (como antes generabas en GAS)
      const qrToken = generarTokenQR();

      // 3) guardar/activar usuario en colección usuarios
      const creado = await crearUsuarioRailway({
        nombre: trabajadorNomina.nombre || nombre,
        apellido: trabajadorNomina.apellido || apellido,
        correo,
        password,
        tipoContrato: trabajadorNomina.tipoContrato || "",
        vigente: trabajadorNomina.vigente || "",
        qrToken
      });

      if (creado && creado.ok) {
        alert("Usuario creado. Ahora inicia sesión.");

        // rellenar login SOLO si existen esos inputs
        const loginEmail = document.querySelector("#username");
        const loginPass = document.querySelector("#password");
        if (loginEmail) loginEmail.value = correo;
        if (loginPass) loginPass.value = password;

        if (card) card.classList.remove("is-flipped");
      } else {
        alert(creado?.message || "No se pudo crear el usuario.");
      }
    });
  }
});

/* =========================================================
   FUNCIONES DE LOGIN Y REGISTRO CONTRA RAILWAY
   ========================================================= */

// LOGIN USUARIO
async function loginUsuarioRailway(correo, passwordPlain) {
  try {
    // 1) pedir al backend el usuario por correo
    const res = await fetch(`${API_URL}/usuarios/by-email?email=${encodeURIComponent(correo)}`);
    if (!res.ok) {
      // 404 u otro -> no existe
      return null;
    }
    const data = await res.json();
    if (!data.ok || !data.usuario) return null;

    const usuario = data.usuario;

    // 2) en el backend guardamos password con SHA-256
    // así que en el front lo hasheamos igual y comparamos
    const hashInput = await sha256(passwordPlain);
    const hashMongo = (usuario.password || "").trim();

    if (hashInput === hashMongo) {
      return usuario;
    }

    return null;
  } catch (err) {
    console.error("login usuario error:", err);
    return null;
  }
}

// LOGIN GUARDIA (en mongo.guardias la contraseña la dejamos en texto plano)
async function loginGuardiaRailway(correo, passwordPlain) {
  try {
    const res = await fetch(`${API_URL}/guardias`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.ok || !Array.isArray(data.guardias)) return null;

    const correoInput = correo.trim().toLowerCase();
    const passInput = passwordPlain.trim();

    const encontrado = data.guardias.find((g) => {
      const correoDb = (g.correo || "").trim().toLowerCase();
      const passDb = (g.password || "").trim();
      return correoDb === correoInput && passDb === passInput;
    });

    return encontrado || null;
  } catch (err) {
    console.error("login guardia error:", err);
    return null;
  }
}

// REGISTRO: validar que exista en nomina
async function buscarEnNominaRailway(correo) {
  try {
    const res = await fetch(`${API_URL}/nomina/by-email?email=${encodeURIComponent(correo)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.ok && data.trabajador) {
      return data.trabajador;
    }
    return null;
  } catch (err) {
    console.error("error buscando en nomina:", err);
    return null;
  }
}

// REGISTRO: crear/actualizar usuario en colección usuarios
async function crearUsuarioRailway(payload) {
  try {
    const res = await fetch(`${API_URL}/usuarios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: payload.nombre,
        apellido: payload.apellido,
        correo: payload.correo,
        password: payload.password, // el server la va a hashear
        tipoContrato: payload.tipoContrato,
        vigente: payload.vigente,
        qrToken: payload.qrToken,
        origen: "web"
      })
    });
    return await res.json();
  } catch (err) {
    console.error("error creando usuario:", err);
    return { ok: false, message: "error de red" };
  }
}

/* =========================================================
   HELPERS
   ========================================================= */

// mismo generador que usábamos en GAS
function generarTokenQR() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "QR-";
  for (let i = 0; i < 7; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}

// hash SHA-256 en el navegador (para comparar con lo que guardó el server)
async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}
