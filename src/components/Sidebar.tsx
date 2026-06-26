import { useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  LayoutDashboard, ScanLine, Banknote, FileText,
  Truck, Sparkles, TrendingUp, User, LogOut, Settings, X,
} from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useProfile } from "../hooks/useProfile";
import { useHealthScore, type HintPart } from "../hooks/useHealthScore";

function renderHint(parts: HintPart[], t: TFunction): string {
  return parts.map(part => {
    if (part.kind === "liq") {
      const keyMap = {
        balance: "health.liqBalance", excellent: "health.liqExcellent",
        veryGood: "health.liqVeryGood", good: "health.liqGood",
        tight: "health.liqTight", critical: "health.liqCritical",
      } as const;
      return t(keyMap[part.level]);
    }
    if (part.kind === "overdue") {
      const key = part.severity === "severe" ? "health.overdueSevere"
        : part.severity === "moderate" ? "health.overdueModerate"
        : "health.overdueMinor";
      return t(key, { count: part.count });
    }
    if (part.kind === "trend") {
      return t(part.level === "controlled" ? "health.trendControlled" : "health.trendElevated");
    }
    return "";
  }).filter(Boolean).join(" · ");
}

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const { session, signOut } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (open) onClose();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);
  const email   = session?.user.email ?? "";
  const userId  = session?.user.id ?? "";
  const { data: profile }  = useProfile(userId);
  const restaurantName = profile?.restaurant_name?.trim() || "Mi Restaurante";
  const displayName    = profile?.full_name?.trim() || email;
  const { data: health } = useHealthScore(userId);

  const NAV = [
    { to: "/dashboard",   icon: LayoutDashboard, label: t("nav.dashboard") },
    { to: "/captura",     icon: ScanLine,        label: t("nav.capture")   },
    { to: "/ingresos",    icon: Banknote,        label: t("nav.income")    },
    { to: "/facturas",    icon: FileText,        label: t("nav.invoices")  },
    { to: "/proveedores", icon: Truck,           label: t("nav.suppliers") },
    { to: "/asistente",   icon: Sparkles,        label: t("nav.assistant") },
  ];

  const hintText = health ? renderHint(health.hintParts, t) : "";

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

    <aside
      className={[
        "fixed top-0 left-0 h-full flex flex-col z-50",
        "transition-transform duration-300 ease-in-out",
        open ? "translate-x-0" : "-translate-x-full",
        "md:translate-x-0",
      ].join(" ")}
      style={{
        width: 248,
        background: "linear-gradient(180deg, rgba(20,32,60,0.70), rgba(9,14,30,0.80))",
        backdropFilter: "blur(20px) saturate(140%)",
        WebkitBackdropFilter: "blur(20px) saturate(140%)",
        borderRight: "1px solid var(--glass-border)",
      }}
    >
      {/* Mobile close button */}
      <button
        className="absolute top-3 right-3 p-1.5 rounded-lg text-text-faint hover:text-text transition-colors md:hidden"
        onClick={onClose}
        aria-label="Cerrar menú"
      >
        <X size={16} />
      </button>

      {/* Logo */}
      <div className="px-6 pt-7 pb-6">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(150deg,var(--brand),var(--brand-deep))" }}
          >
            <TrendingUp size={16} className="text-white" />
          </div>
          <div>
            <div className="font-display font-semibold text-sm text-text leading-tight">CashFlow AI</div>
            <div className="text-text-faint text-[10px] leading-tight">RestaurantOS</div>
          </div>
        </div>
      </div>

      {/* Salud financiera */}
      <div className="mx-4 mb-6 rounded-xl p-4" style={{ background: "rgba(27,39,66,0.6)", border: "1px solid var(--glass-border)" }}>
        <div className="text-text-faint text-[10px] uppercase tracking-widest mb-1.5 font-medium">
          {t("sidebar.health")}
        </div>
        {health ? (
          <>
            <div className="flex items-end justify-between gap-1">
              <span className="font-display font-bold text-xl leading-none" style={{ color: health.color }}>
                {health.score}
              </span>
              <span className="text-[10px] font-semibold leading-none mb-0.5" style={{ color: health.color }}>
                /100
              </span>
            </div>
            <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: "rgb(var(--brand-rgb) / 0.10)" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${health.score}%`, ...health.barStyle }}
              />
            </div>
            <div className="mt-1.5 text-[10px] font-medium" style={{ color: health.color }}>
              {t(health.labelKey)}
            </div>
            {hintText && (
              <div className="mt-0.5 text-[9px] leading-tight" style={{ color: "rgba(159,176,192,0.65)" }}>
                {hintText}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-end gap-1.5">
              <span className="font-display font-bold text-xl text-text-faint leading-none">—</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full" style={{ background: "rgb(var(--brand-rgb) / 0.10)" }} />
            <div className="mt-1.5 text-text-faint text-[10px]">{t("sidebar.noData")}</div>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              ["flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
               isActive ? "text-text" : "text-text-dim hover:text-text-muted hover:bg-white/5",
              ].join(" ")
            }
            style={({ isActive }) =>
              isActive ? { background: "rgb(var(--brand-rgb) / 0.12)", boxShadow: "inset 2px 0 0 var(--brand)" } : undefined
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={17} className={isActive ? "text-brand" : "text-text-faint"} strokeWidth={isActive ? 2.2 : 1.8} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Language toggle */}
      <div className="px-5 pb-1 flex items-center gap-1">
        <span className="text-text-faint text-[10px] mr-1 uppercase tracking-widest">{t("preferences.language.title")}</span>
        {(["es", "en"] as const).map(lang => (
          <button
            key={lang}
            onClick={() => i18n.changeLanguage(lang)}
            className="text-[11px] font-bold px-2 py-0.5 rounded-md uppercase transition-all"
            style={{
              background: i18n.language.startsWith(lang) ? "rgb(var(--brand-rgb) / 0.18)" : "transparent",
              color: i18n.language.startsWith(lang) ? "var(--brand)" : "#5f6b7a",
              border: i18n.language.startsWith(lang) ? "1px solid rgb(var(--brand-rgb) / 0.25)" : "1px solid transparent",
            }}
          >
            {lang}
          </button>
        ))}
      </div>

      {/* Preferences link */}
      <div className="px-3 pb-1">
        <NavLink
          to="/preferencias"
          className={({ isActive }) =>
            ["flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
             isActive ? "text-text" : "text-text-dim hover:text-text-muted hover:bg-white/5",
            ].join(" ")
          }
          style={({ isActive }) =>
            isActive ? { background: "rgb(var(--brand-rgb) / 0.12)", boxShadow: "inset 2px 0 0 var(--brand)" } : undefined
          }
        >
          {({ isActive }) => (
            <>
              <Settings size={17} className={isActive ? "text-brand" : "text-text-faint"} strokeWidth={isActive ? 2.2 : 1.8} />
              {t("nav.preferences")}
            </>
          )}
        </NavLink>
      </div>

      {/* User block */}
      <div
        className="mx-4 mb-5 mt-2 rounded-xl px-4 py-3"
        style={{ background: "rgba(27,39,66,0.5)", border: "1px solid var(--glass-border)" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center flex-shrink-0">
            <User size={15} className="text-brand" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-text text-sm font-medium leading-tight truncate">{restaurantName}</div>
            <div className="text-text-faint text-[10px] leading-tight truncate">{displayName}</div>
          </div>
          <button
            onClick={signOut}
            title={t("sidebar.logout")}
            className="text-text-faint hover:text-danger transition-colors flex-shrink-0"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
    </>
  );
}
