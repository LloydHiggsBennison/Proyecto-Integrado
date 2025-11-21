// scripts_Guardias.js
const API_URL = "/api/gas";

document.addEventListener("DOMContentLoaded", () => {
  const sesion = JSON.parse(localStorage.getItem("sesionActual") || "null");

  // Validar sesión con SweetAlert2
  if (!sesion || sesion.rol !== "guardia" || !sesion.correo) {
    Swal.fire({
      icon: "error",
      title: "Acceso restringido",
      text: "Debes iniciar sesión como guardia."
    }).then(() => {
      window.location.href = "index.html";
    });
    return;
  }

  // Saludo dinámico
  const saludoEl = document.getElementById("saludo");
  if (saludoEl) saludoEl.textContent = `¡Hola, ${sesion.nombre} 👋`;

  const main = document.querySelector(".main-content");
  if (!main) return;

  let panelContenido = document.getElementById("panel-guardia-contenido");
  if (!panelContenido) {
    panelContenido = document.createElement("div");
    panelContenido.id = "panel-guardia-contenido";
    panelContenido.style.marginTop = "1.5rem";
    main.appendChild(panelContenido);
  }

  panelContenido.innerHTML = "<p>Selecciona una opción.</p>";

  document.getElementById("button1")?.addEventListener("click", () => escanearFlujo(panelContenido, sesion));
  document.getElementById("button2")?.addEventListener("click", () => mostrarInstrucciones(panelContenido));
  document.getElementById("button3")?.addEventListener("click", () => mostrarAdmin(panelContenido));
});

