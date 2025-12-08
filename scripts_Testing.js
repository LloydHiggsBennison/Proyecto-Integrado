// scripts_Testing.js
// Perfil de Testing (integrado con Supabase)
const API_URL = "/api/gas";

document.addEventListener("DOMContentLoaded", () => {
    // Validar sesión de testing
    const sesion = JSON.parse(localStorage.getItem("sesionActual") || "null");

    if (!sesion || sesion.rol !== "testing" || !sesion.correo) {
        Swal.fire({
            icon: "error",
            title: "Acceso restringido",
            text: "Debes iniciar sesión como usuario de testing."
        }).then(() => {
            window.location.href = "index.html";
        });
        return;
    }

    // Mostrar saludo
    const saludoEl = document.getElementById("saludo");
    if (saludoEl) saludoEl.textContent = `🧪 ${sesion.nombre} ${sesion.apellido}`;

    // Cargar datos del usuario
    cargarDatosUsuario(sesion.correo);
});

/* ============================================================
   CARGAR DATOS DEL USUARIO DESDE API
=============================================================== */
async function cargarDatosUsuario(correo) {
    try {
        const res = await fetch(`${API_URL}?action=getUserByEmail&email=${encodeURIComponent(correo)}`);
        const data = await res.json();

        if (!data.ok || !data.data) {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "No se pudo obtener la información del usuario."
            });
            return;
        }

        const usuario = data.data;
        mostrarQRUsuario(usuario);
        mostrarQRCajas();
    } catch (err) {
        console.error("Error cargando datos:", err);
        Swal.fire({
            icon: "error",
            title: "Error de conexión",
            text: "No se pudo conectar con el servidor."
        });
    }
}

/* ============================================================
   MOSTRAR QR DEL USUARIO
=============================================================== */
function mostrarQRUsuario(usuario) {
    const grid = document.getElementById("usuario-qr");
    if (!grid) return;

    grid.innerHTML = "";

    const card = document.createElement("div");
    card.className = "qr-card-main";

    card.innerHTML = `
    <h3>Tu Código QR</h3>
    <div class="user-info">
      <p><strong>Nombre:</strong> ${usuario.nombre} ${usuario.apellido}</p>
      <p><strong>Correo:</strong> ${usuario.correo}</p>
      <p><strong>Contrato:</strong> ${usuario.tipoContrato || "-"}</p>
      <p><strong>Beneficio:</strong> ${usuario.tipoBeneficio || "-"}</p>
    </div>
    <div class="qr-container-main" id="qr-usuario"></div>
    <div class="qr-token">
      <strong>Token:</strong> ${usuario.qrToken || "Sin generar"}
    </div>
  `;

    grid.appendChild(card);

    // Generar QR si existe token
    if (usuario.qrToken) {
        setTimeout(() => {
            const qrContainer = document.getElementById("qr-usuario");
            if (qrContainer) {
                new QRCode(qrContainer, {
                    text: usuario.qrToken,
                    width: 150,
                    height: 150,
                    colorDark: "#15803d",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.H
                });
            }
        }, 100);
    }
}

/* ============================================================
   MOSTRAR QR DE CAJAS
=============================================================== */
function mostrarQRCajas() {
    const grid = document.getElementById("cajas-grid");
    if (!grid) return;

    grid.innerHTML = "";

    const cajas = [
        {
            tipo: "Caja Grande",
            identificador: "caja grande",
            descripcion: "Para contratos indefinidos",
            emoji: "📦"
        },
        {
            tipo: "Caja Pequeña",
            identificador: "caja pequeña",
            descripcion: "Para contratos a plazo fijo",
            emoji: "📦"
        }
    ];

    cajas.forEach((caja, index) => {
        const card = document.createElement("div");
        card.className = "qr-card";

        const qrId = `qr-caja-${index}`;

        card.innerHTML = `
      <h4>${caja.emoji} ${caja.tipo}</h4>
      <div class="info">
        <strong>Descripción:</strong> ${caja.descripcion}
      </div>
      <div class="qr-container" id="${qrId}"></div>
      <div class="qr-token">
        <strong>Token:</strong> ${caja.identificador}
      </div>
    `;

        grid.appendChild(card);

        // Generar QR
        setTimeout(() => {
            const qrContainer = document.getElementById(qrId);
            if (qrContainer) {
                new QRCode(qrContainer, {
                    text: caja.identificador,
                    width: 120,
                    height: 120,
                    colorDark: "#15803d",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.H
                });
            }
        }, 100);
    });
}

/* ============================================================
   CERRAR SESIÓN
=============================================================== */
function cerrarSesion() {
    localStorage.removeItem("sesionActual");
    window.location.href = "index.html";
}
