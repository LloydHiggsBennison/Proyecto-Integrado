// api/gas.js
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
    if (req.method === "GET") {
      const action = (req.query.action || "").toString();

      if (action === "getUsers")       return await getUsers(req, res);
      if (action === "getUserByEmail") return await getUserByEmail(req, res);
      if (action === "getUserByToken") return await getUserByToken(req, res);
      if (action === "getGuards")      return await getGuards(req, res);
      if (action === "getNomina")      return await getNomina(req, res);
      if (action === "getEntregas")    return await getEntregas(req, res);

      return res.json({ ok: true, message: "API Supabase activa (GET)" });
    }

    if (req.method === "POST") {
      const body = req.body || {};
      let action = body.action || body.Action || body.accion || "";

      // si no viene action pero hay correo+password → asumir createUser
      if (!action) {
        const tieneCorreo   = !!(body.correo || body.email);
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

      return res.status(400).json({
        ok: false,
        message: "Acción POST no soportada",
        receivedAction: action || null,
        payloadKeys: Object.keys(body)
      });
    }

    return res.status(405).json({ ok: false, message: "Método no permitido" });
  } catch (err) {
    console.error("Error en handler /api/gas:", err);
    return res.status(500).json({ ok: false, message: "Error interno", error: String(err) });
  }
}

/****************************************************
 * GET HANDLERS
 ****************************************************/

async function getUsers(req, res) {
  const { data: usuarios, error } = await supabase.from("usuarios").select("*");
  if (error) {
    console.error("getUsers error:", error);
    return res.status(500).json({ ok: false, message: "Error consultando usuarios" });
  }

  const salida = usuarios.map((u) => ({
    nombre:        u.nombre,
    apellido:      u.apellido,
    correo:        u.correo,
    password:      u.password || "",
    tipoContrato:  u.tipo_contrato,
    tipoBeneficio: u.tipo_beneficio,
    vigente:       u.vigente,
    qrToken:       u.qr_token,
    qrCaja:        u.qr_caja,
    qrVigencia:    u.qr_vigencia
  }));

  return res.json({ ok: true, data: salida });
}

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

  // renovar/generar QR si aplica
  let qrToken    = usuario.qr_token;
  let qrVigencia = usuario.qr_vigencia;
  let qrCaja     = usuario.qr_caja;
  const tipoContrato = usuario.tipo_contrato;

  let necesitaUpdate = false;

  if (!qrToken || necesitaRenovarQR(qrVigencia)) {
    qrToken    = generarTokenQR();
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

  return res.json({
    ok: true,
    data: {
      nombre:        usuario.nombre,
      apellido:      usuario.apellido,
      correo:        usuario.correo,
      password:      usuario.password || "",
      tipoContrato:  tipoContrato,
      tipoBeneficio: usuario.tipo_beneficio,
      vigente:       usuario.vigente,
      qrToken:       qrToken,
      qrCaja:        qrCaja,
      qrVigencia:    qrVigencia
    }
  });
}

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
      nombre:        usuario.nombre,
      apellido:      usuario.apellido,
      correo:        usuario.correo,
      tipoContrato:  usuario.tipo_contrato,
      tipoBeneficio: usuario.tipo_beneficio,
      qrToken:       usuario.qr_token,
      qrCaja:        usuario.qr_caja
    }
  });
}

async function getGuards(req, res) {
  const { data: guardias, error } = await supabase.from("guardias").select("*");
  if (error) {
    console.error("getGuards error:", error);
    return res.status(500).json({ ok: false, message: "Error consultando guardias" });
  }

  const rows = guardias.map((r) => ({
    nombre:   r.nombre,
    apellido: r.apellido,
    correo:   r.correo,
    telefono: r.telefono,
    direccion:r.direccion,
    password: r.password || "",
    vigente:  r.vigente,
    sucursal: r.sucursal
  }));

  return res.json({ ok: true, data: rows });
}

async function getNomina(req, res) {
  const { data: nomina, error } = await supabase
    .from("nomina_trabajadores")
    .select("*");

  if (error) {
    console.error("getNomina error:", error);
    return res.status(500).json({ ok: false, message: "Error consultando nómina" });
  }

  const rows = nomina.map((r) => ({
    nombre:       r.nombre,
    apellido:     r.apellido,
    rut:          r.rut,
    correo:       r.correo,
    direccion:    r.direccion,
    telefono:     r.telefono,
    vigente:      r.vigente,
    tipoContrato: r.tipo_contrato,
    sucursal:     r.sucursal
  }));

  return res.json({ ok: true, data: rows });
}

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
    correo:        r.correo,
    fechaEntrega:  r.fecha_entrega,
    sucursal:      r.sucursal,
    nombreGuardia: r.nombre_guardia,
    qrToken:       r.qr_token,
    qrCaja:        r.qr_caja
  }));

  return res.json({ ok: true, data: rows });
}

/****************************************************
 * POST HANDLERS
 ****************************************************/

async function createUser(req, res, data) {
  const correoReq   = (data.correo || data.email || "").toString().trim().toLowerCase();
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

  if (!nominaMatch && !guardiaMatch) {
    return res.json({
      ok: false,
      message: "El correo no está en Nómina ni en Guardia. No se puede crear el usuario."
    });
  }

  const esGuardia = !!guardiaMatch;

  const nombreFinal   = (nominaMatch?.nombre   || guardiaMatch?.nombre   || "");
  const apellidoFinal = (nominaMatch?.apellido || guardiaMatch?.apellido || "");
  const vigenteFinal  = nominaMatch
    ? normalizarVigente(nominaMatch.vigente)
    : normalizarVigente(guardiaMatch.vigente);

  const tipoContratoFinal = nominaMatch?.tipo_contrato || "";
  const tipoBenefFinal    = calcularBeneficio(tipoContratoFinal);

  let qrToken    = "";
  let qrCaja     = "";
  let qrVigencia = null;

  if (!esGuardia) {
    qrToken    = generarTokenQR();
    qrCaja     = generarQRCajaPorContrato(tipoContratoFinal);
    qrVigencia = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
  }

  const { error } = await supabase.from("usuarios").insert([
    {
      nombre:         nombreFinal,
      apellido:       apellidoFinal,
      correo:         correoReq,
      password:       passwordReq,
      tipo_contrato:  tipoContratoFinal,
      tipo_beneficio: tipoBenefFinal,
      vigente:        vigenteFinal,
      qr_token:       qrToken,
      qr_caja:        qrCaja,
      qr_vigencia:    qrVigencia
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
    qrVigencia
  });
}

async function logEntrega(req, res, data) {
  const { error } = await supabase.from("entregas").insert([
    {
      nombre_usuario: data.nombreUsuario || "",
      correo:         data.correoUsuario || "",
      fecha_entrega:  data.fechaEntrega
        ? new Date(data.fechaEntrega).toISOString()
        : new Date().toISOString(),
      sucursal:       data.sucursal || "",
      nombre_guardia: data.nombreGuardia || "",
      qr_token:       data.qrToken || "",
      qr_caja:        data.qrCaja || ""
    }
  ]);

  if (error) {
    console.error("logEntrega error:", error);
    return res.status(500).json({ ok: false, message: "Error registrando entrega" });
  }

  return res.json({ ok: true, log: { ok: true } });
}
