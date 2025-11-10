import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";

const app = express();

// CORS abierto para que el front en localhost pueda pegarle
app.use(cors({ origin: "*" }));
app.use(express.json());

// ========= CONFIG MONGO =========
const uri = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || "3Montes_Sites";

const client = new MongoClient(uri);

async function getDB() {
  if (!client.topology?.isConnected()) {
    await client.connect();
  }
  return client.db(DB_NAME);
}

// ========= ROOT =========
app.get("/", (req, res) => {
  res.json({ ok: true, msg: "✅ API Mongo viva 👋" });
});

// ========= CONFIG (lo que ya tenías) =========
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

// ========= NOMINA (para validar registro) =========
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

// ========= USUARIOS =========

// login del front: GET /usuarios/by-email?email=...
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

// registro/activación del front: POST /usuarios
app.post("/usuarios", async (req, res) => {
  try {
    const db = await getDB();
    const body = req.body || {};
    const correo = (body.correo || "").toLowerCase();

    if (!correo) {
      return res.status(400).json({ ok: false, message: "Correo requerido" });
    }

    const update = {
      nombre: body.nombre || "",
      apellido: body.apellido || "",
      correo,
      direccion: body.direccion || "",
      telefono: body.telefono || "",
      tipoContrato: body.tipoContrato || "",
      vigente: body.vigente || "",
      sucursal: body.sucursal || "",
      password: body.password || "",
      qrToken: body.qrToken || "",
      qrImagenURL: body.qrImagenURL || "",
      origen: body.origen || "web",
      updatedAt: new Date()
    };

    await db.collection("usuarios").updateOne(
      { correo },
      { $set: update, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );

    res.json({ ok: true, usuario: update });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========= GUARDIAS (para login de guardia) =========
app.get("/guardias", async (req, res) => {
  try {
    const db = await getDB();
    const guardias = await db.collection("guardias").find({}).toArray();
    res.json({ ok: true, guardias });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========= ENTREGAS =========
app.post("/entregas", async (req, res) => {
  try {
    const db = await getDB();
    const body = req.body || {};
    await db.collection("entregas").insertOne({
      ...body,
      createdAt: new Date()
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========= START =========
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("✅ API Mongo escuchando en puerto " + PORT);
});
