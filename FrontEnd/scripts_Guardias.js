// scripts_Guardias.js

// ======================= CONFIGURACIÓN =======================
const API_URL = "https://script.google.com/macros/s/AKfycbwr_1dpus1K7LYEe3yXg6wWnRIyvyNG-OlmkzsDgukfyFbEe6zH98Wzuizqnn6J-GObwQ/exec";

document.addEventListener("DOMContentLoaded", () => {
  // la sesión ahora la guardamos como { tipo: "guardia", ... }
  const sesion = JSON.parse(localStorage.getItem("sesionActual") || "null");

  if (!sesion || sesion.tipo !== "guardia") {
    alert("No tienes permisos o no has iniciado sesión como guardia.");
    window.location.href = "index.html";
    return;
  }

  // saludo
  const h1 = document.querySelector("h1");
  if (h1) {
    h1.textContent = `Hola!, ${sesion.nombre} 👋`;
  }

  // panel donde mostramos resultados
  const panel = document.createElement("div");
  panel.id = "panel-guardia";
  panel.style.marginTop = "20px";
  panel.style.background = "#fff";
  panel.style.border = "1px solid #d1d5db";
  panel.style.borderRadius = "0.75rem";
  panel.style.padding = "1.25rem 1.5rem";
  document.querySelector(".main-content").appendChild(panel);

  // botones del header
  const btnEntrega = document.querySelector("#button1");
  const btnInfo = document.querySelector("#button2");
  const btnAdmin = document.querySelector("#button3");

  // ========== BOTÓN 1: flujo de entrega ==========
  if (btnEntrega) {
    btnEntrega.addEventListener("click", async () => {
      panel.innerHTML = "<h3>Entrega de cajas</h3><p>Escaneando trabajador...</p>";

      // 1. QR trabajador (TOKEN)
      const qrTrabajador = prompt("Escanee / ingrese QR del trabajador (token):");
      if (!qrTrabajador) {
        panel.innerHTML += "<p>Escaneo cancelado.</p>";
        return;
      }

      // aquí usamos el endpoint correcto: getUserByToken
      const trabajador = await obtenerTrabajadorPorToken(qrTrabajador);
      if (!trabajador) {
        panel.innerHTML += "<p style='color:red'>Trabajador no encontrado o QR vencido.</p>";
        return;
      }

      panel.innerHTML += `
        <p>Trabajador: <strong>${trabajador.nombre} ${trabajador.apellido}</strong> (${trabajador.correo})</p>
        <p>Contrato: ${trabajador.tipoContrato || '-'}</p>
        <p>Beneficio asignado: ${trabajador.tipoBeneficio || '-'}</p>
      `;

      // 2. QR caja (segundo escaneo)
      const qrCaja = prompt("Escanee / ingrese código de la caja (p.ej. Caja Grande / Caja Pequeña):");
      if (!qrCaja) {
        panel.innerHTML += "<p>Escaneo de caja cancelado.</p>";
        return;
      }

      // validación de tipo de beneficio
      if (
        trabajador.tipoBeneficio &&
        trabajador.tipoBeneficio.trim() !== "" &&
        trabajador.tipoBeneficio.trim().toLowerCase() !== qrCaja.trim().toLowerCase()
      ) {
        panel.innerHTML += `
          <p style='color:red'>
            La caja <strong>${qrCaja}</strong> no corresponde al beneficio asignado (${trabajador.tipoBeneficio}).
          </p>
        `;
        return;
      }

      // 3. confirmación (huella simulada)
      const confirma = confirm("El trabajador confirma con huella (simulado). ¿Registrar entrega?");
      if (!confirma) {
        panel.innerHTML += "<p>Entrega cancelada.</p>";
        return;
      }

      // 4. registrar en Apps Script (esto además reenvía a Railway según tu backend)
      const ok = await registrarEntregaEnSheet({
        nombreGuardia: sesion.nombre.split(" ")[0] || sesion.nombre,
        apellidoGuardia: sesion.nombre.split(" ")[1] || "",
        correoGuardia: sesion.correo,
        usuarioEntregado: trabajador.correo,
        tipoContrato: trabajador.tipoContrato || "",
        tipoBeneficio: trabajador.tipoBeneficio || "",
        qrToken: qrTrabajador
      });

      if (ok) {
        panel.innerHTML += `<p style='color:green'>Entrega registrada correctamente ✅</p>`;
      } else {
        panel.innerHTML += `<p style='color:red'>No se pudo registrar la entrega.</p>`;
      }
    });
  }

  // ========== BOTÓN 2: info ==========
  if (btnInfo) {
    btnInfo.addEventListener("click", () => {
      panel.innerHTML = `
        <h3>Instrucciones</h3>
        <ol>
          <li>Escanear QR del trabajador (token único del mes).</li>
          <li>El sistema valida contra la hoja Usuario.</li>
          <li>Escanear QR de la caja / ingresar tipo de caja.</li>
          <li>Si coincide el tipo de beneficio, confirmar con el trabajador.</li>
          <li>Se registra en hoja Guardia y se marca ENTREGADO en hoja Usuario.</li>
        </ol>
      `;
    });
  }

  // ========== BOTÓN 3: admin ==========
  if (btnAdmin) {
    btnAdmin.addEventListener("click", () => {
      panel.innerHTML = "<h3>Administración</h3><p>Correcciones se hacen en Google Sheets (Usuario / Guardia).</p>";
    });
  }
});

// ======================= HELPERS =======================

// obtener trabajador por TOKEN (lo que lee el QR del trabajador)
async function obtenerTrabajadorPorToken(token) {
  try {
    const res = await fetch(
      `${API_URL}?action=getUserByToken&token=${encodeURIComponent(token)}`
    );
    const data = await res.json();
    if (!data.ok) return null;
    return data.data; // nombre, apellido, correo, tipoContrato, tipoBeneficio
  } catch (err) {
    console.error("Error obteniendo trabajador por token:", err);
    return null;
  }
}

// registrar entrega en tu Apps Script (y este la reenvía a Railway)
async function registrarEntregaEnSheet(payload) {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "logEntrega",
        ...payload
      })
    });
    const data = await res.json();
    return data.ok === true;
  } catch (err) {
    console.error("Error registrando entrega:", err);
    return false;
  }
}
