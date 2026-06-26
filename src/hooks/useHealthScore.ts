import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export type HealthResult = {
  score: number;           // 0-100
  label: "Saludable" | "Atención" | "En riesgo";
  color: string;           // CSS color for text / bar fill
  barStyle: React.CSSProperties; // background for the progress bar
  hasData: boolean;
};

export function useHealthScore(userId: string) {
  return useQuery<HealthResult | null>({
    queryKey: ["health-score", userId],
    queryFn: async () => {
      if (!userId) return null;

      const now   = new Date();
      const today = now.toISOString().split("T")[0];
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString().split("T")[0];
      const in30  = new Date(now.getTime() + 30 * 86_400_000)
        .toISOString().split("T")[0];

      const [
        { data: accounts },
        { data: movements },
        { data: invoices },
      ] = await Promise.all([
        supabase.from("cash_accounts").select("starting_balance").eq("user_id", userId),
        supabase.from("cash_movements").select("type,amount,occurred_at").eq("user_id", userId),
        supabase.from("invoices")
          .select("total_amount,due_date")
          .eq("user_id", userId)
          .not("status", "in", '("paid","void")'),
      ]);

      const allMov  = movements ?? [];
      const allInvs = invoices  ?? [];
      const hasData = allMov.length > 0 || allInvs.length > 0;

      if (!hasData) return null;

      // ── Balance ───────────────────────────────────────────────────────────
      const base    = (accounts ?? []).reduce((s, a) => s + Number(a.starting_balance), 0);
      const net     = allMov.reduce((s, m) => s + (m.type === "income" ? 1 : -1) * Number(m.amount), 0);
      const balance = base + net;

      // ── Upcoming 30 days & overdue ────────────────────────────────────────
      const upcoming30  = allInvs
        .filter(i => i.due_date && i.due_date >= today && i.due_date <= in30)
        .reduce((s, i) => s + Number(i.total_amount), 0);

      const totalOverdue = allInvs
        .filter(i => i.due_date && i.due_date < today)
        .reduce((s, i) => s + Number(i.total_amount), 0);

      // ── Monthly income & expenses ─────────────────────────────────────────
      const monthMov     = allMov.filter(m => m.occurred_at >= firstOfMonth && m.occurred_at <= today);
      const monthIncome  = monthMov.filter(m => m.type === "income").reduce((s, m)  => s + Number(m.amount), 0);
      const monthExpense = monthMov.filter(m => m.type === "expense").reduce((s, m) => s + Number(m.amount), 0);

      // ── Component 1: Liquidity (0-50 pts) ────────────────────────────────
      // Coverage = balance / upcoming30 bills
      let liq: number;
      if (balance <= 0) {
        liq = 0;
      } else if (upcoming30 === 0) {
        liq = 50; // no bills = best
      } else {
        liq = Math.min(50, (balance / upcoming30) * 25);
        // ratio=0 → 0pts | ratio=1 → 25pts | ratio=2 → 50pts
      }

      // ── Component 2: Overdue penalty (0-30 pts) ───────────────────────────
      let ov: number;
      if (totalOverdue === 0) {
        ov = 30;
      } else if (balance <= 0) {
        ov = 0;
      } else {
        ov = Math.max(0, 30 * (1 - Math.min(1, totalOverdue / balance)));
        // overdueRatio=0 → 30pts | =0.5 → 15pts | >=1 → 0pts
      }

      // ── Component 3: Expense trend (0-20 pts) ─────────────────────────────
      let trend: number;
      if (monthIncome === 0 && monthExpense === 0) {
        trend = 10; // neutral
      } else if (monthIncome === 0) {
        trend = 0;
      } else {
        const ratio = monthExpense / monthIncome;
        trend = Math.max(0, 20 - ratio * 10);
        // ratio=0 → 20pts | ratio=1 → 10pts | ratio>=2 → 0pts
      }

      const score = Math.round(Math.min(100, Math.max(0, liq + ov + trend)));

      const label  = score >= 70 ? "Saludable" : score >= 40 ? "Atención" : "En riesgo";
      const color  = score >= 70 ? "#00d4ff"   : score >= 40 ? "#ffb84d"  : "#ff4d6d";
      const barStyle: React.CSSProperties = score >= 70
        ? { background: "linear-gradient(90deg,#3d8bff,#00d4ff)", boxShadow: "0 0 8px rgba(0,212,255,0.4)" }
        : score >= 40
          ? { background: "#ffb84d" }
          : { background: "#ff4d6d" };

      return { score, label, color, barStyle, hasData };
    },
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });
}
