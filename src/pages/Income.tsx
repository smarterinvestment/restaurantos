import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Store, Smartphone, Package, Heart, CalendarDays,
  Banknote, CreditCard, ArrowLeftRight,
  TrendingUp, Trash2, AlertCircle, Pencil, Check, X, Loader2,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";

// ── Types ─────────────────────────────────────────────────────────────────────

type Movement = {
  id: string;
  amount: number;
  currency: string;
  occurred_at: string;
  description: string | null;
  category: string | null;
  method: string | null;
};

type CashAccount = { id: string; starting_balance: number; currency: string };

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { key: "Cierre de caja",       i18nKey: "income.categories.cierre",   icon: Store },
  { key: "Terminal de tarjeta",  i18nKey: "income.categories.terminal", icon: Smartphone },
  { key: "Pedidos a domicilio",  i18nKey: "income.categories.pedidos",  icon: Package },
  { key: "Propinas",             i18nKey: "income.categories.propinas", icon: Heart },
  { key: "Eventos / reservas",   i18nKey: "income.categories.eventos",  icon: CalendarDays },
] as const;

const METHODS = [
  { key: "efectivo",      i18nKey: "income.methods.cash",     icon: Banknote },
  { key: "tarjeta",       i18nKey: "income.methods.card",     icon: CreditCard },
  { key: "transferencia", i18nKey: "income.methods.transfer", icon: ArrowLeftRight },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number, cur = "USD") {
  return new Intl.NumberFormat("es-US", { style: "currency", currency: cur, maximumFractionDigits: 2 }).format(n);
}

function todayStr() { return new Date().toISOString().split("T")[0]; }

const GLASS = {
  background: "linear-gradient(180deg,rgba(20,32,60,0.55),rgba(9,14,30,0.55))",
  backdropFilter: "blur(20px) saturate(140%)",
  border: "1px solid var(--glass-border)",
} as const;

const fieldCls = [
  "h-10 rounded-lg px-3 text-sm text-text w-full",
  "bg-[rgba(27,39,66,0.65)]",
  "border border-[rgba(125,165,255,0.14)] focus:border-[var(--brand-border-active)]",
  "outline-none transition-colors placeholder:text-text-faint",
].join(" ");

const labelCls = "block text-text-dim text-xs font-medium mb-1.5";

// ── Queries ───────────────────────────────────────────────────────────────────

function useCashKPIs(userId: string) {
  return useQuery({
    queryKey: ["cash-kpis", userId],
    queryFn: async () => {
      const today = todayStr();
      const first = new Date(); first.setDate(1);
      const firstStr = first.toISOString().split("T")[0];

      const [{ data: account }, { data: movements }] = await Promise.all([
        supabase.from("cash_accounts").select("starting_balance,currency").eq("user_id", userId).maybeSingle(),
        supabase.from("cash_movements").select("type,amount,occurred_at").eq("user_id", userId),
      ]);

      const all = movements ?? [];
      const todayInc  = all.filter(m => m.type === "income" && m.occurred_at === today);
      const monthInc  = all.filter(m => m.type === "income" && m.occurred_at >= firstStr && m.occurred_at <= today);
      const base      = Number(account?.starting_balance ?? 0);
      const net       = all.reduce((s, m) => s + (m.type === "income" ? Number(m.amount) : -Number(m.amount)), 0);

      return {
        balance:    base + net,
        currency:   account?.currency ?? "USD",
        todayTotal: todayInc.reduce((s, m) => s + Number(m.amount), 0),
        todayCount: todayInc.length,
        monthTotal: monthInc.reduce((s, m) => s + Number(m.amount), 0),
        monthCount: monthInc.length,
      };
    },
  });
}

