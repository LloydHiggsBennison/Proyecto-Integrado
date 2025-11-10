import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

// ⚠️ Usa tu URL real de Google Apps Script aquí:
const GAS_URL = "https://script.google.com/macros/s/AKfycbyICO-Hs3QBtd9oM70PveOvmDL6luV3pnbuA8Mul9z8BUMiPt9cN1q5Ah_5KH9gJQcpeQ/exec";

app.use(cors());
app.use(express.json());

// Servir tus archivos HTML y JS desde la raíz
app.use(express.static("./"));

// Proxy a Google Apps Script
app.all("/api/gas", async (req, res) => {
  try {
    const query = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
    const url = req.method === "GET" ? GAS_URL + query : GAS_URL;

    const gasRes = await fetch(url, {
      method: req.method,
      headers: { "Content-Type": "application/json" },
      body: req.method === "POST" ? JSON.stringify(req.body) : undefined,
    });

    const text = await gasRes.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { ok: false, raw: text };
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json(data);
  } catch (err) {
    console.error("Error proxy:", err);
    res.status(500).json({ ok: false, error: String(err) });
  }
});

app.listen(PORT, () => console.log("Servidor activo en puerto", PORT));
