/**
 * api/extract-invoice.cjs — Vercel Serverless Function (CommonJS)
 *
 * .cjs fuerza CommonJS aunque package.json tenga "type": "module".
 * Extrae datos de una factura (imagen) usando CLAUDE VISION.
 *
 * POST { imageBase64: string, mediaType: "image/jpeg"|"image/png"|"image/webp" }
 * Devuelve JSON estructurado. NO persiste — el frontend confirma antes de guardar.
 * Requiere env: ANTHROPIC_API_KEY
 */

const EXTRACTION_SCHEMA = `{
  "supplier_name": string,
  "invoice_number": string | null,
  "issue_date": string | null,
  "due_date": string | null,
  "currency": string,
  "subtotal": number | null,
  "tax": number | null,
  "total_amount": number,
  "line_items": [
    { "description": string, "quantity": number | null, "unit_price": number | null, "line_total": number | null }
  ]
}`;

const SYSTEM_PROMPT =
  "Eres un extractor de datos de facturas de restaurantes. " +
  "Devuelve EXCLUSIVAMENTE un objeto JSON válido que cumpla este esquema, sin texto extra, " +
  "sin explicaciones y sin bloques de código markdown:\n" +
  EXTRACTION_SCHEMA +
  "\nSi un campo no aparece en la factura, usa null. Las cantidades son números (sin símbolo de moneda). " +
  "Las fechas en formato ISO YYYY-MM-DD.";

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Falta ANTHROPIC_API_KEY en el servidor" });
  }

  const { imageBase64, mediaType } = req.body || {};

  if (!imageBase64 || !mediaType) {
    return res.status(400).json({ error: "Faltan imageBase64 y/o mediaType" });
  }

  console.log("[extract-invoice] Iniciando llamada a Claude Vision API");
  console.log("[extract-invoice] mediaType:", mediaType, "| imageBase64 length:", imageBase64.length);

  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType, data: imageBase64 },
              },
              {
                type: "text",
                text: "Extrae los datos de esta factura como JSON según el esquema indicado.",
              },
            ],
          },
        ],
      }),
    });

    console.log("[extract-invoice] Anthropic HTTP status:", anthropicRes.status, anthropicRes.statusText);

    if (!anthropicRes.ok) {
      const errorBody = await anthropicRes.text();
      console.error("[extract-invoice] Anthropic error body:", errorBody);
      return res.status(502).json({
        error: "Error en Claude API",
        status: anthropicRes.status,
        detail: errorBody,
      });
    }

    const data = await anthropicRes.json();
    console.log("[extract-invoice] Respuesta OK — stop_reason:", data.stop_reason, "| usage:", JSON.stringify(data.usage));

    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    const cleaned = text.replace(/```json|```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    const jsonStr = start >= 0 && end >= 0 ? cleaned.slice(start, end + 1) : cleaned;

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("[extract-invoice] JSON parse failed. Raw text:", text);
      return res.status(422).json({
        error: "No se pudo parsear la respuesta como JSON",
        raw: text,
      });
    }

    // NO se guarda. El frontend debe confirmarlo con el usuario primero.
    return res.status(200).json({ ok: true, invoice: parsed });
  } catch (err) {
    console.error("[extract-invoice] Fallo inesperado:", err);
    return res.status(500).json({ error: "Fallo inesperado", detail: String(err?.message || err) });
  }
};
