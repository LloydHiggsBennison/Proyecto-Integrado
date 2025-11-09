import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";

const app = express();
app.use(cors());
app.use(express.json());

const uri = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || "3Montes_Sites";
const COLLECTION = process.env.COLLECTION || "config";

const client = new MongoClient(uri);

async function getCollection() {
  if (!client.topology?.isConnected()) {
    await client.connect();
  }
  return client.db(DB_NAME).collection(COLLECTION);
}

app.get("/", (req, res) => {
  res.json({ ok: true, msg: "API Mongo viva 👋" });
});

app.get("/config", async (req, res) => {
  try {
    const col = await getCollection();
    const docs = await col.find({}).toArray();
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/config", async (req, res) => {
  try {
    const col = await getCollection();
    const r = await col.insertOne(req.body);
    res.json(r);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/config/:id", async (req, res) => {
  try {
    const col = await getCollection();
    const r = await col.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: req.body }
    );
    res.json(r);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("✅ API Mongo escuchando en puerto " + PORT));
