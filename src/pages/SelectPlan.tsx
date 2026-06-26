import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Check, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";

const PRICE_BASICO = "price_1Tmfz3ITKXKBIUvUWX94Dsx9";
const PRICE_PRO    = "price_1Tmg18ITKXKBIUvUkLl9OPfm";

const PLANS = [
  {
    id: "basico" as const,
    name: "Básico",
    priceMonthly: 29,
    priceMonthlyId: PRICE_BASICO,
    features: [
      "Captura de facturas con IA",
      "Dashboard financiero completo",
      "Ingresos y caja",
      "Proveedores ilimitados",
      "App móvil y web (ES/EN)",
    ],
    popular: false,
  },
  {
    id: "pro" as const,
    name: "Pro",
    priceMonthly: 59,
    priceMonthlyId: PRICE_PRO,
    features: [
      "Todo lo de Básico",
      "Asistente financiero IA",
      "Flujo de caja proyectado",
      "Alertas inteligentes avanzadas",
      "Reportes y varias sucursales",
    ],
    popular: true,
  },
];

export default function SelectPlan() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const preselected = params.get("plan") as "basico" | "pro" | null;
  const [selected, setSelected] = useState<"basico" | "pro">(preselected ?? "basico");
  const [loading, setLoading] = useState(false);
  const [emailConfirmed, setEmailConfirmed] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmailConfirmed(!!user?.email_confirmed_at);
    });
  }, []);

  const handleSelectPlan = async (priceId: string) => {
    try {
      setLoading(true);
      console.log('Iniciando pago con priceId:', priceId);

      const { data: { user } } = await supabase.auth.getUser();
      console.log('Usuario:', user?.id, user?.email);

      if (!user) {
        alert('No hay sesión activa');
        return;
      }

      const response = await fetch('/api/stripe-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          userId: user.id,
          email: user.email,
        }),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers.get('content-type'));

      const text = await response.text();
      console.log('Raw response body:', text);

      if (!text) {
        throw new Error('El servidor devolvió respuesta vacía');
      }

      const data = JSON.parse(text);
      console.log('Data parseada:', data);

      if (data.url) {
        console.log('Redirigiendo a Stripe:', data.url);
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'No se recibió URL de Stripe');
      }
    } catch (err: unknown) {
      console.error('Error completo:', err);
      alert('Error: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{
        background:
          "radial-gradient(1200px 600px at 80% -10%, rgb(var(--brand-rgb) / 0.10), transparent 60%), radial-gradient(900px 500px at -5% 110%, rgb(var(--brand-cyan-rgb) / 0.06), transparent 55%), #070c1a",
      }}
    >
      {/* Header */}
      <div className="text-center mb-10">
        <img src="/icon-192.png" alt="Logo" className="w-14 h-14 rounded-2xl object-contain mx-auto mb-4" />
        <h1 className="font-display font-bold text-3xl text-text mb-2">Elige tu plan</h1>
        <p className="text-text-muted text-sm">
          Empieza con 14 días gratis. Cancela cuando quieras.
        </p>
      </div>

      {/* Plan cards */}
      <div className="flex flex-col sm:flex-row gap-5 w-full max-w-2xl">
        {PLANS.map(plan => {
          const isSelected = selected === plan.id;
          return (
            <button
              key={plan.id}
              onClick={() => setSelected(plan.id)}
              className="relative flex-1 text-left rounded-2xl p-6 transition-all focus:outline-none"
              style={{
                background: isSelected
                  ? "linear-gradient(135deg, rgb(var(--brand-rgb) / 0.15), rgb(var(--brand-rgb) / 0.05))"
                  : "var(--glass-bg)",
                backdropFilter: "blur(20px) saturate(140%)",
                border: isSelected
                  ? "1.5px solid rgb(var(--brand-rgb) / 0.55)"
                  : "1px solid var(--glass-border)",
                boxShadow: isSelected ? "0 0 28px rgb(var(--brand-rgb) / 0.18)" : "none",
              }}
            >
              {plan.popular && (
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-bold px-3 py-0.5 rounded-full text-white"
                  style={{ background: "linear-gradient(90deg,var(--brand),var(--brand-cyan))" }}
                >
                  MÁS POPULAR
                </span>
              )}

              <div className="flex items-center justify-between mb-1">
                <span className="font-display font-semibold text-lg text-text">{plan.name}</span>
                <span
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    borderColor: isSelected ? "var(--brand)" : "var(--glass-border)",
                    background: isSelected ? "var(--brand)" : "transparent",
                  }}
                >
                  {isSelected && <Check size={11} strokeWidth={3} className="text-white" />}
                </span>
              </div>

              <div className="mb-5">
                <span className="font-display font-bold text-3xl text-text">${plan.priceMonthly}</span>
                <span className="text-text-muted text-sm">/mes</span>
              </div>

              <ul className="space-y-2">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-text-muted text-sm">
                    <Check size={13} className="text-brand mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      {/* Email not confirmed warning */}
      {emailConfirmed === false && (
        <div
          className="mt-4 w-full max-w-2xl rounded-lg px-4 py-3 text-sm text-center"
          style={{ background: "rgb(var(--brand-rgb) / 0.08)", color: "#9cc4ff", border: "1px solid rgb(var(--brand-rgb) / 0.15)" }}
        >
          Revisa tu email y confirma tu cuenta para activar el plan de pago.
        </div>
      )}

      {/* CTA buttons */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3 w-full max-w-2xl">
        <button
          onClick={() => handleSelectPlan(PLANS.find(p => p.id === selected)!.priceMonthlyId)}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3.5 font-semibold text-sm text-white transition-opacity disabled:opacity-50"
          style={{
            background: "linear-gradient(150deg,var(--brand),var(--brand-deep))",
            boxShadow: "0 6px 22px rgb(var(--brand-rgb) / 0.40)",
          }}
        >
          {loading && <Loader2 size={15} className="animate-spin" />}
          Continuar con plan {selected === "pro" ? "Pro" : "Básico"} →
        </button>

        <button
          onClick={() => navigate("/dashboard")}
          className="flex-1 rounded-xl py-3.5 font-medium text-sm text-text-muted transition-colors hover:text-text"
          style={{ background: "rgb(var(--elevated-rgb) / 0.40)", border: "1px solid var(--glass-border)" }}
        >
          Continuar con plan gratuito
        </button>
      </div>

      <p className="mt-5 text-text-faint text-xs text-center">
        Pagas con tarjeta de forma segura a través de Stripe. Puedes cancelar en cualquier momento.
      </p>
    </div>
  );
}
