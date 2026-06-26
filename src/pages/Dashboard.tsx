import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Clock } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";

// ── helpers ──────────────────────────────────────────────────────────────────

function fmt(amount: number, currency = "USD") {
  return new Intl.NumberFormat("es-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function daysUntil(dateStr: string): number {
  const due = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - now.getTime()) / 86_400_000);
}

// ── queries ──────────────────────────────────────────────────────────────────

function useCashPosition(userId: string) {
  return useQuery({
    queryKey: ["cash-position", userId],
    queryFn: async () => {
      const [{ data: accounts }, { data: movements }] = await Promise.all([
        supabase
          .from("cash_accounts")
          .select("starting_balance")
          .eq("user_id", userId),
        supabase
          .from("cash_movements")
          .select("type, amount")
          .eq("user_id", userId),
      ]);

      const base = (accounts ?? []).reduce(
        (s, a) => s + Number(a.starting_balance),
        0
      );
      const net = (movements ?? []).reduce(
        (s, m) => s + (m.type === "income" ? Number(m.amount) : -Number(m.amount)),
        0
      );
      return base + net;
    },
  });
}

type Invoice = {
  id: string;
  invoice_number: string | null;
  due_date: string;
  total_amount: number;
  currency: string;
  suppliers: { name: string }[] | null;
};

function useUpcomingInvoices(userId: string) {
  return useQuery({
    queryKey: ["upcoming-invoices", userId],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const in30 = new Date(today.getTime() + 30 * 86_400_000);
      const toISO = (d: Date) => d.toISOString().split("T")[0];

      const { data } = await supabase
        .from("invoices")
        .select("id, invoice_number, due_date, total_amount, currency, suppliers(name)")
        .eq("user_id", userId)
        .eq("status", "pending")
        .lte("due_date", toISO(in30))
        .order("due_date");

      return (data ?? []) as Invoice[];
    },
  });
}

