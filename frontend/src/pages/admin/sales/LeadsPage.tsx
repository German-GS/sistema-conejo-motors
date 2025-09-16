// frontend/src/pages/admin/sales/LeadsPage.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '@/api/apiClient';
import { Card } from '@/components/Card';
import styles from './LeadsPage.module.css'; // Crearemos este archivo a continuación

interface Lead {
  id: number;
  nombre_cliente: string;
  email_cliente: string;
  estado: string;
  fecha_creacion: string;
}

export const LeadsPage = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiClient.get('/leads/my-leads')
      .then(response => setLeads(response.data))
      .catch(error => console.error("Error al cargar leads:", error))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card title="Mis Leads Pendientes">
      {loading ? (
        <p>Cargando leads...</p>
      ) : (
        <table className={styles.leadsTable}>
          <thead>
            <tr>
              <th>Nombre Cliente</th>
              <th>Email</th>
              <th>Estado</th>
              <th>Fecha de Creación</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {leads.map(lead => (
              <tr key={lead.id}>
                <td>{lead.nombre_cliente}</td>
                <td>{lead.email_cliente}</td>
                <td>
                  <span className={`${styles.status} ${styles[lead.estado.toLowerCase().replace(' ', '')]}`}>
                    {lead.estado}
                  </span>
                </td>
                <td>{new Date(lead.fecha_creacion).toLocaleDateString()}</td>
                <td>
                  <Link to={`/sales/leads/${lead.id}`} className="btn btn-secondary">
                    Ver Detalles
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