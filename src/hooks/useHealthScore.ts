import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export type HealthResult = {
  score: number;
  label: "Saludable" | "Atención" | "En riesgo";
  color: string;
  barStyle: React.CSSProperties;
  hint: string;
  hasData: boolean;
};

export function useHealthScore(userId: string) {
  return useQuery<HealthResult | null>({
    queryKey: ["health-score", userId],
    queryFn: async () => {
      if (!userId) return null;

      const now  = new Date();
      const today = now.toISOString().split("T")[0];
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString().split("T")[0];
      const in30 = new Date(now.getTime() + 30 * 86_400_000)
        .toISOString().split("T")[0];

      const [
        { data: accounts },
        { data: movements },
        { data: invoices },
      ] = await Promise.all([
        supabase.from("cash_accounts").select("starting_balance").eq("user_id", userId),
        supabase.from("cash_movements").select("type,amount,occurred_at").eq("user_id", userId),
        supabase
          .from("invoices")
          .select("total_amount,due_date")
          .eq("user_id", userId)
          .not("status", "in", '("paid","void")'),
      ]);

      const allMov  = movements ?? [];
      const allInvs = invoices  ?? [];
      const hasData = allMov.length > 0 || allInvs.length > 0;

      if (!hasData) return null;

      // ── Balance ──────────────────────────────────────────────────────────────
      const base    = (accounts ?? []).reduce((s, a) => s + Number(a.starting_balance), 0);
      const net     = allMov.reduce((s, m) => s + (m.type === "income" ? 1 : -1) * Number(m.amount), 0);
      const balance = base + net;

      // ── Upcoming 30d & overdue ───────────────────────────────────────────────
      const overdueInvs  = allInvs.filter(i => i.due_date && i.due_date < today);
      const overdueCount = overdueInvs.length;
      const totalOverdue = overdueInvs.reduce((s, i) => s + Number(i.total_amount), 0);

      const upcoming30 = allInvs
        .filter(i => i.due_date && i.due_date >= today && i.due_date <= in30)
        .reduce((s, i) => s + Number(i.total_amount), 0);

      // ── Monthly movements ────────────────────────────────────────────────────
      const monthMov     = allMov.filter(m => m.occurred_at >= firstOfMonth);
      const monthIncome  = monthMov.filter(m => m.type === "income").reduce((s, m) => s + Number(m.amount), 0);
      const monthExpense = monthMov.filter(m => m.type !== "income").reduce((s, m) => s + Number(m.amount), 0);

      // ── Component 1: Liquidez (0–50 pts) ────────────────────────────────────
      // Full score at ratio ≥ 3× — balance covers 3× the next 30d obligations
      const liqRatio = balance > 0 && upcoming30 > 0 ? balance / upcoming30 : balance > 0 ? Infinity : 0;
      const liq = balance <= 0 ? 0
        : upcoming30 === 0 ? 50
        : Math.min(50, (liqRatio / 3) * 50);

      // ── Component 2: Facturas vencidas (0–30 pts) ────────────────────────────
      // Proportional penalty: overdue/balance. At <5% of balance the hit is tiny.
      const overdueRatio = balance > 0 ? totalOverdue / balance : (totalOverdue > 0 ? 1 : 0);
      const ov = 30 * Math.max(0, 1 - Math.min(1, overdueRatio * 2));

      // ── Component 3: Tendencia mensual (0–20 pts) ────────────────────────────
      let trend: number;
      if (monthIncome === 0 && monthExpense === 0) {
        trend = 10; // neutral, no movements this month
      } else if (monthIncome === 0) {
        // Only expenses recorded — judge against cash on hand, not income
        const expBal = balance > 0 ? monthExpense / balance : 1;
        if (expBal < 0.05)      trend = 18;
        else if (expBal < 0.15) trend = 14;
        else if (expBal < 0.30) trend = 10;
        else                    trend = Math.max(0, 20 * (1 - expBal));
      } else {
        // Penalize when expense/income ratio exceeds 0.8 (spending >80% of income)
        const r = monthExpense / monthIncome;
        trend = Math.max(0, Math.min(20, 20 - Math.max(0, r - 0.8) * 10));
      }

      const score = Math.round(Math.min(100, Math.max(0, liq + ov + trend)));

      // ── Label & color ────────────────────────────────────────────────────────
      const label  = score >= 70 ? "Saludable" : score >= 40 ? "Atención" : "En riesgo";
      const color  = score >= 70 ? "#00d4ff"   : score >= 40 ? "#ffb84d"  : "#ff4d6d";
      const barStyle: React.CSSProperties = score >= 70
        ? { background: "linear-gradient(90deg,#3d8bff,#00d4ff)", boxShadow: "0 0 8px rgba(0,212,255,0.4)" }
        : score >= 40
          ? { background: "#ffb84d" }
          : { background: "#ff4d6d" };

      // ── Explanatory hint ─────────────────────────────────────────────────────
      const parts: string[] = [];

      if (balance <= 0) {
        parts.push("Saldo negativo");
      } else if (upcoming30 === 0 || liqRatio >= 5) {
        parts.push("Liquidez excelente");
      } else if (liqRatio >= 3) {
        parts.push("Liquidez muy buena");
      } else if (liqRatio >= 1.5) {
        parts.push("Liquidez buena");
      } else if (liqRatio >= 1) {
        parts.push("Liquidez ajustada");
      } else {
        parts.push("Liquidez crítica");
      }

      if (overdueCount > 0) {
        const pl = overdueCount > 1;
        if (overdueRatio < 0.05) {
          parts.push(`${overdueCount} factura${pl ? "s" : ""} vencida${pl ? "s" : ""} menor${pl ? "es" : ""}`);
        } else if (overdueRatio < 0.25) {
          parts.push(`${overdueCount} factura${pl ? "s" : ""} vencida${pl ? "s" : ""}`);
        } else {
          parts.push("Facturas vencidas graves");
        }
      }

      if (monthIncome > 0) {
        const r = monthExpense / monthIncome;
        if (r < 0.8)      parts.push("Gastos controlados");
        else if (r > 1.5) parts.push("Gastos elevados");
      }

      const hint = parts.join(" · ");

      return { score, label, color, barStyle, hint, hasData };
    },
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });
}
