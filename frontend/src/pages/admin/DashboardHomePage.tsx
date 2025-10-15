// En: frontend/src/pages/admin/DashboardHomePage.tsx

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
import styles from "./DashboardPage.module.css";

// 👇 MEJORA: Interfaz actualizada con los nuevos datos
interface DashboardStats {
  totalVehicles: number;
  inventoryCost: number;
  monthlySales: number;
  monthlyRevenue: number;
  monthlyGrossProfit: number; // <-- NUEVO
  salesData: { month: string; vendidos: number }[];
  salesBySellerData: { name: string; ventas: number }[]; // <-- NUEVO
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
};

export const DashboardHomePage = () => {
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
      {/* 👇 MEJORA: Fila de KPIs actualizada con 5 tarjetas */}
      <div className={styles.kpiGrid}>
        <Card title="Vehículos en Stock">
          <h2>{stats?.totalVehicles ?? 0}</h2>
        </Card>
        <Card title="Ventas del Mes">
          <h2>{stats?.monthlySales ?? 0}</h2>
        </Card>
        <Card title="Ingresos del Mes">
          <h2>{formatCurrency(stats?.monthlyRevenue ?? 0)}</h2>
        </Card>
        {/* --- 👇 NUEVA TARJETA DE GANANCIA --- */}
        <Card title="Ganancia Bruta (Mes)">
          <h2>{formatCurrency(stats?.monthlyGrossProfit ?? 0)}</h2>
        </Card>
        <Card title="Costo Inventario">
          <h2>{formatCurrency(stats?.inventoryCost ?? 0)}</h2>
        </Card>
      </div>

      {/* --- 👇 NUEVO CONTENEDOR PARA LOS GRÁFICOS --- */}
      <div className={styles.chartsGrid}>
        <Card title="Ventas por Mes (Histórico)">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats?.salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} />
              <Tooltip formatter={(value: number) => [value, "Vendidos"]} />
              <Legend />
              <Bar
                dataKey="vendidos"
                fill="#024f7d"
                name="Vehículos Vendidos"
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* --- 👇 NUEVO GRÁFICO DE VENTAS POR VENDEDOR --- */}
        <Card title="Ventas por Vendedor (Mes)">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats?.salesBySellerData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={120} />
              <Tooltip formatter={(value: number) => [value, "Ventas"]} />
              <Legend />
              <Bar dataKey="ventas" fill="#00c7b1" name="Vehículos Vendidos" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
};
