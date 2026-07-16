// src/pages/admin/LoginPage.tsx

import React, { useState, useRef, useEffect } from "react";
import apiClient from "../../api/apiClient";
import { useNavigate } from "react-router-dom";
import { startAuthentication } from "@simplewebauthn/browser";
import styles from "./LoginPage.module.css";
import logoConejo from "../../img/Logos/Logo-Conejo-Motors.png";

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  // Recuerda el último correo usado → queda pre-llenado (login directo a la biometría).
  const [email, setEmail] = useState(() => {
    try { return localStorage.getItem("ultimoEmail") ?? ""; } catch { return ""; }
  });
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mensajeCarga, setMensajeCarga] = useState("Verificando credenciales…");
  // Modo de login: 'biometria' (solo correo + passkey) o 'password' (con campo de contraseña).
  // Por defecto biometría; recuerda la última preferencia. El navegador debe soportar WebAuthn.
  const soportaPasskey = typeof window !== "undefined" && !!window.PublicKeyCredential;
  const [modo, setModo] = useState<"biometria" | "password">(() => {
    if (!soportaPasskey) return "password";
    try { return (localStorage.getItem("loginPreferido") as any) === "password" ? "password" : "biometria"; }
    catch { return "biometria"; }
  });
  const [passkeyFallos, setPasskeyFallos] = useState(0);
  const [cambiarUsuario, setCambiarUsuario] = useState(false);
  const navigate = useNavigate();
  const timersRef = useRef<number[]>([]);

  // Limpia los temporizadores al desmontar
  useEffect(() => () => { timersRef.current.forEach((t) => clearTimeout(t)); }, []);

  const limpiarTimers = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  };

  // Login con passkey (Face ID / huella / dispositivo). Solo Admin y Contador.
  const handlePasskeyLogin = async () => {
    if (!email) { setError("Ingresá tu correo para usar la biometría."); return; }
    setError("");
    setCargando(true);
    setMensajeCarga("Esperando tu passkey (Face ID / huella)…");
    try {
      const { data: options } = await apiClient.post("/auth/passkey/login/options", { email });
      const asseResp = await startAuthentication({ optionsJSON: options });
      const { data } = await apiClient.post("/auth/passkey/login/verify", { email, response: asseResp });
      localStorage.setItem("accessToken", data.access_token);
      try { localStorage.setItem("loginPreferido", "biometria"); localStorage.setItem("ultimoEmail", email); } catch { /* */ }
      onLoginSuccess();
      navigate("/dashboard-redirect");
    } catch (err: any) {
      const fallos = passkeyFallos + 1;
      setPasskeyFallos(fallos);
      const cancelado = err?.name === "NotAllowedError" || err?.name === "AbortError";
      // A los 2 intentos fallidos, se muestra el campo de contraseña como respaldo.
      if (fallos >= 2) {
        setModo("password");
        setError("La biometría no funcionó. Iniciá con tu contraseña.");
      } else {
        setError(cancelado ? "Autenticación cancelada. Probá de nuevo o usá tu contraseña." : (err.response?.data?.message || "No se pudo iniciar con biometría. Probá de nuevo."));
      }
    } finally {
      limpiarTimers();
      setCargando(false);
    }
  };

  const cambiarModo = (m: "biometria" | "password") => {
    setError("");
    setModo(m);
    try { localStorage.setItem("loginPreferido", m); } catch { /* */ }
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
      try { localStorage.setItem("ultimoEmail", email); } catch { /* */ }
      onLoginSuccess();
      navigate("/dashboard-redirect");
      return;
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

  // Tarjeta "Continuar como …": modo biometría, con soporte, correo recordado y sin pedir otra cuenta.
  const mostrarTarjeta = modo === "biometria" && soportaPasskey && !!email && !cambiarUsuario;

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <img src={logoConejo} alt="Logo Conejo Motors" className={styles.logo} />
        <h1>Bienvenido</h1>

        {mostrarTarjeta ? (
          /* ── Tarjeta "Continuar como …" (correo recordado + biometría en un toque) ── */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.85rem" }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#024f7d", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem", fontWeight: 800 }}>
              {email.charAt(0).toUpperCase()}
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.8rem", color: "#64748b" }}>Continuar como</div>
              <div style={{ fontWeight: 700, color: "#0a2540", wordBreak: "break-all" }}>{email}</div>
            </div>
            <button type="button" onClick={handlePasskeyLogin} disabled={cargando}
              style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                background: "#024f7d", border: "none", color: "#fff", borderRadius: 8, padding: "0.75rem 1rem",
                cursor: cargando ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "0.95rem" }}>
              {cargando ? (<><span className={styles.spinner} /> Ingresando…</>) : "🔐 Entrar con biometría (Face ID / huella)"}
            </button>
            {cargando && <p style={{ fontSize: "0.85rem", color: "#64748b", textAlign: "center", margin: 0 }}>{mensajeCarga}</p>}
            {error && !cargando && <p className={styles.error}>{error}</p>}
            {!cargando && (
              <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.82rem", flexWrap: "wrap", justifyContent: "center" }}>
                <button type="button" onClick={() => cambiarModo("password")}
                  style={{ background: "none", border: "none", color: "#024f7d", cursor: "pointer", fontWeight: 600, textDecoration: "underline" }}>
                  Usar contraseña
                </button>
                <span style={{ color: "#cbd5e1" }}>·</span>
                <button type="button" onClick={() => { setEmail(""); setContrasena(""); setError(""); setCambiarUsuario(true); }}
                  style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontWeight: 600, textDecoration: "underline" }}>
                  Usar otra cuenta
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <p>{modo === "biometria" ? "Ingresá tu correo y entrá con tu biometría." : "Introduce tus credenciales para acceder al panel de control."}</p>
            <form
              onSubmit={(e) => { e.preventDefault(); if (modo === "biometria") handlePasskeyLogin(); else handleSubmit(e); }}
              className={styles.loginForm}
            >
              <input
                type="email"
                placeholder="Correo Electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={cargando}
                required
                autoComplete="username"
              />

              {modo === "password" && (
                <input
                  type="password"
                  placeholder="Contraseña"
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  disabled={cargando}
                  required
                  autoComplete="current-password"
                />
              )}

              <button type="submit" disabled={cargando}>
                {cargando ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", justifyContent: "center" }}>
                    <span className={styles.spinner} />
                    Ingresando…
                  </span>
                ) : modo === "biometria" ? (
                  "🔐 Entrar con biometría (Face ID / huella)"
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

            {/* Alternar entre biometría y contraseña */}
            {!cargando && (
              <div style={{ textAlign: "center", marginTop: "0.9rem" }}>
                {modo === "biometria" ? (
                  <button type="button" onClick={() => cambiarModo("password")}
                    style={{ background: "none", border: "none", color: "#024f7d", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem", textDecoration: "underline" }}>
                    Prefiero usar mi contraseña
                  </button>
                ) : (
                  soportaPasskey && (
                    <button type="button" onClick={() => cambiarModo("biometria")}
                      style={{ background: "none", border: "none", color: "#024f7d", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem", textDecoration: "underline" }}>
                      🔐 Entrar con biometría (Face ID / huella)
                    </button>
                  )
                )}
              </div>
            )}
            {modo === "biometria" && !cargando && (
              <p style={{ fontSize: "0.72rem", color: "#94a3b8", textAlign: "center", marginTop: "0.5rem" }}>
                Disponible para Admin y Contador que registraron su dispositivo en Configuración → Seguridad.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};
