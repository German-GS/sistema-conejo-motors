// frontend/src/pages/admin/sales/LeadDetailsPage.tsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '@/api/apiClient';
import toast from 'react-hot-toast';
import styles from './LeadDetailsPage.module.css'; // Crearemos este archivo

interface LeadDetails {
  id: number;
  nombre_cliente: string;
  email_cliente: string;
  telefono_cliente?: string;
  estado: string;
  contacted_by_email: boolean;
  contacted_by_phone: boolean;
  vehiculo_interes?: {
    marca: string;
    modelo: string;
    año: number;
  };
}

export const LeadDetailsPage = () => {
  const { leadId } = useParams();
  const [lead, setLead] = useState<LeadDetails | null>(null);

  useEffect(() => {
    if (leadId) {
      apiClient.get(`/leads/${leadId}`)
        .then(res => setLead(res.data))
        .catch(() => toast.error("No se pudo cargar el lead."));
    }
  }, [leadId]);

  const handleCheckboxChange = (field: 'contacted_by_email' | 'contacted_by_phone') => {
    if (!lead) return;
    
    const updatedLead = { ...lead, [field]: !lead[field] };
    setLead(updatedLead);

    apiClient.patch(`/leads/${lead.id}/status`, { [field]: updatedLead[field] })
      .then(() => toast.success("Registro de contacto actualizado."))
      .catch(() => toast.error("No se pudo actualizar el registro."));
  };

  if (!lead) return <p>Cargando detalles del lead...</p>;

  return (
    <div className={styles.container}>
      <h1>Lead: {lead.nombre_cliente}</h1>
      <div className={styles.grid}>
        <div className={styles.card}>
          <h4>Datos del Cliente</h4>
          <p><strong>Email:</strong> {lead.email_cliente}</p>
          <p><strong>Teléfono:</strong> {lead.telefono_cliente || 'No proporcionado'}</p>
        </div>
        <div className={styles.card}>
          <h4>Vehículo de Interés</h4>
          {lead.vehiculo_interes ? (
            <p>{lead.vehiculo_interes.marca} {lead.vehiculo_interes.modelo} ({lead.vehiculo_interes.año})</p>
          ) : (
            <p>No especificado</p>
          )}
        </div>
        <div className={styles.card}>
          <h4>Seguimiento de Contacto</h4>
          <div className={styles.checkboxWrapper}>
            <input
              type="checkbox"
              id="emailContact"
              checked={lead.contacted_by_email}
              onChange={() => handleCheckboxChange('contacted_by_email')}
              disabled={!lead.email_cliente}
            />
            <label htmlFor="emailContact">Contactado por Email</label>
          </div>
          <div className={styles.checkboxWrapper}>
            <input
              type="checkbox"
              id="phoneContact"
              checked={lead.contacted_by_phone}
              onChange={() => handleCheckboxChange('contacted_by_phone')}
              disabled={!lead.telefono_cliente}
            />
            <label htmlFor="phoneContact">Contactado por Teléfono</label>
          </div>
        </div>
      </div>
    </div>
  );
};