// frontend/src/pages/admin/PendingBillingPage/index.tsx

import { useState, useEffect } from "react";
import apiClient from "@/api/apiClient";
import toast from "react-hot-toast";
import { Card } from "@/components/Card";
import styles from "./PendingBillingPage.module.css";

interface PendingInvoice {
  id: number;
  precio_final: number;
  cliente: { nombre_completo: string };
  vehiculo: { marca: string; modelo: string };
}

// 1. Helper de moneda actualizado a Dólares (USD)
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
};

const PendingBillingPage = () => {
  const [invoices, setInvoices] = useState<PendingInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  // Estado para deshabilitar TODOS los botones mientras se procesa una solicitud
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchPendingInvoices = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/billing/pending");
      setInvoices(response.data);
    } catch (error) {
      toast.error("No se pudieron cargar las facturas pendientes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingInvoices();
  }, []);

  const handleCreateInvoice = async (cotizacionId: number) => {
    // 2. Deshabilita todos los botones para prevenir cualquier otro clic
    setIsProcessing(true);

    toast
      .promise(apiClient.post("/billing/create", { cotizacionId }), {
        loading: "Procesando factura...",
        success: () => {
          // Si tiene éxito, refrescamos la lista. La fila desaparecerá
          // gracias a la corrección del backend.
          fetchPendingInvoices();
          return "¡Factura creada y venta completada!";
        },
        error: (err) =>
          err.response?.data?.message || "Error al procesar la factura.",
      })
      .finally(() => {
        // 3. Al finalizar (éxito o error), se vuelven a habilitar los botones
        setIsProcessing(false);
      });
  };

  return (
    <Card title="Facturación Pendiente">
      {loading ? (
        <p>Cargando...</p>
      ) : (
        <table className={styles.billingTable}>
          <thead>
            <tr>
              <th>ID Cotización</th>
              <th>Cliente</th>
              <th>Vehículo</th>
              <th>Monto Final</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td>{invoice.id}</td>
                <td>{invoice.cliente.nombre_completo}</td>
                <td>
                  {invoice.vehiculo.marca} {invoice.vehiculo.modelo}
                </td>
                <td>{formatCurrency(invoice.precio_final)}</td>
                <td>
                  <button
                    className={styles.facturarBtn}
                    onClick={() => handleCreateInvoice(invoice.id)}
                    // El botón se deshabilita si CUALQUIER operación está en curso
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Procesando..." : "Facturar y Vender"}
                  </button>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center" }}>
                  No hay cotizaciones aceptadas pendientes de facturación.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </Card>
  );
};

export default PendingBillingPage;
