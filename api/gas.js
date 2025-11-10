// api/gas.js

export default async function handler(req, res) {
  // 🔁 pon aquí tu URL de Apps Script publicada
  const GAS_URL = "https://script.google.com/macros/s/AKfycbxsNDWMsAImpLVI3nsSSLaiz4LNdCOAX5ydBqDx6r_9qdZU5-PEKx3bQm-AZ7EAjb7BjA/exec";

  // pasar querystrings (?action=...)
  const query = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  const url = req.method === "GET" ? GAS_URL + query : GAS_URL;

  try {
    const gasRes = await fetch(url, {
      method: req.method,
      headers: { "Content-Type": "application/json" },
      body: req.method === "POST" ? JSON.stringify(req.body) : undefined,
    });

    const text = await gasRes.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = { ok: false, raw: text };
    }

    // CORS para tu front
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    res.status(200).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: "Error en proxy", error: String(err) });
  }
}
