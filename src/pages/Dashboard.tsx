import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useProfile } from "../hooks/useProfile";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from "recharts";
import { ScanLine, AlertCircle, TrendingDown, Info, CheckCircle } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";
import i18n from "../i18n/config";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number, cur = "USD") {
  return new Intl.NumberFormat("es-US", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);
}

function greetingKey(): "dashboard.greeting.morning" | "dashboard.greeting.afternoon" | "dashboard.greeting.evening" {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "dashboard.greeting.morning";
  if (h >= 12 && h < 19) return "dashboard.greeting.afternoon";
  return "dashboard.greeting.evening";
}

function todayLabel(lang: string): string {
  const locale = lang.startsWith("en") ? "en-US" : "es-US";
  return new Date().toLocaleDateString(locale, {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

const GLASS = {
  background: "linear-gradient(180deg,rgba(20,32,60,0.55),rgba(9,14,30,0.55))",
  backdropFilter: "blur(20px) saturate(140%)",
  border: "1px solid rgba(125,165,255,0.12)",
} as const;

const TOOLTIP_STYLE = {
  contentStyle: {
    background: "#0c1426",
    border: "1px solid rgba(125,165,255,0.20)",
    borderRadius: 10,
    color: "#e8edf2",
    fontSize: 12,
  },
  cursor: { fill: "rgba(61,139,255,0.06)" },
};

// ── Master query ──────────────────────────────────────────────────────────────

function useDashboardData(userId: string, lang: string) {
  return useQuery({
    queryKey: ["dashboard-data", userId, lang],
    queryFn: async () => {
      const months = i18n.t("common.months", { returnObjects: true }) as string[];
      const now   = new Date();
      const today = now.toISOString().split("T")[0];
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const in30  = new Date(now.getTime() + 30 * 86_400_000).toISOString().split("T")[0];

      const sixAgo = new Date(now);
      sixAgo.setMonth(sixAgo.getMonth() - 6);
      sixAgo.setDate(1);
      const sixAgoStr = sixAgo.toISOString().split("T")[0];

      const [
        { data: accounts },
        { data: movements },
        { data: invoices },
      ] = await Promise.all([
        supabase.from("cash_accounts").select("starting_balance,currency").eq("user_id", userId),
        supabase.from("cash_movements").select("type,amount,occurred_at,category").eq("user_id", userId),
        supabase.from("invoices")
          .select("id,total_amount,due_date,status")
          .eq("user_id", userId)
          .not("status", "eq", "paid")
          .not("status", "eq", "void"),
      ]);

      const all  = movements ?? [];
      const invs = invoices ?? [];

      // ── Balance ──
      const base = (accounts ?? []).reduce((s, a) => s + Number(a.starting_balance), 0);
      const net  = all.reduce((s, m) => s + (m.type === "income" ? Number(m.amount) : -Number(m.amount)), 0);
      const balance  = base + net;
      const currency = (accounts ?? [])[0]?.currency ?? "USD";

      // ── KPIs ──
      const monthMov     = all.filter(m => m.occurred_at >= firstOfMonth && m.occurred_at <= today);
      const monthExpense = monthMov.filter(m => m.type === "expense").reduce((s, m) => s + Number(m.amount), 0);

      const pending = invs;
      const overdue = invs.filter(i => i.due_date && i.due_date < today);
      const totalPending = pending.reduce((s, i) => s + Number(i.total_amount), 0);
      const totalOverdue = overdue.reduce((s, i) => s + Number(i.total_amount), 0);

      // ── 6-month chart ──
      const monthMap: Record<string, { income: number; expense: number }> = {};
      for (const m of all.filter(mv => mv.occurred_at >= sixAgoStr)) {
        const key = m.occurred_at.slice(0, 7);
        if (!monthMap[key]) monthMap[key] = { income: 0, expense: 0 };
        monthMap[key][m.type === "income" ? "income" : "expense"] += Number(m.amount);
      }
      const sixMonthChart = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now);
        d.setMonth(d.getMonth() - (5 - i));
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        return { month: months[d.getMonth()], income: monthMap[key]?.income ?? 0, expense: monthMap[key]?.expense ?? 0 };
      });

      // ── Category chart (current month expenses) ──
      const catMap: Record<string, number> = {};
      for (const m of monthMov.filter(m => m.type === "expense")) {
        const cat = m.category || "__NO_CAT__";
        catMap[cat] = (catMap[cat] ?? 0) + Number(m.amount);
      }
      const categoryData = Object.entries(catMap)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 6);
      const maxCat = Math.max(...categoryData.map(c => c.amount), 1);

      // ── 30-day projection ──
      const dueMap: Record<string, number> = {};
      for (const inv of invs) {
        if (inv.due_date && inv.due_date >= today && inv.due_date <= in30) {
          dueMap[inv.due_date] = (dueMap[inv.due_date] ?? 0) + Number(inv.total_amount);
        }
      }

      let runBal = balance;
      const projLine: { label: string; balance: number }[] = [];
      for (let i = 0; i <= 30; i++) {
        const d = new Date(now); d.setDate(d.getDate() + i);
        const ds = d.toISOString().split("T")[0];
        if (i > 0) runBal -= (dueMap[ds] ?? 0);
        if (i === 0 || i === 7 || i === 14 || i === 21 || i === 30 || dueMap[ds]) {
          projLine.push({
            label: i === 0 ? "__TODAY__" : `+${i}d`,
            balance: Math.round(runBal * 100) / 100,
          });
        }
      }

      // Milestone balances
      let b7 = balance, b15 = balance, b30 = balance;
      for (const [ds, amt] of Object.entries(dueMap)) {
        const diff = Math.round((new Date(ds + "T00:00:00").getTime() - new Date(today + "T00:00:00").getTime()) / 86_400_000);
        if (diff <= 7)  b7  -= amt;
        if (diff <= 15) b15 -= amt;
        if (diff <= 30) b30 -= amt;
      }

      return {
        balance, currency,
        monthExpense,
        pendingCount: pending.length, totalPending,
        overdueCount: overdue.length, totalOverdue,
        sixMonthChart, categoryData, maxCat,
        projLine, b7, b15, b30,
        hasMovements: all.length > 0,
        hasInvoices:  invs.length > 0,
      };
    },
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate  = useNavigate();
  const { t, i18n } = useTranslation();
  const session   = useAuthStore((s) => s.session!);
  const userId    = session.user.id;
  const userName  = (session.user.user_metadata?.full_name as string | undefined)
    ?? (session.user.user_metadata?.name as string | undefined)
    ?? session.user.email?.split("@")[0]
    ?? "Chef";

  const { data: profile } = useProfile(userId);
  const firstName = profile?.full_name?.trim().split(/\s+/)[0]
    ?? userName.split(/\s+/)[0];

  const { data, isLoading, error } = useDashboardData(userId, i18n.language);

  return (
    <div className="space-y-6">
      {/* ── Greeting row ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display font-semibold text-2xl text-text">
            {t(greetingKey())}, {firstName}
          </h1>
          <p className="text-text-muted text-sm mt-1 capitalize">{todayLabel(i18n.language)}</p>
        </div>
        <button
          onClick={() => navigate("/captura")}
          className="flex items-center gap-2 h-9 px-4 rounded-lg font-semibold text-sm text-white flex-shrink-0"
          style={{ background: "linear-gradient(150deg,#3d8bff,#1f5fe0)", boxShadow: "0 4px 16px rgba(61,139,255,0.35)" }}
        >
          <ScanLine size={15} /> {t("dashboard.scanInvoice")}
        </button>
      </div>

      {/* ── 4 KPI cards ── */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          label={t("dashboard.kpi.balance")}
          loading={isLoading}
          error={!!error}
          value={data ? fmt(data.balance, data.currency) : null}
          hint={data ? (data.balance < 0 ? t("dashboard.hint.negativeBalance") : t("dashboard.hint.cashBalance")) : undefined}
          accent={data && data.balance < 0 ? "danger" : "brand"}
          empty={data && !data.hasMovements}
          emptyHint={t("dashboard.hint.noMovements")}
        />
        <KpiCard
          label={t("dashboard.kpi.pending")}
          loading={isLoading}
          error={!!error}
          value={data && data.pendingCount > 0 ? fmt(data.totalPending) : null}
          hint={data ? (data.pendingCount > 0
            ? t("dashboard.hint.invoiceCount", { count: data.pendingCount })
            : t("dashboard.hint.upToDate")) : undefined}
          accent="brand"
          empty={data && data.pendingCount === 0}
          emptyHint={t("dashboard.hint.upToDate")}
        />
        <KpiCard
          label={t("dashboard.kpi.overdue")}
          loading={isLoading}
          error={!!error}
          value={data && data.overdueCount > 0 ? fmt(data.totalOverdue) : null}
          hint={data ? (data.overdueCount > 0
            ? t("dashboard.hint.overdueCount", { count: data.overdueCount })
            : t("dashboard.hint.noOverdue")) : undefined}
          accent={data && data.overdueCount > 0 ? "danger" : "brand"}
          empty={data && data.overdueCount === 0}
          emptyHint={t("dashboard.hint.noOverdue")}
        />
        <KpiCard
          label={t("dashboard.kpi.expenses")}
          loading={isLoading}
          error={!!error}
          value={data && data.monthExpense > 0 ? fmt(data.monthExpense) : null}
          hint={data ? (data.monthExpense > 0 ? t("dashboard.hint.thisMonth") : t("dashboard.hint.noExpenses")) : undefined}
          accent="danger"
          empty={data && data.monthExpense === 0}
          emptyHint={t("dashboard.hint.noExpenses")}
        />
      </div>

      {/* ── Charts row ── */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
        {/* Income vs Expenses */}
        <div className="rounded-2xl p-6" style={GLASS}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-semibold text-sm text-text">{t("dashboard.charts.incomeVsExpenses")}</h2>
            <div className="flex items-center gap-4">
              <Legend color="#3d8bff" label={t("dashboard.charts.income")} />
              <Legend color="#ff4d6d" label={t("dashboard.charts.expenses")} />
            </div>
          </div>

          {data && !data.hasMovements ? (
            <EmptyChart label={t("dashboard.charts.noMovements6m")} />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data?.sixMonthChart ?? []} barGap={3} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(125,165,255,0.07)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "#5f6b7a", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v: number) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`}
                  tick={{ fill: "#5f6b7a", fontSize: 11 }} axisLine={false} tickLine={false} width={42} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [fmt(v)]} />
                <Bar dataKey="income" name={t("dashboard.charts.income")} fill="#3d8bff" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="expense" name={t("dashboard.charts.expenses")} fill="#ff4d6d" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Expenses by category */}
        <div className="rounded-2xl p-6" style={GLASS}>
          <h2 className="font-display font-semibold text-sm text-text mb-5">{t("dashboard.charts.expensesByCategory")}</h2>
          {!isLoading && data?.categoryData.length === 0 ? (
            <EmptyChart label={t("dashboard.charts.noExpensesMonth")} />
          ) : (
            <div className="space-y-3">
              {(data?.categoryData ?? Array(4).fill(null)).map((cat, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-text-dim text-xs truncate max-w-[55%]">
                      {cat ? (cat.name === "__NO_CAT__" ? t("dashboard.charts.noCategory") : cat.name)
                        : <span className="inline-block w-20 h-3 rounded bg-elevated animate-pulse" />}
                    </span>
                    <span className="text-text text-xs font-semibold">
                      {cat ? fmt(cat.amount) : <span className="inline-block w-12 h-3 rounded bg-elevated animate-pulse" />}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(27,39,66,0.80)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: cat ? `${(cat.amount / (data?.maxCat ?? 1)) * 100}%` : "0%",
                        background: `linear-gradient(90deg,#3d8bff,#00d4ff)`,
                        boxShadow: "0 0 8px rgba(61,139,255,0.5)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Projected cash flow (60%) + Alertas (40%) ── */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "3fr 2fr" }}>
        {/* Left: projected cash flow */}
        <div className="rounded-2xl p-6" style={GLASS}>
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="font-display font-semibold text-sm text-text">{t("dashboard.cashflow.title")}</h2>
              <p className="text-text-dim text-xs mt-0.5">{t("dashboard.cashflow.subtitle")}</p>
            </div>
            {data && data.b30 < 0 && (
              <div className="flex items-center gap-1.5 text-danger text-xs font-medium flex-shrink-0"
                style={{ background: "rgba(255,77,109,0.10)", border: "1px solid rgba(255,77,109,0.20)", borderRadius: 8, padding: "4px 10px" }}>
                <AlertCircle size={12} /> {t("dashboard.cashflow.negativeAlert")}
              </div>
            )}
          </div>

          {/* Milestone cards */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {([
              { labelKey: "dashboard.cashflow.in7days",  val: data?.b7  },
              { labelKey: "dashboard.cashflow.in15days", val: data?.b15 },
              { labelKey: "dashboard.cashflow.in30days", val: data?.b30 },
            ] as const).map(({ labelKey, val }) => (
              <div key={labelKey} className="rounded-xl p-4 text-center"
                style={{ background: "rgba(27,39,66,0.50)", border: "1px solid rgba(125,165,255,0.08)" }}>
                <div className="text-text-faint text-[10px] uppercase tracking-wider font-medium mb-1">{t(labelKey)}</div>
                {isLoading ? (
                  <div className="h-6 w-20 mx-auto rounded bg-elevated animate-pulse" />
                ) : (
                  <div className="font-display font-bold text-lg leading-none"
                    style={{ color: (val ?? 0) < 0 ? "#ff4d6d" : "#3d8bff" }}>
                    {val !== undefined ? fmt(val, data?.currency) : "—"}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Area chart */}
          {data && !data.hasInvoices ? (
            <EmptyChart label={t("dashboard.cashflow.noInvoicesToProject")} height={140} />
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={data?.projLine ?? []}>
                <defs>
                  <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3d8bff" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#3d8bff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(125,165,255,0.07)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#5f6b7a", fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={(v: string) => v === "__TODAY__" ? t("dashboard.cashflow.today") : v}
                />
                <YAxis tickFormatter={(v: number) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`}
                  tick={{ fill: "#5f6b7a", fontSize: 10 }} axisLine={false} tickLine={false} width={42} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [fmt(v), t("dashboard.cashflow.projectedBalance")]} />
                <Area type="monotone" dataKey="balance" name={t("dashboard.cashflow.projectedBalance")}
                  stroke="#3d8bff" strokeWidth={2} fill="url(#projGrad)" dot={{ fill: "#3d8bff", r: 3, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Right: alerts */}
        <AlertsWidget userId={userId} />
      </div>

      {/* ── Upcoming invoices quick list ── */}
      {data && data.pendingCount > 0 && (
        <UpcomingInvoices userId={userId} />
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ label, loading, error, value, hint, accent, empty, emptyHint }: {
  label: string; loading: boolean; error: boolean;
  value: string | null; hint?: string;
  accent: "brand" | "danger";
  empty?: boolean; emptyHint?: string;
}) {
  const { t } = useTranslation();
  const color = accent === "brand" ? "#3d8bff" : "#ff4d6d";
  return (
    <div className="rounded-2xl p-5" style={GLASS}>
      <div className="text-text-faint text-[10px] uppercase tracking-widest font-medium mb-3">{label}</div>
      {loading && <div className="w-5 h-5 rounded-full border-2 border-brand border-t-transparent animate-spin mb-2" />}
      {error   && <div className="text-danger text-sm font-medium mb-2">{t("common.error")}</div>}
      {!loading && !error && (
        empty
          ? <div className="font-display font-bold text-2xl leading-none mb-1.5 text-text-faint">—</div>
          : <div className="font-display font-bold text-2xl leading-none mb-1.5" style={{ color }}>{value ?? "—"}</div>
      )}
      <div className="text-text-dim text-xs">{empty ? emptyHint : hint}</div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
      <span className="text-text-dim text-xs">{label}</span>
    </div>
  );
}

function EmptyChart({ label, height = 200 }: { label: string; height?: number }) {
  return (
    <div className="flex flex-col items-center justify-center text-text-faint text-xs gap-2 rounded-xl"
      style={{ height, background: "rgba(27,39,66,0.25)" }}>
      <TrendingDown size={20} className="opacity-30" />
      {label}
    </div>
  );
}

function AlertsWidget({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const session = useAuthStore((s) => s.session);

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["alerts-panel", userId],
    queryFn: async () => {
      const { data: existing } = await supabase
        .from("notifications")
        .select("id,title,body,severity,read,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (existing && existing.length > 0) return existing;

      const token = session?.access_token;
      if (!token) return [];
      await fetch("/api/check-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: token }),
      }).catch(console.error);

      const { data: fresh } = await supabase
        .from("notifications")
        .select("id,title,body,severity,read,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);
      return fresh ?? [];
    },
    staleTime: 30_000,
  });

  const colorOf = (sev: string) =>
    ({ danger: "#ff4d6d", warning: "#ffb84d", success: "#10b981", info: "#3d8bff" }[sev] ?? "#3d8bff");

  const iconOf = (sev: string) => {
    const c = colorOf(sev);
    if (sev === "danger" || sev === "warning") return <AlertCircle size={14} style={{ color: c }} />;
    if (sev === "success") return <CheckCircle size={14} style={{ color: c }} />;
    return <Info size={14} style={{ color: c }} />;
  };

  const newCount = alerts.filter((a: any) => !a.read).length;
  const hasUrgent = alerts.some((a: any) => a.severity === "danger");

  return (
    <div className="rounded-2xl p-5 flex flex-col" style={GLASS}>
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h2 className="font-display font-semibold text-sm text-text">{t("dashboard.alerts.title")}</h2>
        {newCount > 0 && (
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: hasUrgent ? "rgba(255,77,109,0.14)" : "rgba(255,184,77,0.14)",
              color: hasUrgent ? "#ff4d6d" : "#ffb84d",
              border: `1px solid ${hasUrgent ? "rgba(255,77,109,0.25)" : "rgba(255,184,77,0.25)"}`,
            }}
          >
            {t("dashboard.alerts.new", { count: newCount })}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex-1 flex flex-col gap-2.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-[62px] rounded-xl animate-pulse" style={{ background: "rgba(27,39,66,0.4)" }} />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-4">
          <CheckCircle size={26} style={{ color: "#10b981", opacity: 0.35 }} />
          <p className="text-text-dim text-sm font-medium">{t("dashboard.alerts.allClear")}</p>
          <p className="text-text-faint text-xs leading-relaxed max-w-[160px]">
            {t("dashboard.alerts.noAlerts")}
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: 320 }}>
          {alerts.map((a: any) => {
            const color = colorOf(a.severity);
            return (
              <div
                key={a.id}
                className="flex items-start gap-3 rounded-xl px-3.5 py-3 flex-shrink-0"
                style={{ background: color + "0c", border: `1px solid ${color}1e`, opacity: a.read ? 0.6 : 1 }}
              >
                <div className="w-[26px] h-[26px] rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: color + "18" }}>
                  {iconOf(a.severity)}
                </div>
                <div className="min-w-0">
                  <p className="text-text text-[12.5px] font-semibold leading-snug">{a.title}</p>
                  <p className="text-text-dim text-[11px] mt-0.5 leading-relaxed">{a.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function UpcomingInvoices({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ["upcoming-invoices", userId],
    queryFn: async () => {
      const in30  = new Date(Date.now() + 30 * 86_400_000).toISOString().split("T")[0];
      const { data } = await supabase
        .from("invoices")
        .select("id,invoice_number,due_date,total_amount,currency,suppliers(name)")
        .eq("user_id", userId)
        .not("status", "eq", "paid")
        .not("status", "eq", "void")
        .lte("due_date", in30)
        .order("due_date")
        .limit(5);
      return data ?? [];
    },
  });

  if (isLoading || !data?.length) return null;

  return (
    <div className="rounded-2xl p-6" style={GLASS}>
      <h2 className="font-display font-semibold text-sm text-text mb-4">{t("dashboard.upcoming.title")}</h2>
      <div className="space-y-2">
        {data.map((inv: any) => {
          const days = inv.due_date
            ? Math.round((new Date(inv.due_date + "T00:00:00").getTime() - new Date().setHours(0,0,0,0)) / 86_400_000)
            : null;
          const rawName = !inv.suppliers ? ""
            : Array.isArray(inv.suppliers) ? inv.suppliers[0]?.name ?? ""
            : inv.suppliers.name;
          const name = rawName || t("dashboard.upcoming.supplier");
          const isOverdue = days !== null && days < 0;
          const isUrgent  = days !== null && days >= 0 && days <= 3;
          const badgeColor = isOverdue ? "#ff4d6d" : isUrgent ? "#ffb84d" : "#9fb0c0";
          const badgeBg    = isOverdue ? "rgba(255,77,109,0.12)" : isUrgent ? "rgba(255,184,77,0.10)" : "rgba(125,165,255,0.08)";

          const dayLabel = days === null ? "—"
            : days < 0 ? t("dashboard.upcoming.overdueN", { count: Math.abs(days) })
            : days === 0 ? t("dashboard.upcoming.today")
            : t("dashboard.upcoming.inN", { count: days });

          return (
            <div key={inv.id} className="flex items-center justify-between rounded-xl px-4 py-3"
              style={{ background: "rgba(27,39,66,0.40)" }}>
              <div className="min-w-0">
                <div className="text-text text-sm font-medium truncate">{name}</div>
                {inv.invoice_number && <div className="text-text-faint text-xs">#{inv.invoice_number}</div>}
              </div>
              <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                <span className="font-display font-semibold text-sm text-text">
                  {fmt(inv.total_amount, inv.currency)}
                </span>
                <span className="text-xs font-medium rounded-md px-2 py-0.5"
                  style={{ background: badgeBg, color: badgeColor }}>
                  {dayLabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
