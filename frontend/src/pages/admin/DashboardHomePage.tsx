import { Card } from "../../components/Card";
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

// Datos de ejemplo. Más adelante, vendrán de la API.
const salesData = [
  { month: "Enero", vendidos: 4, marca: "BYD" },
  { month: "Febrero", vendidos: 3, marca: "Tesla" },
  { month: "Marzo", vendidos: 5, marca: "BYD" },
  { month: "Abril", vendidos: 2, marca: "Hyundai" },
  { month: "Mayo", vendidos: 8, marca: "BYD" },
];

export const DashboardHomePage = () => {
  return (
    <div>
      {/* Fila de KPIs (Indicadores Clave) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "1.5rem",
          marginBottom: "2rem",
        }}
      >
        <Card title="Vehículos en Stock">
          <h2>32</h2>
        </Card>
        <Card title="Ventas del Mes">
          <h2>8</h2>
        </Card>
        <Card title="Ingresos del Mes">
          <h2>$450,000</h2>
        </Card>
        <Card title="Costo Inventario">
          <h2>$1.8M</h2>
        </Card>
      </div>

      {/* Gráfico Principal */}
      <Card title="Ventas por Mes">
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="vendidos" fill="#024f7d" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};
