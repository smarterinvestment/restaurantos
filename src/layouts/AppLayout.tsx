import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-base">
      <Sidebar />
      <main
        className="min-h-screen"
        style={{ marginLeft: 248 }}
      >
        <div
          className="min-h-screen"
          style={{
            padding: "30px 38px",
            maxWidth: 1280,
          }}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}
