// scripts_index.js

const API_BASE = "https://proyecto-integrado-production.up.railway.app";

document.addEventListener("DOMContentLoaded", () => {
  const card = document.querySelector("#card3d");
  const btnShowRegister = document.querySelector("#btn-show-register");
  const btnBackLogin = document.querySelector("#btn-back-login");

  if (btnShowRegister && card) {
    btnShowRegister.addEventListener("click", () => card.classList.add("is-flipped"));
  }
  if (btnBackLogin && card) {
    btnBackLogin.addEventListener("click", () => card.classList.remove("is-flipped"));
  }

  // ===== LOGIN =====
  const loginForm = document.querySelector("#login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const correo = document.querySelector("#username").value.trim().toLowerCase();
      const password = document.querySelector("#password").value.trim();

      if (!correo || !password) {
        alert("Completa correo y contraseña.");
        return;
      }

      // 1) intentar como usuario
      const usuario = await loginComoUsuario(correo, password);
      if (usuario) {
        localStorage.setItem("sesionActual", JSON.stringify({ rol: "usuario", ...usuario }));
        window.location.href = "index_Usuario.html";
        return;
      }

      // 2) intentar como guardia
      const guardia = await loginComoGuardia(correo, password);
      if (guardia) {
        localStorage.setItem("sesionActual", JSON.stringify({ rol: "guardia", ...guardia }));
        window.location.href = "index_Guardia.html";
        return;
      }

      alert("Credenciales inválidas.");
    });
  }

  // ===== REGISTRO =====
  const registerForm = document.querySelector("#register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const correo = document.querySelector("#reg-correo").value.trim().toLowerCase();
      const password = document.querySelector("#reg-password").value.trim();

      if (!correo || !password) {
        alert("Correo y contraseña son obligatorios.");
        return;
      }

      // 1) validar en la colección nomina
      const nomina = await buscarEnNomina(correo);
      if (!nomina) {
        alert("Este correo no está en la nómina de trabajadores.");
        return;
      }

      // 2) crear/actualizar usuario en la colección usuarios
      const resp = await crearUsuarioDesdeNomina(nomina, password);
      if (resp.ok) {
        alert("Usuario creado/activado. Ahora puedes iniciar sesión.");
        if (card) card.classList.remove("is-flipped");
      } else {
        alert(resp.message || "No se pudo crear el usuario.");
      }
    });
  }
});

/* ================= FUNCIONES ================= */

// login contra colección usuarios
async function loginComoUsuario(correo, password) {
  try {
    const res = await fetch(`${API_BASE}/usuarios/by-email?email=${encodeURIComponent(correo)}`);
    const data = await res.json();
    if (!data || !data.ok || !data.usuario) return null;

    const u = data.usuario;
    if (u.password && u.password === password) {
      return u;
    }
    return null;
  } catch (err) {
    console.error("login usuario error:", err);
    return null;
  }
}

// login contra colección guardias
async function loginComoGuardia(correo, password) {
  try {
    const res = await fetch(`${API_BASE}/guardias`);
    const data = await res.json();
    if (!data || !data.ok || !Array.isArray(data.guardias)) return null;

    const g = data.guardias.find(
      (item) =>
        item.correo &&
        item.correo.toLowerCase() === correo.toLowerCase() &&
        item.password === password
    );
    return g || null;
  } catch (err) {
    console.error("login guardia error:", err);
    return null;
  }
}

// GET /nomina/by-email
async function buscarEnNomina(correo) {
  try {
    const res = await fetch(`${API_BASE}/nomina/by-email?email=${encodeURIComponent(correo)}`);
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

// POST /usuarios usando los datos de la nómina
async function crearUsuarioDesdeNomina(trabajadorNomina, password) {
  // generamos un QR token aquí mismo en el frontend para que el usuario lo vea luego
  const qrToken = generarTokenQR();
  try {
    const res = await fetch(`${API_BASE}/usuarios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: trabajadorNomina.nombre,
        apellido: trabajadorNomina.apellido,
        correo: trabajadorNomina.correo,
        tipoContrato: trabajadorNomina.tipoContrato,
        vigente: trabajadorNomina.vigente,
        password: password,
        qrToken: qrToken,
        origen: "web"
      })
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("error creando usuario:", err);
    return { ok: false, message: "Error de red" };
  }
}

// generador simple de QR token
function generarTokenQR() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "QR-";
  for (let i = 0; i < 7; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}
