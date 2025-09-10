import { useState, useEffect } from "react";
import { Card } from "@/components/Card";
import apiClient from "@/api/apiClient";
import styles from "./SalesDashboardPage.module.css";
import { jwtDecode } from "jwt-decode";

// Interfaz para los datos que esperamos de la API
interface SalesDashboardStats {
  totalVehicles: number;
  monthlySalesCount: number;
  monthlyRevenue: number;
  estimatedCommissions: number;
  pendingQuotes: number;
}

// Helper para formatear números como moneda
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
};

export const SalesDashboardPage = () => {
  const [stats, setStats] = useState<SalesDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      // Asumimos que el nombre completo está en el token, si no, lo puedes obtener del perfil
      const decodedToken: { nombre_completo?: string } = jwtDecode(token);
      setUserName(decodedToken.nombre_completo || "Vendedor");
    }

    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get("/vehicles/dashboard/sales-stats");
        setStats(response.data);
      } catch (err) {
        setError("No se pudieron cargar las estadísticas del dashboard.");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) return <p>Cargando estadísticas...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div>
      <h1 className={styles.welcomeMessage}>
        ¡Bienvenido de nuevo, {userName}!
      </h1>
      <p className={styles.subtitle}>
        Aquí tienes un resumen de tu rendimiento este mes.
      </p>

      <div className={styles.kpiGrid}>
        <Card title="Vehículos Disponibles">
          <h2>{stats?.totalVehicles ?? 0}</h2>
        </Card>
        <Card title="Ventas del Mes">
          <h2>{stats?.monthlySalesCount ?? 0}</h2>
        </Card>
        <Card title="Ingresos Generados (Mes)">
          <h2>{formatCurrency(stats?.monthlyRevenue ?? 0)}</h2>
        </Card>
        <Card title="Comisiones Estimadas (Mes)">
          <h2>{formatCurrency(stats?.estimatedCommissions ?? 0)}</h2>
        </Card>
        <Card title="Cotizaciones Pendientes">
          <h2>{stats?.pendingQuotes ?? 0}</h2>
        </Card>
      </div>
    </div>
  );
};
