import { Routes, Route, Navigate } from "react-router-dom";
import AuthListener from "./components/AuthListener";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./layouts/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Capture from "./pages/Capture";
import Income from "./pages/Income";
import Invoices from "./pages/Invoices";
import Suppliers from "./pages/Suppliers";
import Assistant from "./pages/Assistant";

export default function App() {
  return (
    <>
      <AuthListener />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/captura" element={<Capture />} />
          <Route path="/ingresos" element={<Income />} />
          <Route path="/facturas" element={<Invoices />} />
          <Route path="/proveedores" element={<Suppliers />} />
          <Route path="/asistente" element={<Assistant />} />
        </Route>
      </Routes>
    </>
  );
}
