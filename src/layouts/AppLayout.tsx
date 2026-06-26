import { Outlet } from "react-router-dom";
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

  return (
    <div className="min-h-screen bg-base">
      {needsOnboarding && <OnboardingModal userId={userId} />}
      <Sidebar />

      {/* Top bar — notification bell */}
      <div
        className="fixed top-0 right-0 z-40 flex items-center justify-end"
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

      <main className="min-h-screen" style={{ marginLeft: 248 }}>
        <div
          className="min-h-screen"
          style={{ padding: "82px 38px 40px", maxWidth: 1280 }}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}
