/**
 * api/extract-invoice.ts — Vercel Serverless Function
 *
 * Extrae datos de una factura (imagen) usando CLAUDE VISION.
 * NO usar OpenAI/Tesseract/Google Vision. Modelo: claude-sonnet-4-6.
 *
 * Entrada (POST JSON): { imageBase64: string, mediaType: "image/jpeg" | "image/png" | "image/webp" }
 * Salida: JSON estructurado de la factura. NO persiste nada:
 *   el frontend debe mostrar pantalla de CONFIRMACIÓN HUMANA antes de guardar en Supabase.
 *
 * Requiere env del servidor: ANTHROPIC_API_KEY
 */

type VercelRequest = {
  method?: string;
  body?: any;
};
type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: any) => void;
};

const EXTRACTION_SCHEMA = `{
  "supplier_name": string,
  "invoice_number": string | null,
  "issue_date": string | null,        // ISO YYYY-MM-DD
  "due_date": string | null,          // ISO YYYY-MM-DD
  "currency": string,                  // p.ej. "USD"
  "subtotal": number | null,
  "tax": number | null,
  "total_amount": number,
  "line_items": [
    { "description": string, "quantity": number | null, "unit_price": number | null, "line_total": number | null }
  ]
}`;

const SYSTEM_PROMPT =
  `Eres un extractor de datos de facturas de restaurantes. ` +
  `Devuelve EXCLUSIVAMENTE un objeto JSON válido que cumpla este esquema, sin texto extra, ` +
  `sin explicaciones y sin bloques de código markdown:\n` +
  EXTRACTION_SCHEMA +
  `\nSi un campo no aparece en la factura, usa null. Las cantidades son números (sin símbolo de moneda). ` +
  `Las fechas en formato ISO YYYY-MM-DD.`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Falta ANTHROPIC_API_KEY en el servidor" });
  }

  const { imageBase64, mediaType } = (req.body || {}) as {
    imageBase64?: string;
    mediaType?: string;
  };

  if (!imageBase64 || !mediaType) {
    return res.status(400).json({ error: "Faltan imageBase64 y/o mediaType" });
  }

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

    if (!anthropicRes.ok) {
      const detail = await anthropicRes.text();
      return res.status(502).json({ error: "Error en Claude API", detail });
    }

    const data = await anthropicRes.json();
    const text: string = (data.content || [])
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("");

    // Parseo robusto: quita fences por si acaso y aísla el primer objeto JSON.
    const cleaned = text.replace(/```json|```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    const jsonStr = start >= 0 && end >= 0 ? cleaned.slice(start, end + 1) : cleaned;

    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return res.status(422).json({
        error: "No se pudo parsear la respuesta como JSON",
        raw: text,
      });
    }

    // OJO: esto NO se guarda. El frontend debe confirmarlo con el usuario primero.
    return res.status(200).json({ ok: true, invoice: parsed });
  } catch (err: any) {
    return res.status(500).json({ error: "Fallo inesperado", detail: String(err?.message || err) });
  }
}
