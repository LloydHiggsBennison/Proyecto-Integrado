// scripts_Admin.js
const API_URL = "/api/gas";

let datosTrabajadores = [];
let filtroActual = "";
let modoEdicion = false;
let trabajadorEditando = null;

document.addEventListener("DOMContentLoaded", async () => {
    const sesion = JSON.parse(localStorage.getItem("sesionActual") || "null");

    /* ============================================================
       🔐 VALIDACIÓN DE ACCESO (Exige rol admin)
    ============================================================ */
    if (!sesion || sesion.rol !== "admin") {
        Swal.fire({
            icon: "error",
            title: "Acceso restringido",
            text: "Esta vista es exclusiva para administradores.",
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
        saludoEl.textContent = `Panel Administrador · ${nombre} ${apellido}`.trim();
    }

    /* ============================================================
       📥 Cargar datos
    ============================================================ */
    await cargarDatos();

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

    /* ============================================================
       📝 Formulario de trabajador
    ============================================================ */
    const formTrabajador = document.getElementById("form-trabajador");
    if (formTrabajador) {
        formTrabajador.addEventListener("submit", async (e) => {
            e.preventDefault();
            await guardarTrabajador();
        });
    }
});

/* ============================================================
   📊 CARGAR DATOS
============================================================ */
async function cargarDatos() {
    try {
        // Cargar estadísticas
        const resStats = await fetch(`${API_URL}?action=getAdminStats`);
        const jsonStats = await resStats.json();

        if (jsonStats.ok) {
            renderStats(jsonStats.data);
        }

        // Cargar nómina completa
        const resNomina = await fetch(`${API_URL}?action=getNominaComplete`);
        const jsonNomina = await resNomina.json();

        if (!jsonNomina.ok) {
            throw new Error(jsonNomina.message || "Error al obtener la nómina.");
        }

        datosTrabajadores = Array.isArray(jsonNomina.data) ? jsonNomina.data : [];
        renderTabla();
    } catch (err) {
        console.error("Error cargando datos:", err);
        Swal.fire({
            icon: "error",
            title: "Error al cargar datos",
            text: err.message || "Revisa la conexión con /api/gas.",
        });
    }
}

/* ============================================================
   📊 RENDERIZAR ESTADÍSTICAS
============================================================ */
function renderStats(data) {
    const elTotal = document.getElementById("stat-total");
    const elEntregados = document.getElementById("stat-entregados");
    const elPendientes = document.getElementById("stat-pendientes");
    const elPorcentajeEntregado = document.getElementById("stat-porcentaje-entregado");
    const elPorcentajePendiente = document.getElementById("stat-porcentaje-pendiente");

    if (elTotal) elTotal.textContent = data.totalTrabajadores.toString();
    if (elEntregados) elEntregados.textContent = data.entregados.toString();
    if (elPendientes) elPendientes.textContent = data.pendientes.toString();
    if (elPorcentajeEntregado) {
        elPorcentajeEntregado.textContent = `${data.porcentajeEntregado}% del total`;
    }
    if (elPorcentajePendiente) {
        const porcentajePendiente = 100 - data.porcentajeEntregado;
        elPorcentajePendiente.textContent = `${porcentajePendiente}% del total`;
    }

    // Renderizar estadísticas por sucursal
    renderStatsSucursal(data.porSucursal || {});
}

function renderStatsSucursal(porSucursal) {
    const container = document.getElementById("stats-sucursal");
    if (!container) return;

    const sucursales = Object.keys(porSucursal);
    if (sucursales.length === 0) {
        container.innerHTML = "";
        return;
    }

    const cards = sucursales
        .map((sucursal) => {
            const stats = porSucursal[sucursal];
            return `
        <div class="sucursal-card">
          <h4>${sucursal}</h4>
          <p><strong>${stats.total}</strong> trabajadores</p>
          <p>✅ <strong>${stats.entregados}</strong> entregados</p>
          <p>⏳ <strong>${stats.pendientes}</strong> pendientes</p>
        </div>
      `;
        })
        .join("");

    container.innerHTML = `
    <h3>📍 Estadísticas por Sucursal</h3>
    <div class="sucursal-grid">
      ${cards}
    </div>
  `;
}

/* ============================================================
   📋 RENDERIZAR TABLA
============================================================ */
function renderTabla() {
    const container = document.getElementById("tabla-container");
    if (!container) return;

    if (!datosTrabajadores.length) {
        container.innerHTML = `<p class="empty-state">No hay trabajadores registrados en la nómina.</p>`;
        return;
    }

    // Aplicar filtro
    let lista = datosTrabajadores;
    if (filtroActual) {
        lista = lista.filter((t) => {
            const texto = `${t.nombre || ""} ${t.apellido || ""} ${t.rut || ""} ${t.correo || ""} ${t.sucursal || ""}`.toLowerCase();
            return texto.includes(filtroActual);
        });
    }

    if (!lista.length) {
        container.innerHTML = `<p class="empty-state">No se encontraron resultados para "${filtroActual}".</p>`;
        return;
    }

    const filasHTML = lista
        .map((t) => {
            const nombre = t.nombre || "";
            const apellido = t.apellido || "";
            const rut = t.rut || "-";
            const correo = t.correo || "-";
            const sucursal = t.sucursal || "-";
            const tipoContrato = t.tipoContrato || "-";
            const estado = t.estadoEntrega || "NO ENTREGADO";
            const vigente = t.vigente || "";

            return `
        <tr>
          <td>${nombre}</td>
          <td>${apellido}</td>
          <td>${rut}</td>
          <td>${correo}</td>
          <td>${sucursal}</td>
          <td>${tipoContrato}</td>
          <td>
            <span class="estado-pill ${estado === "ENTREGADO" ? "estado-ok" : "estado-pendiente"}">
              ${estado}
            </span>
          </td>
          <td>${vigente}</td>
          <td>
            <div class="tabla-actions">
              <button class="btn-edit" onclick="editarTrabajador(${t.id})">✏️ Editar</button>
              <button class="btn-delete" onclick="eliminarTrabajador(${t.id}, '${nombre} ${apellido}')">🗑️ Eliminar</button>
            </div>
          </td>
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
            <th>RUT</th>
            <th>Correo</th>
            <th>Sucursal</th>
            <th>Tipo Contrato</th>
            <th>Estado Entrega</th>
            <th>Vigente</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${filasHTML}
        </tbody>
      </table>
    </div>
  `;
}

/* ============================================================
   ➕ MODAL - NUEVO TRABAJADOR
============================================================ */
function abrirModalNuevo() {
    modoEdicion = false;
    trabajadorEditando = null;

    const modal = document.getElementById("modal-trabajador");
    const titulo = document.getElementById("modal-titulo");

    if (titulo) titulo.textContent = "Nuevo Trabajador";

    // Limpiar formulario
    document.getElementById("trabajador-id").value = "";
    document.getElementById("trabajador-nombre").value = "";
    document.getElementById("trabajador-apellido").value = "";
    document.getElementById("trabajador-rut").value = "";
    document.getElementById("trabajador-correo").value = "";
    document.getElementById("trabajador-telefono").value = "";
    document.getElementById("trabajador-sucursal").value = "";
    document.getElementById("trabajador-direccion").value = "";
    document.getElementById("trabajador-contrato").value = "";
    document.getElementById("trabajador-vigente").value = "SI";

    if (modal) modal.classList.add("active");
}

/* ============================================================
   ✏️ EDITAR TRABAJADOR
============================================================ */
function editarTrabajador(id) {
    const trabajador = datosTrabajadores.find((t) => t.id === id);
    if (!trabajador) return;

    modoEdicion = true;
    trabajadorEditando = trabajador;

    const modal = document.getElementById("modal-trabajador");
    const titulo = document.getElementById("modal-titulo");

    if (titulo) titulo.textContent = "Editar Trabajador";

    // Pre-rellenar formulario
    document.getElementById("trabajador-id").value = trabajador.id || "";
    document.getElementById("trabajador-nombre").value = trabajador.nombre || "";
    document.getElementById("trabajador-apellido").value = trabajador.apellido || "";
    document.getElementById("trabajador-rut").value = trabajador.rut || "";
    document.getElementById("trabajador-correo").value = trabajador.correo || "";
    document.getElementById("trabajador-telefono").value = trabajador.telefono || "";
    document.getElementById("trabajador-sucursal").value = trabajador.sucursal || "";
    document.getElementById("trabajador-direccion").value = trabajador.direccion || "";
    document.getElementById("trabajador-contrato").value = trabajador.tipoContrato || "";
    document.getElementById("trabajador-vigente").value = trabajador.vigente || "SI";

    if (modal) modal.classList.add("active");
}

/* ============================================================
   💾 GUARDAR TRABAJADOR (CREAR O ACTUALIZAR)
============================================================ */
async function guardarTrabajador() {
    const id = document.getElementById("trabajador-id").value;
    const nombre = document.getElementById("trabajador-nombre").value.trim();
    const apellido = document.getElementById("trabajador-apellido").value.trim();
    const rut = document.getElementById("trabajador-rut").value.trim();
    const correo = document.getElementById("trabajador-correo").value.trim();
    const telefono = document.getElementById("trabajador-telefono").value.trim();
    const sucursal = document.getElementById("trabajador-sucursal").value.trim();
    const direccion = document.getElementById("trabajador-direccion").value.trim();
    const tipoContrato = document.getElementById("trabajador-contrato").value;
    const vigente = document.getElementById("trabajador-vigente").value;

    if (!nombre || !apellido || !rut || !correo || !sucursal || !tipoContrato) {
        Swal.fire({
            icon: "warning",
            title: "Campos incompletos",
            text: "Por favor completa todos los campos obligatorios (*)",
        });
        return;
    }

    const data = {
        action: modoEdicion ? "updateTrabajador" : "createTrabajador",
        id: id || undefined,
        nombre,
        apellido,
        rut,
        correo,
        telefono,
        sucursal,
        direccion,
        tipoContrato,
        vigente,
    };

    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        const json = await res.json();

        if (json.ok) {
            Swal.fire({
                icon: "success",
                title: modoEdicion ? "Trabajador actualizado" : "Trabajador creado",
                text: json.message || "Operación exitosa",
                timer: 2000,
                showConfirmButton: false,
            });

            cerrarModal();
            await cargarDatos(); // Recargar datos
        } else {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: json.message || "No se pudo guardar el trabajador",
            });
        }
    } catch (err) {
        console.error("Error guardando trabajador:", err);
        Swal.fire({
            icon: "error",
            title: "Error",
            text: "Ocurrió un error al guardar el trabajador",
        });
    }
}

/* ============================================================
   🗑️ ELIMINAR TRABAJADOR
============================================================ */
async function eliminarTrabajador(id, nombreCompleto) {
    const result = await Swal.fire({
        icon: "warning",
        title: "¿Estás seguro?",
        text: `Se marcará como NO VIGENTE a: ${nombreCompleto}`,
        showCancelButton: true,
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#ef4444",
    });

    if (!result.isConfirmed) return;

    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "deleteTrabajador",
                id,
            }),
        });

        const json = await res.json();

        if (json.ok) {
            Swal.fire({
                icon: "success",
                title: "Eliminado",
                text: "El trabajador ha sido marcado como NO VIGENTE",
                timer: 2000,
                showConfirmButton: false,
            });

            await cargarDatos(); // Recargar datos
        } else {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: json.message || "No se pudo eliminar el trabajador",
            });
        }
    } catch (err) {
        console.error("Error eliminando trabajador:", err);
        Swal.fire({
            icon: "error",
            title: "Error",
            text: "Ocurrió un error al eliminar el trabajador",
        });
    }
}

