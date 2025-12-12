import { createClient } from "@supabase/supabase-js";

/****************************************************
 * CONFIG SUPABASE 
 ****************************************************/
const QR_DIAS_VIGENCIA = 60;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn("⚠️ Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en las env vars");
}

const supabase =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey)
    : null;

/****************************************************
 * HELPERS COMUNES (portados desde Apps Script)
 ****************************************************/
function calcularBeneficio(tipoContrato) {
  if (!tipoContrato) return "";
  const tc = tipoContrato.toString().trim().toLowerCase();
  if (tc === "plazo fijo") return "Caja Pequeña";
  if (tc === "indefinido") return "Caja Grande";
  return "";
}

function generarQRCajaPorContrato(tipoContrato) {
  if (!tipoContrato) return "";
  const tc = tipoContrato.toString().trim().toLowerCase();
  if (tc === "plazo fijo") return "Caja Pequeña";
  if (tc === "indefinido") return "Caja Grande";
  return "";
}

function generarTokenQR() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "QR-";
  for (let i = 0; i < 7; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}

function necesitaRenovarQR(vigenciaStr) {
  if (!vigenciaStr) return true;
  const fechaVig = new Date(vigenciaStr);
  const hoy = new Date();
  const diff = (hoy.getTime() - fechaVig.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= QR_DIAS_VIGENCIA;
}

function normalizarVigente(valor) {
  if (!valor) return "";
  const v = valor.toString().trim().toLowerCase();
  if (v === "true" || v === "si" || v === "sí") return "SI";
  return valor;
}

/****************************************************
 * HANDLER PRINCIPAL /api/gas
 ****************************************************/
export default async function handler(req, res) {
  // CORS básico
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).json({ ok: true });
  }

  if (!supabase) {
    return res
      .status(500)
      .json({ ok: false, message: "Supabase no está configurado en el backend" });
  }

  try {
    /******************* GET *******************/
    if (req.method === "GET") {
      const action = (req.query.action || "").toString();

      if (action === "getUsers") return await getUsers(req, res);
      if (action === "getUserByEmail") return await getUserByEmail(req, res);
      if (action === "getUserByToken") return await getUserByToken(req, res);
      if (action === "getGuards") return await getGuards(req, res);
      if (action === "getNomina") return await getNomina(req, res);
      if (action === "getEntregas") return await getEntregas(req, res);
      // 🔹 NUEVA ACCIÓN: validar uso de token QR
      if (action === "checkTokenUsage") return await checkTokenUsage(req, res);
      // 🔹 NUEVA ACCIÓN: resumen RRHH (nómina + entregas)
      if (action === "getRRHHResumen") return await getRRHHResumen(req, res);
      // 🔹 NUEVAS ACCIONES ADMIN
      if (action === "getAdminStats") return await getAdminStats(req, res);
      if (action === "getNominaComplete") return await getNominaComplete(req, res);
      if (action === "getExportData") return await getExportData(req, res);

      return res.json({ ok: true, message: "API Supabase activa (GET)" });
    }

    /******************* POST *******************/
    if (req.method === "POST") {
      const body = req.body || {};
      let action = body.action || body.Action || body.accion || "";

      // si no viene action pero hay correo+password → asumir createUser
      if (!action) {
        const tieneCorreo = !!(body.correo || body.email);
        const tienePassword = !!(body.password || body.pass);
        if (tieneCorreo && tienePassword) {
          action = "createUser";
        }
      }

      if (action === "createUser") {
        return await createUser(req, res, body);
      }

      if (action === "logEntrega") {
        return await logEntrega(req, res, body);
      }

      // 🔹 NUEVAS ACCIONES ADMIN CRUD
      if (action === "createTrabajador") {
        return await createTrabajador(req, res, body);
      }

      if (action === "updateTrabajador") {
        return await updateTrabajador(req, res, body);
      }

      if (action === "deleteTrabajador") {
        return await deleteTrabajador(req, res, body);
      }

      return res.status(400).json({
        ok: false,
        message: "Acción POST no soportada",
        receivedAction: action || null,
        payloadKeys: Object.keys(body)
      });
    }

    /******************* OTROS MÉTODOS *******************/
    return res.status(405).json({ ok: false, message: "Método no permitido" });
  } catch (err) {
    console.error("Error en handler /api/gas:", err);
    return res.status(500).json({ ok: false, message: "Error interno", error: String(err) });
  }
}

