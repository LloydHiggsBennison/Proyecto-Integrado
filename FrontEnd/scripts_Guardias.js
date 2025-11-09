// scripts_Guardias.js

const API_URL = "https://script.google.com/macros/s/AKfycbwNBxKJrKuyRhG2GLa29MxNYe3GESDJm4-SRMYRUDbnJl-jXcI5O8TSxJG-6Fmw-muY4A/exec";

document.addEventListener("DOMContentLoaded", () => {
  const sesion = JSON.parse(localStorage.getItem("sesionActual") || "null");

  if (!sesion || sesion.tipo !== "guardia") {
    alert("No tienes permisos o no has iniciado sesión como guardia.");
    window.location.href = "index.html";
    return;
  }

  const h1 = document.querySelector("#saludo-guardia");
  if (h1) {
    h1.textContent = `Hola!, ${sesion.nombre || sesion.correo || "Guardia"} 👋`;
  }

  const panel = document.querySelector("#panel-guardia");
  const inputQR = document.querySelector("#codigoQR");
  const btnEnviar = document.querySelector("#btnEnviarQR");

  if (btnEnviar && inputQR) {
    btnEnviar.addEventListener("click", async () => {
      const qr = inputQR.value.trim();
      if (!qr) {
        mostrarMensaje(panel, "Debes ingresar un código QR.", "error");
        return;
      }

      const resp = await registrarEntrega({
        qrToken: qr,
        nombreGuardia: sesion.nombre || "",
        apellidoGuardia: sesion.apellido || "",
        correoGuardia: sesion.correo || ""
      });

      if (resp._htmlError) {
        mostrarMensaje(panel, "El backend devolvió HTML (publica el Web App).", "error");
        return;
      }

      if (resp.ok) {
        mostrarMensaje(panel, "Entrega registrada en Mongo.", "success");
      } else {
        mostrarMensaje(panel, resp.message || "No se pudo registrar (¿QR ya usado?).", "error");
      }

      inputQR.value = "";
    });
  }
});

function mostrarMensaje(panel, texto, tipo = "info") {
  if (!panel) return;
  let color = "#333";
  if (tipo === "success") color = "#0a7b32";
  if (tipo === "error") color = "#b00020";
  panel.innerHTML = `<span style="color:${color}">${texto}</span>`;
}

async function registrarEntrega(payload) {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "logEntrega",
        ...payload
      })
    });
    const data = await safeJson(res);
    return data;
  } catch (err) {
    console.error("Error registrando entrega:", err);
    return { ok: false, message: "Error de red" };
  }
}

async function safeJson(res) {
  const text = await res.text();
  if (text.trim().startsWith("<")) {
    return { _htmlError: true, raw: text };
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("No es JSON válido:", text);
    return { ok: false, message: "Respuesta no JSON" };
  }
}