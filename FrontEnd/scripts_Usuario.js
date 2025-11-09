// scripts_Usuario.js

const API_URL = "https://script.google.com/macros/s/AKfycbyO1xchlkXXKnLRCyZ27ztNUYfvTP28Na4A5L7-q5p9UcYBLr_7_Kp-Ls3gsyCjAvz_Kg/exec";

document.addEventListener("DOMContentLoaded", () => {
  const sesion = JSON.parse(localStorage.getItem("sesionActual") || "{}");

  if (!sesion || !sesion.correo) {
    alert("Debes iniciar sesión nuevamente.");
    window.location.href = "index.html";
    return;
  }

  const h1 = document.querySelector("#saludo-usuario");
  if (h1) {
    h1.textContent = `Hola, ${sesion.nombre || ""} ${sesion.apellido || ""}`;
  }

  cargarDatosUsuario(sesion.correo);
});

async function cargarDatosUsuario(correo) {
  const contDatos = document.querySelector("#datos-usuario");
  const contQR = document.querySelector("#qr-token");

  try {
    const res = await fetch(
      `${API_URL}?action=getUserByEmail&email=${encodeURIComponent(correo)}`
    );
    const data = await safeJson(res);

    if (!data || data._htmlError) {
      if (contDatos) contDatos.textContent = "El backend no está público o devolvió HTML.";
      console.error("Apps Script devolvió HTML en usuario.");
      return;
    }

    if (!data.ok) {
      if (contDatos) contDatos.textContent = "No se encontró tu información.";
      return;
    }

    const u = data.data;

    if (contDatos) {
      contDatos.innerHTML = `
        <p><strong>Nombre:</strong> ${u.nombre || ""} ${u.apellido || ""}</p>
        <p><strong>Correo:</strong> ${u.correo || ""}</p>
        <p><strong>Tipo de contrato:</strong> ${u.tipoContrato || "-"}</p>
        <p><strong>Beneficio:</strong> ${u.tipoBeneficio || "-"}</p>
        <p><strong>Vigente:</strong> ${u.vigente || "-"}</p>
      `;
    }

    if (contQR) {
      contQR.innerHTML = `
        <p><strong>QR token:</strong> ${u.qrToken || "Sin QR"}</p>
        <p><strong>Vigencia:</strong> ${u.qrVigencia || "-"}</p>
        <small>Recuerda: el uso del QR está limitado.</small>
      `;
    }
  } catch (err) {
    console.error("Error obteniendo usuario:", err);
    if (contDatos) contDatos.textContent = "Error al cargar datos.";
  }
}

// mismo helper que en index
async function safeJson(res) {
  const text = await res.text();
  if (text.trim().startsWith("<")) {
    return { _htmlError: true, raw: text };
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("No es JSON válido:", text);
    return null;
  }
}