/****************************************************
 * GET HANDLERS
 ****************************************************/

// Lista todos los usuarios (tabla usuarios)
async function getUsers(req, res) {
  const { data: usuarios, error } = await supabase.from("usuarios").select("*");

  if (error) {
    console.error("getUsers error:", error);
    return res.status(500).json({ ok: false, message: "Error consultando usuarios" });
  }

  const salida = usuarios.map((u) => ({
    nombre: u.nombre,
    apellido: u.apellido,
    correo: u.correo,
    password: u.password || "",
    tipoContrato: u.tipo_contrato,
    tipoBeneficio: u.tipo_beneficio,
    vigente: u.vigente,
    qrToken: u.qr_token,
    qrCaja: u.qr_caja,
    qrVigencia: u.qr_vigencia,
    rol: u.rol || null
  }));

  return res.json({ ok: true, data: salida });
}

// Busca usuario por email (login)
async function getUserByEmail(req, res) {
  const email = (req.query.email || "").toString().trim().toLowerCase();

  if (!email) {
    return res.status(400).json({ ok: false, message: "Falta email" });
  }

  const { data: usuario, error } = await supabase
    .from("usuarios")
    .select("*")
    .ilike("correo", email)
    .maybeSingle();

  if (error) {
    console.error("getUserByEmail error:", error);
    return res.status(500).json({ ok: false, message: "Error consultando usuario" });
  }

  if (!usuario) {
    return res.json({ ok: false, message: "Usuario no encontrado" });
  }

  const rolActual = usuario.rol || null;

  // Si es guardia o RRHH NO forzamos QR (ellos no usan beneficio con QR)
  const esGuardiaORRHH = rolActual === "guardia" || rolActual === "rrhh";

  let qrToken = usuario.qr_token;
  let qrVigencia = usuario.qr_vigencia;
  let qrCaja = usuario.qr_caja;
  const tipoContrato = usuario.tipo_contrato;
  let necesitaUpdate = false;

  if (!esGuardiaORRHH) {
    // renovar/generar QR para trabajadores normales
    if (!qrToken || necesitaRenovarQR(qrVigencia)) {
      qrToken = generarTokenQR();
      qrVigencia = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
      necesitaUpdate = true;
    }

    const qrCajaEsperado = generarQRCajaPorContrato(tipoContrato);
    if (qrCajaEsperado && qrCaja !== qrCajaEsperado) {
      qrCaja = qrCajaEsperado;
      necesitaUpdate = true;
    }

    if (necesitaUpdate) {
      const { error: updError } = await supabase
        .from("usuarios")
        .update({
          qr_token: qrToken,
          qr_vigencia: qrVigencia,
          qr_caja: qrCaja
        })
        .eq("id", usuario.id);

      if (updError) {
        console.error("Error actualizando QR en getUserByEmail:", updError);
      }
    }
  }

  return res.json({
    ok: true,
    data: {
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      correo: usuario.correo,
      password: usuario.password || "",
      tipoContrato: tipoContrato,
      tipoBeneficio: usuario.tipo_beneficio,
      vigente: usuario.vigente,
      qrToken: qrToken,
      qrCaja: qrCaja,
      qrVigencia: qrVigencia,
      rol: rolActual
    }
  });
}

