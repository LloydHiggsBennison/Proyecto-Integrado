// scripts_Usuario.js

const API_BASE = "https://proyecto-integrado-production.up.railway.app";

document.addEventListener("DOMContentLoaded", async () => {
  const sesion = JSON.parse(localStorage.getItem("sesionActual") || "null");
  if (!sesion || sesion.rol !== "usuario" || !sesion.correo) {
    alert("Debes iniciar sesión.");
    window.location.href = "index.html";
    return;
  }

  // traer datos frescos desde Mongo
  const usuario = await getUsuarioPorCorreo(sesion.correo);
  if (!usuario) {
    alert("No se encontró tu usuario en Mongo.");
    return;
  }
  window.__usuarioActual = usuario;

  // botones de tu HTML
  const btnQR = document.querySelector("#button1");
  const btnEstado = document.querySelector("#button2");
  const btnPerfil = document.querySelector("#button3");

  if (btnQR) btnQR.addEventListener("click", () => renderPanel("qr"));
  if (btnEstado) btnEstado.addEventListener("click", () => renderPanel("estado"));
  if (btnPerfil) btnPerfil.addEventListener("click", () => renderPanel("perfil"));

  // por defecto: QR
  renderPanel("qr");
});

function renderPanel(tipo) {
  const main = document.querySelector(".main-content");
  let panel = document.querySelector("#panel-usuario");
  if (!panel) {
    panel = document.createElement("section");
    panel.id = "panel-usuario";
    panel.style.marginTop = "1rem";
    main.appendChild(panel);
  }

  const u = window.__usuarioActual;

  if (tipo === "qr") {
    // si el usuario no tiene qrToken (por si el backend no lo guardó), usamos su correo
    const qrValue = u.qrToken || u.correo;
    const qrImgUrl =
      "https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=" +
      encodeURIComponent(qrValue);
    panel.innerHTML = `
      <h3>Mi QR</h3>
      <img src="${qrImgUrl}" alt="QR" width="200" height="200" />
      <p style="margin-top:8px;font-weight:bold;">${qrValue}</p>
      <p style="font-size:0.8rem;opacity:0.6;">Si no funciona el lector, díctale este código al guardia.</p>
    `;
  }

  if (tipo === "estado") {
    panel.innerHTML = `
      <h3>Estado de mi entrega</h3>
      <p>${u.estadoEntrega || "Sin registro de entrega."}</p>
    `;
  }

  if (tipo === "perfil") {
    panel.innerHTML = `
      <h3>Mi perfil</h3>
      <p><strong>Nombre:</strong> ${u.nombre || ""} ${u.apellido || ""}</p>
      <p><strong>Correo:</strong> ${u.correo || ""}</p>
      <p><strong>Tipo contrato:</strong> ${u.tipoContrato || "-"}</p>
      <p><strong>Vigente:</strong> ${u.vigente || "-"}</p>
    `;
  }
}

async function getUsuarioPorCorreo(correo) {
  try {
    const res = await fetch(
      `${API_BASE}/usuarios/by-email?email=${encodeURIComponent(correo)}`
    );
    const data = await res.json();
    if (data && data.ok) return data.usuario;
    return null;
  } catch (err) {
    console.error("error getUsuarioPorCorreo:", err);
    return null;
  }
}
