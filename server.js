import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";

const app = express();
app.use(cors());
app.use(express.json());

// 👇 estas variables las vas a definir en Railway (no las escribas aquí)
const uri = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || "3Montes_Sites";
const COLLECTION = process.env.COLLECTION || "config";

const client = new MongoClient(uri);

async function getCollection() {
  // conecta una sola vez
  if (!client.topology?.isConnected()) {
    await client.connect();
  }
  return client.db(DB_NAME).collection(COLLECTION);
}

// -------- RUTAS --------

// probar que está vivo
app.get("/", (req, res) => {
  res.json({ ok: true, msg: "API Mongo viva 👋" });
});

// obtener todos los documentos
app.get("/config", async (req, res) => {
  try {
    const col = await getCollection();
    const docs = await col.find({}).toArray();
    res.json(docs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// insertar un documento
app.post("/config", async (req, res) => {
  try {
    const col = await getCollection();
    const result = await col.insertOne(req.body);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// actualizar por _id
app.patch("/config/:id", async (req, res) => {
  try {
    const col = await getCollection();
    const result = await col.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: req.body }
    );
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("✅ API Mongo escuchando en puerto " + PORT);
});
