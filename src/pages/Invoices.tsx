import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Plus, AlertCircle, FileText } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";

// ── Types ─────────────────────────────────────────────────────────────────────

type Invoice = {
  id: string;
  invoice_number: string | null;
  due_date: string | null;
  total_amount: number;
  currency: string;
  status: string;
  suppliers: { name: string } | { name: string }[] | null;
};

type DisplayStatus = "pending" | "programada" | "vencida" | "paid" | "void";
type FilterKey = "todas" | DisplayStatus;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number, cur = "USD") {
  return new Intl.NumberFormat("es-US", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);
}

function todayStr() { return new Date().toISOString().split("T")[0]; }

function daysUntil(d: string) {
  const due = new Date(d + "T00:00:00"), now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - now.getTime()) / 86_400_000);
}

function getDisplayStatus(inv: Invoice): DisplayStatus {
  if (inv.status === "paid") return "paid";
  if (inv.status === "void") return "void";
  if (inv.due_date && inv.due_date < todayStr()) return "vencida";
  if (inv.status === "programada") return "programada";
  return "pending";
}

function supplierName(inv: Invoice): string {
  if (!inv.suppliers) return "Proveedor";
  if (Array.isArray(inv.suppliers)) return inv.suppliers[0]?.name ?? "Proveedor";
  return (inv.suppliers as { name: string }).name;
}

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = ["#3d8bff", "#00d4ff", "#a855f7", "#ffb84d", "#ff4d6d"];
function avatarColor(name: string) { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]; }

const STATUS_CFG: Record<DisplayStatus, { label: string; bg: string; color: string }> = {
  pending:    { label: "Pendiente",  bg: "rgba(61,139,255,0.12)",  color: "#3d8bff" },
  programada: { label: "Programada", bg: "rgba(168,85,247,0.12)",  color: "#a855f7" },
  vencida:    { label: "Vencida",    bg: "rgba(255,77,109,0.12)",  color: "#ff4d6d" },
  paid:       { label: "Pagada",     bg: "rgba(0,212,255,0.10)",   color: "#00d4ff" },
  void:       { label: "Anulada",    bg: "rgba(124,136,150,0.12)", color: "#7c8896" },
};

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "todas",     label: "Todas" },
  { key: "pending",   label: "Pendientes" },
  { key: "programada", label: "Programadas" },
  { key: "vencida",   label: "Vencidas" },
  { key: "paid",      label: "Pagadas" },
];

const GLASS = {
  background: "linear-gradient(180deg,rgba(20,32,60,0.55),rgba(9,14,30,0.55))",
  backdropFilter: "blur(20px) saturate(140%)",
  border: "1px solid rgba(125,165,255,0.12)",
} as const;

// ── Query ─────────────────────────────────────────────────────────────────────

