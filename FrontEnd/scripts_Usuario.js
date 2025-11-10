// ======================= CONFIGURACIÓN =======================

// ahora apuntamos al backend de Railway
const API_URL = "https://proyecto-integrado-production.up.railway.app";

// ======================= INICIO =======================

document.addEventListener("DOMContentLoaded", () => {
  const sesion = JSON.parse(localStorage.getItem("sesionActual") || "{}");

  if (!sesion || !sesion.correo) {
    alert("Debes iniciar sesión nuevamente.");
    window.location.href = "index.html";
    return;
  }

  const h1 = document.querySelector("h1");
  if (h1) {
    h1.textContent = `Hola!, ${sesion.nombre || sesion.correo} 👋`;
  }

  let panelDinamico = document.createElement("section");
  panelDinamico.id = "panel-dinamico";
  document.querySelector(".main-content").appendChild(panelDinamico);

  document.getElementById("button1").addEventListener("click", mostrarQRUsuario);
  document.getElementById("button2").addEventListener("click", mostrarEstadoEntrega);
  document.getElementById("button3").addEventListener("click", mostrarPerfilUsuario);
  document.getElementById("button4").addEventListener("click", mostrarConfiguracion);

  // que muestre algo de entrada
  mostrarQRUsuario();
});

// ======================= BOTÓN: MOSTRAR QR =======================

async function mostrarQRUsuario() {
  const sesion = JSON.parse(localStorage.getItem("sesionActual") || "{}");
  const correo = sesion.correo;
  const panel = document.getElementById("panel-dinamico");

  const usuario = await obtenerUsuarioPorCorreo(correo);
  if (!usuario) {
    panel.innerHTML = "<p>No se encontró información del usuario.</p>";
    return;
  }

  // en Mongo guardamos qrToken en el campo "qrToken"
  const qrToken = usuario.qrToken || usuario.correo;

  // si guardas una fecha ISO o un yyyy-MM, mostramos algo legible
  const qrVigencia = formatearFechaChile(usuario.qrVigencia) || "Sin fecha";

  // Cálculo dinámico de usos restantes (si todavía no lo guardas en mongo, lo dejamos así)
  const estado = (usuario.estadoEntrega || "").toLowerCase();
  const usosRestantes = estado === "entregado" ? "0 / 1" : "1 / 1";

  // mismo proveedor de QR que tenías
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    qrToken
  )}`;

  panel.innerHTML = `
    <h2>Tu código QR</h2>
    <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:2rem;">
      <div style="flex:1;">
        <p><strong>Nombre:</strong> ${usuario.nombre || ""} ${usuario.apellido || ""}</p>
        <p><strong>Correo:</strong> ${usuario.correo || ""}</p>
        <p><strong>Vigencia:</strong> ${qrVigencia}</p>
        <p><strong>Token:</strong> ${qrToken}</p>
        <p><strong>Usos restantes:</strong> ${usosRestantes}</p>
      </div>
      <div style="min-width:200px; text-align:center;">
        <img src="${qrUrl}" alt="QR del usuario"
          style="width:200px; height:200px; border:2px solid #ccc; border-radius:8px; background:#fff;">
        <p style="font-size:0.9rem; color:#64748b;">Código QR válido por 60 días</p>
      </div>
    </div>
  `;
}

// ======================= BOTÓN: ESTADO ENTREGA =======================

async function mostrarEstadoEntrega() {
  const sesion = JSON.parse(localStorage.getItem("sesionActual") || "{}");
  const correo = sesion.correo;
  const panel = document.getElementById("panel-dinamico");

  const usuario = await obtenerUsuarioPorCorreo(correo);
  if (!usuario) {
    panel.innerHTML = "<p>No se encontró información del usuario.</p>";
    return;
  }

  const estadoEntrega = usuario.estadoEntrega || "Pendiente";

  const estadoColor =
    estadoEntrega.toLowerCase() === "entregado"
      ? "green"
      : estadoEntrega.toLowerCase() === "pendiente"
      ? "orange"
      : "red";

  const fechaRecepcion = formatearFechaChile(usuario.fechaRecepcion);

  panel.innerHTML = `
    <h2>Estado de tu entrega</h2>
    <p><strong>Contrato:</strong> ${usuario.tipoContrato || "—"}</p>
    <p><strong>Beneficio:</strong> ${usuario.tipoBeneficio || "—"}</p>
    <p><strong>Estado:</strong> <span style="color:${estadoColor}; font-weight:bold;">${estadoEntrega}</span></p>
    <p><strong>Fecha recepción:</strong> ${fechaRecepcion || "—"}</p>
  `;
}

// ======================= BOTÓN: PERFIL =======================

async function mostrarPerfilUsuario() {
  const sesion = JSON.parse(localStorage.getItem("sesionActual") || "{}");
  const correo = sesion.correo;
  const panel = document.getElementById("panel-dinamico");

  const usuario = await obtenerUsuarioPorCorreo(correo);
  if (!usuario) {
    panel.innerHTML = "<p>No se encontró información del usuario.</p>";
    return;
  }

  const qrVigencia = formatearFechaChile(usuario.qrVigencia);

  panel.innerHTML = `
    <h2>Mi Perfil</h2>
    <div style="display:flex; flex-direction:column; gap:0.5rem;">
      <p><strong>Nombre:</strong> ${usuario.nombre || ""} ${usuario.apellido || ""}</p>
      <p><strong>Correo:</strong> ${usuario.correo || ""}</p>
      <p><strong>Tipo de Contrato:</strong> ${usuario.tipoContrato || "-"}</p>
      <p><strong>Tipo de Beneficio:</strong> ${usuario.tipoBeneficio || "-"}</p>
      <p><strong>Vigencia QR:</strong> ${qrVigencia || "sin fecha"}</p>
    </div>
  `;
}

// ======================= BOTÓN: CONFIGURACIÓN =======================

function mostrarConfiguracion() {
  const panel = document.getElementById("panel-dinamico");
  panel.innerHTML = `
    <h2>Configuración</h2>
    <p>Aquí podrás cambiar tu contraseña y preferencias (próximamente).</p>
  `;
}

// ======================= FUNCIONES AUXILIARES =======================

// Ajusta cualquier fecha a hora Chile (America/Santiago)
function formatearFechaChile(fechaStr) {
  if (!fechaStr) return null;
  try {
    const fecha = new Date(fechaStr);
    // si solo guardaste "2025-11", esto no va a formatear bonito, así que devolvemos tal cual
    if (isNaN(fecha.getTime())) return fechaStr;
    return fecha.toLocaleString("es-CL", {
      timeZone: "America/Santiago",
      dateStyle: "short",
      timeStyle: "short"
    });
  } catch (e) {
    console.error("Error al formatear fecha:", e);
    return fechaStr;
  }
}

// ahora esta función va al backend de Railway
async function obtenerUsuarioPorCorreo(correo) {
  try {
    const res = await fetch(
      `${API_URL}/usuarios/by-email?email=${encodeURIComponent(correo)}`
    );
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    if (!data.ok) return null;
    // el backend devuelve: { ok: true, usuario: {...} }
    return data.usuario;
  } catch (err) {
    console.error("Error obteniendo usuario:", err);
    return null;
  }
}
