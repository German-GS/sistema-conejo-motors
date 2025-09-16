// src/pages/admin/PendingBillingPage/index.tsx
import { useState, useEffect } from 'react';
import apiClient from '@/api/apiClient';
import { Card } from '@/components/Card';
import toast from 'react-hot-toast';
import styles from './PendingBillingPage.module.css';

interface PendingSale {
  id: number;
  cliente: { nombre_completo: string };
  vehiculo: { marca: string; modelo: string };
  vendedor: { nombre_completo: string };
  precio_final: number;
}

export const PendingBillingPage = () => {
  const [pendingSales, setPendingSales] = useState<PendingSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const fetchPendingSales = () => {
    setLoading(true);
    apiClient.get('/billing/pending')
      .then(response => {
        setPendingSales(response.data);
      })
      .catch(() => {
        toast.error('No se pudieron cargar las ventas pendientes.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPendingSales();
  }, []);

  const handleCreateInvoice = (cotizacionId: number) => {
    setProcessingId(cotizacionId); // Bloquea el botón
    toast.loading('Procesando factura...', { id: 'billing-toast' });

    apiClient.post('/billing/create', { cotizacionId })
      .then(() => {
        toast.success('¡Factura creada y venta completada!', { id: 'billing-toast' });
        fetchPendingSales(); // Refresca la lista para quitar la que ya se facturó
      })
      .catch(error => {
        toast.error(error.response?.data?.message || 'Error al crear la factura.', { id: 'billing-toast' });
      })
      .finally(() => {
        setProcessingId(null); // Desbloquea el botón
      });
  };

  return (
    <Card title="Ventas Pendientes de Facturación">
      {loading ? (
        <p>Cargando...</p>
      ) : (
        <table className={styles.billingTable}>
          <thead>
            <tr>
              <th>ID Cotización</th>
              <th>Cliente</th>
              <th>Vehículo</th>
              <th>Vendedor</th>
              <th>Monto Final</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pendingSales.length > 0 ? (
              pendingSales.map(sale => (
                <tr key={sale.id}>
                  <td>#{sale.id}</td>
                  <td>{sale.cliente.nombre_completo}</td>
                  <td>{sale.vehiculo.marca} {sale.vehiculo.modelo}</td>
                  <td>{sale.vendedor.nombre_completo}</td>
                  <td>
                    {new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC' }).format(sale.precio_final)}
                  </td>
                  <td>
                    <button
                      className="btn btn-principal"
                      onClick={() => handleCreateInvoice(sale.id)}
                      disabled={processingId === sale.id}
                    >
                      {processingId === sale.id ? 'Procesando...' : 'Crear Factura'}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center' }}>No hay ventas pendientes de facturar.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </Card>
  );
};