// Buscar usuario por QR token
async function getUserByToken(req, res) {
  const token = (req.query.token || "").toString().trim();

  if (!token) {
    return res.status(400).json({ ok: false, message: "Falta token" });
  }

  const { data: usuario, error } = await supabase
    .from("usuarios")
    .select("*")
    .eq("qr_token", token)
    .maybeSingle();

  if (error) {
    console.error("getUserByToken error:", error);
    return res.status(500).json({ ok: false, message: "Error consultando usuario" });
  }

  if (!usuario) {
    return res.json({ ok: false, message: "Token no encontrado" });
  }

  return res.json({
    ok: true,
    data: {
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      correo: usuario.correo,
      tipoContrato: usuario.tipo_contrato,
      tipoBeneficio: usuario.tipo_beneficio,
      qrToken: usuario.qr_token,
      qrCaja: usuario.qr_caja
    }
  });
}

// Lista guardias
async function getGuards(req, res) {
  const { data: guardias, error } = await supabase.from("guardias").select("*");

  if (error) {
    console.error("getGuards error:", error);
    return res.status(500).json({ ok: false, message: "Error consultando guardias" });
  }

  const rows = guardias.map((r) => ({
    nombre: r.nombre,
    apellido: r.apellido,
    correo: r.correo,
    telefono: r.telefono,
    direccion: r.direccion,
    password: r.password || "",
    vigente: r.vigente,
    sucursal: r.sucursal
  }));

  return res.json({ ok: true, data: rows });
}

// Lista nómina completa
async function getNomina(req, res) {
  const { data: nomina, error } = await supabase
    .from("nomina_trabajadores")
    .select("*");

  if (error) {
    console.error("getNomina error:", error);
    return res.status(500).json({ ok: false, message: "Error consultando nómina" });
  }

  const rows = nomina.map((r) => ({
    nombre: r.nombre,
    apellido: r.apellido,
    rut: r.rut,
    correo: r.correo,
    direccion: r.direccion,
    telefono: r.telefono,
    vigente: r.vigente,
    tipoContrato: r.tipo_contrato,
    sucursal: r.sucursal
  }));

  return res.json({ ok: true, data: rows });
}

// Lista entregas
async function getEntregas(req, res) {
  const { data: entregas, error } = await supabase
    .from("entregas")
    .select("*")
    .order("fecha_entrega", { ascending: false });

  if (error) {
    console.error("getEntregas error:", error);
    return res.status(500).json({ ok: false, message: "Error consultando entregas" });
  }

  const rows = entregas.map((r) => ({
    nombreUsuario: r.nombre_usuario,
    correo: r.correo,
    fechaEntrega: r.fecha_entrega,
    sucursal: r.sucursal,
    nombreGuardia: r.nombre_guardia,
    qrToken: r.qr_token,
    qrCaja: r.qr_caja
  }));

  return res.json({ ok: true, data: rows });
}

// Verificar si un token QR ya ha sido utilizado
async function checkTokenUsage(req, res) {
  const token = (req.query.token || "").toString().trim();
  const correo = (req.query.correo || "").toString().trim().toLowerCase();

  if (!token) {
    return res.status(400).json({ ok: false, message: "Falta token" });
  }

  if (!correo) {
    return res.status(400).json({ ok: false, message: "Falta correo" });
  }

  // Buscar si el token ya existe en entregas
  const { data: entregas, error } = await supabase
    .from("entregas")
    .select("correo, fecha_entrega")
    .eq("qr_token", token)
    .order("fecha_entrega", { ascending: false })
    .limit(1);

  if (error) {
    console.error("checkTokenUsage error:", error);
    return res.status(500).json({ ok: false, message: "Error verificando token" });
  }

  // Si no hay entregas con ese token, se puede usar
  if (!entregas || entregas.length === 0) {
    return res.json({ ok: true, canUse: true });
  }

  // Verificar si es perfil testing
  const esTesting = correo.includes("test");

  if (esTesting) {
    // Perfil testing puede reutilizar
    return res.json({ ok: true, canUse: true, isTesting: true });
  }

  // No es testing y el token ya fue usado
  const entregaPrevia = entregas[0];
  const fechaEntrega = new Date(entregaPrevia.fecha_entrega);

  // Formatear fecha a hora chilena (UTC-3)
  const fechaFormateada = fechaEntrega.toLocaleString("es-CL", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });

  return res.json({
    ok: true,
    canUse: false,
    message: `Este código QR ya fue utilizado el ${fechaFormateada}`,
    fechaEntrega: fechaFormateada
  });
}

