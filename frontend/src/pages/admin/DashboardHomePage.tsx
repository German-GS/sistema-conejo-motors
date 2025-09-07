import { useState, useEffect } from "react";
import { Card } from "../../components/Card";
import apiClient from "../../api/apiClient";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import styles from "./DashboardPage.module.css"; // Reutilizaremos algunos estilos

// Interfaz para la estructura de los datos que esperamos de la API
interface DashboardStats {
  totalVehicles: number;
  inventoryCost: number;
  monthlySales: number;
  monthlyRevenue: number;
  salesData: { month: string; vendidos: number }[];
}

// Helper para formatear números como moneda
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC", // Colón Costarricense
    minimumFractionDigits: 0,
  }).format(value);
};

export const DashboardHomePage = () => {
  // Estado para guardar las estadísticas y manejar la carga/errores
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get("/vehicles/dashboard/stats");
        setStats(response.data);
      } catch (err) {
        setError("No se pudieron cargar las estadísticas del dashboard.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Si está cargando, muestra un mensaje
  if (loading) {
    return <p>Cargando estadísticas...</p>;
  }

  // Si hay un error, lo muestra
  if (error) {
    return <p style={{ color: "red" }}>{error}</p>;
  }

  return (
    <div>
      {/* Fila de KPIs con datos dinámicos */}
      <div className={styles.kpiGrid}>
        {" "}
        {/* Usamos un estilo para el grid */}
        <Card title="Vehículos en Stock">
          <h2>{stats?.totalVehicles ?? 0}</h2>
        </Card>
        <Card title="Ventas del Mes">
          {/* Este dato aún es simulado */}
          <h2>{stats?.monthlySales ?? 0}</h2>
        </Card>
        <Card title="Ingresos del Mes">
          {/* Este dato aún es simulado */}
          <h2>{formatCurrency(stats?.monthlyRevenue ?? 0)}</h2>
        </Card>
        <Card title="Costo Inventario">
          <h2>{formatCurrency(stats?.inventoryCost ?? 0)}</h2>
        </Card>
      </div>

      {/* Gráfico Principal con datos dinámicos */}
      <Card title="Ventas por Mes">
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={stats?.salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: number) => [value, "Vendidos"]} />
              <Legend />
              <Bar
                dataKey="vendidos"
                fill="#024f7d"
                name="Vehículos Vendidos"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};
