// frontend/src/api/apiClient.ts
import axios from "axios";

// Creamos una instancia de Axios
const apiClient = axios.create({
  baseURL: "http://localhost:3000", // La URL base de nuestra API
});

// Esto es un "interceptor": se ejecuta antes de cada petición
apiClient.interceptors.request.use(
  (config) => {
    // Obtenemos el token del localStorage
    const token = localStorage.getItem("accessToken");
    if (token) {
      // Si el token existe, lo añadimos a la cabecera de autorización
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;
