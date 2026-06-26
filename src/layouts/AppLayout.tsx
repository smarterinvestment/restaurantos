import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import NotificationBell from "../components/NotificationBell";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-base">
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