/* ============================================================
   ❌ CERRAR MODAL
============================================================ */
function cerrarModal() {
    const modal = document.getElementById("modal-trabajador");
    if (modal) modal.classList.remove("active");
    modoEdicion = false;
    trabajadorEditando = null;
}

/* ============================================================
   📊 EXPORTAR A EXCEL
============================================================ */
async function exportarExcel() {
    try {
        Swal.fire({
            title: "Generando Excel...",
            text: "Por favor espera",
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            },
        });

        const res = await fetch(`${API_URL}?action=getExportData`);
        const json = await res.json();

        if (!json.ok) {
            throw new Error(json.message || "Error al obtener datos de exportación");
        }

        const { trabajadores, entregasRealizadas, pendientes } = json.data;

        // Crear libro de Excel
        const wb = XLSX.utils.book_new();

        // HOJA 1: Resumen completo de trabajadores
        const ws1Data = [
            ["Nombre", "Apellido", "RUT", "Correo", "Tipo Contrato", "Sucursal", "Teléfono", "Dirección", "Vigente", "Estado Entrega"],
            ...trabajadores.map((t) => [
                t.nombre,
                t.apellido,
                t.rut,
                t.correo,
                t.tipoContrato,
                t.sucursal,
                t.telefono,
                t.direccion,
                t.vigente,
                t.estadoEntrega,
            ]),
        ];
        const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);
        XLSX.utils.book_append_sheet(wb, ws1, "Resumen Trabajadores");

        // HOJA 2: Entregas realizadas
        const ws2Data = [
            ["Nombre Usuario", "Correo", "Fecha Entrega", "Sucursal", "Guardia", "Tipo Caja"],
            ...entregasRealizadas.map((e) => [
                e.nombreUsuario,
                e.correo,
                e.fechaEntrega ? new Date(e.fechaEntrega).toLocaleDateString("es-CL") : "-",
                e.sucursal,
                e.nombreGuardia,
                e.qrCaja,
            ]),
        ];
        const ws2 = XLSX.utils.aoa_to_sheet(ws2Data);
        XLSX.utils.book_append_sheet(wb, ws2, "Entregas Realizadas");

        // HOJA 3: Pendientes de entrega
        const ws3Data = [
            ["Nombre", "Apellido", "RUT", "Correo", "Sucursal", "Tipo Contrato"],
            ...pendientes.map((t) => [
                t.nombre,
                t.apellido,
                t.rut,
                t.correo,
                t.sucursal,
                t.tipoContrato,
            ]),
        ];
        const ws3 = XLSX.utils.aoa_to_sheet(ws3Data);
        XLSX.utils.book_append_sheet(wb, ws3, "Pendientes");

        // Descargar archivo
        const fecha = new Date().toISOString().slice(0, 10);
        const filename = `beneficios_trabajadores_${fecha}.xlsx`;
        XLSX.writeFile(wb, filename);

        Swal.fire({
            icon: "success",
            title: "Excel generado",
            text: `Archivo descargado: ${filename}`,
            timer: 3000,
        });
    } catch (err) {
        console.error("Error exportando a Excel:", err);
        Swal.fire({
            icon: "error",
            title: "Error",
            text: err.message || "No se pudo generar el archivo Excel",
        });
    }
}

// Cerrar modal al hacer clic fuera de él
window.onclick = function (event) {
    const modal = document.getElementById("modal-trabajador");
    if (event.target === modal) {
        cerrarModal();
    }
};
