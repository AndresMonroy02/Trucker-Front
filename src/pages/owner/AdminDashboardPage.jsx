import { Navigate } from "react-router-dom";

import { api } from "../../api";
import Button from "../../components/Button";
import DashboardShell from "../../components/DashboardShell";
import { getDashboardPathByRole } from "../../utils/roleRouting";

export default function AdminDashboardPage({ token, me, adminMessage, setAdminMessage, setStatus, onLogout, theme, onToggleTheme }) {
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (me && me.role !== "admin") {
    return <Navigate to={getDashboardPathByRole(me.role)} replace />;
  }

  async function checkAdminRoute() {
    setStatus({ error: "", success: "" });
    try {
      const { data } = await api.get("/users/admin-only");
      setAdminMessage(data.message);
    } catch (err) {
      setAdminMessage("");
      setStatus({ error: err.response?.data?.detail || "No tienes permisos de administrador.", success: "" });
    }
  }

  return (
    <DashboardShell
      me={me}
      onLogout={onLogout}
      theme={theme}
      onToggleTheme={onToggleTheme}
      title="Dashboard admin"
      subtitle="Panel de administracion"
    >
      <section className="panel">
        <h3>Acciones de administrador</h3>
        <p>Comprueba que tu acceso admin se mantiene activo en la API.</p>
        <div className="actions-row">
          <Button onClick={checkAdminRoute}>Probar endpoint admin</Button>
        </div>
        {adminMessage ? <p className="success">{adminMessage}</p> : null}
      </section>
    </DashboardShell>
  );
}
