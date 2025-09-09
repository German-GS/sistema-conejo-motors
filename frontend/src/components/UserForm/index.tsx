import React, { useState, useEffect } from "react";
import apiClient from "../../api/apiClient";
import styles from "./UserForm.module.css";
import toast from "react-hot-toast";

interface Role {
  id: number;
  nombre: string;
}

interface UserFormProps {
  onSuccess: () => void;
  initialData?: any;
}

export const UserForm: React.FC<UserFormProps> = ({
  onSuccess,
  initialData,
}) => {
  // 👇 1. AÑADIR 'salario_base' AL ESTADO INICIAL
  const [formData, setFormData] = useState({
    nombre_completo: "",
    email: "",
    cedula: "",
    contrasena: "",
    rol_id: "",
    salario_base: "", // <-- AÑADIR ESTA LÍNEA
  });

  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState("");
  const isEditing = !!initialData;

  // Carga los roles (sin cambios)
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await apiClient.get("/roles");
        setRoles(response.data);
        if (response.data.length > 0 && !isEditing) {
          setFormData((prev) => ({
            ...prev,
            rol_id: response.data[0].id.toString(),
          }));
        }
      } catch (err) {
        console.error("Error al cargar roles", err);
      }
    };
    fetchRoles();
  }, [isEditing]);

  // Rellena el formulario (sin cambios)
  useEffect(() => {
    if (initialData) {
      setFormData({
        nombre_completo: initialData.nombre_completo || "",
        email: initialData.email || "",
        cedula: initialData.cedula || "",
        rol_id: initialData.rol?.id?.toString() || "",
        contrasena: "",
        salario_base: initialData.salario_base || "", // También para editar
      });
    }
  }, [initialData]);

  // Maneja los cambios (sin cambios)
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Se ejecuta al enviar (sin cambios)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      if (isEditing) {
        const dataToSend: { [key: string]: any } = {
          nombre_completo: formData.nombre_completo,
          email: formData.email,
          cedula: formData.cedula,
          rol_id: Number(formData.rol_id),
          salario_base: Number(formData.salario_base),
        };
        if (formData.contrasena) {
          dataToSend.contrasena = formData.contrasena;
        }
        await apiClient.patch(`/users/${initialData.id}`, dataToSend);
        toast.success("Colaborador actualizado con éxito.");
      } else {
        await apiClient.post("/users", {
          ...formData,
          rol_id: Number(formData.rol_id),
          salario_base: Number(formData.salario_base),
        });
        toast.success("Colaborador creado con éxito.");
      }
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || "Ocurrió un error.");
      console.error(err);
    }
  };

  // 👇 2. CORREGIR EL JSX DEL RETURN
  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <input
        type="text"
        name="nombre_completo"
        value={formData.nombre_completo}
        onChange={handleChange}
        placeholder="Nombre Completo"
        required
      />
      <input
        type="email"
        name="email"
        value={formData.email}
        onChange={handleChange}
        placeholder="Correo Electrónico"
        required
      />
      <input
        type="text"
        name="cedula"
        value={formData.cedula}
        onChange={handleChange}
        placeholder="Cédula"
        required
      />
      <input
        type="password"
        name="contrasena"
        value={formData.contrasena}
        onChange={handleChange}
        placeholder={isEditing ? "Nueva Contraseña (opcional)" : "Contraseña"}
      />
      <input
        type="number"
        name="salario_base"
        value={formData.salario_base}
        onChange={handleChange}
        placeholder="Salario Base Mensual"
        required={!isEditing}
      />
      <select
        name="rol_id"
        value={formData.rol_id}
        onChange={handleChange}
        required
      >
        <option value="" disabled>
          Selecciona un rol...
        </option>
        {roles.map((role) => (
          <option key={role.id} value={role.id}>
            {role.nombre}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="btn btn-principal"
        style={{ gridColumn: "1 / -1" }}
      >
        {isEditing ? "Actualizar Colaborador" : "Crear Colaborador"}
      </button>
      {error && <p style={{ color: "red", gridColumn: "1 / -1" }}>{error}</p>}
    </form>
  );
};
