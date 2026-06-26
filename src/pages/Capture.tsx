import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  Upload,
  FileImage,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";

// ── Types ─────────────────────────────────────────────────────────────────────

type LineItem = {
  description: string;
  quantity: string;
  unit_price: string;
  line_total: string;
};

type InvoiceDraft = {
  supplier_name: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  currency: string;
  subtotal: string;
  tax: string;
  total_amount: string;
  line_items: LineItem[];
};

type Stage =
  | { name: "idle" }
  | { name: "uploading"; preview: string }
  | { name: "extracting"; preview: string; storagePath: string }
  | { name: "confirming"; preview: string; storagePath: string; draft: InvoiceDraft }
  | { name: "saving" }
  | { name: "error"; message: string };

// ── Helpers ───────────────────────────────────────────────────────────────────

function toBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res((reader.result as string).split(",")[1]);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

function numStr(v: number | null | undefined): string {
  return v != null ? String(v) : "";
}

function strNum(s: string): number | null {
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;

// ── Main Component ────────────────────────────────────────────────────────────

export default function Capture() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.session!.user.id);
  const [stage, setStage] = useState<Stage>({ name: "idle" });
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  async function processFile(file: File) {
    if (!ACCEPTED.includes(file.type)) {
      setStage({ name: "error", message: "Solo se aceptan imágenes JPG, PNG o WEBP." });
      return;
    }
    if (file.size > MAX_BYTES) {
      setStage({ name: "error", message: "La imagen supera el límite de 10 MB." });
      return;
    }

    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const preview = URL.createObjectURL(file);
    previewUrlRef.current = preview;
    setStage({ name: "uploading", preview });

    try {
      // 1. Upload to Supabase Storage bucket "invoices"
      const ext = file.name.split(".").pop() ?? "jpg";
      const storagePath = `${userId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("invoices")
        .upload(storagePath, file, { contentType: file.type, upsert: false });

      if (uploadError) throw new Error(`Error al subir imagen: ${uploadError.message}`);

      setStage({ name: "extracting", preview, storagePath });

      // 2. Call Claude Vision API via serverless function
      const imageBase64 = await toBase64(file);
      const res = await fetch("/api/extract-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, mediaType: file.type }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `La API respondió con error ${res.status}`);
      }

      const { invoice } = await res.json();

      // 3. Build editable draft and go to confirmation
      const draft: InvoiceDraft = {
        supplier_name: invoice.supplier_name ?? "",
        invoice_number: invoice.invoice_number ?? "",
        issue_date: invoice.issue_date ?? "",
        due_date: invoice.due_date ?? "",
        currency: invoice.currency ?? "USD",
        subtotal: numStr(invoice.subtotal),
        tax: numStr(invoice.tax),
        total_amount: numStr(invoice.total_amount),
        line_items: (invoice.line_items ?? []).map((li: any) => ({
          description: li.description ?? "",
          quantity: numStr(li.quantity),
          unit_price: numStr(li.unit_price),
          line_total: numStr(li.line_total),
        })),
      };

      setStage({ name: "confirming", preview, storagePath, draft });
    } catch (err: any) {
      setStage({ name: "error", message: err.message ?? "Error desconocido." });
    }
  }

  async function handleConfirm(draft: InvoiceDraft, storagePath: string) {
    setStage({ name: "saving" });
    try {
      // 1. Find or create supplier
      let supplierId: string;
      const { data: existing } = await supabase
        .from("suppliers")
        .select("id")
        .eq("user_id", userId)
        .ilike("name", draft.supplier_name.trim())
        .maybeSingle();

      if (existing) {
        supplierId = existing.id;
      } else {
        const { data: newSup, error: supErr } = await supabase
          .from("suppliers")
          .insert({ user_id: userId, name: draft.supplier_name.trim() })
          .select("id")
          .single();
        if (supErr) throw new Error(`Proveedor: ${supErr.message}`);
        supplierId = newSup.id;
      }

      // 2. Create invoice record
      const { data: inv, error: invErr } = await supabase
        .from("invoices")
        .insert({
          user_id: userId,
          supplier_id: supplierId,
          invoice_number: draft.invoice_number || null,
          issue_date: draft.issue_date || null,
          due_date: draft.due_date || null,
          currency: draft.currency || "USD",
          subtotal: strNum(draft.subtotal),
          tax: strNum(draft.tax),
          total_amount: strNum(draft.total_amount) ?? 0,
          status: "pending",
          image_url: storagePath,
        })
        .select("id")
        .single();
      if (invErr) throw new Error(`Factura: ${invErr.message}`);

      // 3. Create line items
      const validLines = draft.line_items.filter((li) => li.description.trim());
      if (validLines.length > 0) {
        const { error: liErr } = await supabase.from("invoice_items").insert(
          validLines.map((li) => ({
            invoice_id: inv.id,
            description: li.description,
            quantity: strNum(li.quantity),
            unit_price: strNum(li.unit_price),
            line_total: strNum(li.line_total),
          }))
        );
        if (liErr) throw new Error(`Líneas: ${liErr.message}`);
      }

      // 4. Create cash movement (expense) — triggered by confirmed invoice
      const today = new Date().toISOString().split("T")[0];
      const { error: movErr } = await supabase.from("cash_movements").insert({
        user_id: userId,
        type: "expense",
        amount: strNum(draft.total_amount) ?? 0,
        currency: draft.currency || "USD",
        description: `Factura ${draft.invoice_number || "s/n"} — ${draft.supplier_name}`,
        occurred_at: draft.due_date || today,
        source: "invoice",
        invoice_id: inv.id,
      });
      if (movErr) throw new Error(`Movimiento: ${movErr.message}`);

      // 5. Refresh dashboard data and navigate
      qc.invalidateQueries({ queryKey: ["upcoming-invoices", userId] });
      qc.invalidateQueries({ queryKey: ["cash-position",    userId] });
      qc.invalidateQueries({ queryKey: ["dashboard-data",   userId] });
      navigate("/dashboard");
    } catch (err: any) {
      setStage({ name: "error", message: err.message ?? "Error al guardar." });
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display font-semibold text-2xl text-text">
          Captura de factura
        </h1>
        <p className="text-text-muted text-sm mt-1">
          Sube una imagen y revisa los datos extraídos antes de guardar.
        </p>
      </div>

      {stage.name === "idle" && (
        <Dropzone
          dragOver={dragOver}
          inputRef={inputRef}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onFileChange={handleFileChange}
          onClick={() => inputRef.current?.click()}
        />
      )}

      {(stage.name === "uploading" || stage.name === "extracting") && (
        <ProcessingCard
          preview={stage.preview}
          status={
            stage.name === "uploading"
              ? "Subiendo imagen a Supabase Storage…"
              : "Extrayendo datos con Claude Vision…"
          }
        />
      )}

      {stage.name === "confirming" && (
        <ConfirmForm
          preview={stage.preview}
          initialDraft={stage.draft}
          storagePath={stage.storagePath}
          onConfirm={handleConfirm}
          onDiscard={() => setStage({ name: "idle" })}
        />
      )}

      {stage.name === "saving" && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="text-brand animate-spin" size={32} />
          <p className="text-text-muted text-sm">Guardando factura…</p>
        </div>
      )}

      {stage.name === "error" && (
        <ErrorCard
          message={stage.message}
          onRetry={() => setStage({ name: "idle" })}
        />
      )}
    </div>
  );
}

// ── Dropzone ──────────────────────────────────────────────────────────────────

function Dropzone({
  dragOver,
  inputRef,
  onDrop,
  onDragOver,
  onDragLeave,
  onFileChange,
  onClick,
}: {
  dragOver: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClick: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Subir factura"
      onClick={onClick}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className="rounded-2xl flex flex-col items-center justify-center cursor-pointer select-none transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      style={{
        minHeight: 340,
        background: dragOver
          ? "linear-gradient(180deg, rgba(61,139,255,0.12), rgba(9,14,30,0.60))"
          : "linear-gradient(180deg, rgba(20,32,60,0.55), rgba(9,14,30,0.55))",
        backdropFilter: "blur(20px) saturate(140%)",
        border: dragOver
          ? "1.5px dashed rgba(61,139,255,0.65)"
          : "1.5px dashed rgba(125,165,255,0.22)",
        boxShadow: dragOver ? "0 0 0 4px rgba(61,139,255,0.10)" : undefined,
        transition: "all 0.15s ease",
      }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-transform"
        style={{
          background: dragOver ? "rgba(61,139,255,0.20)" : "rgba(61,139,255,0.10)",
          transform: dragOver ? "scale(1.08)" : "scale(1)",
        }}
      >
        {dragOver ? (
          <FileImage size={28} className="text-brand" />
        ) : (
          <Upload size={28} className="text-brand" />
        )}
      </div>

      <p className="font-display font-semibold text-base text-text mb-1.5">
        {dragOver ? "Suelta para procesar" : "Arrastra una factura aquí"}
      </p>
      <p className="text-text-faint text-sm">JPG, PNG o WEBP · Máx. 10 MB</p>
      <p className="text-text-dim text-xs mt-3">o haz clic para seleccionar</p>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onFileChange}
      />
    </div>
  );
}

// ── ProcessingCard ────────────────────────────────────────────────────────────

function ProcessingCard({ preview, status }: { preview: string; status: string }) {
  return (
    <div
      className="rounded-2xl p-8 flex flex-col items-center gap-6"
      style={{
        background: "linear-gradient(180deg, rgba(20,32,60,0.55), rgba(9,14,30,0.55))",
        backdropFilter: "blur(20px) saturate(140%)",
        border: "1px solid rgba(125,165,255,0.12)",
      }}
    >
      <img
        src={preview}
        alt="Factura en proceso"
        className="rounded-xl object-contain"
        style={{ maxHeight: 260, maxWidth: "100%", opacity: 0.7 }}
      />
      <div className="flex items-center gap-2.5 text-text-muted text-sm">
        <Loader2 className="text-brand animate-spin flex-shrink-0" size={17} />
        {status}
      </div>
      <div
        className="h-0.5 rounded-full w-52 overflow-hidden"
        style={{ background: "rgba(125,165,255,0.12)" }}
      >
        <div
          className="h-full rounded-full animate-pulse"
          style={{
            background: "linear-gradient(90deg, #3d8bff, #00d4ff)",
            width: "55%",
          }}
        />
      </div>
    </div>
  );
}

// ── ConfirmForm ───────────────────────────────────────────────────────────────

function ConfirmForm({
  preview,
  initialDraft,
  storagePath,
  onConfirm,
  onDiscard,
}: {
  preview: string;
  initialDraft: InvoiceDraft;
  storagePath: string;
  onConfirm: (draft: InvoiceDraft, storagePath: string) => void;
  onDiscard: () => void;
}) {
  const [draft, setDraft] = useState<InvoiceDraft>(initialDraft);

  function set<K extends keyof InvoiceDraft>(key: K, value: InvoiceDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function setLine(idx: number, key: keyof LineItem, value: string) {
    setDraft((d) => ({
      ...d,
      line_items: d.line_items.map((li, i) => (i === idx ? { ...li, [key]: value } : li)),
    }));
  }

  function addLine() {
    setDraft((d) => ({
      ...d,
      line_items: [
        ...d.line_items,
        { description: "", quantity: "", unit_price: "", line_total: "" },
      ],
    }));
  }

  function removeLine(idx: number) {
    setDraft((d) => ({ ...d, line_items: d.line_items.filter((_, i) => i !== idx) }));
  }

  const canSave = draft.supplier_name.trim().length > 0 && draft.total_amount.trim().length > 0;

  return (
    <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 1.45fr", alignItems: "start" }}>
      {/* Left: image preview */}
      <div
        className="rounded-2xl p-5 sticky top-8"
        style={{
          background: "linear-gradient(180deg, rgba(20,32,60,0.55), rgba(9,14,30,0.55))",
          backdropFilter: "blur(20px) saturate(140%)",
          border: "1px solid rgba(125,165,255,0.12)",
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle size={13} className="text-brand" />
          <span className="text-text-dim text-[10px] font-medium uppercase tracking-widest">
            Imagen procesada
          </span>
        </div>
        <img
          src={preview}
          alt="Factura capturada"
          className="rounded-xl w-full object-contain"
          style={{ maxHeight: 500 }}
        />
      </div>

      {/* Right: editable form */}
      <div
        className="rounded-2xl p-6"
        style={{
          background: "linear-gradient(180deg, rgba(20,32,60,0.55), rgba(9,14,30,0.55))",
          backdropFilter: "blur(20px) saturate(140%)",
          border: "1px solid rgba(125,165,255,0.12)",
        }}
      >
        <h2 className="font-display font-semibold text-base text-text mb-1">
          Confirma los datos extraídos
        </h2>
        <p className="text-text-dim text-xs mb-6">
          Revisa y corrige cualquier campo antes de guardar.
        </p>

        <div className="space-y-4">
          <Field label="Proveedor *">
            <input
              type="text"
              value={draft.supplier_name}
              onChange={(e) => set("supplier_name", e.target.value)}
              placeholder="Nombre del proveedor"
              className={fieldCls}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="N° de factura">
              <input
                type="text"
                value={draft.invoice_number}
                onChange={(e) => set("invoice_number", e.target.value)}
                placeholder="001-001-0001"
                className={fieldCls}
              />
            </Field>
            <Field label="Moneda">
              <input
                type="text"
                value={draft.currency}
                onChange={(e) => set("currency", e.target.value)}
                placeholder="USD"
                className={fieldCls}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha de emisión">
              <input
                type="date"
                value={draft.issue_date}
                onChange={(e) => set("issue_date", e.target.value)}
                className={`${fieldCls} [color-scheme:dark]`}
              />
            </Field>
            <Field label="Fecha de vencimiento">
              <input
                type="date"
                value={draft.due_date}
                onChange={(e) => set("due_date", e.target.value)}
                className={`${fieldCls} [color-scheme:dark]`}
              />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Subtotal">
              <input
                type="number"
                value={draft.subtotal}
                onChange={(e) => set("subtotal", e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className={fieldCls}
              />
            </Field>
            <Field label="Impuestos">
              <input
                type="number"
                value={draft.tax}
                onChange={(e) => set("tax", e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className={fieldCls}
              />
            </Field>
            <Field label="Total *">
              <input
                type="number"
                value={draft.total_amount}
                onChange={(e) => set("total_amount", e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className={fieldCls}
              />
            </Field>
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className={labelCls}>Líneas de la factura</span>
              <button
                type="button"
                onClick={addLine}
                className="flex items-center gap-1.5 text-brand text-xs font-medium hover:text-brand-soft transition-colors"
              >
                <Plus size={13} /> Agregar línea
              </button>
            </div>

            {draft.line_items.length === 0 ? (
              <p className="text-text-faint text-xs py-1">Sin líneas detectadas</p>
            ) : (
              <div className="space-y-2">
                {draft.line_items.map((li, idx) => (
                  <LineItemRow
                    key={idx}
                    item={li}
                    onChange={(k, v) => setLine(idx, k, v)}
                    onRemove={() => removeLine(idx)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div
          className="flex items-center gap-3 mt-8 pt-6"
          style={{ borderTop: "1px solid rgba(125,165,255,0.10)" }}
        >
          <button
            type="button"
            onClick={() => onConfirm(draft, storagePath)}
            disabled={!canSave}
            className="flex-1 h-11 rounded-lg font-display font-semibold text-sm text-white transition-all"
            style={{
              background: canSave
                ? "linear-gradient(150deg, #3d8bff, #1f5fe0)"
                : "rgba(61,139,255,0.20)",
              boxShadow: canSave
                ? "0 6px 22px rgba(61,139,255,0.40), inset 0 1px 1px rgba(255,255,255,0.12)"
                : undefined,
              cursor: canSave ? "pointer" : "not-allowed",
              color: canSave ? "#ffffff" : "rgba(232,237,242,0.35)",
            }}
          >
            Confirmar y guardar
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="h-11 px-5 rounded-lg font-medium text-sm text-text-muted hover:text-text transition-colors"
            style={{
              background: "rgba(125,165,255,0.07)",
              border: "1px solid rgba(125,165,255,0.12)",
            }}
          >
            Descartar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── LineItemRow ───────────────────────────────────────────────────────────────

function LineItemRow({
  item,
  onChange,
  onRemove,
}: {
  item: LineItem;
  onChange: (key: keyof LineItem, value: string) => void;
  onRemove: () => void;
}) {
  return (
    <div
      className="flex items-center gap-2 rounded-xl p-2.5"
      style={{ background: "rgba(27,39,66,0.55)" }}
    >
      <input
        type="text"
        value={item.description}
        onChange={(e) => onChange("description", e.target.value)}
        placeholder="Descripción"
        className={`${fieldCls} flex-1 min-w-0`}
      />
      <input
        type="number"
        value={item.quantity}
        onChange={(e) => onChange("quantity", e.target.value)}
        placeholder="Cant."
        step="0.01"
        min="0"
        className={`${fieldCls} w-20 flex-shrink-0`}
      />
      <input
        type="number"
        value={item.unit_price}
        onChange={(e) => onChange("unit_price", e.target.value)}
        placeholder="P/u"
        step="0.01"
        min="0"
        className={`${fieldCls} w-24 flex-shrink-0`}
      />
      <input
        type="number"
        value={item.line_total}
        onChange={(e) => onChange("line_total", e.target.value)}
        placeholder="Total"
        step="0.01"
        min="0"
        className={`${fieldCls} w-24 flex-shrink-0`}
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label="Eliminar línea"
        className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 text-text-dim hover:text-danger transition-colors"
        style={{ background: "rgba(255,77,109,0.07)" }}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

// ── ErrorCard ─────────────────────────────────────────────────────────────────

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      className="rounded-2xl p-10 flex flex-col items-center gap-4 text-center"
      style={{
        background: "linear-gradient(180deg, rgba(20,32,60,0.55), rgba(9,14,30,0.55))",
        backdropFilter: "blur(20px) saturate(140%)",
        border: "1px solid rgba(255,77,109,0.18)",
      }}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: "rgba(255,77,109,0.10)" }}
      >
        <AlertCircle size={24} className="text-danger" />
      </div>
      <div>
        <p className="text-text font-medium mb-1.5">Algo salió mal</p>
        <p className="text-text-dim text-sm max-w-sm">{message}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="mt-1 h-10 px-6 rounded-lg text-sm font-semibold text-white transition-all"
        style={{
          background: "linear-gradient(150deg, #3d8bff, #1f5fe0)",
          boxShadow: "0 4px 16px rgba(61,139,255,0.35)",
        }}
      >
        Intentar de nuevo
      </button>
    </div>
  );
}

// ── Shared UI helpers ─────────────────────────────────────────────────────────

const labelCls = "block text-text-dim text-xs font-medium mb-1.5";

const fieldCls = [
  "h-9 rounded-lg px-3 text-sm text-text",
  "bg-[rgba(27,39,66,0.65)]",
  "border border-[rgba(125,165,255,0.14)] focus:border-[rgba(61,139,255,0.45)]",
  "outline-none transition-colors placeholder:text-text-faint",
  "w-full",
].join(" ");

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}
