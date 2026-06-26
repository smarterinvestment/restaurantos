import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

const SUPABASE_URL   = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERV  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const RESEND_KEY     = process.env.RESEND_API_KEY ?? "";
const APP_URL        = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "https://restaurantos.vercel.app";

// Configure VAPID (once per cold start)
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:alertas@restaurantos.app",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

type Severity = "info" | "warning" | "danger" | "success";

interface NewAlert {
  user_id: string;
  type: string;
  title: string;
  body: string;
  severity: Severity;
  related_invoice_id?: string;
}

function money(n: number) {
  return new Intl.NumberFormat("es-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0,
  }).format(n);
}

async function sendConsolidatedEmail(
  to: string,
  alerts: NewAlert[]
) {
  if (!RESEND_KEY || alerts.length === 0) return;

  const hasDanger  = alerts.some(a => a.severity === "danger");
  const subject    = alerts.length === 1
    ? `${hasDanger ? "⚠️" : "🔔"} ${alerts[0].title}`
    : `${hasDanger ? "⚠️" : "🔔"} ${alerts.length} alertas financieras — RestaurantOS`;

  const rows = alerts.map(a => {
    const dot = a.severity === "danger" ? "#ff4d6d" : a.severity === "warning" ? "#ffb84d" : "#3d8bff";
    return `<tr>
      <td style="padding:12px 0;border-bottom:1px solid rgba(125,165,255,0.08);">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${dot};margin-right:10px;vertical-align:middle;"></span>
        <strong style="color:#e8edf2;font-size:14px;">${a.title}</strong><br>
        <span style="color:#9fb0c0;font-size:13px;margin-left:18px;">${a.body}</span>
      </td>
    </tr>`;
  }).join("");

  const html = `<!DOCTYPE html><html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#070c1a;font-family:Arial,sans-serif;">
<div style="max-width:560px;margin:40px auto;background:#0c1426;border-radius:16px;overflow:hidden;border:1px solid rgba(125,165,255,0.12);">
  <div style="padding:24px 32px;background:rgba(20,32,60,0.95);border-bottom:1px solid rgba(125,165,255,0.10);">
    <span style="color:#e8edf2;font-size:18px;font-weight:700;">💼 CashFlow AI</span>
    <span style="color:#9fb0c0;font-size:12px;margin-left:8px;">RestaurantOS</span>
  </div>
  <div style="padding:32px;">
    <h2 style="color:#e8edf2;font-size:20px;font-weight:700;margin:0 0 8px;">${subject.replace(/^[^\s]+ /, "")}</h2>
    <p style="color:#9fb0c0;font-size:14px;margin:0 0 24px;">Resumen de alertas financieras de hoy</p>
    <table style="width:100%;border-collapse:collapse;">${rows}</table>
    <div style="margin-top:28px;">
      <a href="${APP_URL}/dashboard"
        style="display:inline-block;padding:12px 24px;background:linear-gradient(150deg,#3d8bff,#1f5fe0);color:#fff;font-size:14px;font-weight:600;border-radius:10px;text-decoration:none;">
        Ver Dashboard →
      </a>
    </div>
  </div>
  <div style="padding:20px 32px;border-top:1px solid rgba(125,165,255,0.08);text-align:center;">
    <p style="color:#5f6b7a;font-size:12px;margin:0;">RestaurantOS · Tu CFO financiero virtual</p>
  </div>
</div>
</body></html>`;

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "RestaurantOS <onboarding@resend.dev>", to: [to], subject, html }),
  });
  if (!r.ok) console.error("[check-alerts] Resend error:", await r.text());
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!SUPABASE_URL || !SUPABASE_SERV) return res.status(500).json({ error: "Missing env vars" });

  const { accessToken } = req.body ?? {};
  if (!accessToken) return res.status(400).json({ error: "Falta accessToken" });

  const admin = createClient(SUPABASE_URL, SUPABASE_SERV);
  const { data: { user }, error: authErr } = await admin.auth.getUser(accessToken);
  if (authErr || !user) return res.status(401).json({ error: "No autorizado" });

  const userId    = user.id;
  const userEmail = user.email!;
  const now       = new Date();
  const today     = now.toISOString().split("T")[0];
  const firstOfMonth     = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];
  const lastOfLastMonth  = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0];

  const { data: prefs } = await admin
    .from("notification_preferences")
    .select("days_before_due, email_enabled")
    .eq("user_id", userId)
    .maybeSingle();

  const daysBefore   = prefs?.days_before_due ?? 3;
  const emailEnabled = prefs?.email_enabled ?? true;
  const dueSoon      = new Date(now.getTime() + daysBefore * 86_400_000).toISOString().split("T")[0];
  const in30         = new Date(now.getTime() + 30 * 86_400_000).toISOString().split("T")[0];

  const [
    { data: accounts },
    { data: movements },
    { data: overdueInvs },
    { data: upcomingInvs },
    { data: next30Invs },
    { data: existingToday },
  ] = await Promise.all([
    admin.from("cash_accounts").select("starting_balance").eq("user_id", userId),
    admin.from("cash_movements").select("type,amount,occurred_at,category").eq("user_id", userId),
    admin.from("invoices")
      .select("id,total_amount,due_date,suppliers(name)")
      .eq("user_id", userId)
      .lt("due_date", today)
      .not("status", "in", '("paid","void")'),
    admin.from("invoices")
      .select("id,total_amount,due_date,suppliers(name)")
      .eq("user_id", userId)
      .gte("due_date", today)
      .lte("due_date", dueSoon)
      .not("status", "in", '("paid","void")'),
    admin.from("invoices")
      .select("total_amount")
      .eq("user_id", userId)
      .gte("due_date", today)
      .lte("due_date", in30)
      .not("status", "in", '("paid","void")'),
    admin.from("notifications")
      .select("type,related_invoice_id")
      .eq("user_id", userId)
      .gte("created_at", today + "T00:00:00"),
  ]);

  const existingSet = new Set(
    (existingToday ?? []).map((n: any) => `${n.type}:${n.related_invoice_id ?? "none"}`)
  );

  const toInsert: NewAlert[] = [];

  // ── Alert 1: Overdue invoices ──────────────────────────────────────────────
  for (const inv of overdueInvs ?? []) {
    const key = `vencida:${inv.id}`;
    if (existingSet.has(key)) continue;
    const supplier = Array.isArray(inv.suppliers)
      ? inv.suppliers[0]?.name ?? "Proveedor"
      : (inv.suppliers as any)?.name ?? "Proveedor";
    const days  = Math.round((now.getTime() - new Date(inv.due_date + "T00:00:00").getTime()) / 86_400_000);
    toInsert.push({
      user_id: userId, type: "vencida", severity: "danger",
      related_invoice_id: inv.id,
      title: `Factura vencida — ${supplier}`,
      body:  `${money(Number(inv.total_amount))} · venció hace ${days} día${days !== 1 ? "s" : ""}`,
    });
  }

  // ── Alert 2: Upcoming due ──────────────────────────────────────────────────
  for (const inv of upcomingInvs ?? []) {
    const key = `por_vencer:${inv.id}`;
    if (existingSet.has(key)) continue;
    const supplier = Array.isArray(inv.suppliers)
      ? inv.suppliers[0]?.name ?? "Proveedor"
      : (inv.suppliers as any)?.name ?? "Proveedor";
    const dLeft = Math.round((new Date(inv.due_date + "T00:00:00").getTime() - now.getTime()) / 86_400_000);
    toInsert.push({
      user_id: userId, type: "por_vencer", severity: "warning",
      related_invoice_id: inv.id,
      title: `Factura por vencer — ${supplier}`,
      body:  `${money(Number(inv.total_amount))} · vence en ${dLeft} día${dLeft !== 1 ? "s" : ""}`,
    });
  }

  // ── Alert 3: Cost spike >15% vs prior month ────────────────────────────────
  if (!existingSet.has("aumento_costos:none")) {
    const allMov  = movements ?? [];
    const thisExp = allMov.filter(m => m.type === "expense" && m.occurred_at >= firstOfMonth && m.occurred_at <= today);
    const lastExp = allMov.filter(m => m.type === "expense" && m.occurred_at >= firstOfLastMonth && m.occurred_at <= lastOfLastMonth);
    const sumCat  = (arr: typeof allMov) =>
      arr.reduce<Record<string, number>>((acc, m) => {
        const c = m.category ?? "Sin categoría"; acc[c] = (acc[c] ?? 0) + Number(m.amount); return acc;
      }, {});
    const thisMap = sumCat(thisExp);
    const lastMap = sumCat(lastExp);
    for (const [cat, thisAmt] of Object.entries(thisMap)) {
      const lastAmt = lastMap[cat];
      if (!lastAmt || thisAmt <= lastAmt * 1.15) continue;
      const pct = Math.round((thisAmt / lastAmt - 1) * 100);
      toInsert.push({
        user_id: userId, type: "aumento_costos", severity: "warning",
        title: `Aumento de costos — ${cat}`,
        body:  `${money(thisAmt)} este mes vs ${money(lastAmt)} mes anterior (+${pct}%)`,
      });
      break; // one cost-spike alert per run
    }
  }

  // ── Alert 4: Liquidity risk ────────────────────────────────────────────────
  if (!existingSet.has("riesgo_liquidez:none")) {
    const allMov = movements ?? [];
    const base   = (accounts ?? []).reduce((s, a) => s + Number(a.starting_balance), 0);
    const netFlow = allMov.reduce((s, m) => s + (m.type === "income" ? Number(m.amount) : -Number(m.amount)), 0);
    const balance  = base + netFlow;
    const pending30 = (next30Invs ?? []).reduce((s, i) => s + Number(i.total_amount), 0);
    const projected = balance - pending30;

    if (projected < 0) {
      toInsert.push({
        user_id: userId, type: "riesgo_liquidez", severity: "danger",
        title: "Riesgo de liquidez",
        body:  `Proyección a 30 días: ${money(projected)} (saldo ${money(balance)} − facturas ${money(pending30)})`,
      });
    } else if (pending30 > 0) {
      toInsert.push({
        user_id: userId, type: "riesgo_liquidez", severity: "success",
        title: "Caja bajo control",
        body:  `Proyección a 30 días: ${money(projected)} tras cubrir ${money(pending30)} en facturas`,
      });
    }
  }

  if (toInsert.length > 0) {
    const { error: insertErr } = await admin.from("notifications").insert(toInsert);
    if (insertErr) console.error("[check-alerts] insert:", insertErr.message);
  }

  // Send ONE consolidated email for all warning/danger alerts
  const urgent = toInsert.filter(a => a.severity === "danger" || a.severity === "warning");
  if (emailEnabled && urgent.length > 0) {
    await sendConsolidatedEmail(userEmail, urgent).catch(console.error);
  }

  // Send push notification to all registered subscriptions
  if (toInsert.length > 0 && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    const { data: pushSubs } = await admin
      .from("push_subscriptions")
      .select("id, subscription")
      .eq("user_id", userId);

    if (pushSubs && pushSubs.length > 0) {
      const pushTitle = toInsert.length === 1
        ? toInsert[0].title
        : `${toInsert.length} nuevas alertas financieras`;
      const pushBody = toInsert.length === 1
        ? toInsert[0].body
        : urgent.length > 0
          ? `${urgent.filter(a => a.severity === "danger").length} crítica(s), ${urgent.filter(a => a.severity === "warning").length} advertencia(s)`
          : toInsert[0].body;

      const payload = JSON.stringify({ title: pushTitle, body: pushBody, type: toInsert[0].type });

      for (const row of pushSubs) {
        await webpush.sendNotification(row.subscription as webpush.PushSubscription, payload)
          .catch(async (err: any) => {
            if (err.statusCode === 410) {
              // Subscription expired — remove it
              await admin.from("push_subscriptions").delete().eq("id", row.id);
            } else {
              console.error("[check-alerts] push error:", err.message);
            }
          });
      }
    }
  }

  return res.status(200).json({ ok: true, created: toInsert.length });
}
