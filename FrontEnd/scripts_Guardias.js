// scripts_Guardias.js (versión Railway)
const API_URL = "https://proyecto-integrado-production.up.railway.app";

document.addEventListener("DOMContentLoaded", () => {
  const sesion = JSON.parse(localStorage.getItem("sesionActual") || "null");

  if (!sesion || sesion.rol !== "guardia") {
    alert("No tienes permisos o no has iniciado sesión como guardia.");
    window.location.href = "index.html";
    return;
  }

  const h1 = document.querySelector("h1");
  if (h1) {
    h1.textContent = `Hola!, ${sesion.nombre} 👋`;
  }

  // panel donde mostramos info
  const panel = document.createElement("div");
  panel.id = "panel-guardia";
  panel.style.marginTop = "20px";
  panel.style.background = "#fff";
  panel.style.border = "1px solid #d1d5db";
  panel.style.borderRadius = "0.75rem";
  panel.style.padding = "1.25rem 1.5rem";
  document.querySelector(".main-content").appendChild(panel);

  const btnEntrega = document.querySelector("#button1");
  const btnInfo = document.querySelector("#button2");
  const btnAdmin = document.querySelector("#button3");

  // ====== 1. REGISTRAR ENTREGA ======
  if (btnEntrega) {
    btnEntrega.addEventListener("click", async () => {
      panel.innerHTML = "<h3>Entrega de cajas</h3><p>Escaneando trabajador...</p>";

      // IMPORTANTE:
      // Como el backend actual SOLO tiene /usuarios/by-email,
      // aquí pedimos el CORREO del trabajador (puede venir del QR)
      const identificador = prompt("Escanee / ingrese CORREO del trabajador:");
      if (!identificador) {
        panel.innerHTML += "<p>Escaneo cancelado.</p>";
        return;
      }

      // buscar en colección usuarios
      const trabajador = await obtenerUsuarioPorCorreo(identificador);
      if (!trabajador) {
        panel.innerHTML += "<p style='color:red'>Trabajador no encontrado en la base de usuarios.</p>";
        return;
      }

      panel.innerHTML += `<p>Trabajador: <strong>${trabajador.nombre || ""} ${trabajador.apellido || ""}</strong> (${trabajador.correo})</p>`;
      panel.innerHTML += `<p>Contrato: ${trabajador.tipoContrato || "-"}</p>`;
      panel.innerHTML += `<p>Beneficio asignado: ${trabajador.tipoBeneficio || "-"}</p>`;

      // 2. QR de la caja / tipo de caja
      const qrCaja = prompt("Escanee / ingrese código de la caja (Caja Grande / Caja Pequeña):");
      if (!qrCaja) {
        panel.innerHTML += "<p>Escaneo de caja cancelado.</p>";
        return;
      }

      // validación de coincidencia con beneficio del trabajador
      if (
        trabajador.tipoBeneficio &&
        trabajador.tipoBeneficio.trim() !== "" &&
        trabajador.tipoBeneficio.trim().toLowerCase() !== qrCaja.trim().toLowerCase()
      ) {
        panel.innerHTML += `<p style='color:red'>La caja <strong>${qrCaja}</strong> no corresponde al beneficio asignado (${trabajador.tipoBeneficio}).</p>`;
        return;
      }

      // 3. confirmación
      const confirma = confirm("El trabajador confirma con huella (simulado). ¿Registrar entrega?");
      if (!confirma) {
        panel.innerHTML += "<p>Entrega cancelada.</p>";
        return;
      }

      // 4. registrar en Mongo vía /entregas
      const ok = await registrarEntregaEnMongo({
        nombreGuardia: sesion.nombre.split(" ")[0] || sesion.nombre,
        apellidoGuardia: sesion.nombre.split(" ")[1] || "",
        correoGuardia: sesion.correo,
        usuarioEntregado: trabajador.correo,
        tipoContrato: trabajador.tipoContrato || "",
        tipoBeneficio: trabajador.tipoBeneficio || "",
        // si el usuario tiene qrToken lo mandamos para poder validar 1 uso
        qrToken: trabajador.qrToken || "",
      });

      if (ok) {
        panel.innerHTML += `<p style='color:green'>Entrega registrada correctamente ✅</p>`;
      } else {
        panel.innerHTML += `<p style='color:red'>No se pudo registrar la entrega.</p>`;
      }
    });
  }

  // ====== 2. INFO ======
  if (btnInfo) {
    btnInfo.addEventListener("click", () => {
      panel.innerHTML = `
        <h3>Instrucciones</h3>
        <ol>
          <li>Escanear o escribir el <strong>correo</strong> del trabajador.</li>
          <li>El sistema valida contra Mongo (colección <code>usuarios</code>).</li>
          <li>Escanear el código de la caja (nombre del beneficio).</li>
          <li>Si coincide el beneficio, confirmar.</li>
          <li>Se registra en la colección <code>entregas</code>.</li>
        </ol>
      `;
    });
  }

  // ====== 3. ADMIN ======
  if (btnAdmin) {
    btnAdmin.addEventListener("click", () => {
      panel.innerHTML = "<h3>Administración</h3><p>En MongoDB puedes revisar la colección <code>entregas</code> y <code>usuarios</code>.</p>";
    });
  }
});

/* =========================================================
   HELPERS
   ========================================================= */

// obtener usuario por correo desde Railway
async function obtenerUsuarioPorCorreo(correo) {
  try {
    const res = await fetch(`${API_URL}/usuarios/by-email?email=${encodeURIComponent(correo)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.ok) return null;
    return data.usuario;
  } catch (err) {
    console.error("Error obteniendo trabajador por correo:", err);
    return null;
  }
}

// registrar entrega en Railway (colección entregas)
async function registrarEntregaEnMongo(payload) {
  try {
    const res = await fetch(`${API_URL}/entregas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guardiaNombre: `${payload.nombreGuardia} ${payload.apellidoGuardia}`.trim(),
        guardiaCorreo: payload.correoGuardia,
        usuarioCorreo: payload.usuarioEntregado,
        tipoContrato: payload.tipoContrato,
        tipoBeneficio: payload.tipoBeneficio,
        qrTokenUsado: payload.qrToken,
        origen: "web",
      }),
    });
    const data = await res.json();
    return data.ok === true;
  } catch (err) {
    console.error("Error registrando entrega:", err);
    return false;
  }
}
