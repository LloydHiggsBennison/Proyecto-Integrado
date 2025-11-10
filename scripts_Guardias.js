// scripts_Guardias.js
const API_URL = "/api/gas";
// https://script.google.com/macros/s/AKfycbyICO-Hs3QBtd9oM70PveOvmDL6luV3pnbuA8Mul9z8BUMiPt9cN1q5Ah_5KH9gJQcpeQ/exec

document.addEventListener("DOMContentLoaded", () => {
  const sesion = JSON.parse(localStorage.getItem("sesionActual") || "null");
  if (!sesion || sesion.rol !== "guardia") {
    alert("Debes iniciar sesión como guardia.");
    window.location.href = "index.html";
    return;
  }

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

async function escanearFlujo(panelContenido, sesion) {
  panelContenido.innerHTML = `<h3>Entrega de cajas</h3><p>Escaneando trabajador (token)...</p>`;

  // 1️⃣ Escanear QR del trabajador
  const tokenTrabajador = prompt("Escanea o escribe el QR/TOKEN del trabajador:");
  if (!tokenTrabajador) {
    panelContenido.innerHTML += "<p>Operación cancelada.</p>";
    return;
  }

  const trabajador = await buscarTrabajadorPorToken(tokenTrabajador);
  if (!trabajador) {
    panelContenido.innerHTML = `
      <h3>Entrega de cajas</h3>
      <p style="color:red;">Trabajador no encontrado por ese token.</p>
    `;
    return;
  }

  // 2️⃣ Escanear QR de la caja
  const tokenCaja = prompt("Escanea ahora el QR de la caja:");
  if (!tokenCaja) {
    panelContenido.innerHTML += "<p>Operación cancelada.</p>";
    return;
  }

  // 3️⃣ Validar coincidencia entre QR escaneado y el que tiene asignado en la hoja
  const qrCajaHoja = (trabajador.qrCaja || "").toString().trim().toLowerCase();
  const qrCajaLeida = tokenCaja.toString().trim().toLowerCase();
  const coincideQR = qrCajaHoja && qrCajaHoja === qrCajaLeida;

  // 4️⃣ Validar tipo de contrato y tipo de caja
  const contrato = (trabajador.tipoContrato || "").toLowerCase();
  const tipoEsperado = contrato.includes("indefinido") ? "caja grande" :
                       contrato.includes("plazo fijo") ? "caja pequeña" : "";

  const coincideTipo = tipoEsperado && qrCajaLeida.includes(tipoEsperado.toLowerCase());

  // 5️⃣ Mostrar resultados en pantalla
  panelContenido.innerHTML = `
    <h3>Entrega de cajas</h3>
    <p>Trabajador: <strong>${trabajador.nombre} ${trabajador.apellido}</strong> (${trabajador.correo})</p>
    <p>Contrato: ${trabajador.tipoContrato || "-"}</p>
    <p>Beneficio asignado: ${trabajador.tipoBeneficio || "-"}</p>
    <p>QR del trabajador: ${trabajador.qrToken || "-"}</p>
    <p>QR caja leído: ${tokenCaja}</p>
  `;

  if (!coincideQR) {
    panelContenido.innerHTML += `<p style="color:#b91c1c;">❌ El QR escaneado no corresponde a la caja registrada.</p>`;
    return;
  }

  if (!coincideTipo) {
    panelContenido.innerHTML += `<p style="color:#b91c1c;">❌ El tipo de contrato (${trabajador.tipoContrato}) no corresponde al tipo de caja (${tokenCaja}).</p>`;
    return;
  }

  // 6️⃣ Si pasa ambas validaciones → registrar entrega
  panelContenido.innerHTML += `<p style="color:green;">✅ Caja correcta, registrando entrega...</p>`;
  await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "logEntrega",
      nombreUsuario: `${trabajador.nombre} ${trabajador.apellido}`.trim(),
      correoUsuario: trabajador.correo,
      fechaEntrega: new Date().toISOString(),
      sucursal: sesion.sucursal || "",
      nombreGuardia: sesion.nombre || "Guardia",
      qrToken: trabajador.qrToken || "",
      qrCaja: tokenCaja
    })
  });
  panelContenido.innerHTML += `<p style="color:green;">Entrega registrada ✅</p>`;
}

/* ================== BUSCAR SOLO POR TOKEN ================== */
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
        qrToken: token,
        qrCaja: data.data.qrCaja || ""
      };
    }
  } catch (e) {
    console.error("Error buscando por token:", e);
  }
  return null;
}

/* ================== VISTAS EXTRA ================== */
function mostrarInstrucciones(panelContenido) {
  panelContenido.innerHTML = `
    <h3>Instrucciones</h3>
    <ol>
      <li>Escanea el QR del trabajador (QRToken).</li>
      <li>Luego escanea el QR de la caja (QRCaja).</li>
      <li>El sistema validará que ambos coincidan y que el tipo de contrato sea compatible:</li>
      <ul>
        <li><strong>Indefinido → Caja Grande</strong></li>
        <li><strong>Plazo Fijo → Caja Pequeña</strong></li>
      </ul>
      <li>Si todo es correcto, se registra la entrega automáticamente.</li>
    </ol>
  `;
}

function mostrarAdmin(panelContenido) {
  panelContenido.innerHTML = `<h3>Administrar</h3><p>Función en desarrollo.</p>`;
}