/* ============================================================
   FLUJO PRINCIPAL DE ESCANEO
=============================================================== */
async function escanearFlujo(panelContenido, sesion) {
  panelContenido.innerHTML = `<h3>Entrega de cajas</h3><p>Escaneando trabajador (token)...</p>`;

  /* 1️⃣ TOKEN DEL TRABAJADOR */
  const tokenTrabajador = await Swal.fire({
    title: "Escanear QR del trabajador",
    input: "text",
    inputLabel: "Token QR del trabajador",
    inputPlaceholder: "Ej: QR-ABC1234",
    showCancelButton: true,
    confirmButtonText: "Aceptar",
    cancelButtonText: "Cancelar"
  }).then(r => r.isConfirmed ? r.value : null);

  if (!tokenTrabajador) {
    panelContenido.innerHTML += "<p>Operación cancelada.</p>";
    return;
  }

  const trabajador = await buscarTrabajadorPorToken(tokenTrabajador);
  if (!trabajador) {
    Swal.fire({
      icon: "error",
      title: "No encontrado",
      text: "No se encontró un trabajador con ese token."
    });
    panelContenido.innerHTML = `
      <h3>Entrega de cajas</h3>
      <p style="color:red;">Trabajador no encontrado.</p>
    `;
    return;
  }

  /* 2️⃣ TOKEN DE LA CAJA */
  const tokenCaja = await Swal.fire({
    title: "Escanear QR de la caja",
    input: "text",
    inputLabel: "Token de la caja",
    inputPlaceholder: "Ej: Caja Grande / Caja Pequeña",
    showCancelButton: true,
    confirmButtonText: "Aceptar",
    cancelButtonText: "Cancelar"
  }).then(r => r.isConfirmed ? r.value : null);

  if (!tokenCaja) {
    panelContenido.innerHTML += "<p>Operación cancelada.</p>";
    return;
  }

  /* ============================================================
     VALIDACIONES
  =============================================================== */

  const qrCajaHoja = (trabajador.qrCaja || "").toLowerCase();
  const qrCajaLeida = tokenCaja.toLowerCase();
  const coincideQR = qrCajaHoja && qrCajaHoja === qrCajaLeida;

  const contrato = (trabajador.tipoContrato || "").toLowerCase();

  const tipoEsperado = contrato.includes("indefinido")
    ? "caja grande"
    : contrato.includes("plazo fijo")
      ? "caja pequeña"
      : "";

  const coincideTipo = tipoEsperado && qrCajaLeida.includes(tipoEsperado);

  /* Pintar datos */
  panelContenido.innerHTML = `
    <h3>Entrega de cajas</h3>
    <p>Trabajador: <strong>${trabajador.nombre} ${trabajador.apellido}</strong> (${trabajador.correo})</p>
    <p>Contrato: ${trabajador.tipoContrato || "-"}</p>
    <p>Beneficio asignado: ${trabajador.tipoBeneficio || "-"}</p>
    <p>QR trabajador: ${trabajador.qrToken}</p>
    <p>QR caja leído: ${tokenCaja}</p>
  `;

  if (!coincideQR) {
    Swal.fire({
      icon: "error",
      title: "Caja incorrecta",
      text: "El QR de la caja no coincide con el asignado al trabajador."
    });
    panelContenido.innerHTML += `<p style="color:red;">❌ La caja escaneada NO corresponde a la asignada.</p>`;
    return;
  }

  if (!coincideTipo) {
    Swal.fire({
      icon: "error",
      title: "Tipo incorrecto",
      text: `El contrato (${trabajador.tipoContrato}) no coincide con la caja (${tokenCaja}).`
    });
    panelContenido.innerHTML += `<p style="color:red;">❌ Tipo de caja incorrecto.</p>`;
    return;
  }

  /* 6️⃣ Registrar entrega */
  panelContenido.innerHTML += `<p style="color:green;">Validación correcta. Registrando entrega...</p>`;

  try {
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "logEntrega",
        nombreUsuario: `${trabajador.nombre} ${trabajador.apellido}`.trim(),
        correoUsuario: trabajador.correo,
        fechaEntrega: new Date().toISOString(),
        sucursal: sesion.sucursal || "",
        nombreGuardia: sesion.nombre || "Guardia",
        qrToken: trabajador.qrToken,
        qrCaja: tokenCaja
      })
    });

    Swal.fire({
      icon: "success",
      title: "Entrega registrada",
      text: "La entrega fue registrada correctamente."
    });

    panelContenido.innerHTML += `<p style="color:green;">Entrega registrada ✔️</p>`;

  } catch (err) {
    console.error("Error registrando entrega:", err);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "No se pudo registrar la entrega."
    });
    panelContenido.innerHTML += `<p style="color:red;">Error al registrar entrega.</p>`;
  }
}

/* ============================================================
   CONSULTA A GOOGLE APPS SCRIPT → buscar usuario por token
=============================================================== */
async function buscarTrabajadorPorToken(token) {
  try {
    const res = await fetch(`${API_URL}?action=getUserByToken&token=${encodeURIComponent(token)}`);
    const data = await res.json();

    if (data.ok && data.data) {
      return {
        nombre: data.data.nombre || "",
        apellido: data.data.apellido || "",
        correo: data.data.correo || "",
        tipoContrato: data.data.tipoContrato || "",
        tipoBeneficio: data.data.tipoBeneficio || "",
        qrToken: data.data.qrToken || token,
        qrCaja: data.data.qrCaja || ""
      };
    }
  } catch (e) {
    console.error("Error buscando token:", e);
  }
  return null;
}

/* ============================================================
   OTRAS VISTAS
=============================================================== */
function mostrarInstrucciones(panelContenido) {
  panelContenido.innerHTML = `
    <h3>Instrucciones</h3>
    <ol>
      <li>Escanea o ingresa el QR del trabajador.</li>
      <li>Luego escanea el QR de la caja asignada.</li>
      <li>El sistema verificará automáticamente la coincidencia.</li>
      <li>Si todo es correcto, se registrará la entrega.</li>
    </ol>
  `;
}

function mostrarAdmin(panelContenido) {
  panelContenido.innerHTML = `
    <h3>Administrar</h3>
    <p>Función en desarrollo.</p>
  `;
}
