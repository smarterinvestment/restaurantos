import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusCircle, Trash2, TrendingUp, TrendingDown, AlertCircle, Pencil, Check, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";

// ── Types ─────────────────────────────────────────────────────────────────────

type Movement = {
  id: string;
  type: "income" | "expense";
  amount: number;
  currency: string;
  occurred_at: string;
  description: string | null;
  category: string | null;
  source: string;
};

type CashAccount = {
  id: string;
  starting_balance: number;
  currency: string;
  name: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(amount: number, currency = "USD") {
  return new Intl.NumberFormat("es-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function today() {
  return new Date().toISOString().split("T")[0];
}

const GLASS = {
  background: "linear-gradient(180deg, rgba(20,32,60,0.55), rgba(9,14,30,0.55))",
  backdropFilter: "blur(20px) saturate(140%)",
  border: "1px solid rgba(125,165,255,0.12)",
} as const;

const fieldCls = [
  "h-10 rounded-lg px-3 text-sm text-text w-full",
  "bg-[rgba(27,39,66,0.65)]",
  "border border-[rgba(125,165,255,0.14)] focus:border-[rgba(61,139,255,0.45)]",
  "outline-none transition-colors placeholder:text-text-faint",
].join(" ");

const labelCls = "block text-text-dim text-xs font-medium mb-1.5";

// ── Queries ───────────────────────────────────────────────────────────────────

function useCashAccount(userId: string) {
  return useQuery({
    queryKey: ["cash-account", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("cash_accounts")
        .select("id, name, starting_balance, currency")
        .eq("user_id", userId)
        .maybeSingle();
      return (data ?? null) as CashAccount | null;
    },
  });
}

function useMovements(userId: string) {
  return useQuery({
    queryKey: ["cash-movements", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("cash_movements")
        .select("id, type, amount, currency, occurred_at, description, category, source")
        .eq("user_id", userId)
        .order("occurred_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100);
      return (data ?? []) as Movement[];
    },
  });
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Income() {
  const userId = useAuthStore((s) => s.session!.user.id);
  const qc = useQueryClient();

  const accountQ = useCashAccount(userId);
  const movementsQ = useMovements(userId);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["cash-account", userId] });
    qc.invalidateQueries({ queryKey: ["cash-movements", userId] });
    qc.invalidateQueries({ queryKey: ["cash-position", userId] });
  };

  // ── Balance cálculo ──
  const startingBalance = accountQ.data?.starting_balance ?? 0;
  const currency = accountQ.data?.currency ?? "USD";
  const net = (movementsQ.data ?? []).reduce(
    (s, m) => s + (m.type === "income" ? Number(m.amount) : -Number(m.amount)),
    0
  );
  const balance = startingBalance + net;

  const loading = accountQ.isLoading || movementsQ.isLoading;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display font-semibold text-2xl text-text">Ingresos / Caja</h1>
        <p className="text-text-muted text-sm mt-1">
          Registra movimientos y consulta tu posición de caja en tiempo real.
        </p>
      </div>

      {/* Top row: balance + saldo inicial */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <BalanceCard balance={balance} currency={currency} loading={loading} />
        <StartingBalanceCard
          account={accountQ.data ?? null}
          userId={userId}
          onSaved={invalidate}
        />
      </div>

      {/* Main row: form + list */}
      <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 1.6fr", alignItems: "start" }}>
        <MovementForm userId={userId} currency={currency} onSaved={invalidate} />
        <MovementList
          movements={movementsQ.data ?? []}
          loading={movementsQ.isLoading}
          error={!!movementsQ.error}
          userId={userId}
          onDeleted={invalidate}
        />
      </div>
    </div>
  );
}

// ── BalanceCard ───────────────────────────────────────────────────────────────

function BalanceCard({
  balance,
  currency,
  loading,
}: {
  balance: number;
  currency: string;
  loading: boolean;
}) {
  const positive = balance >= 0;
  const color = positive ? "#3d8bff" : "#ff4d6d";
  return (
    <div className="rounded-2xl p-6" style={GLASS}>
      <div className="text-text-faint text-[10px] uppercase tracking-widest font-medium mb-3">
        Saldo actual
      </div>
      {loading ? (
        <div className="w-5 h-5 rounded-full border-2 border-brand border-t-transparent animate-spin mb-2" />
      ) : (
        <div className="font-display font-bold text-3xl leading-none mb-2" style={{ color }}>
          {fmt(balance, currency)}
        </div>
      )}
      <div className="text-text-dim text-xs">
        {positive ? "Posición positiva" : "Posición negativa — revisar"}
      </div>
    </div>
  );
}

// ── StartingBalanceCard ───────────────────────────────────────────────────────

function StartingBalanceCard({
  account,
  userId,
  onSaved,
}: {
  account: CashAccount | null;
  userId: string;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function startEdit() {
    setValue(account ? String(account.starting_balance) : "");
    setErr("");
    setEditing(true);
  }

  async function save() {
    const num = parseFloat(value);
    if (isNaN(num)) { setErr("Ingresa un monto válido"); return; }
    setSaving(true);
    setErr("");
    try {
      if (account) {
        const { error } = await supabase
          .from("cash_accounts")
          .update({ starting_balance: num })
          .eq("id", account.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("cash_accounts")
          .insert({ user_id: userId, name: "Caja principal", starting_balance: num, currency: "USD" });
        if (error) throw error;
      }
      onSaved();
      setEditing(false);
    } catch (e: any) {
      setErr(e.message ?? "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl p-6" style={GLASS}>
      <div className="text-text-faint text-[10px] uppercase tracking-widest font-medium mb-3">
        Saldo inicial
      </div>

      {!editing ? (
        <>
          <div className="font-display font-bold text-3xl leading-none mb-2 text-text">
            {account ? fmt(account.starting_balance, account.currency) : "—"}
          </div>
          <div className="flex items-center justify-between mt-1">
            <div className="text-text-dim text-xs">
              {account ? "Caja principal" : "Sin configurar"}
            </div>
            <button
              onClick={startEdit}
              className="flex items-center gap-1.5 text-brand text-xs font-medium hover:text-brand-soft transition-colors"
            >
              <Pencil size={12} />
              {account ? "Editar" : "Configurar"}
            </button>
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Saldo inicial (USD)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0.00"
              className={fieldCls}
              autoFocus
            />
            {err && <p className="text-danger text-xs mt-1">{err}</p>}
          </div>
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: "linear-gradient(150deg,#3d8bff,#1f5fe0)", boxShadow: "0 4px 14px rgba(61,139,255,0.35)" }}
            >
              <Check size={13} /> {saving ? "Guardando…" : "Guardar"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium text-text-muted hover:text-text transition-colors"
              style={{ background: "rgba(125,165,255,0.07)", border: "1px solid rgba(125,165,255,0.12)" }}
            >
              <X size={13} /> Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MovementForm ──────────────────────────────────────────────────────────────

function MovementForm({
  userId,
  currency,
  onSaved,
}: {
  userId: string;
  currency: string;
  onSaved: () => void;
}) {
  const [type, setType] = useState<"income" | "expense">("income");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [err, setErr] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const num = parseFloat(amount);
      if (isNaN(num) || num <= 0) throw new Error("Ingresa un monto válido mayor a 0");
      if (!date) throw new Error("La fecha es obligatoria");

      const { error } = await supabase.from("cash_movements").insert({
        user_id: userId,
        type,
        amount: num,
        currency,
        occurred_at: date,
        description: description.trim() || null,
        category: category.trim() || null,
        source: "manual",
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setAmount("");
      setDate(today());
      setDescription("");
      setCategory("");
      setErr("");
      onSaved();
    },
    onError: (e: any) => setErr(e.message ?? "Error al guardar"),
  });

  return (
    <div className="rounded-2xl p-6" style={GLASS}>
      <h2 className="font-display font-semibold text-base text-text mb-5">
        Nuevo movimiento
      </h2>

      {/* Type toggle */}
      <div
        className="flex rounded-lg p-1 mb-5"
        style={{ background: "rgba(27,39,66,0.65)" }}
      >
        {(["income", "expense"] as const).map((t) => {
          const active = type === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className="flex-1 flex items-center justify-center gap-2 h-9 rounded-md text-sm font-semibold transition-all"
              style={{
                background: active
                  ? t === "income"
                    ? "rgba(61,139,255,0.20)"
                    : "rgba(255,77,109,0.18)"
                  : "transparent",
                color: active
                  ? t === "income" ? "#3d8bff" : "#ff4d6d"
                  : "#7c8896",
                border: active
                  ? `1px solid ${t === "income" ? "rgba(61,139,255,0.35)" : "rgba(255,77,109,0.30)"}`
                  : "1px solid transparent",
              }}
            >
              {t === "income"
                ? <><TrendingUp size={14} /> Ingreso</>
                : <><TrendingDown size={14} /> Gasto</>}
            </button>
          );
        })}
      </div>

      <div className="space-y-4">
        <div>
          <label className={labelCls}>Monto *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className={fieldCls}
          />
        </div>

        <div>
          <label className={labelCls}>Fecha *</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`${fieldCls} [color-scheme:dark]`}
          />
        </div>

        <div>
          <label className={labelCls}>Descripción</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Venta del día, pago de proveedor…"
            className={fieldCls}
          />
        </div>

        <div>
          <label className={labelCls}>Categoría (opcional)</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Ventas, Servicios, Alimentos…"
            className={fieldCls}
          />
        </div>

        {err && (
          <div className="flex items-center gap-2 text-danger text-xs">
            <AlertCircle size={13} /> {err}
          </div>
        )}

        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="w-full h-10 rounded-lg font-display font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          style={{
            background: "linear-gradient(150deg,#3d8bff,#1f5fe0)",
            boxShadow: "0 6px 22px rgba(61,139,255,0.40), inset 0 1px 1px rgba(255,255,255,0.12)",
          }}
        >
          <PlusCircle size={15} />
          {mutation.isPending ? "Guardando…" : "Registrar movimiento"}
        </button>
      </div>
    </div>
  );
}

// ── MovementList ──────────────────────────────────────────────────────────────

function MovementList({
  movements,
  loading,
  error,
  userId,
  onDeleted,
}: {
  movements: Movement[];
  loading: boolean;
  error: boolean;
  userId: string;
  onDeleted: () => void;
}) {
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("cash_movements")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
    },
    onSuccess: onDeleted,
  });

  return (
    <div className="rounded-2xl p-6" style={GLASS}>
      <h2 className="font-display font-semibold text-base text-text mb-5">
        Movimientos recientes
      </h2>

      {loading && (
        <div className="flex justify-center py-10">
          <div className="w-5 h-5 rounded-full border-2 border-brand border-t-transparent animate-spin" />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-danger text-sm py-4">
          <AlertCircle size={16} /> Error al cargar movimientos
        </div>
      )}

      {!loading && !error && movements.length === 0 && (
        <div className="flex flex-col items-center py-10 text-text-faint text-sm">
          <span>Sin movimientos registrados</span>
          <span className="text-xs mt-1">Usa el formulario para agregar el primero</span>
        </div>
      )}

      {!loading && movements.length > 0 && (
        <div className="space-y-2">
          {movements.map((m) => (
            <MovementRow
              key={m.id}
              movement={m}
              deleting={deleteMutation.isPending && deleteMutation.variables === m.id}
              onDelete={() => deleteMutation.mutate(m.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── MovementRow ───────────────────────────────────────────────────────────────

function MovementRow({
  movement: m,
  deleting,
  onDelete,
}: {
  movement: Movement;
  deleting: boolean;
  onDelete: () => void;
}) {
  const isIncome = m.type === "income";
  const iconColor = isIncome ? "#3d8bff" : "#ff4d6d";
  const amountColor = isIncome ? "#3d8bff" : "#ff4d6d";
  const iconBg = isIncome ? "rgba(61,139,255,0.10)" : "rgba(255,77,109,0.10)";

  return (
    <div
      className="flex items-center gap-3 rounded-xl px-4 py-3 transition-opacity"
      style={{ background: "rgba(27,39,66,0.40)", opacity: deleting ? 0.4 : 1 }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: iconBg }}
      >
        {isIncome
          ? <TrendingUp size={14} style={{ color: iconColor }} />
          : <TrendingDown size={14} style={{ color: iconColor }} />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-text text-sm font-medium truncate">
          {m.description || (isIncome ? "Ingreso" : "Gasto")}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-text-faint text-xs">{m.occurred_at}</span>
          {m.category && (
            <>
              <span className="text-text-faint text-xs">·</span>
              <span className="text-text-dim text-xs">{m.category}</span>
            </>
          )}
          {m.source === "invoice" && (
            <>
              <span className="text-text-faint text-xs">·</span>
              <span className="text-[10px] text-text-dim px-1.5 py-0.5 rounded-md" style={{ background: "rgba(125,165,255,0.10)" }}>
                factura
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0 ml-2">
        <span className="font-display font-semibold text-sm" style={{ color: amountColor }}>
          {isIncome ? "+" : "−"}{fmt(m.amount, m.currency)}
        </span>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          aria-label="Eliminar movimiento"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-text-dim hover:text-danger transition-colors disabled:opacity-40"
          style={{ background: "rgba(255,77,109,0.07)" }}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