/****************************************************
 * NUEVO GET: RESUMEN RRHH (NÓMINA + ENTREGAS)
 ****************************************************/
async function getRRHHResumen(req, res) {
  // 1) Cargar nómina básica
  const { data: nomina, error: nomError } = await supabase
    .from("nomina_trabajadores")
    .select("nombre,apellido,rut,correo,sucursal");

  if (nomError) {
    console.error("getRRHHResumen nomina error:", nomError);
    return res
      .status(500)
      .json({ ok: false, message: "Error consultando nómina para RRHH" });
  }

  if (!nomina || nomina.length === 0) {
    return res.json({ ok: true, data: [] });
  }

  // 2) Cargar correos de entregas
  const { data: entregas, error: entError } = await supabase
    .from("entregas")
    .select("correo");

  if (entError) {
    console.error("getRRHHResumen entregas error:", entError);
    return res
      .status(500)
      .json({ ok: false, message: "Error consultando entregas para RRHH" });
  }

  // 3) Mapa de correos con al menos una entrega
  const entregadosSet = new Set();
  (entregas || []).forEach((e) => {
    const c = (e.correo || "").toString().trim().toLowerCase();
    if (c) entregadosSet.add(c);
  });

  // 4) Construir resumen
  const resumen = nomina.map((r) => {
    const correo = (r.correo || "").toString().trim();
    const correoKey = correo.toLowerCase();
    const entregado = correoKey && entregadosSet.has(correoKey);

    return {
      nombre: r.nombre || "",
      apellido: r.apellido || "",
      rut: r.rut || "",
      correo: correo,
      sucursal: r.sucursal || "",
      estadoEntrega: entregado ? "ENTREGADO" : "NO ENTREGADO"
    };
  });

  return res.json({ ok: true, data: resumen });
}

/****************************************************
 * POST HANDLERS
 ****************************************************/

// Crear usuario (tabla usuarios) a partir de nómina / guardias
async function createUser(req, res, data) {
  const correoReq = (data.correo || data.email || "").toString().trim().toLowerCase();
  const passwordReq = (data.password || data.pass || "").toString().trim();

  if (!correoReq) {
    return res.status(400).json({ ok: false, message: "Falta correo" });
  }

  // buscar en nomina
  const { data: nominaMatch, error: nomError } = await supabase
    .from("nomina_trabajadores")
    .select("*")
    .ilike("correo", correoReq)
    .maybeSingle();

  if (nomError) {
    console.error("createUser nomina error:", nomError);
  }

  // buscar en guardias
  const { data: guardiaMatch, error: guardError } = await supabase
    .from("guardias")
    .select("*")
    .ilike("correo", correoReq)
    .maybeSingle();

  if (guardError) {
    console.error("createUser guardias error:", guardError);
  }

  // si no está en ninguna de las dos → no puede crear
  if (!nominaMatch && !guardiaMatch) {
    return res.json({
      ok: false,
      message: "El correo no está en Nómina ni en Guardia. No se puede crear el usuario."
    });
  }

  const esGuardia = !!guardiaMatch;

  const nombreFinal = (nominaMatch?.nombre || guardiaMatch?.nombre || "");
  const apellidoFinal = (nominaMatch?.apellido || guardiaMatch?.apellido || "");
  const vigenteFinal = nominaMatch
    ? normalizarVigente(nominaMatch.vigente)
    : normalizarVigente(guardiaMatch.vigente);

  const tipoContratoFinal = nominaMatch?.tipo_contrato || "";
  const tipoBenefFinal = calcularBeneficio(tipoContratoFinal);

  let qrToken = "";
  let qrCaja = "";
  let qrVigencia = null;

  // solo trabajadores generan QR
  if (!esGuardia) {
    qrToken = generarTokenQR();
    qrCaja = generarQRCajaPorContrato(tipoContratoFinal);
    qrVigencia = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
  }

  // Rol automático según origen
  const rolFinal = esGuardia ? "guardia" : "trabajador";

  const { error } = await supabase.from("usuarios").insert([
    {
      nombre: nombreFinal,
      apellido: apellidoFinal,
      correo: correoReq,
      password: passwordReq,
      tipo_contrato: tipoContratoFinal,
      tipo_beneficio: tipoBenefFinal,
      vigente: vigenteFinal,
      qr_token: qrToken,
      qr_caja: qrCaja,
      qr_vigencia: qrVigencia,
      rol: rolFinal
    }
  ]);

  if (error) {
    console.error("createUser error:", error);
    return res.status(500).json({ ok: false, message: "Error creando usuario" });
  }

  return res.json({
    ok: true,
    source: nominaMatch ? "nomina" : "guardia",
    qrToken,
    qrCaja,
    qrVigencia,
    rol: rolFinal
  });
}