function useRecentIncome(userId: string) {
  return useQuery({
    queryKey: ["income-movements", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("cash_movements")
        .select("id,amount,currency,occurred_at,description,category,method")
        .eq("user_id", userId)
        .eq("type", "income")
        .order("occurred_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50);
      return (data ?? []) as Movement[];
    },
  });
}

function useCashAccount(userId: string) {
  return useQuery({
    queryKey: ["cash-account", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("cash_accounts").select("id,starting_balance,currency")
        .eq("user_id", userId).maybeSingle();
      return (data ?? null) as CashAccount | null;
    },
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Income() {
  const { t } = useTranslation();
  const userId = useAuthStore((s) => s.session!.user.id);
  const qc = useQueryClient();

  const kpisQ    = useCashKPIs(userId);
  const incomeQ  = useRecentIncome(userId);
  const accountQ = useCashAccount(userId);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["cash-kpis",        userId] });
    qc.invalidateQueries({ queryKey: ["income-movements", userId] });
    qc.invalidateQueries({ queryKey: ["cash-account",     userId] });
    qc.invalidateQueries({ queryKey: ["cash-position",    userId] });
    qc.invalidateQueries({ queryKey: ["dashboard-data",   userId] });
  };

  const kpis     = kpisQ.data;
  const currency = kpis?.currency ?? "USD";

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display font-semibold text-2xl text-text">{t("income.title")}</h1>
        <p className="text-text-muted text-sm mt-1">{t("income.subtitle")}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiCard
          label={t("income.kpi.balance")}
          value={kpis ? fmt(kpis.balance, currency) : null}
          hint={kpis ? (kpis.balance < 0 ? t("income.hint.negative") : t("income.hint.available")) : undefined}
          accent={kpis && kpis.balance < 0 ? "danger" : "brand"}
          loading={kpisQ.isLoading}
        />
        <KpiCard
          label={t("income.kpi.today")}
          value={kpis ? fmt(kpis.todayTotal, currency) : null}
          hint={kpis ? t("income.hint.movement", { count: kpis.todayCount }) : undefined}
          accent="cyan"
          loading={kpisQ.isLoading}
        />
        <KpiCard
          label={t("income.kpi.month")}
          value={kpis ? fmt(kpis.monthTotal, currency) : null}
          hint={kpis ? t("income.hint.movement", { count: kpis.monthCount }) : undefined}
          accent="brand"
          loading={kpisQ.isLoading}
        />
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 1.5fr", alignItems: "start" }}>
        <IncomeForm userId={userId} currency={currency} onSaved={invalidate} />
        <div className="space-y-4">
          <IncomeList
            movements={incomeQ.data ?? []}
            loading={incomeQ.isLoading}
            error={!!incomeQ.error}
            currency={currency}
            userId={userId}
            onDeleted={invalidate}
          />
          <StartingBalanceRow
            account={accountQ.data ?? null}
            userId={userId}
            onSaved={invalidate}
          />
        </div>
      </div>
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, hint, accent, loading }: {
  label: string; value: string | null; hint?: string;
  accent: "brand" | "danger" | "cyan"; loading: boolean;
}) {
  const color = accent === "brand" ? "var(--brand)" : accent === "danger" ? "#ff4d6d" : "var(--brand-cyan)";
  return (
    <div className="rounded-2xl p-6" style={GLASS}>
      <div className="text-text-faint text-[10px] uppercase tracking-widest font-medium mb-3">{label}</div>
      {loading
        ? <div className="w-5 h-5 rounded-full border-2 border-brand border-t-transparent animate-spin mb-2" />
        : <div className="font-display font-bold text-3xl leading-none mb-2" style={{ color }}>{value ?? "—"}</div>
      }
      {hint && <div className="text-text-dim text-xs">{hint}</div>}
    </div>
  );
}

// ── Income Form ───────────────────────────────────────────────────────────────

