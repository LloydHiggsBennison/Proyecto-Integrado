// scripts_Guardias.js

const API_BASE = "https://proyecto-integrado-production.up.railway.app";

document.addEventListener("DOMContentLoaded", () => {
  const sesion = JSON.parse(localStorage.getItem("sesionActual") || "null");

  if (!sesion || sesion.rol !== "guardia") {
    alert("Debes iniciar sesión como guardia.");
    window.location.href = "index.html";
    return;
  }

  const h1 = document.querySelector("header h1");
  if (h1) h1.textContent = `Hola!, ${sesion.nombre || "Guardia"} 👋`;

  const btn = document.querySelector("#button1");
  if (btn) {
    btn.addEventListener("click", () => mostrarFormularioEntrega(sesion));
  }
});

function mostrarFormularioEntrega(sesion) {
  let panel = document.querySelector("#panel-guardia");
  if (!panel) {
    panel = document.createElement("section");
    panel.id = "panel-guardia";
    panel.style.margin = "1rem";
    document.body.appendChild(panel);
  }

  panel.innerHTML = `
    <h3>Registrar entrega</h3>
    <label>Código QR del trabajador</label>
    <input id="qr-trabajador" type="text" placeholder="QR-XXXX..." style="width:100%;max-width:320px;margin-bottom:8px;" />
    <label>Tipo de beneficio</label>
    <input id="tipo-beneficio" type="text" placeholder="Caja Grande / Caja Pequeña" style="width:100%;max-width:320px;margin-bottom:8px;" />
    <button id="btn-registrar">Registrar</button>
    <p id="msg" style="margin-top:8px;"></p>
  `;

  const btnReg = panel.querySelector("#btn-registrar");
  const msg = panel.querySelector("#msg");

  btnReg.addEventListener("click", async () => {
    const qr = panel.querySelector("#qr-trabajador").value.trim();
    const tipoBeneficio = panel.querySelector("#tipo-beneficio").value.trim();

    if (!qr) {
      msg.textContent = "Debes ingresar un código QR.";
      msg.style.color = "red";
      return;
    }

    const resp = await fetch(`${API_BASE}/entregas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        qrTokenUsado: qr,
        tipoBeneficio,
        guardiaCorreo: sesion.correo,
        guardiaNombre: sesion.nombre,
        origen: "web"
      })
    }).then(r => r.json()).catch(() => ({ ok: false, message: "Error de red" }));

    if (resp.ok) {
      msg.textContent = "Entrega registrada.";
      msg.style.color = "green";
    } else {
      msg.textContent = resp.message || "No se pudo registrar. Verifica el QR.";
      msg.style.color = "red";
    }
  });
}