// Registrar entrega en tabla entregas
async function logEntrega(req, res, data) {
  const { error } = await supabase.from("entregas").insert([
    {
      nombre_usuario: data.nombreUsuario || "",
      correo: data.correoUsuario || "",
      fecha_entrega: data.fechaEntrega
        ? new Date(data.fechaEntrega).toISOString()
        : new Date().toISOString(),
      sucursal: data.sucursal || "",
      nombre_guardia: data.nombreGuardia || "",
      qr_token: data.qrToken || "",
      qr_caja: data.qrCaja || ""
    }
  ]);

  if (error) {
    console.error("logEntrega error:", error);
    return res.status(500).json({ ok: false, message: "Error registrando entrega" });
  }

  return res.json({ ok: true, log: { ok: true } });
}

/****************************************************
 * ADMIN PANEL ENDPOINTS
 ****************************************************/

// Estadísticas completas para el panel de administrador
async function getAdminStats(req, res) {
  try {
    // Total de trabajadores en nómina
    const { data: nomina, error: nomError } = await supabase
      .from("nomina_trabajadores")
      .select("correo");

    if (nomError) {
      console.error("getAdminStats nomina error:", nomError);
      return res.status(500).json({ ok: false, message: "Error consultando nómina" });
    }

    const totalTrabajadores = nomina?.length || 0;

    // Entregas realizadas (correos únicos)
    const { data: entregas, error: entError } = await supabase
      .from("entregas")
      .select("correo");

    if (entError) {
      console.error("getAdminStats entregas error:", entError);
      return res.status(500).json({ ok: false, message: "Error consultando entregas" });
    }

    const correosEntregados = new Set();
    (entregas || []).forEach(e => {
      const c = (e.correo || "").trim().toLowerCase();
      if (c) correosEntregados.add(c);
    });

    const entregados = correosEntregados.size;
    const pendientes = totalTrabajadores - entregados;

    // Entregas por sucursal
    const { data: nominaCompleta, error: nomCompError } = await supabase
      .from("nomina_trabajadores")
      .select("correo, sucursal");

    if (nomCompError) {
      console.error("getAdminStats nomina completa error:", nomCompError);
    }

    const porSucursal = {};
    (nominaCompleta || []).forEach(t => {
      const sucursal = t.sucursal || "Sin sucursal";
      const correo = (t.correo || "").trim().toLowerCase();

      if (!porSucursal[sucursal]) {
        porSucursal[sucursal] = { total: 0, entregados: 0, pendientes: 0 };
      }

      porSucursal[sucursal].total++;

      if (correo && correosEntregados.has(correo)) {
        porSucursal[sucursal].entregados++;
      } else {
        porSucursal[sucursal].pendientes++;
      }
    });

    return res.json({
      ok: true,
      data: {
        totalTrabajadores,
        entregados,
        pendientes,
        porcentajeEntregado: totalTrabajadores > 0 ? Math.round((entregados / totalTrabajadores) * 100) : 0,
        porSucursal
      }
    });
  } catch (err) {
    console.error("getAdminStats error:", err);
    return res.status(500).json({ ok: false, message: "Error obteniendo estadísticas" });
  }
}

