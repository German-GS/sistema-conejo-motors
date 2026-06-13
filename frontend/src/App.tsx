import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useSearchParams,
} from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Toaster, toast } from "react-hot-toast";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import { jwtDecode } from "jwt-decode";
import { useEffect } from "react";

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
import PendingBillingPage from "./pages/admin/PendingBillingPage";
import { ImportVehiclesPage } from "./pages/admin/ImportVehiclesPage";
import { AccesoriosPage } from "./pages/admin/AccesoriosPage";
import { PricingPage } from "./pages/admin/PricingPage";
import { AsistenciaPage } from "./pages/admin/AsistenciaPage";
import { SolicitudesPage } from "./pages/admin/SolicitudesPage";
import { ProductosPage } from "./pages/admin/ProductosPage";
import { ContabilidadPage } from "./pages/admin/ContabilidadPage";
import AgendaPage from "./pages/admin/AgendaPage";
import ProveedoresPage from "./pages/admin/ProveedoresPage";
import CxCPage from "./pages/admin/CxCPage";
import CxPPage from "./pages/admin/CxPPage";
import CajaChicaPage from "./pages/admin/CajaChicaPage";
import GastosPage from "./pages/admin/GastosPage";
import TallerPage from "./pages/admin/TallerPage";
import GarantiasPage from "./pages/admin/GarantiasPage";
import TesoreriaPage from "./pages/admin/TesoreriaPage";
import ImportacionesPage from "./pages/admin/ImportacionesPage";

// Páginas de Ventas
import { CatalogPage } from "./pages/admin/sales/CatalogPage";
import { CreateQuotePage } from "./pages/admin/sales/CreateQuotePage";
import { MyQuotesPage } from "./pages/admin/sales/MyQuotesPage";
import { QuoteDetailsPage } from "./pages/admin/QuoteDetailsPage";
import { SalesDashboardPage } from "./pages/admin/sales/SalesDashboardPage";
import { LeadsPage } from "./pages/admin/sales/LeadsPage";
import { LeadDetailsPage } from "./pages/admin/sales/LeadDetailsPage";
import { VehicleDetailSalesPage } from "./pages/admin/sales/VehicleDetailSalesPage";

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

/** Muestra aviso de sesión expirada si viene con ?expired=1 */
const SessionExpiredNotice = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get("expired") === "1") {
      toast.error("Tu sesión expiró. Por favor inicia sesión nuevamente.", { duration: 5000, icon: "🔒" });
      setSearchParams({}, { replace: true });
    }
  }, []); // eslint-disable-line
  return null;
};

function App() {
  const handleLoginSuccess = () => {
    console.log("Login successful, redirecting...");
  };

  // Si se accede desde el dominio Firebase (no el comercial), bloquear indexación
  const isFirebaseDomain = typeof window !== "undefined" &&
    window.location.hostname.includes("web.app");

  return (
    <BrowserRouter>
      {isFirebaseDomain && (
        <Helmet>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
      )}
      <Toaster position="top-right" reverseOrder={false} />
      <ConfirmProvider>
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
          element={<><SessionExpiredNotice /><LoginPage onLoginSuccess={handleLoginSuccess} /></>}
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
            <Route path="import" element={<ImportVehiclesPage />} />
            <Route path="accesorios" element={<AccesoriosPage />} />
            <Route path="pricing" element={<PricingPage />} />
            {/* Rutas de ventas accesibles para el admin */}
            <Route path="sales/catalog" element={<CatalogPage />} />
            <Route path="sales/catalog/:vehicleId" element={<VehicleDetailSalesPage />} />
            <Route path="sales/catalog/:vehicleId/quote" element={<CreateQuotePage />} />
            <Route path="sales/quotes" element={<MyQuotesPage />} />
            <Route path="sales/quotes/:quoteId" element={<QuoteDetailsPage />} />
            <Route path="leads" element={<LeadsPage />} />
            <Route path="leads/:leadId" element={<LeadDetailsPage />} />
            <Route path="asistencia" element={<AsistenciaPage />} />
            <Route path="solicitudes" element={<SolicitudesPage />} />
            <Route path="productos" element={<ProductosPage />} />
            <Route path="contabilidad" element={<ContabilidadPage />} />
            {/* Nuevos módulos */}
            <Route path="agenda" element={<AgendaPage />} />
            <Route path="proveedores" element={<ProveedoresPage />} />
            <Route path="cxc" element={<CxCPage />} />
            <Route path="cxp" element={<CxPPage />} />
            <Route path="caja-chica" element={<CajaChicaPage />} />
            <Route path="gastos" element={<GastosPage />} />
            <Route path="taller" element={<TallerPage />} />
            <Route path="garantias" element={<GarantiasPage />} />
            <Route path="tesoreria" element={<TesoreriaPage />} />
            <Route path="importaciones" element={<ImportacionesPage />} />
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
            <Route path="catalog/:vehicleId" element={<VehicleDetailSalesPage />} />
            <Route
              path="catalog/:vehicleId/quote"
              element={<CreateQuotePage />}
            />
            <Route path="quotes" element={<MyQuotesPage />} />
            <Route path="quotes/:quoteId" element={<QuoteDetailsPage />} />
            <Route path="leads" element={<LeadsPage />} />
            <Route path="leads/:leadId" element={<LeadDetailsPage />} />
            <Route path="asistencia" element={<AsistenciaPage />} />
            <Route path="solicitudes" element={<SolicitudesPage />} />
            <Route path="billing" element={<PendingBillingPage />} />
          </Route>
        </Route>

        {/* --- 6. Ruta para cualquier otra URL no encontrada --- */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </ConfirmProvider>
    </BrowserRouter>
  );
}

export default App;
