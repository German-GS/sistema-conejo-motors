import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import apiClient from "@/api/apiClient";
import { Card } from "@/components/Card";
import styles from "./MyQuotesPage.module.css";

// Interfaz para la cotización
interface Quote {
  id: number;
  fecha_creacion: string;
  estado: string;
  precio_final: number;
  cliente: { nombre_completo: string };
  vehiculo: { marca: string; modelo: string };
}

export const MyQuotesPage = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation(); // 2. Obtiene la ubicación actual
  const basePath = location.pathname.startsWith("/admin")
    ? "/admin/sales"
    : "/sales";

  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        const response = await apiClient.get("/quotes/my");
        setQuotes(response.data);
      } catch (error) {
        console.error("Error al cargar las cotizaciones", error);
      } finally {
        setLoading(false);
      }
    };
    fetchQuotes();
  }, []);

  return (
    <Card title="Mis Cotizaciones">
      {loading ? (
        <p>Cargando...</p>
      ) : (
        <table className={styles.quotesTable}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Vehículo</th>
              <th>Monto Final</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((quote) => (
              <tr key={quote.id}>
                <td>{quote.id}</td>
                <td>{new Date(quote.fecha_creacion).toLocaleDateString()}</td>
                <td>{quote.cliente.nombre_completo}</td>
                <td>
                  {quote.vehiculo.marca} {quote.vehiculo.modelo}
                </td>
                <td>₡{Number(quote.precio_final).toLocaleString("es-CR")}</td>
                <td>
                  <span
                    className={`${styles.status} ${
                      styles[quote.estado.toLowerCase()]
                    }`}
                  >
                    {quote.estado}
                  </span>
                </td>
                <td>
                  {/* 3. Usa el basePath para construir el enlace dinámico */}
                  <Link
                    to={`${basePath}/quotes/${quote.id}`}
                    className="btn btn-secondary"
                  >
                    Ver
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
};
