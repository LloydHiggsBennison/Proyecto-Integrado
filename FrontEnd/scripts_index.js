// scripts_index.js

// ======================= CONFIGURACIÓN =======================
const API_URL = "https://script.google.com/macros/s/AKfycbwNBxKJrKuyRhG2GLa29MxNYe3GESDJm4-SRMYRUDbnJl-jXcI5O8TSxJG-6Fmw-muY4A/exec";

document.addEventListener("DOMContentLoaded", () => {
  const card = document.querySelector("#card3d");
  const btnShowRegister = document.querySelector("#btn-show-register");
  const btnBackLogin = document.querySelector("#btn-back-login");

  if (btnShowRegister && card) {
    btnShowRegister.addEventListener("click", () => {
      card.classList.add("is-flipped");
    });
  }

  if (btnBackLogin && card) {
    btnBackLogin.addEventListener("click", () => {
      card.classList.remove("is-flipped");
    });
  }

  // ===== LOGIN =====
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

      // 1) probar como usuario
      const usuario = await loginUsuario(username, password);
      if (usuario) {
        localStorage.setItem("sesionActual", JSON.stringify({ tipo: "usuario", ...usuario }));
        window.location.href = "usuario.html";
        return;
      }

      // 2) probar como guardia
      const guardia = await loginGuardia(username, password);
      if (guardia) {
        localStorage.setItem("sesionActual", JSON.stringify({ tipo: "guardia", ...guardia }));
        window.location.href = "guardia.html";
        return;
      }

      alert("Credenciales no válidas o usuario no vigente.");
    });
  }

  // ===== REGISTRO =====
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

      const resp = await registrarUsuarioEnBackend({ nombre, apellido, correo, password });

      // si vuelve error de despliegue
      if (resp._htmlError) {
        console.error("Apps Script devolvió HTML. Publica el Web App como 'Cualquiera con el enlace'.");
        alert("El backend no está publicado como Web App público. Revisa Apps Script.");
        return;
      }

      if (resp?.ok) {
        // solo mostramos el QR si realmente lo mandó el backend
        const qrMostrable = resp.qrToken ? ` QR: ${resp.qrToken}` : "";
        alert("Usuario creado en Mongo." + qrMostrable);
        if (card) card.classList.remove("is-flipped");
      } else {
        alert(resp?.message || "No se pudo crear el usuario (¿está en la nómina?).");
      }
    });
  }
});

// ======================= FUNCIONES =======================

// login de usuario
async function loginUsuario(correoInput, passInput) {
  try {
    const res = await fetch(`${API_URL}?action=getUserByEmail&email=${encodeURIComponent(correoInput)}`);
    const data = await safeJson(res);
    if (!data || !data.ok || !data.data) return null;

    const u = data.data;
    const vigenteOK = !u.vigente || u.vigente === "SI" || u.vigente === "si" || u.vigente === "true";

    if (u.correo?.toLowerCase() === correoInput.toLowerCase() && u.password === passInput && vigenteOK) {
      return u;
    }
    return null;
  } catch (err) {
    console.error("Error login usuario:", err);
    return null;
  }
}

// login de guardia
async function loginGuardia(correoInput, passInput) {
  try {
    const res = await fetch(`${API_URL}?action=getGuards`);
    const data = await safeJson(res);
    if (!data || !data.ok || !Array.isArray(data.data)) return null;

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

// crear usuario pero evitando preflight y detectando HTML
async function registrarUsuarioEnBackend(payload) {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "createUser", ...payload })
    });

    const data = await safeJson(res);
    return data;
  } catch (err) {
    console.error("Error registrando usuario:", err);
    return { ok: false, message: "Error de red" };
  }
}

// helper: intenta parsear JSON, si no, marca que vino HTML
async function safeJson(res) {
  const text = await res.text();
  if (text.trim().startsWith("<")) {
    // esto es HTML -> no está publicado el Web App
    return { _htmlError: true, raw: text };
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("No es JSON válido:", text);
    return null;
  }
}