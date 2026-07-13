import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import apiClient from "@/api/apiClient";

// Cierra sesión tras inactividad, pero renueva el token mientras el usuario esté activo.
const INACTIVITY_MS = 30 * 60 * 1000; // 30 min sin actividad → logout
const REFRESH_MS = 20 * 60 * 1000;    // renovar el token cada 20 min si hay actividad
const CHECK_MS = 60 * 1000;           // chequeo cada minuto

/**
 * Mantiene viva la sesión mientras el usuario interactúa (renueva el JWT) y solo
 * cierra sesión cuando no hay actividad por INACTIVITY_MS.
 */
export function useSessionKeepAlive() {
  const navigate = useNavigate();
  const lastActivity = useRef(Date.now());
  const lastRefresh = useRef(Date.now());

  useEffect(() => {
    const marcar = () => { lastActivity.current = Date.now(); };
    const eventos = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
    eventos.forEach((e) => window.addEventListener(e, marcar, { passive: true }));

    const interval = setInterval(async () => {
      if (!localStorage.getItem("accessToken")) return;
      const now = Date.now();

      if (now - lastActivity.current > INACTIVITY_MS) {
        localStorage.removeItem("accessToken");
        toast("Sesión cerrada por inactividad.", { icon: "🔒" });
        navigate("/login");
        return;
      }

      // Usuario activo → renovar el token antes de que expire
      if (now - lastRefresh.current > REFRESH_MS) {
        try {
          const res = await apiClient.post("/auth/refresh");
          if (res.data?.access_token) {
            localStorage.setItem("accessToken", res.data.access_token);
            lastRefresh.current = now;
          }
        } catch { /* si falla, el interceptor de 401 maneja el logout */ }
      }
    }, CHECK_MS);

    return () => {
      eventos.forEach((e) => window.removeEventListener(e, marcar));
      clearInterval(interval);
    };
  }, [navigate]);
}
