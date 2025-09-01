// frontend/src/pages/admin/LoginPage.tsx

import React, { useState } from "react";
import axios from "axios"; // Importamos axios

export const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    try {
      // Hacemos la petición POST a nuestro endpoint de login
      const response = await axios.post("http://localhost:3000/auth/login", {
        email: email,
        contrasena: password,
      });

      // Si la petición es exitosa, la API nos devuelve el token
      const accessToken = response.data.access_token;

      localStorage.setItem("accessToken", accessToken);

      alert("¡Inicio de sesión exitoso! Redirigiendo...");
      window.location.reload();

      console.log("Login exitoso, token:", accessToken);
      alert("¡Inicio de sesión exitoso!");

      // En un futuro, aquí guardaríamos el token y redirigiríamos al dashboard
    } catch (err: any) {
      // Si la API devuelve un error (ej: 401 Unauthorized), lo mostramos
      console.error("Error de inicio de sesión:", err);
      setError(err.response?.data?.message || "Error al iniciar sesión");
    }
  };

  return (
    <div>
      <h2>Iniciar Sesión - Panel de Administración</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Correo Electrónico:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Contraseña:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">Ingresar</button>
      </form>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
};
