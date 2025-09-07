import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LoginPage } from "./pages/admin/LoginPage";
import { DashboardPage as InventoryPage } from "./pages/admin/DashboardPage";
import { SettingsPage } from "./pages/admin/SettingsPage";
import { PlanillaPage } from "./pages/admin/PlanillaPage";
import { DashboardHomePage } from "./pages/admin/DashboardHomePage";
import { UsersPage } from "./pages/admin/UsersPage";
import { AdminLayout } from "./components/AdminLayout";
import React, { useState } from "react";
import { BodegasPage } from "./pages/admin/BodegasPage";
import { TrackingPage } from "./pages/admin/TrackingPage";

function App() {
  // 2. CREAR ESTADO DE AUTENTICACIÓN
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem("accessToken")
  );

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  interface ProtectedRouteProps {
    children: React.ReactNode;
  }

  // 3. ACTUALIZAR RUTA PROTEGIDA PARA USAR EL ESTADO
  const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const isAuthenticated = !!localStorage.getItem("accessToken");
    return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={<LoginPage onLoginSuccess={handleLoginSuccess} />}
        />

        {/* --- Bloque de Rutas de Administración --- */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          {/* Todas las páginas del panel deben ir aquí dentro */}
          <Route index element={<DashboardHomePage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="planilla" element={<PlanillaPage />} />
          <Route path="bodegas" element={<BodegasPage />} />
          <Route path="tracking" element={<TrackingPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route
          path="*"
          element={<Navigate to={isAuthenticated ? "/admin" : "/login"} />}
        />
        {/* La ruta de "settings" ya no debe estar aquí abajo */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