// Nómina completa con todos los detalles para el admin
async function getNominaComplete(req, res) {
  try {
    const { data: nomina, error: nomError } = await supabase
      .from("nomina_trabajadores")
      .select("*")
      .order("apellido", { ascending: true });

    if (nomError) {
      console.error("getNominaComplete error:", nomError);
      return res.status(500).json({ ok: false, message: "Error consultando nómina" });
    }

    // Obtener entregas
    const { data: entregas, error: entError } = await supabase
      .from("entregas")
      .select("correo, fecha_entrega");

    if (entError) {
      console.error("getNominaComplete entregas error:", entError);
    }

    // Mapa de correos entregados
    const entregasMap = {};
    (entregas || []).forEach(e => {
      const correo = (e.correo || "").trim().toLowerCase();
      if (correo) {
        if (!entregasMap[correo]) {
          entregasMap[correo] = [];
        }
        entregasMap[correo].push(e.fecha_entrega);
      }
    });

    const resultado = (nomina || []).map(t => {
      const correo = (t.correo || "").trim();
      const correoKey = correo.toLowerCase();
      const fechasEntrega = entregasMap[correoKey] || [];
      const entregado = fechasEntrega.length > 0;

      return {
        id: t.id,
        nombre: t.nombre || "",
        apellido: t.apellido || "",
        rut: t.rut || "",
        correo: correo,
        direccion: t.direccion || "",
        telefono: t.telefono || "",
        vigente: t.vigente || "",
        tipoContrato: t.tipo_contrato || "",
        sucursal: t.sucursal || "",
        estadoEntrega: entregado ? "ENTREGADO" : "NO ENTREGADO",
        fechasEntrega: fechasEntrega
      };
    });

    return res.json({ ok: true, data: resultado });
  } catch (err) {
    console.error("getNominaComplete error:", err);
    return res.status(500).json({ ok: false, message: "Error obteniendo nómina completa" });
  }
}

// Datos completos para exportación a Excel
async function getExportData(req, res) {
  try {
    // Trabajadores con estado
    const { data: nomina, error: nomError } = await supabase
      .from("nomina_trabajadores")
      .select("*")
      .order("apellido", { ascending: true });

    if (nomError) {
      console.error("getExportData nomina error:", nomError);
      return res.status(500).json({ ok: false, message: "Error consultando nómina" });
    }

    // Entregas completas
    const { data: entregas, error: entError } = await supabase
      .from("entregas")
      .select("*")
      .order("fecha_entrega", { ascending: false });

    if (entError) {
      console.error("getExportData entregas error:", entError);
      return res.status(500).json({ ok: false, message: "Error consultando entregas" });
    }

    // Mapa de entregas por correo
    const entregasMap = {};
    (entregas || []).forEach(e => {
      const correo = (e.correo || "").trim().toLowerCase();
      if (correo) {
        if (!entregasMap[correo]) {
          entregasMap[correo] = [];
        }
        entregasMap[correo].push(e);
      }
    });

    // Trabajadores con estado
    const trabajadores = (nomina || []).map(t => {
      const correo = (t.correo || "").trim();
      const correoKey = correo.toLowerCase();
      const tieneEntrega = entregasMap[correoKey] && entregasMap[correoKey].length > 0;

      return {
        nombre: t.nombre || "",
        apellido: t.apellido || "",
        rut: t.rut || "",
        correo: correo,
        tipoContrato: t.tipo_contrato || "",
        sucursal: t.sucursal || "",
        telefono: t.telefono || "",
        direccion: t.direccion || "",
        vigente: t.vigente || "",
        estadoEntrega: tieneEntrega ? "ENTREGADO" : "NO ENTREGADO"
      };
    });

    // Pendientes
    const pendientes = trabajadores.filter(t => t.estadoEntrega === "NO ENTREGADO");

    // Entregas realizadas con detalles
    const entregasRealizadas = (entregas || []).map(e => ({
      nombreUsuario: e.nombre_usuario || "",
      correo: e.correo || "",
      fechaEntrega: e.fecha_entrega || "",
      sucursal: e.sucursal || "",
      nombreGuardia: e.nombre_guardia || "",
      qrCaja: e.qr_caja || ""
    }));

    return res.json({
      ok: true,
      data: {
        trabajadores,
        entregasRealizadas,
        pendientes
      }
    });
  } catch (err) {
    console.error("getExportData error:", err);
    return res.status(500).json({ ok: false, message: "Error obteniendo datos de exportación" });
  }
}

