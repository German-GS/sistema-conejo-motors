import { useState, useEffect } from "react";
import apiClient from "../../api/apiClient";
import { UserForm } from "../../components/UserForm";
import { Card } from "../../components/Card";
import styles from "./UsersPage.module.css";
import toast from "react-hot-toast";

// Interfaz para el tipo de dato User (puede necesitar más campos)
interface User {
  id: number;
  nombre_completo: string;
  email: string;
  activo: boolean;
  cedula: string;
  rol: { id: number; nombre: string };
}

export const UsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState("");
  // Estado para guardar qué usuario estamos editando
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const fetchUsers = async () => {
    try {
      const response = await apiClient.get("/users");
      setUsers(response.data);
    } catch (err) {
      setError("No se pudo cargar la lista de colaboradores.");
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (id: number) => {
    // Reemplazamos window.confirm por una acción directa con notificación
    try {
      await apiClient.delete(`/users/${id}`);
      toast.success("Colaborador eliminado con éxito."); // <-- 2. Reemplaza alert
      fetchUsers();
    } catch (err) {
      const errorMessage = "Error al eliminar el colaborador.";
      setError(errorMessage);
      toast.error(errorMessage); // <-- 3. Añade toast de error
    }
  };

  return (
    <>
      <Card
        title={
          editingUser
            ? `Editando a ${editingUser.nombre_completo}`
            : "Añadir Nuevo Colaborador"
        }
      >
        <UserForm
          // Pasamos el usuario que se está editando al formulario
          initialData={editingUser}
          onSuccess={() => {
            // Cuando el formulario termina, refrescamos la lista y limpiamos el estado de edición
            fetchUsers();
            setEditingUser(null);
          }}
        />
      </Card>

      <Card title="Gestión de Colaboradores">
        {error && <p style={{ color: "red" }}>{error}</p>}
        <table className={styles.usersTable}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre Completo</th>
              <th>Email</th>
              {/* Podríamos añadir Cédula y Rol aquí */}
              <th>Activo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.nombre_completo}</td>
                <td>{user.email}</td>
                <td>{user.activo ? "Sí" : "No"}</td>
                <td>
                  {/* Al hacer clic, establecemos el usuario que se va a editar */}
                  <button onClick={() => setEditingUser(user)}>Editar</button>
                  <button onClick={() => handleDelete(user.id)}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
};
