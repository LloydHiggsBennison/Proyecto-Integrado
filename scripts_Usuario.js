const API_URL = "https://script.google.com/macros/s/AKfycbyICO-Hs3QBtd9oM70PveOvmDL6luV3pnbuA8Mul9z8BUMiPt9cN1q5Ah_5KH9gJQcpeQ/exec";

document.addEventListener("DOMContentLoaded", async () => {
  const sesion = JSON.parse(localStorage.getItem("sesionActual") || "null");
  if (!sesion || !sesion.correo) return;

  // 1. traemos usuario
  const usuario = await obtenerUsuarioDesdeAPI(sesion.correo);
  // 2. traemos entregas del usuario
  const entregasUsuario = await obtenerEntregasUsuario(sesion.correo);

  // contenedor principal
  const panel = document.getElementById("panel-usuario") || document.querySelector(".main-content");
  if (!panel) return;

  // contenedor donde pintamos las vistas
  let panelContenido = document.getElementById("panel-contenido");
  if (!panelContenido) {
    panelContenido = document.createElement("div");
    panelContenido.id = "panel-contenido";
    panelContenido.style.marginTop = "1.5rem";
    panel.appendChild(panelContenido);
  }

  /* ========== BOTÓN: Mostrar mi código QR ========== */
  const btnMostrarQR =
    document.getElementById("btn-show-qr") ||
    [...document.querySelectorAll("button")].find(b =>
      b.textContent.trim().toLowerCase().includes("mostrar mi código qr")
    );
  if (btnMostrarQR) {
    btnMostrarQR.addEventListener("click", () => {
      renderVistaQR(panelContenido, usuario);
    });
  }

  /* ========== BOTÓN: Estado de mi entrega ========== */
  const btnEstado =
    document.getElementById("btn-estado") ||
    [...document.querySelectorAll("button")].find(b =>
      b.textContent.trim().toLowerCase().includes("estado de mi entrega")
    );
  if (btnEstado) {
    btnEstado.addEventListener("click", () => {
      renderEstadoEntrega(panelContenido, entregasUsuario);
    });
  }

  /* ========== BOTÓN: Mi perfil (solo datos) ========== */
  const btnPerfil =
    document.getElementById("btn-perfil") ||
    [...document.querySelectorAll("button")].find(b =>
      b.textContent.trim().toLowerCase().includes("mi perfil")
    );
  if (btnPerfil) {
    btnPerfil.addEventListener("click", () => {
      renderMiPerfil(panelContenido, usuario, entregasUsuario);
    });
  }

  /* ========== BOTÓN: Configuración (placeholder) ========== */
  const btnConfig =
    document.getElementById("btn-config") ||
    [...document.querySelectorAll("button")].find(b =>
      b.textContent.trim().toLowerCase().includes("configuración")
    );
  if (btnConfig) {
    btnConfig.addEventListener("click", () => {
      panelContenido.innerHTML = `
        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:1rem;padding:1.5rem;">
          <h2 style="font-size:1.25rem;font-weight:700;margin-bottom:1rem;">Configuración</h2>
          <p>Esta sección estará disponible en una próxima actualización.</p>
        </div>
      `;
    });
  }

  // si quieres que al cargar muestre precisamente "Mi perfil", descomenta:
  // renderMiPerfil(panelContenido, usuario, entregasUsuario);
});

/* ==================== FETCHERS ==================== */

async function obtenerUsuarioDesdeAPI(correo) {
  try {
    const res = await fetch(`${API_URL}?action=getUserByEmail&email=${encodeURIComponent(correo)}`);
    const data = await res.json();
    if (data.ok) return data.data;
  } catch (e) {
    console.error(e);
  }
  return null;
}

async function obtenerEntregasUsuario(correo) {
  try {
    const res = await fetch(`${API_URL}?action=getEntregas`);
    const data = await res.json();
    if (!data.ok) return [];
    return data.data.filter(e => (e.correo || "").toLowerCase() === correo.toLowerCase());
  } catch (e) {
    console.error(e);
    return [];
  }
}

/* ==================== RENDER: QR ==================== */

