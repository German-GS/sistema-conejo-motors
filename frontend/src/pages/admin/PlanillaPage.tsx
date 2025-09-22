import { useState, useEffect } from "react"; // Se elimina 'React' que ya no es necesario
import apiClient from "../../api/apiClient";
import { Card } from "../../components/Card";
import styles from "./UsersPage.module.css";
import { ReciboModal } from "../../components/ReciboModal";
import { jwtDecode } from "jwt-decode";

// Definimos los tipos de datos que usaremos
interface User {
  id: number;
  nombre_completo: string;
}

interface Recibo {
  id: number;
  usuario: User;
  fecha_pago: string;
  salario_neto: number;
  salario_bruto: number;
}

interface DecodedToken {
  email: string;
  rol: { id: number; nombre: string };
}

export const PlanillaPage = () => {
  const [recibos, setRecibos] = useState<Recibo[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [userRole, setUserRole] = useState<string>("");
  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFin, setPeriodoFin] = useState("");
  const [comisiones, setComisiones] = useState("");
  const [isCommissionLoading, setIsCommissionLoading] = useState(false);
  const [otrasDeducciones, setOtrasDeducciones] = useState("");
  const [horasExtra, setHorasExtra] = useState("");
  const [selectedRecibo, setSelectedRecibo] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Carga los datos iniciales (recibos y usuarios)
  const fetchData = async () => {
    try {
      const [recibosRes, usersRes] = await Promise.all([
        apiClient.get("/recibos-pago"),
        apiClient.get("/users"),
      ]);
      setRecibos(recibosRes.data);
      setUsers(usersRes.data);
      if (usersRes.data.length > 0) {
        setSelectedUserId(usersRes.data[0].id.toString());
      }
    } catch (err) {
      setError("No se pudieron cargar los datos de la planilla.");
    }
  };

  // Se ejecuta una vez al cargar la página para obtener el rol y los datos
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      const decodedToken: DecodedToken = jwtDecode(token);
      setUserRole(decodedToken.rol?.nombre || "");
    }
    fetchData();
  }, []);

  // Se ejecuta cada vez que el usuario o las fechas cambian para calcular comisiones
  useEffect(() => {
    const fetchCommissions = async () => {
      if (selectedUserId && periodoInicio && periodoFin) {
        setIsCommissionLoading(true);
        try {
          const response = await apiClient.get(
            "/recibos-pago/calculate-commissions",
            {
              params: {
                userId: selectedUserId,
                startDate: periodoInicio,
                endDate: periodoFin,
              },
            }
          );
          setComisiones(response.data.totalCommission.toFixed(2));
        } catch (error) {
          console.error("Error al calcular comisiones:", error);
          setComisiones("0.00");
        } finally {
          setIsCommissionLoading(false);
        }
      }
    };

    fetchCommissions();
  }, [selectedUserId, periodoInicio, periodoFin]);

  const handleGenerate = async () => {
    if (!selectedUserId || !periodoInicio || !periodoFin) {
      setError(
        "Por favor, selecciona un colaborador y ambas fechas del periodo."
      );
      return;
    }
    setError("");
    setMensaje("");

    try {
      const response = await apiClient.post("/recibos-pago/generate", {
        userId: Number(selectedUserId),
        periodoInicio: periodoInicio,
        periodoFin: periodoFin,
        comisionesGanadas: Number(comisiones) || 0,
        otrasDeducciones: Number(otrasDeducciones) || 0,
        horasExtra: Number(horasExtra) || 0,
      });

      setMensaje(`¡Recibo #${response.data.id} generado con éxito!`);
      fetchData(); // Refrescar la lista de recibos
    } catch (err: any) {
      setError(err.response?.data?.message || "Error al generar el recibo.");
    }
  };

  const handleDelete = async (reciboId: number) => {
    if (
      window.confirm(
        `¿Estás seguro de que deseas eliminar el recibo #${reciboId}?`
      )
    ) {
      try {
        await apiClient.delete(`/recibos-pago/${reciboId}`);
        setMensaje(`Recibo #${reciboId} eliminado con éxito.`);
        fetchData();
      } catch (err: any) {
        setError(err.response?.data?.message || "Error al eliminar el recibo.");
      }
    }
  };

  const handleVerDesglose = async (reciboId: number) => {
    try {
      const response = await apiClient.get(
        `/recibos-pago/${reciboId}/desglose`
      );
      setSelectedRecibo(response.data);
      setIsModalOpen(true);
    } catch (error) {
      setError("No se pudo cargar el desglose del recibo.");
    }
  };

  return (
    <>
      <Card title="Generar Recibo de Pago">
        <div className={styles.formGrid}>
          <div className={`${styles.formField} ${styles.fullWidth}`}>
            <label className={styles.label}>Colaborador</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className={styles.select}
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.nombre_completo}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formField}>
            <label className={styles.label}>Periodo Inicio</label>
            <input
              type="date"
              value={periodoInicio}
              onChange={(e) => setPeriodoInicio(e.target.value)}
              className={styles.input}
            />
          </div>
          <div className={styles.formField}>
            <label className={styles.label}>Periodo Fin</label>
            <input
              type="date"
              value={periodoFin}
              onChange={(e) => setPeriodoFin(e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.formField}>
            <label className={styles.label}>
              Comisiones Ganadas ($) El valor es el dolares pero se paga en
              colones {isCommissionLoading && <small>(Calculando...)</small>}
            </label>
            <input
              type="number"
              placeholder="0.00"
              value={comisiones}
              onChange={(e) => setComisiones(e.target.value)}
              className={styles.input}
              disabled={isCommissionLoading}
            />
          </div>
          <div className={styles.formField}>
            <label className={styles.label}>Horas Extra (₡)</label>
            <input
              type="number"
              placeholder="0.00"
              value={horasExtra}
              onChange={(e) => setHorasExtra(e.target.value)}
              className={styles.input}
            />
          </div>
          <div className={styles.formField}>
            <label className={styles.label}>Otras Deducciones (₡)</label>
            <input
              type="number"
              placeholder="0.00"
              value={otrasDeducciones}
              onChange={(e) => setOtrasDeducciones(e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.buttonContainer}>
            <button className="btn btn-principal" onClick={handleGenerate}>
              Generar Recibo
            </button>
          </div>
        </div>
        {mensaje && (
          <p style={{ color: "green", marginTop: "1rem" }}>{mensaje}</p>
        )}
        {error && <p style={{ color: "red", marginTop: "1rem" }}>{error}</p>}
      </Card>

      <Card title="Historial de Recibos">
        <table className={styles.usersTable}>
          <thead>
            <tr>
              <th>ID Recibo</th>
              <th>Colaborador</th>
              <th>Fecha de Pago</th>
              <th>Salario Bruto</th>
              <th>Salario Neto</th>
              {userRole === "Administrador" && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {recibos.map((recibo) => (
              <tr key={recibo.id}>
                <td>{recibo.id}</td>
                <td>{recibo.usuario.nombre_completo}</td>
                <td>{new Date(recibo.fecha_pago).toLocaleDateString()}</td>
                <td>₡{Number(recibo.salario_bruto).toLocaleString("es-CR")}</td>
                <td>
                  <b>₡{Number(recibo.salario_neto).toLocaleString("es-CR")}</b>
                </td>
                {userRole === "Administrador" && (
                  <td>
                    <button
                      onClick={() => handleVerDesglose(recibo.id)}
                      className="btn btn-secondary"
                    >
                      Ver
                    </button>
                    <button
                      onClick={() => handleDelete(recibo.id)}
                      className="btn btn-danger"
                    >
                      Eliminar
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {isModalOpen && (
        <ReciboModal
          recibo={selectedRecibo}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
};