function useInvoices(userId: string) {
  return useQuery({
    queryKey: ["invoices", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("invoices")
        .select("id,invoice_number,due_date,total_amount,currency,status,suppliers(name)")
        .eq("user_id", userId)
        .order("due_date", { ascending: true, nullsFirst: false });
      return (data ?? []) as Invoice[];
    },
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Invoices() {
  const userId   = useAuthStore((s) => s.session!.user.id);
  const navigate = useNavigate();
  const q        = useInvoices(userId);
  const [filter, setFilter] = useState<FilterKey>("todas");

  const enriched = (q.data ?? []).map(inv => ({ ...inv, displayStatus: getDisplayStatus(inv) }));

  const counts: Record<FilterKey, number> = {
    todas:     enriched.length,
    pending:   enriched.filter(i => i.displayStatus === "pending").length,
    programada: enriched.filter(i => i.displayStatus === "programada").length,
    vencida:   enriched.filter(i => i.displayStatus === "vencida").length,
    paid:      enriched.filter(i => i.displayStatus === "paid").length,
    void:      0,
  };

  const filtered = filter === "todas" ? enriched : enriched.filter(i => i.displayStatus === filter);

  const totalPayable = enriched
    .filter(i => ["pending", "programada", "vencida"].includes(i.displayStatus))
    .reduce((s, i) => s + Number(i.total_amount), 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display font-semibold text-2xl text-text">Facturas</h1>
          {!q.isLoading && (
            <p className="text-text-muted text-sm mt-1">
              {enriched.length} factura{enriched.length !== 1 ? "s" : ""} · {fmt(totalPayable)} por pagar
            </p>
          )}
        </div>
        <button
          onClick={() => navigate("/captura")}
          className="flex items-center gap-2 h-9 px-4 rounded-lg font-semibold text-sm text-white transition-all flex-shrink-0"
          style={{ background: "linear-gradient(150deg,#3d8bff,#1f5fe0)", boxShadow: "0 4px 16px rgba(61,139,255,0.35)" }}
        >
          <Plus size={15} /> Nueva factura
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {FILTERS.map(({ key, label }) => {
          const active = filter === key;
          return (
            <button
              key={key} onClick={() => setFilter(key)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: active ? "rgba(61,139,255,0.16)" : "rgba(27,39,66,0.55)",
                border:     active ? "1px solid rgba(61,139,255,0.35)" : "1px solid rgba(125,165,255,0.10)",
                color:      active ? "#3d8bff" : "#7c8896",
              }}
            >
              {label}
              <span className="text-[10px] font-bold rounded px-1.5 py-0.5"
                style={{ background: active ? "rgba(61,139,255,0.18)" : "rgba(125,165,255,0.08)", color: active ? "#3d8bff" : "#5f6b7a" }}>
                {counts[key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={GLASS}>
        {q.isLoading && (
          <div className="flex justify-center py-16">
            <div className="w-5 h-5 rounded-full border-2 border-brand border-t-transparent animate-spin" />
          </div>
        )}

        {q.error && (
          <div className="flex items-center gap-2 text-danger text-sm p-8">
            <AlertCircle size={16} /> Error al cargar facturas
          </div>
        )}

        {!q.isLoading && !q.error && filtered.length === 0 && (
          <div className="flex flex-col items-center py-16 text-text-faint text-sm">
            <FileText size={32} className="mb-3 opacity-30" />
            <p>{filter === "todas" ? "Sin facturas registradas" : "Sin facturas en esta categoría"}</p>
            {filter === "todas" && (
              <button onClick={() => navigate("/captura")}
                className="mt-4 text-brand text-xs font-medium hover:text-brand-soft transition-colors">
                Captura tu primera factura →
              </button>
            )}
          </div>
        )}

        {!q.isLoading && filtered.length > 0 && (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(125,165,255,0.08)" }}>
                {["Proveedor", "N.º factura", "Vencimiento", "Monto", "Estado"].map(col => (
                  <th key={col} className="text-left text-[10px] uppercase tracking-widest font-medium text-text-faint px-5 py-3.5">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv, idx) => {
                const name  = supplierName(inv);
                const color = avatarColor(name);
                const cfg   = STATUS_CFG[inv.displayStatus];
                const days  = inv.due_date ? daysUntil(inv.due_date) : null;

                return (
                  <tr
                    key={inv.id}
                    className="transition-colors"
                    style={{ borderBottom: idx < filtered.length - 1 ? "1px solid rgba(125,165,255,0.06)" : undefined }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(61,139,255,0.04)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "")}
                  >
                    {/* Proveedor */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center font-display font-bold text-xs flex-shrink-0"
                          style={{ background: `${color}22`, color }}>
                          {initials(name)}
                        </div>
                        <span className="text-text text-sm font-medium">{name}</span>
                      </div>
                    </td>
                    {/* N.º factura */}
                    <td className="px-5 py-3.5">
                      <span className="text-text-muted text-sm">
                        {inv.invoice_number ? `#${inv.invoice_number}` : "—"}
                      </span>
                    </td>
                    {/* Vencimiento */}
                    <td className="px-5 py-3.5">
                      {inv.due_date && days !== null ? (
                        <div>
                          <div className="text-text text-sm">{inv.due_date}</div>
                          <div className="text-xs mt-0.5" style={{
                            color: days < 0 ? "#ff4d6d" : days <= 3 ? "#ffb84d" : "#7c8896",
                          }}>
                            {days < 0
                              ? `Vencida hace ${Math.abs(days)} día${Math.abs(days) !== 1 ? "s" : ""}`
                              : days === 0 ? "Vence hoy"
                              : `En ${days} día${days !== 1 ? "s" : ""}`}
                          </div>
                        </div>
                      ) : <span className="text-text-faint text-sm">—</span>}
                    </td>
                    {/* Monto */}
                    <td className="px-5 py-3.5">
                      <span className="font-display font-semibold text-sm text-text">
                        {fmt(inv.total_amount, inv.currency)}
                      </span>
                    </td>
                    {/* Estado */}
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-semibold rounded-md px-2.5 py-1"
                        style={{ background: cfg.bg, color: cfg.color }}>
                        {cfg.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
