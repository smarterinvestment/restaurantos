import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, AlertCircle, FileText, Pencil, Trash2, X, Check } from "lucide-react";
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
  if (!inv.suppliers) return "";
  if (Array.isArray(inv.suppliers)) return inv.suppliers[0]?.name ?? "";
  return (inv.suppliers as { name: string }).name;
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

const PALETTE = ["#3d8bff", "#00d4ff", "#a855f7", "#ffb84d", "#ff4d6d"];
function avatarColor(name: string) { return PALETTE[name.charCodeAt(0) % PALETTE.length]; }

const STATUS_STYLE: Record<DisplayStatus, { bg: string; color: string }> = {
  pending:    { bg: "rgb(var(--brand-rgb) / 0.12)",      color: "var(--brand)"      },
  programada: { bg: "rgba(168,85,247,0.12)",              color: "#a855f7"           },
  vencida:    { bg: "rgba(255,77,109,0.12)",              color: "#ff4d6d"           },
  paid:       { bg: "rgb(var(--brand-cyan-rgb) / 0.10)", color: "var(--brand-cyan)" },
  void:       { bg: "rgba(124,136,150,0.12)",             color: "#7c8896"           },
};

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
  const { t } = useTranslation();
  const userId   = useAuthStore((s) => s.session!.user.id);
  const navigate = useNavigate();
  const qc       = useQueryClient();
  const q        = useInvoices(userId);

  const [filter,    setFilter]    = useState<FilterKey>("todas");
  const [editInv,   setEditInv]   = useState<Invoice | null>(null);
  const [deleteInv, setDeleteInv] = useState<Invoice | null>(null);

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["invoices",          userId] });
    qc.invalidateQueries({ queryKey: ["upcoming-invoices", userId] });
    qc.invalidateQueries({ queryKey: ["cash-position",     userId] });
    qc.invalidateQueries({ queryKey: ["dashboard-data",    userId] });
  };

  const FILTERS: { key: FilterKey; labelKey: string }[] = [
    { key: "todas",      labelKey: "invoices.filters.all" },
    { key: "pending",    labelKey: "invoices.filters.pending" },
    { key: "programada", labelKey: "invoices.filters.scheduled" },
    { key: "vencida",    labelKey: "invoices.filters.overdue" },
    { key: "paid",       labelKey: "invoices.filters.paid" },
  ];

  const statusLabel = (s: DisplayStatus): string => {
    const map: Record<DisplayStatus, string> = {
      pending:    t("invoices.status.pending"),
      programada: t("invoices.status.scheduled"),
      vencida:    t("invoices.status.overdue"),
      paid:       t("invoices.status.paid"),
      void:       t("invoices.status.void"),
    };
    return map[s];
  };

  const enriched = (q.data ?? []).map(inv => ({ ...inv, displayStatus: getDisplayStatus(inv) }));

  const counts: Record<FilterKey, number> = {
    todas:      enriched.length,
    pending:    enriched.filter(i => i.displayStatus === "pending").length,
    programada: enriched.filter(i => i.displayStatus === "programada").length,
    vencida:    enriched.filter(i => i.displayStatus === "vencida").length,
    paid:       enriched.filter(i => i.displayStatus === "paid").length,
    void:       0,
  };

  const filtered = filter === "todas" ? enriched : enriched.filter(i => i.displayStatus === filter);

  const totalPayable = enriched
    .filter(i => ["pending", "programada", "vencida"].includes(i.displayStatus))
    .reduce((s, i) => s + Number(i.total_amount), 0);

  return (
    <div>
      {editInv && (
        <EditInvoiceModal
          invoice={editInv}
          onSaved={() => { invalidateAll(); setEditInv(null); }}
          onCancel={() => setEditInv(null)}
        />
      )}

      {deleteInv && (
        <DeleteInvoiceModal
          invoice={deleteInv}
          userId={userId}
          onDeleted={() => { invalidateAll(); setDeleteInv(null); }}
          onCancel={() => setDeleteInv(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display font-semibold text-2xl text-text">{t("invoices.title")}</h1>
          {!q.isLoading && (
            <p className="text-text-muted text-sm mt-1">
              {t("invoices.summary", { count: enriched.length, amount: fmt(totalPayable) })}
            </p>
          )}
        </div>
        <button
          onClick={() => navigate("/captura")}
          className="flex items-center gap-2 h-9 px-4 rounded-lg font-semibold text-sm text-white flex-shrink-0"
          style={{ background: "linear-gradient(150deg,var(--brand),var(--brand-deep))", boxShadow: "0 4px 16px rgb(var(--brand-rgb) / 0.35)" }}
        >
          <Plus size={15} /> {t("invoices.newInvoice")}
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {FILTERS.map(({ key, labelKey }) => {
          const active = filter === key;
          return (
            <button
              key={key} onClick={() => setFilter(key)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: active ? "rgb(var(--brand-rgb) / 0.16)" : "rgba(27,39,66,0.55)",
                border:     active ? "1px solid rgb(var(--brand-rgb) / 0.35)" : "1px solid rgba(125,165,255,0.10)",
                color:      active ? "var(--brand)" : "#7c8896",
              }}
            >
              {t(labelKey)}
              <span className="text-[10px] font-bold rounded px-1.5 py-0.5"
                style={{ background: active ? "rgb(var(--brand-rgb) / 0.18)" : "rgba(125,165,255,0.08)", color: active ? "var(--brand)" : "#5f6b7a" }}>
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
            <AlertCircle size={16} /> {t("invoices.error")}
          </div>
        )}
        {!q.isLoading && !q.error && filtered.length === 0 && (
          <div className="flex flex-col items-center py-16 text-text-faint text-sm">
            <FileText size={32} className="mb-3 opacity-30" />
            <p>{filter === "todas" ? t("invoices.empty.all") : t("invoices.empty.category")}</p>
            {filter === "todas" && (
              <button onClick={() => navigate("/captura")}
                className="mt-4 text-brand text-xs font-medium hover:text-brand-soft transition-colors">
                {t("invoices.empty.cta")}
              </button>
            )}
          </div>
        )}

        {!q.isLoading && filtered.length > 0 && (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(125,165,255,0.08)" }}>
                {[
                  t("invoices.table.supplier"),
                  t("invoices.table.number"),
                  t("invoices.table.dueDate"),
                  t("invoices.table.amount"),
                  t("invoices.table.status"),
                  "",
                ].map((col, i) => (
                  <th key={i} className="text-left text-[10px] uppercase tracking-widest font-medium text-text-faint px-5 py-3.5">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv, idx) => {
                const rawName = supplierName(inv);
                const name  = rawName || t("dashboard.upcoming.supplier");
                const color = avatarColor(name);
                const style = STATUS_STYLE[inv.displayStatus];
                const days  = inv.due_date ? daysUntil(inv.due_date) : null;

                const dayLabel = days === null ? "—"
                  : days < 0 ? t("invoices.daysAgo", { count: Math.abs(days) })
                  : days === 0 ? t("invoices.dueToday")
                  : t("invoices.inDays", { count: days });

                return (
                  <tr
                    key={inv.id}
                    className="transition-colors"
                    style={{ borderBottom: idx < filtered.length - 1 ? "1px solid rgba(125,165,255,0.06)" : undefined }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgb(var(--brand-rgb) / 0.04)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "")}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center font-display font-bold text-xs flex-shrink-0"
                          style={{ background: `${color}22`, color }}>
                          {initials(name)}
                        </div>
                        <span className="text-text text-sm font-medium">{name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-text-muted text-sm">
                        {inv.invoice_number ? `#${inv.invoice_number}` : "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {inv.due_date && days !== null ? (
                        <div>
                          <div className="text-text text-sm">{inv.due_date}</div>
                          <div className="text-xs mt-0.5" style={{
                            color: days < 0 ? "#ff4d6d" : days <= 3 ? "#ffb84d" : "#7c8896",
                          }}>
                            {dayLabel}
                          </div>
                        </div>
                      ) : <span className="text-text-faint text-sm">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-display font-semibold text-sm text-text">
                        {fmt(inv.total_amount, inv.currency)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-semibold rounded-md px-2.5 py-1"
                        style={{ background: style.bg, color: style.color }}>
                        {statusLabel(inv.displayStatus)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 justify-end">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setEditInv(inv); }}
                          aria-label={t("common.edit")}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-text-dim hover:text-brand transition-colors"
                          style={{ background: "rgb(var(--brand-rgb) / 0.07)" }}
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setDeleteInv(inv); }}
                          aria-label={t("common.delete")}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-text-dim hover:text-danger transition-colors"
                          style={{ background: "rgba(255,77,109,0.07)" }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
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

// ── Edit Invoice Modal ────────────────────────────────────────────────────────

function EditInvoiceModal({ invoice, onSaved, onCancel }: {
  invoice: Invoice; onSaved: () => void; onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [total,    setTotal]    = useState(String(invoice.total_amount));
  const [currency, setCurrency] = useState(invoice.currency);
  const [dueDate,  setDueDate]  = useState(invoice.due_date ?? "");
  const [status,   setStatus]   = useState(invoice.status === "vencida" ? "pending" : invoice.status);
  const [err,      setErr]      = useState("");

  const mut = useMutation({
    mutationFn: async () => {
      const num = parseFloat(total);
      if (isNaN(num) || num <= 0) throw new Error(t("invoices.invalidAmount"));
      const { error } = await supabase
        .from("invoices")
        .update({ total_amount: num, currency: currency.trim() || "USD", due_date: dueDate || null, status })
        .eq("id", invoice.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: onSaved,
    onError: (e: any) => setErr(e.message ?? "Error"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(7,12,26,0.82)", backdropFilter: "blur(6px)" }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="rounded-2xl p-6 w-full max-w-sm" style={{
        background: "linear-gradient(180deg,rgba(20,32,60,0.95),rgba(9,14,30,0.95))",
        backdropFilter: "blur(20px) saturate(140%)",
        border: "1px solid rgba(125,165,255,0.16)",
      }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-semibold text-base text-text">{t("invoices.editTitle")}</h2>
          <button onClick={onCancel} className="text-text-dim hover:text-text transition-colors"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t("capture.form.total")} *</label>
              <input type="number" step="0.01" min="0" value={total}
                onChange={(e) => setTotal(e.target.value)} className={fieldCls} autoFocus />
            </div>
            <div>
              <label className={labelCls}>{t("capture.form.currency")}</label>
              <input type="text" value={currency} onChange={(e) => setCurrency(e.target.value)}
                placeholder="USD" className={fieldCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>{t("capture.form.dueDate")}</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              className={`${fieldCls} [color-scheme:dark]`} />
          </div>

          <div>
            <label className={labelCls}>{t("invoices.table.status")}</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className={`${fieldCls} cursor-pointer`}
              style={{ WebkitAppearance: "none" }}>
              <option value="pending">{t("invoices.status.pending")}</option>
              <option value="programada">{t("invoices.status.scheduled")}</option>
              <option value="paid">{t("invoices.status.paid")}</option>
            </select>
          </div>

          {err && <div className="flex items-center gap-2 text-danger text-xs"><AlertCircle size={13} />{err}</div>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => mut.mutate()} disabled={mut.isPending}
              className="flex-1 h-10 rounded-lg font-display font-semibold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: "linear-gradient(150deg,var(--brand),var(--brand-deep))", boxShadow: "0 4px 16px rgb(var(--brand-rgb) / 0.35)" }}>
              <Check size={14} /> {mut.isPending ? t("preferences.saving") : t("invoices.saveChanges")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Delete Invoice Modal ──────────────────────────────────────────────────────

function DeleteInvoiceModal({ invoice, userId, onDeleted, onCancel }: {
  invoice: Invoice; userId: string; onDeleted: () => void; onCancel: () => void;
}) {
  const { t } = useTranslation();
  const rawName = supplierName(invoice);
  const name = rawName || t("dashboard.upcoming.supplier");
  const [err, setErr] = useState("");

  const mut = useMutation({
    mutationFn: async () => {
      const { error: movErr } = await supabase
        .from("cash_movements").delete().eq("invoice_id", invoice.id).eq("user_id", userId);
      if (movErr) throw new Error(`Movimiento: ${movErr.message}`);
      const { error: invErr } = await supabase.from("invoices").delete().eq("id", invoice.id);
      if (invErr) throw new Error(`Factura: ${invErr.message}`);
    },
    onSuccess: onDeleted,
    onError: (e: any) => setErr(e.message ?? "Error"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(7,12,26,0.82)", backdropFilter: "blur(6px)" }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="rounded-2xl p-6 w-full max-w-sm" style={{
        background: "linear-gradient(180deg,rgba(20,32,60,0.95),rgba(9,14,30,0.95))",
        backdropFilter: "blur(20px) saturate(140%)",
        border: "1px solid rgba(255,77,109,0.20)",
      }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-base text-text">{t("invoices.deleteTitle")}</h2>
          <button onClick={onCancel} className="text-text-dim hover:text-text transition-colors"><X size={18} /></button>
        </div>

        <p className="text-text-muted text-sm mb-1">
          {t("invoices.deleteConfirm", { name })}
        </p>
        <p className="text-text-dim text-xs mb-5">{t("invoices.deleteWarning")}</p>

        {err && <div className="flex items-center gap-2 text-danger text-xs mb-3"><AlertCircle size={13} />{err}</div>}

        <div className="flex gap-2">
          <button type="button" onClick={() => mut.mutate()} disabled={mut.isPending}
            className="flex-1 h-10 rounded-lg font-semibold text-sm text-white disabled:opacity-50 flex items-center justify-center"
            style={{ background: "linear-gradient(150deg,#ff4d6d,#cc2244)" }}>
            {mut.isPending ? t("invoices.eliminating") : t("invoices.yes_delete")}
          </button>
          <button type="button" onClick={onCancel}
            className="flex-1 h-10 rounded-lg text-sm font-medium text-text-muted transition-colors"
            style={{ background: "rgba(125,165,255,0.07)", border: "1px solid rgba(125,165,255,0.12)" }}>
            {t("invoices.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
