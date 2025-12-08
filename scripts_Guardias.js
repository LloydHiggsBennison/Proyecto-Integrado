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
   HELPER: Pedir token con cámara + fallback manual
=============================================================== */
function pedirTokenQR(titulo, label) {
  return new Promise((resolve) => {
    let scanner = null;

    Swal.fire({
      title: titulo,
      html: `
        <p>${label}</p>
        <div style="margin-top:0.75rem;margin-bottom:0.75rem;">
          <button id="btn-scan-qr" class="swal2-confirm swal2-styled" style="margin-right:8px;">
            Escanear con cámara
          </button>
          <a id="link-manual-qr" href="#" style="font-size:0.9rem;">
            Ingresar token manualmente
          </a>
        </div>
        <div id="qr-reader" style="width:280px;max-width:100%;margin:0 auto;display:none;"></div>
      `,
      showConfirmButton: false,
      didOpen: () => {
        const btnScan = document.getElementById("btn-scan-qr");
        const linkManual = document.getElementById("link-manual-qr");
        const readerElem = document.getElementById("qr-reader");

        // Escanear con cámara
        btnScan.addEventListener("click", async () => {
          readerElem.style.display = "block";

          try {
            scanner = new Html5Qrcode("qr-reader");
            await scanner.start(
              { facingMode: "environment" },
              { fps: 10, qrbox: 220 },
              (decodedText) => {
                // Cuando escanea algo
                scanner.stop().then(() => {
                  scanner.clear();
                  Swal.close();
                  resolve(decodedText);
                }).catch(() => {
                  Swal.close();
                  resolve(decodedText);
                });
              },
              () => {
                // errores de escaneo ignorados
              }
            );
          } catch (err) {
            console.error("Error cámara:", err);
            Swal.fire({
              icon: "error",
              title: "Error con la cámara",
              text: "No se pudo acceder a la cámara. Usa la opción de ingreso manual."
            });
          }
        });

        // Fallback manual
        linkManual.addEventListener("click", async (e) => {
          e.preventDefault();
          const { value, isConfirmed } = await Swal.fire({
            title: titulo,
            input: "text",
            inputLabel: label,
            inputPlaceholder: "Escribe el token aquí",
            showCancelButton: true,
            confirmButtonText: "Aceptar",
            cancelButtonText: "Cancelar"
          });

          if (isConfirmed) {
            Swal.close();
            resolve(value || null);
          } else {
            resolve(null);
          }
        });
      },
      willClose: () => {
        if (scanner) {
          scanner.stop().then(() => scanner.clear()).catch(() => { });
        }
      }
    });
  });
}

/* ============================================================
   FUNCIONES PARA SPINNER MODAL
=============================================================== */
function mostrarSpinnerModal(mensaje = "Buscando información...") {
  // Evitar múltiples spinners
  const existente = document.getElementById("spinner-modal-overlay");
  if (existente) return;

  const overlay = document.createElement("div");
  overlay.id = "spinner-modal-overlay";
  overlay.className = "spinner-modal-overlay";
  overlay.innerHTML = `
    <div class="spinner-modal-content">
      <div class="spinner"></div>
      <h3>Procesando...</h3>
      <p>${mensaje}</p>
    </div>
  `;
  document.body.appendChild(overlay);
}

function ocultarSpinnerModal() {
  const overlay = document.getElementById("spinner-modal-overlay");
  if (overlay) {
    overlay.remove();
  }
}

/* ============================================================
   FLUJO PRINCIPAL DE ESCANEO
=============================================================== */
async function escanearFlujo(panelContenido, sesion) {
  panelContenido.innerHTML = `<h3>Entrega de cajas</h3><p>Escaneando trabajador (token)...</p>`;

  /* 1️⃣ TOKEN DEL TRABAJADOR (cámara + manual) */
  const tokenTrabajador = await pedirTokenQR(
    "QR del trabajador",
    "Escanea el QR o ingresa el token del trabajador."
  );

  if (!tokenTrabajador) {
    panelContenido.innerHTML += "<p>Operación cancelada.</p>";
    return;
  }

  // Mostrar spinner mientras se busca al trabajador
  mostrarSpinnerModal("Buscando información del trabajador...");

  // Esperar mínimo 3 segundos para que el spinner sea visible
  const [trabajador] = await Promise.all([
    buscarTrabajadorPorToken(tokenTrabajador),
    new Promise(resolve => setTimeout(resolve, 3000))
  ]);

  // Ocultar spinner después de la búsqueda
  ocultarSpinnerModal();

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

  /* 2️⃣ TOKEN DE LA CAJA (cámara + manual) */
  const tokenCaja = await pedirTokenQR(
    "QR de la caja",
    "Escanea el QR de la caja o ingresa el identificador."
  );

  if (!tokenCaja) {
    panelContenido.innerHTML += "<p>Operación cancelada.</p>";
    return;
  }

  /* ============================================================
     VALIDACIONES
  =============================================================== */
  // Detectar testing: permite cualquier caja
  const esTesting = (trabajador.correo || "").toLowerCase().includes("test");
  console.log("🧪 Es Testing:", esTesting, "| Correo:", trabajador.correo);

  const qrCajaHoja = (trabajador.qrCaja || "").toLowerCase();
  const qrCajaLeida = tokenCaja.toLowerCase();
  const cajaValida = qrCajaLeida.includes("caja grande") || qrCajaLeida.includes("caja pequeña");
  const coincideQR = esTesting ? cajaValida : (qrCajaHoja && qrCajaHoja === qrCajaLeida);

  const contrato = (trabajador.tipoContrato || "").toLowerCase();
  const tipoEsperado = contrato.includes("indefinido")
    ? "caja grande"
    : contrato.includes("plazo fijo")
      ? "caja pequeña"
      : "";

  const coincideTipo = esTesting ? cajaValida : (tipoEsperado && qrCajaLeida.includes(tipoEsperado));

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
      title: "Tipo de caja incorrecto",
      text: `El contrato (${trabajador.tipoContrato}) no coincide con el tipo de caja (${tokenCaja}).`
    });
    panelContenido.innerHTML += `<p style="color:red;">❌ Tipo de caja incorrecto.</p>`;
    return;
  }

  /* 3️⃣ Registrar entrega */
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
      <li>Luego escanea o ingresa el QR de la caja asignada.</li>
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
