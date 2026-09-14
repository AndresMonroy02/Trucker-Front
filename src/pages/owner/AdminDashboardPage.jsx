import { toast } from "sonner";

import { api, getErrorMessage } from "../../api";
import Button from "../../components/Button";
import DashboardShell from "../../components/DashboardShell";

export default function AdminDashboardPage({ token, me, adminMessage, setAdminMessage, onLogout, theme, onToggleTheme }) {

  async function checkAdminRoute() {
    try {
      const { data } = await api.get("/users/admin-only");
      setAdminMessage(data.message);
    } catch (err) {
      setAdminMessage("");
      toast.error(getErrorMessage(err, "No tienes permisos de administrador."));
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
