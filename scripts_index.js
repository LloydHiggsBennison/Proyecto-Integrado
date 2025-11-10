// scripts_index.js
const API_URL = "/api/gas";

document.addEventListener("DOMContentLoaded", () => {
  const card = document.querySelector("#card3d");
  const btnShowRegister = document.querySelector("#btn-show-register");
  const btnBackLogin = document.querySelector("#btn-back-login");
  const formLogin = document.querySelector("#login-form");
  const formRegister = document.querySelector("#register-form");

  // pasar a registro
  if (btnShowRegister && card) {
    btnShowRegister.addEventListener("click", () => card.classList.add("is-flipped"));
  }
  // volver a login
  if (btnBackLogin && card) {
    btnBackLogin.addEventListener("click", () => card.classList.remove("is-flipped"));
  }

  /* ================== LOGIN ================== */
  if (formLogin) {
    formLogin.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const correo = (document.querySelector("#username")?.value || "").trim();
      const password = (document.querySelector("#password")?.value || "").trim();

      if (!correo || !password) {
        alert("Completa usuario y contraseña");
        return;
      }

      // 1) probar login como guardia
      const guardia = await intentarLoginGuardia(correo, password);
      if (guardia) {
        localStorage.setItem("sesionActual", JSON.stringify({
          rol: "guardia",
          nombre: guardia.nombre,
          apellido: guardia.apellido,
          correo: guardia.correo,
          sucursal: guardia.sucursal || ""
        }));
        window.location.href = "index_Guardia.html";
        return;
      }

      // 2) probar login como usuario
      const usuario = await intentarLoginUsuario(correo, password);
      if (usuario) {
        localStorage.setItem("sesionActual", JSON.stringify({
          rol: "usuario",
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          correo: usuario.correo,
          tipoContrato: usuario.tipoContrato,
          tipoBeneficio: usuario.tipoBeneficio,
          vigente: usuario.vigente
        }));
        window.location.href = "index_Usuario.html";
        return;
      }

      alert("Credenciales incorrectas o usuario no vigente.");
    });
  }

  /* ================== REGISTRO ================== */
  if (formRegister) {
    formRegister.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const correo = (document.querySelector("#reg-correo")?.value || "").trim();
      const password = (document.querySelector("#reg-password")?.value || "").trim();

      if (!correo || !password) {
        alert("Completa correo y contraseña.");
        return;
      }

      try {
        // 1️⃣ ¿ya existe como usuario?
        const yaEsUsuario = await existeEnUsuarios(correo);
        if (yaEsUsuario) {
          alert("Este correo ya tiene un usuario creado. Inicia sesión.");
          return;
        }

        // 2️⃣ validar que esté en al menos una de las dos: Nómina o Guardias
        const estaEnNomina = await existeEnNomina(correo);
        const estaEnGuardias = await existeEnGuardias(correo);

        if (!estaEnNomina && !estaEnGuardias) {
          alert("Tu correo no está en 'Nomina Trabajadores' ni en 'Guardia'. No puedes registrarte.");
          return;
        }

        // 3️⃣ si pasó la validación, lo creamos en Usuario
        const res = await fetch(API_URL, {
          method: "POST",
          body: JSON.stringify({
            action: "createUser",
            correo,
            password
          })
        });
        const data = await res.json();
        if (data.ok) {
          alert("Usuario creado. Ahora puedes iniciar sesión.");
          if (card) card.classList.remove("is-flipped");
        } else {
          alert(data.message || "No se pudo crear el usuario.");
        }
      } catch (err) {
        console.error(err);
        alert("Error creando usuario.");
      }
    });
  }
});

/* ================== LOGIN HELPERS ================== */

async function intentarLoginGuardia(correo, password) {
  try {
    const res = await fetch(`${API_URL}?action=getGuards`);
    const data = await res.json();
    if (!data.ok) return null;

    const found = data.data.find(g => {
      const c = (g.correo || "").trim().toLowerCase();
      const p = (g.password || "").trim();
      const v = (g.vigente || "").trim().toLowerCase();
      const vigenteOK = v === "" || v === "si" || v === "sí" || v === "true";
      return c === correo.toLowerCase() && p === password && vigenteOK;
    });

    return found || null;
  } catch (err) {
    console.error("Error login guardia:", err);
    return null;
  }
}

async function intentarLoginUsuario(correo, password) {
  try {
    const res = await fetch(`${API_URL}?action=getUsers`);
    const data = await res.json();
    if (!data.ok) return null;

    const found = data.data.find(u => {
      const c = (u.correo || "").trim().toLowerCase();
      const p = (u.password || "").trim();
      const v = (u.vigente || "").trim().toLowerCase();
      const vigenteOK = v === "" || v === "si" || v === "sí" || v === "true";
      return c === correo.toLowerCase() && p === password && vigenteOK;
    });

    return found || null;
  } catch (err) {
    console.error("Error login usuario:", err);
    return null;
  }
}

/* ================== REGISTRO HELPERS ================== */

// ¿correo está en pestaña Usuario ya creado?
async function existeEnUsuarios(correo) {
  try {
    const res = await fetch(`${API_URL}?action=getUsers`);
    const data = await res.json();
    if (!data.ok) return false;
    return data.data.some(u => (u.correo || "").trim().toLowerCase() === correo.toLowerCase());
  } catch (e) {
    console.error(e);
    return false;
  }
}

// ¿correo está en pestaña Nomina Trabajadores?
async function existeEnNomina(correo) {
  try {
    const res = await fetch(`${API_URL}?action=getNomina`);
    const data = await res.json();
    if (!data.ok) return false;
    return data.data.some(n => (n.correo || "").trim().toLowerCase() === correo.toLowerCase());
  } catch (e) {
    console.error(e);
    return false;
  }
}

// ¿correo está en pestaña Guardia?
async function existeEnGuardias(correo) {
  try {
    const res = await fetch(`${API_URL}?action=getGuards`);
    const data = await res.json();
    if (!data.ok) return false;
    return data.data.some(g => (g.correo || "").trim().toLowerCase() === correo.toLowerCase());
  } catch (e) {
    console.error(e);
    return false;
  }
}
