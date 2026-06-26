import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

/**
 * api/assistant.ts — Asistente CFO financiero
 * POST { messages: [{role,content}], accessToken: string }
 * Verifica el JWT de Supabase, arma contexto financiero real y llama a Claude.
 */

const SUPABASE_URL       = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERV_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANTHROPIC_API_KEY  = process.env.ANTHROPIC_API_KEY!;

function money(n: number) {
  return new Intl.NumberFormat("es-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function daysAgo(dateStr: string, today: string): number {
  return Math.round(
    (new Date(today + "T00:00:00").getTime() - new Date(dateStr + "T00:00:00").getTime()) / 86_400_000
  );
}

function daysUntil(dateStr: string, today: string): number {
  return Math.round(
    (new Date(dateStr + "T00:00:00").getTime() - new Date(today + "T00:00:00").getTime()) / 86_400_000
  );
}

function supName(inv: any): string {
  if (!inv.suppliers) return "Proveedor";
  if (Array.isArray(inv.suppliers)) return inv.suppliers[0]?.name ?? "Proveedor";
  return inv.suppliers.name;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (!ANTHROPIC_API_KEY || !SUPABASE_URL || !SUPABASE_SERV_KEY) {
    return res.status(500).json({ error: "Missing server environment variables" });
  }

  const { messages, accessToken } = req.body ?? {};
  if (!Array.isArray(messages) || !messages.length || !accessToken) {
    return res.status(400).json({ error: "Faltan messages y/o accessToken" });
  }

  // ── Verificar usuario ─────────────────────────────────────────────────────
  const admin = createClient(SUPABASE_URL, SUPABASE_SERV_KEY);
  const { data: { user }, error: authErr } = await admin.auth.getUser(accessToken);
  if (authErr || !user) return res.status(401).json({ error: "No autorizado" });
  const userId = user.id;

  // ── Consultar datos financieros reales ────────────────────────────────────
  const today = new Date().toISOString().split("T")[0];
  const now   = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const in30  = new Date(now.getTime() + 30 * 86_400_000).toISOString().split("T")[0];

  const [
    { data: accounts },
    { data: movements },
    { data: invoices },
  ] = await Promise.all([
    admin.from("cash_accounts").select("starting_balance").eq("user_id", userId),
    admin.from("cash_movements").select("type,amount,occurred_at,category").eq("user_id", userId),
    admin.from("invoices")
      .select("total_amount,due_date,status,invoice_number,suppliers(name)")
      .eq("user_id", userId)
      .not("status", "eq", "paid")
      .not("status", "eq", "void")
      .order("due_date"),
  ]);

  // Saldo
  const base = (accounts ?? []).reduce((s, a) => s + Number(a.starting_balance), 0);
  const all  = movements ?? [];
  const net  = all.reduce((s, m) => s + (m.type === "income" ? Number(m.amount) : -Number(m.amount)), 0);
  const balance = base + net;

  // Totales del mes
  const monthMov = all.filter(m => m.occurred_at >= firstOfMonth && m.occurred_at <= today);
  const monthIncome  = monthMov.filter(m => m.type === "income").reduce((s, m) => s + Number(m.amount), 0);
  const monthExpense = monthMov.filter(m => m.type === "expense").reduce((s, m) => s + Number(m.amount), 0);

  // Facturas
  const pending  = (invoices ?? []);
  const overdue  = pending.filter(i => i.due_date && i.due_date < today);
  const upcoming = pending.filter(i => i.due_date && i.due_date >= today && i.due_date <= in30);
  const total30  = upcoming.reduce((s, i) => s + Number(i.total_amount), 0);
  const totalOwed = pending.reduce((s, i) => s + Number(i.total_amount), 0);

  // ── System prompt con contexto real ──────────────────────────────────────
  const overdueLines = overdue.length
    ? overdue.map(i => `  • ${supName(i)}: ${money(Number(i.total_amount))} (hace ${daysAgo(i.due_date!, today)} días)`).join("\n")
    : "  Ninguna";

  const upcomingLines = upcoming.length
    ? upcoming.map(i => `  • ${supName(i)}: ${money(Number(i.total_amount))} (en ${daysUntil(i.due_date!, today)} días)`).join("\n")
    : "  Ninguna en los próximos 30 días";

  const systemPrompt = `Eres el CFO virtual de un restaurante. Eres profesional, directo y das consejos financieros concisos y accionables en español. No uses markdown excesivo ni listas innecesarias. Si no tienes datos suficientes para una pregunta específica, indícalo brevemente.

ESTADO FINANCIERO DEL RESTAURANTE (fecha: ${today}):
• Saldo disponible: ${money(balance)}
• Ingresos del mes: ${money(monthIncome)}
• Gastos del mes: ${money(monthExpense)}
• Balance neto del mes: ${money(monthIncome - monthExpense)}

CUENTAS POR PAGAR (${pending.length} facturas, total ${money(totalOwed)}):
${overdue.length > 0 ? `⚠️ VENCIDAS — PRIORIDAD ALTA (${overdue.length} facturas, ${money(overdue.reduce((s, i) => s + Number(i.total_amount), 0))}):\n${overdueLines}` : "✓ Sin facturas vencidas"}

PRÓXIMOS 30 DÍAS (${money(total30)} por pagar):
${upcomingLines}`;

  // ── Llamar a Claude API ───────────────────────────────────────────────────
  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key":          ANTHROPIC_API_KEY,
      "anthropic-version":  "2023-06-01",
      "content-type":       "application/json",
    },
    body: JSON.stringify({
      model:      "claude-sonnet-4-6",
      max_tokens: 1024,
      system:     systemPrompt,
      messages,
    }),
  });

  console.log("[assistant] Anthropic status:", anthropicRes.status);

  if (!anthropicRes.ok) {
    const body = await anthropicRes.text();
    console.error("[assistant] Error body:", body);
    return res.status(502).json({ error: "Error en Claude API", status: anthropicRes.status, detail: body });
  }

  const data = await anthropicRes.json() as any;
  const text: string = (data.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");

  return res.status(200).json({ ok: true, text });
}
