// scripts_index.js
const API_URL = "https://script.google.com/macros/s/AKfycbzRy5XT7RMgo89ZTPZm0LQw3WhvHMkE2AKr9knVu-wVvmltSm8Yv3Ivmka0vqnFEYDmiQ/exec";

document.addEventListener("DOMContentLoaded", () => {
  const card = document.querySelector("#card3d");
  const btnShowRegister = document.querySelector("#btn-show-register");
  const btnBackLogin = document.querySelector("#btn-back-login");

  // ir a registro
  if (btnShowRegister) {
    btnShowRegister.addEventListener("click", () => {
      card.classList.add("is-flipped");
    });
  }
  // volver a login
  if (btnBackLogin) {
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

      const usuario = await loginUsuario(username, password);
      if (usuario) {
        localStorage.setItem("sesionActual", JSON.stringify({
          rol: "usuario",
          nombre: `${usuario.nombre} ${usuario.apellido}`.trim(),
          correo: usuario.correo,
          tipoContrato: usuario.tipoContrato,
          tipoBeneficio: usuario.tipoBeneficio,
          estadoEntrega: usuario.estadoEntrega || ''
        }));
        window.location.href = "index_Usuario.html";
        return;
      }

      const guardia = await loginGuardia(username, password);
      if (guardia) {
        localStorage.setItem("sesionActual", JSON.stringify({
          rol: "guardia",
          nombre: `${guardia.nombre} ${guardia.apellido}`.trim(),
          correo: guardia.correo
        }));
        window.location.href = "index_Guardia.html";
        return;
      }

      alert("Usuario o contraseña no válidos, o no vigentes.");
    });
  }

  /* ===== REGISTRO ===== */
  const registerForm = document.querySelector("#register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const correo = document.querySelector("#reg-correo")?.value.trim() || "";
      const password = document.querySelector("#reg-password")?.value.trim() || "";
      const nombre = document.querySelector("#reg-nombre")?.value.trim() || "";
      const apellido = document.querySelector("#reg-apellido")?.value.trim() || "";

      if (!correo || !password) {
        alert("Ingresa al menos correo y contraseña.");
        return;
      }

      try {
        const res = await fetch(API_URL, {
          method: "POST",
          body: JSON.stringify({
            action: "createUser",
            correo,
            password,
            nombre,
            apellido
          })
        });
        const data = await res.json();
        if (data.ok) {
          alert("Usuario creado. Ahora inicia sesión.");

          // rellenar login SOLO si existen esos inputs
          const loginEmail = document.querySelector("#username");
          const loginPass = document.querySelector("#password");
          if (loginEmail) loginEmail.value = correo;
          if (loginPass) loginPass.value = password;

          // volver a la cara de login
          card.classList.remove("is-flipped");
        } else {
          alert("No se pudo crear el usuario.");
        }
      } catch (err) {
        console.error(err);
        alert("Error al conectar con el servidor.");
      }
    });
  }
});

/* ==== helpers de login ==== */

async function loginUsuario(correo, password) {
  try {
    const res = await fetch(`${API_URL}?action=getUsers`);
    const data = await res.json();
    if (!data.ok) return null;

    const correoInput = correo.trim().toLowerCase();
    const passInput = password.trim();

    const encontrado = data.data.find(u => {
      const correoSheet = (u.correo || '').trim().toLowerCase();
      const passSheet = (u.password || '').trim();
      const vigenteSheet = (u.vigente || '').trim().toLowerCase();
      const vigenteOK = (vigenteSheet === '' || vigenteSheet === 'si' || vigenteSheet === 'sí' || vigenteSheet === 'true');
      return correoSheet === correoInput && passSheet === passInput && vigenteOK;
    });

    return encontrado || null;
  } catch (err) {
    console.error("Error login usuario:", err);
    return null;
  }
}

async function loginGuardia(correo, password) {
  try {
    const res = await fetch(`${API_URL}?action=getGuards`);
    const data = await res.json();
    if (!data.ok) return null;

    const correoInput = correo.trim().toLowerCase();
    const passInput = password.trim();

    const encontrado = data.data.find(g => {
      const correoSheet = (g.correo || '').trim().toLowerCase();
      const passSheet = (g.password || '').trim();
      const vigenteSheet = (g.vigente || '').trim().toLowerCase();
      const vigenteOK = (vigenteSheet === '' || vigenteSheet === 'si' || vigenteSheet === 'sí' || vigenteSheet === 'true');
      return correoSheet === correoInput && passSheet === passInput && vigenteOK;
    });

    return encontrado || null;
  } catch (err) {
    console.error("Error login guardia:", err);
    return null;
  }
}