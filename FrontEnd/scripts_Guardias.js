// scripts_Guardias.js
const API_URL = "https://script.google.com/macros/s/AKfycbxNoGCpf7zxUkk0KnfZJfvn1jUqpqlECmnVZaI_GFRDeUhunZfUikrt-7Y-lwurzqJBZw/exec";

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

  // creamos el panel donde mostramos mensajes
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

  if (btnEntrega) {
    btnEntrega.addEventListener("click", async () => {
      panel.innerHTML = "<h3>Entrega de cajas</h3><p>Escaneando trabajador...</p>";

      // 1. QR trabajador (correo)
      const qrTrabajador = prompt("Escanee / ingrese QR del trabajador (token):");
      if (!qrTrabajador) {
        panel.innerHTML += "<p>Escaneo cancelado.</p>";
        return;
      }

      const trabajador = await obtenerTrabajadorPorCorreo(qrTrabajador);
      if (!trabajador) {
        panel.innerHTML += "<p style='color:red'>Trabajador no encontrado en la hoja Usuario.</p>";
        return;
      }

      panel.innerHTML += `<p>Trabajador: <strong>${trabajador.nombre} ${trabajador.apellido}</strong> (${trabajador.correo})</p>`;
      panel.innerHTML += `<p>Contrato: ${trabajador.tipoContrato || '-'}</p>`;
      panel.innerHTML += `<p>Beneficio asignado: ${trabajador.tipoBeneficio || '-'}</p>`;

      // 2. QR caja
      const qrCaja = prompt("Escanee / ingrese código de la caja (p.ej. Caja Grande / Caja Pequeña):");
      if (!qrCaja) {
        panel.innerHTML += "<p>Escaneo de caja cancelado.</p>";
        return;
      }

      // validación de tipo
      if (trabajador.tipoBeneficio && trabajador.tipoBeneficio.trim() !== "" &&
          trabajador.tipoBeneficio.trim().toLowerCase() !== qrCaja.trim().toLowerCase()) {
        panel.innerHTML += `<p style='color:red'>La caja <strong>${qrCaja}</strong> no corresponde al beneficio asignado (${trabajador.tipoBeneficio}).</p>`;
        return;
      }

      // 3. confirmación (huella)
      const confirma = confirm("El trabajador confirma con huella (simulado). ¿Registrar entrega?");
      if (!confirma) {
        panel.innerHTML += "<p>Entrega cancelada.</p>";
        return;
      }

      // 4. registrar en Sheets
      const ok = await registrarEntregaEnSheet({
        nombreGuardia: sesion.nombre.split(" ")[0] || sesion.nombre,
        apellidoGuardia: sesion.nombre.split(" ")[1] || "",
        correoGuardia: sesion.correo,
        fechaEntrega: new Date().toISOString(),
        usuarioEntregado: trabajador.correo
      });

      if (ok) {
        panel.innerHTML += `<p style='color:green'>Entrega registrada correctamente ✅</p>`;
      } else {
        panel.innerHTML += `<p style='color:red'>No se pudo registrar la entrega.</p>`;
      }
    });
  }

  if (btnInfo) {
    btnInfo.addEventListener("click", () => {
      panel.innerHTML = `
        <h3>Instrucciones</h3>
        <ol>
          <li>Escanear QR del trabajador (correo).</li>
          <li>El sistema valida contra la hoja Usuario (que se alimenta de Nómina).</li>
          <li>Escanear QR de la caja.</li>
          <li>Si coincide el tipo de beneficio, confirmar.</li>
          <li>Se registra en hoja Guardia y se marca ENTREGADO en hoja Usuario.</li>
        </ol>
      `;
    });
  }

  if (btnAdmin) {
    btnAdmin.addEventListener("click", () => {
      panel.innerHTML = "<h3>Administración</h3><p>En la hoja Google Sheets podrás corregir entregas o vigencia.</p>";
    });
  }
});

// helpers
async function obtenerTrabajadorPorToken(token) {
  try {
    const res = await fetch(`${API_URL}?action=getUserByToken&token=${encodeURIComponent(token)}`);
    const data = await res.json();
    if (!data.ok) return null;
    return data.data; // devuelve el usuario asociado al QR
  } catch (err) {
    console.error("Error obteniendo trabajador por token:", err);
    return null;
  }
}


async function registrarEntregaEnSheet(payload) {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
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
