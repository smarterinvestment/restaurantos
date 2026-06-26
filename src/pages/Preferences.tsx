import { useState, useEffect } from "react";
import { Bell, Mail, Save, Check, Smartphone } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw     = window.atob(base64);
  const output  = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

const GLASS = {
  background: "linear-gradient(180deg,rgba(20,32,60,0.55),rgba(9,14,30,0.55))",
  backdropFilter: "blur(20px) saturate(140%)",
  border: "1px solid rgba(125,165,255,0.12)",
} as const;

export default function Preferences() {
  const { session }           = useAuthStore();
  const userId                = session?.user.id ?? "";

  const [webEnabled,    setWebEnabled]    = useState(true);
  const [emailEnabled,  setEmailEnabled]  = useState(true);
  const [daysBefore,    setDaysBefore]    = useState(3);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [saved,         setSaved]         = useState(false);
  const [pushStatus,    setPushStatus]    = useState<"idle" | "requesting" | "granted" | "denied">("idle");

  // Load existing preferences
  useEffect(() => {
    if (!userId) return;
    supabase
      .from("notification_preferences")
      .select("web_enabled,email_enabled,days_before_due")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setWebEnabled(data.web_enabled);
          setEmailEnabled(data.email_enabled);
          setDaysBefore(data.days_before_due ?? 3);
        }
        setLoading(false);
      });

    // Detect current push permission
    if ("Notification" in window) {
      setPushStatus(
        Notification.permission === "granted" ? "granted"
        : Notification.permission === "denied" ? "denied"
        : "idle"
      );
    }
  }, [userId]);

  async function save() {
    if (!userId) return;
    setSaving(true);
    await supabase.from("notification_preferences").upsert(
      { user_id: userId, web_enabled: webEnabled, email_enabled: emailEnabled, days_before_due: daysBefore },
      { onConflict: "user_id" }
    );
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function registerPush() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      alert("Tu navegador no soporta notificaciones push.");
      return;
    }
    setPushStatus("requesting");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setPushStatus("denied");
      return;
    }
    setPushStatus("granted");

    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
    if (!vapidKey) {
      console.warn("[push] VITE_VAPID_PUBLIC_KEY not set — skipping subscription");
      return;
    }

    try {
      const reg  = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub  = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      await supabase.from("push_subscriptions").upsert(
        { user_id: userId, subscription: sub.toJSON() },
        { onConflict: "user_id" }
      );
    } catch (err) {
      console.error("[push] subscription error:", err);
    }
  }

  const pushSupported = typeof window !== "undefined" && "PushManager" in window;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-display font-semibold text-2xl text-text">Preferencias</h1>
        <p className="text-text-muted text-sm mt-1">Configura cómo y cuándo recibes alertas financieras.</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-text-dim text-sm py-8">
          <div className="w-4 h-4 rounded-full border-2 border-brand border-t-transparent animate-spin" />
          Cargando preferencias…
        </div>
      ) : (
        <>
          {/* Notification channels */}
          <div className="rounded-2xl p-6 space-y-5" style={GLASS}>
            <h2 className="font-display font-semibold text-sm text-text">Canales de notificación</h2>

            <Toggle
              icon={<Bell size={16} className="text-brand" />}
              label="Notificaciones en la app"
              description="Campana en la barra superior con alertas en tiempo real"
              checked={webEnabled}
              onChange={setWebEnabled}
            />

            <div className="h-px" style={{ background: "rgba(125,165,255,0.07)" }} />

            <Toggle
              icon={<Mail size={16} className="text-cyan" />}
              label="Notificaciones por email"
              description={`Resumen diario enviado a ${session?.user.email ?? "tu correo"}`}
              checked={emailEnabled}
              onChange={setEmailEnabled}
            />

            {pushSupported && (
              <>
                <div className="h-px" style={{ background: "rgba(125,165,255,0.07)" }} />
                <div className="flex items-start gap-4">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.20)" }}
                  >
                    <Smartphone size={16} style={{ color: "#a855f7" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-text text-sm font-medium">Notificaciones push</p>
                        <p className="text-text-dim text-xs mt-0.5">
                          Recibe alertas en el navegador aunque no estés en la app
                        </p>
                      </div>
                      {pushStatus === "granted" ? (
                        <span
                          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg flex-shrink-0"
                          style={{ background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.20)" }}
                        >
                          <Check size={12} /> Activas
                        </span>
                      ) : pushStatus === "denied" ? (
                        <span className="text-xs text-danger">Bloqueadas en el navegador</span>
                      ) : (
                        <button
                          onClick={registerPush}
                          disabled={pushStatus === "requesting"}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0 transition-all disabled:opacity-60"
                          style={{ background: "rgba(168,85,247,0.14)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.22)" }}
                        >
                          {pushStatus === "requesting" ? "Activando…" : "Activar push"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Alert timing */}
          <div className="rounded-2xl p-6" style={GLASS}>
            <h2 className="font-display font-semibold text-sm text-text mb-4">Anticipación de alertas</h2>
            <div className="flex items-center gap-5">
              <div className="flex-1">
                <p className="text-text-muted text-sm">Alertar con cuántos días de anticipación</p>
                <p className="text-text-faint text-xs mt-0.5">
                  Se mostrará una alerta cuando una factura venza en los próximos{" "}
                  <strong className="text-text">{daysBefore}</strong> día{daysBefore !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setDaysBefore(v => Math.max(1, v - 1))}
                  className="w-8 h-8 rounded-lg text-text-muted hover:text-text transition-colors flex items-center justify-center font-bold"
                  style={{ background: "rgba(27,39,66,0.6)", border: "1px solid rgba(125,165,255,0.10)" }}
                >
                  −
                </button>
                <div
                  className="w-12 h-8 rounded-lg flex items-center justify-center font-display font-bold text-text text-sm"
                  style={{ background: "rgba(61,139,255,0.10)", border: "1px solid rgba(61,139,255,0.18)" }}
                >
                  {daysBefore}
                </div>
                <button
                  onClick={() => setDaysBefore(v => Math.min(30, v + 1))}
                  className="w-8 h-8 rounded-lg text-text-muted hover:text-text transition-colors flex items-center justify-center font-bold"
                  style={{ background: "rgba(27,39,66,0.6)", border: "1px solid rgba(125,165,255,0.10)" }}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Save button */}
          <div className="flex justify-end">
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 h-10 px-5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-60"
              style={{ background: "linear-gradient(150deg,#3d8bff,#1f5fe0)", boxShadow: "0 4px 16px rgba(61,139,255,0.35)" }}
            >
              {saved ? (
                <><Check size={15} /> Guardado</>
              ) : saving ? (
                <><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Guardando…</>
              ) : (
                <><Save size={15} /> Guardar preferencias</>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Toggle sub-component ──────────────────────────────────────────────────────

function Toggle({
  icon, label, description, checked, onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-4">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: "rgba(27,39,66,0.6)", border: "1px solid rgba(125,165,255,0.10)" }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-text text-sm font-medium">{label}</p>
            <p className="text-text-dim text-xs mt-0.5">{description}</p>
          </div>
          <button
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className="relative flex-shrink-0 w-11 h-6 rounded-full transition-all duration-200"
            style={{
              background: checked ? "linear-gradient(150deg,#3d8bff,#1f5fe0)" : "rgba(27,39,66,0.8)",
              border: checked ? "none" : "1px solid rgba(125,165,255,0.15)",
              boxShadow: checked ? "0 2px 10px rgba(61,139,255,0.40)" : "none",
            }}
          >
            <span
              className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200"
              style={{ transform: checked ? "translateX(20px)" : "translateX(0)" }}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