// ── component ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const userId = useAuthStore((s) => s.session!.user.id);
  const cash = useCashPosition(userId);
  const upcoming = useUpcomingInvoices(userId);

  const totalPayable = (upcoming.data ?? []).reduce(
    (s, inv) => s + Number(inv.total_amount),
    0
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display font-semibold text-2xl text-text">Dashboard</h1>
        <p className="text-text-muted text-sm mt-1">
          Posición de caja y cuentas por pagar
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <KpiCard
          label="Posición de caja"
          loading={cash.isLoading}
          error={!!cash.error}
          value={cash.data !== undefined ? fmt(cash.data) : null}
          hint={
            cash.data !== undefined
              ? cash.data >= 0
                ? "Saldo disponible"
                : "Saldo negativo — revisar"
              : undefined
          }
          accent={cash.data !== undefined && cash.data < 0 ? "danger" : "brand"}
        />
        <KpiCard
          label="Por pagar (próx. 30 días)"
          loading={upcoming.isLoading}
          error={!!upcoming.error}
          value={upcoming.data !== undefined ? fmt(totalPayable) : null}
          hint={
            upcoming.data !== undefined
              ? upcoming.data.length === 0
                ? "Sin facturas próximas"
                : `${upcoming.data.length} factura${upcoming.data.length > 1 ? "s" : ""} pendiente${upcoming.data.length > 1 ? "s" : ""}`
              : undefined
          }
          accent="danger"
        />
      </div>

      {/* Upcoming invoices */}
      <div
        className="rounded-2xl p-6"
        style={{
          background:
            "linear-gradient(180deg,rgba(20,32,60,0.55),rgba(9,14,30,0.55))",
          backdropFilter: "blur(20px) saturate(140%)",
          border: "1px solid rgba(125,165,255,0.12)",
        }}
      >
        <h2 className="font-display font-semibold text-base text-text mb-4">
          Próximos vencimientos
        </h2>

        {upcoming.isLoading && (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 rounded-full border-2 border-brand border-t-transparent animate-spin" />
          </div>
        )}

        {upcoming.error && (
          <div className="flex items-center gap-2 text-danger text-sm py-4">
            <AlertCircle size={16} />
            Error al cargar facturas
          </div>
        )}

        {upcoming.data && upcoming.data.length === 0 && (
          <div className="flex flex-col items-center py-8 text-text-faint text-sm">
            <span className="mb-1">Sin facturas próximas</span>
            <span className="text-xs">
              Usa{" "}
              <strong className="text-text-dim">Captura</strong> para registrar
              una factura
            </span>
          </div>
        )}

        {upcoming.data && upcoming.data.length > 0 && (
          <div className="space-y-2">
            {upcoming.data.map((inv) => {
              const days = daysUntil(inv.due_date);
              const isOverdue = days < 0;
              const isUrgent = days >= 0 && days <= 3;
              return (
                <InvoiceRow
                  key={inv.id}
                  supplierName={inv.suppliers?.[0]?.name ?? "Proveedor"}
                  invoiceNumber={inv.invoice_number}
                  amount={fmt(inv.total_amount, inv.currency)}
                  days={days}
                  isOverdue={isOverdue}
                  isUrgent={isUrgent}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── sub-components ────────────────────────────────────────────────────────────

function KpiCard({
  label,
  loading,
  error,
  value,
  hint,
  accent,
}: {
  label: string;
  loading: boolean;
  error: boolean;
  value: string | null;
  hint?: string;
  accent: "brand" | "danger";
}) {
  const color = accent === "brand" ? "#3d8bff" : "#ff4d6d";
  return (
    <div
      className="rounded-2xl p-6"
      style={{
        background:
          "linear-gradient(180deg,rgba(20,32,60,0.55),rgba(9,14,30,0.55))",
        backdropFilter: "blur(20px) saturate(140%)",
        border: "1px solid rgba(125,165,255,0.12)",
      }}
    >
      <div className="text-text-faint text-[10px] uppercase tracking-widest font-medium mb-3">
        {label}
      </div>
      {loading && (
        <div className="w-5 h-5 rounded-full border-2 border-brand border-t-transparent animate-spin mb-2" />
      )}
      {error && (
        <div className="text-danger text-sm font-medium mb-2">Error al cargar</div>
      )}
      {!loading && !error && (
        <div
          className="font-display font-bold text-3xl leading-none mb-2"
          style={{ color }}
        >
          {value ?? "—"}
        </div>
      )}
      {hint && <div className="text-text-dim text-xs">{hint}</div>}
    </div>
  );
}

function InvoiceRow({
  supplierName,
  invoiceNumber,
  amount,
  days,
  isOverdue,
  isUrgent,
}: {
  supplierName: string;
  invoiceNumber: string | null;
  amount: string;
  days: number;
  isOverdue: boolean;
  isUrgent: boolean;
}) {
  const badgeColor = isOverdue
    ? "rgba(255,77,109,0.15)"
    : isUrgent
    ? "rgba(255,184,77,0.12)"
    : "rgba(125,165,255,0.08)";
  const badgeText = isOverdue
    ? "#ff4d6d"
    : isUrgent
    ? "#ffb84d"
    : "#9fb0c0";
  const daysLabel = isOverdue
    ? `Vencida hace ${Math.abs(days)} d`
    : days === 0
    ? "Vence hoy"
    : `${days} d`;

  return (
    <div
      className="flex items-center justify-between rounded-xl px-4 py-3 transition-colors"
      style={{ background: "rgba(27,39,66,0.40)" }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: badgeColor }}
        >
          <Clock size={14} style={{ color: badgeText }} />
        </div>
        <div className="min-w-0">
          <div className="text-text text-sm font-medium truncate">{supplierName}</div>
          {invoiceNumber && (
            <div className="text-text-faint text-xs truncate">#{invoiceNumber}</div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0 ml-4">
        <span className="font-display font-semibold text-sm text-text">{amount}</span>
        <span
          className="text-xs font-medium rounded-md px-2 py-0.5"
          style={{ background: badgeColor, color: badgeText }}
        >
          {daysLabel}
        </span>
      </div>
    </div>
  );
}