function IncomeForm({ userId, currency, onSaved }: {
  userId: string; currency: string; onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [category, setCategory] = useState("");
  const [method,   setMethod]   = useState("");
  const [amount,   setAmount]   = useState("");
  const [desc,     setDesc]     = useState("");
  const [date,     setDate]     = useState(todayStr());
  const [err,      setErr]      = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const num = parseFloat(amount);
      if (isNaN(num) || num <= 0) throw new Error(t("income.errors.invalidAmount"));
      if (!category)              throw new Error(t("income.errors.selectCategory"));
      if (!method)                throw new Error(t("income.errors.selectMethod"));
      const { error } = await supabase.from("cash_movements").insert({
        user_id: userId, type: "income", amount: num, currency,
        occurred_at: date, description: desc.trim() || null,
        category, method, source: "manual",
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { setAmount(""); setDesc(""); setDate(todayStr()); setErr(""); onSaved(); },
    onError: (e: any) => setErr(e.message ?? "Error al guardar"),
  });

  return (
    <div className="rounded-2xl p-6" style={GLASS}>
      <h2 className="font-display font-semibold text-base text-text mb-5">{t("income.form.title")}</h2>

      {/* Origin */}
      <div className="mb-5">
        <label className={labelCls}>{t("income.form.origin")}</label>
        <div className="space-y-1.5">
          {CATEGORIES.map(({ key, i18nKey, icon: Icon }) => {
            const active = category === key;
            return (
              <button
                key={key} type="button" onClick={() => setCategory(key)}
                className="flex items-center gap-3 w-full h-10 px-3 rounded-lg text-sm font-medium transition-all text-left"
                style={{
                  background: active ? "rgb(var(--brand-rgb) / 0.16)" : "rgba(27,39,66,0.55)",
                  border:     active ? "1px solid rgb(var(--brand-rgb) / 0.40)" : "1px solid rgba(125,165,255,0.10)",
                  color:      active ? "var(--brand)" : "#9fb0c0",
                }}
              >
                <Icon size={14} style={{ flexShrink: 0 }} /> {t(i18nKey)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Method */}
      <div className="mb-5">
        <label className={labelCls}>{t("income.form.method")}</label>
        <div className="flex gap-2">
          {METHODS.map(({ key, i18nKey, icon: Icon }) => {
            const active = method === key;
            return (
              <button
                key={key} type="button" onClick={() => setMethod(key)}
                className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: active ? "rgb(var(--brand-rgb) / 0.16)" : "rgba(27,39,66,0.55)",
                  border:     active ? "1px solid rgb(var(--brand-rgb) / 0.40)" : "1px solid rgba(125,165,255,0.10)",
                  color:      active ? "var(--brand)" : "#7c8896",
                }}
              >
                <Icon size={13} /> {t(i18nKey)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Amount */}
      <div className="mb-4">
        <label className={labelCls}>{t("income.form.amount")} *</label>
        <input type="number" step="0.01" min="0" value={amount}
          onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className={fieldCls} />
      </div>

      {/* Date */}
      <div className="mb-4">
        <label className={labelCls}>{t("income.form.date")}</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className={`${fieldCls} [color-scheme:dark]`} />
      </div>

      {/* Description */}
      <div className="mb-5">
        <label className={labelCls}>{t("income.form.description")}</label>
        <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)}
          placeholder={t("income.form.descPlaceholder")} className={fieldCls} />
      </div>

      {err && (
        <div className="flex items-center gap-2 text-danger text-xs mb-3">
          <AlertCircle size={13} /> {err}
        </div>
      )}

      <button
        type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending}
        className="w-full h-10 rounded-lg font-display font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        style={{ background: "linear-gradient(150deg,var(--brand),var(--brand-deep))", boxShadow: "0 6px 22px rgb(var(--brand-rgb) / 0.40)" }}
      >
        <TrendingUp size={15} />
        {mutation.isPending ? t("income.form.saving") : t("income.form.submit")}
      </button>
    </div>
  );
}

// ── Income List ───────────────────────────────────────────────────────────────

function IncomeList({ movements, loading, error, currency, userId, onDeleted }: {
  movements: Movement[]; loading: boolean; error: boolean;
  currency: string; userId: string; onDeleted: () => void;
}) {
  const { t } = useTranslation();
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cash_movements").delete().eq("id", id).eq("user_id", userId);
      if (error) throw new Error(error.message);
    },
    onSuccess: onDeleted,
  });

  return (
    <div className="rounded-2xl p-6" style={GLASS}>
      <h2 className="font-display font-semibold text-base text-text mb-5">{t("income.list.title")}</h2>

      {loading && <div className="flex justify-center py-8"><Loader2 className="text-brand animate-spin" size={20} /></div>}
      {error && <div className="flex items-center gap-2 text-danger text-sm py-4"><AlertCircle size={16} /> {t("common.error")}</div>}

      {!loading && !error && movements.length === 0 && (
        <div className="text-center py-8 text-text-faint text-sm">
          <p>{t("income.list.empty")}</p>
          <p className="text-xs mt-1">{t("income.list.emptyHint")}</p>
        </div>
      )}

      {!loading && movements.length > 0 && (
        <div className="space-y-2">
          {movements.map((m) => {
            const catConfig = CATEGORIES.find(c => c.key === m.category);
            const Icon = catConfig?.icon ?? TrendingUp;
            const isDel = del.isPending && del.variables === m.id;
            const categoryLabel = catConfig ? t(catConfig.i18nKey) : (m.category || t("income.list.defaultCategory"));
            return (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-xl px-4 py-3 transition-opacity"
                style={{ background: "rgba(27,39,66,0.40)", opacity: isDel ? 0.4 : 1 }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgb(var(--brand-rgb) / 0.12)" }}>
                  <Icon size={14} style={{ color: "var(--brand)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-text text-sm font-medium truncate">{categoryLabel}</div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-text-faint text-xs">{m.occurred_at}</span>
                    {m.method && <><span className="text-text-faint text-xs">·</span><span className="text-text-dim text-xs capitalize">{m.method}</span></>}
                    {m.description && <><span className="text-text-faint text-xs">·</span><span className="text-text-dim text-xs truncate">{m.description}</span></>}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                  <span className="font-display font-semibold text-sm" style={{ color: "var(--brand)" }}>
                    +{fmt(m.amount, m.currency ?? currency)}
                  </span>
                  <button type="button" onClick={() => del.mutate(m.id)} disabled={isDel}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-text-dim hover:text-danger transition-colors disabled:opacity-40"
                    style={{ background: "rgba(255,77,109,0.07)" }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Starting Balance Row ──────────────────────────────────────────────────────

function StartingBalanceRow({ account, userId, onSaved }: {
  account: CashAccount | null; userId: string; onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [value,   setValue]   = useState("");
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState("");

  function startEdit() { setValue(account ? String(account.starting_balance) : ""); setErr(""); setEditing(true); }

  async function save() {
    const num = parseFloat(value);
    if (isNaN(num)) { setErr(t("income.balance.invalidAmount")); return; }
    setSaving(true);
    try {
      if (account) {
        const { error } = await supabase.from("cash_accounts").update({ starting_balance: num }).eq("id", account.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cash_accounts")
          .insert({ user_id: userId, name: "Caja principal", starting_balance: num, currency: "USD" });
        if (error) throw error;
      }
      onSaved(); setEditing(false);
    } catch (e: any) { setErr(e.message ?? "Error"); }
    finally { setSaving(false); }
  }

  return (
    <div className="rounded-xl px-5 py-4 flex items-center gap-4"
      style={{ background: "rgba(27,39,66,0.35)", border: "1px solid rgba(125,165,255,0.08)" }}>
      {!editing ? (
        <>
          <div className="flex-1">
            <div className="text-text-dim text-xs font-medium">{t("income.balance.label")}</div>
            <div className="text-text text-sm font-semibold mt-0.5">
              {account ? fmt(account.starting_balance, account.currency) : t("income.balance.notSet")}
            </div>
          </div>
          <button onClick={startEdit}
            className="flex items-center gap-1.5 text-brand text-xs font-medium hover:text-brand-soft transition-colors flex-shrink-0">
            <Pencil size={12} /> {account ? t("income.balance.edit") : t("income.balance.configure")}
          </button>
        </>
      ) : (
        <>
          <input type="number" step="0.01" value={value} onChange={(e) => setValue(e.target.value)}
            placeholder="0.00" className={`${fieldCls} flex-1`} autoFocus />
          {err && <span className="text-danger text-xs flex-shrink-0">{err}</span>}
          <button onClick={save} disabled={saving}
            className="flex items-center gap-1 text-brand text-xs font-semibold disabled:opacity-50 flex-shrink-0">
            <Check size={13} /> {saving ? "…" : "OK"}
          </button>
          <button onClick={() => setEditing(false)} className="text-text-dim hover:text-text transition-colors flex-shrink-0">
            <X size={14} />
          </button>
        </>
      )}
    </div>
  );
}