function renderVistaQR(container, usuario) {
  const qrData = (usuario && (usuario.qrToken || usuario.correo)) || "SIN-DATO";
  const vigencia = usuario && usuario.qrVigencia
    ? `${usuario.qrVigencia}-01T00:00:00.000Z`
    : "-";

  container.innerHTML = `
    <div style="display:flex;gap:1.5rem;">
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:1rem;padding:1.5rem;flex:1;">
        <h2 style="font-size:1.25rem;font-weight:700;margin-bottom:1rem;">Mi Perfil</h2>
        <p><strong>Nombre:</strong> ${usuario?.nombre || "-"}</p>
        <p><strong>Correo:</strong> ${usuario?.correo || "-"}</p>
        <p><strong>Tipo de Contrato:</strong> ${usuario?.tipoContrato || "-"}</p>
        <p><strong>Tipo de Beneficio:</strong> ${usuario?.tipoBeneficio || "-"}</p>
        <p><strong>Vigencia QR:</strong> ${vigencia}</p>
      </div>
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:1rem;padding:1.5rem;width:210px;display:flex;flex-direction:column;align-items:center;justify-content:center;">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrData)}"
             alt="QR del trabajador"
             style="width:180px;height:180px;" />
        <p style="margin-top:0.75rem;">Código QR (1 uso / mes)</p>
      </div>
    </div>
  `;
}

/* ==================== RENDER: ESTADO ==================== */

function renderEstadoEntrega(container, entregasUsuario) {
  const tieneEntrega = entregasUsuario.length > 0;
  const ultima = tieneEntrega ? entregasUsuario[entregasUsuario.length - 1] : null;

  container.innerHTML = `
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:1rem;padding:1.5rem;">
      <h2 style="font-size:1.25rem;font-weight:700;margin-bottom:1rem;">Estado de mi entrega</h2>
      <p><strong>Estado:</strong> ${
        tieneEntrega
          ? '<span style="color:green;">ENTREGADO</span>'
          : '<span style="color:#dc2626;">PENDIENTE</span>'
      }</p>
      ${
        tieneEntrega
          ? `<p><strong>Fecha última entrega:</strong> ${formatearFecha(ultima.fechaEntrega)}</p>
             <p><strong>Sucursal:</strong> ${ultima.sucursal || "-"}</p>
             <p><strong>Guardia:</strong> ${ultima.nombreGuardia || "-"}</p>`
          : `<p>No registramos entregas a tu nombre todavía.</p>`
      }
      <p style="margin-top:1rem;">Este estado cambia cuando el guardia registra tu entrega en la hoja "Entregas".</p>
    </div>
  `;
}

/* ==================== RENDER: MI PERFIL (SIN QR) ==================== */

function renderMiPerfil(container, usuario, entregasUsuario) {
  container.innerHTML = `
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:1rem;padding:1.5rem;">
      <h2 style="font-size:1.25rem;font-weight:700;margin-bottom:1rem;">Tu información</h2>
      <p><strong>Nombre:</strong> ${usuario?.nombre || "-"}</p>
      <p><strong>Correo:</strong> ${usuario?.correo || "-"}</p>
      <p><strong>Tipo de Contrato:</strong> ${usuario?.tipoContrato || "-"}</p>
      <p><strong>Tipo de Beneficio:</strong> ${usuario?.tipoBeneficio || "-"}</p>
      <p><strong>Vigente:</strong> ${usuario?.vigente || "-"}</p>
      <hr style="margin:1.25rem 0;" />
      <h3 style="font-weight:600;margin-bottom:0.5rem;">Entregas registradas</h3>
      ${
        !entregasUsuario || entregasUsuario.length === 0
          ? `<p>No tienes entregas registradas.</p>`
          : `<ul>${entregasUsuario.map(e => `
              <li>${formatearFecha(e.fechaEntrega)} · ${e.sucursal || "-"} · Guardia: ${e.nombreGuardia || "-"}</li>
            `).join("")}</ul>`
      }
    </div>
  `;
}

/* ==================== UTILS ==================== */
function formatearFecha(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("es-CL");
  } catch {
    return iso;
  }
}