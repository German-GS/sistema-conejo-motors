// frontend/src/api/apiClient.ts
import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// ── Interceptor de REQUEST: adjunta el JWT ────────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Interceptor de RESPONSE: manejo global de errores ────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    // 401 Unauthorized → sesión expirada o token inválido
    if (status === 401) {
      localStorage.removeItem("accessToken");
      // Solo redirigir si no estamos ya en /login para evitar loop
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login?expired=1";
      }
    }

    // 403 Forbidden → mostrar en consola (el componente maneja el toast)
    if (status === 403) {
      console.warn("[API] Acceso denegado:", error.config?.url);
    }

    // 500+ → log para debugging
    if (status >= 500) {
      console.error("[API] Error del servidor:", status, error.config?.url);
    }

    return Promise.reject(error);
  },
);

export default apiClient;
