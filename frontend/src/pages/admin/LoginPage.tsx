// src/pages/admin/LoginPage.tsx

import React, { useState } from "react";
import apiClient from "../../api/apiClient";
import { useNavigate } from "react-router-dom";
import styles from "./LoginPage.module.css";
import logoConejo from "../../img/Logos/Logo-Conejo-Motors.png";

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate(); // Ya tienes useNavigate aquí

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const response = await apiClient.post("/auth/login", {
        email,
        contrasena,
      });
      localStorage.setItem("accessToken", response.data.access_token);
      onLoginSuccess();
      // 👇 **LA LÍNEA PROBLEMÁTICA ORIGINAL SE ELIMINA Y SE REEMPLAZA POR ESTA** 👇
      navigate("/dashboard-redirect"); // Redirige usando el router, sin recargar la página.
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Error al iniciar sesión. Verifica tus credenciales."
      );
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <img
          src={logoConejo}
          alt="Logo Conejo Motors"
          className={styles.logo}
        />
        <h1>Bienvenido</h1>
        <p>Introduce tus credenciales para acceder al panel de control.</p>
        <form onSubmit={handleSubmit} className={styles.loginForm}>
          <input
            type="email"
            placeholder="Correo Electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            required
          />
          <button type="submit">Iniciar Sesión</button>
          {error && <p className={styles.error}>{error}</p>}
        </form>
      </div>
    </div>
  );
};
