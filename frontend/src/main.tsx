import React from "react"; // Cambiamos la importación
import ReactDOM from "react-dom/client"; // Cambiamos la importación
import "./index.css";
import App from "./App";

// --- 👇 MODIFICA ESTE BLOQUE COMPLETO 👇 ---
const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
