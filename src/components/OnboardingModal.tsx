import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TrendingUp, ChefHat } from "lucide-react";
import { useProfile } from "../hooks/useProfile";

export default function OnboardingModal({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const [fullName,       setFullName]       = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const { upsert }                          = useProfile(userId);

  async function submit() {
    if (!fullName.trim()) return;
    await upsert.mutateAsync({
      full_name:       fullName.trim(),
      restaurant_name: restaurantName.trim() || "Mi Restaurante",
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(7,12,26,0.90)", backdropFilter: "blur(10px)" }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-8"
        style={{
          background: "linear-gradient(180deg,rgba(20,32,60,0.97),rgba(9,14,30,0.98))",
          backdropFilter: "blur(24px) saturate(140%)",
          border: "1px solid rgba(125,165,255,0.16)",
          boxShadow: "0 40px 100px rgba(0,0,0,0.75)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(150deg,#3d8bff,#1f5fe0)" }}
          >
            <TrendingUp size={17} className="text-white" />
          </div>
          <div>
            <div className="font-display font-bold text-sm text-text leading-tight">CashFlow AI</div>
            <div className="text-text-faint text-[10px] leading-tight">RestaurantOS</div>
          </div>
        </div>

        {/* Heading */}
        <div className="flex items-start gap-3 mb-2">
          <ChefHat size={26} style={{ color: "#3d8bff", flexShrink: 0, marginTop: 2 }} />
          <h1 className="font-display font-bold text-[22px] text-text leading-tight">
            {t("onboarding.title")}
          </h1>
        </div>
        <p className="text-text-muted text-sm mb-7 leading-relaxed pl-[38px]">
          {t("onboarding.subtitle")}
        </p>

        {/* Fields */}
        <div className="space-y-4">
          <Field
            label={t("onboarding.fullName")}
            required
            value={fullName}
            onChange={setFullName}
            placeholder={t("onboarding.fullNamePlaceholder")}
            onEnter={submit}
            autoFocus
          />
          <Field
            label={t("onboarding.restaurantName")}
            value={restaurantName}
            onChange={setRestaurantName}
            placeholder={t("onboarding.restaurantPlaceholder")}
            onEnter={submit}
          />
        </div>

        <button
          onClick={submit}
          disabled={!fullName.trim() || upsert.isPending}
          className="w-full h-11 mt-7 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-40"
          style={{ background: "linear-gradient(150deg,#3d8bff,#1f5fe0)", boxShadow: "0 4px 20px rgba(61,139,255,0.45)" }}
        >
          {upsert.isPending ? t("onboarding.saving") : t("onboarding.submit")}
        </button>

        {upsert.isError && (
          <p className="text-danger text-xs text-center mt-3">{t("onboarding.error")}</p>
        )}
      </div>
    </div>
  );
}

function Field({
  label, required = false, value, onChange, placeholder, onEnter, autoFocus,
}: {
  label: string; required?: boolean; value: string;
  onChange: (v: string) => void; placeholder: string;
  onEnter: () => void; autoFocus?: boolean;
}) {
  return (
    <div>
      <label className="block text-text-dim text-xs font-medium mb-1.5">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === "Enter" && onEnter()}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full h-11 rounded-xl px-4 text-sm text-text outline-none transition-all"
        style={{
          background: "rgba(27,39,66,0.65)",
          border: value ? "1px solid rgba(61,139,255,0.32)" : "1px solid rgba(125,165,255,0.14)",
        }}
      />
    </div>
  );
}
