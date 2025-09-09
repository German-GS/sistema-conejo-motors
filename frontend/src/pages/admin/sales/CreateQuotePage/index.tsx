import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import apiClient from "@/api/apiClient";
import { Card } from "@/components/Card"; // Ajusta la ruta si es necesario
import styles from "./CreateQuotePage.module.css";
import toast from "react-hot-toast";

// Interfaz para los detalles del vehículo
interface VehicleDetails {
  id: number;
  marca: string;
  modelo: string;
  año: number;
  precio_venta: number;
}

export const CreateQuotePage = () => {
  const { vehicleId } = useParams(); // Obtiene el ID del vehículo desde la URL
  const navigate = useNavigate();

  const [vehicle, setVehicle] = useState<VehicleDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // Estado para el formulario del cliente y la cotización
  const [cliente, setCliente] = useState({
    nombre_completo: "",
    cedula: "",
    email: "",
    telefono: "",
  });
  const [precioFinal, setPrecioFinal] = useState("");
  const [fechaExpiracion, setFechaExpiracion] = useState("");
  const location = useLocation(); // 2. Obtiene la ubicación actual
  const basePath = location.pathname.startsWith("/admin")
    ? "/admin/sales"
    : "/sales";

  useEffect(() => {
    const fetchVehicleDetails = async () => {
      if (!vehicleId) return;
      try {
        const response = await apiClient.get(`/vehicles/${vehicleId}`);
        setVehicle(response.data);
        setPrecioFinal(response.data.precio_venta.toString()); // Pre-llena el precio de venta
      } catch (error) {
        toast.error("No se pudieron cargar los detalles del vehículo.");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicleDetails();
  }, [vehicleId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCliente((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !vehicle ||
      !cliente.nombre_completo ||
      !cliente.cedula ||
      !precioFinal ||
      !fechaExpiracion
    ) {
      toast.error("Por favor, completa todos los campos requeridos.");
      return;
    }

    const cotizacionData = {
      cliente: { ...cliente },
      vehiculoId: vehicle.id,
      precio_final: Number(precioFinal),
      fecha_expiracion: fechaExpiracion,
    };

    try {
      await apiClient.post("/quotes", cotizacionData);
      toast.success("¡Cotización creada con éxito!");
      // 3. Usa el basePath para la redirección dinámica
      navigate(`${basePath}/quotes`);
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "Error al crear la cotización."
      );
    }
  };

  if (loading) return <p>Cargando información del vehículo...</p>;
  if (!vehicle)
    return <p>Vehículo no encontrado. Por favor, vuelve al catálogo.</p>;

  return (
    <form onSubmit={handleSubmit}>
      <h1>
        Crear Cotización para {vehicle.marca} {vehicle.modelo} ({vehicle.año})
      </h1>

      <Card title="Datos del Cliente">
        <div className={styles.formGrid}>
          <input
            name="nombre_completo"
            type="text"
            placeholder="Nombre Completo"
            value={cliente.nombre_completo}
            onChange={handleInputChange}
            required
          />
          <input
            name="cedula"
            type="text"
            placeholder="Cédula"
            value={cliente.cedula}
            onChange={handleInputChange}
            required
          />
          <input
            name="email"
            type="email"
            placeholder="Email (Opcional)"
            value={cliente.email}
            onChange={handleInputChange}
          />
          <input
            name="telefono"
            type="tel"
            placeholder="Teléfono (Opcional)"
            value={cliente.telefono}
            onChange={handleInputChange}
          />
        </div>
      </Card>

      <Card title="Términos de la Cotización">
        <div className={styles.formGrid}>
          <div>
            <label>Precio de Venta Sugerido</label>
            <input
              type="text"
              value={`₡${vehicle.precio_venta.toLocaleString("es-CR")}`}
              disabled
            />
          </div>
          <div>
            <label>Precio Final Acordado (₡)</label>
            <input
              type="number"
              value={precioFinal}
              onChange={(e) => setPrecioFinal(e.target.value)}
              required
            />
          </div>
          <div>
            <label>Válida Hasta</label>
            <input
              type="date"
              value={fechaExpiracion}
              onChange={(e) => setFechaExpiracion(e.target.value)}
              required
            />
          </div>
        </div>
      </Card>

      <button
        type="submit"
        className="btn btn-principal"
        style={{ width: "100%", padding: "1rem", marginTop: "1rem" }}
      >
        Generar Cotización
      </button>
    </form>
  );
};
