// src/pages/admin/LoginPage.tsx

import React, { useState, useRef, useEffect } from "react";
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
  const [cargando, setCargando] = useState(false);
  const [mensajeCarga, setMensajeCarga] = useState("Verificando credenciales…");
  const navigate = useNavigate();
  const timersRef = useRef<number[]>([]);

  // Limpia los temporizadores al desmontar
  useEffect(() => () => { timersRef.current.forEach((t) => clearTimeout(t)); }, []);

  const limpiarTimers = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCargando(true);
    setMensajeCarga("Verificando credenciales…");

    // Si tarda, avisamos que el servidor puede estar despertando (Cloud Run frío)
    timersRef.current.push(
      window.setTimeout(() => setMensajeCarga("El servidor está iniciándose, esto puede tardar unos segundos…"), 4000),
      window.setTimeout(() => setMensajeCarga("Casi listo, gracias por la paciencia…"), 12000),
    );

    try {
      const response = await apiClient.post("/auth/login", { email, contrasena });
      localStorage.setItem("accessToken", response.data.access_token);
      onLoginSuccess();
      navigate("/dashboard-redirect");
    } catch (err: any) {
      const status = err.response?.status;
      let msg: string;
      if (!err.response) {
        // Sin respuesta del servidor: dormido, red, o CORS
        if (err.code === "ECONNABORTED" || /timeout/i.test(err.message ?? "")) {
          msg = "⏳ El servidor tardó en responder. Suele estar iniciándose por la mañana — esperá unos segundos y volvé a intentar.";
        } else {
          msg = "🔌 No se pudo conectar con el servidor. Puede estar despertando o hay un problema de conexión. Esperá unos segundos y reintentá.";
        }
      } else if (status === 401) {
        msg = "❌ Correo o contraseña incorrectos.";
      } else if (status === 403) {
        msg = "🚫 Tu cuenta no tiene acceso o está inactiva. Contactá al administrador.";
      } else if (status === 429) {
        msg = "⚠️ Demasiados intentos. Esperá un momento antes de volver a intentar.";
      } else if (status >= 500) {
        msg = "🛠️ El servidor tuvo un problema. Intentá de nuevo en un momento.";
      } else {
        msg = err.response?.data?.message || "No se pudo iniciar sesión. Intentá de nuevo.";
      }
      setError(msg);
    } finally {
      limpiarTimers();
      setCargando(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <img src={logoConejo} alt="Logo Conejo Motors" className={styles.logo} />
        <h1>Bienvenido</h1>
        <p>Introduce tus credenciales para acceder al panel de control.</p>
        <form onSubmit={handleSubmit} className={styles.loginForm}>
          <input
            type="email"
            placeholder="Correo Electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={cargando}
            required
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            disabled={cargando}
            required
          />
          <button type="submit" disabled={cargando}>
            {cargando ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", justifyContent: "center" }}>
                <span className={styles.spinner} />
                Ingresando…
              </span>
            ) : (
              "Iniciar Sesión"
            )}
          </button>

          {cargando && (
            <p style={{ fontSize: "0.85rem", color: "#64748b", textAlign: "center", margin: "0.25rem 0 0" }}>
              {mensajeCarga}
            </p>
          )}
          {error && !cargando && <p className={styles.error}>{error}</p>}
        </form>
      </div>
    </div>
  );
};
