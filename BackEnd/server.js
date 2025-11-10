import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import crypto from "crypto";

const app = express();

// CORS abierto para tu front en localhost
app.use(cors({ origin: "*", methods: "GET,POST,PATCH,OPTIONS", allowedHeaders: "Content-Type" }));
app.use(express.json());

// ===== ENV =====
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || "3Montes_Sites";

if (!MONGO_URI) {
  console.error("❌ Falta MONGO_URI en las variables de entorno");
}

// ===== MONGO =====
const client = new MongoClient(MONGO_URI);

// misma idea que tenías tú
async function getDB() {
  if (!client.topology || !client.topology.isConnected()) {
    await client.connect();
  }
  return client.db(DB_NAME);
}

// helper para hash sin dependencias extra
function hashPassword(plain = "") {
  return crypto.createHash("sha256").update(plain).digest("hex");
}

// ===== RUTA RAÍZ =====
app.get("/", (req, res) => {
  res.json({ ok: true, msg: "✅ API Mongo viva 👋" });
});

/* ------------------------------------------------------------------
   CONFIG  (lo que ya tenías)
------------------------------------------------------------------ */
app.get("/config", async (req, res) => {
  try {
    const db = await getDB();
    const docs = await db.collection("config").find({}).toArray();
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/config", async (req, res) => {
  try {
    const db = await getDB();
    const r = await db.collection("config").insertOne(req.body);
    res.json(r);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/config/:id", async (req, res) => {
  try {
    const db = await getDB();
    const r = await db
      .collection("config")
      .updateOne({ _id: new ObjectId(req.params.id) }, { $set: req.body });
    res.json(r);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ------------------------------------------------------------------
   NOMINA  (el front llama: GET /nomina/by-email?email=...)
------------------------------------------------------------------ */
app.get("/nomina/by-email", async (req, res) => {
  try {
    const db = await getDB();
    const email = (req.query.email || "").toLowerCase();
    const trabajador = await db.collection("nomina").findOne({ correo: email });
    if (!trabajador) {
      return res.status(404).json({ ok: false, message: "No encontrado en nómina" });
    }
    res.json({ ok: true, trabajador });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ------------------------------------------------------------------
   USUARIOS
   - el front hace: GET /usuarios/by-email?email=...
   - el front hace: POST /usuarios  (registro)
------------------------------------------------------------------ */

// login / consulta
app.get("/usuarios/by-email", async (req, res) => {
  try {
    const db = await getDB();
    const email = (req.query.email || "").toLowerCase();
    const usuario = await db.collection("usuarios").findOne({ correo: email });
    if (!usuario) {
      return res.status(404).json({ ok: false, message: "Usuario no encontrado" });
    }
    res.json({ ok: true, usuario });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// crear / actualizar
app.post("/usuarios", async (req, res) => {
  try {
    const db = await getDB();
    const body = req.body || {};
    const correo = (body.correo || "").toLowerCase();
    if (!correo) {
      return res.status(400).json({ ok: false, message: "Correo requerido" });
    }

    const doc = {
      nombre: body.nombre || "",
      apellido: body.apellido || "",
      correo,
      direccion: body.direccion || "",
      telefono: body.telefono || "",
      tipoContrato: body.tipoContrato || "",
      vigente: body.vigente || "",
      sucursal: body.sucursal || "",
      qrToken: body.qrToken || "",
      qrImagenURL: body.qrImagenURL || "",
      origen: body.origen || "web",
      updatedAt: new Date(),
    };

    // si viene password claro, la guardamos hasheada
    if (body.password) {
      doc.password = hashPassword(body.password);
    }

    await db.collection("usuarios").updateOne(
      { correo },
      { $set: doc, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );

    res.json({ ok: true, usuario: doc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ------------------------------------------------------------------
   GUARDIAS  (el front hace: GET /guardias)
------------------------------------------------------------------ */
app.get("/guardias", async (req, res) => {
  try {
    const db = await getDB();
    const guardias = await db.collection("guardias").find({}).toArray();
    res.json({ ok: true, guardias });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ------------------------------------------------------------------
   ENTREGAS  (el front hace: POST /entregas)
------------------------------------------------------------------ */
app.post("/entregas", async (req, res) => {
  try {
    const db = await getDB();
    const body = req.body || {};
    await db.collection("entregas").insertOne({
      ...body,
      createdAt: new Date(),
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ------------------------------------------------------------------
   START
------------------------------------------------------------------ */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("✅ API Mongo escuchando en puerto " + PORT);
});
