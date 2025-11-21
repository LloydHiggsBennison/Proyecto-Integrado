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

      // 1) probar login como guardia (prioridad absoluta si el correo está en guardias)
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
          headers: {
            "Content-Type": "application/json"
          },
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
          console.error("Error parseando respuesta de /api/gas:", text);
          alert("Error del servidor al crear usuario.");
          return;
        }

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

/**
 * Login de guardia (más estricto):
 * - Si el correo existe en la tabla/hoja Guardias → se considera guardia.
 * - La contraseña se valida contra la tabla de Usuarios (getUserByEmail).
 * - Si todo ok → se devuelve el guardia; si no → null.
 */
async function intentarLoginGuardia(correo, password) {
  try {
    // 1) obtener todos los guardias
    const resGuards = await fetch(`${API_URL}?action=getGuards`);
    const dataGuards = await resGuards.json();
    if (!dataGuards.ok) return null;

    // ¿este correo está en la tabla de guardias?
    const guard = dataGuards.data.find(g =>
      (g.correo || "").trim().toLowerCase() === correo.toLowerCase()
    );
    if (!guard) {
      // no está en guardias → no es guardia
      return null;
    }

    // validar que el guardia esté vigente
    const v = (guard.vigente || "").toString().trim().toLowerCase();
    const guardVigenteOK = v === "" || v === "si" || v === "sí" || v === "true";
    if (!guardVigenteOK) {
      return null;
    }

    // 2) validar contraseña contra la tabla de usuarios (getUserByEmail)
    const resUser = await fetch(`${API_URL}?action=getUserByEmail&email=${encodeURIComponent(correo)}`);
    const dataUser = await resUser.json();

    if (!dataUser.ok || !dataUser.data) {
      // existe como guardia pero aún no tiene usuario creado
      return null;
    }

    const u = dataUser.data;
    const p = (u.password || "").trim();
    const vUser = (u.vigente || "").toString().trim().toLowerCase();
    const userVigenteOK = vUser === "" || vUser === "si" || vUser === "sí" || vUser === "true";

    if (p !== password || !userVigenteOK) {
      return null;
    }

    // 3) devolvemos objeto combinado (guardia confirmado)
    return {
      ...guard,
      correo: u.correo || guard.correo
    };
  } catch (err) {
    console.error("Error login guardia:", err);
    return null;
  }
}

// Login de usuario normal (trabajador)
async function intentarLoginUsuario(correo, password) {
  try {
    const res = await fetch(`${API_URL}?action=getUserByEmail&email=${encodeURIComponent(correo)}`);
    const data = await res.json();
    console.log("getUserByEmail respuesta:", data);

    if (!data.ok || !data.data) return null;

    const u = data.data;
    const c = (u.correo || "").trim().toLowerCase();
    const p = (u.password || "").trim();
    const v = (u.vigente || "").toString().trim().toLowerCase();

    const vigenteOK = v === "" || v === "si" || v === "sí" || v === "true";

    if (c === correo.toLowerCase() && p === password && vigenteOK) {
      return u;
    }

    return null;
  } catch (err) {
    console.error("Error login usuario:", err);
    return null;
  }
}

/* ================== REGISTRO HELPERS ================== */

// ¿correo está en tabla Usuario ya creado?
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

// ¿correo está en Nómina (nomina_trabajadores)?
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

// ¿correo está en Guardia?
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
