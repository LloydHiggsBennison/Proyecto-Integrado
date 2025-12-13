// Archivo de utilidades compartidas para el proyecto 3Montes

/**
 * Formatea un RUT chileno con puntos y guión
 * @param {string} rut - RUT sin formato
 * @returns {string} RUT formateado (ej: 12.345.678-9)
 */
function formatearRUT(rut) {
    if (!rut) return '';

    // Limpiar el RUT
    const limpio = rut.replace(/[^0-9kK]/g, '');
    if (limpio.length < 2) return limpio;

    // Separar dígito verificador
    const cuerpo = limpio.slice(0, -1);
    const dv = limpio.slice(-1).toUpperCase();

    // Formatear con puntos
    const formateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    return `${formateado}-${dv}`;
}

/**
 * Valida un RUT chileno
 * @param {string} rut - RUT a validar
 * @returns {boolean} true si es válido
 */
function validarRUT(rut) {
    if (!rut) return false;

    const limpio = rut.replace(/[^0-9kK]/g, '');
    if (limpio.length < 2) return false;

    const cuerpo = limpio.slice(0, -1);
    const dv = limpio.slice(-1).toUpperCase();

    // Algoritmo de validación
    let suma = 0;
    let multiplicador = 2;

    for (let i = cuerpo.length - 1; i >= 0; i--) {
        suma += parseInt(cuerpo[i]) * multiplicador;
        multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
    }

    const dvEsperado = 11 - (suma % 11);
    const dvCalculado = dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'K' : dvEsperado.toString();

    return dv === dvCalculado;
}

/**
 * Formatea una fecha a formato chileno (DD/MM/YYYY)
 * @param {Date|string} fecha - Fecha a formatear
 * @returns {string} Fecha formateada
 */
function formatearFecha(fecha) {
    if (!fecha) return '';

    const date = fecha instanceof Date ? fecha : new Date(fecha);
    if (isNaN(date.getTime())) return '';

    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const año = date.getFullYear();

    return `${dia}/${mes}/${año}`;
}

/**
 * Muestra un mensaje de confirmación con SweetAlert2
 * @param {string} titulo - Título del mensaje
 * @param {string} texto - Texto del mensaje
 * @returns {Promise<boolean>} true si el usuario confirma
 */
async function confirmar(titulo, texto) {
    const result = await Swal.fire({
        title: titulo,
        text: texto,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, continuar',
        cancelButtonText: 'Cancelar'
    });

    return result.isConfirmed;
}

/**
 * Muestra un mensaje de éxito
 * @param {string} titulo - Título del mensaje
 * @param {string} texto - Texto del mensaje
 */
function mostrarExito(titulo, texto) {
    Swal.fire({
        icon: 'success',
        title: titulo,
        text: texto,
        confirmButtonColor: '#3085d6'
    });
}

/**
 * Muestra un mensaje de error
 * @param {string} titulo - Título del mensaje
 * @param {string} texto - Texto del mensaje
 */
function mostrarError(titulo, texto) {
    Swal.fire({
        icon: 'error',
        title: titulo,
        text: texto,
        confirmButtonColor: '#d33'
    });
}

/**
 * Debounce para optimizar búsquedas en tiempo real
 * @param {Function} func - Función a ejecutar
 * @param {number} wait - Tiempo de espera en ms
 * @returns {Function} Función con debounce
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
