// scripts_RRHH.js
const API_URL = "/api/gas";

let datosRRHH = [];
let filtroActual = "";

document.addEventListener("DOMContentLoaded", async () => {
  const sesion = JSON.parse(localStorage.getItem("sesionActual") || "null");

  /* ============================================================
     🔐 VALIDACIÓN DE ACCESO (Exige rol RRHH)
  ============================================================ */
  if (!sesion || sesion.rol !== "rrhh") {
    Swal.fire({
      icon: "error",
      title: "Acceso restringido",
      text: "Esta vista es exclusiva para personal RRHH."
    }).then(() => {
      window.location.href = "index.html";
    });
    return;
  }

  /* ============================================================
     👋 SALUDO
  ============================================================ */
  const saludoEl = document.getElementById("saludo");
  if (saludoEl) {
    const nombre = sesion.nombre || "";
    const apellido = sesion.apellido || "";
    saludoEl.textContent = `Panel RRHH · ${nombre} ${apellido}`.trim();
  }

  /* ============================================================
     📥 Cargar datos RRHH
  ============================================================ */
  try {
    const res = await fetch(`${API_URL}?action=getRRHHResumen`);
    const json = await res.json();

    if (!json.ok) {
      throw new Error(json.message || "Error al obtener los datos de RRHH.");
    }

    datosRRHH = Array.isArray(json.data) ? json.data : [];

    // Pintar contadores + tabla
    renderStats(datosRRHH);
    renderTabla();

    /* ============================================================
       🔍 Filtro de búsqueda
    ============================================================ */
    const inputFiltro = document.getElementById("filtro-texto");
    if (inputFiltro) {
      inputFiltro.addEventListener("input", () => {
        filtroActual = inputFiltro.value.trim().toLowerCase();
        renderTabla();
      });
    }
  } catch (err) {
    console.error("Error cargando datos en RRHH:", err);
    Swal.fire({
      icon: "error",
      title: "Error al cargar datos",
      text: err.message || "Revisa la conexión con /api/gas."
    });
  }
});


/* ============================================================
   📊 CONTADORES
============================================================ */
function renderStats(lista) {
  const total = lista.length;
  const entregados = lista.filter(
    (t) => (t.estadoEntrega || "").toUpperCase() === "ENTREGADO"
  ).length;
  const noEntregados = total - entregados;

  const elEntregados = document.getElementById("stat-entregados");
  const elNoEntregados = document.getElementById("stat-no-entregados");
  const elTotal = document.getElementById("stat-total");

  if (elEntregados) elEntregados.textContent = entregados.toString();
  if (elNoEntregados) elNoEntregados.textContent = noEntregados.toString();
  if (elTotal) elTotal.textContent = `Total trabajadores: ${total}`;
}


/* ============================================================
   📋 TABLA DINÁMICA
============================================================ */
function renderTabla() {
  const container = document.getElementById("tabla-container");
  if (!container) return;

  if (!datosRRHH.length) {
    container.innerHTML = `
      <p class="empty-state">No hay trabajadores registrados en la nómina.</p>
    `;
    return;
  }

  // Aplicar filtro por nombre / apellido / sucursal
  let lista = datosRRHH;
  if (filtroActual) {
    lista = lista.filter((t) => {
      const texto =
        `${t.nombre || ""} ${t.apellido || ""} ${t.sucursal || ""}`.toLowerCase();
      return texto.includes(filtroActual);
    });
  }

  if (!lista.length) {
    container.innerHTML = `
      <p class="empty-state">No se encontraron trabajadores para "${filtroActual}".</p>
    `;
    return;
  }

  const filasHTML = lista
    .map((t) => {
      const nombre = t.nombre || "";
      const apellido = t.apellido || "";
      const sucursal = t.sucursal || "-";
      const estadoRaw = (t.estadoEntrega || "").toUpperCase();
      const estado = estadoRaw === "ENTREGADO" ? "ENTREGADO" : "NO ENTREGADO";

      return `
        <tr>
          <td>${nombre}</td>
          <td>${apellido}</td>
          <td>
            <span class="estado-pill ${estado === "ENTREGADO" ? "estado-ok" : "estado-pendiente"}">
              ${estado}
            </span>
          </td>
          <td>${sucursal}</td>
        </tr>
      `;
    })
    .join("");

  container.innerHTML = `
    <div class="tabla-wrapper">
      <table class="tabla-trabajadores">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Apellido</th>
            <th>Estado entrega</th>
            <th>Sucursal</th>
          </tr>
        </thead>
        <tbody>
          ${filasHTML}
        </tbody>
      </table>
    </div>
  `;
}
