import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcryptjs";

const app = express();

// CORS abierto para pruebas en local
app.use(cors({ origin: "*" }));
app.use(express.json());

// ====== ENV ======
const uri = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || "3Montes_Sites";

if (!uri) {
  console.error("Falta MONGO_URI en variables de entorno");
}

// ====== MONGO ======
const client = new MongoClient(uri);

async function getDB() {
  if (!client.topology?.isConnected()) {
    await client.connect();
  }
  return client.db(DB_NAME);
}

// ====== ROOT ======
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
   NOMINA  (para validar que el correo existe)
   Front está llamando a:  GET /nomina/by-email?email=...
------------------------------------------------------------------ */
async function handleNominaByEmail(req, res) {
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
}
app.get("/nomina/by-email", handleNominaByEmail);
app.get("/api/nomina/by-email", handleNominaByEmail); // alias extra

/* ------------------------------------------------------------------
   USUARIOS
   Front está llamando a:  GET /usuarios/by-email?email=...
                           POST /usuarios
------------------------------------------------------------------ */
async function handleGetUsuarioByEmail(req, res) {
  try {
    const db = await getDB();
    const email = (req.query.email || "").toLowerCase();
    const usuario = await db.collection("usuarios").findOne({ correo: email });

    if (!usuario) {
      return res.status(404).json({ ok: false, message: "Usuario no encontrado" });
    }

    // devolvemos tal cual, el front ya lo espera así
    res.json({ ok: true, usuario });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
app.get("/usuarios/by-email", handleGetUsuarioByEmail);
app.get("/api/usuarios/by-email", handleGetUsuarioByEmail); // alias extra

// crear / actualizar usuario
async function handlePostUsuario(req, res) {
  try {
    const db = await getDB();
    const body = req.body || {};
    const correo = (body.correo || "").toLowerCase();

    if (!correo) {
      return res.status(400).json({ ok: false, message: "Correo requerido" });
    }

    // armamos el objeto que se va a guardar
    const update = {
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

    // si vino password, la hasheamos
    if (body.password) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(body.password, salt);
      update.password = hash;
    }

    await db.collection("usuarios").updateOne(
      { correo },
      { $set: update, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );

    res.json({ ok: true, usuario: update });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
app.post("/usuarios", handlePostUsuario);
app.post("/api/usuarios", handlePostUsuario); // alias extra

/* ------------------------------------------------------------------
   GUARDIAS
   Front está llamando a:  GET /guardias
------------------------------------------------------------------ */
async function handleGetGuardias(req, res) {
  try {
    const db = await getDB();
    const guardias = await db.collection("guardias").find({}).toArray();
    res.json({ ok: true, guardias });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
app.get("/guardias", handleGetGuardias);
app.get("/api/guardias", handleGetGuardias); // alias extra

/* ------------------------------------------------------------------
   ENTREGAS
   Front está llamando a:  POST /entregas
------------------------------------------------------------------ */
async function handlePostEntrega(req, res) {
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
}
app.post("/entregas", handlePostEntrega);
app.post("/api/entregas", handlePostEntrega); // alias extra

/* ------------------------------------------------------------------
   START
------------------------------------------------------------------ */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("✅ API Mongo escuchando en puerto " + PORT);
});
