import { Component, ErrorInfo, ReactNode } from "react";

interface Props { children: ReactNode }
interface State { hasError: boolean; error?: Error }

/**
 * Captura errores de render en cualquier página y muestra una pantalla recuperable
 * en vez de dejar la app en blanco. Se resetea al cambiar de ruta (key en App).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Render error:", error, info.componentStack);
  }

  reset = () => this.setState({ hasError: false, error: undefined });

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <div style={{ maxWidth: 440, textAlign: "center", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "2rem" }}>
          <div style={{ fontSize: "2.5rem" }}>⚠️</div>
          <h2 style={{ color: "#0a2540", margin: "0.5rem 0" }}>Algo salió mal en esta pantalla</h2>
          <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
            Se produjo un error al mostrar esta página. Podés reintentar o volver al inicio; tus datos no se perdieron.
          </p>
          {this.state.error?.message && (
            <pre style={{ textAlign: "left", background: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: 8, padding: "0.6rem", fontSize: "0.72rem", color: "#b91c1c", overflowX: "auto", whiteSpace: "pre-wrap" }}>
              {this.state.error.message}
            </pre>
          )}
          <div style={{ display: "flex", gap: "0.6rem", justifyContent: "center", marginTop: "1rem" }}>
            <button onClick={this.reset} style={{ background: "#024f7d", border: "none", color: "#fff", borderRadius: 8, padding: "0.55rem 1.1rem", cursor: "pointer", fontWeight: 700 }}>Reintentar</button>
            <button onClick={() => { window.location.href = "/admin"; }} style={{ background: "#fff", border: "1.5px solid #e2e8f0", color: "#475569", borderRadius: 8, padding: "0.55rem 1.1rem", cursor: "pointer", fontWeight: 700 }}>Ir al inicio</button>
          </div>
        </div>
      </div>
    );
  }
}
