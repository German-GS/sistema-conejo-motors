import { useState, useEffect } from "react";
import apiClient from "../../../api/apiClient";
import { Card } from "../../../components/Card";
import styles from "./BodegasPage.module.css";

// Interfaz para el tipo de dato Bodega
interface Bodega {
  id: number;
  nombre: string;
  direccion: string;
}

export const BodegasPage = () => {
  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const fetchBodegas = async () => {
    try {
      const response = await apiClient.get("/bodegas");
      setBodegas(response.data);
    } catch (err) {
      setError("No se pudo cargar la lista de bodegas.");
    }
  };

  useEffect(() => {
    fetchBodegas();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMensaje("");

    if (!nombre) {
      setError("El nombre de la bodega es obligatorio.");
      return;
    }

    try {
      await apiClient.post("/bodegas", { nombre, direccion });
      setMensaje(`Bodega "${nombre}" creada con éxito.`);
      setNombre("");
      setDireccion("");
      fetchBodegas(); // Refrescar la lista
    } catch (err: any) {
      setError(err.response?.data?.message || "Error al crear la bodega.");
    }
  };

  return (
    <>
      <Card title="Añadir Nueva Bodega/Ubicación">
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre (Ej: Sala de Exhibición San José)"
            className={styles.input}
          />
          <input
            type="text"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            placeholder="Dirección (Opcional)"
            className={styles.input}
          />
          <button type="submit" className="btn btn-principal">
            Crear Bodega
          </button>
        </form>
        {mensaje && <p className={styles.mensaje}>{mensaje}</p>}
        {error && <p className={styles.error}>{error}</p>}
      </Card>

      <Card title="Bodegas Existentes">
        <table className={styles.bodegasTable}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Dirección</th>
            </tr>
          </thead>
          <tbody>
            {bodegas.map((bodega) => (
              <tr key={bodega.id}>
                <td>{bodega.id}</td>
                <td>{bodega.nombre}</td>
                <td>{bodega.direccion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
};