// Crear nuevo trabajador en nómina
async function createTrabajador(req, res, data) {
  try {
    const { error } = await supabase.from("nomina_trabajadores").insert([
      {
        nombre: data.nombre || "",
        apellido: data.apellido || "",
        rut: data.rut || "",
        correo: (data.correo || "").trim().toLowerCase(),
        direccion: data.direccion || "",
        telefono: data.telefono || "",
        vigente: data.vigente || "SI",
        tipo_contrato: data.tipoContrato || "",
        sucursal: data.sucursal || ""
      }
    ]);

    if (error) {
      console.error("createTrabajador error:", error);
      return res.status(500).json({ ok: false, message: "Error creando trabajador" });
    }

    return res.json({ ok: true, message: "Trabajador creado exitosamente" });
  } catch (err) {
    console.error("createTrabajador error:", err);
    return res.status(500).json({ ok: false, message: "Error creando trabajador" });
  }
}

// Actualizar trabajador existente
async function updateTrabajador(req, res, data) {
  try {
    const id = data.id;

    if (!id) {
      return res.status(400).json({ ok: false, message: "Falta ID del trabajador" });
    }

    const { error } = await supabase
      .from("nomina_trabajadores")
      .update({
        nombre: data.nombre || "",
        apellido: data.apellido || "",
        rut: data.rut || "",
        correo: (data.correo || "").trim().toLowerCase(),
        direccion: data.direccion || "",
        telefono: data.telefono || "",
        vigente: data.vigente || "SI",
        tipo_contrato: data.tipoContrato || "",
        sucursal: data.sucursal || ""
      })
      .eq("id", id);

    if (error) {
      console.error("updateTrabajador error:", error);
      return res.status(500).json({ ok: false, message: "Error actualizando trabajador" });
    }

    return res.json({ ok: true, message: "Trabajador actualizado exitosamente" });
  } catch (err) {
    console.error("updateTrabajador error:", err);
    return res.status(500).json({ ok: false, message: "Error actualizando trabajador" });
  }
}

// Eliminar trabajador (marca como no vigente)
async function deleteTrabajador(req, res, data) {
  try {
    const id = data.id;

    if (!id) {
      return res.status(400).json({ ok: false, message: "Falta ID del trabajador" });
    }

    // Opción 1: Marcar como no vigente (soft delete)
    const { error } = await supabase
      .from("nomina_trabajadores")
      .update({ vigente: "NO" })
      .eq("id", id);

    // Opción 2: Eliminar permanentemente (descomentar si se prefiere)
    // const { error } = await supabase
    //   .from("nomina_trabajadores")
    //   .delete()
    //   .eq("id", id);

    if (error) {
      console.error("deleteTrabajador error:", error);
      return res.status(500).json({ ok: false, message: "Error eliminando trabajador" });
    }

    return res.json({ ok: true, message: "Trabajador eliminado exitosamente" });
  } catch (err) {
    console.error("deleteTrabajador error:", err);
    return res.status(500).json({ ok: false, message: "Error eliminando trabajador" });
  }
}

