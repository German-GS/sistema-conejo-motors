import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { jwtDecode } from "jwt-decode";

// Layouts
import { AdminLayout } from "@/components/AdminLayout";
import { SalesLayout } from "@/components/SalesLayout";

// Páginas de Administración
import { LoginPage } from "@/pages/admin/LoginPage";
import { DashboardHomePage } from "@/pages/admin/DashboardHomePage";
import { DashboardPage as InventoryPage } from "@/pages/admin/DashboardPage";
import { UsersPage } from "@/pages/admin/UsersPage";
import { PlanillaPage } from "@/pages/admin/PlanillaPage";
import { BodegasPage } from "@/pages/admin/BodegasPage";
import TrackingPage from "@/pages/admin/TrackingPage";
import { SettingsPage } from "@/pages/admin/SettingsPage";

// Páginas de Ventas (con el alias @)
import { CatalogPage } from "@/pages/admin/sales/CatalogPage";
import { CreateQuotePage } from "@/pages/admin/sales/CreateQuotePage";
import { MyQuotesPage } from "@/pages/admin/sales/MyQuotesPage";
import { QuoteDetailsPage } from "@/pages/admin/QuoteDetailsPage";

// --- COMPONENTES DE LÓGICA DE RUTAS ---

const HomeRedirect = () => {
  const token = localStorage.getItem("accessToken");
  if (!token) return <Navigate to="/login" />;
  try {
    const decodedToken: { rol?: { nombre: string } } = jwtDecode(token);
    return decodedToken.rol?.nombre === "Vendedor" ? (
      <Navigate to="/sales" />
    ) : (
      <Navigate to="/admin" />
    );
  } catch (error) {
    localStorage.removeItem("accessToken");
    return <Navigate to="/login" />;
  }
};

const ProtectedRouteByRole = ({ allowedRoles }: { allowedRoles: string[] }) => {
  const token = localStorage.getItem("accessToken");
  if (!token) return <Navigate to="/login" />;
  try {
    const decodedToken: { rol?: { nombre: string } } = jwtDecode(token);
    const userRole = decodedToken.rol?.nombre || "";
    return allowedRoles.includes(userRole) ? <Outlet /> : <Navigate to="/" />;
  } catch (error) {
    localStorage.removeItem("accessToken");
    return <Navigate to="/login" />;
  }
};

// --- COMPONENTE PRINCIPAL ---

function App() {
  const handleLoginSuccess = () => {
    window.location.href = "/";
  };

  return (
    <BrowserRouter>
      <Toaster position="top-right" reverseOrder={false} />
      <Routes>
        {/* Ruta Pública */}
        <Route
          path="/login"
          element={<LoginPage onLoginSuccess={handleLoginSuccess} />}
        />

        {/* Ruta Raíz que Redirige */}
        <Route path="/" element={<HomeRedirect />} />

        {/* --- Grupo de Rutas de Administración --- */}
        <Route
          element={
            <ProtectedRouteByRole
              allowedRoles={["Administrador", "Contador"]}
            />
          }
        >
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<DashboardHomePage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="planilla" element={<PlanillaPage />} />
            <Route path="bodegas" element={<BodegasPage />} />
            <Route path="tracking" element={<TrackingPage />} />
            <Route path="settings" element={<SettingsPage />} />
            {/* Rutas de ventas accesibles para el admin */}
            <Route path="sales/catalog" element={<CatalogPage />} />
            <Route
              path="sales/catalog/:vehicleId/quote"
              element={<CreateQuotePage />}
            />
            <Route path="sales/quotes" element={<MyQuotesPage />} />
            {/* 👇 CORRECCIÓN AQUÍ 👇 */}
            <Route
              path="sales/quotes/:quoteId"
              element={<QuoteDetailsPage />}
            />
          </Route>
        </Route>

        {/* --- Grupo de Rutas de Ventas --- */}
        <Route
          element={
            <ProtectedRouteByRole
              allowedRoles={["Vendedor", "Administrador"]}
            />
          }
        >
          <Route path="/sales" element={<SalesLayout />}>
            <Route
              index
              element={<h1>Dashboard de Vendedor Próximamente...</h1>}
            />
            <Route path="catalog" element={<CatalogPage />} />
            <Route
              path="catalog/:vehicleId/quote"
              element={<CreateQuotePage />}
            />
            <Route path="quotes" element={<MyQuotesPage />} />
            {/* 👇 Y CORRECCIÓN AQUÍ 👇 */}
            <Route path="quotes/:quoteId" element={<QuoteDetailsPage />} />
          </Route>
        </Route>

        {/* Ruta para cualquier otra URL */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
