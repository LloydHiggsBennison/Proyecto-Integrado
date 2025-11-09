// scripts_index.js

// ======================= CONFIGURACIÓN =======================
const API_URL = "https://script.google.com/macros/s/AKfycbyO1xchlkXXKnLRCyZ27ztNUYfvTP28Na4A5L7-q5p9UcYBLr_7_Kp-Ls3gsyCjAvz_Kg/exec";

document.addEventListener("DOMContentLoaded", () => {
  const card = document.querySelector("#card3d");
  const btnShowRegister = document.querySelector("#btn-show-register");
  const btnBackLogin = document.querySelector("#btn-back-login");

  // ir a registro (flip)
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
      const username = document.querySelector("#username")?.value.trim() || "";
      const password = document.querySelector("#password")?.value.trim() || "";

      if (!username || !password) {
        alert("Debes ingresar correo y contraseña.");
        return;
      }

      // 1) intentar como usuario
      const usuario = await loginUsuario(username, password);
      if (usuario) {
        localStorage.setItem(
          "sesionActual",
          JSON.stringify({
            tipo: "usuario",
            ...usuario
          })
        );
        window.location.href = "usuario.html";
        return;
      }

      // 2) intentar como guardia
      const guardia = await loginGuardia(username, password);
      if (guardia) {
        localStorage.setItem(
          "sesionActual",
          JSON.stringify({
            tipo: "guardia",
            ...guardia
          })
        );
        window.location.href = "guardia.html";
        return;
      }

      alert("Credenciales no válidas o usuario no vigente.");
    });
  }

  /* ===== REGISTRO ===== */
  const registerForm = document.querySelector("#register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nombre = document.querySelector("#reg-nombre")?.value.trim() || "";
      const apellido = document.querySelector("#reg-apellido")?.value.trim() || "";
      const correo = document.querySelector("#reg-correo")?.value.trim().toLowerCase() || "";
      const password = document.querySelector("#reg-password")?.value.trim() || "";

      if (!correo || !password) {
        alert("Correo y contraseña son obligatorios.");
        return;
      }

      const resp = await registrarUsuarioEnBackend({
        nombre,
        apellido,
        correo,
        password
      });

      if (resp?.ok) {
        alert("Usuario creado en Mongo. QR: " + (resp.qrToken || "generado"));
        if (card) card.classList.remove("is-flipped");
      } else {
        alert(resp?.message || "No se pudo crear el usuario (¿está en la nómina?).");
      }
    });
  }
});

// ======================= FUNCIONES =======================

async function loginUsuario(correoInput, passInput) {
  try {
    const res = await fetch(
      `${API_URL}?action=getUserByEmail&email=${encodeURIComponent(correoInput)}`
    );
    const data = await res.json();
    if (!data.ok || !data.data) return null;

    const u = data.data;
    const vigenteOK =
      !u.vigente ||
      u.vigente === "SI" ||
      u.vigente === "si" ||
      u.vigente === "true";

    if (
      u.correo?.toLowerCase() === correoInput.toLowerCase() &&
      u.password === passInput &&
      vigenteOK
    ) {
      return u;
    }
    return null;
  } catch (err) {
    console.error("Error login usuario:", err);
    return null;
  }
}

async function loginGuardia(correoInput, passInput) {
  try {
    const res = await fetch(`${API_URL}?action=getGuards`);
    const data = await res.json();
    if (!data.ok || !Array.isArray(data.data)) return null;

    const encontrado = data.data.find((g) => {
      const correo = (g.correo || "").toLowerCase().trim();
      const pass = (g.password || "").trim();
      const v = (g.vigente || "").toString().toLowerCase();
      const vigenteOK = v === "" || v === "si" || v === "sí" || v === "true";
      return correo === correoInput.toLowerCase() && pass === passInput && vigenteOK;
    });

    return encontrado || null;
  } catch (err) {
    console.error("Error login guardia:", err);
    return null;
  }
}

// createUser -> Apps Script -> valida en "Nomina Trabajadores" -> Mongo
async function registrarUsuarioEnBackend(payload) {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      // text/plain para evitar preflight de CORS
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "createUser",
        ...payload
      })
    });
    // como es text/plain igual podemos leerlo
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Error registrando usuario:", err);
    return { ok: false, message: "Error de red" };
  }
}
