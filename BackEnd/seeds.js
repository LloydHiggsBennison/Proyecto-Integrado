// seeds.js
// Lee la hoja de Google Sheets "Nomina Trabajadores" y la vuelca en Mongo (colección: nomina)

import fetch from "node-fetch";              // si usas Node 18+ puedes quitar este import y usar global fetch
import { MongoClient } from "mongodb";
import 'dotenv/config';

// ========== CONFIG ==========
const SHEET_ID = "1ubRCn_upK6BjzBGSdVn9VZGPMod52X_s0JebS1DB8Qk";
const SHEET_NAME = "Nomina Trabajadores"; // debe ser exactamente igual al nombre de la pestaña
// URL para bajar como CSV
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
  SHEET_NAME
)}`;

const MONGODB_URI = process.env.MONGODB_URI; // pónla en Railway
const DB_NAME = "3Montes_Sites";             // el que mostraste en la captura
const COLLECTION_NAME = "nomina";

if (!MONGODB_URI) {
  console.error("Falta MONGODB_URI en variables de entorno");
  process.exit(1);
}

async function main() {
  console.log("Descargando CSV de Google Sheets...");
  const res = await fetch(SHEET_CSV_URL);
  if (!res.ok) {
    console.error("No se pudo descargar el CSV:", res.status, await res.text());
    process.exit(1);
  }
  const csvText = await res.text();

  // parseo súper simple de CSV (sirve si no tienes comas dentro de campos)
  const lines = csvText.split("\n").map((l) => l.trim()).filter(Boolean);

  // primera línea son los headers del sheet (si RRHH no pone headers, quítale esto)
  const [headerLine, ...dataLines] = lines;

  // conectamos a mongo
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  const nomina = db.collection(COLLECTION_NAME);

  console.log("Borrando datos anteriores de la colección nomina...");
  await nomina.deleteMany({});

  const docs = dataLines.map((line) => {
  const cols = line.split(",").map((c) => limpiarCelda(c));

  return {
    nombre: cols[0] || "",
    apellido: cols[1] || "",
    rut: cols[2] || "",
    correo: (cols[3] || "").toLowerCase(),
    direccion: cols[4] || "",
    telefono: cols[5] || "",
    vigente: cols[6] || "",
    tipoContrato: cols[7] || "",
    createdAt: new Date()
  };
});

// helper para quitar comillas y espacios
function limpiarCelda(celda = "") {
  const t = celda.trim();
  // quita comillas al inicio y al final si las hay
  return t.replace(/^"+|"+$/g, "");
}

  console.log(`Insertando ${docs.length} trabajadores en Mongo...`);
  if (docs.length > 0) {
    await nomina.insertMany(docs);
  }

  console.log("Listo ✅");
  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
