import { useState, useEffect } from "react";
import apiClient from "../../api/apiClient";
import { Card } from "../../components/Card";
import styles from "./SettingsPage.module.css";

interface Parametro {
  id: number;
  nombre: string;
  valor: number;
  descripcion: string;
  tipo: "DEDUCCION_EMPLEADO" | "CARGA_PATRONAL" | "RENTA" | "CREDITO_FISCAL";
}

// Un componente reutilizable para las tablas, para no repetir código
const ParametrosTable = ({
  parametros,
  editId,
  editValue,
  onEdit,
  onCancel,
  onSave,
  onValueChange,
}: any) => (
  <table className={styles.settingsTable}>
    <thead>
      <tr>
        <th>Descripción</th>
        <th>Valor</th>
        <th>Acciones</th>
      </tr>
    </thead>
    <tbody>
      {parametros.map((param: Parametro) => (
        <tr key={param.id}>
          <td>{param.descripcion}</td>
          <td>
            {editId === param.id ? (
              <input
                type="number"
                value={editValue}
                onChange={(e) => onValueChange(parseFloat(e.target.value))}
              />
            ) : // Mostramos % para las cargas y deducciones
            param.tipo.includes("PATRONAL") ||
              param.tipo.includes("EMPLEADO") ? (
              `${param.valor}%`
            ) : (
              `₡${param.valor.toLocaleString("es-CR")}`
            )}
          </td>
          <td>
            {editId === param.id ? (
              <>
                <button
                  onClick={() => onSave(param.id)}
                  className="btn btn-caution"
                  style={{ backgroundColor: "#ee7300" }}
                >
                  Guardar
                </button>
                <button onClick={onCancel} className="btn btn-secondary">
                  Cancelar
                </button>
              </>
            ) : (
              <button
                onClick={() => onEdit(param.id, param.valor)}
                className="btn btn-secondary"
                style={{ backgroundColor: "#023a5c", color: "white" }}
              >
                Editar
              </button>
            )}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

export const SettingsPage = () => {
  const [cargasPatronales, setCargasPatronales] = useState<Parametro[]>([]);
  const [deduccionesEmpleado, setDeduccionesEmpleado] = useState<Parametro[]>(
    []
  );
  const [error, setError] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState(0);

  useEffect(() => {
    const fetchParametros = async () => {
      try {
        const response = await apiClient.get("/planilla-parametros");
        // Filtramos los parámetros por tipo
        setCargasPatronales(
          response.data.filter((p: Parametro) => p.tipo === "CARGA_PATRONAL")
        );
        setDeduccionesEmpleado(
          response.data.filter(
            (p: Parametro) => p.tipo === "DEDUCCION_EMPLEADO"
          )
        );
      } catch (err) {
        setError(
          "No se pudo cargar la configuración. Asegúrate de tener permisos de Administrador."
        );
      }
    };
    fetchParametros();
  }, []);

  const handleUpdate = async (id: number) => {
    try {
      await apiClient.patch(`/planilla-parametros/${id}`, { valor: editValue });
      alert("Parámetro actualizado con éxito.");
      setEditId(null);
      // Recargamos la página para ver los cambios
      window.location.reload();
    } catch (err) {
      alert("Error al actualizar el parámetro.");
    }
  };

  return (
    <>
      {error && <p style={{ color: "red", marginBottom: "1rem" }}>{error}</p>}

      <Card title="Obligaciones del Patrono">
        <ParametrosTable
          parametros={cargasPatronales}
          editId={editId}
          editValue={editValue}
          onEdit={(id: number, value: number) => {
            setEditId(id);
            setEditValue(value);
          }}
          onCancel={() => setEditId(null)}
          onSave={handleUpdate}
          onValueChange={setEditValue}
        />
      </Card>

      <Card title="Deducciones del Colaborador">
        <ParametrosTable
          parametros={deduccionesEmpleado}
          editId={editId}
          editValue={editValue}
          onEdit={(id: number, value: number) => {
            setEditId(id);
            setEditValue(value);
          }}
          onCancel={() => setEditId(null)}
          onSave={handleUpdate}
          onValueChange={setEditValue}
        />
      </Card>
    </>
  );
};
