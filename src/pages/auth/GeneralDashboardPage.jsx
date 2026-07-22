import { Navigate } from "react-router-dom";

import DashboardShell from "../../components/DashboardShell";
import { getDashboardPathByRole } from "../../utils/roleRouting";

export default function GeneralDashboardPage({ token, me, onLogout, theme, onToggleTheme }) {
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (me && me.role !== "user") {
    return <Navigate to={getDashboardPathByRole(me.role)} replace />;
  }

  return (
    <DashboardShell
      me={me}
      onLogout={onLogout}
      theme={theme}
      onToggleTheme={onToggleTheme}
      title="Dashboard general"
      subtitle="Vista para perfiles heredados"
    >
      <section className="panel">
        <h3>Informacion de perfil</h3>
        <p>Tu cuenta usa un perfil general del sistema (user o admin).</p>
      </section>
    </DashboardShell>
  );
}
