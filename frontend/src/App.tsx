import { LoginPage } from "./pages/admin/LoginPage";
import { DashboardPage } from "./pages/admin/DashboardPage";

function App() {
  // Revisa si hay un token en el localStorage
  const accessToken = localStorage.getItem("accessToken");

  return (
    <div className="App">{accessToken ? <DashboardPage /> : <LoginPage />}</div>
  );
}

export default App;
