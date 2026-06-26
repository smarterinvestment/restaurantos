import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";

export default function Login() {
  const { t } = useTranslation();
  const { session } = useAuthStore();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  if (session) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);

    if (mode === "signin") {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) setError(err.message);
    } else {
      const { error: err } = await supabase.auth.signUp({ email, password });
      if (err) setError(err.message);
      else setInfo(t("login.confirmEmail"));
    }

    setBusy(false);
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          "radial-gradient(1200px 600px at 80% -10%, rgb(var(--brand-rgb) / 0.10), transparent 60%), radial-gradient(900px 500px at -5% 110%, rgb(var(--brand-cyan-rgb) / 0.06), transparent 55%), #070c1a",
      }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{
          background: "linear-gradient(180deg,rgba(20,32,60,0.70),rgba(9,14,30,0.80))",
          backdropFilter: "blur(20px) saturate(140%)",
          border: "1px solid rgba(125,165,255,0.12)",
        }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img
            src="/logo-full-512.png"
            alt="Smarter Restaurant Management"
            className="h-24 w-auto max-w-[260px] object-contain"
          />
        </div>

        <h1 className="font-display font-semibold text-xl text-text mb-1">
          {mode === "signin" ? t("login.signin") : t("login.signup")}
        </h1>
        <p className="text-text-dim text-sm mb-6">
          {mode === "signin" ? t("login.signinSubtitle") : t("login.signupSubtitle")}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-text-muted text-xs font-medium mb-1.5">
              {t("login.email")}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("login.emailPlaceholder")}
              className="w-full rounded-lg px-3.5 py-2.5 text-sm text-text placeholder:text-text-faint outline-none transition-all"
              style={{ background: "rgba(27,39,66,0.7)", border: "1px solid rgba(125,165,255,0.15)" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--brand-border-active)")}
              onBlur={(e)  => (e.currentTarget.style.borderColor = "rgba(125,165,255,0.15)")}
            />
          </div>
          <div>
            <label className="block text-text-muted text-xs font-medium mb-1.5">
              {t("login.password")}
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg px-3.5 py-2.5 text-sm text-text placeholder:text-text-faint outline-none transition-all"
              style={{ background: "rgba(27,39,66,0.7)", border: "1px solid rgba(125,165,255,0.15)" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--brand-border-active)")}
              onBlur={(e)  => (e.currentTarget.style.borderColor = "rgba(125,165,255,0.15)")}
            />
          </div>

          {error && (
            <div className="rounded-lg px-3.5 py-2.5 text-sm" style={{ background: "rgba(255,77,109,0.12)", color: "#ff4d6d" }}>
              {error}
            </div>
          )}
          {info && (
            <div className="rounded-lg px-3.5 py-2.5 text-sm" style={{ background: "rgb(var(--brand-rgb) / 0.12)", color: "#9cc4ff" }}>
              {info}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg py-2.5 font-semibold text-sm text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
            style={{ background: "linear-gradient(150deg,var(--brand),var(--brand-deep))", boxShadow: "0 6px 22px rgb(var(--brand-rgb) / 0.40)" }}
          >
            {busy && <Loader2 size={15} className="animate-spin" />}
            {mode === "signin" ? t("login.submitSignin") : t("login.submitSignup")}
          </button>
        </form>

        <p className="mt-5 text-center text-text-dim text-xs">
          {mode === "signin" ? t("login.switchToSignup") : t("login.switchToSignin")}{" "}
          <button
            onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setInfo(""); }}
            className="text-brand hover:text-brand-soft transition-colors font-medium"
          >
            {mode === "signin" ? t("login.signup") : t("login.signin")}
          </button>
        </p>
      </div>
    </div>
  );
}
