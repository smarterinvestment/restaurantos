import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Plus, Mail, Phone, X, Check, AlertCircle, Building2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";

// ── Types ─────────────────────────────────────────────────────────────────────

type Supplier = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  credit_days: number;
  category: string | null;
};

type Stats = { yearPurchases: number; pending: number };

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number, cur = "USD") {
  return new Intl.NumberFormat("es-US", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

const PALETTE = ["#3d8bff", "#00d4ff", "#a855f7", "#ffb84d", "#ff4d6d"];
function avatarColor(name: string) { return PALETTE[name.charCodeAt(0) % PALETTE.length]; }

const GLASS = {
  background: "linear-gradient(180deg,rgba(20,32,60,0.55),rgba(9,14,30,0.55))",
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

function useSuppliers(userId: string) {
  return useQuery({
    queryKey: ["suppliers", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("suppliers")
        .select("id,name,email,phone,credit_days,category")
        .eq("user_id", userId)
        .order("name");
      return (data ?? []) as Supplier[];
    },
  });
}

function useSupplierStats(userId: string) {
  return useQuery({
    queryKey: ["supplier-stats", userId],
    queryFn: async () => {
      const yearStart = new Date(); yearStart.setMonth(0); yearStart.setDate(1);
      const yearStartStr = yearStart.toISOString().split("T")[0];

      const { data } = await supabase
        .from("invoices")
        .select("supplier_id,total_amount,status,issue_date")
        .eq("user_id", userId)
        .not("supplier_id", "is", null);

      const map: Record<string, Stats> = {};
      for (const inv of data ?? []) {
        if (!inv.supplier_id) continue;
        if (!map[inv.supplier_id]) map[inv.supplier_id] = { yearPurchases: 0, pending: 0 };
        if ((inv.issue_date ?? "") >= yearStartStr) {
          map[inv.supplier_id].yearPurchases += Number(inv.total_amount);
        }
        if (["pending", "programada"].includes(inv.status)) {
          map[inv.supplier_id].pending += Number(inv.total_amount);
        }
      }
      return map as Record<string, Stats>;
    },
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Suppliers() {
  const { t } = useTranslation();
  const userId = useAuthStore((s) => s.session!.user.id);
  const qc     = useQueryClient();

  const suppliersQ = useSuppliers(userId);
  const statsQ     = useSupplierStats(userId);

  const [mode,   setMode]   = useState<"closed" | "create" | "edit">("closed");
  const [target, setTarget] = useState<Supplier | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["suppliers",      userId] });
    qc.invalidateQueries({ queryKey: ["supplier-stats", userId] });
  };

  const suppliers = suppliersQ.data ?? [];
  const stats     = statsQ.data ?? {};

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display font-semibold text-2xl text-text">{t("suppliers.title")}</h1>
          {!suppliersQ.isLoading && (
            <p className="text-text-muted text-sm mt-1">
              {t("suppliers.count", { count: suppliers.length })}
            </p>
          )}
        </div>
        <button
          onClick={() => { setTarget(null); setMode("create"); }}
          className="flex items-center gap-2 h-9 px-4 rounded-lg font-semibold text-sm text-white flex-shrink-0"
          style={{ background: "linear-gradient(150deg,#3d8bff,#1f5fe0)", boxShadow: "0 4px 16px rgba(61,139,255,0.35)" }}
        >
          <Plus size={15} /> {t("suppliers.newSupplier")}
        </button>
      </div>

      {/* Modal */}
      {mode !== "closed" && (
        <SupplierModal
          mode={mode}
          initial={target}
          userId={userId}
          onSaved={() => { invalidate(); setMode("closed"); }}
          onCancel={() => setMode("closed")}
        />
      )}

      {suppliersQ.isLoading && (
        <div className="flex justify-center py-16">
          <div className="w-5 h-5 rounded-full border-2 border-brand border-t-transparent animate-spin" />
        </div>
      )}

      {suppliersQ.error && (
        <div className="flex items-center gap-2 text-danger text-sm p-4">
          <AlertCircle size={16} /> {t("suppliers.error")}
        </div>
      )}

      {!suppliersQ.isLoading && suppliers.length === 0 && (
        <div className="rounded-2xl flex flex-col items-center py-16 text-text-faint text-sm" style={GLASS}>
          <Building2 size={32} className="mb-3 opacity-30" />
          <p>{t("suppliers.empty")}</p>
          <button
            onClick={() => { setTarget(null); setMode("create"); }}
            className="mt-4 text-brand text-xs font-medium hover:text-brand-soft transition-colors"
          >
            {t("suppliers.emptyCta")}
          </button>
        </div>
      )}

      {!suppliersQ.isLoading && suppliers.length > 0 && (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))" }}>
          {suppliers.map(sup => (
            <SupplierCard
              key={sup.id}
              supplier={sup}
              stats={stats[sup.id] ?? { yearPurchases: 0, pending: 0 }}
              onClick={() => { setTarget(sup); setMode("edit"); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Supplier Card ─────────────────────────────────────────────────────────────

function SupplierCard({ supplier: s, stats, onClick }: {
  supplier: Supplier; stats: Stats; onClick: () => void;
}) {
  const { t } = useTranslation();
  const color = avatarColor(s.name);
  return (
    <div
      className="rounded-2xl p-5 cursor-pointer transition-transform hover:scale-[1.015]"
      style={GLASS}
      onClick={onClick}
    >
      <div className="flex items-start gap-3 mb-4">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center font-display font-bold text-base flex-shrink-0"
          style={{ background: `${color}22`, color }}
        >
          {initials(s.name)}
        </div>
        <div className="min-w-0">
          <div className="text-text font-semibold text-sm leading-tight">{s.name}</div>
          <div className="text-text-dim text-xs mt-0.5">
            {s.credit_days > 0 ? t("suppliers.card.credit", { days: s.credit_days }) : t("suppliers.card.cash")}
          </div>
          {s.category && (
            <span className="inline-block text-[10px] font-medium rounded px-1.5 py-0.5 mt-1"
              style={{ background: "rgba(125,165,255,0.10)", color: "#7c8896" }}>
              {s.category}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1.5 mb-4 min-h-[2.5rem]">
        {s.email && (
          <div className="flex items-center gap-2 text-text-dim text-xs">
            <Mail size={11} className="flex-shrink-0" />
            <span className="truncate">{s.email}</span>
          </div>
        )}
        {s.phone && (
          <div className="flex items-center gap-2 text-text-dim text-xs">
            <Phone size={11} className="flex-shrink-0" />
            <span>{s.phone}</span>
          </div>
        )}
        {!s.email && !s.phone && (
          <div className="text-text-faint text-xs">{t("suppliers.card.noContact")}</div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-xl p-3" style={{ background: "rgba(27,39,66,0.50)" }}>
        <div>
          <div className="text-text-faint text-[10px] uppercase tracking-wider font-medium mb-1">
            {t("suppliers.card.yearPurchases")}
          </div>
          <div className="font-display font-semibold text-sm text-text">{fmt(stats.yearPurchases)}</div>
        </div>
        <div>
          <div className="text-text-faint text-[10px] uppercase tracking-wider font-medium mb-1">
            {t("suppliers.card.payable")}
          </div>
          <div className="font-display font-semibold text-sm"
            style={{ color: stats.pending > 0 ? "#ff4d6d" : "#7c8896" }}>
            {fmt(stats.pending)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Supplier Modal ────────────────────────────────────────────────────────────

function SupplierModal({ mode, initial, userId, onSaved, onCancel }: {
  mode: "create" | "edit";
  initial: Supplier | null;
  userId: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [name,       setName]       = useState(initial?.name ?? "");
  const [email,      setEmail]      = useState(initial?.email ?? "");
  const [phone,      setPhone]      = useState(initial?.phone ?? "");
  const [creditDays, setCreditDays] = useState(String(initial?.credit_days ?? 0));
  const [category,   setCategory]   = useState(initial?.category ?? "");
  const [err,        setErr]        = useState("");

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error(t("suppliers.modal.nameRequired"));
      const payload = {
        name:        name.trim(),
        email:       email.trim() || null,
        phone:       phone.trim() || null,
        credit_days: parseInt(creditDays) || 0,
        category:    category.trim() || null,
      };
      if (mode === "create") {
        const { error } = await supabase.from("suppliers").insert({ ...payload, user_id: userId });
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("suppliers").update(payload).eq("id", initial!.id);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: onSaved,
    onError: (e: any) => setErr(e.message ?? "Error"),
  });

  const delMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("suppliers").delete().eq("id", initial!.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: onSaved,
    onError: (e: any) => setErr(e.message ?? "Error"),
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(7,12,26,0.82)", backdropFilter: "blur(6px)" }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="rounded-2xl p-6 w-full max-w-md" style={GLASS}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-semibold text-base text-text">
            {mode === "create" ? t("suppliers.modal.createTitle") : t("suppliers.modal.editTitle")}
          </h2>
          <button onClick={onCancel} className="text-text-dim hover:text-text transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className={labelCls}>{t("suppliers.modal.name")} *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder={t("suppliers.modal.namePlaceholder")} className={fieldCls} autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t("suppliers.modal.email")}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder={t("suppliers.modal.emailPlaceholder")} className={fieldCls} />
            </div>
            <div>
              <label className={labelCls}>{t("suppliers.modal.phone")}</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder={t("suppliers.modal.phonePlaceholder")} className={fieldCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t("suppliers.modal.creditDays")}</label>
              <input type="number" min="0" value={creditDays} onChange={(e) => setCreditDays(e.target.value)}
                placeholder="0" className={fieldCls} />
            </div>
            <div>
              <label className={labelCls}>{t("suppliers.modal.category")}</label>
              <input type="text" value={category} onChange={(e) => setCategory(e.target.value)}
                placeholder={t("suppliers.modal.categoryPlaceholder")} className={fieldCls} />
            </div>
          </div>

          {err && (
            <div className="flex items-center gap-2 text-danger text-xs">
              <AlertCircle size={13} /> {err}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}
              className="flex-1 h-10 rounded-lg font-display font-semibold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: "linear-gradient(150deg,#3d8bff,#1f5fe0)", boxShadow: "0 4px 16px rgba(61,139,255,0.35)" }}
            >
              <Check size={14} />
              {saveMut.isPending
                ? t("suppliers.modal.saving")
                : mode === "create" ? t("suppliers.modal.create") : t("suppliers.modal.saveChanges")}
            </button>

            {mode === "edit" && (
              <button
                type="button" onClick={() => delMut.mutate()} disabled={delMut.isPending}
                className="h-10 px-4 rounded-lg text-sm font-semibold text-danger transition-colors disabled:opacity-50"
                style={{ border: "1px solid rgba(255,77,109,0.25)", background: "rgba(255,77,109,0.06)" }}
              >
                {delMut.isPending ? "…" : t("suppliers.modal.delete")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
