import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ScanLine,
  Banknote,
  FileText,
  Truck,
  Sparkles,
  TrendingUp,
  User,
  LogOut,
  Settings,
} from "lucide-react";
import { useAuthStore } from "../store/authStore";

const NAV = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/captura", icon: ScanLine, label: "Captura" },
  { to: "/ingresos", icon: Banknote, label: "Ingresos / Caja" },
  { to: "/facturas", icon: FileText, label: "Facturas" },
  { to: "/proveedores", icon: Truck, label: "Proveedores" },
  { to: "/asistente", icon: Sparkles, label: "Asistente IA" },
];

export default function Sidebar() {
  const { session, signOut } = useAuthStore();
  const email = session?.user.email ?? "";

  return (
    <aside
      className="fixed top-0 left-0 h-full flex flex-col"
      style={{
        width: 248,
        background: "linear-gradient(180deg, rgba(20,32,60,0.70), rgba(9,14,30,0.80))",
        backdropFilter: "blur(20px) saturate(140%)",
        WebkitBackdropFilter: "blur(20px) saturate(140%)",
        borderRight: "1px solid rgba(125,165,255,0.12)",
      }}
    >
      {/* Logo */}
      <div className="px-6 pt-7 pb-6">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(150deg,#3d8bff,#1f5fe0)" }}
          >
            <TrendingUp size={16} className="text-white" />
          </div>
          <div>
            <div className="font-display font-semibold text-sm text-text leading-tight">
              CashFlow AI
            </div>
            <div className="text-text-faint text-[10px] leading-tight">RestaurantOS</div>
          </div>
        </div>
      </div>

      {/* Salud financiera card */}
      <div className="mx-4 mb-6 rounded-xl p-4" style={{ background: "rgba(27,39,66,0.6)", border: "1px solid rgba(125,165,255,0.10)" }}>
        <div className="text-text-faint text-[10px] uppercase tracking-widest mb-1.5 font-medium">
          Salud financiera
        </div>
        <div className="flex items-end gap-1.5">
          <span className="font-display font-bold text-xl text-text leading-none">—</span>
        </div>
        <div className="mt-2 h-1 rounded-full" style={{ background: "rgba(125,165,255,0.10)" }}>
          <div
            className="h-full rounded-full"
            style={{ width: "0%", background: "linear-gradient(90deg,#3d8bff,#00d4ff)" }}
          />
        </div>
        <div className="mt-1.5 text-text-faint text-[10px]">Sin datos aún</div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                isActive
                  ? "text-text"
                  : "text-text-dim hover:text-text-muted hover:bg-white/5",
              ].join(" ")
            }
            style={({ isActive }) =>
              isActive
                ? {
                    background: "rgba(61,139,255,0.12)",
                    boxShadow: "inset 2px 0 0 #3d8bff",
                  }
                : undefined
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={17}
                  className={isActive ? "text-brand" : "text-text-faint"}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Preferences link */}
      <div className="px-3 pb-1">
        <NavLink
          to="/preferencias"
          className={({ isActive }) =>
            [
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
              isActive
                ? "text-text"
                : "text-text-dim hover:text-text-muted hover:bg-white/5",
            ].join(" ")
          }
          style={({ isActive }) =>
            isActive ? { background: "rgba(61,139,255,0.12)", boxShadow: "inset 2px 0 0 #3d8bff" } : undefined
          }
        >
          {({ isActive }) => (
            <>
              <Settings size={17} className={isActive ? "text-brand" : "text-text-faint"} strokeWidth={isActive ? 2.2 : 1.8} />
              Preferencias
            </>
          )}
        </NavLink>
      </div>

      {/* User block */}
      <div
        className="mx-4 mb-5 mt-2 rounded-xl px-4 py-3"
        style={{ background: "rgba(27,39,66,0.5)", border: "1px solid rgba(125,165,255,0.08)" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center flex-shrink-0">
            <User size={15} className="text-brand" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-text text-sm font-medium leading-tight truncate">Mi Restaurante</div>
            <div className="text-text-faint text-[10px] leading-tight truncate">{email}</div>
          </div>
          <button
            onClick={signOut}
            title="Cerrar sesión"
            className="text-text-faint hover:text-danger transition-colors flex-shrink-0"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
