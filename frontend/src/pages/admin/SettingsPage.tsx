import { useState, useEffect, useRef } from "react";
import apiClient from "../../api/apiClient";
import { Card } from "../../components/Card";
import styles from "./SettingsPage.module.css";
import toast from "react-hot-toast";

interface Parametro {
  id: number;
  nombre: string;
  valor: number;
  descripcion: string;
  tipo:
    | "DEDUCCION_EMPLEADO"
    | "CARGA_PATRONAL"
    | "RENTA"
    | "CREDITO_FISCAL"
    | "COMISION";
}

const ParametrosTable = ({
  parametros,
  editId,
  editValue,
  onEdit,
  onCancel,
  onSave,
  onValueChange,
}: any) => {
  if (parametros.length === 0) {
    return <p>No hay parámetros de este tipo para mostrar.</p>;
  }
  return (
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
                  className={styles.valueInput}
                />
              ) : param.tipo.includes("PATRONAL") ||
                param.tipo.includes("EMPLEADO") ||
                param.tipo === "COMISION" ? (
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
                    className={`${styles.actionButton} ${styles.saveButton}`}
                  >
                    Guardar
                  </button>
                  <button
                    onClick={onCancel}
                    className={`${styles.actionButton} ${styles.cancelButton}`}
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <button
                  onClick={() => onEdit(param.id, param.valor)}
                  className={`${styles.actionButton} ${styles.editButton}`}
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
};

interface VehicleProfile {
  id: number;
  marca: string;
  modelo: string;
  logo_url?: string;
}

export const SettingsPage = () => {
  const [cargasPatronales, setCargasPatronales] = useState<Parametro[]>([]);
  const [deduccionesEmpleado, setDeduccionesEmpleado] = useState<Parametro[]>(
    []
  );
  const [comisiones, setComisiones] = useState<Parametro[]>([]);
  const [error, setError] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState(0);
  const [profiles, setProfiles] = useState<VehicleProfile[]>([]);
  const [newProfile, setNewProfile] = useState({
    marca: "",
    modelo: "",
    potencia_hp: "",
    autonomia_km: "",
    capacidad_bateria_kwh: "",
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchParametros = async () => {
    try {
      const response = await apiClient.get("/planilla-parametros");
      setCargasPatronales(
        response.data.filter((p: Parametro) => p.tipo === "CARGA_PATRONAL")
      );
      setDeduccionesEmpleado(
        response.data.filter((p: Parametro) => p.tipo === "DEDUCCION_EMPLEADO")
      );
      setComisiones(
        response.data.filter((p: Parametro) => p.tipo === "COMISION")
      );
    } catch (err) {
      setError(
        "No se pudo cargar la configuración. Asegúrate de tener permisos de Administrador."
      );
    }
  };

  const fetchVehicleProfiles = async () => {
    try {
      const response = await apiClient.get("/vehicle-profiles");
      setProfiles(response.data);
    } catch (err) {
      toast.error("No se pudieron cargar los perfiles de vehículos.");
    }
  };

  useEffect(() => {
    fetchParametros();
    fetchVehicleProfiles();
  }, []);

  const handleUpdate = async (id: number) => {
    try {
      await apiClient.patch(`/planilla-parametros/${id}`, { valor: editValue });
      toast.success("Parámetro actualizado con éxito.");
      setEditId(null);
      fetchParametros();
    } catch (err) {
      toast.error("Error al actualizar el parámetro.");
    }
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLogoFile(e.target.files[0]);
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    Object.entries(newProfile).forEach(([key, value]) =>
      formData.append(key, value)
    );
    if (logoFile) formData.append("logo", logoFile);

    try {
      await apiClient.post("/vehicle-profiles", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Perfil de vehículo creado con éxito.");
      setNewProfile({
        marca: "",
        modelo: "",
        potencia_hp: "",
        autonomia_km: "",
        capacidad_bateria_kwh: "",
      });
      setLogoFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchVehicleProfiles();
    } catch (err) {
      toast.error("Error al crear el perfil.");
    }
  };

  const handleDeleteProfile = async (id: number) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar este perfil?")) {
      try {
        await apiClient.delete(`/vehicle-profiles/${id}`);
        toast.success("Perfil eliminado.");
        fetchVehicleProfiles();
      } catch (err) {
        toast.error("Error al eliminar el perfil.");
      }
    }
  };

  return (
    <>
      {error && <p style={{ color: "red", marginBottom: "1rem" }}>{error}</p>}

      <Card title="Perfiles de Modelos de Vehículos">
        <form onSubmit={handleCreateProfile} className={styles.profileForm}>
          <input
            name="marca"
            type="text"
            value={newProfile.marca}
            onChange={handleProfileChange}
            placeholder="Marca (Ej: BYD)"
            required
          />
          <input
            name="modelo"
            type="text"
            value={newProfile.modelo}
            onChange={handleProfileChange}
            placeholder="Modelo (Ej: Dolphin)"
            required
          />
          <input
            name="potencia_hp"
            type="number"
            value={newProfile.potencia_hp}
            onChange={handleProfileChange}
            placeholder="Potencia (HP)"
            required
          />
          <input
            name="autonomia_km"
            type="number"
            value={newProfile.autonomia_km}
            onChange={handleProfileChange}
            placeholder="Autonomía (km)"
            required
          />
          <input
            name="capacidad_bateria_kwh"
            type="number"
            value={newProfile.capacidad_bateria_kwh}
            onChange={handleProfileChange}
            placeholder="Batería (kWh)"
            required
          />
          <div className={styles.fileInputContainer}>
            <label htmlFor="logo-upload" className={styles.fileInputLabel}>
              {logoFile ? `Archivo: ${logoFile.name}` : "Subir Logo (Opcional)"}
            </label>
            <input
              id="logo-upload"
              type="file"
              onChange={handleFileChange}
              ref={fileInputRef}
              accept="image/*"
            />
          </div>
          <button type="submit" className="btn btn-principal">
            Añadir Perfil
          </button>
        </form>
        <table className={styles.settingsTable} style={{ marginTop: "2rem" }}>
          <thead>
            <tr>
              <th>Logo</th>
              <th>Marca</th>
              <th>Modelo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile) => (
              <tr key={profile.id}>
                <td>
                  {profile.logo_url ? (
                    <img
                      src={`${apiClient.defaults.baseURL}/${profile.logo_url}`}
                      alt={profile.marca}
                      className={styles.logoImage}
                    />
                  ) : (
                    <div className={styles.noLogo}>Sin logo</div>
                  )}
                </td>
                <td>{profile.marca}</td>
                <td>{profile.modelo}</td>
                <td>
                  <button
                    onClick={() => handleDeleteProfile(profile.id)}
                    className={`${styles.actionButton} ${styles.deleteButton}`}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className={styles.highlightCard}>
        <Card title="Parámetros de Comisiones">
          <ParametrosTable
            parametros={comisiones}
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
      </div>

      <Card title="Obligaciones del Patrono (Planilla)">
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

      <Card title="Deducciones del Colaborador (Planilla)">
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
