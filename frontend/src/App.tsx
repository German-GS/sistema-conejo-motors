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
import { AdminLayout } from "./components/AdminLayout";
import { SalesLayout } from "./components/SalesLayout";
import { PublicLayout } from "./components/PublicLayout";

// Páginas Públicas
import { PublicCatalogPage } from "./pages/public/PublicCatalogPage";
import { VehicleDetailPage } from "./pages/public/VehicleDetailPage";
import { ComparePage } from "./pages/public/ComparePage";
import { HomePage } from "./pages/public/HomePage";

// Páginas de Administración
import { LoginPage } from "./pages/admin/LoginPage";
import { DashboardHomePage } from "./pages/admin/DashboardHomePage";
import { DashboardPage as InventoryPage } from "./pages/admin/DashboardPage";
import { UsersPage } from "./pages/admin/UsersPage";
import { PlanillaPage } from "./pages/admin/PlanillaPage";
import { BodegasPage } from "./pages/admin/BodegasPage";
import TrackingPage from "./pages/admin/TrackingPage";
import { SettingsPage } from "./pages/admin/SettingsPage";
import { ReportsPage } from "./pages/admin/ReportsPage";
import { PendingBillingPage } from "./pages/admin/PendingBillingPage";

// Páginas de Ventas
import { CatalogPage } from "./pages/admin/sales/CatalogPage";
import { CreateQuotePage } from "./pages/admin/sales/CreateQuotePage";
import { MyQuotesPage } from "./pages/admin/sales/MyQuotesPage";
import { QuoteDetailsPage } from "./pages/admin/QuoteDetailsPage";
import { SalesDashboardPage } from "./pages/admin/sales/SalesDashboardPage";
import { LeadsPage } from "./pages/admin/sales/LeadsPage";
import { LeadDetailsPage } from "./pages/admin/sales/LeadDetailsPage";

// --- COMPONENTES DE LÓGICA DE RUTAS ---

// Este componente decide a qué dashboard redirigir a un empleado DESPUÉS de iniciar sesión.
const DashboardRedirect = () => {
  const token = localStorage.getItem("accessToken");
  if (!token) return <Navigate to="/login" replace />;
  try {
    const decodedToken: { rol?: { nombre: string } } = jwtDecode(token);
    // Si es Vendedor, va a /sales. Si no, va a /admin.
    return decodedToken.rol?.nombre === "Vendedor" ? (
      <Navigate to="/sales" replace />
    ) : (
      <Navigate to="/admin" replace />
    );
  } catch (error) {
    localStorage.removeItem("accessToken");
    return <Navigate to="/login" replace />;
  }
};

// Este componente protege las rutas internas según el rol del empleado.
const ProtectedRouteByRole = ({ allowedRoles }: { allowedRoles: string[] }) => {
  const token = localStorage.getItem("accessToken");
  if (!token) return <Navigate to="/login" replace />;
  try {
    const decodedToken: { rol?: { nombre: string } } = jwtDecode(token);
    const userRole = decodedToken.rol?.nombre || "";
    return allowedRoles.includes(userRole) ? (
      <Outlet />
    ) : (
      <Navigate to="/dashboard-redirect" replace />
    );
  } catch (error) {
    localStorage.removeItem("accessToken");
    return <Navigate to="/login" replace />;
  }
};

// --- COMPONENTE PRINCIPAL DE LA APLICACIÓN ---

function App() {
  const handleLoginSuccess = () => {
    // Redirige al componente que decide el dashboard correcto.
    window.location.href = "/dashboard-redirect";
  };

  return (
    <BrowserRouter>
      <Toaster position="top-right" reverseOrder={false} />
      <Routes>
        {/* --- 1. Grupo de Rutas Públicas (Ahora es la entrada principal) --- */}
        <Route path="/" element={<PublicLayout />}>
          {/* La nueva página de inicio es ahora el 'index' */}
          <Route index element={<HomePage />} />

          {/* La página de catálogo ahora tiene su propia ruta */}
          <Route path="catalog" element={<PublicCatalogPage />} />

          {/* Anidamos los detalles del vehículo dentro del catálogo */}
          <Route path="catalog/:vehicleId" element={<VehicleDetailPage />} />

          <Route path="compare" element={<ComparePage />} />
        </Route>

        {/* --- 2. Ruta de Login para Empleados --- */}
        <Route
          path="/login"
          element={<LoginPage onLoginSuccess={handleLoginSuccess} />}
        />

        {/* --- 3. Ruta Intermedia para Redirección Post-Login --- */}
        <Route path="/dashboard-redirect" element={<DashboardRedirect />} />

        {/* --- 4. Grupo de Rutas Protegidas de Administración --- */}
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
            <Route path="billing" element={<PendingBillingPage />} />
            <Route path="bodegas" element={<BodegasPage />} />
            <Route path="tracking" element={<TrackingPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            {/* Rutas de ventas accesibles para el admin */}
            <Route path="sales/catalog" element={<CatalogPage />} />
            <Route
              path="sales/catalog/:vehicleId/quote"
              element={<CreateQuotePage />}
            />
            <Route path="sales/quotes" element={<MyQuotesPage />} />
            <Route
              path="sales/quotes/:quoteId"
              element={<QuoteDetailsPage />}
            />
          </Route>
        </Route>

        {/* --- 5. Grupo de Rutas Protegidas de Ventas --- */}
        <Route
          element={
            <ProtectedRouteByRole
              allowedRoles={["Vendedor", "Administrador"]}
            />
          }
        >
          <Route path="/sales" element={<SalesLayout />}>
            <Route index element={<SalesDashboardPage />} />
            <Route path="catalog" element={<CatalogPage />} />
            <Route
              path="catalog/:vehicleId/quote"
              element={<CreateQuotePage />}
            />
            <Route path="quotes" element={<MyQuotesPage />} />
            <Route path="quotes/:quoteId" element={<QuoteDetailsPage />} />
            <Route path="leads" element={<LeadsPage />} />
  <Route path="leads/:leadId" element={<LeadDetailsPage />} />
          </Route>
        </Route>

        {/* --- 6. Ruta para cualquier otra URL no encontrada --- */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
