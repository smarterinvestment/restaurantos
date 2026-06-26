import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import Sidebar from "../components/Sidebar";
import NotificationBell from "../components/NotificationBell";
import OnboardingModal from "../components/OnboardingModal";
import { useAuthStore } from "../store/authStore";
import { useProfile } from "../hooks/useProfile";

export default function AppLayout() {
  const { session }  = useAuthStore();
  const userId       = session?.user.id ?? "";
  const { data: profile, isLoading: profileLoading } = useProfile(userId);
  const needsOnboarding = !!userId && !profileLoading && (!profile || !profile.full_name?.trim());

  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-base overflow-x-hidden">
      {needsOnboarding && <OnboardingModal userId={userId} />}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile header — shown on <md only */}
      <div
        className="fixed top-0 left-0 right-0 z-40 flex items-center gap-3 md:hidden"
        style={{
          height: 52,
          padding: "0 16px",
          background: "rgba(7,12,26,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(125,165,255,0.07)",
        }}
      >
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-1.5 rounded-lg text-text-muted hover:text-text transition-colors"
          aria-label="Abrir menú"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <img src="/icon-192.png" alt="Logo" className="w-7 h-7 rounded-md flex-shrink-0" />
          <span className="font-display font-semibold text-sm text-text">Smarter Restaurant</span>
        </div>
        <NotificationBell />
      </div>

      {/* Desktop top bar — hidden on mobile */}
      <div
        className="hidden md:flex fixed top-0 right-0 z-40 items-center justify-end"
        style={{
          left: 248,
          height: 52,
          padding: "0 38px",
          background: "rgba(7,12,26,0.80)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(125,165,255,0.07)",
        }}
      >
        <NotificationBell />
      </div>

      <main className="min-h-screen md:ml-[248px] overflow-x-hidden">
        <div
          className="min-h-screen pt-[68px] px-4 pb-10 md:pt-[82px] md:px-[38px]"
          style={{ maxWidth: 1280 }}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}
