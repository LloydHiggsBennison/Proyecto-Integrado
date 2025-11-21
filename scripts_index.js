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
        Swal.fire({
          icon: "warning",
          title: "Campos incompletos",
          text: "Completa usuario y contraseña.",
        });
        return;
      }

      // 1) login como guardia
      const guardia = await intentarLoginGuardia(correo, password);
      if (guardia) {
        localStorage.setItem("sesionActual", JSON.stringify({
          rol: "guardia",
          nombre: guardia.nombre,
          apellido: guardia.apellido,
          correo: (guardia.correo || correo),
          sucursal: guardia.sucursal || ""
        }));

        window.location.href = "index_Guardia.html";
        return;
      }

      // 2) login como usuario normal
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

      Swal.fire({
        icon: "error",
        title: "Credenciales incorrectas",
        text: "Revisa tu correo y contraseña o verifica tu vigencia.",
      });
    });
  }

  /* ================== REGISTRO ================== */
  if (formRegister) {
    formRegister.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const correo = (document.querySelector("#reg-correo")?.value || "").trim();
      const password = (document.querySelector("#reg-password")?.value || "").trim();

      if (!correo || !password) {
        Swal.fire({
          icon: "warning",
          title: "Campos incompletos",
          text: "Completa correo y contraseña.",
        });
        return;
      }

      try {
        // 1️⃣ ¿ya existe en Usuarios?
        const yaEsUsuario = await existeEnUsuarios(correo);
        if (yaEsUsuario) {
          Swal.fire({
            icon: "info",
            title: "Ya tienes cuenta",
            text: "Este correo ya está registrado. Inicia sesión.",
          });
          return;
        }

        // 2️⃣ validar si está en Nómina o Guardia
        const estaEnNomina = await existeEnNomina(correo);
        const estaEnGuardias = await existeEnGuardias(correo);

        if (!estaEnNomina && !estaEnGuardias) {
          Swal.fire({
            icon: "error",
            title: "Correo no autorizado",
            text: "Tu correo no está en Nómina o Guardia. No puedes registrarte.",
          });
          return;
        }

        // 3️⃣ crear usuario
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "createUser",
            correo,
            password
          })
        });

        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text || "{}");
        } catch (e) {
          console.error("Error parseando respuesta GAS:", text);
          Swal.fire({
            icon: "error",
            title: "Error del servidor",
            text: "No se pudo procesar la respuesta del servidor.",
          });
          return;
        }

        // 4️⃣ feedback visual
        if (data.ok) {
          Swal.fire({
            icon: "success",
            title: "¡Usuario creado!",
            text: "Ahora puedes iniciar sesión.",
            confirmButtonText: "Continuar",
            confirmButtonColor: "#3085d6"
          }).then(() => {
            if (card) card.classList.remove("is-flipped");
          });

        } else {
          Swal.fire({
            icon: "error",
            title: "No se pudo crear la cuenta",
            text: data.message || "Revisa los datos e inténtalo nuevamente.",
          });
        }

      } catch (err) {
        console.error(err);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Ocurrió un error creando el usuario.",
        });
      }
    });
  }
});

/* ================== LOGIN HELPERS ================== */
async function intentarLoginGuardia(correo, password) {
  try {
    const resGuards = await fetch(`${API_URL}?action=getGuards`);
    const dataGuards = await resGuards.json();
    if (!dataGuards.ok) return null;

    const guard = dataGuards.data.find(g =>
      (g.correo || "").trim().toLowerCase() === correo.toLowerCase()
    );
    if (!guard) return null;

    const v = (guard.vigente || "").toString().trim().toLowerCase();
    const guardVigenteOK = v === "" || v === "si" || v === "sí" || v === "true";
    if (!guardVigenteOK) return null;

    const resUser = await fetch(`${API_URL}?action=getUserByEmail&email=${encodeURIComponent(correo)}`);
    const dataUser = await resUser.json();
    if (!dataUser.ok || !dataUser.data) return null;

    const u = dataUser.data;
    const p = (u.password || "").trim();
    const vUser = (u.vigente || "").trim().toLowerCase();
    const userVigenteOK = vUser === "" || vUser === "si" || vUser === "sí" || vUser === "true";

    if (p !== password || !userVigenteOK) return null;

    return { ...guard, correo: u.correo || guard.correo };
  } catch (err) {
    console.error("Error login guardia:", err);
    return null;
  }
}

async function intentarLoginUsuario(correo, password) {
  try {
    const res = await fetch(`${API_URL}?action=getUserByEmail&email=${encodeURIComponent(correo)}`);
    const data = await res.json();
    if (!data.ok || !data.data) return null;

    const u = data.data;
    const c = (u.correo || "").trim().toLowerCase();
    const p = (u.password || "").trim();
    const v = (u.vigente || "").trim().toLowerCase();

    const vigenteOK = v === "" || v === "si" || v === "sí" || v === "true";
    if (c === correo.toLowerCase() && p === password && vigenteOK) return u;

    return null;
  } catch (err) {
    console.error("Error login usuario:", err);
    return null;
  }
}

/* ================== REGISTRO HELPERS ================== */
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
